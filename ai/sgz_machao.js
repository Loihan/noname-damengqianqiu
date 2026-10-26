// ============================================================
//  sgz_machao · 技能 AI（本文件的 AI 是**唯一来源**）
//  ⚠ 角色文件里只写 `ai: AI.<技能id>`；子技能用注册后的完整 id（`父技能_子技能`）。
//  ⚠ 这里只放**纯 AI 数据/函数**（引擎直接读 `lib.skill[id].ai`），不要有副作用。
// ============================================================
export default {
    sgz_leiji: {
        respondSha: true,
        respondShan: true,
        useShan: true, // 【闪】能用则用
        noe: function(card, player, target) {
            if (player.isDisabled(1)||player.isDisabled(2)) return 2;
            return 0;
        },
        order: function(item, player) {
            var evt = _status.event;
                if (evt.filterCard({ name: 'sha' }, player, evt)) {
                    // 使用 storage 判断鸣踪是否已用
                    var canMingzong = !player.storage.sgz_mingzong_used;
                    var totalAtkHorses = game.countPlayer(p => p.countCards('e', { subtype: 'equip4' }) == 1) + 2 * game.countPlayer(p => p.countCards('e', { subtype: 'equip4' }) == 2);
                    game.log(player, '当前全场有', totalAtkHorses, '匹进攻马');
                    // 关键限制：全场剩 1 马且没法回收时，禁止亮起技能
                    if (totalAtkHorses <= 1 && !canMingzong) return -5000;
                }
                return 25;
        },
        effect: {
            target: function(card, player, target, current) {
                // 仅处理【雷殛】转化出的【杀】
                if (_status.event.skill == 'sgz_leiji' || _status.event.parent?.skill == 'sgz_leiji') {
                    var canMingzong = !player.storage.sgz_mingzong_used;
                    var enemyHasHorse = game.hasPlayer(p => get.attitude(player, p) < 0 && p.countCards('e', { subtype: 'equip4' }) > 0);

                    if (get.attitude(player, target) > 0) {
                        // 核心条件：敌人全场没马 且 我能发动鸣踪
                        if (!enemyHasHorse && canMingzong && target.countCards('e', { subtype: 'equip4' }) > 0) {
                            // [系数0, 额外分20]：告诉AI，这刀一点都不疼，而且为了送马战略大赚20分！
                            return [0, 20];
                        }
                        // 不满足战略条件时，对自己人的伤害评估设为极高负分，彻底封死误伤
                        return 0;
                    }
                }
            }
        },
        result: {
            // --- A. 发动欲望：资源枯竭熔断 ---
            player: function(player) {
                var evt = _status.event;
                if (evt.filterCard({ name: 'sha' }, player, evt)) {
                    // 使用 storage 判断鸣踪是否已用
                    var canMingzong = !player.storage.sgz_mingzong_used;
                    var totalAtkHorses = game.countPlayer(p => p.countCards('e', { subtype: 'equip4' }) > 0);
                    // 关键限制：全场剩 1 马且没法回收时，禁止亮起技能
                    if (totalAtkHorses <= 1 && !canMingzong) return -5000;
                }
                return 1;
            },
            // --- B. 目标选择：战略自残逻辑 ---
            target: function(player, target) {
                var evt = _status.event;
                if (!evt.filterCard({ name: 'sha' }, player, evt)) return -get.attitude(player, target);

                var canMingzong = !player.storage.sgz_mingzong_used;
                var att = get.attitude(player, target);
                var enemyCount = game.countPlayer(p => get.attitude(player, p) < 0);
                var horseOwners = game.filterPlayer(p => p.countCards('e', { subtype: 'equip4' }) > 0);

                // === 【核心新增】：唯一马种保护逻辑 ===
                // 满足：1.敌人多于1名；2.没有鸣踪；3.目标是全场唯一的-1马拥有者
                if (enemyCount > 1  && !canMingzong && horseOwners.length === 1 && horseOwners.contains(target)) {
                    // 如果目标血量处于危险线（濒死或1血），AI 为了留着这匹马以后用，强制放弃击杀
                    // 返回 0 分，意味着 AI 宁愿不发动雷殛去杀这个残血敌人
                    if (target.hp <= 2 || target.isDying()) return -6000;
                }

                if (att > 0) { // 友方或自己
                    var enemyHasHorse = game.hasPlayer(p => get.attitude(player, p) < 0 && p.countCards('e', { subtype: 'equip4' }) > 0);
                    // 只有满足“敌方无马”且“我有鸣踪”时，才允许杀友送马
                    if (!enemyHasHorse && canMingzong && target.countCards('e', { subtype: 'equip4' }) > 0) {
                        return 15; // 高优先级正分
                    }
                    return -200; // 否则物理熔断，绝对不杀自己人
                }
                return -att + (target.countCards('e', { subtype: 'equip4' }) ? 30 : 0);
            }
        }
    },
    sgz_mingzong: {
        expose: 1,
        threaten: 39,
    },
};

// ---- 内联 AI 索引（角色文件里仍**直接写着**的 `.set("ai", …)`；数量由 check_ai_centralized 对账）----
//   ⚠ 这些多是「一行式闭包、依赖技能局部变量」的判定，搬出去要给每个调用点补参数，所以先留原地、只登记；
//     其中少数（如缚渊的 `fuyuanAi`）其实已经转交给 helpers，只是调用点还写着。
//   合计 0 处（对应角色文件里已经没有内联 AI 了）

// ============================================================
//  AI 逻辑说明（纯注释，不参与运行）
// ------------------------------------------------------------
//  【sgz_leiji】雷殛（把进攻马当【杀】/【闪】用的转化技，本包最"有想法"的一套 AI）
//    · 标签：`respondSha` / `respondShan`（能当杀/闪响应）、`useShan: true`（有闪就用）；
//      `noe` 是**函数**：自己被翻面/横置时返回 2，否则 0（挨打更"不在意"）。
//    · order 函数（能出杀的时机才评估）：
//        · `canMingzong` = 鸣踪本回合还没用；`totalAtkHorses` = 全场进攻马数
//          （1 匹算 1、2 匹算 2）；
//        · 全场只剩 1 匹马 **且** 鸣踪已用 → 返回 -5000（禁止发动，避免拆掉唯一的马）；
//        · 否则 25（很高）。
//        ⚠ 这里有一句 `game.log(player, '当前全场有', totalAtkHorses, '匹进攻马')` ——
//          AI **每评估一次**就写一条日志，会刷屏（建议下一步删掉或改 console）。
//    · `result.player`：同样的 -5000 熔断，否则 1。
//    · `result.target`：
//        · 若当前不是"雷殛转化出的杀" → 返回 `-get.attitude`（普通：朋友不选、敌人选）；
//        · 唯一马种保护：敌人数>1、鸣踪已用、全场只有 1 个进攻马主人、目标就是那个主人、
//          且目标残血(<=2)/濒死 → **-6000**（宁可放弃击杀也要留住这匹马）；
//        · 友方：只有"敌人全场没马 + 我有鸣踪 + 目标身上有马"才允许杀友送马 → 15，否则 -200；
//        · 敌人：`-attitude + (目标有马 ? 30 : 0)` —— 有马的人优先打（打完马归自己？按技能设定）。
//    · `effect.target`：只对雷殛转化出的【杀】生效；友方时若满足"敌人没马 + 有鸣踪 + 目标有马"
//      → [0,20]（"这刀一点都不疼，还能送马，战略大赚"）；不满足时返回 0。
//    · 短板：一半的判断都在读 `_status.event.filterCard(...)`（依赖"当前事件能出杀"），
//      在别的时机被评估时结果不可靠；`game.log` 会刷屏；两处分别用"马的张数"和"有马的人数"
//      统计 `totalAtkHorses`（order 与 result 里不一致）。
//  【sgz_mingzong】鸣踪：`expose: 1`、`threaten: 39`（威慑非常高，容易被优先针对）。
// ============================================================
