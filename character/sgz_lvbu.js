// ============================================================
//  梦吕布 · sgz_lvbu
//  技能结构约定：每个技能 = 一个“空壳大技能”（存放音频等展示资源），
//  实际效果由大技能 subSkill 内的子技能承担（按描述序号①②③划分），
//  子技能在对应时机主动 logSkill 大技能名以触发语音/台词。
//  注：audio 字段为占位路径（ext:大梦千秋/audio/sgz_lvbu:*），待音频文件就位后对接。
// ============================================================

import { dmqcBuildLvbuPickDialog, lvbuCardUI } from '../effect/sgz_lvbu.js';

// 获取“即将开始回合的角色”（当前回合角色之后的第一个存活角色，供噬炁①使用）
function sgzLvbuNextPlayer() {
    var cur = _status.currentPhase;
    if (!cur) return null;
    var t = cur;
    for (var i = 0; i < game.players.length; i++) {
        t = t.next;
        if (t.isAlive() && !t.isOut() && !t.removed) return t;
    }
    return null;
}

export default {
    character: {
        // 梦吕布：势力群，5体力
        sgz_lvbu: {
            sex: "male",
            group: "qun",
            hp: 3,
            maxHp: 3,
            hujia:1,
            skills: ["sgz_shiqi", "sgz_zhenlie", "sgz_lvbu_ui"],
            img: "extension/大梦千秋/image/sgz_lvbu.jpg",
            dieAudios: ["ext:大梦千秋/audio/sgz_lvbu/die.mp3"],
            names: "吕|布",
            groupInGuozhan: "qun",
        },
    },
    characterName: 'sgz_lvbu',
    characterTranslate: {
        sgz_lvbu: "梦吕布",
    },
    skills: {
        // ============================================================
        // === 技能1：【噬炁】（空壳大技能：audio 载体） ===
        // ① 每轮限一次、每名角色限一次：一名其他角色回合即将开始前（即其上一名角色回合结束的最后时机，
        //    这也是引擎中唯一能向该角色“插队”执行额外回合的时点），吕布可执行一个额外回合；
        //    受伤后本轮视为未发动过。若发动：目标收回装备区所有牌，并将其手牌中无“炁”标记的
        //    手牌至多随机标记4张（炁离开手牌区即移除标记）。
        // ② 被噬炁①指定过的角色失去手牌中所有“炁”时，立即死亡。
        // ③ 当一名其他角色即将死亡时，你增加X点体力上限、蓄力点上限和蓄力点（X为其手牌中“炁”标记的牌数+1）。
        // ============================================================
        sgz_shiqi: {
            // TODO 音频占位：噬炁发动语音（用户后续对接改名）
            audio: "ext:大梦千秋/audio/sgz_lvbu:9",
            init: function(player) {
                // 开局即可发动：显示“噬炁·待发”徽标（受伤重置/每轮开始时由 damage、upkeep 补回，发动后移除）
                if (player.countMark("sgz_shiqi_ready") <= 0) player.addMark("sgz_shiqi_ready", 1, false);
            },
            group: ["sgz_shiqi_turn", "sgz_shiqi_damage", "sgz_shiqi_upkeep", "sgz_shiqi_die"],
            subSkill: {
                // ---- ① 额外回合 + 标记炁（触发于“即将开始回合的角色”的上家回合结束，即该角色回合即将开始的唯一插队时机） ----
                turn: {
                    trigger: { global: "phaseEnd" },
                    // 每轮限一次 & 存活
                    filter: function(event, player) {
                        if (player.storage.sgz_shiqi_round === game.roundNumber) return false;
                        if (player.isOut() || !player.isAlive()) return false;
                        return true;
                    },
                    async cost(event, trigger, player) {
                        // “即将开始回合的角色”：当前回合角色的下一位存活者
                        var X = sgzLvbuNextPlayer();
                        if (!X || X == player) {
                            event.result = { bool: false };
                            return;
                        }
                        // 每名角色限一次：已被噬炁①指定过的角色不可再指定
                        if (player.storage.sgz_shiqi_used && player.storage.sgz_shiqi_used.contains(X)) {
                            event.result = { bool: false };
                            return;
                        }
                        event.result = await player
                            .chooseBool(
                                get.prompt("sgz_shiqi", X),
                                get.translation(X) + "的回合即将开始：令其收回装备区所有牌并将手牌标记为“炁”，然后你执行一个额外回合"
                            )
                            .set("ai", () => {
                                var X = sgzLvbuNextPlayer();
                                if (!X) return 0;
                                if (get.attitude(player, X) < 0 && (X.countCards("he") > 0 || X.countCards("h") > 0)) {
                                    return 1;
                                }
                                return 0;
                            })
                            .forResult();
                    },
                    async content(event, trigger, player) {
                        game.playAudio(`../extension/大梦千秋/audio/sgz_lvbu/sgz_shiqi${[1,2,3].randomGet()}.mp3`);
                        // 与 cost 同帧：当前回合角色的下一位即“即将开始回合的角色”，直接现算（避免存储玩家引用）
                        var X = sgzLvbuNextPlayer();
                        if (!X || X == player) return;
                        player.storage.sgz_shiqi_round = game.roundNumber; // 本轮已发动
                        if (!player.storage.sgz_shiqi_used) player.storage.sgz_shiqi_used = [];
                        player.storage.sgz_shiqi_used.add(X); // 每名角色限一次：记录被噬炁过的角色
                        // ① 目标收回其装备区的所有牌（回到自己手牌）
                        var equips = X.getCards("e");
                        if (equips.length) {
                            await X.gain(equips, "gain2");
                            game.log(X, "收回了装备区的", equips);
                        }
                        // 标记手牌为“炁”：无炁标记的手牌中至多随机标记4张（照曹髦“潜谋”：gaintag 卡面文字 + 武将牌 mark 徽标，全场可见）
                        var pool = X.getCards("h", c => !(c.hasGaintag && c.hasGaintag("sgz_qi")));
                        pool.randomSort();
                        var qiCards = pool.slice(0, pool.lengtH);
                        if (qiCards.length) {
                            if (!X.storage.sgz_shiqi_qi) X.storage.sgz_shiqi_qi = [];
                            X.storage.sgz_shiqi_qi.addArray(qiCards);
                            qiCards.forEach(c => c.addGaintag("sgz_qi"));
                            X.addSkill("sgz_shiqi_qi"); // 挂可见 mark + 死亡监视（幂等；mark:true 会自动 markSkill 显示徽标）
                            X.markSkill("sgz_shiqi_qi");
                            game.log(X, "的", qiCards.length, "张手牌被标记为“炁”");
                        } else {
                            game.log(X, "没有手牌可被标记为“炁”");
                        }
                        // 发动后移除“可发动”提醒标记（mark:true 的徽标在计数归零后仍会残留，
                        // 需用 unmarkSkill 才能彻底移除“噬炁”徽章）
                        player.unmarkSkill("sgz_shiqi_ready");
                        // 吕布执行一个额外回合（插队到目标之前）
                        player.insertPhase();
                        game.log(player, "执行了一个额外回合");
                    },
                },
                // ---- 受伤重置：受到伤害后，噬炁本轮视为未发动过（并恢复“可发动”提醒标记） ----
                damage: {
                    trigger: { player: "damage" },
                    forced: true,
                    silent: true,
                    filter: function(event, target) {
                        return event.num > 0 ;
                    },
                    content: function() {
                        game.playAudio(`../extension/大梦千秋/audio/sgz_lvbu/sgz_shiqi${[4,5].randomGet()}.mp3`);
                        delete player.storage.sgz_shiqi_round;
                        player.addMark("sgz_shiqi_ready");
                    },
                },
                // ---- “可发动”提醒标记（mark 徽标）：有它=噬炁本轮可用（发动后移除，受伤/新一轮开始时恢复） ----
                ready: {
                    mark: true,
                    marktext: "噬炁",
                    intro: {
                        name: "噬炁·待发",
                        nocount: true,
                        content: "可发动：对即将开始回合的未被“噬炁”过的其他角色发动，执行一个额外回合并标记其手牌为“炁”。",
                    },
                },
                // ---- 每轮/每回合开始时恢复“可发动”标记 ----
                upkeep: {
                    trigger: { global: ["roundStart"], player: ["phaseBegin", "enterGame"] },
                    forced: true,
                    silent: true,
                    content: function() {
                        // 本轮未发动过（或已跨轮）即可就绪
                        if (player.storage.sgz_shiqi_round !== game.roundNumber) {
                            if (player.countMark("sgz_shiqi_ready") <= 0) player.addMark("sgz_shiqi_ready", 1, false);
                        }
                    },
                },
                // ---- ③ 当一名其他角色即将死亡时，你增加X点体力上限、蓄力点上限和蓄力点（X为其手牌中“炁”标记的牌数+1） ----
                die: {
                    trigger: { global: "dieBefore" },
                    forced: true,
                    silent: true,
                    filter: function(event, player) {
                        return event.player && event.player != player && event.player.isAlive() && !event.player.isOut();
                    },
                    content: function() {
                        var dying = trigger.player;
                        var qiCount = dying.countCards("h", c => c.hasGaintag && c.hasGaintag("sgz_qi"));
                        game.playAudio(`../extension/大梦千秋/audio/sgz_lvbu/sgz_shiqi${[6,7,8,9].randomGet()}.mp3`);
                        var X = qiCount + 1;
                        player.gainMaxHp(X); // 会随附日志“增加了X点体力上限”
                        if (!player.storage.sgz_zhenlie_maxbonus) player.storage.sgz_zhenlie_maxbonus = 0;
                        player.storage.sgz_zhenlie_maxbonus += X;
                        player.addCharge(X, false);
                        game.log(player, "因", dying, "即将死亡", "蓄力点上限+", X, "，蓄力点+", X);
                    },
                },
            },
        },
        // ============================================================
        // === 技能2：【镇猎】蓄力技（1/4）（空壳大技能：audio + 蓄力 + mod 载体） ===
        // ① 造成伤害时：+1蓄力点；其有“炁”则随机获得其一张“炁”，无炁且手牌数>体力则获得其一张手牌；
        //    随后若手牌中“镇猎”杀点数之和 < 体力上限，获得一张点数=最大镇猎杀点数+1、花色随机的“镇猎”杀。
        // ② 使用杀时：消耗任意点蓄力点执行等量选项：1.伤害+1；2.不可被响应；3.额外指定至多两个目标；4.造成伤害回复等量体力。
        // ============================================================
        sgz_zhenlie: {
            audio: "ext:大梦千秋/audio/sgz_lvbu:7",
            chargeSkill: 4, // 蓄力点上限 4（噬炁③可再增）
            init: function(player) {
                // 蓄力技（1/4）：开局自带 1 点蓄力
                player.addCharge(1, false);
            },
            // 镇猎杀牌效 + 蓄力上限 mod
            mod: {
                // （已取消“无距离限制”）：镇猎杀仅保留无次数限制与不计入次数
                // 镇猎杀：使用无次数限制（无论次数余额如何总能出）
                cardUsable: function(card, player, num) {
                    if (card && ((card.storage && card.storage.sgz_zhenlie_sha) || (card.hasGaintag && card.hasGaintag("sgz_zhenlie_sha")))) return Infinity;
                },
                // 镇猎杀：可继续指定目标（次数耗尽时的二次保险）
                cardUsableTarget: function(card, player, target) {
                    if (card && ((card.storage && card.storage.sgz_zhenlie_sha) || (card.hasGaintag && card.hasGaintag("sgz_zhenlie_sha")))) return true;
                },
                // 噬炁③ 增加蓄力点上限
                maxCharge: function(player, max) {
                    return max + (player.storage.sgz_zhenlie_maxbonus || 0);
                },
            },
            group: ["sgz_zhenlie_hunt", "sgz_zhenlie_enhance", "sgz_zhenlie_noshan", "sgz_zhenlie_heal", "sgz_zhenlie_free", "sgz_zhenlie_optsreset"],
            subSkill: {
                // ---- ① 造成伤害：+1蓄力点 + 夺牌 +（条件满足时）获得“镇猎”杀 ----
                hunt: {
                    trigger: { source: "damage" },
                    forced: true,
                    filter: function(event, player) {
                        return event.num > 0 && event.player && event.player != player && event.player.isAlive() && !event.player.isOut();
                    },
                    async content(event, trigger, player) {
                        game.playAudio(`../extension/大梦千秋/audio/sgz_lvbu/sgz_zhenlie${[1,2,3,4].randomGet()}.mp3`);
                        var X = trigger.player;
                        // ① 获得1点蓄力点
                        player.addCharge(1);
                        // ② 夺牌：有“炁”→随机获得其一张“炁”；无炁且手牌数>体力 → 获得其一张手牌；否则无法获得
                        var qiPool = X.getCards("h", c => c.hasGaintag && c.hasGaintag("sgz_qi"));
                        if (qiPool.length) {
                            var got = qiPool.randomGet();
                            await player.gain(got, "gain2");
                            game.log(player, "获得了", X, "的一张“炁”");
                        } else if (X.countCards("h") > X.hp) {
                            var pool = X.getCards("h");
                            var got = pool.randomGet();
                            await player.gain(got, "gain2");
                            game.log(player, "获得了", X, "的一张手牌");
                        } else {
                            game.log(player, "未获得", X, "的牌（无“炁”且手牌数不大于体力）");
                        }
                        // ③ 镇猎杀：手牌中“镇猎”杀点数之和 < 体力上限时，获得一张点数=最大镇猎杀点数+1（此处已修改为镇猎杀点数之和+1）、花色随机的镇猎杀
                        var zhenLieList = player.getCards("h", c => (c.storage && c.storage.sgz_zhenlie_sha) || (c.hasGaintag && c.hasGaintag("sgz_zhenlie_sha")));
                        var sum = 0, maxP = 0;
                        zhenLieList.forEach(function(c) {
                            var n = typeof c.number == "number" ? c.number : 0;
                            sum += n;
                            if (n > maxP) maxP = n;
                        });
                        if (sum < player.maxHp) {
                            var point = Math.min(sum + 1, 13);
                            var suit = ["spade", "heart", "club", "diamond"].randomGet();
                            var zhenlieSha = game.createCard("sha", suit, point);
                            zhenlieSha.addGaintag("sgz_zhenlie_sha"); // 卡面“镇猎”标签
                            if (!zhenlieSha.storage) zhenlieSha.storage = {};
                            zhenlieSha.storage.sgz_zhenlie_sha = true; // 官方“手戾”同款牌标记，供 mod 识别
                            await player.gain(zhenlieSha, "gain2");
                            game.log(player, "获得了一张", "#g【镇猎】杀", "（点数", get.cnNumber(point), "）");
                        } else {
                            game.log(player, "手牌中“镇猎”杀点数之和已达体力上限，本次未获得【镇猎】杀");
                        }
                    },
                },
                // ---- ③ 使用杀：选择选项（每回合每项限一次，四项全用后刷新） ----
                enhance: {
                    trigger: { player: "useCard1" },
                    filter: function(event, player) {
                        return event.card && event.card.name == "sha" && player.countCharge() > 0;
                    },
                    async cost(event, trigger, player) {
                        // 每回合每项限一次：四项全部用过后，下次发动整体刷新
                        var used = player.storage.sgz_zhenlie_opts || {};
                        if (used["伤害+1"] && used["不可响应"] && used["额外目标"] && used["回复体力"]) {
                            used = player.storage.sgz_zhenlie_opts = {};
                        }
                        var charge = player.countCharge();
                        if (charge <= 0) {
                            event.result = { bool: false };
                            return;
                        }
                        const str = get.translation(trigger.card);
                        // 本回合可用选项
                        var list = [];
                        if (!used["伤害+1"]) list.push({ key: "伤害+1", label: "伤害+1", desc: "令" + str + "伤害+1" });
                        if (!used["不可响应"]) list.push({ key: "不可响应", label: "不可响应", desc: str + "不可被响应" });
                        if (!used["额外目标"]) list.push({ key: "额外目标", label: "额外目标", desc: str + "额外指定至多两个目标" });
                        if (!used["回复体力"]) list.push({ key: "回复体力", label: "回复体力", desc: "若" + str + "造成伤害，你回复等量体力" });
                        if (!list.length) {
                            event.result = { bool: false };
                            return;
                        }
                        var max = Math.min(list.length, charge); // 可多选上限
                        var result;
                        if (player.isMine()) {
                            // 自绘主题选项框：单击即选中/取消，点【确定】才执行（实现见 effect/sgz_lvbu.js）
                            try {
                                result = await dmqcBuildLvbuPickDialog(
                                    player,
                                    "镇猎：选择至多" + get.cnNumber(max) + "项并消耗等量蓄力点。每回合每项限一次，无可选项时所有选项视为未发动过。",
                                    list,
                                    max
                                );
                            } catch (e) {
                                // 主题框构建失败不静默：写入日志并视为放弃本次（保证技能可用）
                                console.error("[大梦千秋] 镇猎③主题选择框构建失败，本次不发动：", e);
                                result = { bool: false };
                            }
                        } else {
                            // AI：按收益打分，取正分且不超过上限的项
                            var picked = [];
                            var scored = list
                                .map(function (opt) {
                                    var score = 0;
                                    var t = trigger;
                                    switch (opt.key) {
                                        case "伤害+1":
                                            (t.targets || []).forEach(function (tar) {
                                                score += get.damageEffect(tar, player, player);
                                            });
                                            break;
                                        case "额外目标":
                                            var candidates = game.filterPlayer(function (tar) {
                                                return (
                                                    !t.targets.includes(tar) &&
                                                    lib.filter.targetEnabled2(t.card, player, tar) &&
                                                    lib.filter.targetInRange(t.card, player, tar)
                                                );
                                            });
                                            score = candidates.length ? Math.max.apply(Math, candidates.map(function (x) { return get.effect(x, t.card, player, player); })) : 0;
                                            break;
                                        case "回复体力":
                                            score = player.hp < player.maxHp ? 3 : 0;
                                            break;
                                    }
                                    return { key: opt.key, score: score };
                                })
                                .sort(function (a, b) {
                                    return b.score - a.score;
                                });
                            for (var i = 0; i < scored.length && picked.length < max; i++) {
                                if (scored[i].score > 0) picked.push(scored[i].key);
                            }
                            result = picked.length ? { bool: true, links: picked } : { bool: false };
                        }
                        if (!result.bool || !result.links || !result.links.length) {
                            event.result = { bool: false }; // 取消/无选择则放弃发动
                            return;
                        }
                        event.result = {
                            bool: true,
                            cost_data: result.links.slice(),
                        };
                    },
                    async content(event, trigger, player) {
                        game.playAudio(`../extension/大梦千秋/audio/sgz_lvbu/sgz_zhenlie${[7,8,9].randomGet()}.mp3`);
                        var links = event.cost_data || [];
                        if (!links.length) return;
                        player.removeCharge(links.length); // 执行等量选项并扣除等量蓄力点
                        // 记录本回合已用选项（每项限一次）
                        if (!player.storage.sgz_zhenlie_opts) player.storage.sgz_zhenlie_opts = {};
                        links.forEach(c => (player.storage.sgz_zhenlie_opts[c] = true));
                        const str = get.translation(trigger.card);
                        game.log(player, "消耗了", get.cnNumber(links.length), "点蓄力发动【镇猎】");
                        for (const choice of links) {
                            player.popup(choice);
                            switch (choice) {
                                case "伤害+1":
                                    trigger.baseDamage++;
                                    game.log(str, "造成的伤害", "#y+1");
                                    break;
                                case "不可响应":
                                    player.addTempSkill("sgz_zhenlie_noshan", { player: "phaseUseEnd" });
                                    player.markAuto("sgz_zhenlie_noshan", [trigger.card]);
                                    break;
                                case "额外目标":
                                    // 注：when().then() 回调会被字符串化重编译，只能使用框架注入变量，故不引用外层闭包
                                    player
                                        .when("useCard2")
                                        .filter(evt => evt === trigger)
                                        .then(() => {
                                            player.chooseTarget(
                                                "镇猎：为" + get.translation(trigger.card) + "额外指定至多两个目标",
                                                [0, 2],
                                                (card, player, target) => {
                                                    const evt = get.event().getTrigger();
                                                    return (
                                                        !evt.targets.includes(target) &&
                                                        lib.filter.targetEnabled2(evt.card, player, target) &&
                                                        lib.filter.targetInRange(evt.card, player, target)
                                                    );
                                                }
                                            ).set("ai", target => {
                                                const player = get.player(),
                                                    evt = get.event().getTrigger();
                                                return get.effect(target, evt.card, player, player);
                                            });
                                        })
                                        .then(() => {
                                            if (result?.bool && result.targets?.length) {
                                                player.line2(result.targets, trigger.card.nature);
                                                trigger.targets.addArray(result.targets);
                                                game.log(result.targets, "成为了", trigger.card, "的额外目标");
                                            }
                                        });
                                    break;
                                case "回复体力":
                                    // 本杀造成伤害时立即回复等量体力（由 sgz_zhenlie_heal 子技能承担；
                                    // 用 useCard 事件本体进行比对，确保只对本张杀生效）
                                    player.addTempSkill("sgz_zhenlie_heal", { player: "phaseUseEnd" });
                                    player.storage.sgz_zhenlie_heal = { useCard: trigger };
                                    break;
                            }
                        }
                    },
                },
                // ---- ③辅助：吕布回合开始重置“选项使用记录”（每回合每项限一次） ----
                optsreset: {
                    trigger: { player: "phaseBegin" },
                    forced: true,
                    silent: true,
                    content: function() {
                        delete player.storage.sgz_zhenlie_opts;
                    },
                },
                // ---- ③选项2辅助：此杀不可被响应（直接命中） ----
                noshan: {
                    charlotte: true,
                    onremove: function(player) {
                        delete player.storage.sgz_zhenlie_noshan;
                    },
                    trigger: { player: "useCardToBegin" },
                    forced: true,
                    silent: true,
                    filter: function(event, player) {
                        return (
                            player.getStorage("sgz_zhenlie_noshan").includes(event.card) &&
                            !event.getParent().directHit.includes(event.target)
                        );
                    },
                    content: function() {
                        trigger.set("directHit", true);
                        game.log(trigger.target, "不可响应", trigger.card);
                    },
                },
                // ---- ③选项4辅助：本杀造成伤害后回复等量体力 ----
                heal: {
                    charlotte: true,
                    onremove: function(player) {
                        delete player.storage.sgz_zhenlie_heal;
                    },
                    trigger: { source: "damage" },
                    forced: true,
                    silent: true,
                    filter: function(event, player) {
                        var rec = player.storage.sgz_zhenlie_heal;
                        if (!rec) return false;
                        if (event.name != "damage") return false;
                        // 只对“这张杀”造成的伤害生效（用 useCard 事件本体比对，比牌对象更可靠）
                        var parentUse = event.getParent && event.getParent("useCard");
                        return event.num > 0 && parentUse === rec.useCard;
                    },
                    content: function() {
                        // 造成多少伤害，立即回复等量体力
                        player.recover(trigger.num);
                        game.log(player, "因", "#g【镇猎】", "回复了", trigger.num, "点体力");
                    },
                },
                // ---- 镇猎杀不计入次数（补偿已计数） ----
                free: {
                    trigger: { player: "useCard" },
                    forced: true,
                    silent: true,
                    filter: function(event, player) {
                        return (
                            event.card &&
                            event.addCount !== false &&
                            ((event.card.storage && event.card.storage.sgz_zhenlie_sha) ||
                                (event.card.hasGaintag && event.card.hasGaintag("sgz_zhenlie_sha")))
                        );
                    },
                    content: function() {
                        trigger.addCount = false;
                        var stat = player.getStat("card");
                        if (typeof stat["sha"] == "number") stat["sha"]--;
                    },
                },
            },
        },
        // ==== 噬炁②（炁尽即死 + 炁离手移除标记） ====
        // 顶层独立技能，仅由噬炁①通过 addSkill 挂到“被噬炁的角色”身上（仿曹髦“潜谋”结构），
        // 吕布自身永不持有，故不会误触发在吕布身上。
        sgz_shiqi_qi: {
            charlotte: true, // 角色死亡/移除时自动清理
            mark: true,
            marktext: "炁",
            intro: {
                name: "炁",
                content: "cards", // 点击“炁”徽标可查看当前被标记的手牌（全场可见）
            },
            onremove: function(player) {
                delete player.storage.sgz_shiqi_qi;
            },
            trigger: { player: "loseAfter" },
            forced: true,
            silent: true,
            // 被标记的炁牌对全场可见（与曹髦潜谋同款处理）
            mod: {
                cardVisible: function(card) {
                    if (card.hasGaintag && card.hasGaintag("sgz_qi")) return true;
                },
                // 保护（仅对AI/对手生效）：手牌中仅剩最后一张“炁”时，不可主动丢弃/使用/打出、也不可作为“桃/酒”救援打出——
                // 失去全部“炁”会立即死亡。本地人类玩家不强制（可自行权衡，例如用最后一张“炁”杀拼死一击）。
                cardDiscardable: function(card, player) {
                    if (player.isMine()) return; // 本地人类玩家可自行权衡
                    if (card.hasGaintag && card.hasGaintag("sgz_qi") && player.countCards("h", c => c.hasGaintag && c.hasGaintag("sgz_qi")) <= 1) return false;
                },
                cardRespondable: function(card, player) {
                    if (player.isMine()) return;
                    if (card.hasGaintag && card.hasGaintag("sgz_qi") && player.countCards("h", c => c.hasGaintag && c.hasGaintag("sgz_qi")) <= 1) return false;
                },
                cardEnabled2: function(card, player) {
                    if (player.isMine()) return;
                    if (card.hasGaintag && card.hasGaintag("sgz_qi") && player.countCards("h", c => c.hasGaintag && c.hasGaintag("sgz_qi")) <= 1) return false;
                },
                cardSavable: function(card, player) {
                    if (player.isMine()) return;
                    if (card.hasGaintag && card.hasGaintag("sgz_qi") && player.countCards("h", c => c.hasGaintag && c.hasGaintag("sgz_qi")) <= 1) return false;
                },
            },
            content: function() {
                "step 0"
                // 炁离开手牌区就移除标记
                if (trigger.cards) {
                    trigger.cards.forEach(function(c) {
                        if (c.hasGaintag && c.hasGaintag("sgz_qi")) c.removeGaintag("sgz_qi");
                    });
                }
                // 同步维护“炁”徽标展示列表
                if (player.storage.sgz_shiqi_qi) {
                    trigger.cards.forEach(function(c) {
                        if (player.storage.sgz_shiqi_qi.contains(c)) player.storage.sgz_shiqi_qi.remove(c);
                    });
                    player.markSkill("sgz_shiqi_qi");
                }
                // ② 被噬炁①指定过（技能挂着即被指定过、且曾标上炁）、且手牌中已无炁 → 立即死亡
                // （判定先于清理，避免移除技能打断流程）
                if (!player.storage.sgz_shiqi_qi || !player.storage.sgz_shiqi_qi.length) {
                    if (player.isAlive() && !player.isOut()) {
                        game.log(player, "手牌中的“炁”全部失去", "，立即死亡");
                        player.die();
                    }
                }
                "step 1"
                // 清理：列表已空且仍挂着技能则移除（死亡角色由 charlotte 自动清理）
                if (player.storage.sgz_shiqi_qi && !player.storage.sgz_shiqi_qi.length) {
                    delete player.storage.sgz_shiqi_qi;
                    if (player.hasSkill("sgz_shiqi_qi")) player.removeSkill("sgz_shiqi_qi");
                }
            },
        },
        // ==== 卡面美化 UI（炁牌/镇猎杀 幽光，实现见 effect/sgz_lvbu.js） ====
        sgz_lvbu_ui: lvbuCardUI,
    },
    skillTranslate: {
        "sgz_qi": "炁", // gaintag 卡面文字（被噬炁标记的手牌显示“炁”字）
        "sgz_zhenlie_sha": "镇猎", // 镇猎杀卡面标签
        sgz_shiqi: "噬炁",
        sgz_shiqi_info: "①昂扬技，一名没有被“噬炁”过的其他角色的回合开始前（首轮一号位除外），你可以执行一个额外回合。若如此做，其收回其装备区的所有牌并将手牌标记为“炁”。昂扬：当你受到伤害时。②被“噬炁”指定过的角色失去其手牌里的所有“炁”时，其立即死亡。③当一名其他角色即将死亡时，你增加X点体力上限、蓄力点上限和蓄力点（X为其手牌中“炁”标记的牌数+1）。",
        sgz_zhenlie: "镇猎",
        sgz_zhenlie_info: "蓄力技（1/4）。①当你对一名其他角色造成伤害时，你获得1点蓄力点。然后：<br>1.若其有“炁”，你获得其一张“炁”。<br>2.若其没有“炁”且手牌数大于体力值，你获得其一张手牌。<br>3.若你手牌中“镇猎”杀的点数之和小于你的体力上限，你获得一张“镇猎”杀（花色随机，点数为你手牌中“镇猎”杀点数之和+1）。<br>②当你使用杀时，你可以消耗任意蓄力点执行等量选项（每回合每项限一次，无可选项时所有选项视为未选择过）：1.令此杀伤害+1；2.不可被响应；3.额外指定至多两个目标；4.若此杀造成伤害你回复等量体力。",
        sgz_lvbu_ui: "特效",
    },
    characterTaici: {
        "sgz_shiqi":{ order:1, content: "祝我狩猎愉快！/梦魇与你随行！/无法原谅的痛苦！/何为兽何为人！唯有仇恨让我向死而生。/来吧，随这噩梦沉沦！/我为你挑了一块风景绝佳的沉眠之地。/在恐惧中长眠吧。/你该知道，梦里谁说了算！/你无法战胜一个习惯从痛苦中汲取力量的灵魂！"},
        "sgz_zhenlie":{ order:2, content:"堕于永夜！/做个噩梦！/灵魂侵染！/逾越虚实！/魇梦列席！/尽吞人间百相！/残月临空！"},
        "die":{content:"不过是又一次，等待重生..."}
    },
}
