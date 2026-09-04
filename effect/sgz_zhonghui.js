// ===== 梦钟会 · 权患双生计量 UI（剑身=权能量条，护手圆珠=患核，纯表现层，无游戏规则） =====
// 由 character/sgz_zhonghui.js 通过 import { zhonghuiUI } 挂载回 skills 中
export const zhonghuiUI = {
    charlotte: true,
    trigger: {
        player: ["enterGame", "addMark", "removeMark"],
        global: ["gameStart", "roundStart", "phaseBegin"]
    },
    forced: true,
    silent: true,
    priority: -10,
    init: function(player) {
        // 1. 注入样式
        if (!document.getElementById('zhonghui_gauge_style')) {
            var style = document.createElement('style');
            style.id = 'zhonghui_gauge_style';
            style.innerHTML = `
                /* 容器：挂载在武将牌节点上，绝对定位到右侧 */
                .zhonghui-gauge-wrap {
                    position: absolute; left: 100%; bottom: 0;
                    margin-left: 2px; width: 53px; height: 100%;
                    z-index: 60; pointer-events: none;
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                }
                /* 剑形权患计量（剑身=权，护手圆珠=患） */
                .zhonghui-quan-sword {
                    width: 100%; height: auto; flex: none;
                    transition: filter 0.4s;
                }
                /* 平滑换色（JS 驱动颜色插值 + CSS 过渡收尾，避免换档跳变） */
                .zhonghui-quan-sword .orb-fill,
                .zhonghui-quan-sword .orb-ring,
                .zhonghui-quan-sword .huan-num,
                .zhonghui-quan-sword .huan-text,
                .zhonghui-quan-sword .blade-fill,
                .zhonghui-quan-sword .blade-front,
                .zhonghui-quan-sword .flame {
                    transition: fill 0.45s, stroke 0.45s;
                }
                /* 剑身内部流光（斜向光带往复） */
                .zhonghui-quan-sword .blade-shimmer {
                    animation: zh-shimmer 2.4s infinite linear;
                }
                @keyframes zh-shimmer {
                    from { transform: translateX(-24px); }
                    to { transform: translateX(24px); }
                }
                /* 护手圆珠边框燃火（患 >2 显现） */
                .zhonghui-quan-sword .flame { opacity: 0; }
                .zhonghui-gauge-wrap[data-tier="1"] .flame,
                .zhonghui-gauge-wrap[data-tier="2"] .flame,
                .zhonghui-gauge-wrap[data-tier="3"] .flame {
                    opacity: 1;
                    animation: zh-flame-flick 1.15s infinite ease-in-out;
                    transform-origin: 50% 100%; transform-box: fill-box;
                }
                @keyframes zh-flame-flick {
                    0%, 100% { transform: scale(1); opacity: 0.8; }
                    30% { transform: scale(1.28); opacity: 1; }
                    65% { transform: scale(0.86); opacity: 0.6; }
                }
                /* 患 危势光效（颜色由 JS 平滑渐变，此处只管光晕/脉冲/粒子） */
                .zhonghui-gauge-wrap[data-tier="0"] .zhonghui-quan-sword { filter: drop-shadow(0 0 3px rgba(96,116,136,0.35)); }
                .zhonghui-gauge-wrap[data-tier="1"] .zhonghui-quan-sword { filter: drop-shadow(0 0 5px rgba(170,90,35,0.5)); }
                .zhonghui-gauge-wrap[data-tier="2"] .zhonghui-quan-sword {
                    filter: drop-shadow(0 0 7px rgba(190,70,30,0.6));
                    animation: zh-danger-pulse 1.3s infinite ease-in-out;
                }
                .zhonghui-gauge-wrap[data-tier="3"] .zhonghui-quan-sword {
                    filter: drop-shadow(0 0 9px rgba(200,50,25,0.75));
                    animation: zh-danger-pulse 0.85s infinite ease-in-out;
                }
                @keyframes zh-danger-pulse {
                    0%, 100% { filter: drop-shadow(0 0 7px rgba(190,70,40,0.6)); }
                    50% { filter: drop-shadow(0 0 13px rgba(220,60,35,0.9)); }
                }
                /* ========== 权满 4 特效（多重联动） ========== */
                /* 1) 护手圆珠外圈迸发光环（震荡波） */
                .zhonghui-quan-sword .full-pulse {
                    opacity: 0;
                }
                .zhonghui-gauge-wrap.quan-full .zhonghui-quan-sword .full-pulse {
                    animation: zh-full-pulse 2.2s infinite ease-out;
                    transform-origin: center; transform-box: fill-box;
                }
                @keyframes zh-full-pulse {
                    0% { transform: scale(0.5); opacity: 0.55; }
                    70% { transform: scale(2.1); opacity: 0.12; }
                    100% { transform: scale(2.4); opacity: 0; }
                }
                /* 2) 沿剑身上升的金色星流 */
                .zhonghui-full-stream {
                    position: absolute; left: 0; top: 0; width: 100%; height: 62%;
                    z-index: 5; pointer-events: none; display: none;
                }
                .zhonghui-full-stream i {
                    position: absolute; left: 50%;
                    width: 2.2px; height: 2.2px;
                    background: radial-gradient(circle, #ffffff 0%, #ffdf9a 55%, rgba(255,220,150,0) 100%);
                    border-radius: 50%; opacity: 0;
                    filter: blur(0.4px) drop-shadow(0 0 4px #ffcf6a);
                    animation: zh-full-stream 1.6s infinite ease-out;
                }
                @keyframes zh-full-stream {
                    0% { transform: translateX(-50%) translateY(0); opacity: 0; }
                    12% { opacity: 0.9; }
                    100% { transform: translateX(calc(-50% + var(--dx, 0px))) translateY(-120px); opacity: 0; }
                }
                .zhonghui-gauge-wrap.quan-full .zhonghui-full-stream { display: block; }
                /* 3) 金光星尘爆散 */
                .zhonghui-full-spark {
                    position: absolute; left: 0; top: 0; width: 100%; height: 100%;
                    z-index: 5; pointer-events: none; display: none;
                }
                .zhonghui-full-spark i {
                    position: absolute;
                    background: radial-gradient(circle, #ffffff 0%, #ffe2a0 55%, rgba(255,220,150,0) 100%);
                    border-radius: 50%; opacity: 0;
                    animation: zh-spark-burst 2.2s infinite ease-out;
                }
                @keyframes zh-spark-burst {
                    0%, 70%, 100% { opacity: 0; transform: scale(0.4); }
                    74% { opacity: 1; transform: scale(1.8); }
                    82% { opacity: 0; transform: scale(0.6); }
                }
                .zhonghui-gauge-wrap.quan-full .zhonghui-full-spark { display: block; }
                /* 患核 10+：劫火星尘 */
                .zhonghui-huan-ember {
                    position: absolute; left: 0; bottom: 24%; width: 100%; height: 36%;
                    z-index: 5; pointer-events: none; display: none;
                }
                .zhonghui-huan-ember i {
                    position: absolute;
                    background: radial-gradient(circle, #ffd9a0 0%, #c8501f 55%, rgba(200,80,30,0) 100%);
                    border-radius: 50%; opacity: 0;
                    filter: blur(0.5px) drop-shadow(0 0 4px #b03a12);
                    animation: zh-ember-fly 1.8s infinite ease-out;
                }
                @keyframes zh-ember-fly {
                    0% { transform: translate(0, 0) scale(1); opacity: 0; }
                    15% { opacity: 0.8; }
                    100% { transform: translate(var(--dx, 0px), -80px) scale(0.3); opacity: 0; }
                }
                .zhonghui-gauge-wrap[data-tier="3"] .zhonghui-huan-ember { display: block; }
            `;
            document.head.appendChild(style);
        }

        // 2. 构建 UI（剑形：剑身=权能量条，护手圆珠=患核）
        if (!player.zhonghuiGauge) {
            var wrap = document.createElement('div');
            wrap.className = 'zhonghui-gauge-wrap';
            wrap.setAttribute('data-tier', '0');

            var SVGNS = 'http://www.w3.org/2000/svg';
            var linearG = function(id, stops) {
                var g = document.createElementNS(SVGNS, 'linearGradient');
                g.setAttribute('id', id);
                g.setAttribute('x1', '0'); g.setAttribute('y1', '1');
                g.setAttribute('x2', '0'); g.setAttribute('y2', '0');
                stops.forEach(function(s) {
                    var st = document.createElementNS(SVGNS, 'stop');
                    st.setAttribute('offset', s[0]);
                    st.setAttribute('stop-color', s[1]);
                    g.appendChild(st);
                });
                return g;
            };
            var linearH = function(id, stops) {
                var g = document.createElementNS(SVGNS, 'linearGradient');
                g.setAttribute('id', id);
                g.setAttribute('x1', '0'); g.setAttribute('y1', '0');
                g.setAttribute('x2', '1'); g.setAttribute('y2', '0');
                stops.forEach(function(s) {
                    var st = document.createElementNS(SVGNS, 'stop');
                    st.setAttribute('offset', s[0]);
                    st.setAttribute('stop-color', s[1]);
                    g.appendChild(st);
                });
                return g;
            };
            var linearHU = function(id, stops) {
                var g = document.createElementNS(SVGNS, 'linearGradient');
                g.setAttribute('id', id);
                g.setAttribute('gradientUnits', 'userSpaceOnUse');
                g.setAttribute('x1', '0'); g.setAttribute('y1', '6');
                g.setAttribute('x2', '0'); g.setAttribute('y2', '134');
                stops.forEach(function(s) {
                    var st = document.createElementNS(SVGNS, 'stop');
                    st.setAttribute('offset', s[0]);
                    st.setAttribute('stop-color', s[1]);
                    g.appendChild(st);
                });
                return g;
            };

            var sword = document.createElementNS(SVGNS, 'svg');
            sword.setAttribute('viewBox', '0 0 60 205');
            sword.setAttribute('class', 'zhonghui-quan-sword');
            var defs = document.createElementNS(SVGNS, 'defs');
            // 剑框：暗古金
            defs.appendChild(linearHU('zh_frame_grad', [['0', '#d4b060'], ['0.5', '#9a7428'], ['1', '#5f4512']]));
            // 剑身能量层次：顶部提亮 / 两侧暗棱 / 中轴高光 / 斜向流光
            defs.appendChild(linearG('zh_bright', [['0', 'rgba(255,255,255,0)'], ['1', 'rgba(255,255,255,0.42)']]));
            defs.appendChild(linearH('zh_bevel', [['0', 'rgba(0,0,0,0.5)'], ['0.5', 'rgba(0,0,0,0)'], ['1', 'rgba(0,0,0,0.5)']]));
            defs.appendChild(linearH('zh_axis', [['0', 'rgba(255,255,255,0)'], ['0.45', 'rgba(255,255,255,0.16)'], ['0.55', 'rgba(255,255,255,0.16)'], ['1', 'rgba(255,255,255,0)']]));
            var shimmerG = document.createElementNS(SVGNS, 'linearGradient');
            shimmerG.setAttribute('id', 'zh_shimmer');
            shimmerG.setAttribute('gradientUnits', 'userSpaceOnUse');
            shimmerG.setAttribute('x1', '0'); shimmerG.setAttribute('y1', '0');
            shimmerG.setAttribute('x2', '28'); shimmerG.setAttribute('y2', '28');
            shimmerG.setAttribute('spreadMethod', 'repeat');
            [['0', 'rgba(255,255,255,0)'], ['0.42', 'rgba(255,255,255,0)'], ['0.46', 'rgba(255,255,255,0.14)'], ['0.54', 'rgba(255,255,255,0.14)'], ['0.58', 'rgba(255,255,255,0)'], ['1', 'rgba(255,255,255,0)']].forEach(function(s) {
                var st = document.createElementNS(SVGNS, 'stop');
                st.setAttribute('offset', s[0]);
                st.setAttribute('stop-color', s[1]);
                shimmerG.appendChild(st);
            });
            defs.appendChild(shimmerG);
            // 剑身内部裁剪（含剑尖：能量可充满尖尖）
            var bladeClip = document.createElementNS(SVGNS, 'clipPath');
            bladeClip.setAttribute('id', 'zh_blade_clip');
            var clipPathEl = document.createElementNS(SVGNS, 'path');
            clipPathEl.setAttribute('d', 'M30,12 L34.5,17 L34.5,131 L25.5,131 L25.5,17 Z');
            bladeClip.appendChild(clipPathEl);
            defs.appendChild(bladeClip);
            // 已充能区域裁剪（纹理/提亮只作用于能量填充部分，未充能区域保持全透明）
            var fillClip = document.createElementNS(SVGNS, 'clipPath');
            fillClip.setAttribute('id', 'zh_fill_clip');
            var fillClipRect = document.createElementNS(SVGNS, 'rect');
            fillClipRect.setAttribute('x', '0'); fillClipRect.setAttribute('y', '131');
            fillClipRect.setAttribute('width', '60'); fillClipRect.setAttribute('height', '0');
            fillClip.appendChild(fillClipRect);
            defs.appendChild(fillClip);
            sword.appendChild(defs);

            // 剑脊
            var ridge = document.createElementNS(SVGNS, 'line');
            ridge.setAttribute('x1', '30'); ridge.setAttribute('y1', '10');
            ridge.setAttribute('x2', '30'); ridge.setAttribute('y2', '133');
            ridge.setAttribute('stroke', 'rgba(255,255,255,0.08)');
            ridge.setAttribute('stroke-width', '1.4');
            sword.appendChild(ridge);

            // 剑身（矩形空心边框，顶部切角成尖）
            var blade = document.createElementNS(SVGNS, 'path');
            blade.setAttribute('d', 'M30,6 L37,14 L37,134 L23,134 L23,14 Z');
            blade.setAttribute('fill', 'none');
            blade.setAttribute('stroke', 'url(#zh_frame_grad)');
            blade.setAttribute('stroke-width', '2.2');
            blade.setAttribute('stroke-linejoin', 'round');
            sword.appendChild(blade);

            // 权能量层（含剑尖裁剪）：底色 + 提亮 + 暗棱 + 中轴高光 + 流光 + 前沿
            // 未充能部分完全透明：能量与纹理全部裁剪在"已充能区域"内
            var bladeGroup = document.createElementNS(SVGNS, 'g');
            bladeGroup.setAttribute('clip-path', 'url(#zh_blade_clip)');
            var fillGroup = document.createElementNS(SVGNS, 'g');
            fillGroup.setAttribute('clip-path', 'url(#zh_fill_clip)');
            var bladeFill = document.createElementNS(SVGNS, 'rect');
            bladeFill.setAttribute('x', '0'); bladeFill.setAttribute('y', '0');
            bladeFill.setAttribute('width', '60'); bladeFill.setAttribute('height', '140');
            bladeFill.setAttribute('class', 'blade-fill');
            var bladeBright = document.createElementNS(SVGNS, 'rect');
            bladeBright.setAttribute('x', '0'); bladeBright.setAttribute('y', '0');
            bladeBright.setAttribute('width', '60'); bladeBright.setAttribute('height', '140');
            bladeBright.setAttribute('fill', 'url(#zh_bright)');
            var bladeBevel = document.createElementNS(SVGNS, 'rect');
            bladeBevel.setAttribute('x', '0'); bladeBevel.setAttribute('y', '0');
            bladeBevel.setAttribute('width', '60'); bladeBevel.setAttribute('height', '140');
            bladeBevel.setAttribute('fill', 'url(#zh_bevel)');
            var bladeAxis = document.createElementNS(SVGNS, 'rect');
            bladeAxis.setAttribute('x', '0'); bladeAxis.setAttribute('y', '0');
            bladeAxis.setAttribute('width', '60'); bladeAxis.setAttribute('height', '140');
            bladeAxis.setAttribute('fill', 'url(#zh_axis)');
            var bladeShimmer = document.createElementNS(SVGNS, 'rect');
            bladeShimmer.setAttribute('x', '0'); bladeShimmer.setAttribute('y', '0');
            bladeShimmer.setAttribute('width', '60'); bladeShimmer.setAttribute('height', '140');
            bladeShimmer.setAttribute('fill', 'url(#zh_shimmer)');
            bladeShimmer.setAttribute('class', 'blade-shimmer');
            var bladeFront = document.createElementNS(SVGNS, 'rect');
            bladeFront.setAttribute('x', '0'); bladeFront.setAttribute('y', '0');
            bladeFront.setAttribute('width', '60'); bladeFront.setAttribute('height', '2');
            bladeFront.setAttribute('fill', '#c9d4dd');
            bladeFront.setAttribute('opacity', '0');
            bladeFront.setAttribute('class', 'blade-front');
            fillGroup.appendChild(bladeFill);
            fillGroup.appendChild(bladeBright);
            fillGroup.appendChild(bladeBevel);
            fillGroup.appendChild(bladeAxis);
            fillGroup.appendChild(bladeShimmer);
            bladeGroup.appendChild(fillGroup);
            bladeGroup.appendChild(bladeFront);
            sword.appendChild(bladeGroup);

            // 3 条刻度线（4 格边界，能量前沿停靠处）
            [101.25, 71.5, 41.75].forEach(function(ty) {
                var tl = document.createElementNS(SVGNS, 'line');
                tl.setAttribute('x1', '25.5'); tl.setAttribute('y1', ty);
                tl.setAttribute('x2', '34.5'); tl.setAttribute('y2', ty);
                tl.setAttribute('stroke', 'rgba(0,0,0,0.5)');
                tl.setAttribute('stroke-width', '1');
                sword.appendChild(tl);
            });

            // ---- 护手：古铜饰框边栏（缩小纯色圆珠面积） ----
            var frameOuter = document.createElementNS(SVGNS, 'circle');
            frameOuter.setAttribute('cx', '30'); frameOuter.setAttribute('cy', '151');
            frameOuter.setAttribute('r', '21'); frameOuter.setAttribute('stroke-width', '1.2');
            frameOuter.setAttribute('fill', 'none');
            frameOuter.setAttribute('stroke', '#6b5230');
            var frameMid = document.createElementNS(SVGNS, 'circle');
            frameMid.setAttribute('cx', '30'); frameMid.setAttribute('cy', '151');
            frameMid.setAttribute('r', '19'); frameMid.setAttribute('stroke-width', '0.8');
            frameMid.setAttribute('fill', 'none');
            frameMid.setAttribute('stroke', 'rgba(107,82,48,0.45)');
            sword.appendChild(frameOuter);
            sword.appendChild(frameMid);
            for (var fa = 0; fa < 8; fa++) {
                var ang = fa * 45 * Math.PI / 180;
                var x = 30 + Math.cos(ang) * 21;
                var y = 151 + Math.sin(ang) * 21;
                var dia = document.createElementNS(SVGNS, 'path');
                dia.setAttribute('d', 'M' + x.toFixed(1) + ',' + (y - 2.6).toFixed(1) + ' L' + (x + 2.6).toFixed(1) + ',' + y.toFixed(1) + ' L' + x.toFixed(1) + ',' + (y + 2.6).toFixed(1) + ' L' + (x - 2.6).toFixed(1) + ',' + y.toFixed(1) + ' Z');
                dia.setAttribute('fill', '#6b5230');
                sword.appendChild(dia);
                var ang2 = (fa * 45 + 22.5) * Math.PI / 180;
                var dot = document.createElementNS(SVGNS, 'circle');
                dot.setAttribute('cx', (30 + Math.cos(ang2) * 21).toFixed(1));
                dot.setAttribute('cy', (151 + Math.sin(ang2) * 21).toFixed(1));
                dot.setAttribute('r', '1.1');
                dot.setAttribute('fill', '#4a3a20');
                sword.appendChild(dot);
            }

            // 圆珠患核（纯色，JS 平滑变色）
            var orbRing = document.createElementNS(SVGNS, 'circle');
            orbRing.setAttribute('cx', '30'); orbRing.setAttribute('cy', '151');
            orbRing.setAttribute('r', '16.8'); orbRing.setAttribute('stroke-width', '2');
            orbRing.setAttribute('fill', 'none');
            orbRing.setAttribute('stroke', '#5a6a7a');
            orbRing.setAttribute('class', 'orb-ring');
            var orbFill = document.createElementNS(SVGNS, 'circle');
            orbFill.setAttribute('cx', '30'); orbFill.setAttribute('cy', '151');
            orbFill.setAttribute('r', '15.5');
            orbFill.setAttribute('fill', '#4a5560');
            orbFill.setAttribute('stroke', 'rgba(0,0,0,0.4)');
            orbFill.setAttribute('stroke-width', '1');
            orbFill.setAttribute('class', 'orb-fill');
            var orbShine = document.createElementNS(SVGNS, 'ellipse');
            orbShine.setAttribute('cx', '25'); orbShine.setAttribute('cy', '145');
            orbShine.setAttribute('rx', '5'); orbShine.setAttribute('ry', '3');
            orbShine.setAttribute('fill', 'rgba(255,255,255,0.16)');
            orbShine.setAttribute('transform', 'rotate(-25 25 145)');
            var huanLabel = document.createElementNS(SVGNS, 'text');
            huanLabel.setAttribute('x', '30'); huanLabel.setAttribute('y', '147');
            huanLabel.setAttribute('font-size', '7.5');
            huanLabel.setAttribute('text-anchor', 'middle');
            huanLabel.setAttribute('class', 'huan-text');
            huanLabel.textContent = '患';
            var huanNum = document.createElementNS(SVGNS, 'text');
            huanNum.setAttribute('x', '30'); huanNum.setAttribute('y', '162');
            huanNum.setAttribute('font-size', '17');
            huanNum.setAttribute('font-weight', 'bold');
            huanNum.setAttribute('text-anchor', 'middle');
            huanNum.setAttribute('class', 'huan-num');
            huanNum.textContent = '0';
            sword.appendChild(orbRing);
            sword.appendChild(orbFill);
            sword.appendChild(orbShine);
            sword.appendChild(huanLabel);
            sword.appendChild(huanNum);

            // 边框燃火（患 >2 显现）：8 团焰舌环绕饰框外缘
            var flamePaths = [];
            for (var fi = 0; fi < 8; fi++) {
                var fg = document.createElementNS(SVGNS, 'g');
                fg.setAttribute('transform', 'rotate(' + (fi * 45) + ', 30, 151)');
                var fp = document.createElementNS(SVGNS, 'path');
                fp.setAttribute('d', 'M30,122 C32.6,127 33,130.5 31.6,132.4 C30.9,133.3 29.1,133.3 28.4,132.4 C27,130.5 27.4,127 30,122 Z');
                fp.setAttribute('class', 'flame');
                fp.setAttribute('fill', '#a8481c');
                fp.style.animationDelay = (fi * 0.37) + 's';
                fg.appendChild(fp);
                sword.appendChild(fg);
                flamePaths.push(fp);
            }

            // 剑柄（短柄 + 缠带）
            var grip = document.createElementNS(SVGNS, 'rect');
            grip.setAttribute('x', '26'); grip.setAttribute('y', '168');
            grip.setAttribute('width', '8'); grip.setAttribute('height', '24');
            grip.setAttribute('rx', '2');
            grip.setAttribute('fill', '#14100c');
            grip.setAttribute('stroke', '#8a6a3c');
            grip.setAttribute('stroke-width', '1.3');
            sword.appendChild(grip);
            [176, 185].forEach(function(by) {
                var band = document.createElementNS(SVGNS, 'line');
                band.setAttribute('x1', '26'); band.setAttribute('y1', by);
                band.setAttribute('x2', '34'); band.setAttribute('y2', by);
                band.setAttribute('stroke', '#b8913f');
                band.setAttribute('stroke-width', '1');
                band.setAttribute('opacity', '0.8');
                sword.appendChild(band);
            });
            // 剑首
            var pommel = document.createElementNS(SVGNS, 'ellipse');
            pommel.setAttribute('cx', '30'); pommel.setAttribute('cy', '195.5');
            pommel.setAttribute('rx', '5.5'); pommel.setAttribute('ry', '4.5');
            pommel.setAttribute('fill', '#14100c');
            pommel.setAttribute('stroke', '#8a6a3c');
            pommel.setAttribute('stroke-width', '1.3');
            sword.appendChild(pommel);
            var pommelCore = document.createElementNS(SVGNS, 'ellipse');
            pommelCore.setAttribute('cx', '30'); pommelCore.setAttribute('cy', '194.5');
            pommelCore.setAttribute('rx', '2.4'); pommelCore.setAttribute('ry', '1.8');
            pommelCore.setAttribute('fill', '#b8913f');
            pommelCore.setAttribute('opacity', '0.85');
            sword.appendChild(pommelCore);

            // ---- 权满 4 特效层 ----
            // 震荡光环（护手外圈）
            var fullPulse = document.createElementNS(SVGNS, 'circle');
            fullPulse.setAttribute('cx', '30'); fullPulse.setAttribute('cy', '151');
            fullPulse.setAttribute('r', '16.8'); fullPulse.setAttribute('stroke-width', '2');
            fullPulse.setAttribute('fill', 'none');
            fullPulse.setAttribute('stroke', '#ffd9a0');
            fullPulse.setAttribute('class', 'full-pulse');
            fullPulse.setAttribute('opacity', '0');
            sword.appendChild(fullPulse);
            // 金色星流层（权满 4，沿剑身上升）
            var stream = document.createElement('div');
            stream.className = 'zhonghui-full-stream';
            for (var ti = 0; ti < 5; ti++) {
                var st = document.createElement('i');
                st.style.bottom = (10 + Math.random() * 50) + '%';
                st.style.setProperty('--dx', (Math.random() * 16 - 8) + 'px');
                st.style.animationDelay = (Math.random() * 1.6) + 's';
                st.style.animationDuration = (1.3 + Math.random() * 0.7) + 's';
                stream.appendChild(st);
            }
            // 金光星尘爆散层（权满 4）
            var spark = document.createElement('div');
            spark.className = 'zhonghui-full-spark';
            for (var si = 0; si < 10; si++) {
                var sp = document.createElement('i');
                sp.style.left = (Math.random() * 100) + '%';
                sp.style.top = (Math.random() * 80) + '%';
                var ss = (1.8 + Math.random() * 2.4).toFixed(1);
                sp.style.width = sp.style.height = ss + 'px';
                sp.style.animationDelay = (Math.random() * 2.2) + 's';
                spark.appendChild(sp);
            }
            // 劫火星尘层（患 10+）
            var embers = document.createElement('div');
            embers.className = 'zhonghui-huan-ember';
            for (var ei = 0; ei < 8; ei++) {
                var e = document.createElement('i');
                e.style.left = (Math.random() * 100) + '%';
                e.style.bottom = (Math.random() * 30) + '%';
                var es = (1.5 + Math.random() * 1.5).toFixed(1);
                e.style.width = e.style.height = es + 'px';
                e.style.setProperty('--dx', (Math.random() * 24 - 12) + 'px');
                e.style.animationDelay = (Math.random() * 1.8) + 's';
                e.style.animationDuration = (1.2 + Math.random() * 1.4) + 's';
                embers.appendChild(e);
            }

            wrap.appendChild(sword);
            wrap.appendChild(stream);
            wrap.appendChild(spark);
            wrap.appendChild(embers);

            // 【关键】：挂载到 player 节点而不是 ui.arena
            player.appendChild(wrap);
            player.zhonghuiGauge = { wrap: wrap, sword: sword, bladeFill: bladeFill, bladeFront: bladeFront, orbFill: orbFill, orbRing: orbRing, huanNum: huanNum, huanLabel: huanLabel, flamePaths: flamePaths, embers: embers };

            // 颜色插值工具（深色系，随患数连续渐变，消除换档跳变）
            var mixHex = function(a, b, t) {
                var ra = parseInt(a.slice(1, 3), 16), ga = parseInt(a.slice(3, 5), 16), ba = parseInt(a.slice(5, 7), 16);
                var rb = parseInt(b.slice(1, 3), 16), gb = parseInt(b.slice(3, 5), 16), bb = parseInt(b.slice(5, 7), 16);
                return 'rgb(' + Math.round(ra + (rb - ra) * t) + ',' + Math.round(ga + (gb - ga) * t) + ',' + Math.round(ba + (bb - ba) * t) + ')';
            };
            var tierColor = function(anchors, v) {
                if (v <= anchors[0][0]) return anchors[0][1];
                for (var i = 1; i < anchors.length; i++) {
                    if (v <= anchors[i][0]) {
                        var lo = anchors[i - 1][0], hi = anchors[i][0];
                        return mixHex(anchors[i - 1][1], anchors[i][1], (v - lo) / (hi - lo));
                    }
                }
                return anchors[anchors.length - 1][1];
            };
            // 血液系锚点（更鲜红、更沉重凝血感）：0 暗铁血 → 2 暗血 → 3 深血 → 4+ 鲜血
            var ORB_ANCHORS = [[0, '#4a3436'], [2, '#7d1c14'], [3, '#93180c'], [4, '#b8180a'], [10, '#cf0f04'], [20, '#e00800']];

            // 权：剑身能量平滑填充（easeOut 缓动），满 4 触发特效
            var BLADE_TOP = 12, BLADE_BOTTOM = 131, BLADE_H = 119;
            var bladeCur = BLADE_BOTTOM;
            player.zhonghuiGauge.updateQuan = function(quan, full) {
                var self = this;
                var target = BLADE_BOTTOM - BLADE_H * quan / 4;
                if (self._quanAnim) cancelAnimationFrame(self._quanAnim);
                var from = bladeCur;
                var start = null;
                var DUR = 450;
                bladeFront.setAttribute('opacity', quan > 0 ? '0.9' : '0');
                function tick(ts) {
                    if (start == null) start = ts;
                    var t = Math.min(1, (ts - start) / DUR);
                    var e = 1 - Math.pow(1 - t, 3);
                    bladeCur = from + (target - from) * e;
                    fillClipRect.setAttribute('y', bladeCur.toFixed(2));
                    fillClipRect.setAttribute('height', (BLADE_BOTTOM - bladeCur).toFixed(2));
                    bladeFront.setAttribute('y', (bladeCur - 1.5).toFixed(2));
                    if (t < 1) {
                        self._quanAnim = requestAnimationFrame(tick);
                    } else {
                        self._quanAnim = null;
                        bladeCur = target;
                    }
                }
                self._quanAnim = requestAnimationFrame(tick);
            };
            // 患：数字 + 颜色连续渐变（剑身/圆珠/圆环/文字/火焰同系深色）
            player.zhonghuiGauge.updateHuan = function(huan) {
                huanNum.textContent = huan;
                huanNum.setAttribute('font-size', huan >= 100 ? 11 : huan >= 10 ? 14 : 17);
                var base = tierColor(ORB_ANCHORS, huan);
                orbFill.style.fill = base;
                orbRing.style.stroke = mixHex(base, '#ffffff', 0.22);
                bladeFill.style.fill = base;
                bladeFront.style.fill = mixHex('#c9d4dd', '#e08060', Math.min(1, huan / 10));
                huanNum.style.fill = mixHex('#d8e0e8', '#ffb09a', Math.min(1, huan / 12));
                huanLabel.style.fill = mixHex(base, '#ffffff', 0.45);
                if (huan >= 1) {
                    var fc = mixHex('#a53210', '#e01200', Math.min(1, (huan - 1) / 8));
                    flamePaths.forEach(function(f) { f.style.fill = fc; });
                    // 火焰燃烧速度：患 1→4 逐渐加快，5 及以上保持最快
                    var dur = huan >= 5 ? 0.8 : [1.6, 1.35, 1.1, 0.85][huan - 1];
                    flamePaths.forEach(function(f) { f.style.animationDuration = dur + 's'; });
                }
                wrap.setAttribute('data-tier', huan >= 10 ? 3 : huan >= 6 ? 2 : huan >= 1 ? 1 : 0);
            };

            // 初始刷新一次
            var initQuan = player.countMark('sgz_quanhuan');
            var initHuan = player.countMark('sgz_quanhuan_huan');
            player.zhonghuiGauge.updateQuan(initQuan, initQuan >= 4);
            player.zhonghuiGauge.updateHuan(initHuan);
            wrap.classList.toggle('quan-full', initQuan >= 4);
        }
    },
    content: function() {
        var g = player.zhonghuiGauge;
        if (!g) return;
        var quan = player.countMark('sgz_quanhuan');
        var huan = player.countMark('sgz_quanhuan_huan');
        g.wrap.classList.toggle('quan-full', quan >= 4);
        g.updateHuan(huan);
        g.updateQuan(quan, quan >= 4);
    },
    onremove: function(player) {
        if (player.zhonghuiGauge) {
            if (player.zhonghuiGauge._quanAnim) cancelAnimationFrame(player.zhonghuiGauge._quanAnim);
            player.zhonghuiGauge.wrap.remove();
            delete player.zhonghuiGauge;
        }
    }
};