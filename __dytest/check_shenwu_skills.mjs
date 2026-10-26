// ============================================================
//  自检：神武卡牌的技能是否真的存在 / 圣光白衣加强效果
//
//  跑法：node extension/大梦千秋/__dytest/check_shenwu_skills.mjs
//
//  背景（用户报的 bug）：
//    「得到的武器牌很多装备后都没生效」——根因是 card/card.js 里神武卡的
//    `skills: ["duyusw_xxx_skill"]` 只写了卡牌定义，**没有对应的技能定义**，
//    于是 `lib.skill[xxx]` 不存在，装上等于白板。
//  这个测试：
//    · 逐个核对卡牌引用的技能名，必须能在本包 skill 段或其它已注册处找到定义
//    · 核对【圣光白衣】加强后的实现（红色牌 + 无色牌对你无效、手牌上限+2）
// ============================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(here, "..");
const cardSrc = fs.readFileSync(path.join(EXT, "card", "card.js"), "utf8");

let pass = 0;
let fail = 0;
function ok(cond, msg, extra) {
	if (cond) pass++;
	else {
		fail++;
		console.log("  ✗ " + msg + (extra !== undefined ? "  → " + extra : ""));
	}
}

// ---------------------------------------------------------------- 1) 本包 skill 段里的技能名
function skillSection(src) {
	const at = src.indexOf("        skill: {");
	if (at < 0) return "";
	const braceStart = src.indexOf("{", at);
	let depth = 0;
	let end = -1;
	for (let i = braceStart; i < src.length; i++) {
		if (src[i] === "{") depth++;
		else if (src[i] === "}") {
			depth--;
			if (depth === 0) {
				end = i;
				break;
			}
		}
	}
	return src.slice(braceStart, end + 1);
}
const skillText = skillSection(cardSrc);
ok(!!skillText, "card/card.js 里有 skill 段");
const ourSkills = new Set([...skillText.matchAll(/^\s{12}([A-Za-z_]\w*):\s*\{/gm)].map((m) => m[1]));
ok(ourSkills.size >= 15, "本包 skill 段技能数量正常（" + ourSkills.size + " 个）", String(ourSkills.size));

// ---------------------------------------------------------------- 2) 每张神武卡引用的技能都要有定义
//   已在本包 skill 段、或基础包（character/card 目录）/其它扩展里定义的都算「有定义」。
function collectGlobalDefined() {
	const defined = new Set();
	const roots = [
		path.resolve("E:/Games/无名杀/resources/app/character"),
		path.resolve("E:/Games/无名杀/resources/app/card"),
		path.resolve(EXT),
		path.resolve("E:/Games/无名杀/resources/app/extension/星之梦"),
	];
	const walk = (dir) => {
		let entries;
		try {
			entries = fs.readdirSync(dir, { withFileTypes: true });
		} catch (e) {
			return;
		}
		for (const e of entries) {
			const p = path.join(dir, e.name);
			if (e.isDirectory()) {
				if (!["node_modules", ".git", "audio", "image", "video", "skin"].includes(e.name)) walk(p);
			} else if (e.name.endsWith(".js")) {
				const text = fs.readFileSync(p, "utf8");
				for (const m of text.matchAll(/^\s{0,12}([A-Za-z_$][\w$]*)\s*:\s*\{/gm)) defined.add(m[1]);
			}
		}
	};
	roots.forEach(walk);
	return defined;
}
const globalDefined = collectGlobalDefined();

// 解析 card 段：卡 id → skills
const lines = cardSrc.split(/\r?\n/);
const cards = [];
for (let i = 0; i < lines.length; i++) {
	const hit = lines[i].match(/^\s{12}([A-Za-z_]\w*):\s*\{\s*$/);
	if (!hit) continue;
	const id = hit[1];
	if (!/^duyusw_/.test(id)) continue;
	let skills = [];
	for (let j = i + 1; j < Math.min(i + 40, lines.length); j++) {
		if (/^\s{12}[A-Za-z_]\w*:\s*\{\s*$/.test(lines[j])) break;
		const sm = lines[j].match(/skills:\s*\[([^\]]*)\]/);
		if (sm) {
			skills = sm[1].split(",").map((s) => s.trim().replace(/["']/g, "")).filter(Boolean);
			break;
		}
	}
	if (skills.length) cards.push({ id, skills });
}
ok(cards.length >= 20, "解析到神武卡牌（" + cards.length + " 张）", String(cards.length));

const missing = [];
for (const c of cards) {
	for (const s of c.skills) {
		if (!ourSkills.has(s) && !globalDefined.has(s)) missing.push(c.id + " → " + s);
	}
}
ok(missing.length === 0, "每张神武卡引用的技能都有定义（不会再出现「装备了没效果」）", JSON.stringify(missing));

// 以前缺的 16 个现在必须都在本包 skill 段里
[
	"duyusw_guilongzhanyuedao_skill",
	"duyusw_chiyanzhenhunqin_skill",
	"duyusw_juechenjinge_skill",
	"duyusw_xiuluolianyuji_skill",
	"duyusw_qicaishenlu_skill",
	"duyusw_luanfenghemingjian_skill",
	"duyusw_xingtianpojunfu_skill",
	"duyusw_jinwuluorigong_skill",
	"duyusw_lingsheji_skill",
	"duyusw_shanrangzhaoshu_skill",
	"duyusw_mengyanchitu_skill",
	"duyusw_qixingpao_skill",
	"duyusw_shengguangbaiyi_skill",
	"duyusw_xieshenmianju_skill",
	"duyusw_jishengong_skill",
	"duyusw_baihuaqun_skill",
].forEach((id) => ok(ourSkills.has(id), "本包已定义 " + id));

// ---------------------------------------------------------------- 3) 圣光白衣加强版
{
	const at = cardSrc.indexOf("duyusw_shengguangbaiyi_skill: {");
	ok(at > 0, "有 duyusw_shengguangbaiyi_skill");
	// 取这个技能块（简单截到下一个 12 空格缩进的技能键）
	const rest = cardSrc.slice(at);
	const nextKey = rest.slice(20).search(/\n\s{12}[A-Za-z_]\w*:\s*\{/);
	const block = nextKey > 0 ? rest.slice(0, nextKey + 20) : rest;
	ok(/trigger:\s*\{\s*target:\s*"useCardToBefore"\s*\}/.test(block), "圣光白衣：在「牌对你生效前」拦截（useCardToBefore）");
	ok(/get\.color\(event\.card\)/.test(block), "圣光白衣：用 get.color 判定牌色");
	ok(/color === "red" \|\| color === "none"/.test(block), "圣光白衣：①红色牌与无色牌都无效");
	ok(/trigger\.cancel\(\)/.test(block), "圣光白衣：取消该牌对自己的效果");
	ok(/maxHandcard:\s*\(player, num\) => num \+ 2/.test(block), "圣光白衣：②手牌上限 +2");
	ok(/hasSkillTag\("unequip2"\)/.test(block), "圣光白衣：被无视防具时失效（与官方防具一致）");
	const infoLine = (cardSrc.match(/duyusw_shengguangbaiyi_info:\s*"([^"]*)"/) || [])[1] || "";
	ok(/红色牌和无色牌对你无效/.test(infoLine), "圣光白衣：描述已同步为「红色牌和无色牌」", infoLine);
}
// 鬼龙斩月刀自实现（星之梦里没有对应技能）
{
	const at = cardSrc.indexOf("duyusw_guilongzhanyuedao_skill: {");
	ok(at > 0, "有 duyusw_guilongzhanyuedao_skill");
	const rest = cardSrc.slice(at, at + 1600);
	ok(/trigger\.directHit/.test(rest), "鬼龙斩月刀：红色杀不可被响应");
	ok(/trigger\.addCount = false/.test(rest), "鬼龙斩月刀：不计入使用次数");
	ok(/cardUsable/.test(rest) && /targetInRange/.test(rest), "鬼龙斩月刀：无次数 / 无距离限制");
}

// ---------------------------------------------------------------- 4) 衍生技 / group 链接（用户报的「有音效但没实际效果」）
{
	// 整理出「已注册」的技能名：顶层技能 + subSkill 派生（父_子）
	const registered = new Set(ourSkills);
	const subLines = skillText.split(/\r?\n/);
	// 用缩进 16/20 的键 + 最近的 12 缩进父技能名来推导 父_子
	let curParent = null;
	for (let i = 0; i < subLines.length; i++) {
		const top = subLines[i].match(/^\s{12}([A-Za-z_]\w*):\s*\{\s*$/);
		if (top) curParent = top[1];
		const sub = subLines[i].match(/^\s{16,20}([A-Za-z_]\w*):\s*\{\s*$/);
		if (sub && curParent) registered.add(curParent + "_" + sub[1]);
	}

	// ① 所有 group 指向的技能都必须真实注册
	const badGroups = [];
	for (const [id, block] of (() => {
		const m = new Map();
		const ls = skillText.split(/\r?\n/);
		for (let i = 0; i < ls.length; i++) {
			const hit = ls[i].match(/^\s{12}([A-Za-z_]\w*):\s*\{\s*$/);
			if (!hit) continue;
			let d = 0, j = i, found = -1;
			for (; j < ls.length; j++) {
				for (const ch of ls[j]) { if (ch === "{") d++; else if (ch === "}") { d--; if (d === 0 && j > i) { found = j; break; } } }
				if (found > 0) break;
			}
			if (found > 0) { m.set(hit[1], ls.slice(i, found + 1).join("\n")); i = found; }
		}
		return m;
	})()) {
		const gm = block.match(/group:\s*(?:"([^"]+)"|\[([^\]]*)\])/);
		if (!gm) continue;
		const list = gm[1] ? [gm[1]] : gm[2].split(",").map((s) => s.trim().replace(/["']/g, "")).filter(Boolean);
		for (const g of list) if (!registered.has(g)) badGroups.push(id + " → " + g);
	}
	ok(badGroups.length === 0, "所有 group 指向的技能都已注册（含 subSkill 派生）", JSON.stringify(badGroups));

	// ② 刑天破军斧的「封牌」衍生技必须在本包里，且引用名正确
	ok(ourSkills.has("duyusw_xingtianpojunfu_skill2"), "本包定义了刑天的封牌衍生技 duyusw_xingtianpojunfu_skill2");
	ok(/addTempSkill\("duyusw_xingtianpojunfu_skill2"\)/.test(cardSrc), "刑天：addTempSkill 用的是本包衍生技");
	ok(!/addTempSkill\("xingtianpojunfu2"\)/.test(cardSrc), "刑天：不再引用星之梦的 xingtianpojunfu2");
	const debuff = cardSrc.slice(cardSrc.indexOf("duyusw_xingtianpojunfu_skill2: {"), cardSrc.indexOf("duyusw_xingtianpojunfu_skill2: {") + 900);
	ok(/cardEnabled\(\)\s*\{\s*return false;/.test(debuff), "封牌：不能使用牌（cardEnabled=false）");
	ok(/cardRespondable\(\)\s*\{\s*return false;/.test(debuff), "封牌：不能打出牌（cardRespondable=false）");
	ok(/cardSavable\(\)\s*\{\s*return false;/.test(debuff), "封牌：不能使用/打出【桃】等（cardSavable=false）");

	// ③ 邪神面具的 group 指向实际注册的 父_子
	ok(/group: "duyusw_xieshenmianju_skill_damage"/.test(cardSrc), "邪神面具：group 指向 duyusw_xieshenmianju_skill_damage");
	ok(/duyusw_xieshenmianju_skill: \{[\s\S]{0,4000}?subSkill: \{[\s\S]{0,200}?damage: \{/.test(cardSrc), "邪神面具：damage 子技能存在");
}

console.log("\n通过 " + pass + "/" + (pass + fail) + "，失败 " + fail);
process.exit(fail ? 1 : 0);
