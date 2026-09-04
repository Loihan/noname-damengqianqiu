// ===== 鹤羽星尊 · 卡牌特效（纯表现层，无游戏规则） =====
// 由 character/wgxd_heyuxingzun.js 通过 import { heyuxingzunUI } 挂载回 skills 中
export const heyuxingzunUI = {
    charlotte: true,
    silent: true,
    trigger: { 
        player: ["gainAfter", "loseAfter", "enterGame", "equipAfter"], // 增加装备后触发
        global: ["phaseBefore", "phaseBeginStart", "gameStart"] 
    },
    forced: true,
    priority: -10,
    init: function(player) {
        // 1. 注入星辰剑气 CSS (保持不变)
        if (!document.getElementById('heyuxingzun_sword_style')) {
            var style = document.createElement('style');
            style.id = 'heyuxingzun_sword_style';
            style.innerHTML = `
                .sword-card-active {  }
                .sword-card-active::before {
                    content: ""; position: absolute; top: -6px; left: -6px; right: -6px; bottom: -6px;
                    background: linear-gradient(45deg, rgba(135, 206, 250, 0.99) 0%, rgb(86, 116, 238) 50%, rgba(70, 176, 243, 0.99) 100%);
                    background-size: 200% 200%; filter: blur(4px); z-index: -1; border-radius: 8px;
                    animation: sword-sweep 3s infinite linear; mix-blend-mode: screen;
                }
                .sword-card-active::after {
                    content: ""; position: absolute; top: -2px; left: -2px; right: -2px; bottom: -2px;
                    border: 1.5px solid rgba(45, 86, 250, 0.7); border-radius: 4px; z-index: 5;
                    box-shadow: 0 0 10px #1f4878, 0 0 20px #87cefa, inset 0 0 10px rgba(29, 137, 205, 0.5);
                    pointer-events: none; animation: sword-glow 2s infinite alternate ease-in-out;
                }
                @keyframes sword-sweep { 0% { background-position: -100% -100%; opacity: 0.3; } 50% { opacity: 0.8; } 100% { background-position: 100% 100%; opacity: 0.3; } }
                @keyframes sword-glow { from { box-shadow: 0 0 5px #6c6c6c, 0 0 10px #4e5eef; filter: brightness(1); } to { box-shadow: 0 0 15px #fff, 0 0 30px #00bfff; filter: brightness(1.3); } }
               `;
            document.head.appendChild(style);
        }
    },
    content: function() {
        // 核心逻辑：扫描手牌区和装备区的所有牌
        // 虽然我们只想让手牌亮，但必须扫描装备区才能在牌装上时执行“移除”
        var allCards = player.getCards('he'); 
        for (var i = 0; i < allCards.length; i++) {
            var card = allCards[i];
            
            // 判定条件：1.必须在手牌区 'h' 2.必须带有“剑”标签
            if (get.position(card) == 'h' && card.gaintag && card.gaintag.contains('wgxd_qixia_jian')) {
                card.classList.add('sword-card-active');
            } else {
                // 如果这张牌进入了装备区 'e'，或者标签消失了，立即移除 CSS 类名
                card.classList.remove('sword-card-active');
            }
        }
    }
};