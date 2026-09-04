// ===== 黄月英·卡牌终结特效（纯表现层，无游戏规则） =====
// 由 character/sgz_huangyueying.js 通过 import { huangyueyingUI } 挂载回 skills 中
export const huangyueyingUI = {
    charlotte: true,
    silent: true,
    trigger: { 
        player: ["gainAfter", "loseAfter", "enterGame", "equipAfter"], 
        global: ["phaseBefore", "phaseBeginStart", "gameStart"] 
    },
    forced: true,
    priority: -10,
    init: function(player) {
        if (!document.getElementById('huangyueying_card_final_style')) {
            var style = document.createElement('style');
            style.id = 'huangyueying_card_final_style';
            style.innerHTML = `
                /* 梦闪：极醒目琥珀金重描边 (无动态) */
                .dream-jink-active {
                    /* 利用多个阴影叠加出极其厚实的边缘光效 */
                    box-shadow: 
                        0 0 0 3px #FFD700,      /* 第一层实色边框 */
                        0 0 10px #FFA500,     /* 第二层外发光 */
                        0 0 20px rgba(255, 165, 0, 0.8), 
                        inset 0 0 12px rgba(255, 215, 0, 0.5) !important; /* 内发光 */
                    border-radius: 4px;
                }

                /* 梦闪专用：在卡牌中心增加一个淡淡的金色十字星（可选，增加辨识度） */
                .dream-jink-active::before {
                    content: "✧";
                    position: absolute;
                    top: 2px; right: 5px;
                    color: #FFD700;
                    font-size: 18px;
                    text-shadow: 0 0 5px #fff;
                }
            `;
            document.head.appendChild(style);
        }
    },
    content: function() {
        // 扫描所有相关区域
        var allOwnedCards = player.getCards('he');
        for (var i = 0; i < allOwnedCards.length; i++) {
            var card = allOwnedCards[i];
            var isInHand = (get.position(card) == 'h');
            
            // 只有在手牌区时才添加类名
            if (isInHand && card.gaintag && card.gaintag.contains('sgz_xuanhe_shan')) {
                card.classList.add('dream-jink-active');
                card.classList.remove('trick-reward-active');
            } 
            else {
                // 离开手牌（装上或弃置）或标签消失，立即清除
                card.classList.remove('trick-reward-active');
                card.classList.remove('dream-jink-active');
            }
        }
    }
};