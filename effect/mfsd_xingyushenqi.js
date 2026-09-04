// ===== 梦星语神器 · 寰宇星图 UI（纯表现层，无游戏规则） =====
// 由 character/mfsd_xingyushenqi.js 的 mfsd_huanyu 技能 init/updateUI 委托调用

export function huanyuInit(player) {
                // 动态插入星星样式（仅全局一次）
                if (!document.getElementById('mfsd_huanyu_star_style')) {
                    var style = document.createElement('style');
                    style.id = 'mfsd_huanyu_star_style';
                    style.innerHTML = `
                    .mfsd-star-wrap{
                        position:absolute; left:100%; top:5%;
                        margin-left:6px; width:50px; height:90%;
                        z-index:60; pointer-events:none;
                    }
                    /* 连接线容器 */
                    .mfsd-star-lines{
                        position:absolute; top:0; left:0; width:100%; height:100%;
                        pointer-events:none;
                    }
                    .mfsd-star{
                        position:absolute;
                        width:14px; height:14px;
                        transform:translate(-50%,-50%) scale(0.7);
                        opacity:0.55; /* 这里控制整体透明度 */
                        transition:all 0.4s;
                    }
                    .mfsd-star::before{
                        content:""; position:absolute; inset:0;
                        clip-path:polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
                        background:#2a3f66; /* 星星本体颜色 */
                        box-shadow:inset 0 0 4px rgba(0,0,0,0.8);
                    }
                    .mfsd-star.active{
                        opacity:1; transform:translate(-50%,-50%) scale(1);
                    }
                    .mfsd-star.active::before{
                        background:radial-gradient(circle,#fff,#7fdcff,#3a7bd5);
                        box-shadow:0 0 10px rgba(120,200,255,1);
                        animation:starTwinkle 2s infinite ease-in-out;
                    }
                    .mfsd-star.current::before{
                        box-shadow:0 0 16px rgba(255,255,255,1);
                    }
                    @keyframes starTwinkle{
                        0%{filter:brightness(1);}
                        50%{filter:brightness(1.6);}
                        100%{filter:brightness(1);}
                    }
                    `;
                    document.head.appendChild(style);
                }

                // 创建每个玩家的星星 UI（只一次）
                if (!player.mfsdStarUI) {
                    var wrap = document.createElement('div');
                    wrap.className = 'mfsd-star-wrap';

                    // 线条层（SVG）
                    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                    svg.setAttribute("class", "mfsd-star-lines");
                    svg.style.position = "absolute";
                    svg.style.top = "0";
                    svg.style.left = "0";
                    svg.style.width = "100%";
                    svg.style.height = "100%";
                    wrap.appendChild(svg);

                    // 9颗星星的不规则坐标（百分比，相对wrap容器）
                    var starPositions = [
                        { left: 40, top: 0 },
                        { left: 10, top: 12 },
                        { left: 5, top: 25 },
                        { left: 50, top: 37 },
                        { left: 45, top: 50 },
                        { left: 20, top: 62 },
                        { left: 10, top: 75 },
                        { left: 10, top: 87 },
                        { left: 25, top: 100 }
                    ];

                    var stars = [];
                    for (var i = 0; i < 9; i++) {
                        var star = document.createElement('div');
                        star.className = 'mfsd-star';
                        star.style.left = starPositions[i].left + '%';
                        star.style.top = starPositions[i].top + '%';
                        // 保存坐标方便画线
                        star.dataset.cx = starPositions[i].left;
                        star.dataset.cy = starPositions[i].top;
                        wrap.appendChild(star);
                        stars.push(star);
                    }

                    // 挂载到角色元素上（如果报错请尝试 player.node.appendChild(wrap)）
                    player.appendChild(wrap);

                    player.mfsdStarUI = {
                        wrap: wrap,
                        svg: svg,
                        stars: stars,
                        positions: starPositions
                    };

                    // 根据当前记录立即刷新
                    huanyuUpdateUI(player);
                }

                player.markSkill('mfsd_huanyu');
}

export function huanyuUpdateUI(player) {
                var ui = player.mfsdStarUI;
                if (!ui) return;

                var list = player.storage.mfsd_huanyu_history || [];
                var count = list.length;

                // 更新星星亮暗
                for (var i = 0; i < ui.stars.length; i++) {
                    ui.stars[i].classList.remove('active', 'current');
                    if (i < count) {
                        ui.stars[i].classList.add('active');
                        if (i == count - 1) {
                            ui.stars[i].classList.add('current');
                        }
                    }
                }

                // 画线：连接所有已点亮的相邻星星
                var svg = ui.svg;
                // 清空原有线条
                while (svg.firstChild) svg.removeChild(svg.firstChild);

                if (count < 2) return; // 少于两颗不用连线

                var positions = ui.positions;
                var wrapWidth = ui.wrap.offsetWidth;
                var wrapHeight = ui.wrap.offsetHeight;

                // 确保容器尺寸获取到（可能首次渲染为0，延时或使用固定策略）
                if (wrapWidth === 0) wrapWidth = 50; // 给个默认宽度，防止线条不显示
                if (wrapHeight === 0) wrapHeight = 180;

                for (var i = 0; i < count - 1; i++) {
                    var p1 = positions[i];
                    var p2 = positions[i+1];

                    // 将百分比坐标转为像素坐标
                    var x1 = (p1.left / 100) * wrapWidth;
                    var y1 = (p1.top / 100) * wrapHeight;
                    var x2 = (p2.left / 100) * wrapWidth;
                    var y2 = (p2.top / 100) * wrapHeight;

                    var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                    line.setAttribute("x1", x1);
                    line.setAttribute("y1", y1);
                    line.setAttribute("x2", x2);
                    line.setAttribute("y2", y2);
                    line.setAttribute("stroke", "rgba(120,200,255,0.8)");
                    line.setAttribute("stroke-width", "2");
                    line.setAttribute("stroke-linecap", "round");
                    // 添加一点发光效果
                    line.style.filter = "drop-shadow(0 0 4px rgba(120,200,255,0.8))";
                    svg.appendChild(line);
                }
}