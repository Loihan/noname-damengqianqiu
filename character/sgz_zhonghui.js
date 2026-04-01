export default {
    character: {
        // 梦钟会：势力神，体力1，上限按原版逻辑由技能维持
        sgz_zhonghui: ["male", "shen", 1, ["sgz_quanji", "sgz_fensi", "sgz_jitian", "sgz_zhuyue", "sgz_xingfa","sgz_audio_effect", "sgz_zhonghui_texiao"], [
            "des:钟会字士季，颖川之杰也。少负绝代之才，精于权略，时人比之子房。<br>景元四年，会统大军入蜀，剑指成都。及蜀汉既平，会功冠诸军，然其心高傲，不甘久居司马氏之下。彼深忿邓艾先入之功，遂假权谋之策，诬艾谋逆，籍没其军，由是独擅益州，威震西南。<br>会有揽月逐影之志，自谓才足冠世，何必为人臣之列？见洛阳篡臣当道，汉鼎迁移，遂萌觊觎神器之心。会乃称帝于成都，布告天下，正式自立。司马昭闻变震怒，起倾国之兵远征。会仗剑立于剑阁，激赏士卒，反兴义师而北伐。是役也，会奇计百出，诱敌深入于巴蜀险峻之间，终使中原大军折戟山谷。<br>自此，会据秦岭之险，分天下之半，三足鼎立之势复兴。后世论之，谓其志虽肆，其才实奇，终能于乱世孤影之中，强自逐月，开一朝之基命，成不世之枭雄。",
            "ext:大梦千秋/image/sgz_zhonghui.jpg",
            "die:ext:大梦千秋/audio/sgz_zhonghui/die/die.mp3"
        ]],
    },
    characterName: 'sgz_zhonghui',
    characterTranslate: {
        sgz_zhonghui: "钟会",
    },
    characterTitle: {
        sgz_zhonghui: "白霜降世",
    },
    skills: {
        // === 1. 权计 (保留 async 结构与核心逻辑) ===
        sgz_quanji: {
            forced: true,
            trigger: {
                global: "phaseBefore",
                player: "enterGame",
            },
            filter(event, player) {
                return event.name != "phase" || game.phaseNumber == 0;
            },
            marktext: "权",
            persevereSkill: true,
            mark: true,
            intro: {
                name: "权",
                content: "mark",
            },
            ai: {
                noh: true,
                reverseEquip: true,
            },
            // 音频路径适配
            audio: "ext:大梦千秋/audio/sgz_zhonghui/skill:12", //开局一声获得4权
            mod: {
                aiOrder(player, card, num) {
                    if (num > 0) return num;
                    if (card.name === "zhuge" && player.getCardUsable("sha", true) < 6) return 1;
                },
                aiValue(player, card, num) {
                    if (get.tag(card, "damage") && card.name != "sha") return num * 4;
                    if (player.hasUseTarget(card)) return num * 3;
                    if (card.name === "zhuge") return 60 / (1 + player.getCardUsable("sha", true));
                },
                aiUseful(player, card, num) {
                    if (card.name === "zhuge") return 60 / (1 + player.getCardUsable("sha", true));
                },
            },
            content() {
                player.addMark("sgz_quanji", 4);
            },
            group: ["sgz_quanji_huan", "sgz_quanji_num", "sgz_quanji_lose"],
            subSkill: {
                num: {
                    persevereSkill: true,
                    trigger: {
                        player: ["loseAfter", "recoverAfter"],
                        global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
                    },
                    forced: true,
                    filter(event, player) {
                        return player.countCards("h") != player.countMark("sgz_quanji");
                    },
                    content() {
                        const num = player.countMark("sgz_quanji") - player.countCards("h");
                        if (num > 0) player.draw(num);
                        else player.chooseToDiscard("h", true, -num);
                    },
                },
                huan: {
                    audio: "ext:大梦千秋/audio/sgz_zhonghui/skill:8",
                    persevereSkill: true,
                    mark: true,
                    intro: {
                        name: "患",
                        content: "mark",
                    },
                    marktext: "患",
                    trigger: {
                        player: ["damageBegin", "loseHpBegin"],
                    },
                    forced: true,
                    filter(event, player) {
                        return event.num > 0 && !event.sgz_quanji_huan;
                    },
                    lastDo: true,
                    content() {
                        trigger.cancel();
                        player.addMark("sgz_quanji_huan", trigger.num);
                        game.playAudio('../extension/大梦千秋/audio/sgz_zhonghui/clanxieshu.mp3');
                    },
                },
                lose: {
                    audio: "ext:大梦千秋/audio/sgz_zhonghui/skill:4",
                    persevereSkill: true,
                    trigger: {
                        player: "phaseUseAfter",
                    },
                    filter(event, player) {
                        return player.countMark("sgz_quanji_huan");
                    },
                    forced: true,
                    lastDo: true,
                    // 保留范本中的 async
                    async content(event, trigger, player) {
                        player.damage("nosource", "nocard", player.countMark("sgz_quanji_huan")).sgz_quanji_huan = true;
                    },
                },
            },
        },

        // === 2. 忿肆 (适配) ===
        sgz_fensi: {
            audio: "ext:大梦千秋/audio/sgz_zhonghui/skill:10",
            persevereSkill: true,
            enable: ["chooseToUse", "chooseToRespond"],
            // 修改点：出牌阶段限两次
            usable: 2,
            filter(event, player) {
                if (!player.countMark("sgz_quanji_huan") || _status.currentPhase != player) return false;
                for (const name of lib.inpile) {
                    if (get.type(name) == "trick") {
                        if (event.filterCard(get.autoViewAs({ name: name }, "unsure"), player, event)) return true;
                    }
                }
                return false;
            },
            hiddenCard(player, name) {
                if (_status.currentPhase != player) return false;
                return name == "wuxie";
            },
            ai: {
                order: 15,
                result: {
                    player: 9,
                },
            },
            chooseButton: {
                dialog(event, player) {
                    const list = [];
                    for (const name of lib.inpile) {
                        if (get.type(name) != "trick") continue;
                        if (event.filterCard(get.autoViewAs({ name: name }, "unsure"), player, event)) list.push([get.translation(get.type(name)), "", name]);
                    }
                    return ui.create.dialog("忿肆", [list, "vcard"]);
                },
                filter(button, player) {
                    return _status.event.getParent().filterCard({ name: button.link[2] }, player, _status.event.getParent());
                },
                check(button) {
                    if (_status.event.getParent().type != "phase") return 1;
                    const player = _status.event.player;
                    if (["wugu", "zhulu_card", "yiyi", "lulitongxin", "lianjunshengyan", "diaohulishan"].includes(button.link[2])) return 0;
                    return player.getUseValue({ name: button.link[2], nature: button.link[3] });
                },
                backup(links, player) {
                    return {
                        filterCard: true,
                        position: "hes",
                        selectCard: 0,
                        viewAs: { name: links[0][2] },
                        precontent() {
                            player.removeMark("sgz_quanji_huan", 1);
                            player.logSkill("sgz_fensi");
                            // 修改点：弃置任意张牌，也可以不弃
                            player.chooseToDiscard('he', [0, Infinity], `###忿肆###你可以弃置任意数量的牌`).set("ai", card => 4.6 - get.value(card));
                        },
                    };
                },
                prompt(links, player) {
                    return "视为使用" + get.translation(links[0][2]);
                },
            },
        },

        // === 3. 觊天 (适配) ===
        sgz_jitian: {
            audio: "ext:大梦千秋/audio/sgz_zhonghui/skill:7",
            persevereSkill: true,
            enable: ["chooseToUse", "chooseToRespond"],
            filterCard(card) {
                const suit = get.suit(card);
                return ["heart", "spade"].includes(suit);
            },
            viewAs: {
                name: "tao",
            },
            viewAsFilter(player) {
                return player.countCards("she", { suit: "heart" }) + player.countCards("she", { suit: "spade" }) > 0;
            },
            position: "she",
            prompt: "将一张♥或♠牌当【桃】使用",
            check(card) {
                return 9 - get.value(card);
            },
            ai: {
                order: 0.5,
                result: {
                    player(player) {
                        if (player.countMark("sgz_quanji_huan") > 1) return 1;
                        if (player.hp > 1) return -5;
                        return 1;
                    },
                },
            },
            group: "sgz_jitian_end",
            subSkill: {
                end: {
                    
                    // 时机：任何人的回合结束后
                    trigger: { global: "phaseAfter" },
                    forced: true,
                    silent: true,
                    filter(event, player) {
                        // 逻辑：检查梦钟会本回合内是否发动过“觊天”
                        return player.hasHistory('useSkill', function(evt) {
                            return evt.skill == 'sgz_jitian';
                        });
                    },
                    content: function() {
                        "step 0"
                        // 1. 若有“权”标记，则移除一个
                        if (player.countMark("sgz_quanji") > 0) {
                            player.removeMark("sgz_quanji", 1);
                        }
                        // 2. 若有“患”标记，则移除一个
                        if (player.countMark("sgz_quanji_huan") > 0) {
                            player.removeMark("sgz_quanji_huan", 1);
                        }
                        game.log(player, '因在本回合发动过【觊天】，移除了标记');
                    }
                }
            }
        },

        // === 4. 逐月 (适配) ===
        sgz_zhuyue: {
            audio: "ext:大梦千秋/audio/sgz_zhonghui/skill:3",
            persevereSkill: true,
            init(player) {
                player.storage.sgz_zhuyue = 0;
            },
            mark: true,
            intro: {
                content(storage, player) {
                    return `本局游戏造成的伤害数：${storage}`;
                },
            },
            trigger: {
                source: "damageBegin",
            },
            filter(event, player) {
                return event.num > 0;
            },
            direct: true,
            content() {
                if (player.storage.sgz_zhuyue % 2 > 0) {
                    if ((player.storage.sgz_zhuyue + trigger.num) % 2 == 0) {
                        player.changeHujia(1);
                        if (player.countMark("sgz_quanji") < 4) {
                            player.chooseToDiscard(1, "she", "弃置一张牌并获得一枚“权”标记。");
                            player.addMark("sgz_quanji", 1);
                        }
                    }
                    player.storage.sgz_zhuyue += trigger.num;
                } else {
                    player.storage.sgz_zhuyue += trigger.num;
                }
                player.markSkill("sgz_zhuyue");
            },
        },

        // === 5. 兴伐 (适配) ===
sgz_xingfa: {
            audio: "ext:大梦千秋/audio/sgz_zhonghui/skill:4",
            persevereSkill: true,
            forced: true,
            // 技能主时机：准备阶段选目标
            trigger: { player: "phaseZhunbeiBegin" },
            // 挂载子技能，处理核心的体力上限调整逻辑
            group: "sgz_xingfa_logic",
            async content(event, trigger, player) {
                player.logSkill('sgz_xingfa');
                const { result } = await player.chooseTarget(
                    '兴伐：请选择一名角色对其造成1点伤害并即时调整其体力上限',
                    true
                ).set('ai', target => {
                    return get.damageEffect(target, player, player);
                });

                if (result.bool && result.targets) {
                    const target = result.targets[0];
                    // 标记该次伤害来源，防止误伤（确保只调整兴伐造成的伤害）
                    const damageEvt = target.damage(1);
                    damageEvt.sgz_xingfa = true; 
                    await damageEvt;
                }
            },
            subSkill: {
                logic: {
                    // 核心修正：监听伤害造成的一瞬间
                    trigger: { source: "damage" },
                    forced: true,
                    silent: true,
                    // 只有是兴伐造成的伤害才触发调整
                    filter: function(event, player) {
                        return event.sgz_xingfa === true && event.player.isAlive();
                    },
                    content: function() {
                        "step 0"
                        var target = trigger.player;
                        // 依照范本：计算差值并强行扣减
                        var diff = target.maxHp - target.hp;
                        if (diff > 0) {
                            game.log(target, '受到【兴伐】影响，调整体力上限至', target.hp);
                            // 第二参数 true 表示强制/静默调整，无视其他技能干预
                            target.loseMaxHp(diff, true); 
                        }
                    }
                }
            }
        },
// === 梦钟会：特写音效控制器 ===
        "sgz_zhonghui_texiao": {
            charlotte: true, // 隐藏技能
            forced: true,
            silent: true,
            trigger: {
                global: "dieAfter",            // 监听全场死亡
                target: "useCardToTarget",     // 监听自己成为卡牌目标
            },
            filter: function(event, player) {
                // 1. 击杀逻辑：如果是击杀（source是自己）或者是在自己的回合内有人死亡
                if (event.name == 'die') {
                    return event.source == player || _status.currentPhase == player;
                }
                // 2. 判定逻辑：如果是成为了“延时性锦囊”的目标
                if (event.name == 'useCardToTarget') {
                    return get.type(event.card) == 'delay';
                }
                return false;
            },
            content: function() {
                "step 0"
                if (trigger.name == 'die') {
                    // 播放击杀/回合内死亡音效
                    game.playAudio('../extension/大梦千秋/audio/sgz_zhonghui/texiao/sgz_texiao_death.mp3');
                } else {
                    // 播放成为延时锦囊目标音效
                    game.playAudio('../extension/大梦千秋/audio/sgz_zhonghui/texiao/sgz_texiao_judge.mp3');
                }
            }
        },
        //'binliang','chiling','diaohulishan','guohe','gz_guguoanbang','gz_haolingtianxia','gz_kefuzhongyuan','huogong','huoshaolianying','jiedao','jiu','juedou','lebu','lianjunshengyan','lulitongxin','nanman','sha','sha_fire','sha_thunder','shan','shandian','shuiyanqijun','shunshou','tao','taoyuan','tiesuo','wanjian','wenhe','wugu','wuxie','wuzhong','yiyi','yuanjiao','zhibi'
        

    },
    skillTranslate: {
        sgz_quanji: "权计",
        sgz_quanji_info: "持恒技，锁定技，①游戏开始时，你获得4枚“权”标记，你的手牌数始终为X（X为“权”的数量)。②当你不因此技能受到伤害或失去体力时防止之，改为获得等量的“患”标记。③出牌阶段结束时，你受到X点无来源伤害（X为“患”的数量)。",
        sgz_fensi: "忿肆",
        sgz_fensi_info: "持恒技，回合内限两次，当你需要使用一张非延时性锦囊牌，你可以移除一枚“患”并弃置至少零张手牌，视为使用之。",
        sgz_jitian: "觊天",
        sgz_jitian_info: "持恒技，你可将一张♥️或♠️牌当【桃】使用。每名角色的结束阶段结束时，若你于其回合发动过“觊天”，且你有“权”/“患”，你移除一枚“权”/“患”。",
        sgz_zhuyue: "逐月",
        sgz_zhuyue_info: "持恒技，锁定技，你于本局游戏内累计造成的伤害由奇数变为偶数时，你获得一点护甲，然后若你的“权”的数量小于4，你弃置一张牌并获得一枚“权”。",
        sgz_xingfa: "兴伐",
        sgz_xingfa_info: "持恒技，锁定技，准备阶段，你选择一名角色对其造成一点伤害并立即调整其体力上限与体力相同。",
    },
    characterTaici:{
        "sgz_quanji":{order: 1,content:"大丈夫胸怀四海，有提携玉龙之术！/王霸之志在胸，我岂池中之物！/历经风浪至此，会不可止步于龙门！/我若束手无策，诸位又有何施为？/今长缨在手，欲问鼎九州！/我有佐国之术，可缚苍龙!/入宝山而空手回，其与匹夫何异？/操权弄略，舍小利而谋大局！/天降大任于斯，不受必遭其殃！/空将宝地赠他人，某怎会心甘情愿！/大丈夫行事，岂较一兵一将之得失？/我欲行夏禹旧事，为天下人！"},
        "sgz_fensi":{order: 2,content:"匹夫侥幸行险，岂敢妄居首功！/蛇可吞象，我钟会亦可吞天食地！/坏吾大计者，罪死不赦！/蜀川三千里，皆由我一言决之。/天下风流出我辈，一遇风云便化龙！/顺我者封候拜将；逆我者，斧钺加身！/烧去剑阁八百里，蜀中自有一片天！/天书数册，当为我载此世之名！/我以露布上达天听，安不可称万岁！/事在人为，王侯之封不在人而在我！"},
        "sgz_jitian":{order: 3,content:"动我钟家的人，哼，你长了几个脑袋？/有我在一日，谁也动不得吾族分毫!/燕雀安知鸿鹄之志哉！/吾族恒大，谁敢欺之。/不为刀下脍，且做俎上刀。/心怀屠龙之术，何患手无长缨！/功高终怀异，峙鼎复三分！"},
        "sgz_zhuyue":{order: 4,content:"人生艰难如逆水行舟，不欲进则必退！/汉鹿已失，魏牛犹在，吾欲执其耳！/既已功高盖主，何妨冕服加身！"},
        "sgz_xingfa":{order: 5,content:"风水轮流转，轮到我钟某问鼎重几何了。/道同者可俱容，殊途者成白骨！/天赐良机，不取何为？既搏一世之功，亦搏万世之名！"},
        "die":{content:"夺取天下之机，尔等竖子竟弃如敝履，啊！！！"}
    }
};
