// ============================================================
//  自检：梦孙寒华表现层（effect/sgz_sunhanhua.js）
//  跑法：node extension/大梦千秋/__dytest/check_sunhanhua_effect_runtime.mjs
//
//  为什么要在 Node 里跑：这两个特效（手牌光框 / 五剑充能条）全是 DOM + CSS + SVG 建造代码，
//  光看语法查不出「拿错 DOM 节点」「点亮数量算错」「细线被撑成大矩形」这类问题，
//  而游戏里试一次成本很高（已经因此让用户白测了两轮）。这里用最小 DOM 假件把模块
//  **真加载、真建造、真刷新**一遍。
//
//  ⚠ 必须**先装好全局假件再 import 模块**（模块顶层就碰 window），所以用动态 import。
//  ⚠ 假件必须**照着真引擎的结构**做：真引擎里 `Card extends HTMLDivElement`，
//    卡牌对象**本身就是 DOM 元素**，`card.node` 只是个普通对象（装 .image/.name/.gaintag）。
//    第一版假件把 `card.node` 当成 DOM，于是测试全绿、游戏里却完全不显示 —— 假件必须像真的。
//  ⚠ 亮/暗之类"看起来对不对"没法自动测；能被自动测的是**结构与数值**：
//    剑的柄数、亮了几柄、亮的是不是最下面那几柄、文字读数、类名开关、光框挂在哪个节点上。
// ============================================================
import fs from "node:fs";

// ---------------------------------------------------------------- 最小 DOM
const allEls = [];

class El {
    constructor(tag, ns) {
        this.tagName = tag;
        this.ns = ns || null;
        this.children = [];
        this.attrs = {};
        this.parentNode = null;
        this._classes = new Set();
        this.style = {
            setProperty(k, v) {
                this[k] = v;
            },
            removeProperty(k) {
                delete this[k];
            },
        };
        this.textContent = "";
        this.innerHTML = "";
        this.id = "";
        this._position = "absolute";
        // 真卡牌上确实挂着一个普通对象 node（子元素字典），故意留着，验证代码没去用它
        this.node = {};
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
            add: (...cs) => cs.forEach(c => s.add(c)),
            remove: (...cs) => cs.forEach(c => s.delete(c)),
            contains: c => s.has(c),
            toggle: (c, on) => {
                if (on === undefined) s.has(c) ? s.delete(c) : s.add(c);
                else if (on) s.add(c);
                else s.delete(c);
            },
        };
    }
    setAttribute(k, v) {
        this.attrs[k] = String(v);
        if (k === "id") this.id = String(v);
        if (k === "class") this.className = String(v);
    }
    getAttribute(k) {
        return this.attrs[k];
    }
    appendChild(c) {
        c.parentNode = this;
        this.children.push(c);
        return c;
    }
    insertBefore(c, before) {
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
    matches(sel) {
        if (sel.startsWith(".")) return this._classes.has(sel.slice(1));
        return this.tagName === sel;
    }
    // 真 SVG 元素没有 offsetWidth/offsetHeight（所以代码里用 getBoundingClientRect 触发重排）
    getBoundingClientRect() {
        return { width: 46, height: 140, top: 0, left: 0, right: 46, bottom: 140 };
    }
    _walk(out) {
        for (const c of this.children) {
            out.push(c);
            if (c._walk) c._walk(out);
        }
        return out;
    }
    querySelector(sel) {
        return this._walk([]).find(e => e.matches(sel)) || null;
    }
    querySelectorAll(sel) {
        return this._walk([]).filter(e => e.matches(sel));
    }
}

globalThis.document = {
    head: new El("head"),
    body: new El("body"),
    createElement: tag => new El(tag),
    createElementNS: (ns, tag) => new El(tag, ns),
    getElementById: id => allEls.find(e => e.id === id) || null,
    // 真 DOM 的 querySelectorAll 只找**挂在文档树里**的元素，这里也照做（否则已 remove 的会被算进去）
    querySelectorAll: sel => [...document.head._walk([]), ...document.body._walk([])].filter(e => e.matches(sel)),
    querySelector: sel => [...document.head._walk([]), ...document.body._walk([])].find(e => e.matches(sel)) || null,
};
globalThis.window = {
    getComputedStyle: el => ({ position: el._position || "absolute" }),
    addEventListener() {},
};
globalThis.lib = { assetURL: "" }; // ⚠ 本机 lib.assetURL 就是空串（noname/util/index.js:4）
globalThis.game = { players: [], dead: [] };
globalThis.setInterval = () => 0; // 不真的开轮询（否则 Node 进程不退出）

// ---------------------------------------------------------------- 加载模块
const EXT = new URL("../", import.meta.url);
const effectSrc = await import(new URL("effect/sgz_sunhanhua.js", EXT).href);
const fx = effectSrc;
const chr = (await import(new URL("character/sgz_sunhanhua.js", EXT).href)).default;

let pass = 0;
const checks = [];
function ok(name, cond, extra) {
    checks.push({ name, cond: !!cond, extra });
    if (cond) pass++;
}

// ---------------------------------------------------------------- 1. 常量与 import 链路
ok("标记上限 = 5", fx.SGZ_MJ_MAX === 5, fx.SGZ_MJ_MAX);
ok("标记名 = sgz_miaojian", fx.SGZ_MJ === "sgz_miaojian");
ok("牌标记名 = sgz_miaojian_card", fx.SGZ_MJ_TAG === "sgz_miaojian_card");
ok("角色文件 import 到了同一个 UI 技能对象", chr.skills.sgz_sunhanhua_ui === fx.sunhanhuaUI);
ok("角色文件 import 到了同一个卡牌特效对象", chr.skills.sgz_miaojian_card_ui === fx.miaojianCardUI);
const charSkills = chr.character.sgz_sunhanhua.skills;
ok("两个 UI 技能都进了角色 skills 数组（否则不会 init）", charSkills.includes("sgz_sunhanhua_ui") && charSkills.includes("sgz_miaojian_card_ui"), charSkills.join(","));
ok("技能描述里的上限跟着常量走（自动是 5）", chr.skillTranslate.sgz_miaojian_info.includes("至多为5。"), chr.skillTranslate.sgz_miaojian_info.slice(0, 40));

// ---------------------------------------------------------------- 2. 不许再依赖外部图片文件
// （踩过：外部 .svg 当图片引在这个环境里不可靠；而且 rail 细线被 left:0;right:0 撑成大矩形）
const moduleText = fs.readFileSync(new URL("effect/sgz_sunhanhua.js", EXT), "utf8");
// 注释里会"提到"这些写法（用来记录踩过的坑），先剥掉纯注释行再查
const moduleCode = moduleText
    .split("\n")
    .filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join("\n");
ok("模块里不再引用任何外部图片（.svg/.png/.jpg）", !/url\(\s*['"]?[^)'"]*\.(svg|png|jpg|jpeg|webp)/i.test(moduleCode));
ok("模块里不再出现 effect/miaojian 素材路径", !/effect\/miaojian/.test(moduleCode));
ok("不再用 innerHTML 塞整段 SVG（改走 createElementNS 现建）", !/innerHTML\s*=\s*[`'"]\s*<svg/i.test(moduleCode));
ok("卡框与剑都不引用外部素材", !/<image\s/.test(moduleCode) && !/xlink:href/.test(moduleCode));

// ---------------------------------------------------------------- 3. 样式注入
function collectCss() {
    return document.head.children.map(s => s.innerHTML).join("\n");
}
ok("卡牌特效 CSS 已注入", fx.dmqcInjectMiaojianCardStyle() && collectCss().includes(".dmqc-mj-aura"));
ok("卡牌自带光晕 CSS 已注入", collectCss().includes(".dmqc-mj-glow"));
ok("卡牌光框是纯 CSS（边框 + 内外辉 + 四角剑翎 + 扫光）", /\.dmqc-mj-aura\s*\{[^}]*border:\s*2px solid/.test(collectCss()) && collectCss().includes(".dmqc-mj-aura::before") && collectCss().includes(".dmqc-mj-aura::after"));
ok("充能条 CSS 已注入", fx.dmqcInjectMiaojianBarStyle() && collectCss().includes(".dmqc-mjbar-wrap"));
ok("充能条 CSS 里有单柄点亮态与迸发动画", collectCss().includes(".dmqc-mjsvg-sword.on") && collectCss().includes("dmqc-mjsvg-flash"));
// ⚠ 反面断言：绝不能再出现"left:0; right:0"这种被撑满的细线（用户截图里那块大矩形就是它）
ok("CSS 里没有 left:0; right:0 撑满式的细条", !/left:\s*0;\s*right:\s*0/.test(collectCss()));
// 条子必须是"5 柄独立小剑 + 莲台"，不是赵云那种量筒
ok("CSS 里没有量筒式的剑身裁剪/填充", !collectCss().includes("clipPath") && !collectCss().includes("blade_clip"));
ok("两个 CSS 都只注入一次（幂等）", (() => {
    fx.dmqcInjectMiaojianCardStyle();
    fx.dmqcInjectMiaojianBarStyle();
    return document.head.children.filter(s => s.innerHTML.includes(".dmqc-mj-aura")).length === 1;
})());

// ---------------------------------------------------------------- 4. 充能条结构
const player = new El("div");
player.name = "梦孙寒华";
player.countMark = () => 3;
player.getCards = () => [];

const bar = fx.dmqcBuildMiaojianBar(player);
ok("充能条已挂到 player 节点上", player.children.some(c => c.className.includes("dmqc-mjbar-wrap")));
const wrap = bar.wrap;
const host = wrap.children.find(c => c.className.includes("dmqc-mjbar-svghost"));
ok("有条内 SVG 宿主", !!host);
const svg = host && host.children.find(c => c.tagName === "svg");
ok("宿主里真的建出了一个 <svg> 元素", !!svg && svg.ns === "http://www.w3.org/2000/svg");
ok("SVG 带 viewBox", !!svg && !!svg.attrs.viewBox, svg && svg.attrs.viewBox);
const text = wrap.children.find(c => c.className.includes("dmqc-mjbar-text"));
ok("文字就是「妙剑 3/5」", text.textContent === "妙剑 3/5", text.textContent);

const swordEls = host.querySelectorAll(".dmqc-mjsvg-sword");
ok("剑阵里正好有「上限」柄剑", swordEls.length === fx.SGZ_MJ_MAX, swordEls.length);
ok("每柄剑都是真的画了形状（不是空的占位 div）", swordEls.every(g => g.children.length >= 6), swordEls.map(g => g.children.length).join(","));

// ★ 排版三条硬要求（用户明确提的）：竖直不倾斜、大小一致、等距排满 0~100%
ok("5 柄剑都不倾斜（transform 里没有 rotate）", swordEls.every(g => !/rotate/.test(String(g.attrs.transform || ""))), swordEls.map(g => g.attrs.transform).join(" | "));
ok("5 柄剑大小完全一致（形状子元素数量与路径都一样）", (() => {
    const sig = g => g.children.map(c => c.tagName + ":" + JSON.stringify(c.attrs)).join("|");
    const first = sig(swordEls[0]);
    return swordEls.every(g => sig(g) === first);
})());
ok("5 柄剑竖直等距排满整条（圆心步长 = 单柄高度，首尾正好顶到画布上下边）", (() => {
    const vb = String(svg.attrs.viewBox).split(/\s+/).map(Number); // [0,0,W,H]
    const H = vb[3];
    const ys = swordEls.map(g => parseFloat((String(g.attrs.transform).match(/translate\([\d.]+ ([\d.]+)\)/) || [])[1]));
    if (!ys.every(Number.isFinite)) return false;
    // 单柄的上下极值直接从图形里量（剑尖 / 剑首最低点），不写死数字
    const ysOf = g => g.children.map(c => String(c.attrs.d || c.attrs.y || "")).join(" ");
    const tip = Math.min(...String(swordEls[0].children[0].attrs.d).match(/-?\d+(\.\d+)?/g).map(Number));
    const pommel = Math.max(...String(swordEls[0].children[swordEls[0].children.length - 1].attrs.d).match(/-?\d+(\.\d+)?/g).map(Number));
    const swordH = pommel - tip;
    const steps = ys.slice(1).map((v, i) => v - ys[i]);
    const even = steps.every(s => Math.abs(s - steps[0]) < 0.01); // ⚠ 第 0 柄在最下面，步长是负的
    return (
        even &&
        Math.abs(Math.abs(steps[0]) - swordH) < 0.01 &&  // 等距且正好相接（不重叠不留缝）
        Math.abs(ys[ys.length - 1] + tip) < 0.01 &&      // 最上一柄的剑尖 = 画布顶（0）
        Math.abs(ys[0] + pommel - H) < 0.01              // 最下一柄的剑首 = 画布底（100%）
    );
})(), swordEls.map(g => g.attrs.transform).join(" | "));
ok("画布高度 = 上限 × 单柄高度（5 柄正好排满）", (() => {
    const vb = String(svg.attrs.viewBox).split(/\s+/).map(Number);
    const tip = Math.min(...String(swordEls[0].children[0].attrs.d).match(/-?\d+(\.\d+)?/g).map(Number));
    const pommel = Math.max(...String(swordEls[0].children[swordEls[0].children.length - 1].attrs.d).match(/-?\d+(\.\d+)?/g).map(Number));
    return Math.abs(vb[3] - (pommel - tip) * fx.SGZ_MJ_MAX) < 0.01;
})());

// 莲台已按需求删除
ok("已经没有莲台（DOM 里查不到，CSS 里也没有）", host.querySelectorAll(".dmqc-mjsvg-lotus").length === 0 && !collectCss().includes("lotus") && !collectCss().includes("bloom"));
ok("条子的 SVG 里只剩 5 柄剑 + defs，没有别的装饰块", (() => {
    const others = svg.children.filter(c => c.tagName !== "defs" && !c.className.includes("dmqc-mjsvg-sword"));
    return others.length === 0;
})(), svg.children.map(c => c.tagName + "." + c.className).join(","));

const litCount = () => host.querySelectorAll(".dmqc-mjsvg-sword").filter(s => s.classList.contains("on")).length;
ok("3 枚标记 → 正好点亮 3 柄", litCount() === 3, litCount());
ok("点亮的必须是**最下面**那 3 柄", (() => {
    const all = host.querySelectorAll(".dmqc-mjsvg-sword");
    return all.slice(0, 3).every(s => s.classList.contains("on")) && all.slice(3).every(s => !s.classList.contains("on"));
})());
ok("未满时没有 full 类", !wrap.classList.contains("full"));

// 满充能
player.countMark = () => 5;
fx.dmqcRefreshMiaojianBar(player);
ok("满充能文字 5/5", text.textContent === "妙剑 5/5", text.textContent);
ok("满充能点亮全部 5 柄", litCount() === 5, litCount());
ok("满充能有 full 类（只提亮文字，不再有莲台之类的额外特效）", wrap.classList.contains("full"));

// 0 充能
player.countMark = () => 0;
fx.dmqcRefreshMiaojianBar(player);
ok("0 充能一柄都不亮", litCount() === 0, litCount());

// "刚点亮"的迸发：新亮的那几柄带 pop；没亮的必须没有
player.countMark = () => 2;
fx.dmqcRefreshMiaojianBar(player);
player.countMark = () => 4;
fx.dmqcRefreshMiaojianBar(player);
const allSwords = host.querySelectorAll(".dmqc-mjsvg-sword");
ok("从 2 → 4：第 3、4 柄被标上迸发", allSwords[2].classList.contains("pop") && allSwords[3].classList.contains("pop"));
ok("从 2 → 4：没亮的那柄没有迸发标记", !allSwords[4].classList.contains("pop"));
player.countMark = () => 0;
fx.dmqcRefreshMiaojianBar(player);
ok("掉回 0 时把迸发类也清掉", host.querySelectorAll(".dmqc-mjsvg-sword").every(s => !s.classList.contains("pop")));

// 卸载
fx.dmqcRemoveMiaojianBar(player);
ok("卸载后节点的引用被清掉", !player.dmqcMjBar);

// ---------------------------------------------------------------- 5. 手牌卡牌特效
const auraCount = () => document.querySelectorAll(".dmqc-mj-aura").length;

/// 造一张**像真引擎那样**的牌：卡牌对象自己就是 DOM 元素（Card extends HTMLDivElement），
/// 另外还挂着一个普通对象 `node`（子元素字典）——代码绝不该往 `node` 上挂东西。
function mkCard(tagged, position) {
    const card = new El("div");
    card._position = position || "absolute";
    document.body.appendChild(card);
    card._tagged = tagged;
    card.hasGaintag = function (t) {
        return this._tagged && t === fx.SGZ_MJ_TAG;
    };
    // 真卡牌上 node 里还有 .gaintag 之类的子元素，这里放一个占位，用来证明没被误用
    card.node = { gaintag: new El("div") };
    return card;
}

const cardA = mkCard(true);
const cardB = mkCard(false);
const other = { name: "别人", getCards: () => [cardB], countMark: () => 0 };
game.players = [player, other];
player.getCards = () => [cardA];

let n = fx.dmqcRefreshMiaojianCards();
ok("只给带标记的那张挂光框", n === 1 && auraCount() === 1, "n=" + n + " auras=" + auraCount());
ok("光框挂在**卡牌元素自己**身上（不是挂在 card.node 那个普通对象上）", !!cardA.querySelector(".dmqc-mj-aura") && cardA.node.gaintag.children.length === 0);
ok("卡牌自己带了光晕类", cardA.classList.contains("dmqc-mj-glow"));
ok("没标记的牌没有光框", !cardB.querySelector(".dmqc-mj-aura") && !cardB.classList.contains("dmqc-mj-glow"));
ok("光框里挂了 3 颗上浮微粒（复用通用动效层）", cardA.querySelector(".dmqc-mj-aura").querySelectorAll(".dmqc-fx-mote").length === 3);

// 兼容性：万一拿到的是"没有 DOM"的假卡（VCard 之类），必须安静跳过而不是抛错
const bareCard = { hasGaintag: () => true };
other.getCards = () => [bareCard, cardB];
let threw = false;
try {
    fx.dmqcRefreshMiaojianCards();
} catch (e) {
    threw = true;
}
ok("遇到没有 DOM 的牌不抛错（安静跳过）", !threw);

// 摘掉标记 → 光框必须收走
cardA._tagged = false;
player.getCards = () => [cardA];
fx.dmqcRefreshMiaojianCards();
ok("标记被摘掉后光框与光晕都被移除", !cardA.querySelector(".dmqc-mj-aura") && !cardA.classList.contains("dmqc-mj-glow") && auraCount() === 0);

// ★ 关键边界：带标记的牌**离开手牌区**（打出/被弃置）—— 卡牌元素会被整块搬到弃牌堆，
//   光框跟着元素走，而刷新只遍历"当前手牌"永远看不到它 ⇒ 必须靠收尾那一步清掉
const cardD = mkCard(true);
player.getCards = () => [cardD];
fx.dmqcRefreshMiaojianCards();
ok("离开手牌前的光框在", !!cardD.querySelector(".dmqc-mj-aura"));
document.body.appendChild(cardD); // 仍在文档里，只是不在任何人手牌里了
player.getCards = () => [];
other.getCards = () => [];
fx.dmqcRefreshMiaojianCards();
ok("牌离开手牌区后光框被收走（不会留在弃牌堆上）", !cardD.querySelector(".dmqc-mj-aura") && !cardD.classList.contains("dmqc-mj-glow") && auraCount() === 0);

// 卡牌本身是 static 时补定位类；是 absolute 时不碰它的 position
const cardE = mkCard(true, "static");
const cardF = mkCard(true, "absolute");
player.getCards = () => [cardE, cardF];
fx.dmqcRefreshMiaojianCards();
ok("static 卡牌被补上定位类", cardE.classList.contains("dmqc-mj-card-static"));
ok("absolute 卡牌不动它的 position（免得搞乱手牌布局）", !cardF.classList.contains("dmqc-mj-card-static"));
player.getCards = () => [];
fx.dmqcRefreshMiaojianCards();
ok("离开手牌后定位类也被收走", !cardE.classList.contains("dmqc-mj-card-static"));

// ---------------------------------------------------------------- 6. 调试入口
ok("控制台自检入口已注册", typeof window.dmqcSunhanhuaDebug === "function");
if (typeof window.dmqcSunhanhuaDebug === "function") {
    fx.dmqcBuildMiaojianBar(player); // 上面卸载过，这里重建，让自检输出有意义
    const info = window.dmqcSunhanhuaDebug();
    ok("自检里读到的是新的上限 5", info["①妙剑标记上限"] === 5, info["①妙剑标记上限"]);
    ok("自检里读到了已挂载的充能条", String(info["⑤充能条已挂载"]).includes("梦孙寒华"), info["⑤充能条已挂载"]);
    ok("自检能报出剑几柄/亮几柄（版式实测）", /剑 5 柄（亮 \d）/.test(String(info["⑦条内 SVG 实测"])), info["⑦条内 SVG 实测"]);
}

// ---------------------------------------------------------------- 汇总
let failed = 0;
for (const c of checks) {
    if (!c.cond) failed++;
    console.log((c.cond ? "  [OK]   " : "  [FAIL] ") + c.name + (c.extra !== undefined && !c.cond ? "   → 实际：" + JSON.stringify(c.extra) : ""));
}
console.log(`\n通过 ${pass}/${checks.length}，失败 ${failed}`);
process.exit(failed ? 1 : 0);
