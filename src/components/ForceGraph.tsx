import { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import { GraphNode, GraphEdge } from '@/types/funding';

interface ForceGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width?: number;
  height?: number;
  onNodeClick?: (node: GraphNode) => void;
}

const NODE_COLORS: Record<string, string> = {
  organization: '#00ffff',
  funder: '#ffbb00',
  person: '#00ff88',
};

const EDGE_COLORS: Record<string, string> = {
  funding: '#00cccc',
  partnership: '#ffbb00',
  co_occurrence: '#38bdf8',
};

export function ForceGraph({ nodes, edges, width = 600, height = 400, onNodeClick }: ForceGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null);

  const render = useCallback(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g');

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 5])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);

    // Simulation
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphEdge>(edges).id(d => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(35));

    simulationRef.current = simulation;

    // Edges
    const link = g.append('g')
      .selectAll('line')
      .data(edges)
      .join('line')
      .attr('stroke', d => EDGE_COLORS[d.type] || '#666')
      .attr('stroke-opacity', 0.4)
      .attr('stroke-width', 1.5);

    // Node groups
    const node = g.append('g')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'pointer')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // Glow effect
    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const merge = filter.append('feMerge');
    merge.append('feMergeNode').attr('in', 'coloredBlur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Circles
    node.append('circle')
      .attr('r', d => d.type === 'funder' ? 12 : d.type === 'person' ? 8 : 16)
      .attr('fill', d => NODE_COLORS[d.type] || '#4f46e5')
      .attr('stroke', d => NODE_COLORS[d.type] || '#4f46e5')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.3)
      .attr('filter', 'url(#glow)');

    // Labels
    node.append('text')
      .text(d => d.label.length > 18 ? d.label.substring(0, 16) + '…' : d.label)
      .attr('dy', d => (d.type === 'funder' ? 22 : d.type === 'person' ? 18 : 28))
      .attr('text-anchor', 'middle')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .attr('font-family', 'Manrope, sans-serif');

    node.on('click', (_, d) => onNodeClick?.(d));

    // Tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x || 0)
        .attr('y1', d => (d.source as GraphNode).y || 0)
        .attr('x2', d => (d.target as GraphNode).x || 0)
        .attr('y2', d => (d.target as GraphNode).y || 0);

      node.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
    });

    // Initial zoom to fit
    setTimeout(() => {
      svg.call(zoom.transform, d3.zoomIdentity.translate(0, 0).scale(0.85));
    }, 500);

  }, [nodes, edges, width, height, onNodeClick]);

  useEffect(() => {
    render();
    return () => {
      simulationRef.current?.stop();
    };
  }, [render]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className="w-full h-full"
      viewBox={`0 0 ${width} ${height}`}
    />
  );
}
