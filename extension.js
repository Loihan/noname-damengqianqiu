import { lib, game, ui, get, ai, _status } from "../../noname.js";

// === 三国志武将 ===
import sgzJiangwei from './character/sgz_jiangwei.js';
import sgzZhugedan from './character/sgz_zhugedan.js';
import sgzZhonghui from './character/sgz_zhonghui.js';
import sgzHuangyueying from './character/sgz_huangyueying.js';
import sgzZhaoyun from './character/sgz_zhaoyun.js';
import sgzGuojia from './character/sgz_guojia.js';

// === 山海经武将 ===
import shjBaize from './character/shj_baize.js'; 
import shjXiangliu from './character/shj_xiangliu.js';
import shjChaofeng from './character/shj_chaofeng.js';
import shjNvwa from './character/shj_nvwa.js';

// === 魔法时代武将 ===
import mfsdAnyuanmofa from './character/mfsd_anyuanmofa.js';
import mfsdXingyushenqi from './character/mfsd_xingyushenqi.js';

// === 万古仙道武将 ===
import wgxdHeyuxingzun from './character/wgxd_heyuxingzun.js';

// 分类数组定义
const sgzCharacters = [sgzJiangwei, sgzZhugedan, sgzZhonghui, sgzHuangyueying, sgzZhaoyun, sgzGuojia];
const shjCharacters = [shjBaize, shjXiangliu, shjChaofeng, shjNvwa

];
const mfsdCharacters = [mfsdAnyuanmofa, mfsdXingyushenqi]; 
const wgxdCharacters = [wgxdHeyuxingzun];

const allCharacters = [...sgzCharacters, ...shjCharacters, ...mfsdCharacters, ...wgxdCharacters];

export const type = "extension";
export default function () {
    return {
        name: "大梦千秋",
        content: function (config, pack) {
            // --- 1. 设置传说品质 (已改为循环 allCharacters) ---
            lib.arenaReady.push(function () {
                for (const char of allCharacters) {
                    if (!char || !char.characterName) continue;
                    lib.rank.rarity.legend.add(char.characterName);
                }
            });

            // 2. 自动化千幻台词包注册
            if (!lib.qhlypkg) lib.qhlypkg = [];
            lib.qhlypkg.push({
                isExt: true,
                filterCharacter: function(name) {
                    return name.indexOf('sgz_') == 0 || name.indexOf('shj_') == 0 || name.indexOf('mfsd_') == 0;
                },
                characterNameTranslate: function(name) {
                    return get.translation(name);
                },
                characterTaici: function(name) {
                    const charModule = allCharacters.find(c => 
                        c.characterName === name || (c.character && c.character[name])
                    );
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
    
        precontent: function () { 

            // === 分包名翻译注入 ===
            lib.translate["三国志"] = "三国志";
            lib.translate["山海经"] = "山海经";
            lib.translate["魔法时代"] = "魔法时代";
            lib.translate["万古仙道"] = "万古仙道";
            //lib.translate["大梦千秋_character_config"] = "大梦千秋";

            // 【核心配置】：卡牌音效劫持逻辑（保持原封不动）
            //-------------------↓↓↓↓↓↓↓↓↓↓出牌语音↓↓↓↓↓↓↓↓↓↓↓----------------//
            const dreamAudioConfigs = {
                'sgz_zhonghui': {
                    cards: ['baiyin','chitu','dawan','dilu','hualiu','jueying','tengjia','zhuahuang','zhuge','zixin','binliang','chiling','diaohulishan','guohe','gz_guguoanbang','gz_haolingtianxia','gz_kefuzhongyuan','huogong','huoshaolianying','jiedao','jiu','juedou','lebu','lianjunshengyan','lulitongxin','nanman','sha','sha_fire','sha_thunder','shan','shandian','shuiyanqijun','shunshou','tao','taoyuan','tiesuo','wanjian','wenhe','wugu','wuxie','wuzhong','yiyi','yuanjiao','zhibi']
                },
                'sgz_guojia': {
                    cards: ['binliang','diaohulishan','guohe','huogong','jiedao','jiu','juedou','lebu','lianjunshengyan','lulitongxin','nanman','sha','sha_fire','sha_thunder','shan','shandian','shuiyanqijun','shunshou','tao','taoyuan','tiesuo','wanjian','wugu','wuxie','wuzhong','yuanjiao','zhibi'] 
                }
            };

            const getDreamAudioPath = (player, cardName) => {
                if (!player) return null;
                let charID = null;
                if (dreamAudioConfigs[player.name]) charID = player.name;
                else if (dreamAudioConfigs[player.name2]) charID = player.name2;
                if (charID && dreamAudioConfigs[charID].cards.contains(cardName)) {
                    return '../extension/大梦千秋/audio/' + charID + '/cards/' + cardName + '.mp3';
                }
                return null;
            };

            const _originPlayAudio = game.playAudio;
            game.playAudio = function() {
                const args = Array.from(arguments);
                const audioName = args[args.length - 1]; 
                const currentPlayer = _status.event ? _status.event.player : null;
                const customPath = getDreamAudioPath(currentPlayer, audioName);
                if (customPath) return _originPlayAudio.call(this, customPath);
                return _originPlayAudio.apply(this, arguments);
            };

            const _originUseCard = lib.element.player.useCard;
            lib.element.player.useCard = function() {
                const next = _originUseCard.apply(this, arguments);
                const cardName = get.name(arguments[0]);
                if (getDreamAudioPath(this, cardName)) {
                    next.audio = -1; next.nospeak = true; next.onuseAudio = false; next._noAudio = true;
                }
                return next;
            };

            const _originRespond = lib.element.player.respond;
            lib.element.player.respond = function() {
                const next = _originRespond.apply(this, arguments);
                const cardName = get.name(arguments[0]);
                if (getDreamAudioPath(this, cardName)) {
                    next.audio = -1; next.nospeak = true; next.respondAudio = false; next._noAudio = true;
                }
                return next;
            };
            //----------------------↑↑↑↑↑↑↑↑↑出牌语音↑↑↑↑↑↑↑↑↑↑------------------------//
        },

        config: {},
        help: {},
        package: {
            character: {
                character: Object.assign({}, ...allCharacters.map(char => char.character || {})),
                translate: Object.assign({}, ...allCharacters.map(char => char.characterTranslate || {})),
                // === 核心：分包设置 ===
                characterSort: {
                    "大梦千秋": {
                        "三国志": sgzCharacters.map(char => char.characterName),
                        "山海经": shjCharacters.map(char => char.characterName),
                        "魔法时代": mfsdCharacters.map(char => char.characterName),
                        "万古仙道": wgxdCharacters.map(char => char.characterName),
                    }
                }
            },
            skill: {
                skill: Object.assign({}, ...allCharacters.map(char => char.skills || {})),
                translate: Object.assign({}, ...allCharacters.map(char => char.skillTranslate || {})),
            },
            intro: "大梦千秋扩展包<br>包含三国志与山海经系列武将",
            author: "Loihan",
            version: "3.3",
        },
        files: { character: [], card: [], skill: [], audio: [] },
    };
}