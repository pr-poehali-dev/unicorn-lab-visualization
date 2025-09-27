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
  const onTickRef = useRef(onTick);
  
  // Обновляем ref при изменении onTick
  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  // Инициализация симуляции
  useEffect(() => {
    // Если симуляция уже существует, обновляем узлы
    if (simulationRef.current && nodesRef.current.length > 0) {
      const existingNodesMap = new Map(nodesRef.current.map(n => [n.id, n]));
      
      // Обновляем существующие узлы или создаем новые
      const simNodes: SimulationNode[] = nodes.map(node => {
        const existingNode = existingNodesMap.get(node.id);
        if (existingNode) {
          // Обновляем только data, сохраняя позиции и фиксации
          existingNode.data = node;
          return existingNode;
        } else {
          // Создаем новый узел
          const savedPos = nodePositionsRef.current.get(node.id);
          const newNode: SimulationNode = {
            id: node.id,
            x: savedPos ? savedPos.x : Math.random() * dimensions.width,
            y: savedPos ? savedPos.y : Math.random() * dimensions.height,
            data: node
          };
          
          if (savedPos?.fx !== null && savedPos?.fx !== undefined) {
            newNode.fx = savedPos.fx;
          }
          if (savedPos?.fy !== null && savedPos?.fy !== undefined) {
            newNode.fy = savedPos.fy;
          }
          
          return newNode;
        }
      });
      
      nodesRef.current = simNodes;
      
      // Обновляем узлы в симуляции
      simulationRef.current.nodes(simNodes);
      
      // Обновляем связи
      const simEdges = edges.map(e => ({ ...e }));
      const linkForce = simulationRef.current.force('link') as any;
      if (linkForce) {
        linkForce.links(simEdges);
      }
      
      // Перезапускаем симуляцию с минимальной энергией
      simulationRef.current.alpha(0.3).restart();
      // Форсируем несколько тиков для обновления позиций
      simulationRef.current.tick(5);
      return;
    }
    
    // Создание новой симуляции
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
    
    // Форсируем несколько тиков для инициализации позиций
    simulation.tick(10);

    let lastDrawTime = 0;
    const MIN_DRAW_INTERVAL = 16; // ~60 FPS

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
      
      // Ограничиваем частоту перерисовки
      const now = performance.now();
      if (now - lastDrawTime < MIN_DRAW_INTERVAL) {
        return; // Пропускаем этот кадр
      }
      lastDrawTime = now;
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(() => {
        onTickRef.current();
      });
    });

    return () => {
      simulation.stop();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [nodes, edges, dimensions]); // Убираем onTick из зависимостей

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