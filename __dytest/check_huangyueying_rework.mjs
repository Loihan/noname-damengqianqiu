// ============================================================
//  自检：梦黄月英 2026 重做（璇和 / 长明 / 绮梦 + 集巧生烟）
//
//  跑法：node extension/大梦千秋/__dytest/check_huangyueying_rework.mjs
//
//  需求要点：
//    · 璇和：使用锦囊时摸 1 张（**这张牌不计入手牌上限**，跟着牌走）+ 按花色执行效果
//        ♦️ 视为使用一张无次数/无距离限制的火【杀】
//        ♥️ 已受伤则回复 1 点，否则 +1 体力上限
//        ♠️ 获得一名其他角色的一张牌
//        ♣️ 本回合出【杀】次数 +1（可叠加）并获得一张「集巧生烟」
//    · 长明：准备/结束阶段卜算 X（X = 装备栏位总数）
//    · 绮梦：空壳大技能 + 4 个子技能（加牌堆 / 使用摸牌 / 回合开始给牌 / 受伤强制转化）
//    · 集巧生烟（card/card.js 的 dmqc_jqsy 卡包）：
//        ① 主动：随机扩一个「原数量为1」的装备栏 + 两件随机神武（含宝物）
//        ② 响应：令锦囊无效，且不能被无懈响应
// ============================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------- 数组 polyfill
for (const [name, value] of [
	["randomGet", function () { return this[Math.floor(Math.random() * this.length)]; }],
	["randomGets", function (num) {
		const list = this.slice(0);
		const out = [];
		const n = Math.min(num === undefined ? 1 : num, list.length);
		for (let i = 0; i < n; i++) out.push(list.splice(Math.floor(Math.random() * list.length), 1)[0]);
		return out;
	}],
	["add", function (...args) { for (const a of args) if (!this.includes(a)) this.push(a); return this; }],
	["addArray", function (...arrs) { for (const arr of arrs) for (const item of arr) this.add(item); return this; }],
	["remove", function (...args) { for (const item of args) { const pos = this.indexOf(item); if (pos !== -1) this.splice(pos, 1); } return this; }],
	["includes", function (x) { return this.indexOf(x) !== -1; }],
]) {
	Object.defineProperty(Array.prototype, name, { configurable: true, enumerable: false, writable: true, value });
}

// ---------------------------------------------------------------- 最小全局假件
const created = [];
globalThis.lib = {
	skill: {},
	translate: {},
	card: {
		duyusw_guilongzhanyuedao: { type: "equip", subtype: "equip1" },
		duyusw_guofengyupao: { type: "equip", subtype: "equip2" },
		duyusw_baihuaqun: { type: "equip", subtype: "equip5" },
		sgz_jqsy: { type: "trick" },
	},
	filter: { cardEnabled: () => true },
	inpile: [],
};
globalThis._status = { event: null, currentPhase: null, dying: [], global: [] };
globalThis.game = {
	players: [],
	dead: [],
	log() {},
	playAudio() {},
	hasPlayer: () => false,
	countPlayer: () => 0,
	createCard(name, suit, number) {
		const card = { name, suit, number, gaintag: [], hasGaintag(t) { return this.gaintag.includes(t); } };
		created.push(card);
		return card;
	},
	broadcastAll(fn, arg) {
		if (typeof fn === "function") fn(arg);
	},
};
globalThis.ui = { cardPile: { appendChild() {} }, selected: { targets: [] }, create: {} };
globalThis.get = {
	attitude: () => -1,
	type: (x) => (x && x.type) || "basic",
	type2: (x) => (x && x.type) || "trick",
	suit: (x) => (x && x.suit) || "none",
	name: (x) => (x && x.name) || String(x),
	translation: (x) => String(x),
	effect: () => 1,
	player: () => _status.event && _status.event.player,
	itemtype: (x) => (x && x.name ? "card" : typeof x),
};
globalThis.window = globalThis;
globalThis.ai = {};

const here = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(here, "..");
const charSrc = fs.readFileSync(path.join(EXT, "character", "sgz_huangyueying.js"), "utf8");
const cardSrc = fs.readFileSync(path.join(EXT, "card", "card.js"), "utf8");
const hy = (await import(new URL("../character/sgz_huangyueying.js", import.meta.url).href)).default;

let pass = 0;
let fail = 0;
function ok(cond, msg, extra) {
	if (cond) pass++;
	else {
		fail++;
		console.log("  ✗ " + msg + (extra !== undefined ? "  → 实际：" + extra : ""));
	}
}

// 非 async 的普通 content 在引擎里是「参数注入」后执行的；测试里按同样方式注入
function callContent(fn, event, trigger, player) {
	if (fn.constructor.name === "AsyncFunction") return fn(event, trigger, player);
	const body = fn.toString();
	const inner = body.slice(body.indexOf("{") + 1, body.lastIndexOf("}"));
	const f = new Function("event", "trigger", "player", "_status", "ai", "game", "get", "lib", "ui", inner);
	return f(event, trigger, player, _status, ai, game, get, lib, ui);
}

// ---------------------------------------------------------------- 一、结构
{
	// 技能顺序集中在 HY_SKILLS（character.skills 由它展开），千幻的显示顺序也跟它走
	const skillsSrc = (charSrc.match(/const HY_SKILLS = \[([^\]]*)\]/) || [])[1] || "";
	ok(!/sgz_jiqiao/.test(skillsSrc), "技能表里已经没有【集巧】", skillsSrc);
	["sgz_xuanhe", "sgz_changming", "sgz_qimeng"].forEach((id) => {
		ok(new RegExp("\"" + id + "\"").test(skillsSrc), "技能表里有 " + id, skillsSrc);
	});
	ok(/skills: \[\.\.\.HY_SKILLS/.test(charSrc), "character.skills 由 HY_SKILLS 展开（改顺序只改一处）");
	const qm = hy.skills.sgz_qimeng;
	ok(!!qm, "绮梦技能存在");
	ok(!qm.trigger && !qm.content, "绮梦是空壳（无 trigger / 无 content）");
	["sgz_qimeng_addpile", "sgz_qimeng_seek", "sgz_qimeng_force"].forEach((id) => {
		ok((qm.group || []).includes(id), "绮梦 group 含 " + id, JSON.stringify(qm.group));
	});
	["addpile", "seek", "force", "backup"].forEach((k) => {
		ok(!!qm.subSkill[k], "绮梦 subSkill 有 " + k);
	});
	const cm = hy.skills.sgz_changming;
	ok((cm.group || []).includes("sgz_changming_prep") && (cm.group || []).includes("sgz_changming_finish"), "长明有准备/结束两个子技能");
}

// ---------------------------------------------------------------- 二、璇和
{
	const xh = hy.skills.sgz_xuanhe;
	ok(xh.trigger.player === "useCard", "璇和挂在 useCard");
	ok(xh.filter({ card: { name: "wuzhong", type: "trick", suit: "heart" } }, {}) === true, "璇和：无懈可击类锦囊（有花色）触发");
	ok(xh.filter({ card: { name: "sha", type: "basic", suit: "heart" } }, {}) === false, "璇和：基本牌不触发");

	// 「不计入手牌上限」跟着牌走
	const tagged = { gaintag: ["sgz_xuanhe_tag"], hasGaintag(t) { return this.gaintag.includes(t); } };
	const plain = { gaintag: [], hasGaintag() { return false; } };
	ok(xh.mod.ignoredHandcard(tagged, {}) === true, "璇和：带标记的牌不计入手牌上限");
	ok(xh.mod.ignoredHandcard(plain, {}) === false, "璇和：普通牌照常计入上限");

	// 出杀次数叠加
	ok(xh.mod.cardUsable({ name: "sha" }, { storage: { sgz_xuanhe_sha: 2 } }, 1) === 3, "♣️ 叠加：出杀次数 1 → 1+2=3");
	ok(xh.mod.cardUsable({ name: "shan" }, { storage: { sgz_xuanhe_sha: 2 } }, 1) === 1, "♣️ 只影响【杀】");

	// ♥️ 体力分支
	const mk = (opts) =>
		Object.assign(
			{
				hp: 4,
				maxHp: 4,
				storage: {},
				isDamaged() { return this.hp < this.maxHp; },
				calls: [],
				async recover(n) { this.calls.push(["recover", n]); this.hp = Math.min(this.maxHp, this.hp + n); },
				async gainMaxHp(n) { this.calls.push(["gainMaxHp", n]); this.maxHp += n; },
				draw(n) { this.calls.push(["draw", n]); return { forResult: async () => ({}) }; },
				getCards() { return []; },
				addGaintag() {},
				addTempSkill(s) { this.calls.push(["addTempSkill", s]); },
				async gain(cards) { this.calls.push(["gain", cards]); },
				async gainPlayerCard(target, pos, bool) { this.calls.push(["gainPlayerCard", target.name]); },
				chooseTarget() {
					const ev = { set() { return ev; }, forResult: async () => ({ bool: true, targets: [globalThis.game._target] }) };
					return ev;
				},
				// 引擎的 useCard 返回事件对象（thenable），可链式 .set()；不是 Promise
				useCard(card, target) {
					this.calls.push(["useCard", card, target && target.name]);
					// then 里必须 resolve 一个「非 thenable」的值，否则 await 会无限递归
					const ev = { set() { return ev; }, then(resolve) { resolve(undefined); } };
					return ev;
				},
				logSkill() {},
			},
			opts || {}
		);

	// ♥️ 已受伤
	{
		const p = mk({ hp: 2, maxHp: 4 });
		await callContent(xh.content, {}, { card: { name: "wuzhong", suit: "heart", type: "trick" } }, p);
		ok(p.calls.some((c) => c[0] === "recover" && c[1] === 1), "♥️ 已受伤 → 回复 1 点", JSON.stringify(p.calls));
		ok(p.calls.some((c) => c[0] === "draw" && c[1] === 1), "璇和：先摸 1 张", JSON.stringify(p.calls));
	}
	// ♥️ 未受伤
	{
		const p = mk({ hp: 4, maxHp: 4 });
		await callContent(xh.content, {}, { card: { name: "wuzhong", suit: "heart", type: "trick" } }, p);
		ok(p.calls.some((c) => c[0] === "gainMaxHp" && c[1] === 1), "♥️ 未受伤 → 体力上限 +1", JSON.stringify(p.calls));
	}
	// ♣️ 叠加 + 给一张集巧生烟
	{
		const p = mk({ hp: 4, maxHp: 4 });
		await callContent(xh.content, {}, { card: { name: "wuzhong", suit: "club", type: "trick" } }, p);
		ok(p.storage.sgz_xuanhe_sha === 1, "♣️ 出杀次数计数 +1", JSON.stringify(p.storage));
		ok(p.calls.some((c) => c[0] === "addTempSkill" && c[1] === "sgz_xuanhe_addsha"), "♣️ 挂上本回合的计数载体技能");
		ok(
			p.calls.some((c) => c[0] === "gain" && c[1] && c[1][0] && c[1][0].name === "sgz_jqsy"),
			"♣️ 获得一张「集巧生烟」",
			JSON.stringify(p.calls.map((c) => c[0]))
		);
	}
	// ♦️ 视为使用火杀（无距离/无次数）
	{
		const target = mk({ name: "敌人" });
		const p = mk({ name: "月英" });
		game._target = target;
		await callContent(xh.content, {}, { card: { name: "wuzhong", suit: "diamond", type: "trick" } }, p);
		const use = p.calls.find((c) => c[0] === "useCard");
		ok(!!use, "♦️ 视为使用了一张牌", JSON.stringify(p.calls));
		ok(use && use[1].name === "sha" && use[1].nature === "fire", "♦️ 是火【杀】");
		ok(use && use[1].storage && use[1].storage.sgz_xuanhe_free === true, "♦️ 带「无距离限制」暗号");
		ok(use && use[2] === "敌人", "♦️ 打的是选中的目标");
	}
	// ♠️ 获得一名其他角色的一张牌
	{
		const target = mk({ name: "敌人" });
		const p = mk({ name: "月英" });
		game._target = target;
		await callContent(xh.content, {}, { card: { name: "wuzhong", suit: "spade", type: "trick" } }, p);
		ok(p.calls.some((c) => c[0] === "gainPlayerCard" && c[1] === "敌人"), "♠️ 获得目标的一张牌", JSON.stringify(p.calls));
	}
	// 计数载体技能 onremove 清空
	{
		const p = mk({ hp: 4, maxHp: 4, storage: { sgz_xuanhe_sha: 3 } });
		hy.skills.sgz_xuanhe.subSkill.addsha.onremove(p);
		ok(!("sgz_xuanhe_sha" in p.storage), "回合结束清空出杀计数");
	}
}

// ---------------------------------------------------------------- 三、长明
{
	const cm = hy.skills.sgz_changming;
	const mkP = (slots) => ({
		storage: {},
		calls: [],
		countEnabledSlot(slot) {
			return slots[slot] === undefined ? 1 : slots[slot];
		},
		chooseToGuanxing(n) {
			this.calls.push(["guanxing", n]);
			return { forResult: async () => ({}) };
		},
		logSkill() {},
	});
	{
		const p = mkP({}); // equip1..5 各 1 = 5
		await callContent(cm.subSkill.prep.content, {}, {}, p);
		ok(p.calls[0][0] === "guanxing" && p.calls[0][1] === 5, "长明：装备栏总数 5 → 卜算 5", JSON.stringify(p.calls));
	}
	{
		const p = mkP({ equip1: 3, equip2: 2, equip5: 2 }); // 3+2+1+1+2 = 9
		await callContent(cm.subSkill.finish.content, {}, {}, p);
		ok(p.calls[0][1] === 9, "长明：扩展过的栏位也算（9）", JSON.stringify(p.calls));
	}
}

// ---------------------------------------------------------------- 四、绮梦的 4 个子技能
{
	const qm = hy.skills.sgz_qimeng;
	// ① 加 8 张集巧生烟进牌堆
	{
		let appended = 0;
		const oldAppend = ui.cardPile.appendChild;
		ui.cardPile.appendChild = () => appended++;
		const p = { calls: [], logSkill() {} };
		await callContent(qm.subSkill.addpile.content, {}, {}, p);
		ui.cardPile.appendChild = oldAppend;
		ok(appended === 8, "① 开局往牌堆加 8 张", String(appended));
		ok(lib.inpile.includes("sgz_jqsy"), "① 牌名登记进 lib.inpile");
	}
	// ③ 回合开始没有锦囊 → 获得一张
	{
		const p = {
			calls: [],
			countCards() { return 0; },
			async gain(cards) { this.calls.push(["gain", cards]); },
			logSkill() {},
		};
		ok(qm.subSkill.seek.filter({}, p) === true, "③ 手牌无锦囊 → 触发");
		ok(qm.subSkill.seek.filter({}, { countCards: () => 1 }) === false, "③ 手牌有锦囊 → 不触发");
		await callContent(qm.subSkill.seek.content, {}, {}, p);
		ok(p.calls.some((c) => c[0] === "gain" && c[1] && c[1][0] && c[1][0].name === "sgz_jqsy"), "③ 获得一张集巧生烟", JSON.stringify(p.calls.map((c) => c[0])));
	}
	// ④ 受伤后强制转化
	{
		const p = {
			calls: [],
			countCards() { return 1; },
			// ④ 现在走 canonical 写法：chooseToUse() 不带参数，随后 .set(...) 链
			chooseToUse() {
				this.calls.push(["chooseToUse"]);
				const ev = {
					set(key, value) {
						p.calls.push(["set", key, value]);
						return ev;
					},
					backup(skill) {
						p.calls.push(["backup", skill]);
						return ev;
					},
					then(resolve) { resolve(undefined); },
				};
				return ev;
			},
			logSkill() {},
		};
		ok(qm.subSkill.force.filter({}, { countCards: () => 1 }) === true, "④ 有牌 → 触发");
		ok(qm.subSkill.force.filter({}, { countCards: () => 0 }) === false, "④ 没牌 → 不触发");
		await callContent(qm.subSkill.force.content, {}, {}, p);
		ok(p.calls.some((c) => c[0] === "chooseToUse"), "④ 会弹出「将一张牌当集巧生烟使用」");
		ok(
			p.calls.some((c) => c[0] === "set" && c[1] === "_backupevent" && c[2] === "sgz_qimeng_backup"),
			"④ 设置了 _backupevent"
		);
		ok(p.calls.some((c) => c[0] === "backup" && c[1] === "sgz_qimeng_backup"), "④ 调用了 .backup(sgz_qimeng_backup)");
		ok(p.calls.some((c) => c[0] === "set" && c[1] === "addCount" && c[2] === false), "④ not counted as card use");
		const backup = qm.subSkill.backup;
		ok(backup.viewAs && backup.viewAs.name === "sgz_jqsy", "④ 转化载体 viewAs 是集巧生烟（静态对象）");
		ok(backup.position === "hes", "④ 转化可用手牌/装备");
		ok(backup.selectCard === 1, "④ 一次只转化一张牌");
	}
}

// ---------------------------------------------------------------- 五、集巧生烟卡牌（源码断言）
{
	ok(/name: "dmqc_jqsy"/.test(cardSrc), "card.js 里有 dmqc_jqsy 卡包");
	ok(/sgz_jqsy: \{/.test(cardSrc), "定义了 sgz_jqsy 卡牌");
	ok(/type: "trick"/.test(cardSrc) && /enable: true/.test(cardSrc) && /notarget: true/.test(cardSrc), "集巧生烟：可在出牌阶段主动使用（无目标）");
	ok(!/global: \["sgz_jqsy_counter"\]/.test(cardSrc), "② 已删除：卡牌不再挂响应技能");
	ok(!/sgz_jqsy_counter/.test(cardSrc.replace(/\/\/[^\n]*/g, "")), "② 已删除：卡包里没有 sgz_jqsy_counter（代码行）");
	ok(!/wuxieable: false/.test(cardSrc), "② 已删除：不再声明「不可被无懈」");
	ok(!/neutralize\(\)/.test(cardSrc), "② 已删除：没有令锦囊无效的逻辑");
	// 卡面：始终用梦黄月英的原皮图（不随换肤变化），并有运行期锁定
	ok(/image: "ext:大梦千秋\/image\/sgz_huangyueying\.jpg"/.test(cardSrc), "集巧生烟的卡面用梦黄月英的**原皮图**");
	ok(/fullskin: true/.test(cardSrc.slice(cardSrc.indexOf("sgz_jqsy: {"), cardSrc.indexOf("sgz_jqsy: {") + 400)), "卡牌是 fullskin（卡图整张铺满）");
	ok(/const JQSY_IMAGE = "ext:大梦千秋\/image\/sgz_huangyueying\.jpg";/.test(charSrc), "有 JQSY_IMAGE 常量（原皮图路径）");
	ok(/function sgzHyLockJqsyImage\(\)/.test(charSrc), "有 sgzHyLockJqsyImage 运行期锁定函数");
	ok(/lib\.card\[JQSY\]\.image = JQSY_IMAGE;/.test(charSrc), "锁定函数会把 lib.card 的 image 指回原皮图");
	ok(/player\.countEnabledSlot\(slot\)/.test(cardSrc) && /slotCapacity\(slot\) === 1/.test(cardSrc), "① 只挑「原数量为1」的装备栏（countEnabledSlot === 1）");
	ok(/await player\.expandEquip\(slot\)/.test(cardSrc), "① 调 expandEquip 扩栏");
	ok(/player\.equip\(card\)/.test(cardSrc), "② 直接装备一张神武（player.equip）");
	ok(!/randomGets\(Math\.min\(2/.test(cardSrc), "② 不再「获得两件神武到手里」");
	ok(/emptySlots/.test(cardSrc) && /slotUsed\(slot\) < slotCapacity\(slot\)/.test(cardSrc), "② 优先填空：先找还空着的装备栏");
	ok(/if \(!candidates\.length\) candidates = pool\.filter\(canEquip\)/.test(cardSrc), "② 空栏满了退化为完全随机（只要求能装）");
	ok(/duyusw_/.test(cardSrc) && /equip5/.test(cardSrc), "② 神武池 = 本包 duyusw_ 装备（含宝物栏）");
	// 描述只剩 ①
	const infoLine = (cardSrc.match(/sgz_jqsy_info:[\s\S]{0,200}?\n/) || [""])[0];
	ok(!/②/.test(infoLine), "卡牌描述里不再有 ②", infoLine.slice(0, 60));
}

// ---------------------------------------------------------------- 六、两个容易踩的坑（回归断言）
{
	const xh = hy.skills.sgz_xuanhe;
	// ① addsha 不能在 group 里：否则 addTempSkill 会提前 return（player.js:10630），
	//    回合结束既不移除技能、也不触发 onremove 清空计数。
	ok(!(xh.group || []).includes("sgz_xuanhe_addsha"), "addsha 不在 group（否则临时技能不会真正附加）", JSON.stringify(xh.group));
	ok(!!xh.subSkill.addsha && typeof xh.subSkill.addsha.onremove === "function", "addsha 仍有 onremove（清空计数）");
	// ② 卡牌 content 是 async：引擎只注入 event / trigger / player，没有自由变量 `card`
	const jqsyBlock = cardSrc.slice(cardSrc.indexOf("sgz_jqsy: {"));
	const codeOnly = jqsyBlock.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
	ok(!/game\.log\([^)]*(?<![.\w$])card(?![.\w$])\s*,/.test(codeOnly), "卡牌 content 里没有裸 `card` 变量（async content 不注入它）");
}

// ---------------------------------------------------------------- 七、AI
{
	// ① 主动使用：高优先级 + 高价值
	const aiBlock = cardSrc.slice(cardSrc.indexOf("sgz_jqsy: {"));
	ok(/order: 10,/.test(aiBlock), "① AI 顺序 order=10（优先打出）");
	ok(/basic: \{[\s\S]{0,120}?order: 10,[\s\S]{0,80}?useful: 10,[\s\S]{0,80}?value: 9,/.test(aiBlock), "① basic.order/useful/value 都是高分");
	ok(/result: \{ player: 10 \}/.test(aiBlock), "① 使用收益 result.player = 10（AI 视为稳赚）");
	// ② 已删除，不应再有响应 AI
	ok(!/info\.ai\.wuxie/.test(cardSrc), "② 已删除：不再有 useCardToBefore 的响应判定");
	// 长明 order: -3
	const aiSrc = fs.readFileSync(path.join(EXT, "ai", "sgz_huangyueying.js"), "utf8");
	// ⚠ order 的数值由用户手感调整（曾经 -3、现在 4），这里只要求它存在且是数字
	const orderMatch = aiSrc.match(/sgz_changming: \{[\s\S]{0,200}?order: (-?\d+(?:\.\d+)?),/);
	ok(!!orderMatch, "长明 AI：有 order（数值可调）", orderMatch && orderMatch[1]);
	ok(/sgz_changming: \{[\s\S]{0,300}?expose:/.test(aiSrc) && /sgz_changming: \{[\s\S]{0,300}?threaten:/.test(aiSrc), "长明 AI：带 expose / threaten（扩展约定）");
}

// ---------------------------------------------------------------- 八、绮梦④ 的写法（canonical）
{
	const forceBlock = charSrc.slice(charSrc.indexOf("force: {"), charSrc.indexOf("backup: {"));
	ok(/\.chooseToUse\(\)/.test(forceBlock), "④ 用不带参数的 chooseToUse()");
	ok(/\.set\("_backupevent", "sgz_qimeng_backup"\)/.test(forceBlock), "④ 用 .set(_backupevent, …)");
	ok(/\.backup\("sgz_qimeng_backup"\)/.test(forceBlock), "④ 显式 .backup(…)");
	ok(/\.set\("addCount", false\)/.test(forceBlock), "④ 不计入使用次数");
	// ⚠ 不能拿 "sgz_huangyueying_ui" 当结尾锚点：它在技能表的 skills 数组里先出现过
	const backupStart = charSrc.indexOf("backup: {");
	const backupBlock = charSrc.slice(backupStart, backupStart + 700);
	ok(/viewAs: \{ name: JQSY \}/.test(backupBlock), "④ backup 用静态 viewAs 对象");
	ok(/selectCard: 1/.test(backupBlock), "④ backup 指定 selectCard: 1");
}

// ---------------------------------------------------------------- 九、绮梦② 已删除 / 长明先于跋扈
{
	const qm = hy.skills.sgz_qimeng;
	ok(!qm.subSkill.watch, "绮梦：watch 子技能已删除");
	ok(!(qm.group || []).includes("sgz_qimeng_watch"), "绮梦：group 里不再有 watch");
	ok(!/当一名角色使用“集巧生烟”时/.test(charSrc), "绮梦描述里不再有「有人用集巧生烟你摸牌」");
	const info = hy.skillTranslate.sgz_qimeng_info || "";
	ok(!/摸1张牌/.test(info), "描述文案：没有摸牌那条", info.slice(0, 60));

	// 长明 prep 必须优先于跋扈（跋扈 `_priority: 0`，引擎按 priority 降序结算）
	const prep = hy.skills.sgz_changming.subSkill.prep;
	ok(prep.priority === 1, "长明 prep：priority = 1（get.priority 会算成 100 > 跋扈的 0）", String(prep.priority));
	ok(
		prep.trigger && prep.trigger.player === "phaseZhunbeiBegin",
		"长明 prep 的时机仍是 phaseZhunbeiBegin（与跋扈同一时机，靠 priority 排前面）"
	);
}

// ---------------------------------------------------------------- 十、璇和 ♦️ 只能选其他角色
{
	const xhBlock = charSrc.slice(charSrc.indexOf("sgz_xuanhe: {"), charSrc.indexOf("sgz_changming: {"));
	ok(/火【杀】".*?true, function \(card, p, target\) \{\s*\n\s*\/\/ 需求：♦️ 的火【杀】只能选其他角色，不能指向自己\s*\n\s*return target !== p;/.test(xhBlock) || /return target !== p;/.test(xhBlock), "♦️ 目标过滤：排除自己（target !== p）");
	ok(!/chooseTarget\("璇和：视为对一名角色使用一张无距离、无次数限制的火【杀】", true, function \(card, p, target\) \{\s*\n\s*return true;/.test(xhBlock), "♦️ 不再允许选自己（旧的 return true 已删）");
}

// ---------------------------------------------------------------- 十一、集巧生烟的花色点数（固定、不随机）
{
	// 具体花色点数由用户按需调整（现在是 ♦J♦Q♦K ♠A♠K ♥A♥J♥Q），
	// 这里只校验：① 是固定列表（不是随机生成）② 8 组合法且不重复 ③ 开局广播的就是这一份。
	ok(/const JQSY_LIST = \[/.test(charSrc), "有固定的 JQSY_LIST 常量");
	const listBlock = charSrc.slice(charSrc.indexOf("const JQSY_LIST"), charSrc.indexOf("const JQSY_LIST") + 500);
	const fixed = [...listBlock.matchAll(/\["(heart|spade|diamond|club)",\s*(\d+)\]/g)].map((m) => [m[1], Number(m[2])]);
	ok(fixed.length === 8, "固定列表正好 8 组", String(fixed.length));
	const seenKeys = new Set(fixed.map((x) => x.join("")));
	ok(seenKeys.size === 8, "8 组花色点数互不重复", JSON.stringify([...seenKeys]));
	ok(fixed.every(([, n]) => n >= 1 && n <= 13), "点数都在 1~13", JSON.stringify(fixed.map((x) => x[1])));
	ok(!/SUITS\[Math\.floor\(Math\.random\(\) \* SUITS\.length\)\]/.test(charSrc.slice(0, charSrc.indexOf("sgz_huangyueying:"))), "不再用随机花色生成");

	// 运行时：addpile 广播出去的必须正好是源码里这 8 组
	{
		const qm = hy.skills.sgz_qimeng;
		let sent = null;
		const oldBroadcast = game.broadcastAll;
		game.broadcastAll = (fn, arg) => {
			if (Array.isArray(arg)) sent = arg;
		};
		const oldAppend = ui.cardPile.appendChild;
		ui.cardPile.appendChild = () => {};
		const p = { calls: [], logSkill() {} };
		await callContent(qm.subSkill.addpile.content, {}, {}, p);
		game.broadcastAll = oldBroadcast;
		ui.cardPile.appendChild = oldAppend;
		ok(Array.isArray(sent) && sent.length === 8, "① 广播了 8 张", JSON.stringify(sent));
		const got = (sent || []).map((x) => x[0] + x[1]).sort();
		const want = fixed.map((x) => x[0] + x[1]).sort();
		ok(JSON.stringify(got) === JSON.stringify(want), "① 花色点数与 JQSY_LIST 完全一致", JSON.stringify(got));
	}
}
// ---------------------------------------------------------------- 十二、惊鸿一瞥（原黄月英的动皮）
{
	const skinSrc = fs.readFileSync(path.join(EXT, "skin.js"), "utf8");
	ok(/const DMQC_HUANGYUEYING_JINGHONG = "惊鸿一瞥";/.test(skinSrc), "有 惊鸿一瞥 常量");
	ok(
		/\{ char: "sgz_huangyueying", src: "huangyueying", skins: \[DMQC_HUANGYUEYING_JINGHONG\] \}/.test(skinSrc),
		"注入表：梦黄月英 ← 十周年UI 的 huangyueying 段"
	);
	ok(/sgz_huangyueying: DMQC_HUANGYUEYING_JINGHONG \+ "\.jpg",/.test(skinSrc), "默认皮肤设为 惊鸿一瞥");
	ok(/sgz_huangyueying: \[DMQC_HUANGYUEYING_JINGHONG \+ "\.jpg"\],/.test(skinSrc), "皮肤列表加入 惊鸿一瞥");

	// 出框参数（供手调：数值随意改，这里只校验结构存在）
	const patchAt = skinSrc.indexOf('"惊鸿一瞥": {');
	const patchBlock = patchAt > 0 ? skinSrc.slice(patchAt, patchAt + 900) : "";
	ok(!!patchBlock, "DMQC_SKIN_PATCHES 里有 惊鸿一瞥 的参数块");
	ok(/gongji: \{/.test(patchBlock), "参数块里有 gongji（出框攻击动作）");
	ok(/x: \[0, -?[\d.]+\]/.test(patchBlock), "gongji 的 x 可调（[0, 数值]）");
	ok(/y: \[0, -?[\d.]+\]/.test(patchBlock), "gongji 的 y 可调（[0, 数值]）");
	ok(/scale: -?[\d.]+/.test(patchBlock), "gongji 的 scale 可调（数字）");
	ok(/action: "GongJi"/.test(patchBlock), "gongji 指定了动作名 GongJi");
	// 出框触发条件：使用锦囊牌
	ok(/function dmqcIsJinghongYipie\(player\)/.test(skinSrc), "有 dmqcIsJinghongYipie 判断");
	ok(/dmqcIsJinghongYipie\(player\)[\s\S]{0,200}?return get\.type2\(event\.card\) === "trick";/.test(skinSrc), "惊鸿一瞥：出框条件改为使用锦囊牌");

	// 静态预览图
	ok(fs.existsSync(path.join(EXT, "skin", "image", "sgz_huangyueying", "惊鸿一瞥.jpg")), "静态预览图 skin/image/sgz_huangyueying/惊鸿一瞥.jpg 存在");
}
// ---------------------------------------------------------------- 十三、集巧生烟①：扩栏 + 直接装备（优先填空）
{
	// 用假 lib.card 控制神武池：一张武器、一张防具
	const oldCard = lib.card;
	lib.card = {
		duyusw_test_weapon: { type: "equip", subtype: "equip1" },
		duyusw_test_armor: { type: "equip", subtype: "equip2" },
	};
	const mk = (opts) => Object.assign(
		{
			calls: [],
			storage: {},
			countEnabledSlot(slot) {
				return (opts.capacity && opts.capacity[slot]) || 1;
			},
			getVEquips(slot) {
				return new Array((opts.used && opts.used[slot]) || 0).fill(null);
			},
			canEquip() {
				return true;
			},
			async expandEquip(slot) {
				this.calls.push(["expand", slot]);
			},
			async equip(card) {
				this.calls.push(["equip", card.name]);
			},
			logSkill() {},
		},
		opts || {}
	);
	const cardDef = (() => {
		const at = cardSrc.indexOf("sgz_jqsy: {");
		const src = cardSrc.slice(at);
		return src;
	})();
	void cardDef;
	// 用真实模块里的卡牌 content 跑不了（卡包是 game.import），这里只做源码级行为校验：
	ok(/优先：随机挑一个\*\*还空着的\*\*装备栏/.test(cardSrc), "源码注释写明「优先填空」");
	ok(/random装备了/.test(cardSrc) || /随机装备了/.test(cardSrc), "会打印「随机装备了」日志");
	lib.card = oldCard;
}

// ---------------------------------------------------------------- 十四、台词表跟随技能顺序
{
	const taiciObj = hy.characterTaici;
	ok(!!taiciObj && typeof taiciObj === "object", "characterTaici 是对象（千幻按 taici[skill] 取值）");
	const keys = Object.keys(taiciObj || {});
	ok(keys[0] === "sgz_qimeng", "台词表第一项 = HY_SKILLS 第一个技能（绮梦）", JSON.stringify(keys));
	ok(keys.includes("sgz_qimeng"), "台词表包含绮梦（原来漏了，导致那一行没有台词文本）", JSON.stringify(keys));
	ok(!/order:\s*\d/.test(charSrc.slice(charSrc.indexOf("HY_TAICI_CONTENT"), charSrc.indexOf("const HY_SKILLS") + 40)), "台词表不再写死 order（否则改 skills 顺序无效）");
}
// ---------------------------------------------------------------- 十五、绮梦的音频数量与台词行数
{
	// 绮梦技能块里的 audio 数量必须 = 6（文件夹里有 sgz_qimeng1..6.mp3）
	const qmAt = charSrc.indexOf("        sgz_qimeng: {");
	const qmBlock = charSrc.slice(qmAt, qmAt + 400);
	ok(/audio: "ext:大梦千秋\/audio\/sgz_huangyueying:6"/.test(qmBlock), "绮梦 audio 数量是 6（千幻会显示 6 格）", (qmBlock.match(/audio: "[^"]+"/) || [])[0]);

	// 台词文本按 "/" 拆出来的行数也要是 6，否则后几格没有台词
	const line = (charSrc.match(/sgz_qimeng: "([^"]*)",/) || [])[1] || "";
	const lines = line.split("/").filter((s) => s.trim());
	ok(lines.length === 6, "绮梦台词有 6 句（与 audio:6 对齐）", JSON.stringify(lines));

	// 其余技能同样对齐：璇和 4 句 / 4 个音频，长明 2 句 / 2 个音频
	const xhLine = (charSrc.match(/sgz_xuanhe: "([^"]*)",/) || [])[1] || "";
	ok(xhLine.split("/").filter((s) => s.trim()).length === 4, "璇和台词 4 句（audio:4）");
	const cmLine = (charSrc.match(/sgz_changming: "([^"]*)",/) || [])[1] || "";
	ok(cmLine.split("/").filter((s) => s.trim()).length === 2, "长明台词 2 句（audio:2）");

	// 台词表里绮梦必须有 content（否则千幻那一行是空的）
	ok(!!(hy.characterTaici.sgz_qimeng && hy.characterTaici.sgz_qimeng.content), "characterTaici.sgz_qimeng 有台词文本");
}
// ---------------------------------------------------------------- 十六、千幻数据源自愈 / 诊断
{
	const skinSrc = fs.readFileSync(path.join(EXT, "skin.js"), "utf8");
	ok(/function dmqcFixQhlyDataSources\(\)/.test(skinSrc), "skin.js 有千幻数据源自愈函数");
	ok(/lib\.qhlypkg\.unshift\(own\)/.test(skinSrc), "自愈：把本扩展的千幻包提到最前");
	ok(/delete lib\.qhly_dirskininfo\[id\]/.test(skinSrc), "自愈：清掉旧的 skininfo 覆盖");
	ok(/window\.dmqcQhlyDebug = function/.test(skinSrc), "提供 window.dmqcQhlyDebug() 诊断");
}
console.log("\n通过 " + pass + "/" + (pass + fail) + "，失败 " + fail);
process.exit(fail ? 1 : 0);
