import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import * as d3 from 'd3';

interface TreeConfig {
  nodeWidth: number;
  nodeHeight: number;
  levelHeight: number;
}

interface TreeNode {
  name: string;
  namespace: string;
  infrastructureProvider: string;
  isManagement: boolean;
  phase: string;
  ready: boolean;
  children: TreeNode[];
  clusterUrl: string;
  // Internal properties for rendering
  _key?: string;
  _collapsed?: boolean;
  x?: number;
  y?: number;
}

interface ManagementClusterTreeProps {
  treeConfig: TreeConfig;
  treeData: TreeNode;
  treeIsReady: boolean;
  showLens: boolean;
  isStraight?: boolean;
  onScale?: (scale: number) => void;
}

// Generate a unique ID for each node
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Process tree data to add necessary properties for rendering
const processTreeData = (data: TreeNode): TreeNode => {
  // Add a unique key for each node
  const result = {
    ...data,
    _key: generateUUID(),
    _collapsed: false
  };
  
  // Process children recursively
  if (result.children && result.children.length > 0) {
    result.children = result.children.map(child => processTreeData(child));
  } else {
    result.children = [];
  }
  
  return result;
};

const ManagementClusterTree = forwardRef<any, ManagementClusterTreeProps>(
  ({ treeConfig, treeData, treeIsReady, showLens, isStraight = false, onScale }, ref) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const nodesContainerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState<number>(1);
    const [processedData, setProcessedData] = useState<TreeNode | null>(null);
    const [nodes, setNodes] = useState<d3.HierarchyPointNode<TreeNode>[]>([]);
    const [links, setLinks] = useState<d3.HierarchyPointLink<TreeNode>[]>([]);
    const [transformPosition, setTransformPosition] = useState({ x: 0, y: 0 });
    
    // Set initial transform to center the tree
    useEffect(() => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        setTransformPosition({
          x: width / 2 - treeConfig.nodeWidth / 2,
          y: 50 // Some padding from the top
        });
      }
    }, [treeConfig.nodeWidth]);
    
    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
      zoomIn: () => {
        const newScale = Math.min(scale + 0.1, 2);
        setScale(newScale);
      },
      zoomOut: () => {
        const newScale = Math.max(scale - 0.1, 0.1);
        setScale(newScale);
      }
    }));
    
    // Update parent component with scale changes
    useEffect(() => {
      if (onScale) {
        onScale(scale);
      }
    }, [scale, onScale]);
    
    // Process the tree data when it changes
    useEffect(() => {
      if (treeIsReady && treeData) {
        const processed = processTreeData(treeData);
        setProcessedData(processed);
      }
    }, [treeData, treeIsReady]);
    
    // Create the tree layout and render it
    useEffect(() => {
      if (!treeIsReady || !processedData || !svgRef.current || !containerRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      // Create a hierarchy from the processed data
      const root = d3.hierarchy(processedData);
      
      // Create a tree layout
      const treeLayout = d3.tree<TreeNode>()
        .nodeSize([treeConfig.nodeWidth + 20, treeConfig.levelHeight])
        .separation((a, b) => {
          return a.parent === b.parent ? 1 : 1.2;
        });
      
      // Apply the layout to the hierarchy
      const treeData = treeLayout(root);
      
      // Get nodes and links
      const nodesList = treeData.descendants();
      const linksList = treeData.links();
      
      // Set state with the nodes and links
      setNodes(nodesList);
      setLinks(linksList);
      
      // Clear previous content
      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();
      
      // Draw the links between nodes
      const linksGroup = svg.append('g')
        .attr('class', 'links');
      
      links.forEach(link => {
        const linkPath = createLinkPath(link.source, link.target, isStraight);
        
        linksGroup.append('path')
          .attr('d', linkPath)
          .attr('fill', 'none')
          .attr('stroke', '#ccc')
          .attr('stroke-width', '1.5px');
      });
      
    }, [processedData, treeIsReady, treeConfig, isStraight, showLens]);
    
    // Helper to create a path between two nodes
    const createLinkPath = (source: any, target: any, straight: boolean): string => {
      if (straight) {
        // Create a straight path with corners
        const sourceX = source.x;
        const sourceY = source.y;
        const targetX = target.x;
        const targetY = target.y;
        
        const midY = (sourceY + targetY) / 2;
        
        return `
          M ${sourceX},${sourceY}
          L ${sourceX},${midY}
          L ${targetX},${midY}
          L ${targetX},${targetY}
        `;
      } else {
        // Create a curved path
        const path = d3.linkVertical<any, any>()
          .x(d => d.x)
          .y(d => d.y)({
            source: source,
            target: target
          });
        
        return path || '';
      }
    };
    
    // Enable drag and drop for the tree
    useEffect(() => {
      if (!containerRef.current || !nodesContainerRef.current) return;
      
      let startX = 0;
      let startY = 0;
      let isDragging = false;
      
      const handleMouseDown = (e: MouseEvent) => {
        // Only allow drag with left mouse button
        if (e.button !== 0) return;
        
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      };
      
      const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        setTransformPosition(prev => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY
        }));
        
        startX = e.clientX;
        startY = e.clientY;
      };
      
      const handleMouseUp = () => {
        isDragging = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      
      containerRef.current.addEventListener('mousedown', handleMouseDown);
      
      return () => {
        containerRef.current?.removeEventListener('mousedown', handleMouseDown);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }, []);
    
    const handleNodeRender = (node: d3.HierarchyPointNode<TreeNode>) => {
      // Get cluster phase color
      const getPhaseColor = (phase: string, ready: boolean) => {
        if (ready) return '#4caf50'; // Green for ready
        if (!phase || phase === '') return '#ffc107'; // Yellow for unknown/empty
        switch (phase.toLowerCase()) {
          case 'pending':
            return '#ffc107'; // Yellow
          case 'provisioning':
            return '#2196f3'; // Blue
          case 'provisioned':
            return '#4caf50'; // Green
          case 'deleting':
            return '#f44336'; // Red
          case 'failed':
            return '#f44336'; // Red
          default:
            return '#9e9e9e'; // Grey for default
        }
      };
      
      const nodeData = node.data;
      const phaseColor = getPhaseColor(nodeData.phase, nodeData.ready);
      
      return (
        <div 
          key={nodeData._key}
          style={{
            position: 'absolute',
            left: node.x,
            top: node.y,
            width: treeConfig.nodeWidth,
            height: treeConfig.nodeHeight,
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '5px',
            padding: '10px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            cursor: 'pointer'
          }}
        >
          <div style={{ fontWeight: 'bold', textAlign: 'center' }}>
            {nodeData.name}
          </div>
          
          {showLens && (
            <div style={{ fontSize: '0.8rem', marginTop: '5px' }}>
              {nodeData.namespace && <div>Namespace: {nodeData.namespace}</div>}
              {nodeData.infrastructureProvider && (
                <div>Provider: {nodeData.infrastructureProvider}</div>
              )}
              {nodeData.isManagement && (
                <div style={{ fontStyle: 'italic' }}>Management Cluster</div>
              )}
            </div>
          )}
          
          <div 
            style={{ 
              height: '10px', 
              backgroundColor: phaseColor,
              borderRadius: '5px',
              marginTop: '5px'
            }}
          />
        </div>
      );
    };
    
    const transformStyle = {
      transform: `scale(${scale}) translate(${transformPosition.x}px, ${transformPosition.y}px)`,
      transformOrigin: 'center'
    };
    
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
          <>
            <svg 
              ref={svgRef} 
              style={{ 
                width: '100%', 
                height: '100%',
                ...transformStyle,
                position: 'absolute',
                pointerEvents: 'none'
              }}
            />
            <div
              ref={nodesContainerRef}
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                ...transformStyle
              }}
            >
              {nodes.map(node => handleNodeRender(node))}
            </div>
          </>
        )}
      </Box>
    );
  }
);

export default ManagementClusterTree; 