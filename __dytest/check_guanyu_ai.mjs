// ============================================================
//  自检：梦关羽的技能 AI（ai/sgz_guanyu.js）
//  跑法：node extension/大梦千秋/__dytest/check_guanyu_ai.mjs
//
//  覆盖的需求口径：
//    · 红杀（武神）必须先于黑杀（武魂）：ai.order + mod.aiOrder 两处都要满足
//    · 梦刃选项权重：③ 殇敌（处决）> ① 武神 > ② 武魂 > ④ 回天
//    · "最后一点上限"时只允许 ③ 换真正的击杀（①/②/④ 全部重罚）
//    · 代价优先用"索命"，没有才永久减上限
//    · ③ 选人：威胁高/血厚的优先，残血杂鱼靠后，最后一个敌人拉满
//    · ④ 选人：只救队友
// ============================================================
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(here, "..");

globalThis.lib = { card: {}, inpile: [], translate: {}, skill: {} };
globalThis._status = { currentPhase: null, event: null, dying: [] };
globalThis.game = { players: [], dead: [], phaseNumber: 1, log() {}, playAudio() {}, countPlayer: fn => globalThis.game.players.filter(fn).length, filterPlayer: fn => globalThis.game.players.filter(fn), hasPlayer: fn => globalThis.game.players.some(fn) };
const CARD_TYPES = { sha: "basic", tao: "basic", shan: "basic", wuzhong: "trick", lebu: "delay" };
globalThis.get = {
    type: name => CARD_TYPES[(name && name.name) || name] || "trick",
    color: card => (card && card.color) || "black",
    name: card => (card && card.name) || card,
    value: card => (card && card.value != undefined ? card.value : 5),
    usefulness: () => 5,
    attitude: (player, target) => (player.attitudes && player.attitudes[target.name] != undefined ? player.attitudes[target.name] : -1),
    threaten: target => (target && target.threaten != undefined ? target.threaten : 5),
    translation: n => String(n),
    info: () => ({}),
    subtypes: () => [],
    select: () => [1, 1],
    copy: o => o,
    autoViewAs: c => c,
};
globalThis.ui = { selected: { targets: [] } };
globalThis.window = globalThis;

const { helpers, default: AI } = await import(pathToFileURL(path.join(EXT, "ai/sgz_guanyu.js")).href);
const charMod = (await import(pathToFileURL(path.join(EXT, "character/sgz_guanyu.js")).href)).default;

function mkCard(name, color, value) {
    return { name, color, value: value != undefined ? value : 5 };
}
function mkPlayer(opts = {}) {
    const hand = opts.hand || [];
    const skills = new Set(opts.skills || []);
    const p = {
        name: opts.name || "guanyu",
        hp: opts.hp != undefined ? opts.hp : 4,
        maxHp: opts.maxHp != undefined ? opts.maxHp : 4,
        attitudes: opts.attitudes || {},
        threaten: opts.threaten,
        marks: opts.marks || {},
        getHp() {
            return this.hp;
        },
        countCards(area, filter) {
            const pool = area == "h" ? hand : area == "he" ? hand : [];
            if (!filter) return pool.length;
            if (typeof filter == "string") return pool.filter(c => c.name == filter).length;
            return pool.filter(filter).length;
        },
        getCards(area, filter) {
            const pool = area == "h" ? hand : area == "he" ? hand : [];
            if (!filter) return pool.slice(0);
            if (typeof filter == "string") return pool.filter(c => c.name == filter);
            return pool.filter(filter);
        },
        countMark(n) {
            return this.marks[n] || 0;
        },
        hasSkill(n) {
            return skills.has(n);
        },
        isDamaged() {
            return this.hp < this.maxHp;
        },
    };
    return p;
}

let pass = 0;
const checks = [];
function ok(name, cond, extra) {
    checks.push({ name, cond: !!cond, extra });
    if (cond) pass++;
}

const bigEnemy = mkPlayer({ name: "e1", hp: 4, maxHp: 4, threaten: 10 });
const smallEnemy = mkPlayer({ name: "e2", hp: 1, maxHp: 3, threaten: 2 });
const ally = mkPlayer({ name: "a1", hp: 1, maxHp: 4 });
const me = mkPlayer({ name: "guan", hp: 4, maxHp: 4, hand: [mkCard("sha", "black"), mkCard("sha", "black"), mkCard("shan", "red")], attitudes: { e1: -1, e2: -1, a1: 1 } });
globalThis.game.players = [me, bigEnemy, smallEnemy, ally];

// ---------------------------------------------------------------- 红先黑后
ok("武神(红) 的 order 高于 武魂(黑)", AI.sgz_wushen.order > AI.sgz_wuhun.order, `${AI.sgz_wushen.order} vs ${AI.sgz_wuhun.order}`);
const wushenMod = charMod.skills.sgz_wushen.mod;
const wuhunMod = charMod.skills.sgz_wuhun.mod;
ok("武神·改 有 mod.aiOrder 且红【杀】+3", typeof wushenMod.aiOrder == "function" && wushenMod.aiOrder(me, mkCard("sha", "red"), 5) === 8);
ok("武魂·改 有 mod.aiOrder 且黑【杀】只 +0.5", typeof wuhunMod.aiOrder == "function" && wuhunMod.aiOrder(me, mkCard("sha", "black"), 5) === 5.5);
const linShen = charMod.skills.sgz_wushen_lin.mod;
const linHun = charMod.skills.sgz_wuhun_lin.mod;
ok("武神·临（被接管角色）也把红杀提前", linShen.aiOrder(me, mkCard("sha", "red"), 5) === 8);
ok("武魂·临（被接管角色）黑杀排在红杀之后", linHun.aiOrder(me, mkCard("sha", "black"), 5) === 5.5);
globalThis._status.event = { player: me };
// 性质区分：改版=非锁定（无 cardname，需主动发动）；临版=锁定（cardname 自动转化）
ok("武神·改 是**非锁定**：没有 mod.cardname（不会把手牌自动变成杀）", typeof wushenMod.cardname != "function");
ok("武魂·改 是**非锁定**：没有 mod.cardname", typeof wuhunMod.cardname != "function");
ok("武神·临 是**锁定**：mod.cardname 把红牌视为杀", typeof linShen.cardname == "function" && linShen.cardname(mkCard("shan", "red"), me) === "sha");
ok("武魂·临 是**锁定**：mod.cardname 把黑牌视为杀", typeof linHun.cardname == "function" && linHun.cardname(mkCard("shan", "black"), me) === "sha");
ok("武神·改 的红牌本体不会被 cardname 改写（仍是 闪）", (wushenMod.cardname ? wushenMod.cardname(mkCard("shan", "red"), me) : undefined) === undefined);
ok("手里还有红牌时，武魂的 check 会降权（不抢红杀）", helpers.sgz_wuhun_check(mkCard("sha", "black", 5)) < helpers.sgz_wushen_check(mkCard("sha", "red", 5)), `${helpers.sgz_wuhun_check(mkCard("sha", "black", 5))} vs ${helpers.sgz_wushen_check(mkCard("sha", "red", 5))}`);
globalThis._status.event = null;

// ---------------------------------------------------------------- 梦刃：选项权重
const score = (key, player) => helpers.mengrenOptionScore({ link: key }, player);
const owner = mkPlayer({ name: "guan", hp: 4, maxHp: 4, hand: [mkCard("sha", "black"), mkCard("sha", "black"), mkCard("shan", "red")], attitudes: { e1: -1, e2: -1, a1: 1 } });
globalThis.game.players = [owner, bigEnemy, smallEnemy, ally];
ok("梦刃：③ 处决 的权重最高", score("loseall", owner) > score("wushen", owner) && score("loseall", owner) > score("wuhun", owner) && score("loseall", owner) > score("healall", owner), `${score("loseall", owner).toFixed(0)} / ${score("wushen", owner).toFixed(0)} / ${score("wuhun", owner).toFixed(0)} / ${score("healall", owner).toFixed(0)}`);
ok("梦刃：① 武神 高于 ② 武魂（红牌更多时）", score("wushen", owner) > score("wuhun", owner));
ok("梦刃：已经拥有武神时该项分数最低（仍可选，但排在最后）", score("wushen", mkPlayer({ name: "x", skills: ["sgz_wushen"], attitudes: { e1: -1 } })) < score("loseall", mkPlayer({ name: "x", skills: ["sgz_wushen"], attitudes: { e1: -1 } })));
ok("梦刃：④ 回天 只在友方残血时有正收益", score("healall", owner) > 0);

// 最后一点上限：只允许 ③ 换真击杀
const lastUse = mkPlayer({ name: "guan", hp: 2, maxHp: 2, hand: [mkCard("sha", "black")], attitudes: { e1: -1, e2: -1, a1: 1 }, marks: {} });
globalThis.game.players = [lastUse, bigEnemy, smallEnemy, ally];
ok("梦刃：最后一点上限时 ①/②/④ 分数都低于 ③（但都仍为正分，保证不会点取消）", score("wushen", lastUse) < score("loseall", lastUse) && score("wuhun", lastUse) < score("loseall", lastUse) && score("healall", lastUse) < score("loseall", lastUse) && score("healall", lastUse) > 0, `${score("loseall", lastUse)} / ${score("wushen", lastUse)} / ${score("healall", lastUse)}`);
ok("梦刃：最后一点上限仍可 ③ 处决高价值目标", score("loseall", lastUse) > 0, score("loseall", lastUse));
// 只剩一个低价值敌人时不允许
const lastUseWeak = mkPlayer({ name: "guan", hp: 2, maxHp: 2, attitudes: { weak: -1, e1: -1 }, marks: {} });
const weakEnemy = mkPlayer({ name: "weak", hp: 1, maxHp: 1, threaten: 1 });
globalThis.game.players = [lastUseWeak, weakEnemy, bigEnemy];
ok("梦刃：最后一点上限 + 场上有更好的目标时，③ 不会选残血杂鱼", helpers.mengrenLoseAllTarget(lastUseWeak, weakEnemy) < helpers.mengrenLoseAllTarget(lastUseWeak, bigEnemy), `${helpers.mengrenLoseAllTarget(lastUseWeak, weakEnemy)} vs ${helpers.mengrenLoseAllTarget(lastUseWeak, bigEnemy)}`);

// 值不值得发动
globalThis.game.players = [owner, bigEnemy, smallEnemy, ally];
const worth = charMod.skills.sgz_mengren.ai.result.player;
ok("梦刃 result.player：有好选项时为正", worth(owner) > 0);
const noGain = mkPlayer({ name: "y", hp: 1, maxHp: 1, skills: ["sgz_wushen", "sgz_wuhun"], attitudes: {} });
const savedPlayers = globalThis.game.players;
globalThis.game.players = [noGain];
ok("梦刃 result.player：没有任何可行收益时为 0（上限 1、两技能都有、无敌人）", worth(noGain) === 0);
globalThis.game.players = savedPlayers;

// 代价
ok("梦刃 代价：有索命时优先用索命", helpers.mengrenCost(mkPlayer({ marks: { sgz_suoming: 2 } })) === "移除一枚索命");
ok("梦刃 代价：没有索命时减上限", helpers.mengrenCost(mkPlayer({ marks: {} })) === "减少一点体力上限");

// ---------------------------------------------------------------- ③ / ④ 选人
globalThis.game.players = [owner, bigEnemy, smallEnemy, ally];
ok("③ 殇敌：优先杀威胁高/血厚的", helpers.mengrenLoseAllTarget(owner, bigEnemy) > helpers.mengrenLoseAllTarget(owner, smallEnemy), `${helpers.mengrenLoseAllTarget(owner, bigEnemy).toFixed(0)} vs ${helpers.mengrenLoseAllTarget(owner, smallEnemy).toFixed(0)}`);
ok("③ 殇敌：不选友方", helpers.mengrenLoseAllTarget(owner, ally) < 0);
globalThis.game.players = [owner, bigEnemy];
ok("③ 殇敌：只剩一个敌人时拉满（杀完就赢）", helpers.mengrenLoseAllTarget(owner, bigEnemy) > 60);
globalThis.game.players = [owner, bigEnemy, smallEnemy, ally];
ok("④ 回天：只救队友（敌方为负）", helpers.mengrenHealAllTarget(owner, ally) > 0 && helpers.mengrenHealAllTarget(owner, bigEnemy) < 0);

// ---------------------------------------------------------------- 六个技能都要有 expose + threaten
const IDS = ["sgz_hunshang", "sgz_mengren", "sgz_wushen", "sgz_wuhun", "sgz_wushen_lin", "sgz_wuhun_lin"];
for (const id of IDS) {
    const ai = charMod.skills[id] && charMod.skills[id].ai;
    ok(`【${id}】有 expose`, !!ai && ai.expose != undefined);
    ok(`【${id}】threaten 是 1~2 的乘法口径`, !!ai && typeof ai.threaten == "number" && ai.threaten > 1 && ai.threaten <= 2, ai && ai.threaten);
}

// ---- 输出 ----
for (const c of checks) if (!c.cond) console.log("  [FAIL] " + c.name + (c.extra !== undefined ? "   → 实际：" + JSON.stringify(c.extra) : ""));
console.log(`\n通过 ${pass}/${checks.length}，失败 ${checks.length - pass}`);
process.exit(checks.length - pass ? 1 : 0);
