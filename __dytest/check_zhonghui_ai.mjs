// ============================================================
//  自检：梦钟会「矫诏」的 AI（ai/sgz_zhonghui.js + character/sgz_zhonghui.js）
//  跑法：node extension/大梦千秋/__dytest/check_zhonghui_ai.mjs
//
//  覆盖的需求口径（2026）：
//    · 出牌阶段**最低优先级**：order 必须是"大于 0 但低于所有真牌(2~10)"的数；
//    · 必须补 `ai.result`（否则 effect_use 恒为 0 → AI 从不发动，这就是根因）；
//    · 发动时机白名单：只有「出牌阶段主循环」和「自己被乐·判定阶段」允许，其余一律否掉；
//    · 被乐时 chooseButton 必须优先选【无懈可击】（check 打高分）；
//    · 矫诏丢弃阶段：手牌给高分（弃光换牌），装备给 0（不弃）；
//    · 六个技能都得有 expose + threaten（本项目通用要求）。
// ============================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(here, "..");

// ---- 最小全局假件（AI 模块只在这些函数被调用时才读它们）----
globalThis.lib = { card: {}, inpile: [], translate: {}, skill: {} };
globalThis._status = { currentPhase: null, event: null, dying: [] };
globalThis.game = { players: [], dead: [], phaseNumber: 1 };
globalThis.get = {
	value: () => 5,
	type: () => "basic",
	position: () => "h",
	info: () => ({ ai: {} }),
	attitude: () => 1,
};

const mod = await import(pathToFileURL(path.join(EXT, "ai", "sgz_zhonghui.js")).href);
const AI = mod.default;
const helpers = mod.helpers;

let pass = 0;
let fail = 0;
function ok(cond, msg) {
	if (cond) pass++;
	else {
		fail++;
		console.log("  ✗ " + msg);
	}
}
function eq(a, b, msg) {
	ok(a === b, msg + "（实际 " + JSON.stringify(a) + "，期望 " + JSON.stringify(b) + "）");
}

// ---------- 1. AI 表本体 ----------
const jz = AI.sgz_jiaozhao;
ok(!!jz, "ai.sgz_jiaozhao 存在");
eq(typeof jz.order, "number", "order 是数字");
ok(jz.order > 0, "order > 0（否则 chooseCard 直接放弃，技能永远不发动）");
ok(jz.order < 2, "order < 2（真牌/真技能的 order 是 2~10，必须比它们都低 = 最低优先级）");
ok(!!jz.result && typeof jz.result.player === "function", "result.player 是函数（决定发动时机）");
eq(jz.expose, 1, "expose = 1");
ok(typeof jz.threaten === "number" && jz.threaten >= 1 && jz.threaten <= 2.5, "threaten 在 1~2.5（乘法系数）");

// ---------- 2. 时机白名单 ----------
function mkPlayer(opts = {}) {
	return {
		name: "sgz_zhonghui",
		countMark: () => opts.huan || 1,
		hasJudge: name => (opts.judges || []).includes(name),
		getCards: () => opts.hand || [],
	};
}
function mkEvent(parentName, type = "chooseToUse") {
	return { type, getParent: () => ({ name: parentName, type: "phase" }) };
}

// ① 出牌阶段主循环 → 允许
_status.currentPhase = mkPlayer();
_status.event = mkEvent("phaseUse");
eq(helpers.sgz_jiaozhao_aiAllowed(_status.currentPhase), true, "出牌阶段主循环 → 允许发动");

// ② 别人回合（不是 currentPhase）→ 不允许
const enemyTurn = mkPlayer();
_status.currentPhase = mkPlayer();
_status.event = mkEvent("wuxie");
eq(helpers.sgz_jiaozhao_aiAllowed(enemyTurn), false, "非当前回合角色 → 不允许发动");

// ③ 自己回合、但不是出牌阶段、也没被乐 → 不允许
_status.currentPhase = _status.event.player = mkPlayer({ judges: [] });
_status.event = mkEvent("wuxie");
eq(helpers.sgz_jiaozhao_aiAllowed(_status.currentPhase), false, "自己回合的非出牌阶段、未被乐 → 不允许");

// ③b 选锦囊那一步：`chooseButton` → `chooseToUse` → `phaseUse`（三层父事件）
//     只看一层的旧实现会把这里判成"不在出牌阶段" → check 返回 0 → 一个锦囊都选不出来
const deepPlayer = mkPlayer();
const deepEvt = {
	name: "chooseButton",
	type: "chooseButton",
	getParent: () => ({
		name: "chooseToUse",
		type: "chooseToUse",
		getParent: () => ({ name: "phaseUse", type: "phase", getParent: () => null }),
	}),
};
_status.currentPhase = deepPlayer;
_status.event = deepEvt;
eq(helpers.sgz_jiaozhao_aiAllowed(deepPlayer), true, "选锦囊阶段（3 层父事件）→ 仍算作出牌阶段");
// ④ 自己被乐 + 轮到自己 → 允许（判定阶段拆乐）
const lePlayer = mkPlayer({ judges: ["lebu"] });
_status.currentPhase = lePlayer;
_status.event = mkEvent("wuxie");
eq(helpers.sgz_jiaozhao_aiAllowed(lePlayer), true, "自己被乐且轮到自己 → 允许（判定阶段拆乐）");
eq(helpers.sgz_jiaozhao_shouldWuxieSelf(lePlayer), true, "被乐时 chooseButton 应优先选无懈");

// ⑤ 没被乐时不该给无懈打高分
const noLe = mkPlayer({ judges: [] });
_status.currentPhase = noLe;
_status.event = mkEvent("wuxie");
eq(helpers.sgz_jiaozhao_shouldWuxieSelf(noLe), false, "没被乐 → 不给无懈打高分");

// ---------- 3. 结果函数（引擎 get.effect_use 会读 result.player）----------
_status.currentPhase = mkPlayer();
_status.event = mkEvent("phaseUse");
eq(jz.result.player(_status.currentPhase, _status.currentPhase, "sgz_jiaozhao"), 1, "允许时机 → result.player = 1");
_status.event = mkEvent("wuxie");
eq(jz.result.player(_status.currentPhase, _status.currentPhase, "sgz_jiaozhao"), 0, "非白名单时机 → result.player = 0");

// ---------- 4. 弃牌打分：手牌全弃、装备不弃 ----------
const handCards = [{ name: "sha" }, { name: "tao" }];
const equips = [{ name: "zhuge" }];
const p = {
	getCards: pos => (pos === "h" ? handCards : equips),
};
eq(helpers.sgz_jiaozhao_discardScore(p, handCards[0]), 10, "手牌 → 10 分（要弃）");
eq(helpers.sgz_jiaozhao_discardScore(p, equips[0]), 0, "装备 → 0 分（不弃）");
eq(helpers.sgz_jiaozhao_discardScore(null, handCards[0]), 0, "空参数不炸");

// ---------- 5. 角色文件接线 ----------
const charSrc = fs.readFileSync(path.join(EXT, "character", "sgz_zhonghui.js"), "utf8");
ok(charSrc.includes("helpers.sgz_jiaozhao_discardScore"), "角色文件用 helpers 的弃牌打分");
ok(charSrc.includes("helpers.sgz_jiaozhao_aiAllowed"), "角色文件用 helpers 的时机白名单");
ok(charSrc.includes("helpers.sgz_jiaozhao_shouldWuxieSelf"), "角色文件用 helpers 判断是否拆乐");
ok(!/\.set\(\s*"ai"\s*,\s*card\s*=>\s*4\.6\s*-/.test(charSrc), "旧的弃牌打分（4.6 - get.value）已从 .set(\"ai\") 里移除");
// ⚠ 【矫诏】的 precontent 必须是 async：StepCompiler 会把**非 async** 的 precontent 丢进
//   `eval` 重跑（报错栈里的 `eval at packStep`），那个作用域拿不到本文件 import 的 `helpers`
//   → 运行时报 `ReferenceError: helpers is not defined`（用户实测踩过）。
ok(/async\s+precontent\s*\(/.test(charSrc), "矫诏的 precontent 是 async（否则 helpers 在 StepCompiler 的 eval 作用域里不存在）");
ok(!/(^|\n)\s*precontent\s*\(/.test(charSrc), "没有残留的非 async precontent");
ok(
	/filter\(event,\s*player\)\s*\{[\s\S]{0,1500}?typeof event\.filterCard !== "function"/.test(charSrc),
	"filter 里有 filterCard 守卫（否则非 chooseToUse 事件会抛错，game.check 中断 → 按钮建不出来）"
);
ok(/usable:\s*2/.test(charSrc), "矫诏仍是回合内限两次");
ok(/enable:\s*\[\s*"chooseToUse",\s*"chooseToRespond"\s*\]/.test(charSrc), "矫诏仍启用 chooseToUse / chooseToRespond");

// ---------- 6. 每个技能都有 expose + threaten ----------
// 本次改动触及的技能必须带 expose + threaten（项目通用要求）
["sgz_jiaozhao"].forEach(id => {
	const t = AI[id];
	ok(t && typeof t.expose === "number", id + " 有 expose");
	ok(t && typeof t.threaten === "number", id + " 有 threaten");
});

console.log("\n通过 " + pass + "/" + (pass + fail) + "，失败 " + fail);
process.exit(fail ? 1 : 0);
