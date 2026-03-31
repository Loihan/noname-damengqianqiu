export default {
    character: {
        // 梦赵云：神势力，1体力，上限由引擎根据技能或初始化处理（原版神赵云逻辑）
        dmqc_zhaoyun: ["male", "shen", "1/2", ["dmqc_juejing", "dmqc_longhun", "dmqc_jiuzhu"], [
            "des:建安十三年，先主奔走当阳，曹操精骑追及。云怀抱幼主，单骑陷于百万军中。四顾皆敌，矢石如雨，云身被重创，力战至竭，几近绝地。<br>当此时，云意气陡升，若有苍龙破云而入，神威骤发。其枪尖所向，寒芒万丈，杀透重围，出入曹营如履平地。及救幼主于危难，曹操登高望之，惊叹为神。自此，赵子龙之名震慑北国。<br>此后数十载，云以不老之躯，镇守汉土。每逢两军对垒，云一骑当先，威震三军，使敌胆寒。先主欲伐吴，云以大义极谏，终保荆益之势。及至诸葛秉政，云为北伐先驱，六出祁山，所向披靡。岁至古稀，英姿飒爽如壮年，终助汉室克复旧都。世人皆传，长坂一役，云已得真龙护体，永为大汉之坚盾，虽历千秋而不朽。",
            "ext:大梦千秋/image/dmqc_zhaoyun.png",
            "die:ext:大梦千秋/audio/dmqc_zhaoyun/die.mp3"
        ]],
    },
    characterName: 'dmqc_zhaoyun',
    characterTitle: {
        dmqc_zhaoyun: "神龙天降",
    },
    characterTranslate: {
        dmqc_zhaoyun: "梦赵云",
    },
    skills: {
        // === 1. 绝境 (适配版) ===
// === 1. 绝境 (修改版：体力上限加成 & 体力锁定) ===
        dmqc_juejing: {
            persevereSkill: true,
            audio: "ext:大梦千秋/audio/dmqc_zhaoyun:2",
            forced: true,
            // 包含三个部分：手牌上限mod、濒死摸牌、体力锁定
            group: ["dmqc_juejing_start","dmqc_juejing_hscap", "dmqc_juejing_draw", "dmqc_juejing_hplock","dmqc_juejing_maxhplock"],
            init: function(player) {
                // 1. 上限初始化：确保登场不超 7
                if (player.maxHp > 7) {
                    player.loseMaxHp(player.maxHp - 7);
                }
                // 2. 体力值初始化：强制将当前体力调整为 1 (应对主公加成)
                if (player.hp > 1) {
                    player.hp = 1;
                    player.update();
                }
            },
            subSkill: {
                // 【核心修正】：专门对付主公加成的开局触发器
                start: {
                    // 使用 global 时机，确保在所有身份加成完成后执行
                    trigger: { 
                        global: ["gameStart", "gameDrawBefore"],
                        player: "enterGame" 
                    },
                    forced: true,
                    silent: true,
                    priority: 101, // 极高优先级
                    content: function() {
                        "step 0"
                        // 1. 强制将当前体力拉回1
                        if (player.hp > 1) {
                            player.hp = 1;
                            player.update();
                            game.log(player, '受【绝境】影响，初始体力锁定为1');
                        }
                        // 2. 强制检查上限，防止主公加成突破7
                        if (player.maxHp > 7) {
                            var overflow = player.maxHp - 7;
                            player.loseMaxHp(overflow);
                            game.log(player, '受【绝境】影响，初始体力上限锁定为7');
                        }
                    }
                },

                // 修改点①：手牌上限增加 X (X为当前体力上限)
                hscap: { 
                    mod: { 
                        maxHandcard: function(player, num) {
                            return num + player.maxHp;
                        }
                    } 
                },
                // 濒死摸牌逻辑保持原版
                draw: {
                    trigger: { player: ["dying", "dyingEnd"] },
                    forced: true,
                    filter(event, player) {
                        if (event.name == 'dying') return true;
                        if (event.name == 'dyingEnd' && player.isAlive()) return true;
                        return false;
                    },
                    content: function() {
                        player.logSkill('dmqc_juejing');
                        var log_str = (trigger.name == 'dying') ? '进入濒死状态' : '脱离濒死状态';
                        game.log(player, '因' + log_str + '，触发了【绝境】');
                        if (player.countCards('h') == 0) {
                            player.draw(2);
                        } else {
                            player.draw(1);
                        }
                    }
                },
                // 修改点③：体力值始终不大于1 (通过监听变化实时拉回)
                hplock: {
                    trigger: { player: "changeHp" },
                    forced: true,
                    silent: true,
                    filter: function(event, player) {
                        // 只要血量大于1，立即触发
                        return player.hp > 1;
                    },
                    content: function() {
                        player.hp = 1;
                        player.update(); // 强制刷新UI
                        game.log(player, '受【绝境】影响，体力值回归至1');
                    }
                },
                maxhplock: {
                    trigger: { 
                        player: ["gainMaxHpAfter", "changeHp", "phaseBefore"],
                        global: ["gameDrawBefore","phaseBegin"]
                    },
                    forced: true,
                    silent: true,
                    filter: function(event, player) {
                        return player.maxHp > 7;
                    },
                    content: function() {
                        // 计算溢出的数值
                        var overflow = player.maxHp - 7;
                        // 使用引擎方法 loseMaxHp 强制扣回，这会触发 UI 刷新并阻止上限溢出
                        player.loseMaxHp(overflow); 
                        game.log(player, '受【绝境】影响，体力上限被锁定在7点（扣除了', overflow, '点溢出）');
                    }
                },
            }
        },


        // === 2. 龙魂 (核心逻辑适配) ===
dmqc_longhun: {
            persevereSkill: true,
            audio: "ext:大梦千秋/audio/dmqc_zhaoyun:4",
            enable: ["chooseToUse", "chooseToRespond"],
            hiddenCard: function(player, name) {
                if (name == 'wuxie' && player.countCards('hes', { suit: 'spade' })) return true;
            },
            mod: {
                targetInRange: function (card, player, target) {
                    if (card._dmqc_longhun_diamond || (_status.event.skill == 'dmqc_longhun' && card.name == 'sha')) {
                        return true;
                    }
                },
                cardUsable: function(card, player, num) {
                    if (card.name == 'sha' && (card._dmqc_longhun_diamond || _status.event.skill == 'dmqc_longhun')) {
                        return Infinity;
                    }
                }
            },
            viewAs: function(cards, player) {
                if (!cards.length) return null;
                var name = false, nature = null;
                var suit = get.suit(cards[0], player);
                switch (suit) {
                    case "club": name = "shan"; break;
                    case "diamond": name = "sha"; nature = "fire"; break;
                    case "spade": name = "wuxie"; break;
                    case "heart": name = "tao"; break;
                }
                if (name) {
                    var card = { name: name, nature: nature };
                    card._dmqc_count = cards.length;
                    card._dmqc_suit = suit;
                    card.logSkill = 'dmqc_longhun';
                    if (suit == 'diamond') card._dmqc_longhun_diamond = true;
                    return card;
                }
                return null;
            },
            selectCard: [1, 3],
            complexCard: true,
            position: "hes",
            filterCard: function(card, player, event) {
                if (ui.selected.cards.length) return get.suit(card, player) == get.suit(ui.selected.cards[0], player);
                event = event || _status.event;
                var filter = event._backup.filterCard;
                var suit = get.suit(card, player);
                var map = { club: "shan", diamond: "sha", spade: "wuxie", heart: "tao" };
                if (map[suit]) {
                    var vcard = { name: map[suit] };
                    if (suit == 'diamond') vcard.nature = 'fire';
                    return filter(vcard, player, event);
                }
                return false;
            },
            filter: function(event, player) {
                if (!player.countCards('hes')) return false;
                if (event && event.filterCard) {
                    if (event.filterCard({name: 'tao'}, player, event) && player.countCards('hes', {suit: 'heart'})) return true;
                    if (event.filterCard({name: 'shan'}, player, event) && player.countCards('hes', {suit: 'club'})) return true;
                    if (event.filterCard({name: 'sha'}, player, event) && player.countCards('hes', {suit: 'diamond'})) return true;
                    if (event.filterCard({name: 'wuxie'}, player, event) && player.countCards('hes', {suit: 'spade'})) return true;
                    return false;
                }
                return player.countCards('hes') > 0;
            },
            group: ["dmqc_longhun_modify", "dmqc_longhun_recover", "dmqc_longhun_after", "dmqc_longhun_directhit"],
            subSkill: {
                modify: {
                    trigger: { player: "useCard1" },
                    forced: true,
                    silent: true,
                    filter: function(event, player) {
                        return event.card && event.card._dmqc_count >= 1;
                    },
                    content: function() {
                        var card = trigger.card;
                        var count = card._dmqc_count;
                        var suit = card._dmqc_suit;
                        var target = trigger.target || (trigger.targets ? trigger.targets[0] : null);

                        if (card.name == 'sha' && card._dmqc_longhun_diamond) {
                            trigger.addCount = false; 
                            if (player.stat[player.stat.length - 1].card.sha > 0) {
                                player.stat[player.stat.length - 1].card.sha--;
                            }
                        }

                        if (count >= 2) player.gainMaxHp(1);

                        if (count == 3 && suit == 'diamond' && card.name == 'sha' && target) {
                            trigger.baseDamage = Math.max(1, target.hp);
                        } else if (count == 2 && suit == 'diamond' && card.name == 'sha') {
                            trigger.baseDamage++;
                        } else if (count == 3 && suit == 'spade' && card.name == 'wuxie') {
                            trigger.nowuxie = true; 
                        }
                    }
                },
                recover: {
                    trigger: { global: "recoverBegin" },
                    forced: true,
                    silent: true,
                    filter: function(event, player) {
                        return event.card && event.card._dmqc_suit == 'heart' && event.card._dmqc_count >= 2;
                    },
                    content: function() {
                        var target = trigger.player;
                        var count = trigger.card._dmqc_count;
                        if (count == 3) {
                            var missingHp = target.maxHp - target.hp;
                            if (missingHp > trigger.num) {
                                trigger.num = missingHp;
                                game.log(target, '因三连红桃【龙魂】回复至体力上限');
                            }
                        } else if (count == 2) {
                            trigger.num++;
                            game.log(target, '因双红桃【龙魂】回复量增加');
                        }
                    }
                },
                after: {
                    trigger: { player: ["useCardAfter", "respondAfter"] },
                    forced: true,
                    popup: false,
                    filter: function(event, player) {
                        return event.card && event.card._dmqc_count >= 2;
                    },
                    content: function() {
                        "step 0"
                        var card = trigger.card;
                        var count = card._dmqc_count;
                        var suit = card._dmqc_suit;
                        
                        if (count == 3) {
                            if (suit == 'club') {
                                player.chooseTarget('龙魂：弃置一名角色所有牌', true).set('ai', t => -get.attitude(player, t));
                            } else if (suit == 'spade') {
                                player.draw(2);
                                event.finish(); // 摸牌后提前结束，防止进入 step 1
                            } else {
                                event.finish(); // 红桃/方块没有后置动作
                            }
                        } else if (count == 2 && get.color({suit: suit}) == 'black') {
                            var curr = _status.currentPhase;
                            if (curr && curr != player && curr.isAlive()) {
                                player.line(curr, 'black');
                                player.discardPlayerCard(curr, 'he', true);
                            }
                            event.finish();
                        } else {
                            event.finish();
                        }
                        "step 1"
                        // 【核心修复】：增加 targets.length 和 target.isAlive() 的多重判定
                        if (result && result.bool && result.targets && result.targets.length) {
                            var target = result.targets[0];
                            if (target && target.isAlive()) {
                                target.discard(target.getCards('he'));
                                game.log(target, '的所有牌被【龙魂】弃置');
                            }
                        }
                    }
                },
                directhit: {
                    trigger: { player: 'useCardToTargeted' },
                    forced: true,
                    popup: false,
                    filter: function(event, player) {
                        return event.card && event.card._dmqc_longhun_diamond;
                    },
                    content: function() {
                        trigger.getParent().directHit.add(trigger.target);
                    }
                }
            },
            ai: { save: true, respondSha: true, respondShan: true, respondWuxie: true, order: 4, result: { player: 1 } }
        },
        // === 3. 救主 (适配版) ===
        dmqc_jiuzhu: {
            persevereSkill: true,
            audio: "ext:大梦千秋/audio/dmqc_zhaoyun:2",
            mark: true,
            marktext: "救主",
            intro: {
                name: "救主",
                content: "mark",
            },
            group: ["dmqc_jiuzhu_effect", "dmqc_jiuzhu_gain", "dmqc_jiuzhu_dying"],
            subSkill: {
                effect: {
                    trigger: {
                        player: ["useCard", "respond"],
                    },
                    direct: true,
                    filter(event, player) {
                        if (event.skill != 'dmqc_longhun' && (!event.parent || event.parent.skill != 'dmqc_longhun')) return false;
                        if (player.countMark('dmqc_jiuzhu') < 1) return false;
                        if (_status.currentPhase == player) {
                            return game.hasPlayer(target => target != player && target.countCards('he') > 0);
                        } else {
                            return _status.currentPhase && _status.currentPhase.countCards('he') > 0;
                        }
                    },
                    async content(event, trigger, player) {
                        const {result} = await player.chooseBool(get.prompt('dmqc_jiuzhu'), `是否消耗1个“救主”标记并发动技能？（当前拥有：${player.countMark('dmqc_jiuzhu')}）`).set('ai', () => true);
                        if(result.bool) {
                            player.logSkill('dmqc_jiuzhu');
                            player.removeMark('dmqc_jiuzhu', 1);

                            if (_status.currentPhase == player) {
                                const {result: res_target} = await player.chooseTarget(
                                    '请选择一名其他角色，获得其一张牌', true, (card, player, target) => { return target != player && target.countCards('he') > 0; }
                                ).set('ai', target => -get.attitude(_status.event.player, target));
                                if(res_target.bool && res_target.targets.length) {
                                    await player.gainPlayerCard(res_target.targets[0], 'he', true);
                                }
                            } else {
                                var target = _status.currentPhase;
                                if(target && target.countCards('he') > 0) {
                                    await player.gainPlayerCard(target, 'he', true);
                                }
                            }
                        }
                    }
                },
                gain: {
                    trigger: { global: "phaseZhunbeiBegin" },
                    forced: true,
                    silent: true,
                    content: function() {
                        if(player.countMark('dmqc_jiuzhu') < 7){
                            player.addMark('dmqc_jiuzhu', 1);
                            game.log(player, '获得了一个“救主”标记');
                        }
                    }
                },
                dying: {
                    trigger: { player: "dying" },
                    forced: true,
                    silent: true,
                    content: function() {
                        if(player.countMark('dmqc_jiuzhu') < 7){
                            player.addMark('dmqc_jiuzhu', 1);
                            game.log(player, '因进入濒死状态，获得了一个“救主”标记');
                        }
                    }
                },
            }
        },
    },
    skillTranslate: {
        dmqc_juejing: "绝境",
        dmqc_juejing_info: "持恒技，锁定技，①你的手牌上限+X（X为你的体力上限）；②当你进入或脱离濒死状态时，若你没有手牌，你摸两张牌，否则摸一张牌。③你的体力值始终不大于1,体力上限始终不大于7。",
        dmqc_longhun: "龙魂",
        dmqc_longhun_info: "持恒技，你可以将1至3张花色相同的牌当做对应牌使用或打出并根据其数量与花色执行对应效果：<br>①一张：♥️当【桃】；♦️当火【杀】（无距离次数限制且不可被响应）；♣️当【闪】；♠️当【无懈可击】。<br>②两张：增加1点体力上限。红色：伤害/回复量+1；黑色牌：弃置当前回合角色一张牌。<br>③三张：增加1点体力上限。♥️：回复体力至体力上限；♦️：此伤害值改为等同于目标体力；♣️：弃置一名角色的所有牌；♠️：不可被响应且你摸2张牌。",
        dmqc_jiuzhu: "救主",
        dmqc_jiuzhu_info: "持恒技，蓄力技(0/7)，每名角色准备阶段开始时或你进入濒死状态时，你获得1点蓄力点。<br>当你发动“龙魂时，你可以消耗1点蓄力点并执行相应效果：若在你的回合内/外，你获得一名其他角色/当前回合角色的一张牌。",
    },
    characterTaici:{
        "dmqc_juejing":{order: 1,content:"九阳断魂，斩却三尸，脱凡蜕而化应龙!/潜龙在渊，声震九天，身可战于四野!"},
        "dmqc_longhun":{order: 2,content:"龙缚于渊，虽万仞在身，志犹存于八荒!/左执青釭，右擎龙胆，此天下，可有挡我者!/将临死地，必效刑天，舞干戈以征四海!/八尺之身，秉义承武，胸腹可栖万丈苍龙!"},
        "dmqc_jiuzhu":{order: 3,content:"身陷绝境，方乃用武之时，问长缨何在!/心怀长帆，何惧困顿，当济沧海云间!"},
        "die":{content:"亢龙有悔，恨未除天狼于人间..."}
    }
};