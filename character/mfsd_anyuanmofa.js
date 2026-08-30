export default {
    character: {
        mfsd_anyuanmofa: {
            sex:"male", 
            group:"shen", 
            hp:1, 
            skills:["mfsd_guishi", "mfsd_zhouyv", "mfsd_jiangming", "mfsd_xiongtun"], 
            img:"extension/大梦千秋/image/mfsd_anyuanmofa.jpg",
            dieAudios:["ext:大梦千秋/audio/mfsd_anyuanmofa/die/die.mp3"],
            names:"司马|懿",
            groupInGuozhan:"ye",
            4:["des:源自深渊的禁忌魔法。",]
        },
    },
    characterName: 'mfsd_anyuanmofa',
    characterTranslate: {mfsd_anyuanmofa: "暗渊魔法",},
    skills: {
        // === 1. 鬼噬  ===
        mfsd_guishi: {
            audio: "ext:大梦千秋/audio/mfsd_anyuanmofa/skill:4",
            persevereSkill: true,
            mark: true,
            marktext: "鬼噬",
            intro: {
                name: "鬼噬",
                content: function(storage) {
                    return "已发动 " + (storage || 0) + " 次<br>共约13次";
                }
            },
            ai:{threaten: 99,},
            // 初始化标记为 0，防止开局显示 undefined
            init: function(player) {
                if (player.storage.mfsd_guishi === undefined) {
                    player.storage.mfsd_guishi = 0;
                }
            },
            mod: {
                cardUsable: function(card, player, num) {
                    if (card.name == 'sha') return num+player.countMark('mfsd_guishi');
                },
                //禁疗逻辑：不吃桃
                aiOrder: function(player, card, num) {
                    // 鬼噬标记 ≤10：绝对不吃桃/回血牌
                    if (player.countMark('mfsd_guishi') <= 10) {
                        if (get.tag(card, 'recover')) return -100;
                        if (player.isDying() && (card.name == 'tao' || card.name == 'jiu')) return -1000; 
                    }
                    return num;
                },
                // 新增：AI 绝对不解锁自己的铁索连环
                aiUnchain: function(player) {
                    if (player.countMark('mfsd_guishi') <= 10) {
                        return false; // 永远不解锁
                    }
                }
            },
            trigger: { player: "dieBegin" },
            forced: true,
            filter: function(event, player) {
                // 核心修复：使用 get.cardPile 检查牌堆，防止 game.countCards 报错
                // 判定条件：有伤害来源 且 牌堆里还有【桃】
                return get.cardPile(c => c.name == 'tao');
            },
            content: function() {
                "step 0"
                // 寻找牌堆里的桃
                var card = get.cardPile(c => c.name == 'tao');
                if (card) {
                game.cardsGotoSpecial([card]);
                game.log(player, '将牌堆中的', card, '移出游戏');
                // 增加发动次数标记
                player.addMark('mfsd_guishi', 1);
                player.node.avatar.setBackgroundImage('extension/大梦千秋/image/mfsd_anyuanmofa2.jpg');

                // 1. 阻止死亡并弃置所有牌
                trigger.cancel(); 
                player.discard(player.getCards('hej'));
                
                // 2. 立即进入修整状态 (移出游戏)
                player.out('mfsd_guishi');
                game.log(player, '进入了修整状态');
                
                // 3. 添加带 forceOut 的回归监听器
                player.addSkill('mfsd_guishi_return');
                } else {
                    event.finish();
                }
            },
            // === 核心AI重写：只攻不防逻辑 ===
            ai: {
                // 留牌价值 (决定弃牌阶段留什么)
                value: function(card, player) {
                    // 如果是伤害类卡牌（杀、决斗、南蛮等），大幅提升保留价值
                    if (get.tag(card, 'damage')) return get.value(card, player) + 20;
                    // 如果是防御/回复类卡牌（闪、无懈、桃），价值归零（诱导弃置）
                    if (get.tag(card, 'respondShan') || get.tag(card, 'recover') || card.name == 'wuxie') return 0;
                    // 装备牌和其他功能牌保留价值极低
                    return get.value(card, player) * 0.1;
                },
                // 使用价值 (决定出牌阶段用什么)
                useful: function(card, player) {
                    // 极度倾向于使用伤害牌
                    if (get.tag(card, 'damage')) return get.useful(card, player) + 20;
                    // 非伤害类牌的使用欲望减半
                    return get.useful(card, player) * 0.5;
                },
                // 配合“只攻不防”：告诉AI即便没闪也没关系，反正有鬼噬
                noShan: true,
                threaten: 2.5
            },
            subSkill: {
                return: {
                    trigger: { global: "phaseAfter" },
                    forced: true,
                    silent: true,
                    forceOut: true, // 允许在移出状态下触发
                    filter: function(event, player) {
                        // 判定：当前结束回合的是自己的上家
                        return player.isOut() && _status.currentPhase == player.getPrevious();
                    },
                    content: function() {
                        "step 0"
                        // 1. 移回游戏
                        player.in('mfsd_guishi');
                        game.log(player, '修整结束，回到了战场');
                        
                        "step 1"
                        // 2. 核心：回到游戏后再回复体力
                        player.node.avatar.setBackgroundImage('extension/大梦千秋/image/mfsd_anyuanmofa.jpg');
                        player.gainMaxHp(1);
                        player.recover(1 - player.hp);
                        
                        "step 2"
                        player.removeSkill('mfsd_guishi_return');
                    }
                }
            }
        },
        // === 2. 咒域  ===
        mfsd_zhouyv: {
            audio: "ext:大梦千秋/audio/mfsd_anyuanmofa/skill:6",
            persevereSkill: true,
            trigger: { player: "phaseZhunbeiBegin" },
            forced: true,
            ai:{expose: 1,},
            content: function() {
                "step 0"
                player.chooseTarget('咒域：横置任意名角色并获得其一张牌', [1, Infinity], function(card, player, target) {
                    return true;
                }).set('ai', function(target) {
                    if( target == player && player.countMark('mfsd_guishi')<=10)return 1;
                    return 1-get.attitude(_status.event.player, target);
                });
                "step 1"
                if (result.bool && result.targets && result.targets.length) {
                    event.targets = result.targets.sortBySeat();
                    for (var i = 0; i < event.targets.length; i++) {
                        event.targets[i].link(true);
                    }
                } else {
                    event.goto(3);
                }
                "step 2"
                if (event.targets.length > 0) {
                    var current = event.targets.shift();
                    if (current.countCards('he')) {
                        player.gainPlayerCard(current, 'he', true);
                    }
                    event.redo();
                }
                "step 3"
                player.draw(Math.min( player.getDamagedHp(), game.countPlayer('alive') ) + 1);
            }
        },
        // === 3. 降冥 ===
        mfsd_jiangming: {
            audio: "ext:大梦千秋/audio/mfsd_anyuanmofa/skill:3",
            persevereSkill: true,
            trigger: { source: "damageBegin" },
            direct: true,
            filter: function(event, player) {
                return event.num > 0 && event.player.isAlive() && event.player != player;
            },
            ai:{expose: 0.5,},
            content: function() {
                "step 0"
                player.chooseBool('是否发动【降冥】令伤害+1并变为火焰伤害？、').set('ai', function() {
                    return get.attitude(player, trigger.player) <= 0;
                });
                "step 1"
                if (result.bool) {
                    player.logSkill('mfsd_jiangming', trigger.player);
                    player.node.avatar.setBackgroundImage('extension/大梦千秋/image/mfsd_anyuanmofa2.jpg');
                    
                    // 给目标添加标记技能
                    trigger.player.addSkill('mfsd_jiangming_tag');
                    trigger.player.addMark('mfsd_jiangming_tag', 1);
                    // 注册清理监听
                    player.addTempSkill('mfsd_jiangming_clear', 'phaseUseAfter');
                    //加伤变火
                    trigger.num+=trigger.player.countMark('mfsd_jiangming_tag');
                    trigger.nature = 'fire'; 
                }
            },
            subSkill: {
                tag: {
                    persevereSkill: true,
                    mark: true,
                    marktext: "降冥",
                    intro: { 
                        name: "降冥", 
                        content: function(storage) {
                            if (!storage) return null;
                            return '受到伤害时伤害+1<br>暗渊魔法的出牌阶段结束时，你随机弃置 ' + (storage || 0) + ' 张牌，并回复等量体力，移除等量标记。 ';
                        }
                    },
                    trigger: { player: "damageBegin" },
                    forced: true,
                    filter: function(event, player) {
                        return event.num > 0&& event.nature != 'fire';
                    },
                    content: function() {
                        trigger.num++;
                    }
                },
                clear: {
                    persevereSkill: true,
                    trigger: { player: "phaseUseEnd" },
                    forced: true,
                    silent: true,
                    content: function() {
                        "step 0"
                        var list = game.filterPlayer(p => p.hasSkill('mfsd_jiangming_tag') || p.storage.mfsd_jiangming_tag > 0);
                        event.list = list;
                        "step 1"
                        if (event.list.length > 0) {
                            var curr = event.list.shift();
                            var num = curr.countMark('mfsd_jiangming_tag');
                            if (num > 0) {
                                var cards = curr.getCards('h');
                                var toDiscard = Math.min(num, cards.length);
                                
                                if (toDiscard > 0) {
                                    var discards = cards.randomGets(toDiscard);
                                    curr.discard(discards);
                                    curr.recover(toDiscard);
                                    curr.removeMark('mfsd_jiangming_tag', toDiscard);
                                    game.log(curr, '因【降冥】弃置了', discards, '张牌，回复了', toDiscard, '点体力');
                                    if (curr.countMark('mfsd_jiangming_tag') === 0) {
                                        curr.removeSkill('mfsd_jiangming_tag');
                                        delete curr.storage.mfsd_jiangming_tag;
                                        curr.unmarkSkill('mfsd_jiangming_tag');
                                    }
                                }
                                player.node.avatar.setBackgroundImage('extension/大梦千秋/image/mfsd_anyuanmofa.jpg');
                            }
                            event.redo();
                        }
                    }
                }
            }
        },
        // === 4. 凶吞   ===
        mfsd_xiongtun: {
            audio: "ext:大梦千秋/audio/mfsd_anyuanmofa/skill:4",
            persevereSkill: true,
            trigger: { global: "dying" },
            filter: function(event, player) {
                return player.countCards('h') > 0 && event.player != player;
            },
            check: function(event, player) {
                return get.attitude(player, event.player) <= 0;
            },
            content: function() {
                "step 0"
                player.trySkillAnimate('mfsd_xiongtun', 'key');
                player.logSkill('mfsd_xiongtun', trigger.player);
                player.discard(player.getCards('h'));
                "step 1"
                trigger.cancel();
                trigger.player.die(player);
            },
            ai: {
                expose: 1,
                order: 20, 
                result: {
                    target: function(player, target) {
                        if (get.attitude(player, target) > 0) return 0;
                        // 目标威胁越大，AI越想去拆他的牌
                        return -get.threaten(target);
                    }
                }
            },
        }
    },
    skillTranslate: {
        mfsd_guishi: "鬼噬",
        mfsd_guishi_info: "锁定技，①你死亡时，将一张【桃】移出游戏，然后防止死亡，改为将你移出游戏。你的上家回合结束时将你移回游戏并增加一点体力上限、回复至1点体力。②你的出牌阶段出【杀】次数+X（X为发动“鬼噬”的次数）。",
        mfsd_zhouyv: "咒域",
        mfsd_zhouyv_info: "锁定技，准备阶段，你横置任意名角色并获得其一张牌，然后你摸X+1张牌（X为你已损失体力值，但不超过全场人数）。",
        mfsd_jiangming: "降冥",
        mfsd_jiangming_info: "①当你即将对其他角色造成伤害时，然后你可令其获得一个“降冥”标记，然后此伤害+X且改为火焰伤害（X为其“降冥”标记数）。②有“降冥”标记的角色受到的非火焰伤害+1。③你的出牌阶段结束时，所有拥有“降冥”标记的角色随机弃置X张牌（X为其“降冥”标记数且不超过其牌数），然后其回复X点体力并移除X个“降冥”标记。",
        mfsd_xiongtun: "凶吞",
        mfsd_xiongtun_info: "当一名其他角色进入濒死状态时，你可以弃置所有手牌（至少1张），令其直接死亡。",
        mfsd_jiangming_tag: "降冥",
    },
    characterTaici: {
        "mfsd_guishi": { order: 1, content: "恐惧和渴望，多么甜美的食粮。/我来收这个世界欠我的债。/期待下一个幸运者。/凝视深渊，你将不再孤独。" },
        "mfsd_zhouyv": { order: 2, content: "逃无可逃的，不妨称之为宿命吧。/黑魔法可是这世上难得公平的交易。/羊皮纸上的灵魂总在阴雨天哀鸣，啧，真吵。/打开禁典第十三页，你会得到想要的东西。/尽情呼唤吧，但会回应你的，只有我。/让我从冬眠中苏醒的就是你吗，幸运者？" },
        "mfsd_jiangming": { order: 3, content: "我无处不在！/焚烧殆尽！/复仇冥火！" },
        "mfsd_xiongtun": { order: 4, content: "听到了，你内心的召唤！/嗯~你躲在这里！/迅速，就不会痛苦！/汝愿必偿！" },
        "die": { content: "我...宽恕众生..." }
    },
};