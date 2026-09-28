// =====================================================
// 梦杜预 —— 武库 / 谏国 / 破竹 / 三陈 / 倾势（觉醒）· 灭吴
//
// 特效层见 effect/sgz_duyu.js：
//   · 破竹 · 竹节进度条（常驻武将牌右侧，显示「破竹标记数 / 回合开始时体力数」）
//   · 三陈 · 「武库开阖」主题选择框（每张装备栏卡内列出武库中可随机获得的全部装备牌名）
// 结构对照「白泽 shj_baize」，逐条替换名称与细节：
//   白泽                梦杜预
//   昭瑞（祥瑞标记）  →  武库（“陈令”标记 + 倾势未觉醒时摸牌）
//   图纳             →  谏国（指定至多3种，从中随机获得2张，随机花色点数）
//   白沼             →  破竹
//   辟邪             →  三陈（★大改，见下）
//   洞虚（觉醒）      →  倾势（觉醒·双分支：记录满 / 濒死）
//   镇厄             →  灭吴（仅「记录满」分支获得）
//
// 标记：技能「破竹」的名字不变，但它产生的标记叫「陈令」（id: sgz_chenling）。
//
// 三陈（大改点）：
//   原「辟邪」是消耗标记按奇偶打雷伤/横置翻面弃牌；
//   现「三陈」为：出牌阶段不限次数，移除3个“陈令”标记，从
//   武器/防具/防御坐骑/进攻坐骑中选一种（无可用装备牌的品种不出现），
//   获得该类一个额外装备栏，并随机装备一张你未装备的该类装备牌。
//
// 素材：武将图 image/sgz_duyu.jpg、语音 audio/sgz_duyu/ 待补（未配置）。
// =====================================================

import {
    DMQC_DUYU_MARK,
    DMQC_DUYU_POZHU_MARK,
    DMQC_DUYU_TURN_HP_KEY,
    DMQC_DUYU_UI_SKILL,
    DMQC_DUYU_SLOTS,
    DMQC_DUYU_SLOT_META,
    DMQC_SANCHEN_COST,
    pozhuGaugeUI,
    dmqcRefreshPozhuGauge,
    dmqcBuildSanchenDialog,
    dmqcBuildJianguoDialog,
} from "../effect/sgz_duyu.js";

// 「陈令」标记的技能名（武库产出；挂在武库上显示，便于 UI 展示）
// 注意：标记名与 storage 键由 effect/sgz_duyu.js 统一导出（单一来源，避免与特效层漂移）；
//       本文件内的 SGZ_DUYU_* 只是给下面既有代码用的别名。
const SGZ_DUYU_MARK_SKILL = DMQC_DUYU_MARK;
// 「破竹」标记的 storage 键（破竹自己每回合产出、也只被破竹消耗）。
// 注意：它与同名技能 `sgz_pozhu_mark` 共用这个键名，但那个技能**不写 intro**，
//       所以计数照走 storage + countMark，卡面上不会长出标记节点（详见破竹 subSkill.mark 的注释）。
const SGZ_DUYU_POZHU_MARK = DMQC_DUYU_POZHU_MARK;
// 武库记录（已收录的牌名）存放位置
const SGZ_DUYU_RECORD_KEY = "sgz_duyu_record";
// 倾势·失败分支（濒死觉醒）是否已触发：三陈据此改为装备“神武”
const SGZ_DUYU_QINGSHI_FAIL_KEY = "sgz_duyu_qingshi_fail";

// 本包扩展目录名（卡图的 ext: 前缀）。仅用作白名单之外的兜底判据，见下方说明。
const SGZ_DUYU_EXT_PREFIX = "ext:大梦千秋/";

// 本包「神武」白名单：与 card/card.js 的 card 段一一对应（19 + 7 = 26 张，统一 duyusw_ 前缀）。
// ※ 在 card/card.js 里增删神武卡时，这里要跟着改。
//
// 为什么用手写名单：
//   1) lib.card 是**全扩展共用**的卡牌注册表，按前缀扫会把别的扩展的牌算进来；
//   2) 本包神武已统一改用 duyusw_ 前缀（原 sw_/mj_），与搬运来源「星之梦」的卡 id 完全错开，
//      所以名单里的 id 一定是本包独有的。
const SGZ_DUYU_SHENWU = Object.freeze([
    "duyusw_guilongzhanyuedao", "duyusw_guofengyupao", "duyusw_qimenbagua", "duyusw_chiyanzhenhunqin",
    "duyusw_juechenjinge", "duyusw_xiuluolianyuji", "duyusw_chixueqingfeng", "duyusw_xuwangzhimian",
    "duyusw_qicaishenlu", "duyusw_luanfenghemingjian", "duyusw_xingtianpojunfu", "duyusw_jinwuluorigong",
    "duyusw_lingsheji", "duyusw_shanrangzhaoshu", "duyusw_sanshou", "duyusw_wushuangfangtianji",
    "duyusw_shufazijinguan", "duyusw_hongmianbaihuapao", "duyusw_linglongshimandai",
    "duyusw_mengyanchitu", "duyusw_qixingpao", "duyusw_shengguangbaiyi",
    "duyusw_xieshenmianju", "duyusw_jishengong", "duyusw_baihuaqun",
]);

// 「神武」判定：本包随扩展搬运过来的神武装备（card/card.js 里 duyusw_ 前缀的装备牌）
function sgzDuyuShenwuNames() {
    return SGZ_DUYU_SHENWU.filter(name => !lib.card || lib.card[name]);
}

// 是否为「神武」（**本包自己**的 duyusw_ 装备）
// 注意：必须用 get.info/get.type 前先确认 lib.card 里确实有这张牌——
//       lib.inpile 里可能残留「未装载卡包」的牌名，get.type 对不存在的牌名会取 .type 报错，
//       而 filter 里抛错会让技能按钮直接消失（看起来就是“技能熄灭”）。
function sgzDuyuIsShenwu(name) {
    if (typeof name != "string" || !lib.card || !lib.card[name]) {
        return false;
    }
    if (!SGZ_DUYU_SHENWU.includes(name)) {
        // 兜底：名单没跟上时，卡图明确指向本包目录的也算本包神武
        //（只在"本包那份定义真的进了 lib.card"时才可能命中，不会放进别的包的牌）
        const image = lib.card[name].image;
        if (!(typeof image == "string" && image.indexOf(SGZ_DUYU_EXT_PREFIX) === 0)) {
            return false;
        }
    }
    return get.type(name) == "equip";
}

// 倾势是否走了失败分支（濒死觉醒）：
// 只用来决定三陈选择框换哪套皮肤（幽紫冷银「武库化烬」）——
// 三陈 2 级的**效果**在成功/失败两条分支下完全相同，判定见 sgzDuyuSanchenLv2。
function sgzDuyuQingshiFailed(player) {
    return !!player.storage[SGZ_DUYU_QINGSHI_FAIL_KEY];
}

// ===================== 三陈 · 等级判定与装备栏扩容 =====================
// 三陈分两级（见 skillTranslate 的技能描述）：
//   1级（未觉醒）           ：选择一种装备栏类型，随机**获得**一张你未装备的该类型装备牌（进手牌）；
//   2级（倾势·任一分支觉醒）：自选一件你未装备的「神武」**获得之**（同样进手牌）。
// ⚠ 倾势的**成功**与**失败**两条分支都会把三陈升级到 2 级（原本只有失败分支升级）。
//   两条分支的 2 级**效果完全相同**，只有选择框的主题皮肤按分支区分
//   （success = 明金武库 / fail = 幽紫冷银），故这里统一成一个判据。
function sgzDuyuSanchenLv2(player) {
    return !!(player.storage.sgz_qingshi_awaken || player.storage[SGZ_DUYU_QINGSHI_FAIL_KEY]);
}

/** 每种装备栏的栏位数上限（三陈补栏的硬上限：1 个原生 + 最多 2 个扩展栏位） */
const SGZ_DUYU_SLOT_MAX = 3;

/** 一张装备牌涉及的栏位类型（equip3/equip4 双类型坐骑会产生两项） */
function sgzDuyuCardSlots(card) {
    const cardName = get.name ? get.name(card) : card && card.name;
    const info = cardName && lib.card ? lib.card[cardName] : null;
    let types = info && Array.isArray(info.subtypes) ? info.subtypes.slice(0) : [];
    if (!types.length) {
        types = (get.subtypes ? get.subtypes(card) : []) || [];
    }
    return types.map(slot => (slot == "equip3_4" ? "equip3" : slot));
}

/**
 * 该类型装备栏当前的**栏位总数**（引擎口径：1 个原生 + 已扩展数，被废除的数量已扣除）。
 * 例：`countEnabledSlot("equip1") === 3` 表示武器栏共有 3 个位置。
 */
function sgzDuyuSlotCapacity(player, slot) {
    try {
        return player.countEnabledSlot(slot);
    } catch (e) {
        const extra = player.expandedSlots && player.expandedSlots[slot] > 0 ? player.expandedSlots[slot] : 0;
        return 1 + extra;
    }
}

/**
 * 该类型装备栏当前件数（已装备的牌数）。
 * 用 getVEquips 与引擎自己的 countEmptySlot/countEquipableSlot 口径一致
 * （虚拟装备也算一件，不会漏算）。
 */
function sgzDuyuSlotUsed(player, slot) {
    try {
        return player.getVEquips(slot).length;
    } catch (e) {
        const getS = card => (get.subtypes ? get.subtypes(card) || [] : []);
        return player.getCards("e").filter(card => getS(card).includes(slot)).length;
    }
}

/**
 * 该类型装备栏是否**已满**。
 *
 * ⚠ 三陈语境下的“已满”＝ **该类型已装备的件数 ≥ 该类型栏位总数**，
 *   而不是“只剩一个栏位”（后者用 countEquipableSlot 判，含义不同）。
 *   例：武器栏 3 个、一件武器都没装备 → **未满**（本次不会再补栏）；
 *       武器栏 1 个、已装备 1 件武器   → **已满**（本次才会补一栏）。
 */
function sgzDuyuSlotFull(player, slot) {
    return sgzDuyuSlotUsed(player, slot) >= sgzDuyuSlotCapacity(player, slot);
}

/**
 * 三陈「获得装备牌」时的补栏时机：
 *   **仅当**该牌所涉及的栏位**已满**（已装备件数 ≥ 栏位总数）
 *   **且**该类型栏位还没到 `SGZ_DUYU_SLOT_MAX`（3）个时，
 *   才额外获得一个该类型的装备栏。达上限则什么也不做。
 *
 * 对应需求里的四个例子：
 *   1栏0装 → 未满，不补栏，只把牌拿到手；
 *   1栏1装 → 已满且 1<3，补一栏，再把牌拿到手；
 *   3栏0装 → 未满（0 < 3），不补栏；
 *   3栏3装 → 已满但 3 已达上限，不补栏。
 *
 * @returns {boolean} 是否真的补了一个装备栏
 */
async function sgzDuyuGainSlotBonus(player, card) {
    const slots = sgzDuyuCardSlots(card);
    // ⚠ 必须用「本次补栏之前的件数/栏数」判定：先补栏会让 slotFull 立刻变 false
    const fullSlots = slots.filter(slot => sgzDuyuSlotFull(player, slot));
    if (!fullSlots.length) {
        return false;
    }
    for (const slot of fullSlots) {
        if (sgzDuyuSlotCapacity(player, slot) >= SGZ_DUYU_SLOT_MAX) {
            continue;
        }
        await player.expandEquip(slot);
        game.log(player, "的", "#g" + get.translation(slot), "栏位已满，本次额外获得一个该类型的装备栏");
        return true;
    }
    return false;
}

/**
 * 在一堆候选牌名里挑出“本次会额外补栏”的那一档（供 AI 排序用，补栏＝白赚一个栏位）。
 * 补栏条件与 sgzDuyuGainSlotBonus 完全一致：涉及的栏位里有任意一个「已满且未达 3」。
 */
function sgzDuyuPickSlotBonus(player, names) {
    const bonus = names.filter(name =>
        sgzDuyuCardSlots(name).some(slot => sgzDuyuSlotFull(player, slot) && sgzDuyuSlotCapacity(player, slot) < SGZ_DUYU_SLOT_MAX)
    );
    return bonus.length ? bonus : names;
}

// AI 用：牌名的粗略价值（只用来决定"值不值得为它掉 1 点体力"）
function sgzDuyuCardScore(name) {
    let type = "";
    try {
        type = get.type(name);
    } catch (e) {
        return 0;
    }
    if (type == "basic") {
        return name == "tao" || name == "sha" ? 4 : 3;
    }
    if (type == "delay") {
        return 1;
    }
    return 2.5;
}

// 未记录的非装备牌名列表
function sgzDuyuUnrecorded(player) {
    const recorded = player.storage[SGZ_DUYU_RECORD_KEY] || [];
    return lib.inpile.filter(name => get.type(name) != "equip" && !recorded.includes(name));
}

// 已记录的全部牌名
function sgzDuyuRecorded(player) {
    return player.storage[SGZ_DUYU_RECORD_KEY] || [];
}

// 全部非装备牌名（用于判断“已记录所有非装备牌名”）
function sgzDuyuAllNonEquip() {
    return lib.inpile.filter(name => get.type(name) != "equip").unique();
}

// 生成一张「随机花色点数」的牌。
// 注意：不能直接用 game.createCard(name)——引擎里不传 suit/number 时会兜底成
// suit:"none" / number:0（见 game/index.js 的 createCard），并不是随机。
// 这里按引擎自己造牌的写法（game/index.js:6353）显式给随机花色与点数。
function sgzDuyuRandomCard(name) {
    // 若该牌本身限定了颜色（如部分锦囊/装备），则在对应颜色内随机
    const info = lib.card[name] || {};
    let suits = ["heart", "spade", "diamond", "club"];
    if (info.color == "red") {
        suits = ["heart", "diamond"];
    } else if (info.color == "black") {
        suits = ["club", "spade"];
    }
    const suit = suits[Math.floor(Math.random() * suits.length)];
    const number = Math.ceil(Math.random() * 13);
    return game.createCard(name, suit, number);
}

// 三陈用：武库里「你尚未装备」的指定类型装备牌名
// slot 为 "equip1"~"equip4"。
// 引擎定义（noname/get/is.js 的 attackingMount / defendingMount）：
//   equip1 武器 / equip2 防具 / equip3 防御坐骑 / equip4 进攻坐骑
// includeShenwu = true 时只取「神武」（本包搬运的 sw_ / mj_ 装备），否则只取普通装备。
function sgzDuyuEquipCandidates(player, slot, includeShenwu) {
    // 普通装备：名字来自 lib.inpile（牌堆里实际存在的牌）
    // 神武    ：名字来自 lib.card（本包搬运的卡牌定义），不依赖它是否已进牌堆/是否已载入牌堆列表，
    //           这样即便卡包注册晚了一步，三陈依然能拿到候选，不会“熄灭”。
    const source = includeShenwu
        ? Object.keys(lib.card || {}).filter(name => sgzDuyuIsShenwu(name))
        : (lib.inpile || []);
    return source.filter(name => {
        // 牌名可能在 lib.card 里不存在（未装载的卡包），直接跳过，避免 get.type 抛错
        if (!name || !lib.card || !lib.card[name]) {
            return false;
        }
        if (get.type(name) != "equip") {
            return false;
        }
        if (!(get.subtypes(name) || []).includes(slot)) {
            return false;
        }
        // 神武 / 普通装备 二选一
        if (!!includeShenwu !== sgzDuyuIsShenwu(name)) {
            return false;
        }
        // 排除自己已装备的同名牌
        return player.getCards("e").every(card => card.name != name);
    });
}

// 是否为「神武」（定义见本文件顶部 sgzDuyuIsShenwu）

// 三陈用：某装备栏上「你当前已装备」的牌名（仅用于选择框里展示"哪些被排除了"）
function sgzDuyuEquippedNames(player, slot) {
    return player
        .getCards("e")
        .filter(card => (get.subtypes(card) || []).includes(slot))
        .map(card => card.name)
        .unique();
}

export default {
    character: {
        // 梦杜预：晋势力，男性，3体力
        sgz_duyu: {
            sex: "male",
            group: "jin",
            hp: 3,
            maxHp: 3,
            hujia: 3,
            skills: [
                "sgz_wuku",
                "sgz_jianguo",
                "sgz_pozhu",
                "sgz_sanchen",
                "sgz_qingshi",
                // “陈令”标记的载体技能（武库产出）
                "sgz_chenling",
                // “破竹”标记的载体技能（破竹每回合产出、也只被破竹消耗）
                // 纯逻辑载体：不写 intro，所以不会在武将牌上显示成标记
                "sgz_pozhu_mark",
                // 破竹 · 竹节进度条（charlotte UI，纯表现层；实现见 effect/sgz_duyu.js）
                DMQC_DUYU_UI_SKILL,
            ],
            img: "extension/大梦千秋/image/sgz_duyu.jpg",
            dieAudios: ["ext:大梦千秋/audio/sgz_duyu/die.mp3"],
            names: "杜|预",
            groupInGuozhan: "jin",
            4: ["des:杜预，字元凯，京兆杜陵人也。博学多通，明于兴废之道，时人号曰“杜武库”，言其无所不有也。<br>预以羊祜之荐，拜镇南大将军，都督荆州诸军事。其治军也，缮甲兵、修武库、开渠灌田，军资充备；其料敌也，算无遗策，每有筹划，众莫能易。伐吴之役，预陈兵江陵，破竹而下，旬日之间，沅湘以南望风归命。<br>大梦之中，预纳天下兵械于武库，凡所览者皆识其形制、通其机杼，故用之无视远近、不计数目；更以三陈之法陈兵布阵，甲骑俱备，遂成倾势，终以灭吴之功，成一统之基。后世称其“以文治武，以谋制胜”，功成而身退，名垂竹帛。"],
        },
    },
    characterName: "sgz_duyu",
    characterTranslate: { sgz_duyu: "梦杜预" },
    characterTitle: { sgz_duyu: "武库破竹" },
    skills: {
        // ===================== 1. 武库（锁定技） =====================
        sgz_wuku: {
            audio: "ext:大梦千秋/audio/sgz_duyu:4",
            persevereSkill: true,
            forced: true,
            // 武库本身不显示标记（否则会多出一个空壳“陈令”）；
            // “陈令”的计数与显示都由 sgz_chenling 承担。
            trigger: {
                player: ["damageEnd", "phaseZhunbeiBegin"],
                source: "damageEnd",
            },
            filter(event, player) {
                if (event.name == "damage") {
                    return event.num > 0;
                }
                return true;
            },
            // 注意：这里必须用 async 风格（不能用 "step N"）
            //   引擎的 StepCompiler 会用隔离的 Function 构造器编译 step 写法，
            //   编译后的函数拿不到模块作用域，调用本文件的 helper 会 ReferenceError。
            //   async content 走 AsyncCompiler，保留闭包，可以参考本包 sgz_weiyan.js。
            async content(event, trigger, player) {
                const num = trigger.num || 1;
                game.log(player, "发动了【武库】");
                // ① 获得“陈令”标记
                player.addMark(SGZ_DUYU_MARK_SKILL, num);
                // ② 若倾势未觉醒，你摸等量张牌（不再从游戏外给未记录牌）
                //if (!player.storage.sgz_qingshi_awaken) {
                    await player.draw(num);
                //}
            },
        },

        // ===================== 2. 谏国 =====================
        sgz_jianguo: {
            audio: "ext:大梦千秋/audio/sgz_duyu:4",
            persevereSkill: true,
            mark: true,
            marktext: "武库",
            intro: {
                name: "武库名录",
                content: function (storage, player) {
                    const recorded = sgzDuyuRecorded(player);
                    const all_non_equip = sgzDuyuAllNonEquip();
                    let recorded_str = recorded.map(name => get.translation(name)).join("、") || "无";
                    const unrecorded_list = all_non_equip.filter(name => !recorded.includes(name));
                    let unrecorded_str = unrecorded_list.map(name => get.translation(name)).join("、");
                    if (!unrecorded_str) {
                        unrecorded_str = "全部记录完毕！";
                    }
                    return `已记录(${recorded.length}/${all_non_equip.length})：${recorded_str}<br><br>未记录：${unrecorded_str}`;
                },
            },
            trigger: { player: "phaseDrawBegin" },
            direct: true,
            filter: (event, player) => !event.numFixed && sgzDuyuUnrecorded(player).length > 0,
            // async 风格：原因同【武库】（step 写法拿不到模块作用域）
            async content(event, trigger, player) {
                const card_list = sgzDuyuUnrecorded(player);
                if (card_list.length == 0) {
                    game.log("没有可指定的牌名了！");
                    return;
                }
                // 可指定种数的上限 X = 你的体力值 + 1（同时不可能超过"还没记录的牌名数"）；
                // 代价是 X-1 点体力，所以只指定 1 种时完全不掉血。
                const maxPick = Math.min(player.getHp() + 1, card_list.length);
                if (maxPick < 1) {
                    game.log(player, "体力不足，无法发动【谏国】");
                    return;
                }
                const bool = await player
                    .chooseBool(
                        get.prompt("sgz_jianguo"),
                        `是否发动【谏国】，指定1~${maxPick}种牌名来代替摸牌？（最多失去${Math.max(0, maxPick - 1)}点体力）`
                    )
                    // AI：至少要有 3 点体力才愿意割（最多付 2 点，还留得住命）
                    .set("ai", () => player.getHp() >= 3)
                    .forResultBool();
                if (!bool) {
                    return;
                }
                player.logSkill("sgz_jianguo");
                trigger.changeToZero();

                let chosen = null;

                // 专属「武库名录」竹简选择框（带壮誓式体力推演）：仅本地人类玩家；
                // AI / 联机 / 托管 / 录像回放回退引擎默认 chooseButton。
                if (player.isMine() && !game.online && !_status.auto && !_status.video) {
                    let r = null;
                    try {
                        r = await dmqcBuildJianguoDialog(player, {
                            names: card_list,
                            max: maxPick,
                            hp: player.getHp(),
                            recorded: sgzDuyuRecorded(player).length,
                            total: sgzDuyuAllNonEquip().length,
                        });
                    } catch (e) {
                        console.error("[大梦千秋] 谏国选择框构造失败，回退引擎默认框：", e);
                        r = null;
                    }
                    // r 为 null → 框没建起来，交给引擎默认框；
                    // r.bool 为 false（点了取消）等价于本次不指定。
                    if (r) {
                        if (!r.bool || !r.links || !r.links.length) {
                            return;
                        }
                        chosen = r.links.slice(0);
                    }
                }

                if (!chosen) {
                    // 引擎默认框：可选 1~maxPick 种
                    // AI：取最划算的 1~3 种（按体力决定取几种），其余牌给负分不选
                    const want = Math.max(1, Math.min(maxPick, player.getHp() >= 4 ? 3 : player.getHp() >= 2 ? 2 : 1));
                    const tops = card_list
                        .slice(0)
                        .sort((a, b) => sgzDuyuCardScore(b) - sgzDuyuCardScore(a))
                        .slice(0, want);
                    const { bool: chose, links } = await player
                        .chooseButton([`谏国：请指定1~${maxPick}种不同的牌名`, [card_list, "vcard"]], [1, maxPick], true)
                        .set("ai", button => {
                            const name = Array.isArray(button.link) ? button.link[2] : button.link;
                            return tops.includes(name) ? 5 : -1;
                        })
                        .forResult();
                    if (!chose || !links || !links.length) {
                        return;
                    }
                    // 引擎 vcard 的 link 形如 ["", "", 牌名]（见 ui.create.buttonPresets.vcard）；
                    // 特效框返回的是纯牌名，这里一并兼容。
                    chosen = links.map(link => (Array.isArray(link) ? link[2] : link));
                }

                // 指定几种就获得几张（花色点数随机），然后失去 X-1 点体力
                const card_names = chosen.filter(Boolean).unique().slice(0, maxPick);
                if (card_names.length == 0) {
                    return;
                }
                const cards_to_gain = card_names.map(name => sgzDuyuRandomCard(name));
                await player.gain(cards_to_gain, "gain2");
                // 代价：指定种数 - 1（只指定 1 种时不掉血；付满会把自己送进濒死，故选择框里会标"濒危"）
                const cost = Math.max(0, card_names.length - 1);
                if (cost > 0) {
                    await player.loseHp(cost);
                }
            },
        },

        // ===================== 3. 破竹（锁定技） =====================
        // ① 使用武库已记录牌名的牌：无次数和距离限制
        // ② 每名角色的回合开始时，你获得体力值个“破竹”标记；
        //    每名角色的回合结束时，移除你的所有“破竹”标记；
        //    成为武库已记录牌名或装备牌的牌的目标时，消耗1个“破竹”，
        //    然后已受伤回复1点体力 / 未受伤摸一张牌
        sgz_pozhu: {
            persevereSkill: true,
            audio: "ext:大梦千秋/audio/sgz_duyu:4",
            group: ["sgz_pozhu_mod", "sgz_pozhu_effect", "sgz_pozhu_mark"],
            subSkill: {
                // ① 使用武库已记录牌名的牌：无次数和距离限制
                mod: {
                    mod: {
                        cardUsable: function (card, player) {
                            if (sgzDuyuRecorded(player).includes(card.name)) {
                                return Infinity;
                            }
                        },
                        targetInRange: function (card, player) {
                            if (sgzDuyuRecorded(player).includes(card.name)) {
                                return true;
                            }
                        },
                    },
                },
                // ②-1 每名角色的回合开始时获得体力值个“破竹”标记，每名角色的回合结束时清空所有“破竹”标记
                mark: {
                    // ⚠ 这里刻意**不写 intro**：引擎判断要不要在武将牌上生成标记节点的是
                    //   `updateMark` 里的 `lib.skill[i].intro`（player.js:4328），
                    //   跟技能上的 `mark` 字段无关 —— 只写 `mark: false` 是**没有用的**，
                    //   只要 `storage.sgz_pozhu_mark` 还有数，标记节点就会被建出来并显示在卡面上。
                    //   去掉 `intro` 后 `markSkill` 会在 player.js:9302 提前 return，不建节点，
                    //   而计数照旧走 `player.storage` + `countMark`，规则结算完全不受影响。
                    // ⚠ 必须挂 global：破竹要认领「任意角色的回合开始 / 回合结束」。
                    //   player 角色只认领“自己回合”的 phaseBegin，挂 player 时别人回合不给杜预补标记。
                    // ⚠ phaseBegin / phaseAfter 传入 content 的 trigger 都是同一个 phase 事件
                    //   （trigger.name 恒为 "phase"），必须用 event.triggername 区分两个时机。
                    trigger: { global: ["phaseBegin", "phaseAfter"] },
                    forced: true,
                    silent: true,
                    popup: false,
                    async content(event, trigger, player) {
                        if (event.triggername == "phaseBegin") {
                            // 任意角色的回合开始：记下杜预此时的体力值（= 进度条分母），并获得体力值个“破竹”
                            const num = Math.max(0, player.getHp());
                            player.storage[DMQC_DUYU_TURN_HP_KEY] = num;
                            if (num > 0) {
                                player.addMark(SGZ_DUYU_POZHU_MARK, num, false);
                                game.log(player, "获得了", get.cnNumber(num), "个", "#g【破竹】");
                            }
                            // 竹节进度条：分母刚更新，重画
                            dmqcRefreshPozhuGauge(player);
                        } else {
                            // 任意角色的回合结束：清空所有“破竹”
                            const lost = player.countMark(SGZ_DUYU_POZHU_MARK);
                            if (lost > 0) {
                                player.clearMark(SGZ_DUYU_POZHU_MARK, false);
                                game.log(player, "移去了", get.cnNumber(lost), "个", "#g【破竹】");
                            }
                            dmqcRefreshPozhuGauge(player);
                        }
                    },
                },
                // ②-2 成为武库已记录牌名或装备牌的牌的目标时：消耗1个“破竹”并回复/摸牌
                // 注意：只消耗【破竹】自己产出的“破竹”标记，不动武库产出的“陈令”
                effect: {
                    trigger: { target: "useCardToTargeted" },
                    forced: true,
                    filter: function (event, player) {
                        // 必须有“破竹”标记可消耗
                        if (player.countMark(SGZ_DUYU_POZHU_MARK) <= 0) {
                            return false;
                        }
                        return sgzDuyuRecorded(player).includes(event.card.name) || get.type(event.card) == "equip";
                    },
                    // async 风格：step 写法拿不到模块作用域（sgzDuyuRecorded 会 ReferenceError）
                    async content(event, trigger, player) {
                        player.logSkill("sgz_pozhu");
                        // 消耗一个“破竹”标记（该标记不显示在武将牌上，所以这里自己写日志）
                        player.removeMark(SGZ_DUYU_POZHU_MARK, 1, false);
                        game.log(player, "移去了", get.cnNumber(1), "个", "#g【破竹】");
                        // 竹节进度条：分子变了，立刻崩掉一节
                        dmqcRefreshPozhuGauge(player);
                        if (player.isDamaged()) {
                            await player.recover();
                        } else {
                            await player.draw();
                        }
                    },
                },
            },
        },

        // ===================== “陈令”标记的载体技能 =====================
        // 计数就存在这个技能名下（player.storage["sgz_chenling"]）。
        // 展示信息写在 intro 里（标记这种东西不写进 skillTranslate）。
        // 与【破竹】自己每回合产出、也只被破竹消耗的“破竹”标记（sgz_pozhu_mark）是两套独立计数。
        sgz_chenling: {
            charlotte: true,
            mark: true,
            marktext: "陈令",
            intro: {
                name: "陈令",
                // 用 intro.markcount = "mark" 让计数取 storage 本身的数值并显示出来
                markcount: "mark",
            },
        },

        // ===================== 4. 三陈（★大改） =====================
        // 分两级（1级＝未觉醒，2级＝倾势·任一分支觉醒后升级）：
        //   1级：移除3个“陈令”，选择一种装备栏类型，随机**获得**一张你未装备的该类型装备牌
        //        （随机花色点数，进手牌，**不直接装备**）。
        //   2级：移除3个“陈令”，自选一件你未装备的「神武」，同样进手牌。
        // 两级的共同点 —— **获得该牌时**若「对应的那个装备栏已满」，
        //   则额外获得一个该类型的装备栏（每种装备栏数量至多为3）。
        //   ⚠ 这里的“已满”＝该类型**已装备件数 ≥ 该类型栏位总数**，且只有未达 3 个栏位时才补：
        //     1栏0装 → 不补；1栏1装 → 补；3栏0装 → 不补；3栏3装 → 不补（已到上限）。
        sgz_sanchen: {
            audio: "ext:大梦千秋/audio/sgz_duyu:4",
            persevereSkill: true,
            enable: "phaseUse",
            // 出牌阶段不限次数（每次消耗3个“陈令”标记，由 filter 兜底）
            ai: { expose: 1, order: 9 },
            filter(event, player) {
                // 需要至少3个“陈令”标记，且武库里至少还有一种「你未装备的装备牌」
                if (player.countMark(SGZ_DUYU_MARK_SKILL) < DMQC_SANCHEN_COST) {
                    return false;
                }
                // 2级（倾势·成功 / 倾势·失败 任一分支觉醒后）：候选改为「神武」，由玩家自选具体一件
                const shenwu = sgzDuyuSanchenLv2(player);
                return DMQC_DUYU_SLOTS.some(slot => sgzDuyuEquipCandidates(player, slot, shenwu).length > 0);
            },
            async content(event, trigger, player) {
                // 三陈等级：1级＝普通装备（随机）／2级＝神武（自选）。
                // 倾势·成功与倾势·失败都会升到 2 级，效果相同，只有选择框皮肤按分支区分。
                const shenwu = sgzDuyuSanchenLv2(player);
                const cost = DMQC_SANCHEN_COST;
                // 四种装备栏类型；只保留「武库里还有你未装备的该类装备牌」的选项，
                // 没有可装备牌的品种直接不出现（例如防具牌全装齐了就不显示“防具”）
                const allSlots = DMQC_DUYU_SLOTS;
                const slotName = {
                    equip1: DMQC_DUYU_SLOT_META.equip1.name,
                    equip2: DMQC_DUYU_SLOT_META.equip2.name,
                    equip3: DMQC_DUYU_SLOT_META.equip3.name,
                    equip4: DMQC_DUYU_SLOT_META.equip4.name,
                };
                const avail = [];
                const candidateMap = {};
                const equippedMap = {};
                const fullMap = {};
                for (const slot of allSlots) {
                    const candidates = sgzDuyuEquipCandidates(player, slot, shenwu);
                    // 该栏当前已装备的牌名（仅用于专属选择框里展示"这些已被排除"）
                    equippedMap[slot] = sgzDuyuEquippedNames(player, slot);
                    // 该栏此刻是否已满（＝已装备件数 ≥ 栏位总数）；满且未达 3 个栏位时
                    // 本次发动会额外获得一个该类型装备栏，选择框里标出来
                    fullMap[slot] = sgzDuyuSlotFull(player, slot);
                    if (candidates.length > 0) {
                        // avail 直接交给特效层：candidates 即"还能获得的装备牌名"，
                        // 选择框会把它们**全数**列在对应卡片内
                        avail.push({ slot, name: slotName[slot], candidates, full: fullMap[slot] });
                        candidateMap[slot] = candidates;
                    }
                }
                if (!avail.length) {
                    game.log(player, "的武库中没有可装备的装备牌");
                    return;
                }

                // 只有一个可选项时直接采用，不弹选择框
                let slot;
                // 2级（神武）下由玩家**自选**的那件神兵牌名（1级为 null，走随机）
                let pickName = null;
                if (avail.length == 1 && !shenwu) {
                    // 1级：只有一类可选 → 直接采用该栏位（随机获得其中一张）
                    slot = avail[0].slot;
                } else if (avail.reduce((n, o) => n + o.candidates.length, 0) == 1) {
                    // 库里只剩一件可选（神武或普通装备同理）→ 直接采用它
                    slot = avail[0].slot;
                    pickName = avail[0].candidates[0];
                } else {
                    const list = avail.map(o => o.name);
                    let control = null;

                    // 专属「武库开阖 / 神兵出世」主题选择框：仅本地人类玩家；
                    // AI / 联机 / 托管 / 录像回放回退引擎默认框。
                    // 形态按倾势分支区分（配色/底板/徽记/头像/文案全换）：
                    //   base 未觉醒(1级) / success 倾势·成功(2级) / fail 倾势·失败(2级)
                    if (player.isMine() && !game.online && !_status.auto && !_status.video) {
                        const capacity = {};
                        for (const s of allSlots) {
                            capacity[s] = sgzDuyuSlotCapacity(player, s);
                        }
                        let r = null;
                        try {
                            r = await dmqcBuildSanchenDialog(player, {
                                avail,
                                marks: player.countMark(SGZ_DUYU_MARK_SKILL),
                                cost,
                                equipped: equippedMap,
                                form: player.storage[SGZ_DUYU_QINGSHI_FAIL_KEY]
                                    ? "fail"
                                    : player.storage.sgz_qingshi_awaken
                                      ? "success"
                                      : "base",
                                shenwu,
                                capacity,
                                slotMax: SGZ_DUYU_SLOT_MAX,
                            });
                        } catch (e) {
                            console.error("[大梦千秋] 三陈选择框构造失败，回退引擎默认框：", e);
                            r = null;
                        }
                        // r 为 null → 框没建起来，交给引擎默认框；
                        // r.bool 为 false（点了取消）等价于本次不发动。
                        if (r) {
                            if (!r.bool || !r.links || !r.links.length) {
                                return;
                            }
                            const picked = DMQC_DUYU_SLOT_META[r.links[0]];
                            control = picked ? picked.name : null;
                            // 神武形态会额外带回具体牌名（links[1]）
                            if (shenwu && r.links[1]) {
                                pickName = r.links[1];
                            }
                        }
                    }

                    if (control == null && shenwu) {
                        // 引擎默认框（2级·神武）：直接列出所有可选神武，让 AI 等自己挑一件
                        const flat = avail.reduce((arr, o) => arr.concat(o.candidates), []);
                        const res = await player
                            .chooseButton([`【${get.translation("sgz_sanchen")}】请选择要获得的神武`, [flat, "vcard"]], 1, true)
                            .set("ai", button => {
                                const nm = Array.isArray(button.link) ? button.link[2] : button.link;
                                // 优先挑“本次会额外补栏”的神武（白赚一个栏位），再按牌名价值
                                const bonusNames = sgzDuyuPickSlotBonus(player, flat);
                                return (bonusNames.includes(nm) ? 10 : 0) + sgzDuyuCardScore(nm) + Math.random();
                            })
                            .forResult();
                        if (!res || !res.bool || !res.links || !res.links.length) {
                            return;
                        }
                        const nm = Array.isArray(res.links[0]) ? res.links[0][2] : res.links[0];
                        const owner = avail.find(o => o.candidates.includes(nm));
                        if (!owner) {
                            return;
                        }
                        slot = owner.slot;
                        pickName = nm;
                    } else {
                        if (control == null) {
                            control = await player
                                .chooseControl(list)
                                .set("prompt", `【${get.translation("sgz_sanchen")}】请选择要获得哪一类装备栏的装备牌`)
                                .set("displayIndex", false)
                                .set("ai", () => {
                                    // AI：候选牌越多越优先；另外该栏“已满且未达 3 栏”时
                                    // 本次会白赚一个额外装备栏，给一点加成。
                                    let best = avail[0].slot,
                                        bestNum = -1;
                                    for (const o of avail) {
                                        const bonus =
                                            o.full && sgzDuyuSlotCapacity(player, o.slot) < SGZ_DUYU_SLOT_MAX ? 3 : 0;
                                        const n = candidateMap[o.slot].length + bonus;
                                        if (n > bestNum) {
                                            bestNum = n;
                                            best = o.slot;
                                        }
                                    }
                                    return slotName[best];
                                })
                                .forResultControl();
                        }
                        slot = (avail.find(o => o.name === control) || {}).slot;
                        if (!slot) {
                            return;
                        }
                    }
                }

                // 1. 移除“陈令”标记（两个等级同为 3 枚）
                player.removeMark(SGZ_DUYU_MARK_SKILL, cost);

                // 2. 定下这次要**获得**的牌名：
                //    2级（神武）＝玩家自选的那件；1级＝该栏位候选里随机取（花色点数随机）
                const chosenName =
                    shenwu && pickName && candidateMap[slot].includes(pickName)
                        ? pickName
                        : candidateMap[slot].randomGet();
                const card = sgzDuyuRandomCard(chosenName);

                // 3. 补栏时机：只有在「获得这张牌时该类型栏位已满」且该类型还没到 3 个栏位时，
                //    才额外获得一个该类型的装备栏（不满足就什么也不做）。
                const expanded = await sgzDuyuGainSlotBonus(player, card);

                // 4. **获得**该牌（进手牌，不直接装备）
                await player.gain(card, "gain2");
                game.log(
                    player,
                    "发动【三陈】：",
                    shenwu ? "自选获得一张神武" : "随机获得一张装备牌",
                    get.translation(card.name),
                    expanded ? "（栏位已满，额外获得一个该类型装备栏）" : ""
                );
            },
        },

        // ===================== 5. 倾势（觉醒技·双分支） =====================
        // 两个觉醒分支，满足其一即觉醒（觉醒后另一分支自然失效）：
        //   分支1（记录满）：当你已记录所有非装备牌名时觉醒，获得【灭吴】
        //   分支2（濒死）  ：当你进入濒死状态时觉醒，回复体力至体力上限，
        //                    然后移除武库的所有记录并获得等量“陈令”标记，
        //                    此后武库不再记录（“武库”名录标记消失）
        sgz_qingshi: {
            audio: "ext:大梦千秋/audio/sgz_duyu:4",
            persevereSkill: true,
            awakenSkill: true,
            skillAnimation: true,
            animationColor: "gold",
            derivation: "sgz_miewu",
            init(player) {
                if (!Array.isArray(player.storage[SGZ_DUYU_RECORD_KEY])) {
                    player.storage[SGZ_DUYU_RECORD_KEY] = [];
                }
            },
            trigger: { player: ["gainAfter", "dying"] },
            forced: true,
            silent: true,
            filter(event, player) {
                if (player.storage.sgz_qingshi_awaken) {
                    return false;
                }
                if (event.name == "dying") {
                    // 分支2：进入濒死即可（体力恢复到上限、清空记录，由 content 处理）
                    return true;
                }
                // 分支1：必须确实有新的可记录牌名
                return event.cards.some(card => get.type(card) != "equip" && !sgzDuyuRecorded(player).includes(card.name));
            },
            // async 风格：原因同【武库】（step 写法拿不到模块作用域）
            async content(event, trigger, player) {
                // ---------- 分支2：濒死觉醒 ----------
                if (trigger.name == "dying") {
                    game.playAudio(`../extension/大梦千秋/audio/sgz_duyu/sgz_qingshi${[1,2].randomGet()}.mp3`);
                    player.awakenSkill("sgz_qingshi");
                    player.node.avatar.setBackgroundImage('extension/大梦千秋/image/sgz_duyu3.png');
                    player.$skill('倾势·失败', 'fire', 'red', 'avatar');
                    player.storage.sgz_qingshi_awaken = true;
                    // 1. 回复体力至体力上限
                    await player.gainMaxHp(3);
                    if (player.hp < player.maxHp) {
                        await player.recover(player.maxHp - player.hp);
                    }
                    // 2. 移除武库的所有记录，并获得等量“陈令”标记
                    const recorded = sgzDuyuRecorded(player).slice(0);
                    player.storage[SGZ_DUYU_RECORD_KEY] = [];
                    if (recorded.length > 0) {
                        player.addMark(SGZ_DUYU_MARK_SKILL, recorded.length);
                    }
                    // 3. 标记「倾势走的是失败分支」：选择框主题按分支换皮（幽紫冷银）；
                    //    三陈 2 级在两条分支下效果完全相同，判定见 sgzDuyuSanchenLv2
                    player.storage[SGZ_DUYU_QINGSHI_FAIL_KEY] = true;
                    // 4. ⚠ 失败分支**不调整装备栏数量**（原先这里会把 equip1~5 全部拉满到 3）。
                    //    各栏位一律维持原样，需要额外栏位时由【三陈】按「栏位已满且未达 3」的规则去补；
                    //    因此也不需要再调用装备栏的 markSkill / 同步显示接口。
                    // 5. 此后武库不再记录：名录标记消失、名录内容清空
                    player.storage.sgz_duyu_norecord = true;
                    if (typeof player.unmarkSkill == "function") {
                        player.unmarkSkill("sgz_jianguo");
                    }
                    player.updateMark("sgz_jianguo");

                    game.log(player, "觉醒：回复体力至上限，武库记录尽数化为", "#g陈令", "，失去技能", "#g【谏国】", "，此后不再记录");
                    return;
                }

                // ---------- 分支1：记录满觉醒 ----------
                const new_cards = trigger.cards.map(card => card.name).unique();
                let changed = false;
                for (const name of new_cards) {
                    if (get.type(name) != "equip" && !sgzDuyuRecorded(player).includes(name)) {
                        player.storage[SGZ_DUYU_RECORD_KEY].push(name);
                        changed = true;
                    }
                }
                if (changed) {
                    game.log(player, "的【倾势】将新的牌名记录入武库");
                    player.updateMark("sgz_jianguo");

                    const all_non_equip = sgzDuyuAllNonEquip();
                    if (sgzDuyuRecorded(player).length >= all_non_equip.length) {
                        await player.gainMaxHp(3);
                        if (player.hp < player.maxHp) {
                            await player.recover(player.maxHp - player.hp);
                        }
                        game.playAudio(`../extension/大梦千秋/audio/sgz_duyu/sgz_qingshi${[3,4].randomGet()}.mp3`);
                        player.awakenSkill("sgz_qingshi");
                        player.node.avatar.setBackgroundImage('extension/大梦千秋/image/sgz_duyu2.jpg');
                        player.$skill('倾势·成功', 'fire', 'red', 'avatar');
                        player.storage.sgz_qingshi_awaken = true;
                        // 倾势·成功同样升级【三陈】：两条觉醒分支的三陈 2 级效果相同
                        player.addSkill("sgz_miewu");
                        player.removeSkills("sgz_jianguo");
                        game.log(player, "觉醒，获得技能", "#g【灭吴】", "，【三陈】升级");
                    }
                }
            },
        },

        // ===================== 衍生技：灭吴 =====================
        sgz_miewu: {
            audio: "ext:大梦千秋/audio/sgz_duyu:2",
            persevereSkill: true,
            enable: "phaseUse",
            usable: 1,
            skillAnimation: true,
            animationColor: "gold",
            filterTarget: (card, player, target) => target != player,
            filter(event, player) {
                return game.hasPlayer(current => current != player);
            },
            async content(event, trigger, player) {
                const target = event.targets[0];
                game.log(player, "对", target, "发动了【灭吴】");
                const cards = target.getCards("hej");
                target.die(player);
                if (cards.length > 0) {
                    await player.gain(cards, target, "gain2");
                }
            },
            ai: {
                // 注意：原本这里与上面另写了一个 ai 字段，后者会整体覆盖前者（expose 被吃掉），
                // 故合并为一份。
                expose: 1,
                order: 1000,
                result: {
                    target: function (player, target) {
                        if (get.attitude(player, target) >= 0) {
                            return 0;
                        }
                        return -get.threaten(target) - 2;
                    },
                },
            },
        },

        // ===================== 6. 破竹 · 竹节进度条（纯表现层） =====================
        // charlotte UI：把「破竹标记数 / 回合开始时体力数」常驻画在武将牌右侧，
        // 实现见 effect/sgz_duyu.js 的 pozhuGaugeUI。不参与任何规则结算。
        // 用计算属性名与 effect 层导出的 DMQC_DUYU_UI_SKILL 绑定，避免两处字符串漂移。
        [DMQC_DUYU_UI_SKILL]: pozhuGaugeUI,
    },
    skillTranslate: {
        sgz_wuku: "武库",
        sgz_wuku_info: "锁定技，每当你受到或造成的伤害结算后/你的准备阶段时，你获得等量/一个“陈令”标记，然后你摸等量/一张牌。",
        sgz_jianguo: "谏国",
        sgz_jianguo_info: "摸牌阶段，你可改为指定X+1种<span style='color:#CC00FF;'>武库</span>未记录的非装备牌获得之（X不超过你的体力值），然后你失去X点体力值。",
        sgz_pozhu: "破竹",
        sgz_pozhu_info: "锁定技，①你使用<span style='color:#CC00FF;'>武库</span>已记录牌名的牌无次数距离限制。②，每回合限X次（X为你回合开始时的体力值），当你成为<span style='color:#CC00FF;'>武库</span>已记录牌名的牌或装备牌的目标时，若你已受伤/未受伤，你回复一点体力/摸一张牌。",
        sgz_sanchen: "三陈",
        sgz_sanchen_info: "你可以移除3个“陈令”标记，然后：<br>1级：你选择一种装备栏，随机获得一张你未装备的该类型装备牌。<br>2级：你选择一件你未装备的<span style='color:#FF0000;'>神武</span>获得之。<br>当你依次法获得装备牌时，若对应类型装备栏已满，则你获得一个该类型的额外装备栏（每种装备栏数量至多为3）。",
        sgz_qingshi: "倾势",
        sgz_qingshi_info: "使命技，①当你获得未记录的非装备牌后，<span style='color:#CC00FF;'>武库</span>记录其牌名；<br>②成功：当<span style='color:#CC00FF;'>武库</span>记录所有非装备牌名时：你获得【灭吴】，失去【谏国】。<br>③失败：当你进入濒死状态时：删除<span style='color:#CC00FF;'>武库</span>的所有记录并获得等量“陈令”标记。<br>④觉醒：你增加3点体力上限并回满体力，升级【三陈】。",
        sgz_miewu: "灭吴",
        sgz_miewu_info: "出牌阶段限一次，你可以指定一名其他角色，令其立即死亡，然后你获得其区域内所有牌。",
        // 标记载体技能（charlotte，不在技能栏显示为可点技能）
    },
    characterTaici: {
        sgz_wuku: { order: 1, content: "积以跬步，故可承其之远。/汇以小流，方成江海之深。/人非生而知之，但敏而求之也。/广习经籍，只为上能弼国，下可安民。" },
        sgz_jianguo: { order: 2, content: "若此役得胜，则可开太平之基也。/所过城邑，贼将莫不束手。/天下思定已久，陛下当成四海之愿。/今便可荡平吴都，陛下何舍而不取？" },
        sgz_pozhu: { order: 3, content: "千计万策，随江即来也。/万结之绳，不过一剑即解。/以计代战，一可当万。/敌军势颓，迎刃即解，无复着手处也。" },
        sgz_sanchen: { order: 4, content: "启请大局讨贼寇，三陈奉诏始伐吴。/出于要害之地，以夺贼众之心。/高岸为谷，深谷为陵。/农事建造，无所不通。" },
        sgz_qingshi: { order: 5, content: "吾知而有涯，然学而无涯。/其浩若海，吾尚不及一二。/吴贼倡乱非为坐视，窃国害民必受后诛。/天下速定，幸无须我全力而为。" },
        sgz_miewu: { order: 6, content: "九州从来向一统，岂容伪朝至两分？/驭虬吞江为平地，剑指东南定吴夷！" },
        die: { content: "未能知生，安能知死乎..." },
    },
};
