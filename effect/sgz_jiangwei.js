// ===== 姜维 · 【九伐天殇】UI（纯表现层，无游戏规则） =====
// 由 character/sgz_jiangwei.js 通过 import { jiangweiUI } 挂载回 skills 中
export const jiangweiUI = {
            charlotte: true,
            trigger: {
                player: [
                    "enterGame",
                    "changeHp",
                    "awaken"
                ],
                global: [
                    "gameStart",
                    "phaseBeginStart"
                ]
            },
            forced: true,
            silent: true,
            priority: -10,

            init: function(player) {

                // ===== 样式 =====
                if (!document.getElementById('jiangwei_jiufa_style')) {
                    var style = document.createElement('style');
                    style.id = 'jiangwei_jiufa_style';
                    style.innerHTML = `

                    /* =========================
                    外层容器
                    ========================= */

                    .jiangwei-jiufa-wrap{
                        position:absolute;
                        left:100%;
                        top:3%;
                        margin-left:4px;

                        width:28px;
                        height:94%;

                        z-index:60;
                        pointer-events:none;

                        display:flex;
                        justify-content:center;
                        align-items:center;
                    }

                    /* =========================
                    中央古铜脊柱
                    ========================= */

                    .jiangwei-jiufa-core{
                        position:absolute;

                        width:6px;
                        height:100%;

                        background:
                            linear-gradient(
                                180deg,
                                #120d08 0%,
                                #3a2615 15%,
                                #2a1b10 50%,
                                #4b2f18 85%,
                                #120d08 100%
                            );

                        border:
                            1px solid rgba(255,180,80,0.18);

                        box-shadow:
                            inset 0 0 6px rgba(0,0,0,1),
                            0 0 8px rgba(120,40,10,0.2);

                        border-radius:999px;
                    }

                    /* =========================
                        真正的进度能量
                    ========================= */

                    .jiangwei-jiufa-energy{

                        position:absolute;

                        left:0;
                        bottom:0;

                        width:100%;
                        height:0%;

                        border-radius:999px;

                        transition:
                            height 0.7s cubic-bezier(0.22,1,0.36,1),
                            filter 0.4s;

                        background:
                            repeating-linear-gradient(
                                0deg,
                                rgba(255,220,120,0.15),
                                rgba(255,220,120,0.45) 12px,
                                rgba(255,120,40,0.2) 24px
                            ),
                            linear-gradient(
                                180deg,
                                #2a0900 0%,
                                #7a1d00 25%,
                                #ff5a00 70%,
                                #ffe08a 100%
                            );

                        background-size:
                            100% 60px,
                            100% 100%;

                        box-shadow:
                            0 0 8px rgba(255,90,20,0.55),
                            0 0 16px rgba(255,120,20,0.3);

                        animation:
                            jiangwei-energy-flow 2.8s infinite linear;
                    }

                    /* =========================
                    九伐节点
                    ========================= */

                    .jiangwei-jiufa-node{
                        position:absolute;

                        width:16px;
                        height:16px;

                        left:50%;
                        transform:translateX(-50%) scale(0.72);

                        opacity:0.22;

                        transition:
                            all 0.45s cubic-bezier(0.22,1,0.36,1);

                        z-index:2;
                    }

                    /* 菱形 */
                    .jiangwei-jiufa-node::before{
                        content:"";
                        position:absolute;
                        inset:0;

                        clip-path:polygon(
                            50% 0%,
                            100% 50%,
                            50% 100%,
                            0% 50%
                        );

                        background:
                            linear-gradient(
                                135deg,
                                #1c120b 0%,
                                #50311b 50%,
                                #1c120b 100%
                            );

                        border:
                            1px solid rgba(255,190,120,0.15);

                        box-shadow:
                            inset 0 0 4px rgba(0,0,0,0.9);
                    }

                    /* =========================
                    点亮状态
                    ========================= */

                    .jiangwei-jiufa-node.active{
                        opacity:0.92;
                        transform:translateX(-50%) scale(0.72);
                    }

                    /* 当前正在推进的伐痕 */
                    .jiangwei-jiufa-node.current{

                        opacity:1;

                        transform:
                            translateX(-50%)
                            scale(1.12);

                        z-index:5;

                        filter:
                            brightness(1.25)
                            drop-shadow(0 0 8px rgba(255,180,80,0.9));
                    }

                    .jiangwei-jiufa-node.current::before{

                        box-shadow:
                            0 0 12px rgba(255,200,120,1),
                            0 0 24px rgba(255,120,20,0.9),
                            inset 0 0 8px rgba(255,255,255,0.5);

                        border:
                            1px solid rgba(255,240,180,0.9);
                    }

                    .jiangwei-jiufa-node.active::before{
                        background:
                            linear-gradient(
                                135deg,
                                #3a1000 0%,
                                #b53b00 40%,
                                #ffd36a 50%,
                                #b53b00 60%,
                                #3a1000 100%
                            );

                        background-size:250% 250%;

                        border:
                            1px solid rgba(255,230,180,0.55);

                        box-shadow:
                            0 0 10px rgba(255,120,40,0.8),
                            0 0 18px rgba(255,80,20,0.45),
                            inset 0 0 6px rgba(255,220,120,0.55);

                        animation:
                            jiangwei-fire-flow 4s linear infinite;
                    }

                    /* =========================
                    内部火流
                    ========================= */

                    .jiangwei-jiufa-node.active::after{
                        content:"";
                        position:absolute;

                        top:18%;
                        left:18%;

                        width:64%;
                        height:64%;

                        clip-path:polygon(
                            50% 0%,
                            100% 50%,
                            50% 100%,
                            0% 50%
                        );

                        background:
                            linear-gradient(
                                180deg,
                                rgba(255,255,255,0.9),
                                rgba(255,210,120,0.2),
                                transparent
                            );

                        animation:
                            jiangwei-inner-burn 1.8s infinite alternate ease-in-out;
                    }

                    /* =========================
                    刻度位置
                    ========================= */

                    .jiangwei-jiufa-node:nth-child(2){ top:88%; }
                    .jiangwei-jiufa-node:nth-child(3){ top:77%; }
                    .jiangwei-jiufa-node:nth-child(4){ top:66%; }
                    .jiangwei-jiufa-node:nth-child(5){ top:55%; }
                    .jiangwei-jiufa-node:nth-child(6){ top:44%; }
                    .jiangwei-jiufa-node:nth-child(7){ top:33%; }
                    .jiangwei-jiufa-node:nth-child(8){ top:22%; }
                    .jiangwei-jiufa-node:nth-child(9){ top:11%; }
                    .jiangwei-jiufa-node:nth-child(10){ top:0%; }

                    /* =========================
                    第一阶段：薪燃
                    ========================= */

                    .jiangwei-jiufa-wrap.stage1 .jiangwei-jiufa-core{
                        box-shadow:
                            inset 0 0 8px rgba(0,0,0,1),
                            0 0 12px rgba(255,90,30,0.25);
                    }
                    .jiangwei-jiufa-wrap.stage1 .jiangwei-jiufa-energy{
                        filter:
                            brightness(0.85)
                            saturate(0.8);
                        box-shadow:
                            0 0 6px rgba(255,80,20,0.35);
                    }

                    /* =========================
                    第三阶段：逐日
                    ========================= */

                    .jiangwei-jiufa-wrap.stage3 .jiangwei-jiufa-node.active::before{
                        animation:
                            jiangwei-fire-flow 2.8s linear infinite;
                    }

                    .jiangwei-jiufa-wrap.stage3{
                        filter:brightness(1.08);
                    }
                    .jiangwei-jiufa-wrap.stage3 .jiangwei-jiufa-energy{

                        filter:
                            brightness(1)
                            saturate(1);

                        box-shadow:
                            0 0 10px rgba(255,100,30,0.65),
                            0 0 18px rgba(255,120,40,0.35);

                        animation:
                            jiangwei-energy-flow 1.8s infinite linear;
                    }
                    /* =========================
                    第五阶段：绝烬
                    ========================= */

                    .jiangwei-jiufa-wrap.stage5 .jiangwei-jiufa-core{
                        background:
                            linear-gradient(
                                180deg,
                                #100805 0%,
                                #5e1200 20%,
                                #281008 50%,
                                #7a1d00 80%,
                                #100805 100%
                            );
                    }

                    .jiangwei-jiufa-wrap.stage5 .jiangwei-jiufa-node.active{
                        filter:
                            brightness(1.2)
                            contrast(1.15);
                    }
                    .jiangwei-jiufa-wrap.stage5 .jiangwei-jiufa-energy{

                        filter:
                            brightness(1.2)
                            saturate(1.25);

                        box-shadow:
                            0 0 14px rgba(255,120,30,0.8),
                            0 0 28px rgba(255,80,20,0.5);

                        animation:
                            jiangwei-energy-flow 1.2s infinite linear;
                    }
                    /* =========================
                    第七阶段：孤炬
                    ========================= */

                    .jiangwei-jiufa-wrap.stage7{
                        animation:
                            jiangwei-pulse 2.5s infinite ease-in-out;
                    }

                    .jiangwei-jiufa-wrap.stage7 .jiangwei-jiufa-node.active{
                        filter:
                            drop-shadow(0 0 6px rgba(255,140,40,0.8));
                    }
                    .jiangwei-jiufa-wrap.stage7 .jiangwei-jiufa-energy{

                        filter:
                            brightness(1.35)
                            saturate(1.4);

                        box-shadow:
                            0 0 20px rgba(255,140,40,1),
                            0 0 40px rgba(255,90,20,0.7);

                        animation:
                            jiangwei-energy-flow 0.8s infinite linear;
                    }

                    /* =========================
                    第九阶段：幽明
                    ========================= */

                    .jiangwei-jiufa-wrap.stage9{

                        filter:
                            brightness(1.35)
                            contrast(1.2);

                        animation:
                            jiangwei-final-burn 2.8s infinite alternate;
                    }

                    .jiangwei-jiufa-wrap.stage9 .jiangwei-jiufa-core{

                        background:
                            linear-gradient(
                                180deg,
                                #fff6d6 0%,
                                #ffcc66 20%,
                                #ff6a00 50%,
                                #ffe29a 80%,
                                #fff6d6 100%
                            );

                        box-shadow:
                            0 0 14px rgba(255,220,120,1),
                            0 0 28px rgba(255,120,20,0.8);
                    }

                    .jiangwei-jiufa-wrap.stage9 .jiangwei-jiufa-node.active::before{

                        background:
                            linear-gradient(
                                135deg,
                                #fff7dc 0%,
                                #ffd66b 30%,
                                #ffffff 50%,
                                #ffae42 70%,
                                #fff7dc 100%
                            );

                        box-shadow:
                            0 0 14px rgba(255,255,220,0.9),
                            0 0 24px rgba(255,170,60,1);
                    }
                    .jiangwei-jiufa-wrap.stage9 .jiangwei-jiufa-energy{

                        filter:
                            brightness(1.65)
                            saturate(1.7);

                        box-shadow:
                            0 0 24px rgba(255,220,120,1),
                            0 0 55px rgba(255,140,40,1);

                        animation:
                            jiangwei-energy-flow 1s infinite linear;
                    }
                    /* =========================
                    动画
                    ========================= */

                    @keyframes jiangwei-fire-flow{
                        0%{
                            background-position:0% 0%;
                        }
                        100%{
                            background-position:100% 100%;
                        }
                    }

                    @keyframes jiangwei-inner-burn{
                        0%{
                            opacity:0.35;
                            transform:scale(0.82);
                        }
                        100%{
                            opacity:1;
                            transform:scale(1.08);
                        }
                    }

                    @keyframes jiangwei-pulse{
                        0%{
                            transform:translateY(0px);
                        }
                        50%{
                            transform:translateY(-1px);
                        }
                        100%{
                            transform:translateY(0px);
                        }
                    }

                    @keyframes jiangwei-final-burn{
                        0%{
                            filter:
                                brightness(1.15)
                                saturate(1.1);
                        }

                        100%{
                            filter:
                                brightness(1.45)
                                saturate(1.4);
                        }
                    }
                    @keyframes jiangwei-energy-flow{
                        0%{
                            background-position:
                                0 0,
                                0 0;
                        }

                        100%{
                            background-position:
                                0 -60px,
                                0 0;
                        }
                    }

                    `;
                    document.head.appendChild(style);
                }
                // ===== 创建UI =====
                if (!player.jiangweiUI) {

                    var wrap = document.createElement('div');
                    wrap.className = 'jiangwei-jiufa-wrap';

                    var core = document.createElement('div');
                    core.className = 'jiangwei-jiufa-core';

                    var energy = document.createElement('div');
                    energy.className = 'jiangwei-jiufa-energy';

                    core.appendChild(energy);
                    wrap.appendChild(core);

                    var nodes = [];
                    for (var i = 0; i < 9; i++) {
                        var node = document.createElement('div');
                        node.className = 'jiangwei-jiufa-node';
                        wrap.appendChild(node);
                        nodes.push(node);
                    }
                    player.appendChild(wrap);
                    player.jiangweiUI = {
                        wrap: wrap,
                        core: core,
                        energy: energy,
                        nodes: nodes
                    };
                }
            },

        updateUI: function(player) {
            var ui = player.jiangweiUI;
            if (!ui) return;
            var marks = player.countMark('sgz_jiufa') || 0;
            // ===== 能量高度 =====
            var percent = (marks / 9) * 100;
            ui.energy.style.height = percent + '%';

            // ===== 节点刷新 =====
            for (var i = 0; i < ui.nodes.length; i++) {
                ui.nodes[i].classList.remove('active');
                ui.nodes[i].classList.remove('current');
                if (i < marks) {
                    ui.nodes[i].classList.add('active');
                    if (i == marks - 1) {
                        ui.nodes[i].classList.add('current');
                    }
                }
            }

            // ===== 阶段清空 =====
            ui.wrap.classList.remove(
                'stage1',
                'stage3',
                'stage5',
                'stage7',
                'stage9'
            );

            // ===== 阶段追加 =====
            if (marks >= 1) ui.wrap.classList.add('stage1');
            if (marks >= 3) ui.wrap.classList.add('stage3');
            if (marks >= 5) ui.wrap.classList.add('stage5');
            if (marks >= 7) ui.wrap.classList.add('stage7');
            if (marks >= 9) ui.wrap.classList.add('stage9');
        },
        content:function(){
            lib.skill.sgz_jiangwei_ui.updateUI(player);
        },
            onremove: function(player) {
                if (player.jiangweiUI) {
                    player.jiangweiUI.wrap.remove();
                    delete player.jiangweiUI;
                }
            }
};