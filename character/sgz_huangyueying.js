// 黄月英·卡牌终结特效 已抽离至 effect/sgz_huangyueying.js
import { huangyueyingUI } from '../effect/sgz_huangyueying.js';
import AI, { helpers } from "../ai/sgz_huangyueying.js";

// ============================================================
//  梦黄月英 · 2026 重做
// ------------------------------------------------------------
//  技能组：璇和（sgz_xuanhe）/ 长明（sgz_changming）/ 绮梦（sgz_qimeng）
//  新增卡牌：集巧生烟（sgz_jqsy，定义在 card/card.js 的 dmqc_jqsy 卡包）
//  ⚠ 原【集巧】技能已删除：它的效果（回合开始摸锦囊）并入绮梦③。
// ============================================================

/// 集巧生烟的牌名（卡牌 id）
const JQSY = "sgz_jqsy";
/// 「集巧生烟」的**固定花色点数**（8 张全部写死，不再随机）：
///   ♦️ 方块 J / Q / K；♠️ 黑桃 A / K；♥️ 红桃 A / J / Q
/// ⚠ 引擎里 A=1、J=11、Q=12、K=13。
const JQSY_LIST = [
    ["diamond", 11],
    ["diamond", 12],
    ["diamond", 13],
    ["spade", 1],
    ["spade", 13],
    ["heart", 1],
    ["heart", 11],
    ["heart", 12],
];

/// 造一张「集巧生烟」（花色点数**只能**从上面那 8 组里取，不再随机生成）
function sgzHyJqsy() {
    const [suit, number] = JQSY_LIST[Math.floor(Math.random() * JQSY_LIST.length)];
    return game.createCard(JQSY, suit, number);
}

/// 装备栏位总数（武器 + 防具 + 坐骑 ×2 + 宝物，含被扩展出来的栏位）
/// ⚠ 用引擎口径 `countEnabledSlot`（原生 1 + 扩展数 − 被废除数），与「装备栏数」一致。
function sgzHySlotCount(player) {
    let num = 0;
    for (let i = 1; i <= 5; i++) {
        try {
            num += player.countEnabledSlot("equip" + i);
        } catch (e) {}
    }
    return num;
}

/// 本包「神武」牌名池（card/card.js 里所有 duyusw_ 前缀的装备，含宝物 equip5）
function sgzHyShenwuPool() {
    if (!lib.card) return [];
    return Object.keys(lib.card).filter(name => name.indexOf("duyusw_") === 0 && get.type(name) === "equip");
}

/// 本回合「出【杀】次数 +N」的存储键（配合 sgz_xuanhe_addsha 的 mod 使用）
const SHA_KEY = "sgz_xuanhe_sha";

/// 集巧生烟的卡面**固定用梦黄月英的原皮图**（不随换肤变化）
const JQSY_IMAGE = "ext:大梦千秋/image/sgz_huangyueying.jpg";

/// 把 `lib.card[sgz_jqsy].image` 强制指回原皮图。
/// ⚠ 卡牌包是**动态 import** 的（extension.js 里 import("./card/card.js")），可能比本文件晚加载；
///   而且有些美化/皮肤类扩展会改写 lib.card 的 image。这里只在「值不对」时改，且只动我们这一张牌。
function sgzHyLockJqsyImage() {
    try {
        if (!lib.card || !lib.card[JQSY]) return false;
        if (lib.card[JQSY].image !== JQSY_IMAGE) {
            lib.card[JQSY].image = JQSY_IMAGE;
            console.log("[大梦千秋] 集巧生烟卡面已锁定为原皮图：" + JQSY_IMAGE);
        }
        return true;
    } catch (e) {
        return false;
    }
}

// ============================================================
//  技能顺序（同时也是千幻「皮肤 / 台词」面板里的显示顺序）
//  ⚠ 想改顺序就只改这一行：千幻的顺序 = get.character(name,3) 的顺序，
//    而 characterTaici 里**不要再写 order**（写了就把顺序钉死，改 skills 也不会变）。
// ============================================================
const HY_SKILLS = ["sgz_qimeng", "sgz_xuanhe", "sgz_changming"];

// 模块加载时先试一次（卡牌包若已加载则立刻锁定；没加载也无妨，gameStart 还会再来一次）
sgzHyLockJqsyImage();

// 台词文本（千幻「台词」页显示用；音频仍按技能上的 `audio: "ext:大梦千秋/audio/sgz_huangyueying:N"` 随机播）
const HY_TAICI_CONTENT = {
	sgz_qimeng: "尽觅心中良策，方解当下之围。/冥思一想，则有万千计来。/暗藏机扩，使敌措手不及。/集古今之智，晓天下之机。/才如泉涌，用之不竭。/以有穷之思，化无穷之变。",
	sgz_xuanhe: "折蟾宫之桂，造乞巧之机。/良辰星伴月，精械刃藏机。/晶莹剔透月，七窍玲珑心。/太阴采高桂，佳月集精华。",
	sgz_changming: "竹马嗅青梅，与君倦飞共白头。/情丝绕慧剑，清风难断有情人。",
	die: "才略纵如泉涌，终有竭绝之日...",
};

/// 按 HY_SKILLS 的顺序生成 characterTaici（不写 order，靠对象键顺序）
function hyBuildCharacterTaici() {
	const out = {};
	for (const id of HY_SKILLS) {
		if (HY_TAICI_CONTENT[id] === undefined) continue;
		out[id] = { content: HY_TAICI_CONTENT[id] };
	}
	if (HY_TAICI_CONTENT.die) out.die = { content: HY_TAICI_CONTENT.die };
	return out;
}
export default {
    character: {
        // 梦黄月英：神势力，4/6分布。技能组：璇和、长明、绮梦
        sgz_huangyueying: {
            sex:"female", 
            group:"shu", 
            hp:4,
            maxHp:6, 
            skills: [...HY_SKILLS, "sgz_huangyueying_ui"], 
            img:"extension/大梦千秋/image/sgz_huangyueying.jpg",
            dieAudios:["ext:大梦千秋/audio/sgz_huangyueying/die.mp3"],
            names:"黄|月英",
            groupInGuozhan:"shu",
            4:["des:黄氏月英，沔阳名士承彦之女也。幼而敏慧，通奇门，晓机巧，常居草庐，潜心造化之术。<br>建安之末，月英于静夜忽生一梦，见将星陨于五丈原，蜀汉气数将尽，满朝志士皆成焦土。觉后惊悸，乃誓以一身机巧之学，逆转乾坤。其集天下之精金，运璇玑之妙理，制连弩、木牛，变幻无端，神鬼莫测。<br>月英更于隆中点燃一盏不灭之灯，以此火为引，导汉军于幽暗。自此，蜀师所至，铁甲森森，机关轰鸣，破秦岭天险如等闲。当孔明北伐之际，月英随军策应，魏人见其攻城军械，皆以为天工降世，无不望风而溃。及至大汉复兴，洛阳城内万灯齐耀，正如当年梦中之长明。其以一女子之智，开万世太平之基，史称“奇才国母”。",]
        },
    },
    characterName: 'sgz_huangyueying',
    characterTitle: {sgz_huangyueying: "明良千古",},
    characterTranslate: {sgz_huangyueying: "梦黄月英",},
    skills: {
        // ====================================================
        //  1. 璇和
        // ====================================================
        //  锁定技，当你使用锦囊牌时摸一张牌，此牌不计入手牌上限。
        //  然后在锦囊牌生效前，按该锦囊的花色执行对应效果。
        //  ⚠ 「不计入手牌上限」是**跟着摸到的那张牌走**（打 gaintag + mod.ignoredHandcard），
        //    不是永久 +1 上限，也不是所有锦囊都不计。
        sgz_xuanhe: {
            audio: "ext:大梦千秋/audio/sgz_huangyueying:4",
            forced: true,
            persevereSkill: true,
            trigger: { player: "useCard" },
            filter(event, player) {
                if (get.type2(event.card) != "trick") return false;
                return ["heart", "diamond", "club", "spade"].includes(get.suit(event.card));
            },
            ai: AI.sgz_xuanhe,
            mod: {
                // 摸到的那张牌不计入手牌上限（弃牌阶段 needsToDiscard 会跳过它）
                ignoredHandcard(card, player) {
                    return card.hasGaintag("sgz_xuanhe_tag");
                },
                cardUsable: function (card, player, num) {
                    if (card && card.name == 'sha') {
                        var extra = player.storage[SHA_KEY];
                        if (typeof extra == 'number' && extra > 0) return num + extra;
                    }
                    return num;
                },
                targetInRange: function (card, player, target) {
                    // ♦️ 那一刀「无距离限制」：用一次性暗号卡标记（见 content 里 diamond 分支）
                    if (card && card.storage && card.storage.sgz_xuanhe_free) return true;
                },
                aiUseful: helpers.sgz_xuanhe_aiUseful,
                aiValue: helpers.sgz_xuanhe_aiValue,
            },
            async content(event, trigger, player) {
                const suit = get.suit(trigger.card);
                player.logSkill("sgz_xuanhe");

                // ---------- ① 摸一张牌，并让这张牌不计入手牌上限 ----------
                const before = player.getCards("h").slice();
                await player.draw(1);
                const drawn = player.getCards("h").filter(card => !before.includes(card));
                for (const card of drawn) player.addGaintag(card, "sgz_xuanhe_tag");

                // ---------- ② 锦囊生效前，按花色执行效果 ----------
                if (suit == "heart") {
                    // ♥️ 已受伤 → 回复 1 点；否则 → 增加 1 点体力上限
                    if (player.isDamaged()) await player.recover(1);
                    else await player.gainMaxHp(1);
                } else if (suit == "diamond") {
                    // ♦️ 视为对一名角色使用一张无次数、无距离限制的火【杀】
                    const choose = await player
                        .chooseTarget("璇和：视为对一名其他角色使用一张无距离、无次数限制的火【杀】", true, function (card, p, target) {
                            // 需求：♦️ 的火【杀】只能选其他角色，不能指向自己
                            return target !== p;
                        })
                        .set("ai", function (target) {
                            const me = get.player();
                            return get.effect(target, { name: "sha", nature: "fire" }, me, me);
                        })
                        .forResult();
                    const target = choose && choose.targets && choose.targets[0];
                    if (target) {
                        // `storage.sgz_xuanhe_free` 给 targetInRange 用；`addCount:false` 让它不计入出杀次数
                        const sha = { name: "sha", nature: "fire", storage: { sgz_xuanhe_free: true } };
                        const evt = player.useCard(sha, target, false, "noai");
                        // ⚠ 引擎的 useCard 返回的是**事件对象（thenable）**，不是 Promise：
                        //   先 `.set()` 再 await，别写成 `await player.useCard(...).set(...)`
                        //   （那样会在 Promise 上取 .set，直接报 not a function）。
                        if (evt && typeof evt.set === "function") evt.set("addCount", false);
                        await evt;
                    }
                } else if (suit == "spade") {
                    // ♠️ 获得一名其他角色的一张牌
                    const choose = await player
                        .chooseTarget("璇和：选择一名其他角色，获得其一张牌", true, function (card, p, target) {
                            return target != p && target.countCards("he") > 0;
                        })
                        .set("ai", function (target) {
                            return -get.attitude(get.player(), target);
                        })
                        .forResult();
                    const target = choose && choose.targets && choose.targets[0];
                    if (target) await player.gainPlayerCard(target, "he", true);
                } else if (suit == "club") {
                    // ♣️ 本回合出【杀】次数 +1（可叠加），并获得一张「集巧生烟」
                    player.storage[SHA_KEY] = (player.storage[SHA_KEY] || 0) + 1;
                    player.addTempSkill("sgz_xuanhe_addsha");
                    await player.gain([sgzHyJqsy()], "gain2");
                }
            },
            // ⚠ 不要把 addsha 写进 group：玩家一开局就「拥有」它的话，
            //   `addTempSkill` 会因为 `hasSkill && tempSkills 未登记` 直接 return（player.js:10630），
            //   结果既不会在回合结束移除、也不会触发 onremove 清空出杀计数。
            //   只登记 subSkill，靠 addTempSkill 在发动时临时授予。
            subSkill: {
                // 「本回合出杀次数 +N」的载体：回合结束（phaseAfter）自动移除，并在 onremove 里清空计数
                addsha: {
                    persevereSkill: true,
                    sub: true,
                    onremove: function (player) {
                        delete player.storage[SHA_KEY];
                    },
                },
            },
        },
        // ====================================================
        //  2. 长明
        // ====================================================
        //  锁定技，准备阶段和结束阶段，你卜算X（X为装备栏数）。
        sgz_changming: {
            audio: "ext:大梦千秋/audio/sgz_huangyueying:2",
            forced: true,
            persevereSkill: true,
            ai: AI.sgz_changming,
            group: ["sgz_changming_prep", "sgz_changming_finish"],
            subSkill: {
                prep: {
                    persevereSkill: true,
                    sub: true,
                    trigger: { player: "phaseZhunbeiBegin" },
                    // 需求：斗地主里【长明】要先于地主技【跋扈】结算。
                    //   · 引擎按 `get.priority(skill)` **降序**排同时机触发（gameEvent.js:887-889）
                    //   · 跋扈写的是 `_priority: 0`；（get/index.js:469-475 会直接采用 `_priority`）
                    //   · 这里给 `priority: 1` ⇒ 实际优先级 100 > 0，于是长明先发动。
                    priority: 1,
                    forced: true,
                    async content(event, trigger, player) {
                        player.logSkill("sgz_changming");
                        const x = Math.min(7, sgzHySlotCount(player));
                        if(x > 0)
                            await player.chooseToGuanxing(x);
                    },
                },
                finish: {
                    persevereSkill: true,
                    sub: true,
                    trigger: { player: "phaseJieshuBegin" },
                    forced: true,
                    async content(event, trigger, player) {
                        player.logSkill("sgz_changming");
                        const x = Math.max(1, sgzHySlotCount(player));
                        await player.chooseToGuanxing(x);
                    },
                },
            },
        },
        // ====================================================
        //  3. 绮梦（空壳大技能 + 子技能）
        // ====================================================
        //  锁定技（②“有人用集巧生烟你摸牌”已按需求删除）：
        //   ① 游戏开始时，牌堆中添加 8 张「集巧生烟」
        //   ② 你的回合开始时，若你手牌中没有锦囊牌，你获得一张「集巧生烟」
        //   ③ 当你受到伤害后，若你有牌，你须将一张牌当做「集巧生烟」使用
        sgz_qimeng: {
            audio: "ext:大梦千秋/audio/sgz_huangyueying:6",
            forced: true,
            persevereSkill: true,
            ai: AI.sgz_qimeng,
            // ⚠ 空壳：父技能不写 trigger / content，三条效果都在子技能里
            group: ["sgz_qimeng_addpile", "sgz_qimeng_seek", "sgz_qimeng_force"],
            subSkill: {
                // ① 游戏开始时：牌堆中添加 8 张「集巧生烟」
                addpile: {
                    persevereSkill: true,
                    sub: true,
                    trigger: { global: "gameStart" },
                    forced: true,
                    silent: true,
                    async content(event, trigger, player) {
                        // 牌名登记进 lib.inpile（AI / 牌名查询用；牌堆本身由下面 8 张实体牌提供）
                        if (lib.inpile && !lib.inpile.includes(JQSY)) lib.inpile.push(JQSY);
                        // 卡面锁定为原皮图（卡牌包是动态 import 的，这里再确认一次最稳）
                        sgzHyLockJqsyImage();

                        // 固定 8 组「花色+点数」（见文件顶部 JQSY_LIST）：
                        //   ♦️J ♦️Q ♦️K ♠️A ♠️K ♥️A ♥️J ♥️Q
                        // 直接把这 8 组广播给各端造牌塞进牌堆（不广播 Card 对象，避免引用跨端）
                        const list = JQSY_LIST.map(([suit, number]) => [suit, number]);
                        game.broadcastAll(function (data) {
                            for (let i = 0; i < data.length; i++) {
                                ui.cardPile.appendChild(game.createCard("sgz_jqsy", data[i][0], data[i][1]));
                            }
                        }, list);
                        game.log("牌堆中加入了", "#g8 张【集巧生烟】");
                    },
                },
                // ② 你的回合开始时，若你手牌中没有锦囊牌，你获得一张「集巧生烟」
                seek: {
                    persevereSkill: true,
                    sub: true,
                    trigger: { player: "phaseBegin" },
                    forced: true,
                    filter: function (event, player) {
                        return !player.countCards("h", { type: "trick" });
                    },
                    async content(event, trigger, player) {
                        game.playAudio(`../extension/大梦千秋/audio/sgz_huangyueying/sgz_qimeng${[1,2].randomGet()}.mp3`);
                        await player.gain([sgzHyJqsy()], "gain2");
                    },
                },
                // ③ 当你受到伤害后，若你有牌，你须将一张牌当做「集巧生烟」使用
                force: {
                    persevereSkill: true,
                    sub: true,
                    trigger: { player: "damageEnd" },
                    forced: true,
                    popup: false,
                    filter: function (event, player) {
                        return player.countCards("hes") > 0;
                    },
                    async content(event, trigger, player) {
                        game.playAudio(`../extension/大梦千秋/audio/sgz_huangyueying/sgz_qimeng${[3,4,5,6].randomGet()}.mp3`);
                        // ⚠ 官方 canonical 写法（见 character/clan/skill.js:1104-1118 的「佯疾」）：
                        //   先 `chooseToUse()`（**不带参数**），再用 `.set()` 逐项设置，
                        //   最后 `.backup(技能id)`。之前的写法把配置塞进 chooseToUse(对象) 里，
                        //   在这套引擎上不会生效（选择框根本不弹），所以③看起来「没反应」。
                        await player
                            .chooseToUse()
                            .set("openskilldialog", "绮梦：将一张牌当做【" + get.translation(JQSY) + "】使用")
                            .set("norestore", true)
                            .set("_backupevent", "sgz_qimeng_backup")
                            .set("custom", { add: {}, replace: { window() {} } })
                            .backup("sgz_qimeng_backup")
                            .set("addCount", false);
                    },
                },
                // ③ 的转换载体：任意一张牌 → 集巧生烟
                backup: {
                    persevereSkill: true,
                    sub: true,
                    log: false,
                    // 官方 backup 的 viewAs 用**静态对象**（对照 clan/skill.js:1136 的 `viewAs: {name:"lebu"}`）
                    viewAs: { name: JQSY },
                    filterCard: function (card) {
                        return get.itemtype(card) == "card";
                    },
                    selectCard: 1,
                    position: "hes",
                },
            },
        },
        // === 梦黄月英： UI ===
        sgz_huangyueying_ui: huangyueyingUI,
    },
    skillTranslate: {
        sgz_qimeng: "绮梦",
        sgz_qimeng_info:
            "锁定技，①游戏开始时，牌堆中添加8张【集巧生烟】；" +
            "②你的回合开始时，若你手牌中没有锦囊牌，你获得一张【集巧生烟】；" +
            "③当你受到伤害后，若你有牌，你须将一张牌当做【集巧生烟】使用。" +
            "<br><i>·【集巧生烟】：出牌阶段，你可以使用此牌：令随机一个数量为1的装备栏获得一个额外的装备栏，然后随机装备一张神武（空装备栏优先）。</i>",
        sgz_xuanhe: "璇和",
        sgz_xuanhe_info:
            "锁定技，当你使用锦囊牌时摸一张牌，此牌不计入手牌上限。然后在锦囊牌生效前，你按照所使用的锦囊牌花色执行对应效果：" +
            "<br>♦️：视为使用一张无次数限制的火【杀】；" +
            "<br>♥️：若你已/未受伤，回复一点体力/增加一点体力上限；" +
            "<br>♠️：获得一名其他角色的一张牌；" +
            "<br>♣️：本回合出【杀】次数+1，并获得一张【集巧生烟】。",
        sgz_changming: "长明",
        sgz_changming_info: "锁定技，准备阶段和结束阶段，你卜算X（X为装备栏数且至多为7）。",
        sgz_xuanhe_tag: "不计上限",
    },
    // 台词文本：千幻按 "/" 拆行显示，行数应与技能上的 audio 数字一致
    // ⚠ 顺序来自 HY_SKILLS（见文件顶部），这里**不要写 order**
    characterTaici: hyBuildCharacterTaici(),};
