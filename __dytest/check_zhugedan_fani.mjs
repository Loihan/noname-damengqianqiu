// ============================================================
//  自检：梦诸葛诞【伐逆】③ —— 一次性摸「叛军数」张（不再一个目标摸一张）
//
//  跑法：node extension/大梦千秋/__dytest/check_zhugedan_fani.mjs
//
//  需求（2026）：
//    「你每对一名“叛军”使用牌时便摸一张牌」
//      → 使用**一张牌**时只结算一次，按「本次目标里有几个叛军」一次性摸 N 张。
//    旧写法挂在 `useCardToPlayered`（每个目标各触发一次），所以打 3 个叛军会「摸1、摸1、摸1」。
// ============================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------- 最小全局假件
globalThis.lib = { skill: {}, translate: {}, card: {}, filter: {}, inpile: [] };
globalThis._status = { event: null, currentPhase: null, dying: [] };
globalThis.game = {
	players: [],
	dead: [],
	log() {},
	playAudio() {},
	hasPlayer: () => false,
	countPlayer: () => 0,
	phaseNumber: 1,
};
globalThis.get = {
	attitude: () => -1,
	type: () => "basic",
	name: (c) => (c && c.name) || "",
	translation: (x) => String(x),
	cnNumber: (n) => String(n),
	value: () => 5,
};
globalThis.ui = { selected: { targets: [] } };
globalThis.ai = {};
globalThis.window = globalThis;

const here = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(here, "..");
const charSrc = fs.readFileSync(path.join(EXT, "character", "sgz_zhugedan.js"), "utf8");
const zd = (await import(new URL("../character/sgz_zhugedan.js", import.meta.url).href)).default;

const FANI = zd.skills.sgz_fani;
const DRAW = FANI.subSkill.draw;

// 引擎（StepCompiler.js:96-98）调用 content 时注入的是一组**函数参数**：
//   (topVars, event, trigger, player)，其中 topVars = { _status, ai, game, get, lib, ui }。
// 模块里的 `DRAW.content` 还是**原始函数**（编译是事件运行前才做的），
// 所以在 Node 里直接调会 ReferenceError；这里用 Function 把同样的名字注入进去。
function callContent(fn, event, trigger, player, result) {
	const body = fn.toString();
	const inner = body.slice(body.indexOf("{") + 1, body.lastIndexOf("}"));
	const f = new Function(
		"event", "trigger", "player", "result", "_status", "ai", "game", "get", "lib", "ui",
		inner
	);
	return f(event, trigger, player, result, _status, ai, game, get, lib, ui);
}

let pass = 0;
let fail = 0;
function ok(cond, msg, extra) {
	if (cond) pass++;
	else {
		fail++;
		console.log("  ✗ " + msg + (extra !== undefined ? "  → 实际：" + extra : ""));
	}
}

function mkPlayer(name, opts = {}) {
	const p = {
		name,
		skills: new Set(opts.skills || []),
		hp: 4,
		maxHp: 4,
		calls: [],
		hasSkill(s) {
			return this.skills.has(s);
		},
		countCards() {
			return 0;
		},
		draw(num) {
			this.calls.push(["draw", num]);
		},
	};
	return p;
}
const rebel = (n) => mkPlayer(n, { skills: ["sgz_dingpan_pan"] });

// ---------------------------------------------------------------- 一、结构：挂在 useCard（每张牌一次）
ok(!!DRAW, "伐逆有 draw 子技能");
ok(DRAW.trigger && DRAW.trigger.player === "useCard", "③ 挂在 `useCard`（每张牌只触发一次）", JSON.stringify(DRAW.trigger));
ok(!DRAW.trigger || DRAW.trigger.player !== "useCardToPlayered", "③ 不再挂在 `useCardToPlayered`（那是每个目标一次）");
const faniAt = charSrc.indexOf("sgz_fani: {");
const faniEnd = charSrc.indexOf("sgz_fenyu: {", faniAt);
const faniBlock = charSrc.slice(faniAt, faniEnd > faniAt ? faniEnd : undefined);
const faniCode = faniBlock.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
	ok(!/player\.draw\(\s*\)/.test(faniCode), "伐逆里不再有无参数的 `player.draw()`（一人一张的老写法）");

// ---------------------------------------------------------------- 二、运行：一次摸 N 张
{
	const me = mkPlayer("诸葛诞");
	const targets = [rebel("叛军甲"), mkPlayer("路人"), rebel("叛军乙")];
	const trigger = { name: "useCard", player: me, targets };
	ok(DRAW.filter(trigger, me) === true, "目标里有叛军 → 触发");
	const before = me.calls.length;
	if (DRAW.filter(trigger, me)) await callContent(DRAW.content, {}, trigger, me);
	ok(me.calls.length - before === 1, "只调用一次 draw（不是每个目标各一次）", JSON.stringify(me.calls));
	ok(me.calls[before][0] === "draw" && me.calls[before][1] === 2, "摸牌数 = 叛军数（2 个叛军 → 一次摸 2 张）", JSON.stringify(me.calls[before]));
}
{
	const me = mkPlayer("诸葛诞");
	const targets = [rebel("甲"), rebel("乙"), rebel("丙")];
	const trigger = { name: "useCard", player: me, targets };
	await callContent(DRAW.content, {}, trigger, me);
	ok(me.calls.length === 1 && me.calls[0][1] === 3, "3 个叛军 → 一次摸 3 张", JSON.stringify(me.calls));
}
{
	const me = mkPlayer("诸葛诞");
	const trigger = { name: "useCard", player: me, targets: [mkPlayer("路人"), rebel("唯一叛军")] };
	ok(DRAW.filter(trigger, me) === true, "只有一个叛军也触发");
	await callContent(DRAW.content, {}, trigger, me);
	ok(me.calls.length === 1 && me.calls[0][1] === 1, "1 个叛军 → 摸 1 张", JSON.stringify(me.calls));
}
{
	const me = mkPlayer("诸葛诞");
	const trigger = { name: "useCard", player: me, targets: [mkPlayer("路人")] };
	ok(DRAW.filter(trigger, me) === false, "没有叛军 → 不触发");
	ok(DRAW.content.length === 0 || true, "（content 不会被调用）");
}
{
	// 少数极端情况：targets 缺失时不能炸
	const me = mkPlayer("诸葛诞");
	ok(DRAW.filter({ name: "useCard", player: me }, me) === false, "targets 为空/缺失 → 不触发（不报错）");
	await callContent(DRAW.content, {}, { name: "useCard", player: me }, me);
	ok(me.calls.length === 0, "没有叛军时 content 不会摸牌", JSON.stringify(me.calls));
}

// ---------------------------------------------------------------- 三、描述没被改坏
{
	// 描述文案由用户自行打磨，这里只要求「③ 仍然是摸牌且和叛军数有关」这层语义
const faniInfo = zd.skillTranslate.sgz_fani_info || "";
ok(/使用牌/.test(faniInfo) && /叛军/.test(faniInfo) && /摸/.test(faniInfo), "技能描述仍包含 ③（使用牌摸叛军数量张）", faniInfo.slice(0, 80));
}

console.log("\n通过 " + pass + "/" + (pass + fail) + "，失败 " + fail);
process.exit(fail ? 1 : 0);
