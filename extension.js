import { lib, game, ui, get, ai, _status } from "../../noname.js";

// === 三国志武将 ===
import sgzJiangwei from './character/sgz_jiangwei.js';
import sgzZhugedan from './character/sgz_zhugedan.js';
import sgzZhonghui from './character/sgz_zhonghui.js';
import sgzHuangyueying from './character/sgz_huangyueying.js';
import sgzZhaoyun from './character/sgz_zhaoyun.js';
import sgzGuojia from './character/sgz_guojia.js';
import sgzLuxun from './character/sgz_luxun.js';
import sgzMachao from './character/sgz_machao.js';

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
import wgxdYinianshenmo from './character/wgxd_yinianshenmo.js';

// 分类数组定义
const sgzCharacters = [sgzJiangwei, sgzZhugedan, sgzZhonghui, sgzHuangyueying, sgzZhaoyun, sgzGuojia, sgzLuxun, sgzMachao];
const shjCharacters = [shjBaize, shjXiangliu, shjChaofeng, shjNvwa];
const mfsdCharacters = [mfsdAnyuanmofa, mfsdXingyushenqi]; 
const wgxdCharacters = [wgxdHeyuxingzun, wgxdYinianshenmo];

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
                    return name.indexOf('sgz_') == 0 || name.indexOf('shj_') == 0 || name.indexOf('mfsd_') == 0 || name.indexOf('wgxd_') == 0;
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
            // === 1. 核心劫持：注入武将包前言 (参考飞鸿印雪逻辑) ===
            if (ui?.create?.menu) {
                const originMenu = ui.create.menu;
                ui.create.menu = function () {
                    const result = originMenu.apply(this, arguments);
                    
                    // A. 寻找主菜单中的“武将”按钮
                    const characterPackBtn = Array.from(document.getElementsByTagName('div')).find(div => div.innerHTML === '武将');
                    if (characterPackBtn) {
                        const originClick = characterPackBtn.onclick || function () { };
                        characterPackBtn.onclick = function() {
                            originClick.apply(this, arguments);
                            
                            // B. 在左侧列表里寻找名为“大梦千秋”的按钮
                            const myPackBtn = Array.from(document.querySelectorAll('.menubutton.large')).find(div => div.innerHTML === '大梦千秋');
                            if (myPackBtn) {
                                const originClick2 = myPackBtn.onclick || function () { };
                                myPackBtn.onclick = function() {
                                    originClick2.apply(this, arguments);
                                    
                                    // C. 寻找右侧设置区域并在“仅点将可用”选项下插入前言
                                    const rightPane = document.querySelector('.menu-buttons.leftbutton');
                                    // 检查是否已经初始化，防止重复插入
                                    if (rightPane && !rightPane._dmqc_init) {
                                        rightPane._dmqc_init = true;
                                        const cfgNodes = rightPane.querySelectorAll('.config.toggle');
                                        for (let i = 0; i < cfgNodes.length; i++) {
                                            if (cfgNodes[i].textContent === '仅点将可用') {
                                                const addIntro = document.createElement('div');
                                                addIntro.classList.add('config', 'pointerspan');
                                                addIntro.style.display = 'block';
                                                addIntro.style.marginTop = '10px';
                                                addIntro.style.padding = '5px';
                                                
                                                // 自定义你的前言内容
                                                addIntro.innerHTML = `
                                                    <span class="firetext" style="font-weight:bold; font-size:16px;">【本包前言】</span><br>
                                                    <span style="color:#e0c5ff; font-family: yuanli; line-height:1.5;">
                                                        大梦谁先觉，平生我自知。<br>
                                                        本包武将技能均为<span style="color:#ffeb3b">持恒技</span>，强调资源状态的长期改变与阶梯式能力解锁。
                                                    </span>
                                                `;
                                                
                                                // 在“仅点将可用”节点之后插入这段话
                                                cfgNodes[i].parentNode.insertBefore(addIntro, cfgNodes[i].nextSibling);
                                                break;
                                            }
                                        }
                                    }
                                };
                            }
                        };
                    }
                    return result;
                };
            }
            // === 分包名翻译注入 ===
            lib.translate["三国志"] = "<span style=\"color:#ff3333; font-family: yuanli; line-height:1.5;\">三国志</span>";
            lib.translate["山海经"] = "<span style=\"color:#FFFF00; font-family: yuanli; line-height:1.5;\">山海经</span>";
            lib.translate["魔法时代"] = "<span style=\"color:#9900ff; font-family: yuanli; line-height:1.5;\">魔法时代</span>";
            lib.translate["万古仙道"] = "<span style=\"color:#3333ff; font-family: yuanli; line-height:1.5;\">万古仙道</span>";
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
            intro: "大梦千秋扩展包",
            author: "Loihan",
            version: "4.5",
        },
        files: { character: [], card: [], skill: [], audio: [] },
    };
}