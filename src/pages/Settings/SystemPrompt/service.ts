import { v4 as uuidv4 } from 'uuid';
import type { SystemPromptTemplate } from './types';

// 本地存储键
const STORAGE_KEY = 'aetherlink-system-prompt-templates';
const DEFAULT_PROMPT_KEY = 'aetherlink-default-system-prompt';
const USE_DEFAULT_PROMPT_KEY = 'aetherlink-use-default-system-prompt';

// 初始模板
const initialTemplates: SystemPromptTemplate[] = [
  {
    id: '1',
    name: '通用助手',
    content: '你是一个有用、尊重、诚实的AI助手。请尽可能提供最准确的信息。',
    isDefault: true
  },
  {
    id: '2',
    name: '编程助手',
    content: '你是一个专业的编程助手，能够解答各种编程问题并提供代码示例。',
    isDefault: false
  }
];

// 加载模板列表
export const loadTemplates = (): SystemPromptTemplate[] => {
  try {
    const storedTemplates = localStorage.getItem(STORAGE_KEY);
    if (storedTemplates) {
      return JSON.parse(storedTemplates);
    }
    return initialTemplates;
  } catch (error) {
    console.error('Failed to load templates:', error);
    return initialTemplates;
  }
};

// 保存模板列表
export const saveTemplates = (templates: SystemPromptTemplate[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (error) {
    console.error('Failed to save templates:', error);
  }
};

// 加载默认提示词
export const loadDefaultPrompt = (): string => {
  try {
    const storedPrompt = localStorage.getItem(DEFAULT_PROMPT_KEY);
    if (storedPrompt) {
      return storedPrompt;
    }
    return initialTemplates[0].content;
  } catch (error) {
    console.error('Failed to load default prompt:', error);
    return initialTemplates[0].content;
  }
};

// 保存默认提示词
export const saveDefaultPrompt = (prompt: string): void => {
  try {
    localStorage.setItem(DEFAULT_PROMPT_KEY, prompt);
  } catch (error) {
    console.error('Failed to save default prompt:', error);
  }
};

// 加载是否使用默认提示词
export const loadUseDefaultPrompt = (): boolean => {
  try {
    const storedValue = localStorage.getItem(USE_DEFAULT_PROMPT_KEY);
    if (storedValue !== null) {
      return JSON.parse(storedValue);
    }
    return true;
  } catch (error) {
    console.error('Failed to load use default prompt setting:', error);
    return true;
  }
};

// 保存是否使用默认提示词
export const saveUseDefaultPrompt = (useDefault: boolean): void => {
  try {
    localStorage.setItem(USE_DEFAULT_PROMPT_KEY, JSON.stringify(useDefault));
  } catch (error) {
    console.error('Failed to save use default prompt setting:', error);
  }
};

// 创建新模板
export const createTemplate = (template: Omit<SystemPromptTemplate, 'id'>): SystemPromptTemplate => {
  return {
    ...template,
    id: uuidv4()
  };
};

// 获取默认的系统提示词
export const getActiveSystemPrompt = (): string => {
  const useDefault = loadUseDefaultPrompt();
  if (useDefault) {
    return loadDefaultPrompt();
  }
  return '';
}; 