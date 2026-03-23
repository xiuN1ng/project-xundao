function startBattle(monsterId) {
  AudioManager.playBattle(); // 播放战斗开始音效
  const r = game.startBattle(monsterId);
  if (r.success) {
    addLog(r.message, 'combat');
    // 隐藏新手提示，避免战斗时干扰
    stopNewbieTips();
  }
  else addLog(r.message);
}

function attack() {
  AudioManager.playBattle(); // 播放攻击音效
  const r = game.attack();
  if (r.success) {
    addLog(r.message, 'combat');
    
    // 显示伤害数字
    if (r.battle) {
      // 计算伤害
      const state = game.getState();
      const playerStats = state.playerStats;
      let damage = Math.max(1, playerStats.atk - r.battle.monster.def * 0.3);
      const isCritical = Math.random() < 0.1;
      if (isCritical) damage *= 1.5;
      
      showDamageNumber(damage, isCritical);
      
      // 如果玩家受伤，显示伤害
      if (r.battle.playerHp < state.playerStats.maxHp) {
        const monsterDmg = Math.max(1, r.battle.monster.atk - playerStats.def * 0.3);
        // 玩家受到的伤害不在这里显示，避免刷屏
      }
      
      updateBattleUI(r.battle);
    } else {
      // 战斗胜利，显示奖励飘字
      const expMatch = r.message.match(/\+(\d+)经验/);
      const stoneMatch = r.message.match(/\+(\d+)灵石/);
      const exp = expMatch ? parseInt(expMatch[1]) : 0;
      const spirit = stoneMatch ? parseInt(stoneMatch[1]) : 0;
      
      if (expMatch) {
        setTimeout(() => showFloatText('+' + expMatch[1] + ' 经验', 'exp'), 300);
      }
      if (stoneMatch) {
        setTimeout(() => showFloatText('+' + stoneMatch[1] + ' 灵石', 'stones'), 500);
      }
      
      // 添加战斗记录
      const battleData = {
        result: 'victory',
        monsterName: r.battle ? r.battle.monster.name : '怪物',
        damage: Math.floor(Math.random() * 100 + 50),
        exp: exp,
        spirit: spirit,
        drops: generateBattleDrops(),
        details: `战斗胜利！\n获得经验: ${exp}\n获得灵石: ${spirit}`
      };
      addBattleRecord(battleData);
      
      renderEnemies();
    }
  }
}

function updateBattleUI(battle) {
  const m = battle.monster;
  elements.enemyList.innerHTML = `
    <div class="enemy-card" style="grid-column:span 3">
      <div class="enemy-icon">👹 ${m.name}</div>
      <div>HP: ${Math.floor(m.currentHp)}/${m.hp}</div>
      <div class="battle-hp-bar"><div class="battle-hp-fill" style="width:${m.currentHp/m.hp*100}%"></div></div>
      <button class="btn btn-danger" style="margin-top:8px" onclick="attack()">⚔️ 攻击</button>
      <button class="btn" style="margin-top:4px" onclick="handleFlee(this)">🏃 逃跑</button>
    </div>
  `;
}

function challengeDungeon(dungeonId) {
  const r = game.challengeDungeon(dungeonId);
  addLog(r.message, r.message.includes('🏆') ? 'important' : '');
}

