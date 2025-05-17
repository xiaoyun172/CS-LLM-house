import type { SystemPromptTemplate } from '../../../shared/services/SystemPromptService';

// 重导出类型，便于其他组件使用
export type { SystemPromptTemplate };

// 导出组件所需的接口类型
export interface TemplateListProps {
  templates: SystemPromptTemplate[];
  onAddTemplate: () => void;
  onSetDefault: (id: string) => void;
  onDuplicate: (template: SystemPromptTemplate) => void;
  onEdit: (template: SystemPromptTemplate) => void;
  onDelete: (id: string) => void;
}

export interface TemplateEditDialogProps {
  open: boolean;
  template: SystemPromptTemplate | null;
  onClose: () => void;
  onSave: (template: SystemPromptTemplate) => void;
  onChange: (field: keyof SystemPromptTemplate, value: string | boolean) => void;
}

export interface PromptTemplateItemProps {
  template: SystemPromptTemplate;
  onSetDefault: (id: string) => void;
  onDuplicate: (template: SystemPromptTemplate) => void;
  onEdit: (template: SystemPromptTemplate) => void;
  onDelete: (id: string) => void;
}

export interface DefaultPromptSectionProps {
  defaultPrompt: string;
  useDefaultPrompt: boolean;
  onChangeDefaultPrompt: (value: string) => void;
  onToggleUseDefault: (value: boolean) => void;
} 