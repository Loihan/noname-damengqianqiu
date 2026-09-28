// ============================================================
//  大梦千秋 · 通用动态装饰层（上浮微粒 + 选中卡斜向扫光）
//  纯表现层，无游戏规则。由各 effect/sgz_*.js 通过 import 复用。
//
//  设计约定（源自「梦魏延·壮誓」框的观感）：
//    · 微粒：底部升起的小光点，逐颗独立 尺寸/横向漂移/周期/延迟，
//      只动 transform + opacity（合成器属性，不掉帧）。
//    · 扫光：选中卡上一道 115° 高光缓慢横扫，与 box-shadow 脉动叠加出层次。
//
//  两个必须遵守的坑：
//    1) 引擎的 ui.create.div 只解析带 "." / "#" 前缀的类名串，传无点号字符串
//       会得到空 className。本模块一律走 document.createElement + className。
//    2) 横向漂移必须由 JS 写成变量（--fx-dx）再由 CSS 读取。
//       在 keyframes 里写 calc(Math.random() * 40px) 是非法 CSS，
//       整条 transform 会被丢弃，微粒只会原地闪烁（本包陆逊余烬即此症状）。
// ============================================================

const DMQC_FX_STYLE_ID = "dmqc_fx_style";

// 主题预设：colors/size/dur/dy/dx 均为 [min, max]
const DMQC_FX_THEMES = {
    // 梦关羽 · 血渊焚刃：血火星屑 + 锁链尘
    guanyu: {
        count: 14,
        colors: ["#ffb36a", "#e8452a", "#ff7a4a"],
        size: [2, 4],
        dur: [5.2, 8.4],
        dy: [260, 430],
        dx: [10, 34],
        glow: "#ff7a2a",
    },
    // 梦吕布 · 夜穹裂晶猎场：左青右品红的能量晶屑
    lvbu: {
        count: 14,
        colors: ["#45d8ff", "#ff3fd0", "#9ff0ff"],
        size: [2, 4],
        dur: [4.8, 7.8],
        dy: [240, 410],
        dx: [12, 38],
        glow: "#45d8ff",
    },
    // 梦曹髦 · 缚渊帝诏：金色诏令碎屑（细碎方屑，比圆点更像"金粉"）
    caomao: {
        count: 13,
        colors: ["#f2d57e", "#ffd76a", "#c9a45e"],
        size: [2, 4],
        dur: [6.0, 9.2],
        dy: [260, 450],
        dx: [8, 26],
        glow: "#f2d57e",
        radius: "1px",
    },
    // 梦陆逊 · 业火焚天：余烬（橙火 + 连营青绿余芒）
    luxun: {
        count: 16,
        colors: ["#ffaa00", "#ff6a1a", "#8fd9ac"],
        size: [2, 5],
        dur: [4.4, 7.4],
        dy: [220, 410],
        dx: [14, 44],
        glow: "#ff8a2a",
    },
    // 梦魏延 · 壮誓（已有自带火星，此处备用于其它挂点）
    weiyan: {
        count: 12,
        colors: ["#ffb36a", "#e0452a"],
        size: [2, 4],
        dur: [5.2, 7.4],
        dy: [260, 380],
        dx: [8, 30],
        glow: "#ff7a2a",
    },
    // 梦杜预 · 武库开阖：竹青碎屑 + 青铜火星（细长条，像被劈开的竹丝）
    duyu: {
        count: 15,
        colors: ["#8fe4b4", "#c8a15c", "#5cbb8b"],
        size: [2, 4],
        dur: [5.4, 8.6],
        dy: [250, 430],
        dx: [10, 36],
        glow: "#6fd39a",
        radius: "1.5px",
    },
    // 梦杜预 · 倾势失败「武库化烬 · 神兵现世」：幽紫电屑 + 冷银铁末
    duyu_fail: {
        count: 16,
        colors: ["#c3b0ff", "#9aa8c4", "#8f7dff"],
        size: [2, 4],
        dur: [4.8, 8.0],
        dy: [240, 430],
        dx: [12, 40],
        glow: "#a98cff",
        radius: "1px",
    },
    // 梦孙寒华 · 妙剑：青玉剑气（青绿碎芒，上浮略快，配充能条与手牌卡框）
    sunhanhua: {
        count: 12,
        colors: ["#5ef1c0", "#a8ffe6", "#2fd6a6"],
        size: [2, 4],
        dur: [4.2, 6.8],
        dy: [220, 400],
        dx: [10, 32],
        glow: "#59f0c4",
    },
};

function dmqcFxRand(range) {
    const a = range[0];
    const b = range[1];
    return a + Math.random() * (b - a);
}

// 注入通用 keyframes 与类（幂等）。全部走类选择器，避免内联样式的重置问题。
function dmqcInjectFxStyle() {
    if (typeof document === "undefined" || !document) return;
    if (document.getElementById(DMQC_FX_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = DMQC_FX_STYLE_ID;
    style.innerHTML = `
/* ---------- 上浮微粒 ---------- */
@keyframes dmqc-fx-rise {
    0%   { opacity: 0; transform: translate3d(0, 0, 0) scale(.6); }
    14%  { opacity: var(--fx-peak, .8); }
    70%  { opacity: calc(var(--fx-peak, .8) * .45); }
    100% { opacity: 0; transform: translate3d(var(--fx-dx, 0px), var(--fx-dy, -320px), 0) scale(.3); }
}
.dmqc-fx-field {
    position: absolute;
    left: 0; top: 0;
    width: 100%; height: 100%;
    overflow: hidden;
    border-radius: inherit;
    pointer-events: none;
}
.dmqc-fx-mote {
    position: absolute;
    bottom: -8px;
    display: block;
    border-radius: 50%;
    opacity: 0;
    animation: dmqc-fx-rise var(--fx-dur, 6s) linear infinite;
    animation-delay: var(--fx-delay, 0s);
}

/* ---------- 选中卡斜向扫光 ---------- */
@keyframes dmqc-fx-sheen {
    from { background-position: 135% 0; }
    to   { background-position: -35% 0; }
}
.dmqc-fx-sheen {
    position: absolute;
    left: 0; top: 0;
    width: 100%; height: 100%;
    border-radius: inherit;
    pointer-events: none;
    opacity: 0;
    background: linear-gradient(115deg,
        rgba(255,235,205,0) 32%,
        var(--fx-sheen, rgba(255,235,205,.16)) 47%,
        rgba(255,235,205,0) 62%);
    background-size: 260% 100%;
}
.dmqc-fx-sheen.on {
    opacity: 1;
    animation: dmqc-fx-sheen 2.8s ease-in-out infinite;
}

/* 无障碍：减弱动态效果时，微粒整体隐去、扫光停止 */
@media (prefers-reduced-motion: reduce) {
    .dmqc-fx-mote { animation: none !important; opacity: 0 !important; }
    .dmqc-fx-sheen.on { animation: none !important; opacity: 0 !important; }
}
`;
    document.head.appendChild(style);
}

/**
 * 在宿主面板上挂一层上浮微粒。
 * @param {HTMLElement} host 面板元素（建议是 pointer-events 无关的底板层）
 * @param {string} theme 主题名（DMQC_FX_THEMES 的键）
 * @param {object} [opts] { count, opacity, before }
 *   before：插入到该元素之前（用于把微粒层夹在"装饰层"与"正文"之间）；
 *           省略则追加到宿主末尾。
 * @returns {HTMLElement|null} 微粒层元素
 */
export function dmqcMountParticles(host, theme, opts) {
    if (!host) return null;
    try {
        dmqcInjectFxStyle();
    } catch (e) {
        return null;
    }
    const t = DMQC_FX_THEMES[theme] || DMQC_FX_THEMES.caomao;
    const cfg = opts || {};
    const count = cfg.count || t.count;

    const field = document.createElement("div");
    field.className = "dmqc-fx-field";
    field.setAttribute("aria-hidden", "true");

    for (let i = 0; i < count; i++) {
        const mote = document.createElement("i");
        mote.className = "dmqc-fx-mote";
        const size = dmqcFxRand(t.size);
        const color = t.colors[i % t.colors.length];
        const dur = dmqcFxRand(t.dur);
        mote.style.width = size.toFixed(1) + "px";
        mote.style.height = size.toFixed(1) + "px";
        if (t.radius) mote.style.borderRadius = t.radius;
        mote.style.left = (3 + Math.random() * 94).toFixed(2) + "%";
        mote.style.background = color;
        mote.style.boxShadow = "0 0 " + (size + 3).toFixed(0) + "px " + (t.glow || color);
        mote.style.setProperty("--fx-dur", dur.toFixed(2) + "s");
        mote.style.setProperty("--fx-delay", (Math.random() * dur).toFixed(2) + "s");
        mote.style.setProperty("--fx-dy", (-dmqcFxRand(t.dy)).toFixed(0) + "px");
        // 横向漂移：必须由 JS 落成变量，不能在 keyframes 里算
        mote.style.setProperty("--fx-dx", ((Math.random() < 0.5 ? -1 : 1) * dmqcFxRand(t.dx)).toFixed(0) + "px");
        mote.style.setProperty("--fx-peak", (cfg.opacity || 0.55 + Math.random() * 0.4).toFixed(2));
        field.appendChild(mote);
    }

    if (cfg.before && cfg.before.parentNode === host) {
        host.insertBefore(field, cfg.before);
    } else {
        host.appendChild(field);
    }
    return field;
}

/**
 * 在一张选项卡上挂"斜向扫光"子层（须在该卡的 innerHTML 赋值之后调用）。
 * @returns {HTMLElement|null} 扫光元素
 */
export function dmqcMountSheen(card, sheenColor) {
    if (!card) return null;
    try {
        dmqcInjectFxStyle();
    } catch (e) {
        return null;
    }
    const sheen = document.createElement("div");
    sheen.className = "dmqc-fx-sheen";
    if (sheenColor) sheen.style.setProperty("--fx-sheen", sheenColor);
    card.appendChild(sheen);
    return sheen;
}

/**
 * 切换某张卡的扫光开关（通常与"选中态"同步调用）。
 */
export function dmqcToggleSheen(card, on) {
    if (!card) return;
    let sheen = null;
    try {
        sheen = card.querySelector(".dmqc-fx-sheen");
    } catch (e) {}
    if (sheen) sheen.classList.toggle("on", !!on);
}
