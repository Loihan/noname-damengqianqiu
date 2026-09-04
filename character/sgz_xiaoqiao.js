// =====================================================
// 梦小乔  —— 灵籁 / 弦律 / 五音
// 说明：
// 1. 花色统一使用 5 种："heart"(宫)、"diamond"(商)、"club"(徵)、"spade"(羽)、"none"(角/无色)。
// 2. 未知数 A/B/C/D/E 保存在 player.storage.sgz_wuyin_unknown 中，初始均为 1。
// 3. 所有“更改花色”一律采用【红颜】的“视为”机制：通过 mod.suit 让某张牌“视为”目标花色，
//    而非直接改动卡牌的 suit 属性。视为后的花色记录在该牌自身（card._xqSuit）。
// 4. 计算手牌中某花色数量（灵籁的最少花色）时，一律使用“视为后”的花色（即 get.suit(card, player)）。
// 5. 所有“视为”改动只在该牌上记一个普通属性（_xqSuit），不修改 card.suit、不重绘、不依赖归属判定，
//    也不会在获得牌时造成卡死。
// =====================================================
import { dmqcBuildWuyinSuitDialog, wuyinRecordUI, wuyinRefresh } from '../effect/sgz_xiaoqiao.js';

const SUITS = ["heart", "diamond", "club", "spade", "none"]; // 五种花色
const SUIT_KEY = { heart: "gong", diamond: "shang", club: "zheng", spade: "yu", none: "jiao" };
const SUIT_NAME = { heart: "宫", diamond: "商", club: "徵", spade: "羽", none: "角" };
// 用于【五音】① 的花色选择按钮（顺序固定，方便玩家阅读）
const SUIT_OPTIONS = [
    ["heart", "♥ 宫·回复体力+护甲"],
    ["diamond", "♦ 商·伤害+失去体力"],
    ["none", "◈ 角·减少体力上限"],
    ["club", "♣ 徵·弃置牌"],
    ["spade", "♠ 羽·摸牌后弃牌"],
];

// 记录一张牌“视为”的花色（把目标花色直接记在该牌自身，不改 card.suit、不重绘、不依赖归属判定）
function setSuitView(card, suit) {
    if (!card || !SUITS.includes(suit)) return;
    card._xqSuit = suit;
}

// 计算一组牌中“视为后”花色最少的一种（最少不唯一则随机选其一）
function leastSuit(player, cards) {
    const counts = {};
    for (const c of cards) {
        const s = get.suit(c, player);
        if (!(s in counts)) counts[s] = 0;
        counts[s]++;
    }
    let min = Infinity;
    for (const s of SUITS) min = Math.min(min, counts[s] || 0);
    return SUITS.filter(s => (counts[s] || 0) === min).randomGet();
}

// 选择一名角色（统一封装，返回目标或 null）
async function chooseOne(player, prompt, filter, aiFn) {
    const res = await player
        .chooseTarget(prompt, filter, true)
        .set("ai", aiFn)
        .forResult();
    if (res && res.bool && res.targets && res.targets.length) return res.targets[0];
    return null;
}

// 【五音】② 按花色结算效果；boost 为"未知数临时增量"（① 正常为 0，③ 全不同时 +1）
async function wuyinEffect(player, suit, boost) {
    const u = player.storage.sgz_wuyin_unknown || { gong: 1, shang: 1, jiao: 1, zheng: 1, yu: 1 };
    const value = (u[SUIT_KEY[suit]] || 1) + (boost || 0);
    game.log(player, "发动了【五音·" + SUIT_NAME[suit] + "】（数值 " + value + "）");

    if (suit == "heart") {
        // 宫：回复 value 点体力并获 value 点护甲
        const target = await chooseOne(
            player,
            "五音·宫：令一名角色回复" + value + "点体力并获得" + value + "点护甲",
            (c, p, t) => t.isAlive(),
            t => get.attitude(player, t)
        );
        if (target) {
            await target.recover(value);
            await target.changeHujia(value);
        }
    } else if (suit == "diamond") {
        // 商：受 value 点伤害并失去 value 点体力
        const target = await chooseOne(
            player,
            "五音·商：令一名角色受到" + value + "点伤害并失去" + value + "点体力",
            (c, p, t) => t.isAlive(),
            t => -get.attitude(player, t)
        );
        if (target) {
            await target.damage(value, player);
            if (target.isAlive()) await target.loseHp(value);
        }
    } else if (suit == "none") {
        // 角：减少 value 点体力上限（与梅花互换后的效果）
        const target = await chooseOne(
            player,
            "五音·角：令一名角色减少" + value + "点体力上限",
            (c, p, t) => t.isAlive(),
            t => -get.attitude(player, t)
        );
        if (target) {
            await target.loseMaxHp(value);
        }
    } else if (suit == "club") {
        // 徵：弃置 2*value 张牌（与无色互换后的效果）
        const n = 2 * value;
        if (game.filterPlayer(p => p.isAlive() && p.countCards("he") > 0).length) {
            const target = await chooseOne(
                player,
                "五音·徵：令一名角色弃置" + n + "张牌",
                (c, p, t) => t.isAlive() && t.countCards("he") > 0,
                t => -get.attitude(player, t)
            );
            if (target) {
                const a = Math.min(n, target.countCards("he"));
                if (a > 0) await target.chooseToDiscard(a, "he", "五音·徵：弃置" + a + "张牌").set("forced", true).forResult();
            }
        }
    } else if (suit == "spade") {
        // 羽：摸 3*value 张牌后弃置 3*value 张牌
        const n = 3 * value;
        const target = await chooseOne(
            player,
            "五音·羽：令一名角色摸" + n + "张牌后弃置" + n + "张牌",
            (c, p, t) => t.isAlive(),
            t => -get.attitude(player, t)
        );
        if (target) {
            await target.draw(n);
            const a = Math.min(n, target.countCards("h"));
            if (a > 0) await target.chooseToDiscard(a, "h", "五音·羽：弃置" + a + "张牌").set("forced", true).forResult();
        }
    }
}

export default {
    character: {
        sgz_xiaoqiao: {
            sex: "female",
            group: "wu",
            hp: 4,
            maxHp: 6,
            skills: ["sgz_linglai", "sgz_xianlv", "sgz_wuyin", "sgz_wuyin_effects", "sgz_wuyin_effects_clean", "sgz_wuyin_jilu", "sgz_xiaoqiao_record_ui"],
            // 注：sgz_wuyin_effects_clean 是 sgz_wuyin_effects 的 subSkill（出牌阶段结束清除“下一张”花色指定）。
            // 该引擎不会自动把 subSkill 派生技能授予玩家（addSkillTrigger 不展开 subSkill），
            // 若不在此显式列出，其 phaseUseAfter 触发永远不会生效，导致“五音①指定的待定花色”特效在
            // 未出牌而直接结束出牌阶段后一直残留。显式列入后其触发会被正常注册，且 sub 技能不会显示在技能栏。
            img: "extension/大梦千秋/image/sgz_xiaoqiao.jpeg",
            dieAudios: ["ext:大梦千秋/audio/sgz_xiaoqiao/die.mp3"],
            names: "小|乔",
            groupInGuozhan: "wu",
            4: ["des:小乔，庐江皖人，与姐姐大乔并称“二乔”，国色天香，乃江东乔公之女。后嫁周瑜，随其征战，弦歌相和，魂韵流转。<br>她通音律、善琴瑟，一颦一笑皆可引宫商角徵羽。梦中的小乔以五音为刃、以丝弦护体，得天地之韵，奏杀伐之曲。<br>当她的乐音响起，花色随之流转——或疗伤、或夺舍、或断敌之魂。相传她能在梦境中听见众生的“未知数”，并将其化作韵律，于无形中共舞。"]
        },
    },
    characterName: "sgz_xiaoqiao",
    characterTranslate: {
        sgz_xiaoqiao: "梦小乔",
    },
    characterTitle: {
        sgz_xiaoqiao: "弦歌入梦",
    },
    skills: {
        // ===================== 灵籁 =====================
        sgz_linglai: {
            audio:0,
            forced: true,
            trigger: { player: "gainAfter" },
            // 采用【红颜】的“视为”机制：只通过 mod.suit 告诉引擎某张牌“视为”什么花色，不改卡牌本身
            mod: {
                suit: function (card, suit) {
                    if (card._xqSuit && SUITS.includes(card._xqSuit)) return card._xqSuit;
                },
            },
            filter: function (event, player) {
                return event.cards && event.cards.length > 0;
            },
            // 只在获得牌时把“视为”花色记在该牌自身，不修改卡牌、不重绘、不触发动画（避免卡死）
            // 注意：必须写成 async 且显式接收 (event, trigger, player)，否则会被 StepCompiler 重新编译而取不到模块级函数
            content: async function (event, trigger, player) {
                let gained = [];
                try {
                    // 用引擎标准 getg(player) 取本角色此次获得的牌；取不到就用 event.cards
                    if (typeof trigger.getg == "function") {
                        const g = trigger.getg(player);
                        if (g && g.length) gained = g;
                    } else if (trigger.cards && trigger.cards.length) {
                        gained = trigger.cards.slice(0);
                    }
                    if (!gained.length) return;
                    // 只统计“获得之前”的手牌（排除本次获得的牌），并按其“视为后”的花色算最少
                    const before = player.getCards("h").filter(c => !gained.includes(c));
                    const suit = leastSuit(player, before);
                    let changed = false;
                    for (const c of gained) {
                        if (get.suit(c, player) != suit) {
                            setSuitView(c, suit);
                            changed = true;
                        }
                    }
                    if (changed) {
                        game.log(player, "【灵籁】所获之牌花色均视为", "#g【" + get.translation(suit) + "】");
                    }
                } catch (e) {
                    console.error("[梦小乔·灵籁] 结算异常：", e);
                }
            },
        },

        // ===================== 弦律 =====================
        sgz_xianlv: {
            audio:"ext:大梦千秋/audio/sgz_xiaoqiao:2",
            forced: true,
            trigger: { player: "damageBegin" },
            mark: true,
            marktext: "弦律",
            init(player) {
                if (!player.storage.sgz_xianlv) {
                    player.storage.sgz_xianlv = SUITS.slice();
                }
                player.markSkill("sgz_xianlv");
            },
            intro: {
                name: "弦律·韵",
                content: function (storage, player) {
                    const pool = player.storage.sgz_xianlv || SUITS.slice();
                    const str = pool.map(s => get.translation(s)).join(" ");
                    return "尚可变化的花色：<br>" + str;
                },
            },
            async content(event, trigger, player) {
                player.logSkill("sgz_xianlv");
                const num = trigger.num; // 原始伤害数（等量转移用）
                const hs = player.countCards("h");
                const hp = Math.max(0, player.hp);

                // 若手牌数 > 体力：弃至体力、防止此伤害、转移等量伤害
                if (hs > hp) {
                    const need = hs - hp;
                    if (need > 0) {
                        await player.chooseToDiscard(need, "h", "弦律：弃置" + need + "张手牌（至体力数）").forResult();
                    }
                    trigger.cancel(); // 防止此伤害
                    const others = game.filterPlayer(p => p != player && p.isAlive());
                    if (others.length) {
                        const src = trigger.source && trigger.source.isAlive() ? trigger.source : null;
                        const res = await player
                            .chooseTarget("弦律：令一名其他角色受到伤害来源的等量伤害", (c, p, t) => t != player && t.isAlive(), true)
                            .set("ai", t => -get.attitude(player, t))
                            .forResult();
                        if (res && res.bool && res.targets && res.targets.length) {
                            const target = res.targets[0];
                            if (src) await target.damage(num, src);
                            else await target.damage(num, "nosource");
                            game.log(player, "将【弦律】受到的伤害转移给了", target);
                        }
                    }
                }

                // 无论是否满足上述条件都会触发：将所有手牌“视为”为尚可变化花色池中随机一种，并删除该花色
                let pool = player.storage.sgz_xianlv || SUITS.slice();
                if (!pool.length) pool = SUITS.slice(); // 删空则全部恢复
                const chosen = pool.randomGet();
                const hand = player.getCards("h");
                for (const c of hand) {
                    setSuitView(c, chosen);
                }
                pool = pool.filter(s => s != chosen);
                if (!pool.length) pool = SUITS.slice();
                player.storage.sgz_xianlv = pool;
                player.markSkill("sgz_xianlv");
                game.log(player, "触发【弦律】，手牌花色均视为", "#g【" + get.translation(chosen) + "】");
            },
        },

        // ===================== 五音 =====================
        sgz_wuyin: {
            audio:"ext:大梦千秋/audio/sgz_xiaoqiao:12",
            // ① 主动技：出牌阶段限一次，令下一张你使用的牌选择其花色（视为该花色）
            enable: "phaseUse",
            usable: 1,
            ai: {
                order: 6,
                result: {
                    player: function (player) {
                        return 2;
                    },
                },
            },
            async content(event, trigger, player) {
                // ① 选择下一个花色（本地人类用主题五角星选择框，其余回退引擎默认框）
                var aiFn = function (button) {
                    var suit = button.link;
                    if (suit == "heart") return player.isDamaged() ? 9 : 3;
                    if (suit == "diamond") return 8;
                    if (suit == "none") return 7;   // 无色 = 减少体力上限
                    if (suit == "spade") return 6;
                    if (suit == "club") return 5;   // 梅花 = 弃置牌
                    return 1;
                };
                var res;
                if (player.isMine() && !game.online && !_status.auto && !_status.video) {
                    var dlg = null;
                    try {
                        dlg = dmqcBuildWuyinSuitDialog(player);
                    } catch (e) {
                        console.error("[梦小乔·五音变] 主题选择框构造失败，已回退默认框：", e);
                    }
                    if (dlg) {
                        res = await player.chooseButton(dlg).set("ai", aiFn).set("forced", true).set("noconfirm", true).forResult();
                    } else {
                        res = await player.chooseButton(["五音·变：令下一张你使用的牌视为何种花色？", [SUIT_OPTIONS, "textbutton"]]).set("ai", aiFn).set("forced", true).forResult();
                    }
                } else {
                    res = await player.chooseButton(["五音·变：令下一张你使用的牌视为何种花色？", [SUIT_OPTIONS, "textbutton"]]).set("ai", aiFn).set("forced", true).forResult();
                }
                if (res && res.bool && res.links && res.links[0]) {
                    player.storage.sgz_wuyin_nextSuit = res.links[0];
                    player.logSkill("sgz_wuyin");
                    game.log(player, "【五音·变】已指定下一张使用牌的花色为", "#g【" + get.translation(res.links[0]) + "】");
                }
            },
        },

        // 五音 ②③ 使用牌时结算+记录（独立技能，确保触发）
        sgz_wuyin_effects: {
            charlotte: true,
            trigger: { player: "useCard1" },
            forced: true,
            frequent: true,
            init(player) {
                if (!player.storage.sgz_wuyin_unknown) {
                    player.storage.sgz_wuyin_unknown = { gong: 1, shang: 1, jiao: 1, zheng: 1, yu: 1 };
                }
                if (!player.storage.sgz_wuyin_jilu) {
                    player.storage.sgz_wuyin_jilu = [];
                }
                player.markSkill("sgz_wuyin_jilu");
            },
            subSkill: {
                // 出牌阶段结束：若已指定“下一张”花色但未使用，则清除
                clean: {
                    trigger: { player: "phaseUseAfter" },
                    forced: true,
                    silent: true,
                    async content(event, trigger, player) {
                        if (player.storage.sgz_wuyin_nextSuit) {
                            delete player.storage.sgz_wuyin_nextSuit;
                            // 触发点②（出牌阶段结束）：显式刷新右侧特效，清除“待定”显示
                            wuyinRefresh(player);
                        }
                    },
                },
            },
            async content(event, trigger, player) {
                game.playAudio(`../extension/大梦千秋/audio/sgz_xiaoqiao/sgz_wuyin${[1,2,3,4,5,6,7,8,9,10,11,12].randomGet()}.mp3`);
                // ① 只在当前出牌阶段内应用①指定的花色（出牌阶段外不改、也不消耗指定）
                if (player.storage.sgz_wuyin_nextSuit && player.isPhaseUsing()) {
                    const newsuit = player.storage.sgz_wuyin_nextSuit;
                    delete player.storage.sgz_wuyin_nextSuit;
                    if (get.suit(trigger.card, player) != newsuit) {
                        setSuitView(trigger.card, newsuit);
                    }
                }
                // ② 按“视为后”花色结算
                const suit = get.suit(trigger.card, player);
                if (SUITS.includes(suit)) {
                    await wuyinEffect(player, suit, 0);
                }
                // ③ 记录最近四张用牌花色（在②之后），并判定
                if (!player.storage.sgz_wuyin_jilu) player.storage.sgz_wuyin_jilu = [];
                const rec = player.storage.sgz_wuyin_jilu;
                rec.push(suit);
                if (rec.length > 4) rec.shift();
                if (rec.length == 4) {
                    const uniq = rec.toUniqued();
                    if (uniq.length == 4) {
                        // 均不相同：执行一次“未知数+1”的最新一次韵律效果（未知数实际不增加）
                        game.log(player, "【五音】用牌花色均不相同，触发最新韵律（未知数+1）");
                        await wuyinEffect(player, rec[3], 1);
                    } else if (uniq.length == 1) {
                        // 完全相同：增加一点体力上限，此花色未知数永久+1
                        player.gainMaxHp(1);
                        player.storage.sgz_wuyin_unknown[SUIT_KEY[rec[0]]] += 1;
                        game.log(player, "【五音】用牌花色完全相同，增加一点体力上限，【" + SUIT_NAME[rec[0]] + "】未知数永久+1");
                    } else {
                        // 有相同且不完全相同：摸一张牌
                        player.draw(1);
                        game.log(player, "【五音】用牌花色有相同但不全相同，摸一张牌");
                    }
                }
                player.markSkill("sgz_wuyin_jilu");
                // 触发点①（使用牌后）：显式刷新右侧特效，更新“音律”并清除“待定”显示
                wuyinRefresh(player);
            },
        },

        // 五音·用牌记录（标记显示，独立技能确保显示）
//        sgz_wuyin_jilu: {
//            charlotte: true,
//            mark: true,
//            marktext: "音",
//            intro: {
//                name: "五音·用牌记录",
//                content: function (storage, player) {
//                    const rec = player.storage.sgz_wuyin_jilu || [];
//                    const unk = player.storage.sgz_wuyin_unknown || { gong: 1, shang: 1, jiao: 1, zheng: 1, yu: 1 };
//                    let recStr = rec.map(s => get.translation(s)).join(" ");
//                    if (!recStr) recStr = "（无）";
//                    return "最近四张用牌花色（依次）：" + recStr +
//                        "<br>未知数：宫" + unk.gong + " 商" + unk.shang + " 角" + unk.jiao + " 徵" + unk.zheng + " 羽" + unk.yu;
//                },
//            },
//        },
        // 【五音·用牌记录】右侧特效（实现见 effect/sgz_xiaoqiao.js）
        sgz_xiaoqiao_record_ui: wuyinRecordUI,
    },
    skillTranslate: {
        sgz_linglai: "灵籁",
        sgz_linglai_info: "锁定技，当你获得牌时，你将本次获得的牌的花色视为你已有手牌中数量最少的一种花色（最少不唯一则选择其中随机一种）。",
        sgz_xianlv: "弦律",
        sgz_xianlv_info: "锁定技，当你即将受到伤害时依次执行以下效果：<br>①若你的手牌数大于体力，你将手牌弃至体力数并将此伤害转移给一名其他角色；<br>②将你所有手牌的花色随机视为一种可视为花色并删除此花色，删除所有花色后重置。",
        "sgz_xianlv_bg": "韵",
        sgz_wuyin: "五音",
        sgz_wuyin_info: "①出牌阶段限一次，选择一种花色，视为你于此阶段下一张使用的牌的实际花色；<br>②锁定技，当你使用牌时，选择一名角色并根据花色执行对应效果：<br>宫·♥️：回复A点体力并获得A点护甲；<br>商·♦️：受到B点伤害并失去B点体力；<br>角·无色：减少C点体力上限；<br>徵·♣️：弃置2D张牌；<br>羽·♠️：摸3E张牌后弃置3E张牌。<br>然后记录本次的花色韵律；所有韵律变量初始均为1。<br>③当韵律记录变化时，你根据最近的4次韵律执行对应效果：<br>1.均不相同：执行一次变量+1的最近一次韵律的效果；<br>2.有相同且不完全相同：摸一张牌；<br>3.完全相同：增加一点体力上限，该韵律变量永久+1。",
        "sgz_wuyin_jilu": "五音·用牌记录",
        "sgz_wuyin_jilu_bg": "音",
        sgz_wuyin_effects: "五音·律",
        sgz_xiaoqiao_record_ui: "五音·记录特效",
    },
    characterTaici: {
        "sgz_xianlv": { order: 1, content: "但与玲珑相携手，不信山海越不得。/续灵脉以永固，振山海之晴明。/五音流转，他受其害。" },
        "sgz_wuyin": { order: 2, content: "纵使山高路远，莫道止步不前!/以温养之玉，击碎蔽日之石!/孤勇不及之地，且须借力而行！/逆湍流，跨千山，众人止步却向前！/灵脉之上，玉花绽放！/玲珑一怒，巨石崩碎！/玲珑一跃山海!/手持玉花，飞黄腾达！/国书起，玉叶琼花落满地!" },
        "die": { content: "玉花零落，不见白国..." },
    },
};
