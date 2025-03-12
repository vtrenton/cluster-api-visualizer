import React from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Button,
  FormControl,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  InputLabel,
  Typography,
  Divider,
  Box
} from '@mui/material';
import { useSettingsStore } from '../stores/settings';

interface SettingsCardProps {
  onClose: () => void;
  version?: string;
}

const SettingsCard: React.FC<SettingsCardProps> = ({ onClose, version }) => {
  const {
    straightLinks,
    darkTheme,
    selectedFileType,
    selectedInterval,
    maxLogLines,
    setStraightLinks,
    setDarkTheme,
    setSelectedFileType,
    setSelectedInterval,
    setMaxLogLines
  } = useSettingsStore();

  return (
    <Card className="settingsCard">
      <CardHeader title="Settings" />
      <Divider />
      <CardContent>
        <Box sx={{ mb: 3 }}>
          <FormControlLabel
            control={
              <Switch
                checked={darkTheme}
                onChange={(e) => setDarkTheme(e.target.checked)}
                color="primary"
              />
            }
            label="Dark Theme"
          />
        </Box>

        <Box sx={{ mb: 3 }}>
          <FormControlLabel
            control={
              <Switch
                checked={straightLinks}
                onChange={(e) => setStraightLinks(e.target.checked)}
                color="primary"
              />
            }
            label="Use Straight Links"
          />
        </Box>

        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth variant="outlined" size="small">
            <InputLabel id="file-type-label">File Type</InputLabel>
            <Select
              labelId="file-type-label"
              value={selectedFileType}
              onChange={(e) => setSelectedFileType(e.target.value as string)}
              label="File Type"
            >
              <MenuItem value="YAML">YAML</MenuItem>
              <MenuItem value="JSON">JSON</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth variant="outlined" size="small">
            <InputLabel id="interval-label">Refresh Interval</InputLabel>
            <Select
              labelId="interval-label"
              value={selectedInterval}
              onChange={(e) => setSelectedInterval(e.target.value as string)}
              label="Refresh Interval"
            >
              <MenuItem value="Off">Off</MenuItem>
              <MenuItem value="10s">10 seconds</MenuItem>
              <MenuItem value="30s">30 seconds</MenuItem>
              <MenuItem value="1m">1 minute</MenuItem>
              <MenuItem value="5m">5 minutes</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth variant="outlined" size="small">
            <InputLabel id="max-lines-label">Max Log Lines</InputLabel>
            <Select
              labelId="max-lines-label"
              value={maxLogLines}
              onChange={(e) => setMaxLogLines(e.target.value as string)}
              label="Max Log Lines"
            >
              <MenuItem value="100">100</MenuItem>
              <MenuItem value="500">500</MenuItem>
              <MenuItem value="1000">1000</MenuItem>
              <MenuItem value="5000">5000</MenuItem>
              <MenuItem value="10000">10000</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {version && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="body2" color="textSecondary">
              Version: {version}
            </Typography>
          </Box>
        )}
      </CardContent>
      <Divider />
      <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
        <Button onClick={onClose} color="primary" variant="contained">
          Close
        </Button>
      </CardActions>
    </Card>
  );
};

export default SettingsCard; 