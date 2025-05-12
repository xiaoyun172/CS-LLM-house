import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Box,
  Typography,
  Slider,

} from '@mui/material';
import type { Model, PresetModel } from '../../shared/types';
import { presetModels } from '../../shared/data/presetModels';
import { generateId } from '../../shared/utils';

interface ModelDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (model: Model) => void;
  editModel?: Model;
}

const ModelDialog: React.FC<ModelDialogProps> = ({
  open,
  onClose,
  onSave,
  editModel,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<PresetModel | null>(null);
  const [modelData, setModelData] = useState<Model>({
    id: '',
    name: '',
    provider: 'openai',
    apiKey: '',
    baseUrl: '',
    maxTokens: 4096,
    temperature: 0.7,
    enabled: true,
    isDefault: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 当编辑模型变化时，更新表单数据
  useEffect(() => {
    if (editModel) {
      setModelData(editModel);

      // 查找匹配的预设模型
      const preset = presetModels.find(p => p.id === editModel.id);
      setSelectedPreset(preset || null);
    } else {
      // 重置表单
      setModelData({
        id: generateId(),
        name: '',
        provider: 'openai',
        apiKey: '',
        baseUrl: '',
        maxTokens: 4096,
        temperature: 0.7,
        enabled: true,
        isDefault: false,
      });
      setSelectedPreset(null);
    }
  }, [editModel, open]);

  // 处理预设模型选择
  const handlePresetChange = (event: React.ChangeEvent<{ value: unknown }> | any) => {
    const presetId = event.target.value as string;
    const preset = presetModels.find(p => p.id === presetId) || null;

    setSelectedPreset(preset);

    if (preset) {
      // 设置预设模型的属性，但保留当前的ID
      setModelData({
        ...modelData,
        // 使用预设模型的名称
        name: preset.name,
        // 如果是新建模型，使用预设的provider，否则保留当前provider
        provider: !editModel ? preset.provider : modelData.provider,
        baseUrl: preset.defaultBaseUrl || ''
      });

      console.log(`选择预设模型: ${preset.name}, ID: ${preset.id}, 提供商: ${!editModel ? preset.provider : modelData.provider}`);
    }
  };

  // 处理表单字段变化
  const handleChange = (field: keyof Model, value: any) => {
    setModelData({
      ...modelData,
      [field]: value,
    });

    // 清除错误
    if (errors[field]) {
      setErrors({
        ...errors,
        [field]: '',
      });
    }
  };

  // 验证表单
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!modelData.name.trim()) {
      newErrors.name = '请输入模型名称';
    }

    if (selectedPreset?.requiresApiKey && !modelData.apiKey?.trim()) {
      newErrors.apiKey = '请输入API密钥';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理保存
  const handleSave = () => {
    if (validateForm()) {
      onSave(modelData);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{editModel ? '编辑模型' : '添加模型'}</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3, mt: 1 }}>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel id="preset-model-label">预设模型</InputLabel>
            <Select
              labelId="preset-model-label"
              value={selectedPreset?.id || ''}
              onChange={handlePresetChange}
              label="预设模型"
            >
              <MenuItem value="">自定义模型</MenuItem>
              {presetModels.map((preset) => (
                <MenuItem key={preset.id} value={preset.id}>
                  {preset.name} ({preset.provider})
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>选择预设模型或创建自定义模型</FormHelperText>
          </FormControl>

          <TextField
            fullWidth
            label="模型名称"
            value={modelData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            margin="normal"
            error={!!errors.name}
            helperText={errors.name}
            required
          />

          <FormControl fullWidth margin="normal">
            <InputLabel id="provider-label">提供商</InputLabel>
            <Select
              labelId="provider-label"
              value={modelData.provider}
              onChange={(e) => handleChange('provider', e.target.value)}
              label="提供商"
            >
              <MenuItem value="openai">OpenAI</MenuItem>
              <MenuItem value="anthropic">Anthropic</MenuItem>
              <MenuItem value="google">Google</MenuItem>
              <MenuItem value="custom">自定义</MenuItem>
            </Select>
            <FormHelperText>
              选择API提供商，可以与模型ID自由组合（例如：使用OpenAI API调用Gemini模型）
            </FormHelperText>
          </FormControl>

          <TextField
            fullWidth
            label="API密钥"
            value={modelData.apiKey || ''}
            onChange={(e) => handleChange('apiKey', e.target.value)}
            margin="normal"
            type="password"
            error={!!errors.apiKey}
            helperText={errors.apiKey || '请输入API密钥，将安全存储在本地'}
            required={selectedPreset?.requiresApiKey}
          />

          <TextField
            fullWidth
            label="API基础URL"
            value={modelData.baseUrl || ''}
            onChange={(e) => handleChange('baseUrl', e.target.value)}
            margin="normal"
            placeholder={selectedPreset?.defaultBaseUrl || 'https://api.example.com/v1'}
            helperText="可选，如果使用自定义API端点"
          />

          <Box sx={{ mt: 3 }}>
            <Typography gutterBottom>最大Token数</Typography>
            <Slider
              value={modelData.maxTokens || 4096}
              onChange={(_, value) => handleChange('maxTokens', value)}
              min={1024}
              max={32768}
              step={1024}
              marks={[
                { value: 1024, label: '1K' },
                { value: 4096, label: '4K' },
                { value: 8192, label: '8K' },
                { value: 16384, label: '16K' },
                { value: 32768, label: '32K' },
              ]}
              valueLabelDisplay="auto"
            />
          </Box>

          <Box sx={{ mt: 3 }}>
            <Typography gutterBottom>温度 (Temperature)</Typography>
            <Slider
              value={modelData.temperature || 0.7}
              onChange={(_, value) => handleChange('temperature', value)}
              min={0}
              max={2}
              step={0.1}
              marks={[
                { value: 0, label: '0' },
                { value: 0.7, label: '0.7' },
                { value: 1, label: '1' },
                { value: 2, label: '2' },
              ]}
              valueLabelDisplay="auto"
            />
            <FormHelperText>
              较低的值使输出更确定，较高的值使输出更随机和创造性
            </FormHelperText>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ModelDialog;
