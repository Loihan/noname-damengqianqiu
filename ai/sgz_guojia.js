// ============================================================
//  sgz_guojia · 技能 AI（本文件的 AI 是**唯一来源**）
//  ⚠ 角色文件里只写 `ai: AI.<技能id>`；子技能用注册后的完整 id（`父技能_子技能`）。
//  ⚠ 这里只放**纯 AI 数据/函数**（引擎直接读 `lib.skill[id].ai`），不要有副作用。
// ============================================================
export default {
    sgz_kuitian: {
        order: function(item, player) {
            player = player || _status.event.player; // 判空重定向
            if (!player || !player.hasHistory) return 11; // 容错防止报错
            // AI 惜命逻辑：如果超次了，优先级降为 0
            const count = player.countMark("sgz_kuitian_used");
            if (count >= player.maxHp && player.maxHp <= 7) return 0;
            // 如果需要火攻自残，优先级拉到最高
            if (!player.hasHistory('damage') && player.hp > 1 && player.maxHp < 10) return 15;
            return 11;
        },
        // 开启所有锦囊响应标签
        respondWuxie: true,
        // 此函数在 AI 寻找“我有没牌出”时运行
        skillTagFilter: function(player, tag, arg) {
            const count = player.countMark("sgz_kuitian_used");
            // 仅当没超次，或上限已经 > 7（进入无限梦境）时，AI 才考虑发动
            if (count >= player.maxHp && player.maxHp <= 7) return false;
            return true;
        },
        result: {
            persevereSkill: true,
            player: function(player) {
                const count = player.countMark("sgz_kuitian_used");
                if (count >= player.maxHp && player.maxHp <= 7) return 0;
                return 1;
            }
        }
    },
    sgz_jihui: {
        maixie: true, // 标记为卖血技
        skillTagFilter: function(player, tag) {
            if (tag == 'maixie') return player.maxHp < 10;
        },
        effect: {
            // 当火攻或其他伤害来源指向梦郭嘉时
            target: function(card, player, target) {
                // 如果梦郭嘉还没发动过极慧，且受到伤害
                if (get.tag(card, 'damage') && target.maxHp < 10 && !target.hasHistory('damage')) {
                    // 返回 [系数, 增加值]
                    // 0: 抵消伤害带来的负面评估
                    // 2: 赋予 4 点正向价值评估
                    return [1, 2]; // 卖血收益封顶 [1,2]（原来是 [1,5]：把「挨一刀」算成 5 倍正收益，所有 AI 都不敢打他）
                }
            }
        },
        order: 12,
        result: { player: 1 }
    },
};

// ---- 其它 AI 逻辑（不是技能的 `ai` 表，但只给 AI 用）----
//    · `check`：视为技「用哪张牌 / 要不要发动」的 AI 判定；
//    · `aiValue` / `aiOrder` / `aiUseful`：引擎 mod 钩子（get/index.js:6219/6285/6404），只影响 AI 估价。
export const helpers = {
    sgz_guanxu_aocai_aiOrder(player, card, num) { if (card?.hasGaintag?.("sgz_guanxu")) return num + 0.1; },
};

// ---- 内联 AI 索引（角色文件里仍**直接写着**的 `.set("ai", …)`；数量由 check_ai_centralized 对账）----
//   ⚠ 这些多是「一行式闭包、依赖技能局部变量」的判定，搬出去要给每个调用点补参数，所以先留原地、只登记；
//     其中少数（如缚渊的 `fuyuanAi`）其实已经转交给 helpers，只是调用点还写着。
//   合计 0 处（对应角色文件里已经没有内联 AI 了）

// ============================================================
//  AI 逻辑说明（纯注释，不参与运行）
// ------------------------------------------------------------
//  【sgz_kuitian】窥天（把牌当锦囊用的转化技，可自伤）
//    · order 函数：① 用满次数（`sgz_kuitian_used >= maxHp` 且上限<=7）→ 0（不再点）；
//      ② 本回合还没造成过伤害、体力>1、上限<10 → 15（把"火攻自己"排在很前面）；
//      ③ 其余 11。
//    · `respondWuxie: true` + `skillTagFilter`：只有没超次（或上限>7 的无限梦境阶段）
//      才把它当成"我有无懈"。
//    · `result.player`：同样"超次就 0，否则 1"。
//    · ⚠ `result.persevereSkill` 是无意义键（同焚灭）。
//    · 短板：`order` 里会读 `_status.event` 并做多次判断，逻辑集中在"要不要自伤"，
//      完全不看对手手牌数与场上威胁。
//  【sgz_jihui】极慧
//    · `maixie: true` + `skillTagFilter`：只有体力上限<10 时才允许被当成卖血技。
//    · `effect.target`：受到伤害、上限<10、且**本回合还没受过伤** → [1,5]
//      （"这次挨打能拿到大收益"）；受过伤了就回默认（开始躲）。
//    · order 12、`result.player` 1：出牌阶段也会主动点。
// ============================================================
