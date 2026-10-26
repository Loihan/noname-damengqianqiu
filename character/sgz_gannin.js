// ============================================================
//  梦甘宁（吴）· 三国志
//    · 劫营 (sgz_jieying)：每轮开始选一名**其他**角色挂「劫营」标记：
//        ①其跳过弃牌阶段 ②你获得其弃置的牌 ③其/你每使用一张牌时你获得其一张牌
//          （其没有牌则改为你对其造成1点伤害）
//    · 夜魇 (sgz_yeyan)：每轮开始（若没有）获得「夜魇」标记，造成伤害后移除；
//        有标记时：不能被其他角色指定为牌的**唯一目标**、**你的牌**造成的伤害+1、
//        使用牌无距离限制且不能被响应
//
//  ⚠ 需求确认过的约定（**别自己改**）：
//    · 劫营是**锁定技**：每轮开始自动选人挂标，②③全部自动（不询问）
//    · 只能选**其他**角色；「其获得/弃置的牌」都按 `"he"`（手牌+装备）算
//    · 每轮重新选人时**旧标记移除**（场上同时只会有一个「劫营」标记）
//    · ③「其没有牌 → 造成1点伤害」是**每次触发各算一次**（字面）
//    · 夜魇的"不能被指定为唯一目标"：只挡**其他角色**的牌（你自己的牌不受限），
//      且只在你**是唯一目标**时生效 —— 单体牌（上限1：杀/顺/过河/决斗/火攻/乐/兵粮…）
//      你必然唯一 ⇒ 直接禁选；全体牌（南蛮/万箭/桃园/五谷…）只要场上还有别人可以被指定就放行；
//      多目标牌（铁索连环 [1,2]）要**先选了别人**才能再选你（见 `block` 子技能）
//    · 夜魇的"不能被响应"是**两层**：①你用的牌，目标不能打出牌来响应它
//      （杀→不可闪、南蛮/决斗→不可打出杀、万箭→不可打出闪……引擎判据是 useCard 的
//      `directHit` 数组，见 `directhit` 子技能）；②你用的锦囊也不能被无懈可击
//      （`nowuxie`，见 `nowuxie` 子技能）
//    · 夜魇②-2 是「**你的牌**造成的伤害+1」：伤害的来源必须是牌
//      （判据 `event.card`，见下面 `damage` 子技能的注释）——技能直接造成的伤害
//      （例如劫营③那 1 点）**不吃**这个 +1
//
//  ⚠ 标记的做法：给目标**挂一个隐藏技能**当标记载体（梦钟会/梦孙寒华同款思路）——
//    `target.addSkill("sgz_jieying_skip")` + `addMark` 让引擎在目标武将牌上画出「劫营」徽标，
//    同时那个技能自己带「跳过弃牌阶段」的触发；换目标时 `removeSkill` 会顺手 unmark（player.js:10508）。
// ============================================================

// ---- 表现层 + 共享常量（劫营翡翠标记 / 夜魇隐匿埋伏暗幕，实现见 effect/sgz_gannin.js）----
//  ⚠ 标记名、UI 技能名都定义在 effect/sgz_gannin.js 里（唯一来源）。
//    （方向是 character → effect，不成环；与本包梦杜预 / 梦文鸯同一套写法。）
import {
    SGZ_GN_JIEYING_MARK,
    SGZ_GN_YEYAN,
    SGZ_GN_JIEYING_UI_SKILL,
    SGZ_GN_YEYAN_UI_SKILL,
    jieyingUI,
    yeyanUI,
} from "../effect/sgz_gannin.js";

/// 「劫营」标记载体技能名（挂到**被选中的角色**身上）
const JIEYING_MARK = SGZ_GN_JIEYING_MARK;
/// 「夜魇」标记名（= 技能名，storage 键就是它）
const YEYAN = SGZ_GN_YEYAN;
/// 劫营③「其没有牌 → 你对其造成1点伤害」那种伤害的标记。
/// ⚠ 夜魇①「当你造成伤害后移除标记」要对它**例外**（需求）：这次伤害不移除夜魇标记。
///   做法：造伤害事件时就地打个标记（梦钟会 `player.damage(...).sgz_quanhuan_huan = true` 同款），
///   夜魇那边在 `damageEnd` 的 filter 里检查这个标记。
const JIEYING_DAMAGE_FLAG = "_sgz_jieying_damage";

/// 皮肤「战破无间」的攻击出框触发技能名（纯表现，charlotte 隐藏）。
///  ⚠ 这个**不是**「标记 / UI 元素」类技能，所以没放进 effect/sgz_gannin.js 的常量表
///    （那边是标记名与 UI 技能名的唯一来源）；这条只是本文件自用的触发器。
const SGZ_GN_CHUKUANG_SKILL = "sgz_gannin_chukuang";

/// 取当前带「劫营」标记的角色（正常只会有一个）
function sgzJieyingTarget(player) {
    return game.filterPlayer(current => current.hasSkill(JIEYING_MARK))[0] || null;
}

// ---- 夜魇②-1「不能被指定为唯一目标」用的小工具 ----
/// ⚠ 递归保护：探测「除你之外还有没有别的合法目标」时要调 `lib.filter.targetEnabledx`，
///   而它回头就会调用各家的 `targetEnabled` mod（包括我们自己）⇒ 不加锁会无限递归。
///   探测中一律当作「有别的目标」（= 放行）：宁可少禁一次，也不能把引擎递归到栈溢出。
let SGZ_YEYAN_PROBING = false;

/// 这张牌**目标数的上限**，口径与引擎一致
/// （`lib.filter.filterCard` library/index.js:11506-11519、`content.js:2591-2596`）：
///   · `1`  = 单体牌（杀 / 顺手 / 过河 / 决斗 / 火攻 / 乐 / 兵粮 / 借刀…）⇒ 你必然是唯一目标
///   · `-1` = 全体牌（南蛮 / 万箭 / 桃园 / 五谷 / 无中…）
///   · `>1` = 有上限的多目标牌（铁索连环 `[1,2]`）
function sgzYeyanMaxTargets(card, player) {
    const info = get.info(card);
    if (!info || info.notarget) return 0;
    const select = get.copy(info.selectTarget);
    const range = select == undefined ? [1, 1] : get.select(select) || [1, 1];
    // 别的技能可能改 selectTarget（引擎也是这么算的：library/index.js:11519）
    game.checkMod(card, player, range, "selectTarget", player);
    return range[1];
}

/// 除 `player`（出牌人）和 `target`（你）之外，这张牌还有没有**别的合法目标**？
/// 只用于全体牌：场上只剩你一个人能被指定时，你才会成为「唯一目标」。
function sgzYeyanHasOtherTarget(card, player, target) {
    if (SGZ_YEYAN_PROBING) return true;
    SGZ_YEYAN_PROBING = true;
    try {
        return game.hasPlayer2(current => {
            if (current == player || current == target) return false;
            return lib.filter.targetEnabledx(card, player, current);
        }, true);
    } finally {
        SGZ_YEYAN_PROBING = false;
    }
}

import AI, { helpers } from "../ai/sgz_gannin.js";

export default {
    character: {
        sgz_gannin: {
            sex: "male",
            group: "qun",
            hp: 3,
            maxHp: 6,
            skills: [
                "sgz_jieying",
                "sgz_yeyan",
                // 劫营 · 翡翠劫掠标记（charlotte 隐藏，见 effect/sgz_gannin.js）
                SGZ_GN_JIEYING_UI_SKILL,
                // 夜魇 · 隐匿埋伏暗幕（charlotte 隐藏，见 effect/sgz_gannin.js）
                SGZ_GN_YEYAN_UI_SKILL,
                // 皮肤「战破无间」的攻击出框（charlotte 隐藏，**即将造成伤害时**触发）
                SGZ_GN_CHUKUANG_SKILL,
            ],
            img: "extension/大梦千秋/image/sgz_gannin.jpg",
            names: "甘|宁",
            dieAudios: ["ext:大梦千秋/audio/sgz_gannin/die.mp3"],
        },
    },
    characterName: "sgz_gannin",
    characterTranslate: { sgz_gannin: "梦甘宁" },
    skills: {
        // ====================================================
        //  1. 劫营
        // ====================================================
        sgz_jieying: {
            ai: AI.sgz_jieying,
            mod: {
                // 装备政策：低价值先上、重要装备后上；诸葛连弩永不顶、古锭刀次之
                aiOrder: function (card, player, num) {
                    return helpers.sgz_gannin_equipOrder(card, player, num);
                },
                // 使用价值：同栏已有装备时也照样顶（连弩/古锭刀除外）——用出去才有收益
                aiUseful: function (card, player, num) {
                    return helpers.sgz_equip_useful(card, player, num);
                },
            },
            persevereSkill: true,
            audio: "ext:大梦千秋/audio/sgz_gannin:5",
            locked: true,
            // ⚠ 优先级：劫营和夜魇都在 `roundStart` 触发，需求要求**劫营先**触发
            //   （先挂/换标，再决定夜魇要不要重新获得标记）。
            //   引擎的触发技排序用 `get.priority(skill)` = `info.priority * 100`（silent 再 +1），
            //   **数值大的先触发**（引擎自己的技能有用 -100 表示"最后"的）。
            //   ⇒ 这里给 1，夜魇留 0。
            priority: 1,
            // 每轮开始时（`roundStart` 是引擎自动时机，抢在所有人行动前）
            trigger: { global: "roundStart" },
            forced: true,
            filter(event, player) {
                return game.hasPlayer(current => current != player && current.isAlive());
            },
            async content(event, trigger, player) {
                // 1) 先把上一轮的「劫营」摘掉（需求：只保留最新选的那个）
                for (const old of game.filterPlayer(current => current.hasSkill(JIEYING_MARK))) {
                    old.removeSkill(JIEYING_MARK);
                    const num = old.countMark(JIEYING_MARK);
                    if (num > 0) old.removeMark(JIEYING_MARK, num, false);
                }
                // 2) 选一名其他角色挂标
                const result = await player
                    .chooseTarget("劫营：选择一名其他角色获得「劫营」标记", true, (card, player, target) => target != player)
                    // AI：只看"身份 + 威胁"（反贼给主公、忠臣给最强敌人；不避开空手的人）
                    .set("ai", target => helpers.sgz_jieying_target(player, target))
                    .forResult();
                if (!result.bool || !result.targets || !result.targets.length) return;
                const target = result.targets[0];
                player.line(target, "green");
                target.addSkill(JIEYING_MARK);
                target.addMark(JIEYING_MARK, 1, false);
                game.log(player, "令", target, "获得了", "#g【劫营】", "标记");
            },
            // ②（抢弃牌）与 ③（用牌就抢）都是自动的，挂在 group 里常驻
            group: ["sgz_jieying_steal", "sgz_jieying_use"],
            subSkill: {
                // ---- ① 其跳过弃牌阶段（挂到目标身上的那个技能）----
                //  ⚠ 它同时是**标记载体**：`intro` 让 `addMark` 建徽标、`intro.nocount` 关掉数字，
                //    而 `mark: true` 是**故意不写**的（写了计数归零后徽标会一直挂着）。
                //  ⚠ 「跳过阶段」的正规写法 = 在该阶段的 `Before` 时机 `trigger.cancel()`
                //    （引擎里到处这么写，例如 character/jsrg/skill.js:12858 的 phaseDiscardBefore）。
                skip: {
                    persevereSkill: true,
                    sub: true,
                    charlotte: true,
                    silent: true,
                    // ⚠ 徽标：**不写 `mark: true`**（写了计数归零后徽标会一直挂着），
                    //   靠 `intro` 在 `addMark` 时建徽标 + `intro.nocount` 关掉数字
                    //   ⇒ 没标记时什么都没有、有标记时只有一个「劫营」徽标。
                    marktext: "劫营",
                    intro: {
                        name: "劫营",
                        content: "①你跳过弃牌阶段；②你弃置的牌由梦甘宁获得；③你/梦甘宁每使用一张牌，梦甘宁获得你一张牌（你没有牌则改为你受到1点伤害）",
                        nocount: true,
                    },
                    trigger: { player: "phaseDiscardBefore" },
                    forced: true,
                    filter(event, player) {
                        // ⚠ 标注者（梦甘宁）必须还在场：他阵亡/失去【劫营】后标记就失效了，
                        //   否则被标记的角色会**永远**跳过弃牌阶段（他死了就没人来换目标了）。
                        return game.hasPlayer(current => current != player && current.hasSkill("sgz_jieying"));
                    },
                    async content(event, trigger, player) {
                        game.log(player, "因【劫营】跳过了弃牌阶段");
                        trigger.cancel();
                    },
                },
                // ---- ② 你获得其弃置的牌 ----
                //  ⚠ 用 `loseAfter` + `event.type == "discard"`：
                //    `discard` 结算里 `event.done.type = "discard"`（content.js:10371），
                //    所以不论是谁让他弃的牌（弃牌阶段/技能/过河拆桥）都能抓到。
                steal: {
                    persevereSkill: true,
                    sub: true,
                    charlotte: true,
                    silent: true,
                    trigger: { global: "loseAfter" },
                    forced: true,
                    filter(event, player) {
                        const target = sgzJieyingTarget(player);
                        if (!target || event.player != target) return false;
                        if (!event.cards || !event.cards.length) return false;
                        return event.type == "discard" || (event.getParent() && event.getParent().name == "discard");
                    },
                    async content(event, trigger, player) {
                        const target = sgzJieyingTarget(player);
                        if (!target) return;
                        const cards = (trigger.cards || []).slice();
                        if (!cards.length) return;
                        game.log(player, "获得了", target, "弃置的牌");
                        await player.gain(cards, target, "gain2");
                    },
                },
                // ---- ③ 其每使用一张牌 / 你每使用一张牌 → 你获得其一张牌；其没有牌则改为造成1点伤害 ----
                //  ⚠ 两种情形结果一样（都是"从被标记的角色那里拿一张"），所以合成一个 useCard 触发：
                //    `event.player` 不是被标记的角色、也不是自己 → 不触发。
                use: {
                    persevereSkill: true,
                    sub: true,
                    charlotte: true,
                    silent: true,
                    trigger: { global: "useCard" },
                    forced: true,
                    filter(event, player) {
                        const target = sgzJieyingTarget(player);
                        if (!target) return false;
                        return event.player == target || event.player == player;
                    },
                    async content(event, trigger, player) {
                        const target = sgzJieyingTarget(player);
                        if (!target || !target.isAlive()) return;
                        game.playAudio(`../extension/大梦千秋/audio/sgz_gannin/sgz_jieying${[1,2,3,4,5].randomGet()}.mp3`);
                        if (target.countCards("he") == 0) {
                            // 需求：每次触发各算一次（其没有牌 → 每次都吃1点伤害）
                            game.log(player, "对没有牌的", target, "发动【劫营】");
                            // ⚠ 这次伤害要打上标记：夜魇①「造成伤害后移除标记」对它例外（需求）
                            const next = target.damage(1, player);
                            next[JIEYING_DAMAGE_FLAG] = true;
                            await next;
                            return;
                        }
                        player.line(target, "green");
                        await player.gainPlayerCard(target, "he", true);
                    },
                },
            },
        },

        // ====================================================
        //  2. 夜魇
        // ====================================================
        //  ①每轮开始（若没有）获得「夜魇」标记；造成伤害后移除
        //  ②有标记时：不能被其他角色指定为牌的**唯一目标** / 你的牌造成的伤害+1 / 使用牌无距离限制且不能被响应
        sgz_yeyan: {
            ai: AI.sgz_yeyan,
            mod: {
                // 隐匿（夜魇生效中）：伤害牌要不要打 —— 收益>风险才摘，否则先压着
                aiOrder: function (card, player, num) {
                    let dmg = 0;
                    try { dmg = get.tag(card, "damage") || 0; } catch (e) {}
                    if (!dmg) return num;
                    return helpers.sgz_shouldBreakHidden(player) ? num + 2 : 0;
                },
            },
            persevereSkill: true,
            audio: "ext:大梦千秋/audio/sgz_gannin:3",
            locked: true,
            // ⚠ 优先级 0（默认值，写出来是为了和劫营的 1 对照）：劫营必须先于夜魇结算。
            priority: 0,
            // ⚠ 徽标：**不写 `mark: true`**（写了的话——「当你造成伤害后移除之」把标记清到 0 时
            //   徽标会**一直挂着、只是没有数字**，正是用户报的那个现象）；靠 `intro` 让 `addMark`
            //   时建徽标 + `intro.nocount` 关掉数字 ⇒ 没标记时什么都没有、有标记时只有一个「夜魇」徽标。
            marktext: "夜魇",
            intro: {
                name: "夜魇",
                content: "①你不能被其他角色指定为牌的唯一目标；②你的牌造成的伤害+1；③你使用牌无距离限制且不能被响应",
                nocount: true,
            },
            trigger: { global: "roundStart" },
            forced: true,
            filter(event, player) {
                return player.countMark(YEYAN) <= 0;
            },
            async content(event, trigger, player) {
                player.addMark(YEYAN, 1);
            },
            group: ["sgz_yeyan_damage", "sgz_yeyan_remove", "sgz_yeyan_block", "sgz_yeyan_uniquetarget", "sgz_yeyan_distance", "sgz_yeyan_nowuxie", "sgz_yeyan_directhit"],
            subSkill: {
                // ---- ②-2 **你的牌**造成的伤害+1；①造成伤害后移除标记 ----
                //  ⚠ 两个时机分开写（别合成一个：`trigger.name` 在 source 侧不好判断时机名）。
                //    · `damageBegin1` = 造成伤害时 → 伤害+1
                //    · `damageEnd`   = 造成伤害后 → 移除标记（所以这一次的+1是吃得到的）
                //  ⚠ 需求改动：只有**来源是牌**的伤害才 +1（技能直接造成的伤害不算，例如【劫营】③那 1 点）。
                //    判据用 `event.card`：`player.damage()` 没显式传牌时会**继承调用者事件的 card**
                //    （player.js:7851 `if (!next.card && !noCard) next.card = event.card;`）——
                //    牌的结算里调用者是卡牌事件（有 card ✓）；技能 content 里直接 `target.damage(...)`
                //    的调用者是技能事件（没有 card ✗）⇒ 天然区分开。
                damage: {
                    persevereSkill: true,
                    sub: true,
                    charlotte: true,
                    silent: true,
                    trigger: { source: "damageBegin1" },
                    forced: true,
                    filter(event, player) {
                        if (player.countMark(YEYAN) <= 0) return false;
                        return !!event.card;
                    },
                    async content(event, trigger, player) {
                        player.recover(1);
                        player.changeHujia(1);
                        trigger.num += 1;
                    },
                },
                remove: {
                    persevereSkill: true,
                    sub: true,
                    charlotte: true,
                    silent: true,
                    trigger: { source: "damageEnd" },
                    forced: true,
                    filter(event, player) {
                        if (player.countMark(YEYAN) <= 0) return false;
                        // ⚠ 例外（需求）：劫营③「其没有牌 → 你对其造成1点伤害」那次伤害不移除夜魇标记
                        if (event[JIEYING_DAMAGE_FLAG]) return false;
                        return true;
                    },
                    async content(event, trigger, player) {
                        const num = player.countMark(YEYAN);
                        player.removeMark(YEYAN, num, false);
                        game.log(player, "移除了所有", "#g【夜魇】", "标记");
                    },
                },
                // ---- ②-1 不能被**其他角色**指定为牌的**唯一目标**（自己的牌不受限）----
                //  ⚠ `mod.targetEnabled` 的 mod 持有者是**目标**（引擎用 `checkMod(..., target)` 取 mod），
                //    所以 `target` = 自己、`player` = 出牌的人（library/index.js:11557 那一支）。
                //  「唯一目标」= 引擎口径的「这张牌的全部目标只有你一个」
                //  （参考写法：`event.targets && event.targets.length === 1`）。
                //  按这张牌的目标数上限分三类：
                //    · 上限 1（单体牌）      → 你必然是唯一目标 ⇒ 直接禁选（牌点不到你身上）
                //    · 上限 -1（全体牌）     → 场上还有别的合法目标就放行，只剩你一个时才禁
                //    · 上限 ≥2（多目标牌）   → 必须**已经**选了别人，才允许再把你选上
                //  ⚠ 这里只管「选目标」这一步；绕过选目标的用牌（技能强制用牌、
                //    多目标牌最后只选了你一个）由下面的 `uniquetarget` 在结算前兜底取消。
                block: {
                    persevereSkill: true,
                    sub: true,
                    charlotte: true,
                    silent: true,
                    mod: {
                        targetEnabled(card, player, target) {
                            if (!card || !target) return;
                            if (player == target) return; // 自己用自己的牌不受限
                            if (target.countMark(YEYAN) <= 0) return;
                            const max = sgzYeyanMaxTargets(card, player);
                            if (max === 1) return false;
                            if (max < 0) {
                                if (sgzYeyanHasOtherTarget(card, player, target)) return;
                                return false;
                            }
                            if (max >= 2) {
                                // `ui.selected.targets` = 这次选目标里**已经选好**的人
                                if (ui.selected && ui.selected.targets && ui.selected.targets.length > 0) return;
                                return false;
                            }
                        },
                    },
                },
                // ---- ②-1 兜底：结算前若你仍是此牌的**唯一目标** → 取消此牌对你的指定 ----
                //  选目标那一步已经挡过一遍（上面的 `block`）；这里挡的是**绕过选目标**的情况：
                //    · 技能强制用牌（例如【借刀杀人】逼别人对你出【杀】）
                //    · 多目标牌最后只指定了你一个（例如【铁索连环】只连你）
                //  ⚠ `event.targets` 与父事件 `useCard.targets` 是**同一个数组**（content.js:9669
                //    `next.targets = targets`），所以它的长度就是「这张牌的全部目标数」——
                //    正是上面说的引擎口径的「唯一目标」。
                //  ⚠ 取消写法照抄官方【帷幕】（character/sb/skill.js:1466-1469）：
                //    `targets.remove` + 清 `triggeredTargets2` + `untrigger`；
                //    目标被清空后 `useCard` 会跳过结算（content.js:9850）。
                uniquetarget: {
                    persevereSkill: true,
                    sub: true,
                    charlotte: true,
                    silent: true,
                    trigger: { target: "useCardToTarget" },
                    forced: true,
                    filter(event, player) {
                        if (player.countMark(YEYAN) <= 0) return false;
                        if (!event.player || event.player == player) return false; // 自己的牌不受限
                        if (!event.targets || event.targets.length !== 1) return false; // 不是唯一目标
                        return event.targets[0] === player;
                    },
                    async content(event, trigger, player) {
                        game.log(player, "的", "#g【夜魇】", "取消了", trigger.card, "对自己的指定");
                        trigger.targets.remove(player);
                        trigger.getParent().triggeredTargets2.remove(player);
                        trigger.untrigger();
                    },
                },
                // ---- ②-3a 使用牌无距离限制 ----
                distance: {
                    persevereSkill: true,
                    sub: true,
                    charlotte: true,
                    silent: true,
                    mod: {
                        targetInRange(card, player, target) {
                            if (player.countMark(YEYAN) > 0) return true;
                        },
                    },
                },
                // ---- ②-3b 不能被响应（二）：锦囊不可被无懈可击（`nowuxie` 是引擎认的标志：
                //      card/standard.js:4323 `if (event.getParent().nowuxie) return false;`）----
                nowuxie: {
                    persevereSkill: true,
                    sub: true,
                    charlotte: true,
                    silent: true,
                    trigger: { player: "useCard1" },
                    forced: true,
                    filter(event, player) {
                        return player.countMark(YEYAN) > 0;
                    },
                    async content(event, trigger, player) {
                        trigger.nowuxie = true;
                    },
                },
                // ---- ②-3b 不能被响应（一）：**所有目标**都进 useCard 的 `directHit` ----
                //  ⚠ 需求修正过：原来只做了「【杀】不可被闪避」（在 `useCardToTargeted` 里
                //    `getParent().directHit.add(trigger.target)`），漏了**牌自己的响应** ——
                //    【南蛮入侵】要打出【杀】、【万箭齐发】要打出【闪】、【决斗】要打出【杀】，
                //    这些都不是「闪避」，靠 directHit 才能一起挡掉（用户实测南蛮仍能被打出杀）。
                //  引擎判据 = useCard 事件上的 `directHit` 数组：
                //    `content.js:9898` 按它给每个目标打 `event.directHit = true`，
                //    然后**牌的 content 自己**跳过响应：
                //      【杀】standard.js:141 / 【南蛮入侵】:1320 / 【万箭齐发】:1711 / 【决斗】:2174
                //  ⚠ 时机用 `useCard0`：`directHit` 数组在 useCard 的 step 0 里建好
                //    （content.js:9449-9451），`useCard0` 正好在它之后、且比 `useCard` 更早；
                //    官方【破竹之势】的「不可响应」就是 `useCard0` + `firstDo`（mobile/skill.js:1961）。
                directhit: {
                    persevereSkill: true,
                    sub: true,
                    charlotte: true,
                    silent: true,
                    trigger: { player: "useCard0" },
                    forced: true,
                    firstDo: true,
                    filter(event, player) {
                        return player.countMark(YEYAN) > 0;
                    },
                    async content(event, trigger, player) {
                        trigger.directHit.addArray(trigger.targets || []);
                    },
                },
            },
        },

        // ====================================================
        //  3. 纯表现层（实现见 effect/sgz_gannin.js）
        // ====================================================
        //  ⚠ 两个都是 charlotte 隐藏技能，必须注册进上面的 skills 数组才会 init。
        //    · 劫营特效：给带「劫营」标记的角色套上翡翠劫掠光效
        //    · 夜魇特效：甘宁主视角拥有「夜魇」时，屏幕边缘做一圈隐匿埋伏暗幕
        [SGZ_GN_JIEYING_UI_SKILL]: jieyingUI,
        [SGZ_GN_YEYAN_UI_SKILL]: yeyanUI,

        // ---- 皮肤「战破无间」的攻击出框：**即将造成伤害时**触发 ----
        //  需求：这个出框原来是跟着「使用伤害牌」走的（皮肤切换的全局技能 `lib.skill._gj`），
        //        现在改成「**你即将造成伤害时**」⇒ 用 `damageBegin1` 的 source 侧
        //        （和夜魇②-2「你的牌造成的伤害+1」、惊跃②「伤害+1」是同一个伤害时机）。
        //        `_gj` 那边已经在 skin.js 第 3b 节按皮肤短路掉了（`dmqcIsZhanPoWujian`），
        //        所以「使用伤害牌」不会再出框，不会双重播放。
        //  ⚠ 实际播放由 skin.js 第 10 节的 `window.dmqcPlayGanningEffect` 负责：
        //    它会比对当前骨骼是不是「神甘宁/战破无间/XingXiang」——
        //    没开皮肤切换/十周年UI、或玩家用的是别的皮时，静默跳过，**绝不影响技能结算**。
        //  ⚠ 同一张牌打多个目标会连开多次 damage 事件 ⇒ 会连着触发几次；
        //    如果觉得太密，可以改成"同一张牌只播一次"（按 `event.card`/`event.parent.id` 去重）。
        //  ⚠ `event.num > 0`：被减到 0 / 被防止的伤害不播（"即将造成伤害"才播）。
        [SGZ_GN_CHUKUANG_SKILL]: {
            persevereSkill: true,
            charlotte: true,
            silent: true,
            forced: true,
            popup: false,
            trigger: { source: "damageBegin1" },
            filter(event, player) {
                return typeof event.num === "number" && event.num > 0;
            },
            async content(event, trigger, player) {
                try {
                    if (typeof window !== "undefined" && typeof window.dmqcPlayGanningEffect === "function") window.dmqcPlayGanningEffect(player);
                } catch (e) {
                    /* 出框只是演出，失败就算了 */
                }
            },
        },
    },
    skillTranslate: {
        sgz_jieying: "劫营",
        sgz_jieying_info:
            "锁定技，每轮开始时，你选择一名其他角色获得“劫营”标记：" +
            "①其跳过弃牌阶段；②你获得其弃置的牌；" +
            "③其每使用一张牌时/你每使用一张牌时，你获得其一张牌。若其没有牌则改为你对其造成一点伤害。",
        sgz_yeyan: "夜魇",
        sgz_yeyan_info:
            "锁定技，①你不能被其他角色指定为牌的唯一目标；当你成为其他角色使用牌的唯一目标时取消之。②你的牌造成的伤害+1、回复1点体力并获得1点护甲。③你使用牌无距离限制且不能被响应。④当你用牌造成的伤害结算后，此技能本轮失效。",
    },
    characterTaici: {
        "sgz_jieying":{order: 1 ,content:"斩仙！/破！/碍事！/记住黑暗的模样！/别心存侥幸！"},
        "sgz_yeyan":{order: 2 ,content:"残息指引，寻踪觅迹。/万年仇恨，无以消。/未经生死，何谈安乐。"},
        "die": { content: "恩怨...尚未了结..." },
    },
};