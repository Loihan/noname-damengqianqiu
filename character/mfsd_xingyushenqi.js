export default {
    character: {
        mfsd_xingyushenqi: {
            sex:"male",
            group:"shen",
            hp:4,
            skills:["mfsd_shisu", "mfsd_yueqian", "mfsd_huanyu" ], 
            img:"extension/大梦千秋/image/mfsd_xingyushenqi.png",
            dieAudios:["ext:大梦千秋/audio/mfsd_xingyushenqi/die.mp3"],
            names:"诸葛|亮",
            groupInGuozhan:"ye",
            4:["des:星域的守护者，神启的化身。"]
        },
    },
    characterName: 'mfsd_xingyushenqi',
    characterTranslate: {mfsd_xingyushenqi: "星域神启",},
    skills: {
        //====================================
        //            主技能区                     
        //====================================

        // === 技能1: 【时溯】(逻辑驱动核心) ===
        mfsd_shisu: {
            audio: "ext:大梦千秋/audio/mfsd_xingyushenqi:9",
            persevereSkill: true,
            enable: ["chooseToUse", "chooseToRespond"],
            mark: true,
            marktext: "时空镜",
            intro: {
                name: "时空镜",
                content: function(storage) {
                    if (!storage) return "暂无记录";
                    let str = "";
                    let total = 0;
                    for (let i in storage) {
                        if (storage[i] > 0) {
                            total += storage[i];
                            str += "【" + get.translation(i) + "】x" + storage[i] + "<br>";
                        }
                    }
                    return "总数：" + total + "<br>" + str;
                }
            },
            ai:{threaten:999, },
            init: function(player) {
                if (!player.storage.mfsd_shisu) player.storage.mfsd_shisu = {};
            },
            hiddenCard: function(player, name) {
                var storage = player.storage.mfsd_shisu;
                if (storage && storage[name] > 0) return true;
                return false;
            },
            filter: function(event, player) {
                var storage = player.storage.mfsd_shisu;
                if (!storage) return false;
                
                // 如果是响应/打出环节
                if (event && event.filterCard) {
                    for (var i in storage) {
                        if (storage[i] > 0) {
                            // 检查时空镜里的这张牌是否符合当前系统的需求
                            if (event.filterCard({ name: i }, player, event)) return true;
                        }
                    }
                    return false;
                }
                
                // 如果是出牌阶段主动使用
                for (var i in storage) {
                    if (storage[i] > 0) return true;
                }
                return false;
            },
            chooseButton: {
                dialog: function(event, player) {
                    var storage = player.storage.mfsd_shisu;
                    var list = [];
                    for (var i in storage) {
                        if (storage[i] > 0) {
                            // 只显示符合当前询问条件的牌
                            if (event.filterCard({ name: i }, player, event)) {
                                list.push(["", "", i]);
                            }
                        }
                    }
                    const dialog = ui.create.dialog("时溯：选择要消耗的记录");
                    dialog.add([list, "vcard"]);
                    return dialog;
                },
                check: function(button) {
                    var player = _status.event.player;
                    var cardName = button.link[2];

                    // 救人逻辑：只救队友
                    var dying = _status.event.dying || (_status.event.getParent() && _status.event.getParent().dying);
                    if (dying && get.attitude(player, dying) <= 0) return 0;

                    
                    // 修正：使用 get.useful 代替 player.getUseful
                    var val = get.useful({ name: cardName });
                    if (val <= 0) return 0;

                    // 手牌优先：如果手里有，镜子里的权重设为和手牌一致或略低
                    if (player.hasCard(cardName, 'h')) return val;
                    return val + 10; // 白嫖加成
                },
                backup: function(links) {
                    return {
                        viewAs: { name: links[0][2] },
                        filterCard: () => false,
                        selectCard: -1,
                        sourceSkill: "mfsd_shisu",
                        onuse: function(result, player) {
                            var name = result.card.name;
                            player.storage.mfsd_shisu[name]--;
                            player.markSkill('mfsd_shisu');
                            // 手动触发对应卡牌的音效（可选，建议保持原声劫持）
                        }
                    }
                },
                prompt: function(links) {
                    return "请选择" + get.translation(links[0][2]) + "的目标";
                }
            },
                            // === 核心修正3：AI与系统标签映射 ===
            ai: {
                respondSha: true,
                respondShan: true,
                save: true,
                respondWuxie: true,
                skillTagFilter: function(player, tag) {
                    var storage = player.storage.mfsd_shisu;
                    if (!storage) return false;
                    var name;
                    switch (tag) {
                        case 'respondSha': name = 'sha'; break;
                        case 'respondShan': name = 'shan'; break;
                        case 'save': name = 'tao'; break;
                        case 'respondWuxie': name = 'wuxie'; break;
                    }
                    if (name && storage[name] > 0) return true;
                    return false;
                },
                // === AI核心逻辑2：动态优先级控制 ===
                order: function(item, player) {
                    player = player || _status.event.player;
                    if (!player || !player.storage || !player.storage.mfsd_shisu) return 0;
                    
                    var storage = player.storage.mfsd_shisu;
                    var maxOrder = 0;
                    for (var i in storage) {
                        if (storage[i] > 0) {
                            var vcard = { name: i };
                            // 修正：使用 get.useful(vcard)
                            if (get.useful(vcard) > 0) {
                                var ord = get.order(vcard, player);
                                if (ord > maxOrder) maxOrder = ord;
                            }
                        }
                    }
                    return maxOrder > 0 ? maxOrder - 0.01 : 0;
                },
                result: { 
                    player: function(player) {
                        // 只有当时溯里有“当前有使用价值”的牌时，AI才会有发动欲望
                        var storage = player.storage.mfsd_shisu;
                        for (var i in storage) {
                            if (storage[i] > 0 && player.getUseValue({ name: i }) > 0) return 1;
                        }
                        return 0;
                    }
                }
            },
            group: ["mfsd_shisu_record"],
            subSkill: {
                record: {
                    trigger: { global: ["useCard", "discard"] },
                    forced: true,
                    silent: true,
                    filter: function(event, player) {
                        // 屏蔽自己，防止无限递归
                        if (event.getParent().skill == "mfsd_shisu") return false;
                        return event.cards && event.cards.length;
                    },
                    content: function() {
                        "step 0"
                        let cards = trigger.cards || [trigger.card];
                        let store = player.storage.mfsd_shisu;
                        let changed = false;
                        for (let card of cards) {
                            if (!card || !card.name) continue;
                            let name = get.name(card, false);
                            if (!store[name]) store[name] = 0;
                            store[name]++;
                            changed = true;
                        }
                        if (changed) {
                            player.markSkill('mfsd_shisu');
                            // 1. 增加寰宇标记
                            player.addMark('mfsd_huanyu', cards.length);
                        }

                        "step 1"
                        // === 【核心重构：寰宇发奖逻辑】 ===
                        let total = player.countMark('mfsd_huanyu');
                        let targetLevel = Math.floor(total / 7); // 理论上应该获得的技能总数
                        
                        // 初始化历史记录数组（只记录“给过什么”，不看“现在有什么”）
                        if (!player.storage.mfsd_huanyu_history) {
                            player.storage.mfsd_huanyu_history = [];
                        }
                        
                        // 判定：如果 [理论等级] > [历史上给过的技能数]，且 [还没满9个]
                        if (targetLevel > player.storage.mfsd_huanyu_history.length && player.storage.mfsd_huanyu_history.length < 9) {
                            event.num_to_give = targetLevel - player.storage.mfsd_huanyu_history.length;
                        } else {
                            event.finish();
                        }

                        "step 2"
                        let pool = ['mfsd_chuangjie', 'mfsd_dunjie', 'mfsd_xingjie', 'mfsd_qiongjie', 'mfsd_panjie', 'mfsd_nuojie', 'mfsd_juejie', 'mfsd_bengjie', 'mfsd_huangjie'];
                        
                        // 过滤出历史上从未给过的技能
                        let available = pool.filter(s => !player.storage.mfsd_huanyu_history.contains(s));

                        if (available.length > 0 && event.num_to_give > 0) {
                            let skill = available.randomGet();
                            
                            // 1. 记入历史黑名单（确保不会重复发，也不会因为技能用掉而补发）
                            player.storage.mfsd_huanyu_history.push(skill);
                            lib.skill.mfsd_huanyu.updateUI(player); 
                            
                            // 2. 赋予技能并奖励
                            player.addSkill(skill);
                            player.gainMaxHp();
                            player.recover();
                            game.playAudio(`../extension/大梦千秋/audio/mfsd_xingyushenqi/mfsd_huanyu${[1,2,3,4,5,6,7,8].randomGet()}.mp3`);
                            
                            player.logSkill('mfsd_huanyu');
                            game.log(player, '的“寰宇”等级提升，获得了技能', '#g【' + get.translation(skill) + '】');

                            // 3. 递减并循环，直到补齐等级差
                            event.num_to_give--;
                            if (event.num_to_give > 0) event.redo();
                        }
                    }
                }
            }
        },
        // === 技能1: 【寰宇】 (仅作为标记容器和展示) ===
        mfsd_huanyu: {
            persevereSkill: true,
            audio:"ext:大梦千秋/audio/mfsd_xingyushenqi:8",
            mark: true,
            marktext: "寰宇",
            derivation: ['mfsd_chuangjie', 'mfsd_dunjie', 'mfsd_xingjie', 'mfsd_qiongjie', 'mfsd_panjie', 'mfsd_nuojie', 'mfsd_juejie', 'mfsd_bengjie', 'mfsd_huangjie'],
            intro: {
                name: "寰宇",
                content: function(storage, player) {
                    // storage 实际上就是 player.storage.mfsd_huanyu 的数值（记录的牌数/能量）
                    var energy = storage || 0;
                    
                    // 获取已解锁的世界技能数量
                    var skillNum = 0;
                    if (player.storage.mfsd_huanyu_history) {
                        skillNum = player.storage.mfsd_huanyu_history.length;
                    }
                    
                    return "当前能量点：" + energy + "<br>已解锁世界技能数：" + skillNum;
                }
            },
            // 使用 countMark('mfsd_huanyu_history') 来动态显示已获得的技能数
            init: function(player) {
                // 动态插入星星样式（仅全局一次）
                if (!document.getElementById('mfsd_huanyu_star_style')) {
                    var style = document.createElement('style');
                    style.id = 'mfsd_huanyu_star_style';
                    style.innerHTML = `
                    .mfsd-star-wrap{
                        position:absolute; left:100%; top:5%;
                        margin-left:6px; width:50px; height:90%;
                        z-index:60; pointer-events:none;
                    }
                    /* 连接线容器 */
                    .mfsd-star-lines{
                        position:absolute; top:0; left:0; width:100%; height:100%;
                        pointer-events:none;
                    }
                    .mfsd-star{
                        position:absolute;
                        width:14px; height:14px;
                        transform:translate(-50%,-50%) scale(0.7);
                        opacity:0.55; /* 这里控制整体透明度 */
                        transition:all 0.4s;
                    }
                    .mfsd-star::before{
                        content:""; position:absolute; inset:0;
                        clip-path:polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
                        background:#2a3f66; /* 星星本体颜色 */
                        box-shadow:inset 0 0 4px rgba(0,0,0,0.8);
                    }
                    .mfsd-star.active{
                        opacity:1; transform:translate(-50%,-50%) scale(1);
                    }
                    .mfsd-star.active::before{
                        background:radial-gradient(circle,#fff,#7fdcff,#3a7bd5);
                        box-shadow:0 0 10px rgba(120,200,255,1);
                        animation:starTwinkle 2s infinite ease-in-out;
                    }
                    .mfsd-star.current::before{
                        box-shadow:0 0 16px rgba(255,255,255,1);
                    }
                    @keyframes starTwinkle{
                        0%{filter:brightness(1);}
                        50%{filter:brightness(1.6);}
                        100%{filter:brightness(1);}
                    }
                    `;
                    document.head.appendChild(style);
                }

                // 创建每个玩家的星星 UI（只一次）
                if (!player.mfsdStarUI) {
                    var wrap = document.createElement('div');
                    wrap.className = 'mfsd-star-wrap';

                    // 线条层（SVG）
                    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                    svg.setAttribute("class", "mfsd-star-lines");
                    svg.style.position = "absolute";
                    svg.style.top = "0";
                    svg.style.left = "0";
                    svg.style.width = "100%";
                    svg.style.height = "100%";
                    wrap.appendChild(svg);

                    // 9颗星星的不规则坐标（百分比，相对wrap容器）
                    var starPositions = [
                        { left: 40, top: 0 },
                        { left: 10, top: 12 },
                        { left: 5, top: 25 },
                        { left: 50, top: 37 },
                        { left: 45, top: 50 },
                        { left: 20, top: 62 },
                        { left: 10, top: 75 },
                        { left: 10, top: 87 },
                        { left: 25, top: 100 }
                    ];

                    var stars = [];
                    for (var i = 0; i < 9; i++) {
                        var star = document.createElement('div');
                        star.className = 'mfsd-star';
                        star.style.left = starPositions[i].left + '%';
                        star.style.top = starPositions[i].top + '%';
                        // 保存坐标方便画线
                        star.dataset.cx = starPositions[i].left;
                        star.dataset.cy = starPositions[i].top;
                        wrap.appendChild(star);
                        stars.push(star);
                    }

                    // 挂载到角色元素上（如果报错请尝试 player.node.appendChild(wrap)）
                    player.appendChild(wrap);

                    player.mfsdStarUI = {
                        wrap: wrap,
                        svg: svg,
                        stars: stars,
                        positions: starPositions
                    };

                    // 根据当前记录立即刷新
                    lib.skill.mfsd_huanyu.updateUI(player);
                }

                player.markSkill('mfsd_huanyu');
            },
            updateUI: function(player) {
                var ui = player.mfsdStarUI;
                if (!ui) return;

                var list = player.storage.mfsd_huanyu_history || [];
                var count = list.length;

                // 更新星星亮暗
                for (var i = 0; i < ui.stars.length; i++) {
                    ui.stars[i].classList.remove('active', 'current');
                    if (i < count) {
                        ui.stars[i].classList.add('active');
                        if (i == count - 1) {
                            ui.stars[i].classList.add('current');
                        }
                    }
                }

                // 画线：连接所有已点亮的相邻星星
                var svg = ui.svg;
                // 清空原有线条
                while (svg.firstChild) svg.removeChild(svg.firstChild);

                if (count < 2) return; // 少于两颗不用连线

                var positions = ui.positions;
                var wrapWidth = ui.wrap.offsetWidth;
                var wrapHeight = ui.wrap.offsetHeight;

                // 确保容器尺寸获取到（可能首次渲染为0，延时或使用固定策略）
                if (wrapWidth === 0) wrapWidth = 50; // 给个默认宽度，防止线条不显示
                if (wrapHeight === 0) wrapHeight = 180;

                for (var i = 0; i < count - 1; i++) {
                    var p1 = positions[i];
                    var p2 = positions[i+1];

                    // 将百分比坐标转为像素坐标
                    var x1 = (p1.left / 100) * wrapWidth;
                    var y1 = (p1.top / 100) * wrapHeight;
                    var x2 = (p2.left / 100) * wrapWidth;
                    var y2 = (p2.top / 100) * wrapHeight;

                    var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                    line.setAttribute("x1", x1);
                    line.setAttribute("y1", y1);
                    line.setAttribute("x2", x2);
                    line.setAttribute("y2", y2);
                    line.setAttribute("stroke", "rgba(120,200,255,0.8)");
                    line.setAttribute("stroke-width", "2");
                    line.setAttribute("stroke-linecap", "round");
                    // 添加一点发光效果
                    line.style.filter = "drop-shadow(0 0 4px rgba(120,200,255,0.8))";
                    svg.appendChild(line);
                }
            },
        },
        // === 技能3: 【跃迁】 ===
        mfsd_yueqian: {
            audio: "ext:大梦千秋/audio/mfsd_xingyushenqi:3",
            persevereSkill: true,
            forced: true,
            trigger: { player: "dying" },
            priority: 5, 
            content: function() {
                player.loseMaxHp();
                player.recover(1 - player.hp);
            },
        },

        //=====================================
        //           世界技能池                     
        //=====================================

        // --- 1. 创界 ---
        mfsd_chuangjie: {
            audio:"ext:大梦千秋/audio/mfsd_xingyushenqi:1",
            persevereSkill: true,
            enable: "phaseUse",
            limited: true,
            mark: false,
            skillAnimation: true,
            animationColor: 'thunder',
            content: function() {
                player.awakenSkill('mfsd_chuangjie');
                player.insertPhase();
            },
            ai: {
                order: 12, // 高优先级（低于崩界13）
                result: { player: 1 }
            },
            intro: { content: 'limited' }
        },
        // --- 2. 盾界 ---
        mfsd_dunjie: {
            audio:"ext:大梦千秋/audio/mfsd_xingyushenqi:1",
            persevereSkill: true,
            enable: "phaseUse",
            limited: true,
            mark: false,
            skillAnimation: true,
            animationColor: 'metal',
            content: function() {
                player.awakenSkill('mfsd_dunjie');
                player.addTempSkill('mfsd_dunjie_effect', {player:'phaseBegin'});
            },
            ai: {
                order: 10,
                result: {
                    player: function(player) {
                        // 逻辑：如果本回合发过创/穹/绝，就不发动
                        if (player.hasHistory('useSkill', function(evt){
                            return ['mfsd_chuangjie', 'mfsd_qiongjie', 'mfsd_juejie'].contains(evt.skill);
                        })) return 0;
                        return 1;
                    }
                }
            },
            intro: { content: 'limited' },
            subSkill: {
                effect: {
                    charlotte: true,
                    trigger: { player: "damageBegin3" },
                    forced: true,
                    content: function() {
                        if (trigger.num > 1) {
                            trigger.num = 1;
                        } else {
                            trigger.num = 0;
                        }
                        game.playAudio(`../extension/大梦千秋/audio/mfsd_xingyushenqi/mfsd_xingyushenqi_zhicai-jianshang.mp3`)
                    },
                    mark: true,
                    marktext: "减伤",
                    intro: { name: "减伤", content: "盾界：受到的伤害至多为1，若不大于1则为0" }
                }
            }
        },
        // --- 3. 星界 ---
        mfsd_xingjie: {
            audio:"ext:大梦千秋/audio/mfsd_xingyushenqi:1",
            persevereSkill: true,
            trigger: { player: "phaseDrawBegin" },
            limited: true,
            mark: false,
            skillAnimation: true,
            animationColor: 'water',
            direct: true,
            content: function() {
                'step 0'
                player.chooseBool(get.prompt('mfsd_xingjie'), '是否发动【星界】，跳过摸牌并从游戏外获得五张牌？').set('ai', () => true);
                'step 1'
                if (result.bool) {
                    player.logSkill('mfsd_xingjie');
                    player.awakenSkill('mfsd_xingjie');
                    trigger.changeToZero(); // 跳过摸牌
                    
                    // 获取所有非装备、非延时的牌名列表
                    var card_list = lib.inpile.filter(name => {
                        var type = get.type(name);
                        return type != 'equip' && type != 'delay';
                    });
                    var dialog = ui.create.dialog("星界：请选择五张牌");
                    dialog.add([card_list, 'vcard']);
                    // 调用选择函数，传入已创建好的 dialog
                    player.chooseButton(dialog, 5, true).set('ai', function(button) {
                        // 【AI强化】：计算该牌名对当前玩家的使用价值，自动挑选前五名
                        var cardName = button.link[2];
                        return player.getUseValue({
                            name: cardName
                        });
                    });
                } else {
                    event.finish();
                }
                'step 2'
                if (result.bool && result.links) {
                    var cards_to_gain = [];
                    for (var link of result.links) {
                        cards_to_gain.push(game.createCard({name: link[2], suit: 'none', number: null}));
                    }
                    if (cards_to_gain.length) {
                        player.gain(cards_to_gain, 'gain2');
                    }
                }
            },
            intro: { content: 'limited' }
        },
        // --- 4. 穹界 ---
        mfsd_qiongjie: {
            audio:"ext:大梦千秋/audio/mfsd_xingyushenqi:1",
            persevereSkill: true,
            enable: "phaseUse",
            limited: true,
            mark: false,
            skillAnimation: true,
            animationColor: 'wood',
            content: function() {
                player.awakenSkill('mfsd_qiongjie');
                player.addTempSkill('mfsd_qiongjie_effect', {player:'phaseBegin'});
            },
            ai: {
                order: 9,
                result: {
                    player: function(player) {
                        // 逻辑：如果本回合发过创/盾/绝，就不发动
                        if (player.hasHistory('useSkill', function(evt){
                            return ['mfsd_chuangjie', 'mfsd_dunjie', 'mfsd_juejie'].contains(evt.skill);
                        })) return 0;
                        return 1;
                    }
                }
            },
            intro: { content: 'limited' },
            subSkill: {
                // === 核心修正: 严格模仿【帷幕】的 mod 结构 ===
                effect: {
                    charlotte: true,
                    mod: {
                        // targetEnabled 是正确的 mod
                        targetEnabled: function(card, player, target) {
                            // 这个 mod 会对场上所有“指定目标”的事件进行检查
                            // player: 牌的使用者
                            // target: 牌的目标
                            
                            // 如果牌的目标，是那个拥有【穹界】buff的人，则返回false
                            if (target.hasSkill('mfsd_qiongjie_effect')) {
                                return false;
                            }
                        }
                    },
                    mark: true,
                    marktext: "无法选中",
                    intro: { name: "无法选中", content: "穹界：不能成为牌的目标" }
                }
            }
        },
        // --- 5. 叛界 ---
        mfsd_panjie: {
            audio:"ext:大梦千秋/audio/mfsd_xingyushenqi:1",
            persevereSkill: true,
            trigger: { player: "damageEnd" },
            limited: true,
            mark: false,
            skillAnimation: true,
            animationColor: 'soil',
            direct: true,
            ai:{expose: 1,},
            filter: function(event, player) {
                return event.source && event.source.countCards('hej') > 0;
            },
            content: function() {
                'step 0'
                var target = trigger.source;
                player.chooseBool(get.prompt('mfsd_panjie', target), '是否发动【叛界】？').set('ai', function(){
                    if (get.attitude(player, target) >= 0) return false;
                    if (target.countCards('e') > 2 || target.countCards('h') > 3) return true;
                    return false;
                });
                'step 1'
                if (result.bool) {
                    player.logSkill('mfsd_panjie', trigger.source);
                    player.awakenSkill('mfsd_panjie');
                    var cards = trigger.source.getCards('h');
                    if (cards.length) {
                        game.cardsGotoSpecial(cards);
                        game.log(trigger.source, '的', cards, '被移出了游戏');
                    }
                } else {
                    event.finish();
                }
                'step 2'
                player.recover(trigger.num);
                trigger.source.update();
            },
            intro: { content: 'limited' }
        },
        // --- 6. 诺界 ---
        mfsd_nuojie: {
            audio:"ext:大梦千秋/audio/mfsd_xingyushenqi:1",
            persevereSkill: true,
            enable: "phaseUse",
            limited: true,
            mark: false,
            skillAnimation: true,
            animationColor: 'water',
            content: function() {
                player.awakenSkill('mfsd_nuojie');
                // a. 添加“阻止回复”的全局效果
                game.addGlobalSkill('mfsd_nuojie_effect');
                // b. 在 _status 中记录发动者
                if (!_status.mfsd_nuojie_effect) _status.mfsd_nuojie_effect = [];
                _status.mfsd_nuojie_effect.push(player);
                // c. 【核心】为自己添加一个临时的“清理扳机”，有效期到下个回合开始
                player.addTempSkill('mfsd_nuojie_cleanup', {player:'phaseBegin'});
                player.addTempSkill('mfsd_nuojie_buff', {player:'phaseBegin'});
            },
            ai: {
                order: 13, // 最高优先级
                result: {
                    player: function(player) {
                        // 逻辑：只有同时拥有诺、谎才发动
                        if (player.hasSkill('mfsd_nuojie') && player.hasSkill('mfsd_huangjie')) return 1;
                        return 0;
                    }
                }
            },
            intro: { name: "制裁", content: "诺界：阻止其他角色的回复" }
        },
            mfsd_nuojie_effect: {
                charlotte: true,
                trigger: { global: "recoverBefore" },
                forced: true,
                silent: true,
                priority: Infinity,
                filter: function(event, player) {
                    if (!_status.mfsd_nuojie_effect || !_status.mfsd_nuojie_effect.length) return false;
                    // 正在回血的人(player)，不能是【诺界】的发动者之一
                    return !_status.mfsd_nuojie_effect.includes(player);
                },
                content: function() {
                    game.log('【诺界】生效，', trigger.player, '的回复无效');
                    game.playAudio(`../extension/大梦千秋/audio/mfsd_xingyushenqi/mfsd_xingyushenqi_zhicai-jianshang.mp3`)
                    trigger.cancel();
                },
                // 【核心】移除了错误的 group 和 subSkill
            },
            mfsd_nuojie_buff: {
                mark: true,
                marktext: "制裁",
                intro: { name: "制裁", content: "诺界：阻止其他角色的回复" },
                onremove: true,
                charlotte: true,
            },
            mfsd_nuojie_cleanup: {

                charlotte: true, // 这是一个隐藏技能
                // 【核心】当这个临时技能因为到期而被移除时，onremove 会被自动调用
                onremove: function() {
                    // 清理 _status 中的记录
                    if (_status.mfsd_nuojie_effect) {
                        delete _status.mfsd_nuojie_effect;
                    }
                    // 移除全局效果技能
                    game.removeGlobalSkill('mfsd_nuojie_effect');
                    game.log('【诺界】的效果已结束');
                }
            },
        // --- 7. 绝界 ---
        mfsd_juejie: {
            audio:"ext:大梦千秋/audio/mfsd_xingyushenqi:1",
            persevereSkill: true,
            enable: "phaseUse",
            limited: true,
            mark: false,
            skillAnimation: true,
            animationColor: 'thunder',
            filterTarget: function(card, player, target) {
                // 可以选择任何人，包括自己
                return true;
            },
            ai:{expose: 1.0,},
            selectTarget: [1, Infinity], 
            multitarget: true,
            content: function() {
                'step 0'
                player.awakenSkill('mfsd_juejie');
                event.targets = targets.sortBySeat();
                event.num = 0;
                'step 1'
                if (event.num < event.targets.length) {
                    var target = event.targets[event.num];
                    event.currentTarget = target;
                    target.turnOver();
                } else {
                    event.finish();
                }
                'step 2'
                var target = event.currentTarget;
                if (target.countCards('h') > target.hp) {
                    target.chooseToDiscard('h', target.countCards('h') - target.hp, true);
                }
                'step 3'
                event.num++;
                event.goto(1);
            },
            ai: {
                order: 11, // 优先级低于创界12
                result: {
                    target: function(player, target) {
                        // 逻辑：对敌人使用
                        if (get.attitude(player, target) <= 0) return -1;
                        return 0;
                    }
                }
            },
            intro: { content: 'limited' }
        },
        // --- 8. 崩界 ---
        mfsd_bengjie: {
            audio:"ext:大梦千秋/audio/mfsd_xingyushenqi:1",
            persevereSkill: true,
            enable: "phaseUse",
            limited: true,
            mark: false,
            skillAnimation: true,
            animationColor: 'soil',
            filterTarget: true,
            content: function() {
                player.awakenSkill('mfsd_bengjie');
                target.die();
            },
            ai: {
                expose: 1,
                threaten: 100,
                order: 14, // 高于创界12
                result: {
                    target: function(player, target) {
                        if (get.attitude(player, target) > 0) return 0;
                        // 逻辑：对威胁度最高的敌人（通过增加权重实现）
                        return -20 - (get.threaten(target) || 1);
                    }
                }
            },
            intro: { content: 'limited' }
        },
        // --- 9. 谎界 ---
        mfsd_huangjie: {
            audio:"ext:大梦千秋/audio/mfsd_xingyushenqi:1",
            persevereSkill: true,
            enable: "phaseUse",
            limited: true,
            mark: false,
            skillAnimation: true,
            animationColor: 'metal',
            content: function() {
                player.awakenSkill('mfsd_huangjie');
                // a. 为自己添加“无次数距离限制”的buff，它会在回合结束后自动消失
                player.addTempSkill('mfsd_huangjie_player_buff', 'phaseAfter');
                // b. 添加“转化卡牌”的全局效果
                game.addGlobalSkill('mfsd_huangjie_global_effect');
                // c. 为自己添加“回合结束时清理”的扳机，它也会自动消失
                player.addTempSkill('mfsd_huangjie_cleanup', 'phaseAfter');
            },
            ai: {
                order: 13, // 同诺界最高
                result: {
                    player: function(player) {
                        // 逻辑：只有同时拥有诺、谎才发动
                        if (player.hasSkill('mfsd_nuojie') && player.hasSkill('mfsd_huangjie')) return 1;
                        return 0;
                    }
                }
            },
            intro: { content: 'limited' }
        },
            // a. 只对发动者生效的buff
            mfsd_huangjie_player_buff: {
                charlotte: true,
                onremove: true,
                mark: true,
                marktext: "无限",
                intro: { name: "无限", content: "谎界：本回合使用牌无次数和距离限制" },
                mod: {
                    cardUsable: () => Infinity,
                    targetInRange: () => true,
                }
            },
            // b. 全局效果技能，只负责转化卡牌和显示UI
            mfsd_huangjie_global_effect: {
                charlotte: true,
                mod: {
                    cardname: function(card, player) {
                        if (get.position(card) == 'h' && ['shan', 'jiu', 'tao'].includes(card.name)) {
                            return 'sha';
                        }
                    }
                },
                // 为所有角色添加一个可视化的buff标记
                trigger: { global: "phaseBegin" },
                forced: true,
                silent: true,
                content: function() {
                    trigger.player.addTempSkill('mfsd_huangjie_global_buff', 'phaseAfter');
                }
            },
            // c. 用于UI显示的全局buff技能
            mfsd_huangjie_global_buff: {
                charlotte: true,
                mark: true,
                marktext: "转化",
                intro: { name: "转化", content: "谎界：手牌中的【闪】、【酒】和【桃】均视为【杀】" }
            },
            // d. 专门负责清理的扳机技能
            mfsd_huangjie_cleanup: {
                charlotte: true,
                trigger: { player: "phaseEnd" }, // 在发动者的回合结束时触发
                forced: true,
                silent: true,
                popup: false,
                content: function() {
                    // 只做一件事：移除全局效果
                    game.removeGlobalSkill('mfsd_huangjie_global_effect');
                }
            },
    },
    skillTranslate: {
        mfsd_shisu: "时溯",
        mfsd_shisu_info: "锁定技，①每当有牌被使用或弃置时，你在“时空镜”中记录其牌名数量+1。<br>②当你需要使用或打出牌时，若“时空镜”中有对应的记录，你可以消耗对应的记录，视为使用或打出此牌（依此法使用的牌不触发①中效果）。",
        mfsd_huanyu: "寰宇",
        mfsd_huanyu_info: "锁定技，①每当“时空镜”增加时你获得等量个“寰宇”标记。<br>②每当“寰宇”的数量大于一个新的7的倍数时，若还有你未获得的“世界”技能，你增加1点体力上限并回复1点体力，然后你从“世界”技能池中随机获得1个未拥有的技能。<br>世界技能池：<br>【创界】，【盾界】，【星界】，【穹界】，【叛界】，【诺界】，【绝界】，【崩界】，【谎界】。",
        mfsd_yueqian: "跃迁",
        mfsd_yueqian_info: "锁定技，当你进入濒死状态时，减少一点体力上限回复体力至1点。",
        
        // --- 限定技翻译 ---
        mfsd_chuangjie: "创界", mfsd_chuangjie_info: "限定技，出牌阶段，你可以令你在本回合结束后获得一个额外的回合。",
        mfsd_dunjie: "盾界", mfsd_dunjie_info: "限定技，出牌阶段，你可以令直到你的下个回合开始之前，你受到的伤害若大于1则改为1，若不大于1则改为0。",
        mfsd_xingjie: "星界", mfsd_xingjie_info: "限定技，摸牌阶段，你可改为从游戏外获得指定的任意五张不同的牌（无花色点数）。",
        mfsd_qiongjie: "穹界", mfsd_qiongjie_info: "限定技，出牌阶段，你可以令你直到下个回合开始之前，不能成为牌的目标。",
        mfsd_panjie: "叛界", mfsd_panjie_info: "限定技，当你受到伤害后，若伤害来源有手牌，你可以令此伤害结算后，伤害来源区域内的所有手牌移出游戏，然后你回复等同于此次伤害点数的体力。",
        mfsd_nuojie: "诺界", mfsd_nuojie_info: "限定技，出牌阶段，你可以令直到你的下个回合开始之前，所有角色的回复体力效果无效。",
        mfsd_juejie: "绝界", mfsd_juejie_info: "限定技，出牌阶段，你可以令任意名角色翻面，然后若其手牌数大于体力值，其须将手牌弃置至与体力值相等。",
        mfsd_bengjie: "崩界", mfsd_bengjie_info: "限定技，出牌阶段，你可以指定一名角色，其立即死亡。",
        mfsd_huangjie: "谎界", mfsd_huangjie_info: "限定技，出牌阶段，你可以令本回合内使用牌无次数和距离限制，所有角色的手牌中的【闪】、【酒】和【桃】均视为【杀】。",
    },
    characterTaici: {
        "mfsd_shisu": {order:1,content:"一览寰宇！/去观察去触碰！/溯回时间！/超越永恒！/识过去见未来！/引力奇点！/魔法变量！/向真理致敬！/和这个世界说再见吧！"},
        "mfsd_yueqian": {order:2,content:"也许创造与毁灭，本就在构成更大的循环。/生命自身，就是种循环。/我总能回到正确的起点，不是吗？"},
        "mfsd_huanyu": {order:3,content:"第260天，观测塔发现未知星体。/已知是有限的，未知才是无限的。/宇宙引领我们，向高处看。/能够丈量宇宙的人，身没尘土，魂归天穹。/第365天观测显示，星体相撞的可能性极大。/时空镜，向我展示诸世界的变迁。/第584天，找到通往未知的路。/他们说，过分的执着会带来毁灭"},
        "mfsd_chuangjie": {order:4,content:"有人在由神所创的宇宙里，争论中心位置的星体。"},
        "mfsd_dunjie": {order:5,content:"有人在形似盾牌的时空，谈论众神之父和万物的源起。"},
        "mfsd_xingjie": {order:6,content:"有人给我讲了一个，关于井底观星士的故事。"},
        "mfsd_qiongjie": {order:7,content:"有的世界，人们自苍穹之上的船舶驶达彼岸。"},
        "mfsd_panjie": {order:8,content:"有的世界被痛苦包笼，只能靠抛弃过去向前走。"},
        "mfsd_nuojie": {order:9,content:"有的世界，人们不再彼此相信和承诺。"},
        "mfsd_juejie": {order:10,content:"有的世界，人们苦于没有船只，去探索苍穹上的大海。"},
        "mfsd_bengjie": {order:11,content:"有的世界被未知的力量，崩裂成碎片。"},
        "mfsd_huangjie": {order:12,content:"有的世界，人们只愿意相信谎言。"},
        "die":{content:"带我去...我存在的世界！"}
    }
};