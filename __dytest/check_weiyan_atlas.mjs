// 自检：梦魏延「狂志吞天」的图集消融是否仍然生效
//  背景：这张动皮有 17 个 `screen` 混合槽位（二形态 0 个），本机渲染把 screen 当普通混合画，
//        导致"角色身前/身后各一块亮红色光斑"。最终解法是**改图集**：把 screen 层里实际存在的
//        7 个 region 挪到 1×1 全透明贴图 `dmqc_blank.png` 上。
//  本测试防止：① 有人误把图集还原（光斑复发）② 误删透明贴图 ③ 备份丢失（没法还原）
//             ④ 连带把别的 region 也消融了
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const extRoot = path.resolve(here, "..");
const ATLAS_DIR = path.join(extRoot, "..", "十周年UI", "assets", "dynamic", "势魏延", "狂志吞天");
const ATLAS = path.join(ATLAS_DIR, "XingXiang.atlas");
const BAK = ATLAS + ".dmqc.bak";
const BLANK = path.join(ATLAS_DIR, "dmqc_blank.png");
const BLANK_PAGE = "dmqc_blank.png";

const MUTED = ["r-htx9", "r-htx10", "r-htx11", "r-htx12", "r-htx13", "r-guang1", "r-tx1"];
const MUST_KEEP = ["bg-1", "bg-2", "r-htx1", "r-htx8", "r-shenti", "bus1-2"];

let pass = 0;
let fail = 0;
function ok(cond, msg) {
	if (cond) {
		pass++;
	} else {
		fail++;
		console.log("  ✗ " + msg);
	}
}

function parseAtlas(text) {
	const lines = String(text).split(/\r?\n/);
	const pages = [];
	let cur = null;
	let i = 0;
	while (i < lines.length) {
		const line = lines[i];
		if (/\.png\s*$/.test(line)) {
			cur = { page: line.trim(), header: [], regions: [] };
			i++;
			while (i < lines.length && /^\s*\S+\s*:/.test(lines[i])) {
				cur.header.push(lines[i]);
				i++;
			}
			pages.push(cur);
			continue;
		}
		if (line.trim() && /^\S/.test(line)) {
			const reg = { name: line.trim(), lines: [] };
			i++;
			while (i < lines.length && /^\s+\S/.test(lines[i])) {
				reg.lines.push(lines[i]);
				i++;
			}
			if (cur) cur.regions.push(reg);
			continue;
		}
		i++;
	}
	return pages;
}
function index(pages) {
	const map = new Map();
	pages.forEach((p) => p.regions.forEach((r) => map.set(r.name, { page: p.page, lines: r.lines })));
	return map;
}
function getLine(lines, key) {
	const line = lines.find((l) => new RegExp("^\\s*" + key + "\\s*:").test(l));
	return line ? line.split(":").slice(1).join(":").trim() : "";
}

console.log("=== 梦魏延「狂志吞天」图集消融自检 ===");

ok(fs.existsSync(ATLAS), "图集文件存在");
ok(fs.existsSync(BLANK), "透明贴图 dmqc_blank.png 存在");
ok(fs.existsSync(BAK), "原始图集备份 .dmqc.bak 存在");

const cur = fs.readFileSync(ATLAS, "utf8");
const bak = fs.readFileSync(BAK, "utf8");
const curPages = parseAtlas(cur);
const bakPages = parseAtlas(bak);
const curIdx = index(curPages);
const bakIdx = index(bakPages);

// ① 透明页存在
ok(
	curPages.some((p) => p.page === BLANK_PAGE),
	"当前图集含透明页 " + BLANK_PAGE
);

// ② 7 个 screen region 都被挪到透明页，且 1×1
MUTED.forEach((name) => {
	const hit = curIdx.get(name);
	ok(!!hit, name + " 仍在图集中（被挪到透明页）");
	if (!hit) return;
	ok(hit.page === BLANK_PAGE, name + " 已挪到透明页（实际在 " + hit.page + "）");
	ok(getLine(hit.lines, "size") === "1, 1", name + " 尺寸为 1,1（实际 " + getLine(hit.lines, "size") + "）");
});

// ③ 它们在原页里不能还留着副本（否则 findRegion 可能取到原图）
MUTED.forEach((name) => {
	const dup = curPages.filter((p) => p.page !== BLANK_PAGE && p.regions.some((r) => r.name === name));
	ok(dup.length === 0, name + " 原页里没有残留副本");
});

// ④ 备份里这 7 个 region 还在原页（说明备份是"未消融"的真原件，可还原）
MUTED.forEach((name) => {
	const hit = bakIdx.get(name);
	ok(!!hit, name + " 在备份里存在");
	if (hit) ok(hit.page !== BLANK_PAGE, name + " 在备份里仍在原页（备份未被污染）");
});

// ⑤ 关键 region 没被误伤
MUST_KEEP.forEach((name) => {
	ok(curIdx.has(name), name + " 仍然存在");
	const hit = curIdx.get(name);
	if (hit) ok(hit.page !== BLANK_PAGE, name + " 未被消融");
});

// ⑥ 没多消融：除这 7 个外，备份里的 region 全部还在（且不全在透明页）
const missing = [];
bakPages.forEach((p) => {
	if (p.page === BLANK_PAGE) return;
	p.regions.forEach((r) => {
		if (MUTED.includes(r.name)) return;
		if (!curIdx.has(r.name)) missing.push(r.name);
	});
});
ok(missing.length === 0, "备份中的其余 region 一个不少（缺失：" + missing.slice(0, 5).join(", ") + "）");

const total = curPages.reduce((a, p) => a + p.regions.length, 0);
console.log("  · 当前图集：" + curPages.length + " 页 / " + total + " 个 region（其中透明页 " +
	(curPages.find((p) => p.page === BLANK_PAGE)?.regions.length || 0) + " 个）");

console.log("\n通过 " + pass + "/" + (pass + fail) + "，失败 " + fail);
process.exit(fail ? 1 : 0);
