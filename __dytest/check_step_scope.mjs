// ============================================================
//  自检：`"step N"` 写法里的「跨步骤变量」陷阱（会 ReferenceError）
//
//  跑法：node extension/大梦千秋/__dytest/check_step_scope.mjs
//
//  为什么要有这个测试：
//    `"step N"` 的 content 会被 StepCompiler **拆成一个个独立的 new Function**
//    （noname/library/element/GameEvent/compilers/StepCompiler.js:81-99 `packStep`），
//    所以 step 0 里 `var extra = …` 在 step 1 **根本不存在**，
//    跨步骤用到就会 `ReferenceError: extra is not defined`。
//    梦诸葛诞【定叛】就是这么炸的（`extra` 从 step 0 挪到 step 1 之后）。
//
//  判定规则：
//    · 只在 `character/*.js` 里扫
//    · 先按 `"step N"` 把 content **原文**切段（切段必须在原文上做，注释/字符串里的 step 字样要排除）
//    · 每段再去掉注释/字符串后分析；`var/let/const` 声明的名字记在「声明所在步骤」
//    · 后续步骤里出现该名字的**裸引用**（不是 `event.x`、不是 `obj.x`）→ 报错
// ============================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(here, "..");
const CHAR_DIR = path.join(EXT, "character");

// 引擎在**每个 step** 都注入的名字（StepCompiler.js:24-26 deconstructs/params/topVars）：
//   `var { step, source, target, targets, card, cards, skill, forced, num, result } = event;`
//   `function (topVars, event, trigger, player)` ⇒ player/trigger/event 也是参数。
// 所以这些名字跨步骤出现**不是**跨步变量问题（同名的 `var` 只是遮蔽）。
const ENGINE_PROVIDED = new Set([
	"step", "source", "target", "targets", "card", "cards", "skill", "forced", "num", "result", "_result",
	"player", "trigger", "event", "_status", "lib", "game", "ui", "get", "ai",
]);

let pass = 0;
let fail = 0;
const problems = [];
function ok(cond, msg, extra) {
	if (cond) pass++;
	else {
		fail++;
		console.log("  ✗ " + msg + (extra !== undefined ? "  → " + extra : ""));
	}
}

/// 去掉注释与字符串（用于分析代码；不能用于找 step 标记）
function stripCode(src) {
	return src
		.replace(/\/\*[\s\S]*?\*\//g, " ")
		.replace(/\/\/[^\n]*/g, " ")
		.replace(/`(?:[^`\\]|\\.)*`/g, '""')
		.replace(/"(?:[^"\\]|\\.)*"/g, '""')
		.replace(/'(?:[^'\\]|\\.)*'/g, '""');
}

/// 逐字符算花括号深度（用于区分「步骤顶层」和「嵌套函数/代码块内部」）
function depthMap(code) {
	const out = new Array(code.length);
	let depth = 0;
	for (let i = 0; i < code.length; i++) {
		if (code[i] === "{") {
			out[i] = depth;
			depth++;
		} else if (code[i] === "}") {
			depth--;
			out[i] = depth;
		} else {
			out[i] = depth;
		}
	}
	return out;
}

/// 只在「步骤顶层（depth===0）」匹配 regex，返回匹配到的名字
function matchTopLevel(code, re) {
	const dm = depthMap(code);
	const names = [];
	let m;
	re.lastIndex = 0;
	while ((m = re.exec(code))) {
		if (dm[m.index] === 0) names.push(m[1]);
	}
	return names;
}

/// 在同一段代码里，某名字是否在「步骤顶层」被裸引用（不是 obj.x / event.x）
function hasTopLevelBareUse(code, name) {
	const dm = depthMap(code);
	const re = new RegExp("(?<![.\\w$])" + name.replace(/\$/g, "\\$") + "(?![\\w$])", "g");
	let m;
	while ((m = re.exec(code))) {
		if (dm[m.index] === 0) return true;
	}
	return false;
}

/// 在一段原文里，把 `"step N"` 之间的内容切段
function splitSteps(rawBody) {
	const re = /(['"])step\s+(\d+)\1/g;
	const marks = [];
	let m;
	while ((m = re.exec(rawBody))) {
		const lineStart = rawBody.lastIndexOf("\n", m.index) + 1;
		const linePrefix = rawBody.slice(lineStart, m.index);
		if (/\/\//.test(linePrefix)) continue;
		marks.push({ step: Number(m[2]), index: m.index + m[0].length });
	}
	if (!marks.length) return null;
	return marks.map((cur, i) => ({
		step: cur.step,
		code: rawBody.slice(cur.index, i + 1 < marks.length ? marks[i + 1].index : rawBody.length),
	}));
}

/// 从原文里抓所有 content 函数体（花括号配对）
function extractContentBodies(raw) {
	const out = [];
	const grab = (idx) => {
		const start = raw.indexOf("{", idx);
		let depth = 0;
		let end = -1;
		for (let i = start; i < raw.length; i++) {
			if (raw[i] === "{") depth++;
			else if (raw[i] === "}") {
				depth--;
				if (depth === 0) {
					end = i;
					break;
				}
			}
		}
		return end > 0 ? raw.slice(start + 1, end) : null;
	};
	for (const re of [/content\s*:\s*function\s*[\w$]*\s*\([^)]*\)\s*\{/g, /(?:async\s+)?content\s*\([^)]*\)\s*\{/g]) {
		let m;
		while ((m = re.exec(raw))) {
			const body = grab(m.index);
			if (body && !out.includes(body)) out.push(body);
		}
	}
	return out;
}
const files = fs.readdirSync(CHAR_DIR).filter((f) => f.endsWith(".js"));
let scannedStepContents = 0;

for (const file of files) {
	const raw = fs.readFileSync(path.join(CHAR_DIR, file), "utf8");
	for (const body of extractContentBodies(raw)) {
		const steps = splitSteps(body);
		if (!steps) continue;
		scannedStepContents++;
		const declared = new Map();
		for (const s of steps) {
			const code = stripCode(s.code);
			for (const name of matchTopLevel(code, /\b(?:var|let|const)\s+([A-Za-z_$][\w$]*)/g)) {
				if (!declared.has(name)) declared.set(name, s.step);
			}
		}
		for (const [name, declStep] of declared) {
			if (ENGINE_PROVIDED.has(name)) continue;
			for (const s of steps) {
				if (s.step <= declStep) continue;
				const code = stripCode(s.code);
				// 该步骤自己又声明了一遍（`var x = …`）⇒ 不是跨步引用
				const redeclared = new RegExp("\\b(?:var|let|const)\\s+" + name.replace(/\$/g, "\\$") + "\\b").test(code);
				if (redeclared) continue;
				if (hasTopLevelBareUse(code, name)) {
					problems.push({ file, name, declStep, useStep: s.step });
				}
			}
		}
	}
}

for (const p of problems) {
	console.log("  ✗ " + p.file + "：step " + p.declStep + " 里声明的 `" + p.name + "` 在 step " + p.useStep + " 里被裸引用（会 ReferenceError）");
}
ok(problems.length === 0, "没有跨步骤裸引用（step 之间必须用 event.x 共享）", JSON.stringify(problems));
ok(scannedStepContents > 0, "至少扫到了一些 step 式 content（当前 " + scannedStepContents + " 个）");

// 自证：这个检查确实能抓到「定叛」那种写法（防止测试本身失效）
{
	const sample = `content: function () {
		"step 0"
		var extra = 1;
		event.extra = extra;
		"step 1"
		player.draw(extra);
	}`;
	const body = sample.slice(sample.indexOf("{") + 1, sample.lastIndexOf("}"));
	const steps = splitSteps(body);
	ok(!!steps && steps.length === 2, "自证：能把两条 step 切开", JSON.stringify(steps && steps.map((s) => s.step)));
	const declared = new Map();
	for (const s of steps || []) {
		for (const d of stripCode(s.code).matchAll(/\b(?:var|let|const)\s+([A-Za-z_$][\w$]*)/g)) declared.set(d[1], s.step);
	}
	const caught = [...declared.entries()].some(([name, declStep]) =>
		(steps || []).some((s) => s.step > declStep && new RegExp("(?<![.\\w$])" + name + "(?![\\w$])").test(stripCode(s.code)))
	);
	ok(caught, "自证：能抓到 `var extra` 在后续 step 里裸引用");
}

// 特别盯一下梦诸葛诞【定叛】：不能出现跨步骤的裸 `extra`
//  （历史事故：`var extra` 在 step 0，`player.draw(extra)` 在 step 1 ⇒ ReferenceError）
{
	const zd = fs.readFileSync(path.join(EXT, "character", "sgz_zhugedan.js"), "utf8");
	const zdClean = stripCode(zd);
	// 该技能里若出现 `extra`，只允许两种形态：`event.extra`、或同一步骤内声明使用
	ok(!/player\.draw\(\s*extra\s*\)/.test(zdClean), "定叛：没有 `player.draw(extra)` 这种裸引用");
	ok(!/changeHujia\([^)]*(?<![.\w])extra(?![.\w])/.test(zdClean.replace(/event\.extra/g, "EVENT_EXTRA")), "定叛：changeHujia 里没有裸 `extra`");
}
console.log("\n通过 " + pass + "/" + (pass + fail) + "，失败 " + fail);
process.exit(fail ? 1 : 0);
