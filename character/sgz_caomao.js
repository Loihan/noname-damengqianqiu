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
function dmqcBuildFuyuanDialog(player, target, choices) {
    dmqcInjectFuyuanStyle();
    var dlg = ui.create.dialog('hidden');
    dlg.classList.add('dmqc-fuyuan-dialog');

    // ===== 关键布局内联化（不依赖外部样式表；整体按视口缩放，避免选项换行堆叠）=====
    var designW = 860; // 设计稿宽度（px）
    var designH = 490; // 设计稿高度（px，含页脚）
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
    wrap.style.cssText = 'position:relative;display:block;box-sizing:border-box;width:' + dlgW + 'px;padding:20px 24px 16px;overflow:hidden;text-align:center;transition:none;'
        + 'background:linear-gradient(180deg,#261739 0%,#1b1029 55%,#110b1d 100%);'
        + 'border:1px solid rgba(212,175,55,.6);'
        + 'box-shadow:0 0 0 1px rgba(0,0,0,.9),0 0 0 4px rgba(212,175,55,.2),0 0 46px rgba(0,0,0,.8),inset 0 0 42px rgba(212,175,55,.08);';
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
    ava.style.cssText = 'position:relative;flex:0 0 72px;width:72px;height:72px;border-radius:50%;background-size:cover;background-position:center 12%;transition:none;';
    ava.style.backgroundImage = "url('extension/大梦千秋/image/sgz_caomao.jpg')";
    var titleWrap = ui.create.div('dmqc-fy-titlewrap', head);
    titleWrap.style.cssText = 'position:relative;flex:0 1 auto;text-align:center;transition:none;';
    titleWrap.innerHTML = '<div style="position:relative;display:block;font-family:xiaozhuan,KaiTi,serif;font-size:13px;letter-spacing:7px;color:#b9a15f;margin-bottom:2px;">潜 龙 在 渊 · 腾 云 越 井</div>'
        + '<div style="position:relative;display:block;font-family:xinwei,KaiTi,serif;font-size:32px;line-height:1.15;letter-spacing:6px;color:#f2d57e;text-shadow:0 0 14px rgba(242,213,126,.55),0 2px 4px rgba(0,0,0,.8);white-space:nowrap;">缚 渊 <i style="font-style:normal;color:#ff6a4a;font-size:26px;vertical-align:2px;">·</i> 帝 诏</div>'
        + '<div style="position:relative;display:block;font-size:15px;letter-spacing:1px;color:#cfc4ae;margin-top:5px;">对 <b style="color:#ffd76a;font-family:xinwei,KaiTi,serif;font-weight:normal;font-size:17px;">' + get.translation(target) + '</b> 施加一道权能</div>';
    var side = ui.create.div('dmqc-fy-side', head);
    side.style.cssText = 'position:relative;flex:0 0 44px;width:44px;height:84px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;transition:none;';
    side.innerHTML = '<span>帝</span><span>权</span>';

    var ruler = ui.create.div('dmqc-fy-ruler', wrap);
    ruler.style.cssText = 'position:relative;display:block;height:1px;margin:14px 0 12px;transition:none;';

    // ===== 选中与确认交互（无诏令按钮：再点同一张卡即生效）=====
    var selectedBtn = null;   // 当前选中的权能卡
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

    // 权能卡视觉全部内联化（不依赖注入样式表，杜绝样式未生效问题）
    var dmqcCardCss = function (selected) {
        var base = 'position:relative;display:block;flex:0 0 140px;box-sizing:border-box;width:140px;padding:14px 10px 12px;cursor:pointer;user-select:none;text-align:center;'
            + 'border:2px solid #b8943f;'
            + 'background:linear-gradient(180deg,#f2e6c8 0%,#e3d0a2 55%,#d0b987 100%);'
            + 'box-shadow:0 4px 12px rgba(0,0,0,.55),inset 0 0 0 1px rgba(255,250,230,.7),inset 0 0 14px rgba(120,85,30,.18);'
            + 'transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease,background .18s ease;';
        if (selected) {
            // 选中：亮金粗框 + 抬升放大 + 柔和金色辉光
            base += 'border:3px solid #ffc04d;'
                + 'background:linear-gradient(180deg,#faf0d8 0%,#ecdbb4 55%,#d9c292 100%);'
                + 'box-shadow:0 0 20px 5px rgba(255,200,90,.75),0 0 55px 18px rgba(255,180,70,.35),inset 0 0 0 1px rgba(255,250,230,.9);'
                + 'transform:translateY(-6px) scale(1.07);';
        }
        return base;
    };

    // 点击权能卡：
    //  - 第一次点击 → 选中（金色辉光边框）
    //  - 再次点击同一张 → 生效
    //  - 点击不同卡片 → 切换选中
    var dmqcFyOnCardClick = function (btn) {
        if (selectedBtn === btn) {
            dmqcFyConfirm(btn);       // 再点同一张：生效
        } else {
            if (selectedBtn) {
                selectedBtn.classList.remove('selected');
                selectedBtn.style.cssText = dmqcCardCss(false);
            }
            selectedBtn = btn;
            btn.classList.add('selected');
            btn.style.cssText = dmqcCardCss(true);
        }
    };

    // 选项：五道权能（封印字 + 名称 + 铭文 + 效果）——单行排列，不换行
    var opts = ui.create.div('dmqc-fy-opts', wrap);
    opts.style.cssText = 'position:relative;display:flex;flex-wrap:nowrap;justify-content:center;align-items:stretch;gap:12px;transition:none;';
    for (var i = 0; i < choices.length; i++) {
        var id = choices[i][0];
        var data = dmqcFuyuanOptionMap[id] || {
            seal: ('' + id).replace(/^opt/, '') || '权',
            name: id,
            motto: '',
            desc: choices[i][1],
            accent: '#d4af37'
        };
        var btn = ui.create.div('dmqc-fy-opt', opts);
        btn.style.cssText = dmqcCardCss(false);
        btn.style.setProperty('--acc', data.accent);
        btn.style.animationDelay = (130 + i * 70) + 'ms'; // 逐张浮现（内联设置，避免 calc 兼容问题）
        btn.innerHTML = '<div style="position:relative;display:block;width:50px;height:50px;line-height:50px;margin:0 auto 9px;border-radius:9px;text-align:center;font-family:xiaozhuan,KaiTi,serif;font-size:30px;color:#f7e3c4;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;background:linear-gradient(145deg,#c22b22,#8e1c14);border:2px solid #d9a24f;box-shadow:inset 0 0 9px rgba(0,0,0,.4),0 2px 5px rgba(0,0,0,.4);">' + data.seal + '</div>'
            + '<div style="position:relative;display:block;font-family:KaiTi,STKaiti,serif;font-size:20px;letter-spacing:2px;color:#2b1d08;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;">' + data.name + '</div>'
            + '<div style="position:relative;display:block;font-family:KaiTi,STKaiti,serif;font-size:12px;letter-spacing:1px;color:#6f5326;margin:3px 0 7px;white-space:nowrap;-webkit-font-smoothing:antialiased;">' + data.motto + '</div>'
            + '<div style="position:relative;display:block;font-family:KaiTi,STKaiti,serif;font-size:13px;line-height:1.6;color:#33230c;text-align:left;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;">' + data.desc + '</div>';
        btn.link = id;
        // 不给按钮挂 Button 原型、并阻止冒泡——否则引擎的 windowmousedown/touch 处理
        // 会把卡片当成自己的按钮自动选中并 autoConfirm 直接结算（导致“点卡立即生效”）
        btn.addEventListener(dmqcClickEvt, function (e) {
            if (e && e.stopPropagation) e.stopPropagation();
            var evt = _status.event;
            if (evt && evt.name == 'chooseButton' && evt.player && evt.player.isMine() && !_status.auto && !_status.video) {
                dmqcFyOnCardClick(this);
            } else {
                // 非本机/托管/录像等场景沿用引擎默认点击逻辑
                ui.click.button.call(this);
            }
        });
        dlg.buttons.push(btn);
    }

    // 页脚：称号（玉玺已按需求移除）
    var foot = ui.create.div('dmqc-fy-foot', wrap);
    foot.style.cssText = 'position:relative;display:flex;align-items:center;justify-content:center;gap:16px;margin-top:14px;transition:none;';
    foot.innerHTML = '<div style="position:relative;display:block;font-family:xiaozhuan,KaiTi,serif;font-size:15px;letter-spacing:4px;color:#a3926e;">高贵乡公 · 曹 髦<span style="font-family:yuanli,serif;font-size:10px;letter-spacing:1px;color:#6f6552;margin-left:8px;">v7.2</span></div>';

    return dlg;
}

export default {
    character: {
        sgz_caomao: {
            sex: "male",
            group: "wei",
            hp: 3,
            maxHp: 4,
            hujia: 1,
            skills: ["sgz_fuyuan", "sgz_qingtao","sgz_caomao_qianlong_ui"],
            img: "extension/大梦千秋/image/sgz_caomao.jpg",
            dieAudios: ["ext:大梦千秋/audio/sgz_caomao/die.mp3"],
            names: "曹|髦",
            groupInGuozhan: "wei",
            4: ["des:曹髦，字彦士，魏文帝曹丕之孙，东海王曹霖之子。年幼聪慧，好学有成，尝作《潜龙诗》以明志，时人异之。<br>正元元年，司马师废齐王芳，迎立曹髦为帝。时司马氏专权，政出私门，帝年方十四，而志气宏远。每朝会，帝端拱严惮，司马师、昭兄弟虽横，亦不敢正目视之。<br>帝深知权臣之势已成，强不可拔，乃隐忍蓄势，自号“潜龙”。常于宫中设醉乡，托酒酣之际纵论古今，暗察朝臣忠佞。又以诗赋结交中下层武官，密布心腹于禁军诸营，朝野谓之“醉里明台，不觉幽宫”，实暗蓄死士，以待天时。<br>甘露元年，司马师暴卒，司马昭继握大权，愈发跋扈，竟逼帝封其为晋公，加九锡。帝知图穷匕见，乃夜召侍中王沈、尚书王经、散骑常侍王业，泣血盟誓：“司马昭之心，路人所知也。朕不能坐受废辱，今日当与卿等自出讨之！”<br>是日，帝亲率宫中宿卫僮仆数百人，鼓噪而出。司马昭遣心腹贾充率兵拒之于南阙。帝仗剑登辇，亲冒矢石，大呼：“朕乃天子，逆贼安敢无礼！”士卒皆为帝威所慑，逡巡不敢前。太子舍人成济虽受贾充之命，然见帝怒目圆睁，龙威凛然，手中长戟竟不能举。<br>帝身先士卒，竟直入中军。时司马昭未料帝如此果决，仓皇失措，左右四散。帝亲手擒昭，历数其罪：“卿父司马懿为魏托孤之臣，然卿兄弟狼子野心，废立弑杀，视天子如无物。今日朕请卿赴黄泉，以谢先帝！”<br>遂斩司马昭于军前，枭首示众。贾充、成济等党羽悉数伏诛。帝旋即诏告天下，尽收兵权，清洗司马氏余党。然帝念及宣帝司马懿昔日之功，不忍夷其全族，止诛首恶，余者废为庶人。<br>自此，曹魏皇权重振。帝励精图治，改革弊政，贬黜贪佞，拔擢贤良。又废除九品中正制，广开寒门进身之路。朝野称颂，天下归心。<br>帝每忆昔日困渊之时，常叹曰：“伤哉龙受困，不能越深渊。待得惊雷起，腾云越井时。”后世史官评曰：高贵乡公以幼主之姿，处权臣之侧，隐忍十载，终能一蹴而诛国贼，拔风云而见天日，虽少康中兴、宣王复国，何以加焉！然观其用兵之际，亲冒锋镝，决死无畏，岂非天命在魏乎？"]
        },
    },
    characterName: 'sgz_caomao',
    characterTranslate: {
        sgz_caomao: "梦曹髦",
    },
    skills: {
        // === 主技能：缚渊 ===
        sgz_fuyuan: {
            audio: "ext:大梦千秋/audio/sgz_caomao:16",
            group:"sgz_fuyuan_xiaoguo",
            persevereSkill: true,
            subSkill:{
                xiaoguo:{
                    persevereSkill: true,
                    enable: "phaseUse",
                    usable: 2,
                    trigger: { 
                        global: "roundStart",
                        player: "damageEnd" 
                    },
                    mod: {
                        ignoredHandcard: function(card, player) {
                            // 只要这张牌带有我们添加的标签，就忽略手牌上限
                            if (card.hasGaintag('sgz_caomao_shaTag')) return true;
                        },
                        cardDiscardable(card, player, name) {
                            if (name == 'phaseDiscard' && card.hasGaintag('sgz_caomao_shaTag')) return false;
                        },
                        cardEnabled2: function(card, player) {
                            // 条件判断：血上限>1 且 本回合受伤触发fuyuan的次数还没用完(<2)
                            var canSuffer = (player.maxHp > 1 && (player.getStat().skill.sgz_fuyuan_xiaoguo || 0) < 2);
                            
                            // 逻辑 A：如果能卖血，直接禁止出【闪】，诱导 AI 必定吃杀
                            if (!player.isMine() && card.name == 'shan' && canSuffer) return false;

                            // 逻辑 B：原有的响应时保护潜龙杀逻辑
                            if (!player.isMine() && (_status.event.name == 'chooseToRespond' || _status.event.type == 'response')) {
                                if (card.gaintag && card.gaintag.contains('sgz_caomao_shaTag')) {
                                    var hasNormalSha = player.hasCard(c => c.name == 'sha' && (!c.gaintag || !c.gaintag.contains('sgz_caomao_shaTag')), 'h');
                                    if (hasNormalSha) return false;
                                }
                            }
                        },
                        aiUseful: function(player, card, num) {
                            // 安全检测标签
                            var isQianlong = (card.gaintag && card.gaintag.contains('sgz_caomao_shaTag'));
                            // 兼容转化牌内部的实体牌检测
                            if (!isQianlong && card.cards) isQianlong = card.cards.some(c => c.gaintag && c.gaintag.contains('sgz_caomao_shaTag'));

                            if (isQianlong) {
                                // === 核心逻辑修复：响应环节降权 ===
                                // 如果当前处于“打出/响应”事件（如被杀、决斗、南蛮、倾讨死斗）
                                // 我们给它一个极低的保底分数（0.01），确保它排在所有普通【杀】（约5分）的后面
                                if (_status.event.name == 'chooseToRespond' || _status.event.openedBySkill) {
                                    return 0.01;
                                }
                                // 出牌阶段主动使用时，稍微降低优先级
                                return num - 2; 
                            }
                        },
                        aiValue: function(player, card, num) {
                            if (card.hasGaintag('sgz_caomao_shaTag')) return num+100;
                        },
                        effect: function(card, player, target) {
                            if (target.hasSkill('sgz_fuyuan_xiaoguo') && get.tag(card, 'damage')) {
                                // 如果司马昭(曹髦)还有发动机会，且体力上限安全，认为受伤是 5 分收益
                                if (target.maxHp > 1 && target.getStat().skill.sgz_fuyuan_xiaoguo < 2) {
                                    return [1, 4]; // 1系数(不痛) + 4分额外收益
                                }
                            }
                        }
                    },
                    ai: {
                        maixie_defend: true,
                        expose: 1,
                        threaten: 12,
                        maixue:true,
                        order: function(item, player) {
                            // 只要体力上限 > 1 且有标记可以叠，优先级设定为最高 (20)
                            // 确保在出任何牌（如无中生有15）之前先发动缚渊
                            if (player.maxHp > 1) return 200;
                            return -10;
                        },
                        result: {
                            player: function(player) {
                                // 如果能触发被动的自残（受伤触发），告诉AI这是好事
                                if (_status.event.name == 'damage' && player.maxHp > 1) return 50;
                                return 1;
                                if (player.maxHp == 1) return -1;
                            }
                        },
                        effect: {
                            target:function(card, player, target) {
                                if (get.tag(card, 'damage') && target.maxHp > 1 && target.getStat().skill.sgz_fuyuan_xiaoguo < 2) 
                                    return [1, 3];
                            }
                        }
                    },
                    hideIntro: true,
                    prompt: "【缚渊】：是否发动“缚渊”选择一名其他角色施加权能？",
                    filter: function(event, player) {
                        if(player.maxHp <= 1) return false;
                        return game.hasPlayer(current => current != player);
                    },
                    async content(event, trigger, player) {
                        // 1. 减少上限获得护甲
                        player.loseMaxHp(1);
                        player.changeHujia(1);
                        if(!player.isAlive())return;
                        
                        // 2. 获得“潜龙”【杀】
                        
                        var card = game.createCard('sha');
                        player.gain(card, 'gain2').gaintag = ['sgz_caomao_shaTag'];// 将杀置入手牌
                        game.playAudio(`../extension/大梦千秋/audio/sgz_caomao/sgz_fuyuan${[1,2,3,4,5,6].randomGet()}.mp3`);
                        
                         // 3. 选择目标
                        const res_target = await player.chooseTarget('缚渊：请选择一名其他角色', (card, player, target) => {
                            return target != player;
                        }, true).set('ai', function(target) {
                                var player = _status.event.player;
                                if (get.attitude(player, target) >= 0) return 0;

                                // --- 1. 统一权力值计算 (MaxHP*10 + 威胁度) ---
                                var getPower = function(t) {
                                    return (t.maxHp * 10) + (get.threaten(t));
                                };

                                // --- 2. 排序寻找座次 ---
                                var enemies = game.filterPlayer(p => get.attitude(player, p) < 0).sort((a, b) => getPower(b) - getPower(a));
                                
                                // --- 3. 维度：状态积累 ---
                                var count = 0;
                                if (target.getCards('j', c => ['lebu', 'bingliang', 'shandian'].contains(c.name)).length >= 3) count++;
                                if (target.gaintag && target.getCards('h').some(c => c.hasGaintag('sgz_fuyuan_tag'))) count++;
                                if (target.hasSkill('sgz_fuyuan_gaofeng')) count++;
                                if (target.hasSkill('sgz_fuyuan_juechi')) count++;
                                if (target.hasSkill('sgz_fuyuan_bingzun')) count++;

                                // --- 4. 核心：分流逻辑 ---
                                
                                // A. 斩杀优先：如果有人已经 4 层了，这轮 fuyuan 必选他触发免费处决
                                if (count >= 4) {
                                    var myShas = player.countCards('h', 'sha');
                                    var hisShas = target.countCards('h', 'sha');
                                    if (myShas > hisShas) return 10000 + count * 100;
                                }

                                // B. 让路逻辑：如果是全场最强(第一名)，给极低分，除非没有其他敌人
                                if (enemies.length > 1 && target == enemies[0]) {
                                    return 1; // 给 1 分保底，让 AI 尽量别选他
                                }

                                // C. 锁定逻辑：如果是第二强，给极高分
                                if (enemies.length > 1 && target == enemies[1]) {
                                    return 8000 + getPower(target);
                                }

                                // D. 默认情况
                                return 100 + getPower(target) + (count * 50);
                            }).forResult();
                        if (!res_target.bool || !res_target.targets.length) return;
                        const target = res_target.targets[0];

                        // 4. 检查选项可用性
                        const choices = [];
                        const hasJ = target.getCards('j', c => ['lebu', 'bingliang', 'shandian'].contains(c.name));
                        
                        if ( !target.isDisabled(5) || (hasJ.length < 3 && !target.isDisabled('judge'))) {
                            choices.push(["opt1", "【放逐】：废除所有装备栏并在判定区补齐【乐不思蜀】、【兵粮寸断】与【闪电】。"]);
                        }
                        const unmarkedCount = target.countCards('h', c => !c.hasGaintag('sgz_fuyuan_tag'));
                        if (unmarkedCount > 0) {
                            choices.push(["opt2", "【潜谋】；标记当前所有手牌为“潜谋”，明置且不可被使用、打出和弃置。"]);
                        }
                        if (!target.hasSkill('sgz_fuyuan_gaofeng')) choices.push(["opt3", "【诰封】：赋予“诰封”标记，获得牌后须弃置一张牌。"]);
                        if (!target.hasSkill('sgz_fuyuan_juechi')) choices.push(["opt4", "【绝敕】：赋予“绝敕”标记，回复体力时失去一点体力。"]);
                        if (!target.hasSkill('sgz_fuyuan_bingzun')) choices.push(["opt5", "【秉尊】：赋予“秉尊”标记，造成的伤害-1，且造成伤害时你摸一张牌。"]);

                        // 5. 终极对决逻辑：若都不可选
                        if (choices.length === 0) {
                            player.$skill('倾讨', 'fire', 'red', 'avatar');
                            game.playAudio(`../extension/大梦千秋/audio/sgz_caomao/sgz_qingtao${[1,2,3,4,5].randomGet()}.mp3`);
                            player.node.avatar.setBackgroundImage('extension/大梦千秋/image/sgz_caomao2.jpg');
                            // A. 开启腾渊形态
                            player.addTempSkill('sgz_tengyuan', 'roundStart');
                            player.useSkill('sgz_caomao_qianlong_ui')
                            player.update();
                            game.log(player, '已彻底封死', target, '，移除所有枷锁，进行生死对决！');

                            // B. 移除负面效果
                            target.removeSkill(['sgz_fuyuan_mark', 'sgz_fuyuan_gaofeng', 'sgz_fuyuan_juechi', 'sgz_fuyuan_bingzun']);//移除负面技能
                            const f_cards = target.getCards('h', c => c.hasGaintag('sgz_fuyuan_tag'));
                            if (f_cards.length) {
                                target.removeGaintag('sgz_fuyuan_tag', f_cards);
                            }
                            delete target.storage.sgz_fuyuan_mark;//移除“潜谋”锁定的手牌
                            
                            for (let i = 1; i <= 5; i++) {for(let j = 1; j <= 7;j++)target.enableEquip(i);}//恢复装备区
                            const js = target.getCards('j');
                            if (js.length) target.discard(js);//移除判定区牌
                            
                            // C. 轮流打杀逻辑（对方先）
                            let currentAttacker = target;
                            let winner, loser;

                            while (true) {
                                // 提示信息
                                let promptStr = `<span style='color:#FF4500;'>倾讨·生死</span>：请打出一张【杀】，否则将面临<span style='color:#FF4500;'>处决</span>`;
                                let res = await currentAttacker.chooseToRespond({ name: 'sha' }).set('prompt', promptStr).forResult();

                                if (!res.bool) {
                                    loser = currentAttacker;
                                    winner = (loser === player) ? target : player;
                                    break;
                                }
                                // 交换出牌人
                                currentAttacker = (currentAttacker === player) ? target : player;
                            }

                            game.log(winner, '获得了最终的胜利！');

                            // D. 赢家夺取一切
                            const l_hp = loser.hp;
                            const l_maxHp = Math.min(loser.maxHp , 5);
                            const l_cards = loser.getCards('hej');

                            winner.maxHp += l_maxHp;
                            winner.hp += l_hp;
                            winner.update();
                            if (l_cards.length) {
                                await winner.gain(l_cards, loser, 'gain2');
                            }
                            if(winner == player){
                                game.playAudio(`../extension/大梦千秋/audio/sgz_caomao/sgz_qingtao${[1,2].randomGet()}.mp3`);
                            }

                            // E. 输家处决
                            loser.die(winner);

                            // F. 获胜奖励
                            winner.insertPhase();
                            winner.addSkill('sgz_qingtao_mark');
                            winner.addMark('sgz_qingtao_mark', 1);
                            player.restoreSkill('sgz_qingtao');
                            game.log(player, '的限定技【倾讨】已重置');
                            return;
                        }

                        // 6. 弹出选项框（本地人类玩家使用专属“帝诏·权能”主题选择框，其余场景回退引擎默认框）
                        const fuyuanAi = function(button) {
                            const player = get.player();
                            const parent = _status.event.getParent();
                            const trig = parent._trigger; // 获取触发源事件
                            
                            // --- 安全判定：只有在受到伤害触发时，才有 isCounter 和 isSource ---
                            let isCounter = false;
                            let isSource = false;
                            
                            if (trig && trig.name == 'damage') {
                                isCounter = (_status.currentPhase != player); // 是否在回合外
                                isSource = (target == trig.source);          // 目标是否为伤害来源
                            }

                            const optId = button.link;

                            // --- 核心：反击状态下，选项5（秉尊）拥有统治级权重 ---
                            if (isCounter && isSource && optId === "opt5") {
                                return 2000; // 极高分，确保反击时必选
                            }

                            // --- 使用明确的权重梯度，解决“按顺序选”的问题 ---
                            // 优先级排序：绝敕(4) > 诰封(3) > 秉尊(5) > 潜谋(2) > 放逐(1)
                            
                            if (optId === "opt4") { 
                                // 绝敕（禁疗）：永久且强力。对神赵云、华佗或残血敌人分值极大
                                let s = 150;
                                game.log('4');
                                if (target.hasSkillTag('recover') || target.hasSkillTag('maixue') || target.hp <= 2) s += 100;
                                if (target.name.indexOf('zhaoyun') != -1) s += 300;
                                return s;
                            } 
                            
                            if (optId === "opt3") {
                                // 诰封（得牌弃一）：永久且克制过牌。对郭嘉、月英等有效
                                let s = 130;
                                if (target.hasSkillTag('draw') || target.hasSkillTag('maixue')) s += 100;
                                return s;
                            } 
                            
                            if (optId === "opt5") {
                                // 秉尊（减伤/偷牌）：永久且克制高输出
                                let s = 110;
                                if (target.hasSkillTag('damageSource') || target.countCards('h', 'sha') >= 2) s += 100;
                                return s;
                            } 
                            
                            if (optId === "opt2") {
                                // 潜谋（封手牌）：非永久。手牌越多分越高
                                return 30 + (target.countCards('h') * 15);
                            } 
                            
                            if (optId === "opt1") {
                                // 放逐（封装备/判定）：非永久。装备越多分越高
                                let s = 40;
                                s += (target.countCards('e') * 30);
                                if (target.hasSkillTag('rejudge')) s -= 200; // 绝对不要给张角司马懿送判定牌
                                return s;
                            }
                            
                            return 1; // 兜底保底分
                        };
                        let res_choice;
                        if (player.isMine() && !game.online && !_status.auto && !_status.video) {
                            // 专属“帝诏·权能”主题选择框
                            // noconfirm=true：引擎 game.Check.confirm 直接跳过，原生“确定/取消”栏永不创建
                            var fuyuanDlg = null;
                            try {
                                fuyuanDlg = dmqcBuildFuyuanDialog(player, target, choices);
                            } catch (e) {
                                // 构造失败不静默：写入日志便于定位（回退默认框保证技能可用）
                                console.error("[大梦千秋] 帝诏·权能选择框构造失败，已回退默认框：", e);
                                game.log(player, '的【缚渊】主题选择框构造失败，已回退默认框（详见控制台）');
                            }
                            if (fuyuanDlg) {
                                res_choice = await player.chooseButton(
                                    fuyuanDlg
                                ).set("ai", fuyuanAi).set("forced", true).set("noconfirm", true).forResult();
                            } else {
                                res_choice = await player.chooseButton([
                                    "缚渊：请对 " + get.translation(target) + " 执行一项权能",
                                    [choices, "textbutton"]
                                ]).set("ai", fuyuanAi).set("forced", true).forResult();
                            }
                        } else {
                            // 引擎默认选择框（AI / 联机 / 托管 / 录像回放）
                            res_choice = await player.chooseButton([
                                "缚渊：请对 " + get.translation(target) + " 执行一项权能",
                                [choices, "textbutton"]
                            ]).set("ai", fuyuanAi).set("forced", true).forResult();
                        }

                        if (!res_choice || !res_choice.bool) return;
                        const choice = res_choice.links[0];

                        // 7. 执行常规效果
                        if (choice == 'opt1') {
                            game.playAudio(`../extension/大梦千秋/audio/sgz_caomao/sgz_fuyuan${[7,8].randomGet()}.mp3`);
                            for (let i = 1; i <= 5; i++) {for(let j = 1; j <= 7;j++)target.disableEquip(i);}
                            ['lebu', 'bingliang', 'shandian'].forEach(name => {
                                if (!target.hasJudge(name)) target.addJudge(game.createCard(name));
                            });
                        }
                        else if (choice == 'opt2') {
                            game.playAudio(`../extension/大梦千秋/audio/sgz_caomao/sgz_fuyuan${[9,10].randomGet()}.mp3`);
                            const cards = target.getCards('h');
                            target.addGaintag(cards, 'sgz_fuyuan_tag');
                            if (!target.storage.sgz_fuyuan_mark) target.storage.sgz_fuyuan_mark = [];
                            target.storage.sgz_fuyuan_mark.addArray(cards);
                            target.addSkill('sgz_fuyuan_mark');
                            target.update();
                        } 
                        else if (choice == 'opt3') {
                            game.playAudio(`../extension/大梦千秋/audio/sgz_caomao/sgz_fuyuan${[11,12].randomGet()}.mp3`);
                            target.addSkill('sgz_fuyuan_gaofeng');}
                        else if (choice == 'opt4') {
                            game.playAudio(`../extension/大梦千秋/audio/sgz_caomao/sgz_fuyuan${[13,14].randomGet()}.mp3`);
                            target.addSkill('sgz_fuyuan_juechi');}
                        else if (choice == 'opt5') {
                            game.playAudio(`../extension/大梦千秋/audio/sgz_caomao/sgz_fuyuan${[15,16].randomGet()}.mp3`);
                            target.addSkill('sgz_fuyuan_bingzun');
                        }
                    }
                }
            }
        },
            // --- 附属效果技能 ---
            // 潜谋
            sgz_fuyuan_mark: {
                charlotte: true,
                mark: true,
                marktext: "潜谋",
                intro: { name: "被“缚渊”囚禁的手牌", content: "cards" },
                mod: {
                    cardVisible: (card) => card.hasGaintag('sgz_fuyuan_tag') ? true : undefined,
                    cardEnabled2: (card) => card.hasGaintag('sgz_fuyuan_tag') ? false : undefined,
                    cardRespondable: (card) => card.hasGaintag('sgz_fuyuan_tag') ? false : undefined,
                    cardSavable: (card) => card.hasGaintag('sgz_fuyuan_tag') ? false : undefined,
                    cardDiscardable: (card) => card.hasGaintag('sgz_fuyuan_tag') ? false : undefined,
                },
                trigger: { player: "loseAfter" },
                forced: true, silent: true,
                filter: (event, player) => event.cards && event.cards.some(c => player.storage.sgz_fuyuan_mark && player.storage.sgz_fuyuan_mark.contains(c)),
                content: function() {
                    player.storage.sgz_fuyuan_mark.removeArray(trigger.cards.filter(c => player.storage.sgz_fuyuan_mark.contains(c)));
                    if (!player.storage.sgz_fuyuan_mark.length) player.removeSkill('sgz_fuyuan_mark');
                    player.update();
                }
            },
            // 诰封
            sgz_fuyuan_gaofeng: {
                charlotte: true,
                usable: 20,       
                mark: true, marktext: "诰封", forced: true,
                trigger: { player: "gainAfter" },
                filter: (event, player) => player.countCards('h') > 0,
                content: () => { player.chooseToDiscard('h', 1, true).set('prompt', '【诰封】：获得牌后须弃置一张'); },
                intro: { name: "诰封", content: "获得牌后，须弃置一张手牌。" }
            },
            // 绝敕
            sgz_fuyuan_juechi: {
                charlotte: true,
                mark: true, marktext: "绝敕", forced: true, priority: 10,
                trigger: { player: "recoverEnd" },
                content: () => {player.loseHp(1); },
                intro: { name: "绝敕", content: "回复体力时失去1点体力。" }
            },
            //秉尊
            sgz_fuyuan_bingzun: {
                charlotte: true,
                mark: true, marktext: "秉尊", forced: true,
                trigger: { source: "damageBegin1" },
                filter: (event, player) => event.num > 0,
                content: function() {
                    trigger.num--;
                    const caomao = game.findPlayer(p => p.hasSkill('sgz_fuyuan'));
                    if (caomao) caomao.draw();
                },
                priority:1,
                intro: { name: "秉尊", content: "造成伤害-1；造成伤害时，曹髦摸一张牌。" }
            },
        // === 限定技：倾讨 ===
        sgz_qingtao: {
            audio: "ext:大梦千秋/audio/sgz_caomao:5",
            persevereSkill: true,
            enable: "phaseUse",
            limited: true,
            mark: false,
            derivation:"sgz_tengyuan",
            skillAnimation: true,
            animationColor: "fire",
            
            intro: { content: 'limited' },
            // 修改 sgz_qingtao 的 ai 块
            ai: { 
                expose: 1,
                order: 19, 
                threaten:3,
                result: {
                    player: 100,
                    target: function(player, target) {
                        if (get.attitude(player, target) > 0) return -2;

                        // --- 1. 统一权力值计算 ---
                        var power = (target.maxHp * 10) + (get.threaten(target));

                        var enemiesCount = game.countPlayer(p => p != player && get.attitude(player, p) <= 0);

                        // --- 2. 状态避让：如果对方有任何缚渊状态，大幅降低倾讨欲望 ---
                        // 理由：有状态的说明正在被 fuyuan 叠层，留着白嫖更划算
                        var fuyuanCount = 0;
                        if (target.hasSkill('sgz_fuyuan_gaofeng')) fuyuanCount++;
                        if (target.hasSkill('sgz_fuyuan_juechi')) fuyuanCount++;
                        if (target.hasSkill('sgz_fuyuan_bingzun')) fuyuanCount++;
                        if (target.getCards('j').length > 0) fuyuanCount++;
                        
                        // 每一个状态扣掉 500 分，确保有状态的人评分极低
                        var statusPenalty = fuyuanCount * 500;

                        // --- 3. 排序确认：是否是第一强 ---
                        var enemies = game.filterPlayer(p => get.attitude(player, p) <= 0).sort((a, b) => {
                            return ((b.maxHp * 10) + get.threaten(b)) - ((a.maxHp * 10) + get.threaten(a));
                        });

                        // --- 4. 斩杀安全评估 ---
                        var myShas = player.countCards('h', 'sha');
                        var hisShas = target.countCards('h', 'sha');
                        if (hisShas > myShas) return 0; 

                        if(enemiesCount == 1) return -999;

                        // --- 5. 最终评分 ---
                        var finalScore = power - statusPenalty;
                        
                        // 如果是第一强敌人，额外加成
                        if (target == enemies[0]) finalScore += 1000;

                        return -finalScore; // result.target 返回负数表示打击
                    }
                }
            },
            filter: function(event, player) {
                return !player.storage.sgz_qingtao;
            },
            filterTarget: function(card, player, target) {
                player.node.avatar.setBackgroundImage('extension/大梦千秋/image/sgz_caomao2.jpg');
                return player != target;
            },
            async content(event, trigger, player) {
                player.awakenSkill('sgz_qingtao');
                var target = event.target;
                // A. 开启腾渊形态
                player.addTempSkill('sgz_tengyuan', 'roundStart');
                player.useSkill('sgz_caomao_qianlong_ui')
                player.update();
                game.log(player, '对', target, '发动了【倾讨】，进行最终的死斗！');

                // B. 移除该目标身上所有来自“缚渊”的枷锁（无论是否由缚渊触发）
                target.removeSkill(['sgz_fuyuan_mark', 'sgz_fuyuan_gaofeng', 'sgz_fuyuan_juechi', 'sgz_fuyuan_bingzun']);
                const f_cards = target.getCards('h', c => c.hasGaintag('sgz_fuyuan_tag'));
                if (f_cards.length) {
                    target.removeGaintag('sgz_fuyuan_tag', f_cards);
                }
                delete target.storage.sgz_fuyuan_mark;
                for (let i = 1; i <= 5; i++) {target.enableEquip(i);target.enableEquip(i);target.enableEquip(i);}
                const js = target.getCards('j');
                if (js.length) target.discard(js);
                
                // C. 轮流打杀逻辑（对方先）
                let currentAttacker = target;
                let winner, loser;

                while (true) {
                    // 提示信息
                    let promptStr = `<span style='color:#FF4500;'>倾讨·生死</span>：请打出一张【杀】，否则将面临<span style='color:#FF4500;'>处决</span>`;
                    let res = await currentAttacker.chooseToRespond({ name: 'sha' }).set('prompt', promptStr).forResult();

                    if (!res.bool) {
                        loser = currentAttacker;
                        winner = (loser === player) ? target : player;
                        break;
                    }
                    // 交换出牌人
                    currentAttacker = (currentAttacker === player) ? target : player;
                }

                game.log(winner, '获得了最终的胜利！');

                // D. 赢家夺取一切 (保持原有逻辑)
                const l_hp = loser.hp;
                const l_maxHp = Math.min(loser.maxHp , 5);
                const l_cards = loser.getCards('hej');

                winner.maxHp += l_maxHp;
                winner.hp += l_hp;
                winner.update();
                if (l_cards.length) {
                    await winner.gain(l_cards, loser, 'gain2');
                }
                if(winner == player){
                    game.playAudio(`../extension/大梦千秋/audio/sgz_caomao/sgz_qingtao${[1,2].randomGet()}.mp3`);
                }

                // E. 输家处决
                loser.die(winner);

                // F. 额外回合奖励
                winner.insertPhase();
                winner.addSkill('sgz_qingtao_mark');
                winner.addMark('sgz_qingtao_mark', 1);
            },
        },
        sgz_qingtao_mark: {
            charlotte: true, // 彻底隐藏技能，仅显示标记
            mark: true,
            marktext: "回合",
            intro: {
                name: "额外回合",
                content: "因倾讨获得#个额外回合", // 自动显示标记数量
            },
            // 逻辑：每当任何回合（包括额外回合）开始时，消耗一个标记
            trigger: { player: "phaseBeginStart" },
            forced: true,
            silent: true,
            content: function() {
                player.removeMark('sgz_qingtao_mark', 1);
                // 如果标记扣完了，自动移除逻辑技能，保持面板干净
                if (player.countMark('sgz_qingtao_mark') <= 0) {
                    player.removeSkill('sgz_qingtao_mark');
                }
            }
        },
        // === 腾渊 ===
        sgz_tengyuan: {
            audio: "ext:大梦千秋/audio/sgz_caomao:6",
            persevereSkill: true,
            forced: true,
            firstDo: true,
            mark: true,
            //marktext: "腾渊",
            //intro: { name: "腾渊", content: "使用“潜龙”杀无距离与次数限制。" },
            trigger: {
                player: "useCard1",
            },
            ai:{
                maixie_hp: true, // 优先回血
                threaten:1.6,
            },
            onremove: function(player) {
                player.node.avatar.setBackgroundImage('extension/大梦千秋/image/sgz_caomao.jpg');
                player.useSkill('sgz_caomao_qianlong_ui');
            },
            content: function() {
                trigger.addCount = false;
                var card = trigger.card;
                if (card.name == 'sha') {
                    if (player.hp == player.maxHp) {
                        player.gainMaxHp(1);
                    } else {
                        player.recover(1);
                    }
                } else {
                    player.draw(1);
                }
            },
            mod: {
                cardUsable: function(card, player, num) {
                    var isQianlong = (card.gaintag && card.gaintag.contains('sgz_caomao_shaTag'));
                    if (!isQianlong && card.cards) {
                        isQianlong = card.cards.some(c => c.gaintag && c.gaintag.contains('sgz_caomao_shaTag'));
                    }
                    
                    if (isQianlong) return Infinity;
                },
                targetInRange: function(card, player) {
                    var isQianlong = (card.gaintag && card.gaintag.contains('sgz_caomao_shaTag'));
                    if (!isQianlong && card.cards) {
                        isQianlong = card.cards.some(c => c.gaintag && c.gaintag.contains('sgz_caomao_shaTag'));
                    }
                    
                    if (isQianlong) return true;
                }
            }
        },
        // ==========================================
        //          潜龙卡牌特效 UI 逻辑
        // ==========================================
        sgz_caomao_qianlong_ui: {
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
        },
    },
    skillTranslate: {
        sgz_fuyuan: "缚渊",
        sgz_fuyuan_info: "每轮开始时/你受到伤害时（每回合限两次）/出牌阶段限两次，若你的体力上限大于1，你可以转化1点体力上限为护甲并获得一张“潜龙”【杀】（无花色点数且不计入手牌上限），然后选择一名其他角色，若有选项能对其造成效果，你选择一个可选项令其执行：<br>①放逐：废除所有装备栏并补齐判定区的【乐不思蜀】、【兵粮寸断】和【闪电】；<br>②潜谋：将当前所有手牌标记为“潜谋”，这些牌明置且不可被使用、打出或弃置；<br>③诰封：获得牌时弃置一张牌；<br>④绝敕：回复体力时失去一点体力；<br>⑤秉尊：造成伤害时，伤害-1并且梦曹髦摸一张牌。<br>若其已处于上述所有状态，你视为对其发动【倾讨】并且结算后“倾讨”视为未发动过。",
        "sgz_caomao_shaTag": "潜龙",
        "sgz_fuyuan_tag": "潜谋",
        "sgz_fuyuan_mark": "潜谋",
        sgz_fuyuan_mark_info:"被“潜谋”标记的手牌明置，且不可使用、打出或弃置",
        "sgz_fuyuan_gaofeng": "诰封",
        sgz_fuyuan_gaofeng_info:"获得牌时，弃置一张牌",
        "sgz_fuyuan_juechi": "绝敕",
        sgz_fuyuan_juechi_info:"回复体力时，失去一点体力",
        "sgz_fuyuan_bingzun": "秉尊",
        sgz_fuyuan_bingzun_info:"造成伤害时，伤害-1并且梦曹髦摸一张牌",
        sgz_qingtao: "倾讨",
        sgz_qingtao_info: "限定技，你本轮获得技能【腾渊】，你可以选择一名其他角色，移除其所有“缚渊”的负面效果、移除其判定区所有牌并恢复所有装备栏，然后你与其执行<span style='color:#FF4500;'>致死</span>的【决斗】效果，胜者<span style='color:#FFFF00;'>夺取</span>败者的体力状态（至多夺取5点体力上限）与所有牌并获得一个额外的回合。",
        sgz_tengyuan: "腾渊",
        sgz_tengyuan_info:"锁定技，①你使用“潜龙”【杀】无次数距离限制；②当你使用【杀】时，若你未/已受伤则增加一点体力上限/回复一点体力；当你使用其他牌时摸一张牌。",
        sgz_caomao_qianlong_ui:"特效"
    },
    characterTaici:{
        "sgz_fuyuan":{order:1,content:"藏牙伏爪甲，嗟我亦同然。/伤哉龙受困，不能越深渊。/气幽但求醉，醒后寻复来。/醉里坐明台，不觉在幽宫。/清酒入肺腑，忿怨暗然生。/心忿无所表，下笔即成篇。/昔卿有功于国，今以放逐代死！/汝等负国求私，岂可再涉政事！/愿遵前人教诲，为一国明帝贤君。/朕虽不德，昧于大道，思与宇内共臻兹路。/为政清且正，黜陟幽与明。/暗恤忠君之士，以待破局之机。/假以时日，必讨司马一族！/若安司马于外，或则皇权可收！/卿当竭命纳忠，何为此逾矩之举！/权臣震主，竟视天子于无物！"},
        "sgz_qingtao":{order:2,content:"少康诛寒浞以中兴，朕夷司马，未尝不可！/帝星终临潜龙跃，拔尽风云始见天！/朕行之决矣，正使死又何惧！/朕宁拼一死，逆贼安敢一战！/朕安可坐受废辱，今日当与卿自出讨之！"},
        "sgz_tengyuan":{oeder:3,content:"虽陷方寸境，一跃天地宽！/待得惊雷起，腾云越井时!/身困犹威烈，鳅鳝何敢前!/䓇䓇东伐叛，赫赫振武威！/陵台决死志，拔剑诛乱臣！/击鼓抒吾忿，登辇出云龙！"},
        "die":{content:"司马昭！朕宁舍身一死，以坐汝弑君之名！"}
    }
}