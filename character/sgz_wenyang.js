// ============================================================
//  梦文鸯（魏）· 三国志
//    · 惊跃 (sgz_jingyue)：手牌里的红/黑牌 → 火【杀】/雷【杀】；使用后摸1、回1、+1霆踪
//    · 霆踪 (sgz_tingzong)：锁定技；**开局 0 个**（只从惊跃积累）、回合开始清空重摸、距离修正
//      ⚠ 2026 改动：原来的③（出牌阶段内满7 → 处决一名其他角色 → 结束阶段）**已删除**，
//        触发条件并入仇决的成功条件（「蓄力点达到7」）。
//    · 仇决 (sgz_choujue)：**使命技**，锁定发动。即将死亡时防止之 → 上限-1、回满体力；
//        然后：免死瞬间蓄力点不为0 → 只清空蓄力点；为0 → 等级-1（2级降到1级即失去【催灭】）。
//        成功（杀死一名角色 或 蓄力点达到7）→ 上限+1、回满体力、获得【催灭】，随后 `awakenSkill` 觉醒（技能永久失效）。
//    · 催灭 (sgz_cuimie)：锁定技；你造成伤害后，受伤者体力上限立即压到与体力相同（上限到0即死，且不算你击杀）。
//
//  ⚠ 需求确认过的约定（**别自己改**）：
//    · 体力 **6/7** = 开局就是受伤状态（`hp: 6, maxHp: 7`）
//    · 惊跃只能用**手牌**、只能**使用**（不能打出）
//    · 惊跃③每回合限 X 次：X = **游戏开始后已经开始的回合数**（所有角色的回合都算，
//      含当前这个），至多 7。例：3 号位在第一轮自己的回合里 ⇒ 能用 3 次
//    · 「霆踪」标记（= 蓄力点）**至多 7 个**、**开局 0 个**（没有"游戏开始时给标记"这一条）
//    · 「蓄力点达到7」现在只用来触发**仇决的成功分支**（霆踪本身不产生任何效果）
//    · 仇决等级：初始 1 级，0/1/2 级；标记直接写「仇决LvN」；只有 2 级才亮红色「仇」框
//    · 霆踪②的「等量」= **移除掉的霆踪标记数**
//    · 惊跃②：火【杀】的那套加成（无距离限制 / 伤害+1 / 不可被响应）**只给本阶段首张**
//      （雷【杀】的"无次数限制 + 不计入次数"不受此限）
//
//  ⚠ 标记名就用技能名：`player.countMark("sgz_tingzong")` / `countMark("sgz_choujue")`
//    （和梦孙寒华的「妙剑」同一套做法：mark 的 storage 键就是技能名，省一个字符串）。
// ============================================================

// ---- 表现层 + 共享常量（霆踪雷电进度条 / 仇决卡面特效，实现见 effect/sgz_wenyang.js）----
//  ⚠ 标记名、上限、UI 技能名都定义在 effect/sgz_wenyang.js 里（唯一来源）；
//    进度条的分母直接用上限常量，所以「上限」只需要改那一个数字。
//    （方向是 character → effect，不成环；与本包梦杜预 / 梦孙寒华同一套写法。）
import {
    SGZ_WY_TINGZONG,
    SGZ_WY_TINGZONG_MAX,
    SGZ_WY_CHOUJUE,
    SGZ_WY_TINGZONG_UI_SKILL,
    SGZ_WY_CHOUJUE_UI_SKILL,
    tingzongGaugeUI,
    choujueUI,
} from "../effect/sgz_wenyang.js";
import AI, { helpers } from "../ai/sgz_wenyang.js";

/// 霆踪标记名（= 技能名；`sgz_tingzong` 就是载体技能）
const TINGZONG = SGZ_WY_TINGZONG;
/// ★ 霆踪标记上限（需求：至多 7 个；出牌阶段内达到 7 触发④）
const TINGZONG_MAX = SGZ_WY_TINGZONG_MAX;
/// 仇决标记名（= 技能名）—— 老版本的「仇决」标记，现已不再使用，保留常量给表现层/调试用
const CHOUJUE = SGZ_WY_CHOUJUE;
/// 仇决等级（0/1/2，初始 1）——存储键
const CHOUJUE_LEVEL_KEY = "sgz_choujue_level";
/// 等级徽标的三个载体子技能（各自带 marktext，徽标字就是「仇决N级」）
const CHOUJUE_LV_SKILLS = {
    0: "sgz_choujue_lv0",
    1: "sgz_choujue_lv1",
    2: "sgz_choujue_lv2",
};

/// 读当前等级（缺省 1 级）
function sgzChoujueLevel(player) {
    const v = player && player.storage ? player.storage[CHOUJUE_LEVEL_KEY] : undefined;
    return typeof v === "number" ? v : 1;
}

/// 等级说明（标记与日志共用）
function sgzChoujueLevelText(lv) {
    if (lv >= 2) return "2级：视为拥有【催灭】；仍可免死（降级）";
    if (lv === 1) return "1级：可升级、可免死（降级）";
    return "0级：只有升级条件";
}

/// 刷新等级徽标：只留下当前等级那一个（徽标上的字＝「仇决N级」）
function sgzChoujueSyncMark(player) {
    if (!player || typeof player.addSkill !== "function") return;
    const lv = sgzChoujueLevel(player);
    for (const key of [0, 1, 2]) {
        const id = CHOUJUE_LV_SKILLS[key];
        if (key === lv) {
            if (!player.hasSkill(id)) player.addSkill(id);
        } else if (player.hasSkill(id)) {
            player.removeSkill(id);
        }
    }
}

/// 升级/降级时的「觉醒式」特效：
///   · `player.$skill("仇决·N级", "fire", "red", "avatar")` —— 与杜预【倾势】成功/失败分支
///     （character/sgz_duyu.js:833/885 的 `$skill('倾势·成功', 'fire', 'red', 'avatar')`）**同款**：
///     `$fire` 火焰特效 + 玩家聚焦 + 全屏红字。
///   · 仍然借一次 `awakenSkill`（它带觉醒的美术钩子），随后立刻 `restoreSkill(..., true)` 复原，
///     保证技能**不会真的失效**。
function sgzChoujuePlayAwaken(player, lv) {
    try {
        if (lv === undefined) lv = sgzChoujueLevel(player);
        if (typeof player.$skill === "function") player.$skill("仇决·" + lv + "级", "fire", "red", "avatar");
        if (typeof player.awakenSkill === "function") player.awakenSkill(CHOUJUE);
        if (typeof player.restoreSkill === "function") player.restoreSkill(CHOUJUE, true);
    } catch (e) {}
}

/// 设置等级：同步标记、2级给【催灭】、离开2级收回【催灭】、播 awaken 特效
async function sgzChoujueSetLevel(player, lv) {
    const next = Math.max(0, Math.min(2, lv));
    const prev = sgzChoujueLevel(player);
    if (next === prev) return prev;
    if (!player.storage) player.storage = {};
    player.storage[CHOUJUE_LEVEL_KEY] = next;
    game.log(player, "【仇决】等级：" + prev + " → " + next);
    sgzChoujueSyncMark(player);
    if (next >= 2) {
        if (!player.hasSkill("sgz_cuimie")) await player.addSkill("sgz_cuimie");
    } else {
        if (player.hasSkill("sgz_cuimie")) await player.removeSkill("sgz_cuimie");
    }
    sgzChoujuePlayAwaken(player, next);
    return next;
}


/// 加霆踪标记（**带上限夹取**，返回实际加了多少）
function sgzAddTingzong(player, num = 1, log = true) {
    const cur = player.countMark(TINGZONG);
    if (cur >= TINGZONG_MAX) return 0;
    const add = Math.min(num, TINGZONG_MAX - cur);
    player.addMark(TINGZONG, add, log ? undefined : false);
    return add;
}

/// 清空霆踪标记（返回清掉的数量）
function sgzClearTingzong(player) {
    const num = player.countMark(TINGZONG);
    if (num > 0) player.removeMark(TINGZONG, num, false);
    return num;
}


/// 判断"这张牌是不是惊跃造出来的杀"，返回 `"fire"` / `"thunder"` / `false`。
/// ⚠⚠ **两条判据并用**（梦赵云【龙霄】的 mod 就是这么写的，务必保留结论）：
///   ① 自定义暗号 `card._sgz_jingyue`：`event.card` 那条路上还在；
///   ② 兜底：`_status.event.skill == "sgz_jingyue"` + 牌的**属性**（火/雷）。
///   为什么必须兜底：引擎在 `lib.filter.cardUsable` / `cardUsable2` 里会先
///   `card = get.autoViewAs(card)` 复制一张牌（library/index.js:11364/11393），
///   而复制**实体牌**时 VCard 只带 name/suit/color/number/nature/isCard/cardid/storage/cards
///   （vcard.js:34-61）—— **自定义字段会丢** ⇒ 只看①的话，雷杀的"无次数限制"会静默失效。
///   （`nature` 是会被复制的，所以兜底这一支认属性。）
function sgzJingyueTag(card) {
    if (!card) return false;
    if (card._sgz_jingyue) return card._sgz_jingyue;
    if (typeof _status !== "undefined" && _status.event && _status.event.skill == "sgz_jingyue" && get.name(card) == "sha") {
        const nature = card.nature;
        if (nature == "fire") return "fire";
        if (nature == "thunder") return "thunder";
    }
    return false;
}

/// 「本阶段是否已经用过惊跃的火【杀】」—— 决定火杀那一整套加成（无距离/伤害+1/不可被响应）
/// 只给**本阶段首张**火杀。
/// ⚠ 用 `game.phaseNumber`（阶段序号）当键：阶段一换键就变 ⇒ **不用另外挂时机去重置**，
///   也不会把上一阶段的记录带过来。
/// ⚠ 读 = "此刻之前有没有用过"（选目标那一步本张还没真正使用）；写 = `useCard1`。
function sgzJingyueFireUsed(player, set) {
    if (!player || !player.storage) return false;
    let st = player.storage.sgz_jingyue_fire;
    const phase = typeof game !== "undefined" && game ? game.phaseNumber : 0;
    if (!st || st.phase !== phase) {
        st = { phase: phase, used: false };
        player.storage.sgz_jingyue_fire = st;
    }
    if (set) {
        st.used = true;
        return true;
    }
    return !!st.used;
}

// ---- 惊跃的「次数上限」----
//  需求：每回合限 X 次，X = **游戏开始后已经开始的回合数**（所有角色的回合都算，含当前这个），至多 7。
//  例：3 号位在第一轮自己的回合里 ⇒ 1号 + 2号 + 自己 = 3 次。
//  ⚠ 不用自己维护计数器：引擎每到"一个角色的回合开始"就会给**在场每个人**各 push 一条
//    `actionHistory`（content.js:4732-4745，就在 `phaseBegin` 之前那一拍），
//    而它出生时自带 1 条占位（player.js:125-137）⇒ 已经开始的回合数 = max(length) - 1。
//    ⚠⚠ 取 **max**，**不能求和**（求和会变成 回合数 × 在场人数，这个坑踩过）；
//    取 max 还能兼容中途加入 / 换将的角色（他们的数组短，不会把数字算小）。
//    好处：换将 / 复活 / 新开一局都不用额外重置，也不会漏算别人的回合。
function sgzTurnCount() {
    if (typeof game === "undefined" || !game) return 0;
    const players = (game.players || []).slice(0).concat(game.dead || []);
    let num = 0;
    for (const current of players) {
        if (current && current.actionHistory) num = Math.max(num, current.actionHistory.length - 1);
    }
    return Math.max(0, num);
}

/// 惊跃本回合的次数上限 = min(7, 已经开始的回合数)
function sgzJingyueLimit() {
    return Math.min(7, sgzTurnCount());
}

/// 本回合已经用了几次惊跃（用「当前回合的 sgzTurnCount」当键 ⇒ 换回合自动归零）
function sgzJingyueUsed(player) {
    if (!player || !player.storage) return 0;
    const rec = player.storage.sgz_jingyue_uses;
    if (!rec || rec.turn !== sgzTurnCount()) return 0;
    return rec.count || 0;
}

/// 记一次惊跃（在 `useCard1` 里调用 = 这张牌确实被使用了）
function sgzJingyueAddUse(player) {
    if (!player || !player.storage) return;
    const turn = sgzTurnCount();
    const rec = player.storage.sgz_jingyue_uses;
    if (!rec || rec.turn !== turn) player.storage.sgz_jingyue_uses = { turn: turn, count: 1 };
    else rec.count = (rec.count || 0) + 1;
}

/// 本回合还剩几次（<= 0 就不给用）
function sgzJingyueRemain(player) {
    return sgzJingyueLimit() - sgzJingyueUsed(player);
}

export default {
    character: {
        sgz_wenyang: {
            sex: "male",
            group: "wei",
            // 需求：6/7（开局就掉 1 点体力，不是满血）
            hp: 6,
            maxHp: 7,
            skills: [
                "sgz_jingyue",
                "sgz_tingzong",
                "sgz_choujue",
                // 霆踪 · 蓝紫雷电进度条（charlotte 隐藏，见 effect/sgz_wenyang.js）
                SGZ_WY_TINGZONG_UI_SKILL,
                // 仇决 · 血仇暗影（charlotte 隐藏，见 effect/sgz_wenyang.js）
                SGZ_WY_CHOUJUE_UI_SKILL,
            ],
            img: "extension/大梦千秋/image/sgz_wenyang.jpg",
            names: "文|鸯",
            // 无语音文件，dieAudios 留空（免得满屏 404）
            dieAudios: ["ext:大梦千秋/audio/sgz_wenyang/die.mp3"],
        },
    },
    characterName: "sgz_wenyang",
    characterTranslate: { sgz_wenyang: "梦文鸯" },
    skills: {
        // ====================================================
        //  1. 惊跃
        // ====================================================
        //  红色手牌 → 火【杀】；黑色手牌 → 雷【杀】。**只能用、不能打出**（需求）。
        //  ⚠ 龙霄那套「普通 viewAs」写法：`viewAs(cards, player)` 返回的牌**自定义属性会保留**
        //    （龙霄就是靠 `card._sgz_longxiao_diamond` 让下面几个子技能认出自己的牌），
        //    所以这里统一用 `card._sgz_jingyue === "fire" / "thunder"` 当暗号。
        sgz_jingyue: {
            persevereSkill: true,
            audio: "ext:大梦千秋/audio/sgz_wenyang:4",
            enable: ["chooseToUse"],
            // ⚠ `filterCard` = **点了技能之后**"哪些手牌能选"的判据（引擎靠它给每张牌加 `selectable`）：
            //    · 黑牌 → 雷【杀】**无次数限制** ⇒ 永远可选（亮）
            //    · 红牌 → 火【杀】没写无次数 ⇒ **还有出杀次数**时才可选（否则暗淡）
            //      `player.getCardUsable("sha")` = 本阶段"还剩几次出【杀】"（引擎算好的，含连弩/加次数类 mod；
            //      它内部用 `{name:"sha"}` 这种无名片过 mod，不会命中我们的 `_sgz_jingyue` 判据 ⇒ 拿到的就是正常上限）
            //    · 无色牌（虚拟牌之类）既不是红也不是黑 ⇒ 不能转化
            filterCard(card, player) {
                const color = get.color(card, player);
                if (color == "black") return true;
                if (color != "red") return false;
                return player.getCardUsable("sha") > 0;
            },
            position: "h",
            selectCard: 1,
            viewAs(cards, player) {
                if (!cards || !cards.length) return null;
                const color = get.color(cards[0], player);
                if (color == "red") return { name: "sha", nature: "fire", _sgz_jingyue: "fire" };
                if (color == "black") return { name: "sha", nature: "thunder", _sgz_jingyue: "thunder" };
                return null;
            },
            prompt: "惊跃：将一张红色牌当火【杀】/黑色牌当雷【杀】使用",
            check: helpers.sgz_jingyue_check,
            // ⚠ 技能自己给 `filter`：`viewAs` 是函数时引擎**不会**替你判断"现在能不能用"
            //   （`lib.filter.filterEnable` 只对**对象形式**的 viewAs 做 `filterCard` 检查），
            //   没有它的话"没有红黑手牌 / 这个时机不能用杀"也会亮按钮。
            //   ⚠ 同时要防住"事件没有 filterCard"（引擎在 `hasUsableCard` / 濒死那条链上会这么问，
            //     见梦孙寒华 ④ 的注释）。
            //   ⚠⚠ **造的候选牌必须带上惊跃的暗号 + 属性**（这是"出牌次数用光后雷杀用不了"的修复点）：
            //     按钮亮不亮这一步，引擎会拿这张候选牌去过 `lib.filter.cardUsable` →（走）我们的 mod，
            //     而**此时技能还没被选中**（`_status.event.skill` 还是空的），所以 mod 里那条
            //     `_status.event.skill` 兜底失效，只能靠 `card._sgz_jingyue` 认牌。
            //     不带暗号 ⇒ 无次数限制的雷杀也被当作普通【杀】判"次数已满" ⇒ 按钮变灰。
            filter(event, player) {
                if (!event || typeof event.filterCard !== "function") return false;
                // ③ 每回合限 X 次（X = 已经开始的回合数，至多 7）——用完了按钮就不亮
                if (sgzJingyueRemain(player) <= 0) return false;
                const hasRed = player.countCards("h", card => get.color(card, player) == "red") > 0;
                const hasBlack = player.countCards("h", card => get.color(card, player) == "black") > 0;
                if (hasRed && event.filterCard(get.autoViewAs({ name: "sha", nature: "fire", _sgz_jingyue: "fire" }, "unsure"), player, event)) return true;
                if (hasBlack && event.filterCard(get.autoViewAs({ name: "sha", nature: "thunder", _sgz_jingyue: "thunder" }, "unsure"), player, event)) return true;
                return false;
            },
            ai: AI.sgz_jingyue,
            group: ["sgz_jingyue_effect", "sgz_jingyue_respond", "sgz_jingyue_damage", "sgz_jingyue_after"],
            subSkill: {
                // ---- ② 火杀（**本阶段首张**才算）无距离限制；雷杀无次数限制 ----
                //  ⚠ 这里收到的牌可能是 `get.autoViewAs` **复制**过的（自定义字段会丢），
                //    所以判据走 `sgzJingyueTag`（暗号 + `_status.event.skill` + 属性双保险）。
                //  ⚠ 火杀的加成只给"本阶段首张"：选目标这一步本张还没"使用"过，
                //    所以 `sgzJingyueFireUsed` 读到的就是"之前有没有用过" ⇒ 正好是首张判定。
                effect: {
                    persevereSkill: true,
                    sub: true,
                    charlotte: true,
                    silent: true,
                    mod: {
                        targetInRange(card, player, target) {
                            if (sgzJingyueTag(card) == "fire" && !sgzJingyueFireUsed(player)) return true;
                        },
                        cardUsable(card, player, num) {
                            if (sgzJingyueTag(card) == "thunder") return Infinity;
                        },
                    },
                },
                // ---- ② 火杀（首张）：不可被响应（不可闪避 + 不可无懈）；雷杀：不计入次数 ----
                //  `useCard1` 是"牌已声明"的时机：
                //    · 火杀：先结算"是不是本阶段首张"（记到牌上 `_sgz_jingyue_first`，
                //      后面 `damage` / `useCardToTargeted` 两个子技能都读它，**不要**再去读状态，
                //      因为这一刻状态已经被置成"用过了"）；是首张才 `nowuxie = true`；最后把状态置为已用。
                //    · 雷杀 `trigger.addCount = false` = 不计入【杀】的使用次数
                //      ⚠ **光写这一句不够**：引擎在牌被使用的那一刻就已经把"本回合已使用的【杀】数"
                //      加了 1，所以要像梦赵云【龙霄】那样把它手动减回来（`stat.card.sha--`），
                //      否则下一次用真【杀】时会被"次数已满"卡住。
                //  `useCardToTargeted`：首张火杀把目标塞进 `directHit` → 该目标**不能再用【闪】**响应
                //    （写法照抄梦赵云【龙霄】的 directhit 子技能）
                respond: {
                    persevereSkill: true,
                    sub: true,
                    charlotte: true,
                    silent: true,
                    trigger: { player: ["useCard1", "useCardToTargeted"] },
                    forced: true,
                    filter(event, player) {
                        return !!sgzJingyueTag(event.card);
                    },
                    async content(event, trigger, player) {
                        // ⚠⚠ **区分触发点必须看 `event.triggername`，不能看 `trigger.name`**（踩过的坑）：
                        //   `trigger` 是"引起这次触发的**游戏事件**"（useCard1 / useCardToTargeted 两边
                        //   拿到的都是 useCard 或它的子事件，名字叫 "useCard"，永远不等于 "useCard1"）；
                        //   触发点名字挂在**技能自己那个事件**上：content.js:4292-4307
                        //   `next._trigger = trigger; next.triggername = event.triggername;`。
                        //   之前写成 `trigger.name == "useCard1"` ⇒ 雷杀那段（不计入次数）从来没执行过。
                        const point = event.triggername;
                        const tag = sgzJingyueTag(trigger.card);
                        // ③ 记一次使用（每回合次数上限用）。只在 useCard1 记一次，
                        //   别在两个触发点各记一次。
                        if (point == "useCard1") {
                            sgzJingyueAddUse(player);
                            // 皮肤「势若万钧」的攻击出框：触发条件 = **使用【惊跃】**
                            //  （实现见 skin.js 第 10 节；原来绑在「使用伤害牌」上，已被 `_gj` 短路掉）
                            //  ⚠ 必须 try/包裹 + typeof 判空：skin.js 是异步加载的，
                            //    而且没开「皮肤切换/十周年UI」时这个函数可能不存在 —— 绝不能影响技能结算。
                            try {
                                if (typeof window !== "undefined" && typeof window.dmqcPlayWenyangEffect === "function") window.dmqcPlayWenyangEffect(player);
                            } catch (e) {
                                /* 出框只是演出，失败就算了 */
                            }
                        }
                        if (tag == "fire") {
                            // "本阶段首张"只在 useCard1 那一下判定一次，结果写在牌上给后续子技能用
                            if (point == "useCard1") {
                                const first = !sgzJingyueFireUsed(player);
                                trigger.card._sgz_jingyue_first = first;
                                if (first) trigger.nowuxie = true;
                                sgzJingyueFireUsed(player, true);
                            } else if (trigger.card._sgz_jingyue_first) {
                                trigger.getParent().directHit.add(trigger.target);
                            }
                            return;
                        }
                        if (tag == "thunder" && point == "useCard1") {
                            trigger.addCount = false;
                            // ⚠ 「不计入次数」：引擎的计数在 useCard 结算的**第一步**就加过了
                            //   （content.js:9467-9472，早于 `useCard1` 这个触发点），所以到这里
                            //   `addCount = false` 已经太晚，必须像梦赵云【龙霄】那样把计数减回来。
                            const stat = player.stat && player.stat[player.stat.length - 1];
                            if (stat && stat.card && stat.card.sha > 0) stat.card.sha--;
                        }
                    },
                },
                // ---- ② 火杀（本阶段首张）伤害+1 ----
                damage: {
                    persevereSkill: true,
                    sub: true,
                    charlotte: true,
                    silent: true,
                    trigger: { source: "damageBegin1" },
                    forced: true,
                    filter(event, player) {
                        return sgzJingyueTag(event.card) == "fire" && !!event.card._sgz_jingyue_first;
                    },
                    async content(event, trigger, player) {
                        trigger.num += 1;
                    },
                },
                // ---- ① 使用后：摸一张牌 → 回复1点体力 → 获得1个霆踪标记 ----
                //  ⚠ 挂 `useCardAfter`：需求确认过"使用后立刻给，无论是否被闪避/是否造成伤害"
                after: {
                    persevereSkill: true,
                    sub: true,
                    charlotte: true,
                    silent: true,
                    trigger: { player: "useCardAfter" },
                    forced: true,
                    filter(event, player) {
                        return !!sgzJingyueTag(event.card);
                    },
                    async content(event, trigger, player) {
                        await player.draw();
                        await player.recover();
                        sgzAddTingzong(player, 1);
                    },
                },
            },
        },

        // ====================================================
        //  2. 霆踪
        // ====================================================
        sgz_tingzong: {
            persevereSkill: true,
            audio: "ext:大梦千秋/audio/sgz_wenyang:2",
            locked: true,
            ai: AI.sgz_tingzong,
            // ⚠⚠ 2026 改动（需求：删掉武将牌上的「霆踪」标记）——**只删显示，逻辑一字未动**：
            //   · 原本这里写着 `mark: true` + `marktext: "霆踪"` + `intro: {...}`，那三行就是
            //     **武将牌上那个标记徽标的唯一来源**，现在因为右侧已经有自绘蓝紫雷电进度条，全部删除。
            //   · 计数本体是 `player.storage["sgz_tingzong"]`（`countMark/addMark/removeMark`），
            //     与 intro / mark **完全无关**，所以标记数、上限、④的伤害全都不受影响。
            //   · 为什么三个都要删（只删 `mark: true` 不够，这是引擎的行为，别只删一半）：
            //       - `addSkill` 时：`info.mark` 为真 → `markSkill()` → 建徽标。
            //       - `addMark` 时：`player.js:4277` 无条件 `this.markSkill(i)`，
            //         而 `markSkill` 在没有显式 info 时会自己读 **`lib.skill[i].intro`**
            //         （player.js:9299-9304），**只要有 intro 就会把徽标建回来**。
            //       - `removeMark` 到 0 时：靠 `lib.skill[i].mark` 决定走 markSkill 还是 unmarkSkill，
            //         删掉 `mark` 后归零即卸掉，不会再留一个"0"挂在武将牌上。
            //   · 日志文案不变：addMark/removeMark 打印的名字没有 intro 时回落到
            //     `lib.translate["sgz_tingzong"]`（= skillTranslate 里的 "霆踪"）。
            //   · 技能描述面板也不受影响：走 `lib.translate["sgz_tingzong_info"]`，不看 intro。
            //   · ⚠ 以后想恢复徽标：把下面三行加回来即可。
            //       mark: true,
            //       marktext: "霆踪",
            //       intro: { name: "霆踪", content: "mark" },
            // ⚠ 需求（2026）：**开局不给标记，初始 0 个**；霆踪只从【惊跃】的"使用后"里来。
            //   原来这里有一整块「① 游戏开始时 +6」：
            //       trigger: { global: "gameStart" }, content: player.addMark(TINGZONG, 6)
            //   现在已经**整块删除**（技能描述里本来也没有这一条）。
            //   ⚠⚠ 别想着"把数字改成 0 就行"：引擎 `player.addMark(i, num)` 里写着
            //     `if (typeof num != "number" || !num) num = 1;`（player.js:4256-4259）——
            //     **传 0 会被当成传 1**，所以必须整块删掉（用户实测"改成0还是给1个"）。
            // 需求（2026）：③「满7处决」已删除（并入仇决的成功条件：蓄力点达到7）
            group: ["sgz_tingzong_reset", "sgz_tingzong_range"],
            subSkill: {
                // ---- ② 出牌阶段开始时（若你有霆踪标记）：弃置所有手牌 → 移除所有霆踪 → 摸等量张牌 ----
                //  「等量」= **移除掉的标记数**（需求确认）。
                reset: {
                    persevereSkill: true,
                    sub: true,
                    charlotte: true,
                    silent: true,
                    // 需求（2026）：时机由"出牌阶段开始时"改为"**你的回合开始时**"（phaseBegin）。
                    trigger: { player: "phaseBegin" },
                    forced: true,
                    filter(event, player) {
                        return player.countMark(TINGZONG) > 0;
                    },
                    async content(event, trigger, player) {
                        game.playAudio(`../extension/大梦千秋/audio/sgz_wenyang/sgz_tingzong${[1,2].randomGet()}.mp3`);
                        const hand = player.getCards("h");
                        if (hand.length) await player.discard(hand);
                        const num = sgzClearTingzong(player);
                        if (num > 0) await player.draw(num);
                    },
                },
                // ---- ③ 距离修正：你→别人 -X；别人→你 +X（X = 霆踪标记数）----
                //  写法同本体【马术】/【飞影】：`globalFrom` 的持有者是 `from`，`globalTo` 的持有者是 `to`。
                range: {
                    persevereSkill: true,
                    sub: true,
                    charlotte: true,
                    silent: true,
                    mod: {
                        globalFrom(from, to, distance) {
                            return distance - from.countMark(TINGZONG);
                        },
                        globalTo(from, to, distance) {
                            return distance + to.countMark(TINGZONG);
                        },
                    },
                },
            },
        },

        // ====================================================
        //  3. 仇决（使命技）
        // ====================================================
        //  免死：`dieBefore` 里自己 cancel（连直死也能救）。
//  然后：免死瞬间蓄力点不为0 → 只清空；=0 → 降级。
        //  成功：**你杀死一名角色 或 蓄力点达到7** → 上限+1、回满体力、获得【催灭】。
        // ====================================================
        //  3. 仇决（使命技 / **空壳** + 三个子技能）
        // ====================================================
        //  约定（2026）：多效果的复杂技能一律「大空壳 + 若干实际作用的小技能」。
//   · save   ：即将死亡时防止之（上限-1、回满；蓄力点不为0清空，为0则降级）
        //   · success：你杀死一名角色 或 蓄力点达到7 → 上限+1、回满、获得【催灭】+ 觉醒
//   · upgrade：你杀死一名角色 或 蓄力点达到7 → 蓄力点归零 → 等级+1（满级2级后无反应）
        // ====================================================
        //  3. 仇决（**等级制**：0/1/2 级，初始 1 级；空壳 + 子技能）
        // ====================================================
        //  等级效果：
        //   · 0级：只有「升级条件」
        //   · 1级：升级条件 + 降级条件
        //   · 2级：视为拥有【催灭】 + 升级条件（已满级，达成也不再有反应） + 降级条件（降到1级即失去催灭）
        //  升级：你杀死一名角色 或 蓄力点达到7 → 蓄力点归零 → 等级+1（最高2）
        //  降级：当你即将死亡时防止之、上限-1、回满；免死瞬间蓄力点>0 只清空，=0 则等级-1
        sgz_choujue: {
            persevereSkill: true,
            audio: "ext:大梦千秋/audio/sgz_wenyang:5",
            awakenSkill: true,
            // ⚠ 不要写 `skillAnimation: true`：那会让 `logSkill("sgz_choujue")` 自己再弹一个
            //   「仇决」大字，和我们要的「仇决·N级」撞车。我们自己在 sgzChoujuePlayAwaken 里调 $skill。
            animationColor: "red",
            ai: AI.sgz_choujue,
            // 空壳：效果全在子技能里
            derivation:"sgz_cuimie",
            group: ["sgz_choujue_save", "sgz_choujue_upgrade"],
            init(player) {
                // 初始 1 级（第一次获得技能时写一次）
                if (typeof player.storage[CHOUJUE_LEVEL_KEY] !== "number") {
                    player.storage[CHOUJUE_LEVEL_KEY] = 1;
                }
                sgzChoujueSyncMark(player);
            },
            subSkill: {
                // ---- 等级徽标载体（徽标上的字直接是「仇决0级/1级/2级」）----
                //   只按当前等级挂其中一个，切换等级 = 换一个技能（徽标字随之变化）
                lv0: {
                    persevereSkill: true,
                    sub: true,
                    charlotte: true,
                    silent: true,
                    mark: true,
                    marktext: "仇决0级",
                    intro: {
                        name: "仇决0级",
                        content: "0 级：没有降级条件（不免死）；满足升级条件时升到 1 级。",
                        nocount: true,
                    },
                },
                lv1: {
                    persevereSkill: true,
                    sub: true,
                    charlotte: true,
                    silent: true,
                    mark: true,
                    marktext: "仇决1级",
                    intro: {
                        name: "仇决1级",
                        content: "1 级：可免死（免死时蓄力点为 0 则降级）；满足升级条件时升到 2 级。",
                        nocount: true,
                    },
                },
                lv2: {
                    persevereSkill: true,
                    sub: true,
                    charlotte: true,
                    silent: true,
                    mark: true,
                    marktext: "仇决2级",
                    intro: {
                        name: "仇决2级",
                        content: "2 级：视为拥有【催灭】；仍可免死，降级即失去【催灭】。",
                        nocount: true,
                    },
                },
                // ---- ① 降级条件（1级/2级拥有）：即将死亡 → 防止之 ----
                save: {
                    persevereSkill: true,
                    sub: true,
                    trigger: { player: "dieBefore" },
                    forced: true,
                    filter(event, player) {
                        // 0级完全不免死
                        return sgzChoujueLevel(player) >= 1;
                    },
                    async content(event, trigger, player) {
                        //player.logSkill("sgz_choujue");
                        if (trigger && typeof trigger.cancel === "function") trigger.cancel();
                        game.log(player, "发动【仇决】防止死亡");
                        await player.loseMaxHp(1);
                        if (player.hp < player.maxHp) await player.recover(player.maxHp - player.hp);
                        // 需求：先看免死瞬间的蓄力点 —— >0 只清空；=0 才降级
                        const marks = player.countMark(TINGZONG);
                        if (marks > 0) {
                            sgzClearTingzong(player);
                            game.log(player, "【仇决】：移除所有蓄力点（" + marks + " 点），不降级");
                            player.draw(marks);
                            game.playAudio(`../extension/大梦千秋/audio/sgz_wenyang/sgz_choujue${[1,2].randomGet()}.mp3`);
                        } else {
                            const lv = sgzChoujueLevel(player);
                            game.log(player, "【仇决】：蓄力点为0，降级（" + lv + " → " + (lv - 1) + "）");
                            game.playAudio(`../extension/大梦千秋/audio/sgz_wenyang/sgz_choujue3.mp3`);
                            await sgzChoujueSetLevel(player, lv - 1);
                        }
                    },
                },
                // ---- ② 升级条件（0/1/2 都有，但满级后无反应）：杀死角色 或 蓄力点达到7 ----
                upgrade: {
                    persevereSkill: true,
                    sub: true,
                    charlotte: true,
                    silent: true,
                    forced: true,
                    trigger: {
                        global: "dieAfter",
                        player: ["addMark", "phaseBegin"],
                    },
                    filter(event, player) {
                        // 2级满级：什么都不发生（蓄力点也不清空）
                        if (sgzChoujueLevel(player) >= 2) return false;
                        if (event.name === "die") {
                            // 你杀死了一名角色（按引擎 die.source 判定）
                            return event.player !== player && event.source === player;
                        }
                        // 蓄力点达到7
                        return player.countMark(TINGZONG) >= TINGZONG_MAX;
                    },
                    async content(event, trigger, player) {
                        const lv = sgzChoujueLevel(player);
                        const cleared = sgzClearTingzong(player);
                        if( lv == 0) game.playAudio(`../extension/大梦千秋/audio/sgz_wenyang/sgz_choujue4.mp3`);
                        else game.playAudio(`../extension/大梦千秋/audio/sgz_wenyang/sgz_choujue5.mp3`);
                        game.log(player, "【仇决】升级：" + lv + " → " + (lv + 1) + "，蓄力点归零（-" + cleared + "）");
                        player.draw(cleared);
                        await sgzChoujueSetLevel(player, lv + 1);
                    },
                },
            },
        },

        // ====================================================
        //  3b. 催灭（仇决成功时获得）
        // ====================================================
        //  锁定技：你造成伤害后，受伤角色立即把体力上限调整为与体力相同。
        //  「若其因此死亡，不视为你杀死」：loseMaxHp 事件没有 source，die 的来源为空。
        //  （与嘲风【敕令】同构，只是不给自己加上限。）
        sgz_cuimie: {
            persevereSkill: true,
            locked: true,
            forced: true,
            trigger: { source: "damage" },
            priority: -1,
            filter(event, player) {
                // 只对别人；且只有「上限高于体力」时才需要调整
                return !!event.player && event.player !== player && event.player.maxHp > event.player.hp;
            },
            content() {
                "step 0";
                const target = trigger.player;
                const diff = target.maxHp - target.hp;
                event.diff = diff;
                if (diff > 0) {
                    player.logSkill("sgz_cuimie", target);
                    game.log(target, "的体力上限被调整为与体力相同（-" + diff + "）");
                    target.loseMaxHp(diff, true);
                } else {
                    event.finish();
                }
            },
        },
        // ====================================================
        //  4. 纯表现层（实现见 effect/sgz_wenyang.js）
        // ====================================================
        //  ⚠ 两个都是 charlotte 隐藏技能，必须注册进上面的 skills 数组才会 init。
        //    · 霆踪进度条：武将牌右侧的蓝紫雷电充能条（实时显示「霆踪标记数 / 7」）
        //    · 仇决特效  ：**仇决成功**（获得【催灭】）后，给武将牌套上血仇暗影光效
        [SGZ_WY_TINGZONG_UI_SKILL]: tingzongGaugeUI,
        [SGZ_WY_CHOUJUE_UI_SKILL]: choujueUI,
    },
    skillTranslate: {
        sgz_jingyue: "惊跃",
        sgz_jingyue_info:
            "<span style='color:#FF0000;'><strong>蓄力技</strong></span>（0/0），" +
            "①<span style='color:#00FF00;'>蓄力</span>：每回合限7次，若蓄力点未满，你可以将一张红色/黑色手牌当做火【杀】/雷【杀】使用，然后你摸一张牌并回复一点体力。" +
            "<br>②依此法使用的本阶段首张火【杀】无距离限制、伤害+1且不可被响应；依此法使用的雷【杀】无次数限制。" +
            "<br>③每名角色回合开始时，蓄力上限+1且至多为7。" ,
        sgz_tingzong: "霆踪",
        sgz_tingzong_info:
            "锁定技，" +
            "①你的回合开始时，若蓄力点不为0：你弃置所有手牌并倾囊。" +
            "②你与其他角色计算距离时-X；其他角色与你计算距离时+X（X为蓄力点数）。",
        sgz_choujue: "仇决",
        sgz_choujue_info:
            "<span style='color:#FF0000;'><strong>变阶技</strong></span>（初始1级），" +
            "①0级/1级：无效果；2级：你视为拥有技能〖催灭〗。" +
            "<br>②<span style='color:#00FF00;'>升级</span>：当你杀死一名角色或蓄力点达到7时，倾囊并升级。" +
            "<br>③<span style='color:#00FF00;'>降级</span>：当你即将死亡时防止之，你减少一点体力上限并回复体力至体力上限，若此时蓄力点不为0则倾囊；为0则降级；。",
        sgz_cuimie: "催灭",
        sgz_cuimie_info: "锁定技，当你对一名角色造成伤害时，立即将其体力上限调整至与其当前体力值相同。",
    },
    characterTaici: {
        "sgz_jingyue":{order: 1 ,content:"雷骥显威裂天翳，一击穿云破九重！/贪狼晦暗掩日囚，惊起雷槊贯天穹！/武威如斯，势压万钧之力！/千雷磔身，催汝神魂俱灭！"},
        "sgz_tingzong":{order: 2 ,content:"便是十方诸神，亦难护汝周全！/司马贼千骑尚退，尔等便可阻我否！"},
        "sgz_choujue":{order: 3 ,content:"离火从心起，若非焚贼烬魄不足平！/必生啖老贼骨肉，以填吾胸中血海！/我今一心向死，汝等岂欲同往乎？！/怨壑既平，老贼已诛，吾自去背国之名！/扫秽清尘，以还天下泰平！"},
        "die": { content: "命途浮沉如海，何处再问英雄..." },
    },
};
