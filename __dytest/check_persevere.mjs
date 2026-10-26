// ============================================================
//  自检：本包**所有武将技能**都必须带 `persevereSkill: true`（持恒技）
//  跑法：node extension/大梦千秋/__dytest/check_persevere.mjs
//
//  为什么：`persevereSkill: true` = 「持恒技 · 不会被其他效果无效化」。
//    引擎的两处技能封锁器就是按它判的：
//      · library/index.js:13255 【封印】 `skillBlocker`：`!persevereSkill && !charlotte && !locked`
//      · library/index.js:13279 【白板】 `skillBlocker`：`!persevereSkill && !charlotte`
//    ⇒ 漏了这个标签，技能会被"非锁定技失效"之类的效果封掉。
//    同时 `get.index.js:702` 会把「持恒技」显示在技能描述里，所以它也是给玩家看的标签。
//
//  规则（与已成型的 20 个角色文件保持一致）：
//    · `character/*.js` 里用 `{ … }` 字面量定义的技能 / 子技能 → **必须有** `persevereSkill: true`
//    · 唯一例外：`charlotte: true` 的**表现层技能**（定义在 effect/*.js 的 UI 技能、
//      以及角色文件里的隐藏载体）—— 它们本来就**不会被 skillBlocker 封**，无需标签。
//    · 判定只看对象**自己的直接属性行**（缩进 = 对象缩进 + 4），不会被嵌套对象里的
//      `charlotte` 误判成"已豁免"。
// ============================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(here, "..");
const CHAR_DIR = path.join(EXT, "character");

const indentOf = l => l.match(/^\s*/)[0].length;
const isCloser = (l, ind) => new RegExp("^" + " ".repeat(ind) + "\\}\\s*,?\\s*$").test(l);
const KEY_LINE = /^\s*([A-Za-z_$][\w$]*|\[[^\]]+\]): \{\s*$/;

/// 从角色文件里扫出所有技能对象（含 subSkill 里的一层）
function scanSkills(lines) {
  const top = lines.findIndex(l => /^\s*skills: \{/.test(l));
  if (top < 0) return null;
  const skillIndent = indentOf(lines[top]) + 4;
  const out = [];
  const push = (name, indent, start, end, kind) => out.push({ name: name.replace(/^\[|\]$/g, ""), indent, start, end, kind });
  for (let i = top + 1; i < lines.length; i++) {
    if (!KEY_LINE.test(lines[i]) || indentOf(lines[i]) !== skillIndent) continue;
    let end = -1;
    for (let j = i + 1; j < lines.length; j++) if (isCloser(lines[j], skillIndent)) { end = j; break; }
    if (end < 0) continue;
    push(lines[i].trim().replace(/: \{$/, ""), skillIndent, i, end, "skill");
    // subSkill: { … } 里的一层
    const subLine = lines.findIndex((l, idx) => idx > i && idx < end && /^\s*subSkill: \{\s*$/.test(l) && indentOf(l) === skillIndent + 4);
    if (subLine > 0) {
      const subIndent = skillIndent + 8;
      for (let k = subLine + 1; k < end; k++) {
        if (!KEY_LINE.test(lines[k]) || indentOf(lines[k]) !== subIndent) continue;
        let kend = -1;
        for (let j = k + 1; j < end; j++) if (isCloser(lines[j], subIndent)) { kend = j; break; }
        if (kend < 0) continue;
        push(lines[k].trim().replace(/: \{$/, ""), subIndent, k, kend, "subSkill");
        k = kend;
      }
    }
    i = end;
  }
  return out;
}

let pass = 0;
const checks = [];
function ok(name, cond, extra) {
  checks.push({ name, cond: !!cond, extra });
  if (cond) pass++;
}

const files = fs.readdirSync(CHAR_DIR).filter(f => f.endsWith(".js")).sort();
ok("character/ 下有角色文件", files.length > 0, files.length);
let skillTotal = 0;
let exemptTotal = 0;
let doubledTotal = 0;
const failures = [];
const exempts = [];

for (const file of files) {
  const lines = fs.readFileSync(path.join(CHAR_DIR, file), "utf8").split(/\r?\n/);
  const skills = scanSkills(lines);
  if (!skills) {
    ok("能定位到 skills: { —— " + file, false);
    continue;
  }
  ok("能扫出技能对象 —— " + file, skills.length > 0, skills.length);
  for (const s of skills) {
    skillTotal++;
    // 只看对象自己的直接属性行（缩进 = 对象缩进 + 4）
    // ⚠ 用**前缀**匹配：这些属性行后面常常跟中文注释（如 `charlotte: true, // 只显示标记`）
    const own = lines.slice(s.start + 1, s.end).filter(l => indentOf(l) === s.indent + 4);
    const tags = own.filter(l => /^persevereSkill:\s*true\b/.test(l.trim())).length;
    const isCharlotte = own.some(l => /^charlotte:\s*true\b/.test(l.trim()));
    if (tags > 1) {
      doubledTotal++;
      failures.push({ file, skill: s.name, why: "persevereSkill 写了 " + tags + " 次" });
      continue;
    }
    if (tags === 1) continue;
    if (isCharlotte) {
      exemptTotal++;
      exempts.push(file + " :: " + s.name);
      continue;
    }
    failures.push({ file, skill: s.name, why: "缺少 persevereSkill: true" });
  }
}

ok("所有武将技能都带 persevereSkill: true（charlotte 表现层技能除外）", failures.length === 0, JSON.stringify(failures.slice(0, 12)));
ok("没有重复书写 persevereSkill", doubledTotal === 0, doubledTotal);
ok("至少扫到 60 个技能对象（防止解析失效导致「看起来全过」）", skillTotal >= 60, skillTotal);

// 免检名单是**故意**的：这些是 effect/*.js 里的 charlotte 表现层技能（引擎本来就不会封它们）
for (const e of exempts) console.log("  [跳过] charlotte 表现层技能：" + e);

let failed = 0;
for (const c of checks) {
  if (!c.cond) failed++;
  console.log((c.cond ? "  [OK]   " : "  [FAIL] ") + c.name + (c.extra !== undefined && !c.cond ? "   → 实际：" + JSON.stringify(c.extra) : ""));
}
if (failures.length) {
  console.log("\n缺标签的技能：");
  for (const f of failures) console.log("   · " + f.file + " :: " + f.skill + "   （" + f.why + "）");
}
console.log(`\n技能对象 ${skillTotal} 个（豁免 ${exemptTotal} 个 charlotte 表现层）`);
console.log(`通过 ${pass}/${checks.length}，失败 ${failed}`);
process.exit(failed ? 1 : 0);
