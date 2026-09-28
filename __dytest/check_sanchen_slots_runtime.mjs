// 运行时自检：把 character/sgz_duyu.js 的「补栏判定」整条 helper 链
// （sgzDuyuSlotFull → sgzDuyuSlotUsed / sgzDuyuSlotCapacity）在模拟引擎 player 上真跑一遍。
// 这样能抓住「函数被误删 / 调用链断裂」这类只在发动技能时才暴露的错误。
//
// 运行：node __dytest/check_sanchen_slots_runtime.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "..", "character", "sgz_duyu.js"), "utf8");

// 只截取本文件里那段 helper（从 SGZ_DUYU_SLOT_MAX 到 sgzDuyuPickSpacey 结束），
// 用 Function 求值成真实函数对象 —— 等价于模块作用域里那份代码。
const start = src.indexOf("const SGZ_DUYU_SLOT_MAX");
const end = src.indexOf("// AI 用：牌名的粗略价值");
if (start < 0 || end < 0 || end <= start) {
    console.error("找不到 helper 区段，请检查 character/sgz_duyu.js 是否被大改");
    process.exit(1);
}
const snippet = src.slice(start, end);

// 模拟引擎全局：lib.card / get.subtypes / get.name / get.translation / game.log
const lib = {
    card: {
        zhuque: { type: "equip", subtype: "equip1" },
        qinggang: { type: "equip", subtype: "equip1" },
        cixiong: { type: "equip", subtype: "equip1" },
        mengyanchitu: { type: "equip", subtype: "equip6", subtypes: ["equip3", "equip4"] },
    },
};
const get = {
    name: c => c.name,
    subtypes: c => {
        const info = lib.card[c.name] || {};
        if (info.subtypes) return info.subtypes.slice();
        return info.subtype ? [info.subtype] : [];
    },
    translation: s => s,
};
const game = { log() {} };
const SGZ_DUYU_SLOT_MAX = 3;

const factory = new Function(
    "lib",
    "get",
    "game",
    snippet + "\nreturn { sgzDuyuCardSlots, sgzDuyuSlotCapacity, sgzDuyuSlotUsed, sgzDuyuSlotFull, sgzDuyuGainSlotBonus, sgzDuyuPickSlotBonus };"
);
const H = factory(lib, get, game);

/** 模拟引擎 player：expandedSlots 记扩展数，equips 记各栏已装备件数 */
function mockPlayer(expanded = {}, equips = {}) {
    const p = {
        expandedSlots: expanded,
        equips,
        // 引擎：该类型栏位总数 = 1 + 扩展数（这里不模拟废除，前面例子里也没有）
        countEnabledSlot(slot) {
            const extra = p.expandedSlots[slot] > 0 ? p.expandedSlots[slot] : 0;
            return 1 + extra;
        },
        // 引擎：getVEquips 返回该类型已装备的牌（虚拟装备同理）
        getVEquips(slot) {
            const n = p.equips[slot] || 0;
            return Array.from({ length: n }, (_, i) => ({ name: "zhuque", uid: slot + i }));
        },
        getCards() {
            return [];
        },
        async expandEquip(slot) {
            p.expandedSlots[slot] = (p.expandedSlots[slot] || 0) + 1;
        },
    };
    return p;
}

let all = true;
async function run(name, expanded, equips, expectBonus, expectCapacity) {
    const p = mockPlayer({ ...expanded }, { ...equips });
    const card = { name: "zhuque" }; // equip1
    const bonus = await H.sgzDuyuGainSlotBonus(p, card);
    const cap = H.sgzDuyuSlotCapacity(p, "equip1");
    const ok = bonus === expectBonus && cap === expectCapacity;
    if (!ok) all = false;
    console.log(
        (ok ? "PASS" : "FAIL") + "  " + name
        + "  → 补栏=" + bonus + "（期望 " + expectBonus + "）"
        + "，武器栏数=" + cap + "（期望 " + expectCapacity + "）"
    );
}

// 需求里给的 4 个例子
await run("例1：1栏0装", { equip1: 0 }, { equip1: 0 }, false, 1);
await run("例2：1栏1装", { equip1: 0 }, { equip1: 1 }, true, 2);
await run("例3：3栏0装", { equip1: 2 }, { equip1: 0 }, false, 3);
await run("例4：3栏3装", { equip1: 2 }, { equip1: 3 }, false, 3);
// 边界
await run("边界：2栏1装", { equip1: 1 }, { equip1: 1 }, false, 2);
await run("边界：2栏2装", { equip1: 1 }, { equip1: 2 }, true, 3);

// 双类型坐骑（equip3+equip4 都满且可扩）也应能补栏
{
    const p = mockPlayer({ equip3: 0, equip4: 0 }, { equip3: 1, equip4: 1 });
    const ok = (await H.sgzDuyuGainSlotBonus(p, { name: "mengyanchitu" })) === true;
    if (!ok) all = false;
    console.log((ok ? "PASS" : "FAIL") + "  双类型坐骑：攻/防坐骑都已满 → 补一个坐骑栏");
}

// 纯函数口径抽查
{
    const p = mockPlayer({ equip1: 2 }, { equip1: 2 });
    const ok = H.sgzDuyuSlotUsed(p, "equip1") === 2 && H.sgzDuyuSlotCapacity(p, "equip1") === 3 && H.sgzDuyuSlotFull(p, "equip1") === false;
    if (!ok) all = false;
    console.log((ok ? "PASS" : "FAIL") + "  口径抽查：2装/3栏 → full=false（已装备件数 < 栏位总数）");
}

console.log(all ? "\n全部通过" : "\n存在失败项");
process.exit(all ? 0 : 1);
