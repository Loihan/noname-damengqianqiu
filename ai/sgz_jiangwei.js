// ============================================================
//  sgz_jiangwei · 技能 AI（本文件的 AI 是**唯一来源**）
//  ⚠ 角色文件里只写 `ai: AI.<技能id>`；子技能用注册后的完整 id（`父技能_子技能`）。
//  ⚠ 这里只放**纯 AI 数据/函数**（引擎直接读 `lib.skill[id].ai`），不要有副作用。
// ============================================================
export default {
    sgz_jiufa: {
        expose: 1,
        threaten: 2.5,
        fireAttack: true,
    },
    // 承汉：被动蓄力（拼点赢就涨），没有需要 AI 选择的行为；给个低威慑即可
    sgz_chenghan: {
        expose: 0.6,
        threaten: 1.2,
    },
    sgz_zhuri: {
        viewHandcard: true,
        guanxing: true,
    },
    sgz_juejin: {
        order: 9, // 在孤炬之后执行，利用孤炬偷来的大牌进行拼点
        result: {
            target: function(player, target) {
                if (get.attitude(player, target) >= 0) return 0;
                return -get.threaten(target) - 2;
            },
            player: function(player) {
                // AI 评估：手里点数大的牌越多，发动欲望越强
                var hs = player.getCards('h');
                if (hs.length < 2) return 0;
                var bigCards = hs.filter(c => get.number(c) >= 9).length;
                return bigCards >= (hs.length / 2) ? 1 : 0;
            }
        }
    },
    sgz_guju: {
        order: 10, // 出牌阶段非常靠前，先换牌，再根据换来的牌决定后续操作
        result: {
            target: function(player, target) {
                if (get.attitude(player, target) >= 0) return 0;
                if (target.maxHp-player.countCards('h') > 10) return 0;
                // 目标威胁越大，AI越想去拆他的牌
                return -get.threaten(target);
            }
        }
    },
    sgz_youming: {
        maixue:false,
        //effect: {
        //    target: function(card, player, target) {
        //        if (player.countCards("h") + player.maxHp >= 14&&player.hp==1) return [1,9];
        //    }
        //}
    },
};

/// 可以在角色文件里调用的 AI 小函数（与其它武将模块同一套约定：`import AI, { helpers }`）
export const helpers = {
    /// 九伐：选拼点目标的 AI
    /// ⚠ 原来这个闭包直接写在角色文件里（`.set("ai", …)`）；按「AI 只允许有一个来源」搬到本文件。
    ///   判据沿用原实现：越恨（attitude 越低）越优先拼点。
    sgzJiufaTargetAI(player, target) {
        return -get.attitude(player, target);
    },
};
// ---- 内联 AI 索引（角色文件里仍**直接写着**的 `.set("ai", …)`；数量由 check_ai_centralized 对账）----
//   ⚠ 这些多是「一行式闭包、依赖技能局部变量」的判定，搬出去要给每个调用点补参数，所以先留原地、只登记；
//     其中少数（如缚渊的 `fuyuanAi`）其实已经转交给 helpers，只是调用点还写着。
//   合计 7 处：sgz_zhuri 3、sgz_guju 2、sgz_youming 2
//   （九伐的目标选择 AI 已搬进本文件 `sgzJiufaTargetAI`，角色文件里不再有内联 `.set("ai", …)`）

// ============================================================
//  AI 逻辑说明（纯注释，不参与运行）
// ------------------------------------------------------------
//  【sgz_jiufa】九伐：`expose: 1`、`threaten: 2.5`（威慑偏高，按扩展约定取值 1.0~2.5）、`fireAttack: true`。
//  【sgz_zhuri】逐日：`viewHandcard: true`（AI 知道能看别人手牌）、`guanxing: true`（会观星）。
//  【sgz_juejin】绝烬
//    · order 9：注释写明"在孤炬之后执行，利用孤炬偷来的大牌拼点"。
//    · `result.player`：手牌 < 2 → 0（没得拼）；点数 >=9 的牌占一半以上 → 1，否则 0。
//    · `result.target`：敌人 `-get.threaten(target) - 2`（越强越拼）；友方 0。
//  【sgz_guju】孤炬
//    · order 10：出牌阶段非常靠前 —— 先换牌，再按换来的牌决定后面怎么打。
//    · `result.target`：友方 0；敌人 `-get.threaten(target)`；若目标"上限 - 我的手牌 > 10" → 0（不划算）。
//  【sgz_youming】幽明：`maixue: false` —— ⚠ 引擎认的键是 `maixie`，`maixue` 不会被读到，
//    等于**没写**。下面注释里那段 `effect`（1 血且手牌+上限>=14 时把挨打算成大赚）也被注释掉了，
//    所以这个技能现在**没有任何实际生效的 AI**。
// ============================================================
