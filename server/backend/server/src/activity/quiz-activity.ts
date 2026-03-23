/**
 * 答题活动系统 (Quiz Activity System)
 * 答题竞赛活动，玩家回答问题获取积分和奖励
 * 
 * 主要功能：
 * - 题目库管理（增删改查）
 * - 答题竞赛活动开启与管理
 * - 玩家答题接口
 * - 答题计时和得分计算
 * - 排行榜功能
 */

export type QuestionDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface QuestionOption {
  id: string;          // 选项ID (A, B, C, D)
  content: string;    // 选项内容
}

export interface Question {
  id: string;                 // 题目ID
  content: string;            // 题目内容
  type: 'single' | 'multiple'; // 单选/多选
  options: QuestionOption[];  // 选项列表
  correctAnswers: string[];   // 正确答案选项ID数组
  difficulty: QuestionDifficulty; // 难度
  category: string;           // 分类
  explanation?: string;        // 答案解析
  points: number;             // 基础分值
}

export interface QuizActivity {
  id: string;                 // 活动ID
  title: string;              // 活动标题
  description: string;        // 活动描述
  startTime: number;          // 开始时间
  endTime: number;            // 结束时间
  questionCount: number;      // 题目数量
  timePerQuestion: number;   // 每题时间(秒)
  difficulty?: QuestionDifficulty; // 难度筛选
  categories?: string[];      // 分类筛选
  rewards: QuizReward[];      // 活动奖励
  active: boolean;            // 是否激活
  maxParticipants?: number;   // 最大参与人数
}

export interface QuizReward {
  rank: number;               // 排名要求 (1=第1名, 2=前2名, 3=前3名, 10=前10名)
  type: 'rank' | 'score' | 'participation';
  minScore?: number;          // 最低分数要求 (type=score时使用)
  rewards: Array<{
    id: string;
    name: string;
    amount: number;
  }>;
}

export interface PlayerQuizSession {
  playerId: string;
  activityId: string;
  startTime: number;
  endTime?: number;
  currentQuestionIndex: number;
  answers: PlayerAnswer[];
  totalScore: number;
  correctCount: number;
  status: 'waiting' | 'in_progress' | 'completed' | 'expired';
}

export interface PlayerAnswer {
  questionId: string;
  selectedAnswers: string[];
  isCorrect: boolean;
  answerTime: number;       // 答题用时(毫秒)
  score: number;             // 获得的分数
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName?: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  accuracy: number;
  avgAnswerTime: number;
  lastUpdateTime: number;
}

export interface PlayerQuizSummary {
  playerId: string;
  activityId: string;
  totalScore: number;
  rank: number;
  totalParticipants: number;
  correctCount: number;
  accuracy: number;
  rewards: Array<{ id: string; name: string; amount: number }>;
}

/**
 * 默认题目库
 */
const DEFAULT_QUESTIONS: Question[] = [
  // 简单难度
  {
    id: 'q001',
    content: '修仙世界中，下列哪个境界是最高的？',
    type: 'single',
    options: [
      { id: 'A', content: '练气期' },
      { id: 'B', content: '筑基期' },
      { id: 'C', content: '金丹期' },
      { id: 'D', content: '渡劫期' }
    ],
    correctAnswers: ['D'],
    difficulty: 'easy',
    category: '修仙境界',
    explanation: '修仙境界从低到高为：练气、筑基、金丹、元婴、化神、炼虚、合体、大乘、渡劫',
    points: 10
  },
  {
    id: 'q002',
    content: '以下哪种灵根资质最好？',
    type: 'single',
    options: [
      { id: 'A', content: '单灵根' },
      { id: 'B', content: '双灵根' },
      { id: 'C', content: '三灵根' },
      { id: 'D', content: '四灵根' }
    ],
    correctAnswers: ['A'],
    difficulty: 'easy',
    category: '灵根资质',
    explanation: '单灵根又称天灵根，是最纯正的灵根，修炼速度最快',
    points: 10
  },
  {
    id: 'q003',
    content: '修仙者常用的武器不包括以下哪种？',
    type: 'single',
    options: [
      { id: 'A', content: '飞剑' },
      { id: 'B', content: '拂尘' },
      { id: 'C', content: '法杖' },
      { id: 'D', content: ' RPG' }
    ],
    correctAnswers: ['D'],
    difficulty: 'easy',
    category: '修仙装备',
    explanation: '飞剑、拂尘、法杖都是修仙者常用法器，RPG是现代热武器',
    points: 10
  },
  // 中等难度
  {
    id: 'q004',
    content: '下列哪个不是修仙小说中的常见流派？',
    type: 'single',
    options: [
      { id: 'A', content: '剑修' },
      { id: 'B', content: '体修' },
      { id: 'C', content: '法修' },
      { id: 'D', content: '魂修' }
    ],
    correctAnswers: ['D'],
    difficulty: 'medium',
    category: '修仙流派',
    explanation: '剑修、体修、法修是主流流派，魂修较为少见',
    points: 20
  },
  {
    id: 'q005',
    content: '以下哪种天材地宝可以提升金丹品质？',
    type: 'single',
    options: [
      { id: 'A', content: '筑基丹' },
      { id: 'B', content: '结金丹' },
      { id: 'C', content: '化婴丹' },
      { id: 'D', content: '渡劫丹' }
    ],
    correctAnswers: ['B'],
    difficulty: 'medium',
    category: '丹药',
    explanation: '筑基丹用于筑基，结金丹用于结丹，化婴丹用于化婴，渡劫丹用于渡劫',
    points: 20
  },
  {
    id: 'q006',
    content: '修仙世界中，哪个时期灵气最为充裕？',
    type: 'single',
    options: [
      { id: 'A', content: '上古时期' },
      { id: 'B', content: '中古时期' },
      { id: 'C', content: '近古时期' },
      { id: 'D', content: '末法时期' }
    ],
    correctAnswers: ['A'],
    difficulty: 'medium',
    category: '修仙历史',
    explanation: '上古时期灵气最为充裕，强者如云，随后灵气逐渐稀薄',
    points: 20
  },
  // 困难难度
  {
    id: 'q007',
    content: '以下哪个不是天道法则的体现？',
    type: 'single',
    options: [
      { id: 'A', content: '因果法则' },
      { id: 'B', content: '轮回法则' },
      { id: 'C', content: '命运法则' },
      { id: 'D', content: '数学法则' }
    ],
    correctAnswers: ['D'],
    difficulty: 'hard',
    category: '天道法则',
    explanation: '因果、轮回、命运都是修仙世界中常见的天道法则体现',
    points: 30
  },
  {
    id: 'q008',
    content: '炼制一件极品灵器需要哪些条件？',
    type: 'multiple',
    options: [
      { id: 'A', content: '高品质材料' },
      { id: 'B', content: '强大的真火' },
      { id: 'C', content: '高明的炼器手法' },
      { id: 'D', content: '天地法则感悟' }
    ],
    correctAnswers: ['A', 'B', 'C', 'D'],
    difficulty: 'hard',
    category: '炼器',
    explanation: '炼制极品灵器需要天时地利人和，缺一不可',
    points: 40
  },
  // 专家难度
  {
    id: 'q009',
    content: '以下哪种道心最不容易产生心魔？',
    type: 'single',
    options: [
      { id: 'A', content: '杀伐道心' },
      { id: 'B', content: '无情道心' },
      { id: 'C', content: '功德道心' },
      { id: 'D', content: '毁灭道心' }
    ],
    correctAnswers: ['C'],
    difficulty: 'expert',
    category: '道心',
    explanation: '功德道心以积累功德为主，不易产生心魔',
    points: 50
  },
  {
    id: 'q010',
    content: '突破大乘期需要领悟哪些法则？',
    type: 'multiple',
    options: [
      { id: 'A', content: '空间法则' },
      { id: 'B', content: '时间法则' },
      { id: 'C', content: '五行法则' },
      { id: 'D', content: '生死法则' }
    ],
    correctAnswers: ['A', 'B', 'C', 'D'],
    difficulty: 'expert',
    category: '法则领悟',
    explanation: '大乘期需要融会贯通多种法则才能突破',
    points: 60
  }
];

/**
 * 默认答题活动配置
 */
const DEFAULT_ACTIVITIES: QuizActivity[] = [
  {
    id: 'daily_quiz',
    title: '每日答题',
    description: '每天十道题，测测你的修仙知识',
    startTime: 0,
    endTime: Number.MAX_SAFE_INTEGER,
    questionCount: 10,
    timePerQuestion: 30,
    difficulty: 'easy',
    active: true,
    rewards: [
      { rank: 1, type: 'rank', rewards: [{ id: 'gold', name: '金币', amount: 1000 }] },
      { rank: 10, type: 'rank', rewards: [{ id: 'gold', name: '金币', amount: 500 }] },
      { rank: 100, type: 'rank', rewards: [{ id: 'gold', name: '金币', amount: 100 }] },
      { type: 'participation', rewards: [{ id: 'exp', name: '经验', amount: 50 }] }
    ]
  },
  {
    id: 'weekly_challenge',
    title: '每周挑战',
    description: '每周一次的高难度答题挑战',
    startTime: 0,
    endTime: Number.MAX_SAFE_INTEGER,
    questionCount: 20,
    timePerQuestion: 45,
    difficulty: 'medium',
    active: true,
    rewards: [
      { rank: 1, type: 'rank', rewards: [{ id: 'rare_box', name: '稀有宝盒', amount: 1 }] },
      { rank: 3, type: 'rank', rewards: [{ id: 'gold', name: '金币', amount: 2000 }] },
      { rank: 10, type: 'rank', rewards: [{ id: 'gold', name: '金币', amount: 500 }] },
      { type: 'participation', rewards: [{ id: 'exp', name: '经验', amount: 100 }] }
    ]
  },
  {
    id: 'expert_arena',
    title: '专家竞技场',
    description: '高难度题目，专家级别的挑战',
    startTime: 0,
    endTime: Number.MAX_SAFE_INTEGER,
    questionCount: 15,
    timePerQuestion: 60,
    difficulty: 'hard',
    active: true,
    rewards: [
      { rank: 1, type: 'rank', rewards: [{ id: 'legendary_box', name: '传奇宝盒', amount: 1 }] },
      { rank: 5, type: 'rank', rewards: [{ id: 'epic_box', name: '史诗宝盒', amount: 1 }] },
      { type: 'score', minScore: 300, rewards: [{ id: 'gold', name: '金币', amount: 800 }] }
    ]
  }
];

class QuizActivitySystem {
  private questions: Map<string, Question> = new Map();
  private activities: Map<string, QuizActivity> = new Map();
  private playerSessions: Map<string, PlayerQuizSession> = new Map();
  private leaderboards: Map<string, LeaderboardEntry[]> = new Map();
  
  constructor() {
    this.initDefaultData();
  }
  
  /**
   * 初始化默认数据
   */
  private initDefaultData(): void {
    // 初始化题目库
    for (const question of DEFAULT_QUESTIONS) {
      this.questions.set(question.id, question);
    }
    
    // 初始化活动
    for (const activity of DEFAULT_ACTIVITIES) {
      this.activities.set(activity.id, activity);
    }
  }
  
  // ==================== 题目库管理 ====================
  
  /**
   * 获取所有题目
   */
  getAllQuestions(): Question[] {
    return Array.from(this.questions.values());
  }
  
  /**
   * 获取题目详情
   */
  getQuestion(questionId: string): Question | undefined {
    return this.questions.get(questionId);
  }
  
  /**
   * 按难度筛选题目
   */
  getQuestionsByDifficulty(difficulty: QuestionDifficulty): Question[] {
    return Array.from(this.questions.values()).filter(q => q.difficulty === difficulty);
  }
  
  /**
   * 按分类筛选题目
   */
  getQuestionsByCategory(category: string): Question[] {
    return Array.from(this.questions.values()).filter(q => q.category === category);
  }
  
  /**
   * 随机获取题目
   */
  getRandomQuestions(count: number, difficulty?: QuestionDifficulty, categories?: string[]): Question[] {
    let pool = Array.from(this.questions.values());
    
    if (difficulty) {
      pool = pool.filter(q => q.difficulty === difficulty);
    }
    
    if (categories && categories.length > 0) {
      pool = pool.filter(q => categories.includes(q.category));
    }
    
    // 随机打乱
    pool = pool.sort(() => Math.random() - 0.5);
    
    return pool.slice(0, Math.min(count, pool.length));
  }
  
  /**
   * 添加题目
   */
  addQuestion(question: Question): { success: boolean; message: string; questionId?: string } {
    if (!question.id || !question.content || !question.options || !question.correctAnswers) {
      return { success: false, message: '题目信息不完整' };
    }
    
    if (this.questions.has(question.id)) {
      return { success: false, message: '题目ID已存在' };
    }
    
    // 默认分值
    if (!question.points) {
      const difficultyPoints: Record<QuestionDifficulty, number> = {
        'easy': 10,
        'medium': 20,
        'hard': 30,
        'expert': 50
      };
      question.points = difficultyPoints[question.difficulty] || 10;
    }
    
    this.questions.set(question.id, question);
    return { success: true, message: '题目添加成功', questionId: question.id };
  }
  
  /**
   * 更新题目
   */
  updateQuestion(questionId: string, updates: Partial<Question>): { success: boolean; message: string } {
    const question = this.questions.get(questionId);
    if (!question) {
      return { success: false, message: '题目不存在' };
    }
    
    // 合并更新
    Object.assign(question, updates);
    return { success: true, message: '题目更新成功' };
  }
  
  /**
   * 删除题目
   */
  deleteQuestion(questionId: string): { success: boolean; message: string } {
    if (!this.questions.has(questionId)) {
      return { success: false, message: '题目不存在' };
    }
    
    this.questions.delete(questionId);
    return { success: true, message: '题目删除成功' };
  }
  
  /**
   * 获取题目分类列表
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    for (const question of this.questions.values()) {
      categories.add(question.category);
    }
    return Array.from(categories);
  }
  
  // ==================== 活动管理 ====================
  
  /**
   * 获取所有活动
   */
  getAllActivities(): QuizActivity[] {
    return Array.from(this.activities.values());
  }
  
  /**
   * 获取活动详情
   */
  getActivity(activityId: string): QuizActivity | undefined {
    return this.activities.get(activityId);
  }
  
  /**
   * 获取当前可参加的活动
   */
  getActiveActivities(): QuizActivity[] {
    const now = Date.now();
    return Array.from(this.activities.values()).filter(
      a => a.active && now >= a.startTime && now <= a.endTime
    );
  }
  
  /**
   * 创建活动
   */
  createActivity(activity: QuizActivity): { success: boolean; message: string; activityId?: string } {
    if (!activity.id || !activity.title) {
      return { success: false, message: '活动信息不完整' };
    }
    
    if (this.activities.has(activity.id)) {
      return { success: false, message: '活动ID已存在' };
    }
    
    // 默认值
    if (!activity.questionCount) activity.questionCount = 10;
    if (!activity.timePerQuestion) activity.timePerQuestion = 30;
    if (!activity.rewards) activity.rewards = [];
    
    this.activities.set(activity.id, activity);
    return { success: true, message: '活动创建成功', activityId: activity.id };
  }
  
  /**
   * 更新活动
   */
  updateActivity(activityId: string, updates: Partial<QuizActivity>): { success: boolean; message: string } {
    const activity = this.activities.get(activityId);
    if (!activity) {
      return { success: false, message: '活动不存在' };
    }
    
    Object.assign(activity, updates);
    return { success: true, message: '活动更新成功' };
  }
  
  /**
   * 开启/关闭活动
   */
  toggleActivity(activityId: string, active: boolean): { success: boolean; message: string } {
    const activity = this.activities.get(activityId);
    if (!activity) {
      return { success: false, message: '活动不存在' };
    }
    
    activity.active = active;
    return { success: true, message: active ? '活动已开启' : '活动已关闭' };
  }
  
  // ==================== 玩家答题 ====================
  
  /**
   * 开始答题
   */
  startQuiz(playerId: string, activityId: string): {
    success: boolean;
    message: string;
    session?: PlayerQuizSession;
    questions?: Question[];
    timeLimit?: number;
  } {
    const activity = this.activities.get(activityId);
    if (!activity) {
      return { success: false, message: '活动不存在' };
    }
    
    // 检查活动是否开启
    const now = Date.now();
    if (!activity.active || now < activity.startTime || now > activity.endTime) {
      return { success: false, message: '活动未开启' };
    }
    
    // 检查人数限制
    if (activity.maxParticipants) {
      const currentParticipants = Array.from(this.playerSessions.values())
        .filter(s => s.activityId === activityId && s.status !== 'expired').length;
      if (currentParticipants >= activity.maxParticipants) {
        return { success: false, message: '活动人数已满' };
      }
    }
    
    // 检查是否已有进行中的答题
    const existingSession = this.getPlayerSession(playerId, activityId);
    if (existingSession && existingSession.status === 'in_progress') {
      return { success: false, message: '已有进行中的答题', session: existingSession };
    }
    
    // 获取题目
    const questions = this.getRandomQuestions(
      activity.questionCount,
      activity.difficulty,
      activity.categories
    );
    
    if (questions.length < activity.questionCount) {
      return { success: false, message: '题目数量不足' };
    }
    
    // 创建答题会话
    const session: PlayerQuizSession = {
      playerId,
      activityId,
      startTime: now,
      currentQuestionIndex: 0,
      answers: [],
      totalScore: 0,
      correctCount: 0,
      status: 'in_progress'
    };
    
    const sessionKey = this.getSessionKey(playerId, activityId);
    this.playerSessions.set(sessionKey, session);
    
    return {
      success: true,
      message: '答题开始',
      session,
      questions,
      timeLimit: activity.timePerQuestion * 1000
    };
  }
  
  /**
   * 提交答案
   */
  submitAnswer(
    playerId: string,
    activityId: string,
    questionId: string,
    selectedAnswers: string[]
  ): {
    success: boolean;
    message: string;
    result?: {
      isCorrect: boolean;
      score: number;
      correctAnswers: string[];
      explanation?: string;
      timeRemaining?: number;
    };
    nextQuestion?: Question;
    isCompleted?: boolean;
    finalScore?: number;
  } {
    const sessionKey = this.getSessionKey(playerId, activityId);
    const session = this.playerSessions.get(sessionKey);
    
    if (!session) {
      return { success: false, message: '没有进行中的答题' };
    }
    
    if (session.status !== 'in_progress') {
      return { success: false, message: '答题已结束' };
    }
    
    const activity = this.activities.get(activityId);
    if (!activity) {
      return { success: false, message: '活动不存在' };
    }
    
    // 获取题目
    const question = this.questions.get(questionId);
    if (!question) {
      return { success: false, message: '题目不存在' };
    }
    
    // 检查答题时间
    const questionStartTime = session.startTime + session.currentQuestionIndex * activity.timePerQuestion * 1000;
    const answerTime = Date.now() - questionStartTime;
    
    if (answerTime > activity.timePerQuestion * 1000) {
      // 超时
      session.answers.push({
        questionId,
        selectedAnswers: [],
        isCorrect: false,
        answerTime: activity.timePerQuestion * 1000,
        score: 0
      });
    } else {
      // 检查答案
      const isCorrect = this.checkAnswer(question, selectedAnswers);
      
      // 计算分数 (答对 + 速度加成)
      let score = 0;
      if (isCorrect) {
        // 基础分
        score = question.points;
        // 速度加成 (答得越快加成越多)
        const timeBonus = Math.floor(
          (1 - answerTime / (activity.timePerQuestion * 1000)) * question.points * 0.5
        );
        score += timeBonus;
        
        session.correctCount++;
      }
      
      session.totalScore += score;
      
      session.answers.push({
        questionId,
        selectedAnswers,
        isCorrect,
        answerTime,
        score
      });
    }
    
    // 移动到下一题
    session.currentQuestionIndex++;
    
    // 检查是否完成
    const isCompleted = session.currentQuestionIndex >= activity.questionCount;
    if (isCompleted) {
      session.status = 'completed';
      session.endTime = Date.now();
      
      // 更新排行榜
      this.updateLeaderboard(activityId, playerId, session);
    }
    
    // 获取下一题
    let nextQuestion: Question | undefined;
    let timeRemaining: number | undefined;
    
    if (!isCompleted) {
      nextQuestion = Array.from(this.questions.values()).find(
        q => q.id === session.answers[session.currentQuestionIndex]?.questionId
      ) || this.getRandomQuestions(1, activity.difficulty, activity.categories)[0];
      
      const nextQuestionStartTime = session.startTime + session.currentQuestionIndex * activity.timePerQuestion * 1000;
      timeRemaining = Math.max(0, activity.timePerQuestion * 1000 - (Date.now() - nextQuestionStartTime));
    }
    
    return {
      success: true,
      message: isCompleted ? '答题完成' : '答案提交成功',
      result: {
        isCorrect: session.answers[session.answers.length - 1].isCorrect,
        score: session.answers[session.answers.length - 1].score,
        correctAnswers: question.correctAnswers,
        explanation: question.explanation,
        timeRemaining
      },
      nextQuestion,
      isCompleted,
      finalScore: isCompleted ? session.totalScore : undefined
    };
  }
  
  /**
   * 检查答案是否正确
   */
  private checkAnswer(question: Question, selectedAnswers: string[]): boolean {
    if (question.type === 'single') {
      return selectedAnswers.length === 1 && 
             question.correctAnswers.includes(selectedAnswers[0]);
    } else {
      // 多选题需要完全匹配
      const sortedSelected = [...selectedAnswers].sort();
      const sortedCorrect = [...question.correctAnswers].sort();
      return sortedSelected.length === sortedCorrect.length &&
             sortedSelected.every((a, i) => a === sortedCorrect[i]);
    }
  }
  
  /**
   * 获取玩家当前答题会话
   */
  getPlayerSession(playerId: string, activityId: string): PlayerQuizSession | undefined {
    return this.playerSessions.get(this.getSessionKey(playerId, activityId));
  }
  
  /**
   * 获取会话Key
   */
  private getSessionKey(playerId: string, activityId: string): string {
    return `${playerId}:${activityId}`;
  }
  
  /**
   * 获取当前题目
   */
  getCurrentQuestion(playerId: string, activityId: string): {
    success: boolean;
    message: string;
    question?: Question;
    questionIndex?: number;
    totalQuestions?: number;
    timeRemaining?: number;
  } {
    const session = this.getPlayerSession(playerId, activityId);
    if (!session) {
      return { success: false, message: '没有进行中的答题' };
    }
    
    if (session.status !== 'in_progress') {
      return { success: false, message: '答题已结束' };
    }
    
    const activity = this.activities.get(activityId);
    if (!activity) {
      return { success: false, message: '活动不存在' };
    }
    
    // 找到当前题目
    const questionId = session.answers[session.currentQuestionIndex]?.questionId;
    const question = questionId ? this.questions.get(questionId) : undefined;
    
    // 计算剩余时间
    const questionStartTime = session.startTime + session.currentQuestionIndex * activity.timePerQuestion * 1000;
    const timeRemaining = Math.max(0, activity.timePerQuestion * 1000 - (Date.now() - questionStartTime));
    
    return {
      success: true,
      message: '获取成功',
      question,
      questionIndex: session.currentQuestionIndex + 1,
      totalQuestions: activity.questionCount,
      timeRemaining
    };
  }
  
  /**
   * 获取答题结果
   */
  getQuizResult(playerId: string, activityId: string): {
    success: boolean;
    message: string;
    summary?: PlayerQuizSummary;
  } {
    const session = this.getPlayerSession(playerId, activityId);
    if (!session) {
      return { success: false, message: '没有答题记录' };
    }
    
    if (session.status !== 'completed') {
      return { success: false, message: '答题未完成' };
    }
    
    const activity = this.activities.get(activityId);
    if (!activity) {
      return { success: false, message: '活动不存在' };
    }
    
    // 获取排名
    const leaderboard = this.getLeaderboard(activityId);
    const rank = leaderboard.findIndex(e => e.playerId === playerId) + 1;
    const totalParticipants = leaderboard.length;
    
    // 计算奖励
    const rewards = this.calculateRewards(activity, rank, session.totalScore);
    
    const summary: PlayerQuizSummary = {
      playerId,
      activityId,
      totalScore: session.totalScore,
      rank,
      totalParticipants,
      correctCount: session.correctCount,
      accuracy: session.correctCount / activity.questionCount,
      rewards
    };
    
    return {
      success: true,
      message: '获取成功',
      summary
    };
  }
  
  // ==================== 排行榜 ====================
  
  /**
   * 更新排行榜
   */
  private updateLeaderboard(activityId: string, playerId: string, session: PlayerQuizSession): void {
    const activity = this.activities.get(activityId);
    if (!activity) return;
    
    let leaderboard = this.leaderboards.get(activityId) || [];
    
    // 查找现有条目
    const existingIndex = leaderboard.findIndex(e => e.playerId === playerId);
    
    const avgAnswerTime = session.answers.reduce((sum, a) => sum + a.answerTime, 0) / session.answers.length;
    const accuracy = session.correctCount / activity.questionCount;
    
    const entry: LeaderboardEntry = {
      rank: 0, // 稍后计算
      playerId,
      score: session.totalScore,
      correctCount: session.correctCount,
      totalQuestions: activity.questionCount,
      accuracy,
      avgAnswerTime,
      lastUpdateTime: Date.now()
    };
    
    if (existingIndex >= 0) {
      // 更新已有记录
      leaderboard[existingIndex] = entry;
    } else {
      // 添加新记录
      leaderboard.push(entry);
    }
    
    // 按分数排序
    leaderboard.sort((a, b) => b.score - a.score);
    
    // 更新排名
    leaderboard.forEach((e, i) => e.rank = i + 1);
    
    this.leaderboards.set(activityId, leaderboard);
  }
  
  /**
   * 获取排行榜
   */
  getLeaderboard(activityId: string, limit?: number): LeaderboardEntry[] {
    let leaderboard = this.leaderboards.get(activityId) || [];
    
    if (limit) {
      leaderboard = leaderboard.slice(0, limit);
    }
    
    return leaderboard;
  }
  
  /**
   * 获取玩家排名
   */
  getPlayerRank(playerId: string, activityId: string): {
    success: boolean;
    message: string;
    rank?: number;
    totalParticipants?: number;
  } {
    const leaderboard = this.getLeaderboard(activityId);
    const rank = leaderboard.findIndex(e => e.playerId === playerId) + 1;
    
    if (rank === 0) {
      return { success: false, message: '未上榜' };
    }
    
    return {
      success: true,
      message: '获取成功',
      rank,
      totalParticipants: leaderboard.length
    };
  }
  
  // ==================== 奖励计算 ====================
  
  /**
   * 计算奖励
   */
  private calculateRewards(
    activity: QuizActivity,
    rank: number,
    score: number
  ): Array<{ id: string; name: string; amount: number }> {
    const rewards: Array<{ id: string; name: string; amount: number }> = [];
    
    for (const reward of activity.rewards) {
      if (reward.type === 'rank' && rank <= reward.rank) {
        rewards.push(...reward.rewards);
      } else if (reward.type === 'score' && reward.minScore && score >= reward.minScore) {
        rewards.push(...reward.rewards);
      } else if (reward.type === 'participation') {
        rewards.push(...reward.rewards);
      }
    }
    
    return rewards;
  }
  
  // ==================== 玩家数据 ====================
  
  /**
   * 获取玩家参与的所有活动
   */
  getPlayerActivities(playerId: string): Array<{
    activity: QuizActivity;
    session?: PlayerQuizSession;
    rank?: number;
  }> {
    const result: Array<{
      activity: QuizActivity;
      session?: PlayerQuizSession;
      rank?: number;
    }> = [];
    
    for (const activity of this.activities.values()) {
      const session = this.getPlayerSession(playerId, activity.id);
      let rank: number | undefined;
      
      if (session?.status === 'completed') {
        const leaderboard = this.getLeaderboard(activity.id);
        const rankIndex = leaderboard.findIndex(e => e.playerId === playerId);
        rank = rankIndex >= 0 ? rankIndex + 1 : undefined;
      }
      
      result.push({ activity, session, rank });
    }
    
    return result;
  }
  
  /**
   * 检查并标记超时答题
   */
  checkExpiredSessions(): number {
    let expiredCount = 0;
    const now = Date.now();
    
    for (const session of this.playerSessions.values()) {
      if (session.status === 'in_progress') {
        const activity = this.activities.get(session.activityId);
        if (activity) {
          const expectedEndTime = session.startTime + activity.questionCount * activity.timePerQuestion * 1000;
          
          if (now > expectedEndTime) {
            session.status = 'expired';
            session.endTime = expectedEndTime;
            
            // 更新排行榜
            this.updateLeaderboard(session.activityId, session.playerId, session);
            expiredCount++;
          }
        }
      }
    }
    
    return expiredCount;
  }
}

export const quizActivitySystem = new QuizActivitySystem();
export default QuizActivitySystem;
