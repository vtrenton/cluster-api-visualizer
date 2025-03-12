import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { lightTheme, darkTheme } from './utils/theme';
import { useSettingsStore } from './stores/settings';
import ManagementCluster from './views/ManagementCluster';
import DescribeCluster from './views/DescribeCluster';
import ResourceLogs from './views/ResourceLogs';
import './App.css';

function App() {
  const { darkTheme: isDarkTheme } = useSettingsStore();
  
  // Set the document title
  useEffect(() => {
    document.title = 'Cluster API Visualizer';
  }, []);

  return (
    <ThemeProvider theme={isDarkTheme ? darkTheme : lightTheme}>
      <CssBaseline />
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<ManagementCluster />} />
            <Route path="/cluster" element={<DescribeCluster />} />
            <Route path="/logs" element={<ResourceLogs />} />
            <Route path="*" element={<ManagementCluster />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
