// ============================================================
//  自检：新增武将 梦文鸯 / 梦甘宁
//  跑法：node extension/大梦千秋/__dytest/check_wenyang_gannin.mjs
//
//  这两个武将的规则细节多（上限夹取、处决时机、标记换人、免疫牌……），
//  光看语法查不出「上限没夹」「处决在别人回合也触发」「换目标没清旧标记」这类问题，
//  所以这里**真加载模块、真调 filter/content**（配最小假件）。
//
//  ⚠ 这两个 character 文件**不 import 任何东西**，所以不需要假装件就能 import；
//    假件只服务于下面直接调用的 filter/content。
// ============================================================

// ---------------------------------------------------------------- 最小全局假件
// ⚠ `Array.prototype.add / addArray / remove` 都是引擎的 polyfill（noname/init/polyfill.js:559-620），
//   官方技能（以及夜魇的 `directHit.addArray(...)`、②-1 兜底取消目标）都在用 ⇒ Node 里要补上，
//   否则测出来的是「引擎里能跑、Node 里报 not a function」的假失败。
for (const [name, value] of [
    [
        "add",
        function (...args) {
            for (const arg of args) if (!this.includes(arg)) this.push(arg);
            return this;
        },
    ],
    [
        "addArray",
        function () {
            for (const arr of arguments) for (const item of arr) this.add(item);
            return this;
        },
    ],
    [
        "remove",
        function (...args) {
            for (const item of args) {
                const pos = typeof item == "number" && isNaN(item) ? this.findIndex(v => isNaN(v)) : this.indexOf(item);
                if (pos !== -1) this.splice(pos, 1);
            }
            return this;
        },
    ],
    // 引擎的 randomGet / randomGets（polyfill.js:666/685）：角色文件里挑语音文件名要用
    ["randomGet", function () {
        return this[Math.floor(Math.random() * this.length)];
    }],
    ["randomGets", function (num) {
        const list = this.slice(0);
        const out = [];
        const n = Math.min(num === undefined ? 1 : num, list.length);
        for (let i = 0; i < n; i++) out.push(list.splice(Math.floor(Math.random() * list.length), 1)[0]);
        return out;
    }],
]) {
    Object.defineProperty(Array.prototype, name, { configurable: true, enumerable: false, writable: true, value });
}

const TINGZONG = "sgz_tingzong";
const CHOUJUE = "sgz_choujue";
const CHOUJUE_INVALID = "sgz_choujue_invalid";
const JIEYING = "sgz_jieying_skip";
const YEYAN = "sgz_yeyan";
/// 劫营③那次伤害的标记（角色文件里的同名常量；夜魇①对它例外）
const JIEYING_DAMAGE_FLAG = "_sgz_jieying_damage";

globalThis.lib = { card: {}, inpile: [], translate: {}, skill: {}, filter: { targetEnabledx: () => false } };
globalThis._status = { currentPhase: null, event: null, dying: [] };
globalThis.game = {
    players: [],
    dead: [],
    filterPlayer(func) {
        return this.players.filter(p => !func || func(p));
    },
    hasPlayer(func) {
        return this.players.some(p => func(p));
    },
    // 夜魇②-1 的全体牌探测：与 `lib.filter.filterCard` 同款（library/index.js:11524）
    hasPlayer2(func) {
        return this.players.some(p => func(p));
    },
    // 夜魇②-1 算目标数上限时会问一次 selectTarget mod
    checkMod() {},
    // 技能里播语音（角色文件的 randomGet 挑文件名）
    playAudio() {},
    log() {},
    // 「本阶段」的键：惊跃火杀的"首张"判定用 game.phaseNumber
    phaseNumber: 1,
};
// 夜魇②-1（多目标牌）：这次选目标里「已经选好的人」
globalThis.ui = { selected: { targets: [] } };
globalThis.get = {
    color: (card, player) => (card && card._color) || "none",
    name: card => (card && card.name) || "",
    translation: name => String(name),
    value: () => 5,
    attitude: () => -1,
    threaten: () => 5,
    autoViewAs: (card, player) => card,
    // ---- 夜魇②-1 用 ----
    /// 测试里把 `selectTarget` / `notarget` 直接写在传进来的"牌"对象上，所以 info 就是它自己
    info: card => (card && typeof card === "object" ? card : {}),
    copy: obj => (obj && typeof obj === "object" ? (Array.isArray(obj) ? obj.slice() : Object.assign({}, obj)) : obj),
    select: select => {
        if (typeof select == "number") return [select, select];
        if (Array.isArray(select)) return select;
        return [1, 1];
    },
};

const wy = (await import(new URL("../character/sgz_wenyang.js", import.meta.url).href)).default;
const gn = (await import(new URL("../character/sgz_gannin.js", import.meta.url).href)).default;

let pass = 0;
const checks = [];
function ok(name, cond, extra) {
    checks.push({ name, cond: !!cond, extra });
    if (cond) pass++;
}

// ---------------------------------------------------------------- 假玩家
function mkPlayer(name, opts = {}) {
    const marks = Object.assign({}, opts.marks || {});
    const p = {
        name,
        hp: opts.hp === undefined ? 3 : opts.hp,
        maxHp: opts.maxHp === undefined ? 4 : opts.maxHp,
        // 护甲（引擎原生 `player.hujia`，霆踪④算伤害时要用）
        hujia: opts.hujia === undefined ? 0 : opts.hujia,
        // 引擎事件方法（die 事件有 cancel，仇决 dieBefore 会调）
        cancel() {},
        // 引擎原生 API（player.js:8063）：劫营③等技能会调用
        changeHujia(num) {
            this.hujia = Math.max(0, (this.hujia || 0) + (num === undefined ? 1 : num));
        },
        // 引擎每到"某个角色的回合开始"就给所有人 push 一条 actionHistory
        // （content.js:4732-4745），且**出生时已经自带 1 条占位**（player.js:125-137）
        // ⇒ 已经开始的回合数 = max(length) - 1。`turns: n` = 已经开始了 n 个回合（数组长 n+1）。
        // 惊跃③ 的 X = 全场 max(length) - 1（含当前回合）。
        actionHistory: Array.from({ length: (opts.turns === undefined ? 0 : opts.turns) + 1 }, () => ({})),
        isAlive: () => (opts.alive === undefined ? true : opts.alive),
        storage: {},
        calls: [],
        classList: { contains: () => false },
        log: [],
        countMark(n) {
            return marks[n] || 0;
        },
        addMark(n, num = 1, log) {
            marks[n] = (marks[n] || 0) + num;
            this.calls.push(["addMark", n, num, log]);
            this.log.push("addMark:" + n + "+" + num);
        },
        removeMark(n, num = 1, log) {
            marks[n] = Math.max(0, (marks[n] || 0) - num);
            this.calls.push(["removeMark", n, num, log]);
            this.log.push("removeMark:" + n + "-" + num);
        },
        // 技能日志（仇决 content 里会调）
        // 仇决等级标记会调
        markSkill(name, info) {
            this.calls.push(["markSkill", name, info]);
            this.lastMark = { name, info };
        },
        restoreSkill(skill, nomark) {
            this.calls.push(["restoreSkill", skill]);
        },
        // 觉醒技（仇决升级/降级都会借一次 awaken 特效）会调用
        awakenSkill(skill) {
            this.calls.push(["awakenSkill", skill]);
            this.log.push("awakenSkill:" + skill);
            this.storage[skill] = true;
        },
        $skill(name) {
            this.calls.push(["$skill", name]);
        },
        logSkill(skill) {
            this.calls.push(["logSkill", skill]);
        },
        // 技能集合：addSkill / removeSkill / hasSkill 共用（仇决的等级徽标靠它切换）
        _skills: new Set(opts.skills || []),
        hasSkill(skill) {
            return !!skill && this._skills.has(skill);
        },
        addSkill(skill) {
            this._skills.add(skill);
            this.calls.push(["addSkill", skill]);
            this.log.push("addSkill:" + skill);
        },
        removeSkill(skill) {
            this._skills.delete(skill);
            this.calls.push(["removeSkill", skill]);
            this.log.push("removeSkill:" + skill);
        },
        getCards(position, filter) {
            const all = opts.hand || [];
            return all.filter(c => !filter || filter(c));
        },
        countCards(position, filter) {
            return this.getCards(position, filter).length;
        },
        /// 「本阶段还剩几次出【杀】」（惊跃的红牌可用性判据）
        getCardUsable(name) {
            return opts.cardUsable === undefined ? 1 : opts.cardUsable;
        },
        discard(cards) {
            this.calls.push(["discard", cards.length]);
            this.log.push("discard:" + cards.length);
        },
        draw(num = 1) {
            this.calls.push(["draw", num]);
            this.log.push("draw:" + num);
        },
        recover(num = 1) {
            this.calls.push(["recover", num]);
            this.log.push("recover:" + num);
            this.hp = Math.min(this.maxHp, this.hp + num);
        },
        loseMaxHp(num = 1) {
            this.calls.push(["loseMaxHp", num]);
            this.log.push("loseMaxHp:" + num);
            this.maxHp -= num;
        },
        gainMaxHp(num = 1) {
            this.calls.push(["gainMaxHp", num]);
            this.log.push("gainMaxHp:" + num);
            this.maxHp += num;
        },
        damage(num, source) {
            this.calls.push(["damage", num, source && source.name]);
            this.log.push("damage:" + num);
            // ⚠ 必须返回一个"事件"对象：劫营③会往它身上打 `JIEYING_DAMAGE_FLAG` 标记
            //   （且不能带 `then`：带 then 的对象会被 await 当 thenable，卡住顶层 await）
            return { name: "damage", num, source };
        },
        gainPlayerCard(target, position, forced) {
            this.calls.push(["gainPlayerCard", target && target.name, position, forced]);
            this.log.push("gainPlayerCard:" + (target && target.name));
        },
        die(reason) {
            this.calls.push(["die"]);
            this.log.push("die");
            // ⚠ 千万别在这里放 `then` 方法：任何带 then 的对象都会被 await 当成 thenable，
            //   而 `then: () => {}` 永远不 resolve ⇒ 顶层 await 卡死（踩过一次）。
            return { source: undefined };
        },
        line() {},
        isPhaseUsing() {
            return opts.phaseUsing === true;
        },
        chooseTarget(prompt, forced, filterTarget) {
            const self = this;
            return {
                set() {
                    return this;
                },
                async forResult() {
                    // ⚠ 从**玩家对象**上读候选（而不是闭包里的 opts）：测试里常在建好假玩家之后再指定
                    const pool = self.chooseTargetResult || opts.chooseTargetResult || [];
                    const targets = pool.filter(t => !filterTarget || filterTarget(null, self, t));
                    return targets.length ? { bool: true, targets: [targets[0]] } : { bool: false };
                },
            };
        },
    };
    return p;
}

// ================================================================
//  一、梦文鸯
// ================================================================
{
    const char = wy.character.sgz_wenyang;
    ok("文鸯：势力魏 / 男 / 体力6 / 上限7（需求 6/7）", char.group === "wei" && char.sex === "male" && char.hp === 6 && char.maxHp === 7, JSON.stringify(char));
    ok("文鸯：立绘指向 image/sgz_wenyang.jpg", char.img === "extension/大梦千秋/image/sgz_wenyang.jpg", char.img);
    ok("文鸯：三个技能都挂上了", ["sgz_jingyue", "sgz_tingzong", "sgz_choujue"].every(s => char.skills.includes(s)), char.skills.join(","));
    ok("文鸯：翻译名 = 梦文鸯", wy.characterTranslate.sgz_wenyang === "梦文鸯");
    // ⚠ 用户后来配了语音（audio/sgz_wenyang/die.mp3）—— 断言跟着走，别再要求"空数组"
    ok("文鸯：死亡语音指向 audio/sgz_wenyang/die.mp3", Array.isArray(char.dieAudios) && char.dieAudios.some(x => /大梦千秋\/audio\/sgz_wenyang\/die\.mp3$/.test(x)), JSON.stringify(char.dieAudios));
}

// ---- 惊跃 ----
{
    const jy = wy.skills.sgz_jingyue;
    // 惊跃③ 的 X = 「游戏开始后已经开始的回合数（含当前这个）」。
    // ⚠ 引擎每到回合一开就**给在场每个人**各 push 一条 `actionHistory`（content.js:4732-4745），
    //   所以每个人的 length 都等于"已经开始的回合数"⇒ 取 **max**（求和会变成 回合数×人数，别踩）。
    // 这里摆一个"已经开始了 n 个回合、轮到文鸯"的桌面（不然 X = 0，filter 一律 false）。
    const mkDeskTurns = (n, wyOpts = {}) => {
        const list = [mkPlayer("甲", { turns: n }), mkPlayer("乙", { turns: n })];
        list.push(mkPlayer("文鸯", Object.assign({ turns: n, hand: [{ _color: "black" }] }, wyOpts)));
        game.dead = [];
        game.players = list;
        return list;
    };
    mkDeskTurns(3);
    ok("惊跃：只能使用、不能打出（enable 只含 chooseToUse）", JSON.stringify(jy.enable) === '["chooseToUse"]', JSON.stringify(jy.enable));
    ok("惊跃：只用手牌（position: h）、只选一张", jy.position === "h" && jy.selectCard === 1);
    // ⚠ 点了技能之后"哪些牌能选"的 UX 需求：黑牌永远亮；红牌只在还有出杀次数时亮
    ok("惊跃 filterCard：黑牌永远可选（雷杀无次数限制）", jy.filterCard({ _color: "black" }, mkPlayer("文鸯", { cardUsable: 0 })) === true);
    ok("惊跃 filterCard：红牌在「还有出杀次数」时才可选", jy.filterCard({ _color: "red" }, mkPlayer("文鸯", { cardUsable: 1 })) === true && jy.filterCard({ _color: "red" }, mkPlayer("文鸯", { cardUsable: 0 })) === false);
    ok("惊跃 filterCard：无色牌不能转化", jy.filterCard({ _color: "none" }, mkPlayer("文鸯")) === false);
    ok("惊跃：红色→火杀、黑色→雷杀（带 _sgz_jingyue 暗号）", (() => {
        const fire = jy.viewAs([{ _color: "red" }], null);
        const thunder = jy.viewAs([{ _color: "black" }], null);
        return fire.name === "sha" && fire.nature === "fire" && fire._sgz_jingyue === "fire" && thunder.name === "sha" && thunder.nature === "thunder" && thunder._sgz_jingyue === "thunder";
    })());
    ok("惊跃：没有红黑手牌时 filter 返回 false", (() => {
        const p = mkPlayer("文鸯", { hand: [{ _color: "none" }] });
        const evt = { filterCard: () => true };
        return jy.filter(evt, p) === false;
    })());
    ok("惊跃：有红牌且该时机能用火杀 → filter 通过", (() => {
        const p = mkPlayer("文鸯", { hand: [{ _color: "red" }] });
        const asked = [];
        const evt = {
            filterCard(card) {
                asked.push(card.name + "/" + card.nature);
                return card.nature === "fire";
            },
        };
        return jy.filter(evt, p) === true && asked.includes("sha/fire");
    })());
    // ⚠⚠ 回归点（用户报的 bug 1 后半段）：「出牌次数用光后雷杀用不了、按钮变灰」
    //   按钮亮不亮这一步，引擎拿**候选牌**去过 `lib.filter.cardUsable` →（走）惊跃的 mod，
    //   而那时技能还没被选中（`_status.event.skill` 为空）⇒ mod 只能靠 `card._sgz_jingyue` 认牌。
    //   所以 filter 造的候选牌必须带暗号，否则雷杀会被当成普通【杀】判"次数已满"。
    ok("惊跃：出牌【杀】次数已满时，黑牌仍能亮按钮（候选牌带了暗号 → 无次数限制生效）", (() => {
        const p = mkPlayer("文鸯", { hand: [{ _color: "black" }] });
        const eff = jy.subSkill.effect.mod;
        // 模拟引擎：候选牌过 cardUsable，只有"无次数限制"的雷杀才放行
        const limitUsed = 1;
        const evt = {
            filterCard(card) {
                const infinite = eff.cardUsable(card) === Infinity;
                return infinite || limitUsed < 1;
            },
        };
        return jy.filter(evt, p) === true;
    })());
    ok("惊跃：出牌次数已满时，只有红牌（火杀不享有无次数限制）就不亮按钮", (() => {
        const p = mkPlayer("文鸯", { hand: [{ _color: "red" }] });
        const eff = jy.subSkill.effect.mod;
        const limitUsed = 1;
        const evt = {
            filterCard(card) {
                const infinite = eff.cardUsable(card) === Infinity;
                return infinite || limitUsed < 1;
            },
        };
        return jy.filter(evt, p) === false;
    })());
    ok("惊跃：filter 造的候选牌带 `_sgz_jingyue` 暗号（否则上面的回归又会出现）", (() => {
        const seen = [];
        const evt = {
            filterCard(card) {
                seen.push(card._sgz_jingyue);
                return false;
            },
        };
        jy.filter(evt, mkPlayer("文鸯", { hand: [{ _color: "red" }, { _color: "black" }] }));
        return seen.includes("fire") && seen.includes("thunder");
    })());
    ok("惊跃：事件没有 filterCard（引擎 hasUsableCard 那条链）也不抛错", (() => {
        try {
            return jy.filter({ name: "_save" }, mkPlayer("文鸯", { hand: [{ _color: "red" }] })) === false;
        } catch (e) {
            return false;
        }
    })());
    // ---- 惊跃③ 每回合限 X 次（X = 游戏开始后已经开始的回合数，至多 7）----
    await (async () => {
        const resp = jy.subSkill.respond;
        const evt = { filterCard: () => true };
        const useOnce = async p => {
            await resp.content({ triggername: "useCard1" }, { card: { _sgz_jingyue: "thunder", name: "sha", nature: "thunder" }, addCount: true }, p);
        };
        // 桌面：已经开始了 3 个回合（1号 / 2号 / 现在轮到文鸯）⇒ X = 3
        // ⚠ 桌面有 3 个人、每个人 actionHistory 都是 3 条：正好验证"取 max 而不是求和"
        //   （求和会算成 9 ⇒ 后面"用满 3 次就该没得用"会失败）
        const desk3 = mkDeskTurns(3);
        const me3 = desk3[desk3.length - 1];
        me3.stat = [{ card: { sha: 1 } }];
        ok("惊跃③：X = 已经开始的回合数（3 个回合 ⇒ 本回合能用 3 次；不是 3人×3回合）", jy.filter(evt, me3) === true);
        await useOnce(me3);
        await useOnce(me3);
        ok("惊跃③：用了 2 次（还没到 3）仍可继续用", jy.filter(evt, me3) === true);
        await useOnce(me3);
        ok("惊跃③：用满 3 次后 filter 返回 false（按钮不再亮）", jy.filter(evt, me3) === false);
        ok("惊跃③：次数只算惊跃自己用出来的（没用过的人不受影响）", jy.filter(evt, mkPlayer("文鸯", { hand: [{ _color: "black" }] })) === true);
        // 至多 7：已经开始了 10 个回合，也只给 7 次
        const desk10 = mkDeskTurns(10);
        const me10 = desk10[desk10.length - 1];
        me10.stat = [{ card: { sha: 1 } }];
        for (let i = 0; i < 7; i++) await useOnce(me10);
        ok("惊跃③：至多 7 次（回合数 10 也只给 7 次）", jy.filter(evt, me10) === false);
        // 进入下一个回合：引擎会给**所有人**各 push 一条 actionHistory（这里手动模拟）
        desk10.forEach(p => p.actionHistory.push({}));
        ok("惊跃③：进入下一个回合后次数自动归零（不用额外挂重置时机）", jy.filter(evt, me10) === true);
        // 中途加入的角色数组短，不能把回合数算小（取 max 的意义）
        game.players = desk10.concat([mkPlayer("丙", { turns: 1 })]);
        ok("惊跃③：中途加入的角色不会把 X 算小（取 max 不取平均/求和）", jy.filter(evt, me10) === true);
        // 复原桌面，别影响后面的块
        mkDeskTurns(3);
    })();
    // group 与 subSkill 对账
    ok("惊跃：group 与 subSkill 完全对账", (() => {
        const inGroup = (jy.group || []).map(g => String(g).replace("sgz_jingyue_", "")).sort().join(",");
        return inGroup === Object.keys(jy.subSkill).sort().join(",");
    })(), JSON.stringify(jy.group) + " vs " + Object.keys(jy.subSkill).join(","));

    const eff = jy.subSkill.effect.mod;
    ok("惊跃②：火杀无距离限制（暗号那条路）", eff.targetInRange({ _sgz_jingyue: "fire" }, null, null) === true && eff.targetInRange({ _sgz_jingyue: "thunder" }, null, null) === undefined);
    ok("惊跃②：雷杀无次数限制（暗号那条路）", eff.cardUsable({ _sgz_jingyue: "thunder" }) === Infinity && eff.cardUsable({ _sgz_jingyue: "fire" }) === undefined);
    // ⚠⚠ 回归点：引擎的 `lib.filter.cardUsable` / `cardUsable2` 会先 `get.autoViewAs` **复制**一张牌，
    //    复制实体牌时 VCard **不带自定义字段** ⇒ 只看 `card._sgz_jingyue` 会静默失效（用户报的 bug 1）。
    //    这里模拟"只剩 name/nature 的复制品"，靠 `_status.event.skill` + 属性那条兜底认牌。
    ok("惊跃②：牌被 get.autoViewAs 复制过（丢掉自定义字段）时，靠 _status.event.skill + 属性兜底", (() => {
        const copiedThunder = { name: "sha", nature: "thunder" };
        const copiedFire = { name: "sha", nature: "fire" };
        _status.event = { skill: "sgz_jingyue" };
        const usable = eff.cardUsable(copiedThunder) === Infinity;
        const inRange = eff.targetInRange(copiedFire, null, null) === true;
        _status.event = null;
        return usable && inRange;
    })());
    ok("惊跃②：不在用惊跃时，真的火/雷杀不会被误判（不会给别人的杀发福利）", (() => {
        _status.event = { skill: "other_skill" };
        const a = eff.cardUsable({ name: "sha", nature: "thunder" });
        const b = eff.targetInRange({ name: "sha", nature: "fire" }, null, null);
        _status.event = null;
        return a === undefined && b === undefined;
    })());
    await (async () => {
        const resp = jy.subSkill.respond;
        const eff2 = jy.subSkill.effect.mod;
        const me = mkPlayer("文鸯");
        game.phaseNumber = 7;
        // ---- 本阶段首张火杀：nowuxie + 记标记 + 无距离限制 ----
        const firstCard = { _sgz_jingyue: "fire" };
        const firstEvt = { name: "useCard1", card: firstCard };
        ok("惊跃②（首张火杀）：选目标时享受无距离限制", eff2.targetInRange(firstCard, me, null) === true);
        await resp.content({ triggername: "useCard1" }, firstEvt, me);
        ok("惊跃②（首张火杀）：不可被无懈（nowuxie）且牌上记了 first", firstEvt.nowuxie === true && firstCard._sgz_jingyue_first === true);
        const parent = { directHit: new Set() };
        const targeted = { name: "useCardToTargeted", card: firstCard, target: { name: "甲" }, getParent: () => parent };
        await resp.content({ triggername: "useCardToTargeted" }, targeted, me);
        ok("惊跃②（首张火杀）：不可被闪避（目标进 directHit）", parent.directHit.has(targeted.target));
        // ---- 本阶段第二张火杀：所有加成都不再给 ----
        const secondCard = { _sgz_jingyue: "fire" };
        const secondEvt = { name: "useCard1", card: secondCard };
        ok("惊跃②（第二张火杀）：不再有无距离限制", eff2.targetInRange(secondCard, me, null) === undefined);
        await resp.content({ triggername: "useCard1" }, secondEvt, me);
        ok("惊跃②（第二张火杀）：不可被无懈 / 不可闪避都不再生效", secondEvt.nowuxie === undefined && secondCard._sgz_jingyue_first === false);
        const parent2 = { directHit: new Set() };
        await resp.content({ triggername: "useCardToTargeted" }, { name: "useCardToTargeted", card: secondCard, target: { name: "甲" }, getParent: () => parent2 }, me);
        ok("惊跃②（第二张火杀）：目标仍可正常用【闪】", parent2.directHit.size === 0);
        // ---- 换阶段后重新算"首张" ----
        game.phaseNumber = 8;
        const thirdCard = { _sgz_jingyue: "fire" };
        const thirdEvt = { name: "useCard1", card: thirdCard };
        ok("惊跃②：进入新阶段后，火杀重新算「首张」", eff2.targetInRange(thirdCard, me, null) === true);
        await resp.content({ triggername: "useCard1" }, thirdEvt, me);
        ok("惊跃②：新阶段首张火杀照样给全套加成", thirdEvt.nowuxie === true && thirdCard._sgz_jingyue_first === true);
        // ---- 雷杀不受"首张"限制 ----
        const thunderCard = { _sgz_jingyue: "thunder" };
        const statPlayer = mkPlayer("文鸯");
        statPlayer.stat = [{ card: { sha: 1 } }];
        const thunderEvt = { name: "useCard1", card: thunderCard };
        await resp.content({ triggername: "useCard1" }, thunderEvt, statPlayer);
        ok("惊跃②：雷杀不计入次数（addCount = false）", thunderEvt.addCount === false);
        ok("惊跃②：雷杀把引擎已经加上的【杀】计数减回来（龙霄同款 stat.card.sha--）", statPlayer.stat[0].card.sha === 0, statPlayer.stat[0].card.sha);
        ok("惊跃②：雷杀永远无次数限制（和是不是首张无关）", eff2.cardUsable(thunderCard) === Infinity);
        game.phaseNumber = 1;
    })();
    await (async () => {
        const dmg = jy.subSkill.damage;
        const firstCard = { _sgz_jingyue: "fire", _sgz_jingyue_first: true };
        const secondCard = { _sgz_jingyue: "fire", _sgz_jingyue_first: false };
        const evt = { card: firstCard, num: 1 };
        await dmg.content({}, evt, mkPlayer("文鸯"));
        ok("惊跃②（首张火杀）：伤害+1", evt.num === 2, evt.num);
        ok("惊跃②（非首张火杀）：不加伤害", dmg.filter({ card: secondCard, num: 1 }, mkPlayer("文鸯")) === false);
        ok("惊跃②：雷杀从来不加伤害", dmg.filter({ card: { _sgz_jingyue: "thunder", _sgz_jingyue_first: true } }, mkPlayer("文鸯")) === false);
    })();
    await (async () => {
        const p = mkPlayer("文鸯", { marks: { [TINGZONG]: 2 } });
        await jy.subSkill.after.content({}, {}, p);
        ok("惊跃①：使用后摸1 → 回复1 → +1霆踪（顺序也对）", p.log.join("|") === "draw:1|recover:1|addMark:" + TINGZONG + "+1", p.log.join("|"));
        const full = mkPlayer("文鸯", { marks: { [TINGZONG]: 7 } });
        await jy.subSkill.after.content({}, {}, full);
        ok("霆踪上限：已经有7个时不再增加", full.log.filter(x => x.startsWith("addMark")).length === 0, full.log.join("|"));
        const six = mkPlayer("文鸯", { marks: { [TINGZONG]: 6 } });
        await jy.subSkill.after.content({}, {}, six);
        ok("霆踪上限：6个时只加到7（夹取，不会超）", six.countMark(TINGZONG) === 7, six.countMark(TINGZONG));
    })();
}

// ---- 霆踪 ----
{
    const tz = wy.skills.sgz_tingzong;
    // ⚠ 用户后来手动把 霆踪 的徽标显示删了（右侧自绘了雷电进度条）：mark / marktext / intro 都不该在，
    //   但**计数逻辑必须原样**（countMark/addMark/②的等量都靠 storage）。
    ok("霆踪：锁定技 + 已删掉徽标显示（mark/marktext/intro 都不在）", tz.locked === true && !tz.mark && !tz.marktext && !tz.intro, JSON.stringify({ mark: tz.mark, marktext: tz.marktext, intro: !!tz.intro }));
    // 2026 改动：③「满7处决」删除（其触发条件并入仇决的成功条件）
    ok("霆踪：③（满7处决）已删除 —— 没有 kill 子技能、group 里也没有", !tz.subSkill.kill && !(tz.group || []).includes("sgz_tingzong_kill"), JSON.stringify(tz.group));
    ok("霆踪：描述里不再有「致命伤害 / 结束当前阶段」", !/致命伤害|结束当前阶段/.test(wy.skillTranslate.sgz_tingzong_info || ""), wy.skillTranslate.sgz_tingzong_info);
    ok("霆踪：group 与 subSkill 完全对账", (() => {
        const inGroup = (tz.group || []).map(g => String(g).replace("sgz_tingzong_", "")).sort().join(",");
        return inGroup === Object.keys(tz.subSkill).sort().join(",");
    })(), JSON.stringify(tz.group) + " vs " + Object.keys(tz.subSkill).join(","));

    const reset = tz.subSkill.reset;
    ok("霆踪②：没有标记就不触发", reset.filter({}, mkPlayer("文鸯", { marks: { [TINGZONG]: 0 } })) === false && reset.filter({}, mkPlayer("文鸯", { marks: { [TINGZONG]: 2 } })) === true);
    await (async () => {
        const p = mkPlayer("文鸯", { marks: { [TINGZONG]: 3 }, hand: [{ name: "sha" }, { name: "shan" }] });
        await reset.content({}, {}, p);
        ok("霆踪②：弃光手牌 → 移除所有标记 → 摸「标记数」张（等量=标记数）", p.log.join("|") === "discard:2|removeMark:" + TINGZONG + "-3|draw:3", p.log.join("|"));
        const empty = mkPlayer("文鸯", { marks: { [TINGZONG]: 2 }, hand: [] });
        await reset.content({}, {}, empty);
        ok("霆踪②：没有手牌时跳过弃牌、照常清标记摸牌", empty.log.join("|") === "removeMark:" + TINGZONG + "-2|draw:2", empty.log.join("|"));
    })();

    const range = tz.subSkill.range.mod;
    ok("霆踪①：你算距离 -X / 别人算你 +X", range.globalFrom(mkPlayer("文鸯", { marks: { [TINGZONG]: 3 } }), {}, 5) === 2 && range.globalTo({}, mkPlayer("文鸯", { marks: { [TINGZONG]: 3 } }), 5) === 8);
}

// ---- 仇决（等级制：0/1/2 级，初始 1 级）----
{
    const cj = wy.skills.sgz_choujue;
    const LV = "sgz_choujue_level";
    ok("仇决：大空壳（父技能不写 trigger / content）", !cj.trigger && !cj.content, JSON.stringify({ trigger: cj.trigger, hasContent: !!cj.content }));
    ok("仇决：两个常驻子技能挂上（save / upgrade；等级徽标是动态 add/remove 的）", JSON.stringify(cj.group) === JSON.stringify(["sgz_choujue_save", "sgz_choujue_upgrade"]), JSON.stringify(cj.group));
    ok("仇决：group 里的子技能都在 subSkill 里（lv0/lv1/lv2 是动态挂载，不在 group）", (() => {
        const inGroup = (cj.group || []).map(g => String(g).replace("sgz_choujue_", ""));
        const keys = Object.keys(cj.subSkill);
        return inGroup.every(g => keys.includes(g)) && keys.includes("lv0") && keys.includes("lv1") && keys.includes("lv2");
    })(), JSON.stringify(cj.group) + " vs " + Object.keys(cj.subSkill).join(","));
    ok("仇决：觉醒技标记保留，但**不写** skillAnimation（否则 logSkill 会再弹一个「仇决」大字）", cj.awakenSkill === true && !cj.skillAnimation && cj.animationColor === "red", JSON.stringify({ awaken: cj.awakenSkill, anim: cj.skillAnimation, color: cj.animationColor }));
    ok("仇决：init 会把等级初始化为 1", (() => {
        const me = mkPlayer("文鸯");
        cj.init(me);
        return me.storage[LV] === 1;
    })());

    // ---- 等级徽标：三个技能各带 marktext，徽标字就是「仇决N级」 ----
    ok("仇决：三个等级徽标技能都定义了 marktext", ["lv0", "lv1", "lv2"].every(k => cj.subSkill[k] && cj.subSkill[k].marktext === "仇决" + k.slice(2) + "级"), JSON.stringify(["lv0", "lv1", "lv2"].map(k => cj.subSkill[k] && cj.subSkill[k].marktext)));
    ok("仇决：等级徽标是 charlotte 隐藏 + nocount（不显示层数）", ["lv0", "lv1", "lv2"].every(k => cj.subSkill[k].charlotte === true && cj.subSkill[k].intro.nocount === true));
    ok("仇决：初始 1 级只挂 lv1 徽标", (() => {
        const me = mkPlayer("文鸯");
        cj.init(me);
        return me.hasSkill("sgz_choujue_lv1") && !me.hasSkill("sgz_choujue_lv0") && !me.hasSkill("sgz_choujue_lv2");
    })());
    ok("仇决：等级变化会换成对应的徽标技能", (() => {
        const me = mkPlayer("文鸯");
        cj.init(me);
        me.storage[LV] = 2;
        cj.init(me);
        return me.hasSkill("sgz_choujue_lv2") && !me.hasSkill("sgz_choujue_lv1");
    })());

    // ---- ① 降级条件（save）：0级不免死，1/2级可免死 ----
    const save = cj.subSkill.save;
    ok("仇决·save：锁定发动 + dieBefore", save.forced === true && JSON.stringify(save.trigger) === '{"player":"dieBefore"}', JSON.stringify(save.trigger));
    ok("仇决·save：0级完全不免死", (() => {
        const me = mkPlayer("文鸯");
        me.storage[LV] = 0;
        return save.filter({}, me) === false;
    })());
    ok("仇决·save：1级、2级都能免死", (() => {
        const a1 = mkPlayer("文鸯");
        a1.storage[LV] = 1;
        const a2 = mkPlayer("文鸯");
        a2.storage[LV] = 2;
        return save.filter({}, a1) === true && save.filter({}, a2) === true;
    })());
    await (async () => {
        // 蓄力点 > 0：只清空蓄力点，不降级
        const me = mkPlayer("文鸯", { hp: 0, maxHp: 7, marks: { [TINGZONG]: 3 } });
        me.storage[LV] = 1;
        await save.content({}, {}, me);
        ok("仇决·save：上限-1 → 回满 → 蓄力点>0 只清空、不降级", me.log.includes("loseMaxHp:1") && me.log.includes("recover:6") && me.log.includes("removeMark:" + TINGZONG + "-3") && me.storage[LV] === 1, me.log.join("|") + " lv=" + me.storage[LV]);
        ok("仇决·save：不降级时不播 awaken 特效", !me.log.includes("awakenSkill:sgz_choujue"), me.log.join("|"));
    })();
    await (async () => {
        // 蓄力点 = 0：降级（1 → 0）
        const me = mkPlayer("文鸯", { hp: 0, maxHp: 7, marks: { [TINGZONG]: 0 } });
        me.storage[LV] = 1;
        await save.content({}, {}, me);
        ok("仇决·save：蓄力点为0 → 降级（1 → 0）", me.storage[LV] === 0 && me.log.includes("awakenSkill:sgz_choujue"), me.log.join("|") + " lv=" + me.storage[LV]);
        ok("仇决·save：降到 0 级时弹「仇决·0级」全屏字", me.calls.some(x => x[0] === "$skill" && x[1] === "仇决·0级"), JSON.stringify(me.calls.filter(x => x[0] === "$skill")));
    })();
    await (async () => {
        // 2级降级 → 1级，并失去【催灭】
        const me = mkPlayer("文鸯", { hp: 0, maxHp: 7, marks: { [TINGZONG]: 0 }, skills: ["sgz_cuimie"] });
        me.storage[LV] = 2;
        await save.content({}, {}, me);
        ok("仇决·save：2级降级到1级并失去【催灭】", me.storage[LV] === 1 && me.log.includes("removeSkill:sgz_cuimie"), me.log.join("|") + " lv=" + me.storage[LV]);
        ok("仇决·save：降到 1 级时弹「仇决·1级」全屏字", me.calls.some(x => x[0] === "$skill" && x[1] === "仇决·1级"), JSON.stringify(me.calls.filter(x => x[0] === "$skill")));
    })();

    // ---- ② 升级条件（upgrade）：杀死角色 / 蓄力点达到7 ----
    const up = cj.subSkill.upgrade;
    ok("仇决·upgrade：杀死一名角色可升级", (() => {
        const me = mkPlayer("文鸯");
        me.storage[LV] = 1;
        return up.filter({ name: "die", player: mkPlayer("甲"), source: me }, me) === true;
    })());
    ok("仇决·upgrade：蓄力点达到7可升级", (() => {
        const me = mkPlayer("文鸯", { marks: { [TINGZONG]: 7 } });
        me.storage[LV] = 1;
        return up.filter({ name: "addMark" }, me) === true;
    })());
    ok("仇决·upgrade：2级满级后什么都不发生", (() => {
        const me = mkPlayer("文鸯", { marks: { [TINGZONG]: 7 } });
        me.storage[LV] = 2;
        return up.filter({ name: "addMark" }, me) === false;
    })());
    await (async () => {
        const me = mkPlayer("文鸯", { marks: { [TINGZONG]: 7 } });
        me.storage[LV] = 1;
        await up.content({}, {}, me);
        ok("仇决·upgrade：蓄力点归零 → 等级+1 → 获得【催灭】→ 播 awaken", me.countMark(TINGZONG) === 0 && me.storage[LV] === 2 && me.log.includes("addSkill:sgz_cuimie") && me.log.includes("awakenSkill:sgz_choujue"), me.log.join("|") + " lv=" + me.storage[LV]);
        ok("仇决·upgrade：升到 2 级时弹「仇决·2级」觉醒式全屏字", me.calls.some(x => x[0] === "$skill" && x[1] === "仇决·2级"), JSON.stringify(me.calls.filter(x => x[0] === "$skill")));
    })();
    await (async () => {
        // 0级升1级：不给催灭
        const me = mkPlayer("文鸯", { marks: { [TINGZONG]: 0 } });
        me.storage[LV] = 0;
        await up.content({}, { name: "die", player: mkPlayer("甲"), source: me }, me);
        ok("仇决·upgrade：0级 → 1级（不给催灭）", me.storage[LV] === 1 && !me.log.includes("addSkill:sgz_cuimie"), me.log.join("|") + " lv=" + me.storage[LV]);
    })();

    ok("仇决：描述已改成等级制（升级/降级/2级催灭）", (() => {
        const info = wy.skillTranslate.sgz_choujue_info || "";
        return info.includes("升级") && info.includes("降级") && info.includes("催灭") && info.includes("蓄力点");
    })(), wy.skillTranslate.sgz_choujue_info);
}
//  二、梦甘宁
// ================================================================
{
    const char = gn.character.sgz_gannin;
    // ⚠ 用户后来把梦甘宁改成了 群势力 / 体力 3 / 上限 6（原来是 吴 / 6 血）—— 断言跟着文件走
    ok("甘宁：势力群 / 男 / 体力3 / 上限6", char.group === "qun" && char.sex === "male" && char.hp === 3 && char.maxHp === 6, JSON.stringify({ group: char.group, sex: char.sex, hp: char.hp, maxHp: char.maxHp }));
    ok("甘宁：立绘指向 image/sgz_gannin.jpg", char.img === "extension/大梦千秋/image/sgz_gannin.jpg", char.img);
    ok("甘宁：两个技能都挂上了", ["sgz_jieying", "sgz_yeyan"].every(s => char.skills.includes(s)), char.skills.join(","));
    ok("甘宁：翻译名 = 梦甘宁", gn.characterTranslate.sgz_gannin === "梦甘宁");
}

// ---- 劫营 ----
{
    const jy = gn.skills.sgz_jieying;
    ok("劫营：锁定技（locked + forced + 每轮开始全局触发）", jy.locked === true && jy.forced === true && String(JSON.stringify(jy.trigger)).includes("roundStart"));
    ok("劫营：group 只挂 ②③（①是挂到目标身上的，故意不在 group 里）", JSON.stringify(jy.group) === JSON.stringify(["sgz_jieying_steal", "sgz_jieying_use"]), JSON.stringify(jy.group));
    ok("劫营：①的子技能确实存在（会被 addSkill 挂给别人）", !!jy.subSkill.skip);
    await (async () => {
        const me = mkPlayer("甘宁");
        const old = mkPlayer("旧目标", { skills: [JIEYING], marks: { [JIEYING]: 1 } });
        const fresh = mkPlayer("甲");
        const other = mkPlayer("乙");
        _status.currentPhase = me;
        game.players = [me, old, fresh, other];
        // 用 walkAround：chooseTarget 的假件会挑第一个通过 filterTarget 的人
        let capturedFilter = null;
        me.chooseTarget = (prompt, forced, filterTarget) => {
            capturedFilter = filterTarget;
            return {
                set() {
                    return this;
                },
                async forResult() {
                    // 强制挑「甲」（fresh），同时把 filterTarget 抓出来单独断言
                    const okFresh = !filterTarget || filterTarget(null, me, fresh);
                    return okFresh ? { bool: true, targets: [fresh] } : { bool: false };
                },
            };
        };
        await jy.content({}, {}, me);
        ok("劫营：换目标时先把旧目标的标记撤掉", old.log.includes("removeSkill:" + JIEYING) && old.log.includes("removeMark:" + JIEYING + "-1"), old.log.join("|"));
        ok("劫营：只能选其他角色（filterTarget 排除自己）", capturedFilter(null, me, me) === false && capturedFilter(null, me, fresh) === true);
        ok("劫营：给新目标挂标（addSkill + 1个标记）", fresh.log.includes("addSkill:" + JIEYING) && fresh.log.includes("addMark:" + JIEYING + "+1"), fresh.log.join("|"));
        ok("劫营①：标记载体的显示规则（mark 不能写 true + nocount，只有标记没数字）", jy.subSkill.skip.mark !== true && jy.subSkill.skip.marktext === "劫营" && jy.subSkill.skip.intro.nocount === true, JSON.stringify({ mark: jy.subSkill.skip.mark, nocount: jy.subSkill.skip.intro && jy.subSkill.skip.intro.nocount }));
        game.players = [];
    })();
    ok("劫营①：跳过弃牌阶段 = phaseDiscardBefore + trigger.cancel()", (() => {
        const skip = jy.subSkill.skip;
        return String(JSON.stringify(skip.trigger)).includes("phaseDiscardBefore") && String(skip.content).includes("trigger.cancel()");
    })());
    ok("劫营①：标注者（甘宁）不在场就失效（否则会永远跳弃牌）", (() => {
        const marked = mkPlayer("甲", { skills: [JIEYING] });
        const owner = mkPlayer("甘宁", { skills: ["sgz_jieying"] });
        game.players = [marked, owner];
        const alive = jy.subSkill.skip.filter({}, marked) === true;
        game.players = [marked];
        const dead = jy.subSkill.skip.filter({}, marked) === false;
        game.players = [];
        return alive && dead;
    })());
    ok("劫营②：只认「被标记的角色弃置」这件事", (() => {
        const steal = jy.subSkill.steal;
        const marked = mkPlayer("甲", { skills: [JIEYING] });
        game.players = [marked, mkPlayer("甘宁")];
        const hit = steal.filter({ player: marked, cards: [{ name: "sha" }], type: "discard", getParent: () => ({ name: "discard" }) }, mkPlayer("甘宁")) === true;
        const wrongPlayer = steal.filter({ player: mkPlayer("乙"), cards: [{ name: "sha" }], type: "discard", getParent: () => ({ name: "discard" }) }, mkPlayer("甘宁")) === false;
        const wrongType = steal.filter({ player: marked, cards: [{ name: "sha" }], type: "gain", getParent: () => ({ name: "gain" }) }, mkPlayer("甘宁")) === false;
        game.players = [];
        return hit && wrongPlayer && wrongType;
    })());
    await (async () => {
        const use = jy.subSkill.use;
        const me = mkPlayer("甘宁");
        const marked = mkPlayer("甲", { skills: [JIEYING], hand: [{ name: "sha" }] });
        game.players = [me, marked];
        ok("劫营③：其用牌 / 自己用牌都触发，别人用牌不触发", use.filter({ player: marked }, me) === true && use.filter({ player: me }, me) === true && use.filter({ player: mkPlayer("乙") }, me) === false);
        await use.content({}, { player: marked }, me);
        ok("劫营③：对方有牌 → 你获得其一张牌（he）", me.log.includes("gainPlayerCard:甲") && me.calls.some(c => c[0] === "gainPlayerCard" && c[2] === "he" && c[3] === true), me.log.join("|"));
        const emptyTarget = mkPlayer("甲", { skills: [JIEYING], hand: [] });
        game.players = [me, emptyTarget];
        const me2 = mkPlayer("甘宁");
        await use.content({}, { player: emptyTarget }, me2);
        ok("劫营③：其没有牌 → 改为你对其造成1点伤害（每次触发各算一次）", emptyTarget.log.includes("damage:1") && !me2.log.some(x => x.startsWith("gainPlayerCard")), emptyTarget.log.join("|"));
        // ⚠ 这段必须 await 出真结果再断言：把 Promise 直接丢给 ok() 永远是真（假绿）
        {
            const victim = mkPlayer("甲", { skills: [JIEYING], hand: [] });
            game.players = [me2, victim];
            const events = [];
            victim.damage = function (num, source) {
                const evt = { name: "damage", num, source };
                events.push(evt);
                this.calls.push(["damage", num, source && source.name]);
                return evt;
            };
            await use.content({}, { player: victim }, me2);
            ok("劫营③：那一次伤害事件被打了标记（夜魇①对它例外）", events.length === 1 && events[0][JIEYING_DAMAGE_FLAG] === true, JSON.stringify(events));
        }
        game.players = [];
    })();
    // 夜魇①：劫营那一次伤害不移除标记，其他伤害照常移除
    ok("夜魇①：造成伤害后移除标记，但【劫营】造成的那次伤害例外", (() => {
        const remove = gn.skills.sgz_yeyan.subSkill.remove;
        const me = mkPlayer("甘宁", { marks: { [YEYAN]: 1 } });
        const normal = remove.filter({ name: "damage", [JIEYING_DAMAGE_FLAG]: undefined }, me);
        const fromJieying = remove.filter({ name: "damage", [JIEYING_DAMAGE_FLAG]: true }, me);
        const noMark = remove.filter({ name: "damage" }, mkPlayer("甘宁", { marks: { [YEYAN]: 0 } }));
        return normal === true && fromJieying === false && noMark === false;
    })());
}

// ---- 夜魇 ----
{
    const yy = gn.skills.sgz_yeyan;
    ok("夜魇：锁定技 + 徽标（无数字、无标记时不显示）+ group 对账", (() => {
        const inGroup = (yy.group || []).map(g => String(g).replace("sgz_yeyan_", "")).sort().join(",");
        return (
            yy.locked === true &&
            yy.mark !== true &&
            yy.marktext === "夜魇" &&
            yy.intro.nocount === true &&
            inGroup === Object.keys(yy.subSkill).sort().join(",")
        );
    })(), JSON.stringify(yy.group) + " vs " + Object.keys(yy.subSkill).join(",") + " nocount=" + (yy.intro && yy.intro.nocount));
    ok(
        "夜魇：描述文案与②-1/②-2口径一致（「唯一目标」+「你的牌造成的伤害+1」）",
        /唯一目标/.test(yy.intro.content) &&
            /你的牌造成的伤害\+1/.test(yy.intro.content) &&
            /唯一目标/.test(gn.skillTranslate.sgz_yeyan_info) &&
            /你的牌造成的伤害\+1/.test(gn.skillTranslate.sgz_yeyan_info),
        JSON.stringify({ intro: yy.intro.content, info: gn.skillTranslate.sgz_yeyan_info })
    );
    ok("优先级：劫营（1）高于夜魇（0）⇒ 每轮开始时劫营先结算", gn.skills.sgz_jieying.priority === 1 && gn.skills.sgz_yeyan.priority === 0, JSON.stringify({ jieying: gn.skills.sgz_jieying.priority, yeyan: gn.skills.sgz_yeyan.priority }));
    ok("夜魇①：每轮开始时没有标记才加1个", yy.filter({}, mkPlayer("甘宁", { marks: { [YEYAN]: 0 } })) === true && yy.filter({}, mkPlayer("甘宁", { marks: { [YEYAN]: 1 } })) === false);
    await (async () => {
        const p = mkPlayer("甘宁");
        await yy.content({}, {}, p);
        ok("夜魇①：获得1个标记", p.countMark(YEYAN) === 1, p.countMark(YEYAN));
        const dmg = yy.subSkill.damage;
        ok(
            "夜魇②-2：有标记**且伤害来源是牌**才 +1（damageBegin1）",
            String(JSON.stringify(dmg.trigger)).includes("damageBegin1") &&
                dmg.filter({ card: { name: "sha" } }, mkPlayer("甘宁", { marks: { [YEYAN]: 1 } })) === true &&
                dmg.filter({ card: { name: "sha" } }, mkPlayer("甘宁", { marks: { [YEYAN]: 0 } })) === false
        );
        ok(
            "夜魇②-2：技能直接造成的伤害（无 event.card）不 +1——【劫营】③那次也在此列",
            dmg.filter({}, mkPlayer("甘宁", { marks: { [YEYAN]: 1 } })) === false &&
                dmg.filter({ [JIEYING_DAMAGE_FLAG]: true }, mkPlayer("甘宁", { marks: { [YEYAN]: 1 } })) === false
        );
        const evt = { num: 1, card: { name: "sha" } };
        await dmg.content({}, evt, p);
        ok("夜魇②-2：伤害 +1", evt.num === 2, evt.num);
        const rem = yy.subSkill.remove;
        ok("夜魇①：造成伤害后移除标记（damageEnd）", String(JSON.stringify(rem.trigger)).includes("damageEnd") && rem.filter({}, p) === true);
        await rem.content({}, {}, p);
        ok("夜魇①：移除后标记清零", p.countMark(YEYAN) === 0, p.countMark(YEYAN));
    })();
    ok("夜魇②-1：自己的牌不受限 / 没标记的角色不受限", (() => {
        const mod = yy.subSkill.block.mod;
        const me = mkPlayer("甘宁", { marks: { [YEYAN]: 1 } });
        const other = mkPlayer("甲");
        const selfUse = mod.targetEnabled({ name: "sha" }, me, me);
        const noMark = mod.targetEnabled({ name: "sha" }, other, mkPlayer("乙", { marks: { [YEYAN]: 0 } }));
        const iTargetOthers = mod.targetEnabled({ name: "sha" }, me, other);
        return selfUse === undefined && noMark === undefined && iTargetOthers === undefined;
    })());
    ok("夜魇②-1：单体牌（目标上限 1）里你必然是唯一目标 ⇒ 直接禁选", (() => {
        const mod = yy.subSkill.block.mod;
        const me = mkPlayer("甘宁", { marks: { [YEYAN]: 1 } });
        const other = mkPlayer("甲");
        // 杀：没有 selectTarget、也没有 filterTarget ⇒ 引擎按 [1,1] 算
        const sha = { name: "sha" };
        // 顺手牵羊 / 过河拆桥：selectTarget: 1
        const shunshou = { name: "shunshou", selectTarget: 1 };
        // 火攻 / 决斗：有 filterTarget、没写 selectTarget ⇒ [1,1]
        const huogong = { name: "huogong", filterTarget: () => true };
        return (
            mod.targetEnabled(sha, other, me) === false &&
            mod.targetEnabled(shunshou, other, me) === false &&
            mod.targetEnabled(huogong, other, me) === false
        );
    })());
    ok("夜魇②-1：全体牌（上限 -1）场上还有别人可被指定就放行、只剩你一人时才禁", (() => {
        const mod = yy.subSkill.block.mod;
        const me = mkPlayer("甘宁", { marks: { [YEYAN]: 1 } });
        const user = mkPlayer("甲");
        const bing = mkPlayer("丙");
        const nanman = { name: "nanman", selectTarget: -1 };
        const backup = game.players;
        game.players = [me, user, bing];
        const probed = [];
        lib.filter.targetEnabledx = (card, p, current) => {
            probed.push(current.name);
            return true;
        };
        const allow = mod.targetEnabled(nanman, user, me);
        lib.filter.targetEnabledx = () => false; // 场上再没有别人能当目标
        const block = mod.targetEnabled(nanman, user, me);
        lib.filter.targetEnabledx = () => false;
        game.players = backup;
        // 探测时要跳过「出牌人」和「你自己」
        return allow === undefined && block === false && probed.join(",") === "丙";
    })());
    ok("夜魇②-1：多目标牌（铁索连环 [1,2]）得先选了别人才允许选你", (() => {
        const mod = yy.subSkill.block.mod;
        const me = mkPlayer("甘宁", { marks: { [YEYAN]: 1 } });
        const other = mkPlayer("甲");
        const tiesuo = { name: "tiesuo", selectTarget: [1, 2] };
        ui.selected.targets = [];
        const none = mod.targetEnabled(tiesuo, other, me);
        ui.selected.targets = [mkPlayer("丙")];
        const some = mod.targetEnabled(tiesuo, other, me);
        ui.selected.targets = [];
        return none === false && some === undefined;
    })());
    await (async () => {
        const uq = yy.subSkill.uniquetarget;
        ok("夜魇②-1兜底：只认「这张牌的全部目标只有你一个」（useCardToTarget）", (() => {
            const me = mkPlayer("甘宁", { marks: { [YEYAN]: 1 } });
            const user = mkPlayer("甲");
            const bing = mkPlayer("丙");
            const card = { name: "wanjian", selectTarget: -1 };
            const only = { card, player: user, targets: [me] };
            const multi = { card, player: user, targets: [bing, me] };
            const selfUse = { card, player: me, targets: [me] };
            const noMarkPlayer = mkPlayer("乙", { marks: { [YEYAN]: 0 } });
            const noMark = { card, player: user, targets: [noMarkPlayer] };
            return (
                String(JSON.stringify(uq.trigger)).includes("useCardToTarget") &&
                uq.filter(only, me) === true &&
                uq.filter(multi, me) === false &&
                uq.filter(selfUse, me) === false &&
                uq.filter(noMark, noMarkPlayer) === false
            );
        })());
        const me = mkPlayer("甘宁", { marks: { [YEYAN]: 1 } });
        const targets = [me];
        const parent = { triggeredTargets2: [me] };
        let untriggered = false;
        await uq.content(
            {},
            {
                card: { name: "sha" },
                targets,
                getParent: () => parent,
                untrigger: () => {
                    untriggered = true;
                },
            },
            me
        );
        ok(
            "夜魇②-1兜底：真的取消了指定（targets / triggeredTargets2 清掉 + untrigger）",
            targets.length === 0 && parent.triggeredTargets2.length === 0 && untriggered === true,
            JSON.stringify({ targets: targets.length, triggeredTargets2: parent.triggeredTargets2.length, untriggered })
        );
    })();
    ok("夜魇②-3：使用牌无距离限制", (() => {
        const mod = yy.subSkill.distance.mod;
        return mod.targetInRange({}, mkPlayer("甘宁", { marks: { [YEYAN]: 1 } }), {}) === true && mod.targetInRange({}, mkPlayer("甘宁", { marks: { [YEYAN]: 0 } }), {}) === undefined;
    })());
    await (async () => {
        const nw = yy.subSkill.nowuxie;
        const evt = {};
        await nw.content({}, evt, mkPlayer("甘宁", { marks: { [YEYAN]: 1 } }));
        ok("夜魇②-3：锦囊不可被无懈（nowuxie）", evt.nowuxie === true);
        const dh = yy.subSkill.directhit;
        ok("夜魇②-3：有标记时**任何**牌都不可被响应（useCard0，不再只认【杀】、也不再只在指定目标时）", (() => {
            const p = mkPlayer("甘宁", { marks: { [YEYAN]: 1 } });
            return (
                String(JSON.stringify(dh.trigger)).includes("useCard0") &&
                dh.filter({ card: { name: "nanman" } }, p) === true &&
                dh.filter({ card: { name: "wanjian" } }, p) === true &&
                dh.filter({ card: { name: "sha" } }, p) === true &&
                dh.filter({ card: { name: "sha" } }, mkPlayer("甘宁", { marks: { [YEYAN]: 0 } })) === false
            );
        })());
        // 引擎按 useCard 的 `directHit` 数组给每个目标打 `event.directHit = true`
        // ⇒ 【南蛮】打不出杀、【万箭】打不出闪、【杀】不可被闪避
        const nanmanCard = { name: "nanman" };
        const nanmanTargets = [mkPlayer("甲"), mkPlayer("乙")];
        const nanmanTrigger = { card: nanmanCard, targets: nanmanTargets, directHit: [] };
        await dh.content({}, nanmanTrigger, mkPlayer("甘宁", { marks: { [YEYAN]: 1 } }));
        ok(
            "夜魇②-3：南蛮/万箭的目标**全**进 directHit（⇒ 打不出杀/闪）",
            nanmanTrigger.directHit.length === 2 && nanmanTargets.every(t => nanmanTrigger.directHit.includes(t)),
            JSON.stringify(nanmanTrigger.directHit.length)
        );
        const shaParent = { directHit: [] };
        const shaTrigger = { card: { name: "sha" }, targets: [mkPlayer("甲")], directHit: shaParent.directHit };
        await dh.content({}, shaTrigger, mkPlayer("甘宁", { marks: { [YEYAN]: 1 } }));
        ok("夜魇②-3：杀的目标进 directHit（不可被闪避）", shaParent.directHit.length === 1);
        // ⚠ 无 targets 的牌（理论上不会发生）不能把 `addArray` 喂成 undefined 而炸掉
        const emptyTrigger = { card: { name: "wuzhong" }, targets: undefined, directHit: [] };
        await dh.content({}, emptyTrigger, mkPlayer("甘宁", { marks: { [YEYAN]: 1 } }));
        ok("夜魇②-3：无目标的牌不会炸（targets 兜底成空数组）", emptyTrigger.directHit.length === 0);
    })();
}

// ================================================================
//  三、注册（extension.js）
// ================================================================
{
    const fs = await import("node:fs");
    const ext = fs.readFileSync(new URL("../extension.js", import.meta.url), "utf8");
    ok("extension.js：两个新武将都 import 了", /import sgzWenyang from ['"]\.\/character\/sgz_wenyang\.js['"]/.test(ext) && /import sgzGannin from ['"]\.\/character\/sgz_gannin\.js['"]/.test(ext));
    ok("extension.js：都进了 sgzCharacters（⇒ 自动进三国志分包 + 梦前缀 + legend 品阶）", /const sgzCharacters = \[[^\]]*sgzWenyang[^\]]*sgzGannin[^\]]*\]/.test(ext));
    ok("extension.js：补了威胁度条目", /threaten\['sgz_wenyang'\]/.test(ext) && /threaten\['sgz_gannin'\]/.test(ext));
}

// ---------------------------------------------------------------- 汇总
let failed = 0;
for (const c of checks) {
    if (!c.cond) failed++;
    console.log((c.cond ? "  [OK]   " : "  [FAIL] ") + c.name + (c.extra !== undefined && !c.cond ? "   → 实际：" + JSON.stringify(c.extra) : ""));
}
console.log(`\n通过 ${pass}/${checks.length}，失败 ${failed}`);
process.exit(failed ? 1 : 0);
