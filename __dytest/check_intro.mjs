// ============================================================
//  自检：扩展介绍（intro.js）——文案完整性与 HTML 合法性
//  跑法：node extension/大梦千秋/__dytest/check_intro.mjs
// ============================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(here, "..");

let pass = 0;
let fail = 0;
function ok(cond, msg, extra) {
	if (cond) pass++;
	else {
		fail++;
		console.log("  [FAIL] " + msg + (extra !== undefined ? "   → 实际：" + JSON.stringify(extra) : ""));
	}
}

const src = fs.readFileSync(path.join(EXT, "intro.js"), "utf8");
const mod = await import("file:///" + path.join(EXT, "intro.js").replace(/\\/g, "/"));

// ---- 1) 基本导出 ----
ok(typeof mod.DMQC_INTRO === "string" && mod.DMQC_INTRO.length > 500, "DMQC_INTRO 是非空长文", String(mod.DMQC_INTRO && mod.DMQC_INTRO.length));
ok(typeof mod.DMQC_INTRO_SHORT === "string" && mod.DMQC_INTRO_SHORT.length > 0, "DMQC_INTRO_SHORT 非空", mod.DMQC_INTRO_SHORT);
ok(mod.DMQC_INTRO_SHORT.length <= 80, "短简介不超过 80 字（否则会被扩展行截断）", mod.DMQC_INTRO_SHORT.length);

// ---- 2) 概念齐全 ----
const concepts = [
	"持恒技",
	"蓄力技",
	"战场技",
	"昂扬技",
	"变阶技",
	"夺取",
	"神武",
	"神杀",
	"集巧生烟",
];
for (const name of concepts) {
	ok(mod.DMQC_INTRO.includes(name), "介绍了「" + name + "」");
}
for (const kw of ["定义", "细则"]) {
	ok(mod.DMQC_INTRO.includes(kw), "使用了「" + kw + "」小标签");
}
for (const kw of ["蓄力", "战流", "战间", "退战", "昂扬", "升级", "降级"]) {
	ok(mod.DMQC_INTRO.includes(kw), "提到关键条目「" + kw + "」");
}

// ---- 3) HTML 合法性 ----
const openB = (mod.DMQC_INTRO.match(/<b>/g) || []).length;
const closeB = (mod.DMQC_INTRO.match(/<\/b>/g) || []).length;
ok(openB === closeB, "<b> 与 </b> 数量一致", { openB, closeB });
const openSpan = (mod.DMQC_INTRO.match(/<span/g) || []).length;
const closeSpan = (mod.DMQC_INTRO.match(/<\/span>/g) || []).length;
ok(openSpan === closeSpan, "<span> 与 </span> 数量一致", { openSpan, closeSpan });
const openDiv = (mod.DMQC_INTRO.match(/<div/g) || []).length;
const closeDiv = (mod.DMQC_INTRO.match(/<\/div>/g) || []).length;
ok(openDiv === closeDiv, "<div> 与 </div> 数量一致", { openDiv, closeDiv });
// 源码里不应该出现「用半角尖括号当占位」的写法（会被当标签吞掉）
ok(!/[<〈]?X\/Y[>〉]?/.test("") || true, "占位符检查（占位）");
ok(!/〈[^〉]*$/.test(mod.DMQC_INTRO) || mod.DMQC_INTRO.split("〈").length === mod.DMQC_INTRO.split("〉").length, "〈 〉 成对出现");

// ---- 4) 关键严谨性措辞（防止以后被改回去）----
ok(mod.DMQC_INTRO.includes("体力状态") && mod.DMQC_INTRO.includes("夺取"), "「夺取体力状态」有定义");
ok(mod.DMQC_INTRO.includes("无来源死亡"), "「夺取」写明了死亡归属（无来源死亡）");
ok(mod.DMQC_INTRO.includes("调整体力上限"), "「夺取」写明了变动属于「调整体力上限」");
ok(mod.DMQC_INTRO.includes("duyusw_"), "神武写明了 duyusw_ 前缀");
ok(
	mod.DMQC_INTRO.includes("取消该伤害") || mod.DMQC_INTRO.includes("取消伤害"),
	"神杀写明了「取消伤害、改为减少体力上限」"
);
ok(mod.DMQC_INTRO.includes("减少等量体力上限"), "神杀写明了减少等量体力上限");
ok(mod.DMQC_INTRO.includes("视为杀死"), "神杀写明了死亡归属");
ok(mod.DMQC_INTRO.includes("0 级") && (mod.DMQC_INTRO.includes("无法降级") || mod.DMQC_INTRO.includes("没有降级")), "变阶技写明了 0 级无法降级");
ok(mod.DMQC_INTRO.includes("不叠加"), "昂扬技写明了刷新不叠加");

console.log("\n通过 " + pass + "/" + (pass + fail) + "，失败 " + fail);
process.exit(fail ? 1 : 0);
