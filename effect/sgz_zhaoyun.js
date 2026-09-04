// ===== 梦赵云 · 劫掠蓄力能量条 UI（挂载武将牌右侧，纯表现层，无游戏规则） =====
// 由 character/sgz_zhaoyun.js 通过 import { zhaoyunUI } 挂载回 skills 中
export const zhaoyunUI = {
    charlotte: true,
    trigger: {
        player: ["enterGame", "addMark", "removeMark", "dying"],
        global: ["gameStart", "phaseZhunbeiBegin", "roundStart", "gameDrawBefore"]
    },
    forced: true,
    silent: true,
    priority: -10,
    init: function(player) {
        // 1. 注入样式
        if (!document.getElementById('zhaoyun_jiejin_energy_style')) {
            var style = document.createElement('style');
            style.id = 'zhaoyun_jiejin_energy_style';
            style.innerHTML = `
                /* 容器：挂载在武将牌节点上，绝对定位到右侧（贴近武将牌） */
                .zhaoyun-jiejin-wrap {
                    position: absolute; left: 100%; bottom: 0;
                    margin-left: 2px; width: 52px; height: 100%;
                    z-index: 60; pointer-events: none;
                    display: flex; flex-direction: column; align-items: flex-start; justify-content: flex-end;
                }
                /* 氛围光晕：托在剑身背后（扁平柔光，随能量同步） */
                .zhaoyun-jiejin-glow {
                    position: absolute; left: 50%; bottom: 6%; width: 46px; height: 0%;
                    transform: translateX(-50%);
                    background: radial-gradient(ellipse 100% 100% at 50% 100%, rgba(255,110,20,0.28), rgba(255,110,20,0) 70%);
                    filter: blur(3px);
                    z-index: 0;
                    transition: height 0.85s cubic-bezier(0.22, 1.2, 0.36, 1);
                }
                /* 蓄力文字（竖排，悬于剑尖上方） */
                .zhaoyun-jiejin-text {
                    font-family: yuanli; font-size: 8px; line-height: 10px;
                    color: rgba(255, 200, 130, 0.95);
                    text-shadow: 0 0 6px rgba(255,120,30,0.8), 0 1px 2px rgba(0,0,0,0.9);
                    writing-mode: vertical-rl; letter-spacing: 1px; white-space: nowrap;
                    margin: 0 0 3px;
                    position: relative; z-index: 4;
                    align-self: center;
                }
                /* 剑形能量条（内嵌 SVG 美术，随武将牌等比缩放） */
                .zhaoyun-jiejin-sword {
                    height: 86%; width: auto; flex: none;
                    filter: drop-shadow(0 0 5px rgba(255,120,30,0.45));
                    z-index: 2;
                }
                /* 悬浮火星：沿剑身方向上飘 */
                .zhaoyun-jiejin-ember {
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 3;
                }
                .zhaoyun-jiejin-ember i {
                    position: absolute;
                    background: radial-gradient(circle, #ffe3ad 0%, #ff9a2e 55%, rgba(255,140,40,0) 100%);
                    border-radius: 50%; opacity: 0;
                    filter: blur(0.5px) drop-shadow(0 0 4px #ff8a1a);
                    animation: zhaoyun-spark 2.2s infinite ease-out;
                }
                @keyframes zhaoyun-spark {
                    0% { transform: translate(0, 0) scale(1); opacity: 0; }
                    10% { opacity: 0.85; }
                    70% { opacity: 0.5; }
                    100% { transform: translate(var(--dx, 0px), -150px) scale(0.4); opacity: 0; }
                }
                /* 满蓄力：剑身金芒 */
                .zhaoyun-jiejin-wrap.full .zhaoyun-jiejin-sword {
                    filter: drop-shadow(0 0 9px rgba(255,170,50,0.85));
                    animation: zhaoyun-pulse 1.5s infinite ease-in-out;
                }
                .zhaoyun-jiejin-wrap.full .zhaoyun-jiejin-glow {
                    background: radial-gradient(ellipse 100% 100% at 50% 100%, rgba(255,180,60,0.5), rgba(255,180,60,0) 70%);
                }
                .zhaoyun-jiejin-wrap.full .zhaoyun-jiejin-text {
                    color: #ffd27a;
                    text-shadow: 0 0 8px rgba(255,180,60,1), 0 1px 2px rgba(0,0,0,0.9);
                }
                @keyframes zhaoyun-pulse {
                    0%, 100% { filter: drop-shadow(0 0 6px rgba(255,170,50,0.7)); }
                    50% { filter: drop-shadow(0 0 13px rgba(255,200,80,1)); }
                }
            `;
            document.head.appendChild(style);
        }

        // 2. 构建剑形 SVG（内嵌矢量美术：空心剑身框 + 剑格 + 短剑柄 + 剑首）
        if (!player.zhaoyunJiejinBar) {
            var wrap = document.createElement('div');
            wrap.className = 'zhaoyun-jiejin-wrap';

            var glow = document.createElement('div');
            glow.className = 'zhaoyun-jiejin-glow';

            var text = document.createElement('div');
            text.className = 'zhaoyun-jiejin-text';

            var SVGNS = 'http://www.w3.org/2000/svg';
            var svg = document.createElementNS(SVGNS, 'svg');
            svg.setAttribute('viewBox', '0 0 60 205');
            svg.setAttribute('class', 'zhaoyun-jiejin-sword');

            // --- defs：渐变 / 剑身内裁剪 / 分段刻度 ---
            var defs = document.createElementNS(SVGNS, 'defs');

            var frameGrad = document.createElementNS(SVGNS, 'linearGradient');
            frameGrad.setAttribute('id', 'zhaoyun_frame_stroke');
            frameGrad.setAttribute('gradientUnits', 'userSpaceOnUse');
            frameGrad.setAttribute('x1', '0'); frameGrad.setAttribute('y1', '6');
            frameGrad.setAttribute('x2', '0'); frameGrad.setAttribute('y2', '152');
            [['0', '#ffe6b8'], ['0.5', '#d89a4a'], ['1', '#8a4a15']].forEach(function(stop) {
                var s = document.createElementNS(SVGNS, 'stop');
                s.setAttribute('offset', stop[0]);
                s.setAttribute('stop-color', stop[1]);
                frameGrad.appendChild(s);
            });

            var energyGrad = document.createElementNS(SVGNS, 'linearGradient');
            energyGrad.setAttribute('id', 'zhaoyun_energy_grad');
            energyGrad.setAttribute('x1', '0'); energyGrad.setAttribute('y1', '1');
            energyGrad.setAttribute('x2', '0'); energyGrad.setAttribute('y2', '0');
            [['0', '#5c0d00'], ['0.38', '#b32800'], ['0.76', '#ff6a00'], ['1', '#ffc24d']].forEach(function(stop) {
                var s = document.createElementNS(SVGNS, 'stop');
                s.setAttribute('offset', stop[0]);
                s.setAttribute('stop-color', stop[1]);
                energyGrad.appendChild(s);
            });

            var energyGradFull = document.createElementNS(SVGNS, 'linearGradient');
            energyGradFull.setAttribute('id', 'zhaoyun_energy_grad_full');
            energyGradFull.setAttribute('x1', '0'); energyGradFull.setAttribute('y1', '1');
            energyGradFull.setAttribute('x2', '0'); energyGradFull.setAttribute('y2', '0');
            [['0', '#8a1c00'], ['0.3', '#ff6a00'], ['0.7', '#ffb347'], ['1', '#fff2c9']].forEach(function(stop) {
                var s = document.createElementNS(SVGNS, 'stop');
                s.setAttribute('offset', stop[0]);
                s.setAttribute('stop-color', stop[1]);
                energyGradFull.appendChild(s);
            });

            var bladeClip = document.createElementNS(SVGNS, 'clipPath');
            bladeClip.setAttribute('id', 'zhaoyun_blade_clip');
            var clipPathEl = document.createElementNS(SVGNS, 'path');
            clipPathEl.setAttribute('d', 'M30,12 L34.5,17 L34.5,149 L25.5,149 L25.5,17 Z');
            bladeClip.appendChild(clipPathEl);

            defs.appendChild(frameGrad);
            defs.appendChild(energyGrad);
            defs.appendChild(energyGradFull);
            defs.appendChild(bladeClip);
            svg.appendChild(defs);

            // --- 剑脊（淡淡中脊线） ---
            var ridge = document.createElementNS(SVGNS, 'line');
            ridge.setAttribute('x1', '30'); ridge.setAttribute('y1', '10');
            ridge.setAttribute('x2', '30'); ridge.setAttribute('y2', '151');
            ridge.setAttribute('stroke', 'rgba(255,255,255,0.10)');
            ridge.setAttribute('stroke-width', '1.4');
            svg.appendChild(ridge);

            // --- 剑身：矩形空心边框（顶部切角成尖），框内即能量条 ---
            var blade = document.createElementNS(SVGNS, 'path');
            blade.setAttribute('d', 'M30,6 L37,14 L37,152 L23,152 L23,14 Z');
            blade.setAttribute('fill', 'none');
            blade.setAttribute('stroke', 'url(#zhaoyun_frame_stroke)');
            blade.setAttribute('stroke-width', '2.2');
            blade.setAttribute('stroke-linejoin', 'round');
            svg.appendChild(blade);

            // --- 剑格（护手，收窄至约 0.8 倍） ---
            var guard = document.createElementNS(SVGNS, 'path');
            guard.setAttribute('d', 'M17,152 L43,152 L46,160 L14,160 Z');
            guard.setAttribute('fill', '#17100a');
            guard.setAttribute('stroke', '#c98a44');
            guard.setAttribute('stroke-width', '1.6');
            guard.setAttribute('stroke-linejoin', 'round');
            svg.appendChild(guard);
            var guardLine = document.createElementNS(SVGNS, 'line');
            guardLine.setAttribute('x1', '17'); guardLine.setAttribute('y1', '154');
            guardLine.setAttribute('x2', '43'); guardLine.setAttribute('y2', '154');
            guardLine.setAttribute('stroke', '#c98a44');
            guardLine.setAttribute('stroke-width', '1');
            guardLine.setAttribute('opacity', '0.5');
            svg.appendChild(guardLine);

            // --- 剑柄（较短）与缠带 ---
            var grip = document.createElementNS(SVGNS, 'rect');
            grip.setAttribute('x', '26.6'); grip.setAttribute('y', '160');
            grip.setAttribute('width', '6.8'); grip.setAttribute('height', '26');
            grip.setAttribute('rx', '2');
            grip.setAttribute('fill', '#17100a');
            grip.setAttribute('stroke', '#c98a44');
            grip.setAttribute('stroke-width', '1.4');
            svg.appendChild(grip);
            [167, 179].forEach(function(by) {
                var band = document.createElementNS(SVGNS, 'line');
                band.setAttribute('x1', '26.6'); band.setAttribute('y1', by);
                band.setAttribute('x2', '33.4'); band.setAttribute('y2', by);
                band.setAttribute('stroke', '#e0a861');
                band.setAttribute('stroke-width', '1');
                band.setAttribute('opacity', '0.8');
                svg.appendChild(band);
            });

            // --- 剑首 ---
            var pommel = document.createElementNS(SVGNS, 'ellipse');
            pommel.setAttribute('cx', '30'); pommel.setAttribute('cy', '190.5');
            pommel.setAttribute('rx', '5.5'); pommel.setAttribute('ry', '4.5');
            pommel.setAttribute('fill', '#17100a');
            pommel.setAttribute('stroke', '#c98a44');
            pommel.setAttribute('stroke-width', '1.4');
            svg.appendChild(pommel);
            var pommelCore = document.createElementNS(SVGNS, 'ellipse');
            pommelCore.setAttribute('cx', '30'); pommelCore.setAttribute('cy', '189.5');
            pommelCore.setAttribute('rx', '2.6'); pommelCore.setAttribute('ry', '2');
            pommelCore.setAttribute('fill', '#e0a861');
            pommelCore.setAttribute('opacity', '0.85');
            svg.appendChild(pommelCore);

            // --- 能量层：裁剪进剑身内部（剑身=框，内部=能量条） ---
            var energyGroup = document.createElementNS(SVGNS, 'g');
            energyGroup.setAttribute('clip-path', 'url(#zhaoyun_blade_clip)');

            var energyRect = document.createElementNS(SVGNS, 'rect');
            energyRect.setAttribute('x', '0'); energyRect.setAttribute('y', '150');
            energyRect.setAttribute('width', '60'); energyRect.setAttribute('height', '0');
            energyRect.setAttribute('fill', 'url(#zhaoyun_energy_grad)');

            var frontRect = document.createElementNS(SVGNS, 'rect');
            frontRect.setAttribute('x', '0'); frontRect.setAttribute('y', '0');
            frontRect.setAttribute('width', '60'); frontRect.setAttribute('height', '1.4');
            frontRect.setAttribute('fill', '#fff2c9');
            frontRect.setAttribute('opacity', '0');

            energyGroup.appendChild(energyRect);
            energyGroup.appendChild(frontRect);

            // 6 条分段刻度线：位于每格边界（能量前沿走到哪一格，就正好停在哪条刻度线上，不溢出）
            for (var tk = 1; tk <= 6; tk++) {
                var ty = (149 - tk * 137 / 7).toFixed(2);
                var tl = document.createElementNS(SVGNS, 'line');
                tl.setAttribute('x1', '25.5'); tl.setAttribute('y1', ty);
                tl.setAttribute('x2', '34.5'); tl.setAttribute('y2', ty);
                tl.setAttribute('stroke', 'rgba(0,0,0,0.55)');
                tl.setAttribute('stroke-width', '1');
                energyGroup.appendChild(tl);
            }

            svg.appendChild(energyGroup);

            // --- 火星粒子 ---
            var embers = document.createElement('div');
            embers.className = 'zhaoyun-jiejin-ember';
            for (var i = 0; i < 10; i++) {
                var e = document.createElement('i');
                e.style.left = (Math.random() * 100) + '%';
                e.style.bottom = (Math.random() * 35) + '%';
                var s = (1.5 + Math.random() * 1.5).toFixed(1);
                e.style.width = e.style.height = s + 'px';
                e.style.setProperty('--dx', (Math.random() * 28 - 14) + 'px');
                e.style.animationDelay = (Math.random() * 2.2) + 's';
                e.style.animationDuration = (1.6 + Math.random() * 1.4) + 's';
                embers.appendChild(e);
            }

            wrap.appendChild(glow);
            wrap.appendChild(text);
            wrap.appendChild(svg);
            wrap.appendChild(embers);

            // 【关键】：挂载到 player 节点而不是 ui.arena
            player.appendChild(wrap);
            player.zhaoyunJiejinBar = { wrap: wrap, svg: svg, energyRect: energyRect, frontRect: frontRect, glow: glow, text: text, embers: embers };

            // 能量刷新函数（剑身内能量条：自剑格向剑尖平滑填充，easeOut 缓动）
            var BLADE_INNER_TOP = 12, BLADE_INNER_BOTTOM = 149, BLADE_INNER_H = 137;
            var curFront = BLADE_INNER_BOTTOM; // 当前显示的能量前沿 y 坐标
            function applyFront(frontY, percent, isFull) {
                energyRect.setAttribute('y', frontY.toFixed(2));
                energyRect.setAttribute('height', (BLADE_INNER_BOTTOM - frontY).toFixed(2));
                frontRect.setAttribute('y', (frontY - 1.4).toFixed(2));
                frontRect.setAttribute('opacity', percent > 0 ? '0.95' : '0');
                energyRect.setAttribute('fill', isFull ? 'url(#zhaoyun_energy_grad_full)' : 'url(#zhaoyun_energy_grad)');
            }
            player.zhaoyunJiejinBar.update = function(percent, isFull) {
                var self = this;
                var targetFront = BLADE_INNER_BOTTOM - BLADE_INNER_H * percent / 100;
                if (self._animId) cancelAnimationFrame(self._animId);
                var from = curFront;
                var start = null;
                var DUR = 500; // 平滑时长（毫秒）
                function tick(ts) {
                    if (start == null) start = ts;
                    var t = Math.min(1, (ts - start) / DUR);
                    var e = 1 - Math.pow(1 - t, 3); // easeOutCubic：先快后缓，消除生硬感
                    curFront = from + (targetFront - from) * e;
                    applyFront(curFront, percent, isFull);
                    if (t < 1) {
                        self._animId = requestAnimationFrame(tick);
                    } else {
                        self._animId = null;
                        curFront = targetFront;
                    }
                }
                self._animId = requestAnimationFrame(tick);
            };

            // 初始刷新一次
            var initMark = player.countMark('sgz_jiejin');
            var initPercent = Math.max(0, Math.min(100, Math.round(initMark / 7 * 100)));
            var initFull = initMark >= 7;
            player.zhaoyunJiejinBar.update(initPercent, initFull);
            glow.style.height = Math.min(initPercent * 0.62, 62) + '%';
            text.innerHTML = '劫烬 ' + initMark + '/7';
            if (initFull) wrap.classList.add('full');
        }
    },
    content: function() {
        var bar = player.zhaoyunJiejinBar;
        if (!bar) return;
        var mark = player.countMark('sgz_jiejin');
        var percent = Math.max(0, Math.min(100, Math.round(mark / 7 * 100)));
        var isFull = mark >= 7;
        bar.glow.style.height = Math.min(percent * 0.62, 62) + '%';
        bar.text.innerHTML = '劫烬 ' + mark + '/7';
        if (isFull) {
            if (!bar.wrap.classList.contains('full')) bar.wrap.classList.add('full');
        } else {
            bar.wrap.classList.remove('full');
        }
        if (bar.update) bar.update(percent, isFull);
    },
    onremove: function(player) {
        if (player.zhaoyunJiejinBar) {
            if (player.zhaoyunJiejinBar._animId) cancelAnimationFrame(player.zhaoyunJiejinBar._animId);
            player.zhaoyunJiejinBar.wrap.remove();
            delete player.zhaoyunJiejinBar;
        }
    }
};