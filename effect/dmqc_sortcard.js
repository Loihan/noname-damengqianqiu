// ============================================================
//  大梦千秋 · 「整理手牌」按钮的按角色定制排序
// ============================================================
//  需求（点「整理手牌」时按角色改排序）：
//    · 梦曹髦  ：「潜龙」杀 → 最左侧
//    · 梦赵云   ：按**花色**整理，同花色放一起
//    · 梦孙寒华 ：「妙剑」牌 → 最左侧
//    · 梦小乔   ：按「视为」的花色整理，同花色放一起（她靠 mod.suit 让牌"视为"某花色）
//    · 梦吕布   ：「镇猎」杀 → 最左侧
//
//  ⚠⚠⚠ **四条必须记住的引擎事实（每一条都踩过，别再绕回去）**：
//    1) 手牌区的 **DOM 子节点顺序 = 屏幕从左到右**：
//       `ui/index.js:421-422` 按 childNodes 顺序算 `translateX(i * offset1)`（i=0 在最左）。
//       ⇒ 重排只需要「按目标顺序 appendChild 到行尾」，最后 DOM 顺序就是目标顺序。
//    2) **不要用 `player.directgain()` 来重排**：它是逐个插到最前面（`player.js:7426-7428`
//       `insertBefore(card, handcards1.firstChild)`，所以传进去的数组是"从右到左"，最后一张最左），
//       更要命的是它会**按分类重新分行**：
//         `if (get.is.singleHandcard() || lib.config.sort_card(card) > 0) handcards1 else handcards2`
//       而本机默认配置就是 `sort: "type_sort"`（`game/config.js:130`）：
//         basic→2 / chess→1.5（>0，进**前排** handcards1）；trick→-1 / delay→-2 / equip→-3（≤0，进**后排** handcards2）
//       ⇒ **同一个花色会被两行分尸**，"整手按花色排序"交给它就等于白排。
//         这正是「赵云/小乔按花色整理没生效」的真正原因（三个"置左"规则因为标记牌基本同属一类，
//         正好落在同一行里，所以看起来是好的）。
//       ⇒ 本文件的做法：**自己读写 DOM**（`dmqcRowCards` + `appendChild`），按花色排完后再
//         在**花色边界**处才分行，保证同一个花色不会跨行；最后 `ui.updatehl()` 重算位置。
//    3) 重排之后必须手动刷新版式：`ui.updatehx(行)` 只管折叠档位（fold0~3），
//       **真正算 translateX 的是 `ui.updatehl()`**（`ui/index.js:382-505`）。
//    4) `get.suit(card, player)` 的第二个参数不是"谁来看"，而是 **owner**（`get/index.js:3131-3153`：
//       `const owner = player || get.owner(card)`）——传手牌主人是对的；它的返回值已经包含
//       `mod.suit` / `mod.cardsuit`（梦小乔的"视为"花色就是这么体现的）。
// ============================================================

/// ★ 每个角色的整理规则（键 = 武将 id，`name1`/`name2` 都会查，双将也认）
///   · firstTag：带此标记的牌挪到**所在那一行的最左侧**，其余保持引擎已排好的顺序
///   · bySuit  ：整手牌按花色分组（同花色一定在同一行里，不会被两行劈开）
const DMQC_SORT_RULES = {
    // ① 梦曹髦：「潜龙」杀（gaintag 见 character/sgz_caomao.js 的 mod.cardUsable）
    sgz_caomao: { firstTag: "sgz_caomao_shaTag" },
    // ② 梦赵云：按花色
    sgz_zhaoyun: { bySuit: true },
    // ③ 梦孙寒华：「妙剑」牌（gaintag 与 effect/sgz_sunhanhua.js 的 SGZ_MJ_TAG 同值）
    sgz_sunhanhua: { firstTag: "sgz_miaojian_card" },
    // ④ 梦小乔：按「视为」花色（get.suit 会走她的 mod.suit，可能返回 "none"）
    sgz_xiaoqiao: { bySuit: true },
    // ⑤ 梦吕布：「镇猎」杀（既有 gaintag 也有 storage 标记，见 character/sgz_lvbu.js）
    sgz_lvbu: { firstTag: "sgz_zhenlie_sha" },
};

/// ★ 花色顺序（同花色内部再按牌名 → 点数）。小乔的"无色"排在最后。
///   想换顺序（比如把 ♥ 放最左）只改这一行。
const DMQC_SUIT_ORDER = ["spade", "heart", "club", "diamond", "none"];

// ---------------------------------------------------------------- 工具

/// 一张牌是否带某标记。三种牌标记在本包的写法：
/// 曹髦/孙寒华只用 `gaintag`；吕布是 `gaintag` + `card.storage` 双份 ⇒ 两处都认。
export function dmqcCardHasTag(card, tag) {
    if (!card || !tag) return false;
    try {
        if (typeof card.hasGaintag === "function" && card.hasGaintag(tag)) return true;
        if (Array.isArray(card.gaintag) && card.gaintag.includes(tag)) return true;
        if (card.storage && card.storage[tag]) return true;
    } catch (e) {}
    return false;
}

export function dmqcSuitIndex(suit) {
    const i = DMQC_SUIT_ORDER.indexOf(suit);
    return i < 0 ? DMQC_SUIT_ORDER.length : i;
}

/// 取一张牌的**「视为」花色**：`get.suit(card, player)` 会走 mod.suit / mod.cardsuit
/// （梦小乔就是靠 `mod.suit` 读 `card._xqSuit` 把牌"视为"某个花色的）。
function dmqcSuitOf(player, card) {
    try {
        if (typeof get !== "undefined" && get && typeof get.suit === "function") {
            const suit = get.suit(card, player);
            if (suit !== undefined && suit !== null) return suit;
        }
    } catch (e) {}
    return card && card.suit;
}

/// 找出该角色适用的规则（双将：name1 / name2 都查）
export function dmqcSortProfile(player) {
    if (!player) return null;
    for (const key of [player.name, player.name1, player.name2]) {
        if (key && DMQC_SORT_RULES[key]) return DMQC_SORT_RULES[key];
    }
    return null;
}

/// ★ 按花色整理时的**第二优先级**：同花色内部沿用「原来的排序方式」。
///   引擎原本的顺序就编码在 `lib.sort.card(name, name)` 里（`noname/library/index.js:11896-11947`）：
///     基本牌(-1) → 锦囊(0) → 延时锦囊(1) → 装备(1+类型) → 其它(9~10)，
///     同一类里再按牌名比较。
///   ⇒ 所以"花色优先、花色内部按基本/锦囊/…"= 先比花色，再直接交给 `lib.sort.card`，最后比点数。
///   这样每个花色段里都会是：「基本牌… 锦囊… 延时… 装备…」，与引擎默认观感一致。
function dmqcSameSuitCompare(a, b) {
    if (a.name !== b.name) {
        const sa = lib.sort && lib.sort.card ? lib.sort.card(a.name, b.name) : String(a.name).localeCompare(String(b.name));
        if (sa) return sa;
    }
    return (a.number || 0) - (b.number || 0);
}

/**
 * 算出一组牌的**从左到右**顺序（纯函数，不碰 DOM，方便自检）。
 * @param {*} player 手牌主人
 * @param {*} cards  这一组牌（顺序 = 当前屏幕顺序）
 * @param {*} rule   DMQC_SORT_RULES 里的一条
 */
export function dmqcSortHandCards(player, cards, rule) {
    const arr = Array.isArray(cards) ? cards.slice() : [];
    if (!rule || arr.length < 2) return arr;
    if (rule.firstTag) {
        const first = arr.filter(c => dmqcCardHasTag(c, rule.firstTag));
        if (!first.length || first.length === arr.length) return arr; // 没有/全都是 → 不用动
        const rest = arr.filter(c => !dmqcCardHasTag(c, rule.firstTag));
        // filter 本身稳定 ⇒ rest 里保持引擎已经排好的顺序
        return first.concat(rest);
    }
    if (rule.bySuit) {
        // ★ 两级排序：**第一优先级 = 花色**（同花色一定相邻、且不会被两行劈开）；
        //   第二优先级 = 原来的排序方式（基本 → 锦囊 → 延时 → 装备 → 同类型按牌名 → 点数）。
        return arr.sort((a, b) => {
            const sa = dmqcSuitIndex(dmqcSuitOf(player, a));
            const sb = dmqcSuitIndex(dmqcSuitOf(player, b));
            if (sa !== sb) return sa - sb;
            return dmqcSameSuitCompare(a, b);
        });
    }
    return arr;
}

/// 顺序完全一样就不必再动（省掉一次无意义的重排）
function dmqcSameOrder(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

/// 读出一行里真正的卡牌元素（**以 DOM 为准**，不依赖 getCards 的返回顺序）。
/// 跳过正在移除/非卡牌的占位元素。
function dmqcRowCards(rowNode) {
    const out = [];
    if (!rowNode || !rowNode.childNodes) return out;
    const list = Array.from(rowNode.childNodes);
    for (const node of list) {
        if (!node || !node.classList) continue;
        if (!node.classList.contains("card")) continue;
        if (node.classList.contains("removing")) continue;
        out.push(node);
    }
    return out;
}

/// 重排完之后刷新版式：updatehx 管折叠档位，**updatehl 才真正重算 translateX**
function dmqcRefreshHandLayout(rows) {
    try {
        if (typeof ui === "undefined" || !ui) return;
        for (const rowNode of rows || []) {
            if (rowNode && typeof ui.updatehx === "function") ui.updatehx(rowNode);
        }
        if (typeof ui.updatehl === "function") ui.updatehl();
    } catch (e) {}
}

// ---------------------------------------------------------------- 真正动手

/// 标记牌置左：**保持引擎已经分好的行**，只在每行内部把标记牌挪到该行最左
function dmqcResortWithinRows(me, rule, rows) {
    let changed = false;
    for (const rowNode of rows) {
        const cards = dmqcRowCards(rowNode);
        if (cards.length < 2) continue;
        const want = dmqcSortHandCards(me, cards, rule);
        if (dmqcSameOrder(cards, want)) continue;
        for (const card of want) rowNode.appendChild(card); // 顺序 append ⇒ DOM 顺序 = want
        changed = true;
    }
    if (changed) dmqcRefreshHandLayout(rows);
    return changed;
}

/// 按花色整理：**整手牌合并后一起排，并且全部放进前面那一行**（handcards1）。
/// ⚠ 为什么干脆只留一行：引擎默认 `sort: "type_sort"` 会把基本牌放前排、锦囊/延时/装备放后排
///   （`game/config.js:130` + `player.js:7425`），只要存在两行，"同花色放一起"就注定做不到
///   —— 同一个花色会被两行劈成两半。收成一行之后，屏幕上看到的顺序就是排好的顺序。
///   （超长时引擎自己会折叠/横向滚动：`ui.updatehl` 里按 `fold_card` 与容器宽度算间距。）
function dmqcResortBySuit(me, rule, rows) {
    const all = [];
    for (const rowNode of rows) all.push(...dmqcRowCards(rowNode));
    if (all.length < 2) return false;
    const sorted = dmqcSortHandCards(me, all, rule);
    const front = me.node && me.node.handcards1;
    if (!front) return false;
    const back = me.node && me.node.handcards2;
    const alreadyFront = dmqcSameOrder(dmqcRowCards(front), sorted);
    const backEmpty = !back || dmqcRowCards(back).length === 0;
    if (alreadyFront && backEmpty) return false; // 已经就是想要的样子
    for (const card of sorted) front.appendChild(card);
    dmqcRefreshHandLayout([front, back]);
    // 自检：万一 DOM 没按预期落位（引擎改版/被别的扩展插手），留一条线索
    try {
        if (!dmqcSameOrder(dmqcRowCards(front), sorted)) {
            console.warn("[大梦千秋] 整理手牌：按花色重排后 DOM 顺序与预期不符（如仍不对请执行 dmqcSortCardDebug()）");
        }
    } catch (e) {}
    return true;
}

/// 入口：点「整理手牌」后由我们的监听器调用（引擎自己的处理器已经先跑过一遍）
export function dmqcResortHand() {
    try {
        if (typeof game === "undefined" || !game || !game.me) return false;
        if (typeof _status !== "undefined" && _status && _status.video) return false; // 录像不干预
        const me = game.me;
        const rule = dmqcSortProfile(me);
        if (!rule) return false;
        const rows = [me.node && me.node.handcards1, me.node && me.node.handcards2].filter(Boolean);
        if (!rows.length) return false;
        if (rule.bySuit) return dmqcResortBySuit(me, rule, rows);
        return dmqcResortWithinRows(me, rule, rows);
    } catch (e) {
        console.error("[大梦千秋] 整理手牌（本包定制排序）出错，已跳过：", e);
        return false;
    }
}

// ---------------------------------------------------------------- 挂接

/// 给一个 system 按钮补挂我们的处理器（只认「整理手牌」，且只挂一次）
function dmqcAttachSortCard(node, str) {
    if (!node || typeof node.listen !== "function") return false;
    if (typeof str === "string" && str.trim() !== "整理手牌") return false;
    if (node.__dmqcSortCard) return false;
    node.__dmqcSortCard = true;
    // ⚠ 引擎那个 handler 已经先注册过了（它先按默认规则排一遍），所以这里是"它排完我再排"
    node.listen(function () {
        dmqcResortHand();
    });
    return true;
}

/// 挂接：①包一层 `ui.create.system`（以后每次创建按钮都能带上）
///       ②兜底：按钮**已经**建好了就直接挂在现成元素上（万一 UI 早于扩展加载）
export function dmqcMountSortCard() {
    try {
        if (typeof ui === "undefined" || !ui || !ui.create) return false;
        let done = false;

        if (typeof ui.create.system === "function") {
            if (ui.create.system.__dmqcSortCardWrapped) {
                done = true;
            } else {
                const origin = ui.create.system;
                const wrapped = function (str, func, right, before) {
                    const node = origin.apply(this, arguments);
                    try {
                        dmqcAttachSortCard(node, str);
                    } catch (e) {
                        console.error("[大梦千秋] 挂接整理手牌按钮失败：", e);
                    }
                    return node;
                };
                wrapped.__dmqcSortCardWrapped = true;
                ui.create.system = wrapped;
                done = true;
            }
        }

        if (dmqcAttachSortCard(ui.sortCard, "整理手牌")) done = true;

        if (done && !dmqcMountSortCard.__logged) {
            dmqcMountSortCard.__logged = true;
            console.log("[大梦千秋] 已接管「整理手牌」：本包武将按各自规则重排（曹髦/孙寒华/吕布的标记牌置左；赵云/小乔整手按花色分组）");
        }
        return done;
    } catch (e) {
        console.error("[大梦千秋] 挂接整理手牌失败：", e);
        return false;
    }
}

// ============================================================
//  十周年UI 的「美化版整理手牌」按钮
// ============================================================
//  ⚠ 屏幕上其实有**两个**「整理手牌」：
//    1) 无名杀本体那个（`ui.create.system("整理手牌", ...)` 建的 = `ui.sortCard`）—— 已由上面接管；
//    2) **十周年UI 自己造的美化按钮**（`extension/十周年UI/shoushaUI/lbtn/main2.js:117` /
//       `main3.js:75` / `main5.js:134`，分别用 `zhengli.png` / `zhenglix.png` / `zhenglihs.png`
//       / `new_zhengli.png`，都是 `<img>` + 自己的 `onclick`），**完全不经过 `ui.create.system`**，
//       所以上面那套包装抓不到它 —— 这就是"点美化按钮没生效"的原因。
//    做法：把它的 `onclick` 包一层（**先跑它自己的排序，再按本包规则排**），
//    并用 MutationObserver 盯着 `document.body`（它是 appendChild 到 body 的，晚出现也能挂上）。
const DMQC_FOREIGN_SORT_SELECTOR = 'img[src*="zhengli"]';

/// 包一层某个"外来"整理按钮的 onclick（幂等）。导出是为了自检能直接测。
export function dmqcHookForeignSortButton(btn) {
    if (!btn || btn.__dmqcSortHooked) return false;
    const tag = String((btn.tagName || "")).toUpperCase();
    const src = String((btn.getAttribute && btn.getAttribute("src")) || btn.src || "");
    if (tag !== "IMG" || !/zhengli/i.test(src)) return false;
    btn.__dmqcSortHooked = true;
    const origin = btn.onclick;
    btn.__dmqcSortOrigin = typeof origin === "function" ? origin : null;
    btn.onclick = function () {
        let result;
        try {
            if (typeof btn.__dmqcSortOrigin === "function") result = btn.__dmqcSortOrigin.apply(this, arguments);
        } catch (e) {
            console.error("[大梦千秋] 十周年UI 的整理手牌处理器报错（继续执行本包排序）：", e);
        }
        // 它排完之后再按本包规则排一遍 —— 与本体那个按钮的最终效果一致
        try {
            dmqcResortHand();
        } catch (e) {}
        return result;
    };
    dmqcHookForeignSortButton.__count = (dmqcHookForeignSortButton.__count || 0) + 1;
    console.log("[大梦千秋] 已接管十周年UI 的美化「整理手牌」按钮（共 " + dmqcHookForeignSortButton.__count + " 个）");
    return true;
}

export function dmqcScanForeignSortButtons() {
    let n = 0;
    try {
        if (typeof document === "undefined" || !document.querySelectorAll) return 0;
        for (const node of document.querySelectorAll(DMQC_FOREIGN_SORT_SELECTOR)) {
            if (dmqcHookForeignSortButton(node)) n++;
        }
    } catch (e) {}
    return n;
}

export function dmqcWatchForeignSortButtons() {
    try {
        dmqcScanForeignSortButtons();
        if (dmqcWatchForeignSortButtons.__observer) return true;
        if (typeof MutationObserver !== "function" || typeof document === "undefined" || !document.body) return false;
        const observer = new MutationObserver(function (list) {
            for (const mutation of list) {
                for (const node of Array.from(mutation.addedNodes || [])) {
                    if (!node) continue;
                    if (dmqcHookForeignSortButton(node)) continue;
                    try {
                        if (node.querySelectorAll) {
                            for (const sub of node.querySelectorAll(DMQC_FOREIGN_SORT_SELECTOR)) dmqcHookForeignSortButton(sub);
                        }
                    } catch (e) {}
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        dmqcWatchForeignSortButtons.__observer = observer;
        return true;
    } catch (e) {
        return false;
    }
}

// ============================================================
//  快捷键「S」= 整理手牌
// ============================================================
//  仿本体 `window.onkeydown`（noname/init/index.js:1216-1305）：那里 **A = 托管**、W = 不询问无懈、空格 = 暂停，
//  而**单独按 S 没有任何人用**（只有 Ctrl+S 被吃掉）⇒ S 可以安全当作"整理手牌"。
//  实现上直接 `ui.sortCard.click()`：等于点一次本体那个按钮（引擎先按默认规则排，
//  我们挂在它上面的监听器再按本包规则排），比自己再写一遍排序可靠得多。
//  导出的 `dmqcSortCardHotkey(e)` 就是为了自检能拿假事件直接调。
export function dmqcSortCardHotkey(e) {
    try {
        if (!e) return false;
        if (e.ctrlKey || e.metaKey || e.altKey) return false; // 别抢 Ctrl+S 等组合键
        if (e.repeat) return false; // 长按不重复触发
        const key = e.key;
        if (!(key === "s" || key === "S" || e.keyCode === 83 || e.code === "KeyS")) return false;
        const target = e.target;
        if (target) {
            const tag = String(target.tagName || "").toUpperCase();
            if (target.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return false;
        }
        if (typeof ui === "undefined" || !ui) return false;
        // 只在"游戏进行中"生效（菜单打开时不抢键）——与本体热键同一个判据
        if (ui.menuContainer && !ui.menuContainer.classList.contains("hidden")) return false;
        if (ui.sortCard && typeof ui.sortCard.click === "function") {
            ui.sortCard.click();
            return true;
        }
        // 兜底：本体按钮还没建出来时，至少把本包规则应用上
        return dmqcResortHand();
    } catch (err) {
        console.error("[大梦千秋] 快捷键整理手牌出错：", err);
        return false;
    }
}

export function dmqcBindSortCardHotkey() {
    try {
        if (typeof document === "undefined" || !document.addEventListener) return false;
        if (dmqcBindSortCardHotkey.__bound) return true;
        dmqcBindSortCardHotkey.__bound = true;
        document.addEventListener("keydown", dmqcSortCardHotkey, false);
        console.log("[大梦千秋] 已绑定快捷键：按「S」= 整理手牌（与游戏自带 A=托管 同一套路）");
        return true;
    } catch (e) {
        return false;
    }
}

/// 一次性把所有挂载做完（供自检调用）
export function dmqcMountAll() {
    const a = dmqcMountSortCard();
    const b = dmqcBindSortCardHotkey();
    const c = dmqcWatchForeignSortButtons();
    return a && b && c;
}

// 自己尝试挂载；ui.create / document.body 还没就绪就轮询一会儿（扩展 precontent 阶段可能早于 UI 建立）
if (!dmqcMountAll()) {
    let tries = 0;
    const timer = setInterval(function () {
        tries++;
        dmqcScanForeignSortButtons(); // 观察器还没就绪时也顺手补扫
        if (dmqcMountAll() || tries > 60) clearInterval(timer);
    }, 200);
}

// ---------------------------------------------------------------- 控制台自检
/// `dmqcSortCardDebug()`：把"当前手牌 / 目标顺序 / 每行实际顺序"都打出来
try {
    window.dmqcSortCardDebug = function (player) {
        const me = player || (typeof game !== "undefined" && game ? game.me : null);
        const out = {
            "①是否已接管本体整理手牌": !!(typeof ui !== "undefined" && ui && ui.create && ui.create.system && ui.create.system.__dmqcSortCardWrapped),
            "②快捷键 S 是否已绑定": !!dmqcBindSortCardHotkey.__bound,
            "③已接管的美化按钮数": dmqcHookForeignSortButton.__count || 0,
            "④规则表": Object.keys(DMQC_SORT_RULES).join(" / "),
            "⑤花色顺序": DMQC_SUIT_ORDER.join(" → "),
            "⑥当前角色": me ? [me.name, me.name1, me.name2].filter(Boolean).join(",") : "(无)",
        };
        try {
            const rule = dmqcSortProfile(me);
            out["⑦命中规则"] = rule ? JSON.stringify(rule) : "(不适用 → 保持引擎默认排序)";
            if (me && rule) {
                const rows = [me.node && me.node.handcards1, me.node && me.node.handcards2].filter(Boolean);
                const show = card => {
                    const suit = dmqcSuitOf(me, card);
                    const num = card.number === undefined ? "" : card.number;
                    return (get.translation ? get.translation(card) : card.name) + "(" + (suit || "?") + num + ")";
                };
                let idx = 0;
                for (const rowNode of rows) {
                    idx++;
                    out["⑧第" + idx + "行 实际（左→右）"] = dmqcRowCards(rowNode).map(show).join(" ");
                }
                const all = [];
                for (const rowNode of rows) all.push(...dmqcRowCards(rowNode));
                const sorted = dmqcSortHandCards(me, all, rule);
                out["⑨整理后（从左到右）"] = sorted.map(show).join(" ");
                out["⑩引擎分行规则"] = "sort=" + (typeof lib !== "undefined" && lib.config ? lib.config.sort : "?") + "（basic 进前排 / trick·delay·equip 进后排；按花色的角色会被收进前排一行）";
            }
        } catch (e) {
            out["读取失败"] = String(e);
        }
        console.log("[大梦千秋] 整理手牌自检：", out);
        return out;
    };
} catch (e) {}
