import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Switch,
  FormControlLabel,
  RadioGroup,
  Radio,
  FormControl,
  Tooltip,
  IconButton,
  Alert
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { SmartSearchSensitivity } from '../../pages/ChatPage/hooks/useChatFeatures';
import type { SmartSearchSensitivityType } from '../../pages/ChatPage/hooks/useChatFeatures';

/**
 * 智能搜索设置组件
 * 用于配置智能搜索的相关选项
 */
const SmartSearchSettings: React.FC = () => {
  // 从localStorage读取初始状态
  const [smartSearchEnabled, setSmartSearchEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('smart-search-enabled');
    return saved !== null ? JSON.parse(saved) : false; // 默认禁用
  });
  
  // 搜索结果是否自动发送给AI
  const [sendSearchToAI, setSendSearchToAI] = useState<boolean>(() => {
    const saved = localStorage.getItem('send-search-to-ai');
    return saved !== null ? JSON.parse(saved) : true; // 默认启用
  });
  
  // 是否同时显示搜索结果和AI分析
  const [showBothResults, setShowBothResults] = useState<boolean>(() => {
    const saved = localStorage.getItem('show-both-results');
    return saved !== null ? JSON.parse(saved) : false; // 默认不启用
  });
  
  // 智能搜索敏感度
  const [sensitivity, setSensitivity] = useState<SmartSearchSensitivityType>(() => {
    const saved = localStorage.getItem('smart-search-sensitivity');
    return (saved as SmartSearchSensitivityType) || SmartSearchSensitivity.MEDIUM; // 默认中等敏感度
  });
  
  // 是否使用后台处理
  const [useBackendProcessing, setUseBackendProcessing] = useState<boolean>(() => {
    const saved = localStorage.getItem('use-backend-processing');
    return saved !== null ? JSON.parse(saved) : true; // 默认启用
  });
  
  // 是否包含实时时间信息
  const [includeRealTimeInfo, setIncludeRealTimeInfo] = useState<boolean>(() => {
    const saved = localStorage.getItem('include-real-time-info');
    return saved !== null ? JSON.parse(saved) : true; // 默认启用
  });
  
  // 显示设置已保存的提示
  const [showSaved, setShowSaved] = useState(false);

  // 处理智能搜索启用/禁用切换
  const handleToggleSmartSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;
    setSmartSearchEnabled(newValue);
    localStorage.setItem('smart-search-enabled', JSON.stringify(newValue));
    
    // 显示保存成功提示
    showSavedMessage();
  };
  
  // 处理搜索结果自动发送给AI切换
  const handleToggleSendToAI = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;
    setSendSearchToAI(newValue);
    localStorage.setItem('send-search-to-ai', JSON.stringify(newValue));
    
    // 显示保存成功提示
    showSavedMessage();
  };
  
  // 处理同时显示搜索结果和AI分析切换
  const handleToggleShowBothResults = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;
    setShowBothResults(newValue);
    localStorage.setItem('show-both-results', JSON.stringify(newValue));
    
    // 同时启用发送搜索结果给AI（这是必要的，因为需要AI分析）
    if (newValue && !sendSearchToAI) {
      setSendSearchToAI(true);
      localStorage.setItem('send-search-to-ai', JSON.stringify(true));
    }
    
    // 显示保存成功提示
    showSavedMessage();
  };
  
  // 处理敏感度变更
  const handleSensitivityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value as SmartSearchSensitivityType;
    setSensitivity(value);
    localStorage.setItem('smart-search-sensitivity', value);
    
    // 显示保存成功提示
    showSavedMessage();
  };
  
  // 处理后台处理切换
  const handleToggleBackendProcessing = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;
    setUseBackendProcessing(newValue);
    localStorage.setItem('use-backend-processing', JSON.stringify(newValue));
    
    // 显示保存成功提示
    showSavedMessage();
  };
  
  // 处理实时时间信息切换
  const handleToggleRealTimeInfo = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;
    setIncludeRealTimeInfo(newValue);
    localStorage.setItem('include-real-time-info', JSON.stringify(newValue));
    
    // 显示保存成功提示
    showSavedMessage();
  };
  
  // 显示保存成功提示，并在2秒后隐藏
  const showSavedMessage = () => {
    setShowSaved(true);
    setTimeout(() => {
      setShowSaved(false);
    }, 2000);
  };

  return (
    <Box sx={{ padding: 3 }}>
      {/* 智能搜索开关 */}
      <Paper elevation={0} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight="600">
            智能搜索
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={smartSearchEnabled}
                onChange={handleToggleSmartSearch}
                color="primary"
              />
            }
            label={smartSearchEnabled ? "已启用" : "已禁用"}
            labelPlacement="start"
          />
        </Box>
        <Typography variant="body2" color="text.secondary" paragraph>
          智能搜索可以自动分析您的问题，并判断是否需要进行网络搜索以获取最新信息。
        </Typography>
      </Paper>
      
      {/* 智能搜索敏感度 */}
      <Paper elevation={0} sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight="600" gutterBottom>
          搜索敏感度
          <Tooltip title="调整智能搜索触发的敏感程度。敏感度越高，越容易触发搜索，但可能会有误触发。敏感度越低，触发条件更严格，但可能会错过一些应该搜索的情况。">
            <IconButton size="small" sx={{ ml: 1 }}>
              <HelpOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
        <FormControl component="fieldset">
          <RadioGroup
            name="sensitivity"
            value={sensitivity}
            onChange={handleSensitivityChange}
          >
            <FormControlLabel 
              value={SmartSearchSensitivity.HIGH} 
              control={<Radio />} 
              label="高敏感度 - 更容易触发搜索，适合需要大量实时信息的场景" 
            />
            <FormControlLabel 
              value={SmartSearchSensitivity.MEDIUM} 
              control={<Radio />} 
              label="中等敏感度 - 平衡性能和准确度（推荐）" 
            />
            <FormControlLabel 
              value={SmartSearchSensitivity.LOW} 
              control={<Radio />} 
              label="低敏感度 - 只有非常明确的查询才会触发搜索" 
            />
          </RadioGroup>
        </FormControl>
      </Paper>

      {/* 搜索结果处理 */}
      <Paper elevation={0} sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight="600" gutterBottom>
          搜索结果处理
        </Typography>
        <Box sx={{ mt: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={sendSearchToAI}
                onChange={handleToggleSendToAI}
                color="primary"
                disabled={showBothResults} // 如果同时显示已启用，这个选项必须启用
              />
            }
            label="自动将搜索结果发送给AI处理"
          />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: 0.5 }}>
            启用后，AI会自动分析搜索结果并生成回答
          </Typography>
        </Box>
        
        <Box sx={{ mt: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={showBothResults}
                onChange={handleToggleShowBothResults}
                color="primary"
              />
            }
            label="同时显示搜索结果和AI分析"
          />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: 0.5 }}>
            启用后，将同时展示原始搜索结果和AI的分析
          </Typography>
        </Box>
      </Paper>

      {/* 高级设置 */}
      <Paper elevation={0} sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight="600" gutterBottom>
          高级设置
          <Tooltip title="这些设置影响智能搜索的处理方式和结果展示">
            <IconButton size="small" sx={{ ml: 1 }}>
              <HelpOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
        
        <Box sx={{ mt: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={useBackendProcessing}
                onChange={handleToggleBackendProcessing}
                color="primary"
              />
            }
            label="使用后台处理"
          />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: 0.5 }}>
            启用后，搜索和AI处理将在后台完成，无需前端中转
          </Typography>
        </Box>
        
        <Box sx={{ mt: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={includeRealTimeInfo}
                onChange={handleToggleRealTimeInfo}
                color="primary"
              />
            }
            label="包含实时时间信息"
          />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: 0.5 }}>
            启用后，AI回答中将包含当前时间信息，有助于处理新闻和时效性内容
          </Typography>
        </Box>
      </Paper>
      
      {/* 保存成功提示 */}
      {showSaved && (
        <Alert severity="success" sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1500 }}>
          设置已保存
        </Alert>
      )}
      
      {/* 关于智能搜索 */}
      <Box sx={{ 
        mt: 3, 
        p: 3, 
        borderRadius: 2, 
        border: '1px solid',
        borderColor: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
        bgcolor: 'background.paper'
      }}>
        <Typography variant="subtitle1" fontWeight={600} color="textPrimary" gutterBottom>
          关于智能搜索
        </Typography>
        <Typography variant="body2" color="text.secondary">
          智能搜索是一项高级功能，它能自动分析您的问题，判断是否需要进行网络搜索来提供最新、最相关的信息。
          系统会识别问题中的时效性词汇、事实查询需求、实体名词等特征，在必要时触发搜索，确保回答的准确性和时效性。
          现在包含实时时间信息，使AI能够更好地理解查询背景，特别是对于新闻和最近事件。
        </Typography>
      </Box>
    </Box>
  );
};

export default SmartSearchSettings; 