import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import * as d3 from 'd3';

interface TreeConfig {
  nodeWidth: number;
  nodeHeight: number;
  levelHeight: number;
}

interface DescribeClusterTreeProps {
  treeConfig: TreeConfig;
  treeData: any;
  treeIsReady: boolean;
  showLens: boolean;
  isStraight?: boolean;
  onScale?: (scale: number) => void;
}

const DescribeClusterTree = forwardRef<any, DescribeClusterTreeProps>(
  ({ treeConfig, treeData, treeIsReady, showLens, isStraight = false, onScale }, ref) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState<number>(1);
    
    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
      zoomIn: () => {
        setScale(prev => Math.min(prev + 0.1, 2));
      },
      zoomOut: () => {
        setScale(prev => Math.max(prev - 0.1, 0.1));
      }
    }));
    
    // Update parent component with scale changes
    useEffect(() => {
      if (onScale) {
        onScale(scale);
      }
    }, [scale, onScale]);
    
    // Render tree when data changes
    useEffect(() => {
      if (!treeIsReady || !svgRef.current || !containerRef.current) return;
      
      // This is a placeholder for the actual D3 tree rendering logic
      // In a real implementation, this would create a D3 tree visualization
      console.log('Would render cluster details tree with data:', treeData);
      console.log('Using straight links:', isStraight);
      console.log('Showing lens:', showLens);
      
      // Clear previous content
      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();
      
      // Set up SVG with proper dimensions
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      svg
        .attr('width', width)
        .attr('height', height)
        .append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .text('Cluster details tree visualization would be rendered here');
      
    }, [treeData, treeIsReady, treeConfig, isStraight, showLens]);
    
    return (
      <Box 
        ref={containerRef}
        sx={{ 
          height: 'calc(100% - 64px)', 
          width: '100%', 
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {!treeIsReady ? (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%' 
          }}>
            <CircularProgress />
          </Box>
        ) : (
          <svg 
            ref={svgRef} 
            style={{ 
              width: '100%', 
              height: '100%',
              transform: `scale(${scale})`,
              transformOrigin: 'center center'
            }}
          />
        )}
      </Box>
    );
  }
);

export default DescribeClusterTree; 