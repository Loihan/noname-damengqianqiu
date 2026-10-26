// ============================================================
//  sgz_huangyueying · 技能 AI（本文件的 AI 是**唯一来源**）
//  ⚠ 角色文件里只写 `ai: AI.<技能id>`；子技能用注册后的完整 id（`父技能_子技能`）。
//  ⚠ 这里只放**纯 AI 数据/函数**（引擎直接读 `lib.skill[id].ai`），不要有副作用。
// ============================================================
export default {
    sgz_xuanhe: {
        fireAttack: true,
    },
    sgz_changming: {
        // 需求：优先级 order: -3（卜算是纯收益动作，压低它在「使用技能」排序里的位置）
        order: 4,
        // 按扩展约定：每次动 AI 都要带 expose / threaten（threaten 是倍率，1.0~2.5）
        expose: 0.3,
        threaten: 1.2,
        guanxing: true, // 可观星
    },
    sgz_qimeng: {
        // 靠「受伤后强制转化」赚节奏，AI 视为卖血技
        maixie: true,
        effect: {
            target: function(card, player, target) {
                // 血量 >= 3 时挨打还能接受（换来一次集巧生烟）
                if (get.tag(card, 'damage') && target.hp >= 3) return [1, 2];
            },
        },
    },
};

// ---- 其它 AI 逻辑（不是技能的 `ai` 表，但只给 AI 用）----
//    · `aiValue` / `aiUseful`：引擎 mod 钩子，只影响 AI 估价。
export const helpers = {
    // 锦囊对璇和是「双倍收益」的载体（摸牌 + 花色效果），AI 应高看一眼
    sgz_xuanhe_aiUseful: function (player, card, num) {
        if (get.type(card) == 'trick') return 100;
    },
    sgz_xuanhe_aiValue: function (player, card, num) {
        if (get.type(card) == 'trick') return 50;
    },
};

// ---- 内联 AI 索引（角色文件里仍**直接写着**的 `.set("ai", …)`；数量由 check_ai_centralized 对账）----
//   合计 2 处：sgz_xuanhe 2（♦️ 选目标 / ♠️ 选目标）

// ============================================================
//  AI 逻辑说明（纯注释，不参与运行）
// ------------------------------------------------------------
//  【sgz_xuanhe】璇和：`fireAttack: true`；锦囊牌的 useful/value 被抬高（花色效果是白赚的）。
//  【sgz_changming】长明：`guanxing: true`（会观星，AI 按能控顶计算）。
//  【sgz_qimeng】绮梦：`maixie: true` + `effect.target`：体力 >= 3 时把挨打算作可接受（[1,2]）。
// ============================================================
