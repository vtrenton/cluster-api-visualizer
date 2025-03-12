import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Dialog, CircularProgress } from '@mui/material';
import { useSettingsStore } from '../stores/settings';
import { fetchResourceLogs } from '../utils/api';

// These components will be created later
import SettingsCard from '../components/SettingsCard';
import AlertMessage from '../components/AlertMessage';
import AppBar from '../components/AppBar';

const ResourceLogs: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { maxLogLines } = useSettingsStore();
  
  // Parse query parameters
  const queryParams = new URLSearchParams(location.search);
  const resourceType = queryParams.get('resourceType') || '';
  const resourceName = queryParams.get('resourceName') || '';
  const namespace = queryParams.get('namespace') || '';
  
  const [showSettingsOverlay, setShowSettingsOverlay] = useState<boolean>(false);
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [alert, setAlert] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Set document title
  useEffect(() => {
    document.title = `Logs: ${resourceName}`;
  }, [resourceName]);

  // Redirect if no resource info
  useEffect(() => {
    if (!resourceType || !resourceName || !namespace) {
      navigate('/');
    }
  }, [resourceType, resourceName, namespace, navigate]);

  // Initial data fetch
  useEffect(() => {
    if (resourceType && resourceName && namespace) {
      fetchLogs();
    }
    
    // Cleanup on unmount
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [resourceType, resourceName, namespace, maxLogLines]);

  const fetchLogs = async () => {
    if (!resourceType || !resourceName || !namespace) return;
    
    setLoading(true);
    
    try {
      const response = await fetchResourceLogs(resourceType, resourceName, namespace, maxLogLines);
      
      if (response == null) {
        setErrorMessage(`Couldn't find logs for ${resourceType}/${resourceName} in namespace ${namespace}`);
        setLogs('');
      } else {
        setLogs(response);
      }
    } catch (error: any) {
      console.log('Error:', error);
      setAlert(true);
      
      if (error.response) {
        if (error.response.status === 404) {
          setErrorMessage(`Resource ${resourceType}/${resourceName} not found in namespace ${namespace}`);
        } else {
          setErrorMessage(`Unable to load logs for ${resourceType}/${resourceName}`);
        }
      } else if (error.request) {
        setErrorMessage('No server response received');
      } else {
        setErrorMessage('Unable to create request');
      }
      
      setLogs('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box id="resource-logs" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <AppBar
        title={`Logs: ${resourceName}`}
        onShowSettings={() => setShowSettingsOverlay(true)}
        onBack={() => navigate(-1)}
        onReload={fetchLogs}
      />
      
      <Paper 
        elevation={3} 
        sx={{ 
          flex: 1, 
          margin: 2, 
          padding: 2, 
          overflow: 'auto', 
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
          fontSize: '0.9rem',
          backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#1e1e1e' : '#f5f5f5'
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : logs ? (
          logs
        ) : (
          <Typography variant="body1" color="text.secondary" align="center">
            No logs available
          </Typography>
        )}
      </Paper>
      
      <Dialog
        open={showSettingsOverlay}
        onClose={() => setShowSettingsOverlay(false)}
        maxWidth="md"
        fullWidth
      >
        <SettingsCard
          onClose={() => setShowSettingsOverlay(false)}
        />
      </Dialog>
      
      <AlertMessage
        type="error"
        open={alert}
        message={errorMessage}
        onClose={() => setAlert(false)}
      />
    </Box>
  );
};

export default ResourceLogs; 