// ===== 雷殛 debuff 特效（施加于目标角色的边框） =====
const sgzLeijiFxCSS = `
    /* ⚡ 雷殛·雳：雷电——外层电光缠绕边框（规律呼吸，频率×1.5，边框×1.5，四角与边框同频） */
    .leiji-thunder-fx {
        position: absolute; inset: -5px; border-radius: 12px;
        pointer-events: none; z-index: 65;
        border: 7px solid rgba(150,215,255,0.55);
        box-shadow: 0 0 10px rgba(120,200,255,0.55), inset 0 0 9px rgba(120,200,255,0.17);
        animation: leiji-thunder-breath 0.5s infinite ease-in-out;
    }
    .leiji-thunder-fx::before {
        content: ""; position: absolute; inset: 0; border-radius: inherit;
        background: radial-gradient(ellipse at 50% 50%, rgba(130,200,255,0) 55%, rgba(130,200,255,0.16) 100%);
    }
    .leiji-thunder-fx .bolt {
        position: absolute; width: 15px; height: 20px; opacity: 0;
        filter: drop-shadow(0 0 4px rgba(170,235,255,1));
        animation: leiji-bolt 0.5s infinite ease-in-out;
    }
    .leiji-thunder-fx .b1 { top: -12px; left: -8px; }
    .leiji-thunder-fx .b2 { top: -12px; right: -8px; transform: scaleX(-1); }
    .leiji-thunder-fx .b3 { bottom: -12px; left: -8px; transform: scaleY(-1); }
    .leiji-thunder-fx .b4 { bottom: -12px; right: -8px; transform: scale(-1,-1); }
    @keyframes leiji-thunder-breath {
        0%, 100% { border-color: rgba(150,215,255,0.55); box-shadow: 0 0 9px rgba(120,200,255,0.5), inset 0 0 9px rgba(120,200,255,0.16); }
        50% { border-color: rgba(205,242,255,0.95); box-shadow: 0 0 17px rgba(160,225,255,0.9), inset 0 0 13px rgba(160,225,255,0.3); }
    }
    @keyframes leiji-bolt {
        0%, 100% { opacity: 0; }
        50% { opacity: 0.95; }
    }
    /* 💥 雷殛·破：易伤——四个碎裂"破"字令符挂在卡牌四角（向对角外侧伸出，不堆叠在卡面上） */
    .leiji-boom-fx {
        position: absolute; inset: 0;
        pointer-events: none; z-index: 64;
    }
    .leiji-boom-fx .boom-c { position: absolute; }
    .leiji-boom-fx .boom-c svg {
        width: 27px; height: 72px;
        transform-origin: 50% 50%;
        filter: drop-shadow(0 0 5px rgba(255,70,40,0.7));
        animation: leiji-boom-pulse 2s infinite ease-in-out;
    }
    .leiji-boom-fx .c1 { left: -13.5px; top: -36px; }
    .leiji-boom-fx .c1 svg { transform: rotate(135deg); }
    .leiji-boom-fx .c2 { right: -13.5px; top: -36px; }
    .leiji-boom-fx .c2 svg { transform: rotate(-135deg); }
    .leiji-boom-fx .c3 { left: -13.5px; bottom: -36px; }
    .leiji-boom-fx .c3 svg { transform: rotate(45deg); }
    .leiji-boom-fx .c4 { right: -13.5px; bottom: -36px; }
    .leiji-boom-fx .c4 svg { transform: rotate(-45deg); }
    .leiji-boom-fx .crack {
        fill: none; stroke: rgba(25,2,2,0.9); stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round;
    }
    .leiji-boom-fx .crack-hot {
        fill: none; stroke: rgba(255,110,70,0.8); stroke-width: 1.1; stroke-linecap: round; stroke-linejoin: round;
        filter: drop-shadow(0 0 2px rgba(255,80,40,0.9));
    }
    @keyframes leiji-boom-pulse {
        0%, 100% { opacity: 0.8; }
        50% { opacity: 1; }
    }
`;
function sgzLeijiEnsureStyle() {
    if (!document.getElementById('sgz_leiji_fx_style')) {
        var s = document.createElement('style');
        s.id = 'sgz_leiji_fx_style';
        s.innerHTML = sgzLeijiFxCSS;
        document.head.appendChild(s);
    }
}
export default {
    character: {
        sgz_machao: {
            sex:"male", 
            group:"qun", 
            hp:4, 
            skills:["sgz_shouli","sgz_leiji","sgz_mingzong"], 
            img:"extension/大梦千秋/image/sgz_machao.jpg",
            dieAudios:["ext:大梦千秋/audio/sgz_machao/die.mp3"],
            names:"马|超",
            groupInGuozhan:"qun",
            4:["des:西凉锦马超，统领万众铁骑。当他踏入战场之时，甲胄与兵刃皆化为尘土，唯有万马奔腾的轰鸣响彻星域。"] 
        },
    },
    characterName: 'sgz_machao',
    characterTranslate: {
        sgz_machao: "梦马超",
    },
    skills: {
        // === 技能1：【狩骊】 ===
        sgz_shouli: {
            persevereSkill: true,
            audio: "ext:大梦千秋/audio/sgz_machao:4",
            forced: true,
            trigger: { global: "gameStart" },
            priority: 15,
            content: function() {
                "step 0"
                player.logSkill('sgz_shouli');
                var all = game.filterPlayer();
                for (var i = 0; i < all.length; i++) {
                    var target = all[i];
                    //if (target != player) {
                        target.disableEquip(1); 
                        target.disableEquip(2); 
                    //}
                    target.expandEquip(3); 
                    target.expandEquip(4); 
                    target.update();
                }
                "step 1"
                var horses_def = ['jueying', 'dilu', 'hualiu','zhuahuang'];
                var horses_atk = ['chitu', 'dawan', 'zixin'];
                var suits = ['spade', 'heart', 'club', 'diamond'];
                for (var i = 0; i < game.players.length; i++) {
                    var target = game.players[i];
                    for (var j = 0; j < 1; j++) {
                        var card_def = game.createCard({
                            name: horses_def.randomGet(),
                            suit: suits.randomGet(),
                            number: Math.floor(Math.random() * 13) + 1
                        });
                        target.equip(card_def);
                    }
                    for (var k = 0; k < 1; k++) {
                        var card_atk = game.createCard({
                            name: horses_atk.randomGet(),
                            suit: suits.randomGet(),
                            number: Math.floor(Math.random() * 13) + 1
                        });
                        target.equip(card_atk);
                    }
                    game.log(target, '的四骑阵列（双防御马、双进攻马）已整备完毕');
                }
                "step 2"
                game.broadcastAll(function() {
                    ui.update();
                });
            }
        },
        // === 技能2：【雷殛】及其衍生效果 ===
        sgz_leiji: {
            audio: "ext:大梦千秋/audio/sgz_machao:4",
            enable: ["chooseToUse", "chooseToRespond"],
            persevereSkill: true,
            selectCard: 0,
            filter: function(event, player) {
                var cardName = event.filterCard({ name: 'sha' }, player, event) ? 'sha' :
                               event.filterCard({ name: 'shan' }, player, event) ? 'shan' : null;
                if (!cardName) return false;
                var horseType = (cardName == 'sha') ? 'equip4' : 'equip3';
                return game.hasPlayer(t => t.countCards('e', { subtype: horseType }) > 0);
            },
            viewAs: function(cards, player) {
                var event = _status.event;
                if (event.filterCard({ name: 'sha' }, player, event)) return { name: 'sha' };
                if (event.filterCard({ name: 'shan' }, player, event)) return { name: 'shan' };
            },
            filterTarget: function(card, player, target) {
                var horseType = (card.name == 'sha') ? 'equip4' : 'equip3';
                return target.countCards('e', { subtype: horseType }) > 0;
            },
            selectTarget: 1,
            // 「依此法使用的杀不计入次数」：在确认使用的瞬间把上级 chooseToUse/chooseToRespond 事件的 addCount 置为 false，
            // 这样 useCard 事件就不会把这张杀计入本回合使用次数（官方技能的标准写法）
            precontent: function(event) {
                if (event.result && event.result.card && event.result.card.name == 'sha') {
                    event.getParent().addCount = false;
                }
            },
            // === 核心 AI 注入：优先级与特定连招规避 ===
            ai: {
                respondSha: true,
                respondShan: true,
                useShan: true, // 【闪】能用则用
                noe: function(card, player, target) {
                    if (player.isDisabled(1)||player.isDisabled(2)) return 2;
                    return 0;
                },
                order: function(item, player) {
                    var evt = _status.event;
                        if (evt.filterCard({ name: 'sha' }, player, evt)) {
                            // 使用 storage 判断鸣踪是否已用
                            var canMingzong = !player.storage.sgz_mingzong_used;
                            var totalAtkHorses = game.countPlayer(p => p.countCards('e', { subtype: 'equip4' }) == 1) + 2 * game.countPlayer(p => p.countCards('e', { subtype: 'equip4' }) == 2);
                            game.log(player, '当前全场有', totalAtkHorses, '匹进攻马');
                            // 关键限制：全场剩 1 马且没法回收时，禁止亮起技能
                            if (totalAtkHorses <= 1 && !canMingzong) return -5000;
                        }
                        return 25;
                },
                effect: {
                    target: function(card, player, target, current) {
                        // 仅处理【雷殛】转化出的【杀】
                        if (_status.event.skill == 'sgz_leiji' || _status.event.parent?.skill == 'sgz_leiji') {
                            var canMingzong = !player.storage.sgz_mingzong_used;
                            var enemyHasHorse = game.hasPlayer(p => get.attitude(player, p) < 0 && p.countCards('e', { subtype: 'equip4' }) > 0);

                            if (get.attitude(player, target) > 0) {
                                // 核心条件：敌人全场没马 且 我能发动鸣踪
                                if (!enemyHasHorse && canMingzong && target.countCards('e', { subtype: 'equip4' }) > 0) {
                                    // [系数0, 额外分20]：告诉AI，这刀一点都不疼，而且为了送马战略大赚20分！
                                    return [0, 20];
                                }
                                // 不满足战略条件时，对自己人的伤害评估设为极高负分，彻底封死误伤
                                return 0;
                            }
                        }
                    }
                },
                result: {
                    // --- A. 发动欲望：资源枯竭熔断 ---
                    player: function(player) {
                        var evt = _status.event;
                        if (evt.filterCard({ name: 'sha' }, player, evt)) {
                            // 使用 storage 判断鸣踪是否已用
                            var canMingzong = !player.storage.sgz_mingzong_used;
                            var totalAtkHorses = game.countPlayer(p => p.countCards('e', { subtype: 'equip4' }) > 0);
                            // 关键限制：全场剩 1 马且没法回收时，禁止亮起技能
                            if (totalAtkHorses <= 1 && !canMingzong) return -5000;
                        }
                        return 1;
                    },
                    // --- B. 目标选择：战略自残逻辑 ---
                    target: function(player, target) {
                        var evt = _status.event;
                        if (!evt.filterCard({ name: 'sha' }, player, evt)) return -get.attitude(player, target);
                        
                        var canMingzong = !player.storage.sgz_mingzong_used;
                        var att = get.attitude(player, target);
                        var enemyCount = game.countPlayer(p => get.attitude(player, p) < 0);
                        var horseOwners = game.filterPlayer(p => p.countCards('e', { subtype: 'equip4' }) > 0);
                        
                        // === 【核心新增】：唯一马种保护逻辑 ===
                        // 满足：1.敌人多于1名；2.没有鸣踪；3.目标是全场唯一的-1马拥有者
                        if (enemyCount > 1  && !canMingzong && horseOwners.length === 1 && horseOwners.contains(target)) {
                            // 如果目标血量处于危险线（濒死或1血），AI 为了留着这匹马以后用，强制放弃击杀
                            // 返回 0 分，意味着 AI 宁愿不发动雷殛去杀这个残血敌人
                            if (target.hp <= 2 || target.isDying()) return -6000;
                        }

                        if (att > 0) { // 友方或自己
                            var enemyHasHorse = game.hasPlayer(p => get.attitude(player, p) < 0 && p.countCards('e', { subtype: 'equip4' }) > 0);
                            // 只有满足“敌方无马”且“我有鸣踪”时，才允许杀友送马
                            if (!enemyHasHorse && canMingzong && target.countCards('e', { subtype: 'equip4' }) > 0) {
                                return 15; // 高优先级正分
                            }
                            return -200; // 否则物理熔断，绝对不杀自己人
                        }
                        return -att + (target.countCards('e', { subtype: 'equip4' }) ? 30 : 0);
                    }
                }
            },
            onuse: function(result, player) {
                "step 0"
                var target = result.targets[0];
                var cardName = result.card.name;
                var horseType = (cardName == 'sha') ? 'equip4' : 'equip3';
                var horses = target.getCards('e', { subtype: horseType });
                if (horses.length > 0) {
                    target.discard(horses[0]);
                    game.log(player, '弃置了', target, '的坐骑发动【雷殛】');
                    if (target != player) {
                        player.logSkill('sgz_leiji', target);
                        if (!player.storage.sgz_leiji_targets) player.storage.sgz_leiji_targets = [];
                        player.storage.sgz_leiji_targets.add(target);
                        player.addTempSkill('sgz_leiji_effect', { player: 'phaseAfter' });
                        target.addTempSkill('sgz_leiji_thunder', { player: 'phaseAfter' });
                        target.addSkill('sgz_leiji_boom');
                        game.log(player, '对', target, '施加了⚡与💥效果');
                    }
                    if (cardName == 'sha') target.enableEquip(1);
                    if (cardName == 'shan') target.enableEquip(2);
                }
                // 「不计入次数」已由 sgz_leiji.precontent 统一处理
            },
            onrespond: function(result, player) {
                "step 0"
                var cardName = result.card.name;
                var horseType = (cardName == 'sha') ? 'equip4' : 'equip3';
                var chooseEvent = result.getParent("chooseToRespond");
                var target = (chooseEvent && chooseEvent.result && chooseEvent.result.targets && chooseEvent.result.targets[0])
                    || game.findPlayer(t => t != player && t.countCards('e', { subtype: horseType }) > 0);
                if (!target) return;
                var horses = target.getCards('e', { subtype: horseType });
                if (horses.length > 0) {
                    target.discard(horses[0]);
                    if (target != player) {
                        player.logSkill('sgz_leiji', target);
                        if (!player.storage.sgz_leiji_targets) player.storage.sgz_leiji_targets = [];
                        player.storage.sgz_leiji_targets.add(target);
                        player.addTempSkill('sgz_leiji_effect', { player: 'phaseAfter' });
                        target.addTempSkill('sgz_leiji_thunder', { player: 'phaseAfter' });
                        target.addSkill('sgz_leiji_boom');
                        game.log(player, '对', target, '施加了⚡与💥效果');
                    }
                    if (cardName == 'sha') target.enableEquip(1);
                    if (cardName == 'shan') target.enableEquip(2);
                }
                // 「不计入次数」已由 sgz_leiji.precontent 统一处理
            }
        },
            sgz_leiji_effect: {
                charlotte: true,
                onremove: function(player) {
                    if (player.storage.sgz_leiji_targets) {
                        player.storage.sgz_leiji_targets.forEach(function(target){
                            if (target && target.hasSkill('sgz_leiji_boom')) {
                                target.removeSkill('sgz_leiji_boom');
                            }
                        });
                    }
                    delete player.storage.sgz_leiji_targets;
                },
                mod: {
                    targetInRange: function(card, player, target) {
                        if (player.storage.sgz_leiji_targets && player.storage.sgz_leiji_targets.contains(target)) {
                            return true;
                        }
                    },
                    cardUsableTarget: function(card, player, target) {
                        if (player.storage.sgz_leiji_targets && player.storage.sgz_leiji_targets.contains(target)) {
                            return true;
                        }
                    }
                }
            },
            sgz_leiji_thunder: {
                charlotte: true,
                mark: true,
                marktext: "⚡",
                intro: {
                    name: "雷殛·雳",
                    content: "受到的伤害+1且改为雷电伤害"
                },
                trigger: {player: "damageBegin"},
                forced: true,
                content: function() {
                    trigger.num++;
                    trigger.nature = 'thunder';
                    game.log(
                        player,
                        '受⚡影响，伤害+1且改为雷电伤害'
                    );
                },
                // 边框特效：外层电光缠绕（施加于被标记的目标角色，随标记自动挂载/清理）
                init: function(player) {
                    sgzLeijiEnsureStyle();
                    if (!player.leijiThunderFx && player.node) {
                        var fx = document.createElement('div');
                        fx.className = 'leiji-thunder-fx';
                        var NS = 'http://www.w3.org/2000/svg';
                        var boltPath = 'M8,0 L2,9 L5.5,9 L1.5,18 L9,6.5 L5.5,6.5 Z';
                        for (var i = 1; i <= 4; i++) {
                            var svg = document.createElementNS(NS, 'svg');
                            svg.setAttribute('viewBox', '0 0 11 18');
                            svg.setAttribute('class', 'bolt b' + i);
                            var p = document.createElementNS(NS, 'path');
                            p.setAttribute('d', boltPath);
                            p.setAttribute('fill', '#dff4ff');
                            svg.appendChild(p);
                            fx.appendChild(svg);
                        }
                        player.appendChild(fx);
                        player.leijiThunderFx = fx;
                    }
                },
                onremove: function(player) {
                    if (player.leijiThunderFx) {
                        player.leijiThunderFx.remove();
                        delete player.leijiThunderFx;
                    }
                },
            },
            sgz_leiji_boom: {
                charlotte: true,
                mark: true,
                marktext: "💥",
                intro: {
                    name: "雷殛·破",
                    content: "马超对你使用牌无距离和次数限制"
                },
                // 边框特效：四个碎裂"破"字令符挂在卡牌四角（向对角外侧伸出，不堆叠在卡面上）
                init: function(player) {
                    sgzLeijiEnsureStyle();
                    if (!player.leijiBoomFx && player.node) {
                        var fx = document.createElement('div');
                        fx.className = 'leiji-boom-fx';
                        var NS = 'http://www.w3.org/2000/svg';
                        var makeTail = function(idx) {
                            var svg = document.createElementNS(NS, 'svg');
                            svg.setAttribute('viewBox', '0 0 40 80');
                            var defs = document.createElementNS(NS, 'defs');
                            var grad = document.createElementNS(NS, 'linearGradient');
                            grad.setAttribute('id', 'leiji_boom_grad_' + idx);
                            grad.setAttribute('x1', '0'); grad.setAttribute('y1', '0');
                            grad.setAttribute('x2', '0'); grad.setAttribute('y2', '1');
                            [['0', '#5a0c07'], ['1', '#8f1c10']].forEach(function(s) {
                                var st = document.createElementNS(NS, 'stop');
                                st.setAttribute('offset', s[0]);
                                st.setAttribute('stop-color', s[1]);
                                grad.appendChild(st);
                            });
                            defs.appendChild(grad);
                            svg.appendChild(defs);
                            var body = document.createElementNS(NS, 'path');
                            body.setAttribute('d', 'M6,3 L34,3 L34,56 L20,70 L6,56 Z');
                            body.setAttribute('fill', 'url(#leiji_boom_grad_' + idx + ')');
                            body.setAttribute('stroke', '#a02a18');
                            body.setAttribute('stroke-width', '1.5');
                            body.setAttribute('stroke-linejoin', 'round');
                            svg.appendChild(body);
                            var rope = document.createElementNS(NS, 'rect');
                            rope.setAttribute('x', '17'); rope.setAttribute('y', '0');
                            rope.setAttribute('width', '6'); rope.setAttribute('height', '4');
                            rope.setAttribute('fill', '#7a1510');
                            svg.appendChild(rope);
                            var cracks = [
                                'M16,12 L22,20 L17,28 L26,40 L21,50',
                                'M28,15 L25,27 L30,36',
                                'M12,36 L19,44 L14,54'
                            ];
                            var hot = [
                                'M14,22 L22,32 L17,44'
                            ];
                            var mk = function(d, cls) {
                                var p = document.createElementNS(NS, 'path');
                                p.setAttribute('d', d);
                                p.setAttribute('class', cls);
                                return p;
                            };
                            cracks.forEach(function(d) { svg.appendChild(mk(d, 'crack')); });
                            hot.forEach(function(d) { svg.appendChild(mk(d, 'crack-hot')); });
                            var text = document.createElementNS(NS, 'text');
                            text.setAttribute('x', '20'); text.setAttribute('y', '48');
                            text.setAttribute('font-size', '22');
                            text.setAttribute('font-weight', 'bold');
                            text.setAttribute('text-anchor', 'middle');
                            text.setAttribute('fill', '#d8472a');
                            text.textContent = '破';
                            svg.appendChild(text);
                            return svg;
                        };
                        var corners = ['c1', 'c2', 'c3', 'c4'];
                        corners.forEach(function(c, i) {
                            var wrap = document.createElement('div');
                            wrap.className = 'boom-c ' + c;
                            wrap.appendChild(makeTail(i));
                            fx.appendChild(wrap);
                        });
                        player.appendChild(fx);
                        player.leijiBoomFx = fx;
                    }
                },
                onremove: function(player) {
                    if (player.leijiBoomFx) {
                        player.leijiBoomFx.remove();
                        delete player.leijiBoomFx;
                    }
                },
            },
        // === 技能2：【鸣踪】 ===
        sgz_mingzong: {
            audio: "ext:大梦千秋/audio/sgz_machao:4",
            persevereSkill: true,
            trigger: {
                global: ["loseAfter","loseAsyncAfter","cardsDiscardAfter","equipAfter"],
            },
            usable: 1,
            group: "sgz_mingzong_reset",
            ai:{
                expose: 1,
                threaten: 39,
            },
            mod: {
                // 【核心 AI 补丁】：强行让 AI 认为鸣踪锦上添花，无视对手拿马收益
                aiResult: function(player, card, num) {
                    return 500; // 极大正分
                }
            },
            filter: function(event, player) {
                if (!event.getd) {
                    return false;
                }
                let cards = event.getd();
                return cards.some(card => {
                    if (get.position(card) != "d" || get.type(card) != "equip") {
                        return false;
                    }
                    if (card.willBeDestroyed("discardPile", get.owner(card), event)) {
                        return false;
                    }
                    return game.hasPlayer(current => {
                        return current.canEquip(card, true);
                    });
                });
            },
            cost: async function(event, trigger, player) {
                const cards = trigger.getd().filter(card => {
                    if (get.position(card) != "d" || get.type(card) != "equip") {
                        return false;
                    }
                    if (card.willBeDestroyed("discardPile", get.owner(card), trigger)) {
                        return false;
                    }
                    return true;
                });
                const {
                    result: { bool, targets, links },
                } = await player.chooseButtonTarget({
                    createDialog: [get.prompt2(event.skill), cards],
                    filterTarget(card, player, target) {
                        const buttons = ui.selected.buttons;
                        if (!buttons.length) {
                            return false;
                        }
                        return target.canEquip(buttons[0].link, true);
                    },
                    ai1: function(button) {
                        // 进攻马永远是最高优先级 (100)
                        if (get.subtype(button.link) == 'equip4') return 100;
                        if (get.subtype(button.link) == 'equip3') return 80;
                        return 60;
                    },
                    // === 核心 AI 修正：选人逻辑 ===
                    ai2: function(target) {
                        const att = get.attitude(player, target);
                        var enemyCount = game.countPlayer(p => get.attitude(player, p) < 0);
                        var horseOwners = game.filterPlayer(p => p.countCards('e', { subtype: 'equip4' }) > 0);
                        
                        // === 【核心新增】：唯一马种保护逻辑 ===
                        // 满足：1.敌人多于1名；2.全场无-1马；3.其是我们【雷殛】指定的角色   那么我们就不把马给他
                        if (enemyCount > 1  && horseOwners.length == 0 ) {
                            if (target.hp <= 2 && target.hasSkill('sgz_leiji_boom') && target.hasSkill('sgz_leiji_thunder')) return 0;
                        }
                        // --- 核心 AI：送马逻辑 ---
                        // 目标 1：优先还给刚被标记过的敌人 (连招)
                        if (att < 0 && target.hasSkill('sgz_leiji_boom') && target.hasSkill('sgz_leiji_thunder')) return 300;
                        // 目标 2：还给手牌最多的敌人 (贪婪掠夺)
                        if (att < 0) return 200 + target.countCards('h') * 20;
                        // 目标 3：实在没敌人了，还给快死的队友保命
                        if (att >= 0 && target != player ) return target.countCards('h') * 20;
                        return 5;
                    }
                });
                event.result = {
                    bool: bool,
                    targets: targets,
                    cards: links,
                };
            },
            content: async function(event, trigger, player) {
                const {
                    targets: [target],
                    cards: [card],
                } = event;
                // === 【核心新增】：打下“鸣踪已使用”标记 ===
                player.storage.sgz_mingzong_used = true;

                target.$gain2(card);
                await game.delay();
                await target.equip(card);
                const num = target.countCards("h");
                if (num > 0 && target != player) {
                    await player.gainPlayerCard(target, true, "h", num);
                }
            },
            subSkill: {
                // 辅助：每当马超回合开始，重置标记
                reset: {
                    trigger: { player: "phaseBegin" },
                    forced: true, silent: true,
                    content: function() {
                        delete player.storage.sgz_mingzong_used;
                    }
                }
            },
            "_priority": 0,
        }
    },
    skillTranslate: {
        sgz_shouli: "狩骊",
        sgz_shouli_info: "锁定技，游戏开始时，所有角色废除武器栏与防具栏并获得一个额外的进攻马栏与防御马栏，然后依次装备一张游戏外的进攻马和防御马（随机花色点数）。",
        sgz_leiji: "雷殛",
        sgz_leiji_info: "当你需要使用或打出【杀】/【闪】时，你可以弃置一名角色装备区的第一张进攻/防御坐骑牌，视为你使用或打出了一张【杀】/【闪】（依此法使用的杀不计入次数且目标始终为为依此法失去坐骑牌的角色），依此法失去坐骑牌的其他角色：①受到的伤害+1且改为雷电伤害直到其回合结束；②你对其使用牌无距离次数限制直到你的回合结束。此牌结算后，依此法失去了进攻/防御坐骑牌的角色若有废除的武器栏/防具栏，恢复之。",
        sgz_mingzong:"鸣踪",
        sgz_mingzong_info:"每回合限一次，当有装备牌被弃置时，你可以将其中一张置入一名角色装备区，然后获得其所有手牌。",
    },
    characterTaici: {
        "sgz_shouli": { order: 1, content: "敢缚苍龙擒猛虎，一枪纵横定天山！/马踏祁连山河动，兵起玄黄奈何天！/此身独傲，天下无不可敌之人，无不可去之地！/神威天降，世间无不可驭之雷，无不可降之马！" },
        "sgz_leiji": { order: 2, content: "横枪立马，独啸秋风！/世皆彳亍，唯我纵横！/赤骊骋疆，巡狩八荒！/长缨在手，百骥可降！" },
        "sgz_mingzong": { order: 3, content: "雷部显圣，引赤电为翼，铸霹雳成枪！/一骑破霄汉，饮马星河，醉卧广寒！/饲骊胡肉，饮骥虏血，一骑可定万里江山！/折兵为弭，纫甲为服，此箭可狩在野之龙！" },
        "die": { content: "七情难掩，六欲难消，何谓之神？" }
    },
}