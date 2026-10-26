// ============================================================
//  自检：梦文鸯的技能 AI（ai/sgz_wenyang.js）
//  跑法：node extension/大梦千秋/__dytest/check_wenyang_ai.mjs
//
//  需求口径（定稿，越简单越好）：
//    · 惊跃：蓄力上限 ≤2 **不用**；其余时刻始终用、用满、出牌阶段最高优先级（无刹车）
//    · 选牌：只按"越不值钱越先烧"，**没有任何牌被排除**
//    · 颜色顺序：自己出牌阶段 先黑（雷杀无次数限制）→ 红；只剩最后一次 → 红；回合外 → 先红
//    · 霆踪：强制处决，只决策"处决谁"
//    · 仇决：拿到标记后照常，不影响任何决策
// ============================================================
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(here, "..");

globalThis.lib = { card: {}, inpile: [], translate: {}, skill: {} };
globalThis._status = { currentPhase: null, event: null, dying: [] };
globalThis.game = { players: [], dead: [], phaseNumber: 1, log() {}, playAudio() {}, countPlayer: fn => globalThis.game.players.filter(fn).length, filterPlayer: fn => globalThis.game.players.filter(fn), hasPlayer: fn => globalThis.game.players.some(fn) };
globalThis.get = {
    color: card => (card && card.color) || "black",
    value: card => (card && card.value != undefined ? card.value : 5),
    name: card => (card && card.name) || card,
    attitude: (player, target) => (player.attitudes && player.attitudes[target.name] != undefined ? player.attitudes[target.name] : -1),
    threaten: target => (target && target.threaten != undefined ? target.threaten : 5),
    type: () => "basic",
    translation: n => String(n),
    info: () => ({}),
    subtypes: () => [],
    select: () => [1, 1],
    copy: o => o,
    autoViewAs: c => c,
};
globalThis.ui = { selected: { targets: [] } };
globalThis.window = globalThis;

const { helpers, default: AI } = await import(pathToFileURL(path.join(EXT, "ai/sgz_wenyang.js")).href);
const charMod = (await import(pathToFileURL(path.join(EXT, "character/sgz_wenyang.js")).href)).default;

function mkCard(name, color, value) {
    return { name, color, value: value != undefined ? value : 5 };
}
function mkPlayer(opts = {}) {
    const hand = opts.hand || [];
    const p = {
        name: opts.name || "wenyang",
        hp: opts.hp != undefined ? opts.hp : 6,
        maxHp: opts.maxHp != undefined ? opts.maxHp : 7,
        attitudes: opts.attitudes || {},
        threaten: opts.threaten,
        marks: opts.marks || {},
        hujia: opts.hujia || 0,
        actionHistory: new Array(opts.turns != undefined ? opts.turns + 1 : 4).fill({}),
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
        hasSkill() {
            return false;
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

/** turns = 已经开始的回合数（决定蓄力上限 min(7, turns)） */
function setup(player, turns) {
    player.actionHistory = new Array(turns + 1).fill({});
    globalThis.game.players = [player];
    globalThis._status.event = { player };
    return player;
}

// ---------------------------------------------------------------- 用不用：上限 ≤2 不用
const jingyueOrder = AI.sgz_jingyue.order;
const jingyuePlayer = mkPlayer({ hand: [mkCard("sha", "black", 3), mkCard("sha", "black", 4), mkCard("shan", "red", 2), mkCard("tao", "red", 9)] });

ok("蓄力上限 1（第 1 回合）→ 也用惊跃（已取消上限限制）", (setup(jingyuePlayer, 1), jingyueOrder(null, jingyuePlayer)) === 20);
ok("蓄力上限 2 → 也用惊跃", (setup(jingyuePlayer, 2), jingyueOrder(null, jingyuePlayer)) === 20);
ok("蓄力上限 3 → 用，且是最高优先级（order 20）", (setup(jingyuePlayer, 3), jingyueOrder(null, jingyuePlayer)) === 20, jingyueOrder(null, jingyuePlayer));
ok("蓄力上限 7 → 仍然最高优先级", (setup(jingyuePlayer, 7), jingyueOrder(null, jingyuePlayer)) === 20);
ok("只有 1 张彩色牌、上限 7 → 也会用（不再要求用满）", (() => { const p = mkPlayer({ hand: [mkCard("shan", "red", 2)] }); setup(p, 7); return jingyueOrder(null, p) === 20; })());
ok("没有彩色手牌时不用", (setup(mkPlayer({ hand: [] }), 7), jingyueOrder(null, mkPlayer({ hand: [] }))) === 0);
ok("result.player 与「用不用」一致（上限 2 也是正分）", AI.sgz_jingyue.result.player(setup(jingyuePlayer, 7)) > 0 && AI.sgz_jingyue.result.player(setup(jingyuePlayer, 2)) > 0);

// ---------------------------------------------------------------- 选牌：越便宜越先烧，没有豁免
const check = helpers.sgz_jingyue_check;
setup(jingyuePlayer, 5);
const cheapBlack = mkCard("sha", "black", 2);
const expensiveBlack = mkCard("sha", "black", 12);
const taoRed = mkCard("tao", "red", 20);
ok("低价值牌 优先于 高价值牌（同色）", check(cheapBlack) > check(expensiveBlack));
ok("桃也能转化为惊跃（不会被排除，只是排在后面）", check(taoRed) > 0, check(taoRed));
globalThis._status.currentPhase = jingyuePlayer;
ok("自己出牌阶段：黑牌优先于红牌", check(cheapBlack) > check(mkCard("shan", "red", 2)));
ok("回合外：红牌优先于黑牌", (() => { setup(jingyuePlayer, 5); globalThis._status.currentPhase = mkPlayer({ name: "other" }); return check(mkCard("shan", "red", 2)) > check(cheapBlack); })());
ok("只剩最后一次惊跃机会：红牌优先（首张火杀不可响应）", (() => {
    const p = mkPlayer({ hand: [mkCard("sha", "black", 2), mkCard("shan", "red", 2)], marks: { sgz_tingzong: 6 } });
    setup(p, 7);
    globalThis._status.currentPhase = p;
    return check(mkCard("shan", "red", 2)) > check(mkCard("sha", "black", 2));
})());

// ---------------------------------------------------------------- 处决选人（2026 随霆踪③一起删除）
//  霆踪不再有「满7处决」，所以 ai 里的 sgz_tingzong_kill_target 也已删除；这里只确认它确实不在了。
ok("处决选人 AI 已随霆踪③删除（helpers 里没有该条目）", helpers.sgz_tingzong_kill_target === undefined);

// ---------------------------------------------------------------- 三个技能都要有 expose + threaten
for (const id of ["sgz_jingyue", "sgz_tingzong", "sgz_choujue"]) {
    const ai = charMod.skills[id] && charMod.skills[id].ai;
    ok(`【${id}】有 expose`, !!ai && ai.expose != undefined);
    ok(`【${id}】threaten 是 1~2 的乘法口径`, !!ai && typeof ai.threaten == "number" && ai.threaten > 1 && ai.threaten <= 2, ai && ai.threaten);
}

// ---- 输出 ----
for (const c of checks) if (!c.cond) console.log("  [FAIL] " + c.name + (c.extra !== undefined ? "   → 实际：" + JSON.stringify(c.extra) : ""));
console.log(`\n通过 ${pass}/${checks.length}，失败 ${checks.length - pass}`);
process.exit(checks.length - pass ? 1 : 0);
