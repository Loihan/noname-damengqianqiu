// ============================================================
//  sgz_wenyang · 技能 AI（本文件的 AI 是**唯一来源**）
//  ⚠ 角色文件里只写 `ai: AI.<技能id>`；子技能用注册后的完整 id（`父技能_子技能`）。
//  ⚠ 这里只放**纯 AI 数据/函数**（引擎直接读 `lib.skill[id].ai`），不要有副作用。
//
//  设计口径（按需求定稿，保持简单）：
//    · 惊跃只有一个决策："用不用"。蓄力上限 ≤2 不用；其余时刻**始终用、且用满**、
//      出牌阶段优先级最高（不搞任何刹车）。选了用之后一定打到上限（要么不用，要么用满）。
//    · 用哪张牌转化：只按"越不值钱越先烧"排；**没有"价值太高不能烧"的牌**。
//    · 颜色顺序：自己的出牌阶段＝先黑（雷杀无次数限制）直到没黑牌或只剩最后一次，再用红；
//      回合外＝先红。
//    · 霆踪：没有决策，只是一发**强制**处决；唯一要挑的是"处决谁"。
//    · 仇决：等级制（0/1/2 级），升降级都不改变出牌/伤害决策 ⇒ AI 只关心 expose/threaten。
// ============================================================

const TINGZONG = "sgz_tingzong";
const TINGZONG_MAX = 7;

// ---------------------------------------------------------------- 小工具
function eventPlayer() {
    try {
        if (typeof _status != "undefined" && _status.event && _status.event.player) return _status.event.player;
    } catch (e) {}
    return null;
}

/** 游戏开始后已经开始过的回合数（与角色文件的 sgzTurnCount 同口径：max(actionHistory.length) - 1） */
function turnCount() {
    let n = 0;
    try {
        const all = (game.players || []).concat(game.dead || []);
        for (const p of all) {
            if (p && p.actionHistory && p.actionHistory.length > n) n = p.actionHistory.length;
        }
    } catch (e) {}
    return Math.max(0, n - 1);
}

/**
 * 蓄力上限：min(7, 已开始回合数)
 * ⚠ 这里与角色文件 `sgz_wenyang.js` 的 `sgzJingyueLimit()`（基于 `sgzTurnCount()`）是**同一套口径的两份实现**：
 *   公式 = max(每个玩家的 actionHistory.length) − 1，再与 7 取小。
 *   改上限规则时**两边都要改**（AI 模块拿不到角色文件的闭包，没法共用）。
 */
function jingyueLimit() {
    return Math.min(TINGZONG_MAX, turnCount());
}

function markCount(player) {
    try {
        return player.countMark(TINGZONG);
    } catch (e) {
        return 0;
    }
}

function handColor(player, color) {
    try {
        return player.countCards("h", card => get.color(card) == color);
    } catch (e) {
        return 0;
    }
}

/** 还差几次惊跃能到 7（上限 7 才有意义） */
function toNuke(player) {
    return TINGZONG_MAX - markCount(player);
}

// ================================================================
//  惊跃
// ================================================================

/**
 * 用不用：**任何时候都用**（2026 需求；原"上限 ≤2 不用"已取消）。
 * ⚠ 这里刻意**不再**按"手里有没有足够多的牌用满"来拦 —— 那种拦截会让"上限>2 但只有 1~2 张牌"
 *   时完全不发动，实测就是这样漏掉的。真正的可用性（蓄力点是否已满、事件允不允许出杀）
 *   由技能自己的 `filter` / `filterCard` 把关，AI 不该再重复判一遍。
 * ⚠ 上限算不出来（拿不到 actionHistory 等）时**放行**：宁可多打一次，也不要整局不出。
 */
function jingyueShouldUse(player) {
    if (!player) return false;
    if (handColor(player, "red") + handColor(player, "black") <= 0) return false;
    // 需求（2026）：**任何时候都用**（取消"蓄力上限 ≤2 不用"的限制）
    return true;
}

/** 出牌阶段最高优先级（高于任何牌）；不用的时候给 0 */
function jingyueOrder(item, player) {
    player = player || eventPlayer();
    if (!jingyueShouldUse(player)) return 0;
    return 20;
}

/**
 * 选哪张牌去转化。
 *   基础：越不值钱越先烧（10 − 牌价值），**所有牌都是正分**（没有"价值太高不能烧"）。
 *   颜色：
 *     · 最后一次机会（remaining ≤ 1）→ 红（首张火杀：无距离 +1 伤 + 不可响应）
 *     · 自己的出牌阶段 → 先黑（雷杀无次数限制），红留到最后
 *     · 回合外 → 先红
 */
function jingyueCheck(card) {
    const player = eventPlayer();
    if (!player) return 10 - get.value(card);
    let score = 12 - get.value(card);
    // ⚠ 关键：引擎可能把**转化后的虚拟牌**（{name:"sha", nature:"fire"}，没有花色）传进来，
    //   这时 get.color 会得到 "none"，红/黑判断全部落空 → 红牌永远拿不到分（用户报"不会用红惊跃"）。
    //   所以先还原成实体牌再取颜色。
    const real = (card && card.cards && card.cards[0]) || card;
    let color = "none";
    try {
        color = get.color(real, player);
    } catch (e) {}
    if (color == "none" && card && card.nature == "fire") color = "red";
    if (color == "none" && card && card.nature == "thunder") color = "black";
    const limit = jingyueLimit();
    const remainMarks = Math.max(0, limit - markCount(player));
    const remainCards = Math.min(player.countCards("h"), remainMarks);
    const inMyPhase = (() => {
        try {
            return _status.currentPhase == player;
        } catch (e) {
            return true;
        }
    })();
    if (remainCards <= 1) {
        score += color == "red" ? 6 : -6; // 最后一发：用红（火杀不可响应）
    } else if (inMyPhase) {
        score += color == "black" ? 4 : -2; // 自己回合：先黑（雷杀无次数限制）
    } else {
        score += color == "red" ? 4 : -2; // 回合外：先红
    }
    // 需求：**没有任何牌被排除**（红牌被黑牌压着是因为"先黑"，但没黑牌时必须能选红）
    return Math.max(1, score);
}


// ================================================================
//  技能 ai 表
// ================================================================
export default {
    sgz_jingyue: {
        expose: 1,
        threaten: 1.2,
        order: function (item, player) {
            return jingyueOrder(item, player);
        },
        result: {
            player: function (player) {
                return jingyueShouldUse(player) ? 2 : 0;
            },
        },
    },
    sgz_tingzong: {
        expose: 1,
        threaten: 1.35,
    },
    sgz_choujue: {
        expose: 1,
        threaten: 1.15,
    },
};

// ================================================================
//  给角色文件调用的 AI 函数
// ================================================================
export const helpers = {
    sgz_jingyue_check(card) {
        return jingyueCheck(card);
    },

};

// ---- 内联 AI 索引（角色文件里仍**直接写着**的 `.set("ai", …)`；数量由 check_ai_centralized 对账）----
//   ⚠ 这些多是「一行式闭包、依赖技能局部变量」的判定，搬出去要给每个调用点补参数，所以先留原地、只登记；
//     其中少数（如缚渊的 `fuyuanAi`）其实已经转交给 helpers，只是调用点还写着。
//   合计 0 处（霆踪③删除后，角色文件里不再有内联 AI）

// ============================================================
//  AI 逻辑说明（**纯注释**，不参与运行；改 AI 时请顺手同步这里）
//  读法：`order` = 什么时候愿意点；`result.player` / `result.target` = 它觉得值不值。
// ------------------------------------------------------------
//  【sgz_jingyue】惊跃（蓄力技：红牌→火【杀】、黑牌→雷【杀】，用后摸1回1并+1蓄力点）
//    · 何时点：**任何时候都用**（不再限制蓄力上限）；
//      其余时刻**始终用、且用满**，出牌阶段 order = 20（高于任何牌）。
//    · 用哪张牌：只分"越不值钱越先烧"（12 − 价值），**没有任何牌被排除**。
//    · 颜色顺序：自己出牌阶段 **先黑（雷杀无次数限制）**，没黑牌或只剩最后一次时用**红**；
//      回合外**先红**（首张火杀：无距离、伤害+1、不可响应）。
//    · 性质：每用一次摸 1 + 回 1 ⇒ 兼作续航；蓄力点同时是距离攻防。
//  【sgz_tingzong】霆踪（锁定）：expose 1 / threaten 1.35（③已删除，不再有处决选人）。
//    · ①出牌阶段开始弃光手牌按蓄力点重摸 ⇒ "要么不用要么用满"的根源。
//    · 蓄力点达 7 现在是**仇决的升级条件**（见下），霆踪本身不再有主动效果。
//  【sgz_choujue】仇决：expose 1 / threaten 1.15；**等级制**（初始1级，0/1/2级）。
//    · 升级：击杀或蓄力点达7 → 蓄力点归零、等级+1；2级时视为拥有【催灭】。
//    · 降级：即将死亡时免死（上限-1、回满）；免死瞬间蓄力点>0 只清空，=0 则等级-1。
// ============================================================
