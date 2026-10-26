// ============================================================
//  自检：整理手牌定制排序（effect/dmqc_sortcard.js）
//  跑法：node extension/大梦千秋/__dytest/check_sortcard.mjs
//
//  这里要锁死三件事：
//   1) **顺序方向**：手牌区 DOM 子节点顺序 = 屏幕从左到右（ui/index.js:421-422 按 childNodes 算 translateX），
//      而 directgain 是逐个插到最前面（player.js:7426-7428，传进去的数组是从右到左）。
//      ⇒ 本模块改用「按目标顺序 appendChild」直接排 DOM，方向天然正确；脚本用一个假手牌区真跑一遍验证。
//   2) **不能交给 directgain 分行**：本机默认 `sort: "type_sort"`（game/config.js:130）会把基本牌放前排、
//      锦囊/延时/装备放后排 ⇒ 同一个花色会被两行分尸（这就是"赵云/小乔按花色没生效"的真正原因）。
//      ⇒ 按花色整理时会自己安排行，且**只在花色边界处断开**。脚本专门断言"没有花色跨行"。
//   3) 两个规则的语义：置左 = 所在行最左；按花色 = 整手按花色分组。
// ============================================================
import fs from "node:fs";

// ---------------------------------------------------------------- 最小假件
const allEls = [];
class El {
    constructor(tag) {
        this.tagName = tag || "div";
        this.children = [];
        this.parentNode = null;
        this._classes = new Set();
        this.style = {};
        this.attrs = {};
        this.id = "";
        allEls.push(this);
    }
    set className(v) {
        this._classes = new Set(String(v).split(/\s+/).filter(Boolean));
    }
    get className() {
        return [...this._classes].join(" ");
    }
    get classList() {
        const s = this._classes;
        return {
            add: (...c) => c.forEach(x => s.add(x)),
            remove: (...c) => c.forEach(x => s.delete(x)),
            contains: c => s.has(c),
            toggle: (c, on) => (on ? s.add(c) : s.delete(c)),
        };
    }
    setAttribute(k, v) {
        this.attrs[k] = String(v);
    }
    getAttribute(k) {
        return this.attrs[k];
    }
    appendChild(c) {
        // 真 DOM 语义：已存在的子节点会被"移动"到末尾
        if (c.parentNode && c.parentNode !== this) {
            const i = c.parentNode.children.indexOf(c);
            if (i >= 0) c.parentNode.children.splice(i, 1);
        } else if (c.parentNode === this) {
            const i = this.children.indexOf(c);
            if (i >= 0) this.children.splice(i, 1);
        }
        c.parentNode = this;
        this.children.push(c);
        return c;
    }
    insertBefore(c, before) {
        if (c.parentNode) {
            const j = c.parentNode.children.indexOf(c);
            if (j >= 0) c.parentNode.children.splice(j, 1);
        }
        c.parentNode = this;
        const i = this.children.indexOf(before);
        if (i < 0) this.children.push(c);
        else this.children.splice(i, 0, c);
        return c;
    }
    remove() {
        if (this.parentNode) {
            const i = this.parentNode.children.indexOf(this);
            if (i >= 0) this.parentNode.children.splice(i, 1);
        }
        this.parentNode = null;
    }
    get childNodes() {
        return this.children.slice();
    }
    get childElementCount() {
        return this.children.length;
    }
}

globalThis.document = {
    head: new El("head"),
    body: new El("body"),
    createElement: t => new El(t),
    createElementNS: (ns, t) => new El(t),
    getElementById: id => allEls.find(e => e.id === id) || null,
    querySelectorAll: () => [],
    querySelector: () => null,
};
globalThis.window = { addEventListener() {} };
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};
globalThis._status = {};
globalThis.lib = {
    // ⚠ 忠实模仿引擎的 lib.sort.card（noname/library/index.js:11896-11947）：
    //   先按类型权重（基本 -1 / 锦囊 0 / 延时 1 / 装备 8.5 / 其它 9），同类型再比牌名。
    //   现实里"原来的排序方式"就是这个，所以同花色内部必须是 基本→锦囊→延时→装备。
    sort: {
        card: (a, b) => {
            const w = name => {
                const t = lib.card[name] ? lib.card[name].type : undefined;
                if (t === "basic") return -1;
                if (t === "trick") return 0;
                if (t === "delay") return 1;
                if (t === "equip") return 8.5;
                return 9;
            };
            const d = w(a) - w(b);
            if (d) return d;
            return a > b ? 1 : -1;
        },
    },
    // 本机默认就是 type_sort（game/config.js:130）；这里只需要一个"会分行"的假件
    config: { sort: "type_sort", fold_card: true },
    card: {
        sha: { type: "basic" },
        shan: { type: "basic" },
        tao: { type: "basic" },
        wuxie: { type: "trick" },
        wuzhong: { type: "trick" },
        lebu: { type: "delay" },
        qinggang: { type: "equip" },
    },
};
// "视为"花色：小乔用 mod.suit 把牌视为某花色，get.suit 会体现出来
globalThis.get = {
    suit: (card, player) => (card && card.viewSuit) || (card && card.suit),
    translation: card => (card ? card.label : ""),
    type: name => (lib.card[name] ? lib.card[name].type : undefined),
};
// 假 ui：只记调用，用来断言"重排后确实刷新了版式"
let updatehlCalls = 0;
let updatehxCalls = 0;
globalThis.ui = {
    special: new El("special"),
    updatehl: () => updatehlCalls++,
    updatehx: () => updatehxCalls++,
};

let pass = 0;
const checks = [];
function ok(name, cond, extra) {
    checks.push({ name, cond: !!cond, extra });
    if (cond) pass++;
}

const EXT = new URL("../", import.meta.url);
const sortSrc = fs.readFileSync(new URL("effect/dmqc_sortcard.js", EXT), "utf8");
const mod = await import(new URL("effect/dmqc_sortcard.js", EXT).href);

// ---------------------------------------------------------------- 1. 规则表
ok("五个角色的规则都在表里", ["sgz_caomao", "sgz_zhaoyun", "sgz_sunhanhua", "sgz_xiaoqiao", "sgz_lvbu"].every(k => new RegExp(k + ":").test(sortSrc)));
ok("曹髦 = 潜龙杀置左（sgz_caomao_shaTag）", /sgz_caomao: \{ firstTag: "sgz_caomao_shaTag" \}/.test(sortSrc));
ok("孙寒华 = 妙剑牌置左（sgz_miaojian_card）", /sgz_sunhanhua: \{ firstTag: "sgz_miaojian_card" \}/.test(sortSrc));
ok("吕布 = 镇猎杀置左（sgz_zhenlie_sha）", /sgz_lvbu: \{ firstTag: "sgz_zhenlie_sha" \}/.test(sortSrc));
ok("赵云 = 按花色", /sgz_zhaoyun: \{ bySuit: true \}/.test(sortSrc));
ok("小乔 = 按花色（走视为花色）", /sgz_xiaoqiao: \{ bySuit: true \}/.test(sortSrc));
ok("小乔的「无色」也在花色顺序里（她 mod.suit 会返回 none）", mod.dmqcSuitIndex("none") === 4);
ok("未知花色排在最后", mod.dmqcSuitIndex("unknown_suit") >= mod.dmqcSuitIndex("none"));

// ---------------------------------------------------------------- 2. 牌标记识别
ok("gaintag 标记能认出来", mod.dmqcCardHasTag({ hasGaintag: t => t === "sgz_zhenlie_sha" }, "sgz_zhenlie_sha"));
ok("裸 gaintag 数组也能认出来", mod.dmqcCardHasTag({ gaintag: ["sgz_miaojian_card"] }, "sgz_miaojian_card"));
ok("吕布那种 storage 标记也能认出来", mod.dmqcCardHasTag({ storage: { sgz_zhenlie_sha: true } }, "sgz_zhenlie_sha"));
ok("没标记的牌不会被误认", !mod.dmqcCardHasTag({ hasGaintag: () => false }, "sgz_zhenlie_sha"));

// ---------------------------------------------------------------- 3. 角色 → 规则
ok("双将时 name2 也能命中规则", !!mod.dmqcSortProfile({ name: "x", name1: "x", name2: "sgz_xiaoqiao" }));
ok("不是本包角色 → 没有规则（保持引擎默认）", mod.dmqcSortProfile({ name: "caocao", name1: "caocao" }) === null);

// ---------------------------------------------------------------- 4. 「置左」规则（纯函数）
function c(label, suit, number, tag) {
    return { label, name: label, suit, number, viewSuit: undefined, hasGaintag: t => !!tag && t === tag };
}
const caomaoHand = [c("sha", "spade", 1), c("shan", "heart", 2, "sgz_caomao_shaTag"), c("tao", "club", 3), c("sha", "diamond", 4, "sgz_caomao_shaTag")];
const caomaoRule = mod.dmqcSortProfile({ name: "sgz_caomao" });
const caomaoOut = mod.dmqcSortHandCards({}, caomaoHand, caomaoRule);
ok("曹髦：两张潜龙杀整体挪到最左（顺序不乱）", caomaoOut[0] === caomaoHand[1] && caomaoOut[1] === caomaoHand[3], caomaoOut.map(x => x.label + x.number).join(" "));
ok("曹髦：其余牌保持引擎已排好的相对顺序", caomaoOut[2] === caomaoHand[0] && caomaoOut[3] === caomaoHand[2], caomaoOut.map(x => x.label + x.number).join(" "));
ok("曹髦：没有潜龙杀时原样返回（不做无意义重排）", (() => {
    const hand = [c("sha", "spade", 1), c("tao", "club", 3)];
    const out = mod.dmqcSortHandCards({}, hand, caomaoRule);
    return out.length === 2 && out[0] === hand[0] && out[1] === hand[1];
})());

// ---------------------------------------------------------------- 5. 按花色（纯函数）
const suitHand = [c("sha", "diamond", 1), c("shan", "spade", 2), c("tao", "heart", 3), c("sha", "spade", 4), c("wuxie", "club", 5), c("sha", "spade", 1)];
const zhaoyunRule = mod.dmqcSortProfile({ name: "sgz_zhaoyun" });
const suitOut = mod.dmqcSortHandCards({}, suitHand, zhaoyunRule);
const suits = suitOut.map(x => x.suit);
ok("赵云：按花色分组（同花色相邻）", (() => {
    const idx = suits.map(s => mod.dmqcSuitIndex(s));
    for (let i = 1; i < idx.length; i++) if (idx[i] < idx[i - 1]) return false;
    return true;
})(), suits.join(" "));
const spades = suitOut.filter(x => x.suit === "spade");
ok("赵云：同花色同类型内再按点数排序", spades.length === 3 && spades[0].number < spades[1].number, spades.map(x => x.name + x.number).join(" "));

// ★ 用户明确的补充规格：花色优先，**同花色内部仍按"原来的排序方式"= 基本 → 锦囊 → 延时 → 装备**
const mixed = [
    c("qinggang", "spade", 1), // 装备
    c("wuxie", "spade", 2), // 锦囊
    c("sha", "spade", 3), // 基本
    c("lebu", "spade", 4), // 延时锦囊
    c("tao", "heart", 5), // 基本（红桃）
    c("wuzhong", "heart", 6), // 锦囊（红桃）
];
const mixedOut = mod.dmqcSortHandCards({}, mixed, zhaoyunRule);
const weight = name => {
    const t = lib.card[name].type;
    return t === "basic" ? -1 : t === "trick" ? 0 : t === "delay" ? 1 : t === "equip" ? 8.5 : 9;
};
ok("★ 花色优先：黑桃整段一定排在红桃前面（哪怕黑桃是装备、红桃是基本牌）", mixedOut.findIndex(x => x.suit === "heart") > mixedOut.map(x => x.suit).lastIndexOf("spade"), mixedOut.map(x => x.suit + x.name).join(" "));
ok("★ 同花色内部按原来的排序方式：基本 → 锦囊 → 延时 → 装备", (() => {
    for (const suit of ["spade", "heart"]) {
        const seg = mixedOut.filter(x => x.suit === suit).map(x => weight(x.name));
        for (let i = 1; i < seg.length; i++) if (seg[i] < seg[i - 1]) return false;
    }
    return true;
})(), mixedOut.map(x => x.suit + "/" + x.name).join(" "));
ok("★ 黑桃段内部实际顺序 = 杀 → 无懈 → 乐 → 青釭剑", (() => {
    const seg = mixedOut.filter(x => x.suit === "spade").map(x => x.name);
    return seg.join(",") === "sha,wuxie,lebu,qinggang";
})(), mixedOut.filter(x => x.suit === "spade").map(x => x.name).join(","));
// 小乔：按"视为"花色（viewSuit）
const xqHand = [c("sha", "spade", 1), c("shan", "heart", 2), c("tao", "club", 3)];
xqHand[0].viewSuit = "heart";
xqHand[1].viewSuit = "spade";
const xqRule = mod.dmqcSortProfile({ name: "sgz_xiaoqiao" });
const xqOut = mod.dmqcSortHandCards({}, xqHand, xqRule);
ok("小乔：按「视为」花色排序（不是原始 suit）", xqOut[0] === xqHand[1] && xqOut[1] === xqHand[0] && xqOut[2] === xqHand[2], xqOut.map(x => (x.viewSuit || x.suit) + x.number).join(" "));
ok("小乔：「视为」无色的一张排最后", (() => {
    const hand = [c("sha", "spade", 1), c("tao", "club", 2)];
    hand[0].viewSuit = "none";
    const out = mod.dmqcSortHandCards({}, hand, xqRule);
    return out[0] === hand[1] && out[1] === hand[0];
})());

// ---------------------------------------------------------------- 6. 真跑：两行手牌区
const row1 = new El("handcards1");
const row2 = new El("handcards2");
for (const card of []) card.classList.add("card");

function mkCardEl(label, suit, number, tag, rowNode) {
    const el = new El("div");
    el.classList.add("card");
    el.label = label;
    el.name = label;
    el.suit = suit;
    el.number = number;
    el.hasGaintag = t => !!tag && t === tag;
    if (rowNode) rowNode.appendChild(el);
    return el;
}
function resetRows() {
    row1.children = [];
    row2.children = [];
}
function suitsOf(node) {
    return Array.from(node.childNodes).map(x => x.suit);
}
function namesOf(node) {
    return Array.from(node.childNodes).map(x => x.label + x.number);
}
/// 花色索引序列是否单调不减（= 已按花色分组）
function grouped(node, mod) {
    const idx = suitsOf(node).map(s => mod.dmqcSuitIndex(s));
    for (let i = 1; i < idx.length; i++) if (idx[i] < idx[i - 1]) return false;
    return true;
}

// 造一个"引擎默认分行"的手牌：基本牌在前排、锦囊/装备在后排（默认 type_sort 就是这样）
resetRows();
const frontCards = [mkCardEl("sha", "diamond", 5, null, row1), mkCardEl("sha", "spade", 3, null, row1), mkCardEl("shan", "heart", 7, null, row1)];
const backCards = [mkCardEl("wuxie", "spade", 9, null, row2), mkCardEl("wuxie", "club", 4, null, row2), mkCardEl("qinggang", "heart", 2, null, row2)];
const me = {
    name: "sgz_zhaoyun",
    name1: "sgz_zhaoyun",
    node: { handcards1: row1, handcards2: row2 },
};
globalThis.game = { me };
updatehlCalls = 0;
const changed = mod.dmqcResortHand();
ok("赵云：真的重排了（返回 true）", changed === true);
ok("赵云：重排后刷新了版式（updatehl 被调用）", updatehlCalls > 0);
ok("★ 赵云：没有任何花色跨行（真根因就是这里）", (() => {
    const up = suitsOf(row1),
        down = suitsOf(row2);
    return !up.some(s => down.includes(s));
})(), "前排 " + suitsOf(row1).join(",") + " | 后排 " + suitsOf(row2).join(","));
ok("赵云：前排内部按花色分组", grouped(row1, mod), suitsOf(row1).join(","));
ok("赵云：后排内部按花色分组", grouped(row2, mod), suitsOf(row2).join(","));
ok("赵云：整手牌张数没丢（只是换了行/顺序）", row1.childElementCount + row2.childElementCount === frontCards.length + backCards.length, row1.childElementCount + row2.childElementCount);

// 只有一行时：整行按花色排
resetRows();
const single = [mkCardEl("wuxie", "club", 2, null, row1), mkCardEl("sha", "spade", 3, null, row1), mkCardEl("tao", "heart", 4, null, row1)];
updatehlCalls = 0;
mod.dmqcResortHand();
ok("赵云：单行时整行按花色排（♠♥♣）", suitsOf(row1).join(",") === "spade,heart,club", suitsOf(row1).join(","));
ok("赵云：单行时不会把牌丢到空行去", row2.childElementCount === 0);
ok("赵云：已经排好时不重复动手（返回 false）", mod.dmqcResortHand() === false);

// ★ 关键：按花色整理会把两行**收成一行**（否则同一花色注定被两行劈开）
resetRows();
mkCardEl("sha", "spade", 3, null, row1);
mkCardEl("wuxie", "spade", 9, null, row2);
mkCardEl("tao", "heart", 4, null, row1);
me.name = me.name1 = "sgz_zhaoyun";
mod.dmqcResortHand();
ok("★ 赵云：两行的牌会被收进同一行（同一花色才能放一起）", row2.childElementCount === 0 && row1.childElementCount === 3, "前 " + row1.childElementCount + " / 后 " + row2.childElementCount);
ok("赵云：收成一行后仍然是按花色排的", suitsOf(row1).join(",") === "spade,spade,heart", suitsOf(row1).join(","));

// 置左规则：只在行内挪（保持引擎分行）
resetRows();
const a1 = mkCardEl("sha", "spade", 1, null, row1);
const a2 = mkCardEl("shan", "heart", 2, "sgz_caomao_shaTag", row1);
const a3 = mkCardEl("tao", "club", 3, null, row1);
const b1 = mkCardEl("wuxie", "spade", 4, "sgz_caomao_shaTag", row2);
const b2 = mkCardEl("wuxie", "club", 5, null, row2);
me.name = me.name1 = "sgz_caomao";
updatehlCalls = 0;
mod.dmqcResortHand();
ok("曹髦：潜龙杀挪到所在行最左（不分行、不搬家）", row1.childNodes[0] === a2 && row1.childElementCount === 3, namesOf(row1).join(" "));
ok("曹髦：后排同样是标记牌在左", row2.childNodes[0] === b1 && row2.childElementCount === 2, namesOf(row2).join(" "));
ok("曹髦：非标记牌保持引擎顺序", row1.childNodes[1] === a1 && row1.childNodes[2] === a3, namesOf(row1).join(" "));
ok("曹髦：已经排好时不再重复动手（返回 false）", mod.dmqcResortHand() === false);

// 非本包角色 / 单张手牌：不动
me.name = me.name1 = "caocao";
ok("非本包角色点了整理也不动（返回 false）", mod.dmqcResortHand() === false);
me.name = me.name1 = "sgz_caomao";
resetRows();
mkCardEl("sha", "spade", 1, null, row1);
ok("只有一张牌时不动（返回 false）", mod.dmqcResortHand() === false);

// ---------------------------------------------------------------- 7. 关键实现约束（防止有人改回 directgain 分行）
// 注释里会"提到"directgain（用来记录这个坑），先剥掉纯注释行再查代码
const sortCode = sortSrc
    .split("\n")
    .filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join("\n");
ok("代码里不再用 directgain 重排（否则又会被按类型分行）", !/\.directgain\(/.test(sortCode));
ok("代码用 appendChild 直接排 DOM", /appendChild\(card\)/.test(sortCode));
ok("源码说明了 updatehx 只改折叠档位、updatehl 才算位置", /updatehl/.test(sortCode) && /折叠档位/.test(sortSrc));
ok("源码记录了默认 sort=type_sort 会按类型分行这个坑", /type_sort/.test(sortSrc) && /game\/config\.js:130/.test(sortSrc));
ok("按花色的角色会把整手收进一行（不留下会被劈开的后排）", /收进前排一行|收成一行|一行/.test(sortSrc));

// ---------------------------------------------------------------- 8. 挂载
ok("模块里有包装 ui.create.system 的挂载函数", typeof mod.dmqcMountSortCard === "function");
ok("挂载只认「整理手牌」这个按钮名", /str\.trim\(\) !== "整理手牌"\) return false/.test(sortSrc));
const engineListeners = [];
const fakeNode = {
    listeners: [],
    listen(fn) {
        this.listeners.push(fn);
        return this;
    },
};
const fakeCreate = {
    system(str, func) {
        if (typeof func === "function") {
            engineListeners.push(func);
            fakeNode.listen(func);
        }
        return fakeNode;
    },
};
globalThis.ui = Object.assign(globalThis.ui || {}, { create: fakeCreate, updatehl: () => updatehlCalls++, updatehx: () => updatehxCalls++ });
mod.dmqcMountSortCard();
fakeCreate.system("整理手牌", function () {});
const ours = () => fakeNode.listeners.length - engineListeners.length;
ok("挂载后：按钮上多了一条我们的 click 监听", ours() === 1 && fakeNode.__dmqcSortCard === true, ours());
ok("挂载是幂等的（重复挂载不会重复监听）", (() => {
    mod.dmqcMountSortCard();
    fakeCreate.system("整理手牌", function () {});
    return ours() === 1;
})(), ours());
ok("控制台自检入口存在", /dmqcSortCardDebug/.test(sortSrc));

// ---------------------------------------------------------------- 9. 十周年UI 的美化按钮
// 它不走 ui.create.system / ui.sortCard（自己造 <img> + onclick），所以必须单独接管；
// 4 个变体图片是 zhengli.png / zhenglix.png / zhenglihs.png / new_zhengli.png，都含 "zhengli"。
function mkForeignBtn(src, handler) {
    const img = new El("img");
    img.tagName = "IMG";
    img.setAttribute("src", src);
    img.src = src; // 真 DOM 里 img.src 是绝对地址，这里照样给一份
    img.onclick = handler;
    return img;
}
let order = [];
const foreign = mkForeignBtn("extension/十周年UI/shoushaUI/lbtn/images/uibutton/new_zhengli.png", function () {
    order.push("十周年UI自己排");
});
ok("美化按钮能被识别并接管", mod.dmqcHookForeignSortButton(foreign) === true);
ok("接管是幂等的", mod.dmqcHookForeignSortButton(foreign) === false);
// 造一个"按花色"的手牌，点美化按钮后应当：先跑它的处理器，再被本包重排
resetRows();
row1.children = [];
row2.children = [];
row1.parentNode = new El("container1");
row2.parentNode = new El("container2");
mkCardEl("wuxie", "club", 2, null, row1);
mkCardEl("sha", "spade", 3, null, row1);
mkCardEl("tao", "heart", 4, null, row1);
me.name = me.name1 = "sgz_zhaoyun";
order = [];
foreign.onclick();
ok("点美化按钮时：它的处理器先跑", order[0] === "十周年UI自己排", order.join(","));
ok("★ 点美化按钮后：本包排序也生效了（♠♥♣）", suitsOf(row1).join(",") === "spade,heart,club", suitsOf(row1).join(","));
ok("就算它自己的处理器抛错，本包排序照样执行", (() => {
    resetRows();
    mkCardEl("wuxie", "club", 2, null, row1);
    mkCardEl("sha", "spade", 3, null, row1);
    const bad = mkForeignBtn("extension/十周年UI/x/new_zhengli.png", function () {
        throw new Error("模拟十周年UI报错");
    });
    mod.dmqcHookForeignSortButton(bad);
    bad.onclick();
    return suitsOf(row1).join(",") === "spade,club";
})(), suitsOf(row1).join(","));
ok("不相关的图片不会被误接管", mod.dmqcHookForeignSortButton(mkForeignBtn("extension/十周年UI/x/menu.png", () => {})) === false);
ok("选择器覆盖四种美化按钮文件名", /zhengli/i.test("zhengli.png") && /zhengli/i.test("zhenglix.png") && /zhengli/i.test("zhenglihs.png") && /zhengli/i.test("new_zhengli.png") && /img\[src\*="zhengli"\]/.test(sortSrc));
ok("用 MutationObserver 盯 body，晚出现的按钮也能挂上", /MutationObserver/.test(sortSrc) && /observe\(document\.body/.test(sortSrc));

// ---------------------------------------------------------------- 10. 快捷键 S
ok("导出了快捷键处理器与绑定函数", typeof mod.dmqcSortCardHotkey === "function" && typeof mod.dmqcBindSortCardHotkey === "function");
// 用假事件测：只有"单独按 S、游戏进行中、不在输入框里"才触发
let clicked = 0;
globalThis.ui = Object.assign(globalThis.ui || {}, {
    sortCard: {
        click() {
            clicked++;
        },
    },
    menuContainer: { classList: { contains: c => c === "hidden" } }, // hidden ⇒ 游戏进行中
});
function keyEvent(extra) {
    return Object.assign({ key: "s", keyCode: 83, ctrlKey: false, metaKey: false, altKey: false, repeat: false, target: { tagName: "BODY" } }, extra || {});
}
clicked = 0;
ok("单独按 S（游戏进行中）→ 触发整理手牌", mod.dmqcSortCardHotkey(keyEvent()) === true && clicked === 1, clicked);
ok("大写 S 也行", mod.dmqcSortCardHotkey(keyEvent({ key: "S", keyCode: 83 })) === true && clicked === 2, clicked);
ok("按别的键不触发", mod.dmqcSortCardHotkey(keyEvent({ key: "a", keyCode: 65 })) === false && clicked === 2);
ok("Ctrl+S 不抢（引擎自己要用）", mod.dmqcSortCardHotkey(keyEvent({ ctrlKey: true })) === false && clicked === 2);
ok("长按重复不重复触发", mod.dmqcSortCardHotkey(keyEvent({ repeat: true })) === false && clicked === 2);
ok("在输入框里按 S 不抢", mod.dmqcSortCardHotkey(keyEvent({ target: { tagName: "INPUT" } })) === false && clicked === 2);
ok("菜单打开时不抢键", (() => {
    const bak = ui.menuContainer;
    ui.menuContainer = { classList: { contains: () => false } }; // 不 hidden = 菜单开着
    const r = mod.dmqcSortCardHotkey(keyEvent());
    ui.menuContainer = bak;
    return r === false && clicked === 2;
})(), clicked);
ok("本体按钮不存在时退化为直接按本包规则排（不报错）", (() => {
    const bak = ui.sortCard;
    delete ui.sortCard;
    resetRows();
    mkCardEl("wuxie", "club", 2, null, row1);
    mkCardEl("sha", "spade", 3, null, row1);
    me.name = me.name1 = "sgz_zhaoyun";
    const r = mod.dmqcSortCardHotkey(keyEvent());
    ui.sortCard = bak;
    return r === true && suitsOf(row1).join(",") === "spade,club";
})(), clicked);
ok("快捷键说明写清了「单独按 S 没人用、A 是托管」", /A = 托管|A=托管/.test(sortSrc) && /Ctrl\+S/.test(sortSrc));

// ---------------------------------------------------------------- 汇总
let failed = 0;
for (const ch of checks) {
    if (!ch.cond) failed++;
    console.log((ch.cond ? "  [OK]   " : "  [FAIL] ") + ch.name + (ch.extra !== undefined && !ch.cond ? "   → 实际：" + JSON.stringify(ch.extra) : ""));
}
console.log(`\n通过 ${pass}/${checks.length}，失败 ${failed}`);
process.exit(failed ? 1 : 0);
