import React from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  useTheme
} from '@mui/material';
import type { TableMessageBlock } from '../../../shared/types/newMessage';

interface Props {
  block: TableMessageBlock;
}

/**
 * 表格块组件
 * 负责渲染表格内容
 */
const TableBlock: React.FC<Props> = ({ block }) => {
  const theme = useTheme();

  return (
    <Box sx={{ my: 2 }}>
      {block.caption && (
        <Typography variant="subtitle2" sx={{ mb: 1, textAlign: 'center' }}>
          {block.caption}
        </Typography>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)' }}>
              {block.headers.map((header, index) => (
                <TableCell key={index} sx={{ fontWeight: 'bold' }}>
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
                    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)'
                  }
                }}
              >
                {row.map((cell, cellIndex) => (
                  <TableCell key={cellIndex}>
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

export default React.memo(TableBlock);
