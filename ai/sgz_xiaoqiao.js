// ============================================================
//  sgz_xiaoqiao · 技能 AI（本文件的 AI 是**唯一来源**）
//  ⚠ 角色文件里只写 `ai: AI.<技能id>`；子技能用注册后的完整 id（`父技能_子技能`）。
//  ⚠ 这里只放**纯 AI 数据/函数**（引擎直接读 `lib.skill[id].ai`），不要有副作用。
//
//  口径（需求定稿）：
//    · 留牌/弃牌：**能出的牌才是好牌**。【闪】【无懈】、次数用尽的【杀】都最低
//      （她不怕伤害：弦律会把伤害转移出去；手牌越"能出"，弦触发越多）。
//    · 弦的目标：♥ 自己（不满血）→ 否则队友；♠ **永远自己**（摸3E弃3E 一定正收益）；
//      ♦ 敌人（残血、无护甲优先）；无色 敌人（**体力上限最低**优先）；
//      ♣ 敌人（**手牌最少且不溢出**：只在手牌 ≥ 2D 的人里挑手牌最少的）。
//    · 变：优先凑 4 连 → 再凑 4 不同 → 都不行按 ♦ > 无色 > ♥（♣/♠ 只用于凑花色）。
// ============================================================

const REC_KEY = "sgz_wuyin_jilu"; // 五音谱（最近 4 次音韵的花色）
const SUITS = ["heart", "diamond", "club", "spade"];

function eventPlayer() {
    try {
        if (typeof _status != "undefined" && _status.event && _status.event.player) return _status.event.player;
    } catch (e) {}
    return null;
}

function attitude(player, target) {
    try {
        return get.attitude(player, target);
    } catch (e) {
        return 0;
    }
}

function record(player) {
    try {
        const rec = player.storage && player.storage[REC_KEY];
        return Array.isArray(rec) ? rec.slice(0, 4) : [];
    } catch (e) {
        return [];
    }
}

// ================================================================
//  ① 变：选哪个花色
// ================================================================

/** 手牌里各花色的张数 */
function handSuitCount(player) {
    const out = { heart: 0, diamond: 0, club: 0, spade: 0, none: 0 };
    try {
        for (const card of player.getCards("h")) {
            const s = get.suit(card, player);
            if (out[s] != undefined) out[s]++;
        }
    } catch (e) {}
    return out;
}

/**
 * 「变」的评分：能不能凑出律效果。
 *   4 连：最近 3 次记录同色 X → 变 X（+1 上限 + 该音韵永久 +1）
 *   4 不同：最近 3 次互不相同 → 变缺的第 4 种（变量+1 的弦效果）
 *   都不行：价值序 ♦ > 无色 > ♥；♣/♠ 只在凑花色时给分
 */
function suitScore(suit, player) {
    const player2 = player || eventPlayer();
    if (!player2) return 1;
    const rec = record(player2);
    if (rec.length >= 3) {
        const x = rec[0];
        if (rec[1] == x && rec[2] == x && suit == x) return 100;
        if (rec[0] != rec[1] && rec[1] != rec[2] && rec[0] != rec[2]) {
            const missing = SUITS.filter(s => !rec.slice(0, 3).includes(s));
            if (missing.includes(suit)) return 90;
        }
    }
    if (suit == "heart") return player2.isDamaged() ? 60 : 10;
    if (suit == "diamond") return 50;
    if (suit == "none") return 45;
    return 5;
}

function suitChoice(button, player) {
    if (!button) return 0;
    return suitScore(button.link, player || eventPlayer());
}

// ================================================================
//  ② 弦：目标
// ================================================================

/** 弦目标评分（越大越优先） */
function targetScore(suit, target, player, value) {
    if (!target || !target.isAlive()) return -999;
    const v = Math.max(1, value || 1);
    const att = attitude(player, target);
    if (suit == "heart") {
        if (target == player) return player.isDamaged() ? 100 : 5;
        if (att <= 0) return -999;
        const deficit = (target.maxHp || 0) - (target.hp || 0);
        return 20 + att * 5 + deficit * 10;
    }
    if (suit == "spade") return target == player ? 120 : -999;
    if (target == player || att >= 0) return -999;
    if (suit == "diamond") {
        return 30 + Math.max(0, 6 - (target.hp || 0)) * 8 - (target.hujia || 0) * 5;
    }
    if (suit == "none") {
        return 30 + Math.max(0, 10 - (target.maxHp || 0)) * 6;
    }
    if (suit == "club") {
        const n = 2 * v;
        const cards = target.countCards("he") || 0;
        if (cards < n) return -50; // 弃不满 → 溢出，跳过
        return 30 + (20 - cards) * 3;
    }
    return 0;
}

// ================================================================
//  ③ 留牌价值（mod.aiValue）：能出的牌才是好牌
// ================================================================

function keepValue(card, player, num) {
    const base = typeof num == "number" ? num : 5;
    try {
        const name = get.name(card, player);
        if (name == "shan" || name == "wuxie") return base - 20;
        if (name == "sha") {
            let used = 0;
            try {
                used = player.getStat("card").sha || 0;
            } catch (e) {}
            if (used >= 1) return base - 15;
            return base - 3;
        }
        return base + 8;
    } catch (e) {
        return base;
    }
}

// ================================================================
//  技能 ai 表
// ================================================================
export default {
    sgz_linglai: {
        expose: 1,
        threaten: 1.1,
    },
    sgz_xianlv: {
        expose: 1,
        threaten: 1.15,
    },
    sgz_wuyin: {
        expose: 1,
        threaten: 1.3,
        order: 6,
        result: {
            player: function (player) {
                return 2;
            },
        },
    },
};

const KEY_EQUIPS = ["zhuge"]; // 诸葛连弩：永远不顶掉

function equipOrder(card, player, num) {
    if (!card) return num;
    let type = "";
    try {
        type = get.type(card, player);
    } catch (e) {}
    if (type != "equip") return num;
    const name = get.name(card, player);
    let sameSlot = [];
    try {
        const subs = get.subtypes(card, player) || [];
        sameSlot = player.getCards("e").filter(c => (get.subtypes(c, player) || []).some(s => subs.includes(s)));
    } catch (e) {}
    if (sameSlot.some(c => get.name(c, player) == "zhuge")) return 0; // 已装连弩 → 不顶
    const rank = KEY_EQUIPS.includes(name) ? 100 : 10;
    return num + (100 - rank) / 10; // 低价值先上、连弩后上
}

/** 装备"使用价值"：同栏已有牌时也照样顶（连弩除外）——用出去才有收益 */
function equipUseful(card, player, num) {
    if (!card) return num;
    let type = "";
    try {
        type = get.type(card, player);
    } catch (e) {}
    if (type != "equip") return num;
    let sameSlot = [];
    try {
        const subs = get.subtypes(card, player) || [];
        sameSlot = player.getCards("e").filter(c => (get.subtypes(c, player) || []).some(s => subs.includes(s)));
    } catch (e) {}
    if (sameSlot.some(c => get.name(c, player) == "zhuge")) return 0; // 不顶诸葛连弩
    return num + 12;
}

export const helpers = {
    sgz_wuyin_equipUseful(card, player, num) {
        return equipUseful(card, player, num);
    },
    sgz_wuyin_equipOrder(card, player, num) {
        return equipOrder(card, player, num);
    },
    sgz_wuyin_suitScore(button, player) {
        return suitChoice(button, player);
    },
    sgz_wuyin_targetScore(suit, target, player, value) {
        return targetScore(suit, target, player, value);
    },
    sgz_wuyin_keepValue(card, player, num) {
        return keepValue(card, player, num);
    },
};

// ---- 内联 AI 索引（角色文件里仍**直接写着**的 `.set("ai", …)`；数量由 check_ai_centralized 对账）----
//   ⚠ 这些多是「一行式闭包、依赖技能局部变量」的判定，搬出去要给每个调用点补参数，所以先留原地、只登记；
//     其中少数（如缚渊的 `fuyuanAi`）其实已经转交给 helpers，只是调用点还写着。
//   合计 4 处：sgz_xianlv 1、sgz_wuyin 3

// ============================================================
//  AI 逻辑说明（纯注释，不参与运行）
// ------------------------------------------------------------
//  【sgz_linglai】灵籁：expose 1 / threaten 1.1（自动把获得牌的花色视为最少的那个）。
//  【sgz_xianlv】弦律：expose 1 / threaten 1.15（受伤转移 + 手牌花色改写）。
//  【sgz_wuyin】五音：expose 1 / threaten 1.3；order 6、result.player 2（能用就用）。
//    · 变（helpers.sgz_wuyin_suitScore）：凑 4 连(100) > 凑 4 不同(90) > ♥60 / ♦50 / 无色45；
//      ♣/♠ 只在凑花色时给分。
//    · 弦（helpers.sgz_wuyin_targetScore）：♥ 自己(不满血)>队友；♠ 永远自己；
//      ♦ 残血无甲敌人；无色 **上限最低**的敌人；♣ 手牌 ≥2D 里**手牌最少**的敌人。
//    · 留牌（helpers.sgz_wuyin_keepValue）：闪/无懈 −20、次数用完的杀 −15、能出的牌 +8。
// ============================================================
