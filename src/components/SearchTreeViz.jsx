import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export function SearchTreeViz({ treeNodes, algoColor }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!treeNodes || treeNodes.length < 2 || !ref.current) return;
    const W = 520, H = 300;
    d3.select(ref.current).selectAll('*').remove();

    const byId = {};
    treeNodes.forEach((n) => { byId[n.id] = { ...n, children: [] }; });
    let root = null;
    treeNodes.forEach((n) => {
      if (!n.parentId) root = byId[n.id];
      else if (byId[n.parentId]) byId[n.parentId].children.push(byId[n.id]);
    });
    if (!root) return;

    const hier = d3.hierarchy(root);
    d3.tree().size([W - 60, H - 50])(hier);

    const svg = d3.select(ref.current).attr('width', W).attr('height', H);
    const g   = svg.append('g').attr('transform', 'translate(30,25)');

    g.selectAll('.lnk').data(hier.links()).enter().append('line')
      .attr('x1', (d) => d.source.x).attr('y1', (d) => d.source.y)
      .attr('x2', (d) => d.target.x).attr('y2', (d) => d.target.y)
      .attr('stroke', algoColor + '2a').attr('stroke-width', 1);

    const node = g.selectAll('.nd').data(hier.descendants()).enter()
      .append('g').attr('transform', (d) => `translate(${d.x},${d.y})`);

    node.append('circle')
      .attr('r', (d) => d.depth === 0 ? 7 : 3.5)
      .attr('fill', (d) => d.depth === 0 ? algoColor : algoColor + '66')
      .attr('stroke', algoColor).attr('stroke-width', 1);

    node.filter((d) => d.depth === 0).append('text')
      .attr('dy', -11).attr('text-anchor', 'middle')
      .attr('fill', algoColor).attr('font-size', 9)
      .attr('font-family', 'Courier New').text('START');
  }, [treeNodes, algoColor]);

  return <svg ref={ref} style={{ display: 'block' }} />;
}
