export default {
    character: {
        // === 修改点: 增加了一个隐藏的标记技能 ===
        shj_chaofeng: [
            "male", 
            "shen", 
            7, 
            ["shj_jingyue","shj_tingzong", "shj_lieying","shj_pini", "shj_weilin",], 
            [
                "des:嘲风，龙生九子之一，性好险，又好望，常立于殿台角上。其形威严，不仅象征着吉祥、美观和威严，而且还具有威慑妖魔、清除灾祸的含义，是祥瑞的象征。",
                "ext:大梦千秋/image/shj_chaofeng.jpg",
                "die:ext:大梦千秋/audio/shj_chaofeng/die.mp3"
            ]
        ],
    },
    characterName: 'shj_chaofeng',
    characterTranslate: {
        shj_chaofeng: "嘲风",
    },
skills: {
    // === 技能1: 【惊跃】(完全重写) ===

shj_jingyue: {
    // === 核心: 完全恢复您最初的稳定代码结构 ===
    audio: "ext:大梦千秋/audio/shj_chaofeng:5",
    persevereSkill: true,
    enable: ["chooseToUse", "chooseToRespond"],
    mod: {
        targetInRange: function (card, player, target) {
            if (_status.event.skill == 'shj_jingyue' && card.name == 'sha' && card.cards && card.cards.length > 0 && get.color(card.cards[0], player) == 'black') {
                return true;
            }
        },
    },
    viewAs(cards, player) {
        if (!cards.length) return null;
        var color = get.color(cards[0]);
        if (color == 'red') return { name: 'sha', nature: 'fire' };
        if (color == 'black') return { name: 'sha', nature: 'thunder' };
        return null;
    },
    filterCard(card, player, event) {
        var color = get.color(card);
        if (color == 'red') return true;
        if (color == 'black' && !player.storage.shj_jingyue_thunder_used) return true;
        return false;
    },
    position: "hes",
    selectCard: 1,
    filter(event, player) {
        if(player.countCards('hes', {color: 'red'}) && event.filterCard({name:'sha', nature:'fire'}, player, event)) return true;
        if(!player.storage.shj_jingyue_thunder_used && player.countCards('hes', {color: 'black'}) && event.filterCard({name:'sha', nature:'thunder'}, player, event)) return true;
        return false;
    },
    onuse(result, player) {

        // 以下是您提供的、可以正常工作的 onuse 逻辑
        player.draw();
        if (typeof player.storage.shj_jingyue_range_count !== 'number') {
            player.storage.shj_jingyue_range_count = 0;
        }
        player.storage.shj_jingyue_range_count++; // 距离-1的计数
        
        var color = get.color(result.cards[0]);
        if(color == 'black') {
            player.storage.shj_jingyue_thunder_used = true; // 雷杀限一次的标记
        }
    },
    ai: {
        respondSha: true,
        order: 4, 
        result: { player: 1 },
    },
    // group 关联所有子技能
    group: ["shj_jingyue_unlimited", "shj_jingyue_damage", "shj_jingyue_reset", "shj_jingyue_directhit", "shj_jingyue_gain_mark"],
    subSkill: {
        // 火杀不计次数
        unlimited: {
            trigger: { player: "useCard1" },
            forced: true,
            popup: false,
            filter: function(event, player) {
                if(event.skill == 'shj_jingyue' && event.card.name == 'sha' && event.cards && event.cards.length > 0) {
                    var color = get.color(event.cards[0], player);
                    return color == 'red'|| color == 'black';
                }
                return false;
            },
            content: function() {
                // 因为是火杀，所以也需要增加杀次数
                if (player.stat[player.stat.length - 1].card.sha > 0) {
                    player.stat[player.stat.length - 1].card.sha--;
                }
            }
        },
        // 雷杀伤害+1
        damage: {
            trigger: { source: "damageBegin1" },
            forced: true,
            popup: false,
            filter: function(event, player) {
                return event.parent.skill == 'shj_jingyue' && event.card && event.card.name == 'sha' && event.card.nature == 'thunder';
            },
            content: function() {
                trigger.num++;
            }
        },
        // 距离-X 的 mod
        range: {
            mod: {
                globalFrom: function(from, to, distance) {
                    return distance - (from.storage.shj_jingyue_range_count || 0);
                }
            }
        },
        // 回合开始时重置所有状态
        reset: {
            trigger: { player: "phaseBegin" },
            silent: true,
            forced: true,
            content: function() {
                player.storage.shj_jingyue_thunder_used = false;
                player.storage.shj_jingyue_range_count = 0;
                player.addTempSkill('shj_jingyue_range');
            }
        },
        // 雷杀不可响应
        directhit: {
            trigger: { player: "shaBegin" },
            forced: true,
            popup: false,
            filter: function(event, player) {
                return event.skill == 'shj_jingyue' && event.card.nature == 'thunder';
            },
            content: function() {
                trigger.directHit = true;
            }
        },
        // 【新增】造成伤害后的效果
        gain_mark: {
            trigger: { source: "damageEnd" },
            forced: true,
            filter: function(event, player) {
                return event.parent.skill == 'shj_jingyue';
            },
            content: function() {
                player.logSkill('shj_jingyue');
                player.recover();
                player.addMark('shj_jingyue', 1);
            }
        },
    },
    mark: true,
    marktext: "威",
    intro: {
        name: "威",
        content: "mark"
    }
},



    // === 技能2: 【霆踪】(完全重写) ===
shj_tingzong: {
    audio: "ext:大梦千秋/audio/shj_chaofeng:0",
    persevereSkill: true,
    forced: true,
    mod: {
        globalTo: function(from, to, distance) {
            // === 核心修正: 将变量名 "威count" 修改为纯英文的 "weiCount" ===
            var weiCount = to.countMark('shj_jingyue') || 0;
            var dist_add = Math.max(1, 7 - weiCount);
            return distance + dist_add;
        },
    },
},

    // === 技能3: 【裂影】(完全重写) ===
shj_lieying: {
    // === 核心: 这是一个“主动技”，只负责一件事：给自己添加buff ===
    audio: "ext:大梦千秋/audio/shj_chaofeng:3",
    persevereSkill: true,
    enable: "phaseUse",
    usable: 1,
    filter: function(event, player) {
        // 筛选条件：有“威”标记
        return player.countMark('shj_jingyue') > 0;
    },
    ai: {
        order: 9, // 在出杀之前发动
        result: {
            player: function(player) {
                if (player.hasCard(card => card.name == 'sha', 'hs') && game.hasPlayer(target => player.canUse('sha', target) && get.effect(target, {name:'sha'}, player, player) > 0)) {
                    return 1;
                }
                return 0;
            }
        }
    },
    content: function() {
        'step 0'
        var max_num = player.countMark('shj_jingyue');
        var choice_list = Array.from({length: max_num}, (_, i) => `${i + 1}枚`);
        player.chooseControl(choice_list).set('prompt', `裂影：请选择要消耗的“威”标记数量`).set('ai', () => choice_list.length - 1);
        'step 1'
        var num = result.index + 1;
        player.logSkill('shj_lieying');
        player.removeMark('shj_jingyue', num);
        
        // 【核心】给自己添加一个简单的、带标记的buff技能
        player.addSkill('shj_lieying_effect');
        // 并用 mark 记录可以额外指定的目标数
        player.addMark('shj_lieying_effect', num, false);
    },
    // === 核心: group 现在只关联一个子技能 ===
    group: "shj_lieying_effect",
    subSkill: {
        // === 核心: 这是一个简单的、带标记的buff技能，模仿 spcunsi2 ===
        effect: {
            charlotte: true, // 这是一个隐藏的技能
            // 当玩家失去这个技能时，清理掉标记
            onremove: function(player) {
                player.removeMark('shj_lieying_effect', player.countMark('shj_lieying_effect'), false);
            },
            mark: true,
            marktext: "影",
            intro: {
                name: "裂影",
                content: "你的下一张【杀】可以额外指定$个目标。"
            },
            // a. 使用 mod 来提前修改【杀】的属性
            mod: {
                selectTarget: function(card, player, range) {
                    if (card.name == 'sha' && player.countMark('shj_lieying_effect') > 0) {
                        var num_extra = player.countMark('shj_lieying_effect');
                        if (range[1] != -1) {
                            range[1] += num_extra;
                        }
                    }
                }
            },
            // b. 使用 trigger 在【杀】“使用后”移除自己
            trigger: { player: "useCardAfter" },
            forced: true,
            silent: true,
            popup: false,
            filter: function(event, player) {
                // 确保只在【杀】使用后触发
                return event.card.name == 'sha';
            },
            content: function() {
                // 用后即焚
                player.removeSkill('shj_lieying_effect');
            }
        }
    }
},

    // === 技能4: 【睥睨】(新增) ===
shj_pini: {
    audio: "ext:大梦千秋/audio/shj_chaofeng:5",
    trigger: { target: "useCardToTargeted" },
    // === 核心修改点: 这是一个强制触发的技能 ===
    // 摸牌的效果是强制的，后续获得标记是可选的
    forced: true,
    filter: function(event, player) {
        // 筛选条件：只在回合外生效
        return _status.currentPhase != player;
    },
    content: function() {
        'step 0'
        // 1. 强制摸一张牌
        player.draw();
        //'step 1'
        // 2. 弹出选择框，询问是否发动后续效果
        //player.chooseBool('睥睨：是否额外获得一个“威”标记？')
        //    .set('ai', () => true); // AI总是选择获得标记
        'step 1'
        player.logSkill('shj_pini');
        player.addMark('shj_jingyue', 1);
        
    }
},

    // === 技能5: 【威临】(觉醒技) ===
shj_weilin: {
    audio: "ext:大梦千秋/audio/shj_chaofeng:3",
    persevereSkill: true,
    awakenSkill: true,
    skillAnimation: true,
    animationColor: "thunder",
    derivation: ["shj_xianming", "shj_linxu", "shj_chiling"],
    trigger: { 
        source: "damageAfter", // 【惊跃】在这里增加标记
    },
    forced: true,
    silent: true,
    // 简单的filter，只检查两个条件：是否已觉醒，标记数是否达标
    filter: function(event, player) {
        return !player.storage.shj_weilin_awaken && player.countMark('shj_jingyue') >= 7;
    },
    content: function() {
        player.logSkill('shj_weilin');
        player.awakenSkill('shj_weilin');
        player.node.avatar.setBackgroundImage('extension/大梦千秋/image/shj_chaofeng2.jpg');
        player.addSkill(['shj_linxu', 'shj_chiling']);

    }
},

    // --- 衍生技能 ---

//----------------------------------------------------    
//
//    // === 技能1: 【先明】 ===
//  shj_xianming: {
//      audio: "ext:大梦千秋/audio/shj_chaofeng:3",
//      persevereSkill: true,
//        enable: "phaseUse",
//        filter: function(event, player) {
//            return player.countMark('shj_jingyue') > 0;
//        },
//        // === 核心修正: content 已完全重写为正确的“结束阶段”逻辑 ===
//        content: function() {
//                'step 0'
//            var num = player.countMark('shj_jingyue');
//           player.removeMark('shj_jingyue', num);
//            player.draw(num);
//            'step 1'
//            // 严格模仿【破袭】的实现方式
//            var evt = _status.event;
//            // 向上回溯事件链，寻找名为 "phaseUse" 的顶层事件
//            for (var i = 0; i < 10; i++) { // 向上查找10层，足以覆盖所有情况
//               if (evt && evt.getParent) {
//                    evt = evt.getParent();
//                } else {
//                    break; // 如果已经到顶层，则跳出
//                }
//                if (evt.name == "phaseUse") {
//                    // 为“出牌阶段”事件打上“已跳过”的标记
//                    evt.skipped = true;
//                  game.log(player, '结束了出牌阶段');
//                    break;
//                }
//           }
//        }
//    },
//
//----------------------------------------------------

// === 技能2: 【临虚】===
    shj_linxu: {
        audio: "ext:大梦千秋/audio/shj_chaofeng:4",
        persevereSkill: true,
        trigger: { player: "phaseZhunbeiBegin" },
        direct: true,
        content: function() {
            'step 0'
            var num = player.countMark('shj_jingyue');
            if (num > 0) {
                player.chooseTarget(`临虚：对至多${num}名角色各造成1点雷伤`, [1, num], true)
                .set('ai', target => -get.attitude(_status.event.player, target));
            } else {
                event.finish();
            }
            'step 1'
            if (result.bool && result.targets) {
                player.logSkill('shj_linxu', result.targets);
                event.targets = result.targets.sortBySeat();
                event.num = 0;
            } else {
                event.finish();
            }
            'step 2'
            if (event.num < event.targets.length) {
                var target = event.targets[event.num];
                target.damage('thunder');
                event.num++;
                event.redo();
            }
        }
    },

    // === 技能3: 【敕令】===
shj_chiling: {
    audio: "ext:大梦千秋/audio/shj_chaofeng:11",
    persevereSkill: true,
    trigger: { source: "damage" },
    forced: true,
    priority: -1,
    // === 核心修正: content 已完全重写为正确的“数据传递”逻辑 ===
    content: function() {
        'step 0'
        var target = trigger.player;
        // 1. 计算目标将要失去的体力上限值
        var diff = target.maxHp - target.hp;
        
        // 2. 【关键】将这个差值存入 event 对象，以便在下一步骤中使用
        event.diff_to_gain = diff;
        
        if (diff > 0) {
            player.logSkill('shj_chiling', target);
            game.log(target, '失去了', diff, '点体力上限');
            target.loseMaxHp(diff,true);
        } else {
            // 如果目标没有失去体力上限，则技能流程直接结束
            event.finish();
        }
        'step 1'
        // 3. 从 event 对象中取出我们之前保存好的值
        var amount_to_gain = event.diff_to_gain;
        
        if (amount_to_gain > 0) {
            game.log(player, '增加了', amount_to_gain, '点体力上限');
            player.gainMaxHp(amount_to_gain);
        }
    }
},

},

skillTranslate: {
    shj_jingyue: "惊跃",
    shj_jingyue_info: "持恒技，①你可以将一张：红色牌视为【火杀】使用或打出；黑色牌视为【雷杀】使用（每回合限一次，无距离限制，伤害+1且不可被响应）。②你每以此法使用一张牌：你摸一张牌，本回合内你的【杀】使用次数+1且攻击范围+1。③若你依此法造成伤害：你回复一点体力并获得一个“威”标记。",
    shj_tingzong: "霆踪",
    shj_tingzong_info: "持恒技，锁定技，其他角色与你计算距离+X（X为7-“威”标记数，且至少为1）。",
    shj_lieying: "裂影",
    shj_lieying_info: "持恒技，出牌阶段限一次，你可以消耗任意枚“威”标记，令你的下一张【杀】可以额外指定等量的目标。",
    shj_pini: "睥睨",
    shj_pini_info: "持恒技，锁定技，当你于回合外成为一张牌的目标后，你摸一张牌然后你可以获得一个“威”标记。",
    shj_weilin: "威临",
    shj_weilin_info: "持恒技，觉醒技，当你造成伤害后，若“威”标记数大于等于7，你获得技能【临虚】、【敕令】。",
    //shj_xianming: "先明",
    //shj_xianming_info: "持恒技，出牌阶段，你可以移除所有“威”标记，摸等量的牌，然后立即结束你的出牌阶段。",
    shj_linxu: "临虚",
    shj_linxu_info: "持恒技，准备阶段，你可以对至多等量于“威”标记数量的角色各造成一点雷电伤害。",
    shj_chiling: "敕令",
    shj_chiling_info: "持恒技，锁定技，当你对一名角色造成伤害后，立即其将其体力上限调整至与其当前体力值相同，然后你增加其以此法减少的体力上限。",
},
characterTaici:{
    "shj_jingyue":{order:1,content:"天雷地炎，淬为吾刃！/众生结愿，天佑人间！/诸事皆安，愿归星汉！/佑九州辽阔，前途无量！/承众愿，祈九天！"},
    "shj_lieying":{order:2,content:"如入，无人之地。/启来者之路，向天地万里，无尽遐征。/谁言六合有尽？我志四海无极。"},
    "shj_pini":{order:3,content:"预料之中。/痛苦会让恐惧离开身体。/无需代价。/血的滋味。/来日可追。"},
    "shj_weilin":{order:4,content:"踏遍九州，夫何索求？行此难路，志在后人。/偏安一隅，或可贪生百岁；破险登峰，方于天地立身。/游碧海，揽苍梧，朝濯吾刃，暮抵九重。"},
    "shj_linxu":{order:5,content:"山呼海啸！/藏锋守拙！/或跃在渊！/刀尖之舞！"},
    "shj_chiling":{order:6,content:"一往无前！/启程！/下临深壑！/终至！/上达列缺！/竞辽阔！/风雷同行！/破浮云！/朝夕千里！/越险阻！/平川如夷！"},
    "die":{content:"天...亮了..."}
    }
}
