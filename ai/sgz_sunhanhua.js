// ============================================================
//  sgz_sunhanhua · 技能 AI（本文件的 AI 是**唯一来源**）
//  ⚠ 角色文件里只写 `ai: AI.<技能id>`；子技能用注册后的完整 id（`父技能_子技能`）。
//  ⚠ 这里只放**纯 AI 数据/函数**（引擎直接读 `lib.skill[id].ai`），不要有副作用。
//
//  设计口径（按需求定稿）：
//    · 妙剑牌②③本身"无次数距离限制"，是**最强的牌**：能用就直接用（装备就顶装备），
//      ④（消耗 1 蓄力点把妙剑牌变成任意非装备牌）只在"妙剑牌已经用不出去"时才考虑。
//    · ④ 只在五种场景下值得转化（见 miaojianConvertScore）：
//        1) 妙剑 ≥4：主动转伤害牌打人（只用于进攻）
//        2) 有敌人**没有手牌**且 妙剑数 ≥ 其体力：转伤害牌打他
//        3) 转【闪】只在"这道杀伤害 >1（有加伤）"时；1 点伤害永远不闪
//        4) 只有自己被【乐不思蜀】才转【无懈】，其余不转
//        5) 自己濒死 → 无条件转【桃】；队友濒死 → 不耗尽妙剑才救（忠臣救主公例外，无条件）
//    · 莲华：妙剑 <5 时挨打是正收益；被 1 点伤害的【杀】打永远不出【闪】。
// ============================================================

const MJ = "sgz_miaojian";

function eventPlayer() {
    try {
        if (typeof _status != "undefined" && _status.event && _status.event.player) return _status.event.player;
    } catch (e) {}
    return null;
}

function markCount(player) {
    try {
        return player.countMark(MJ);
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

/** 妙剑区里**还能正常使用/打出**的牌数（>0 就说明"先用牌，别转化"） */
function usableMiaojianCount(player) {
    let cards = [];
    try {
        cards = player.getCards("h").filter(card => card.hasGaintag && card.hasGaintag(MJ));
    } catch (e) {
        return 0;
    }
    let ask = null;
    try {
        const evt = _status.event;
        const parent = evt && evt.getParent ? evt.getParent() : null;
        if (parent && typeof parent.filterCard == "function") ask = parent;
    } catch (e) {}
    if (!ask) return 0; // 找不到询问事件时**不拦**（否则会像之前那样"永远不转化"）
    return cards.filter(card => {
        try {
            return ask.filterCard(card, player, ask);
        } catch (e) {
            return false;
        }
    }).length;
}

/** 本回合是否已经受到过伤害（莲华② 每回合限一次，没受过才有"刷妙剑"的价值） */
function damagedThisTurn(player) {
    try {
        return player.hasHistory("damage", evt => evt.player == player);
    } catch (e) {
        return true;
    }
}

/** 普通（非妙剑）手牌数 */
function normalHandCount(player) {
    try {
        return player.getCards("h").filter(card => !(card.hasGaintag && card.hasGaintag(MJ))).length;
    } catch (e) {
        return 0;
    }
}

/**
 * 能不能"转化【火攻】打自己"来刷新妙剑：
 *   · 妙剑区里已经没有能正常打出的牌（闸门已过）
 *   · 手里还有**别的普通手牌**（火攻需要同花色牌来丢，否则连伤害都打不出来）
 *   · 本回合还没受过伤（莲华② 每回合限一次，没受过才有收益）
 *   · 体力 ≥ 2（别把自己烧进濒死）
 */
function shouldSelfFire(player) {
    player = player || eventPlayer();
    if (!player) return false;
    if (markCount(player) <= 0) return false;
    if (usableMiaojianCount(player) > 0) return false;
    if (normalHandCount(player) <= 0) return false;
    if (damagedThisTurn(player)) return false;
    return (player.hp || 0) >= 2;
}

/** 妙剑④：这张牌值不值得"消耗 1 蓄力点 + 一张妙剑牌"转化出来 */
function miaojianConvertScore(button, player) {
    player = player || eventPlayer();
    if (!player || !button || !button.link) return 0;
    const name = Array.isArray(button.link) ? button.link[2] : button.link;
    if (!name) return 0;
    const marks = markCount(player);
    if (marks <= 0) return 0;
    // ⚠ 需求①的前提：**妙剑里的牌只要还有能正常打出的，就先打出去**，
    //   直到剩下的全是【闪】【无懈】这类打不出去的牌，才考虑转化。
    if (usableMiaojianCount(player) > 0) return 0;
    const base = 10 + marks; // 同场景下优先用价值稍高的转化牌

    // ⚠ 需求①补充：本回合还没受到过伤害 → 可以转化【火攻】打自己，
    //   触发莲华② 再拿 1 点蓄力点（= 刷新一张妙剑牌）。
    if (name == "huogong") return shouldSelfFire(player) ? base + 75 : 0;

    // ---- 5) 濒死求桃 ----
    if (name == "tao") {
        let dying = null;
        try {
            dying = (_status.dying && _status.dying.length && _status.dying[0]) || null;
        } catch (e) {}
        if (!dying) return 0;
        if (dying == player) return base + 90; // 自己：无条件救
        // 忠臣救主公：无条件
        try {
            if (player.identity == "zhong" && isLord(player, dying)) return base + 90;
        } catch (e) {}
        const need = Math.max(1, 1 - (dying.hp || 0)); // 救回他还要几张桃
        if (marks - need >= 1) return base + 60; // 不耗尽妙剑才救
        return 0;
    }

    // ---- 4) 无懈：只解自己的【乐不思蜀】 ----
    if (name == "wuxie") {
        let card = null;
        try {
            const parent = _status.event && _status.event.getParent ? _status.event.getParent() : null;
            card = parent && parent.card;
        } catch (e) {}
        if (card && card.name == "lebu") return base + 80;
        return 0;
    }

    // ---- 3) 闪：只躲"伤害 >1"的杀 ----
    if (name == "shan") {
        let num = 1;
        try {
            const parent = _status.event && _status.event.getParent ? _status.event.getParent() : null;
            num = (parent && parent.num) || 1;
        } catch (e) {}
        return num > 1 ? base + 50 : 0;
    }

    // ---- 1) / 2) 伤害牌：进攻用 ----
    let damaging = false;
    try {
        damaging = get.tag({ name: name }, "damage") > 0;
    } catch (e) {}
    if (!damaging) return 0;
    if (marks >= 4) return base + 70; // 妙剑已经很厚：主动转伤害
    let noHandEnemy = null;
    try {
        game.countPlayer(current => {
            if (current != player && get.attitude(player, current) < 0 && current.countCards("h") == 0) noHandEnemy = current;
        });
    } catch (e) {}
    if (noHandEnemy && marks >= (noHandEnemy.hp || 1)) return base + 65;
    return 0;
}

export default {
    sgz_miaojian: {
        expose: 1,
        threaten: 1.3,
    },
    sgz_lianhua: {
        expose: 1,
        threaten: 1.2,
        // 妙剑 <5 时挨打是正收益（能涨蓄力点）；1 点伤害不闪
        useShan: false,
        effect: {
            target: function (card, player, target) {
                if (target != player) return;
                if (!card || get.tag(card, "damage") <= 0) return;
                if (markCount(player) < 5) return [1, 3];
            },
        },
    },
};

export const helpers = {
    sgz_miaojian_convertScore(button, player) {
        return miaojianConvertScore(button, player);
    },
    /** 这一发【火攻】是不是"打自己刷妙剑"（角色文件用它把目标限制成自己） */
    sgz_miaojian_shouldSelfFire(player) {
        return shouldSelfFire(player);
    },
};

// ---- 内联 AI 索引（角色文件里仍**直接写着**的 `.set("ai", …)`；数量由 check_ai_centralized 对账）----
//   ⚠ 这些多是「一行式闭包、依赖技能局部变量」的判定，搬出去要给每个调用点补参数，所以先留原地、只登记；
//     其中少数（如缚渊的 `fuyuanAi`）其实已经转交给 helpers，只是调用点还写着。
//   合计 0 处（对应角色文件里已经没有内联 AI 了）

// ============================================================
//  AI 逻辑说明（纯注释，不参与运行）
// ------------------------------------------------------------
//  【sgz_miaojian】妙剑（expose 1 / threaten 1.3）
//    · 妙剑牌本身"无次数距离限制"⇒ 能用就直接用（装备牌也顶上去），不轻易转化。
//    · ④ 转化只在：妙剑≥4 主动输出 / 无手牌敌人且妙剑≥其体力 / 伤害>1 的杀才闪 /
//      只解自己的乐 / 濒死救自己或"不耗尽妙剑"地救队友（忠臣救主公无条件）。
//  【sgz_lianhua】莲华（expose 1 / threaten 1.2）
//    · `useShan: false`：1 点伤害的【杀】永远不闪（①本来就会弃牌换护甲，挨了不亏）。
//    · `effect.target`：妙剑 <5 时，受到的伤害按"正收益"评估（挨打涨蓄力点）。
// ============================================================
