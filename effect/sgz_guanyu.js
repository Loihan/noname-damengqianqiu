// ============================================================
//  梦关羽 · 特效层（梦刃·血魂主题选择框）
//  纯表现层，无游戏规则。由 character/sgz_guanyu.js 通过 import 使用。
// ============================================================
//  【魂断荆州·梦刃】专属选择框 —— 大梦千秋 · 梦关羽
//  替换无名杀引擎默认的“先选代价、再选效果”两段式框，
//  重绘为“血渊焚刃”主题的合一选择框：
//    · 上一行选【效果】，下一行选【代价】，下方【确认】才生效
//    · 未选代价/效果时【确认】置灰不可点，杜绝“选完即生效”
//  仅对本地人类玩家生效；AI/联机/托管/录像回放自动回退引擎默认框。
// ============================================================

import { dmqcMountParticles, dmqcMountSheen, dmqcToggleSheen } from "./dmqc_particles.js";

const dmqcMengrenStyleId = 'dmqc_mengren_style';

// 梦刃选项主题化展示数据（封印字 / 铭文 / 强调色）
const dmqcMengrenEffectMap = {
    wushen: { seal: '武', motto: '丹心化刃 · 神威破阵', accent: '#f0b64f' },
    wuhun: { seal: '魂', motto: '鬼影缠刃 · 索命无息', accent: '#b06aff' },
    loseall: { seal: '殒', motto: '血债血偿 · 断其生机', accent: '#ff4d4d' },
    healall: { seal: '愈', motto: '以命续命 · 起死回生', accent: '#4fd6a0' },
};
const dmqcMengrenCostMap = {
    suoming: { seal: '索', motto: '以魂为薪 · 祭此刃', accent: '#ff6a5a' },
    maxhp: { seal: '命', motto: '割舍性命 · 燃血锋', accent: '#c9923f' },
};

// 注入主题 keyframes（幂等）。其余样式全部内联化，杜绝“样式未生效/堆叠”问题。
function dmqcInjectMengrenStyle() {
    if (document.getElementById(dmqcMengrenStyleId)) return;
    const style = document.createElement('style');
    style.id = dmqcMengrenStyleId;
    style.innerHTML = `
/* 面板浮入 */
@keyframes dmqc-mengren-in {
    from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
    to   { opacity: 1; transform: translate(-50%, -50%) scale(var(--dmqc-mg-scale, 1)); }
}
/* 卡片浮现 */
@keyframes dmqc-mengren-opt-in {
    from { opacity: 0; transform: translateY(16px) scale(0.92); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
}
/* 选中卡：血金芒脉动 */
@keyframes dmqc-mengren-selected-pulse {
    0%, 100% { box-shadow: 0 0 16px 5px rgba(255,120,60,.75), 0 0 40px 12px rgba(199,29,29,.4), inset 0 0 0 1px rgba(255,240,210,.85), inset 0 0 20px rgba(255,120,60,.22); }
    50%      { box-shadow: 0 0 28px 9px rgba(255,160,70,.95), 0 0 62px 20px rgba(199,29,29,.6), inset 0 0 0 1px rgba(255,245,220,.95), inset 0 0 26px rgba(255,120,60,.3); }
}
/* 封印点燃 */
@keyframes dmqc-mengren-seal-fire {
    0%, 100% { box-shadow: inset 0 0 9px rgba(0,0,0,.5), 0 0 12px var(--acc, rgba(255,120,60,.5)); }
    50%      { box-shadow: inset 0 0 12px rgba(0,0,0,.45), 0 0 20px var(--acc, rgba(255,140,70,.9)); }
}
/* 按钮浮现 */
@keyframes dmqc-mengren-btn-in {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
    .dmqc-mengren, .dmqc-mengren-opt, .dmqc-mengren-opt.selected .dmqc-mengren-opt-seal {
        animation: none !important;
    }
}
`;
    document.head.appendChild(style);
}

// 构建梦关羽“梦刃”专属选择框（自包含 Promise：效果单选 + 代价单选 + 确认/取消）。
// @param player 发动者
// @param effects 效果卡数组 [{key,seal,name,motto,desc,accent,disabled,hint}]
// @param costs   代价卡数组 [{key,seal,name,motto,desc,accent,disabled,hint}]
// @returns {Promise<{bool:boolean, links:Array}>} links=[效果key, 代价key]
export function dmqcBuildMengrenDialog(player, effects, costs) {
    return new Promise(function (resolve) {
        try {
            dmqcInjectMengrenStyle();
        } catch (e) {}
        game.pause();

        const evtName = lib.config.touchscreen ? 'touchend' : 'click';
        let selEffect = null, selCost = null, closed = false;
        const effectNodes = [], costNodes = [];
        let okNode = null, domConfirmHint = null;

        // ---------- 结算 ----------
        function finish(result) {
            if (closed) return;
            closed = true;
            try { if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); } catch (e) {}
            game.resume();
            resolve(result);
        }

        // 仅一项可用时预选，减少点选次数
        function preselect() {
            const en = effects.filter(function (c) { return !c.disabled; });
            if (en.length === 1) selEffect = en[0].key;
            const ec = costs.filter(function (c) { return !c.disabled; });
            if (ec.length === 1) selCost = ec[0].key;
        }

        // ---------- 卡片基线样式 ----------
        function cardCss(sel, accent, disabled) {
            return 'position:relative;display:block;box-sizing:border-box;'
                + 'cursor:' + (disabled ? 'default' : 'pointer') + ';'
                + 'user-select:none;text-align:center;border-radius:11px;padding:14px 11px 12px;'
                + 'transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease,opacity .16s ease;'
                + 'background:linear-gradient(180deg,rgba(255,120,90,.07),rgba(255,120,90,0) 40%),'
                + 'linear-gradient(180deg,#2c0708 0%,#1b0405 58%,#0d0202 100%);'
                + 'border:2px solid ' + (sel ? accent : 'rgba(208,155,63,.42)') + ';'
                + 'box-shadow:' + (sel
                    ? '0 0 0 1px rgba(255,220,160,.3),inset 0 0 0 1px rgba(255,240,210,.18),inset 0 0 22px rgba(255,120,60,.26),0 6px 16px rgba(0,0,0,.6)'
                    : 'inset 0 0 0 1px rgba(255,200,140,.1),inset 0 0 22px rgba(0,0,0,.45),0 4px 12px rgba(0,0,0,.55)')
                + ';'
                + (sel ? 'transform:translateY(-6px) scale(1.05);' : '');
        }

        function sealCss(accent) {
            return 'position:relative;display:block;width:52px;height:52px;line-height:52px;margin:0 auto 9px;border-radius:12px;'
                + 'text-align:center;font-family:xiaozhuan,KaiTi,STKaiti,serif;font-size:30px;font-weight:bold;color:#f5e6c4;'
                + 'text-shadow:0 1px 2px rgba(0,0,0,.6);'
                + 'background:radial-gradient(circle at 35% 28%,' + accent + 'cc,' + accent + '44 60%,#0d0202 100%);'
                + 'border:2px solid ' + accent + ';'
                + 'box-shadow:inset 0 0 9px rgba(0,0,0,.5),0 2px 5px rgba(0,0,0,.45);transition:none;';
        }

        // ---------- 全屏遮罩（挂到游戏窗口层，避免被 body 缩放 transform 错位） ----------
        const overlay = ui.create.div();
        overlay.style.cssText =
            'position:absolute;left:0;top:0;width:100%;height:100%;z-index:99999;'
            + 'display:block;background:radial-gradient(120% 120% at 50% 42%,rgba(20,2,2,.5),rgba(6,0,0,.8));transition:none;';
        overlay.addEventListener(evtName, function (e) {
            if (e && e.stopPropagation) e.stopPropagation();
            if (e && e.preventDefault) e.preventDefault();
        });
        ui.window.appendChild(overlay);

        // ---------- 尺寸计算：按视口缩放，避免向下/向右溢出 ----------
        const designW = 760;
        const designH = 548;
        const vw = window.innerWidth || document.documentElement.clientWidth || 1366;
        const vh = window.innerHeight || document.documentElement.clientHeight || 768;
        const scale = Math.min(1, (vw - 24) / designW, (vh - 24) / designH);

        // ---------- 面板 ----------
        const panel = ui.create.div('dmqc-mengren');
        panel.style.cssText =
            'position:absolute;left:50%;top:50%;width:' + designW + 'px;'
            + 'transform:translate(-50%,-50%) scale(' + scale + ');transform-origin:center center;'
            + 'display:block;box-sizing:border-box;padding:18px 22px 14px;border-radius:14px;'
            + 'overflow:hidden;text-align:center;transition:none;color:#ece3cf;'
            + 'font-family:yuanli,KaiTi,STKaiti,serif;'
            + 'background:linear-gradient(180deg,#3c0708 0%,#220304 52%,#0c0202 100%);'
            + 'border:1px solid rgba(208,155,63,.6);'
            + 'box-shadow:0 0 0 1px rgba(0,0,0,.9),0 0 0 4px rgba(208,155,63,.18),0 0 0 7px rgba(199,29,29,.08),0 0 46px rgba(0,0,0,.85),inset 0 0 42px rgba(208,155,63,.06);'
            + 'animation:dmqc-mengren-in .42s cubic-bezier(.2,.9,.3,1.08) both;';
        panel.style.setProperty('--dmqc-mg-scale', scale);
        overlay.appendChild(panel);

        // 底板背景 + 徽记水印 + 四角锁链饰（绝对定位、不拦截点击）
        panel.insertAdjacentHTML('beforeend',
            '<div class="dmqc-mengren-bg" aria-hidden="true" style="position:absolute;left:0;top:0;width:100%;height:100%;background-size:cover;background-position:center;background-repeat:no-repeat;opacity:.34;pointer-events:none;transition:none;"></div>'
            + '<div class="dmqc-mengren-emblem" aria-hidden="true" style="position:absolute;left:50%;top:50%;width:250px;height:250px;transform:translate(-50%,-50%);background-size:contain;background-position:center;background-repeat:no-repeat;opacity:.15;pointer-events:none;transition:none;"></div>'
            + '<div class="dmqc-mengren-corner tl" aria-hidden="true" style="position:absolute;top:9px;left:9px;width:26px;height:26px;border-top:2px solid #d09b3f;border-left:2px solid #e8452a;border-top-left-radius:8px;opacity:.9;pointer-events:none;transition:none;"></div>'
            + '<div class="dmqc-mengren-corner tr" aria-hidden="true" style="position:absolute;top:9px;right:9px;width:26px;height:26px;border-top:2px solid #e8452a;border-right:2px solid #d09b3f;border-top-right-radius:8px;opacity:.9;pointer-events:none;transition:none;"></div>'
            + '<div class="dmqc-mengren-corner bl" aria-hidden="true" style="position:absolute;bottom:9px;left:9px;width:26px;height:26px;border-bottom:2px solid #e8452a;border-left:2px solid #d09b3f;border-bottom-left-radius:8px;opacity:.9;pointer-events:none;transition:none;"></div>'
            + '<div class="dmqc-mengren-corner br" aria-hidden="true" style="position:absolute;bottom:9px;right:9px;width:26px;height:26px;border-bottom:2px solid #d09b3f;border-right:2px solid #e8452a;border-bottom-right-radius:8px;opacity:.9;pointer-events:none;transition:none;"></div>'
        );
        panel.querySelector('.dmqc-mengren-bg').style.backgroundImage =
            "url('extension/大梦千秋/image/sgz_guanyu_dialog_bg.svg')";
        panel.querySelector('.dmqc-mengren-emblem').style.backgroundImage =
            "url('extension/大梦千秋/image/sgz_guanyu_emblem.svg')";

        // 血火星屑上浮层（在底板/徽记之上、正文之下）
        dmqcMountParticles(panel, "guanyu");

        // ---------- 头部：头像 + 标题 + 竖排“魂刃” ----------
        const head = ui.create.div();
        head.style.cssText =
            'position:relative;display:flex;align-items:center;justify-content:center;gap:16px;text-align:left;transition:none;';
        panel.appendChild(head);

        const ava = ui.create.div();
        ava.style.cssText =
            'position:relative;flex:0 0 74px;width:74px;height:74px;border-radius:50%;background-size:cover;background-position:center 12%;'
            + 'border:2px solid #d09b3f;box-shadow:0 0 0 3px rgba(0,0,0,.65),0 0 20px rgba(199,29,29,.5),inset 0 0 12px rgba(0,0,0,.6);transition:none;';
        ava.style.backgroundImage = "url('extension/大梦千秋/image/sgz_guanyu.jpg')";
        head.appendChild(ava);

        const titleWrap = ui.create.div();
        titleWrap.style.cssText = 'position:relative;flex:0 1 auto;text-align:center;transition:none;';
        titleWrap.innerHTML =
            '<div style="position:relative;display:block;font-family:xiaozhuan,KaiTi,STKaiti,serif;font-size:13px;letter-spacing:7px;color:#e8452a;text-shadow:0 0 10px rgba(199,29,29,.5);margin-bottom:2px;transition:none;">魂 断 荆 州 · 以 魂 为 刃</div>'
            + '<div style="position:relative;display:block;font-family:xinwei,KaiTi,serif;font-size:34px;line-height:1.15;letter-spacing:6px;color:#f2d57e;text-shadow:0 0 16px rgba(242,213,126,.55),0 2px 4px rgba(0,0,0,.8);white-space:nowrap;transition:none;">梦 刃 <i style="font-style:normal;color:#ff4d4d;font-size:26px;vertical-align:2px;">·</i> 血 渊 焚 刃</div>'
            + '<div style="position:relative;display:block;font-size:13.5px;line-height:1.5;letter-spacing:.5px;color:#cfc4ae;margin-top:6px;transition:none;">择一【效果】并付一【代价】，确认后发动梦刃</div>';
        head.appendChild(titleWrap);

        const side = ui.create.div();
        side.style.cssText =
            'position:relative;flex:0 0 40px;width:40px;height:82px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;'
            + 'border:1px solid rgba(208,155,63,.55);border-radius:6px;background:rgba(0,0,0,.35);box-shadow:inset 0 0 10px rgba(208,155,63,.12),inset 0 0 10px rgba(199,29,29,.1);transition:none;';
        side.innerHTML =
            '<span style="position:relative;display:block;font-family:xiaozhuan,KaiTi,serif;font-size:19px;line-height:1;color:#e8452a;transition:none;">魂</span>'
            + '<span style="position:relative;display:block;font-family:xiaozhuan,KaiTi,serif;font-size:19px;line-height:1;color:#f2d57e;transition:none;">刃</span>';
        head.appendChild(side);

        // ---------- 分隔线 ----------
        const ruler = ui.create.div();
        ruler.style.cssText =
            'position:relative;display:block;height:1px;margin:12px 0 10px;transition:none;'
            + 'background:linear-gradient(90deg,rgba(208,155,63,0),#d09b3f 18%,#f2d57e 50%,#e8452a 82%,rgba(232,69,42,0));';
        panel.appendChild(ruler);

        // ---------- 效果行 ----------
        function sectionLabel(text) {
            const lab = ui.create.div();
            lab.style.cssText =
                'position:relative;display:block;text-align:left;font-family:xiaozhuan,KaiTi,serif;font-size:12px;letter-spacing:4px;color:#b89b5f;margin:2px 2px 8px;transition:none;';
            lab.innerHTML = '◆ ' + text;
            return lab;
        }

        panel.appendChild(sectionLabel('选择要发动的效果'));

        const effectRow = ui.create.div();
        effectRow.style.cssText =
            'position:relative;display:flex;flex-wrap:nowrap;justify-content:center;align-items:stretch;gap:12px;transition:none;';
        panel.appendChild(effectRow);

        effects.forEach(function (opt, i) {
            const data = Object.assign({}, dmqcMengrenEffectMap[opt.key], opt);
            const node = ui.create.div('dmqc-mengren-opt');
            node.style.cssText = cardCss(false, data.accent, data.disabled);
            node.style.width = '158px';
            node.style.animation = 'dmqc-mengren-opt-in .5s cubic-bezier(.2,.9,.3,1.12) both';
            node.style.animationDelay = (110 + i * 60) + 'ms';
            node.innerHTML =
                '<div class="dmqc-mengren-opt-seal" style="' + sealCss(data.accent) + '">' + data.seal + '</div>'
                + '<div style="position:relative;display:block;font-family:KaiTi,STKaiti,serif;font-size:19px;letter-spacing:2px;color:#f2d57e;transition:none;">' + data.name + '</div>'
                + '<div style="position:relative;display:block;font-family:KaiTi,STKaiti,serif;font-size:11.5px;letter-spacing:1px;color:' + data.accent + ';margin:3px 0 6px;white-space:nowrap;transition:none;">' + data.motto + '</div>'
                + '<div style="position:relative;display:block;font-family:KaiTi,STKaiti,serif;font-size:12.5px;line-height:1.55;color:#d6c9a8;text-align:left;transition:none;">' + data.desc + '</div>'
                + (data.disabled
                    ? '<div style="position:relative;display:inline-block;margin-top:7px;padding:2px 9px;border-radius:9px;font-family:KaiTi,serif;font-size:11px;letter-spacing:1px;color:#ffd0c0;background:rgba(199,29,29,.35);border:1px solid rgba(199,29,29,.6);transition:none;">' + (data.hint || '不可选') + '</div>'
                    : '');
            node.addEventListener(evtName, function (e) {
                if (e) { if (e.preventDefault) e.preventDefault(); if (e.stopPropagation) e.stopPropagation(); }
                if (closed || data.disabled) return;
                selEffect = (selEffect === opt.key) ? null : opt.key;
                sync(false);
            });
            node.addEventListener('mouseenter', function () {
                if (closed || data.disabled || selEffect === opt.key) return;
                node.style.borderColor = data.accent;
                node.style.boxShadow = '0 6px 16px rgba(0,0,0,.6),inset 0 0 0 1px rgba(255,220,170,.15),0 0 18px ' + data.accent + '66';
            });
            node.addEventListener('mouseleave', function () {
                if (closed || data.disabled || selEffect === opt.key) return;
                node.style.cssText = cardCss(false, data.accent, data.disabled) + 'width:158px;';
            });
            effectRow.appendChild(node);
            // 选中时的斜向血金扫光（须在 innerHTML 赋值之后挂）
            dmqcMountSheen(node, 'rgba(255,225,190,.17)');
            effectNodes.push(node);
        });

        // ---------- 代价行 ----------
        const costGap = ui.create.div();
        costGap.style.cssText = 'position:relative;display:block;height:14px;transition:none;';
        panel.appendChild(costGap);

        panel.appendChild(sectionLabel('选择支付代价'));

        const costRow = ui.create.div();
        costRow.style.cssText =
            'position:relative;display:flex;flex-wrap:nowrap;justify-content:center;align-items:stretch;gap:14px;transition:none;';
        panel.appendChild(costRow);

        costs.forEach(function (opt, i) {
            const data = Object.assign({}, dmqcMengrenCostMap[opt.key], opt);
            const node = ui.create.div('dmqc-mengren-opt');
            node.style.cssText = cardCss(false, data.accent, data.disabled);
            node.style.width = '300px';
            node.style.animation = 'dmqc-mengren-opt-in .5s cubic-bezier(.2,.9,.3,1.12) both';
            node.style.animationDelay = (150 + i * 60) + 'ms';
            node.innerHTML =
                '<div style="position:relative;display:flex;align-items:center;justify-content:center;gap:12px;transition:none;">'
                + '<div class="dmqc-mengren-opt-seal" style="' + sealCss(data.accent) + ';width:46px;height:46px;line-height:46px;font-size:26px;margin:0;">' + data.seal + '</div>'
                + '<div style="position:relative;text-align:left;transition:none;">'
                + '<div style="position:relative;display:block;font-family:KaiTi,STKaiti,serif;font-size:18px;letter-spacing:1.5px;color:#f2d57e;transition:none;">' + data.name + '</div>'
                + '<div style="position:relative;display:block;font-family:KaiTi,STKaiti,serif;font-size:11px;letter-spacing:1px;color:' + data.accent + ';margin-top:3px;white-space:nowrap;transition:none;">' + data.motto + '</div>'
                + '</div></div>'
                + '<div style="position:relative;display:block;font-family:KaiTi,STKaiti,serif;font-size:12px;line-height:1.5;color:#d6c9a8;margin-top:8px;text-align:center;transition:none;">' + data.desc + '</div>'
                + (data.disabled
                    ? '<div style="position:relative;display:inline-block;margin-top:7px;padding:2px 9px;border-radius:9px;font-family:KaiTi,serif;font-size:11px;letter-spacing:1px;color:#ffd0c0;background:rgba(199,29,29,.35);border:1px solid rgba(199,29,29,.6);transition:none;">' + (data.hint || '不可选') + '</div>'
                    : '');
            node.addEventListener(evtName, function (e) {
                if (e) { if (e.preventDefault) e.preventDefault(); if (e.stopPropagation) e.stopPropagation(); }
                if (closed || data.disabled) return;
                selCost = (selCost === opt.key) ? null : opt.key;
                sync(false);
            });
            node.addEventListener('mouseenter', function () {
                if (closed || data.disabled || selCost === opt.key) return;
                node.style.borderColor = data.accent;
                node.style.boxShadow = '0 6px 16px rgba(0,0,0,.6),inset 0 0 0 1px rgba(255,220,170,.15),0 0 18px ' + data.accent + '66';
            });
            node.addEventListener('mouseleave', function () {
                if (closed || data.disabled || selCost === opt.key) return;
                node.style.cssText = cardCss(false, data.accent, data.disabled) + 'width:300px;';
            });
            costRow.appendChild(node);
            dmqcMountSheen(node, 'rgba(255,225,190,.17)');
            costNodes.push(node);
        });

        preselect();

        // ---------- 刷新（选中态 + 确认按钮可用性） ----------
        function sync(first) {
            effects.forEach(function (opt, i) {
                const node = effectNodes[i];
                if (!node) return;
                const data = Object.assign({}, dmqcMengrenEffectMap[opt.key], opt);
                const sel = selEffect === opt.key;
                node.classList.toggle('selected', sel);
                dmqcToggleSheen(node, sel);
                node.style.cssText = cardCss(sel, data.accent, data.disabled) + 'width:158px;';
                node.style.opacity = data.disabled ? '0.5' : '1';
                node.style.pointerEvents = data.disabled ? 'none' : 'auto';
                if (!data.disabled) {
                    if (first) {
                        node.style.animation = sel
                            ? 'dmqc-mengren-selected-pulse 1.4s ease-in-out infinite'
                            : 'dmqc-mengren-opt-in .5s cubic-bezier(.2,.9,.3,1.12) both';
                        node.style.animationDelay = sel ? '0ms' : (110 + i * 60) + 'ms';
                    } else {
                        node.style.animation = sel ? 'dmqc-mengren-selected-pulse 1.4s ease-in-out infinite' : 'none';
                        node.style.animationDelay = sel ? '0ms' : '';
                    }
                }
                const seal = node.querySelector('.dmqc-mengren-opt-seal');
                if (seal) {
                    seal.style.animation = sel ? 'dmqc-mengren-seal-fire 1.5s ease-in-out infinite' : 'none';
                    if (!sel) seal.style.boxShadow = 'inset 0 0 9px rgba(0,0,0,.5),0 2px 5px rgba(0,0,0,.45)';
                }
            });
            costs.forEach(function (opt, i) {
                const node = costNodes[i];
                if (!node) return;
                const data = Object.assign({}, dmqcMengrenCostMap[opt.key], opt);
                const sel = selCost === opt.key;
                node.classList.toggle('selected', sel);
                dmqcToggleSheen(node, sel);
                node.style.cssText = cardCss(sel, data.accent, data.disabled) + 'width:300px;';
                node.style.opacity = data.disabled ? '0.5' : '1';
                node.style.pointerEvents = data.disabled ? 'none' : 'auto';
                if (!data.disabled) {
                    if (first) {
                        node.style.animation = sel
                            ? 'dmqc-mengren-selected-pulse 1.4s ease-in-out infinite'
                            : 'dmqc-mengren-opt-in .5s cubic-bezier(.2,.9,.3,1.12) both';
                        node.style.animationDelay = sel ? '0ms' : (150 + i * 60) + 'ms';
                    } else {
                        node.style.animation = sel ? 'dmqc-mengren-selected-pulse 1.4s ease-in-out infinite' : 'none';
                        node.style.animationDelay = sel ? '0ms' : '';
                    }
                }
                const seal = node.querySelector('.dmqc-mengren-opt-seal');
                if (seal) {
                    seal.style.animation = sel ? 'dmqc-mengren-seal-fire 1.5s ease-in-out infinite' : 'none';
                    if (!sel) seal.style.boxShadow = 'inset 0 0 9px rgba(0,0,0,.5),0 2px 5px rgba(0,0,0,.45)';
                }
            });
            const ready = !!(selEffect && selCost);
            if (okNode) {
                okNode.style.opacity = ready ? '1' : '0.34';
                okNode.style.pointerEvents = ready ? 'auto' : 'none';
                okNode.style.filter = ready ? 'none' : 'grayscale(.75)';
            }
            if (domConfirmHint) {
                if (ready) domConfirmHint.innerHTML = '确认发动';
                else if (!selEffect && !selCost) domConfirmHint.innerHTML = '请先选择【效果】与【代价】';
                else if (!selEffect) domConfirmHint.innerHTML = '请选择【效果】';
                else domConfirmHint.innerHTML = '请选择【代价】';
            }
        }

        // ---------- 页脚 + 操作栏 ----------
        const foot = ui.create.div();
        foot.style.cssText =
            'position:relative;display:flex;align-items:center;justify-content:center;gap:14px;margin-top:13px;transition:none;';
        foot.innerHTML =
            '<div style="position:relative;display:block;font-family:xiaozhuan,KaiTi,serif;font-size:13.5px;letter-spacing:4px;color:#b89b5f;text-shadow:0 0 10px rgba(199,29,29,.35);transition:none;">血渊焚刃 · 梦 关 羽</div>';
        panel.appendChild(foot);

        const bar = ui.create.div();
        bar.style.cssText =
            'position:relative;display:flex;flex-direction:row;flex-wrap:nowrap;justify-content:center;align-items:center;gap:22px;margin:11px 0 2px;transition:none;';
        panel.appendChild(bar);

        okNode = ui.create.div();
        okNode.style.cssText =
            'position:relative;display:block;min-width:150px;padding:8px 6px;text-align:center;border-radius:9px;cursor:pointer;user-select:none;'
            + 'font-family:KaiTi,STKaiti,serif;font-size:18px;letter-spacing:5px;color:#2a0c06;font-weight:bold;'
            + 'background:linear-gradient(180deg,#ffe0a8,#f0b64f 55%,#c97f2a);border:1px solid #fff0cf;'
            + 'box-shadow:0 0 14px rgba(240,182,79,.6),inset 0 0 0 1px rgba(255,255,255,.35);transition:filter .15s,opacity .15s;';
        okNode.innerHTML = '确 定';
        okNode.addEventListener(evtName, function (e) {
            if (e) { if (e.preventDefault) e.preventDefault(); if (e.stopPropagation) e.stopPropagation(); }
            if (closed || !selEffect || !selCost) return;
            finish({ bool: true, links: [selEffect, selCost] });
        });
        bar.appendChild(okNode);

        const cancelNode = ui.create.div();
        cancelNode.style.cssText =
            'position:relative;display:block;min-width:120px;padding:8px 6px;text-align:center;border-radius:9px;cursor:pointer;user-select:none;'
            + 'font-family:KaiTi,STKaiti,serif;font-size:17px;letter-spacing:5px;color:#ffd1c6;'
            + 'background:linear-gradient(180deg,#2a1012,#160608 60%,#0b0304);border:1px solid rgba(199,29,29,.55);'
            + 'box-shadow:0 0 10px rgba(199,29,29,.25),inset 0 0 0 1px rgba(255,255,255,.06);transition:filter .15s,opacity .15s;';
        cancelNode.innerHTML = '取 消';
        cancelNode.addEventListener(evtName, function (e) {
            if (e) { if (e.preventDefault) e.preventDefault(); if (e.stopPropagation) e.stopPropagation(); }
            if (closed) return;
            finish({ bool: false });
        });
        bar.appendChild(cancelNode);

        // 提示文字（初始态）
        const hint = ui.create.div();
        hint.style.cssText =
            'position:relative;display:block;margin-top:7px;font-family:yuanli,KaiTi,serif;font-size:11px;letter-spacing:1px;color:#9c8a66;transition:none;';
        panel.appendChild(hint);
        domConfirmHint = hint;

        sync(true);
    });
}

// 供 character/sgz_guanyu.js 使用的导出
export { dmqcMengrenStyleId, dmqcMengrenEffectMap, dmqcMengrenCostMap, dmqcInjectMengrenStyle };
