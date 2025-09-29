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
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const tickCounter = useRef(0);
  
  // Обновляем ref при изменении onTick
  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  // Инициализация симуляции
  useEffect(() => {
    // Если симуляция уже существует, обновляем узлы
    if (simulationRef.current && nodesRef.current.length > 0) {
      const existingNodesMap = new Map(nodesRef.current.map(n => [n.id, n]));
      
      // Определяем связанные узлы
      const connectedNodeIds = new Set<string>();
      edges.forEach(edge => {
        const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
        const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
        connectedNodeIds.add(sourceId);
        connectedNodeIds.add(targetId);
      });
      
      // Подсчитываем количество новых несвязанных узлов для сетки
      let unconnectedIndex = 0;
      
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
          const isConnected = connectedNodeIds.has(node.id);
          
          let x = savedPos ? savedPos.x : dimensions.width / 2;
          let y = savedPos ? savedPos.y : dimensions.height / 2;
          
          if (!savedPos && !isConnected) {
            // Размещаем несвязанные узлы в компактной сетке
            const cols = 5; // Фиксированное количество колонок
            const row = Math.floor(unconnectedIndex / cols);
            const col = unconnectedIndex % cols;
            const spacing = 80;
            
            x = dimensions.width / 2 + (col - cols / 2) * spacing;
            y = dimensions.height / 2 + row * spacing;
            unconnectedIndex++;
          } else if (!savedPos && isConnected) {
            // Для связанных узлов - в пределах viewport
            x = dimensions.width * 0.2 + Math.random() * dimensions.width * 0.6;
            y = dimensions.height * 0.2 + Math.random() * dimensions.height * 0.6;
          }
          
          const newNode: SimulationNode = {
            id: node.id,
            x,
            y,
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
      
      // Обновляем связи, проверяя что узлы существуют
      const nodeIds = new Set(simNodes.map(n => n.id));
      const validEdges = edges.filter(edge => {
        const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
        const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
        return nodeIds.has(sourceId) && nodeIds.has(targetId);
      });
      
      const simEdges = validEdges.map(e => ({ ...e }));
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
    // Сначала определим, какие узлы будут связаны
    const connectedNodeIds = new Set<string>();
    edges.forEach(edge => {
      const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
      connectedNodeIds.add(sourceId);
      connectedNodeIds.add(targetId);
    });

    const simNodes: SimulationNode[] = nodes.map((node, index) => {
      const savedPos = nodePositionsRef.current.get(node.id);
      const isConnected = connectedNodeIds.has(node.id);
      
      // Для несвязанных узлов используем сетку в центре viewport
      let x = savedPos ? savedPos.x : dimensions.width / 2;
      let y = savedPos ? savedPos.y : dimensions.height / 2;
      
      if (!savedPos && !isConnected) {
        // Размещаем несвязанные узлы в сетке вокруг центра
        const cols = Math.ceil(Math.sqrt(nodes.length));
        const row = Math.floor(index / cols);
        const col = index % cols;
        const spacing = 100;
        
        x = dimensions.width / 2 + (col - cols / 2) * spacing;
        y = dimensions.height / 2 + (row - Math.ceil(nodes.length / cols) / 2) * spacing;
      } else if (!savedPos && isConnected) {
        // Для связанных узлов без сохраненных позиций - случайные в пределах viewport
        x = dimensions.width * 0.2 + Math.random() * dimensions.width * 0.6;
        y = dimensions.height * 0.2 + Math.random() * dimensions.height * 0.6;
      }
      
      const newNode: SimulationNode = {
        id: node.id,
        x,
        y,
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

    // Создание симуляции с оптимизациями для Safari
    const simulation = d3.forceSimulation(simNodes)
      .force('link', d3.forceLink(simEdges)
        .id((d: any) => d.id)
        .distance(150)
        .strength(0.5)
      )
      .force('charge', d3.forceManyBody()
        .strength(isSafari && nodes.length > 50 ? -200 : -300) // Уменьшаем силу для Safari
        .distanceMax(isSafari && nodes.length > 50 ? 300 : 400) // Уменьшаем радиус для Safari
        .theta(isSafari && nodes.length > 50 ? 1.2 : 0.9) // Увеличиваем theta для Safari (меньше точность, больше скорость)
      )
      .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force('collision', d3.forceCollide()
        .radius(60)
        .strength(0.7)
        .iterations(isSafari && nodes.length > 50 ? 1 : 2) // Меньше итераций для Safari
      )
      // Добавляем силу, которая удерживает несвязанные узлы ближе к центру
      .force('position', d3.forceRadial((d: SimulationNode) => {
        // Проверяем, связан ли узел
        const hasConnection = simEdges.some(edge => {
          const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
          const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
          return sourceId === d.id || targetId === d.id;
        });
        // Несвязанные узлы притягиваются к радиусу 200 от центра
        return hasConnection ? 0 : 200;
      }, dimensions.width / 2, dimensions.height / 2).strength(0.1))
      .velocityDecay(isSafari && nodes.length > 50 ? 0.7 : 0.6) // Быстрее затухание для Safari
      .alphaTarget(0)
      .alphaDecay(isSafari && nodes.length > 50 ? 0.05 : 0.0228); // Быстрее остановка симуляции для Safari

    simulationRef.current = simulation;
    
    // Форсируем несколько тиков для инициализации позиций
    simulation.tick(10);

    const lastDrawTime = 0;
    const TARGET_FPS = 60;
    const MIN_DRAW_INTERVAL = 1000 / TARGET_FPS; // Всегда целимся в 60 FPS

    // Обновление позиций при каждом тике
    simulation.on('tick', () => {
      tickCounter.current++;
      
      // Сохраняем позиции каждый тик для плавности
      simNodes.forEach(node => {
        nodePositionsRef.current.set(node.id, { 
          x: node.x, 
          y: node.y,
          fx: node.fx || null,
          fy: node.fy || null
        });
      });
      
      // Используем requestAnimationFrame для 60 FPS
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