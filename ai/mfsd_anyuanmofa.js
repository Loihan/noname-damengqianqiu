// ============================================================
//  mfsd_anyuanmofa · 技能 AI（本文件的 AI 是**唯一来源**）
//  ⚠ 角色文件里只写 `ai: AI.<技能id>`；子技能用注册后的完整 id（`父技能_子技能`）。
//  ⚠ 这里只放**纯 AI 数据/函数**（引擎直接读 `lib.skill[id].ai`），不要有副作用。
// ============================================================
export default {
    mfsd_guishi: {
        // 留牌价值 (决定弃牌阶段留什么)
        value: function(card, player) {
            // 如果是伤害类卡牌（杀、决斗、南蛮等），大幅提升保留价值
            if (get.tag(card, 'damage')) return get.value(card, player) + 20;
            // 如果是防御/回复类卡牌（闪、无懈、桃），价值归零（诱导弃置）
            if (get.tag(card, 'respondShan') || get.tag(card, 'recover') || card.name == 'wuxie') return 0;
            // 装备牌和其他功能牌保留价值极低
            return get.value(card, player) * 0.1;
        },
        // 使用价值 (决定出牌阶段用什么)
        useful: function(card, player) {
            // 极度倾向于使用伤害牌
            if (get.tag(card, 'damage')) return get.useful(card, player) + 20;
            // 非伤害类牌的使用欲望减半
            return get.useful(card, player) * 0.5;
        },
        // 配合“只攻不防”：告诉AI即便没闪也没关系，反正有鬼噬
        noShan: true,
        threaten: 2.5
    },
    // ⚠ 原角色文件里这个技能写了**两份 ai**：下面这份（先写的）被后写的整份覆盖、**从未生效**，
    //   保留备查；要启用请先与上面那份合并，并确认不会盖掉它的键。
    //   ai:{threaten: 99,},
    mfsd_zhouyv: {expose: 1,},
    mfsd_jiangming: {expose: 0.5,},
    mfsd_xiongtun: {
        expose: 1,
        order: 20,
        result: {
            target: function(player, target) {
                if (get.attitude(player, target) > 0) return 0;
                // 目标威胁越大，AI越想去拆他的牌
                return -get.threaten(target);
            }
        }
    },
};

// ---- 其它 AI 逻辑（不是技能的 `ai` 表，但只给 AI 用）----
//    · `check`：视为技「用哪张牌 / 要不要发动」的 AI 判定；
//    · `aiValue` / `aiOrder` / `aiUseful`：引擎 mod 钩子（get/index.js:6219/6285/6404），只影响 AI 估价。
export const helpers = {
    mfsd_guishi_aiOrder: function(player, card, num) {
        // 鬼噬标记 ≤10：绝对不吃桃/回血牌
        if (player.countMark('mfsd_guishi') <= 10) {
            if (get.tag(card, 'recover')) return -100;
            if (player.isDying() && (card.name == 'tao' || card.name == 'jiu')) return -1000;
        }
        return num;
    },
    mfsd_xiongtun_check: function(event, player) {
        return get.attitude(player, event.player) <= 0;
    },
};

// ---- 内联 AI 索引（角色文件里仍**直接写着**的 `.set("ai", …)`；数量由 check_ai_centralized 对账）----
//   ⚠ 这些多是「一行式闭包、依赖技能局部变量」的判定，搬出去要给每个调用点补参数，所以先留原地、只登记；
//     其中少数（如缚渊的 `fuyuanAi`）其实已经转交给 helpers，只是调用点还写着。
//   合计 2 处：mfsd_zhouyv 1、mfsd_jiangming 1

// ============================================================
//  AI 逻辑说明（纯注释，不参与运行）
// ------------------------------------------------------------
//  整体人设：**只攻不防**——留牌/用牌都极端偏向伤害牌。
//  【mfsd_guishi】鬼噬
//    · `value`（弃牌/留牌时的价值）：伤害牌 +20（死保）；【闪】/【桃】/【无懈】价值归 0（诱导弃掉）；
//      其它牌 ×0.1（几乎不留）。
//    · `useful`（出牌阶段的使用欲望）：伤害牌 +20，非伤害牌减半。
//    · `noShan: true`：告诉 AI"没闪也没关系"（有鬼噬兜底）。
//    · `threaten: 2.5`：威慑很低 —— 对手 AI 不把它当威胁，容易放任。
//    · ⚠ 原文件里还有一份 `ai:{threaten:99}` 被这份整份覆盖、从未生效（见上方注释）：想要"高威慑"
//      得把 2.5 改成 99 那个量级，而不是再加一个 ai。
//  【mfsd_zhouyv】咒域：只有 `expose: 1`。
//  【mfsd_jiangming】降冥：只有 `expose: 0.5`（亮出来意愿一般）。
//  【mfsd_xiongtun】凶吞：`expose: 1`；order 20（很高）；`result.target` = 友方 0、
//    敌人 `-get.threaten(target)` ⇒ 越有威胁的敌人越想拆它。
// ============================================================
