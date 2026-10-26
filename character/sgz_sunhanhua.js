// ============================================================
//  梦孙寒华 —— 妙剑 / 莲华 / 踏寂
// ============================================================
//  表现层（卡牌特效 + 武将牌右侧充能条 + 标记名/上限常量）都在 effect/sgz_sunhanhua.js，
//  本文件从那里 import —— **方向是 character → effect，不成环**；反过来 import 会在
//  循环依赖里读到未初始化的 const。（这也是本包梦杜预的既有写法。）
//
//  按需求把两个大技能写成「大空壳 + 多个实际起作用的小技能」：
//
//  · 妙剑 (sgz_miaojian) = 空壳，挂 4 个子技能：
//      sgz_miaojian_gain    ①每名角色回合开始时（=准备阶段，同梦赵云【劫烬】），+1 妙剑标记（上限 SGZ_MJ_MAX）
//      sgz_miaojian_sync    ②维持不变量：手牌中「妙剑」标记的牌数 == 妙剑标记数
//      sgz_miaojian_limit   ③「妙剑」标记的牌使用无次数、无距离限制
//      sgz_miaojian_use     ④移去 1 个标记 + 弃 1 张「妙剑」牌 → 视为使用/打出任意一张牌
//      （⑤"你的普通杀视为刺杀"已按需求删除，作为强度限制的补偿 —— 详见 subSkill 末尾的注释）
//
//  · 莲华 (sgz_lianhua) = 空壳，挂 3 个子技能：
//      sgz_lianhua_hujia   ①你即将受到【杀】的伤害时，弃置一张牌，获得1点护甲
//      sgz_lianhua_mark     ②你受到伤害时，获得一个妙剑标记（**每回合限一次** → `usable: 1`）
//      sgz_lianhua_discard  ③你的回合开始时和结束时，弃置所有**非**「妙剑」手牌（强度限制）
//
//  · 踏寂 (sgz_taqi)：失去牌后按**失去的原因**分别结算
//      useCard → 场上**有手牌且手牌数唯一最少**的一名其他角色随机弃置一张牌（并列最少则无事发生）
//      respond → 回复 1 点体力
//      其他（除使用/打出以外的一切原因）→ 下一次造成的伤害 +1
//      （还有个子技能 sgz_taqi_damage 负责把那 +1 真正加在伤害上）
//      ⚠ 触发范围是**手牌 + 装备区**（引擎口径的"失去牌"），见下面 `sgz_taqi.filter` 的注释。
//
//  ⚠⚠ **②是全技能最关键的一环**（务必保留结论）：妙剑标记数与「手牌里的妙剑牌数」
//     必须始终相等。两边任何一边变化都要重新校准：
//       · 标记比牌多 → 摸差额张牌并把「妙剑」标记打上（这就是需求里说的「摸一张并标记」）
//       · 标记比牌少 → 把多余的牌去掉标记（正常流程几乎不会出现，兜底用）
//     校准本身会摸牌（触发 gainAfter）→ 所以用**重入锁 + 最多 5 轮收敛**，不会无限递归。
//
//  ⚠⚠ **【必须记住的坑】摸牌事件上的 gaintag 才是唯一的正确写法**（参照鹤羽星尊【启匣】）：
//       正确：`const next = player.draw(n); next.gaintag = [SGZ_MJ_TAG]; await next;`
//       错误：`const r = await player.draw(n); player.addGaintag(r.cards, SGZ_MJ_TAG);`
//     摸牌事件（draw）的 `result` 里**根本没有 `cards`**，所以第二行永远执行不到 addGaintag；
//     于是校准函数每轮都以为「牌不够」→ 连摸 5 轮 → **开局手里凭空多出 5 张牌**（这就是
//     「开局就摸出来 9 张牌」的真正原因：4 张初始手牌 + 5 轮无效摸牌）。
//     引擎是在摸牌结算里读 `event.gaintag` 再把标记打到摸到的牌上的，
//     见 noname/library/element/content.js:10791（`event.gaintag.forEach(...)`）与
//     player.js:7039（`next.gaintag = []`）。
//
//  ⚠ **标记的增减刻意不通过 `global: ["addMark","removeMark"]` 同步**，而是在改标记的地方
//     （①、莲华②、④）显式调用 `sgzMjSync`。原因见下面 `use.precontent` 的注释：
//     ④的代价是「移去 1 个标记 + 弃置 1 张『妙剑』牌」，两步之间会短暂出现「标记 2 / 牌 3」
//     的中间态，此时若同步就会误把多出来的那张牌的标记扒掉，等牌真被弃置时又补摸一张
//     —— 一次④白白多亏一张牌。显式调用只在「牌真的离开手牌」之后校准，正好 2/2。
//
//  ⚠ 武将图片与语音按需求**先空着**：
//     `img` 指向将来要放的路径（文件还不存在时立绘为空白，不会报错）；技能一律**不写 `audio`**，
//     `dieAudios` 也给空数组，免得加载时满屏 404。
// ============================================================

// ---- 表现层 + 共享常量（卡牌特效 / 充能条 / 标记名与上限）----
//  ⚠ 标记名、牌标记名、**标记上限**都定义在 effect/sgz_sunhanhua.js 里（唯一来源）；
//    充能条的分段数直接用 SGZ_MJ_MAX，所以「上限」只需要改那一个数字。
import {
    SGZ_MJ,
    SGZ_MJ_TAG,
    SGZ_MJ_MAX,
    miaojianCardUI,
    sunhanhuaUI,
} from "../effect/sgz_sunhanhua.js";

/// 取某玩家**手牌**里带「妙剑」标记的牌。
/// （这里拿到的是实体手牌，直接用 `hasGaintag` 就行；统一走 `sgzMjHasTag` 只是省得两套判定。
///   `sgzMjHasTag` 在本文件下方定义 —— 函数声明会提升，顺序无所谓。）
function sgzMjCards(player) {
    return player.getCards("h", sgzMjHasTag);
}

/// 妙剑标记数（按上限夹取）
function sgzMjMark(player) {
    return Math.min(player.countMark(SGZ_MJ), SGZ_MJ_MAX);
}

/// 判断一张「牌」是否带「妙剑」标记。
/// ⚠⚠ **不能只写 `card.hasGaintag(TAG)`**（务必保留结论）：
///   引擎在 `lib.filter.cardUsable` / `cardUsable2` 里先做了 `card = get.autoViewAs(card)`
///   （noname/library/index.js:11364 / 11393），而 `get.autoViewAs` **一定会 new 一个 VCard**
///   （noname/get/index.js:948-953），VCard 的构造函数**只复制** suit/number/name/nature/storage/cards，
///   **不复制 gaintag** —— 于是 `VCard.hasGaintag()` 恒为 false，③的「无次数限制」会静默失效。
///   所以这里同时看两张脸：牌自己 + 它底下的实体牌（`card.cards`）。
///   （鹤羽星尊【启匣】的 `mod.cardUsable` 里写着 `card.cards.some(i => i.gaintag.contains(...))`，
///    注释叫「修复点：使用底层 gaintag.contains 判断」，就是同一个坑。）
function sgzMjHasTag(card) {
    if (!card) return false;
    if (typeof card.hasGaintag === "function" && card.hasGaintag(SGZ_MJ_TAG)) return true;
    if (Array.isArray(card.cards)) {
        return card.cards.some(c => c && typeof c.hasGaintag === "function" && c.hasGaintag(SGZ_MJ_TAG));
    }
    return false;
}

/// ④「视为使用或打出任意一张牌」的候选牌名池：**排除装备牌**（按需求）。
/// 只保留 `lib.card` 里真实存在、且 type 不是 `"equip"` 的牌名（basic / trick 都在内）。
/// ⚠ 这里用 `get.type(name) != "equip"`：`get.type` 接受牌名字符串，返回 `lib.card[name].type`。
/// ⚠ 带缓存：`hiddenCard` / `canSave` 那条链会被**高频**调用（濒死时引擎会把 lib.card 里所有
///   savable 牌名挨个拿来问一遍），每次重扫 200 个牌名没必要。用 `lib.inpile.length` 当版本号，
///   牌堆变了就重建（开销可忽略）。
let sgzMjViewAsSetCache = null;
let sgzMjViewAsSetLen = -1;
function sgzMjViewAsSet() {
    if (!sgzMjViewAsSetCache || sgzMjViewAsSetLen !== lib.inpile.length) {
        sgzMjViewAsSetCache = new Set(lib.inpile.filter(name => !!lib.card[name] && get.type(name) != "equip"));
        sgzMjViewAsSetLen = lib.inpile.length;
    }
    return sgzMjViewAsSetCache;
}

function sgzMjViewAsNames() {
    return Array.from(sgzMjViewAsSet());
}

/// 校准不变量：手牌里的「妙剑」牌数 == 妙剑标记数
/// ⚠ 重入锁：校准要摸牌 → 摸牌又会触发 gainAfter → 再调本函数，所以必须挡住。
///   用 WeakSet **按角色**记（而不是一个全局布尔量）：多个孙寒华/中途死亡都不会互相卡住。
///   WeakSet 不写存档，也不会阻止角色被回收。
const sgzMjSyncing = new WeakSet();
async function sgzMjSync(player) {
    if (!player || typeof player.isAlive !== "function" || !player.isAlive()) return;
    if (typeof player.hasSkill !== "function" || !player.hasSkill(SGZ_MJ)) return;
    if (sgzMjSyncing.has(player)) return;
    sgzMjSyncing.add(player);
    try {
        // 每轮结束条件：数量相等。摸牌本身会再改变一次数量，故循环收敛（5 轮兜底）
        for (let round = 0; round < 5; round++) {
            const want = sgzMjMark(player);
            const have = sgzMjCards(player);
            if (have.length === want) break;
            if (have.length < want) {
                // ★ 唯一正确的写法：把 gaintag 挂在**摸牌事件对象**上再 await（同【启匣】）
                //   （写成 `await player.draw(n)` 再从 result 里取 cards 是错的，见文件头注释）
                const next = player.draw(want - have.length);
                next.gaintag = [SGZ_MJ_TAG];
                await next;
            } else {
                // 多了：从后面开始去掉标记（保留先拿到的那些）
                player.removeGaintag(SGZ_MJ_TAG, have.slice(want));
            }
            if (player.isDead()) break;
        }
    } catch (e) {
        console.error("[大梦千秋] 妙剑标记校准异常（不影响结算）：", e);
    } finally {
        sgzMjSyncing.delete(player);
    }
}

import AI, { helpers } from "../ai/sgz_sunhanhua.js";

export default {
    character: {
        sgz_sunhanhua: {
            sex: "female",
            group: "wu",
            hp: 3,
            maxHp: 3,
            skills: ["sgz_miaojian", "sgz_lianhua", "sgz_taqi", "sgz_sunhanhua_ui", "sgz_miaojian_card_ui"],
            // ⚠ 武将图片先空着：图放到这个路径即可（文件不存在时立绘空白、不会报错）
            img: "extension/大梦千秋/image/sgz_sunhanhua.jpg",
            // 语音先空着
            dieAudios: ["ext:大梦千秋/audio/sgz_sunhanhua/die.mp3"],
            names: "孙|寒华",
            groupInGuozhan: "wu",
            4: ["des:孙寒华，孙权之女。少好剑术，尝于月下独舞，剑光如莲。后入山修道，得授《妙剑篇》，剑随心转，心随剑空。"]
        },
    },
    characterName: "sgz_sunhanhua",
    characterTranslate: { sgz_sunhanhua: "梦孙寒华" },
    skills: {
        // ====================================================
        //  1. 妙剑（大空壳：标记本体 + 5 个子技能）
        // ====================================================
        sgz_miaojian: {
            ai: AI.sgz_miaojian,
            persevereSkill: true,
            // 空壳本身不带任何逻辑，全部交给子技能
            //
            // ⚠⚠ 2026 改动（需求：删掉武将牌上的「妙剑」标记）——**只删显示，逻辑一字未动**：
            //   · 原本这里写着 `mark: true` + `marktext: "妙剑"` + `intro: {...}`，那三行就是
            //     **武将牌上那个标记徽标的唯一来源**，现在因为右侧已经有自绘充能条，全部删除。
            //   · 计数本体是 `player.storage["sgz_miaojian"]`（`countMark/addMark/removeMark`），
            //     与 intro / mark **完全无关**，所以标记数、上限、同步不变量、④的消耗全都不受影响。
            //   · 为什么三个都要删（只删 `mark: true` 不够，这是引擎的行为，别只删一半）：
            //       - `addSkill` 时：`info.mark` 为真 → `markSkill()` → 建徽标（player.js:10056）。
            //       - `addMark` 时：`player.js:4277` 无条件 `this.markSkill(i)`，
            //         而 `markSkill` 在没有显式 info 时会自己读 **`lib.skill[i].intro`**
            //         （player.js:9299-9304），**只要有 intro 就会把徽标建回来**
            //         —— 所以 `intro` 必须一起删，否则每加一次标记徽标就复活一次。
            //       - `removeMark` 到 0 时：`player.js:4240` 靠 `lib.skill[i].mark` 决定
            //         走 markSkill（保留 0 的徽标）还是 unmarkSkill（移除），删掉 `mark` 后
            //         归零即卸掉，不会再留一个"0"挂在武将牌上。
            //   · 日志文案不变：addMark/removeMark 打印的名字优先取 `intro.name`，
            //     没有 intro 时回落到 `lib.translate["sgz_miaojian"]`（= skillTranslate 里的
            //     "妙剑"，player.js:4267-4274）⇒ 控制台/战报仍然是「获得了 一个【妙剑】」。
            //   · 技能描述面板也不受影响：那一栏走的是 `lib.translate["sgz_miaojian_info"]`
            //     （get/index.js:3694 skillInfoTranslation 只读 `_info`，不看 intro）。
            //   · ⚠ 以后想恢复徽标：把下面这三行加回来即可（值见 git 历史/本条注释）。
            //       mark: true,
            //       marktext: "妙剑",
            //       intro: { name: "妙剑", content: "标记数 #（上限 " + SGZ_MJ_MAX + "）；手牌中「妙剑」牌数与标记数始终相等" },
            audio: "ext:大梦千秋/audio/sgz_sunhanhua:5",
            group: ["sgz_miaojian_gain", "sgz_miaojian_sync", "sgz_miaojian_limit", "sgz_miaojian_use"],
            subSkill: {
                // ---- ① 每名角色回合开始时：+1 标记（上限 7）----
                //  ⚠ 时机完全照抄梦赵云【劫烬】：`global: "phaseZhunbeiBegin"`，
                //    即**每名角色的准备阶段开始时**（= 需求里的「每名角色回合开始时」）。
                //    用 `global:` 而不是 `player:`：挂 player 只会认领自己的回合，别人回合不会补标。
                //  ⚠ **「游戏开始时」已按需求删除**。原先写的是
                //      `trigger: { global: ["gameStart", "phaseBegin"] }`，开局就补标 + 摸牌，
                //      再叠加下面那个摸牌 bug，才有「开局 9 张牌」。
                gain: {
                    sub: true,
                    charlotte: true,
                    silent: true,
                    forced: true,
                    trigger: { global: "phaseZhunbeiBegin" },
                    filter(event, player) {
                        return player.countMark(SGZ_MJ) < SGZ_MJ_MAX;
                    },
                    async content(event, trigger, player) {
                        // 默认记日志（会打印「获得了 一个【妙剑】」，标记 UI 也在这里刷新）
                        player.addMark(SGZ_MJ, 1);
                        game.playAudio(`../extension/大梦千秋/audio/sgz_sunhanhua/sgz_miaojian${[1,2].randomGet()}.mp3`);
                        // 标记 +1 → 立刻摸一张牌并把「妙剑」标记打上去（见 sgzMjSync）
                        await sgzMjSync(player);
                    },
                },
                // ---- ② 维持不变量：手牌中「妙剑」牌数 == 标记数 ----
                //  只监听「手牌进出」（摸到/失去手牌）；**标记的增减不在这里监听**，
                //  而是在改标记的地方显式调用 `sgzMjSync`（①、莲华②，④则完全不用调，见其注释）。
                //  原因见文件头注释：④的代价分两步，中途同步会误判并多亏一张牌。
                sync: {
                    sub: true,
                    charlotte: true,
                    silent: true,
                    forced: true,
                    trigger: { player: ["gainAfter", "loseAfter"] },
                    filter(event, player) {
                        return player.hasSkill(SGZ_MJ);
                    },
                    async content(event, trigger, player) {
                        await sgzMjSync(player);
                    },
                },
                // ---- ③ 「妙剑」标记的牌：无次数限制、无距离限制 ----
                //  ⚠ 判定必须用 sgzMjHasTag（要看底层实体牌），原因见该函数注释。
                limit: {
                    sub: true,
                    charlotte: true,
                    silent: true,
                    mod: {
                        cardUsable(card, player, num) {
                            if (sgzMjHasTag(card)) return Infinity;
                        },
                        targetInRange(card, player) {
                            if (sgzMjHasTag(card)) return true;
                        },
                    },
                },
                // ---- ④ 移去 1 标记 + 弃 1 张「妙剑」牌 → 视为使用/打出任意一张**非装备**牌 ----
                //  写法与梦钟会【矫诏】同构：chooseButton 的视为技，代价在 backup 里写清。
                //  ⚠ 候选池由 sgzMjViewAsNames() 给出：**排除装备牌**（按需求）。
                use: {
                    sub: true,
                    charlotte: true,
                    silent: true,
                    enable: ["chooseToUse", "chooseToRespond"],
                    filter(event, player) {
                        if (player.countMark(SGZ_MJ) <= 0) return false;
                        if (!sgzMjCards(player).length) return false;
                        // ⚠⚠ 必须防住"没有 filterCard 的事件"（梦赵云【龙霄】的 filter 里就有这个守卫）：
                        //   引擎会拿**不是 chooseToUse 的事件**来调本函数，走的正是濒死求桃那条链
                        //   （`player.canSave()` → `hasUsableCard()` → `info.filter(evt, player)`，
                        //    player.js:2607-2624；引擎自己在 library/index.js:11176 都写了
                        //    `if (event.filterCard && ...)` 的守卫）。
                        //   这里以前直接 `event.filterCard(...)` → 抛 TypeError → **濒死流程被打断，
                        //   妙剑造出来的【桃】救不了自己**（用户报的 bug）。
                        if (!event || typeof event.filterCard !== "function") return true;
                        // 只要有任意一张（非装备）牌能被这个时机使用/打出，就亮按钮
                        for (const name of sgzMjViewAsNames()) {
                            if (event.filterCard(get.autoViewAs({ name: name }, "unsure"), player, event)) return true;
                        }
                        return false;
                    },
                    // ⚠⚠⚠ **这个函数不是"隐藏手牌"，它是引擎用来问「本技能能不能凭空造出名为 name 的牌」的钩子。**
                    //   引擎里所有"要不要问这个人"的门槛都会来问它：
                    //     · `player.hasWuxie()`            → `ifo.hiddenCard(this, "wuxie")`
                    //       （player.js:12354-12380，别人用锦囊时决定要不要问你要无懈）
                    //     · `player.hasSha()/hasShan()`    → `hasUsableCard(name, type)`
                    //       （player.js:2518-2631 里 2607 那一支）
                    //     · `player.canSave()`             → 遍历 lib.card 里所有 savable 牌名调 `hasUsableCard`
                    //       （player.js:2084-2101，濒死求桃就是走这条；`content.js:32` 调它）
                    //   ⇒ **没有它，④就只在"手牌里恰好有那张真牌"时才会被问**（用户报的现象）：
                    //     别人放锦囊 → hasWuxie() 认为"他没有无懈" → 根本不询问；
                    //     要打出杀/闪、以及自己濒死求桃同理。
                    //   ⇒ 有了它，无懈 / 杀 / 闪 / 桃 的询问门槛都会认这个技能，之后 `filter` 再过一遍
                    //     真实可用性（hasUsableCard 会顺带调 `filter`；hasWuxie 不会，但引擎只在
                    //     确实需要无懈时才会走到这里）。
                    //   ⚠ 别把它和 `hiddenCard` 的字面意思混了 —— 它不会让手牌消失。
                    hiddenCard(player, name) {
                        if (!player || typeof player.hasSkill !== "function" || !player.hasSkill(SGZ_MJ)) return false;
                        if (player.countMark(SGZ_MJ) <= 0) return false;
                        if (!sgzMjCards(player).length) return false;
                        return sgzMjViewAsSet().has(name);
                    },
                    ai: {
                        expose: 1,
                        threaten: 1.2,
                        order: 4,
                        respondSha: true,
                        respondShan: true,
                        respondWuxie: true,
                        save: true,
                        // ⚠ 写了 ai.save / respondXxx 就必须配 `skillTagFilter`（引擎会点名要，
                        //   否则控制台刷"疑似忘给lib.skill.sgz_miaojian_use.ai.save加skillTagFilter了"，
                        //   而且 `save: true` 会被当成"她随时能救任何人"）。
                        //   写法照抄梦赵云【龙霄】：按 tag 说明"什么条件下才真的算能造出这张牌"。
                        skillTagFilter(player, tag) {
                            if (!player || typeof player.hasSkill !== "function" || !player.hasSkill(SGZ_MJ)) return false;
                            if (player.countMark(SGZ_MJ) <= 0 || !sgzMjCards(player).length) return false;
                            const need = { save: "tao", respondSha: "sha", respondShan: "shan", respondWuxie: "wuxie" }[tag];
                            if (!need) return false;
                            return sgzMjViewAsSet().has(need);
                        },
                        result: { player: 1 },
                    },
                    chooseButton: {
                        dialog(event, player) {
                            const list = [];
                            // 同 filter：事件可能没有 filterCard（引擎在濒死链上会这么调），防一手
                            if (event && typeof event.filterCard === "function") {
                                for (const name of sgzMjViewAsNames()) {
                                    if (event.filterCard(get.autoViewAs({ name: name }, "unsure"), player, event)) {
                                        list.push([get.translation(get.type(name)), "", name]);
                                    }
                                }
                            }
                            const dialog = ui.create.dialog("妙剑");
                            dialog.add([list, "vcard"]);
                            return dialog;
                        },
                        filter(button, player) {
                            const parent = _status.event.getParent();
                            if (!parent || typeof parent.filterCard !== "function") return true;
                            return parent.filterCard({ name: button.link[2] }, player, parent);
                        },
                        // AI：只在"妙剑牌已经用不出去"的五个场景才转化（见 ai/sgz_sunhanhua.js）
                        check(button) {
                            return helpers.sgz_miaojian_convertScore(button, _status.event.player);
                        },
                        backup(links, player) {
                            const backup = {
                                // AI：如果是「火攻打自己刷妙剑」，把目标限制成自己（否则引擎会去打敌人）
                                ...(links[0] && links[0][2] == "huogong" && helpers.sgz_miaojian_shouldSelfFire(player) ? { filterTarget: (card, p, t) => t == p } : {}),
                                // 代价：从手牌弃掉一张「妙剑」标记的牌（这里拿到的是实体手牌，用 helper 更稳）
                                filterCard(card) {
                                    return sgzMjHasTag(card);
                                },
                                position: "h",
                                selectCard: 1,
                                viewAs: { name: links[0][2] },
                                prompt: "妙剑：弃置一张「妙剑」牌，视为使用或打出「" + get.translation(links[0][2]) + "」",
                                precontent: async function () {
                                    // 代价之一：移去一个妙剑标记（另一代价＝这里选中的那张「妙剑」牌，
                                    // 它会作为视为牌被打出/使用掉，由引擎自动离开手牌）。
                                    // ⚠ 这里**故意不调用 sgzMjSync**：移去标记与牌离开手牌之间有中间态
                                    //   （标记 2 / 牌 3），此刻同步会误扒一张牌的标记。牌真正离手时
                                    //   `loseAfter` 会触发 sgz_miaojian_sync，那时正好 2/2，无需补摸。
                                    //
                                    // ⚠⚠ **必须写成 `async function`，这是踩过的坑**（务必保留结论）：
                                    //   `ContentCompiler` 的 `StepCompiler.filter()` 会认领**所有非 async /
                                    //   非 generator 的函数**（`StepCompiler.js:10-12`），然后把它
                                    //   **转成字符串 + 用隔离作用域重新 eval**（`packStep`，:81-93）——
                                    //   隔离作用域里只有 `_status / lib / game / ui / get / ai` 和
                                    //   `event / trigger / player`（`topVars`），**模块作用域整个消失**。
                                    //   所以原先的 `precontent() { player.removeMark(SGZ_MJ, 1, false); }`
                                    //   一发动就报 `ReferenceError: SGZ_MJ is not defined`。
                                    //   写成 `async` 后由 `AsyncCompiler` 接走（`AsyncCompiler.js:7`），
                                    //   只是包一层数组直接调用，**闭包保留** → 模块常量可用。
                                    //   同理：本文件其它 content 一律是 `async content(...)`；
                                    //   `filter` / `chooseButton` / `mod` 不是 content，不会被编译，随便用闭包。
                                    player.removeMark(SGZ_MJ, 1, false);
                                    game.playAudio(`../extension/大梦千秋/audio/sgz_sunhanhua/sgz_miaojian${[3,4].randomGet()}.mp3`);
                                    //player.logSkill(SGZ_MJ);
                                    // 出框动作：改由「发动妙剑④」触发（威灵尽显皮肤专属）。
                                    // ⚠ 必须放在 precontent 里 —— ④ 是 chooseButton 的视为技，
                                    //   每次使用都会走这里，是唯一全覆盖的"发动"点（和【矫诏】同理）。
                                    //   皮肤不匹配 / 皮肤切换未启用时，函数内部会静默返回。
                                    if (typeof window.dmqcPlaySunhanhuaEffect === "function") {
                                        window.dmqcPlaySunhanhuaEffect(player);
                                    }
                                },
                            };
                            // ⚠⚠⚠ **濒死救援必须自己接管"谁能当目标"**（这就是"妙剑造桃回不了血"的修复点）：
                            //   引擎求桃时（content.js:33-83）是在 chooseToUse 上挂
                            //   `filterTarget: target != _status.event.dying → false`。
                            //   本技能是 **chooseButton 型视为技**，走到目标判定那一步时 `_status.event`
                            //   已经不是那个求桃事件了 ⇒ 那个过滤**把所有人都判成 false** ⇒
                            //   **一个可选目标都没有** ⇒【桃】被"**无目标使用**"：战报只有
                            //   "孙寒华使用了桃"，`lib.card.tao.content` 的 `target.recover()` 压根没跑。
                            //   ⇒ 这里用全局 `_status.dying` 自己认人：只要**当前正在被求桃的那一个**
                            //     （`_status.dying[0]`，`dying` 事件开始时 unshift 进去的）。
                            //     （梦赵云【龙霄】找濒死角色也是用 `_status.dying` 兜底的。）
                            //   ⚠⚠ **千万不要顺手写 `selectTarget: 1`**（踩过）：引擎对
                            //     `selectTarget: -1`（=【桃】自己的值）有一条特殊分支
                            //     `if (range[1] <= -1)`（game/check.js:63-73）——它会**自动把所有
                            //     可选目标勾上**，这正是"濒死求桃不用手点目标"的实现。
                            //     写成 `selectTarget: 1` 就没收自动勾选，确定键会一直是灰的，
                            //     必须手动点一下濒死角色才行（用户实测的现象）。
                            //     ⇒ 只接管 `filterTarget`，把 `selectTarget` 原样留给引擎。
                            //   ⚠ 只在"确实有人在濒死"时才接管；平时（出牌阶段视为使用）完全交回引擎默认判定。
                            const dying =
                                typeof _status !== "undefined" && Array.isArray(_status.dying)
                                    ? _status.dying.filter(p => p && typeof p.countCards === "function" && p.hp <= 0)
                                    : [];
                            if (dying.length) {
                                const current = dying[0];
                                backup.filterTarget = function (card, player, target) {
                                    return target === current;
                                };
                            }
                            return backup;
                        },
                        prompt(links, player) {
                            return "妙剑：视为使用或打出「" + get.translation(links[0][2]) + "」";
                        },
                    },
                },
                // ---- ⑤ 你的普通杀视为刺杀 → **已按需求删除**（作为强度限制的补偿）----
                //  原先这里是：
                //      stab: { sub: true, charlotte: true, silent: true,
                //          mod: { cardnature(card, player) {
                //              if (player.hasSkill(SGZ_MJ) && card && card.name === "sha" && !card.nature) return "stab";
                //          } } }
                //  同时 `group` 里的 `"sgz_miaojian_stab"` 也已摘掉。
                //  ⚠ 想恢复就把这个子技能对象整段加回 `subSkill`，再把名字加回上面的 `group`
                //    （引擎靠 `group` 认领子技能，只加 subSkill 不加 group 是不会生效的）。
                //  ⚠ 注意 `extension.js:275` 那条音效劫持 `cards:['sha_stab']` 是**独立配置**，
                //    这里没动它（它只在"她真的打出刺杀"时才命中，删了⑤之后基本不会触发，留着无害）。
            },
        },

        // ====================================================
        //  2. 莲华（大空壳：3 个子技能）
        // ====================================================
        sgz_lianhua: {
            ai: AI.sgz_lianhua,
            persevereSkill: true,
            locked: true,
            audio: "ext:大梦千秋/audio/sgz_sunhanhua:2",
            group: ["sgz_lianhua_hujia", "sgz_lianhua_mark", "sgz_lianhua_discard"],
            subSkill: {
                // ---- ① 你即将受到【杀】的伤害时，弃置一张牌，获得1点护甲 ----
                //  需求改动：原来的①是 `mod.targetEnabled` 的"【杀】不能选择你为目标"（纯被动、无代价），
                //  现在换成"挨【杀】时弃一张牌换 1 点护甲"。**子技能 id 也跟着从 `wuxiao` 改成 `hujia`**
                //  （⚠ 老存档里如果还留着 `sgz_lianhua_wuxiao`，引擎只会在控制台报一次
                //   "Cannot find ... in lib.skill" 然后跳过，不会崩）。
                //  ⚠ 时机用 `damageBegin3`（= 受到伤害时，与②同一套口径）：
                //    1/2 是伤害来源加/减伤害的窗口，4 是最后的"取消/防止"窗口（藤甲那一类）。
                //    护甲是**永久资源**，即便这道伤害随后被取消也不会浪费 ⇒ 不必抢到 4 去。
                //  ⚠ 判据是 `event.card.name === "sha"`：涵盖真【杀】、属性【杀】、以及"视为【杀】"的虚拟牌
                //    （妙剑④造出来的杀也是 name:"sha"）；没有牌/没有来源的伤害直接排除。
                //  ⚠ 按需求写成**锁定技**（不询问是否发动），但"弃哪张"仍由玩家自己选。
                //    ⚠ 想改成可选：删掉 `forced: true` 并补一句 `check: () => true` 即可。
                //  ⚠ 弃置区域是 `"he"`（手牌 + 装备），与踏寂"一张牌"的口径保持一致。
                hujia: {
                    sub: true,
                    charlotte: true,
                    locked: true,
                    forced: true,
                    trigger: { player: "damageBegin3" },
                    filter(event, player) {
                        if (!event.card || event.card.name !== "sha") return false;
                        return player.countDiscardableCards(player, "he") > 0;
                    },
                    async content(event, trigger, player) {
                        // ⚠ `chooseToDiscard` **自己会执行弃置**（非 chooseonly 时），别再手动 discard 一次
                        const result = await player
                            .chooseToDiscard("he", true)
                            .set("prompt", "莲华：弃置一张牌并回复一点体力")
                            .forResult();
                        if (!result.bool || !result.cards || !result.cards.length) return;
                        //await player.changeHujia(1);
                        await player.recover(1);
                    },
                },
                // ---- ② 你受到伤害时，获得一个妙剑标记（**每回合限一次**）----
                //  （锁定技，用 damageBegin3 = 受到伤害时；想改成「伤害结算后」把时机换成 damageEnd 即可）
                //
                //  ★ 每回合限一次 = 就写一句 `usable: 1`（**触发技也是这么写的，这是引擎原生支持**）：
                //    触发技结算时引擎会 `player.addSkill("counttrigger")` 并累加
                //    `storage.counttrigger[技能id]`（noname/library/element/content.js:4293-4303），
                //    之后 `lib.filter.filterTrigger` 就会在次数达到 usable 时直接不触发
                //    （noname/library/index.js:11097-11105）；而 `counttrigger` 这个内置技能
                //    在 `phaseAfter` / `phaseBeforeStart` / `roundStart` 时自我移除并清空计数
                //    （noname/library/index.js:13356-13380）⇒ 效果就是「每回合限一次」。
                //  ⚠ 注意它不是 `round: 1`：`round` 是**每轮**限一次（跨整个轮次，粒度更粗）。
                mark: {
                    sub: true,
                    charlotte: true,
                    silent: true,
                    locked: true,
                    trigger: { player: "damageBegin3" },
                    forced: true,
                    usable: 1,
                    async content(event, trigger, player) {
                        player.addMark(SGZ_MJ, 1);
                        game.playAudio(`../extension/大梦千秋/audio/sgz_sunhanhua/sgz_lianhua${[1,2].randomGet()}.mp3`);
                        // 标记 +1 → 立刻补一张带「妙剑」标记的手牌（维持 ② 的不变量）
                        await sgzMjSync(player);
                    },
                },
                // ---- ③ 你的回合开始时和结束时，弃置所有非「妙剑」手牌 ----
                //  需求：作为强度限制 —— 每回合的两端都把手牌清到"只剩妙剑牌"。
                //  ⚠ 时机沿用本包的惯例：「回合开始时」= `phaseZhunbeiBegin`（准备阶段开始时，同妙剑①），
                //    「回合结束时」= `phaseJieshuBegin`（结束阶段开始时，同梦诸葛诞【孤绝】）。
                //    两个都挂在 `player:` 上 ⇒ **只认自己的回合**；写成 `global:` 会变成每名角色回合都触发。
                //  ⚠ 只弃**不带**妙剑标记的牌：带标记的那些是②的不变量（牌数必须等于标记数），
                //    弃了也会立刻被 `sgzMjSync` 摸回来（还多一次摸牌结算），等于白弃。
                //  ⚠ `filter` 先判"有没有可弃的牌"，没有就干脆不触发 —— 免得空放一个技能提示。
                //  ⚠ 这里是**真弃置**：会走 `discard` 事件 ⇒ 同时会喂给踏寂③（"其他原因失去牌 → 下次伤害+1"）。
                //    这是两条技能按各自规则连起来的正常结果，不是 bug；要断开就得在这里做特殊标记。
                discard: {
                    sub: true,
                    charlotte: true,
                    locked: true,
                    forced: true,
                    priority: -10,
                    trigger: { player: ["phaseZhunbeiBegin", "phaseJieshuBegin"] },
                    filter(event, player) {
                        return player.getCards("h", card => !sgzMjHasTag(card)).length > 0;
                    },
                    async content(event, trigger, player) {
                        const cards = player.getCards("h", card => !sgzMjHasTag(card));
                        if (!cards.length) return;
                        await player.discard(cards);
                    },
                },
            },
        },

        // ====================================================
        //  3. 踏寂
        // ====================================================
        //  参考代码（另一份扩展的同名技能）后按本包需求收敛：
        //    使用 → 场上**有手牌且手牌数唯一最少**的一名其他角色**随机**弃置一张牌（并列最少则无事发生）；
        //    打出 → 回复一点体力；**其他（除使用/打出以外的一切失去牌原因）→ 下一次造成的伤害 +1**。
        //  ⚠ 2026 改动（触发范围）：`filter` 原来只认**手牌**（`evt.hs`），导致"失去装备区的牌"不触发，
        //    与描述"当你失去牌后"不符 ⇒ 现在改为 **手牌 + 装备区**（= 引擎自己的 `cards2 = hs.concat(es)`）。
        //  ⚠ 2026 改动（需求两次追加后的最终版）：①不再是"你选一名角色弃其一张牌"，而是**全自动**：
        //    在**其他角色**里找手牌数最小且唯一的那个，随机弃其一张牌。
        //    判定集**不含孙寒华自己**（需求原话："其他所有角色中如果有一名角色手牌唯一最少"）。
        //    ⚠ **手牌数为 0 的角色不参与比较**（需求原话："场上有手牌且手牌数唯一最少"）：
        //      空手的人直接从候选里剔除 —— 否则一局里"唯一最少"永远是那个空手的人，
        //      会出现"因为对面没手牌，所以你把别人弃了"的怪事。
        //    ⚠ 并列最少 = 无事发生，**不要**从并列者里随机挑一个 —— 那正是需求要排除的情况。
        //    ⚠ 弃置区域是 `"he"`（手牌 + 装备）而不是只看手牌：技能文案是"随机弃置一张牌"，
        //      本包同类文案里"一张牌"都指整个区域（写"手牌"时才会限定 hand）。
        //  ⚠ 2026 改动（③）：原来是"弃置才 +1"，现在改成**兜底**：只要原因不是"使用/打出"就 +1。
        //    ⇒ content 里那三支必须写成 `if (useCard) / else if (respond) / else`，
        //      **不能再出现 `else if (name === "discard")`**（否则"交给别人""装备区变化"等会漏掉）。
        sgz_taqi: {
            persevereSkill: true,
            audio: "ext:大梦千秋/audio/sgz_sunhanhua:4",
            trigger: {
                player: "loseAfter",
                global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
            },
            forced: true,
            locked: false,
            filter(event, player) {
                const evt = event.getl(player);
                if (!evt) return false;
                // 「失去牌」= **手牌 + 装备区**（等价于引擎自己对"失去牌"的口径：
                //   `lose` 结算里 `event.cards2 = hs.concat(es)`，content.js:11346，
                //   整序等"当你失去牌后"的技能用的就是这个集合）。
                //  ⚠ 2026 改动（需求反馈的 bug）：原来只认 `hs`，于是**失去装备区的牌完全不触发踏寂**
                //    （技能描述写的是"当你失去牌后"，与实际效果不符）。
                //  ⚠ 判定区的牌（`js`）**故意不算**：与引擎口径一致；判定牌进出判定区也基本不走这条路。
                //  ⚠ 拿不到 `es` 的途径有两条，都必须保留在 trigger 里才收得到（别删）：
                //    · 装备被替换/顶掉：`equip` 事件里的 lose 带 `getlx: false`，
                //      ⇒ 它自己的 `loseAfter` 拿到的 getl 是**空表**，只能靠 `equipAfter` 的 getl 收；
                //    · 装备被拿走（顺手牵羊之类）：`gain` 事件里的 lose 同样 `getlx: false`，
                //      只能靠 `gainAfter` 收。
                return !!((evt.hs && evt.hs.length) || (evt.es && evt.es.length));
            },
            async content(event, trigger, player) {
                // ---- 判定"这次失去的原因"（⚠ 这里踩过坑，别图省事只写 `trigger.getParent().name`）----
                //  · `loseAfter`（普通失去）：父事件名就是原因（useCard / respond / discard / chooseToCompare…）。
                //  · `equipAfter` / `gainAfter` / `addJudgeAfter` / `addToExpansionAfter`：
                //    **必须用时机自己的名字**。这些时机的父事件往往是最外层的"使用牌"
                //    （换装备时 equip 的父事件就是 useCard），照父事件名会把"装备被替换"
                //    误判成"使用" —— 既走错分支（该 +1 却去弃别人的牌），又会让①对同一次出牌连发两次。
                //  · `loseAsyncAfter`：沿用原来的 `父事件.type`（引擎偶尔会标），没有就退到父事件名。
                let name;
                if (trigger.name === "loseAsync") {
                    const evt = trigger.getParent();
                    name = (evt && evt.type) || (evt && evt.name);
                } else if (trigger.name === "lose") {
                    const evt = trigger.getParent();
                    name = evt && evt.name;
                } else {
                    name = trigger.name; // "equip" / "gain" / "addJudge" / "addToExpansion" → 走"其他"
                }
                if (name === "useCard") {
                    // ---- 使用：场上**有手牌且手牌数唯一最少**的一名其他角色随机弃置一张牌 ----
                    //  判定范围是「其他角色」（**不含自己**）：在其他人里取手牌数的最小值，
                    //  只有**恰好一个人**站在最小值上才结算；并列最少 → 无事发生。
                    //  ⚠ 手牌数为 0 的人**不参与比较**（直接 continue）：否则空手的人永远是"唯一最少"，
                    //    会变成"因为对面空手，所以去弃第三个人的牌"这种莫名其妙的结果。
                    //  ⚠ 用 `countCards("h")`（引擎标准读数），别用 `getCards("h").length`：
                    //    后者在个别情况下会把转化牌/虚拟牌算进去，读数会和界面上看到的不一致。
                    let min = Infinity;
                    let bottoms = [];
                    for (const current of game.filterPlayer(t => t !== player)) {
                        const n = current.countCards("h");
                        if (n <= 0) continue; // 手里没牌的人不算"有手牌"
                        if (n < min) {
                            min = n;
                            bottoms = [current];
                        } else if (n === min) {
                            bottoms.push(current);
                        }
                    }
                    // 并列最少（>1）或没有任何人手里有牌（0）→ 什么都不做
                    if (bottoms.length !== 1) return;
                    const target = bottoms[0];
                    // 他没有可弃置的牌就安静跳过（别造一个空的弃牌事件出来）
                    if (!target.countDiscardableCards(target, "he")) return;
                    player.line(target);
                    game.log(player, "令", target, "随机弃置一张牌");
                    // 「随机弃置」按引擎惯例用 `randomDiscard()`：内部走
                    // `getDiscardableCards(target, "he")` + `.randomGets(1)`，
                    // 弃置行为的来源就是他自己（技能描述是"其随机弃置"，不是"你弃置其牌"）。
                    await target.randomDiscard("he");
                } else if (name === "respond") {
                    // ---- 打出：你回复一点体力 ----
                    await player.recover();
                } else {
                    // ---- 其他：你下一次造成的伤害 +1 ----
                    //  ⚠ 2026 改动（需求追加）：原来这里是 `else if (name === "discard")`，
                    //    现在改成**兜底分支** —— 只要失去牌的原因**不是使用、也不是打出**
                    //    （弃置 / 被弃置 / 交给别人 / 装备被替换 / 装备被拿走 / 判定区变化 / 拼点……）都走这条。
                    //    ⚠ 所以**不能**再补 `else if`，也不能在前面加任何"其它原因直接 return"的短路。
                    player.addSkill("sgz_taqi_damage");
                    player.addMark("sgz_taqi_damage", 1, false);
                    game.log(player, "下一次对其他角色造成的伤害", "#g+1");
                }
                // name 只区分「使用 / 打出」两种，其余全部归入"其他"
                //  ⚠ 顺带的已知效果：**使用一张装备牌去顶掉旧装备**时，这是一次动作里的两笔失去、
                //    按两条不同的原因各结算一次 —— 手牌那张（原因=使用）走①，旧装备那张（原因=装备替换）
                //    走③（+1）。这是"按失去原因分别结算"的直接推论，不是重复触发。
            },
            subSkill: {
                damage: {
                    sub: true,
                    trigger: { source: "damageBegin1" },
                    forced: true,
                    charlotte: true,
                    silent: true,
                    mark: true,
                    marktext: "+1",
                    onremove: true,
                    filter(event, player) {
                        return event.player !== player;
                    },
                    async content(event, trigger, player) {
                        trigger.num += player.countMark("sgz_taqi_damage");
                        player.removeSkill("sgz_taqi_damage");
                    },
                    intro: {
                        content: "下次对其他角色造成伤害时，此伤害+#",
                    },
                },
            },
        },

        // ====================================================
        //  4 / 5. 纯表现层（实现见 effect/sgz_sunhanhua.js）
        // ====================================================
        //  ⚠ 两者都**必须注册进上面的 `skills` 数组**才会 init（和梦赵云的 sgz_zhaoyun_ui 一样）；
        //    `charlotte: true` 让它们不出现在技能栏里。
        //    · sgz_miaojian_card_ui：给带「妙剑」标记的手牌套青绿剑气卡框
        //    · sgz_sunhanhua_ui    ：武将牌右侧的妙剑充能条（标记数 / SGZ_MJ_MAX）
        sgz_miaojian_card_ui: miaojianCardUI,
        sgz_sunhanhua_ui: sunhanhuaUI,
    },
    skillTranslate: {
        // 「妙剑」牌上的文字标记（引擎按 get.translation(tag) 取显示文字）
        sgz_miaojian_card: "妙剑",

        sgz_miaojian: "妙剑",
        sgz_miaojian_info:
            "<span style='color:#FF0000;'><strong>蓄力技</strong></span>（0/5），<span style='color:#00FF00;'>蓄力</span>：每名角色回合开始时。" + 
            "<br>①在你的手牌区中开辟一个特殊区域称为<span style='color:#00FF00;'>妙剑</span>，此区域上限等于蓄力点数。" +
            "②<span style='color:#00FF00;'>妙剑</span>中的牌数始终与上限相同。" +
            "③<span style='color:#00FF00;'>妙剑</span>中的牌无次数距离限制。" +
            "④你可以消耗1点蓄力点并将一张<span style='color:#00FF00;'>妙剑</span>中的牌视为任意一张非装备牌使用或打出。",

        sgz_lianhua: "莲华",
        sgz_lianhua_info: "锁定技，①你即将受到杀的伤害时，你弃置一张牌并回复一点体力。②每回合限一次，当你受到伤害时，获得1点蓄力点。③你的回合开始时和结束时，你弃置所有非<span style='color:#00FF00;'>妙剑</span>手牌。",

        sgz_taqi: "踏寂",
        sgz_taqi_info: "当你失去牌后，根据你失去牌的原因执行以下效果；1.使用：场上有手牌且手牌数唯一最少的一名其他角色随机弃置一张牌；2.打出：你回复一点体力；3.其他：你下一次对其他角色造成的伤害+1。",
        sgz_taqi_damage: "踏寂",
        sgz_taqi_damage_info: "下次对其他角色造成伤害时，此伤害+1。",
    },
    characterTaici: {
        sgz_miaojian: { order: 1, content: "持经诵万遍，妙理心自明。/盘膝思妙道，冲虚破玄关。/剑斩魔头，观万灵慑服，群妖束手！/一人一剑，往荡平魔窟，再肃人间！/光照玄冥。" },
        sgz_lianhua: { order: 2, content: "执护道之宝器，御万邪之侵袭！/定吾三魂七魄，保其不得丧倾！" },
        sgz_taqi: { order: 3, content: "施秘法镇灵育真，敕莲华固命守魂！/赫赫扬扬如烈日，覆护真人绽华光！/但借十方威神力，灭鬼除妖散邪精！/召吾剑来斩邪佞，护道妙宝显威灵！" },
        die: { content: "蜕此桎梏凡躯，得以真灵返天..." },
    },
};
