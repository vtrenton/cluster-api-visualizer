import React, { useState } from 'react';
import { 
  AppBar as MuiAppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Tooltip, 
  Switch, 
  FormControlLabel,
  Box
} from '@mui/material';
import { 
  Refresh as RefreshIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Settings as SettingsIcon,
  ArrowBack as ArrowBackIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Timeline as TimelineIcon,
  ShowChart as ShowChartIcon
} from '@mui/icons-material';
import { useSettingsStore } from '../stores/settings';

interface AppBarProps {
  title: string;
  scale?: string;
  onTogglePathStyle?: (value: boolean) => void;
  onReload?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onShowSettings?: () => void;
  onUpdateLens?: (value: boolean) => void;
  onBack?: () => void;
}

const AppBar: React.FC<AppBarProps> = ({
  title,
  scale,
  onTogglePathStyle,
  onReload,
  onZoomIn,
  onZoomOut,
  onShowSettings,
  onUpdateLens,
  onBack
}) => {
  const { straightLinks, setStraightLinks } = useSettingsStore();
  const [showLens, setShowLens] = useState<boolean>(true);

  const handleLensToggle = () => {
    const newValue = !showLens;
    setShowLens(newValue);
    if (onUpdateLens) {
      onUpdateLens(newValue);
    }
  };

  const handlePathStyleToggle = () => {
    const newValue = !straightLinks;
    setStraightLinks(newValue);
    if (onTogglePathStyle) {
      onTogglePathStyle(newValue);
    }
  };

  return (
    <MuiAppBar position="static" color="primary">
      <Toolbar>
        {onBack && (
          <Tooltip title="Back">
            <IconButton 
              edge="start" 
              color="inherit" 
              onClick={onBack}
              size="large"
            >
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
        )}
        
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>
        
        {scale && (
          <Typography variant="body2" sx={{ mr: 2 }}>
            {scale}
          </Typography>
        )}
        
        {onUpdateLens && (
          <Tooltip title={showLens ? "Hide details" : "Show details"}>
            <IconButton 
              color="inherit" 
              onClick={handleLensToggle}
              size="large"
            >
              {showLens ? <VisibilityIcon /> : <VisibilityOffIcon />}
            </IconButton>
          </Tooltip>
        )}
        
        {onTogglePathStyle && (
          <Tooltip title={straightLinks ? "Use curved links" : "Use straight links"}>
            <IconButton 
              color="inherit" 
              onClick={handlePathStyleToggle}
              size="large"
            >
              {straightLinks ? <TimelineIcon /> : <ShowChartIcon />}
            </IconButton>
          </Tooltip>
        )}
        
        {onZoomIn && onZoomOut && (
          <Box>
            <Tooltip title="Zoom out">
              <IconButton 
                color="inherit" 
                onClick={onZoomOut}
                size="large"
              >
                <ZoomOutIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Zoom in">
              <IconButton 
                color="inherit" 
                onClick={onZoomIn}
                size="large"
              >
                <ZoomInIcon />
              </IconButton>
            </Tooltip>
          </Box>
        )}
        
        {onReload && (
          <Tooltip title="Refresh">
            <IconButton 
              color="inherit" 
              onClick={onReload}
              size="large"
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        )}
        
        {onShowSettings && (
          <Tooltip title="Settings">
            <IconButton 
              edge="end" 
              color="inherit" 
              onClick={onShowSettings}
              size="large"
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        )}
      </Toolbar>
    </MuiAppBar>
  );
};

export default AppBar; 