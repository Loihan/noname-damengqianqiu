export default {
    character: {
        // 梦郭嘉：神势力，4体力
        dmqc_mguojia: ["male", "shen", 3, ["dmqc_guanxu","dmqc_kuitian","dmqc_jihui","dmqc_tianshang"], [
            "des:天道无常，皆入我梦。这牌堆顶的方寸之地，便是尔等无法逾越的深渊。",
            "ext:大梦千秋/image/dmqc_guojia.jpg",
            "die:ext:大梦千秋/audio/dmqc_guojia/die/die.mp3",
        ]],
    },
    characterName: 'dmqc_mguojia',
    characterTranslate: {
        dmqc_mguojia: "梦郭嘉",
    },
    skills: {
        // === 1. 窥天 (印锦囊) ===
        dmqc_kuitian: {
            audio: "ext:大梦千秋/audio/dmqc_guojia/skill:8",
            persevereSkill: true,
            // 修改点：允许在使用牌和响应牌的时机发动（涵盖了回合内所有可操作瞬间）
            enable: ["chooseToUse", "chooseToRespond"],
            onChooseToUse: function(event) {
                if (!game.online) {
                    const cards = [];
                    for (let name of lib.inpile) {
                        if (get.type(name, null, false) != "trick") continue;
                        const card = get.autoViewAs({ name, isCard: true }, []);
                        if (event.filterCard(card, event.player, event)) cards.add(name);
                    }
                    event.set("dmqc_kuitian_list", cards);
                }
            },
            // 修改点：限制只能在自己的回合内发动
            filter: function(event, player) { 
                return _status.currentPhase == player && event.dmqc_kuitian_list?.length; 
            },
            chooseButton: {
                dialog: function(event, player) {
                    const list = event.dmqc_kuitian_list.map(name => ["锦囊", "", name]);
                    return ui.create.dialog("窥天", [list, "vcard"]);
                },
                check: function(button) {
                    const player = get.player(), card = get.autoViewAs({ name: button.link[2], isCard: true }, []);
                    if (["wugu", "zhulu_card", "yiyi", "lulitongxin", "lianjunshengyan", "diaohulishan"].includes(card.name)) return 0;
                    return player.getUseValue(card);
                },
                backup: function(links, player) {
                    return {
                        filterCard: false,
                        selectCard: 0,
                        popname: true,
                        viewAs: get.autoViewAs({ name: links[0][2], isCard: true }, []),
                        async precontent(event, trigger, player) {
                            var num = [1, 2, 3, 4, 5, 6, 7, 8].randomGet();
                            game.playAudio('../extension/大梦千秋/audio/dmqc_guojia/skill/dmqc_kuitian' + num + '.mp3');

                            // 修改点：标记现在持续到整个回合结束 (phaseAfter)
                            player.addTempSkill("dmqc_kuitian_used", { player: "phaseAfter" });
                            player.addMark("dmqc_kuitian_used", 1, false);
                            
                            player.when({ player: "useCardAfter" }).filter(evt => evt.skill == "dmqc_kuitian_backup").step(async function (event, trigger, player) {
                                // 判定标准：当前回合总次数 > 体力上限
                                if (player.countMark("dmqc_kuitian_used") > player.maxHp) {
                                    await player.loseMaxHp(1);
                                    game.log(player, '本回合连续发动【窥天】，受到梦境反噬减1上限');
                                }
                            });
                        },
                    };
                },
                prompt: function(links, player) { return "窥天：视为使用一张" + get.translation(links[0][2]); },
            },
            subSkill: {
                backup: { sub: true },
                used: {
                    sub: true,
                    onremove: true,
                    charlotte: true,
                    mark: true,
                    marktext: "窥天",
                    intro: {
                        markcount: "mark",
                        content: function(storage) { return `本回合已发动${storage}次`; },
                    },
                },
            },
        },
        // === 2. 观虚(傲才体力上限)===
        dmqc_guanxu: {
            audio: "ext:大梦千秋/audio/dmqc_guojia/skill:10",
            persevereSkill: true,
            hiddenCard(player, name) {
                const type = get.type2(name);
                if (!["basic", "trick"].includes(type)) return false;
                if (type == "basic" && _status.currentPhase != player) return true;
                else if (type == "trick" && _status.currentPhase == player) return true;
            },
            clickable(player) {
                if (player.isUnderControl(true)) {
                    const cards = lib.skill.dmqc_guanxu.getCards(player);
                    function createDialogWithControl(result) {
                        const dialog = ui.create.dialog("观虚", "peaceDialog");
                        result.length > 0 ? dialog.add(result, true) : dialog.addText("牌堆顶无牌");
                        const control = ui.create.control("确定", () => dialog.close());
                        dialog._close = dialog.close;
                        dialog.hide = dialog.close = function (...args) {
                            control.close();
                            return dialog._close(...args);
                        };
                        if (_status.dmqc_guanxu_clickable) _status.dmqc_guanxu_clickable.close();
                        _status.dmqc_guanxu_clickable = dialog;
                        dialog.open();
                    }
                    if (cards instanceof Promise) cards.then(([ok, result]) => createDialogWithControl(result));
                    else createDialogWithControl(cards);
                }
            },
            getCards(player) {
                let cards = [];
                if (game.online) return game.requestSkillData("dmqc_guanxu", "getTopCards", 10000);
                else {
                    if (ui.cardPile.hasChildNodes !== false) cards = Array.from(ui.cardPile.childNodes).slice(0, player.maxHp);
                }
                game.addCardKnower(cards, player);
                return cards;
            },
            sync: {
                getTopCards(client) {
                    const player = client.player;
                    if (ui.cardPile.hasChildNodes !== false) {
                        let cards = Array.from(ui.cardPile.childNodes).slice(0, player.maxHp);
                        game.addCardKnower(cards, player);
                        return cards;
                    }
                    return [];
                },
            },
            mark: true,
            marktext: "观虚",
            intro: {
                markcount(storage, player) { return player.maxHp; },
                mark(dialog, storage, player, event, skill) {
                    const intronode = ui.create.div(".menubutton.pointerdiv", "点击发动", function () {
                        if (!this.classList.contains("disabled")) {
                            this.classList.add("disabled");
                            this.style.opacity = 0.5;
                            lib.skill[skill].clickable(player);
                        }
                    });
                    if (!_status.gameStarted || !player.isUnderControl(true)) {
                        intronode.classList.add("disabled");
                        intronode.style.opacity = 0.5;
                    }
                    dialog.add(intronode);
                },
            },
            group: "dmqc_guanxu_aocai",
            subSkill: {
                aocai: {
                    audio: "ext:大梦千秋/audio/dmqc_guojia:1",
                    mod: {
                        cardEnabled2(card, player) {
                            if (card?.hasGaintag?.("dmqc_guanxu")) {
                                let type = get.type2(card);
                                if (type == "basic" && _status.currentPhase == player) return false;
                                else if (type == "trick" && _status.currentPhase != player) return false;
                                else if (type == "equip") return false;
                            }
                        },
                        aiOrder(player, card, num) { if (card?.hasGaintag?.("dmqc_guanxu")) return num + 0.1; },
                    },
                    onChooseToUse(event) {
                        if (game.online) return;
                        const player = event.player;
                        let cards = player.getCards("s", card => card.hasGaintag("dmqc_guanxu"));
                        if (cards.length) game.deleteFakeCards(cards);
                        if (ui.cardPile.hasChildNodes !== false) {
                            cards = Array.from(ui.cardPile.childNodes).slice(0, player.maxHp);
                            player.directgains(game.createFakeCards(cards), null, "dmqc_guanxu");
                        }
                    },
                    onChooseToRespond(event) {
                        if (game.online) return;
                        const player = event.player;
                        let cards = player.getCards("s", card => card.hasGaintag("dmqc_guanxu"));
                        if (cards.length) game.deleteFakeCards(cards);
                        if (ui.cardPile.hasChildNodes !== false) {
                            cards = Array.from(ui.cardPile.childNodes).slice(0, player.maxHp);
                            player.directgains(game.createFakeCards(cards), null, "dmqc_guanxu");
                        }
                    },
                    trigger: { player: ["useCardBefore", "respondBefore", "chooseToUseAfter", "chooseToRespondAfter"] },
                    filter(event, player) {
                        if (["useCard", "respond"].includes(event.name)) {
                            const pile = Array.from(ui.cardPile.childNodes).slice(0, player.maxHp);
                            return event.cards?.some(card => pile.some(cardx => cardx.cardid == card._cardid));
                        }
                        return true;
                    },
                    forced: true,
                    popup: false,
                    async content(event, trigger, player) {
                        if (["useCard", "respond"].includes(trigger.name)) {
                            if (!trigger.skill) trigger.skill = "dmqc_guanxu";
                            else await player.logSkill("dmqc_guanxu");
                            const cards = await get.info("dmqc_guanxu").getCards(player);
                            for (let i = 0; i < trigger.cards.length; i++) {
                                const card = trigger.cards[i];
                                const cardx = cards.find(cardx => cardx.cardid == card._cardid);
                                if (cardx) {
                                    trigger.cards[i] = cardx;
                                    trigger.card.cards[i] = cardx;
                                }
                            }
                        }
                        let cards = player.getCards("s", card => card.hasGaintag("dmqc_guanxu"));
                        if (cards.length) game.deleteFakeCards(cards);
                    },
                },
            },
        },

        // === 3. 天殇 (动态上限修正) ===
        dmqc_tianshang: {
            audio: "ext:大梦千秋/audio/dmqc_guojia/skill:3",
            persevereSkill: true,
            forced: true,
            // 时机：每名角色回合结束时
            trigger: { global: "phaseAfter" },
            filter: function(event, player) {
                // 必须已受伤（即体力 < 体力上限）
                return player.hp < player.maxHp;
            },
            content: function() {
                "step 0"
                // 计算需要失去多少上限来对齐当前体力
                var diff = player.maxHp - player.hp;
                if (diff > 0) {
                    player.logSkill('dmqc_tianshang');
                    game.log(player, '受梦境反噬，体力上限被修正为', player.hp);
                    // 使用 loseMaxHp(diff, true) 以强制、静默的方式对齐
                    player.loseMaxHp(diff, true);
                }
            }
        },
        // === 4. 极慧 (慧识) ===
        dmqc_jihui: {
            audio: "ext:大梦千秋/audio/dmqc_guojia/skill:5",
            persevereSkill: true,
            // 触发时机：出牌阶段主动 或 受到伤害后
            enable: "phaseUse",
            usable: 1, 
            trigger: { player: "damageEnd" },
            frequent: true,
            filter: function(event, player) {
                // 两个条件：受损或主动阶段。且体力上限小于10。
                return player.maxHp < 10;
            },
            content: function() {
                "step 0"
                event.cards = []; // 存储所有判定牌
                event.suits = []; // 存储所有判定出的花色
                "step 1"
                // 进行判定，使用 callback 处理循环逻辑
                player.judge(function(result) {
                    var evt = _status.event.getParent("dmqc_jihui");
                    // 核心逻辑：若判定牌花色与之前花色不重复，则成功(返回1)，否则失败(返回0)
                    if (evt && evt.suits && evt.suits.includes(get.suit(result))) return 0;
                    return 1;
                }).set("callback", lib.skill.dmqc_jihui.callback).judge2 = function(result) {
                    return result.bool ? true : false;
                };
                "step 2"
                // 流程结束，获得所有位于处理区的判定牌（过滤掉由于其他原因丢失的牌）
                var cardsToGain = event.cards.filterInD('o');
                if (cardsToGain.length) {
                    player.gain(cardsToGain, 'gain2');
                    game.log(player, '获得了判定牌：', cardsToGain);
                }
            },
            // 处理循环逻辑的 callback
            callback: function() {
                "step 0"
                var evt = event.getParent(2); // 获取主技能事件对象
                // 将判定牌移出 orderingCards（处理区弃置队列），使其不入弃牌堆
                event.getParent().orderingCards.remove(event.judgeResult.card);
                evt.cards.push(event.judgeResult.card); // 记录这张牌
                
                // 如果判定成功且体力上限仍小于10
                if (event.getParent().result.bool && player.maxHp < 10) {
                    evt.suits.push(event.getParent().result.suit); // 记录花色
                    player.gainMaxHp(1); // 增加1点体力上限
                    // 询问是否重复流程
                    player.chooseBool("极慧：判定花色不重复且增加了一点体力上限，是否继续？").set("frequentSkill", "dmqc_jihui");
                } else {
                    event._result = { bool: false };
                }
                "step 1"
                if (result.bool) {
                    event.getParent(2).goto(1); // 回到 step 1 重复判定
                }
            },
            ai: {
                order: 9,
                result: { player: 1 }
            }
        }
    },
    skillTranslate: {
        dmqc_kuitian: "窥天",
        dmqc_kuitian_info: "持恒技，你的回合内，你可以视为使用任意普通锦囊牌。以此法使用的牌结算后，若你于本回合内发动此技能的次数大于你的体力上限，你减1点体力上限。",
        dmqc_guanxu: "观虚",
        dmqc_guanxu_info: "持恒技，牌堆顶的X张牌始终对你可见（X为你的体力上限）。你的回合内/外，你可以如手牌般使用或打出其中的锦囊牌/基本牌。",
        dmqc_jihui: "极慧",
        dmqc_jihui_info: "持恒技。出牌阶段限一次或当你每回合首次受到伤害后，若你的体力上限<10，你可重复执行以下流程：{①进行一次判定；②若出现过相同花色或你的体力上限≥10则跳出大括号里的内容；③增加一点体力上限}，你获得所有以此法产生的判定牌。",
        dmqc_tianshang: "天殇",
        dmqc_tianshang_info: "持恒技，锁定技。每名角色的回合结束时，若你已受伤，你将体力上限调整至与体力相同。",
    },
    characterTaici:{
        "dmqc_kuitian": { order: 1, content: "公行此策，必获大捷！<br>笑揽世间众生，坐观天行定数！<br>人心所向，未来之事，皆一睹而尽知。<br>时事兼备，主公复有何忧？<br>主公且看，锦绣山河已尽在囊中！<br>今九州纷乱，当祈天翊佑。<br>此乃天助，主公万勿失其时也。<br>丧家之犬，主公实不足虑也。" },
        "dmqc_guanxu": { order: 2, content: "不过星霭云雾，岂可挡我七窍清明。<br>星辰虽小，难掩其明。<br>此诚天赐余之主也。<br>身计国谋，不可两遂。<br>聪以知远，明以察微。<br>见微知著，识人心志。<br>天命靡常，惟德是辅。<br>以聪虑难，悉咨于上。<br>奉孝不才，愿献勤心。<br>殚思极虑，以临制变。" },
        "dmqc_jihui": { order: 3, content: "人亦如星，或居空而渺然，或为彗而明夜。<br>沥血书辞，以效区区之忠。<br>借天秘力，佐公之事，感有荣焉。<br>吾计均已言明，主公可自择而行。<br>且为明公巧借天时。" },
        "dmqc_tianshang":{ order: 4, content: "纵殒身祭命，亦要助明公大业！<br>行将就木，良谋难施。<br>可叹桢干命也迂。" },
        "die": { content: "未及引动天能，竟已要坠入轮回..." },
    }
};