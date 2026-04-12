export default {
    character: {
        wgxd_heyuxingzun: ['male', 'shen', 7, ['wgxd_jianzhen', 'wgxd_qixia', 'wgxd_jianyun','wgxd_heyuxingzun_texiao'], [
            "des:三界御剑第一尊。",
            "ext:大梦千秋/image/wgxd_heyuxingzun.jpg",
            "die:ext:大梦千秋/audio/die.mp3"
        ]],
    },
    characterName: 'wgxd_heyuxingzun',
    characterTranslate: {
        wgxd_heyuxingzun: '鹤羽星尊',
    },
    skills: {
        wgxd_jianzhen: {
            audio: "ext:大梦千秋/audio/wgxd_heyuxingzun:2",
            persevereSkill: true,
            trigger: {
                global: 'phaseBefore',
                player: 'enterGame',
            },
            filter(event, player) {
                return event.name != 'phase' || game.phaseNumber == 0;
            },
            firstDo: true,
            forced: true,
            content() {
                const cards = player.getCards('he').filter(i => get.type(i) == 'equip' && get.subtype(i) != 'equip1');
                if(cards.length) player.recast(cards);
                player.disableEquip('equip2');
                player.disableEquip('equip3');
                player.disableEquip('equip4');
                player.disableEquip('equip5');
                player.expandEquip(1);
                player.expandEquip(1);
                player.expandEquip(1);
                player.expandEquip(1);
                player.expandEquip(1);
                player.expandEquip(1);
            },
            group: ['wgxd_jianzhen_recast'],
            subSkill: {
                recast: {
                    audio: 'wgxd_jianzhen',
                    trigger: {
                        player: 'gainEnd',
                    },
                    forced: true,
                    filter(event, player) {
                        return event.cards?.some(i => get.type(i) == 'equip' && get.subtype(i) != 'equip1');
                    },
                    content() {
                        const cards = trigger.cards?.filter(i => get.type(i) == 'equip' && get.subtype(i) != 'equip1');
                        if(cards && cards.length) player.recast(cards);
                    },
                },
            },
        },
        wgxd_qixia: {
            audio: "ext:大梦千秋/audio/wgxd_heyuxingzun:5",
            persevereSkill: true,
            mark:true,
            marktext: "剑匣",
            intro:{
                name:"剑匣"
            },
            trigger: {
                global: 'phaseBefore',
                player: 'enterGame',
            },
            filter(event, player) {
                return (event.name != 'phase' || game.phaseNumber == 0) && player.countCards('h');
            },
            forced: true,
            async content(event, trigger, player) {
                const { result } = await player.chooseCard('h', true, `###启匣###将一张手牌加入“剑匣”`);
                if (result.cards && result.cards.length) {
                    player.addGaintag(result.cards, 'wgxd_qixia_jian');
                    player.addMark('wgxd_qixia', 1);
                }
            },
            mod: {
                cardUsable(card) {
                    if (card.cards && card.cards.some(i => i.hasGaintag('wgxd_qixia_jian'))) return Infinity;
                },
            },
            group: ['wgxd_qixia_lose', 'wgxd_qixia_damage'],
            subSkill: {
                lose: {
                    audio: "ext:大梦千秋/audio/wgxd_heyuxingzun:7",
                    trigger: {
                        player: 'loseBegin',
                    },
                    forced: true,
                    filter(event, player) {
                        return event.cards?.some(i => i.hasGaintag('wgxd_qixia_jian'));
                    },
                    content() {
                        player.draw(trigger.cards.filter(i => i.hasGaintag('wgxd_qixia_jian')).length).gaintag = ['wgxd_qixia_jian'];
                    },
                },
                damage: {
                    audio: 'wgxd_qixia',
                    trigger: {
                        player: 'damageAfter',
                    },
                    filter(event, player) {
                        return player.countCards('h', i => i.hasGaintag('wgxd_qixia_jian')) < 7 ;//&& player.countCards('h', i => !i.hasGaintag('wgxd_qixia_jian')) > 0
                    },
                    forced: true,
                    async content(event, trigger, player) {
                        // === 修改点 ===
                        player.loseMaxHp();
                        player.draw(1);
                        const { result } = await player.chooseCard('h', true, card => !card.hasGaintag('wgxd_qixia_jian'), `###启匣###将一张手牌标记为“剑”`);
                        if (result.cards && result.cards.length) {
                            player.addGaintag(result.cards, 'wgxd_qixia_jian');
                            player.addMark('wgxd_qixia', 1);
                        }
                    },
                },
            },
        },
        wgxd_jianyun: {
            audio: "ext:大梦千秋/audio/wgxd_heyuxingzun:3",
            persevereSkill: true,
            trigger: {
                target: 'useCardToTarget',
            },
            filter(event, player) {
                return get.tag(event.card, 'damage');
            },
            content() {
                'step 0';
                const cardPile = ['cardPile']
                    .map(pos => Array.from(ui[pos].childNodes))
                    .flat()
                    .filter(i => get.subtype(i) == 'equip1');
                if (cardPile.length) event.card = cardPile[0];
                else {
                    const discardPile = ['discardPile']
                        .map(pos => Array.from(ui[pos].childNodes))
                        .flat()
                        .filter(i => get.subtype(i) == 'equip1');
                    if (discardPile.length) event.card = discardPile[0];
                    else {
                        const cards = game.filterPlayer().reduce((i, j) => {
                            const c = j.getCards('e', i => get.subtype(i) == 'equip1');
                            if (c.length) i.addArray(c);
                            return i;
                        }, []);
                        if (cards.length) event.card = cards.randomGet();
                    }
                }
                if (event.card) {
                    player.gain(event.card, 'gain2');
                } else {
                    event.finish();
                }
                'step 1';
                if(player.getCards('he').includes(event.card)){
                    player.chooseToUse(event.card);
                }
            },
            mod: {
                ignoredHandcard(card, player) {
                    if (card.hasGaintag('wgxd_jianyun')) return true;
                },
                cardDiscardable(card, player, name) {
                    if (name == 'phaseDiscard' && card.hasGaintag('wgxd_jianyun')) return false;
                },
            },
            group: ['wgxd_jianyun_jian'],
            subSkill: {
                jian: {
                    audio: "ext:大梦千秋/audio/wgxd_heyuxingzun:3",
                    trigger: {
                        player: 'useCard2',
                    },
                    filter(event, player) {
                        return get.subtype(event.card) == 'equip1' && lib.translate[event.card.name] && lib.translate[event.card.name].includes('剑');
                    },
                    frequent: true,
                    content() {
                        player.gain(game.createCard('wanjian')).gaintag = ['wgxd_jianyun'];
                        player.insertPhase();
                    },
                },
            },
        },
//------删除--------//

/////////////////////////////////////////////////////////////////////////////
//
//      wgxd_hemeng: {
//        audio: 'ext:大梦千秋:3',// 
//        mod: {
//            maxHandcard(player, num) {
//                return 7;
//            },
//        },
//            trigger: {
//                player: 'gainBegin',
//            },
//            filter(event, player) {
//                const skills = [];
//                const sk = player.getSkills(null, true, true);
//               for (const s of sk) {
//                    skills.push(s);
//                    if (lib.skill[s] && lib.skill[s].group) {
//                        const p = Array.isArray(lib.skill[s].group) ? lib.skill[s].group : [lib.skill[s].group];
//                        skills.addArray(p);
//                    }
//                }
//                if (event.getParent().name == 'draw') {
//                    if (event.getParent(2).name == 'recast') {
//                        return false;
//                    } else if (skills.includes(event.getParent(2).name)) {
//						return false;
//					}
//                } else if (skills.includes(event.getParent().name)) {
//					return false;
//				}
//				return true;
//            },
//            forced: true,
//            content() {
//                player.draw(1);
//            },
//
//        },
//
/////////////////////////////////////////////////////////////////////////////////
        "wgxd_heyuxingzun_texiao": {
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
                    // 播放击杀/回合内死亡音效
                    game.playAudio(`../extension/大梦千秋/audio/wgxd_heyuxingzun/kill${[1,2,3].randomGet()}.mp3`)
                
            }
        },  
},
    skillTranslate: {
        wgxd_jianzhen: '剑阵',
        wgxd_jianzhen_info: '锁定技，①游戏开始时，你拥有7个武器栏，废除你的所有非武器装备栏。②当你获得非武器装备牌时立即重铸之。',
        // === 修改点: 将 "减1点" 改为 "减3点" ===
        wgxd_qixia: '启匣',
        wgxd_qixia_info: '锁定技，①游戏开始时，你在手牌里开辟出一个初始上限为1的区域。称之为“剑匣”，你将一张初始手牌加入“剑匣”。②当“剑匣”里的牌即将离开“剑匣”时立即摸等量的牌加入“剑匣”。③“剑匣”里的牌无次数限制。④当你受到伤害时，若“剑匣”的上限小于7，则你摸一张牌、“剑匣”上限+1，你选择一张手牌加入“剑匣”。',
        wgxd_qixia_jian: '剑',
        wgxd_jianyun: '剑陨',
        wgxd_jianyun_info: '①当你成为伤害性牌的目标时，你可以随机获得一张武器牌并立即使用之。②当你使用含“剑”字的牌时，你获得一张游戏外的无花色点数且不计入手牌上限的“万箭齐发”并在此回合结束后获得一个额外回合。',
        //wgxd_hemeng: '鹤梦',
        //wgxd_hemeng_info: '锁定技，当你不因你的技能效果获得牌时，你摸1张牌，你的手牌上限始终为7。',
    },
    characterTaici:{
        "wgxd_jianzhen": {order:1,content:"引星图之力，结万剑之阵。/尘寰万千，大道至简。"},
        "wgxd_qixia": {order:2,content:"灵界纷乱已止，星图浩劫将至。/为道之无涯，求无涯之道。/天枢立阁余千载，偶有琐事扰清修。/一剑一盏茶，半月半天星。/昆仑千百丈，晴空一鹤飞。"},
        "wgxd_jianyun": {order:3,content:"揽星听剑语，倚栏待鹤归。/天枢阁岂容尔等放肆！/天道又如何？可预自可逆。"},
        "die":{content:"重头...修炼而已..."},
    },
};