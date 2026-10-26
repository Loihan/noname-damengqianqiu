// ============================================================
//  自检：梦钟会 · 逐月（法则技 / 死亡后「经过位次」触发）＋ 技能顺序
//  跑法：node extension/大梦千秋/__dytest/check_zhonghui_zhuyue.mjs
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

// 引擎桩
globalThis.game = globalThis.game || {
	players: [],
	dead: [],
	addGlobalSkill() {},
	swapPlayerAuto() {},
	log() {},
	createCard() {},
};
globalThis.ui = globalThis.ui || { click: { auto() {} } };
globalThis._status = globalThis._status || { auto: false };
globalThis.lib = globalThis.lib || { skill: {}, translate: {}, config: {} };
globalThis.get = globalThis.get || {
	translation: s => s,
	cnNumber: n => String(n),
	color: () => "red",
	prompt: s => s,
	attitude: () => -1,
};
globalThis.ai = globalThis.ai || {};
globalThis.window = globalThis.window || {};

const mod = await import("file:///" + path.join(EXT, "character", "sgz_zhonghui.js").replace(/\\/g, "/"));
const zh = mod.default;
const zy = zh.skills.sgz_zhuyue;
const xf = zh.skills.sgz_xingfa;

// ---- 1) 技能顺序 ----
{
	const list = zh.character.sgz_zhonghui.skills;
	const iXingfa = list.indexOf("sgz_xingfa");
	const iZhuyue = list.indexOf("sgz_zhuyue");
	ok(iXingfa === 3, "兴伐是第 4 个技能（index 3）", iXingfa);
	ok(iZhuyue === 4, "逐月紧跟其后（index 4）", iZhuyue);
	// 逐月是最后一个「武将展示技能」：其后只剩隐藏/特效技能
	const tail = list.slice(iZhuyue + 1);
	ok(
		tail.every(id => /audio_effect|texiao|_ui$/.test(id)),
		"逐月之后只剩隐藏特效技能（即逐月是最后一个技能）",
		JSON.stringify(tail)
	);
	// 千幻面板顺序（characterTaici.order）
	const taici = zh.characterTaici;
	ok(taici.sgz_xingfa.order === 4 && taici.sgz_zhuyue.order === 5, "台词 order：兴伐 4 / 逐月 5", JSON.stringify({ xf: taici.sgz_xingfa.order, zy: taici.sgz_zhuyue.order }));
}

// ---- 2) 逐月 = 法则技 ----
ok(zy.ruleSkill === true, "逐月带 ruleSkill（法则技）", zy.ruleSkill);
ok(zy.forceDie === true, "逐月带 forceDie（死亡后引擎仍派发触发）", zy.forceDie);
ok(zy.forceOut === true, "逐月带 forceOut（离场也能触发）", zy.forceOut);
ok(zy.forced === true, "逐月是锁定技", zy.forced);
ok(JSON.stringify(zy.trigger) === JSON.stringify({ player: "phaseZhunbeiBegin", global: "roundStart" }), "逐月双时机：自己准备阶段 + 每轮开始", JSON.stringify(zy.trigger));
ok(
	JSON.stringify(zy.group) === JSON.stringify(["sgz_zhuyue_logic"]),
	"逐月 group 只剩 logic（位次那套已删）",
	JSON.stringify(zy.group)
);
ok(!!zy.subSkill.logic && !zy.subSkill.seat && !zy.subSkill.turnlog, "只保留 logic 子技能（seat / turnlog 已删除）", JSON.stringify(Object.keys(zy.subSkill)));
ok(JSON.stringify(zy.trigger.global) === JSON.stringify("roundStart"), "死亡后时机用 roundStart", JSON.stringify(zy.trigger));
ok(zy.subSkill.logic.forceDie === true, "logic 子技能带 forceDie（死亡后仍要调上限）", zy.subSkill.logic.forceDie);
ok(zy.subSkill.logic.forceOut === true, "logic 子技能带 forceOut", zy.subSkill.logic.forceOut);

// ---- 3) filter：存活只认自己的准备阶段；死亡后由 roundStart 单方面派发 ----
function mkPlayer(opts = {}) {
	const p = {
		name: opts.name || "p",
		storage: opts.storage || {},
		dead: !!opts.dead,
		isDead() {
			return this.dead;
		},
		isAlive() {
			return !this.dead;
		},
		removed: false,
	};
	return p;
}
{
	const me = mkPlayer({ name: "钟会" });
	const other = mkPlayer({ name: "甲" });

	// —— 存活：只看自己的准备阶段 ——
	ok(zy.filter({ name: "phaseZhunbei", player: me }, me) === true, "存活：自己的准备阶段 → 触发");
	ok(zy.filter({ name: "phaseZhunbei", player: other }, me) === false, "存活：别人准备阶段 → 不触发");
	ok(zy.filter({ name: "phase", player: other }, me) === false, "存活：轮开始（phase 事件）→ 不触发");

	// —— 死亡后：roundStart 是在 phase 事件里抛出的（content.js:4722），
	//      event.name 是 "phase"，所以 filter 不能按名字判；死者只会被这个 global 派发到，直接放行 ——
	me.dead = true;
	ok(zy.filter({ name: "phase", player: other }, me) === true, "死亡后：轮开始（真实事件名 phase）→ 触发");
	ok(zy.filter({ name: "roundStart" }, me) === true, "死亡后：即使 name 是 roundStart 也放行");
}

// ---- 3b) 死亡后子事件的引擎门槛（这条才是「完全不触发」的真凶）----
{
	const src = zy.content.toString();
	ok(/choose\.forceDie\s*=\s*true/.test(src), "选择目标的事件补了 forceDie（否则死者的事件被引擎直接 finish）");
	ok(/await choose/.test(src), "真的 await 了那次选择");
	ok(/target\.damage\(1,\s*player\)/.test(src), "伤害显式指定来源（死者默认来源会被丢弃，player.js:7857）");
}
// ---- 4) 描述 ----
{
	const info = zh.skillTranslate.sgz_zhuyue_info || "";
	ok(info.includes("法则技"), "描述标注「法则技」");
	ok(info.includes("准备阶段"), "描述保留准备阶段效果");
	ok(info.includes("每轮开始时"), "描述写明死亡后的「每轮开始时」触发");
	ok((zh.skillTranslate.sgz_xingfa_info || "").includes("累计造成的伤害"), "兴伐描述仍是累计伤害那套");
}

// ---- 5) 技能体没有串号（逐月里不该再出现 storage.sgz_xingfa）----
{
	const charSrc = fs.readFileSync(path.join(EXT, "character", "sgz_zhonghui.js"), "utf8");
	const zyBlock = charSrc.slice(charSrc.indexOf("        sgz_zhuyue: {"));
	const zyBody = zyBlock.slice(0, zyBlock.indexOf("        // === 5. 兴伐  ==="));
	ok(!/sgz_xingfa/.test(zyBody), "逐月技能体里没有 sgz_xingfa 的串号");
	const xfBlock = charSrc.slice(charSrc.indexOf("        sgz_xingfa: {"));
	const xfBody = xfBlock.slice(0, xfBlock.indexOf("        // === 特写音效控制器"));
	ok(!/sgz_zhuyue/.test(xfBody), "兴伐技能体里没有 sgz_zhuyue 的串号");
}

console.log("\n通过 " + pass + "/" + (pass + fail) + "，失败 " + fail);
process.exit(fail ? 1 : 0);
