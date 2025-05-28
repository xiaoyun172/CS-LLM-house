/**
 * 日期格式化工具函数
 */

/**
 * 获取格式化的日期，带星期
 * @param date 日期对象，默认为当前日期
 * @returns 格式化的日期字符串，例如"2025年5月28日，星期三"
 */
export function getFormattedDateWithWeekday(date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  // 获取星期几
  const weekDay = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
  
  return `${year}年${month}月${day}日，星期${weekDay}`;
}

/**
 * 获取格式化的日期和时间，带星期
 * @param date 日期对象，默认为当前日期
 * @returns 格式化的日期时间字符串，例如"2025年5月28日 14:30，星期三"
 */
export function getFormattedDateTimeWithWeekday(date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  // 获取星期几
  const weekDay = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
  
  return `${year}年${month}月${day}日 ${hours}:${minutes}，星期${weekDay}`;
}

/**
 * 获取相对时间描述
 * @param date 日期对象
 * @returns 相对时间描述，如"今天"、"昨天"、"3天前"等
 */
export function getRelativeTimeDescription(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return '今天';
  } else if (diffDays === 1) {
    return '昨天';
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  } else if (diffDays < 30) {
    const diffWeeks = Math.floor(diffDays / 7);
    return `${diffWeeks}周前`;
  } else if (diffDays < 365) {
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths}个月前`;
  } else {
    const diffYears = Math.floor(diffDays / 365);
    return `${diffYears}年前`;
  }
}

/**
 * 获取格式化的日期时间描述文本
 * @returns 格式化的当前时间描述，例如"现在的时间是2023年11月30日 星期四 14:30"
 */
export function getTimeDescription(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'long',
    hour12: false
  };
  const formattedDate = new Intl.DateTimeFormat('zh-CN', options).format(now);
  return `现在的时间是${formattedDate}。`;
} 