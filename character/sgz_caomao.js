export default {
    character: {
        sgz_caomao: {
            sex: "male",
            group: "shen",
            hp: 3,
            maxHp: 4,
            hujia: 1,
            skills: ["sgz_fuyuan", "sgz_qingtao","sgz_caomao_qianlong_ui"],
            img: "extension/大梦千秋/image/sgz_caomao.jpg",
            dieAudios: ["ext:大梦千秋/audio/sgz_caomao/die.mp3"],
            names: "曹|髦",
            groupInGuozhan: "wei",
            4: ["des:司马昭之心，路人皆知也！今日之战，非成功，即死耳！"]
        },
    },
    characterName: 'sgz_caomao',
    characterTranslate: {
        sgz_caomao: "曹髦",
    },
    skills: {
        // === 主技能：缚渊 ===
        sgz_fuyuan: {
            audio: "ext:大梦千秋/audio/sgz_caomao:16",
            group:"sgz_fuyuan_xiaoguo",
            persevereSkill: true,
            subSkill:{
                xiaoguo:{
                    persevereSkill: true,
                    enable: "phaseUse",
                    usable: 2,
                    trigger: { 
                        global: "roundStart",
                        player: "damageEnd" 
                    },
                    mod: {
                        ignoredHandcard: function(card, player) {
                            // 只要这张牌带有我们添加的标签，就忽略手牌上限
                            if (card.hasGaintag('sgz_caomao_shaTag')) return true;
                        },
                        cardDiscardable(card, player, name) {
                            if (name == 'phaseDiscard' && card.hasGaintag('sgz_caomao_shaTag')) return false;
                        },
                        aiUseful: function(player, card, num) {
                            if (card.hasGaintag('sgz_caomao_shaTag')) return num-2; 
                        },
                        aiValue: function(player, card, num) {
                            if (card.hasGaintag('sgz_caomao_shaTag')) return num+100;
                        }
                    },

                    hideIntro: true,
                    prompt: "【缚渊】：是否发动“缚渊”选择一名其他角色施加权能？",
                    filter: function(event, player) {
                        return game.hasPlayer(current => current != player);
                    },
                    async content(event, trigger, player) {
                        // 1. 减少上限获得护甲
                        player.loseMaxHp(1);
                        if(player.hujia<5)player.changeHujia(1);
                        // 2. 获得“潜龙”【杀】
                        if( player.hp > player.countCards('h', card => card.hasGaintag('sgz_caomao_shaTag')) ){ 
                            var card = game.createCard('sha');
                            player.gain(card, 'gain2').gaintag = ['sgz_caomao_shaTag'];// 将杀置入手牌
                        }
                        game.playAudio(`../extension/大梦千秋/audio/sgz_caomao/sgz_fuyuan${[1,2,3,4,5,6].randomGet()}.mp3`);

                        // 3. 选择目标
                        const res_target = await player.chooseTarget('缚渊：请选择一名其他角色', (card, player, target) => {
                            return target != player;
                        }, true).set('ai', target => -get.attitude(player, target)).forResult();
                        
                        if (!res_target.bool || !res_target.targets.length) return;
                        const target = res_target.targets[0];

                        // 4. 检查选项可用性
                        const choices = [];
                        const hasJ = target.getCards('j', c => ['lebu', 'bingliang', 'shandian'].contains(c.name));
                        if (!target.isDisabled(1) || hasJ.length < 3) {
                            choices.push(["opt1", "【放逐】：废除所有装备栏并在判定区补齐【乐不思蜀】、【兵粮寸断】与【闪电】。"]);
                        }
                        const unmarkedCount = target.countCards('h', c => !c.hasGaintag('sgz_fuyuan_tag'));
                        if (unmarkedCount > 0) {
                            choices.push(["opt2", "【潜谋】；标记当前所有手牌为“潜谋”，明置且不可被使用、打出和弃置。"]);
                        }
                        if (!target.hasSkill('sgz_fuyuan_gaofeng')) choices.push(["opt3", "【诰封】：赋予“诰封”标记，获得牌后须弃置一张牌。"]);
                        if (!target.hasSkill('sgz_fuyuan_juechi')) choices.push(["opt4", "【绝敕】：赋予“绝敕”标记，回复体力时失去一点体力。"]);
                        if (!target.hasSkill('sgz_fuyuan_bingzun')) choices.push(["opt5", "【秉尊】：赋予“秉尊”标记，造成的伤害-1，且造成伤害时你摸一张牌。"]);

                        // 5. 终极对决逻辑：若都不可选
                        if (choices.length === 0) {
                            player.$skill('倾讨', 'fire', 'red', 'avatar');
                            game.playAudio(`../extension/大梦千秋/audio/sgz_caomao/sgz_qingtao${[1,2,3,4,5,6,7].randomGet()}.mp3`);
                            player.node.avatar.setBackgroundImage('extension/大梦千秋/image/sgz_caomao2.jpg');
                            player.update();
                            game.log(player, '已彻底封死', target, '，移除所有枷锁，进行生死对决！');

                            // A. 移除负面效果
                            target.removeSkill(['sgz_fuyuan_mark', 'sgz_fuyuan_gaofeng', 'sgz_fuyuan_juechi', 'sgz_fuyuan_bingzun']);//移除负面技能
                            const f_cards = target.getCards('h', c => c.hasGaintag('sgz_fuyuan_tag'));
                            if (f_cards.length) {
                                target.removeGaintag('sgz_fuyuan_tag', f_cards);
                            }
                            delete target.storage.sgz_fuyuan_mark;//移除“潜谋”锁定的手牌
                            
                            for (let i = 1; i <= 5; i++) {for(let j = 1; j <= 7;j++)target.enableEquip(i);}//恢复装备区
                            const js = target.getCards('j');
                            if (js.length) target.discard(js);//移除判定区牌
                            
                            // B. 轮流打杀逻辑（对方先）
                            let currentAttacker = target;
                            let winner, loser;

                            while (true) {
                                // 提示信息
                                let promptStr = `倾讨·生死：请打出一张【杀】，否则将面临处决`;
                                let res = await currentAttacker.chooseToRespond({ name: 'sha' }).set('prompt', promptStr).forResult();

                                if (!res.bool) {
                                    loser = currentAttacker;
                                    winner = (loser === player) ? target : player;
                                    break;
                                }
                                // 交换出牌人
                                currentAttacker = (currentAttacker === player) ? target : player;
                            }

                            game.log(winner, '获得了最终的胜利！');

                            // C. 赢家夺取一切
                            const l_hp = loser.hp;
                            const l_maxHp = loser.maxHp;
                            const l_cards = loser.getCards('hej');

                            winner.maxHp += l_maxHp;
                            winner.hp += l_hp;
                            winner.update();
                            if (l_cards.length) {
                                await winner.gain(l_cards, loser, 'gain2');
                            }
                            if(winner == player){
                                game.playAudio(`../extension/大梦千秋/audio/sgz_caomao/sgz_qingtao${[6,7].randomGet()}.mp3`);
                            }

                            // D. 输家处决
                            loser.die(winner);

                            // E. 获胜奖励
                            winner.insertPhase();
                            player.restoreSkill('sgz_qingtao');
                            game.log(player, '的限定技【倾讨】已重置');
                            //player.player.restoreSkill('sgz_qingtao');
                            return;
                        }
                        // 6. 正常弹出选项框
                        const res_choice = await player.chooseButton([
                            "缚渊：请对 " + get.translation(target) + " 执行一项权能",
                            [choices, "textbutton"]
                        ]).set('ai', button => (button.link[0] == 'opt2' ? 10 : 5)).set('forced', true).forResult();

                        if (!res_choice || !res_choice.bool) return;
                        const choice = res_choice.links[0];
                        

                        // 7. 执行常规效果
                        if (choice == 'opt1') {
                            game.playAudio(`../extension/大梦千秋/audio/sgz_caomao/sgz_fuyuan${[7,8].randomGet()}.mp3`);
                            for (let i = 1; i <= 5; i++) {for(let j = 1; j <= 7;j++)target.disableEquip(i);}
                            ['lebu', 'bingliang', 'shandian'].forEach(name => {
                                if (!target.hasJudge(name)) target.addJudge(game.createCard(name));
                            });
                        }
                        else if (choice == 'opt2') {
                            game.playAudio(`../extension/大梦千秋/audio/sgz_caomao/sgz_fuyuan${[9,10].randomGet()}.mp3`);
                            const cards = target.getCards('h');
                            target.addGaintag(cards, 'sgz_fuyuan_tag');
                            if (!target.storage.sgz_fuyuan_mark) target.storage.sgz_fuyuan_mark = [];
                            target.storage.sgz_fuyuan_mark.addArray(cards);
                            target.addSkill('sgz_fuyuan_mark');
                        } 
                        else if (choice == 'opt3') {
                            game.playAudio(`../extension/大梦千秋/audio/sgz_caomao/sgz_fuyuan${[11,12].randomGet()}.mp3`);
                            target.addSkill('sgz_fuyuan_gaofeng');}
                        else if (choice == 'opt4') {
                            game.playAudio(`../extension/大梦千秋/audio/sgz_caomao/sgz_fuyuan${[13,14].randomGet()}.mp3`);
                            target.addSkill('sgz_fuyuan_juechi');}
                        else if (choice == 'opt5') {
                            game.playAudio(`../extension/大梦千秋/audio/sgz_caomao/sgz_fuyuan${[15,16].randomGet()}.mp3`);
                            target.addSkill('sgz_fuyuan_bingzun');
                        }
                    }
                }
            }
        },
            // --- 附属效果技能 ---
            // 潜谋
            sgz_fuyuan_mark: {
                charlotte: true,
                mark: true,
                marktext: "潜谋",
                intro: { name: "被“缚渊”囚禁的手牌", content: "cards" },
                mod: {
                    cardVisible: (card) => card.hasGaintag('sgz_fuyuan_tag') ? true : undefined,
                    cardEnabled2: (card) => card.hasGaintag('sgz_fuyuan_tag') ? false : undefined,
                    cardRespondable: (card) => card.hasGaintag('sgz_fuyuan_tag') ? false : undefined,
                    cardSavable: (card) => card.hasGaintag('sgz_fuyuan_tag') ? false : undefined,
                    cardDiscardable: (card) => card.hasGaintag('sgz_fuyuan_tag') ? false : undefined,
                },
                trigger: { player: "loseAfter" },
                forced: true, silent: true,
                filter: (event, player) => event.cards && event.cards.some(c => player.storage.sgz_fuyuan_mark && player.storage.sgz_fuyuan_mark.contains(c)),
                content: function() {
                    player.storage.sgz_fuyuan_mark.removeArray(trigger.cards.filter(c => player.storage.sgz_fuyuan_mark.contains(c)));
                    if (!player.storage.sgz_fuyuan_mark.length) player.removeSkill('sgz_fuyuan_mark');
                    player.update();
                }
            },
            // 诰封
            sgz_fuyuan_gaofeng: {
                charlotte: true,
                mark: true, marktext: "诰封", forced: true,
                trigger: { player: "gainAfter" },
                filter: (event, player) => player.countCards('h') > 0,
                content: () => { player.chooseToDiscard('h', 1, true).set('prompt', '【诰封】：获得牌后须弃置一张'); },
                intro: { name: "诰封", content: "获得牌后，须弃置一张手牌。" }
            },
            // 绝敕
            sgz_fuyuan_juechi: {
                charlotte: true,
                mark: true, marktext: "绝敕", forced: true, priority: 10,
                trigger: { player: "recoverBefore" },
                content: () => {player.loseHp(1); },
                intro: { name: "绝敕", content: "回复体力时失去1点体力。" }
            },
            //秉尊
            sgz_fuyuan_bingzun: {
                charlotte: true,
                mark: true, marktext: "秉尊", forced: true,
                trigger: { source: "damageBegin1" },
                filter: (event, player) => event.num > 0,
                content: function() {
                    trigger.num--;
                    const caomao = game.findPlayer(p => p.hasSkill('sgz_fuyuan'));
                    if (caomao) caomao.draw();
                },
                intro: { name: "秉尊", content: "造成伤害-1；造成伤害时，曹髦摸一张牌。" }
            },
        // === 限定技：倾讨 ===
        sgz_qingtao: {
            audio: "ext:大梦千秋/audio/sgz_caomao:7",
            persevereSkill: true,
            enable: "phaseUse",
            limited: true,
            mark: false,
            skillAnimation: true,
            animationColor: "fire",
            intro: { content: 'limited' },
            ai: {
                order: 1,
                result: {
                    target: function(player, target) {
                        if (!player.isEnemyOf(target)) return 0;
                        if (player.countCards('h', 'sha') > target.countCards('h', 'sha')) {
                           return get.attitude(_status.event.player, target);
                        }
                    }
                }
            },
            filter: function(event, player) {
                return !player.storage.sgz_qingtao;
            },
            filterTarget: function(card, player, target) {
                player.node.avatar.setBackgroundImage('extension/大梦千秋/image/sgz_caomao2.jpg');
                return player != target;
            },
            async content(event, trigger, player) {
                player.awakenSkill('sgz_qingtao');
                var target = event.target;
                game.log(player, '对', target, '发动了【倾讨】，进行最终的死斗！');

                // A. 移除该目标身上所有来自“缚渊”的枷锁（无论是否由缚渊触发）
                target.removeSkill(['sgz_fuyuan_mark', 'sgz_fuyuan_gaofeng', 'sgz_fuyuan_juechi', 'sgz_fuyuan_bingzun']);
                const f_cards = target.getCards('h', c => c.hasGaintag('sgz_fuyuan_tag'));
                if (f_cards.length) {
                    target.removeGaintag('sgz_fuyuan_tag', f_cards);
                }
                delete target.storage.sgz_fuyuan_mark;
                for (let i = 1; i <= 5; i++) {target.enableEquip(i);target.enableEquip(i);target.enableEquip(i);}
                const js = target.getCards('j');
                if (js.length) target.discard(js);
                
                // B. 轮流打杀逻辑（对方先）
                let currentAttacker = target;
                let winner, loser;

                while (true) {
                    // 提示信息
                    let promptStr = `倾讨·生死：请打出一张【杀】，否则将面临处决`;
                    let res = await currentAttacker.chooseToRespond({ name: 'sha' }).set('prompt', promptStr).forResult();

                    if (!res.bool) {
                        loser = currentAttacker;
                        winner = (loser === player) ? target : player;
                        break;
                    }
                    // 交换出牌人
                    currentAttacker = (currentAttacker === player) ? target : player;
                }

                game.log(winner, '获得了最终的胜利！');

                // C. 赢家夺取一切 (保持原有逻辑)
                const l_hp = loser.hp;
                const l_maxHp = loser.maxHp;
                const l_cards = loser.getCards('hej');

                winner.maxHp += l_maxHp;
                winner.hp += l_hp;
                winner.update();
                if (l_cards.length) {
                    await winner.gain(l_cards, loser, 'gain2');
                }
                if(winner == player){
                    game.playAudio(`../extension/大梦千秋/audio/sgz_caomao/sgz_qingtao${[6,7].randomGet()}.mp3`);
                }

                // D. 输家处决
                loser.die(winner);

                // E. 额外回合奖励
                winner.insertPhase();
            },
        },
        // ==========================================
        //          潜龙卡牌特效 UI 逻辑
        // ==========================================
        sgz_caomao_qianlong_ui: {
            charlotte: true,
            silent: true,
            trigger: { 
                player: ["gainAfter", "loseAfter", "enterGame"],
                global: ["phaseBefore", "phaseBeginStart", "gameStart"] 
            },
            forced: true,
            priority: -10,
            init: function(player) {
                // 1. 注入 SVG 火焰滤镜（这是实现火焰撕裂感的灵魂）
                if (!document.getElementById('qianlong_flame_svg')) {
                    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                    svg.id = 'qianlong_flame_svg';
                    svg.style.cssText = "position:absolute; width:0; height:0; pointer-events:none;";
                    svg.innerHTML = `
                        <filter id="qianlong-vivid-fire">
                            <!-- 湍流噪点产生火舌分叉 -->
                            <feTurbulence type="fractalNoise" baseFrequency="0.05 0.02" numOctaves="3" seed="1">
                                <animate attributeName="seed" from="1" to="100" dur="10s" repeatCount="indefinite" />
                            </feTurbulence>
                            <!-- 偏移映射将噪点应用到形状上 -->
                            <feDisplacementMap in="SourceGraphic" scale="15" />
                        </filter>
                    `;
                    document.body.appendChild(svg);
                }

                // 2. 注入 CSS 样式
                if (!document.getElementById('qianlong_card_v2_style')) {
                    var style = document.createElement('style');
                    style.id = 'qianlong_card_v2_style';
                    style.innerHTML = `
                        /* 潜龙火焰卡牌类名 */
                        .qianlong-fire-active {
                            
                        }

                        /* 火焰外圈：负责扭动的火舌 */
                        .qianlong-fire-active::before {
                            content: "";
                            position: absolute;
                            top: -12px; left: -10px; right: -10px; bottom: -8px;
                            /* 深蓝紫色渐变 */
                            background: linear-gradient(to top, 
                                #1a0033 0%, 
                                #4b0082 30%, 
                                #ff0000 60%, 
                                #710909 100%);
                            filter: url(#qianlong-vivid-fire) blur(1.5px); /* 应用SVG滤镜 */
                            opacity: 0.8;
                            z-index: -1;
                            border-radius: 10px;
                            mix-blend-mode: screen;
                            animation: qianlong-fire-flicker 0.2s infinite;
                        }

                        /* 火焰内圈：负责核心亮度 */
                        .qianlong-fire-active::after {
                            content: "";
                            position: absolute;
                            top: -2px; left: -2px; right: -2px; bottom: -2px;
                            box-shadow: 
                                0 0 10px #4b0082, 
                                0 0 20px #0000ff,
                                inset 0 0 15px rgba(10, 0, 47, 0.4);
                            border: 1.5px solid rgba(0, 210, 255, 0.6);
                            border-radius: 4px;
                            z-index: 5;
                            pointer-events: none;
                            mix-blend-mode: color-dodge;
                            animation: qianlong-inner-glow 2s infinite alternate;
                        }

                        @keyframes qianlong-fire-flicker {
                            0% { opacity: 0.7; transform: scale(1.02) translateY(0); }
                            50% { opacity: 0.9; transform: scale(1) translateY(-2px); }
                            100% { opacity: 0.8; transform: scale(1.01) translateY(1px); }
                        }

                        @keyframes qianlong-inner-glow {
                            from { box-shadow: 0 0 10px #2e014f; }
                            to { box-shadow: 0 0 25px #000036, 0 0 5px #fff; }
                        }


                    `;
                    document.head.appendChild(style);
                }
            },
            content: function() {
                // 实时检索标记卡牌并添加类名
                var cards = player.getCards('h');
                for (var i = 0; i < cards.length; i++) {
                    var card = cards[i];
                    if (card.hasGaintag('sgz_caomao_shaTag')) {
                        if (!card.classList.contains('qianlong-fire-active')) {
                            card.classList.add('qianlong-fire-active');
                        }
                    } else {
                        card.classList.remove('qianlong-fire-active');
                    }
                }
            }
        },
    },
    skillTranslate: {
        sgz_fuyuan: "缚渊",
        sgz_fuyuan_info: "每轮开始时/你受到伤害时（每回合限两次）/出牌阶段限两次，你可以转化一点体力上限为护甲（至多获得5点护甲），然后若你手牌中的“潜龙”【杀】少于你的体力值，你获得一张“潜龙”【杀】（无花色点数且不计入手牌上限），然后选择一名其他角色，若有选项能对其造成效果，你选择一个可选项令其执行：<br>①放逐：废其所有装备栏并补齐判定区的【乐不思蜀】、【兵粮寸断】和【闪电】；<br>②潜谋：将其当前所有手牌标记为“潜谋”（明置且不可使用、打出或弃置）；<br>③诰封：获得“诰封”标记（获得牌时弃置1张牌）；<br>④绝敕：获得“绝敕”标记（回复体力时失去1点体力）；<br>⑤秉尊：获得“秉尊”标记（造成伤害时，伤害-1并且你摸一张牌）。<br>若其已处于上述所有状态，你视为对其发动【倾讨】并且结算后“倾讨”视为未发动过。",
        "sgz_caomao_shaTag": "潜龙",
        "sgz_fuyuan_tag": "潜谋",
        "sgz_fuyuan_mark": "潜谋",
        sgz_fuyuan_mark_info:"被“潜谋”标记的手牌明置，且不可使用、打出或弃置",
        "sgz_fuyuan_gaofeng": "诰封",
        sgz_fuyuan_gaofeng_info:"获得牌时，弃置1张牌",
        "sgz_fuyuan_juechi": "绝敕",
        sgz_fuyuan_juechi_info:"回复体力时，失去1点体力",
        "sgz_fuyuan_bingzun": "秉尊",
        sgz_fuyuan_bingzun_info:"造成伤害时，伤害-1并且梦曹髦摸一张牌",
        sgz_qingtao: "倾讨",
        sgz_qingtao_info: "限定技，你可以选择一名其他角色，移除其所有“缚渊”的负面效果、移除其判定区所有牌并恢复所有装备栏，然后你与其执行<span style='color:#FF4500;'>致死</span>的【决斗】效果，胜者<span style='color:#FFFF00;'>夺取</span>败者的体力状态与所有牌并获得一个额外的回合。",
    },
    characterTaici:{
        "sgz_fuyuan":{order:1,content:"藏牙伏爪甲，嗟我亦同然。/伤哉龙受困，不能越深渊！/虽陷方寸境，一跃天地宽！/醉里坐明台，不觉在幽宫。/清酒入肺腑，忿怨暗然生。/待得惊雷起，腾云越井时。/昔卿有功于国，今以放逐代死！/汝等负国求私，岂可再涉政事！/愿遵前人教诲，为一国明帝贤君。/朕虽不德，昧于大道，思与宇内共臻兹路。/为政清且正，黜陟幽与明。/暗恤忠君之士，以待破局之机。/身困犹威烈，鳅鳝何敢前！/䓇䓇东伐叛，赫赫振武威！/卿当竭命纳忠，何为此逾矩之举！/权臣震主，竟视天子于无物！"},
        "sgz_qingtao":{order:2,content:"陵台决死志，拔剑诛乱臣！/击鼓抒吾忿，登辇出云龙！/朕行之决矣，正使死又何惧！/朕宁拼一死，逆贼安敢一战！/朕安可坐受废辱，今日当与卿自出讨之！/少康诛寒浞以中兴，朕夷司马，未尝不可！/帝星终临潜龙跃，拔尽风云始见天！"},
        "die":{content:"司马昭！朕宁舍身一死，以坐汝弑君之名！"}
    }
}