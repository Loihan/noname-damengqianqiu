// ============================================================
//  梦小乔 · 特效层（五音选色框 + 武将牌右侧·五音记录特效）
//  纯表现层，无游戏规则。由 character/sgz_xiaoqiao.js 通过
//  import { dmqcBuildWuyinSuitDialog, wuyinRecordUI } 使用。
// ============================================================

// ---------- 主题数据（五音 = 宫商角徵羽，对应五种花色） ----------
// 顺序固定为【宫 商 角 徵 羽】，方便玩家阅读
const DMQC_WUYIN_ORDER = ["heart", "diamond", "none", "club", "spade"];
const DMQC_WUYIN_MAP = {
    heart:   { seal: "宫", suitSym: "♥", suitName: "红桃", name: "宫", desc: "回复体力 · 获得护甲", key: "gong",   accent: "#ff7a9c", glow: "rgba(255,122,156," },
    diamond: { seal: "商", suitSym: "♦", suitName: "方块", name: "商", desc: "造成伤害 · 失去体力", key: "shang", accent: "#ffd166", glow: "rgba(255,209,102," },
    none:    { seal: "角", suitSym: "◈", suitName: "无色", name: "角", desc: "减少体力上限", key: "jiao",  accent: "#bfe3d8", glow: "rgba(191,227,216," },
    club:    { seal: "徵", suitSym: "♣", suitName: "梅花", name: "徵", desc: "弃置牌", key: "zheng", accent: "#ff8a6b", glow: "rgba(255,138,107," },
    spade:   { seal: "羽", suitSym: "♠", suitName: "黑桃", name: "羽", desc: "摸牌后弃牌", key: "yu",   accent: "#7fb7ff", glow: "rgba(127,183,255," },
};

const dmqcWuyinStyleId = "dmqc_wuyin_style";

// 注入主题 keyframes（幂等）；关键布局全部内联化，杜绝“样式未生效/堆叠”问题
function dmqcInjectWuyinStyle() {
    if (document.getElementById(dmqcWuyinStyleId)) return;
    const style = document.createElement("style");
    style.id = dmqcWuyinStyleId;
    style.innerHTML = `
/* ============ 五音·弦歌入梦 选择框 ============ */
/* 对话框容器：强制居中 + 高自适应（规避引擎 .dialog 的 bottom:170px 强压盒高） */
.dmqc-wuyin-dialog {
    position: absolute !important;
    width: var(--dmqc-width, 884px) !important;
    max-width: calc(100vw - 24px) !important;
    height: auto !important;
    min-height: 0 !important;
    left: 50% !important;
    top: 50% !important;
    bottom: auto !important;
    transform: translate(-50%, -50%) scale(var(--dmqc-scale, 1)) !important;
    margin: 0 !important;
    padding: 0 !important;
    background: transparent !important;
    border: none !important;
    border-radius: 16px !important;
    box-shadow: none !important;
    overflow: visible !important;
    transition: none !important;
}
.dmqc-wuyin-dialog > .content-container {
    width: 100% !important;
    height: auto !important;
    min-height: 0 !important;
    position: relative !important;
    left: 0 !important;
    top: 0 !important;
    overflow: visible !important;
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    border-radius: 16px !important;
}
.dmqc-wuyin-dialog > .content-container > .content {
    display: block;
    position: relative !important;
    width: 100%;
    overflow: visible !important;
    padding: 0 !important;
    margin: 0 !important;
    border-radius: 16px;
}
.dmqc-wuyin-dialog > .bar { display: none !important; }
@keyframes dmqc-wuyin-in {
    from { opacity: 0; transform: scale(0.9) translateY(10px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes dmqc-wuyin-opt-in {
    from { opacity: 0; transform: translateY(16px) scale(0.92); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes dmqc-wuyin-seal-breathe {
    0%,100% { box-shadow: inset 0 0 9px rgba(0,0,0,.4), 0 0 12px rgba(0,0,0,.4); }
    50%     { box-shadow: inset 0 0 12px var(--acc-soft, rgba(255,255,255,.2)), 0 0 20px var(--acc, rgba(212,175,55,.6)); }
}
/* 音符飘起（装饰） */
@keyframes dmqc-wuyin-note-rise {
    0%   { transform: translateY(8px); opacity: 0; }
    20%  { opacity: .7; }
    100% { transform: translateY(-26px); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
    .dmqc-wuyin, .dmqc-wuyin-opt, .dmqc-wuyin-opt .dmqc-wuyin-opt-seal {
        animation: none !important;
    }
}
`;
    document.head.appendChild(style);
}

// 选项卡的内联样式（未选中/选中 两态）
function dmqcWuyinCardCss(selected, accent) {
    const acc = accent || "#e8d3a0";
    let css =
        'position:relative;display:block;flex:0 0 150px;box-sizing:border-box;width:150px;cursor:pointer;' +
        'user-select:none;text-align:center;border-radius:12px;padding:14px 10px 12px;transition:none;' +
        'background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,0) 40%),' +
        'linear-gradient(180deg,#123b36 0%,#0e2e2a 62%,#09211f 100%);' +
        'border:2px solid rgba(232,212,160,.35);' +
        'box-shadow:inset 0 0 0 1px rgba(220,240,235,.1),inset 0 0 24px rgba(0,0,0,.4),0 4px 12px rgba(0,0,0,.55);';
    if (selected) {
        css =
            'position:relative;display:block;flex:0 0 150px;box-sizing:border-box;width:150px;cursor:pointer;' +
            'user-select:none;text-align:center;border-radius:12px;padding:14px 10px 12px;transition:none;' +
            'background:radial-gradient(130% 130% at 50% 0%,rgba(255,255,255,.14),rgba(255,255,255,0) 60%),' +
            'linear-gradient(180deg,#16423c 0%,#103430 62%,#0a2824 100%);' +
            'border:3px solid ' + acc + ';' +
            'transform:translateY(-7px) scale(1.06);' +
            'box-shadow:0 0 20px 5px ' + acc + '88,0 0 46px 14px ' + acc + '33,inset 0 0 0 1px rgba(255,255,255,.12),inset 0 0 26px rgba(0,0,0,.35);';
    }
    return css;
}

/**
 * 构建【五音·变】专属“弦歌入梦”选色框。
 * 与引擎 chooseButton 兼容：返回 ui.create.dialog('hidden') 实例，
 * 卡片写入 dlg.buttons 且每张卡片 .link = 花色，点击即选定该花色（结算结构同 ui.click.ok）。
 * 仅对本地人类玩家生效（由 character 文件在其余场景回退到引擎默认框）。
 * @returns {object|null} 对话框实例
 */
export function dmqcBuildWuyinSuitDialog(player) {
    try {
        dmqcInjectWuyinStyle();

        // 当前未知数（A/B/C/D/E），用于在选项上展示实际数值
        const unk = (player && player.storage && player.storage.sgz_wuyin_unknown) ||
            { gong: 1, shang: 1, jiao: 1, zheng: 1, yu: 1 };

        const dlg = ui.create.dialog("hidden");
        dlg.classList.add("dmqc-wuyin-dialog");

        // ===== 布局内联化（不依赖外部样式表；按视口整体缩放，杜绝溢出与堆叠）=====
        const designW = 884;
        const designH = 486;
        const vw = window.innerWidth || document.documentElement.clientWidth || 1280;
        const vh = window.innerHeight || document.documentElement.clientHeight || 720;
        const dlgW = Math.min(designW, vw - 24);
        // 先赋 cssText（会重置内联样式），再设自定义属性
        dlg.style.cssText = "position:absolute;left:50%;top:50%;width:" + dlgW + "px;height:auto;bottom:auto;" +
            "margin:0;padding:0;overflow:visible;transition:none;" +
            "transform:translate(-50%,-50%) scale(var(--dmqc-scale,1));transform-origin:center center;";
        dlg.style.setProperty("--dmqc-scale",
            Math.min(1, (vw - 24) / designW, (vh - 24) / designH));
        dlg.style.setProperty("--dmqc-width", dlgW + "px");
        dlg.contentContainer.style.cssText = "position:relative;height:auto;min-height:0;overflow:visible;";
        dlg.content.style.cssText = "display:block;position:relative;width:100%;overflow:visible;padding:0;margin:0;";

        // ===== 面板主体 =====
        const panel = ui.create.div("dmqc-wuyin", dlg.content);
        panel.style.cssText =
            "position:relative;display:block;box-sizing:border-box;width:" + dlgW + "px;padding:18px 24px 14px;" +
            "overflow:hidden;text-align:center;transition:none;color:#eef7ef;" +
            "font-family:yuanli,KaiTi,STKaiti,serif;" +
            "background:linear-gradient(180deg,#11423c 0%,#0d2f2b 55%,#071d1f 100%);" +
            "border:1px solid rgba(232,212,160,.62);" +
            "box-shadow:0 0 0 1px rgba(0,0,0,.9),0 0 0 4px rgba(232,212,160,.18)," +
            "0 0 0 7px rgba(127,183,255,.06),0 0 48px rgba(0,0,0,.85),inset 0 0 46px rgba(127,183,255,.07);" +
            "animation:dmqc-wuyin-in .42s cubic-bezier(.2,.9,.3,1.08) both;";

        // 背景底图 + 五音徽记水印 + 四角饰（缺失时自动回退到纯 CSS 渐变）
        panel.insertAdjacentHTML("beforeend",
            '<div class="dmqc-wuyin-bg" aria-hidden="true" style="position:absolute;left:0;top:0;width:100%;height:100%;' +
            'background-size:cover;background-position:center;background-repeat:no-repeat;opacity:.30;pointer-events:none;transition:none;"></div>' +
            '<div class="dmqc-wuyin-emblem" aria-hidden="true" style="position:absolute;left:50%;top:50%;width:250px;height:250px;' +
            'transform:translate(-50%,-50%);background-size:contain;background-position:center;background-repeat:no-repeat;' +
            'opacity:.13;pointer-events:none;transition:none;"></div>' +
            '<div class="dmqc-wuyin-note" aria-hidden="true" style="position:absolute;font-size:15px;color:#d8f4ee;opacity:0;pointer-events:none;transition:none;">♪</div>' +
            '<div class="dmqc-wuyin-corner tl" aria-hidden="true" style="position:absolute;top:10px;left:10px;width:28px;height:28px;border-top:2px solid #d9b96a;border-left:2px solid #d9b96a;border-top-left-radius:7px;opacity:.9;pointer-events:none;transition:none;"></div>' +
            '<div class="dmqc-wuyin-corner tr" aria-hidden="true" style="position:absolute;top:10px;right:10px;width:28px;height:28px;border-top:2px solid #d9b96a;border-right:2px solid #d9b96a;border-top-right-radius:7px;opacity:.9;pointer-events:none;transition:none;"></div>' +
            '<div class="dmqc-wuyin-corner bl" aria-hidden="true" style="position:absolute;bottom:10px;left:10px;width:28px;height:28px;border-bottom:2px solid #d9b96a;border-left:2px solid #d9b96a;border-bottom-left-radius:7px;opacity:.9;pointer-events:none;transition:none;"></div>' +
            '<div class="dmqc-wuyin-corner br" aria-hidden="true" style="position:absolute;bottom:10px;right:10px;width:28px;height:28px;border-bottom:2px solid #d9b96a;border-right:2px solid #d9b96a;border-bottom-right-radius:7px;opacity:.9;pointer-events:none;transition:none;"></div>'
        );
        try {
            panel.querySelector(".dmqc-wuyin-bg").style.backgroundImage =
                "url('extension/大梦千秋/image/sgz_xiaoqiao_dialog_bg.svg')";
            panel.querySelector(".dmqc-wuyin-emblem").style.backgroundImage =
                "url('extension/大梦千秋/image/sgz_xiaoqiao_emblem.svg')";
        } catch (e) {}

        // 装饰音符（随机位置，缓缓上飘）
        try {
            const note = panel.querySelector(".dmqc-wuyin-note");
            for (let k = 0; k < 5; k++) {
                const n = note.cloneNode(true);
                n.style.left = (12 + Math.random() * 76) + "%";
                n.style.top = (30 + Math.random() * 40) + "%";
                n.style.fontSize = (11 + Math.random() * 8) + "px";
                n.style.animation = "dmqc-wuyin-note-rise " + (3 + Math.random() * 3) + "s ease-in-out " + (Math.random() * 3) + "s infinite";
                panel.appendChild(n);
            }
            note.remove();
        } catch (e) {}

        // ===== 头部：头像 + 标题 + 竖排“五音” =====
        const head = ui.create.div();
        head.style.cssText = "position:relative;display:flex;align-items:center;justify-content:center;gap:18px;text-align:left;transition:none;";
        panel.appendChild(head);

        const ava = ui.create.div();
        ava.style.cssText =
            "position:relative;flex:0 0 78px;width:78px;height:78px;border-radius:50%;background-size:cover;background-position:center 12%;" +
            "border:2px solid #d9b96a;box-shadow:0 0 0 3px rgba(0,0,0,.65),0 0 22px rgba(232,212,160,.4),inset 0 0 12px rgba(0,0,0,.6);transition:none;";
        try { ava.style.backgroundImage = "url('extension/大梦千秋/image/sgz_xiaoqiao.jpeg')"; } catch (e) {}
        head.appendChild(ava);

        const titleWrap = ui.create.div();
        titleWrap.style.cssText = "position:relative;flex:0 1 auto;text-align:center;transition:none;";
        titleWrap.innerHTML =
            '<div style="position:relative;display:block;font-family:xiaozhuan,KaiTi,STKaiti,serif;font-size:13px;letter-spacing:7px;color:#9fd8c6;text-shadow:0 0 10px rgba(127,183,255,.5);margin-bottom:2px;transition:none;">弦 歌 入 梦 · 五 音 流 转</div>' +
            '<div style="position:relative;display:block;font-family:xinwei,KaiTi,serif;font-size:32px;line-height:1.15;letter-spacing:6px;color:#f2d57e;text-shadow:0 0 14px rgba(242,213,126,.55),0 2px 4px rgba(0,0,0,.8);white-space:nowrap;transition:none;">五 音 <i style="font-style:normal;color:#ff7a9c;font-size:26px;vertical-align:2px;">·</i> 变</div>' +
            '<div style="position:relative;display:block;font-size:14.5px;letter-spacing:1px;color:#d6e7dd;margin-top:6px;transition:none;">请选择下一张使用牌「<b style="color:#f2d57e;font-family:xinwei,KaiTi,serif;font-weight:normal;font-size:16px;">' + get.translation(player) + '</b>」所定之音律花色</div>';
        head.appendChild(titleWrap);

        const side = ui.create.div();
        side.style.cssText =
            "position:relative;flex:0 0 44px;width:44px;height:88px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;" +
            "border:1px solid rgba(232,212,160,.55);border-radius:6px;background:rgba(0,0,0,.32);box-shadow:inset 0 0 12px rgba(232,212,160,.12);transition:none;";
        side.innerHTML =
            '<span style="position:relative;display:block;font-family:xiaozhuan,KaiTi,serif;font-size:21px;line-height:1;color:#ffd8e4;transition:none;">五</span>' +
            '<span style="position:relative;display:block;font-family:xiaozhuan,KaiTi,serif;font-size:21px;line-height:1;color:#a8c8ff;transition:none;">音</span>';
        head.appendChild(side);

        // ===== 分隔线 =====
        const ruler = ui.create.div();
        ruler.style.cssText =
            "position:relative;display:block;height:1px;margin:13px 0 12px;transition:none;" +
            "background:linear-gradient(90deg,rgba(232,212,160,0),#d9b96a 18%,#f2d57e 50%,#a8c8ff 82%,rgba(127,183,255,0));";
        panel.appendChild(ruler);

        // ===== 选项行：五音五色 =====
        const opts = ui.create.div();
        opts.style.cssText =
            "position:relative;display:flex;flex-wrap:nowrap;justify-content:center;align-items:stretch;gap:12px;transition:none;";
        panel.appendChild(opts);

        // 点击即选定并结算（结构同 ui.click.ok）
        const dmqcWuyinConfirm = function (btn) {
            const evt = _status.event;
            if (!btn || !evt) return;
            if (ui.confirm) ui.confirm.close();
            evt.result = {
                bool: true, buttons: [btn], cards: [], targets: [], confirm: "ok", links: [btn.link]
            };
            game.uncheck();
            game.resume();
        };

        const evtName = lib.config.touchscreen ? "touchend" : "click";

        DMQC_WUYIN_ORDER.forEach(function (suit, i) {
            const data = DMQC_WUYIN_MAP[suit] || DMQC_WUYIN_MAP.heart;
            const value = (unk[data.key] || 1);
            // 按当前未知数换算后的【具体效果】详细描述（替换原简略描述与“未知数”角标）
            let detail;
            if (suit === "heart") {
                detail = '令一名角色回复<b style="color:' + data.accent + ';">' + value + '</b>点体力并获得<b style="color:' + data.accent + ';">' + value + '</b>点护甲';
            } else if (suit === "diamond") {
                detail = '令一名角色受到<b style="color:' + data.accent + ';">' + value + '</b>点伤害并失去<b style="color:' + data.accent + ';">' + value + '</b>点体力';
            } else if (suit === "none") {
                detail = '令一名角色减少<b style="color:' + data.accent + ';">' + value + '</b>点体力上限';
            } else if (suit === "club") {
                detail = '令一名角色弃置<b style="color:' + data.accent + ';">' + (2 * value) + '</b>张牌';
            } else {
                detail = '令一名角色摸<b style="color:' + data.accent + ';">' + (3 * value) + '</b>张牌后弃置<b style="color:' + data.accent + ';">' + (3 * value) + '</b>张牌';
            }
            const btn = ui.create.div("dmqc-wuyin-opt", opts);
            btn.style.cssText = dmqcWuyinCardCss(false, data.accent);
            btn.style.setProperty("--acc", data.accent);
            btn.style.setProperty("--acc-soft", data.accent + "55");
            btn.style.animation = "dmqc-wuyin-opt-in .5s cubic-bezier(.2,.9,.3,1.12) both";
            btn.style.animationDelay = (130 + i * 70) + "ms";
            btn.innerHTML =
                // 音位封印（圆形字印）
                '<div class="dmqc-wuyin-opt-seal" style="position:relative;display:block;width:54px;height:54px;line-height:54px;margin:0 auto 9px;border-radius:50%;text-align:center;' +
                'font-family:xiaozhuan,KaiTi,serif;font-size:30px;color:#f7e3c4;font-weight:bold;' +
                'background:radial-gradient(circle at 35% 28%,' + (data.accent + "cc") + ',' + (data.accent + "55") + ' 62%,#0a2824 100%);' +
                'border:2px solid ' + data.accent + ';box-shadow:inset 0 0 9px rgba(0,0,0,.45),0 2px 5px rgba(0,0,0,.45);transition:none;">' + data.seal + '</div>' +
                // 花色符号
                '<div style="position:relative;display:block;font-family:georgia,serif;font-size:26px;line-height:1;color:' + data.accent + ';' +
                'text-shadow:0 0 10px ' + data.accent + '88;margin:2px 0 4px;transition:none;">' + data.suitSym + '</div>' +
                // 音名 + 花色名
                '<div style="position:relative;display:block;font-family:KaiTi,STKaiti,serif;font-size:20px;letter-spacing:3px;color:#f2d57e;transition:none;">' + data.name + ' · ' + data.suitName + '</div>' +
                // 效果详细描述（含当前未知数换算后的实际数值）
                '<div style="position:relative;display:block;font-family:KaiTi,STKaiti,serif;font-size:12px;line-height:1.6;color:#d6e7dd;margin:6px auto 0;max-width:132px;text-align:left;transition:none;">' + detail + '</div>';
            btn.link = suit;
            // 停用按钮原型式自动结算，改为我们自己的“点击即选定”（防止引擎 autoConfirm）
            btn.addEventListener(evtName, function (e) {
                if (e && e.stopPropagation) e.stopPropagation();
                const evt = _status.event;
                if (evt && evt.name === "chooseButton" && evt.player && evt.player.isMine() && !_status.auto && !_status.video) {
                    dmqcWuyinConfirm(this);
                } else {
                    ui.click.button.call(this);
                }
            });
            // 悬停高亮
            btn.addEventListener("mouseenter", function () {
                if (this._done) return;
                this.style.transform = "translateY(-7px) scale(1.06)";
                this.style.borderColor = data.accent;
                this.style.boxShadow = "0 8px 18px rgba(0,0,0,.6),inset 0 0 0 1px rgba(255,255,255,.12),0 0 18px " + data.accent + "77";
            });
            btn.addEventListener("mouseleave", function () {
                if (this._done) return;
                // 恢复未选中态的边框颜色与阴影（不能用 borderColor="" 清空，否则 border 简写会退化成 currentColor 近白色边框）
                this.style.transform = "";
                this.style.borderColor = "rgba(232,212,160,.35)";
                this.style.boxShadow = "inset 0 0 0 1px rgba(220,240,235,.1),inset 0 0 24px rgba(0,0,0,.4),0 4px 12px rgba(0,0,0,.55)";
            });
            dlg.buttons.push(btn);
        });

        // ===== 页脚 =====
        const foot = ui.create.div();
        foot.style.cssText =
            "position:relative;display:flex;align-items:center;justify-content:center;gap:14px;margin-top:13px;transition:none;";
        foot.innerHTML =
            '<div style="position:relative;display:block;font-family:xiaozhuan,KaiTi,serif;font-size:14px;letter-spacing:4px;color:#9fd8c6;text-shadow:0 0 10px rgba(127,183,255,.4);transition:none;">五音五色 · 梦 小 乔</div>' +
            '<div style="position:relative;display:block;font-family:yuanli,KaiTi,serif;font-size:11px;letter-spacing:1px;color:#8fbfae;transition:none;">点击一张音律卡即选定该花色</div>';
        panel.appendChild(foot);

        return dlg;
    } catch (e) {
        console.error("[梦小乔·五音变] 主题选择框构造失败：", e);
        return null;
    }
}

// ============================================================
//  武将牌右侧 · 五音记录特效（纯表现层，无游戏规则）
//  展示当前记录的音律与花色：最近四张用牌花色（音律） + 五音未知数。
//  由 character/sgz_xiaoqiao.js 以技能形式注册，随 enterGame 等时机触发。
// ============================================================

const DMQC_SUIT_SYM = { heart: "♥", diamond: "♦", none: "◈", club: "♣", spade: "♠" };
const DMQC_SUIT_COLOR = { heart: "#ff7a9c", diamond: "#ffd166", none: "#bfe3d8", club: "#ff8a6b", spade: "#7fb7ff" };
const DMQC_TONE_KEY = { heart: "gong", diamond: "shang", none: "jiao", club: "zheng", spade: "yu" };

const dmqcWuyinRecStyleId = "dmqc_wuyin_rec_style";
function dmqcInjectWuyinRecStyle() {
    if (document.getElementById(dmqcWuyinRecStyleId)) return;
    const style = document.createElement("style");
    style.id = dmqcWuyinRecStyleId;
    style.innerHTML = `
/* ===== 五音·记录特效（挂载于武将牌右侧，自动高度、紧凑不裁剪）===== */
.dmqc-wuyin-rec{position:absolute;left:100%;bottom:0;margin-left:4px;width:45px;z-index:60;pointer-events:none;
    display:flex;flex-direction:column;align-items:stretch;transition:none;}
.dmqc-wuyin-rec-banner{position:relative;flex:0 0 auto;text-align:center;padding:3px 0 2px;margin:0 1px;
    font-family:xiaozhuan,KaiTi,serif;font-size:10px;line-height:12px;letter-spacing:2px;color:#f2d57e;
    text-shadow:0 0 7px rgba(242,213,126,.6),0 1px 2px rgba(0,0,0,.9);
    border:1px solid rgba(232,212,160,.5);border-radius:6px;background:linear-gradient(180deg,rgba(18,59,54,.9),rgba(9,33,31,.95));
    box-shadow:inset 0 0 8px rgba(0,0,0,.5),0 0 8px rgba(232,212,160,.15);}
.dmqc-wuyin-rec-ban{position:relative;flex:0 0 auto;text-align:center;padding:0;margin:4px 3px 1px;height:1px;
    background:linear-gradient(90deg,rgba(232,212,160,0),rgba(232,212,160,.5),rgba(232,212,160,0));}
.dmqc-wuyin-rec-slots{position:relative;flex:0 0 auto;display:flex;flex-direction:column;justify-content:flex-end;gap:4px;padding:3px 3px 0;}
.dmqc-wuyin-rec-slot{position:relative;display:flex;align-items:center;justify-content:center;gap:5px;
    min-height:18px;border-radius:6px;border:1px solid rgba(232,212,160,.32);
    background:linear-gradient(180deg,rgba(18,59,54,.82),rgba(9,33,31,.88));
    box-shadow:inset 0 0 7px rgba(0,0,0,.45);transition:none;}
.dmqc-wuyin-rec-slot .sym{font-family:georgia,serif;font-size:15px;line-height:1;transition:none;}
.dmqc-wuyin-rec-slot .tn{font-family:KaiTi,STKaiti,serif;font-size:11px;line-height:1;color:#cfe8dd;transition:none;}
.dmqc-wuyin-rec-slot.empty{border-color:rgba(232,212,160,.18);opacity:.4;}
.dmqc-wuyin-rec-slot.empty .sym{color:#5f8f82;}
.dmqc-wuyin-rec-slot.new{border-color:rgba(242,213,126,.9);
    box-shadow:inset 0 0 7px rgba(0,0,0,.45),0 0 12px rgba(242,213,126,.5);}
.dmqc-wuyin-rec-slot.new .sym{text-shadow:0 0 8px rgba(255,255,255,.75);}
.dmqc-wuyin-next{position:relative;display:none;align-items:center;justify-content:center;gap:5px;
    min-height:18px;margin:0 3px;padding:0 3px;border-radius:6px;border:1px dashed rgba(242,213,126,.8);
    background:linear-gradient(180deg,rgba(38,54,50,.85),rgba(20,32,30,.9));transition:none;}
.dmqc-wuyin-next .sym{font-family:georgia,serif;font-size:15px;line-height:1;transition:none;}
.dmqc-wuyin-next .lb{font-family:yuanli,KaiTi,serif;font-size:9px;line-height:1;letter-spacing:1px;color:#f2d57e;transition:none;}
.dmqc-wuyin-cnts{position:relative;flex:0 0 auto;display:flex;flex-wrap:wrap;gap:2px;justify-content:center;padding:3px 3px 5px;}
.dmqc-wuyin-cnt{position:relative;display:flex;align-items:center;justify-content:center;gap:0;
    padding:1px 2px;border-radius:5px;border:1px solid rgba(232,212,160,.22);
    background:linear-gradient(180deg,rgba(18,59,54,.85),rgba(9,33,31,.9));transition:none;}
.dmqc-wuyin-cnt .tn{font-family:KaiTi,STKaiti,serif;font-size:9px;line-height:1.05;transition:none;}
.dmqc-wuyin-cnt .v{font-family:yuanli,KaiTi,serif;font-size:7px;line-height:1;color:#eaf6ef;text-shadow:0 0 4px rgba(255,255,255,.4);transition:none;}
@media (prefers-reduced-motion: reduce){.dmqc-wuyin-rec-slot.new .sym{text-shadow:0 0 8px rgba(255,255,255,.75);}}
`;
    document.head.appendChild(style);
}

// 构建“五音·记录”特效容器（挂载于武将牌节点，右侧）
function dmqcBuildWuyinRec(player) {
    if (player.dmqcWuyinRec) {
        try { player.dmqcWuyinRec.wrap.remove(); } catch (e) {}
        delete player.dmqcWuyinRec;
    }
    const wrap = document.createElement("div");
    wrap.className = "dmqc-wuyin-rec";

    const banner = document.createElement("div");
    banner.className = "dmqc-wuyin-rec-banner";
    banner.textContent = "五音";

    const ban = document.createElement("div");
    ban.className = "dmqc-wuyin-rec-ban";

    // 音律（最近四张用牌花色）
    const slots = document.createElement("div");
    slots.className = "dmqc-wuyin-rec-slots";
    const slotEls = [];

    // 待定花色（①当前已选定，尚未使用）：作为谱内首行，虚线框、区别于已记录花色
    const next = document.createElement("div");
    next.className = "dmqc-wuyin-next";
    next.style.display = "none";
    next.innerHTML = '<span class="sym"></span><span class="lb">待定</span>';
    slots.appendChild(next);

    for (let i = 0; i < 4; i++) {
        const s = document.createElement("div");
        s.className = "dmqc-wuyin-rec-slot empty";
        s.innerHTML = '<span class="sym"></span><span class="tn"></span>';
        slots.appendChild(s);
        slotEls.push(s);
    }

    // 未知数（五音 A/B/C/D/E）
    const cnts = document.createElement("div");
    cnts.className = "dmqc-wuyin-cnts";
    const cntMap = {};
    DMQC_WUYIN_ORDER.forEach(function (suit) {
        const d = DMQC_WUYIN_MAP[suit];
        const c = document.createElement("div");
        c.className = "dmqc-wuyin-cnt";
        c.innerHTML = '<span class="tn" style="color:' + d.accent + ';">' + d.seal + '</span>' +
            '<span class="v"></span>';
        c.querySelector(".tn").style.color = d.accent;
        cnts.appendChild(c);
        cntMap[d.key] = { node: c, val: c.querySelector(".v") };
    });

    wrap.appendChild(banner);
    wrap.appendChild(ban);
    wrap.appendChild(slots);
    wrap.appendChild(cnts);
    player.appendChild(wrap);

    player.dmqcWuyinRec = { wrap, banner, slots: slotEls, next, nextSym: next.querySelector(".sym"), cntMap };
}

// 刷新“五音·记录”特效（读 storage 并更新 DOM；带签名短路，避免无效写入）
function dmqcRefreshWuyinRec(player) {
    try {
        if (!player || player.removed || (player.isOut && player.isOut())) {
            if (player && player.dmqcWuyinRecInterval) {
                try { clearInterval(player.dmqcWuyinRecInterval); } catch (e) {}
                delete player.dmqcWuyinRecInterval;
            }
            return;
        }
        if (!player.dmqcWuyinRec) {
            // 只对拥有该技能的武将（梦小乔）构建；其余角色即便收到 global 触发也不渲染
            if (player.hasSkill && !player.hasSkill("sgz_xiaoqiao_record_ui")) return;
            dmqcBuildWuyinRec(player);
        }
        const rec = player.dmqcWuyinRec;
        const jilu = player.storage.sgz_wuyin_jilu || [];
        const unk = player.storage.sgz_wuyin_unknown || { gong: 1, shang: 1, jiao: 1, zheng: 1, yu: 1 };
        const nextSuit = player.storage.sgz_wuyin_nextSuit;

        const sig = jilu.join(",") + "|" +
            (unk.gong || 1) + "," + (unk.shang || 1) + "," + (unk.jiao || 1) + "," + (unk.zheng || 1) + "," + (unk.yu || 1) +
            "|" + (nextSuit || "");
        if (rec._sig === sig) return;
        rec._sig = sig;

        // 音律：最近四张用牌花色（最新一张固定在最上方，原本依次下移，最下方消失）
        const len = jilu.length;
        for (let i = 0; i < 4; i++) {
            const el = rec.slots[i];
            const jIdx = len - 1 - i;           // i=0 → 最新（jilu 末尾）；i 越大越旧
            const suit = (jIdx >= 0) ? jilu[jIdx] : undefined;
            if (suit && DMQC_WUYIN_MAP[suit]) {
                const d = DMQC_WUYIN_MAP[suit];
                el.className = "dmqc-wuyin-rec-slot" + (i === 0 ? " new" : ""); // 最上方一格 = 最新，高亮
                el.classList.remove("empty");
                el.querySelector(".sym").textContent = d.suitSym;
                el.querySelector(".sym").style.color = d.accent;
                el.querySelector(".tn").textContent = d.seal;
            } else {
                el.className = "dmqc-wuyin-rec-slot empty";
                el.querySelector(".sym").textContent = "◇";
                el.querySelector(".sym").style.color = "";
                el.querySelector(".tn").textContent = "";
            }
        }

        // 待定花色（⑤①已选定，尚未使用）
        const n = rec.next;
        if (nextSuit && DMQC_WUYIN_MAP[nextSuit]) {
            const d = DMQC_WUYIN_MAP[nextSuit];
            n.style.display = "flex";
            rec.nextSym.textContent = d.suitSym;
            rec.nextSym.style.color = d.accent;
            rec.nextSym.style.textShadow = "0 0 8px " + d.accent;
        } else {
            n.style.display = "none";
        }

        // 未知数
        for (const key in rec.cntMap) {
            rec.cntMap[key].val.textContent = unk[key] || 1;
        }
    } catch (e) {
        // 表现层异常静默，不影响游戏逻辑
    }
}

// 启动“轮询刷新”：脱离结算事件，在定时器里读 storage 并刷新（保证任何变化下一拍反映）
function dmqcStartWuyinRecPolling(player) {
    try {
        if (player.dmqcWuyinRecInterval) clearInterval(player.dmqcWuyinRecInterval);
        player.dmqcWuyinRecInterval = setInterval(function () {
            dmqcRefreshWuyinRec(player);
        }, 420);
    } catch (e) {}
}

export const wuyinRecordUI = {
    charlotte: true,
    silent: true,
    trigger: {
        player: ["enterGame", "addMark", "removeMark", "phaseUseAfter"],
        global: ["gameStart", "phaseBeginStart", "roundStart", "gainAfter", "loseAfter"],
    },
    forced: true,
    priority: -10,
    init: function (player) {
        try { dmqcInjectWuyinRecStyle(); } catch (e) {}
        try { dmqcBuildWuyinRec(player); } catch (e) {}
        try { dmqcRefreshWuyinRec(player); } catch (e) {}
        dmqcStartWuyinRecPolling(player);
    },
    content: function () {
        try { dmqcRefreshWuyinRec(player); } catch (e) {}
    },
    onremove: function (player) {
        if (player.dmqcWuyinRecInterval) {
            try { clearInterval(player.dmqcWuyinRecInterval); } catch (e) {}
            delete player.dmqcWuyinRecInterval;
        }
        if (player.dmqcWuyinRec) {
            try { player.dmqcWuyinRec.wrap.remove(); } catch (e) {}
            delete player.dmqcWuyinRec;
        }
    },
};

// 显式刷新“五音·记录”特效：供角色文件在【使用牌后 / 出牌阶段结束】两个触发点直接调用。
// 不依赖特效技能的触发链（addMark / phaseUseAfter 等），确保“待定”显示能及时刷新消失。
export function wuyinRefresh(player) {
    try {
        if (player && !player.removed && !(player.isOut && player.isOut())) {
            dmqcRefreshWuyinRec(player);
        }
    } catch (e) {}
}

export { dmqcWuyinStyleId, dmqcWuyinRecStyleId, DMQC_WUYIN_MAP, DMQC_WUYIN_ORDER, dmqcInjectWuyinStyle, dmqcInjectWuyinRecStyle };
