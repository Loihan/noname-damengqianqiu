// ============================================================
//  梦吕布 · 特效层（镇猎/噬炁 主题选择框 + 炁牌/镇猎杀 卡面美化）
//  纯表现层，无游戏规则。由 character/sgz_lvbu.js 通过 import 使用。
// ============================================================
//  【镇猎·噬炁】专属主题选择框 —— 大梦千秋 · 梦吕布
//  替换上一版自绘面板（该面板因未显式声明 position 而被引擎全局
//  `div{position:absolute}` 规则影响，导致选项卡片彼此堆叠、再叠加
//  body 缩放 transform 造成定位错位），重绘为“夜穹裂晶猎场”主题：
//  深空墨蓝底板 + 左青右品红幽光 + 金色方天画戟徽记。
//  仅对本地人类玩家生效；AI/联机/录像回放回退到引擎默认框。
// ============================================================

const dmqcLvbuStyleId = 'dmqc_lvbu_style';

// 镇猎③ 四个选项的主题化展示数据（封印字 / 铭文 / 强调色）
const dmqcLvbuOptionMap = {
    '伤害+1': { seal: '威', motto: '锋芒所向 · 势不可挡', accent: '#ff4f6d' },
    '不可响应': { seal: '疾', motto: '电光石火 · 避无可避', accent: '#45d8ff' },
    '额外目标': { seal: '猎', motto: '横扫千军 · 一戟多挑', accent: '#ffd166' },
    '回复体力': { seal: '续', motto: '以战养战 · 浴血重生', accent: '#5bffa0' },
};

// 注入主题 keyframes（幂等）。其余样式全部内联化，杜绝“样式未生效/堆叠”问题。
function dmqcInjectLvbuStyle() {
    if (document.getElementById(dmqcLvbuStyleId)) return;
    const style = document.createElement('style');
    style.id = dmqcLvbuStyleId;
    style.innerHTML = `
/* 面板浮入 */
@keyframes dmqc-lvbu-in {
    from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
    to   { opacity: 1; transform: translate(-50%, -50%) scale(var(--dmqc-scale, 1)); }
}
/* 选中卡：金芒脉动 */
@keyframes dmqc-lvbu-selected-pulse {
    0%, 100% {
        box-shadow: 0 0 14px 4px rgba(69,216,255,.65), 0 0 36px 9px rgba(255,63,208,.28),
            inset 0 0 0 1px rgba(240,250,255,.85), inset 0 0 16px rgba(69,216,255,.25);
    }
    50% {
        box-shadow: 0 0 26px 8px rgba(69,216,255,.95), 0 0 58px 18px rgba(255,63,208,.5),
            inset 0 0 0 1px rgba(240,250,255,.95), inset 0 0 22px rgba(255,63,208,.22);
    }
}
/* 封印燃烧 */
@keyframes dmqc-lvbu-seal-fire {
    0%, 100% { box-shadow: inset 0 0 9px rgba(0,0,0,.5), 0 0 12px var(--acc, rgba(69,216,255,.5)); }
    50% { box-shadow: inset 0 0 12px rgba(0,0,0,.45), 0 0 20px var(--acc, rgba(69,216,255,.9)); }
}
/* 卡牌浮现 */
@keyframes dmqc-lvbu-opt-in {
    from { opacity: 0; transform: translateY(18px) scale(0.9); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
}
@media (prefers-reduced-motion: reduce) {
    .dmqc-lvbu, .dmqc-lvbu-opt, .dmqc-lvbu-opt.selected .dmqc-lvbu-opt-seal {
        animation: none !important;
    }
}
`;
    document.head.appendChild(style);
}

// 生成一张选项卡的内联样式（未选中/选中 两态）
function dmqcLvbuCardCss(selected, accent) {
    let css =
        'position:relative;display:block;flex:0 0 auto;box-sizing:border-box;' +
        'width:150px;cursor:pointer;user-select:none;text-align:center;border-radius:10px;' +
        'padding:14px 10px 12px;' +
        'background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,0) 36%),' +
        'linear-gradient(180deg,#1a2740 0%,#0e1626 62%,#0a0f1c 100%);' +
        'border:2px solid rgba(110,190,255,.32);' +
        'box-shadow:inset 0 0 0 1px rgba(160,220,255,.12),inset 0 0 22px rgba(20,40,80,.4),0 4px 12px rgba(0,0,0,.55);' +
        'transition:none;';
    if (selected) {
        css =
            'position:relative;display:block;flex:0 0 auto;box-sizing:border-box;' +
            'width:150px;cursor:pointer;user-select:none;text-align:center;border-radius:10px;' +
            'padding:14px 10px 12px;' +
            'background:radial-gradient(120% 120% at 50% 0%,rgba(69,216,255,.22),rgba(69,216,255,0) 60%),' +
            'linear-gradient(180deg,#202f4a 0%,#15233b 62%,#0f1830 100%);' +
            'border:2px solid ' + (accent || '#45d8ff') + ';' +
            'transform:translateY(-6px) scale(1.06);';
    }
    return css;
}

/**
 * 构建梦吕布专属“镇猎·噬炁”选项选择框（自包含 Promise，多选 + 确定/取消）。
 * @returns {Promise<{bool:boolean, links:Array}>}
 */
export function dmqcBuildLvbuPickDialog(player, title, options, max) {
    return new Promise(function (resolve) {
        dmqcInjectLvbuStyle();
        game.pause();

        const evtName = lib.config.touchscreen ? 'touchend' : 'click';
        const chosen = [];
        const optionNodes = [];
        let okNode = null, closed = false;

        // ---------- 结算 ----------
        function finish(result) {
            if (closed) return;
            closed = true;
            try {
                if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
            } catch (e) {}
            game.resume();
            resolve(result);
        }

        // 刷新选项卡与“确定”按钮的状态（first=true 时播放浮现动画）
        function sync(first) {
            options.forEach(function (opt, i) {
                const node = optionNodes[i];
                if (!node) return;
                const sel = chosen.indexOf(opt.key) >= 0;
                const acc = (dmqcLvbuOptionMap[opt.key] || {}).accent || '#45d8ff';
                node.classList.toggle('selected', sel);
                node.style.cssText = dmqcLvbuCardCss(sel, acc);
                // 已达上限：未选中的变灰且不可再点
                const prohibit = !sel && chosen.length >= max;
                node.style.opacity = sel ? '1' : (prohibit ? '0.38' : '1');
                node.style.pointerEvents = prohibit ? 'none' : 'auto';
                // 动画：仅首次浮现；选中后改为金芒脉动
                if (first) {
                    node.style.animation = sel
                        ? 'dmqc-lvbu-selected-pulse 1.4s ease-in-out infinite'
                        : 'dmqc-lvbu-opt-in .5s cubic-bezier(.2,.9,.3,1.12) both';
                    node.style.animationDelay = sel ? '0ms' : (120 + i * 70) + 'ms';
                } else {
                    node.style.animation = sel ? 'dmqc-lvbu-selected-pulse 1.4s ease-in-out infinite' : 'none';
                    node.style.animationDelay = sel ? '0ms' : '';
                }
                // 封印点燃
                const seal = node.firstChild;
                if (seal) {
                    seal.style.animation = sel ? 'dmqc-lvbu-seal-fire 1.5s ease-in-out infinite' : 'none';
                    seal.style.boxShadow = sel
                        ? ''
                        : 'inset 0 0 9px rgba(0,0,0,.5), 0 2px 5px rgba(0,0,0,.45)';
                }
            });
            if (okNode) {
                okNode.style.opacity = chosen.length ? '1' : '0.35';
                okNode.style.pointerEvents = chosen.length ? 'auto' : 'none';
                okNode.style.filter = chosen.length ? 'none' : 'grayscale(.7)';
            }
            const cnt = domCount;
            if (cnt) cnt.innerHTML = '已选 <b style="color:#45d8ff;">' + chosen.length + '</b> / ' + get.cnNumber(max);
        }

        // ---------- 全屏遮罩（挂到游戏窗口层，而非 document.body，避免被 body 缩放 transform 错位） ----------
        const overlay = ui.create.div();
        overlay.style.cssText =
            'position:absolute;left:0;top:0;width:100%;height:100%;z-index:99999;' +
            'display:block;background:radial-gradient(120% 120% at 50% 42%,rgba(4,8,18,.5),rgba(2,4,10,.78));' +
            'transition:none;';
        // 拦截所有落到遮罩上的点击，防止穿透到棋盘（不关闭，必须点“取消”）
        overlay.addEventListener(evtName, function (e) {
            if (e && e.stopPropagation) e.stopPropagation();
            if (e && e.preventDefault) e.preventDefault();
        });
        ui.window.appendChild(overlay);

        // ---------- 尺寸计算：按视口缩放，避免向下/向右溢出 ----------
        const count = options.length;
        const designW = Math.min(760, Math.max(470, 46 + count * 150 + (count - 1) * 12));
        const designH = 470;
        const vw = window.innerWidth || document.documentElement.clientWidth || 1366;
        const vh = window.innerHeight || document.documentElement.clientHeight || 768;
        const scale = Math.min(1, (vw - 24) / designW, (vh - 24) / designH);

        // ---------- 面板 ----------
        const panel = ui.create.div('dmqc-lvbu');
        panel.style.cssText =
            'position:absolute;left:50%;top:50%;width:' + designW + 'px;' +
            'transform:translate(-50%,-50%) scale(' + scale + ');transform-origin:center center;' +
            'display:block;box-sizing:border-box;padding:18px 22px 14px;border-radius:14px;' +
            'overflow:hidden;text-align:center;transition:none;color:#ece6ff;' +
            'background:linear-gradient(180deg,#101b34 0%,#0a1024 52%,#05060f 100%);' +
            'border:1px solid rgba(120,220,255,.5);' +
            'box-shadow:0 0 0 1px rgba(0,0,0,.9),0 0 0 4px rgba(69,216,255,.12),0 0 0 7px rgba(255,63,208,.06),0 0 46px rgba(0,0,0,.85),inset 0 0 42px rgba(69,216,255,.06);' +
            'animation:dmqc-lvbu-in .42s cubic-bezier(.2,.9,.3,1.08) both;';
        panel.style.setProperty('--dmqc-scale', scale);
        overlay.appendChild(panel);

        // 底板背景 + 徽记水印 + 四角饰（均为绝对定位、不拦截点击）
        panel.insertAdjacentHTML('beforeend',
            '<div class="dmqc-lvbu-bg" aria-hidden="true" style="position:absolute;left:0;top:0;width:100%;height:100%;background-size:cover;background-position:center;background-repeat:no-repeat;opacity:.32;pointer-events:none;transition:none;"></div>' +
            '<div class="dmqc-lvbu-emblem" aria-hidden="true" style="position:absolute;left:50%;top:50%;width:230px;height:230px;transform:translate(-50%,-50%);background-size:contain;background-position:center;background-repeat:no-repeat;opacity:.15;pointer-events:none;transition:none;"></div>' +
            '<div class="dmqc-lvbu-corner tl" aria-hidden="true" style="position:absolute;top:9px;left:9px;width:26px;height:26px;border-top:2px solid #45d8ff;border-left:2px solid #ff3fd0;border-top-left-radius:8px;opacity:.9;pointer-events:none;transition:none;"></div>' +
            '<div class="dmqc-lvbu-corner tr" aria-hidden="true" style="position:absolute;top:9px;right:9px;width:26px;height:26px;border-top:2px solid #ff3fd0;border-right:2px solid #45d8ff;border-top-right-radius:8px;opacity:.9;pointer-events:none;transition:none;"></div>' +
            '<div class="dmqc-lvbu-corner bl" aria-hidden="true" style="position:absolute;bottom:9px;left:9px;width:26px;height:26px;border-bottom:2px solid #ff3fd0;border-left:2px solid #45d8ff;border-bottom-left-radius:8px;opacity:.9;pointer-events:none;transition:none;"></div>' +
            '<div class="dmqc-lvbu-corner br" aria-hidden="true" style="position:absolute;bottom:9px;right:9px;width:26px;height:26px;border-bottom:2px solid #45d8ff;border-right:2px solid #ff3fd0;border-bottom-right-radius:8px;opacity:.9;pointer-events:none;transition:none;"></div>'
        );
        panel.querySelector('.dmqc-lvbu-bg').style.backgroundImage =
            "url('extension/大梦千秋/image/sgz_lvbu_dialog_bg.svg')";
        panel.querySelector('.dmqc-lvbu-emblem').style.backgroundImage =
            "url('extension/大梦千秋/image/sgz_lvbu_halberd.svg')";

        // ---------- 头部：头像 + 标题 + 竖排“武神” ----------
        const head = ui.create.div();
        head.style.cssText =
            'position:relative;display:flex;align-items:center;justify-content:center;gap:16px;text-align:left;transition:none;';
        panel.appendChild(head);

        const ava = ui.create.div();
        ava.style.cssText =
            'position:relative;flex:0 0 74px;width:74px;height:74px;border-radius:50%;background-size:cover;background-position:center 12%;' +
            'border:2px solid #45d8ff;box-shadow:0 0 0 3px rgba(0,0,0,.65),0 0 20px rgba(69,216,255,.4),inset 0 0 12px rgba(0,0,0,.6);transition:none;';
        ava.style.backgroundImage = "url('extension/大梦千秋/image/sgz_lvbu.jpg')";
        head.appendChild(ava);

        const titleWrap = ui.create.div();
        titleWrap.style.cssText = 'position:relative;flex:0 1 auto;text-align:center;transition:none;';
        titleWrap.innerHTML =
            '<div style="position:relative;display:block;font-family:xiaozhuan,KaiTi,STKaiti,serif;font-size:13px;letter-spacing:7px;color:#45d8ff;text-shadow:0 0 10px rgba(69,216,255,.5);margin-bottom:2px;transition:none;">梦 回 虎 牢 · 天 下 无 双</div>' +
            '<div style="position:relative;display:block;font-family:xinwei,KaiTi,serif;font-size:32px;line-height:1.15;letter-spacing:6px;color:#ffd76a;text-shadow:0 0 16px rgba(255,215,106,.5),0 2px 4px rgba(0,0,0,.8);white-space:nowrap;transition:none;">镇 猎 <i style="font-style:normal;color:#ff4f6d;font-size:26px;vertical-align:2px;">·</i> 噬 炁</div>' +
            '<div style="position:relative;display:block;font-size:13.5px;line-height:1.5;letter-spacing:.5px;color:#b9c8ff;margin-top:6px;transition:none;">' + (title || '') + '</div>';
        head.appendChild(titleWrap);

        const side = ui.create.div();
        side.style.cssText =
            'position:relative;flex:0 0 40px;width:40px;height:78px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;' +
            'border:1px solid rgba(69,216,255,.5);border-radius:6px;background:rgba(0,0,0,.35);box-shadow:inset 0 0 10px rgba(69,216,255,.12),inset 0 0 10px rgba(255,63,208,.1);transition:none;';
        side.innerHTML =
            '<span style="position:relative;display:block;font-family:xiaozhuan,KaiTi,serif;font-size:19px;line-height:1;color:#8fe8ff;transition:none;">武</span>' +
            '<span style="position:relative;display:block;font-family:xiaozhuan,KaiTi,serif;font-size:19px;line-height:1;color:#ff9aa8;transition:none;">神</span>';
        head.appendChild(side);

        // ---------- 分隔线 ----------
        const ruler = ui.create.div();
        ruler.style.cssText =
            'position:relative;display:block;height:1px;margin:13px 0 12px;transition:none;' +
            'background:linear-gradient(90deg,rgba(69,216,255,0),#45d8ff 18%,#ffd76a 50%,#ff3fd0 82%,rgba(255,63,208,0));';
        panel.appendChild(ruler);

        // ---------- 选项行 ----------
        const opts = ui.create.div();
        opts.style.cssText =
            'position:relative;display:flex;flex-wrap:nowrap;justify-content:center;align-items:stretch;gap:12px;transition:none;';
        panel.appendChild(opts);

        options.forEach(function (opt, i) {
            const data = dmqcLvbuOptionMap[opt.key] || {
                seal: ('' + (i + 1)),
                motto: '',
                accent: '#45d8ff',
            };
            const node = ui.create.div('dmqc-lvbu-opt');
            node.style.cssText = dmqcLvbuCardCss(false, data.accent);
            node.style.width = '150px';
            node.style.animation = 'dmqc-lvbu-opt-in .5s cubic-bezier(.2,.9,.3,1.12) both';
            node.style.animationDelay = (120 + i * 70) + 'ms';
            node.innerHTML =
                '<div class="dmqc-lvbu-opt-seal" style="position:relative;display:block;width:50px;height:50px;line-height:50px;margin:0 auto 9px;border-radius:50%;text-align:center;font-family:xiaozhuan,KaiTi,serif;font-size:28px;color:#0a0f1c;font-weight:bold;background:radial-gradient(circle at 35% 28%,#eaffff,#45d8ff 60%,#2b8fc0);border:2px solid rgba(255,223,138,.85);box-shadow:inset 0 0 9px rgba(0,0,0,.5),0 2px 5px rgba(0,0,0,.45);transition:none;">' + data.seal + '</div>' +
                '<div style="position:relative;display:block;font-family:KaiTi,STKaiti,serif;font-size:19px;letter-spacing:2px;color:#ffd76a;transition:none;">' + opt.label + '</div>' +
                '<div style="position:relative;display:block;font-family:KaiTi,STKaiti,serif;font-size:11.5px;letter-spacing:1px;color:#7fd6ff;margin:3px 0 7px;white-space:nowrap;transition:none;">' + data.motto + '</div>' +
                '<div style="position:relative;display:block;font-family:KaiTi,STKaiti,serif;font-size:12.5px;line-height:1.55;color:#cdd8f5;text-align:left;transition:none;">' + opt.desc + '</div>';
            node.addEventListener(evtName, function (e) {
                if (e) {
                    if (e.preventDefault) e.preventDefault();
                    if (e.stopPropagation) e.stopPropagation();
                }
                if (closed) return;
                if (chosen.indexOf(opt.key) >= 0) {
                    chosen.splice(chosen.indexOf(opt.key), 1);
                } else {
                    if (chosen.length >= max) return;
                    chosen.push(opt.key);
                }
                sync(false);
            });
            // 悬停高亮（内联，不复用全局 div 规则）
            node.addEventListener('mouseenter', function () {
                if (closed || chosen.indexOf(opt.key) >= 0) return;
                node.style.borderColor = data.accent;
                node.style.boxShadow = '0 6px 16px rgba(0,0,0,.6),inset 0 0 0 1px rgba(160,220,255,.15),0 0 18px ' + data.accent + '66';
            });
            node.addEventListener('mouseleave', function () {
                if (closed || chosen.indexOf(opt.key) >= 0) return;
                node.style.cssText = dmqcLvbuCardCss(false, data.accent);
            });
            opts.appendChild(node);
            optionNodes.push(node);
        });

        // ---------- 页脚 + 操作栏 ----------
        const foot = ui.create.div();
        foot.style.cssText =
            'position:relative;display:flex;align-items:center;justify-content:center;gap:12px;margin-top:14px;transition:none;';
        foot.innerHTML =
            '<div style="position:relative;display:block;font-family:xiaozhuan,KaiTi,serif;font-size:14px;letter-spacing:4px;color:#8fe8ff;text-shadow:0 0 10px rgba(69,216,255,.4);transition:none;">神威镇猎 · 梦 吕 布</div>' +
            '<div id="dmqc-lvbu-count" style="position:relative;display:block;font-family:yuanli,KaiTi,serif;font-size:11px;letter-spacing:1px;color:#9fb3e6;transition:none;"></div>';
        panel.appendChild(foot);
        const domCount = foot.querySelector('#dmqc-lvbu-count');

        const bar = ui.create.div();
        bar.style.cssText =
            'position:relative;display:flex;flex-direction:row;flex-wrap:nowrap;justify-content:center;align-items:center;gap:24px;margin:12px 0 2px;transition:none;';
        panel.appendChild(bar);

        okNode = ui.create.div();
        okNode.style.cssText =
            'position:relative;display:block;min-width:120px;padding:7px 4px;text-align:center;border-radius:8px;cursor:pointer;user-select:none;' +
            'font-family:KaiTi,STKaiti,serif;font-size:17px;letter-spacing:5px;color:#08111f;font-weight:bold;' +
            'background:linear-gradient(180deg,#9ff0ff,#45d8ff 55%,#2b9dcf);border:1px solid #cdf4ff;' +
            'box-shadow:0 0 14px rgba(69,216,255,.6),inset 0 0 0 1px rgba(255,255,255,.35);transition:filter .15s,opacity .15s;';
        okNode.innerHTML = '确 定';
        okNode.addEventListener(evtName, function (e) {
            if (e) {
                if (e.preventDefault) e.preventDefault();
                if (e.stopPropagation) e.stopPropagation();
            }
            if (!chosen.length || closed) return;
            finish({ bool: true, links: chosen.slice() });
        });
        bar.appendChild(okNode);

        const cancelNode = ui.create.div();
        cancelNode.style.cssText =
            'position:relative;display:block;min-width:120px;padding:7px 4px;text-align:center;border-radius:8px;cursor:pointer;user-select:none;' +
            'font-family:KaiTi,STKaiti,serif;font-size:17px;letter-spacing:5px;color:#ffd1d6;' +
            'background:linear-gradient(180deg,#2a1520,#160b12 60%,#0b060a);border:1px solid rgba(255,79,109,.5);' +
            'box-shadow:0 0 10px rgba(255,79,109,.25),inset 0 0 0 1px rgba(255,255,255,.06);transition:filter .15s,opacity .15s;';
        cancelNode.innerHTML = '取 消';
        cancelNode.addEventListener(evtName, function (e) {
            if (e) {
                if (e.preventDefault) e.preventDefault();
                if (e.stopPropagation) e.stopPropagation();
            }
            if (closed) return;
            finish({ bool: false });
        });
        bar.appendChild(cancelNode);

        sync(true);
    });
}

// ============================================================
//  卡面美化 + 蓄力能量柱（纯表现层，无游戏规则）
//  1) 为带“炁”标记的手牌附加幽光；为【镇猎】杀附加夸张烈焰卡面
//  2) 在武将牌右侧挂载“噬炁/镇猎蓄力”能量柱，显示当前蓄力点与上限
//  由 character/sgz_lvbu.js 以 skill 形式注册，随 enterGame 等时机触发。
// ============================================================

// 构建蓄力能量柱（挂载于武将牌右侧），存储于 player.dmqcLvbuGauge
function dmqcBuildChargeGauge(player) {
    if (player.dmqcLvbuGauge) {
        try { player.dmqcLvbuGauge.wrap.remove(); } catch (e) {}
        delete player.dmqcLvbuGauge;
    }
    const wrap = document.createElement('div');
    wrap.className = 'lvbu-charge';
    const label = document.createElement('div');
    label.className = 'lvbu-charge-label';
    label.textContent = '蓄力';
    const rod = document.createElement('div');
    rod.className = 'lvbu-charge-rod';
    const fill = document.createElement('div');
    fill.className = 'lvbu-charge-fill';
    const ticks = document.createElement('div');
    ticks.className = 'lvbu-charge-ticks';
    rod.appendChild(fill);
    rod.appendChild(ticks);
    const count = document.createElement('div');
    count.className = 'lvbu-charge-count';
    wrap.appendChild(label);
    wrap.appendChild(rod);
    wrap.appendChild(count);
    player.appendChild(wrap);
    player.dmqcLvbuGauge = { wrap, fill, ticks, count, lastMax: -1 };
}

// 刷新蓄力能量柱（当前蓄力 / 上限；上限增加时自动重绘刻度）
function dmqcRefreshChargeGauge(player) {
    try {
        // 玩家死亡/移除或不存在时不处理，并顺带停止轮询（避免延迟轮询在死亡角色上空转）
        if (!player || player.removed || (player.isOut && player.isOut())) {
            if (player && player.dmqcLvbuInterval) {
                try { clearInterval(player.dmqcLvbuInterval); } catch (e) {}
                delete player.dmqcLvbuInterval;
            }
            return;
        }
        if (!player.dmqcLvbuGauge) dmqcBuildChargeGauge(player);
        const g = player.dmqcLvbuGauge;
        const cur = player.countCharge();
        const max = player.getMaxCharge();
        const maxNum = (max === Infinity) ? -1 : max;
        const pct = (maxNum > 0) ? Math.max(0, Math.min(100, cur / maxNum * 100)) : 0;
        // 未变化则跳过（供轮询/多方触发复用，减少不必要的 DOM 写入）
        const sig = cur + '/' + maxNum + '/' + pct + (cur <= 0 ? 'e' : '');
        if (g._sig === sig) return;
        g._sig = sig;
        const isFull = maxNum > 0 && cur >= maxNum;
        g.fill.style.height = pct + '%';
        g.fill.classList.toggle('full', isFull);
        g.count.innerHTML = cur + '/' + (max === Infinity ? '∞' : maxNum);
        if (g.lastMax !== maxNum) {
            g.lastMax = maxNum;
            g.ticks.innerHTML = '';
            if (maxNum > 0 && maxNum <= 14) {
                for (let i = 1; i <= maxNum; i++) {
                    const t = document.createElement('i');
                    t.style.top = Math.round(i / maxNum * 100) + '%';
                    g.ticks.appendChild(t);
                }
            } else if (maxNum > 14) {
                const t = document.createElement('i');
                t.style.top = '0%';
                t.style.background = 'rgba(255,209,102,.85)';
                g.ticks.appendChild(t);
            }
        }
        g.wrap.classList.toggle('lvbu-charge-empty', cur <= 0);
    } catch (e) {
        // 表现层异常静默，不影响游戏逻辑
    }
}

// 启动“轮询刷新”：在武将牌上定时读取当前蓄力/上限并更新能量柱。
// 只在定时器回调里读写 DOM/计数值——完全脱离结算事件，避免在 damage 等事件进行中
// 读取 getMaxCharge/改写 DOM 造成重入卡死；同时保证任何蓄力变化都会在下一拍被反映。
function dmqcStartChargePolling(player) {
    try {
        if (player.dmqcLvbuInterval) clearInterval(player.dmqcLvbuInterval);
        player.dmqcLvbuInterval = setInterval(function () {
            dmqcRefreshChargeGauge(player);
        }, 400);
    } catch (e) {}
}

export const lvbuCardUI = {
    charlotte: true,
    silent: true,
    trigger: {
        player: ['enterGame', 'addMark', 'removeMark', 'damage'],
        global: ['gameStart', 'phaseBeginStart', 'roundStart', 'gainAfter', 'loseAfter'],
    },
    forced: true,
    priority: -10,
    init: function (player) {
        // 1. 注入烈焰滤镜（镇猎杀卡面）
        if (!document.getElementById('dmqc_lvbu_fire_svg')) {
            var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.id = 'dmqc_lvbu_fire_svg';
            svg.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none;';
            svg.innerHTML =
                '<filter id="dmqc-lvbu-fire-f">' +
                '<feTurbulence type="fractalNoise" baseFrequency="0.06 0.03" numOctaves="3" seed="3">' +
                '<animate attributeName="seed" from="3" to="80" dur="8s" repeatCount="indefinite"/>' +
                '</feTurbulence>' +
                '<feDisplacementMap in="SourceGraphic" scale="13"/>' +
                '</filter>';
            document.body.appendChild(svg);
        }
        // 2. 注入卡面 + 蓄力能量柱 样式
        if (!document.getElementById('dmqc_lvbu_card_style')) {
            const style = document.createElement('style');
            style.id = 'dmqc_lvbu_card_style';
            style.innerHTML = `
/* 蓄力能量柱（挂载于武将牌右侧） */
.lvbu-charge{position:absolute;left:100%;bottom:0;margin-left:5px;width:30px;height:110%;z-index:60;pointer-events:none;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:3px;}
.lvbu-charge-label{position:relative;font-family:yuanli,KaiTi,serif;font-size:8px;line-height:9px;letter-spacing:2px;color:rgba(160,230,255,.85);text-shadow:0 0 6px rgba(69,216,255,.7),0 1px 2px rgba(0,0,0,.9);writing-mode:vertical-rl;white-space:nowrap;margin-bottom:2px;}
.lvbu-charge-rod{position:relative;flex:1 1 auto;width:16px;min-height:0;border-radius:8px;background:linear-gradient(180deg,rgba(18,28,50,.9),rgba(6,10,22,.95));border:1px solid rgba(120,200,255,.45);box-shadow:inset 0 0 8px rgba(0,0,0,.65),0 0 8px rgba(69,216,255,.18);overflow:hidden;}
.lvbu-charge-fill{position:absolute;left:0;right:0;bottom:0;height:0%;border-radius:0 0 7px 7px;background:linear-gradient(0deg,#ffd166 0%,#ff8a3c 45%,#45d8ff 100%);box-shadow:0 0 12px rgba(69,216,255,.8);transition:height .45s cubic-bezier(.3,1.2,.5,1);}
.lvbu-charge-fill.full{background:linear-gradient(0deg,#fff3c0,#ffcf5e 40%,#ff9a3c 100%);box-shadow:0 0 16px rgba(255,209,102,.95),0 0 30px rgba(255,120,40,.5);}
.lvbu-charge-ticks{position:absolute;left:0;right:0;top:0;bottom:0;pointer-events:none;}
.lvbu-charge-ticks i{position:absolute;left:2px;right:2px;height:1px;background:rgba(160,230,255,.4);}
.lvbu-charge-count{position:relative;font-family:yuanli,KaiTi,serif;font-size:10px;line-height:1;color:#eaf6ff;text-shadow:0 0 6px rgba(69,216,255,.6),0 1px 2px rgba(0,0,0,.9);letter-spacing:.5px;}
.lvbu-charge-empty .lvbu-charge-rod{border-color:rgba(120,200,255,.3);opacity:.7;}

/* 炁牌幽光 */
.dmqc-qi-card{outline:1.5px solid rgba(123,231,255,.75);outline-offset:-1.5px;box-shadow:0 0 9px rgba(69,216,255,.55),0 0 18px rgba(124,110,255,.35);}

/* 镇猎杀 · 蓝红霓虹烈焰卡面 */
.dmqc-zhenlie-card{position:relative;transform:translateZ(0);}
.dmqc-zhenlie-card::before{content:"";position:absolute;top:-14px;left:-12px;right:-12px;bottom:-12px;z-index:-1;border-radius:14px;pointer-events:none;background:linear-gradient(to top,#0a1c3f 0%,#2b0a6b 20%,#c2158c 42%,#ff2d5a 52%,#5b2fff 66%,#2ee6ff 88%,#c9fbff 100%);filter:url(#dmqc-lvbu-fire-f) blur(1.4px);opacity:.85;animation:dmqc-zhenlie-flicker .55s infinite;}
.dmqc-zhenlie-card::after{content:"";position:absolute;top:-3px;left:-3px;right:-3px;bottom:-3px;border-radius:9px;pointer-events:none;border:2px solid rgba(130,220,255,.95);box-shadow:0 0 18px 4px rgba(60,190,255,.9),0 0 42px 12px rgba(255,45,120,.5),inset 0 0 14px rgba(80,150,255,.6);animation:dmqc-zhenlie-pulse 1.1s ease-in-out infinite;z-index:2;}
@keyframes dmqc-zhenlie-flicker{0%,100%{opacity:.75;transform:scale(1.03) translateY(0);}50%{opacity:.75;transform:scale(1) translateY(-2px);}}
@keyframes dmqc-zhenlie-pulse{0%,100%{border-color:rgba(60,200,255,.95);box-shadow:0 0 14px 4px rgba(60,190,255,.95),0 0 34px 10px rgba(255,45,120,.4),inset 0 0 10px rgba(80,150,255,.55);}50%{border-color:rgba(255,70,120,.95);box-shadow:0 0 26px 8px rgba(255,45,120,.95),0 0 58px 18px rgba(60,150,255,.5),inset 0 0 20px rgba(255,60,140,.55);}}
/* 卡面本体叠加“红蓝霓虹”静态底色滤镜（参照 trick-reward-active：色相旋转 + 降亮度 + 提对比度；仅作用于卡图 .image/.background，不影响外围火焰） */
.dmqc-zhenlie-card {filter: hue-rotate(260deg) brightness(0.9) contrast(1.2) !important;}
.dmqc-zhenlie-card > .image,
.dmqc-zhenlie-card > .background{filter:hue-rotate(260deg) brightness(0.9) contrast(1.2) !important;}
@media (prefers-reduced-motion: reduce){.dmqc-zhenlie-card::before,.dmqc-zhenlie-card::after{animation:none !important;}}
`;
            document.head.appendChild(style);
        }
        // 3. 构建蓄力能量柱（武将牌右侧）并启动定时轮询刷新（脱离结算事件，安全且实时）
        try { dmqcBuildChargeGauge(player); } catch (e) {}
        try { dmqcRefreshChargeGauge(player); } catch (e) {}
        dmqcStartChargePolling(player);
    },
    content: function () {
        // 为所有存活角色手牌中带“炁”/“镇猎”标记的卡附加卡面特效（炁卡可能在任意角色手中）
        try {
            for (let i = 0; i < game.players.length; i++) {
                const p = game.players[i];
                if (!p || p.isOut() || p.removed) continue;
                const cards = p.getCards('h');
                for (let j = 0; j < cards.length; j++) {
                    const c = cards[j];
                    if (c.hasGaintag && c.hasGaintag('sgz_qi')) c.classList.add('dmqc-qi-card');
                    else c.classList.remove('dmqc-qi-card');
                    if ((c.storage && c.storage.sgz_zhenlie_sha) || (c.hasGaintag && c.hasGaintag('sgz_zhenlie_sha'))) c.classList.add('dmqc-zhenlie-card');
                    else c.classList.remove('dmqc-zhenlie-card');
                }
            }
        } catch (e) {
            // 表现层异常静默，不影响游戏逻辑
        }
    },
    onremove: function (player) {
        if (player.dmqcLvbuInterval) {
            try { clearInterval(player.dmqcLvbuInterval); } catch (e) {}
            delete player.dmqcLvbuInterval;
        }
        if (player.dmqcLvbuGauge) {
            try { player.dmqcLvbuGauge.wrap.remove(); } catch (e) {}
            delete player.dmqcLvbuGauge;
        }
    },
};

export { dmqcLvbuStyleId, dmqcLvbuOptionMap, dmqcInjectLvbuStyle };
