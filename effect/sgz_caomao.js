// ===== 梦曹髦 · 特效层（绂嶆笂主题选择框 + 潜龙卡牌火焰 UI，纯表现层，无游戏规则） =====
// 由 character/sgz_caomao.js 通过 import 使用；模块级函数/常量与 qianlongUI 技能
// ============================================================
//  【缚渊·帝诏】专属主题选择框 —— 大梦千秋 · 曹髦
//  替换无名杀引擎自带的普通 textbutton 选项框，
//  以“帝王诏令”为主题：黑金诏书界面 + 篆字封印 + 传国玉玺。
//  仅对本地人类玩家生效，AI/联机/录像回放自动回退到引擎默认框。
// ============================================================
const dmqcFuyuanStyleId = 'dmqc_fuyuan_style';
let dmqcFuyuanPatternUid = 0;

// 五个权能的主题化展示数据（封印字 / 名称 / 铭文 / 效果简述 / 强调色）
const dmqcFuyuanOptionMap = {
    opt1: {
        seal: '放', name: '放逐', motto: '夺其兵甲·困以诏狱',
        desc: '废除其所有装备栏，并在判定区补齐【乐不思蜀】【兵粮寸断】【闪电】',
        accent: '#ff9a5a'
    },
    opt2: {
        seal: '谋', name: '潜谋', motto: '藏锋于袖·禁绝往来',
        desc: '其所有手牌标记为“潜谋”，明置且不可使用、打出、弃置',
        accent: '#7fb2ff'
    },
    opt3: {
        seal: '封', name: '诰封', motto: '恩威并施·赐之必偿',
        desc: '其获得牌时，须弃置一张手牌',
        accent: '#ffd76a'
    },
    opt4: {
        seal: '敕', name: '绝敕', motto: '断其生路·绝其疗救',
        desc: '其回复体力时，改为失去一点体力',
        accent: '#ff6a6a'
    },
    opt5: {
        seal: '尊', name: '秉尊', motto: '削其威势·罚当其伤',
        desc: '其造成的伤害-1；其造成伤害时，你摸一张牌',
        accent: '#c792ff'
    }
};

// 传国玉玺：受命於天 / 既壽永昌（小篆）
function dmqcFuyuanSealSvg() {
    return '<svg class="dmqc-fy-seal" viewBox="0 0 220 150" aria-hidden="true">'
        + '<defs>'
        + '<linearGradient id="dmqc-fy-gold" x1="0" y1="0" x2="1" y2="1">'
        + '<stop offset="0" stop-color="#f8e3a2"/><stop offset="0.5" stop-color="#c99a3f"/><stop offset="1" stop-color="#8a6420"/>'
        + '</linearGradient>'
        + '<linearGradient id="dmqc-fy-sealred" x1="0" y1="0" x2="1" y2="1">'
        + '<stop offset="0" stop-color="#c9302a"/><stop offset="0.55" stop-color="#a31f1a"/><stop offset="1" stop-color="#7c1612"/>'
        + '</linearGradient>'
        + '<filter id="dmqc-fy-grain" x="0" y="0" width="100%" height="100%">'
        + '<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="n"/>'
        + '<feColorMatrix in="n" type="matrix" values="0 0 0 0 0.92  0 0 0 0 0.85  0 0 0 0 0.7  0 0 0 0.07 0"/>'
        + '<feComposite operator="over" in2="SourceGraphic"/>'
        + '</filter>'
        + '</defs>'
        + '<!-- 印钮 -->'
        + '<path d="M110 6 C 82 6 60 15 52 30 C 76 41 144 41 168 30 C 160 15 138 6 110 6 Z" fill="url(#dmqc-fy-gold)" stroke="#f8e3a2" stroke-width="1"/>'
        + '<path d="M110 6 C 99 6 93 12 93 20 C 101 25 119 25 127 20 C 127 12 121 6 110 6 Z" fill="#7c5a1a" opacity="0.5"/>'
        + '<circle cx="110" cy="16" r="5" fill="#f8e3a2"/>'
        + '<path d="M64 30 C 74 24 86 22 98 22 L 98 30 C 86 30 74 32 66 36 Z" fill="#8a6420" opacity="0.85"/>'
        + '<path d="M156 30 C 146 24 134 22 122 22 L 122 30 C 134 30 146 32 154 36 Z" fill="#8a6420" opacity="0.85"/>'
        + '<!-- 印身 -->'
        + '<rect x="30" y="44" width="160" height="98" rx="7" fill="url(#dmqc-fy-sealred)" stroke="#e8b46a" stroke-width="2.5" filter="url(#dmqc-fy-grain)"/>'
        + '<rect x="37" y="51" width="146" height="84" rx="4" fill="none" stroke="#e8b46a" stroke-width="1.2" opacity="0.9"/>'
        + '<!-- 篆字：右列 受/既，左列 天/昌（自右向左读） -->'
        + '<g fill="#f5e6c4" opacity="0.96" font-family="xiaozhuan, KaiTi, STKaiti, serif" font-size="26" text-anchor="middle">'
        + '<text x="145" y="74">受</text><text x="115" y="74">命</text><text x="85" y="74">於</text><text x="55" y="74">天</text>'
        + '<text x="145" y="116">既</text><text x="115" y="116">壽</text><text x="85" y="116">永</text><text x="55" y="116">昌</text>'
        + '</g>'
        + '</svg>';
}

// 注入主题样式（幂等）
function dmqcInjectFuyuanStyle() {
    if (document.getElementById(dmqcFuyuanStyleId)) return;
    var style = document.createElement('style');
    style.id = dmqcFuyuanStyleId;
    style.innerHTML = `
/* ============ 缚渊·帝诏 主题选择框 ============ */
.dmqc-fuyuan-dialog {
    position: absolute !important;
    width: var(--dmqc-width, 820px) !important;
    max-width: calc(100vw - 24px) !important;
    height: auto !important;
    min-height: 0 !important;
    left: 50% !important;
    top: 50% !important;
    /* 关键：引擎布局给 .dialog 设了 bottom:170px，若不覆盖，
       top+bottom 同时存在会强制盒子高度（height:auto 失效），面板向下溢出窗口 */
    bottom: auto !important;
    transform: translate(-50%, -50%) scale(var(--dmqc-scale, 1)) !important;
    margin: 0 !important;
    padding: 0 !important;
    background: transparent !important;
    border: none !important;
    border-radius: 16px !important;
    box-shadow: none !important;
    overflow: visible !important;
    transition: none !important;
}
.dmqc-fuyuan-dialog > .content-container {
    width: 100% !important;
    height: auto !important;
    min-height: 0 !important;
    position: relative !important;
    left: 0 !important;
    top: 0 !important;
    overflow: visible !important;
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    border-radius: 16px !important;
}
.dmqc-fuyuan-dialog > .content-container > .content {
    display: block;
    /* 关键：阻止全局 div{position:absolute} 使 .content 绝对定位导致容器高度塌陷、面板向下溢出 */
    position: relative !important;
    width: 100%;
    overflow: visible !important;
    padding: 0 !important;
    margin: 0 !important;
    border-radius: 16px;
}
.dmqc-fuyuan-dialog > .bar { display: none !important; }

.dmqc-fy {
    position: relative;
    display: block;
    box-sizing: border-box;
    width: 100%;
    padding: 20px 24px 16px;
    border-radius: 16px;
    overflow: hidden;
    text-align: center;
    color: #ece3cf;
    font-family: yuanli, "KaiTi", "STKaiti", serif;
    /* 完全不透明实底（0 透明度） */
    background: linear-gradient(180deg, #261739 0%, #1b1029 55%, #110b1d 100%);
    border: 1px solid rgba(212, 175, 55, 0.6);
    box-shadow:
        0 0 0 1px rgba(0, 0, 0, 0.9),
        0 0 0 4px rgba(212, 175, 55, 0.2),
        0 0 46px rgba(0, 0, 0, 0.8),
        inset 0 0 42px rgba(212, 175, 55, 0.08);
    animation: dmqc-fy-in 0.42s cubic-bezier(0.2, 0.9, 0.3, 1.1) both;
    transition: none;
}
@keyframes dmqc-fy-in {
    from { opacity: 0; transform: scale(0.9) translateY(12px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
}

/* 回纹底纹 */
.dmqc-fy-pattern {
    position: absolute;
    left: 0; top: 0;
    width: 100%; height: 100%;
    pointer-events: none;
}

/* 圣旨缎面背景层（svg 图片，缺失时自动回退到纯 CSS 渐变）：
   仅作装饰暗纹，降低透明度避免影响底板不透感 */
.dmqc-fy-bg {
    position: absolute;
    left: 0; top: 0;
    width: 100%; height: 100%;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    opacity: 0.28;
    mix-blend-mode: normal;
    pointer-events: none;
}

/* 双龙戏珠金徽水印 */
.dmqc-fy-emblem {
    position: absolute;
    left: 50%; top: 48%;
    width: 250px; height: 250px;
    transform: translate(-50%, -50%);
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    opacity: 0.14;
    pointer-events: none;
}

/* 四角金饰 */
.dmqc-fy-corner {
    position: absolute;
    width: 30px; height: 30px;
    pointer-events: none;
    opacity: 0.9;
}
.dmqc-fy-corner.tl { top: 10px; left: 10px; border-top: 2px solid #d4af37; border-left: 2px solid #d4af37; border-top-left-radius: 6px; }
.dmqc-fy-corner.tr { top: 10px; right: 10px; border-top: 2px solid #d4af37; border-right: 2px solid #d4af37; border-top-right-radius: 6px; }
.dmqc-fy-corner.bl { bottom: 10px; left: 10px; border-bottom: 2px solid #d4af37; border-left: 2px solid #d4af37; border-bottom-left-radius: 6px; }
.dmqc-fy-corner.br { bottom: 10px; right: 10px; border-bottom: 2px solid #d4af37; border-right: 2px solid #d4af37; border-bottom-right-radius: 6px; }

/* 头部 */
.dmqc-fy-head {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 18px;
    text-align: left;
}
.dmqc-fy-ava {
    position: relative;
    flex: 0 0 72px;
    width: 72px; height: 72px;
    border-radius: 50%;
    background-size: cover;
    background-position: center 12%;
    border: 2px solid #d4af37;
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.65), 0 0 20px rgba(212, 175, 55, 0.35), inset 0 0 12px rgba(0, 0, 0, 0.6);
}
.dmqc-fy-titlewrap {
    position: relative;
    flex: 0 1 auto;
}
.dmqc-fy-kicker {
    position: relative;
    font-family: xiaozhuan, "KaiTi", serif;
    font-size: 13px;
    letter-spacing: 7px;
    color: #b9a15f;
    text-shadow: 0 0 8px rgba(0, 0, 0, 0.8);
    margin-bottom: 2px;
}
.dmqc-fy-title {
    position: relative;
    font-family: xinwei, "KaiTi", serif;
    font-size: 32px;
    line-height: 1.15;
    letter-spacing: 6px;
    color: #f2d57e;
    text-shadow: 0 0 14px rgba(242, 213, 126, 0.55), 0 2px 4px rgba(0, 0, 0, 0.8);
    white-space: nowrap;
}
.dmqc-fy-title i {
    font-style: normal;
    color: #ff6a4a;
    font-size: 26px;
    vertical-align: 2px;
}
.dmqc-fy-sub {
    position: relative;
    font-size: 15px;
    letter-spacing: 1px;
    color: #cfc4ae;
    margin-top: 5px;
}
.dmqc-fy-sub b {
    color: #ffd76a;
    font-family: xinwei, "KaiTi", serif;
    font-weight: normal;
    font-size: 17px;
    letter-spacing: 2px;
}
/* 右侧“帝权”竖排 */
.dmqc-fy-side {
    position: relative;
    flex: 0 0 44px;
    width: 44px;
    height: 84px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    border: 1px solid rgba(212, 175, 55, 0.55);
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.35);
    box-shadow: inset 0 0 10px rgba(212, 175, 55, 0.12);
}
.dmqc-fy-side span {
    position: relative;
    font-family: xiaozhuan, "KaiTi", serif;
    font-size: 20px;
    line-height: 1;
    color: #d9b96a;
}

/* 分隔线 */
.dmqc-fy-ruler {
    position: relative;
    display: block;
    height: 1px;
    margin: 14px 0 12px;
    background: linear-gradient(90deg, rgba(212, 175, 55, 0), rgba(212, 175, 55, 0.8) 18%, #f2d57e 50%, rgba(212, 175, 55, 0.8) 82%, rgba(212, 175, 55, 0));
}
.dmqc-fy-ruler::before,
.dmqc-fy-ruler::after {
    content: "";
    position: absolute;
    top: 50%;
    width: 6px; height: 6px;
    transform: translateY(-50%) rotate(45deg);
    background: #f2d57e;
    box-shadow: 0 0 8px rgba(242, 213, 126, 0.8);
}
.dmqc-fy-ruler::before { left: 24%; }
.dmqc-fy-ruler::after { right: 24%; }

/* 选项行：单行排列，宽度不足时整体缩放（由 JS 计算 --dmqc-scale） */
.dmqc-fy-opts {
    position: relative;
    display: flex;
    flex-wrap: nowrap;
    justify-content: center;
    align-items: stretch;
    gap: 12px;
    transition: none;
}
.dmqc-fy-opt {
    position: relative;
    display: block;
    flex: 0 0 140px;
    box-sizing: border-box;
    width: 140px;
    padding: 14px 10px 12px;
    border-radius: 10px;
    cursor: pointer;
    user-select: none;
    text-align: center;
    /* 实体羊皮纸卡面：浅色卡身 + 双层金边 + 顶部反光，与深紫底板强对比 */
    background:
        linear-gradient(180deg, rgba(255, 250, 235, 0.4), rgba(255, 250, 235, 0) 34%),
        linear-gradient(180deg, #efe3c4 0%, #e0cd9f 55%, #cdb583 100%);
    border: 2px solid #a8864e;
    box-shadow:
        0 4px 12px rgba(0, 0, 0, 0.55),
        inset 0 0 0 1px rgba(255, 250, 230, 0.65),
        inset 0 0 14px rgba(120, 85, 30, 0.2);
    animation: dmqc-fy-opt-in 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.12) both;
    transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}
@keyframes dmqc-fy-opt-in {
    from { opacity: 0; transform: translateY(16px) scale(0.9); }
    to { opacity: 1; transform: translateY(0) scale(1); }
}
.dmqc-fy-opt:hover {
    transform: translateY(-5px);
    border-color: var(--acc, #d4a94f);
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(255, 250, 230, 0.65), inset 0 0 14px rgba(120, 85, 30, 0.2);
}
/* ===== 选中权能：亮金高亮（粗金框 + 抬升放大 + 金红辉光脉动）===== */
.dmqc-fy-opt.selected {
    transform: translateY(-6px) scale(1.07);
    border: 3px solid #ffc04d;
    background:
        radial-gradient(130% 130% at 50% 0%, rgba(255, 200, 80, 0.5), rgba(0, 0, 0, 0) 62%),
        linear-gradient(180deg, #f8efd6 0%, #ebdab2 55%, #d8c190 100%);
    box-shadow:
        0 0 22px 6px rgba(255, 180, 60, 0.95),
        0 0 48px 16px rgba(255, 90, 25, 0.5),
        inset 0 0 0 1px rgba(255, 250, 230, 0.9);
    animation: dmqc-fy-selected-pulse 1.3s ease-in-out infinite;
    z-index: 2;
}
@keyframes dmqc-fy-selected-pulse {
    0%, 100% { box-shadow: 0 0 16px 5px rgba(255, 180, 60, 0.85), 0 0 38px 12px rgba(255, 90, 25, 0.45), inset 0 0 0 1px rgba(255, 250, 230, 0.9); }
    50% { box-shadow: 0 0 28px 8px rgba(255, 200, 70, 1), 0 0 60px 20px rgba(255, 60, 15, 0.6), inset 0 0 0 1px rgba(255, 250, 230, 0.95); }
}
/* 选中时封印燃起火光 */
.dmqc-fy-opt.selected .dmqc-fy-opt-seal {
    animation: dmqc-fy-seal-fire 1.5s ease-in-out infinite;
}
@keyframes dmqc-fy-seal-fire {
    0%, 100% { box-shadow: inset 0 0 9px rgba(0, 0, 0, 0.4), 0 0 12px rgba(255, 120, 30, 0.5); }
    50% { box-shadow: inset 0 0 12px rgba(255, 120, 30, 0.35), 0 0 20px rgba(255, 160, 50, 0.9); }
}
.dmqc-fy-opt-seal {
    position: relative;
    display: block;
    width: 50px; height: 50px;
    margin: 0 auto 9px;
    border-radius: 9px;
    line-height: 50px;
    font-family: xiaozhuan, "KaiTi", serif;
    font-size: 30px;
    color: #f7e3c4;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
    background: linear-gradient(145deg, #c22b22, #8e1c14);
    border: 2px solid #d9a24f;
    box-shadow: inset 0 0 9px rgba(0, 0, 0, 0.4), 0 2px 5px rgba(0, 0, 0, 0.4);
    transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.dmqc-fy-opt:hover .dmqc-fy-opt-seal {
    transform: scale(1.1) rotate(-3deg);
    box-shadow: inset 0 0 9px rgba(0, 0, 0, 0.4), 0 0 14px var(--acc, #d4af37);
}
.dmqc-fy-opt-name {
    position: relative;
    font-family: xinwei, "KaiTi", serif;
    font-size: 19px;
    letter-spacing: 3px;
    color: #4a3416;
    text-shadow: 0 1px 0 rgba(255, 250, 230, 0.5);
}
.dmqc-fy-opt-motto {
    position: relative;
    font-size: 11px;
    letter-spacing: 1px;
    color: #8a6d3c;
    margin: 3px 0 7px;
    white-space: nowrap;
}
.dmqc-fy-opt-desc {
    position: relative;
    font-size: 12px;
    line-height: 1.55;
    color: #5d4a26;
}

/* 页脚 */
.dmqc-fy-foot {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    margin-top: 14px;
}
.dmqc-fy-seal {
    position: relative;
    display: block;
    width: 128px;
    height: auto;
    filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.7));
}
.dmqc-fy-credit {
    position: relative;
    font-family: xiaozhuan, "KaiTi", serif;
    font-size: 15px;
    letter-spacing: 4px;
    color: #a3926e;
}
.dmqc-fy-ver {
    position: relative;
    font-family: yuanli, "KaiTi", serif;
    font-size: 10px;
    letter-spacing: 1px;
    color: #6f6552;
    margin-left: 8px;
    vertical-align: 2px;
}

/* 无障碍：减少动效 */
@media (prefers-reduced-motion: reduce) {
    .dmqc-fy, .dmqc-fy-opt, .dmqc-fy-opt-seal,
    .dmqc-fy-opt.selected, .dmqc-fy-opt.selected .dmqc-fy-opt-seal {
        animation: none !important;
        transition: none !important;
    }
}
`;
    document.head.appendChild(style);
}

// 构建缚渊专属“帝诏·权能”选择框（返回 dialog 实例）
// 交互与样式统一为「小乔·五音 / 吕布·镇猎」同款：
//   · 暗玻璃卡片 + 圆形权能印 + 金色名称 + 铭文 + 效果描述
//   · 单次点击即选定（不再需要“先点选、再点确认”）
function dmqcBuildFuyuanDialog(player, target, choices) {
    dmqcInjectFuyuanStyle();
    var dlg = ui.create.dialog('hidden');
    dlg.classList.add('dmqc-fuyuan-dialog');

    // ===== 关键布局内联化（不依赖外部样式表；整体按视口缩放，避免选项换行堆叠）=====
    var designW = 860; // 设计稿宽度（px）
    var designH = 505; // 设计稿高度（px，含页脚；给效果描述留出空间）
    var vw = window.innerWidth || document.documentElement.clientWidth || 1280;
    var vh = window.innerHeight || document.documentElement.clientHeight || 720;
    var dlgW = Math.min(designW, vw - 24);
    // 同时按宽、高缩放，保证面板整体不超出游戏窗口（下边界不溢出）
    var scale = Math.min(1, (vw - 24) / designW, (vh - 24) / designH);
    // 注意：必须先赋 cssText（会重置全部内联样式），再设置自定义属性
    // bottom:auto + height:auto 必须内联——否则引擎 .dialog 的 bottom:170px 会强制压缩盒子高度导致“上下太短”
    dlg.style.cssText = 'position:absolute;left:50%;top:50%;width:' + dlgW + 'px;height:auto;bottom:auto;margin:0;padding:0;overflow:visible;transition:none;';
    dlg.style.setProperty('--dmqc-width', dlgW + 'px');
    dlg.style.setProperty('--dmqc-scale', scale);
    dlg.contentContainer.style.cssText = 'position:relative;height:auto;min-height:0;overflow:visible;';
    dlg.content.style.cssText = 'display:block;position:relative;width:100%;overflow:visible;padding:0;margin:0;';

    var wrap = ui.create.div('dmqc-fy', dlg.content);
    // 底板背景内联写入（完全不透明，不依赖样式表）
    wrap.style.cssText = 'position:relative;display:block;box-sizing:border-box;width:' + dlgW + 'px;padding:20px 24px 16px;overflow:hidden;text-align:center;color:#ece3cf;transition:none;font-family:yuanli,KaiTi,STKaiti,serif;'
        + 'background:linear-gradient(180deg,#261739 0%,#1b1029 55%,#110b1d 100%);'
        + 'border:1px solid rgba(212,175,55,.62);'
        + 'box-shadow:0 0 0 1px rgba(0,0,0,.9),0 0 0 4px rgba(212,175,55,.2),0 0 0 7px rgba(127,183,255,.05),0 0 46px rgba(0,0,0,.8),inset 0 0 42px rgba(212,175,55,.08);'
        + 'animation:dmqc-fy-in .42s cubic-bezier(.2,.9,.3,1.08) both;';
    dmqcFuyuanPatternUid++;
    var pid = 'dmqc-fy-meander-' + dmqcFuyuanPatternUid;
    wrap.insertAdjacentHTML('beforeend',
        '<svg class="dmqc-fy-pattern" aria-hidden="true">'
        + '<defs><pattern id="' + pid + '" width="48" height="48" patternUnits="userSpaceOnUse">'
        + '<path d="M4 32 L20 32 L20 16 L32 16 L32 24 L24 24 L24 28 L36 28 L36 12 L16 12 L16 32 L4 32 Z" fill="none" stroke="#d4af37" stroke-width="1.4" opacity="0.12"/>'
        + '<path d="M6 34 L22 34 L22 18 L34 18 L34 26 L26 26 L26 30 L38 30 L38 10 L14 10 L14 34 L6 34 Z" fill="none" stroke="#d4af37" stroke-width="0.7" opacity="0.07"/>'
        + '</pattern></defs>'
        + '<rect width="100%" height="100%" fill="url(#' + pid + ')"/>'
        + '<text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" font-family="xiaozhuan, KaiTi, STKaiti, serif" font-size="300" fill="#f2d57e" opacity="0.05">龍</text>'
        + '</svg>'
        + '<div class="dmqc-fy-bg"></div>'
        + '<div class="dmqc-fy-emblem"></div>'
        + '<div class="dmqc-fy-corner tl"></div><div class="dmqc-fy-corner tr"></div><div class="dmqc-fy-corner bl"></div><div class="dmqc-fy-corner br"></div>'
    );
    wrap.querySelector('.dmqc-fy-bg').style.backgroundImage = "url('extension/大梦千秋/image/sgz_caomao_dialog_bg.svg')";
    wrap.querySelector('.dmqc-fy-emblem').style.backgroundImage = "url('extension/大梦千秋/image/sgz_caomao_double_dragon.svg')";

    // 头部：头像 + 标题 + 竖排“帝权”
    var head = ui.create.div('dmqc-fy-head', wrap);
    head.style.cssText = 'position:relative;display:flex;align-items:center;justify-content:center;gap:18px;text-align:left;transition:none;';
    var ava = ui.create.div('dmqc-fy-ava', head);
    ava.style.cssText = 'position:relative;flex:0 0 76px;width:76px;height:76px;border-radius:50%;background-size:cover;background-position:center 12%;transition:none;';
    ava.style.backgroundImage = "url('extension/大梦千秋/image/sgz_caomao.jpg')";
    var titleWrap = ui.create.div('dmqc-fy-titlewrap', head);
    titleWrap.style.cssText = 'position:relative;flex:0 1 auto;text-align:center;transition:none;';
    titleWrap.innerHTML = '<div style="position:relative;display:block;font-family:xiaozhuan,KaiTi,serif;font-size:13px;letter-spacing:7px;color:#b9a15f;text-shadow:0 0 10px rgba(212,175,55,.4);margin-bottom:2px;">潜 龙 在 渊 · 腾 云 越 井</div>'
        + '<div style="position:relative;display:block;font-family:xinwei,KaiTi,serif;font-size:32px;line-height:1.15;letter-spacing:6px;color:#f2d57e;text-shadow:0 0 14px rgba(242,213,126,.55),0 2px 4px rgba(0,0,0,.8);white-space:nowrap;">缚 渊 <i style="font-style:normal;color:#ff6a4a;font-size:26px;vertical-align:2px;">·</i> 帝 诏</div>'
        + '<div style="position:relative;display:block;font-size:14.5px;letter-spacing:1px;color:#cfc4ae;margin-top:5px;">对 <b style="color:#ffd76a;font-family:xinwei,KaiTi,serif;font-weight:normal;font-size:17px;">' + get.translation(target) + '</b> 施加一道权能</div>';
    var side = ui.create.div('dmqc-fy-side', head);
    side.style.cssText = 'position:relative;flex:0 0 44px;width:44px;height:84px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;transition:none;';
    side.innerHTML = '<span style="position:relative;display:block;font-family:xiaozhuan,KaiTi,serif;font-size:20px;line-height:1;color:#ffd8b0;">帝</span><span style="position:relative;display:block;font-family:xiaozhuan,KaiTi,serif;font-size:20px;line-height:1;color:#a9c6ff;">权</span>';

    var ruler = ui.create.div('dmqc-fy-ruler', wrap);
    ruler.style.cssText = 'position:relative;display:block;height:1px;margin:14px 0 12px;transition:none;background:linear-gradient(90deg,rgba(212,175,55,0),#d4af37 18%,#f2d57e 50%,#ff6a4a 82%,rgba(255,106,74,0));';

    // ===== 交互：单次点击即选定（与小乔·五音同款）=====
    var dmqcClickEvt = lib.config.touchscreen ? 'touchend' : 'click';

    // 结算：以指定卡写入事件结果（与 ui.click.ok 结构一致）
    var dmqcFyConfirm = function (btn) {
        var evt = _status.event;
        if (!btn || !evt) return;
        if (ui.confirm) ui.confirm.close(); // 兜底：关闭可能存在的确认栏
        evt.result = {
            bool: true,
            buttons: [btn],
            cards: [],
            targets: [],
            confirm: "ok",
            links: [btn.link]
        };
        game.uncheck(); // 清理选中态/selecting 类/imchoosing（与 ui.click.ok 一致）
        game.resume();
    };

    // 权能卡基线样式（暗玻璃，内联化；与小乔/吕布卡片一致）
    var dmqcFuyuanCardCss = function (accent) {
        return 'position:relative;display:block;flex:0 0 150px;box-sizing:border-box;width:150px;cursor:pointer;'
            + 'user-select:none;text-align:center;border-radius:12px;padding:14px 10px 13px;'
            + 'transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease;'
            + 'background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,0) 42%),'
            + 'linear-gradient(180deg,#241a30 0%,#180f22 62%,#0e0814 100%);'
            + 'border:2px solid rgba(212,175,55,.4);'
            + 'box-shadow:inset 0 0 0 1px rgba(230,200,140,.1),inset 0 0 24px rgba(0,0,0,.42),0 4px 12px rgba(0,0,0,.55);';
    };

    // 选项：五道权能（封印字 + 名称 + 铭文 + 效果）——单行排列，不换行
    var opts = ui.create.div('dmqc-fy-opts', wrap);
    opts.style.cssText = 'position:relative;display:flex;flex-wrap:nowrap;justify-content:center;align-items:stretch;gap:12px;transition:none;';
    for (var i = 0; i < choices.length; i++) {
        let id = choices[i][0];
        let data = dmqcFuyuanOptionMap[id] || {
            seal: ('' + id).replace(/^opt/, '') || '权',
            name: id,
            motto: '',
            desc: choices[i][1],
            accent: '#d4af37'
        };
        var btn = ui.create.div('dmqc-fy-card', opts);
        btn.style.cssText = dmqcFuyuanCardCss(data.accent);
        btn.style.setProperty('--acc', data.accent);
        btn.style.animation = 'dmqc-fy-opt-in .5s cubic-bezier(.2,.9,.3,1.12) both';
        btn.style.animationDelay = (130 + i * 70) + 'ms'; // 逐张浮现（内联设置，避免 calc 兼容问题）
        btn.innerHTML = '<div style="position:relative;display:block;width:54px;height:54px;line-height:54px;margin:0 auto 10px;border-radius:50%;text-align:center;font-family:xiaozhuan,KaiTi,serif;font-size:30px;color:#f7e3c4;font-weight:bold;'
            + 'background:radial-gradient(circle at 35% 28%,' + data.accent + 'cc,' + data.accent + '55 62%,#0e0814 100%);'
            + 'border:2px solid ' + data.accent + ';box-shadow:inset 0 0 9px rgba(0,0,0,.45),0 2px 5px rgba(0,0,0,.45);">' + data.seal + '</div>'
            + '<div style="position:relative;display:block;font-family:KaiTi,STKaiti,serif;font-size:20px;letter-spacing:3px;color:#f2d57e;">' + data.name + '</div>'
            + '<div style="position:relative;display:block;font-family:KaiTi,STKaiti,serif;font-size:12px;letter-spacing:1px;color:' + data.accent + ';margin:4px 0 7px;white-space:nowrap;">' + data.motto + '</div>'
            + '<div style="position:relative;display:block;font-family:KaiTi,STKaiti,serif;font-size:12.5px;line-height:1.6;color:#d6c9a8;text-align:left;">' + data.desc + '</div>';
        btn.link = id;
        // 不给按钮挂 Button 原型、并阻止冒泡——否则引擎的 windowmousedown/touch 处理
        // 会把卡片当成自己的按钮自动选中并 autoConfirm 直接结算（导致“点卡立即生效”）
        btn.addEventListener(dmqcClickEvt, function (e) {
            if (e && e.stopPropagation) e.stopPropagation();
            var evt = _status.event;
            if (evt && evt.name == 'chooseButton' && evt.player && evt.player.isMine() && !_status.auto && !_status.video) {
                dmqcFyConfirm(this);
            } else {
                // 非本机/托管/录像等场景沿用引擎默认点击逻辑
                ui.click.button.call(this);
            }
        });
        // 悬停：抬升 + 强调色金边辉光；离开恢复（与小乔/吕布一致）
        btn.addEventListener('mouseenter', function () {
            var self = this;
            self.style.transform = 'translateY(-7px) scale(1.06)';
            self.style.borderColor = data.accent;
            self.style.boxShadow = '0 8px 18px rgba(0,0,0,.6),inset 0 0 0 1px rgba(255,255,255,.12),0 0 18px ' + data.accent + '77';
        });
        btn.addEventListener('mouseleave', function () {
            var self = this;
            self.style.transform = '';
            self.style.borderColor = 'rgba(212,175,55,.4)';
            self.style.boxShadow = 'inset 0 0 0 1px rgba(230,200,140,.1),inset 0 0 24px rgba(0,0,0,.42),0 4px 12px rgba(0,0,0,.55)';
        });
        dlg.buttons.push(btn);
    }

    // 页脚：称号
    var foot = ui.create.div('dmqc-fy-foot', wrap);
    foot.style.cssText = 'position:relative;display:flex;align-items:center;justify-content:center;gap:16px;margin-top:14px;transition:none;';
    foot.innerHTML = '<div style="position:relative;display:block;font-family:xiaozhuan,KaiTi,serif;font-size:14.5px;letter-spacing:4px;color:#a3926e;">潜龙权柄 · 梦 曹 髦</div>'
        + '<div style="position:relative;display:block;font-family:yuanli,KaiTi,serif;font-size:11px;letter-spacing:1px;color:#8f8367;">点击一张权能卡即选定该效果</div>';

    return dlg;
}

export const qianlongUI = {
    charlotte: true,
    silent: true,
    trigger: { 
        player: ["gainAfter", "loseAfter", "enterGame"],
        global: ["phaseBefore", "phaseBeginStart", "gameStart"] 
    },
    forced: true,
    priority: -10,
    init: function(player) {
        // 1. 注入 SVG 火焰滤镜（这是实现火焰撕裂感的灵魂）
        if (!document.getElementById('qianlong_flame_svg')) {
            var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.id = 'qianlong_flame_svg';
            svg.style.cssText = "position:absolute; width:0; height:0; pointer-events:none;";
            svg.innerHTML = `
                <filter id="qianlong-vivid-fire">
                    <!-- 湍流噪点产生火舌分叉 -->
                    <feTurbulence type="fractalNoise" baseFrequency="0.05 0.02" numOctaves="3" seed="1">
                        <animate attributeName="seed" from="1" to="100" dur="10s" repeatCount="indefinite" />
                    </feTurbulence>
                    <!-- 偏移映射将噪点应用到形状上 -->
                    <feDisplacementMap in="SourceGraphic" scale="15" />
                </filter>
            `;
            document.body.appendChild(svg);
        }

        // 2. 注入 CSS 样式
        if (!document.getElementById('qianlong_card_v2_style')) {
            var style = document.createElement('style');
            style.id = 'qianlong_card_v2_style';
            style.innerHTML = `
                /* 纯静态淡紫色滤镜 */
                .trick-reward-active {
                    /* 色相旋转至紫色 + 亮度微降 + 增加对比度 */
                    filter: hue-rotate(260deg) brightness(0.9) contrast(1.2) !important;
                }
                
                /* 亮红色滤镜 */
                .trick-reward-red {
                    filter: hue-rotate(350deg) brightness(0.9) contrast(1.2) !important;
                }

                /* 潜龙火焰卡牌类名 */
                .qianlong-fire-active {
                    
                }

                /* 火焰外圈：负责扭动的火舌 */
                .qianlong-fire-active::before {
                    content: "";
                    position: absolute;
                    top: -12px; left: -10px; right: -10px; bottom: -8px;
                    /* 深蓝紫色渐变 */
                    background: linear-gradient(to top, 
                        #1a0033 0%, 
                        #4b0082 30%, 
                        #ff0000 60%, 
                        #710909 100%);
                    filter: url(#qianlong-vivid-fire) blur(1.5px); /* 应用SVG滤镜 */
                    opacity: 0.8;
                    z-index: -1;
                    border-radius: 10px;
                    mix-blend-mode: screen;
                    animation: qianlong-fire-flicker 0.7s infinite;
                }

                /* 火焰内圈：负责核心亮度 */
                .qianlong-fire-active::after {
                    content: "";
                    position: absolute;
                    top: -2px; left: -2px; right: -2px; bottom: -2px;
                    box-shadow: 
                        0 0 10px #4b0082, 
                        0 0 20px #0000ff,
                        inset 0 0 15px rgba(10, 0, 47, 0.4);
                    border: 1.5px solid rgba(0, 210, 255, 0.6);
                    border-radius: 4px;
                    z-index: 5;
                    pointer-events: none;
                    mix-blend-mode: color-dodge;
                    animation: qianlong-inner-glow 5s infinite alternate;
                }

                @keyframes qianlong-fire-flicker {
                    0% { opacity: 0.7; transform: scale(1.02) translateY(0); }
                    50% { opacity: 0.9; transform: scale(1) translateY(-2px); }
                    100% { opacity: 0.8; transform: scale(1.01) translateY(1px); }
                }

                @keyframes qianlong-inner-glow {
                    from { box-shadow: 0 0 10px #2e014f; }
                    to { box-shadow: 0 0 25px #000036, 0 0 5px #fff; }
                }


            `;
            document.head.appendChild(style);
        }
    },
    content: function() {
        // 实时检索标记卡牌并添加类名
        var cards = player.getCards('h');
        var isTengyuan = player.hasSkill('sgz_tengyuan');
        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            if (card.hasGaintag('sgz_caomao_shaTag')) {
                card.classList.add('trick-reward-active');
                if (isTengyuan) {
                    card.classList.add('qianlong-fire-active');
                } else {
                    card.classList.remove('qianlong-fire-active');
                }
            } else {
                card.classList.remove('qianlong-fire-active');
                card.classList.remove('trick-reward-active');
            }
        }
    }
};

// 供 character/sgz_caomao.js 使用的导出
export { dmqcFuyuanStyleId, dmqcFuyuanPatternUid, dmqcFuyuanOptionMap, dmqcFuyuanSealSvg, dmqcInjectFuyuanStyle, dmqcBuildFuyuanDialog };
