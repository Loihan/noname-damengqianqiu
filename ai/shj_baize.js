// ============================================================
//  shj_baize · 技能 AI（本文件的 AI 是**唯一来源**）
//  ⚠ 角色文件里只写 `ai: AI.<技能id>`；子技能用注册后的完整 id（`父技能_子技能`）。
//  ⚠ 这里只放**纯 AI 数据/函数**（引擎直接读 `lib.skill[id].ai`），不要有副作用。
// ============================================================
export default {
    shj_pixie: {
        order: function(item, player) {
            var marks = player.countMark('shj_zhaorui');

            // 已觉醒更激进
            var bonus = player.storage.shj_dongxu_awaken? 4: 0;

            // 偶数优先级极高
            if (marks % 2 == 0) {
                var value = 3+bonus;
                var enemyNum = 0;
                game.countPlayer(function(current){
                    enemyNum++;
                    if (get.attitude(player,current) < 0 && !current.isLinked()) {
                        value += 1;
                    }
                });
                if( enemyNum + 3 + bonus == value) {return 0;}
                return value;
            }

            // 奇数情况
            var linkedEnemies = 0;
            game.countPlayer(function(current){
                if (get.attitude(player,current) < 0 && current.isLinked()) {
                    linkedEnemies++;
                }
            });
            // 连环多则提高奇数价值
            return linkedEnemies * 2 ;
        },
        result: {
            player: function(player) {
            var marks = player.countMark('shj_zhaorui');
            var value = 1;
            // ===== 偶数收益 =====
            if (marks % 2 == 0) {
                game.countPlayer(function(current){
                    if (get.attitude(player,current) < 0 && !current.isLinked()) {
                        value += 2.5;
                        // 高威胁角色
                        value += get.threaten(current);
                    }
                });
            }
            // ===== 奇数收益 =====
            else {
                game.countPlayer(function(current){
                    if (get.attitude(player,current) < 0) {
                        value += 1;
                        // 连环目标雷伤收益高
                        if (current.isLinked()) {
                            value += 3;
                        }
                        // 残血斩杀
                        if (current.hp <= 1) {
                            value += 2;
                        }
                    }
                });
            }
            // 标记越多越想开
            value += Math.min(marks,6)-5;
            game.countPlayer(function(current){
                    if (get.attitude(player,current) < 0) {
                        value += 1;
                    }});
            return value;
            }
        },
        threaten: function(player,target){
            var marks =
            player.countMark('shj_zhaorui');
            // 偶数时威慑极高
            if (marks % 2 == 0) {return 4;}
            return 2.5;
        }
    },
    // ⚠ 原角色文件里这个技能写了**两份 ai**：下面这份（先写的）被后写的整份覆盖、**从未生效**，
    //   保留备查；要启用请先与上面那份合并，并确认不会盖掉它的键。
    //   ai: {expose: 1,},
    shj_lingyou: {
        order: 1,
        result: {
            player: 1,
        }
    },
    shj_zhen_e: {
        order: 1000,
        result: {
            target: function(player, target) {
                if (get.attitude(player, target) >= 0) return 0;
                // 优先打击威胁值最高的目标
                return -get.threaten(target) - 2;
            },
        }
    },
    // ⚠ 原角色文件里这个技能写了**两份 ai**：下面这份（先写的）被后写的整份覆盖、**从未生效**，
    //   保留备查；要启用请先与上面那份合并，并确认不会盖掉它的键。
    //   ai: {expose: 1,},
};

// ---- 内联 AI 索引（角色文件里仍**直接写着**的 `.set("ai", …)`；数量由 check_ai_centralized 对账）----
//   ⚠ 这些多是「一行式闭包、依赖技能局部变量」的判定，搬出去要给每个调用点补参数，所以先留原地、只登记；
//     其中少数（如缚渊的 `fuyuanAi`）其实已经转交给 helpers，只是调用点还写着。
//   合计 4 处：shj_tuna 2、shj_pixie 2

// ============================================================
//  AI 逻辑说明（纯注释，不参与运行）
// ------------------------------------------------------------
//  【shj_pixie】辟邪（按"祥瑞"标记数的奇偶切换两种效果）
//    · order 函数：
//        · 标记为**偶数**（横置+翻面+弃牌那套）：基准 3（觉醒后再 +4），
//          每个"未横置的敌人"再 +1；若等于"敌人总数+3+觉醒加成"（即所有敌人都未横置）
//          则返回 0（注释意图存疑：等于"全员可打时反而不想开"）。
//        · 标记为**奇数**（打雷伤那套）：`横置的敌人数 × 2`。
//    · `result.player`：
//        · 偶数：1 + 每个未横置敌人 (+2.5 + 其威慑) —— 越肉越赚；
//        · 奇数：1 + 每个敌人 +1，横置目标再 +3（雷伤顺着铁索传），残血(<=1) +2；
//        · 最后按标记数微调 `+min(marks,6) - 5`（5 个以内是负的，越多越愿意开）。
//    · `threaten`：标记偶数时 4（威慑很高），否则 2.5。
//    · ⚠ 原文件里另有一份 `ai:{expose:1}` 被整份覆盖、从未生效（见上方注释）。
//  【shj_lingyou】灵佑：order 1、`result.player` 1（很低优先级 + 固定正收益）。
//  【shj_zhen_e】镇厄：order 1000（最高，能处决就处决）；
//    `result.target`：友方 0；敌人 `-get.threaten(target)`（越强越杀）。
//    ⚠ 同样有一份 `{expose:1}` 被覆盖。
// ============================================================
