// ============================================================
//  sgz_zhonghui · 技能 AI（本文件的 AI 是**唯一来源**）
//  ⚠ 角色文件里只写 `ai: AI.<技能id>`；子技能用注册后的完整 id（`父技能_子技能`）。
//  ⚠ 这里只放**纯 AI 数据/函数**（引擎直接读 `lib.skill[id].ai`），不要有副作用。
// ============================================================

// === 觊天 AI 公共策略：濒死时是否发动【觊天】把 ♥/♠ 当【桃】救人 ===
// 1. 濒死的是自己 → 一定救
// 2. 自己是忠臣、濒死的是主公 → 一定救（身份局判定，用身份而非态度）
// 3. 其余队友（态度为正）→ 权标记 >= 3 才救
// ⚠ 这个函数**只给 AI 用**，所以从角色文件搬到了这里（2026 搬运 AI 时发现它被遗留成跨文件引用）。
function sgz_jitian_save(player, target) {
    if (player == target) return 1;
    if (player.identity == "zhong" && (target.isZhu || target == game.zhu)) return 1;
    if (get.attitude(player, target) > 0) {
        return player.countMark('sgz_quanhuan') >= 3 ? 1 : 0;
    }
    return 0;
}

// === 矫诏 AI：允许主动发动的时机白名单 ===
//  需求（2026）：
//    · 出牌阶段**最低优先级**使用 —— "出牌出到不能出了才主动使用"；
//    · 若自己**被【乐不思蜀】**，判定阶段也要主动用（造【无懈可击】把自己的乐拆了，
//      否则判定不中♥就得跳过整个出牌阶段，损失更大）；
//    · **其余时候 AI 一律不主动用**（别人回合、被要求出杀/闪/无懈响应别人等）。
function sgz_jiaozhao_aiAllowed(player) {
    if (!player) player = _status.event && _status.event.player;
    if (!player) return false;
    const evt = _status.event;
    if (!evt || typeof evt.getParent !== "function") return false;
    // ⚠ 必须**沿父事件链向上爬**（不能只看 `getParent()` 这一层）：
    //   真正问"要不要发动"的时候，`_status.event` 已经是**子事件**了 ——
    //   · 选牌阶段：`chooseToUse`（它的 parent 才是 `phaseUse`）；
    //   · 选锦囊（chooseButton）阶段：`chooseButton` → `chooseToUse` → `phaseUse`；
    //   上一版只看一层，于是选锦囊那一步一律被判成"不在出牌阶段" → `check` 返回 0
    //   → 一个锦囊都选不出来 → AI 永远不会发动。这是本次"还是不会用"的直接原因。
    let cur = evt;
    for (let i = 0; i < 12 && cur && typeof cur.getParent === "function"; i++) {
        let parent = null;
        try {
            parent = cur.getParent();
        } catch (e) {
            parent = null;
        }
        if (!parent || parent === cur) break;
        if (parent.name === "phaseUse") return true;
        cur = parent;
    }
    // ② 自己被乐 + 轮到自己 ⇒ 判定阶段拆乐（此时没有 phaseUse 祖先，靠这一条放行）
    if (_status.currentPhase !== player) return false;
    if (typeof player.hasJudge === "function" && player.hasJudge("lebu")) return true;
    return false;
}

/// 是否正处于"被乐、要靠【矫诏】造无懈救自己"的窗口（chooseButton.check 用它给无懈打高分）
function sgz_jiaozhao_shouldWuxieSelf(player) {
    if (!player) player = _status.event && _status.event.player;
    if (!player) return false;
    if (_status.currentPhase !== player) return false;
    return !!(typeof player.hasJudge === "function" && player.hasJudge("lebu"));
}

export default {
    sgz_quanhuan: {
        noh: true,
        nogain: true,
        freeSha: true,
        freeShan: true,
        maixie: false,
    },
    sgz_jiaozhao: {
        // ⚠⚠ `order` 决定「出牌阶段先出什么」：引擎按 `get.order` 从**大到小**挑候选
        //    （player.js:5414 `next.ai1 = get.cacheOrder` → ai/basic.js:chooseCard 取最大值；
        //      真牌/真技能的 order 在 2~10 之间，见 card/standard.js、character/*/skill.js）。
        //    ⇒ 0.1 低于所有真牌 ⇒ **只有"能出的牌都出完了"才轮到他主动发动【矫诏】**（需求）。
        //    ⚠ 但必须 **> 0**：chooseCard 在 `check() <= 0` 时会直接放弃这次使用。
        order: 0.1,
        expose: 1,
        threaten: 1.2,
        // ⚠⚠ 少了这个 `result`，`get.effect_use("sgz_jiaozhao")` 恒为 0 →
        //    AI 永远判定"不值"，于是**从不发动**（这就是"不会发动主动技能矫诏"的根因）。
        //    写法与同类视为技一致（梦孙寒华【妙剑】④ 也是 `result: { player: 1 }`）。
        //
        //    `result.player` 支持传函数（get/index.js:6721-6723，签名 (player, target, card)），
        //    所以**发动时机**完全由下面的白名单控制：
        //      ① 出牌阶段主循环（父事件名 `phaseUse`）→ 允许，但 order 0.1 排最后；
        //      ② 自己被【乐不思蜀】且正在判定阶段 → 允许（造【无懈可击】拆掉自己的乐，
        //         否则整个出牌阶段会被跳过）；
        //      ③ 其余一切时机（别人回合、响应别人的杀/闪/无懈、自己回合的非判定窗口）→ **不允许**。
        result: {
            player: function (player, target, card) {
                return sgz_jiaozhao_aiAllowed(player) ? 1 : 0;
            },
        },
    },
    sgz_jitian: {
        order: 0.5,
        save:true,
        result: {
            // target_use：effect_use 评估入口（濒死时决定是否值得救，非濒死沿用桃原有逻辑）
            target_use: function(player, target, card) {
                var evt = _status.event;
                if (evt && evt.dying && evt.dying == target) {
                    return sgz_jitian_save(player, target);
                }
                return get.info({ name: 'tao' }).ai.result.target_use(player, target, card);
            },
            // target：get.effect 评估入口（最终决策值）
            target: function(player, target) {
                return sgz_jitian_save(player, target);
            }
        },
    },
    sgz_zhuyue: {expose: 1,},
};

// ---- 其它 AI 逻辑（不是技能的 `ai` 表，但只给 AI 用）----
//    · `check`：视为技「用哪张牌 / 要不要发动」的 AI 判定；
//    · `aiValue` / `aiOrder` / `aiUseful`：引擎 mod 钩子（get/index.js:6219/6285/6404），只影响 AI 估价。
export const helpers = {
    sgz_quanhuan_aiValue: function(player, card, num) {
        if (card.name == 'zhuge') return 1000;     // 连弩：神器
        if (card.name == 'guanshi') return 900;
        if (card.name == 'qinglong') return 200;
        if (get.type(card) == 'equip') return 150;
        return num * 0.4;
    },
    sgz_quanhuan_aiUseful: function(player, card, num) {
        if (card.name == 'zhuge') return 1000;
        // 锦囊牌即便在常规判定中收益为负（如五谷救了敌人），在这里也被视为绝对有用
        if (get.type(card) == 'trick') return 150;
        if (card.name == 'jiu') return 4;
        return num * 2;
    },
    sgz_quanhuan_aiOrder: function(player, card, num) {
        if (num > 0) {return num; }
        if (card.name === "zhuge" && player.getCardUsable("sha", true) < 6) {
            return 1;
        }
        if (card.name === "guanshi" && player.getCardUsable("sha", true) < 6) {
            return 2;
        }
        if (card.name === "qinglong" && player.getCardUsable("sha", true) < 6) {
            return 3;
        }
    },
    sgz_jitian_check(card) {
        // 濒死救人（任何人濒死）时：无条件愿意消耗任何♥/♠牌，具体救不救由 result.target/target_use 决定
        var evt = _status.event;
        if (evt && evt.dying) return 12;
        return 9 - get.value(card);
    },
    /**
     * 【矫诏】发动时「你可以弃置任意数量的牌」那一步的 AI 打分。
     *
     * 需求：**优先把手牌全弃掉**。
     * 理由（本武将的机制）：【权患·数】持续维持「手牌数 == 权数」，手牌不够会摸、多了会被强制弃；
     * 所以把手牌全弃掉之后，钩子会立刻把牌补回到「权」数 → 等于**免费换一次手牌**。
     *
     * ⚠ 打分机制：`chooseToDiscard('he', [0, Infinity], …)` 的上限是 Infinity，
     *   引擎会一张张挑「check 最大」的牌，直到没有正分牌为止（ai/basic.js:chooseCard）。
     *   ⇒ 手牌给 10（一定选），装备给 0（不选，也不会拖低总分）。
     */
    sgz_jiaozhao_discardScore(player, card) {
        if (!player || !card) return 0;
        const hand = player.getCards("h");
        if (Array.isArray(hand) && hand.includes(card)) return 10;
        return 0;
    },
    /** 【矫诏】AI 允许主动发动的时机（角色文件的 chooseButton.check 用它把非白名单时机全部否掉） */
    sgz_jiaozhao_aiAllowed(player) {
        return sgz_jiaozhao_aiAllowed(player);
    },
    /** 是否处于"被乐、要用矫诏造无懈救自己"的判定阶段窗口 */
    sgz_jiaozhao_shouldWuxieSelf(player) {
        return sgz_jiaozhao_shouldWuxieSelf(player);
    },
};

// ---- 内联 AI 索引（角色文件里仍**直接写着**的 `.set("ai", …)`；数量由 check_ai_centralized 对账）----
//   ⚠ 这些多是「一行式闭包、依赖技能局部变量」的判定，搬出去要给每个调用点补参数，所以先留原地、只登记；
//     其中少数（如缚渊的 `fuyuanAi`）其实已经转交给 helpers，只是调用点还写着。
//   合计 2 处：sgz_jiaozhao 1、sgz_zhuyue 1

// ============================================================
//  AI 逻辑说明（纯注释，不参与运行）
// ------------------------------------------------------------
//  【sgz_quanhuan】权患：`noh` / `nogain` / `freeSha` / `freeShan` +
//    `maixie: false`（明确告诉 AI"这不是卖血技"，别指望靠挨打赚）。
//  【sgz_jiaozhao】矫诏：order **0.1** —— 所有真牌/真技能的 order 都在 2~10（引擎按 order 从大到小挑），
//    所以它是"**出牌出到不能出了才主动用**"；`result.player` 是函数，把发动时机卡成白名单：
//      ① 出牌阶段主循环（父事件 `phaseUse`）→ 允许（但排最后）；
//      ② 自己被【乐不思蜀】+ 轮到自己 → 允许（判定阶段造【无懈可击】拆乐，保住出牌阶段）；
//      ③ 其余一切时机 → **不允许**（别人回合 / 响应别人的杀·闪·无懈）。
//    弃牌那一步走 `helpers.sgz_jiaozhao_discardScore`：**手牌全弃**（弃光后【权患·数】补回"权"数
//    ⇒ 等于免费换一手牌），装备牌不弃。
//  【sgz_jitian】觊天：order 0.5（更靠后）；`save: true`（濒死求桃时可能拿它当【桃】）；
//    `result.target_use` / `result.target` 都调本文件的 `sgz_jitian_save`：
//      · 濒死的是自己 → 必救；自己是忠臣且濒死的是主公 → 必救；
//      · 其他队友（态度>0）→ 只有"权"标记 >= 3 才救；其余不救。
//    · ⚠ `save: true` 没配 `skillTagFilter` ⇒ 引擎会打"疑似忘给 …ai.save 加 skillTagFilter"的警告，
//      而且会被当成"随时能救任何人"（判断虽然由 result 兜住，但早期筛选会偏乐观）。
//  【sgz_zhuyue】逐月：只有 `expose: 1`。
//  另：权患/矫诏/逐月 都没有 order-收益层面的精细取舍，属于"能点亮就行"级别。
// ============================================================
