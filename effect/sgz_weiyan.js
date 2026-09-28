// ============================================================
//  梦魏延 · 特效层
//    · 壮誓 / 竭伐觉醒·使命成功 骨骼动画与音效
//    · 壮誓专属「竭志擎天」主题选择框（dmqcBuildWeiyanZhuangshiDialog）
//  纯表现层，无游戏规则。由 character/sgz_weiyan.js 通过 import 使用。
//  播放器为十周年UI 的全局骨骼播放器 dcdAnim；不可用时用引擎自带
//  流光兜底并打印原因，绝不影响技能结算。
//
//  素材来源：原“势魏延”（无名美化扩展）的骨骼动画，已移植进本包。
//    animation/shiweiyan/2026/SS_SWY_zhuangshi1.*  壮誓 · 觉醒前（通常形态）  ← 现用
//    animation/shiweiyan/2026/SS_SWY_zhuangshi2.*  壮誓 · 觉醒后（引战形态）  ← 现用
//      （这两套换了 2026 版素材，来源见下方 SGZ_WEIYAN_ZHUAANGSHI_SPINE 的注释）
//    animation/shiweiyan/SS_SWY_tongchang.*        壮誓 · 旧版（保留，可回退）
//    animation/shiweiyan/SS_SWY_yinzhan.*          壮誓 · 旧版（保留，可回退）
//    animation/shiweiyan/SS_ShiWeiYanSkill.*       竭伐觉醒 · 使命成功演出
//    audio/sgz_weiyan/texiao/wushengTX.mp3         壮誓 音效
//    audio/sgz_weiyan/texiao/effect_yinzhanBGM.mp3 觉醒 BGM
//
//  ⚠ 每个 .atlas 都是多页图集，必须把 atlas 里列出的**全部**贴图一起搬，
//    少一张就会在建骨架时抛错、表现为「毫无反应」。
//
//  路径解析：优先用引擎的 get.relativePath(import.meta.url) 推出站点路径
//  （与 spine 加载器的 pathPrefix 天然一致）；失败则回退原“势魏延”那套相对路径。
//  loadSpine 与 playSpine 必须使用同一个字符串作为 assets 键。
// ============================================================

// 回退用的相对路径（与无名美化/梦关羽 同一套写法，已验证可加载）
const SGZ_WEIYAN_ANIM_FALLBACK = "../../../大梦千秋/animation/shiweiyan/";

// 本包动画目录（站点路径）
const SGZ_WEIYAN_ANIM_DIR = (() => {
    try {
        if (typeof get !== "undefined" && get && typeof get.relativePath === "function") {
            const resolved = new URL("../animation/shiweiyan/", import.meta.url);
            const rel = get.relativePath(resolved);
            if (rel && rel.endsWith("animation/shiweiyan/")) {
                return rel;
            }
        }
    } catch (e) {
        console.warn("[大梦千秋] 梦魏延特效：解析骨骼目录失败，使用回退路径", e);
    }
    return SGZ_WEIYAN_ANIM_FALLBACK;
})();

const SGZ_WEIYAN_AUDIO = {
    zhuangshi: "../extension/大梦千秋/audio/sgz_weiyan/texiao/wushengTX.mp3",
    awakenBGM: "../extension/大梦千秋/audio/sgz_weiyan/texiao/effect_yinzhanBGM.mp3",
};

// 壮誓形态 → 骨骼名
//  ⚠ 已**换成 2026 版素材**（来源：`E:\Games\新扩展\无名美化5.6olsp曹操+势魏延调整` 的
//    `animation/shiweiyan/2026/`；那边的映射与这里一致：
//    `SS_SWY_tongchang2026 → 2026/SS_SWY_zhuangshi1`、`SS_SWY_yinzhan2026 → 2026/SS_SWY_zhuangshi2`，
//    见该包的 `extension/shiweiyan.js:19-26`）。
//    旧版两套（`SS_SWY_tongchang` / `SS_SWY_yinzhan`）**仍留在 animation/shiweiyan/ 下没删**，
//    想回退只要把下面两行改回去即可。
const SGZ_WEIYAN_ZHUAANGSHI_SPINE = {
    tongchang: "2026/SS_SWY_zhuangshi1", // 觉醒前（通常形态）
    yinzhan: "2026/SS_SWY_zhuangshi2", // 觉醒后（引战形态）
};

// 变身/觉醒演出（竭伐击杀 → 使命成功）骨骼：**也换成 2026 版**。
//   来源同壮誓：`E:\Games\新扩展\无名美化5.6olsp曹操+势魏延调整\animation\shiweiyan\2026\`
//   对应该包 `extension/shiweiyan.js` 的官方写法：
//     · `:141` `anname = ... == 2026 ? "SS_ShiWeiYanSkill2026" : "SS_ShiWeiYanSkill"`；
//     · `:15-18` 该条目自带 `scale: 1.15`（约 9 页贴图）；
//     · `:143-146` 使命成功播 `action: "play2"`（失败才是 `play1`）。
//   旧版 `SS_ShiWeiYanSkill` 仍留在 animation/shiweiyan/ 下没删，想回退改这一行即可。
const SGZ_WEIYAN_AWAKEN_SPINE = "2026/SS_ShiWeiYanSkill2026";
const SGZ_WEIYAN_AWAKEN_SCALE = 1.15;

// 骨骼资源：name 同时作为 playSpine 查表的键
function sgzWeiyanSpine(key) {
    const base = SGZ_WEIYAN_ANIM_DIR + key;
    return { name: base, filename: base };
}

// 取十周年UI 的骨骼播放器（调用时实时取 window.dcdAnim，避免模块加载顺序问题）
function sgzWeiyanAnim() {
    try {
        const a = typeof window !== "undefined" ? window.dcdAnim : undefined;
        if (a && typeof a.loadSpine === "function" && typeof a.playSpine === "function") {
            return a;
        }
    } catch (e) {}
    return null;
}

// 无骨骼播放器时的兜底特效（纯引擎 CSS，保证“一定看得见”）
function sgzWeiyanFallbackFx(label, color) {
    try {
        const node = document.createElement("div");
        node.style.cssText = [
            "position:fixed",
            "left:0",
            "top:0",
            "width:100%",
            "height:100%",
            "z-index:9",
            "pointer-events:none",
            "opacity:0",
            `background:radial-gradient(circle at 50% 45%, ${color} 0%, rgba(0,0,0,0) 68%)`,
            "transition:opacity .18s ease-out",
        ].join(";");
        document.body.appendChild(node);
        node.getBoundingClientRect();
        node.style.opacity = "0.6";
        setTimeout(() => {
            node.style.opacity = "0";
        }, 420);
        setTimeout(() => {
            if (node.parentNode) node.parentNode.removeChild(node);
        }, 900);
    } catch (e) {}
    try {
        game.log(`#g【${label}】`, "特效：骨骼播放器不可用，已使用兜底流光表现");
    } catch (e) {}
}

// 通用骨骼播放：先加载，再播放
function sgzWeiyanPlaySpine(key, tag) {
    const anim = sgzWeiyanAnim();
    if (!anim) {
        console.warn(`[大梦千秋] 梦魏延特效(${tag})：未检测到骨骼播放器 dcdAnim（十周年UI 未启用或加载失败），跳过骨骼动画`);
        return false;
    }
    const sprite = sgzWeiyanSpine(key);
    try {
        anim.loadSpine(sprite.name, "skel", function () {
            try {
                anim.playSpine(sprite);
            } catch (e) {
                console.error(`[大梦千秋] 梦魏延特效(${tag})：playSpine 失败`, e);
            }
        });
    } catch (e) {
        console.error(`[大梦千秋] 梦魏延特效(${tag})：loadSpine 失败`, e);
        return false;
    }
    return true;
}

// ---- 壮誓：选择完代价时立即播放。觉醒前后形态不同 ----
// awakened=true → 引战（觉醒形态）；否则 → 通常形态
export function dmqcWeiyanZhuangshiEffect(awakened) {
    const ok = sgzWeiyanPlaySpine(awakened ? SGZ_WEIYAN_ZHUAANGSHI_SPINE.yinzhan : SGZ_WEIYAN_ZHUAANGSHI_SPINE.tongchang, "壮誓");
    if (!ok) {
        sgzWeiyanFallbackFx("壮誓", awakened ? "rgba(255,80,60,.55)" : "rgba(255,180,90,.5)");
    }
    game.playAudio(SGZ_WEIYAN_AUDIO.zhuangshi);
}

// ---- 竭伐觉醒（击杀角色）：使命成功演出（**变身动画**）----
// 骨骼动画（play2）+ 切换觉醒 BGM，后续换头像/获得竭燃由技能本体负责
export function dmqcWeiyanAwakenEffect() {
    const anim = sgzWeiyanAnim();
    if (!anim) {
        console.warn("[大梦千秋] 梦魏延特效(竭伐觉醒)：未检测到骨骼播放器 dcdAnim，跳过使命成功骨骼动画");
        sgzWeiyanFallbackFx("竭伐觉醒", "rgba(255,70,40,.6)");
    } else {
        const sprite = sgzWeiyanSpine(SGZ_WEIYAN_AWAKEN_SPINE);
        // 参考实现：使命成功显式播 play2 段，并带 scale 1.15
        sprite.action = "play2";
        sprite.scale = SGZ_WEIYAN_AWAKEN_SCALE;
        try {
            anim.loadSpine(sprite.name, "skel", function () {
                try {
                    anim.playSpine(sprite);
                } catch (e) {
                    console.error("[大梦千秋] 梦魏延特效(竭伐觉醒)：playSpine 失败", e);
                }
            });
        } catch (e) {
            console.error("[大梦千秋] 梦魏延特效(竭伐觉醒)：loadSpine 失败", e);
        }
    }
    // 觉醒 BGM（广播，所有端同步）
    try {
        game.broadcastAll(() => {
            _status.tempMusic = "effect_yinzhanBGM";
            game.playBackgroundMusic();
        });
    } catch (e) {}
}

// ============================================================
//  梦魏延 · 壮誓专属选择框（「竭志擎天」主题）
//  纯表现层，无游戏规则。
//
//  引擎默认的壮誓用 chooseControl 竖排按钮（"0"~"max"），信息量只有一行文字。
//  此处按本包「关羽·梦刃 / 曹髦·缚渊」的范式重绘为合一选择框：
//    · 玄铁血誓底板 + 反骨断刃徽记 + 上浮火星（玄铁黑青 / 血誓朱 / 骨白）
//    · 一张誓约卡 = 一档代价：篆字封印 + 誓约名 + 铭文 + 失血/摸牌 + 体力推演
//    · 顶部体力条随选中档位实时推演「将要失去的体力」（血滴脉动）
//    · 觉醒后（引战形态）整体转为赤炎配色，底部燃起血焰
//  仅对本地人类玩家生效；AI / 联机 / 托管 / 录像回放由技能本体回退引擎默认框。
// ============================================================

const dmqcWeiyanZhuangshiStyleId = "dmqc_weiyan_zhuangshi_style";

// 誓约档位的主题化文案（key = 失去的体力数）
// 魏延能通过【竭燃】等手段抬高体力上限，档位数可远超 6，因此这里覆盖到 12，
// 并在 13 档以上循环使用 dmqcWeiyanOathPool，确保永远不会落到“7 点誓约”这类兜底文案。
const dmqcWeiyanZhuangshiMap = {
    0: { seal: "止", name: "不发动", motto: "按甲休兵·不损分毫" },
    1: { seal: "一", name: "一重誓", motto: "微损血气·试其锋芒" },
    2: { seal: "二", name: "二重誓", motto: "半血为注·谋定后动" },
    3: { seal: "三", name: "三重誓", motto: "三分血气·换满盘输" },
    4: { seal: "四", name: "四重誓", motto: "血已将尽·志不可夺" },
    5: { seal: "五", name: "五重誓", motto: "以命为筹·孤注一掷" },
    6: { seal: "六", name: "六重誓", motto: "燃尽此身·只求一战" },
    7: { seal: "七", name: "七重誓", motto: "拔骨为筹·天地可鉴" },
    8: { seal: "八", name: "八重誓", motto: "血染征袍·此志不渝" },
    9: { seal: "九", name: "九重誓", motto: "九死不悔·唯我独行" },
    10: { seal: "十", name: "十重誓", motto: "倾尽此身·换尔一败" },
    11: { seal: "十一", name: "十一重誓", motto: "残躯尚在·战意不休" },
    12: { seal: "十二", name: "十二重誓", motto: "尽付此誓·不问归途" },
};
const dmqcWeiyanOathPool = [
    "血竭骨立 · 志不可夺",
    "此身既许 · 何惜一死",
    "骨可为薪 · 志不可折",
    "再借残躯 · 续此一战",
];
const DMQC_ZS_NUM = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

// 阿拉伯数字 → 汉字（与「一重誓/二重誓」的篆字印章风格一致）
function dmqcWeiyanCnNum(n) {
    if (n >= 0 && n <= 10) return DMQC_ZS_NUM[n];
    if (n > 10 && n < 20) return "十" + DMQC_ZS_NUM[n - 10];
    return String(n);
}

// 取某一档的展示数据（任何档位都有名有铭文，绝不出现裸数字兜底）
function dmqcWeiyanOathInfo(n) {
    if (dmqcWeiyanZhuangshiMap[n]) return dmqcWeiyanZhuangshiMap[n];
    const cn = dmqcWeiyanCnNum(n);
    return {
        seal: cn,
        name: cn + "重誓",
        motto: dmqcWeiyanOathPool[(n - 13) % dmqcWeiyanOathPool.length],
    };
}

// 注入主题样式（幂等）。所有选择框 div 都带类名——引擎的 `div{position:absolute}`
// 是元素选择器，类选择器优先级更高，因此类规则足以覆盖，不必逐条内联。
function dmqcInjectWeiyanZhuangshiStyle() {
    if (document.getElementById(dmqcWeiyanZhuangshiStyleId)) return;
    const style = document.createElement("style");
    style.id = dmqcWeiyanZhuangshiStyleId;
    style.innerHTML = `
/* ================= 壮誓 · 竭志擎天 选择框 ================= */
.dmqc-zs-overlay {
    position: absolute;
    left: 0; top: 0;
    width: 100%; height: 100%;
    z-index: 99999;
    display: block;
    transition: none;
    background: radial-gradient(122% 122% at 50% 42%, rgba(10,14,16,.52), rgba(2,4,5,.86));
}
.dmqc-zs {
    position: absolute;
    left: 50%; top: 50%;
    display: block;
    box-sizing: border-box;
    width: 880px;
    padding: 18px 22px 14px;
    border-radius: 16px;
    overflow: hidden;
    text-align: center;
    color: #e7e2d4;
    font-family: yuanli, KaiTi, STKaiti, serif;
    transform: translate(-50%, -50%) scale(var(--zs-scale, 1));
    transform-origin: center center;
    transition: none;
    --zs-accent: #e0452a;
    --zs-accent-soft: rgba(224, 69, 42, .3);
    --zs-gold: #c9a45e;
    --zs-bone: #ded6c2;
    background:
        linear-gradient(180deg, rgba(201,164,94,.07), rgba(201,164,94,0) 36%),
        linear-gradient(180deg, #121a1e 0%, #0a1013 56%, #040708 100%);
    border: 1px solid rgba(201, 164, 94, .55);
    box-shadow:
        0 0 0 1px rgba(0,0,0,.92),
        0 0 0 4px rgba(201,164,94,.15),
        0 0 0 7px rgba(224,69,42,.07),
        0 0 46px rgba(0,0,0,.86),
        inset 0 0 44px rgba(224,69,42,.05);
    animation: dmqc-zs-in .44s cubic-bezier(.2,.9,.3,1.08) both;
}
/* 觉醒（引战形态）：赤炎配色 */
.dmqc-zs.wrath {
    --zs-accent: #ff7a2c;
    --zs-accent-soft: rgba(255, 122, 44, .32);
    --zs-gold: #e0b872;
    --zs-bone: #f4e8cc;
    border-color: rgba(224, 150, 80, .6);
    box-shadow:
        0 0 0 1px rgba(0,0,0,.92),
        0 0 0 4px rgba(255,122,44,.2),
        0 0 0 7px rgba(224,69,42,.1),
        0 0 50px rgba(0,0,0,.86),
        inset 0 0 52px rgba(255,122,44,.09);
}
@keyframes dmqc-zs-in {
    from { opacity: 0; transform: translate(-50%,-50%) scale(calc(var(--zs-scale, 1) * .9)); }
    to   { opacity: 1; transform: translate(-50%,-50%) scale(var(--zs-scale, 1)); }
}

/* ---------- 装饰层 ---------- */
.dmqc-zs-bg,
.dmqc-zs-emblem,
.dmqc-zs-flame,
.dmqc-zs-embers,
.dmqc-zs-corner {
    position: absolute;
    pointer-events: none;
    transition: none;
}
.dmqc-zs-bg {
    left: 0; top: 0; width: 100%; height: 100%;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    opacity: .42;
}
.dmqc-zs-emblem {
    left: 50%; top: 50%;
    width: 268px; height: 268px;
    transform: translate(-50%, -50%);
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
    opacity: .16;
}
.dmqc-zs-flame {
    left: 0; bottom: 0; width: 100%; height: 48%;
    opacity: 0;
    background: radial-gradient(92% 122% at 50% 118%, rgba(255,120,45,.5), rgba(255,60,20,.16) 46%, rgba(255,60,20,0) 74%);
}
.dmqc-zs.wrath .dmqc-zs-flame { opacity: .95; animation: dmqc-zs-flame 2.8s ease-in-out infinite; }
@keyframes dmqc-zs-flame {
    0%, 100% { transform: scaleY(.94); opacity: .68; }
    50%      { transform: scaleY(1.06); opacity: 1; }
}
.dmqc-zs-embers { left: 0; top: 0; width: 100%; height: 100%; overflow: hidden; }
.dmqc-zs-embers i {
    position: absolute;
    bottom: -10px;
    display: block;
    width: 3px; height: 3px;
    border-radius: 50%;
    background: #ffb36a;
    box-shadow: 0 0 7px rgba(255,140,60,.9);
    opacity: 0;
    animation: dmqc-zs-rise 5.6s linear infinite;
}
@keyframes dmqc-zs-rise {
    0%   { opacity: 0; transform: translateY(0) scale(.7); }
    12%  { opacity: .85; }
    68%  { opacity: .45; }
    100% { opacity: 0; transform: translateY(-330px) scale(.3); }
}
.dmqc-zs-corner { width: 28px; height: 28px; opacity: .92; }
.dmqc-zs-corner.tl { top: 10px; left: 10px; border-top: 2px solid var(--zs-gold); border-left: 2px solid var(--zs-accent); border-top-left-radius: 8px; }
.dmqc-zs-corner.tr { top: 10px; right: 10px; border-top: 2px solid var(--zs-accent); border-right: 2px solid var(--zs-gold); border-top-right-radius: 8px; }
.dmqc-zs-corner.bl { bottom: 10px; left: 10px; border-bottom: 2px solid var(--zs-accent); border-left: 2px solid var(--zs-gold); border-bottom-left-radius: 8px; }
.dmqc-zs-corner.br { bottom: 10px; right: 10px; border-bottom: 2px solid var(--zs-gold); border-right: 2px solid var(--zs-accent); border-bottom-right-radius: 8px; }

/* ---------- 头部 ---------- */
.dmqc-zs-head {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    text-align: left;
}
.dmqc-zs-ava {
    position: relative;
    flex: 0 0 76px;
    width: 76px; height: 76px;
    border-radius: 50%;
    background-size: cover;
    background-position: center 12%;
    border: 2px solid var(--zs-gold);
    box-shadow: 0 0 0 3px rgba(0,0,0,.68), 0 0 22px var(--zs-accent-soft), inset 0 0 12px rgba(0,0,0,.6);
}
.dmqc-zs-titlewrap { position: relative; flex: 0 1 auto; text-align: center; }
.dmqc-zs-kicker {
    position: relative; display: block;
    font-family: xiaozhuan, KaiTi, STKaiti, serif;
    font-size: 13px; letter-spacing: 7px;
    color: var(--zs-gold);
    text-shadow: 0 0 10px var(--zs-accent-soft);
    margin-bottom: 2px;
}
.dmqc-zs-title {
    position: relative; display: block;
    font-family: xinwei, KaiTi, serif;
    font-size: 34px; line-height: 1.15; letter-spacing: 6px;
    color: #f4e6c0;
    text-shadow: 0 0 16px rgba(244,230,192,.5), 0 2px 4px rgba(0,0,0,.85);
    white-space: nowrap;
}
.dmqc-zs-title i { font-style: normal; color: var(--zs-accent); font-size: 26px; vertical-align: 2px; }
.dmqc-zs-sub {
    position: relative; display: block;
    font-size: 13.5px; line-height: 1.5; letter-spacing: .5px;
    color: #c6bda6;
    margin-top: 6px;
}
.dmqc-zs-sub b { color: var(--zs-accent); font-family: xinwei, KaiTi, serif; font-weight: normal; font-size: 15px; }
.dmqc-zs-state {
    position: relative; display: inline-block;
    margin-left: 8px; padding: 1px 8px;
    border-radius: 9px;
    font-family: yuanli, KaiTi, serif;
    font-size: 11px; letter-spacing: 1px;
    color: #ffd9c0;
    background: rgba(224,69,42,.26);
    border: 1px solid rgba(224,69,42,.58);
}
.dmqc-zs.wrath .dmqc-zs-state {
    color: #fff0d8;
    background: rgba(255,122,44,.32);
    border-color: rgba(255,150,80,.75);
}
.dmqc-zs-side {
    position: relative;
    flex: 0 0 42px;
    width: 42px; height: 84px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 4px;
    border: 1px solid rgba(201,164,94,.5);
    border-radius: 7px;
    background: rgba(0,0,0,.4);
    box-shadow: inset 0 0 12px var(--zs-accent-soft);
}
.dmqc-zs-side span {
    position: relative; display: block;
    font-family: xiaozhuan, KaiTi, STKaiti, serif;
    font-size: 20px; line-height: 1;
    color: var(--zs-bone);
}

/* ---------- 分隔线 ---------- */
.dmqc-zs-ruler {
    position: relative; display: block;
    height: 1px; margin: 12px 0 10px;
    background: linear-gradient(90deg, rgba(201,164,94,0), #c9a45e 16%, #f2e4b8 50%, #e0452a 84%, rgba(224,69,42,0));
}
.dmqc-zs-ruler::before,
.dmqc-zs-ruler::after {
    content: ""; position: absolute; top: 50%;
    width: 6px; height: 6px;
    transform: translateY(-50%) rotate(45deg);
    background: #f2e4b8;
    box-shadow: 0 0 8px rgba(242,228,184,.8);
}
.dmqc-zs-ruler::before { left: 26%; }
.dmqc-zs-ruler::after { right: 26%; }

/* ---------- 体力推演条 ---------- */
.dmqc-zs-hprow {
    position: relative;
    display: flex; align-items: center; justify-content: center;
    gap: 14px;
    margin-bottom: 10px;
}
.dmqc-zs-hpsegs { position: relative; display: flex; align-items: center; gap: 4px; }
.dmqc-zs-hpseg {
    position: relative; display: block;
    width: 26px; height: 12px;
    border-radius: 3px;
    background: #241c15;
    border: 1px solid rgba(201,164,94,.3);
    box-shadow: inset 0 0 6px rgba(0,0,0,.75);
    transition: background .18s ease, box-shadow .18s ease, border-color .18s ease;
}
.dmqc-zs-hpseg.on {
    background: linear-gradient(180deg, #63d492, #2c8a54);
    border-color: #93e8b4;
    box-shadow: 0 0 8px rgba(99,212,146,.45);
}
/* 即将因壮誓失去的体力：血光脉动 */
.dmqc-zs-hpseg.will {
    background: linear-gradient(180deg, #ff8f5c, #bd1f14);
    border-color: #ffb691;
    animation: dmqc-zs-will .92s ease-in-out infinite;
}
@keyframes dmqc-zs-will {
    0%, 100% { box-shadow: 0 0 6px rgba(224,69,42,.6); }
    50%      { box-shadow: 0 0 17px rgba(255,130,75,.95); }
}
.dmqc-zs-hptext {
    position: relative; display: block;
    font-family: xinwei, KaiTi, STKaiti, serif;
    font-size: 14px; letter-spacing: 1px;
    color: #ded6c2;
}
.dmqc-zs-hptext b { color: var(--zs-accent); font-weight: normal; }

/* ---------- 誓约卡 ---------- */
.dmqc-zs-label {
    position: relative; display: block;
    text-align: left;
    font-family: xiaozhuan, KaiTi, STKaiti, serif;
    font-size: 12px; letter-spacing: 4px;
    color: #9e8c62;
    margin: 0 2px 8px;
}
.dmqc-zs-opts {
    position: relative;
    display: flex; flex-wrap: wrap;
    justify-content: center; align-items: stretch;
    column-gap: 10px; row-gap: 12px;
    align-content: center;
}
/* 多行时收紧行距，把增加的行高还给单行基线 */
.dmqc-zs-opts.compact { row-gap: 10px; }
.dmqc-zs-opts.dense { row-gap: 8px; }
.dmqc-zs-opt {
    position: relative; display: block; box-sizing: border-box;
    flex: 0 0 auto;
    cursor: pointer; user-select: none; text-align: center;
    border-radius: 12px;
    padding: 12px 9px 10px;
    background:
        linear-gradient(180deg, rgba(255,150,110,.06), rgba(255,150,110,0) 42%),
        linear-gradient(180deg, #171d21 0%, #0f1417 60%, #070a0c 100%);
    border: 2px solid rgba(201,164,94,.36);
    box-shadow: inset 0 0 0 1px rgba(240,225,180,.09), inset 0 0 22px rgba(0,0,0,.45), 0 4px 12px rgba(0,0,0,.5);
    transition: transform .16s ease, border-color .16s ease, box-shadow .16s ease;
    animation: dmqc-zs-opt-in .5s cubic-bezier(.2,.9,.3,1.12) both;
}
@keyframes dmqc-zs-opt-in {
    from { opacity: 0; transform: translateY(16px) scale(.92); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
}
.dmqc-zs-opt:hover { transform: translateY(-6px); border-color: var(--zs-gold); }
/* 选中：抬升放大 + 血光脉动 */
.dmqc-zs-opt.selected {
    transform: translateY(-7px) scale(1.05);
    border-color: var(--zs-accent);
    z-index: 2;
}
@keyframes dmqc-zs-opt-pulse {
    0%, 100% {
        box-shadow: 0 0 15px 4px var(--zs-accent-soft), 0 0 36px 11px rgba(140,20,14,.32),
                    inset 0 0 0 1px rgba(255,235,210,.7), inset 0 0 20px rgba(224,69,42,.2);
    }
    50% {
        box-shadow: 0 0 27px 9px var(--zs-accent-soft), 0 0 60px 19px rgba(150,22,15,.5),
                    inset 0 0 0 1px rgba(255,245,225,.92), inset 0 0 26px rgba(224,69,42,.3);
    }
}
/* 选中卡：斜向扫光 */
.dmqc-zs-opt.selected::after {
    content: "";
    position: absolute; left: 0; top: 0;
    width: 100%; height: 100%;
    border-radius: 10px;
    pointer-events: none;
    background: linear-gradient(115deg, rgba(255,225,190,0) 32%, rgba(255,225,190,.15) 47%, rgba(255,225,190,0) 62%);
    background-size: 260% 100%;
    animation: dmqc-zs-sheen 2.8s ease-in-out infinite;
}
@keyframes dmqc-zs-sheen {
    from { background-position: 135% 0; }
    to   { background-position: -35% 0; }
}
.dmqc-zs-opt-seal {
    position: relative; display: block;
    width: 52px; height: 52px; line-height: 52px;
    margin: 0 auto 8px;
    border-radius: 12px;
    font-family: xiaozhuan, KaiTi, STKaiti, serif;
    font-size: 30px; font-weight: bold;
    color: #f7ecd4;
    text-shadow: 0 1px 2px rgba(0,0,0,.6);
    background: radial-gradient(circle at 35% 28%, rgba(224,69,42,.85), rgba(140,20,14,.5) 62%, #0a0d0f 100%);
    border: 2px solid var(--zs-gold);
    box-shadow: inset 0 0 9px rgba(0,0,0,.5), 0 2px 5px rgba(0,0,0,.45);
    transition: none;
}
/* 「不发动」为中性档：封印褪为铁灰 */
.dmqc-zs-opt.calm .dmqc-zs-opt-seal {
    background: radial-gradient(circle at 35% 28%, rgba(166,180,174,.6), rgba(58,70,70,.42) 62%, #0a0d0f 100%);
    border-color: rgba(201,164,94,.5);
}
.dmqc-zs-opt.selected .dmqc-zs-opt-seal { animation: dmqc-zs-seal-fire 1.5s ease-in-out infinite; }
@keyframes dmqc-zs-seal-fire {
    0%, 100% { box-shadow: inset 0 0 9px rgba(0,0,0,.5), 0 0 12px var(--zs-accent); }
    50%      { box-shadow: inset 0 0 12px rgba(0,0,0,.45), 0 0 22px var(--zs-accent); }
}
.dmqc-zs-opt-name {
    position: relative; display: block;
    font-family: xinwei, KaiTi, STKaiti, serif;
    font-size: 18px; letter-spacing: 2px;
    color: #f2e4b8;
}
.dmqc-zs-opt-motto {
    position: relative; display: block;
    font-size: 11px; letter-spacing: 1px; line-height: 1.4;
    color: var(--zs-accent);
    margin: 2px 0 8px;
}
.dmqc-zs-opt-line {
    position: relative;
    display: flex; align-items: center; justify-content: center;
    gap: 5px;
    font-size: 12px; line-height: 1.5; letter-spacing: .5px;
    margin-bottom: 4px;
}
.dmqc-zs-opt-line.cost { color: #ffb9a4; }
.dmqc-zs-opt-line.gain { color: #a8dcc0; }
.dmqc-zs-opt-line.neutral { color: #9a9484; }
/* 合并行的色标（紧凑/密集档使用）：朱=失血，青=摸牌 */
.dmqc-zs-opt-line .cost-t { color: #ffb9a4; white-space: nowrap; }
.dmqc-zs-opt-line .gain-t { color: #a8dcc0; white-space: nowrap; }
.dmqc-zs-opt-line .cost-t b,
.dmqc-zs-opt-line .gain-t b {
    color: inherit; font-weight: normal;
    font-size: 1.3em; line-height: 1;
}
.dmqc-zs-opt-line .sep {
    font-style: normal;
    color: #6f6754;
    margin: 0 4px;
}
.dmqc-zs-opt-drops {
    position: relative;
    display: flex; align-items: center; justify-content: center;
    gap: 3px; min-height: 14px;
    margin: 2px 0 6px;
}
.dmqc-zs-drop {
    position: relative; display: block;
    width: 8px; height: 8px;
    background: linear-gradient(180deg, #ff7a52, #a8160f);
    border-radius: 0 50% 50% 50%;
    transform: rotate(45deg);
    box-shadow: 0 0 7px rgba(224,69,42,.75);
    animation: dmqc-zs-drip 2.4s ease-in-out infinite;
}
@keyframes dmqc-zs-drip {
    0%, 100% { transform: rotate(45deg) scale(1); opacity: .82; }
    50%      { transform: rotate(45deg) scale(1.2); opacity: 1; }
}
.dmqc-zs-cardicon {
    position: relative; display: block;
    width: 10px; height: 13px;
    border: 1px solid rgba(168,220,192,.75);
    border-radius: 2px;
    background: linear-gradient(180deg, rgba(168,220,192,.3), rgba(168,220,192,.06));
    box-shadow: 2px -2px 0 -1px rgba(168,220,192,.35);
}
.dmqc-zs-opt-hp {
    position: relative; display: block;
    font-family: xinwei, KaiTi, STKaiti, serif;
    font-size: 12.5px; letter-spacing: .5px;
    color: #cfc6ae;
    padding-top: 6px;
    border-top: 1px solid rgba(201,164,94,.2);
    margin-top: 6px;
}
.dmqc-zs-opt-hp b { color: var(--zs-accent); font-weight: normal; font-size: 14px; }
.dmqc-zs-opt-tag {
    position: relative; display: inline-block;
    margin-top: 6px; padding: 1px 8px;
    border-radius: 9px;
    font-family: yuanli, KaiTi, serif;
    font-size: 10.5px; letter-spacing: 1px;
    color: #ffe0cc;
    background: rgba(224,69,42,.34);
    border: 1px solid rgba(255,150,100,.6);
    animation: dmqc-zs-tag 1.6s ease-in-out infinite;
}
@keyframes dmqc-zs-tag {
    0%, 100% { opacity: .72; }
    50%      { opacity: 1; }
}

/* ---------- 多档位压缩：换行时把卡内排版收紧，保证卡片区总高不变 ---------- */
/* 封印 + 誓约名并排（仅 compact / dense 使用） */
.dmqc-zs-opt-head {
    position: relative;
    display: flex; align-items: center; justify-content: center;
    gap: 7px;
}
/* 印章为两位数（十、十一、十二…）时缩小字号 */
.dmqc-zs-opt-seal.sm { font-size: 20px; }

/* ---- 2 行（compact）：7~12 档 ---- */
.dmqc-zs-opt.compact { padding: 9px 8px; }
.dmqc-zs-opt.compact .dmqc-zs-opt-seal {
    flex: 0 0 auto;
    width: 34px; height: 34px; line-height: 34px;
    margin: 0; border-radius: 9px;
    font-size: 20px;
}
.dmqc-zs-opt.compact .dmqc-zs-opt-seal.sm { font-size: 15px; }
.dmqc-zs-opt.compact .dmqc-zs-opt-name { font-size: 15px; letter-spacing: 1px; }
.dmqc-zs-opt.compact .dmqc-zs-opt-motto {
    margin: 4px 0;
    font-size: 10.5px; letter-spacing: .5px; line-height: 1.35;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.dmqc-zs-opt.compact .dmqc-zs-opt-line { gap: 3px; font-size: 11.5px; line-height: 1.45; margin-bottom: 3px; }
.dmqc-zs-opt.compact .dmqc-zs-opt-hp { padding-top: 5px; margin-top: 0; font-size: 11.5px; }
.dmqc-zs-opt.compact .dmqc-zs-opt-hp b { font-size: 12.5px; }
.dmqc-zs-opt.compact .dmqc-zs-cardicon { width: 8px; height: 10px; }
.dmqc-zs-opt.compact .dmqc-zs-drop { width: 6px; height: 6px; }
.dmqc-zs-opt.compact .dmqc-zs-opt-tag {
    margin: 0 0 0 4px; padding: 0 5px;
    font-size: 9.5px; letter-spacing: .5px;
}

/* ---- 3 行以上（dense）：13 档以上，只留最必要的信息 ---- */
.dmqc-zs-opt.dense { padding: 6px; }
.dmqc-zs-opt.dense .dmqc-zs-opt-head { gap: 5px; }
.dmqc-zs-opt.dense .dmqc-zs-opt-seal {
    flex: 0 0 auto;
    width: 24px; height: 24px; line-height: 24px;
    margin: 0; border-radius: 6px;
    font-size: 14px;
}
.dmqc-zs-opt.dense .dmqc-zs-opt-seal.sm { font-size: 10px; }
.dmqc-zs-opt.dense .dmqc-zs-opt-name { font-size: 12.5px; letter-spacing: 0; }
.dmqc-zs-opt.dense .dmqc-zs-opt-motto { display: none; }
.dmqc-zs-opt.dense .dmqc-zs-opt-line { gap: 2px; font-size: 11px; line-height: 1.4; margin-bottom: 2px; }
.dmqc-zs-opt.dense .dmqc-zs-opt-hp { padding-top: 3px; margin-top: 0; font-size: 11px; }
.dmqc-zs-opt.dense .dmqc-zs-opt-hp b { font-size: 12px; }
.dmqc-zs-opt.dense .dmqc-zs-cardicon { width: 7px; height: 9px; }
.dmqc-zs-opt.dense .dmqc-zs-drop { width: 5px; height: 5px; }
.dmqc-zs-opt.dense .dmqc-zs-opt-tag {
    margin: 0 0 0 3px; padding: 0 4px;
    font-size: 9px; letter-spacing: 0;
}

/* ---------- 操作栏 ---------- */
.dmqc-zs-bar {
    position: relative;
    display: flex; flex-wrap: nowrap;
    align-items: center; justify-content: center;
    gap: 20px;
    margin: 14px 0 2px;
}
.dmqc-zs-ok,
.dmqc-zs-cancel {
    position: relative; display: block;
    min-width: 152px; box-sizing: border-box;
    padding: 8px 10px;
    text-align: center;
    border-radius: 9px;
    cursor: pointer; user-select: none;
    font-family: xinwei, KaiTi, STKaiti, serif;
    font-size: 18px; letter-spacing: 5px;
    transition: filter .16s ease, opacity .16s ease, transform .16s ease, box-shadow .16s ease;
}
.dmqc-zs-ok {
    color: #2a0d06; font-weight: bold;
    background: linear-gradient(180deg, #ffe6b8, #e8b45c 55%, #b97f2c);
    border: 1px solid #fff2d4;
    box-shadow: 0 0 15px rgba(232,180,92,.55), inset 0 0 0 1px rgba(255,255,255,.35);
}
.dmqc-zs-ok:hover { transform: translateY(-2px); box-shadow: 0 0 24px rgba(255,200,110,.85), inset 0 0 0 1px rgba(255,255,255,.45); }
.dmqc-zs-cancel {
    min-width: 118px;
    color: #ffd6c8;
    background: linear-gradient(180deg, #2a1416, #170a0b 60%, #0a0405);
    border: 1px solid rgba(224,69,42,.5);
    box-shadow: 0 0 10px rgba(224,69,42,.22), inset 0 0 0 1px rgba(255,255,255,.05);
}
.dmqc-zs-cancel:hover { transform: translateY(-2px); border-color: rgba(255,140,100,.8); }
.dmqc-zs-hint {
    position: relative; display: block;
    margin-top: 8px;
    min-height: 15px;
    font-family: yuanli, KaiTi, serif;
    font-size: 11.5px; letter-spacing: 1px;
    color: #9c8a66;
}
.dmqc-zs-foot {
    position: relative;
    display: flex; align-items: center; justify-content: center;
    gap: 14px;
    margin-top: 8px;
    font-family: xiaozhuan, KaiTi, STKaiti, serif;
    font-size: 13px; letter-spacing: 4px;
    color: #9e8c62;
    text-shadow: 0 0 10px var(--zs-accent-soft);
}
.dmqc-zs-foot em {
    font-style: normal;
    font-family: yuanli, KaiTi, serif;
    font-size: 10.5px; letter-spacing: 1px;
    color: #7d7460;
}

/* 无障碍：减少动效 */
@media (prefers-reduced-motion: reduce) {
    .dmqc-zs,
    .dmqc-zs-opt,
    .dmqc-zs-opt-seal,
    .dmqc-zs-opt.selected::after,
    .dmqc-zs-opt.selected .dmqc-zs-opt-seal,
    .dmqc-zs-embers i,
    .dmqc-zs-opt-tag,
    .dmqc-zs-hpseg.will,
    .dmqc-zs.wrath .dmqc-zs-flame {
        animation: none !important;
        transition: none !important;
    }
}
`;
    document.head.appendChild(style);
}

// 上浮火星的分布（左偏移%、延迟s、周期s）
const dmqcWeiyanZhuangshiEmbers = [
    [8, 0.0, 5.2], [17, 1.4, 6.4], [26, 2.9, 5.8], [35, 0.7, 7.1],
    [44, 3.6, 6.0], [53, 1.9, 5.4], [62, 4.3, 6.8], [71, 2.4, 5.6],
    [80, 5.1, 6.2], [89, 3.1, 7.4], [95, 0.4, 5.9], [13, 4.7, 6.6],
];

// 构建壮誓专属「竭志擎天」选择框（自包含 Promise，与梦刃/缚渊同一交互范式）。
// @param player 发动者
// @param opts   { max, hp, maxHp, awakened, phase }
//    max      可失去的最大体力数（= 当前体力 - 1）
//    hp       当前体力
//    maxHp    体力上限
//    awakened 是否已觉醒（引战形态 → 赤炎配色）
//    phase    当前回合角色（仅用于标题展示）
// @returns {Promise<{bool:boolean, links:string[]}|null>} links=[失去的体力数]；
//          返回 null 表示专属框未能建立，调用方应回退引擎默认框。
export function dmqcBuildWeiyanZhuangshiDialog(player, opts) {
    // 构建期异常时 promise 会 reject；必须保证 game.resume() 一定被调用，
    // 否则暂停的游戏永远不会恢复（技能卡死）。resumeGuard 标记“确实暂停过”。
    let resumeGuard = false;
    // 构建中途失败时用于回收已挂上的遮罩，避免留下无法关闭的死层
    let domNode = null;

    return new Promise(function (resolve) {
        const cfg = opts || {};
        const max = Math.max(0, Math.floor(cfg.max || 0));
        const hp = typeof cfg.hp === "number" ? cfg.hp : player.getHp();
        const maxHp = typeof cfg.maxHp === "number" ? cfg.maxHp : player.maxHp;
        const awakened = !!cfg.awakened;

        // 没有可选的档位差异时不必弹框（调用方会回退引擎默认框）
        if (max < 1) {
            resolve(null);
            return;
        }

        try {
            dmqcInjectWeiyanZhuangshiStyle();
        } catch (e) {}

        game.pause();
        resumeGuard = true;

        const dlgName = lib.config.touchscreen ? "touchend" : "click";
        let sel = 0;
        let closed = false;
        let overlay = null;
        let hpText = null;
        let hintNode = null;
        let okNode = null;
        const nodes = [];
        const segs = [];

        function cleanup() {
            try {
                document.removeEventListener("keydown", keyHandler, true);
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

        // 键盘：Esc 取消 / Enter 确认 / 方向键换档
        function keyHandler(e) {
            if (closed || !e) return;
            const k = e.key;
            let handled = true;
            if (k == "Escape") {
                finish({ bool: false });
            } else if (k == "Enter") {
                finish({ bool: true, links: [String(sel)] });
            } else if (k == "ArrowLeft") {
                sel = Math.max(0, sel - 1);
                sync(false);
            } else if (k == "ArrowRight") {
                sel = Math.min(max, sel + 1);
                sync(false);
            } else if (k == "ArrowUp") {
                // 多行时上下键按「一行」为步长移动，符合网格直觉
                sel = Math.max(0, sel - cols);
                sync(false);
            } else if (k == "ArrowDown") {
                sel = Math.min(max, sel + cols);
                sync(false);
            } else {
                handled = false;
            }
            if (handled) {
                if (e.preventDefault) e.preventDefault();
                if (e.stopPropagation) e.stopPropagation();
            }
        }

        // ---------- 全屏遮罩（挂到游戏窗口层，避免被 body 缩放 transform 错位） ----------
        // 注意：引擎的 ui.create.div 只解析带 "." / "#" 前缀的类名串，
        // 传 "xxx"（无点）会得到空 className，因此这里一律写成 ".xxx"。
        overlay = ui.create.div(".dmqc-zs-overlay");
        domNode = overlay;
        overlay.addEventListener(dlgName, function (e) {
            if (e) {
                if (e.stopPropagation) e.stopPropagation();
                if (e.preventDefault) e.preventDefault();
            }
        });
        ui.window.appendChild(overlay);

        // ---------- 尺寸：按视口缩放，避免溢出 ----------
        const designW = 880;
        const designH = 566;
        const vw = window.innerWidth || document.documentElement.clientWidth || 1366;
        const vh = window.innerHeight || document.documentElement.clientHeight || 768;
        const scale = Math.min(1, (vw - 24) / designW, (vh - 24) / designH);

        const panel = ui.create.div(".dmqc-zs" + (awakened ? ".wrath" : ""), overlay);
        panel.style.setProperty("--zs-scale", scale);

        // ---------- 装饰层 ----------
        panel.insertAdjacentHTML(
            "beforeend",
            '<div class="dmqc-zs-bg" aria-hidden="true"></div>'
            + '<div class="dmqc-zs-flame" aria-hidden="true"></div>'
            + '<div class="dmqc-zs-emblem" aria-hidden="true"></div>'
            + '<div class="dmqc-zs-embers" aria-hidden="true">'
            + dmqcWeiyanZhuangshiEmbers
                .map(function (seed) {
                    return '<i style="left:' + seed[0] + '%;animation-delay:' + seed[1] + 's;animation-duration:' + seed[2] + 's;"></i>';
                })
                .join("")
            + "</div>"
            + '<div class="dmqc-zs-corner tl" aria-hidden="true"></div>'
            + '<div class="dmqc-zs-corner tr" aria-hidden="true"></div>'
            + '<div class="dmqc-zs-corner bl" aria-hidden="true"></div>'
            + '<div class="dmqc-zs-corner br" aria-hidden="true"></div>'
        );
        panel.querySelector(".dmqc-zs-bg").style.backgroundImage =
            "url('extension/大梦千秋/image/sgz_weiyan_zhuangshi_bg.svg')";
        panel.querySelector(".dmqc-zs-emblem").style.backgroundImage =
            "url('extension/大梦千秋/image/sgz_weiyan_fangu.svg')";

        // ---------- 头部：头像 + 标题 + 竖排「擎天」 ----------
        const head = ui.create.div(".dmqc-zs-head", panel);
        const ava = ui.create.div(".dmqc-zs-ava", head);
        ava.style.backgroundImage = "url('extension/大梦千秋/image/sgz_weiyan" + (awakened ? "2" : "") + ".jpg')";

        const titleWrap = ui.create.div(".dmqc-zs-titlewrap", head);
        const phaseName = cfg.phase ? get.translation(cfg.phase) : "";
        titleWrap.innerHTML =
            '<div class="dmqc-zs-kicker">以 我 之 血 · 壮 我 之 誓</div>'
            + '<div class="dmqc-zs-title">壮 誓 <i>·</i> 竭 志 擎 天</div>'
            + '<div class="dmqc-zs-sub">'
            + (phaseName ? "当前回合：<b>" + phaseName + "</b>　" : "")
            + "失去任意点体力，然后摸等量张牌"
            + '<span class="dmqc-zs-state">' + (awakened ? "引战形态" : "通常形态") + "</span>"
            + "</div>";

        const side = ui.create.div(".dmqc-zs-side", head);
        side.innerHTML =
            '<span style="color:var(--zs-accent);">' + (awakened ? "引" : "擎") + "</span>"
            + '<span>' + (awakened ? "战" : "天") + "</span>";

        ui.create.div(".dmqc-zs-ruler", panel);

        // ---------- 体力推演条 ----------
        const hpRow = ui.create.div(".dmqc-zs-hprow", panel);
        const segBox = ui.create.div(".dmqc-zs-hpsegs", hpRow);
        // 体力上限被抬高后格子会变多，>16 格时收窄，避免整行溢出面板
        const segW = maxHp > 16 ? 16 : 26;
        for (let i = 1; i <= maxHp; i++) {
            const seg = document.createElement("i");
            seg.className = "dmqc-zs-hpseg";
            if (segW !== 26) seg.style.width = segW + "px";
            segBox.appendChild(seg);
            segs.push(seg);
        }
        hpText = ui.create.div(".dmqc-zs-hptext", hpRow);

        // ---------- 誓约卡 ----------
        ui.create.div(".dmqc-zs-label", panel).innerHTML = "◆ 选择要支付的代价（失去体力）";

        const count = max + 1;
        // 每行至多 6 张，超出的档位自动换行。
        // 行数增加时逐级压缩卡内排版（compact / dense），把多出来的行高还给单行基线，
        // 使「整个卡片区」的总高守住不变 —— 选择框不会因为档位变多而变高。
        //   1 行 → full    ：完整卡（封印/誓约名/铭文/代价/血滴/收益/体力推演）
        //   2 行 → compact ：封印与誓约名并排、代价与收益合并成一行、铭文单行省略
        //   3 行以上 → dense：只留誓约名、代价收益、体力推演
        const cols = Math.min(count, 6);
        const rows = Math.ceil(count / cols);
        const density = rows <= 1 ? "full" : rows === 2 ? "compact" : "dense";
        const cardW = cols <= 4 ? 152 : cols === 5 ? 138 : 126;

        const optRow = ui.create.div(".dmqc-zs-opts." + density, panel);

        for (let n = 0; n <= max; n++) {
            const info = dmqcWeiyanOathInfo(n);
            const calm = n === 0;
            const after = hp - n;
            const risky = !calm && after <= 1;
            // 印章文字超过一个字（十、十一、十二…）时自动缩小字号
            const sealCls = "dmqc-zs-opt-seal" + (String(info.seal).length > 1 ? " sm" : "");

            const node = ui.create.div(".dmqc-zs-opt" + (calm ? ".calm" : "") + "." + density, optRow);
            node.style.width = cardW + "px";
            node.style.flexBasis = cardW + "px";

            let html;
            if (density === "full") {
                html = '<div class="' + sealCls + '">' + info.seal + "</div>"
                    + '<div class="dmqc-zs-opt-name">' + info.name + "</div>"
                    + '<div class="dmqc-zs-opt-motto">' + info.motto + "</div>";
                if (calm) {
                    html +=
                        '<div class="dmqc-zs-opt-line neutral">不失去体力</div>'
                        + '<div class="dmqc-zs-opt-drops"></div>'
                        + '<div class="dmqc-zs-opt-line neutral">不摸牌</div>'
                        + '<div class="dmqc-zs-opt-hp">体力保持 <b>' + hp + "</b></div>";
                } else {
                    let drops = "";
                    for (let d = 0; d < n; d++) drops += '<i class="dmqc-zs-drop"></i>';
                    html +=
                        '<div class="dmqc-zs-opt-line cost"><i class="dmqc-zs-drop"></i>失去 ' + n + " 点体力</div>"
                        + '<div class="dmqc-zs-opt-drops">' + drops + "</div>"
                        + '<div class="dmqc-zs-opt-line gain"><i class="dmqc-zs-cardicon"></i>摸 ' + n + " 张牌</div>"
                        + '<div class="dmqc-zs-opt-hp">体力 <b>' + hp + "</b> → <b>" + after + "</b></div>"
                        + (risky ? '<div class="dmqc-zs-opt-tag">濒 危</div>' : "");
                }
            } else {
                // 紧凑/密集：封印与誓约名并排，省下一整行
                html = '<div class="dmqc-zs-opt-head">'
                    + '<div class="' + sealCls + '">' + info.seal + "</div>"
                    + '<div class="dmqc-zs-opt-name">' + info.name + "</div>"
                    + "</div>"
                    + '<div class="dmqc-zs-opt-motto">' + info.motto + "</div>";
                if (calm) {
                    html +=
                        '<div class="dmqc-zs-opt-line neutral">不失去体力</div>'
                        + '<div class="dmqc-zs-opt-hp">体力保持 <b>' + hp + "</b></div>";
                } else {
                    // 合并成一行时必须足够短，否则 6 列窄卡里会折成两行、把卡片撑高。
                    // 用色标替代文字（朱=失血 / 青=摸牌），既省宽度又不丢语义。
                    html +=
                        '<div class="dmqc-zs-opt-line">'
                        + '<span class="cost-t">失 <b>' + n + "</b> 血</span>"
                        + '<i class="sep">·</i>'
                        + '<span class="gain-t">摸 <b>' + n + "</b> 牌</span>"
                        + "</div>"
                        + '<div class="dmqc-zs-opt-hp">体力 <b>' + hp + "</b> → <b>" + after + "</b>"
                        + (risky ? '<span class="dmqc-zs-opt-tag">濒危</span>' : "")
                        + "</div>";
                }
            }
            node.innerHTML = html;

            node.addEventListener(dlgName, function (e) {
                if (e) {
                    if (e.preventDefault) e.preventDefault();
                    if (e.stopPropagation) e.stopPropagation();
                }
                if (closed) return;
                sel = n;
                sync(false);
            });
            node.addEventListener("mouseenter", function () {
                if (closed || sel === n) return;
                node.style.boxShadow =
                    "0 0 18px " + (awakened ? "rgba(255,122,44,.5)" : "rgba(224,69,42,.45)")
                    + ", inset 0 0 0 1px rgba(255,225,190,.14), 0 6px 16px rgba(0,0,0,.55)";
            });
            node.addEventListener("mouseleave", function () {
                if (closed || sel === n) return;
                node.style.boxShadow = "";
            });

            nodes.push(node);
        }

        // ---------- 刷新：选中态 + 体力推演 + 文案 ----------
        function sync(first) {
            for (let n = 0; n <= max; n++) {
                const node = nodes[n];
                if (!node) continue;
                const on = sel === n;
                node.classList.toggle("selected", on);
                if (first) {
                    node.style.animation = on
                        ? "dmqc-zs-opt-pulse 1.4s ease-in-out infinite"
                        : "dmqc-zs-opt-in .5s cubic-bezier(.2,.9,.3,1.12) both";
                    node.style.animationDelay = on ? "0ms" : 120 + n * 70 + "ms";
                } else {
                    node.style.animation = on ? "dmqc-zs-opt-pulse 1.4s ease-in-out infinite" : "none";
                    node.style.animationDelay = "0ms";
                }
            }

            // 体力条：左侧 hp 格为当前体力，其中最高的 sel 格将被壮誓夺走
            for (let i = 1; i <= maxHp; i++) {
                const seg = segs[i - 1];
                if (!seg) continue;
                seg.className = "dmqc-zs-hpseg";
                if (i <= hp - sel) seg.classList.add("on");
                else if (i <= hp) seg.classList.add("will");
            }

            if (hpText) {
                hpText.innerHTML = sel > 0
                    ? "体力 <b>" + hp + "</b> → <b>" + (hp - sel) + "</b> ／ 上限 " + maxHp + " ／ 摸牌 <b>+" + sel + "</b>"
                    : "体力 <b>" + hp + "</b> ／ 上限 " + maxHp + " ／ 保持不损";
            }
            if (okNode) okNode.innerHTML = sel > 0 ? "立 誓" : "不 发 动";
            if (hintNode) {
                hintNode.innerHTML = sel > 0
                    ? "确认后立即失去 " + sel + " 点体力并摸 " + sel + " 张牌（代价付讫，壮誓特效随即演出）"
                    : "「不发动」将跳过壮誓：不失去体力，也不摸牌";
            }
        }

        // ---------- 操作栏 ----------
        const bar = ui.create.div(".dmqc-zs-bar", panel);

        okNode = ui.create.div(".dmqc-zs-ok", bar);
        okNode.addEventListener(dlgName, function (e) {
            if (e) {
                if (e.preventDefault) e.preventDefault();
                if (e.stopPropagation) e.stopPropagation();
            }
            if (closed) return;
            finish({ bool: true, links: [String(sel)] });
        });

        const cancelNode = ui.create.div(".dmqc-zs-cancel", bar);
        cancelNode.innerHTML = "取 消";
        cancelNode.addEventListener(dlgName, function (e) {
            if (e) {
                if (e.preventDefault) e.preventDefault();
                if (e.stopPropagation) e.stopPropagation();
            }
            if (closed) return;
            finish({ bool: false });
        });

        hintNode = ui.create.div(".dmqc-zs-hint", panel);

        const foot = ui.create.div(".dmqc-zs-foot", panel);
        foot.innerHTML =
            "汉中锐锋 · 梦 魏 延"
            + "<em>点击誓约卡选定档位，方向键换档，Enter 确认 / Esc 取消</em>";

        try {
            document.addEventListener("keydown", keyHandler, true);
        } catch (e) {}

        sync(true);
    }).catch(function (e) {
        console.error("[大梦千秋] 壮誓选择框构建异常，已回退引擎默认框：", e);
        try {
            if (domNode && domNode.parentNode) domNode.parentNode.removeChild(domNode);
        } catch (e1) {}
        try {
            if (resumeGuard) game.resume();
        } catch (e2) {}
        return null;
    });
}

// 调试快照：确认骨骼资源是否真的加载成功（供控制台排查）
export function dmqcWeiyanEffectDebug() {
    const anim = sgzWeiyanAnim();
    const names = ["2026/SS_SWY_zhuangshi1", "2026/SS_SWY_zhuangshi2", "SS_SWY_tongchang", "SS_SWY_yinzhan", "SS_ShiWeiYanSkill"];
    const info = {
        动画目录: SGZ_WEIYAN_ANIM_DIR,
        dcdAnim: !!anim,
        assets: {},
        skeletons: [],
    };
    if (anim && anim.spine) {
        for (const n of names) {
            const full = SGZ_WEIYAN_ANIM_DIR + n;
            info.assets[n] = !!(anim.spine.assets && anim.spine.assets[full]);
        }
        info.skeletons = (anim.spine.skeletons || []).map(s => s.name);
    }
    console.log("[大梦千秋] 梦魏延特效状态", info);
    return info;
}
