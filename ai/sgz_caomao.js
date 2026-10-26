// ============================================================
//  sgz_caomao · 技能 AI（本文件的 AI 是**唯一来源**）
//  ⚠ 角色文件里只写 `ai: AI.<技能id>`；子技能用注册后的完整 id（`父技能_子技能`）。
//  ⚠ 这里只放**纯 AI 数据/函数**（引擎直接读 `lib.skill[id].ai`），不要有副作用。
// ============================================================
export default {
    sgz_fuyuan_xiaoguo: {
        maixie_defend: true,
        expose: 1,
        threaten: 12,
        maixue:true,
        order: function(item, player) {
            // 只要体力上限 > 1 且有标记可以叠，优先级设定为最高 (20)
            // 确保在出任何牌（如无中生有15）之前先发动缚渊
            if (player.maxHp > 1) return 200;
            return -10;
        },
        result: {
            player: function(player) {
                // 如果能触发被动的自残（受伤触发），告诉AI这是好事
                if (_status.event.name == 'damage' && player.maxHp > 1) return 50;
                return 1;
                if (player.maxHp == 1) return -1;
            }
        },
        effect: {
            target:function(card, player, target) {
                if (get.tag(card, 'damage') && target.maxHp > 1 && target.getStat().skill.sgz_fuyuan_xiaoguo < 2)
                    return [1, 3];
            }
        }
    },
    sgz_qingtao: {
        expose: 1,
        order: 19,
        threaten:3,
        result: {
            player: 100,
            target: function(player, target) {
                if (get.attitude(player, target) > 0) return -2;

                // --- 1. 统一权力值计算 ---
                var power = (target.maxHp * 10) + (get.threaten(target));

                var enemiesCount = game.countPlayer(p => p != player && get.attitude(player, p) <= 0);

                // --- 2. 状态避让：如果对方有任何缚渊状态，大幅降低倾讨欲望 ---
                // 理由：有状态的说明正在被 fuyuan 叠层，留着白嫖更划算
                var fuyuanCount = 0;
                if (target.hasSkill('sgz_fuyuan_gaofeng')) fuyuanCount++;
                if (target.hasSkill('sgz_fuyuan_juechi')) fuyuanCount++;
                if (target.hasSkill('sgz_fuyuan_bingzun')) fuyuanCount++;
                if (target.getCards('j').length > 0) fuyuanCount++;

                // 每一个状态扣掉 500 分，确保有状态的人评分极低
                var statusPenalty = fuyuanCount * 500;

                // --- 3. 排序确认：是否是第一强 ---
                var enemies = game.filterPlayer(p => get.attitude(player, p) <= 0).sort((a, b) => {
                    return ((b.maxHp * 10) + get.threaten(b)) - ((a.maxHp * 10) + get.threaten(a));
                });

                // --- 4. 斩杀安全评估 ---
                var myShas = player.countCards('h', 'sha');
                var hisShas = target.countCards('h', 'sha');
                if (hisShas > myShas) return 0;

                if(enemiesCount == 1) return -999;

                // --- 5. 最终评分 ---
                var finalScore = power - statusPenalty;

                // 如果是第一强敌人，额外加成
                if (target == enemies[0]) finalScore += 1000;

                return -finalScore; // result.target 返回负数表示打击
            }
        }
    },
    sgz_tengyuan: {
        maixie_hp: true, // 优先回血
        threaten:1.6,
    },
};

// ---- 其它 AI 逻辑（不是技能的 `ai` 表，但只给 AI 用）----
//    · `check`：视为技「用哪张牌 / 要不要发动」的 AI 判定；
//    · `aiValue` / `aiOrder` / `aiUseful`：引擎 mod 钩子（get/index.js:6219/6285/6404），只影响 AI 估价。
export const helpers = {
    // 缚渊：AI 选「权能」的评分（原在角色文件 content 里的局部函数 `fuyuanAi`，只给 AI 用）
    //   ⚠ 分数越高越优先：反击(回合外且目标是伤害来源)时 opt5(秉尊) 直接 2000；
    //   常态梯度 绝敕(4) > 诰封(3) > 秉尊(5) > 潜谋(2) > 放逐(1)，并按目标特征加分。
    sgz_fuyuan_optionValue: function (button, target) {

        const player = get.player();
        const parent = _status.event.getParent();
        const trig = parent._trigger; // 获取触发源事件

        // --- 安全判定：只有在受到伤害触发时，才有 isCounter 和 isSource ---
        let isCounter = false;
        let isSource = false;

        if (trig && trig.name == 'damage') {
            isCounter = (_status.currentPhase != player); // 是否在回合外
            isSource = (target == trig.source);          // 目标是否为伤害来源
        }

        const optId = button.link;

        // --- 核心：反击状态下，选项5（秉尊）拥有统治级权重 ---
        if (isCounter && isSource && optId === "opt5") {
            return 2000; // 极高分，确保反击时必选
        }

        // --- 使用明确的权重梯度，解决“按顺序选”的问题 ---
        // 优先级排序：绝敕(4) > 诰封(3) > 秉尊(5) > 潜谋(2) > 放逐(1)

        if (optId === "opt4") {
            // 绝敕（禁疗）：永久且强力。对神赵云、华佗或残血敌人分值极大
            let s = 150;
            game.log('4');
            if (target.hasSkillTag('recover') || target.hasSkillTag('maixue') || target.hp <= 2) s += 100;
            if (target.name.indexOf('zhaoyun') != -1) s += 300;
            return s;
        }

        if (optId === "opt3") {
            // 诰封（得牌弃一）：永久且克制过牌。对郭嘉、月英等有效
            let s = 130;
            if (target.hasSkillTag('draw') || target.hasSkillTag('maixue')) s += 100;
            return s;
        }

        if (optId === "opt5") {
            // 秉尊（减伤/偷牌）：永久且克制高输出
            let s = 110;
            if (target.hasSkillTag('damageSource') || target.countCards('h', 'sha') >= 2) s += 100;
            return s;
        }

        if (optId === "opt2") {
            // 潜谋（封手牌）：非永久。手牌越多分越高
            return 30 + (target.countCards('h') * 15);
        }

        if (optId === "opt1") {
            // 放逐（封装备/判定）：非永久。装备越多分越高
            let s = 40;
            s += (target.countCards('e') * 30);
            if (target.hasSkillTag('rejudge')) s -= 200; // 绝对不要给张角司马懿送判定牌
            return s;
        }

        return 1; // 兜底保底分

    },
    sgz_fuyuan_xiaoguo_aiUseful: function(player, card, num) {
                                // 安全检测标签
                                var isQianlong = (card.gaintag && card.gaintag.contains('sgz_caomao_shaTag'));
                                // 兼容转化牌内部的实体牌检测
                                if (!isQianlong && card.cards) isQianlong = card.cards.some(c => c.gaintag && c.gaintag.contains('sgz_caomao_shaTag'));

                                if (isQianlong) {
                                    // === 核心逻辑修复：响应环节降权 ===
                                    // 如果当前处于“打出/响应”事件（如被杀、决斗、南蛮、倾讨死斗）
                                    // 我们给它一个极低的保底分数（0.01），确保它排在所有普通【杀】（约5分）的后面
                                    if (_status.event.name == 'chooseToRespond' || _status.event.openedBySkill) {
                                        return 0.01;
                                    }
                                    // 出牌阶段主动使用时，稍微降低优先级
                                    return num - 2;
                                }
                            },
    sgz_fuyuan_xiaoguo_aiValue: function(player, card, num) {
        if (card.hasGaintag('sgz_caomao_shaTag')) return num+100;
    },
};

// ---- 内联 AI 索引（角色文件里仍**直接写着**的 `.set("ai", …)`；数量由 check_ai_centralized 对账）----
//   ⚠ 这些多是「一行式闭包、依赖技能局部变量」的判定，搬出去要给每个调用点补参数，所以先留原地、只登记；
//     其中少数（如缚渊的 `fuyuanAi`）其实已经转交给 helpers，只是调用点还写着。
//   合计 4 处：sgz_fuyuan_xiaoguo 4

// ============================================================
//  AI 逻辑说明（纯注释，不参与运行）
// ------------------------------------------------------------
//  【sgz_fuyuan_xiaoguo】缚渊的受伤触发子技能
//    · `maixie_defend` / `maixue` / `expose: 1` / `threaten: 12`（威慑很高，容易被集火）。
//    · order：体力上限>1 → 200（全阶段最高，先叠缚渊再干别的）；上限=1 → -10（不点）。
//    · `result.player`：当前事件是 `damage` 且上限>1 → 50（"这次挨打很值"），否则 1。
//    · `effect.target`：受伤、上限>1、且本回合受伤次数<2 → [1,3]（把挨打当收益）。
//    · 短板：`result.player` 里 `if (player.maxHp == 1) return -1;` 写在 `return 1;` 之后，
//      是**永远走不到的死代码**。
//  【helpers.sgz_fuyuan_optionValue】缚渊选「权能」的 AI 评分（原角色文件 content 里的局部函数 `fuyuanAi`）
//    · 反击（回合外、且目标就是伤害来源）时：opt5（秉尊）直接 2000 ⇒ 一定选；常态梯度 绝敕(4) > 诰封(3) > 秉尊(5) > 潜谋(2) > 放逐(1)。
//  【sgz_qingtao】倾讨（限定技，一次性处决）
//    · `expose: 1`、order 19、`threaten: 3`；`result.player` 恒为 100（**非常**想用）。
//    · `result.target` 是一整套评分：
//        ① 友方 → -2（不选）；
//        ② power = 目标上限×10 + 其威慑；
//        ③ 目标身上每有一个缚渊状态（诰封/绝敕/秉尊/判定区有牌）扣 500（"留着白嫖更划算"）；
//        ④ 目标手里杀比我多 → 0（不敢打，怕被反杀）；
//        ⑤ 场上只剩一个敌人 → -999（打完就赢了，反而犹豫）；
//        ⑥ 若是"第一强敌人"再 +1000；
//        ⑦ 返回 `-finalScore`（负数=想选）。
//    · 短板：`result.player` 不看目标是否合法/是否都打不过；④ 用"双方手牌里【杀】的张数"当安全判断，
//      非常粗糙；`enemiesCount == 1` 那条 -999 实际上会让 AI 在决胜时**放弃**处决。
//  【sgz_tengyuan】腾渊：`maixie_hp: true`（卖血但优先回体力型）、`threaten: 1.6`。
// ============================================================
