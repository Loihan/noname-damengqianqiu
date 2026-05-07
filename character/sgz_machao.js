export default {
    character: {
        sgz_machao: [
            "male", 
            "shen", 
            4, 
            ["sgz_shouli","sgz_leiji","sgz_mingzong"], 
            [
                "des:西凉锦马超，统领万众铁骑。当他踏入战场之时，甲胄与兵刃皆化为尘土，唯有万马奔腾的轰鸣响彻星域。",
                "ext:大梦千秋/image/sgz_machao.jpg",
                "die:ext:大梦千秋/audio/sgz_machao/die.mp3"
            ]
        ],
    },
    characterName: 'sgz_machao',
    characterTranslate: {sgz_machao: "马超",},
    skills: {
        // === 技能1：【狩骊】 ===
        sgz_shouli: {
            persevereSkill: true,
            audio: "ext:大梦千秋/audio/sgz_machao:4",
            forced: true,
            trigger: { global: "gameStart" },
            priority: 15,
            content: function() {
                "step 0"
                player.logSkill('sgz_shouli');
                var all = game.filterPlayer();
                for (var i = 0; i < all.length; i++) {
                    var target = all[i];
                    //if (target != player) {
                        target.disableEquip(1); 
                        target.disableEquip(2); 
                    //}
                    target.expandEquip(3); 
                    target.expandEquip(4); 
                    target.update();
                }
                "step 1"
                var horses_def = ['jueying', 'dilu', 'hualiu','zhuahuang'];
                var horses_atk = ['chitu', 'dawan', 'zixin'];
                var suits = ['spade', 'heart', 'club', 'diamond'];
                for (var i = 0; i < game.players.length; i++) {
                    var target = game.players[i];
                    for (var j = 0; j < 1; j++) {
                        var card_def = game.createCard({
                            name: horses_def.randomGet(),
                            suit: suits.randomGet(),
                            number: Math.floor(Math.random() * 13) + 1
                        });
                        target.equip(card_def);
                    }
                    for (var k = 0; k < 1; k++) {
                        var card_atk = game.createCard({
                            name: horses_atk.randomGet(),
                            suit: suits.randomGet(),
                            number: Math.floor(Math.random() * 13) + 1
                        });
                        target.equip(card_atk);
                    }
                    game.log(target, '的四骑阵列（双防御马、双进攻马）已整备完毕');
                }
                "step 2"
                game.broadcastAll(function() {
                    ui.update();
                });
            }
        },
        // === 技能2：【雷殛】及其衍生效果 ===
        sgz_leiji: {
            audio: "ext:大梦千秋/audio/sgz_machao:4",
            enable: ["chooseToUse", "chooseToRespond"],
            persevereSkill: true,
            selectCard: 0,
            filter: function(event, player) {
                var cardName = event.filterCard({ name: 'sha' }, player, event) ? 'sha' :
                               event.filterCard({ name: 'shan' }, player, event) ? 'shan' : null;
                if (!cardName) return false;
                var horseType = (cardName == 'sha') ? 'equip4' : 'equip3';
                return game.hasPlayer(t => t.countCards('e', { subtype: horseType }) > 0);
            },
            viewAs: function(cards, player) {
                var event = _status.event;
                if (event.filterCard({ name: 'sha' }, player, event)) return { name: 'sha' };
                if (event.filterCard({ name: 'shan' }, player, event)) return { name: 'shan' };
            },
            filterTarget: function(card, player, target) {
                var horseType = (card.name == 'sha') ? 'equip4' : 'equip3';
                return target.countCards('e', { subtype: horseType }) > 0;
            },
            selectTarget: 1,
            // === 核心 AI 注入：优先级与特定连招规避 ===
            ai: {
                respondSha: true,
                respondShan: true,
                order: 18, // 提高优先级，出牌阶段首选
                result: {
                    player: 1,
                    target: function(player, target) {
                        var evt = _status.event;
                        // 判定是否为“主动使用杀”的情况
                        var isUsingSha = evt.name == 'chooseToUse' && evt.filterCard({name:'sha'}, player, evt);
                        
                        // 逻辑：如果本回合发动过鸣踪，且现在是主动用杀，绝对不杀队友
                        if (isUsingSha && player.hasHistory('useSkill', function(h_evt){return h_evt.skill == 'sgz_mingzong'})) {
                            if (get.attitude(player, target) > 0) return 0;
                        }

                        // 基础逻辑：优先对态度低的角色（敌人）发动
                        return -get.attitude(player, target);
                    }
                }
            },
            onuse: function(result, player) {
                "step 0"
                var target = result.targets[0];
                var cardName = result.card.name;
                var horseType = (cardName == 'sha') ? 'equip4' : 'equip3';
                var horses = target.getCards('e', { subtype: horseType });
                if (horses.length > 0) {
                    target.discard(horses[0]);
                    game.log(player, '弃置了', target, '的坐骑发动【雷殛】');
                    if (target != player) {
                        player.logSkill('sgz_leiji', target);
                        if (!player.storage.sgz_leiji_targets) player.storage.sgz_leiji_targets = [];
                        player.storage.sgz_leiji_targets.add(target);
                        player.addTempSkill('sgz_leiji_effect', { player: 'phaseAfter' });
                        target.addTempSkill('sgz_leiji_thunder', { player: 'phaseAfter' });
                        target.addSkill('sgz_leiji_boom');
                        game.log(player, '对', target, '施加了⚡与💥效果');
                    }
                    if (cardName == 'sha') target.enableEquip(1);
                    if (cardName == 'shan') target.enableEquip(2);
                }
                if (cardName == 'sha') {
                    result.card.unlimited = true;
                    var parent = _status.event.getParent();
                    if (parent) parent.addCount = false;
                }
            },
            onrespond: function(result, player) {
                "step 0"
                var cardName = result.card.name;
                var horseType = (cardName == 'sha') ? 'equip4' : 'equip3';
                var target = (result.targets && result.targets[0]) || game.findPlayer(t => t != player && t.countCards('e', { subtype: horseType }) > 0);
                if (!target) return;
                var horses = target.getCards('e', { subtype: horseType });
                if (horses.length > 0) {
                    target.discard(horses[0]);
                    if (target != player) {
                        player.logSkill('sgz_leiji', target);
                        if (!player.storage.sgz_leiji_targets) player.storage.sgz_leiji_targets = [];
                        player.storage.sgz_leiji_targets.add(target);
                        player.addTempSkill('sgz_leiji_effect', { player: 'phaseAfter' });
                        target.addTempSkill('sgz_leiji_thunder', { player: 'phaseAfter' });
                        target.addSkill('sgz_leiji_boom');
                        game.log(player, '对', target, '施加了⚡与💥效果');
                    }
                    if (cardName == 'sha') target.enableEquip(1);
                    if (cardName == 'shan') target.enableEquip(2);
                }
                if (cardName == 'sha') {
                    result.card.unlimited = true;
                    var parent = _status.event.getParent();
                    if (parent) parent.addCount = false;
                }
            }
        },
            sgz_leiji_effect: {
                charlotte: true,
                onremove: function(player) {
                    if (player.storage.sgz_leiji_targets) {
                        player.storage.sgz_leiji_targets.forEach(function(target){
                            if (target && target.hasSkill('sgz_leiji_boom')) {
                                target.removeSkill('sgz_leiji_boom');
                            }
                        });
                    }
                    delete player.storage.sgz_leiji_targets;
                },
                mod: {
                    targetInRange: function(card, player, target) {
                        if (player.storage.sgz_leiji_targets && player.storage.sgz_leiji_targets.contains(target)) {
                            return true;
                        }
                    },
                    cardUsableTarget: function(card, player, target) {
                        if (player.storage.sgz_leiji_targets && player.storage.sgz_leiji_targets.contains(target)) {
                            return true;
                        }
                    }
                }
            },
            sgz_leiji_thunder: {
                charlotte: true,
                mark: true,
                marktext: "⚡",
                intro: {
                    name: "雷殛·雳",
                    content: "受到的伤害+1且改为雷电伤害"
                },
                trigger: {player: "damageBegin"},
                forced: true,
                content: function() {
                    trigger.num++;
                    trigger.nature = 'thunder';
                    game.log(
                        player,
                        '受⚡影响，伤害+1且改为雷电伤害'
                    );
                },
            },
            sgz_leiji_boom: {
                charlotte: true,
                mark: true,
                marktext: "💥",
                intro: {
                    name: "雷殛·破",
                    content: "马超对你使用牌无距离和次数限制"
                },
            },
        // === 技能2：【鸣踪】 ===
        sgz_mingzong: {
            audio: "ext:大梦千秋/audio/sgz_machao:4",
            persevereSkill: true,
            trigger: {
                global: ["loseAfter","loseAsyncAfter","cardsDiscardAfter","equipAfter"],
            },
            usable: 1,
            filter: function(event, player) {
                if (!event.getd) {
                    return false;
                }
                let cards = event.getd();
                return cards.some(card => {
                    if (get.position(card) != "d" || get.type(card) != "equip") {
                        return false;
                    }
                    if (card.willBeDestroyed("discardPile", get.owner(card), event)) {
                        return false;
                    }
                    return game.hasPlayer(current => {
                        return current.canEquip(card, true);
                    });
                });
            },
            cost: async function(event, trigger, player) {
                const cards = trigger.getd().filter(card => {
                    if (get.position(card) != "d" || get.type(card) != "equip") {
                        return false;
                    }
                    if (card.willBeDestroyed("discardPile", get.owner(card), trigger)) {
                        return false;
                    }
                    return true;
                });
                const {
                    result: { bool, targets, links },
                } = await player.chooseButtonTarget({
                    createDialog: [get.prompt2(event.skill), cards],
                    filterTarget(card, player, target) {
                        const buttons = ui.selected.buttons;
                        if (!buttons.length) {
                            return false;
                        }
                        return target.canEquip(buttons[0].link, true);
                    },
                    ai1(button) {
                        return 20 - get.value(button.link);
                    },
                    ai2(target) {
                        const player = get.player();
                        const card = ui.selected.buttons[0]?.link;
                        if (!card) {
                            return 0;
                        }
                        if (!target.countCards("h")) {
                            return get.value(card, target) * get.attitude(player, target);
                        }
                        return (get.value(card, target) - 2 * target.countCards("h")) * get.attitude(player, target);
                    },
                });
                event.result = {
                    bool: bool,
                    targets: targets,
                    cards: links,
                };
            },
            content: async function(event, trigger, player) {
                const {
                    targets: [target],
                    cards: [card],
                } = event;
                target.$gain2(card);
                await game.delay();
                await target.equip(card);
                const num = target.countCards("h");
                if (num > 0 && target != player) {
                    await player.gainPlayerCard(target, true, "h", num);
                }
            },
            "_priority": 0,
        }
    },
    skillTranslate: {
        sgz_shouli: "狩骊",
        sgz_shouli_info: "锁定技，游戏开始时，所有角色废除武器栏与防具栏并获得一个额外的进攻马栏与防御马栏，然后依次装备一张游戏外的进攻马和防御马（随机花色点数）。",
        sgz_leiji: "雷殛",
        sgz_leiji_info: "当你需要使用或打出【杀】/【闪】时，你可以弃置一名角色装备区的第一张进攻/防御坐骑牌，视为你使用或打出了一张【杀】/【闪】（依此法使用的杀不计入次数且目标始终为为依此法失去坐骑牌的角色；依此法打出牌时始终优先弃置事件来源的坐骑牌），依此法失去坐骑牌的其他角色：①受到的伤害+1且改为雷电伤害直到其回合结束；②你对其使用牌无距离次数限制直到你的回合结束。此牌结算后，依此法失去了进攻/防御坐骑牌的角色若有废除的武器栏/防具栏，恢复之。",
        sgz_mingzong:"鸣踪",
        sgz_mingzong_info:"每回合限一次，当有装备牌被弃置时，你可以将其中一张置入一名角色装备区，然后获得其所有手牌。",
    },
    characterTaici: {
        "sgz_shouli": { order: 1, content: "赶缚苍龙擒猛虎，一枪纵横定天山！/马踏祁连山河动，兵起玄黄奈何天！/此身独傲，天下无不可敌之人，无不可去之地！/神威天降，世间无不可驭之雷，无不可降之马！" },
        "sgz_leiji": { order: 2, content: "横枪立马，独啸秋风！/世皆彳亍，唯我纵横！/赤骊骋疆，巡狩八荒！/长缨在手，百骥可降！" },
        "sgz_mingzong": { order: 3, content: "雷部显圣，引赤电为翼，铸霹雳成枪！/一骑破霄汉，饮马星河，醉卧广寒！/饲骊胡肉，饮骥虏血，一骑可定万里江山！/折兵为弭，纫甲为服，此箭可狩在野之龙！" },
        "die": { content: "七情难掩，六欲难消，何谓之神？" }
    },
}