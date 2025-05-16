import { alpha } from '@mui/material';
import type { Theme } from '@mui/material';

export const styles = {
  container: {
    flexGrow: 1, 
    display: 'flex', 
    flexDirection: 'column', 
    height: '100vh',
    bgcolor: (theme: Theme) => theme.palette.mode === 'light'
      ? alpha(theme.palette.primary.main, 0.02)
      : alpha(theme.palette.background.default, 0.9),
  },
  
  appBar: {
    zIndex: (theme: Theme) => theme.zIndex.drawer + 1,
    bgcolor: 'background.paper',
    color: 'text.primary',
    borderBottom: 1,
    borderColor: 'divider',
    backdropFilter: 'blur(8px)',
  },
  
  backButton: {
    color: (theme: Theme) => theme.palette.primary.main,
  },
  
  title: {
    flexGrow: 1, 
    fontWeight: 600,
    backgroundImage: 'linear-gradient(90deg, #9333EA, #754AB4)',
    backgroundClip: 'text',
    color: 'transparent',
  },
  
  contentArea: {
    flexGrow: 1, 
    overflow: 'auto', 
    p: 2,
    mt: 8,
    '&::-webkit-scrollbar': {
      width: '6px',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: 'rgba(0,0,0,0.1)',
      borderRadius: '3px',
    },
  },
  
  paper: {
    borderRadius: 2,
    overflow: 'hidden',
    border: '1px solid',
    borderColor: 'divider',
    mb: 3,
  },
  
  headerContainer: {
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    mb: 2
  },
  
  templateItem: {
    py: 2
  },
  
  defaultAvatar: {
    mr: 2, 
    bgcolor: '#9333EA',
    color: 'white',
  },
  
  normalAvatar: {
    mr: 2, 
    bgcolor: '#10b981',
    color: 'white',
  },
  
  defaultBadge: {
    ml: 1, 
    bgcolor: '#9333EA', 
    color: 'white', 
    px: 1, 
    py: 0.3, 
    borderRadius: 1
  }
}; 