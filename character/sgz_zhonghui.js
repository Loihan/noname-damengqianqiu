// 权患双生计量 UI 已抽离至 effect/sgz_zhonghui.js
import { zhonghuiUI } from '../effect/sgz_zhonghui.js';
import AI, { helpers } from "../ai/sgz_zhonghui.js";

// ⚠ 原来这里有个 `sgz_jitian_save`（觊天 AI 的"救不救"策略），它**只被 AI 用到**，
//   已于 2026 搬运 AI 时一并搬进 `ai/sgz_zhonghui.js`（那边有完整注释）。

export default {
    character: {
        // 梦钟会：势力神，体力1，上限按原版逻辑由技能维持
        sgz_zhonghui: {
            sex:"male", 
            group:"wei",
            hp:1,
            maxHp:1, 
            skills:["sgz_quanhuan", "sgz_jiaozhao", "sgz_jitian", "sgz_xingfa", "sgz_zhuyue","sgz_audio_effect", "sgz_zhonghui_texiao", "sgz_zhonghui_ui"], 
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
            // ⚠ 按需求**不再显示**「权」的徽标（右侧已有能量条）：
            //   `mark` / `marktext` / `intro` 三个必须一起删，只删一半不够（这是引擎行为）：
            //     · `addSkill` 时 `mark` 为真 → `markSkill()` 建徽标；
            //     · `addMark` 时 player.js:4277 无条件 `markSkill()`，而 `markSkill` 在没有显式 info 时
            //       会自己读 `lib.skill[i].intro`（player.js:9299-9304）——**只要 intro 还在，徽标就会复活**；
            //     · `removeMark` 到 0 时 player.js:4240 用 `lib.skill[i].mark` 决定 markSkill / unmarkSkill。
            //   ⇒ 三个都删掉；标记计数本体是 `player.storage`，与显示无关，逻辑一字未动。
            //   （同款做法参见梦孙寒华【妙剑】的注释。）
            persevereSkill: true,
            ai: AI.sgz_quanhuan,
            // 音频路径适配
            audio: "ext:大梦千秋/audio/sgz_zhonghui/skill:12", //开局一声获得4权
            mod: {
                // A. 价值评估：锦囊牌和核心装备被视为顶级资源
                aiValue: helpers.sgz_quanhuan_aiValue,
                
                // B. 使用意愿：消除 AI 的顾虑，实现“无脑用”
                aiUseful: helpers.sgz_quanhuan_aiUseful,
                
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
                aiOrder: helpers.sgz_quanhuan_aiOrder,

                // 距离逻辑保留
                targetInRange: function(card, player, target) {
                    if (card.name == "sha") return true;
                },
            },
            content() {
                player.addMark("sgz_quanhuan", 4, false);
                                game.log(player, "获得了", get.cnNumber(4), "个", "#g【权】");
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
                    // ⚠ 同上：「患」也不再显示徽标（右侧能量条已经画了护手圆珠=患核）。
                    //   mark / marktext / intro 三个都删，理由见父技能 `sgz_quanhuan` 那段注释。
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
                        player.addMark("sgz_quanhuan_huan", trigger.num, false);
                                                game.log(player, "获得了", get.cnNumber(trigger.num), "个", "#g【患】");
                        game.playAudio('../extension/大梦千秋/audio/sgz_zhonghui/clanxieshu.mp3');
                        // ⚠ 这里**原来**是按「患 ≥ 3」自动换肤（写死 setBackgroundImage + skin.js 的规则表），
                        //   已按需求**整体丢弃** —— 换皮时机改由「局内首次发动【矫诏】」驱动，
                        //   见 skin.js 第 11 节的 `window.dmqcZhonghuiJiaozhaoVideo`。
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
                // ⚠⚠ 必须有这个守卫（梦孙寒华【妙剑】踩过同一个坑）：
                //   引擎会拿**各种事件**来问 `filterEnable`（`game.check` 对每个事件都跑一遍，
                //   `lib.filter.filterEnable` → `info.filter(event, player)`，library/index.js:11169），
                //   其中很多事件（chooseToDiscard / chooseButton / 濒死求桃链 …）**没有 `filterCard`**。
                //   这里无守卫地调 `event.filterCard(...)` → 抛 TypeError → `game.check` 直接中断，
                //   技能按钮就建不出来 → **AI 永远不发动**（本次"还是不会用"的根因）。
                if (!event || typeof event.filterCard !== "function") return false;
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
            ai: AI.sgz_jiaozhao,
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
                    const player = _status.event.player;
                    const name = button.link[2];
                    // ① 时机白名单：只有「出牌阶段主循环」和「被乐时的判定阶段」才允许 AI 主动发动，
                    //    其余时机（别人回合 / 响应别人的杀闪无懈 …）一律否掉 —— 需求："其余时候 AI 不会"。
                    //    ⚠ 判定函数会**沿父事件链向上爬**（选锦囊这一步的父事件是 chooseToUse，
                    //      再上一层才是 phaseUse；只看一层会把所有时机都判成"不在出牌阶段"）。
                    const allowed = helpers.sgz_jiaozhao_aiAllowed(player);
                    if (!allowed) {
                        if (window.dmqcZjAiDebug) console.log("[矫诏AI] 选锦囊 " + name + " → 0（不在白名单时机）");
                        return 0;
                    }
                    // ② 被【乐不思蜀】时，判定阶段就要用矫诏造【无懈可击】把自己的乐拆掉，
                    //    否则判定不中♥ → 整个出牌阶段被跳过（这笔账比留着一张牌亏得多）。
                    if (name === "wuxie" && helpers.sgz_jiaozhao_shouldWuxieSelf(player)) {
                        if (window.dmqcZjAiDebug) console.log("[矫诏AI] 选锦囊 wuxie → 30（被乐，拆乐）");
                        return 30;
                    }
                    if (["wugu", "zhulu_card", "yiyi", "lulitongxin", "lianjunshengyan", "diaohulishan"].includes(name)) return 0;
                    const v = player.getUseValue({ name: name, nature: button.link[3] });
                    // ⚠ 兜底：`getUseValue` 在子事件里可能全都算成 0/负（拿不到目标语境），
                    //   那样 AI 一个锦囊都选不出来 → 技能永远不发动。给一个正的最小值兜住。
                    const score = v > 0 ? v : 0.8;
                    if (window.dmqcZjAiDebug) console.log("[矫诏AI] 选锦囊 " + name + " → " + score);
                    return score;
                },
                backup(links, player) {
                    return {
                        filterCard: true,
                        position: "hes",
                        selectCard: 0,
                        viewAs: { name: links[0][2] },
                        // ⚠⚠ 必须是 **async**！`StepCompiler` 会把**非 async** 的 content/precontent
                        //   重新丢进 `eval` 里跑（报错栈里的 `eval at packStep`），那个作用域只有
                        //   引擎注入的 `game/player/trigger/event/get/lib/_status/ui/ai` 等，
                        //   **拿不到本文件顶部 import 的模块变量**（`helpers`）。
                        //   刚才的 `ReferenceError: helpers is not defined` 就是这么来的
                        //   （`set("ai", card => helpers.…)` 那个闭包在被调用时才去解析 `helpers`）。
                        //   改成 async 后引擎按普通函数执行，模块作用域保留 —— 本包其它武将的
                        //   `content` 全是 async，也是同一个原因。
                        async precontent() {
                            player.removeMark("sgz_quanhuan_huan", 1, false);
                            game.log(player, "移去了", get.cnNumber(1), "个", "#g【患】");
                            player.logSkill("sgz_jiaozhao");
                            // ★ 局内**第一次**发动【矫诏】→ 屏幕中央播放「钟会.mp4」+ 换成「潜蛟觊天2」
                            //   （skin.js 第 11 节；「每局一次」由 player.storage 记，换皮不写存档）
                            if (typeof window.dmqcZhonghuiJiaozhaoVideo == "function") window.dmqcZhonghuiJiaozhaoVideo(player);
                            // ⚠ 出框特效**已不在这里触发**（2026 改动）：按规定改由「使用【逐月】」触发，
                            //   见 skin.js 第 10 节的 `dmqcPlayZhonghuiEffect` 与 sgz_zhuyue.content。
                            //   矫诏这边现在只有视频演出，不再叠一个出框。
                            // ⚠ 这里**原来**还有一句「患 ≤ 2 就写死切回 sgz_zhonghui.jpg」的逆向换皮，
                            //   已随「患 ≥ 3 自动换皮」整体丢弃（现在是单向：首次矫诏 → 潜蛟觊天2）。
                            // 修改点：弃置任意张牌，也可以不弃
                            // ⚠ AI 打分改由 `helpers.sgz_jiaozhao_discardScore` 提供（2026 需求）：
                            //   **优先把手牌全弃掉** —— 【权患·数】维持「手牌数 == 权数」，
                            //   弃光手牌后钩子会立刻把牌补回「权」数 ⇒ 相当于免费换一手牌。
                            //   原来写的是 `4.6 - get.value(card)`，只敢弃低价值的牌，不会弃光。
                            player.chooseToDiscard('he', [0, Infinity], `###矫诏###你可以弃置任意数量的牌`).set("ai", card => helpers.sgz_jiaozhao_discardScore(player, card));
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
            check: helpers.sgz_jitian_check,
            ai: AI.sgz_jitian,
            group: "sgz_jitian_end",
            subSkill: {
                end: {
                    persevereSkill: true,
                    
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
                            player.removeMark("sgz_quanhuan", 1, false);
                                        game.log(player, "移去了", get.cnNumber(1), "个", "#g【权】");
                        }
                        // 2. 若有“患”标记，则移除一个
                        if (player.countMark("sgz_quanhuan_huan") > 0) {
                            player.removeMark("sgz_quanhuan_huan", 1, false);
                    game.log(player, "移去了", get.cnNumber(1), "个", "#g【患】");
                            // ⚠ 这里**原来**还有一句「患 ≤ 2 就写死切回 sgz_zhonghui.jpg」的逆向换皮，
                            //   已随「患 ≥ 3 自动换皮」整体丢弃（现在是单向：首次矫诏 → 潜蛟觊天2）。
                        }
                        game.log(player, '因在本回合发动过【觊天】，移除了标记');
                    }
                }
            }
        },
        // === 4. 逐月  ===
        sgz_zhuyue: {
            audio: "ext:大梦千秋/audio/sgz_zhonghui/skill:4",
            persevereSkill: true,
            // ⚠ 法则技（ruleSkill）：技能拥有者死亡后仍然生效
            ruleSkill: true,
            // 死亡后引擎默认不派发该角色的触发（game/index.js:6192），必须 forceDie
            forceDie: true,
            forceOut: true,
            forced: true,
            priority: 2,
            ai: AI.sgz_zhuyue,
            // 主时机：①自己准备阶段（存活）②每轮开始（死亡后）
            trigger: { player: "phaseZhunbeiBegin", global: "roundStart" },
            // 挂载子技能：logic 处理体力上限调整
            group: ["sgz_zhuyue_logic"],
            filter(event, player) {
                // ① 存活：只有「自己的准备阶段」这一拍
                if (!player.isDead()) return event.name === "phaseZhunbei" && event.player === player;
                // ② 已死亡：roundStart 是在 phase 事件里 event.trigger("roundStart") 抛出的，
                //    ⚠ event.name 是 "phase" 而不是 "roundStart"（content.js:4722），所以这里不能判名字；
                //    死者只会被 trigger 里那个 global: roundStart 派发到，直接放行即可。
                return true;
            },
            async content(event, trigger, player) {
                player.logSkill('sgz_zhuyue');
                // ★【逐月】= 出框特效的唯一触发源（2026 改动）。
                //   两个皮肤形态都认（潜蛟觊天 / 潜蛟觊天2）；原来「使用伤害牌」的自动触发
                //   已在 skin.js 第 3b 节的 _gj.filter 里关掉（来龙去脉见 skin.js 第 10 节）。
                //   【矫诏】那边现在只播视频，不再叠加出框（见同函数上方的 precontent）。
                if (typeof window.dmqcPlayZhonghuiEffect == "function") window.dmqcPlayZhonghuiEffect(player);
                // ⚠ 死亡后：子事件若没有 forceDie，会被 ContentCompilerBase.isPrevented 直接 finish
                //   （library/element/GameEvent/compilers/ContentCompilerBase.js:17 => isDead && !forceDie）
                const choose = player.chooseTarget(
                    '逐月：请选择一名角色对其造成1点伤害并即时调整其体力上限',
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
                choose.forceDie = true;
                // 防御：万一事件被引擎提前 finish（例如被别的机制打断），别让解构直接抛错
                const result = (await choose).result;
                if (!result || !result.bool || !result.targets) return;

                const target = result.targets[0];
                // 标记该次伤害来源，防止误伤（确保只调整逐月造成的伤害）
                // ⚠ 显式给来源：死亡后 player.damage 的默认来源会被丢弃（player.js:7857-7862），
                //   那样 logic 子技能（trigger: source: "damage"）根本收不到。
                const damageEvt = target.damage(1, player);
                damageEvt.sgz_zhuyue = true; 
                await damageEvt;
            },
            subSkill: {
                logic: {
                    persevereSkill: true,
                    // ⚠ 伤害来源是「已死亡的钟会」时，引擎默认不派发该角色的触发（game/index.js:6192），
                    //   所以上限调整也必须 forceDie，否则死亡后逐月只扣血、不调上限。
                    forceDie: true,
                    forceOut: true,
                    // 核心修正：监听伤害造成的一瞬间
                    trigger: { source: "damage" },
                    forced: true,
                    silent: true,
                    // 只有是逐月造成的伤害才触发调整
                    filter: function(event, player) {
                        return event.sgz_zhuyue === true && event.player.isAlive();
                    },
                    content: function() {
                        "step 0"
                        var target = trigger.player;
                        // 依照范本：计算差值并强行扣减
                        var diff = target.maxHp - target.hp;
                        if (diff > 0) {
                            game.log(target, '受到【逐月】影响，调整体力上限至', target.hp);
                            // 第二参数 true 表示强制/静默调整，无视其他技能干预
                            target.loseMaxHp(diff, true); 
                        }
                    }
                }
            }
        },
        // === 5. 兴伐  ===
        sgz_xingfa: {
            audio: "ext:大梦千秋/audio/sgz_zhonghui/skill:3",
            persevereSkill: true,
            init(player) {
                player.storage.sgz_xingfa = 0;
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
                if (player.storage.sgz_xingfa % 2 > 0) {
                    if ((player.storage.sgz_xingfa + trigger.num) % 2 == 0) {
                        player.changeHujia(1);
                        if (player.countMark("sgz_quanhuan") < 4) {
                            player.chooseToDiscard(1, "she", "弃置一张牌并获得一枚“权”标记。");
                            player.addMark("sgz_quanhuan", 1, false);
                                                        game.log(player, "获得了", get.cnNumber(1), "个", "#g【权】");
                        }
                    }
                    player.storage.sgz_xingfa += trigger.num;
                } else {
                    player.storage.sgz_xingfa += trigger.num;
                }
                player.markSkill("sgz_xingfa");
            },
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
        // === 6. 【权患】双生计量 UI（实现见 effect/sgz_zhonghui.js） ===
        sgz_zhonghui_ui: zhonghuiUI,
    },
    skillTranslate: {
        sgz_quanhuan: "权患",
        sgz_quanhuan_info: 
            "锁定技，<span style='color:#FF0000;'><strong>蓄力技</strong></span>，权(4/4)，患(0/∞)，" + 
            "<span style='color:#00FF00;'>蓄力</span>：①当你不因此技能受到伤害/失去体力/减少体力上限时改为获得等量“患”。" +
            "<br>②你的手牌数始终为“权”；出牌阶段结束时，你受到“患”点伤害。",
        sgz_jiaozhao: "矫诏",
        sgz_jiaozhao_info: "回合内限两次，你可以移除1点“患”并弃置至少0张牌视为使用任意非延时性锦囊牌。",
        sgz_jitian: "觊天",
        sgz_jitian_info: 
            "你可将一张♥️或♠️牌当【桃】使用。" +
            "若如此做，本回合的结束阶段，你移除“权”和“患”各1点。",
        sgz_xingfa: "兴伐",
        sgz_xingfa_info: "锁定技，你累计造成的伤害由奇数变为偶数时获得1点护甲，然后若“权”＜4，你弃置1张牌并获得1点“权”。",
        sgz_zhuyue: "逐月",
        sgz_zhuyue_info:
            "<span style='color:#FF0000;'><strong>法则技</strong></span>，锁定技，准备阶段/你死亡后每轮开始时，你选择一名角色对其造成一点伤害并立即调整其体力上限与体力相同。",
    },
    characterTaici:{
        "sgz_quanhuan":{order: 1,content:"大丈夫胸怀四海，有提携玉龙之术！/王霸之志在胸，我岂池中之物！/历经风浪至此，会不可止步于龙门！/我若束手无策，诸位又有何施为？/今长缨在手，欲问鼎九州！/我有佐国之术，可缚苍龙!/入宝山而空手回，其与匹夫何异？/操权弄略，舍小利而谋大局！/天降大任于斯，不受必遭其殃！/空将宝地赠他人，某怎会心甘情愿！/大丈夫行事，岂较一兵一将之得失？/我欲行夏禹旧事，为天下人！"},
        "sgz_jiaozhao":{order: 2,content:"匹夫侥幸行险，岂敢妄居首功！/蛇可吞象，我钟会亦可吞天食地！/坏吾大计者，罪死不赦！/蜀川三千里，皆由我一言决之。/天下风流出我辈，一遇风云便化龙！/顺我者封候拜将；逆我者，斧钺加身！/烧去剑阁八百里，蜀中自有一片天！/天书数册，当为我载此世之名！/我以露布上达天听，安不可称万岁！/事在人为，王侯之封不在人而在我！"},
        "sgz_jitian":{order: 3,content:"动我钟家的人，哼，你长了几个脑袋？/有我在一日，谁也动不得吾族分毫!/燕雀安知鸿鹄之志哉！/吾族恒大，谁敢欺之。/不为刀下脍，且做俎上刀。/心怀屠龙之术，何患手无长缨！/功高终怀异，峙鼎复三分！"},
        "sgz_xingfa":{order: 4,content:"人生艰难如逆水行舟，不欲进则必退！/汉鹿已失，魏牛犹在，吾欲执其耳！/既已功高盖主，何妨冕服加身！"},
        "sgz_zhuyue":{order: 5,content:"风水轮流转，轮到我钟某问鼎重几何了。/道同者可俱容，殊途者成白骨！/天赐良机，不取何为？/我既搏一世之功，亦求万世之名！"},
        "die":{content:"夺取天下之机，尔等竖子竟弃如敝履，啊！！！"}
    }
};
