import { useCallback } from 'react';
import { SimulationNode } from './types';

interface NodeUtilsProps {
  simulationRef: React.MutableRefObject<any>;
  nodePositionsRef: React.MutableRefObject<Map<string, any>>;
  selectedCluster: string | null;
}

export function useNodeUtils({
  simulationRef,
  nodePositionsRef,
  selectedCluster
}: NodeUtilsProps) {
  const getNodeAtPosition = useCallback((x: number, y: number): SimulationNode | null => {
    if (!simulationRef.current) return null;
    
    const simNodes = simulationRef.current.nodes();
    if (!simNodes || simNodes.length === 0) return null;
    
    const visibleNodes = selectedCluster && selectedCluster !== 'Все'
      ? simNodes.filter(n => n.data.cluster === selectedCluster)
      : simNodes;

    return visibleNodes.find(node => {
      if (typeof node.x !== 'number' || typeof node.y !== 'number') return false;
      
      const distance = Math.sqrt(Math.pow(node.x - x, 2) + Math.pow(node.y - y, 2));
      return distance <= 40;
    }) || null;
  }, [selectedCluster, simulationRef]);

  const resetNodePositions = useCallback(() => {
    if (simulationRef.current) {
      const simNodes = simulationRef.current.nodes();
      simNodes.forEach(node => {
        node.fx = null;
        node.fy = null;
      });
      
      nodePositionsRef.current.clear();
      
      simulationRef.current
        .alpha(1)
        .restart();
    }
  }, [nodePositionsRef, simulationRef]);

  return {
    getNodeAtPosition,
    resetNodePositions
  };
}