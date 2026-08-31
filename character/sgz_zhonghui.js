export default {
    character: {
        // 梦钟会：势力神，体力1，上限按原版逻辑由技能维持
        sgz_zhonghui: {
            sex:"male", 
            group:"wei",
            hp:1,
            maxHp:1, 
            skills:["sgz_quanhuan", "sgz_jiaozhao", "sgz_jitian", "sgz_zhuyue", "sgz_xingfa","sgz_audio_effect", "sgz_zhonghui_texiao", "sgz_zhonghui_ui"], 
            img:"extension/大梦千秋/image/sgz_zhonghui.jpg",
            dieAudios:["ext:大梦千秋/audio/sgz_zhonghui/die/die.mp3"],
            names:"钟|会",
            groupInGuozhan:"qun",
            4:["des:钟会字士季，颖川之杰也。少负绝代之才，精于权略，时人比之子房。<br>景元四年，会统大军入蜀，剑指成都。及蜀汉既平，会功冠诸军，然其心高傲，不甘久居司马氏之下。彼深忿邓艾先入之功，遂假权谋之策，诬艾谋逆，籍没其军，由是独擅益州，威震西南。<br>会有揽月逐影之志，自谓才足冠世，何必为人臣之列？见洛阳篡臣当道，汉鼎迁移，遂萌觊觎神器之心。会乃称帝于成都，布告天下，正式自立。司马昭闻变震怒，起倾国之兵远征。会仗剑立于剑阁，激赏士卒，反兴义师而北伐。是役也，会奇计百出，诱敌深入于巴蜀险峻之间，终使中原大军折戟山谷。<br>自此，会据秦岭之险，分天下之半，三足鼎立之势复兴。后世论之，谓其志虽肆，其才实奇，终能于乱世孤影之中，强自逐月，开一朝之基命，成不世之枭雄。",] 
        },
    },
    characterName: 'sgz_zhonghui',
    characterTranslate: {sgz_zhonghui: "梦钟会",},
    characterTitle: {sgz_zhonghui: "白霜降世",},
    skills: {
        // === 1. 权患   ===
        sgz_quanhuan: {
            forced: true,
            trigger: {
                global: "phaseBefore",
                player: "enterGame",
            },
            filter(event, player) {
                return event.name != "phase" || game.phaseNumber == 0;
            },
            marktext: "权",
            persevereSkill: true,
            mark: true,
            intro: {
                name: "权",
                content: "mark",
            },
            ai: {
                noh: true,
                nogain: true,
                freeSha: true,
                freeShan: true,
                maixie: true,
                // === 【核心修改】：患标记少于2时，诱导AI主动受创 ===
                effect: {
                    target: function(card, player, target) {
                        // 如果“患”标记少于 2，大幅提升受伤收益评分
                        if (target.countMark('sgz_quanhuan_huan') < 2) {
                            if (get.tag(card, 'damage')) return [1, 1]; 
                        }
                    }
                }
            },
            // 音频路径适配
            audio: "ext:大梦千秋/audio/sgz_zhonghui/skill:12", //开局一声获得4权
            mod: {
                // A. 价值评估：锦囊牌和核心装备被视为顶级资源
                aiValue: function(player, card, num) {
                    if (card.name == 'zhuge') return 1000;     // 连弩：神器
                    if (card.name == 'guanshi') return 900; 
                    if (card.name == 'qinglong') return 200;
                    if (get.type(card) == 'equip') return 150;
                    return num * 0.4;
                },
                
                // B. 使用意愿：消除 AI 的顾虑，实现“无脑用”
                aiUseful: function(player, card, num) {
                    if (card.name == 'zhuge') return 1000;
                    // 锦囊牌即便在常规判定中收益为负（如五谷救了敌人），在这里也被视为绝对有用
                    if (get.type(card) == 'trick') return 150;
                    if (card.name == 'jiu') return 4;
                    return num * 2;
                },
                
                // C. 收益重写 (关键点)：强行让 AI 认为锦囊总是正收益
                aiResult: function(player, card, num) {
                    // 对于所有锦囊（包含桃园、五谷、南蛮等），强行返回正数
                    
                    if (card.name == 'jiu') return 95;
                },
                // D. 【核心修复】：劫持底层效果评估，强行无视队友伤害
                effect: function(card, player, target, current) {
                    if (get.type(card) == 'trick') {
                        // 逻辑：如果是我在使用锦囊，且目标是我珍视的人（主公/队友）
                        if (get.attitude(player, target) > 0) {
                            // 告诉 AI：只要是我开的锦囊，对队友就是 0 伤害 + 20 分纯收益
                            // 这会彻底废掉 AI 的“伤害主公”预警
                            return [0, 20]; 
                        }
                        return [1, 10];
                    }
                },

                // E. 出牌优先级：锦囊必须排在最前面使用
                aiOrder: function(player, card, num) {
                    if (num > 0) {return num; }
                    if (card.name === "zhuge" && player.getCardUsable("sha", true) < 6) {
                        return 1;
                    }
                    if (card.name === "guanshi" && player.getCardUsable("sha", true) < 6) {
                        return 2;
                    }
                    if (card.name === "qinglong" && player.getCardUsable("sha", true) < 6) {
                        return 3;
                    }
                },

                // 距离逻辑保留
                targetInRange: function(card, player, target) {
                    if (card.name == "sha") return true;
                },
            },
            content() {
                player.addMark("sgz_quanhuan", 4);
            },
            group: ["sgz_quanhuan_huan", "sgz_quanhuan_num", "sgz_quanhuan_lose"],
            subSkill: {
                num: {
                    persevereSkill: true,
                    trigger: {
                        player: ["loseAfter", "recoverAfter", "addMark", "removeMark"],
                        global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
                    },
                    forced: true,
                    filter(event, player) {
                        return player.countCards("h") != player.countMark("sgz_quanhuan");
                    },
                    content() {
                        const num = player.countMark("sgz_quanhuan") - player.countCards("h");
                        if (num > 0) player.draw(num);
                        else player.chooseToDiscard("h", true, -num);
                    },
                },
                huan: {
                    audio: "ext:大梦千秋/audio/sgz_zhonghui/skill:8",
                    persevereSkill: true,
                    mark: true,
                    intro: {
                        name: "患",
                        content: "mark",
                    },
                    marktext: "患",
                    trigger: {
                        player: ["damageBegin", "loseHpBegin", "loseMaxHpBegin"],
                    },
                    forced: true,
                    filter(event, player) {
                        return event.num > 0 && !event.sgz_quanhuan_huan;
                    },
                    lastDo: true,
                    content() {
                        trigger.cancel();
                        player.addMark("sgz_quanhuan_huan", trigger.num);
                        game.playAudio('../extension/大梦千秋/audio/sgz_zhonghui/clanxieshu.mp3');
                        if(player.countMark("sgz_quanhuan_huan") > 2 ) player.node.avatar.setBackgroundImage('extension/大梦千秋/image/sgz_zhonghui2.jpg');
                    },
                },
                lose: {
                    audio: "ext:大梦千秋/audio/sgz_zhonghui/skill:4",
                    persevereSkill: true,
                    trigger: {
                        player: "phaseUseAfter",
                    },
                    filter(event, player) {
                        return player.countMark("sgz_quanhuan_huan");
                    },
                    forced: true,
                    lastDo: true,
                    // 保留范本中的 async
                    async content(event, trigger, player) {
                        player.damage("nosource", "nocard", player.countMark("sgz_quanhuan_huan")).sgz_quanhuan_huan = true;
                    },
                },
            },
        },
        // === 2. 矫诏  ===
        sgz_jiaozhao: {
            audio: "ext:大梦千秋/audio/sgz_zhonghui/skill:10",
            persevereSkill: true,
            enable: ["chooseToUse", "chooseToRespond"],
            // 修改点：出牌阶段限两次
            usable: 2,
            filter(event, player) {
                if (!player.countMark("sgz_quanhuan_huan") || _status.currentPhase != player) return false;
                for (const name of lib.inpile) {
                    if (get.type(name) == "trick") {
                        if (event.filterCard(get.autoViewAs({ name: name }, "unsure"), player, event)) return true;
                    }
                }
                return false;
            },
            hiddenCard(player, name) {
                if (_status.currentPhase != player) return false;
                return name == "wuxie";
            },
            ai: {
                order: 1,
            },
            chooseButton: {
                dialog(event, player) {
                    const list = [];
                    for (const name of lib.inpile) {
                        if (get.type(name) != "trick") continue;
                        if (event.filterCard(get.autoViewAs({ name: name }, "unsure"), player, event)) list.push([get.translation(get.type(name)), "", name]);
                    }
                    const dialog = ui.create.dialog("矫诏");
                    dialog.add([list, "vcard"]);
                    return dialog;
                },
                filter(button, player) {
                    return _status.event.getParent().filterCard({ name: button.link[2] }, player, _status.event.getParent());
                },
                check(button) {
                    if (_status.event.getParent().type != "phase") return 1;
                    const player = _status.event.player;
                    if (["wugu", "zhulu_card", "yiyi", "lulitongxin", "lianjunshengyan", "diaohulishan"].includes(button.link[2])) return 0;
                    return player.getUseValue({ name: button.link[2], nature: button.link[3] });
                },
                backup(links, player) {
                    return {
                        filterCard: true,
                        position: "hes",
                        selectCard: 0,
                        viewAs: { name: links[0][2] },
                        precontent() {
                            player.removeMark("sgz_quanhuan_huan", 1);
                            player.logSkill("sgz_jiaozhao");
                            if(player.countMark("sgz_quanhuan_huan") <= 2 ) player.node.avatar.setBackgroundImage('extension/大梦千秋/image/sgz_zhonghui.jpg');
                            // 修改点：弃置任意张牌，也可以不弃
                            player.chooseToDiscard('he', [0, Infinity], `###矫诏###你可以弃置任意数量的牌`).set("ai", card => 4.6 - get.value(card));
                        },
                    };
                },
                prompt(links, player) {
                    return "视为使用" + get.translation(links[0][2]);
                },
            },
        },
        // === 3. 觊天  ===
        sgz_jitian: {
            audio: "ext:大梦千秋/audio/sgz_zhonghui/skill:7",
            persevereSkill: true,
            enable: ["chooseToUse", "chooseToRespond"],
            filterCard(card) {
                const suit = get.suit(card);
                return ["heart", "spade"].includes(suit);
            },
            viewAs: {
                name: "tao",
            },
            viewAsFilter(player) {
                return player.countCards("she", { suit: "heart" }) + player.countCards("she", { suit: "spade" }) > 0;
            },
            position: "she",
            prompt: "将一张♥或♠牌当【桃】使用",
            check(card) {
                return 9 - get.value(card);
            },
            ai: {
                order: 0.5,
                save:true,
                result: {
                    target: function(player, target) {
                        // 情况 1：目标是自己，始终支持
                        if (player == target) return 1;
                        // 情况 2：目标是队友
                        if (get.attitude(player, target) > 0) {
                            // 只有权标记为 4 时，才愿意救队友
                            if (player.countMark('sgz_quanhuan') >= 4) return 1;
                            // 权标记不足时，假装没看到队友求救
                            return 0;
                        }
                        return 0;
                    }
                },
            },
            group: "sgz_jitian_end",
            subSkill: {
                end: {
                    
                    // 时机：任何人的回合结束后
                    trigger: { global: "phaseAfter" },
                    forced: true,
                    silent: true,
                    filter(event, player) {
                        // 逻辑：检查梦钟会本回合内是否发动过“觊天”
                        return player.hasHistory('useSkill', function(evt) {
                            return evt.skill == 'sgz_jitian';
                        });
                    },
                    content: function() {
                        "step 0"
                        // 1. 若有“权”标记，则移除一个
                        if (player.countMark("sgz_quanhuan") > 0) {
                            player.removeMark("sgz_quanhuan", 1);
                        }
                        // 2. 若有“患”标记，则移除一个
                        if (player.countMark("sgz_quanhuan_huan") > 0) {
                            player.removeMark("sgz_quanhuan_huan", 1);
                            if(player.countMark("sgz_quanhuan_huan") <= 2 ) player.node.avatar.setBackgroundImage('extension/大梦千秋/image/sgz_zhonghui.jpg');
                        }
                        game.log(player, '因在本回合发动过【觊天】，移除了标记');
                    }
                }
            }
        },
        // === 4. 逐月  ===
        sgz_zhuyue: {
            audio: "ext:大梦千秋/audio/sgz_zhonghui/skill:3",
            persevereSkill: true,
            init(player) {
                player.storage.sgz_zhuyue = 0;
            },
            mark: true,
            intro: {
                content(storage, player) {
                    return `本局游戏造成的伤害数：${storage}`;
                },
            },
            trigger: {
                source: "damageBegin",
            },
            filter(event, player) {
                return event.num > 0;
            },
            direct: true,
            content() {
                if (player.storage.sgz_zhuyue % 2 > 0) {
                    if ((player.storage.sgz_zhuyue + trigger.num) % 2 == 0) {
                        player.changeHujia(1);
                        if (player.countMark("sgz_quanhuan") < 4) {
                            player.chooseToDiscard(1, "she", "弃置一张牌并获得一枚“权”标记。");
                            player.addMark("sgz_quanhuan", 1);
                        }
                    }
                    player.storage.sgz_zhuyue += trigger.num;
                } else {
                    player.storage.sgz_zhuyue += trigger.num;
                }
                player.markSkill("sgz_zhuyue");
            },
        },
        // === 5. 兴伐  ===
        sgz_xingfa: {
            audio: "ext:大梦千秋/audio/sgz_zhonghui/skill:4",
            persevereSkill: true,
            forced: true,
            ai: {expose: 1,},
            // 技能主时机：准备阶段选目标
            trigger: { player: "phaseZhunbeiBegin" },
            // 挂载子技能，处理核心的体力上限调整逻辑
            group: "sgz_xingfa_logic",
            async content(event, trigger, player) {
                player.logSkill('sgz_xingfa');
                const { result } = await player.chooseTarget(
                    '兴伐：请选择一名角色对其造成1点伤害并即时调整其体力上限',
                    true
                ).set('ai', function(target) {
                    // 1. 基本态度判断（只打敌人）
                    var att = get.attitude(player, target);
                    if (att > 0) return 0;
                    
                    var score = 1;
                    // 2. 核心逻辑：已损失体力值多者优先
                    var lostHp = target.maxHp - target.hp;
                    score += lostHp * 10;
                    
                    // 3. 逻辑：若已损失相同，则当前体力低者优先
                    score += (10 - target.hp) * 2;
                    
                    score -= att;
                    
                    
                    return score;
                });

                if (result.bool && result.targets) {
                    const target = result.targets[0];
                    // 标记该次伤害来源，防止误伤（确保只调整兴伐造成的伤害）
                    const damageEvt = target.damage(1);
                    damageEvt.sgz_xingfa = true; 
                    await damageEvt;
                }
            },
            subSkill: {
                logic: {
                    // 核心修正：监听伤害造成的一瞬间
                    trigger: { source: "damage" },
                    forced: true,
                    silent: true,
                    // 只有是兴伐造成的伤害才触发调整
                    filter: function(event, player) {
                        return event.sgz_xingfa === true && event.player.isAlive();
                    },
                    content: function() {
                        "step 0"
                        var target = trigger.player;
                        // 依照范本：计算差值并强行扣减
                        var diff = target.maxHp - target.hp;
                        if (diff > 0) {
                            game.log(target, '受到【兴伐】影响，调整体力上限至', target.hp);
                            // 第二参数 true 表示强制/静默调整，无视其他技能干预
                            target.loseMaxHp(diff, true); 
                        }
                    }
                }
            }
        },
        // === 特写音效控制器 ===
        "sgz_zhonghui_texiao": {
            charlotte: true, // 隐藏技能
            forced: true,
            silent: true,
            trigger: {
                global: "dieAfter",            // 监听全场死亡
                target: "useCardToTarget",     // 监听自己成为卡牌目标
            },
            filter: function(event, player) {
                // 1. 击杀逻辑：如果是击杀（source是自己）或者是在自己的回合内有人死亡
                if (event.name == 'die') {
                    return event.source == player || _status.currentPhase == player;
                }
                // 2. 判定逻辑：如果是成为了“延时性锦囊”的目标
                if (event.name == 'useCardToTarget') {
                    return get.type(event.card) == 'delay';
                }
                return false;
            },
            content: function() {
                "step 0"
                if (trigger.name == 'die') {
                    // 播放击杀/回合内死亡音效
                    game.playAudio('../extension/大梦千秋/audio/sgz_zhonghui/texiao/sgz_texiao_death.mp3');
                } else {
                    // 播放成为延时锦囊目标音效
                    game.playAudio('../extension/大梦千秋/audio/sgz_zhonghui/texiao/sgz_texiao_judge.mp3');
                }
            }
        },        
        // === 6. 【权患】双生计量 UI（隐藏技能：剑身=权能量条，护手圆珠=患核，挂载武将牌右侧）===
        sgz_zhonghui_ui: {
            charlotte: true,
            trigger: {
                player: ["enterGame", "addMark", "removeMark"],
                global: ["gameStart", "roundStart", "phaseBegin"]
            },
            forced: true,
            silent: true,
            priority: -10,
            init: function(player) {
                // 1. 注入样式
                if (!document.getElementById('zhonghui_gauge_style')) {
                    var style = document.createElement('style');
                    style.id = 'zhonghui_gauge_style';
                    style.innerHTML = `
                        /* 容器：挂载在武将牌节点上，绝对定位到右侧 */
                        .zhonghui-gauge-wrap {
                            position: absolute; left: 100%; bottom: 0;
                            margin-left: 2px; width: 53px; height: 100%;
                            z-index: 60; pointer-events: none;
                            display: flex; flex-direction: column; align-items: center; justify-content: center;
                        }
                        /* 剑形权患计量（剑身=权，护手圆珠=患） */
                        .zhonghui-quan-sword {
                            width: 100%; height: auto; flex: none;
                            transition: filter 0.4s;
                        }
                        /* 平滑换色（JS 驱动颜色插值 + CSS 过渡收尾，避免换档跳变） */
                        .zhonghui-quan-sword .orb-fill,
                        .zhonghui-quan-sword .orb-ring,
                        .zhonghui-quan-sword .huan-num,
                        .zhonghui-quan-sword .huan-text,
                        .zhonghui-quan-sword .blade-fill,
                        .zhonghui-quan-sword .blade-front,
                        .zhonghui-quan-sword .flame {
                            transition: fill 0.45s, stroke 0.45s;
                        }
                        /* 剑身内部流光（斜向光带往复） */
                        .zhonghui-quan-sword .blade-shimmer {
                            animation: zh-shimmer 2.4s infinite linear;
                        }
                        @keyframes zh-shimmer {
                            from { transform: translateX(-24px); }
                            to { transform: translateX(24px); }
                        }
                        /* 护手圆珠边框燃火（患 >2 显现） */
                        .zhonghui-quan-sword .flame { opacity: 0; }
                        .zhonghui-gauge-wrap[data-tier="1"] .flame,
                        .zhonghui-gauge-wrap[data-tier="2"] .flame,
                        .zhonghui-gauge-wrap[data-tier="3"] .flame {
                            opacity: 1;
                            animation: zh-flame-flick 1.15s infinite ease-in-out;
                            transform-origin: 50% 100%; transform-box: fill-box;
                        }
                        @keyframes zh-flame-flick {
                            0%, 100% { transform: scale(1); opacity: 0.8; }
                            30% { transform: scale(1.28); opacity: 1; }
                            65% { transform: scale(0.86); opacity: 0.6; }
                        }
                        /* 患 危势光效（颜色由 JS 平滑渐变，此处只管光晕/脉冲/粒子） */
                        .zhonghui-gauge-wrap[data-tier="0"] .zhonghui-quan-sword { filter: drop-shadow(0 0 3px rgba(96,116,136,0.35)); }
                        .zhonghui-gauge-wrap[data-tier="1"] .zhonghui-quan-sword { filter: drop-shadow(0 0 5px rgba(170,90,35,0.5)); }
                        .zhonghui-gauge-wrap[data-tier="2"] .zhonghui-quan-sword {
                            filter: drop-shadow(0 0 7px rgba(190,70,30,0.6));
                            animation: zh-danger-pulse 1.3s infinite ease-in-out;
                        }
                        .zhonghui-gauge-wrap[data-tier="3"] .zhonghui-quan-sword {
                            filter: drop-shadow(0 0 9px rgba(200,50,25,0.75));
                            animation: zh-danger-pulse 0.85s infinite ease-in-out;
                        }
                        @keyframes zh-danger-pulse {
                            0%, 100% { filter: drop-shadow(0 0 7px rgba(190,70,40,0.6)); }
                            50% { filter: drop-shadow(0 0 13px rgba(220,60,35,0.9)); }
                        }
                        /* ========== 权满 4 特效（多重联动） ========== */
                        /* 1) 护手圆珠外圈迸发光环（震荡波） */
                        .zhonghui-quan-sword .full-pulse {
                            opacity: 0;
                        }
                        .zhonghui-gauge-wrap.quan-full .zhonghui-quan-sword .full-pulse {
                            animation: zh-full-pulse 2.2s infinite ease-out;
                            transform-origin: center; transform-box: fill-box;
                        }
                        @keyframes zh-full-pulse {
                            0% { transform: scale(0.5); opacity: 0.55; }
                            70% { transform: scale(2.1); opacity: 0.12; }
                            100% { transform: scale(2.4); opacity: 0; }
                        }
                        /* 2) 沿剑身上升的金色星流 */
                        .zhonghui-full-stream {
                            position: absolute; left: 0; top: 0; width: 100%; height: 62%;
                            z-index: 5; pointer-events: none; display: none;
                        }
                        .zhonghui-full-stream i {
                            position: absolute; left: 50%;
                            width: 2.2px; height: 2.2px;
                            background: radial-gradient(circle, #ffffff 0%, #ffdf9a 55%, rgba(255,220,150,0) 100%);
                            border-radius: 50%; opacity: 0;
                            filter: blur(0.4px) drop-shadow(0 0 4px #ffcf6a);
                            animation: zh-full-stream 1.6s infinite ease-out;
                        }
                        @keyframes zh-full-stream {
                            0% { transform: translateX(-50%) translateY(0); opacity: 0; }
                            12% { opacity: 0.9; }
                            100% { transform: translateX(calc(-50% + var(--dx, 0px))) translateY(-120px); opacity: 0; }
                        }
                        .zhonghui-gauge-wrap.quan-full .zhonghui-full-stream { display: block; }
                        /* 3) 金光星尘爆散 */
                        .zhonghui-full-spark {
                            position: absolute; left: 0; top: 0; width: 100%; height: 100%;
                            z-index: 5; pointer-events: none; display: none;
                        }
                        .zhonghui-full-spark i {
                            position: absolute;
                            background: radial-gradient(circle, #ffffff 0%, #ffe2a0 55%, rgba(255,220,150,0) 100%);
                            border-radius: 50%; opacity: 0;
                            animation: zh-spark-burst 2.2s infinite ease-out;
                        }
                        @keyframes zh-spark-burst {
                            0%, 70%, 100% { opacity: 0; transform: scale(0.4); }
                            74% { opacity: 1; transform: scale(1.8); }
                            82% { opacity: 0; transform: scale(0.6); }
                        }
                        .zhonghui-gauge-wrap.quan-full .zhonghui-full-spark { display: block; }
                        /* 患核 10+：劫火星尘 */
                        .zhonghui-huan-ember {
                            position: absolute; left: 0; bottom: 24%; width: 100%; height: 36%;
                            z-index: 5; pointer-events: none; display: none;
                        }
                        .zhonghui-huan-ember i {
                            position: absolute;
                            background: radial-gradient(circle, #ffd9a0 0%, #c8501f 55%, rgba(200,80,30,0) 100%);
                            border-radius: 50%; opacity: 0;
                            filter: blur(0.5px) drop-shadow(0 0 4px #b03a12);
                            animation: zh-ember-fly 1.8s infinite ease-out;
                        }
                        @keyframes zh-ember-fly {
                            0% { transform: translate(0, 0) scale(1); opacity: 0; }
                            15% { opacity: 0.8; }
                            100% { transform: translate(var(--dx, 0px), -80px) scale(0.3); opacity: 0; }
                        }
                        .zhonghui-gauge-wrap[data-tier="3"] .zhonghui-huan-ember { display: block; }
                    `;
                    document.head.appendChild(style);
                }

                // 2. 构建 UI（剑形：剑身=权能量条，护手圆珠=患核）
                if (!player.zhonghuiGauge) {
                    var wrap = document.createElement('div');
                    wrap.className = 'zhonghui-gauge-wrap';
                    wrap.setAttribute('data-tier', '0');

                    var SVGNS = 'http://www.w3.org/2000/svg';
                    var linearG = function(id, stops) {
                        var g = document.createElementNS(SVGNS, 'linearGradient');
                        g.setAttribute('id', id);
                        g.setAttribute('x1', '0'); g.setAttribute('y1', '1');
                        g.setAttribute('x2', '0'); g.setAttribute('y2', '0');
                        stops.forEach(function(s) {
                            var st = document.createElementNS(SVGNS, 'stop');
                            st.setAttribute('offset', s[0]);
                            st.setAttribute('stop-color', s[1]);
                            g.appendChild(st);
                        });
                        return g;
                    };
                    var linearH = function(id, stops) {
                        var g = document.createElementNS(SVGNS, 'linearGradient');
                        g.setAttribute('id', id);
                        g.setAttribute('x1', '0'); g.setAttribute('y1', '0');
                        g.setAttribute('x2', '1'); g.setAttribute('y2', '0');
                        stops.forEach(function(s) {
                            var st = document.createElementNS(SVGNS, 'stop');
                            st.setAttribute('offset', s[0]);
                            st.setAttribute('stop-color', s[1]);
                            g.appendChild(st);
                        });
                        return g;
                    };
                    var linearHU = function(id, stops) {
                        var g = document.createElementNS(SVGNS, 'linearGradient');
                        g.setAttribute('id', id);
                        g.setAttribute('gradientUnits', 'userSpaceOnUse');
                        g.setAttribute('x1', '0'); g.setAttribute('y1', '6');
                        g.setAttribute('x2', '0'); g.setAttribute('y2', '134');
                        stops.forEach(function(s) {
                            var st = document.createElementNS(SVGNS, 'stop');
                            st.setAttribute('offset', s[0]);
                            st.setAttribute('stop-color', s[1]);
                            g.appendChild(st);
                        });
                        return g;
                    };

                    var sword = document.createElementNS(SVGNS, 'svg');
                    sword.setAttribute('viewBox', '0 0 60 205');
                    sword.setAttribute('class', 'zhonghui-quan-sword');
                    var defs = document.createElementNS(SVGNS, 'defs');
                    // 剑框：暗古金
                    defs.appendChild(linearHU('zh_frame_grad', [['0', '#d4b060'], ['0.5', '#9a7428'], ['1', '#5f4512']]));
                    // 剑身能量层次：顶部提亮 / 两侧暗棱 / 中轴高光 / 斜向流光
                    defs.appendChild(linearG('zh_bright', [['0', 'rgba(255,255,255,0)'], ['1', 'rgba(255,255,255,0.42)']]));
                    defs.appendChild(linearH('zh_bevel', [['0', 'rgba(0,0,0,0.5)'], ['0.5', 'rgba(0,0,0,0)'], ['1', 'rgba(0,0,0,0.5)']]));
                    defs.appendChild(linearH('zh_axis', [['0', 'rgba(255,255,255,0)'], ['0.45', 'rgba(255,255,255,0.16)'], ['0.55', 'rgba(255,255,255,0.16)'], ['1', 'rgba(255,255,255,0)']]));
                    var shimmerG = document.createElementNS(SVGNS, 'linearGradient');
                    shimmerG.setAttribute('id', 'zh_shimmer');
                    shimmerG.setAttribute('gradientUnits', 'userSpaceOnUse');
                    shimmerG.setAttribute('x1', '0'); shimmerG.setAttribute('y1', '0');
                    shimmerG.setAttribute('x2', '28'); shimmerG.setAttribute('y2', '28');
                    shimmerG.setAttribute('spreadMethod', 'repeat');
                    [['0', 'rgba(255,255,255,0)'], ['0.42', 'rgba(255,255,255,0)'], ['0.46', 'rgba(255,255,255,0.14)'], ['0.54', 'rgba(255,255,255,0.14)'], ['0.58', 'rgba(255,255,255,0)'], ['1', 'rgba(255,255,255,0)']].forEach(function(s) {
                        var st = document.createElementNS(SVGNS, 'stop');
                        st.setAttribute('offset', s[0]);
                        st.setAttribute('stop-color', s[1]);
                        shimmerG.appendChild(st);
                    });
                    defs.appendChild(shimmerG);
                    // 剑身内部裁剪（含剑尖：能量可充满尖尖）
                    var bladeClip = document.createElementNS(SVGNS, 'clipPath');
                    bladeClip.setAttribute('id', 'zh_blade_clip');
                    var clipPathEl = document.createElementNS(SVGNS, 'path');
                    clipPathEl.setAttribute('d', 'M30,12 L34.5,17 L34.5,131 L25.5,131 L25.5,17 Z');
                    bladeClip.appendChild(clipPathEl);
                    defs.appendChild(bladeClip);
                    // 已充能区域裁剪（纹理/提亮只作用于能量填充部分，未充能区域保持全透明）
                    var fillClip = document.createElementNS(SVGNS, 'clipPath');
                    fillClip.setAttribute('id', 'zh_fill_clip');
                    var fillClipRect = document.createElementNS(SVGNS, 'rect');
                    fillClipRect.setAttribute('x', '0'); fillClipRect.setAttribute('y', '131');
                    fillClipRect.setAttribute('width', '60'); fillClipRect.setAttribute('height', '0');
                    fillClip.appendChild(fillClipRect);
                    defs.appendChild(fillClip);
                    sword.appendChild(defs);

                    // 剑脊
                    var ridge = document.createElementNS(SVGNS, 'line');
                    ridge.setAttribute('x1', '30'); ridge.setAttribute('y1', '10');
                    ridge.setAttribute('x2', '30'); ridge.setAttribute('y2', '133');
                    ridge.setAttribute('stroke', 'rgba(255,255,255,0.08)');
                    ridge.setAttribute('stroke-width', '1.4');
                    sword.appendChild(ridge);

                    // 剑身（矩形空心边框，顶部切角成尖）
                    var blade = document.createElementNS(SVGNS, 'path');
                    blade.setAttribute('d', 'M30,6 L37,14 L37,134 L23,134 L23,14 Z');
                    blade.setAttribute('fill', 'none');
                    blade.setAttribute('stroke', 'url(#zh_frame_grad)');
                    blade.setAttribute('stroke-width', '2.2');
                    blade.setAttribute('stroke-linejoin', 'round');
                    sword.appendChild(blade);

                    // 权能量层（含剑尖裁剪）：底色 + 提亮 + 暗棱 + 中轴高光 + 流光 + 前沿
                    // 未充能部分完全透明：能量与纹理全部裁剪在"已充能区域"内
                    var bladeGroup = document.createElementNS(SVGNS, 'g');
                    bladeGroup.setAttribute('clip-path', 'url(#zh_blade_clip)');
                    var fillGroup = document.createElementNS(SVGNS, 'g');
                    fillGroup.setAttribute('clip-path', 'url(#zh_fill_clip)');
                    var bladeFill = document.createElementNS(SVGNS, 'rect');
                    bladeFill.setAttribute('x', '0'); bladeFill.setAttribute('y', '0');
                    bladeFill.setAttribute('width', '60'); bladeFill.setAttribute('height', '140');
                    bladeFill.setAttribute('class', 'blade-fill');
                    var bladeBright = document.createElementNS(SVGNS, 'rect');
                    bladeBright.setAttribute('x', '0'); bladeBright.setAttribute('y', '0');
                    bladeBright.setAttribute('width', '60'); bladeBright.setAttribute('height', '140');
                    bladeBright.setAttribute('fill', 'url(#zh_bright)');
                    var bladeBevel = document.createElementNS(SVGNS, 'rect');
                    bladeBevel.setAttribute('x', '0'); bladeBevel.setAttribute('y', '0');
                    bladeBevel.setAttribute('width', '60'); bladeBevel.setAttribute('height', '140');
                    bladeBevel.setAttribute('fill', 'url(#zh_bevel)');
                    var bladeAxis = document.createElementNS(SVGNS, 'rect');
                    bladeAxis.setAttribute('x', '0'); bladeAxis.setAttribute('y', '0');
                    bladeAxis.setAttribute('width', '60'); bladeAxis.setAttribute('height', '140');
                    bladeAxis.setAttribute('fill', 'url(#zh_axis)');
                    var bladeShimmer = document.createElementNS(SVGNS, 'rect');
                    bladeShimmer.setAttribute('x', '0'); bladeShimmer.setAttribute('y', '0');
                    bladeShimmer.setAttribute('width', '60'); bladeShimmer.setAttribute('height', '140');
                    bladeShimmer.setAttribute('fill', 'url(#zh_shimmer)');
                    bladeShimmer.setAttribute('class', 'blade-shimmer');
                    var bladeFront = document.createElementNS(SVGNS, 'rect');
                    bladeFront.setAttribute('x', '0'); bladeFront.setAttribute('y', '0');
                    bladeFront.setAttribute('width', '60'); bladeFront.setAttribute('height', '2');
                    bladeFront.setAttribute('fill', '#c9d4dd');
                    bladeFront.setAttribute('opacity', '0');
                    bladeFront.setAttribute('class', 'blade-front');
                    fillGroup.appendChild(bladeFill);
                    fillGroup.appendChild(bladeBright);
                    fillGroup.appendChild(bladeBevel);
                    fillGroup.appendChild(bladeAxis);
                    fillGroup.appendChild(bladeShimmer);
                    bladeGroup.appendChild(fillGroup);
                    bladeGroup.appendChild(bladeFront);
                    sword.appendChild(bladeGroup);

                    // 3 条刻度线（4 格边界，能量前沿停靠处）
                    [101.25, 71.5, 41.75].forEach(function(ty) {
                        var tl = document.createElementNS(SVGNS, 'line');
                        tl.setAttribute('x1', '25.5'); tl.setAttribute('y1', ty);
                        tl.setAttribute('x2', '34.5'); tl.setAttribute('y2', ty);
                        tl.setAttribute('stroke', 'rgba(0,0,0,0.5)');
                        tl.setAttribute('stroke-width', '1');
                        sword.appendChild(tl);
                    });

                    // ---- 护手：古铜饰框边栏（缩小纯色圆珠面积） ----
                    var frameOuter = document.createElementNS(SVGNS, 'circle');
                    frameOuter.setAttribute('cx', '30'); frameOuter.setAttribute('cy', '151');
                    frameOuter.setAttribute('r', '21'); frameOuter.setAttribute('stroke-width', '1.2');
                    frameOuter.setAttribute('fill', 'none');
                    frameOuter.setAttribute('stroke', '#6b5230');
                    var frameMid = document.createElementNS(SVGNS, 'circle');
                    frameMid.setAttribute('cx', '30'); frameMid.setAttribute('cy', '151');
                    frameMid.setAttribute('r', '19'); frameMid.setAttribute('stroke-width', '0.8');
                    frameMid.setAttribute('fill', 'none');
                    frameMid.setAttribute('stroke', 'rgba(107,82,48,0.45)');
                    sword.appendChild(frameOuter);
                    sword.appendChild(frameMid);
                    for (var fa = 0; fa < 8; fa++) {
                        var ang = fa * 45 * Math.PI / 180;
                        var x = 30 + Math.cos(ang) * 21;
                        var y = 151 + Math.sin(ang) * 21;
                        var dia = document.createElementNS(SVGNS, 'path');
                        dia.setAttribute('d', 'M' + x.toFixed(1) + ',' + (y - 2.6).toFixed(1) + ' L' + (x + 2.6).toFixed(1) + ',' + y.toFixed(1) + ' L' + x.toFixed(1) + ',' + (y + 2.6).toFixed(1) + ' L' + (x - 2.6).toFixed(1) + ',' + y.toFixed(1) + ' Z');
                        dia.setAttribute('fill', '#6b5230');
                        sword.appendChild(dia);
                        var ang2 = (fa * 45 + 22.5) * Math.PI / 180;
                        var dot = document.createElementNS(SVGNS, 'circle');
                        dot.setAttribute('cx', (30 + Math.cos(ang2) * 21).toFixed(1));
                        dot.setAttribute('cy', (151 + Math.sin(ang2) * 21).toFixed(1));
                        dot.setAttribute('r', '1.1');
                        dot.setAttribute('fill', '#4a3a20');
                        sword.appendChild(dot);
                    }

                    // 圆珠患核（纯色，JS 平滑变色）
                    var orbRing = document.createElementNS(SVGNS, 'circle');
                    orbRing.setAttribute('cx', '30'); orbRing.setAttribute('cy', '151');
                    orbRing.setAttribute('r', '16.8'); orbRing.setAttribute('stroke-width', '2');
                    orbRing.setAttribute('fill', 'none');
                    orbRing.setAttribute('stroke', '#5a6a7a');
                    orbRing.setAttribute('class', 'orb-ring');
                    var orbFill = document.createElementNS(SVGNS, 'circle');
                    orbFill.setAttribute('cx', '30'); orbFill.setAttribute('cy', '151');
                    orbFill.setAttribute('r', '15.5');
                    orbFill.setAttribute('fill', '#4a5560');
                    orbFill.setAttribute('stroke', 'rgba(0,0,0,0.4)');
                    orbFill.setAttribute('stroke-width', '1');
                    orbFill.setAttribute('class', 'orb-fill');
                    var orbShine = document.createElementNS(SVGNS, 'ellipse');
                    orbShine.setAttribute('cx', '25'); orbShine.setAttribute('cy', '145');
                    orbShine.setAttribute('rx', '5'); orbShine.setAttribute('ry', '3');
                    orbShine.setAttribute('fill', 'rgba(255,255,255,0.16)');
                    orbShine.setAttribute('transform', 'rotate(-25 25 145)');
                    var huanLabel = document.createElementNS(SVGNS, 'text');
                    huanLabel.setAttribute('x', '30'); huanLabel.setAttribute('y', '147');
                    huanLabel.setAttribute('font-size', '7.5');
                    huanLabel.setAttribute('text-anchor', 'middle');
                    huanLabel.setAttribute('class', 'huan-text');
                    huanLabel.textContent = '患';
                    var huanNum = document.createElementNS(SVGNS, 'text');
                    huanNum.setAttribute('x', '30'); huanNum.setAttribute('y', '162');
                    huanNum.setAttribute('font-size', '17');
                    huanNum.setAttribute('font-weight', 'bold');
                    huanNum.setAttribute('text-anchor', 'middle');
                    huanNum.setAttribute('class', 'huan-num');
                    huanNum.textContent = '0';
                    sword.appendChild(orbRing);
                    sword.appendChild(orbFill);
                    sword.appendChild(orbShine);
                    sword.appendChild(huanLabel);
                    sword.appendChild(huanNum);

                    // 边框燃火（患 >2 显现）：8 团焰舌环绕饰框外缘
                    var flamePaths = [];
                    for (var fi = 0; fi < 8; fi++) {
                        var fg = document.createElementNS(SVGNS, 'g');
                        fg.setAttribute('transform', 'rotate(' + (fi * 45) + ', 30, 151)');
                        var fp = document.createElementNS(SVGNS, 'path');
                        fp.setAttribute('d', 'M30,122 C32.6,127 33,130.5 31.6,132.4 C30.9,133.3 29.1,133.3 28.4,132.4 C27,130.5 27.4,127 30,122 Z');
                        fp.setAttribute('class', 'flame');
                        fp.setAttribute('fill', '#a8481c');
                        fp.style.animationDelay = (fi * 0.37) + 's';
                        fg.appendChild(fp);
                        sword.appendChild(fg);
                        flamePaths.push(fp);
                    }

                    // 剑柄（短柄 + 缠带）
                    var grip = document.createElementNS(SVGNS, 'rect');
                    grip.setAttribute('x', '26'); grip.setAttribute('y', '168');
                    grip.setAttribute('width', '8'); grip.setAttribute('height', '24');
                    grip.setAttribute('rx', '2');
                    grip.setAttribute('fill', '#14100c');
                    grip.setAttribute('stroke', '#8a6a3c');
                    grip.setAttribute('stroke-width', '1.3');
                    sword.appendChild(grip);
                    [176, 185].forEach(function(by) {
                        var band = document.createElementNS(SVGNS, 'line');
                        band.setAttribute('x1', '26'); band.setAttribute('y1', by);
                        band.setAttribute('x2', '34'); band.setAttribute('y2', by);
                        band.setAttribute('stroke', '#b8913f');
                        band.setAttribute('stroke-width', '1');
                        band.setAttribute('opacity', '0.8');
                        sword.appendChild(band);
                    });
                    // 剑首
                    var pommel = document.createElementNS(SVGNS, 'ellipse');
                    pommel.setAttribute('cx', '30'); pommel.setAttribute('cy', '195.5');
                    pommel.setAttribute('rx', '5.5'); pommel.setAttribute('ry', '4.5');
                    pommel.setAttribute('fill', '#14100c');
                    pommel.setAttribute('stroke', '#8a6a3c');
                    pommel.setAttribute('stroke-width', '1.3');
                    sword.appendChild(pommel);
                    var pommelCore = document.createElementNS(SVGNS, 'ellipse');
                    pommelCore.setAttribute('cx', '30'); pommelCore.setAttribute('cy', '194.5');
                    pommelCore.setAttribute('rx', '2.4'); pommelCore.setAttribute('ry', '1.8');
                    pommelCore.setAttribute('fill', '#b8913f');
                    pommelCore.setAttribute('opacity', '0.85');
                    sword.appendChild(pommelCore);

                    // ---- 权满 4 特效层 ----
                    // 震荡光环（护手外圈）
                    var fullPulse = document.createElementNS(SVGNS, 'circle');
                    fullPulse.setAttribute('cx', '30'); fullPulse.setAttribute('cy', '151');
                    fullPulse.setAttribute('r', '16.8'); fullPulse.setAttribute('stroke-width', '2');
                    fullPulse.setAttribute('fill', 'none');
                    fullPulse.setAttribute('stroke', '#ffd9a0');
                    fullPulse.setAttribute('class', 'full-pulse');
                    fullPulse.setAttribute('opacity', '0');
                    sword.appendChild(fullPulse);
                    // 金色星流层（权满 4，沿剑身上升）
                    var stream = document.createElement('div');
                    stream.className = 'zhonghui-full-stream';
                    for (var ti = 0; ti < 5; ti++) {
                        var st = document.createElement('i');
                        st.style.bottom = (10 + Math.random() * 50) + '%';
                        st.style.setProperty('--dx', (Math.random() * 16 - 8) + 'px');
                        st.style.animationDelay = (Math.random() * 1.6) + 's';
                        st.style.animationDuration = (1.3 + Math.random() * 0.7) + 's';
                        stream.appendChild(st);
                    }
                    // 金光星尘爆散层（权满 4）
                    var spark = document.createElement('div');
                    spark.className = 'zhonghui-full-spark';
                    for (var si = 0; si < 10; si++) {
                        var sp = document.createElement('i');
                        sp.style.left = (Math.random() * 100) + '%';
                        sp.style.top = (Math.random() * 80) + '%';
                        var ss = (1.8 + Math.random() * 2.4).toFixed(1);
                        sp.style.width = sp.style.height = ss + 'px';
                        sp.style.animationDelay = (Math.random() * 2.2) + 's';
                        spark.appendChild(sp);
                    }
                    // 劫火星尘层（患 10+）
                    var embers = document.createElement('div');
                    embers.className = 'zhonghui-huan-ember';
                    for (var ei = 0; ei < 8; ei++) {
                        var e = document.createElement('i');
                        e.style.left = (Math.random() * 100) + '%';
                        e.style.bottom = (Math.random() * 30) + '%';
                        var es = (1.5 + Math.random() * 1.5).toFixed(1);
                        e.style.width = e.style.height = es + 'px';
                        e.style.setProperty('--dx', (Math.random() * 24 - 12) + 'px');
                        e.style.animationDelay = (Math.random() * 1.8) + 's';
                        e.style.animationDuration = (1.2 + Math.random() * 1.4) + 's';
                        embers.appendChild(e);
                    }

                    wrap.appendChild(sword);
                    wrap.appendChild(stream);
                    wrap.appendChild(spark);
                    wrap.appendChild(embers);

                    // 【关键】：挂载到 player 节点而不是 ui.arena
                    player.appendChild(wrap);
                    player.zhonghuiGauge = { wrap: wrap, sword: sword, bladeFill: bladeFill, bladeFront: bladeFront, orbFill: orbFill, orbRing: orbRing, huanNum: huanNum, huanLabel: huanLabel, flamePaths: flamePaths, embers: embers };

                    // 颜色插值工具（深色系，随患数连续渐变，消除换档跳变）
                    var mixHex = function(a, b, t) {
                        var ra = parseInt(a.slice(1, 3), 16), ga = parseInt(a.slice(3, 5), 16), ba = parseInt(a.slice(5, 7), 16);
                        var rb = parseInt(b.slice(1, 3), 16), gb = parseInt(b.slice(3, 5), 16), bb = parseInt(b.slice(5, 7), 16);
                        return 'rgb(' + Math.round(ra + (rb - ra) * t) + ',' + Math.round(ga + (gb - ga) * t) + ',' + Math.round(ba + (bb - ba) * t) + ')';
                    };
                    var tierColor = function(anchors, v) {
                        if (v <= anchors[0][0]) return anchors[0][1];
                        for (var i = 1; i < anchors.length; i++) {
                            if (v <= anchors[i][0]) {
                                var lo = anchors[i - 1][0], hi = anchors[i][0];
                                return mixHex(anchors[i - 1][1], anchors[i][1], (v - lo) / (hi - lo));
                            }
                        }
                        return anchors[anchors.length - 1][1];
                    };
                    // 血液系锚点（更鲜红、更沉重凝血感）：0 暗铁血 → 2 暗血 → 3 深血 → 4+ 鲜血
                    var ORB_ANCHORS = [[0, '#4a3436'], [2, '#7d1c14'], [3, '#93180c'], [4, '#b8180a'], [10, '#cf0f04'], [20, '#e00800']];

                    // 权：剑身能量平滑填充（easeOut 缓动），满 4 触发特效
                    var BLADE_TOP = 12, BLADE_BOTTOM = 131, BLADE_H = 119;
                    var bladeCur = BLADE_BOTTOM;
                    player.zhonghuiGauge.updateQuan = function(quan, full) {
                        var self = this;
                        var target = BLADE_BOTTOM - BLADE_H * quan / 4;
                        if (self._quanAnim) cancelAnimationFrame(self._quanAnim);
                        var from = bladeCur;
                        var start = null;
                        var DUR = 450;
                        bladeFront.setAttribute('opacity', quan > 0 ? '0.9' : '0');
                        function tick(ts) {
                            if (start == null) start = ts;
                            var t = Math.min(1, (ts - start) / DUR);
                            var e = 1 - Math.pow(1 - t, 3);
                            bladeCur = from + (target - from) * e;
                            fillClipRect.setAttribute('y', bladeCur.toFixed(2));
                            fillClipRect.setAttribute('height', (BLADE_BOTTOM - bladeCur).toFixed(2));
                            bladeFront.setAttribute('y', (bladeCur - 1.5).toFixed(2));
                            if (t < 1) {
                                self._quanAnim = requestAnimationFrame(tick);
                            } else {
                                self._quanAnim = null;
                                bladeCur = target;
                            }
                        }
                        self._quanAnim = requestAnimationFrame(tick);
                    };
                    // 患：数字 + 颜色连续渐变（剑身/圆珠/圆环/文字/火焰同系深色）
                    player.zhonghuiGauge.updateHuan = function(huan) {
                        huanNum.textContent = huan;
                        huanNum.setAttribute('font-size', huan >= 100 ? 11 : huan >= 10 ? 14 : 17);
                        var base = tierColor(ORB_ANCHORS, huan);
                        orbFill.style.fill = base;
                        orbRing.style.stroke = mixHex(base, '#ffffff', 0.22);
                        bladeFill.style.fill = base;
                        bladeFront.style.fill = mixHex('#c9d4dd', '#e08060', Math.min(1, huan / 10));
                        huanNum.style.fill = mixHex('#d8e0e8', '#ffb09a', Math.min(1, huan / 12));
                        huanLabel.style.fill = mixHex(base, '#ffffff', 0.45);
                        if (huan >= 1) {
                            var fc = mixHex('#a53210', '#e01200', Math.min(1, (huan - 1) / 8));
                            flamePaths.forEach(function(f) { f.style.fill = fc; });
                            // 火焰燃烧速度：患 1→4 逐渐加快，5 及以上保持最快
                            var dur = huan >= 5 ? 0.8 : [1.6, 1.35, 1.1, 0.85][huan - 1];
                            flamePaths.forEach(function(f) { f.style.animationDuration = dur + 's'; });
                        }
                        wrap.setAttribute('data-tier', huan >= 10 ? 3 : huan >= 6 ? 2 : huan >= 1 ? 1 : 0);
                    };

                    // 初始刷新一次
                    var initQuan = player.countMark('sgz_quanhuan');
                    var initHuan = player.countMark('sgz_quanhuan_huan');
                    player.zhonghuiGauge.updateQuan(initQuan, initQuan >= 4);
                    player.zhonghuiGauge.updateHuan(initHuan);
                    wrap.classList.toggle('quan-full', initQuan >= 4);
                }
            },
            content: function() {
                var g = player.zhonghuiGauge;
                if (!g) return;
                var quan = player.countMark('sgz_quanhuan');
                var huan = player.countMark('sgz_quanhuan_huan');
                g.wrap.classList.toggle('quan-full', quan >= 4);
                g.updateHuan(huan);
                g.updateQuan(quan, quan >= 4);
            },
            onremove: function(player) {
                if (player.zhonghuiGauge) {
                    if (player.zhonghuiGauge._quanAnim) cancelAnimationFrame(player.zhonghuiGauge._quanAnim);
                    player.zhonghuiGauge.wrap.remove();
                    delete player.zhonghuiGauge;
                }
            }
        },
    },
    skillTranslate: {
        sgz_quanhuan: "权患",
        sgz_quanhuan_info: "锁定技，①游戏开始时，你获得4枚“权”标记。②当你不因此技能受到伤害、失去体力或减少体力上限时防止之，改为获得等量的“患”标记。③你的手牌数始终为X；出牌阶段结束时，你受到Y点无来源伤害（X、Y分别为为“权”、“患”的数量)。",
        sgz_jiaozhao: "矫诏",
        sgz_jiaozhao_info: "回合内限两次，当你需要使用一张非延时性锦囊牌，你可以移除一枚“患”并弃置至少零张手牌，视为使用之。",
        sgz_jitian: "觊天",
        sgz_jitian_info: "你可将一张♥️或♠️牌当【桃】使用。每名角色的结束阶段，若你于其回合内发动过“觊天”，且你有“权”/“患”，你移除一枚“权”/“患”。",
        sgz_zhuyue: "逐月",
        sgz_zhuyue_info: "锁定技，你于本局游戏内累计造成的伤害由奇数变为偶数时，你获得一点护甲，然后若你的“权”的数量小于4，你弃置一张牌并获得一枚“权”。",
        sgz_xingfa: "兴伐",
        sgz_xingfa_info: "锁定技，准备阶段，你选择一名角色对其造成一点伤害并立即调整其体力上限与体力相同。",
    },
    characterTaici:{
        "sgz_quanhuan":{order: 1,content:"大丈夫胸怀四海，有提携玉龙之术！/王霸之志在胸，我岂池中之物！/历经风浪至此，会不可止步于龙门！/我若束手无策，诸位又有何施为？/今长缨在手，欲问鼎九州！/我有佐国之术，可缚苍龙!/入宝山而空手回，其与匹夫何异？/操权弄略，舍小利而谋大局！/天降大任于斯，不受必遭其殃！/空将宝地赠他人，某怎会心甘情愿！/大丈夫行事，岂较一兵一将之得失？/我欲行夏禹旧事，为天下人！"},
        "sgz_jiaozhao":{order: 2,content:"匹夫侥幸行险，岂敢妄居首功！/蛇可吞象，我钟会亦可吞天食地！/坏吾大计者，罪死不赦！/蜀川三千里，皆由我一言决之。/天下风流出我辈，一遇风云便化龙！/顺我者封候拜将；逆我者，斧钺加身！/烧去剑阁八百里，蜀中自有一片天！/天书数册，当为我载此世之名！/我以露布上达天听，安不可称万岁！/事在人为，王侯之封不在人而在我！"},
        "sgz_jitian":{order: 3,content:"动我钟家的人，哼，你长了几个脑袋？/有我在一日，谁也动不得吾族分毫!/燕雀安知鸿鹄之志哉！/吾族恒大，谁敢欺之。/不为刀下脍，且做俎上刀。/心怀屠龙之术，何患手无长缨！/功高终怀异，峙鼎复三分！"},
        "sgz_zhuyue":{order: 4,content:"人生艰难如逆水行舟，不欲进则必退！/汉鹿已失，魏牛犹在，吾欲执其耳！/既已功高盖主，何妨冕服加身！"},
        "sgz_xingfa":{order: 5,content:"风水轮流转，轮到我钟某问鼎重几何了。/道同者可俱容，殊途者成白骨！/天赐良机，不取何为？/我既搏一世之功，亦求万世之名！"},
        "die":{content:"夺取天下之机，尔等竖子竟弃如敝履，啊！！！"}
    }
};
