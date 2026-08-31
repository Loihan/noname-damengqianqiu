export default {
    character: {
        // 梦赵云：神势力，1体力，上限由引擎根据技能或初始化处理（原版神赵云逻辑）
        sgz_zhaoyun: {
            sex: "male", 
            group: "shu", 
            hp: 1, 
            maxHp: 2,
            skills: ["sgz_guzhi", "sgz_longxiao", "sgz_jiejin", "sgz_zhaoyun_ui"], 
            img: "extension/大梦千秋/image/sgz_zhaoyun.jpg",
            dieAudios:["ext:大梦千秋/audio/sgz_zhaoyun/die.mp3"],
            names:"赵|云",
            groupInGuozhan:"shu",
            initFilters:["noZhuHp"],
            4:["des:建安十三年，先主奔走当阳，曹操精骑追及。云怀抱幼主，单骑陷于百万军中。四顾皆敌，矢石如雨，云身被重创，力战至竭，几近绝地。<br>当此时，云意气陡升，若有苍龙破云而入，神威骤发。其枪尖所向，寒芒万丈，杀透重围，出入曹营如履平地。及救幼主于危难，曹操登高望之，惊叹为神。自此，赵子龙之名震慑北国。<br>此后数十载，云以不老之躯，镇守汉土。每逢两军对垒，云一骑当先，威震三军，使敌胆寒。先主欲伐吴，云以大义极谏，终保荆益之势。及至诸葛秉政，云为北伐先驱，六出祁山，所向披靡。岁至古稀，英姿飒爽如壮年，终助汉室克复旧都。世人皆传，长坂一役，云已得真龙护体，永为大汉之坚盾，虽历千秋而不朽。",]
        },
    },
    characterName: 'sgz_zhaoyun',
    characterTitle: {sgz_zhaoyun: "神龙天降",},
    characterTranslate: {
        sgz_zhaoyun: "梦赵云",
    },
    skills: {
        // === 1. 孤峙  ===
        sgz_guzhi: {
            persevereSkill: true,
            audio: "ext:大梦千秋/audio/sgz_zhaoyun:2",
            forced: true,
            // 包含：开局初始化、手牌上限加成、濒死补牌、体力锁定、上限锁定、持续补牌(新增)
            group: [
                "sgz_guzhi_start", 
                "sgz_guzhi_hscap", 
                "sgz_guzhi_draw", 
                "sgz_guzhi_hplock", 
                "sgz_guzhi_maxhplock",
                "sgz_guzhi_shangshi" ,
                "sgz_guzhi_limit" 
            ],
            // === 核心 AI 注入一：价值体系与收益偏移 ===
            ai: {
                maixie: true,
                // 一、价值重定向：濒死时所有牌价值强制设为 0，平时死保红桃
                value: function(card, player) {
                    if (_status.event.name == 'dying' || _status.dying) return 0.1; 
                    var suit = get.suit(card, player);
                    if (suit == 'heart') return 45;   // 平时死保红桃
                    if (suit == 'diamond') return 40; 
                    return get.value(card);
                },
                // 五、收益认知偏移：诱导卖血
                effect: {
                    target: function(card, player, target) {
                        if (get.tag(card, 'damage') || get.tag(card, 'losehp')) {
                            if (player == target || get.attitude(player, target) <= 0) {
                                if (target.countCards('h', {suit: 'heart'}) > 0) return [1,2];
                            }
                        }
                    }
                }
            },
            mod: {
                // 二、禁疗逻辑：平时不吃桃；濒死时若手里有红桃，优先走龙霄转化，而非直接吞普通桃
                aiOrder: function(player, card, num) {
                    if (get.tag(card, 'recover')) {
                        if (player.isDying()) {
                            // 有红桃 → 把普通桃次序压后，逼 AI 优先用龙霄把红桃变成桃（保真桃、只死保红桃）
                            if (player.countCards('h', { suit: 'heart' }) > 0) return -60;
                            return 1000;
                        }
                        if (player.hp >= 1) return -100;
                    }
                    return num;
                },
                // ① 【最高优先级】有红桃且非濒死：赵云知道此时卖血是赚的 → 尽量不做防御响应，主动吃伤害
                aiUseful: function(player, card, num) {
                    if (player.countCards('h', { suit: 'heart' }) > 0 && !player.isDying()) {
                        // 被杀/万箭：不闪避
                        if (card && card.name == 'shan') return -8;
                        // 南蛮/决斗：不出杀响应，主动扣血（卖血是赚的）
                        if (card && card.name == 'sha' &&
                            _status.event && _status.event.name == 'chooseToRespond') {
                            return -8;
                        }
                    }
                    return num;
                },
            },
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
                            game.log(player, '受【孤峙】影响，初始体力锁定为1');
                        }
                        if (player.maxHp > 7) {
                            var overflow = player.maxHp - 7;
                            player.loseMaxHp(overflow);
                            game.log(player, '受【孤峙】影响，初始体力上限锁定为7');
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
                        player.logSkill('sgz_guzhi');
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
                        
                        // 限制点②：手牌数小于3
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
                        game.log(player, '受【孤峙】影响，体力回归至1');
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
                        game.log(player, '受【孤峙】影响，体力上限被锁定在7点');
                    }
                },
                // 7. 【核心新增】：伤害上限限制
                limit: {
                    // 使用 damageBegin4 时机，此时伤害数值已被大部分技能增加完毕，最适合截断上限
                    trigger: { player: "damageBegin4" },
                    forced: true,
                    priority: -10, // 较低优先级，确保在“暴击”等加伤效果之后执行最终截断
                    content: function() {
                        "step 0"
                        var d = Math.min(game.roundNumber, player.maxHp - player.Hp);
                        if (trigger.num > d ) {
                            player.logSkill('sgz_guzhi');
                            game.log(player, '受当前游戏轮数影响，受到的伤害被限制为',d, '点');
                            trigger.num = d;
                        }
                    }
                }
            }
        },
        // === 2. 龙霄  ===
        sgz_longxiao: {
            persevereSkill: true,
            audio: "ext:大梦千秋/audio/sgz_zhaoyun:4",
            enable: ["chooseToUse", "chooseToRespond"],
            mod: {
                targetInRange: function (card, player, target) {
                    if (card._sgz_longxiao_diamond || (_status.event.skill == 'sgz_longxiao' && card.name == 'sha')) {
                        return true;
                    }
                },
                cardUsable: function(card, player, num) {
                    if (card.name == 'sha' && (card._sgz_longxiao_diamond || _status.event.skill == 'sgz_longxiao')) {
                        return Infinity;
                    }
                },
                aiOrder(player, card, num) {
                    if (num <= 0 || !player.isPhaseUsing() || player.needsToDiscard() < 2) {
                        return num;
                    }
                    let suit = get.suit(card, player);
                    if (suit === "heart") {
                        return num - 3.6;
                    }
                },
                aiValue(player, card, num) {
                    if (num <= 0) {
                        return num;
                    }
                    let suit = get.suit(card, player);
                    if (suit === "heart") {
                        return num + 3.6;
                    }   
                    if (suit === "spade") {
                        return num + 1;
                    }
                    if (suit === "diamond") {
                        return num + 1.8;
                    }
                },
                aiUseful(player, card, num) {
                    if (num <= 0) {
                        return num;
                    }
                    let suit = get.suit(card, player);
                    if (suit === "heart") {
                        return num + 3;
                    }
                    if (suit === "diamond") {
                        return num + 1;
                    }
                    if (suit === "spade") {
                        return num + 1;
                    }
                },
            },
            ai: {
                directHit_ai: true, 
                fireAttack: true, 
                order: function(item, player) {
                    // 方片→火杀（无距离次数限制、不占次数）：使用优先级必须高于一切原卡牌
                    if (player.countCards('hes', {suit: 'diamond'}) > 0) return 130;
                    // 濒死且有红桃：龙霄转化救桃优先级拉满
                    if (player.isDying() && player.countCards('hes', {suit: 'heart'}) > 0) return 200;
                    // 有 3 张梅花：关键时刻转闪闪避
                    if (player.countCards('hes', {suit: 'club'}) >= 3) return 90;
                    // 其余情况也优先用龙霄转化（而非直接打出原牌）
                    return 60;
                },
                save: true,
                respondSha: true, respondShan: true, respondWuxie: true,
                skillTagFilter: function(player, tag) {
                    var map = { save: 'heart', respondSha: 'diamond', respondShan: 'club', respondWuxie: 'spade' };
                    if (map[tag] && player.countCards('hes', { suit: map[tag] }) > 0) return true;
                },
                // 【核心修复】：在计算救命收益时，返回断层高分 2000
                save: function(card, player, target) {
                    if (player.countCards('hes', {suit: 'heart'}) > 0) return 2000;
                    return 0;
                },
                result: {
                    player: function(player) {
                        // 极大化出牌欲望：只要能印火杀，欲望值 1000
                        if (_status.currentPhase == player && player.countCards('hes', {suit: 'diamond'})) return 1000;
                        return 1;
                    }
                },
                // 诱导卖血：不拦截伤害锦囊
                onWuxie: function(card, player, target) {
                    if (target == player && get.tag(card, 'damage') && player.hasCard(c => get.suit(c) == 'heart', 'h')) return 0;
                }
            },

            // === 核心 AI 注入：龙霄转化选牌逻辑（优先多张，3→2→1） ===
            check: function(card) {
                var player = _status.event.player;
                var suit = get.suit(card, player);
                var evt = _status.event;
                var selected = ui.selected.cards.length;

                // 寻找当前濒死角色
                var dying = evt.dying || (evt.getParent && evt.getParent().dying) || (_status.dying && _status.dying[0]);

                // ———— 红桃：转化桃（救自己/队友，按缺口定张数） ————
                if (suit == 'heart') {
                    var target = dying;
                    if (!target || get.itemtype(target) !== 'player') return 0;
                    var att = get.attitude(player, target);
                    if (att <= 0) return 0;   // 不救敌人

                    if (target == player) {
                        // 救自己：缺口越大张数越多
                        if (target.hp <= -2) return (selected < 3 ? 5000 : 0);
                        if (target.hp == -1) return (selected < 2 ? 5000 : 0);
                        return (selected < 1 ? 5000 : 0);
                    }
                    // 救队友：按队友缺口（需求3）
                    if (target.hp == 0) return (selected < 1 ? 3000 : 0);      // 0血：1张
                    if (target.hp == -1) return (selected < 2 ? 3600 : 0);     // -1血：2张
                    if (target.hp <= -2) {
                        // 更低：高价值队友才用3张救，否则放弃
                        if (att > 2 && selected < 3) return 4200;
                        return 0;
                    }
                    return 0;
                }

                // ———— 方块：转化火杀（无距离次数限制） ————
                if (suit == 'diamond') {
                    // 出牌阶段主动火杀：尽量用满（3>2>1）
                    if (evt.name == 'chooseToUse' || _status.currentPhase == player) {
                        return (selected < 3 ? 240 : 0);
                    }
                    // 响应阶段：有红桃时不出杀响应（主动卖血扣血），否则才用方块响应
                    if (player.countCards('h', {suit: 'heart'}) > 0 && !player.isDying()) {
                        return 0;
                    }
                    return (selected < 1 ? 180 : 0);
                }

                // ———— 梅花：当闪 ————
                if (suit == 'club') {
                    // 需求4：手里有3张梅花时，即使有红桃也转化3张梅花来闪避
                    if (selected < 3 && player.countCards('h', {suit: 'club'}) >= 3) {
                        return 260;
                    }
                    // 其余：配合“有红桃不闪避”，无红桃才用梅花当闪（优先3张）
                    if (player.countCards('h', {suit: 'heart'}) > 0 && !player.isDying()) return 0;
                    return (selected < 3 ? 70 : 0);
                }

                // ———— 黑桃：当无懈可击 ————
                if (suit == 'spade') {
                    // 黑桃当无懈通常总是赚，优先多张（3>2>1）
                    return (selected < 3 ? 90 : 0);
                }

                return 0;
            },

            hiddenCard: function(player, name) {
                if (name == "tao" && player.countCards("hes", { suit: "heart" }) > 0) return true;
                if (name == "shan" && player.countCards("hes", { suit: "club" }) > 0) return true;
                if (name == "wuxie" && player.countCards("hes", { suit: "spade" }) > 0) return true;
                if (name == "sha" && player.countCards("hes", { suit: "diamond" }) > 0) return true;
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
                    card.logSkill = 'sgz_longxiao';
                    if (suit == 'diamond') card._sgz_longxiao_diamond = true;
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
            group: ["sgz_longxiao_modify", "sgz_longxiao_recover", "sgz_longxiao_after", "sgz_longxiao_directhit"],
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
                        if (card.name == 'sha' && card._sgz_longxiao_diamond) {
                            trigger.addCount = false; 
                            if (player.stat[player.stat.length - 1].card.sha > 0) {
                                player.stat[player.stat.length - 1].card.sha--;
                            }
                        }

                        if (count >= 2) player.gainMaxHp(1);

                        if (count == 3 && suit == 'diamond' && card.name == 'sha' && target) {
                            trigger.baseDamage = Math.max(3, target.hp + target.hujia);
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
                            target.gainMaxHp(2);
                            var missingHp = target.maxHp - target.hp + 2;
                            if (missingHp > trigger.num) {
                                trigger.num = missingHp;
                                game.log(target, '因三连红桃【龙霄】回复至体力上限');
                            }
                        } else if (count == 2) {
                            target.gainMaxHp(1);
                            trigger.num++;
                            game.log(target, '因双红桃【龙霄】回复量增加');
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
                                player.chooseTarget('龙霄：弃置一名角色所有牌', true).set('ai', t => -get.attitude(player, t));
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
                                player.gainPlayerCard(curr, 'he', true); 
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
                                game.log(target, '的所有牌被【龙霄】弃置');
                            }
                        }
                    }
                },
                directhit: {
                    trigger: { player: 'useCardToTargeted' },
                    forced: true,
                    popup: false,
                    filter: function(event, player) {
                        return event.card && event.card._sgz_longxiao_diamond;
                    },
                    content: function() {
                        trigger.getParent().directHit.add(trigger.target);
                    }
                }
            },
            ai: { save: true, respondSha: true, respondShan: true, respondWuxie: true, order: 4, result: { player: 1 } }
        },
        // === 3. 劫烬  ===
        sgz_jiejin: {
            persevereSkill: true,
            audio: "ext:大梦千秋/audio/sgz_zhaoyun:2",
            mark: true,
            marktext: "劫烬",
            intro: {
                name: "劫烬",
                content: "mark",
            },
            ai:{expose: 0.6,},
            group: ["sgz_jiejin_effect", "sgz_jiejin_gain", "sgz_jiejin_dying"],
            subSkill: {
                effect: {
                    trigger: {
                        player: ["useCard", "respond"],
                    },
                    direct: true,
                    filter(event, player) {
                        if (event.skill != 'sgz_longxiao' && (!event.parent || event.parent.skill != 'sgz_longxiao')) return false;
                        if (player.countMark('sgz_jiejin') < 1) return false;
                        if (_status.currentPhase == player) {
                            return game.hasPlayer(target => target != player && target.countCards('he') > 0);
                        } else {
                            return _status.currentPhase && _status.currentPhase.countCards('he') > 0;
                        }
                    },
                    async content(event, trigger, player) {
                        const {result} = await player.chooseBool(get.prompt('sgz_jiejin'), `是否消耗1个“劫烬”标记并发动技能？（当前拥有：${player.countMark('sgz_jiejin')}）`).set('ai', () => true);
                        if(result.bool) {
                            player.logSkill('sgz_jiejin');
                            player.removeMark('sgz_jiejin', 1);

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
                        if(player.countMark('sgz_jiejin') < 7){
                            player.addMark('sgz_jiejin', 1);
                            game.log(player, '获得了一个“劫烬”标记');
                        }
                    }
                },
                dying: {
                    trigger: { player: "dying" },
                    forced: true,
                    silent: true,
                    content: function() {
                        if(player.countMark('sgz_jiejin') < 7){
                            player.addMark('sgz_jiejin', 1);
                            game.log(player, '因进入濒死状态，获得了一个“劫烬”标记');
                        }
                    }
                },
            }
        },
        // === 4. 【劫烬】蓄力能量条特效（挂载在武将牌右侧，参考白泽/陆逊能量条方案）===
        sgz_zhaoyun_ui: {
            charlotte: true,
            trigger: {
                player: ["enterGame", "addMark", "removeMark", "dying"],
                global: ["gameStart", "phaseZhunbeiBegin", "roundStart", "gameDrawBefore"]
            },
            forced: true,
            silent: true,
            priority: -10,
            init: function(player) {
                // 1. 注入样式
                if (!document.getElementById('zhaoyun_jiejin_energy_style')) {
                    var style = document.createElement('style');
                    style.id = 'zhaoyun_jiejin_energy_style';
                    style.innerHTML = `
                        /* 容器：挂载在武将牌节点上，绝对定位到右侧（贴近武将牌） */
                        .zhaoyun-jiejin-wrap {
                            position: absolute; left: 100%; bottom: 0;
                            margin-left: 2px; width: 52px; height: 100%;
                            z-index: 60; pointer-events: none;
                            display: flex; flex-direction: column; align-items: flex-start; justify-content: flex-end;
                        }
                        /* 氛围光晕：托在剑身背后（扁平柔光，随能量同步） */
                        .zhaoyun-jiejin-glow {
                            position: absolute; left: 50%; bottom: 6%; width: 46px; height: 0%;
                            transform: translateX(-50%);
                            background: radial-gradient(ellipse 100% 100% at 50% 100%, rgba(255,110,20,0.28), rgba(255,110,20,0) 70%);
                            filter: blur(3px);
                            z-index: 0;
                            transition: height 0.85s cubic-bezier(0.22, 1.2, 0.36, 1);
                        }
                        /* 蓄力文字（竖排，悬于剑尖上方） */
                        .zhaoyun-jiejin-text {
                            font-family: yuanli; font-size: 8px; line-height: 10px;
                            color: rgba(255, 200, 130, 0.95);
                            text-shadow: 0 0 6px rgba(255,120,30,0.8), 0 1px 2px rgba(0,0,0,0.9);
                            writing-mode: vertical-rl; letter-spacing: 1px; white-space: nowrap;
                            margin: 0 0 3px;
                            position: relative; z-index: 4;
                            align-self: center;
                        }
                        /* 剑形能量条（内嵌 SVG 美术，随武将牌等比缩放） */
                        .zhaoyun-jiejin-sword {
                            height: 86%; width: auto; flex: none;
                            filter: drop-shadow(0 0 5px rgba(255,120,30,0.45));
                            z-index: 2;
                        }
                        /* 悬浮火星：沿剑身方向上飘 */
                        .zhaoyun-jiejin-ember {
                            position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 3;
                        }
                        .zhaoyun-jiejin-ember i {
                            position: absolute;
                            background: radial-gradient(circle, #ffe3ad 0%, #ff9a2e 55%, rgba(255,140,40,0) 100%);
                            border-radius: 50%; opacity: 0;
                            filter: blur(0.5px) drop-shadow(0 0 4px #ff8a1a);
                            animation: zhaoyun-spark 2.2s infinite ease-out;
                        }
                        @keyframes zhaoyun-spark {
                            0% { transform: translate(0, 0) scale(1); opacity: 0; }
                            10% { opacity: 0.85; }
                            70% { opacity: 0.5; }
                            100% { transform: translate(var(--dx, 0px), -150px) scale(0.4); opacity: 0; }
                        }
                        /* 满蓄力：剑身金芒 */
                        .zhaoyun-jiejin-wrap.full .zhaoyun-jiejin-sword {
                            filter: drop-shadow(0 0 9px rgba(255,170,50,0.85));
                            animation: zhaoyun-pulse 1.5s infinite ease-in-out;
                        }
                        .zhaoyun-jiejin-wrap.full .zhaoyun-jiejin-glow {
                            background: radial-gradient(ellipse 100% 100% at 50% 100%, rgba(255,180,60,0.5), rgba(255,180,60,0) 70%);
                        }
                        .zhaoyun-jiejin-wrap.full .zhaoyun-jiejin-text {
                            color: #ffd27a;
                            text-shadow: 0 0 8px rgba(255,180,60,1), 0 1px 2px rgba(0,0,0,0.9);
                        }
                        @keyframes zhaoyun-pulse {
                            0%, 100% { filter: drop-shadow(0 0 6px rgba(255,170,50,0.7)); }
                            50% { filter: drop-shadow(0 0 13px rgba(255,200,80,1)); }
                        }
                    `;
                    document.head.appendChild(style);
                }

                // 2. 构建剑形 SVG（内嵌矢量美术：空心剑身框 + 剑格 + 短剑柄 + 剑首）
                if (!player.zhaoyunJiejinBar) {
                    var wrap = document.createElement('div');
                    wrap.className = 'zhaoyun-jiejin-wrap';

                    var glow = document.createElement('div');
                    glow.className = 'zhaoyun-jiejin-glow';

                    var text = document.createElement('div');
                    text.className = 'zhaoyun-jiejin-text';

                    var SVGNS = 'http://www.w3.org/2000/svg';
                    var svg = document.createElementNS(SVGNS, 'svg');
                    svg.setAttribute('viewBox', '0 0 60 205');
                    svg.setAttribute('class', 'zhaoyun-jiejin-sword');

                    // --- defs：渐变 / 剑身内裁剪 / 分段刻度 ---
                    var defs = document.createElementNS(SVGNS, 'defs');

                    var frameGrad = document.createElementNS(SVGNS, 'linearGradient');
                    frameGrad.setAttribute('id', 'zhaoyun_frame_stroke');
                    frameGrad.setAttribute('gradientUnits', 'userSpaceOnUse');
                    frameGrad.setAttribute('x1', '0'); frameGrad.setAttribute('y1', '6');
                    frameGrad.setAttribute('x2', '0'); frameGrad.setAttribute('y2', '152');
                    [['0', '#ffe6b8'], ['0.5', '#d89a4a'], ['1', '#8a4a15']].forEach(function(stop) {
                        var s = document.createElementNS(SVGNS, 'stop');
                        s.setAttribute('offset', stop[0]);
                        s.setAttribute('stop-color', stop[1]);
                        frameGrad.appendChild(s);
                    });

                    var energyGrad = document.createElementNS(SVGNS, 'linearGradient');
                    energyGrad.setAttribute('id', 'zhaoyun_energy_grad');
                    energyGrad.setAttribute('x1', '0'); energyGrad.setAttribute('y1', '1');
                    energyGrad.setAttribute('x2', '0'); energyGrad.setAttribute('y2', '0');
                    [['0', '#5c0d00'], ['0.38', '#b32800'], ['0.76', '#ff6a00'], ['1', '#ffc24d']].forEach(function(stop) {
                        var s = document.createElementNS(SVGNS, 'stop');
                        s.setAttribute('offset', stop[0]);
                        s.setAttribute('stop-color', stop[1]);
                        energyGrad.appendChild(s);
                    });

                    var energyGradFull = document.createElementNS(SVGNS, 'linearGradient');
                    energyGradFull.setAttribute('id', 'zhaoyun_energy_grad_full');
                    energyGradFull.setAttribute('x1', '0'); energyGradFull.setAttribute('y1', '1');
                    energyGradFull.setAttribute('x2', '0'); energyGradFull.setAttribute('y2', '0');
                    [['0', '#8a1c00'], ['0.3', '#ff6a00'], ['0.7', '#ffb347'], ['1', '#fff2c9']].forEach(function(stop) {
                        var s = document.createElementNS(SVGNS, 'stop');
                        s.setAttribute('offset', stop[0]);
                        s.setAttribute('stop-color', stop[1]);
                        energyGradFull.appendChild(s);
                    });

                    var bladeClip = document.createElementNS(SVGNS, 'clipPath');
                    bladeClip.setAttribute('id', 'zhaoyun_blade_clip');
                    var clipPathEl = document.createElementNS(SVGNS, 'path');
                    clipPathEl.setAttribute('d', 'M30,12 L34.5,17 L34.5,149 L25.5,149 L25.5,17 Z');
                    bladeClip.appendChild(clipPathEl);

                    defs.appendChild(frameGrad);
                    defs.appendChild(energyGrad);
                    defs.appendChild(energyGradFull);
                    defs.appendChild(bladeClip);
                    svg.appendChild(defs);

                    // --- 剑脊（淡淡中脊线） ---
                    var ridge = document.createElementNS(SVGNS, 'line');
                    ridge.setAttribute('x1', '30'); ridge.setAttribute('y1', '10');
                    ridge.setAttribute('x2', '30'); ridge.setAttribute('y2', '151');
                    ridge.setAttribute('stroke', 'rgba(255,255,255,0.10)');
                    ridge.setAttribute('stroke-width', '1.4');
                    svg.appendChild(ridge);

                    // --- 剑身：矩形空心边框（顶部切角成尖），框内即能量条 ---
                    var blade = document.createElementNS(SVGNS, 'path');
                    blade.setAttribute('d', 'M30,6 L37,14 L37,152 L23,152 L23,14 Z');
                    blade.setAttribute('fill', 'none');
                    blade.setAttribute('stroke', 'url(#zhaoyun_frame_stroke)');
                    blade.setAttribute('stroke-width', '2.2');
                    blade.setAttribute('stroke-linejoin', 'round');
                    svg.appendChild(blade);

                    // --- 剑格（护手，收窄至约 0.8 倍） ---
                    var guard = document.createElementNS(SVGNS, 'path');
                    guard.setAttribute('d', 'M17,152 L43,152 L46,160 L14,160 Z');
                    guard.setAttribute('fill', '#17100a');
                    guard.setAttribute('stroke', '#c98a44');
                    guard.setAttribute('stroke-width', '1.6');
                    guard.setAttribute('stroke-linejoin', 'round');
                    svg.appendChild(guard);
                    var guardLine = document.createElementNS(SVGNS, 'line');
                    guardLine.setAttribute('x1', '17'); guardLine.setAttribute('y1', '154');
                    guardLine.setAttribute('x2', '43'); guardLine.setAttribute('y2', '154');
                    guardLine.setAttribute('stroke', '#c98a44');
                    guardLine.setAttribute('stroke-width', '1');
                    guardLine.setAttribute('opacity', '0.5');
                    svg.appendChild(guardLine);

                    // --- 剑柄（较短）与缠带 ---
                    var grip = document.createElementNS(SVGNS, 'rect');
                    grip.setAttribute('x', '26.6'); grip.setAttribute('y', '160');
                    grip.setAttribute('width', '6.8'); grip.setAttribute('height', '26');
                    grip.setAttribute('rx', '2');
                    grip.setAttribute('fill', '#17100a');
                    grip.setAttribute('stroke', '#c98a44');
                    grip.setAttribute('stroke-width', '1.4');
                    svg.appendChild(grip);
                    [167, 179].forEach(function(by) {
                        var band = document.createElementNS(SVGNS, 'line');
                        band.setAttribute('x1', '26.6'); band.setAttribute('y1', by);
                        band.setAttribute('x2', '33.4'); band.setAttribute('y2', by);
                        band.setAttribute('stroke', '#e0a861');
                        band.setAttribute('stroke-width', '1');
                        band.setAttribute('opacity', '0.8');
                        svg.appendChild(band);
                    });

                    // --- 剑首 ---
                    var pommel = document.createElementNS(SVGNS, 'ellipse');
                    pommel.setAttribute('cx', '30'); pommel.setAttribute('cy', '190.5');
                    pommel.setAttribute('rx', '5.5'); pommel.setAttribute('ry', '4.5');
                    pommel.setAttribute('fill', '#17100a');
                    pommel.setAttribute('stroke', '#c98a44');
                    pommel.setAttribute('stroke-width', '1.4');
                    svg.appendChild(pommel);
                    var pommelCore = document.createElementNS(SVGNS, 'ellipse');
                    pommelCore.setAttribute('cx', '30'); pommelCore.setAttribute('cy', '189.5');
                    pommelCore.setAttribute('rx', '2.6'); pommelCore.setAttribute('ry', '2');
                    pommelCore.setAttribute('fill', '#e0a861');
                    pommelCore.setAttribute('opacity', '0.85');
                    svg.appendChild(pommelCore);

                    // --- 能量层：裁剪进剑身内部（剑身=框，内部=能量条） ---
                    var energyGroup = document.createElementNS(SVGNS, 'g');
                    energyGroup.setAttribute('clip-path', 'url(#zhaoyun_blade_clip)');

                    var energyRect = document.createElementNS(SVGNS, 'rect');
                    energyRect.setAttribute('x', '0'); energyRect.setAttribute('y', '150');
                    energyRect.setAttribute('width', '60'); energyRect.setAttribute('height', '0');
                    energyRect.setAttribute('fill', 'url(#zhaoyun_energy_grad)');

                    var frontRect = document.createElementNS(SVGNS, 'rect');
                    frontRect.setAttribute('x', '0'); frontRect.setAttribute('y', '0');
                    frontRect.setAttribute('width', '60'); frontRect.setAttribute('height', '1.4');
                    frontRect.setAttribute('fill', '#fff2c9');
                    frontRect.setAttribute('opacity', '0');

                    energyGroup.appendChild(energyRect);
                    energyGroup.appendChild(frontRect);

                    // 6 条分段刻度线：位于每格边界（能量前沿走到哪一格，就正好停在哪条刻度线上，不溢出）
                    for (var tk = 1; tk <= 6; tk++) {
                        var ty = (149 - tk * 137 / 7).toFixed(2);
                        var tl = document.createElementNS(SVGNS, 'line');
                        tl.setAttribute('x1', '25.5'); tl.setAttribute('y1', ty);
                        tl.setAttribute('x2', '34.5'); tl.setAttribute('y2', ty);
                        tl.setAttribute('stroke', 'rgba(0,0,0,0.55)');
                        tl.setAttribute('stroke-width', '1');
                        energyGroup.appendChild(tl);
                    }

                    svg.appendChild(energyGroup);

                    // --- 火星粒子 ---
                    var embers = document.createElement('div');
                    embers.className = 'zhaoyun-jiejin-ember';
                    for (var i = 0; i < 10; i++) {
                        var e = document.createElement('i');
                        e.style.left = (Math.random() * 100) + '%';
                        e.style.bottom = (Math.random() * 35) + '%';
                        var s = (1.5 + Math.random() * 1.5).toFixed(1);
                        e.style.width = e.style.height = s + 'px';
                        e.style.setProperty('--dx', (Math.random() * 28 - 14) + 'px');
                        e.style.animationDelay = (Math.random() * 2.2) + 's';
                        e.style.animationDuration = (1.6 + Math.random() * 1.4) + 's';
                        embers.appendChild(e);
                    }

                    wrap.appendChild(glow);
                    wrap.appendChild(text);
                    wrap.appendChild(svg);
                    wrap.appendChild(embers);

                    // 【关键】：挂载到 player 节点而不是 ui.arena
                    player.appendChild(wrap);
                    player.zhaoyunJiejinBar = { wrap: wrap, svg: svg, energyRect: energyRect, frontRect: frontRect, glow: glow, text: text, embers: embers };

                    // 能量刷新函数（剑身内能量条：自剑格向剑尖平滑填充，easeOut 缓动）
                    var BLADE_INNER_TOP = 12, BLADE_INNER_BOTTOM = 149, BLADE_INNER_H = 137;
                    var curFront = BLADE_INNER_BOTTOM; // 当前显示的能量前沿 y 坐标
                    function applyFront(frontY, percent, isFull) {
                        energyRect.setAttribute('y', frontY.toFixed(2));
                        energyRect.setAttribute('height', (BLADE_INNER_BOTTOM - frontY).toFixed(2));
                        frontRect.setAttribute('y', (frontY - 1.4).toFixed(2));
                        frontRect.setAttribute('opacity', percent > 0 ? '0.95' : '0');
                        energyRect.setAttribute('fill', isFull ? 'url(#zhaoyun_energy_grad_full)' : 'url(#zhaoyun_energy_grad)');
                    }
                    player.zhaoyunJiejinBar.update = function(percent, isFull) {
                        var self = this;
                        var targetFront = BLADE_INNER_BOTTOM - BLADE_INNER_H * percent / 100;
                        if (self._animId) cancelAnimationFrame(self._animId);
                        var from = curFront;
                        var start = null;
                        var DUR = 500; // 平滑时长（毫秒）
                        function tick(ts) {
                            if (start == null) start = ts;
                            var t = Math.min(1, (ts - start) / DUR);
                            var e = 1 - Math.pow(1 - t, 3); // easeOutCubic：先快后缓，消除生硬感
                            curFront = from + (targetFront - from) * e;
                            applyFront(curFront, percent, isFull);
                            if (t < 1) {
                                self._animId = requestAnimationFrame(tick);
                            } else {
                                self._animId = null;
                                curFront = targetFront;
                            }
                        }
                        self._animId = requestAnimationFrame(tick);
                    };

                    // 初始刷新一次
                    var initMark = player.countMark('sgz_jiejin');
                    var initPercent = Math.max(0, Math.min(100, Math.round(initMark / 7 * 100)));
                    var initFull = initMark >= 7;
                    player.zhaoyunJiejinBar.update(initPercent, initFull);
                    glow.style.height = Math.min(initPercent * 0.62, 62) + '%';
                    text.innerHTML = '劫烬 ' + initMark + '/7';
                    if (initFull) wrap.classList.add('full');
                }
            },
            content: function() {
                var bar = player.zhaoyunJiejinBar;
                if (!bar) return;
                var mark = player.countMark('sgz_jiejin');
                var percent = Math.max(0, Math.min(100, Math.round(mark / 7 * 100)));
                var isFull = mark >= 7;
                bar.glow.style.height = Math.min(percent * 0.62, 62) + '%';
                bar.text.innerHTML = '劫烬 ' + mark + '/7';
                if (isFull) {
                    if (!bar.wrap.classList.contains('full')) bar.wrap.classList.add('full');
                } else {
                    bar.wrap.classList.remove('full');
                }
                if (bar.update) bar.update(percent, isFull);
            },
            onremove: function(player) {
                if (player.zhaoyunJiejinBar) {
                    if (player.zhaoyunJiejinBar._animId) cancelAnimationFrame(player.zhaoyunJiejinBar._animId);
                    player.zhaoyunJiejinBar.wrap.remove();
                    delete player.zhaoyunJiejinBar;
                }
            }
        },
    },
    skillTranslate: {
        sgz_guzhi: "孤峙",
        sgz_guzhi_info: "锁定技，①你的手牌上限+X（X为你的体力上限）；②当你进入或脱离濒死状态时摸一张牌。③回合外你的手牌数始终不小于2。④你的体力值始终不大于1，体力上限始终不大于7。⑤你单次受到的伤害不大于你已损失体力值与游戏轮数。",
        sgz_longxiao: "龙霄",
        sgz_longxiao_info: "你可以将1至3张花色相同的牌当做对应牌使用或打出并根据其数量与花色执行对应效果：<br>♥️当【桃】；两张：目标增加一点体力上限且回复量+1；三张：目标增加两点体力上限并回满体力。<br>♦️当火【杀】（无距离次数限制且不可被响应）；两张：伤害+1；三张：伤害改为等同于目标的体力与护甲之和且至少为3。<br>♠️当【无懈可击】：两张：获得当前回合角色一张牌；三张：不可被响应且摸两张牌。<br>♣️当【闪】：两张：获得当前回合角色一张牌；三张：弃置一名角色所有牌。<br>若你依此法使用或打出了2或3张牌，你增加一点体力上限。",
        sgz_jiejin: "劫烬",
        sgz_jiejin_info: "蓄力技(0/7)，每名角色准备阶段开始时或你进入濒死状态时，你获得1点蓄力点。<br>当你发动“龙霄”时，你可以消耗1点蓄力点并执行相应效果：若在你的回合内/外，你获得一名其他角色/当前回合角色的一张牌。",
    },
    characterTaici:{
        "sgz_guzhi":{order: 1,content:"九阳断魂，斩却三尸，脱凡蜕而化应龙!/潜龙在渊，声震九天，身可战于四野!"},
        "sgz_longxiao":{order: 2,content:"龙缚于渊，虽万仞在身，志犹存于八荒!/左执青釭，右擎龙胆，此天下，可有挡我者!/将临死地，必效刑天，舞干戈以征四海!/八尺之身，秉义承武，胸腹可栖万丈苍龙!"},
        "sgz_jiejin":{order: 3,content:"身陷绝境，方乃用武之时，问长缨何在!/心怀长帆，何惧困顿，当济沧海云间!"},
        "die":{content:"亢龙有悔，恨未除天狼于人间..."}
    }
};