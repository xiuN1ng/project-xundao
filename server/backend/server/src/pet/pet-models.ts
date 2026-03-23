/**
 * 灵兽进化系统 - 数据库模型
 */

import Database from 'better-sqlite3';
import { Pet, PetTemplate, PetSkill, EvolutionConfig, TalentLevel } from './types';

let db: Database.Database;

/**
 * 初始化灵兽数据库表
 */
export function initPetDatabase(database: Database.Database) {
  db = database;
  
  // 灵兽表
  db.exec(`
    CREATE TABLE IF NOT EXISTS pets (
      pet_id TEXT PRIMARY KEY,
      player_id INTEGER NOT NULL,
      template_id TEXT NOT NULL,
      name TEXT NOT NULL,
      name_cn TEXT,
      level INTEGER DEFAULT 1,
      exp INTEGER DEFAULT 0,
      form INTEGER DEFAULT 1,
      talent_level TEXT DEFAULT 'normal',
      max_level INTEGER DEFAULT 100,
      health INTEGER DEFAULT 1000,
      attack INTEGER DEFAULT 100,
      defense INTEGER DEFAULT 50,
      speed INTEGER DEFAULT 50,
      skills TEXT DEFAULT '[]',
      innate_skills TEXT DEFAULT '[]',
      appearance TEXT DEFAULT 'default',
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);
  
  // 灵兽模板表
  db.exec(`
    CREATE TABLE IF NOT EXISTS pet_templates (
      template_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_cn TEXT,
      description TEXT,
      base_health INTEGER DEFAULT 1000,
      base_attack INTEGER DEFAULT 100,
      base_defense INTEGER DEFAULT 50,
      base_speed INTEGER DEFAULT 50,
      max_form INTEGER DEFAULT 5,
      evolution_items TEXT DEFAULT '[]',
      talent_items TEXT DEFAULT '[]',
      learnable_skills TEXT DEFAULT '[]',
      innate_skills TEXT DEFAULT '[]',
      icon TEXT,
      rarity TEXT DEFAULT 'normal'
    )
  `);
  
  // 创建索引
  db.exec(`CREATE INDEX IF NOT EXISTS idx_pets_player ON pets(player_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_pets_template ON pets(template_id)`);
  
  console.log('[Pet] 数据库表初始化完成');
}

/**
 * 获取玩家的所有灵兽
 */
export function getPlayerPets(playerId: number): Pet[] {
  const pets = db.prepare('SELECT * FROM pets WHERE player_id = ? ORDER BY level DESC').all(playerId) as any[];
  return pets.map(p => ({
    ...p,
    skills: JSON.parse(p.skills || '[]'),
    innateSkills: JSON.parse(p.innate_skills || '[]'),
    appearance: p.appearance || 'default'
  }));
}

/**
 * 获取单个灵兽
 */
export function getPet(petId: string): Pet | null {
  const pet = db.prepare('SELECT * FROM pets WHERE pet_id = ?').get(petId) as any;
  if (!pet) return null;
  
  return {
    ...pet,
    skills: JSON.parse(pet.skills || '[]'),
    innateSkills: JSON.parse(pet.innate_skills || '[]'),
    appearance: pet.appearance || 'default'
  };
}

/**
 * 创建灵兽
 */
export function createPet(playerId: number, templateId: string, name: string): Pet | null {
  const template = db.prepare('SELECT * FROM pet_templates WHERE template_id = ?').get(templateId) as any;
  if (!template) return null;
  
  const now = Date.now();
  const petId = `pet_${playerId}_${templateId}_${now}`;
  
  const innateSkills = JSON.parse(template.innate_skills || '[]');
  
  db.prepare(`
    INSERT INTO pets (pet_id, player_id, template_id, name, name_cn, level, exp, form, talent_level, 
      max_level, health, attack, defense, speed, skills, innate_skills, appearance, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, 0, 1, 'normal', ?, ?, ?, ?, ?, '[]', ?, 'default', ?, ?)
  `).run(
    petId, playerId, templateId, name, template.name_cn || name,
    template.max_form * 20 || 100,
    template.base_health || 1000,
    template.base_attack || 100,
    template.base_defense || 50,
    template.base_speed || 50,
    JSON.stringify(innateSkills),
    now, now
  );
  
  return getPet(petId);
}

/**
 * 更新灵兽
 */
export function updatePet(petId: string, data: Partial<Pet>): boolean {
  const updates: string[] = [];
  const values: any[] = [];
  
  if (data.name !== undefined) {
    updates.push('name = ?');
    values.push(data.name);
  }
  if (data.level !== undefined) {
    updates.push('level = ?');
    values.push(data.level);
  }
  if (data.exp !== undefined) {
    updates.push('exp = ?');
    values.push(data.exp);
  }
  if (data.form !== undefined) {
    updates.push('form = ?');
    values.push(data.form);
  }
  if (data.talentLevel !== undefined) {
    updates.push('talent_level = ?');
    values.push(data.talentLevel);
  }
  if (data.maxLevel !== undefined) {
    updates.push('max_level = ?');
    values.push(data.maxLevel);
  }
  if (data.health !== undefined) {
    updates.push('health = ?');
    values.push(data.health);
  }
  if (data.attack !== undefined) {
    updates.push('attack = ?');
    values.push(data.attack);
  }
  if (data.defense !== undefined) {
    updates.push('defense = ?');
    values.push(data.defense);
  }
  if (data.speed !== undefined) {
    updates.push('speed = ?');
    values.push(data.speed);
  }
  if (data.skills !== undefined) {
    updates.push('skills = ?');
    values.push(JSON.stringify(data.skills));
  }
  if (data.innateSkills !== undefined) {
    updates.push('innate_skills = ?');
    values.push(JSON.stringify(data.innateSkills));
  }
  if (data.appearance !== undefined) {
    updates.push('appearance = ?');
    values.push(data.appearance);
  }
  
  if (updates.length > 0) {
    updates.push('updated_at = ?');
    values.push(Date.now());
    values.push(petId);
    
    db.prepare(`UPDATE pets SET ${updates.join(', ')} WHERE pet_id = ?`).run(...values);
    return true;
  }
  
  return false;
}

/**
 * 删除灵兽
 */
export function deletePet(petId: string): boolean {
  const result = db.prepare('DELETE FROM pets WHERE pet_id = ?').run(petId);
  return result.changes > 0;
}

/**
 * 获取灵兽模板
 */
export function getPetTemplate(templateId: string): PetTemplate | null {
  const template = db.prepare('SELECT * FROM pet_templates WHERE template_id = ?').get(templateId) as any;
  if (!template) return null;
  
  return {
    ...template,
    evolutionItems: JSON.parse(template.evolution_items || '[]'),
    talentItems: JSON.parse(template.talent_items || '[]'),
    learnableSkills: JSON.parse(template.learnable_skills || '[]'),
    innateSkills: JSON.parse(template.innate_skills || '[]')
  };
}

/**
 * 获取所有灵兽模板
 */
export function getAllPetTemplates(): PetTemplate[] {
  const templates = db.prepare('SELECT * FROM pet_templates').all() as any[];
  return templates.map(t => ({
    ...t,
    evolutionItems: JSON.parse(t.evolution_items || '[]'),
    talentItems: JSON.parse(t.talent_items || '[]'),
    learnableSkills: JSON.parse(t.learnable_skills || '[]'),
    innateSkills: JSON.parse(t.innate_skills || '[]')
  }));
}

/**
 * 插入灵兽模板
 */
export function insertPetTemplate(template: PetTemplate): void {
  db.prepare(`
    INSERT OR REPLACE INTO pet_templates (template_id, name, name_cn, description, base_health, 
      base_attack, base_defense, base_speed, max_form, evolution_items, talent_items, 
      learnable_skills, innate_skills, icon, rarity)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    template.templateId,
    template.name,
    template.nameCn,
    template.description,
    template.baseHealth,
    template.baseAttack,
    template.baseDefense,
    template.baseSpeed,
    template.maxForm,
    JSON.stringify(template.evolutionItems),
    JSON.stringify(template.talentItems),
    JSON.stringify(template.learnableSkills),
    JSON.stringify(template.innateSkills),
    template.icon,
    template.rarity
  );
}
