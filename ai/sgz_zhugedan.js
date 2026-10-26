// ============================================================
//  sgz_zhugedan · 技能 AI（本文件的 AI 是**唯一来源**）
//  ⚠ 角色文件里只写 `ai: AI.<技能id>`；子技能用注册后的完整 id（`父技能_子技能`）。
//  ⚠ 这里只放**纯 AI 数据/函数**（引擎直接读 `lib.skill[id].ai`），不要有副作用。
// ============================================================
export default {
    sgz_dingpan: {
        // 【核心修改】：根据场上标记情况动态调整顺序
        order: function(item, player) {
            // 1. 如果场上还有敌人没挂上标记，则定叛的优先级为最高 (100)
            if (game.hasPlayer(function(current){
                return current != player && get.attitude(player, current) < 4 && !current.hasSkill("sgz_dingpan_pan");
            })) {
                return 100;
            }
            // 2. 如果全场敌人都已经挂了标记，定叛优先级降为最低 (1)，确保在出完杀后再补刀
            return 1;
        },
        result: {
            player: function(player, target) {
                if (player.maxHp <= 1) return 0;
                if (get.attitude(player, target)>=4)return 0;
                return 5; // 欺骗主公 AI，使其认为减上限收益很高
            },
            target: function(player, target) {
                var att = get.attitude(player, target);
                // 目标 1：优先给没有标记的敌人挂标记
                if (!target.hasSkill("sgz_dingpan_pan")) {
                    if (att < 4) return -10;
                }
                // 目标 2：如果已经有标记了，收益评分稍微降低，让位给“挂标记”动作
                else if (att < 0) {
                    return -5;
                }
                return 0;
            }
        }
    },
    sgz_gujue: {
        halfneg:true,
    },
};

// ---- 其它 AI 逻辑（不是技能的 `ai` 表，但只给 AI 用）----
//    · `check`：视为技「用哪张牌 / 要不要发动」的 AI 判定；
//    · `aiValue` / `aiOrder` / `aiUseful`：引擎 mod 钩子（get/index.js:6219/6285/6404），只影响 AI 估价。
export const helpers = {
    sgz_fani_aiValue: function(player, card, num) {
        if (card.name == 'zhuge') return 1000;     // 连弩：神器
        if (card.name == 'qinglong') return num + 20;
        if (card.name == 'guanshi') return num + 10;

        // 只要是锦囊，赋予极高保留价值，防止被弃置
        if (get.type(card) == 'trick') return num + 100;
    },
    sgz_fani_aiUseful: function(player, card, num) {
        if (card.name == 'zhuge') return 1000;
        // 锦囊牌即便在常规判定中收益为负（如五谷救了敌人），在这里也被视为绝对有用
        if (get.type(card) == 'trick') return 150;
        if (card.name == 'jiu') return 9;
    },
    sgz_fani_aiOrder: function(player, card, num) {
        // 权重设为 15，确保在定叛(12)之后，但在普通杀(3)和普通顺手之前
        if (get.type(card) == 'trick') return 99;
        // 核心装备的装配优先级也提高
        if (['zhuge', 'qinglong', 'guanshi'].contains(card.name)) return 98;
        if (card.name == 'jiu') return 96;
        if (card.name == 'sha') return 95;
    },
};

// ---- 内联 AI 索引（角色文件里仍**直接写着**的 `.set("ai", …)`；数量由 check_ai_centralized 对账）----
//   ⚠ 这些多是「一行式闭包、依赖技能局部变量」的判定，搬出去要给每个调用点补参数，所以先留原地、只登记；
//     其中少数（如缚渊的 `fuyuanAi`）其实已经转交给 helpers，只是调用点还写着。
//   合计 0 处（对应角色文件里已经没有内联 AI 了）

// ============================================================
//  AI 逻辑说明（纯注释，不参与运行）
// ------------------------------------------------------------
//  【sgz_dingpan】定叛
//    · order 函数：场上还有"态度<4 且没挂 `sgz_dingpan_pan` 标记"的角色 → 100（最优先，先铺标记）；
//      全都挂过了 → 1（降到最后，先出杀再回来补刀）。
//    · `result.player`：自己上限<=1 → 0（快死了不敢减上限）；目标是友方（态度>=4）→ 0；
//      其余 5 —— 注释原话："欺骗主公 AI，使其认为减上限收益很高"。
//    · `result.target`：没标记的敌人 → -10（最想挂，负数=想选）；
//      已有标记的敌人 → -5（顺位靠后）；其余 0。
//    · 短板：`att < 4` 把"态度 0~3 的中立/摇摆角色"也当成目标；不看目标手牌与存活威胁。
//  【sgz_gujue】孤绝：只有 `halfneg: true` —— 把"负面效果"按一半折算
//    （引擎 get/index.js:1929 那一支），等于让 AI 更敢做"有代价"的选择。
// ============================================================
