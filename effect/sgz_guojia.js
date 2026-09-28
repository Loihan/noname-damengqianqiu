// ===== 梦郭嘉 · 窥天 星穹能量条 UI（挂载武将牌右侧，纯表现层，无游戏规则） =====
// 由 character/sgz_guojia.js 通过 import { guojiaKuitianUI } 挂载回 skills 中
//
// 显示规则：
//   · 恒显「本回合发动窥天的次数（窥天标记数）/ 体力上限」，即 countMark('sgz_kuitian_used') / maxHp
//   · 条满（count >= maxHp）进入「窥破星穹」满盈态：金辉迸发、星芒外溢、天眼点亮
//   · 溢出（count >  maxHp，已触发反噬）追加「天机逆乱」警示态
//
// 注意：技能 content 会被引擎 StepCompiler eval，无法引用模块级函数；
//       故把刷新方法 `player.dmqcRefreshKuitianBar`（自包含、仅用 this/player）挂到 player 上，
//       content 与回合刷新都经 player 魔法变量调用该属性方法。

export const guojiaKuitianUI = {
    charlotte: true,
    trigger: {
        player: ["enterGame", "addMark", "removeMark", "gainMaxHp", "gainMaxHpAfter", "loseMaxHp", "loseMaxHpAfter", "changeHp", "phaseBegin"],
        global: ["gameStart", "roundStart", "gameDrawBefore"]
    },
    forced: true,
    silent: true,
    priority: -11,
    init: function(player) {
        // 1. 注入样式
        if (!document.getElementById('guojia_kuitian_style')) {
            var style = document.createElement('style');
            style.id = 'guojia_kuitian_style';
            style.innerHTML = `
                /* 容器：挂载在武将牌节点上，绝对定位到右侧（贴近武将牌） */
                .guojia-kuitian-wrap {
                    position: absolute; left: 100%; bottom: 0;
                    margin-left: 4px; width: 54px; height: 100%;
                    padding-bottom: 3px;
                    z-index: 65; pointer-events: none;
                    display: flex; flex-direction: column; align-items: center;
                    justify-content: flex-end;
                }
                /* 天眼徽记（挂于顶端，上移约 10px） */
                .guojia-kuitian-emblem {
                    flex: 0 0 auto; width: 44px; height: 44px;
                    background-image: url('extension/大梦千秋/image/sgz_guojia_kuitian_emblem.svg');
                    background-size: contain; background-repeat: no-repeat; background-position: center;
                    position: relative; z-index: 7;
                    margin-top: -10px;
                    filter: drop-shadow(0 0 4px rgba(240,194,90,0.35));
                    transition: filter .6s ease, transform .6s ease;
                }
                /* 计数铭牌：分行显示 窥天<br>x/x，避免横向溢出到屏幕右侧 */
                .guojia-kuitian-counter {
                    flex: 0 0 auto; position: relative; z-index: 7;
                    margin: 0 0 4px; padding: 2px 5px;
                    font-family: yuanli, "KaiTi", serif; font-size: 10px; line-height: 1.2;
                    letter-spacing: 1px; white-space: nowrap; text-align: center;
                    color: #f6d98a;
                    background: linear-gradient(180deg, rgba(20,14,5,0.82), rgba(10,6,2,0.92));
                    border: 1px solid rgba(240,194,90,0.5);
                    border-radius: 7px;
                    box-shadow: inset 0 0 6px rgba(240,194,90,0.16), 0 0 8px rgba(0,0,0,0.5);
                    text-shadow: 0 0 6px rgba(255,200,90,0.7), 0 1px 2px rgba(0,0,0,0.9);
                }
                /* 星穹柱（能量条本体）：圆角胶囊柱身，深色底 */
                .guojia-kuitian-track {
                    position: relative; flex: 1 1 auto; width: 15px;
                    margin-bottom: 1px;              /* 底部门距 7px→1px，向下加长约 6px */
                    border-radius: 8px;
                    background: linear-gradient(180deg, rgba(10,13,26,0.92), rgba(4,6,14,0.96));
                    border: 1px solid rgba(180,150,80,0.55);
                    box-shadow: inset 0 0 8px rgba(0,0,0,0.6), 0 0 10px rgba(0,0,0,0.4);
                    overflow: hidden; z-index: 3;
                }
                /* 能量填充：自柱底向上，深夜青金流光（更深的冷色阶） */
                .guojia-kuitian-fill {
                    position: absolute; left: 0; right: 0; bottom: 0; height: 0%;
                    background: linear-gradient(to top,
                        #0e1636 0%, #1b2a5f 22%, #2f4687 46%, #4a6bb8 68%,
                        #7a9be0 84%, #cfe0ff 94%, #b9a75c 100%);
                    box-shadow: 0 -2px 8px rgba(120,150,220,0.6), inset 0 0 8px rgba(140,170,230,0.35);
                    transition: height .7s cubic-bezier(0.22, 1.2, 0.36, 1);
                }
                .guojia-kuitian-fill::before {
                    content: ""; position: absolute; bottom: 0; left: 0; right: 0; height: 7px;
                    background: linear-gradient(to top, rgba(255,240,190,0.0), rgba(190,140,60,0.5));
                    opacity: .8;
                }
                /* 分段刻度 / 星座星芒（覆于柱上，始终可见） */
                .guojia-kuitian-stars {
                    position: absolute; left: 50%; top: 0; bottom: 0; width: 14px;
                    transform: translateX(-50%); z-index: 5;
                }
                .guojia-kuitian-star {
                    position: absolute; left: 50%; width: 11px; height: 11px;
                    transform: translate(-50%, 50%);
                    background-image: url('extension/大梦千秋/image/sgz_guojia_kuitian_star.svg');
                    background-size: contain; background-repeat: no-repeat; background-position: center;
                    opacity: .32; filter: drop-shadow(0 0 2px rgba(0,0,0,0.6));
                    transition: opacity .5s ease, filter .5s ease, transform .5s ease;
                }
                .guojia-kuitian-star.lit {
                    opacity: 1;
                    filter: drop-shadow(0 0 4px rgba(255,220,120,0.95)) drop-shadow(0 0 8px rgba(255,180,60,0.5));
                }
                /* 满盈态：赤金辉光弥漫整柱 */
                .guojia-kuitian-wrap.full .guojia-kuitian-fill {
                    background: linear-gradient(to top,
                        #3a1500 0%, #7a3a08 20%, #c0681c 46%, #e69a34 70%,
                        #fdd87a 90%, #fff3c4 100%);
                    box-shadow: 0 -2px 12px rgba(230,150,50,0.9), inset 0 0 12px rgba(240,170,70,0.7);
                }
                .guojia-kuitian-wrap.full .guojia-kuitian-track {
                    border-color: rgba(230,180,90,0.9);
                    box-shadow: inset 0 0 10px rgba(60,30,0,0.6), 0 0 12px rgba(220,150,50,0.7);
                }
                .guojia-kuitian-wrap.full .guojia-kuitian-emblem {
                    filter: drop-shadow(0 0 9px rgba(255,210,110,1)) drop-shadow(0 0 18px rgba(255,160,40,0.6));
                    animation: guojia-kuitian-emblemPulse 1.6s ease-in-out infinite;
                }
                .guojia-kuitian-wrap.full .guojia-kuitian-counter {
                    color: #fff1c2;
                    border-color: rgba(255,220,130,0.9);
                    box-shadow: inset 0 0 8px rgba(255,200,90,0.4), 0 0 12px rgba(255,170,40,0.6);
                    text-shadow: 0 0 9px rgba(255,215,110,1), 0 1px 2px rgba(0,0,0,0.95);
                    animation: guojia-kuitian-counterGlow 1.6s ease-in-out infinite;
                }
                @keyframes guojia-kuitian-emblemPulse {
                    0%, 100% { transform: scale(1);     filter: drop-shadow(0 0 8px rgba(255,210,110,1)); }
                    50%      { transform: scale(1.07);  filter: drop-shadow(0 0 16px rgba(255,190,70,1)); }
                }
                @keyframes guojia-kuitian-counterGlow {
                    0%, 100% { text-shadow: 0 0 6px rgba(255,215,110,.9), 0 1px 2px rgba(0,0,0,.95); }
                    50%      { text-shadow: 0 0 13px rgba(255,230,150,1), 0 1px 2px rgba(0,0,0,.95); }
                }
                /* 溢出态：天机逆乱，转向赤金警示 */
                .guojia-kuitian-wrap.over .guojia-kuitian-counter {
                    color: #ffd6a0; border-color: rgba(255,140,60,0.9);
                    text-shadow: 0 0 9px rgba(255,120,50,1), 0 1px 2px rgba(0,0,0,0.95);
                }
                .guojia-kuitian-wrap.over .guojia-kuitian-track {
                    border-color: rgba(255,150,70,0.9);
                    box-shadow: inset 0 0 10px rgba(80,20,0,0.7), 0 0 14px rgba(255,120,40,0.8);
                }
                .guojia-kuitian-wrap.over .guojia-kuitian-emblem {
                    filter: drop-shadow(0 0 10px rgba(255,150,60,1));
                }
                /* 满盈 / 溢出：星芒外溢粒子层 */
                .guojia-kuitian-burst {
                    position: absolute; inset: 0; width: 100%; height: 100%; z-index: 8;
                }
                .guojia-kuitian-burst i {
                    position: absolute;
                    background-image: url('extension/大梦千秋/image/sgz_guojia_kuitian_star.svg');
                    background-size: contain; background-repeat: no-repeat; background-position: center;
                    opacity: 0; filter: drop-shadow(0 0 4px rgba(255,220,120,0.9));
                    animation: guojia-kuitian-burstF 2.4s infinite ease-out;
                }
                @keyframes guojia-kuitian-burstF {
                    0%   { transform: translate(0, 0) scale(.5) rotate(0deg);   opacity: 0; }
                    12%  { opacity: 1; }
                    70%  { opacity: .85; }
                    100% { transform: translate(var(--bx, 0px), var(--by, -130px)) scale(1) rotate(var(--br, 220deg)); opacity: 0; }
                }
                @media (prefers-reduced-motion: reduce) {
                    .guojia-kuitian-wrap.full .guojia-kuitian-emblem { animation: none; }
                    .guojia-kuitian-wrap.full .guojia-kuitian-counter { animation: none; }
                }
            `;
            document.head.appendChild(style);
        }

        // 2. 构建 DOM
        if (!player.dmqcKuitianBar) {
            var wrap = document.createElement('div');
            wrap.className = 'guojia-kuitian-wrap';

            var emblem = document.createElement('div');
            emblem.className = 'guojia-kuitian-emblem';

            var counter = document.createElement('div');
            counter.className = 'guojia-kuitian-counter';

            var track = document.createElement('div');
            track.className = 'guojia-kuitian-track';

            var fill = document.createElement('div');
            fill.className = 'guojia-kuitian-fill';
            track.appendChild(fill);

            var stars = document.createElement('div');
            stars.className = 'guojia-kuitian-stars';
            track.appendChild(stars);

            var burst = document.createElement('div');
            burst.className = 'guojia-kuitian-burst';
            // 8 枚外溢星芒（随机水平漂移 / 上飘 / 旋转）
            for (var i = 0; i < 8; i++) {
                var s = document.createElement('i');
                var sz = (9 + Math.random() * 8).toFixed(1);
                s.style.width = s.style.height = sz + 'px';
                s.style.left = (Math.random() * 100) + '%';
                s.style.bottom = (8 + Math.random() * 30) + '%';
                s.style.setProperty('--bx', (Math.random() * 56 - 28) + 'px');
                s.style.setProperty('--by', (-(90 + Math.random() * 70)).toFixed(0) + 'px');
                s.style.setProperty('--br', (Math.random() * 360 - 180).toFixed(0) + 'deg');
                s.style.animationDelay = (Math.random() * 2.4) + 's';
                s.style.animationDuration = (1.8 + Math.random() * 1.6) + 's';
                burst.appendChild(s);
            }

            wrap.appendChild(emblem);
            wrap.appendChild(counter);
            wrap.appendChild(track);
            wrap.appendChild(burst);

            // 【关键】挂载到 player 节点而不是 ui.arena
            player.appendChild(wrap);
            player.dmqcKuitianBar = { wrap: wrap, emblem: emblem, counter: counter, track: track, fill: fill, stars: stars, burst: burst };

            // 自包含刷新方法（content eval 作用域下也能调用）。
            player.dmqcRefreshKuitianBar = function() {
                var p = this;
                var bar = p.dmqcKuitianBar;
                if (!bar) return;
                var count = Math.max(0, p.countMark ? p.countMark('sgz_kuitian_used') : 0) || 0;
                var max = Math.max(1, p.maxHp || 1);
                var percent = Math.max(0, Math.min(100, Math.round(count / max * 100)));

                bar.fill.style.height = percent + '%';

                // 星座刻度：maxHp 格，每格一枚星芒；已点亮 count 枚（自下而上）
                var segs = bar.stars;
                while (segs.firstChild) segs.removeChild(segs.firstChild);
                for (var i = 1; i <= max; i++) {
                    var st = document.createElement('div');
                    st.className = 'guojia-kuitian-star' + (count >= i ? ' lit' : '');
                    st.style.bottom = (i / max * 100) + '%';
                    segs.appendChild(st);
                }

                bar.counter.innerHTML = '窥天<br>' + count + '/' + max;

                if (count >= max) {
                    if (!bar.wrap.classList.contains('full')) bar.wrap.classList.add('full');
                } else {
                    bar.wrap.classList.remove('full');
                }
                if (count > max) {
                    if (!bar.wrap.classList.contains('over')) bar.wrap.classList.add('over');
                } else {
                    bar.wrap.classList.remove('over');
                }
            };

            // 初始渲染一次（进入游戏即刻显示 0/maxHp）
            if (player.dmqcRefreshKuitianBar) player.dmqcRefreshKuitianBar();
        }
    },
    content: function() {
        // init 在技能挂载时已构建 DOM；此处仅做安全兜底（未挂载则直接返回，避免报错）
        if (player && player.dmqcRefreshKuitianBar) player.dmqcRefreshKuitianBar();
    },
    onremove: function(player) {
        if (player.dmqcKuitianBar) {
            player.dmqcKuitianBar.wrap.remove();
            delete player.dmqcKuitianBar;
            delete player.dmqcRefreshKuitianBar;
        }
    }
};
