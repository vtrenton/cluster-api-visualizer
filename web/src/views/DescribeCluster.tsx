import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Dialog } from '@mui/material';
import { useSettingsStore } from '../stores/settings';
import { fetchClusterDetails } from '../utils/api';

// These components will be created later
import DescribeClusterTree from '../components/DescribeClusterTree';
import SettingsCard from '../components/SettingsCard';
import AlertMessage from '../components/AlertMessage';
import AppBar from '../components/AppBar';

interface TreeConfig {
  nodeWidth: number;
  nodeHeight: number;
  levelHeight: number;
}

interface LocationState {
  clusterName?: string;
  namespace?: string;
}

const DescribeCluster: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedInterval } = useSettingsStore();
  
  // Parse query parameters
  const queryParams = new URLSearchParams(location.search);
  const clusterName = queryParams.get('cluster') || '';
  const namespace = queryParams.get('namespace') || '';
  
  const [showLens, setShowLens] = useState<boolean>(true);
  const [showSettingsOverlay, setShowSettingsOverlay] = useState<boolean>(false);
  const [treeConfig] = useState<TreeConfig>({ 
    nodeWidth: 350, 
    nodeHeight: 140, 
    levelHeight: 275 
  });
  const [treeData, setTreeData] = useState<any>({});
  const [cachedTreeString, setCachedTreeString] = useState<string>('');
  const [treeIsReady, setTreeIsReady] = useState<boolean>(false);
  const [scale, setScale] = useState<number>(1);
  const [alert, setAlert] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isStraight, setIsStraight] = useState<boolean>(false);
  
  const treeRef = useRef<any>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Set document title
  useEffect(() => {
    document.title = `Cluster: ${clusterName}`;
  }, [clusterName]);

  // Redirect if no cluster name or namespace
  useEffect(() => {
    if (!clusterName || !namespace) {
      navigate('/');
    }
  }, [clusterName, namespace, navigate]);

  // Handle interval changes
  useEffect(() => {
    const handleInterval = (val: string) => {
      console.log('Setting polling interval to ' + val);
      
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      
      if (val === 'Off') return;
      
      let totalSeconds = 0;
      
      const seconds = val.match(/(\d+)\s*s/);
      const minutes = val.match(/(\d+)\s*m/);
      
      if (seconds) {
        totalSeconds += parseInt(seconds[1]);
      }
      if (minutes) {
        totalSeconds += parseInt(minutes[1]) * 60;
      }
      
      console.log('Setting interval to ' + totalSeconds + ' seconds');
      
      pollingRef.current = setInterval(() => {
        fetchClusterData();
      }, totalSeconds * 1000);
    };
    
    handleInterval(selectedInterval);
    
    // Cleanup on unmount
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [selectedInterval, clusterName, namespace]);

  // Initial data fetch
  useEffect(() => {
    if (clusterName && namespace) {
      fetchClusterData();
    }
  }, [clusterName, namespace]);

  const fetchClusterData = async (forceRedraw = false) => {
    if (!clusterName || !namespace) return;
    
    try {
      const response = await fetchClusterDetails(clusterName, namespace);
      
      if (response == null) {
        setErrorMessage(`Couldn't find cluster ${clusterName} in namespace ${namespace}`);
        return;
      }
      
      console.log('Cluster details data:', response);
      
      if (forceRedraw || cachedTreeString !== JSON.stringify(response)) {
        setTreeData(response);
        setCachedTreeString(JSON.stringify(response));
        setTreeIsReady(true);
      }
    } catch (error: any) {
      console.log('Error:', error);
      setAlert(true);
      
      if (error.response) {
        if (error.response.status === 404) {
          setErrorMessage(`Cluster ${clusterName} not found in namespace ${namespace}`);
        } else {
          setErrorMessage(`Unable to load details for cluster ${clusterName}`);
        }
      } else if (error.request) {
        setErrorMessage('No server response received');
      } else {
        setErrorMessage('Unable to create request');
      }
    }
  };

  const handleZoomIn = () => {
    if (treeRef.current) {
      treeRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (treeRef.current) {
      treeRef.current.zoomOut();
    }
  };

  return (
    <Box id="describe-cluster" sx={{ height: '100%' }}>
      <AppBar
        title={`Cluster: ${clusterName}`}
        scale={`${Math.round(scale * 100)}%`}
        onTogglePathStyle={setIsStraight}
        onReload={() => fetchClusterData(true)}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onShowSettings={() => setShowSettingsOverlay(true)}
        onUpdateLens={setShowLens}
        onBack={() => navigate('/')}
      />
      
      <DescribeClusterTree
        ref={treeRef}
        treeConfig={treeConfig}
        treeData={treeData}
        treeIsReady={treeIsReady}
        showLens={showLens}
        isStraight={isStraight}
        onScale={setScale}
      />
      
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

export default DescribeCluster; 