// ============================================================
//  sgz_guanyu · 技能 AI（本文件的 AI 是**唯一来源**）
//  ⚠ 角色文件里只写 `ai: AI.<技能id>`；子技能用注册后的完整 id（`父技能_子技能`）。
//  ⚠ 这里只放**纯 AI 数据/函数**（引擎直接读 `lib.skill[id].ai`），不要有副作用。
//
//  本版重点（2026 按反馈重写）：
//    · 【红杀先于黑杀】武神·改（红→削体力上限）要先于武魂·改（黑→失去体力+弃牌）打出。
//      原因：红杀打"满血"角色时会连带压低其体力（上限被砍后 hp 溢出归零），
//      若先黑杀把血打下去，红杀的上限削减就不再顺带削血，收益重复浪费。
//      ⚠ 两套技能性质不同，别混：
//        · 武神·改 / 武魂·改（梦刃 ①② 获得）＝**非锁定**：手牌保持原样，
//          由关羽**主动点击**把某一张"视为【杀】"⇒ 这里要管的是"先用哪个技能、烧哪张牌"；
//        · 武神·临 / 武魂·临（魂殇② 给被接管角色）＝**锁定**：mod.cardname 把红/黑手牌
//          **全部**变成【杀】⇒ 那里要管的是"自动生成的杀按什么顺序打出"。
//      实现：① ai.order（武神 9 > 武魂 6，管"先用哪个技能"）；
//            ② mod.aiOrder（红【杀】+3、黑【杀】+0.5，管"打出的顺序"，含真实的红/黑杀与临版自动转化）；
//            ③ check（手里还有红牌时黑牌轻微降分，作为"红先"的辅助信号）。
//    · 【梦刃】重写四个选项的权重：③ 殇敌（直接清空一个人）在绝大多数局面下就是最优，
//      ①/② 是"永动机"（把有色手牌变杀），④ 只用来救队友；
//      并且区分"最后一点上限"（再减就只剩 1 上限，很危险）——那种情况只允许为了真正的击杀使用。
// ============================================================

// ---------------------------------------------------------------- 小工具
function attitude(player, target) {
    try {
        return get.attitude(player, target);
    } catch (e) {
        return 0;
    }
}

function threatOf(target) {
    try {
        return get.threaten(target);
    } catch (e) {
        return 5;
    }
}

function countColor(player, area, color) {
    try {
        return player.countCards(area, card => get.color(card) == color);
    } catch (e) {
        return 0;
    }
}

function enemiesOf(player) {
    const out = [];
    try {
        game.countPlayer(current => {
            if (current != player && get.attitude(player, current) < 0 && current.hp > 0) out.push(current);
        });
    } catch (e) {}
    return out;
}

function isFull(player, target) {
    return target.hp >= target.maxHp;
}

// ================================================================
//  梦刃
// ================================================================

/** 支付代价：优先用"索命"（可再生、且只给梦刃用），没得用才永久减上限 */
function mengrenCost(player) {
    let marks = 0;
    try {
        marks = player.countMark("sgz_suoming");
    } catch (e) {}
    if (marks > 0) return "移除一枚索命";
    return "减少一点体力上限";
}

/** 这一发是不是"最后一点上限"（减完只剩 1，之后没索命就不能再用梦刃，且自身极脆） */
function mengrenIsLastUse(player) {
    let marks = 0;
    try {
        marks = player.countMark("sgz_suoming");
    } catch (e) {}
    if (marks > 0) return false;
    return (player.maxHp || 1) <= 2;
}

/** ③ 殇敌的击杀价值：威胁、血量、牌数；残血杂鱼打折；最后一个敌人额外加权（杀完就赢） */
function mengrenKillValue(player, target) {
    if (!target || target == player) return 0;
    if (attitude(player, target) >= 0) return 0;
    if (target.hp <= 0) return 0;
    const enemies = enemiesOf(player);
    let value = threatOf(target) * 2 + (target.hp || 0) * 1.5;
    try {
        value += target.countCards("he") * 0.3;
    } catch (e) {}
    if (target.hp <= 1 && enemies.length > 1) value -= 15; // 残血杂鱼：别浪费一次处决
    if (enemies.length <= 1) value += 60; // 最后一个敌人 = 直接赢
    return value;
}

/** 所有敌人里最值得处决的那个 */
function mengrenBestKill(player) {
    let best = null;
    let bestValue = -Infinity;
    for (const target of enemiesOf(player)) {
        const v = mengrenKillValue(player, target);
        if (v > bestValue) {
            bestValue = v;
            best = target;
        }
    }
    return { target: best, value: bestValue === -Infinity ? 0 : bestValue };
}

/** ④ 回天的价值：队友越残、越核心越值 */
function mengrenHealValue(player, target) {
    if (!target || target == player) return -99;
    const att = attitude(player, target);
    if (att <= 0) return -50;
    let value = att * 0.5;
    const deficit = Math.max(0, (target.maxHp || 0) - (target.hp || 0));
    value += deficit * 8;
    if (target.hp <= 1) value += 25;
    return value;
}

/**
 * 梦刃 · 四个选项的权重（数值越大越优先）。
 * 口径（按实测：99% 的局面 ③ 就是最优）：
 *   ③ 殇敌：70 + 击杀价值（远高于其它选项，除非没有值得杀的人）
 *   ① 武神：30 + 红牌数×3 +（还没武神时 +10）—— 永动机：红牌可主动当"不可响应 + 削上限"的杀
 *   ② 武魂：26 + 黑牌数×3 +（还没武魂时 +10）—— 永动机：黑牌可主动当"无限次 + 失血弃牌"的杀
 *   ④ 回天：10 + 队友救援价值（只救队友，不救敌人）
 * 另外：如果这一发是"最后一点上限"，①/②/④ 全部重罚（只剩 1 上限=又脆又没后续），
 *       只留 ③ 且有真正值得杀的目标（击杀价值 ≥ 30）时才发动。
 */
function mengrenOptionScore(button, player) {
    const link = button && button.link != undefined ? button.link : button;
    const hasWushen = player.hasSkill("sgz_wushen");
    const hasWuhun = player.hasSkill("sgz_wuhun");
    const lastUse = mengrenIsLastUse(player);
    const kill = mengrenBestKill(player);

    let score = -99;
    if (link == "loseall") {
        score = 70 + kill.value;
        if (lastUse && kill.value < 25) score = -99; // 最后一点上限只换真正的击杀
    } else if (link == "wushen") {
        if (hasWushen) score = -99;
        else score = (lastUse ? -60 : 30) + countColor(player, "h", "red") * 3 + (hasWuhun ? 0 : 10);
    } else if (link == "wuhun") {
        if (hasWuhun) score = -99;
        else score = (lastUse ? -60 : 26) + countColor(player, "h", "black") * 3 + (hasWushen ? 0 : 10);
    } else if (link == "healall") {
        let bestHeal = 0;
        try {
            game.countPlayer(current => {
                if (current != player) bestHeal = Math.max(bestHeal, mengrenHealValue(player, current));
            });
        } catch (e) {}
        score = (lastUse ? -60 : 10) + bestHeal;
    }
    // ⚠ 关键：**永远给一个正分**，保证 AI 一定能选中一项、绝不点"取消"
    //   （旧版在"最后一点上限"等情况下四项全负 → 引擎返回未选择 → 反复发动 = 死循环）。
    //   优先级仍由分值高低体现：③ 处决 > ① 武神 > ② 武魂 > ④ 回天。
    return score > 0 ? score : 1;
}

/**
 * 梦刃值不值得发动（给 result.player 用）。
 * ⚠ 只统计**实际可选项**（已拥有的武神/武魂会被角色文件从列表里剔除），
 *   否则会出现"AI 以为有收益 → 发动 → 列表里全负分 → 取消 → 再发动"的死循环。
 */
function mengrenWorth(player) {
    const hasWushen = player.hasSkill("sgz_wushen");
    const hasWuhun = player.hasSkill("sgz_wuhun");
    const options = ["loseall", "healall"];
    if (!hasWushen) options.push("wushen");
    if (!hasWuhun) options.push("wuhun");
    let best = -Infinity;
    for (const key of options) best = Math.max(best, mengrenOptionScore({ link: key }, player));
    return best >= 20 ? 2 : 0;
}

/** 记一笔"本次阶段内别再尝试梦刃"（防止 abort 后 AI 反复重试） */
function mengrenAbort(player) {
    try {
        player.storage.sgz_mengren_skip = game.phaseNumber;
    } catch (e) {}
}



/** ③ 殇敌选人：挑最值得杀的（残血杂鱼靠后，最后一个敌人拉满） */
function mengrenLoseAllTarget(player, target) {
    if (!target || target == player) return -99;
    if (attitude(player, target) >= 0) return -99;
    return mengrenKillValue(player, target);
}

/** ④ 回天选人：只救队友，越残越优先 */
function mengrenHealAllTarget(player, target) {
    return mengrenHealValue(player, target);
}

// ================================================================
//  武神 / 武魂
// ================================================================

/** 红杀（武神·改）目标分：优先满血/高上限（削上限同时削血），不打自己 */
function wushenTargetScore(player, target) {
    if (!target) return 0;
    if (target == player) return -10;
    if (attitude(player, target) > 0) return -1;
    let score = 3;
    if (isFull(player, target)) score += 2; // 满血时削上限会连带削血
    score += Math.max(0, (target.maxHp || 1) - 1) * 0.4; // 上限越高越亏
    return score;
}

/** 黑杀（武魂·改）目标分：优先牌多/血厚的（失血+弃牌） */
function wuhunTargetScore(player, target) {
    if (!target) return 0;
    if (attitude(player, target) > 0) return -1;
    let score = 3;
    try {
        score += Math.min(4, target.countCards("he")) * 0.3;
    } catch (e) {}
    if ((target.hp || 0) >= 3) score += 1;
    return score;
}

/** 选择转化哪张红牌：越没用越先变杀 */
function wushenCheck(card) {
    return 5 - get.value(card);
}

/**
 * 选择转化哪张黑牌。
 * 手里还有红牌时**轻微**降权（红杀先手），只降 2 分：
 * 不能降太多，否则"有 1 张红牌 + 5 张黑牌"时会完全不用武魂·改，白丢输出。
 */
function wuhunCheck(card) {
    let penalty = 0;
    const player = typeof _status != "undefined" && _status.event ? _status.event.player : null;
    if (player && countColor(player, "h", "red") > 0) penalty = 2;
    return 5 - get.value(card) - penalty;
}

// ================================================================
//  技能 ai 表
// ================================================================
export default {
    sgz_hunshang: {
        expose: 1,
        threaten: 1.5,
    },
    sgz_mengren: {
        expose: 1,
        threaten: 1.6,
        order: 6,
        result: {
            player: function (player) {
                return mengrenWorth(player);
            },
        },
    },
    sgz_wushen: {
        expose: 1,
        threaten: 1.3,
        order: 9, // 红杀先于黑杀
        respondSha: true,
        directHit_ai: true,
        result: {
            target: function (player, target) {
                return wushenTargetScore(player, target);
            },
        },
    },
    sgz_wuhun: {
        expose: 1,
        threaten: 1.25,
        order: 6,
        respondSha: true,
        result: {
            target: function (player, target) {
                return wuhunTargetScore(player, target);
            },
        },
    },
    sgz_wushen_lin: {
        expose: 1,
        threaten: 1.2,
    },
    sgz_wuhun_lin: {
        expose: 1,
        threaten: 1.2,
    },
};

// ================================================================
//  给角色文件调用的 AI 函数（不是 ai 表，但同样只给 AI 用）
// ================================================================
export const helpers = {
    sgz_mengren_abort(player) {
        mengrenAbort(player);
    },

    mengrenCost: function (player) {
        return mengrenCost(player);
    },
    mengrenOptionScore: function (button, player) {
        return mengrenOptionScore(button, player);
    },
    mengrenLoseAllTarget: function (player, target) {
        return mengrenLoseAllTarget(player, target);
    },
    mengrenHealAllTarget: function (player, target) {
        return mengrenHealAllTarget(player, target);
    },
    sgz_wushen_check: function (card) {
        return wushenCheck(card);
    },
    sgz_wuhun_check: function (card) {
        return wuhunCheck(card);
    },
};

// ---- 内联 AI 索引（角色文件里仍**直接写着**的 `.set("ai", …)`；数量由 check_ai_centralized 对账）----
//   ⚠ 这些多是「一行式闭包、依赖技能局部变量」的判定，搬出去要给每个调用点补参数，所以先留原地、只登记；
//     其中少数（如缚渊的 `fuyuanAi`）其实已经转交给 helpers，只是调用点还写着。
//   合计 4 处：sgz_mengren 4

// ============================================================
//  AI 逻辑说明（纯注释，不参与运行）
// ------------------------------------------------------------
//  【sgz_hunshang】魂殇（使命技）：expose 1 / threaten 1.5 —— 接管别人的回合，威胁很高。
//  【sgz_mengren】梦刃：order 6；result.player 取决于"最好的那项是否 ≥20 分"。
//    选项权重 ③ > ① > ② > ④（③ 直接清空一个人）；最后一点上限时只允许 ③ 换真击杀。
//    代价优先用"索命"（可再生），没有才减上限。
//  【sgz_wushen】武神·改（非锁定·主动视为）：order 9（**红杀必须先打**：削上限会连带压低满血角色的体力）；
//    目标优先满血/高上限；`directHit_ai`（不可响应）。
//  【sgz_wuhun】武魂·改（非锁定·主动视为）：order 6；黑杀是"无限次 + 失血 + 弃牌"的消耗手段，排在红杀之后；
//    目标优先牌多/血厚；手里还有红牌时 check 降权，避免抢跑。
//  另：武神·临 / 武魂·临（被接管角色的锁定技）靠 mod.aiOrder 实现同样的"红先黑后"。
// ============================================================
