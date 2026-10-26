// ============================================================
//  大梦千秋 · 皮肤 / 特效注册（千幻聆音 · 十周年UI · 无名美化 对接）
// ============================================================
//  本文件做两件事（都只在本扩展内完成，不改任何其它扩展文件）：
//   A. 皮肤：让梦小乔（sgz_xiaoqiao）能以「秋水伊人」皮肤出场。
//        · 静态皮肤图：extension/大梦千秋/skin/image/sgz_xiaoqiao/秋水伊人.jpg（本扩展内）
//        · 动皮骨骼：extension/十周年UI/assets/dynamic/大梦千秋/小乔/秋水伊人/（**必须**放这里，
//          原因见下方第 3 条；素材是复制过来的）
//   B. 特效：让梦曹髦【倾讨】（sgz_qingtao）播放手杀曹髦【决进】的那套特效。
//        实现不在本文件，而在 `character/sgz_caomao.js` 的 `sgz_qingtao.contentBefore`
//        （与本体决进同款做法）；素材在本扩展 `animation/caomao/` 下。见文件末尾第 7 节说明。
//
//  为什么这样放就能被认出来（代码依据）：
//   1) 千幻聆音「扩展武将自带皮肤目录」约定（extension/content.js:6623-6626，
//      game.qhly_foundPackageExt）：扩展武将的皮肤会去
//          extension/<扩展名>/skin/image/    找（本文件所在位置）
//          extension/<扩展名>/skin/audio/    找配音
//      且 game.qhly_foundPackage（:6467）会**优先**用这个包，再回退到千幻聆音自己的
//      sanguoskin 目录 —— 所以本扩展的武将皮肤不必放进千幻聆音里面。
//   2) 皮肤列表是扫盘得到的（game.qhly_getSkinList，extension/content.js:6746/6844），
//      扫的就是上面那个目录，按**文件名**当皮肤名（只用 .jpg/.png/.gif… 等图片后缀）。
//   3) 动皮参数取自 decadeUI.dynamicSkin[武将id][当前皮肤名]（extension/content.js:1360-1362），
//      所以这里往 decadeUI.dynamicSkin.sgz_xiaoqiao 注入同名条目即可生效。
//      ⚠ 但骨骼名**只能是十周年UI 自己 assets/dynamic/ 之内的相对路径**：
//        资源管理器的前缀被写死为 "assets/dynamic/"（main/content.js:583 →
//        js/animation.js:950/989/999），OffscreenCanvas 分支里 worker 的 importScripts
//        又是相对 dynamicWorker.js 解析（js/dynamicWorker.js:16），因此 "../" 会被
//        规范化回 assets/dynamic/，实测请求变成
//        `assets/dynamic/../十周年UI/assets/dynamic/...` → 404。
//        故素材必须实体复制到 assets/dynamic/大梦千秋/ 下（本次已复制，约 3 MB）。
//
//  调用方式：由本扩展的 extension.js 在运行期调用（见那里对 window.qhly_import 的探测）。
// ============================================================

/// 梦小乔 · 秋水伊人的动皮参数（与本体小乔的同名皮肤一致，**出杀特效已缩小到三分之一**）。
/// ⚠ 出杀特效 = 这里的 gongji；scale 由 1.07 缩到 0.3567（≈ 1/3）。
///    坐标不跟着缩，于是特效相对锚点会略微外移，视觉上大致仍居中于武将框右前方。
const DMQC_DUYU_XIAOQIAO_SKIN = "秋水伊人";
/// ⚠⚠ 骨骼路径**必须**是十周年UI 自己 assets/dynamic/ 之内的相对路径！
/// 十周年UI 给动皮资源管理器设的前缀就是 "assets/dynamic/"（main/content.js:583 →
/// js/animation.js:950/989/999），而 OffscreenCanvas 分支里 worker 的 importScripts
/// 是相对 dynamicWorker.js 解析的（js/dynamicWorker.js:16），所以任何 "../" 都会被
/// 规范化回 assets/dynamic/，最终请求变成
///   assets/dynamic/../十周年UI/assets/dynamic/...   → 404（实测就是这个报错）。
/// 结论：素材只能放进 `extension/十周年UI/assets/dynamic/<自己起的名>/`；
///       本包已把它复制到 assets/dynamic/大梦千秋/小乔/秋水伊人/（4 个文件，约 3 MB）。
const DMQC_DUYU_XIAOQIAO_SPINE = "大梦千秋/小乔/秋水伊人/XiaoQiao3_LiHui_XingXiang";
/// 出杀/使用牌特效的缩放：本体小乔是 1.07（体感太大），先缩到 1/3，再按需求放大到 1.5 倍。
/// 即 1.07 ÷ 3 × 1.5 ≈ 0.535。
const DMQC_DUYU_GONGJI_SCALE = (1.07 / 3) * 1.5;
/// 出杀/使用牌特效的水平位置：贴右侧边界（0.5 = 居中）。数值越大越往右，可按手感微调。
const DMQC_DUYU_GONGJI_X = [0, 0.83];

/// 梦姜维「静态 2 形态」在皮肤菜单里的名字（也是静态图文件名去掉扩展名）。
/// 说明：它是**本扩展自己的静态皮肤条目**，十周年UI 里没有对应动皮数据。
const DMQC_JIANGWEI_STATIC_KEY = "敕剑伏波(静)";
/// 梦姜维两张皮的皮肤名（以代码/素材为准：是「伏」不是「浮」）
const DMQC_JIANGWEI_DYNAMIC = "炽剑补天";
const DMQC_JIANGWEI_AWAKENED = "敕剑伏波";
/// 梦黄月英的动皮（原黄月英的「惊鸿一瞥」，十周年UI 本体数据在 huangyueying 段）
const DMQC_HUANGYUEYING_JINGHONG = "惊鸿一瞥";
/// 该皮待机骨骼名（用来判断「当前正在播的是不是这张皮」）
const DMQC_JINGHONG_SPINE = "黄月英/惊鸿一瞥/daiji";

// ============================================================
//  梦曹髦 · 「枭龙破渊」系列（两张动皮 + 腾渊变身）
// ============================================================
//  需求：平时「枭龙破渊」，获得【腾渊】后变「枭龙破渊2」，
//        失去【腾渊】且当前还是「枭龙破渊2」时切回「枭龙破渊」。
//  ⚠ 数据来源：`E:\Games\新扩展\03动皮包(2026.6.16)` 的 `src/skins/dynamicSkin.js`
//     （caomao 段）。该包的 `dynamicSkin.js` 是 **ES 模块**（`import ... from "noname"` +
//     `export const dynamicSkinConfig`），跟本机这套十周年UI 的加载方式
//     （`十周年UI/main/precontent.js:65` 用 `this.js()` 当**普通脚本**加载）不是一代的，
//     **不能整包安装** → 只摘素材 + 数据，由本扩展自己注入（见 `DMQC_SKIN_OVERRIDES`）。
//  ⚠ 素材位置：动皮立绘的骨骼根目录被十周年UI 写死为 `assets/dynamic/`
//     （`main/content.js:583` → `js/animation.js:950/989/999`，`../` 会被规范化掉 → 404，
//      梦小乔那次已实测过），所以这两套骨骼**必须实体放在**
//     `extension/十周年UI/assets/dynamic/曹髦/枭龙破渊{,_2}/`（已复制，共约 26 MB）。
//  ⚠ 数据里自带的 `special.condition.mbjuejin`（变身到 `caomao/枭龙破渊2`、特效 `shaohui`）
//     在**本机没用**：条件键 `mbjuejin` 是「无名美化」的决进技能名（我们的技能叫
//     `sgz_tengyuan` / `sgz_qingtao`），而且 `shaohui` 这个变身特效素材
//     在十周年UI / 皮肤切换 / 新无名美化里**哪都没有** → 那套机制整体是死的，故不搬进来，
//     变身改由本扩展自己驱动（见第 8 节的 `dmqcApplyTengyuanSkin` / `dmqcRevertTengyuanSkin`）。
const DMQC_CAOMAO_XIAOLONG = "枭龙破渊";
const DMQC_CAOMAO_XIAOLONG2 = "枭龙破渊2";
/// 两条骨骼的路径（用于判断「当前立绘是哪张」）
const DMQC_CAOMAO_XIAOLONG_SPINE = "曹髦/枭龙破渊/XingXiang";
const DMQC_CAOMAO_XIAOLONG2_SPINE = "曹髦/枭龙破渊2/XingXiang1";
/// 驱动变身的技能名
const DMQC_CAOMAO_TENGYUAN = "sgz_tengyuan";

// ============================================================
//  梦魏延 · 「狂志吞天」系列（两张动皮 + 击杀觉醒变身）
// ============================================================
//  需求：平时「狂志吞天」；**【竭伐】击杀觉醒（获得【竭燃】）后换成「狂志吞天2」**。
//  数据来源：`E:\Games\新扩展\②03动皮包更新包(2026.7.18)` 的 `src/skins/dynamicSkin.js`
//            （`pot_weiyan` 段第 72115-72183 行）。
//  ⚠ 和枭龙破渊一样，那个包的 `dynamicSkin.js` 是 **ES 模块**，跟本机这套十周年UI 的加载
//     方式不是一代的 → **不能整包安装**，只摘素材 + 数据，由本扩展自己注入。
//  ⚠ 动皮骨骼同样**必须实体放在** `十周年UI/assets/dynamic/势魏延/狂志吞天{,_2}/`
//     （骨骼根目录被写死为 `assets/dynamic/`，`../` 出不去）。
//  ⚠ 数据里自带的 `special.condition.shimingjiSuccess/shimingjiFail`（变身到
//     `pot_weiyan/狂志吞天2` / `狂志吞天3`、特效 `shaohui`）**在本机不生效**，故未搬：
//       · 条件键 `shimingjiSuccess` / `shimingjiFail` 由「皮肤切换」的 `_ts` 在
//         **技能名以 `_achieve` / `_fail` 结尾**时派发（皮肤切换/extension.js:310-322），
//         而梦魏延的使命技子技能叫 `sgz_jiefa_awaken`，**不符合那个命名约定** → 永不触发；
//       · `shaohui` 这个变身特效素材在十周年UI / 皮肤切换里都不存在（枭龙破渊那次已查过）。
//     所以变身由本扩展自己驱动（见 `window.dmqcApplyWeiyanAwakenSkin`）。
//     另：本体数据还配了「使命失败 → 狂志吞天3」，但梦魏延的竭伐**没有失败分支**，故不接。
const DMQC_WEIYAN_KUANGZHI = "狂志吞天";
const DMQC_WEIYAN_KUANGZHI2 = "狂志吞天2";
/// 两条骨骼的路径（用于判断「当前立绘是哪张」→ 决定壮誓用哪种形态的特效）
const DMQC_WEIYAN_KUANGZHI_SPINE = "势魏延/狂志吞天/XingXiang";
const DMQC_WEIYAN_KUANGZHI2_SPINE = "势魏延/狂志吞天2/XingXiang";

// ============================================================
//  梦陆逊 · 三张动皮 + 局内条件自动切换
// ============================================================
//  需求（2026）：
//    · ① 原陆逊皮肤「蛇年清明」  ② 原陆逊皮肤「烈火炽天」  ③ 原周瑜皮肤「烈焰炽魂」
//    · 默认 + **每轮开始时** → ①
//    · 发动【焚灭】后 → ②
//    · 发动【韬晦】后 → ③
//  素材位置（全部已存在，**不复制骨骼**）：
//    · ①② 数据：`十周年UI/js/dynamicSkin.js:20339-20353`、`20403-20417`（`luxun` 段）
//      素材：`十周年UI/assets/dynamic/陆逊/蛇年清明/`、`.../烈火炽天/`
//    · ③ 数据：`十周年UI/js/dynamicSkin.js:44466-44486`（`zhouyu` 段，骨骼名就是 `周瑜/烈焰炽魂/...`）
//      素材：`十周年UI/assets/dynamic/周瑜/烈焰炽魂/`
//      ⚠ ③ 是**周瑜**的皮，骨骼/贴图都在 `周瑜/` 目录下；数据里 `name` 就指向那个路径，
//        所以放在梦陆逊身上不需要搬素材（骨骼根目录写死 `assets/dynamic/`，跨武将引用没问题）。
//    · 静皮：三张都复制到了本包 `skin/image/sgz_luxun/<皮肤名>.jpg`（来自千幻 `sanguoskin/`）
const DMQC_LUXUN_MING = "蛇年清明"; // ①
const DMQC_LUXUN_HUO = "烈火炽天"; // ②
const DMQC_LUXUN_ZHOU = "烈焰炽魂"; // ③（周瑜的皮）
/// 三个形态按需求顺序排列，索引 0/1/2 ↔ ①/②/③
const DMQC_LUXUN_SKINS = [DMQC_LUXUN_MING, DMQC_LUXUN_HUO, DMQC_LUXUN_ZHOU];

// ============================================================
//  梦孙寒华 · 「威灵尽显」
// ============================================================
//  需求：为梦孙寒华加上本体孙寒华（手杀）的动态皮肤「威灵尽显」。
//  素材位置（**全部已存在，不复制骨骼**）：
//    · 骨骼：`extension/十周年UI/assets/dynamic/孙寒华/威灵尽显/`（XingXiang.skel/.atlas/.png ×11 + BeiJing + XingXiang.mp3）
//    · 数据：`十周年UI/js/dynamicSkin.js:27209-27223` 的 `dynamicSkin.sunhanhua.威灵尽显`
//    · 静皮：`extension/千幻聆音/sanguoskin/sunhanhua/威灵尽显.jpg`
//      ⚠ 这一张**确实复制了一份**到本包 `skin/image/sgz_sunhanhua/威灵尽显.jpg`。
//        原因：千幻取静皮的顺序是
//          `qhly_getSkinFile` → ①`skinPackage.replaceAvatarDestination` ②`_status.qhly_replaceSkin`
//          ③`skinPackage.skin.standard + realName + "/" + skin`（千幻聆音/extension/content.js:6409-6417）
//        而第②支还额外要求 `lib.qhly_skinChange[realName]` 存在 —— 那是一张**本体变身皮表**
//        （千幻聆音/skinChange.js），里面没有任何 `sgz_*` 条目，所以本包第 9 节登记的映射
//        `_status.qhly_replaceSkin` 对本包武将**实际是不生效的**，只能走第③支
//        （= 必须真的把图放在 `skin/image/<武将>/<皮肤名>.jpg`）。
//        这也解释了为什么梦钟会/梦郭嘉这批、以及本张皮都把静皮放进了 `skin/image/`。
//  数据要点：这张皮**没有** gongji / teshu / chuchang / shizhounian，
//    即只有「待机立绘 + 背景」，不会多出出框动作或出场动画 —— 与需求一致。
const DMQC_SUNHANHUA_WEILING = "威灵尽显";
/// 骨骼目录名（`assets/dynamic/<这个>/…`），将来要判断「当前是不是这张皮」时用得上
const DMQC_SUNHANHUA_WEILING_SPINE = "孙寒华/威灵尽显/XingXiang";

// ============================================================
//  梦钟会 · 「潜蛟觊天」→「潜蛟觊天2」+ 局内首次【矫诏】播视频
// ============================================================
//  需求（v7.6 之后的改动）：
//    · 增加本体钟会的第一形态「潜蛟觊天」，并把它设为**默认皮肤**；
//    · **每局第一次发动【矫诏】** → 在屏幕中央播放 `钟会.mp4`，并把皮肤切成「潜蛟觊天2」；
//    · **丢弃原来那套「患 ≥ 3 自动换皮」的逻辑**（已从 `DMQC_SWAP_RULES` 与角色文件里移除）。
//  ⚠ 两张皮的骨骼素材**十周年UI 里本来就有**（`assets/dynamic/钟会/潜蛟觊天{,_2}/`），
//    所以这次不用复制任何骨骼，只搬了一个视频。
//  ⚠ 数据里自带的 `special.condition.juexingji`（变身到 `zhonghui/潜蛟觊天2`、特效 `shaohui`）
//    **在本机不生效**，故未搬（梦钟会没有觉醒技，且 `shaohui` 素材哪都没有）——
//    变身改由本扩展自己驱动，见下面的 `dmqcZhonghuiJiaozhaoVideo`。
const DMQC_ZHONGHUI_QIANJIAO = "潜蛟觊天";
const DMQC_ZHONGHUI_QIANJIAO2 = "潜蛟觊天2";
/// 视频：放在本扩展自己的目录（视频**不受** `assets/dynamic/` 那个写死前缀的约束）
const DMQC_ZHONGHUI_VIDEO = "extension/大梦千秋/video/sgz_zhonghui.mp4";
/// 视频层级：要盖在武将/手牌之上（十周年UI 自己那套动皮用的是 60+，这里给到 80）
const DMQC_ZHONGHUI_VIDEO_ZINDEX = 80;
/// ★★★ 视频大小 —— **改这里就够** ★★★
///   width / height 接受任何 CSS 长度："80%"、"1200px"、"" 都行。
///   · 只按宽度缩放（保持比例、自动算高）→ 用 { width: "1200px", height: "auto" }
///   · 想强制拉伸成某个方框            → 两个都给具体值，如 { width: "1200px", height: "320px" }
///   ⚠ 另有 `max-width:92vw` / `max-height:92vh` 兜底，所以填大了也不会超出屏幕。
///   ⚠ 改完**刷新页面**生效；想立刻看效果可在控制台跑 `dmqcTestCenterVideo({width:"1000px"})` 试播。
const DMQC_ZHONGHUI_VIDEO_SIZE = { width: "100%", height: "auto" };
/// 播放期间是否**暂停游戏**（true = 看完才继续；已加超时兜底，不会卡死）
const DMQC_ZHONGHUI_VIDEO_PAUSE_GAME = true;
/// 是否只在**本地玩家**发动时播（false = 任何人的梦钟会首次矫诏都播，忠于需求原文）
const DMQC_ZHONGHUI_VIDEO_ONLY_MINE = false;

// ── 第二段视频：**非首次**矫诏时的演出（不中断游戏）────────────────────
/// 视频文件（已放在本扩展 video/ 下）
const DMQC_ZHONGHUI_VIDEO_SUB = "extension/大梦千秋/video/sgz_zhonghui.mp4";
/// ★★★ 小视频大小 ★★★（height:"auto" 保持比例）
const DMQC_ZHONGHUI_VIDEO_SUB_SIZE = { width: "50%", height: "auto" };
/// ★★★ 位置模式 ★★★
///   `true`  = **屏幕正中央**（当前设置；此时 rotate / gap / offset 都不起作用）
///   `false` = 锚在「该玩家武将牌上方」（原来那套，配合下面的 rotate / gap / offset）
const DMQC_ZHONGHUI_VIDEO_SUB_AT_CENTER = true;
/// 倾斜角度 —— 正值顺、负值逆。**现在 0 = 不倾斜**；想恢复「斜着」就填 -10 / -12。
const DMQC_ZHONGHUI_VIDEO_SUB_ROTATE = 0;
/// 距武将牌**上沿**的间距（px，**只在 `AT_CENTER = false` 时有效**）
const DMQC_ZHONGHUI_VIDEO_SUB_GAP = 6;
/// 水平偏移（px）—— **负值 = 往左**（**只在 `AT_CENTER = false` 时有效**）
///   在「武将牌正上方居中」的基础上再平移：想靠左就调更负（-60 / -80…），回中间就 0。
const DMQC_ZHONGHUI_VIDEO_SUB_OFFSET_X = 0;
/// 垂直偏移（px）—— **负值 = 往上**。默认 0，要单独微调上下时用它。
const DMQC_ZHONGHUI_VIDEO_SUB_OFFSET_Y = 0;
/// 小视频是否有声音（矫诏每回合可用 2 次，嫌吵就设 false）
const DMQC_ZHONGHUI_VIDEO_SUB_SOUND = true;
/// ★★★ 小视频层级 ★★★ —— 现在压得很低，**基本只比背景高**。
///   参考档位（本机实测/已知）：
///     · 游戏背景 ≈ 0~10
///     · **本值 = 20**（当前）
///     · 「无名美化」放中央视频用的是 14
///     · 千幻的动态立绘包裹层用 62 / 64；十周年UI 的武将牌也在 60+
///     · 本扩展的**中央大视频** `DMQC_ZHONGHUI_VIDEO_ZINDEX = 80`（那个要盖住一切，不动）
///   调法：被武将牌/手牌挡住 → 往上加；还盖住不该盖的东西 → 继续往下压。
const DMQC_ZHONGHUI_VIDEO_SUB_ZINDEX = 5;

// ============================================================
//  梦甘宁 · 「战破无间」 ／ 梦文鸯 · 「势若万钧」
// ============================================================
//  需求：把**本体武将**的两张皮借用给本包的两个新武将。
//  素材位置（骨骼/背景全部复用十周年UI，**不复制**；只复制了一张 412KB / 306KB 的静皮）：
//    · 梦甘宁 ← 本体「神甘宁」（`shen_ganning`）
//        数据：十周年UI/js/dynamicSkin.js 的 `dynamicSkin.shen_ganning.战破无间`（≈24534 行）
//        静皮：extension/千幻聆音/sanguoskin/shen_ganning/战破无间.jpg
//    · 梦文鸯 ← 本体「文鸯」（⚠ **`db_wenyang`**，不是 `wenyang`）
//        数据：十周年UI/js/dynamicSkin.js 的 `dynamicSkin.db_wenyang.势若万钧`（≈31898 行）
//        静皮：extension/千幻聆音/sanguoskin/db_wenyang/势若万钧.jpg
//      ⚠ 为什么是 `db_wenyang`：十周年UI 里 `db_wenyang`（手杀文鸯）和 `wenyang`（另一版文鸯）
//        是**两个条目**，`势若万钧` 只挂在 `db_wenyang` 下面（`wenyang` 下面是「万军披靡」）。
//        千幻的皮肤目录也是 `sanguoskin/db_wenyang/`，两边对得上。
//      ⚠ 静皮**必须**真的放进本包 `skin/image/<武将>/<皮肤名>.jpg`：
//        千幻取图的三条路里，只有第③条对本包 `sgz_*` 武将生效（详见上一节 孙寒华 的说明）。
//  数据要点：这两张皮**都没有** gongji / teshu / chuchang / shizhounian，
//    只有「待机立绘 + 背景」⇒ 不会多出出框动作或出场动画，与需求一致。
const DMQC_GANNING_ZHANPO = "战破无间";
const DMQC_WENYANG_SHIRO = "势若万钧";
/// 两张皮的骨骼路径（将来要判断「当前是不是这张皮」时用得上）
const DMQC_GANNING_ZHANPO_SPINE = "神甘宁/战破无间/XingXiang";
const DMQC_WENYANG_SHIRO_SPINE = "文鸯/势若万钧/XingXiang";

// ============================================================
//  梦赵云 · 四张「龙霄花色皮」
// ============================================================
//  需求：把按花色切换的那四张立绘**加入皮肤列表**（菜单里可选），
//        同时**保留**局内龙霄按花色自动换立绘，且**不写存档**。
//  ⚠ 图片仍放在原处（extension/大梦千秋/image/sgz_zhaoyun*.jpg），**不复制**；
//    靠千幻的 `_status.qhly_replaceSkin[武将][皮肤名] = 路径` 映射指过去
//    （千幻的 qhly_getSkinFile 会优先返回这个映射，见 content.js:6413-6415）。
//  花色 → 皮肤名。黑桃暂无专属图，按需求沿用原皮。
const DMQC_ZHAOYUN_SUIT_SKINS = {
	club: "赵云·龙霄♣",
	diamond: "赵云·龙霄♦",
	heart: "赵云·龙霄♥",
	spade: "赵云·龙霄♠",
};

window.qhly_import(function (lib, game, ui, get, ai, _status) {
	// ---- 1. 皮肤包：由本扩展的 extension.js 统一注册（此处只做自检） ----
	// ⚠ 历史坑（务必保留结论）：本扩展的 `extension.js:58-80` 早就为「千幻台词」注册过一个包，
	//   它的 `filterCharacter` 覆盖**本包全部武将**，而 `game.qhly_foundPackage` 是按
	//   `lib.qhlypkg` 顺序取**第一个匹配**的包 —— 所以那个包永远先被命中，这里再 push 一个也没用。
	//   真正决定「皮肤图片去哪儿找」的就是那个包的 `skin.standard`：
	//     原先写的是 `extension/大梦千秋/image/`（人物立绘目录，不是皮肤目录），
	//     于是静态皮被拼成 `extension/大梦千秋/image/sgz_xiaoqiao/秋水伊人.jpg` → 404 → 预览框全透明。
	//   修法：把那个包的 `skin.standard` 改成 `extension/大梦千秋/skin/image/`（已在本文件对应的
	//         extension.js 段落里改好），配音目录同步为 `.../skin/audio/`。
	//   下面这段自检日志用于确认最终生效的是哪条路径。
	//
	// 自检日志：能确认取图函数最终会给出什么路径
	try {
		const pkg = game.qhly_foundPackage ? game.qhly_foundPackage("sgz_xiaoqiao") : null;
		console.log(
			"[大梦千秋] 皮肤包自检：",
			JSON.stringify({
				standard: pkg && pkg.skin && pkg.skin.standard,
				audio: pkg && pkg.audio,
				skinFile: game.qhly_getSkinFile ? game.qhly_getSkinFile("sgz_xiaoqiao", "秋水伊人.jpg") : "(无该函数)",
			})
		);
	} catch (e) {
		console.error("[大梦千秋] 皮肤包自检失败：", e);
	}

	// ---- 2. 皮肤共享（**刻意留空**） ----
	// 这里**不**给 sgz_xiaoqiao 写 skinShare，原因有二：
	//   ① 皮肤列表已经由上面的 skin/image/ 目录决定，梦小乔只会多出「秋水伊人」这一张
	//      （skinShare 的 name 指向本体小乔反而会把小乔的 28 张皮肤一起借过来）；
	//   ② skinShare.skills 是「技能名对照表」，而梦小乔的技能是
	//      sgz_linglai / sgz_xianlv / sgz_wuyin，与本体小乔的 tianxiang / hongyan
	//      毫无对应关系，硬写只会把技能语音错误地指向别人的语音文件。
	// 若将来想让梦小乔复用本体小乔的皮肤（含阵亡语音/技能台词），再按千幻聆音 readme
	// 的格式补：
	//   lib.qhly_skinShare["sgz_xiaoqiao"] = { name: "xiaoqiao", skills: { ... } };
	// 但那会同时让小乔的全部皮肤出现在梦小乔的皮肤菜单里。

	// ---- 3. 注入梦小乔的动皮参数（皮肤名 → 骨骼/动作/坐标/缩放） ----
	// 千幻聆音在 player.init 里按「当前所选皮肤名」取这里的条目来播动皮。
	//
	// ⚠ 这里**刻意不写 chuchang**：
	//   皮肤切换有个全局技能 `_checkDcdChuChang`（皮肤切换/extension.js:626-637），
	//   它在**任意角色的回合开始**（trigger: global "phaseBefore"）播放“出场动画”，
	//   门槛正是 `player.dynamic.primary.player.chuchang` 存在。
	//   原先那条 chuchang 是照着本体小乔抄的，于是梦小乔每到自己回合就会放一次出框动画。
	//   删掉它 → 该门槛不成立 → 回合开始不再播，且不影响其它皮肤/其它角色。
	function dmqcInjectDynamicSkin() {
		if (!window.decadeUI || !window.decadeUI.dynamicSkin) return false;
		const ds = window.decadeUI.dynamicSkin;
		if (!ds.sgz_xiaoqiao) ds.sgz_xiaoqiao = {};
		// 已存在就不覆盖（避免与其它扩展/用户的改动打架）
		if (!ds.sgz_xiaoqiao[DMQC_DUYU_XIAOQIAO_SKIN]) {
			ds.sgz_xiaoqiao[DMQC_DUYU_XIAOQIAO_SKIN] = {
				name: DMQC_DUYU_XIAOQIAO_SPINE,
				version: "4.0",
				x: [0, 0.42],
				y: [0, 0.62],
				scale: 0.49,
				// ⚠ 没有 chuchang：见上方说明（回合开始不再播“出场动画”）
				// 出杀/使用牌时的动作：大小 = 1.07 的 1/3 再 ×1.5，位置贴右侧边界
				gongji: {
					name: DMQC_DUYU_XIAOQIAO_SPINE,
					x: DMQC_DUYU_GONGJI_X,
					y: [0, 0.48],
					scale: DMQC_DUYU_GONGJI_SCALE,
					action: "GongJi",
				},
				// 背景同样必须落在 assets/dynamic/ 之内（拼法是 decadeUIPath + "assets/dynamic/" + background）
				background: "大梦千秋/小乔/秋水伊人/beijing.png",
			};
		}
		return true;
	}
	dmqcInjectDynamicSkin();
	// 十周年UI 的 dynamicSkin.js 可能比本扩展晚一步执行完，这里补一次尝试
	if (!window.decadeUI || !window.decadeUI.dynamicSkin) {
		let tries = 0;
		const timer = setInterval(function () {
			tries++;
			if (dmqcInjectDynamicSkin() || tries > 40) clearInterval(timer);
		}, 500);
	}

	// ============================================================
	//  3c. 本包更多武将的动皮映射（梦姜维 / 梦钟会 / 梦郭嘉 / 梦诸葛诞 / 梦马超 / 梦关羽）
	// ============================================================
	//  做法：把 decadeUI.dynamicSkin 里**本体武将**的皮肤条目「引用」给本包的对应武将
	//  （与十周年UI 自己把 re_xiaoqiao 指到 xiaoqiao 是同一套写法）。
	//  素材一律**不复制**，直接复用十周年UI 现有资源。
	//  ⚠ 名字必须与 decadeUI.dynamicSkin[本体武将] 里的键**完全一致**，
	//    否则千幻按「当前皮肤名」取不到条目（只会打一条日志、不播动皮）。
	//  ⚠ 郭嘉「以身证道」是个例外：本体 guojia 条目里那份把骨骼写成了
	//    "蔡文姬/以身证道/XingXiang"（数据串了，实际贴图是郭嘉的脸），
	//    所以这里用**郭嘉自己目录**的真实骨骼 "郭嘉/以身证道/XingXiang"。
	//  ⚠ 诸葛诞「寿春举义」按你的选择沿用本体那套（骨骼其实指向「小渔爆料」）。
	const DMQC_DYNAMIC_INJECT = [
		// 梦姜维：两张可手动选。
		//   「敕剑伏波(静)」只是**菜单条目**（名字带 (静) 以示区别，本身不在十周年UI 数据里），
		//   它的静态图是本包自己的 skin/image/sgz_jiangwei/敕剑伏波(静).jpg，
		//   用来实现「用原静态皮肤时，伐达 9 只切成静态 2 形态」这条路（见第 8 节）。
		{ char: "sgz_jiangwei", src: "shen_jiangwei", skins: ["炽剑补天", "敕剑伏波", "敕剑伏波(静)"] },
		// 梦钟会：潜蛟觊天2（患≥3 自动切、<3 切回，见第 8 节）
		// 梦钟会：潜蛟觊天（默认，本体第一形态）/ 潜蛟觊天2
		//   ⚠ 两张皮的骨骼十周年UI 本体里都有，这里只是把数据「引用」过来；
		//     换皮时机改由「局内首次【矫诏】」驱动（见第 11 节），不再是「患 ≥ 3」。
		{ char: "sgz_zhonghui", src: "zhonghui", skins: [DMQC_ZHONGHUI_QIANJIAO, DMQC_ZHONGHUI_QIANJIAO2] },
		// 梦郭嘉
		{ char: "sgz_guojia", src: "guojia", skins: ["以身证道"] },
		// 梦诸葛诞
		{ char: "sgz_zhugedan", src: "zhugedan", skins: ["寿春举义"] },
		// 梦马超
		{ char: "sgz_machao", src: "shen_machao", skins: ["迅骛惊雷"] },
		// 梦关羽
		{ char: "sgz_guanyu", src: "shen_guanyu", skins: ["血海罗刹"] },
		// 梦曹髦：枭龙破渊 / 枭龙破渊2（两张都进菜单；腾渊增减时自动互换，见第 8 节）
		//   ⚠ 这两张是**本包自己带来的数据**（来自 03动皮包），十周年UI 本体里没有，
		//     所以 src 指向本体的 `caomao` 只为兜底，真正生效的是 DMQC_SKIN_OVERRIDES 里那两条。
		{ char: "sgz_caomao", src: "caomao", skins: [DMQC_CAOMAO_XIAOLONG, DMQC_CAOMAO_XIAOLONG2] },
		// 梦魏延：狂志吞天 / 狂志吞天2（击杀觉醒后自动换成 2，见第 8c 节）
		{ char: "sgz_weiyan", src: "pot_weiyan", skins: [DMQC_WEIYAN_KUANGZHI, DMQC_WEIYAN_KUANGZHI2] },
		// 梦孙寒华：威灵尽显
		//   src 指向本体「孙寒华」（十周年UI/js/dynamicSkin.js:27069-27224 那一整段，
		//   里面还有 蛇年春节 / 莲漪清荷 / 小山美伢 / 莲华熠熠 / 威灵尽显涩 等，**按需求只取这一张**）。
		//   ⚠ 这张皮的数据里**没有** gongji / teshu / chuchang / shizhounian ——
		//     即：没有出框动作、没有技能特效、没有出场动画，只有待机立绘 + 背景。
		//     这也正好符合「只加立绘、不额外加动作」的需求，无需再进 DMQC_SKIN_STRIP_ACTIONS。
		{ char: "sgz_sunhanhua", src: "sunhanhua", skins: [DMQC_SUNHANHUA_WEILING] },
		// 梦甘宁：战破无间（本体「神甘宁」shen_ganning 的皮，数据原样引用）
		//   ⚠ 数据里没有 gongji / teshu / chuchang / shizhounian ⇒ 只有待机立绘 + 背景。
		{ char: "sgz_gannin", src: "shen_ganning", skins: [DMQC_GANNING_ZHANPO] },
		// 梦文鸯：势若万钧（本体「文鸯」，⚠ 键是 `db_wenyang` 不是 `wenyang`，见上方第 2 节说明）
		{ char: "sgz_wenyang", src: "db_wenyang", skins: [DMQC_WENYANG_SHIRO] },
		// 梦陆逊：三张皮。
		//   ⚠ ① 直接引用 `luxun` 段原数据（**一个字都不改**）；
		//   ⚠ ②③ 的**出框攻击动作**用下面的 `DMQC_SKIN_PATCHES` 打补丁 ——
		//     只覆盖 `gongji` 一个键，框内（待机）的 x/y/scale/angle/beijing 全部沿用本体，
		//     不抄、不改、也不覆盖。
		//   ⚠ ③「烈焰炽魂」是**周瑜**的皮，在 `luxun` 段里没有 → 用 `srcBySkin` 指定它的来源是 `zhouyu`。
		{ char: "sgz_luxun", src: "luxun", srcBySkin: { [DMQC_LUXUN_ZHOU]: "zhouyu" }, skins: DMQC_LUXUN_SKINS },
		// 梦黄月英：原黄月英的「惊鸿一瞥」（十周年UI 本体 huangyueying 段原样引用）
		//   出框攻击动作的位置/大小在下面 DMQC_SKIN_PATCHES 里单独留了参数。
		{ char: "sgz_huangyueying", src: "huangyueying", skins: [DMQC_HUANGYUEYING_JINGHONG] },
	];
	// 郭嘉「以身证道」用自己目录的真实骨骼（覆盖本体那份串了路径的数据）；
	// 诸葛诞「寿春举义」按需求**去掉攻击/技能动作**（gongji / teshu），只留待机与背景；
	// 钟会「潜蛟觊天2」给 `gongji` 补一个**独立的 scale**（理由见下方注释）。
	// ⚠ 这里写的是**整条皮肤数据**，不是打补丁：一旦某个皮肤出现在这张表里，
	//   它就会**完全取代**十周年UI 本体那份数据，所以本体的字段（name / x / y / scale /
	//   angle / beijing）必须原样抄全，只改你要改的那一项。
	const DMQC_SKIN_OVERRIDES = {
		sgz_guojia: {
			以身证道: {
				name: "郭嘉/以身证道/XingXiang",
				x: [0, 0.48],
				y: [0, 0.13],
				angle: 7,
				scale: 0.61,
				beijing: {
					name: "郭嘉/以身证道/BeiJing",
					scale: 0.25,
					x: [0, 0.5],
					y: [0, 0.5],
				},
			},
		},
		sgz_zhonghui: {
			// 本体第一形态「潜蛟觊天」——逐字取自 十周年UI/js/dynamicSkin.js:43512-43538，
			//   **只去掉了那个在本机不生效的 `special` 块**（`condition.juexingji` 变身 +
			//   `shaohui` 特效：梦钟会没有觉醒技，且 `shaohui` 素材在十周年UI / 皮肤切换里都不存在）。
			潜蛟觊天: {
				name: "钟会/潜蛟觊天/XingXiang",
				x: [0, -0.7],
				y: [0, 0.38],
				scale: 0.45,
				angle: 0,
				beijing: {
					name: "钟会/潜蛟觊天/BeiJing",
					scale: 0.3,
					x: [0, 0.5],
					y: [0, 0.5],
				},
			},
			// 梦钟会「潜蛟觊天2」—— 出框特效大小
			//   本体那个条目（十周年UI/js/dynamicSkin.js:43539-43557）的 `gongji` 里
			//   **只写了 x / y，没写 scale**，于是走 皮肤切换/chukuangWorker.js:660 的兜底：
			//       if (!gongjiAction.scale) { gongjiAction.scale = player.scale }
			//   而 `player.scale` 就是下面这个**顶层的** `scale`（本体是 0.5）——
			//   所以出框特效一直被压到 0.5，显得偏小。
			//   ⚠ 顶层的 `scale` 同时管「待机立绘」，为了放大出框去动它会把站着的立绘一起放大，
			//     所以这里**只给出框单独加 `gongji.scale`**，顶层 scale 保持本体原值 0.5。
			//   ⚠ 兴伐 / 矫诏 触发的出框走的是**同一个 gongji**（见第 10 节），
			//     所以 ⬇ 这一个数字同时管那两个出框特效。
			//   👉 大小不合适就只调下面 `gongji.scale` 这一个数：
			//      本体等效值 = 0.5（偏小），参考区间 0.6 ~ 0.95，0.65 ≈ 原大小 ×1.3。
			潜蛟觊天2: {
				name: "钟会/潜蛟觊天2/XingXiang-1",
				x: [0, -1],
				y: [0, 0.4],
				scale: 0.5, // ← 待机立绘大小，勿动（本体值）
				angle: 0,
				gongji: {
					x: [0, 0.4],
					y: [0, 0.6],
					scale: 0.5, // ★★★ 出框特效大小：只改这一个数字 ★★★
				},
				beijing: {
					name: "钟会/潜蛟觊天2/BeiJing-1",
					scale: 0.3,
					x: [0, 0.5],
					y: [0, 0.5],
				},
			},
		},
		// 梦曹髦「枭龙破渊」系列 —— 数据逐字取自 03动皮包 的 `src/skins/dynamicSkin.js`
		// （caomao 段第 7333-7373 行），**只去掉了那个在本机完全无效的 `special` 块**
		// （理由见文件上方 DMQC_CAOMAO_* 常量处的注释）。
		// ⚠ 这两张皮的骨骼里**没有 `gongji` 动作**（枭龙破渊：DaiJi / ChuChang / TeShu；
		//   枭龙破渊2：daiji / GongJi / teshu / chuchang），所以：
		//     · 枭龙破渊 → 出框系统找不到 `GongJi` → 使用伤害牌时**不会**出框（正合需求）；
		//     · 枭龙破渊2 → 有 `GongJi` → 使用伤害牌会出框（未要求关闭，保持原样）。
		sgz_caomao: {
			[DMQC_CAOMAO_XIAOLONG]: {
				name: "曹髦/枭龙破渊/XingXiang",
				x: [0, 0.5],
				y: [0, 0.6],
				scale: 0.5,
				angle: 0,
				beijing: {
					name: "曹髦/枭龙破渊/BeiJing",
					scale: 0.3,
					x: [0, 0.4],
					y: [0, 0.5],
				},
			},
			[DMQC_CAOMAO_XIAOLONG2]: {
				name: "曹髦/枭龙破渊2/XingXiang1",
				x: [0, 0.7],
				y: [0, 0.55],
				scale: 0.4,
				angle: 0,
				beijing: {
					name: "曹髦/枭龙破渊2/BeiJing1",
					scale: 0.3,
					x: [0, 0.4],
					y: [0, 0.5],
				},
			},
		},
		// 梦魏延「狂志吞天」系列 —— 逐字取自 ②03动皮包更新包 的 `src/skins/dynamicSkin.js`
		// （`pot_weiyan` 段 72115-72183 行），**只去掉了那个在本机不生效的 `special` 块**
		// （理由见文件上方 DMQC_WEIYAN_* 常量处的注释）。
		// ⚠ `alpha` / `unpackPremultipliedAlpha` 按上面的结论**原样保留本体取值**。
		sgz_weiyan: {
			[DMQC_WEIYAN_KUANGZHI]: {
				name: "势魏延/狂志吞天/XingXiang",
				x: [0, 0.4],
				y: [0, 0.35],
				scale: 0.4,
				angle: 0,
				// ⚠⚠ `alpha` 在「皮肤切换」的 spine 运行时里**就是 premultipliedAlpha**
				//   （皮肤切换/animations.js:196 `this.premultipliedAlpha = initParam.alpha`，
				//    由 dynamicWorker.js:94 `sprite.alpha = player.alpha` 传进来）。
				// ── 实验记录（务必保留，别再绕回去）────────────────────────────
				//   ① `alpha:false` + 额外 `premultipliedAlpha:false` → 中间+左右三块红斑
				//   ② `alpha:true`（上游原值）                        → 红色更浓（加色叠加）
				//   ③ `alpha:false`（只关 alpha）                     → 身前/身后各一块亮红色光斑
				//   ④ 再试 `alpha:true`                               → **光斑更严重**（用户实测），已回滚
				//   ⑤ 摘掉 `beijing` 背景骨骼层                        → 光斑仍在 ⇒ 不在背景层
				//   ⑥ 离线解析 skel：一形态有 17 个 **`screen`** 混合槽位，二形态是 0 个
				//   ⑦ 试 `player.hideSlots` → **无效**（它只喂「部件列表」查询，渲染不读）
				//   ⑧ 【已修复】改**图集**：把 screen 层实际存在的 7 个 region 指到 1×1 全透明
				//      贴图 `dmqc_blank.png` → 光斑消失（用户实测"修好了"）。
				//      涉及 region：r-htx9 r-htx10 r-htx11 r-htx12 r-htx13 r-guang1 r-tx1
				//      原始图集备份：`XingXiang.atlas.dmqc.bak`（同目录，改坏了能还原）
				//   ⇒ 结论：光斑**不是 alpha 造成的**，别再动它；病根是 screen 混合层，
				//      已用图集消融彻底解决（自检见 `__dytest/check_weiyan_atlas.mjs`）。
				alpha: false,
				unpackPremultipliedAlpha: true,
				gongji: {
					alpha: false,
					unpackPremultipliedAlpha: true,
				},
				// 背景骨骼（已恢复）。摘掉它光斑仍在 → 与这一层无关，务必保留。
				beijing: {
					name: "势魏延/狂志吞天/BeiJing",
					scale: 0.3,
					x: [0, 0.4],
					y: [0, 0.5],
				},
			},
			[DMQC_WEIYAN_KUANGZHI2]: {
				name: "势魏延/狂志吞天2/XingXiang",
				x: [0, 1.3],
				y: [0, 0.4],
				scale: 0.4,
				angle: 0,
				beijing: {
					name: "势魏延/狂志吞天2/BeiJing",
					scale: 0.3,
					x: [0, 0.4],
					y: [0, 0.5],
				},
			},
		},
		// 梦孙寒华「威灵尽显」—— 逐字抄自 十周年UI/js/dynamicSkin.js:27209-27223，
		// **只多加了下面那个 `gongji` 块**（需求：出框攻击动作加速）。
		//   · 本体这张皮**根本没有 `gongji` 键** → 走 皮肤切换/chukuangWorker.js:664-672 的默认分支
		//     （`x/y = [0,0.5]`、`scale = player.scale`、`action = 'GongJi'`）。
		//     所以这里给 x/y/scale 全部省略，让它继续落在**完全一样的位置和大小**上，
		//     唯一变化就是 speed。
		//   · ⚠ 只写 `speed` 不写 `x/y` 是**安全的**：chukuangWorker.js:652-660 会给缺的 x/y 补
		//     `[0,0.5]` 并置 `posAuto = true`，而 `posAuto` 只在 `player.shizhounian` 时才拿去
		//     走十周年定位（setPos:772），本皮没有 shizhounian → 结果与旧行为逐像素一致。
		//   · ★★★ 出框快慢就是这一个数字：1 = 原速，1.6 ≈ 快 60% ★★★
		//   · 为什么这个键有用（链路，已逐行确认）：
		//       chukuangWorker.js:499 `getAnni(...).playSpine(actionParams)`
		//       → 皮肤切换/animations.js:185 `this.speed = initParam.speed`
		//       → 渲染循环 `state.update(delta / 1000 * speed)`（animations.js:1272/1277 等）
		//       → 同时 chukuangWorker.js:164 `showTime /= (playNode.speed || 1)`
		//         把「出框停留时间」也按 1/speed 缩短，所以动作播完正好收招，不会卡在攻击姿势。
		//     另外 `action: "GongJi"` 是本皮骨骼里真实存在的动画（XingShiang.skel 的动画名里
		//     有 `GongJi` / `gongji` / `teShu` / `ChuChang` / `daiji`），与默认分支取的是同一个。
		sgz_sunhanhua: {
			[DMQC_SUNHANHUA_WEILING]: {
				name: "孙寒华/威灵尽显/XingXiang",
				x: [0, 0.4],
				y: [0, 0.3],
				scale: 0.55,
				angle: -15,
				gongji: {
					name: "孙寒华/威灵尽显/XingXiang",
					action: "GongJi",
					speed: 1.6, // ★★★ 出框攻击动作速度：1 = 原速，越大越快 ★★★
				},
				beijing: {
					name: "孙寒华/威灵尽显/BeiJing",
					scale: 0.3,
					x: [0, 0.2],
					y: [0, 0.5],
				},
			},
		},
		// 梦甘宁「战破无间」—— 逐字抄自 十周年UI/js/dynamicSkin.js:24533-24552（本体 神甘宁 `shen_ganning`），
		// **只多加了下面那个 `gongji` 块**（需求：出框攻击特效从「屏幕中央」挪到「屏幕右下角」，大小不变）。
		//  ⚠ 本体这张皮**没有 `gongji` 键** ⇒ 走 皮肤切换/chukuangWorker.js:664-672 的兜底默认分支：
		//      `x/y = [0, 0.5] / [0, 0.5]`（= **屏幕正中央**，这就是"现在在中央"的原因）、
		//      `scale = player.scale`（= 顶层那个 0.41）、`action = 'GongJi'`。
		//  ★★★ 想细调出框位置/大小，**只改下面 `gongji` 里的三个数** ★★★
		//    · `x: [像素, 比例]` —— 比例 = **屏幕宽度**的百分比：0 = 左边缘，0.5 = 正中，1 = 右边缘；
		//      第一个数是像素微调（渲染时会乘 dpr），例：`[-80, 0.78]` = 再往左挪 80px。
		//    · `y: [像素, 比例]` —— 比例 = **屏幕高度**的百分比，⚠ **从屏幕底边往上算**：
		//      0 = 贴底边，0.5 = 正中，1 = 顶边 ⇒ 「右下角」= x 大、**y 小**。
		//    · `scale` —— 出框大小。**与顶层 0.41 相同 = 和现在完全一样大**（顶层那个管待机立绘，别混）。
		//  ⚠ 换算公式在 皮肤切换/animations.js:243-249 与 十周年UI/js/animation.js:190-196 完全一致：
		//    `像素 = value[0] * dpr + value[1] * referSize`；出框节点**没有 referNode**，
		//    所以 referSize 就是**整块画布**（= 屏幕）—— 这才有"[0,0.5] 落在正中央"的表现。
		//  ⚠ 待机那几项（顶层 name/x/y/angle/scale/beijing）必须与本体逐字一致，别顺手改，会动到站姿。
		sgz_gannin: {
			[DMQC_GANNING_ZHANPO]: {
				name: "神甘宁/战破无间/XingXiang",
				x: [0, -0.54],
				y: [0, 0.54],
				angle: 1,
				scale: 0.41, // ← 待机立绘大小（本体原值，勿动）
				gongji: {
					// 出框攻击特效：屏幕右下角（原来是 [0,0.5] / [0,0.5] = 正中央）
					x: [0, 0.85], // ★ 横向：越大越靠右（1 = 右边缘）
					y: [0, 0.20], // ★ 纵向：**从底边往上算**，越小越靠下（0 = 贴底边）
					scale: 0.41, // ★ 出框大小：与原来一致（= 顶层 scale）
				},
				beijing: {
					name: "神甘宁/战破无间/BeiJing",
					scale: 0.3,
					x: [0, 0.4],
					y: [0, 0.5],
				},
			},
		},
	};
	// 需要「去掉动作」的皮肤：注入时删掉**指定**的动作键（本体没写也照样删，防以后补上）
	//   · 梦姜维「炽剑补天」：去掉**技能触发特效**（`teshu` = action "jineng"）
	//     与 `shizhounian`（周年皮标记，是「使用牌/攻击动作」的通用判定来源）。
	//     **保留**待机（顶层 name）、出杀（`gongji`）、闪（`shan`）、出场（`chuchang`）、背景、指示线。
	//   · 梦诸葛诞「寿春举义」：按需求把整套动作都去掉，只留待机与背景。
	//  ⚠⚠ 重要：**这里删键「删不掉」出框**（务必保留结论，别再白试）
	//      `gongji` 键删掉后，皮肤切换/chukuangWorker.js:664-673 会落回兜底默认
	//      `{ name: player.name, action: 'GongJi', ... }`；寿春举义用的骨骼
	//      「诸葛诞/小渔爆料/XingXiang.skel」里**确实有 GongJi 动画**（还有 TeShu/ChuChang/DaiJi），
	//      所以删键之后照样出框。真正把出框关掉的，是第 3b 节 `_gj.filter` 里那条短路。
	//      这里保留 `gongji` 只是为了「本体以后再补上动作时也不会冒出来」，属于额外保险。
	const DMQC_SKIN_STRIP_ACTIONS = {
		sgz_zhugedan: { 寿春举义: ["gongji", "teshu", "shan", "shizhounian"] },
		sgz_jiangwei: { 炽剑补天: ["teshu", "shizhounian"] },
		// 梦陆逊 ③「烈焰炽魂」：**删掉 `chuchang`（回合开始的出场动画）**
		//   · 谁在播它：皮肤切换的 `_checkDcdChuChang`（皮肤切换/extension.js:626-637）
		//     `trigger: { global: "phaseBefore" }`，filter 里就一句
		//     `player.dynamic.primary.player.chuchang` —— 有这个键就播。
		//   · 所以只要把数据里的 `chuchang` 删掉，回合开始就不会再播那段动画。
		//   · 只删这一张（①②本来就没有 `chuchang`，不受影响）。
		sgz_luxun: { [DMQC_LUXUN_ZHOU]: ["chuchang"] },
	};
	// ---- 3e. 梦陆逊三张动皮的「全部参数」（要改就改这里）----
	//  为什么参数全写在这里：
	//    · 这三张皮是**本扩展注入**的（十周年UI 本体没有 `sgz_luxun`），而「皮肤切换」的
	//      调参保存只对「已存在的条目」生效、且它写盘要求能按骨骼名反查到皮肤名 ——
	//      对 ②烈火炽天 / ③烈焰炽魂（后者骨骼属于**周瑜**）实测**根本存不下来**
	//      （`extension/皮肤切换/saveSkinParams.js` 里从来就没有 `sgz_luxun` 这一项）。
	//    · 所以干脆**参数就写死在扩展里**：局内调参面板改的值不会保留（别再依赖它），
	//      要改就改下面这三段数字，保存后重启游戏即生效。
	//  ⚠ 合并方式：`DMQC_SKIN_PATCHES` 是**深合并**（只覆盖写到的键），
	//    没写的键继续用十周年UI 本体那份（名字/出场/背景等都不必抄）。
	//  ⚠ 数值含义（三个皮肤通用）：
	//    · x: [0, v]  → 水平位置，v = 屏幕宽度的比例（可为负，往左）
	//    · y: [0, v]  → 垂直位置，**从底边往上算**（0.22 = 离底边 22%）
	//    · scale      → 缩放（待机立绘的大小）
	//    · angle      → 旋转角度（度）
	//    · beijing    → **背景层**自己的一套 x / y / scale（和立绘是分开的）
	//    · gongji     → **出框攻击动作**：位置 / 大小 / 速度（speed：1 = 原速）
	const DMQC_SKIN_PATCHES = {
		sgz_luxun: {
			// ============ ① 蛇年清明（默认 / 每轮开始）============
			[DMQC_LUXUN_MING]: {
				// ↓↓↓ 框内（待机）位置与大小 —— 要调就改这四行 ↓↓↓
				x: [0, 1.5],
				y: [0, 0.3],
				scale: 0.4,
				angle: -13,
				beijing: {
					scale: 0.3,
					x: [0, 0.69],
					y: [0, 0.5],
				},
				// 本皮骨骼里**没有 GongJi**（只有 ChuChang / DaiJi / TeShu），所以不出框、不写 gongji。
			},
			// ============ ② 烈火炽天（发动【焚灭】后）============
			[DMQC_LUXUN_HUO]: {
				// ↓↓↓ 框内（待机）位置与大小 ↓↓↓
				x: [0, -0.05],
				y: [0, 0.45],
				scale: 0.3,
				angle: 0,
				beijing: {
					scale: 0.3,
					x: [0, 0.76],
					y: [0, 0.5],
				},
				// ↓↓↓ 出框攻击动作 ↓↓↓
				gongji: {
					name: "陆逊/烈火炽天/XingXiang",
					x: [0, 0.62],
					y: [0, 0.3],
					scale: 0.8,
					action: "GongJi",
					speed: 2,
				},
			},
			// ============ ③ 烈焰炽魂（发动【韬晦】后，周瑜的皮）============
			[DMQC_LUXUN_ZHOU]: {
				// ↓↓↓ 框内（待机）位置与大小 ↓↓↓
				x: [0, 0.47],
				y: [0, 0.47],
				scale: 0.3,
				// 背景是本皮的 PNG（`周瑜/烈焰炽魂/beijing.png`），不是骨骼，参数在 background 里，这里不动。
				// ↓↓↓ 出框攻击动作 ↓↓↓
				gongji: {
					x: [0, 0.8],
					y: [0, 0.48],
					scale: 0.57,
					speed: 1.35,
				},
			},
		},
		// ================= 梦黄月英 · 惊鸿一瞥 ==================
		//  出框攻击动作（GongJi）的**位置与大小**：要调就改这一段，改完重启游戏生效。
		//   · x: [0, v] → 水平位置（v = 屏幕宽度比例，负数往左）
		//   · y: [0, v] → 垂直位置（**从底边往上**算）
		//   · scale    → 缩放（越大越占屏）
		//   · action   → 骨骼里的动画名（这张皮是 GongJi）
		//   · speed    → 播放速度（1 = 原速；可不写）
		//  ⚠ 只覆盖 gongji 一个键，待机立绘/指示线/背景全部沿用本体数据。
		sgz_huangyueying: {
			// ⚠ 这里**必须写字面量**皮肤名（不能用 [DMQC_HUANGYUEYING_JINGHONG] 计算键）：
			//   自检脚本会把这段参数表整块 eval 出来核对数值，计算键在那边没有作用域。
			"惊鸿一瞥": {
				gongji: {
					name: "黄月英/惊鸿一瞥/xingxiang",
					x: [0, 0.8],
					y: [0, 0.48],
					scale: 0.57,
					action: "GongJi",
				},
			},
		},
	};
	/// 深拷贝皮肤数据（纯 JSON 结构：对象/数组/原始值）
	function dmqcCloneSkinData(v) {
		if (Array.isArray(v)) return v.map(dmqcCloneSkinData);
		if (v && typeof v === "object") {
			const out = {};
			for (const k in v) out[k] = dmqcCloneSkinData(v[k]);
			return out;
		}
		return v;
	}
	/// 深合并：把 patch 递归并到 base 上（数组整体替换），**不修改** base 本体
	/// ⚠ 未被打补丁的嵌套对象也要**复制一份**，否则后面「应用玩家保存的参数」时
	///   会顺着同一个引用改到十周年UI 本体那份数据（同场有本体陆逊/周瑜时会被连带改）。
	function dmqcMergeSkinData(base, patch) {
		if (patch === undefined) return dmqcCloneSkinData(base);
		if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
			return Array.isArray(patch) ? patch.slice() : patch;
		}
		const out = base && typeof base === "object" && !Array.isArray(base) ? Object.assign({}, base) : {};
		for (const key in out) {
			if (out[key] && typeof out[key] === "object") out[key] = dmqcCloneSkinData(out[key]);
		}
		for (const key in patch) {
			const pv = patch[key];
			const bv = out[key];
			if (pv && typeof pv === "object" && !Array.isArray(pv) && bv && typeof bv === "object" && !Array.isArray(bv)) {
				out[key] = dmqcMergeSkinData(bv, pv);
			} else {
				out[key] = Array.isArray(pv) ? pv.slice() : pv;
			}
		}
		return out;
	}
	function dmqcInjectMoreDynamicSkins() {
		if (!window.decadeUI || !window.decadeUI.dynamicSkin) return false;
		const ds = window.decadeUI.dynamicSkin;
		for (const item of DMQC_DYNAMIC_INJECT) {
			const src = ds[item.src];
			if (!src) continue; // 十周年UI 没这个本体的动皮数据 → 跳过
			if (!ds[item.char]) ds[item.char] = {};
			for (const skinName of item.skins) {
				// 「敕剑伏波(静)」是我们自己的**静态**皮肤条目：
				// 它只出现在皮肤列表里（由第 6 节的 DMQC_SKIN_FILES 提供），
				// 十周年UI 并没有这份动皮数据，所以这里跳过、不产出 warn。
				if (skinName === DMQC_JIANGWEI_STATIC_KEY) continue;
				let placed = false;
				if (ds[item.char][skinName]) {
					placed = true; // 已存在（例如同一次会话里重复调用）
				} else {
					const override =
						DMQC_SKIN_OVERRIDES[item.char] && DMQC_SKIN_OVERRIDES[item.char][skinName];
					const patch =
						DMQC_SKIN_PATCHES[item.char] && DMQC_SKIN_PATCHES[item.char][skinName];
					// 这张皮的「原数据」在哪个本体段里（默认 item.src；③ 烈焰炽魂是周瑜的皮 → srcBySkin）
					const baseKey = (item.srcBySkin && item.srcBySkin[skinName]) || item.src;
					const baseTable = ds[baseKey] || src;
					const baseData = baseTable && baseTable[skinName];
					if (patch) {
						// 只改 patch 里写到的键，框内参数全部沿用本体
						if (!baseData) {
							console.warn("[大梦千秋] 打补丁失败（本体没这份动皮数据）：" + baseKey + " / " + skinName);
						} else {
							ds[item.char][skinName] = dmqcMergeSkinData(baseData, patch);
							placed = true;
						}
					} else if (override) {
						ds[item.char][skinName] = override;
						placed = true;
					} else if (baseData) {
						// 复制本体那一份（**不能直接共享引用**：后面应用玩家保存的参数会写进这个对象，
						// 共享的话会把十周年UI 本体里同名武将的皮肤数据一起改掉）
						ds[item.char][skinName] = dmqcCloneSkinData(baseData);
						placed = true;
					} else {
						console.warn("[大梦千秋] 十周年UI 里找不到动皮数据：" + item.src + " / " + skinName);
					}
				}
				// 该皮肤若在「去掉动作」名单里，就按名单删掉指定的动作键。
				// ⚠ 这个删除不受上面「已存在就跳过」的影响：每次调用都清一遍，保证一定生效。
				const stripKeys =
					placed && DMQC_SKIN_STRIP_ACTIONS[item.char]
						? DMQC_SKIN_STRIP_ACTIONS[item.char][skinName]
						: null;
				if (Array.isArray(stripKeys)) {
					for (const key of stripKeys) {
						if (ds[item.char][skinName][key] !== undefined) delete ds[item.char][skinName][key];
					}
				}
			}
		}
		// 参数全部来自本文件（DMQC_SKIN_PATCHES），不需要再做任何运行期回填。
		return true;
	}
	if (!dmqcInjectMoreDynamicSkins()) {
		let tries2 = 0;
		const timer5 = setInterval(function () {
			tries2++;
			if (dmqcInjectMoreDynamicSkins() || tries2 > 40) clearInterval(timer5);
		}, 500);
	}

	// ---- 3b. 出框动作的触发条件 ----
	// 机制：皮肤切换的 `_gj`（皮肤切换/extension.js:331-342）负责在出杀时播放动皮动作，
	//      它的 filter 限定了「基本/锦囊 且 带 damage 标签」的牌。
	// 本扩展按角色改这条规则（**同一个包装器里处理，不要各包一层**）：
	//   · 梦小乔（秋水伊人）  → 放宽：使用任意牌都播（原来只播伤害牌）。
	//   · 梦郭嘉（以身证道）  → 收紧到零：伤害牌**不再**播，改由【极慧】触发（见第 10 节）。
	//   · 梦钟会（潜蛟觊天 / 潜蛟觊天2，**两个形态都算**） → 收紧到零：伤害牌**不再**播，
	//     改由【逐月】触发（见第 10 节）。⚠ 潜蛟觊天现在是默认皮，它的骨骼里同样有 `GongJi`，
	//     所以只挡潜蛟觊天2 是不够的 —— 否则常态下「使用伤害牌」会自动出框。
	//   · 梦诸葛诞（寿春举义）→ 收紧到零：伤害牌**不再**播，且**没有替代触发**（就是纯粹屏蔽）。
	// 做法：只在这些角色的条件命中时短路，其它角色完全走原逻辑，互不影响。
	// ⚠ 这是运行期包装（不落盘、不修改任何扩展文件），只包一层且在条件不满足时原样返回原结果。
	// ⚠ 骨骼路径集中在此声明（第 10 节有完整来龙去脉，别再白试「删键」）。
	//   ⚠ **「删键」为什么不管用**：`gongji` 这个键删掉之后，皮肤切换/chukuangWorker.js:664-673
	//     会落回兜底默认 `{ name: player.name, action: 'GongJi', ... }` —— 只要骨骼里有 `GongJi`
	//     动画（寿春举义用的「诸葛诞/小渔爆料/XingXiang.skel」里就有 GongJi/TeShu/ChuChang/DaiJi），
	//     照样会播。所以唯一可靠的做法就是**在触发源这里短路**。
	const DMQC_YISHEN_SPINE = "郭嘉/以身证道/XingXiang"; // 梦郭嘉·以身证道
	const DMQC_QIANJIAO_SPINE = "钟会/潜蛟觊天2/XingXiang-1"; // 梦钟会·潜蛟觊天2（觉醒形态）
	const DMQC_QIANJIAO1_SPINE = "钟会/潜蛟觊天/XingXiang"; // 梦钟会·潜蛟觊天（常态，默认皮）
	const DMQC_SHOUCHUN_SPINE = "诸葛诞/小渔爆料/XingXiang"; // 梦诸葛诞·寿春举义（骨骼实为「小渔爆料」）
	// 当前立绘是不是指定那张皮（比查千幻配置更直接：直接看正在播的动皮）
	function dmqcSkinIs(player, spine) {
		return !!(player && spine && player.dynamic && player.dynamic.primary && player.dynamic.primary.name === spine);
	}
	// 当前立绘是不是「以身证道」
	function dmqcIsYishenZhengdao(player) {
		return dmqcSkinIs(player, DMQC_YISHEN_SPINE);
	}
	// 当前立绘是不是梦钟会的「潜蛟觊天」系列（**两个形态都算**）
	//  ⚠ 必须两个都认：潜蛟觊天是现在的**默认皮**，而它的骨骼里同样有 `GongJi`
	//    —— 只挡潜蛟觊天2 的话，常态下「使用伤害牌」又会自动出框（2026 改动踩过）。
	function dmqcIsQianjiaoJitian(player) {
		return dmqcSkinIs(player, DMQC_QIANJIAO_SPINE) || dmqcSkinIs(player, DMQC_QIANJIAO1_SPINE);
	}
	// 当前立绘是不是「寿春举义」
	function dmqcIsShouchunJuyi(player) {
		return dmqcSkinIs(player, DMQC_SHOUCHUN_SPINE);
	}
	// 当前立绘是不是梦黄月英的「惊鸿一瞥」（原黄月英的动皮）
	function dmqcIsJinghongYipie(player) {
		return dmqcSkinIs(player, DMQC_JINGHONG_SPINE);
	}
	// 当前立绘是不是梦孙寒华的「威灵尽显」
	//   ⚠ 路径常量用文件顶部那个 DMQC_SUNHANHUA_WEILING_SPINE（"孙寒华/威灵尽显/XingXiang"）
	function dmqcIsWeilingXianxian(player) {
		return dmqcSkinIs(player, DMQC_SUNHANHUA_WEILING_SPINE);
	}
	// 当前立绘是不是梦文鸯的「势若万钧」
	//   ⚠ 路径常量用文件顶部那个 DMQC_WENYANG_SHIRO_SPINE（"文鸯/势若万钧/XingXiang"）
	function dmqcIsShiRuoWanjun(player) {
		return dmqcSkinIs(player, DMQC_WENYANG_SHIRO_SPINE);
	}
	// 当前立绘是不是梦甘宁的「战破无间」
	//   ⚠ 路径常量用文件顶部那个 DMQC_GANNING_ZHANPO_SPINE（"神甘宁/战破无间/XingXiang"）
	function dmqcIsZhanPoWujian(player) {
		return dmqcSkinIs(player, DMQC_GANNING_ZHANPO_SPINE);
	}
	window.dmqcIsYishenZhengdao = dmqcIsYishenZhengdao;

	function dmqcEnableAnyCardAction() {
		const sk = window.skinSwitch;
		if (!sk || !sk.chukuangWorkerApi || !lib.skill || !lib.skill._gj) return false;
		if (lib.skill._gj.__dmqcWrapped) return true;
		const origin = lib.skill._gj.filter;
		const qhlySkinIs = (charId, skinFile) => {
			try {
				return typeof game.qhly_getSkin === "function" && game.qhly_getSkin(charId) === skinFile;
			} catch (e) {
				return false;
			}
		};
		const wrapped = function (event, player) {
			try {
				// 这几张皮：伤害牌不播出框
				//   · 以身证道 / 潜蛟觊天2 → 改由技能触发（见第 10 节）
				//   · 寿春举义            → 按要求**彻底屏蔽**，没有替代触发
				//   · 威灵尽显（梦孙寒华）→ 改由「发动妙剑④」触发（见第 10 节）
				//   · 势若万钧（梦文鸯）  → 改由「使用【惊跃】」触发（见第 10 节）
				//   · 战破无间（梦甘宁）  → 改由「**即将造成伤害时**」触发（见第 10 节）
				if (dmqcIsYishenZhengdao(player) || dmqcIsQianjiaoJitian(player) || dmqcIsShouchunJuyi(player) || dmqcIsWeilingXianxian(player) || dmqcIsShiRuoWanjun(player) || dmqcIsZhanPoWujian(player)) return false;
				// 梦黄月英（惊鸿一瞥）：出框条件改为「使用锦囊牌」
				//   · 原来是「基本/锦囊 且带 damage 标签」，即只有火攻/南蛮/万箭这类伤害锦囊才出框；
				//   · 现在只要是**锦囊牌**（get.type2 == 'trick'，含延时锦囊）就出框。
				if (
					player &&
					_status.currentPhase === player &&
					player.dynamic &&
					(player.name1 === "sgz_huangyueying" || player.name === "sgz_huangyueying") &&
					dmqcIsJinghongYipie(player)
				) {
					return get.type2(event.card) === "trick";
				}
				// 仅当：是梦小乔 + 装备秋水伊人 + 本回合的持有者 + 有动皮
				if (
					player &&
					_status.currentPhase === player &&
					player.dynamic &&
					player.name1 === "sgz_xiaoqiao" &&
					qhlySkinIs("sgz_xiaoqiao", DMQC_DUYU_XIAOQIAO_SKIN + ".jpg")
				) {
					return true;
				}
			} catch (e) {
				/* 出错就退回原逻辑 */
			}
			return typeof origin === "function" ? origin.apply(this, arguments) : false;
		};
		wrapped.__dmqcWrapped = true;
		lib.skill._gj.filter = wrapped;
		console.log("[大梦千秋] 出框动作已改：梦黄月英（惊鸿一瞥）→ 使用锦囊牌；梦小乔（秋水伊人）→ 使用任意牌；梦郭嘉【极慧】/梦钟会【逐月】/梦孙寒华【妙剑④】/梦文鸯【惊跃】的伤害牌出框已关闭（改由技能触发）；梦甘宁（战破无间）→ 改为**即将造成伤害时**触发；梦诸葛诞（寿春举义）的出框已屏蔽");
		return true;
	}
	if (!dmqcEnableAnyCardAction()) {
		let tries = 0;
		const timer2 = setInterval(function () {
			tries++;
			if (dmqcEnableAnyCardAction() || tries > 40) clearInterval(timer2);
		}, 500);
	}

	// ---- 4. 清掉皮肤列表缓存 ----
	// 皮肤列表有缓存（千幻聆音的 _status.qhly_skinListCache，extension/content.js:6789/6846）。
	// 新增皮肤图后，若玩家是在同一局游戏内升级的本扩展，缓存里可能还留着旧的列表
	// —— 那会表现为皮肤格子是空的。这里把这些武将的缓存清掉，强制下次重扫。
	try {
		if (_status && _status.qhly_skinListCache) {
			for (const id of ["sgz_xiaoqiao", "sgz_zhaoyun", "sgz_jiangwei", "sgz_zhonghui", "sgz_guojia", "sgz_zhugedan", "sgz_machao", "sgz_guanyu", "sgz_caomao", "sgz_weiyan", "sgz_sunhanhua", "sgz_gannin", "sgz_wenyang", "sgz_huangyueying"]) {
				delete _status.qhly_skinListCache[id];
			}
		}
	} catch (e) {}

	// ---- 5. 设定默认皮肤 ----
	// 只在「玩家还没给该武将选过皮肤」时写入默认值，之后玩家在换肤菜单里的选择优先。
	// 写的是千幻聆音的皮肤配置（lib.config.qhly_skinset.skin[武将id] = 皮肤文件名）。
	//   · 梦姜维 → 炽剑补天（伐达 9 会自动切到敕剑伏波，见第 8 节）
	//   · 其余四位 → 各自那张动皮
	//   · **梦赵云不设默认**：它靠龙霄按花色自动换立绘（不是「一张固定皮肤」），
	//     设了默认反而会在开局就把它钉成某一张。它的花色皮肤见第 9 节。
	// ⚠ 必须保持与千幻聆音 extension/content.js:5733 相同的对象结构（skin / skinAudioList /
	//   audioReplace / djtoggle 四个键），否则会把它自己的皮肤配置搞坏；已存在时一律不动。
	const DMQC_DEFAULT_SKINS = {
		sgz_xiaoqiao: DMQC_DUYU_XIAOQIAO_SKIN + ".jpg", // 秋水伊人
		sgz_jiangwei: "炽剑补天.jpg",
		sgz_zhonghui: DMQC_ZHONGHUI_QIANJIAO + ".jpg",
		sgz_guojia: "以身证道.jpg",
		sgz_zhugedan: "寿春举义.jpg",
		sgz_machao: "迅骛惊雷.jpg",
		sgz_guanyu: "血海罗刹.jpg",
		// 梦曹髦 → 枭龙破渊（平时形态；获得【腾渊】后自动变「枭龙破渊2」，见第 8 节）
		sgz_caomao: DMQC_CAOMAO_XIAOLONG + ".jpg",
		// 梦魏延 → 狂志吞天（平时形态；【竭伐】击杀觉醒后自动变「狂志吞天2」，见第 8c 节）
		sgz_weiyan: DMQC_WEIYAN_KUANGZHI + ".jpg",
		// 梦孙寒华 → 威灵尽显（本包目前唯一一张皮；静皮在 skin/image/sgz_sunhanhua/ 下）
		sgz_sunhanhua: DMQC_SUNHANHUA_WEILING + ".jpg",
		// 梦陆逊 → 蛇年清明（默认形态；【焚灭】→烈火炽天、【韬晦】→烈焰炽魂，每轮开始回到这张，见第 8h 节）
		sgz_luxun: DMQC_LUXUN_MING + ".jpg",
		// 梦黄月英 → 惊鸿一瞥（原黄月英的动皮；静态预览图在 skin/image/sgz_huangyueying/ 下）
		sgz_huangyueying: DMQC_HUANGYUEYING_JINGHONG + ".jpg",
	};
	try {
		if (!lib.config.qhly_skinset) {
			// 千幻聆音正常会在自己的 content 里建好这个对象；走到这里说明它还没跑到，
			// 那就照它的结构补一个完整的（不覆盖任何已有数据）。
			game.saveConfig("qhly_skinset", { skin: {}, skinAudioList: {}, audioReplace: {}, djtoggle: {} });
		}
		const set = lib.config.qhly_skinset;
		if (!set.skin) set.skin = {};
		let changed = false;
		for (const id in DMQC_DEFAULT_SKINS) {
			if (!set.skin[id]) {
				set.skin[id] = DMQC_DEFAULT_SKINS[id];
				changed = true;
				console.log("[大梦千秋] 默认皮肤：" + id + " →「" + DMQC_DEFAULT_SKINS[id] + "」（可在换肤菜单中更改）");
			}
		}
		if (changed) {
			if (typeof game.qhlySyncConfig == "function") game.qhlySyncConfig();
			else game.saveConfig("qhly_skinset", set);
		}
	} catch (e) {
		console.error("[大梦千秋] 设置默认皮肤失败（不影响其它功能）：", e);
	}

	// ---- 6. 保证皮肤条目在「皮肤列表」里一定存在（静态图能否显示的关键） ----
	// 为什么需要：千幻聆音的皮肤列表是**扫盘**得到的（game.qhly_getSkinList），
	// 取图时（game.qhly_getSkinFile）与详情预览都用列表项的 `skinId` 当文件名。
	// 一旦扫盘没把某个皮肤图列出来（例如目录里还没有那张图、或 getFileList 拿不到该目录），
	// 预览框就会走 `if (!skin) return prefix + 武将 + ".jpg"` 这一支 ——
	// 落到 `extension/大梦千秋/image/<武将>.jpg`（多数不存在），于是预览框**全透明**。
	// 做法：包装 qhly_getSkinList，只保证下面这张表里声明的「武将 → 皮肤文件名」条目存在，
	//       其余条目、其它武将一律原样透传，不改变原有行为。
	//
	//  ⚠ 表里的文件名同时就是「静态皮肤图」应有的文件名（缺少图时立绘会退回原画），
	//    图要放到：extension/大梦千秋/skin/image/<武将id>/<皮肤名>.jpg
	const DMQC_SKIN_FILES = {
		sgz_xiaoqiao: ["秋水伊人.jpg"],
		// 梦姜维：动皮两张（炽剑补天 / 敕剑伏波）＋ 本包自带的静态 2 形态
		sgz_jiangwei: [DMQC_JIANGWEI_DYNAMIC + ".jpg", DMQC_JIANGWEI_AWAKENED + ".jpg", DMQC_JIANGWEI_STATIC_KEY + ".jpg"],
		// 梦赵云：四张花色皮（图在 image/ 下，用 _status.qhly_replaceSkin 指过去，见第 9 节）
		sgz_zhaoyun: Object.values(DMQC_ZHAOYUN_SUIT_SKINS).map(name => name + ".jpg"),
		// 梦钟会：潜蛟觊天 / 潜蛟觊天2（静态图沿用本包原有的两张原画）
		sgz_zhonghui: [DMQC_ZHONGHUI_QIANJIAO + ".jpg", DMQC_ZHONGHUI_QIANJIAO2 + ".jpg"],
		// 梦郭嘉
		sgz_guojia: ["以身证道.jpg"],
		// 梦诸葛诞
		sgz_zhugedan: ["寿春举义.jpg"],
		// 梦马超
		sgz_machao: ["迅骛惊雷.jpg"],
		// 梦关羽
		sgz_guanyu: ["血海罗刹.jpg"],
		// 梦曹髦：枭龙破渊 / 枭龙破渊2（两张都可手动选；静态图沿用本包原画，见第 9 节）
		sgz_caomao: [DMQC_CAOMAO_XIAOLONG + ".jpg", DMQC_CAOMAO_XIAOLONG2 + ".jpg"],
		// 梦魏延：狂志吞天 / 狂志吞天2（两张都可手动选；静态图沿用本包原画，见第 9 节）
		sgz_weiyan: [DMQC_WEIYAN_KUANGZHI + ".jpg", DMQC_WEIYAN_KUANGZHI2 + ".jpg"],
		// 梦孙寒华：威灵尽显（静皮已放在 skin/image/sgz_sunhanhua/威灵尽显.jpg，这里只是兜底补入列表）
		sgz_sunhanhua: [DMQC_SUNHANHUA_WEILING + ".jpg"],
		// 梦甘宁：战破无间（静皮 = skin/image/sgz_gannin/战破无间.jpg，复制自千幻 sanguoskin/shen_ganning）
		sgz_gannin: [DMQC_GANNING_ZHANPO + ".jpg"],
		// 梦文鸯：势若万钧（静皮 = skin/image/sgz_wenyang/势若万钧.jpg，复制自千幻 sanguoskin/db_wenyang）
		sgz_wenyang: [DMQC_WENYANG_SHIRO + ".jpg"],
		// 梦陆逊：三张动皮各自的静皮（skin/image/sgz_luxun/，复制自千幻 sanguoskin/luxun 与 zhouyu）
		sgz_luxun: DMQC_LUXUN_SKINS.map(name => name + ".jpg"),
		// 梦黄月英：惊鸿一瞥（静皮 = skin/image/sgz_huangyueying/惊鸿一瞥.jpg）
		sgz_huangyueying: [DMQC_HUANGYUEYING_JINGHONG + ".jpg"],
	};
	function dmqcEnsureSkinListed() {
		if (typeof game.qhly_getSkinList !== "function" || game.qhly_getSkinList.__dmqcWrapped) return false;
		const originGetSkinList = game.qhly_getSkinList;
		const wrappedGetSkinList = function (name, callback, locked, loadInfoJs) {
			const wrappedCb = function (ok, list) {
				try {
					const need = DMQC_SKIN_FILES[name];
					if (typeof callback === "function" && need && Array.isArray(list)) {
						for (const file of need) {
							if (!list.includes(file)) {
								list.push(file);
								console.log("[大梦千秋] 皮肤列表补入「" + name + " / " + file + "」");
							}
						}
					}
				} catch (e) {}
				if (typeof callback === "function") callback(ok, list);
			};
			return originGetSkinList.call(this, name, wrappedCb, locked, loadInfoJs);
		};
		wrappedGetSkinList.__dmqcWrapped = true;
		game.qhly_getSkinList = wrappedGetSkinList;
		return true;
	}
	if (!dmqcEnsureSkinListed()) {
		let tries = 0;
		const timer3 = setInterval(function () {
			tries++;
			if (dmqcEnsureSkinListed() || tries > 40) clearInterval(timer3);
		}, 500);
	}

	// ============================================================
	//  7. 梦曹髦【倾讨】
	// ============================================================
	//  现状（v7.6 重构后）：【倾讨】已拆成「空壳技能 + 实效果子技能」——
	//    · `sgz_qingtao`（空壳）：只管能不能点/选谁/AI，`content` 只调子技能；
	//    · `sgz_qingtao_effect`（子技能，引擎按 subSkill 注册）：实际结算 +
	//      `contentBefore` 里播决进特效（素材在本扩展 animation/caomao/）。
	//  因为空壳自己**既没有特效、也不调 `$skill`**，所以不会再经
	//  「十周年UI 的 $skill → decadeUI.effect.skill → 无名美化通用限定技特效」那条链。
	//  「缚渊终极对决」分支同样改成直接调特效播放器、不再调 `$skill`。
	//
	//  ⇒ 因此这里**不再需要**任何运行期包装（曾经包过 decadeUI.effect.skill 与
	//     player.$skill 来屏蔽通用特效，但那个函数由「无名美化」在自己的 precontent 里赋值，
	//     时序不可控、会失效）。现在靠技能结构根治，代码更干净。
	//
	//  ⚠ 备查：十周年UI 的 $skill 会把**中文技能名**透传给 decadeUI.effect.skill
	//    （main/content.js:795；无名美化也用中文名反推 id），所以若将来又要屏蔽某个技能，
	//    判断依据应当是中文名而不是技能 id。
	//
	//  ⚠ 决进特效现在有**两套**（由 `character/sgz_caomao.js` 的 `sgzQingtaoJuejinEffect` 分流）：
	//    · 旧套（默认，无名美化「向死存魏」模式 a）：`animation/caomao/SS_cmskill` +
	//      `SS_cmmask` + `audio/effect_caomao_skill.mp3`（v7.6 时从旧无名美化复制过来）；
	//    · 新套（**枭龙破渊**，无名美化「枭龙破渊」模式 b）：`animation/caomao/juejin2/`
	//      的 `SS_cmnewskill` + `SS_cmnewmask` + `effect_caomao_skill_2025.mp3`。
	//    判据是「当前立绘是不是枭龙破渊系列」——见 character/sgz_caomao.js 里 `sgzQingtaoJuejinEffect` 的注释。

	// ============================================================
	//  8. 自动换肤（梦姜维的伐 / 梦钟会的患：按标记数量；梦曹髦的腾渊：见 8b；梦魏延的击杀觉醒：见 8c）
	// ============================================================
	//  ⚠ 为什么不用「无名美化/千幻」自带的 lib.qhly_skinChange：
	//    那套的 source 只支持 'hp_x'（体力）与技能名，**不支持按标记数量**，
	//    所以这里自己实现，并通过全局函数暴露给角色文件调用。

	/**
	 * 把某武将**当前这一局**的立绘/动皮切换为指定皮肤。
	 * ⚠ **不写存档**（不碰 lib.config.qhly_skinset.skin）：
	 *   自动切换只影响本局；下一局仍按玩家自己在换肤菜单里选的皮肤开局。
	 *   （游戏里手动选皮肤由千幻自己负责写存档，与这里无关。）
	 * 支持两类目标皮肤名：
	 *   ① 十周年UI 有动皮数据的（如「炽剑补天」「敕剑伏波」）→ 换动皮
	 *      （`game.qhly_changeDynamicSkin` 本身只改播放中的动皮，不写存档）
	 *   ② **只有静态图的**（如「敕剑伏波(静)」）→ 停掉动皮，直接把静态图设到立绘上
	 *      （同样不写存档；「经典形象」则回退到该武将原画）
	 * @param {Player} player
	 * @param {string} skinName 皮肤名（不含扩展名）
	 */
	function dmqcSwapSkin(player, skinName) {
		try {
			if (!player || !skinName) return false;
			const charId = player.name1 || player.name;
			if (!charId) return false;
			const ds = window.decadeUI && window.decadeUI.dynamicSkin;
			const hasDynamicData = !!(ds && ds[charId] && ds[charId][skinName]);
			const avatar = player.node && player.node.avatar;
			if (hasDynamicData) {
				// 换动皮（只影响本局播放）
				if (typeof game.qhly_changeDynamicSkin === "function") {
					// 内部会做 qhly_getRealName 映射；这里传玩家引用，避开「容器布局」判断带来的副作用
					game.qhly_changeDynamicSkin(player, skinName);
				}
			} else {
				// 静态目标：先停掉正在播的动皮，再把静态图设到立绘上
				try {
					if (player.stopDynamic) player.stopDynamic();
					if (player.dynamic) {
						player.dynamic.primary = null;
						player.dynamic.deputy = null;
					}
				} catch (e) {}
				// 「经典形象」＝该武将的原画（立绘目录里的 img 字段）
				let path = null;
				if (skinName === "经典形象") {
					const info = (lib.character && lib.character[charId]) || null;
					const img = info && info[4] && info[4][0];
					if (typeof img == "string") path = img.replace(/^ext:/, "extension/");
				}
				if (!path) {
					// 常规皮肤图：先本包皮肤目录，再千幻的皮肤目录
					path = "extension/大梦千秋/skin/image/" + charId + "/" + skinName + ".jpg";
					const alt = "extension/千幻聆音/sanguoskin/" + charId + "/" + skinName + ".jpg";
					// 本包没有这张时退到千幻目录（存在性由 setBackgroundImage 自己兜底）
					if (typeof game.qhly_checkFileExist === "function") {
						game.qhly_checkFileExist(path, function (s) {
							if (!s && avatar && typeof avatar.setBackgroundImage === "function") {
								avatar.setBackgroundImage(alt);
							}
						});
					} else {
						path = alt;
					}
				}
				if (avatar && typeof avatar.setBackgroundImage === "function") {
					avatar.setBackgroundImage(path);
				} else if (avatar && typeof avatar.setBackground === "function") {
					avatar.setBackground(charId, "character");
				}
			}
			console.log(
				"[大梦千秋] 换肤（仅本局，不改默认）：" + charId + " → 「" + skinName + "」" + (hasDynamicData ? "（动皮）" : "（静态）")
			);
			return true;
		} catch (e) {
			console.error("[大梦千秋] 换肤失败（不影响技能结算）：", e);
			return false;
		}
	}
	window.dmqcSwapSkin = dmqcSwapSkin;

	// 条件表：技能 → { 判定条件, 满足后要换的皮肤 }
	let DMQC_SWAP_RULES = [];
	function dmqcInitSwapRules() {
		DMQC_SWAP_RULES = [
			{
				// 梦姜维：**发动限定技【幽明】时**切换（2026 需求，原来判的是“伐达 9”）。
				//   · 当前是「炽剑补天」（本包默认皮肤）→ 切成动皮「敕剑伏波」
				//   · 当前是「原皮/其它静态」→ 只切成静态 2 形态「敕剑伏波(静)」
				// 由角色文件里【幽明】的 `content` 主动调用 `dmqcApplySwapRules(player, "sgz_youming")`。
				//   ⇒ 这条规则是「技能驱动」（有 skill 无 mark），
				//     不再依赖蓄力点数量；幽明只发一次，所以也不会反复切。
				skill: "sgz_youming",
				to: DMQC_JIANGWEI_AWAKENED, // 动皮目标
				toStatic: DMQC_JIANGWEI_STATIC_KEY, // 静态目标
				dynamicFrom: DMQC_JIANGWEI_DYNAMIC, // 当前是这张（或已有动皮在播）→ 走动皮
				revert: false,
				revertSkin: null,
			},
			{
				// ⚠ 梦钟会那条「患 ≥ 3 切潜蛟觊天2 / 患 < 3 切回原皮」的规则**已按需求删除**
				//   （2026 改动：换皮时机改为「局内首次发动【矫诏】」+ 播放视频，
				//    见第 11 节的 `window.dmqcZhonghuiJiaozhaoVideo`；
				//    角色文件里那 3 处写死的 `setBackgroundImage` 也一并清掉了）。
			},
		];
	}
	dmqcInitSwapRules();

	// 记录「武将 + 规则」维度**本局已经自动切成哪张**（而不是简单的 on/off）。
	//   ⚠ 这是**本局状态**：每次 `gameStart` 会清空（见下面 dmqcResetSwapState）。
	//     用它来判定「是否需要还原」，而不是拿存档里的皮肤名（自动切换不写存档）。
	let dmqcSwapState = {};
	function dmqcResetSwapState() {
		dmqcSwapState = {};
	}
	window.dmqcResetSwapState = dmqcResetSwapState;
	/// 这个角色算不算「拥有」某个技能。
	/// ⚠ 为什么不能只用 `player.hasSkill()`：觉醒技发动后 `awakenSkill` 会
	///   `disableSkill(skill + "_awake", skill)`（player.js:10240/10264），
	///   而 `game.filterSkills` 会把 `disabledSkills` 的键从 `getSkills()` 里剔掉
	///   （game/index.js:10276-10277）⇒ **发动过幽明之后 `hasSkill('sgz_youming')` 就是 false**。
	///   技能驱动的换皮规则（如姜维，判定时机正是「发动幽明」）因此永远不命中。
	///   补充两条兜底：`awakenedSkills`（觉醒记录）与 `storage[skill] === true`（awakenSkill 会写）。
	function dmqcPlayerOwnsSkill(player, name) {
		if (!player || !name) return false;
		try {
			if (player.hasSkill && player.hasSkill(name)) return true;
			if (player.awakenedSkills && typeof player.awakenedSkills.has === "function" && player.awakenedSkills.has(name)) {
				return true;
			}
			if (player.storage && player.storage[name] === true) return true;
		} catch (e) {}
		return false;
	}
	function dmqcApplySwapRules(player, skillName) {
		try {
			if (!player || !skillName || !window.decadeUI || !window.decadeUI.dynamicSkin) return;
			for (const rule of DMQC_SWAP_RULES) {
				// 入口判定支持两种规则：
				//   · 标记驱动：`mark` + `threshold`（addMark/removeMark 的 markName 就是承载标记的技能名）
				//   · 技能驱动：`skill`（只判「有没有这个技能」，如姜维发动【幽明】后换皮）
				//   ⚠ 不要用父技能判定：像梦钟会的「患」是挂在 sgz_quanhuan 的 group 里的独立技能。
				if (rule.mark !== skillName && rule.skill !== skillName) continue;
				const carrierSkill = rule.mark || rule.skill;
				// ⚠ 已觉醒的技能也要算「拥有」（见上面 dmqcPlayerOwnsSkill 的说明）
				if (!dmqcPlayerOwnsSkill(player, carrierSkill)) continue;
				const charId = player.name1 || player.name;
				if (!charId) continue;
				// 该武将必须真的有这张动皮，否则不动（避免把皮肤设成不存在的名字）
				const ds = window.decadeUI.dynamicSkin[charId];
				if (!ds || !ds[rule.to]) continue;
				// 当前存档里选的是哪张皮
				const curSkin = typeof game.qhly_getSkin === "function" ? game.qhly_getSkin(charId) : null;
				const curName = curSkin ? String(curSkin).replace(/\.jpg$/i, "") : null;
				// 当前是否真的有一套动皮在播（用于「静态/动态分流」的兜底判断）
				const hasDynamic =
					!!player.dynamic && !!(player.dynamic.primary || player.dynamic.deputy);
				// 技能驱动规则：技能在即满足；标记驱动规则：标记数达到阈值才满足
				const matched = rule.skill
					? dmqcPlayerOwnsSkill(player, rule.skill)
					: (player.countMark ? player.countMark(rule.mark) : 0) >= rule.threshold;
				// 有 toStatic 的规则：先算出「本次该切到哪张」
				let target = rule.to;
				if (rule.toStatic) {
					const useDynamic =
						(rule.dynamicFrom && curName === rule.dynamicFrom) || (hasDynamic && !curName);
					target = useDynamic ? rule.to : rule.toStatic;
				}
				const stateKey = charId + "|" + carrierSkill;

				if (matched) {
					if (dmqcSwapState[stateKey] === target) continue; // 已经切过了
					// 声明了 from 时：只在「当前正是 from」或「当前已经是目标」时才动手，
					// 避免覆盖玩家手动选的其它皮肤。
					if (rule.from && curName !== rule.from && curName !== target) {
						dmqcSwapState[stateKey] = target; // 玩家选了别的皮肤 → 不干预
						continue;
					}
					dmqcSwapState[stateKey] = target;
					if (curName === target) continue; // 已经是目标皮肤，无需再切
					dmqcSwapSkin(player, target);
				} else if (rule.revert) {
					// 【还原】标记低于阈值 → 把本局被自动切换过去的立绘换回来。
					// ⚠ 判定依据必须是「**本局实际自动切过什么**」（dmqcSwapState），
					//   不能拿「存档里的皮肤名」去比：
					//   自动切换**不写存档**（见 dmqcSwapSkin），所以切过去之后
					//   `game.qhly_getSkin()` 仍然是玩家原本选的那张（通常是空=经典形象），
					//   一比较就会误判成「已经在原皮了」，于是永远不还原。
					const applied = dmqcSwapState[stateKey];
					const wasSwitchedByRule = !!applied && applied !== rule.revertSkin;
					dmqcSwapState[stateKey] = rule.revertSkin;
					// 只有「本局确实被本规则切过」或「当前显示的就是要切过去的那张」才需要动手
					if (!wasSwitchedByRule && curName !== rule.revertSkin) continue;
					if (rule.revertSkin) dmqcSwapSkin(player, rule.revertSkin);
				}
			}
		} catch (e) {
			console.error("[大梦千秋] 条件换肤判定异常（不影响技能结算）：", e);
		}
	}
	window.dmqcApplySwapRules = dmqcApplySwapRules;

	// 诊断：`dmqcSwapRulesDebug()` —— 打出每条换皮规则当前为什么命中/不命中
	//  ⚠ 排查「自动换皮没反应」时非常有用：能一眼看出是「没有这个技能 / 没有这张皮 /
	//    皮肤名已经是目标 / 本局已经切过」中的哪一种。
	window.dmqcSwapRulesDebug = function (player) {
		const list = player ? [player] : (game.players || []);
		list.forEach(function (p) {
			if (!p) return;
			const charId = p.name1 || p.name;
			const ds = window.decadeUI && window.decadeUI.dynamicSkin && window.decadeUI.dynamicSkin[charId];
			const out = [];
			for (const rule of DMQC_SWAP_RULES) {
				const carrier = rule.mark || rule.skill;
				const own = dmqcPlayerOwnsSkill(p, carrier);
				const count = rule.mark && p.countMark ? p.countMark(rule.mark) : null;
				const matched = rule.skill ? own : count !== null && count >= rule.threshold;
				out.push({
					角色: charId,
					规则载体: carrier,
					拥有技能: own,
					标记数: count,
					命中: matched,
					有目标动皮: !!(ds && rule.to && ds[rule.to]),
					本局已切到: dmqcSwapState[charId + "|" + carrier] || null,
				});
			}
			console.log("[大梦千秋] 换皮规则诊断 ↓↓↓", out);
		});
	};

	// ---- 8b. 梦曹髦【腾渊】变身：枭龙破渊 ⇄ 枭龙破渊2 ----
	//  为什么不用上面的 DMQC_SWAP_RULES（标记驱动）：
	//    那条链是「标记数量 ≥ 阈值」的模型，而这里驱动的是**技能的有无**，且两个方向
	//    都要在**精确的时机**发生（获得腾渊的那一瞬间 / onremove 的那一瞬间），
	//    所以直接在角色文件里调下面两个入口更直接、也更好排查。
	//  ⚠ 用的是 `player.dynamic.primary.name`（**当前正在播的骨骼**），不是
	//    `game.qhly_getSkin()`（那读的是存档里的选择）。自动换肤**不写存档**（见 dmqcSwapSkin），
	//    所以只有前者能反映「此刻立绘到底是哪张」。
	function dmqcCurrentSpineName(player) {
		try {
			return (player && player.dynamic && player.dynamic.primary && player.dynamic.primary.name) || null;
		} catch (e) {
			return null;
		}
	}
	window.dmqcCurrentSpineName = dmqcCurrentSpineName;

	/** 获得【腾渊】→ 立绘变「枭龙破渊2」（按需求：无条件转换） */
	window.dmqcApplyTengyuanSkin = function (player) {
		try {
			if (!player) return;
			dmqcSwapSkin(player, DMQC_CAOMAO_XIAOLONG2);
		} catch (e) {
			console.error("[大梦千秋] 枭龙破渊变身失败（不影响技能结算）：", e);
		}
	};

	/**
	 * 失去【腾渊】→ 立绘变回「枭龙破渊」。
	 * ⚠ 按需求，**只有当前立绘确实还停在「枭龙破渊2」时**才切回：
	 *   若玩家在变身期间自己换成了别的皮，就尊重他的选择，不去覆盖。
	 */
	window.dmqcRevertTengyuanSkin = function (player) {
		try {
			if (!player) return;
			const live = dmqcCurrentSpineName(player);
			if (live && live !== DMQC_CAOMAO_XIAOLONG2_SPINE) return;
			dmqcSwapSkin(player, DMQC_CAOMAO_XIAOLONG);
		} catch (e) {
			console.error("[大梦千秋] 枭龙破渊还原失败（不影响技能结算）：", e);
		}
	};

	// ---- 8c. 梦魏延【竭伐】击杀觉醒：狂志吞天 → 狂志吞天2 ----
	//  需求：平时「狂志吞天」，击杀觉醒（完成使命、获得【竭燃】）后换成「狂志吞天2」。
	//  ⚠ 为什么不能沿用本体数据自带的 `special.condition.shimingjiSuccess`：
	//    那套由「皮肤切换」的 `_ts` 在**技能名以 `_achieve` / `_fail` 结尾**时派发
	//    （皮肤切换/extension.js:310-322），而梦魏延的使命技子技能叫 `sgz_jiefa_awaken`，
	//    **不符合那个命名约定** → 永远不会触发；而且它找的是 `pot_weiyan` 下的皮肤。
	//    所以由角色文件在觉醒结算里直接调下面这个入口。
	//  ⚠ 与「枭龙破渊」不同，竭伐觉醒是**单向**的（没有回退分支），所以只提供正向入口。
	window.dmqcApplyWeiyanAwakenSkin = function (player) {
		try {
			if (!player) return;
			const ds = window.decadeUI && window.decadeUI.dynamicSkin;
			const hasDynamic = !!(ds && ds.sgz_weiyan && ds.sgz_weiyan[DMQC_WEIYAN_KUANGZHI2]);
			if (hasDynamic && typeof game.qhly_changeDynamicSkin === "function") {
				// 走动皮体系。梦魏延可能在主将位也可能在副将位（双将），分别处理：
				//   `qhly_changeDynamicSkin(str, name, character, character2)` 的第 4 个参数
				//   就是「是否副将」（千幻聆音/extension/content.js:2401/2417/2433）。
				const isDeputy = player.name2 === "sgz_weiyan" && player.name1 !== "sgz_weiyan";
				game.qhly_changeDynamicSkin(player, DMQC_WEIYAN_KUANGZHI2, undefined, isDeputy);
				console.log("[大梦千秋] 梦魏延觉醒换肤（仅本局）：狂志吞天 → 狂志吞天2" + (isDeputy ? "（副将位）" : ""));
				return;
			}
			// 没装十周年UI / 没有动皮数据 → 退回**原来那句写死的静态图**（主、副立绘都设一遍）
			const path = "extension/大梦千秋/image/sgz_weiyan2.jpg";
			if (player.node && player.node.avatar && player.node.avatar.setBackgroundImage) {
				player.node.avatar.setBackgroundImage(path);
			}
			if (player.node && player.node.avatar2 && player.node.avatar2.setBackgroundImage) {
				player.node.avatar2.setBackgroundImage(path);
			}
		} catch (e) {
			console.error("[大梦千秋] 梦魏延觉醒换肤失败（不影响技能结算）：", e);
		}
	};

	// ---- 8h. 梦陆逊：三形态动皮 + 局内条件自动切换 ----
	//  需求：默认/每轮开始 → ① 蛇年清明；发动【焚灭】→ ② 烈火炽天；发动【韬晦】→ ③ 烈焰炽魂。
	//  用法（角色文件里调）：
	//    · 【焚灭】content 开头：`window.dmqcApplyLuxunSkin(player, 2)`
	//    · 【韬晦】content 开头：`window.dmqcApplyLuxunSkin(player, 3)`
	//    · 每轮开始：见下面全局技能 `sgz_dmqc_skin_swap` 的 `roundStart` 分支（自动切回 ①）
	//  ⚠ 这个函数**只改本局播放**，不写千幻存档（和魏延/曹髦那些一样：玩家菜单里的选择不会被覆盖）。
	//  ⚠ 传入 1/2/3（更直观，和需求里的 ①②③ 对齐），内部换算成 DMQC_LUXUN_SKINS 的 0-based 下标。
	window.dmqcApplyLuxunSkin = function (player, which) {
		try {
			if (!player) return false;
			const isLuxun = player.name1 === "sgz_luxun" || player.name === "sgz_luxun" || player.name2 === "sgz_luxun";
			if (!isLuxun) return false;
			const idx = Math.max(0, Math.min(DMQC_LUXUN_SKINS.length - 1, (Number(which) || 1) - 1));
			const skinName = DMQC_LUXUN_SKINS[idx];
			const ds = window.decadeUI && window.decadeUI.dynamicSkin;
			const hasDynamic = !!(ds && ds.sgz_luxun && ds.sgz_luxun[skinName]);
			if (hasDynamic) {
				const isDeputy = player.name2 === "sgz_luxun" && player.name1 !== "sgz_luxun";
				// ★ 优先用「皮肤切换」自己的换肤函数 —— 也就是**手动点皮肤菜单**走的那条路径
				//   （皮肤切换/extension.js:3691 `selectSkinV3`），这样自动切换和手动切换行为一致。
				//   ⚠ 以前只调千幻的 `qhly_changeDynamicSkin`：它会按**本体武将**的数据重播一次，
				//     所以自动切过去时参数是「原皮肤拥有者」的默认值（②是陆逊的、③是周瑜的）——
				//     这正是「手动切参数对、自动切是默认」的原因。
				const ss = window.skinSwitch && window.skinSwitch.dynamic;
				let switched = false;
				if (ss && typeof ss.selectSkinV3 === "function") {
					try {
						ss.selectSkinV3(skinName, player, !isDeputy);
						switched = true;
					} catch (e) {
						console.warn("[大梦千秋] selectSkinV3 失败，回退到千幻换肤：", e);
					}
				}
				if (!switched && typeof game.qhly_changeDynamicSkin === "function") {
					game.qhly_changeDynamicSkin(player, skinName, undefined, isDeputy);
				}
				console.log(
					"[大梦千秋] 梦陆逊换肤（仅本局）：" + skinName + "（第 " + (idx + 1) + " 形态）" + (isDeputy ? "（副将位）" : "")
				);
				// 等新节点建好后，把文件里的框内参数推给渲染器（改文件就能生效的那条通道）
				[60, 300, 900].forEach(function (delay) {
					setTimeout(function () {
						try {
							window.dmqcLuxunPushParams(player);
						} catch (e) {}
					}, delay);
				});
				// ③「烈焰炽魂」：把**正在播的那份副本**上的 chuchang 也删掉，
				// 否则回合开始仍会播出场动画（数据层删了，副本里可能还留着）。
				if (skinName === DMQC_LUXUN_ZHOU) {
					[60, 300, 900, 1500].forEach(function (delay) {
						setTimeout(function () {
							try {
								const n = player.dynamic && player.dynamic.primary;
								if (n && n.player) delete n.player.chuchang;
							} catch (e) {}
						}, delay);
					});
				}
				return true;
			}
			// 没装十周年UI / 没有动皮数据 → 退回静态图（skin/image/sgz_luxun/ 下那三张）
			const path = "extension/大梦千秋/skin/image/sgz_luxun/" + skinName + ".jpg";
			if (player.node && player.node.avatar && player.node.avatar.setBackgroundImage) {
				player.node.avatar.setBackgroundImage(path);
			}
			if (player.node && player.node.avatar2 && player.node.avatar2.setBackgroundImage) {
				player.node.avatar2.setBackgroundImage(path);
			}
			return true;
		} catch (e) {
			console.error("[大梦千秋] 梦陆逊换肤失败（不影响技能结算）：", e);
			return false;
		}
	};

	// ---- 8h1. 用「皮肤切换」自己的 ADJUST 通道把参数推给渲染器（唯一真正生效的办法）----
	//  背景（实测日志）：屏幕上那张皮用的是一份**副本**，不是 `decadeUI.dynamicSkin` 里我们改的对象
	//  （诊断里 `是不是表里那几个对象: 否`），所以改文件对画面没有任何影响。
	//  而调参面板能实时改，是因为它发的是 `ADJUST` 消息：
	//      skinSwitch.postMsgApi.adjust(player, 'daiji', posData)
	//    → dynamicWorker.js:1260 `adjust(data)` → 直接改 `apnode.x/y/scale/angle` 和 `apnode.player.*`
	//  ⇒ 这里就复用这条通道：把 DMQC_SKIN_PATCHES 里的框内参数按「面板同样的格式」推过去。
	//  ⚠⚠ 注意 `adjust` 里的判断是 **if/else 链**（dynamicWorker.js:1268-1288）：
	//      x/y 一起、scale 单独、angle 单独 —— 一条消息只能改一组，所以下面发 3 条。
	function dmqcLuxunFindSkinEntry(player) {
		const node = player && player.dynamic && player.dynamic.primary;
		if (!node) return null;
		const spineName = (node.player && node.player.name) || node.name;
		const table = window.decadeUI && window.decadeUI.dynamicSkin && window.decadeUI.dynamicSkin.sgz_luxun;
		if (!spineName || !table) return null;
		for (const skinName of DMQC_LUXUN_SKINS) {
			const d = table[skinName];
			if (d && (d.name === spineName || (node.name && d.name === node.name))) return { skinName, data: d, node };
		}
		return null;
	}
	/// 把当前皮肤（文件里的那份）的框内参数推给渲染器
	//  ⚠ 不依赖 `skinSwitch.postMsgApi`（它可能还没挂上 / 名字变了），
	//    直接向 `player.dynamic.renderer` 发 **ADJUST 原始消息** —— 这就是调参面板实时改参数时
	//    底层真正发出的东西（dynamicWorker.js:1260 `adjust(data)` 会改 apnode.x/y/scale/angle）。
	//  ⚠ ADJUST 的处理是 if/else 链：x/y 一起、scale 单独、angle 单独 → 必须发 3 条。
	window.dmqcLuxunPushParams = function (player) {
		const players = player
			? [player]
			: (game.players || []).filter(function (p) {
					return p && (p.name1 === "sgz_luxun" || p.name === "sgz_luxun");
			  });
		let done = 0;
		players.forEach(function (p) {
			try {
				const hit = dmqcLuxunFindSkinEntry(p);
				if (!hit) {
					console.log("[大梦千秋][推参数] 跳过：找不到当前皮肤在 sgz_luxun 表里的条目（可能当前播的不是这三张）");
					return;
				}
				const node = hit.node;
				const d = hit.data;
				const renderer = p.dynamic && p.dynamic.renderer;
				// 1) 主线程这份代理对象也改成文件值（调试用；部分路径直接读它）
				if (node) {
					if (d.x) node.x = d.x.slice();
					if (d.y) node.y = d.y.slice();
					if (d.scale != null) node.scale = d.scale;
					if (d.angle != null) node.angle = d.angle;
				}

				if (node && node.player) {
					if (d.x) node.player.x = d.x.slice();
					if (d.y) node.player.y = d.y.slice();
					if (d.scale != null) node.player.scale = d.scale;
					if (d.angle != null) node.player.angle = d.angle;
				}
				if (!renderer || typeof renderer.postMessage !== "function") {
					console.log("[大梦千秋][推参数] 跳过：player.dynamic.renderer 没有 postMessage（该玩家没在播动皮？）");
					return;
				}
				const id = p.dynamic.id;
				const skinID = node && node.id;
				const base = { message: "ADJUST", id: id, skinID: skinID, mode: "daiji" };
				// 2) 原始 ADJUST：位置 / 大小 / 角度，分三条
				if (Array.isArray(d.x) && Array.isArray(d.y)) {
					renderer.postMessage(Object.assign({}, base, { x: d.x.slice(), y: d.y.slice() }));
				}
				if (d.scale != null) {
					renderer.postMessage(Object.assign({}, base, { scale: d.scale }));
				}
				if (d.angle != null) {
					renderer.postMessage(Object.assign({}, base, { angle: d.angle }));
				}
				done++;
				console.log(
					"[大梦千秋][推参数] 已发送「" + hit.skinName + "」：id=" + id + " skinID=" + skinID +
						" x=" + JSON.stringify(d.x) + " y=" + JSON.stringify(d.y) + " scale=" + d.scale + " angle=" + d.angle
				);
			} catch (e) {
				console.error("[大梦千秋][推参数] 失败：", e);
			}
		});
		if (!done) console.log("[大梦千秋][推参数] 一条都没发出去（看上面的跳过原因）");
		return done;
	};
	// ---- 8h3. 直接**重新读取 skin.js 文件**里的参数表并立即生效（不用重启游戏）----
	//  为什么需要：`dmqcLuxunPushParams()` 推的是**内存里**那张表的数值；
	//  你改了文件但没重启游戏，内存里还是旧值（推送日志会显示旧的 x）。
	//  这条命令会：读文件 → 解析 `DMQC_SKIN_PATCHES` → 重建三张皮的数据 → 立刻推给渲染器。
	//  用法（F12）：`dmqcLuxunReloadFile()`
	window.dmqcLuxunReloadFile = function () {
		const rel = "extension/大梦千秋/skin.js";
		const done = function (text) {
			try {
				// 1) 从源码里抠出 `const DMQC_SKIN_PATCHES = { … }`
				const at = text.indexOf("const DMQC_SKIN_PATCHES = {");
				if (at < 0) return console.error("[大梦千秋][重读] 文件里找不到 DMQC_SKIN_PATCHES");
				let i = text.indexOf("{", at);
				let depth = 0;
				const start = i;
				for (; i < text.length; i++) {
					if (text[i] === "{") depth++;
					else if (text[i] === "}") {
						depth--;
						if (depth === 0) break;
					}
				}
				let block = text.slice(start, i + 1);
				// 计算键换成字面量，才能单独 eval
				block = block
					.replace(/\[DMQC_LUXUN_MING\]/g, '["蛇年清明"]')
					.replace(/\[DMQC_LUXUN_HUO\]/g, '["烈火炽天"]')
					.replace(/\[DMQC_LUXUN_ZHOU\]/g, '["烈焰炽魂"]');
				const parsed = new Function("return (" + block + ");")();
				const patches = (parsed && parsed.sgz_luxun) || {};
				// 2) 用「本体数据 + 新补丁」重建三张皮
				const ds = window.decadeUI && window.decadeUI.dynamicSkin;
				if (!ds || !ds.sgz_luxun) return console.error("[大梦千秋][重读] decadeUI.dynamicSkin.sgz_luxun 不存在");
				let n = 0;
				DMQC_LUXUN_SKINS.forEach(function (skinName) {
					const baseKey = skinName === DMQC_LUXUN_ZHOU ? "zhouyu" : "luxun";
					const base = ds[baseKey] && ds[baseKey][skinName];
					if (!base) return;
					const patch = patches[skinName];
					ds.sgz_luxun[skinName] = dmqcMergeSkinData(base, patch || {});
					n++;
				});
				console.log("[大梦千秋][重读] 已从文件重建 " + n + " 张皮的数据：" + JSON.stringify(patches));
				// 3) 立刻推给渲染器
				window.dmqcLuxunPushParams();
				return n;
			} catch (e) {
				console.error("[大梦千秋][重读] 失败：", e);
			}
		};
		try {
			if (typeof game.readFileAsText === "function") {
				game.readFileAsText(rel, done, function () {
					game.readFileAsText((lib.assetURL || "") + rel, done, function () {
						console.error("[大梦千秋][重读] 读不到文件：" + rel);
					});
				});
			} else {
				console.error("[大梦千秋][重读] 没有 game.readFileAsText");
			}
		} catch (e) {
			console.error("[大梦千秋][重读] 异常：", e);
		}
	};
	// ---- 8h2. 梦陆逊：把参数**强制**写回 decadeUI.dynamicSkin 并重播（诊断 + 立即生效）----
	//  为什么需要：你改文件里的 x 后画面没变，说明播放时用的**不是**我们注入的那份数据
	//  （可能是被别处覆盖、或渲染取的是另一份副本）。这两个命令能当场分辨：
	//    · dmqcLuxunSkinDebug()  → 打印「注入值 / 当前生效数据 / 正在播的节点」三方对照
	//    · dmqcLuxunForce()      → 把文件里的参数重新写进 decadeUI.dynamicSkin 并重播一次
	//  ⚠ 正常游戏中不需要手动跑；这两条只是排障口。
	function dmqcLuxunSkinData(skinName) {
		const ds = window.decadeUI && window.decadeUI.dynamicSkin;
		const table = ds && ds.sgz_luxun;
		const data = table && table[skinName];
		const patch = DMQC_SKIN_PATCHES.sgz_luxun && DMQC_SKIN_PATCHES.sgz_luxun[skinName];
		if (!data) return null;
		if (patch) {
			const merged = dmqcMergeSkinData(data, patch);
			table[skinName] = merged;
			return merged;
		}
		return data;
	}
	window.dmqcLuxunForce = function () {
		let n = 0;
		DMQC_LUXUN_SKINS.forEach(function (skinName) {
			if (dmqcLuxunSkinData(skinName)) n++;
		});
		(game.players || []).forEach(function (p) {
			if (!p || (p.name1 !== "sgz_luxun" && p.name !== "sgz_luxun")) return;
			const node = p.dynamic && p.dynamic.primary;
			const skinName = node && node.player && node.player.name;
			// 用骨骼名反查皮肤名，重播当前这张
			const hit = DMQC_LUXUN_SKINS.find(function (s) {
				const d = window.decadeUI.dynamicSkin.sgz_luxun[s];
				return d && node && (d.name === node.name || (node.player && d.name === node.player.name));
			});
			window.dmqcApplyLuxunSkin(p, (hit ? DMQC_LUXUN_SKINS.indexOf(hit) : 0) + 1);
		});
		console.log("[大梦千秋] 已把参数重新写回 decadeUI.dynamicSkin 并重播（" + n + " 张）");
		return n;
	};
	/// 通用诊断：把某个武将注入表里各皮肤的参数打出来（用于和其它正常武将对照）
	window.dmqcSkinDataDump = function (charId) {
		const out = {};
		try {
			const ds = window.decadeUI && window.decadeUI.dynamicSkin;
			const table = (ds && ds[charId]) || null;
			if (!table) {
				out["表"] = "(没有 " + charId + " 这张表)";
			} else {
				Object.keys(table).forEach(function (k) {
					const d = table[k] || {};
					out[k] = { name: d.name, x: d.x, y: d.y, scale: d.scale, angle: d.angle, hasGongji: !!d.gongji };
				});
			}
			const live = [];
			(game.players || []).forEach(function (p) {
				if (!p || (p.name1 !== charId && p.name !== charId)) return;
				const node = p.dynamic && p.dynamic.primary;
				live.push({
					正在播: node ? node.name : "(无)",
					node参数: node && node.player ? { x: node.player.x, y: node.player.y, scale: node.player.scale } : "(无)",
				});
			});
			out["当前局内"] = live;
		} catch (e) {
			out["出错"] = e.message;
		}
		console.log("[大梦千秋] 动皮数据诊断：" + charId + " ↓↓↓", out);
		return out;
	};
	window.dmqcLuxunSkinDebug = function () {
		const out = {};
		try {
			const ds = window.decadeUI && window.decadeUI.dynamicSkin;
			const table = (ds && ds.sgz_luxun) || null;
			out["①dynamicSkin.sgz_luxun 有哪些皮"] = table ? Object.keys(table) : "(没有这张表 → 注入没成功)";
			if (table) {
				DMQC_LUXUN_SKINS.forEach(function (s) {
					const d = table[s];
					out["②" + s] = d ? { name: d.name, x: d.x, y: d.y, scale: d.scale, angle: d.angle } : "(缺)";
				});
			}
			out["③存档里选的皮肤名"] = typeof game.qhly_getSkin === "function" ? game.qhly_getSkin("sgz_luxun") : "(无)";
			const live = [];
			(game.players || []).forEach(function (p) {
				if (!p || (p.name1 !== "sgz_luxun" && p.name !== "sgz_luxun")) return;
				const node = p.dynamic && p.dynamic.primary;
					// 关键：node.player 是不是**就是**我们表里那个对象？
					//   是 → 改表里的参数就该生效（若不生效 = 渲染缓存了旧值）
					//   否 → 渲染用的是**另一份数据**（这才是“改文件没反应”的根因）
					let sameObj = "否 → 渲染用的是另一份数据";
					if (node && node.player && table) {
						for (const s of DMQC_LUXUN_SKINS) {
							if (table[s] === node.player) sameObj = "是（" + s + "）";
						}
					}
					live.push({
						玩家: p.name,
						正在播: node ? node.name : "(没有动皮)",
						node名称: node && node.player ? node.player.name : "(无 node.player)",
						node参数: node && node.player ? { x: node.player.x, y: node.player.y, scale: node.player.scale, angle: node.player.angle } : "(无)",
						是不是表里那几个对象: sameObj,
					});
			});
			out["④正在播的节点"] = live;
			// ⑥⑦：千幻的「静/动」开关 + 当前选中的皮肤名 —— 这两个能解释“改 x 没反应”：
			//   若 djtoggle 为 true，千幻会当成“这张皮用静态图”，动皮**根本不播**。`qhly_changeDynamicSkin`
			//   里就是这么判的（千幻聆音/extension/content.js:2467：value = null → skin 找不到 → 不播动皮）。
			//   而陆逊这三张恰好**同时有静态皮**（skin/image/sgz_luxun/*.jpg，还是我们设的默认皮），
			//   别的武将我并没有给它们设“同名静态皮 + 默认选中”，所以只有陆逊会踩到。
			try {
				const set = lib.config.qhly_skinset || {};
				out["⑥千幻静动开关 djtoggle.sgz_luxun"] = (set.djtoggle && set.djtoggle.sgz_luxun) || "(无记录)";
				out["⑦千幻选中的皮 skin.sgz_luxun"] = (set.skin && set.skin.sgz_luxun) || "(无记录)";
			} catch (e) {
				out["⑥⑦读取失败"] = e.message;
			}
			out["⑤本文件里写的参数（DMQC_SKIN_PATCHES）"] = DMQC_SKIN_PATCHES.sgz_luxun;
		} catch (e) {
			out["出错"] = e.message;
		}
		// 一行 JSON：避免控制台把对象折叠成 {…}，方便直接复制给我
		try {
			console.log("[大梦千秋] 梦陆逊动皮诊断(JSON)=" + JSON.stringify(out));
		} catch (e) {
			console.log("[大梦千秋] 诊断 JSON 序列化失败（可能有循环引用）：" + e.message);
		}
		console.log("[大梦千秋] 梦陆逊动皮诊断 ↓↓↓", out);
		return out;
	};
	// ---- 8d. 梦魏延动皮诊断（控制台用）----
	//  用途：查「狂志吞天 第一形态渲染异常」那类问题。
	//  用法：让梦魏延穿上该皮，按 F12 打开控制台，粘贴执行  dmqcWeiyanSkinDebug()
	//  ⚠ 关键前提（从控制台日志确认的）：**avatar 动皮是由「皮肤切换」的 offscreen worker 画的**
	//    （日志里 `dynamicWorker.js:628 ... Animation3_6 {… offscreen: true, gl: WebGL2RenderingContext,
	//      canvas: OffscreenCanvas …}`），所以 `dcdAnim.spine.skeletons` 里**找不到**它 ——
	//    骨架在 worker 线程，主线程读不到动画表。因此这里改成打印**主线程能拿到的全部线索**：
	//    「当前生效的皮肤数据（含渲染键）」「存档里选的皮肤」「每个玩家正在播的骨骼名与坐标」。
	window.dmqcWeiyanSkinDebug = function () {
		try {
			const out = {};
			// ① 当前**生效**的皮肤数据（注入之后的结果，能看到 alpha 之类渲染键到底是多少）
			const ds = window.decadeUI && window.decadeUI.dynamicSkin;
			out["①生效皮肤数据 decadeUI.dynamicSkin.sgz_weiyan"] = ds && ds.sgz_weiyan ? ds.sgz_weiyan : "(没有 → 注入没成功)";
			// ② 存档里玩家选的皮肤名
			out["②存档选择 game.qhly_getSkin('sgz_weiyan')"] =
				typeof game.qhly_getSkin === "function" ? game.qhly_getSkin("sgz_weiyan") : "(无此函数)";
			// ③ 每个玩家当前正在播的骨骼（主线程 APNode 上的 name/x/y/scale 是真实生效值）
			const live = [];
			(game.players || []).concat(game.dead || []).forEach(function (p) {
				if (!p) return;
				const node = p.dynamic && p.dynamic.primary;
				live.push({
					玩家: p.name1 || p.name,
					正在播: node ? node.name : "(无动皮)",
					x: node ? node.x : undefined,
					y: node ? node.y : undefined,
					scale: node ? node.scale : undefined,
					alpha: node ? node.alpha : undefined,
					有skeleton: !!(node && node.skeleton),
				});
			});
			out["③各玩家当前动皮"] = live;
			// ④ dcdAnim 侧已加载的骨骼名（若有，说明走的是非 offscreen 路径）
			try {
				const anim = window.dcdAnim;
				out["④dcdAnim 已加载骨骼"] =
					anim && anim.spine && anim.spine.skeletons ? anim.spine.skeletons.map(function (s) { return s.name; }) : "(无)";
			} catch (e) {
				out["④dcdAnim 已加载骨骼"] = "(读取失败)";
			}
			console.log("[大梦千秋] 梦魏延动皮诊断 ↓↓↓", out);
			console.log(
				"[大梦千秋] 提示：只想看渲染键就把 ① 展开 —— `狂志吞天` 的 `alpha` 应是 `false`（本包改过），" +
					"`狂志吞天2` 数据里本来就没有这个键。动画表在 offscreen worker 里，主线程拿不到。"
			);
			return out;
		} catch (e) {
			console.error("[大梦千秋] 诊断失败：", e);
		}
	};

	// ---- 8g. 动皮「图集消融」工具箱（已用它修好狂志吞天，留着给以后排障用）----
	//  已完成：把「狂志吞天」的 7 个 screen 层 region（r-htx9/10/11/12/13、r-guang1、r-tx1）
	//    挪到 1×1 透明页 → 用户实测"修好了"。图集已固化改好，平时**不需要再跑这里的命令**。
	//  ⚠ 结论先记住：`player.hideSlots` 只喂给「部件列表」查询（dynamicWorker.js:1505-1531），
	//    **不影响渲染** → 想靠它隐藏部件是死路（实测"没什么变化"正是这个原因）。
	//  真正能立刻见效的杠杆是**图集**：把某个 region 指向一张 1x1 全透明贴图（`dmqc_blank.png`），
	//  重载皮肤后那一块就看不见了。图集是纯文本，改完不用重启游戏。
	//  用法（F12 控制台）：
	//    dmqcParts()                → 列出全部 region（编号 + 名字 + 所在页）
	//    dmqcParts("guang")         → 只列匹配的
	//    dmqcMute(3)                → 屏蔽编号 3
	//    dmqcMute([3, 7, 9])        → 屏蔽多个编号
	//    dmqcMute("^(r-htx9|r-tx1)$")→ 按正则屏蔽（可反复叠加，直到光斑消失）
	//    dmqcMuteRestore()          → 还原成原始图集
	const DMQC_WEIYAN_KZ_ATLAS = "extension/十周年UI/assets/dynamic/势魏延/狂志吞天/XingXiang.atlas";
	const DMQC_WEIYAN_KZ_ATLAS_BAK = DMQC_WEIYAN_KZ_ATLAS + ".dmqc.bak";
	const DMQC_WEIYAN_KZ_BLANK = "dmqc_blank.png";

	function dmqcReadTextFile(rel, ok, fail) {
		if (typeof game === "undefined" || !game.readFileAsText) return fail && fail();
		game.readFileAsText(rel, ok, function () {
			game.readFileAsText((lib.assetURL || "") + rel, ok, function () {
				fail && fail();
			});
		});
	}
	function dmqcWriteTextFile(rel, text, ok, fail) {
		if (typeof game === "undefined" || !game.writeFile) return fail && fail();
		const i = rel.lastIndexOf("/");
		game.writeFile(text, rel.slice(0, i), rel.slice(i + 1), ok, fail);
	}
	function dmqcAtlasParse(text) {
		const lines = String(text).split(/\r?\n/);
		const pages = [];
		let cur = null;
		let i = 0;
		while (i < lines.length) {
			const line = lines[i];
			if (/\.png\s*$/.test(line)) {
				cur = { page: line.trim(), header: [], regions: [] };
				i++;
				while (i < lines.length && /^\s*\S+\s*:/.test(lines[i])) cur.header.push(lines[i++]);
				pages.push(cur);
				continue;
			}
			if (line.trim() && /^\S/.test(line)) {
				const reg = { name: line.trim(), lines: [] };
				i++;
				while (i < lines.length && /^\s+\S/.test(lines[i])) reg.lines.push(lines[i++]);
				if (cur) cur.regions.push(reg);
				continue;
			}
			i++;
		}
		return pages;
	}
	function dmqcAtlasSerialize(pages) {
		const out = [];
		pages.forEach(function (p) {
			out.push(p.page);
			p.header.forEach(function (h) {
				out.push(h);
			});
			p.regions.forEach(function (r) {
				out.push(r.name);
				r.lines.forEach(function (l) {
					out.push(l);
				});
			});
			out.push("");
		});
		return out.join("\n");
	}
	function dmqcAtlasRegionNames(pages) {
		const names = [];
		pages.forEach(function (p) {
			p.regions.forEach(function (r) {
				names.push(r.name);
			});
		});
		return names;
	}
	/// 把指定名字的 region 换成 1x1 透明（叠在 `dmqc_blank.png` 这一页上）
	function dmqcAtlasMute(pages, names) {
		const set = new Set(names);
		const muted = [];
		pages.forEach(function (p) {
			if (p.page === DMQC_WEIYAN_KZ_BLANK) return;
			p.regions = p.regions.filter(function (r) {
				if (set.has(r.name)) {
					muted.push(r.name);
					return false;
				}
				return true;
			});
		});
		let blank = pages.find(function (p) {
			return p.page === DMQC_WEIYAN_KZ_BLANK;
		});
		if (!blank && muted.length) {
			blank = {
				page: DMQC_WEIYAN_KZ_BLANK,
				header: ["size: 1,1", "format: RGBA8888", "filter: Linear,Linear", "repeat: none"],
				regions: [],
			};
			pages.unshift(blank);
		}
		if (blank) {
			muted.forEach(function (name) {
				if (
					!blank.regions.some(function (r) {
						return r.name === name;
					})
				) {
					blank.regions.push({
						name: name,
						lines: ["  rotate: false", "  xy: 0, 0", "  size: 1, 1", "  orig: 1, 1", "  offset: 0, 0", "  index: -1"],
					});
				}
			});
		}
		return muted;
	}
	/// 重载所有正在播「狂志吞天」的魏延（让图集改动立刻生效）
	window.dmqcReloadKuangzhi = function () {
		let n = 0;
		try {
			(game.players || []).concat(game.dead || []).forEach(function (p) {
				if (!p || (p.name !== "sgz_weiyan" && p.name1 !== "sgz_weiyan")) return;
				const node = p.dynamic && p.dynamic.primary;
				if (!node || String(node.name || "").indexOf("势魏延/狂志吞天/") !== 0) return;
				const isDeputy = p.name2 === "sgz_weiyan" && p.name1 !== "sgz_weiyan";
				game.qhly_changeDynamicSkin(p, DMQC_WEIYAN_KUANGZHI, undefined, isDeputy);
				n++;
			});
		} catch (e) {
			console.error("[大梦千秋] 重载失败：", e);
		}
		if (!n) console.log("[大梦千秋] 当前没有正在播「狂志吞天」的魏延（换一次皮肤或等下一局）");
		return n;
	};
	window.dmqcParts = function (filter) {
		dmqcReadTextFile(
			DMQC_WEIYAN_KZ_ATLAS,
			function (text) {
				const names = dmqcAtlasRegionNames(dmqcAtlasParse(text));
				const re = filter instanceof RegExp ? filter : filter ? new RegExp(String(filter)) : null;
				const rows = [];
				names.forEach(function (name, idx) {
					if (!re || re.test(name)) rows.push(idx + 1 + "\t" + name);
				});
				console.log("[大梦千秋] 图集共 " + names.length + " 个 region，列出 " + rows.length + " 个：");
				console.log(rows.join("\n"));
				window.__dmqcParts = names;
			},
			function () {
				console.error("[大梦千秋] 读不到图集：" + DMQC_WEIYAN_KZ_ATLAS);
			}
		);
	};
	window.dmqcMute = function (which) {
		dmqcReadTextFile(
			DMQC_WEIYAN_KZ_ATLAS,
			function (text) {
				const pages = dmqcAtlasParse(text);
				const names = dmqcAtlasRegionNames(pages);
				let targets;
				if (typeof which === "number") targets = [names[which - 1]];
				else if (Array.isArray(which))
					targets = which.map(function (w) {
						return typeof w === "number" ? names[w - 1] : String(w);
					});
				else if (which instanceof RegExp) targets = names.filter(function (n) {
					return which.test(n);
				});
				else
					targets = names.filter(function (n) {
						return new RegExp(String(which)).test(n);
					});
				targets = targets.filter(Boolean);
				if (!targets.length) {
					console.log("[大梦千秋] 没有匹配的 region，未改动");
					return;
				}
				const muted = dmqcAtlasMute(pages, targets);
				dmqcWriteTextFile(DMQC_WEIYAN_KZ_ATLAS, dmqcAtlasSerialize(pages), function () {
					console.log("[大梦千秋] 已屏蔽 " + muted.length + " 个 region：" + muted.join(", "));
					window.dmqcReloadKuangzhi();
				}, function () {
					console.error("[大梦千秋] 写图集失败（可能被只读或被占用）：" + DMQC_WEIYAN_KZ_ATLAS);
				});
			},
			function () {
				console.error("[大梦千秋] 读不到图集：" + DMQC_WEIYAN_KZ_ATLAS);
			}
		);
	};
	window.dmqcMuteRestore = function () {
		dmqcReadTextFile(DMQC_WEIYAN_KZ_ATLAS_BAK, function (text) {
			dmqcWriteTextFile(DMQC_WEIYAN_KZ_ATLAS, text, function () {
				console.log("[大梦千秋] 图集已还原");
				window.dmqcReloadKuangzhi();
			}, function () {
				console.error("[大梦千秋] 还原失败");
			});
		}, function () {
			console.error("[大梦千秋] 找不到备份：" + DMQC_WEIYAN_KZ_ATLAS_BAK);
		});
	};

	// 用「标记变化」事件驱动：addMark / removeMark 都会触发，覆盖所有增减路径
	function dmqcRegisterSwapTrigger() {
		if (!lib.skill) return false;
		if (lib.skill.sgz_dmqc_skin_swap) return true; // 幂等
		lib.skill.sgz_dmqc_skin_swap = {
			charlotte: true,
			forced: true,
			silent: true,
			popup: false,
			// 每局开始时清空本局换肤状态（避免上一局的记录影响这一局）
			// ⚠ `roundStart` 是给梦陆逊用的：**每轮开始把三形态重置回 ① 蛇年清明**（见 8h 节）
			trigger: { global: ["addMark", "removeMark", "gameStart", "roundStart"] },
			async content(event, trigger, player) {
				if (trigger.name === "gameStart") {
					window.dmqcResetSwapState();
					// ①③ 若当前正在播的是 ③「烈焰炽魂」，开局也把副本里的 chuchang 删掉
					//    （需求：③ 不要回合开始的出场动画）
					[200, 800, 2000, 4000].forEach(function (delay) {
						setTimeout(function () {
							try {
								(game.players || []).forEach(function (p) {
									if (!p || (p.name1 !== "sgz_luxun" && p.name !== "sgz_luxun")) return;
									const n = p.dynamic && p.dynamic.primary;
									if (!n || !n.player) return;
									const spineName = n.player.name || n.name || "";
									if (spineName.indexOf("周瑜/烈焰炽魂/") === 0 && n.player.chuchang) {
										delete n.player.chuchang;
										console.log("[大梦千秋] ③烈焰炽魂：已去掉回合开始的出场动画");
									}
								});
							} catch (e) {}
						}, delay);
					});
					// 开局把文件里的框内参数推给渲染器（皮肤是千幻自动应用的，可能在我们之前）
					[200, 800, 2000, 4000].forEach(function (delay) {
						setTimeout(function () {
							try {
								window.dmqcLuxunPushParams();
							} catch (e) {}
						}, delay);
					});
					// 皮肤的位置/大小/出框参数**全部写死在** `DMQC_SKIN_PATCHES`（第 3e 节），
					// 每局开始不需要做任何回填 —— 局内调参面板改的值不会保留，这是有意为之
					// （它的保存流程对我们注入的这三张皮根本不生效，见 3e 节注释）。
					return;
				}
				// 每轮开始：梦陆逊回到 ①（不管上一轮是焚灭的②还是韬晦的③）
				//   顺手把「框内参数」再盖一遍：新开一局后 saveSkinParams.js 往往还没就绪，
				//   到第一轮开始肯定已经就绪了，这时补应用最保险（也不会打断玩家调参）。
				if (trigger.name === "roundStart") {
					// 每轮开始：梦陆逊回到 ①（皮肤的位置/大小全部写死在 DMQC_SKIN_PATCHES 里）
					(game.players || []).concat(game.dead || []).forEach(function (p) {
						if (!p || !p.isAlive || !p.isAlive()) return;
						if (p.name1 !== "sgz_luxun" && p.name !== "sgz_luxun") return;
						window.dmqcApplyLuxunSkin(p, 1); // 内部会再推一次参数
					});
					return;
				}
				// ⚠ addMark / removeMark 的字段名是 `markName`（不是 skill）：
				//   noname/library/element/player.js:4281（addMark）/ :4216 区间（removeMark）
				// trigger.player = 被加/减标记的人；本技能按 global 挂在全场，每人都有一份，无所谓。
				const target = trigger.player;
				const markName = trigger.markName;
				if (!target || !markName) return;
				window.dmqcApplySwapRules(target, markName);
			},
		};
		return true;
	}
	if (!dmqcRegisterSwapTrigger()) {
		let tries = 0;
		const t = setInterval(function () {
			tries++;
			if (dmqcRegisterSwapTrigger() || tries > 40) clearInterval(t);
		}, 500);
	}

	// ============================================================
	//  9. 「皮肤名 → 本包 image/ 下原图」的路径映射
	// ============================================================
	//  用 `_status.qhly_replaceSkin[武将][皮肤名] = 图片真实路径` 把「皮肤名」指到
	//  `extension/大梦千秋/image/` 下的原图。
	//  ⚠⚠ **结论（2026 补记，别再白试）：这张映射对本包武将其实不生效，图必须真的放进 `skin/image/`。**
	//    千幻 `qhly_getSkinFile`（千幻聆音/extension/content.js:6409-6417）的取图顺序是：
	//      ① `skinPackage.replaceAvatarDestination(realName, skin)` —— 本包没提供这个回调；
	//      ② `lib.qhly_skinChange[realName] && _status.qhly_replaceSkin[realName][skin]` ← 本节的映射；
	//      ③ 兜底 `skinPackage.skin.standard + realName + "/" + skin`（本包 = `extension/大梦千秋/skin/image/<武将>/<皮肤名>`）。
	//    第②支**多了一个前置条件** `lib.qhly_skinChange[realName]`，那是千幻自带的一张
	//    **本体变身皮表**（千幻聆音/skinChange.js，键是 caochun / shen_zhaoyun / caoying 这类本体武将），
	//    里面**没有任何 `sgz_*` 条目**，而千幻只在 `pkg.skinShare` 存在时才追加 `lib.qhly_skinShare`，
	//    所以 `qhly_getRealName("sgz_xx") === "sgz_xx"`、`lib.qhly_skinChange["sgz_xx"]` 恒为 undefined
	//    → 第②支整条短路 → 本节登记的内容**永远不会被读到**。
	//    ⇒ 想显示静皮，就必须把图放到 `skin/image/<武将id>/<皮肤名>.jpg`（本项目所有武将都是这么做的）。
	//    保留本节的原因：万一将来给 `lib.qhlypkg` 补上 `replaceAvatarDestination`，这张表可以立刻接管。
	//  ⚠ 键必须是**皮肤名 + `.jpg`**：`game.qhly_getSkin()` 返回的就是带后缀的文件名形式。
	//  ⚠ 这一节只负责「静态预览图去哪儿取」。立绘要不要播动皮、播哪一张，由
	//     `decadeUI.dynamicSkin` 那一侧决定（第 3c / 8 节）。
	const DMQC_REPLACE_SKIN_FILES = {
		// 梦赵云：四张花色皮（黑桃无专属图 → 沿用原皮 sgz_zhaoyun.jpg）
		sgz_zhaoyun: {
			[DMQC_ZHAOYUN_SUIT_SKINS.club + ".jpg"]: "extension/大梦千秋/image/sgz_zhaoyun_club.jpg",
			[DMQC_ZHAOYUN_SUIT_SKINS.diamond + ".jpg"]: "extension/大梦千秋/image/sgz_zhaoyun_diamond.jpg",
			[DMQC_ZHAOYUN_SUIT_SKINS.heart + ".jpg"]: "extension/大梦千秋/image/sgz_zhaoyun_heart.jpg",
			[DMQC_ZHAOYUN_SUIT_SKINS.spade + ".jpg"]: "extension/大梦千秋/image/sgz_zhaoyun.jpg",
		},
		// 梦曹髦：枭龙破渊 / 枭龙破渊2 的静态图**沿用本包原有的两张原画**（按要求不另做图）
		sgz_caomao: {
			[DMQC_CAOMAO_XIAOLONG + ".jpg"]: "extension/大梦千秋/image/sgz_caomao.jpg",
			[DMQC_CAOMAO_XIAOLONG2 + ".jpg"]: "extension/大梦千秋/image/sgz_caomao2.jpg",
		},
		// 梦魏延：狂志吞天 / 狂志吞天2 的静态图也沿用本包原有的两张原画
		//   （`sgz_weiyan.jpg` = 未觉醒，`sgz_weiyan2.jpg` = 竭伐觉醒后 —— 与角色原本的设定一致）
		sgz_weiyan: {
			[DMQC_WEIYAN_KUANGZHI + ".jpg"]: "extension/大梦千秋/image/sgz_weiyan.jpg",
			[DMQC_WEIYAN_KUANGZHI2 + ".jpg"]: "extension/大梦千秋/image/sgz_weiyan2.jpg",
		},
		// 梦钟会：潜蛟觊天 / 潜蛟觊天2 的静态图沿用本包原有的两张原画
		sgz_zhonghui: {
			[DMQC_ZHONGHUI_QIANJIAO + ".jpg"]: "extension/大梦千秋/image/sgz_zhonghui.jpg",
			[DMQC_ZHONGHUI_QIANJIAO2 + ".jpg"]: "extension/大梦千秋/image/sgz_zhonghui2.jpg",
		},
	};
	function dmqcRegisterReplaceSkins() {
		if (!_status) return false;
		if (!_status.qhly_replaceSkin) _status.qhly_replaceSkin = {};
		let changed = false;
		for (const charId in DMQC_REPLACE_SKIN_FILES) {
			const files = DMQC_REPLACE_SKIN_FILES[charId];
			const map = (_status.qhly_replaceSkin[charId] = _status.qhly_replaceSkin[charId] || {});
			for (const key in files) {
				if (map[key] !== files[key]) {
					map[key] = files[key];
					changed = true;
				}
			}
		}
		if (changed) {
			console.log("[大梦千秋] 皮肤静态图映射已登记（图仍取自 image/，未复制）");
		}
		return true;
	}
	dmqcRegisterReplaceSkins();
	// _status 相关字段由千幻初始化，晚一步就再试几次
	(function dmqcKeepReplaceSkins() {
		let tries = 0;
		const t = setInterval(function () {
			tries++;
			dmqcRegisterReplaceSkins();
			if (tries > 20) clearInterval(t);
		}, 500);
	})();

	// ============================================================
	//  10. 把「伤害牌特效」改挂到技能上（梦郭嘉 / 梦钟会）
	// ============================================================
	//  两条需求、同一套机制：
	//    · 梦郭嘉「以身证道」  ：伤害牌特效 → 改由【极慧】触发
	//    · 梦钟会「潜蛟觊天 / 潜蛟觊天2」：伤害牌特效 → 改由【逐月】触发
	//      （2026 改动：触发源**只剩【逐月】**；【矫诏】改用视频演出，不再叠出框。
	//        皮肤判据两个形态都认 —— 潜蛟觊天是默认皮，其骨骼里同样有 `GongJi`。）
	//
	//  ⚠ 为什么不能像姜维那样「删个键」（务必保留结论，别再白试一遍）：
	//    姜维「炽剑补天」的技能特效是**数据里明写的 `teshu`**，删键即消失；
	//    而这两张皮都不是：
	//      · 「以身证道」的皮肤数据里 `gongji` / `teshu` **两个键都没有** ——
	//        它的伤害牌特效来自 皮肤切换/chukuangWorker.js:664-673 的**兜底默认**：
	//        没配 `gongji` 就默认 `action: 'GongJi'`，而这张骨骼里恰好真有 GongJi 动画
	//        （XingXiang.skel 的动画表：DaiJiB / GongJi / TeShuF / ChuChangF）。
	//      · 「潜蛟觊天2」**有** `gongji: { x:[0,0.4], y:[0,0.6] }`（十周年UI/js/dynamicSkin.js:43543），
	//        但它没写 `action` → worker 里走 `fakeDynamic` 兜底，最后还是播骨骼自带的 GongJi。
	//    → 两张皮「删了键」都会落回同一条默认分支，**照样播**，所以没有键可删。
	//
	//  ⚠ 技能侧那条现成通路也走不通：
	//    `lib.skill._ts`（皮肤切换/extension.js:434，useSkillBefore → 派发 'TeShu'）
	//    本来能做"技能触发"，但 chukuangWorker.js:961-964 把
	//    「动作骨骼 == 待机骨骼」的 TeShu **直接判死**（注释：特殊动画还是最好不要出框）。
	//    十周年真正的技能特效都另配了 `chuchang2` 骨骼（如 `teshu:{name:"鲍三娘/兔娇春浓/chuchang2"}`），
	//    **这两张皮都没有**，所以 `teshu` / `whitelist` 这条路无效。
	//
	//  → 只能从**触发源**下手（两张皮同理）：
	//    ① 「伤害牌」的触发源 = 皮肤切换/extension.js:331 的全局技能 `lib.skill._gj`
	//       （trigger: player ['useCardBefore','useCard1','useCard2']；
	//        filter : 自己回合 && (basic|trick) && get.tag(card,'damage') > 0）。
	//       在**第 3b 节那个包装器里**加一条短路：当前立绘是这两张皮之一时返回 false
	//       → 伤害牌不再出框，同时也不会污染 worker 里 `actionState.GongJi` 的缓存
	//       （缓存一旦被判 false，之后连手动派发也会被挡掉，见 chukuangWorker.js:856-864）。
	//       ⚠ 第 3b 节已经包过一次 `_gj.filter`，**这里不要再包第二层**，否则两层的
	//         执行先后不确定，将来很容易踩坑；统一在 3b 里按角色分流。
	//       ⚠ 也不要用 worker 侧的 `gongji: { ck: false }` 来关：`ck` 是**动作级**的，
	//         `checkNoChukuang`（chukuangWorker.js:1103）在一切之前就把它拦掉，
	//         会**连下面②的手动派发一起挡死**。
	//    ② 技能结算时由角色文件调下面导出的函数，手动派发同一个 GongJi 出框
	//       → 视觉与原来完全一致，只是触发者换成了技能：
	//         · `character/sgz_guojia.js`  的 `sgz_jihui.content`      → dmqcPlayJihuiEffect
	//         · `character/sgz_zhonghui.js` 的 `sgz_zhuyue.content`      → dmqcPlayZhonghuiEffect
	//         · `character/sgz_zhonghui.js` 的 `sgz_jiaozhao.precontent` → dmqcPlayZhonghuiEffect
	//         · `character/sgz_sunhanhua.js` 的 `sgz_miaojian_use.backup.precontent` → dmqcPlaySunhanhuaEffect
	//         · `character/sgz_wenyang.js`   的 `sgz_jingyue_respond.content`（useCard1 那一下） → dmqcPlayWenyangEffect
	//         · `character/sgz_gannin.js`    的 `sgz_gannin_chukuang.content`（隐藏技能，`damageBegin1` 的 source 侧 = 即将造成伤害） → dmqcPlayGanningEffect
	//  ✅ 挂钩位置都选在「技能真正结算」的地方，而不是 `useSkillBefore`，两个理由：
	//     1. 极慧是**双模式**技能（`enable:"phaseUse"` + `trigger:{player:"damageEnd"}`），
	//        **受伤自动触发不派发 useSkill 事件**，只有 content 两条路都覆盖；
	//     2. 矫诏是 `chooseButton` 的视为技，真正的"发动"发生在 `backup().precontent` 里，
	//        那里才是它每次使用都会走的地方。
	//  ⚠ 可靠性：`get.info()` 是**直接返回 `lib.skill[name]` 引用**（noname/get/index.js:3470，
	//    无缓存层），所以运行期替换 filter，引擎在下一次触发时一定读得到。

	// 通用：技能触发时手动播一次出框（角色文件调用下面两个包装好的入口）
	//  ⚠ `spine` 可以是**单个骨骼路径**，也可以是**数组**（任一命中即可）
	function dmqcSkillChukuang(player, spine, label) {
		try {
			const list = Array.isArray(spine) ? spine : [spine];
			let hit = false;
			for (let i = 0; i < list.length; i++) {
				if (dmqcSkinIs(player, list[i])) {
					hit = true;
					break;
				}
			}
			if (!hit) return;
			// 皮肤切换 / 十周年UI 没启用时静默跳过，绝不影响技能结算
			if (!window.skinSwitch || !skinSwitch.chukuangWorkerApi) return;
			if (typeof skinSwitch.chukuangWorkerApi.chukuangAction !== "function") return;
			skinSwitch.chukuangWorkerApi.chukuangAction(player, "GongJi");
			console.log("[大梦千秋] " + label + " 触发出框：" + list.join(" | "));
		} catch (e) {
			console.warn("[大梦千秋] 技能出框播放失败（不影响技能结算）：", e);
		}
	}

	// 梦郭嘉【极慧】结算时播一次出框（由 character/sgz_guojia.js 的 sgz_jihui.content 调用）
	window.dmqcPlayJihuiEffect = function (player) {
		dmqcSkillChukuang(player, DMQC_YISHEN_SPINE, "梦郭嘉【极慧】");
	};

	// 梦钟会【逐月】结算时播一次出框
	//  ⚠ 2026 改动：**触发源改为「使用兴伐」**（原来还兼由【矫诏】触发）。
	//    · 【矫诏】那边现在改用视频演出（见第 11 节），不再叠一个出框；
	//    · 皮肤判据**两个形态都认**（潜蛟觊天是默认皮、潜蛟觊天2 是首次矫诏后的形态），
	//      否则常态下【逐月】永远出不了框。
	//    · 与此同时，第 3b 节的 `_gj` 短路也已扩到两个形态 —— 常态下「使用伤害牌」
	//      不会再自动出框（潜蛟觊天的骨骼里同样有 `GongJi`，不挡就会串）。
	//  （由 character/sgz_zhonghui.js 的 sgz_zhuyue.content 调用）
	window.dmqcPlayZhonghuiEffect = function (player) {
		dmqcSkillChukuang(player, [DMQC_QIANJIAO1_SPINE, DMQC_QIANJIAO_SPINE], "梦钟会【逐月】");
	};

	// 梦孙寒华【妙剑④】结算时播一次出框
	//  ⚠ 2026 改动：**触发源改为「发动妙剑④」**（原来绑在「使用伤害牌」上）。
	//    · 第 3b 节的 `_gj` 短路已经加了 `dmqcIsWeilingXianxian` —— 使用伤害牌
	//      不会再自动出框（威灵尽显的骨骼里同样带 `GongJi`，不挡就会串）；
	//    · ④ 是 `chooseButton` 的视为技，每次使用都会经过 `backup().precontent`
	//      （和【矫诏】同理，那里是唯一全覆盖的"发动"点），所以挂钩放在那儿。
	//  （由 character/sgz_sunhanhua.js 的 sgz_miaojian_use.backup.precontent 调用）
	window.dmqcPlaySunhanhuaEffect = function (player) {
		dmqcSkillChukuang(player, DMQC_SUNHANHUA_WEILING_SPINE, "梦孙寒华【妙剑④】");
	};

	// 梦文鸯【惊跃】使用时播一次出框
	//  ⚠ 2026 改动（需求）：**「势若万钧」的攻击出框，触发条件改为「使用【惊跃】」**
	//    （原来跟其它皮一样，绑在「使用伤害牌」上）。
	//    · 第 3b 节的 `_gj` 短路已加 `dmqcIsShiRuoWanjun` —— 使用伤害牌不会再自动出框；
	//      ⚠ 势若万钧的皮肤数据里**没有** `gongji` 键，但骨骼
	//        `assets/dynamic/文鸯/势若万钧/XingXiang.skel` 里**确实有 `GongJi`** 动作，
	//        所以关掉触发源之后必须手动派发，否则就彻底不播了；
	//      ⚠ 也正因为没有 `gongji` 键，`chukuangWorker.js:664-673` 会落回兜底默认
	//        `{action:'GongJi'}` —— 那正是我们要的动作，不用另配皮肤数据。
	//    · 挂钩点选在【惊跃】的 `useCard1`（`sgz_jingyue_respond.content` 里的那个点）：
	//      与原来「伤害牌」的时机同为「牌刚声明、结算之前」，视觉不会突然变晚；
	//      火/雷两种【杀】都算（惊跃每使用一次就播一次）。
	//  （由 character/sgz_wenyang.js 的 sgz_jingyue_respond.content 调用）
	window.dmqcPlayWenyangEffect = function (player) {
		dmqcSkillChukuang(player, DMQC_WENYANG_SHIRO_SPINE, "梦文鸯【惊跃】");
	};

	// 梦甘宁（战破无间）：**即将造成伤害时**播一次出框
	//  ⚠ 2026 改动（需求）：这个出框原来是跟着「使用伤害牌」走的
	//    （皮肤切换的全局技能 `lib.skill._gj`：自己回合 + 基本/锦囊 + `get.tag(card,'damage')`），
	//    现在改成「**你即将造成伤害时**」。
	//    · 第 3b 节的 `_gj` 短路已加 `dmqcIsZhanPoWujian` —— 使用伤害牌不再自动出框；
	//    · 触发源落在**角色文件**里的隐藏技能（`character/sgz_gannin.js` 的
	//      `sgz_gannin_chukuang`：`trigger: { source: "damageBegin1" }`），
	//      和夜魇②-2「你的牌造成的伤害+1」是同一个伤害时机 = 「即将造成伤害」；
	//    · 这张皮的骨骼（`assets/dynamic/神甘宁/战破无间/`）里同样带 `GongJi`，
	//      第 10 节给它单独配的 `gongji` 还顺带把它挪到了**屏幕右下角**（见第 3c 节）。
	//  （由 character/sgz_gannin.js 的 sgz_gannin_chukuang.content 调用）
	window.dmqcPlayGanningEffect = function (player) {
		dmqcSkillChukuang(player, DMQC_GANNING_ZHANPO_SPINE, "梦甘宁（战破无间）");
	};

	// ============================================================
	//  11. 梦钟会：局内首次【矫诏】→ 屏幕中央播视频 + 换成「潜蛟觊天2」
	// ============================================================
	//  需求：每局第一次发动【矫诏】时，在屏幕中央播放 `钟会.mp4`，
	//        并把皮肤切成「潜蛟觊天2」（原来那套「患 ≥ 3 自动换皮」已丢弃）。
	//
	//  ── 视频播放器（通用，别处也能用）──────────────────────────────
	//  做法与「无名美化」已验证的实现同构（`无名美化/utils/utils.js:846-970`
	//  的 `PlayCustomAnByVideo`）：一个普通 `<video>` 元素挂到 `document.body`，
	//  用 `position:fixed + top/left 50% + translate(-50%,-50%)` 居中。
	//  ⚠ 视频**不受** `assets/dynamic/` 那个写死前缀的约束（那是脊椎加载器的限制），
	//    所以 mp4 直接放在本扩展目录里就行。
	//  ⚠ 自动播放策略：先 `muted = true` 起播，等 `playing` 事件到了再取消静音
	//    —— 直接带声 `play()` 在 Chromium 上容易被拒。
	//  ⚠ 编码：本视频实测是 `ftyp/isom + avc1(H.264) + mp4a(AAC)`，
	//    与无名美化里能正常播放的那几段同规格，Chromium 可解。
	//  ── 想调尺寸？看文件上方的 `DMQC_ZHONGHUI_VIDEO_SIZE`（★ 标注那一段）──
	//    只想立刻看效果：控制台跑 `dmqcTestCenterVideo({width:"1000px"})` 试播。
	//  可选项（opts）：
	//    · width / height  默认 80% / auto（受 max-width/max-height 92vw/92vh 约束）
	//    · zIndex          默认 DMQC_ZHONGHUI_VIDEO_ZINDEX
	//    · sound           默认 true（false = 全程静音）
	//    · pauseGame       默认 false；**梦钟会那条传的是 true**（DMQC_ZHONGHUI_VIDEO_PAUSE_GAME），
	//                      即「播放期间暂停游戏，看完/出错/超时自动恢复」
	//    · startTimeout    默认 8000ms：多久还没起播就放弃并恢复游戏（防卡死）
	//    · endMargin       默认 3000ms：起播后「视频时长 + 它」还没 ended 就强制收尾（防卡死）
	//    · onEnd           播完/清理后的回调
	//    · anchor          锚点：给一个**玩家对象**（用它的 `node.avatar` 武将牌）或 DOM 节点
	//                      → 视频的**底边中点**贴到它的**上沿**并再往上留 `gap` 像素，
	//                        即「播在武将牌上方」；不给就居中（原来那套）
	//    · rotate          倾斜角度（deg，负值=逆时针）→ 「斜着」；0/不写 = 不斜
	//    · gap             锚定模式下距武将牌上沿的间距（px，默认 0）
	//    · offsetX         水平偏移（px）：**负值 = 往左**，在基准位置上再平移（默认 0）
	//    · offsetY         垂直偏移（px）：**负值 = 往上**，在基准位置上再平移（默认 0）
	//                      —— 锚定与居中两种模式都吃这两个偏移（居中模式内部走 calc）
	//  ⚠ 只要 `pauseGame: true`，**三条结束路径**（正常播完 / 加载出错 / 两道超时兜底）
	//    都会走同一个 `cleanup` → 一定会 `game.resume()`，不会把游戏卡在暂停态。
	function dmqcPlayCenterVideo(src, opts) {
		try {
			if (!src || typeof document === "undefined") return null;
			const cfg = Object.assign(
				{
					width: "80%",
					height: "auto",
					zIndex: DMQC_ZHONGHUI_VIDEO_ZINDEX,
					sound: true,
					pauseGame: false,
					anchor: null,
					rotate: 0,
					gap: 0,
					offsetX: 0,
					offsetY: 0,
					// 兜底超时（毫秒）——**暂停游戏时必须有**，否则视频卡住 = 游戏永远卡住：
					//   · startTimeout：多久还没起播就放弃（编码不支持 / 路径错 / 解码器没起来）
					//   · endMargin：起播后再等「视频时长 + 这个余量」还没有 ended 就强制收尾
					startTimeout: 8000,
					endMargin: 3000,
					onEnd: null,
				},
				opts || {}
			);
			const url = (typeof lib !== "undefined" && lib.assetURL ? lib.assetURL : "") + src;
			const video = document.createElement("video");
			video.src = url;
			video.controls = false;
			video.loop = false;
			video.preload = "auto";
			video.autoplay = false; // 自己控制起播时机，避免被自动播放策略拦
			video.muted = true; // 先静音起播
			video.playsInline = true;
			// ---- 定位：锚定「武将牌上方」 或 居中 ----
			//  锚点解析：玩家对象 → 它的 node.avatar；已是 DOM 节点则直接用。
			let anchorNode = null;
			if (cfg.anchor) {
				try {
					anchorNode = cfg.anchor.node && cfg.anchor.node.avatar ? cfg.anchor.node.avatar : cfg.anchor;
					if (!anchorNode || typeof anchorNode.getBoundingClientRect !== "function") anchorNode = null;
				} catch (e) {
					anchorNode = null;
				}
			}
			const rotateCss = cfg.rotate ? " rotate(" + cfg.rotate + "deg)" : "";
			const offX = cfg.offsetX || 0;
			const offY = cfg.offsetY || 0;
			const style = [
				"position:fixed",
				"z-index:" + cfg.zIndex,
				"width:" + cfg.width,
				"height:" + cfg.height,
				"max-width:92vw",
				"max-height:92vh",
				"pointer-events:none",
				"background:#000",
				"box-shadow:0 0 48px rgba(0,0,0,.85)",
			];
			if (anchorNode) {
				const rect = anchorNode.getBoundingClientRect();
				// 底边中点对准「武将牌上沿再往上 gap」，绕底边中点旋转 → 斜着但锚点不跑
				// `offsetX/offsetY` 是在这个基准上再平移（负 X = 往左，负 Y = 往上）
				style.push("left:" + (rect.left + rect.width / 2 + offX) + "px");
				style.push("top:" + (rect.top - (cfg.gap || 0) + offY) + "px");
				style.push("transform-origin:50% 100%");
				style.push("transform:translate(-50%,-100%)" + rotateCss);
			} else {
				// 居中模式：用 calc 让 offsetX/offsetY 同样生效
				style.push("left:calc(50% + " + offX + "px)");
				style.push("top:calc(50% + " + offY + "px)");
				style.push("transform-origin:50% 50%");
				style.push("transform:translate(-50%,-50%)" + rotateCss);
			}
			video.style.cssText = style.join(";");
			let done = false;
			let timers = [];
			const clearTimers = function () {
				timers.forEach(function (t) {
					clearTimeout(t);
				});
				timers = [];
			};
			const cleanup = function (reason) {
				if (done) return;
				done = true;
				clearTimers();
				try {
					video.pause();
				} catch (e) {}
				if (video.parentNode) video.parentNode.removeChild(video);
				// ⚠ 无论怎么结束都要恢复游戏（正常播完 / 出错 / 兜底超时 三条路都走这里）
				if (cfg.pauseGame) {
					try {
						game.resume();
					} catch (e) {}
				}
				if (reason) console.warn("[大梦千秋] 中央视频收尾原因：" + reason);
				try {
					if (typeof cfg.onEnd === "function") cfg.onEnd();
				} catch (e) {}
			};
			// 把收尾函数挂在元素上：调用方拿到 video 就能主动停掉它
			// （例如「非首次矫诏」的小视频连着触发时，先收掉上一条，避免叠在一起）
			video.__dmqcCleanup = cleanup;
			video.addEventListener("playing", function () {
				if (cfg.sound) video.muted = false; // 起来了再放开声音
				clearTimers(); // 已经真的在播了，撤掉「起播超时」
				// 起播成功后按**真实时长**再设一道兜底（拿不到时长就退回 30 秒）
				const dur = isFinite(video.duration) && video.duration > 0 ? video.duration : 30;
				timers.push(
					setTimeout(function () {
						cleanup("超过视频时长仍未结束，强制收尾");
					}, (dur + cfg.endMargin / 1000) * 1000)
				);
			});
			video.addEventListener("ended", function () {
				cleanup();
			});
			video.addEventListener("error", function () {
				console.error("[大梦千秋] 视频播放失败（编码不支持或路径不对）：" + url);
				cleanup("加载/解码出错");
			});
			document.body.appendChild(video);
			if (cfg.pauseGame) {
				try {
					game.pause();
				} catch (e) {}
			}
			// 起播超时兜底：到点还没 playing 就收尾（并恢复游戏）
			timers.push(
				setTimeout(function () {
					cleanup("起播超时（" + cfg.startTimeout + "ms 内没有开始播放）");
				}, cfg.startTimeout)
			);
			const p = video.play();
			if (p && typeof p.catch === "function") {
				p.catch(function (e) {
					console.warn("[大梦千秋] 视频起播被拒（不影响游戏）：", e);
				});
			}
			console.log(
				"[大梦千秋] 中央视频开播：" + src + "  尺寸=" + cfg.width + "×" + cfg.height + (cfg.pauseGame ? "（已暂停游戏）" : "")
			);
			return video;
		} catch (e) {
			console.error("[大梦千秋] 中央视频播放器异常（不影响游戏）：", e);
			try {
				if (opts && opts.pauseGame) game.resume();
			} catch (e2) {}
			return null;
		}
	}
	window.dmqcPlayCenterVideo = dmqcPlayCenterVideo;

	// 调尺寸专用：控制台里直接跑，不必开新局
	//   例：dmqcTestCenterVideo()                       → 用当前默认尺寸
	//       dmqcTestCenterVideo({width:"1000px"})       → 只改宽（高自适应）
	//       dmqcTestCenterVideo({width:"1200px",height:"320px"})
	//       dmqcTestCenterVideo({width:"60%", sound:false, pauseGame:false})
	window.dmqcTestCenterVideo = function (opts) {
		return dmqcPlayCenterVideo(DMQC_ZHONGHUI_VIDEO, Object.assign({ pauseGame: false }, opts || {}));
	};

	// 调尺寸/角度专用（小视频，锚在武将牌上方）：控制台里直接跑，不必开新局
	//   例：dmqcTestSubVideo()                              → 用当前默认（20% / -12°）
	//       dmqcTestSubVideo({width:"30%", rotate:-20})      → 调大小与斜度
	//       dmqcTestSubVideo({rotate:0})                     → 摆正看看
	//   ⚠ 需要一个锚点玩家；默认用 `game.me`，不在对局里时退回第一个玩家。
	window.dmqcTestSubVideo = function (opts) {
		const anchor = (typeof game !== "undefined" && (game.me || (game.players && game.players[0]))) || null;
		if (!anchor) {
			console.warn("[大梦千秋] 没有可用作锚点的玩家（先在局内再试）");
			return null;
		}
		return dmqcPlayCenterVideo(
			DMQC_ZHONGHUI_VIDEO_SUB,
			Object.assign(
				{
					// 位置模式：AT_CENTER=true 时不给锚点 → 走播放器的居中分支
					anchor: DMQC_ZHONGHUI_VIDEO_SUB_AT_CENTER ? null : anchor,
					rotate: DMQC_ZHONGHUI_VIDEO_SUB_ROTATE,
					gap: DMQC_ZHONGHUI_VIDEO_SUB_GAP,
					offsetX: DMQC_ZHONGHUI_VIDEO_SUB_OFFSET_X,
					offsetY: DMQC_ZHONGHUI_VIDEO_SUB_OFFSET_Y,
					zIndex: DMQC_ZHONGHUI_VIDEO_SUB_ZINDEX,
					sound: DMQC_ZHONGHUI_VIDEO_SUB_SOUND,
					pauseGame: false,
				},
				DMQC_ZHONGHUI_VIDEO_SUB_SIZE,
				opts || {}
			)
		);
	};

	// 记着「非首次矫诏」那条小视频，连着触发时先收掉上一条，避免叠在一起
	let dmqcZhonghuiSubVideo = null;

	// 梦钟会【矫诏】的两段演出（由 character/sgz_zhonghui.js 的 sgz_jiaozhao.precontent 调用）
	//   · **首次**（每局）：屏幕中央大视频（`sgz_zhonghui.mp4`，暂停游戏）+ 换成「潜蛟觊天2」
	//   · **非首次**：`sgz_zhonghui.mp4` **斜着播在武将牌上方**（width 20%），**不中断游戏**
	//  ⚠ 「每局一次」用 `player.storage` 记 —— 它随玩家对象一局一份，
	//    不需要额外挂钩 `gameStart` 去清（那个隐藏技能其实并没有被 addGlobalSkill，见第 8 节备注）。
	//  ⚠ 换皮走 `dmqcSwapSkin`：**不写存档**（下一局仍按玩家自己选的皮肤开局）。
	window.dmqcZhonghuiJiaozhaoVideo = function (player) {
		try {
			if (!player) return;
			if (DMQC_ZHONGHUI_VIDEO_ONLY_MINE && typeof player.isMine === "function" && !player.isMine()) return;
			const isFirst = !(player.storage && player.storage.sgz_jiaozhao_video_once);
			if (isFirst) {
				if (player.storage) player.storage.sgz_jiaozhao_video_once = true;
				console.log("[大梦千秋] 梦钟会局内首次【矫诏】：播放中央视频（暂停游戏）并切换为「潜蛟觊天2」");
				// 尺寸与「是否暂停游戏」都取上面的常量；换皮不写存档
				dmqcPlayCenterVideo(
					DMQC_ZHONGHUI_VIDEO,
					Object.assign({ pauseGame: DMQC_ZHONGHUI_VIDEO_PAUSE_GAME }, DMQC_ZHONGHUI_VIDEO_SIZE)
				);
				dmqcSwapSkin(player, DMQC_ZHONGHUI_QIANJIAO2);
				return;
			}
			// ---- 非首次：武将牌上方斜着小视频，**不中断游戏** ----
			// 上一条还没播完就先收掉（矫诏每回合可用 2 次，叠起来会很难看）
			if (dmqcZhonghuiSubVideo && typeof dmqcZhonghuiSubVideo.__dmqcCleanup === "function") {
				dmqcZhonghuiSubVideo.__dmqcCleanup("被下一次矫诏顶掉");
			}
			dmqcZhonghuiSubVideo = dmqcPlayCenterVideo(
				DMQC_ZHONGHUI_VIDEO_SUB,
				Object.assign(
					{
						// 位置模式：AT_CENTER=true 时不给锚点 → 走播放器的居中分支
						anchor: DMQC_ZHONGHUI_VIDEO_SUB_AT_CENTER ? null : player,
						rotate: DMQC_ZHONGHUI_VIDEO_SUB_ROTATE,
						gap: DMQC_ZHONGHUI_VIDEO_SUB_GAP,
						offsetX: DMQC_ZHONGHUI_VIDEO_SUB_OFFSET_X,
						offsetY: DMQC_ZHONGHUI_VIDEO_SUB_OFFSET_Y,
						zIndex: DMQC_ZHONGHUI_VIDEO_SUB_ZINDEX,
						sound: DMQC_ZHONGHUI_VIDEO_SUB_SOUND,
						pauseGame: false,
						onEnd: function () {
							dmqcZhonghuiSubVideo = null;
						},
					},
					DMQC_ZHONGHUI_VIDEO_SUB_SIZE
				)
			);
		} catch (e) {
			console.error("[大梦千秋] 矫诏视频/换皮失败（不影响技能结算）：", e);
		}
	};

	// ============================================================
	//  ---- 15. 千幻数据来源自愈 + 诊断 ----
	//  背景：千幻的「技能 / 台词」页面，数据来自 game.qhly_foundPackage(武将) 返回的包：
	//    · 包的 characterTaici(name)  → 台词文本
	//    · get.character(武将, 3)     → 技能列表（顺序）
	//    · lib.skill[技能].audio      → 每个技能的语音数量（:N）
	//  只要找到的**不是本扩展注册的那个包**，或者 lib.qhly_dirskininfo 里有旧的覆盖数据，
	//  表现就是：改 skillTranslate / characterTaici 全都没反应、台词格数量也不对。
	//  这里在加载后自检一遍，并把本包放到 lib.qhlypkg 的最前面（本包武将的真相只在文件里）。
	// ============================================================
	const DMQC_QHLY_CHARS = [
		"sgz_huangyueying",
		"sgz_jiangwei",
		"sgz_zhonghui",
		"sgz_zhugedan",
		"sgz_guojia",
		"sgz_machao",
		"sgz_guanyu",
		"sgz_caomao",
		"sgz_weiyan",
		"sgz_luxun",
		"sgz_xiaoqiao",
		"sgz_sunhanhua",
		"sgz_gannin",
		"sgz_wenyang",
		"sgz_zhaoyun",
		"sgz_duyu",
	];
	/// 本扩展注册的千幻包（extension.js 里 push 的那个）
	function dmqcFindOwnQhlyPkg() {
		const list = (lib && lib.qhlypkg) || [];
		for (const pkg of list) {
			try {
				if (pkg && typeof pkg.characterTaici === "function" && pkg.filterCharacter && pkg.filterCharacter("sgz_huangyueying")) return pkg;
			} catch (e) {}
		}
		return null;
	}
	function dmqcFixQhlyDataSources() {
		if (!window.qhly_import || !lib || !lib.qhlypkg || typeof game.qhly_foundPackage !== "function") return false;
		const own = dmqcFindOwnQhlyPkg();
		if (!own) return false;
		// ① 把本包移到最前面：qhly_foundPackage 是按顺序取第一个匹配的包
		const idx = lib.qhlypkg.indexOf(own);
		if (idx > 0) {
			lib.qhlypkg.splice(idx, 1);
			lib.qhlypkg.unshift(own);
			console.log("[大梦千秋] 已把本扩展的千幻包提到最前（原序号 " + idx + "），保证技能/台词按本包文件读取");
		}
		// ② 清掉旧皮肤数据覆盖：skininfo.js 会整包盖住 characterTaici
		let cleared = 0;
		if (lib.qhly_dirskininfo) {
			for (const id of DMQC_QHLY_CHARS) {
				if (lib.qhly_dirskininfo[id]) {
					delete lib.qhly_dirskininfo[id];
					cleared++;
				}
			}
		}
		if (cleared) console.log("[大梦千秋] 已清掉 " + cleared + " 个旧的千幻 skininfo 覆盖（它们会盖住 characterTaici）");
		return true;
	}
	if (!dmqcFixQhlyDataSources()) {
		let triesFix = 0;
		const timerFix = setInterval(function () {
			triesFix++;
			if (dmqcFixQhlyDataSources() || triesFix > 40) clearInterval(timerFix);
		}, 500);
	}

	/// 诊断：在控制台执行 dmqcQhlyDebug() 即可看到千幻的数据来源
	window.dmqcQhlyDebug = function (charId) {
		charId = charId || "sgz_huangyueying";
		const out = {};
		try {
			const pkg = game.qhly_foundPackage ? game.qhly_foundPackage(charId) : null;
			out.武将 = charId;
			out.命中的千幻包 = pkg
				? {
						"lib.qhlypkg 里的序号": (lib.qhlypkg || []).indexOf(pkg),
						isExt: !!pkg.isExt,
						skin目录: pkg.skin && pkg.skin.standard,
						"有 characterTaici 函数": typeof pkg.characterTaici,
					}
				: "(没找到包)";
			out["是否本扩展的包"] = pkg && typeof pkg.characterTaici === "function" && pkg.filterCharacter && pkg.filterCharacter(charId);
			out["有皮肤数据覆盖 lib.qhly_dirskininfo"] = !!(lib.qhly_dirskininfo && lib.qhly_dirskininfo[charId]);
			const skills = get.character(charId, 3) || [];
			out.技能列表 = skills.slice();
			out.语音数量 = {};
			for (const s of skills) {
				const info = lib.skill[s] || {};
				out.语音数量[s] = info.audio;
			}
			const taici = pkg && pkg.characterTaici ? pkg.characterTaici(charId) : null;
			out.台词来源 = taici;
			out.台词键 = taici ? Object.keys(taici) : null;
			out["绮梦台词"] = taici && taici.sgz_qimeng ? taici.sgz_qimeng.content : "(拿不到)";
		} catch (e) {
			out.出错 = String(e);
		}
		console.log("[大梦千秋] 千幻诊断：", out);
		return out;
	};

});
