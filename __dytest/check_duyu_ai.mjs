// ============================================================
//  自检：梦杜预的技能 AI（ai/sgz_duyu.js）
//  跑法：node extension/大梦千秋/__dytest/check_duyu_ai.mjs
//
//  覆盖的需求口径：
//    · 谏国取几张是**随体力变化的连续函数**（不是 1/2/3 三档）
//    · 本次能凑满名录时"取满"（先觉醒回满、后掉血，安全）
//    · 牌名优先级：杀/桃 > 南蛮·万箭 > 乐不思蜀(单独提权) > 无中/顺手/决斗/无懈 > 闪 > 其它延时
//    · 三陈栏位：1级 防具>武器>坐骑；2级·失败 武器>防具>坐骑；2级·成功 防具>武器>坐骑；
//      防具栏 3 栏装满才转武器；"已满且<3"白赚栏位优先
//    · 神武：强度表 + 情境；「赤炎镇魂琴 + 七彩神鹿」配对例外要能压过栏位顺序
//    · 灭吴：杀威胁高的、牌多的；最后一个敌人直接杀
//    · 六个技能都必须有 expose + threaten
// ============================================================
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(here, "..");

// ---- 最小全局假件 ----
globalThis.lib = { card: {}, inpile: [], translate: {}, skill: {} };
globalThis._status = { currentPhase: null, event: null, dying: [] };
globalThis.game = { players: [], dead: [], phaseNumber: 1, log() {}, playAudio() {}, countPlayer: fn => globalThis.game.players.filter(fn).length, filterPlayer: fn => globalThis.game.players.filter(fn), hasPlayer: fn => globalThis.game.players.some(fn) };
const CARD_TYPES = {
    sha: "basic",
    tao: "basic",
    shan: "basic",
    jiu: "basic",
    wuxie: "trick",
    wuzhong: "trick",
    shunshou: "trick",
    juedou: "trick",
    nanman: "trick",
    wanjian: "trick",
    guohe: "trick",
    jiedao: "trick",
    wugu: "trick",
    taoyuan: "trick",
    lebu: "delay",
    bingliang: "delay",
    shandian: "delay",
};
globalThis.get = {
    type: name => CARD_TYPES[(name && name.name) || name] || "trick",
    color: card => (card && card.color) || "black",
    suit: () => "club",
    attitude: (player, target) => (player.attitudes && player.attitudes[target.name] != undefined ? player.attitudes[target.name] : -1),
    threaten: target => (target && target.threaten != undefined ? target.threaten : 5),
    name: card => (card && card.name) || card,
    subtypes: card => (card && card.subtype ? [card.subtype] : []),
    translation: n => String(n),
    info: () => ({}),
    value: () => 5,
    useful: () => 5,
    order: () => 5,
    select: () => [1, 1],
    copy: o => o,
    autoViewAs: c => c,
};
globalThis.ui = { selected: { targets: [] } };
globalThis.window = globalThis;

const AI = (await import(pathToFileURL(path.join(EXT, "ai/sgz_duyu.js")).href));
const { helpers } = AI;
const charMod = (await import(pathToFileURL(path.join(EXT, "character/sgz_duyu.js")).href)).default;

// ---- 假玩家 ----
function mkCard(name, extra = {}) {
    return { name, color: extra.color || "black", suit: extra.suit || "club", type: CARD_TYPES[name] || "trick", ...extra };
}
function mkPlayer(opts = {}) {
    const hand = opts.hand || [];
    const equips = (opts.equips || []).map(name => ({ name, subtype: (opts.subtypes || {})[name] }));
    const p = {
        name: opts.name || "duyu",
        hp: opts.hp != undefined ? opts.hp : 3,
        maxHp: opts.maxHp != undefined ? opts.maxHp : opts.hp != undefined ? opts.hp : 3,
        storage: opts.storage || {},
        marks: opts.marks || {},
        attitudes: opts.attitudes || opts.attitude || {},
        threaten: opts.threaten,
        getHp() {
            return this.hp;
        },
        countCards(area, filter) {
            const pool = area == "h" ? hand : area == "he" ? hand.concat(equips) : area == "e" ? equips : [];
            if (!filter) return pool.length;
            if (typeof filter == "string") return pool.filter(c => c.name == filter).length;
            return pool.filter(filter).length;
        },
        getCards(area, filter) {
            const pool = area == "h" ? hand : area == "he" ? hand.concat(equips) : area == "e" ? equips : area == "hej" ? hand.concat(equips) : [];
            if (!filter) return pool.slice(0);
            if (typeof filter == "string") return pool.filter(c => c.name == filter);
            if (typeof filter == "object") return pool.filter(c => (filter.suit ? c.suit == filter.suit : true));
            return pool.filter(filter);
        },
        countMark(n) {
            return this.marks[n] || 0;
        },
        countEnabledSlot(slot) {
            return (opts.slots && opts.slots[slot]) || 1;
        },
        getVEquips(slot) {
            return equips.filter(e => (opts.subtypes || {})[e.name] === slot || (get.subtypes(e) || []).includes(slot));
        },
        hasSkill() {
            return false;
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

const NAMES10 = ["sha", "tao", "nanman", "wanjian", "lebu", "wuzhong", "shunshou", "juedou", "shan", "guohe"];
// 足够长的候选（避免 hp 高时不小心满足"本次取满＝觉醒"）
const NAMES_LONG = NAMES10.concat(Array.from({ length: 12 }, (v, i) => "junk" + i));

// ---------------------------------------------------------------- 牌名价值
// 通过 jianguoPlan 的取牌顺序验证价值表（hp=9 → 取 8 张）
const topNames = helpers.jianguoPlan(mkPlayer({ hp: 9 }), NAMES_LONG, 10).names;
const idx = n => topNames.indexOf(n);
ok("杀/桃 是最高档（前两张）", topNames[0] === "sha" && topNames[1] === "tao", topNames.join(","));
ok("南蛮/万箭 高于 无中/顺手", idx("nanman") >= 0 && idx("nanman") < idx("wuzhong") && idx("wanjian") < idx("wuzhong"));
ok("乐不思蜀 单独提权（高于无中/顺手）", idx("lebu") >= 0 && idx("lebu") < idx("wuzhong") && idx("lebu") < idx("shunshou"));
ok("闪/兵粮 排在后面（没进前 8）", idx("shan") < 0 && idx("bingliang") < 0, topNames.join(","));

// ---------------------------------------------------------------- 谏国：X 随体力变化
const planOf = (hp, listLen, maxPick) => helpers.jianguoPlan(mkPlayer({ hp }), listLen && listLen > 10 ? NAMES_LONG.slice(0, listLen) : NAMES10.slice(0, Math.min(listLen || 10, 10)), maxPick != undefined ? maxPick : hp + 1);
const expectX = [[3, 2], [4, 3], [5, 4], [6, 5], [7, 6], [8, 7], [10, 9]];
for (const [hp, want] of expectX) {
    const plan = planOf(hp, NAMES_LONG.length);
    ok(`谏国 hp=${hp} → 取 ${want} 种（连续函数，非固定 1/2/3）`, plan.count === want, plan.count);
}
ok("谏国 绝不把自己打进濒死（hp=1 → 只取 1 种）", planOf(1, 12).count === 1, planOf(1, 12).count);
ok("谏国 hp=2 → 取 2 种（扣完留 1 血，仍优于 1 种）", planOf(2, 12).count === 2, planOf(2, 12).count);

// 能觉醒时取满（先回满再掉血）
const awakenPlan = helpers.jianguoPlan(mkPlayer({ hp: 4, maxHp: 4 }), ["sha", "tao", "nanman", "wanjian", "lebu"], 5);
ok("谏国 差 5 张觉醒而只有 4 血 → 取满 5 张（觉醒先回满，掉血在后）", awakenPlan.count === 5 && awakenPlan.awaken === true, JSON.stringify(awakenPlan.count));
ok("谏国 取满时拿的是价值最高的 5 个（含杀/桃）", awakenPlan.names.includes("sha") && awakenPlan.names.includes("tao"));

// 取牌顺序
const pickPlan = planOf(6, 12);
ok("谏国 取牌按价值排序（第一个是杀或桃）", ["sha", "tao"].includes(pickPlan.names[0]), pickPlan.names[0]);

// 选牌打分
ok("谏国 选牌：tops 里的给正分，不在 tops 的给负分", helpers.jianguoPickScore("sha", ["sha"]) > 0 && helpers.jianguoPickScore("shan", ["sha"]) < 0);
ok("谏国：只能取 1 种时不发动（拿 1 张换掉摸 2 张，不涨上限）", helpers.jianguoShouldUse(mkPlayer({ hp: 1 }), NAMES_LONG, 2) === false);
ok("谏国：能取 2 种及以上时发动", helpers.jianguoShouldUse(mkPlayer({ hp: 3 }), NAMES_LONG, 4) === true);

// ---------------------------------------------------------------- 三陈：选栏位
const availOf = (list) => list.map(([slot, name, full, cand]) => ({ slot, name, full: full, candidates: cand || ["x"] }));
const slotMap = { equip1: "武器", equip2: "防具", equip3: "防御坐骑", equip4: "进攻坐骑" };
// 1 级：防具 > 武器（都未满、都没装东西时，按顺序仍选防具）
ok(
    "三陈1级：防具优先于武器",
    helpers.sanchenSlotChoice(availOf([["equip1", "武器", false], ["equip2", "防具", false]]), { equip1: ["a"], equip2: ["b"] }, mkPlayer({ hp: 3 }), false, false) === "防具"
);
ok(
    "三陈1级：防具栏已满（且<3 栏）仍选防具（白赚栏位）",
    helpers.sanchenSlotChoice(availOf([["equip1", "武器", false], ["equip2", "防具", true]]), { equip1: ["a"], equip2: ["b"] }, mkPlayer({ hp: 3, slots: { equip2: 2 } }), false, false) === "防具"
);
ok(
    "三陈1级：防具 3 栏装满才转武器",
    helpers.sanchenSlotChoice(availOf([["equip1", "武器", false], ["equip2", "防具", true]]), { equip1: ["a"], equip2: ["b"] }, mkPlayer({ hp: 3, slots: { equip2: 3 } }), false, false) === "武器"
);
ok(
    "三陈2级·失败分支：武器优先于防具",
    helpers.sanchenSlotChoice(availOf([["equip1", "武器", false], ["equip2", "防具", false]]), { equip1: ["a"], equip2: ["b"] }, mkPlayer({ hp: 3 }), true, true) === "武器"
);
ok(
    "三陈2级·成功分支：防具优先于武器",
    helpers.sanchenSlotChoice(availOf([["equip1", "武器", false], ["equip2", "防具", false]]), { equip1: ["a"], equip2: ["b"] }, mkPlayer({ hp: 3 }), true, false) === "防具"
);

// ---------------------------------------------------------------- 三陈：选神武（含琴/鹿配对例外）
const qin = "duyusw_chiyanzhenhunqin";
const lu = "duyusw_qicaishenlu";
const bagua = "duyusw_qimenbagua";
const futou = "duyusw_xingtianpojunfu";
const allFlat = [qin, lu, bagua, futou];
const sc = (name, player, flat) => helpers.sanchenShenwuScore({ link: ["", "", name] }, player, flat);
const playerWithQin = mkPlayer({ hp: 4, equips: [qin], subtypes: { [qin]: "equip1" } });
const playerPlain = mkPlayer({ hp: 4, marks: { sgz_chenling: 3 } });
const playerWithLu = mkPlayer({ hp: 4, equips: [lu], subtypes: { [lu]: "equip4" } });
const playerPairAvailable = mkPlayer({ hp: 4, marks: { sgz_chenling: 6 } });

ok("神武：已有镇魂琴 → 七彩神鹿压过奇门八卦（配对例外越过栏位顺序）", sc(lu, playerWithQin, allFlat) > sc(bagua, playerWithQin, allFlat), `${sc(lu, playerWithQin, allFlat).toFixed(1)} vs ${sc(bagua, playerWithQin, allFlat).toFixed(1)}`);
ok("神武：已有镇魂琴 → 七彩神鹿压过刑天破军斧", sc(lu, playerWithQin, allFlat) > sc(futou, playerWithQin, allFlat));
ok("神武：已有七彩神鹿 → 镇魂琴压过刑天破军斧", sc(qin, playerWithLu, allFlat) > sc(futou, playerWithLu, allFlat));
ok("神武：两件都没有、陈令只够一次 → 神鹿不抢防具第一", sc(lu, playerPlain, [lu]) < sc(bagua, playerPlain, [bagua]), `${sc(lu, playerPlain, [lu]).toFixed(1)} vs ${sc(bagua, playerPlain, [bagua]).toFixed(1)}`);
ok("神武：两件都没拥有但都能拿、陈令>=6 → 神鹿拿到「组合潜力」加成", sc(lu, playerPairAvailable, allFlat) > sc(lu, playerPlain, [lu]));
const armorA = mkPlayer({ hp: 4, slots: { equip2: 1 }, equips: [bagua], subtypes: { [bagua]: "equip2" } }); // 1 栏 1 装 → 白赚栏位
const armorB = mkPlayer({ hp: 4, slots: { equip2: 3 }, equips: [bagua, "junkA", "junkB"], subtypes: { [bagua]: "equip2", junkA: "equip2", junkB: "equip2" } }); // 3 栏 3 装 → 到顶
ok("神武：3 栏装满后不再有补栏加成（1 栏满 > 3 栏满）", sc(bagua, armorA, [bagua]) > sc(bagua, armorB, [bagua]), `${sc(bagua, armorA, [bagua]).toFixed(1)} vs ${sc(bagua, armorB, [bagua]).toFixed(1)}`);
function gongfu(name) {
    return { name, subtype: "equip2" };
}

// ---------------------------------------------------------------- 灭吴
const enemyStrong = mkPlayer({ name: "e1", hp: 4, hand: [mkCard("sha"), mkCard("tao")], threaten: 12, attitudes: {} });
const enemyWeak = mkPlayer({ name: "e2", hp: 3, hand: [], threaten: 3 });
const me = mkPlayer({ name: "me", hp: 3, attitudes: { e1: -1, e2: -1 } });
const miewuScore = (p, t) => charMod.skills.sgz_miewu.ai.result.target(p, t);
globalThis.game.players = [me, enemyStrong, enemyWeak];
ok("灭吴：优先杀威胁高、牌多的敌人", miewuScore(me, enemyStrong) < miewuScore(me, enemyWeak));
const ally = mkPlayer({ name: "ally" });
me.attitudes.ally = 1;
ok("灭吴：不杀友方", miewuScore(me, ally) === 0, miewuScore(me, ally));
const soloEnemy = mkPlayer({ name: "solo", hp: 4, threaten: 2 });
globalThis.game.players = [me, soloEnemy];
ok("灭吴：只剩一个敌人时给极高优先（直接赢）", miewuScore(me, soloEnemy) <= -900);
globalThis.game.players = [me, enemyStrong, enemyWeak];

// ---------------------------------------------------------------- 六个技能都要有 expose + threaten
const IDS = ["sgz_wuku", "sgz_jianguo", "sgz_pozhu", "sgz_sanchen", "sgz_qingshi", "sgz_miewu"];
for (const id of IDS) {
    const ai = charMod.skills[id] && charMod.skills[id].ai;
    ok(`【${id}】有 ai 且带 expose`, !!ai && ai.expose != undefined);
    ok(`【${id}】ai 带 threaten`, !!ai && typeof ai.threaten == "number" && ai.threaten > 0);
}
ok("threaten 用乘法口径（都应 ≤ 3）", IDS.every(id => charMod.skills[id].ai.threaten <= 3), IDS.map(id => `${id}=${charMod.skills[id].ai.threaten}`).join(","));

// ---- 输出 ----
for (const c of checks) if (!c.cond) console.log("  [FAIL] " + c.name + (c.extra !== undefined ? "   → 实际：" + JSON.stringify(c.extra) : ""));
console.log(`\n通过 ${pass}/${checks.length}，失败 ${checks.length - pass}`);
process.exit(checks.length - pass ? 1 : 0);
