// ============================================================
//  sgz_weiyan · 技能 AI（本文件的 AI 是**唯一来源**）
//  ⚠ 角色文件里只写 `ai: AI.<技能id>`；子技能用注册后的完整 id（`父技能_子技能`）。
//  ⚠ 这里只放**纯 AI 数据/函数**（引擎直接读 `lib.skill[id].ai`），不要有副作用。
//
//  设计口径（按需求定稿）：
//    · 壮誓（觉醒前）：算出最多能扣几点体力（= 体力−1，转化为等量【杀】），
//      再扫场上**所有其他角色**（忠臣身份排除主公；队友也算 —— 一切都为"击杀一名角色"以达成使命）。
//      只要能**稳杀**一个人 → 扣满；否则不发动。
//    · 壮誓（觉醒后）：**始终发动、扣满**，但只把敌人算作击杀目标。
//    · 破扼：**始终发动**（收益极高）；觉醒前允许把队友当目标（为了凑击杀），觉醒后只打敌人。
//    · 竭燃：能放就放；选项优先（缺上限就+上限），弃牌**弃光**（多失去牌 → 多触发破扼 → 多出杀）。
//
//  "能不能稳杀"的估算（把需求里点到的因素都算进去）：
//    每张【杀】的伤害 = 1 + 檄残加伤（已损失体力=2 或 ≥3 时 +1；目标体力=1 时 +1）
//    目标有效血量 = 体力 + 护甲 + 救援（目标体力≤1 时 +1，假设会有人出【桃】）
//    可闪避：目标体力=2 时**不可响应**（不加缓冲）；否则至少要多 1 张来兜【闪】
//    ⇒ 能杀 ⟺ 可用【杀】数 × 每张伤害 ≥ 有效血量 + 缓冲
// ============================================================

const POE_SHA = "sgz_poe_sha";

// ---------------------------------------------------------------- 小工具
function eventPlayer() {
    try {
        if (typeof _status != "undefined" && _status.event && _status.event.player) return _status.event.player;
    } catch (e) {}
    return null;
}

function isAwakened(player) {
    try {
        return player.hasSkill("sgz_jieran");
    } catch (e) {
        return false;
    }
}

function isLoyalist(player) {
    try {
        return player.identity == "zhong";
    } catch (e) {
        return false;
    }
}

function attitude(player, target) {
    try {
        return get.attitude(player, target);
    } catch (e) {
        return 0;
    }
}

function isLord(player, target) {
    try {
        return target.isZhu || target == game.zhu;
    } catch (e) {
        return false;
    }
}

/** 一张破扼【杀】能打出的伤害（含檄残加伤） */
function poeDamage(target) {
    let dmg = 1;
    let lost = 0;
    try {
        lost = (target.maxHp || 0) - (target.hp || 0);
    } catch (e) {}
    if (lost == 2 || lost >= 3) dmg += 1; // 檄残②③
    if ((target.hp || 0) == 1) dmg += 1; // 檄残⑤
    return dmg;
}

/** 目标的有效血量（体力 + 护甲 + 桃救援估计） */
function poeHpPool(target) {
    let pool = (target.hp || 0) + (target.hujia || 0);
    if ((target.hp || 0) <= 1) pool += 1; // 残血一定有人救 → 多算 1 点
    return pool;
}

/** 目标能不能闪（体力=2 时檄残④让此杀不可响应） */
function poeNoDodge(target) {
    return (target.hp || 0) == 2;
}

/** 用 num 张破扼杀，能否稳杀 target */
function canKillWith(player, target, num) {
    if (!target || target == player || !target.isAlive || !target.isAlive()) return false;
    const dmg = poeDamage(target);
    const buffer = poeNoDodge(target) ? 0 : 1; // 兜一张【闪】
    return num * dmg >= poeHpPool(target) + buffer;
}

/** 本回合还能打出的破扼杀数量（.set 链上的账本；拿不到就按 1 算） */
function poeRemaining(player) {
    try {
        const total = player._sgz_poe_total || 0;
        const done = player._sgz_poe_done || 0;
        const left = total - done + 1;
        return left > 0 ? left : 1;
    } catch (e) {
        return 1;
    }
}

// ================================================================
//  壮誓
// ================================================================

/** 壮誓的候选目标（觉醒前：其他所有人，忠臣排除主公、队友也算；觉醒后：只有敌人） */
function zhuangshiTargets(player) {
    const out = [];
    try {
        game.countPlayer(current => {
            if (current == player || !current.isAlive()) return;
            if (isAwakened(player)) {
                if (get.attitude(player, current) < 0) out.push(current);
                return;
            }
            if (isLoyalist(player) && isLord(player, current)) return; // 忠臣不杀主公
            out.push(current);
        });
    } catch (e) {}
    return out;
}

/** 扣满体力（= 体力−1）后，能不能稳杀一个人 */
function zhuangshiFindKill(player, num) {
    for (const target of zhuangshiTargets(player)) {
        if (canKillWith(player, target, num)) return target;
    }
    return null;
}

/**
 * 壮誓选几点：返回字符串数字（引擎的 chooseControl 选项）。
 *   觉醒后：始终扣满；
 *   觉醒前：扣满能稳杀一个人就扣满，否则 0（不发动）。
 */
function zhuangshiChoice(player) {
    if (!player) return "0";
    const max = Math.max(0, (player.getHp ? player.getHp() : player.hp) - 1);
    if (max <= 0) return "0";
    if (isAwakened(player)) return String(max);
    return zhuangshiFindKill(player, max) ? String(max) : "0";
}

// ================================================================
//  破扼
// ================================================================

/** 破扼要不要发动：始终发动（只要还有能打的目标） */
function poeShouldUse(player) {
    player = player || eventPlayer();
    if (!player) return false;
    try {
        if (isAwakened(player)) return game.hasPlayer(current => current != player && get.attitude(player, current) < 0);
        // 觉醒前：队友也可以打（为了凑击杀）
        return game.hasPlayer(current => current != player && current.isAlive());
    } catch (e) {
        return false;
    }
}

/**
 * 破扼杀的目标价值（作为 `ai.effect.target` 挂上去，影响 chooseUseTarget 的选人）。
 *   · 只处理破扼杀（card.storage.sgz_poe_sha）；
 *   · 觉醒前：队友也允许，但只有"这张链上剩下的杀够把它打死"时给正分；
 *   · 觉醒后：队友一律不给（返回 0），敌人按"离死多近"给分。
 */
/**
 * 破扼杀的目标价值（决定"打谁"）。分层写死，优先级一目了然：
 *   觉醒前（一切为了"击杀一名角色"以达成使命）：
 *     ① 能打死的**敌人**   → 120 +（残血加成）   ← 最优：既达成使命又削弱对手
 *     ② 能打死的**其他角色**（队友/中立） → 80     ← 只为了凑击杀，纯损失，非必要不选
 *     ③ 打不死的敌人       → 20（正常输出）
 *     ④ 打不死的其他角色   → 0（完全不碰）
 *   觉醒后（使命已成）：只打敌人
 *     ① 能打死的敌人 → 120 +（残血加成）
 *     ② 打不死的敌人 → 20 + 威胁（越大越先打）
 *     队友一律 0。
 */
function poeTargetValue(card, player, target) {
    try {
        if (!card || !card.storage || !card.storage[POE_SHA]) return 0;
    } catch (e) {
        return 0;
    }
    if (!target || target == player) return 0;
    const enemy = attitude(player, target) < 0;
    const left = poeRemaining(player);
    const killable = canKillWith(player, target, left);
    // 越残血越稳（同一档内再细排）
    const weakBonus = Math.max(0, 6 - (target.hp || 0)) * 2;

    if (isAwakened(player)) {
        if (!enemy) return 0;
        if (killable) return [0, 120 + weakBonus];
        let threaten = 5;
        try {
            threaten = get.threaten(target);
        } catch (e) {}
        return [0, 20 + threaten];
    }
    // 觉醒前
    if (killable) return enemy ? [0, 120 + weakBonus] : [0, 80];
    return enemy ? [0, 20] : 0;
}

// ================================================================
//  竭燃
// ================================================================

/**
 * 竭燃选项：**血不满就回血、血满了就加上限**，但**不能溢出**。
 *   num = 本次造成的伤害值（= 可回复/可加的上限点数）
 *   规则：
 *     · 已经满血 → 上限
 *     · 缺口 ≥ num（回血不浪费）→ 回复
 *     · 缺口 < num（回血会溢出，比如差 1 血却回复 2）→ 上限
 *   上限永远不会溢出，所以"会溢出就选上限"永远不亏。
 */
function jieranOption(player, num) {
    player = player || eventPlayer();
    if (!player) return "上限";
    const gain = Math.max(1, Number(num) || 1);
    const hp = player.hp || 0;
    const maxHp = player.maxHp || hp;
    const deficit = maxHp - hp;
    if (deficit <= 0) return "上限";
    if (deficit >= gain) return "回复";
    return "上限";
}

/** 竭燃弃牌：弃光（多失去牌 → 多触发破扼② → 多出杀） */
function jieranDiscardScore(card) {
    return 100; // 每张都"值得弃"，引擎会按上限弃满
}

// ================================================================
//  技能 ai 表
// ================================================================
export default {
    sgz_zhuangshi: {
        expose: 1,
        threaten: 1.2,
        order: function (item, player) {
            player = player || eventPlayer();
            return zhuangshiChoice(player) != "0" ? 15 : 0;
        },
        result: {
            player: function (player) {
                return zhuangshiChoice(player) != "0" ? 1 : 0;
            },
        },
    },
    sgz_jiefa: {
        expose: 1,
        threaten: 1.15,
    },
    sgz_poe: {
        expose: 1,
        threaten: 1.3,
        effect: {
            target: function (card, player, target) {
                return poeTargetValue(card, player, target);
            },
        },
        result: {
            player: function (player) {
                return poeShouldUse(player) ? 1 : 0;
            },
        },
    },
    sgz_xican: {
        expose: 1,
        threaten: 1.2,
    },
    sgz_jieran: {
        expose: 1,
        threaten: 1.25,
    },
};

// ================================================================
//  给角色文件调用的 AI 函数
// ================================================================
export const helpers = {
    zhuangshiChoice(player) {
        return zhuangshiChoice(player);
    },
    poeShouldUse(player) {
        return poeShouldUse(player);
    },
    jieranOption(player, num) {
        return jieranOption(player, num);
    },
    jieranDiscardScore(card) {
        return jieranDiscardScore(card);
    },
};

// ---- 内联 AI 索引（角色文件里仍**直接写着**的 `.set("ai", …)`；数量由 check_ai_centralized 对账）----
//   ⚠ 这些多是「一行式闭包、依赖技能局部变量」的判定，搬出去要给每个调用点补参数，所以先留原地、只登记；
//     其中少数（如缚渊的 `fuyuanAi`）其实已经转交给 helpers，只是调用点还写着。
//   合计 5 处：sgz_zhuangshi 1、sgz_poe_draw 1、sgz_poe_lose 1、sgz_jieran 2

// ============================================================
//  AI 逻辑说明（纯注释，不参与运行）
// ------------------------------------------------------------
//  【sgz_zhuangshi】壮誓：每名角色准备阶段可发动，失去 X 点体力 → 摸 X 张牌（被破扼①换成 X 张杀）。
//    · 觉醒前：X 取"体力−1"（最大）；只有**扣满后能稳杀一个人**才发动，否则 0。
//      目标范围＝其他所有人（忠臣排除主公，队友也算）。
//    · 觉醒后：**始终发动、扣满**；目标只算敌人。
//  【sgz_jiefa】竭伐（使命/觉醒）：expose 1 / threaten 1.15；击杀一名角色后觉醒得【竭燃】。
//  【sgz_poe】破扼：**始终发动**；ai.effect.target 明确分层：觉醒前 能杀的敌人(120) > 能杀的其他人(80) > 打不死的敌人(20) > 其他(0)；
//    觉醒后只打敌人（能杀的 120 + 残血加成，否则 20 + 威胁）。
//  【sgz_xican】檄残：加伤/不可响应的规则技，AI 只把它算进"能不能杀"的估算里。
//  【sgz_jieran】竭燃：能放就放；**血不满且回血不溢出就回复，否则加上限**（溢出就选上限）；弃牌**弃光**换更多破扼杀。
// ============================================================
