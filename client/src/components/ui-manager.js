/**
 * 游戏UI组件管理器
 * 用于在现有Electron游戏中集成Vue3组件
 * 
 * 使用方法:
 * 1. 在index.html中引入此脚本
 * 2. 调用 UIComponents.showPanel('pvp') 或 UIComponents.showPanel('master') 等
 */

const UIComponents = (function() {
  let vueApp = null;
  let currentPanel = null;
  const panels = {};

  /**
   * 初始化Vue应用
   */
  function initVue() {
    if (vueApp) return;
    
    // 动态加载Vue3 (需要先在HTML中添加Vue CDN)
    if (typeof Vue === 'undefined') {
      console.warn('Vue未加载，请先在HTML中添加Vue3 CDN');
      return;
    }

    const { createApp, ref, reactive } = Vue;
    
    // 创建根组件
    const App = {
      template: `
        <div class="game-ui-overlay" v-if="currentPanel" @click.self="closePanel">
          <div class="game-ui-container">
            <component 
              :is="currentPanel" 
              v-bind="panelProps"
              @close="closePanel"
            />
          </div>
        </div>
      `,
      components: {
        // 组件将在注册时动态添加
      },
      setup() {
        const currentPanel = ref(null);
        const panelProps = ref({});

        const showPanel = (name, props = {}) => {
          currentPanel.value = name;
          panelProps.value = props;
        };

        const closePanel = () => {
          currentPanel.value = null;
          panelProps.value = {};
        };

        // 暴露方法给外部
        window.__UIComponents = {
          showPanel,
          closePanel
        };

        return { currentPanel, panelProps, closePanel };
      }
    };

    vueApp = createApp(App);
  }

  /**
   * 注册Vue组件
   */
  function registerComponent(name, component) {
    if (!vueApp) {
      initVue();
    }
    if (vueApp && component) {
      vueApp.component(name, component);
      panels[name] = component;
    }
  }

  /**
   * 显示面板
   */
  function showPanel(name, props = {}) {
    if (!vueApp) {
      initVue();
    }
    
    // 尝试动态导入组件
    const componentPath = `./components/${name}.vue`;
    
    // 如果组件已注册，直接显示
    if (panels[name]) {
      if (window.__UIComponents) {
        window.__UIComponents.showPanel(name, props);
      }
      return;
    }

    console.warn(`组件 ${name} 未注册，请先调用 registerComponent()`);
  }

  /**
   * 关闭面板
   */
  function closePanel() {
    if (window.__UIComponents) {
      window.__UIComponents.closePanel();
    }
  }

  /**
   * 显示PVP面板
   */
  function showPVP(playerData = {}) {
    showPanel('PVPPanel', { player: playerData });
  }

  /**
   * 显示师徒面板
   */
  function showMaster(playerData = {}) {
    showPanel('MasterPanel', { player: playerData });
  }

  /**
   * 显示充值面板
   */
  function showPayment(playerId = '') {
    showPanel('PaymentPanel', { playerId: playerId });
  }

  /**
   * 显示背包面板（带整理和筛选功能）
   */
  function showBag(playerData = {}) {
    showPanel('BagPanel', { player: playerData });
  }

  /**
   * 显示引导面板（带高亮提示和进度追踪）
   */
  function showGuide(playerData = {}) {
    showPanel('GuidePanel', { player: playerData });
  }

  /**
   * 显示聊天面板（带消息展示和输入框）
   */
  function showChat(playerData = {}) {
    showPanel('ChatPanel', { player: playerData });
  }

  /**
   * 显示成就面板（带成就面板和进度条）
   */
  function showAchievement(playerData = {}) {
    showPanel('AchievementPanel', { player: playerData });
  }

  /**
   * 显示成就达成特效面板
   * 触发时机：成就奖励领取成功后
   * @param {Object} achievementData - { id, name, desc, icon, reward: { diamonds, lingshi } }
   */
  function showAchievementEffect(achievementData = {}) {
    const defaultData = {
      icon: '🏆',
      name: '成就达成',
      description: '恭喜达成里程碑',
      reward: '???'
    };
    const data = { ...defaultData, ...achievementData };
    // 格式化奖励文本
    if (data.reward && typeof data.reward === 'object') {
      const parts = [];
      if (data.reward.diamonds) parts.push(`${data.reward.diamonds}钻石`);
      if (data.reward.lingshi) parts.push(`${data.reward.lingshi}灵石`);
      data.rewardText = parts.join(', ') || '奖励';
    } else {
      data.rewardText = data.reward || '';
    }
    showPanel('AchievementEffectPanel', { achievement: data });
    // Electron环境下同步发送
    if (typeof require !== 'undefined') {
      const { ipcRenderer } = require('electron');
      ipcRenderer.send('show-achievement-effect', data);
    }
  }

  /**
   * 显示排行榜面板（带多榜单切换）
   */
  function showRanking(playerData = {}) {
    showPanel('RankingPanel', { player: playerData });
  }

  /**
   * 显示活动面板（带活动列表和倒计时）
   */
  function showActivity(playerData = {}) {
    showPanel('ActivityPanel', { player: playerData });
  }

  /**
   * 显示交易面板（带购买/出售界面）
   */
  function showTrade(playerData = {}) {
    showPanel('TradePanel', { player: playerData });
  }

  /**
   * 显示好友面板（带列表管理）
   */
  function showFriend(playerData = {}) {
    showPanel('FriendPanel', { player: playerData });
  }

  /**
   * 显示神器面板（带神器展示和强化）
   */
  function showArtifact(playerData = {}) {
    showPanel('ArtifactPanel', { player: playerData });
  }

  /**
   * 显示炼丹面板（带炼制、丹方学习和炼丹炉升级）
   */
  function showAlchemy(playerData = {}) {
    showPanel('AlchemyPanel', { player: playerData });
  }

  function showSpiritRoot(playerData = {}) {
    showPanel('SpiritRootPanel', { player: playerData });
  }

  function showTribulation(playerData = {}) {
    showPanel('TribulationPanel', { player: playerData });
  }

  function showParadise(playerData = {}) {
    showPanel('ParadisePanel', { player: playerData });
  }

  function showCaveDwelling(playerData = {}) {
    showPanel('CaveDwellingPanel', { player: playerData });
  }

  return {
    initVue,
    registerComponent,
    showPanel,
    closePanel,
    showPVP,
    showMaster,
    showPayment,
    showBag,
    showGuide,
    showChat,
    showAchievement,
    showAchievementEffect,
    showRanking,
    showActivity,
    showTrade,
    showFriend,
    showArtifact,
    showAlchemy,
    showSpiritRoot,
    showTribulation,
    showParadise,
    showCaveDwelling,
    showQuestCommissionPanel,
    showQuizPanel,
    showGuildPanel,
    showInterSectWarPanel,
    showRealmBreakthroughPanel,
    showDungeonSelectionPanel,
    showCouplePanel,
    showSweepPanel,
    panels
  };
})();

// 导出供全局使用
window.UIComponents = UIComponents;

/**
 * 快捷函数 - 在现有游戏中快速调用UI
 * 
 * 示例:
 *   showPVPanel() - 显示PVP面板
 *   showMasterPanel() - 显示师徒面板
 *   showPaymentPanel() - 显示充值面板
 */

function showPVPanel(playerData = {}) {
  // 检查是否在Electron环境中
  if (typeof require !== 'undefined') {
    // Electron环境 - 通过IPC通信
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-pvp-panel', playerData);
  } else {
    // 浏览器环境
    UIComponents.showPVP(playerData);
  }
}

function showMasterPanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-master-panel', playerData);
  } else {
    UIComponents.showMaster(playerData);
  }
}

function showPaymentPanel(playerId = '') {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-payment-panel', playerId);
  } else {
    UIComponents.showPayment(playerId);
  }
}

/**
 * 显示背包面板
 * 带整理按钮和筛选功能
 */
function showBagPanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-bag-panel', playerData);
  } else {
    UIComponents.showBag(playerData);
  }
}

/**
 * 显示引导面板
 * 带高亮提示和进度追踪
 */
function showGuidePanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-guide-panel', playerData);
  } else {
    UIComponents.showGuide(playerData);
  }
}

/**
 * 显示新手引导面板（遮罩+高亮箭头+NPC气泡）
 * 9步引导：欢迎→角色状态→修炼→战斗→背包→突破→任务→宗门→完成
 */
function showNewPlayerGuidePanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-new-player-guide-panel', playerData);
  } else {
    UIComponents.showPanel('NewPlayerGuidePanel', { player: playerData });
  }
}

/**
 * 显示聊天面板
 * 带消息展示和输入框
 */
function showChatPanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-chat-panel', playerData);
  } else {
    UIComponents.showChat(playerData);
  }
}

/**
 * 显示成就面板
 * 带成就面板、进度条
 */
function showAchievementPanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-achievement-panel', playerData);
  } else {
    UIComponents.showAchievement(playerData);
  }
}

/**
 * 显示成就达成特效面板
 * 带弹窗动画 + 粒子特效 + 奖励预览
 * 触发时机：成就奖励领取成功后
 */
function showAchievementEffectPanel(achievementData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-achievement-effect', achievementData);
  } else {
    UIComponents.showAchievementEffect(achievementData);
  }
}

/**
 * 显示排行榜面板
 * 带多榜单切换
 */
function showRankingPanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-ranking-panel', playerData);
  } else {
    UIComponents.showRanking(playerData);
  }
}

/**
 * 显示活动面板
 * 带活动列表、倒计时
 */
function showActivityPanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-activity-panel', playerData);
  } else {
    UIComponents.showActivity(playerData);
  }
}

/**
 * 显示交易面板
 * 带购买/出售界面
 */
function showTradePanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-trade-panel', playerData);
  } else {
    UIComponents.showTrade(playerData);
  }
}

/**
 * 显示好友面板
 * 带列表管理
 */
function showFriendPanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-friend-panel', playerData);
  } else {
    UIComponents.showFriend(playerData);
  }
}

/**
 * 显示战斗特效面板
 * 带技能动画预览和Buff效果展示
 */
function showBattleEffectPanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-battle-effect-panel', playerData);
  } else {
    UIComponents.showPanel('BattleEffectPanel', { player: playerData });
  }
}

/**
 * 显示装备精炼/觉醒面板
 * 带精炼和觉醒功能
 */
function showEquipmentRefinePanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-equipment-refine-panel', playerData);
  } else {
    UIComponents.showPanel('EquipmentRefinePanel', { player: playerData });
  }
}

/**
 * 显示宠物进化面板
 * 带进化路线和进化功能
 */
function showPetEvolutionPanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-pet-evolution-panel', playerData);
  } else {
    UIComponents.showPanel('PetEvolutionPanel', { player: playerData });
  }
}

/**
 * 显示称号选择面板
 * 带称号选择和装备功能
 */
function showTitlePanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-title-panel', playerData);
  } else {
    UIComponents.showPanel('TitlePanel', { player: playerData });
  }
}

/**
 * 显示签到补签面板
 * 带补签功能
 */
function showSignInMakeupPanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-signin-makeup-panel', playerData);
  } else {
    UIComponents.showPanel('SignInMakeupPanel', { player: playerData });
  }
}

console.log('✅ UI组件管理器已加载');
console.log('使用方法: showPVPanel(), showMasterPanel(), showPaymentPanel(), showBagPanel(), showGuidePanel(), showChatPanel(), showAchievementPanel(), showAchievementEffectPanel(), showRankingPanel(), showActivityPanel(), showTradePanel(), showFriendPanel(), showBattleEffectPanel(), showEquipmentRefinePanel(), showPetEvolutionPanel(), showTitlePanel(), showSignInMakeupPanel(), showDamageNumberPanel(), showAppearancePreviewPanel(), showInteractionButtonPanel(), showGachaPanel(), showSkillTreePanel(), showEnhancementPanel(), showUltimateSkillPanel(), showAwakeningEffectPanel(), showBattleReportPanel(), showArtifactPanel(), showQuestCommissionPanel(), showQuizPanel(), showGuildPanel(), showInterSectWarPanel(), showRealmBreakthroughPanel(), showDungeonSelectionPanel(), showCouplePanel(), showSweepPanel(), showLundaoPanel()');

/**
 * 显示伤害数字面板
 * 带跳动效果预览和设置
 */
function showDamageNumberPanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-damage-number-panel', playerData);
  } else {
    UIComponents.showPanel('DamageNumberPanel', { player: playerData });
  }
}

/**
 * 显示外观预览面板
 * 带试穿和预览功能
 */
function showAppearancePreviewPanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-appearance-preview-panel', playerData);
  } else {
    UIComponents.showPanel('AppearancePreviewPanel', { player: playerData });
  }
}

/**
 * 显示互动动作按钮面板
 * 带动作按钮和快捷键设置
 */
function showInteractionButtonPanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-interaction-button-panel', playerData);
  } else {
    UIComponents.showPanel('InteractionButtonPanel', { player: playerData });
  }
}

/**
 * 显示抽奖面板
 * 带转盘、列表和卡片抽奖模式
 */
function showGachaPanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-gacha-panel', playerData);
  } else {
    UIComponents.showPanel('GachaPanel', { player: playerData });
  }
}

/**
 * 显示技能树面板
 * 带技能树节点和升级功能
 */
function showSkillTreePanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-skill-tree-panel', playerData);
  } else {
    UIComponents.showPanel('SkillTreePanel', { player: playerData });
  }
}

/**
 * 显示装备强化面板
 * 带精炼、觉醒和转移功能
 */
function showEnhancementPanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-enhancement-panel', playerData);
  } else {
    UIComponents.showPanel('EnhancementPanel', { player: playerData });
  }
}

/**
 * 显示奥义技能面板
 * 带技能展示和装备功能 (V29)
 */
function showUltimateSkillPanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-ultimate-skill-panel', playerData);
  } else {
    UIComponents.showPanel('UltimateSkillPanel', { player: playerData });
  }
}

/**
 * 显示觉醒特效面板
 * 带觉醒动画和特效预览 (V29)
 */
function showAwakeningEffectPanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-awakening-effect-panel', playerData);
  } else {
    UIComponents.showPanel('AwakeningEffectPanel', { player: playerData });
  }
}

/**
 * 显示战斗回放面板
 * 带战斗历史记录和回放功能 (V29)
 */
function showBattleReportPanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-battle-report-panel', playerData);
  } else {
    UIComponents.showPanel('BattleReportPanel', { player: playerData });
  }
}

/**
 * 显示神器面板
 * 带神器展示和强化功能 (V34)
 */
function showArtifactPanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-artifact-panel', playerData);
  } else {
    UIComponents.showPanel('ArtifactPanel', { player: playerData });
  }
}

/**
 * 显示委托任务面板
 * 带任务列表和委托完成功能 (V20)
 */
function showQuestCommissionPanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-quest-commission-panel', playerData);
  } else {
    UIComponents.showPanel('QuestCommissionPanel', { player: playerData });
  }
}

/**
 * 显示答题面板
 * 带题目展示和答题竞赛功能 (V20)
 */
function showQuizPanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-quiz-panel', playerData);
  } else {
    UIComponents.showPanel('QuizPanel', { player: playerData });
  }
}

/**
 * 显示公会面板
 * 带公会建设和管理功能 (V21)
 */
function showGuildPanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-guild-panel', playerData);
  } else {
    UIComponents.showPanel('GuildPanel', { player: playerData });
  }
}

/**
 * 显示跨服战场面板
 * 带跨服战场、宗门宣战、战斗布阵、战况地图等功能
 */
function showInterSectWarPanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-intersect-war-panel', playerData);
  } else {
    UIComponents.showPanel('InterSectWarPanel', { player: playerData });
  }
}

/**
 * 显示境界突破面板
 * 带境界突破和修炼加速功能 (V26)
 */
function showRealmBreakthroughPanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-realm-breakthrough-panel', playerData);
  } else {
    UIComponents.showPanel('RealmBreakthroughPanel', { player: playerData });
  }
}

/**
 * 显示副本选择面板
 * 带灵石/经验副本选择功能 (V26)
 */
function showDungeonSelectionPanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-dungeon-selection-panel', playerData);
  } else {
    UIComponents.showPanel('DungeonSelectionPanel', { player: playerData });
  }
}

/**
 * 显示仙侣面板
 * 带情缘互动和夫妻技能功能 (V27)
 */
function showCouplePanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-couple-panel', playerData);
  } else {
    UIComponents.showPanel('CouplePanel', { player: playerData });
  }
}

/**
 * 显示扫荡面板
 * 带一键扫荡和扫荡券功能 (V22)
 */
function showSweepPanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-sweep-panel', playerData);
  } else {
    UIComponents.showPanel('SweepPanel', { player: playerData });
  }
}

/**
 * 显示剧情面板
 * 带剧情线列表、章节内容和选择选项 (V39)
 */
function showPlotPanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-plot-panel', playerData);
  } else {
    UIComponents.showPanel('PlotPanel', { player: playerData });
  }
}

/**
 * 显示灵根面板
 * 带灵根展示、属性加成和切换功能
 */
function showSpiritRootPanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-spirit-root-panel', playerData);
  } else {
    UIComponents.showSpiritRoot(playerData);
  }
}

/**
 * 显示渡劫面板
 * 带天劫类型选择、成功率计算和渡劫功能
 */
function showTribulationPanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-tribulation-panel', playerData);
  } else {
    UIComponents.showTribulation(playerData);
  }
}

/**
 * 显示福地面板
 * 带福地探索、资源产出和占领功能
 */
function showParadisePanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-paradise-panel', playerData);
  } else {
    UIComponents.showParadise(playerData);
  }
}

/**
 * 显示洞府面板
 * 带修炼场所、资源采集和装饰升级功能
 */
function showCaveDwellingPanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-cave-dwelling-panel', playerData);
  } else {
    UIComponents.showCaveDwelling(playerData);
  }
}

/**
 * 显示论道面板
 * 带道友切磋、功法对决和论道排行榜功能
 */
function showLundaoPanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-lundao-panel', playerData);
  } else {
    UIComponents.showPanel('LundaoPanel', { player: playerData });
  }
}

/**
 * 显示炼丹面板
 * 带炼制、丹方学习和炼丹炉升级功能
 */


/**
 * 显示琴棋书画面板
 * 包含古琴演奏、围棋对弈、书法创作、绘画四大功能
 */
function showArtSystemPanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-art-panel', playerData);
  } else {
    UIComponents.showPanel('ArtSystemPanel', { player: playerData });
  }
}

function showAlchemyPanel(playerData = {}) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('show-alchemy-panel', playerData);
  } else {
    UIComponents.showAlchemy(playerData);
  }
}
