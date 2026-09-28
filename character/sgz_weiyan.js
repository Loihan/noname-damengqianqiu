// =====================================================
// 梦魏延 —— 壮誓 / 竭伐（觉醒·竭燃） / 破扼 / 檄残
//
// 素材约定（配音待补，路径已按本包规范预置）：
//   image/sgz_weiyan.jpg                  武将图（未觉醒）
//   image/sgz_weiyan2.jpg                 武将图（竭伐觉醒后）
//   image/sgz_weiyan_zhuangshi_bg.svg     壮誓选择框底板（玄铁血誓）
//   image/sgz_weiyan_fangu.svg            壮誓选择框徽记（反骨断刃）
//   animation/shiweiyan/                  骨骼素材（已从无名美化移植进本包）
//     SS_SWY_tongchang.*                  壮誓 · 觉醒前（通常形态）
//     SS_SWY_yinzhan.*                    壮誓 · 觉醒后（引战形态）
//     SS_ShiWeiYanSkill.*                 竭伐觉醒 · 使命成功演出
//     （红眼素材未使用，已移出到 animation/_unused_backup/）
//   audio/sgz_weiyan/texiao/wushengTX.mp3         壮誓 音效（已移植）
//   audio/sgz_weiyan/texiao/effect_yinzhanBGM.mp3 觉醒 BGM（已移植）
//   audio/sgz_weiyan/sgz_zhuangshi1..6.mp3
//   audio/sgz_weiyan/sgz_jiefa1..6.mp3
//   audio/sgz_weiyan/sgz_jieran1..5.mp3
//   audio/sgz_weiyan/sgz_poe1..6.mp3
//   audio/sgz_weiyan/sgz_xican1..5.mp3
//   audio/sgz_weiyan/die/die.mp3
//
// 结构说明：
//   sgz_zhuangshi      壮誓（每名角色回合开始时，可失去任意点体力并摸等量牌；
//                      选择完代价即播放骨骼特效，觉醒前后形态不同：通常形态 / 引战形态）
//   sgz_jiefa          竭伐（觉醒技·大空壳，自身不结算，只承载觉醒技展示与衍生关系）
//     ├─ hurt          ① 锁定技：当你造成的伤害结算后，你弃置一张牌（无牌可弃则跳过，不影响造成伤害）
//     └─ awaken        ② 当你杀死一名角色时：使命成功演出（骨骼 play2 + 觉醒BGM）、
//                        更换立绘为觉醒形态、获得【竭燃】、竭伐失效
//                        ⚠ 立绘改走本扩展换肤入口（skin.js 第 8c 节）：
//                          穿「狂志吞天」动皮时切成「狂志吞天2」，否则退回 sgz_weiyan2.jpg
//                          （原来这里写死了 setBackgroundImage(sgz_weiyan2.jpg)，会越过动皮体系）
//   sgz_jieran         竭燃（衍生技，觉醒后获得）：造成的伤害结算后，选择增加等量点体力上限
//                        或回复等量点体力（不限次数）；
//                        执行完可再弃置任意张牌（每回合限一次）
//   sgz_poe            破扼（空壳：audio / 触发组 / 杀牌标记的 mod 载体）
//     ├─ draw          ①出牌阶段内摸牌时：取消之，改为使用等量张【杀】；
//     │                  因壮誓摸牌则无视时机；檄残摸牌不触发
//     └─ lose          ②回合外失去牌时：视为使用等量张【杀】；
//                        因壮誓/竭燃失去牌则无视时机；竭伐造成的失去永不触发
//   sgz_poe_sha        破扼杀的标记技（charlotte 空技能，仅标记“这张杀来自破扼”）
//   sgz_xican          檄残（即将造成伤害时，按目标已损失体力/当前体力叠加效果；
//                        ③现在改为「获得其一张牌」，不再摸牌）
//     └─ sgz_xican_nohit  ④ 在成为目标时把目标写入 useCard.directHit，使其不可响应
// 约定：竭燃为衍生技，觉醒前不持有；破扼的「等量张杀」为凭空视为使用，
//       不消耗手牌中的【杀】实体牌，但每张仍需单独选择合法目标，可中途放弃。
//       破扼杀「不计入次数」由 chooseUseTarget(card, true, false) 的 addCount:false 保证，
//       「无距离限制」由 sgz_poe 的 mod.targetInRange 保证。
// =====================================================

// 壮誓 / 竭伐觉醒 的骨骼动画与音效（纯表现层，播放器不可用时静默跳过）
import { dmqcWeiyanZhuangshiEffect, dmqcWeiyanAwakenEffect, dmqcBuildWeiyanZhuangshiDialog } from "../effect/sgz_weiyan.js";

// 觉醒判定：竭伐觉醒后为 true（用于选择壮誓的特效形态 / 觉醒前后不同的语音）
function sgzWeiyanAwakened(player) {
    return !!player.storage.sgz_jiefa_awaken;
}

// =====================================================
// 壮誓的「形态」判定 —— 决定用哪一种壮誓特效（以及选择框配色 / 预览图）
//   · 穿「狂志吞天2」 → true  = 第二种（觉醒 / 引战形态，`SS_SWY_yinzhan`）
//   · 穿「狂志吞天」   → false = 第一种（通常形态，`SS_SWY_tongchang`）
//   · 没穿这两张皮     → 退回「按竭伐觉醒状态」判定
// ⚠ 按需求，形态**以皮肤为准**：这两张皮与两种形态本来就一一对应
//   （狂志吞天 = 未觉醒，狂志吞天2 = 击杀觉醒后），正常流程下两种判据结果相同；
//   但玩家手动选了其中一张时以皮肤为准 —— 例如手动穿狂志吞天2 就走引战形态。
//   皮肤骨骼路径由 skin.js 注入（`DMQC_SKIN_OVERRIDES.sgz_weiyan`）。
// ⚠ 读的是 `player.dynamic.primary.name`（**当前正在播的骨骼**），不是
//   `game.qhly_getSkin()`（那读的是存档里的选择，而自动换肤不写存档）。
// =====================================================
const SGZ_WEIYAN_KUANGZHI_SPINE = "势魏延/狂志吞天/XingXiang";
const SGZ_WEIYAN_KUANGZHI2_SPINE = "势魏延/狂志吞天2/XingXiang";
function sgzWeiyanZhuangshiWrath(player) {
    try {
        const spine = player && player.dynamic && player.dynamic.primary && player.dynamic.primary.name;
        if (spine === SGZ_WEIYAN_KUANGZHI2_SPINE) return true;
        if (spine === SGZ_WEIYAN_KUANGZHI_SPINE) return false;
    } catch (e) {
        /* 读不到立绘就退回觉醒判定 */
    }
    return sgzWeiyanAwakened(player);
}

// =====================================================
// 技能音效配置（本包规范：ext:大梦千秋/audio/sgz_weiyan/…）
//   觉醒前的语音：sgz_技能名 + 序号
//   觉醒后的语音：sgz_技能名_achieve + 序号（竭伐觉醒后自动切换）
//   竭伐击杀觉醒：sgz_jiefa_juexing + 序号（单独播放，不占常规语音位）
//   死亡：audio/sgz_weiyan/die.mp3
// 台词文本（千幻聆音用）后续自行补，这里只管音频文件。
// =====================================================
const SGZ_WEIYAN_AUDIO_DIR = "ext:大梦千秋/audio/sgz_weiyan/";

// 各技能音频文件数量（与 audio/sgz_weiyan/ 下实际文件一致）
const SGZ_WEIYAN_AUDIO_COUNT = {
    sgz_zhuangshi: { normal: 2, achieve: 2 },
    sgz_jiefa: { normal: 4, achieve: 0, juexing: 4 },
    sgz_jieran: { normal: 3, achieve: 0 },
    sgz_poe: { normal: 3, achieve: 3 },
    sgz_xican: { normal: 2, achieve: 4 },
};

// 生成音频文件列表；觉醒后优先取 _achieve 版本，没有该版本则退回普通版
function sgzWeiyanAudioList(skill, player) {
    const conf = SGZ_WEIYAN_AUDIO_COUNT[skill];
    if (!conf) {
        return [];
    }
    const awakened = !!(player && player.storage && player.storage.sgz_jiefa_awaken);
    const useAchieve = awakened && conf.achieve > 0;
    const suffix = useAchieve ? "_achieve" : "";
    const count = useAchieve ? conf.achieve : conf.normal;
    const list = [];
    for (let i = 1; i <= count; i++) {
        list.push(`${SGZ_WEIYAN_AUDIO_DIR}${skill}${suffix}${i}.mp3`);
    }
    return list;
}

// 技能 logAudio：觉醒前后自动切换语音；indexedData 指定序号则取对应那条
function sgzWeiyanLogAudio(skill) {
    return (player, indexedData) => {
        const list = sgzWeiyanAudioList(skill, player);
        if (!list.length) {
            return null;
        }
        if (typeof indexedData == "number" && indexedData > 0 && indexedData <= list.length) {
            return list[indexedData - 1];
        }
        return list;
    };
}

// 竭伐击杀觉醒的专属语音
function sgzWeiyanJuexingAudio() {
    const count = (SGZ_WEIYAN_AUDIO_COUNT.sgz_jiefa && SGZ_WEIYAN_AUDIO_COUNT.sgz_jiefa.juexing) || 0;
    if (!count) {
        return null;
    }
    return `${SGZ_WEIYAN_AUDIO_DIR}sgz_jiefa_juexing${get.rand(1, count)}.mp3`;
}


// ---- 破扼杀的目标合法性：非自己 + 合法目标 + 在范围内（无距离限制由 mod 保证） ----
function sgzPoeShaTarget(card, player, target) {
    if (!target || target == player || !target.isIn()) {
        return false;
    }
    if (!lib.filter.targetEnabled(card, player, target)) {
        return false;
    }
    return player.canUse(card, target, null, false);
}

// ---- 破扼：依次使用若干张「视为杀」，直到用完或玩家放弃 ----
// 注意1：虚拟牌必须用 player.chooseUseTarget(card, forced, addCount) 来使用。
//   give chooseToUse 传 viewAs 是无效的（chooseToUse 只认 skill 上的 viewAs），
//   而 chooseUseTarget 会走 useCard，并把 addCount:false 转成 event.addCount=false，
//   从而不消耗本回合的【杀】次数。
// 注意2：提示文字里不要传技能代码名（如 "sgz_poe"）。chooseUseTarget 的参数解析会把
//   无法识别为牌名的字符串当成提示语（get.evtprompt），最终在提示框里显示出技能代码名。
// 注意3：计数用「本回合破扼杀链」的共享账本（随回合重置）：
//   player._sgz_poe_done   —— 已出张数（分子，只增不减）
//   player._sgz_poe_total  —— 杀链当前的总上限（分母，新批次并入时变大）
//   player._sgz_poe_batches—— 尚未结算完的批次账面（用于回收没出的份额）
//   这样嵌套触发（出杀途中又摸牌取消、再出杀）时，分母会动态变大、分子只增不减，
//   呈现为 1/4、2/4、3/6、4/6、5/6、6/6 这样的连续编号，
//   而不是两段互不相干的 1/2、2/2 与 3/4、4/4。
function sgzPoeChain(player) {
    if (typeof player._sgz_poe_done != "number") {
        player._sgz_poe_done = 0;
    }
    if (typeof player._sgz_poe_total != "number") {
        player._sgz_poe_total = 0;
    }
    if (!Array.isArray(player._sgz_poe_batches)) {
        player._sgz_poe_batches = [];
    }
    return player;
}

// 进入一批：把本批张数并进杀链总上限，分母随之变大
function sgzPoeEnterBatch(player, num) {
    sgzPoeChain(player);
    const batch = { owner: {}, remain: num };
    player._sgz_poe_batches.push(batch);
    player._sgz_poe_total += num;
    return batch;
}

// 离开一批：按实情回收本批没出的张数，并清账
function sgzPoeExitBatch(player, batch) {
    const unplayed = Math.max(0, batch.remain);
    player._sgz_poe_total = Math.max(0, player._sgz_poe_total - unplayed);
    const idx = player._sgz_poe_batches.indexOf(batch);
    if (idx >= 0) {
        player._sgz_poe_batches.splice(idx, 1);
    }
    // 杀链走完（没有在跑的批次了）：清空，下一轮从头计数
    if (!player._sgz_poe_batches.length) {
        player._sgz_poe_done = 0;
        player._sgz_poe_total = 0;
    }
}

async function sgzPoeUseSha(player, num) {
    const name = get.translation("sgz_poe");
    const batch = sgzPoeEnterBatch(player, num);
    for (let i = 0; i < num; i++) {
        const card = get.autoViewAs({
            name: "sha",
            isCard: true,
            storage: { sgz_poe_sha: true },
        });
        if (!game.hasPlayer(current => sgzPoeShaTarget(card, player, current))) {
            break;
        }
        const cur = player._sgz_poe_done + 1; // 这张是杀链里的第几张
        const total = player._sgz_poe_total; // 杀链当前总上限（可能已被嵌套撑大）
        const left = total - cur + 1; // 杀链里还剩几张（含这张）
        // 先占号再询问：这样这张杀结算过程中若又嵌套触发破扼，
        // 内层看到的分子是连续的（不会慢一拍）
        player._sgz_poe_done = cur;
        const result = await player
            .chooseUseTarget(card, true, false, "nodistance")
            .set("prompt", `【${name}】本回合第 ${cur} / ${total} 张破扼【杀】（剩余 ${left} 张）`)
            //.set("prompt2", "取消可放弃本次剩余的张数")
            .forResult();
        if (!result || !result.bool) {
            // 取消：把占用的号还回去
            player._sgz_poe_done = cur - 1;
            break;
        }
        batch.remain--;
    }
    sgzPoeExitBatch(player, batch);
}

export default {
    character: {
        // 梦魏延：蜀势力，男性，4/6 分布（开局即已损失2点体力）
        sgz_weiyan: {
            sex: "male",
            group: "shu",
            hp: 4,
            maxHp: 6,
            hujia: 3,
            // 【关键】subSkill 不会自动挂到角色身上：引擎的 game.expandSkills(skills)
            // 只在显式传入 subSkill=true 时才展开子技能，而引擎没有任何地方这样调用。
            // 因此所有子技能都必须在这里显式列出，否则 lib.hook 里不会注册它们的触发时机
            // （参考本包 sgz_guanyu.js 的写法）。
            //   sgz_zhuangshi        壮誓
            //   sgz_jiefa            竭伐外壳
            //   sgz_jiefa_hurt       竭伐①（造成伤害时弃一张牌）
            //   sgz_jiefa_awaken     竭伐②（杀死角色后觉醒）
            //   sgz_poe              破扼外壳
            //   sgz_poe_draw         破扼①（摸牌改出杀）
            //   sgz_poe_lose         破扼②（失去牌后视为出杀）
            //   sgz_poe_reset        破扼计数重置（回合开始清空“本回合已出杀数”）
            //   sgz_poe_sha          破扼杀的标记技
            //   sgz_xican            檄残
            //   sgz_xican_nohit      檄残④（不可响应）
            skills: [
                "sgz_zhuangshi",
                "sgz_jiefa",
                "sgz_jiefa_hurt",
                "sgz_jiefa_awaken",
                "sgz_poe",
                "sgz_poe_draw",
                "sgz_poe_lose",
                "sgz_poe_reset",
                "sgz_poe_sha",
                "sgz_xican",
                "sgz_xican_nohit",
            ],
            img: "extension/大梦千秋/image/sgz_weiyan.jpg",
            // 死亡语音：audio/sgz_weiyan/die.mp3
            dieAudios: ["ext:大梦千秋/audio/sgz_weiyan/die.mp3"],
            names: "魏|延",
            groupInGuozhan: "shu",
            4: ["des:魏延，字文长，义阳人也。以部曲随先主入蜀，数有战功，迁牙门将军。先主拔延为督汉中镇远将军，领汉中太守，一军皆惊。延每随亮出，辄欲请兵万人，与亮异道会于潼关，如韩信故事，亮制而不许。延常谓亮为怯，叹恨己才用之不尽。<br>延善养士卒，勇猛过人，又性矜高，当时皆避下之。唯杨仪不假借延，延以为至忿，有如水火。<br>大梦之中，延以壮誓自砺，每于阵前遍观敌我气数，耗身以易筹谋；其锋一发，破扼无前，敢当其锐者皆折。及至斩将搴旗，则竭伐自焚，血气尽燃，反骨之姿遂现于军前，魏人望之皆辟易。史称其奇谋独绝，虽未竟吞魏之志，然一世之雄，终不可掩。"],
        },
    },
    characterName: "sgz_weiyan",
    characterTranslate: { sgz_weiyan: "梦魏延" },
    characterTitle: { sgz_weiyan: "竭志擎天" },
    skills: {
        // ===================== 1. 壮誓（主动）=====================
        sgz_zhuangshi: {
            // 音效：觉醒前 sgz_zhuangshi1~2，觉醒后 sgz_zhuangshi_achieve1~2
            audio:"ext:大梦千秋/audio/sgz_weiyan:4",
            persevereSkill: true,
            // 时机：每名角色的「准备阶段」（原为回合开始时）
            //   放在准备阶段可以保证：壮誓自己摸牌改出杀期间，无论摸牌还是失去牌
            //   都不会再弹破扼的转杀询问，只有壮誓摸的那些牌会触发破扼①
            trigger: { global: "phaseZhunbeiBegin" },
            filter(event, player) {
                return player.getHp() > 1;
            },
            async cost(event, trigger, player) {
                const max = player.getHp() - 1;
                const list = [];
                const choiceList = [];
                for (let i = 0; i <= max; i++) {
                    list.push(String(i));
                    if (i == 0) {
                        choiceList.push("不发动（不失去体力，也不摸牌）");
                    } else {
                        const n = get.cnNumber(i);
                        choiceList.push(`失去${n}点体力，然后摸${n}张牌`);
                    }
                }

                // 专属「血誓·反骨」选择框：仅本地人类玩家；构造失败/取消都安全回退默认框
                let control = null;
                if (player.isMine() && !game.online && !_status.auto && !_status.video) {
                    let r = null;
                    try {
                        r = await dmqcBuildWeiyanZhuangshiDialog(player, {
                            max,
                            hp: player.getHp(),
                            maxHp: player.maxHp,
                            awakened: sgzWeiyanZhuangshiWrath(player),
                            phase: trigger.player,
                        });
                    } catch (e) {
                        console.error("[大梦千秋] 壮誓选择框构造失败，回退引擎默认框：", e);
                        r = null;
                    }
                    // r 为 null 表示专属框未能建立 → 交给引擎默认框；
                    // r.bool 为 false（点了取消）等价于选择「不发动」。
                    if (r) {
                        control = r.bool && r.links && r.links.length ? String(r.links[0]) : "0";
                    }
                }
                if (control == null) {
                    control = await player
                        .chooseControl(list)
                        .set("prompt", get.prompt(event.skill))
                        .set("choiceList", choiceList)
                        .set("displayIndex", false)
                        .set("choice", "0")
                        .set("ai", () => {
                            const player = get.player();
                            if (player.hp < 2) {
                                return "0";
                            }
                            const enemies = game.countPlayer(current => get.attitude(player, current) < 0);
                            if (!enemies) {
                                return "0";
                            }
                            const num = Math.min(enemies + 1, player.hp - 1);
                            return num > 0 ? String(num) : "0";
                        })
                        .forResultControl();
                }

                const num = parseInt(control);
                const ok = !isNaN(num) && num > 0;
                if (ok) {
                    // 壮誓特效：选择完代价就立刻播放，不等技能结算完
                    // 形态**以当前皮肤为准**（狂志吞天2 → 第二种 / 引战形态）；
                    // 没穿这两张皮时退回「按竭伐觉醒状态」判定。详见 sgzWeiyanZhuangshiWrath
                    dmqcWeiyanZhuangshiEffect(sgzWeiyanZhuangshiWrath(player));
                }
                event.result = {
                    bool: ok,
                    cost_data: isNaN(num) ? 0 : num,
                };
            },
            async content(event, trigger, player) {
                const num = event.cost_data;
                if (!num) {
                    return;
                }

                // 注意：这里不能用「标记玩家正在摸牌」的时间窗写法。
                // 破扼①取消摸牌后会 await 整段逐张出杀的流程，player.draw(num) 要等
                // 那段流程跑完才 resolve；窗口期内别人让我们摸的牌会被误判成壮誓摸的牌。
                // 正确做法是把标记打在**这一个 draw 事件对象**上，破扼①只认这个标记。
                player._sgz_zhuangshi_losing = true;
                try {
                    await player.loseHp(num);
                } finally {
                    player._sgz_zhuangshi_losing = false;
                }
                const drawEvent = player.draw(num);
                drawEvent._sgz_from_zhuangshi = true;
                await drawEvent;
            },
        },

        // ===================== 2. 竭伐（觉醒技·大空壳）=====================
        // 严格按需求实现：
        //   外壳（sgz_jiefa）本身不结算，只承载“觉醒技”的展示、动画与衍生关系。
        //   子技能 hurt  —— 锁定技，①当你造成伤害时，你弃置一张牌。
        //   子技能 awaken—— ②当你杀死一名角色时，更换武将牌，获得技能【竭燃】，然后竭伐失效。
        sgz_jiefa: {
            // 音效：竭伐弃牌语音 sgz_jiefa1~4（击杀觉醒另有 sgz_jiefa_juexing1~4，见 awaken 子技能）
            audio: "ext:大梦千秋/audio/sgz_weiyan:4",
            persevereSkill: true,
            awakenSkill: true,
            skillAnimation: false,
            derivation: ["sgz_jieran"],
            // 觉醒标记初始化（比所有触发时机都早）
            init(player) {
                if (typeof player.storage.sgz_jiefa_awaken != "boolean") {
                    player.storage.sgz_jiefa_awaken = false;
                }
            },
            // group 只是双保险；真正让子技能生效的是角色 skills 数组里的显式登记
            group: ["sgz_jiefa_hurt", "sgz_jiefa_awaken"],
            // 空壳：不写 trigger / content，全部逻辑在 subSkill 内
            subSkill: {
                // ---------- ① 锁定技：当你造成的伤害结算后，你弃置一张牌 ----------
                hurt: {
                    persevereSkill: true,
                    // 时机为「伤害结算后」（damageAfter），不再与檄残争 damageBegin
                    trigger: { source: "damageAfter" },
                    forced: true,
                    popup: false,
                    filter(event, player) {
                        // 竭伐失效后不再弃牌；无牌可弃时不影响正常造成伤害
                        if (player.storage.sgz_jiefa_awaken) {
                            return false;
                        }
                        // 只有实际造成了伤害才弃牌
                        if (event.num <= 0) {
                            return false;
                        }
                        // 只需确实由你造成伤害
                        return true;
                    },
                    async content(event, trigger, player) {
                        // 无牌可弃时不影响自己正常造成伤害
                        if (player.countCards("he")) {
                            // 竭伐自己的弃牌不触发破扼的「弃牌出杀」：
                            // 用 _sgz_jiefa_discarding 标记本次弃牌，破扼的 lose 子技能据此跳过
                            player._sgz_jiefa_discarding = true;
                            try {
                                // 提示语自己 set：不要把匿名键塞进参数（否则会被引擎当提示语显示代码名）
                                await player
                                    .chooseToDiscard("he", true)
                                    .set("prompt", `【${get.translation("sgz_jiefa")}】弃置一张牌`)
                                    //.set("prompt2", "锁定技：你造成伤害后须弃置一张牌；无牌可弃则跳过");
                            } finally {
                                player._sgz_jiefa_discarding = false;
                            }
                        } else {
                            game.log(player, "发动【竭伐】时无牌可弃");
                        }
                    },
                },
                // ---------- ② 当你杀死一名角色时：换图 + 获得竭燃 + 竭伐失效 ----------
                awaken: {
                    persevereSkill: true,
                    trigger: { source: "dieAfter" },
                    forced: true,
                    popup: false,
                    filter(event, player) {
                        if (player.storage.sgz_jiefa_awaken) {
                            return false;
                        }
                        // dieAfter 时被击杀者已移入 game.dead，isAlive() 为 false
                        return !!event.player && !event.player.isAlive();
                    },
                    async content(event, trigger, player) {
                        game.playAudio(`../extension/大梦千秋/audio/sgz_weiyan/sgz_jiefa${[1,2,3,4].randomGet()}.mp3`);
                        // 1. 标记失效 + 觉醒技变灰（此后竭伐①不再生效）
                        player.storage.sgz_jiefa_awaken = true;
                        player.awakenSkill("sgz_jiefa");
                        //player.logSkill("sgz_jiefa", trigger.player);
                        // 击杀觉醒专属语音：sgz_jiefa_juexing1~4（不走 logSkill 的常规语音位）
                        const juexingAudio = sgzWeiyanJuexingAudio();
                        if (juexingAudio) {
                            game.playAudio(juexingAudio);
                        }
                        // 2. 使命成功演出：骨骼动画（play2）+ 觉醒 BGM
                        //    （与参考“势魏延·忠傲使命成功”同一套特效，素材已移植到本包）
                        dmqcWeiyanAwakenEffect();
                        // 3. 更换武将牌（觉醒形态）
                        //    ⚠ 这里**不再**直接 `setBackgroundImage('.../sgz_weiyan2.jpg')`：
                        //      那会把立绘钉成静态图、**绕过动皮体系**（梦姜维九伐、梦曹髦倾讨都踩过同样的坑）。
                        //      改走本扩展的换肤入口 → 有「狂志吞天」动皮时切成「狂志吞天2」，
                        //      没装十周年UI / 没动皮数据时**内部自动退回**原来那句静态图写法
                        //      （主、副立绘都设，和原来一致）。见 skin.js 第 8c 节。
                        if (typeof window.dmqcApplyWeiyanAwakenSkin === "function") {
                            window.dmqcApplyWeiyanAwakenSkin(player);
                        } else {
                            player.node.avatar.setBackgroundImage("extension/大梦千秋/image/sgz_weiyan2.jpg");
                            if (player.node.avatar2) {
                                player.node.avatar2.setBackgroundImage("extension/大梦千秋/image/sgz_weiyan2.jpg");
                            }
                        }
                        player.gainMaxHp();
                        player.$fullscreenpop("竭伐", "fire");
                        // 4. 获得技能竭燃
                        await player.addSkills("sgz_jieran");
                        game.log(player, "觉醒：更换武将牌并获得技能", "【竭燃】", "，竭伐失效");
                    },
                },
            },
        },
        // ===================== 3. 破扼 =====================
        sgz_poe: {
            // 音效：觉醒前 sgz_poe1~3，觉醒后 sgz_poe_achieve1~3
            audio:"ext:大梦千秋/audio/sgz_weiyan:6",
            persevereSkill: true,
            group: ["sgz_poe_draw", "sgz_poe_lose", "sgz_poe_reset"],
            mod: {
                // 破扼杀：无距离限制
                targetInRange(card, player, target) {
                    if (card && card.storage && card.storage.sgz_poe_sha) {
                        return true;
                    }
                },
                // 破扼杀：无次数限制（次数耗尽的二次保险）
                cardUsableTarget(card, player, target) {
                    if (card && card.storage && card.storage.sgz_poe_sha) {
                        return true;
                    }
                },
            },
            subSkill: {
                // ---- 摸牌时：取消之，改为使用等量张【杀】 ----
                draw: {
                    persevereSkill: true,
                    trigger: { player: "drawBegin" },
                    filter(event, player) {
                        // 基础条件：「你的出牌阶段内」摸牌。
                        //   两个判据取其一即可（并集），避免任何单点失效：
                        //   a) player._sgz_poe_phase  —— 由 sgz_poe_reset 在 phaseUseBegin/phaseUseAfter 维护，
                        //      区间精确，且能排除自己的摸牌/弃牌阶段；
                        //   b) player.isPhaseUsing()  —— 引擎自带判据（当前事件在 phaseUse 之内且当前回合是你），
                        //      作为兜底：万一阶段标记链没跑起来，出牌阶段内的摸牌仍能触发。
                        // 特例：壮誓那一次摸牌「无论时机」都可触发。标记打在 draw 事件对象上
                        //   （不能标记玩家，否则破扼出杀期间别人给的摸牌会被误判，见壮誓 content）
                        const fromZhuangshi = !!event._sgz_from_zhuangshi;
                        if (!fromZhuangshi && !player._sgz_poe_phase && !player.isPhaseUsing()) {
                            return false;
                        }
                        // 檄残造成的摸牌不触发破扼
                        // （檄残③已改为获得其一张牌、不再摸牌，此处保留作为兜底）
                        if (player._sgz_xican_drawing) {
                            return false;
                        }
                        return !!event.num && event.num > 0;
                    },
                    async cost(event, trigger, player) {
                        const num = trigger.num;
                        if (!num || num < 1) {
                            event.result = { bool: false };
                            return;
                        }
                        const bool = await player
                            .chooseBool(
                                `【${get.translation("sgz_poe")}】取消摸${get.cnNumber(num)}张牌，改为使用${get.cnNumber(num)}张无距离次数限制的【杀】`,
                                //"取消之"
                            )
                            .set("ai", () => {
                                const player = get.player();
                                if (player.hp < 2) {
                                    return false;
                                }
                                if (!game.hasPlayer(current => get.attitude(player, current) < 0)) {
                                    return false;
                                }
                                return true;
                            })
                            .forResultBool();
                        event.result = { bool: !!bool, cost_data: num };
                    },
                    async content(event, trigger, player) {
                        const num = event.cost_data;
                        if (player.hasSkill('sgz_jieran'))
                            game.playAudio(`../extension/大梦千秋/audio/sgz_weiyan/sgz_poe${[4,5,6].randomGet()}.mp3`);
                        else game.playAudio(`../extension/大梦千秋/audio/sgz_weiyan/sgz_poe${[1,2,3].randomGet()}.mp3`);
                        trigger.cancel();
                        await sgzPoeUseSha(player, num);
                    },
                },
                // ---- 失去手牌/装备牌后：视为使用等量张【杀】 ----
                lose: {
                    persevereSkill: true,
                    // 只用 loseAfter：loseAsync 的子事件本身也会派发 loseAfter，
                    // 若同时监听 loseAsyncAfter 会导致一次失去牌结算两次
                    trigger: {
                        player: "loseAfter",
                    },
                    filter(event, player) {
                        // 竭伐弃牌造成的失去，永远不触发破扼
                        if (player._sgz_jiefa_discarding) {
                            return false;
                        }
                        const evt = event.getl && event.getl(player);
                        if (!evt) {
                            return false;
                        }
                        if ((evt.hs || []).length + (evt.es || []).length <= 0) {
                            return false;
                        }
                        // 两个条件满足其一即可发动：
                        //   ① 因壮誓失去牌（无论时机）
                        //   ② 于你的回合外失去牌
                        // （因竭燃失去牌已在上面单独放行，同样无论时机）
                        // 注意：这里必须判断「当前回合是不是你」，不能用 isPhaseUsing 取反——
                        // 否则你自己的弃牌阶段/摸牌阶段也会被当成「回合外」而误触发。
                        return !!player._sgz_zhuangshi_losing || !!player._sgz_jieran_losing || _status.currentPhase != player;
                    },
                    async cost(event, trigger, player) {
                        const evt = trigger.getl(player);
                        const num = (evt.hs || []).length + (evt.es || []).length;
                        const bool = await player
                            .chooseBool(
                                get.prompt("sgz_poe", player),
                                `视为使用${get.cnNumber(num)}张无次数距离限制的【杀】`
                            )
                            .set("ai", () => {
                                const player = get.player();
                                if (!game.hasPlayer(current => get.attitude(player, current) < 0)) {
                                    return false;
                                }
                                return true;
                            })
                            .forResultBool();
                        event.result = { bool: !!bool, cost_data: num };
                    },
                    async content(event, trigger, player) {
                        const num = event.cost_data;
                        if (player.hasSkill('sgz_jieran'))
                            game.playAudio(`../extension/大梦千秋/audio/sgz_weiyan/sgz_poe${[4,5,6].randomGet()}.mp3`);
                        else game.playAudio(`../extension/大梦千秋/audio/sgz_weiyan/sgz_poe${[1,2,3].randomGet()}.mp3`);
                        await sgzPoeUseSha(player, num);
                    },
                },
                // ---- 回合开始时清空「本回合破扼杀链」的计数账本 ----
                reset: {
                    charlotte: true,
                    // 出牌阶段开始/结束时维护 sgz_poe_phase 标记；
                    // 回开始也清一次，避免异常流程残留在「出牌阶段中」
                    trigger: { player: ["phaseUseBegin", "phaseUseAfter", "phaseBegin"] },
                    forced: true,
                    silent: true,
                    popup: false,
                    content(event, trigger, player) {
                        if (trigger.name == "phaseUseBegin") {
                            player._sgz_poe_phase = true;
                            return;
                        }
                        // phaseUseAfter：出牌阶段结束，标记关掉（破扼①不再响应摸牌）
                        // phaseBegin：回合开始，顺手把计数账本与标记一起清干净
                        player._sgz_poe_phase = false;
                        player._sgz_poe_done = 0;
                        player._sgz_poe_total = 0;
                        player._sgz_poe_batches = [];
                    },
                },
            },
        },
        // 破扼杀的标记技：仅作为“这张杀来自破扼”的载体存在。
        // 不计入次数由 player.chooseUseTarget(card, forced, false) 的 addCount:false 保证；
        // 无距离限制由 sgz_poe 的 mod.targetInRange 保证。此技能本身不含任何触发。
        sgz_poe_sha: {
            charlotte: true,
        },

        // ===================== 4. 檄残 =====================
        sgz_xican: {
            // 音效：觉醒前 sgz_xican1~2，觉醒后 sgz_xican_achieve1~4
            audio: "ext:大梦千秋/audio/sgz_weiyan:6",
            persevereSkill: true,
            trigger: { source: "damageBegin" },
            forced: true,
            // 檄残为自动发动（不询问是否发动）
            // silent：同一时机有多个技能可选时，引擎优先执行 silent 技能，避免弹「选择下一个触发的技能」
            silent: true,
            // 竭燃/竭伐已改为 damageAfter，本时机只剩檄残，天然最先结算
            priority: 30,
            popup: false,
            filter(event, player) {
                return event.num > 0 && event.player && event.player.isIn() && event.player != player;
            },
            async content(event, trigger, player) {
                const target = trigger.player;
                const lost = target.maxHp - target.hp;
                const hp = target.hp;
                const logs = [];
                // ②③：已损失体力值 2 / 3 点或更多
                if (lost >= 2) {
                    trigger.num++;
                    logs.push(lost >= 3 ? "已损失体力≥3：伤害+1" : "已损失体力为2：伤害+1");
                }
                // ⑤：体力值为1，伤害+1（与②③可叠加）
                if (hp == 1) {
                    trigger.num++;
                    logs.push("体力为1：伤害+1");
                }
                // ①：已损失体力值为1，你获得其一张牌
                if (lost == 1 && target.countGainableCards(player, "he") > 0) {
                    logs.push("已损失体力为1：获得其一张牌");
                    await player.gainPlayerCard(target, "he", true);
                }
                // ③：已损失体力值为3或更多，你获得其一张牌
                if (lost >= 3) {
                    if (target.countGainableCards(player, "he") > 0) {
                        logs.push("已损失体力≥3：获得其一张牌");
                        await player.gainPlayerCard(target, "he", true);
                    } else {
                        logs.push("已损失体力≥3：其无牌可获得");
                    }
                }
                if (logs.length) {
                    game.log(player, "发动【檄残】：", logs.join("；"));
                    if (player.hasSkill('sgz_jieran'))
                        game.playAudio(`../extension/大梦千秋/audio/sgz_weiyan/sgz_xican${[3,4,5,6].randomGet()}.mp3`);
                    else game.playAudio(`../extension/大梦千秋/audio/sgz_weiyan/sgz_xican${[1,2].randomGet()}.mp3`);
                }
            },
        },
        // 檄残④：其体力值为2，其不可响应此牌
        // 响应发生在伤害结算之前，故此处必须在成为目标时就把目标写入 useCard 的 directHit
        sgz_xican_nohit: {
            persevereSkill: true,
            charlotte: true,
            silent: true,
            trigger: { global: "useCardToTargeted" },
            forced: true,
            popup: false,
            filter(event, player) {
                if (player != event.player || !event.target || event.target == player) {
                    return false;
                }
                // 只对可能造成伤害的牌生效（避免【桃】【无中生有】等也把目标写进 directHit）
                if (!get.tag(event.card, "damage")) {
                    return false;
                }
                if (event.target.hp != 2) {
                    return false;
                }
                return !!event.getParent("useCard");
            },
            content(event, trigger, player) {
                const use = trigger.getParent("useCard");
                if (!Array.isArray(use.directHit)) {
                    use.directHit = [];
                }
                if (!use.directHit.includes(trigger.target)) {
                    use.directHit.add(trigger.target);
                }
                
                game.log(trigger.target, "不可响应", trigger.card, "（#g檄残·不可响应");
            },
        },

        // ===================== 衍生技：竭燃 =====================
        sgz_jieran: {
            // 音效：sgz_jieran1~3（竭燃仅在觉醒后持有）
            audio:"ext:大梦千秋/audio/sgz_weiyan:3",
            persevereSkill: true,
            // 时机为「伤害结算后」（damageAfter），不再与檄残争 damageBegin
            trigger: { source: "damageAfter" },
            forced: true,
            silent: true,
            filter(event, player) {
                // 只有实际造成了伤害才发动
                return event.num > 0 && event.player && event.player != player;
            },
            async content(event, trigger, player) {
                // 等量 = 本次造成的伤害值
                const num = trigger.num;
                const list = ["上限", "回复"];
                if (!player.isDamaged()) {
                    list.remove("回复");
                }
                const control = await player
                    .chooseControl(list)
                    .set("prompt", `【${get.translation("sgz_jieran")}】请选择一项`)
                    .set("choiceList", [
                        `增加${get.cnNumber(num)}点体力上限`,
                        `回复${get.cnNumber(num)}点体力`,
                    ])
                    .set("displayIndex", false)
                    .set("ai", () => {
                        const player = get.player();
                        if (player.isDamaged() && player.hp <= 2) {
                            return "回复";
                        }
                        return "上限";
                    })
                    .forResultControl();
                if (control == "上限") {
                    await player.gainMaxHp(num);
                } else if (control == "回复") {
                    await player.recover(num);
                }
                // 后续的「弃置任意张牌」每回合限一次（二选一本身不限次数）
                if (!player.hasSkill("sgz_jieran_used") && player.countCards("he")) {
                    player.addTempSkill("sgz_jieran_used");
                    // 这里的弃牌属于「因竭燃失去牌」，标记后破扼②可以据此发动
                    player._sgz_jieran_losing = true;
                    try {
                        // chooseToDiscard 自身会执行弃置（非 chooseonly 时），此处不要再 modedDiscard 一次
                        await player
                            .chooseToDiscard("he", [0, Infinity], `【${get.translation("sgz_jieran")}】弃置任意张牌`)
                            .set("ai", () => 0)
                            .forResult();
                    } finally {
                        player._sgz_jieran_losing = false;
                    }
                }
            },
            subSkill: {
                // 仅作「本回合已弃过牌」的标记；回合开始自动清除
                used: {
                    charlotte: true,
                    trigger: { player: "phaseBegin" },
                    forced: true,
                    silent: true,
                    popup: false,
                    content(event, trigger, player) {
                        player.removeSkill("sgz_jieran_used");
                        game.playAudio(`../extension/大梦千秋/audio/sgz_weiyan/sgz_jieran${[1,2,3].randomGet()}.mp3`);
                    },
                },
            },
        },
    },
    skillTranslate: {
        sgz_zhuangshi: "壮誓",
        sgz_zhuangshi_info: "每名角色的准备阶段开始时，你可以失去任意点体力（不超过当前体力）并摸等量张牌。",
        sgz_jiefa: "竭伐",
        sgz_jiefa_info: "使命技，①当你造成的伤害结算后你弃置一张牌（不触发破扼）。②成功：当你击杀一名角色后，你增加一点体力上限并获得技能【竭燃】。",
        sgz_jieran: "竭燃",
        sgz_jieran_info: "你造成的伤害结算后，你选择一项：1.增加等量点体力上限；2.回复等量点体力（体力已满时不可选）。然后若你是于本回合首次造成伤害，你可以弃置任意张牌。",
        sgz_poe: "破扼",
        sgz_poe_info: "①当你于出牌阶段内摸牌时，你可以改为使用等量张无距离次数限制的【杀】（因【壮誓】摸牌时无视时机）；②当你于回合外失去牌时，你可以视为使用等量张无距离次数限制的【杀】（因【竭燃】失去牌时无视时机）。",
        sgz_xican: "檄残",
        sgz_xican_info: "当你即将对一名其他角色造成伤害时，根据其已损失体力值与体力值执行对应效果：<br>①已损失体力值为1：你获得其一张牌；<br>②已损失体力值为2：此伤害+1；<br>③已损失体力值为3或更多：此伤害+1且你获得其一张牌；<br>④其体力值为2：其不可响应此牌；<br>⑤其体力值为1：此伤害+1。",
    },
    characterTaici: {
        sgz_zhuangshi: { order: 1, content: "若魏寇将十万之众，延当为主公尽歼!/纵曹贼举天下进犯，延亦可勠力拒退!/丞相无需多虑，我定能轻身立功!/夏侯楙怯而无谋，有何计议之需!" },
        sgz_jiefa: { order: 2, content: "此番斩将得胜，只是连捷之始！/此身搏杀不懈，只为成主公之业！/乘此大胜破敌，先帝之望成矣！/先帝殊遇难偿，虽胜更应奋命！" },
        sgz_jieran: { order: 3, content: "宁战死沙场，绝不弃甲而降！/纵士少兵疲，亦可杀出重围！/战事何计兵将多寡？但看心怀之气！" },
        sgz_poe: { order: 4, content: "征战沙场，实乃平生快事！/魏文长在此，尔辈何敢乃尔！/为主破敌，如鱼饮水！/既遇我魏延，休再妄想生还。/敢阻我锋芒，自是要丢盔弃甲。/强敌我斩，坚甲我摧！" },
        sgz_xican: { order: 5, content: "曹贼吴犬，我有何惧哉？/我尚未全力一搏，又试问谁能阻挡？/饮罢贼血，看我再立功绩！/与我为敌，是汝等最大的不幸！/贼寇尚未尽戮，我岂会还营！/可还有强敌，能让我浅尝一败！" },
        die: { content: "战死沙场故为快事，且待来生看大汉兴复..." },
    },
};
