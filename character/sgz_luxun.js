export default {
    character: {
        // 梦陆逊：梦势力，5体力
        sgz_luxun: ["male", "shen", "1/6", ["sgz_qujian", "sgz_lianying", "sgz_taohui", "sgz_fenmie"], [
            "des:书生拜将，火烧连营。梦回夷陵，这一场泼天大火，终将焚尽旧时代的残梦。",
            "ext:大梦千秋/image/sgz_luxun.jpg",
            "die:ext:大梦千秋/audio/sgz_luxun/die.mp3"
        ]],
    },
    characterName: 'sgz_luxun',
    characterTranslate: {
        sgz_luxun: "陆逊",
    },
    skills: {
        // === 1. 驱剑 (重构版：体力值标记、连招消耗、阶段末清除) ===
        sgz_qujian: {
            audio: "ext:大梦千秋/audio/sgz_luxun:2",
            persevereSkill: true,
            // --- 标记系统 ---
            mark: true,
            marktext: "驱剑",
            intro: {
                name: "驱剑",
                content: "mark", // 自动显示标记层数
            },
            // --- 逻辑组 ---
            group: ["sgz_qujian_combo", "sgz_qujian_setup", "sgz_qujian_cleanup"],
            subSkill: {
                // ① 回合开始：获得标记
                setup: {
                    trigger: { player: "phaseBegin" },
                    forced: true,
                    silent: true,
                    content: function() {
                        "step 0"
                        // 获得等同于当前体力值的标记
                        player.addMark('sgz_qujian', player.hp);
                        player.addTempSkill('sgz_qujian_addsha', 'phaseAfter');
                        game.log(player, '的回合开始，获得了', player.hp, '枚“剑”标记');
                    }
                },
                // ② 连招判定与消耗
                combo: {
                    forced: true,
                    trigger: { player: "useCard" },
                    filter: function(event, player) {
                        // 1. 检查是否有标记
                        if (player.countMark('sgz_qujian') <= 0) return false;

                        // 2. 锦囊牌检查
                        if (get.type2(event.card) != 'trick') return false;

                        // 3. 连招检查：上一张牌必须是【杀】
                        var history = player.getHistory('useCard');
                        if (history.length < 2) return false;
                        var prev = history[history.length - 2];
                        if (prev.card.name != 'sha') return false;

                        return true;
                    },
                    content: function() {
                        "step 0"
                        // 消耗一个标记
                        player.removeMark('sgz_qujian', 1);
                        player.logSkill('sgz_qujian');

                        // 效果1：选择一名其他角色横置
                        player.chooseTarget('驱剑：请选择一名其他角色横置', function(card, player, target) {
                            return target != player;
                        }).set('ai', function(target) {
                            return !target.isLinked() ? -get.attitude(_status.event.player, target) : 0;
                        });

                        "step 1"
                        if (result.bool && result.targets.length) {
                            var target = result.targets[0];
                            target.link(true);
                        }

                        "step 2"
                        // 效果2：摸 X 张牌 (X为场上横置角色数)
                        var x = game.countPlayer(function(current) {
                            return current.isLinked();
                        });
                        if (x > 0) {
                            player.draw(x);
                        }

                        // 效果3：本回合额外杀次数 +1
                        if (player.storage.sgz_qujian_addsha_count === undefined) {
                            player.storage.sgz_qujian_addsha_count = 0;
                        }
                        player.storage.sgz_qujian_addsha_count++;
                    }
                },
                // ③ 清理逻辑：出牌阶段结束或回合结束时移除
                cleanup: {
                    trigger: { player: ["phaseUseAfter", "phaseAfter"] },
                    forced: true,
                    silent: true,
                    filter: function(event, player) {
                        return player.countMark('sgz_qujian') > 0;
                    },
                    content: function() {
                        var num = player.countMark('sgz_qujian');
                        player.removeMark('sgz_qujian', num);
                        game.log(player, '的“剑”标记已清空');
                    }
                },
                // 辅助 MOD 技能 (负责额外杀次数)
                addsha: {
                    onremove: function(player) {
                        delete player.storage.sgz_qujian_addsha_count;
                    },
                    mod: {
                        cardUsable: function(card, player, num) {
                            if (card.name == 'sha') {
                                return num + (player.storage.sgz_qujian_addsha_count || 0);
                            }
                        }
                    }
                }
            }
        },

        // === 2. 连营 (修改：失去最后一张手牌摸至人数) ===
        sgz_lianying: {
            audio: "ext:大梦千秋/audio/sgz_luxun:2",
            forced: true,
            persevereSkill: true,
            group: ["sgz_lianying_draw", "sgz_lianying_hscap", "sgz_lianying_reset"],
            subSkill: {
                draw: {
                    trigger: { player: "phaseDrawBegin" },
                    forced: true,
                    content: function () {
                        var x = game.countPlayer();
                        trigger.num += x;
                    },
                },
                hscap: {
                    mod: { maxHandcard: (player, num) => num + game.countPlayer() }
                },
                reset: {
                    trigger: { player: "loseAfter" },
                    forced: true,
                    filter: function(event, player) {
                        // 失去牌后手牌数为0
                        return player.countCards('h') == 0 && event.hs && event.hs.length > 0;
                    },
                    content: function() {
                        player.logSkill('sgz_lianying');
                        player.drawTo(game.countPlayer());
                    }
                }
            }
        },

        // === 3. 韬晦 (终极修正版：无数字标记、不发动不显示) ===
        sgz_taohui: {
            audio: "ext:大梦千秋/audio/sgz_luxun:4",
            persevereSkill: true,
            forced: true, 
            // 游戏开始或获得技能时，添加标记技能
            init: function(player) {
                player.addSkill('sgz_taohui_mark');
            },
            trigger: { player: "dying" },
            priority: 10,
            group: "sgz_taohui_refresh",
            filter: function(event, player) {
                // 判定：只有拥有标记子技能时才能发动
                return player.hasSkill('sgz_taohui_mark');
            },
            content: function() {
                "step 0"
                player.logSkill('sgz_taohui');
                // 核心修改：发动瞬间移除子技能，标记图标会立即物理消失
                player.removeSkill('sgz_taohui_mark');
                player.node.avatar.setBackgroundImage('extension/大梦千秋/image/sgz_luxun_taohui.jpg');
                
                player.gainMaxHp(1);
                player.recover(1 - player.hp);
                
                "step 1"
                var canContinue = false;
                if (player.isDamaged()) canContinue = true;
                if (game.hasPlayer(p => p != player && !p.isLinked())) canContinue = true;
                if (game.hasPlayer(p => p != player && player.canUse({name: 'sha'}, p))) canContinue = true;
                
                if (!canContinue) {
                    event.finish();
                } else {
                    event.card = get.cards(1)[0];
                    player.showCards([event.card], get.translation(player.name) + '触发【韬晦】');
                }
                
                "step 2"
                var suit = get.suit(event.card);
                event.effect_done = false;
                game.playAudio(`../extension/大梦千秋/audio/sgz_luxun/sgz_hit${[1,2].randomGet()}.mp3`);
                switch (suit) {
                    case 'heart': 
                        if (player.isDamaged()) { player.recover(); event.effect_done = true; } 
                        break;
                    case 'club': 
                        player.chooseTarget('韬晦：选择至多三名其他角色横置', [1, 3], function(card, player, target){
                            return target != player && !target.isLinked();
                        }).set('ai', t => -get.attitude(player, t));
                        break;
                    case 'diamond': 
                        player.chooseUseTarget({name: 'sha', nature: 'fire'}, false, '韬晦：选择一名其他角色使用【火杀】')
                            .set('filterTarget', function(card, player, target){
                                return target != player && lib.filter.targetEnabled(card, player, target);
                            });
                        break;
                    case 'spade': 
                        player.chooseUseTarget({name: 'sha', nature: 'thunder'}, false, '韬晦：选择一名其他角色使用【雷杀】')
                            .set('filterTarget', function(card, player, target){
                                return target != player && lib.filter.targetEnabled(card, player, target);
                            });
                        break;
                }
                
                "step 3"
                if (result && result.bool) {
                    event.effect_done = true;
                    if (get.suit(event.card) == 'club' && result.targets) {
                        for (var i = 0; i < result.targets.length; i++) {
                            result.targets[i].link(true);
                        }
                    }
                }
                if (event.effect_done) {
                    event.goto(1);
                }
            },
            subSkill: {
                // === 标记子技能：专门负责显示“韬”字图标 ===
                mark: {
                    charlotte: true,
                    mark: true,
                    marktext: "韬晦",
                    intro: { 
                        name: "韬晦", 
                        content: "进入濒死状态时自动触发。" 
                    }
                },
                // === 刷新逻辑 ===
                refresh: {
                    trigger: { global: "roundStart" },
                    forced: true,
                    silent: true,
                    filter: function(event, player) {
                        // 判定：如果这一轮陆逊没有标记，则补上
                        return !player.hasSkill('sgz_taohui_mark');
                    },
                    content: function() {
                        player.addSkill('sgz_taohui_mark');
                        player.node.avatar.setBackgroundImage('extension/大梦千秋/image/sgz_luxun.jpg');
                    }
                }
            }
        },

        // === 4. 焚灭 (终极修正版） ===
        sgz_fenmie: {
            audio: "ext:大梦千秋/audio/sgz_luxun:2",
            enable: "phaseUse",
            usable: 1, // 改为出牌阶段限一次
            persevereSkill: true,
            skillAnimation: false,
            // 修正：可以选任何其他角色
            filter(event, player) {
                return game.hasPlayer(target => target != player);
            },
            filterTarget(card, player, target) {
                return target != player;
            },
            selectTarget: [1, Infinity],
            multitarget: true,
            multiline: true,
            async content(event, trigger, player) {
                // 移除原本的觉醒逻辑，改为添加临时补牌技能
                player.addTempSkill(event.name + "_draw", "phaseAfter");
                player.node.avatar.setBackgroundImage('extension/大梦千秋/image/sgz_luxun_fenmie.jpg');
                let { targets } = event;
                
                // 1. 初始摸牌
                await player.draw(targets.length);

                // 2. 进入核心逻辑循环
                while (true) {
                    // 过滤出还在场且有手牌的目标
                    targets = targets.filter(target => target.isIn() && target.countCards("h"));
                    if (!targets.length) break;

                    // 3. 多人同时展示手牌 (修复 AI 报错点)
                    const showEvent = player.chooseCardOL(targets, "焚灭：请各目标展示一张牌", true);
                    // 采用最稳健的 AI 选牌赋值
                    showEvent.set('aiCard', function(target) {
                        var hs = target.getCards('h');
                        if (hs.length) return { bool: true, cards: [hs.randomGet()] };
                        return { bool: false };
                    });
                    
                    const result = await showEvent.forResult();
                    const cards = [];
                    for (var i = 0; i < targets.length; i++) {
                        if (result[i] && result[i].cards) {
                            cards.push(result[i].cards[0]);
                        }
                    }
                    if (cards.length < targets.length) break; // 防止异常中断

                    // 4. 展示花色并创建 UI 提示框
                    const suits = cards.map(card => get.suit(card)).unique();
                    const next = player.showCards(cards, `${get.translation(player)} 发动了【焚灭】`, false)
                        .set("showers", targets)
                        .set("customButton", button => {
                            const target = get.owner(button.link);
                            if (target) {
                                const div = button.querySelector(".info");
                                div.innerHTML = "<span style='font-weight:bold'>" + get.translation(get.suit(button.link, target)) + target.getName() + "</span>";
                            }
                        })
                        .set("delay_time", targets.length * 2)
                        .set("closeDialog", false);
                    await next;
                    const id = next.videoId;

                    // 5. 更新提示文案
                    const updateCaption = function (id, suits) {
                        const dialog = get.idDialog(id);
                        if (dialog) {
                            const div = dialog.querySelector(".caption");
                            const suitStr = suits.map(s => get.translation(s)).join('、');
                            div.innerHTML = `焚灭：弃置花色为 <span style='font-weight:bold;font-size:120%;color:#ff4400'>${suitStr}</span> 的牌对目标造成1点火焰伤害`;
                            ui.update();
                        }
                    };
                    if (player == game.me) updateCaption(id, suits);
                    else if (player.isOnline()) player.send(updateCaption, id, suits);

                    // 6. 陆逊选择弃牌并指定目标
                    const nextx = player.chooseCardTarget({
                        prompt: false,
                        dialog: get.idDialog(id),
                        filterCard(card, player) {
                            return suits.includes(get.suit(card, player)) && lib.filter.cardDiscardable.apply(this, arguments);
                        },
                        selectCard: [1, Infinity],
                        filterTarget(card, player, target) {
                            const selected = ui.selected.cards;
                            if (!selected.length) return false;
                            const currentSuits = selected.map(c => get.suit(c, player)).unique();
                            const targetIdx = targets.indexOf(target);
                            return targetIdx != -1 && currentSuits.includes(get.suit(cards[targetIdx], target));
                        },
                        selectTarget: -1,
                        suits: suits,
                        cards: cards,
                        targets: targets,
                        position: "he",
                        ai1(card) { return 10 - get.value(card); }
                    });

                    const resultx = await nextx.forResult();
                    game.broadcastAll("closeDialog", id);

                    // 7. 结算伤害
                    if (resultx && resultx.bool && resultx.cards && resultx.targets) {
                        const damageTargets = resultx.targets;
                        await player.discard(resultx.cards);
                        game.playAudio(`../extension/大梦千秋/audio/sgz_luxun/sgz_hit${[1,2].randomGet()}.mp3`);
                        player.line(damageTargets, "fire");
                        
                        const damaged = [];
                        await game.doAsyncInOrder(damageTargets, async target => {
                            const dEvent = target.damage("fire");
                            await dEvent;
                            // 检查伤害是否真正造成，用于判断是否继续循环
                            if (target.hasHistory("damage", evt => (evt.getParent()?.getTrigger() || evt) == dEvent)) {
                                damaged.push(target);
                            }
                        });

                        // 如果有人没受到伤害（被防止），则根据原逻辑跳出
                        if (damaged.length != damageTargets.length) {
                            damageTargets.forEach(target => {
                                if (!damaged.includes(target)) {
                                    //target.chat("☝🤓唉，没打着");
                                    //target.throwEmotion(player, ["egg", "shoe"].randomGet());
                                }
                            });
                            break;
                        }
                    } else {
                        // 玩家点取消或没选够，也跳出循环
                        //targets.forEach(t => t.throwEmotion(player, ["egg", "shoe"].randomGet()));
                        break;
                    }
                }
                player.node.avatar.setBackgroundImage('extension/大梦千秋/image/sgz_luxun.jpg');
                player.removeSkill(event.name + "_draw");
            },
            subSkill: {
                draw: {
                    audio: "dcsbzhanyan",
                    charlotte: true,
                    forced: true,
                    trigger: {
                        player: "loseAfter",
                        global: ["gainAfter","loseAsyncAfter","addJudgeAfter","addToExpansionAfter","equipAfter"],
                    },
                    filter(event, player) {
                        return event.getl?.(player)?.cards2?.length;
                    },
                    async content(event, trigger, player) {
                        await player.draw(trigger.getl?.(player)?.cards2?.length);
                    },
                },
            },
            ai: {
                order: 1,
                result: { target: -1 }
            }
        },
    },
    skillTranslate: {
        sgz_qujian: "驱剑", sgz_qujian_info: "锁定技，连招技（杀+锦囊牌），出牌阶段限X次（X为你回合开始时的体力数），你可以横置一名角色，你摸Y张牌且本回合可以额外使用一张【杀】（Y为场上已横置的角色数）。",
        sgz_lianying: "连营", sgz_lianying_info: "锁定技，①摸牌阶段，你多摸X张牌，手牌上限+X。②当你失去最后一张手牌时，你摸至X张牌。（X为场上人数）",
        sgz_taohui: "韬晦", sgz_taohui_info: "每轮限一次，当你进入濒死状态时，你可以增加1点体力上限并回复至1点体力，然后重复亮出牌堆顶的一张牌并根据其花色执行对应效果直至被不可执行或你取消（♥️：你回复一点体力；♦️/♠️：视为使用一张无距离限制的火/雷【杀】；♣️：横置至多三名未横置角色）。",
        sgz_fenmie: "焚灭", sgz_fenmie_info: "出牌阶段限一次。你可以选择任意名其他角色并摸等量的牌，然后重复以下流程：<br>①被选中的所有角色同时展示一张手牌；<br>②你可以弃置任意张相同花色的牌并对其中展示对应花色牌的角色各造成1点火焰伤害;<br>③若这些对应花色的角色均受到了伤害，则重复此流程，否则技能结束。<br>此技能结算期间每当你失去牌时便摸等量的牌。",
    },
    characterTaici: {
        "sgz_qujian": { order: 1, content: "何日试青锋，匣中长剑夜夜鸣。/江东山河甫定，正乃用武之时。" },
        "sgz_lianying": { order: 2, content: "步步为营者，定无后顾之虞。/明公彀中藏龙卧虎，放之海内皆可称贤。" },
        "sgz_taohui": { order: 3, content: "辅君以礼，匡国以行，泽民以仁，此为大道。/万卷书，千里路，文如引帆之风，可至梦日之处。/儒门有言，仁为己任，此生不负孔孟之礼。/儒道尚仁而有礼，贤者知名而独悟。" },
        "sgz_fenmie": { order: 4, content: "天下扰扰，英雄欲定乾坤，非一人之力可成。/子衿乘风，欲访东翁，仿青梅煮酒，论天下英雄。" },
        "die": { content: "此生清白，不为浊泥所染..." }
    },
};