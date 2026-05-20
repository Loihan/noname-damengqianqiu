export default {
    character: {
        sgz_jiangwei: {
            sex:"male", 
            group:"shen", 
            hp:4,
            maxHp:9, 
            skills:["sgz_jiufa","sgz_jiangwei_ui",], 
            img:"extension/大梦千秋/image/sgz_jiangwei.png",
            dieAudios:["ext:大梦千秋/audio/sgz_jiangwei/die.mp3","ext:大梦千秋/audio/sgz_jiangwei/ShenJiangWei_Dead.mp3"], 
            names:"姜|维",
            groupInGuozhan:"shu",
            4:["des:姜维字伯约，受武侯遗命，内抗权阉之谗，外御司马之师。<br>时蜀中凋敝，谯周辈交章言降，维孤身秉政，九伐中原。景耀六年，维出洮西，大破魏将王经，斩首数万，魏人闭关不敢出。当此时，汉祚如幽明之夜烛，摇摇欲坠。维感兴复之期将逝，遂燃逐日之志，不顾积劳成疾，率疲卒复出祁山。<br>及邓艾潜袭阴平，成都危殆，后主欲降。维于剑阁闻讯，未流连于关隘，竟奇兵反戈，诱魏军主力入渭水之谷。维效武侯火攻之法，纵火焚林，烈焰滔天，如薪燃不尽，魏师万人皆成绝烬。是役也，维以孤炬残影之躯，竟焚灭司马氏篡汉之精锐。<br>乘此大捷，维长驱入关，复还长安。捷报传至益州，蜀人心气大振，汉旗复耀于中原。史载，还都之日，维发尽白，袍甲尽碎，然其目中神采，犹若当年天水之少年。其志不灭，终使大汉之余火，燃成中兴之烈焰。", ]
        },
    },
    characterName: 'sgz_jiangwei',
    characterTitle: {sgz_jiangwei: "炽剑补天",},
    characterTranslate: {sgz_jiangwei: "姜维" },
    skills: {
        //====================================
        //          核心技能：九伐                   
        //====================================
        sgz_jiufa: {
            audio: "ext:大梦千秋/audio/sgz_jiangwei:6",
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
            derivation: ["sgz_xinran", "sgz_zhuri", "sgz_juejin", "sgz_guju", "sgz_youming","sgz_fuming"],
            trigger: { global: "phaseBegin" },
            //  filter: function(event, player) {
            //      return event.player != player;
            //  },
            ai:{
                fireAttack: true, // 可造成火属性伤害
            },
            content: function() {
                'step 0'

                var draw_target = Math.min(9, player.maxHp);

                if (player.countCards('h') < draw_target) {
                    player.drawTo(draw_target);
                } else {
                    player.draw();
                }

                if (player.countMark('sgz_jiufa') >= 9 && !player.hasSkill('sgz_youming_die')) {
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
                    event.diff = result.num1 - result.num2;
                    if(player.hasSkill('sgz_youming_die'))event.diff+=4;
                    player.addMark('sgz_jiufa', Math.min(event.diff, 9-player.countMark('sgz_jiufa')));
                    if (player.hasSkill('sgz_jiangwei_ui')) {
                        lib.skill.sgz_jiangwei_ui.updateUI(player);
                    }
                    player.draw();
                    player.gainMaxHp();
                    player.addSkill('sgz_jiufa_sha');
                } else {
                    event.finish();
                }
                'step 4'
                if (player.hasSkill('sgz_jiufa_sha') && event.diff > 0 && event.target.isAlive()) {
                    if (!player.hasSkill('sgz_youming_die')) {
                        player.useCard({ name: "sha", nature: "fire" }, event.target, false, 'sgz_jiufa_sha');
                    }else{
                        player.useCard({ name: "sha", nature: "kami" }, event.target, false, 'sgz_jiufa_sha');
                    }
                    event.diff--;
                    if (event.diff > 0) {
                        event.goto(4); // 继续循环使用火杀
                    } else {
                        player.removeSkill('sgz_jiufa_sha');
                    }
                }
                'step 5'
                var num = player.countMark('sgz_jiufa');
                var skills_to_add = [];
                //若没有发动幽明，才添加其他技能
                if (!player.hasSkill('sgz_youming_die')) {
                    if (num >= 1 && !player.hasSkill('sgz_xinran')) skills_to_add.push('sgz_xinran');  
                    if (num >= 3 && !player.hasSkill('sgz_zhuri')) skills_to_add.push('sgz_zhuri');
                    if (num >= 5 && !player.hasSkill('sgz_juejin')) skills_to_add.push('sgz_juejin');
                    if (num >= 7 && !player.hasSkill('sgz_guju')) skills_to_add.push('sgz_guju');
                    if (num >= 9 && !player.hasSkill('sgz_youming')) {
                        skills_to_add.push('sgz_youming');
                        player.node.avatar.setBackgroundImage('extension/大梦千秋/image/sgz_jiangwei_9.png');
                    }
                }
                if (skills_to_add.length) {
                    player.addSkill(skills_to_add);
                }
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
            // 优先级高于【幽明】
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
            ai: {
                viewHandcard: true,
                guanxing: true,
            },
            content: function() {
                'step 0'
                // 询问发动
                player.chooseBool(get.prompt('sgz_zhuri'), `是否对 ${get.translation(trigger.player)} 发动【逐日】，卜算牌堆顶七张牌？`).set('ai', () => {
                    if (player.maxHp <= 4 && player.hp <= 1) return false;
                    return true;
                });
                'step 1'
                if (result.bool) {
                    player.logSkill('sgz_zhuri', trigger.player);
                    player.loseHp();
                    player.chooseToGuanxing(7);
                    event.activated = true; // 设置自定义标记，防止 result 被覆盖
                } else {
                    event.finish();
                }
                'step 2'
                if (event.activated) {
                    // 使用标准的选项写法，result.control 会返回选项字符串
                    player.chooseControl('选项一', '选项二').set('choiceList', [
                        '摸三张牌', 
                        '将所有手牌交给一名角色，然后失去一点体力'
                    ]).set('ai', function() {
                        if (
                            ((player.maxHp > 9 )||(player.maxHp > 7 && player.maxHp < 9 && player.hp > 1)||(player.maxHp <= 7 && player.hp > 2) )
                            && game.hasPlayer(p => get.attitude(player, p) > 0 && p != player)
                            && !player.hasSkill('sgz_youming')
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
                        // 选择目标给牌
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
            ai: {
                order: 9, // 在孤炬之后执行，利用孤炬偷来的大牌进行拼点
                result: {
                    target: function(player, target) {
                        if (get.attitude(player, target) >= 0) return 0;
                        // 优先打击威胁值最高的目标
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
            ai: {
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
            ai:{
                maixue:true,
                effect: {
                    target: function(card, player, target) {
                        if (player.countCards("h") + player.maxHp >= 14&&player.hp==1) return [1,9];
                    }
                }
            },
            content: function() {
                'step 0'
                player.chooseBool(get.prompt('sgz_youming'), '是否发动【幽明】获得“复汉”回合？').set('ai', () => {
                    //若自己是主公且剩余敌人数>2则不发动
                    if (game.countPlayer(p => get.attitude(player, p) < 0)>2 && get.attitude(player, player) == 10) return false;
                    return true;
                });
                'step 1'
                if (result.bool) {
                    // 再选择目标
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

                    // 1. 插入新回合
                    //player.insertPhase();

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
                    player.storage.sgz_youming_target = target;
                    // 添加临时效果，有效期直到 phaseAfter (确保全流程覆盖)
                    player.addSkill('sgz_fuming');
                    player.addTempSkill('sgz_youming_counter', {player:'phaseAfter'});
                    player.addTempSkill('sgz_youming_die', {player:'phaseAfter'});
                    
                    target.addSkill('sgz_chouchou');
                    player.addSkill('sgz_chouchou_jiangwei_clear');
                    player.removeSkill('sgz_xinran');
                    player.removeSkill('sgz_zhuri');
                    player.removeSkill('sgz_juejin');
                    player.removeSkill('sgz_guju');
            
                    game.playAudio(`../extension/大梦千秋/audio/sgz_jiangwei/sgz_youming${[1,2,3].randomGet()}.mp3`);
                }
            },
        },
            // === 【复明】 ===
            sgz_fuming: {
                persevereSkill: true,
                audio: "ext:大梦千秋/audio/sgz_jiangwei:4",
                //onremove: function(player) { 
                //    delete player.storage.sgz_youming_target; 
                //    delete player.storage.sgz_youming_count;
                //    player.removeSkill('sgz_youming_counter');
                //},
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
                        //game.playAudio(`../extension/大梦千秋/audio/sgz_jiangwei/sgz_fuming${[1,2,3,4].randomGet()}.mp3`);
                        if (typeof player.storage.sgz_youming_count !== 'number') player.storage.sgz_youming_count = 0;
                        player.storage.sgz_youming_count++;
                        player.markSkill('sgz_youming_counter');
                        player.storage.sgz_youming_counter = player.storage.sgz_youming_count;
                        player.update();
                        event.finish();
                    }
                    "step 1"
                    if(player.storage.sgz_youming_count >=8) {
                        player.storage.sgz_youming_count++;
                        player.markSkill('sgz_youming_counter');
                        player.storage.sgz_youming_counter = player.storage.sgz_youming_count;
                        player.update();
                    }
                    // === 最终谢幕步骤 1：先交牌 ===
                    if (player.countCards('h') > 0) {
                        player.chooseTarget('幽明：请将所有牌交给一名其他角色', function(card, player, target){
                        return target != player;
                    })
                        .set('ai', target => get.attitude(player, target));
                    } else {
                        event.goto(3);
                    }
                    "step 2"
                    if (result.bool && result.targets) {
                        player.give(player.getCards('hes'), result.targets[0]);
                        result.targets[0].gainMaxHp();
                        result.targets[0].recover(9);
                    }
                    "step 3"
                    // === 最终谢幕步骤 2：仇敌立即死亡 (仅限完成9张牌时) ===
                    if (player.storage.sgz_youming_count >=8) {
                        var target = player.storage.sgz_youming_target;
                        if (target && target.isAlive()) {
                            game.log(player, '完成了最后的复汉使命，', target, '立即死亡');
                            target.die();
                        }
                    }
                    "step 4"
                    // === 最终谢幕步骤 3：姜维回复至上限后立即死亡 ===
                    // 这是修复死亡特效循环的关键：先重置体力和状态
                    player.removeSkill('sgz_fuming'); 
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
                },

            },
            sgz_youming_die: {
                charlotte: true,
                mark: true,
                forced:true,
                trigger:{player:["phaseUseAfter","phaseDiscardBegin","phaseEnd"]},
                marktext: "☠️",
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
        sgz_jiangwei_ui: {
            charlotte: true,
            trigger: {
                player: [
                    "enterGame",
                    "changeHp",
                    "awaken"
                ],
                global: [
                    "gameStart",
                    "phaseBeginStart"
                ]
            },
            forced: true,
            silent: true,
            priority: -10,

            init: function(player) {

                // ===== 样式 =====
                if (!document.getElementById('jiangwei_jiufa_style')) {
                    var style = document.createElement('style');
                    style.id = 'jiangwei_jiufa_style';
                    style.innerHTML = `

                    /* =========================
                    外层容器
                    ========================= */

                    .jiangwei-jiufa-wrap{
                        position:absolute;
                        left:100%;
                        top:3%;
                        margin-left:4px;

                        width:28px;
                        height:94%;

                        z-index:60;
                        pointer-events:none;

                        display:flex;
                        justify-content:center;
                        align-items:center;
                    }

                    /* =========================
                    中央古铜脊柱
                    ========================= */

                    .jiangwei-jiufa-core{
                        position:absolute;

                        width:6px;
                        height:100%;

                        background:
                            linear-gradient(
                                180deg,
                                #120d08 0%,
                                #3a2615 15%,
                                #2a1b10 50%,
                                #4b2f18 85%,
                                #120d08 100%
                            );

                        border:
                            1px solid rgba(255,180,80,0.18);

                        box-shadow:
                            inset 0 0 6px rgba(0,0,0,1),
                            0 0 8px rgba(120,40,10,0.2);

                        border-radius:999px;
                    }

                    /* =========================
                        真正的进度能量
                    ========================= */

                    .jiangwei-jiufa-energy{

                        position:absolute;

                        left:0;
                        bottom:0;

                        width:100%;
                        height:0%;

                        border-radius:999px;

                        transition:
                            height 0.7s cubic-bezier(0.22,1,0.36,1),
                            filter 0.4s;

                        background:
                            repeating-linear-gradient(
                                0deg,
                                rgba(255,220,120,0.15),
                                rgba(255,220,120,0.45) 12px,
                                rgba(255,120,40,0.2) 24px
                            ),
                            linear-gradient(
                                180deg,
                                #2a0900 0%,
                                #7a1d00 25%,
                                #ff5a00 70%,
                                #ffe08a 100%
                            );

                        background-size:
                            100% 60px,
                            100% 100%;

                        box-shadow:
                            0 0 8px rgba(255,90,20,0.55),
                            0 0 16px rgba(255,120,20,0.3);

                        animation:
                            jiangwei-energy-flow 2.8s infinite linear;
                    }

                    /* =========================
                    九伐节点
                    ========================= */

                    .jiangwei-jiufa-node{
                        position:absolute;

                        width:16px;
                        height:16px;

                        left:50%;
                        transform:translateX(-50%) scale(0.72);

                        opacity:0.22;

                        transition:
                            all 0.45s cubic-bezier(0.22,1,0.36,1);

                        z-index:2;
                    }

                    /* 菱形 */
                    .jiangwei-jiufa-node::before{
                        content:"";
                        position:absolute;
                        inset:0;

                        clip-path:polygon(
                            50% 0%,
                            100% 50%,
                            50% 100%,
                            0% 50%
                        );

                        background:
                            linear-gradient(
                                135deg,
                                #1c120b 0%,
                                #50311b 50%,
                                #1c120b 100%
                            );

                        border:
                            1px solid rgba(255,190,120,0.15);

                        box-shadow:
                            inset 0 0 4px rgba(0,0,0,0.9);
                    }

                    /* =========================
                    点亮状态
                    ========================= */

                    .jiangwei-jiufa-node.active{
                        opacity:0.92;
                        transform:translateX(-50%) scale(0.72);
                    }

                    /* 当前正在推进的伐痕 */
                    .jiangwei-jiufa-node.current{

                        opacity:1;

                        transform:
                            translateX(-50%)
                            scale(1.12);

                        z-index:5;

                        filter:
                            brightness(1.25)
                            drop-shadow(0 0 8px rgba(255,180,80,0.9));
                    }

                    .jiangwei-jiufa-node.current::before{

                        box-shadow:
                            0 0 12px rgba(255,200,120,1),
                            0 0 24px rgba(255,120,20,0.9),
                            inset 0 0 8px rgba(255,255,255,0.5);

                        border:
                            1px solid rgba(255,240,180,0.9);
                    }

                    .jiangwei-jiufa-node.active::before{
                        background:
                            linear-gradient(
                                135deg,
                                #3a1000 0%,
                                #b53b00 40%,
                                #ffd36a 50%,
                                #b53b00 60%,
                                #3a1000 100%
                            );

                        background-size:250% 250%;

                        border:
                            1px solid rgba(255,230,180,0.55);

                        box-shadow:
                            0 0 10px rgba(255,120,40,0.8),
                            0 0 18px rgba(255,80,20,0.45),
                            inset 0 0 6px rgba(255,220,120,0.55);

                        animation:
                            jiangwei-fire-flow 4s linear infinite;
                    }

                    /* =========================
                    内部火流
                    ========================= */

                    .jiangwei-jiufa-node.active::after{
                        content:"";
                        position:absolute;

                        top:18%;
                        left:18%;

                        width:64%;
                        height:64%;

                        clip-path:polygon(
                            50% 0%,
                            100% 50%,
                            50% 100%,
                            0% 50%
                        );

                        background:
                            linear-gradient(
                                180deg,
                                rgba(255,255,255,0.9),
                                rgba(255,210,120,0.2),
                                transparent
                            );

                        animation:
                            jiangwei-inner-burn 1.8s infinite alternate ease-in-out;
                    }

                    /* =========================
                    刻度位置
                    ========================= */

                    .jiangwei-jiufa-node:nth-child(2){ top:88%; }
                    .jiangwei-jiufa-node:nth-child(3){ top:77%; }
                    .jiangwei-jiufa-node:nth-child(4){ top:66%; }
                    .jiangwei-jiufa-node:nth-child(5){ top:55%; }
                    .jiangwei-jiufa-node:nth-child(6){ top:44%; }
                    .jiangwei-jiufa-node:nth-child(7){ top:33%; }
                    .jiangwei-jiufa-node:nth-child(8){ top:22%; }
                    .jiangwei-jiufa-node:nth-child(9){ top:11%; }
                    .jiangwei-jiufa-node:nth-child(10){ top:0%; }

                    /* =========================
                    第一阶段：薪燃
                    ========================= */

                    .jiangwei-jiufa-wrap.stage1 .jiangwei-jiufa-core{
                        box-shadow:
                            inset 0 0 8px rgba(0,0,0,1),
                            0 0 12px rgba(255,90,30,0.25);
                    }
                    .jiangwei-jiufa-wrap.stage1 .jiangwei-jiufa-energy{
                        filter:
                            brightness(0.85)
                            saturate(0.8);
                        box-shadow:
                            0 0 6px rgba(255,80,20,0.35);
                    }

                    /* =========================
                    第三阶段：逐日
                    ========================= */

                    .jiangwei-jiufa-wrap.stage3 .jiangwei-jiufa-node.active::before{
                        animation:
                            jiangwei-fire-flow 2.8s linear infinite;
                    }

                    .jiangwei-jiufa-wrap.stage3{
                        filter:brightness(1.08);
                    }
                    .jiangwei-jiufa-wrap.stage3 .jiangwei-jiufa-energy{

                        filter:
                            brightness(1)
                            saturate(1);

                        box-shadow:
                            0 0 10px rgba(255,100,30,0.65),
                            0 0 18px rgba(255,120,40,0.35);

                        animation:
                            jiangwei-energy-flow 1.8s infinite linear;
                    }
                    /* =========================
                    第五阶段：绝烬
                    ========================= */

                    .jiangwei-jiufa-wrap.stage5 .jiangwei-jiufa-core{
                        background:
                            linear-gradient(
                                180deg,
                                #100805 0%,
                                #5e1200 20%,
                                #281008 50%,
                                #7a1d00 80%,
                                #100805 100%
                            );
                    }

                    .jiangwei-jiufa-wrap.stage5 .jiangwei-jiufa-node.active{
                        filter:
                            brightness(1.2)
                            contrast(1.15);
                    }
                    .jiangwei-jiufa-wrap.stage5 .jiangwei-jiufa-energy{

                        filter:
                            brightness(1.2)
                            saturate(1.25);

                        box-shadow:
                            0 0 14px rgba(255,120,30,0.8),
                            0 0 28px rgba(255,80,20,0.5);

                        animation:
                            jiangwei-energy-flow 1.2s infinite linear;
                    }
                    /* =========================
                    第七阶段：孤炬
                    ========================= */

                    .jiangwei-jiufa-wrap.stage7{
                        animation:
                            jiangwei-pulse 2.5s infinite ease-in-out;
                    }

                    .jiangwei-jiufa-wrap.stage7 .jiangwei-jiufa-node.active{
                        filter:
                            drop-shadow(0 0 6px rgba(255,140,40,0.8));
                    }
                    .jiangwei-jiufa-wrap.stage7 .jiangwei-jiufa-energy{

                        filter:
                            brightness(1.35)
                            saturate(1.4);

                        box-shadow:
                            0 0 20px rgba(255,140,40,1),
                            0 0 40px rgba(255,90,20,0.7);

                        animation:
                            jiangwei-energy-flow 0.8s infinite linear;
                    }

                    /* =========================
                    第九阶段：幽明
                    ========================= */

                    .jiangwei-jiufa-wrap.stage9{

                        filter:
                            brightness(1.35)
                            contrast(1.2);

                        animation:
                            jiangwei-final-burn 2.8s infinite alternate;
                    }

                    .jiangwei-jiufa-wrap.stage9 .jiangwei-jiufa-core{

                        background:
                            linear-gradient(
                                180deg,
                                #fff6d6 0%,
                                #ffcc66 20%,
                                #ff6a00 50%,
                                #ffe29a 80%,
                                #fff6d6 100%
                            );

                        box-shadow:
                            0 0 14px rgba(255,220,120,1),
                            0 0 28px rgba(255,120,20,0.8);
                    }

                    .jiangwei-jiufa-wrap.stage9 .jiangwei-jiufa-node.active::before{

                        background:
                            linear-gradient(
                                135deg,
                                #fff7dc 0%,
                                #ffd66b 30%,
                                #ffffff 50%,
                                #ffae42 70%,
                                #fff7dc 100%
                            );

                        box-shadow:
                            0 0 14px rgba(255,255,220,0.9),
                            0 0 24px rgba(255,170,60,1);
                    }
                    .jiangwei-jiufa-wrap.stage9 .jiangwei-jiufa-energy{

                        filter:
                            brightness(1.65)
                            saturate(1.7);

                        box-shadow:
                            0 0 24px rgba(255,220,120,1),
                            0 0 55px rgba(255,140,40,1);

                        animation:
                            jiangwei-energy-flow 1s infinite linear;
                    }
                    /* =========================
                    动画
                    ========================= */

                    @keyframes jiangwei-fire-flow{
                        0%{
                            background-position:0% 0%;
                        }
                        100%{
                            background-position:100% 100%;
                        }
                    }

                    @keyframes jiangwei-inner-burn{
                        0%{
                            opacity:0.35;
                            transform:scale(0.82);
                        }
                        100%{
                            opacity:1;
                            transform:scale(1.08);
                        }
                    }

                    @keyframes jiangwei-pulse{
                        0%{
                            transform:translateY(0px);
                        }
                        50%{
                            transform:translateY(-1px);
                        }
                        100%{
                            transform:translateY(0px);
                        }
                    }

                    @keyframes jiangwei-final-burn{
                        0%{
                            filter:
                                brightness(1.15)
                                saturate(1.1);
                        }

                        100%{
                            filter:
                                brightness(1.45)
                                saturate(1.4);
                        }
                    }
                    @keyframes jiangwei-energy-flow{
                        0%{
                            background-position:
                                0 0,
                                0 0;
                        }

                        100%{
                            background-position:
                                0 -60px,
                                0 0;
                        }
                    }

                    `;
                    document.head.appendChild(style);
                }
                // ===== 创建UI =====
                if (!player.jiangweiUI) {

                    var wrap = document.createElement('div');
                    wrap.className = 'jiangwei-jiufa-wrap';

                    var core = document.createElement('div');
                    core.className = 'jiangwei-jiufa-core';

                    var energy = document.createElement('div');
                    energy.className = 'jiangwei-jiufa-energy';

                    core.appendChild(energy);
                    wrap.appendChild(core);

                    var nodes = [];
                    for (var i = 0; i < 9; i++) {
                        var node = document.createElement('div');
                        node.className = 'jiangwei-jiufa-node';
                        wrap.appendChild(node);
                        nodes.push(node);
                    }
                    player.appendChild(wrap);
                    player.jiangweiUI = {
                        wrap: wrap,
                        core: core,
                        energy: energy,
                        nodes: nodes
                    };
                }
            },

        updateUI: function(player) {
            var ui = player.jiangweiUI;
            if (!ui) return;
            var marks = player.countMark('sgz_jiufa') || 0;
            // ===== 能量高度 =====
            var percent = (marks / 9) * 100;
            ui.energy.style.height = percent + '%';

            // ===== 节点刷新 =====
            for (var i = 0; i < ui.nodes.length; i++) {
                ui.nodes[i].classList.remove('active');
                ui.nodes[i].classList.remove('current');
                if (i < marks) {
                    ui.nodes[i].classList.add('active');
                    if (i == marks - 1) {
                        ui.nodes[i].classList.add('current');
                    }
                }
            }

            // ===== 阶段清空 =====
            ui.wrap.classList.remove(
                'stage1',
                'stage3',
                'stage5',
                'stage7',
                'stage9'
            );

            // ===== 阶段追加 =====
            if (marks >= 1) ui.wrap.classList.add('stage1');
            if (marks >= 3) ui.wrap.classList.add('stage3');
            if (marks >= 5) ui.wrap.classList.add('stage5');
            if (marks >= 7) ui.wrap.classList.add('stage7');
            if (marks >= 9) ui.wrap.classList.add('stage9');
        },
        content:function(){
            lib.skill.sgz_jiangwei_ui.updateUI(player);
        },
            onremove: function(player) {
                if (player.jiangweiUI) {
                    player.jiangweiUI.wrap.remove();
                    delete player.jiangweiUI;
                }
            }
        },
    },
    skillTranslate: {
        sgz_jiufa: "九伐",
        sgz_jiufa_info: "锁定技，①每名角色回合开始时，若你的手牌数小于X，你将手牌摸至X（X为你的体力上限且至多为9）；否则，你摸一张牌。然后你选择一名其他角色拼点：若你赢，你摸1张牌、增加1点体力上限获得Y个“伐”标记并视为对其使用Y张火【杀】（Y为本次拼点牌的点数差，“伐”标记数至多为9）。<br>②根据你的“伐”标记数量，你视为拥有以下技能：<br>1：【薪燃】 3：【逐日】 5：【绝烬】 7：【孤炬】 9：【幽明】<br>③当“伐”标记达到9时此技能失去拼点效果。",
        //衍生技能
        sgz_xinran: "薪燃",//传子龙将军之力
        sgz_xinran_info: "锁定技。当你进入濒死状态时，若你的体力上限不为1则你减少1点体力上限，然后若你的体力上限>9，你摸1张牌并将体力回复至1点；否则，你摸2张牌并将体力回复至2点。",
        sgz_zhuri: "逐日",//继孔明武侯之智
        sgz_zhuri_info: "①其他角色的手牌对你可见。②一名角色的准备阶段时，你可以失去1点体力卜算7，然后你选择一项：1.摸三张牌；2.将手牌交给一名其他角色然后失去一点体力。",
        sgz_juejin: "绝烬",//效友若死国之烈
        sgz_juejin_info: "出牌阶段限一次。你选择一名角色重复拼点直到其中一方没有手牌。然后其减少X点体力上限，你增加X点体力上限（X为你拼点成功次数-你拼点失败次数，可以为负数）。",
        sgz_guju: "孤炬",//承玄德先帝之仁
        sgz_guju_info: "出牌阶段限一次。你可以选择一名其他角色，令其将手牌摸至其体力上限。然后，你观看其手牌，并可以用任意张你的手牌交换其等量的手牌。",
        sgz_youming: "幽明",//复伯约匡汉之明
        sgz_youming_info: "限定技，当你进入濒死状态时，你可以令一名其他角色获得“仇雠”标记并取消你的濒死结算，然后你摸体力上限数张牌，失去技能【薪燃】、【逐日】、【绝烬】、【孤炬】。【九伐】删除②和③效果并恢复拼点效果，修改拼点成功结果为“你摸1张牌、增加1点体力上限并视为对其使用Y张神【杀】（Y为本次拼点牌的点数差+4）。",
        sgz_fuming: "复明",
        sgz_fuming_info: "锁定技，①取消你的所有濒死结算；②你使用手牌只能指定自己和拥有“仇雠”标记的角色且无次数距离限制，每当你对其使用一张牌时，你获得一个“复明”标记；③当“复明”标记达到9时，你将所有牌交给一名其他角色，令其增加1点体力上限并回复9点体力，然后有“仇雠”标记的角色和你立即死亡；④你的出牌阶段结束时你立即死亡。",
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