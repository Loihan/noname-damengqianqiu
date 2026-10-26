// ============================================================
//  shj_nvwa · 技能 AI（本文件的 AI 是**唯一来源**）
//  ⚠ 角色文件里只写 `ai: AI.<技能id>`；子技能用注册后的完整 id（`父技能_子技能`）。
//  ⚠ 这里只放**纯 AI 数据/函数**（引擎直接读 `lib.skill[id].ai`），不要有副作用。
// ============================================================
export default {
    shj_lianshi: {
        effect: { "target_use": (card, player, target) => { if (get.type(card) == "delay") return 0.1; } },
    },
};

// ---- 其它 AI 逻辑（不是技能的 `ai` 表，但只给 AI 用）----
//    · `check`：视为技「用哪张牌 / 要不要发动」的 AI 判定；
//    · `aiValue` / `aiOrder` / `aiUseful`：引擎 mod 钩子（get/index.js:6219/6285/6404），只影响 AI 估价。
export const helpers = {
    shj_lianshi_aiOrder: function(player, card, num) {
        if (get.itemtype(card) == "card" && card.hasGaintag("eternal_wuseshi")) {
            var suits = lib.suit.slice();
            player.countCards("h", cardx => {
                if (!cardx.hasGaintag("eternal_wuseshi") || card == cardx) return;
                suits.remove(get.suit(cardx));
            });
            if (suits.length) return num + suits.length * 2.5;
        }
    },
};

// ---- 内联 AI 索引（角色文件里仍**直接写着**的 `.set("ai", …)`；数量由 check_ai_centralized 对账）----
//   ⚠ 这些多是「一行式闭包、依赖技能局部变量」的判定，搬出去要给每个调用点补参数，所以先留原地、只登记；
//     其中少数（如缚渊的 `fuyuanAi`）其实已经转交给 helpers，只是调用点还写着。
//   合计 2 处：shj_xirang 1、shj_butian 1

// ============================================================
//  AI 逻辑说明（纯注释，不参与运行）
// ------------------------------------------------------------
//  【shj_lianshi】炼石
//    · 只写了 `effect.target_use`：当"被使用的那张牌"是**延时锦囊**（`get.type==='delay'`）时返回 0.1
//      ⇒ 告诉 AI："别人对它丢延时锦囊，影响几乎可以忽略"（因此不会为了防这个去交牌/交无懈）。
//    · ⚠ 写法偏门：`target_use` 一般写在 `result` 下，这里放在 `effect` 下，
//      只在引擎「这张牌被使用时」那条链（get/index.js:6552 附近）会被读到。
//    · 除此之外没有任何 order / result / threaten ⇒ 把它当主动技时，AI 没有偏好，全看引擎默认。
// ============================================================
