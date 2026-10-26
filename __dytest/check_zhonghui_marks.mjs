// ============================================================
//  自检：梦钟会「权 / 患」不再显示徽标（右侧已有能量条），逻辑不变
//  跑法：node extension/大梦千秋/__dytest/check_zhonghui_marks.mjs
//
//  需求口径（2026）：
//    · 武将牌右侧已有「权患双生计量 UI」（effect/sgz_zhonghui.js），
//      所以 `marktext` 的「权」「患」**不用再显示**（逻辑不变，只是不显示徽标）。
//    · 引擎行为（noname/library/element/player.js）决定了必须删**三个**键：
//        - `mark`      ：addSkill / removeMark 归零时决定建徽标
//        - `marktext`  ：徽标背景字
//        - `intro`     ：markSkill 在无显式 info 时会读它（9299-9304），留着徽标就复活（9302-9304 无 intro 则直接 return）
//    · 删掉 `intro.name` 之后，日志会退化成技能译名「权患」，所以改成显式 `dmqcZhMarkLog`。
// ============================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(here, "..");
const charSrc = fs.readFileSync(path.join(EXT, "character", "sgz_zhonghui.js"), "utf8");
const uiSrc = fs.readFileSync(path.join(EXT, "effect", "sgz_zhonghui.js"), "utf8");

let pass = 0;
let fail = 0;
function ok(cond, msg) {
	if (cond) pass++;
	else {
		fail++;
		console.log("  ✗ " + msg);
	}
}

// ---------- 1. 两个标记都不再带「显示三件套」 ----------
function blockOfSkill(src, key) {
	// 抓 `key: { … }` 这一段（花括号配对），key 支持 `sgz_quanhuan:` / `huan:`
	const at = src.indexOf(key);
	if (at < 0) return null;
	const braceStart = src.indexOf("{", at);
	let depth = 0;
	let i = braceStart;
	for (; i < src.length; i++) {
		if (src[i] === "{") depth++;
		else if (src[i] === "}") {
			depth--;
			if (depth === 0) break;
		}
	}
	return src.slice(braceStart, i + 1);
}
const quanBlock = blockOfSkill(charSrc, "sgz_quanhuan: {");
const huanBlock = blockOfSkill(charSrc, "huan: {");
ok(!!quanBlock, "能找到 sgz_quanhuan 技能块");
ok(!!huanBlock, "能找到 患 子技能块");
[["权患", quanBlock], ["患", huanBlock]].forEach(([label, blk]) => {
	if (!blk) return;
	// 注释里会提到 marktext / mark / intro（说明文字），所以只匹配**代码行**（不以 // 开头）
	const codeLines = blk.split(/\r?\n/).filter((l) => !/^\s*\/\//.test(l));
	const code = codeLines.join("\n");
	ok(!/marktext\s*:/.test(code), label + "：不再有 marktext");
	ok(!/\bmark\s*:\s*true/.test(code), label + "：不再有 mark: true");
	ok(!/\bintro\s*:/.test(code), label + "：不再有 intro（否则徽标会复活）");
});

// ---------- 2. 累计伤害技能的徽标保留（2026：逐月/兴伐 名字对调后，它挂在 id sgz_xingfa 上） ----------
const zhuyueBlock = blockOfSkill(charSrc, "sgz_xingfa: {");
ok(!!zhuyueBlock && /mark\s*:\s*true/.test(zhuyueBlock), "累计伤害技能（现名「兴伐」，id sgz_xingfa）仍保留 mark: true");
ok(!!zhuyueBlock && /intro\s*:/.test(zhuyueBlock), "累计伤害技能（现名「兴伐」）仍保留 intro");

// ---------- 3. 日志：所有标记增减都关掉自动日志并显式打印 ----------
const addRemove = charSrc.match(/(addMark|removeMark)\([^\n]*\)/g) || [];
ok(addRemove.length >= 6, "找到全部标记增减调用（≥6 处，实际 " + addRemove.length + "）");
addRemove.forEach((call) => {
	ok(/,\s*false\s*\)$/.test(call), "关闭自动日志：" + call.trim());
});
// ⚠ 不能用模块级函数：`sgz_quanhuan.content` 是非 async 的 "step 0" 写法，
//   StepCompiler 会把它丢进 `eval` 重新求值（报错栈 `eval at packStep`），
//   那个作用域里**没有模块内函数** → 之前 `dmqcZhMarkLog is not defined` 就是这么炸的。
//   ⇒ 必须内联 `game.log(...)`（只用到引擎注入的 game / get / player）。
ok(!/dmqcZhMarkLog/.test(charSrc), "不再引用模块级日志函数（会被 StepCompiler 的 eval 干掉）");
const inlineLogs = charSrc.match(/game\.log\(player, "(获得了|移去了)", get\.cnNumber\([^)]*\), "个", "#g【[权患]】"\);/g) || [];
ok(inlineLogs.length >= 6, "每处标记增减都有内联 game.log（实际 " + inlineLogs.length + " 处）");
["权", "患"].forEach((k) => {
	ok(charSrc.includes("#g【" + k + "】"), "日志覆盖「" + k + "」");
});
// 增减方向要对：addMark → 获得了，removeMark → 移去了
ok(/addMark\("sgz_quanhuan", 4, false\);\s*\n\s*game\.log\(player, "获得了", get\.cnNumber\(4\), "个", "#g【权】"\);/.test(charSrc), "开局 +4 权 → 获得了");
ok(/removeMark\("sgz_quanhuan_huan", 1, false\);\s*\n\s*game\.log\(player, "移去了", get\.cnNumber\(1\), "个", "#g【患】"\);/.test(charSrc), "移去患 → 移去了");
ok(/game\.log\(player, "获得了", get\.cnNumber\(trigger\.num\), "个", "#g【患】"\)/.test(charSrc), "受伤转患用的是 trigger.num");

// ---------- 4. 逻辑未变：计数仍然靠 storage/countMark ----------
const countUses = charSrc.match(/countMark\("sgz_quanhuan(_huan)?"\)/g) || [];
ok(countUses.length >= 6, "countMark 使用点没有被删（实际 " + countUses.length + "）");
ok(/player\.addMark\("sgz_quanhuan_huan", trigger\.num, false\)/.test(charSrc), "受伤 → 患 的数值逻辑不变（trigger.num）");
ok(/player\.damage\("nosource", "nocard", player\.countMark\("sgz_quanhuan_huan"\)\)/.test(charSrc), "出牌阶段结束的伤害逻辑不变");

// ---------- 5. 能量条 UI 仍然读这两个标记（说明显示改由它负责） ----------
ok(/countMark\('sgz_quanhuan'\)/.test(uiSrc), "能量条 UI 仍读 权 的数量");
ok(/countMark\('sgz_quanhuan_huan'\)/.test(uiSrc), "能量条 UI 仍读 患 的数量");

console.log("\n通过 " + pass + "/" + (pass + fail) + "，失败 " + fail);
process.exit(fail ? 1 : 0);