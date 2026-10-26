// ============================================================
//  自检：梦关羽 · 魂殇②（死亡后仍判定、仍由关羽操控）
//  跑法：node extension/大梦千秋/__dytest/check_guanyu_hunshang.mjs
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

// 引擎相关全局（角色模块只读这些；给最小桩即可）
globalThis.game = globalThis.game || { players: [], dead: [], addGlobalSkill() {}, swapPlayerAuto() {}, log() {} };
globalThis.ui = globalThis.ui || { click: { auto() {} } };
globalThis._status = globalThis._status || { auto: false };
globalThis.lib = globalThis.lib || { skill: {}, translate: {}, config: {} };
globalThis.get = globalThis.get || { translation: s => s, cnNumber: n => String(n), color: () => "red", prompt: s => s };
globalThis.ai = globalThis.ai || {};

const mod = await import("file:///" + path.join(EXT, "character", "sgz_guanyu.js").replace(/\\/g, "/"));
const wy = mod.default;
const hs = wy.skills.sgz_hunshang;
const judge = hs.subSkill.judge;

function mkPlayer(opts = {}) {
	const marks = Object.assign({}, opts.marks || {});
	return {
		name: opts.name || "p",
		storage: {},
		out: !!opts.out,
		dead: !!opts.dead,
		isOut() {
			return this.out;
		},
		isDead() {
			return this.dead;
		},
		isAlive() {
			return !this.dead;
		},
		hasMark(n) {
			return (marks[n] || 0) > 0;
		},
		countMark(n) {
			return marks[n] || 0;
		},
		addMark(n, num = 1) {
			marks[n] = (marks[n] || 0) + num;
		},
		removeMark(n, num = 1) {
			marks[n] = Math.max(0, (marks[n] || 0) - num);
		},
		unmarkSkill() {},
		addTempSkill() {},
		addSkill() {},
		countCards() {
			return 0;
		},
		getCards() {
			return [];
		},
	};
}

// ---- 1) 触发门槛：死亡后仍能触发 ----
ok(judge.forceDie === true, "魂殇② 带 forceDie（死亡后引擎仍会触发，game/index.js:6192）", judge.forceDie);
ok(judge.forceOut === true, "魂殇② 仍带 forceOut（修整/移出游戏时能触发）", judge.forceOut);

// ---- 2) filter 三种状态 ----
{
	const me = mkPlayer({ name: "关羽", dead: true });
	const target = mkPlayer({ name: "目标", marks: { sgz_zhuihun: 1 } });
	ok(judge.filter({ player: target }, me) === true, "关羽已死亡 + 目标有追魂 → 触发判定");

	const alive = mkPlayer({ name: "关羽" });
	ok(judge.filter({ player: target }, alive) === false, "关羽在场（活且未移出）→ 不接管");

	const outed = mkPlayer({ name: "关羽", out: true });
	ok(judge.filter({ player: target }, outed) === true, "关羽修整（移出游戏）→ 仍触发（原行为保留）");

	const awakened = mkPlayer({ name: "关羽", dead: true });
	awakened.storage.sgz_hunshang_awaken = true;
	ok(judge.filter({ player: target }, awakened) === false, "已觉醒 → 不再触发");

	const noMark = mkPlayer({ name: "无追魂" });
	ok(judge.filter({ player: noMark }, me) === false, "目标没有追魂 → 不触发");

	const self = mkPlayer({ name: "关羽", dead: true });
	self.storage.sgz_hunshang_awaken = false;
	ok(judge.filter({ player: self }, self) === false, "目标是自己 → 不触发");
}

// ---- 3) 描述里写明了「死亡后仍进行」 ----
{
	const info = wy.skillTranslate.sgz_hunshang_info || "";
	ok(info.includes("由你操纵"), "魂殇② 描述仍写明「由你操纵」");
	ok(info.includes("追魂"), "魂殇② 描述仍写明「追魂」");
}

// ---- 4) 锁定的关键实现细节（防止以后被改掉）----
{
	const src = judge.content.toString();
	ok(/marker\._trueMe = player/.test(src), "判定红时仍把操控者设为梦关羽（_trueMe）");
	ok(/addGlobalSkill\("autoswap"\)/.test(src), "仍挂 autoswap（操控他人时的视图切换）");
	ok(/sgz_hunshang_swapback/.test(src), "仍授予归还操控权的临时技能");
}


// ---- 5) 2026：魂殇③④ 合并、④成功摸牌、梦刃③致死伤害 ----
{
	const sub = hs.subSkill;
	ok(!sub.return && !sub.return_out, "旧的 ③ return / return_out 已删除", JSON.stringify(Object.keys(sub)));
	ok(!!sub.suoming && !!sub.awaken, "suoming / awaken 仍在");
	ok(JSON.stringify(sub.suoming.trigger.global) === JSON.stringify(["phaseBeginStart", "dying"]), "③ 合并了两个时机", JSON.stringify(sub.suoming.trigger.global));
	const f = sub.suoming.filter;
	const noMark = mkPlayer({ name: "无追魂" });
	const withMark = mkPlayer({ name: "有追魂", marks: { sgz_zhuihun: 1 } });
	const me2 = mkPlayer({ name: "关羽" });
	ok(f({ name: "dying", player: noMark }, me2) === true, "濒死 → 获得索命");
	ok(f({ name: "dying", player: me2 }, me2) === false, "自己濒死不触发");
	ok(f({ name: "phase", player: noMark }, me2) === true, "无追魂角色回合开始 → 获得索命");
	ok(f({ name: "phase", player: withMark }, me2) === false, "有追魂角色回合开始 → 不触发");
	noMark.storage.sgz_hunshang_judged = true;
	ok(f({ name: "phase", player: noMark }, me2) === false, "② 刚移除追魂的回合不重复给");
	me2.storage.sgz_hunshang_awaken = true;
	ok(f({ name: "phase", player: mkPlayer({ name: "乙" }) }, me2) === false, "已成功后不再触发");

	const aw = sub.awaken.content.toString();
	ok(/countMark\("sgz_suoming"\)\s*\*\s*4/.test(aw), "④成功：摸 4×索命 张牌");
	ok(/player\.in\("sgz_hunshang"\)/.test(aw), "④成功：结束修整（移回场上）");
	ok(/addSkill\("sgz_mengren"\)/.test(aw), "④成功：获得梦刃");

	const info = wy.skillTranslate.sgz_hunshang_info || "";
	ok(info.includes("濒死"), "魂殇描述含「濒死」");
	ok(info.includes("4倍"), "魂殇描述含「摸4倍索命张牌」");
	ok(info.includes("结束修整"), "魂殇描述含「结束修整」");
	ok(!/③没有[\s\S]{0,40}摸4张牌/.test(info), "旧 ③「摸4张牌」描述已删除");

	const mrInfo = wy.skillTranslate.sgz_mengren_info || "";
	ok(mrInfo.includes("致死伤害"), "梦刃描述含「致死伤害」");
	ok(mrInfo.includes("护甲值"), "梦刃描述含「护甲值」");

	const mengren = wy.skills.sgz_mengren.content.toString();
	ok(/target\.damage\(num,\s*player\)/.test(mengren), "梦刃③ 用伤害结算（不是 loseHp）");
	ok(/\.hujia/.test(mengren), "梦刃③ 把护甲算进伤害量");
	ok(/\(target\.hp \|\| 0\)/.test(mengren), "梦刃③ 把体力值算进伤害量");
}

// ---- 6) 美化层：主题框 ③ 的铭文同步 ----
{
	const fx = fs.readFileSync(path.join(EXT, "effect", "sgz_guanyu.js"), "utf8");
	ok(/loseall:[^\n]*血偿索命/.test(fx), "美化层 ③ 的铭文已改为「血偿索命 · 断其生机」");
}

console.log("\n通过 " + pass + "/" + (pass + fail) + "，失败 " + fail);
process.exit(fail ? 1 : 0);
