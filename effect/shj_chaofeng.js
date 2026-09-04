// ===== 嘲风·【弧形星环阵列】UI（纯表现层，无游戏规则） =====
// 由 character/shj_chaofeng.js 通过 import { chaofengUI } 挂载回 skills 中
export const chaofengUI = {
    charlotte: true,
    trigger: { 
        player: ["enterGame", "gainMarkAfter", "removeMarkAfter", "awaken", "gainAfter"],
        global: ["gameStart", "useCardAfter", "damageAfter", "phaseBeginStart"] 
    },
    forced: true, silent: true, priority: -10,
    init: function(player) {
        if (!document.getElementById('chaofeng_arc_ui_style')) {
            var style = document.createElement('style');
            style.id = 'chaofeng_arc_ui_style';
            style.innerHTML = `
                /* 容器：弧形布局空间 */
                .chaofeng-diamond-wrap {
                    position: absolute; left: 100%; top: 5%;
                    margin-left: 3px; width: 40px; height: 90%;
                    display: flex; flex-direction: column; 
                    justify-content: space-around; align-items: flex-start;
                    z-index: 50; pointer-events: none;
                }

                /* 晶体基础 */
                .chaofeng-diamond {
                    width: 18px; height: 28px;
                    position: relative;
                    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                    opacity: 0.25; transform: scale(0.8);
                }

                /* --- 核心：弧形阵列逻辑 --- */
                /* 1,5两端向内缩，3中间向外突 */
                .chaofeng-diamond:nth-child(1), .chaofeng-diamond:nth-child(5) { margin-left: 0px; }
                .chaofeng-diamond:nth-child(2), .chaofeng-diamond:nth-child(4) { margin-left: 0px; }
                .chaofeng-diamond:nth-child(3) { margin-left: 0px; }

                .chaofeng-diamond.active { opacity: 1; transform: scale(1.1); }

                /* 晶体本体 */
                .diamond-body {
                    width: 100%; height: 100%;
                    clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
                    position: absolute; top: 0; left: 0; z-index: 1;
                }

                /* 1. 觉醒前：白金色 (铂金拉丝 + 金属扫光) */
                .chaofeng-diamond .diamond-body {
                    background: rgba(80, 80, 80, 0.4);
                    box-shadow: inset 0 0 5px rgba(0,0,0,0.5);
                }
                .chaofeng-diamond.active .diamond-body {
                    background: linear-gradient(135deg, #e5e4e2 0%, #ffffff 45%, #d4af37 50%, #ffffff 55%, #e5e4e2 100%);
                    background-size: 300% 300%;
                    animation: white-gold-sweep 4s infinite linear;
                    box-shadow: 0 0 10px rgba(255, 255, 255, 0.6), inset 0 0 4px rgba(255,215,0,0.3);
                    border: 1px solid rgba(255,255,255,0.5);
                }

                /* 晶体内部星云动效 */
                .chaofeng-diamond.active::before {
                    content: ""; position: absolute; top: 15%; left: 15%; width: 70%; height: 70%;
                    background: conic-gradient(from 0deg, transparent, rgba(255,255,255,0.8), transparent);
                    clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
                    animation: diamond-swirl 2.5s infinite linear;
                    z-index: 2;
                }

                /* 2. 觉醒后：黑曜重铠 + 液态金核 */
                /* 增加外框厚度感 */
                .chaofeng-diamond-wrap.awakened .chaofeng-diamond.active .diamond-body {
                    background: #0a0a0a !important;
                    border: 2px solid #222 !important;
                    box-shadow: 0 0 15px rgba(0,0,0,1), inset 0 0 10px #000 !important;
                }

                /* 等宽金芯 (50%比例) */
                .chaofeng-diamond-wrap.awakened .chaofeng-diamond.active .diamond-inner {
                    position: absolute; top: 25%; left: 25%; width: 50%; height: 50%;
                    background: linear-gradient(180deg, #ffeb3b, #ff8f00);
                    clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
                    z-index: 3;
                    box-shadow: 0 0 12px #ffbb00;
                    animation: liquid-gold 2s infinite alternate ease-in-out;
                }

                /* 动画序列 */
                @keyframes white-gold-sweep {
                    0% { background-position: 0% 0%; }
                    100% { background-position: 100% 100%; }
                }
                @keyframes diamond-swirl {
                    0% { transform: rotate(0deg); opacity: 0.3; }
                    50% { opacity: 0.7; }
                    100% { transform: rotate(360deg); opacity: 0.3; }
                }
                @keyframes liquid-gold {
                    0% { filter: brightness(1) contrast(1.2); transform: scale(0.9); }
                    100% { filter: brightness(1.6) contrast(1.5); transform: scale(1.1); }
                }
            `;
            document.head.appendChild(style);
        }

        if (!player.chaofengUI) {
            var wrap = document.createElement('div');
            wrap.className = 'chaofeng-diamond-wrap';
            var diamonds = [];
            for(var i=0; i<5; i++) {
                var d = document.createElement('div');
                d.className = 'chaofeng-diamond';
                var body = document.createElement('div');
                body.className = 'diamond-body';
                var inner = document.createElement('div');
                inner.className = 'diamond-inner';
                d.appendChild(body);
                d.appendChild(inner);
                wrap.appendChild(d);
                diamonds.push(d);
            }
            player.appendChild(wrap);
            player.chaofengUI = { wrap: wrap, diamonds: diamonds };
        }
    },
    content: function() {
        var ui = player.chaofengUI;
        if (!ui) return;
        // 1. 判断是否觉醒
        var isAwakened = player.storage.shj_weilin_awaken || player.hasSkill('shj_linxu');
        // 2. 获取标记数量
        var weiCount = player.countMark('shj_jingyue') || 0;
        
        // 3. 渲染逻辑
        for (var i = 0; i < ui.diamonds.length; i++) {
            // 如果觉醒了，强制点亮所有(isAwakened)；否则根据标记点亮(i < weiCount)
            if (isAwakened || i < weiCount) {
                ui.diamonds[i].classList.add('active');
            } else {
                ui.diamonds[i].classList.remove('active');
            }
        }
        // 4. 样式切换逻辑
        if (isAwakened) {
            if (!ui.wrap.classList.contains('awakened')) {
                ui.wrap.classList.add('awakened');
            }
        }
    },
    onremove: function(player) {
        if (player.chaofengUI) {
            player.chaofengUI.wrap.remove();
            delete player.chaofengUI;
        }
    }
};