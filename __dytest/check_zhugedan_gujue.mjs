// ============================================================
//  自检：梦诸葛诞「孤决」（原【困诛】+【孤绝】合并成的空壳技能）
//
//  跑法：node extension/大梦千秋/__dytest/check_zhugedan_gujue.mjs
//
//  结构要求（2026）：
//    · 父技能 `sgz_gujue` 是**空壳**：没有 trigger / content，只负责挂子技能
//    · 三条效果各在一个子技能里：
//        ① sgz_gujue_buke  体力上限 ≤ 叛军数 ⇒ 使用的牌不可被响应
//        ② sgz_gujue_draw  成为“叛军”使用牌的目标 ⇒ 摸 1 张
//        ③ sgz_gujue_end   结束阶段：减 X 上限（除第一轮），再 +X 护甲 / 摸 X（X=叛军数）
//    · 子技能必须同时出现在 `group` 里（否则只是注册、玩家并不拥有）
// ============================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------- 最小全局假件
// 引擎的数组 polyfill（角色文件里 [1,2].randomGet() 这种写法要用）
for (const [name, value] of [
	["randomGet", function () { return this[Math.floor(Math.random() * this.length)]; }],
	["randomGets", function (num) {
		const list = this.slice(0);
		const out = [];
		const n = Math.min(num === undefined ? 1 : num, list.length);
		for (let i = 0; i < n; i++) out.push(list.splice(Math.floor(Math.random() * list.length), 1)[0]);
		return out;
	}],
	["add", function (...args) { for (const a of args) if (!this.includes(a)) this.push(a); return this; }],
	["addArray", function (...arrs) { for (const arr of arrs) for (const item of arr) this.add(item); return this; }],
	["remove", function (...args) { for (const item of args) { const pos = this.indexOf(item); if (pos !== -1) this.splice(pos, 1); } return this; }],
]) {
	Object.defineProperty(Array.prototype, name, { configurable: true, enumerable: false, writable: true, value });
}
globalThis.lib = { skill: {}, translate: {}, card: {}, filter: {}, inpile: [] };
globalThis._status = { event: null, currentPhase: null, dying: [] };
globalThis.game = {
	players: [],
	dead: [],
	roundNumber: 1,
	log() {},
	playAudio() {},
	hasPlayer: () => false,
	countPlayer: (fn) => (globalThis.game.players || []).filter((p) => !fn || fn(p)).length,
	filterPlayer: (fn) => (globalThis.game.players || []).filter((p) => !fn || fn(p)),
	phaseNumber: 1,
};
globalThis.get = {
	attitude: () => -1,
	type: () => "basic",
	name: (c) => (c && c.name) || "",
	translation: (x) => String(x),
	cnNumber: (n) => String(n),
	value: () => 5,
	threaten: () => 5,
};
globalThis.ui = { selected: { targets: [] } };
globalThis.window = globalThis;
globalThis.ai = {};

const here = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(here, "..");
const charSrc = fs.readFileSync(path.join(EXT, "character", "sgz_zhugedan.js"), "utf8");
const zd = (await import(new URL("../character/sgz_zhugedan.js", import.meta.url).href)).default;

const GUJUE = zd.skills.sgz_gujue;
const SUB = (GUJUE && GUJUE.subSkill) || {};

let pass = 0;
let fail = 0;
function ok(cond, msg, extra) {
	if (cond) pass++;
	else {
		fail++;
		console.log("  ✗ " + msg + (extra !== undefined ? "  → 实际：" + extra : ""));
	}
}

// 引擎调用 content 时会注入 (topVars, event, trigger, player)；模块里拿到的还是原始函数
function callContent(fn, event, trigger, player) {
	const body = fn.toString();
	const inner = body.slice(body.indexOf("{") + 1, body.lastIndexOf("}"));
	const f = new Function("event", "trigger", "player", "_status", "ai", "game", "get", "lib", "ui", inner);
	return f(event, trigger, player, _status, ai, game, get, lib, ui);
}

function mkPlayer(name, opts = {}) {
	return {
		name,
		skills: new Set(opts.skills || []),
		hp: opts.hp === undefined ? 4 : opts.hp,
		maxHp: opts.maxHp === undefined ? 4 : opts.maxHp,
		calls: [],
		hasSkill(s) {
			return this.skills.has(s);
		},
		logSkill() {},
		draw(num) {
			this.calls.push(["draw", num]);
		},
		changeHujia(num) {
			this.calls.push(["changeHujia", num]);
		},
		loseMaxHp(num) {
			this.calls.push(["loseMaxHp", num]);
			this.maxHp -= num === undefined ? 1 : num;
		},
	};
}
const rebel = (name) => mkPlayer(name, { skills: ["sgz_dingpan_pan"] });

// ---------------------------------------------------------------- 一、结构：空壳 + 三个子技能
ok(!!GUJUE, "孤决技能存在");
ok(!GUJUE.trigger, "父技能没有 trigger（空壳）", JSON.stringify(GUJUE.trigger));
ok(!GUJUE.content, "父技能没有 content（空壳）");
ok(Array.isArray(GUJUE.group), "父技能有 group");
["sgz_gujue_buke", "sgz_gujue_draw", "sgz_gujue_end"].forEach((id) => {
	ok((GUJUE.group || []).includes(id), "group 里包含 " + id, JSON.stringify(GUJUE.group));
});
["buke", "draw", "end"].forEach((k) => {
	ok(!!SUB[k], "subSkill 里有 " + k);
	if (SUB[k]) {
		ok(SUB[k].persevereSkill === true, k + "：带 persevereSkill");
		ok(SUB[k].sub === true, k + "：标了 sub: true");
		ok(!!SUB[k].trigger, k + "：有 trigger");
	}
});

// ---------------------------------------------------------------- 二、① buke
{
	const rule = SUB.buke;
	game.players = [rebel("甲"), rebel("乙")]; // 2 个叛军
	ok(rule.filter({}, mkPlayer("诞", { maxHp: 2 })) === true, "① 体力上限(2) ≤ 叛军数(2) → 触发");
	ok(rule.filter({}, mkPlayer("诞", { maxHp: 3 })) === false, "① 体力上限(3) > 叛军数(2) → 不触发");
	game.players = [];
	ok(rule.filter({}, mkPlayer("诞", { maxHp: 1 })) === false, "① 没有叛军 → 不触发");

	const me = mkPlayer("诞", { maxHp: 2 });
	const trigger = { name: "useCard1", player: me, card: { name: "sha" } };
	callContent(rule.content, {}, trigger, me);
	ok(Array.isArray(trigger.directHit) && trigger.directHit.length === 0, "① content：directHit 已设置（场上无其他人时为空数组）", JSON.stringify(trigger.directHit));
	ok(trigger.nowuxie === true, "① content：nowuxie = true（不能被无懈响应）");

	// 场上有别人时，directHit 应把「除自己外」的人全列进去
	game.players = [me, rebel("甲"), mkPlayer("路人")];
	const trigger2 = { name: "useCard1", player: me, card: { name: "sha" } };
	callContent(rule.content, {}, trigger2, me);
	ok(trigger2.directHit.length === 2 && !trigger2.directHit.includes(me), "① content：directHit 列出除自己外的角色", JSON.stringify(trigger2.directHit.map((p) => p.name)));
}

// ---------------------------------------------------------------- 三、② draw
{
	const rule = SUB.draw;
	ok(rule.trigger.target === "useCardToTargeted", "② 挂在 useCardToTargeted（成为目标时）");
	const me = mkPlayer("诞");
	ok(rule.filter({ player: rebel("甲") }, me) === true, "② 牌是叛军用的 → 触发");
	ok(rule.filter({ player: mkPlayer("路人") }, me) === false, "② 牌不是叛军用的 → 不触发");
	ok(rule.filter({}, me) === false, "② 没有使用者 → 不触发（不报错）");
	callContent(rule.content, {}, {}, me);
	ok(me.calls.length === 1 && me.calls[0][0] === "draw" && me.calls[0][1] === undefined, "② content：摸 1 张（draw()）", JSON.stringify(me.calls));
}

// ---------------------------------------------------------------- 四、③ end
{
	const rule = SUB.end;
	ok(rule.trigger.player === "phaseJieshuBegin", "③ 挂在 phaseJieshuBegin（结束阶段开始时）");
	game.players = [rebel("甲"), rebel("乙"), mkPlayer("路人")];
	ok(rule.filter({}, mkPlayer("诞")) === true, "③ 场上有叛军 → 触发");
	game.players = [mkPlayer("路人")];
	ok(rule.filter({}, mkPlayer("诞")) === false, "③ 场上没有叛军 → 不触发");

	// 第二轮：X=2 → 减 2 上限、+2 护甲、摸 2
	game.players = [rebel("甲"), rebel("乙"), mkPlayer("路人")];
	game.roundNumber = 2;
	const me = mkPlayer("诞");
	callContent(rule.content, {}, {}, me);
	ok(me.calls.some((c) => c[0] === "loseMaxHp" && c[1] === 2), "③ 第二轮：减少 X=2 点体力上限", JSON.stringify(me.calls));
	ok(me.calls.some((c) => c[0] === "changeHujia" && c[1] === 2), "③ 获得 X=2 点护甲", JSON.stringify(me.calls));
	ok(me.calls.some((c) => c[0] === "draw" && c[1] === 2), "③ 摸 X=2 张牌", JSON.stringify(me.calls));

	// 第一轮：不减上限，但仍 +护甲 / 摸牌
	game.roundNumber = 1;
	const me1 = mkPlayer("诞");
	callContent(rule.content, {}, {}, me1);
	ok(!me1.calls.some((c) => c[0] === "loseMaxHp"), "③ 第一轮：不减体力上限", JSON.stringify(me1.calls));
	ok(me1.calls.some((c) => c[0] === "changeHujia" && c[1] === 2), "③ 第一轮：仍获得护甲");
	ok(me1.calls.some((c) => c[0] === "draw" && c[1] === 2), "③ 第一轮：仍摸牌");
}

// ---------------------------------------------------------------- 五、文本与清理
{
	const skillsList = (charSrc.match(/skills:\[([^\]]*)\]/) || [])[1] || "";
	ok(!/sgz_kunzhu/.test(skillsList), "技能表里已经没有 sgz_kunzhu", skillsList);
	ok(/sgz_gujue/.test(skillsList), "技能表里有 sgz_gujue");
	ok(!/sgz_kunzhu/.test(charSrc), "文件里已经没有 sgz_kunzhu（技能 / 翻译 / 台词都清了）");
	ok(zd.skillTranslate.sgz_gujue === "孤决", "译名是「孤决」", zd.skillTranslate.sgz_gujue);
	const info = zd.skillTranslate.sgz_gujue_info || "";
	ok(/体力上限≤X/.test(info) && /不可被响应/.test(info), "描述①：体力上限≤X ⇒ 不可被响应");
	ok(/当?你成为“叛军”使用牌的目标时摸1张牌/.test(info), "描述②：成为叛军牌目标摸 1 张");
	ok(/结束阶段/.test(info) && /护甲/.test(info) && /摸X张牌/.test(info), "描述③：结束阶段减上限 / 护甲 / 摸牌");
}

console.log("\n通过 " + pass + "/" + (pass + fail) + "，失败 " + fail);
process.exit(fail ? 1 : 0);
