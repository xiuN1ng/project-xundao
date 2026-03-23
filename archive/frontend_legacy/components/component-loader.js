/**
 * Vue组件加载器
 * 自动加载并注册所有Vue组件
 */

async function loadVueComponent(name) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `./components/${name}.vue`, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          resolve(xhr.responseText);
        } else {
          reject(new Error(`无法加载组件: ${name}`));
        }
      }
    };
    xhr.send();
  });
}

// 动态解析Vue单文件组件
function parseVueTemplate(template) {
  // 提取template
  const templateMatch = template.match(/<template>([\s\S]*?)<\/template>/);
  // 提取script
  const scriptMatch = template.match(/<script>([\s\S]*?)<\/script>/);
  // 提取style
  const styleMatch = template.match(/<style[^>]*>([\s\S]*?)<\/style>/);

  return {
    template: templateMatch ? templateMatch[1].trim() : '',
    script: scriptMatch ? scriptMatch[1].trim() : '',
    style: styleMatch ? styleMatch[1].trim() : ''
  };
}

// 解析Vue组件选项
function parseVueScript(scriptContent) {
  // 使用正则提取export default对象
  const match = scriptContent.match(/export\s+default\s+({[\s\S]*})/);
  if (!match) return {};
  
  try {
    // 简单的解析（实际项目中建议使用完整解析器）
    const code = match[1];
    // 将Vue属性提取为对象
    const result = {};
    
    // 提取name
    const nameMatch = code.match(/name:\s*['"]([^'"]+)['"]/);
    if (nameMatch) result.name = nameMatch[1];
    
    // 提取emits
    const emitsMatch = code.match(/emits:\s*\[([^\]]+)\]/);
    if (emitsMatch) result.emits = emitsMatch[1].split(',').map(s => s.trim().replace(/['"]/g, ''));
    
    // 提取setup函数中的内容
    const setupMatch = code.match(/setup\s*\([^)]*\)\s*=>\s*{([\s\S]*)}/);
    if (setupMatch) {
      result.setupCode = setupMatch[1];
    }
    
    return result;
  } catch (e) {
    console.error('解析Vue script失败:', e);
    return {};
  }
}

// 创建简单的Vue组件（运行时编译）
function createSimpleComponent(name, template, scriptContent) {
  // 从script中提取setup函数
  const parsed = parseVueScript(scriptContent);
  
  // 创建setup函数
  const setupFunction = new Function('Vue', 'props', 'context', `
    const { ref, computed, onMounted, onUnmounted, watch, nextTick } = Vue;
    const { emit } = context;
    ${parsed.setupCode || ''}
    return {};
  `);
  
  return {
    name: name,
    template: template,
    setup(props, context) {
      try {
        return setupFunction(Vue, props, context);
      } catch (e) {
        console.error(`组件 ${name} setup执行失败:`, e);
        return {};
      }
    },
    emits: parsed.emits || []
  };
}

// 组件缓存
const componentCache = new Map();

/**
 * 加载并注册所有组件
 */
async function registerAllComponents() {
  const componentNames = [
    'PVPPanel',
    'MasterPanel', 
    'PaymentPanel',
    'BagPanel',
    'GuidePanel',
    'ChatPanel',
    'AchievementPanel',
    'RankingPanel',
    'ActivityPanel',
    'TradePanel',
    'FriendPanel',
    'BattleEffectPanel',
    'EquipmentRefinePanel',
    'PetEvolutionPanel',
    'TitlePanel',
    'SignInMakeupPanel',
    'SignIn',
    // v7 新增组件
    'DamageNumberPanel',
    'AppearancePreviewPanel',
    'InteractionButtonPanel',
    'GachaPanel',
    // v13-v15 新增组件
    'BattleSettingsPanel',
    'TransferPowerPanel',
    'AutoSettingsPanel',
    'MapPanel',
    // v25 新增组件
    'SkillTreePanel',
    'EnhancementPanel',
    // v26 新增组件
    'MountPanel',
    'PetEquipmentPanel',
    'AppearancePanel',
    'ComboPanel',
    'ShieldPanel',
    'TeleportPanel',
    // v27 新增组件
    'EquipmentProcessingPanel',
    'IdleSettingsPanel',
    'TaskTrackerPanel',
    // v28 新增组件
    'ResourceRecyclePanel',
    // v29 新增组件
    'UltimateSkillPanel',  // 奥义UI - 技能展示
    'ActivityEventPanel',  // 活动UI（答题/护送面板）
    'BattleReportPanel',   // 活动战报 - 战斗回放
    // v30 新增组件 - 福利UI
    'WelfarePanel',
    // v31 新增组件 - 整理/排行奖励/好友推荐/仙侣
    'BagOrganizePanel',
    'RankingRewardPanel',
    'FriendRecommendPanel',
    'CouplePanel',
    // v32 新增组件 - 战斗技能/悟性/产出提示/奇遇/觉醒
    'SkillButton',
    'WisdomPanel',
    'DropNotificationPanel',
    'AdventureEventPanel',
    'AwakeningPanel',
    // v33 新增组件 - 婚姻/成就动画/防御/境界/动作
    'MarriagePanel',
    'AchievementEffectPanel',
    'DefensePanel',
    'RealmPanel',
    'ActionPanel',
    // v34 新增组件 - 神器UI
    'ArtifactPanel',
    // v35 新增组件 - 委托/答题/公会/境界/副本/情缘
    'QuestCommissionPanel',
    'QuizPanel', 
    'GuildPanel',
    'RealmBreakthroughPanel',
    'DungeonSelectionPanel',
    'CouplePanel',
    'RealmPanel',
    // v35 新增组件 - 扫荡面板
    'SweepPanel',
    // v26 道具循环界面新增组件
    'EquipmentDismantlePanel',
    'MaterialSynthesisPanel',
    // v37 新增组件 - 炼丹系统
    'AlchemyPanel',
    // v36 新增组件 - 绝招UI/天赋UI/师徒UI
    'UltimateComboPanel',   // 绝招UI - 连击显示
    'TalentTreePanel',     // 天赋UI - 加点界面
    'MasterDisciplePanel',  // 师徒UI - 传承界面
    // v34 新增组件 - 拍卖UI/节日UI/称号UI
    'AuctionPanel',        // 拍卖UI - 竞价界面
    'HolidayCalendarPanel', // 节日UI - 活动日历
    'TitleSelectionPanel',  // 称号UI - 称号选择
    // v35 新增组件 - 反击/格挡/境界压制
    'CounterAttackPanel',  // 反击UI - 反击显示/伤害飘字/特效动画
    'BlockPanel',          // 格挡UI - 格挡特效/完美格挡/成功动画
    // v37 新增组件 - 委托UI/答题UI/动作UI
    'CommissionPanel',     // 委托UI - 任务列表/任务详情/接受完成
    'ActionPanel',        // 动作UI - 快捷动作/拥抱/亲吻/表情
    // v38 新增组件 - 公会UI/红包UI/商店UI
    'GuildPanel',         // 公会UI - 公会创建/成员列表/公会升级
    'RedpacketPanel',     // 红包UI - 红包发放/红包列表/抢红包
    'ShopPanel',          // 商店UI - 积分商店/商品展示/购买功能
    // 灵兽系统
    'PetPanel',          // 灵兽系统 - 灵兽列表/详情/参战/进化
    // 剧情系统
    'PlotPanel',          // 剧情系统 - 剧情线列表/章节内容/选择选项
    // 剧情系统前端展示
    'StoryPanel',        // 剧情系统 - 完整前端展示
    // 离线收益界面
    'OfflineRewardPanel', // 离线收益 - 离线时间/收益预览/领取奖励
    // 境界/功法展示优化
    'GongfaPanel',       // 功法系统 - 功法列表/装备/升级
    'LundaoPanel',       // 论道系统 - 道友切磋/功法对决/排行榜
    'CaveDwellingPanel', // 洞府系统 - 修炼场所/采集资源/装饰升级
    'ParadisePanel',     // 福地系统 - 福地占领/资源产出/福地升级
    'InterSectWarPanel', // 仙盟对战 - 跨服战场/宗门宣战/战斗布阵
  ];
  
  console.log('开始加载Vue组件...');
  
  for (const name of componentNames) {
    try {
      const template = await loadVueComponent(name);
      const parsed = parseVueTemplate(template);
      
      // 简单组件创建
      const component = {
        name: name,
        template: parsed.template,
        // 使用字符串模板作为render函数
        mounted() {
          // 组件挂载后的初始化
        }
      };
      
      // 尝试提取script中的逻辑
      if (parsed.script) {
        // 创建eval环境
        const componentDef = { 
          name: name,
          template: parsed.template,
          emits: [],
          setup: () => ({})
        };
        
        try {
          // 提取ref/reactive等
          const refs = parsed.script.match(/const\s+(\w+)\s+=\s+ref/g) || [];
          const reactives = parsed.script.match(/const\s+(\w+)\s+=\s+reactive/g) || [];
          
          // 提取computed
          const computedMatch = parsed.script.match(/const\s+(\w+)\s+=\s+computed\s*\(/g) || [];
          
          // 提取onMounted
          const onMountedMatch = parsed.script.match(/onMounted\s*\(\s*\(\s*\)\s*=>\s*{/g) || [];
          
          // 注入到全局Vue
          if (typeof Vue !== 'undefined') {
            // 创建一个简单的函数组件
            const scriptLines = parsed.script.split('\n');
            let hasSetup = false;
            let setupBody = '';
            
            for (const line of scriptLines) {
              if (line.includes('const ') && (line.includes('ref(') || line.includes('computed(') || line.includes('onMounted('))) {
                setupBody += line + '\n';
                hasSetup = true;
              }
            }
            
            if (hasSetup) {
              component.setup = new Function('Vue', `
                const { ref, computed, onMounted, onUnmounted, watch, nextTick } = Vue;
                ${setupBody}
                return {
                  ${refs.map(r => r.replace('const ', '').replace(' = ref', '')).join(', ')}
                };
              `);
            }
          }
        } catch (e) {
          console.warn(`组件 ${name} script解析失败，使用默认:`, e.message);
        }
        
        // 提取emits
        const emitsMatch = parsed.script.match(/emits:\s*\[([^\]]+)\]/);
        if (emitsMatch) {
          component.emits = emitsMatch[1].split(',').map(s => s.trim().replace(/['"]/g, ''));
        }
      }
      
      // 添加样式
      if (parsed.style) {
        // 创建style元素
        const styleEl = document.createElement('style');
        styleEl.textContent = parsed.style;
        styleEl.id = `style-${name}`;
        
        // 检查是否已存在
        if (!document.getElementById(`style-${name}`)) {
          document.head.appendChild(styleEl);
        }
      }
      
      // 注册组件
      if (UIComponents && UIComponents.registerComponent) {
        UIComponents.registerComponent(name, component);
        console.log(`✅ 组件 ${name} 已注册`);
      }
      
      componentCache.set(name, component);
      
    } catch (e) {
      console.error(`❌ 组件 ${name} 加载失败:`, e);
    }
  }
  
  console.log('Vue组件加载完成');
}

// 页面加载完成后自动注册
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', registerAllComponents);
} else {
  // DOM已加载完成
  setTimeout(registerAllComponents, 100);
}

// 导出
window.VueComponentLoader = {
  load: loadVueComponent,
  registerAll: registerAllComponents,
  getComponent: (name) => componentCache.get(name)
};
