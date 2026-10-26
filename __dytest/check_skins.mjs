// ============================================================
//  自检：皮肤注册（skin.js · 千幻聆音 + 十周年UI）
//  跑法：node extension/大梦千秋/__dytest/check_skins.mjs
//
//  为什么需要：皮肤这条链**全部靠字符串约定**，写错了游戏里只表现成
//    「皮肤格子是空的 / 立绘不换 / 动皮不播」，控制台顶多一条 warn，很难查。
//    这里把三份数据对起来查：
//      ① `skin.js` 的 DMQC_SKIN_FILES   → 静皮图**必须真的存在**（千幻只认文件）
//      ② `skin.js` 的 DMQC_DYNAMIC_INJECT → 皮肤名必须能在十周年UI 里找到（否则动皮不播）
//      ③ 十周年UI 的骨骼目录 → `assets/dynamic/<皮肤目录>/` 必须真的有 .skel/.json
//
//  ⚠ 这不是「跑游戏逻辑」，只是静态对账；但每一处失败都对应一个真实会踩的坑。
// ============================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(here, ".."); // …/extension/大梦千秋
const APP = path.resolve(EXT, "../.."); // …/resources/app
const read = f => fs.readFileSync(f, "utf8");
const has = f => fs.existsSync(f);

const skinSrc = read(path.join(EXT, "skin.js"));

let pass = 0;
const checks = [];
function ok(name, cond, extra) {
    checks.push({ name, cond: !!cond, extra });
    if (cond) pass++;
}

// ---------------------------------------------------------------- 常量表（skin.js 里的 `const DMQC_XXX = "…";`）
const constMap = {};
for (const m of skinSrc.matchAll(/const (DMQC_[A-Z0-9_]+) = "([^"]*)";/g)) constMap[m[1]] = m[2];

// 赵云的「花色皮名」，SKIN_FILES 里用 Object.values 取的
const zhaoyunSkins = [];
const zhaoyunSuitMap = {}; // club → 赵云·龙霄♣
{
    const block = skinSrc.match(/const DMQC_ZHAOYUN_SUIT_SKINS = \{[\s\S]*?\n\};/);
    for (const m of (block ? block[0] : "").matchAll(/(\w+): "([^"]+)"/g)) {
        zhaoyunSuitMap[m[1]] = m[2];
        zhaoyunSkins.push(m[2]);
    }
}

/// 把表里的一项解析成字符串：`"字面量"` / `DMQC_XXX` / `DMQC_XXX + ".jpg"` / Object.values(...)
function resolveItem(tok) {
    tok = tok.trim().replace(/,$/, "");
    let m;
    if ((m = tok.match(/^"([^"]*)"$/))) return m[1];
    if ((m = tok.match(/^(DMQC_[A-Z0-9_]+) \+ "([^"]*)"$/))) {
        const v = constMap[m[1]];
        return v === undefined ? null : v + m[2];
    }
    if ((m = tok.match(/^(DMQC_[A-Z0-9_]+)$/))) return constMap[m[1]] === undefined ? null : constMap[m[1]];
    return null;
}

/// 拆 `[a, b, c]` 这种数组的字面内容（这几张表里没有带逗号的字符串）
const splitItems = inner =>
    String(inner)
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);

// ---------------------------------------------------------------- ① DMQC_SKIN_FILES → 静皮图是否存在
const skinFiles = {}; // charId → [fileName…]
{
    const block = skinSrc.match(/const DMQC_SKIN_FILES = \{[\s\S]*?\n\t\};/);
    ok("skin.js：能找到 DMQC_SKIN_FILES 表", !!block);
    for (const line of (block ? block[0] : "").split(/\r?\n/)) {
        const m = line.match(/^\s*(sgz_[a-z0-9_]+):\s*(.+?),?\s*$/);
        if (!m) continue;
        const [, charId, rest] = m;
        let files = [];
        if (/Object\.values\(/.test(rest)) {
            // 梦赵云：Object.values(DMQC_ZHAOYUN_SUIT_SKINS).map(name => name + ".jpg")
            files = zhaoyunSkins.map(n => n + ".jpg");
        } else {
            const inner = rest.match(/^\[(.*)\]/);
            if (!inner) continue;
            files = splitItems(inner[1]).map(resolveItem);
        }
        skinFiles[charId] = files;
    }
    ok("皮肤条目表非空（至少 10 个武将）", Object.keys(skinFiles).length >= 10, JSON.stringify(Object.keys(skinFiles)));
}

// 「皮肤名 → 真实图片路径」的登记（第 9 节；对本包武将实际不生效，但图确实在那儿，这里也认）
const replaceMap = {}; // fileName → [relPath…]
{
    const block = skinSrc.match(/const DMQC_REPLACE_SKIN_FILES = \{[\s\S]*?\n\t\};/);
    const blockSrc = block ? block[0] : "";
    // 形如  [DMQC_XXX + ".jpg"]: "extension/大梦千秋/image/xxx.jpg"
    for (const m of blockSrc.matchAll(/\[(DMQC_[A-Z0-9_]+) \+ "\.jpg"\]\s*:\s*"([^"]+)"/g)) {
        const name = constMap[m[1]];
        if (name === undefined) continue;
        (replaceMap[name + ".jpg"] = replaceMap[name + ".jpg"] || []).push(m[2]);
    }
    // 形如  [DMQC_ZHAOYUN_SUIT_SKINS.club + ".jpg"]: "extension/大梦千秋/image/sgz_zhaoyun_club.jpg"
    for (const m of blockSrc.matchAll(/\[DMQC_ZHAOYUN_SUIT_SKINS\.(\w+) \+ "\.jpg"\]\s*:\s*"([^"]+)"/g)) {
        const name = zhaoyunSuitMap[m[1]];
        if (name === undefined) continue;
        (replaceMap[name + ".jpg"] = replaceMap[name + ".jpg"] || []).push(m[2]);
    }
}

/// 某张静皮图到底在不在（先看第 9 节的 path 登记，再看 skin/image/<武将>/<文件名>）
function skinImagePath(charId, file) {
    const mapped = (replaceMap[file] || []).find(p => has(path.join(APP, p)));
    if (mapped) return path.join(APP, mapped);
    const local = path.join(EXT, "skin/image", charId, file);
    return has(local) ? local : null;
}

for (const charId of Object.keys(skinFiles)) {
    for (const file of skinFiles[charId]) {
        if (file === null || file === undefined) {
            ok("皮肤条目「" + charId + "」有一项解析不出来（表里写的是非常量表达式？）", false);
            continue;
        }
        const p = skinImagePath(charId, file);
        ok("静皮图存在：" + charId + " / " + file, !!p, p ? "" : path.join("skin/image", charId, file));
    }
}

// ---------------------------------------------------------------- ② DMQC_DYNAMIC_INJECT → 十周年UI 有没有这份动皮
const dsSrc = read(path.join(APP, "extension/十周年UI/js/dynamicSkin.js"));
const dsLines = dsSrc.split(/\r?\n/);

/// 取 dynamicSkin 里某个**武将键**（4 空格缩进）的整段
function dsBlock(key) {
    const start = dsLines.findIndex(l => new RegExp("^ {4}" + key + ": \\{").test(l));
    if (start < 0) return null;
    let end = dsLines.length;
    for (let i = start + 1; i < dsLines.length; i++) {
        if (/^ {4}[A-Za-z_$][\w$]*: *\{/.test(dsLines[i]) || /^ {2}\},?$/.test(dsLines[i])) {
            end = i;
            break;
        }
    }
    return dsLines.slice(start, end).join("\n");
}

/// 从一段 dynamicSkin 文本里抠出某个皮肤（6 空格缩进的键）的 `{...}` 块（按花括号配对）
function subBlock(text, key) {
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const m = text.match(new RegExp("\\n {6}" + esc(key) + ": \\{"));
    if (!m) return null;
    let depth = 0;
    const start = m.index + m[0].length - 1; // 指向 '{'
    for (let j = start; j < text.length; j++) {
        if (text[j] === "{") depth++;
        else if (text[j] === "}") {
            depth--;
            if (depth === 0) return text.slice(start, j + 1);
        }
    }
    return null;
}

const injectEntries = [];
for (const m of skinSrc.matchAll(/\{ char: "(sgz_[a-z0-9_]+)", src: "([A-Za-z0-9_]+)", skins: \[([^\]]*)\] \}/g)) {
    injectEntries.push({ char: m[1], src: m[2], skins: splitItems(m[3]).map(resolveItem) });
}
ok("skin.js：能解析出 DMQC_DYNAMIC_INJECT（至少 10 条）", injectEntries.length >= 10, JSON.stringify(injectEntries.map(e => e.char)));

// 本包自己带来的数据（十周年UI 里没有对应键）→ 只校验 DMQC_SKIN_OVERRIDES 里有没有
const overridesBlock = skinSrc.match(/const DMQC_SKIN_OVERRIDES = \{[\s\S]*?\n\t\};/);
const overridesSrc = overridesBlock ? overridesBlock[0] : "";

for (const entry of injectEntries) {
    const block = dsBlock(entry.src);
    const ownData = new RegExp("\\n\\t\\t" + entry.char + ": \\{").test(overridesSrc);
    // 梦曹髦的两张皮是**本包自带数据**（来自 03动皮包），十周年UI 里没有 `caomao` 键，
    // 真正生效的是 DMQC_SKIN_OVERRIDES ⇒ 有自带数据时允许 src 缺失（skin.js 里已写清）。
    ok("动皮来源武将存在：十周年UI dynamicSkin." + entry.src, !!block || ownData, entry.char + " ← " + entry.src);
    for (const skinName of entry.skins) {
        if (skinName === null || skinName === undefined) {
            ok("动皮名解析失败：" + entry.char, false);
            continue;
        }
        // 「敕剑伏波(静)」是本包自己的**静态**菜单条目，十周年UI 里本来就没有 → 跳过
        if (skinName === constMap.DMQC_JIANGWEI_STATIC_KEY) continue;
        const inDs = !!block && new RegExp("\\n {6}" + skinName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ": \\{").test(block);
        if (!inDs && ownData) continue; // 本包自带数据（DMQC_SKIN_OVERRIDES 会整条替换）
        ok("动皮数据存在：" + entry.char + " / " + skinName + "（取自 " + entry.src + "）", inDs, inDs ? "" : "十周年UI/js/dynamicSkin.js 的 " + entry.src + " 里没有这个键");
    }
}

// ---------------------------------------------------------------- ③ 骨骼素材目录是否真的存在
for (const entry of injectEntries) {
    const block = dsBlock(entry.src);
    if (!block) continue;
    for (const skinName of entry.skins) {
        if (!skinName || skinName === constMap.DMQC_JIANGWEI_STATIC_KEY) continue;
        const re = new RegExp("\\n {6}" + skinName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ": \\{\\s*\\n\\s*name: \"([^\"]+)\"");
        const m = block.match(re);
        if (!m) continue; // 上面那一条已经报过了
        const dir = m[1].slice(0, m[1].lastIndexOf("/"));
        const assets = path.join(APP, "extension/十周年UI/assets/dynamic", dir);
        const files = has(assets) ? fs.readdirSync(assets) : [];
        const hasSkel = files.some(f => /\.(skel|json)$/i.test(f));
        ok("骨骼素材存在：" + dir, hasSkel, assets);
    }
}

// ---------------------------------------------------------------- ④ 皮肤列表缓存清理名单要覆盖所有皮肤武将
{
    const listMatch = skinSrc.match(/for \(const id of \[([^\]]*)\]\) \{/);
    const listed = listMatch ? splitItems(listMatch[1]).map(s => s.replace(/"/g, "")) : [];
    const missing = Object.keys(skinFiles).filter(id => !listed.includes(id));
    ok("第 4 节缓存清理名单覆盖所有皮肤武将", listed.length > 0 && missing.length === 0, "缺：" + JSON.stringify(missing));
}

// ---------------------------------------------------------------- ⑤ skin/image 下的图必须都在 skin.js 里登记过
{
    const root = path.join(EXT, "skin/image");
    const orphans = [];
    if (has(root)) {
        for (const dir of fs.readdirSync(root)) {
            const dp = path.join(root, dir);
            if (!fs.statSync(dp).isDirectory()) continue;
            for (const file of fs.readdirSync(dp)) {
                if (!/\.(jpg|jpeg|png|gif|webp)$/i.test(file)) continue;
                const name = file.replace(/\.[^.]+$/, "");
                if (!skinSrc.includes(name)) orphans.push(dir + "/" + file);
            }
        }
    }
    ok("skin/image 下的每张图都在 skin.js 里登记过（没有孤儿图）", orphans.length === 0, JSON.stringify(orphans));
}

// ---------------------------------------------------------------- ⑥ 本次新增的两张皮（点名核对）
{
    ok("梦甘宁的皮肤图已在包里：skin/image/sgz_gannin/战破无间.jpg", has(path.join(EXT, "skin/image/sgz_gannin/战破无间.jpg")) && fs.statSync(path.join(EXT, "skin/image/sgz_gannin/战破无间.jpg")).size > 10000);
    ok("梦文鸯的皮肤图已在包里：skin/image/sgz_wenyang/势若万钧.jpg", has(path.join(EXT, "skin/image/sgz_wenyang/势若万钧.jpg")) && fs.statSync(path.join(EXT, "skin/image/sgz_wenyang/势若万钧.jpg")).size > 10000);
    ok("梦甘宁的动皮来源 = 本体神甘宁（shen_ganning）", injectEntries.some(e => e.char === "sgz_gannin" && e.src === "shen_ganning" && e.skins.includes("战破无间")), JSON.stringify(injectEntries.find(e => e.char === "sgz_gannin")));
    ok("梦文鸯的动皮来源 = 本体文鸯（db_wenyang，**不是** wenyang）", injectEntries.some(e => e.char === "sgz_wenyang" && e.src === "db_wenyang" && e.skins.includes("势若万钧")), JSON.stringify(injectEntries.find(e => e.char === "sgz_wenyang")));
    ok("两张皮都进了皮肤列表兜底表（DMQC_SKIN_FILES）", (skinFiles.sgz_gannin || []).includes("战破无间.jpg") && (skinFiles.sgz_wenyang || []).includes("势若万钧.jpg"), JSON.stringify({ gannin: skinFiles.sgz_gannin, wenyang: skinFiles.sgz_wenyang }));
    // 静皮图与千幻聆音里本体那张是同一张（复制来源没搞错）
    const copyOf = [
        ["extension/千幻聆音/sanguoskin/shen_ganning/战破无间.jpg", path.join(EXT, "skin/image/sgz_gannin/战破无间.jpg")],
        ["extension/千幻聆音/sanguoskin/db_wenyang/势若万钧.jpg", path.join(EXT, "skin/image/sgz_wenyang/势若万钧.jpg")],
    ];
    for (const [srcRel, dst] of copyOf) {
        const src = path.join(APP, srcRel);
        ok("静皮复制来源存在：" + path.basename(srcRel), has(src), srcRel);
        if (has(src) && has(dst)) ok("与本体那张图逐字节一致：" + path.basename(dst), fs.readFileSync(src).equals(fs.readFileSync(dst)));
    }
}

// ---------------------------------------------------------------- ⑦ 「势若万钧」的攻击出框：触发条件 = 使用【惊跃】
{
    const wySrc = read(path.join(EXT, "character/sgz_wenyang.js"));
    ok(
        "skin.js：有 dmqcIsShiRuoWanjun（判断当前立绘是不是势若万钧）",
        /function dmqcIsShiRuoWanjun\(player\) \{[\s\S]{0,120}dmqcSkinIs\(player, DMQC_WENYANG_SHIRO_SPINE\)/.test(skinSrc)
    );
    ok(
        "skin.js：_gj 短路里包含势若万钧（使用伤害牌不再自动出框）",
        // ⚠ 名单会随皮肤增加而变长（后来又加了梦甘宁），别要求它是最后一项
        /if \(dmqcIsYishenZhengdao\(player\)[\s\S]{0,500}dmqcIsShiRuoWanjun\(player\)[\s\S]{0,300}\)\s*return false/.test(skinSrc)
    );
    ok(
        "skin.js：导出 window.dmqcPlayWenyangEffect（手动派发 GongJi）",
        /window\.dmqcPlayWenyangEffect = function \(player\) \{[\s\S]{0,200}dmqcSkillChukuang\(player, DMQC_WENYANG_SHIRO_SPINE/.test(skinSrc)
    );
    ok(
        "角色文件：在【惊跃】的 useCard1 分支里调用了 dmqcPlayWenyangEffect",
        /if \(point == "useCard1"\) \{[\s\S]{0,900}dmqcPlayWenyangEffect\(player\)/.test(wySrc)
    );
    ok(
        "角色文件：调用处有 typeof 判空 + try（skin.js 异步加载 / 没开皮肤扩展时不能影响结算）",
        /typeof window\.dmqcPlayWenyangEffect === "function"/.test(wySrc)
    );
    // 骨骼里必须真有 GongJi 动作，否则手动派发也没内容可播（这张皮数据里没有 gongji 键，走兜底默认）
    const skelPath = path.join(APP, "extension/十周年UI/assets/dynamic/文鸯/势若万钧/XingXiang.skel");
    const skelText = has(skelPath) ? fs.readFileSync(skelPath).toString("latin1") : "";
    ok("骨骼里存在 GongJi 动作（手动派发才有内容可播）", /GongJi/.test(skelText), skelPath);
    // 其它技能出框入口别被这次改动弄丢
    for (const fn of ["dmqcPlayJihuiEffect", "dmqcPlayZhonghuiEffect", "dmqcPlaySunhanhuaEffect", "dmqcPlayWenyangEffect", "dmqcPlayGanningEffect"]) {
        ok("出框入口仍在：" + fn, new RegExp("window\\." + fn + " = function").test(skinSrc));
    }
}

// ---------------------------------------------------------------- ⑦b 「战破无间」的攻击出框：触发条件 = 即将造成伤害时
{
    const gnSrc = read(path.join(EXT, "character/sgz_gannin.js"));
    ok(
        "skin.js：有 dmqcIsZhanPoWujian（判断当前立绘是不是战破无间）",
        /function dmqcIsZhanPoWujian\(player\) \{[\s\S]{0,120}dmqcSkinIs\(player, DMQC_GANNING_ZHANPO_SPINE\)/.test(skinSrc)
    );
    ok(
        "skin.js：_gj 短路里包含战破无间（使用伤害牌不再自动出框）",
        /if \(dmqcIsYishenZhengdao\(player\)[\s\S]{0,600}dmqcIsZhanPoWujian\(player\)[\s\S]{0,300}\)\s*return false/.test(skinSrc)
    );
    ok(
        "skin.js：导出 window.dmqcPlayGanningEffect（手动派发 GongJi）",
        /window\.dmqcPlayGanningEffect = function \(player\) \{[\s\S]{0,250}dmqcSkillChukuang\(player, DMQC_GANNING_ZHANPO_SPINE/.test(skinSrc)
    );
    // 触发源：角色文件里的隐藏技能，`damageBegin1` 的 source 侧（= 即将造成伤害）
    ok(
        "角色文件：有隐藏技能挂在 damageBegin1（source 侧 = 即将造成伤害）",
        /trigger: \{ source: "damageBegin1" \}/.test(gnSrc) && /sgz_gannin_chukuang/.test(gnSrc)
    );
    ok(
        "角色文件：该技能已注册进 character.skills（否则不会 init）",
        /skills: \[[\s\S]*?SGZ_GN_CHUKUANG_SKILL[\s\S]*?\]/.test(gnSrc)
    );
    ok(
        "角色文件：触发时调用了 dmqcPlayGanningEffect（带 typeof 判空 + try）",
        /typeof window\.dmqcPlayGanningEffect === "function"/.test(gnSrc) && /dmqcPlayGanningEffect\(player\)/.test(gnSrc)
    );
    ok("角色文件：0 点伤害不播（event.num > 0）", /event\.num > 0/.test(gnSrc));
    // 骨骼里必须有 GongJi，才有东西可播
    const skelPath = path.join(APP, "extension/十周年UI/assets/dynamic/神甘宁/战破无间/XingXiang.skel");
    const skelText = has(skelPath) ? fs.readFileSync(skelPath).toString("latin1") : "";
    ok("战破无间的骨骼里存在 GongJi 动作", /GongJi/.test(skelText), skelPath);
}

// ---------------------------------------------------------------- ⑧ 梦甘宁「战破无间」的出框位置（右下角、大小不变）
{
    // 把 skin.js 里的 DMQC_SKIN_OVERRIDES 直接求值（常量用上面解析出来的 constMap 兜底）
    let overrides = null;
    try {
        const text = (skinSrc.match(/const DMQC_SKIN_OVERRIDES = (\{[\s\S]*?\n\t\});/) || [])[1];
        if (text) {
            const decls = Object.entries(constMap)
                .map(([k, v]) => `const ${k} = ${JSON.stringify(v)};`)
                .join("\n");
            const zy = `const DMQC_ZHAOYUN_SUIT_SKINS = ${JSON.stringify(zhaoyunSuitMap)};`;
            // ⚠ 捕获组本身就是 `{…}`（不含结尾的 `;`），别再 slice 掉最后一个字符
            overrides = new Function(`${decls}\n${zy}\nreturn ${text};`)();
        }
    } catch (e) {
        overrides = null;
    }
    ok("skin.js：DMQC_SKIN_OVERRIDES 能求值（常量/语法没问题）", !!overrides);
    const gnData = overrides && overrides.sgz_gannin && overrides.sgz_gannin["战破无间"];
    ok("梦甘宁「战破无间」有 override（带出框参数）", !!gnData);
    if (gnData) {
        let srcData = null;
        try {
            const block = subBlock(dsBlock("shen_ganning") || "", "战破无间");
            srcData = block ? new Function("return " + block)() : null;
        } catch (e) {
            srcData = null;
        }
        const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
        ok("override 的骨骼路径与本体一致", !!srcData && gnData.name === srcData.name, srcData && srcData.name);
        ok(
            "待机参数与本体逐字一致（x / y / angle / scale / beijing 没被动到）",
            !!srcData && same(gnData.x, srcData.x) && same(gnData.y, srcData.y) && same(gnData.angle, srcData.angle) && same(gnData.scale, srcData.scale) && same(gnData.beijing, srcData.beijing),
            JSON.stringify({ x: gnData.x, y: gnData.y, angle: gnData.angle, scale: gnData.scale })
        );
        // 「右下角」= x 比例偏大、y 比例偏小（⚠ y 是从屏幕**底边**往上算的比例）
        ok("出框位置在屏幕右侧（gongji.x 比例 > 0.5）", !!(gnData.gongji && Array.isArray(gnData.gongji.x)) && gnData.gongji.x[1] > 0.5, JSON.stringify(gnData.gongji));
        ok("出框位置在屏幕下侧（gongji.y 比例 < 0.5，y 从底边往上算）", !!(gnData.gongji && Array.isArray(gnData.gongji.y)) && gnData.gongji.y[1] < 0.5, JSON.stringify(gnData.gongji));
        ok("出框大小与原来一致（gongji.scale === 顶层 scale）", !!gnData.gongji && gnData.gongji.scale === gnData.scale, JSON.stringify({ gongji: gnData.gongji && gnData.gongji.scale, top: gnData.scale }));
    }
}

// ---------------------------------------------------------------- 汇总
let failed = 0;
for (const c of checks) {
    if (!c.cond) failed++;
    console.log((c.cond ? "  [OK]   " : "  [FAIL] ") + c.name + (c.extra !== undefined && !c.cond ? "   → 实际：" + JSON.stringify(c.extra) : ""));
}
console.log(`\n通过 ${pass}/${checks.length}，失败 ${failed}`);
process.exit(failed ? 1 : 0);
