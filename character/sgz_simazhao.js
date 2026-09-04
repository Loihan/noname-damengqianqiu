// 【拗纬】万象影光特效已抽离至 effect/sgz_simazhao.js
import { woweiUI } from '../effect/sgz_simazhao.js';

export default {
    character: {
        sgz_simazhao: {
            sex: "male",
            group: "jin",
            hp: 5,
            maxHp: 5,
            skills: ["sgz_wowei", "sgz_wowei_ui","sgz_maiyao", "sgz_xietian","sgz_yazhou","sgz_futao"],
            img: "extension/大梦千秋/image/sgz_simazhao.jpg",
            dieAudios: ["ext:大梦千秋/audio/sgz_simazhao/die.mp3"],
            names: "司马|昭",
            groupInGuozhan: "wei",
            4: ["des:文王之志，斡维乾坤。天下大势，皆在我司马昭之心。"]
        },
    },
    characterName: 'sgz_simazhao',
    characterTranslate: {
        sgz_simazhao: "梦司马昭",
    },
    skills: {
        // === 1. 斡维  ===
        sgz_wowei: {
            audio: "ext:大梦千秋/audio/sgz_simazhao:9",
            persevereSkill: true,
            priority: 20, 
            group: [
                "sgz_wowei_xsha",     // 负责转换杀
                "sgz_wowei_setup",    // 负责开局强制加牌
                "sgz_wowei_cancel",   // 负责拦截他人使用
                "sgz_wowei_mod",      // 负责手牌属性锁定
                "sgz_wowei_fake",     // 负责虚空牌转换
                "sgz_wowei_draw"      // 负责使用后摸3
            ],
            subSkill: {
                xsha: {
                    // 支持出牌阶段使用和被动响应
                    enable: ["chooseToUse", "chooseToRespond"],
                    filterCard: function(card, player) {
                        return card.name == 'binglinchengxiax';
                    },
                    viewAs:{
                        name: "sha" ,
                    },
                    position:"hs",
                    // 核心4：让系统在没闪没杀时也能弹出此技能
                    filter: function(event, player) {
                        return player.countCards('hs', 'binglinchengxiax') > 0;
                    },
                    prompt: "将一张【兵临城下】当做【杀】使用或打出",
                    check: function(card) { return 1; },
                    content: function() {
                        var player = _status.event.player; 
                        if(!player.hasSkill('sgz_tunyue'))game.playAudio(`../extension/大梦千秋/audio/sgz_simazhao/sgz_wowei${[1,2].randomGet()}.mp3`);
                        else game.playAudio(`../extension/大梦千秋/audio/sgz_simazhao/sgz_wowei${[3,4].randomGet()}.mp3`);
                    },
                    ai: {
                        respondSha: true,
                        // 告知 AI：我有这些牌，可以用来响应
                        skillTagFilter: function(player, tag) {
                            if (tag == 'respondSha') {
                                return player.countCards('hs', 'binglinchengxiax') > 0;
                            }
                        },
                        order: 15,
                        result: { player: 1 }
                    }
                },
                setup: {
                    trigger: { global: "gameStart" },
                    forced: true,
                    content: function() {
                        "step 0"
                        var num = 8;
                        //var num = game.countPlayer();
                        var cards = [];
                        for (var i = 0; i < num; i++) {
                            cards.push(game.createCard('binglinchengxiax'));
                        }
                        game.cardsGotoPile(cards);
                        game.log(player, '将' + num + '张【兵临城下】注入了牌堆');
                        "step 1"
                        game.broadcastAll(function() { lib.inpile.add('binglinchengxiax'); });
                    }
                },
                draw: {
                    trigger: { player: "useCard" },
                    forced: true,
                    filter: function(event, player) {
                        return event.card.name == 'binglinchengxiax';
                    },
                    content: function() {
                        player.draw(3);
                        if(!player.hasSkill('sgz_tunyue'))game.playAudio(`../extension/大梦千秋/audio/sgz_simazhao/sgz_wowei${[1,2].randomGet()}.mp3`);
                        else game.playAudio(`../extension/大梦千秋/audio/sgz_simazhao/sgz_wowei${[5,6,7,8,9,10,11,12,13].randomGet()}.mp3`);
                        game.log(player, '筹谋得当，因使用【兵临城下】摸了四张牌');
                    }
                },
                cancel: {
                    trigger: { global: "useCard" },
                    direct: true, // 关键：跳过“是否发动斡维”的第一层询问
                    // 这里不加 forced: true，改为询问玩家，符合“你可以”的描述
                    filter: function(event, player) {
                        return event.card.name == 'binglinchengxiax' && event.player != player;
                    },
                    async content(event, trigger, player) {
                        // 询问司马昭是否拦截
                        const res = await player.chooseBool('斡维：是否令 ' + get.translation(trigger.player) + ' 使用的【兵临城下】失效？').set('ai', () => true).forResult();
                        if (res.bool) {
                            player.logSkill('sgz_wowei_cancel', trigger.player);
                            if(!player.hasSkill('sgz_tunyue'))game.playAudio(`../extension/大梦千秋/audio/sgz_simazhao/sgz_wowei${[1,2].randomGet()}.mp3`);
                            else game.playAudio(`../extension/大梦千秋/audio/sgz_simazhao/sgz_wowei${[3,4].randomGet()}.mp3`);
                            // 令卡牌结算取消
                            trigger.finish(); 
                            game.log(player, '令', trigger.player, '使用的【兵临城下】失去了效果');
                            // 选择一张手牌加入“斡旋”
                            if (player.countCards('h')) {
                                const res_card = await player.chooseCard('h', true, '斡维：选择一张手牌加入“斡旋”').forResult();
                                if (res_card.bool) {
                                    var card = res_card.cards[0];
                                    game.cardsGotoSpecial([card]);
                                    await player.directgains(game.createFakeCards([card]), null, 'sgz_wowei_tag');
                                    game.log(player, '将', card, '封入了虚空斡旋中');
                                    if (lib.skill.sgz_wowei_ui && lib.skill.sgz_wowei_ui.content) {
                                        lib.skill.sgz_wowei_ui.content.call(player);
                                    }
                                }
                            }
                        }
                    }
                },
                mod: {
                    mod: {
                        // 1. 虚空牌不计上限
                        ignoredHandcard: function(card, player) {
                            if (card.hasGaintag && card.hasGaintag('sgz_wowei_tag')) return true;
                        },
                        // 2. 绝对锁定：不可被他人获得或弃置（因为位置处于虚空）
                        cardGainable: function(card, player) {
                            if (card.hasGaintag && card.hasGaintag('sgz_wowei_tag')) return false;
                        },
                        cardDiscardable: function(card, player) {
                            if (card.hasGaintag && card.hasGaintag('sgz_wowei_tag')) return false;
                        }
                    }
                },
                // 响应使用时的卡牌替换逻辑（确保打出的是真牌）
                fake: {
                    trigger: { player: "useCardBefore" },
                    forced: true,
                    priority: 20,
                    filter: function(event, player) {
                        return event.card.hasGaintag && event.card.hasGaintag('sgz_wowei_tag');
                    },
                    content: function() {
                        // 找到对应的真实卡牌（从特殊区取回）
                        var realCard = ui.special.querySelector('[data-id="' + trigger.card._cardid + '"]');
                        if (realCard) {
                            trigger.card = realCard;
                            trigger.cards = [realCard];
                        }
                    }
                }
            }
        },
        // === 司马昭专属：【拗纬】万象影光究极醒目版特效（实现见 effect/sgz_simazhao.js） ===
        sgz_wowei_ui: woweiUI,
        // === 2. 埋曜 ===
        sgz_maiyao: {
            audio: "ext:大梦千秋/audio/sgz_simazhao:8",
            persevereSkill: true,
            group:"sgz_maiyao_xiaoguo",
            subSkill: {
                xiaoguo:{
                    persevereSkill: true,
                    // 1. 复刻模板触发时机：包含展示技能和使用技能
                    trigger: { global: ["useSkill", "logSkillBegin"] },
                    forced: true,
                    // 2. 复刻模板过滤器
                    filter: function(event, player) {
                        if (event.player == player) return false; // 仅限其他角色
                        if (["global", "equip"].includes(event.type)) return false;
                        
                        let skill = get.sourceSkillFor(event);
                        if (!skill || skill === "sgz_maiyao") return false;
                        
                        let info = get.info(skill);
                        if (!info || info.charlotte || info.equipSkill) return false;
                        
                        // 核心逻辑：每回合每个技能限一次
                        return !player.getStorage("maiyao_used").includes(skill);
                    },
                    async content(event, trigger, player) {
                        if(!player.hasSkill('sgz_tunyue'))game.playAudio(`../extension/大梦千秋/audio/sgz_simazhao/sgz_maiyao${[1,2,3,4].randomGet()}.mp3`);
                        else game.playAudio(`../extension/大梦千秋/audio/sgz_simazhao/sgz_maiyao${[5,6,7,8].randomGet()}.mp3`);
                        // 3. 复刻模板的重置逻辑（改为 phaseAfter 即每回合重置）
                        if (!player.storage.maiyao_used) {
                            player.when({ global: "phaseAfter" }).assign({
                                firstDo: true,
                            }).then(() => delete player.storage.maiyao_used);
                        }

                        // 4. 记录当前触发的技能名
                        let skill = get.sourceSkillFor(trigger);
                        player.markAuto("maiyao_used", skill);
                        player.logSkill('sgz_maiyao', trigger.player);

                        // 5. 执行原有效果
                        // A. 偷一张牌
                        if (trigger.player.countCards('he')) {
                            await player.gainPlayerCard(trigger.player, 'he', true);
                        }
                        // B. 回复两点
                        await player.recover(2);

                        // C. 寻找兵临城下
                        var card = get.cardPile2('binglinchengxiax') || get.discardPile('binglinchengxiax');
                        if (card) {
                            game.cardsGotoSpecial([card]);
                            var fake = game.createFakeCards([card])[0];
                            await player.directgains([fake], null, 'sgz_wowei_tag');
                            // 【核心修复】：手动强制运行 UI 渲染逻辑，不走 useSkill 编译器
                            if (lib.skill.sgz_wowei_ui && lib.skill.sgz_wowei_ui.content) {
                                lib.skill.sgz_wowei_ui.content.call(player);
                            }
                            //若没有兵临城下且场上没有futao标记
                        } else  if (!game.hasPlayer(current => current.hasSkill('sgz_futao_mark'))){
                            // D. 彻底枯竭触发
                            player.insertPhase();
                            player.addSkill('sgz_maiyao_mark');
                            player.addMark('sgz_maiyao_mark', 1);
                        }
                    },
                },
            },
            ai: { threaten: 6 }
        },
            sgz_maiyao_mark: {
                charlotte: true, // 彻底隐藏技能，仅显示标记
                mark: true,
                marktext: "回合",
                intro: {
                    name: "额外回合",
                    content: "因埋曜获得#个额外回合", // 自动显示标记数量
                },
                // 逻辑：每当任何回合（包括额外回合）开始时，消耗一个标记
                trigger: { player: "phaseBeginStart" },
                forced: true,
                silent: true,
                content: function() {
                    player.removeMark('sgz_maiyao_mark', 1);
                    // 如果标记扣完了，自动移除逻辑技能，保持面板干净
                    if (player.countMark('sgz_maiyao_mark') <= 0) {
                        player.removeSkill('sgz_maiyao_mark');
                    }
                }
            },
        // === 3. 挟天  ===
        sgz_xietian: {
            audio: "ext:大梦千秋/audio/sgz_simazhao:7",
            persevereSkill: true,
            forced:true,
            group:["sgz_xietian_qipai","sgz_xietian_biaoji"],
            subSkill:{
                // 效果①：弃置额外手牌
                qipai:{
                    persevereSkill: true,
                    forced:true,
                    trigger: { player: "phaseUseBegin" },
                    filter: function(event, player) {
                        if (event.name == 'phaseUse') return player.countCards('h') > player.hp;
                    },
                    async content(event, trigger, player) {
                        game.playAudio(`../extension/大梦千秋/audio/sgz_simazhao/sgz_xietian${[1,2,3].randomGet()}.mp3`);
                        var num = player.countCards('h') - player.hp;
                        if (num > 0) {
                            player.chooseToDiscard('h', num, true).set('prompt', '【挟天】：手牌数不能超过体力值，请弃置' + num + '张牌');
                        }
                    }
                },
                // 效果②：受损时点名
                biaoji:{
                    forced:true,
                    persevereSkill: true,
                    trigger: { player: "damageEnd" },
                    async content(event, trigger, player) {
                        game.playAudio(`../extension/大梦千秋/audio/sgz_simazhao/sgz_xietian${[4,5,6,7].randomGet()}.mp3`);
                        // 1. 选择一名没有标记的其他人
                        if(game.countPlayer(p => !p.hasSkill('sgz_xietian_mark') && p != player) > 0){
                            const res = await player.chooseTarget('挟天：请选择一名角色获得标记', (card, player, target) => {
                                return !target.hasSkill('sgz_xietian_mark') && target != player;
                            }, true).set('ai', t => -get.attitude(player, t)).forResult();

                            if (res.bool && res.targets.length) {
                                res.targets[0].addSkill('sgz_xietian_mark');
                            }
                        }

                        // 2. 所有有标记的人依次受损并给牌
                        var marked = game.filterPlayer(p => p.hasSkill('sgz_xietian_mark')).sortBySeat();
                        for (let target of marked) {
                            player.logSkill('sgz_xietian', target);
                            await target.damage("nosource", "nocard");
                            if (target.countCards('he')) {
                                await player.gainPlayerCard(target, 'he', true);
                            }
                        }

                        // 3. 选择一张手牌加入“斡旋”
                        if (player.countCards('h')) {
                            const res_card = await player.chooseCard('h', true, '挟天：选择一张手牌加入“斡旋”').forResult();
                            if (res_card.bool) {
                                var card = res_card.cards[0];
                                game.cardsGotoSpecial([card]);
                                await player.directgains(game.createFakeCards([card]), null, 'sgz_wowei_tag');
                                game.log(player, '将', card, '封入了虚空斡旋中');
                                if (lib.skill.sgz_wowei_ui && lib.skill.sgz_wowei_ui.content) {
                                    lib.skill.sgz_wowei_ui.content.call(player);
                                }
                            }
                        }
                    }
                },
                // 标记内容
                mark: {
                    charlotte: true,
                    mark: true,
                    marktext: "挟天",
                    intro: { name: "挟天", content: "每当司马昭受到伤害，你受到1点伤害并交给其一张牌。" }
                }
            },
        },
        // === 4. 压昼 (限定技) ===
        sgz_yazhou: {
            audio: "ext:大梦千秋/audio/sgz_simazhao:2",
            persevereSkill: true,
            enable: "phaseUse",
            limited: true,
            skillAnimation: true,
            animationColor: "fire",
            filter: function(event, player) {
                return !player.storage.sgz_yazhou;
            },
            async content(event, trigger, player) {
                player.awakenSkill('sgz_yazhou');
                player.loseMaxHp(1);
                var currentMax = player.maxHp-1;
                var damage = player.maxHp - player.hp-1;
                game.log(player, '燃尽昼光，将全场体力上限压制为', currentMax);

                // 2. 调整所有其他角色
                var others = game.filterPlayer(p => p != player);
                for (let target of others) {
                    var diff = target.maxHp - currentMax;
                    if (diff > 0) {
                        target.loseMaxHp(diff);
                        // 每减少一点受到一点伤害
                        target.damage(damage);
                        game.log(target, '受到【压昼】影响，上限减少了', diff, '点并受到', damage, '点伤害');
                    } else if (diff < 0) {
                        // 如果对方上限比司马昭还低，也要调整到相同（增加上限）
                        target.gainMaxHp(-diff);
                        target.chooseToDiscard('h', -diff, true).set('prompt', '压昼：请选择'+-diff+'张'+'手牌弃置');
                    }
                }
            },
            ai: {
                order: 1,
                result: {
                    player: function(player) {
                        // 敌人上限总和远高于司马昭时发动
                        var enemyMax = 0;
                        game.countPlayer(p => {
                            if (get.attitude(player, p) < 0) enemyMax += (p.maxHp - player.maxHp + 1);
                        });
                        return enemyMax > 3 ? 1 : 0;
                    }
                }
            }
        },
        // === 5. 覆焘    
        sgz_futao: {
            audio: "ext:大梦千秋/audio/sgz_simazhao:3",
            derivation:"sgz_tunyue",
            persevereSkill: true,
            limited: true, 
            forced: true,
            silent: true,
            skillAnimation: true,
            animationColor: "thunder",
            trigger: { player: "phaseZhunbeiBegin" },
            filter: function(event, player) {
                if (player.storage.sgz_futao) return false;
                var card = get.cardPile2('binglinchengxiax') || get.discardPile('binglinchengxiax');
                return !card;
            },
            async content(event, trigger, player) {
                // 1. 废除判定区
                player.disableJudge()

                // 2. 选择目标
                const res = await player.chooseTarget('覆焘：请选择一名角色获得“焘”标记', (card, player, target) => {
                    return target != player;
                }, true).set('ai', t => -get.attitude(player, t)).forResult();

                if (res && res.bool && res.targets && res.targets.length) {
                    player.node.avatar.setBackgroundImage('extension/大梦千秋/image/sgz_simazhao2.jpg');
                    const target = res.targets[0];
                    player.awakenSkill('sgz_futao'); // 技能变灰
                    
                    // A. 给目标标记（仅用于视觉显示）
                    target.addSkill('sgz_futao_mark');
                    
                    // B. 给自己赋予核心战斗技能“吞月”
                    // 这个技能负责：强中、加伤、死后重置
                    player.addSkill('sgz_tunyue');
                    
                    // C. 建立关联引用，确保逻辑精准
                    player.storage.sgz_futao_target = target;
                    
                    player.logSkill('sgz_futao', target);
                    game.log(player, '发动了【覆焘】，锁定了', target);
                }
            }
        },
            // === 标记显示 ===
            sgz_futao_mark: {
                charlotte: true,
                mark: true,
                marktext: "覆焘",
                intro: {
                    name: "覆焘",
                    content: "被司马昭锁定。其对你使用的【杀】不可被响应且伤害+1。"
                }
            },
        // === 衍生技：吞月  ===
        sgz_tunyue: {
            persevereSkill: true,
            trigger: { 
                player: "useCardToTargeted", // 强中触发点
                source: "damageBegin1",
                global: ["dieAfter"]          // 刷新触发点
            },
            priority:10,
            forced: true,
            filter: function(event, player) {
                // 逻辑1：对标记目标出杀 (强中判定)
                if (event.name == 'useCardToTargeted') {
                    return event.card.name == 'sha' && event.target === player.storage.sgz_futao_target;
                }
                // 逻辑2：对标记目标造成伤害 (加伤判定)
                if (event.name == 'damage') {
                    // 只有是【杀】造成的伤害，且目标是被标记的人
                    return event.card && event.card.name == 'sha' && event.player === player.storage.sgz_futao_target;
                }
                // 逻辑3：标记目标死亡 (刷新判定)
                if (event.name == 'die') {
                    return event.player === player.storage.sgz_futao_target;
                }
                return false;
            },
            content: function() {
                if (trigger.name == 'useCardToTargeted') {
                    // --- 实现强中 (100% 直伤) ---
                    player.logSkill('sgz_tunyue', trigger.target);
                    trigger.getParent().directHit.push(trigger.target);
                } 
                else if (trigger.name == 'damage') {
                    // --- 实现加伤 (100% 伤害+1) ---
                    // 此时 trigger 是伤害事件，直接修改 num 属性
                    trigger.num++;
                    game.log(player, '【吞月】对锁定目标造成的伤害+1');
                }
                else if (trigger.name == 'die') {
                    // --- 实现刷新逻辑 ---
                    player.restoreSkill('sgz_futao');
                    player.restoreSkill('sgz_yazhou');
                    player.removeSkill('sgz_tunyue');
                    player.node.avatar.setBackgroundImage('extension/大梦千秋/image/sgz_simazhao.jpg');
                    if (trigger.player) trigger.player.removeSkill('sgz_futao_mark');
                    delete player.storage.sgz_futao_target;
                    game.log(player, '锁定目标已亡，【吞月】归寂，【覆焘】【压昼】感应天机重新亮起');
                }
            },
            ai: {
                directHit_ai: true,
                fireAttack: true
            }
        },
    },
    skillTranslate: {
        sgz_wowei: "斡维",
        sgz_wowei_info:"①游戏开始时，你将8张【兵临城下】加入游戏，你在手牌区开辟一个“<span style='color:#CC00FF;'>斡旋</span>”区域，该区域内的牌不计入手牌数与手牌上限，无法被查看、获得、弃置、展示和选中。②当一名其他角色使用【兵临城下】时，你可以令此牌无效并将一张手牌加入“<span style='color:#CC00FF;'>斡旋</span>”。③你使用【兵临城下】后摸3张牌。④你可以将一张【兵临城下】当【杀】使用或打出。",
        sgz_maiyao: "埋曜",
        sgz_maiyao_info:"每回合每个技能限一次，当其他角色使用技能时，你获得其1张牌并回复2点体力，然后若：<br>①牌堆或弃牌堆中有【兵临城下】:你从牌堆和弃牌堆中获得一张【兵临城下】加入“<span style='color:#CC00FF;'>斡旋</span>”；<br>②牌堆或弃牌堆中没有【兵临城下】且场上没有“覆焘”标记：你获得一个额外的回合。",
        sgz_xietian:"挟天",
        sgz_xietian_info:"锁定技，①当你受到伤害时，你令一名没有“挟天”标记的其他角色获得一个挟天标记，然后所有有“挟天”标记的角色依次受到你造成的1点伤害并令你获得其1张牌，所有执行结束后你选择一张手牌加入“<span style='color:#CC00FF;'>斡旋</span>”。②出牌阶段开始时，若你的手牌数大于体力值，你须弃置多余的手牌。",
        sgz_wowei_tag: "斡旋",
        sgz_yazhou:"压昼",
        sgz_yazhou_info:"限定技，出牌阶段，你可以减少一点体力上限并调整所有角色体力上限与你相同，减少/增加了体力上限的角色受到你已损失体力值点伤害/弃置增加量张牌。",
        sgz_futao: "覆焘",
        sgz_futao_info:"限定技，锁定技，准备阶段，若牌堆和弃牌堆中没有【兵临城下】，你废除判定区，选择一名其他角色获得“覆焘”标记，并获得技能“吞月”。",
        sgz_tunyue:"吞月",
        sgz_tunyue_info:"锁定技，你对“覆焘”角色使用的【杀】伤害+1且不可被响应。当“覆焘”角色死亡时，“覆焘”和“压昼”视为未发动过。",
    },
    characterTaici:{
        sgz_wowei:{order:1,content:"吾心忠明，陛下尽可放心。/吾之心意？自是辅国庇朝。/陛下一国之君，不可使以小性。/讲经宴筵，实非治国之道也。/汝等仍存异心，可见心存魏阙。/城破之日，定诛此逆贼三族！/吾今大权独揽，何可再予他人！/未想逆贼区区，竟然好物甚巨。/徒生逆心，未有其力，破之易如反掌！/哼！斩首示众，以儆效尤！/哼，求存者多，未见求死者也！/司马氏江山，自不容怀异之徒！/上者慑敌以威，灭敌以势！"},
        sgz_maiyao:{order:2,content:"满朝尽忠天子，何有不臣之人？/众将平乱所获，皆为陛下所赐！/统摄朝野，威加海内，此皆陛下恩德！/九辞封赐，足见臣一片忠心。/吾领三军于外，岂容陛下收政于京！/陛下有罪，吾当治之以对天下！/既得众将之力，何愁贼不得平？/天下名为曹姓，实归吾司马一族！"},
        sgz_xietian:{order:3,content:"蜀贼吴寇未灭，臣未可受此殊荣。/辅国臣之本分，何敢图于禄勋。/天下未定，吾当辞邑修身，何敢冒僭？/臣请陛下亲讨乱贼，以昭帝威！/陛下宜暂临戎，使将士得凭天威。/烈祖明皇帝乘舆仍出，陛下何妨效之？/天子亲征，淮南之乱，不日可平！"},
        sgz_yazhou:{order:4,content:"逆贼起兵作乱，诸位无心报国乎？/平叛淮南，吾司马氏当再立不世之功！"},
        sgz_futao:{order:5,content:"若得灭蜀之功，何不可受禅为帝！/已极人臣之贵，当一尝人主之威！/破蜀平乱江山定，重整河山天下清！"},
        die:{content:"曹髦小儿竟有如此肝胆...我实不甘！"},
    }
}