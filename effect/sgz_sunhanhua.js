// ============================================================
//  梦孙寒华 · 表现层（纯 UI，无游戏规则）
//    · 【妙剑】手牌卡牌特效：带标记的手牌 → 青绿剑气光框 + 扫光 + 呼吸光 + 上浮粒子（**纯 CSS**）
//    · 武将牌右侧充能条：「五剑悬空 · 莲台承之」→ 5 柄青玉剑，1 枚标记点亮 1 柄（**内联 SVG**）
//
//  ⚠ 本文件同时是「标记名 / 上限」的**唯一来源**：`character/sgz_sunhanhua.js`
//    从这里 import SGZ_MJ / SGZ_MJ_TAG / SGZ_MJ_MAX，避免两处各写一个数字对不上。
//    （方向是 character → effect，**不成环**；反过来 import 会在循环依赖里读到未初始化的 const。）
//
//  ⚠⚠⚠ **四条踩过的坑（务必保留结论，别再绕回去）**：
//    1) **content / precontent 必须写成 async**：`ContentCompiler` 的 StepCompiler 会认领一切
//       非 async / 非 generator 的函数，转成字符串用隔离作用域重新 eval
//       （noname/library/element/GameEvent/compilers/StepCompiler.js:10-12、packStep:81-93），
//       隔离作用域里**没有模块作用域** → 本文件的模块函数会变成 undefined。
//       （`init` / `onremove` 是引擎直接调用，不是 content，随便用闭包。）
//    2) **卡牌对象本身就是 DOM 元素**：`Card extends HTMLDivElement`（card.js:7），
//       而 `card.node` 只是 `buildNode()` 建的**普通对象**（card.js:62-74，装 .image/.name/.gaintag）。
//       往 `card.node` 上 `appendChild` 会静默失败 —— 这正是第一版「手牌特效完全不显示」的原因。
//       见 `dmqcMjCardElement()`。
//    3) **不要把 SVG 当外部图片文件引**（`background-image: url(xxx.svg)`）：
//       本机是 Electron 33，CSS/`inset` 这些都没问题，但**外部图片资源的加载在扩展里不可靠**
//       （同样的写法在其它 effect 里也未必真跑起来过）。凡是"必须画出来"的东西一律
//       **内联进 DOM**：要么纯 CSS，要么 `document.createElementNS` 现建 SVG
//       （梦赵云【劫烬】那条能正常显示，就是因为它走的是 JS 现建 SVG）。
//    4) **别写 `left:0; right:0` 的"细线"**：第二版把剑气轨道写成
//       `.dmqc-mjbar-railfill { left:0; right:0; ... }`，本意是 3px 细线，实际被撑成
//       整列 38px 宽 → 屏幕上就是一大块青色圆角矩形（用户截图里那个就是它）。
//       细线一律显式写 `width` + `left:50%` + `margin-left:-w/2`。
// ============================================================

import { dmqcMountParticles } from "./dmqc_particles.js";

// ---- 共享常量（角色文件也从这里 import）----
/// 妙剑标记名（**故意与空壳技能同名**，标记就挂在技能名下，UI 直接显示数量）
export const SGZ_MJ = "sgz_miaojian";
/// 「妙剑」牌上的文字标记（engine `card.addGaintag` 取 `get.translation(tag)` 当文字）
export const SGZ_MJ_TAG = "sgz_miaojian_card";
/// ★★★ 妙剑标记上限 ★★★（充能条的剑数也跟着它走，改这一个数字两边同时生效）
export const SGZ_MJ_MAX = 5;

// ============================================================
//  一、手牌「妙剑」卡牌特效（纯 CSS，不依赖任何图片文件）
// ============================================================
const MJ_CARD_STYLE_ID = "dmqc_miaojian_card_style";
/// 卡牌上那层光框（扫光 / 角饰 / 呼吸）
const MJ_AURA_CLASS = "dmqc-mj-aura";
/// 卡牌本身不是定位元素时补的类（给光框当定位父级）
/// ⚠ 绝不能无条件给 .card 写 `position: relative` —— 手牌在无名杀里是引擎自己摆放的定位元素，
///   改了 position 会**直接把整手牌的布局搞乱**。
const MJ_CARD_STATIC_CLASS = "dmqc-mj-card-static";
/// 挂在卡牌节点**自己身上**的类：一圈外发光 + 内辉（脉动）
const MJ_GLOW_CLASS = "dmqc-mj-glow";

export function dmqcInjectMiaojianCardStyle() {
    if (typeof document === "undefined" || !document) return false;
    if (document.getElementById(MJ_CARD_STYLE_ID)) return true;
    const style = document.createElement("style");
    style.id = MJ_CARD_STYLE_ID;
    style.innerHTML = `
/* ---------- 剑气光框：边框 + 内外辉 + 四角剑翎 + 斜向扫光 ---------- */
.dmqc-mj-aura {
    position: absolute; top: -2px; right: -2px; bottom: -2px; left: -2px;
    border: 2px solid rgba(150, 255, 232, 0.85);
    border-radius: 8px;
    pointer-events: none;            /* 绝不能挡住选牌 */
    z-index: 6;
    overflow: hidden;
    box-shadow: 0 0 6px rgba(94, 241, 192, 0.7), 0 0 15px rgba(47, 214, 166, 0.35),
                inset 0 0 9px rgba(94, 241, 192, 0.5);
    animation: dmqc-mj-breath 2.2s ease-in-out infinite;
}
/* 四角剑翎：八段渐变拼出四个直角（纯 CSS，不引图片） */
.dmqc-mj-aura::before {
    content: "";
    position: absolute; top: 1px; right: 1px; bottom: 1px; left: 1px;
    border-radius: 6px;
    background-image:
        linear-gradient(#eafff8, #eafff8), linear-gradient(#eafff8, #eafff8),
        linear-gradient(#eafff8, #eafff8), linear-gradient(#eafff8, #eafff8),
        linear-gradient(#eafff8, #eafff8), linear-gradient(#eafff8, #eafff8),
        linear-gradient(#eafff8, #eafff8), linear-gradient(#eafff8, #eafff8);
    background-size:
        13px 2px, 2px 13px,
        13px 2px, 2px 13px,
        13px 2px, 2px 13px,
        13px 2px, 2px 13px;
    background-position:
        left top, left top,
        right top, right top,
        left bottom, left bottom,
        right bottom, right bottom;
    background-repeat: no-repeat;
    opacity: 0.95;
}
/* 斜向扫光：缓慢横掠一道青白光 */
.dmqc-mj-aura::after {
    content: "";
    position: absolute; top: -40%; bottom: -40%; left: -40%; right: -40%;
    background: linear-gradient(115deg,
        rgba(140, 255, 225, 0) 38%,
        rgba(210, 255, 245, 0.42) 50%,
        rgba(140, 255, 225, 0) 62%);
    background-size: 240% 100%;
    animation: dmqc-mj-sweep 2.6s ease-in-out infinite;
}
/* 只动 opacity（合成器属性），不动 filter/shadow，多张牌同时闪也不掉帧 */
@keyframes dmqc-mj-breath {
    0%, 100% { opacity: 0.76; }
    50%      { opacity: 1; }
}
@keyframes dmqc-mj-sweep {
    0%   { background-position: 150% 0; }
    100% { background-position: -55% 0; }
}
.dmqc-mj-card-static { position: relative; }   /* 只有当卡牌本身不是定位元素时才补这一条 */

/* ---------- 卡牌自己身上的一层光晕（卡面被别的层盖住时的保险） ---------- */
.dmqc-mj-glow {
    border-radius: 6px;
    box-shadow: 0 0 7px 1px rgba(94, 241, 192, 0.8), 0 0 16px 2px rgba(47, 214, 166, 0.4),
                inset 0 0 10px rgba(94, 241, 192, 0.45);
    animation: dmqc-mj-glowpulse 1.9s ease-in-out infinite;
    /* ⚠ 这里**不能**写 z-index：给卡牌元素设 z-index 会新建层叠上下文，
       改变它与相邻手牌的前后遮挡关系（手牌是叠着展开的）。box-shadow 不需要 z-index 就能显示。 */
}
@keyframes dmqc-mj-glowpulse {
    0%, 100% { box-shadow: 0 0 5px 1px rgba(94, 241, 192, 0.55), 0 0 12px 1px rgba(47, 214, 166, 0.3),
                           inset 0 0 7px rgba(94, 241, 192, 0.35); }
    50%      { box-shadow: 0 0 10px 2px rgba(140, 255, 226, 0.95), 0 0 22px 4px rgba(47, 214, 166, 0.55),
                           inset 0 0 14px rgba(140, 255, 226, 0.6); }
}

/* 无障碍：用户开了"减少动态效果"就只留静态光框 */
@media (prefers-reduced-motion: reduce) {
    .dmqc-mj-aura, .dmqc-mj-aura::after, .dmqc-mj-glow { animation: none !important; }
    .dmqc-mj-aura::after { opacity: 0.25; }
}
`;
    document.head.appendChild(style);
    return true;
}

/// 造一层光框（含 3 颗上浮剑气微粒，复用通用动效层）
function dmqcMjMakeAura() {
    const aura = document.createElement("div");
    aura.className = MJ_AURA_CLASS;
    aura.setAttribute("aria-hidden", "true");
    try {
        dmqcMountParticles(aura, "sunhanhua", { count: 3, opacity: 0.5 });
    } catch (e) {
        /* 纯装饰，失败就算了 */
    }
    return aura;
}

/// 取一张牌的 **DOM 元素**（见文件头「坑 2」）
function dmqcMjCardElement(card) {
    if (!card) return null;
    if (typeof card.appendChild === "function" && card.classList) return card; // ← 真引擎走这支
    if (card.node && typeof card.node.appendChild === "function" && card.node.classList) return card.node;
    return null;
}

/// 卡牌节点不是定位元素时，补一个「定位父级」类（见 MJ_CARD_STATIC_CLASS 的注释）
function dmqcMjEnsurePositioned(node) {
    try {
        const pos = window.getComputedStyle(node).position;
        if (pos === "static" || !pos) node.classList.add(MJ_CARD_STATIC_CLASS);
    } catch (e) {
        node.classList.add(MJ_CARD_STATIC_CLASS);
    }
}

/// 判断一张手牌是否带「妙剑」标记。
/// 正常走 `hasGaintag`；再兜一层裸 `gaintag` 数组 —— 免得遇到某种包装卡时整张牌被跳过。
function dmqcMjCardTagged(card) {
    if (!card) return false;
    try {
        if (typeof card.hasGaintag === "function" && card.hasGaintag(SGZ_MJ_TAG)) return true;
        if (Array.isArray(card.gaintag) && card.gaintag.includes(SGZ_MJ_TAG)) return true;
    } catch (e) {}
    return false;
}

/// 取某玩家手牌里带「妙剑」标记的牌
function dmqcMjHandCards(player) {
    try {
        return player.getCards("h", dmqcMjCardTagged);
    } catch (e) {
        return [];
    }
}

/// 全量校准：**手牌里有标记的牌挂光框、没标记的摘掉、离开手牌的收走**
/// ⚠ 必须全量扫描而不是"只处理变化的那几张"：手牌区会整块重建 innerHTML，
///   重建后原来挂上去的 DOM 就没了，靠这个函数把光效补回来（所以还有定时轮询兜底）。
/// ⚠ 收尾那一步（按 `keep` 反查所有光框）**不能省**：一张带标记的牌被打出/弃置后，
///   卡牌**元素本身**是被搬到弃牌堆/处理区的（同一个 DOM 节点跟着走），光框也就跟着过去了；
///   而前面的循环只遍历"当前手牌"，永远看不到它 ⇒ 必须在最后统一把不在 keep 里的摘掉。
export function dmqcRefreshMiaojianCards() {
    let count = 0;
    const keep = new Set();
    try {
        if (typeof game === "undefined" || !game) return 0;
        const players = (game.players || []).concat(game.dead || []);
        for (const player of players) {
            if (!player || typeof player.getCards !== "function") continue;
            for (const card of player.getCards("h")) {
                const node = dmqcMjCardElement(card);
                if (!node) continue;
                const tagged = dmqcMjCardTagged(card);
                let aura = null;
                try {
                    aura = node.querySelector("." + MJ_AURA_CLASS);
                } catch (e) {}
                if (tagged) {
                    node.classList.add(MJ_GLOW_CLASS);
                    if (!aura) {
                        dmqcMjEnsurePositioned(node);
                        node.appendChild(dmqcMjMakeAura());
                    }
                    keep.add(node);
                    count++;
                } else {
                    node.classList.remove(MJ_GLOW_CLASS);
                    if (aura) aura.remove();
                }
            }
        }
    } catch (e) {
        console.error("[大梦千秋] 妙剑卡牌特效刷新异常（不影响结算）：", e);
    }
    // 收尾：任何"不在本次保留名单里"的光框都清掉
    // （牌离开手牌区 / 标记被摘 / 手牌区重建后留下的孤儿节点，全都在这一步被收拾干净）
    try {
        if (typeof document !== "undefined" && document && document.querySelectorAll) {
            for (const aura of document.querySelectorAll("." + MJ_AURA_CLASS)) {
                if (keep.has(aura.parentNode)) continue;
                const host = aura.parentNode;
                aura.remove();
                // 连"定位父级"类一起收掉：否则这张牌以后（弃牌堆里）会带着 position:relative
                if (host && host.classList) {
                    host.classList.remove(MJ_CARD_STATIC_CLASS);
                    host.classList.remove(MJ_GLOW_CLASS);
                }
            }
        }
    } catch (e) {}
    return count;
}

// 轮询：手牌区 DOM 重建、卡牌在区域间移动都可能把光框弄丢，这里定期补
let dmqcMjCardPolling = null;
function dmqcStartMjCardPolling() {
    if (dmqcMjCardPolling) return;
    dmqcMjCardPolling = setInterval(function () {
        try {
            dmqcRefreshMiaojianCards();
        } catch (e) {}
    }, 400);
}

/// 手牌特效的载体技能（挂在梦孙寒华身上；charlotte 隐藏，不显示在技能栏）
export const miaojianCardUI = {
    charlotte: true,
    forced: true,
    silent: true,
    priority: -10,
    trigger: {
        player: ["enterGame", "gainAfter", "loseAfter"],
        global: ["gameStart", "phaseBeginStart", "roundStart"],
    },
    init: function (player) {
        dmqcInjectMiaojianCardStyle();
        dmqcStartMjCardPolling();
        // 开局先扫一遍（此时可能已有别人给的 / 偷走的带标记牌）
        dmqcRefreshMiaojianCards();
    },
    // ⚠ async：见文件头「坑 1」
    async content(event, trigger, player) {
        dmqcRefreshMiaojianCards();
    },
};

// ============================================================
//  二、「五剑列阵」充能条（内联 SVG，JS 现建）
// ============================================================
//  与梦赵云【劫烬】那条的区别（别搞成换色版）：
//    · 赵云那条 = **一柄大剑当量筒**，能量在剑身内腔里连续涨落（clipPath + 填充矩形 + 刻度线）。
//    · 本条     = **5 柄独立的青玉小剑**竖直排成一列，1 枚标记点亮 1 柄（从下往上）。
//                 **没有量筒、没有填充矩形、没有刻度线** —— 数量靠"亮了几柄剑"读。
//  排版（按需求定死，改之前先看清楚）：
//    · 5 柄**大小完全一致**、**不倾斜**、**竖直等距**；
//    · 单柄本地高度 54（剑尖 -22 ~ 剑首 +32），5 × 54 = 270 = 画布高度
//      ⇒ **正好把 0 ~ 100% 排满**，彼此刚好相接（不重叠、不留缝）。
const MJ_BAR_STYLE_ID = "dmqc_miaojian_bar_style";
const SVGNS = "http://www.w3.org/2000/svg";
/// 单柄剑的组类名（点亮 = 加 .on）
const MJ_SWORD_CLASS = "dmqc-mjsvg-sword";

// ---- 剑与画布的几何（单位 = SVG 用户坐标）----
/// 剑尖（本地坐标，朝上）
const MJ_SWORD_TIP = -22;
/// 剑首底端（本地坐标）
const MJ_SWORD_POMMEL = 32;
/// 单柄剑高度 = 54
const MJ_SWORD_H = MJ_SWORD_POMMEL - MJ_SWORD_TIP;
/// 画布宽（剑格 ±13，留点余量给发光）
const MJ_VB_W = 76;
/// 画布高 = 5 × 54 = 270 ⇒ 5 柄正好排满整条
const MJ_VB_H = MJ_SWORD_H * SGZ_MJ_MAX;
/// 剑的横向中心
const MJ_SWORD_CX = MJ_VB_W / 2;
/// 最下面那柄（= 第 1 枚标记点亮的）的圆心 y：让它剑首底端正好落在画布底边
const MJ_SWORD_BOTTOM_CY = MJ_VB_H - MJ_SWORD_POMMEL;

export function dmqcInjectMiaojianBarStyle() {
    if (typeof document === "undefined" || !document) return false;
    if (document.getElementById(MJ_BAR_STYLE_ID)) return true;
    const style = document.createElement("style");
    style.id = MJ_BAR_STYLE_ID;
    style.innerHTML = `
/* 容器：贴武将牌右侧。横排 = 左边剑阵、右边计数（剑阵吃掉几乎整个高度） */
.dmqc-mjbar-wrap {
    position: absolute; left: 100%; bottom: 0;
    margin-left: 3px; width: 62px; height: 100%;
    z-index: 60; pointer-events: none;
    display: flex; flex-direction: row; align-items: center; justify-content: flex-start;
}
/* 内联 SVG 的宿主：撑满整条高度，让 5 柄剑正好排满 0~100% */
.dmqc-mjbar-svghost { flex: none; width: 46px; height: 100%; }
.dmqc-mjbar-svghost > svg { display: block; width: 100%; height: 100%; overflow: visible; }
/* 计数文字（竖排，贴在剑阵右侧） */
.dmqc-mjbar-text {
    flex: none; margin-left: 1px;
    font-family: yuanli; font-size: 8px; line-height: 10px;
    color: rgba(180, 255, 235, 0.95);
    text-shadow: 0 0 6px rgba(50, 225, 180, 0.85), 0 1px 2px rgba(0, 0, 0, 0.9);
    writing-mode: vertical-rl; letter-spacing: 1px; white-space: nowrap;
    position: relative; z-index: 4;
    transition: color 0.5s ease, text-shadow 0.5s ease;
}

/* ---------- 单柄剑：未点亮 = 暗剑（灰、半透明），点亮 = 青玉剑气 ---------- */
.dmqc-mjsvg-sword {
    opacity: 0.26;
    filter: grayscale(0.6) brightness(0.72);
    transition: opacity 0.4s ease, filter 0.4s ease;
}
.dmqc-mjsvg-sword.on {
    opacity: 1;
    filter: drop-shadow(0 0 2.5px rgba(94, 241, 192, 0.95)) drop-shadow(0 0 6px rgba(47, 214, 166, 0.5));
    animation: dmqc-mjsvg-breathe 2.6s ease-in-out infinite;
}
/* 刚点亮的那一柄：一次性"剑光迸发"（JS 用 摘类→重排→加类 重放）。
   ⚠ 必须排在 .on 之后：两条都在时以靠后的 animation 为准。 */
.dmqc-mjsvg-sword.pop { animation: dmqc-mjsvg-flash 0.8s ease-out 1; }
@keyframes dmqc-mjsvg-breathe {
    0%, 100% { filter: drop-shadow(0 0 2px rgba(94, 241, 192, 0.8)) drop-shadow(0 0 5px rgba(47, 214, 166, 0.35)); }
    50%      { filter: drop-shadow(0 0 6px rgba(200, 255, 244, 1)) drop-shadow(0 0 13px rgba(47, 214, 166, 0.7)); }
}
@keyframes dmqc-mjsvg-flash {
    0%   { opacity: 1; filter: drop-shadow(0 0 10px #ffffff) brightness(2.4); }
    100% { opacity: 1; filter: drop-shadow(0 0 2.5px rgba(94, 241, 192, 0.95)) brightness(1); }
}

/* ---------- 微粒层（dmqcMountParticles 挂进来的 .dmqc-fx-field） ---------- */
.dmqc-mjbar-wrap .dmqc-fx-field { z-index: 3; }

/* 满标记：文字提亮（**没有莲台之类的额外特效**） */
.dmqc-mjbar-wrap.full .dmqc-mjbar-text {
    color: #eafff8;
    text-shadow: 0 0 9px rgba(150, 255, 232, 1), 0 1px 2px rgba(0, 0, 0, 0.9);
}
@media (prefers-reduced-motion: reduce) {
    .dmqc-mjsvg-sword.on, .dmqc-mjsvg-sword.pop { animation: none !important; }
}
`;
    document.head.appendChild(style);
    return true;
}

/// 建一个 SVG 元素（省得每行都写 createElementNS）
function mjEl(tag, attrs, parent) {
    const el = document.createElementNS(SVGNS, tag);
    if (attrs) {
        for (const key in attrs) el.setAttribute(key, attrs[key]);
    }
    if (parent) parent.appendChild(el);
    return el;
}

/// 一柄青玉剑的形状（本地坐标：剑尖朝上在 y=-22，剑首底端在 y=+32，原点在剑身中心）。
/// 尺寸按"5 柄排满一列"倒推：全高 54、剑格宽 26（太细长缩下来会变牙签）。
function mjSwordShape(parent) {
    mjEl("path", { d: "M0,-22 L7,-11 L7,6 L-7,6 L-7,-11 Z", fill: "url(#dmqcMjBlade)" }, parent);
    mjEl("path", { d: "M-7,-11 L-7,6 L-5,6 L-5,-11 Z", fill: "#0b3f36", "fill-opacity": "0.42" }, parent);
    mjEl("path", { d: "M7,-11 L7,6 L5,6 L5,-11 Z", fill: "#0b3f36", "fill-opacity": "0.42" }, parent);
    mjEl("line", { x1: 0, y1: -17, x2: 0, y2: 6, stroke: "#ffffff", "stroke-opacity": "0.62", "stroke-width": "1.2" }, parent);
    // 剑格（云头护手，做宽一点，缩下来才看得出是剑）
    mjEl("path", { d: "M-13,6 L13,6 L10,13 L-10,13 Z", fill: "url(#dmqcMjGuard)" }, parent);
    mjEl("line", { x1: -13, y1: 7.6, x2: 13, y2: 7.6, stroke: "#052b24", "stroke-opacity": "0.5", "stroke-width": "1" }, parent);
    // 剑柄 + 剑首（菱形玉坠）
    mjEl("rect", { x: -4, y: 13, width: 8, height: 9, rx: 2.5, fill: "#0b3f36", stroke: "#4fd9b4", "stroke-width": "1.1" }, parent);
    mjEl("path", { d: "M0,22 L5,27 L0,32 L-5,27 Z", fill: "#0b3f36", stroke: "#4fd9b4", "stroke-width": "1.1", "stroke-linejoin": "round" }, parent);
}

/// 现建整条 SVG（渐变 defs + 5 柄剑，竖直等距排满、不倾斜、大小一致）
function mjBuildBarSvg() {
    const svg = mjEl("svg", { viewBox: "0 0 " + MJ_VB_W + " " + MJ_VB_H });

    const defs = mjEl("defs", null, svg);
    const blade = mjEl("linearGradient", { id: "dmqcMjBlade", gradientUnits: "userSpaceOnUse", x1: 0, y1: -22, x2: 0, y2: 6 }, defs);
    [["0", "#f4fffc"], ["0.28", "#9dffe6"], ["0.64", "#2fd6a6"], ["1", "#0d6a57"]].forEach(function (s) {
        mjEl("stop", { offset: s[0], "stop-color": s[1] }, blade);
    });
    const guard = mjEl("linearGradient", { id: "dmqcMjGuard", gradientUnits: "userSpaceOnUse", x1: -13, y1: 0, x2: 13, y2: 0 }, defs);
    [["0", "#12594a"], ["0.5", "#8affe0"], ["1", "#12594a"]].forEach(function (s) {
        mjEl("stop", { offset: s[0], "stop-color": s[1] }, guard);
    });

    // 5 柄剑：数组第 0 个 = **最下面**那柄（第 1 枚标记点亮它），往上依次排。
    // 圆心 y 逐柄减 54（正好等于单柄高度）⇒ 彼此刚好相接，整列从画布顶排到底。
    for (let k = 0; k < SGZ_MJ_MAX; k++) {
        const y = MJ_SWORD_BOTTOM_CY - k * MJ_SWORD_H;
        const g = mjEl("g", {
            class: MJ_SWORD_CLASS,
            // ⚠ 不写 rotate：按要求 5 柄竖直不倾斜
            transform: "translate(" + MJ_SWORD_CX + " " + y + ")",
        }, svg);
        mjSwordShape(g);
    }
    return svg;
}

/// 造条（每人一份，挂在 player 节点上）
export function dmqcBuildMiaojianBar(player) {
    if (!player || player.dmqcMjBar) return player && player.dmqcMjBar;
    if (typeof document === "undefined" || !document) return null;
    dmqcInjectMiaojianBarStyle();

    const wrap = document.createElement("div");
    wrap.className = "dmqc-mjbar-wrap";

    const host = document.createElement("div");
    host.className = "dmqc-mjbar-svghost";
    host.appendChild(mjBuildBarSvg());

    const text = document.createElement("div");
    text.className = "dmqc-mjbar-text";
    text.textContent = "妙剑 0/" + SGZ_MJ_MAX;

    wrap.appendChild(host);
    wrap.appendChild(text);

    // 剑阵里的上浮剑气微粒（复用通用动效层）
    try {
        dmqcMountParticles(wrap, "sunhanhua", { count: 8 });
    } catch (e) {}

    // 【关键】挂到 player 节点（而不是 ui.arena），才会跟着武将牌走
    player.appendChild(wrap);

    player.dmqcMjBar = {
        wrap: wrap,
        host: host,
        text: text,
        swords: Array.prototype.slice.call(host.querySelectorAll("." + MJ_SWORD_CLASS)),
        /// 上一次刷新时的标记数（用来判断"哪几柄是刚点亮的"）
        lastMark: undefined,
    };

    dmqcRefreshMiaojianBar(player);
    return player.dmqcMjBar;
}

/// 按当前标记数刷新：点亮前 N 柄剑；满标记时莲台绽放
export function dmqcRefreshMiaojianBar(player) {
    const bar = player && player.dmqcMjBar;
    if (!bar) return;
    let mark = 0;
    try {
        mark = player.countMark(SGZ_MJ) || 0;
    } catch (e) {}
    if (!(mark >= 0)) mark = 0;
    if (mark > SGZ_MJ_MAX) mark = SGZ_MJ_MAX;

    const isFull = mark >= SGZ_MJ_MAX;
    const gained = typeof bar.lastMark === "number" && mark > bar.lastMark;

    bar.text.textContent = "妙剑 " + mark + "/" + SGZ_MJ_MAX;
    bar.wrap.classList.toggle("full", isFull);

    (bar.swords || []).forEach(function (sword, index) {
        const lit = index < mark;
        sword.classList.toggle("on", lit);
        if (lit && gained && index >= bar.lastMark) {
            // 重新播一次"剑光迸发"：摘类 → 强制重排 → 加类（标准重放手法）
            // ⚠ SVG 元素没有 offsetWidth，所以用 getBoundingClientRect() 触发同步重排
            sword.classList.remove("pop");
            try {
                sword.getBoundingClientRect();
            } catch (e) {}
            sword.classList.add("pop");
        } else if (!lit) {
            sword.classList.remove("pop");
        }
    });

    bar.lastMark = mark;
}

export function dmqcRemoveMiaojianBar(player) {
    const bar = player && player.dmqcMjBar;
    if (!bar) return;
    try {
        bar.wrap.remove();
    } catch (e) {}
    delete player.dmqcMjBar;
}

/// 充能条载体技能（charlotte 隐藏）
export const sunhanhuaUI = {
    charlotte: true,
    forced: true,
    silent: true,
    priority: -10,
    trigger: {
        player: ["enterGame", "addMark", "removeMark"],
        global: ["gameStart", "phaseZhunbeiBegin", "roundStart"],
    },
    init: function (player) {
        dmqcBuildMiaojianBar(player);
    },
    // ⚠ async：见文件头「坑 1」
    async content(event, trigger, player) {
        dmqcRefreshMiaojianBar(player);
    },
    onremove: function (player) {
        dmqcRemoveMiaojianBar(player);
    },
};

// ============================================================
//  三、控制台自检：dmqcSunhanhuaDebug()
// ============================================================
try {
    window.dmqcSunhanhuaDebug = function () {
        const out = {
            "①妙剑标记上限": SGZ_MJ_MAX,
            "②标记名 / 牌标记": SGZ_MJ + " / " + SGZ_MJ_TAG,
        };
        try {
            const list = (game.players || []).concat(game.dead || []);
            out["③各角色标记数"] = list.map(p => p.name + ":" + (p.countMark(SGZ_MJ) || 0)).join("  ");
            out["④全场带标记的手牌"] = list
                .map(p => (dmqcMjHandCards(p).length ? p.name + "×" + dmqcMjHandCards(p).length : null))
                .filter(Boolean)
                .join("  ") || "(无)";
            const bars = list.filter(p => p.dmqcMjBar);
            out["⑤充能条已挂载"] = bars.length ? bars.map(p => p.name).join("  ") : "(无 → init 没跑到)";
            out["⑥光框数量（DOM 实测）"] = document.querySelectorAll("." + MJ_AURA_CLASS).length;
            // 版式实测：这一条是"到底有没有画出来"的铁证
            out["⑦条内 SVG 实测"] = bars
                .map(function (p) {
                    const bar = p.dmqcMjBar;
                    const svg = bar.host ? bar.host.querySelector("svg") : null;
                    const box = svg && svg.getBoundingClientRect ? svg.getBoundingClientRect() : null;
                    return (
                        p.name +
                        "：host " + (bar.host ? bar.host.offsetWidth + "×" + bar.host.offsetHeight : "?") +
                        "，svg " + (box ? Math.round(box.width) + "×" + Math.round(box.height) : "(无)") +
                        "，剑 " + ((bar.swords && bar.swords.length) || 0) + " 柄（亮 " +
                        ((bar.swords || []).filter(s => s.classList.contains("on")).length) + "）"
                    );
                })
                .join("  ") || "(无)";
        } catch (e) {
            out["运行期读取失败"] = String(e);
        }
        console.log("[大梦千秋] 梦孙寒华表现层自检：", out);
        return out;
    };
} catch (e) {}
