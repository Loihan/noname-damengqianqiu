// ============================================================
//  自检：梦陆逊的三张动皮 + 局内条件自动切换 + 「参数写死在扩展里」
//  跑法：node extension/大梦千秋/__dytest/check_luxun_skins.mjs
//
//  现状口径（2026，按需求定稿）：
//    · ① 原陆逊「蛇年清明」 ② 原陆逊「烈火炽天」 ③ 原周瑜「烈焰炽魂」
//    · 默认 + **每轮开始** → ①；发动【焚灭】→ ②；发动【韬晦】→ ③
//    · **三张皮的框内/出框参数全部写在 `skin.js` 第 3e 节 `DMQC_SKIN_PATCHES` 里**，
//      手改那几段数字即可；**不再**依赖「皮肤切换」的局内调参保存
//      （它的保存流程对我们注入的条目实测不生效）。
//    · 因此代码里**不应该**再留有运行期回填/轮询/快照那一套。
// ============================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(here, "..");
const APP = path.resolve(EXT, "..", "..");
const UI = path.join(APP, "extension", "十周年UI", "assets", "dynamic");

const skinSrc = fs.readFileSync(path.join(EXT, "skin.js"), "utf8");
const charSrc = fs.readFileSync(path.join(EXT, "character", "sgz_luxun.js"), "utf8");

let pass = 0;
let fail = 0;
function ok(cond, msg) {
	if (cond) pass++;
	else {
		fail++;
		console.log("  ✗ " + msg);
	}
}
function eq(a, b, msg) {
	ok(a === b, msg + (a === b ? "" : "（实际 " + JSON.stringify(a) + "，期望 " + JSON.stringify(b) + "）"));
}
function deepEq(a, b, msg) {
	const sa = JSON.stringify(a);
	const sb = JSON.stringify(b);
	ok(sa === sb, msg + (sa === sb ? "" : "\n      实际: " + sa + "\n      期望: " + sb));
}

// ---------- 工具：从 skin.js 里抽对象字面量 ----------
function extractBlockAfter(marker) {
	const at = skinSrc.indexOf(marker);
	if (at < 0) return null;
	let i = skinSrc.indexOf("{", at);
	if (i < 0) return null;
	const start = i;
	let depth = 0;
	for (; i < skinSrc.length; i++) {
		const ch = skinSrc[i];
		if (ch === "{") depth++;
		else if (ch === "}") {
			depth--;
			if (depth === 0) break;
		}
	}
	return skinSrc.slice(start, i + 1);
}
function evalLiteral(text) {
	const prepared = text
		.replace(/\[DMQC_LUXUN_MING\]/g, '["蛇年清明"]')
		.replace(/\[DMQC_LUXUN_HUO\]/g, '["烈火炽天"]')
		.replace(/\[DMQC_LUXUN_ZHOU\]/g, '["烈焰炽魂"]');
	return new Function("return (" + prepared + ");")();
}

// ---------- 1. 常量与注入表 ----------
ok(skinSrc.includes('const DMQC_LUXUN_MING = "蛇年清明"'), "常量 ① 蛇年清明");
ok(skinSrc.includes('const DMQC_LUXUN_HUO = "烈火炽天"'), "常量 ② 烈火炽天");
ok(skinSrc.includes('const DMQC_LUXUN_ZHOU = "烈焰炽魂"'), "常量 ③ 烈焰炽魂");
ok(
	/const DMQC_LUXUN_SKINS = \[DMQC_LUXUN_MING, DMQC_LUXUN_HUO, DMQC_LUXUN_ZHOU\]/.test(skinSrc),
	"DMQC_LUXUN_SKINS 顺序 = ①②③"
);
ok(
	/char:\s*"sgz_luxun",\s*src:\s*"luxun",\s*srcBySkin:\s*\{\s*\[DMQC_LUXUN_ZHOU\]:\s*"zhouyu"\s*\}/.test(skinSrc),
	"注入条目：src = luxun，③ 的原数据来源 = zhouyu（srcBySkin）"
);
ok(!/sgz_luxun:\s*\{\s*\n\s*\[DMQC_LUXUN_MING\]:/.test(skinSrc), "DMQC_SKIN_OVERRIDES 里没有陆逊（不做整条覆盖）");

// ---------- 2. 参数表：三张皮全部写死在里面 ----------
const patchText = extractBlockAfter("const DMQC_SKIN_PATCHES = {");
ok(!!patchText, "能找到 DMQC_SKIN_PATCHES");
const patches = patchText ? evalLiteral(patchText) : null;
ok(!!patches && !!patches.sgz_luxun, "参数表里有 sgz_luxun");
if (patches && patches.sgz_luxun) {
	const per = patches.sgz_luxun;
	deepEq(Object.keys(per).sort(), ["蛇年清明", "烈火炽天", "烈焰炽魂"].sort(), "三张皮都在参数表里（①②③）");

	// ① 蛇年清明：框内参数（无 gongji —— 骨骼里本来就没有 GongJi）
	const ming = per["蛇年清明"];
	if (ming) {
		ok(Array.isArray(ming.x) && ming.x.length === 2 && typeof ming.x[1] === "number", "① 框内 x 是 [0, 数值]");
		ok(Array.isArray(ming.y) && ming.y.length === 2 && typeof ming.y[1] === "number", "① 框内 y 是 [0, 数值]");
		ok(typeof ming.scale === "number", "① 框内 scale 是数字");
		ok(typeof ming.angle === "number", "① 框内 angle 是数字");
		ok(!!ming.beijing, "① 有背景层参数");
		ok(!ming.gongji, "① 不写出框（本皮骨骼没有 GongJi）");
	} else ok(false, "① 蛇年清明 缺少参数");

	// ② 烈火炽天：框内 + 出框
	const huo = per["烈火炽天"];
	if (huo) {
		ok(Array.isArray(huo.x) && typeof huo.x[1] === "number", "② 框内 x 是 [0, 数值]");
		ok(Array.isArray(huo.y) && typeof huo.y[1] === "number", "② 框内 y 是 [0, 数值]");
		ok(typeof huo.scale === "number", "② 框内 scale 是数字");
		ok(typeof huo.angle === "number", "② 框内 angle 是数字");
		ok(!!huo.beijing, "② 有背景层参数");
		const g = huo.gongji || {};
		eq(g.name, "陆逊/烈火炽天/XingXiang", "② 出框骨骼名");
		eq(g.action, "GongJi", "② 出框动作 = GongJi");
		ok(Array.isArray(g.x) && Array.isArray(g.y), "② 出框 x/y 是数组");
		ok(typeof g.scale === "number", "② 出框 scale 是数字");
		ok(typeof g.speed === "number", "② 出框 speed 是数字（1 = 原速）");
	} else ok(false, "② 烈火炽天 缺少参数");

	// ③ 烈焰炽魂：框内 + 出框
	const zhou = per["烈焰炽魂"];
	if (zhou) {
		ok(Array.isArray(zhou.x) && typeof zhou.x[1] === "number", "③ 框内 x 是 [0, 数值]");
		ok(Array.isArray(zhou.y) && typeof zhou.y[1] === "number", "③ 框内 y 是 [0, 数值]");
		ok(typeof zhou.scale === "number", "③ 框内 scale 是数字");
		const g = zhou.gongji || {};
		ok(Array.isArray(g.x) && Array.isArray(g.y), "③ 出框 x/y 是数组");
		ok(typeof g.scale === "number", "③ 出框 scale 是数字");
		ok(typeof g.speed === "number", "③ 出框 speed 是数字");
	} else ok(false, "③ 烈焰炽魂 缺少参数");
}

// ---------- 3. 深合并函数仍然存在且语义正确 ----------
const mergeSrc = (() => {
	const at = skinSrc.indexOf("function dmqcMergeSkinData(");
	if (at < 0) return null;
	let i = skinSrc.indexOf("{", at);
	let depth = 0;
	for (; i < skinSrc.length; i++) {
		if (skinSrc[i] === "{") depth++;
		else if (skinSrc[i] === "}") {
			depth--;
			if (depth === 0) break;
		}
	}
	return skinSrc.slice(at, i + 1);
})();
ok(!!mergeSrc, "能找到 dmqcMergeSkinData");
if (mergeSrc) {
	const merge = new Function(
		"function dmqcCloneSkinData(v){ if(Array.isArray(v)) return v.map(dmqcCloneSkinData); if(v && typeof v===\"object\"){ const o={}; for(const k in v) o[k]=dmqcCloneSkinData(v[k]); return o;} return v; }\n" +
			mergeSrc +
			"\n return dmqcMergeSkinData;"
	)();
	const base = {
		name: "周瑜/烈焰炽魂/ZhouYu03_LiHui_XingXiang",
		version: "4.0",
		x: [0, 0.53],
		y: [0, 0.47],
		scale: 0.41,
		gongji: { x: [0, 0.66], action: "GongJi" },
		background: "周瑜/烈焰炽魂/beijing.png",
	};
	const merged = merge(base, { scale: 0.5, gongji: { speed: 1.35 } });
	eq(merged.scale, 0.5, "参数表里的框内 scale 会覆盖本体");
	eq(merged.gongji.speed, 1.35, "参数表里的出框 speed 会覆盖本体");
	eq(merged.gongji.x[1], 0.66, "参数表没写的出框 x 继续用本体");
	eq(merged.background, "周瑜/烈焰炽魂/beijing.png", "没写的键继续用本体");
	ok(merged.gongji !== base.gongji, "合并后不共享引用");
	eq(JSON.stringify(base.gongji), JSON.stringify({ x: [0, 0.66], action: "GongJi" }), "合并不修改本体");
}

// ---------- 4. 不再有运行期持久化那套 ----------
[
	"dmqcApplySavedSkinParams",
	"dmqcApplyOwnSkinParams",
	"dmqcPollSavedSkinParams",
	"dmqcWatchLiveSkinParams",
	"dmqcCaptureSkinParams",
	"dmqcRememberApplied",
	"dmqc_skin_params",
].forEach((name) => {
	ok(!skinSrc.includes(name), "已移除运行期回填相关代码：" + name);
});
ok(!/setInterval\(dmqcWatchLiveSkinParams/.test(skinSrc), "没有每秒轮询参数了");
ok(!/setInterval\(dmqcPollSavedSkinParams/.test(skinSrc), "没有同步 saveSkinParams 的轮询了");

// ---------- 5. 素材存在 ----------
[
	["陆逊/蛇年清明", "XingXiang.skel"],
	["陆逊/烈火炽天", "XingXiang.skel"],
	["周瑜/烈焰炽魂", "ZhouYu03_LiHui_XingXiang.skel"],
].forEach(([dir, skel]) => {
	ok(fs.existsSync(path.join(UI, dir.replace(/\//g, path.sep), skel)), "骨骼存在：" + dir + "/" + skel);
});
["蛇年清明.jpg", "烈火炽天.jpg", "烈焰炽魂.jpg"].forEach((f) => {
	ok(fs.existsSync(path.join(EXT, "skin", "image", "sgz_luxun", f)), "静皮存在：skin/image/sgz_luxun/" + f);
});

// ---------- 6. 切换函数 + 每轮开始 ----------
ok(/window\.dmqcApplyLuxunSkin = function \(player, which\)/.test(skinSrc), "定义了 window.dmqcApplyLuxunSkin(player, which)");
ok(/DMQC_LUXUN_SKINS\[idx\]/.test(skinSrc), "按 DMQC_LUXUN_SKINS[idx] 取皮肤名");
ok(
	/trigger:\s*\{\s*global:\s*\["addMark",\s*"removeMark",\s*"gameStart",\s*"roundStart"\]\s*\}/.test(skinSrc),
	"sgz_dmqc_skin_swap 挂了 roundStart"
);
const roundAt = skinSrc.indexOf('if (trigger.name === "roundStart")');
ok(roundAt > 0 && /dmqcApplyLuxunSkin\(p,\s*1\)/.test(skinSrc.slice(roundAt, roundAt + 500)), "roundStart 分支切回 ①");

// ---------- 7. 角色文件接线 ----------
ok(/async content\(event, trigger, player\)\s*\{[\s\S]{0,400}?dmqcApplyLuxunSkin\(player, 2\)/.test(charSrc), "焚灭 → ②");
ok(/step 0[\s\S]{0,700}?dmqcApplyLuxunSkin\(player, 3\)/.test(charSrc), "韬晦 → ③");
ok(/dmqcApplyLuxunSkin\(player, 1\)/.test(charSrc), "韬晦·refresh（roundStart）→ ①");
ok((charSrc.match(/dmqcApplyLuxunSkin\(player, \d\)/g) || []).length === 3, "角色文件里恰好 3 处换肤调用（②③①）");

ok(/window\.dmqcLuxunSkinDebug = function/.test(skinSrc), "有 dmqcLuxunSkinDebug（三方对照诊断）");
ok(/window\.dmqcLuxunForce = function/.test(skinSrc), "有 dmqcLuxunForce（写回参数并重播）");
ok(/window\.dmqcSkinDataDump = function/.test(skinSrc), "有 dmqcSkinDataDump（按武将对照诊断）");

ok(/window\.dmqcLuxunPushParams = function/.test(skinSrc), "有 dmqcLuxunPushParams（发 ADJUST 推参数）");
ok(/message: "ADJUST"/.test(skinSrc), "直接发 ADJUST 原始消息（不依赖皮肤切换的 API）");
ok(/\{ x: d\.x\.slice\(\), y: d\.y\.slice\(\) \}/.test(skinSrc), "位置：x/y 一条消息");
ok(/\{ scale: d\.scale \}/.test(skinSrc) && /\{ angle: d\.angle \}/.test(skinSrc), "大小/角度各一条消息（if/else 链）");
ok(/\[60, 300, 900\]\.forEach/.test(skinSrc), "换肤后延迟多次推送（等新节点建好）");
ok(/\[200, 800, 2000, 4000\]\.forEach/.test(skinSrc), "开局也会推送（皮肤可能是千幻先应用的）");

// ---------- 8. ③ 烈焰炽魂：删掉「回合开始」的出场动画（chuchang） ----------
ok(
	/sgz_luxun:\s*\{\s*\[DMQC_LUXUN_ZHOU\]:\s*\["chuchang"\]\s*\}/.test(skinSrc),
	"DMQC_SKIN_STRIP_ACTIONS：③ 烈焰炽魂 删掉 chuchang"
);
ok(
	/(0-9|\[)\s*60, 300, 900, 1500\]\.forEach/.test(skinSrc) || /\[60, 300, 900, 1500\]\.forEach/.test(skinSrc),
	"切换皮肤后也会把「正在播的副本」上的 chuchang 删掉"
);
ok(/delete n\.player\.chuchang/.test(skinSrc), "确实执行了 delete ...chuchang");
ok(/周瑜\/烈焰炽魂\//.test(skinSrc), "按骨骼名识别 ③（周瑜/烈焰炽魂/…）");
ok(
	!/sgz_luxun:\s*\{\s*\[DMQC_LUXUN_MING\]:\s*\["chuchang"\]/.test(skinSrc),
	"①② 不动（它们本来就没有 chuchang）"
);

// ---------- 9. 自动换肤必须走「皮肤切换」自己的 selectSkinV3（和手动点菜单同一条路径） ----------
ok(/window\.skinSwitch\.dynamic/.test(skinSrc), "取到 skinSwitch.dynamic");
ok(/ss\.selectSkinV3\(skinName, player, !isDeputy\)/.test(skinSrc), "自动换肤调用 selectSkinV3(skinName, player, isPrimary)");
ok(/if \(!switched && typeof game\.qhly_changeDynamicSkin === "function"\)/.test(skinSrc), "selectSkinV3 不可用时才回退到千幻换肤");
ok(
	/if \(!switched && typeof game\.qhly_changeDynamicSkin === "function"\) \{/.test(skinSrc),
	"只有 switched 为 false 时才会调 qhly_changeDynamicSkin（selectSkinV3 成功就不二次重播）"
);
// 魏延/曹髦那两个换肤函数不能被误改
const weiyanAt = skinSrc.indexOf("window.dmqcApplyWeiyanAwakenSkin = function");
const weiyanBlock = weiyanAt >= 0 ? skinSrc.slice(weiyanAt, weiyanAt + 900) : "";
ok(!/selectSkinV3/.test(weiyanBlock), "魏延换肤函数没有被误插入 selectSkinV3");

// ---------- 10. 支持「改文件后不重启就生效」：重读 skin.js 并重建参数 ----------
ok(/window\.dmqcLuxunReloadFile = function/.test(skinSrc), "有 dmqcLuxunReloadFile（读文件重解析 DMQC_SKIN_PATCHES）");
ok(/game\.readFileAsText\(rel, done/.test(skinSrc), "用 game.readFileAsText 读取 skin.js");
ok(/const baseKey = skinName === DMQC_LUXUN_ZHOU \? "zhouyu" : "luxun"/.test(skinSrc), "③ 用 zhouyu 作基底，①② 用 luxun");
ok(/ds\.sgz_luxun\[skinName\] = dmqcMergeSkinData\(base, patch \|\| \{\}\)/.test(skinSrc), "重建时仍是「本体 + 补丁」深合并");
ok(/window\.dmqcLuxunPushParams\(\);/.test(skinSrc), "重读后立刻推给渲染器");

console.log("\n通过 " + pass + "/" + (pass + fail) + "，失败 " + fail);
process.exit(fail ? 1 : 0);
