/**
 * 🔥 简化版代码高亮工具
 * 暂时使用简单的高亮实现，避免Shiki依赖问题
 */

/**
 * 简单的代码高亮实现
 * @param code 代码内容
 * @param language 语言
 * @param theme 主题
 * @returns 高亮后的 HTML
 */
export async function highlightCode(
  code: string,
  _language: string,
  theme: 'one-light' | 'material-theme-darker' = 'one-light'
): Promise<string> {
  try {
    // 暂时使用简单的 HTML 转义和基础样式
    const escapedCode = escapeHtml(code);
    const isDark = theme === 'material-theme-darker';

    const styles = isDark ? {
      backgroundColor: '#1e1e1e',
      color: '#e6e6e6',
      borderColor: '#404040'
    } : {
      backgroundColor: '#f8f8f8',
      color: '#2d3748',
      borderColor: '#d0d0d0'
    };

    return `
      <pre class="shiki-code-block" style="
        background-color: ${styles.backgroundColor};
        color: ${styles.color};
        border: 1px solid ${styles.borderColor};
        padding: 20px;
        border-radius: 8px;
        overflow: auto;
        font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Source Code Pro', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
        font-size: 14px;
        line-height: 1.5;
        margin: 0;
      "><code>${escapedCode}</code></pre>
    `;
  } catch (error) {
    console.error('代码高亮失败:', error);
    // 降级到简单的 pre/code 标签
    return `<pre class="shiki-fallback"><code>${escapeHtml(code)}</code></pre>`;
  }
}

/**
 * 获取代码的 token 信息（简化版）
 * @param code 代码内容
 * @param language 语言
 * @param theme 主题
 * @returns 空数组（暂不实现）
 */
export async function getCodeTokens(
  _code: string,
  _language: string,
  _theme: 'one-light' | 'material-theme-darker' = 'one-light'
): Promise<any[]> {
  // 暂时返回空数组
  return [];
}

/**
 * 转义 HTML 字符
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * 重置高亮器（暂不需要实现）
 */
export function resetShikiHighlighter(): void {
  // 暂不需要实现
}
