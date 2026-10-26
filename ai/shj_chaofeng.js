// ============================================================
//  shj_chaofeng · 技能 AI（本文件的 AI 是**唯一来源**）
//  ⚠ 角色文件里只写 `ai: AI.<技能id>`；子技能用注册后的完整 id（`父技能_子技能`）。
//  ⚠ 这里只放**纯 AI 数据/函数**（引擎直接读 `lib.skill[id].ai`），不要有副作用。
// ============================================================
export default {
    shj_jingyue: {
        directHit_ai: true,
        fireAttack: true, // 可造成火属性伤害
        jiuOther: true, // 可响应【酒】
        thunderAttack: true, // 可造成雷属性伤害
        // === 核心 AI 修正：动态优先级阶梯 ===
        order: function(item, player) {
            // 有红牌：惊跃(35) > 裂影(21)
            if (player.hasCard(c => get.color(c) == 'red', 'hes')) return 35;
            // 没红牌：裂影(21) > 惊跃(20)
            if (!player.storage.shj_jingyue_thunder_used && player.hasCard(c => get.color(c) == 'black', 'hes')) return 20;
            return 1;
        },
        result: {
            player: function(player) {
                if (player.hasCard(c => get.color(c) == 'red', 'hes')) return 10;
                if (!player.storage.shj_jingyue_thunder_used && player.hasCard(c => get.color(c) == 'black', 'hes')) return 5;
                return 0;
            }
        },
        // === 核心 AI 修正：选牌偏好 (红 > 黑) ===
        check: function(card) {
            var player = _status.event.player;
            var color = get.color(card);
            // 逻辑：只要手里还有红牌，黑牌评分直接给 -100 (绝对不选)
            if (player.hasCard(c => get.color(c) == 'red', 'hes')) {
                return (color == 'red') ? (150 - get.value(card)) : -100;
            }
            // 没红牌了，黑牌才亮起
            return (color == 'black') ? (100 - get.value(card)) : 0;
        }
    },
    shj_lieying: {
        // 优先级 21，精准卡在红(35)之后，黑(20)之前
        order: 21,
        result: {
            player: function(player) {
                // 确保 AI 认为在出黑杀前开裂影是正收益
                if (!player.hasCard(c => get.color(c) == 'red', 'hes') && player.hasCard(c => get.color(c) == 'black', 'hes')) return 1;
                return 0;
            }
        }
    },
};

// ---- 其它 AI 逻辑（不是技能的 `ai` 表，但只给 AI 用）----
//    · `check`：视为技「用哪张牌 / 要不要发动」的 AI 判定；
//    · `aiValue` / `aiOrder` / `aiUseful`：引擎 mod 钩子（get/index.js:6219/6285/6404），只影响 AI 估价。
export const helpers = {
    shj_jingyue_aiOrder: function(player, card, num) {
        // 如果是真实卡牌(非转化)且是杀或锦囊
        if (typeof card == 'object' && !card.isSkill
            && (card.name == 'sha' || get.type(card) == 'trick' )
            ) {
            // 只要惊跃还能发动(有红或有黑且未用)，就给原牌打负分，逼 AI 点技能按钮
            if (player.hasCard(c => get.color(c) == 'red' || (get.color(c) == 'black' && !player.storage.shj_jingyue_thunder_used), 'hes')) {
                return num - 50;
            }
        }
        return num;
    },
    shj_lieying_aiOrder: function(player, card, num) {
        if(card.name == 'jiu'&& card.color == 'black' && player.countCards("h") > 1
            && !player.hasCard(c => get.color(c) == 'red')
            && player.hasCard(c => get.color(c) == 'black')
            && !player.storage.shj_jingyue_thunder_used
    ) return 9999;
    },
};

// ---- 内联 AI 索引（角色文件里仍**直接写着**的 `.set("ai", …)`；数量由 check_ai_centralized 对账）----
//   ⚠ 这些多是「一行式闭包、依赖技能局部变量」的判定，搬出去要给每个调用点补参数，所以先留原地、只登记；
//     其中少数（如缚渊的 `fuyuanAi`）其实已经转交给 helpers，只是调用点还写着。
//   合计 2 处：shj_lieying 1、shj_linxu 1

// ============================================================
//  AI 逻辑说明（纯注释，不参与运行）
// ------------------------------------------------------------
//  【shj_jingyue】惊跃（红/黑牌 → 火/雷杀，与裂影抢节奏）
//    · 标签：`directHit_ai`（强中）/ `fireAttack` / `thunderAttack` / `jiuOther`（可响应酒）。
//    · order 函数：有红牌 → 35（压过裂影的 21）；没红牌但黑牌还没用雷 → 20（低于裂影 21）；
//      否则 1。
//    · `result.player`：红 10 / 黑（雷未用）5 / 否则 0。
//    · `check`（选中哪张牌来转化）：只要手里还有红牌，黑牌一律 -100（**绝对不选**），
//      红牌按 `150 - 价值` 排序（越便宜越选）；没有红牌了才给黑牌 `100 - 价值`。
//    · 短板：`check` 里用 `hes`（手牌+装备）找红牌，但技能本身只吃手牌 —— 装备区的红牌会让
//      AI 误以为"还有红牌"，从而把手里所有黑牌判成 -100，可能**卡住不发动**。
//  【shj_lieying】裂影：order 21（刻意卡在"红牌惊跃 35"之后、"黑牌惊跃 20"之前）；
//    `result.player`：没红牌且有黑牌时 1（先开裂影再出黑杀）。
// ============================================================
