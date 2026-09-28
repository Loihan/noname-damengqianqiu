// ============================================================
//  梦孙寒华 —— 妙剑 / 莲华 / 踏寂
// ============================================================
//  表现层（卡牌特效 + 武将牌右侧充能条 + 标记名/上限常量）都在 effect/sgz_sunhanhua.js，
//  本文件从那里 import —— **方向是 character → effect，不成环**；反过来 import 会在
//  循环依赖里读到未初始化的 const。（这也是本包梦杜预的既有写法。）
//
//  按需求把两个大技能写成「大空壳 + 多个实际起作用的小技能」：
//
//  · 妙剑 (sgz_miaojian) = 空壳，挂 5 个子技能：
//      sgz_miaojian_gain    ①每名角色回合开始时（=准备阶段，同梦赵云【劫烬】），+1 妙剑标记（上限 SGZ_MJ_MAX）
//      sgz_miaojian_sync    ②维持不变量：手牌中「妙剑」标记的牌数 == 妙剑标记数
//      sgz_miaojian_limit   ③「妙剑」标记的牌使用无次数、无距离限制
//      sgz_miaojian_use     ④移去 1 个标记 + 弃 1 张「妙剑」牌 → 视为使用/打出任意一张牌
//      sgz_miaojian_stab    ⑤你的普通杀视为刺杀（nature: "stab"）
//
//  · 莲华 (sgz_lianhua) = 空壳，挂 2 个子技能：
//      sgz_lianhua_wuxiao   ①【杀】对你无效
//      sgz_lianhua_mark     ②你受到伤害时，获得一个妙剑标记
//
//  · 踏寂 (sgz_taqi)：失去牌后按**失去的原因**分别结算
//      useCard → 弃置其他角色一张牌；respond → 回复 1 点体力；discard → 下一次伤害 +1
//      （还有个子技能 sgz_taqi_damage 负责把那 +1 真正加在伤害上）
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
function sgzMjViewAsNames() {
    return lib.inpile.filter(name => !!lib.card[name] && get.type(name) != "equip");
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

export default {
    character: {
        sgz_sunhanhua: {
            sex: "female",
            group: "wu",
            hp: 4,
            maxHp: 4,
            hujia: 1,
            skills: ["sgz_miaojian", "sgz_lianhua", "sgz_taqi", "sgz_sunhanhua_ui", "sgz_miaojian_card_ui"],
            // ⚠ 武将图片先空着：图放到这个路径即可（文件不存在时立绘空白、不会报错）
            img: "extension/大梦千秋/image/sgz_sunhanhua.jpg",
            // 语音先空着
            dieAudios: [],
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
            // 空壳本身不带任何逻辑，全部交给子技能
            mark: true,
            marktext: "妙剑",
            intro: {
                name: "妙剑",
                content: "标记数 #（上限 " + SGZ_MJ_MAX + "）；手牌中「妙剑」牌数与标记数始终相等",
            },
            group: ["sgz_miaojian_gain", "sgz_miaojian_sync", "sgz_miaojian_limit", "sgz_miaojian_use", "sgz_miaojian_stab"],
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
                        // 只要有任意一张（非装备）牌能被这个时机使用/打出，就亮按钮
                        for (const name of sgzMjViewAsNames()) {
                            if (event.filterCard(get.autoViewAs({ name: name }, "unsure"), player, event)) return true;
                        }
                        return false;
                    },
                    ai: {
                        order: 4,
                        result: { player: 1 },
                    },
                    chooseButton: {
                        dialog(event, player) {
                            const list = [];
                            for (const name of sgzMjViewAsNames()) {
                                if (event.filterCard(get.autoViewAs({ name: name }, "unsure"), player, event)) {
                                    list.push([get.translation(get.type(name)), "", name]);
                                }
                            }
                            const dialog = ui.create.dialog("妙剑");
                            dialog.add([list, "vcard"]);
                            return dialog;
                        },
                        filter(button, player) {
                            return _status.event.getParent().filterCard({ name: button.link[2] }, player, _status.event.getParent());
                        },
                        check(button) {
                            const player = _status.event.player;
                            return player.getUseValue({ name: button.link[2] }) || 1;
                        },
                        backup(links, player) {
                            return {
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
                                    player.logSkill(SGZ_MJ);
                                },
                            };
                        },
                        prompt(links, player) {
                            return "妙剑：视为使用或打出「" + get.translation(links[0][2]) + "」";
                        },
                    },
                },
                // ---- ⑤ 你的普通杀视为刺杀（nature: "stab"）----
                //  `stab` 是本引擎合法的 nature（见 noname 的 cardData[3] = "stab"、image/card/cisha.png）
                stab: {
                    sub: true,
                    charlotte: true,
                    silent: true,
                    mod: {
                        cardnature(card, player) {
                            if (player.hasSkill(SGZ_MJ) && card && card.name === "sha" && !card.nature) return "stab";
                        },
                    },
                },
            },
        },

        // ====================================================
        //  2. 莲华（大空壳：2 个子技能）
        // ====================================================
        sgz_lianhua: {
            locked: true,
            group: ["sgz_lianhua_wuxiao", "sgz_lianhua_mark"],
            subSkill: {
                // ---- ① 杀对你无效 ----
                //  范式取自本体「五禽戏」的 mod.targetEnabled(card, player, target)：
                //  target 就是「被指定为目标」的角色，对它返回 false 即「该牌对它无效」。
                wuxiao: {
                    sub: true,
                    charlotte: true,
                    silent: true,
                    locked: true,
                    mod: {
                        targetEnabled(card, player, target) {
                            if (card && card.name === "sha" && target && target.hasSkill("sgz_lianhua")) return false;
                        },
                    },
                },
                // ---- ② 你受到伤害时，获得一个妙剑标记 ----
                //  （锁定技，用 damageBegin3 = 受到伤害时；想改成「伤害结算后」把时机换成 damageEnd 即可）
                mark: {
                    sub: true,
                    charlotte: true,
                    silent: true,
                    locked: true,
                    trigger: { player: "damageBegin3" },
                    forced: true,
                    async content(event, trigger, player) {
                        player.addMark(SGZ_MJ, 1);
                        // 标记 +1 → 立刻补一张带「妙剑」标记的手牌（维持 ② 的不变量）
                        await sgzMjSync(player);
                    },
                },
            },
        },

        // ====================================================
        //  3. 踏寂
        // ====================================================
        //  参考代码（另一份扩展的同名技能）后按本包需求收敛：
        //    使用 → 弃置其他角色一张牌；打出 → 回复一点体力；弃置 → 下一次造成伤害 +1。
        //    **other（其它原因失去牌）按需求不做任何事** —— 参考代码在 other 分支里给了加成，这里去掉。
        sgz_taqi: {
            persevereSkill: true,
            trigger: {
                player: "loseAfter",
                global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
            },
            forced: true,
            locked: false,
            filter(event, player) {
                var evt = event.getl(player);
                return !!(evt && evt.hs && evt.hs.length);
            },
            async content(event, trigger, player) {
                const evt = trigger.getParent();
                let name = evt.name;
                if (trigger.name === "loseAsync") name = evt.type;
                if (name === "useCard") {
                    // ---- 使用：你弃置其他角色一张牌 ----
                    const targets = game.filterPlayer(function (current) {
                        return current !== player && current.countDiscardableCards(player, "he");
                    });
                    if (!targets.length) return;
                    const result = await player
                        .chooseTarget("踏寂：弃置其他角色一张牌", true, function (card, player, target) {
                            return _status.event.targets.includes(target);
                        })
                        .set("targets", targets)
                        .set("ai", function (target) {
                            return get.effect(target, { name: "guohe_copy2" }, _status.event.player);
                        })
                        .forResult();
                    if (result.bool && result.targets && result.targets.length) {
                        const target = result.targets[0];
                        player.line(target);
                        await player.discardPlayerCard(target, "he", true);
                    }
                } else if (name === "respond") {
                    // ---- 打出：你回复一点体力 ----
                    await player.recover();
                } else if (name === "discard") {
                    // ---- 弃置：你下一次造成的伤害 +1 ----
                    player.addSkill("sgz_taqi_damage");
                    player.addMark("sgz_taqi_damage", 1, false);
                    game.log(player, "下一次对其他角色造成的伤害", "#g+1");
                }
                // name 为其它值时不做事（按需求只处理这三种原因）
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
            "①每名角色回合开始时，你获得一个「妙剑」标记，妙剑标记数至多为" + SGZ_MJ_MAX + "。" +
            "②你手牌中的「妙剑」标记的牌数始终等于妙剑标记数。" +
            "③标记为「妙剑」的牌使用无次数距离限制。" +
            "④你可以移去一个妙剑标记并弃置一张「妙剑」标记的牌，视为使用或打出任意一张牌。" +
            "⑤你的普通杀视为刺杀。",

        sgz_lianhua: "莲华",
        sgz_lianhua_info: "锁定技，①杀对你无效。②你受到伤害时，获得一个妙剑标记。",

        sgz_taqi: "踏寂",
        sgz_taqi_info: "当你失去牌后，根据你失去牌的原因执行以下效果；1.使用：你弃置其他角色一张牌；2.打出：你回复一点体力；3.弃置：你下一次造成的伤害+1。",
        sgz_taqi_damage: "踏寂",
        sgz_taqi_damage_info: "（子技能）下次对其他角色造成伤害时，此伤害+1。",
    },
    // 语音按需求先空着，占位保留结构
    characterTaici: {
        // "sgz_miaojian": { order: 1, content: "" },
        // "sgz_lianhua": { order: 2, content: "" },
        // "sgz_taqi": { order: 3, content: "" },
        // die: { content: "" },
    },
};
