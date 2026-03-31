import { lib, game, ui, get, ai, _status } from "../../noname.js";

// 1. 导入所有独立的武将模块
import dmqcJiangwei from './character/dmqc_jiangwei.js';
import dmqcZhugedan from './character/dmqc_zhugedan.js';
import dmqcZhonghui from './character/dmqc_zhonghui.js';
import dmqcHuangyueying from './character/dmqc_huangyueying.js';
import dmqcZhaoyun from './character/dmqc_zhaoyun.js';
import dmqcGuojia from './character/dmqc_guojia.js';

const characters = [dmqcJiangwei, dmqcZhugedan, dmqcZhonghui, dmqcHuangyueying, dmqcZhaoyun, dmqcGuojia];

export const type = "extension";
export default function () {
    return {
        name: "大梦千秋",
content: function (config, pack) {
        // --- 1. 原有的传说品质设置逻辑 ---
    lib.arenaReady.push(function () {
        for (const char of characters) {
            if (!char || !char.characterName) continue;
            lib.rank.rarity.legend.add(char.characterName);
        }
    });


          // 2. 自动化千幻台词包注册
            if (!lib.qhlypkg) lib.qhlypkg = [];
            lib.qhlypkg.push({
                isExt: true,
                filterCharacter: function(name) {
                    return name.indexOf('dmqc_') == 0;
                },
                characterNameTranslate: function(name) {
                    return get.translation(name);
                },
                // 【自动化改写】：自动从模块中寻找台词
                characterTaici: function(name) {
                    // 在导入的 characters 数组中查找当前武将名匹配的模块
                    const charModule = characters.find(c => 
                        c.characterName === name || (c.character && c.character[name])
                    );
                    // 如果找到了该武将且他定义了 characterTaici，就返回它
                    return (charModule && charModule.characterTaici) ? charModule.characterTaici : {};
                },
                originSkinInfo: function(name) { return ""; },
                prefix: 'extension/大梦千秋/image/', 
                skin: { standard: 'extension/大梦千秋/image/' },
                audioOrigin: 'extension/大梦千秋/audio/',
                audio: 'extension/大梦千秋/audio/',
                skininfo: {}
            });
},
    
        // === 核心重写：严格遵循 V1.5 成功逻辑，增加精准映射 ===
        precontent: function () {
            
            // 【核心配置】：在此定义每个武将“改了哪些牌”
            // 只有在这里列出的牌，才会屏蔽原声并替换为自定义语音
            const dreamAudioConfigs = {
                'dmqc_zhonghui': {
                    // 梦钟会改的牌
                    cards: ['baiyin','chitu','dawan','dilu','hualiu','jueying','tengjia','zhuahuang','zhuge','zixin','binliang','chiling','diaohulishan','guohe','gz_guguoanbang','gz_haolingtianxia','gz_kefuzhongyuan','huogong','huoshaolianying','jiedao','jiu','juedou','lebu','lianjunshengyan','lulitongxin','nanman','sha','sha_fire','sha_thunder','shan','shandian','shuiyanqijun','shunshou','tao','taoyuan','tiesuo','wanjian','wenhe','wugu','wuxie','wuzhong','yiyi','yuanjiao','zhibi']
                },
                'dmqc_mguojia': {
                    // 梦郭嘉改的牌（例如你说的只改了闪，或者其他特定的牌）
                    cards: ['binliang','diaohulishan','guohe','huogong','jiedao','jiu','juedou','lebu','lianjunshengyan','lulitongxin','nanman','sha','sha_fire','sha_thunder','shan','shandian','shuiyanqijun','shunshou','tao','taoyuan','tiesuo','wanjian','wugu','wuxie','wuzhong','yuanjiao','zhibi'] 
                }
            };

            // 辅助判断函数：检测当前玩家是否需要劫持该卡牌音频
            const getDreamAudioPath = (player, cardName) => {
                if (!player) return null;
                // 检查主将或副将是否在配置单中
                let charID = null;
                if (dreamAudioConfigs[player.name]) charID = player.name;
                else if (dreamAudioConfigs[player.name2]) charID = player.name2;

                // 如果武将在名单内，且这张牌也在该武将的修改名单内
                if (charID && dreamAudioConfigs[charID].cards.contains(cardName)) {
                    return '../extension/大梦千秋/audio/' + charID + '/cards/' + cardName + '.mp3';
                }
                return null;
            };

            // === 拦截器 A：劫持全局播放器 (根据映射表动态重定向) ===
            const _originPlayAudio = game.playAudio;
            game.playAudio = function() {
                const args = Array.from(arguments);
                const audioName = args[args.length - 1]; 
                const currentPlayer = _status.event ? _status.event.player : null;

                const customPath = getDreamAudioPath(currentPlayer, audioName);
                if (customPath) {
                    // 【重定向】只在匹配成功时改道
                    return _originPlayAudio.call(this, customPath);
                }
                return _originPlayAudio.apply(this, arguments);
            };

            // === 拦截器 B：劫持 useCard (主动出牌静默) ===
            const _originUseCard = lib.element.player.useCard;
            lib.element.player.useCard = function() {
                const next = _originUseCard.apply(this, arguments);
                const cardName = get.name(arguments[0]);
                // 如果当前角色改了这张牌，则开启静默标志位
                if (getDreamAudioPath(this, cardName)) {
                    next.audio = -1;
                    next.nospeak = true;
                    next.onuseAudio = false;
                    next._noAudio = true;
                }
                return next;
            };

            // === 拦截器 C：劫持 respond (响应打出静默) ===
            const _originRespond = lib.element.player.respond;
            lib.element.player.respond = function() {
                const next = _originRespond.apply(this, arguments);
                const cardName = get.name(arguments[0]);
                // 如果当前角色改了这张牌，则开启静默标志位
                if (getDreamAudioPath(this, cardName)) {
                    next.audio = -1;
                    next.nospeak = true;
                    next.respondAudio = false; 
                    next._noAudio = true;
                }
                return next;
            };
        },

        config: {},
        help: {},
        package: {
            character: {
                character: Object.assign({}, ...characters.map(char => char.character || {})),
                translate: Object.assign({}, ...characters.map(char => char.characterTranslate || {})),
            },
            skill: {
                skill: Object.assign({}, ...characters.map(char => char.skills || {})),
                translate: Object.assign({}, ...characters.map(char => char.skillTranslate || {})),
            },
            intro: "大梦千秋扩展包<br>包含武将：姜维，诸葛诞，钟会，赵云，黄月英，郭嘉",
            author: "Loihan",
            version: "2.0",
        },
        files: { character: [], card: [], skill: [], audio: [] },
    };
}