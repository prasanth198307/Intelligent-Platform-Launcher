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

interface InfraSpec {
  tier: string;
  compute: {
    appServers: number;
    appServerVCPU: number;
    appServerRAM: number;
    dbPrimary: number;
    dbReplicas: number;
    dbVCPU: number;
    dbRAM: number;
    cacheNodes: number;
    cacheRAM: number;
    queueBrokers: number;
  };
}

interface ArchitectureDiagramProps {
  infra: InfraSpec;
  database: string;
  cloud: string;
}

const nodeStyle = {
  padding: 10,
  borderRadius: 8,
  border: '2px solid',
  fontSize: 11,
  fontFamily: 'monospace',
  textAlign: 'center' as const,
  minWidth: 120,
};

const getInstanceType = (cloud: string, vCPU: number, ram: number, type: 'app' | 'db' | 'cache' | 'queue'): string => {
  const instances: Record<string, Record<string, Record<string, string>>> = {
    aws: {
      app: {
        '2-8': 't3.large',
        '4-8': 'm5.xlarge',
        '8-16': 'm5.2xlarge',
        '16-32': 'm5.4xlarge',
      },
      db: {
        '2-16': 'db.t3.xlarge',
        '8-64': 'db.r5.2xlarge',
        '16-128': 'db.r5.4xlarge',
      },
      cache: {
        '4': 'cache.r5.large',
        '16': 'cache.r5.xlarge',
        '32': 'cache.r5.2xlarge',
        '64': 'cache.r5.4xlarge',
      },
      queue: {
        'default': 'mq.m5.large',
      },
    },
    azure: {
      app: {
        '2-8': 'Standard_D2s_v3',
        '4-8': 'Standard_D4s_v3',
        '8-16': 'Standard_D8s_v3',
        '16-32': 'Standard_D16s_v3',
      },
      db: {
        '2-16': 'GP_Gen5_2',
        '8-64': 'GP_Gen5_8',
        '16-128': 'MO_Gen5_16',
      },
      cache: {
        '4': 'C3 Standard',
        '16': 'P2 Premium',
        '32': 'P3 Premium',
        '64': 'P4 Premium',
      },
      queue: {
        'default': 'Service Bus Premium',
      },
    },
    gcp: {
      app: {
        '2-8': 'e2-standard-2',
        '4-8': 'e2-standard-4',
        '8-16': 'e2-standard-8',
        '16-32': 'e2-standard-16',
      },
      db: {
        '2-16': 'db-custom-2-16384',
        '8-64': 'db-custom-8-65536',
        '16-128': 'db-custom-16-131072',
      },
      cache: {
        '4': 'M1 (4GB)',
        '16': 'M2 (16GB)',
        '32': 'M3 (32GB)',
        '64': 'M4 (64GB)',
      },
      queue: {
        'default': 'Cloud Pub/Sub',
      },
    },
  };

  const provider = instances[cloud] || instances.aws;
  const typeMap = provider[type] || {};
  
  if (type === 'cache') {
    return typeMap[ram.toString()] || typeMap['4'] || 'cache.r5.large';
  }
  if (type === 'queue') {
    return typeMap['default'] || 'mq.m5.large';
  }
  
  const key = `${vCPU}-${ram}`;
  return typeMap[key] || Object.values(typeMap)[0] || 'Unknown';
};

export default function ArchitectureDiagram({ infra, database, cloud }: ArchitectureDiagramProps) {
  const { nodes, edges } = useMemo(() => {
    const n: Node[] = [];
    const e: Edge[] = [];
    
    const appInstance = getInstanceType(cloud, infra.compute.appServerVCPU, infra.compute.appServerRAM, 'app');
    const dbInstance = getInstanceType(cloud, infra.compute.dbVCPU, infra.compute.dbRAM, 'db');
    const cacheInstance = getInstanceType(cloud, 0, infra.compute.cacheRAM, 'cache');
    
    n.push({
      id: 'lb',
      data: { 
        label: (
          <div>
            <strong>Load Balancer</strong><br/>
            <span style={{fontSize: 10}}>
              {cloud === 'aws' ? 'ALB/NLB' : cloud === 'azure' ? 'Azure LB' : 'Cloud LB'}
            </span><br/>
            <span style={{fontSize: 9, color: '#888'}}>HTTPS/443</span>
          </div>
        )
      },
      position: { x: 300, y: 0 },
      style: { ...nodeStyle, borderColor: '#10b981', background: 'linear-gradient(135deg, #064e3b, #065f46)' },
      sourcePosition: Position.Bottom,
    });

    const appCount = Math.min(infra.compute.appServers, 4);
    const appSpacing = 160;
    const startX = 300 - ((appCount - 1) * appSpacing) / 2;
    
    for (let i = 0; i < appCount; i++) {
      const nodeId = `app-${i}`;
      n.push({
        id: nodeId,
        data: { 
          label: (
            <div>
              <strong>App Server {i + 1}</strong><br/>
              <span style={{fontSize: 10}}>{infra.compute.appServerVCPU} vCPU / {infra.compute.appServerRAM}GB</span><br/>
              <span style={{fontSize: 9, color: '#60a5fa'}}>{appInstance}</span>
            </div>
          )
        },
        position: { x: startX + i * appSpacing, y: 100 },
        style: { ...nodeStyle, borderColor: '#3b82f6', background: 'linear-gradient(135deg, #1e3a5f, #1e40af)' },
        targetPosition: Position.Top,
        sourcePosition: Position.Bottom,
      });
      e.push({
        id: `lb-app-${i}`,
        source: 'lb',
        target: nodeId,
        animated: true,
        style: { stroke: '#10b981' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
      });
    }

    if (infra.compute.appServers > 4) {
      n.push({
        id: 'app-more',
        data: { 
          label: (
            <div>
              <strong>+{infra.compute.appServers - 4} more</strong><br/>
              <span style={{fontSize: 10}}>Auto-scaling</span>
            </div>
          )
        },
        position: { x: startX + 4 * appSpacing, y: 100 },
        style: { ...nodeStyle, borderColor: '#6b7280', background: 'linear-gradient(135deg, #374151, #4b5563)', borderStyle: 'dashed' },
      });
    }

    if (infra.compute.cacheNodes > 0) {
      n.push({
        id: 'cache',
        data: { 
          label: (
            <div>
              <strong>Redis Cache</strong><br/>
              <span style={{fontSize: 10}}>{infra.compute.cacheNodes} nodes × {infra.compute.cacheRAM}GB</span><br/>
              <span style={{fontSize: 9, color: '#f87171'}}>{cacheInstance}</span>
            </div>
          )
        },
        position: { x: 100, y: 230 },
        style: { ...nodeStyle, borderColor: '#ef4444', background: 'linear-gradient(135deg, #7f1d1d, #991b1b)' },
        targetPosition: Position.Top,
      });
      
      e.push({
        id: 'app-cache',
        source: 'app-0',
        target: 'cache',
        style: { stroke: '#ef4444' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
      });
    }

    n.push({
      id: 'db-primary',
      data: { 
        label: (
          <div>
            <strong>{database.toUpperCase()}</strong><br/>
            <span style={{fontSize: 10}}>Primary</span><br/>
            <span style={{fontSize: 10}}>{infra.compute.dbVCPU} vCPU / {infra.compute.dbRAM}GB</span><br/>
            <span style={{fontSize: 9, color: '#a78bfa'}}>{dbInstance}</span>
          </div>
        )
      },
      position: { x: 300, y: 230 },
      style: { ...nodeStyle, borderColor: '#8b5cf6', background: 'linear-gradient(135deg, #4c1d95, #5b21b6)' },
      targetPosition: Position.Top,
      sourcePosition: Position.Right,
    });

    e.push({
      id: 'app-db',
      source: n.some(node => node.id === 'app-1') ? 'app-1' : 'app-0',
      target: 'db-primary',
      style: { stroke: '#8b5cf6' },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' },
    });

    if (infra.compute.dbReplicas > 0) {
      const replicaCount = Math.min(infra.compute.dbReplicas, 3);
      for (let i = 0; i < replicaCount; i++) {
        n.push({
          id: `db-replica-${i}`,
          data: { 
            label: (
              <div>
                <strong>Replica {i + 1}</strong><br/>
                <span style={{fontSize: 10}}>Read-only</span><br/>
                <span style={{fontSize: 9, color: '#c4b5fd'}}>{dbInstance}</span>
              </div>
            )
          },
          position: { x: 500 + i * 120, y: 230 },
          style: { ...nodeStyle, borderColor: '#a78bfa', background: 'linear-gradient(135deg, #3730a3, #4338ca)', borderStyle: 'dashed' },
          targetPosition: Position.Left,
        });
        e.push({
          id: `db-replica-${i}`,
          source: 'db-primary',
          target: `db-replica-${i}`,
          animated: true,
          label: 'sync',
          labelStyle: { fontSize: 9, fill: '#a78bfa' },
          style: { stroke: '#a78bfa' },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#a78bfa' },
        });
      }
    }

    if (infra.compute.queueBrokers > 0) {
      const queueInstance = getInstanceType(cloud, 0, 0, 'queue');
      n.push({
        id: 'queue',
        data: { 
          label: (
            <div>
              <strong>Message Queue</strong><br/>
              <span style={{fontSize: 10}}>{infra.compute.queueBrokers} brokers</span><br/>
              <span style={{fontSize: 9, color: '#fbbf24'}}>{queueInstance}</span>
            </div>
          )
        },
        position: { x: 100, y: 350 },
        style: { ...nodeStyle, borderColor: '#f59e0b', background: 'linear-gradient(135deg, #78350f, #92400e)' },
        targetPosition: Position.Top,
      });
      
      e.push({
        id: 'app-queue',
        source: 'app-0',
        target: 'queue',
        style: { stroke: '#f59e0b' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
      });
    }

    n.push({
      id: 'storage',
      data: { 
        label: (
          <div>
            <strong>Object Storage</strong><br/>
            <span style={{fontSize: 10}}>
              {cloud === 'aws' ? 'S3' : cloud === 'azure' ? 'Blob Storage' : 'Cloud Storage'}
            </span><br/>
            <span style={{fontSize: 9, color: '#888'}}>Backups & Logs</span>
          </div>
        )
      },
      position: { x: 500, y: 350 },
      style: { ...nodeStyle, borderColor: '#6b7280', background: 'linear-gradient(135deg, #1f2937, #374151)' },
      targetPosition: Position.Top,
    });

    e.push({
      id: 'db-storage',
      source: 'db-primary',
      target: 'storage',
      style: { stroke: '#6b7280', strokeDasharray: '5,5' },
      label: 'backup',
      labelStyle: { fontSize: 9, fill: '#6b7280' },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280' },
    });

    return { nodes: n, edges: e };
  }, [infra, database, cloud]);

  return (
    <div style={{ width: '100%', height: 450, background: '#0f172a', borderRadius: 8 }}>
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
    </div>
  );
}
