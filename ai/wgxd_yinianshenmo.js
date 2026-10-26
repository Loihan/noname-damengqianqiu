// ============================================================
//  wgxd_yinianshenmo · 技能 AI（本文件的 AI 是**唯一来源**）
//  ⚠ 角色文件里只写 `ai: AI.<技能id>`；子技能用注册后的完整 id（`父技能_子技能`）。
//  ⚠ 这里只放**纯 AI 数据/函数**（引擎直接读 `lib.skill[id].ai`），不要有副作用。
// ============================================================
export default {
    wgxd_renling: {
        maixie: true,
        maixue_hp: true,
    },
    wgxd_fenjie: {
        // 标记小于8时最优先使用(20)，满标记后降为普通锦囊级别
        order: function(item, player) {
            return player.countMark('wgxd_renling') < 8 ? 20 : 12;
        },
        result: {
            player: function(player) {
                if (player.countMark('wgxd_renling') < 8) return 1.5;
                return 1;
            }
        }
    },
    wgxd_tianze: {
        // 逻辑：8个立即用(30)，5-7个最后用(0.1)，小于5不产生发动欲望
        order: function(item, player) {
            var m = player.countMark('wgxd_renling');
            if (m >= 8) return 30;
            if (m >= 5) return 0.1;
            return 0;
        },
        result: {
            player: function(player) {
                return player.countMark('wgxd_renling') >= 5 ? 1 : 0;
            }
        }
    },
    wgxd_hengyu: {
        // 诱导AI多出伤害牌
        fireAttack: true,
        result: {
            player: 1,
            // 杀的目标逻辑：态度<=0且按威胁度/状态排序（系统自动处理多目标最差的几个）
            target: function(player, target) {
                if (get.attitude(player, target) <= 0) return -1.5;
            }
        }
    },
    wgxd_fenze: {
        order: 21, // 出牌阶段最高优先级
        result: {
            target: function(player, target) {
                // 对所有敌人发动
                if (get.attitude(player, target) <= 0) return -1.5;
                return 0;
            }
        }
    },
    wgxd_huamo: {
        order: 1, // 最低优先级
        result: {
            player: function(player) {
                // 出牌阶段快结束（没有更多能用的牌）时才考虑
                if (player.countCards('h', function(card) {
                    return player.getUseValue(card) > 0;
                }) <= 1) return 1;
                return 0;
            }
        }
    },
    wgxd_mosha: {
        useShan: true,
        effect: {
            target_use(card, player, target) {
                if (get.tag(card, "respondShan") || get.name(card) == "shandian") return [1, 2];
            }
        }
    },
    wgxd_xinyuan: {
        // 核心：无花色牌留牌价值翻倍(防止弃置)，但使用价值减半(不爱用)
        value: function(card, player) {
            if (get.suit(card, player) == 'none') return get.value(card, player) * 2;
        },
        useful: function(card, player) {
            if (get.suit(card, player) == 'none') return get.useful(card, player) * 0.5;
        }
    },
    wgxd_rongshen: {
        order: 25, // 最高优先级，有就变身
        result: { player: 1 }
    },
};

// ---- 内联 AI 索引（角色文件里仍**直接写着**的 `.set("ai", …)`；数量由 check_ai_centralized 对账）----
//   ⚠ 这些多是「一行式闭包、依赖技能局部变量」的判定，搬出去要给每个调用点补参数，所以先留原地、只登记；
//     其中少数（如缚渊的 `fuyuanAi`）其实已经转交给 helpers，只是调用点还写着。
//   合计 2 处：wgxd_tianze 1、wgxd_mosha 1

// ============================================================
//  AI 逻辑说明（纯注释，不参与运行）
// ------------------------------------------------------------
//  【wgxd_renling】人灵：`maixie: true` + `maixue_hp: true`（卖血 + 优先回体力型标签）。
//  【wgxd_fenjie】分劫：order = 标记<8 时 20、否则 12（满标记后降级）；
//    `result.player` = 1.5 / 1。
//  【wgxd_tianze】天择：order = 标记≥8 → 30（立刻用）、5~7 → 0.1（放到最后）、<5 → 0（不点）；
//    `result.player` = 标记≥5 时 1。
//  【wgxd_hengyu】恒燠：`fireAttack: true`；`result.player` 1；`result.target` 敌人 -1.5。
//  【wgxd_fenze】焚泽：order 21（出牌阶段最高）；`result.target` 敌人 -1.5、其它 0。
//  【wgxd_huamo】化魔：order 1（最低）；`result.player`：手里"还有使用价值"的牌 <=1 张时才 1
//    ⇒ 当作收尾手段。
//  【wgxd_mosha】魔杀：`useShan: true`；`effect.target_use`：这张牌是"闪类"或【闪电】时 [1,2]。
//  【wgxd_xinyuan】心渊：`value`：无花色（虚拟）牌留牌价值 ×2（别丢）；
//    `useful`：无花色牌使用价值 ×0.5（不爱用）。
//  【wgxd_rongshen】融神：order 25（全包最高之一，"有就变身"）、`result.player` 1。
// ============================================================
