export default {
    character: {
        sgz_zhugedan: [
            "male", 
            "shen", 
            "6/9", 
            ["sgz_dingpan", "sgz_fani", "sgz_fenyu", "sgz_kunzhu", "sgz_gujue"], 
            [
                "des:诸葛诞字公休，魏之勋旧，宿望淮南。<br>甘露三年，司马氏权倾宇内，弑君凌下，魏室江山名存实亡。诞内怀忧愤，望洛阳而泣血，遂斥司马为国贼，传檄天下，兴复曹氏之威。司马昭亲率六军，蚁聚寿春，重围如铁。城中粮匮援绝，外无救应，部属离散，境遇危殆。<br>诞慨然有玉碎之志，不欲受辱于篡臣。乃命残兵自焚行营，伪作弃城而走，诱敌贪功深入。及贼众陷于死地，诞仗剑而起，亲率死士五百人陷阵冲杀。烈焰冲天，乱军之中，诞手刃元凶，逆党遂崩。是役也，司马覆灭，皇权复归。然诞麾下精锐尽皆尽忠，及至捷报传至洛阳，公虽克敌生还，唯孤影对斜阳。大梦初醒，百战余生，世人皆赞其忠烈，虽处孤绝而终不改其节，遂成魏室之中兴名臣。", 
                "ext:大梦千秋/image/sgz_zhugedan.png",
                "die:ext:大梦千秋/audio/sgz_zhugedan/die.mp3"
            ], 
        ],
    },
    characterName: 'sgz_zhugedan',
    characterTranslate: {
        sgz_zhugedan: "诸葛诞",
        sgz_zhugedan_prefix:"梦",
    },
    characterTitle: {
        sgz_zhugedan: "寿春举义",
    },
    skills: {
        // === 1. 定叛 (每人限一次，逻辑对齐范本) ===
        sgz_dingpan: {
            audio: "ext:大梦千秋/audio/sgz_zhugedan:5",
            persevereSkill: true,
            enable: "phaseUse",
            filter: function(event, player) {
                return player.maxHp > 1 && game.hasPlayer(target => target != player);
            },
            filterTarget: function(card, player, target) {
                if (target == player) return false;
                // 检查本出牌阶段是否已对其发动过
                return !player.storage.sgz_dingpan_targets || !player.storage.sgz_dingpan_targets.contains(target);
            },
            selectTarget: 1,
            content: function() {
                "step 0"
                if (!player.storage.sgz_dingpan_targets) player.storage.sgz_dingpan_targets = [];
                player.storage.sgz_dingpan_targets.push(target);
                
                player.loseMaxHp();
                game.playAudio('../extension/大梦千秋/audio/sgz_zhugedan/sgz_dingpan.mp3');
                "step 1"
                // 检测子技能注入的标记名
                if (target.hasSkill("sgz_dingpan_pan")) {
                    target.loseMaxHp();
                } else {
                    target.loseMaxHp();
                    target.addSkill("sgz_dingpan_pan");
                }
            },
            group: "sgz_dingpan_cleanup",
            subSkill: {
                cleanup: {
                    trigger: { player: "phaseUseAfter" },
                    forced: true,
                    silent: true,
                    content: function() {
                        delete player.storage.sgz_dingpan_targets;
                    }
                },
                pan: {
                    sub: true,
                    mark: true,
                    marktext: "叛",
                    intro: {
                        name: "叛",
                        content: "已成为叛军，锁定技【伐逆】的目标",
                    },
                }
            }
        },

        // === 2. 伐逆 (1:1 移植范本逻辑) ===
        sgz_fani: {
            audio: "ext:大梦千秋/audio/sgz_zhugedan:6",
            forced: true,
            persevereSkill: true,
            group: ["sgz_fani_range", "sgz_fani_target", "sgz_fani_draw", "sgz_fani_damage"],
            subSkill: {
                range: {
                    sub: true,
                    mod: {
                        targetInRange: function(card, player, target) {
                            if (card.name == "sha") return true;
                        },
                    },
                },
                target: {
                    sub: true,
                    trigger: { player: "useCardBegin" },
                    forced: true,
                    firstDo: true,
                    filter: function(event, player) {
                        if (event.card.name != "sha" || event.sgz_fani_done) return false;
                        return game.hasPlayer(p => p.hasSkill("sgz_dingpan_pan"));
                    },
                    content: function() {
                        player.logSkill("sgz_fani");
                        var targets = game.filterPlayer(p => p.hasSkill("sgz_dingpan_pan"));
                        game.log(player, "的", trigger.card, "目标变更为", targets);
                        trigger.targets = targets;
                        trigger.sgz_fani_done = true;
                    },
                },
                draw: {
                    sub: true,
                    trigger: { player: "useCardToPlayered" },
                    forced: true,
                    filter: function(event, player) {
                        return event.target.hasSkill("sgz_dingpan_pan");
                    },
                    content: function() {
                        player.draw();
                    },
                },
                damage: {
                    sub: true,
                    trigger: { source: "damageBegin" },
                    forced: true,
                    filter: function(event, player) {
                        return event.player.hasSkill("sgz_dingpan_pan") && event.num > 0;
                    },
                    content: function() {
                        trigger.cancel();
                        game.log(trigger.player, "受到的伤害被防止，改为减少体力上限");
                        trigger.player.loseMaxHp(trigger.num);
                    },
                }
            }
        },

        // === 3. 焚玉 (计数标记模式：有多少回合就有多少梦标记) ===
sgz_fenyu: {
    audio: "ext:大梦千秋/audio/sgz_zhugedan:3",
    persevereSkill: true,
    forced: true,
    trigger: { global: "die" },
    filter: function(event, player) {
        return event.player.hasSkill("sgz_dingpan_pan");
    },
    content: function() {
        "step 0"
        player.logSkill("sgz_fenyu");
        player.draw(2);
        player.gainMaxHp(3);
        
        // 核心：必须先添加逻辑技能，标记的自动扣减才会生效
        player.addSkill('sgz_fenyu_mark');
        player.addMark('sgz_fenyu_mark', 1);
        
        // 插入额外回合
        player.insertPhase();
        
        game.playAudio('../extension/大梦千秋/audio/sgz_zhugedan/sgz_fenyu.mp3');
    }
},
sgz_fenyu_mark: {
    charlotte: true, // 彻底隐藏技能，仅显示标记
    mark: true,
    marktext: "梦",
    intro: {
        name: "梦回",
        content: "mark", // 自动显示标记数量
    },
    // 逻辑：每当任何回合（包括额外回合）开始时，消耗一个标记
    trigger: { player: "phaseBeginStart" },
    forced: true,
    silent: true,
    content: function() {
        player.removeMark('sgz_fenyu_mark', 1);
        // 如果标记扣完了，自动移除逻辑技能，保持面板干净
        if (player.countMark('sgz_fenyu_mark') <= 0) {
            player.removeSkill('sgz_fenyu_mark');
        }
    }
},

        // === 4. 困诛 (强命) ===
        sgz_kunzhu: {
            audio: "ext:大梦千秋/audio/sgz_zhugedan:4",
            persevereSkill: true,
            forced: true,
            trigger: { player: "useCard1" }, 
            filter: function(event, player) {
                var panCount = game.countPlayer(p => p.hasSkill("sgz_dingpan_pan"));
                return panCount > player.maxHp;
            },
            content: function() {
                trigger.directHit = game.filterPlayer(p => p != player);
                player.logSkill("sgz_kunzhu");
                game.playAudio('../extension/大梦千秋/audio/sgz_zhugedan/sgz_kunzhu.mp3');
            },
        },

        // === 5. 孤绝 (回合末摸牌+护甲) ===
        sgz_gujue: {
            audio: "ext:大梦千秋/audio/sgz_zhugedan:3",
            persevereSkill: true,
            forced: true,
            trigger: { player: "phaseJieshuBegin" },
            filter: function(event, player) {
                // 排除第一轮
                //if (game.roundNumber <= 1) return false;
                return game.countPlayer(p => p.hasSkill("sgz_dingpan_pan")) > 0;
            },
            content: function() {
                "step 0"
                var x = game.countPlayer(p => p.hasSkill("sgz_dingpan_pan"));
                event.countX = x;
                player.logSkill("sgz_gujue");
                game.playAudio('../extension/大梦千秋/audio/sgz_zhugedan/sgz_gujue.mp3');
                
                if (game.roundNumber > 1) player.loseMaxHp(x);
                player.changeHujia(x);
                "step 1"
                player.draw(event.countX);
            }
        }
    },
    skillTranslate: {
        sgz_dingpan: "定叛",
        sgz_dingpan_info: "出牌阶段每名角色限一次，你可以减少1点体力上限并令一名其他角色减少一点体力上限，然后若其没有“叛”标记，其获得一个“叛”标记。",
        sgz_fani: "伐逆",
        sgz_fani_info: "锁定技，①你的【杀】无距离限制。②当你使用【杀】时，若场上存在有“叛”标记的角色，则将目标改为所有拥有“叛”标记的角色。③你每对一名拥有“叛”标记的角色使用牌时便摸一张牌。④你对拥有“叛”标记的角色即将造成的伤害改为令其减少等量的体力上限。",
        sgz_fenyu: "焚玉",
        sgz_fenyu_info: "锁定技。当一名拥有“叛”标记的角色死亡时，你摸两张牌并增加3点体力上限。然后你于当前回合结束后获得一个额外的回合（此效果可累加）。",
        sgz_fenyu_mark: "梦回",
        sgz_kunzhu: "困诛",
        sgz_kunzhu_info: "锁定技。若场上拥有“叛”标记的角色数大于你的体力上限，你使用的牌不可被响应。",
        sgz_gujue: "孤绝",
        sgz_gujue_info: "锁定技，你的结束阶段开始时，你减少X点体力上限（除第一轮外），然后获得X点护甲并摸X张牌（X为场上拥有“叛”标记的角色数）。",
    },
    characterTaici:{
        "sgz_dingpan":{order: 1,content:"守护之獒，虽无龙鳞虎爪，亦可保家国太平！/诞必镇卫四境，以全大魏之江水！/观中原魏旗凋零，唯淮南独树义帜！/诞愿效方邵，为国之爪牙！/念先王之祀，当举义伐之！"},
        "sgz_fani":{order: 2,content:"蒋、焦二子，安敢如此！/文钦竖子，吾必杀之！/人生百年，死国可乎！/敌势虽盛，犹可稳镇众军！/建不世之业，留金石之功！/诞不忍乌云蔽日，必置乱臣于死地！"},
        "sgz_fenyu":{order: 3,content:"只求，玉石俱焚！/义照淮流，身报国恩！/本将军誓与寿春共存亡！"},
        "sgz_kunzhu":{order: 4,content:"天子之臣，当以社稷为务，清君侧之贼！/非威不利，非势不行！/诞在一日，乱臣贼子便休想有安生之时！/斯人已逝，余者奋威！"},
        "sgz_gujue":{order: 5,content:"若无后援，不知胜战可否！/诞能得诸位死力，无憾矣！/世受魏恩，岂可欲以社稷输人！"},
        "die":{content:"士皆死战，只惜贼势难挡..."},
    }
};