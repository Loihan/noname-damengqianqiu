// ============================================================
//  sgz_duyu · 技能 AI（本文件的 AI 是**唯一来源**）
//  ⚠ 角色文件里只写 `ai: AI.<技能id>`；子技能用注册后的完整 id（`父技能_子技能`）。
//  ⚠ 这里只放**纯 AI 数据/函数**（引擎直接读 `lib.skill[id].ai`），不要有副作用。
//
//  设计要点（2026 版）：
//    · 谏国：取几张是**随体力变化的连续函数**，不是 1/2/3 三档表；
//            并且利用"先摸牌、后掉血"的结算顺序——本次能凑满名录时，倾势会先觉醒
//            （+3 上限、回满），掉血发生在回满之后，所以敢取满。
//    · 三陈：1 级 防具 > 武器 > 坐骑；2 级·失败 武器 > 防具 > 坐骑；2 级·成功 防具 > 武器 > 坐骑。
//            "该栏已满且未达 3 栏"＝白赚栏位，优先级最高；防具栏 3 栏都装满了才转武器。
//    · 神武：绝对强度 70% + 情境 30%；另外给「赤炎镇魂琴 + 七彩神鹿」开**配对例外**，
//            配对加成 70 分 > 栏位顺序惩罚(≤15) + 强度差(≤46)，所以一旦可配对，
//            坐骑会越过栏位优先级被选中。
// ============================================================

// ---------------------------------------------------------------- 牌名价值（谏国选牌用）
// T0 杀/桃 > T1 南蛮·万箭（AOE 造成伤害 → 武库再摸牌+陈令，一张牌两份收益）
// > T1.5 乐不思蜀（单独提权：强控） > T2 无中/顺手/决斗/无懈 > T3 闪/拆/借刀/五谷/桃园 > T4 其它延时锦囊
const CARD_VALUE = {
    sha: 100,
    tao: 100,
    nanman: 85,
    wanjian: 85,
    lebu: 78,
    wuzhong: 70,
    shunshou: 68,
    juedou: 66,
    wuxie: 62,
    shan: 55,
    guohe: 54,
    jiedao: 50,
    wugu: 48,
    taoyuan: 46,
    bingliang: 25,
    shandian: 20,
};

// ---------------------------------------------------------------- 神武强度表（可手调）
// 口径：防具 奇门八卦 > 国风玉袍 > 七星袍；武器 刑天破军斧 > 姬神弓 > 赤炎镇魂琴 > …
const SHENWU_SCORE = {
    // 武器
    duyusw_xingtianpojunfu: 100,
    duyusw_jishengong: 92,
    duyusw_chiyanzhenhunqin: 88,
    duyusw_guilongzhanyuedao: 84,
    duyusw_chixueqingfeng: 78,
    duyusw_xiuluolianyuji: 72,
    duyusw_luanfenghemingjian: 66,
    duyusw_wushuangfangtianji: 60,
    duyusw_jinwuluorigong: 56,
    // 防具
    duyusw_qimenbagua: 100,
    duyusw_guofengyupao: 95,
    duyusw_qixingpao: 88,
    duyusw_xieshenmianju: 78,
    duyusw_baihuaqun: 74,
    duyusw_hongmianbaihuapao: 70,
    duyusw_shengguangbaiyi: 62,
    duyusw_sanshou: 58,
    duyusw_linglongshimandai: 54,
    // 坐骑
    duyusw_qicaishenlu: 100,
    duyusw_mengyanchitu: 92,
    duyusw_juechenjinge: 70,
};

// 神武所属装备栏（三陈只出 equip1~equip4；equip5 的 4 件永远不会出现在候选里）
const SHENWU_SLOT = {
    duyusw_xingtianpojunfu: "equip1",
    duyusw_jishengong: "equip1",
    duyusw_chiyanzhenhunqin: "equip1",
    duyusw_guilongzhanyuedao: "equip1",
    duyusw_chixueqingfeng: "equip1",
    duyusw_xiuluolianyuji: "equip1",
    duyusw_luanfenghemingjian: "equip1",
    duyusw_wushuangfangtianji: "equip1",
    duyusw_jinwuluorigong: "equip1",
    duyusw_qimenbagua: "equip2",
    duyusw_guofengyupao: "equip2",
    duyusw_qixingpao: "equip2",
    duyusw_xieshenmianju: "equip2",
    duyusw_baihuaqun: "equip2",
    duyusw_hongmianbaihuapao: "equip2",
    duyusw_shengguangbaiyi: "equip2",
    duyusw_sanshou: "equip2",
    duyusw_linglongshimandai: "equip2",
    duyusw_qicaishenlu: "equip4",
    duyusw_mengyanchitu: "equip3",
    duyusw_juechenjinge: "equip3",
};

// 「赤炎镇魂琴 + 七彩神鹿」配对（单个都弱，合起来每次伤害 +1/+2）
const PAIR_A = "duyusw_chiyanzhenhunqin";
const PAIR_B = "duyusw_qicaishenlu";
const PAIR_BONUS = 70; // > 栏位惩罚(≤15) + 强度差(≤46)，保证越过栏位顺序
const PAIR_POTENTIAL = 25; // 两件都能拿、且陈令够再发一次（≥6）
const PAIR_WEAK = 2; // 只能拿到一件：单个没什么用（不足以压过"防具+15"）

// ---------------------------------------------------------------- 小工具
function duyuAttitude(player, target) {
    try {
        return get.attitude(player, target);
    } catch (e) {
        return 0;
    }
}

function duyuCardName(name) {
    if (Array.isArray(name)) return name[2];
    if (name && typeof name === "object") return name.name;
    return name;
}

function duyuSlotCapacity(player, slot) {
    try {
        return player.countEnabledSlot(slot);
    } catch (e) {
        return 1;
    }
}

function duyuSlotUsed(player, slot) {
    try {
        return player.getVEquips(slot).length;
    } catch (e) {
        try {
            return player.getCards("e").filter(card => (get.subtypes(card) || []).includes(slot)).length;
        } catch (e2) {
            return 0;
        }
    }
}

function duyuSlotFull(player, slot) {
    return duyuSlotUsed(player, slot) >= duyuSlotCapacity(player, slot);
}

/** 手里或装备区是否已有某张牌 */
function duyuOwnsCard(player, name) {
    try {
        return player.getCards("he").some(card => card.name == name);
    } catch (e) {
        return false;
    }
}

function duyuEnemyCount(player) {
    try {
        return game.countPlayer(current => current != player && get.attitude(player, current) < 0);
    } catch (e) {
        return 0;
    }
}

// ================================================================
//  谏国
// ================================================================

/** 单个牌名的价值 */
function duyuCardValue(name) {
    name = duyuCardName(name);
    if (!name) return 0;
    if (CARD_VALUE[name] != undefined) return CARD_VALUE[name];
    let type = "";
    try {
        type = get.type(name);
    } catch (e) {
        return 30;
    }
    if (type == "delay") return 20;
    if (type == "basic") return 40;
    if (type == "trick") return 42;
    return 30;
}

/**
 * 谏国的计划：取几种（count）+ 取哪几种（names）。
 *
 * 结算顺序（角色文件 sgz_jianguo.content）：
 *   先 gain 牌 → 倾势 gainAfter 记录（够了就觉醒：+3 上限、回满）→ 再 +1 上限 → 最后 loseHp(X-1)。
 * 所以：
 *   · 本次能凑满名录（need <= maxPick）→ **取满**：觉醒先回满，再掉血，安全；
 *   · 否则用净值函数选 X：牌数净收益 + 上限价值 − 掉血风险；
 *     禁选"扣完会濒死"的 X（濒死会走倾势·失败分支清空记录，按需求**不主动**触发）。
 */
function duyuJianguoPlan(player, cardList, maxPick) {
    const list = Array.isArray(cardList) ? cardList.slice(0) : [];
    const need = list.length; // 未记录的非装备牌名
    const cap = Math.max(1, Math.min(Number(maxPick) || 1, need));
    const hp = player.getHp();

    if (need <= cap) {
        return { count: need, names: duyuPickNames(player, list, need), awaken: true };
    }

    let bestX = 1;
    let bestScore = -Infinity;
    const handWeight = player.countCards("h") <= 1 ? 1.5 : 1;
    for (let x = 1; x <= cap; x++) {
        const hpLeft = hp - (x - 1);
        if (hpLeft <= 0) continue; // 会濒死 → 失败分支清空记录，禁选
        const risk = hpLeft >= 3 ? 0 : hpLeft == 2 ? 0.5 : 2;
        const score = (x - 2) * handWeight + (x >= 2 ? 2.5 : 0) - risk;
        if (score > bestScore + 1e-9) {
            bestScore = score;
            bestX = x;
        }
    }
    return { count: bestX, names: duyuPickNames(player, list, bestX), awaken: false };
}

/** 从候选牌名里按价值取前 n 个 */
function duyuPickNames(player, list, n) {
    return list
        .slice(0)
        .sort((a, b) => duyuCardValue(b) - duyuCardValue(a))
        .slice(0, Math.max(0, n));
}

/**
 * 要不要发动谏国。
 * 判据：如果计划只能取 1 种（=拿 1 张换掉摸牌 2 张，且不涨上限），就不发动；
 *       取 2 种及以上（+1 上限）才发。
 */
function duyuJianguoShouldUse(player, cardList, maxPick) {
    const plan = duyuJianguoPlan(player, cardList, maxPick);
    return plan.count >= 2;
}

/** 选牌时给每张一个分数（>0 选、<0 不选） */
function duyuJianguoPickScore(name, tops) {
    name = duyuCardName(name);
    if (!Array.isArray(tops) || !tops.includes(name)) return -1;
    return 5 + duyuCardValue(name) / 100;
}

// ================================================================
//  三陈
// ================================================================

/**
 * 选哪一类装备栏。
 * @param {Array} avail [{slot, name, candidates, full}]
 * @param {Object} candidateMap slot -> 候选牌名
 * @param {Object} player
 * @param {boolean} level2 是否觉醒后（神武形态）
 * @param {boolean} failed 倾势是否走了失败分支
 */
function duyuSanchenSlotChoice(avail, candidateMap, player, level2, failed) {
    if (!Array.isArray(avail) || !avail.length) return null;
    const order = level2 && failed ? ["equip1", "equip2", "equip3", "equip4"] : ["equip2", "equip1", "equip3", "equip4"];
    let best = null;
    let bestScore = -Infinity;
    for (const option of avail) {
        const slot = option.slot;
        let score = 60 - 10 * Math.max(0, order.indexOf(slot));
        const full = option.full != undefined ? option.full : duyuSlotFull(player, slot);
        const capacity = duyuSlotCapacity(player, slot);
        if (full && capacity < 3) score += 20; // 白赚一个永久装备栏
        if (!full && duyuSlotUsed(player, slot) == 0) score += 10; // 补短板：这一类还是空的
        if (full && capacity >= 3) score -= 30; // 3 栏装满 → 拿了也装不上
        const candidates = (candidateMap && candidateMap[slot]) || option.candidates || [];
        if (candidates.length == 1) score += 2;
        if (score > bestScore) {
            bestScore = score;
            best = option;
        }
    }
    return best ? best.name : null;
}

/** 情境修正：只看"看得出来的信号" */
function duyuShenwuSituational(name, player) {
    let bonus = 0;
    const enemies = [];
    try {
        game.countPlayer(current => {
            if (current != player && get.attitude(player, current) < 0) enemies.push(current);
        });
    } catch (e) {}
    const shaPressure = enemies.filter(t => {
        try {
            return t.countCards("h", "sha") > 0;
        } catch (e) {
            return false;
        }
    }).length;
    const hand = player.countCards("h");
    const hp = player.getHp();
    if (name == "duyusw_qimenbagua" && shaPressure >= 2) bonus += 10;
    if (name == "duyusw_guofengyupao" && enemies.length >= 3) bonus += 12;
    if ((name == "duyusw_hongmianbaihuapao" || name == "duyusw_qixingpao") && enemies.length >= 2) bonus += 8;
    if (name == "duyusw_xieshenmianju" && hp <= 2) bonus += 8;
    if (name == "duyusw_baihuaqun" && hp <= 2) bonus += 8;
    if (name == "duyusw_shengguangbaiyi" && hand >= 4) bonus += 8;
    if (name == "duyusw_jishengong" && player.countCards("h", card => ["nanman", "wanjian"].includes(card.name)) > 0) bonus += 10;
    if (name == "duyusw_xingtianpojunfu" && hand >= 4) bonus += 8;
    if (name == "duyusw_guilongzhanyuedao" && player.countCards("h", card => get.color(card) == "red") >= 3) bonus += 8;
    return bonus;
}

/**
 * 选哪一件神武（2 级觉醒后）。
 * @param {Object} button 引擎按钮对象（link = ["", "", 牌名] 或牌名）
 * @param {Object} player
 * @param {Array} flat 当前候选的全部神武牌名
 */
function duyuSanchenShenwuScore(button, player, flat) {
    const name = duyuCardName(button && button.link != undefined ? button.link : button);
    if (!name) return 0;
    let score = SHENWU_SCORE[name] != undefined ? SHENWU_SCORE[name] : 60;
    const slot = SHENWU_SLOT[name] || null;
    const failed = !!(player.storage && player.storage.sgz_duyu_qingshi_fail);

    if (slot) {
        score += failed
            ? slot == "equip1"
                ? 15
                : slot == "equip2"
                  ? 10
                  : 0
            : slot == "equip2"
              ? 15
              : slot == "equip1"
                ? 10
                : 0;
        const capacity = duyuSlotCapacity(player, slot);
        if (duyuSlotFull(player, slot) && capacity < 3) score += 20; // 白赚栏位
        if (duyuSlotFull(player, slot) && capacity >= 3) score -= 20; // 装了也装不上
    }

    // 配对例外：赤炎镇魂琴 + 七彩神鹿
    const list = Array.isArray(flat) ? flat : [];
    const ownA = duyuOwnsCard(player, PAIR_A);
    const ownB = duyuOwnsCard(player, PAIR_B);
    const bothAvailable = list.includes(PAIR_A) && list.includes(PAIR_B);
    let marks = 0;
    try {
        marks = player.countMark("sgz_chenling");
    } catch (e) {}
    if (name == PAIR_A || name == PAIR_B) {
        const partnerOwned = name == PAIR_A ? ownB : ownA;
        if (partnerOwned) score += PAIR_BONUS;
        else if (bothAvailable && marks >= 6) score += PAIR_POTENTIAL;
        else score += PAIR_WEAK;
        if (name == PAIR_B) score += 8; // 属伤体系：单件也略微值钱
    }

    score += duyuShenwuSituational(name, player);
    return score + Math.random() * 0.01; // 同分随机，避免每次都同一件
}

/** 三陈的发动优先级（有 3 枚陈令就有价值；能补栏时更靠前） */
function duyuSanchenOrder(player) {
    if (!player) return 0;
    try {
        if (player.countMark("sgz_chenling") < 3) return 0;
    } catch (e) {
        return 0;
    }
    let bonus = 0;
    for (const slot of ["equip1", "equip2", "equip3", "equip4"]) {
        if (duyuSlotFull(player, slot) && duyuSlotCapacity(player, slot) < 3) bonus = 5;
    }
    return 15 + bonus;
}

// ================================================================
//  灭吴
// ================================================================

/** 处决谁：威胁越大越杀；牌越多越赚；快死的杂鱼不浪费；最后一个敌人直接杀 */
function duyuMiewuTarget(player, target) {
    if (!target || target == player) return 0;
    if (duyuAttitude(player, target) >= 0) return 0;
    if (duyuEnemyCount(player) <= 1) return -999;
    let threaten = 5;
    try {
        threaten = get.threaten(target);
    } catch (e) {}
    let cards = 0;
    try {
        cards = target.getCards("hej").length;
    } catch (e) {}
    const weakPenalty = target.hp <= 1 ? 5 : 0;
    return -(threaten * 2) - cards * 0.5 - weakPenalty;
}

// ================================================================
//  技能 ai 表
// ================================================================
export default {
    sgz_wuku: {
        expose: 1,
        threaten: 1.2,
    },
    sgz_jianguo: {
        expose: 1,
        threaten: 1.1,
        order: 8,
        result: {
            player: 1,
        },
    },
    sgz_pozhu: {
        expose: 1,
        threaten: 1.15,
    },
    sgz_sanchen: {
        expose: 1,
        threaten: 1.1,
        order: function (item, player) {
            return duyuSanchenOrder(player || (typeof _status != "undefined" && _status.event ? _status.event.player : null));
        },
        result: {
            player: 1,
        },
    },
    sgz_qingshi: {
        expose: 1,
        threaten: 1.05,
    },
    sgz_miewu: {
        expose: 1,
        threaten: 1.6,
        order: 1000,
        result: {
            target: function (player, target) {
                return duyuMiewuTarget(player, target);
            },
        },
    },
};

// ================================================================
//  给角色文件调用的 AI 函数（不是 ai 表，但同样只给 AI 用）
// ================================================================
export const helpers = {
    jianguoPlan: function (player, cardList, maxPick) {
        return duyuJianguoPlan(player, cardList, maxPick);
    },
    jianguoShouldUse: function (player, cardList, maxPick) {
        return duyuJianguoShouldUse(player, cardList, maxPick);
    },
    jianguoPickScore: function (name, tops) {
        return duyuJianguoPickScore(name, tops);
    },
    sanchenSlotChoice: function (avail, candidateMap, player, level2, failed) {
        return duyuSanchenSlotChoice(avail, candidateMap, player, level2, failed);
    },
    sanchenShenwuScore: function (button, player, flat) {
        return duyuSanchenShenwuScore(button, player, flat);
    },

};

// ---- 内联 AI 索引（角色文件里仍**直接写着**的 `.set("ai", …)`；数量由 check_ai_centralized 对账）----
//   ⚠ 这些多是「一行式闭包、依赖技能局部变量」的判定，搬出去要给每个调用点补参数，所以先留原地、只登记；
//     其中少数（如缚渊的 `fuyuanAi`）其实已经转交给 helpers，只是调用点还写着。
//   合计 4 处：sgz_jianguo 2、sgz_sanchen 2

// ============================================================
//  AI 逻辑说明（纯注释，不参与运行）
// ------------------------------------------------------------
//  【sgz_wuku】武库（锁定）：expose 1 / threaten 1.2 —— 摸牌引擎，别人会略高估它。
//  【sgz_jianguo】谏国：order 8；取几张由 helpers.jianguoPlan 的净值函数决定
//    （牌数净收益 + 上限价值 2.5 − 掉血风险；扣完≤0 一律禁选，因为会走倾势·失败分支清空记录）；
//    本次能凑满名录 → 取满（先觉醒回满、后掉血，安全）。
//  【sgz_pozhu】破竹（锁定）：expose 1 / threaten 1.15 —— 无限次数/距离 + 回复/摸牌。
//  【sgz_sanchen】三陈：order 15（能补栏时 20）；选栏位 1 级 防具>武器>坐骑，
//    2 级·失败 武器>防具>坐骑、2 级·成功 防具>武器>坐骑；"已满且<3 栏"＝白赚栏位 +20，
//    "3 栏装满"＝-30 才转下一类。神武 = 强度表 + 情境修正 + 琴/鹿配对例外(+70)。
//  【sgz_qingshi】倾势（觉醒·强制）：expose 1 / threaten 1.05，无决策点。
//  【sgz_miewu】灭吴：order 1000（能用就用）；result.target = -(威胁×2) - 牌数×0.5
//    -（残血 5）；只剩一个敌人时 -999（杀完就赢）。
// ============================================================
