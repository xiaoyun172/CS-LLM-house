/**
 * API Key 错误处理测试组件
 * 用于测试 API Key 错误检测和处理功能
 */

import React, { useState } from 'react';
import { Box, Button, Typography, Alert } from '@mui/material';
import ErrorBlock from '../components/message/blocks/ErrorBlock';
import { MessageBlockType, MessageBlockStatus } from '../shared/types/newMessage';
import type { ErrorMessageBlock } from '../shared/types/newMessage';

const ApiKeyErrorTest: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);

  // 模拟不同类型的错误
  const testErrors = [
    {
      name: 'API Key 暂停错误 (403)',
      error: {
        status: 403,
        message: '403 Permission denied: Consumer \'api_key:AIzaSyCYGrFBKSI_DVeScYalisASSKWmQYHQXYw\' has been suspended.',
        code: 'PermissionDeniedError'
      }
    },
    {
      name: 'API Key 认证失败 (401)',
      error: {
        status: 401,
        message: '401 Unauthorized: Invalid API key provided',
        code: 'AuthenticationError'
      }
    },
    {
      name: '普通网络错误',
      error: {
        status: 500,
        message: '500 Internal Server Error: Something went wrong',
        code: 'InternalServerError'
      }
    },
    {
      name: '超时错误',
      error: {
        status: 408,
        message: 'Request timeout',
        code: 'TimeoutError'
      }
    }
  ];

  // 创建错误块
  const createErrorBlock = (error: any): ErrorMessageBlock => {
    return {
      id: `error-${Date.now()}-${Math.random()}`,
      messageId: 'test-message-id',
      type: MessageBlockType.ERROR,
      content: error.message,
      createdAt: new Date().toISOString(),
      status: MessageBlockStatus.ERROR,
      error: error
    };
  };

  // 测试错误检测
  const testErrorDetection = async () => {
    const { isApiKeyError } = await import('../shared/utils/apiKeyErrorHandler');
    
    const results: string[] = [];
    
    for (const testCase of testErrors) {
      const isApiKey = isApiKeyError(testCase.error);
      results.push(`${testCase.name}: ${isApiKey ? '✅ API Key 错误' : '❌ 非 API Key 错误'}`);
    }
    
    setTestResults(results);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        API Key 错误处理测试
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 3 }}>
        这个页面用于测试 API Key 错误的检测和处理功能。
      </Typography>

      <Box sx={{ mb: 3 }}>
        <Button 
          variant="contained" 
          onClick={testErrorDetection}
          sx={{ mr: 2 }}
        >
          测试错误检测
        </Button>
      </Box>

      {testResults.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            错误检测结果:
          </Typography>
          {testResults.map((result, index) => (
            <Alert key={index} severity="info" sx={{ mb: 1 }}>
              {result}
            </Alert>
          ))}
        </Box>
      )}

      <Typography variant="h6" gutterBottom>
        错误块渲染测试:
      </Typography>
      
      {testErrors.map((testCase, index) => (
        <Box key={index} sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            {testCase.name}
          </Typography>
          <ErrorBlock 
            block={createErrorBlock(testCase.error)}
            messageId="test-message-id"
            topicId="test-topic-id"
            onRegenerate={() => {
              console.log(`重新生成消息: ${testCase.name}`);
            }}
          />
        </Box>
      ))}

      <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
        <Typography variant="h6" gutterBottom>
          测试说明:
        </Typography>
        <Typography variant="body2" component="div">
          <ul>
            <li>API Key 错误 (403, 401) 应该显示 "检查配置" 和 "重试" 按钮</li>
            <li>普通错误应该显示 "重新生成" 链接</li>
            <li>点击 "检查配置" 应该触发配置提示事件</li>
            <li>点击 "重试" 应该调用重试函数</li>
          </ul>
        </Typography>
      </Box>
    </Box>
  );
};

export default ApiKeyErrorTest;
