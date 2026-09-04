// ===== 司马昭 · 【拗纬】万象影光究极醒目版特效（纯表现层，无游戏规则） =====
// 由 character/sgz_simazhao.js 通过 import { woweiUI } 挂载回 skills 中
export const woweiUI = {
    charlotte: true,
    silent: true,
    trigger: { 
        player: ["gainAfter", "loseAfter", "enterGame", "addSkillAfter", "removeSkillAfter"],
        global: ["phaseBefore", "phaseBeginStart", "gameStart", "roundStart"] 
    },
    forced: true,
    priority: -10,
    init: function(player) {
        // 1. 注入 SVG 流体撕裂滤镜
        if (!document.getElementById('simazhao_heavy_fire_svg')) {
            var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.id = 'simazhao_heavy_fire_svg';
            svg.style.cssText = "position:absolute; width:0; height:0; pointer-events:none;";
            svg.innerHTML = `
                <filter id="wowei-heavy-warp">
                    <feTurbulence type="fractalNoise" baseFrequency="0.05 0.03" numOctaves="3" seed="1">
                        <animate attributeName="seed" from="1" to="100" dur="15s" repeatCount="indefinite" />
                    </feTurbulence>
                    <feDisplacementMap in="SourceGraphic" scale="15" />
                </filter>
            `;
            document.body.appendChild(svg);
        }

        // 2. 注入厚重感 CSS
        if (!document.getElementById('simazhao_wowei_style_heavy')) {
            var style = document.createElement('style');
            style.id = 'simazhao_wowei_style_heavy';
            style.innerHTML = `
                /* 1. 潜伏态：暗紫侵蚀 (滤镜明显，边框厚实) */
                .wowei-soldier {
                    /* 全卡滤镜：色相偏移至紫色 + 降低亮度 */
                    filter: sepia(0.5) hue-rotate(230deg) saturate(4) brightness(0.8) !important;
                    /* 厚实的紫色实色外边框 */
                    box-shadow: 0 0 0 3px #0400ff, 0 0 15px #0c0d0d !important;
                }

                /* 2. 暴走态：血红狂乱 (极高对比，动态火舌) */
                .wowei-rebel {
                    /* 全卡滤镜：强力鲜红 + 高对比度 */
                    filter: hue-rotate(350deg) brightness(0.9) contrast(1.2) !important;
                    /* 极其厚实的亮红边框 */
                    box-shadow: 0 0 0 4px #ff1919, 0 0 20px #935a5a !important;
                    animation: wowei-riot-shake 0.15s infinite;
                }

                /* 动态撕裂层 (仅在暴走态显示明显的分支火焰) */
                .wowei-rebel::before {
                    content: ""; position: absolute; 
                    top: -15px; left: -12px; right: -12px; bottom: -10px;
                    background: linear-gradient(to top, rgb(118, 13, 13), #f00, #d0db3f);
                    filter: url(#wowei-heavy-warp) blur(1px);
                    opacity: 0.8; z-index: -1;
                    mix-blend-mode: screen;
                    animation: wowei-fire-rise 1s infinite alternate;
                }

                /* 内部高亮边缘线 */
                .wowei-rebel::after {
                    content: ""; position: absolute;
                    top: 1px; left: 1px; right: 1px; bottom: 1px;
                    border: 2px solid rgba(138, 113, 113, 0.5);
                    border-radius: 4px; pointer-events: none; z-index: 5;
                    mix-blend-mode: overlay;
                }


            `;
            document.head.appendChild(style);
        }
    },
    content: function(event, trigger, player) {
        // 兼容性获取玩家对象
        var pl = player || (this.getCards ? this : _status.event.player);
        if (!pl || !pl.hasSkill) return;

        // 判定是否进入暴走态
        var isRiot = pl.hasSkill('sgz_tunyue') || game.hasPlayer(function(current){
            return current.hasSkill('sgz_futao_mark');
        });
        
        // 虚空牌在 s 区，实体牌在 h 区
        var allCards = pl.getCards('hs');
        for (var i = 0; i < allCards.length; i++) {
            var card = allCards[i];
            if (card.gaintag && card.gaintag.contains('sgz_wowei_tag')) {
                if (isRiot) {
                    card.classList.add('wowei-rebel');
                    card.classList.remove('wowei-soldier');
                } else {
                    card.classList.add('wowei-soldier');
                    card.classList.remove('wowei-rebel');
                }
            } else {
                card.classList.remove('wowei-soldier', 'wowei-rebel');
            }
        }
    }
};