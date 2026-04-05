export default {
    character: {
        mfsd_anyuanmofa: ["male", "shen", 1, ["mfsd_guishi", "mfsd_zhouyv", "mfsd_jiangming", "mfsd_xiongtun"], [
            "des:源自深渊的禁忌魔法。",
            "ext:大梦千秋/image/mfsd_anyuanmofa.jpg",
            "die:ext:大梦千秋/audio/mfsd_anyuanmofa/die/die.mp3"
        ]],
    },
    characterName: 'mfsd_anyuanmofa',
    characterTranslate: {
        mfsd_anyuanmofa: "暗渊魔法",
    },
    skills: {
// === 1. 鬼噬 (最终修正版：修复报错、初始化计数、回归结算) ===
        mfsd_guishi: {
            audio: "ext:大梦千秋/audio/mfsd_anyuanmofa/skill:4",
            persevereSkill: true,
            mark: true,
            marktext: "鬼噬",
            intro: {
                name: "鬼噬",
                // 修正 undefined 显示问题
                content: function(storage) {
                    return "已发动 " + (storage || 0) + " 次<br>共约13次";
                }
            },
            // 初始化标记为 0，防止开局显示 undefined
            init: function(player) {
                if (player.storage.mfsd_guishi === undefined) {
                    player.storage.mfsd_guishi = 0;
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
                        // 2. 核心：回到游戏后再增加上限
                        player.node.avatar.setBackgroundImage('extension/大梦千秋/image/mfsd_anyuanmofa.jpg');
                        player.gainMaxHp(1);
                        
                        "step 2"
                        // 3. 核心：此时回满体力
                        player.recover(player.maxHp - player.hp);
                        
                        "step 3"
                        player.removeSkill('mfsd_guishi_return');
                    }
                }
            }
        },

        // === 2. 咒域 (保持逻辑) ===
        mfsd_zhouyv: {
            audio: "ext:大梦千秋/audio/mfsd_anyuanmofa/skill:6",
            persevereSkill: true,
            trigger: { player: "phaseZhunbeiBegin" },
            forced: true,
            content: function() {
                "step 0"
                player.chooseTarget('咒域：横置任意名角色并获得其一张牌', [1, Infinity], function(card, player, target) {
                    return true;
                }).set('ai', function(target) {
                    return -get.attitude(_status.event.player, target);
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
                player.draw(player.getDamagedHp() + 1);
            }
        },

        // === 3. 降冥 (修改：变火焰伤害 + 标记回血) ===
        mfsd_jiangming: {
            audio: "ext:大梦千秋/audio/mfsd_anyuanmofa/skill:3",
            persevereSkill: true,
            trigger: { source: "damageBegin" },
            direct: true,
            filter: function(event, player) {
                return event.num > 0 && event.player.isAlive();
            },
            content: function() {
                "step 0"
                player.chooseBool('是否发动【降冥】令伤害+1并变为火焰伤害？、').set('ai', function() {
                    return get.attitude(player, trigger.player) < 0;
                });
                "step 1"
                if (result.bool) {
                    player.logSkill('mfsd_jiangming', trigger.player);
                    // 修改点：加伤 + 变火
                    trigger.num++;
                    trigger.nature = 'fire'; 
                    player.node.avatar.setBackgroundImage('extension/大梦千秋/image/mfsd_anyuanmofa2.jpg');
                    
                    // 给目标添加标记技能
                    trigger.player.addSkill('mfsd_jiangming_tag');
                    trigger.player.addMark('mfsd_jiangming_tag', 1);
                    // 注册清理监听
                    player.addTempSkill('mfsd_jiangming_clear', 'phaseUseAfter');
                }
            },
            subSkill: {
                tag: {
                    mark: true,
                    marktext: "降冥",
                    intro: { 
                        name: "降冥", 
                        content: function(storage) {
                            if (!storage) return null;
                            return "出牌阶段结束时将回复 " + storage + " 点体力";
                        }
                    }
                },
                clear: {
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
                                curr.recover(num);
                                curr.removeSkill('mfsd_jiangming_tag');
                                delete curr.storage.mfsd_jiangming_tag; 
                                curr.unmarkSkill('mfsd_jiangming_tag'); 
                                game.log(curr, '的“降冥”状态解除，回复了', num, '点体力');
                                player.node.avatar.setBackgroundImage('extension/大梦千秋/image/mfsd_anyuanmofa.jpg');
                            }
                            event.redo();
                        }
                    }
                }
            }
        },

        // === 4. 凶吞 (保持单次动画逻辑) ===
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
                trigger.player.die();
            }
        }
    },
    skillTranslate: {
        mfsd_guishi: "鬼噬",
        mfsd_guishi_info: "持恒技，锁定技，你死亡时，将一张【桃】移出游戏，然后防止死亡，改为将你移出游戏。你的上家回合结束时将你移回游戏，然后你增加1点体力上限并回满体力。",
        mfsd_zhouyv: "咒域",
        mfsd_zhouyv_info: "持恒技，锁定技，准备阶段，你横置任意名角色并获得其一张牌，然后你摸X张牌（X为你已损失体力值+1）。",
        mfsd_jiangming: "降冥",
        mfsd_jiangming_info: "持恒技，当你造成伤害时，可令此伤害+1且改为火焰伤害，并令目标获得一个“降冥”标记。你的出牌阶段结束时，所有拥有“降冥”标记的角色回复等同于其“降冥”标记数的体力并移除该标记。",
        mfsd_xiongtun: "凶吞",
        mfsd_xiongtun_info: "持恒技，当一名其他角色进入濒死状态时，你可以弃置所有手牌（至少1张），令其直接死亡。",
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