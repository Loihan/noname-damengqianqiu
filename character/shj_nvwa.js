export default {
    character: {
        // === 修改点: 更新体力、上限和技能 ===
        shj_nvwa: [
            "female", 
            "shen", 
            "180/365", 
            ["shj_lianshi", "shj_xirang", "shj_shenen", "shj_guiyuan", "shj_tianhen",  "shj_butian"], 
            [
                "des:女娲，中国上古神话中的创世女神。传说她抟土造人，并化生万物，使天地不再沉寂。后四极废，九州裂，天不兼覆，地不周载，于是她炼五色石以补苍天，断鳌足以立四极，从此万物复苏，天下安泰。", 
                "ext:大梦千秋/image/shj_nvwa.jpg",
                "die:ext:大梦千秋/audio/shj_nvwa/die.mp3"
            ]
            ],
    },
    characterName: 'shj_nvwa',
    characterTranslate: {
        shj_nvwa: "女娲",
    },
    skills: {

shj_lianshi: {
    audio: "ext:大梦千秋/audio/shj_nvwa:3",
    persevereSkill: true,
    trigger: {
        global: "phaseBefore",
        player: "entergame",
        target: "useCardToTargeted",
    },
    forced: true,
    filter: function(event, player) {
        if (event.name == "useCardToTargeted") {
            return get.type(event.card) == "delay" && !player.hasSkill("shj_lianshi_skip");
        }
        if (game.roundNumber == 0) return true;
        return false;
    },
    content: function() {
        if (trigger.name == "useCardToTargeted") {
            player.skip("phaseJudge");
            player.addTempSkill("shj_lianshi_skip", { player: "phaseJudgeSkipped" });
        } 
        else {
           var draw_num = game.countPlayer() - player.countCards('h');
            if(draw_num > 0) {
                player.draw(draw_num);
            }  
            var cards = player.getCards("h");
            player.addGaintag(cards, "eternal_wuseshi");   
        }
    },
    group: ["shj_lianshi_beifen", "shj_lianshi_restore","shj_lianshi_draw"],
    mod: {
        cardUsable: function(card, player) {
            // 1. 首先，检查手牌中是否有“五色石”，如果没有，则不满足条件。
            var wuseshiInHand = player.countCards("h", c => c.hasGaintag("eternal_wuseshi"));
            if (wuseshiInHand === 0) return;

            // 2. 检查场上其他地方是否存在“五色石”。
            // a. 检查其他角色的区域（手牌、装备、判定）
            var foundOutside = game.hasPlayer(p => {
                if (p === player) {
                    // 对自己，只检查装备区和判定区
                    return p.countCards('ej', c => c.hasGaintag('eternal_wuseshi')) > 0;
                } else {
                    // 对别人，检查所有区域
                    return p.countCards('hej', c => c.hasGaintag('eternal_wuseshi')) > 0;
                }
            });
            if (foundOutside) return; // 如果在其他角色身上找到了，则不满足条件

            // b. 检查弃牌堆
            for (var cardNode of ui.discardPile.childNodes) {
                if (cardNode.hasGaintag('eternal_wuseshi')) return; // 如果在弃牌堆找到了，则不满足条件
            }
            
            // 3. 如果以上检查都通过，说明所有“五色石”都在手牌里。
            return Infinity;
        },
        targetInRange: function(card, player) {
            // 逻辑与 cardUsable 完全相同
            var wuseshiInHand = player.countCards("h", c => c.hasGaintag("eternal_wuseshi"));
            if (wuseshiInHand === 0) return;
            var foundOutside = game.hasPlayer(p => {
                if (p === player) return p.countCards('ej', c => c.hasGaintag('eternal_wuseshi')) > 0;
                else return p.countCards('hej', c => c.hasGaintag('eternal_wuseshi')) > 0;
            });
            if (foundOutside) return;
            for (var cardNode of ui.discardPile.childNodes) {
                if (cardNode.hasGaintag('eternal_wuseshi')) return;
            }
            return true;
        },
                ignoredHandcard: function(card, player) {
            if (card.hasGaintag("eternal_wuseshi")) return true;
        },
        cardDiscardable: function(card, player, name) {
            if (name == "phaseDiscard" && card.hasGaintag("eternal_wuseshi")) return false;
        },
        globalTo: function(from, to, distance) {
            return distance + Math.min(5, to.countCards("h", card => card.hasGaintag("eternal_wuseshi")));
        },
        aiOrder: function(player, card, num) {
            if (get.itemtype(card) == "card" && card.hasGaintag("eternal_wuseshi")) {
                var suits = lib.suit.slice();
                player.countCards("h", cardx => {
                    if (!cardx.hasGaintag("eternal_wuseshi") || card == cardx) return;
                    suits.remove(get.suit(cardx));
                });
                if (suits.length) return num + suits.length * 2.5;
            }
        },
    },
    ai: {
        effect: { "target_use": (card, player, target) => { if (get.type(card) == "delay") return 0.1; } },
    },
    subSkill: {
        draw:{
            trigger: {
                global: "gameDrawBegin",
            },
            forced: true,
            filter: function(event, player) {
                return game.roundNumber == 0;
            },
            content: function() {
                var targetNum = Math.max( 4 , game.countPlayer());
                trigger.num = function(p) {
                    return targetNum;
                };
            },
        },
        beifen: {
            audio: 2,
            trigger: {
                player: ["loseAfter"],
                global: ["equipAfter","addJudgeAfter","gainAfter","loseAsyncAfter","addToExpansionAfter"],
            },
            filter: function(event, player) {
                var evt = event.getl(player);
                if (!evt || !evt.hs || !evt.hs.length) return false;
                if (event.name == "lose") {
                    for (var i in event.gaintag_map) {
                        // === 修改点: 检查 "eternal_wuseshi" 标记 ===
                        if (event.gaintag_map[i].includes("eternal_wuseshi")) return true;
                    }
                    return false;
                }
                return player.hasHistory("lose", evt => {
                    if (event != evt.getParent()) return false;
                    for (var i in evt.gaintag_map) {
                        // === 修改点: 检查 "eternal_wuseshi" 标记 ===
                        if (evt.gaintag_map[i].includes("eternal_wuseshi")) return true;
                    }
                    return false;
                });
            },
            forced: true,
            content: function() {
                var suits = lib.suit.slice();
                player.countCards("h", card => {
                    // === 修改点: 检查 "eternal_wuseshi" 标记 ===
                    if (!card.hasGaintag("eternal_wuseshi")) return;
                    suits.remove(get.suit(card));
                });
                var cards = [];
                while (suits.length) {
                    var suit = suits.shift();
                    var card = get.cardPile(cardx => get.suit(cardx, false) == suit);
                    if (card) cards.push(card);
                }
                if (cards.length) player.gain(cards, "gain2");
            },
        },
        restore: {
            audio: 2,
            trigger: { player: "phaseZhunbeiBegin" },
            filter: function(event, player) {
                // === 修改点: 检查 "eternal_wuseshi" 标记 ===
                return Array.from(ui.discardPile.childNodes).some(card => card.hasGaintag("eternal_wuseshi"));
            },
            forced: true,
            content: function() {
                // === 修改点: 检查 "eternal_wuseshi" 标记 ===
                var cards = Array.from(ui.discardPile.childNodes).filter(card => card.hasGaintag("eternal_wuseshi"));
                player.gain(cards, "gain2");
            },
        },
        skip: {
            mark: true,
            intro: { content: "跳过下个判定阶段" },
        },
    },
},
shj_xirang: {
    audio: "ext:大梦千秋/audio/shj_nvwa:4",
    persevereSkill: true,
    trigger: { global: ["useCard","respond"] },
    forced: true,
    // === 修改点: 技能逻辑完全不变, 只修改标记显示部分 ===
    onremove: true,
    marktext: "壤",
    intro: { 
        name: "息壤",
        content: function(storage, player) {
            var recorded = storage || [];
            // 对已记录的点数进行从小到大排序
            recorded.sort((a, b) => a - b);
            
            var all_numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
            var unrecorded = all_numbers.filter(num => !recorded.includes(num));

            var str = "已记录点数 (" + recorded.length + "/" + all_numbers.length + ")：";
            str += recorded.join(', ');
            str += "<br><br>未记录点数：";
            str += unrecorded.join(', ');

            return str;
        } 
    },
    // filter 和 content 保持不变
    filter: function(event, player) {
        const { card, player: target } = event, number = get.number(card);
        if (typeof number !== 'number') return false;
        const storage = player.getStorage('shj_xirang'), bool = !storage.includes(number);
        if (player == target) return bool && player.hasHistory('lose', evt => evt.getParent() == event && evt.hs?.length);
        if (bool) return false;
        if (number >= 10 && !target.hasCard(card => lib.filter.cardDiscardable(card, target, 'shj_xirang'), 'he')) return false;
        return true;
    },
    async content(event, trigger, player) {
        const { card, player: target } = trigger, number = get.number(card);
        if (player == target) {
            player.markAuto(event.name, [number]);
        }
        else {
            if (number <= 4) {
                target.addSkill(event.name + '_damage');
                target.addMark(event.name + '_damage', 1, false);
                game.log(target, '下一次受到的伤害', '#g+1');
            }
            else if (number >= 10) {
                const num = target.getCards('he').filter(card => lib.filter.cardDiscardable(card, target, 'shj_xirang')).reduce((sum, card) => sum + get.number(card), 0);
                if (num <= number) await target.discard(target.getCards('he'));
                else await target.chooseToDiscard(`弃置任意张点数之和不小于${number}的牌`, 'he', true).set('selectCard', function () {
                    let num = 0;
                    for (let i = 0; i < ui.selected.cards.length; i++) num += get.number(ui.selected.cards[i]);
                    if (num >= _status.event.num) return ui.selected.cards.length;
                    return ui.selected.cards.length + 2;
                }).set('ai', card => 6 - get.value(card)).set('num', number).set('complexCard', true);
            }
            else await player.draw();
        }
    },
    subSkill: {
        damage: {
            trigger: { player: "damageBegin3" },
            forced: true, charlotte: true, onremove: true,
            content: function() {
                trigger.num += player.countMark(event.name);
                player.removeSkill(event.name);
            },
            intro: { content: "下次受到伤害时，此伤害+#" },
        },
    },
},
shj_shenen: {
    // === 修改点: 移除 charlotte: true, 使其成为一个可见的常驻技能 ===
    audio: "ext:大梦千秋/audio/shj_nvwa:8",
    persevereSkill: true,
    forced: true,
    trigger: {
        source: "damageSource",
        player: "damageEnd",
    },
    filter(event, player, name) {
        var num = Math.floor(player.getDamagedHp() / 5);
        if (name == 'damageEnd') return num > 0;
        if (name == 'damageSource') return event.player != player && player.isDamaged() && num > 0;
        return false;
    },
    content: function () {
        var num = Math.floor(player.getDamagedHp() / 5);
        var name = event.triggername;
        if (name == 'damageSource') player.recover(num);
        else if (name == 'damageEnd') player.loseHp(num);
    },
},
shj_guiyuan: {
    audio: "ext:大梦千秋/audio/shj_nvwa:4",
    persevereSkill: true,
    trigger: { global: ["loseAfter", "cardsDiscardAfter", "loseAsyncAfter"] },
    forced: true,
    filter: function(event, player) {
        if (event.name.indexOf("lose") == 0) {
            if (event.getlx === false || event.position != ui.discardPile) return false;
        } else {
            var evt = event.getParent();
            if (evt.relatedEvent && evt.relatedEvent.name == "useCard") return false;
        }
        for (var i of event.cards) {
            var owner = (event.hs && event.hs.includes(i)) ? event.player : false;
            var type = get.type(i, null, owner);
            if (type == "basic" || type == "trick") return true;
        }
        return false;
    },
    content: function() {
        var num = 0;
        for (var i of trigger.cards) {
            var owner = (trigger.hs && trigger.hs.includes(i)) ? trigger.player : false;
            var type = get.type(i, null, owner);
            if (type == "basic" || type == "trick") num++;
        }
        player.addMark("shj_guiyuan", num);
    },
    group: "shj_guiyuan_consume",
    marktext: "元",
    intro: {
        name: "归元",
        content: "mark",
    },
    subSkill: {
        consume: {
            audio: 2,
            trigger: { player: "shj_guiyuanAfter" },
            forced: true,
            filter: function(event, player) {
                var recorded_numbers = player.getStorage('shj_xirang') || [];
                var all_numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
                var unrecorded_count = all_numbers.filter(num => !recorded_numbers.includes(num)).length;
                var X = Math.max(1, unrecorded_count);
                return player.countMark("shj_guiyuan") >= X;
            },
            content: function() {
                'step 0'
                var recorded_numbers = player.getStorage('shj_xirang') || [];
                var all_numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
                var unrecorded_count = all_numbers.filter(num => !recorded_numbers.includes(num)).length;
                event.X = Math.max(1, unrecorded_count);
                
                player.logSkill('shj_guiyuan_consume');
                
                // === 核心修改点: 将移去标记的数量从“手牌数”改为“X” ===
                var num_to_remove = event.X;
                player.removeMark("shj_guiyuan", num_to_remove);
                
                'step 1'
                player.loseMaxHp(event.X);
            },
        },
    },
},
shj_tianhen: {
    // === 核心修正: 技能结构完全模仿 jiufa ===
    audio: "ext:大梦千秋/audio/shj_nvwa:3",
    persevereSkill: true,
    // 主技能现在是 forced，在满足条件时自动触发效果
    forced: true,
    // trigger 改为 useCardAfter，这是效果结算的安全时机
    trigger: {
        player: ["useCardAfter", "respondAfter"],
    },
    // filter 检查计数子技能是否已打上 "flag"，以及数量是否达标
    filter: function(event, player) {
        // "tianhen_counted" 是我们在子技能中设置的flag
        return event.tianhen_counted && player.getStorage("shj_tianhen").length >= 9;
    },
    content: function() {
        'step 0'
        player.logSkill('shj_tianhen');
        player.popup('天恨', 'fire');
        game.log(player, '记录了9种牌名，发动了【天恨】');
        player.loseMaxHp(9);
        'step 1'
        // 使用 unmarkSkill 来触发 onunmark，从而清空记录
        player.unmarkSkill("shj_tianhen");
    },
    marktext: "天恨",
    intro: { 
        name: "天恨",
        content: "已记录牌名：$",
        // onunmark: true 是关键，它让 unmarkSkill 可以自动清空 player.storage.shj_tianhen
        onunmark: true 
    },
    // group 指向负责计数的子技能
    group: "shj_tianhen_count",
    subSkill: {
        count: {
            // 计数子技能在 useCard1 这个更早的时机触发
            trigger: { player: ["useCard1", "respond"] },
            forced: true,
            charlotte: true,
            popup: false,
            firstDo: true,
            filter: function(event, player) {
                // 只有在新牌名出现时才计数
                return !player.getStorage("shj_tianhen").includes(event.card.name);
            },
            content: function() {
                // 1. 为当前事件打上 "flag"
                trigger.tianhen_counted = true;
                // 2. 自动记录牌名并更新标记
                player.markAuto("shj_tianhen", [trigger.card.name]);
            },
        },
    },
},
shj_butian: {
    audio: "ext:大梦千秋/audio/shj_nvwa:2",
    persevereSkill: true,
    awakenSkill: true,
    skillAnimation: true,
    animationColor: 'fire',
    // === 修改点: 移除衍生技标识, 因为神恩已是常驻技能 ===
    trigger: {
        global: "phaseBefore",
        player: ["changeHp","gainMaxHpEnd","loseMaxHpEnd","enterGame"],
    },
    forced: true,
    filter: function(event, player, name) {
        if (player.storage.shj_butian_awaken) return false;
        if (name == 'phaseBefore' && game.phaseNumber > 0) return false;
        return player.isHealthy();
    },
    content: function () {
        'step 0'
        player.awakenSkill('shj_butian');
        player.storage.shj_butian_awaken = true;
        player.$fullscreenpop('补天', 'fire');
        player.chooseTarget('补天：请选择任意名角色，令其死亡', [1, Infinity], true, function(card, player, target){
            return target != player;
        }).set('ai', function(target){
            return -get.attitude(_status.event.player, target);
        });
        'step 1'
        if(result.bool && result.targets) {
            player.line(result.targets, 'green');
            event.targets = result.targets;
        } else {
            // 如果玩家不选择目标，觉醒技依然会触发代价
            event.targets = [];
        }
        'step 2'
        if (event.targets.length) {
            for (var i = 0; i < event.targets.length; i++) {
                event.targets[i].die();
            }
        }
        'step 3'
        // === 修改点: 觉醒代价中不再添加【神恩】 ===
        game.log(player, '的体力上限变为了1');
        player.loseMaxHp(player.maxHp - 1);
        player.hp = Math.min(player.hp, player.maxHp);
        player.update();
    },
},
    },
skillTranslate: {
    shj_lianshi: "炼石",
    shj_lianshi_info: "锁定技，①所有角色的初始手牌数改为全场人数（至少4张），并将你的初始手牌标记为“五色石”。②“五色石”不计入手牌上限且不能在弃牌阶段弃置。当你失去“五色石”后，若你手牌中的“五色石”不包含所有花色，则你从牌堆中获得缺少的花色的牌各一张。③若你的“五色石”均在你的手牌当中，你使用牌无次数和距离限制。⑤准备阶段，你回收弃牌堆中所有的“五色石”。⑥当你成为延时锦囊牌的目标时，你跳过下个判定阶段。",
    "wuseshi": "五色石",
    shj_xirang: "息壤",
    shj_xirang_info: "锁定技，当你使用或打出牌时记录此牌点数。当一名角色使用或打出已被你记录点数的牌时，若点数：<br>0~4:该角色下次受到的伤害+1；<br>5~9:你摸一张牌；<br>10~K:其弃置点数之和不小于此点数的牌；",
    shj_shenen: "神恩",
    shj_shenen_info: "锁定技。当你对造成/受到伤害后，你回复/失去X点体力。（X为你已损失体力值的1/5，向下取整）",
    shj_guiyuan: "归元",
    shj_guiyuan_info: "锁定技，每当有基本牌或普通锦囊牌进入弃牌堆时，你获得等量“元”标记。当的“元”标记数不小于X时（X为【息壤】未记录的点数的数量且至少为1），你移去X枚“元”标记并减少X点体力上限。",
    shj_tianhen: "天恨",
    shj_tianhen_info: "锁定技，当你使用或打出牌时记录此牌牌名；当你记录了9种不同的牌名后，你减少9点体力上限并然后清空所有记录。",
    shj_butian: "补天",
    shj_butian_info: "觉醒技，当你的体力等于体力上限时，你令任意名其他角色按指定顺序立即死亡，然后将你的体力上限变为1。",
    },
    characterTaici:{
        "shj_lianshi":{order:1,content:"愚夫俗子，妄议天道！/万灵之中，绝非此时！/还尘世清静！"},
        "shj_xirang":{order:2,content:"飞鸟为目！/走兽化耳！/巡四野！/明千古！"},
        "shj_shenen":{order:3,content:"凝五方！/五色蕴华！/归于尘！/天地永固！/百川归位！/行无常！/瞬息千里！/山河万卷！ "},
        "shj_guiyuan":{order:4,content:"汇愿成流。/润泽群生。/揽凡尘。/观往复。"},
        "shj_tianhen":{order:5,content:"紧随万灵的脚步。/巡查毕，天地安。/德泽万物，生光辉。"},
        "shj_butian":{order:6,content:"吾以吾身，造乾坤！/天佑尔成，万类生！"},
        "die":{content:"前尘既灭..."}
    },
};