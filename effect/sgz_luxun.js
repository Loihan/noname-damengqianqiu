// ===== 陆逊 · 【业火残响】极高品质 UI（纯表现层，无游戏规则） =====
// 由 character/sgz_luxun.js 通过 import { luxunUI } 挂载回 skills 中

import { dmqcMountParticles } from "./dmqc_particles.js";

// 业火条刷新的核心逻辑：始终表示「已损失体力 / 体力上限」；仅韬晦（_taohui_active）期间切换为满焰爆发态。
// 注意：技能 content 会被引擎 StepCompiler eval，无法引用模块级函数；
//       故把刷新方法 `player.dmqcRefreshLunxBar`（自包含、仅用 this/player）挂到 player 上，
//       content 与韬晦结束都经 player 魔法变量调用该属性方法。

export const luxunUI = {
    charlotte: true,
    trigger: { 
        player: ["changeHp", "gainMaxHp", "loseMaxHp", "damage", "recover", "loseHp", "dying", "enterGame", "phaseUseEnd"],
        global: ["gameStart", "roundStart"] 
    },
    forced: true, silent: true, priority: -11,
    init: function(player) {
        // 1. 注入 SVG 滤镜（这是实现火焰不规则边缘和扭动的核心，不占资源）
        if (!document.getElementById('luxun_fire_filter')) {
            var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.id = 'luxun_fire_filter';
            svg.style.display = 'none';
            svg.innerHTML = `
                <defs>
                    <filter id="flame-warp">
                        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" seed="1">
                            <animate attributeName="seed" from="1" to="100" dur="10s" repeatCount="indefinite" />
                        </feTurbulence>
                        <feDisplacementMap in="SourceGraphic" scale="15" />
                    </filter>
                    <filter id="flame-blur">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>`;
            document.body.appendChild(svg);
        }

        if (!document.getElementById('luxun_high_end_fire_style')) {
            var style = document.createElement('style');
            style.id = 'luxun_high_end_fire_style';
            style.innerHTML = `
                /* 容器：放在右侧 3px 缝隙处 */
                .luxun-fire-art-wrap {
                    position: absolute; left: 100%; bottom: 0%;
                    margin-left: 5px; width: 10px; height:100%;
                    z-index: 60; pointer-events: none;
                    display: flex; align-items: flex-end;
                }

                /* 业火底座：乌红色的不规则边框 */
                .luxun-fire-frame {
                    position: relative; width: 100%; height: 100%;
                    background: rgba(20, 5, 5, 0.6);
                    border: 1px solid #3d0000;
                    filter: url(#flame-warp); /* 应用扭动滤镜 */
                    box-shadow: inset 0 0 10px #000, 0 0 5px #4a0404;
                }

                /* 填充层：深沉的血色渐变 */
                .luxun-fire-fill {
                    width: 100%; height: 0%;
                    position: absolute; bottom: 0; left: 0;
                    background: linear-gradient(to top, 
                        #2b0000 0%, 
                        #4a0404 20%, 
                        #8b0000 50%, 
                        #b22222 80%, 
                        #ff4500 100%);
                    box-shadow: 0 0 15px #8b0000, 0 -5px 15px #ff4500;
                    transition: height 1.8s cubic-bezier(0.2, 0, 0.2, 1);
                    mix-blend-mode: screen; /* 使颜色具有通透的燃烧感 */
                }

                /* 火焰内部的灰烬升腾感 */
                .luxun-fire-fill::before {
                    content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    background: repeating-linear-gradient(0deg, 
                        transparent, 
                        rgba(255, 69, 0, 0.2) 20px, 
                        transparent 40px);
                    animation: ash-rise 4s infinite linear;
                }

                /* --- 环绕特效：周围的余烬与热浪 --- */
                .luxun-ember-system {
                    position: absolute; width: 200%; height: 120%;
                    left: -50%; bottom: -10%; z-index: -1;
                }
                
                .ember {
                    position: absolute; background: #ffaa00;
                    border-radius: 50%; opacity: 0;
                    filter: blur(1px);
                    animation: ember-fly infinite ease-out;
                }

                @keyframes ash-rise {
                    from { background-position: 0 0; }
                    to { background-position: 0 -120px; }
                }

                @keyframes ember-fly {
                    0% { transform: translate(0, 0) scale(1); opacity: 0; }
                    20% { opacity: 0.8; }
                    100% { transform: translate(calc(Math.random() * 40px - 20px), -100px) scale(0); opacity: 0; }
                }

                /* 状态修正：0%时完全隐藏 */
                .luxun-fire-fill[style*="height: 0%"] {
                    opacity: 0;
                }
            `;
            document.head.appendChild(style);
        }

        if (!player.luxunUI) {
            var wrap = document.createElement('div');
            wrap.className = 'luxun-fire-art-wrap';
            
            var frame = document.createElement('div');
            frame.className = 'luxun-fire-frame';
            
            var fill = document.createElement('div');
            fill.className = 'luxun-fire-fill';
            
            var embers = document.createElement('div');
            embers.className = 'luxun-ember-system';
            
            // 生成 8 颗随机环绕火星
            for(var i=0; i<8; i++) {
                var e = document.createElement('div');
                e.className = 'ember';
                e.style.width = e.style.height = (Math.random()*3 + 1) + 'px';
                e.style.left = (Math.random()*100) + '%';
                e.style.bottom = (Math.random()*20) + '%';
                e.style.animationDuration = (1.5 + Math.random()*2) + 's';
                e.style.animationDelay = (Math.random()*3) + 's';
                embers.appendChild(e);
            }

            frame.appendChild(fill);
            wrap.appendChild(embers);
            wrap.appendChild(frame);
            
            player.appendChild(wrap);
            player.luxunUI = { wrap: wrap, fill: fill, embers: embers };
            // 自包含刷新方法（仅用 this/player，不引用任何模块级函数，content eval 作用域下也能调用）。
            // 显示规则：韬晦进行中 → 满条；韬晦可发动（有韬晦标记）→ 已损失体力/体力上限；
            //           本轮已发动过韬晦（标记被消耗、不可再发动）→ 能量恒为 0。
            player.dmqcRefreshLunxBar = function() {
                var p = this;
                var ui = p.luxunUI;
                if (!ui) return;
                var percent, intensity;
                if (p.storage && p.storage._taohui_active) {
                    // 韬晦进行中：满焰爆发
                    percent = 100;
                    intensity = 2;
                } else if (p.hasSkill && p.hasSkill('sgz_taohui_mark')) {
                    // 韬晦可发动：已损失体力 / 体力上限
                    var maxHp = Math.max(1, p.maxHp);
                    var lost = Math.max(0, maxHp - p.hp);
                    percent = Math.min(100, Math.round((lost / maxHp) * 100));
                    intensity = 1 + (lost / maxHp);
                } else {
                    // 本轮已发动过韬晦（不可再发动）：能量恒为 0
                    percent = 0;
                    intensity = 0;
                }
                ui.fill.style.height = percent + '%';
                if (percent > 0) {
                    ui.fill.style.filter = 'blur(2px) brightness(' + intensity + ')';
                    ui.embers.style.display = 'block';
                } else {
                    ui.fill.style.filter = '';
                    ui.embers.style.display = 'none';
                }
            };
        }
    },
    content: function() {
        if (player.dmqcRefreshLunxBar) player.dmqcRefreshLunxBar();
    },
    onremove: function(player) {
        if (player.luxunUI) {
            player.luxunUI.wrap.remove();
            delete player.luxunUI;
        }
    }
};

// ============================================================
//  梦陆逊 · 焚灭 选择框（纯表现层，不改大小/交互/逻辑）
//  参考曹髦缚渊：为引擎 showCards/chooseCardTarget 揭示对话框
//  套一层「业火焚天 · 白鹿踏焰」主题框：
//    · 火海焚天渐变底 + 连营火光背景图 + 玉青云烟
//    · 头像/标题头部 + 竖排「业火」封印 + 页脚落款
//    · 白鹿徽记水印 + 金/火边框辉光 + 四角业火回纹
//  仅做视觉装饰：不改选牌/选目标与结算逻辑；装饰层全 pointer-events:none。
//  对应图片素材：image/sgz_luxun_fenmie_bg.svg / _emblem.svg / _corner.svg
// ============================================================
const dmqcFenmieStyleId = 'dmqc_fenmie_dialog_style';
function dmqcInjectFenmieDialogStyle() {
    if (document.getElementById(dmqcFenmieStyleId)) return;
    const style = document.createElement('style');
    style.id = dmqcFenmieStyleId;
    style.innerHTML = `
/* ============ 焚灭·业火焚天 选择框 ============ */
/* 外面板：固定于视口正中央、自适应高度、透底（装饰交给 content-container）。
   水平用 left:0/right:0 + margin:0 auto 精确水平居中（不依赖 transform 的 -50%，
   那会被引擎把盒子实际宽度拉宽后向左溢出）；垂直用 top:50% + translateY(-50%)。 */
.dmqc-fenmie-dialog {
    position: fixed !important;
    left: 0 !important;
    right: 0 !important;
    top: 50% !important;
    bottom: auto !important;
    width: var(--dmqc-width, 600px) !important;
    max-width: calc(100vw - 24px) !important;
    height: auto !important;
    min-height: 0 !important;
    margin: 0 auto !important;
    padding: 0 !important;
    background: transparent !important;
    border: none !important;
    border-radius: 14px !important;
    box-shadow: none !important;
    overflow: visible !important;
    transition: none !important;
    z-index: 500 !important; /* 置顶：高于引擎 #control(5) 与场上元素 */
    transform: translate(-30px, -50%) !important;
    animation: dmqc-fenmie-glow 2.6s ease-in-out infinite;
}
/* 火光辉光脉动 */
@keyframes dmqc-fenmie-glow {
    0%, 100% {
        box-shadow: 0 0 0 1px rgba(0,0,0,.9), 0 0 0 4px rgba(255,138,42,.42),
            0 0 0 7px rgba(60,190,110,.14), 0 0 30px 5px rgba(214,80,30,.24);
    }
    50% {
        box-shadow: 0 0 0 1px rgba(0,0,0,.9), 0 0 0 4px rgba(255,207,114,.6),
            0 0 0 7px rgba(90,215,150,.16), 0 0 44px 12px rgba(255,106,26,.34);
    }
}
/* 内层底板：火海渐变 + 连营火光背景图 */
.dmqc-fenmie-dialog > .content-container {
    position: relative !important;
    width: 100% !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: calc(100vh - 32px);
    overflow-y: auto;
    overflow-x: hidden;
    box-sizing: border-box;
    border-radius: 14px !important;
    background:
        radial-gradient(130% 96% at 50% 100%, rgba(255,120,40,.30), rgba(255,120,40,0) 62%),
        radial-gradient(120% 110% at 50% 0%, rgba(63,191,138,.16), rgba(63,191,138,0) 55%),
        linear-gradient(180deg, rgba(42,18,8,.5) 0%, rgba(26,10,5,.62) 50%, rgba(13,5,3,.78) 100%),
        url('extension/大梦千秋/image/sgz_luxun_fenmie_bg.svg') center / cover no-repeat;
    box-shadow:
        0 0 0 1px rgba(0,0,0,.9),
        0 0 0 4px rgba(214,138,38,.22),
        0 0 0 7px rgba(64,191,110,.08),
        0 0 40px rgba(0,0,0,.75),
        inset 0 0 42px rgba(214,80,30,.10);
}
.dmqc-fenmie-dialog .content {
    position: relative !important;
    display: block;
    width: 100%;
    min-height: 0 !important;
    overflow: visible !important;
    padding: 0 !important;
    margin: 0 !important;
    font-size: 0;
}
.dmqc-fenmie-dialog > .bar { display: none !important; }

/* 白鹿徽记水印 */
.dmqc-fenmie-emblem {
    position: absolute !important;
    left: 50% !important; top: 50% !important;
    width: 200px !important; height: 200px !important;
    transform: translate(-50%, -50%) !important;
    margin: 0 !important;
    background-image: url('extension/大梦千秋/image/sgz_luxun_fenmie_emblem.svg');
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    opacity: .15;
    pointer-events: none;
    z-index: 0;
}
/* 四角业火回纹 */
.dmqc-fenmie-corner {
    position: absolute !important;
    width: 60px !important; height: 60px !important;
    margin: 0 !important;
    background-image: url('extension/大梦千秋/image/sgz_luxun_fenmie_corner.svg');
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    pointer-events: none;
    z-index: 0;
    opacity: .96;
}
.dmqc-fenmie-corner.tl { top: 6px !important; left: 6px !important; }
.dmqc-fenmie-corner.tr { top: 6px !important; right: 6px !important; transform: scaleX(-1) !important; }
.dmqc-fenmie-corner.bl { bottom: 6px !important; left: 6px !important; transform: scaleY(-1) !important; }
.dmqc-fenmie-corner.br { bottom: 6px !important; right: 6px !important; transform: scale(-1,-1) !important; }

/* 头部：头像 + 标题 + 竖排「业火」 */
.dmqc-fenmie-head {
    position: relative !important;
    display: flex !important;
    flex-wrap: nowrap !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 16px !important;
    width: calc(100% - 0px) !important;
    box-sizing: border-box !important;
    margin: 0 !important;
    padding: 16px 22px 8px !important;
}
.dmqc-fenmie-ava {
    position: relative;
    flex: 0 0 74px;
    width: 74px; height: 74px;
    border-radius: 50%;
    background-size: cover;
    background-position: center 12%;
    border: 2px solid #d4af37;
    box-shadow: 0 0 0 3px rgba(0,0,0,.65), 0 0 20px rgba(214,138,38,.35), inset 0 0 12px rgba(0,0,0,.6);
}
.dmqc-fenmie-titlewrap {
    position: relative;
    flex: 0 1 auto;
    text-align: center;
}
.dmqc-fenmie-kicker {
    position: relative;
    display: block;
    font-family: xiaozhuan, "KaiTi", serif;
    font-size: 13px;
    letter-spacing: 6px;
    color: #c7a25a;
    text-shadow: 0 0 10px rgba(0,0,0,.8);
    margin-bottom: 2px;
}
.dmqc-fenmie-title {
    position: relative;
    display: block;
    font-family: xinwei, "KaiTi", serif;
    font-size: 30px;
    line-height: 1.15;
    letter-spacing: 5px;
    color: #f6d98a;
    text-shadow: 0 0 14px rgba(246,217,138,.5), 0 2px 4px rgba(0,0,0,.85);
    white-space: nowrap;
}
.dmqc-fenmie-title i {
    font-style: normal;
    color: #ff9a4a;
    font-size: 24px;
    vertical-align: 2px;
}
.dmqc-fenmie-sub {
    position: relative;
    display: block;
    font-size: 13px;
    letter-spacing: 2px;
    color: #d8c3a0;
    margin-top: 4px;
}
.dmqc-fenmie-sub b {
    color: #8fd9ac;
    font-family: xinwei, "KaiTi", serif;
    font-weight: normal;
    font-size: 14px;
    letter-spacing: 2px;
}
.dmqc-fenmie-side {
    position: relative;
    flex: 0 0 42px;
    width: 42px; height: 86px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    border: 1px solid rgba(214,138,38,.5);
    border-radius: 6px;
    background: rgba(0,0,0,.35);
    box-shadow: inset 0 0 10px rgba(214,138,38,.12);
}
.dmqc-fenmie-side span {
    position: relative;
    display: block;
    font-family: xiaozhuan, "KaiTi", serif;
    font-size: 20px;
    line-height: 1;
    color: #d9b96a;
}

/* 分隔线 */
.dmqc-fenmie-divider {
    position: relative !important;
    display: block !important;
    height: 1px;
    margin: 10px 22px 8px !important;
    width: calc(100% - 44px) !important;
    background: linear-gradient(90deg, rgba(214,138,38,0), rgba(214,138,38,.8) 18%, #ff9a4a 50%, rgba(214,138,38,.8) 82%, rgba(214,138,38,0));
}
.dmqc-fenmie-divider::before,
.dmqc-fenmie-divider::after {
    content: "";
    position: absolute;
    top: 50%;
    width: 6px; height: 6px;
    transform: translateY(-50%) rotate(45deg);
    background: #ffb060;
    box-shadow: 0 0 8px rgba(255,176,96,.8);
}
.dmqc-fenmie-divider::before { left: 30%; }
.dmqc-fenmie-divider::after { right: 30%; }

/* 提示词（金色，居中）。仅视觉 */
.dmqc-fenmie-dialog .caption {
    position: relative;
    color: #f6d98a !important;
    text-shadow: 0 0 10px rgba(0,0,0,.9) !important;
    font-family: xinwei, KaiTi, STKaiti, serif !important;
    letter-spacing: 1px !important;
    text-align: center !important;
    padding: 2px 20px 8px !important;
    font-size: 16px !important;
}
.dmqc-fenmie-dialog .caption span {
    text-shadow: 0 0 7px rgba(255,180,70,.7) !important;
    color: #ffe9a8 !important;
}

/* 展示 / 可弃的牌。仅视觉 */
.dmqc-fenmie-dialog .buttons {
    position: relative;
    text-align: center;
}
.dmqc-fenmie-dialog .button.card {
    border: 1px solid rgba(208,155,63,.45) !important;
    box-shadow: 0 0 0 1px rgba(0,0,0,.5), 0 0 10px rgba(214,80,30,.32) !important;
}
/* 手牌选中对应花色时，焚灭框内该花色的展示牌「卡面变亮」（提亮整张牌面，而非只亮边框） */
.dmqc-fenmie-dialog .button.card.dmqc-fenmie-lit {
    border-color: #ffe08a !important;
    box-shadow: 0 0 0 1px rgba(255,210,90,.85), 0 0 18px 4px rgba(255,200,90,.45) !important;
    filter: brightness(1.85) saturate(1.25) !important;
}
.dmqc-fenmie-dialog .button.card.dmqc-fenmie-lit .image {
    filter: brightness(1.85) saturate(1.25) !important;
}
.dmqc-fenmie-dialog .button.card.dmqc-fenmie-lit .name {
    filter: brightness(1.6) saturate(1.2) !important;
}
.dmqc-fenmie-dialog .button.card.dmqc-fenmie-lit .info {
    color: #ffe9a8 !important;
    text-shadow: 0 0 10px rgba(255,180,60,.9), 0 1px 2px rgba(0,0,0,.9) !important;
}
.dmqc-fenmie-dialog .info {
    font-weight: bold !important;
    letter-spacing: 1px !important;
    text-shadow: 0 1px 2px rgba(0,0,0,.9) !important;
}

/* 确认/取消按钮行（替代引擎原生 #control 确认栏，做进主题框内） */
.dmqc-fenmie-actions {
    position: relative !important;
    display: flex !important;
    flex-wrap: nowrap !important;
    justify-content: center !important;
    align-items: center !important;
    gap: 16px !important;
    width: calc(100% - 0px) !important;
    box-sizing: border-box !important;
    margin: 0 !important;
    padding: 4px 22px 0 !important;
}
.dmqc-fenmie-btn {
    position: relative !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    min-width: 112px !important;
    padding: 9px 24px !important;
    border-radius: 8px !important;
    cursor: pointer !important;
    user-select: none !important;
    font-family: xinwei, "KaiTi", serif !important;
    font-size: 17px !important;
    letter-spacing: 6px !important;
    transition: transform .16s ease, box-shadow .16s ease, background .16s ease, border-color .16s ease !important;
}
.dmqc-fenmie-btn.ok {
    color: #2a1200 !important;
    background: linear-gradient(180deg, #ffe0a0 0%, #f0a94b 52%, #d07f24 100%);
    border: 1px solid #ffefc4 !important;
    box-shadow: 0 0 0 1px rgba(0,0,0,.55), 0 0 16px rgba(255,150,50,.55), inset 0 0 10px rgba(255,240,200,.35);
}
.dmqc-fenmie-btn.ok:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 0 0 1px rgba(0,0,0,.55), 0 0 26px rgba(255,180,70,.92), inset 0 0 12px rgba(255,240,200,.5);
}
.dmqc-fenmie-btn.cancel {
    color: #e8d3a8 !important;
    background: rgba(20,8,4,.55);
    border: 1px solid rgba(214,138,38,.6) !important;
    box-shadow: inset 0 0 10px rgba(0,0,0,.5), 0 0 10px rgba(214,80,30,.18);
}
.dmqc-fenmie-btn.cancel:hover {
    transform: translateY(-2px) !important;
    box-shadow: inset 0 0 12px rgba(0,0,0,.5), 0 0 16px rgba(255,120,40,.4);
}

/* 页脚落款 */
.dmqc-fenmie-foot {
    position: relative !important;
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 12px !important;
    width: calc(100% - 0px) !important;
    box-sizing: border-box !important;
    margin: 0 !important;
    padding: 8px 22px 14px !important;
}
.dmqc-fenmie-credit {
    position: relative;
    font-family: xiaozhuan, "KaiTi", serif;
    font-size: 14px;
    letter-spacing: 4px;
    color: #b79760;
}
.dmqc-fenmie-hint {
    position: relative;
    font-family: yuanli, "KaiTi", serif;
    font-size: 12px;
    letter-spacing: 1px;
    color: #a58a64;
}

@media (prefers-reduced-motion: reduce) {
    .dmqc-fenmie-dialog { animation: none !important; }
}
`;
    document.head.appendChild(style);
}

// 焚灭主题化：把引擎的「揭示/弃牌」对话框包装成完整的主题面板（纯视觉，不改交互/结算）。
// 幂等：同一个 dialog 只主题化一次（data 标记）；装饰层全部 pointer-events:none，绝不挡牌。
export function dmqcFenmieDialogTheme(dialogEl) {
    if (!dialogEl) return;
    if (dialogEl.dataset.dmqcFenmieThemed) return;
    dialogEl.dataset.dmqcFenmieThemed = '1';
    try {
        dmqcInjectFenmieDialogStyle();
        dialogEl.classList.add('dmqc-fenmie-dialog');
        const cc = dialogEl.contentContainer;
        const content = dialogEl.content;
        if (!cc || !content) return;

        // ===== 关键布局内联化：抵御引擎全局 `div { position:absolute }` 规则 =====
        // 宽度按展示牌数量自适应，同时受视口约束；水平用 left:0/right:0+margin:0 auto 精确居中。
        const vw = window.innerWidth || document.documentElement.clientWidth || 1280;
        const n = (dialogEl.buttons && dialogEl.buttons.length) || 1;
        const designW = Math.max(460, Math.min(720, 150 + n * 96));
        const dlgW = Math.min(designW, vw - 24);
        // 注意：先赋 cssText（会重置全部内联样式），再 setProperty 自定义属性。
        dialogEl.style.cssText = 'position:fixed;left:0;right:0;top:50%;width:' + dlgW + 'px;height:auto;bottom:auto;margin:0 auto;padding:0;overflow:visible;transition:none;transform:translate(-30px,-50%);';
        dialogEl.style.setProperty('--dmqc-width', dlgW + 'px');
        cc.style.cssText = 'position:relative;width:100%;height:auto;min-height:0;box-sizing:border-box;';
        content.style.cssText = 'position:relative;display:block;width:100%;min-height:0;overflow:visible;padding:0;margin:0;font-size:0;';

        // ===== 注入装饰层（白鹿水印 + 四角业火回纹）到最前 =====
        content.insertAdjacentHTML('afterbegin',
            '<div class="dmqc-fenmie-emblem"></div>'
            + '<div class="dmqc-fenmie-corner tl"></div><div class="dmqc-fenmie-corner tr"></div>'
            + '<div class="dmqc-fenmie-corner bl"></div><div class="dmqc-fenmie-corner br"></div>'
        );

        // 业火余烬上浮层：夹在「装饰层」与「正文（caption/牌）」之间，不遮挡牌面
        dmqcMountParticles(content, "luxun", { before: content.querySelector('.caption') });

        // ===== 头部 + 分隔线：插到 caption（提示词）之前 =====
        const headBlock = 
            '<div class="dmqc-fenmie-head">'
            + '<div class="dmqc-fenmie-ava" style="background-image:url(\'extension/大梦千秋/image/sgz_luxun_fenmie.jpg\')"></div>'
            + '<div class="dmqc-fenmie-titlewrap">'
            +   '<div class="dmqc-fenmie-kicker">梦 回 夷 陵 · 火 烧 连 营</div>'
            +   '<div class="dmqc-fenmie-title">焚 灭 <i>·</i> 业 火 焚 天</div>'
            +   '<div class="dmqc-fenmie-sub"><b>业火燎原</b> · 焚尽旧梦</div>'
            + '</div>'
            + '<div class="dmqc-fenmie-side"><span>业</span><span>火</span></div>'
            + '</div>'
            + '<div class="dmqc-fenmie-divider"></div>';
        const caption = content.querySelector('.caption');
        if (caption) {
            caption.insertAdjacentHTML('beforebegin', headBlock);
        } else {
            content.insertAdjacentHTML('beforebegin', headBlock);
        }

        // ===== 页脚：主题化 确认/取消 + 落款（替代引擎原生 #control 确认栏） =====
        content.insertAdjacentHTML('beforeend',
            '<div class="dmqc-fenmie-actions">'
            + '<div class="dmqc-fenmie-btn cancel">取 消</div>'
            + '<div class="dmqc-fenmie-btn ok">确 认</div>'
            + '</div>'
            + '<div class="dmqc-fenmie-foot">'
            + '<span class="dmqc-fenmie-credit">焚 灭 · 梦 陆 逊</span>'
            + '<span class="dmqc-fenmie-hint">点击托举的牌即弃置，并对对应角色造成火焰伤害</span>'
            + '</div>'
        );

        // 绑定主题化按钮 → 引擎结算（等价于原生 ui.click.ok / ui.click.cancel）。
        // 只在「选牌/选目标」的 chooseCardTarget 事件挂起时才生效，避免揭示阶段误触。
        const fenmieIsChoosing = function () {
            const evt = typeof _status !== 'undefined' ? _status.event : null;
            return !!(evt && (evt.name === 'chooseCardTarget' || evt.selectCard !== undefined || evt.filterTarget !== undefined));
        };
        const fenmieConfirm = function (e) {
            if (e && e.stopPropagation) e.stopPropagation();
            if (!fenmieIsChoosing()) return;
            const evt = _status.event;
            if (!evt) return;
            try {
                if (typeof ui !== 'undefined' && ui.click && ui.click.ok) { ui.click.ok(); return; }
            } catch (err) {
                console.warn('[大梦千秋] 焚灭确认按钮调用 ui.click.ok 失败，走兜底结算：', err);
            }
            evt.result = {
                bool: true, confirm: 'ok',
                cards: ui.selected.cards.slice(),
                targets: ui.selected.targets.slice(),
                buttons: ui.selected.buttons.slice(),
                links: get.links(ui.selected.buttons)
            };
            game.uncheck();
            game.resume();
        };
        const fenmieCancel = function (e) {
            if (e && e.stopPropagation) e.stopPropagation();
            if (!fenmieIsChoosing()) return;
            try {
                if (typeof ui !== 'undefined' && ui.click && ui.click.cancel) { ui.click.cancel(); return; }
            } catch (err) {
                console.warn('[大梦千秋] 焚灭取消按钮调用 ui.click.cancel 失败，走兜底结算：', err);
            }
            _status.event.result = { bool: false, confirm: 'cancel' };
            game.uncheck();
            game.resume();
        };
        const okBtn = content.querySelector('.dmqc-fenmie-btn.ok');
        const cancelBtn = content.querySelector('.dmqc-fenmie-btn.cancel');
        if (okBtn) okBtn.addEventListener('click', fenmieConfirm);
        if (cancelBtn) cancelBtn.addEventListener('click', fenmieCancel);

        // ===== 手牌选中 → 焚灭框内对应花色展示牌亮起 =====
        // 收集焚灭框内各目标展示的牌（.button.card）与其花色；由 character 的 filterTarget
        // 在选中手牌变化时调用本同步函数，点亮「花色命中的展示牌」。
        const fenmieBoxCards = [];
        try {
            const revealed = content.querySelectorAll('.button.card');
            for (let i = 0; i < revealed.length; i++) {
                const btn = revealed[i];
                if (!btn.link) continue;
                try { fenmieBoxCards.push({ el: btn, suit: get.suit(btn.link) }); } catch (e) {}
            }
        } catch (e) {}
        const fenmieSyncBox = function () {
            if (typeof ui === 'undefined' || !ui.selected) return;
            const selectedSuits = [];
            try {
                const sc = ui.selected.cards || [];
                for (let i = 0; i < sc.length; i++) {
                    try { const s = get.suit(sc[i]); if (s && selectedSuits.indexOf(s) === -1) selectedSuits.push(s); } catch (e) {}
                }
            } catch (e) {}
            for (let i = 0; i < fenmieBoxCards.length; i++) {
                const bc = fenmieBoxCards[i];
                bc.el.classList.toggle('dmqc-fenmie-lit', selectedSuits.indexOf(bc.suit) !== -1);
            }
        };
        try { dialogEl._dmqcFenmieSync = fenmieSyncBox; } catch (e) {}
        // 取消/清空选择时，引擎的「非 multitarget」分支不会再调用 game.check → filterTarget 不再触发，
        // 故加一个轻量轮询兜底：仅在 chooseCardTarget 挂起期间刷新展示牌亮起；
        // 对话框关闭（从 DOM 移除）后停止轮询，避免常驻泄漏。
        try {
            if (!dialogEl._dmqcFenmiePoll) {
                dialogEl._dmqcFenmiePoll = setInterval(function () {
                    const evt = typeof _status !== 'undefined' ? _status.event : null;
                    if (evt && evt.name === 'chooseCardTarget') {
                        fenmieSyncBox();
                        return;
                    }
                    // 弃牌结束：对话框被移除 → 停止轮询
                    if (typeof document !== 'undefined' && document && !document.contains(dialogEl)) {
                        clearInterval(dialogEl._dmqcFenmiePoll);
                        try { delete dialogEl._dmqcFenmiePoll; } catch (e2) {}
                    }
                }, 100);
            }
        } catch (e) {}
    } catch (e) {
        // 构造失败不静默：回退到仅一线流光（保证技能可用）
        console.warn('[大梦千秋] 焚灭主题框美化失败，已回退默认框：', e);
        try {
            dialogEl.classList.add('dmqc-fenmie-dialog');
        } catch (err) {}
    }
}
