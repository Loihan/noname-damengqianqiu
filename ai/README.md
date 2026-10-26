# `ai/` —— 本包武将的**技能 AI** 集中地

> 一句话：**一个武将一个文件**，文件名与 `character/<同名>.js` 一一对应；
> 角色文件里只写 `ai: AI.<技能id>,`，AI 逻辑一律写在这里。

## 为什么单独一个目录

1. **AI 会被"顺手"覆盖掉。** 同一个技能对象里写两个 `ai:` 键时，后一个会把前一个**整份**盖掉，
   JS 不报错、游戏里只是"变笨"。本目录建立时一次就查出 **7 处**这种情况
   （`mfsd_guishi` / `mfsd_shisu` / `mfsd_juejie` / `sgz_fenmie` / `sgz_longxiao` /
   `shj_pixie` / `shj_zhen_e`），被盖掉的那份现在以注释形式留在对应模块里备查。
2. **"哪些技能还没 AI"只有集中才看得全。** 现在 `__dytest/check_ai_centralized.mjs`
   会直接打印覆盖率和缺口清单。
3. 调 AI 不用碰规则代码：角色文件里那些 `persevereSkill` / `content` / `filter`
   是**规则**，改起来风险大；AI 只影响电脑决策，改坏了也不会破坏结算。

## 写法

```js
// ai/sgz_wenyang.js
export default {
    sgz_jingyue: { order: 7, result: { player: 1 } },   // 顶层技能
    sgz_jingyue_effect: { /* 子技能用注册后的完整 id：父技能_子技能 */ },
};
```

```js
// character/sgz_wenyang.js
import AI, { helpers } from "../ai/sgz_wenyang.js";
// …
sgz_jingyue: {
    persevereSkill: true,
    ai: AI.sgz_jingyue,
    check: helpers.sgz_jingyue_check,   // 视为技的 AI 选牌（也是 AI 逻辑）
    // …
},
```

### 除了 `ai` 表，还有一类 AI：`helpers`

「只给电脑用、又不是技能 `ai` 表」的逻辑统一放模块的**具名导出 `helpers`**，目前包括：

| 原来是 | 现在是 | 说明 |
|---|---|---|
| `check: function(card/button) {…}` | `check: helpers.<id>_check` | 视为技「用哪张牌 / 是否发动」的 AI 判定（`get.info(skill).check`） |
| `mod: { aiValue / aiOrder / aiUseful }` | `aiValue: helpers.<id>_aiValue` … | 引擎 mod 钩子（`get/index.js:6219/6285/6404`），只影响 AI 估价 |
| `content` 里 `const xxxAi = function(button) {…}` | `helpers.sgz_fuyuan_optionValue(button, target)` | 例如曹髦【缚渊】选「权能」的评分函数（保留同名薄包装，调用点不用改） |

### 还有一类：必须留在角色文件里的「内联 AI」

`content` 里大量的 `.set("ai", …)` / `.set("ai1", …)`（约 55 处）是**一行式闭包**，
依赖技能里的局部变量（`event` / `trigger` / `player` / 循环变量）。它们仍在角色文件里，
但**每个模块底部都有一段「内联 AI 索引」**登记了数量与分布，
`check_ai_centralized.mjs` 会重算并比对 —— 所以"AI 到底散在哪里"始终可查。

### 注意

- **每个模块最下方有一段「AI 逻辑说明」**（纯注释）：按技能逐条写清
  "什么时候愿意点 / 觉得值不值 / 别人怎么看它 / 已知短板"。改 AI 时请顺手同步它 ——
  它是给人看的（也方便下一次让 AI 接手时快速了解现状），**不参与运行**。
- **子技能的 id**：引擎把 `subSkill: { effect: … }` 注册成 `sgz_jingyue_effect`，
  所以在这里也用它当键、在角色文件里写 `ai: AI.sgz_jingyue_effect`。
- **只放纯数据/函数**：引擎是**直接读** `lib.skill[id].ai` 的，模块顶层不要有副作用。
- **不要写成引用别的键**（如 `sgz_a: AI.sgz_b`）：自检按"同一个对象"较真，
  两份共用一份 AI 时请显式复制一份再改。
- **引用了角色文件私有闭包的 AI 只能留在角色里**（目前只有梦孙寒华【妙剑】④：
  `sgz_miaojian::use` 用了本文件的 `SGZ_MJ` / `sgzMjCards` / `sgzMjViewAsSet`），
  已登记在自检的 `INLINE_ALLOW` 白名单里。

## 引擎里的位置（需要查证时的入口）

- 技能 AI 通过 `get.info(skill).ai` 读，就是 `lib.skill[skill].ai` 这个对象；
- 常用键：`order` / `result` / `effect` / `value` / `threaten` / `expose` /
  `skillTagFilter`（写了 `save` / `respondXxx` 必须配）/ `directHit_ai` /
  `maixie_defend` 等；
- 全局技能 AI（`lib.skill._gj` 之类）不在这里，那是扩展级的东西（见 `skin.js`）。

## 自检

```bash
node __dytest/check_ai_centralized.mjs
```

会检查：每个 `ai/` 模块能被 import、角色文件确实 import 了它、技能上的 `ai` 与模块里
**是同一个对象**、模块里没有死条目、键都是合法标识符（要能写成 `AI.<key>`）、
`helpers` 里的键都被用到且引用无拼写错误、AI 里没有引用角色文件的私有标识符
（否则运行到那段 AI 会 ReferenceError）、以及**「内联 AI 索引」的数量与实际一致**，
并打印**覆盖率和还没写 AI 的技能清单**。

## 现状（搬运完成时）

- 技能对象 **345** 个（含子技能），`ai` 表覆盖 **71** 个（20.6%）。
- 另外已集中的「非 ai 表」AI：`check` 8 个、`mod` 钩子（aiValue/aiOrder/aiUseful）25 个、
  选项评分 1 个（缚渊）= **34 个 helpers**。
- 角色文件里仍内联的 `.set("ai", …)`：**约 55 处**（每个模块底部有索引，含分布）。
- 完全没有 AI 的武将：**梦甘宁（sgz_gannin）、梦吕布（sgz_lvbu）、梦魏延（sgz_weiyan）**；
  另外梦文鸯只有【惊跃】一条（`order: 7` + `result: { player: 1 }`，属于"能点亮就行"级别）。
- 下一步就是逐个补：优先「玩家最容易看出电脑变笨」的主动技 / 转化技 / 触发技
  （`order` 决定它什么时候点、`result` 决定它觉得值不值、`effect` 决定它怎么算别人对它的敌意）。
