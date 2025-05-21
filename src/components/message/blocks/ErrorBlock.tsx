import React from 'react';
import { Box, Typography, Alert, Link, Collapse, IconButton } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import type { ErrorMessageBlock } from '../../../shared/types/newMessage';
import { getErrorType } from '../../../shared/utils/error';

interface Props {
  block: ErrorMessageBlock;
  onRegenerate?: () => void;
}

/**
 * 错误块组件
 * 负责渲染错误信息
 */
const ErrorBlock: React.FC<Props> = ({ block, onRegenerate }) => {
  const [expanded, setExpanded] = React.useState(false);

  // HTTP错误状态码
  const HTTP_ERROR_CODES = [400, 401, 403, 404, 429, 500, 502, 503, 504];

  // 获取错误类型
  const errorType = block.error ? getErrorType(block.error) : 'unknown';

  // 获取错误状态码
  const errorStatus = block.error?.status || block.error?.code;

  // 获取错误消息
  const errorMessage = block.error?.message || block.message || '发生错误，请重试';

  // 获取错误详情
  const errorDetails = block.error?.details || block.details || '';

  // 获取错误建议
  const getErrorSuggestion = () => {
    // 如果是HTTP错误码
    if (errorStatus && HTTP_ERROR_CODES.includes(Number(errorStatus))) {
      // 根据HTTP状态码返回建议
      switch (Number(errorStatus)) {
        case 400: return '请求格式错误，请检查输入。';
        case 401: return '认证失败，请检查API密钥。';
        case 403: return '没有权限访问该资源。';
        case 404: return '请求的资源不存在。';
        case 429: return '请求频率过高，请稍后重试。';
        case 500: return '服务器内部错误，请稍后重试。';
        case 502: return '网关错误，请稍后重试。';
        case 503: return '服务不可用，请稍后重试。';
        case 504: return '网关超时，请稍后重试。';
        default: return `HTTP错误: ${errorStatus}`;
      }
    }

    // 根据错误类型提供建议
    switch (errorType) {
      case 'network':
        return '请检查您的网络连接，或稍后重试。';
      case 'auth':
        return '请检查您的API密钥或认证信息是否正确。';
      case 'timeout':
        return '请求超时，请稍后重试。';
      case 'rate_limit':
        return '请求频率过高，请稍后重试。';
      case 'server':
        return '服务器错误，请稍后重试。';
      case 'api':
        return 'API调用错误，请检查参数或稍后重试。';
      default:
        return '请尝试重新生成回复或联系支持团队。';
    }
  };

  // 切换展开/折叠状态
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  return (
    <Box sx={{ my: 1 }}>
      <Alert
        severity="error"
        variant="outlined"
        action={
          errorDetails ? (
            <IconButton
              aria-label={expanded ? "收起详情" : "展开详情"}
              size="small"
              onClick={toggleExpanded}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          ) : null
        }
      >
        <Typography variant="body2">
          {errorMessage}
        </Typography>

        <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
          {getErrorSuggestion()}
        </Typography>

        {errorStatus && (
          <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
            错误代码: {errorStatus}
          </Typography>
        )}

        <Collapse in={expanded} timeout="auto" unmountOnExit>
          {errorDetails && (
            <Box
              component="pre"
              sx={{
                mt: 1,
                p: 1,
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                borderRadius: 1,
                fontSize: '0.75rem',
                overflow: 'auto',
                maxHeight: '200px'
              }}
            >
              {errorDetails}
            </Box>
          )}
        </Collapse>

        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <Link
            component="button"
            variant="caption"
            onClick={() => {
              // 调用重新生成回调
              if (onRegenerate) {
                onRegenerate();
              }
            }}
            sx={{ mr: 1 }}
          >
            重新生成
          </Link>
        </Box>
      </Alert>
    </Box>
  );
};

export default React.memo(ErrorBlock);
