import { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3-force';
import { SimulationNode } from './types';
import { Entrepreneur, GraphEdge } from '@/types/entrepreneur';

interface UseSimulationProps {
  nodes: Entrepreneur[];
  edges: GraphEdge[];
  dimensions: { width: number; height: number };
  nodePositionsRef: React.MutableRefObject<Map<string, { x: number; y: number; fx: number | null; fy: number | null }>>;
  onTick: () => void;
}

export function useSimulation({ 
  nodes, 
  edges, 
  dimensions, 
  nodePositionsRef,
  onTick 
}: UseSimulationProps) {
  const simulationRef = useRef<d3.Simulation<SimulationNode, undefined> | null>(null);
  const nodesRef = useRef<SimulationNode[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Инициализация симуляции
  useEffect(() => {
    // Преобразование узлов для симуляции с сохранением позиций
    const simNodes: SimulationNode[] = nodes.map(node => {
      const savedPos = nodePositionsRef.current.get(node.id);
      const newNode: SimulationNode = {
        id: node.id,
        x: savedPos ? savedPos.x : Math.random() * dimensions.width,
        y: savedPos ? savedPos.y : Math.random() * dimensions.height,
        data: node
      };
      
      // Восстанавливаем фиксированные позиции если они были
      if (savedPos?.fx !== null && savedPos?.fx !== undefined) {
        newNode.fx = savedPos.fx;
      }
      if (savedPos?.fy !== null && savedPos?.fy !== undefined) {
        newNode.fy = savedPos.fy;
      }
      
      return newNode;
    });
    nodesRef.current = simNodes;

    // Создаем копию edges для симуляции
    const simEdges = edges.map(e => ({ ...e }));

    // Создание симуляции
    const simulation = d3.forceSimulation(simNodes)
      .force('link', d3.forceLink(simEdges)
        .id((d: any) => d.id)
        .distance(150)
        .strength(0.5)
      )
      .force('charge', d3.forceManyBody()
        .strength(-300)
        .distanceMax(400)
      )
      .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force('collision', d3.forceCollide()
        .radius(60)
        .strength(0.7)
      )
      .velocityDecay(0.6)
      .alphaTarget(0);

    simulationRef.current = simulation;

    // Обновление позиций при каждом тике
    simulation.on('tick', () => {
      // Сохраняем текущие позиции узлов
      simNodes.forEach(node => {
        nodePositionsRef.current.set(node.id, { 
          x: node.x, 
          y: node.y,
          fx: node.fx || null,
          fy: node.fy || null
        });
      });
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(() => {
        onTick();
      });
    });

    return () => {
      simulation.stop();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [nodes, edges, dimensions, nodePositionsRef, onTick]);

  // Метод для сброса всех фиксированных позиций
  const resetNodePositions = useCallback(() => {
    const simNodes = nodesRef.current;
    simNodes.forEach(node => {
      node.fx = null;
      node.fy = null;
    });
    
    // Очищаем сохраненные позиции
    nodePositionsRef.current.clear();
    
    // Перезапускаем симуляцию с большей энергией для перестроения графа
    if (simulationRef.current) {
      simulationRef.current
        .alpha(1) // Полная энергия для полного перестроения
        .restart();
    }
  }, [nodePositionsRef]);

  return {
    simulationRef,
    nodesRef,
    resetNodePositions
  };
}