import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  Position,
} from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

interface TableColumn {
  name: string;
  type: string;
  primary?: boolean;
  unique?: boolean;
  foreignKey?: string;
}

interface GeneratedTable {
  name: string;
  columns: TableColumn[];
}

interface ERDiagramProps {
  tables: GeneratedTable[];
}

const tableNodeStyle = {
  padding: 0,
  borderRadius: 8,
  border: '2px solid #8b5cf6',
  fontSize: 11,
  fontFamily: 'monospace',
  background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
  minWidth: 180,
  overflow: 'hidden',
};

export default function ERDiagram({ tables }: ERDiagramProps) {
  const { nodes, edges } = useMemo(() => {
    const n: Node[] = [];
    const e: Edge[] = [];
    
    const cols = Math.ceil(Math.sqrt(tables.length));
    const spacingX = 280;
    const spacingY = 220;
    
    tables.forEach((table, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      
      n.push({
        id: table.name,
        data: {
          label: (
            <div style={{ textAlign: 'left' }}>
              <div style={{ 
                background: '#4c1d95', 
                padding: '8px 12px', 
                borderBottom: '1px solid #6d28d9',
                fontWeight: 'bold',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                <span style={{ color: '#c4b5fd' }}>📋</span>
                {table.name}
              </div>
              <div style={{ padding: '6px 0' }}>
                {table.columns.map((col, i) => (
                  <div 
                    key={i} 
                    style={{ 
                      padding: '4px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 10,
                      background: col.primary ? 'rgba(251, 191, 36, 0.1)' : 
                                  col.foreignKey ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                      borderLeft: col.primary ? '3px solid #fbbf24' : 
                                  col.foreignKey ? '3px solid #3b82f6' : '3px solid transparent'
                    }}
                  >
                    <span style={{ 
                      color: col.primary ? '#fbbf24' : col.foreignKey ? '#60a5fa' : '#a5b4fc',
                      minWidth: 14,
                      fontSize: 10
                    }}>
                      {col.primary ? '🔑' : col.foreignKey ? '🔗' : col.unique ? '✨' : '  '}
                    </span>
                    <span style={{ color: '#e0e7ff', flex: 1 }}>{col.name}</span>
                    <span style={{ color: '#818cf8', fontSize: 9 }}>{col.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        },
        position: { x: col * spacingX + 50, y: row * spacingY + 50 },
        style: tableNodeStyle,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });
      
      table.columns.forEach(col => {
        if (col.foreignKey) {
          const refTable = col.foreignKey.split('.')[0];
          if (tables.some(t => t.name === refTable)) {
            e.push({
              id: `${table.name}-${col.name}-${refTable}`,
              source: table.name,
              target: refTable,
              animated: true,
              label: col.name,
              labelStyle: { fontSize: 9, fill: '#818cf8' },
              labelBgStyle: { fill: '#1e1b4b', fillOpacity: 0.9 },
              style: { stroke: '#60a5fa' },
              markerEnd: { type: MarkerType.ArrowClosed, color: '#60a5fa' },
            });
          }
        }
      });
    });
    
    return { nodes: n, edges: e };
  }, [tables]);

  if (tables.length === 0) {
    return (
      <div style={{ 
        width: '100%', 
        height: 400, 
        background: '#0f172a', 
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#64748b'
      }}>
        No tables generated yet. Generate code to see the ERD.
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: 500, background: '#0f172a', borderRadius: 8 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#334155" gap={20} />
        <Controls style={{ background: '#1e293b', borderRadius: 4 }} />
      </ReactFlow>
      <div style={{ 
        padding: '8px 12px', 
        background: '#1e293b', 
        borderRadius: '0 0 8px 8px',
        display: 'flex',
        gap: 16,
        fontSize: 11,
        color: '#94a3b8'
      }}>
        <span><span style={{ color: '#fbbf24' }}>🔑</span> Primary Key</span>
        <span><span style={{ color: '#60a5fa' }}>🔗</span> Foreign Key</span>
        <span><span style={{ color: '#a5b4fc' }}>✨</span> Unique</span>
        <span style={{ marginLeft: 'auto' }}>{tables.length} tables</span>
      </div>
    </div>
  );
}
