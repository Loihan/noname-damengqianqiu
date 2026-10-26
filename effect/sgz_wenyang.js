// ============================================================
//  梦文鸯 · 表现层（纯 UI，无游戏规则）
//    · 霆踪 · 蓝紫雷电进度条：常驻武将牌右侧，实时显示「霆踪标记数 / 动态上限（1~7）」
//      —— 竖直雷能管 + 7 枚电荷节点（**每格内嵌一枚小闪电**：点亮则频闪、未点亮则暗淡）+ 上浮雷电微粒
//    · 仇决 · 血仇暗影：获得「仇决」标记后，给武将牌套上暗红血晕 + 脉动血框
//      + 右上「仇」印 + 上浮烬火
//
//  本文件同时是「霆踪标记名 / 上限 / 仇决标记名 / UI 技能名」的**唯一来源**：
//  `character/sgz_wenyang.js` 从这里 import，避免两处各写一个数字对不上。
//  （方向是 character → effect，**不成环**。）
//
//  设计说明
//  ────────
//  ① 霆踪取「雷」意：一管竖直雷能柱，7 枚电荷节点自下而上点亮，**每格一枚
//     小闪电图标**——点亮的格子里闪电点亮并做真实雷电式的**不规则频闪**（strobe），
//     未点亮的格子里闪电只保留暗淡轮廓、不闪烁；配合蓝→紫渐变与上浮雷电影屑，
//     做出「蓄雷待发」的压迫感。
//  ② 仇决取「仇」意：血仇不是清爽的雷电，而是暗红、粘稠、不祥的怨气。
//     卡面套一圈暗红血晕 + 脉动血框 + 右上朱砂「仇」印 + 上升的烬火。
//
//  踩坑备忘（与同包其它特效一致，务必保留结论）
//  ────────────────────────────
//    · 引擎全局有 `div { display:inline-block; position:absolute; transition:all .5s }`，
//      自定义 UI 的每个 div 都要在类选择器里显式声明 position / display / transition。
//    · 玩家对象本身就是 DOM 元素（Player extends HTMLDivElement），`player.node.avatar`
//      才是可见武将牌；挂进度条/光效一律 `player.appendChild`，定位读 avatar 几何。
//    · content / init 里的表现函数必须走 async 闭包或 init/onremove（见 charlotte 技能），
//      因为引擎的 StepCompiler 会隔离作用域重编译非 async 的 content。
//    · 雷电动态效果只用 opacity（闪电频闪）+ box-shadow/drop-shadow（发光，小元素开销可忽略），
//      prefers-reduced-motion 时全部静止。
// ============================================================

import { dmqcMountParticles } from "./dmqc_particles.js";

// ============================================================
//  一、共享常量（角色文件也从这里 import）
// ============================================================

/// 霆踪标记名（= 技能名；`sgz_tingzong` 就是载体技能）
export const SGZ_WY_TINGZONG = "sgz_tingzong";
/// 霆踪标记上限（进度条分母）
export const SGZ_WY_TINGZONG_MAX = 7;
/// 仇决等级存储键（0/1/2）
export const SGZ_WY_CHOUJUE_LEVEL = "sgz_choujue_level";
/// 仇决标记名（= 技能名）
export const SGZ_WY_CHOUJUE = "sgz_choujue";
/// 霆踪进度条载体技能名（charlotte 隐藏）
export const SGZ_WY_TINGZONG_UI_SKILL = "sgz_wenyang_tingzong_gauge";
/// 仇决特效载体技能名（charlotte 隐藏）
export const SGZ_WY_CHOUJUE_UI_SKILL = "sgz_wenyang_choujue_ui";

// ============================================================
//  二、样式注入（幂等）
// ============================================================

const DMQC_WY_STYLE_ID = "dmqc_wenyang_style";

export function dmqcInjectWenyangStyle() {
    if (typeof document === "undefined" || !document) return;
    if (document.getElementById(DMQC_WY_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = DMQC_WY_STYLE_ID;
    style.innerHTML = `
/* ==========================================================
   梦文鸯 · 霆踪 · 蓝紫雷电进度条（武将牌右侧）
   ========================================================== */
.dmqc-wy-gauge {
    position: absolute;
    left: 100%;
    top: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-sizing: border-box;
    width: 30px;
    height: 100%;
    margin-left: 5px;
    z-index: 50;
    pointer-events: none;
    transition: none;
    --wy-blue: #4a9eff;
    --wy-violet: #a46bff;
    --wy-cyan: #7fd4ff;
    --wy-glow: rgba(122, 140, 255, .75);
    /* 每一格闪电的固定高度：上限变化时格高不变，靠管身（track）拉长。
       实际值由 JS 按「7 格正好撑满管身区域」反推后写入，这里只是兜底默认值 */
    --wy-cell-h: 16px;
}
.dmqc-wy-gauge-brand {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    flex: 0 0 auto;
    margin-bottom: 3px;
    font-family: xiaozhuan, KaiTi, STKaiti, serif;
    font-size: 11px;
    line-height: 1.05;
    letter-spacing: 0;
    color: #bcd2ff;
    text-shadow: 0 0 6px rgba(120, 150, 255, .95), 0 1px 2px #000;
    transition: none;
}
/* 管身区域：固定撑满（品牌与读数之间）；ghost 给出满槽轮廓，真正的管身从下往上长高 */
.dmqc-wy-gauge-region {
    position: relative;
    display: block;
    flex: 1 1 auto;
    width: 18px;
    min-height: 20px;
    transition: none;
}
/* 幽灵满槽：淡虚线轮廓，标出「7 格全部长满」后的形状，短的时候也有完整参照 */
.dmqc-wy-gauge-ghost {
    position: absolute;
    left: 0;
    top: 0;
    display: block;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    border-radius: 8px;
    border: 1px dashed rgba(138, 123, 255, .3);
    background:
        repeating-linear-gradient(0deg, rgba(138, 123, 255, .055) 0 1px, rgba(138, 123, 255, 0) 1px 6px),
        rgba(7, 10, 24, .18);
    box-shadow: inset 0 0 10px rgba(0, 0, 0, .55);
    transition: none;
}
/* 雷能管身：绝对定位贴底，高度随上限格数从下往上长高 */
.dmqc-wy-gauge-track {
    position: absolute;
    left: 0;
    bottom: 0;
    display: block;
    width: 100%;
    box-sizing: border-box;
    border-radius: 8px;
    overflow: hidden;
    background-color: #050814;
    background-image: url('extension/大梦千秋/image/sgz_wenyang_gauge_track.svg');
    background-size: 100% 100%;
    background-repeat: no-repeat;
    border: 1px solid rgba(138, 123, 255, .55);
    box-shadow:
        inset 0 0 8px rgba(0, 0, 0, .92),
        0 0 10px rgba(90, 120, 255, .22),
        0 1px 4px rgba(0, 0, 0, .7);
    transition: border-color .35s ease, box-shadow .35s ease;
}
/* 管身长高时的短暂「迸发」闪光 */
.dmqc-wy-gauge-track.grow {
    animation: dmqc-wy-track-grow .6s ease-out;
}
@keyframes dmqc-wy-track-grow {
    0% {
        border-color: #eaf4ff;
        box-shadow: 0 0 6px rgba(140, 170, 255, .8), 0 0 26px rgba(170, 140, 255, 1);
    }
    100% {
        border-color: rgba(138, 123, 255, .55);
        box-shadow: inset 0 0 8px rgba(0, 0, 0, .92), 0 0 10px rgba(90, 120, 255, .22), 0 1px 4px rgba(0, 0, 0, .7);
    }
}
/* 电荷节点（离散刻度，自下而上：index 0 在最底部；每格内嵌一枚小闪电） */
.dmqc-wy-gauge-cells {
    position: relative;
    display: flex;
    flex-direction: column-reverse;
    box-sizing: border-box;
    width: 100%;
    padding: 2px 1.5px;
    gap: 2px;
    transition: none;
}
.dmqc-wy-gauge-cells i {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    height: var(--wy-cell-h, 13px);
    border-radius: 3px;
    color: #5a6584;                     /* 未激活：暗淡的闪电颜色 */
    background: rgba(9, 12, 28, .62);
    border: 1px solid rgba(138, 123, 255, .16);
    box-sizing: border-box;
    overflow: hidden;
    transition: background .3s ease, box-shadow .3s ease, border-color .3s ease, color .3s ease;
}
/* 格子内的小闪电：未激活 = 暗淡轮廓、不闪烁 */
.dmqc-wy-gauge-cells i svg {
    display: block;
    width: 58%;
    height: 58%;
    opacity: .2;
    filter: grayscale(.2) brightness(.62);
    transition: opacity .3s ease, filter .3s ease;
}
/* 已点亮：格子发光 + 闪电点亮并做雷电频闪 */
.dmqc-wy-gauge-cells i.on {
    color: #eaf4ff;
    background: linear-gradient(180deg, #16224e 0%, #1c2f78 55%, #101538 100%);
    border-color: rgba(223, 240, 255, .82);
    box-shadow: 0 0 8px rgba(120, 150, 255, .7), inset 0 0 6px rgba(120, 150, 255, .3);
}
.dmqc-wy-gauge-cells i.on svg {
    opacity: 1;
    filter: drop-shadow(0 0 2.5px rgba(160, 200, 255, .95)) drop-shadow(0 0 6px rgba(140, 110, 255, .6));
    animation: dmqc-wy-cell-bolt 1.4s ease-in-out infinite;
}
/* 点亮的闪电：不规则频闪，像真的在放电 */
@keyframes dmqc-wy-cell-bolt {
    0%, 100% { opacity: 1; }
    7%       { opacity: .42; }
    9%       { opacity: 1; }
    12%      { opacity: .6; }
    14%      { opacity: 1; }
    48%      { opacity: .7; }
    50%      { opacity: 1; }
    70%      { opacity: .5; }
    72%      { opacity: 1; }
}
/* 最上一枚点亮的节点：整格蓄能脉动 */
.dmqc-wy-gauge-cells i.tip {
    animation: dmqc-wy-cell-pulse 1.2s ease-in-out infinite;
}
@keyframes dmqc-wy-cell-pulse {
    0%, 100% { box-shadow: 0 0 6px rgba(120, 150, 255, .7), inset 0 0 4px rgba(120, 150, 255, .28); }
    50%      { box-shadow: 0 0 14px rgba(200, 220, 255, 1), inset 0 0 8px rgba(120, 150, 255, .5); }
}
/* 新长出来的格子：一次性「迸发」入场（随后 JS 摘类，回归正常态） */
.dmqc-wy-gauge-cells i.pop {
    animation: dmqc-wy-cell-pop .7s ease-out both;
}
@keyframes dmqc-wy-cell-pop {
    0%   { opacity: 0; box-shadow: 0 0 16px #ffffff, 0 0 30px rgba(170, 140, 255, 1); }
    45%  { opacity: 1; box-shadow: 0 0 10px rgba(200, 220, 255, .9); }
    100% { opacity: 1; }
}

/* 读数：霆踪标记数 / 动态上限 */
.dmqc-wy-gauge-read {
    position: relative;
    display: block;
    flex: 0 0 auto;
    margin-top: 3px;
    padding: 1px 2px;
    border-radius: 4px;
    font-family: yuanli, KaiTi, serif;
    font-size: 9.5px;
    line-height: 1.1;
    letter-spacing: 0;
    white-space: nowrap;
    text-align: center;
    color: #9fb8ff;
    background: rgba(6, 10, 26, .85);
    border: 1px solid rgba(138, 123, 255, .4);
    text-shadow: 0 1px 2px #000;
    transition: none;
}
.dmqc-wy-gauge-read b {
    font-weight: bold;
    color: #eaf2ff;
    font-size: 10.5px;
}
.dmqc-wy-gauge-read i {
    font-style: normal;
    margin: 0 1px;
    color: rgba(164, 140, 255, .9);
}
/* 满雷：蓄满待发，外发光 + 闪电频闪加速强化 */
.dmqc-wy-gauge.full .dmqc-wy-gauge-track {
    border-color: rgba(200, 220, 255, .95);
    box-shadow: inset 0 0 8px rgba(0, 0, 0, .88), 0 0 16px rgba(122, 140, 255, .85), 0 1px 4px rgba(0, 0, 0, .7);
}
.dmqc-wy-gauge.full .dmqc-wy-gauge-brand { color: #eaf2ff; }
.dmqc-wy-gauge.full .dmqc-wy-gauge-cells i.on svg {
    animation-duration: .9s;
    filter: drop-shadow(0 0 3px #ffffff) drop-shadow(0 0 9px rgba(160, 120, 255, .95));
}
/* 空雷：已然耗尽，整体压暗 */
.dmqc-wy-gauge.void .dmqc-wy-gauge-track { border-color: rgba(138, 123, 255, .28); box-shadow: inset 0 0 8px rgba(0, 0, 0, .95); }
.dmqc-wy-gauge.void .dmqc-wy-gauge-read { opacity: .62; }

/* ==========================================================
   梦文鸯 · 仇决 · 血仇暗影（套在武将牌上）
   ========================================================== */
.dmqc-wy-choujue {
    position: absolute;
    left: 0;
    top: 0;
    display: block;
    box-sizing: border-box;
    border-radius: 8px;
    pointer-events: none;
    z-index: 48;
    opacity: 0;
    transition: opacity .45s ease;
    --cj-red: #ff3b30;
    --cj-glow: rgba(255, 59, 48, .55);
}
.dmqc-wy-choujue.on { opacity: 1; }
/* 血晕：从中心透明到四周暗红，做出"怨气缠身"的压迫感 */
.dmqc-wy-choujue-vignette {
    position: absolute;
    left: 0; top: 0;
    display: block;
    width: 100%; height: 100%;
    border-radius: inherit;
    background: radial-gradient(130% 130% at 50% 46%, rgba(120, 10, 24, 0) 40%, rgba(140, 12, 28, .32) 72%, rgba(78, 4, 14, .62) 100%);
    transition: none;
}
/* 脉动血框 */
.dmqc-wy-choujue-frame {
    position: absolute;
    left: 0; top: 0;
    display: block;
    width: 100%; height: 100%;
    border-radius: inherit;
    border: 2px solid rgba(255, 70, 54, .72);
    box-shadow:
        0 0 0 1px rgba(0, 0, 0, .6),
        0 0 18px rgba(255, 60, 40, .55),
        inset 0 0 20px rgba(180, 20, 40, .4);
    animation: dmqc-wy-cj-frame 1.8s ease-in-out infinite;
    transition: none;
}
@keyframes dmqc-wy-cj-frame {
    0%, 100% {
        box-shadow: 0 0 0 1px rgba(0, 0, 0, .6), 0 0 14px rgba(255, 60, 40, .5), inset 0 0 16px rgba(180, 20, 40, .34);
        border-color: rgba(255, 70, 54, .7);
    }
    50% {
        box-shadow: 0 0 0 1px rgba(0, 0, 0, .6), 0 0 26px rgba(255, 90, 60, .85), inset 0 0 24px rgba(200, 20, 40, .5);
        border-color: rgba(255, 120, 90, .95);
    }
}
/* 右上朱砂「仇」印 */
.dmqc-wy-choujue-seal {
    position: absolute;
    top: -6px;
    right: -6px;
    display: block;
    width: 26px;
    height: 26px;
    line-height: 24px;
    box-sizing: border-box;
    border-radius: 6px;
    text-align: center;
    font-family: xiaozhuan, KaiTi, STKaiti, serif;
    font-size: 17px;
    font-weight: bold;
    color: #ffe9e4;
    background: radial-gradient(circle at 35% 28%, #ff8a70 0%, #c81f2e 55%, #5c0a14 100%);
    border: 1.5px solid rgba(255, 220, 210, .85);
    box-shadow: 0 0 12px rgba(255, 60, 40, .8), inset 0 0 5px rgba(0, 0, 0, .45);
    transform: rotate(6deg);
    transition: none;
    animation: dmqc-wy-cj-seal 1.6s ease-in-out infinite;
}
@keyframes dmqc-wy-cj-seal {
    0%, 100% { box-shadow: 0 0 10px rgba(255, 60, 40, .7), inset 0 0 5px rgba(0, 0, 0, .45); }
    50%      { box-shadow: 0 0 20px rgba(255, 120, 90, .95), inset 0 0 6px rgba(0, 0, 0, .4); }
}
/* 上浮烬火层（dmqcMountParticles 挂进来的 .dmqc-fx-field）：不设 z-index，
   让其按 DOM 顺序排在血框与「仇」印之下、血晕之上 —— 烬火从卡内升起、被血框压住边缘。 */

/* 无障碍：减弱动态效果 */
@media (prefers-reduced-motion: reduce) {
    .dmqc-wy-gauge-track.grow,
    .dmqc-wy-gauge-cells i.on svg,
    .dmqc-wy-gauge-cells i.tip,
    .dmqc-wy-gauge-cells i.pop,
    .dmqc-wy-choujue-frame,
    .dmqc-wy-choujue-seal {
        animation: none !important;
    }
}
`;
    document.head.appendChild(style);
}

// ============================================================
//  三、霆踪 · 蓝紫雷电进度条
// ============================================================

/// 取可见武将牌（avatar）的几何。读不到（尚未布局完成）返回 null。
function dmqcWenyangAvatarRect(player) {
    try {
        const ava = player.node && player.node.avatar;
        if (!ava || !ava.offsetWidth || !ava.offsetHeight) return null;
        return {
            left: ava.offsetLeft,
            top: ava.offsetTop,
            width: ava.offsetWidth,
            height: ava.offsetHeight,
        };
    } catch (e) {
        return null;
    }
}

/// 霆踪进度条的「动态上限」：= 惊跃每回合使用上限 X = 已开始的回合数（1~7）。
/// ⚠ 与 character/sgz_wenyang.js 的 `sgzTurnCount()` 保持**同一套算法**（读每个人 `actionHistory.length` 取 max），
///    保证显示的上限与惊跃实际次数上限一致；只在这里额外夹到 [1, 7]（开局显示 1 格，不显示 0）。
export function dmqcWenyangTingzongCap() {
    try {
        if (typeof game === "undefined" || !game) return 1;
        const players = (game.players || []).slice(0).concat(game.dead || []);
        let num = 0;
        for (const current of players) {
            if (current && current.actionHistory) num = Math.max(num, current.actionHistory.length - 1);
        }
        return Math.min(Math.max(num, 1), SGZ_WY_TINGZONG_MAX);
    } catch (e) {
        return 1;
    }
}

/// 把进度条对齐到「可见武将牌」右边缘（撑满武将牌高度，品牌在上、读数在下、管身从下往上长高）。
/// 每格高度按「7 格正好撑满管身区域」反推（保持原有比例），换上限只改格数、不改格高。
function dmqcSyncWenyangGaugeGeometry(player, gauge) {
    const rect = dmqcWenyangAvatarRect(player);
    if (!rect) {
        if (gauge._geo === "fallback") return;
        gauge._geo = "fallback";
        gauge.wrap.style.left = "100%";
        gauge.wrap.style.top = "0px";
        gauge.wrap.style.marginLeft = "5px";
        return;
    }
    const left = rect.left + rect.width + 5;
    const top = rect.top;
    const height = rect.height;

    // 1) 先把 wrap 撑满武将牌（品牌/读数位置随之固定）
    const posSig = left + "|" + top + "|" + height;
    if (gauge._geo !== posSig) {
        gauge._geo = posSig;
        gauge.wrap.style.left = left + "px";
        gauge.wrap.style.top = top + "px";
        gauge.wrap.style.height = height + "px";
        gauge.wrap.style.marginLeft = "0px";
    }

    // 2) 量管身区域高度，反推每格高度（7 格正好填满）
    const regionH = (gauge.region && gauge.region.offsetHeight) || (height - 48);
    const trackOverhead = 18; // 管身上下 padding 4 + 6 条 gap 12 + 边框 2
    const cellH = Math.max(8, Math.floor((regionH - trackOverhead) / 7));
    if (gauge._cellH !== cellH) {
        gauge._cellH = cellH;
        gauge.wrap.style.setProperty("--wy-cell-h", cellH + "px");
    }
}

/// 建一枚格内小闪电（内联 SVG，fill 用 currentColor：颜色交给格子 CSS 的 color 控制，
/// 未点亮 = 暗淡、点亮 = 明亮；发光交给 svg 上的 drop-shadow，不依赖外部图片文件）
function dmqcWenyangCellBoltSvg() {
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");

    const bolt = document.createElementNS(NS, "path");
    // 经典闪电形状（Material "bolt" 轮廓）
    bolt.setAttribute(
        "d",
        "M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z"
    );
    bolt.setAttribute("fill", "currentColor");
    svg.appendChild(bolt);
    return svg;
}

/// 重建电荷节点（上限变化时才调用；每格高度固定，格数 = 动态上限）
function dmqcRebuildTingzongCells(gauge, cap) {
    const oldCap = gauge._cap;
    const cells = gauge.cells;
    while (cells.firstChild) cells.removeChild(cells.firstChild);
    const nodes = [];
    for (let i = 0; i < cap; i++) {
        const seg = document.createElement("i");
        seg.appendChild(dmqcWenyangCellBoltSvg());
        cells.appendChild(seg);
        nodes.push(seg);
    }
    gauge.nodes = nodes;
    gauge._cap = cap;

    // 上限 +1 时：管身闪一下「迸发」，并让新出现的顶部格子做一次性入场（随后自动摘类）
    if (oldCap >= 0 && cap > oldCap) {
        try {
            const track = gauge.track;
            track.classList.remove("grow");
            void track.offsetWidth; // 强制重排，重放动画
            track.classList.add("grow");
        } catch (e) {}
        for (let i = oldCap; i < cap; i++) {
            const node = nodes[i];
            if (!node) continue;
            node.classList.add("pop");
            (function (n) {
                setTimeout(function () {
                    try {
                        n.classList.remove("pop");
                    } catch (e) {}
                }, 760);
            })(node);
        }
    }
}

/// 把「分子 / 分母」画上去
function dmqcPaintTingzongGauge(gauge, marks, cap) {
    const nodes = gauge.nodes || [];
    const lit = Math.min(marks, cap);
    for (let i = 0; i < nodes.length; i++) {
        const on = i < lit;
        const node = nodes[i];
        if (node.classList.contains("on") !== on) node.classList.toggle("on", on);
        node.classList.toggle("tip", on && i === lit - 1);
    }
    gauge.cur.textContent = String(marks);
    gauge.tot.textContent = cap > 0 ? String(cap) : "—";
    gauge.wrap.classList.toggle("full", cap > 0 && marks >= cap);
    gauge.wrap.classList.toggle("void", marks <= 0);
    gauge.wrap.title = "霆踪标记数：" + marks + " / " + cap + "（惊跃每回合可使用 " + cap + " 次）";
}

/// 在武将牌右侧建立雷能进度条（已存在则先移除重建）
export function dmqcBuildTingzongGauge(player) {
    try {
        dmqcInjectWenyangStyle();
    } catch (e) {}
    if (player.dmqcTingzongGauge) {
        try {
            player.dmqcTingzongGauge.wrap.remove();
        } catch (e) {}
        delete player.dmqcTingzongGauge;
    }
    const wrap = document.createElement("div");
    wrap.className = "dmqc-wy-gauge";
    wrap.setAttribute("aria-hidden", "true");

    const brand = document.createElement("div");
    brand.className = "dmqc-wy-gauge-brand";
    brand.innerHTML = "<span>霆</span><span>踪</span>";

    const region = document.createElement("div");
    region.className = "dmqc-wy-gauge-region";

    const ghost = document.createElement("div");
    ghost.className = "dmqc-wy-gauge-ghost";

    const track = document.createElement("div");
    track.className = "dmqc-wy-gauge-track";

    const cells = document.createElement("div");
    cells.className = "dmqc-wy-gauge-cells";

    track.appendChild(cells);
    region.appendChild(ghost);
    region.appendChild(track);

    const read = document.createElement("div");
    read.className = "dmqc-wy-gauge-read";
    const cur = document.createElement("b");
    cur.textContent = "0";
    const slash = document.createElement("i");
    slash.textContent = "/";
    const tot = document.createElement("span");
    tot.textContent = "1"; // 初始动态上限（首回合 = 1）；随后由 dmqcPaintTingzongGauge 按实际回合数更新
    read.appendChild(cur);
    read.appendChild(slash);
    read.appendChild(tot);

    wrap.appendChild(brand);
    wrap.appendChild(region);
    wrap.appendChild(read);

    // 雷电上浮微粒（复用通用动效层，追加在最上层，给整条进度条再添一层"电芒"）
    try {
        dmqcMountParticles(wrap, "wenyang", { count: 8 });
    } catch (e) {}

    player.appendChild(wrap);

    player.dmqcTingzongGauge = {
        wrap,
        brand,
        region,
        ghost,
        track,
        cells,
        read,
        cur,
        tot,
        nodes: [],
        _cap: -1,
        _sig: "",
        _geo: "",
        _cellH: -1,
    };
    return player.dmqcTingzongGauge;
}

/**
 * 刷新雷能进度条：分子 = 当前「霆踪」标记数，分母 = 动态上限（惊跃每回合次数上限，1~7）。
 * 幂等、带签名短路；任何异常静默，绝不影响技能结算。
 */
export function dmqcRefreshTingzongGauge(player) {
    try {
        if (!player || player.removed) return;
        if (player.isOut && player.isOut()) return;
        if (player.hasSkill && !player.hasSkill(SGZ_WY_TINGZONG_UI_SKILL)) {
            if (player.dmqcTingzongGauge) {
                try {
                    player.dmqcTingzongGauge.wrap.remove();
                } catch (e) {}
                delete player.dmqcTingzongGauge;
            }
            return;
        }
        const marks = Math.max(0, player.countMark ? player.countMark(SGZ_WY_TINGZONG) || 0 : 0);
        const cap = dmqcWenyangTingzongCap();
        if (!player.dmqcTingzongGauge) dmqcBuildTingzongGauge(player);
        const gauge = player.dmqcTingzongGauge;
        if (!gauge) return;

        // 上限变化 → 先重建格子（每格高度固定，管身随格数拉长）
        const capChanged = gauge._cap !== cap;
        if (capChanged) dmqcRebuildTingzongCells(gauge, cap);

        // 卡面几何可能随布局/窗口变化，先对齐（底部对齐，管身从下往上长高）
        dmqcSyncWenyangGaugeGeometry(player, gauge);

        const sig = marks + "/" + cap;
        if (!capChanged && gauge._sig === sig) return;
        gauge._sig = sig;
        dmqcPaintTingzongGauge(gauge, marks, cap);
    } catch (e) {
        // 表现层异常静默
    }
}

/** 轮询兜底：标记变化最迟下一拍体现在进度条上 */
function dmqcStartTingzongPolling(player) {
    try {
        if (player.dmqcTingzongGaugeTimer) clearInterval(player.dmqcTingzongGaugeTimer);
        player.dmqcTingzongGaugeTimer = setInterval(function () {
            dmqcRefreshTingzongGauge(player);
        }, 460);
    } catch (e) {}
}

/**
 * 霆踪 · 蓝紫雷电进度条（charlotte UI 技能，挂在 character/sgz_wenyang.js 的 skills 里）
 * 不参与任何规则结算，只负责把「霆踪标记数 / 动态上限」常驻显示在武将牌右侧。
 */
export const tingzongGaugeUI = {
    charlotte: true,
    silent: true,
    forced: true,
    priority: -10,
    trigger: {
        player: ["enterGame", "addMark", "removeMark", "phaseBegin", "phaseAfter"],
        global: ["gameStart", "phaseBeginStart", "roundStart"],
    },
    init(player) {
        try {
            dmqcInjectWenyangStyle();
        } catch (e) {}
        try {
            dmqcRefreshTingzongGauge(player);
        } catch (e) {}
        dmqcStartTingzongPolling(player);
    },
    // ⚠ async：StepCompiler 会隔离作用域重编译 step 写法，模块函数会 ReferenceError。
    async content(event, trigger, player) {
        try {
            dmqcRefreshTingzongGauge(player);
        } catch (e) {}
    },
    onremove(player) {
        if (player.dmqcTingzongGaugeTimer) {
            try {
                clearInterval(player.dmqcTingzongGaugeTimer);
            } catch (e) {}
            delete player.dmqcTingzongGaugeTimer;
        }
        if (player.dmqcTingzongGauge) {
            try {
                player.dmqcTingzongGauge.wrap.remove();
            } catch (e) {}
            delete player.dmqcTingzongGauge;
        }
    },
};

// ============================================================
//  四、仇决 · 血仇暗影
// ============================================================

/// 把血仇光效对齐到可见武将牌（内部带签名短路）。
function dmqcSyncWenyangAuraGeometry(player, aura) {
    const rect = dmqcWenyangAvatarRect(player);
    const sig = rect ? rect.left + "|" + rect.top + "|" + rect.width + "|" + rect.height : "x";
    if (aura._geo === sig) return;
    aura._geo = sig;
    if (rect) {
        aura.wrap.style.left = rect.left + "px";
        aura.wrap.style.top = rect.top + "px";
        aura.wrap.style.width = rect.width + "px";
        aura.wrap.style.height = rect.height + "px";
    } else {
        aura.wrap.style.left = "0px";
        aura.wrap.style.top = "0px";
        aura.wrap.style.width = "100%";
        aura.wrap.style.height = "100%";
    }
}

/** 在武将牌上建立血仇暗影层（已存在则先移除重建） */
export function dmqcBuildChoujueAura(player) {
    try {
        dmqcInjectWenyangStyle();
    } catch (e) {}
    if (player.dmqcChoujueAura) {
        try {
            player.dmqcChoujueAura.wrap.remove();
        } catch (e) {}
        delete player.dmqcChoujueAura;
    }
    const wrap = document.createElement("div");
    wrap.className = "dmqc-wy-choujue";
    wrap.setAttribute("aria-hidden", "true");

    const vignette = document.createElement("div");
    vignette.className = "dmqc-wy-choujue-vignette";

    wrap.appendChild(vignette);
    try {
        dmqcMountParticles(wrap, "wenyang_choujue", { count: 10, opacity: 0.6 });
    } catch (e) {}

    const frame = document.createElement("div");
    frame.className = "dmqc-wy-choujue-frame";

    const seal = document.createElement("div");
    seal.className = "dmqc-wy-choujue-seal";
    seal.textContent = "仇";

    wrap.appendChild(frame);
    wrap.appendChild(seal);
    player.appendChild(wrap);

    player.dmqcChoujueAura = {
        wrap,
        frame,
        seal,
        _geo: "",
        _on: false,
    };
    return player.dmqcChoujueAura;
}

/** 刷新血仇光效：有「仇决」标记则点亮，否则隐藏。幂等。 */
export function dmqcRefreshChoujueAura(player) {
    try {
        if (!player || player.removed) return;
        if (player.isOut && player.isOut()) return;
        if (player.hasSkill && !player.hasSkill(SGZ_WY_CHOUJUE_UI_SKILL)) {
            if (player.dmqcChoujueAura) {
                try {
                    player.dmqcChoujueAura.wrap.remove();
                } catch (e) {}
                delete player.dmqcChoujueAura;
            }
            return;
        }
        // 需求：红色「仇」框 = **仇决 2 级**时才点亮（等级存在 storage[sgz_choujue_level]）
        const on = !!(player.storage && player.storage[SGZ_WY_CHOUJUE_LEVEL] === 2);
        if (!player.dmqcChoujueAura) dmqcBuildChoujueAura(player);
        const aura = player.dmqcChoujueAura;
        if (!aura) return;
        dmqcSyncWenyangAuraGeometry(player, aura);
        if (aura._on !== on) {
            aura._on = on;
            aura.wrap.classList.toggle("on", on);
            aura.wrap.title = on ? "仇决·成功：你已获得【催灭】" : "";
        }
    } catch (e) {
        // 表现层异常静默
    }
}

/**
 * 仇决 · 血仇暗影（charlotte UI 技能）
 * 获得「仇决」标记后给武将牌套上暗红血晕 + 脉动血框 + 右上「仇」印。
 */
export const choujueUI = {
    charlotte: true,
    silent: true,
    forced: true,
    priority: -9,
    trigger: {
        player: ["enterGame", "addMark", "removeMark"],
        global: ["gameStart", "phaseBeginStart", "roundStart"],
    },
    init(player) {
        try {
            dmqcInjectWenyangStyle();
        } catch (e) {}
        try {
            dmqcRefreshChoujueAura(player);
        } catch (e) {}
        // 成功标记写在 storage 里（不产生 addMark），用轮询兜底刷新
        try {
            if (player.dmqcChoujueAuraTimer) clearInterval(player.dmqcChoujueAuraTimer);
            player.dmqcChoujueAuraTimer = setInterval(function () {
                dmqcRefreshChoujueAura(player);
            }, 460);
        } catch (e) {}
    },
    async content(event, trigger, player) {
        try {
            dmqcRefreshChoujueAura(player);
        } catch (e) {}
    },
    onremove(player) {
        if (player.dmqcChoujueAuraTimer) {
            try {
                clearInterval(player.dmqcChoujueAuraTimer);
            } catch (e) {}
            delete player.dmqcChoujueAuraTimer;
        }
        if (player.dmqcChoujueAura) {
            try {
                player.dmqcChoujueAura.wrap.remove();
            } catch (e) {}
            delete player.dmqcChoujueAura;
        }
    },
};

// ============================================================
//  五、控制台自检：dmqcWenyangDebug()
// ============================================================
try {
    window.dmqcWenyangDebug = function () {
        const out = {
            "①霆踪标记名": SGZ_WY_TINGZONG,
            "②霆踪最大上限": SGZ_WY_TINGZONG_MAX,
            "③当前动态上限": dmqcWenyangTingzongCap(),
            "④仇决标记名": SGZ_WY_CHOUJUE,
        };
        try {
            const list = (game.players || []).concat(game.dead || []);
            out["⑤各角色标记数"] = list
                .map(p => p.name + ":" + (p.countMark(SGZ_WY_TINGZONG) || 0) + "霆/" + (p.countMark(SGZ_WY_CHOUJUE) || 0) + "仇")
                .join("  ");
            out["⑥进度条已挂载"] = list.filter(p => p.dmqcTingzongGauge).map(p => p.name).join("  ") || "(无)";
            out["⑦仇决光效已点亮（成功分支）"] = list.filter(p => p.dmqcChoujueAura && p.dmqcChoujueAura._on).map(p => p.name).join("  ") || "(无)";
            out["⑧仇决等级"] = list.map(p => p.name + ":" + ((p.storage && p.storage[SGZ_WY_CHOUJUE_LEVEL]) || 1) + "级").join("  ");
        } catch (e) {
            out["运行期读取失败"] = String(e);
        }
        console.log("[大梦千秋] 梦文鸯表现层自检：", out);
        return out;
    };
} catch (e) {}
