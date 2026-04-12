export default {
    character: {
        wgxd_yinianshenmo: ["male", "shen", 6, ["wgxd_renling", "wgxd_fenjie", "wgxd_tianze"], [
            "des:一念成神，慈悯众生；一念成魔，覆灭万物。此为星域之端的至高法相，于生死轮转间定夺因果。", 
            "ext:大梦千秋/image/wgxd_yinianshenmo.jpg",
            "die:ext:大梦千秋/audio/wgxd_yinianshenmo/die/die.mp3"
        ]],
    },
    characterName: 'wgxd_yinianshenmo',
    characterTranslate: {
        wgxd_yinianshenmo: "一念神魔",
    },
    dynamicTranslate: {
        wgxd_yinianshenmo: function(player) {
            if (player.hasSkill('wgxd_hengyu')) return '一念神魔·神';
            if (player.hasSkill('wgxd_xuanbi')) return '一念神魔·魔';
            return '一念神魔';
        },
    },

    skills: {
        // --- 1. 初始形态逻辑 ---
        wgxd_renling: {
            audio: "ext:大梦千秋/audio/wgxd_yinianshenmo/ren:2",
            persevereSkill: true,
            forced: true,
            mark: true,
            marktext: "灵",
            intro: { name: "灵", content: "mark" },
            trigger: {
                source: "damageEnd",
                player: ["damageEnd", "phaseZhunbeiBegin"],
                global: "gameDrawBegin",
            },
            filter: (event, player) => (event.name === 'phaseZhunbei' || event.name === 'gameDraw' || (event.name === 'damage' && event.num > 0)),
            content: function() {
                "step 0"
                player.draw();
                "step 1"
                if (player.countMark('wgxd_renling') < 8) {
                    player.addMark('wgxd_renling', 1);
                }
            },
            mod: { maxHandcard: (player, num) => num + 1 }
        },
        wgxd_fenjie: {
            audio: "ext:大梦千秋/audio/wgxd_yinianshenmo/ren:3",
            persevereSkill: true,
            enable: "phaseUse",
            filterCard: (card) => ['red', 'black'].includes(get.color(card)),
            position: "h",
            viewAs: function(cards) {
                const color = get.color(cards[0]);
                if (color == 'red') return { name: 'huogong' };
                if (color == 'black') return { name: 'guohe' };
                return null;
            },
            onuse: function(result, player) {
                if (player.countMark('wgxd_renling') < 8) {
                    player.addMark('wgxd_renling', 1);
                }
            }
        },
        wgxd_tianze: {
            audio: "ext:大梦千秋/audio/wgxd_yinianshenmo/ren:2",
            persevereSkill: true,
            limited: true,
            enable: "phaseUse",
            // 衍生的技能列表（包含神、魔、觉醒）
            derivation: [ "wgxd_yinian", "wgxd_hengyu", "wgxd_shenluo",  "wgxd_xusheng", "wgxd_fenze", "wgxd_huamo","wgxd_mosha","wgxd_xuanbi", "wgxd_xinyuan", "wgxd_liuxing", "wgxd_rongshen"],
            filter: (event, player) => !player.storage.wgxd_tianze && player.countMark('wgxd_renling') >= 3,
            content: function() {
                'step 0'
                player.awakenSkill('wgxd_tianze');
                player.storage.wgxd_tianze = true;
                var num = player.countMark('wgxd_renling');
                event.num = num;
                player.removeMark('wgxd_renling', num);
                'step 1'
                player.chooseControl('神', '魔').set('prompt', '一念神魔：请选择进化的形态');
                'step 2'
                var choice = result.control;
                event.choice = choice;
                player.loseMaxHp(player.maxHp - event.num);
                //player.recover(player.maxHp - player.hp);
                player.draw(event.num);
                
                'step 3'
                player.removeSkill(['wgxd_renling', 'wgxd_fenjie']);
                // === 核心注入：无论选神还是魔，都获得觉醒技“一念”和追踪器 ===
                player.addSkill(['wgxd_yinian', 'wgxd_event_tracker']);

                if (event.choice == '神') {
                    player.node.avatar.setBackgroundImage('extension/大梦千秋/image/wgxd_yinianshenmo_shen.jpg');
                    player.addSkill(['wgxd_hengyu', 'wgxd_shenluo', 'wgxd_xusheng', 'wgxd_fenze', 'wgxd_huamo']);
                } else {
                    player.node.avatar.setBackgroundImage('extension/大梦千秋/image/wgxd_yinianshenmo_mo.jpg');
                    player.addSkill(['wgxd_mosha', 'wgxd_xuanbi', 'wgxd_xinyuan', 'wgxd_liuxing', 'wgxd_rongshen']);
                }
                player.update();
                player.addTempSkill('wgxd_transformed_lock', 'phaseAfter');
            }
        },
        // --- 一念觉醒技---
        wgxd_yinian: {
            audio: "ext:大梦千秋/audio/wgxd_yinianshenmo:2",
            awakenSkill: true,
            skillAnimation: true,
            animationColor: "key",
            silent: true,
            persevereSkill: true, 
            unique: true,
            trigger: { player: "phaseZhunbeiBegin" },
            forced: true,
            filter: function(event, player) {
                if (player.storage.wgxd_yinian_awakened) return false;
                
                // 判定全场存活角色
                var alivePlayers = game.filterPlayer(p => p.isAlive());
                return alivePlayers.every(p => {
                    // 满足“造成过伤害” OR “进入过濒死”
                    return p.storage.wgxd_ever_dealt_damage === true || p.storage.wgxd_ever_dying === true;
                });
            },
            content: function() {
                "step 0"                
                player.logSkill('wgxd_yinian');
                player.awakenSkill('wgxd_yinian');
                player.node.avatar.setBackgroundImage('extension/大梦千秋/image/wgxd_yinianshenmo_both.jpg');
                player.storage.wgxd_yinian_awakened = true;
                game.playAudio('../extension/大梦千秋/audio/wgxd_yinianshenmo/wgxd_yinian.mp3');
                game.log(player, '善恶有报，神魔同存！');

                // 1. 移除变身技
                player.removeSkill(['wgxd_huamo', 'wgxd_rongshen']);

                // 2. 获得全形态神魔技能
                player.addSkill([
                    'wgxd_hengyu', 'wgxd_shenluo', 'wgxd_xusheng', 'wgxd_fenze', // 神
                    'wgxd_xuanbi', 'wgxd_xinyuan', 'wgxd_liuxing', 'wgxd_mosha'  // 魔
                ]);
                        
                // 3. 变换最终立绘
                player.update();
            }
        },

        // === 因果追踪器：记录全场伤害与濒死状态 ===
        wgxd_event_tracker: {
            charlotte: true,
            trigger: { 
                global: ["dyingBegin", "damageAfter"] // 监听全场濒死与伤害造成
            },
            forced: true,
            silent: true,
            content: function() {
                if (trigger.name == 'dying') {
                    // 记录进入濒死
                    trigger.player.storage.wgxd_ever_dying = true;
                    game.log(trigger.player, '于生死边缘徘徊...');
                } else {
                    // 记录造成伤害 (trigger.player 在 damageSource 时机是伤害来源)
                    trigger.source.storage.wgxd_ever_dealt_damage = true;
                    game.log(trigger.source, '已沾染因果之血...');
                }
            }
        },

        // --- 2. 神形态技能 (祝融) ---
        wgxd_hengyu: {
            audio: "ext:大梦千秋/audio/wgxd_yinianshenmo/shen:4",
            persevereSkill: true,
            forced: true,
            mod: {
                // 核心修正：在使用卡牌前增加至多两个额外目标
                selectTarget: function(card, player, range) {
                    if (card.name == 'sha') range[1] += 2;
                },
                // 无距离限制
                targetInRange: function(card, player, target) {
                    if (card.name == 'sha') return true;
                },
                // 强制转为火焰伤害
                cardnature: function(card) {
                    if (card.name == 'sha') return 'fire';
                }
            },
            trigger: { source: "damageBegin1" },
            // 只有使用【杀】造成的伤害才+1
            filter: function(event) {
                return event.card && event.card.name == 'sha' && event.notLink();
            },
            content: function() {
                trigger.num++;
            }
        },
        wgxd_shenluo: {
            audio: "ext:大梦千秋/audio/wgxd_yinianshenmo/shen:3",
            persevereSkill: true,
            forced: true,
            trigger: { source: "damageEnd" },
            filter: function(event, player) {
                // 判定：造成火焰伤害，且受伤角色目前没有“神络”标记
                return event.nature == 'fire' && event.player.isIn() && !event.player.hasSkill('wgxd_shenluo_tag');
            },
            content: function() {
                "step 0"
                // 核心修复：受伤者是 trigger.player
                var target = trigger.player;
                player.logSkill('wgxd_shenluo', target);
                
                // 1. 双方各摸一张牌
                player.draw();
                target.draw();

                "step 1"
                var target = trigger.player;
                // 2. 建立标记逻辑：记录目标
                if (!player.storage.wgxd_shenluo_targets) {
                    player.storage.wgxd_shenluo_targets = [];
                }
                player.storage.wgxd_shenluo_targets.add(target);

                // 3. 赋予效果与视觉标记（有效期直到下个回合开始前）
                player.addTempSkill('wgxd_shenluo_effect', { player: 'phaseBegin' });
                target.addTempSkill('wgxd_shenluo_tag', { player: 'phaseBegin' });
                
                game.log(player, '为', target, '系上了“神络”，对其使用牌无距离和次数限制');
            }
        },
        // === 神络衍生：逻辑效果技能 ===
        wgxd_shenluo_effect: {
            charlotte: true,
            onremove: function(player) {
                delete player.storage.wgxd_shenluo_targets;
            },
            mod: {
                // 对标记的目标使用牌无距离限制
                targetInRange: function(card, player, target) {
                    if (player.storage.wgxd_shenluo_targets && player.storage.wgxd_shenluo_targets.contains(target)) {
                        return true;
                    }
                },
                // 对标记的目标使用牌无次数限制 (核心 mod: cardUsableTarget)
                cardUsableTarget: function(card, player, target) {
                    if (player.storage.wgxd_shenluo_targets && player.storage.wgxd_shenluo_targets.contains(target)) {
                        return true;
                    }
                }
            }
        },
        // === 神络衍生：UI 显示标记 ===
        wgxd_shenluo_tag: {
            charlotte: true,
            mark: true,
            marktext: "神络",
            intro: {
                name: "神络",
                content: "一念神魔对其使用牌无距离和次数限制。"
            }
        },
        wgxd_xusheng: {
            audio: "ext:大梦千秋/audio/wgxd_yinianshenmo/shen:2",
            persevereSkill: true,
            trigger: { source: "damageEnd" },
            forced: true,
            filter: (event, player) => event.nature == 'fire' && event.num > 0 && player.hp < player.maxHp,
            content: () => { player.recover(trigger.num) }
        },
        wgxd_fenze: {
            audio: "ext:大梦千秋/audio/wgxd_yinianshenmo/shen:2",
            persevereSkill: true,
            enable: "phaseUse", usable: 1,
            filterTarget: (card, player, target) => target != player,
            selectTarget: [1, Infinity],
            multitarget: true,
            content: function() {
                'step 0'
                event.targets = targets.sortBySeat();
                event.num = 0;
                event.round_num = game.roundNumber;
                'step 1'
                var target = event.targets[event.num];
                if (!target) { event.finish(); return; }
                event.target = target;
                var cards_to_give_num = Math.min(event.round_num, target.countCards('he'));
                if (cards_to_give_num > 0) {
                    target.chooseCard('he', `焚泽：请选择${get.cnNumber(cards_to_give_num)}张牌交给${get.translation(player)}`, cards_to_give_num, true);
                } else {
                    event.cards_given = []; event.goto(3);
                }
                'step 2'
                if (result.bool && result.cards) {
                    event.cards_given = result.cards;
                    player.gain(result.cards, target, 'give');
                } else { event.cards_given = []; }
                'step 3'
                var damage_to_deal = event.round_num - event.cards_given.length;
                if (damage_to_deal > 0) event.target.damage(player, damage_to_deal, 'fire');
                'step 4'
                event.num++;
                if (event.num < event.targets.length) event.goto(1);
            }
        },
        wgxd_huamo: {
            enable: "phaseUse",
            audio: "ext:大梦千秋/audio/wgxd_yinianshenmo/shen:1",
            persevereSkill: true,
            usable: 1,
            filterCard: { color: 'red' }, position: "he", selectCard: 1,
            prompt: "弃置一张红色牌，转换为“魔”形态",
            filter: (event, player) => !player.hasSkill('wgxd_transformed_lock'),
            content: function() {
                'step 0'
                game.log(player, '转换为', '【魔形态】');
                player.node.avatar.setBackgroundImage('extension/大梦千秋/image/wgxd_yinianshenmo_mo.jpg');
                player.removeSkill(['wgxd_hengyu', 'wgxd_xusheng', 'wgxd_fenze', 'wgxd_huamo', 'wgxd_shenluo']);
                player.addSkill(['wgxd_xuanbi', 'wgxd_xinyuan', 'wgxd_liuxing', 'wgxd_rongshen', 'wgxd_mosha']);
                player.update();
                player.addTempSkill('wgxd_transformed_lock', 'phaseAfter');
            }
        },

        // --- 3. 魔形态技能 ---
        wgxd_mosha: {
            audio: "ext:大梦千秋/audio/wgxd_yinianshenmo/mo:6",
            persevereSkill: true,
            trigger: { player: ["useCard", "respond"] },
            filter: function(event, player) {
                return event.card.name == "shan" || (event.name == "useCard" && event.card.name == "shandian");
            },
            async content(event, trigger, player) {
                // 判定逻辑实现
                const { result } = await player.judge(function(card) {
                    var suit = get.suit(card);
                    if (suit == "spade") {
                        if (get.number(card) > 1 && get.number(card) < 10) return 5;
                        return 4;
                    }
                    return (suit == "club") ? 2 : 0;
                });
                
                // 雷击效果由判定成功触发 (result.bool)
                if (result.bool) {
                    const { result: targetRes } = await player.chooseTarget("魔杀：选择一名角色受到2点雷电伤害", true).set('ai', t => get.damageEffect(t, player, player, "thunder"));
                    if (targetRes.bool) {
                        await targetRes.targets[0].damage(2, "thunder");
                    }
                }
            },
            ai: {
                useShan: true,
                effect: {
                    target_use(card, player, target) {
                        if (get.tag(card, "respondShan") || get.name(card) == "shandian") return [1, 1];
                    }
                }
            }
        },
        wgxd_xuanbi: {
            persevereSkill: true,
            audio: "ext:大梦千秋/audio/wgxd_yinianshenmo/mo:5",
            trigger: { target: "useCardToTargeted" },
            forced: true,
            filter: (event, player) => event.player != player,
            content: function() {
                var color = get.color(trigger.card);
                if (color == 'black') player.draw(2);
                else if (color == 'red') {
                    player.draw();
                    if (trigger.player.countCards('he') > 0) player.discardPlayerCard(trigger.player, 'he', true);
                }
            }
        },
        wgxd_xinyuan: {
            audio: "ext:大梦千秋/audio/wgxd_yinianshenmo/mo:4",
            persevereSkill: true,
            forced: true,
            mod: { maxHandcard: (player, num) => num + (2 * player.getCards('h', c => get.suit(c, false) == 'none').length) },
            trigger: { player: "damageBegin3" },
            filter: (event, player) => event.source && event.source.getAttackRange() !== 1,
            content: () => { trigger.num-- }
        },
        wgxd_liuxing: {
            persevereSkill: true,
            audio: "ext:大梦千秋/audio/wgxd_yinianshenmo/mo:7",
            trigger: { player: "useCardAfter" },
            forced: true,
            filter: (event, player) => _status.currentPhase == player && event.card && event.card.isCard == true && get.suit(event.card, false) != 'none',
            content: function() {
                "step 0"
                player.judge();
                "step 1"
                if (result.color == 'black') {
                    var card_to_gain = game.createCard({ name: trigger.card.name, suit: 'none', number: null });
                    player.gain(card_to_gain, 'gain2');
                }
            }
        },
        wgxd_rongshen: {
            audio: "ext:大梦千秋/audio/wgxd_yinianshenmo/mo:1",
            enable: "phaseUse", usable: 1,
            persevereSkill: true,
            position: "he", filterCard: { color: 'black' }, selectCard: 1,
            prompt: "弃置一张黑色牌，转换为“神”形态",
            filter: (event, player) => !player.hasSkill('wgxd_transformed_lock'),
            content: function() {
                'step 0'
                game.log(player, '转换为', '【神形态】');
                player.node.avatar.setBackgroundImage('extension/大梦千秋/image/wgxd_yinianshenmo_shen.jpg');
                player.removeSkill(['wgxd_xuanbi', 'wgxd_xinyuan', 'wgxd_liuxing', 'wgxd_rongshen', 'wgxd_mosha']);
                player.addSkill(['wgxd_hengyu', 'wgxd_xusheng', 'wgxd_fenze', 'wgxd_huamo', 'wgxd_shenluo']);
                player.update();
                player.addTempSkill('wgxd_transformed_lock', 'phaseAfter');
            }
        },
        wgxd_transformed_lock: { charlotte: true }
    },
    skillTranslate: {
        wgxd_renling: "人灵", wgxd_renling_info: "锁定技，①当你造成或受到伤害时、每轮开始时、你的回合开始时，你摸一张牌并获得一个“人灵”标记（至多为8）。②你的手牌上限+1。",
        wgxd_fenjie: "分劫", wgxd_fenjie_info: "出牌阶段，你可以将一张红/黑色手牌当【火攻】/【过河拆桥】使用并获得一个“灵”标记。",
        wgxd_tianze: "天择", wgxd_tianze_info: "限定技，变身技，出牌阶段，若你的“灵”标记数不小于3，你可以移去所有标记并变身为“神”形态或“魔”形态。你将体力上限调整为X并摸X张牌（X为移去的“灵”标记数）。",
        wgxd_yinian: "一念", wgxd_yinian_info: "觉醒技，变身技，准备阶段，若所有角色均进入过濒死状态，你融合神魔形态，失去“化魔”或“融神”，获得“神”形态与“魔”形态的所有非变身技。",
        wgxd_hengyu: "恒燠", wgxd_hengyu_info: "锁定技，①你手牌中的所有【杀】均视为火【杀】。②你使用【杀】可额外指定至多2个目标、伤害+1且无距离限制。",
        wgxd_shenluo: "神络", wgxd_shenluo_info: "锁定技，当你造成火焰伤害后，你与受伤角色各摸一张牌，然后你对其使用牌无距离次数限制直至其回合开始。",
        wgxd_xusheng: "煦生", wgxd_xusheng_info: "锁定技，你造成火焰伤害时回复等量的体力。",
        wgxd_fenze: "焚泽", wgxd_fenze_info: "出牌阶段限一次，令任意名其他角色各交给你X张牌（X为游戏轮数），然后其受到等同于少交牌数量的火焰伤害。",
        wgxd_huamo: "化魔", wgxd_huamo_info: "出牌阶段限一次，弃置一张红色牌，转换为“魔”形态。",
        wgxd_mosha: "魔杀", wgxd_mosha_info: "当你使用或打出【闪】、使用【闪电】时，你可以进行一次判定，若为黑色，你令一名角色受到2点雷电伤害。",
        wgxd_xuanbi: "玄壁", wgxd_xuanbi_info: "锁定技，当你成为其他角色牌的目标后：若此牌为红/黑色，你摸一张牌并弃置使用者一张牌/摸两张牌。",
        wgxd_xinyuan: "心渊", wgxd_xinyuan_info: "锁定技，①你的手牌上限+2X（X为你手牌中无花色点数牌的数量）。②当你即将受到伤害时，若伤害来源的攻击范围不为1，此伤害-1。",
        wgxd_liuxing: "流形", wgxd_liuxing_info: "锁定技，出牌阶段你使用有花色点数的牌后进行判定，若不为红色则你获得一张无花色点数的同名牌。",
        wgxd_rongshen: "融神", wgxd_rongshen_info: "出牌阶段限一次，弃置一张黑色牌，转换为“神”形态。",
    },
    characterTaici: {
        "wgxd_renling": { order: 1, content: "此天命也！/百炼之志，当我问鼎！" },
        "wgxd_fenjie": { order: 2, content: "击破宿命的无常！/越是没有武器，越要变得强大！/我与我剑斩黄泉！" },
        "wgxd_tianze": { order: 3, content: "光明神已陨落，现在由光明引领我！/看像我这样的凡人都怎么诛灭神魔！" },
        "wgxd_yinian": { order: 4, content: "心存一念，分明晦！/心存一念，分明晦！" },
        "wgxd_hengyu": { order: 5, content: "光明，始于先驱者。/我与我剑斩黄泉。/无数次在人世的焦土上祈望太阳。/天生吾族，岂可轻弃。" },
        "wgxd_shenluo": { order: 6, content: "正道重临此地，宵小禁行！/苍生未安，岂能长眠！/你的野心到此为止！" },
        "wgxd_xusheng": { order: 7, content: "照彻，苦难的世间。/去哪里寻找，救助此界的力量？" },
        "wgxd_fenze": { order: 8, content: "天地无心，日月重光！/化神为佑，沐临绝土！" },
        "wgxd_huamo": { order: 9, content: "此剑，当叛——诸神谢罪！" },
        "wgxd_mosha": { order: 10, content: "这里是，让我忘却野心的战场！/人间不值得！/忍锥心刺骨之痛，驭杀伐于深壑之下！/我，即是黑夜！/墨龙出渊，山河尽倾剑端！/森罗列阵，日月转轮！" },
        "wgxd_xuanbi": { order: 11, content: "不会为不存在的天命，去压低脊梁！/双面的刃，伤人又伤己。/龙潜九渊，天命在膺。河山倾倒，孤影独行！/天下权柄，纵染血亦应紧握！/无回渊终年幽暗，擅闯者有来无回！" },
        "wgxd_xinyuan": { order: 12, content: "恐怕需要九倍的破坏力，才能实现独一的执着。/夙愿未清，焉能安寝。/只有在梦里才会做梦。/愈涉尘泥，愈知黎民之苦。" },
        "wgxd_liuxing": { order: 13, content: "单纯为不想死而挥剑！/崩刃的剑依旧致命，锈蚀的盾屹立如初！/一无所有，至少能肆意如风！/越是光明普照，越是如影随形！/枯墨升云！/潜龙出渊，吞岳！/望龙庭！" },
        "wgxd_rongshen": { order: 14, content: "此剑，当斩——群魔授首！" },
        "die": { content: "何处是吾乡..." }
    },
};