import type { WebSearchResult } from '../types';

/**
 * 新闻分类
 */
export const NewsCategory = {
  DOMESTIC: '国内要闻',
  SOCIAL: '社会民生',
  ECONOMY_TECH: '经济与科技',
  INTERNATIONAL: '国际新闻',
  SPORT: '体育新闻',
  ENTERTAINMENT: '娱乐新闻',
  OTHER: '其他新闻'
} as const;

export type NewsCategoryType = typeof NewsCategory[keyof typeof NewsCategory];
export type NewsCategoryKey = keyof typeof NewsCategory;

// 关键词映射
const CATEGORY_KEYWORDS: Record<NewsCategoryType, string[]> = {
  [NewsCategory.DOMESTIC]: [
    '中国', '国内', '大陆', '中共', '政府', '政策', '总理', '主席', 
    '政协', '人大', '两会', '教育部', '财政部', '外交部', '发改委',
    '国务院', '党中央', '中央', '全国', '国家', '地方', '省', '自治区',
    '直辖市', '高考', '教育', '扶贫'
  ],
  [NewsCategory.SOCIAL]: [
    '社会', '民生', '医疗', '健康', '事故', '案件', '纠纷', '疫情',
    '公共', '安全', '交通', '食品', '药品', '物价', '房价', '就业', 
    '养老', '扶贫', '社保', '医保', '教育', '学校', '幼儿园', '大学',
    '小学', '中学', '高中', '义务教育', '学生', '老师', '爆炸', '坠亡'
  ],
  [NewsCategory.ECONOMY_TECH]: [
    '经济', '金融', '股市', '股票', '基金', '债券', '银行', '保险',
    '科技', 'AI', '人工智能', '互联网', '5G', '芯片', '半导体', 
    '软件', '硬件', '电商', '区块链', '比特币', '虚拟货币', '房地产',
    '物价', '通货膨胀', '通胀', '通缩', '贸易', '出口', '进口',
    '公司', '企业', '投资', '理财', '汽车', '电动车'
  ],
  [NewsCategory.INTERNATIONAL]: [
    '国际', '全球', '世界', '美国', '日本', '俄罗斯', '欧盟', '联合国',
    '特朗普', '拜登', '俄乌', '中美', '中俄', '中日', '英国', '法国',
    '德国', '中东', '非洲', '南美', '北约', '欧洲', '亚洲', 'G7', 'G20'
  ],
  [NewsCategory.SPORT]: [
    '体育', '足球', '篮球', '乒乓球', '羽毛球', '网球', 'NBA', 'CBA',
    '中超', '欧冠', '世界杯', '奥运会', '亚运会', '全运会', '运动员',
    '教练', '裁判', '冠军', '亚军', '季军', '比赛', '赛事', '联赛'
  ],
  [NewsCategory.ENTERTAINMENT]: [
    '娱乐', '明星', '演员', '歌手', '导演', '电影', '电视剧', '综艺',
    '节目', '音乐', '演唱会', '颁奖', '艺人', '粉丝', '爆料', '绯闻',
    '八卦', '影视', '剧集', '票房', '流量'
  ],
  [NewsCategory.OTHER]: [
    '其他', '杂项', '未分类'
  ]
};

/**
 * 将结果分到特定的新闻分类
 */
function categorizeNewsResult(result: WebSearchResult): NewsCategoryType {
  if (!result) {
    return NewsCategory.OTHER;
  }
  
  const { title = '', snippet = '' } = result;
  const content = `${title} ${snippet}`.toLowerCase();

  // 检查每个分类的关键词
  for (const categoryKey of Object.keys(NewsCategory) as NewsCategoryKey[]) {
    const categoryValue = NewsCategory[categoryKey];
    for (const keyword of CATEGORY_KEYWORDS[categoryValue]) {
      if (content.includes(keyword.toLowerCase())) {
        return categoryValue;
      }
    }
  }

  // 默认返回其他分类
  return NewsCategory.OTHER;
}

/**
 * 按新闻分类对结果进行分组
 */
function groupResultsByCategory(results: WebSearchResult[]): Record<NewsCategoryType, WebSearchResult[]> {
  const grouped: Record<NewsCategoryType, WebSearchResult[]> = {
    [NewsCategory.DOMESTIC]: [],
    [NewsCategory.SOCIAL]: [],
    [NewsCategory.ECONOMY_TECH]: [],
    [NewsCategory.INTERNATIONAL]: [],
    [NewsCategory.SPORT]: [],
    [NewsCategory.ENTERTAINMENT]: [],
    [NewsCategory.OTHER]: []
  };

  if (!Array.isArray(results)) {
    return grouped;
  }

  results.forEach(result => {
    if (result) {
      const category = categorizeNewsResult(result);
      grouped[category].push(result);
    }
  });

  return grouped;
}

/**
 * 获取当前日期的中文表示
 */
function getCurrentChineseDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  
  // 获取星期几
  const weekDay = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()];
  
  return `${year}年${month}月${day}日，星期${weekDay}`;
}

/**
 * 提取结果中的有用信息
 * @param result 搜索结果
 * @returns 提取的信息对象
 */
function extractNewsInfo(result: WebSearchResult): { 
  title: string, 
  content: string, 
  source: string, 
  url: string
} {
  if (!result) {
    return { title: '无标题', content: '', source: '未知来源', url: '' };
  }
  
  try {
    // 处理标题
    let title = result.title || '无标题';
    
    // 清理标题中的控制字符和不可打印字符
    title = title.replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\uFEFF]/g, '');
    
    // 替换HTML实体
    title = title.replace(/&[a-zA-Z]+;|&#[0-9]+;/g, ' ');
    
    // 规范化空白字符
    title = title.replace(/\s+/g, ' ').trim();
    
    // 如果标题太长，截断它
    if (title.length > 80) {
      title = title.substring(0, 77) + '...';
    }
    
    // 处理内容摘要
    let content = '';
    
    if (result.snippet) {
      content = result.snippet.trim();
      
      // 清理摘要中的控制字符和不可打印字符
      content = content.replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\uFEFF]/g, '');
      
      // 规范化空白字符
      content = content.replace(/\s+/g, ' ').trim();
      
      if (content.length > 120) {
        content = content.substring(0, 117) + '...';
      }
    }

    // 处理来源
    let source = '未知来源';
    if (result.url) {
      try {
        const matches = result.url.match(/https?:\/\/(?:www\.)?([^\/]+)/i);
        source = matches ? matches[1] : '未知来源';
      } catch {
        source = '未知来源';
      }
    }
    
    const url = result.url || '';

    return { title, content, source, url };
  } catch (e) {
    console.error('提取新闻信息时出错:', e);
    return { title: '无法解析的标题', content: '', source: '未知来源', url: '' };
  }
}

/**
 * 生成新闻摘要
 * @param results 搜索结果
 * @param query 搜索查询
 * @returns 格式化的新闻摘要字符串
 */
export function generateNewsSummary(results: WebSearchResult[], query?: string): string {
  console.log('[NewsSummaryGenerator] 生成摘要开始，结果数量:', results?.length);
  if (!results || !Array.isArray(results) || results.length === 0) {
    console.log('[NewsSummaryGenerator] 没有搜索结果');
    return `没有找到与"${query || '您的查询'}"相关的新闻。`;
  }
  try {
    const groupedResults = groupResultsByCategory(results);
    console.log('[NewsSummaryGenerator] 分类结果:', Object.keys(groupedResults).map(k => 
      `${k}: ${groupedResults[k as NewsCategoryType]?.length || 0}`).join(', '));
    
    let summary = `您好！根据您提供的参考资料，今天是${getCurrentChineseDate()}。以下是今天的一些主要新闻：\n\n`;
    let hasNews = false;
    
    Object.keys(groupedResults).forEach((categoryKey) => {
      const category = categoryKey as NewsCategoryType;
      const categoryResults = groupedResults[category];
      if (!categoryResults || categoryResults.length === 0) return;
      
      hasNews = true;
      console.log(`[NewsSummaryGenerator] 处理分类 ${category}，新闻数量: ${categoryResults.length}`);
      
      // 使用简单的分隔线和纯文本标题
      summary += `== ${category} ==\n\n`;
      
      categoryResults.slice(0, 5).forEach((result, index) => {
        const { title, content, source } = extractNewsInfo(result);
        
        // 使用数字+点作为新闻条目的前缀
        summary += `${index + 1}. ${title}\n`;
        
        // 只有当内容不为空时才显示摘要
        if (content) {
          summary += `   ${content}\n`;
        }
        
        // 添加来源信息
        summary += `   来源: ${source}\n`;
        
        // 在每个新闻条目之后添加一个空行
        summary += '\n';
      });
    });
    
    if (!hasNews) {
      console.log('[NewsSummaryGenerator] 没有任何分类包含新闻');
      return `没有找到与"${query || '您的查询'}"相关的新闻。`;
    }
    
    console.log('[NewsSummaryGenerator] 摘要生成完成，长度:', summary.length);
    return summary;
  } catch (error) {
    console.error('[NewsSummaryGenerator] 生成新闻摘要时发生错误:', error);
    return `抱歉，生成新闻摘要时发生了错误。请稍后再试。`;
  }
}

/**
 * 生成带有详细分类的新闻摘要
 * @param results 搜索结果
 * @returns 更详细的新闻摘要
 */
export function generateDetailedNewsSummary(results: WebSearchResult[]): string {
  if (!results || !Array.isArray(results) || results.length === 0) {
    return `没有找到相关的新闻。`;
  }
  try {
    const groupedResults = groupResultsByCategory(results);
    let summary = `您好！根据您提供的参考资料，今天是${getCurrentChineseDate()}。以下是今天的一些主要新闻：\n\n`;
    let hasNews = false;
    
    Object.keys(groupedResults).forEach((categoryKey) => {
      const category = categoryKey as NewsCategoryType;
      const categoryResults = groupedResults[category];
      if (!categoryResults || categoryResults.length === 0) return;
      
      hasNews = true;
      
      // 使用简单的分隔线和纯文本标题，与generateNewsSummary保持一致
      summary += `== ${category} ==\n\n`;
      
      categoryResults.slice(0, 5).forEach((result, index) => {
        const { title, content, source, url } = extractNewsInfo(result);
        
        // 使用数字+点作为新闻条目的前缀
        summary += `${index + 1}. ${title}\n`;
        
        // 只有当内容不为空时才显示摘要
        if (content) {
          summary += `   ${content}\n`;
        }
        
        // 添加来源信息
        summary += `   来源: ${source}\n`;
        
        // 只有当URL有效且不是来源的一部分时才显示
        if (url && !url.includes(source)) {
          summary += `   网址: ${url}\n`;
        }
        
        // 在每个新闻条目之后添加一个空行
        summary += '\n';
      });
    });
    
    if (!hasNews) {
      return `没有找到相关的新闻。`;
    }
    return summary;
  } catch (error) {
    console.error('生成详细新闻摘要时发生错误:', error);
    return `抱歉，生成新闻摘要时发生了错误。请稍后再试。`;
  }
} 