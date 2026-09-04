// ===== 白泽 · 神器边框 UI（纯表现层，无游戏规则） =====
// 由 character/shj_baize.js 通过 import { baizeUI } 挂载回 skills 中
export const baizeUI = {
    charlotte: true,
    trigger: { 
        player: ["enterGame", "gainAfter", "awaken"],
        global: ["gameStart", "phaseBeginStart"] 
    },
    forced: true,
    silent: true,
    priority: -10,
    init: function(player) {
        if (!document.getElementById('baize_artifact_style')) {
            var style = document.createElement('style');
            style.id = 'baize_artifact_style';
            style.innerHTML = `
                /* 容器：挂载在武将牌节点上，绝对定位到右侧 */
                .baize-artifact-wrap {
                    position: absolute; 
                    left: 100%; /* 起始位置在武将牌右边缘 */
                    bottom: 0%; 
                    margin-left: 5px; /* 您要求的 3px 缝隙 */
                    width: 25px; 
                    height: 100%; /* 相对于武将牌高度 */
                    z-index: 50;
                    display: flex; flex-direction: column; align-items: center;
                    transition: all 0.5s ease;
                    pointer-events: none;
                }

                /* 律柱外框：棱角几何 */
                .baize-artifact-frame {
                    width: 10px; height: 100%;
                    background: rgba(5, 10, 15, 0.9);
                    border: 1px solid rgba(127, 219, 255, 0.5);
                    clip-path: polygon(50% 0%, 100% 3%, 100% 97%, 50% 100%, 0% 97%, 0% 3%);
                    position: relative;
                    box-shadow: inset 0 0 6px rgba(0,0,0,1);
                    z-index: 2;
                }

                /* 能量填充 */
                /* 基础状态：冰蓝能量流 */
                .baize-artifact-fill {
                    width: 100%; height: 0%;
                    /* 核心：将底色、反光、流动层合并（从上到下叠加） */
                    background: 
                        /* 第一层：流动的气泡线 */
                        repeating-linear-gradient(0deg, transparent, rgba(255,255,255,0.3) 20px, transparent 40px),
                        /* 第二层：中心纵向高光（增加立体感） */
                        linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%),
                        /* 第三层：冰蓝色底色 */
                        linear-gradient(90deg, #0a1a2a 0%, #7fdbff 50%, #0a1a2a 100%);
                    
                    background-size: 100% 80px, 100% 100%, 100% 100%; /* 气泡层高度设为80px */
                    box-shadow: 0 0 10px rgba(127, 219, 255, 0.8);
                    transition: height 1.2s cubic-bezier(0.33, 1, 0.68, 1);
                    position: absolute; bottom: 0; left: 0;
                    border-top: 1px solid #fff;
                    animation: baize-energy-rise 3s infinite linear; /* 应用向上流动动画 */
                }
                /* 贴边狂雷系统 */
                .baize-lightning-system {
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    z-index: 3;
                }
                .bolt {
                    position: absolute; width: 3px; height: 40px;
                    background: #fff; opacity: 0;
                    filter: blur(0.5px) drop-shadow(0 0 6px #a0d8ff);
                }
                .bolt-1 { left: -1px; top: 15%; clip-path: polygon(100% 0, 0 30%, 100% 50%, 0 100%, 30% 50%, 0 20%); animation: bolt-flash 0.5s infinite; }
                .bolt-2 { right: -1px; top: 25%; clip-path: polygon(0 0, 100% 20%, 0 50%, 100% 80%, 0 100%, 50% 50%); animation: bolt-flash 0.4s infinite 0.3s; }
                .bolt-3 { left: -2px; bottom: 25%; clip-path: polygon(50% 0, 100% 40%, 20% 50%, 100% 100%, 0 60%, 40% 30%); animation: bolt-flash 0.6s infinite 0.6s; }
                .bolt-4 { right: -2px; bottom: 10%; clip-path: polygon(0 20%, 100% 0, 40% 50%, 100% 100%, 20% 60%, 50% 20%); animation: bolt-flash 0.5s infinite 0.9s; }

                @keyframes bolt-flash {
                    0%, 70%, 100% { opacity: 0; }
                    72% { opacity: 1; transform: scale(1.1); }
                    74% { opacity: 0; }
                    76% { opacity: 0.8; }
                    78% { opacity: 0; }
                }

                /* 觉醒：暗金变色 */
                .baize-artifact-wrap.awakened .baize-artifact-frame {
                    background: rgba(25, 15, 5, 0.95) !important;
                    border: 1px solid #b8860b !important;
                    box-shadow: 0 0 10px rgba(184, 134, 11, 0.5), inset 0 0 8px rgba(0,0,0,1) !important;
                }
                /* 觉醒状态：暗金琥珀流 */
                .baize-artifact-wrap.awakened .baize-artifact-fill {
                    background: 
                        /* 第一层：金流气泡 */
                        repeating-linear-gradient(0deg, transparent, rgba(255,215,0,0.4) 15px, transparent 30px),
                        /* 第二层：金色中心反光 */
                        linear-gradient(90deg, rgba(255,215,0,0) 0%, rgba(255,215,0,0.5) 50%, rgba(255,215,0,0) 100%),
                        /* 第三层：暗金底色 */
                        linear-gradient(90deg, #2d1b00 0%, #ffbb00 50%, #2d1b00 100%) !important;
                        
                    background-size: 100% 60px, 100% 100%, 100% 100% !important;
                    box-shadow: 0 0 15px rgba(255, 187, 0, 0.9) !important;
                    border-top: 1px solid #ffeebf !important;
                }
                .baize-artifact-wrap.awakened .bolt {
                    filter: blur(0.5px) drop-shadow(0 0 8px #ffbb00) !important;
                }

                /* 文字：缩小适配 */
                .baize-artifact-text {
                    font-family: yuanli; font-size: 9px;
                    color: #a0d8ff; text-shadow: 0 0 3px #000;
                    writing-mode: vertical-rl; margin-bottom: 2px;
                    letter-spacing: 0px; white-space: nowrap;
                }
                .baize-artifact-wrap.awakened .baize-artifact-text {
                    color: #ffbb00 !important;
                }
                /* 灵气升腾动画 */
                @keyframes baize-energy-rise {
                    0% { background-position: 0 0, 0 0, 0 0; }
                    100% { background-position: 0 -80px, 0 0, 0 0; } /* 只有第一层气泡在移动 */
                }
            `;
            document.head.appendChild(style);
        }

        // 核心改动：只在技能拥有者（白泽）的节点上创建 UI
        if (!player.baizeArtifact) {
            var wrap = document.createElement('div');
            wrap.className = 'baize-artifact-wrap';
            
            var text = document.createElement('div');
            text.className = 'baize-artifact-text';
            
            var frame = document.createElement('div');
            frame.className = 'baize-artifact-frame';
            var fill = document.createElement('div');
            fill.className = 'baize-artifact-fill';
            frame.appendChild(fill);

            var lightning = document.createElement('div');
            lightning.className = 'baize-lightning-system';
            for(var i=1; i<=4; i++) {
                var bolt = document.createElement('div');
                bolt.className = 'bolt bolt-' + i;
                lightning.appendChild(bolt);
            }

            wrap.appendChild(text);
            wrap.appendChild(frame);
            wrap.appendChild(lightning);
            
            // 【关键】：挂载到 player 节点而不是 ui.arena
            player.appendChild(wrap);
            player.baizeArtifact = { wrap: wrap, fill: fill, text: text };
        }
    },
    content: function() {
        var art = player.baizeArtifact;
        if (!art) return;

        var recorded = (player.storage.shj_dongxu || []).length;
        var all_non_equip = lib.inpile.filter(name => get.type(name) != 'equip').unique();
        var total = all_non_equip.length || 1;
        var percent = Math.min(100, Math.floor((recorded / total) * 100));

        art.fill.style.height = percent + '%';
        
        if (player.storage.shj_dongxu_awaken || player.hasSkill('shj_zhen_e')) {
            art.text.innerHTML = "洞虚·完满";
            if (!art.wrap.classList.contains('awakened')) art.wrap.classList.add('awakened');
        } else {
            art.text.innerHTML = "万象图谱 " + recorded + "/" + total;
        }
    },
    onremove: function(player) {
        if (player.baizeArtifact) {
            player.baizeArtifact.wrap.remove();
            delete player.baizeArtifact;
        }
    }
};