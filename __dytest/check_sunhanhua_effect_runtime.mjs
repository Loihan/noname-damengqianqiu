// ============================================================
//  自检：梦孙寒华表现层（effect/sgz_sunhanhua.js）
//  跑法：node extension/大梦千秋/__dytest/check_sunhanhua_effect_runtime.mjs
//
//  为什么要在 Node 里跑：这两个特效（手牌光框 / 五剑充能条）全是 DOM + CSS + SVG 建造代码，
//  光看语法查不出「拿错 DOM 节点」「点亮数量算错」「细线被撑成大矩形」这类问题，
//  而游戏里试一次成本很高（已经因此让用户白测了两轮）。这里用最小 DOM 假件把模块
//  **真加载、真建造、真刷新**一遍。
//
//  ⚠ 必须**先装好全局假件再 import 模块**（模块顶层就碰 window），所以用动态 import。
//  ⚠ 假件必须**照着真引擎的结构**做：真引擎里 `Card extends HTMLDivElement`，
//    卡牌对象**本身就是 DOM 元素**，`card.node` 只是个普通对象（装 .image/.name/.gaintag）。
//    第一版假件把 `card.node` 当成 DOM，于是测试全绿、游戏里却完全不显示 —— 假件必须像真的。
//  ⚠ 亮/暗之类"看起来对不对"没法自动测；能被自动测的是**结构与数值**：
//    剑的柄数、亮了几柄、亮的是不是最下面那几柄、文字读数、类名开关、光框挂在哪个节点上。
// ============================================================
import fs from "node:fs";

// ---------------------------------------------------------------- 最小 DOM
const allEls = [];

class El {
    constructor(tag, ns) {
        this.tagName = tag;
        this.ns = ns || null;
        this.children = [];
        this.attrs = {};
        this.parentNode = null;
        this._classes = new Set();
        this.style = {
            setProperty(k, v) {
                this[k] = v;
            },
            removeProperty(k) {
                delete this[k];
            },
        };
        this.textContent = "";
        this.innerHTML = "";
        this.id = "";
        this._position = "absolute";
        // 真卡牌上确实挂着一个普通对象 node（子元素字典），故意留着，验证代码没去用它
        this.node = {};
        allEls.push(this);
    }
    set className(v) {
        this._classes = new Set(String(v).split(/\s+/).filter(Boolean));
    }
    get className() {
        return [...this._classes].join(" ");
    }
    get classList() {
        const s = this._classes;
        return {
            add: (...cs) => cs.forEach(c => s.add(c)),
            remove: (...cs) => cs.forEach(c => s.delete(c)),
            contains: c => s.has(c),
            toggle: (c, on) => {
                if (on === undefined) s.has(c) ? s.delete(c) : s.add(c);
                else if (on) s.add(c);
                else s.delete(c);
            },
        };
    }
    setAttribute(k, v) {
        this.attrs[k] = String(v);
        if (k === "id") this.id = String(v);
        if (k === "class") this.className = String(v);
    }
    getAttribute(k) {
        return this.attrs[k];
    }
    appendChild(c) {
        c.parentNode = this;
        this.children.push(c);
        return c;
    }
    insertBefore(c, before) {
        c.parentNode = this;
        const i = this.children.indexOf(before);
        if (i < 0) this.children.push(c);
        else this.children.splice(i, 0, c);
        return c;
    }
    remove() {
        if (this.parentNode) {
            const i = this.parentNode.children.indexOf(this);
            if (i >= 0) this.parentNode.children.splice(i, 1);
        }
        this.parentNode = null;
    }
    matches(sel) {
        if (sel.startsWith(".")) return this._classes.has(sel.slice(1));
        return this.tagName === sel;
    }
    // 真 SVG 元素没有 offsetWidth/offsetHeight（所以代码里用 getBoundingClientRect 触发重排）
    getBoundingClientRect() {
        return { width: 46, height: 140, top: 0, left: 0, right: 46, bottom: 140 };
    }
    _walk(out) {
        for (const c of this.children) {
            out.push(c);
            if (c._walk) c._walk(out);
        }
        return out;
    }
    querySelector(sel) {
        return this._walk([]).find(e => e.matches(sel)) || null;
    }
    querySelectorAll(sel) {
        return this._walk([]).filter(e => e.matches(sel));
    }
}

globalThis.document = {
    head: new El("head"),
    body: new El("body"),
    createElement: tag => new El(tag),
    createElementNS: (ns, tag) => new El(tag, ns),
    getElementById: id => allEls.find(e => e.id === id) || null,
    // 真 DOM 的 querySelectorAll 只找**挂在文档树里**的元素，这里也照做（否则已 remove 的会被算进去）
    querySelectorAll: sel => [...document.head._walk([]), ...document.body._walk([])].filter(e => e.matches(sel)),
    querySelector: sel => [...document.head._walk([]), ...document.body._walk([])].find(e => e.matches(sel)) || null,
};
globalThis.window = {
    getComputedStyle: el => ({ position: el._position || "absolute" }),
    addEventListener() {},
};
globalThis.lib = {
    assetURL: "", // ⚠ 本机 lib.assetURL 就是空串（noname/util/index.js:4）
    // 只放测 ④ 候选池要用到的几项
    inpile: ["sha", "shan", "tao", "wuxie", "qinggang"],
    card: {
        sha: { type: "basic" },
        shan: { type: "basic" },
        tao: { type: "basic" },
        wuxie: { type: "trick" },
        qinggang: { type: "equip" },
    },
};
globalThis.get = {
    type: name => (lib.card[name] ? lib.card[name].type : undefined),
    translation: name => String(name), // ④的 backup() 里拼 prompt 会用到
    autoViewAs: card => card, // ④的 filter/dialog 里 `event.filterCard(get.autoViewAs({name}, "unsure"), ...)`
};
globalThis.game = { players: [], dead: [] };
// ④ 的 backup() 会用全局 `_status.dying` 判断"是不是在救濒死"
globalThis._status = { dying: [] };
// ④ 的 chooseButton.dialog 会调 ui.create.dialog；这里只需要一个"不炸"的最小假件
globalThis.ui = {
    create: {
        dialog: () => ({ add() {}, close() {} }),
    },
};
globalThis.setInterval = () => 0; // 不真的开轮询（否则 Node 进程不退出）

// ---------------------------------------------------------------- 加载模块
const EXT = new URL("../", import.meta.url);
const effectSrc = await import(new URL("effect/sgz_sunhanhua.js", EXT).href);
const fx = effectSrc;
const chr = (await import(new URL("character/sgz_sunhanhua.js", EXT).href)).default;

let pass = 0;
const checks = [];
function ok(name, cond, extra) {
    checks.push({ name, cond: !!cond, extra });
    if (cond) pass++;
}

// ---------------------------------------------------------------- 1. 常量与 import 链路
ok("标记上限 = 5", fx.SGZ_MJ_MAX === 5, fx.SGZ_MJ_MAX);
ok("标记名 = sgz_miaojian", fx.SGZ_MJ === "sgz_miaojian");
ok("牌标记名 = sgz_miaojian_card", fx.SGZ_MJ_TAG === "sgz_miaojian_card");
ok("角色文件 import 到了同一个 UI 技能对象", chr.skills.sgz_sunhanhua_ui === fx.sunhanhuaUI);
ok("角色文件 import 到了同一个卡牌特效对象", chr.skills.sgz_miaojian_card_ui === fx.miaojianCardUI);
const charSkills = chr.character.sgz_sunhanhua.skills;
ok("两个 UI 技能都进了角色 skills 数组（否则不会 init）", charSkills.includes("sgz_sunhanhua_ui") && charSkills.includes("sgz_miaojian_card_ui"), charSkills.join(","));
// ⚠ 描述文案你后来自己重写过（改成"蓄力技"文风），所以这里只锁"上限数字 = 常量值"，不锁具体文案
ok("技能描述里的上限数字跟着常量走（是 5，不是旧值 7）", new RegExp("[/／]" + fx.SGZ_MJ_MAX + "[）)]").test(chr.skillTranslate.sgz_miaojian_info) && !/[/／]7[）)]/.test(chr.skillTranslate.sgz_miaojian_info), chr.skillTranslate.sgz_miaojian_info.slice(0, 60));

// ---- 莲华①「即将受到【杀】的伤害时，弃一张牌并回复1点体力」（替换掉原来的"杀对你无效"）----
//  ⚠ 子技能 id 仍然是 `hujia`（最初是"获得护甲"，后来用户手动改成了"回复体力"，
//    代码里 `changeHujia(1)` 被注释、换成 `player.recover(1)`；**id 没改**，别被名字误导）。
{
    const lianhuaShell = chr.skills.sgz_lianhua;
    const lhHujia = lianhuaShell.subSkill.hujia;
    ok("莲华① 已换成 hujia 子技能（旧的 wuxiao 彻底删除）", !!lhHujia && !lianhuaShell.subSkill.wuxiao, Object.keys(lianhuaShell.subSkill).join(","));
    ok("莲华① 不再有『杀不能选择你为目标』的 mod.targetEnabled", !/targetEnabled/.test(String(lianhuaShell.subSkill.hujia && lianhuaShell.subSkill.hujia.mod || "")) && !/targetEnabled/.test(fs.readFileSync(new URL("character/sgz_sunhanhua.js", EXT), "utf8").replace(/^\s*\/\/.*$/gm, "")));
    ok("莲华① 的时机 = player: damageBegin3（受到伤害时，与②同口径）", String(JSON.stringify(lhHujia.trigger)) === '{"player":"damageBegin3"}', JSON.stringify(lhHujia.trigger));
    ok("莲华① 是锁定技式自动结算（forced + locked + 隐藏子技能）", lhHujia.forced === true && lhHujia.locked === true && lhHujia.charlotte === true);
    // filter：必须是【杀】造成的伤害，且至少有一张可弃的牌
    const mkHost = (count, cardName) => ({
        name: "梦孙寒华",
        countDiscardableCards: () => count,
        getCards: () => [],
    });
    const shaEvent = { card: { name: "sha" } };
    const trickEvent = { card: { name: "huogong" } };
    const noCardEvent = {};
    ok("莲华① filter：挨【杀】且有牌可弃 → 触发", lhHujia.filter(shaEvent, mkHost(1)) === true);
    ok("莲华① filter：不是【杀】的伤害 → 不触发", lhHujia.filter(trickEvent, mkHost(2)) === false && lhHujia.filter(noCardEvent, mkHost(2)) === false);
    ok("莲华① filter：没有可弃置的牌 → 不触发（免得白挨一次提示）", lhHujia.filter(shaEvent, mkHost(0)) === false);
    ok("莲华① filter：『视为【杀】』的虚拟牌也认（name 同样是 sha）", lhHujia.filter({ card: { name: "sha", isViewAsCard: true } }, mkHost(1)) === true);
    // content：弃牌 → 回复1点体力；弃牌失败则不回复
    const mkPlayer2 = opts => ({
        name: "梦孙寒华",
        hujia: 0,
        recovered: 0,
        asked: null,
        chooseToDiscard(...args) {
            this.asked = args;
            return {
                set() {
                    return this;
                },
                async forResult() {
                    return opts && opts.cancel ? { bool: false } : { bool: true, cards: [{ name: "shan" }] };
                },
            };
        },
        async recover(n = 1) {
            this.recovered += n;
        },
        async changeHujia(n) {
            this.hujia += n;
        },
    });
    const p1 = mkPlayer2();
    await lhHujia.content({}, {}, p1);
    ok("莲华① content：弃置区域是 he（手牌+装备）且强制选一张", String(p1.asked && p1.asked[0]) === "he" && p1.asked[1] === true, JSON.stringify(p1.asked));
    ok("莲华① content：弃牌后回复 1 点体力", p1.recovered === 1, p1.recovered);
    const p2 = mkPlayer2({ cancel: true });
    await lhHujia.content({}, {}, p2);
    ok("莲华① content：没能弃出牌就不回复（代价与收益绑定）", p2.recovered === 0, p2.recovered);
    ok("莲华① 描述已同步（写的是「弃置一张牌并回复一点体力」）", /①你即将受到杀的伤害时，你弃置一张牌并回复一点体力/.test(chr.skillTranslate.sgz_lianhua_info), chr.skillTranslate.sgz_lianhua_info);
}

// ---- 莲华②「每回合限一次」----
// 触发技的每回合限一次 = `usable: 1`（引擎原生：结算时累加 storage.counttrigger[技能id]，
// filterTrigger 到量就不再触发，counttrigger 在 phaseAfter 自我清理 ⇒ 效果就是每回合一次）。
// ⚠ 不是 `round: 1`（那是"每轮"限一次，粒度更粗）。
const lianhuaMark = chr.skills.sgz_lianhua.subSkill.mark;
ok("莲华② 用的是 usable: 1（引擎原生的每回合限一次）", lianhuaMark.usable === 1, lianhuaMark.usable);
ok("莲华② 没有用 round（那是每轮，粒度更粗）", lianhuaMark.round === undefined, lianhuaMark.round);
ok("莲华② 仍然只在受到伤害时触发、且是锁定技", String(JSON.stringify(lianhuaMark.trigger)).includes("damageBegin3") && lianhuaMark.forced === true && lianhuaMark.locked === true, JSON.stringify(lianhuaMark.trigger));
ok("莲华② 的伤害结算逻辑没被改坏（仍然是加标记 → 校准手牌）", /addMark\(SGZ_MJ, 1\)/.test(String(lianhuaMark.content)) && /sgzMjSync\(player\)/.test(String(lianhuaMark.content)));
ok("莲华② 的技能描述写明了每回合限一次", /每回合限一次/.test(chr.skillTranslate.sgz_lianhua_info), chr.skillTranslate.sgz_lianhua_info);

// ---- 莲华③「回合开始时和结束时，弃置所有非妙剑手牌」（强度限制）----
//  要点：时机必须是 `phaseZhunbeiBegin` + `phaseJieshuBegin`，且挂在 **player** 上（只认自己回合）；
//        只弃**不带**妙剑标记的牌（带标记的是②的不变量，弃了会被 sgzMjSync 立刻摸回来）。
{
    const lianhua = chr.skills.sgz_lianhua;
    const lhDiscard = lianhua.subSkill.discard;
    ok("莲华③ 子技能存在且登记进了 group", !!lhDiscard && String(JSON.stringify(lianhua.group)).includes("sgz_lianhua_discard"), JSON.stringify(lianhua.group));
    ok("莲华③ 的 group 与 subSkill 完全对账（现在共 3 个）", (() => {
        const inGroup = (lianhua.group || []).map(g => String(g).replace("sgz_lianhua_", "")).sort().join(",");
        const inSub = Object.keys(lianhua.subSkill).sort().join(",");
        return inGroup === inSub && inSub === "discard,hujia,mark";
    })(), JSON.stringify(lianhua.group) + " vs " + Object.keys(lianhua.subSkill).join(","));
    ok("莲华③ 挂在**自己的**开始/结束阶段（player 而非 global）", (() => {
        const t = lhDiscard.trigger;
        return Array.isArray(t.player) && t.player.includes("phaseZhunbeiBegin") && t.player.includes("phaseJieshuBegin") && !t.global;
    })(), JSON.stringify(lhDiscard.trigger));
    ok("莲华③ 是锁定技式自动结算（forced + locked + 隐藏子技能）", lhDiscard.forced === true && lhDiscard.locked === true && lhDiscard.charlotte === true);
    ok("莲华③ 是 content 而不是 mod（它要真的弃牌）", typeof lhDiscard.content === "function" && String(lhDiscard.content).includes("player.discard"));

    // 真跑一遍：带标记的留下，其余的进弃牌堆
    const mkTagged = tagged => ({ name: tagged ? "sha" : "shan", hasGaintag: t => tagged && t === fx.SGZ_MJ_TAG });
    const marked = mkTagged(true), plain1 = mkTagged(false), plain2 = mkTagged(false);
    const mkHost = all => ({
        name: "梦孙寒华",
        discarded: null,
        getCards(position, filter) {
            return all.filter(c => !filter || filter(c));
        },
        async discard(cards) {
            this.discarded = cards;
        },
    });
    const hostA = mkHost([marked, plain1, plain2]);
    await lhDiscard.content({}, {}, hostA);
    ok("莲华③：只弃非妙剑手牌（妙剑牌必须留在手里）", (() => {
        const d = hostA.discarded || [];
        return d.length === 2 && d.includes(plain1) && d.includes(plain2) && !d.includes(marked);
    })(), (hostA.discarded || []).length);
    const hostB = mkHost([marked]);
    await lhDiscard.content({}, {}, hostB);
    ok("莲华③：手里只剩妙剑牌时不弃（也不产生空的弃牌事件）", hostB.discarded === null);
    ok("莲华③ 的 filter：没有可弃的牌就不触发（避免空放技能提示）", lhDiscard.filter({}, mkHost([marked])) === false && lhDiscard.filter({}, mkHost([marked, plain1])) === true);
    ok("莲华③ 描述已同步", /③你的回合开始时和结束时，你弃置所有非/.test(chr.skillTranslate.sgz_lianhua_info), chr.skillTranslate.sgz_lianhua_info);
}

// ---- 「妙剑」标记徽标：只删显示、逻辑不动 ----
//  武将牌右侧已经自绘了充能条，所以武将牌上那个标记徽标要拿掉。
//  ⚠ 但**计数本体**是 `player.storage["sgz_miaojian"]`，和 `mark`/`intro` 无关，必须一律保留。
//  ⚠ 引擎有**三道**和徽标有关的闸门，只关一道没用（结论务必保留）：
//      ① addSkill 时：`if (info.mark) this.markSkill(...)`（player.js:10056）
//      ② addMark 时：无条件 `markSkill(i)`，而没有显式 info 时它会自己读
//         `lib.skill[i].intro`，**只要有 intro 就照样建徽标**（player.js:4277 + 9299-9304）
//      ③ removeMark 到 0 时：`this[storage[i] || lib.skill[i].mark ? "markSkill" : "unmarkSkill"]`
//         （player.js:4240）—— 留着 `mark` 会在归零后继续挂一个"0"的徽标
//  ⇒ 所以 `mark` / `marktext` / `intro` 三个都必须从空壳技能上删掉。
{
    const mjShell = chr.skills.sgz_miaojian;
    ok("妙剑空壳不再有 mark: true（否则 addSkill 就建徽标）", !mjShell.mark, mjShell.mark);
    ok("妙剑空壳不再有 intro（否则每次 addMark 会把徽标建回来）", !mjShell.intro, JSON.stringify(mjShell.intro));
    ok("妙剑空壳不再有 marktext（徽标文字的唯一用途，跟着一起删）", !mjShell.marktext, mjShell.marktext);
    ok("徽标字段删干净了：空壳上查不到 mark/marktext/intro 任何一个", !["mark", "marktext", "intro"].some(k => k in mjShell), Object.keys(mjShell).join(","));
    // 引擎两道闸门的判据（照抄引擎写法）必须都是 falsy —— 注册后引擎读的就是这个对象
    const gateAddSkill = !!mjShell.mark;
    const gateAddMark = !!mjShell.intro;
    ok("引擎两道建徽标的闸门都关着（info.mark 与 lib.skill[i].intro 均为假）", !gateAddSkill && !gateAddMark, "mark=" + gateAddSkill + " intro=" + gateAddMark);
    // 逻辑一律保留
    ok("标记计数逻辑没被动过：①加标记 / 莲华②加标记 / 上限判定 都还在", /addMark\(SGZ_MJ, 1\)/.test(String(mjShell.subSkill.gain.content)) && /addMark\(SGZ_MJ, 1\)/.test(String(lianhuaMark.content)) && /countMark\(SGZ_MJ\)/.test(String(mjShell.subSkill.gain.filter)));
    ok("④仍然靠 removeMark(SGZ_MJ, 1, false) 消耗标记", /removeMark\(SGZ_MJ, 1, false\)/.test(String(mjShell.subSkill.use.chooseButton.backup([[null, null, "sha"]]).precontent)));
    ok("技能名仍然可翻译为「妙剑」（addMark 的日志在没 intro 时会回落到它，日志文案因此不变）", chr.skillTranslate.sgz_miaojian === "妙剑", chr.skillTranslate.sgz_miaojian);
    ok("莲华②/踏寂等其它技能的徽标没被误伤（踏寂伤害 +1 的 mark 还在）", chr.skills.sgz_taqi.subSkill.damage.mark === true && chr.skills.sgz_taqi.subSkill.damage.marktext === "+1");
}

// ---- 妙剑⑤「你的普通杀视为刺杀」已按需求删除（作为强度限制的补偿）----
//  ⑤ 是「杀 → nature: stab」的 `mod.cardnature` 改写；删除时必须**两处一起改**：
//    · `subSkill.stab` 整个拿掉；
//    · `group` 里的 `"sgz_miaojian_stab"` 也要摘掉（引擎按 group 认领子技能，
//      留着一个不存在的名字会让它去 lib.skill 里找一个空壳）。
{
    const mjShell = chr.skills.sgz_miaojian;
    const charText = fs.readFileSync(new URL("character/sgz_sunhanhua.js", EXT), "utf8").replace(/^\s*\/\/.*$/gm, "");
    ok("⑤ 的子技能 stab 已删除", !mjShell.subSkill.stab);
    ok("group 里不再有 sgz_miaojian_stab", !String(JSON.stringify(mjShell.group)).includes("sgz_miaojian_stab"), JSON.stringify(mjShell.group));
    ok("①②③④ 四个子技能都还在（只删了⑤）", ["gain", "sync", "limit", "use"].every(k => !!mjShell.subSkill[k]), Object.keys(mjShell.subSkill).join(","));
    ok("group 与 subSkill 对得上（没有多、也没有少）", (() => {
        const inGroup = (mjShell.group || []).map(g => String(g).replace("sgz_miaojian_", "")).sort().join(",");
        const inSub = Object.keys(mjShell.subSkill).sort().join(",");
        return inGroup === inSub;
    })(), JSON.stringify(mjShell.group) + " vs " + Object.keys(mjShell.subSkill).join(","));
    ok("技能描述里不再有⑤、也不再提「刺杀」", !/⑤/.test(chr.skillTranslate.sgz_miaojian_info) && !/刺杀/.test(chr.skillTranslate.sgz_miaojian_info), chr.skillTranslate.sgz_miaojian_info.slice(-60));
    ok("代码里不再有 cardnature→stab 的改写（否则等于⑤还在）", !/cardnature/.test(charText) && !/return "stab"/.test(charText));
    ok("妙剑牌特效 / 充能条不受影响（⑤只是改 nature，从不参与这两者）", (fx.SGZ_MJ === "sgz_miaojian") && (fx.SGZ_MJ_MAX === 5));
}

// ---- 妙剑④：必须给引擎「凭空造牌」的钩子 hiddenCard，否则响应时根本不会被询问 ----
// 踩过：别人放锦囊不问我（hasWuxie 认为我没无懈）、要打出杀/闪也不问我、濒死不能印桃；
// 只有手牌里恰好有那张真牌时才会被问 —— 根因就是 `hiddenCard` 没写。
// ⚠ 子技能在**模块里**挂在 `skills.父技能.subSkill.<key>`；
//   注册成 `lib.skill["父_子"]` 是引擎 `game.finishSkill` 干的（game/index.js:8933-8953）。
const mjUse = chr.skills.sgz_miaojian.subSkill.use;
ok("妙剑④ 提供了 hiddenCard 钩子（引擎的『本技能能造出名为 name 的牌』接口）", typeof mjUse.hiddenCard === "function");
ok("妙剑④ 仍然同时支持使用与打出", String(JSON.stringify(mjUse.enable)).includes("chooseToUse") && String(JSON.stringify(mjUse.enable)).includes("chooseToRespond"));
// 造个能过门槛的假角色：有技能、有标记、手上有带标记的牌
function mkMjPlayer(opts) {
    const o = opts || {};
    const card = {
        hasGaintag: t => t === fx.SGZ_MJ_TAG,
    };
    return {
        name: "梦孙寒华",
        hasSkill: () => o.hasSkill !== false,
        countMark: () => (o.mark === undefined ? 1 : o.mark),
        getCards: (pos, filter) => {
            const all = o.tagged === false ? [] : [card];
            return filter ? all.filter(c => filter(c)) : all;
        },
    };
}
const mjP = mkMjPlayer();
ok("④ hiddenCard：无懈可击 → 可以（这条就是『别人放锦囊会来问我』的关键）", mjUse.hiddenCard(mjP, "wuxie") === true);
ok("④ hiddenCard：杀 / 闪 / 桃 → 都可以（杀闪响应、濒死求桃）", ["sha", "shan", "tao"].every(n => mjUse.hiddenCard(mjP, n) === true));
ok("④ hiddenCard：装备牌 → 不可以（按需求排除装备）", mjUse.hiddenCard(mjP, "qinggang") === false);
ok("④ hiddenCard：没有标记时不可以", mjUse.hiddenCard(mkMjPlayer({ mark: 0 }), "wuxie") === false);
ok("④ hiddenCard：手上没有「妙剑」牌时不可以", mjUse.hiddenCard(mkMjPlayer({ tagged: false }), "wuxie") === false);
ok("④ hiddenCard：没有这个技能时不可以", mjUse.hiddenCard(mkMjPlayer({ hasSkill: false }), "wuxie") === false);
ok("④ hiddenCard：牌堆里没有的牌名不可以", mjUse.hiddenCard(mjP, "not_a_card") === false);

// ---- ④ 濒死求桃：filter 必须能接住"没有 filterCard 的事件" ----
//  引擎的 `canSave()` → `hasUsableCard()` → `info.filter(evt, player)`（player.js:2607-2624）
//  会传一个**不是 chooseToUse 的事件**（濒死链上是 `_save`/`dying`），它没有 `filterCard`。
//  以前这里直接 `event.filterCard(...)` → TypeError → 濒死流程被打断 ⇒ "妙剑造桃救不了自己"。
//  ⚠ 梦赵云【龙霄】的 filter 里就有这个守卫，这也是本次修复照抄的地方。
{
    const okNoThrow = evt => {
        try {
            return mjUse.filter(evt, mkMjPlayer()) === true;
        } catch (e) {
            return false;
        }
    };
    ok("④ filter：事件没有 filterCard 时不抛错（濒死 canSave 那条链就是这种事件）", okNoThrow({ name: "_save" }));
    ok("④ filter：没有 filterCard 且没标记/没妙剑牌时也不说能用", (() => {
        try {
            return mjUse.filter({ name: "_save" }, mkMjPlayer({ mark: 0 })) === false && mjUse.filter({ name: "_save" }, mkMjPlayer({ tagged: false })) === false;
        } catch (e) {
            return false;
        }
    })());
    ok("④ filter：正常时机下仍然逐张问 filterCard", (() => {
        const asked = [];
        const evt = {
            filterCard: (card, player, event) => {
                asked.push(card.name);
                return card.name === "tao";
            },
        };
        const got = mjUse.filter(evt, mkMjPlayer());
        return got === true && asked.includes("tao") && asked.length > 1;
    })());
    ok("④ 的 chooseButton.dialog 也不会因为事件没有 filterCard 而抛错", (() => {
        try {
            mjUse.chooseButton.dialog({ name: "_save" }, mkMjPlayer());
            return true;
        } catch (e) {
            return false;
        }
    })());
}

// ---- ④ 濒死求桃：backup 只接管 filterTarget，**绝不能动 selectTarget** ----
//  现象：战报只有"孙寒华使用了桃"，没有"回复了体力" ⇒ `lib.card.tao.content`（`target.recover()`）
//  压根没跑 ⇒ 这次使用**没有目标**。根因是引擎 `_save` 的目标过滤靠 `_status.event.dying`
//  （content.js:39），chooseButton 型视为技在目标判定那一步已经拿不到它 ⇒ 人人都不可选。
//  ⇒ 修法：濒死时自己用全局 `_status.dying` 写 `filterTarget`（只认当前被求桃的那一个）。
//  ⚠⚠ **不能顺手写 `selectTarget: 1`**：引擎对 `selectTarget: -1`（【桃】自己的值）有特殊分支
//    `if (range[1] <= -1)`（game/check.js:63-73）会**自动把所有可选目标勾上** —— 这正是
//    "濒死求桃不用手点目标"的实现；写成 1 就会没收自动勾选、确定键变灰（用户实测过）。
{
    const mkLinks = name => [[null, null, name]];
    globalThis._status.dying = [];
    const normal = mjUse.chooseButton.backup(mkLinks("sha"), mkMjPlayer());
    ok("④ backup：非濒死时不碰 selectTarget/filterTarget（交回引擎默认）", normal.selectTarget === undefined && normal.filterTarget === undefined, JSON.stringify(Object.keys(normal)));
    ok("④ backup：平时仍然带 filterCard/viewAs/position/selectCard/precontent", typeof normal.filterCard === "function" && normal.viewAs.name === "sha" && normal.position === "h" && normal.selectCard === 1 && typeof normal.precontent === "function");
    const dyingMe = { hp: 0, countCards: () => 0, name: "梦孙寒华" };
    const dyingOther = { hp: -1, countCards: () => 3, name: "乙" };
    const healthy = { hp: 1, countCards: () => 2, name: "甲" };
    globalThis._status.dying = [dyingMe, dyingOther];
    const save = mjUse.chooseButton.backup(mkLinks("tao"), mkMjPlayer());
    ok("④ backup：濒死时**不设置** selectTarget（保住引擎的自动勾选目标）", save.selectTarget === undefined, save.selectTarget);
    ok("④ backup：濒死时 filterTarget 只认当前被求桃的那一个（_status.dying[0]）", save.filterTarget({ name: "tao" }, mkMjPlayer(), dyingMe) === true && save.filterTarget({ name: "tao" }, mkMjPlayer(), dyingOther) === false && save.filterTarget({ name: "tao" }, mkMjPlayer(), healthy) === false);
    globalThis._status.dying = [];
}

{
    const self = mkMjPlayer();
    ok("④ ai.save 配了 skillTagFilter（不再刷『疑似忘给…加skillTagFilter了』）", typeof mjUse.ai.skillTagFilter === "function");
    ok("④ skillTagFilter：有标记 + 有妙剑牌时认 save/respondSha/Shan/Wuxie", ["save", "respondSha", "respondShan", "respondWuxie"].every(t => mjUse.ai.skillTagFilter(self, t) === true));
    ok("④ skillTagFilter：没标记时不认", mjUse.ai.skillTagFilter(mkMjPlayer({ mark: 0 }), "save") === false);
    ok("④ skillTagFilter：手上没有妙剑牌时不认", mjUse.ai.skillTagFilter(mkMjPlayer({ tagged: false }), "save") === false);
    ok("④ skillTagFilter：没有这个技能时不认", mjUse.ai.skillTagFilter(mkMjPlayer({ hasSkill: false }), "save") === false);
    ok("④ skillTagFilter：无关的 tag 一律不认", mjUse.ai.skillTagFilter(self, "fireAttack") === false);
}
ok("④ 候选池有缓存但会跟着牌堆变化重建", (() => {
    const before = mjUse.hiddenCard(mjP, "wuxie");
    lib.inpile.push("wuxie_copy");
    lib.card.wuxie_copy = { type: "trick" };
    const after = mjUse.hiddenCard(mjP, "wuxie_copy");
    lib.inpile.pop();
    delete lib.card.wuxie_copy;
    return before === true && after === true && mjUse.hiddenCard(mjP, "wuxie_copy") === false;
})());
ok("④ 的 AI 标签保留（respondSha/Shan/Wuxie/save）", ["respondSha", "respondShan", "respondWuxie", "save"].every(k => mjUse.ai[k] === true), JSON.stringify(mjUse.ai));

// ---------------------------------------------------------------- 2. 不许再依赖外部图片文件
// （踩过：外部 .svg 当图片引在这个环境里不可靠；而且 rail 细线被 left:0;right:0 撑成大矩形）
const moduleText = fs.readFileSync(new URL("effect/sgz_sunhanhua.js", EXT), "utf8");
// 注释里会"提到"这些写法（用来记录踩过的坑），先剥掉纯注释行再查
const moduleCode = moduleText
    .split("\n")
    .filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join("\n");
ok("模块里不再引用任何外部图片（.svg/.png/.jpg）", !/url\(\s*['"]?[^)'"]*\.(svg|png|jpg|jpeg|webp)/i.test(moduleCode));
ok("模块里不再出现 effect/miaojian 素材路径", !/effect\/miaojian/.test(moduleCode));
ok("不再用 innerHTML 塞整段 SVG（改走 createElementNS 现建）", !/innerHTML\s*=\s*[`'"]\s*<svg/i.test(moduleCode));
ok("卡框与剑都不引用外部素材", !/<image\s/.test(moduleCode) && !/xlink:href/.test(moduleCode));

// ---------------------------------------------------------------- 3. 样式注入
function collectCss() {
    return document.head.children.map(s => s.innerHTML).join("\n");
}
/// 去掉 CSS 注释后的"纯代码"：反面断言必须用它 —— 否则注释里为了"以后想加回来"留的
/// 示例代码/类名会被误判成"又加回来了"（踩过一次）。
function cssCode() {
    return collectCss().replace(/\/\*[\s\S]*?\*\//g, "");
}
ok("卡牌特效 CSS 已注入", fx.dmqcInjectMiaojianCardStyle() && collectCss().includes(".dmqc-mj-aura"));
ok("卡牌自带光晕 CSS 已注入", collectCss().includes(".dmqc-mj-glow"));
ok("卡牌光框是纯 CSS（边框 + 内外辉 + 四角剑翎）", /\.dmqc-mj-aura\s*\{[^}]*border:\s*2px solid/.test(collectCss()) && collectCss().includes(".dmqc-mj-aura::before"));
// 反面断言：卡面上"时不时扫过的高光"（.dmqc-mj-aura::after + dmqc-mj-sweep）已按需求删除
ok("斜向扫光已删除（CSS 里没有 ::after 扫光层，也没有 dmqc-mj-sweep）", (() => {
    const css = cssCode();
    return !/dmqc-mj-sweep/.test(css) && !/\.dmqc-mj-aura::after\s*\{/.test(css);
})());
ok("充能条 CSS 已注入", fx.dmqcInjectMiaojianBarStyle() && collectCss().includes(".dmqc-mjbar-wrap"));
ok("充能条 CSS 里有单柄点亮态与迸发动画", collectCss().includes(".dmqc-mjsvg-sword.on") && collectCss().includes("dmqc-mjsvg-flash"));
// ⚠ 反面断言：绝不能再出现"left:0; right:0"这种被撑满的细线（用户截图里那块大矩形就是它）
ok("CSS 里没有 left:0; right:0 撑满式的细条", !/left:\s*0;\s*right:\s*0/.test(collectCss()));
// 条子必须是"5 柄独立小剑 + 莲台"，不是赵云那种量筒
ok("CSS 里没有量筒式的剑身裁剪/填充", !collectCss().includes("clipPath") && !collectCss().includes("blade_clip"));
ok("两个 CSS 都只注入一次（幂等）", (() => {
    fx.dmqcInjectMiaojianCardStyle();
    fx.dmqcInjectMiaojianBarStyle();
    return document.head.children.filter(s => s.innerHTML.includes(".dmqc-mj-aura")).length === 1;
})());
// 反面断言：卡面的「翠绿滤镜」层已按需求**删除**，不许再回来（它会改掉卡面本身的颜色）
ok("翠绿滤镜层已彻底移除（CSS 里查不到 .dmqc-mj-tint / 混色层 / 那两个动画）", (() => {
    const css = cssCode();
    return !/dmqc-mj-tint/.test(css) && !/mix-blend-mode/.test(css) && !/tintbreath|tintspin/.test(css) && !/@supports not/.test(css);
})());

// ---------------------------------------------------------------- 4. 充能条结构
const player = new El("div");
player.name = "梦孙寒华";
player.countMark = () => 3;
player.getCards = () => [];

const bar = fx.dmqcBuildMiaojianBar(player);
ok("充能条已挂到 player 节点上", player.children.some(c => c.className.includes("dmqc-mjbar-wrap")));
const wrap = bar.wrap;
const host = wrap.children.find(c => c.className.includes("dmqc-mjbar-svghost"));
ok("有条内 SVG 宿主", !!host);
const svg = host && host.children.find(c => c.tagName === "svg");
ok("宿主里真的建出了一个 <svg> 元素", !!svg && svg.ns === "http://www.w3.org/2000/svg");
ok("SVG 带 viewBox", !!svg && !!svg.attrs.viewBox, svg && svg.attrs.viewBox);
const text = wrap.children.find(c => c.className.includes("dmqc-mjbar-text"));
ok("文字就是「妙剑 3/5」", text.textContent === "妙剑 3/5", text.textContent);

const swordEls = host.querySelectorAll(".dmqc-mjsvg-sword");
ok("剑阵里正好有「上限」柄剑", swordEls.length === fx.SGZ_MJ_MAX, swordEls.length);
ok("每柄剑都是真的画了形状（不是空的占位 div）", swordEls.every(g => g.children.length >= 6), swordEls.map(g => g.children.length).join(","));

// ★ 排版三条硬要求（用户明确提的）：竖直不倾斜、大小一致、等距排满 0~100%
ok("5 柄剑都不倾斜（transform 里没有 rotate）", swordEls.every(g => !/rotate/.test(String(g.attrs.transform || ""))), swordEls.map(g => g.attrs.transform).join(" | "));
ok("5 柄剑大小完全一致（形状子元素数量与路径都一样）", (() => {
    const sig = g => g.children.map(c => c.tagName + ":" + JSON.stringify(c.attrs)).join("|");
    const first = sig(swordEls[0]);
    return swordEls.every(g => sig(g) === first);
})());
ok("5 柄剑竖直等距排满整条（圆心步长 = 单柄高度，首尾正好顶到画布上下边）", (() => {
    const vb = String(svg.attrs.viewBox).split(/\s+/).map(Number); // [0,0,W,H]
    const H = vb[3];
    const ys = swordEls.map(g => parseFloat((String(g.attrs.transform).match(/translate\([\d.]+ ([\d.]+)\)/) || [])[1]));
    if (!ys.every(Number.isFinite)) return false;
    // 单柄的上下极值直接从图形里量（剑尖 / 剑首最低点），不写死数字
    const ysOf = g => g.children.map(c => String(c.attrs.d || c.attrs.y || "")).join(" ");
    const tip = Math.min(...String(swordEls[0].children[0].attrs.d).match(/-?\d+(\.\d+)?/g).map(Number));
    const pommel = Math.max(...String(swordEls[0].children[swordEls[0].children.length - 1].attrs.d).match(/-?\d+(\.\d+)?/g).map(Number));
    const swordH = pommel - tip;
    const steps = ys.slice(1).map((v, i) => v - ys[i]);
    const even = steps.every(s => Math.abs(s - steps[0]) < 0.01); // ⚠ 第 0 柄在最下面，步长是负的
    return (
        even &&
        Math.abs(Math.abs(steps[0]) - swordH) < 0.01 &&  // 等距且正好相接（不重叠不留缝）
        Math.abs(ys[ys.length - 1] + tip) < 0.01 &&      // 最上一柄的剑尖 = 画布顶（0）
        Math.abs(ys[0] + pommel - H) < 0.01              // 最下一柄的剑首 = 画布底（100%）
    );
})(), swordEls.map(g => g.attrs.transform).join(" | "));
ok("画布高度 = 上限 × 单柄高度（5 柄正好排满）", (() => {
    const vb = String(svg.attrs.viewBox).split(/\s+/).map(Number);
    const tip = Math.min(...String(swordEls[0].children[0].attrs.d).match(/-?\d+(\.\d+)?/g).map(Number));
    const pommel = Math.max(...String(swordEls[0].children[swordEls[0].children.length - 1].attrs.d).match(/-?\d+(\.\d+)?/g).map(Number));
    return Math.abs(vb[3] - (pommel - tip) * fx.SGZ_MJ_MAX) < 0.01;
})());

// 莲台已按需求删除
ok("已经没有莲台（DOM 里查不到，CSS 里也没有）", host.querySelectorAll(".dmqc-mjsvg-lotus").length === 0 && !collectCss().includes("lotus") && !collectCss().includes("bloom"));
ok("条子的 SVG 里只剩 5 柄剑 + defs，没有别的装饰块", (() => {
    const others = svg.children.filter(c => c.tagName !== "defs" && !c.className.includes("dmqc-mjsvg-sword"));
    return others.length === 0;
})(), svg.children.map(c => c.tagName + "." + c.className).join(","));

const litCount = () => host.querySelectorAll(".dmqc-mjsvg-sword").filter(s => s.classList.contains("on")).length;
ok("3 枚标记 → 正好点亮 3 柄", litCount() === 3, litCount());
ok("点亮的必须是**最下面**那 3 柄", (() => {
    const all = host.querySelectorAll(".dmqc-mjsvg-sword");
    return all.slice(0, 3).every(s => s.classList.contains("on")) && all.slice(3).every(s => !s.classList.contains("on"));
})());
ok("未满时没有 full 类", !wrap.classList.contains("full"));

// 满充能
player.countMark = () => 5;
fx.dmqcRefreshMiaojianBar(player);
ok("满充能文字 5/5", text.textContent === "妙剑 5/5", text.textContent);
ok("满充能点亮全部 5 柄", litCount() === 5, litCount());
ok("满充能有 full 类（只提亮文字，不再有莲台之类的额外特效）", wrap.classList.contains("full"));

// 0 充能
player.countMark = () => 0;
fx.dmqcRefreshMiaojianBar(player);
ok("0 充能一柄都不亮", litCount() === 0, litCount());

// "刚点亮"的迸发：新亮的那几柄带 pop；没亮的必须没有
player.countMark = () => 2;
fx.dmqcRefreshMiaojianBar(player);
player.countMark = () => 4;
fx.dmqcRefreshMiaojianBar(player);
const allSwords = host.querySelectorAll(".dmqc-mjsvg-sword");
ok("从 2 → 4：第 3、4 柄被标上迸发", allSwords[2].classList.contains("pop") && allSwords[3].classList.contains("pop"));
ok("从 2 → 4：没亮的那柄没有迸发标记", !allSwords[4].classList.contains("pop"));
player.countMark = () => 0;
fx.dmqcRefreshMiaojianBar(player);
ok("掉回 0 时把迸发类也清掉", host.querySelectorAll(".dmqc-mjsvg-sword").every(s => !s.classList.contains("pop")));

// 卸载
fx.dmqcRemoveMiaojianBar(player);
ok("卸载后节点的引用被清掉", !player.dmqcMjBar);

// ---------------------------------------------------------------- 5. 手牌卡牌特效
const auraCount = () => document.querySelectorAll(".dmqc-mj-aura").length;

/// 造一张**像真引擎那样**的牌：卡牌对象自己就是 DOM 元素（Card extends HTMLDivElement），
/// 另外还挂着一个普通对象 `node`（子元素字典）——代码绝不该往 `node` 上挂东西。
function mkCard(tagged, position) {
    const card = new El("div");
    card._position = position || "absolute";
    document.body.appendChild(card);
    card._tagged = tagged;
    card.hasGaintag = function (t) {
        return this._tagged && t === fx.SGZ_MJ_TAG;
    };
    // 真卡牌上 node 里还有 .gaintag 之类的子元素，这里放一个占位，用来证明没被误用
    card.node = { gaintag: new El("div") };
    return card;
}

const cardA = mkCard(true);
const cardB = mkCard(false);
const other = { name: "别人", getCards: () => [cardB], countMark: () => 0 };
game.players = [player, other];
player.getCards = () => [cardA];

let n = fx.dmqcRefreshMiaojianCards();
ok("只给带标记的那张挂光框", n === 1 && auraCount() === 1, "n=" + n + " auras=" + auraCount());
ok("光框挂在**卡牌元素自己**身上（不是挂在 card.node 那个普通对象上）", !!cardA.querySelector(".dmqc-mj-aura") && cardA.node.gaintag.children.length === 0);
ok("卡牌自己带了光晕类", cardA.classList.contains("dmqc-mj-glow"));
ok("没标记的牌没有光框", !cardB.querySelector(".dmqc-mj-aura") && !cardB.classList.contains("dmqc-mj-glow"));
ok("光框里挂了 3 颗上浮微粒（复用通用动效层）", cardA.querySelector(".dmqc-mj-aura").querySelectorAll(".dmqc-fx-mote").length === 3);
ok("卡牌上只有光框这**一层**覆盖物（滤镜删掉后没留下兄弟层）", cardA.children.length === 1, cardA.children.length);

// 兼容性：万一拿到的是"没有 DOM"的假卡（VCard 之类），必须安静跳过而不是抛错
const bareCard = { hasGaintag: () => true };
other.getCards = () => [bareCard, cardB];
let threw = false;
try {
    fx.dmqcRefreshMiaojianCards();
} catch (e) {
    threw = true;
}
ok("遇到没有 DOM 的牌不抛错（安静跳过）", !threw);

// 摘掉标记 → 光框必须收走
cardA._tagged = false;
player.getCards = () => [cardA];
fx.dmqcRefreshMiaojianCards();
ok("标记被摘掉后光框与光晕都被移除", !cardA.querySelector(".dmqc-mj-aura") && !cardA.classList.contains("dmqc-mj-glow") && auraCount() === 0);

// ★ 关键边界：带标记的牌**离开手牌区**（打出/被弃置）—— 卡牌元素会被整块搬到弃牌堆，
//   光框跟着元素走，而刷新只遍历"当前手牌"永远看不到它 ⇒ 必须靠收尾那一步清掉
const cardD = mkCard(true);
player.getCards = () => [cardD];
fx.dmqcRefreshMiaojianCards();
ok("离开手牌前的光框在", !!cardD.querySelector(".dmqc-mj-aura"));
document.body.appendChild(cardD); // 仍在文档里，只是不在任何人手牌里了
player.getCards = () => [];
other.getCards = () => [];
fx.dmqcRefreshMiaojianCards();
ok("牌离开手牌区后光框被收走（不会留在弃牌堆上）", !cardD.querySelector(".dmqc-mj-aura") && !cardD.classList.contains("dmqc-mj-glow") && auraCount() === 0);

// 卡牌本身是 static 时补定位类；是 absolute 时不碰它的 position
const cardE = mkCard(true, "static");
const cardF = mkCard(true, "absolute");
player.getCards = () => [cardE, cardF];
fx.dmqcRefreshMiaojianCards();
ok("static 卡牌被补上定位类", cardE.classList.contains("dmqc-mj-card-static"));
ok("absolute 卡牌不动它的 position（免得搞乱手牌布局）", !cardF.classList.contains("dmqc-mj-card-static"));
player.getCards = () => [];
fx.dmqcRefreshMiaojianCards();
ok("离开手牌后定位类也被收走", !cardE.classList.contains("dmqc-mj-card-static"));

// ---------------------------------------------------------------- 6. 调试入口
ok("控制台自检入口已注册", typeof window.dmqcSunhanhuaDebug === "function");
if (typeof window.dmqcSunhanhuaDebug === "function") {
    fx.dmqcBuildMiaojianBar(player); // 上面卸载过，这里重建，让自检输出有意义
    const info = window.dmqcSunhanhuaDebug();
    ok("自检里读到的是新的上限 5", info["①妙剑标记上限"] === 5, info["①妙剑标记上限"]);
    ok("自检里读到了已挂载的充能条", String(info["⑤充能条已挂载"]).includes("梦孙寒华"), info["⑤充能条已挂载"]);
    ok("自检能报出剑几柄/亮几柄（版式实测）", /剑 5 柄（亮 \d）/.test(String(info["⑦条内 SVG 实测"])), info["⑦条内 SVG 实测"]);
}

// ---------------------------------------------------------------- 7. 出框动作：改由「发动妙剑④」触发
//  需求：威灵尽显皮肤的攻击出框动作，触发源从「使用伤害牌」换成「发动妙剑④」。
//  做法有两半，缺一不可 —— 这里两半都验：
//    半 A（skin.js）：`_gj.filter` 短路掉威灵尽显（用伤害牌不再自动出框）
//    半 B（skin.js + 角色文件）：在④的 precontent 里手动派发同一个 GongJi 出框
{
    const stripComments = t => t.replace(/^\s*\/\/.*$/gm, "");
    const skinText = stripComments(fs.readFileSync(new URL("skin.js", EXT), "utf8"));
    const useText = stripComments(fs.readFileSync(new URL("character/sgz_sunhanhua.js", EXT), "utf8"));
    ok("skin.js 注册了 window.dmqcPlaySunhanhuaEffect", /window\.dmqcPlaySunhanhuaEffect\s*=/.test(skinText));
    ok("威灵尽显的骨骼常量内容正确", /DMQC_SUNHANHUA_WEILING_SPINE\s*=\s*"孙寒华\/威灵尽显\/XingXiang"/.test(skinText));
    ok("出框派发用的是骨骼常量（不是别处又写死一份字符串）", /dmqcSkillChukuang\(player,\s*DMQC_SUNHANHUA_WEILING_SPINE/.test(skinText));
    // ⚠ 短路名单会随皮肤增加而变长（后来加了梦文鸯「势若万钧」）⇒ 不要要求"威灵尽显是最后一项"，
    //   只要它出现在 `_gj` 那一行短路条件里就行。
    ok("半 A：_gj 短路已带上威灵尽显（使用伤害牌不再自动出框）", /if \(dmqcIsYishenZhengdao\(player\)[\s\S]{0,400}dmqcIsWeilingXianxian\(player\)[\s\S]{0,200}\)\s*return false/.test(skinText));
    ok("威灵尽显的判据是 skin 判据助手（不认错皮肤）", /function dmqcIsWeilingXianxian\(player\)\s*\{\s*return dmqcSkinIs\(player,\s*DMQC_SUNHANHUA_WEILING_SPINE\)/.test(skinText));
    ok("半 B：妙剑④ 的 precontent 里调用了出框派发", /window\.dmqcPlaySunhanhuaEffect\(player\)/.test(useText));
    ok("派发调用点确实落在 precontent 内（④ 每次使用都必经这里）", (() => {
        const i = useText.indexOf("precontent: async function");
        const j = useText.indexOf("dmqcPlaySunhanhuaEffect(player)");
        const k = useText.indexOf("prompt(links, player)");
        return i >= 0 && j > i && (k < 0 || j < k);
    })());
    ok("④ 的 precontent 仍然是 async（写成普通函数会被 StepCompiler 认领 → 丢失模块作用域）", /precontent:\s*async\s+function/.test(useText));
    ok("派发前有存在性判断（皮肤切换/表现层没加载时不影响技能结算）", /typeof window\.dmqcPlaySunhanhuaEffect === "function"/.test(useText));
}

// ---------------------------------------------------------------- 汇总
let failed = 0;
for (const c of checks) {
    if (!c.cond) failed++;
    console.log((c.cond ? "  [OK]   " : "  [FAIL] ") + c.name + (c.extra !== undefined && !c.cond ? "   → 实际：" + JSON.stringify(c.extra) : ""));
}
console.log(`\n通过 ${pass}/${checks.length}，失败 ${failed}`);
process.exit(failed ? 1 : 0);
