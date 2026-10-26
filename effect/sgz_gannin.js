// ============================================================
//  梦甘宁 · 表现层（纯 UI，无游戏规则）
//    · 劫营 · 翡翠劫掠标记：给带「劫营」标记的角色套上
//      —— 翡翠薄晕 + 扫描线（"被锁定为劫掠目标"）+ 脉动绿框 + 左上「劫」印 + 上浮翡翠光屑
//    · 夜魇 · 隐匿埋伏：甘宁本人拥有「夜魇」标记时，在其**主视角**的屏幕最边缘
//      做一圈暗紫暗幕 —— 阴影呼吸 + 冷紫薄雾 + 上浮暗影游丝，营造"潜伏在阴影里"的观感
//
//  本文件同时是「劫营标记名 / 夜魇标记名 / UI 技能名」的**唯一来源**：
//  `character/sgz_gannin.js` 从这里 import，避免两处各写一个字符串对不上。
//  （方向是 character → effect，**不成环**。）
//
//  设计说明
//  ────────
//  ① 劫营取「劫」意：翡翠色（吴势力色）但带"被掠夺"的凌厉感 —— 一道自上而下
//     往复的扫描线表示"你已被劫营锁定"，配左上朱砂绿「劫」印与上浮光屑。
//  ② 夜魇取「魇」意：不是清亮的雷电，而是暗紫、阴沉、潜伏的夜色。边缘暗幕只在
//     甘宁**主视角**（player.isMine()）出现，他人视角看不到 —— 这是"只有自己知道自己
//     正埋伏着"的沉浸式提示。
//
//  踩坑备忘（与同包其它特效一致，务必保留结论）
//  ────────────────────────────
//    · 引擎全局有 `div { display:inline-block; position:absolute; transition:all .5s }`，
//      自定义 UI 的每个 div 都要在类选择器里显式声明 position / display / transition。
//    · 玩家对象本身就是 DOM 元素（Player extends HTMLDivElement），`player.node.avatar`
//      才是可见武将牌；劫营特效 `target.appendChild`，定位读 target.node.avatar 几何。
//    · 夜魇暗幕挂到 `ui.window`（全屏 #window 容器）而不是玩家节点，`pointer-events:none`
//      保证绝不挡操作；只在 `player.isMine()` 时显示。
//    · content / init 里的表现函数必须走 async 闭包或 init/onremove（见 charlotte 技能），
//      因为引擎的 StepCompiler 会隔离作用域重编译非 async 的 content。
//    · 动态效果只用 opacity / transform / box-shadow / background-position（小元素），
//      prefers-reduced-motion 时全部静止。
// ============================================================

import { dmqcMountParticles } from "./dmqc_particles.js";

// ============================================================
//  一、共享常量（角色文件也从这里 import）
// ============================================================

/// 「劫营」标记载体技能名（挂在被选中的角色身上）
export const SGZ_GN_JIEYING_MARK = "sgz_jieying_skip";
/// 「夜魇」标记名（= 技能名，storage 键就是它）
export const SGZ_GN_YEYAN = "sgz_yeyan";
/// 劫营特效载体技能名（charlotte 隐藏，挂在梦甘宁身上）
export const SGZ_GN_JIEYING_UI_SKILL = "sgz_gannin_jieying_ui";
/// 夜魇特效载体技能名（charlotte 隐藏，挂在梦甘宁身上）
export const SGZ_GN_YEYAN_UI_SKILL = "sgz_gannin_yeyan_ui";

// ============================================================
//  二、样式注入（幂等）
// ============================================================

const DMQC_GN_STYLE_ID = "dmqc_gannin_style";

export function dmqcInjectGanninStyle() {
    if (typeof document === "undefined" || !document) return;
    if (document.getElementById(DMQC_GN_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = DMQC_GN_STYLE_ID;
    style.innerHTML = `
/* ==========================================================
   梦甘宁 · 劫营 · 翡翠劫掠标记（套在带标记的武将牌上）
   ========================================================== */
.dmqc-gn-jieying {
    position: absolute;
    left: 0;
    top: 0;
    display: block;
    box-sizing: border-box;
    border-radius: 8px;
    pointer-events: none;
    z-index: 48;
    opacity: 0;
    --jy-green: #4adf9a;
    --jy-emerald: #2fd6a6;
}
.dmqc-gn-jieying.on {
    opacity: 1;
    animation: dmqc-gn-jieying-in .4s ease-out both;
}
@keyframes dmqc-gn-jieying-in {
    from { opacity: 0; }
    to   { opacity: 1; }
}
/* 翡翠薄晕（底纹 + 渐变） */
.dmqc-gn-jieying-vignette {
    position: absolute;
    left: 0; top: 0;
    display: block;
    width: 100%; height: 100%;
    border-radius: inherit;
    background:
        url('extension/大梦千秋/image/sgz_gannin_jieying_bg.svg') center / 100% 100% no-repeat,
        radial-gradient(130% 130% at 50% 46%, rgba(20, 90, 60, 0) 42%, rgba(16, 110, 74, .26) 74%, rgba(4, 40, 26, .5) 100%);
    transition: none;
}
/* 扫描层（裁掉溢出的扫描线） */
.dmqc-gn-jieying-scan {
    position: absolute;
    left: 0; top: 0;
    display: block;
    width: 100%; height: 100%;
    border-radius: inherit;
    overflow: hidden;
}
/* 自上而下往复的扫描线："你已被劫营锁定" */
.dmqc-gn-jieying-scanbar {
    position: absolute;
    left: 0;
    top: 0;
    display: block;
    width: 100%;
    height: 3px;
    background: linear-gradient(90deg, rgba(125, 255, 196, 0), #7dffc4 18%, #eafff4 50%, #7dffc4 82%, rgba(125, 255, 196, 0));
    box-shadow: 0 0 12px rgba(80, 255, 180, .9), 0 0 26px rgba(47, 214, 166, .5);
    animation: dmqc-gn-jieying-scan 3s linear infinite;
}
@keyframes dmqc-gn-jieying-scan {
    0%   { top: -4px; opacity: 0; }
    8%   { opacity: 1; }
    92%  { opacity: 1; }
    100% { top: 100%; opacity: 0; }
}
/* 翡翠脉动边框 */
.dmqc-gn-jieying-frame {
    position: absolute;
    left: 0; top: 0;
    display: block;
    width: 100%; height: 100%;
    border-radius: inherit;
    border: 3px solid rgba(74, 223, 154, .72);
    box-shadow:
        0 0 0 1px rgba(0, 0, 0, .55),
        0 0 18px rgba(74, 223, 154, .5),
        inset 0 0 18px rgba(47, 214, 166, .32);
    animation: dmqc-gn-jieying-frame 1.8s ease-in-out infinite;
    transition: none;
}
@keyframes dmqc-gn-jieying-frame {
    0%, 100% {
        box-shadow: 0 0 0 1px rgba(0, 0, 0, .55), 0 0 14px rgba(74, 223, 154, .45), inset 0 0 14px rgba(47, 214, 166, .26);
        border-color: rgba(74, 223, 154, .68);
    }
    50% {
        box-shadow: 0 0 0 1px rgba(0, 0, 0, .55), 0 0 26px rgba(110, 255, 190, .85), inset 0 0 22px rgba(47, 214, 166, .42);
        border-color: rgba(140, 255, 205, .95);
    }
}
/* 左上朱砂绿「劫」印 */
.dmqc-gn-jieying-seal {
    position: absolute;
    top: -6px;
    left: -6px;
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
    color: #04291a;
    background: radial-gradient(circle at 35% 28%, #d5ffe9 0%, #4adf9a 55%, #0e7a4c 100%);
    border: 1.5px solid rgba(230, 255, 242, .85);
    box-shadow: 0 0 12px rgba(74, 223, 154, .8), inset 0 0 5px rgba(0, 0, 0, .3);
    transform: rotate(-6deg);
    transition: none;
    animation: dmqc-gn-jieying-seal 1.6s ease-in-out infinite;
}
@keyframes dmqc-gn-jieying-seal {
    0%, 100% { box-shadow: 0 0 10px rgba(74, 223, 154, .7), inset 0 0 5px rgba(0, 0, 0, .3); }
    50%      { box-shadow: 0 0 20px rgba(140, 255, 205, .95), inset 0 0 6px rgba(0, 0, 0, .26); }
}

/* ==========================================================
   梦甘宁 · 夜魇 · 隐匿埋伏（甘宁主视角全屏边缘暗幕）
   ========================================================== */
.dmqc-gn-yeyan-veil {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 9000;
    opacity: 0;
    transition: opacity .65s ease;
}
.dmqc-gn-yeyan-veil.on { opacity: 1; }
/* 边缘暗影主层：用内阴影在屏幕四周画一圈暗幕（中心清透、越靠边越暗），并缓慢"呼吸" */
.dmqc-gn-yeyan-veil-vignette {
    position: absolute;
    left: 0; top: 0;
    display: block;
    width: 100%; height: 100%;
    background:
        url('extension/大梦千秋/image/sgz_gannin_yeyan_bg.svg') center / 100% 100% no-repeat,
        radial-gradient(ellipse 88% 88% at 50% 48%, rgba(0, 0, 0, 0) 64%, rgba(8, 5, 20, .18) 86%, rgba(3, 2, 12, .42) 100%);
    box-shadow:
        inset 0 0 64px rgba(3, 2, 12, .5),
        inset 0 0 130px rgba(6, 4, 18, .28),
        inset 0 0 250px rgba(6, 4, 18, .16);
    animation: dmqc-gn-yeyan-breathe 5.2s ease-in-out infinite;
    transition: none;
}
@keyframes dmqc-gn-yeyan-breathe {
    0%, 100% { opacity: .84; }
    50%      { opacity: 1; }
}
/* 冷紫薄雾 tint：中心几乎透明，四周略压暗，制造"藏在阴影里"的整体观感 */
.dmqc-gn-yeyan-veil-tint {
    position: absolute;
    left: 0; top: 0;
    display: block;
    width: 100%; height: 100%;
    background: radial-gradient(ellipse 58% 58% at 50% 50%, rgba(22, 14, 54, .04) 0%, rgba(12, 6, 34, .2) 100%);
    transition: none;
}

/* 无障碍：减弱动态效果 */
@media (prefers-reduced-motion: reduce) {
    .dmqc-gn-jieying.on,
    .dmqc-gn-jieying-scanbar,
    .dmqc-gn-jieying-frame,
    .dmqc-gn-jieying-seal,
    .dmqc-gn-yeyan-veil-vignette {
        animation: none !important;
    }
    .dmqc-gn-yeyan-veil { transition: none !important; }
}
`;
    document.head.appendChild(style);
}

// ============================================================
//  三、劫营 · 翡翠劫掠标记
// ============================================================

/// 取当前带「劫营」标记的角色（正常只会有一个）
function dmqcGanninJieyingTarget() {
    try {
        return game.filterPlayer(p => p && p.hasSkill && p.hasSkill(SGZ_GN_JIEYING_MARK))[0] || null;
    } catch (e) {
        return null;
    }
}

/// 全部角色（含死亡，用于清扫遗留光效）
function dmqcGanninAllPlayers() {
    try {
        return (game.players || []).concat(game.dead || []);
    } catch (e) {
        return [];
    }
}

/// 取可见武将牌（avatar）的几何。读不到返回 null。
function dmqcGanninAvatarRect(player) {
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

/// 把劫营光效对齐到可见武将牌（内部带签名短路）。
function dmqcSyncJieyingAuraGeometry(target, aura) {
    const rect = dmqcGanninAvatarRect(target);
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

/** 在目标武将牌上建立翡翠劫掠光效（已存在则先移除重建） */
export function dmqcBuildJieyingAura(target) {
    try {
        dmqcInjectGanninStyle();
    } catch (e) {}
    if (target.dmqcGanninJieyingAura) {
        try {
            target.dmqcGanninJieyingAura.wrap.remove();
        } catch (e) {}
        delete target.dmqcGanninJieyingAura;
    }
    const wrap = document.createElement("div");
    wrap.className = "dmqc-gn-jieying";
    wrap.setAttribute("aria-hidden", "true");

    const vignette = document.createElement("div");
    vignette.className = "dmqc-gn-jieying-vignette";

    const scan = document.createElement("div");
    scan.className = "dmqc-gn-jieying-scan";
    const scanbar = document.createElement("div");
    scanbar.className = "dmqc-gn-jieying-scanbar";
    scan.appendChild(scanbar);

    wrap.appendChild(vignette);
    try {
        dmqcMountParticles(wrap, "gannin_jieying", { count: 10 });
    } catch (e) {}
    wrap.appendChild(scan);

    const frame = document.createElement("div");
    frame.className = "dmqc-gn-jieying-frame";

    const seal = document.createElement("div");
    seal.className = "dmqc-gn-jieying-seal";
    seal.textContent = "劫";

    wrap.appendChild(frame);
    wrap.appendChild(seal);
    target.appendChild(wrap);

    target.dmqcGanninJieyingAura = {
        wrap,
        frame,
        seal,
        _geo: "",
        _on: false,
    };
    return target.dmqcGanninJieyingAura;
}

/** 刷新劫营光效：目标有标记则点亮，其余角色清扫掉。幂等。 */
export function dmqcRefreshJieyingAura(player) {
    try {
        // player = 梦甘宁（skill owner）；没有 UI 技能时应把全场遗留光效一并清掉
        if (player && player.hasSkill && !player.hasSkill(SGZ_GN_JIEYING_UI_SKILL)) {
            for (const p of dmqcGanninAllPlayers()) {
                if (p.dmqcGanninJieyingAura) {
                    try {
                        p.dmqcGanninJieyingAura.wrap.remove();
                    } catch (e) {}
                    delete p.dmqcGanninJieyingAura;
                }
            }
            return;
        }
        const target = dmqcGanninJieyingTarget();
        // 清扫"已不是目标"的角色身上遗留的光效
        for (const p of dmqcGanninAllPlayers()) {
            if (p.dmqcGanninJieyingAura && p !== target) {
                try {
                    p.dmqcGanninJieyingAura.wrap.remove();
                } catch (e) {}
                delete p.dmqcGanninJieyingAura;
            }
        }
        if (!target) return;
        if (!target.dmqcGanninJieyingAura) dmqcBuildJieyingAura(target);
        const aura = target.dmqcGanninJieyingAura;
        if (!aura) return;
        dmqcSyncJieyingAuraGeometry(target, aura);
        if (!aura._on) {
            aura._on = true;
            aura.wrap.classList.add("on");
            aura.wrap.title = "劫营：跳过弃牌阶段，弃置的牌由梦甘宁获得";
        }
    } catch (e) {
        // 表现层异常静默
    }
}

/** 轮询兜底：劫营换目标 / 标记变化，最迟下一拍反映到卡面 */
function dmqcStartJieyingPolling(player) {
    try {
        if (player.dmqcGanninJieyingTimer) clearInterval(player.dmqcGanninJieyingTimer);
        player.dmqcGanninJieyingTimer = setInterval(function () {
            dmqcRefreshJieyingAura(player);
        }, 480);
    } catch (e) {}
}

/**
 * 劫营 · 翡翠劫掠标记（charlotte UI 技能，挂在 character/sgz_gannin.js 的 skills 里）
 * 不参与任何规则结算，只负责给带「劫营」标记的角色套上卡面光效。
 */
export const jieyingUI = {
    charlotte: true,
    silent: true,
    forced: true,
    priority: -10,
    trigger: {
        global: ["gameStart", "roundStart", "phaseBeginStart", "addMark", "removeMark", "dieAfter"],
    },
    init(player) {
        try {
            dmqcInjectGanninStyle();
        } catch (e) {}
        try {
            dmqcRefreshJieyingAura(player);
        } catch (e) {}
        dmqcStartJieyingPolling(player);
    },
    // ⚠ async：StepCompiler 会隔离作用域重编译 step 写法，模块函数会 ReferenceError。
    async content(event, trigger, player) {
        try {
            dmqcRefreshJieyingAura(player);
        } catch (e) {}
    },
    onremove(player) {
        if (player.dmqcGanninJieyingTimer) {
            try {
                clearInterval(player.dmqcGanninJieyingTimer);
            } catch (e) {}
            delete player.dmqcGanninJieyingTimer;
        }
        for (const p of dmqcGanninAllPlayers()) {
            if (p.dmqcGanninJieyingAura) {
                try {
                    p.dmqcGanninJieyingAura.wrap.remove();
                } catch (e) {}
                delete p.dmqcGanninJieyingAura;
            }
        }
    },
};

// ============================================================
//  四、夜魇 · 隐匿埋伏（主视角全屏边缘暗幕）
// ============================================================

/** 在 ui.window 上建立夜魇暗幕（已存在则复用；初始透明） */
function dmqcBuildYeyanVeil(player) {
    try {
        dmqcInjectGanninStyle();
    } catch (e) {}
    if (player.dmqcGanninYeyanVeil) {
        return player.dmqcGanninYeyanVeil;
    }
    // ui.window 尚未就绪（极早期）时先不建，等轮询兜底
    if (typeof ui === "undefined" || !ui || !ui.window) {
        return null;
    }
    const veil = document.createElement("div");
    veil.className = "dmqc-gn-yeyan-veil";
    veil.setAttribute("aria-hidden", "true");

    const vignette = document.createElement("div");
    vignette.className = "dmqc-gn-yeyan-veil-vignette";
    veil.appendChild(vignette);

    try {
        dmqcMountParticles(veil, "gannin_yeyan", { count: 12 });
    } catch (e) {}

    const tint = document.createElement("div");
    tint.className = "dmqc-gn-yeyan-veil-tint";
    veil.appendChild(tint);

    ui.window.appendChild(veil);

    player.dmqcGanninYeyanVeil = { veil, vignette, tint, _on: false };
    return player.dmqcGanninYeyanVeil;
}

/** 刷新夜魇暗幕：甘宁主视角 + 有「夜魇」标记 → 点亮，否则熄灭。幂等。 */
export function dmqcRefreshYeyanVeil(player) {
    try {
        if (!player) return;
        if (player.hasSkill && !player.hasSkill(SGZ_GN_YEYAN_UI_SKILL)) {
            dmqcHideYeyanVeil(player);
            return;
        }
        const mine = typeof player.isMine === "function" && player.isMine();
        const alive = typeof player.isAlive === "function" && player.isAlive();
        const has = !!(player.countMark && player.countMark(SGZ_GN_YEYAN) > 0);
        const show = mine && alive && has;
        if (!show) {
            dmqcHideYeyanVeil(player);
            return;
        }
        const veil = dmqcBuildYeyanVeil(player);
        if (!veil) return;
        if (!veil._on) {
            veil._on = true;
            veil.veil.classList.add("on");
        }
    } catch (e) {
        // 表现层异常静默
    }
}

/** 熄灭并（在下一次刷新时复用）隐藏夜魇暗幕 */
function dmqcHideYeyanVeil(player) {
    const veil = player && player.dmqcGanninYeyanVeil;
    if (!veil) return;
    if (veil._on) {
        veil._on = false;
        try {
            veil.veil.classList.remove("on");
        } catch (e) {}
    }
}

/** 轮询兜底：夜魇标记 / 主视角变化，最迟下一拍反映到屏幕 */
function dmqcStartYeyanPolling(player) {
    try {
        if (player.dmqcGanninYeyanTimer) clearInterval(player.dmqcGanninYeyanTimer);
        player.dmqcGanninYeyanTimer = setInterval(function () {
            dmqcRefreshYeyanVeil(player);
        }, 460);
    } catch (e) {}
}

/**
 * 夜魇 · 隐匿埋伏（charlotte UI 技能）
 * 甘宁本人拥有「夜魇」标记时，在主视角屏幕边缘做一圈暗紫暗幕。
 */
export const yeyanUI = {
    charlotte: true,
    silent: true,
    forced: true,
    priority: -9,
    trigger: {
        player: ["enterGame", "addMark", "removeMark", "phaseBegin"],
        global: ["gameStart", "roundStart", "phaseBeginStart"],
    },
    init(player) {
        try {
            dmqcInjectGanninStyle();
        } catch (e) {}
        try {
            dmqcRefreshYeyanVeil(player);
        } catch (e) {}
        dmqcStartYeyanPolling(player);
    },
    async content(event, trigger, player) {
        try {
            dmqcRefreshYeyanVeil(player);
        } catch (e) {}
    },
    onremove(player) {
        if (player.dmqcGanninYeyanTimer) {
            try {
                clearInterval(player.dmqcGanninYeyanTimer);
            } catch (e) {}
            delete player.dmqcGanninYeyanTimer;
        }
        const veil = player.dmqcGanninYeyanVeil;
        if (veil) {
            try {
                veil.veil.remove();
            } catch (e) {}
            delete player.dmqcGanninYeyanVeil;
        }
    },
};

// ============================================================
//  五、控制台自检：dmqcGanninDebug()
// ============================================================
try {
    window.dmqcGanninDebug = function () {
        const out = {
            "①劫营标记名": SGZ_GN_JIEYING_MARK,
            "②夜魇标记名": SGZ_GN_YEYAN,
        };
        try {
            const list = dmqcGanninAllPlayers();
            const target = dmqcGanninJieyingTarget();
            out["③当前劫营目标"] = target ? target.name : "(无)";
            out["④劫营光效已点亮"] = list.filter(p => p.dmqcGanninJieyingAura && p.dmqcGanninJieyingAura._on).map(p => p.name).join("  ") || "(无)";
            out["⑤夜魇标记数"] = list.map(p => p.name + ":" + (p.countMark(SGZ_GN_YEYAN) || 0)).join("  ");
            out["⑥夜魇暗幕已点亮"] = list.filter(p => p.dmqcGanninYeyanVeil && p.dmqcGanninYeyanVeil._on).map(p => p.name).join("  ") || "(无)";
        } catch (e) {
            out["运行期读取失败"] = String(e);
        }
        console.log("[大梦千秋] 梦甘宁表现层自检：", out);
        return out;
    };
} catch (e) {}
