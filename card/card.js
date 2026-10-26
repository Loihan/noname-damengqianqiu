game.import("card", (lib, game, ui, get, ai, _status) => {
    // 卡牌包名必须唯一：原先叫 swCard，与搬运来源「星之梦」的卡牌包**同名**，
    // 引擎按 lib.imported.card[包名] 存包（game/index.js:2880），同名只留下一份，
    // 结果本包整套定义被丢弃、游戏里跑的是星之梦那份。改为本包专属名 dmqc_duyusw，
    // 并把卡 id 统一成 duyusw_ 前缀（原 sw_/mj_），与「星之梦」完全错开，二者可共存。
    let duyuswCard = {
        name: "dmqc_duyusw",
        connect: true,
        //主要搬运自猫猫叹气、民间卡牌
        card: {
            duyusw_guilongzhanyuedao: {
                image: "ext:大梦千秋/image/card/duyusw_guilongzhanyuedao.png",
                type: "equip",
                subtype: "equip1",
                fullskin: true,
                distance: {
                    attackFrom: -2,
                },
                // 本包 sw_ 版用自己的技能实现（比基础版多了不计入次数/无次数/无距离限制）
                skills: ["duyusw_guilongzhanyuedao_skill"],
                ai: {
                    equipValue: 4,
                },
            },
            duyusw_guofengyupao: {
                image: "ext:大梦千秋/image/card/duyusw_guofengyupao.png",
                type: "equip",
                subtype: "equip2",
                fullskin: true,
                skills: ["guofengyupao"],
                ai: {
                    equipValue: 7,
                },
            },
            duyusw_qimenbagua: {
                image: "ext:大梦千秋/image/card/duyusw_qimenbagua.png",
                type: "equip",
                subtype: "equip2",
                fullskin: true,
                skills: ["qimenbagua"],
                ai: {
                    equipValue: 7.5,
                },
            },
            duyusw_chiyanzhenhunqin: {
                image: "ext:大梦千秋/image/card/duyusw_chiyanzhenhunqin.png",
                type: "equip",
                subtype: "equip1",
                distance: {
                    attackFrom: -3,
                },
                fullskin: true,
                skills: ["duyusw_chiyanzhenhunqin_skill"],
                ai: {
                    equipValue: 5,
                },
            },

            duyusw_juechenjinge: {
                image: "ext:大梦千秋/image/card/duyusw_juechenjinge.png",
                type: "equip",
                subtype: "equip3",
                fullskin: true,
                distance: {
                    globalTo: 1,
                },
                skills: ["duyusw_juechenjinge_skill"],
                ai: {
                    equipValue(card, player) {
                        if (player.hp != player.maxHp) return 5;
                        if (player.hasSkill("guixin")) return 9;
                        return 0;
                    },
                    basic: {
                        equipValue: 0,
                    },
                },
            },
            duyusw_xiuluolianyuji: {
                image: "ext:大梦千秋/image/card/duyusw_xiuluolianyuji.png",
                type: "equip",
                subtype: "equip1",
                fullskin: true,
                distance: {
                    attackFrom: -3,
                },
                skills: ["duyusw_xiuluolianyuji_skill"],
                ai: {
                    equipValue: (card, player) => {
                        if (
                            player.countCards("h", {
                                name: "sha",
                            })
                        )
                            return 6.5;
                        return 6;
                    },
                    basic: {
                        equipValue: 6,
                    },
                },
            },
            duyusw_chixueqingfeng: {
                image: "ext:大梦千秋/image/card/duyusw_chixueqingfeng.png",
                type: "equip",
                subtype: "equip1",
                fullskin: true,
                distance: {
                    attackFrom: -1,
                },
                skills: ["chixueqingfeng"],
                ai: {
                    equipValue: 6.7,
                },
            },
            duyusw_xuwangzhimian: {
                image: "ext:大梦千秋/image/card/duyusw_xuwangzhimian.png",
                type: "equip",
                subtype: "equip5",
                fullskin: true,
                skills: ["xuwangzhimian"],
                ai: {
                    equipValue: (card, player) => {
                        if (player.getHandcardLimit() <= 2) return 3;
                        return Math.min(5, player.getHandcardLimit()) + 3;
                    },
                    basic: {
                        equipValue: 5,
                    },
                },
            },
            duyusw_qicaishenlu: {
                image: "ext:大梦千秋/image/card/duyusw_qicaishenlu.png",
                type: "equip",
                subtype: "equip4",
                fullskin: true,
                distance: {
                    globalFrom: -1,
                },
                skills: ["duyusw_qicaishenlu_skill"],
                ai: {
                    basic: {
                        equipValue: 8.5,
                    },
                },
            },
            duyusw_luanfenghemingjian: {
                image: "ext:大梦千秋/image/card/duyusw_luanfenghemingjian.png",
                type: "equip",
                subtype: "equip1",
                fullskin: true,
                skills: ["duyusw_luanfenghemingjian_skill"],
                distance: {
                    attackFrom: -2,
                },
                ai: {
                    equipValue: (card, player) => {
                        for (var n of ["fire", "thunder"]) {
                            if (
                                player.countCards("h", {
                                    name: "sha",
                                    nature: n,
                                })
                            )
                                return 5.5;
                        }
                        return 5;
                    },
                    basic: {
                        equipValue: 5,
                    },
                },
            },
            duyusw_xingtianpojunfu: {
                image: "ext:大梦千秋/image/card/duyusw_xingtianpojunfu.png",
                type: "equip",
                subtype: "equip1",
                fullskin: true,
                distance: {
                    attackFrom: -2,
                },
                skills: ["duyusw_xingtianpojunfu_skill"],
                ai: {
                    equipValue: (card, player) => {
                        return Math.min(9, 5 + player.countCards("he"));
                    },
                    basic: {
                        equipValue: 8,
                    },
                },
            },
            duyusw_jinwuluorigong: {
                image: "ext:大梦千秋/image/card/duyusw_jinwuluorigong.png",
                type: "equip",
                subtype: "equip1",
                fullskin: true,
                distance: {
                    attackFrom: -8,
                },
                skills: ["duyusw_jinwuluorigong_skill"],
                ai: {
                    equipValue(card, player) {
                        if (player.hasSkill("poxi")) return 8;
                        return 6;
                    },
                    basic: {
                        equipValue: 6,
                    },
                },
            },
            duyusw_lingsheji: {
                image: "ext:大梦千秋/image/card/duyusw_lingsheji.png",
                type: "equip",
                subtype: "equip5",
                fullskin: true,
                skills: ["duyusw_lingsheji_skill"],
                ai: {
                    equipValue: 6,
                },
            },
            duyusw_shanrangzhaoshu: {
                image: "ext:大梦千秋/image/card/duyusw_shanrangzhaoshu.png",
                type: "equip",
                subtype: "equip5",
                fullskin: true,
                skills: ["duyusw_shanrangzhaoshu_skill"],
                ai: {
                    equipValue: 6,
                },
            },
            duyusw_sanshou: {
                image: "ext:大梦千秋/image/card/duyusw_sanshou.png",
                type: "equip",
                subtype: "equip2",
                fullskin: true,
                skills: ["sanshou"],
                ai: {
                    equipValue: 8,
                },
            },
            duyusw_wushuangfangtianji: {
                image: "ext:大梦千秋/image/card/duyusw_wushuangfangtianji.png",
                type: "equip",
                subtype: "equip1",
                fullskin: true,
                distance: {
                    attackFrom: -3,
                },
                skills: ["wushuangfangtianji_skill"],
                ai: {
                    equipValue: 3,
                },
            },
            duyusw_shufazijinguan: {
                image: "ext:大梦千秋/image/card/duyusw_shufazijinguan.png",
                type: "equip",
                subtype: "equip5",
                fullskin: true,
                skills: ["shufazijinguan_skill"],
                ai: {
                    equipValue: 8,
                },
            },
            duyusw_hongmianbaihuapao: {
                image: "ext:大梦千秋/image/card/duyusw_hongmianbaihuapao.png",
                type: "equip",
                subtype: "equip2",
                fullskin: true,
                skills: ["hongmianbaihuapao_skill"],
                ai: {
                    equipValue: 4,
                },
            },
            duyusw_linglongshimandai: {
                image: "ext:大梦千秋/image/card/duyusw_linglongshimandai.png",
                type: "equip",
                subtype: "equip2",
                fullskin: true,
                skills: ["linglongshimandai_skill"],
                ai: {
                    equipValue: 5,
                },
            },
            duyusw_mengyanchitu: {
                image: "ext:大梦千秋/image/card/duyusw_mengyanchitu.png",
                fullskin: true,
                type: "equip",
                subtype: "equip6",
                subtypes: ["equip3", "equip4"],
                nomod: true,
                nopower: true,
                distance: {
                    globalFrom: -1,
                    globalTo: 1,
                },
                skills: ["duyusw_mengyanchitu_skill"],
                ai: {
                    equipValue(card, player) {
                        if (player.countCards("e", { subtype: ["equip3", "equip4"] }) > 1) return 1;
                        return 7.2;
                    },
                    basic: {
                        equipValue: 7.2,
                    },
                },
            },
            duyusw_qixingpao: {
                image: "ext:大梦千秋/image/card/duyusw_qixingpao.png",
                type: "equip",
                subtype: "equip2",
                fullskin: true,
                skills: ["duyusw_qixingpao_skill"],
                ai: {
                    equipValue: 5,
                },
            },
            duyusw_shengguangbaiyi: {
                image: "ext:大梦千秋/image/card/duyusw_shengguangbaiyi.png",
                type: "equip",
                subtype: "equip2",
                fullskin: true,
                skills: ["duyusw_shengguangbaiyi_skill"],
                ai: {
                    equipValue: 8,
                },
            },
            duyusw_xieshenmianju: {
                image: "ext:大梦千秋/image/card/duyusw_xieshenmianju.png",
                type: "equip",
                subtype: "equip2",
                fullskin: true,
                skills: ["duyusw_xieshenmianju_skill"],
                ai: {
                    equipValue(card, player) {
                        if (player.hasSkill("shenfen")) return 7;
                        return 4;
                    },
                    basic: {
                        equipValue: 4,
                    },
                },
            },
            duyusw_jishengong: {
                image: "ext:大梦千秋/image/card/duyusw_jishengong.png",
                type: "equip",
                subtype: "equip1",
                fullskin: true,
                distance: {
                    attackFrom: -4,
                },
                skills: ["duyusw_jishengong_skill"],
                ai: {
                    equipValue: 4,
                },
            },
            duyusw_baihuaqun: {
                image: "ext:大梦千秋/image/card/duyusw_baihuaqun.png",
                type: "equip",
                subtype: "equip2",
                fullskin: true,
                skills: ["duyusw_baihuaqun_skill"],
                onLose: () => {
                    player.draw(2);
                },
                ai: {
                    equipValue: (card, player) => {
                        if (player.getDamagedHp() == 0) return 8;
                        return 10 - Math.min(4, player.hp);
                    },
                    basic: {
                        equipValue: 7,
                    },
                },
            },
        },
        // ============================================================
        //  神武技能（原先只有卡牌定义、没有技能定义 ⇒ 装备后不生效）
        //  这里把 星之梦 的对应实现移植进本包，统一用 duyusw_* 前缀。
        // ⚠ 技能名必须与 card 段里的 `skills: [...]` 一一对应。
        // ============================================================
        skill: {
            duyusw_chiyanzhenhunqin_skill: {
                equipSkill: true,
                trigger: { source: "damageBegin1" },
                audio: "zhuque_skill",
                forced: true,
                content() {
                    if (trigger.nature != "fire") trigger.nature = "fire";
                    else trigger.num++;
                },
            },
            duyusw_juechenjinge_skill: {
                trigger: { player: "damageBegin" },
                forced: true,
                filter(event, player) {
                    return event.num % 2 == 1;
                },
                content() {
                    player.recover();
                    trigger.num++;
                },
                _priority: 0,
            },
            duyusw_xiuluolianyuji_skill: {
                mod: {
                    selectTarget(card, player, range) {
                        if (card.name != "sha") return;
                        if (range[1] == -1) return;
                        range[1] = Infinity;
                    },
                },
                trigger: { source: "damageBegin1" },
                forced: true,
                filter(event) {
                    return event.card && event.card.name == "sha";
                },
                content() {
                    trigger.num++;
                    trigger.xiuluolianyuji = true;
                    trigger.player.addSkill("xiuluolianyuji2");
                },
            },
            duyusw_qicaishenlu_skill: {
                equipSkill: true,
                trigger: { source: "damageBegin1" },
                forced: true,
                filter(event) {
                    return event.hasNature("linked");
                },
                content() {
                    trigger.num++;
                },
            },
            duyusw_luanfenghemingjian_skill: {
                equipSkill: true,
                inherit: "cixiong_skill",
                filter(event) {
                    return get.natureList(event.card).some(i => {
                        return i === "thunder" || i === "fire";
                    });
                },
            },
            duyusw_xingtianpojunfu_skill: {
                trigger: { player: "useCardToPlayered" },
                equipSkill: true,
                direct: true,
                audio: "guanshi_skill",
                filter(event, player) {
                    return player.isPhaseUsing() && player != event.target && event.targets.length == 1 && player.countCards("he") > 2;
                },
                content() {
                    "step 0";
                    player
                        .chooseToDiscard("he", get.prompt("duyusw_xingtianpojunfu_skill", trigger.target), 2, "弃置两张牌，令" + get.translation(trigger.target) + "本回合内不能使用或打出牌且防具技能无效。", function (card, player) {
                            return card != player.getEquip(1);
                        })
                        .set("logSkill", ["duyusw_xingtianpojunfu_skill", trigger.target])
                        .set(
                            "goon",
                            (function (event, player) {
                                if (player.hasSkill("duyusw_xingtianpojunfu_skill2")) return false;
                                if (event.getParent().excluded.includes(player)) return false;
                                if (get.attitude(event.player, player) > 0) {
                                    return false;
                                }
                                if (get.type(event.card) == "trick" && event.player.hasWuxie()) return true;
                                if (get.tag(event.card, "respondSha")) {
                                    if (!player.hasSha()) return false;
                                    return true;
                                } else if (get.tag(event.card, "respondShan")) {
                                    if (!player.hasShan()) return false;
                                    return true;
                                }
                                return false;
                            })(trigger, trigger.target)
                        )
                        .set("ai", function (card) {
                            if (_status.event.goon) return 7.5 - get.value(card);
                            return 0;
                        });
                    ("step 1");
                    // ⚠ 衍生技必须在本包里有定义，否则 addTempSkill 什么也不做 ⇒ 只有音效、封牌不生效
                    //   （星之梦的 xingtianpojunfu2 只有它自己的包里有，本包不能依赖它）
                    if (result.bool) trigger.target.addTempSkill("duyusw_xingtianpojunfu_skill2");
                },
            },
            duyusw_jinwuluorigong_skill: {
                equipSkill: true,
                audio: "qilin_skill",
                trigger: {
                    player: "loseAfter",
                    global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
                },
                direct: true,
                filter(event, player) {
                    var evt = event.getl(player);
                    return evt && evt.hs && evt.hs.length > 1 && player.isPhaseUsing();
                },
                content() {
                    "step 0";
                    var evt = trigger.getl(player);
                    event.num = evt.hs.length;
                    player
                        .chooseTarget(get.prompt("duyusw_jinwuluorigong_skill"), "弃置一名其他角色的" + get.cnNumber(event.num) + "张牌", function (card, player, target) {
                            return player != target && target.countDiscardableCards(player, "he") > 0;
                        })
                        .set("ai", function (target) {
                            var att = get.attitude(_status.event.player, target);
                            if (target.countDiscardableCards(_status.event.player, "he") >= _status.event.getParent().num) att = att * 2;
                            return -att;
                        });
                    ("step 1");
                    if (result.bool) {
                        var target = result.targets[0];
                        player.logSkill("duyusw_jinwuluorigong_skill", target);
                        player.discardPlayerCard(target, "he", true, num);
                    }
                },
            },
            duyusw_lingsheji_skill: {
                trigger: { player: "phaseUseEnd" },
                equipSkill: true,
                direct: true,
                content() {
                    "step 0";
                    var list = ["摸一张牌"];
                    if (player.countCards("he") > 1) list.push("将一张牌置于武将牌上，于回合结束后获得之");
                    player
                        .chooseControl("cancel2")
                        .set("prompt", get.prompt("duyusw_lingsheji_skill"))
                        .set("choiceList", list)
                        .set("ai", function () {
                            var player = _status.event.player;
                            if (
                                player.countCards("e", function (card) {
                                    return card.name != "tengjia" && get.value(card) <= 0;
                                })
                            )
                                return 1;
                            if (!player.needsToDiscard()) return 0;
                            return 1;
                        });
                    ("step 1");
                    if (result.control == "cancel2") {
                        event.finish();
                        return;
                    }
                    player.logSkill("duyusw_lingsheji_skill");
                    if (result.index == 0) {
                        player.draw();
                        event.finish();
                    } else {
                        player
                            .chooseCard("he", true, function (card, player) {
                                return card != player.getEquip(5);
                            })
                            .set("ai", function (card) {
                                if (get.position(card) == "e" && get.value(card) <= 0) return 10;
                                return (get.position(card) == "h" ? 2 : 1) * -get.value(card);
                            });
                    }
                    ("step 2");
                    player.addSkill("lingsheji2");
                    player.lose(result.cards, ui.special, "toStorage");
                    player.markAuto("lingsheji2", result.cards);
                },
            },
            duyusw_shanrangzhaoshu_skill: {
                trigger: {
                    global: ["gainEnd", "loseAsyncAfter"],
                },
                direct: true,
                filter(event, player) {
                    let min = 0;
                    if (!player.hasSkill("duyusw_shanrangzhaoshu_skill", null, false)) min += get.sgn(player.getEquips("duyusw_shanrangzhaoshu_skill").length);
                    const bool = player.countCards("he") > min;
                    return game.hasPlayer(current => {
                        if (current == player || current == _status.currentPhase) return false;
                        if (!bool && current.countCards("h") == 0) return false;
                        const history = current.getHistory("gain")[0];
                        if (!history) return false;
                        if (event.name == "gain") {
                            return history == event && event.getlx !== false;
                        }
                        return history.getParent() == event;
                    });
                },
                content() {
                    "step 0";
                    event.targets = game
                        .filterPlayer(function (current) {
                            if (current == player || current == _status.currentPhase) return false;
                            const history = current.getHistory("gain")[0];
                            if (!history) return false;
                            if (trigger.name == "gain") {
                                return history == trigger && trigger.getlx !== false;
                            }
                            return history.getParent() == trigger;
                        })
                        .sortBySeat(_status.currentPhase);
                    ("step 1");
                    var target = event.targets.shift();
                    event.target = target;
                    if (target.isIn()) {
                        var list = [];
                        var min = 0;
                        if (!player.hasSkill("duyusw_shanrangzhaoshu_skill", null, false)) min += get.sgn(player.getEquips("duyusw_shanrangzhaoshu_skill").length);
                        if (player.countCards("he") > min) list.push(`交给${get.translation(target)}一张牌`);
                        if (target.countCards("he") > 0) list.push(`令${get.translation(target)}交给你一张牌`);
                        event.list = list;
                        if (list.length == 0) event.goto(4);
                        else if (list.length == 1) event._result = { index: 0 };
                        else
                            player
                                .chooseControl("cancel2")
                                .set("choiceList", list)
                                .set("prompt", get.prompt("duyusw_shanrangzhaoshu_skill", target))
                                .set("ai", function () {
                                    if (get.attitude(_status.event.player, _status.event.getParent().target) < 0) return 1;
                                    return "cancel2";
                                });
                    } else event.goto(4);
                    ("step 2");
                    if (result.control == "cancel2") {
                        event.goto(4);
                        return;
                    }
                    player.logSkill("duyusw_shanrangzhaoshu_skill", target);
                    if (event.list[result.index][0] == "令") {
                        event.gainner = player;
                        event.giver = target;
                        target.chooseCard("he", true, `交给${get.translation(player)}一张牌`);
                    } else {
                        event.giver = player;
                        event.gainner = target;
                        player
                            .chooseCard("he", true, `交给${get.translation(target)}一张牌`)
                            .set("filterCard", function (card, player) {
                                if (_status.event.ignoreCard) return true;
                                var cards = player.getEquips("duyusw_shanrangzhaoshu_skill");
                                if (!cards.includes(card)) return true;
                                return cards.some(cardx => cardx != card && !ui.selected.cards.includes(cardx));
                            })
                            .set("ignoreCard", player.hasSkill("duyusw_shanrangzhaoshu_skill", null, false));
                    }
                    ("step 3");
                    if (result.cards && result.cards.length) event.giver.give(result.cards, event.gainner);
                    ("step 4");
                    if (targets.length > 0) event.goto(1);
                },
            },
            duyusw_mengyanchitu_skill: {
                equipSkill: true,
                mod: {
                    canBeReplaced(card, player) {
                        if (player.getEquips("duyusw_mengyanchitu_skill").includes(card)) return false;
                    },
                },
            },
            duyusw_qixingpao_skill: {
                equipSkill: true,
                inherit: "hongmianbaihuapao_skill",
                // trigger:{
                //     player:"damageBegin4",
                // },
                // filter:(evt, player) => {
                //     return evt.nature && evt.nature == "thunder";
                // },
                // content:() => {
                //     trigger.cancel();
                // },
                // ai:{
                //     nothunder:true,
                //     effect:{
                //         target:function(card, player, target, current) {
                //             if (get.tag(card, "damage") && get.tag(card, "thunderDamage")) return [0, 0];
                //         },
                //     },
                // },
                // "_priority":-25,
            },
            duyusw_xieshenmianju_skill: {
                equipSkill: true,
                forced: true,
                trigger: {
                    player: "turnOverBegin",
                },
                filter: (event, player) => {
                    if (event.num <= 1) return false;
                    if (player.hasSkillTag("unequip2")) return false;
                    if (
                        event.source &&
                        event.source.hasSkillTag("unequip", false, {
                            name: event.card ? event.card.name : null,
                            target: player,
                            card: event.card,
                        })
                    )
                        return false;
                    return true;
                },
                content: () => {
                    trigger.cancel();
                },
                group: "duyusw_xieshenmianju_skill_damage",
                subSkill: {
                    damage: {
                        sub: true,
                        forced: true,
                        trigger: {
                            player: "damageBegin4",
                        },
                        filter: (event, player) => {
                            if (event.num <= 1) return false;
                            if (player.hasSkillTag("unequip2")) return false;
                            if (
                                event.source &&
                                event.source.hasSkillTag("unequip", false, {
                                    name: event.card ? event.card.name : null,
                                    target: player,
                                    card: event.card,
                                })
                            )
                                return false;
                            return true;
                        },
                        content: () => {
                            trigger.num--;
                        },
                        ai: {
                            filterDamage: true,
                            skillTagFilter(player, tag, arg) {
                                if (player.hasSkillTag("unequip2")) return false;
                                if (arg && arg.player) {
                                    if (
                                        arg.player.hasSkillTag("unequip", false, {
                                            name: arg.card ? arg.card.name : null,
                                            target: player,
                                            card: arg.card,
                                        })
                                    )
                                        return false;
                                    if (
                                        arg.player.hasSkillTag("unequip_ai", false, {
                                            name: arg.card ? arg.card.name : null,
                                            target: player,
                                            card: arg.card,
                                        })
                                    )
                                        return false;
                                    if (arg.player.hasSkillTag("jueqing", false, player)) return false;
                                }
                            },
                        },
                        _priority: 0,
                    },
                },
                _priority: -25,
            },
            duyusw_jishengong_skill: {
                equipSkill: true,
                trigger: {
                    source: "damageBegin2",
                },
                filter: (evt, player) => {
                    return evt.card && evt.card.name == "sha" && evt.player != player && evt.player.countCards("e");
                },
                content: () => {
                    player.gainPlayerCard(trigger.player, 1, true, "e");
                },
                _priority: -25,
            },
            duyusw_baihuaqun_skill: {
                equipSkill: true,
                forced: true,
                trigger: {
                    player: "damageBegin1",
                },
                filter: (event, player) => {
                    if (player.hp != 1) return false;
                    if (player.hasSkillTag("unequip2")) return false;
                    if (
                        event.source &&
                        event.source.hasSkillTag("unequip", false, {
                            name: event.card ? event.card.name : null,
                            target: player,
                            card: event.card,
                        })
                    )
                        return false;
                    return true;
                },
                content: () => {
                    trigger.cancel();
                },
                ai: {
                    filterDamage: true,
                    skillTagFilter(player, tag, arg) {
                        if (player.hasSkillTag("unequip2")) return false;
                        if (arg && arg.player) {
                            if (
                                arg.player.hasSkillTag("unequip", false, {
                                    name: arg.card ? arg.card.name : null,
                                    target: player,
                                    card: arg.card,
                                })
                            )
                                return false;
                            if (
                                arg.player.hasSkillTag("unequip_ai", false, {
                                    name: arg.card ? arg.card.name : null,
                                    target: player,
                                    card: arg.card,
                                })
                            )
                                return false;
                            if (arg.player.hasSkillTag("jueqing", false, player)) return false;
                        }
                        if (player.hp == 1) return true;
                        return false;
                    },
                },
            },

            // ===== 刑天破军斧 · 衍生技（封牌）=====
            //  效果：不能使用或打出牌，且防具技能无效，直到回合结束。
            //  ⚠ 原来这里借用了 星之梦 的 `xingtianpojunfu2`，但那张技能只存在于星之梦的卡包里；
            //    星之梦没启用（或没被加载）时 `lib.skill` 里根本没有它 ⇒ addTempSkill 静默失败，
            //    于是刑天破军斧「有音效、有提示，但不封牌」。
            duyusw_xingtianpojunfu_skill2: {
                equipSkill: true,
                mark: true,
                intro: { content: "不能使用或打出牌且防具技能无效直到回合结束" },
                mod: {
                    cardEnabled() {
                        return false;
                    },
                    cardSavable() {
                        return false;
                    },
                    cardRespondable() {
                        return false;
                    },
                },
                ai: { unequip2: true },
            },

            // ===== 鬼龙斩月刀（星之梦 sw_ 版没有对应的技能实现，这里自己写）=====
            //  锁定技：你使用的红色【杀】不可被响应、不计入次数，且无距离与次数限制。
            duyusw_guilongzhanyuedao_skill: {
                equipSkill: true,
                trigger: { player: "useCard1" },
                forced: true,
                filter(event, player) {
                    return event.card && event.card.name === "sha" && get.color(event.card) === "red";
                },
                content() {
                    // 不可被响应（目标不能出【闪】）
                    trigger.directHit = game.filterPlayer(current => current !== player);
                    // 不计入使用次数
                    trigger.addCount = false;
                },
                mod: {
                    // 无次数限制
                    cardUsable(card, player, num) {
                        if (card && card.name === "sha" && get.color(card) === "red") return true;
                        return num;
                    },
                    // 无距离限制
                    targetInRange(card, player, target) {
                        if (card && card.name === "sha" && get.color(card) === "red") return true;
                    },
                },
            },
            // ===== 圣光白衣（2026 加强版：红色牌与无色牌对你无效）=====
            //  ① 红色牌 / 无色牌（如雷杀、无色锦囊）对你**无效**
            //     ⚠ 走 `useCardToBefore` 这个「对目标生效前」时机，用 `trigger.cancel()` 取消，
            //       与官方【奇门八卦】（sp/skill.js:20957）同一套写法；
            //       这样杀、决斗、火攻、南蛮、万箭等所有会指定目标的牌都覆盖到。
            //  ② 你的手牌上限 +2（mod.maxHandcard）
            duyusw_shengguangbaiyi_skill: {
                equipSkill: true,
                trigger: { target: "useCardToBefore" },
                forced: true,
                filter(event, player) {
                    // 自己用的牌不受影响
                    if (!event.card || event.player === player) return false;
                    // 被「无视防具」类标记时失效（与官方防具技一致）
                    if (player.hasSkillTag("unequip2")) return false;
                    if (
                        event.player.hasSkillTag("unequip", false, {
                            name: event.card ? event.card.name : null,
                            target: player,
                            card: event.card,
                        })
                    ) {
                        return false;
                    }
                    const color = get.color(event.card);
                    return color === "red" || color === "none";
                },
                content() {
                    // 取消这张牌对本角色的效果
                    trigger.cancel();
                },
                mod: {
                    maxHandcard: (player, num) => num + 2,
                },
                ai: {
                    effect: {
                        target(card, player, target) {
                            if (target.hasSkillTag("unequip2")) return;
                            const color = card ? get.color(card) : "none";
                            if (color === "red" || color === "none") return [0, 0];
                        },
                    },
                },
            },
        },
        translate: {
            // 卡牌包显示名（选项→卡牌包 里显示的就是这个）
            dmqc_duyusw: "大梦千秋·神武",
            duyusw_guilongzhanyuedao: "鬼龙斩月刀",
            duyusw_guilongzhanyuedao_skill: "鬼龙斩月刀",

            duyusw_guilongzhanyuedao_info: "锁定技，你使用的红色【杀】不可被响应、不计入次数，无次数距离限制。",
            duyusw_guilongzhanyuedao_skill_info: "锁定技，你使用的红色【杀】不可被响应、不计入次数，无次数距离限制。",
            duyusw_guofengyupao: "国风玉袍",
            duyusw_guofengyupao_info: "锁定技，你不是其他角色使用普通锦囊牌的合法目标。",
            duyusw_qimenbagua: "奇门八卦",
            duyusw_qimenbagua_info: "锁定技，【杀】对你无效。",
            duyusw_chiyanzhenhunqin: "赤焰镇魂琴",
            // duyusw_chiyanzhenhunqin_info:"锁定技，你造成的伤害均视为火焰伤害。",
            duyusw_chiyanzhenhunqin_info: "锁定技，你造成的伤害均视为火焰伤害；你造成的不因此装备转化的火属性伤害+1。",
            duyusw_chiyanzhenhunqin_skill: "赤焰镇魂琴",
            // duyusw_chiyanzhenhunqin_skill_info:"锁定技，你造成的伤害均视为火焰伤害。",
            duyusw_chiyanzhenhunqin_skill_info: "锁定技，你造成的伤害均视为火焰伤害；你造成的不因此装备转化的火属性伤害+1。",
            duyusw_juechenjinge: "绝尘金戈",
            // "juechenjinge_info":"结束阶段，你可以选择任意角色，令其他角色计算与这些角色距离时+1直到你下回合开始。当你失去装备区里的此牌时，你移除此效果。",
            duyusw_juechenjinge_info: "锁定技，①其他角色计算与你的距离时+1；②当你受到伤害时，若伤害值为奇数，你回复一点体力，然后此伤害+1。",
            duyusw_juechenjinge_skill: "绝尘金戈",
            duyusw_juechenjinge_skill_info: "锁定技，①其他角色计算与你的距离时+1；②当你受到伤害时，若伤害值为奇数，你回复一点体力，然后此伤害+1。",
            duyusw_xiuluolianyuji: "修罗炼狱戟",
            duyusw_xiuluolianyuji_info: "①你使用【杀】可以多指定任意攻击范围内的角色为目标；②锁定技，当你使用【杀】造成伤害时，此伤害+1，然后受伤角色回复一点体力。",
            duyusw_xiuluolianyuji_skill: "修罗炼狱戟",
            duyusw_xiuluolianyuji_skill2: "修罗炼狱戟",
            duyusw_xiuluolianyuji_skill_info: "①你使用【杀】可以多指定任意攻击范围内的角色为目标；②锁定技，当你使用【杀】造成伤害时，此伤害+1，然后受伤角色回复一点体力。",
            duyusw_chixueqingfeng: "赤血青锋",
            duyusw_chixueqingfeng_info: "锁定技，你使用【杀】指定目标时，你令目标角色防具技能失效，且不能使用或打出手牌直到此杀结算。",
            duyusw_xuwangzhimian: "虚妄之冕",
            duyusw_xuwangzhimian_info: "锁定技，你摸牌阶段额定摸牌数+2，你的手牌上限-1。",
            duyusw_qicaishenlu: "七彩神鹿",
            duyusw_qicaishenlu_info: "锁定技，①你计算与其他角色距离时-1；②当你造成属性伤害时，此伤害+1。",
            duyusw_qicaishenlu_skill: "七彩神鹿",
            duyusw_qicaishenlu_skill_info: "锁定技，①你计算与其他角色距离时-1；②当你造成属性伤害时，此伤害+1。",
            duyusw_luanfenghemingjian: "鸾凤和鸣剑",
            duyusw_luanfenghemingjian_info: "当你使用【杀】指定目标后，你可以令此【杀】的目标选择一项：1.你摸一张牌；2.弃置一张牌。",
            duyusw_luanfenghemingjian_skill: "鸾凤和鸣剑",
            duyusw_luanfenghemingjian_skill_info: "当你使用【杀】指定目标后，你可以令此【杀】的目标选择一项：1.你摸一张牌；2.弃置一张牌。",
            duyusw_xingtianpojunfu: "刑天破军斧",
            duyusw_xingtianpojunfu_info: "出牌阶段，当你使用牌指定唯一目标后，你可以弃置两张牌，令其本回合防具无效且不能使用或打出牌。",
            duyusw_xingtianpojunfu_skill: "刑天破军斧",
            duyusw_xingtianpojunfu_skill2: "刑天破军斧",
            duyusw_xingtianpojunfu_skill_info: "出牌阶段，当你使用牌指定唯一目标后，你可以弃置两张牌，令其本回合防具无效且不能使用或打出牌。",
            duyusw_jinwuluorigong: "金乌落日弓",
            duyusw_jinwuluorigong_info: "当你一次性失去至少两张手牌后，你可以弃置一名其他角色等量的牌。",
            duyusw_jinwuluorigong_skill: "金乌落日弓",
            duyusw_jinwuluorigong_skill_info: "当你一次性失去至少两张手牌后，你可以弃置一名其他角色等量的牌。",
            duyusw_lingsheji: "灵蛇髻",
            duyusw_lingsheji_info: "出牌阶段结束时，你可以选择一项：1.摸一张牌；2.将一张牌置于武将牌上，然后于结束阶段开始时获得之。",
            duyusw_lingsheji_skill: "灵蛇髻",
            duyusw_lingsheji_skill2: "灵蛇髻",
            duyusw_lingsheji_skill_info: "出牌阶段结束时，你可以选择一项：1.摸一张牌；2.将一张牌置于武将牌上，并于回合结束后获得此牌。",
            duyusw_shanrangzhaoshu: "禅让诏书",
            duyusw_shanrangzhaoshu_info: "其他角色于回合外得到牌后，若是其本回合内第一次得到牌，则你可以选择一项：1.交给其一张牌；2.令其交给你一张牌。",
            duyusw_shanrangzhaoshu_skill: "禅让诏书",
            duyusw_shanrangzhaoshu_skill_info: "其他角色于回合外得到牌后，若是其本回合内第一次得到牌，则你可以选择一项：1.交给其一张牌；2.令其交给你一张牌。",
            duyusw_sanshou: "三首",
            duyusw_sanshou_info: "当你受到伤害时，你可以亮出牌堆顶3张牌，若其中有本回合未使用过的牌的类型，防止此伤害。",
            duyusw_wushuangfangtianji: "无双方天戟",
            duyusw_wushuangfangtianji_info: "你使用【杀】对目标角色造成伤害后，你可以摸一张牌或弃置目标角色一张牌。",
            duyusw_shufazijinguan: "束发紫金冠",
            duyusw_shufazijinguan_info: "准备阶段，你可以对一名其他角色造成一点伤害。",
            duyusw_hongmianbaihuapao: "红棉百花袍",
            duyusw_hongmianbaihuapao_info: "锁定技，防止你受到的属性伤害。",
            duyusw_linglongshimandai: "玲珑狮蛮带",
            duyusw_linglongshimandai_info: "当你成为其他角色使用牌的目标时，你可以判定，若结果为♥，此牌对你无效。",
            duyusw_mengyanchitu: "梦魇赤兔",
            duyusw_mengyanchitu_skill: "梦魇赤兔",
            duyusw_mengyanchitu_info: "锁定技，你计算与其他角色距离时-1，其他角色计算与你距离时+1。",
            duyusw_mengyanchitu_skill_info: "锁定技，你计算与其他角色距离时-1，其他角色计算与你距离时+1。",
            duyusw_qixingpao: "七星袍",
            duyusw_qixingpao_skill: "七星袍",
            duyusw_qixingpao_info: "锁定技，当你受到伤害时，若此伤害为属性伤害，防止之。",
            duyusw_qixingpao_skill_info: "锁定技，当你受到伤害时，若此伤害为属性伤害，防止之。",
            duyusw_shengguangbaiyi: "圣光白衣",
            duyusw_shengguangbaiyi_skill: "圣光白衣",
            duyusw_shengguangbaiyi_info: "锁定技，①红色牌和无色牌对你无效；②你的手牌上限+2。",
            duyusw_shengguangbaiyi_skill_info: "锁定技，①红色牌和无色牌对你无效；②你的手牌上限+2。",
            duyusw_xieshenmianju: "邪神面具",
            duyusw_xieshenmianju_skill: "邪神面具",
            duyusw_xieshenmianju_info: "锁定技，①你的武将牌不能被翻面；②当你受到大于1点伤害时，防止此伤害。",
            duyusw_xieshenmianju_skill_info: "锁定技，①你的武将牌不能被翻面；②当你受到大于1点伤害时，防止此伤害。",
            duyusw_jishengong: "姬神弓",
            duyusw_jishengong_skill: "姬神弓",
            duyusw_jishengong_info: "当你使用牌造成伤害后，你可以获得目标角色的一张牌。",
            duyusw_jishengong_skill_info: "当你使用牌造成伤害后，你可以获得目标角色的一张牌。",
            duyusw_baihuaqun: "百花裙",
            duyusw_baihuaqun_skill: "百花裙",
            duyusw_baihuaqun_info: "锁定技，①防止你受到的所有大于等于你当前体力值的伤害；②当你失去装备区里的【百花裙】时，你摸2张牌。",
            duyusw_baihuaqun_skill_info: "锁定技，①防止你受到的所有大于等于你当前体力值的伤害；②当你失去装备区里的【百花裙】时，你摸2张牌。",
        },

        // ⚠ 本包**刻意不提供 `list`（牌堆）**。
        // 这些神武不属于牌堆：它们只由梦杜预【三陈】（倾势·失败分支）在发动时现场造出来装备，
        // 走的是 `lib.card` 里的定义 + 三陈自己的神武白名单（character/sgz_duyu.js 的
        // SGZ_DUYU_SHENWU），**与牌堆无关**（`sgzDuyuEquipCandidates` 读 lib.card，
        // 得到后用 game.createCard 现造）。
        // 一旦写了 list，只要这个卡牌包被勾选，引擎就会把这里列出的牌整批塞进 lib.card.list，
        // 于是它们在牌堆里被当成普通牌摸到/弃置 —— 那不是本包想要的。
        // 如果将来确实要它们进牌堆，再补 list，并同步在「选项→卡牌包」里勾选本包。
    };
    return duyuswCard;
});
// ============================================================
//  集巧生烟（sgz_jqsy）· 梦黄月英专属锦囊
// ------------------------------------------------------------
//  出牌阶段主动使用：随机获得一个「原数量为1」的额外装备栏，
//  并获得两件随机神武（神武池 = 本包所有 duyusw_ 装备，**含宝物 equip5**）。
//  ⚠ 2026 改动：原来的「② 响应式令锦囊无效」已按需求**删除**，
//    这张牌现在只有主动使用一种用法（作为普通锦囊，可被【无懈可击】响应）。
//  ⚠ 本包刻意不写 `list`：集巧生烟不进默认牌堆，由梦黄月英【绮梦】①在开局造 8 张。
// ============================================================
game.import("card", () => {
    return {
        name: "dmqc_jqsy",
        connect: true,
        card: {
            sgz_jqsy: {
                // 卡面**始终用原皮图**（梦黄月英的原画 `image/sgz_huangyueying.jpg`），
                // 不随角色当前换的动皮（如「惊鸿一瞥」）变化；角色文件里还有一道运行期再确认。
                //image: "ext:大梦千秋/image/sgz_huangyueying.jpg",
                fullskin: true,
                type: "trick",
                // 出牌阶段主动使用（无目标）
                enable: true,
                notarget: true,
                // ② 已按需求删除：这张牌只剩「主动使用」一种用法，作为普通锦囊可被无懈响应
                async content(event, trigger, player) {
                    // ============ ① 扩一个「原数量为 1」的装备栏 ============
                    // 「原数量为1」= 该栏位当前只有 1 个（还没被扩展过 / 没被废除过）
                    const ALL_SLOTS = ["equip1", "equip2", "equip3", "equip4", "equip5"];
                    const slotCapacity = (slot) => {
                        try {
                            return player.countEnabledSlot(slot);
                        } catch (e) {
                            return 1;
                        }
                    };
                    const slotUsed = (slot) => {
                        try {
                            return player.getVEquips(slot).length;
                        } catch (e) {
                            return player.getEquips(slot).length;
                        }
                    };
                    // 一张神武可能同时占多个栏位（equip3_4 的双坐骑），统一展开成单栏位列表
                    const cardSlots = (name) => {
                        const info = lib.card[name] || {};
                        let subtypes = Array.isArray(info.subtypes) ? info.subtypes.slice(0) : info.subtype ? [info.subtype] : [];
                        const out = [];
                        for (const s of subtypes) {
                            if (s === "equip3_4") out.push("equip3", "equip4");
                            else out.push(s);
                        }
                        return out.filter((s) => ALL_SLOTS.includes(s));
                    };

                    const expandable = ALL_SLOTS.filter((slot) => slotCapacity(slot) === 1);
                    if (expandable.length) {
                        const slot = expandable[Math.floor(Math.random() * expandable.length)];
                        await player.expandEquip(slot);
                        game.log(player, "获得了额外的一个", "#g" + get.translation(slot), "栏");
                    } else {
                        game.log(player, "所有装备栏都已扩展过，本次不再扩容");
                    }

                    // ============ ② 随机装备一张神武 ============
                    //   优先：随机挑一个**还空着的**装备栏，装备一张能放进该栏的神武；
                    //   空栏全满：退化成「完全随机」——随机一张神武，装进它能放的位置。
                    const pool = Object.keys(lib.card).filter((name) => name.indexOf("duyusw_") === 0 && get.type(name) === "equip");
                    if (!pool.length) return;
                    const canEquip = (name) => {
                        try {
                            return player.canEquip({ name });
                        } catch (e) {
                            return true;
                        }
                    };
                    // 还空着的栏位（已装备件数 < 栏位总数）
                    const emptySlots = ALL_SLOTS.filter((slot) => slotUsed(slot) < slotCapacity(slot));
                    let candidates = [];
                    if (emptySlots.length) {
                        const slot = emptySlots[Math.floor(Math.random() * emptySlots.length)];
                        candidates = pool.filter((name) => cardSlots(name).includes(slot) && canEquip(name));
                    }
                    // 空栏里没有对应的神武（或压根没有空栏）→ 完全随机
                    if (!candidates.length) candidates = pool.filter(canEquip);
                    if (!candidates.length) candidates = pool;
                    const name = candidates[Math.floor(Math.random() * candidates.length)];
                    const suits = ["heart", "spade", "diamond", "club"];
                    const card = game.createCard(name, suits[Math.floor(Math.random() * suits.length)], Math.ceil(Math.random() * 13));
                    game.log(player, "随机装备了", card);
                    // 直接置入装备区（`player.equip` 会自己挑一个能放的栏位；放不下的会被引擎弃掉）
                    await player.equip(card);
                },
                ai: {
                    // ① 主动使用：给足优先级与价值，AI 会**优先**打出来
                    //   · `order`  → get.order 用它排出牌顺序（越高越先出），见 get/index.js:6383
                    //   · `value`  → get.value 用它算保留价值（越高越不肯丢）
                    //   · `useful` → get.useful 用它算使用意愿
                    //   ⇒ 白拿一个装备栏 + 直接装上一张神武，属于「开局就该放」的牌。
                    order: 10,
                    basic: {
                        order: 10,
                        useful: 10,
                        value: 9,
                    },
                    // 使用收益：给个明显偏高的正数（AI 会认为这是稳赚的操作）
                    result: { player: 10 },
                    expose: 0.2,
                },
            },
        },
        translate: {
            sgz_jqsy: "集巧生烟",
            sgz_jqsy_info:
                "出牌阶段，你可以使用此牌：令随机一个数量为1的装备栏获得一个额外的装备栏，然后随机装备一张神武（空装备栏优先）。",
        },
    };
});
