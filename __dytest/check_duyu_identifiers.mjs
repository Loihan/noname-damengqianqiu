// 梦杜预模块自检：确保所有 sgzDuyu*/SGZ_DUYU_* 模块级标识符「有定义、无悬空调用」。
//
// 来由：三陈改规则时重构 helper，误删了 sgzDuyuSlotCapacity() 的定义，
//       而 sgzDuyuSlotFull() 仍调用它 —— 技能一发动就 ReferenceError 卡死。
//       这类错误 node --check（只查语法）抓不到，故加这个静态自检。
//
// 运行：node __dytest/check_duyu_identifiers.mjs   （全通过退出码 0）

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const targets = ["character/sgz_duyu.js", "effect/sgz_duyu.js"];

/** 去掉注释与字符串字面量，避免把注释里的名字当成调用 */
function stripCommentsAndStrings(code) {
    return code
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ")
        .replace(/`(?:\\.|[^`\\])*`/g, '""')
        .replace(/'(?:\\.|[^'\\])*'/g, '""')
        .replace(/"(?:\\.|[^"\\])*"/g, '""');
}

let failed = false;

for (const rel of targets) {
    const code = stripCommentsAndStrings(readFileSync(join(root, rel), "utf8"));

    // 1. 收集定义：function f / const f = / let f = / export function f
    const defined = new Set();
    for (const m of code.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)/g)) defined.add(m[1]);
    for (const m of code.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g)) defined.add(m[1]);

    // 2. 收集所有"像调用"的名字（排除紧跟 function/new 的、以及属性访问 obj.f）
    const called = new Set();
    for (const m of code.matchAll(/(^|[^\w$.])([A-Za-z_$][\w$]*)\s*\(/g)) {
        const name = m[2];
        if (["function", "if", "for", "while", "switch", "catch", "return", "typeof", "new", "await"].includes(name)) continue;
        called.add(name);
    }

    // 3. 只看本武将自己的命名空间，避免和引擎全局（get/lib/game/...）混淆
    const own = name => /^(sgzDuyu|SGZ_DUYU_)/.test(name);
    const missing = [...called].filter(n => own(n) && !defined.has(n)).sort();

    console.log("── " + rel);
    console.log("   本模块自定义标识符：" + [...defined].filter(own).sort().join(", "));
    if (missing.length) {
        failed = true;
        console.log("   ✗ 悬空调用（有调用、无定义）：" + missing.join(", "));
    } else {
        console.log("   ✓ 无悬空调用");
    }
}

console.log(failed ? "\n存在悬空调用，请补齐定义" : "\n全部通过");
process.exit(failed ? 1 : 0);
