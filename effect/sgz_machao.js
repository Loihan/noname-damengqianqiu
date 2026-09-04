// ===== 梦马超 · 雷殛特效（⚡ 电光边框 / 💥 破字令符） =====
// 由 character/sgz_machao.js 的技能钩子调用；本模块只负责表现层，无任何游戏规则逻辑。

// ===== 雷殛 debuff 特效（施加于目标角色的边框） =====
const sgzLeijiFxCSS = `
    /* ⚡ 雷殛·雳：雷电——外层电光缠绕边框（规律呼吸，频率×1.5，边框×1.5，四角与边框同频） */
    .leiji-thunder-fx {
        position: absolute; inset: -5px; border-radius: 12px;
        pointer-events: none; z-index: 65;
        border: 7px solid rgba(150,215,255,0.55);
        box-shadow: 0 0 10px rgba(120,200,255,0.55), inset 0 0 9px rgba(120,200,255,0.17);
        animation: leiji-thunder-breath 0.5s infinite ease-in-out;
    }
    .leiji-thunder-fx::before {
        content: ""; position: absolute; inset: 0; border-radius: inherit;
        background: radial-gradient(ellipse at 50% 50%, rgba(130,200,255,0) 55%, rgba(130,200,255,0.16) 100%);
    }
    .leiji-thunder-fx .bolt {
        position: absolute; width: 15px; height: 20px; opacity: 0;
        filter: drop-shadow(0 0 4px rgba(170,235,255,1));
        animation: leiji-bolt 0.5s infinite ease-in-out;
    }
    .leiji-thunder-fx .b1 { top: -12px; left: -8px; }
    .leiji-thunder-fx .b2 { top: -12px; right: -8px; transform: scaleX(-1); }
    .leiji-thunder-fx .b3 { bottom: -12px; left: -8px; transform: scaleY(-1); }
    .leiji-thunder-fx .b4 { bottom: -12px; right: -8px; transform: scale(-1,-1); }
    @keyframes leiji-thunder-breath {
        0%, 100% { border-color: rgba(150,215,255,0.55); box-shadow: 0 0 9px rgba(120,200,255,0.5), inset 0 0 9px rgba(120,200,255,0.16); }
        50% { border-color: rgba(205,242,255,0.95); box-shadow: 0 0 17px rgba(160,225,255,0.9), inset 0 0 13px rgba(160,225,255,0.3); }
    }
    @keyframes leiji-bolt {
        0%, 100% { opacity: 0; }
        50% { opacity: 0.95; }
    }
    /* 💥 雷殛·破：易伤——四个碎裂"破"字令符挂在卡牌四角（向对角外侧伸出，不堆叠在卡面上） */
    .leiji-boom-fx {
        position: absolute; inset: 0;
        pointer-events: none; z-index: 64;
    }
    .leiji-boom-fx .boom-c { position: absolute; }
    .leiji-boom-fx .boom-c svg {
        width: 27px; height: 72px;
        transform-origin: 50% 50%;
        filter: drop-shadow(0 0 5px rgba(255,70,40,0.7));
        animation: leiji-boom-pulse 2s infinite ease-in-out;
    }
    .leiji-boom-fx .c1 { left: -13.5px; top: -36px; }
    .leiji-boom-fx .c1 svg { transform: rotate(135deg); }
    .leiji-boom-fx .c2 { right: -13.5px; top: -36px; }
    .leiji-boom-fx .c2 svg { transform: rotate(-135deg); }
    .leiji-boom-fx .c3 { left: -13.5px; bottom: -36px; }
    .leiji-boom-fx .c3 svg { transform: rotate(45deg); }
    .leiji-boom-fx .c4 { right: -13.5px; bottom: -36px; }
    .leiji-boom-fx .c4 svg { transform: rotate(-45deg); }
    .leiji-boom-fx .crack {
        fill: none; stroke: rgba(25,2,2,0.9); stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round;
    }
    .leiji-boom-fx .crack-hot {
        fill: none; stroke: rgba(255,110,70,0.8); stroke-width: 1.1; stroke-linecap: round; stroke-linejoin: round;
        filter: drop-shadow(0 0 2px rgba(255,80,40,0.9));
    }
    @keyframes leiji-boom-pulse {
        0%, 100% { opacity: 0.8; }
        50% { opacity: 1; }
    }
`;
function sgzLeijiEnsureStyle() {
    if (!document.getElementById('sgz_leiji_fx_style')) {
        var s = document.createElement('style');
        s.id = 'sgz_leiji_fx_style';
        s.innerHTML = sgzLeijiFxCSS;
        document.head.appendChild(s);
    }
}

// ⚡ 雷殛·雳：电光缠绕边框（挂载于被标记的目标角色，随标记挂载/清理）
export function initLeijiThunder(player) {
    sgzLeijiEnsureStyle();
    if (!player.leijiThunderFx && player.node) {
        var fx = document.createElement('div');
        fx.className = 'leiji-thunder-fx';
        var NS = 'http://www.w3.org/2000/svg';
        var boltPath = 'M8,0 L2,9 L5.5,9 L1.5,18 L9,6.5 L5.5,6.5 Z';
        for (var i = 1; i <= 4; i++) {
            var svg = document.createElementNS(NS, 'svg');
            svg.setAttribute('viewBox', '0 0 11 18');
            svg.setAttribute('class', 'bolt b' + i);
            var p = document.createElementNS(NS, 'path');
            p.setAttribute('d', boltPath);
            p.setAttribute('fill', '#dff4ff');
            svg.appendChild(p);
            fx.appendChild(svg);
        }
        player.appendChild(fx);
        player.leijiThunderFx = fx;
    }
}
export function removeLeijiThunder(player) {
    if (player.leijiThunderFx) {
        player.leijiThunderFx.remove();
        delete player.leijiThunderFx;
    }
}

// 💥 雷殛·破：四个碎裂"破"字令符挂在卡牌四角（向对角外侧伸出，不堆叠在卡面上）
export function initLeijiBoom(player) {
    sgzLeijiEnsureStyle();
    if (!player.leijiBoomFx && player.node) {
        var fx = document.createElement('div');
        fx.className = 'leiji-boom-fx';
        var NS = 'http://www.w3.org/2000/svg';
        var makeTail = function(idx) {
            var svg = document.createElementNS(NS, 'svg');
            svg.setAttribute('viewBox', '0 0 40 80');
            var defs = document.createElementNS(NS, 'defs');
            var grad = document.createElementNS(NS, 'linearGradient');
            grad.setAttribute('id', 'leiji_boom_grad_' + idx);
            grad.setAttribute('x1', '0'); grad.setAttribute('y1', '0');
            grad.setAttribute('x2', '0'); grad.setAttribute('y2', '1');
            [['0', '#5a0c07'], ['1', '#8f1c10']].forEach(function(s) {
                var st = document.createElementNS(NS, 'stop');
                st.setAttribute('offset', s[0]);
                st.setAttribute('stop-color', s[1]);
                grad.appendChild(st);
            });
            defs.appendChild(grad);
            svg.appendChild(defs);
            var body = document.createElementNS(NS, 'path');
            body.setAttribute('d', 'M6,3 L34,3 L34,56 L20,70 L6,56 Z');
            body.setAttribute('fill', 'url(#leiji_boom_grad_' + idx + ')');
            body.setAttribute('stroke', '#a02a18');
            body.setAttribute('stroke-width', '1.5');
            body.setAttribute('stroke-linejoin', 'round');
            svg.appendChild(body);
            var rope = document.createElementNS(NS, 'rect');
            rope.setAttribute('x', '17'); rope.setAttribute('y', '0');
            rope.setAttribute('width', '6'); rope.setAttribute('height', '4');
            rope.setAttribute('fill', '#7a1510');
            svg.appendChild(rope);
            var cracks = [
                'M16,12 L22,20 L17,28 L26,40 L21,50',
                'M28,15 L25,27 L30,36',
                'M12,36 L19,44 L14,54'
            ];
            var hot = [
                'M14,22 L22,32 L17,44'
            ];
            var mk = function(d, cls) {
                var p = document.createElementNS(NS, 'path');
                p.setAttribute('d', d);
                p.setAttribute('class', cls);
                return p;
            };
            cracks.forEach(function(d) { svg.appendChild(mk(d, 'crack')); });
            hot.forEach(function(d) { svg.appendChild(mk(d, 'crack-hot')); });
            var text = document.createElementNS(NS, 'text');
            text.setAttribute('x', '20'); text.setAttribute('y', '48');
            text.setAttribute('font-size', '22');
            text.setAttribute('font-weight', 'bold');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('fill', '#d8472a');
            text.textContent = '破';
            svg.appendChild(text);
            return svg;
        };
        var corners = ['c1', 'c2', 'c3', 'c4'];
        corners.forEach(function(c, i) {
            var wrap = document.createElement('div');
            wrap.className = 'boom-c ' + c;
            wrap.appendChild(makeTail(i));
            fx.appendChild(wrap);
        });
        player.appendChild(fx);
        player.leijiBoomFx = fx;
    }
}
export function removeLeijiBoom(player) {
    if (player.leijiBoomFx) {
        player.leijiBoomFx.remove();
        delete player.leijiBoomFx;
    }
}
