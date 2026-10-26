// ============================================================
//  sgz_simazhao · 技能 AI（本文件的 AI 是**唯一来源**）
//  ⚠ 角色文件里只写 `ai: AI.<技能id>`；子技能用注册后的完整 id（`父技能_子技能`）。
//  ⚠ 这里只放**纯 AI 数据/函数**（引擎直接读 `lib.skill[id].ai`），不要有副作用。
// ============================================================
export default {
    sgz_wowei_xsha: {
        respondSha: true,
        // 告知 AI：我有这些牌，可以用来响应
        skillTagFilter: function(player, tag) {
            if (tag == 'respondSha') {
                return player.countCards('hs', 'binglinchengxiax') > 0;
            }
        },
        order: 15,
        result: { player: 1 }
    },
    sgz_maiyao: { threaten: 6 },
    sgz_yazhou: {
        order: 1,
        result: {
            player: function(player) {
                // 敌人上限总和远高于司马昭时发动
                var enemyMax = 0;
                game.countPlayer(p => {
                    if (get.attitude(player, p) < 0) enemyMax += (p.maxHp - player.maxHp + 1);
                });
                return enemyMax > 3 ? 1 : 0;
            }
        }
    },
    sgz_tunyue: {
        directHit_ai: true,
        fireAttack: true
    },
};

// ---- 其它 AI 逻辑（不是技能的 `ai` 表，但只给 AI 用）----
//    · `check`：视为技「用哪张牌 / 要不要发动」的 AI 判定；
//    · `aiValue` / `aiOrder` / `aiUseful`：引擎 mod 钩子（get/index.js:6219/6285/6404），只影响 AI 估价。
export const helpers = {
    sgz_wowei_xsha_check: function(card) { return 1; },
};

// ---- 内联 AI 索引（角色文件里仍**直接写着**的 `.set("ai", …)`；数量由 check_ai_centralized 对账）----
//   ⚠ 这些多是「一行式闭包、依赖技能局部变量」的判定，搬出去要给每个调用点补参数，所以先留原地、只登记；
//     其中少数（如缚渊的 `fuyuanAi`）其实已经转交给 helpers，只是调用点还写着。
//   合计 3 处：sgz_wowei_cancel 1、sgz_xietian_biaoji 1、sgz_futao 1

// ============================================================
//  AI 逻辑说明（纯注释，不参与运行）
// ------------------------------------------------------------
//  【sgz_wowei_xsha】斡维的转化子技能（把【兵临城下】当【杀】）
//    · `respondSha: true` + `skillTagFilter`：只有手里真有 `binglinchengxiax` 才把它当"有无杀"。
//    · order 15、`result.player` 1：出牌阶段也愿意主动用。
//  【sgz_maiyao】埋曜：只有 `threaten: 6`（威慑偏高，别人更想先打它）。
//  【sgz_yazhou】压昼：order 1（很靠后）；`result.player`：
//    统计"每个敌人的 上限 - 我的上限 + 1"之和，>3 才返回 1 ⇒ 只有对面普遍比自己肉时才点。
//  【sgz_tunyue】吞月：`directHit_ai: true`（强中）、`fireAttack: true`（可造成火伤）。
//  短板：全文件没有 effect，也没有按目标血量/威胁排序的逻辑（除 yazhou 的总量判断）。
// ============================================================
