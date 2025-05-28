import type { WebSearchResult } from '../types';

// 搜索结果分类常量
export const SEARCH_CATEGORIES = {
  NEWS: '新闻',
  ENCYCLOPEDIA: '百科',
  OFFICIAL: '官方网站',
  SOCIAL: '社交媒体',
  BLOG: '博客',
  OTHER: '其他',
};

// 分类顺序
export const CATEGORY_ORDER = [
  SEARCH_CATEGORIES.NEWS,
  SEARCH_CATEGORIES.ENCYCLOPEDIA,
  SEARCH_CATEGORIES.OFFICIAL,
  SEARCH_CATEGORIES.SOCIAL,
  SEARCH_CATEGORIES.BLOG,
  SEARCH_CATEGORIES.OTHER
];

// URL关键词映射表
const URL_CATEGORY_MAPPING = {
  [SEARCH_CATEGORIES.NEWS]: [
    'news', 'sina.com.cn', '163.com', 'sohu.com', 'xinhua', 'people.com.cn',
    'cctv.com', 'chinadaily', 'qq.com/news', 'thepaper.cn', 'huanqiu',
    'zaobao', 'caixin', 'wsj', 'nytimes', 'reuters', 'bloomberg', 'bbc',
    'cnn', 'ft.com', 'cnbc', 'economist'
  ],
  [SEARCH_CATEGORIES.ENCYCLOPEDIA]: [
    'wiki', 'baidu.com/item', 'baike', 'zhihu.com', 'encyclopedia',
    'zhidao.baidu', 'wenwen.sogou', 'wukong.com', 'quora.com', 'stackexchange'
  ],
  [SEARCH_CATEGORIES.SOCIAL]: [
    'weibo.com', 'twitter.com', 'facebook.com', 'instagram', 'douyin', 
    'tiktok', 'bilibili', 'youtube', 'xiaohongshu', 'linkedin',
    't.qq.com', 'v.qq.com', 'kuaishou', 'pinterest'
  ],
  [SEARCH_CATEGORIES.OFFICIAL]: [
    'gov.cn', 'edu.cn', '.gov', '.edu', '.org', '.ac.cn', 'edu.tw', 'gov.tw',
    'go.jp', 'go.kr', 'europa.eu', 'mil', 'int', 'moe.gov', 'who.int', 'un.org'
  ],
  [SEARCH_CATEGORIES.BLOG]: [
    'blog', 'medium.com', 'cnblogs', 'csdn.net', 'jianshu.com',
    'zhihu.com/column', 'zhuanlan.zhihu', 'wordpress', 'tumblr',
    'substack', 'blogger', 'segmentfault', 'juejin'
  ]
};

/**
 * 根据URL判断搜索结果的分类
 */
export function categorizeSearchResult(result: WebSearchResult): string {
  if (!result || !result.url) {
    return SEARCH_CATEGORIES.OTHER;
  }

  const url = result.url.toLowerCase();
  
  // 检查每个分类的关键词
  for (const category of Object.keys(URL_CATEGORY_MAPPING)) {
    for (const keyword of URL_CATEGORY_MAPPING[category as keyof typeof URL_CATEGORY_MAPPING]) {
      if (url.includes(keyword)) {
        return category;
      }
    }
  }
  
  return SEARCH_CATEGORIES.OTHER;
}

/**
 * 对搜索结果进行分类
 */
export function categorizeSearchResults(results: WebSearchResult[]): Record<string, WebSearchResult[]> {
  const categorized: Record<string, WebSearchResult[]> = {};
  
  // 初始化分类
  CATEGORY_ORDER.forEach(category => {
    categorized[category] = [];
  });
  
  // 分类每个结果
  results.forEach(result => {
    const category = categorizeSearchResult(result);
    categorized[category].push(result);
  });
  
  return categorized;
}

/**
 * 获取非空分类的排序列表
 */
export function getNonEmptyCategories(categorized: Record<string, WebSearchResult[]>): string[] {
  return CATEGORY_ORDER.filter(category => 
    categorized[category] && categorized[category].length > 0
  );
} 