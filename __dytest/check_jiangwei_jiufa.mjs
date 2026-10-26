// ============================================================
//  自检：梦姜维【九伐】+【承汉】（2026 拆分后）
//
//  跑法：node extension/大梦千秋/__dytest/check_jiangwei_jiufa.mjs
//
//  拆分口径：
//    【九伐】每名角色回合开始时，手牌摸至体力上限并选择一名其他角色拼点，
//            若你赢，你增加X点体力上限并视为对其使用：
//              1级：X张火【杀】；2级：X+4张神【杀】（X为点数差）
//            → **不再产生蓄力点**
//    【承汉】蓄力技（0/9），当你拼点赢时，你获得点数差个蓄力点。
//            根据蓄力点数视为拥有：1薪燃 3逐日 5绝烬 7孤炬 9幽明
//            → **任何拼点赢都涨**（走引擎 chooseToCompareAfter）
//    【幽明】发动后**失去【承汉】**，但蓄力点保留 9（右侧能量条保持满格）
// ============================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------- 最小全局假件
globalThis.lib = {
	skill: { sgz_jiangwei_ui: { updateUI() {} } },
	translate: {},
	card: {},
	filter: {},
	inpile: [],
};
globalThis._status = { event: null, currentPhase: null, dying: [] };
globalThis.game = {
	players: [],
	dead: [],
	log() {},
	hasPlayer(func) {
		return this.players.some((p) => func(p));
	},
	phaseNumber: 1,
};
globalThis.get = {
	attitude: () => -1,
	cnNumber: (n) => String(n),
	translation: (x) => String(x),
};
globalThis.window = globalThis;
const swapCalls = [];
globalThis.dmqcApplySwapRules = (player, tag) => swapCalls.push([player.name, tag]);

const here = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(here, "..");
const charSrc = fs.readFileSync(path.join(EXT, "character", "sgz_jiangwei.js"), "utf8");
const uiSrc = fs.readFileSync(path.join(EXT, "effect", "sgz_jiangwei.js"), "utf8");
const skinSrc = fs.readFileSync(path.join(EXT, "skin.js"), "utf8");
const aiSrc = fs.readFileSync(path.join(EXT, "ai", "sgz_jiangwei.js"), "utf8");
const jw = (await import(new URL("../character/sgz_jiangwei.js", import.meta.url).href)).default;

const JIUFA = jw.skills.sgz_jiufa;
const CHENGHAN = jw.skills.sgz_chenghan;
const CH = "sgz_chenghan";

let pass = 0;
let fail = 0;
function ok(cond, msg, extra) {
	if (cond) pass++;
	else {
		fail++;
		console.log("  ✗ " + msg + (extra !== undefined ? "  → 实际：" + extra : ""));
	}
}

// ---------------------------------------------------------------- 假玩家
function mkPlayer(opts = {}) {
	const p = {
		name: opts.name || "姜维",
		hp: opts.hp === undefined ? 4 : opts.hp,
		maxHp: opts.maxHp === undefined ? 9 : opts.maxHp,
		skills: new Set(opts.skills || []),
		marks: Object.assign({}, opts.marks || {}),
		hand: opts.hand === undefined ? 2 : opts.hand,
		calls: [],
		countCards() {
			return this.hand;
		},
		async drawTo(n) {
			this.calls.push(["drawTo", n]);
			this.hand = n;
		},
		hasSkill(s) {
			return this.skills.has(s);
		},
		addSkill(s) {
			(Array.isArray(s) ? s : [s]).forEach((x) => this.skills.add(x));
			this.calls.push(["addSkill", Array.isArray(s) ? s.join(",") : s]);
		},
		removeSkill(s) {
			(Array.isArray(s) ? s : [s]).forEach((x) => this.skills.delete(x));
			this.calls.push(["removeSkill", Array.isArray(s) ? s.join(",") : s]);
		},
		countMark(m) {
			return this.marks[m] || 0;
		},
		addMark(m, n) {
			// 复刻引擎语义：0 / 非数字 → 1（player.js:4257-4259）
			let num = n;
			if (typeof num !== "number" || !num) num = 1;
			this.marks[m] = (this.marks[m] || 0) + num;
		},
		removeMark(m, n) {
			this.marks[m] = Math.max(0, (this.marks[m] || 0) - n);
		},
		async gainMaxHp(n) {
			this.maxHp += n;
			this.calls.push(["gainMaxHp", n]);
		},
		logSkill() {},
		isAlive() {
			return this.hp > 0;
		},
		canCompare() {
			return true;
		},
		chooseTarget() {
			const ev = {
				set() {
					return ev;
				},
				async forResult() {
					return { bool: true, targets: [game._target] };
				},
			};
			return ev;
		},
		chooseToCompare() {
			const ev = {
				async forResult() {
					return { bool: game._win, num1: game._n1, num2: game._n2 };
				},
			};
			return ev;
		},
		async useCard(card, target) {
			this.calls.push(["useCard", card && card.nature, target && target.name]);
		},
	};
	return p;
}
const shaUses = (p, nature) => p.calls.filter((c) => c[0] === "useCard" && c[1] === nature).length;

/// 跑【九伐】content
async function runJiufa(opts = {}) {
	const me = mkPlayer(opts);
	const target = mkPlayer({ name: "目标" });
	game.players = opts.noTarget ? [me] : [me, target];
	game._target = target;
	game._win = opts.win !== false;
	game._n1 = opts.n1 === undefined ? 10 : opts.n1;
	game._n2 = opts.n2 === undefined ? 7 : opts.n2;
	await JIUFA.content({}, {}, me);
	return { me, target };
}

/// 跑【承汉】：模拟引擎的一次 `chooseToCompareAfter`
/// ⚠ 引擎会先过 `filter` 才调 `content`，这里照样走一遍（否则「没赢也给点」会假通过）
async function runChenghan(opts = {}) {
	const me = mkPlayer(Object.assign({}, opts, { skills: [CH].concat(opts.skills || []) }));
	const trigger = {
		player: opts.eventPlayer || me,
		result: {
			bool: opts.win !== false,
			num1: opts.n1 === undefined ? 10 : opts.n1,
			num2: opts.n2 === undefined ? 7 : opts.n2,
		},
	};
	if (CHENGHAN.filter(trigger, me)) await CHENGHAN.content({}, trigger, me);
	return me;
}

// ---------------------------------------------------------------- 一、静态结构
const skillList = (charSrc.match(/skills:\[([^\]]*)\]/) || [])[1] || "";
ok(/"sgz_jiufa"/.test(skillList) && /"sgz_chenghan"/.test(skillList), "角色技能表同时有九伐与承汉", skillList);
ok(!!CHENGHAN, "承汉技能对象存在");
ok(jw.skillTranslate.sgz_chenghan === "承汉", "承汉有译名");
const jfInfo = (charSrc.match(/sgz_jiufa_info:\s*\n([\s\S]{0,420}?)\n\s*sgz_\w+: "/) || [])[1] || "";
ok(/每名角色回合开始时/.test(jfInfo) && /摸至体力上限/.test(jfInfo), "九伐描述换成新文本（摸牌 + 拼点）");
ok(!/蓄力点/.test(jfInfo), "九伐描述里不再提蓄力点");
ok(!/sgz_jiufa_info:[\s\S]{0,300}?蓄力技（0\/9）/.test(charSrc), "九伐描述里不再写「蓄力技（0/9）」");
const chInfo = (charSrc.match(/sgz_chenghan_info:\s*\n([\s\S]{0,420}?)\n\s*sgz_jiufa: "/) || [])[1] || "";
ok(/蓄力技/.test(chInfo) && /（0\/9）/.test(chInfo), "承汉描述标注为蓄力技（0/9）", chInfo.slice(0, 80));
ok(/当你拼点赢时/.test(chInfo) && /点数差/.test(chInfo), "承汉描述写的是「拼点赢 → 点数差个蓄力点」");
ok(/sgz_chenghan:\s*\{\s*\n\s*expose:/.test(aiSrc) && /sgz_chenghan:[\s\S]{0,120}?threaten:/.test(aiSrc), "承汉在 ai 模块里有条目（expose/threaten）");
ok(
	JIUFA.content.constructor.name === "AsyncFunction" && CHENGHAN.content.constructor.name === "AsyncFunction",
	"两个技能的 content 都是 async"
);
ok(/trigger: \{ player: "chooseToCompareAfter" \}/.test(charSrc), "承汉挂在 chooseToCompareAfter（任何拼点赢都涨）");
ok(CHENGHAN.persevereSkill === true, "承汉是蓄力技（persevereSkill）");
// 项目约定所有技能都带 persevereSkill（持恒技），所以这里不查它；
// 「蓄力点归属承汉」用「九伐没有 mark/marktext」来表达
ok(!JIUFA.mark && !JIUFA.marktext, "九伐不再挂蓄力点徽标（mark/marktext 已移到承汉）");

// ---------------------------------------------------------------- 二、九伐：只加体力上限 + 出杀
{
	const { me } = await runJiufa({ n1: 10, n2: 7 }); // X=3
	ok(me.maxHp === 12, "九伐 X=3：体力上限 +3", "maxHp=" + me.maxHp);
	ok(me.countMark(CH) === 0, "九伐本身**不加**蓄力点（蓄力交给承汉）", JSON.stringify(me.marks));
	ok(shaUses(me, "fire") === 3, "九伐 1级：3 张火【杀】", String(shaUses(me, "fire")));
	ok(me.calls.some((c) => c[0] === "drawTo" && c[1] === 9), "九伐：先把牌摸到体力上限");
}
{
	const { me } = await runJiufa({ skills: ["sgz_youming_die"], n1: 9, n2: 7 }); // X=2
	ok(shaUses(me, "kami") === 6, "九伐 2级 X=2：6 张神【杀】（X+4）", String(shaUses(me, "kami")));
	ok(me.maxHp === 11, "九伐 2级：体力上限 +X（+2）", "maxHp=" + me.maxHp);
	ok(me.countMark(CH) === 0, "九伐 2级也不加蓄力点");
}
{
	const { me } = await runJiufa({ win: false });
	ok(me.maxHp === 9 && shaUses(me, "fire") === 0, "拼点没赢：不加体力上限、不出杀");
}
{
	const { me } = await runJiufa({ noTarget: true });
	ok(me.maxHp === 9 && shaUses(me, "fire") === 0, "没有可拼点目标：直接失效");
}

// ---------------------------------------------------------------- 三、承汉：拼点赢就涨蓄力点
{
	const me = await runChenghan({ n1: 10, n2: 7, marks: { [CH]: 0 } }); // X=3
	ok(me.countMark(CH) === 3, "承汉：拼点赢 X=3 → 蓄力 +3", JSON.stringify(me.marks));
	ok(me.hasSkill("sgz_zhuri") && !me.hasSkill("sgz_juejin"), "3 点：授予 薪燃/逐日，未到绝烬", Array.from(me.skills).join(","));
}
{
	const me = await runChenghan({ n1: 10, n2: 7, marks: { [CH]: 8 } });
	ok(me.countMark(CH) === 9, "承汉：8 + 3 → 夹到 9", JSON.stringify(me.marks));
}
{
	const me = await runChenghan({ n1: 10, n2: 7, marks: { [CH]: 9 } });
	ok(me.countMark(CH) === 9, "承汉：满 9 时不再涨（不会变 10）", JSON.stringify(me.marks));
	ok(me.hasSkill("sgz_youming"), "9 点：授予【幽明】");
}
{
	const me = await runChenghan({ win: false, marks: { [CH]: 3 } });
	ok(me.countMark(CH) === 3, "承汉：拼点没赢不涨");
	ok(!me.hasSkill("sgz_xinran"), "没赢也不触发授予", Array.from(me.skills).join(","));
}
{
	// 没有承汉技能（幽明之后）时：不同步衍生技能
	const me = mkPlayer({ skills: [] });
	await CHENGHAN.content({}, { player: me, result: { bool: true, num1: 10, num2: 7 } }, me);
	ok(me.countMark(CH) === 3, "无承汉技能时：内容仍会加标记（触发由技能决定）", JSON.stringify(me.marks));
	ok(!me.hasSkill("sgz_xinran"), "无承汉技能时：不同步衍生技能");
}
{
	// 别人的拼点赢不应该由我加（filter 里 event.player 判定）
	ok(CHENGHAN.filter({ player: mkPlayer({ name: "甲" }), result: { bool: true } }, mkPlayer()) === false, "承汉 filter：别人拼点赢不触发");
	ok(CHENGHAN.filter({ result: { bool: false } }, mkPlayer()) === false, "承汉 filter：没赢不触发");
	ok(CHENGHAN.filter({ player: mkPlayer(), result: { bool: true } }, mkPlayer()) === false, "承汉 filter：event.player 不是自己不算");
	const me = mkPlayer();
	ok(CHENGHAN.filter({ player: me, result: { bool: true } }, me) === true, "承汉 filter：自己拼点赢才触发");
}

// ---------------------------------------------------------------- 四、承汉门槛：1/3/5/7/9
{
	const me = await runChenghan({ n1: 8, n2: 7, marks: { [CH]: 0 } }); // +1 → 1
	ok(me.hasSkill("sgz_xinran") && !me.hasSkill("sgz_zhuri"), "1 点：只有【薪燃】", Array.from(me.skills).join(","));
}
{
	const me = await runChenghan({ n1: 12, n2: 7, marks: { [CH]: 0 } }); // +5 → 5
	ok(
		["sgz_xinran", "sgz_zhuri", "sgz_juejin"].every((s) => me.hasSkill(s)) && !me.hasSkill("sgz_guju"),
		"5 点：薪燃/逐日/绝烬，没有孤炬",
		Array.from(me.skills).join(",")
	);
}
{
	const me = await runChenghan({ n1: 14, n2: 7, marks: { [CH]: 0 } }); // +7 → 7
	ok(me.hasSkill("sgz_guju") && !me.hasSkill("sgz_youming"), "7 点：有孤炬、没有幽明", Array.from(me.skills).join(","));
}

// ---------------------------------------------------------------- 五、换皮时机：发动【幽明】（不再是伐达 9）
{
	await new Promise((r) => setTimeout(r, 0));
	swapCalls.length = 0;
	const me = await runChenghan({ n1: 16, n2: 7, marks: { [CH]: 0 } }); // +9 → 9
	ok(me.countMark(CH) === 9, "9 点：蓄力点满并授予【幽明】");
	await new Promise((r) => setTimeout(r, 0));
	ok(swapCalls.length === 0, "蓄力点满 9 **不再**触发换皮（时机改到发动幽明）", JSON.stringify(swapCalls));
}
{
	const ymAt = charSrc.indexOf("sgz_youming: {");
	const ymEnd = charSrc.indexOf("sgz_fuming: {", ymAt);
	const ymBlock = charSrc.slice(ymAt, ymEnd > ymAt ? ymEnd : undefined);
	ok(/dmqcApplySwapRules\(player, .sgz_youming.\)/.test(ymBlock), "幽明：发动时调用 dmqcApplySwapRules(sgz_youming)");
	// 换皮调用必须在「取消濒死/觉醒之后」并用 setTimeout 让帧（否则会和濒死重绘撞车）
	ok(
		ymBlock.indexOf("trigger.cancel()") >= 0 &&
			ymBlock.indexOf("trigger.cancel()") < ymBlock.indexOf("[0, 300].forEach") &&
			ymBlock.indexOf("[0, 300].forEach") < ymBlock.indexOf("dmqcApplySwapRules(player, 'sgz_youming')"),
		"顺序：取消濒死 → setTimeout(0/300ms) → 换皮"
	);
	// 已觉醒技能的判定兜底（skin.js）
	ok(/function dmqcPlayerOwnsSkill\(player, name\)/.test(skinSrc), "skin.js 有 dmqcPlayerOwnsSkill（把已觉醒也算拥有）");
	ok(/player\.awakenedSkills\.has\(name\)/.test(skinSrc), "dmqcPlayerOwnsSkill 兜底：awakenedSkills");
	ok(/player\.storage\[name\] === true/.test(skinSrc), "dmqcPlayerOwnsSkill 兜底：storage === true");
	ok(/!dmqcPlayerOwnsSkill\(player, carrierSkill\)/.test(skinSrc), "规则入口用 dmqcPlayerOwnsSkill 判定");
	ok(/rule\.skill\s*\?\s*dmqcPlayerOwnsSkill\(player, rule\.skill\)/.test(skinSrc), "matched 判定用 dmqcPlayerOwnsSkill");
	ok(/window\.dmqcSwapRulesDebug = function/.test(skinSrc), "有 dmqcSwapRulesDebug 诊断命令");
	ok(
		ymBlock.indexOf("awakenSkill('sgz_youming')") >= 0 &&
			ymBlock.indexOf("awakenSkill('sgz_youming')") < ymBlock.indexOf("dmqcApplySwapRules(player, 'sgz_youming')"),
		"顺序：先 awakenSkill 再换皮"
	);
	ok(/skill: "sgz_youming"/.test(skinSrc), "skin.js 换皮规则改成 skill: sgz_youming");
	ok(!/mark: "sgz_chenghan",\s*\n\s*threshold: 9/.test(skinSrc), "skin.js 不再用「承汉标记 ≥ 9」判定换皮");
	// 规则引擎支持技能驱动
	ok(/if \(rule\.mark !== skillName && rule\.skill !== skillName\) continue;/.test(skinSrc), "规则引擎入口支持 skill 规则");
	ok(/const matched = rule\.skill/.test(skinSrc), "规则引擎有「技能驱动」的 matched 分支");
}

// ---------------------------------------------------------------- 六、能量条 / 幽明失去承汉但满格
{
	ok(/countMark\('sgz_chenghan'\)/.test(uiSrc) && !/countMark\('sgz_jiufa'\)/.test(uiSrc), "能量条 UI 读的是承汉标记");
	const ymAt = charSrc.indexOf("sgz_youming: {");
	const ymEnd = charSrc.indexOf("sgz_fuming: {", ymAt);
	const ymBlock = charSrc.slice(ymAt, ymEnd > ymAt ? ymEnd : undefined);
	ok(/player\.storage\.sgz_chenghan = 9;/.test(ymBlock), "幽明：先把蓄力点补满到 9（能量条满格）");
	ok(/player\.removeSkill\('sgz_chenghan'\)/.test(ymBlock), "幽明：失去【承汉】");
	ok(/sgz_jiangwei_ui\.updateUI\(player\)/.test(ymBlock), "幽明：移除后刷新能量条");
	ok(
		ymBlock.indexOf("player.storage.sgz_chenghan = 9;") < ymBlock.indexOf("player.removeSkill('sgz_chenghan')"),
		"顺序：先补满再移除（removeSkill 只 unmarkSkill，不删 storage）"
	);
	// 引擎侧确认：removeSkill 不删 storage（蓄力点不会归零）
	const playerJs = fs.readFileSync("E:/Games/无名杀/resources/app/noname/library/element/player.js", "utf8");
	const rsAt = playerJs.indexOf("removeSkill(skill) {");
	const rs = playerJs.slice(rsAt, rsAt + 2200);
	ok(/this\.unmarkSkill\(skill\)/.test(rs), "引擎 removeSkill 会 unmarkSkill（徽标消失）");
	// 只有技能显式写 `onremove: "storage"` 时才会删 storage；承汉没写 ⇒ 蓄力点保留
	ok(
		/info\.onremove == "storage"[\s\S]{0,200}?delete this\.storage\[skill\]/.test(rs),
		"引擎只有 onremove==\"storage\" 才删 storage（承汉没写 ⇒ 蓄力点保留）"
	);
}

// ---------------------------------------------------------------- 七、【复明】是「觉醒失效」而不是「失去」
{
	const fmAt = charSrc.indexOf("sgz_fuming: {");
	const fmEnd = charSrc.indexOf("sgz_youming_counter: {", fmAt);
	const fmBlock = charSrc.slice(fmAt, fmEnd > fmAt ? fmEnd : undefined);
	ok(/player\.awakenSkill\('sgz_fuming'\)/.test(fmBlock), "复明结束时调用 awakenSkill('sgz_fuming')");
	ok(!/player\.removeSkill\('sgz_fuming'\)/.test(fmBlock), "复明结束时**不再** removeSkill（那是「失去」）");
	ok(/isFinalCard/.test(fmBlock) && /isTurnEnd/.test(fmBlock), "复明同时处理成功（第9张牌）与失败（出牌阶段结束）");
	ok(
		fmBlock.indexOf("event.goto(1)") < fmBlock.indexOf("player.awakenSkill('sgz_fuming')"),
		"两条分支都先 goto 到同一流程，再觉醒（所以两分支都是觉醒失效）"
	);
	ok(/if \(trigger\.name == 'dying'\) \{[\s\S]{0,220}?event\.finish\(\)/.test(fmBlock), "濒死分支直接 finish（不会走到觉醒）");
	// 引擎语义核对：awakenSkill = 觉醒失效（保留技能 + 禁用）；removeSkill = 真的失去
	const pj = fs.readFileSync("E:/Games/无名杀/resources/app/noname/library/element/player.js", "utf8");
	const awAt = pj.indexOf("awakenSkill(skill, nounmark) {");
	const aw = pj.slice(awAt, awAt + 900);
	ok(/this\.awakenedSkills\.add\(skill\)/.test(aw), "引擎 awakenSkill：记入 awakenedSkills（显示为已觉醒）");
	ok(/this\.disableSkill\(skill \+ "_awake", skill\)/.test(aw), "引擎 awakenSkill：把技能禁用（失效）");
	ok(/this\.storage\[skill\] = true/.test(aw), "引擎 awakenSkill：storage 置 true");
	ok(!/this\.skills\.remove\(skill\)/.test(aw), "引擎 awakenSkill：**不**把技能从技能栏移除（区别于 removeSkill）");
}

console.log("\n通过 " + pass + "/" + (pass + fail) + "，失败 " + fail);
process.exit(fail ? 1 : 0);
