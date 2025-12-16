import { useState, useRef, useEffect } from 'react';
import './AgentChat.css';

interface AgentTask {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: string;
}

interface AgentEvent {
  type: 'thinking' | 'tool_call' | 'tool_result' | 'task_update' | 'message' | 'review' | 'complete' | 'error' | 'done';
  data: any;
  timestamp: number;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

interface AgentChatProps {
  projectId: string;
  onModuleBuilt?: (module: any) => void;
}

export function AgentChat({ projectId, onModuleBuilt }: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [input, setInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [currentThinking, setCurrentThinking] = useState<string | null>(null);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventsEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, events]);

  const sendMessage = async () => {
    if (!input.trim() || isRunning) return;

    const userMessage = input.trim();
    setInput('');
    setIsRunning(true);
    setEvents([]);
    setCurrentThinking(null);

    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: Date.now()
    }]);

    try {
      const response = await fetch(`/api/projects/${projectId}/agent-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, sessionId })
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event: AgentEvent = JSON.parse(line.slice(6));
              handleEvent(event);
            } catch (e) {
              console.error('Failed to parse event:', line);
            }
          }
        }
      }
    } catch (e: any) {
      console.error('Agent error:', e);
      setMessages(prev => [...prev, {
        role: 'system',
        content: `Error: ${e?.message || 'Failed to communicate with agent'}`,
        timestamp: Date.now()
      }]);
    } finally {
      setIsRunning(false);
      setCurrentThinking(null);
    }
  };

  const handleEvent = (event: AgentEvent) => {
    setEvents(prev => [...prev, event]);

    switch (event.type) {
      case 'thinking':
        setCurrentThinking(event.data.message);
        break;

      case 'tool_call':
        setCurrentThinking(`Calling ${event.data.tool}...`);
        break;

      case 'tool_result':
        break;

      case 'task_update':
        if (event.data.action === 'added') {
          setTasks(prev => [...prev, event.data.task]);
        } else if (event.data.action === 'updated') {
          setTasks(prev => prev.map(t => 
            t.id === event.data.task.id ? event.data.task : t
          ));
        }
        break;

      case 'message':
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: event.data.message,
          timestamp: Date.now()
        }]);
        break;

      case 'review':
        setCurrentThinking('Reviewing work...');
        break;

      case 'complete':
        if (event.data.message && !messages.find(m => m.content === event.data.message)) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: event.data.message,
            timestamp: Date.now()
          }]);
        }
        // Check if modules were built and notify parent
        if (event.data.modules && onModuleBuilt) {
          event.data.modules.forEach((mod: any) => {
            if (mod.status === 'completed') {
              onModuleBuilt(mod);
            }
          });
        }
        setCurrentThinking(null);
        break;

      case 'error':
        setMessages(prev => [...prev, {
          role: 'system',
          content: `Error: ${event.data.error}`,
          timestamp: Date.now()
        }]);
        setCurrentThinking(null);
        break;

      case 'done':
        setCurrentThinking(null);
        break;
    }
  };

  const getTaskIcon = (status: AgentTask['status']) => {
    switch (status) {
      case 'pending': return '○';
      case 'in_progress': return '◐';
      case 'completed': return '●';
      case 'failed': return '✕';
    }
  };

  const getEventIcon = (type: AgentEvent['type']) => {
    switch (type) {
      case 'thinking': return '🤔';
      case 'tool_call': return '🔧';
      case 'tool_result': return '📋';
      case 'task_update': return '📝';
      case 'message': return '💬';
      case 'review': return '🔍';
      case 'complete': return '✅';
      case 'error': return '❌';
      default: return '•';
    }
  };

  return (
    <div className="agent-chat">
      <div className="agent-chat-main">
        <div className="agent-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`agent-message agent-message-${msg.role}`}>
              <div className="agent-message-role">
                {msg.role === 'user' ? 'You' : msg.role === 'assistant' ? 'Agent' : 'System'}
              </div>
              <div className="agent-message-content">{msg.content}</div>
            </div>
          ))}
          {currentThinking && (
            <div className="agent-message agent-message-thinking">
              <div className="agent-thinking-indicator">
                <span className="thinking-dot"></span>
                <span className="thinking-dot"></span>
                <span className="thinking-dot"></span>
              </div>
              <span>{currentThinking}</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="agent-input-container">
          <input
            type="text"
            className="agent-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={isRunning ? 'Agent is working...' : 'Ask the agent to build something...'}
            disabled={isRunning}
          />
          <button
            className="agent-send-btn"
            onClick={sendMessage}
            disabled={isRunning || !input.trim()}
          >
            {isRunning ? 'Working...' : 'Send'}
          </button>
        </div>
      </div>

      <div className="agent-sidebar">
        {tasks.length > 0 && (
          <div className="agent-tasks">
            <h4>Tasks</h4>
            {tasks.map(task => (
              <div key={task.id} className={`agent-task agent-task-${task.status}`}>
                <span className="agent-task-icon">{getTaskIcon(task.status)}</span>
                <span className="agent-task-content">{task.content}</span>
              </div>
            ))}
          </div>
        )}

        <div className="agent-events">
          <h4>Activity</h4>
          <div className="agent-events-list">
            {events.slice(-20).map((event, i) => (
              <div key={i} className={`agent-event agent-event-${event.type}`}>
                <span className="agent-event-icon">{getEventIcon(event.type)}</span>
                <span className="agent-event-content">
                  {event.type === 'tool_call' && `${event.data.tool}`}
                  {event.type === 'tool_result' && `${event.data.tool}: ${event.data.result?.success ? 'success' : 'failed'}`}
                  {event.type === 'thinking' && event.data.message}
                  {event.type === 'task_update' && `${event.data.action}: ${event.data.task?.content?.substring(0, 30)}...`}
                  {event.type === 'review' && 'Reviewing changes...'}
                  {event.type === 'complete' && 'Completed'}
                  {event.type === 'error' && event.data.error}
                </span>
              </div>
            ))}
            <div ref={eventsEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
