<template>
  <div class="panel guild">
    <div class="panel-header">
      <h2>仙盟</h2>
      <button class="btn-close" @click="$emit('close')">×</button>
    </div>
    
    <div v-if="!myGuild" class="guild-create">
      <h3>加入或创建仙盟</h3>
      <input v-model="searchName" placeholder="搜索仙盟..." class="search-input" />
      <div class="guild-list">
        <div v-for="g in guildList" :key="g.id" class="guild-item">
          <div class="guild-info">
            <div class="guild-name">{{ g.name }}</div>
            <div class="guild-meta">等级{{ g.level }} · {{ g.memberCount }}人</div>
          </div>
          <button class="btn-join" @click="joinGuild(g.id)">加入</button>
        </div>
      </div>
    </div>
    
    <div v-else class="guild-detail">
      <div class="guild-header">
        <div class="guild-name">{{ myGuild.name }}</div>
        <div class="guild-level">等级 {{ myGuild.level }}</div>
      </div>
      
      <div class="guild-stats">
        <div class="stat-item">
          <span class="value">{{ myGuild.memberCount }}</span>
          <span class="label">成员</span>
        </div>
        <div class="stat-item">
          <span class="value">{{ myGuild.exp }}</span>
          <span class="label">经验</span>
        </div>
      </div>
      
      <div class="guild-notice">
        <h4>公告</h4>
        <p>{{ myGuild.notice }}</p>
      </div>
      
      <div class="guild-members">
        <h4>成员列表</h4>
        <div v-for="m in myGuild.members" :key="m.id" class="member-item">
          <span class="member-name">{{ m.name }}</span>
          <span class="member-role">{{ m.role === 'leader' ? '盟主' : '成员' }}</span>
        </div>
      </div>
      
      <div class="guild-skills">
        <h4>仙盟技能</h4>
        <div v-for="s in skills" :key="s.id" class="skill-item">
          <div class="skill-info">
            <div class="skill-name">{{ s.name }}</div>
            <div class="skill-desc">{{ s.desc }}</div>
          </div>
          <div class="skill-level">Lv.{{ s.level }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'GuildPanel',
  data() {
    return {
      searchName: '',
      guildList: [],
      myGuild: null,
      skills: []
    }
  },
  mounted() {
    this.loadGuildList()
    this.loadMyGuild()
  },
  methods: {
    async loadGuildList() {
      try {
        const res = await fetch('http://localhost:3001/api/guild/list')
        const data = await res.json()
        this.guildList = data.list || []
      } catch (e) {
        console.error('加载仙盟列表失败', e)
      }
    },
    async loadMyGuild() {
      try {
        const res = await fetch('http://localhost:3001/api/guild/player/1')
        const data = await res.json()
        if (data.guild) {
          this.myGuild = {
            ...data.guild,
            memberCount: data.guild.members?.length || 0
          }
          this.loadSkills(this.myGuild.id)
        }
      } catch (e) {
        console.error('加载仙盟失败', e)
      }
    },
    async loadSkills(guildId) {
      try {
        const res = await fetch(`http://localhost:3001/api/guild/skill/${guildId}`)
        const data = await res.json()
        this.skills = data.skills || []
      } catch (e) {
        console.error('加载技能失败', e)
      }
    },
    async joinGuild(guildId) {
      try {
        const res = await fetch('http://localhost:3001/api/guild/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 1, userName: 'test', guildId })
        })
        const data = await res.json()
        if (data.success) {
          alert('加入成功')
          this.loadMyGuild()
        }
      } catch (e) {
        console.error('加入仙盟失败', e)
      }
    }
  }
}
</script>

<style scoped>
.panel {
  background: #1a1a2e;
  color: #fff;
  padding: 20px;
  height: 100%;
  overflow-y: auto;
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.panel-header h2 {
  font-size: 24px;
  color: #ffd700;
}
.btn-close {
  background: none;
  border: none;
  color: #fff;
  font-size: 30px;
  cursor: pointer;
}
.search-input {
  width: 100%;
  padding: 12px;
  background: #16213e;
  border: 1px solid #0f3460;
  color: #fff;
  margin-bottom: 15px;
}
.guild-list, .member-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.guild-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #16213e;
  padding: 15px;
  border-radius: 8px;
}
.guild-name {
  font-size: 16px;
  font-weight: bold;
  color: #ffd700;
}
.guild-meta {
  font-size: 12px;
  color: #888;
}
.btn-join {
  padding: 8px 20px;
  background: #0f3460;
  border: 1px solid #ffd700;
  color: #ffd700;
  cursor: pointer;
}
.guild-header {
  text-align: center;
  margin-bottom: 20px;
}
.guild-header .guild-name {
  font-size: 28px;
}
.guild-level {
  color: #00d4ff;
}
.guild-stats {
  display: flex;
  justify-content: space-around;
  padding: 15px;
  background: #16213e;
  border-radius: 8px;
  margin-bottom: 20px;
}
.stat-item {
  text-align: center;
}
.stat-item .value {
  display: block;
  font-size: 24px;
  color: #ffd700;
}
.stat-item .label {
  font-size: 12px;
  color: #888;
}
.guild-notice, .guild-members, .guild-skills {
  margin-bottom: 20px;
}
.guild-notice h4, .guild-members h4, .guild-skills h4 {
  color: #ffd700;
  margin-bottom: 10px;
}
.guild-notice p {
  background: #16213e;
  padding: 10px;
  border-radius: 8px;
  font-size: 14px;
}
.member-item, .skill-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #16213e;
  padding: 10px;
  margin-bottom: 8px;
  border-radius: 8px;
}
.member-role {
  color: #00d4ff;
  font-size: 12px;
}
.skill-level {
  color: #ffd700;
}
</style>
