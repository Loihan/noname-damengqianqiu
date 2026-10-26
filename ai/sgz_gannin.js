// ============================================================
//  sgz_gannin · 技能 AI（本文件的 AI 是**唯一来源**）
//  ⚠ 角色文件里只写 `ai: AI.<技能id>`；子技能用注册后的完整 id（`父技能_子技能`）。
//  ⚠ 这里只放**纯 AI 数据/函数**（引擎直接读 `lib.skill[id].ai`），不要有副作用。
//
//  口径（需求定稿）：
//    · 劫营目标：**只看威胁度 + 身份**（反贼→主公，忠臣→最强敌人，主公/内奸→最强敌人）。
//      不需要避开"手牌为 0"的人（那样每次用牌都能白嫖 1 点伤害）。
//    · 装备政策：有装备就装上（用出去才有收益）；**低价值装备先上、重要装备后上**
//      （因为先上的会被顶掉）；**诸葛连弩永不顶掉**，古锭刀次之（甘宁）。
//    · 隐匿（夜魇）：唯一的博弈是"要不要在本轮造成第一次伤害"。
//      摘了之后不再保守，正常打即可。
// ============================================================

const KEY_EQUIPS = ["zhuge", "gudingdao"]; // 诸葛连弩 > 古锭刀（甘宁）

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

function isLord(target) {
    try {
        return target.isZhu || target == game.zhu;
    } catch (e) {
        return false;
    }
}

// ================================================================
//  劫营：给谁
// ================================================================

/** 劫营目标分：身份优先 + 威胁 */
function jieyingTargetScore(player, target) {
    if (!target || target == player) return -999;
    if (attitude(player, target) >= 0) return -999; // 只给敌对角色
    let score = 0;
    const id = (player && player.identity) || "";
    if (id == "fan" && isLord(target)) score += 500; // 反贼：主公
    if (id == "zhong" && isLord(target)) score -= 500; // 忠臣：绝不给主公
    let threaten = 5;
    try {
        threaten = get.threaten(target);
    } catch (e) {}
    score += threaten * 3;
    score += Math.max(0, 6 - (target.hp || 0)) * 4; // 残血优先（更容易被打死）
    return score;
}

// ================================================================
//  装备政策（甘宁/小乔通用，key 列表不同）
// ================================================================

function equipPriority(name, keyList) {
    const idx = keyList.indexOf(name);
    if (idx >= 0) return 100 - idx * 10; // 连弩 100、古锭刀 90
    return 10; // 其它装备
}

function equipOrder(card, player, num, keyList) {
    if (!card) return num;
    let type = "";
    try {
        type = get.type(card, player);
    } catch (e) {}
    if (type != "equip") return num;
    const name = get.name(card, player);
    // 已装备区的同类牌
    let sameSlot = [];
    try {
        const subs = get.subtypes(card, player) || [];
        sameSlot = player.getCards("e").filter(c => (get.subtypes(c, player) || []).some(s => subs.includes(s)));
    } catch (e) {}
    const key0 = keyList[0];
    // 已经装着连弩 → 任何装备都不顶
    if (key0 && sameSlot.some(c => get.name(c, player) == key0)) return 0;
    // 已经装着次一级装备（古锭刀）→ 只有连弩能顶
    if (keyList[1] && sameSlot.some(c => get.name(c, player) == keyList[1]) && name != key0) return 0;
    // 否则：低价值先上（order 高）、重要装备后上（order 低）
    return num + (100 - equipPriority(name, keyList)) / 10;
}

// ================================================================
//  隐匿：要不要在本轮打出第一张伤害牌
// ================================================================

/** 本轮"造成过伤害"= 夜魇已失效 = 已脱离隐匿 */
function hiddenBroken(player) {
    try {
        return !!player.storage.sgz_yeyan_broken;
    } catch (e) {
        return false;
    }
}

/** 她之后本轮还有多少敌对角色会行动 */
function enemiesAfter(player) {
    let n = 0;
    try {
        const players = game.players.filter(p => p.isAlive());
        const idx = players.indexOf(player);
        for (let i = idx + 1; i < players.length; i++) {
            const p = players[i];
            if (p != player && attitude(player, p) < 0) n++;
        }
    } catch (e) {}
    return n;
}

/** 场上是否还有「劫营」标记（没有标记就绝不破隐匿） */
function hasJieyingMark() {
    try {
        return game.hasPlayer(p => p && p.hasSkill && p.hasSkill("sgz_jieying_skip"));
    } catch (e) {
        return false;
    }
}

/**
 * 摘不摘隐匿（**保守版**）：
 *   · 场上没有劫营标记 → 绝不摘（破了也没收益，单纯白挨打）；
 *   · 收益 = 手里伤害牌数 × 3 + 1.5
 *   · 风险 = 后面还要行动的敌人数 × 9 + (4 − 体力 − 护甲) × 5
 *   · 必须 **收益 ≥ 风险 + 4** 才摘（留安全边际）；已摘则不再限制。
 */
function shouldBreakHidden(player) {
    player = player || eventPlayer();
    if (!player) return false;
    if (hiddenBroken(player)) return true;
    if (!hasJieyingMark()) return false; // 没有劫营标记：说什么都不破
    const hp = (player.hp || 0) + (player.hujia || 0);
    const risk = enemiesAfter(player) * 9 + Math.max(0, 4 - hp) * 5;
    let dmg = 0;
    try {
        dmg = player.countCards("h", card => get.tag(card, "damage") > 0);
    } catch (e) {}
    const gain = dmg * 3 + 1.5;
    return gain >= risk + 4;
}

export default {
    sgz_jieying: {
        expose: 1,
        threaten: 1.2,
    },
    sgz_yeyan: {
        expose: 1,
        threaten: 1.35,
    },
};

/**
 * 装备的"使用价值"：引擎自带评估会说"顶掉旧装备不划算"（同栏已有牌时给负分），
 * 但甘宁/小乔的装备是**用出去就有收益**，所以这里强行抬高使用价值。
 * 仍然遵守保护：已装连弩（甘宁还有古锭刀）时不顶。
 */
function equipUseful(card, player, num, keyList) {
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
    const key0 = keyList[0];
    if (key0 && sameSlot.some(c => get.name(c, player) == key0)) return 0; // 不顶连弩
    if (keyList[1] && sameSlot.some(c => get.name(c, player) == keyList[1]) && name != key0) return 0; // 不顶古锭刀
    return num + 12; // 顶！用出去才有收益
}

export const helpers = {
    sgz_equip_useful(card, player, num) {
        return equipUseful(card, player, num, KEY_EQUIPS);
    },
    sgz_jieying_target(player, target) {
        return jieyingTargetScore(player, target);
    },
    sgz_gannin_equipOrder(card, player, num) {
        return equipOrder(card, player, num, KEY_EQUIPS);
    },
    sgz_shouldBreakHidden(player) {
        return shouldBreakHidden(player);
    },
};

// ---- 内联 AI 索引 ----
//   合计 1 处：sgz_jieying 的选人（已转交 helpers.sgz_jieying_target）

// ============================================================
//  AI 逻辑说明（纯注释，不参与运行）
// ------------------------------------------------------------
//  【sgz_jieying】劫营（expose 1 / threaten 1.2）
//    · 目标只看"身份 + 威胁"：反贼给主公、忠臣给最强敌人、主公/内奸给最强敌人；
//      不避开手牌为 0 的人（那样每次用牌都能白嫖 1 点伤害）。
//    · 装备：低价值先上、重要装备后上；**诸葛连弩永不顶**、古锭刀次之。
//  【sgz_yeyan】夜魇（expose 1 / threaten 1.35）
//    · 隐匿期间是"强化版第一刀"（+1 伤、无距离、不可响应、还免疫单体指定）。
//    · 摘不摘：收益（可打伤害×3 + 偷牌×1.5）> 风险（后面敌人数×6 + 缺血×4）才摘；
//      摘了就正常打，不再保守。
// ============================================================