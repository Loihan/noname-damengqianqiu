export default {
    character: {
        sgz_jiangwei: [
            "male", 
            "shen", 
            "4/9", 
            ["sgz_jiufa"], 
            [
                "des:姜维字伯约，受武侯遗命，内抗权阉之谗，外御司马之师。<br>时蜀中凋敝，谯周辈交章言降，维孤身秉政，九伐中原。景耀六年，维出洮西，大破魏将王经，斩首数万，魏人闭关不敢出。当此时，汉祚如幽明之夜烛，摇摇欲坠。维感兴复之期将逝，遂燃逐日之志，不顾积劳成疾，率疲卒复出祁山。<br>及邓艾潜袭阴平，成都危殆，后主欲降。维于剑阁闻讯，未流连于关隘，竟奇兵反戈，诱魏军主力入渭水之谷。维效武侯火攻之法，纵火焚林，烈焰滔天，如薪燃不尽，魏师万人皆成绝烬。是役也，维以孤炬残影之躯，竟焚灭司马氏篡汉之精锐。<br>乘此大捷，维长驱入关，复还长安。捷报传至益州，蜀人心气大振，汉旗复耀于中原。史载，还都之日，维发尽白，袍甲尽碎，然其目中神采，犹若当年天水之少年。其志不灭，终使大汉之余火，燃成中兴之烈焰。", 
                "ext:大梦千秋/image/sgz_jiangwei.png",
                "die:ext:大梦千秋/audio/sgz_jiangwei/die.mp3"
            ], 
            9
        ],
    },
    characterName: 'sgz_jiangwei',
    characterTitle: {
        sgz_jiangwei: "炽剑补天",
    },
    characterTranslate: {
        sgz_jiangwei: "姜维",
    },
    skills: {
        // === 核心技能: 【九伐】 ===
sgz_jiufa: {
    audio: "ext:大梦千秋/audio/sgz_jiangwei:5",
    persevereSkill: true,
    forced: true,
    mark: true,
    marktext: "伐",
    intro: {
        name: "九伐",
        content: "mark",
        onunmark: function(storage, player) {
            player.removeSkill(["sgz_xinran", "sgz_zhuri", "sgz_juejin", "sgz_guju", "sgz_youming"]);
        },
    },
    derivation: ["sgz_xinran", "sgz_zhuri", "sgz_juejin", "sgz_guju", "sgz_youming"],
    trigger: { global: "phaseBegin" },
    //  filter: function(event, player) {
    //      return event.player != player;
    //  },
    content: function() {
        'step 0'

        var draw_target = Math.min(9, player.maxHp);

        if (player.countCards('h') < draw_target) {
            player.drawTo(draw_target);
        } else {
            player.draw();
        }
        
        // 【核心】在这里，我们只做逻辑判断，不播放音频
        if (player.countMark('sgz_jiufa') >= 9) {
            event.finish();
        }
        'step 1'
        var can_compare_target_exists = game.hasPlayer(function(current) {
            return player.canCompare(current) && current != player;
        });

        if (can_compare_target_exists) {
            player.chooseTarget('九伐：请选择一名其他角色进行拼点', true, function(card, player, target){
                return target != player && player.canCompare(target);
            }).set('ai', function(target){
                return -get.attitude(_status.event.player, target);
            });
        } else {
            game.log('场上没有可以拼点的目标，【九伐】失效');
            event.finish();
        }
        'step 2'
        if (result.bool && result.targets) {
            var target = result.targets[0];
            event.target = target;

            // 【核心】在这里，在发起拼点前，唯一一次地播放音频和记录日志
            player.logSkill('sgz_jiufa', target);

            player.chooseToCompare(target);
        } else {
            event.finish();
        }
        'step 3'
        if (result.bool) { 
            // 不再需要 logSkill
            player.addMark('sgz_jiufa', 1);
            player.draw();
            player.gainMaxHp();
            player.addSkill('sgz_jiufa_sha');
        } else {
            event.finish();
        }
        'step 4'
        if(player.hasSkill('sgz_jiufa_sha')){
             player.useCard({ name: "sha", nature: "fire" }, event.target, false, 'sgz_jiufa_sha');
             player.removeSkill('sgz_jiufa_sha');
        }
        'step 5'
        var num = player.countMark('sgz_jiufa');
        var skills_to_add = [];
        if (num >= 1 && !player.hasSkill('sgz_xinran')) skills_to_add.push('sgz_xinran');
        if (num >= 3 && !player.hasSkill('sgz_zhuri')) skills_to_add.push('sgz_zhuri');
        if (num >= 5 && !player.hasSkill('sgz_juejin')) skills_to_add.push('sgz_juejin');
        if (num >= 7 && !player.hasSkill('sgz_guju')) skills_to_add.push('sgz_guju');
        if (num >= 9 && !player.hasSkill('sgz_youming')) skills_to_add.push('sgz_youming');
        
        if (skills_to_add.length) {
            player.addSkill(skills_to_add);
        }
    },
},
        // 临时技能，用于正确触发视为使用杀
        sgz_jiufa_sha: { charlotte: true },

        // --- 衍生技能 ---
        sgz_xinran: {
            audio: "ext:大梦千秋/audio/sgz_jiangwei:3",
            persevereSkill: true,
            forced: true,
            trigger: { player: "dying" },
            // 优先级高于【幽明】
            priority: 5, 
            content: function() {
                player.loseMaxHp();
                player.recover(1 - player.hp);
            },
        },
        sgz_zhuri: {
            audio: "ext:大梦千秋/audio/sgz_jiangwei:3",
            persevereSkill: true,
            // 每轮限两次
            usable: 2,
            trigger: { global: "phaseZhunbeiBegin" },
            direct: true,
            content: function() {
                'step 0'
                player.chooseBool(get.prompt('sgz_zhuri'), `是否对 ${get.translation(trigger.player)} 发动【逐日】，观看牌堆顶七张牌？`).set('ai', () => Math.random() > 0.5);
                'step 1'
                if(result.bool) {
                    player.logSkill('sgz_zhuri', trigger.player);
                    player.chooseToGuanxing(7);
                }
            },
        },
        sgz_juejin: {
            audio: "ext:大梦千秋/audio/sgz_jiangwei:2",
            persevereSkill: true,
            enable: "phaseUse",
            usable: 1,
            skillAnimation: true,
            animationColor: 'fire',
            filterTarget: function(card, player, target) {
                return player.canCompare(target);
            },
            content: function() {
                'step 0'
                event.target = target;
                event.player_wins = 0;
                event.target_wins = 0;
                'step 1' // 循环拼点
                if (player.canCompare(event.target)) {
                    player.chooseToCompare(event.target);
                } else {
                    event.goto(3);
                }
                'step 2'
                if (result.bool) { // 玩家赢
                    event.player_wins++;
                } else { // 目标赢
                    event.target_wins++;
                }
                event.goto(1); // 继续循环
                'step 3' // 结算
                if (event.player_wins > 0) player.gainMaxHp(event.player_wins);
                if (event.target_wins > 0) event.target.gainMaxHp(event.target_wins);
                'step 4'
                if (event.target_wins > 0) player.loseMaxHp(event.target_wins);
                if (event.player_wins > 0) event.target.loseMaxHp(event.player_wins);
            },
        },
sgz_guju: {
    // === 核心修正: 技能已完全重写 ===
    audio: "ext:大梦千秋/audio/sgz_jiangwei:2",
    persevereSkill: true,
    // a. 这是一个出牌阶段的主动技
    enable: "phaseUse",
    usable: 1,
    // b. 筛选目标：必须是其他角色
    filterTarget: function(card, player, target) {
        return target != player;
    },
    // c. AI 逻辑
    ai: {
        order: 8, // 在出杀之前，适合用来调整手牌
        result: {
            target: function(player, target) {
                // 这是一个复杂的交换技能，AI暂时难以评估，我们先给一个基础的负收益
                return -1;
            }
        }
    },
    // d. 技能效果
    content: function() {
        'step 0' // 1. 令目标摸牌
        var num_to_draw = target.maxHp - target.countCards('h');
        if (num_to_draw > 0) {
            target.draw(num_to_draw);
        }
        
        'step 1' // 2. 观看并选择目标的手牌
        // 检查双方是否都有牌，如果一方没牌，则无法交换
        if (player.countCards('h') > 0 && target.countCards('h') > 0) {
            // a. 计算最多可以交换多少张牌
            var max_exchange = Math.min(player.countCards('h'), target.countCards('h'));
            // b. 弹出选牌框，让玩家选择目标的手牌
            player.choosePlayerCard(target, 'h', [1, max_exchange], '孤炬：请选择你想要的牌', 'visible').set('ai', function(button) {
                // AI 优先选择价值高的牌
                return get.value(button.link);
            });
        } else {
            game.log('双方手牌不足，无法交换');
            event.finish();
        }
        
        'step 2' // 3. 记录你选择的目标的牌
        if (result.bool && result.cards) {
            // a. 将你选择的牌（来自目标）存入 event 对象
            event.target_cards = result.cards;
            // b. 记录你选择了多少张牌
            event.num_to_exchange = result.cards.length;
        } else {
            event.finish();
        }
        
        'step 3' // 4. 选择你自己的等量手牌
        player.chooseCard('h', `孤炬：请选择${event.num_to_exchange}张你的手牌交给对方`, event.num_to_exchange, true)
        .set('ai', function(card) {
            // AI 优先给出价值低的牌
            return 5 - get.value(card);
        });
        
        'step 4' // 5. 执行交换
        if (result.bool && result.cards) {
            // a. 将你选择的牌（来自自己）存入 event 对象
            event.player_cards = result.cards;

            // b. 使用 game.loseAsync 同时处理双方的牌交换，这是最稳定可靠的方式
            game.loseAsync({
                gain_list: [
                    [player, event.target_cards], // 你获得目标的牌
                    [target, event.player_cards]  // 目标获得你的牌
                ],
                player: player,
                cards1: event.player_cards,
                cards2: event.target_cards,
                // 指定失去牌的来源
                gaintag_map: {
                    [player.playerid]: event.player_cards,
                    [target.playerid]: event.target_cards
                },
                // 这是一个“交换”动作，而不是“获得”
                type: 'swap',
            }).setContent('gaincardMultiple');
        }
    },
},


// === 梦姜维：【幽明】修复版 (严格遵循原逻辑) ===
// === 梦姜维：【幽明】及其衍生效果 (最终逻辑闭环版) ===

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
        // === 修改点1：无来源伤害不能发动 ===
        // trigger.source 必须存在且存活，否则无法进行后续复仇逻辑
        return event.source && event.source.isAlive();
    },
    content: function() {
        'step 0'
        player.chooseBool(get.prompt('sgz_youming'), '是否发动【幽明】进入复汉回合？（若成功发动，此回合结束你必死亡）').set('ai', () => true);
        'step 1'
        if (result.bool) {
            player.awakenSkill('sgz_youming');
            trigger.cancel(); // 取消濒死

            // 1. 插入新回合
            player.insertPhase();

            // 2. 中断当前回合
            var evt = _status.event;
            for (var i = 0; i < 10; i++) {
                if (evt && evt.name == 'phase') {
                    evt.skipped = true;
                    break;
                }
                if (evt && evt.getParent) evt = evt.getParent();
                else break;
            }
            
            // 3. 记录目标并添加核心效果
            player.draw(player.maxHp);
            player.storage.sgz_youming_target = trigger.source;
            // 添加临时效果，有效期直到 phaseAfter (确保全流程覆盖)
            player.addTempSkill('sgz_youming_effect', {player:'phaseAfter'});
            player.addTempSkill('sgz_youming_counter', {player:'phaseAfter'});
            
            game.playAudio(`../extension/大梦千秋/audio/sgz_jiangwei/sgz_youming${[1,2,3].randomGet()}.mp3`);
        }
    },
},

sgz_youming_effect: {
    charlotte: true,
    onremove: function(player) { 
        delete player.storage.sgz_youming_target; 
        delete player.storage.sgz_youming_count;
        player.removeSkill('sgz_youming_counter');
    },
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
    silent: true,
    filter: function(event, player) {
        // 1. 拦截濒死
        if (event.name == 'dying') return true;
        // 2. 拦截回合结束（万一跳过了出牌阶段，在此处抓取死亡）
        if (event.name == 'phase') return true;
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
        var isTurnEnd = (trigger.name == 'phase');

        if (isTurnEnd || isFinalCard) {
            event.goto(1); // 直接跳到交牌死步骤
        } else {
            // 普通出牌计数逻辑
            game.playAudio(`../extension/大梦千秋/audio/sgz_jiangwei/sgz_youming${[1,2,3].randomGet()}.mp3`);
            if (typeof player.storage.sgz_youming_count !== 'number') player.storage.sgz_youming_count = 0;
            player.storage.sgz_youming_count++;
            player.storage.sgz_youming_counter = player.storage.sgz_youming_count;
            player.markSkill('sgz_youming_counter');
            event.finish();
        }
        "step 1"
        // === 最终谢幕步骤 1：先交牌 ===
        if (player.countCards('h') > 0) {
            player.chooseTarget('幽明：请将所有手牌交给一名角色', true).set('ai', target => get.attitude(player, target));
        } else {
            event.goto(3);
        }
        "step 2"
        if (result.bool && result.targets) {
            player.give(player.getCards('h'), result.targets[0]);
        }
        "step 3"
        // === 最终谢幕步骤 2：仇敌立即死亡 (仅限完成9张牌时) ===
        if (player.storage.sgz_youming_count >= 8) {
            var target = player.storage.sgz_youming_target;
            if (target && target.isAlive()) {
                game.log(player, '完成了最后的复汉使命，', target, '立即死亡');
                target.die();
            }
        }
        "step 4"
        // === 最终谢幕步骤 3：姜维回复至上限后立即死亡 ===
        // 这是修复死亡特效循环的关键：先重置体力和状态
        player.removeSkill('sgz_youming_effect'); 
        player.recover(player.maxHp - player.hp); // 强行回满
        "step 5"
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
    }
}

    },
    
    skillTranslate: {
        sgz_jiufa: "九伐",
        sgz_jiufa_info: "持恒技，锁定技。①每名角色回合开始时，若你的手牌数小于X，你将手牌摸至X（X为你的体力上限且至多为9）；否则，你摸一张牌。然后你选择一名其他角色拼点：若你赢，你获得一个“伐”标记、摸一张牌、手牌上限+1、增加1点体力上限并视为对其使用一张火【杀】。<br>②根据你的“伐”标记数量，你视为拥有以下技能：<br>1：【薪燃】 3：【逐日】 5：【绝烬】 7：【孤炬】 9：【幽明】<br>③当“伐”标记达到9时此技能失去拼点效果。",
        sgz_xinran: "薪燃",
        sgz_xinran_info: "持恒技，锁定技。当你进入濒死状态时，你减1点体力上限并将体力回复至1点。",
        sgz_zhuri: "逐日",
        sgz_zhuri_info: "持恒技，一名角色的准备阶段时，你可以卜算7。",
        sgz_juejin: "绝烬",
        sgz_juejin_info: "持恒技，出牌阶段限一次。你选择一名角色重复拼点，直到其中一方没有手牌。然后其减少X点体力上限，你增加X点体力上限（X为你拼点成功次数-你拼点失败次数，可以为负数）。",
        sgz_guju: "孤炬",
        sgz_guju_info: "持恒技，出牌阶段限一次。你可以选择一名其他角色，令其将手牌摸至其体力上限。然后，你观看其手牌，并可以用任意张你的手牌交换其等量的手牌。",
        sgz_youming: "幽明",
        sgz_youming_info: "持恒技，限定技。当你进入濒死状态时，你可以立即终止濒死结算，并防止之后你的所有濒死结算，你在本回合结束后进入一个额外的“复汉”回。，“复汉”回合开始时你摸X张牌（X为你的体力上限），且此回合内，你使用牌只能指定自己和令你进入濒死的伤害来源，且无次数和距离限制；当你对其使用第9张牌时，你可以将所有手牌交给一名角色，然后令你进入濒死的角色和你立即死亡。",
    },
    characterTaici:{
        "sgz_jiufa":{order: 1,content:"汉贼岂能两相立，长驱河洛王业安！/雄关高岭壮英姿，一腔热血谱汉风!/残兵盘据雄关险，独梁力支大厦倾！/谋伐布划方寸内，驰马试剑天地间！/北望三千雄关，何忍山河倒悬！"},
        "sgz_xinran":{order: 2,content:"天地同协力，何愁汉道不昌？/举石补苍天，舍我更复其谁？/担北伐重托，当兴复汉室，还于旧都!"},
        "sgz_zhuri":{order: 3,content:"任将军之职，应厉兵秣马，军出陇右!/青天犹在汉，其辰在北，其兴在我！/天之所任者，负重如山，行役在远！"},
        "sgz_juejin":{order: 4,content:"愿以此身饲火，光耀天下长夜！/平北襄乱之心，纵身加斧钺亦不改半分！"},
        "sgz_guju":{order: 5,content:"九伐中原，以圆先帝遗志!/日日砺剑，相报丞相厚恩!"},
        "sgz_youming":{order: 6,content:"解甲事仇雠，竭力挽狂澜!/策马纵慷慨，捐躯抗虎豺!/此身独继隆中志，功成再拜五丈原！"},
        "die":{content:"残阳晦月映秋霜，天命不再计成空..."}
    }
};