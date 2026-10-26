// ============================================================
//  sgz_luxun · 技能 AI（本文件的 AI 是**唯一来源**）
//  ⚠ 角色文件里只写 `ai: AI.<技能id>`；子技能用注册后的完整 id（`父技能_子技能`）。
//  ⚠ 这里只放**纯 AI 数据/函数**（引擎直接读 `lib.skill[id].ai`），不要有副作用。
// ============================================================
export default {
    sgz_lianying: {
        noh: true, // 没有手牌时正收益
    },
    sgz_fenmie: {
        expose: 1,
        threaten: 1.3,
        // 出牌阶段**最高优先级**（本包内比其它牌的 15 档还高）
        order: 20,
        fireAttack: true, // 可造成火属性伤害
        result: {
            player: function(player) {
                // 有敌人才想烧
                return game.countPlayer(t => get.attitude(player, t) < 0) > 0 ? 1 : 0;
            },
            // ⚠ 需求：**绝不把队友选为目标**（之前会把队友拉进来展示牌，
            //   一旦队友与敌人同花色，AI 就会因为"不舍得打队友"而直接结束焚灭）。
            //   现在只给敌人正分，队友 0 分 ⇒ 目标列表里不会出现队友。
            // ⚠ 符号约定（踩过坑）：对"伤害类"技能，result.target 要给**负分**才表示"想打他"
            //   （参考本包【灭吴】的 `-get.threaten(target) - 2`）。给正分会被 AI 理解成
            //   "对他有好处"，于是整个技能都不敢用 —— 上一版就是因为给了 +20 而完全不放焚灭。
            target: function(player, target) {
                if (!target || target == player) return 0;
                if (get.attitude(player, target) >= 0) return 0; // 队友：0 分，不进目标列表
                let score = 20;
                try {
                    score += get.threaten(target) * 2;
                } catch (e) {}
                return -score;
            },
        },
    },
    // ⚠ 原角色文件里这个技能写了**两份 ai**：下面这份（先写的）被后写的整份覆盖、**从未生效**，
    //   保留备查；要启用请先与上面那份合并，并确认不会盖掉它的键。
    //   ai:{
    //   expose: 1,
    //   fireAttack: true, // 可造成火属性伤害
    //   directHit_ai: true, // 可强中
    //   },
};

// ---- 其它 AI 逻辑（不是技能的 `ai` 表，但只给 AI 用）----
//    · `check`：视为技「用哪张牌 / 要不要发动」的 AI 判定；
//    · `aiValue` / `aiOrder` / `aiUseful`：引擎 mod 钩子（get/index.js:6219/6285/6404），只影响 AI 估价。
export const helpers = {
    /**
     * 焚灭 · 选哪张牌弃（引擎对 chooseCardTarget 的 `ai1` 逐张调用）。
     * 需求：**只要这个花色命中了敌人，就尽可能弃**（不考虑是否会误伤队友），
     *       每种花色**至多一张**（同花色第二张 -100 硬拦）；越不值钱的牌越先弃。
     */
    sgz_fenmie_cardScore: function(card) {
        const player = get.player();
        const evt = _status.event;
        const suit = get.suit(card, player);
        // 每种花色只要一张
        if (ui.selected.cards.some(c => get.suit(c, player) == suit)) return -100; // 每种花色至多一张（硬拦）
        // 该花色是否命中某个**敌人**目标（目标列表里已经没有队友了，这里再兜一层）
        const hit = (evt.targets || []).some((target, index) => {
            const shown = (evt.cards || [])[index];
            if (!shown) return false;
            if (get.attitude(player, target) >= 0) return false;
            return get.suit(shown, target) == suit;
        });
        if (!hit) return 0;
        return 20 - get.value(card); // 分数调高：能打就弃，越便宜越先
    },
    /** 焚灭 · 打谁（`ai2`）：只挑敌人，越像敌人越优先 */
    sgz_fenmie_targetScore: function(target) {
        return -get.attitude(get.player(), target);
    },
    sgz_qujian_aiOrder: function(player, card, num) {
                        // 只有拥有标记时才启动连招诱导
                        if (player.countMark('sgz_qujian') > 0) {
                            const history = player.getHistory('useCard');
                            const lastEntry = history.length > 0 ? history[history.length - 1] : null;
                            const hasSha = player.hasCard(c => c.name == 'sha', 'h');
                            const hasTrick = player.hasCard(c => get.type2(c) == 'trick', 'h');

                            // 情况 A：刚刚出过【杀】，现在必须立刻出锦囊来完成连招
                            if (lastEntry && lastEntry.card.name == 'sha' && get.type2(card) == 'trick') {
                                return 16; // 优先级 16：超越焚灭(15)，绝对首选
                            }

                            // 情况 B：还没出【杀】，但手里有连招组件
                            if ((!lastEntry || lastEntry.card.name != 'sha') && hasSha && hasTrick) {
                                // 提升【杀】的优先级，使其在所有锦囊之前打出
                                if (card.name == 'sha') return 14;
                                // 压低【锦囊】的优先级，防止它破坏连招顺序
                                if (get.type2(card) == 'trick') return 2;
                            }
                        }
                    },
};

// ---- 内联 AI 索引（角色文件里仍**直接写着**的 `.set("ai", …)`；数量由 check_ai_centralized 对账）----
//   ⚠ 这些多是「一行式闭包、依赖技能局部变量」的判定，搬出去要给每个调用点补参数，所以先留原地、只登记；
//     其中少数（如缚渊的 `fuyuanAi`）其实已经转交给 helpers，只是调用点还写着。
//   合计 4 处：sgz_qujian_combo 1、sgz_taohui 3

// ============================================================
//  AI 逻辑说明（纯注释，不参与运行）
// ------------------------------------------------------------
//  【sgz_lianying】连营：只有 `noh: true` —— 引擎的价值评估里把"没有手牌"当成好事
//    （get/index.js:2005 那一支），等于告诉 AI「把手牌打空是收益」。
//  【sgz_fenmie】焚灭（expose 1 / threaten 1.3）
//    · **目标只选敌人**（`result.target` 对队友返回 0）—— 之前把队友也拉进来展示牌，
//      一旦队友与敌人同花色，AI 会因为"不舍得打队友"直接结束焚灭。
//    · order 15：出牌阶段非常靠前，基本一进阶段就想用。
//    · `fireAttack: true`：标签"能造成火属性伤害"（连锁 / 藤甲 / 铁索类评估会用到）。
//    · `result.player`：场上有敌人才想用。
//    · 选牌（helpers.sgz_fenmie_cardScore）：**花色命中敌人就弃**，每种花色一张、越便宜越先；
//      不考虑是否会误伤队友（但目标里已没有队友）。
// ============================================================
