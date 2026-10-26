import { dmqcBuildMengrenDialog } from '../effect/sgz_guanyu.js';
import AI, { helpers } from "../ai/sgz_guanyu.js";

// =====================================================
// 梦关羽 —— 魂殇 / 梦刃 / 武神 / 武魂
// 结构说明（便于调试）：
//   sgz_hunshang       使命技外壳（ awakenSkill：完成后变现为觉醒技失效）
//     ├─ start         ① 游戏开始最早时机：其他人获得“追魂”，自己移出游戏
//     ├─ judge         ② 有“追魂”回合开始：判定红→移除追魂+临时武神/武魂+接管该回合
//     ├─ suoming       ③ 无“追魂”回合开始 / 一名角色进入濒死：获得“索命”
//     ├─ awaken        ④ 成功：最后一枚“追魂”被移除 → 结束修整+摸 4×索命 张牌+获得梦刃
//     └─ swapback      ② 接管回合结束时归还操控权（临时授予被接管角色）
//   sgz_mengren        梦刃（主动）：出牌阶段限两次，消耗索命获得 武神/武魂
//   sgz_wushen         武神（锁定·视为[杀]）
//   sgz_wuhun          武魂（锁定·视为[杀]）
// 约定：武神/武魂/梦刃为衍生技，开局不持有；由魂殇②临时授予、梦刃永久获得。
// =====================================================

// 使命成功特效：骨骼动画素材随本包自带；播放器 dcdAnim 为十周年UI 全局播放器，不可用则静默跳过。
function dmqcPlayJuexingEffect() {
    if (typeof dcdAnim !== "undefined" && dcdAnim.loadSpine) {
        var gyskill = { name: "../../../大梦千秋/animation/guanyu/SS_gyskill" };
        dcdAnim.loadSpine(gyskill.name, "skel", function () {
            game.playAudio("../extension/大梦千秋/audio/sgz_guanyu/wushengTX.mp3");
            dcdAnim.playSpine(gyskill, {
                speed: 1,
                scale: 0.75,
                x: [0, 0.5],
                y: [0, 0.5],
            });
        });
    }
}

export default {
    character: {
        sgz_guanyu: {
            sex: "male",
            group: "shu",
            hp: 5,
            maxHp: 5,
            // 开局只带魂殇及其子技能（保证触发被注册）。梦刃/武神/武魂为衍生技，开局不授予。
            skills: [
                "sgz_hunshang",
                "sgz_hunshang_start",
                "sgz_hunshang_no_hand",
                "sgz_hunshang_judge",
                "sgz_hunshang_suoming",
                "sgz_hunshang_awaken",
                // 注：sgz_hunshang_swapback 是运行时临时授予的技能，
                // 只需在下方 skills 目录定义（能被 addSkill/addTempSkill 找到），不必开局持有。
            ],
            img: "extension/大梦千秋/image/sgz_guanyu.jpg",
            dieAudios: ["ext:大梦千秋/audio/sgz_guanyu/die.mp3"],
            names: "关|羽",
            groupInGuozhan: "shu",
            4: ["des:关羽，字云长，河东解良人，蜀汉五虎上将之首，武圣之名传世。梦中他以魂殇为引，布追魂于诸敌，以索命养刃；待群魂尽散，再以武神之刃、武魂之戟镇回尘世。"]
        },
    },
    characterName: "sgz_guanyu",
    characterTranslate: { sgz_guanyu: "梦关羽" },
    characterTitle: { sgz_guanyu: "魂断荆州" },
    skills: {
        // ===================== 魂殇（使命技·空壳）=====================
        sgz_hunshang: {
            ai: AI.sgz_hunshang,
            persevereSkill: true,
            audio: "ext:大梦千秋/audio/sgz_guanyu:5",
            awakenSkill: true,
            skillAnimation: true,
            animationColor: "fire",
            forceDie: true,
            derivation: ["sgz_mengren","sgz_wushen_lin","sgz_wuhun_lin","sgz_wushen","sgz_wuhun"],
            // 外壳本身不触发任何内容，只作为“使命技/觉醒技”的载体与展示；具体行为全在 subSkill 里。
            init: function (player) {
                if (player.storage.sgz_hunshang_awaken !== true) {
                    player.storage.sgz_hunshang_awaken = false;
                }
            },
            intro: {
                name: "魂殇",
                content: function (storage, player) {
                    if (player.storage.sgz_hunshang_awaken) {
                        return "使命已完成，魂殇觉醒。";
                    }
                    return "（使命）令场上所有【追魂】失效后觉醒，移回战场并获得【梦刃】。";
                },
            },
            subSkill: {
                // ---------- ① 游戏开始最早时机 ----------
                start: {
                    persevereSkill: true,
                    // firstDo 保证这是本轮“游戏开始”里最先触发的一批；再配合高 priority 早于其它 gameStart。
                    firstDo: true,
                    priority: 10,
                    trigger: { global: "gameStart" },
                    forced: true,
                    silent: true,
                    filter: function (event, player) {
                        return !player.storage.sgz_hunshang_awaken;
                    },
                    content: async function (event, trigger, player) {
                        game.filterPlayer(function (p) {
                            return p != player && p.isAlive();
                        }).forEach(function (p) {
                            p.addMark("sgz_zhuihun", 1);
                        });
                        game.log(player, "令其余所有角色获得【追魂】，随后移出游戏");
                        player.out("sgz_hunshang");
                    },
                },

                // ---------- ① 取消所有角色的初始手牌分发（参考女娲【炼石】，把初始手牌数设为 0） ----------
                no_hand: {
                    persevereSkill: true,
                    trigger: { global: "gameDrawBegin" },
                    forced: true,
                    silent: true,
                    forceOut: true,
                    filter: function (event, player) {
                        return !player.storage.sgz_hunshang_awaken && game.roundNumber == 0;
                    },
                    content: function () {
                        trigger.num = function () { return 0; };
                    },
                },

                // ---------- ② 有“追魂”的回合开始（判定+接管） ----------
                judge: {
                    persevereSkill: true,
                    trigger: { global: "phaseBeginStart" },
                    forced: true,
                    silent: true,
                    forceOut: true, // 梦关羽「修整（移出游戏）」时仍要能触发
                    // ⚠ 需求（2026）：**梦关羽死亡后判定照常进行**，红判定仍由他来操控该回合。
                    //   引擎对死亡角色的触发有硬门槛：`isDead() && !info.forceDie` 直接跳过（game/index.js:6192），
                    //   所以这里必须补 `forceDie: true`；filter 也放开「已死亡」这一状态。
                    forceDie: true,
                    filter: function (event, player) {
                        if (player.storage.sgz_hunshang_awaken) return false;
                        if (event.player == player) return false;
                        // 只有「修整中（移出游戏）」或「已死亡」时才由魂殇②接管别人回合
                        if (!player.isOut() && !player.isDead()) return false;
                        return event.player.hasMark("sgz_zhuihun");
                    },
                    content: async function (event, trigger, player) {
                        game.playAudio(`../extension/大梦千秋/audio/sgz_guanyu/sgz_hunshang${[1,2,3].randomGet()}.mp3`);
                        const marker = trigger.player; // 有“追魂”的回合角色
                        const { result } = await marker.judge(function (card) {
                            return get.color(card) == "red" ? 1 : -1;
                        });
                        const judgeCard = result && result.card;
                        if (!judgeCard || get.color(judgeCard) != "red") return; // 黑：保留追魂，正常回合
                        // 红：
                        marker.removeMark("sgz_zhuihun", 1);
                        // 视觉：追魂标记数归零时显式隐藏标记，避免残留“追魂0”显示
                        if (marker.countMark("sgz_zhuihun") <= 0) marker.unmarkSkill("sgz_zhuihun");
                        // 记录“本回合刚被②处理过（追魂被移除）”，防止同一回合内③“无追魂”误判把关羽移回
                        marker.storage.sgz_hunshang_judged = true;
                        game.log(player, "以红判定夺走", marker, "的追魂标记");
                        marker.addTempSkill(["sgz_wushen_lin", "sgz_wuhun_lin"], { player: "phaseAfter" });
                        game.log(marker, "本回合获得【武神】【武魂】");
                        // 接管本回合：由梦关羽的操控者（人类或AI）来打这一回合
                        game.log(player, "接管", marker, "的本回合");
                        marker._trueMe = player;
                        game.addGlobalSkill("autoswap");
                        if (marker == game.me) {
                            game.notMe = true;
                            if (!_status.auto) ui.click.auto();
                        }
                        // 授予“回合结束/死亡时归还操控权”的临时技能
                        marker.addSkill("sgz_hunshang_swapback");
                    },
                },

                // ---------- ③ 无「追魂」的角色回合开始时 / 一名角色进入濒死状态时 → 获得「索命」 ----------
                suoming: {
                    persevereSkill: true,
                    trigger: { global: ["phaseBeginStart", "dying"] },
                    forced: true,
                    silent: true,
                    forceOut: true,
                    filter: function (event, player) {
                        if (player.storage.sgz_hunshang_awaken) return false;
                        // 濒死那一支：任一角色进入濒死（不含自己）
                        if (event.name === "dying") return event.player != player;
                        // 回合开始那一支：⚠ phaseBeginStart 的宿主事件名是 "phase"，不能用 "phaseBeginStart" 判
                        if (event.player == player) return false;
                        // ② 本回合刚移除过追魂的，不再算「回合开始时没有追魂」
                        if (event.player.storage.sgz_hunshang_judged) return false;
                        return !event.player.hasMark("sgz_zhuihun");
                    },
                    content: async function (event, trigger, player) {
                        player.addMark("sgz_suoming", 1, false);
                        if (event.name === "dying") {
                            game.log(player, "因", trigger.player, "进入濒死状态，获得一个【索命】标记");
                        } else {
                            game.log(player, "因", trigger.player, "回合开始时没有「追魂」，获得一个【索命】标记");
                        }
                    },
                },

                // ---------- ④ 成功：最后一枚「追魂」被移除 → 结束修整 + 摸 4×索命 张牌 + 获得〖梦刃〗 ----------
                awaken: {
                    persevereSkill: true,
                    // 使命成功判定：有角色移除「追魂」，或有带着「追魂」的角色死亡（非经由魂殇②判定移除）
                    // —— 否则最后一枚追魂随角色阵亡一起消失时，没有 removeMark 事件，会卡在无法使命成功。
                    trigger: { global: ["removeMark", "die"] },
                    forced: true,
                    silent: true,
                    forceOut: true,
                    filter: function (event, player) {
                        if (player.storage.sgz_hunshang_awaken) return false;
                        if (event.name == "removeMark") return event.markName == "sgz_zhuihun";
                        if (event.name == "die") return event.player && event.player.hasMark("sgz_zhuihun");
                        return false;
                    },
                    content: async function (event, trigger, player) {
                        const left = game.filterPlayer(function (p) {
                            return p != player && p.isAlive() && p.hasMark("sgz_zhuihun");
                        });
                        if (left.length > 0) return;
                        player.storage.sgz_hunshang_awaken = true;
                        player.awakenSkill("sgz_hunshang");
                        // 结束修整（移出游戏 → 回到场上）
                        player.in("sgz_hunshang");
                        // 摸 4 倍「索命」张牌（同一时机结算，按当前索命数计算）
                        const num = player.countMark("sgz_suoming") * 4;
                        if (num > 0) player.draw(num);
                        player.addSkill("sgz_mengren");
                        game.log(player, "场上最后一枚「追魂」被移除，魂殇使命成功：结束修整，摸", num, "张牌并获得【梦刃】");
                        // 使命成功特效（骨骼动画素材随包自带，播放器 dcdAnim 无则静默跳过）
                        dmqcPlayJuexingEffect();
                    },
                },
                // ----------（辅助）② 接管回合结束时归还操控权 ----------
                swapback: {
                    persevereSkill: true,
                    trigger: {
                        player: ["phaseAfter"],
                        global: ["phaseBeforeStart", "dieAfter"],
                    },
                    lastDo: true,
                    forceDie: true,
                    forced: true,
                    silent: true,
                    filter: function (event, player) {
                        if (!player._trueMe) return false;
                        if (event.name == "die") {
                            return event.player == player || event.player == player._trueMe;
                        }
                        return true;
                    },
                    content: async function (event, trigger, player) {
                        player.removeSkill("sgz_hunshang_swapback");
                    },
                    onremove: function (player) {
                        delete player.storage.sgz_hunshang_judged; // 接管回合结束，清理“②已处理”标记
                        if (player == game.me) {
                            if (!game.notMe) {
                                // 把视角切回操控者（关羽），即使他此刻处于移出游戏状态
                                game.swapPlayerAuto(player._trueMe);
                            } else {
                                delete game.notMe;
                            }
                            if (_status.auto) ui.click.auto();
                        }
                        delete player._trueMe;
                    },
                },
            },
        },

        // ===================== 梦刃（主动，次数不限）=====================
        sgz_mengren: {
            persevereSkill: true,
            audio: "ext:大梦千秋/audio/sgz_guanyu:3",
            enable: "phaseUse",
            // 不设 usable：每回合可反复发动（只要 filter 满足，即有索命或可自减体力上限）
            filter: function (event, player) {

                return player.countMark("sgz_suoming") > 0 || player.maxHp > 1;
            },
            content: async function (event, trigger, player) {

                const hasWushen = player.hasSkill("sgz_wushen");
                const hasWuhun = player.hasSkill("sgz_wuhun");

                // —— 可用的代价：减少一点体力上限 或 移除一枚索命 ——
                const canLoseMax = player.maxHp > 1;
                const canLoseSoming = player.countMark("sgz_suoming") > 0;

                // —— 效果清单（不可用的置灰并提示，供专属选择框展示）——
                const effectList = [];
                effectList.push({
                    key: "wushen", seal: "武", name: "① 武神", motto: "丹心化刃 · 神威破阵",
                    desc: "获得【武神】并修改其为非锁定技",
                    accent: "#f0b64f", disabled: hasWushen, hint: "已获得武神"
                });
                effectList.push({
                    key: "wuhun", seal: "魂", name: "② 武魂", motto: "鬼影缠刃 · 索命无息",
                    desc: "获得【武魂】并修改为非锁定技",
                    accent: "#b06aff", disabled: hasWuhun, hint: "已获得武魂"
                });
                effectList.push({
                    key: "loseall", seal: "殒", name: "③ 殇敌", motto: "血偿索命 · 断其生机",
                    desc: "对一名角色造成致命伤害",
                    accent: "#ff4d4d", disabled: false, hint: ""
                });
                effectList.push({
                    key: "healall", seal: "愈", name: "④ 回天", motto: "以命续命 · 起死回生",
                    desc: "令一名其他角色增加1点体力上限并回满所有体力",
                    accent: "#4fd6a0", disabled: false, hint: ""
                });

                // —— 代价清单（不可用的置灰并提示）——
                const costList = [];
                costList.push({
                    key: "suoming", seal: "索", name: "移除一枚【索命】", motto: "以魂为薪 · 祭此刃",
                    desc: "消耗一枚索命标记发动梦刃（当前持有 " + player.countMark("sgz_suoming") + " 枚）",
                    accent: "#ff6a5a", disabled: !canLoseSoming, hint: "无索命标记"
                });
                costList.push({
                    key: "maxhp", seal: "命", name: "减少一点体力上限", motto: "割舍性命 · 燃血锋",
                    desc: "减少一点体力上限发动梦刃（当前上限 " + player.maxHp + "）",
                    accent: "#c9923f", disabled: !canLoseMax, hint: "体力上限已至1"
                });

                let choice, costPay;
                if (player.isMine() && !game.online && !_status.auto && !_status.video) {
                    // 专属“血魂”主题合一选择框：上一行选【效果】、下一行选【代价】、确认后发动
                    let r = null;
                    try {
                        r = await dmqcBuildMengrenDialog(player, effectList, costList);
                    } catch (e) {
                        console.error("[大梦千秋] 梦刃选择框构造失败，本次不发动：", e);
                        return;
                    }
                    if (!r || !r.bool || !r.links || r.links.length < 2) return;
                    choice = r.links[0];
                    costPay = r.links[1] == "suoming" ? "移除一枚索命" : "减少一点体力上限";
                } else {
                    // 引擎默认两段式（AI / 联机 / 托管 / 录像回放）
                    if (canLoseMax && canLoseSoming) {
                        const cost = await player
                            .chooseControl("减少一点体力上限", "移除一枚索命")
                            .set("prompt", "梦刃：选择支付代价")
                            .set("ai", () => helpers.mengrenCost(player))
                            .forResult();
                        if (!cost || !cost.bool) {
                            helpers.sgz_mengren_abort(player);
                            return;
                        }
                        costPay = cost.control;
                    } else if (canLoseSoming) {
                        costPay = "移除一枚索命";
                    } else {
                        costPay = "减少一点体力上限";
                    }
                    const choices = [];
                    if (!hasWushen) choices.push(["wushen", "① 获得【武神】并修改其为非锁定技"]);
                    if (!hasWuhun) choices.push(["wuhun", "② 获得【武魂】并修改其为非锁定技"]);
                    choices.push(["loseall", "③ 对一名角色造成致命伤害"]);
                    choices.push(["healall", "④ 令一名其他角色增加1点体力上限并回满所有体力"]);
                    const res = await player
                        .chooseButton(["梦刃：选择一项", [choices, "textbutton"]])
                        // AI：④ 项权重见 ai/sgz_guanyu.js（③ 处决 > ①/② 永动机 > ④ 救队友）
                        .set("ai", button => helpers.mengrenOptionScore(button, player))
                        .forResult();
                    if (!res || !res.bool || !res.links || !res.links[0]) {
                        helpers.sgz_mengren_abort(player);
                        return;
                    }
                    choice = res.links[0];
                }

                // —— 支付代价 ——
                if (costPay === "移除一枚索命") {
                    player.removeMark("sgz_suoming", 1);
                    if (player.countMark("sgz_suoming") <= 0) player.unmarkSkill("sgz_suoming");
                } else {
                    player.loseMaxHp(1);
                }
                game.log(player, "梦刃：支付了", costPay === "移除一枚索命" ? "一枚【索命】" : "一点体力上限");

                // —— 发动效果 ——
                if (choice == "wushen") {
                    player.addSkill("sgz_wushen");
                    game.log(player, "梦刃：获得【武神·改】");
                } else if (choice == "wuhun") {
                    player.addSkill("sgz_wuhun");
                    game.log(player, "梦刃：获得【武魂·改】");
                } else if (choice == "loseall") {
                    const r2 = await player
                        .chooseTarget("梦刃：对一名角色造成致命伤害", function (card, p, t) {
                            return t.isAlive();
                        }, true)
                        .set("ai", target => helpers.mengrenLoseAllTarget(player, target))
                        .forResult();
                    if (r2 && r2.bool && r2.targets && r2.targets.length) {
                        const target = r2.targets[0];
                        // 致命伤害 = 其体力值 + 护甲值（护甲会被伤害吃掉，所以两者都要算进来）
                        const num = Math.max(0, (target.hp || 0) + (target.hujia || 0));
                        if (num > 0) await target.damage(num, player);
                        game.log(player, "梦刃：对", target, "造成", num, "点致命伤害（体力值+护甲值）");
                    }
                } else if (choice == "healall") {
                    const r2 = await player
                        .chooseTarget("梦刃：令一名其他角色增加1点体力上限并回满所有体力", function (card, p, t) {
                            return t != player && t.isAlive();
                        }, true)
                        .set("ai", target => helpers.mengrenHealAllTarget(player, target))
                        .forResult();
                    if (r2 && r2.bool && r2.targets && r2.targets.length) {
                        const target = r2.targets[0];
                        const heal = target.maxHp - target.hp;
                        if (heal >= 0) {target.gainMaxHp(1); target.recover(heal+1);}
                        game.log(player, "梦刃：令", target, "增加1点体力上限并回满体力");
                    }
                }
                // 选择结束、效果生效时播放“使命成功”骨骼特效
                dmqcPlayJuexingEffect();
            },
            ai: AI.sgz_mengren,
        },

        // ===================== 武神（梦关羽主动：点击后可将红色手牌当【杀】）=====================
        sgz_wushen: {
            persevereSkill: true,
            audio: "ext:大梦千秋/audio/sgz_guanyu:2",
            // 主动技：梦关羽本人点击发动，将一张红色手牌当【杀】使用/打出
            enable: ["chooseToRespond", "chooseToUse"],
            position: "h",
            selectCard: 1,
            filterCard: function (card) {
                return get.color(card) == "red";
            },
            viewAs: { name: "sha" },
            viewAsFilter: function (player) {
                return player.countCards("h", function (c) { return get.color(c) == "red"; }) > 0;
            },
            prompt: "将一张红色手牌当【杀】使用或打出，可以指定任意目标且不可被响应，造成伤害时改为减少等量体力上限。",
            check: helpers.sgz_wushen_check,
            mod: {
                // AI：红【杀】优先（先削上限，再让黑杀收血/弃牌）
                aiOrder: function (player, card, num) {
                    if (get.name(card, player) == "sha" && get.color(card) == "red") return num + 3;
                    return num;
                },
                // 神杀为普通属性
                cardnature: function (card, player) {
                    if (get.name(card, player) == "sha" && get.color(card) == "red") return false;
                },
                // 神杀无距离限制
                targetInRange: function (card, player, target) {
                    if (get.name(card, player) == "sha" && get.color(card) == "red") return true;
                },
                // 神杀可指定自己
                playerEnabled: function (card, player, target) {
                    if (get.name(card, player) == "sha" && get.color(card) == "red" && target == player) return true;
                },
            },
            group: ["sgz_wushen_directhit", "sgz_wushen_damage"],
            subSkill: {
                // 神杀不可被响应（强中）
                directhit: {
                    persevereSkill: true,
                    trigger: { player: "useCardToTargeted" },
                    forced: true,
                    silent: true,
                    filter: function (event, player) {
                        if (event.name != "useCardToTargeted") return false;
                        if (!event.card) return false;
                        return get.name(event.card, player) == "sha" && get.color(event.card) == "red";
                    },
                    content: function (event, trigger, player) {
                        trigger.getParent().directHit.push(trigger.target);
                        game.log(player, "神杀不可被响应");
                    },
                },
                // 神杀造成伤害时：改为令目标减少等量体力上限
                damage: {
                    persevereSkill: true,
                    trigger: { source: "damageBegin4" },
                    forced: true,
                    silent: true,
                    filter: function (event, player) {
                        return event.card && get.name(event.card, player) == "sha" && get.color(event.card) == "red";
                    },
                    content: function (event, trigger, player) {
                        const num = trigger.num;
                        trigger.cancel();
                        trigger.player.loseMaxHp(num);
                        game.log(player, "神杀造成伤害改为令", trigger.player, "减少", num, "点体力上限");
                    },
                },
            },
            ai: AI.sgz_wushen,
        },

        // ===================== 武神·临（魂殇②授予·锁定·红色自动视为【杀】）=====================
        sgz_wushen_lin: {
            persevereSkill: true,
            ai: AI.sgz_wushen_lin,
            audio:0,
            // 锁定技：被接管角色持有，红色手牌自动视为【杀】
            mod: {
                // AI：被接管角色的红【杀】优先打出
                aiOrder: function (player, card, num) {
                    if (get.name(card, player) == "sha" && get.color(card) == "red") return num + 3;
                    return num;
                },
                cardname: function (card, player) {
                    if (get.color(card) == "red") return "sha";
                },
                cardnature: function (card, player) {
                    if (get.name(card, player) == "sha" && get.color(card) == "red") return false;
                },
                targetInRange: function (card, player, target) {
                    if (get.name(card, player) == "sha" && get.color(card) == "red") return true;
                },
                playerEnabled: function (card, player, target) {
                    if (get.name(card, player) == "sha" && get.color(card) == "red" && target == player) return true;
                },
            },
            group: ["sgz_wushen_lin_directhit", "sgz_wushen_lin_damage"],
            subSkill: {
                directhit: {
                    persevereSkill: true,
                    trigger: { player: "useCardToTargeted" },
                    forced: true,
                    silent: true,
                    filter: function (event, player) {
                        if (event.name != "useCardToTargeted") return false;
                        if (!event.card) return false;
                        return get.name(event.card, player) == "sha" && get.color(event.card) == "red";
                    },
                    content: function (event, trigger, player) {
                        trigger.getParent().directHit.push(trigger.target);
                        game.log(player, "神杀不可被响应");
                    },
                },
                damage: {
                    persevereSkill: true,
                    trigger: { source: "damageBegin4" },
                    forced: true,
                    silent: true,
                    filter: function (event, player) {
                        return event.card && get.name(event.card, player) == "sha" && get.color(event.card) == "red";
                    },
                    content: function (event, trigger, player) {
                        const num = trigger.num;
                        trigger.cancel();
                        trigger.player.loseMaxHp(num);
                        game.log(player, "神杀造成伤害改为令", trigger.player, "减少", num, "点体力上限");
                    },
                },
            },
        },

        // ===================== 武魂（梦关羽主动：点击后可将黑色手牌当【杀】）=====================
        sgz_wuhun: {
            persevereSkill: true,
            audio: "ext:大梦千秋/audio/sgz_guanyu:2",
            // 主动技：梦关羽本人点击发动，将一张黑色手牌当【杀】使用/打出
            enable: ["chooseToRespond", "chooseToUse"],
            position: "h",
            selectCard: 1,
            filterCard: function (card) {
                return get.color(card) == "black";
            },
            // 龙霄同款：返回带标记的转化牌，供 cardUsable/nocount/damage 可靠识别鬼杀
            viewAs: function (cards) {
                if (!cards || !cards.length) return null;
                var card = { name: "sha" };
                card._sgz_wuhun_gui = true;
                return card;
            },
            viewAsFilter: function (player) {
                return player.countCards("h", function (c) { return get.color(c) == "black"; }) > 0;
            },
            prompt: "将一张黑色手牌当不计入次数的【杀】使用或打出，造成伤害时改为令其失去等量体力并弃置等量牌。",
            check: helpers.sgz_wuhun_check,
            mod: {
                // AI：黑【杀】排在红杀之后（只加一点点，保证仍会被使用）
                aiOrder: function (player, card, num) {
                    if (card && card._sgz_wuhun_gui) return num + 0.5;
                    if (get.name(card, player) == "sha" && get.color(card) == "black") return num + 0.5;
                    return num;
                },
                // 鬼杀为普通属性
                cardnature: function (card, player) {
                    if (card && card._sgz_wuhun_gui) return false;
                },
                // 鬼杀无次数限制（不论是否还有出杀次数都能使用）
                cardUsable: function (card, player, num) {
                    if (card && card._sgz_wuhun_gui) return Infinity;
                    return num;
                },
                // 二次保险：次数用尽后仍能继续指定目标（参考镇猎）
                cardUsableTarget: function (card, player, target) {
                    if (card && card._sgz_wuhun_gui) return true;
                },
            },
            group: ["sgz_wuhun_nocount", "sgz_wuhun_damage"],
            subSkill: {
                // 鬼杀不计入本回合【杀】次数
                nocount: {
                    persevereSkill: true,
                    trigger: { player: "useCard1" },
                    forced: true,
                    silent: true,
                    filter: function (event, player) {
                        return event.card && event.card._sgz_wuhun_gui;
                    },
                    content: function (event, trigger, player) {
                        trigger.addCount = false;
                        var stat = player.getStat("card");
                        if (typeof stat["sha"] == "number") stat["sha"]--;
                    },
                },
                // 鬼杀造成伤害时：改为令目标失去等量体力并弃置等量牌
                damage: {
                    persevereSkill: true,
                    trigger: { source: "damageBegin4" },
                    forced: true,
                    silent: true,
                    filter: function (event, player) {
                        return event.card && event.card._sgz_wuhun_gui;
                    },
                    content: function (event, trigger, player) {
                        const num = trigger.num;
                        const target = trigger.player;
                        trigger.cancel();
                        target.loseHp(num);
                        const n = Math.min(num, target.countCards("he"));
                        if (n > 0) target.discard(target.getCards("he").randomGets(n));
                        game.log(player, "鬼杀造成伤害改为令", target, "失去", num, "点体力并弃置", n, "张牌");
                    },
                },
            },
            ai: AI.sgz_wuhun,
        },

        // ===================== 武魂·临（魂殇②授予·锁定·黑色自动视为【杀】）=====================
        sgz_wuhun_lin: {
            persevereSkill: true,
            ai: AI.sgz_wuhun_lin,
            audio:0,
            // 锁定技：被接管角色持有，黑色手牌自动视为【杀】
            mod: {
                // AI：被接管角色的黑【杀】排在红杀之后
                aiOrder: function (player, card, num) {
                    if (get.name(card, player) == "sha" && get.color(card) == "black") return num + 0.5;
                    return num;
                },
                cardname: function (card, player) {
                    if (get.color(card) == "black") return "sha";
                },
                cardnature: function (card, player) {
                    if (get.name(card, player) == "sha" && get.color(card) == "black") return false;
                },
                cardUsable: function (card, player, num) {
                    if (get.name(card, player) == "sha" && get.color(card) == "black") return Infinity;
                    return num;
                },
                // 二次保险：次数用尽后仍能继续指定目标（参考镇猎）
                cardUsableTarget: function (card, player, target) {
                    if (get.name(card, player) == "sha" && get.color(card) == "black") return true;
                },
            },
            group: ["sgz_wuhun_lin_nocount", "sgz_wuhun_lin_damage"],
            subSkill: {
                nocount: {
                    persevereSkill: true,
                    trigger: { player: "useCard1" },
                    forced: true,
                    silent: true,
                    filter: function (event, player) {
                        if (!event.card) return false;
                        return get.name(event.card, player) == "sha" && get.color(event.card) == "black";
                    },
                    content: function (event, trigger, player) {
                        trigger.addCount = false;
                        var stat = player.getStat("card");
                        if (typeof stat["sha"] == "number") stat["sha"]--;
                    },
                },
                damage: {
                    persevereSkill: true,
                    trigger: { source: "damageBegin4" },
                    forced: true,
                    silent: true,
                    filter: function (event, player) {
                        return event.card && get.name(event.card, player) == "sha" && get.color(event.card) == "black";
                    },
                    content: function (event, trigger, player) {
                        const num = trigger.num;
                        const target = trigger.player;
                        trigger.cancel();
                        target.loseHp(num);
                        const n = Math.min(num, target.countCards("he"));
                        if (n > 0) target.discard(target.getCards("he").randomGets(n));
                        game.log(player, "鬼杀造成伤害改为令", target, "失去", num, "点体力并弃置", n, "张牌");
                    },
                },
            },
        },

        // ===================== 标记辅助（显示“追魂/索命”）=====================
        sgz_zhuihun: {
            persevereSkill: true,
            mark: true,
            charlotte: true,
            marktext: "追魂",
            intro: {
                name: "追魂",
                content: "被梦关羽【魂殇】标记。回合开始时判定：红色则失去此标记并获【武神】【武魂】且被接管本回合。",
                nocount: true, // 追魂只需显示标记本身，不显示旁侧数字
            },
        },
        sgz_suoming: {
            persevereSkill: true,
            mark: true,
            charlotte: true,
            marktext: "索命",
            intro: {
                name: "索命",
                content: "可被【梦刃】消耗，用于获得【武神】/【武魂】。",
            },
        },
    },
    skillTranslate: {
        sgz_hunshang: "魂殇",
        sgz_hunshang_info: 
            "<span style='color:#FF0000;'><strong>法则技</strong></span>，使命技，①游戏开始时，所有其他角色获得“<span style='color:#FF0000;'><strong>追魂</strong></span>”标记；取消所有角色的起始手牌分发；你修整。" +
            "<br>②有“<span style='color:#FF0000;'><strong>追魂</strong></span>”的角色回合开始时：其判定，若为红色：移除其“<span style='color:#FF0000;'><strong>追魂</strong></span>”，其本回合获得技能【武神】、【武魂】并改为由你操纵。" +
            "<br>③没有“<span style='color:#FF0000;'><strong>追魂</strong></span>”的角色回合开始时/当一名角色进入濒死状态时：你获得一枚“索命”。" +
            "<br>④<span style='color:#00FF00;'>成功</span>：当场上最后一枚“<span style='color:#FF0000;'><strong>追魂</strong></span>”被移除时，你结束修整并摸4倍“索命”张牌，获得技能〖梦刃〗。",
        sgz_mengren: "梦刃",
        sgz_mengren_info: 
            "出牌阶段，你可以移除一枚“索命”或减少一点体力上限，选择一项：" +
            "<br>①获得〖武神〗并修改其为非锁定技；" +
            "<br>②获得〖武魂〗并修改其为非锁定技；" +
            "<br>③对一名角色造成致命伤害；" +
            "<br>④令一名其他角色增加1点体力上限并回复体力至体力上限。",
        sgz_wushen: "武神·改",
        sgz_wushen_info: "你可以将一张红色手牌当【杀】使用或打出；你使用的红色【杀】为目标任意且不可被响应的普通【杀】，造成伤害时改为令目标减少等量体力上限。",
        sgz_wuhun: "武魂·改",
        sgz_wuhun_info: "你可以将一张黑色手牌当【杀】使用或打出；你使用的黑色【杀】为无次数限制的普通【杀】，造成伤害时改为令目标失去等量体力并弃置等量牌。",
        sgz_wushen_lin: "武神",
        sgz_wushen_lin_info: "锁定技，你的红色手牌视为普通【杀】；你使用的红色【杀】目标任意且不可被响应，造成伤害时改为令目标减少等量体力上限。",
        sgz_wuhun_lin: "武魂",
        sgz_wuhun_lin_info: "锁定技，你的黑色手牌视为普通【杀】；你使用的黑色【杀】无次数限制，造成伤害时改为令目标失去等量体力并弃置等量牌。",
        sgz_zhuihun: "追魂",
        sgz_suoming: "索命",
    },
    characterTaici: {
        "sgz_hunshang": { order: 1, content: "长夜与我同在！/征服，以凛冬的名义！/我的大刀冰冷如雪！/为我们的永生而战，为我们的不朽而战!/不过丧失些许记忆，我对此毫不留恋！" },
        "sgz_mengren": { order: 2, content: "武圣关云长在此！/战魂不灭！/五虎之势未已！" },
        "sgz_wushen": { order: 3, content: "力敌千军！/百战何惧！" },
        "sgz_wuhun": { order: 4, content: "践踏他们！/粉碎所有的抵抗！" },
        "die": { content: "回想起...最后的人性..." },
    },
};
