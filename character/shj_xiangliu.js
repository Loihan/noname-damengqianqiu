 export default {
    character: {
        // === 修改点: 在最后一个数组中加入 "des:" 简介 ===
        shj_xiangliu: [
            "male", 
            "shen", 
            9, 
            ["shj_huiyan", "shj_mingzhai", "shj_qishou", "shj_jiumo"], 
            [
                "des:相柳，又称相繇，上古水神共工之臣，蛇身九首，食人无数，所到之处，尽成泽国。其血腥臭，沾染土地则五谷不生，触及河川则人畜皆亡，乃不折不扣之上古凶神。",
                "ext:大梦千秋/image/shj_xiangliu.jpg",
                "die:ext:大梦千秋/audio/shj_xiangliu/die.mp3"
            ]
        ],
    },
    characterName: 'shj_xiangliu',
    characterTranslate: {
        shj_xiangliu: "相柳",
    },
    skills: {
        // === 修改点: 标记ID和显示文本已更新 ===
shj_huizhai_mark: {
    charlotte: true,
    mark: true,
    marktext: "秽债",
    intro: {
        name: "秽债",
        content: "mark",
    },
    onremove: function(player, skill) {
        delete player.storage[skill];
        delete player.storage.shj_huizhai_mark_source;
    },
    mod: {
        // === 核心修正点: 手牌上限惩罚对自己无效 ===
        maxHandcard: function(player, num) {
            // 检查拥有此标记的角色(player)是否就是此标记的来源(player.storage.shj_huizhai_mark_source, 即相柳)
            // 如果是，则不施加任何惩罚
            if (player == player.storage.shj_huizhai_mark_source) {
                return num;
            }
            // 否则，对其他角色施加惩罚
            var x = Math.ceil(player.countMark('shj_huizhai_mark') / 2);
            return num - x;
        }
    }
},
shj_huiyan: {
    audio: "ext:大梦千秋/audio/shj_xiangliu:3",
    persevereSkill: true,
    trigger: { player: "phaseZhunbeiBegin" },
    direct: true,
    content: function() {
        'step 0'
        var num_targets = Math.min(player.hp, game.countPlayer());
        player.chooseTarget(
            get.prompt('shj_huiyan'),
            `请选择至多${num_targets}名角色，令他们各获得一个“秽债”标记。`,
            [1, num_targets]
        ).set('ai', target => -get.attitude(_status.event.player, target));
        'step 1'
        if(result.bool && result.targets) {
            player.logSkill('shj_huiyan', result.targets);
            for(var target of result.targets) {
                if(!target.hasSkill('shj_huizhai_mark')) target.addSkill('shj_huizhai_mark');
                target.addMark('shj_huizhai_mark', 1);
                target.storage.shj_huizhai_mark_source = player;
            }
        }
    },
    group: ["shj_huiyan_damage"],
    subSkill: {
        damage: {
            trigger: { global: "damageEnd" },
            forced: true,
            filter(event, player) {
                // === 修改点: 增加 event.player != player 条件 ===
                return event.player.hasSkill('shj_huizhai_mark') && event.player != player && event.player.countCards('h') > 0;
            },
            content: function() {
                var target = trigger.player;
                player.logSkill('shj_huiyan', target);
                player.gainPlayerCard(target, 'h', true);
            }
        },
    }
},
shj_mingzhai: {
    persevereSkill: true,
    audio: "ext:大梦千秋/audio/shj_xiangliu:5",
    // === 核心修改点: mod.maxHandcard 现在只计算玩家自身的标记数 ===
    mod: {
        maxHandcard: function(player, num) {
            // 检查相柳自己身上是否有“秽债”标记
            if (player.hasSkill('shj_huizhai_mark')) {
                // 计算 bonus，X 为相柳“自己”的“秽债”标记数的一半
                var bonus = Math.ceil(player.countMark('shj_huizhai_mark'));
                return num + bonus;
            }
            return num;
        }
    },
    group: ["shj_mingzhai_end", "shj_mingzhai_damaged"],
    subSkill: {
        end: {
            trigger: { player: "phaseJieshuBegin" },
            forced: true,
            content: function() {
                'step 0'
                event.targets = game.filterPlayer(p => p != player && p.hasSkill('shj_huizhai_mark') && p.countCards('he') > 0);
                if(event.targets.length > 0) {
                    player.logSkill('shj_mingzhai', event.targets);
                    event.num = 0;
                } else {
                    event.finish();
                }
                'step 1'
                if (event.num < event.targets.length) {
                    var target = event.targets[event.num];
                    player.gainPlayerCard(target, 'he', true);
                    event.num++;
                    event.redo();
                }
            }
        },
        damaged: {
            trigger: { player: "damageEnd" },
            forced: true,
            filter: (event, player) => event.source && event.source != player,
            content: function() {
                var target = trigger.source;
                player.logSkill('shj_mingzhai', target);
                if(!target.hasSkill('shj_huizhai_mark')) target.addSkill('shj_huizhai_mark');
                target.addMark('shj_huizhai_mark', trigger.num);
                target.storage.shj_huizhai_mark_source = player;
            }
        },
    }
},
        shj_qishou: {
            persevereSkill: true,
            audio: "ext:大梦千秋/audio/shj_xiangliu:5",
            group: ["shj_qishou_damage", "shj_qishou_lastcard"],
            subSkill: {
                damage: {
                    trigger: { source: "damageBegin1" },
                    direct: true,
                    filter(event, player) {
                        return event.player.hasSkill('shj_huizhai_mark');
                    },
                    async content(event, trigger, player) {
                        var target = trigger.player;
                        const {result} = await player.chooseBool(get.prompt('shj_qishou', target), `是否发动【契狩】，移除其一个“秽债”标记，令此伤害+1？`).set('ai', () => get.attitude(_status.event.player, target) < 0);
                        
                        if(result.bool) {
                            player.logSkill('shj_qishou', target);
                            target.removeMark('shj_huizhai_mark', 1);
                            if(target.countMark('shj_huizhai_mark') == 0) {
                                target.removeSkill('shj_huizhai_mark');
                            }
                            trigger.num++;
                        }
                    }
                },
                lastcard: {
                    trigger: { global: "loseEnd" },
                    direct: true,
                    filter(event, player) {
                        var target = event.player;
                        if (!target.hasSkill('shj_huizhai_mark')) return false;
                        if (target.countCards('h')) return false;
                        for (var i = 0; i < event.cards.length; i++) {
                            if (event.cards[i].original == "h") return true;
                        }
                        return false;
                    },
                    async content(event, trigger, player) {
                        var target = trigger.player;
                        const {result} = await player.chooseBool(get.prompt('shj_qishou', target), `是否发动【契狩】，移除其所有“秽债”标记，并对其造成等量伤害？`).set('ai', () => true);
                        
                        if(result.bool) {
                            player.logSkill('shj_qishou', target);
                            var num = target.countMark('shj_huizhai_mark');
                            if(num > 0) {
                                target.removeMark('shj_huizhai_mark', num);
                                target.removeSkill('shj_huizhai_mark');
                            }
                            await target.damage(player, num, 'nocard');
                        }
                    }
                }
            }
        },
shj_jiumo: {    
    persevereSkill: true,
    audio: "ext:大梦千秋/audio/shj_xiangliu:4",
    // === 核心修改点: 将技能主体改为一个技能组容器 ===
    group: ["shj_jiumo_dying", "shj_jiumo_draw"],
    // subSkill 对象现在包含了两个独立的子技能
    subSkill: {
        // 子技能1: 负责濒死效果，并包含所有特效
        dying: {
            audio: "ext:大梦千秋/audio/shj_xiangliu:4",
            // 特效只在这里定义，不会影响其他子技能
            skillAnimation: true,
            animationColor: "fire",
            trigger: { player: "dying" },
            forced: true,
            filter: (event, player) => player.maxHp > 1,
            content: function() {
                'step 0';
                player.logSkill('shj_jiumo'); // logSkill 依然使用主技能名
                player.$fullscreenpop('九殁', 'fire');
                player.chooseToDiscard(player.maxHp, 'he', true)
                .set('ai', card => 5 - get.value(card));
                'step 1';
                event.x = result.cards.length;
                player.loseMaxHp();
                'step 2';
                var recover_num = event.x - player.hp;
                if(recover_num > 0) player.recover(recover_num);
                'step 3';
                var num_targets = Math.min(event.x, game.countPlayer(p => p.hasSkill('shj_huizhai_mark')));
                if(num_targets > 0) {
                    player.chooseTarget(
                        `九殁：请选择至多${num_targets}名有“秽债”标记的角色`,
                        [1, num_targets],
                        (card, player, target) => target.hasSkill('shj_huizhai_mark'),
                        true
                    ).set('ai', target => -get.attitude(_status.event.player, target));
                } else { event.finish(); }
                'step 4';
                if(result.bool && result.targets) {
                    event.targets = result.targets.sortBySeat();
                    event.num = 0;
                } else { event.finish(); }
                'step 5';
                var target = event.targets[event.num];
                if(target) {
                    event.target = target;
                    var choiceList = [];
                    if(target.maxHp > 1) choiceList.push('减少一点体力上限');
                    if(target.hp != 1) choiceList.push('调整体力为1');
                    if(target.countCards('h') >= 3) choiceList.push('弃置所有手牌');
                    
                    if(choiceList.length > 0) {
                         target.chooseControl(choiceList).set('prompt', `九殁：请选择一项`).set('ai', () => choiceList[0]);
                    } else { event.goto(7); }
                } else { event.finish(); }
                'step 6';
                var choice = result.control;
                var target = event.target;
                if (choice == '减少一点体力上限') target.loseMaxHp();
                else if (choice == '调整体力为1') target.loseHp(target.hp - 1);
                else if (choice == '弃置所有手牌') target.discard(target.getCards('h'));
                'step 7';
                event.num++;
                if (event.num < event.targets.length) event.goto(5);
            },
        },
        // 子技能2: 负责摸牌效果，没有任何特效
        draw: {
            audio: "ext:大梦千秋/audio/shj_xiangliu:4", // 可以有自己的音效
            trigger: { player: "loseEnd" },
            frequent: true, // 设为frequent，使其自动发动，不打扰玩家
            filter: function(event, player) {
                if (_status.currentPhase == player) return false;
                for (var i = 0; i < event.cards.length; i++) {
                    if (event.cards[i].original == 'h') return true;
                }
                return false;
            },
            content: function() {
                player.logSkill('shj_jiumo_draw'); // logSkill 使用子技能名，避免混淆
                player.draw();
            }
        }
    }
},
    },
skillTranslate: {
    shj_huiyan: "秽宴",
    shj_huiyan_info: "你的准备阶段，你令至多等同于你体力值的角色各获得一个“秽债”标记。当有“秽债”标记的其他角色受到伤害时，你获得其一张手牌。",
    shj_mingzhai: "溟债",
    shj_mingzhai_info: "结束阶段，你获得所有有“秽债”标记的其他角色的一张牌；其他角色对你造成伤害时，其获得等量“秽债”标记；有“秽债”标记的其他角色的手牌上限-X，你的手牌上限+Y（X为其“秽债”标记数的一半，向上取整，Y为你的“秽债”标记数）。",
    shj_qishou: "契狩",
    shj_qishou_info: "当你对有“秽债”标记的角色造成伤害时，你可以移除其一个“秽债”标记，令此伤害+1；当有“秽债”标记的角色失去最后一张手牌时，你可以移除其所有“秽债”标记，并对其造成等量点伤害。",
    shj_jiumo: "九殁",
    shj_jiumo_info: "①当你于回合外失去手牌时，你摸一张牌；<br>②当你进入濒死状态时，若你的体力上限大于1，你弃置等同于体力上限张牌（不足则全弃），并记录弃牌量为X，然后减少一点体力上限，回复体力至X。然后，你可以选择至多X名有“秽债”标记的角色，令其选择一项（需满足括号内的条件才能选择对应选项，若都不满足则无需选择）：<br>1.减少一点体力上限（体力上限不为1）；<br>2.调整体力为1（体力值不为1）；<br>3.弃置所有手牌（手牌数≥3）。",
}, 
characterTaici:{
    "shj_huiyan":{ order:1 ,content:"蛇不喜欢太听话的猎物，明白吗？/无趣，不如来场捉迷藏吧？/无需压抑自我，此为天赋，绝非诅咒。"},
    "shj_mingzhai":{ order:2 ,content:"我闻到了，仇恨的味道！/下一件藏品，会是谁呢？/你藏好了吗?/账本，是用来记仇的。/逃，是没有用的。"},
    "shj_qishou":{ order:3 ,content:"毒蛇冥沼！/幽契索命！/有约无信者，诛！/成为我的影子吧！/清算无遗！"},
    "shj_jiumo":{ order:4 ,content:"账簿寻仇，一债一命！/以身设局，请君赴约/化身黑暗，方能终结黑暗！/银货两讫，契成无悔！"},
    "die":{content:"我...宽恕众生..."}
}
};