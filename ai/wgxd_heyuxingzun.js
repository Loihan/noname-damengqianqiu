// ============================================================
//  wgxd_heyuxingzun · 技能 AI（本文件的 AI 是**唯一来源**）
//  ⚠ 角色文件里只写 `ai: AI.<技能id>`；子技能用注册后的完整 id（`父技能_子技能`）。
//  ⚠ 这里只放**纯 AI 数据/函数**（引擎直接读 `lib.skill[id].ai`），不要有副作用。
// ============================================================
export default {
    wgxd_qixia: {
        maixie: true,
        effect: {
            target: function(card, player, target) {
                // 如果“剑”还没满，受到伤害是有收益的（换取标记和摸牌）
                if (get.tag(card, 'damage') && target.countCards('h', i => i.hasGaintag('wgxd_qixia_jian')) < 3) {
                    return [1, 2];
                }
                if (get.tag(card, 'damage') && target.countCards('h', i => i.hasGaintag('wgxd_qixia_jian')) >= 3) {
                    return [1, 1];
                }
            }
        }
    },
};

// ---- 其它 AI 逻辑（不是技能的 `ai` 表，但只给 AI 用）----
//    · `check`：视为技「用哪张牌 / 要不要发动」的 AI 判定；
//    · `aiValue` / `aiOrder` / `aiUseful`：引擎 mod 钩子（get/index.js:6219/6285/6404），只影响 AI 估价。
export const helpers = {
    wgxd_qixia_aiOrder: function(player, card, num) {
        // 修复点：增加安全性检查，防止对非对象或非实体牌操作
        if (typeof card == 'object' && card.gaintag && card.gaintag.contains('wgxd_qixia_jian')) {
            return num + 50;
        }
    },
    wgxd_qixia_aiValue: function(player, card, num) {
        // 修复点：使用底层包含判断
        if (typeof card == 'object' && card.gaintag && card.gaintag.contains('wgxd_qixia_jian')) {
            return 0.1;
        }
    },
};

// ---- 内联 AI 索引（角色文件里仍**直接写着**的 `.set("ai", …)`；数量由 check_ai_centralized 对账）----
//   ⚠ 这些多是「一行式闭包、依赖技能局部变量」的判定，搬出去要给每个调用点补参数，所以先留原地、只登记；
//     其中少数（如缚渊的 `fuyuanAi`）其实已经转交给 helpers，只是调用点还写着。
//   合计 1 处：wgxd_qixia 1

// ============================================================
//  AI 逻辑说明（纯注释，不参与运行）
// ------------------------------------------------------------
//  【wgxd_qixia】启匣：`maixie: true`（卖血技）+ `effect.target`：
//    · 受伤时手里带 `wgxd_qixia_jian` 标签的牌 < 3 张 → [1,2]（挨打换"剑"和摸牌，赚）；
//    · 已经 >= 3 张 → [1,1]（仍然略赚，但不如之前）。
//    · 短板：没有 order / result ⇒ 只影响"别人打它时怎么算"，不影响自己出牌；
//      也不看自己血量（1 血时仍然觉得挨打赚）。
// ============================================================
