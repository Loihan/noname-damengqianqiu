export default {
    character: {
        // 梦黄月英：神势力，4/6分布。技能组：集巧、璇和、长明、绮梦
        dmqc_huangyueying: ["female", "shen", "4/6", ["dmqc_jiqiao", "dmqc_xuanhe", "dmqc_changming", "dmqc_qimeng"], [
            "des:黄氏月英，沔阳名士承彦之女也。幼而敏慧，通奇门，晓机巧，常居草庐，潜心造化之术。<br>建安之末，月英于静夜忽生一梦，见将星陨于五丈原，蜀汉气数将尽，满朝志士皆成焦土。觉后惊悸，乃誓以一身机巧之学，逆转乾坤。其集天下之精金，运璇玑之妙理，制连弩、木牛，变幻无端，神鬼莫测。<br>月英更于隆中点燃一盏不灭之灯，以此火为引，导汉军于幽暗。自此，蜀师所至，铁甲森森，机关轰鸣，破秦岭天险如等闲。当孔明北伐之际，月英随军策应，魏人见其攻城军械，皆以为天工降世，无不望风而溃。及至大汉复兴，洛阳城内万灯齐耀，正如当年梦中之长明。其以一女子之智，开万世太平之基，史称“奇才国母”。",
            "ext:大梦千秋/image/dmqc_huangyueying.jpg",
            "die:ext:大梦千秋/audio/dmqc_huangyueying/die.mp3"
        ]],
    },
    characterName: 'dmqc_huangyueying',
    characterTitle: {
        dmqc_huangyueying: "明良千古",
    },
    characterTranslate: {
        dmqc_huangyueying: "梦黄月英",
    },
    skills: {
        // === 1. 集巧 (锁定技：回合开始摸锦囊) ===
        dmqc_jiqiao: { 
            audio: "ext:大梦千秋/audio/dmqc_huangyueying:2", 
            forced: true, 
            persevereSkill: true,
            trigger: { player: "phaseBegin" }, 
            filter(event, player) { return !player.countCards('h', { type: 'trick' }) }, 
            content: function () { 
                player.logSkill('dmqc_jiqiao'); 
                var card = get.cardPile(function (card) { return get.type(card) == 'trick' }); 
                if (card) { player.gain(card, 'gain2') } 
            } 
        },

        // === 2. 璇和 (锁定技：用锦囊摸标记牌并执行花色效果) ===
        dmqc_xuanhe: {
            // 修改点：音频现在直接随机触发，不再区分花色
            audio: "ext:大梦千秋/audio/dmqc_huangyueying:4",
            forced: true, 
            persevereSkill: true,
            trigger: { player: "useCard" }, 
            frequent: true,
            filter(event, player) { 
                if (get.type2(event.card) != 'trick') return false; 
                var suit = get.suit(event.card); 
                return ['heart', 'diamond', 'club', 'spade'].includes(suit); 
            },
            mod: {
                // 标记牌不计入手牌上限
                ignoredHandcard: function (card, player) { 
                    if (card.hasGaintag('dmqc_xuanhe_tag')) return true;
                }
            },
            content: function () {
                "step 0"; 
                player.draw(); 
                "step 1"; 
                if (result && result.length) {
                    var card_drawn = result[0];
                    player.addGaintag(card_drawn, 'dmqc_xuanhe_tag');
                }
                
                player.logSkill('dmqc_xuanhe'); 
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
                        player.gain(new_card, 'gain2').gaintag = ['dmqc_xuanhe_shan']; 
                        player.addTempSkill('dmqc_xuanhe_addsha'); 
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
        dmqc_changming: {
            audio: "ext:大梦千秋/audio/dmqc_huangyueying:2", 
            forced: true, 
            persevereSkill: true,
            group: ["dmqc_changming_prep", "dmqc_changming_finish"], 
            mod: { 
                ignoredHandcard: function (card, player) { if (card.hasGaintag('dmqc_xuanhe_shan')) return true }, 
                cardDiscardable: function (card, player, name) { if (name == 'phaseDiscard' && card.hasGaintag('dmqc_xuanhe_shan')) return false } 
            }, 
            subSkill: { 
                prep: { 
                    trigger: { player: "phaseZhunbeiBegin" }, 
                    forced: true, 
                    filter(event, player) { return game.countPlayer() > 0; }, 
                    async content(event, trigger, player) { 
                        var x = player.countCards('h', card => card.hasGaintag('dmqc_xuanhe_shan')); 
                        var y = game.countPlayer();
                        var guanxing_num = Math.min(2 * x + y, 7); 
                        player.logSkill('dmqc_changming'); 
                        await player.chooseToGuanxing(guanxing_num); 
                    }, 
                }, 
                finish: { 
                    trigger: { player: "phaseJieshuBegin" }, 
                    forced: true, 
                    filter(event, player) { return game.countPlayer() > 0; }, 
                    async content(event, trigger, player) { 
                        var x = player.countCards('h', card => card.hasGaintag('dmqc_xuanhe_shan')); 
                        var y = game.countPlayer();
                        var guanxing_num = Math.min(2 * x + y, 7); 
                        player.logSkill('dmqc_changming'); 
                        await player.chooseToGuanxing(guanxing_num); 
                    }, 
                }, 
            } 
        },

        // === 4. 绮梦 (最终版：锁定技 + 强制转化 + Backup 逻辑) ===
        dmqc_qimeng: {
            audio: "ext:大梦千秋/audio/dmqc_huangyueying:4",
            persevereSkill: true,
            forced:true,
            trigger: { player: "damageEnd" }, // 受到伤害后触发
            filter: function(event, player) {
                // 只要手牌或装备区有牌即可
                return player.countCards('hes') > 0;
            },
            async content(event, trigger, player) {

                // 调用范本中的标准 chooseToUse 模式
                await player.chooseToUse({
                    // 指定转化后要使用的牌
                    viewAs: { name: 'wuzhong' },
                    // 指定对应的备份技能（在 subSkill 中定义）
                    _backupevent: 'dmqc_qimeng_backup',
                    prompt: '奇梦：是否使用一张牌视为使用【无中生有】？',
                    // 禁用系统默认对话框，使用自定义提示
                    openskilldialog: '将一张牌当作【无中生有】使用',
                    // 不计入次数（虽然无中生有本就不计，但为了严谨加上）
                    addCount: false
                }).backup('dmqc_qimeng_backup'); 
                // .backup() 会将上面定义的逻辑与 subSkill 里的 backup 技能绑定
            },
            // === 子技能定义 ===
            subSkill: {
                // 备份技能：专门负责“选牌”阶段的合法性检查
                backup: {
                    // 记录：不显示技能名字弹出
                    log: false,
                    // 过滤：允许选择所有实体牌（手牌或装备）
                    filterCard: function(card, player) {
                        return true; 
                    },
                    // 位置：手牌和装备区
                    position: "hes",
                    // 视为：转换为无中生有
                    viewAs: { name: "wuzhong" },
                    // AI 选牌逻辑
                    check: function(card) {
                        return 7 - get.value(card);
                    },
                    sub: true,
                }
            }
        },
    },
    skillTranslate: {
        dmqc_jiqiao: "集巧", 
        dmqc_jiqiao_info: "持恒技，锁定技。你的回合开始时，若你手牌中没有锦囊牌，你从牌堆中随机获得一张锦囊牌。",
        dmqc_xuanhe: "璇和", 
        dmqc_xuanhe_info: "持恒技，锁定技。当你使用锦囊牌时摸一张牌，此牌不计入手牌上限。然后你按照所使用的锦囊牌花色执行对应效果:<br>♦️：选择一名角色视为对其使用一张无次数限制的火【杀】；<br>♥️：若你已受伤回复一点体力，否则获得一点护甲；<br>♠️：选择一名其他角色获得其一张牌；<br>♣️：本回合出【杀】次数+1（不可叠加），获得一张无色【闪】，标记为“梦闪”，不计入手牌上限。",
        dmqc_changming: "长明", 
        dmqc_changming_info: "持恒技，锁定技。准备阶段和结束阶段，你卜算2X+Y（X为“梦闪”数，Y为存活人数，至多卜算7）。",
        dmqc_qimeng: "绮梦",
        dmqc_qimeng_info: "持恒技，锁定技。当你受到伤害后，你须将一张牌当做【无中生有】使用。",
        dmqc_xuanhe_shan: "梦闪",
        dmqc_xuanhe_tag: "不计上限", 
    },
    characterTaici:{
        "dmqc_jiqiao":{order: 1,content:"尽觅心中良策，方解当下之围。/冥思一想，则有万千计来。"},
        "dmqc_xuanhe":{order: 2,content:"折蟾宫之桂，造乞巧之机。/良辰星伴月，精械刃藏机。/晶莹剔透月，七窍玲珑心。/太阴采高桂，佳月集精华。"},
        "dmqc_changming":{order: 3,content:"竹马嗅青梅，与君倦飞共白头。/情丝绕慧剑，清风难断有情人。"},
        "dmqc_qimeng":{order: 4,content:"暗藏机扩，使敌措手不及。/集古今之智，晓天下之机。/才如泉涌，用之不竭。/以有穷之思，化无穷之变。"},
        "die":{content:"才略纵如泉涌，终有竭绝之日..."}
    }
};