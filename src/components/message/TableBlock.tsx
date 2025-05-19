import React from 'react';
import { 
  Box, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Typography,
  useTheme
} from '@mui/material';
import type { TableMessageBlock } from '../../shared/types/newMessage.ts';

interface TableBlockProps {
  block: TableMessageBlock;
}

/**
 * 表格块组件
 */
const TableBlock: React.FC<TableBlockProps> = ({ block }) => {
  const theme = useTheme();

  return (
    <Box sx={{ marginTop: 2, marginBottom: 2 }}>
      {block.caption && (
        <Typography 
          variant="subtitle2" 
          align="center" 
          sx={{ mb: 1, color: theme.palette.text.secondary }}
        >
          {block.caption}
        </Typography>
      )}

      <TableContainer 
        component={Paper} 
        elevation={0}
        sx={{ 
          borderRadius: '8px',
          border: `1px solid ${theme.palette.divider}`
        }}
      >
        <Table size="small" aria-label="data-table">
          <TableHead>
            <TableRow sx={{ backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.08)' 
              : 'rgba(0, 0, 0, 0.03)'
            }}>
              {block.headers.map((header, index) => (
                <TableCell 
                  key={index}
                  sx={{ 
                    fontWeight: 'bold', 
                    whiteSpace: 'nowrap',
                    borderBottom: `1px solid ${theme.palette.divider}`
                  }}
                >
                  {header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {block.rows.map((row, rowIndex) => (
              <TableRow 
                key={rowIndex}
                sx={{ 
                  '&:nth-of-type(odd)': {
                    backgroundColor: theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.03)' 
                      : 'rgba(0, 0, 0, 0.01)'
                  },
                }}
              >
                {row.map((cell, cellIndex) => (
                  <TableCell 
                    key={cellIndex}
                    sx={{ 
                      borderBottom: rowIndex === block.rows.length - 1 
                        ? 'none' 
                        : `1px solid ${theme.palette.divider}`,
                      padding: '8px 16px' 
                    }}
                  >
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default TableBlock; 