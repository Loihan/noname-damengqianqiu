// ============================================================
//  梦杜预 · 特效层
//    · 破竹 · 竹节进度条（常驻武将牌右侧，显示「破竹标记数 / 回合开始时体力数」）
//    · 三陈 · 「武库开阖」主题选择框（每张装备栏卡内列出武库中可随机获得的全部装备牌名）
//  纯表现层，无游戏规则。由 character/sgz_duyu.js 通过 import 使用。
//
//  设计说明
//  ────────
//  ① 破竹进度条取「竹」意：一竿竹被分成 total 个竹节，每消耗一枚“破竹”标记，
//     顶端就崩掉一节；竹节自下而上点亮，最上一节带崩裂脉动。
//     「破竹标记数」= 分子（当前 sgz_pozhu_mark 数），
//     「回合开始时体力数」= 分母（sgz_pozhu 在自己的 phaseBegin 记下的体力值）。
//     两者都直接读引擎状态，不额外维护第二份数据。
//  ② 三陈选择框按同包梦关羽 / 梦魏延 / 梦小乔的范式做成自包含 Promise 选择框
//     （game.pause() → 点击 → game.resume()）：仅对本地人类玩家生效，
//     AI / 联机 / 托管 / 录像回放由 character 侧回退引擎默认 chooseControl。
//  ③ 卡片内必须把「还能随机获得的装备牌名」全部标出来 —— 数据源与技能本体
//     完全一致（sgzDuyuEquipCandidates 的结果直接透传进来），绝不做二次筛选。
//
//  踩坑备忘（与同包其它特效一致）
//  ────────────────────────────
//    · 引擎全局有 `div { display:inline-block; position:absolute; transition:all .5s }`，
//      自定义 UI 的每个 div 都要在类选择器里显式声明 position / display / transition。
//    · `style.cssText` 会清空先前 setProperty 的自定义属性 —— 先 cssText，后 setProperty。
//    · 引擎的 ui.create.div 只解析带 "." / "#" 前缀的类名串，本模块一律用
//      document.createElement + className。
// ============================================================

import { dmqcMountParticles, dmqcMountSheen, dmqcToggleSheen } from "./dmqc_particles.js";

// ============================================================
//  一、与 character/sgz_duyu.js 共享的常量（单一来源，避免两处漂移）
// ============================================================

/** 武库产出的「陈令」标记（挂在其 charlotte 载体技能 sgz_chenling 上） */
export const DMQC_DUYU_MARK = "sgz_chenling";
/** 【破竹】自己每回合产出、也只被破竹消耗的「破竹」标记 */
export const DMQC_DUYU_POZHU_MARK = "sgz_pozhu_mark";
/** 存「回合开始时的体力数」（进度条分母）的 storage 键 */
export const DMQC_DUYU_TURN_HP_KEY = "sgz_pozhu_turnhp";
/** 本特效层挂载的 charlotte UI 技能名 */
export const DMQC_DUYU_UI_SKILL = "sgz_duyu_pozhu_gauge";
/** 三陈每次消耗的「陈令」数（三条分支同为 3；仅用于展示，实际扣除由技能本体负责） */
export const DMQC_SANCHEN_COST = 3;

/**
 * 四种可扩展的装备栏。注意引擎定义（noname/get/is.js:attackingMount / defendingMount）：
 *   equip1 武器 / equip2 防具 / equip3 防御坐骑 / equip4 进攻坐骑
 */
export const DMQC_DUYU_SLOTS = ["equip1", "equip2", "equip3", "equip4"];

export const DMQC_DUYU_SLOT_META = {
    equip1: {
        key: "equip1",
        name: "武器",
        seal: "兵",
        motto: "长兵列陈 · 破甲摧锋",
        accent: "#e5834f",
        // 倾势·失败（神武之路）下的配色：同栏位仍可区分，但整体转入幽紫冷银
        accentFail: "#b98cff",
        dark: "#3a1508",
        darkFail: "#1d1440",
        pool: "武库·兵械",
    },
    equip2: {
        key: "equip2",
        name: "防具",
        seal: "甲",
        motto: "重铠周身 · 不动如山",
        accent: "#5fb0e6",
        accentFail: "#7fb4ff",
        dark: "#08222f",
        darkFail: "#111a3a",
        pool: "武库·甲胄",
    },
    equip3: {
        key: "equip3",
        name: "防御坐骑",
        seal: "御",
        motto: "的卢绝影 · 御敌于外",
        accent: "#6fd39a",
        accentFail: "#6fd6d0",
        dark: "#08291d",
        darkFail: "#0d2630",
        pool: "武库·御骑",
    },
    equip4: {
        key: "equip4",
        name: "进攻坐骑",
        seal: "驰",
        motto: "赤兔大宛 · 驰突千里",
        accent: "#d9a94f",
        accentFail: "#c9d2e8",
        dark: "#2b1e07",
        darkFail: "#1b1f33",
        pool: "武库·骁骑",
    },
};

// ============================================================
//  一·B、倾势两条觉醒分支 → 三陈选择框的两套形态
// ============================================================
//    base    ：尚未觉醒 —— 墨青武库 + 竹青 + 青铜金
//    success ：倾势·成功（记录满，得【灭吴】）—— 明金武库
//    fail    ：倾势·失败（濒死，武库化烬，得【神武】之路）—— 幽紫冷银
//
//  ⚠ 「失败」并不是退化：这条路同样把三陈升级到 2 级（候选换成「神武」），
//    只是走得惨烈（濒死觉醒、武库记录化为陈令），所以失败形态的美术要的是
//    「武库崩颓 · 神兵现世」的冷峻与凌厉，而不是灰暗丧气。
//    ⚠ 失败分支**不再**把各装备栏数拉满到 3 —— 额外栏位一律由【三陈】按需补。
//    头像也必须用失败分支的立绘（sgz_duyu3.png），绝不能沿用成功分支的 sgz_duyu2.jpg。
export const DMQC_DUYU_FORMS = {
    base: {
        key: "base",
        cls: "",
        avatar: "extension/大梦千秋/image/sgz_duyu.jpg",
        bg: "extension/大梦千秋/image/sgz_duyu_dialog_bg.svg",
        emblem: "extension/大梦千秋/image/sgz_duyu_emblem.svg",
        particles: "duyu",
        accVar: {},
        kicker: "武 库 在 手 · 三 陈 而 行",
        title: "三 陈 <i>·</i> 武 库 开 阖",
        side: ["武", "库"],
        state: "",
        foot: "武 库 破 竹 · 梦 杜 预",
        formAccent: "#6fd39a",
        sideDark: "#08291d",
    },
    success: {
        key: "success",
        cls: "awakened",
        avatar: "extension/大梦千秋/image/sgz_duyu2.jpg",
        bg: "extension/大梦千秋/image/sgz_duyu_dialog_bg.svg",
        emblem: "extension/大梦千秋/image/sgz_duyu_emblem.svg",
        particles: "duyu",
        accVar: {},
        kicker: "倾 势 既 成 · 武 库 尽 开",
        title: "三 陈 <i>·</i> 武 库 开 阖",
        side: ["倾", "势"],
        state: "倾势·成功 ｜ 灭吴之路",
        foot: "武 库 破 竹 · 梦 杜 预",
        formAccent: "#f0c86a",
        sideDark: "#2b1e07",
    },
    fail: {
        key: "fail",
        cls: "qingshi-fail",
        avatar: "extension/大梦千秋/image/sgz_duyu3.png",
        bg: "extension/大梦千秋/image/sgz_duyu_fail_bg.svg",
        emblem: "extension/大梦千秋/image/sgz_duyu_fail_emblem.svg",
        particles: "duyu_fail",
        accVar: {},
        kicker: "武 库 化 烬 · 神 兵 现 世",
        title: "三 陈 <i>·</i> 神 兵 出 世",
        side: ["神", "兵"],
        state: "倾势·失败 ｜ 神武之路",
        foot: "武 库 化 烬 · 神 兵 在 手",
        formAccent: "#a98cff",
        sideDark: "#1d1440",
    },
};

/** 把 form 归一化："base" | "success" | "fail"；兼容旧的 awakened 布尔入参 */
export function dmqcDuyuNormalizeForm(cfg) {
    const raw = cfg && cfg.form;
    if (raw === "fail" || raw === "success" || raw === "base") return raw;
    if (cfg && cfg.shenwu) return "fail";
    if (cfg && cfg.awakened) return "success";
    return "base";
}


// ============================================================
//  二、样式注入（幂等）
// ============================================================

const DMQC_DUYU_STYLE_ID = "dmqc_duyu_style";

export function dmqcInjectDuyuStyle() {
    if (typeof document === "undefined" || !document) return;
    if (document.getElementById(DMQC_DUYU_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = DMQC_DUYU_STYLE_ID;
    style.innerHTML = `
/* ==========================================================
   梦杜预 · 破竹竹节进度条（挂武将牌右侧）
   ========================================================== */
.dmqc-dy-gauge {
    position: absolute;
    left: 100%;
    top: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-sizing: border-box;
    width: 26px;
    height: 100%;
    margin-left: 5px;
    z-index: 50;
    pointer-events: none;
    transition: none;
    --dy-g-green: #6fd39a;
    --dy-g-bronze: #c8a15c;
}
.dmqc-dy-gauge-brand {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    flex: 0 0 auto;
    margin-bottom: 2px;
    font-family: xiaozhuan, KaiTi, STKaiti, serif;
    font-size: 10px;
    line-height: 1;
    letter-spacing: 0;
    color: #a6f0c6;
    text-shadow: 0 0 6px rgba(111, 211, 154, .9), 0 1px 2px #000;
    transition: none;
}
/* 竹节管身 */
.dmqc-dy-gauge-track {
    position: relative;
    display: block;
    flex: 1 1 auto;
    width: 16px;
    min-height: 26px;
    box-sizing: border-box;
    border-radius: 7px;
    overflow: hidden;
    background-color: #08110f;
    background-image: url('extension/大梦千秋/image/sgz_duyu_gauge.svg');
    background-size: 100% 100%;
    background-repeat: no-repeat;
    border: 1px solid rgba(200, 161, 92, .5);
    box-shadow:
        inset 0 0 6px rgba(0, 0, 0, .95),
        0 0 8px rgba(111, 211, 154, .18),
        0 1px 4px rgba(0, 0, 0, .7);
    transition: border-color .35s ease, box-shadow .35s ease;
}
/* 平滑填充层（竹青流光），高度 = 标记数 / 回合开始体力数 */
.dmqc-dy-gauge-wash {
    position: absolute;
    left: 0;
    bottom: 0;
    display: block;
    width: 100%;
    height: 0%;
    border-radius: 5px 5px 0 0;
    background:
        repeating-linear-gradient(0deg, rgba(255, 255, 255, .16) 0 3px, rgba(255, 255, 255, 0) 3px 11px),
        linear-gradient(180deg, #b8ffd8 0%, #6fd39a 34%, #2f8f63 78%, #1c5c42 100%);
    background-size: 100% 44px, 100% 100%;
    box-shadow: 0 0 10px rgba(111, 211, 154, .75), inset 0 0 5px rgba(255, 255, 255, .45);
    transition: height .55s cubic-bezier(.33, 1, .68, 1);
    animation: dmqc-dy-sap 3.2s linear infinite;
}
/* 竹节格（离散刻度，自下而上：index 0 在最底部） */
.dmqc-dy-gauge-joints {
    position: absolute;
    left: 0;
    top: 0;
    display: flex;
    flex-direction: column-reverse;
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    padding: 1.5px 1px;
    gap: 1.5px;
    transition: none;
}
.dmqc-dy-gauge-joints i {
    display: block;
    flex: 1 1 0;
    min-height: 2px;
    border-radius: 2.5px;
    background: rgba(255, 255, 255, .045);
    border: 1px solid rgba(200, 161, 92, .2);
    box-sizing: border-box;
    transition: background .3s ease, box-shadow .3s ease, border-color .3s ease, transform .3s ease;
}
/* 已点亮：竹青实节 */
.dmqc-dy-gauge-joints i.on {
    background: linear-gradient(180deg, #d8ffe9 0%, #6fd39a 45%, #2f8f63 100%);
    border-color: rgba(216, 255, 233, .85);
    box-shadow: 0 0 5px rgba(111, 211, 154, .85), inset 0 0 3px rgba(255, 255, 255, .5);
}
/* 最上一枚点亮的节：崩裂脉动，提示"下一次破竹将从这里耗去" */
.dmqc-dy-gauge-joints i.tip {
    animation: dmqc-dy-node-pulse 1.35s ease-in-out infinite;
}
/* 顶节：竹梢收口 */
.dmqc-dy-gauge-joints i.top {
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
}
/* 密排：体力高（格数多）时收窄间隙 */
.dmqc-dy-gauge-track.dense .dmqc-dy-gauge-joints { gap: 1px; padding: 1px; }
/* 极密：格数过多时只留流光层与读数 */
.dmqc-dy-gauge-track.minimal .dmqc-dy-gauge-joints { display: none; }

/* 读数：破竹标记数 / 回合开始时体力数 */
.dmqc-dy-gauge-read {
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
    color: #9fd9bb;
    background: rgba(4, 12, 10, .82);
    border: 1px solid rgba(200, 161, 92, .38);
    text-shadow: 0 1px 2px #000;
    transition: none;
}
.dmqc-dy-gauge-read b {
    font-weight: bold;
    color: #e8fff4;
    font-size: 10.5px;
}
.dmqc-dy-gauge-read i {
    font-style: normal;
    margin: 0 1px;
    color: rgba(200, 161, 92, .85);
}
/* 满节：全数在手，外发光强化 */
.dmqc-dy-gauge.full .dmqc-dy-gauge-track {
    border-color: rgba(216, 255, 233, .9);
    box-shadow: inset 0 0 6px rgba(0, 0, 0, .9), 0 0 14px rgba(111, 211, 154, .72), 0 1px 4px rgba(0, 0, 0, .7);
}
.dmqc-dy-gauge.full .dmqc-dy-gauge-brand { color: #d8ffe9; }
/* 空节：已然用尽，整体压暗 */
.dmqc-dy-gauge.void .dmqc-dy-gauge-track { border-color: rgba(200, 161, 92, .24); box-shadow: inset 0 0 6px rgba(0, 0, 0, .95); }
.dmqc-dy-gauge.void .dmqc-dy-gauge-read { opacity: .62; }

@keyframes dmqc-dy-sap {
    0%   { background-position: 0 0, 0 0; }
    100% { background-position: 0 -44px, 0 0; }
}
@keyframes dmqc-dy-node-pulse {
    0%, 100% { box-shadow: 0 0 5px rgba(111, 211, 154, .8), inset 0 0 3px rgba(255, 255, 255, .5); transform: scaleX(1); }
    50%      { box-shadow: 0 0 12px rgba(200, 255, 226, 1), inset 0 0 5px rgba(255, 255, 255, .85); transform: scaleX(1.12); }
}

/* ==========================================================
   梦杜预 · 三陈「武库开阖」选择框
   ========================================================== */
.dmqc-dy-overlay {
    position: absolute;
    left: 0; top: 0;
    width: 100%; height: 100%;
    z-index: 99999;
    display: block;
    transition: none;
    background: radial-gradient(122% 122% at 50% 40%, rgba(9, 22, 22, .54), rgba(2, 7, 8, .88));
}
.dmqc-dy {
    position: absolute;
    left: 50%; top: 50%;
    display: block;
    box-sizing: border-box;
    width: 980px;
    padding: 18px 22px 12px;
    border-radius: 16px;
    overflow: hidden;
    text-align: center;
    color: #e3ece6;
    font-family: yuanli, KaiTi, STKaiti, serif;
    transform: translate(-50%, -50%) scale(var(--dy-scale, 1));
    transform-origin: center center;
    transition: none;
    --dy-green: #6fd39a;
    --dy-green-soft: rgba(111, 211, 154, .3);
    --dy-bronze: #c8a15c;
    --dy-bronze-soft: rgba(200, 161, 92, .32);
    --dy-jade: #3fae86;
    background:
        linear-gradient(180deg, rgba(111, 211, 154, .065), rgba(111, 211, 154, 0) 34%),
        linear-gradient(180deg, #0f2024 0%, #0a1518 54%, #04090b 100%);
    border: 1px solid rgba(200, 161, 92, .55);
    box-shadow:
        0 0 0 1px rgba(0, 0, 0, .92),
        0 0 0 4px rgba(200, 161, 92, .14),
        0 0 0 7px rgba(111, 211, 154, .07),
        0 0 46px rgba(0, 0, 0, .86),
        inset 0 0 44px rgba(111, 211, 154, .05);
    animation: dmqc-dy-in .44s cubic-bezier(.2, .9, .3, 1.08) both;
}
/* 觉醒（倾势·成功）：青铜转为明金，竹青转为赤金 */
.dmqc-dy.awakened {
    --dy-green: #f0c86a;
    --dy-green-soft: rgba(240, 200, 106, .3);
    --dy-jade: #d9a94f;
    background:
        linear-gradient(180deg, rgba(240, 200, 106, .08), rgba(240, 200, 106, 0) 34%),
        linear-gradient(180deg, #221a0c 0%, #14100a 54%, #080604 100%);
    border-color: rgba(240, 200, 106, .6);
    box-shadow:
        0 0 0 1px rgba(0, 0, 0, .92),
        0 0 0 4px rgba(240, 200, 106, .16),
        0 0 0 7px rgba(217, 169, 79, .08),
        0 0 46px rgba(0, 0, 0, .86),
        inset 0 0 44px rgba(240, 200, 106, .05);
}
/* 觉醒（倾势·失败 → 神武之路）：幽紫 + 冷银。
   注意不是"变灰变丧"——这条路以濒死为代价换来【神武】与升级后的【三陈】，
   所以配色取玄铁冷光与电芒紫，观感应是冷峻凌厉而非凋敝。 */
.dmqc-dy.qingshi-fail {
    --dy-green: #a98cff;
    --dy-green-soft: rgba(169, 140, 255, .32);
    --dy-bronze: #9aa8c4;
    --dy-bronze-soft: rgba(154, 168, 196, .3);
    --dy-jade: #7f6ae0;
    background:
        linear-gradient(180deg, rgba(169, 140, 255, .075), rgba(169, 140, 255, 0) 34%),
        linear-gradient(180deg, #171329 0%, #0d0b18 54%, #05040a 100%);
    border-color: rgba(154, 168, 196, .6);
    box-shadow:
        0 0 0 1px rgba(0, 0, 0, .92),
        0 0 0 4px rgba(154, 168, 196, .16),
        0 0 0 7px rgba(169, 140, 255, .09),
        0 0 46px rgba(0, 0, 0, .86),
        inset 0 0 44px rgba(169, 140, 255, .055);
}
.dmqc-dy.qingshi-fail .dmqc-dy-bg { opacity: .5; }
.dmqc-dy.qingshi-fail .dmqc-dy-emblem { opacity: .2; }
@keyframes dmqc-dy-in {
    from { opacity: 0; transform: translate(-50%, -50%) scale(calc(var(--dy-scale, 1) * .92)); }
    to   { opacity: 1; transform: translate(-50%, -50%) scale(var(--dy-scale, 1)); }
}

/* 装饰层 */
.dmqc-dy-bg {
    position: absolute; left: 0; top: 0;
    display: block; width: 100%; height: 100%;
    background-size: cover; background-position: center; background-repeat: no-repeat;
    opacity: .42; pointer-events: none; transition: none;
}
.dmqc-dy-emblem {
    position: absolute; left: 50%; top: 50%;
    display: block; width: 290px; height: 290px;
    transform: translate(-50%, -50%);
    background-size: contain; background-position: center; background-repeat: no-repeat;
    opacity: .17; pointer-events: none; transition: none;
}
.dmqc-dy-corner {
    position: absolute; display: block; width: 26px; height: 26px;
    pointer-events: none; opacity: .9; transition: none;
}
.dmqc-dy-corner.tl { top: 9px; left: 9px; border-top: 2px solid var(--dy-bronze); border-left: 2px solid var(--dy-green); border-top-left-radius: 8px; }
.dmqc-dy-corner.tr { top: 9px; right: 9px; border-top: 2px solid var(--dy-green); border-right: 2px solid var(--dy-bronze); border-top-right-radius: 8px; }
.dmqc-dy-corner.bl { bottom: 9px; left: 9px; border-bottom: 2px solid var(--dy-green); border-left: 2px solid var(--dy-bronze); border-bottom-left-radius: 8px; }
.dmqc-dy-corner.br { bottom: 9px; right: 9px; border-bottom: 2px solid var(--dy-bronze); border-right: 2px solid var(--dy-green); border-bottom-right-radius: 8px; }

/* 头部 */
.dmqc-dy-head {
    position: relative; display: flex; align-items: center; justify-content: center;
    gap: 16px; text-align: left; transition: none;
}
.dmqc-dy-ava {
    position: relative; display: block; flex: 0 0 76px; width: 76px; height: 76px;
    border-radius: 50%; background-size: cover; background-position: center 12%;
    border: 2px solid var(--dy-bronze);
    box-shadow: 0 0 0 3px rgba(0, 0, 0, .7), 0 0 22px var(--dy-green-soft), inset 0 0 12px rgba(0, 0, 0, .6);
    transition: none;
}
.dmqc-dy-titlewrap { position: relative; display: block; flex: 0 1 auto; text-align: center; transition: none; }
.dmqc-dy-kicker {
    position: relative; display: block;
    font-family: xiaozhuan, KaiTi, STKaiti, serif; font-size: 12.5px; letter-spacing: 7px;
    color: var(--dy-green); text-shadow: 0 0 10px var(--dy-green-soft); margin-bottom: 2px; transition: none;
}
.dmqc-dy-title {
    position: relative; display: block;
    font-family: xinwei, KaiTi, serif; font-size: 33px; line-height: 1.15; letter-spacing: 6px;
    color: #f2e2b4; text-shadow: 0 0 16px rgba(242, 226, 180, .5), 0 2px 4px rgba(0, 0, 0, .8);
    white-space: nowrap; transition: none;
}
.dmqc-dy-title i { font-style: normal; color: var(--dy-jade); font-size: 25px; vertical-align: 2px; }
.dmqc-dy-sub {
    position: relative; display: block; font-size: 13px; line-height: 1.5; letter-spacing: .5px;
    color: #c3d2c9; margin-top: 6px; transition: none;
}
.dmqc-dy-sub b { color: var(--dy-green); font-weight: bold; }
/* 觉醒分支标牌：明确告诉玩家这是哪一条路（成功→灭吴 / 失败→神武） */
.dmqc-dy-state {
    position: relative; display: inline-block; margin-top: 6px;
    padding: 1px 11px; border-radius: 10px;
    font-family: KaiTi, STKaiti, serif; font-size: 11.5px; letter-spacing: 1.5px;
    color: #0d0b16; font-weight: bold;
    background: linear-gradient(180deg, #efe6ff, var(--dy-green) 58%, var(--dy-jade));
    border: 1px solid rgba(255, 255, 255, .6);
    box-shadow: 0 0 10px var(--dy-green-soft), inset 0 0 0 1px rgba(255, 255, 255, .3);
    transition: none;
}
.dmqc-dy-side {
    position: relative; display: flex; flex: 0 0 40px; width: 40px; height: 84px;
    flex-direction: column; align-items: center; justify-content: center; gap: 4px;
    border: 1px solid var(--dy-bronze-soft); border-radius: 6px;
    background: rgba(0, 0, 0, .4);
    box-shadow: inset 0 0 10px var(--dy-bronze-soft), inset 0 0 10px var(--dy-green-soft);
    transition: none;
}
.dmqc-dy-side span {
    position: relative; display: block;
    font-family: xiaozhuan, KaiTi, serif; font-size: 19px; line-height: 1; transition: none;
}
.dmqc-dy-side span:first-child { color: var(--dy-green); }
.dmqc-dy-side span:last-child { color: var(--dy-bronze); }

.dmqc-dy-ruler {
    position: relative; display: block; height: 1px; margin: 11px 0 9px; transition: none;
    background: linear-gradient(90deg, rgba(200,161,92,0), var(--dy-bronze) 18%, #d8ffe9 50%, var(--dy-green) 82%, rgba(111,211,154,0));
}

/* 陈令消耗条 */
.dmqc-dy-costrow {
    position: relative; display: flex; align-items: center; justify-content: center;
    gap: 14px; margin: 0 0 10px; transition: none;
}
.dmqc-dy-costbox {
    position: relative; display: flex; align-items: center; gap: 8px;
    padding: 5px 12px; border-radius: 9px;
    background: rgba(0, 0, 0, .38);
    border: 1px solid var(--dy-bronze-soft);
    box-shadow: inset 0 0 12px rgba(0, 0, 0, .7);
    transition: none;
}
.dmqc-dy-costbox .k {
    position: relative; display: block; font-family: KaiTi, STKaiti, serif; font-size: 12.5px;
    letter-spacing: 2px; color: var(--dy-bronze); transition: none;
}
.dmqc-dy-pips { position: relative; display: flex; align-items: center; gap: 3px; transition: none; }
.dmqc-dy-pip {
    position: relative; display: block; width: 9px; height: 9px; border-radius: 2px;
    background: linear-gradient(180deg, #d8ffe9, #6fd39a 45%, #2f8f63);
    border: 1px solid rgba(216, 255, 233, .8);
    box-shadow: 0 0 4px rgba(111, 211, 154, .7);
    transition: none;
}
.dmqc-dy-pip.pay {
    background: linear-gradient(180deg, #ffe6b0, #c8a15c 45%, #7d6330);
    border-color: rgba(255, 240, 205, .9);
    box-shadow: 0 0 6px rgba(200, 161, 92, .9);
    animation: dmqc-dy-pip-pay 1.6s ease-in-out infinite;
}
.dmqc-dy-pip.more {
    width: auto; height: 9px; padding: 0 3px; border: none; background: none; box-shadow: none;
    font-family: yuanli, KaiTi, serif; font-size: 10px; line-height: 9px; color: #9fd9bb;
}
@keyframes dmqc-dy-pip-pay {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-2px); }
}
.dmqc-dy-costtext {
    position: relative; display: block; font-family: KaiTi, STKaiti, serif; font-size: 13.5px;
    letter-spacing: .5px; color: #c3d2c9; transition: none;
}
.dmqc-dy-costtext b { color: #e8fff4; font-size: 15px; }
.dmqc-dy-costtext em { font-style: normal; color: var(--dy-green); font-weight: bold; }

.dmqc-dy-label {
    position: relative; display: block; text-align: left;
    font-family: xingkai, KaiTi, STKaiti, serif; font-size: 13px; letter-spacing: 1px;
    color: #d9c08a; text-shadow: 0 1px 3px #000;
    margin: 0 2px 7px; transition: none;
}

/* 装备栏卡行 */
.dmqc-dy-cards {
    position: relative; display: flex; flex-wrap: nowrap; justify-content: center;
    align-items: stretch; gap: 14px; transition: none;
}
.dmqc-dy-card {
    position: relative; display: flex; flex-direction: column; box-sizing: border-box;
    padding: 10px 10px 9px; border-radius: 12px; text-align: center;
    cursor: pointer; user-select: none;
    background:
        linear-gradient(180deg, var(--dy-card-soft, rgba(111, 211, 154, .06)), rgba(0, 0, 0, 0) 42%),
        linear-gradient(180deg, #122426 0%, #0b1618 58%, #060d0e 100%);
    border: 2px solid rgba(200, 161, 92, .38);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .04), inset 0 0 22px rgba(0, 0, 0, .5), 0 4px 12px rgba(0, 0, 0, .55);
    transition: transform .16s ease, border-color .16s ease, box-shadow .16s ease, opacity .16s ease;
    animation: dmqc-dy-card-in .5s cubic-bezier(.2, .9, .3, 1.12) both;
}
.dmqc-dy-card.selected {
    transform: translateY(-6px) scale(1.022);
    border-color: var(--dy-card-accent, #6fd39a);
    box-shadow:
        0 0 0 1px rgba(255, 255, 255, .22),
        inset 0 0 0 1px rgba(255, 255, 255, .16),
        inset 0 0 24px var(--dy-card-soft, rgba(111, 211, 154, .26)),
        0 6px 18px rgba(0, 0, 0, .65),
        0 0 22px var(--dy-card-soft, rgba(111, 211, 154, .4));
    animation: dmqc-dy-card-pulse 1.4s ease-in-out infinite;
}
/* 神武形态下点了"栏位匣子"而不是里面的神兵时的提示抖动 */
.dmqc-dy-card.nudge { animation: dmqc-dy-nudge .42s ease-in-out; }
@keyframes dmqc-dy-nudge {
    0%, 100% { transform: translateX(0); }
    25%      { transform: translateX(-4px); }
    75%      { transform: translateX(4px); }
}
@keyframes dmqc-dy-card-in {
    from { opacity: 0; transform: translateY(16px) scale(.94); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes dmqc-dy-card-pulse {
    0%, 100% { box-shadow: 0 0 0 1px rgba(255,255,255,.2), inset 0 0 0 1px rgba(255,255,255,.14), inset 0 0 22px var(--dy-card-soft), 0 6px 18px rgba(0,0,0,.65), 0 0 18px var(--dy-card-soft); }
    50%      { box-shadow: 0 0 0 1px rgba(255,255,255,.34), inset 0 0 0 1px rgba(255,255,255,.22), inset 0 0 28px var(--dy-card-soft), 0 6px 18px rgba(0,0,0,.65), 0 0 30px var(--dy-card-accent); }
}

.dmqc-dy-card-head {
    position: relative; display: flex; align-items: center; gap: 8px; text-align: left; transition: none;
}
.dmqc-dy-ico {
    position: relative; display: block; flex: 0 0 34px; width: 34px; height: 34px; transition: none;
}
.dmqc-dy-ico svg { display: block; }
.dmqc-dy-card-title { position: relative; display: block; flex: 1 1 auto; transition: none; }
.dmqc-dy-card-name {
    position: relative; display: block; font-family: KaiTi, STKaiti, serif; font-size: 19px;
    line-height: 1.15; letter-spacing: 2px; color: #f2e2b4; transition: none;
}
.dmqc-dy-card-motto {
    position: relative; display: block; font-family: KaiTi, STKaiti, serif; font-size: 10.5px;
    letter-spacing: .5px; color: var(--dy-card-accent, #6fd39a); margin-top: 2px;
    white-space: nowrap; transition: none;
}
.dmqc-dy-card-seal {
    position: relative; display: block; flex: 0 0 30px; width: 30px; height: 30px; line-height: 28px;
    border-radius: 8px; text-align: center;
    font-family: xiaozhuan, KaiTi, STKaiti, serif; font-size: 18px; color: #08120f;
    background: radial-gradient(circle at 34% 28%, #ffffff 0%, var(--dy-card-accent, #6fd39a) 46%, var(--dy-card-dark, #08291d) 100%);
    border: 1.5px solid var(--dy-card-accent, #6fd39a);
    box-shadow: inset 0 0 6px rgba(0, 0, 0, .45), 0 0 8px var(--dy-card-soft, rgba(111, 211, 154, .4));
    transition: none;
}
.dmqc-dy-card.selected .dmqc-dy-card-seal { animation: dmqc-dy-seal-fire 1.5s ease-in-out infinite; }
@keyframes dmqc-dy-seal-fire {
    0%, 100% { box-shadow: inset 0 0 6px rgba(0,0,0,.45), 0 0 8px var(--dy-card-soft); }
    50%      { box-shadow: inset 0 0 8px rgba(0,0,0,.4), 0 0 18px var(--dy-card-accent); }
}

/* 已装备（被排除，不可随机获得） */
.dmqc-dy-card-eq {
    position: relative; display: flex; align-items: baseline; gap: 5px; box-sizing: border-box;
    flex-wrap: wrap;
    margin-top: 7px; padding: 3px 6px; border-radius: 6px; text-align: left;
    background: rgba(0, 0, 0, .34); border: 1px dashed rgba(200, 161, 92, .3);
    transition: none;
}
.dmqc-dy-card-eq .k {
    position: relative; display: block; flex: 0 0 auto;
    font-family: KaiTi, STKaiti, serif; font-size: 11px; letter-spacing: 0;
    color: rgba(200, 161, 92, .9); transition: none;
}
.dmqc-dy-card-eq .v {
    position: relative; display: block; flex: 1 1 auto;
    font-family: KaiTi, STKaiti, serif; font-size: 11.5px; line-height: 1.35;
    color: #8d9a92; text-decoration: line-through; text-decoration-color: rgba(200, 161, 92, .55);
    word-break: break-all; transition: none;
}
.dmqc-dy-card-eq.none .v { text-decoration: none; color: #6d7a73; }
/* 可用栏数标牌：栏位总数 >1（三陈补过栏）时标出来，方便看出「这条路的武库开了几重」 */
.dmqc-dy-card-eq .cap {
    position: relative; display: block; flex: 0 0 auto;
    padding: 0 5px; border-radius: 7px;
    font-family: yuanli, KaiTi, serif; font-size: 10.5px; line-height: 15px; white-space: nowrap;
    color: #e9e2ff;
    background: rgba(169, 140, 255, .22);
    border: 1px solid rgba(169, 140, 255, .55);
    box-shadow: 0 0 6px rgba(169, 140, 255, .35);
    transition: none;
}
/* 该类型栏位已满：本次三陈会额外补一个对应装备栏（每种至多 3 个）；
   已达 3 个时改为走"替换一件装备"的既有流程，故两种状态分开配色说明。 */
.dmqc-dy-card-eq .cap.full {
    color: #2a1e07;
    background: linear-gradient(180deg, #ffe6b0, #c8a15c 60%, #9c7a3c);
    border-color: rgba(255, 240, 205, .85);
    box-shadow: 0 0 7px rgba(200, 161, 92, .6);
}

/* 装备牌名区（核心：全数列出）。原来的「可获得 N 件 / 栏位 ×N」标题行已按需求删除，
   牌名列直接接在 eq 行下面，这里补一点上间距。 */
.dmqc-dy-pool {
    position: relative; display: flex; flex-wrap: wrap; align-content: flex-start;
    gap: 3px; box-sizing: border-box; margin-top: 6px;
    height: 152px; padding: 6px 6px 8px; border-radius: 8px; overflow-y: auto; overflow-x: hidden;
    text-align: left;
    background:
        repeating-linear-gradient(90deg, rgba(111, 211, 154, .05) 0 1px, rgba(111, 211, 154, 0) 1px 13px),
        linear-gradient(180deg, rgba(0, 0, 0, .5), rgba(0, 0, 0, .3));
    border: 1px solid rgba(200, 161, 92, .22);
    box-shadow: inset 0 0 14px rgba(0, 0, 0, .7);
    transition: none;
}
.dmqc-dy-pool::-webkit-scrollbar { width: 6px; }
.dmqc-dy-pool::-webkit-scrollbar-track { background: rgba(0, 0, 0, .4); border-radius: 3px; }
.dmqc-dy-pool::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, var(--dy-card-accent, #6fd39a), rgba(200, 161, 92, .7));
    border-radius: 3px;
}
.dmqc-dy-chip {
    position: relative; display: block; box-sizing: border-box;
    padding: 1px 5px; border-radius: 5px; white-space: nowrap;
    font-family: KaiTi, STKaiti, serif; font-size: 11.5px; line-height: 1.5;
    color: #dfece5;
    background: linear-gradient(180deg, rgba(255, 255, 255, .09), rgba(255, 255, 255, .02));
    border: 1px solid rgba(200, 161, 92, .3);
    box-shadow: inset 0 0 4px rgba(0, 0, 0, .5);
    transition: color .15s ease, border-color .15s ease, background .15s ease;
}
.dmqc-dy-card:hover .dmqc-dy-chip { border-color: rgba(200, 161, 92, .5); color: #ffffff; }
.dmqc-dy-chip.gold {
    color: #2a1e07;
    background: linear-gradient(180deg, #ffe6b0, #c8a15c 60%, #9c7a3c);
    border-color: rgba(255, 240, 205, .85);
}
/* 神武牌名：在牌名前打一枚「神」朱标，一眼区分"这是神武不是普通装备" */
.dmqc-dy-chip.shenwu {
    color: #f2ecff;
    background: linear-gradient(180deg, rgba(169, 140, 255, .3), rgba(90, 63, 208, .16));
    border-color: rgba(169, 140, 255, .62);
    box-shadow: inset 0 0 6px rgba(169, 140, 255, .28), 0 0 6px rgba(169, 140, 255, .22);
    padding-left: 17px;
}
.dmqc-dy-chip.shenwu::before {
    content: "神";
    position: absolute; left: 3px; top: 50%; transform: translateY(-50%);
    display: block; width: 11px; height: 11px; line-height: 11px; text-align: center;
    border-radius: 2px;
    font-family: xiaozhuan, KaiTi, serif; font-size: 9px; color: #1a1030;
    background: linear-gradient(180deg, #efe6ff, #a98cff);
    box-shadow: 0 0 4px rgba(169, 140, 255, .9);
}
/* 三陈 2 级（倾势·成功 / 失败 任一分支觉醒）下，库中的神兵是**可点选单位** */
.dmqc-dy-chip.can-pick { cursor: pointer; padding-left: 17px; }
.dmqc-dy-chip.can-pick:hover {
    color: #fff;
    border-color: #efe6ff;
    box-shadow: inset 0 0 6px rgba(169, 140, 255, .35), 0 0 10px rgba(169, 140, 255, .6);
}
.dmqc-dy-chip.on {
    color: #fff;
    border-color: #efe6ff;
    background: linear-gradient(180deg, #6a52d8, #3a2d78 60%, #241b52);
    box-shadow: 0 0 12px rgba(169, 140, 255, .85), inset 0 0 8px rgba(255, 255, 255, .25);
}
.dmqc-dy-chip.on::after {
    content: "选";
    position: absolute; right: -4px; top: -5px;
    display: block; width: 14px; height: 14px; line-height: 12px; box-sizing: border-box;
    border-radius: 3px; text-align: center;
    font-family: xiaozhuan, KaiTi, STKaiti, serif; font-size: 10px; color: #1a1030;
    background: linear-gradient(180deg, #efe6ff, #a98cff);
    border: 1px solid rgba(255, 255, 255, .9);
    box-shadow: 0 0 6px rgba(169, 140, 255, .95);
}

/* ==========================================================
   装备效果预览条（固定在名册下方，高度恒定 —— 悬停/点选不会让面板跳动）
   面板总高由"名册吃掉视口剩余高度"决定，所以这条是**从名册那里借**高度，
   整体框不会变大。
   ========================================================== */
.dmqc-dy-info {
    position: relative; display: block; box-sizing: border-box;
    height: 82px; margin-top: 8px; padding: 7px 11px 7px 12px;
    border-radius: 9px; overflow: hidden; text-align: left;
    background: linear-gradient(180deg, rgba(0, 0, 0, .55), rgba(0, 0, 0, .34));
    border: 1px solid rgba(200, 161, 92, .3);
    box-shadow: inset 0 0 16px rgba(0, 0, 0, .7);
    transition: none;
}
.dmqc-dy-info::before {
    /* 左侧强调竖条，随当前装备的栏位取色 */
    content: ""; position: absolute; left: 0; top: 0;
    display: block; width: 3px; height: 100%;
    background: var(--dy-info-accent, rgba(200, 161, 92, .6));
    box-shadow: 0 0 10px var(--dy-info-accent, rgba(200, 161, 92, .6));
    transition: none;
}
.dmqc-dy-info-head {
    position: relative; display: flex; align-items: center; gap: 8px; margin-bottom: 4px;
    transition: none;
}
.dmqc-dy-info-seal {
    position: relative; display: block; flex: 0 0 20px; width: 20px; height: 20px; line-height: 18px;
    box-sizing: border-box; border-radius: 5px; text-align: center;
    font-family: xiaozhuan, KaiTi, STKaiti, serif; font-size: 13px; color: #0b0a16;
    background: var(--dy-info-accent, #c8a15c);
    border: 1px solid rgba(255, 255, 255, .6);
    box-shadow: 0 0 8px var(--dy-info-accent, rgba(200, 161, 92, .6));
    transition: none;
}
.dmqc-dy-info-name {
    position: relative; display: block;
    font-family: KaiTi, STKaiti, serif; font-size: 16px; letter-spacing: 1px; color: #f2e2b4;
    text-shadow: 0 1px 3px #000; transition: none;
}
.dmqc-dy-info-kind {
    position: relative; display: block; margin-left: 2px; padding: 0 7px;
    border-radius: 8px; font-family: yuanli, KaiTi, serif; font-size: 11px; line-height: 16px;
    color: #e9e2ff; background: rgba(169, 140, 255, .22);
    border: 1px solid rgba(169, 140, 255, .5); transition: none;
}
.dmqc-dy-info-kind.plain {
    color: #d9c08a; background: rgba(200, 161, 92, .18); border-color: rgba(200, 161, 92, .5);
}
.dmqc-dy-info-body {
    position: relative; display: block; box-sizing: border-box;
    max-height: 44px; overflow-y: auto; padding-right: 4px;
    font-family: KaiTi, STKaiti, serif; font-size: 12.5px; line-height: 1.5; color: #c8d6cd;
    transition: none;
}
.dmqc-dy-info-body::-webkit-scrollbar { width: 5px; }
.dmqc-dy-info-body::-webkit-scrollbar-thumb { background: rgba(200, 161, 92, .6); border-radius: 3px; }
.dmqc-dy-info-body b { color: #f2e2b4; }
.dmqc-dy-info-body .none { color: #7d8a83; }
.dmqc-dy-info.idle .dmqc-dy-info-seal { opacity: .5; }
.dmqc-dy-info.idle .dmqc-dy-info-name { color: #8a9a91; }
.dmqc-dy-pool .empty {
    position: relative; display: block; width: 100%; text-align: center;
    font-family: KaiTi, serif; font-size: 12px; color: #7d8a83; padding-top: 22px;
    letter-spacing: 1px; transition: none;
}

/* 操作栏 */
.dmqc-dy-bar {
    position: relative; display: flex; flex-direction: row; flex-wrap: nowrap;
    justify-content: center; align-items: center; gap: 22px; margin: 11px 0 2px; transition: none;
}
.dmqc-dy-ok {
    position: relative; display: block; box-sizing: border-box; min-width: 168px; padding: 8px 6px;
    text-align: center; border-radius: 9px; cursor: pointer; user-select: none;
    font-family: KaiTi, STKaiti, serif; font-size: 18px; letter-spacing: 4px; font-weight: bold;
    color: #08150f;
    background: linear-gradient(180deg, #d8ffe9, #6fd39a 55%, #2f8f63);
    border: 1px solid #eafff4;
    box-shadow: 0 0 14px var(--dy-green-soft), inset 0 0 0 1px rgba(255, 255, 255, .4);
    transition: filter .15s ease, opacity .15s ease;
}
.dmqc-dy-cancel {
    position: relative; display: block; box-sizing: border-box; min-width: 122px; padding: 8px 6px;
    text-align: center; border-radius: 9px; cursor: pointer; user-select: none;
    font-family: KaiTi, STKaiti, serif; font-size: 17px; letter-spacing: 4px;
    color: #d6e6dd;
    background: linear-gradient(180deg, #14262a, #0b1618 60%, #060d0e);
    border: 1px solid rgba(200, 161, 92, .5);
    box-shadow: 0 0 10px rgba(0, 0, 0, .5), inset 0 0 0 1px rgba(255, 255, 255, .06);
    transition: filter .15s ease, opacity .15s ease;
}
.dmqc-dy-hint {
    position: relative; display: block; margin-top: 8px;
    font-family: yuanli, KaiTi, serif; font-size: 11.5px; letter-spacing: .5px;
    color: #a3b5ab; text-shadow: 0 1px 3px #000, 0 0 8px rgba(0, 0, 0, .9);
    transition: none;
}
.dmqc-dy-hint b { color: var(--dy-green); }
.dmqc-dy-foot {
    position: relative; display: block; margin-top: 6px;
    font-family: xiaozhuan, KaiTi, STKaiti, serif; font-size: 13px; letter-spacing: 4px;
    color: #d8b878; text-shadow: 0 1px 3px #000, 0 0 10px rgba(0, 0, 0, .95), 0 0 12px var(--dy-green-soft);
    transition: none;
}
.dmqc-dy-foot em {
    display: block; margin-top: 3px; font-family: yuanli, KaiTi, serif; font-style: normal;
    font-size: 10.5px; letter-spacing: .5px; color: #86968c;
    text-shadow: 0 1px 3px #000, 0 0 8px rgba(0, 0, 0, .95);
}

/* 无障碍：减弱动态效果 */
@media (prefers-reduced-motion: reduce) {
    .dmqc-dy, .dmqc-dy-card, .dmqc-dy-card.selected, .dmqc-dy-gauge-joints i.tip,
    .dmqc-dy-gauge-wash, .dmqc-dy-pip.pay, .dmqc-dy-card.selected .dmqc-dy-card-seal {
        animation: none !important;
    }
}
`;
    document.head.appendChild(style);
}

// ============================================================
//  三、破竹 · 竹节进度条
// ============================================================

/**
 * 读「回合开始时的体力数」（进度条分母）。
 * 由【破竹】的 phaseBegin 写入（每名角色的回合开始时都会刷新，不只是自己回合）；
 * 若尚未写入（例如刚开局还没轮到任何人），以当前体力兜底并落盘，
 * 保证进度条「始终显示」而不是空着。
 */
function dmqcPozhuTurnHp(player) {
    let v = player.storage ? player.storage[DMQC_DUYU_TURN_HP_KEY] : undefined;
    if (typeof v !== "number" || isNaN(v) || v < 0) {
        v = Math.max(0, player.getHp());
        try {
            player.storage[DMQC_DUYU_TURN_HP_KEY] = v;
        } catch (e) {}
    }
    return Math.floor(v);
}

/**
 * 把进度条对齐到「可见武将牌」的右边缘。
 *
 * 为什么不能直接用 `left:100%`：引擎的 `.player` 节点宽度并不等于可见牌宽
 * （default 布局下 `.player` 是 240px —— 为双将/国战并排预留，而 `.avatar` 只有
 * 100px 且在 left:10px；`.player.minskin` 才是 120px）。挂在 `.player` 的 100%
 * 处会让进度条飘到离卡面很远的地方。这里改为读取 `.avatar` 的实际几何
 * （offsetLeft / offsetTop / offsetWidth / offsetHeight）来定位；
 * 读不到（尚未布局完成）时回退 `left:100% / height:100%` 的旧写法。
 */
function dmqcSyncGaugeGeometry(player) {
    const gauge = player.dmqcDuyuGauge;
    if (!gauge) return;
    const ava = player.node && player.node.avatar;
    const w = ava ? ava.offsetWidth : 0;
    const h = ava ? ava.offsetHeight : 0;
    const usable = w > 4 && h > 4;
    const left = usable ? ava.offsetLeft + w + 5 : null;
    const top = usable ? ava.offsetTop : null;
    const height = usable ? h : null;
    const sig = left + "|" + top + "|" + height;
    if (gauge._geo === sig) return;
    gauge._geo = sig;
    if (usable) {
        gauge.wrap.style.left = left + "px";
        gauge.wrap.style.top = top + "px";
        gauge.wrap.style.height = height + "px";
        gauge.wrap.style.marginLeft = "0px";
    } else {
        gauge.wrap.style.left = "100%";
        gauge.wrap.style.top = "0px";
        gauge.wrap.style.height = "100%";
        gauge.wrap.style.marginLeft = "5px";
    }
}

/** 按 total 重建竹节格（total 变化时才调用） */
function dmqcRebuildGaugeJoints(gauge, total) {
    const track = gauge.track;
    const joints = gauge.joints;
    while (joints.firstChild) joints.removeChild(joints.firstChild);
    const nodes = [];
    const count = Math.max(0, total);
    for (let i = 0; i < count; i++) {
        const seg = document.createElement("i");
        joints.appendChild(seg);
        nodes.push(seg);
    }
    // 格数过多时逐级简化：先收窄间隙，再退化为「只有流光」的纯进度条
    track.classList.toggle("dense", count > 10 && count <= 22);
    track.classList.toggle("minimal", count > 22);
    gauge.nodes = nodes;
    gauge._total = count;
}

/** 把「分子 / 分母」画上去 */
function dmqcPaintGauge(gauge, marks, total) {
    const nodes = gauge.nodes || [];
    for (let i = 0; i < nodes.length; i++) {
        const on = i < marks;
        const node = nodes[i];
        if (node.classList.contains("on") !== on) node.classList.toggle("on", on);
        node.classList.toggle("tip", on && i === marks - 1);
        node.classList.toggle("top", i === nodes.length - 1);
    }
    const pct = total > 0 ? Math.min(100, Math.round((marks / total) * 100)) : 0;
    gauge.wash.style.height = pct + "%";
    gauge.cur.textContent = String(marks);
    gauge.tot.textContent = total > 0 ? String(total) : "—";
    gauge.wrap.classList.toggle("full", total > 0 && marks >= total);
    gauge.wrap.classList.toggle("void", marks <= 0);
    gauge.wrap.title = "破竹：" + marks + " / " + total + "（回合开始时体力数）";
}

/** 在武将牌右侧建立竹节进度条（已存在则先移除重建） */
export function dmqcBuildPozhuGauge(player) {
    // 自行保证样式已注入：本函数是导出的对外入口，不能假设调用方已经注入过
    try {
        dmqcInjectDuyuStyle();
    } catch (e) {}
    if (player.dmqcDuyuGauge) {
        try {
            player.dmqcDuyuGauge.wrap.remove();
        } catch (e) {}
        delete player.dmqcDuyuGauge;
    }
    const wrap = document.createElement("div");
    wrap.className = "dmqc-dy-gauge";
    wrap.setAttribute("aria-hidden", "true");

    const brand = document.createElement("div");
    brand.className = "dmqc-dy-gauge-brand";
    brand.innerHTML = "<span>破</span><span>竹</span>";

    const track = document.createElement("div");
    track.className = "dmqc-dy-gauge-track";

    const wash = document.createElement("div");
    wash.className = "dmqc-dy-gauge-wash";

    const joints = document.createElement("div");
    joints.className = "dmqc-dy-gauge-joints";

    track.appendChild(wash);
    track.appendChild(joints);

    const read = document.createElement("div");
    read.className = "dmqc-dy-gauge-read";
    const cur = document.createElement("b");
    cur.textContent = "0";
    const slash = document.createElement("i");
    slash.textContent = "/";
    const tot = document.createElement("span");
    tot.textContent = "0";
    read.appendChild(cur);
    read.appendChild(slash);
    read.appendChild(tot);

    wrap.appendChild(brand);
    wrap.appendChild(track);
    wrap.appendChild(read);
    player.appendChild(wrap);

    player.dmqcDuyuGauge = {
        wrap,
        brand,
        track,
        wash,
        joints,
        read,
        cur,
        tot,
        nodes: [],
        _total: -1,
        _sig: "",
        _geo: "",
    };
    return player.dmqcDuyuGauge;
}

/**
 * 刷新竹节进度条：分子 = 当前「破竹」标记数，分母 = 回合开始时体力数。
 * 幂等、带签名短路；任何异常静默，绝不影响技能结算。
 */
export function dmqcRefreshPozhuGauge(player) {
    try {
        if (!player || player.removed) return;
        if (player.isOut && player.isOut()) return;
        // 只有这套 UI 的主人（梦杜预）才渲染；其余角色即便收到 global 触发也不画
        if (player.hasSkill && !player.hasSkill(DMQC_DUYU_UI_SKILL)) {
            if (player.dmqcDuyuGauge) {
                try {
                    player.dmqcDuyuGauge.wrap.remove();
                } catch (e) {}
                delete player.dmqcDuyuGauge;
            }
            return;
        }
        const marks = Math.max(0, player.countMark ? player.countMark(DMQC_DUYU_POZHU_MARK) || 0 : 0);
        const total = dmqcPozhuTurnHp(player);
        if (!player.dmqcDuyuGauge) dmqcBuildPozhuGauge(player);
        const gauge = player.dmqcDuyuGauge;
        if (!gauge) return;

        // 卡面几何可能随布局/窗口变化，先对齐（内部带签名短路，不产生无谓写入）
        dmqcSyncGaugeGeometry(player);

        const totalChanged = gauge._total !== total;
        if (totalChanged) dmqcRebuildGaugeJoints(gauge, total);
        const sig = marks + "/" + total;
        if (!totalChanged && gauge._sig === sig) return;
        gauge._sig = sig;
        dmqcPaintGauge(gauge, marks, total);
    } catch (e) {
        // 表现层异常静默
    }
}

/** 轮询兜底：标记/体力的一切变化，最迟下一拍体现在进度条上 */
function dmqcStartPozhuGaugePolling(player) {
    try {
        if (player.dmqcDuyuGaugeTimer) clearInterval(player.dmqcDuyuGaugeTimer);
        player.dmqcDuyuGaugeTimer = setInterval(function () {
            dmqcRefreshPozhuGauge(player);
        }, 460);
    } catch (e) {}
}

/**
 * 破竹 · 竹节进度条（charlotte UI 技能，挂在 character/sgz_duyu.js 的 skills 里）
 * 不参与任何规则结算，只负责把「破竹标记数 / 回合开始时体力数」常驻显示在武将牌右侧。
 */
export const pozhuGaugeUI = {
    charlotte: true,
    silent: true,
    forced: true,
    priority: -10,
    trigger: {
        player: ["enterGame", "addMark", "removeMark", "phaseBegin", "phaseAfter"],
        global: ["gameStart", "phaseBeginStart", "roundStart", "gainMaxHpEnd", "loseMaxHpEnd"],
    },
    init(player) {
        try {
            dmqcInjectDuyuStyle();
        } catch (e) {}
        try {
            dmqcRefreshPozhuGauge(player);
        } catch (e) {}
        dmqcStartPozhuGaugePolling(player);
    },
    // ⚠ 必须是 async 写法：StepCompiler 用隔离的 Function 构造器编译 step 写法，
    //    编译后的函数拿不到模块作用域，里面调 dmqcRefreshPozhuGauge 会 ReferenceError
    //    （本包 sgz_duyu.js / sgz_weiyan.js 顶部都有同样的备忘）。async 走 AsyncCompiler，保留闭包。
    async content(event, trigger, player) {
        try {
            dmqcRefreshPozhuGauge(player);
        } catch (e) {}
    },
    onremove(player) {
        if (player.dmqcDuyuGaugeTimer) {
            try {
                clearInterval(player.dmqcDuyuGaugeTimer);
            } catch (e) {}
            delete player.dmqcDuyuGaugeTimer;
        }
        if (player.dmqcDuyuGauge) {
            try {
                player.dmqcDuyuGauge.wrap.remove();
            } catch (e) {}
            delete player.dmqcDuyuGauge;
        }
    },
};

// ============================================================
//  四、三陈 · 「武库开阖」主题选择框
// ============================================================

// 四种装备栏的矢量图标（内联 SVG：可用 CSS 渐变，且不依赖外部素材）
function dmqcDuyuSlotIcon(slot, accent) {
    const a = accent;
    if (slot === "equip1") {
        // 兵器：戟（矛尖 + 双侧月牙刃 + 长杆）
        return (
            '<svg viewBox="0 0 44 44" width="34" height="34" aria-hidden="true">'
            + '<path d="M22 3 L27.5 12 L24.4 12 L25.4 41 L18.6 41 L19.6 12 L16.5 12 Z" fill="' + a + '"/>'
            + '<path d="M25 15.5 C 33.5 16 38 21 37.6 28 C 33.4 24.2 29.2 21.8 25 20.6 Z" fill="' + a + '" opacity=".72"/>'
            + '<path d="M19 15.5 C 10.5 16 6 21 6.4 28 C 10.6 24.2 14.8 21.8 19 20.6 Z" fill="' + a + '" opacity=".72"/>'
            + '<path d="M22 3 L27.5 12 L24.4 12 L25.4 41 L18.6 41 L19.6 12 L16.5 12 Z" fill="none" stroke="#02100c" stroke-width="1.1"/>'
            + '<rect x="16.5" y="30" width="11" height="3" rx="1.4" fill="#02100c" opacity=".65"/>'
            + "</svg>"
        );
    }
    if (slot === "equip2") {
        // 甲胄：札甲胸甲（肩带 + 横向甲片）
        return (
            '<svg viewBox="0 0 44 44" width="34" height="34" aria-hidden="true">'
            + '<path d="M13 7 L22 3.5 L31 7 L33.5 28 C 30.5 35 26.5 38.5 22 40.5 C 17.5 38.5 13.5 35 10.5 28 Z"'
            + ' fill="' + a + '" fill-opacity=".3" stroke="' + a + '" stroke-width="1.9"/>'
            + '<g stroke="' + a + '" stroke-width="1.3" opacity=".95">'
            + '<path d="M11.6 14.5 H32.4"/><path d="M10.6 22 H33.4"/><path d="M11.8 29.5 H32.2"/>'
            + "</g>"
            + '<path d="M22 3.5 V40.5" stroke="#02100c" stroke-width="1" opacity=".45"/>'
            + '<path d="M13 7 L22 3.5 L31 7" fill="none" stroke="#02100c" stroke-width="1.1" opacity=".5"/>'
            + "</svg>"
        );
    }
    // 坐骑：马蹄铁；防御向下收、进攻向上突
    const def = slot === "equip3";
    return (
        '<svg viewBox="0 0 44 44" width="34" height="34" aria-hidden="true">'
        + '<path d="M12 40 V21 A10 10 0 0 1 32 21 V40" fill="none" stroke="' + a + '" stroke-width="5.4" stroke-linecap="round" opacity=".92"/>'
        + '<path d="M12 40 V21 A10 10 0 0 1 32 21 V40" fill="none" stroke="#02100c" stroke-width="1.1" stroke-linecap="round" opacity=".35"/>'
        + '<g fill="#02100c" opacity=".6">'
        + '<circle cx="12" cy="31" r="1.5"/><circle cx="12" cy="23.5" r="1.5"/>'
        + '<circle cx="32" cy="31" r="1.5"/><circle cx="32" cy="23.5" r="1.5"/>'
        + "</g>"
        + (def
            ? '<path d="M22 9 V25 M22 25 l-6 -6 M22 25 l6 -6" fill="none" stroke="' + a + '" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>'
            : '<path d="M22 26 V11 M22 11 l-6 6 M22 11 l6 6" fill="none" stroke="' + a + '" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>')
        + "</svg>"
    );
}

// 陈令计数 → 小竹节点（超过 12 枚折叠为「+n」）
function dmqcDuyuCostPips(marks, cost) {
    const payStart = Math.max(0, marks - cost);
    const show = Math.min(marks, 12);
    let html = "";
    for (let i = 0; i < show; i++) {
        // 末尾 cost 枚 = 本次要付掉的
        const isPay = i >= payStart && marks <= 12;
        html += '<span class="dmqc-dy-pip' + (isPay ? " pay" : "") + '"></span>';
    }
    if (marks > 12) html += '<span class="dmqc-dy-pip more">×' + marks + "</span>";
    if (marks <= 0) html += '<span class="dmqc-dy-pip more">无</span>';
    return html;
}

/**
 * 选择框内随形态/候选变化的文案集。
 *
 *  shenwu=false（三陈1级，未觉醒）：选择一种装备栏，随机**获得**一张你未装备的该类型装备牌（进手牌）
 *  shenwu=true （三陈2级，倾势·成功 / 失败 任一分支觉醒）：自选一件你未装备的「神武」（同样进手牌）
 *
 * 两条觉醒分支的 2 级效果完全相同，所以文案一致；只是 form 仍按分支换皮
 * （success = 明金武库 / fail = 幽紫冷银），两套主题绝不混用。
 * 两级的共同点：**获得该牌时**若「对应的那个装备栏已满」（已装备件数 ≥ 栏位总数）
 * 且该类型栏位还没到 3 个，则额外获得一个该类型的装备栏。
 *（原本的「可获得 N 件 / 栏位 ×N」标题行、卡片代价行、按钮下方提示行都已按需求删除，
 *  这里不再保留对应的文案字段。）
 */
function dmqcDuyuDialogText(form, shenwu, cost, marks) {
    if (shenwu) {
        return {
            sub:
                "移除 <b>" + cost + "</b> 枚「陈令」，自武库中取出你选定的那件【神武】加入手牌"
                + '<span style="color:#9aa8c4;">（三陈·2级：直接点选库中的神兵；该类型栏位已满则额外获得一个该类型装备栏）</span>',
            costLabel: "陈令",
            costTail: "获得神武 <b>1</b> 件｜栏位已满则额外 <b>+1</b> 栏",
            label: "◆ 点选一件神兵获得之（牌名前带「神」标，进手牌）；移上指针可看其效果",
            ok: "神 兵",
            footEm: "点选神兵 → 神兵　/　Esc 取消",
        };
    }
    return {
        sub:
            "移除 <b>" + cost + "</b> 枚「陈令」，选择一种装备栏，"
            + "再从武库中随机获得一张你尚未装备的该类装备牌加入手牌"
            + '<span style="color:#9aa8c4;">（该类型栏位已满则额外获得一个该类型装备栏，每种至多3个）</span>',
        costLabel: "陈令",
        costTail: "随机获得 <b>1</b> 件｜栏位已满则额外 <b>+1</b> 栏",
        label: "◆ 择一种装备栏（卡片内已列出武库中可随机获得的全部装备牌名）",
        ok: "开 阖",
        footEm: "点选装备栏 → 开阖　/　Esc 取消",
    };
}

/**
 * 取一张装备牌的效果说明（用于三陈框下方的「装备效果」预览条）。
 *
 * 与引擎自己的卡牌详情取同一处来源：`lib.translate[牌名 + "_info"]`
 * （引擎在 game/index.js:6344 也把 `lib.card[name].description` 写进这个键）。
 * 没有的话就退而合并这张牌挂在卡面上的各条技能说明 `lib.translate[技能 + "_info"]`。
 *
 * @returns {string|null} 可直接塞进 innerHTML 的说明（可能含 <br>）；取不到时返回 null
 */
function dmqcDuyuEquipInfo(name) {
    if (!name) return null;
    try {
        if (lib.translate && lib.translate[name + "_info"]) {
            return String(lib.translate[name + "_info"]);
        }
    } catch (e) {}
    try {
        const info = lib.card && lib.card[name];
        let skills = [];
        if (info) {
            if (Array.isArray(info.skills)) skills = info.skills.slice(0);
            else if (typeof info.skills === "string") skills = [info.skills];
            if (typeof info.skill === "string") skills.push(info.skill);
        }
        const parts = [];
        skills.forEach(function (sk) {
            const skName = (lib.translate && lib.translate[sk]) || sk;
            const desc =
                (lib.translate && lib.translate[sk + "_info"]) ||
                (lib.skill && lib.skill[sk] && typeof lib.skill[sk].description === "string" ? lib.skill[sk].description : "");
            if (desc) {
                parts.push('<b style="color:#f2e2b4;">' + skName + "</b>　" + desc);
            } else if (skName) {
                parts.push('<b style="color:#f2e2b4;">' + skName + "</b>");
            }
        });
        if (parts.length) return parts.join("<br>");
    } catch (e) {}
    try {
        const info = lib.card && lib.card[name];
        if (info && typeof info.description === "string" && info.description) return info.description;
        if (info && typeof info.intro === "string" && info.intro) return info.intro;
    } catch (e) {}
    return null;
}

/**
 * 构建三陈「武库开阖 / 神兵出世」选择框（自包含 Promise）。
 *
 * 两条觉醒分支（success / fail）的三陈 2 级**效果完全相同**（均为自选神武），
 * 区别只在皮肤与头像；绝不复用对方的配色与立绘。
 *
 * 三陈本身是「**获得**装备牌进手牌」，不是直接装备，故本框只负责选人：
 * 选栏位（1级，牌名随机）或点选神兵（2级，牌名自选）。
 *
 * @param {Player} player 发动者
 * @param {object} opts
 *   avail      [{ slot, name, candidates: string[], full?: boolean }] —— 仅含「武库中还有你未装备的该类牌」的栏位；
 *              candidates 为可直接获得的牌名（**已排除你当前装备的同名牌**），本框会全部列出；
 *              full 为该类型装备栏此刻是否已满（＝已装备件数 ≥ 栏位总数；满且未达 slotMax 时本次会额外获得一个装备栏）。
 *   marks      当前「陈令」标记数（默认读引擎）
 *   cost       本次消耗数（默认 3）
 *   equipped   { slot: string[] } 各栏位当前已装备的牌名（用于展示「不可重复获得」）
 *   form       "base" | "success" | "fail"（缺省时按 awakened / shenwu 推断，见 dmqcDuyuNormalizeForm）
 *   awakened   兼容旧入参：true 等价于 form:"success"
 *   shenwu     本次候选是否为「神武」（＝三陈是否已升到 2 级）。缺省时 form==="fail" 即为 true。
 *   capacity   { slot: number } 各栏位当前可用栏数；>1 时卡片上显示「栏位 ×N」
 *   slotMax    每种装备栏的可用栏数上限（默认 3，即最多额外获得 2 个扩展栏位）
 * @returns {Promise<{bool:boolean, links:string[]}|null>} links=[slot]；null 表示框未建立，调用方回退引擎默认框
 */
export function dmqcBuildSanchenDialog(player, opts) {
    // 构建期异常会 reject；必须保证 game.resume() 一定被调用，否则游戏永久卡住
    let resumeGuard = false;
    let domNode = null;

    return new Promise(function (resolve) {
        const cfg = opts || {};
        const avail = (Array.isArray(cfg.avail) ? cfg.avail : []).filter(function (o) {
            return o && o.slot && DMQC_DUYU_SLOT_META[o.slot] && Array.isArray(o.candidates);
        });
        const marks = typeof cfg.marks === "number" ? cfg.marks : player.countMark(DMQC_DUYU_MARK);
        const cost = typeof cfg.cost === "number" ? cfg.cost : DMQC_SANCHEN_COST;
        const equipped = cfg.equipped || {};
        const capacity = cfg.capacity || {};
        const slotMax = typeof cfg.slotMax === "number" && cfg.slotMax > 0 ? cfg.slotMax : 3;
        const form = dmqcDuyuNormalizeForm(cfg);
        const F = DMQC_DUYU_FORMS[form] || DMQC_DUYU_FORMS.base;
        // 候选是「神武」（三陈 2 级）时：卡片文案/牌名标记随之切换
        const shenwu = typeof cfg.shenwu === "boolean" ? cfg.shenwu : form === "fail";
        const T = dmqcDuyuDialogText(form, shenwu, cost, marks);

        // 只有一个可选项时无需弹框（调用方会直接采用）
        if (avail.length < 2) {
            resolve(null);
            return;
        }

        try {
            dmqcInjectDuyuStyle();
        } catch (e) {}

        game.pause();
        resumeGuard = true;

        const evtName = lib.config.touchscreen ? "touchend" : "click";
        let sel = null;
        // 神武形态（倾势·失败）下：具体选定的那一件神兵牌名（其余形态恒为 null）
        let selCard = null;
        let closed = false;
        let overlay = null;
        let okNode = null;
        let hintNode = null;
        // 神武形态下点了"栏位匣子"时的抖动提示计时器
        let nudgeTimer = null;
        const cards = [];
        const keys = avail.map(function (o) {
            return o.slot;
        });

        function cleanup() {
            try {
                document.removeEventListener("keydown", keyHandler, true);
            } catch (e) {}
            try {
                if (nudgeTimer) clearTimeout(nudgeTimer);
            } catch (e) {}
            try {
                if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
            } catch (e) {}
        }

        function finish(result) {
            if (closed) return;
            closed = true;
            cleanup();
            game.resume();
            resolve(result);
        }

        // 键盘：←/→ 换栏位，1~4 直选，Enter 确认，Esc 取消
        function keyHandler(e) {
            if (closed || !e) return;
            const k = e.key;
            let handled = true;
            if (k === "Escape") {
                finish({ bool: false });
            } else if (k === "Enter") {
                if (sel) finish({ bool: true, links: [sel] });
            } else if (k === "ArrowLeft" || k === "ArrowUp") {
                const i = keys.indexOf(sel);
                sel = keys[i <= 0 ? keys.length - 1 : i - 1];
                sync(false);
            } else if (k === "ArrowRight" || k === "ArrowDown") {
                const i = keys.indexOf(sel);
                sel = keys[i < 0 || i >= keys.length - 1 ? 0 : i + 1];
                sync(false);
            } else if (/^[1-4]$/.test(k)) {
                const idx = parseInt(k) - 1;
                if (idx < keys.length) {
                    sel = keys[idx];
                    sync(false);
                }
            } else {
                handled = false;
            }
            if (handled) {
                if (e.preventDefault) e.preventDefault();
                if (e.stopPropagation) e.stopPropagation();
            }
        }

        // ---------- 全屏遮罩 ----------
        overlay = document.createElement("div");
        overlay.className = "dmqc-dy-overlay";
        domNode = overlay;
        overlay.addEventListener(evtName, function (e) {
            if (e) {
                if (e.stopPropagation) e.stopPropagation();
                if (e.preventDefault) e.preventDefault();
            }
        });
        ui.window.appendChild(overlay);

        // ---------- 视口缩放 ----------
        const designW = 980;
        const designH = 600;
        const vw = window.innerWidth || document.documentElement.clientWidth || 1366;
        const vh = window.innerHeight || document.documentElement.clientHeight || 768;
        const scale = Math.min(1, (vw - 24) / designW, (vh - 24) / designH);

        const panel = document.createElement("div");
        panel.className = "dmqc-dy" + (F.cls ? " " + F.cls : "");
        panel.style.cssText =
            "position:absolute;left:50%;top:50%;display:block;box-sizing:border-box;width:" + designW + "px;"
            + "transform:translate(-50%,-50%) scale(" + scale + ");transform-origin:center center;transition:none;"
            + "padding:18px 22px 12px;border-radius:16px;overflow:hidden;text-align:center;";
        panel.style.setProperty("--dy-scale", scale);
        overlay.appendChild(panel);

        // ---------- 装饰层 ----------
        panel.insertAdjacentHTML(
            "beforeend",
            '<div class="dmqc-dy-bg" aria-hidden="true"></div>'
            + '<div class="dmqc-dy-emblem" aria-hidden="true"></div>'
            + '<div class="dmqc-dy-corner tl" aria-hidden="true"></div>'
            + '<div class="dmqc-dy-corner tr" aria-hidden="true"></div>'
            + '<div class="dmqc-dy-corner bl" aria-hidden="true"></div>'
            + '<div class="dmqc-dy-corner br" aria-hidden="true"></div>'
        );
        panel.querySelector(".dmqc-dy-bg").style.backgroundImage = "url('" + F.bg + "')";
        panel.querySelector(".dmqc-dy-emblem").style.backgroundImage = "url('" + F.emblem + "')";

        // 微粒上浮（在装饰层之上、正文之下）；失败形态用幽紫电屑
        dmqcMountParticles(panel, F.particles, { before: panel.querySelector(".dmqc-dy-corner") });

        // ---------- 头部 ----------
        const head = document.createElement("div");
        head.className = "dmqc-dy-head";

        const ava = document.createElement("div");
        ava.className = "dmqc-dy-ava";
        // 头像按觉醒分支区分：未觉醒 / 成功(sgz_duyu2) / 失败(sgz_duyu3)
        ava.style.backgroundImage = "url('" + F.avatar + "')";
        head.appendChild(ava);

        const titleWrap = document.createElement("div");
        titleWrap.className = "dmqc-dy-titlewrap";
        // 标题上方的铭文（kicker）按需求删掉：整框过高，先从这里省；
        // 觉醒分支已由下方的「倾势·失败 ｜ 神武之路」标牌说明，信息不丢。
        titleWrap.innerHTML =
            '<div class="dmqc-dy-title">' + F.title + "</div>"
            + '<div class="dmqc-dy-sub">' + T.sub + "</div>"
            + (F.state ? '<div class="dmqc-dy-state">' + F.state + "</div>" : "");
        head.appendChild(titleWrap);

        const side = document.createElement("div");
        side.className = "dmqc-dy-side";
        side.innerHTML =
            '<span style="color:var(--dy-green);">' + F.side[0] + "</span>"
            + '<span style="color:var(--dy-bronze);">' + F.side[1] + "</span>";
        head.appendChild(side);

        panel.appendChild(head);

        const ruler = document.createElement("div");
        ruler.className = "dmqc-dy-ruler";
        panel.appendChild(ruler);

        // ---------- 陈令消耗条 ----------
        const costRow = document.createElement("div");
        costRow.className = "dmqc-dy-costrow";
        costRow.innerHTML =
            '<div class="dmqc-dy-costbox">'
            + '<span class="k">' + T.costLabel + "</span>"
            + '<span class="dmqc-dy-pips">' + dmqcDuyuCostPips(marks, cost) + "</span>"
            + "</div>"
            + '<div class="dmqc-dy-costtext">移除 <b>' + cost + "</b> 枚 ｜ 剩余 <em>"
            + Math.max(0, marks - cost) + "</em> 枚 ｜ " + T.costTail + "</div>";
        panel.appendChild(costRow);

        const label = document.createElement("div");
        label.className = "dmqc-dy-label";
        const labelHtml = T.label;
        label.innerHTML = labelHtml;
        panel.appendChild(label);

        // 按钮下方原本那行提示已按需求删除（整框过高）。
        // 需要临时告知玩家时，改为**在已有的标签行上闪现**——标签行本来就占位，
        // 换字不会改变面板高度，不会出现抖动。
        let labelTimer = null;
        function flashLabel(html, ms) {
            if (!label) return;
            try {
                label.innerHTML = html;
                if (labelTimer) clearTimeout(labelTimer);
                labelTimer = setTimeout(function () {
                    label.innerHTML = labelHtml;
                }, ms || 1600);
            } catch (e) {}
        }

        // ---------- 装备栏卡行 ----------
        const cardRow = document.createElement("div");
        cardRow.className = "dmqc-dy-cards";
        panel.appendChild(cardRow);

        function cardWidth(n) {
            // 面板内容宽 = 980 - 22*2 = 936；间距 14
            return n >= 4 ? 223 : n === 3 ? 250 : 262;
        }
        const cw = cardWidth(avail.length);

        avail.forEach(function (opt, i) {
            const meta = DMQC_DUYU_SLOT_META[opt.slot];
            const owned = (equipped[opt.slot] || []).filter(Boolean).map(function (n) {
                return get.translation(n);
            });
            const pool = opt.candidates.slice(0);
            // 每张卡仍按自己的栏位取色（方便分辨兵器/甲胄/坐骑），
            // 但失败形态整体换成幽紫冷银一族，不会与成功形态撞色。
            const accent = form === "fail" ? meta.accentFail : form === "success" ? "#f0c86a" : meta.accent;
            const dark = form === "fail" ? meta.darkFail : meta.dark;
            const soft = form === "fail" ? "rgba(169,140,255,.3)" : "rgba(200,161,92,.26)";
            const caps = Math.max(1, Math.floor(capacity[opt.slot] || 1));
            // 该类型栏位此刻是否已满：优先用调用方给的状态；再不行就按
            // 「已装备件数 ≥ 该类型栏位总数」自己推一遍（两个来源互为兜底，绝不显示矛盾信息）。
            // 已满 且 栏位数 < slotMax 时，本次会**额外获得**一个该类型的装备栏（每种至多 slotMax 个）；
            // 已满但栏位数已达 slotMax 时，本次不再补栏（只把牌拿到手）。
            const isFull =
                typeof opt.full === "boolean"
                    ? opt.full
                    : capacity[opt.slot] != null
                      ? caps <= owned.length
                      : false;
            const canExpand = isFull && caps < slotMax;

            const node = document.createElement("div");
            node.className = "dmqc-dy-card";
            node.style.width = cw + "px";
            node.style.flexBasis = cw + "px";
            node.style.animationDelay = 110 + i * 60 + "ms";
            node.style.setProperty("--dy-card-accent", accent);
            node.style.setProperty("--dy-card-dark", dark);
            node.style.setProperty("--dy-card-soft", soft);

            const poolHtml = pool.length
                ? pool
                      .map(function (name) {
                          // 神武候选在牌名前打一枚「神」标，与普通装备一眼区分；
                          // 三陈·2级里它们就是可点选单位（可直接挑定具体是哪一件）
                          return (
                              '<span class="dmqc-dy-chip'
                              + (shenwu ? " shenwu" : "")
                              + (shenwu ? " can-pick" : "")
                              + '" data-name="' + name + '">'
                              + get.translation(name)
                              + "</span>"
                          );
                      })
                      .join("")
                : '<span class="empty">' + (shenwu ? "已无此类未装备之神武" : "武库中已无此类未装备之牌") + "</span>";

            const eqTail =
                (caps > 1 ? '<span class="cap">栏位 ×' + caps + "</span>" : "")
                + (canExpand
                    ? '<span class="cap full">栏位已满 · 额外 +1 栏</span>'
                    : isFull
                      ? '<span class="cap full">栏位已满 · 不再补栏</span>'
                      : "");
            node.innerHTML =
                '<div class="dmqc-dy-card-head">'
                + '<div class="dmqc-dy-ico">' + dmqcDuyuSlotIcon(opt.slot, accent) + "</div>"
                + '<div class="dmqc-dy-card-title">'
                + '<div class="dmqc-dy-card-name">' + (opt.name || meta.name) + "</div>"
                + '<div class="dmqc-dy-card-motto">' + meta.motto + "</div>"
                + "</div>"
                + '<div class="dmqc-dy-card-seal">' + meta.seal + "</div>"
                + "</div>"
                + '<div class="dmqc-dy-card-eq' + (owned.length ? "" : " none") + '">'
                + '<span class="k">' + (owned.length ? "已装备" : "空置") + "</span>"
                + '<span class="v">' + (owned.length ? owned.join("、") : "该栏位尚无装备") + "</span>"
                + eqTail
                + "</div>"
                // 名册区（原来的「可获得 N 件神武 / 栏位 ×N」与「消耗 3 枚陈令 · …」两行已按需求删掉：
                // 消耗在上方陈令条里已经写明，栏位数在左侧 eq 行的 pill 里已经有了，属重复信息。）
                + '<div class="dmqc-dy-pool">' + poolHtml + "</div>";

            node.addEventListener(evtName, function (e) {
                if (e) {
                    if (e.preventDefault) e.preventDefault();
                    if (e.stopPropagation) e.stopPropagation();
                }
                if (closed) return;
                // 神武形态下栏位卡只是"取神兵的匣子"，真正的选择单位是库里的神兵本身，
                // 所以这里不单独选栏位（避免出现"选了栏位却没定牌"的半截状态）。
                if (shenwu) {
                    node.classList.add("nudge");
                    if (nudgeTimer) clearTimeout(nudgeTimer);
                    nudgeTimer = setTimeout(function () {
                        node.classList.remove("nudge");
                    }, 460);
                    flashLabel("请直接点选本栏中的<b>神兵</b>（点卡面即选定 · 再点取消）");
                    return;
                }
                sel = sel === opt.slot ? sel : opt.slot;
                sync(false);
            });
            // 双击直接确认（等价于点底部主按钮）
            node.addEventListener("dblclick", function (e) {
                if (e) {
                    if (e.preventDefault) e.preventDefault();
                    if (e.stopPropagation) e.stopPropagation();
                }
                if (closed || shenwu) return;
                sel = opt.slot;
                finish({ bool: true, links: [opt.slot] });
            });
            node.addEventListener("mouseenter", function () {
                if (closed || sel === opt.slot) return;
                node.style.borderColor = accent;
                node.style.boxShadow =
                    "0 6px 16px rgba(0,0,0,.6), inset 0 0 0 1px rgba(255,255,255,.1), 0 0 18px " + accent + "66";
            });
            node.addEventListener("mouseleave", function () {
                if (closed || sel === opt.slot) return;
                node.style.borderColor = "";
                node.style.boxShadow = "";
            });

            cardRow.appendChild(node);
            dmqcMountSheen(node, "rgba(226,255,240,.17)");
            const rec = { slot: opt.slot, node: node, accent: accent, pool: pool, chipEls: [] };
            // 神武形态：库里的每一条都是可点选单位 —— 点一下选定该件神兵（再点取消）
            if (shenwu) {
                Array.prototype.forEach.call(node.querySelectorAll(".dmqc-dy-chip.can-pick"), function (chip) {
                    const nm = chip.getAttribute("data-name");
                    chip.addEventListener(evtName, function (e) {
                        if (e) {
                            if (e.preventDefault) e.preventDefault();
                            if (e.stopPropagation) e.stopPropagation();
                        }
                        if (closed) return;
                        pickCard(nm, opt.slot);
                    });
                    // 悬停即预览该装备的技能效果（不改变选择）
                    chip.addEventListener("mouseenter", function () {
                        if (closed) return;
                        focusCard(nm, opt.slot);
                    });
                    rec.chipEls.push(chip);
                });
            } else {
                // 觉醒前 / 成功分支：仍然只选"栏位"，条目仅供预览
                Array.prototype.forEach.call(node.querySelectorAll(".dmqc-dy-chip"), function (chip) {
                    const nm = chip.getAttribute("data-name");
                    chip.addEventListener("mouseenter", function () {
                        if (closed) return;
                        focusCard(nm, opt.slot);
                    });
                });
            }
            cards.push(rec);
        });

        // ---------- 装备效果预览条 ----------
        const infoNode = document.createElement("div");
        infoNode.className = "dmqc-dy-info idle";
        infoNode.innerHTML =
            '<div class="dmqc-dy-info-head">'
            + '<span class="dmqc-dy-info-seal">览</span>'
            + '<span class="dmqc-dy-info-name">装备效果</span>'
            + '<span class="dmqc-dy-info-kind plain">预 览</span>'
            + "</div>"
            + '<div class="dmqc-dy-info-body"><span class="none">'
            + (shenwu
                ? "把指针移到右侧库中的神兵上即可查看其效果；三陈·2级可直接点选其中一件获得之。"
                : "把指针移到右侧的装备牌名上即可查看其效果。")
            + "</span></div>";
        panel.appendChild(infoNode);
        const infoSeal = infoNode.querySelector(".dmqc-dy-info-seal");
        const infoName = infoNode.querySelector(".dmqc-dy-info-name");
        const infoKind = infoNode.querySelector(".dmqc-dy-info-kind");
        const infoBody = infoNode.querySelector(".dmqc-dy-info-body");

        /** 把某件装备的效果写进预览条；name 为空则回到待看状态 */
        function showEquipInfo(name, slot) {
            const meta = DMQC_DUYU_SLOT_META[slot] || {};
            if (!name) {
                infoNode.classList.add("idle");
                infoNode.style.setProperty("--dy-info-accent", "rgba(200,161,92,.6)");
                infoSeal.textContent = "览";
                infoName.textContent = "装备效果";
                infoKind.textContent = "预 览";
                infoKind.className = "dmqc-dy-info-kind plain";
                infoBody.innerHTML =
                    '<span class="none">'
                    + (shenwu
                        ? "把指针移到右侧库中的神兵上即可查看其效果；三陈·2级可直接点选其中一件获得之。"
                        : "把指针移到右侧的装备牌名上即可查看其效果。")
                    + "</span>";
                return;
            }
            const accent = form === "fail" ? meta.accentFail : form === "success" ? "#f0c86a" : meta.accent;
            infoNode.classList.remove("idle");
            infoNode.style.setProperty("--dy-info-accent", accent || "rgba(200,161,92,.6)");
            infoSeal.textContent = meta.seal || "装";
            infoName.textContent = get.translation(name);
            const isSw = !!shenwu;
            infoKind.textContent = (isSw ? "神 武" : "装 备") + " · " + (meta.name || "");
            infoKind.className = "dmqc-dy-info-kind" + (isSw ? "" : " plain");
            const info = dmqcDuyuEquipInfo(name);
            infoBody.innerHTML = info
                ? info
                : '<span class="none">（此牌未收录效果说明）</span>';
            infoBody.scrollTop = 0;
        }
        showEquipInfo(null);

        // 悬停预览：记住最近一次悬停，取消悬停后回落到"已选定"的那件（没有则回到待看）
        function focusCard(name, slot) {
            showEquipInfo(name, slot);
        }

        // ---------- 刷新：选中态 ----------
        function sync() {
            cards.forEach(function (c) {
                // 栏位卡：觉醒前/成功 = 被选中的栏位；失败形态 = 选中神兵所在的栏位
                const on = sel === c.slot;
                c.node.classList.toggle("selected", on);
                dmqcToggleSheen(c.node, on);
                // 神武形态：库里的条目各自显示选中态
                c.chipEls.forEach(function (chip) {
                    chip.classList.toggle("on", selCard === chip.getAttribute("data-name"));
                });
            });
            const ready = shenwu ? !!selCard : !!sel;
            if (okNode) {
                okNode.style.opacity = ready ? "1" : "0.34";
                okNode.style.pointerEvents = ready ? "auto" : "none";
                okNode.style.filter = ready ? "none" : "grayscale(.8)";
            }
            // 按钮下方那行说明已按需求删除；选中的内容本身在卡片/神兵条目上已有明确反馈。
        }

        /**
         * 神武形态下点选某件神兵：
         *   再点同一件 = 取消；否则把它设为本次要**获得**的那一件，
         *   同时把所在的栏位设为高亮栏（栏位本身不再单独可点，避免"选了栏位但没定牌"）。
         */
        function pickCard(name, slot) {
            if (selCard === name) {
                selCard = null;
                sel = null;
                showEquipInfo(null);
            } else {
                selCard = name;
                sel = slot;
                showEquipInfo(name, slot);
            }
            sync();
        }

        // ---------- 操作栏 ----------
        const bar = document.createElement("div");
        bar.className = "dmqc-dy-bar";

        okNode = document.createElement("div");
        okNode.className = "dmqc-dy-ok";
        okNode.innerHTML = T.ok;
        okNode.addEventListener(evtName, function (e) {
            if (e) {
                if (e.preventDefault) e.preventDefault();
                if (e.stopPropagation) e.stopPropagation();
            }
            if (closed) return;
            if (shenwu) {
                if (!selCard || !sel) return;
                // links = [栏位, 具体牌名]，调用方据此直接装备该件神兵
                finish({ bool: true, links: [sel, selCard] });
            } else {
                if (!sel) return;
                finish({ bool: true, links: [sel] });
            }
        });
        bar.appendChild(okNode);

        const cancelNode = document.createElement("div");
        cancelNode.className = "dmqc-dy-cancel";
        cancelNode.innerHTML = "取 消";
        cancelNode.addEventListener(evtName, function (e) {
            if (e) {
                if (e.preventDefault) e.preventDefault();
                if (e.stopPropagation) e.stopPropagation();
            }
            if (closed) return;
            finish({ bool: false });
        });
        bar.appendChild(cancelNode);

        panel.appendChild(bar);

        // 按钮下方原本的提示行已删除（整框过高）。hintNode 保持 null，
        // 上面各处的 `if (hintNode)` 守卫因此自动跳过；临时提示改走 flashLabel()。

        const foot = document.createElement("div");
        foot.className = "dmqc-dy-foot";
        foot.innerHTML = F.foot + "<em>" + T.footEm + "</em>";
        panel.appendChild(foot);

        try {
            document.addEventListener("keydown", keyHandler, true);
        } catch (e) {}

        sync();
    }).catch(function (e) {
        console.error("[大梦千秋] 三陈选择框构建异常，已回退引擎默认框：", e);
        try {
            if (domNode && domNode.parentNode) domNode.parentNode.removeChild(domNode);
        } catch (e1) {}
        try {
            if (resumeGuard) game.resume();
        } catch (e2) {}
        return null;
    });
}

export { DMQC_DUYU_STYLE_ID };

// ============================================================
//  五、谏国 · 「武库名录」竹简选择框
// ============================================================
//  谏国只在觉醒前拥有，所以本框只做一版：与三陈的 base 形态同一套
//  墨青武库 + 竹青 + 青铜金，面板/头部/页脚/按钮全部复用 .dmqc-dy 的类，
//  本框自己只负责"外面的框与背景"（择选栏 + 竹简名册）。
//
//  机制回顾（character/sgz_duyu.js 的 sgz_jianguo）：
//    摸牌阶段，改为指定 N 种武库未记录的非装备牌名（N = min(3, 未记录数)），
//    从其中随机获得 2 张（互不相同的牌名；可指定数不足 2 时只拿 1 张），
//    然后 +1 体力上限并失去 1 点体力。
//  因此本框的交互是"从名册中圈选 N 种"——做成竹简名册 + 朱笔圈选的样子：
//     · 候选就是**引擎的真卡牌**（卡面卡图 + 卡名），按牌堆顺序平铺、不按类型分组
//     · 点卡 = 圈选（朱批），再点 = 取消；上方 N 个位次实时回填，点位次也能取消
//     · 附检索框（牌名 / 拼音子串），名册上百张牌时也能快速定位
// ============================================================

const DMQC_JG_STYLE_ID = "dmqc_jianguo_style";

/**
 * 卡牌类型 → 每张卡的强调色（仅用于悬停/描边的小点缀，**不再按类型分组排列**）。
 * 取值与引擎 get.type 一一对应。
 */
const DMQC_JG_TYPES = {
    basic: { key: "basic", seal: "基", name: "基本牌", accent: "#e8c26a" },
    trick: { key: "trick", seal: "锦", name: "普通锦囊", accent: "#5fb0e6" },
    delay: { key: "delay", seal: "延", name: "延时锦囊", accent: "#b98cff" },
    equip: { key: "equip", seal: "装", name: "装备牌", accent: "#e5834f" },
};
const DMQC_JG_ORD = ["壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖", "拾"];

/** 阿拉伯数字 → 汉字（只用于标题里的「择一至X简」这类短语） */
function dmqcJianguoCnNum(n) {
    const v = Math.max(1, Math.floor(n || 1));
    if (v <= 10) return DMQC_JG_ORD[v - 1];
    if (v < 20) return "拾" + DMQC_JG_ORD[v - 11];
    return String(v);
}

export function dmqcInjectJianguoStyle() {
    if (typeof document === "undefined" || !document) return;
    if (document.getElementById(DMQC_JG_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = DMQC_JG_STYLE_ID;
    style.innerHTML = `
/* ==========================================================
   谏国 · 武库名录（竹简名册 + 朱笔圈选 + 体力推演）
   面板本体复用 .dmqc-dy（墨青武库 / 竹青 / 青铜金，即未觉醒形态）
   ========================================================== */
/* ---------- 体力推演条（同梦魏延「壮誓」框的交互语言：
   圈选几张牌，就当场把那几点体力标成"将失去"，并推算剩余体力） ---------- */
.dmqc-jg-hprow {
    position: relative; display: flex; align-items: center; justify-content: center;
    gap: 10px; margin: 0 0 4px; min-height: 26px; transition: none;
}
.dmqc-jg-hprow .k {
    position: relative; display: block; flex: 0 0 auto;
    font-family: xingkai, KaiTi, STKaiti, serif; font-size: 13.5px; letter-spacing: 2px;
    color: #9fd9bb; transition: none;
}
.dmqc-jg-hpsegs { position: relative; display: flex; align-items: center; gap: 3px; transition: none; }
.dmqc-jg-hpseg {
    position: relative; display: block; box-sizing: border-box;
    width: 13px; height: 21px; border-radius: 3px;
    background: rgba(0, 0, 0, .52);
    border: 1px solid rgba(200, 161, 92, .38);
    box-shadow: inset 0 0 5px rgba(0, 0, 0, .75);
    transition: background .18s ease, box-shadow .18s ease, border-color .18s ease, transform .18s ease;
}
.dmqc-jg-hpseg.on {
    background: linear-gradient(180deg, #d8ffe9, #6fd39a 55%, #2f8f63);
    border-color: rgba(216, 255, 233, .8);
    box-shadow: 0 0 7px rgba(111, 211, 154, .55), inset 0 0 3px rgba(255, 255, 255, .4);
}
/* 即将因本次谏国失去的那几点：朱色 + 上浮脉动 */
.dmqc-jg-hpseg.will {
    background: linear-gradient(180deg, #ffbfae, #e0553f 55%, #8d2114);
    border-color: rgba(255, 214, 200, .9);
    box-shadow: 0 0 10px rgba(224, 85, 63, .75), inset 0 0 4px rgba(255, 255, 255, .35);
    animation: dmqc-jg-hpseg-pulse 1.35s ease-in-out infinite;
}
@keyframes dmqc-jg-hpseg-pulse {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-3px); }
}
.dmqc-jg-hptext {
    position: relative; display: block; flex: 0 0 auto;
    font-family: yuanli, KaiTi, serif; font-size: 13px; color: #c3d2c9;
    white-space: nowrap; transition: none;
}
.dmqc-jg-hptext b { color: #e8fff4; font-size: 15px; }
.dmqc-jg-hptext i { font-style: normal; margin: 0 2px; color: rgba(200, 161, 92, .9); }
.dmqc-jg-hptext .lose { color: #ffb59f; font-weight: bold; }
.dmqc-jg-hpflag {
    position: relative; display: block; flex: 0 0 auto;
    padding: 1px 9px; border-radius: 10px;
    font-family: KaiTi, STKaiti, serif; font-size: 11.5px; letter-spacing: 1px;
    color: #ffe0d6;
    background: rgba(224, 85, 63, .32);
    border: 1px solid rgba(224, 85, 63, .8);
    box-shadow: 0 0 9px rgba(224, 85, 63, .55);
    animation: dmqc-jg-hpseg-pulse 1.35s ease-in-out infinite;
    transition: none;
}
.dmqc-jg-hpflag.hide { display: none; }

/* ---------- 已圈选行（数量可变：1~X 种） ---------- */
.dmqc-jg-picked {
    position: relative; display: flex; align-items: center; justify-content: center;
    flex-wrap: wrap; gap: 6px; margin: 0 0 8px; min-height: 24px; transition: none;
}
.dmqc-jg-picked .k {
    position: relative; display: block; flex: 0 0 auto;
    font-family: xingkai, KaiTi, STKaiti, serif; font-size: 13px; letter-spacing: 1px;
    color: #9fd9bb; white-space: nowrap; transition: none;
}
.dmqc-jg-picked .k b { color: #e8fff4; font-size: 15px; }
.dmqc-jg-picked .k em { font-style: normal; color: rgba(200, 161, 92, .95); }
.dmqc-jg-picked .chip {
    position: relative; display: block; box-sizing: border-box;
    padding: 1px 9px; border-radius: 5px; cursor: pointer; user-select: none;
    font-family: KaiTi, STKaiti, serif; font-size: 13.5px; line-height: 1.5; letter-spacing: .5px;
    color: #fff2e8;
    background: linear-gradient(180deg, rgba(224, 85, 63, .3), rgba(110, 24, 14, .34));
    border: 1px solid rgba(224, 85, 63, .85);
    box-shadow: 0 0 8px rgba(224, 85, 63, .35);
    white-space: nowrap;
    transition: box-shadow .14s ease, transform .14s ease;
}
.dmqc-jg-picked .chip:hover { box-shadow: 0 0 12px rgba(224, 85, 63, .7); }
.dmqc-jg-picked .none {
    position: relative; display: block; font-family: yuanli, KaiTi, serif;
    font-size: 12.5px; color: #7d8a83; transition: none;
}
/* 已择满时抖动提示 */
.dmqc-jg-picked.full .chip { animation: dmqc-jg-nudge .42s ease-in-out; }
@keyframes dmqc-jg-nudge {
    0%, 100% { transform: translateX(0); }
    25%      { transform: translateX(-4px); }
    75%      { transform: translateX(4px); }
}

/* ---------- 竹简名册 ---------- */
.dmqc-jg-board {
    position: relative; display: flex; flex-direction: column; box-sizing: border-box;
    height: 420px; border-radius: 10px; overflow: hidden;
    background-color: #040a09;
    background-image: url('extension/大梦千秋/image/sgz_duyu_slip.svg');
    background-size: 30px 100%;
    background-repeat: repeat-x;
    border: 1px solid rgba(200, 161, 92, .4);
    box-shadow: inset 0 0 22px rgba(0, 0, 0, .85), 0 0 0 1px rgba(0, 0, 0, .6);
    transition: none;
}
.dmqc-jg-tools {
    position: relative; display: flex; align-items: center; gap: 10px; box-sizing: border-box;
    flex: 0 0 auto; padding: 6px 10px;
    background: linear-gradient(180deg, rgba(9, 22, 20, .96), rgba(6, 14, 13, .9));
    border-bottom: 1px solid rgba(200, 161, 92, .3);
    transition: none;
}
.dmqc-jg-search {
    position: relative; display: block; box-sizing: border-box; width: 268px; padding: 4px 10px;
    font-family: yuanli, KaiTi, serif; font-size: 13px; line-height: 1.5; color: #e6f2ea;
    background: rgba(0, 0, 0, .55);
    border: 1px solid rgba(200, 161, 92, .42);
    border-radius: 7px; outline: none; transition: border-color .16s ease, box-shadow .16s ease;
}
.dmqc-jg-search::placeholder { color: #6d7a73; }
.dmqc-jg-search:focus {
    border-color: rgba(111, 211, 154, .85);
    box-shadow: 0 0 9px rgba(111, 211, 154, .4), inset 0 0 8px rgba(0, 0, 0, .6);
}
.dmqc-jg-tip {
    position: relative; display: block;
    font-family: yuanli, KaiTi, serif; font-size: 12px; color: #8a9a91; white-space: nowrap;
    transition: none;
}
.dmqc-jg-tip b { color: #9fd9bb; }
.dmqc-jg-tip .warn { color: #ffb59f; }
.dmqc-jg-list {
    position: relative; display: block; box-sizing: border-box;
    flex: 1 1 auto; overflow-y: auto; overflow-x: hidden;
    padding: 8px 10px 12px;
    /* 压一层暗底：底下竹简纹理仍透得出来（名录＝竹简册），但不能压过卡面卡图 */
    background: rgba(3, 10, 8, .62);
    transition: none;
}
.dmqc-jg-list::-webkit-scrollbar { width: 7px; }
.dmqc-jg-list::-webkit-scrollbar-track { background: rgba(0, 0, 0, .45); border-radius: 4px; }
.dmqc-jg-list::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #6fd39a, rgba(200, 161, 92, .75));
    border-radius: 4px;
}
/* 名册：候选**平铺**，不按牌的类型分组 —— 一眼就是一排排真牌，靠卡图认牌。
   每张的层级：holder（本框的格子，负责选中框与朱印）
     └ scaler（把引擎牌按统一比例缩放，不动引擎牌自己的 transform）
         └ .card（引擎真牌：卡图 + 卡名 + 花色点数） */
/* 顶部留白：选中时卡会抬升 3px、朱印还会外溢 4px，不留白会顶到名册上沿 */
.dmqc-jg-items { position: relative; display: flex; flex-wrap: wrap; gap: 8px; padding-top: 8px; transition: none; }
.dmqc-jg-card {
    position: relative; display: block; box-sizing: border-box;
    cursor: pointer; user-select: none;
    width: var(--jg-w, 84px); height: var(--jg-h, 84px);
    border-radius: 5px;
    /* 卡图四角是透明的，垫一层暗底才像"一张牌"，也让悬停/选中描边更干净 */
    background: rgba(0, 0, 0, .45);
    box-shadow: 0 1px 4px rgba(0, 0, 0, .65);
    transition: box-shadow .14s ease, transform .14s ease;
}
.dmqc-jg-scaler {
    position: absolute; left: 0; top: 0;
    display: block; overflow: visible;
    width: var(--jg-cw, 104px); height: var(--jg-ch, 104px);
    transform: scale(var(--jg-s, 1)); transform-origin: top left;
    transition: none;
}
/* 引擎牌自带 margin/相对定位，这里统一压到缩放层原点 */
.dmqc-jg-scaler > .card { margin: 0 !important; position: absolute !important; left: 0 !important; top: 0 !important; }
.dmqc-jg-card:hover {
    box-shadow: 0 0 0 2px rgba(111, 211, 154, .9), 0 0 14px rgba(111, 211, 154, .55);
}
/* 已圈选：朱笔描边 + 朱色薄罩 + 抬升 + 朱印「选」 */
.dmqc-jg-card.on {
    transform: translateY(-3px);
    box-shadow: 0 0 0 2px #e0553f, 0 0 16px rgba(224, 85, 63, .65);
}
.dmqc-jg-card.on::after {
    content: ""; position: absolute; left: 0; top: 0;
    display: block; width: 100%; height: 100%;
    border-radius: 5px; background: rgba(224, 85, 63, .22);
    pointer-events: none; transition: none;
}
.dmqc-jg-mark {
    position: absolute; left: -4px; top: -4px; z-index: 3;
    display: block; width: 19px; height: 19px; line-height: 17px; box-sizing: border-box;
    border-radius: 4px; text-align: center;
    font-family: xiaozhuan, KaiTi, STKaiti, serif; font-size: 12px; color: #fff2e8;
    background: linear-gradient(180deg, #f07a5f, #b83a24);
    border: 1px solid rgba(255, 214, 200, .9);
    box-shadow: 0 0 7px rgba(224, 85, 63, .85);
    opacity: 0; transform: scale(.6); pointer-events: none;
    transition: opacity .14s ease, transform .14s ease;
}
.dmqc-jg-card.on .dmqc-jg-mark { opacity: 1; transform: scale(1); }
/* 回退形态（没有引擎卡牌环境时）：退化成牌名条目 */
.dmqc-jg-card.text-fallback .dmqc-jg-scaler { width: auto; height: auto; transform: none; }
.dmqc-jg-card.text-fallback { width: auto; height: auto; }
.dmqc-jg-item {
    position: relative; display: block; box-sizing: border-box;
    padding: 3px 8px; border-radius: 5px;
    font-family: KaiTi, STKaiti, serif; font-size: 14px; line-height: 1.45; letter-spacing: .5px;
    color: #dbe8e0;
    background: linear-gradient(180deg, rgba(255, 255, 255, .07), rgba(0, 0, 0, .22));
    border: 1px solid rgba(200, 161, 92, .3);
    box-shadow: inset 0 0 6px rgba(0, 0, 0, .5);
    white-space: nowrap; transition: none;
}
.dmqc-jg-card.text-fallback.on .dmqc-jg-item {
    color: #fff2e8;
    background: linear-gradient(180deg, rgba(224, 85, 63, .3), rgba(110, 24, 14, .34));
    border-color: rgba(224, 85, 63, .95);
}
.dmqc-jg-empty {
    position: relative; display: block; width: 100%; padding: 46px 0; text-align: center;
    font-family: KaiTi, STKaiti, serif; font-size: 14px; letter-spacing: 1px; color: #7d8a83;
    transition: none;
}
.dmqc-jg-empty.hide { display: none; }

/* 无障碍：减弱动态效果 */
@media (prefers-reduced-motion: reduce) {
    .dmqc-jg-picked.full .chip,
    .dmqc-jg-hpseg.will,
    .dmqc-jg-hpflag { animation: none !important; }
}
`;
    document.head.appendChild(style);
}

/**
 * 构建谏国「武库名录」竹简选择框（自包含 Promise，仅未觉醒形态）。
 *
 * 对应技能：摸牌阶段，改为指定 1~X 种武库未记录的非装备牌**获得之**（X = 你的体力值 + 1），
 * 然后失去 **X-1** 点体力 —— 即"取 N 张、付 N-1 点"，只取 1 张时完全不掉血。
 * 所以本框是"变数多选"，并且像壮誓框那样实时推算"圈选 N 种 → 体力 hp 掉到 hp-(N-1)"，
 * 付满（N-1 == hp，也就是取到上限 X）时标出濒危。
 *
 * @param {Player} player 发动者
 * @param {object} opts
 *   names    string[]  可选牌名（**就是技能本体的 sgzDuyuUnrecorded 结果**，已排除装备与已记录牌名）
 *   max      number    本次最多能指定几种（= min(你的体力值 + 1, names.length)）；旧入参 count 亦兼容
 *   hp       number    当前体力（用于体力推演；缺省取 max-1）
 *   recorded {number}  已记录数（仅用于展示）
 *   total    {number}  非装备牌总种数（仅用于展示）
 * @returns {Promise<{bool:boolean, links:string[]}|null>} links = 圈选的牌名（1~max 个）；
 *          null 表示框未建立，调用方应回退引擎默认 chooseButton
 */
export function dmqcBuildJianguoDialog(player, opts) {
    // 构建期异常会 reject；必须保证 game.resume() 一定被调用，否则游戏永久卡住
    let resumeGuard = false;
    let domNode = null;

    return new Promise(function (resolve) {
        const cfg = opts || {};
        const names = (Array.isArray(cfg.names) ? cfg.names : []).filter(function (n) {
            return typeof n === "string" && n;
        });
        // 本次最多能指定几种：X = 你的体力值（同时不可能超过"还没记录的牌名数"）。
        // 兼容旧入参 count（当时是"必须恰好选 count 种"，现在退化为上限）。
        const cap = typeof cfg.max === "number" ? cfg.max : typeof cfg.count === "number" ? cfg.count : 3;
        const maxPick = Math.max(1, Math.min(cap, names.length || 1));
        // 体力推演用：当前体力（失去的正是"圈选的种数"）
        const hp = Math.max(1, typeof cfg.hp === "number" ? cfg.hp : Math.max(1, maxPick - 1));

        // 没有可选项时谈不上"选择"，交给引擎默认框
        if (names.length < 1) {
            resolve(null);
            return;
        }

        try {
            dmqcInjectDuyuStyle();
            dmqcInjectJianguoStyle();
        } catch (e) {}

        game.pause();
        resumeGuard = true;

        const evtName = lib.config.touchscreen ? "touchend" : "click";
        let picked = []; // 已圈选的牌名（按圈选顺序）
        let closed = false;
        let overlay = null;
        let okNode = null;
        let hintNode = null;
        let listNode = null;
        let searchNode = null;
        let statNode = null;
        let pickedNode = null;
        let hpSegsNode = null;
        let hpTextNode = null;
        let hpFlagNode = null;
        let emptyNode = null;
        let nudgeTimer = null;

        // 每个牌名一条记录：{ name, type, el, pinyin }
        const entries = [];
        const hpSegs = [];

        function cleanup() {
            try {
                document.removeEventListener("keydown", keyHandler, true);
            } catch (e) {}
            try {
                window.removeEventListener("resize", refitJianguoBoard);
            } catch (e) {}
            try {
                if (nudgeTimer) clearTimeout(nudgeTimer);
            } catch (e) {}
            try {
                if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
            } catch (e) {}
        }

        function finish(result) {
            if (closed) return;
            closed = true;
            cleanup();
            game.resume();
            resolve(result);
        }

        // 键盘：Enter 确认（须圈选 1~maxPick 种）、Esc 取消；在检索框里只响应 Esc
        function keyHandler(e) {
            if (closed || !e) return;
            const inInput = e.target && e.target.tagName === "INPUT";
            if (inInput) {
                if (e.key === "Escape") {
                    if (e.preventDefault) e.preventDefault();
                    if (e.stopPropagation) e.stopPropagation();
                    finish({ bool: false });
                }
                return;
            }
            if (e.key === "Escape") {
                if (e.preventDefault) e.preventDefault();
                if (e.stopPropagation) e.stopPropagation();
                finish({ bool: false });
            } else if (e.key === "Enter") {
                if (e.preventDefault) e.preventDefault();
                if (e.stopPropagation) e.stopPropagation();
                if (picked.length >= 1 && picked.length <= maxPick) finish({ bool: true, links: picked.slice(0) });
            }
        }

        // ---------- 全屏遮罩 ----------
        overlay = document.createElement("div");
        overlay.className = "dmqc-dy-overlay";
        domNode = overlay;
        overlay.addEventListener(evtName, function (e) {
            if (!e) return;
            if (e.stopPropagation) e.stopPropagation();
            // 只对点在自己身上（背景）的点击 preventDefault，
            // 否则会把检索框的聚焦/选择一并吞掉
            if (e.target === overlay && e.preventDefault) e.preventDefault();
        });
        // 防止点检索框时 mousedown 被吞掉导致无法聚焦
        overlay.addEventListener("mousedown", function (e) {
            if (e && e.stopPropagation) e.stopPropagation();
        });
        ui.window.appendChild(overlay);

        // ---------- 视口缩放 ----------
        // 先只按宽度定缩放，高度留给下面的名册去"吃掉"（见 dmqcJianguoFitBoard）：
        // 这样卡牌能一直按目标尺寸渲染，而不是被一个预先假定的面板高度压小。
        const designW = 1000;
        const vw = window.innerWidth || document.documentElement.clientWidth || 1366;
        const vh = window.innerHeight || document.documentElement.clientHeight || 768;
        let scale = Math.min(1, (vw - 24) / designW);

        const panel = document.createElement("div");
        panel.className = "dmqc-dy";
        panel.style.cssText =
            "position:absolute;left:50%;top:50%;display:block;box-sizing:border-box;width:" + designW + "px;"
            + "transform:translate(-50%,-50%) scale(" + scale + ");transform-origin:center center;transition:none;"
            + "padding:18px 22px 12px;border-radius:16px;overflow:hidden;text-align:center;";
        panel.style.setProperty("--dy-scale", scale);
        overlay.appendChild(panel);

        // ---------- 装饰层（复用三陈 base 形态的墨青武库底 + 竹影兵架 + 竹青碎屑） ----------
        panel.insertAdjacentHTML(
            "beforeend",
            '<div class="dmqc-dy-bg" aria-hidden="true"></div>'
            + '<div class="dmqc-dy-emblem" aria-hidden="true"></div>'
            + '<div class="dmqc-dy-corner tl" aria-hidden="true"></div>'
            + '<div class="dmqc-dy-corner tr" aria-hidden="true"></div>'
            + '<div class="dmqc-dy-corner bl" aria-hidden="true"></div>'
            + '<div class="dmqc-dy-corner br" aria-hidden="true"></div>'
        );
        panel.querySelector(".dmqc-dy-bg").style.backgroundImage =
            "url('extension/大梦千秋/image/sgz_duyu_dialog_bg.svg')";
        panel.querySelector(".dmqc-dy-emblem").style.backgroundImage =
            "url('extension/大梦千秋/image/sgz_duyu_emblem.svg')";
        dmqcMountParticles(panel, "duyu", { before: panel.querySelector(".dmqc-dy-corner") });

        // ---------- 头部 ----------
        const head = document.createElement("div");
        head.className = "dmqc-dy-head";

        const ava = document.createElement("div");
        ava.className = "dmqc-dy-ava";
        ava.style.backgroundImage = "url('extension/大梦千秋/image/sgz_duyu.jpg')";
        head.appendChild(ava);

        const titleWrap = document.createElement("div");
        titleWrap.className = "dmqc-dy-titlewrap";
        titleWrap.innerHTML =
            '<div class="dmqc-dy-kicker">上 疏 陈 策 · 择 一 至 ' + dmqcJianguoCnNum(maxPick) + " 简</div>"
            + '<div class="dmqc-dy-title">谏 国 <i>·</i> 武 库 名 录</div>'
            + '<div class="dmqc-dy-sub">从武库未记录的牌名中指定 <b>1~' + maxPick + "</b> 种并获得之"
            + "（X 为你的体力值 +1），然后失去 <b>X-1</b> 点体力</div>";
        head.appendChild(titleWrap);

        const side = document.createElement("div");
        side.className = "dmqc-dy-side";
        side.innerHTML =
            '<span style="color:var(--dy-green);">谏</span>'
            + '<span style="color:var(--dy-bronze);">国</span>';
        head.appendChild(side);

        panel.appendChild(head);

        const ruler = document.createElement("div");
        ruler.className = "dmqc-dy-ruler";
        panel.appendChild(ruler);

        // ---------- 体力推演条（同壮誓框：圈选几张，就把那几点体力标成"将失去"） ----------
        const hpRow = document.createElement("div");
        hpRow.className = "dmqc-jg-hprow";
        const hpLabel = document.createElement("span");
        hpLabel.className = "k";
        hpLabel.textContent = "体力";
        hpRow.appendChild(hpLabel);

        hpSegsNode = document.createElement("div");
        hpSegsNode.className = "dmqc-jg-hpsegs";
        for (let i = 0; i < hp; i++) {
            const seg = document.createElement("i");
            seg.className = "dmqc-jg-hpseg on";
            hpSegsNode.appendChild(seg);
            hpSegs.push(seg);
        }
        hpRow.appendChild(hpSegsNode);

        hpTextNode = document.createElement("span");
        hpTextNode.className = "dmqc-jg-hptext";
        hpRow.appendChild(hpTextNode);

        hpFlagNode = document.createElement("span");
        hpFlagNode.className = "dmqc-jg-hpflag hide";
        hpFlagNode.textContent = "濒 危";
        hpRow.appendChild(hpFlagNode);

        panel.appendChild(hpRow);

        // ---------- 已圈选行（数量可变，点条目同样可取消） ----------
        pickedNode = document.createElement("div");
        pickedNode.className = "dmqc-jg-picked";
        panel.appendChild(pickedNode);

        const label = document.createElement("div");
        label.className = "dmqc-dy-label";
        label.innerHTML = "◆ 点卡牌即朱笔圈选（1~" + maxPick + " 种，再点取消）；点上方已选项亦可取消";
        panel.appendChild(label);

        // ---------- 竹简名册 ----------
        const board = document.createElement("div");
        board.className = "dmqc-jg-board";

        const tools = document.createElement("div");
        tools.className = "dmqc-jg-tools";
        searchNode = document.createElement("input");
        searchNode.className = "dmqc-jg-search";
        searchNode.setAttribute("type", "text");
        searchNode.setAttribute("spellcheck", "false");
        searchNode.setAttribute("autocomplete", "off");
        searchNode.setAttribute("placeholder", "检索牌名 / 拼音…");
        tools.appendChild(searchNode);
        statNode = document.createElement("div");
        statNode.className = "dmqc-jg-tip";
        tools.appendChild(statNode);
        board.appendChild(tools);

        listNode = document.createElement("div");
        listNode.className = "dmqc-jg-list";
        board.appendChild(listNode);

        // 候选**按牌堆顺序依次平铺**，不按牌的类型分组：
        // 一眼看过去就是一排排真牌，靠卡图认牌，而不是先找"这是哪一类"。
        const items = document.createElement("div");
        items.className = "dmqc-jg-items";
        listNode.appendChild(items);
        names.forEach(function (name) {
            addEntry(items, name, dmqcJianguoType(name), DMQC_JG_TYPES[dmqcJianguoType(name)] || DMQC_JG_TYPES.trick);
        });

        /**
         * 往名册里加一张候选：优先用**引擎的真卡面**（ui.create.button + "vcard" preset），
         * 这样选中物就是带卡图/卡名的真牌，而不是只有牌名的文字条；
         * 只有引擎卡牌 API 不可用（或建牌抛错）时才回退成牌名条目，保证框一定可用。
         */
        function addEntry(items, name, typeKey, meta) {
            const holder = document.createElement("div");
            holder.className = "dmqc-jg-card";
            holder.style.setProperty("--jg-accent", meta.accent);
            holder.style.setProperty("--jg-accent-soft", dmqcJianguoSoft(meta.accent));
            holder.setAttribute("title", get.translation(name));

            const scaler = document.createElement("div");
            scaler.className = "dmqc-jg-scaler";
            holder.appendChild(scaler);

            const mark = document.createElement("span");
            mark.className = "dmqc-jg-mark";
            mark.textContent = "选";
            holder.appendChild(mark);

            const face = dmqcJianguoCardFace(name);
            if (face) {
                scaler.appendChild(face);
                holder.classList.add("has-face");
            } else {
                // 回退：没有引擎卡牌环境时退化为牌名条目
                holder.classList.add("text-fallback");
                const span = document.createElement("span");
                span.className = "dmqc-jg-item";
                span.textContent = get.translation(name);
                scaler.appendChild(span);
            }

            holder.addEventListener(evtName, function (e) {
                if (e) {
                    if (e.preventDefault) e.preventDefault();
                    if (e.stopPropagation) e.stopPropagation();
                }
                if (closed) return;
                toggle(name, false);
            });

            items.appendChild(holder);
            entries.push({ name: name, type: typeKey, el: holder, text: get.translation(name) });
        }

        emptyNode = document.createElement("div");
        emptyNode.className = "dmqc-jg-empty hide";
        emptyNode.textContent = "武库名录中无匹配的牌名";
        listNode.appendChild(emptyNode);

        panel.appendChild(board);

        // 引擎的牌尺寸随布局/皮肤而变（default 布局 .card 是 104×104），
        // 这里量一次真牌的实际尺寸，再统一缩放成成组的小卡，避免逐张强制重排。
        try {
            const probe = listNode.querySelector(".dmqc-jg-card.has-face .dmqc-jg-scaler > .card");
            if (probe) {
                const rawW = probe.offsetWidth || 104;
                const rawH = probe.offsetHeight || 104;
                const targetH = 120;
                const s = Math.max(0.4, Math.min(1.6, targetH / rawH));
                listNode.style.setProperty("--jg-cw", rawW + "px");
                listNode.style.setProperty("--jg-ch", rawH + "px");
                listNode.style.setProperty("--jg-s", s.toFixed(4));
                listNode.style.setProperty("--jg-w", Math.round(rawW * s) + "px");
                listNode.style.setProperty("--jg-h", Math.round(rawH * s) + "px");
                listNode.classList.add("sized");
            }
        } catch (e) {}

        // 名册高度：把视口里除名册以外的部分扣掉，剩下的全给卡牌，这样卡牌能一直保持目标尺寸；
        // 内容本身不满一屏时再收掉多余空白（例如武库只剩几种未记录），免得摊开一大片空竹简。
        // 注意：
        //   · list 是 flex 项，内容少时 scrollHeight 会等于被撑开的 clientHeight，
        //     量不出真实内容高度，所以按卡片容器的底边来算；
        //   · 面板若因极矮视口仍装不下，就在循环里回退缩放并重算一次名册高度；
        //   · 本函数**幂等**，布局稳定后要再跑一次（见下面的重排钩子）——
        //     构建那一刻自定义字体可能还没生效，量出来的"其余部分高度"会偏小。
        function fitJianguoBoard() {
            try {
                for (let pass = 0; pass < 3; pass++) {
                    panel.style.transform = "translate(-50%,-50%) scale(" + scale + ")";
                    panel.style.setProperty("--dy-scale", scale);
                    const innerAvail = (vh - 24) / scale; // 面板坐标下的可用高度
                    const chromeH = panel.scrollHeight - board.offsetHeight; // 除名册以外的部分
                    const byViewport = Math.max(200, innerAvail - chromeH);
                    const byContent =
                        items.offsetTop + items.offsetHeight + (tools.offsetHeight || 34) + 24;
                    board.style.height =
                        Math.round(Math.min(680, Math.max(200, Math.min(byViewport, byContent)))) + "px";
                    const need = panel.scrollHeight * scale;
                    if (need <= vh - 12 || scale <= 0.34) break;
                    const next = Math.max(0.34, scale * ((vh - 12) / need));
                    if (Math.abs(next - scale) < 0.004) break;
                    scale = next;
                }
            } catch (e) {}
        }
        fitJianguoBoard();

        // 布局稳定后（字体加载完 / 下一帧 / 窗口尺寸变化）再量一次，避免用"字体还没换过来"时的旧尺寸定格
        function refitJianguoBoard() {
            if (closed || !panel.parentNode) return;
            fitJianguoBoard();
        }
        try {
            if (typeof requestAnimationFrame === "function") requestAnimationFrame(refitJianguoBoard);
        } catch (e) {}
        try {
            if (document.fonts && document.fonts.ready && typeof document.fonts.ready.then === "function") {
                document.fonts.ready.then(refitJianguoBoard, function () {});
            }
        } catch (e) {}
        try {
            window.addEventListener("resize", refitJianguoBoard);
        } catch (e) {}

        // ---------- 交互 ----------
        function toggle(name, forceOff) {
            if (closed) return;
            const i = picked.indexOf(name);
            if (i >= 0 || forceOff) {
                if (i >= 0) picked.splice(i, 1);
            } else if (picked.length < maxPick) {
                picked.push(name);
            } else {
                // 已择满：抖一下已选行并提示，而不是静默丢弃
                pickedNode.classList.add("full");
                if (nudgeTimer) clearTimeout(nudgeTimer);
                nudgeTimer = setTimeout(function () {
                    pickedNode.classList.remove("full");
                }, 460);
                if (hintNode) {
                    hintNode.innerHTML =
                        "最多只能指定 <b>" + maxPick + "</b> 种（＝你的体力值 + 1）—— 请先点掉一项再改选";
                }
                return;
            }
            sync();
        }

        function applyFilter() {
            const q = (searchNode.value || "").trim().toLowerCase();
            let shown = 0;
            entries.forEach(function (en) {
                let hit = !q || en.text.toLowerCase().indexOf(q) >= 0 || en.name.toLowerCase().indexOf(q) >= 0;
                if (!hit && q) {
                    // 拼音只在真正检索时才计算（上百条牌名不必在打开时就全算一遍）
                    if (en.pinyin === undefined) en.pinyin = dmqcJianguoPinyin(en.name);
                    if (en.pinyin) hit = en.pinyin.indexOf(q) >= 0;
                }
                en.el.style.display = hit ? "" : "none";
                if (hit) shown++;
            });
            emptyNode.classList.toggle("hide", shown > 0);
            updateStat(shown);
        }

        function updateStat(shown) {
            if (!statNode) return;
            statNode.innerHTML =
                "武库未记录 <b>" + names.length + "</b> 种"
                + (typeof shown === "number" ? " ｜ 匹配 <b>" + shown + "</b>" : "")
                + (typeof cfg.recorded === "number" && typeof cfg.total === "number"
                    ? ' ｜ 已记录 <em>' + cfg.recorded + "/" + cfg.total + "</em>"
                    : "");
        }

        function sync() {
            // 牌名条目
            entries.forEach(function (en) {
                en.el.classList.toggle("on", picked.indexOf(en.name) >= 0);
            });

            const n = picked.length;
            // 代价 = 指定种数 - 1（只指定 1 种时完全不掉血）
            const cost = Math.max(0, n - 1);
            const after = hp - cost;
            const lethal = cost > 0 && after <= 0;

            // 体力推演：自下而上 hp 格，最上面 cost 格标成"将失去"
            for (let i = 0; i < hpSegs.length; i++) {
                const seg = hpSegs[i];
                seg.classList.toggle("on", i < after);
                seg.classList.toggle("will", i >= after);
            }
            if (hpTextNode) {
                if (!n) {
                    hpTextNode.innerHTML = "体力 <b>" + hp + "</b> ／ 尚未失去体力";
                } else if (!cost) {
                    hpTextNode.innerHTML =
                        "体力 <b>" + hp + "</b> ／ <span style=\"color:#9fd9bb;\">只取一种，不失去体力</span>";
                } else {
                    hpTextNode.innerHTML =
                        "体力 <b>" + hp + "</b><i>→</i><b>" + Math.max(0, after) + "</b> ／ 失去 <span class=\"lose\">" + cost + "</span> 点";
                }
            }
            if (hpFlagNode) hpFlagNode.classList.toggle("hide", !lethal);

            // 已圈选行（数量可变）
            if (pickedNode) {
                let html =
                    '<span class="k">已圈选 <b>' + n + "</b> / <em>" + maxPick + "</em></span>";
                if (n) {
                    picked.forEach(function (name) {
                        html += '<span class="chip" data-name="' + name + '">' + get.translation(name) + "</span>";
                    });
                } else {
                    html += '<span class="none">（点下方卡牌圈选，最多 ' + maxPick + " 种）</span>";
                }
                pickedNode.innerHTML = html;
                Array.prototype.forEach.call(pickedNode.querySelectorAll(".chip"), function (chip) {
                    chip.addEventListener(evtName, function (e) {
                        if (e) {
                            if (e.preventDefault) e.preventDefault();
                            if (e.stopPropagation) e.stopPropagation();
                        }
                        if (closed) return;
                        toggle(chip.getAttribute("data-name"), true);
                    });
                });
            }

            const ready = n >= 1 && n <= maxPick;
            if (okNode) {
                okNode.style.opacity = ready ? "1" : "0.34";
                okNode.style.pointerEvents = ready ? "auto" : "none";
                okNode.style.filter = ready ? "none" : "grayscale(.75)";
            }
            if (hintNode) {
                if (!ready) {
                    hintNode.innerHTML =
                        "请圈选 <b>1~" + maxPick + "</b> 种牌名（点卡牌圈选 · Enter 确认 · Esc 取消）";
                } else if (lethal) {
                    hintNode.innerHTML =
                        "确认后获得这 <b>" + n + "</b> 张牌（花色点数随机），并失去 <b>" + cost
                        + "</b> 点体力 —— <span style=\"color:#ffb59f;\">将失去全部体力，会进入濒死！</span>";
                } else if (!cost) {
                    hintNode.innerHTML =
                        "确认后获得这 <b>1</b> 张牌（花色点数随机），且<span style=\"color:#9fd9bb;\">不失去体力</span>";
                } else {
                    hintNode.innerHTML =
                        "确认后获得这 <b>" + n + "</b> 张牌（花色点数随机），并失去 <b>" + cost + "</b> 点体力";
                }
            }
        }

        searchNode.addEventListener("input", applyFilter);
        searchNode.addEventListener("keydown", function (e) {
            if (e && e.key === "Escape" && !closed) {
                // Esc 先清检索、再退出，符合输入框直觉
                if (searchNode.value) {
                    searchNode.value = "";
                    applyFilter();
                } else {
                    finish({ bool: false });
                }
                if (e.preventDefault) e.preventDefault();
                if (e.stopPropagation) e.stopPropagation();
            }
        });

        // ---------- 操作栏 ----------
        const bar = document.createElement("div");
        bar.className = "dmqc-dy-bar";

        okNode = document.createElement("div");
        okNode.className = "dmqc-dy-ok";
        okNode.innerHTML = "陈 策";
        okNode.addEventListener(evtName, function (e) {
            if (e) {
                if (e.preventDefault) e.preventDefault();
                if (e.stopPropagation) e.stopPropagation();
            }
            if (closed || picked.length < 1 || picked.length > maxPick) return;
            finish({ bool: true, links: picked.slice(0) });
        });
        bar.appendChild(okNode);

        const cancelNode = document.createElement("div");
        cancelNode.className = "dmqc-dy-cancel";
        cancelNode.innerHTML = "取 消";
        cancelNode.addEventListener(evtName, function (e) {
            if (e) {
                if (e.preventDefault) e.preventDefault();
                if (e.stopPropagation) e.stopPropagation();
            }
            if (closed) return;
            finish({ bool: false });
        });
        bar.appendChild(cancelNode);

        panel.appendChild(bar);

        hintNode = document.createElement("div");
        hintNode.className = "dmqc-dy-hint";
        panel.appendChild(hintNode);

        const foot = document.createElement("div");
        foot.className = "dmqc-dy-foot";
        foot.innerHTML = "武 库 名 录 · 梦 杜 预" + "<em>圈选牌名 → 陈策　/　Esc 取消</em>";
        panel.appendChild(foot);

        try {
            document.addEventListener("keydown", keyHandler, true);
        } catch (e) {}

        updateStat(names.length);
        sync();
    }).catch(function (e) {
        console.error("[大梦千秋] 谏国选择框构建异常，已回退引擎默认框：", e);
        try {
            if (domNode && domNode.parentNode) domNode.parentNode.removeChild(domNode);
        } catch (e1) {}
        try {
            if (resumeGuard) game.resume();
        } catch (e2) {}
        return null;
    });
}

/**
 * 造一张「引擎真卡面」用于圈选。
 *
 * 走引擎自己的 vcard 按钮预设（`ui.create.buttonPresets.vcard`）：
 *   ui.create.button(name, "vcard", position, true)
 *     → preset 内把字符串转成 [get.type(name), "", name]，
 *       用 ui.create.card 建出带 .image / .name / .info 的真牌节点并 init()，
 *       于是卡图、卡名、花色点数、皮肤全都与游戏内一致。
 * 第 4 个参数 noClick = true 让引擎**不挂它自己的点击逻辑**（ui.click.button），
 * 选中与否由本框的 toggle() 自己管；同时会加上 .noclick（仅隐藏 .wunature，不影响点击）。
 *
 * @returns {HTMLElement|null} 卡牌元素；引擎卡牌 API 不可用或建牌抛错时返回 null（调用方回退牌名条目）
 */
function dmqcJianguoCardFace(name) {
    try {
        if (typeof ui === "undefined" || !ui || !ui.create || typeof ui.create.button !== "function") return null;
        if (typeof lib === "undefined" || !lib || !lib.element || !lib.element.Button) return null;
        const el = ui.create.button(name, "vcard", undefined, true);
        if (!el || el.nodeType !== 1) return null;
        // 防御：引擎可能给按钮挂上 dialog 相关样式，这里清掉内联定位交给本框的缩放层
        el.style.margin = "0";
        el.style.position = "absolute";
        el.style.left = "0";
        el.style.top = "0";
        return el;
    } catch (e) {
        return null;
    }
}

/** 引擎牌类型（get.type 对未知牌名可能抛错，这里全部兜住）—— 只用来给卡挑强调色 */
function dmqcJianguoType(name) {    try {
        const t = get.type(name);
        if (t === "basic" || t === "trick" || t === "delay" || t === "equip") return t;
    } catch (e) {}
    return "other";
}

/** 十六进制色 → 半透明 rgba，用于光晕 */
function dmqcJianguoSoft(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ""));
    if (!m) return "rgba(111,211,154,.45)";
    const n = parseInt(m[1], 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + ",.45)";
}

/** 牌名拼音（检索用）；引擎无 get.pinyin 时退回空串。带缓存，且只在首次检索时才计算。 */
function dmqcJianguoPinyin(name) {
    try {
        if (typeof get.pinyin === "function") {
            // withTone=false → 去声调，玩家输入 "sha" 而不是 "shā"
            const p = get.pinyin(name, false);
            if (typeof p === "string") return p.toLowerCase();
            if (Array.isArray(p)) return p.join("").toLowerCase();
        }
    } catch (e) {}
    return "";
}

export { DMQC_JG_STYLE_ID, DMQC_JG_TYPES };
