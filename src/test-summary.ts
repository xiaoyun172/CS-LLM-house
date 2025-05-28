import { generateNewsSummary, generateDetailedNewsSummary } from './shared/utils/NewsSummaryGenerator';
import type { WebSearchResult } from './shared/types';

// 创建一些模拟的搜索结果
const mockResults: WebSearchResult[] = [
  {
    id: '1',
    title: '中国宣布新的经济政策',
    snippet: '中国政府宣布了一系列新的经济刺激政策，旨在促进国内消费和稳定经济增长。专家认为这些政策将对全球经济产生积极影响。',
    url: 'https://example.com/news/china-economy',
    timestamp: new Date().toISOString(),
    provider: 'mock-provider'
  },
  {
    id: '2',
    title: '全球气候变化会议在巴黎举行',
    snippet: '来自全球150个国家的代表齐聚巴黎，讨论应对气候变化的新措施。此次会议被认为是近年来最重要的气候峰会之一。',
    url: 'https://example.com/news/climate-change',
    timestamp: new Date().toISOString(),
    provider: 'mock-provider'
  },
  {
    id: '3',
    title: '新型人工智能技术取得突破',
    snippet: '研究人员开发出新一代AI模型，能够更好地理解和生成人类语言。这一技术突破可能彻底改变人机交互方式。',
    url: 'https://example.com/news/ai-breakthrough',
    timestamp: new Date().toISOString(),
    provider: 'mock-provider'
  },
  {
    id: '4',
    title: '全国高考成绩公布，北京平均分创新高',
    snippet: '2023年全国高考成绩今日公布，北京地区平均分再创历史新高。教育部表示将继续推进教育公平和减负增效。',
    url: 'https://example.com/news/gaokao-results',
    timestamp: new Date().toISOString(),
    provider: 'mock-provider'
  },
  {
    id: '5',
    title: '世界杯预选赛：中国队2:0战胜韩国队',
    snippet: '在昨晚举行的世界杯预选赛中，中国队以2:0的比分战胜韩国队，创造了历史性突破。球迷们纷纷表示欢欣鼓舞。',
    url: 'https://example.com/news/china-vs-korea',
    timestamp: new Date().toISOString(),
    provider: 'mock-provider'
  }
];

// 生成简单摘要
console.log('=== 简单新闻摘要 ===');
console.log(generateNewsSummary(mockResults));
console.log('\n\n');

// 生成详细摘要
console.log('=== 详细新闻摘要 ===');
console.log(generateDetailedNewsSummary(mockResults)); 