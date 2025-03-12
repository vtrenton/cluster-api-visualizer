import React, { useState, useEffect, useRef } from 'react';
import { Box, Dialog } from '@mui/material';
import { useSettingsStore } from '../stores/settings';
import { fetchManagementCluster, fetchVersion } from '../utils/api';

// These components will be created later
import ManagementClusterTree from '../components/ManagementClusterTree';
import SettingsCard from '../components/SettingsCard';
import AlertMessage from '../components/AlertMessage';
import AppBar from '../components/AppBar';

interface TreeConfig {
  nodeWidth: number;
  nodeHeight: number;
  levelHeight: number;
}

const ManagementCluster: React.FC = () => {
  const { selectedInterval } = useSettingsStore();
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
  const [gitVersion, setGitVersion] = useState<string>('');
  const [isStraight, setIsStraight] = useState<boolean>(false);
  
  const treeRef = useRef<any>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch version on mount
  useEffect(() => {
    const getVersion = async () => {
      try {
        const versionData = await fetchVersion();
        setGitVersion(versionData.gitVersion || '');
      } catch (error) {
        console.error('Error fetching version:', error);
      }
    };
    
    getVersion();
  }, []);

  // Set document title
  useEffect(() => {
    document.title = 'Management Cluster';
  }, []);

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
        fetchOverview();
      }, totalSeconds * 1000);
    };
    
    handleInterval(selectedInterval);
    
    // Cleanup on unmount
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [selectedInterval]);

  // Initial data fetch
  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async (forceRedraw = false) => {
    try {
      const response = await fetchManagementCluster();
      
      if (response == null) {
        setErrorMessage("Couldn't find a management cluster from default kubeconfig");
        return;
      }
      
      console.log('Cluster overview data:', response);
      
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
          setErrorMessage('Management cluster not found, is the kubeconfig set?');
        } else {
          setErrorMessage('Unable to load management cluster and workload clusters');
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
    <Box id="overview" sx={{ height: '100%' }}>
      <AppBar
        title="Management Cluster"
        scale={`${Math.round(scale * 100)}%`}
        onTogglePathStyle={setIsStraight}
        onReload={() => fetchOverview(true)}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onShowSettings={() => setShowSettingsOverlay(true)}
        onUpdateLens={setShowLens}
      />
      
      <ManagementClusterTree
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
          version={gitVersion}
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

export default ManagementCluster; 