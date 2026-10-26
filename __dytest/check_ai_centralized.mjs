// ============================================================
//  自检：技能 AI 是否全部集中在 `ai/<武将>.js`
//  跑法：node extension/大梦千秋/__dytest/check_ai_centralized.mjs
//
//  约定（见 ai/README.md）：
//    · 一个武将一个 AI 模块：`ai/<角色文件名>.js`（与 character/<同名>.js 对应）
//    · 模块 default export 一张表：key = **技能 id**，子技能用注册后的完整 id
//      （`父技能_子技能`，引擎就是按这个注册的）
//    · 角色文件里只写 `ai: AI.<技能id>,`，不再内联写 AI
//  为什么要有这个自检：
//    · 内联 AI 会被后来的修改带走/覆盖（历史上已经发生过：同一个技能写了两个 ai 字段，
//      后一个把前一个整个盖掉）；
//    · 把 AI 集中后，「哪些技能还没 AI」只有一处能看全，方便逐个补。
//
//  例外（会打印出来，不算失败）：
//    · 引用了角色文件私有闭包（常量/工具函数）的 AI 只能留在角色文件里；
//      目前只有梦孙寒华的【妙剑】④（`sgz_miaojian::use`）。
// ============================================================
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(here, "..");
const CHAR = path.join(EXT, "character");
const AIDIR = path.join(EXT, "ai");

// 允许留在角色文件里的内联 AI（键：`文件.js::技能id`，技能 id 用 `父::子` 形式）
const INLINE_ALLOW = {
    "sgz_sunhanhua.js::sgz_miaojian::use": "引用了本文件的 SGZ_MJ / sgzMjCards / sgzMjViewAsSet（闭包）",
};

// ---- 最小全局假件（只为能 import 角色模块）----
globalThis.lib = { card: {}, inpile: [], translate: {}, skill: {} };
globalThis._status = { currentPhase: null, event: null, dying: [] };
globalThis.game = { players: [], dead: [], phaseNumber: 1, log() {}, playAudio() {}, filterPlayer: () => [], hasPlayer: () => false, checkMod() {}, hasPlayer2: () => false };
globalThis.get = { color: () => "none", name: c => (c && c.name) || "", translation: n => String(n), info: c => c || {}, copy: o => o, select: () => [1, 1], autoViewAs: c => c, value: () => 5, attitude: () => -1, threaten: () => 5 };
globalThis.ui = { selected: { targets: [] } };
globalThis.window = globalThis;

let pass = 0;
const checks = [];
function ok(name, cond, extra) {
    checks.push({ name, cond: !!cond, extra });
    if (cond) pass++;
}

const files = fs.readdirSync(CHAR).filter(f => f.endsWith(".js")).sort();
const aiFiles = fs.existsSync(AIDIR) ? fs.readdirSync(AIDIR).filter(f => f.endsWith(".js")).sort() : [];
ok("ai/ 目录存在且非空", aiFiles.length > 0, aiFiles.length);

const usedKeys = new Map(); // `${file}::${key}` → true
const missingAI = [];       // 还没写 AI 的技能
const inlineKept = [];      // 允许的内联
let totalSkills = 0;
let withAI = 0;
const problems = [];

for (const file of files) {
    let mod;
    try {
        mod = (await import(pathToFileURL(path.join(CHAR, file)).href)).default;
    } catch (e) {
        ok("能 import 角色模块 —— " + file, false, e.message);
        continue;
    }
    ok("能 import 角色模块 —— " + file, !!mod && !!mod.skills, file);

    // 该武将的 AI 模块（若存在）
    let aiMod = null;
    let aiErr = "";
    if (aiFiles.includes(file)) {
        try {
            aiMod = (await import(pathToFileURL(path.join(AIDIR, file)).href)).default;
        } catch (e) {
            aiErr = e.message;
        }
        ok("能 import AI 模块 —— ai/" + file, !!aiMod, aiErr);
        const srcText = fs.readFileSync(path.join(CHAR, file), "utf8");
        ok(
            "角色文件确实 import 了自己的 AI 模块 —— " + file,
            new RegExp('import AI(?:,\\s*\\{\\s*helpers\\s*\\})? from "\\.\\./ai/' + file.replace(/\./g, "\\.") + '"').test(srcText)
        );
    }

    for (const [key, skill] of Object.entries(mod.skills || {})) {
        const report = (id, ai, allowKey) => {
            totalSkills++;
            const hasAI = ai !== undefined;
            if (!hasAI) { missingAI.push(file + " :: " + id); return; }
            withAI++;
            if (allowKey && INLINE_ALLOW[allowKey]) {
                inlineKept.push(allowKey + "（" + INLINE_ALLOW[allowKey] + "）");
                usedKeys.set(file + "::" + id, true);
                return;
            }
            const expected = aiMod ? aiMod[id] : undefined;
            if (expected === undefined) {
                problems.push(file + " :: " + id + "：有 AI，但 ai/" + file + " 里没有这个键（还在内联？）");
                return;
            }
            if (ai !== expected) {
                problems.push(file + " :: " + id + "：技能上的 ai 与 ai/" + file + " 不是同一个对象（可能内联了另一份）");
                return;
            }
            usedKeys.set(file + "::" + id, true);
        };
        report(key, skill && skill.ai, file + "::" + key);
        for (const [sk, sv] of Object.entries((skill && skill.subSkill) || {})) {
            // 子技能在引擎里注册成 `父技能_子技能`
            report(key + "_" + sk, sv && sv.ai, file + "::" + key + "::" + sk);
        }
    }
}

// AI 模块里的键必须都被用到（没有死条目）
for (const file of aiFiles) {
    let aiMod = null;
    try {
        aiMod = (await import(pathToFileURL(path.join(AIDIR, file)).href)).default;
    } catch (e) {
        continue; // 上面已经报过
    }
    const keys = Object.keys(aiMod || {});
    ok("ai/" + file + " 非空", keys.length > 0, keys.length);
    const dead = keys.filter(k => !usedKeys.has(file + "::" + k));
    ok("ai/" + file + " 没有死条目（每个键都有对应技能在用）", dead.length === 0, JSON.stringify(dead));
    // key 必须是合法标识符（角色文件里要写 AI.<key>）
    const badKey = keys.filter(k => !/^[A-Za-z_$][\w$]*$/.test(k));
    ok("ai/" + file + " 的键都是合法标识符", badKey.length === 0, JSON.stringify(badKey));
}

ok("所有技能 AI 都来自 ai/ 模块（除登记过的内联例外）", problems.length === 0, JSON.stringify(problems.slice(0, 10)));

// ---------------------------------------------------------------- 静态检查：AI 里不能引用角色文件的私有标识符
// 为什么：把 `ai:` 块搬进 `ai/` 后，块里若引用了角色文件里定义的函数/常量（闭包），
//   运行到那段 AI 时会 **ReferenceError**，而 `import` 阶段看不出来（只在调用时才炸）。
//   搬运时就踩过一次：梦钟会的 `sgz_jitian_save` 被遗留在角色文件里。
// 做法：去掉注释与字符串字面量后，检查「sgz_/shj_/mfsd_/wgxd_/DMQC_/SGZ_ 开头的标识符」
//   是否都在本模块内定义（对象键 / const / let / var / function）；`xxx.yyy` 这种属性访问不算。
function stripCode(src) {
    return src
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/\/\/[^\n]*/g, " ")
        .replace(/`(?:[^`\\]|\\.)*`/g, '""')
        .replace(/"(?:[^"\\]|\\.)*"/g, '""')
        .replace(/'(?:[^'\\]|\\.)*'/g, '""');
}
for (const file of aiFiles) {
    const code = stripCode(fs.readFileSync(path.join(AIDIR, file), "utf8"));
    const defined = new Set();
    for (const m of code.matchAll(/^\s{4}([A-Za-z_$][\w$]*)\s*[:(]/gm)) defined.add(m[1]);
    for (const m of code.matchAll(/\b(?:const|let|var|function)\s+([A-Za-z_$][\w$]*)/g)) defined.add(m[1]);
    const used = new Set();
    for (const m of code.matchAll(/(?<![.\w$])((?:sgz|shj|mfsd|wgxd)_[A-Za-z0-9_]+|(?:DMQC|SGZ)_[A-Z0-9_]+)\b/g)) used.add(m[1]);
    const missing = [...used].filter(x => !defined.has(x));
    ok("ai/" + file + " 没有引用角色文件的私有标识符（不会 ReferenceError）", missing.length === 0, JSON.stringify(missing));
}

// ---------------------------------------------------------------- 检查 helpers（check / mod 的 AI 钩子 / 选项评分）
// 约定：这些「只给 AI 用、又不是技能 ai 表」的函数放在模块的**具名导出 helpers** 里，
//   角色文件写 `check: helpers.xxx` / `aiValue: helpers.xxx` / `set("ai", …helpers.xxx…)`。
for (const file of aiFiles) {
    let helpers = null;
    try {
        const mod = await import(pathToFileURL(path.join(AIDIR, file)).href);
        helpers = mod.helpers || null;
    } catch (e) {
        continue;
    }
    const charPath = path.join(CHAR, file);
    const charSrc = fs.existsSync(charPath) ? fs.readFileSync(charPath, "utf8") : "";
    const keys = helpers ? Object.keys(helpers) : [];
    if (helpers) ok("ai/" + file + " 的 helpers 非空且都是函数", keys.length > 0 && keys.every(k => typeof helpers[k] === "function"), JSON.stringify(keys.filter(k => typeof helpers[k] !== "function")));
    // helpers 里的每个键都要被角色文件用到（没有死条目）
    const deadHelpers = keys.filter(k => !new RegExp("helpers\\." + k + "\\b").test(charSrc));
    ok("ai/" + file + " 的 helpers 没有死条目", deadHelpers.length === 0, JSON.stringify(deadHelpers));
    // 角色文件里引用的 helpers.xxx 必须真的存在（防手滑打错）
    const referenced = [...charSrc.matchAll(/helpers\.([A-Za-z_$][\w$]*)/g)].map(m => m[1]);
    const unknown = [...new Set(referenced)].filter(k => !keys.includes(k));
    ok("ai/" + file + " 的 helpers 引用都能对上（没有拼错的名字）", unknown.length === 0, JSON.stringify(unknown));
}

// ---------------------------------------------------------------- 检查「内联 AI 索引」是否与实际数量一致
// 角色文件里仍有 `.set("ai", …)` 这类一行式判定（依赖技能局部变量，暂不搬运），
// 每个模块底部登记了「合计 N 处」；这里按同一套"最内层技能归属"算法重算并比对。
function countInlineAI(charPath) {
    const lines = fs.readFileSync(charPath, "utf8").split(/\r?\n/);
    const indentOf = l => l.match(/^[ ]*/)[0].length;
    const isCloser = (l, ind) => new RegExp("^" + " ".repeat(ind) + "\\}\\s*,?\\s*$").test(l);
    const keyRe = /^\s*([A-Za-z_$][\w$]*|\[[^\]]+\]):\s*\{\s*$/;
    const top = lines.findIndex(l => /^\s*skills: \{/.test(l));
    if (top < 0) return null;
    const S = indentOf(lines[top]) + 4;
    const spans = [];
    const walk = (from, to, indent, prefix) => {
        for (let i = from; i < to; i++) {
            if (!keyRe.test(lines[i]) || indentOf(lines[i]) !== indent) continue;
            let end = -1;
            for (let j = i + 1; j < to; j++) if (isCloser(lines[j], indent)) { end = j; break; }
            if (end < 0) continue;
            const id = prefix + lines[i].trim().replace(/:\s*\{\s*$/, "");
            spans.push({ start: i, end, id });
            const subLine = lines.findIndex((l, idx) => idx > i && idx < end && /^\s*subSkill:\s*\{\s*$/.test(l) && indentOf(l) === indent + 4);
            if (subLine > 0) walk(subLine + 1, end, indent + 8, id + "_");
            i = end;
        }
    };
    walk(top + 1, lines.length, S, "");
    const counts = new Map();
    for (let i = 0; i < lines.length; i++) {
        if (!/\.set\(\s*["']ai[12]?["']/.test(lines[i])) continue;
        let best = null;
        for (const sp of spans) if (sp.start < i && i < sp.end && (!best || sp.start > best.start)) best = sp;
        if (best) counts.set(best.id, (counts.get(best.id) || 0) + 1);
    }
    return [...counts.values()].reduce((a, b) => a + b, 0);
}
for (const file of aiFiles) {
    const charPath = path.join(CHAR, file);
    if (!fs.existsSync(charPath)) continue;
    const actual = countInlineAI(charPath);
    const text = fs.readFileSync(path.join(AIDIR, file), "utf8");
    const m = text.match(/内联 AI 索引[\s\S]{0,400}?合计 (\d+) 处/);
    ok("ai/" + file + " 登记了「内联 AI 索引」", !!m, m ? "" : "缺少索引块");
    if (m) ok("ai/" + file + " 的内联 AI 数量与实际一致（" + actual + " 处）", Number(m[1]) === actual, "登记 " + m[1] + " 处，实际 " + actual + " 处");
}

for (const c of checks) if (!c.cond) console.log("  [FAIL] " + c.name + (c.extra !== undefined ? "   → 实际：" + JSON.stringify(c.extra) : ""));
for (const c of checks) if (c.cond && /import|非空|键|死条目|来自/.test(c.name)) console.log("  [OK]   " + c.name);
if (problems.length) {
    console.log("\n问题：");
    for (const p of problems) console.log("   · " + p);
}
if (inlineKept.length) {
    console.log("\n允许留在角色文件里的内联 AI：");
    for (const p of [...new Set(inlineKept)]) console.log("   · " + p);
}
console.log(`\n技能对象 ${totalSkills} 个：已有 AI ${withAI} 个（${((withAI / totalSkills) * 100).toFixed(1)}%），还没有 ${missingAI.length} 个`);
if (missingAI.length) {
    const byFile = {};
    for (const m of missingAI) {
        const [f, s] = m.split(" :: ");
        (byFile[f] = byFile[f] || []).push(s);
    }
    console.log("\n还没写 AI 的技能（下一步的清单）：");
    for (const f of Object.keys(byFile)) console.log("   " + f.replace(/^/, "  ").padEnd(28) + byFile[f].join(", "));
}
console.log(`\n通过 ${pass}/${checks.length}，失败 ${checks.length - pass}`);
process.exit(checks.length - pass ? 1 : 0);

