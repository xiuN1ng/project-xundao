// 社交系统导出

// 好友系统
export { 
  FriendSystem, 
  friendSystem, 
  FRIEND_CONFIG,
  FRIEND_BUFFS 
} from './friend-system'

export type { 
  Friend, 
  FriendRequest, 
  BlacklistEntry, 
  FriendRecommendation,
  FriendConfig 
} from './friend-system'

// 结义系统
export { 
  SwornSystem, 
  SWORN_BUFFS, 
  SWORN_TASKS 
} from './sworn-system'

export type { 
  SwornRelation, 
  SwornApplication, 
  SwornBuff, 
  SwornTask, 
  SwornConfig 
} from './sworn-system'

// 师徒系统
export { 
  MasterDiscipleSystem, 
  MASTER_TASKS 
} from './master-disciple-system'

export type { 
  MasterDiscipleRelation, 
  MasterApplication, 
  MasterTask, 
  MasterConfig 
} from './master-disciple-system'

// 师徒系统扩展
export { 
  MasterDiscipleSystemEx,
  MASTER_TITLES,
  MASTER_EQUIPMENT,
  MASTER_ITEMS,
  EXTENDED_MASTER_TASKS 
} from './master-disciple-system-ex'

export type { 
  MasterTitle,
  MasterEquipment,
  MasterItem,
  MasterDiscipleReward 
} from './master-disciple-system-ex'

// 师徒贡献商店
export { 
  MasterContributionShop, 
  CONTRIBUTION_SHOP_ITEMS 
} from './master-contribution-shop'

export type { 
  ContributionShopItem,
  PlayerShopRecord 
} from './master-contribution-shop'

// 仙侣系统
export { 
  CoupleSystem, 
  COUPLE_BUFFS, 
  COUPLE_SKILLS 
} from './couple-system'

export type { 
  CoupleRelation, 
  CoupleApplication, 
  CoupleSkill, 
  CoupleBuff, 
  CoupleConfig 
} from './couple-system'

// 情缘传承系统
export {
  CoupleInheritanceSystem,
  COUPLE_ANNIVERSARY_CONFIG,
  COUPLE_INHERITANCE_CONFIG,
  COUPLE_TITLES,
  COUPLE_EFFECTS
} from './couple-inheritance-system'

export type {
  MarriageAnniversary,
  CoupleInheritance,
  InheritItem,
  CoupleTitle,
  CoupleEffect,
  CoupleActivity
} from './couple-inheritance-system'

// 师徒传承系统
export {
  MasterInheritanceSystem,
  MASTER_INHERITANCE_CONFIG,
  BOND_SKILLS
} from './master-inheritance-system'

export type {
  MasterInheritance,
  PowerTransfer,
  MasterDiscipleBond,
  BondSkill,
  BondTask,
  GraduateInheritance
} from './master-inheritance-system'
