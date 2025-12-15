import { useState } from 'react';

interface IntegrationPanelProps {
  domain: string;
  tables?: any[];
}

interface WebhookConfig {
  name: string;
  url: string;
  events: string[];
  secret: string;
  enabled: boolean;
}

export default function IntegrationPanel({ domain, tables }: IntegrationPanelProps) {
  const [activeTab, setActiveTab] = useState<'webhooks' | 'graphql' | 'messagequeue'>('webhooks');
  
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [newWebhook, setNewWebhook] = useState({ name: '', url: '', events: [] as string[], secret: '' });
  
  const [graphqlSchema, setGraphqlSchema] = useState('');
  const [generatingGraphQL, setGeneratingGraphQL] = useState(false);
  
  const [mqProvider, setMqProvider] = useState<'rabbitmq' | 'kafka' | 'redis' | 'sqs'>('rabbitmq');
  const [mqConfig, setMqConfig] = useState('');
  const [generatingMQ, setGeneratingMQ] = useState(false);

  const availableEvents = [
    'user.created', 'user.updated', 'user.deleted',
    'order.created', 'order.updated', 'order.completed', 'order.cancelled',
    'payment.success', 'payment.failed', 'payment.refunded',
    'item.created', 'item.updated', 'item.deleted',
    'notification.sent', 'alert.triggered'
  ];

  const addWebhook = () => {
    if (!newWebhook.name || !newWebhook.url) return;
    setWebhooks([...webhooks, { 
      ...newWebhook, 
      secret: 'whsec_' + Math.random().toString(36).substring(2, 15),
      enabled: true 
    }]);
    setNewWebhook({ name: '', url: '', events: [], secret: '' });
  };

  const toggleWebhook = (index: number) => {
    const updated = [...webhooks];
    updated[index].enabled = !updated[index].enabled;
    setWebhooks(updated);
  };

  const removeWebhook = (index: number) => {
    setWebhooks(webhooks.filter((_, i) => i !== index));
  };

  const generateGraphQLSchema = async () => {
    setGeneratingGraphQL(true);
    await new Promise(r => setTimeout(r, 1000));
    
    const tableSchemas = (tables || []).map(table => {
      const fields = table.columns.map((col: any) => {
        let gqlType = 'String';
        if (col.type.includes('int') || col.type.includes('serial')) gqlType = 'Int';
        if (col.type.includes('float') || col.type.includes('decimal')) gqlType = 'Float';
        if (col.type.includes('bool')) gqlType = 'Boolean';
        if (col.type.includes('timestamp') || col.type.includes('date')) gqlType = 'DateTime';
        
        const required = col.primary || col.name === 'id' ? '!' : '';
        return `  ${col.name}: ${gqlType}${required}`;
      }).join('\n');
      
      return `type ${table.name.charAt(0).toUpperCase() + table.name.slice(1)} {
${fields}
}`;
    }).join('\n\n');

    const queries = (tables || []).map(table => {
      const typeName = table.name.charAt(0).toUpperCase() + table.name.slice(1);
      return `  ${table.name}(id: ID!): ${typeName}
  ${table.name}s(limit: Int, offset: Int): [${typeName}!]!`;
    }).join('\n');

    const inputTypes = (tables || []).map(table => {
      const typeName = table.name.charAt(0).toUpperCase() + table.name.slice(1);
      const fields = table.columns
        .filter((col: any) => !col.primary && col.name !== 'id' && !col.name.includes('created') && !col.name.includes('updated'))
        .map((col: any) => {
          let gqlType = 'String';
          if (col.type.includes('int') || col.type.includes('serial')) gqlType = 'Int';
          if (col.type.includes('float') || col.type.includes('decimal')) gqlType = 'Float';
          if (col.type.includes('bool')) gqlType = 'Boolean';
          if (col.type.includes('timestamp') || col.type.includes('date')) gqlType = 'DateTime';
          return `  ${col.name}: ${gqlType}`;
        }).join('\n');
      
      return `input ${typeName}Input {
${fields || '  _placeholder: String'}
}`;
    }).join('\n\n');

    const mutations = (tables || []).map(table => {
      const typeName = table.name.charAt(0).toUpperCase() + table.name.slice(1);
      return `  create${typeName}(input: ${typeName}Input!): ${typeName}!
  update${typeName}(id: ID!, input: ${typeName}Input!): ${typeName}!
  delete${typeName}(id: ID!): Boolean!`;
    }).join('\n');

    const schema = `# GraphQL Schema for ${domain} Application
# Generated automatically from database schema

scalar DateTime

${tableSchemas}

${inputTypes}

type Query {
${queries || '  ping: String!'}
}

type Mutation {
${mutations || '  noop: Boolean'}
}

type Subscription {
  onDataChange(type: String!): ChangeEvent!
}

type ChangeEvent {
  type: String!
  operation: String!
  data: String!
  timestamp: DateTime!
}`;

    setGraphqlSchema(schema);
    setGeneratingGraphQL(false);
  };

  const generateMQConfig = async () => {
    setGeneratingMQ(true);
    await new Promise(r => setTimeout(r, 800));
    
    const configs: Record<string, string> = {
      rabbitmq: `# RabbitMQ Configuration for ${domain}
# docker-compose.yml

version: '3.8'
services:
  rabbitmq:
    image: rabbitmq:3-management
    container_name: ${domain}-rabbitmq
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: \${RABBITMQ_PASSWORD}
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq

volumes:
  rabbitmq_data:

---
# TypeScript Client Example

import amqp from 'amqplib';

const QUEUE_NAME = '${domain}-events';

async function setupRabbitMQ() {
  const connection = await amqp.connect(process.env.RABBITMQ_URL!);
  const channel = await connection.createChannel();
  
  await channel.assertQueue(QUEUE_NAME, { durable: true });
  
  return { connection, channel };
}

async function publishEvent(channel: amqp.Channel, event: object) {
  channel.sendToQueue(
    QUEUE_NAME,
    Buffer.from(JSON.stringify(event)),
    { persistent: true }
  );
}

async function consumeEvents(channel: amqp.Channel, handler: (msg: any) => void) {
  channel.consume(QUEUE_NAME, (msg) => {
    if (msg) {
      const event = JSON.parse(msg.content.toString());
      handler(event);
      channel.ack(msg);
    }
  });
}`,

      kafka: `# Apache Kafka Configuration for ${domain}
# docker-compose.yml

version: '3.8'
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:latest
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      
  kafka:
    image: confluentinc/cp-kafka:latest
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1

---
# TypeScript Client Example

import { Kafka, Producer, Consumer } from 'kafkajs';

const kafka = new Kafka({
  clientId: '${domain}-app',
  brokers: [process.env.KAFKA_BROKER!]
});

const producer: Producer = kafka.producer();
const consumer: Consumer = kafka.consumer({ groupId: '${domain}-group' });

async function publishEvent(topic: string, event: object) {
  await producer.connect();
  await producer.send({
    topic,
    messages: [{ value: JSON.stringify(event) }]
  });
}

async function consumeEvents(topic: string, handler: (event: any) => void) {
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: false });
  
  await consumer.run({
    eachMessage: async ({ message }) => {
      const event = JSON.parse(message.value!.toString());
      handler(event);
    }
  });
}`,

      redis: `# Redis Pub/Sub Configuration for ${domain}
# docker-compose.yml

version: '3.8'
services:
  redis:
    image: redis:alpine
    container_name: ${domain}-redis
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

volumes:
  redis_data:

---
# TypeScript Client Example

import Redis from 'ioredis';

const publisher = new Redis(process.env.REDIS_URL!);
const subscriber = new Redis(process.env.REDIS_URL!);

async function publishEvent(channel: string, event: object) {
  await publisher.publish(channel, JSON.stringify(event));
}

async function subscribeToEvents(channel: string, handler: (event: any) => void) {
  await subscriber.subscribe(channel);
  
  subscriber.on('message', (ch, message) => {
    if (ch === channel) {
      const event = JSON.parse(message);
      handler(event);
    }
  });
}

// Stream-based (for persistence)
async function addToStream(stream: string, event: object) {
  await publisher.xadd(stream, '*', 'data', JSON.stringify(event));
}

async function readFromStream(stream: string, handler: (event: any) => void) {
  let lastId = '0';
  while (true) {
    const results = await subscriber.xread('BLOCK', 0, 'STREAMS', stream, lastId);
    if (results) {
      for (const [, messages] of results) {
        for (const [id, fields] of messages) {
          const event = JSON.parse(fields[1]);
          handler(event);
          lastId = id;
        }
      }
    }
  }
}`,

      sqs: `# AWS SQS Configuration for ${domain}
# Terraform configuration

resource "aws_sqs_queue" "${domain}_events" {
  name                      = "${domain}-events"
  delay_seconds             = 0
  max_message_size          = 262144
  message_retention_seconds = 1209600  # 14 days
  visibility_timeout_seconds = 30
  
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.${domain}_dlq.arn
    maxReceiveCount     = 3
  })
}

resource "aws_sqs_queue" "${domain}_dlq" {
  name = "${domain}-events-dlq"
}

---
# TypeScript Client Example

import { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';

const sqs = new SQSClient({ region: process.env.AWS_REGION });
const QUEUE_URL = process.env.SQS_QUEUE_URL!;

async function publishEvent(event: object) {
  await sqs.send(new SendMessageCommand({
    QueueUrl: QUEUE_URL,
    MessageBody: JSON.stringify(event),
    MessageGroupId: '${domain}-events'
  }));
}

async function consumeEvents(handler: (event: any) => void) {
  while (true) {
    const response = await sqs.send(new ReceiveMessageCommand({
      QueueUrl: QUEUE_URL,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 20
    }));
    
    for (const message of response.Messages || []) {
      const event = JSON.parse(message.Body!);
      await handler(event);
      
      await sqs.send(new DeleteMessageCommand({
        QueueUrl: QUEUE_URL,
        ReceiptHandle: message.ReceiptHandle!
      }));
    }
  }
}`
    };
    
    setMqConfig(configs[mqProvider]);
    setGeneratingMQ(false);
  };

  return (
    <div style={{ background: '#1e293b', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid #334155' }}>
        {[
          { id: 'webhooks', label: 'Webhooks', icon: '🔗' },
          { id: 'graphql', label: 'GraphQL Schema', icon: '◈' },
          { id: 'messagequeue', label: 'Message Queues', icon: '📨' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: activeTab === tab.id ? '#334155' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #10b981' : '2px solid transparent',
              color: activeTab === tab.id ? '#e2e8f0' : '#94a3b8',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: activeTab === tab.id ? 600 : 400,
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding: 16 }}>
        {activeTab === 'webhooks' && (
          <div>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
              Configure webhooks to receive real-time notifications when events occur in your application.
            </p>
            
            <div style={{ 
              background: '#0f172a', 
              borderRadius: 8, 
              padding: 16, 
              marginBottom: 16,
              border: '1px solid #334155'
            }}>
              <h4 style={{ color: '#e2e8f0', marginBottom: 12, fontSize: 14 }}>Add New Webhook</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <input
                  type="text"
                  value={newWebhook.name}
                  onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                  placeholder="Webhook name"
                  style={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    padding: '8px 12px',
                    color: '#e2e8f0',
                    fontSize: 13,
                  }}
                />
                <input
                  type="text"
                  value={newWebhook.url}
                  onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                  placeholder="https://your-server.com/webhook"
                  style={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    padding: '8px 12px',
                    color: '#e2e8f0',
                    fontSize: 13,
                  }}
                />
              </div>
              
              <div style={{ marginBottom: 12 }}>
                <label style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6, display: 'block' }}>
                  Select Events
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {availableEvents.map(event => (
                    <button
                      key={event}
                      onClick={() => {
                        const events = newWebhook.events.includes(event)
                          ? newWebhook.events.filter(e => e !== event)
                          : [...newWebhook.events, event];
                        setNewWebhook({ ...newWebhook, events });
                      }}
                      style={{
                        background: newWebhook.events.includes(event) ? '#10b981' : '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: 4,
                        padding: '4px 8px',
                        color: newWebhook.events.includes(event) ? 'white' : '#94a3b8',
                        cursor: 'pointer',
                        fontSize: 11,
                      }}
                    >
                      {event}
                    </button>
                  ))}
                </div>
              </div>
              
              <button
                onClick={addWebhook}
                disabled={!newWebhook.name || !newWebhook.url || newWebhook.events.length === 0}
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  borderRadius: 6,
                  padding: '8px 16px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                + Add Webhook
              </button>
            </div>

            {webhooks.length > 0 && (
              <div>
                <h4 style={{ color: '#e2e8f0', marginBottom: 12, fontSize: 14 }}>
                  Configured Webhooks ({webhooks.length})
                </h4>
                {webhooks.map((webhook, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ 
                          width: 8, 
                          height: 8, 
                          borderRadius: '50%', 
                          background: webhook.enabled ? '#10b981' : '#64748b' 
                        }} />
                        <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{webhook.name}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => toggleWebhook(idx)}
                          style={{
                            background: 'transparent',
                            border: '1px solid #475569',
                            borderRadius: 4,
                            padding: '4px 8px',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            fontSize: 11,
                          }}
                        >
                          {webhook.enabled ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => removeWebhook(idx)}
                          style={{
                            background: 'transparent',
                            border: '1px solid #ef4444',
                            borderRadius: 4,
                            padding: '4px 8px',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: 11,
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>
                      <strong>URL:</strong> {webhook.url}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>
                      <strong>Secret:</strong> <code style={{ background: '#1e293b', padding: '2px 6px', borderRadius: 4 }}>{webhook.secret}</code>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {webhook.events.map(event => (
                        <span
                          key={event}
                          style={{
                            background: '#334155',
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontSize: 10,
                            color: '#a5b4fc',
                          }}
                        >
                          {event}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'graphql' && (
          <div>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
              Generate a GraphQL schema from your database tables with queries, mutations, and subscriptions.
            </p>
            
            <button
              onClick={generateGraphQLSchema}
              disabled={generatingGraphQL || !tables?.length}
              style={{
                background: generatingGraphQL ? '#475569' : 'linear-gradient(135deg, #e535ab, #c026d3)',
                border: 'none',
                borderRadius: 6,
                padding: '10px 20px',
                color: 'white',
                cursor: generatingGraphQL ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 16,
              }}
            >
              {generatingGraphQL ? '⏳ Generating...' : '◈ Generate GraphQL Schema'}
            </button>
            
            {!tables?.length && (
              <p style={{ color: '#f59e0b', fontSize: 12 }}>
                Generate code specifications first to create a GraphQL schema.
              </p>
            )}

            {graphqlSchema && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Generated Schema</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(graphqlSchema)}
                    style={{
                      background: 'transparent',
                      border: '1px solid #475569',
                      borderRadius: 4,
                      padding: '4px 12px',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      fontSize: 11,
                    }}
                  >
                    Copy
                  </button>
                </div>
                <pre style={{
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 6,
                  padding: 16,
                  color: '#e2e8f0',
                  fontSize: 11,
                  overflow: 'auto',
                  maxHeight: 400,
                }}>
                  {graphqlSchema}
                </pre>
              </div>
            )}
          </div>
        )}

        {activeTab === 'messagequeue' && (
          <div>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
              Generate message queue configuration and client code for asynchronous communication.
            </p>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8, display: 'block' }}>
                Select Provider
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { id: 'rabbitmq', name: 'RabbitMQ', icon: '🐰' },
                  { id: 'kafka', name: 'Apache Kafka', icon: '📊' },
                  { id: 'redis', name: 'Redis Pub/Sub', icon: '🔴' },
                  { id: 'sqs', name: 'AWS SQS', icon: '☁️' }
                ].map(provider => (
                  <button
                    key={provider.id}
                    onClick={() => setMqProvider(provider.id as any)}
                    style={{
                      padding: '8px 16px',
                      background: mqProvider === provider.id ? '#10b981' : '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: 6,
                      color: '#e2e8f0',
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    {provider.icon} {provider.name}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={generateMQConfig}
              disabled={generatingMQ}
              style={{
                background: generatingMQ ? '#475569' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                border: 'none',
                borderRadius: 6,
                padding: '10px 20px',
                color: 'white',
                cursor: generatingMQ ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 16,
              }}
            >
              {generatingMQ ? '⏳ Generating...' : '📨 Generate Configuration'}
            </button>

            {mqConfig && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
                    {mqProvider.charAt(0).toUpperCase() + mqProvider.slice(1)} Configuration
                  </span>
                  <button
                    onClick={() => navigator.clipboard.writeText(mqConfig)}
                    style={{
                      background: 'transparent',
                      border: '1px solid #475569',
                      borderRadius: 4,
                      padding: '4px 12px',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      fontSize: 11,
                    }}
                  >
                    Copy
                  </button>
                </div>
                <pre style={{
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 6,
                  padding: 16,
                  color: '#e2e8f0',
                  fontSize: 11,
                  overflow: 'auto',
                  maxHeight: 400,
                }}>
                  {mqConfig}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
