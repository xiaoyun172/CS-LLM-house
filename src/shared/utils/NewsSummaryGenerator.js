"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewsCategory = void 0;
exports.generateNewsSummary = generateNewsSummary;
exports.generateDetailedNewsSummary = generateDetailedNewsSummary;
/**
 * 新闻分类
 */
exports.NewsCategory = {
    DOMESTIC: '国内要闻',
    SOCIAL: '社会民生',
    ECONOMY_TECH: '经济与科技',
    INTERNATIONAL: '国际新闻',
    SPORT: '体育新闻',
    ENTERTAINMENT: '娱乐新闻',
    OTHER: '其他新闻'
};
// 关键词映射
var CATEGORY_KEYWORDS = (_a = {},
    _a[exports.NewsCategory.DOMESTIC] = [
        '中国', '国内', '大陆', '中共', '政府', '政策', '总理', '主席',
        '政协', '人大', '两会', '教育部', '财政部', '外交部', '发改委',
        '国务院', '党中央', '中央', '全国', '国家', '地方', '省', '自治区',
        '直辖市', '高考', '教育', '扶贫'
    ],
    _a[exports.NewsCategory.SOCIAL] = [
        '社会', '民生', '医疗', '健康', '事故', '案件', '纠纷', '疫情',
        '公共', '安全', '交通', '食品', '药品', '物价', '房价', '就业',
        '养老', '扶贫', '社保', '医保', '教育', '学校', '幼儿园', '大学',
        '小学', '中学', '高中', '义务教育', '学生', '老师', '爆炸', '坠亡'
    ],
    _a[exports.NewsCategory.ECONOMY_TECH] = [
        '经济', '金融', '股市', '股票', '基金', '债券', '银行', '保险',
        '科技', 'AI', '人工智能', '互联网', '5G', '芯片', '半导体',
        '软件', '硬件', '电商', '区块链', '比特币', '虚拟货币', '房地产',
        '物价', '通货膨胀', '通胀', '通缩', '贸易', '出口', '进口',
        '公司', '企业', '投资', '理财', '汽车', '电动车'
    ],
    _a[exports.NewsCategory.INTERNATIONAL] = [
        '国际', '全球', '世界', '美国', '日本', '俄罗斯', '欧盟', '联合国',
        '特朗普', '拜登', '俄乌', '中美', '中俄', '中日', '英国', '法国',
        '德国', '中东', '非洲', '南美', '北约', '欧洲', '亚洲', 'G7', 'G20'
    ],
    _a[exports.NewsCategory.SPORT] = [
        '体育', '足球', '篮球', '乒乓球', '羽毛球', '网球', 'NBA', 'CBA',
        '中超', '欧冠', '世界杯', '奥运会', '亚运会', '全运会', '运动员',
        '教练', '裁判', '冠军', '亚军', '季军', '比赛', '赛事', '联赛'
    ],
    _a[exports.NewsCategory.ENTERTAINMENT] = [
        '娱乐', '明星', '演员', '歌手', '导演', '电影', '电视剧', '综艺',
        '节目', '音乐', '演唱会', '颁奖', '艺人', '粉丝', '爆料', '绯闻',
        '八卦', '影视', '剧集', '票房', '流量'
    ],
    _a[exports.NewsCategory.OTHER] = [
        '其他', '杂项', '未分类'
    ],
    _a);
/**
 * 将结果分到特定的新闻分类
 */
function categorizeNewsResult(result) {
    if (!result) {
        return exports.NewsCategory.OTHER;
    }
    var _a = result.title, title = _a === void 0 ? '' : _a, _b = result.snippet, snippet = _b === void 0 ? '' : _b;
    var content = "".concat(title, " ").concat(snippet).toLowerCase();
    // 检查每个分类的关键词
    for (var _i = 0, _c = Object.keys(exports.NewsCategory); _i < _c.length; _i++) {
        var categoryKey = _c[_i];
        var categoryValue = exports.NewsCategory[categoryKey];
        for (var _d = 0, _e = CATEGORY_KEYWORDS[categoryValue]; _d < _e.length; _d++) {
            var keyword = _e[_d];
            if (content.includes(keyword.toLowerCase())) {
                return categoryValue;
            }
        }
    }
    // 默认返回其他分类
    return exports.NewsCategory.OTHER;
}
/**
 * 按新闻分类对结果进行分组
 */
function groupResultsByCategory(results) {
    var _a;
    var grouped = (_a = {},
        _a[exports.NewsCategory.DOMESTIC] = [],
        _a[exports.NewsCategory.SOCIAL] = [],
        _a[exports.NewsCategory.ECONOMY_TECH] = [],
        _a[exports.NewsCategory.INTERNATIONAL] = [],
        _a[exports.NewsCategory.SPORT] = [],
        _a[exports.NewsCategory.ENTERTAINMENT] = [],
        _a[exports.NewsCategory.OTHER] = [],
        _a);
    if (!Array.isArray(results)) {
        return grouped;
    }
    results.forEach(function (result) {
        if (result) {
            var category = categorizeNewsResult(result);
            grouped[category].push(result);
        }
    });
    return grouped;
}
/**
 * 获取当前日期的中文表示
 */
function getCurrentChineseDate() {
    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth() + 1;
    var day = now.getDate();
    // 获取星期几
    var weekDay = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()];
    return "".concat(year, "\u5E74").concat(month, "\u6708").concat(day, "\u65E5\uFF0C\u661F\u671F").concat(weekDay);
}
/**
 * 提取结果中的有用信息
 * @param result 搜索结果
 * @returns 提取的信息对象
 */
function extractNewsInfo(result) {
    if (!result) {
        return { title: '无标题', content: '', source: '未知来源', url: '' };
    }
    try {
        var title = result.title || '无标题';
        if (title.length > 80) { // 进一步缩短标题
            title = title.substring(0, 77) + '...';
        }
        title = title.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
        var content = '';
        if (result.snippet) {
            console.log('[NewsSummaryGenerator] Original snippet for title:', result.title, ':::', result.snippet);
            var decodedSnippet = result.snippet;
            try {
                var DOMElem = document.createElement('textarea');
                DOMElem.innerHTML = decodedSnippet;
                decodedSnippet = DOMElem.value;
                console.log('[NewsSummaryGenerator] Decoded snippet:', decodedSnippet);
            }
            catch (e) {
                console.error('[NewsSummaryGenerator] Error decoding HTML entities:', e);
                // Fallback to original snippet if decoding fails, decodedSnippet will retain its original value
            }
            content = decodedSnippet.trim();
            content = content.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
            if (content.length > 120) {
                content = content.substring(0, 117) + '...';
            }
        }
        var source = '未知来源';
        if (result.url) {
            try {
                var matches = result.url.match(/https?:\/\/(?:www\.)?([^\/]+)/i);
                source = matches ? matches[1] : '未知来源';
            }
            catch (_a) {
                source = '未知来源';
            }
        }
        var url = result.url || '';
        return { title: title, content: content, source: source, url: url };
    }
    catch (e) {
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
function generateNewsSummary(results, query) {
    console.log('[NewsSummaryGenerator] 生成摘要开始，结果数量:', results === null || results === void 0 ? void 0 : results.length);
    if (!results || !Array.isArray(results) || results.length === 0) {
        console.log('[NewsSummaryGenerator] 没有搜索结果');
        return "\u6CA1\u6709\u627E\u5230\u4E0E\"".concat(query || '您的查询', "\"\u76F8\u5173\u7684\u65B0\u95FB\u3002");
    }
    try {
        var groupedResults_1 = groupResultsByCategory(results);
        console.log('[NewsSummaryGenerator] 分类结果:', Object.keys(groupedResults_1).map(function (k) { var _a; return "".concat(k, ": ").concat(((_a = groupedResults_1[k]) === null || _a === void 0 ? void 0 : _a.length) || 0); }).join(', '));
        var summary_1 = "\u60A8\u597D\uFF01\u6839\u636E\u60A8\u63D0\u4F9B\u7684\u53C2\u8003\u8D44\u6599\uFF0C\u4ECA\u5929\u662F".concat(getCurrentChineseDate(), "\u3002\u4EE5\u4E0B\u662F\u4ECA\u5929\u7684\u4E00\u4E9B\u4E3B\u8981\u65B0\u95FB\uFF1A\n\n");
        var hasNews_1 = false;
        Object.keys(groupedResults_1).forEach(function (categoryKey) {
            var category = categoryKey;
            var categoryResults = groupedResults_1[category];
            if (!categoryResults || categoryResults.length === 0)
                return;
            hasNews_1 = true;
            console.log("[NewsSummaryGenerator] \u5904\u7406\u5206\u7C7B ".concat(category, "\uFF0C\u65B0\u95FB\u6570\u91CF: ").concat(categoryResults.length));
            // 使用星号和双等号作为分类标题的装饰
            summary_1 += "\n\u2605\u2605 ".concat(category, " \u2605\u2605\n");
            summary_1 += "".concat('='.repeat(category.length * 2 + 8), "\n\n");
            categoryResults.slice(0, 5).forEach(function (result, index) {
                var _a = extractNewsInfo(result), title = _a.title, content = _a.content, url = _a.url;
                // 使用数字+点+空格作为新闻条目的前缀，替代上标
                summary_1 += "".concat(index + 1, ". ");
                // 使用 [标题](URL) 格式显示链接
                if (url) {
                    summary_1 += "[".concat(title, "](").concat(url, ")\n");
                }
                else {
                    summary_1 += "".concat(title, "\n");
                }
                // 如果有内容摘要，添加缩进并用 "▶" 作为前缀
                if (content) {
                    summary_1 += "   \u25B6 ".concat(content, "\n");
                }
                // 在每个新闻条目之后添加一个空行
                summary_1 += '\n';
            });
        });
        if (!hasNews_1) {
            console.log('[NewsSummaryGenerator] 没有任何分类包含新闻');
            return "\u6CA1\u6709\u627E\u5230\u4E0E\"".concat(query || '您的查询', "\"\u76F8\u5173\u7684\u65B0\u95FB\u3002");
        }
        console.log('[NewsSummaryGenerator] 摘要生成完成，长度:', summary_1.length);
        return summary_1;
    }
    catch (error) {
        console.error('[NewsSummaryGenerator] 生成新闻摘要时发生错误:', error);
        return "\u62B1\u6B49\uFF0C\u751F\u6210\u65B0\u95FB\u6458\u8981\u65F6\u53D1\u751F\u4E86\u9519\u8BEF\u3002\u8BF7\u7A0D\u540E\u518D\u8BD5\u3002";
    }
}
/**
 * 生成带有详细分类的新闻摘要
 * @param results 搜索结果
 * @returns 更详细的新闻摘要
 */
function generateDetailedNewsSummary(results) {
    if (!results || !Array.isArray(results) || results.length === 0) {
        return "\u6CA1\u6709\u627E\u5230\u76F8\u5173\u7684\u65B0\u95FB\u3002";
    }
    try {
        var groupedResults_2 = groupResultsByCategory(results);
        var summary_2 = "\u60A8\u597D\uFF01\u6839\u636E\u60A8\u63D0\u4F9B\u7684\u53C2\u8003\u8D44\u6599\uFF0C\u4ECA\u5929\u662F".concat(getCurrentChineseDate(), "\u3002\u4EE5\u4E0B\u662F\u4ECA\u5929\u7684\u4E00\u4E9B\u4E3B\u8981\u65B0\u95FB\uFF1A\n\n");
        var hasNews_2 = false;
        Object.keys(groupedResults_2).forEach(function (categoryKey) {
            var category = categoryKey;
            var categoryResults = groupedResults_2[category];
            if (!categoryResults || categoryResults.length === 0)
                return;
            hasNews_2 = true;
            // 使用星号和双等号作为分类标题的装饰，与 generateNewsSummary 保持一致
            summary_2 += "\n\u2605\u2605 ".concat(category, " \u2605\u2605\n");
            summary_2 += "".concat('='.repeat(category.length * 2 + 8), "\n\n");
            categoryResults.slice(0, 5).forEach(function (result, index) {
                var _a = extractNewsInfo(result), title = _a.title, content = _a.content, source = _a.source, url = _a.url;
                // 使用数字+点+空格作为新闻条目的前缀，替代上标
                summary_2 += "".concat(index + 1, ". ");
                // 使用 [标题](URL) 格式显示链接
                if (url) {
                    summary_2 += "[".concat(title, "](").concat(url, ")\n");
                }
                else {
                    summary_2 += "".concat(title, "\n");
                }
                // 如果有内容摘要，添加缩进并用 "▶" 作为前缀
                if (content) {
                    summary_2 += "   \u25B6 ".concat(content, "\n");
                }
                // 添加来源信息，同样使用缩进和特殊字符
                summary_2 += "   \uD83D\uDCF0 \u6765\u6E90\uFF1A".concat(source, "\n");
                // 在每个新闻条目之后添加一个空行
                summary_2 += '\n';
            });
        });
        if (!hasNews_2) {
            return "\u6CA1\u6709\u627E\u5230\u76F8\u5173\u7684\u65B0\u95FB\u3002";
        }
        return summary_2;
    }
    catch (error) {
        console.error('生成详细新闻摘要时发生错误:', error);
        return "\u62B1\u6B49\uFF0C\u751F\u6210\u65B0\u95FB\u6458\u8981\u65F6\u53D1\u751F\u4E86\u9519\u8BEF\u3002\u8BF7\u7A0D\u540E\u518D\u8BD5\u3002";
    }
}
