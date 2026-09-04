// 绂嶆笂主题选择框 + 潜龙火焰特效已抽离至 effect/sgz_caomao.js
import { dmqcBuildFuyuanDialog, qianlongUI } from '../effect/sgz_caomao.js';

export default {
    character: {
        sgz_caomao: {
            sex: "male",
            group: "wei",
            hp: 3,
            maxHp: 4,
            hujia: 1,
            skills: ["sgz_fuyuan", "sgz_qingtao","sgz_caomao_qianlong_ui"],
            img: "extension/大梦千秋/image/sgz_caomao.jpg",
            dieAudios: ["ext:大梦千秋/audio/sgz_caomao/die.mp3"],
            names: "曹|髦",
            groupInGuozhan: "wei",
            4: ["des:曹髦，字彦士，魏文帝曹丕之孙，东海王曹霖之子。年幼聪慧，好学有成，尝作《潜龙诗》以明志，时人异之。<br>正元元年，司马师废齐王芳，迎立曹髦为帝。时司马氏专权，政出私门，帝年方十四，而志气宏远。每朝会，帝端拱严惮，司马师、昭兄弟虽横，亦不敢正目视之。<br>帝深知权臣之势已成，强不可拔，乃隐忍蓄势，自号“潜龙”。常于宫中设醉乡，托酒酣之际纵论古今，暗察朝臣忠佞。又以诗赋结交中下层武官，密布心腹于禁军诸营，朝野谓之“醉里明台，不觉幽宫”，实暗蓄死士，以待天时。<br>甘露元年，司马师暴卒，司马昭继握大权，愈发跋扈，竟逼帝封其为晋公，加九锡。帝知图穷匕见，乃夜召侍中王沈、尚书王经、散骑常侍王业，泣血盟誓：“司马昭之心，路人所知也。朕不能坐受废辱，今日当与卿等自出讨之！”<br>是日，帝亲率宫中宿卫僮仆数百人，鼓噪而出。司马昭遣心腹贾充率兵拒之于南阙。帝仗剑登辇，亲冒矢石，大呼：“朕乃天子，逆贼安敢无礼！”士卒皆为帝威所慑，逡巡不敢前。太子舍人成济虽受贾充之命，然见帝怒目圆睁，龙威凛然，手中长戟竟不能举。<br>帝身先士卒，竟直入中军。时司马昭未料帝如此果决，仓皇失措，左右四散。帝亲手擒昭，历数其罪：“卿父司马懿为魏托孤之臣，然卿兄弟狼子野心，废立弑杀，视天子如无物。今日朕请卿赴黄泉，以谢先帝！”<br>遂斩司马昭于军前，枭首示众。贾充、成济等党羽悉数伏诛。帝旋即诏告天下，尽收兵权，清洗司马氏余党。然帝念及宣帝司马懿昔日之功，不忍夷其全族，止诛首恶，余者废为庶人。<br>自此，曹魏皇权重振。帝励精图治，改革弊政，贬黜贪佞，拔擢贤良。又废除九品中正制，广开寒门进身之路。朝野称颂，天下归心。<br>帝每忆昔日困渊之时，常叹曰：“伤哉龙受困，不能越深渊。待得惊雷起，腾云越井时。”后世史官评曰：高贵乡公以幼主之姿，处权臣之侧，隐忍十载，终能一蹴而诛国贼，拔风云而见天日，虽少康中兴、宣王复国，何以加焉！然观其用兵之际，亲冒锋镝，决死无畏，岂非天命在魏乎？"]
        },
    },
    characterName: 'sgz_caomao',
    characterTranslate: {
        sgz_caomao: "梦曹髦",
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
                        cardEnabled2: function(card, player) {
                            // 条件判断：血上限>1 且 本回合受伤触发fuyuan的次数还没用完(<2)
                            var canSuffer = (player.maxHp > 1 && (player.getStat().skill.sgz_fuyuan_xiaoguo || 0) < 2);
                            
                            // 逻辑 A：如果能卖血，直接禁止出【闪】，诱导 AI 必定吃杀
                            if (!player.isMine() && card.name == 'shan' && canSuffer) return false;

                            // 逻辑 B：原有的响应时保护潜龙杀逻辑
                            if (!player.isMine() && (_status.event.name == 'chooseToRespond' || _status.event.type == 'response')) {
                                if (card.gaintag && card.gaintag.contains('sgz_caomao_shaTag')) {
                                    var hasNormalSha = player.hasCard(c => c.name == 'sha' && (!c.gaintag || !c.gaintag.contains('sgz_caomao_shaTag')), 'h');
                                    if (hasNormalSha) return false;
                                }
                            }
                        },
                        aiUseful: function(player, card, num) {
                            // 安全检测标签
                            var isQianlong = (card.gaintag && card.gaintag.contains('sgz_caomao_shaTag'));
                            // 兼容转化牌内部的实体牌检测
                            if (!isQianlong && card.cards) isQianlong = card.cards.some(c => c.gaintag && c.gaintag.contains('sgz_caomao_shaTag'));

                            if (isQianlong) {
                                // === 核心逻辑修复：响应环节降权 ===
                                // 如果当前处于“打出/响应”事件（如被杀、决斗、南蛮、倾讨死斗）
                                // 我们给它一个极低的保底分数（0.01），确保它排在所有普通【杀】（约5分）的后面
                                if (_status.event.name == 'chooseToRespond' || _status.event.openedBySkill) {
                                    return 0.01;
                                }
                                // 出牌阶段主动使用时，稍微降低优先级
                                return num - 2; 
                            }
                        },
                        aiValue: function(player, card, num) {
                            if (card.hasGaintag('sgz_caomao_shaTag')) return num+100;
                        },
                        effect: function(card, player, target) {
                            if (target.hasSkill('sgz_fuyuan_xiaoguo') && get.tag(card, 'damage')) {
                                // 如果司马昭(曹髦)还有发动机会，且体力上限安全，认为受伤是 5 分收益
                                if (target.maxHp > 1 && target.getStat().skill.sgz_fuyuan_xiaoguo < 2) {
                                    return [1, 4]; // 1系数(不痛) + 4分额外收益
                                }
                            }
                        }
                    },
                    ai: {
                        maixie_defend: true,
                        expose: 1,
                        threaten: 12,
                        maixue:true,
                        order: function(item, player) {
                            // 只要体力上限 > 1 且有标记可以叠，优先级设定为最高 (20)
                            // 确保在出任何牌（如无中生有15）之前先发动缚渊
                            if (player.maxHp > 1) return 200;
                            return -10;
                        },
                        result: {
                            player: function(player) {
                                // 如果能触发被动的自残（受伤触发），告诉AI这是好事
                                if (_status.event.name == 'damage' && player.maxHp > 1) return 50;
                                return 1;
                                if (player.maxHp == 1) return -1;
                            }
                        },
                        effect: {
                            target:function(card, player, target) {
                                if (get.tag(card, 'damage') && target.maxHp > 1 && target.getStat().skill.sgz_fuyuan_xiaoguo < 2) 
                                    return [1, 3];
                            }
                        }
                    },
                    hideIntro: true,
                    prompt: "【缚渊】：是否发动“缚渊”选择一名其他角色施加权能？",
                    filter: function(event, player) {
                        if(player.maxHp <= 1) return false;
                        return game.hasPlayer(current => current != player);
                    },
                    async content(event, trigger, player) {
                        // 1. 减少上限获得护甲
                        player.loseMaxHp(1);
                        player.changeHujia(1);
                        if(!player.isAlive())return;
                        
                        // 2. 获得“潜龙”【杀】
                        
                        var card = game.createCard('sha');
                        player.gain(card, 'gain2').gaintag = ['sgz_caomao_shaTag'];// 将杀置入手牌
                        game.playAudio(`../extension/大梦千秋/audio/sgz_caomao/sgz_fuyuan${[1,2,3,4,5,6].randomGet()}.mp3`);
                        
                         // 3. 选择目标
                        const res_target = await player.chooseTarget('缚渊：请选择一名其他角色', (card, player, target) => {
                            return target != player;
                        }, true).set('ai', function(target) {
                                var player = _status.event.player;
                                if (get.attitude(player, target) >= 0) return 0;

                                // --- 1. 统一权力值计算 (MaxHP*10 + 威胁度) ---
                                var getPower = function(t) {
                                    return (t.maxHp * 10) + (get.threaten(t));
                                };

                                // --- 2. 排序寻找座次 ---
                                var enemies = game.filterPlayer(p => get.attitude(player, p) < 0).sort((a, b) => getPower(b) - getPower(a));
                                
                                // --- 3. 维度：状态积累 ---
                                var count = 0;
                                if (target.getCards('j', c => ['lebu', 'bingliang', 'shandian'].contains(c.name)).length >= 3) count++;
                                if (target.gaintag && target.getCards('h').some(c => c.hasGaintag('sgz_fuyuan_tag'))) count++;
                                if (target.hasSkill('sgz_fuyuan_gaofeng')) count++;
                                if (target.hasSkill('sgz_fuyuan_juechi')) count++;
                                if (target.hasSkill('sgz_fuyuan_bingzun')) count++;

                                // --- 4. 核心：分流逻辑 ---
                                
                                // A. 斩杀优先：如果有人已经 4 层了，这轮 fuyuan 必选他触发免费处决
                                if (count >= 4) {
                                    var myShas = player.countCards('h', 'sha');
                                    var hisShas = target.countCards('h', 'sha');
                                    if (myShas > hisShas) return 10000 + count * 100;
                                }

                                // B. 让路逻辑：如果是全场最强(第一名)，给极低分，除非没有其他敌人
                                if (enemies.length > 1 && target == enemies[0]) {
                                    return 1; // 给 1 分保底，让 AI 尽量别选他
                                }

                                // C. 锁定逻辑：如果是第二强，给极高分
                                if (enemies.length > 1 && target == enemies[1]) {
                                    return 8000 + getPower(target);
                                }

                                // D. 默认情况
                                return 100 + getPower(target) + (count * 50);
                            }).forResult();
                        if (!res_target.bool || !res_target.targets.length) return;
                        const target = res_target.targets[0];

                        // 4. 检查选项可用性
                        const choices = [];
                        const hasJ = target.getCards('j', c => ['lebu', 'bingliang', 'shandian'].contains(c.name));
                        
                        if ( !target.isDisabled(5) || (hasJ.length < 3 && !target.isDisabled('judge'))) {
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
                            game.playAudio(`../extension/大梦千秋/audio/sgz_caomao/sgz_qingtao${[1,2,3,4,5].randomGet()}.mp3`);
                            player.node.avatar.setBackgroundImage('extension/大梦千秋/image/sgz_caomao2.jpg');
                            // A. 开启腾渊形态
                            player.addTempSkill('sgz_tengyuan', 'roundStart');
                            player.useSkill('sgz_caomao_qianlong_ui')
                            player.update();
                            game.log(player, '已彻底封死', target, '，移除所有枷锁，进行生死对决！');

                            // B. 移除负面效果
                            target.removeSkill(['sgz_fuyuan_mark', 'sgz_fuyuan_gaofeng', 'sgz_fuyuan_juechi', 'sgz_fuyuan_bingzun']);//移除负面技能
                            const f_cards = target.getCards('h', c => c.hasGaintag('sgz_fuyuan_tag'));
                            if (f_cards.length) {
                                target.removeGaintag('sgz_fuyuan_tag', f_cards);
                            }
                            delete target.storage.sgz_fuyuan_mark;//移除“潜谋”锁定的手牌
                            
                            for (let i = 1; i <= 5; i++) {for(let j = 1; j <= 7;j++)target.enableEquip(i);}//恢复装备区
                            const js = target.getCards('j');
                            if (js.length) target.discard(js);//移除判定区牌
                            
                            // C. 轮流打杀逻辑（对方先）
                            let currentAttacker = target;
                            let winner, loser;

                            while (true) {
                                // 提示信息
                                let promptStr = `<span style='color:#FF4500;'>倾讨·生死</span>：请打出一张【杀】，否则将面临<span style='color:#FF4500;'>处决</span>`;
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

                            // D. 赢家夺取一切
                            const l_hp = loser.hp;
                            const l_maxHp = Math.min(loser.maxHp , 5);
                            const l_cards = loser.getCards('hej');

                            winner.maxHp += l_maxHp;
                            winner.hp += l_hp;
                            winner.update();
                            if (l_cards.length) {
                                await winner.gain(l_cards, loser, 'gain2');
                            }
                            if(winner == player){
                                game.playAudio(`../extension/大梦千秋/audio/sgz_caomao/sgz_qingtao${[1,2].randomGet()}.mp3`);
                            }

                            // E. 输家处决
                            loser.die(winner);

                            // F. 获胜奖励
                            winner.insertPhase();
                            winner.addSkill('sgz_qingtao_mark');
                            winner.addMark('sgz_qingtao_mark', 1);
                            player.restoreSkill('sgz_qingtao');
                            game.log(player, '的限定技【倾讨】已重置');
                            return;
                        }

                        // 6. 弹出选项框（本地人类玩家使用专属“帝诏·权能”主题选择框，其余场景回退引擎默认框）
                        const fuyuanAi = function(button) {
                            const player = get.player();
                            const parent = _status.event.getParent();
                            const trig = parent._trigger; // 获取触发源事件
                            
                            // --- 安全判定：只有在受到伤害触发时，才有 isCounter 和 isSource ---
                            let isCounter = false;
                            let isSource = false;
                            
                            if (trig && trig.name == 'damage') {
                                isCounter = (_status.currentPhase != player); // 是否在回合外
                                isSource = (target == trig.source);          // 目标是否为伤害来源
                            }

                            const optId = button.link;

                            // --- 核心：反击状态下，选项5（秉尊）拥有统治级权重 ---
                            if (isCounter && isSource && optId === "opt5") {
                                return 2000; // 极高分，确保反击时必选
                            }

                            // --- 使用明确的权重梯度，解决“按顺序选”的问题 ---
                            // 优先级排序：绝敕(4) > 诰封(3) > 秉尊(5) > 潜谋(2) > 放逐(1)
                            
                            if (optId === "opt4") { 
                                // 绝敕（禁疗）：永久且强力。对神赵云、华佗或残血敌人分值极大
                                let s = 150;
                                game.log('4');
                                if (target.hasSkillTag('recover') || target.hasSkillTag('maixue') || target.hp <= 2) s += 100;
                                if (target.name.indexOf('zhaoyun') != -1) s += 300;
                                return s;
                            } 
                            
                            if (optId === "opt3") {
                                // 诰封（得牌弃一）：永久且克制过牌。对郭嘉、月英等有效
                                let s = 130;
                                if (target.hasSkillTag('draw') || target.hasSkillTag('maixue')) s += 100;
                                return s;
                            } 
                            
                            if (optId === "opt5") {
                                // 秉尊（减伤/偷牌）：永久且克制高输出
                                let s = 110;
                                if (target.hasSkillTag('damageSource') || target.countCards('h', 'sha') >= 2) s += 100;
                                return s;
                            } 
                            
                            if (optId === "opt2") {
                                // 潜谋（封手牌）：非永久。手牌越多分越高
                                return 30 + (target.countCards('h') * 15);
                            } 
                            
                            if (optId === "opt1") {
                                // 放逐（封装备/判定）：非永久。装备越多分越高
                                let s = 40;
                                s += (target.countCards('e') * 30);
                                if (target.hasSkillTag('rejudge')) s -= 200; // 绝对不要给张角司马懿送判定牌
                                return s;
                            }
                            
                            return 1; // 兜底保底分
                        };
                        let res_choice;
                        if (player.isMine() && !game.online && !_status.auto && !_status.video) {
                            // 专属“帝诏·权能”主题选择框
                            // noconfirm=true：引擎 game.Check.confirm 直接跳过，原生“确定/取消”栏永不创建
                            var fuyuanDlg = null;
                            try {
                                fuyuanDlg = dmqcBuildFuyuanDialog(player, target, choices);
                            } catch (e) {
                                // 构造失败不静默：写入日志便于定位（回退默认框保证技能可用）
                                console.error("[大梦千秋] 帝诏·权能选择框构造失败，已回退默认框：", e);
                                game.log(player, '的【缚渊】主题选择框构造失败，已回退默认框（详见控制台）');
                            }
                            if (fuyuanDlg) {
                                res_choice = await player.chooseButton(
                                    fuyuanDlg
                                ).set("ai", fuyuanAi).set("forced", true).set("noconfirm", true).forResult();
                            } else {
                                res_choice = await player.chooseButton([
                                    "缚渊：请对 " + get.translation(target) + " 执行一项权能",
                                    [choices, "textbutton"]
                                ]).set("ai", fuyuanAi).set("forced", true).forResult();
                            }
                        } else {
                            // 引擎默认选择框（AI / 联机 / 托管 / 录像回放）
                            res_choice = await player.chooseButton([
                                "缚渊：请对 " + get.translation(target) + " 执行一项权能",
                                [choices, "textbutton"]
                            ]).set("ai", fuyuanAi).set("forced", true).forResult();
                        }

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
                            target.update();
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
                usable: 20,       
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
                trigger: { player: "recoverEnd" },
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
                priority:1,
                intro: { name: "秉尊", content: "造成伤害-1；造成伤害时，曹髦摸一张牌。" }
            },
        // === 限定技：倾讨 ===
        sgz_qingtao: {
            audio: "ext:大梦千秋/audio/sgz_caomao:5",
            persevereSkill: true,
            enable: "phaseUse",
            limited: true,
            mark: false,
            derivation:"sgz_tengyuan",
            skillAnimation: true,
            animationColor: "fire",
            
            intro: { content: 'limited' },
            // 修改 sgz_qingtao 的 ai 块
            ai: { 
                expose: 1,
                order: 19, 
                threaten:3,
                result: {
                    player: 100,
                    target: function(player, target) {
                        if (get.attitude(player, target) > 0) return -2;

                        // --- 1. 统一权力值计算 ---
                        var power = (target.maxHp * 10) + (get.threaten(target));

                        var enemiesCount = game.countPlayer(p => p != player && get.attitude(player, p) <= 0);

                        // --- 2. 状态避让：如果对方有任何缚渊状态，大幅降低倾讨欲望 ---
                        // 理由：有状态的说明正在被 fuyuan 叠层，留着白嫖更划算
                        var fuyuanCount = 0;
                        if (target.hasSkill('sgz_fuyuan_gaofeng')) fuyuanCount++;
                        if (target.hasSkill('sgz_fuyuan_juechi')) fuyuanCount++;
                        if (target.hasSkill('sgz_fuyuan_bingzun')) fuyuanCount++;
                        if (target.getCards('j').length > 0) fuyuanCount++;
                        
                        // 每一个状态扣掉 500 分，确保有状态的人评分极低
                        var statusPenalty = fuyuanCount * 500;

                        // --- 3. 排序确认：是否是第一强 ---
                        var enemies = game.filterPlayer(p => get.attitude(player, p) <= 0).sort((a, b) => {
                            return ((b.maxHp * 10) + get.threaten(b)) - ((a.maxHp * 10) + get.threaten(a));
                        });

                        // --- 4. 斩杀安全评估 ---
                        var myShas = player.countCards('h', 'sha');
                        var hisShas = target.countCards('h', 'sha');
                        if (hisShas > myShas) return 0; 

                        if(enemiesCount == 1) return -999;

                        // --- 5. 最终评分 ---
                        var finalScore = power - statusPenalty;
                        
                        // 如果是第一强敌人，额外加成
                        if (target == enemies[0]) finalScore += 1000;

                        return -finalScore; // result.target 返回负数表示打击
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
                // A. 开启腾渊形态
                player.addTempSkill('sgz_tengyuan', 'roundStart');
                player.useSkill('sgz_caomao_qianlong_ui')
                player.update();
                game.log(player, '对', target, '发动了【倾讨】，进行最终的死斗！');

                // B. 移除该目标身上所有来自“缚渊”的枷锁（无论是否由缚渊触发）
                target.removeSkill(['sgz_fuyuan_mark', 'sgz_fuyuan_gaofeng', 'sgz_fuyuan_juechi', 'sgz_fuyuan_bingzun']);
                const f_cards = target.getCards('h', c => c.hasGaintag('sgz_fuyuan_tag'));
                if (f_cards.length) {
                    target.removeGaintag('sgz_fuyuan_tag', f_cards);
                }
                delete target.storage.sgz_fuyuan_mark;
                for (let i = 1; i <= 5; i++) {target.enableEquip(i);target.enableEquip(i);target.enableEquip(i);}
                const js = target.getCards('j');
                if (js.length) target.discard(js);
                
                // C. 轮流打杀逻辑（对方先）
                let currentAttacker = target;
                let winner, loser;

                while (true) {
                    // 提示信息
                    let promptStr = `<span style='color:#FF4500;'>倾讨·生死</span>：请打出一张【杀】，否则将面临<span style='color:#FF4500;'>处决</span>`;
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

                // D. 赢家夺取一切 (保持原有逻辑)
                const l_hp = loser.hp;
                const l_maxHp = Math.min(loser.maxHp , 5);
                const l_cards = loser.getCards('hej');

                winner.maxHp += l_maxHp;
                winner.hp += l_hp;
                winner.update();
                if (l_cards.length) {
                    await winner.gain(l_cards, loser, 'gain2');
                }
                if(winner == player){
                    game.playAudio(`../extension/大梦千秋/audio/sgz_caomao/sgz_qingtao${[1,2].randomGet()}.mp3`);
                }

                // E. 输家处决
                loser.die(winner);

                // F. 额外回合奖励
                winner.insertPhase();
                winner.addSkill('sgz_qingtao_mark');
                winner.addMark('sgz_qingtao_mark', 1);
            },
        },
        sgz_qingtao_mark: {
            charlotte: true, // 彻底隐藏技能，仅显示标记
            mark: true,
            marktext: "回合",
            intro: {
                name: "额外回合",
                content: "因倾讨获得#个额外回合", // 自动显示标记数量
            },
            // 逻辑：每当任何回合（包括额外回合）开始时，消耗一个标记
            trigger: { player: "phaseBeginStart" },
            forced: true,
            silent: true,
            content: function() {
                player.removeMark('sgz_qingtao_mark', 1);
                // 如果标记扣完了，自动移除逻辑技能，保持面板干净
                if (player.countMark('sgz_qingtao_mark') <= 0) {
                    player.removeSkill('sgz_qingtao_mark');
                }
            }
        },
        // === 腾渊 ===
        sgz_tengyuan: {
            audio: "ext:大梦千秋/audio/sgz_caomao:6",
            persevereSkill: true,
            forced: true,
            firstDo: true,
            mark: true,
            //marktext: "腾渊",
            //intro: { name: "腾渊", content: "使用“潜龙”杀无距离与次数限制。" },
            trigger: {
                player: "useCard1",
            },
            ai:{
                maixie_hp: true, // 优先回血
                threaten:1.6,
            },
            onremove: function(player) {
                player.node.avatar.setBackgroundImage('extension/大梦千秋/image/sgz_caomao.jpg');
                player.useSkill('sgz_caomao_qianlong_ui');
            },
            content: function() {
                trigger.addCount = false;
                var card = trigger.card;
                if (card.name == 'sha') {
                    if (player.hp == player.maxHp) {
                        player.gainMaxHp(1);
                    } else {
                        player.recover(1);
                    }
                } else {
                    player.draw(1);
                }
            },
            mod: {
                cardUsable: function(card, player, num) {
                    var isQianlong = (card.gaintag && card.gaintag.contains('sgz_caomao_shaTag'));
                    if (!isQianlong && card.cards) {
                        isQianlong = card.cards.some(c => c.gaintag && c.gaintag.contains('sgz_caomao_shaTag'));
                    }
                    
                    if (isQianlong) return Infinity;
                },
                targetInRange: function(card, player) {
                    var isQianlong = (card.gaintag && card.gaintag.contains('sgz_caomao_shaTag'));
                    if (!isQianlong && card.cards) {
                        isQianlong = card.cards.some(c => c.gaintag && c.gaintag.contains('sgz_caomao_shaTag'));
                    }
                    
                    if (isQianlong) return true;
                }
            }
        },
        // ==========================================
        // === 潜龙卡牌特效 UI（实现见 effect/sgz_caomao.js） ===
        sgz_caomao_qianlong_ui: qianlongUI,
    },
    skillTranslate: {
        sgz_fuyuan: "缚渊",
        sgz_fuyuan_info: "每轮开始时/你受到伤害时（每回合限两次）/出牌阶段限两次，若你的体力上限大于1，你可以转化1点体力上限为护甲并获得一张“潜龙”【杀】（无花色点数且不计入手牌上限），然后选择一名其他角色，若有选项能对其造成效果，你选择一个可选项令其执行：<br>①放逐：废除所有装备栏并补齐判定区的【乐不思蜀】、【兵粮寸断】和【闪电】；<br>②潜谋：将当前所有手牌标记为“潜谋”，这些牌明置且不可被使用、打出或弃置；<br>③诰封：获得牌时弃置一张牌；<br>④绝敕：回复体力时失去一点体力；<br>⑤秉尊：造成伤害时，伤害-1并且梦曹髦摸一张牌。<br>若其已处于上述所有状态，你视为对其发动【倾讨】并且结算后“倾讨”视为未发动过。",
        "sgz_caomao_shaTag": "潜龙",
        "sgz_fuyuan_tag": "潜谋",
        "sgz_fuyuan_mark": "潜谋",
        sgz_fuyuan_mark_info:"被“潜谋”标记的手牌明置，且不可使用、打出或弃置",
        "sgz_fuyuan_gaofeng": "诰封",
        sgz_fuyuan_gaofeng_info:"获得牌时，弃置一张牌",
        "sgz_fuyuan_juechi": "绝敕",
        sgz_fuyuan_juechi_info:"回复体力时，失去一点体力",
        "sgz_fuyuan_bingzun": "秉尊",
        sgz_fuyuan_bingzun_info:"造成伤害时，伤害-1并且梦曹髦摸一张牌",
        sgz_qingtao: "倾讨",
        sgz_qingtao_info: "限定技，你本轮获得技能【腾渊】，你可以选择一名其他角色，移除其所有“缚渊”的负面效果、移除其判定区所有牌并恢复所有装备栏，然后你与其执行<span style='color:#FF4500;'>致死</span>的【决斗】效果，胜者<span style='color:#FFFF00;'>夺取</span>败者的体力状态（至多夺取5点体力上限）与所有牌并获得一个额外的回合。",
        sgz_tengyuan: "腾渊",
        sgz_tengyuan_info:"锁定技，①你使用“潜龙”【杀】无次数距离限制；②当你使用【杀】时，若你未/已受伤则增加一点体力上限/回复一点体力；当你使用其他牌时摸一张牌。",
        sgz_caomao_qianlong_ui:"特效"
    },
    characterTaici:{
        "sgz_fuyuan":{order:1,content:"藏牙伏爪甲，嗟我亦同然。/伤哉龙受困，不能越深渊。/气幽但求醉，醒后寻复来。/醉里坐明台，不觉在幽宫。/清酒入肺腑，忿怨暗然生。/心忿无所表，下笔即成篇。/昔卿有功于国，今以放逐代死！/汝等负国求私，岂可再涉政事！/愿遵前人教诲，为一国明帝贤君。/朕虽不德，昧于大道，思与宇内共臻兹路。/为政清且正，黜陟幽与明。/暗恤忠君之士，以待破局之机。/假以时日，必讨司马一族！/若安司马于外，或则皇权可收！/卿当竭命纳忠，何为此逾矩之举！/权臣震主，竟视天子于无物！"},
        "sgz_qingtao":{order:2,content:"少康诛寒浞以中兴，朕夷司马，未尝不可！/帝星终临潜龙跃，拔尽风云始见天！/朕行之决矣，正使死又何惧！/朕宁拼一死，逆贼安敢一战！/朕安可坐受废辱，今日当与卿自出讨之！"},
        "sgz_tengyuan":{oeder:3,content:"虽陷方寸境，一跃天地宽！/待得惊雷起，腾云越井时!/身困犹威烈，鳅鳝何敢前!/䓇䓇东伐叛，赫赫振武威！/陵台决死志，拔剑诛乱臣！/击鼓抒吾忿，登辇出云龙！"},
        "die":{content:"司马昭！朕宁舍身一死，以坐汝弑君之名！"}
    }
}