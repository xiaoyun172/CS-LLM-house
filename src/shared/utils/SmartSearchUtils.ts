/**
 * 智能搜索工具类
 * 用于分析用户输入，判断是否需要进行网络搜索
 */

// 搜索触发词和模式
const SEARCH_TRIGGERS = {
  // 问题性词汇
  QUESTION_WORDS: [
    '什么是', '什么叫', '如何', '怎么', '为什么', '谁是', '何时', '哪里', 
    '多少', '几个', '几种', '哪些', '哪个', '什么时候', '有多少', 
    '是什么', '能否', '可以吗', '是否', '能不能', '定义是什么', 
    'what is', 'how to', 'why', 'who is', 'when', 'where', 
    'how many', 'how much', 'which', 'what are', 'can i', 'is it'
  ],
  
  // 时效性词汇
  TIME_SENSITIVE: [
    '最新', '最近', '今天', '昨天', '上周', '本月', '今年', '现在', 
    '目前', '当前', '最近发布', '最新消息', '最新进展', '最新研究',
    'latest', 'recent', 'today', 'yesterday', 'this week', 'this month', 
    'this year', 'now', 'current', 'newly'
  ],
  
  // 事实性查询词汇
  FACTUAL_QUERIES: [
    '价格', '排名', '数据', '统计', '人口', '天气', '股价', '汇率', 
    '多少钱', '什么时间', '发生了什么', '在哪里', '地址', '电话',
    'price', 'ranking', 'data', 'statistics', 'population', 'weather', 
    'stock price', 'exchange rate', 'how much', 'what time', 'what happened', 
    'where is', 'address', 'phone number'
  ],
  
  // 实体名词
  ENTITIES: [
    '公司', '产品', '人物', '地点', '组织', '事件', '电影', '书籍', 
    '游戏', '软件', '应用', '技术', '行业', '学校', '医院',
    'company', 'product', 'person', 'place', 'organization', 'event', 
    'movie', 'book', 'game', 'software', 'app', 'technology', 'industry', 
    'school', 'hospital'
  ],
  
  // 明确搜索意图词汇
  EXPLICIT_SEARCH: [
    '搜索', '查找', '查询', '查一下', '了解', '搜一下', '帮我找', 
    '百度', '谷歌', '必应', '网上查', '网络搜索', '信息',
    'search', 'find', 'query', 'look up', 'learn about', 'search for', 
    'help me find', 'google', 'bing', 'baidu', 'online', 'information'
  ]
};

// 不需要搜索的模式
const NON_SEARCH_PATTERNS = [
  // 指令性
  '帮我写', '请写', '写一个', '生成', '创建', '设计', '制作',
  'write', 'generate', 'create', 'design', 'make', 'develop',
  
  // 对话性
  '你好', '嗨', '你是谁', '你能做什么', '谢谢', '感谢',
  'hello', 'hi', 'who are you', 'what can you do', 'thanks', 'thank you',
  
  // 编程相关
  '代码', '函数', '类', '方法', '算法', '编程', '调试', '错误',
  'code', 'function', 'class', 'method', 'algorithm', 'programming', 'debug', 'error',
  
  // 推理性
  '思考', '分析', '评估', '判断', '比较', '评价',
  'think', 'analyze', 'evaluate', 'judge', 'compare', 'assess'
];

// 预先编译正则表达式用于提高匹配效率
const EXPLICIT_SEARCH_REGEX = new RegExp(
  SEARCH_TRIGGERS.EXPLICIT_SEARCH.map(term => `\\b${term.toLowerCase()}\\b`).join('|'), 
  'i'
);

/**
 * 判断文本是否需要进行网络搜索
 * @param text 用户输入文本
 * @param triggerThreshold 触发搜索所需的最小类别匹配数量（1=高敏感度，2=中敏感度，3=低敏感度）
 * @returns {boolean} 是否需要搜索
 */
export function shouldPerformSearch(text: string, triggerThreshold: number = 2): boolean {
  // 短文本快速跳过
  if (text.length < 6) {
    return false;
  }
  
  // 将文本转换为小写进行匹配
  const lowerText = text.toLowerCase();
  
  // 快速路径：检查明确的搜索意图
  if (EXPLICIT_SEARCH_REGEX.test(lowerText)) {
    return true;
  }
  
  // 快速路径：对于短查询，检查是否为时效性词汇 (高优先级)
  if (text.length < 15 && triggerThreshold <= 2) {
    for (const term of SEARCH_TRIGGERS.TIME_SENSITIVE) {
      if (lowerText.includes(term.toLowerCase())) {
        return true;
      }
    }
  }
  
  // 检查是否包含非搜索模式
  for (const pattern of NON_SEARCH_PATTERNS) {
    if (lowerText.includes(pattern.toLowerCase())) {
      return false;
    }
  }
  
  // 优化：根据阈值动态调整检查策略
  let triggerCount = 0;
  const categoriesToCheck = [];
  
  // 根据不同阈值优先检查不同类别
  if (triggerThreshold === 1) { // 高敏感度：任何一个触发器匹配都执行搜索
    // 先检查高频触发类别
    categoriesToCheck.push('QUESTION_WORDS', 'TIME_SENSITIVE', 'FACTUAL_QUERIES', 'ENTITIES');
  } else if (triggerThreshold === 2) { // 中等敏感度：需要两个类别匹配
    // 先检查最可能触发的类别
    categoriesToCheck.push('QUESTION_WORDS', 'TIME_SENSITIVE', 'FACTUAL_QUERIES', 'ENTITIES');
  } else { // 低敏感度：需要三个或更多类别匹配
    // 按照可能性顺序检查所有类别
    categoriesToCheck.push('QUESTION_WORDS', 'FACTUAL_QUERIES', 'TIME_SENSITIVE', 'ENTITIES');
  }
  
  // 根据优先级检查各类别
  for (const category of categoriesToCheck) {
    const triggers = SEARCH_TRIGGERS[category as keyof typeof SEARCH_TRIGGERS];
    for (const trigger of triggers) {
      if (lowerText.includes(trigger.toLowerCase())) {
        triggerCount++;
        // 如果已达到阈值，可以提前返回
        if (triggerCount >= triggerThreshold) {
          return true;
        }
        // 一个类别只计算一次匹配，跳出内层循环
        break;
      }
    }
  }
  
  return false;
}

/**
 * 提取搜索查询关键词
 * 如果原始查询太长或包含不必要的词语，可以提取关键部分作为搜索查询
 * @param text 原始用户输入
 * @returns {string} 优化后的搜索查询
 */
export function extractSearchQuery(text: string): string {
  // 基本实现：直接返回原文本，未来可以实现更复杂的提取逻辑
  return text;
}

/**
 * 判断AI回复是否表明需要更多最新信息
 * 用于判断AI在回复中是否表示需要最新信息，例如"我的信息可能过时"等
 * @param aiResponse AI的回复内容
 * @returns {boolean} 是否需要搜索补充
 */
export function aiNeedsMoreInfo(aiResponse: string): boolean {
  const lowerResponse = aiResponse.toLowerCase();
  
  // 检测AI是否表示需要更多最新信息的短语
  const needInfoPhrases = [
    '我的信息可能过时',
    '我的知识截止于',
    '我没有最新的信息',
    '我不确定最新的',
    '可能有更新的信息',
    '我不知道最近的',
    '我无法访问最新',
    '我没有关于这个的信息',
    '我无法提供准确的',
    '我的训练数据截止于',
    'my information may be outdated',
    'my knowledge cutoff is',
    'i don\'t have the latest',
    'i\'m not sure about the most recent',
    'there might be newer information',
    'i don\'t know recent',
    'i cannot access the latest',
    'i don\'t have information about this',
    'i cannot provide accurate',
    'my training data cuts off'
  ];
  
  return needInfoPhrases.some(phrase => lowerResponse.includes(phrase.toLowerCase()));
} 