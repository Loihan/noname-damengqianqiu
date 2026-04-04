export default {
    character: {
        shj_baize: [
            "male", 
            "shen", 
            4, 
            ["shj_zhaorui", "shj_tuna", "shj_baizhao","shj_pixie", "shj_lingyou", "shj_dongxu"], 
            [
                "des:【列传诗】<br>&nbsp&nbsp&nbsp&nbsp周游山海录万妖，图成一部镇九霄。<br>&nbsp&nbsp&nbsp&nbsp福瑞昭彰魑魅散，洞虚一念定尘嚣。<br>【武将传记】<br>&nbsp&nbsp&nbsp&nbsp传闻昆仑之上有神兽，其名白泽。生而言语，身负圣德，能通万物之情状，能晓天下之鬼神。黄帝治世，东巡狩于海滨，得此神兽。帝问之，白泽遂将天地间精怪奇物之事，凡一万一千五百二十种，尽皆言明。帝大悦，命人图写其形，昭示天下，是为《白泽图》。自此，世人皆以白泽为祥瑞之兆，其出则圣王在位，天下安宁。<br>&nbsp&nbsp&nbsp&nbsp白泽的行迹，便是一部流动的山海经。它的脚步不为征伐，不为权谋，只为穷尽天地间的未知，将所见所闻悉数纳于图中。世间每一次风云变幻，每一次英雄与枭雄的碰撞，于它而言，皆是丰富图卷的笔墨。当它将知识化为力量，凡是被其洞悉之物，便再也无法遵循常理对其造成束缚。<br>&nbsp&nbsp&nbsp&nbsp祥瑞之气随其行而聚，当时机成熟，便可化为诛邪的雷霆，或是平息纷争的秩序。待到《白泽图》终告完满，天地万物再无隐秘可言，它便能勘破虚妄，以万物之名，行使镇压灾厄的最终权能，令一切魑魅魍魉，皆归于虚无。<br>【技能契合】<br>&nbsp&nbsp&nbsp&nbsp昭瑞: 此乃白泽作为瑞兽的本源神性。它的存在本身（准备阶段）或与世界的任何交互（造成或受到伤害），都会自然而然地推动其“书神鬼之事”的使命（明策），并积累福泽（祥瑞标记）。而百邪不侵的天性，使其能预知并规避灾祸（免疫延时锦囊）。<br>&nbsp&nbsp&nbsp&nbsp图纳: 象征着白泽为补完《白泽图》而进行的主动寻访与收录。它会放弃寻常的机遇（摸牌阶段），转而有目标地探索未知领域（指定并获得未记录的牌）。每一次成功的收录，都让它的认知更加完整，自身也因此变得更为强大（增加体力上限并回复体力）。<br>&nbsp&nbsp&nbsp&nbsp白沼: 体现了知识即是力量的法则。一旦某事物被记录于《白泽图》中，白泽便洞悉了其全部本质，故能超脱凡俗规则（无次数与距离限制）来运用它。同理，任何以其已知方式发起的挑战，都无法伤及它分毫，反而会成为它成长的资粮（成为目标时回复体力或增加体力上限）。<br>&nbsp&nbsp&nbsp&nbsp辟邪: 这是白泽履行其“驱邪除祟”职责的直接体现。它将积累的祥瑞之气，根据阴阳之理（标记数的奇偶）转化为两种截然不同的神力：或以阳刚的煌煌天威（雷电伤害）直接诛灭妖邪，或以阴柔的法则之力（翻面并弃牌）将其镇压，使其回归沉寂。<br>&nbsp&nbsp&nbsp&nbsp灵佑: 当祥瑞汇聚至巅峰时，白泽可将其化为对天地的巨大恩泽。这象征着一场功德圆满后的甘霖普降，将积攒的福报一次性释放，为自身带来无穷的可能性与新生（移除标记并摸大量牌）。<br>&nbsp&nbsp&nbsp&nbsp洞虚/镇厄: 这是白泽完成使命、功德圆满的最终形态。当《白泽图》完成，洞悉万物之后，它便迎来了觉醒。求知阶段的“明策”升华为功成后的“律成”，象征着它从寻求知识变为知识的化身。同时，它获得了最终的权能【镇厄】，能够以绝对的法则，将它所认定的“灾厄”从世间彻底抹除（立即死亡），实现“百厄除尽，万象更新”的至高理想。",
                "ext:大梦千秋/image/shj_baize.jpg",
                "die:ext:大梦千秋/audio/shj_baize/die.mp3"
            ]
        ],
    },
    characterName: 'shj_baize',
    characterTranslate: {
        shj_baize: "白泽",
    },
    skills: {
        shj_zhaorui: {
            audio:"ext:大梦千秋/audio/shj_baize:3",
            persevereSkill: true,
            forced: true,
            mark: true,
            marktext: "祥瑞",
            intro: {
                name: "祥瑞",
                content: "mark",
            },
            mod: {
                targetEnabled: function(card, player, target) {
                    if (get.type(card) == 'delay') {
                        return false;
                    }
                }
            },
            trigger: { 
                player: ["damageEnd", "phaseZhunbeiBegin"],
                source: "damageEnd",
            },
            filter(event, player) {
                if(event.name == 'damage') return event.num > 0;
                return true;
            },
            content: function() {
                'step 0'
                event.num = trigger.num || 1;
                game.log(player, '发动了【昭瑞】');
                event.cardsToGain = [];
                'step 1'
                if (player.storage.shj_dongxu_awaken) {
                    player.draw(event.num);
                    event.goto(3);
                } else {
                    event.count = 0;
                }
                'step 2'
                if(event.count < event.num){
                    var recorded = player.storage.shj_dongxu || [];
                    var card_list = lib.inpile.filter(name => {
                        return get.type(name) != 'equip' && !recorded.includes(name);
                    });

                    if(card_list.length > 0) {
                        var card_name = card_list.randomGet();
                        var new_card = game.createCard({name: card_name, suit: 'none', number: null});
                        event.cardsToGain.push(new_card);
                    } else {
                        player.draw();
                    }
                    event.count++;
                    event.redo();
                } else if(event.cardsToGain.length > 0) {
                     player.gain(event.cardsToGain, 'gain2');
                }
                'step 3'
                player.addMark('shj_zhaorui', event.num);
            }
        },
        shj_tuna: {
            audio: "ext:大梦千秋/audio/shj_baize:3",
            persevereSkill: true,
            mark: true,
            marktext: "白泽图",
            intro: {
                name: "洞虚·白泽图",
                content: function(storage, player) {
                    var recorded = player.storage.shj_dongxu || [];
                    var all_non_equip = lib.inpile.filter(name => get.type(name) != 'equip').unique();
                    var recorded_str = recorded.map(name => get.translation(name)).join('、');
                    if(!recorded_str) recorded_str = '无';
                    var unrecorded_list = all_non_equip.filter(name => !recorded.includes(name));
                    var unrecorded_str = unrecorded_list.map(name => get.translation(name)).join('、');
                    if(!unrecorded_str) unrecorded_str = '全部记录完毕！';
                    return `已记录(${recorded.length}/${all_non_equip.length})：${recorded_str}<br><br>未记录：${unrecorded_str}`;
                }
            },
            trigger: { player: "phaseDrawBegin" },
            direct: true,
            filter: (event, player) => !event.numFixed,
            content: function() {
                'step 0'
                var recorded = player.storage.shj_dongxu || [];
                var card_list = lib.inpile.filter(name => {
                    return get.type(name) != 'equip' && !recorded.includes(name);
                });

                if(card_list.length == 0) {
                    game.log('没有可指定的牌名了！');
                    event.finish();
                } else {
                    player.chooseBool(get.prompt('shj_tuna'), '是否发动【图纳】，指定牌名来代替摸牌？').set('ai', () => true);
                }
                'step 1'
                if(result.bool) {
                    player.logSkill('shj_tuna');
                    trigger.changeToZero();
                } else {
                    event.finish();
                    return;
                }
                
                var recorded = player.storage.shj_dongxu || [];
                var card_list = lib.inpile.filter(name => {
                    return get.type(name) != 'equip' && !recorded.includes(name);
                });
                var num_to_choose = Math.min(3, card_list.length);

                player.chooseButton(
                    [`图纳：请指定${num_to_choose}种不同的牌名`, [card_list, 'vcard']],
                    num_to_choose,
                    true
                ).set('ai', button => Math.random());
                'step 2'
                if(result.bool) {
                    event.card_names = result.links.map(link => link[2]);
                } else {
                    event.finish();
                    return;
                }

                var cards_to_gain = [];
                var final_names;
                
                if (event.card_names.length < 3) {
                    final_names = event.card_names;
                } else {
                    final_names = event.card_names.randomGets(2);
                }

                for(var name of final_names) {
                    cards_to_gain.push(game.createCard({name: name, suit: 'none', number: null}));
                }
                if(cards_to_gain.length > 0) {
                    player.gain(cards_to_gain, 'gain2');
                }
                'step 3'
                player.gainMaxHp(1);
                player.recover(1);
            },
        },
    shj_baizhao: {
        persevereSkill: true,
        audio: "ext:大梦千秋/audio/shj_baize:5",
        group: ["shj_baizhao_mod", "shj_baizhao_effect"],
        subSkill: {
            // === 核心修正点: 为 mod 子技能添加了正确的结构 ===
            mod: {
                // 这个子技能现在是一个正确的技能对象, 它包含一个 mod 属性
                mod: {
                    cardUsable: function(card, player) {
                        var recorded = player.storage.shj_dongxu || [];
                        if (recorded.includes(card.name)) {
                            return Infinity;
                        }
                    },
                    targetInRange: function(card, player) {
                        var recorded = player.storage.shj_dongxu || [];
                        if (recorded.includes(card.name)) {
                            return true;
                        }
                    }
                }
            },
            effect: {
                
                trigger: { target: "useCardToTargeted" },
                forced: true,
                filter: function(event, player) {
                    var recorded = player.storage.shj_dongxu || [];
                    return recorded.includes(event.card.name);
                },
                content: function() {
                    'step 0'
                    player.logSkill('shj_baizhao');
                    if (player.isDamaged()) {
                        player.recover();
                    } else {
                        player.gainMaxHp();
                    }
                }
            }
        }
    },
        shj_pixie: {
            audio: "ext:大梦千秋/audio/shj_baize:3",
            persevereSkill: true,
            enable: "phaseUse",
            usable: 1,
            filter(event, player) {
                return player.countMark('shj_zhaorui') > 0;
            },
            content: function () {
                'step 0';
                event.num_mark = player.countMark('shj_zhaorui');
                event.is_odd = (event.num_mark % 2 !== 0);
                var max_targets = Math.min(event.num_mark, 5);

                if(event.is_odd) {
                    player.chooseTarget(`辟邪：请选择至多${max_targets}名角色，对他们各造成1点雷电伤害`, [1, max_targets], true)
                    .set('ai', target => -get.attitude(_status.event.player, target));
                } else {
                    player.chooseTarget(
                        `辟邪：请选择至多${max_targets}名未横置的角色，横置并翻面他们并弃置他们各一张牌`, 
                        [1, max_targets], 
                        true,
                        function(card, player, target) {
                            // target.isLinked() 会在目标已横置时返回 true
                            // 所以 !target.isLinked() 就表示“目标未横置”
                            return !target.isLinked();
                        }
                    )
                    .set('ai', target => -get.attitude(_status.event.player, target*1.5));
                }
                'step 1';
                if(result.bool && result.targets) {
                    var targets = result.targets.sortBySeat();
                    game.log(player, '对', targets, '发动了【辟邪】');
                    event.targets = targets;
                    event.num = 0;
                } else {
                    event.finish();
                }
        'step 2'; // 循环处理的开始
        if (event.num < event.targets.length) {
            var target = event.targets[event.num];
            event.currentTarget = target; // 将当前目标存入event，以便后续步骤使用

            if(event.is_odd) {
                target.damage('thunder');
                event.goto(5); // 奇数效果只有一个动作，完成后直接跳到循环计数
            } else {
                // 偶数效果的第一个动作：横置
                target.link(true);
            }
        } else {
            event.finish(); // 所有目标处理完毕，结束技能
        }
        'step 3'; // 偶数效果的第二个动作：翻面
        event.currentTarget.turnOver(true);
        'step 4'; // 偶数效果的第三个动作：弃牌
        player.discardPlayerCard(event.currentTarget, 'he', true);
        'step 5'; // 循环计数与跳转
        event.num++;
        event.goto(2); // 返回步骤2，处理下一个目标
    }
        },
        shj_lingyou: {
            persevereSkill: true,
            audio: "ext:大梦千秋/audio/shj_baize:5",
            enable: "phaseUse",
            filter(event, player) {
                return player.countMark('shj_zhaorui') >= 5;
            },
            content: function() {
                player.removeMark('shj_zhaorui', 5);
                player.draw(5);
            },
            ai: {
                order: 1,
                result: {
                    player: 1,
                }
            }
        },
        shj_dongxu: {
            audio: "ext:大梦千秋/audio/shj_baize:2",
            persevereSkill: true,
            awakenSkill: true,
            skillAnimation: true,
            animationColor: "gold",
            derivation: "shj_zhen_e",
            init(player) {
                player.storage.shj_dongxu = [];
            },
            trigger: { player: "gainAfter" },
            forced: true,
            silent: true,
            filter(event, player) {
                if (player.storage.shj_dongxu_awaken) return false;
                var new_cards_to_record = event.cards.filter(card => get.type(card) != 'equip' && !(player.storage.shj_dongxu || []).includes(card.name));
                return new_cards_to_record.length > 0;
            },
            content: function() {
                'step 0'
                var new_cards = trigger.cards.map(card => card.name).unique();
                var changed = false;
                for(var name of new_cards) {
                    if(get.type(name) != 'equip' && !player.storage.shj_dongxu.includes(name)) {
                        player.storage.shj_dongxu.push(name);
                        changed = true;
                    }
                }
                if(changed) {
                    game.log(player, '的【洞虚】记录了新的牌名');
                    player.updateMark('shj_tuna');
                    
                    var all_non_equip = lib.inpile.filter(name => get.type(name) != 'equip').unique();
                    if(player.storage.shj_dongxu.length >= all_non_equip.length) {
                        player.logSkill('shj_dongxu');
                        //player.$fullscreenpop('洞虚', 'wood');
                        player.awakenSkill('shj_dongxu');
                        player.node.avatar.setBackgroundImage('extension/大梦千秋/image/shj_baize2.jpg');
                        player.addSkill('shj_zhen_e');
                    }
                }
            }
        },
        shj_zhen_e: {
            audio: "ext:大梦千秋/audio/shj_baize:3",
            persevereSkill: true,
            enable: "phaseUse",
            usable: 1,
            skillAnimation: true,
            animationColor: "gold",
            filterTarget: (card, player, target) => target != player,
            content: function() {
                'step 0'
                var target = event.targets[0];
                game.log(player, '对', target, '发动了【镇厄】');
                var cards = target.getCards('hej');
                target.die();
                if(cards.length > 0) {
                   player.gain(cards, target, 'gain2');
                }
            }
        },
    },
    skillTranslate: {
        shj_zhaorui: "昭瑞",
        shj_zhaorui_info: "持恒技，锁定技，每当你受到或造成的伤害结算后，或你的准备阶段时：<br>&nbsp&nbsp&nbsp&nbsp明策：你从游戏外获得一张白泽图未记录的非装备牌（无花色点数）；<br>&nbsp&nbsp&nbsp&nbsp律成：你摸一张牌;<br>然后你获得一个“祥瑞”标记；你不能成为延时性囊牌的目标。",
        shj_tuna:"图纳",
        shj_tuna_info: "持恒技，摸牌阶段，若白泽图未记录所有非装备牌，你可改为指定三种白泽图未记录的非装备牌（若不足三种则全选），然后从游戏外获得本次指定牌中的随机两种牌各一张（若指定牌数为1则获得一张），依此法获得的牌无花色点数。若如此做，你增加一点体力上限并回复一点体力。",
        shj_baizhao: "白沼",
        shj_baizhao_info: "持恒技，锁定技，你使用白泽图已记录牌名的 牌无次数和距离限制；当你成为白泽图已记录牌名的牌的目标时，若你已受伤，你回复1点体力；否则，你增加1点体力上限。",
        shj_pixie: "辟邪",
        shj_pixie_info: "持恒技，出牌阶段限一次，若“祥瑞”标记数为：<br>奇数:你可以对至多X名角色各造成一点雷电伤害；<br>偶数:你可以横置并翻面至多X名未横置角色并各弃置其一张牌。<br>（X为“祥瑞”标记数且不大于5）",
        shj_lingyou: "灵佑",
        shj_lingyou_info: "持恒技，出牌阶段，若你的“祥瑞”标记数不小于五，你可以移除5个“祥瑞”标记，然后摸五张牌。",
        shj_dongxu: "洞虚",
        shj_dongxu_info: "持恒技，觉醒技，当你获得未记录的非装备牌后，白泽图记录其牌名。当你已记录所有非装备牌名时，【昭瑞】由“明策”修改为“律成”。你获得技能【镇厄】。",
        shj_zhen_e: "镇厄",
        shj_zhen_e_info: "持恒技，出牌阶段限一次，你可以指定一名其他角色，令其立即死亡，然后你获得其区域内所有牌。"
    },
    characterTaici:{
        "shj_zhaorui":{ order:1 ,content:"诛邪除祟！/察万物之情！/书神鬼之事！"},
        "shj_tuna":{ order:2 ,content:"山海未知领域，现已收录白泽图中。/此方图至浩瀚，内藏洪荒大妖，误入之人可要当心了。/穷山海之秘，虽万险千难，吾亦往矣。"},
        "shj_baizhao":{ order:3 ,content:"看似无用的经验，也是计划的一环。/屡战屡胜，习以为常。/得此新妖，书录一卷。/求知者，不惑。/诱敌深入的小小把戏。"},
        "shj_pixie":{ order:4 ,content:"百妖再会！/万灵谐存！/龙润之祥！"},
        "shj_lingyou":{ order:5 ,content:"未览古今，何以闻天下；非至八方，何以识万类。/山海有异闻，奇都多妖兽。我不要再看见荒芜的大地。/苍天朗朗，草木葱葱。/此处，是万物新生的季节。"},
        "shj_dongxu":{ order:6 ,content:"山卷奇崛，纳天下异兽！/海图浩茫，志四方灵怪！"},
        "shj_zhen_e":{ order:7 ,content:"镇收邪祟，荡尽魑魅！/瑞象在此，灾祸退散！/百厄除尽，万象更新！"},
        "die":{content:"妖火湮灭..."}
    }
};
//#FFD700金色