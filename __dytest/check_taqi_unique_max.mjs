// ============================================================
//  自检：梦孙寒华【踏寂】①「使用」分支
//  跑法：node extension/大梦千秋/__dytest/check_taqi_unique_max.mjs
//
//  需求原文（最终版）：使用：场上有手牌且手牌数唯一最少的一名其他角色随机弃置一张牌。
//  修改说明：由"唯一最多者"改为"唯一最少者"，且**无手牌者不计入内**。
//
//  这段逻辑全是"比大小 + 并列判定 + 剔除空手"，肉眼很容易把 `<` 写成 `<=`、
//  忘记剔除 0 手牌的人、或者在并列时"随机挑一个"（正是需求要排除的情况）
//  —— 所以用假玩家把真 content 跑一遍：
//    · 有手牌者中最少且唯一 → 必须且只能对那一个人调 randomDiscard
//    · 并列最少 → 一个人都不能动
//    · 空手的人不参与比较（不能因为他 0 张就被选中）
//    · 孙寒华自己手牌最少也不算（判定集不含自己）
//
//  ⚠ 假玩家只要实现 content 真正用到的那几个方法即可，但**方法名必须和引擎一致**：
//    countCards / countDiscardableCards / randomDiscard / line。
// ============================================================

// ---------------------------------------------------------------- 最小全局假件
globalThis.window = {};
globalThis.document = undefined;
globalThis.setInterval = () => 0;
globalThis.lib = { assetURL: "", inpile: [], card: {} };
globalThis.get = { translation: n => n, type: () => "basic" };
globalThis.game = {
    players: [],
    dead: [],
    // 真引擎：game.filterPlayer(func) 遍历**存活**角色
    filterPlayer(func) {
        return this.players.filter(p => !func || func(p));
    },
    log() {},
};

const EXT = new URL("../", import.meta.url);
const chr = (await import(new URL("character/sgz_sunhanhua.js", EXT).href)).default;
const taqi = chr.skills.sgz_taqi;

let pass = 0;
const checks = [];
function ok(name, cond, extra) {
    checks.push({ name, cond: !!cond, extra });
    if (cond) pass++;
}

// ---------------------------------------------------------------- 假玩家
let idSeq = 0;
/// hand = 手牌数；discardable = 可弃置牌数（默认跟手牌数一样，另加装备时可单独给）
function mkPlayer(name, hand, discardable) {
    const n = discardable === undefined ? hand : discardable;
    return {
        id: ++idSeq,
        name,
        countCards() {
            return hand;
        },
        countDiscardableCards() {
            return n;
        },
        discarded: [],
        randomDiscard(...args) {
            this.discarded.push(args);
            return { type: "discard" };
        },
        line() {},
    };
}
/// 跑一次「使用」分支；返回"被随机弃牌的人"的名字数组
async function runUse(actor, others) {
    game.players = [actor].concat(others);
    const trigger = {
        name: "lose",
        getParent: () => ({ name: "useCard" }),
    };
    for (const p of others) p.discarded = [];
    actor.discarded = [];
    await taqi.content({}, trigger, actor);
    return others.filter(p => p.discarded.length).map(p => p.name);
}

// ---------------------------------------------------------------- 1. 结构
ok("踏寂是锁定技式自动结算（forced，无询问）", taqi.forced === true);
ok("①的分支挂在 content 里（不是 chooseTarget）", /name === "useCard"/.test(String(taqi.content)) && !/chooseTarget/.test(String(taqi.content)));
ok("①用的是引擎的 randomDiscard（随机弃置）", /randomDiscard\("he"\)/.test(String(taqi.content)));
ok("①判定的是 countCards(\"h\")（手牌数）", /countCards\("h"\)/.test(String(taqi.content)));
ok("①只统计其他角色（排除自己）", /filterPlayer\(t => t !== player\)|filterPlayer\(function \(t\) \{\s*return t !== player/.test(String(taqi.content)));
ok("①取的是**最少**（n < min）而不是最多", /if \(n < min\)/.test(String(taqi.content)) && !/if \(n > max\)/.test(String(taqi.content)));
ok("①把无手牌者剔出比较（n <= 0 时 continue）", /if \(n <= 0\) continue/.test(String(taqi.content)));
ok("并列最少时直接返回（不会从并列者里随机挑）", /bottoms\.length !== 1\)\s*return/.test(String(taqi.content)));
ok("没有任何人有手牌时同样直接返回", /bottoms\.length !== 1\)\s*return/.test(String(taqi.content)));
ok("无可弃之牌时不产生空的弃牌事件", /countDiscardableCards\(target, "he"\)\)\s*return/.test(String(taqi.content)));
ok("②打出仍然是回复体力（没被改坏）", /name === "respond"/.test(String(taqi.content)) && /await player\.recover\(\)/.test(String(taqi.content)));
ok("③是**兜底分支**（else，而不是 else if name === \"discard\"）", /\}\s*else\s*\{\s*\/\/ ---- 其他/.test(String(taqi.content)) && !/\}\s*else if \(name === "discard"\)/.test(String(taqi.content)));
ok("③其他：加伤害标记（addSkill + addMark 都还在）", /addSkill\("sgz_taqi_damage"\)/.test(String(taqi.content)) && /addMark\("sgz_taqi_damage", 1/.test(String(taqi.content)));

// ---------------------------------------------------------------- 1b. 触发范围：手牌 + 装备区
//  需求反馈的 bug：只写 `evt.hs` ⇒ 失去装备区的牌完全不触发，和描述"当你失去牌后"不符。
{
    function mkLoseEvent(map) {
        return { getl: () => Object.assign({ hs: [], es: [], js: [], ss: [], xs: [] }, map) };
    }
    const me = mkPlayer("梦孙寒华", 1);
    const card = { name: "sha" };
    ok("filter：失去手牌 → 触发", taqi.filter(mkLoseEvent({ hs: [card] }), me) === true);
    ok("filter：失去装备区的牌 → **也要触发**（本次 bug 的修复点）", taqi.filter(mkLoseEvent({ es: [card] }), me) === true);
    ok("filter：手牌+装备同时失去 → 触发", taqi.filter(mkLoseEvent({ hs: [card], es: [card] }), me) === true);
    ok("filter：什么都没失去 → 不触发", taqi.filter(mkLoseEvent({}), me) === false);
    ok("filter：getl 拿不到（getlx:false 的假表 / 别的玩家）→ 不触发且不报错", taqi.filter({ getl: () => undefined }, me) === false);
    ok("filter：和引擎口径一致 —— 用 cards2 的集合（hs+es），判定区 js 不算", !/evt\.js/.test(String(taqi.filter)) && /evt\.hs/.test(String(taqi.filter)) && /evt\.es/.test(String(taqi.filter)));
    ok("trigger 仍然挂着那几个「只在这里才收得到装备失去」的全局时机", ["equipAfter", "gainAfter", "loseAsyncAfter", "addJudgeAfter", "addToExpansionAfter"].every(n => String(JSON.stringify(taqi.trigger)).includes(n)), JSON.stringify(taqi.trigger));
}
ok("触发条件仍要求「自己失去了手牌」", /evt\.hs && evt\.hs\.length/.test(String(taqi.filter)));

// ---------------------------------------------------------------- 2. 唯一最少 → 弃那一个
{
    const me = mkPlayer("梦孙寒华", 9);
    const a = mkPlayer("甲", 1);
    const b = mkPlayer("乙", 3);
    const hit = await runUse(me, [a, b]);
    ok("唯一最少(1<3)：只弃了手牌最少的那一个", hit.length === 1 && hit[0] === "甲", hit.join(","));
    ok("唯一最少：弃置区域是 he（手牌+装备，不是只看手牌）", a.discarded.length === 1 && a.discarded[0][0] === "he", JSON.stringify(a.discarded));
    ok("唯一最少：每个人只弃一张（没有 num 参数=默认1）", a.discarded[0].length === 1, JSON.stringify(a.discarded[0]));
    ok("唯一最少：其他人一个都没动", b.discarded.length === 0);
}
{
    // 自己手牌最少也不算：判定集不含自己
    const me = mkPlayer("梦孙寒华", 1);
    const a = mkPlayer("甲", 4);
    const b = mkPlayer("乙", 6);
    const hit = await runUse(me, [a, b]);
    ok("自己手牌最少也不算（判定集不含自己）→ 仍然是甲", hit.length === 1 && hit[0] === "甲", hit.join(","));
}
{
    // 空手的人不参与比较：甲 0 张（还有装备）也不能被选中，选中的是最少有手牌的乙
    const me = mkPlayer("梦孙寒华", 9);
    const a = mkPlayer("甲", 0, 2);
    const b = mkPlayer("乙", 2);
    const hit = await runUse(me, [a, b]);
    ok("无手牌者不计入（0 张的甲不能被选中）", hit.length === 1 && hit[0] === "乙", hit.join(","));
    ok("无手牌者不计入：甲确实没被碰", a.discarded.length === 0);
}

// ---------------------------------------------------------------- 3. 并列最少 → 无事发生
{
    const me = mkPlayer("梦孙寒华", 9);
    const a = mkPlayer("甲", 2);
    const b = mkPlayer("乙", 2);
    const c = mkPlayer("丙", 3);
    const hit = await runUse(me, [a, b, c]);
    ok("两人并列最少(2=2)：无事发生", hit.length === 0, hit.join(","));
}
{
    const me = mkPlayer("梦孙寒华", 9);
    const a = mkPlayer("甲", 1);
    const b = mkPlayer("乙", 1);
    const c = mkPlayer("丙", 1);
    const hit = await runUse(me, [a, b, c]);
    ok("三人并列最少：无事发生", hit.length === 0, hit.join(","));
}
{
    const me = mkPlayer("梦孙寒华", 9);
    const a = mkPlayer("甲", 3);
    const b = mkPlayer("乙", 3);
    const c = mkPlayer("丙", 0);
    const hit = await runUse(me, [a, b, c]);
    ok("并列最少(3=3，另有一人空手被剔除)：无事发生", hit.length === 0, hit.join(","));
}

// ---------------------------------------------------------------- 4. 其它边界
{
    const me = mkPlayer("梦孙寒华", 9);
    const hit = await runUse(me, []);
    ok("场上没有其他存活角色：无事发生且不报错", hit.length === 0, hit.join(","));
}
{
    const me = mkPlayer("梦孙寒华", 9);
    const a = mkPlayer("甲", 0, 2);
    const b = mkPlayer("乙", 0, 2);
    const hit = await runUse(me, [a, b]);
    ok("其他角色全部空手：无事发生（不因为它们 0 张就选一个）", hit.length === 0, hit.join(","));
}
{
    const me = mkPlayer("梦孙寒华", 9);
    const a = mkPlayer("甲", 2, 0); // 最少但有手牌、却一张都不能弃
    const b = mkPlayer("乙", 5);
    const hit = await runUse(me, [a, b]);
    ok("唯一最少者没有可弃置的牌：安静跳过，不产生空弃牌事件", hit.length === 0, hit.join(","));
}
{
    // 并列最少的同时，上面还有人 —— 也不能"退而求其次"去弃第二少的
    const me = mkPlayer("梦孙寒华", 9);
    const a = mkPlayer("甲", 2);
    const b = mkPlayer("乙", 2);
    const c = mkPlayer("丙", 4);
    const hit = await runUse(me, [a, b, c]);
    ok("并列最少时不会退而求其次去弃第二少的", hit.length === 0, hit.join(","));
}

// ---------------------------------------------------------------- 5. 描述与其它分支
ok("技能描述①已同步成新效果", /1\.使用：场上有手牌且手牌数唯一最少的一名其他角色随机弃置一张牌/.test(chr.skillTranslate.sgz_taqi_info), chr.skillTranslate.sgz_taqi_info);
//  ⚠ 描述文案用户会自己改（例如③从"你下一次造成的伤害+1"改成"你下一次对其他角色造成的伤害+1"），
//    所以这里只锁「序号 + 关键词」，不锁整句。
ok("技能描述③已改成「其他」", /3\.其他：.*伤害\+1/.test(chr.skillTranslate.sgz_taqi_info), chr.skillTranslate.sgz_taqi_info);
{
    const me = mkPlayer("梦孙寒华", 1);
    let recovered = 0;
    me.recover = async () => recovered++;
    game.players = [me];
    await taqi.content({}, { name: "lose", getParent: () => ({ name: "respond" }) }, me);
    ok("②打出：回复 1 点体力", recovered === 1, recovered);
}
{
    // ③其他：只要是"既不是使用、也不是打出"的原因，都要 +1
    //  ⚠ trigger 的形状要照抄引擎：普通原因是 `loseAfter`（父事件名＝原因），
    //    loseAsync 一路是 `loseAsyncAfter`（原因在**父事件的 `.type`** 上，见 content 里那几行），
    //    其余全局时机（equip/gain/addJudge/addToExpansion）**用时机自己的名字当原因**。
    const cases = [
        ["弃置", { name: "lose", getParent: () => ({ name: "discard" }) }],
        ["交给别人", { name: "lose", getParent: () => ({ name: "give" }) }],
        ["拼点", { name: "lose", getParent: () => ({ name: "chooseToCompare" }) }],
        ["装备被替换（equipAfter）", { name: "equip", getParent: () => ({ name: "useCard" }) }],
        ["装备被拿走（gainAfter）", { name: "gain", getParent: () => ({ name: "gainPlayerCard" }) }],
        ["判定区变化", { name: "addJudge", getParent: () => ({ name: "addJudge" }) }],
        ["移出游戏", { name: "addToExpansion", getParent: () => ({ name: "addToExpansion" }) }],
        ["loseAsync 且父事件没标 type", { name: "loseAsync", getParent: () => ({ name: "swapHandcards" }) }],
        ["loseAsync 标了 type", { name: "loseAsync", getParent: () => ({ name: "lose", type: "equip" }) }],
    ];
    for (const [label, trigger] of cases) {
        const me = mkPlayer("梦孙寒华", 1);
        const added = [];
        let marks = 0;
        me.addSkill = n => added.push(n);
        me.addMark = () => marks++;
        game.players = [me];
        await taqi.content({}, trigger, me);
        ok("③其他[" + label + "]：下一次伤害+1", added.includes("sgz_taqi_damage") && marks === 1, added.join(",") + "|marks=" + marks);
    }
}
{
    // ⚠ 回归点：**使用装备牌顶掉旧装备**时，equipAfter 的父事件是 useCard，
    //   但原因必须是"装备替换"→③（+1），**绝不能**被父事件名带偏去走①
    //   （走①不仅分支错，还会让①对同一次出牌连发两次）。
    const me = mkPlayer("梦孙寒华", 1);
    const added = [];
    me.addSkill = n => added.push(n);
    me.addMark = () => {};
    const other = mkPlayer("甲", 3);
    other.discarded = [];
    game.players = [me, other];
    await taqi.content({}, { name: "equip", getParent: () => ({ name: "useCard" }) }, me);
    ok("装备替换不会被父事件名误判成①（没有去弃别人的牌）", other.discarded.length === 0, JSON.stringify(other.discarded));
    ok("装备替换：走的是③（+1）", added.includes("sgz_taqi_damage"), added.join(","));
}
{
    // 反面：使用 / 打出**不能**走 +1 分支
    for (const [label, trigger] of [
        ["使用", { name: "lose", getParent: () => ({ name: "useCard" }) }],
        ["打出", { name: "lose", getParent: () => ({ name: "respond" }) }],
    ]) {
        const me = mkPlayer("梦孙寒华", 1);
        me.recover = async () => {};
        const added = [];
        let marks = 0;
        me.addSkill = n => added.push(n);
        me.addMark = () => marks++;
        // ① 分支需要一个"唯一最少"的其他人（给一个就行）
        const other = mkPlayer("甲", 3);
        game.players = [me, other];
        await taqi.content({}, trigger, me);
        ok("③其他[" + label + "]：不会再加上伤害+1（走的是①/②）", !added.includes("sgz_taqi_damage") && marks === 0, added.join(",") + "|marks=" + marks);
    }
}

// ---------------------------------------------------------------- 汇总
let failed = 0;
for (const c of checks) {
    if (!c.cond) failed++;
    console.log((c.cond ? "  [OK]   " : "  [FAIL] ") + c.name + (c.extra !== undefined && !c.cond ? "   → 实际：" + JSON.stringify(c.extra) : ""));
}
console.log(`\n通过 ${pass}/${checks.length}，失败 ${failed}`);
process.exit(failed ? 1 : 0);
