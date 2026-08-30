export default {
    character: {
        // 梦陆逊：梦势力，5体力
        sgz_luxun: {
            sex:"male", 
            group:"shen", 
            hp:1,
            maxHp:6, 
            skills:["sgz_qujian", "sgz_lianying", "sgz_taohui", "sgz_fenmie","sgz_luxun_ui"], 
            img:"extension/大梦千秋/image/sgz_luxun.jpg",
            dieAudios:["ext:大梦千秋/audio/sgz_luxun/die.mp3"],
            names:"陆|逊",
            groupInGuozhan:"wu",
            4:["des:书生拜将，火烧连营。梦回夷陵，这一场泼天大火，终将焚尽旧时代的残梦。",]
        },
    },
    characterName: 'sgz_luxun',
    characterTranslate: {sgz_luxun: "陆逊",},
    skills: {
        // === 1. 驱剑 (AI 连招强化版) ===
        sgz_qujian: {
            audio: "ext:大梦千秋/audio/sgz_luxun:2",
            persevereSkill: true,
            mark: true,
            marktext: "驱剑",
            intro: {
                name: "驱剑",
                content: "mark",
            },
            // === 核心 AI 注入：驱动连招意识 ===
            mod: {
                aiOrder: function(player, card, num) {
                    // 只有拥有标记时才启动连招诱导
                    if (player.countMark('sgz_qujian') > 0) {
                        const history = player.getHistory('useCard');
                        const lastEntry = history.length > 0 ? history[history.length - 1] : null;
                        const hasSha = player.hasCard(c => c.name == 'sha', 'h');
                        const hasTrick = player.hasCard(c => get.type2(c) == 'trick', 'h');

                        // 情况 A：刚刚出过【杀】，现在必须立刻出锦囊来完成连招
                        if (lastEntry && lastEntry.card.name == 'sha' && get.type2(card) == 'trick') {
                            return 16; // 优先级 16：超越焚灭(15)，绝对首选
                        }

                        // 情况 B：还没出【杀】，但手里有连招组件
                        if ((!lastEntry || lastEntry.card.name != 'sha') && hasSha && hasTrick) {
                            // 提升【杀】的优先级，使其在所有锦囊之前打出
                            if (card.name == 'sha') return 14; 
                            // 压低【锦囊】的优先级，防止它破坏连招顺序
                            if (get.type2(card) == 'trick') return 2;
                        }
                    }
                }
            },
            group: ["sgz_qujian_combo", "sgz_qujian_setup", "sgz_qujian_cleanup"],
            subSkill: {
                setup: {
                    trigger: { player: "phaseBegin" },
                    forced: true,
                    silent: true,
                    content: function() {
                        "step 0"
                        player.addMark('sgz_qujian', player.hp);
                        player.addTempSkill('sgz_qujian_addsha', 'phaseAfter');
                        game.log(player, '的回合开始，获得了', player.hp, '枚“剑”标记');
                    }
                },
                combo: {
                    forced: true,
                    trigger: { player: "useCard" },
                    filter: function(event, player) {
                        if (player.countMark('sgz_qujian') <= 0) return false;
                        if (get.type2(event.card) != 'trick') return false;
                        var history = player.getHistory('useCard');
                        if (history.length < 2) return false;
                        var prev = history[history.length - 2];
                        if (prev.card.name != 'sha') return false;
                        return true;
                    },
                    content: function() {
                        "step 0"
                        player.removeMark('sgz_qujian', 1);
                        player.logSkill('sgz_qujian');
                        player.chooseTarget('驱剑：请选择一名其他角色横置', function(card, player, target) {
                            return target != player;
                        }).set('ai', function(target) {
                            return !target.isLinked() ? -get.attitude(_status.event.player, target) : 0;
                        });
                        "step 1"
                        if (result.bool && result.targets.length) {
                            result.targets[0].link(true);
                        }
                        "step 2"
                        var x = game.countPlayer(current => current.isLinked());
                        if (x > 0) player.draw(x);
                        if (player.storage.sgz_qujian_addsha_count === undefined) player.storage.sgz_qujian_addsha_count = 0;
                        player.storage.sgz_qujian_addsha_count++;
                        player.loseHp(1);
                    }
                },
                cleanup: {
                    trigger: { player: ["phaseUseAfter", "phaseAfter"] },
                    forced: true,
                    silent: true,
                    filter: function(event, player) {
                        return player.countMark('sgz_qujian') > 0;
                    },
                    content: function() {
                        player.removeMark('sgz_qujian', player.countMark('sgz_qujian'));
                        game.log(player, '的“剑”标记已清空');
                    }
                },
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
            ai:{
                noh: true, // 没有手牌时正收益
            },
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
        // === 3. 韬晦 (终极逻辑强化版：强制选择、梅花自动判空) ===
        sgz_taohui: {
            audio: "ext:大梦千秋/audio/sgz_luxun:4",
            persevereSkill: true,
            forced: true, 
            init: function(player) {
                player.addSkill('sgz_taohui_mark');
            },
            trigger: { player: "dying" },
            priority: 10,
            group: "sgz_taohui_refresh",
            filter: function(event, player) {
                return player.hasSkill('sgz_taohui_mark');
            },
            content: function() {
                "step 0"
                player.storage._taohui_active = true; // 新增：标记正在发动
                player.logSkill('sgz_taohui');
                player.removeSkill('sgz_taohui_mark');
                // 切换为战斗形态原画
                player.node.avatar.setBackgroundImage('extension/大梦千秋/image/sgz_luxun_taohui.jpg');
                
                player.gainMaxHp(1);
                player.recover(1 - player.hp);
                player.addSkill('sgz_taohui_fangzhibingsi');
                
                "step 1"
                // 检查是否还有可执行的效果，若无则结束
                var canContinue = false;
                if (player.isDamaged()) canContinue = true;
                if (game.hasPlayer(p => p != player && !p.isLinked())) canContinue = true;
                if (game.hasPlayer(p => p != player && player.canUse({name: 'sha'}, p))) canContinue = true;
                
                if (!canContinue) {
                    player.recover(player.maxHp-player.hp);
                    player.removeSkill('sgz_taohui_fangzhibingsi');
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
                        if (player.isDamaged()) { 
                            player.recover(); 
                            event.effect_done = true; 
                        } 
                        break;
                    case 'club': 
                        // 梅花逻辑优化：先检查是否有人可连
                        if (game.hasPlayer(p => p != player && !p.isLinked())) {
                            // 第三个参数设为 true，强制选择且不可取消
                            player.chooseTarget('韬晦：请选择1~3名其他角色横置', [1, 3], true, function(card, player, target){
                                return target != player && !target.isLinked();
                            }).set('ai', function(target) {
                                var player = _status.event.player;
                                var evt = _status.event;

                                // === 核心优化：预计算名单 (双重排序算法) ===
                                if (evt._dmqc_link_list === undefined) {
                                    // 1. 获取所有：未连环 且 态度<=0 的角色
                                    var enemies = game.filterPlayer(p => p != player && !p.isLinked() && get.attitude(player, p) <= 0);
                                    
                                    // 2. 双重排序逻辑
                                    enemies.sort(function(a, b) {
                                        var attA = get.attitude(player, a);
                                        var attB = get.attitude(player, b);
                                        
                                        // 第一优先级：态度最低者（最敌对）排在前面
                                        if (attA !== attB) {
                                            return attA - attB;
                                        }
                                        // 第二优先级：态度相同时，威胁度最高（get.threaten）者排在前面
                                        return get.threaten(b) - get.threaten(a);
                                    });

                                    // 3. 执行您的阶梯数量规则
                                    var count = enemies.length;
                                    var limit = 1;
                                    if (count == 3) limit = 2;
                                    else if (count > 3) limit = 3;
                                    
                                    // 4. 选出得分最高的 limit 个目标作为最终名单
                                    evt._dmqc_link_list = enemies.slice(0, limit);
                                    
                                    // 打印记录确认逻辑 (正式版可删除)
                                    // game.log('韬晦AI分析：敌方未连', count, '人，决定连环', limit, '人');
                                }

                                // === 5. 命中名单给高分，否则 0 分 ===
                                if (evt._dmqc_link_list.contains(target)) {
                                    // 给分公式：基础大分 + 威胁度补偿 - 态度干扰
                                    return 100 + get.threaten(target) - get.attitude(player, target);
                                }
                                return 0;
                            });
                        } else {
                            game.log('场上已无未横置的角色，效果中断');
                            player.recover(player.maxHp-player.hp);
                            player.removeSkill('sgz_taohui_fangzhibingsi');
                            event.finish();
                        }
                        break;
                    case 'diamond': 
                        // 第二个参数改为 true，物理移除“取消”和“跳过”按钮
                        player.chooseUseTarget({name: 'sha', nature: 'fire'}, true, '韬晦：选择一名其他角色使用【火杀】')
                            .set('filterTarget', function(card, player, target){
                                // 物理爆破距离限制：只要不是自己，头像全是亮的
                                return target != player; 
                            })
                            .set('unlimited', true)     // 强制结算时无视距离
                            .set('forceTarget', true)   // 强制锁定目标
                            .set('addCount', false)     // 强制不计入出牌次数
                            .set('ai', function(target){
                                var player = _status.event.player;
                                var value = -get.attitude(player,target);
                                // 横置收益极高
                                if (target.isLinked()) {
                                    value += 4;
                                }
                                return value;
                            });
                        break;
                    case 'spade':
                        // 第二个参数改为 true，强制发动
                        player.chooseUseTarget({name: 'sha', nature: 'thunder'}, true, '韬晦：选择一名其他角色使用【雷杀】')
                            .set('filterTarget', function(card, player, target){
                                // 物理爆破距离限制
                                return target != player;
                            })
                            .set('unlimited', true)
                            .set('forceTarget', true)
                            .set('addCount', false)
                            .set('ai', function(target){
                                var player = _status.event.player;
                                var value = -get.attitude(player,target);
                                // 横置收益极高
                                if (target.isLinked()) {
                                    value += 4;
                                }
                                return value;
                            });
                        break;
                }
                
                "step 3"
                // 处理交互结果
                if (result && result.bool) {
                    event.effect_done = true;
                    // 如果是梅花，手动执行横置
                    if (get.suit(event.card) == 'club' && result.targets) {
                        for (var i = 0; i < result.targets.length; i++) {
                            result.targets[i].link(true);
                        }
                    }
                }
                
                // 若效果成功执行，循环回到 step 1
                if (event.effect_done) {
                    event.goto(1);
                } else {
                    player.recover(player.maxHp-player.hp);
                    player.removeSkill('sgz_taohui_fangzhibingsi');
                    delete player.storage._taohui_active; // 新增：结束发动
                    event.finish();
                }
            },
            subSkill: {
                mark: {
                    charlotte: true,
                    mark: true,
                    marktext: "韬晦",
                    intro: { 
                        name: "韬晦", 
                        content: "处于韬光养晦状态。进入濒死时自动触发特殊回复与火烧连营。" 
                    }
                },
                refresh: {
                    trigger: { global: "roundStart" },
                    forced: true,
                    silent: true,
                    filter: function(event, player) {
                        return !player.hasSkill('sgz_taohui_mark');
                    },
                    content: function() {
                        player.addSkill('sgz_taohui_mark');
                        // 换回常态原画
                        player.node.avatar.setBackgroundImage('extension/大梦千秋/image/sgz_luxun.jpg');
                    }
                }
            }
        },
            sgz_taohui_fangzhibingsi: {
                charlotte: true,
                trigger: { 
                    player: "dying", 
                },
                forced: true,
                filter: function(event, player) {
                    // 1. 拦截濒死
                    if (event.name == 'dying') return true;
                },
                content: function() {
                    "step 0"
                    // 如果是濒死，直接取消，防止特效循环
                    if (trigger.name == 'dying') {
                        trigger.cancel();
                        event.finish();
                        return;
                    }
                }
            },
        // === 4. 焚灭 (权重强化与精准AI版) ===
        sgz_fenmie: { 
            audio: "ext:大梦千秋/audio/sgz_luxun:2",
            persevereSkill: true,
            enable: "phaseUse",
            usable: 1, 
            filter: function(event, player) {
                return game.hasPlayer(target => target != player);
            },
            filterTarget: function(card, player, target) {
                return target != player;
            },
            ai:{
                expose: 1,
                fireAttack: true, // 可造成火属性伤害
                directHit_ai: true, // 可强中
            },
            selectTarget: [1, Infinity],
            multitarget: true,
            multiline: true,
            async content(event, trigger, player) {
                player.addTempSkill(event.name + "_draw", "phaseAfter");
                player.node.avatar.setBackgroundImage('extension/大梦千秋/image/sgz_luxun_fenmie.jpg');
                let { targets } = event;
                
                // 1. 初始摸牌
                await player.draw(targets.length);

                // 2. 核心逻辑循环
                while (true) {
                    targets = targets.filter(target => target.isIn() && target.countCards("h"));
                    if (!targets.length) break;

                    // 3. 目标集体展示牌
                    const showEvent = player.chooseCardOL(targets, "焚灭：请各目标展示一张牌", true);
                    showEvent.set('aiCard', function(target) {
                        var hs = target.getCards('h');
                        if (hs.length) return { bool: true, cards: [hs.randomGet()] };
                        return { bool: false };
                    });
                    
                    const result = await showEvent.forResult();
                    const cards = [];
                    for (var i = 0; i < targets.length; i++) {
                        if (result[i] && result[i].cards) cards.push(result[i].cards[0]);
                    }
                    if (cards.length < targets.length) break;

                    // 4. 展示效果与 UI 同步
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
                        .set("delay_time", 0.3) // 极短延迟，提升流畅度
                        .set("closeDialog", false);
                    await next;
                    const id = next.videoId;

                    // 5. 陆逊选择弃牌 (每种花色仅需一张)
                    const nextx = player.chooseCardTarget({
                        prompt: `焚灭：弃置花色为 ${suits.map(s=>get.translation(s)).join('或')} 的牌造成火焰伤害 (同花色弃置一张即可)`,
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
                        // --- 核心 AI 逻辑优化 ---
                        ai1: function(card) {
                            const player = get.player();
                            // 关键：如果已经选了这种花色的牌，就不再选第二张（每种花色只弃一张）
                            if (ui.selected.cards.some(c => get.suit(c, player) == get.suit(card, player))) return 0;
                            // 检查是否有对应的敌人目标可以被这张牌打到
                            const suit = get.suit(card, player);
                            const hasEnemy = _status.event.targets.some((t, index) => {
                                return get.attitude(player, t) < 0 && get.suit(_status.event.cards[index], t) == suit;
                            });
                            if (!hasEnemy) return 0;
                            return 15 - get.value(card);
                        },
                        ai2: function(target) {
                            return -get.attitude(_status.event.player, target);
                        }
                    });

                    const resultx = await nextx.forResult();
                    game.broadcastAll("closeDialog", id);

                    // 6. 结算伤害与循环判定
                    if (resultx && resultx.bool && resultx.cards && resultx.targets) {
                        const damageTargets = resultx.targets;
                        await player.discard(resultx.cards);
                        game.playAudio(`../extension/大梦千秋/audio/sgz_luxun/sgz_hit${[1,2].randomGet()}.mp3`);
                        player.line(damageTargets, "fire");
                        
                        const damaged = [];
                        await game.doAsyncInOrder(damageTargets, async target => {
                            const dEvent = target.damage("fire");
                            await dEvent;
                            if (target.hasHistory("damage", evt => (evt.getParent()?.getTrigger() || evt) == dEvent)) {
                                damaged.push(target);
                            }
                        });

                        // 连营效果：若伤害全额造成则继续，否则中断
                        if (damaged.length != damageTargets.length) break;
                    } else {
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
                    filter: function(event, player) {
                        return event.getl && event.getl(player) && event.getl(player).cards2 && event.getl(player).cards2.length > 0;
                    },
                    async content(event, trigger, player) {
                        await player.draw(trigger.getl(player).cards2.length);
                    },
                },
            },
            ai: {
                // 提升使用优先级，出牌阶段一进来就用
                order: 15,
                fireAttack: true, // 可造成火属性伤害
                result: { 
                    player: function(player) {
                        // 场上敌人越多，且有牌可抓，收益越高
                        return game.countPlayer(t => get.attitude(player, t) < 0) > 0 ? 1 : 0;
                    }
                }
            }
        },
        // === 陆逊专属：【业火残响】极高质感 UI ===
        sgz_luxun_ui: {
            charlotte: true,
            trigger: { 
                player: ["changeHp", "dying", "enterGame","phaseUseEnd"],
                global: ["gameStart", "roundStart"] 
            },
            forced: true, silent: true, priority: -11,
            init: function(player) {
                // 1. 注入 SVG 滤镜（这是实现火焰不规则边缘和扭动的核心，不占资源）
                if (!document.getElementById('luxun_fire_filter')) {
                    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                    svg.id = 'luxun_fire_filter';
                    svg.style.display = 'none';
                    svg.innerHTML = `
                        <defs>
                            <filter id="flame-warp">
                                <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" seed="1">
                                    <animate attributeName="seed" from="1" to="100" dur="10s" repeatCount="indefinite" />
                                </feTurbulence>
                                <feDisplacementMap in="SourceGraphic" scale="15" />
                            </filter>
                            <filter id="flame-blur">
                                <feGaussianBlur stdDeviation="2" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                        </defs>`;
                    document.body.appendChild(svg);
                }

                if (!document.getElementById('luxun_high_end_fire_style')) {
                    var style = document.createElement('style');
                    style.id = 'luxun_high_end_fire_style';
                    style.innerHTML = `
                        /* 容器：放在右侧 3px 缝隙处 */
                        .luxun-fire-art-wrap {
                            position: absolute; left: 100%; bottom: 0%;
                            margin-left: 5px; width: 10px; height:100%;
                            z-index: 60; pointer-events: none;
                            display: flex; align-items: flex-end;
                        }

                        /* 业火底座：乌红色的不规则边框 */
                        .luxun-fire-frame {
                            position: relative; width: 100%; height: 100%;
                            background: rgba(20, 5, 5, 0.6);
                            border: 1px solid #3d0000;
                            filter: url(#flame-warp); /* 应用扭动滤镜 */
                            box-shadow: inset 0 0 10px #000, 0 0 5px #4a0404;
                        }

                        /* 填充层：深沉的血色渐变 */
                        .luxun-fire-fill {
                            width: 100%; height: 0%;
                            position: absolute; bottom: 0; left: 0;
                            background: linear-gradient(to top, 
                                #2b0000 0%, 
                                #4a0404 20%, 
                                #8b0000 50%, 
                                #b22222 80%, 
                                #ff4500 100%);
                            box-shadow: 0 0 15px #8b0000, 0 -5px 15px #ff4500;
                            transition: height 1.8s cubic-bezier(0.2, 0, 0.2, 1);
                            mix-blend-mode: screen; /* 使颜色具有通透的燃烧感 */
                        }

                        /* 火焰内部的灰烬升腾感 */
                        .luxun-fire-fill::before {
                            content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                            background: repeating-linear-gradient(0deg, 
                                transparent, 
                                rgba(255, 69, 0, 0.2) 20px, 
                                transparent 40px);
                            animation: ash-rise 4s infinite linear;
                        }

                        /* --- 环绕特效：周围的余烬与热浪 --- */
                        .luxun-ember-system {
                            position: absolute; width: 200%; height: 120%;
                            left: -50%; bottom: -10%; z-index: -1;
                        }
                        
                        .ember {
                            position: absolute; background: #ffaa00;
                            border-radius: 50%; opacity: 0;
                            filter: blur(1px);
                            animation: ember-fly infinite ease-out;
                        }

                        @keyframes ash-rise {
                            from { background-position: 0 0; }
                            to { background-position: 0 -120px; }
                        }

                        @keyframes ember-fly {
                            0% { transform: translate(0, 0) scale(1); opacity: 0; }
                            20% { opacity: 0.8; }
                            100% { transform: translate(calc(Math.random() * 40px - 20px), -100px) scale(0); opacity: 0; }
                        }

                        /* 状态修正：0%时完全隐藏 */
                        .luxun-fire-fill[style*="height: 0%"] {
                            opacity: 0;
                        }
                    `;
                    document.head.appendChild(style);
                }

                if (!player.luxunUI) {
                    var wrap = document.createElement('div');
                    wrap.className = 'luxun-fire-art-wrap';
                    
                    var frame = document.createElement('div');
                    frame.className = 'luxun-fire-frame';
                    
                    var fill = document.createElement('div');
                    fill.className = 'luxun-fire-fill';
                    
                    var embers = document.createElement('div');
                    embers.className = 'luxun-ember-system';
                    
                    // 生成 8 颗随机环绕火星
                    for(var i=0; i<8; i++) {
                        var e = document.createElement('div');
                        e.className = 'ember';
                        e.style.width = e.style.height = (Math.random()*3 + 1) + 'px';
                        e.style.left = (Math.random()*100) + '%';
                        e.style.bottom = (Math.random()*20) + '%';
                        e.style.animationDuration = (1.5 + Math.random()*2) + 's';
                        e.style.animationDelay = (Math.random()*3) + 's';
                        embers.appendChild(e);
                    }

                    frame.appendChild(fill);
                    wrap.appendChild(embers);
                    wrap.appendChild(frame);
                    
                    player.appendChild(wrap);
                    player.luxunUI = { wrap: wrap, fill: fill, embers: embers };
                }
            },
            content: function() {
                var ui = player.luxunUI;
                if (!ui) return;

                var percent = 0;
                var intensity = 1; // 燃烧强度

                if (player.storage._taohui_active) {
                    percent = 100;
                    intensity = 2;
                } else if (player.hasSkill('sgz_taohui_mark')) {
                    var lost = player.maxHp - player.hp;
                    percent = Math.min(100, Math.floor(((lost) / player.maxHp) * 100));
                    intensity = 1 + (lost / player.maxHp);
                } else {
                    percent = 0;
                }

                // 更新高度
                ui.fill.style.height = percent + '%';
                
                // 根据强度调整环境光
                if (percent > 0) {
                    ui.fill.style.filter = `blur(2px) brightness(${intensity})`;
                    ui.embers.style.display = 'block';
                } else {
                    ui.embers.style.display = 'none';
                }
            },
            onremove: function(player) {
                if (player.luxunUI) {
                    player.luxunUI.wrap.remove();
                    delete player.luxunUI;
                }
            }
        },
    },
    skillTranslate: {
        sgz_qujian: "驱剑", sgz_qujian_info: "锁定技，连招技（杀+锦囊牌），出牌阶段限X次（X为你回合开始时的体力数），横置至多一名角色，摸场上已横置角色数张牌且本回合你使用【杀】的额定次数+1，然后你失去一点体力。",
        sgz_lianying: "连营", sgz_lianying_info: "锁定技，①摸牌阶段你多摸X张牌，你的手牌上限+X。②当你失去最后一张手牌时，你摸至X张牌。（X为场上人数）",
        sgz_taohui: "韬晦", sgz_taohui_info: "每轮限一次，当你进入濒死状态时，你可以增加1点体力上限并回复至1点体力，然后重复亮出牌堆顶的一张牌并根据其花色执行对应效果，直到不可被执行：<br>♥️：回复一点体力；<br>♦️/♠️：视为使用一张无距离限制的火/雷【杀】；<br>♣️：横置1~3名未横置角色。<br>此技能持续期间，防止你的濒死结算；此技能结束时，你回复体力至体力上限。",
        sgz_fenmie: "焚灭", sgz_fenmie_info: "出牌阶段限一次。你可以选择任意名其他角色并摸等量的牌，然后重复以下流程：<br>①被选中的所有角色同时展示一张手牌；<br>②你可以弃置任意张牌或结束技能；<br>③对所有展示了与你所弃牌有相同花色的角色各造成1点火焰伤害，若存在角色防止了该伤害，则技能结束。<br>此技能结算期间每当你失去牌时便摸等量的牌。",
    },
    characterTaici: {
        "sgz_qujian": { order: 1, content: "何日试青锋，匣中长剑夜夜鸣。/江东山河甫定，正乃用武之时。" },
        "sgz_lianying": { order: 2, content: "步步为营者，定无后顾之虞。/明公彀中藏龙卧虎，放之海内皆可称贤。" },
        "sgz_taohui": { order: 3, content: "辅君以礼，匡国以行，泽民以仁，此为大道。/万卷书，千里路，文如引帆之风，可至梦日之处。/儒门有言，仁为己任，此生不负孔孟之礼。/儒道尚仁而有礼，贤者知名而独悟。" },
        "sgz_fenmie": { order: 4, content: "天下扰扰，英雄欲定乾坤，非一人之力可成。/子衿乘风，欲访东翁，仿青梅煮酒，论天下英雄。" },
        "die": { content: "此生清白，不为浊泥所染..." }
    },
};