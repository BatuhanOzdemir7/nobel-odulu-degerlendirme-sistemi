import { describe, expect, it } from 'vitest';
import backendContract from '../../../../../../backend/src/test/resources/activity/er-topology.json';
import { ER_EDGES, ER_NODES } from './er-topology';

describe('ER topology', () => {
  it('matches the backend topology contract with 11 distinct nodes and 11 distinct directed edges', () => {
    const nodes = new Set<string>(ER_NODES.map(node => node.id));
    const edges = new Set(ER_EDGES.map(edge => edge.id));
    expect(ER_NODES).toHaveLength(11);
    expect(nodes.size).toBe(11);
    expect(ER_EDGES).toHaveLength(11);
    expect(edges.size).toBe(11);
    expect(nodes).toEqual(new Set(backendContract.nodes));
    expect(edges).toEqual(new Set(backendContract.edges));
    for (const edge of ER_EDGES) {
      expect(nodes.has(edge.from)).toBe(true);
      expect(nodes.has(edge.to)).toBe(true);
      expect(edge.id).toBe([edge.from, edge.to].join('-'));
    }
  });
});
