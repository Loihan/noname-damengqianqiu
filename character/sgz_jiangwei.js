// 九伐天殇 UI 已抽离至 effect/sgz_jiangwei.js
import { jiangweiUI } from '../effect/sgz_jiangwei.js';
import AI, { helpers } from "../ai/sgz_jiangwei.js";

const JIUFA_MAX = 9;
/// 蓄力点（承汉标记）所在技能；标记名 = 技能名
const CHENGHAN = "sgz_chenghan";
/// 衍生技能门槛表：[蓄力点数, 技能名]（按点数从小到大）—— 由【承汉】② 授予
const CHENGHAN_DERIVED = [[1, "sgz_xinran"], [3, "sgz_zhuri"], [5, "sgz_juejin"], [7, "sgz_guju"], [9, "sgz_youming"]];

/// 是否 2 级（已发动过【幽明】：幽明免死时挂上的 `sgz_youming_die`）
function sgzJiufaIsLevelTwo(player) {
    return player.hasSkill("sgz_youming_die");
}

/// 加蓄力点（【承汉】的标记）：**上限 9**，且 gain<=0 时不调用 addMark
/// ⚠ 引擎 `addMark(i, num)` 里有 `if (!num) num = 1;`（player.js:4257-4259），
///   满 9 时 `9-9=0` 直接传进去会变成 +1 ⇒ 必须自己先判断。
function sgzChenghanGainMarks(player, num) {
    const gain = Math.min(num, JIUFA_MAX - player.countMark(CHENGHAN));
    if (gain <= 0) return 0;
    player.addMark(CHENGHAN, gain);
    // 刷新【九伐天殇】进度条
    if (player.hasSkill("sgz_jiangwei_ui")) {
        lib.skill.sgz_jiangwei_ui.updateUI(player);
    }
    return gain;
}

/// 【承汉】② 按当前蓄力点授予衍生技能；蓄力点满 9 时顺带触发「敕剑伏波」形态切换
function sgzChenghanSyncDerived(player) {
    if (!player.hasSkill(CHENGHAN)) return; // 已失去【承汉】（发动幽明后）→ ② 不再生效
    const marks = player.countMark(CHENGHAN);
    const add = CHENGHAN_DERIVED.filter(([need, skill]) => marks >= need && !player.hasSkill(skill)).map(([, skill]) => skill);
    if (add.length) player.addSkill(add);
    // ⚠ 换皮已经不在这里了：2026 需求把「自动换皮」的时机改成了**发动【幽明】**
    //   （见【幽明】content 里的 `dmqcApplySwapRules(player, "sgz_youming")`）。
    //   蓄力点满 9 只负责授予【幽明】，不再切形态。
}

/// 选一名可拼点的其他角色（没有则返回 null）
async function sgzJiufaChooseTarget(player) {
    // 场上没有任何可拼点目标时直接返回（描述里的「选择一名其他角色拼点」无法执行）
    const has = game.hasPlayer(function (cur) {
        return cur !== player && player.canCompare(cur);
    });
    if (!has) return null;
    const result = await player
        .chooseTarget("九伐：请选择一名其他角色进行拼点", true, function (card, p, target) {
            return target !== p && p.canCompare(target);
        })
        // 目标选择的 AI 在 ai/sgz_jiangwei.js（AI 只允许有一个来源）
        .set("ai", function (target) {
            return helpers.sgzJiufaTargetAI(player, target);
        })
        .forResult();
    return (result && result.targets && result.targets[0]) || null;
}

export default {
    character: {
        sgz_jiangwei: {
            sex:"male", 
            group:"shu", 
            hp:4,
            maxHp:9, 
            skills:["sgz_chenghan","sgz_jiufa","sgz_jiangwei_ui"],
            img:"extension/大梦千秋/image/sgz_jiangwei.png",
            dieAudios:["ext:大梦千秋/audio/sgz_jiangwei/die.mp3","ext:大梦千秋/audio/sgz_jiangwei/ShenJiangWei_Dead.mp3"], 
            names:"姜|维",
            groupInGuozhan:"shu",
            4:["des:姜维字伯约，受武侯遗命，内抗权阉之谗，外御司马之师。<br>时蜀中凋敝，谯周辈交章言降，维孤身秉政，九伐中原。景耀六年，维出洮西，大破魏将王经，斩首数万，魏人闭关不敢出。当此时，汉祚如幽明之夜烛，摇摇欲坠。维感兴复之期将逝，遂燃逐日之志，不顾积劳成疾，率疲卒复出祁山。<br>及邓艾潜袭阴平，成都危殆，后主欲降。维于剑阁闻讯，未流连于关隘，竟奇兵反戈，诱魏军主力入渭水之谷。维效武侯火攻之法，纵火焚林，烈焰滔天，如薪燃不尽，魏师万人皆成绝烬。是役也，维以孤炬残影之躯，竟焚灭司马氏篡汉之精锐。<br>乘此大捷，维长驱入关，复还长安。捷报传至益州，蜀人心气大振，汉旗复耀于中原。史载，还都之日，维发尽白，袍甲尽碎，然其目中神采，犹若当年天水之少年。其志不灭，终使大汉之余火，燃成中兴之烈焰。", ]
        },
    },
    characterName: 'sgz_jiangwei',
    characterTitle: {sgz_jiangwei: "炽剑补天",},
    characterTranslate: {sgz_jiangwei: "梦姜维" },
    skills: {
        //====================================
        //          核心技能：九伐                   
        //====================================
        sgz_jiufa: {
            audio: "ext:大梦千秋/audio/sgz_jiangwei:6",
            // 项目约定：所有武将技能都要有 persevereSkill（持恒技，技能不被无效化）
            persevereSkill: true,
            forced: true,
            derivation: ["sgz_chenghan", "sgz_xinran", "sgz_zhuri", "sgz_juejin", "sgz_guju", "sgz_youming", "sgz_fuming"],
            trigger: { global: "phaseBegin" },
            ai: AI.sgz_jiufa,
            // ===== 九伐（拆分后：只管「摸牌 + 拼点 + 加体力上限 + 视为使用杀」）=====
            //  描述：每名角色回合开始时，你将手牌摸至体力上限并选择一名其他角色拼点，
            //        若你赢，你增加X点体力上限并视为对其使用：
            //          1级：X张火【杀】；2级：X+4张神【杀】（X为点数差）
            //  ⚠ 蓄力点（标记）与衍生技能已经不在这里了 —— 见【承汉】。
            //  ⚠ 用 async 而不是 `'step N'` 写法：step 写法会被 StepCompiler 丢进 eval 重新求值，
            //    那里面拿不到本文件的模块级常量/函数（`sgzJiufaChooseTarget` / `sgzJiufaIsLevelTwo`）。
            async content(event, trigger, player) {
                // ① 手牌摸至体力上限
                if (player.countCards("h") < player.maxHp) {
                    await player.drawTo(player.maxHp);
                }

                // ② 选择拼点目标
                const target = await sgzJiufaChooseTarget(player);
                if (!target) {
                    game.log(player, "场上没有可拼点的目标，", "#g【九伐】", "失效");
                    return;
                }

                // ③ 拼点
                player.logSkill("sgz_jiufa", target);
                const result = await player.chooseToCompare(target).forResult();
                if (!result || !result.bool) return; // 没赢 → 本回合到此为止

                // X = 点数差；1级用 X 张火杀、2级用 X+4 张神杀
                const level2 = sgzJiufaIsLevelTwo(player);
                const x = Math.max(0, result.num1 - result.num2);
                const shaCount = level2 ? x + 4 : x;

                // ④ 增加 X 点体力上限
                if (x > 0) {
                    await player.gainMaxHp(x);
                }

                // ⑤ 视为对目标使用 shaCount 张【杀】（1级火杀 / 2级神杀）
                if (shaCount > 0) {
                    const nature = level2 ? "kami" : "fire";
                    player.addSkill("sgz_jiufa_sha");
                    try {
                        for (let i = 0; i < shaCount && target.isAlive(); i++) {
                            await player.useCard({ name: "sha", nature: nature }, target, false, "sgz_jiufa_sha");
                        }
                    } finally {
                        player.removeSkill("sgz_jiufa_sha");
                    }
                }
            },
        },

        // ====================================================
        //  承汉（从原九伐里拆出来的「蓄力 / 衍生技能」部分）
        // ====================================================
        sgz_chenghan: {
            persevereSkill: true,
            audio:0,
            forced: true,
            mark: true,
            marktext: "伐",
            intro: {
                name: "承汉",
                content: "mark",
            },
            ai: AI.sgz_chenghan,
            // 描述：蓄力技（0/9），当你拼点赢时，你获得点数差个蓄力点。
            //       根据你的蓄力点数视为拥有：1薪燃 3逐日 5绝烬 7孤炬 9幽明
            // ⚠ 与旧版的关键差别：**任何拼点赢都给蓄力点**（不止九伐那一次），
            //   因为走的是引擎的 `chooseToCompareAfter` 时机。
            trigger: { player: "chooseToCompareAfter" },
            filter(event, player) {
                // 拼点赢：result.bool 为 true（含被强制判赢的情况）
                return !!(event.result && event.result.bool && event.player === player);
            },
            async content(event, trigger, player) {
                // X = 点数差（拼点赢 ⇒ num1 > num2）
                const diff = Math.max(0, (trigger.result.num1 || 0) - (trigger.result.num2 || 0));
                if (diff > 0) sgzChenghanGainMarks(player, diff);
                // ② 按蓄力点授予衍生技能（9 点时给【幽明】并切形态）
                sgzChenghanSyncDerived(player);
            },
        },
        // 临时技能，用于正确触发视为使用杀
        sgz_jiufa_sha: { charlotte: true },

        //====================================
        //            衍生技能                  
        //====================================
        sgz_xinran: {
            audio: "ext:大梦千秋/audio/sgz_jiangwei:3",
            persevereSkill: true,
            forced: true,
            trigger: { player: "dying" },
            // 优先级低于【幽明】
            priority: 5, 
            content: function() {
                if(player.maxHp != 1) {
                    player.loseMaxHp();
                    var n = player.maxHp > 9 ? 1 : 2;
                    player.draw(n);
                    player.recover(n - player.hp);
                }
            },
        },
        sgz_zhuri: {
            audio: "ext:大梦千秋/audio/sgz_jiangwei:3",
            persevereSkill: true,
            trigger: { global: "phaseZhunbeiBegin" },
            direct: true,
            ai: AI.sgz_zhuri,
            content: function() {
                'step 0'
                // 询问发动
                player.chooseBool(get.prompt('sgz_zhuri'), `是否对 ${get.translation(trigger.player)} 发动【逐日】，卜算牌堆顶七张牌？`).set('ai', () => {
                    if (player.maxHp <= 4 && player.hp <= 1) return false;
                    return true;
                });
                'step 1'
                //观星效果
                if (result.bool) {
                    player.logSkill('sgz_zhuri', trigger.player);
                    player.loseHp();
                    player.chooseToGuanxing(7);
                    event.activated = true; // 设置自定义标记，防止 result 被覆盖
                } else {
                    event.finish();
                }
                'step 2'
                //选择选项
                if (event.activated) {
                    player.chooseControl('选项一', '选项二').set('choiceList', [
                        '摸三张牌', 
                        '将所有手牌交给一名角色，然后失去一点体力'
                    ]).set('ai', function() {
                        if (
                            ((player.maxHp > 9 )||(player.maxHp > 7 && player.maxHp < 9 && player.hp >= 2)||(player.maxHp <= 7 && player.hp >= 3) )
                            && game.hasPlayer(p => get.attitude(player, p) > 0 && p != player)
                            && !player.hasSkill('sgz_youming_die')
                        ) return '选项二';
                        return '选项一';
                    });
                } else {
                    event.finish();
                }
                'step 3'
                if (result.control) {
                    if (result.control == '选项一') {
                        player.draw(3);
                        event.finish();
                    } else {
                        // 选项二：选择给牌目标
                        player.chooseTarget('将手牌交给一名其他角色，然后失去一点体力',true, (card, player, target) => {
                            return target != player;
                        }).set('ai', (target) => {
                            return get.attitude(_status.event.player, target);
                        });
                    }
                } else {
                    event.finish();
                }
                'step 4'
                // 给牌、失去体力
                if (result.bool && result.targets && result.targets.length) {
                    var target = result.targets[0];
                    var cards = player.getCards('h');
                    if (cards.length) {
                        player.give(cards, target);
                    }
                    player.loseHp();
                }
            },
        },
        sgz_juejin: {
            audio: "ext:大梦千秋/audio/sgz_jiangwei:3",
            persevereSkill: true,
            enable: "phaseUse",
            usable: 1,
            filterTarget: function(card, player, target) {
                return player.canCompare(target);
            },
            // === 核心 AI 逻辑 ===
            ai: AI.sgz_juejin,
            
            content: function() {
                'step 0'
                event.target = target;
                event.player_wins = 0;
                event.target_wins = 0;
                'step 1' 
                if (player.canCompare(event.target)) {
                    player.chooseToCompare(event.target);
                    game.playAudio(`../extension/大梦千秋/audio/sgz_jiangwei/sgz_guju${[1,2].randomGet()}.mp3`);
                } else {
                    event.goto(3);
                }
                'step 2'
                if (result.bool) { 
                    event.player_wins++;
                } else { 
                    event.target_wins++;
                }
                event.goto(1); 
                'step 3' 
                if (event.player_wins > 0) player.gainMaxHp(event.player_wins);
                if (event.target_wins > 0) event.target.gainMaxHp(event.target_wins);
                'step 4'
                if (event.target_wins > 0) player.loseMaxHp(event.target_wins);
                if (event.player_wins > 0) event.target.loseMaxHp(event.player_wins);
            },
        },
        sgz_guju: {
            audio: "ext:大梦千秋/audio/sgz_jiangwei:2",
            persevereSkill: true,
            enable: "phaseUse",
            usable: 1,
            filterTarget: function(card, player, target) {
                return target != player;
            },
            ai: AI.sgz_guju,
            content: function() {
                'step 0'
                var num_to_draw = target.maxHp - target.countCards('h');
                if (num_to_draw > 0) {
                    target.draw(num_to_draw);
                }
                
                'step 1' 
                if (player.countCards('h') > 0 && target.countCards('h') > 0) {
                    var max_exchange = Math.min(player.countCards('h'), target.countCards('h'));
                    // === AI 逻辑：拿走对方点数最大的牌 ===
                    player.choosePlayerCard(target, 'h', [1, max_exchange], '孤炬：请选择你想要的牌', 'visible').set('ai', function(button) {
                        // 返回点数，点数越大 AI 越优先选择
                        return get.number(button.link);
                    });
                } else {
                    game.log('双方手牌不足，无法交换');
                    event.finish();
                }
                
                'step 2' 
                if (result.bool && result.cards) {
                    event.target_cards = result.cards;
                    event.num_to_exchange = result.cards.length;
                } else {
                    event.finish();
                }
                
                'step 3' 
                // === AI 逻辑：给出自己手里点数最小的牌 ===
                player.chooseCard('h', `孤炬：请选择${event.num_to_exchange}张你的手牌交给对方`, event.num_to_exchange, true)
                .set('ai', function(card) {
                    // 20减点数，意味着点数越小返回的值越大，AI 越优先给出去
                    return 20 - get.number(card);
                });
                
                'step 4' 
                if (result.bool && result.cards) {
                    event.player_cards = result.cards;

                    game.loseAsync({
                        gain_list: [
                            [player, event.target_cards], 
                            [target, event.player_cards]  
                        ],
                        player: player,
                        cards1: event.player_cards,
                        cards2: event.target_cards,
                        gaintag_map: {
                            [player.playerid]: event.player_cards,
                            [target.playerid]: event.target_cards
                        },
                        type: 'swap',
                    }).setContent('gaincardMultiple');
                }
            },
        },
        // === 【幽明】及其衍生效果  ===
        sgz_youming: {
            audio: "ext:大梦千秋/audio/sgz_jiangwei:3",
            persevereSkill: true,
            limited: true,
            skillAnimation: true,
            animationColor: 'fire',
            mark: true,
            intro: { content: 'limited' },
            trigger: { player: "dying" },
            priority: 6,
            direct: true,
            filter: function(event, player) {
                return game.hasPlayer(function(current){
                    return current != player;
                });
            },
            ai: AI.sgz_youming,
            content: function() {
                'step 0'
                player.chooseBool(get.prompt('sgz_youming'), '是否发动【幽明】获得“复汉”回合？').set('ai', () => {
                    //若自己是主公且剩余敌人数>2则不发动
                    if (game.countPlayer(p => get.attitude(player, p) < 0)>2 && get.attitude(player, player) == 10) return false;
                    return true;
                });
                'step 1'
                if (result.bool) {
                    // 选择“仇雠”目标角色
                    player.chooseTarget('请选择一名角色获得“仇雠”标记', true, function(card, player, target){
                        return target != player;
                    }).set('ai', function(target){
                        var player = _status.event.player;
                        return -get.threaten(player, target) - get.attitude(player, target);
                    });
                } else {
                    event.finish();
                }
                'step 2'
                if (result.bool && result.targets) {
                    var target = result.targets[0];
                    player.awakenSkill('sgz_youming');
                    trigger.cancel(); // 取消濒死

                    
                    // 摸牌并记录目标
                    player.draw(player.maxHp);
                    player.storage.sgz_youming_target = target;
                    // 添加效果
                    player.addSkill('sgz_fuming');
                    player.addSkill(['sgz_youming_counter', 'sgz_youming_die','sgz_chouchou_jiangwei_clear']);         
                    target.addSkill('sgz_chouchou');
     
                    player.removeSkill(['sgz_xinran','sgz_zhuri','sgz_juejin','sgz_guju']);
                    // 需求：幽明发动后**失去【承汉】**，但右侧能量条要**保持满格**。
                    //   · 先把标记补满（理论上到 9 才会拿到幽明，这里兜底）
                    //   · removeSkill 只 `unmarkSkill`（去掉徽标），**不会删 storage**
                    //     （noname/library/element/player.js:10508，只有 `onremove:"storage"` 才删）
                    //     ⇒ 蓄力点数还在，能量条依旧满。
                    player.storage.sgz_chenghan = 9;
                    player.removeSkill('sgz_chenghan');
                    if (player.hasSkill('sgz_jiangwei_ui')) lib.skill.sgz_jiangwei_ui.updateUI(player);
            
                    game.playAudio(`../extension/大梦千秋/audio/sgz_jiangwei/sgz_youming${[1,2,3].randomGet()}.mp3`);

                    // 需求（2026）：**发动限定技【幽明】= 自动换皮**的时机（原来判的是“伐达 9”）。
                    //   · 走皮肤规则表的「技能驱动」分支（skin.js 8 节：`skill: "sgz_youming"`），
                    //     由它按动态/静态分流换成「敕剑伏波」/「敕剑伏波(静)」。
                    //   · ⚠ 放在这里、并用 setTimeout 延后一拍：
                    //       此刻还在 `dying` 事件里（`trigger.cancel()` 刚取消濒死），
                    //       立刻改立绘容易和濒死/换立绘的重绘撞车，所以让出当前帧再切。
                    //   · ⚠ 判定「是否拥有幽明」不能只靠 `player.hasSkill`：
                    //       上面刚 `awakenSkill('sgz_youming')`，它会把技能 `disableSkill`，
                    //       而 `game.filterSkills` 会过滤掉 disabledSkills ⇒ hasSkill 变 false。
                    //       skin.js 里 `dmqcPlayerOwnsSkill()` 已经把「已觉醒」算作拥有。
                    [0, 300].forEach(function (delay) {
                        setTimeout(function () {
                            try {
                                if (typeof window.dmqcApplySwapRules === 'function') {
                                    window.dmqcApplySwapRules(player, 'sgz_youming');
                                }
                            } catch (e) {}
                        }, delay);
                    });
                }
            },
        },
            // === 【复明】 ===
            sgz_fuming: {
                persevereSkill: true,
                audio: "ext:大梦千秋/audio/sgz_jiangwei:4",
                mod: {
                    playerEnabled: function(card, player, target) {
                        var youming_target = player.storage.sgz_youming_target;
                        if (youming_target && target != player && target != youming_target) return false;
                    },
                    cardUsable: () => Infinity,
                    targetInRange: () => true,
                },
                trigger: { 
                    player: ["useCard", "dying", "phaseAfter"] // 增加 phaseAfter 作为最终死亡补丁
                },
                forced: true,
                filter: function(event, player) {
                    // 1. 拦截濒死
                    if (event.name == 'dying') return true;
                    // 2. 拦截回合结束（万一跳过了出牌阶段，在此处抓取死亡）
                    if (event.name == 'phaseAfter') return true;
                    // 3. 拦截出牌
                    var target = player.storage.sgz_youming_target;
                    return target && event.targets && event.targets.includes(target);
                },
                content: function() {
                    "step 0"
                    // 如果是濒死，直接取消，防止特效循环
                    if (trigger.name == 'dying') {
                        trigger.cancel();
                        event.finish();
                        return;
                    }
                    
                    // 如果是回合结束或第9张牌逻辑，进入最终谢幕
                    var isFinalCard = (trigger.name == 'useCard' && player.storage.sgz_youming_count >= 8);
                    var isTurnEnd = (trigger.name == 'phaseAfter');

                    if (isTurnEnd || isFinalCard) {
                        event.goto(1); // 直接跳到交牌死步骤
                    } else {
                        // 普通出牌计数逻辑
                        if (typeof player.storage.sgz_youming_count !== 'number') player.storage.sgz_youming_count = 0;
                        player.storage.sgz_youming_count++;
                        player.markSkill('sgz_youming_counter');
                        player.storage.sgz_youming_counter = player.storage.sgz_youming_count;
                        player.update();
                        event.finish();
                    }
                    //标记达到8时进入再用牌，进入step步骤，
                    "step 1"
                    //复明9的显示补丁
                    if(player.storage.sgz_youming_count >=8) {
                        player.storage.sgz_youming_count++;
                        player.markSkill('sgz_youming_counter');
                        player.storage.sgz_youming_counter = player.storage.sgz_youming_count;
                        player.update();
                    }
                    "step 2"
                    //仇雠立即死亡
                    if (player.storage.sgz_youming_count >=8) {
                        var target = player.storage.sgz_youming_target;
                        if (target && target.isAlive()) {
                            game.log(player, '完成了最后的复汉使命，', target, '立即死亡');
                            target.die();
                        }
                    }
                    "step 3"
                    //选择交牌角色
                    if (player.countCards('h') > 0) {
                        player.chooseTarget('幽明：请将所有牌交给一名其他角色', function(card, player, target){
                        return target != player;
                    }).set('ai', target => get.attitude(player, target));
                    } else {
                        event.goto(5);
                    }
                    "step 4"
                    //交牌
                    if (result.bool && result.targets) {
                        player.give(player.getCards('hes'), result.targets[0]);
                        result.targets[0].gainMaxHp();
                        result.targets[0].recover(9);
                    }
                    "step 5"
                    //最终：姜维回复至上限后立即死亡（为了修复死亡特效循环的关键：先重置体力和状态）
                    // ⚠ 按需求（2026）：【复明】走**觉醒**语义（觉醒技那样「觉醒失效」），
                    //   不是「失去技能」。两者差别（引擎 player.js:10240 `awakenSkill`）：
                    //     · `awakenSkill(x)`：技能仍在技能栏里（显示为已觉醒），
                    //        写 `awakenedSkills`、`storage[x] = true`，并用 `disableSkill(x + "_awake", x)`
                    //        把它**禁用**（触发器不再响应）⇒ 这就是「觉醒失效」；
                    //     · `removeSkill(x)`：技能从技能栏里彻底消失 ⇒ 那才是「失去」。
                    //   ⚠ 这一行同时覆盖「成功」和「失败」两条分支：
                    //      成功 → step0 里 `isFinalCard` 判真 → `event.goto(1)`；
                    //      失败 → step0 里 `isTurnEnd` 判真 → `event.goto(1)`；
                    //      （濒死那一条在 step0 就 `event.finish()` 返回了，不会走到这里）
                    //   所以两分支都是「觉醒失效」，不再区分。
                    player.awakenSkill('sgz_fuming');
                    player.recover(player.maxHp - player.hp); 
                    "step 6"
                    player.die(); // 满血死亡，系统会正确处理此事件并清除所有濒死监听
                }
            },
                sgz_youming_counter: {
                    charlotte: true,
                    mark: true,
                    marktext: "复明",
                    intro: {
                        name: "幽明",
                        content: function(storage) {
                            var count = storage || 0;
                            return '已对目标使用 ' + count + '/9 张牌';
                        }
                    },

                },
                sgz_youming_die: {
                    charlotte: true,
                    mark: true,
                    forced:true,
                    trigger:{player:["phaseUseAfter","phaseDiscardBegin","phaseEnd"]},
                    marktext: "死亡",
                    intro: {
                        name: "死亡",
                        content: "出牌阶段结束时你死亡",
                    },
                    content: function() {
                        player.die();
                    }
                },
                sgz_chouchou: {
                    charlotte: true,
                    mark: true,
                    marktext: "仇雠",
                    intro: { content: "姜维对你使用第9张牌时，你立即死亡" },
                },
                sgz_chouchou_jiangwei_clear: {
                    charlotte: true,
                    trigger: { player: "dieBegin" },
                    forced: true,
                    silent: true,
                    filter: function(event, player) {
                        return player.storage.sgz_youming_target && player.storage.sgz_youming_target.isAlive();
                    },
                    content: function() {
                        var target = player.storage.sgz_youming_target;
                        if (target) target.removeSkill('sgz_chouchou');
                    },
                },
        // === 姜维专属：【九伐天痕】UI ===
        // === 姜维专属：【九伐天殇】UI（实现见 effect/sgz_jiangwei.js） ===
        sgz_jiangwei_ui: jiangweiUI,
    },
    skillTranslate: {
        sgz_chenghan: "承汉",
        sgz_chenghan_info:
            "<span style='color:#FF0000;'><strong>蓄力技</strong></span>（0/9），" +
            "①<span style='color:#00FF00;'>蓄力</span>：当你拼点赢时，你获得X个蓄力点（X为点数差）。" +
            "<br>②根据你的蓄力点数视为拥有以下技能：1:〖薪燃〗 3：〖逐日〗 5：〖绝烬〗 7：〖孤炬〗 9：〖幽明〗。",
        sgz_jiufa: "九伐",
        sgz_jiufa_info:
            "锁定技，每名角色回合开始时，你将手牌摸至体力上限并选择一名其他角色拼点，若你赢，你增加X点体力上限并视为对其使用：" +
            "<br><span style='color:#FF4500;font-weight:bold;'>1级</span>：X张火【杀】；" +
            "<br><span style='color:#FF4500;font-weight:bold;'>2级</span>：X+4张神【杀】。",
        
        //衍生技能
        sgz_xinran: "薪燃",//传子龙将军之力
        sgz_xinran_info: "锁定技。当你进入濒死状态时，若你的体力上限不为1，则你减少1点体力上限，若此时你的体力上限大于/不大于9，你摸一/两张牌并将体力回复至一/两点。",
        sgz_zhuri: "逐日",//继孔明武侯之智
        sgz_zhuri_info: "①其他角色的手牌对你可见。②一名角色的准备阶段时，你可以失去1点体力卜算7，然后你选择一项：1.摸三张牌；2.将手牌交给一名其他角色然后失去一点体力。",
        sgz_juejin: "绝烬",//效友若死国之烈
        sgz_juejin_info: "出牌阶段限一次。你选择一名角色重复拼点直到其中一方没有手牌。然后其减少X点体力上限，你增加X点体力上限（X为你拼点成功次数-你拼点失败次数，可以为负数）。",
        sgz_guju: "孤炬",//承玄德先帝之仁
        sgz_guju_info: "出牌阶段限一次。你可以选择一名其他角色，令其将手牌摸至其体力上限。然后，你观看其手牌，并可以用任意张你的手牌交换其等量的手牌。",
        sgz_youming: "幽明",//复伯约匡汉之明
        sgz_youming_info: "限定技，当你进入濒死状态时，你可以令一名其他角色获得“仇雠”标记并取消你的濒死结算，然后你摸体力上限数张牌，升级〖九伐〗，失去〖承汉〗，获得〖复明〗。",
        sgz_fuming: "复明",
        sgz_fuming_info: 
            "使命技，①取消你的所有濒死结算。你使用手牌只能指定自己和“仇雠”且无次数距离限制。" +
            "<br>②<span style='color:#00FF00;'>成功</span>：当你对“仇雠”累计使用9张牌时，其立即死亡，你将所有牌交给一名其他角色，其增加1点体力上限并回复9点体力，然后你立即死亡。" +
            "<br>③<span style='color:#00FF00;'>失败</span>：你的出牌阶段结束时，你立即死亡。",
    },
    characterTaici:{
        "sgz_jiufa":{order: 1,content:"汉贼岂能两相立，长驱河洛王业安！/雄关高岭壮英姿，一腔热血谱汉风!/残兵盘据雄关险，独梁力支大厦倾！/谋伐布划方寸内，驰马试剑天地间！/从丞相之重托，剑指雍凉!/尊先主之遗志，举兵北伐!"},
        "sgz_xinran":{order: 2,content:"天地同协力，何愁汉道不昌？/举石补苍天，舍我更复其谁？/担北伐重托，当兴复汉室，还于旧都!"},
        "sgz_zhuri":{order: 3,content:"任将军之职，应厉兵秣马，军出陇右!/青天犹在汉，其辰在北，其兴在我！/天之所任者，负重如山，行役在远！"},
        "sgz_juejin":{order: 4,content:"愿以此身饲火，光耀天下长夜！/北望三千雄关，何忍山河倒悬！/平北襄乱之心，纵身加斧钺亦不改半分！"},
        "sgz_guju":{order: 5,content:"九伐中原，以圆先帝遗志!/日日砺剑，相报丞相厚恩!"},
        "sgz_youming":{order: 6,content:"阙下来时亲伏奏，贼尘未尽不为家!/雄谋独断众勿摇，孤注一掷挽汉宵!/此身独继隆中志，功成再拜五丈原！"},
        "sgz_fuming":{order: 7,content:"解甲事仇雠，竭力挽狂澜。/策马纵慷慨，捐躯抗虎豺。/胆略继武侯，壮志吞魏京。/竭智佐汉兴，力扶天柱倾。"},
        "die":{content:"残阳晦月映秋霜，天命不再计成空..."}
    }
};