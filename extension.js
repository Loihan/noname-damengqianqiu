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
import sgzLvbu from './character/sgz_lvbu.js';
import sgzCaomao from './character/sgz_caomao.js';
import sgzSimazhao from './character/sgz_simazhao.js';
import sgzXiaoqiao from './character/sgz_xiaoqiao.js';
import sgzGuanyu from './character/sgz_guanyu.js';
import sgzWeiyan from './character/sgz_weiyan.js';
import sgzDuyu from './character/sgz_duyu.js';
import sgzSunhanhua from './character/sgz_sunhanhua.js';

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
const sgzCharacters = [sgzJiangwei, sgzZhugedan, sgzZhonghui, sgzHuangyueying, sgzZhaoyun, sgzGuojia, sgzLuxun, sgzMachao, sgzLvbu, sgzCaomao, sgzSimazhao, sgzXiaoqiao, sgzGuanyu, sgzWeiyan, sgzDuyu, sgzSunhanhua];
const shjCharacters = [shjBaize, shjXiangliu, shjChaofeng, shjNvwa];
const mfsdCharacters = [mfsdAnyuanmofa, mfsdXingyushenqi]; 
const wgxdCharacters = [wgxdHeyuxingzun, wgxdYinianshenmo];

const allCharacters = [...sgzCharacters, ...shjCharacters, ...mfsdCharacters, ...wgxdCharacters];

export const type = "extension";
export default function () {
    return {
        name: "大梦千秋",
        content: function (config, pack) {
            // 版本标记：完全重启游戏后，控制台应输出此行（按 F12/Ctrl+Shift+I 查看）
            console.log("[大梦千秋] 扩展已加载 v7.4（新增梦关羽/梦魏延/梦杜预/梦孙寒华）");

            // 1. 设置传说品质 
            lib.arenaReady.push(function () {
                for (const char of allCharacters) {
                    if (!char || !char.characterName) continue;
                    lib.rank.rarity.legend.add(char.characterName);
                }
            });

            // 2. 自动化千幻台词包注册
            //    ⚠ 这个包会被 game.qhly_foundPackage 优先命中（filterCharacter 覆盖本包全部武将），
            //      所以它同时决定了「皮肤图片去哪儿找」：
            //        skin.standard 必须是本扩展的皮肤目录（…/skin/image/），否则静态皮会落到
            //        …/image/<武将>.jpg（不存在）→ 武将详情的皮肤预览框全透明。
            //      原先写的是 'extension/大梦千秋/image/'（那是**人物立绘**目录，不是皮肤目录）。
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
                // 皮肤图片目录（千幻聆音「扩展武将自带皮肤」约定：extension/<扩展名>/skin/image/）
                skin: {
                    standard: 'extension/大梦千秋/skin/image/',
                    origin: 'extension/大梦千秋/skin/image/',
                },
                // 配音目录（约定为 …/skin/audio/；放这里才会按 <武将>/<皮肤名>/xxx.mp3 去找）
                audioOrigin: 'extension/大梦千秋/skin/audio/',
                audio: 'extension/大梦千秋/skin/audio/',
                skininfo: {}
            });

            // 3. 诸葛诞的“叛”势力
            game.addGroup('dingpan_pan', '叛', '叛', {
                color: 'wood'
            });

            // 4. 扩展武将前缀“梦”（粉紫色梦幻）。
            //    正确机制：lib.namePrefix 注册前缀颜色 + lib.translate[角色名+"_prefix"] 声明拆分 + 角色翻译名以“梦”开头。
            //    对全部 sgz_ 角色启用。
            lib.namePrefix.set('梦', { color: '#e0c5ff' });
            for (const c of sgzCharacters) {
                if (c && c.characterName) {
                    lib.translate[c.characterName + '_prefix'] = '梦';
                }
            }
                        
            // 4. 设定武将威胁度
            lib.config.threaten = lib.config.threaten || {};
            lib.config.threaten['sgz_jiangwei'] = 119.0; 
            lib.config.threaten['sgz_zhugedan'] = 116.7; 
            lib.config.threaten['sgz_zhonghui'] = 118.6; 
            lib.config.threaten['sgz_huangyueying'] = 115.0; 
            lib.config.threaten['sgz_zhaoyun'] = 117.3; 
            lib.config.threaten['sgz_guojia'] = 115.0; 
            lib.config.threaten['sgz_luxun'] = 116.4; 
            lib.config.threaten['sgz_machao'] = 119.0; 
            lib.config.threaten['sgz_caomao'] = 119.6; 
            lib.config.threaten['sgz_simazhao'] = 118; 
            lib.config.threaten['sgz_xiaoqiao'] = 117.0; 
            lib.config.threaten['sgz_guanyu'] = 119.0; 
            lib.config.threaten['sgz_weiyan'] = 119.0; 
            lib.config.threaten['sgz_duyu'] = 120.0; 
            lib.config.threaten['shj_baize'] = 122; 
            lib.config.threaten['shj_xiangliu'] = 121; 
            lib.config.threaten['shj_chaofeng'] = 120; 
            lib.config.threaten['shj_nvwa'] = 120; 
            lib.config.threaten['mfsd_anyuanmofa'] = 121; 
            lib.config.threaten['mfsd_xingyushenqi'] = 122; 
            lib.config.threaten['wgxd_heyuxingzun'] = 118.6; 
            lib.config.threaten['wgxd_yinianshenmo'] = 118.6; 

          
        },
    
        precontent: function () { 
            // === 0. 神武装备牌注册（自「星之梦」搬运进本包，见 card/card.js） ===
            // card/card.js 是 game.import("card", ...) 形式的独立牌堆模块（内部自注册）。
            // 在 precontent 里动态 import，确保它在「牌堆构建」之前完成注册；
            // 这里不 await，用 then 兜底打印错误，避免阻塞扩展加载。
            import("./card/card.js").catch(e => console.error("[大梦千秋] 神武卡牌载入失败：", e));

            // === 0b. 本包卡牌包**不进牌堆** ===
            // 神武只由梦杜预【三陈·神武】发动时现场造出（三陈读 lib.card 的定义 + 白名单，
            // 与牌堆无关），所以本包 card/card.js 刻意不提供 list，也不该被当成"牌堆"
            // 勾选在 lib.config.cards 里（勾了会让引擎按 list 往牌堆塞牌；没有 list 则什么也不加）。
            // 早前的版本为了"独立也能进牌堆"把包名加进了 lib.config.cards，这里顺手清理掉，
            // 免得旧配置一直留着这一项。
            try {
                const packName = "dmqc_duyusw";
                if (lib.config.cards && lib.config.cards.includes(packName)) {
                    lib.config.cards.remove(packName);
                    game.saveConfig("cards", lib.config.cards);
                    console.log("[大梦千秋] 已从启用牌堆中移除本包卡牌包（神武不进牌堆）：" + packName);
                }
            } catch (e) {
                console.error("[大梦千秋] 清理本包卡牌包设置失败：", e);
            }

            // === 0c. 皮肤注册（梦小乔 · 秋水伊人；千幻聆音 + 十周年UI） ===
            // skin.js 里是「千幻聆音扩展武将皮肤」的标准写法（见该文件顶部说明）：
            //   · 皮肤图片走本扩展自己的 skin/image/ 目录（不必放进千幻聆音）
            //   · 动皮骨骼直接引用十周年UI 已有资源（不复制）
            // 它依赖 window.qhly_import（由千幻聆音的 precontent 创建）与 window.decadeUI
            // （十周年UI 的运行期），两者都可能比本扩展晚就绪，所以这里**轮询等待**：
            // 谁没装/没开就永远不加载，静默跳过，绝不影响本扩展与游戏本体。
            (function dmqcLoadSkinModule() {
                const url = (lib.assetURL || "") + "extension/大梦千秋/skin.js";
                let tries = 0;
                const tryLoad = function () {
                    tries++;
                    if (window.qhly_import && window.decadeUI) {
                        // 用 lib.init.js（与千幻聆音加载自己 skinShare.js 的方式一致）；
                        // 已加载过就不再重复执行
                        if (!window.__dmqcSkinLoaded) {
                            window.__dmqcSkinLoaded = true;
                            try {
                                lib.init.js(url, null, null, function () {
                                    window.__dmqcSkinLoaded = false;
                                    console.error("[大梦千秋] skin.js 加载失败：" + url);
                                });
                            } catch (e) {
                                window.__dmqcSkinLoaded = false;
                                console.error("[大梦千秋] skin.js 加载异常：", e);
                            }
                        }
                        return;
                    }
                    if (tries > 60) return; // 约 12 秒仍未就绪 → 放弃（未装相关扩展）
                    setTimeout(tryLoad, 200);
                };
                setTimeout(tryLoad, 200);
            })();

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

            // 【核心配置】：卡牌音效劫持逻辑
            //-------------------↓↓↓↓↓↓↓↓↓↓出牌语音↓↓↓↓↓↓↓↓↓↓↓----------------//
            const dreamAudioConfigs = {
                'sgz_zhonghui': {
                    cards: ['baiyin','chitu','dawan','dilu','hualiu','jueying','tengjia','zhuahuang','zhuge','zixin','bingliang','chiling','diaohulishan','guohe','gz_guguoanbang','gz_haolingtianxia','gz_kefuzhongyuan','huogong','huoshaolianying','jiedao','jiu','juedou','lebu','lianjunshengyan','lulitongxin','nanman','sha','sha_fire','sha_thunder','shan','shandian','shuiyanqijun','shunshou','tao','taoyuan','tiesuo','wanjian','wenhe','wugu','wuxie','wuzhong','yiyi','yuanjiao','zhibi']
                },
                'sgz_guojia': {
                    cards: ['bingliang','diaohulishan','guohe','huogong','jiedao','jiu','juedou','lebu','lianjunshengyan','lulitongxin','nanman','sha','sha_fire','sha_thunder','shan','shandian','shuiyanqijun','shunshou','tao','taoyuan','tiesuo','wanjian','wugu','wuxie','wuzhong','yuanjiao','zhibi'] 
                },
                'sgz_duyu': {
                    cards: ['bingliang','diaohulishan','guohe','gz_guguoanbang','gz_haolingtianxia','gz_kefuzhongyuan','huogong','huoshaolianying','jiedao','jiu','juedou','lebu','lianjunshengyan','lulitongxin','nanman','sha','sha_fire','sha_thunder','shan','shandian','shuiyanqijun','shunshou','tao','taoyuan','tiesuo','wanjian','wenhe','wugu','wuxie','wuzhong','yiyi','yuanjiao','zhibi']
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

            // 劫持使用卡牌
            const _originUseCard = lib.element.player.useCard;
            lib.element.player.useCard = function() {
                const next = _originUseCard.apply(this, arguments);
                
                // --- 修复点 1: 安全性检查 ---
                // 必须确保 arguments[0] 存在，且 next 是一个有效的事件对象
                if (!arguments[0] || !next) return next;

                try {
                    const cardName = get.name(arguments[0]);
                    if (cardName && getDreamAudioPath(this, cardName)) {
                        // 屏蔽系统原声，标记为已处理音频
                        next.audio = -1; 
                        next.nospeak = true; 
                        next.onuseAudio = false; 
                        next._noAudio = true;
                    }
                } catch (e) {
                    console.warn("大梦千秋音频劫持(useCard)跳过错误:", e);
                }
                
                return next;
            };

            // 劫持响应卡牌
            const _originRespond = lib.element.player.respond;
            lib.element.player.respond = function() {
                const next = _originRespond.apply(this, arguments);

                // --- 修复点 2: 安全性检查 ---
                if (!arguments[0] || !next) return next;

                try {
                    const cardName = get.name(arguments[0]);
                    if (cardName && getDreamAudioPath(this, cardName)) {
                        next.audio = -1; 
                        next.nospeak = true; 
                        next.respondAudio = false; 
                        next._noAudio = true;
                    }
                } catch (e) {
                    console.warn("大梦千秋音频劫持(respond)跳过错误:", e);
                }
                
                return next;
            };
            //----------------------↑↑↑↑↑↑↑↑↑出牌语音↑↑↑↑↑↑↑↑↑↑------------------------//
        },

        config: {
           
        },
        help: {},
        package: {
            character: {
                character: Object.assign({}, ...allCharacters.map(char => char.character || {})),
                translate: Object.assign({}, ...allCharacters.map(char => {
                    let trans = char.characterTranslate || {};
                    return trans;
                })),
                // === 核心：分包设置 ===
                characterSort: {
                    "大梦千秋": {
                        "三国志": sgzCharacters.map(char => char.characterName),
                        "山海经": shjCharacters.map(char => char.characterName),
                        "魔法时代": mfsdCharacters.map(char => char.characterName),
                        "万古仙道": wgxdCharacters.map(char => char.characterName),
                    }
                },
                characterFilter: function(mode) {
                // 返回 true 表示该模式可用
                    return true; 
                // 或者像你教程里写的： return mode == "guozhan";
            },
            },
            skill: {
                skill: Object.assign({}, ...allCharacters.map(char => char.skills || {})),
                translate: Object.assign({}, ...allCharacters.map(char => char.skillTranslate || {})),
            },
            intro: "大梦千秋扩展包",
            author: "Loihan",
            version: "7.4",
        },
        files: { character: [], card: [], skill: [], audio: [] },
    };
}