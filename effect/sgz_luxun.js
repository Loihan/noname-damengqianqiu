// ===== 陆逊 · 【业火残响】极高品质 UI（纯表现层，无游戏规则） =====
// 由 character/sgz_luxun.js 通过 import { luxunUI } 挂载回 skills 中
export const luxunUI = {
    charlotte: true,
    trigger: { 
        player: ["changeHp", "dying", "enterGame","phaseUseEnd"],
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
        }
    },
    content: function() {
        var ui = player.luxunUI;
        if (!ui) return;

        var percent = 0;
        var intensity = 1; // 燃烧强度

        if (player.storage._taohui_active) {
            percent = 100;
            intensity = 2;
        } else if (player.hasSkill('sgz_taohui_mark')) {
            var lost = player.maxHp - player.hp;
            percent = Math.min(100, Math.floor(((lost) / player.maxHp) * 100));
            intensity = 1 + (lost / player.maxHp);
        } else {
            percent = 0;
        }

        // 更新高度
        ui.fill.style.height = percent + '%';
        
        // 根据强度调整环境光
        if (percent > 0) {
            ui.fill.style.filter = `blur(2px) brightness(${intensity})`;
            ui.embers.style.display = 'block';
        } else {
            ui.embers.style.display = 'none';
        }
    },
    onremove: function(player) {
        if (player.luxunUI) {
            player.luxunUI.wrap.remove();
            delete player.luxunUI;
        }
    }
};