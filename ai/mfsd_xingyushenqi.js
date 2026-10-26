// ============================================================
//  mfsd_xingyushenqi · 技能 AI（本文件的 AI 是**唯一来源**）
//  ⚠ 角色文件里只写 `ai: AI.<技能id>`；子技能用注册后的完整 id（`父技能_子技能`）。
//  ⚠ 这里只放**纯 AI 数据/函数**（引擎直接读 `lib.skill[id].ai`），不要有副作用。
// ============================================================
export default {
    mfsd_shisu: {
        respondSha: true,
        respondShan: true,
        save: true,
        respondWuxie: true,
        skillTagFilter: function(player, tag) {
            var storage = player.storage.mfsd_shisu;
            if (!storage) return false;
            var name;
            switch (tag) {
                case 'respondSha': name = 'sha'; break;
                case 'respondShan': name = 'shan'; break;
                case 'save': name = 'tao'; break;
                case 'respondWuxie': name = 'wuxie'; break;
            }
            if (name && storage[name] > 0) return true;
            return false;
        },
        // === AI核心逻辑2：动态优先级控制 ===
        order: function(item, player) {
            player = player || _status.event.player;
            if (!player || !player.storage || !player.storage.mfsd_shisu) return 0;

            var storage = player.storage.mfsd_shisu;
            var maxOrder = 0;
            for (var i in storage) {
                if (storage[i] > 0) {
                    var vcard = { name: i };
                    // 修正：使用 get.useful(vcard)
                    if (get.useful(vcard) > 0) {
                        var ord = get.order(vcard, player);
                        if (ord > maxOrder) maxOrder = ord;
                    }
                }
            }
            return maxOrder > 0 ? maxOrder - 0.01 : 0;
        },
        result: {
            player: function(player) {
                // 只有当时溯里有“当前有使用价值”的牌时，AI才会有发动欲望
                var storage = player.storage.mfsd_shisu;
                for (var i in storage) {
                    if (storage[i] > 0 && player.getUseValue({ name: i }) > 0) return 1;
                }
                return 0;
            }
        }
    },
    // ⚠ 原角色文件里这个技能写了**两份 ai**：下面这份（先写的）被后写的整份覆盖、**从未生效**，
    //   保留备查；要启用请先与上面那份合并，并确认不会盖掉它的键。
    //   ai:{threaten:999, },
    mfsd_chuangjie: {
        order: 12, // 高优先级（低于崩界13）
        result: { player: 1 }
    },
    mfsd_dunjie: {
        order: 10,
        result: {
            player: function(player) {
                // 逻辑：如果本回合发过创/穹/绝，就不发动
                if (player.hasHistory('useSkill', function(evt){
                    return ['mfsd_chuangjie', 'mfsd_qiongjie', 'mfsd_juejie'].contains(evt.skill);
                })) return 0;
                return 1;
            }
        }
    },
    mfsd_qiongjie: {
        order: 9,
        result: {
            player: function(player) {
                // 逻辑：如果本回合发过创/盾/绝，就不发动
                if (player.hasHistory('useSkill', function(evt){
                    return ['mfsd_chuangjie', 'mfsd_dunjie', 'mfsd_juejie'].contains(evt.skill);
                })) return 0;
                return 1;
            }
        }
    },
    mfsd_panjie: {expose: 1,},
    mfsd_nuojie: {
        order: 13, // 最高优先级
        result: {
            player: function(player) {
                // 逻辑：只有同时拥有诺、谎才发动
                if (player.hasSkill('mfsd_nuojie') && player.hasSkill('mfsd_huangjie')) return 1;
                return 0;
            }
        }
    },
    mfsd_juejie: {
        order: 11, // 优先级低于创界12
        result: {
            target: function(player, target) {
                // 逻辑：对敌人使用
                if (get.attitude(player, target) <= 0) return -1;
                return 0;
            }
        }
    },
    // ⚠ 原角色文件里这个技能写了**两份 ai**：下面这份（先写的）被后写的整份覆盖、**从未生效**，
    //   保留备查；要启用请先与上面那份合并，并确认不会盖掉它的键。
    //   ai:{expose: 1.0,},
    mfsd_bengjie: {
        expose: 1,
        threaten: 100,
        order: 14, // 高于创界12
        result: {
            target: function(player, target) {
                if (get.attitude(player, target) > 0) return 0;
                // 逻辑：对威胁度最高的敌人（通过增加权重实现）
                return -20 - (get.threaten(target) || 1);
            }
        }
    },
    mfsd_huangjie: {
        order: 13, // 同诺界最高
        result: {
            player: function(player) {
                // 逻辑：只有同时拥有诺、谎才发动
                if (player.hasSkill('mfsd_nuojie') && player.hasSkill('mfsd_huangjie')) return 1;
                return 0;
            }
        }
    },
};

// ---- 内联 AI 索引（角色文件里仍**直接写着**的 `.set("ai", …)`；数量由 check_ai_centralized 对账）----
//   ⚠ 这些多是「一行式闭包、依赖技能局部变量」的判定，搬出去要给每个调用点补参数，所以先留原地、只登记；
//     其中少数（如缚渊的 `fuyuanAi`）其实已经转交给 helpers，只是调用点还写着。
//   合计 3 处：mfsd_xingjie 2、mfsd_panjie 1

// ============================================================
//  AI 逻辑说明（纯注释，不参与运行）
// ------------------------------------------------------------
//  整体：这是本包**最精细的一套 AI**——有响应标签过滤、有按"界"的动态优先级。
//  【mfsd_shisu】时溯（把记录过的牌当任意牌用的转化技）
//    · 标签：`respondSha` / `respondShan` / `save` / `respondWuxie` + `skillTagFilter`：
//      按 tag 查 `player.storage.mfsd_shisu` 里有没有对应的牌（sha/shan/tao/wuxie），有才算"能响应"。
//    · order 函数：遍历记录里"有使用价值"的牌，取其中**最高 order - 0.01**
//      ⇒ 永远比"直接出那张牌"略低一点（先考虑真牌，再考虑转化）。
//    · `result.player`：记录里存在"当前有用"的牌才 1，否则 0。
//    · ⚠ 原文件里另有一份 `ai:{threaten:999}` 被整份覆盖、从未生效（见上方注释）——
//      也就是说它现在**威慑是默认值**，并不是 999。
//  【mfsd_chuangjie】创界：order 12（低于崩界 14、诺界 13）、`result.player` 1。
//  【mfsd_dunjie】盾界：order 10；`result.player`：本回合已经发动过 创/穹/绝 界 → 0（不重复），否则 1。
//  【mfsd_qiongjie】穹界：order 9；同上，已发动 创/盾/绝 → 0。
//  【mfsd_panjie】叛界：只有 `expose: 1`。
//  【mfsd_nuojie】诺界：order 13；`result.player`：同时拥有诺界+谎界才 1（配合技）。
//  【mfsd_juejie】绝界：order 11；`result.target` 敌人 -1。
//  【mfsd_bengjie】崩界：`expose: 1`、`threaten: 100`（威慑极高）、order 14（最高）；
//    `result.target`：友方 0；敌人 `-20 - get.threaten(target)`（强力优先打最强的）。
//    ⚠ 另有一份 `{expose:1.0}` 被覆盖。
//  【mfsd_huangjie】谎界：order 13；`result.player`：同时拥有诺界+谎界才 1。
//  短板：所有"界"都只按"本回合有没有用过别的界"排序，不看任何目标状态；
//    `threaten: 100` / `999` 这类极端值会影响别人对它的判断，改动前要谨慎。
// ============================================================
