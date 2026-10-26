// ============================================================
//  sgz_zhaoyun · 技能 AI（本文件的 AI 是**唯一来源**）
//  ⚠ 角色文件里只写 `ai: AI.<技能id>`；子技能用注册后的完整 id（`父技能_子技能`）。
//  ⚠ 这里只放**纯 AI 数据/函数**（引擎直接读 `lib.skill[id].ai`），不要有副作用。
// ============================================================
export default {
    sgz_guzhi: {
        maixie: true,
        // 一、价值重定向：濒死时所有牌价值强制设为 0，平时死保红桃
        value: function(card, player) {
            if (_status.event.name == 'dying' || _status.dying) return 0.1;
            var suit = get.suit(card, player);
            if (suit == 'heart') return 45;   // 平时死保红桃
            if (suit == 'diamond') return 40;
            return get.value(card);
        },
        // 五、收益认知偏移：诱导卖血
        effect: {
            target: function(card, player, target) {
                if (get.tag(card, 'damage') || get.tag(card, 'losehp')) {
                    if (player == target || get.attitude(player, target) <= 0) {
                        if (target.countCards('h', {suit: 'heart'}) > 0) return [1,2];
                    }
                }
            }
        }
    },
    sgz_guzhi_shangshi: {
        noh: true,
        freeSha: true,
        freeShan: true
    },
    sgz_longxiao: { save: true, respondSha: true, respondShan: true, respondWuxie: true, order: 4, result: { player: 1 } },
    // ⚠ 原角色文件里这个技能写了**两份 ai**：下面这份（先写的）被后写的整份覆盖、**从未生效**，
    //   保留备查；要启用请先与上面那份合并，并确认不会盖掉它的键。
    //   ai: {
    //   directHit_ai: true,
    //   fireAttack: true,
    //   order: function(item, player) {
    //   // 方片→火杀（无距离次数限制、不占次数）：使用优先级必须高于一切原卡牌
    //   if (player.countCards('hes', {suit: 'diamond'}) > 0) return 130;
    //   // 濒死且有红桃：龙霄转化救桃优先级拉满
    //   if (player.isDying() && player.countCards('hes', {suit: 'heart'}) > 0) return 200;
    //   // 有 3 张梅花：关键时刻转闪闪避
    //   if (player.countCards('hes', {suit: 'club'}) >= 3) return 90;
    //   // 其余情况也优先用龙霄转化（而非直接打出原牌）
    //   return 60;
    //   },
    //   save: true,
    //   respondSha: true, respondShan: true, respondWuxie: true,
    //   skillTagFilter: function(player, tag) {
    //   var map = { save: 'heart', respondSha: 'diamond', respondShan: 'club', respondWuxie: 'spade' };
    //   if (map[tag] && player.countCards('hes', { suit: map[tag] }) > 0) return true;
    //   },
    //   // 【核心修复】：在计算救命收益时，返回断层高分 2000
    //   save: function(card, player, target) {
    //   if (player.countCards('hes', {suit: 'heart'}) > 0) return 2000;
    //   return 0;
    //   },
    //   result: {
    //   player: function(player) {
    //   // 极大化出牌欲望：只要能印火杀，欲望值 1000
    //   if (_status.currentPhase == player && player.countCards('hes', {suit: 'diamond'})) return 1000;
    //   return 1;
    //   }
    //   },
    //   // 诱导卖血：不拦截伤害锦囊
    //   onWuxie: function(card, player, target) {
    //   if (target == player && get.tag(card, 'damage') && player.hasCard(c => get.suit(c) == 'heart', 'h')) return 0;
    //   }
    //   },
    sgz_jiejin: {expose: 0.6,},
};

// ---- 其它 AI 逻辑（不是技能的 `ai` 表，但只给 AI 用）----
//    · `check`：视为技「用哪张牌 / 要不要发动」的 AI 判定；
//    · `aiValue` / `aiOrder` / `aiUseful`：引擎 mod 钩子（get/index.js:6219/6285/6404），只影响 AI 估价。
export const helpers = {
    sgz_guzhi_aiOrder: function(player, card, num) {
        if (get.tag(card, 'recover')) {
            if (player.isDying()) {
                // 有红桃 → 把普通桃次序压后，逼 AI 优先用龙霄把红桃变成桃（保真桃、只死保红桃）
                if (player.countCards('h', { suit: 'heart' }) > 0) return -60;
                return 1000;
            }
            if (player.hp >= 1) return -100;
        }
        return num;
    },
    sgz_guzhi_aiUseful: function(player, card, num) {
        if (player.countCards('h', { suit: 'heart' }) > 0 && !player.isDying()) {
            // 被杀/万箭：不闪避
            if (card && card.name == 'shan') return -8;
            // 南蛮/决斗：不出杀响应，主动扣血（卖血是赚的）
            if (card && card.name == 'sha' &&
                _status.event && _status.event.name == 'chooseToRespond') {
                return -8;
            }
        }
        return num;
    },
    sgz_longxiao_check: function(card) {
                    var player = _status.event.player;
                    var suit = get.suit(card, player);
                    var evt = _status.event;
                    var selected = ui.selected.cards.length;

                    // 寻找当前濒死角色
                    var dying = evt.dying || (evt.getParent && evt.getParent().dying) || (_status.dying && _status.dying[0]);

                    // ———— 红桃：转化桃（救自己/队友，按缺口定张数） ————
                    if (suit == 'heart') {
                        var target = dying;
                        if (!target || get.itemtype(target) !== 'player') return 0;
                        var att = get.attitude(player, target);
                        if (att <= 0) return 0;   // 不救敌人

                        if (target == player) {
                            // 救自己：缺口越大张数越多
                            if (target.hp <= -2) return (selected < 3 ? 5000 : 0);
                            if (target.hp == -1) return (selected < 2 ? 5000 : 0);
                            return (selected < 1 ? 5000 : 0);
                        }
                        // 救队友：按队友缺口（需求3）
                        if (target.hp == 0) return (selected < 1 ? 3000 : 0);      // 0血：1张
                        if (target.hp == -1) return (selected < 2 ? 3600 : 0);     // -1血：2张
                        if (target.hp <= -2) {
                            // 更低：高价值队友才用3张救，否则放弃
                            if (att > 2 && selected < 3) return 4200;
                            return 0;
                        }
                        return 0;
                    }

                    // ———— 方块：转化火杀（无距离次数限制） ————
                    if (suit == 'diamond') {
                        // 出牌阶段主动火杀：尽量用满（3>2>1）
                        if (evt.name == 'chooseToUse' || _status.currentPhase == player) {
                            return (selected < 3 ? 240 : 0);
                        }
                        // 响应阶段：有红桃时不出杀响应（主动卖血扣血），否则才用方块响应
                        if (player.countCards('h', {suit: 'heart'}) > 0 && !player.isDying()) {
                            return 0;
                        }
                        return (selected < 1 ? 180 : 0);
                    }

                    // ———— 梅花：当闪 ————
                    if (suit == 'club') {
                        // 需求4：手里有3张梅花时，即使有红桃也转化3张梅花来闪避
                        if (selected < 3 && player.countCards('h', {suit: 'club'}) >= 3) {
                            return 260;
                        }
                        // 其余：配合“有红桃不闪避”，无红桃才用梅花当闪（优先3张）
                        if (player.countCards('h', {suit: 'heart'}) > 0 && !player.isDying()) return 0;
                        return (selected < 3 ? 70 : 0);
                    }

                    // ———— 黑桃：当无懈可击 ————
                    if (suit == 'spade') {
                        // 黑桃当无懈通常总是赚，优先多张（3>2>1）
                        return (selected < 3 ? 90 : 0);
                    }

                    return 0;
                },
    sgz_longxiao_aiOrder(player, card, num) {
        if (num <= 0 || !player.isPhaseUsing() || player.needsToDiscard() < 2) {
            return num;
        }
        let suit = get.suit(card, player);
        if (suit === "heart") {
            return num - 3.6;
        }
    },
    sgz_longxiao_aiValue(player, card, num) {
        if (num <= 0) {
            return num;
        }
        let suit = get.suit(card, player);
        if (suit === "heart") {
            return num + 3.6;
        }
        if (suit === "spade") {
            return num + 1;
        }
        if (suit === "diamond") {
            return num + 1.8;
        }
    },
    sgz_longxiao_aiUseful(player, card, num) {
        if (num <= 0) {
            return num;
        }
        let suit = get.suit(card, player);
        if (suit === "heart") {
            return num + 3;
        }
        if (suit === "diamond") {
            return num + 1;
        }
        if (suit === "spade") {
            return num + 1;
        }
    },
};

// ---- 内联 AI 索引（角色文件里仍**直接写着**的 `.set("ai", …)`；数量由 check_ai_centralized 对账）----
//   ⚠ 这些多是「一行式闭包、依赖技能局部变量」的判定，搬出去要给每个调用点补参数，所以先留原地、只登记；
//     其中少数（如缚渊的 `fuyuanAi`）其实已经转交给 helpers，只是调用点还写着。
//   合计 3 处：sgz_longxiao_after 1、sgz_jiejin_effect 2

// ============================================================
//  AI 逻辑说明（纯注释，不参与运行）
// ------------------------------------------------------------
//  【sgz_guzhi】孤峙
//    · `maixie: true`（卖血技）。
//    · `value`（留牌价值）：濒死（`_status.dying` 有值 / 当前事件是 dying）时所有牌压到 0.1
//      （"救命时什么都能丢"）；平时 ♥ = 45、♦ = 40（死保红牌），其它走引擎默认。
//    · `effect.target`：`damage` / `losehp` 类效果作用在"自己或敌人"身上、且目标手里有 ♥ → [1,2]
//      ⇒ 诱导 AI **主动吃伤害**（有红桃就能回血）。
//  【sgz_guzhi_shangshi】孤峙·伤逝（子技能）：`noh` / `freeSha` / `freeShan`。
//  【sgz_longxiao】龙霄：**生效的只有一句**
//    `{ save: true, respondSha: true, respondShan: true, respondWuxie: true, order: 4, result: { player: 1 } }`
//    ⇒ 当成"什么都能响应"的万能牌 + 出牌阶段优先级 4。
//    · ⚠ 被覆盖的那份（就在下面的注释里）才是精细版：按花色给 order（方片 130 / 濒死红桃 200 /
//      三张梅花 90 / 其它 60）、`result.player` 1000、`save` 2000、`skillTagFilter`、`onWuxie` 诱导卖血。
//      **这些现在全都没生效** —— 想要"AI 会用龙霄印火杀/救命"必须把两份合并（下一轮 AI 工作的首选）。
//    · ⚠ `save/respondSha/respondShan/respondWuxie` 现在没有配 `skillTagFilter` ⇒ 引擎会刷
//      "疑似忘给 … 加 skillTagFilter"的警告，且 AI 会以为"随时能救任何人"。
//  【sgz_jiejin】劫烬：只有 `expose: 0.6`。
// ============================================================
