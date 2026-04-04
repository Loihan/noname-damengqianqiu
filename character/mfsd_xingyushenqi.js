export default {
    character: {
        mfsd_xingyushenqi: [
            "male",
            "shen",
            4,
            ["mfsd_shisu", "mfsd_yueqian", "mfsd_huanyu" ], 
            [
                "des:星域的守护者，神启的化身。",
            "ext:大梦千秋/image/mfsd_xingyushenqi.png",
            "die:ext:大梦千秋/audio/mfsd_xingyushenqi/die.mp3"
            ]
        ],
    },
    characterName: 'mfsd_xingyushenqi',
    characterTranslate: {
        mfsd_xingyushenqi: "星域神启",
    },
    skills: {
        // === 技能: 【时溯】 ===


        // === 1. 【时溯】及其子技能 (逻辑驱动核心) ===
        mfsd_shisu: {
            audio: "ext:大梦千秋/audio/mfsd_xingyushenqi:9",
            persevereSkill: true,
            mark: true,
            marktext: "时空镜",
            intro: {
                name: "时空镜",
                content: function(storage) {
                    if (!storage) return "暂无记录";
                    let str = "";
                    let total = 0;
                    for (let i in storage) {
                        if (storage[i] > 0) {
                            total += storage[i];
                            str += "【" + get.translation(i) + "】x" + storage[i] + "<br>";
                        }
                    }
                    return "总数：" + total + "<br>" + str;
                }
            },
            init: function(player) {
                if (!player.storage.mfsd_shisu) player.storage.mfsd_shisu = {};
            },
            enable: ["chooseToUse", "chooseToRespond"],
            filter: function(event, player) {
                let store = player.storage.mfsd_shisu;
                for (let i in store) {
                    if (store[i] > 0 && event.filterCard({ name: i }, player, event)) return true;
                }
                return false;
            },
            chooseButton: {
                dialog: function(event, player) {
                    let list = [];
                    let store = player.storage.mfsd_shisu;
                    for (let i in store) {
                        if (store[i] > 0 && event.filterCard({ name: i }, player, event)) {
                            list.push(["", "", i]);
                        }
                    }
                    return ui.create.dialog("时溯", [list, 'vcard']);
                },
                backup: function(links) {
                    return {
                        viewAs: { name: links[0][2] },
                        filterCard: () => false,
                        selectCard: -1,
                        sourceSkill: "mfsd_shisu",
                        onuse: function(result, player) {
                            let name = result.card.name;
                            player.storage.mfsd_shisu[name]--;
                            player.markSkill('mfsd_shisu');
                            game.playAudio(`../extension/大梦千秋/audio/mfsd_xingyushenqi/mfsd_shisu${[1,2,3,4,5,6,7,8,9].randomGet()}.mp3`);
                        }
                    }
                }
            },
            group: ["mfsd_shisu_record"],
            subSkill: {
                record: {
                    trigger: { global: ["useCard", "discard"] },
                    forced: true,
                    silent: true,
                    filter: function(event, player) {
                        // 屏蔽自己，防止无限递归
                        if (event.getParent().skill == "mfsd_shisu") return false;
                        return event.cards && event.cards.length;
                    },
                    content: function() {
                        "step 0"
                        let cards = trigger.cards || [trigger.card];
                        let store = player.storage.mfsd_shisu;
                        let changed = false;
                        for (let card of cards) {
                            if (!card || !card.name) continue;
                            let name = get.name(card, false);
                            if (!store[name]) store[name] = 0;
                            store[name]++;
                            changed = true;
                        }
                        if (changed) {
                            player.markSkill('mfsd_shisu');
                            // 1. 增加寰宇标记
                            player.addMark('mfsd_huanyu', cards.length);
                        }

                        "step 1"
                        // === 【核心重构：寰宇发奖逻辑】 ===
                        let total = player.countMark('mfsd_huanyu');
                        let targetLevel = Math.floor(total / 7); // 理论上应该获得的技能总数
                        
                        // 初始化历史记录数组（只记录“给过什么”，不看“现在有什么”）
                        if (!player.storage.mfsd_huanyu_history) {
                            player.storage.mfsd_huanyu_history = [];
                        }
                        
                        // 判定：如果 [理论等级] > [历史上给过的技能数]，且 [还没满9个]
                        if (targetLevel > player.storage.mfsd_huanyu_history.length && player.storage.mfsd_huanyu_history.length < 9) {
                            event.num_to_give = targetLevel - player.storage.mfsd_huanyu_history.length;
                        } else {
                            event.finish();
                        }

                        "step 2"
                        let pool = ['mfsd_chuangjie', 'mfsd_dunjie', 'mfsd_xingjie', 'mfsd_qiongjie', 'mfsd_panjie', 'mfsd_nuojie', 'mfsd_juejie', 'mfsd_bengjie', 'mfsd_huangjie'];
                        
                        // 过滤出历史上从未给过的技能
                        let available = pool.filter(s => !player.storage.mfsd_huanyu_history.contains(s));

                        if (available.length > 0 && event.num_to_give > 0) {
                            let skill = available.randomGet();
                            
                            // 1. 记入历史黑名单（确保不会重复发，也不会因为技能用掉而补发）
                            player.storage.mfsd_huanyu_history.push(skill);
                            
                            // 2. 赋予技能并奖励
                            player.addSkill(skill);
                            player.gainMaxHp();
                            player.recover();
                            game.playAudio(`../extension/大梦千秋/audio/mfsd_xingyushenqi/mfsd_huanyu${[1,2,3,4,5,6,7,8].randomGet()}.mp3`);
                            
                            player.logSkill('mfsd_huanyu');
                            game.log(player, '的“寰宇”等级提升，获得了技能', '#g【' + get.translation(skill) + '】');

                            // 3. 递减并循环，直到补齐等级差
                            event.num_to_give--;
                            if (event.num_to_give > 0) event.redo();
                        }
                    }
                }
            }
        },

        // === 2. 【寰宇】主技能 (仅作为标记容器和展示) ===
        mfsd_huanyu: {
            persevereSkill: true,
            audio:"ext:大梦千秋/audio/mfsd_xingyushenqi:8",
            mark: true,
            marktext: "寰宇",
            derivation: ['mfsd_chuangjie', 'mfsd_dunjie', 'mfsd_xingjie', 'mfsd_qiongjie', 'mfsd_panjie', 'mfsd_nuojie', 'mfsd_juejie', 'mfsd_bengjie', 'mfsd_huangjie'],
            intro: {
                name: "寰宇",
                content: "当前标记：$ <br>已解锁世界技能数：#"
            },
            // 使用 countMark('mfsd_huanyu_history') 来动态显示已获得的技能数
            init: function(player) {
                player.markSkill('mfsd_huanyu');
            }
        },

        // === 3. 【跃迁】技能 ===
        mfsd_yueqian: {
            audio: "ext:大梦千秋/audio/mfsd_xingyushenqi:3",
            persevereSkill: true,
            forced: true,
            trigger: { player: "dying" },
            priority: 5, 
            content: function() {
                player.loseMaxHp();
                player.recover(1 - player.hp);
            },
        },
// === 新增点: 九个全新的限定技 ===
// --- 1. 创界 ---
mfsd_chuangjie: {
    audio:"ext:大梦千秋/audio/mfsd_xingyushenqi:1",
    persevereSkill: true,
    enable: "phaseUse",
    limited: true,
    mark: false,
    skillAnimation: true,
    animationColor: 'thunder',
    content: function() {
        player.awakenSkill('mfsd_chuangjie');
        player.insertPhase();
    },
    intro: { content: 'limited' }
},
// --- 2. 盾界 ---
mfsd_dunjie: {
    audio:"ext:大梦千秋/audio/mfsd_xingyushenqi:1",
    persevereSkill: true,
    enable: "phaseUse",
    limited: true,
    mark: false,
    skillAnimation: true,
    animationColor: 'metal',
    content: function() {
        player.awakenSkill('mfsd_dunjie');
        player.addTempSkill('mfsd_dunjie_effect', {player:'phaseBegin'});
    },
    intro: { content: 'limited' },
    subSkill: {
        effect: {
            charlotte: true,
            trigger: { player: "damageBegin3" },
            forced: true,
            content: function() {
                if (trigger.num > 1) {
                    trigger.num = 1;
                } else {
                    trigger.num = 0;
                }
                game.playAudio(`../extension/大梦千秋/audio/mfsd_xingyushenqi/mfsd_xingyushenqi_zhicai-jianshang.mp3`)
            },
            mark: true,
            marktext: "减伤",
            intro: { name: "减伤", content: "盾界：受到的伤害至多为1，若不大于1则为0" }
        }
    }
},
// --- 3. 星界 ---
mfsd_xingjie: {
    audio:"ext:大梦千秋/audio/mfsd_xingyushenqi:1",
    persevereSkill: true,
    trigger: { player: "phaseDrawBegin" },
    limited: true,
    mark: false,
    skillAnimation: true,
    animationColor: 'water',
    direct: true,
    content: function() {
        'step 0'
        player.chooseBool(get.prompt('mfsd_xingjie'), '是否发动【星界】，跳过摸牌并从游戏外获得五张牌？').set('ai', () => true);
        'step 1'
        if (result.bool) {
            player.logSkill('mfsd_xingjie');
            player.awakenSkill('mfsd_xingjie');
            trigger.changeToZero(); // 跳过摸牌
            
            // 获取所有非装备、非延时的牌名列表
            var card_list = lib.inpile.filter(name => {
                var type = get.type(name);
                return type != 'equip' && type != 'delay';
            });
            // 弹出选择框，让玩家选择5次
            player.chooseButton(
                ['星界：请选择五张牌', [card_list, 'vcard']],
                5, // 必须选择5次
                true
            ).set('ai', button => Math.random());
        } else {
            event.finish();
        }
        'step 2'
        if (result.bool && result.links) {
            var cards_to_gain = [];
            for (var link of result.links) {
                cards_to_gain.push(game.createCard({name: link[2], suit: 'none', number: null}));
            }
            if (cards_to_gain.length) {
                player.gain(cards_to_gain, 'gain2');
            }
        }
    },
    intro: { content: 'limited' }
},
// --- 4. 穹界 ---
mfsd_qiongjie: {
    audio:"ext:大梦千秋/audio/mfsd_xingyushenqi:1",
    persevereSkill: true,
    enable: "phaseUse",
    limited: true,
    mark: false,
    skillAnimation: true,
    animationColor: 'wood',
    content: function() {
        player.awakenSkill('mfsd_qiongjie');
        player.addTempSkill('mfsd_qiongjie_effect', {player:'phaseBegin'});
    },
    intro: { content: 'limited' },
    subSkill: {
        // === 核心修正: 严格模仿【帷幕】的 mod 结构 ===
        effect: {
            charlotte: true,
            mod: {
                // targetEnabled 是正确的 mod
                targetEnabled: function(card, player, target) {
                    // 这个 mod 会对场上所有“指定目标”的事件进行检查
                    // player: 牌的使用者
                    // target: 牌的目标
                    
                    // 如果牌的目标，是那个拥有【穹界】buff的人，则返回false
                    if (target.hasSkill('mfsd_qiongjie_effect')) {
                        return false;
                    }
                }
            },
            mark: true,
            marktext: "无法选中",
            intro: { name: "无法选中", content: "穹界：不能成为牌的目标" }
        }
    }
},
// --- 5. 叛界 ---
mfsd_panjie: {
    audio:"ext:大梦千秋/audio/mfsd_xingyushenqi:1",
    persevereSkill: true,
    trigger: { player: "damageEnd" },
    limited: true,
   mark: false,
    skillAnimation: true,
    animationColor: 'soil',
    direct: true,
    filter: function(event, player) {
        return event.source && event.source.countCards('hej') > 0;
    },
    content: function() {
        'step 0'
        var target = trigger.source;
        player.chooseBool(get.prompt('mfsd_panjie', target), '是否发动【叛界】？').set('ai', () => get.attitude(player, target) < 0);
        'step 1'
        if (result.bool) {
            player.logSkill('mfsd_panjie', trigger.source);
            player.awakenSkill('mfsd_panjie');
            var cards = trigger.source.getCards('hej');
            if (cards.length) {
                game.cardsGotoSpecial(cards);
                game.log(trigger.source, '的', cards, '被移出了游戏');
            }
        } else {
            event.finish();
        }
        'step 2'
        player.recover(trigger.num);
    },
    intro: { content: 'limited' }
},
// --- 6. 诺界 ---
// === 1. 【诺界】主技能修正 ===
mfsd_nuojie: {
    audio:"ext:大梦千秋/audio/mfsd_xingyushenqi:1",
    persevereSkill: true,
    enable: "phaseUse",
    limited: true,
    mark: false,
    skillAnimation: true,
    animationColor: 'water',
    content: function() {
        player.awakenSkill('mfsd_nuojie');
        // a. 添加“阻止回复”的全局效果
        game.addGlobalSkill('mfsd_nuojie_effect');
        // b. 在 _status 中记录发动者
        if (!_status.mfsd_nuojie_effect) _status.mfsd_nuojie_effect = [];
        _status.mfsd_nuojie_effect.push(player);
        // c. 【核心】为自己添加一个临时的“清理扳机”，有效期到下个回合开始
        player.addTempSkill('mfsd_nuojie_cleanup', {player:'phaseBegin'});
        player.addTempSkill('mfsd_nuojie_buff', {player:'phaseBegin'});
    },
    intro: { name: "制裁", content: "诺界：阻止其他角色的回复" }
},

// === 2. 【诺界效果】技能修正 ===
// 我们需要移除它内部错误的 cleanup 子技能
mfsd_nuojie_effect: {
    charlotte: true,
    trigger: { global: "recoverBefore" },
    forced: true,
    silent: true,
    priority: Infinity,
    filter: function(event, player) {
        if (!_status.mfsd_nuojie_effect || !_status.mfsd_nuojie_effect.length) return false;
        // 正在回血的人(player)，不能是【诺界】的发动者之一
        return !_status.mfsd_nuojie_effect.includes(player);
    },
    content: function() {
        game.log('【诺界】生效，', trigger.player, '的回复无效');
        game.playAudio(`../extension/大梦千秋/audio/mfsd_xingyushenqi/mfsd_xingyushenqi_zhicai-jianshang.mp3`)
        trigger.cancel();
    },
    // 【核心】移除了错误的 group 和 subSkill
},
mfsd_nuojie_buff: {
    mark: true,
    marktext: "制裁",
    intro: { name: "制裁", content: "诺界：阻止其他角色的回复" },
    onremove: true,
    charlotte: true,
},
// === 3. 【新增】全新的、独立的“清理扳机”技能 ===
mfsd_nuojie_cleanup: {

    charlotte: true, // 这是一个隐藏技能
    // 【核心】当这个临时技能因为到期而被移除时，onremove 会被自动调用
    onremove: function() {
        // 清理 _status 中的记录
        if (_status.mfsd_nuojie_effect) {
            delete _status.mfsd_nuojie_effect;
        }
        // 移除全局效果技能
        game.removeGlobalSkill('mfsd_nuojie_effect');
        game.log('【诺界】的效果已结束');
    }
},
// --- 7. 绝界 ---
mfsd_juejie: {
    audio:"ext:大梦千秋/audio/mfsd_xingyushenqi:1",
    persevereSkill: true,
    enable: "phaseUse",
    limited: true,
    mark: false,
    skillAnimation: true,
    animationColor: 'thunder',
    filterTarget: function(card, player, target) {
        // 可以选择任何人，包括自己
        return true;
    },
    selectTarget: [1, Infinity], 
    multitarget: true,
    content: function() {
        'step 0'
        player.awakenSkill('mfsd_juejie');
        event.targets = targets.sortBySeat();
        event.num = 0;
        'step 1'
        if (event.num < event.targets.length) {
            var target = event.targets[event.num];
            event.currentTarget = target;
            target.turnOver();
        } else {
            event.finish();
        }
        'step 2'
        var target = event.currentTarget;
        if (target.countCards('h') > target.hp) {
            target.chooseToDiscard('h', target.countCards('h') - target.hp, true);
        }
        'step 3'
        event.num++;
        event.goto(1);
    },
    intro: { content: 'limited' }
},
// --- 8. 崩界 ---
mfsd_bengjie: {
    audio:"ext:大梦千秋/audio/mfsd_xingyushenqi:1",
    persevereSkill: true,
    enable: "phaseUse",
    limited: true,
    mark: false,
    skillAnimation: true,
    animationColor: 'soil',
    filterTarget: true,
    content: function() {
        player.awakenSkill('mfsd_bengjie');
        target.die();
    },
    ai: {
        order: 10,
        result: {
            target: -10, // 对敌人的收益极高
        }
    },
    intro: { content: 'limited' }
},
// --- 9. 谎界 ---
// === 1. 【谎界】主技能修正 ===
mfsd_huangjie: {
    audio:"ext:大梦千秋/audio/mfsd_xingyushenqi:1",
    persevereSkill: true,
    enable: "phaseUse",
    limited: true,
    mark: false,
    skillAnimation: true,
    animationColor: 'metal',
    content: function() {
        player.awakenSkill('mfsd_huangjie');
        // a. 为自己添加“无次数距离限制”的buff，它会在回合结束后自动消失
        player.addTempSkill('mfsd_huangjie_player_buff', 'phaseAfter');
        // b. 添加“转化卡牌”的全局效果
        game.addGlobalSkill('mfsd_huangjie_global_effect');
        // c. 为自己添加“回合结束时清理”的扳机，它也会自动消失
        player.addTempSkill('mfsd_huangjie_cleanup', 'phaseAfter');
    },
    intro: { content: 'limited' }
},

// === 2. 【谎界】效果技能重构 ===
// a. 拆分出只对发动者生效的buff
mfsd_huangjie_player_buff: {
    charlotte: true,
    onremove: true,
    mark: true,
    marktext: "无限",
    intro: { name: "无限", content: "谎界：本回合使用牌无次数和距离限制" },
    mod: {
        cardUsable: () => Infinity,
        targetInRange: () => true,
    }
},
// b. 全局效果技能，现在只负责转化卡牌和显示UI
mfsd_huangjie_global_effect: {
    charlotte: true,
    mod: {
        cardname: function(card, player) {
            if (get.position(card) == 'h' && ['shan', 'jiu', 'tao'].includes(card.name)) {
                return 'sha';
            }
        }
    },
    // 为所有角色添加一个可视化的buff标记
    trigger: { global: "phaseBegin" },
    forced: true,
    silent: true,
    content: function() {
        trigger.player.addTempSkill('mfsd_huangjie_global_buff', 'phaseAfter');
    }
},
// c. 用于UI显示的全局buff技能
mfsd_huangjie_global_buff: {
    charlotte: true,
    mark: true,
    marktext: "转化",
    intro: { name: "转化", content: "谎界：手牌中的【闪】、【酒】和【桃】均视为【杀】" }
},

// === 3. 【新增】专门负责清理的扳机技能 ===
mfsd_huangjie_cleanup: {
    charlotte: true,
    trigger: { player: "phaseEnd" }, // 在发动者的回合结束时触发
    forced: true,
    silent: true,
    popup: false,
    content: function() {
        // 只做一件事：移除全局效果
        game.removeGlobalSkill('mfsd_huangjie_global_effect');
    }
},
        "mfsd_xingyushenqi_texiao": {
            charlotte: true, // 隐藏技能
            forced: true,
            silent: true,
            trigger: {
                global: "dieAfter",            // 监听全场死亡
            },
            filter: function(event, player) {
                // 1. 击杀逻辑：如果是击杀（source是自己）或者是在自己的回合内有人死亡
                if (event.name == 'die') {
                    return event.source == player || _status.currentPhase == player;
                }
                return false;
            },
            content: function() {
                "step 0"
                if (trigger.name == 'die') {
                    // 播放击杀/回合内死亡音效
                    game.playAudio(`../extension/大梦千秋/audio/mfsd_xingyushenqi/mfsd_kill${[1,2,3].randomGet()}.mp3`)
                } 
            }
        },  


    },
skillTranslate: {
    mfsd_shisu: "时溯",
    mfsd_shisu_info: "持恒技，锁定技，①每当有牌被使用或弃置时，你在“时空镜”中记录其牌名数量+1。<br>②当你需要使用或打出牌时，若“时空镜”中有对应的记录，你可以消耗对应的记录，视为使用或打出此牌。",
    mfsd_huanyu: "寰宇",
    mfsd_huanyu_info: "持恒技，锁定技，①记录“寰宇”标记为“时空镜”历史最大数量。<br>②每当“寰宇”的数量大于一个新的7的倍数时，：你增加1点体力上限并回复1点体力，然后若还有你未获得的“世界”技能，你从“世界”技能池中随机获得1个未拥有的技能。<br>世界技能池：<br>【创界】，【盾界】，【星界】，【穹界】，【叛界】，【诺界】，【绝界】，【崩界】，【谎界】。",
    mfsd_yueqian: "跃迁",
    mfsd_yueqian_info: "持恒技，锁定技，当你进入濒死状态时，减少一点体力上限回复体力至1点。",
    
    // --- 限定技翻译 ---
    mfsd_chuangjie: "创界", mfsd_chuangjie_info: "限定技，持恒技，出牌阶段，你可以令你在本回合结束后获得一个额外的回合。",
    mfsd_dunjie: "盾界", mfsd_dunjie_info: "限定技，持恒技，出牌阶段，你可以令直到你的下个回合开始之前，你受到的伤害若大于1则改为1，若不大于1则改为0。",
    mfsd_xingjie: "星界", mfsd_xingjie_info: "限定技，持恒技，摸牌阶段，你可改为从游戏外获得指定的任意五张不同的牌（无花色点数）。",
    mfsd_qiongjie: "穹界", mfsd_qiongjie_info: "限定技，持恒技，出牌阶段，你可以令你直到下个回合开始之前，不能成为牌的目标。",
    mfsd_panjie: "叛界", mfsd_panjie_info: "限定技，持恒技，当你受到伤害后，若伤害来源有牌，你可以令此伤害结算后，伤害来源区域内的所有牌移出游戏，然后你回复等同于此次伤害点数的体力。",
    mfsd_nuojie: "诺界", mfsd_nuojie_info: "限定技，持恒技，出牌阶段，你可以令直到你的下个回合开始之前，所有角色的回复体力效果无效。",
    mfsd_juejie: "绝界", mfsd_juejie_info: "限定技，持恒技，出牌阶段，你可以令任意名角色翻面，然后若其手牌数大于体力值，其须将手牌弃置至与体力值相等。",
    mfsd_bengjie: "崩界", mfsd_bengjie_info: "限定技，持恒技，出牌阶段，你可以指定一名角色，其立即死亡。",
    mfsd_huangjie: "谎界", mfsd_huangjie_info: "限定技，持恒技，出牌阶段，你可以令本回合内使用牌无次数和距离限制，所有角色的手牌中的【闪】、【酒】和【桃】均视为【杀】。",
    },
characterTaici: {
    "mfsd_shisu": {order:1,content:"一览寰宇！/去观察去触碰！/溯回时间！/超越永恒！/识过去见未来！/引力奇点！/魔法变量！/向真理致敬！/和这个世界说再见吧！"},
    "mfsd_yueqian": {order:2,content:"也许创造与毁灭，本就在构成更大的循环。/生命自身，就是种循环。/我总能回到正确的起点，不是吗？"},
    "mfsd_huanyu": {order:3,content:"第260天，观测塔发现未知星体。/已知是有限的，未知才是无限的。/宇宙引领我们，向高处看。/能够丈量宇宙的人，身没尘土，魂归天穹。/第365天观测显示，星体相撞的可能性极大。/时空镜，向我展示诸世界的变迁。/第584天，找到通往未知的路。/他们说，过分的执着会带来毁灭"},
    "mfsd_chuangjie": {order:4,content:"有人在由神所创的宇宙里，争论中心位置的星体。"},
    "mfsd_dunjie": {order:5,content:"有人在形似盾牌的时空，谈论众神之父和万物的源起。"},
    "mfsd_xingjie": {order:6,content:"有人给我讲了一个，关于井底观星士的故事。"},
    "mfsd_qiongjie": {order:7,content:"有的世界，人们自苍穹之上的船舶驶达彼岸。"},
    "mfsd_panjie": {order:8,content:"有的世界被痛苦包笼，只能靠抛弃过去向前走。"},
    "mfsd_nuojie": {order:9,content:"有的世界，人们不再彼此相信和承诺。"},
    "mfsd_juejie": {order:10,content:"有的世界，人们苦于没有船只，去探索苍穹上的大海。"},
    "mfsd_bengjie": {order:11,content:"有的世界被未知的力量，崩裂成碎片。"},
    "mfsd_huangjie": {order:12,content:"有的世界，人们只愿意相信谎言。"},
    "die":{content:"带我去...我存在的世界！"}
}
};