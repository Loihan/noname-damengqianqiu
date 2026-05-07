export default {
    character: {
        // 梦黄月英：神势力，4/6分布。技能组：集巧、璇和、长明、绮梦
        sgz_huangyueying: [
            "female", 
            "shen", 
            "4/6", 
            ["sgz_jiqiao", "sgz_xuanhe", "sgz_changming", "sgz_qimeng"], 
            [
                "des:黄氏月英，沔阳名士承彦之女也。幼而敏慧，通奇门，晓机巧，常居草庐，潜心造化之术。<br>建安之末，月英于静夜忽生一梦，见将星陨于五丈原，蜀汉气数将尽，满朝志士皆成焦土。觉后惊悸，乃誓以一身机巧之学，逆转乾坤。其集天下之精金，运璇玑之妙理，制连弩、木牛，变幻无端，神鬼莫测。<br>月英更于隆中点燃一盏不灭之灯，以此火为引，导汉军于幽暗。自此，蜀师所至，铁甲森森，机关轰鸣，破秦岭天险如等闲。当孔明北伐之际，月英随军策应，魏人见其攻城军械，皆以为天工降世，无不望风而溃。及至大汉复兴，洛阳城内万灯齐耀，正如当年梦中之长明。其以一女子之智，开万世太平之基，史称“奇才国母”。",
                "ext:大梦千秋/image/sgz_huangyueying.jpg",
                "die:ext:大梦千秋/audio/sgz_huangyueying/die.mp3"
            ]
        ],
    },
    characterName: 'sgz_huangyueying',
    characterTitle: {sgz_huangyueying: "明良千古",},
    characterTranslate: {sgz_huangyueying: "黄月英",},
    skills: {
        // === 1. 集巧 (锁定技：回合开始摸锦囊) ===
        sgz_jiqiao: { 
            audio: "ext:大梦千秋/audio/sgz_huangyueying:2", 
            forced: true, 
            persevereSkill: true,
            trigger: { player: "phaseBegin" }, 
            filter(event, player) { return !player.countCards('h', { type: 'trick' }) }, 
            content: function () { 
                player.logSkill('sgz_jiqiao'); 
                var card = get.cardPile(function (card) { return get.type(card) == 'trick' }); 
                if (card) { player.gain(card, 'gain2') } 
            } 
        },
        // === 2. 璇和 (锁定技：用锦囊摸标记牌并执行花色效果) ===
        sgz_xuanhe: {
            audio: "ext:大梦千秋/audio/sgz_huangyueying:4",
            forced: true, 
            persevereSkill: true,
            trigger: { player: "useCard" }, 
            frequent: true,
            filter(event, player) { 
                if (get.type2(event.card) != 'trick') return false; 
                var suit = get.suit(event.card); 
                return ['heart', 'diamond', 'club', 'spade'].includes(suit); 
            },
            // 这一部分请在 sgz_xuanhe 的 mod 块中更新
        mod: {
            ignoredHandcard: function (card, player) { 
                if (card.hasGaintag('sgz_xuanhe_tag')) return true;
            },
            // === 核心修正：让 AI 极度厌恶使用梦闪响应 ===
            aiUseful: function(player, card, num) {
                if (card.hasGaintag('sgz_xuanhe_shan')) {
                    // 返回一个负数或极小的数，AI 只有在快被打死且没别的闪时才可能考虑
                    return -100; 
                }
            },
            aiValue: function(player, card, num) {
                if (card.hasGaintag('sgz_xuanhe_shan')) {
                    // 价值设为极高，防止被各种弃牌、重铸效果选中
                    return 30;
                }
            }
        },
            content: function () {
                "step 0"; 
                player.draw(); 
                "step 1"; 
                if (result && result.length) {
                    var card_drawn = result[0];
                    player.addGaintag(card_drawn, 'sgz_xuanhe_tag');
                }
                
                player.logSkill('sgz_xuanhe'); 
                var suit = get.suit(trigger.card); 
                switch (suit) {
                    case 'heart': 
                        if (player.isDamaged()) player.recover(); 
                        else player.changeHujia(1); 
                        break; 
                    case 'diamond': 
                        player.chooseTarget('璇和：请选择一名角色，视为对其使用一张火【杀】', true).set('ai', function (target) { 
                            var player = _status.event.player; 
                            return get.effect(target, { name: 'sha', nature: 'fire' }, player, player); 
                        }); 
                        break; 
                    case 'club': 
                        var new_card = game.createCard({ name: 'shan', suit: 'none' }); 
                        player.gain(new_card, 'gain2').gaintag = ['sgz_xuanhe_shan']; 
                        player.addTempSkill('sgz_xuanhe_addsha'); 
                        break; 
                    case 'spade': 
                        player.chooseTarget(true, '璇和：选择一名其他角色，获得其一张牌', function (c, p, target) { 
                            return target != player && target.countCards('he') > 0 
                        }).set('ai', function (target) { return -get.attitude(_status.event.player, target) }); 
                        break;
                }
                if (suit != 'spade' && suit != 'diamond') event.finish();
                "step 2"; 
                if (result.bool && result.targets && result.targets.length) {
                    var target = result.targets[0]; 
                    var suit = get.suit(trigger.card); 
                    if (suit == 'diamond') {
                        player.useCard({ name: 'sha', nature: 'fire', unlimited: true }, target, false, 'noai').set('addExtra', true);
                    }
                    if (suit == 'spade') {
                        player.gainPlayerCard(target, 'he', true);
                    }
                }
            }, 
            subSkill: { 
                addsha: { 
                    onremove: true, 
                    mod: { cardUsable: (card, player, num) => card.name == 'sha' ? num + 1 : num } 
                } 
            } 
        },
        // === 3. 长明 (锁定技：根据梦闪数量和人数观星) ===
        sgz_changming: {
            audio: "ext:大梦千秋/audio/sgz_huangyueying:2", 
            forced: true, 
            persevereSkill: true,
            group: ["sgz_changming_prep", "sgz_changming_finish"], 
            mod: { 
                ignoredHandcard: function (card, player) { if (card.hasGaintag('sgz_xuanhe_shan')) return true }, 
                cardDiscardable: function (card, player, name) { if (name == 'phaseDiscard' && card.hasGaintag('sgz_xuanhe_shan')) return false },
                // 梦闪保护
                aiUseful: function(player, card, num) {
                    if (card.hasGaintag('sgz_xuanhe_shan')) return -100; 
                },
                aiValue: function(player, card, num) {
                    if (card.hasGaintag('sgz_xuanhe_shan')) return 30;
                }
            }, 
            subSkill: { 
                prep: { 
                    trigger: { player: "phaseZhunbeiBegin" }, 
                    forced: true, 
                    filter: function(event, player) { return game.countPlayer() > 0; }, 
                    content: function() {
                        "step 0"
                        var x = player.countCards('h', card => card.hasGaintag('sgz_xuanhe_shan')); 
                        var y = game.countPlayer();
                        var guanxing_num = Math.min(2 * x + y, 7); 
                        player.logSkill('sgz_changming'); 
                        
                        // === 核心修正：使用 processAI 的标准数组包装结构 ===
                        var next = player.chooseToGuanxing(guanxing_num);
                        next.set('processAI', function(list) {
                            var cards = list[0][1].slice(); // 获取观星牌原始数组
                            var top = [];
                            var bottom = [];
                            for (var i = 0; i < cards.length; i++) {
                                // 锦囊牌(trick)放顶，其他牌放底
                                if (get.type(cards[i], 'trick') == 'trick') {
                                    top.push(cards[i]);
                                } else {
                                    bottom.push(cards[i]);
                                }
                            }
                            // 返回格式必须为 [置于顶部的数组, 置于底部的数组]
                            return [bottom, top];
                        });
                    }, 
                }, 
                finish: { 
                    trigger: { player: "phaseJieshuBegin" }, 
                    forced: true, 
                    filter: function(event, player) { return game.countPlayer() > 0; }, 
                    content: function() {
                        "step 0"
                        var x = player.countCards('h', card => card.hasGaintag('sgz_xuanhe_shan')); 
                        var y = game.countPlayer();
                        var guanxing_num = Math.min(2 * x + y, 7); 
                        player.logSkill('sgz_changming'); 
                        // 结束阶段维持默认观星 AI (不设置 processAI)
                        player.chooseToGuanxing(guanxing_num);
                    }, 
                }, 
            } 
        },
        // === 4. 绮梦 (最终版：锁定技 + 强制转化 + Backup 逻辑) ===
        sgz_qimeng: {
            audio: "ext:大梦千秋/audio/sgz_huangyueying:4",
            persevereSkill: true,
            trigger: { player: "damageEnd" },
            filter: function(event, player) {
                return player.countCards("hes") > 0;
            },
            ai: {
                maixie: true,
                effect: {
                    target: function(card, player, target) {
                        // AI 卖血倾向：血量 >= 3 时，认为受到伤害有极高收益 [0, 4]
                        // 血量 < 3 时，返回默认评估，AI 会尽量躲避伤害
                        if (get.tag(card, 'damage') && target.hp >= 3) return [0, 3];
                    }
                }
            },
            content: function() {
                "step 0"
                game.playAudio('../extension/大梦千秋/audio/sgz_huangyueying/sgz_qimeng.mp3');
                
                player.chooseToUse({
                    viewAs: { name: "wuzhong" },
                    _backupevent: `sgz_qimeng_backup`,
                    prompt: '绮梦：是否将一张牌当作【无中生有】使用？',
                    openskilldialog: '将一张牌当作【无中生有】使用',
                    norestore: true, 
                    addCount: false,
                    // === 核心 AI 劫持：选牌前的优先级排序 ===
                    ai1: function(card) {
                        var player = _status.event.player;
                        var suit = get.suit(card);
                        
                        // 1. 血量 < 4 优先用红桃 (回血/加护甲收益最高)
                        if (player.hp < 4 && suit == 'heart') return 300;
                        // 2. 手牌 < 5 优先用黑桃 (抢牌收益高)
                        if (player.countCards('h') < 5 && suit == 'spade') return 280;
                        // 3. 方块 (稳定火杀)
                        if (suit == 'diamond') return 260;
                        // 4. 黑桃 (常规收益)
                        if (suit == 'spade') return 240;
                        // 5. 梅花 (梦闪收益)
                        if (suit == 'club') return 220;
                        // 6. 红桃 (常规收益)
                        if (suit == 'heart') return 200;
                        
                        // 兜底：其他牌按价值反向排序（优先用垃圾牌）
                        return 100 - get.value(card);
                    }
                }).backup(`sgz_qimeng_backup`);
            },
            subSkill: {
                backup: {
                    log: false,
                    filterCard: function(card) { return get.itemtype(card) == "card"; },
                    // 确保花色被继承，以便触发璇和的对应效果
                    viewAs: function(cards) {
                        return { name: "wuzhong", suit: get.suit(cards[0]) };
                    },
                    position: "hes",
                    sub: true,
                },
            },
        },
    },
    skillTranslate: {
        sgz_jiqiao: "集巧", 
        sgz_jiqiao_info: "锁定技，你的回合开始时，若你手牌中没有锦囊牌，你从牌堆中随机获得一张锦囊牌。",
        sgz_xuanhe: "璇和", 
        sgz_xuanhe_info: "锁定技，当你使用锦囊牌时摸一张牌，此牌不计入手牌上限。然后在锦囊牌生效前你按照所使用的锦囊牌花色执行对应效果:<br>♦️：视为对其使用一张无次数距离限制的火【杀】；<br>♥️：若你已受伤则回复一点体力，否则获得一点护甲；<br>♠️：选择一名其他角色获得其一张牌；<br>♣️：本回合出【杀】次数+1（不可叠加），获得一张无色【闪】，标记为“梦闪”，不计入手牌上限。",
        sgz_changming: "长明", 
        sgz_changming_info: "锁定技，准备阶段和结束阶段，你卜算2X+Y（X为“梦闪”数，Y为存活人数，至多卜算7）。",
        sgz_qimeng: "绮梦",
        sgz_qimeng_info: "锁定技，当你受到伤害后，若你有牌，你须将一张牌当做【无中生有】使用。",
        sgz_xuanhe_shan: "梦闪",
        sgz_xuanhe_tag: "不计上限", 
    },
    characterTaici:{
        "sgz_jiqiao":{order: 1,content:"尽觅心中良策，方解当下之围。/冥思一想，则有万千计来。"},
        "sgz_xuanhe":{order: 2,content:"折蟾宫之桂，造乞巧之机。/良辰星伴月，精械刃藏机。/晶莹剔透月，七窍玲珑心。/太阴采高桂，佳月集精华。"},
        "sgz_changming":{order: 3,content:"竹马嗅青梅，与君倦飞共白头。/情丝绕慧剑，清风难断有情人。"},
        "sgz_qimeng":{order: 4,content:"暗藏机扩，使敌措手不及。/集古今之智，晓天下之机。/才如泉涌，用之不竭。/以有穷之思，化无穷之变。"},
        "die":{content:"才略纵如泉涌，终有竭绝之日..."}
    }
};