import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  Paper,
  InputAdornment,
  IconButton,
  CircularProgress,
  Alert,
  Divider,
  Card,
  CardContent,
  Stack,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { MobileKnowledgeService } from '../../shared/services/MobileKnowledgeService';
import type { KnowledgeSearchResult, KnowledgeBase } from '../../shared/types/KnowledgeBase';
import { BlockManager } from '../../shared/services/messages/BlockManager';
import { useSelector } from 'react-redux';
import type { RootState } from '../../shared/store';

interface KnowledgeSearchProps {
  knowledgeBaseId: string;
  onInsertReference?: (contentId: string, content: string) => void;
}

export const KnowledgeSearch: React.FC<KnowledgeSearchProps> = ({ 
  knowledgeBaseId,
  onInsertReference 
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<KnowledgeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase | null>(null);
  const [threshold, setThreshold] = useState(0.7);
  const [maxResults, setMaxResults] = useState(5);
  const currentTopicId = useSelector((state: RootState) => state.messages.currentTopicId);
  
  useEffect(() => {
    const fetchKnowledgeBase = async () => {
      try {
        const kb = await MobileKnowledgeService.getInstance().getKnowledgeBase(knowledgeBaseId);
        if (kb) {
          setKnowledgeBase(kb);
          setThreshold(kb.threshold || 0.7);
        }
      } catch (err) {
        console.error('Error fetching knowledge base details:', err);
      }
    };
    
    fetchKnowledgeBase();
  }, [knowledgeBaseId]);

  const handleSearch = async () => {
    if (!query.trim()) {
      setError('请输入搜索内容');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const searchResults = await MobileKnowledgeService.getInstance().search({
        knowledgeBaseId,
        query: query.trim(),
        threshold,
        limit: maxResults
      });
      
      setResults(searchResults);
      
      if (searchResults.length === 0) {
        setError('没有找到匹配的内容');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('搜索过程中发生错误');
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = () => {
    setQuery('');
    setResults([]);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleInsertReference = async (result: KnowledgeSearchResult) => {
    try {
      if (!currentTopicId) {
        setError('未选择会话');
        return;
      }
      
      // 使用BlockManager创建引用块
      await BlockManager.createKnowledgeReferenceBlockFromSearchResult(
        currentTopicId,
        result,
        knowledgeBaseId,
        query
      );
      
      // 如果传入了回调函数，调用它
      if (onInsertReference) {
        onInsertReference(result.documentId, result.content);
      }
    } catch (err) {
      console.error('Error inserting reference:', err);
      setError('插入引用失败');
    }
  };

  return (
    <Box sx={{ width: '100%', overflow: 'auto', maxHeight: 'calc(100vh - 300px)' }}>
      <Paper elevation={0} sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          知识库搜索
        </Typography>

        <TextField
          fullWidth
          variant="outlined"
          size="small"
          placeholder="输入搜索内容..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: query && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={handleClearSearch}>
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            )
          }}
          sx={{ mb: 1 }}
        />
        
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          fullWidth
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : '搜索'}
        </Button>
      </Paper>

      {error && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {results.length > 0 && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            搜索结果 ({results.length})
          </Typography>
          
          <List disablePadding>
            {results.map((result) => (
              <Card key={result.documentId} variant="outlined" sx={{ mb: 1 }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Stack spacing={1}>
                    <Typography variant="body2" component="div" sx={{ 
                      fontSize: '0.875rem', 
                      mb: 1,
                      maxHeight: 100,
                      overflow: 'auto'
                    }}>
                      {result.content}
                    </Typography>
                    
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" color="text.secondary">
                        相似度: {(result.similarity * 100).toFixed(1)}%
                      </Typography>
                      
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ContentCopyIcon />}
                        onClick={() => handleInsertReference(result)}
                      >
                        插入引用
                      </Button>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </List>
        </Box>
      )}
    </Box>
  );
};

export default KnowledgeSearch; 