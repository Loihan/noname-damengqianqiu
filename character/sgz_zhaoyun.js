export default {
    character: {
        // 梦赵云：神势力，1体力，上限由引擎根据技能或初始化处理（原版神赵云逻辑）
        sgz_zhaoyun: ["male", "shen", "1/2", ["sgz_juejing", "sgz_longhun", "sgz_jiuzhu"], [
            "des:建安十三年，先主奔走当阳，曹操精骑追及。云怀抱幼主，单骑陷于百万军中。四顾皆敌，矢石如雨，云身被重创，力战至竭，几近绝地。<br>当此时，云意气陡升，若有苍龙破云而入，神威骤发。其枪尖所向，寒芒万丈，杀透重围，出入曹营如履平地。及救幼主于危难，曹操登高望之，惊叹为神。自此，赵子龙之名震慑北国。<br>此后数十载，云以不老之躯，镇守汉土。每逢两军对垒，云一骑当先，威震三军，使敌胆寒。先主欲伐吴，云以大义极谏，终保荆益之势。及至诸葛秉政，云为北伐先驱，六出祁山，所向披靡。岁至古稀，英姿飒爽如壮年，终助汉室克复旧都。世人皆传，长坂一役，云已得真龙护体，永为大汉之坚盾，虽历千秋而不朽。",
            "ext:大梦千秋/image/sgz_zhaoyun.jpg",
            "die:ext:大梦千秋/audio/sgz_zhaoyun/die.mp3"
        ]],
    },
    characterName: 'sgz_zhaoyun',
    characterTitle: {
        sgz_zhaoyun: "神龙天降",
    },
    characterTranslate: {
        sgz_zhaoyun: "赵云",
    },
    skills: {
        // === 1. 绝境 (修改版：体力上限加成 & 体力锁定) ===
        sgz_juejing: {
            persevereSkill: true,
            audio: "ext:大梦千秋/audio/sgz_zhaoyun:2",
            forced: true,
            // 包含：开局初始化、手牌上限加成、濒死补牌、体力锁定、上限锁定、持续补牌(新增)
            group: [
                "sgz_juejing_start", 
                "sgz_juejing_hscap", 
                "sgz_juejing_draw", 
                "sgz_juejing_hplock", 
                "sgz_juejing_maxhplock",
                "sgz_juejing_shangshi" // 新增补牌逻辑
            ],
            init: function(player) {
                if (player.maxHp > 7) {
                    player.loseMaxHp(player.maxHp - 7);
                }
                if (player.hp > 1) {
                    player.hp = 1;
                    player.update();
                }
            },
            subSkill: {
                // 1. 开局及模式加成锁定
                start: {
                    trigger: { 
                        global: ["gameStart", "gameDrawBefore"],
                        player: "enterGame" 
                    },
                    forced: true,
                    silent: true,
                    priority: 101,
                    content: function() {
                        "step 0"
                        if (player.hp > 1) {
                            player.hp = 1;
                            player.update();
                            game.log(player, '受【绝境】影响，初始体力锁定为1');
                        }
                        if (player.maxHp > 7) {
                            var overflow = player.maxHp - 7;
                            player.loseMaxHp(overflow);
                            game.log(player, '受【绝境】影响，初始体力上限锁定为7');
                        }
                    }
                },

                // 2. 手牌上限 MOD
                hscap: { 
                    mod: { 
                        maxHandcard: function(player, num) {
                            return num + player.maxHp;
                        }
                    } 
                },

                // 3. 濒死/脱离濒死即时补牌
                draw: {
                    trigger: { player: ["dying", "dyingEnd"] },
                    forced: true,
                    filter(event, player) {
                        if (event.name == 'dying') return true;
                        if (event.name == 'dyingEnd' && player.isAlive()) return true;
                        return false;
                    },
                    content: function() {
                        player.logSkill('sgz_juejing');
                        player.draw(1);
                        //  if (player.countCards('h') == 0)player.draw(2);else player.draw(1);
                    }
                },

                // 4. 【核心新增】：持续补牌效果（参考伤逝逻辑）
                shangshi: {
                    trigger: {
                        player: ["loseAfter", "changeHp", "gainMaxHpAfter", "loseMaxHpAfter"],
                        global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"]
                    },
                    forced: true,
                    frequent: true,
                    filter: function(event, player) {
                        // 限制点①：必须不是自己的回合
                        if (_status.currentPhase == player) return false;
                        
                        // 限制点②：手牌数小于2
                        if (player.countCards("h") >= 2) return false;
                        
                        // 限制点③：过滤非本人的卡牌失去事件
                        if (event.getl && !event.getl(player)) return false;
                        
                        return true;
                    },
                    content: function() {
                        player.drawTo(2);
                    },
                    ai: {
                        noh: true,
                        freeSha: true,
                        freeShan: true
                    }
                },

                // 5. 体力锁定 1
                hplock: {
                    trigger: { player: "changeHp" },
                    forced: true,
                    silent: true,
                    filter: function(event, player) {
                        return player.hp > 1;
                    },
                    content: function() {
                        player.hp = 1;
                        player.update();
                        game.log(player, '受【绝境】影响，体力回归至1');
                    }
                },

                // 6. 体力上限锁定 7
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
                        var overflow = player.maxHp - 7;
                        player.loseMaxHp(overflow); 
                        game.log(player, '受【绝境】影响，体力上限被锁定在7点');
                    }
                },
            }
        },


        // === 2. 龙魂 (核心逻辑适配) ===
        sgz_longhun: {
            persevereSkill: true,
            audio: "ext:大梦千秋/audio/sgz_zhaoyun:4",
            enable: ["chooseToUse", "chooseToRespond"],
            hiddenCard: function(player, name) {
                if (name == 'wuxie' && player.countCards('hes', { suit: 'spade' })) return true;
            },
            mod: {
                targetInRange: function (card, player, target) {
                    if (card._sgz_longhun_diamond || (_status.event.skill == 'sgz_longhun' && card.name == 'sha')) {
                        return true;
                    }
                },
                cardUsable: function(card, player, num) {
                    if (card.name == 'sha' && (card._sgz_longhun_diamond || _status.event.skill == 'sgz_longhun')) {
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
                    card._sgz_count = cards.length;
                    card._sgz_suit = suit;
                    card.logSkill = 'sgz_longhun';
                    if (suit == 'diamond') card._sgz_longhun_diamond = true;
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
            group: ["sgz_longhun_modify", "sgz_longhun_recover", "sgz_longhun_after", "sgz_longhun_directhit"],
            subSkill: {
                modify: {
                    trigger: { player: "useCard1" },
                    forced: true,
                    silent: true,
                    filter: function(event, player) {
                        return event.card && event.card._sgz_count >= 1;
                    },
                    content: function() {
                        var card = trigger.card;
                        var count = card._sgz_count;
                        var suit = card._sgz_suit;
                        var target = trigger.target || (trigger.targets ? trigger.targets[0] : null);

                        // 插入的图片设置代码
                        var suitToImage = {
                            'club': 'extension/大梦千秋/image/sgz_zhaoyun_club.jpg',
                            'diamond': 'extension/大梦千秋/image/sgz_zhaoyun_diamond.jpg',
                            'spade': 'extension/大梦千秋/image/sgz_zhaoyun.jpg',
                            'heart': 'extension/大梦千秋/image/sgz_zhaoyun_heart.jpg'
                        };
                        if (suitToImage[suit]) {
                            player.node.avatar.setBackgroundImage(suitToImage[suit]);
                        }
                        if (card.name == 'sha' && card._sgz_longhun_diamond) {
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
                        return event.card && event.card._sgz_suit == 'heart' && event.card._sgz_count >= 2;
                    },
                    content: function() {
                        var target = trigger.player;
                        var count = trigger.card._sgz_count;
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
                        return event.card && event.card._sgz_count >= 2;
                    },
                    content: function() {
                        "step 0"
                        var card = trigger.card;
                        var count = card._sgz_count;
                        var suit = card._sgz_suit;
                        
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
                        return event.card && event.card._sgz_longhun_diamond;
                    },
                    content: function() {
                        trigger.getParent().directHit.add(trigger.target);
                    }
                }
            },
            ai: { save: true, respondSha: true, respondShan: true, respondWuxie: true, order: 4, result: { player: 1 } }
        },
        // === 3. 救主 (适配版) ===
        sgz_jiuzhu: {
            persevereSkill: true,
            audio: "ext:大梦千秋/audio/sgz_zhaoyun:2",
            mark: true,
            marktext: "救主",
            intro: {
                name: "救主",
                content: "mark",
            },
            group: ["sgz_jiuzhu_effect", "sgz_jiuzhu_gain", "sgz_jiuzhu_dying"],
            subSkill: {
                effect: {
                    trigger: {
                        player: ["useCard", "respond"],
                    },
                    direct: true,
                    filter(event, player) {
                        if (event.skill != 'sgz_longhun' && (!event.parent || event.parent.skill != 'sgz_longhun')) return false;
                        if (player.countMark('sgz_jiuzhu') < 1) return false;
                        if (_status.currentPhase == player) {
                            return game.hasPlayer(target => target != player && target.countCards('he') > 0);
                        } else {
                            return _status.currentPhase && _status.currentPhase.countCards('he') > 0;
                        }
                    },
                    async content(event, trigger, player) {
                        const {result} = await player.chooseBool(get.prompt('sgz_jiuzhu'), `是否消耗1个“救主”标记并发动技能？（当前拥有：${player.countMark('sgz_jiuzhu')}）`).set('ai', () => true);
                        if(result.bool) {
                            player.logSkill('sgz_jiuzhu');
                            player.removeMark('sgz_jiuzhu', 1);

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
                        if(player.countMark('sgz_jiuzhu') < 7){
                            player.addMark('sgz_jiuzhu', 1);
                            game.log(player, '获得了一个“救主”标记');
                        }
                    }
                },
                dying: {
                    trigger: { player: "dying" },
                    forced: true,
                    silent: true,
                    content: function() {
                        if(player.countMark('sgz_jiuzhu') < 7){
                            player.addMark('sgz_jiuzhu', 1);
                            game.log(player, '因进入濒死状态，获得了一个“救主”标记');
                        }
                    }
                },
            }
        },
    },
    skillTranslate: {
        sgz_juejing: "绝境",
        sgz_juejing_info: "持恒技，锁定技，①你的手牌上限+X（X为你的体力上限）；②当你进入或脱离濒死状态时摸一张牌。③回合外你的手牌数始终不小于2。④你的体力值始终不大于1,体力上限始终不大于7。",
        sgz_longhun: "龙魂",
        //sgz_longhun_info: "持恒技，你可以将1至3张花色相同的牌当做对应牌使用或打出并根据其数量与花色执行对应效果：<br>①一张：♥️当【桃】；♦️当火【杀】（无距离次数限制且不可被响应）；♣️当【闪】；♠️当【无懈可击】。<br>②两张：增加1点体力上限。红色：伤害/回复量+1；黑色牌：弃置当前回合角色一张牌。<br>③三张：增加1点体力上限。♥️：回复体力至体力上限；♦️：此伤害值改为等同于目标体力；♣️：弃置一名角色的所有牌；♠️：不可被响应且你摸2张牌。",
        sgz_longhun_info: "持恒技，你可以将1至3张花色相同的牌当做对应牌使用或打出并根据其数量与花色执行对应效果：<br>♥️当【桃】；两张：回复量+1；三张：回满体力。<br>♦️当火【杀】（无距离次数限制且不可被响应）；两张：伤害+1；三张：伤害改为等同于目标体力。<br>♠️当【无懈可击】：两张：弃置当前回合角色一张牌；三张：不可被响应且摸两张牌。<br>♣️当【闪】：两张：弃置当前回合角色一张牌；三张：弃置一名角色所有牌。<br>若你依此法使用或打出了2或3张牌，你增加一点体力上限。",
        sgz_jiuzhu: "救主",
        sgz_jiuzhu_info: "持恒技，蓄力技(0/7)，每名角色准备阶段开始时或你进入濒死状态时，你获得1点蓄力点。<br>当你发动“龙魂时，你可以消耗1点蓄力点并执行相应效果：若在你的回合内/外，你获得一名其他角色/当前回合角色的一张牌。",
    },
    characterTaici:{
        "sgz_juejing":{order: 1,content:"九阳断魂，斩却三尸，脱凡蜕而化应龙!/潜龙在渊，声震九天，身可战于四野!"},
        "sgz_longhun":{order: 2,content:"龙缚于渊，虽万仞在身，志犹存于八荒!/左执青釭，右擎龙胆，此天下，可有挡我者!/将临死地，必效刑天，舞干戈以征四海!/八尺之身，秉义承武，胸腹可栖万丈苍龙!"},
        "sgz_jiuzhu":{order: 3,content:"身陷绝境，方乃用武之时，问长缨何在!/心怀长帆，何惧困顿，当济沧海云间!"},
        "die":{content:"亢龙有悔，恨未除天狼于人间..."}
    }
};