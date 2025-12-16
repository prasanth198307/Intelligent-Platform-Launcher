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
  attachments?: Array<{ name: string; type: string }>;
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
  const [showBuildMenu, setShowBuildMenu] = useState(false);
  const [mode, setMode] = useState<'build' | 'plan'>('build');
  const [attachments, setAttachments] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const currentAttachments = attachments.map(f => ({ name: f.name, type: f.type }));
    setInput('');
    setAttachments([]);
    setIsRunning(true);
    setEvents([]);
    setCurrentThinking(null);

    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined
    }]);

    try {
      const response = await fetch(`/api/projects/${projectId}/agent-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage, 
          sessionId,
          mode,
          attachments: currentAttachments
        })
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
      {tasks.length > 0 && (
        <div className="agent-tasks-bar">
          {tasks.map(task => (
            <div key={task.id} className={`agent-task-chip agent-task-${task.status}`}>
              <span className="task-icon">{getTaskIcon(task.status)}</span>
              <span className="task-text">{task.content}</span>
            </div>
          ))}
        </div>
      )}

      <div className="agent-activity">
        {messages.length === 0 && events.length === 0 && (
          <div className="agent-welcome">
            <h3>AI Development Agent</h3>
            <p>Tell me what to build. For example:</p>
            <ul>
              <li>"Build the user management module"</li>
              <li>"Create a REST API for products"</li>
              <li>"Add authentication with JWT"</li>
            </ul>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={`msg-${i}`} className={`activity-item activity-${msg.role}`}>
            <div className="activity-icon">
              {msg.role === 'user' ? 'Y' : msg.role === 'assistant' ? 'A' : '!'}
            </div>
            <div className="activity-content">
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="message-attachments">
                  {msg.attachments.map((att, idx) => (
                    <span key={idx} className="attachment-chip-inline">{att.name}</span>
                  ))}
                </div>
              )}
              <div className="activity-text">{msg.content}</div>
            </div>
          </div>
        ))}

        {/* Simple thinking indicator like Replit */}
        {currentThinking && (
          <div className="agent-thinking-simple">
            <span className="thinking-text">{currentThinking}</span>
            <span className="thinking-dots-inline">
              <span></span><span></span><span></span>
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="agent-input-container">
        <div className="input-left-controls">
          <div className="build-menu-wrapper">
            <button 
              className={`build-mode-btn ${mode}`}
              onClick={() => setShowBuildMenu(!showBuildMenu)}
            >
              <span>{mode === 'build' ? 'Build' : 'Plan'}</span>
              <span className="dropdown-arrow">▾</span>
            </button>
            {showBuildMenu && (
              <div className="build-menu">
                <button 
                  className={`build-option ${mode === 'build' ? 'active' : ''}`}
                  onClick={() => { setMode('build'); setShowBuildMenu(false); }}
                >
                  <div className="option-info">
                    <strong>Build</strong>
                    <span>Agent builds and executes code</span>
                  </div>
                </button>
                <button 
                  className={`build-option ${mode === 'plan' ? 'active' : ''}`}
                  onClick={() => { setMode('plan'); setShowBuildMenu(false); }}
                >
                  <div className="option-info">
                    <strong>Plan</strong>
                    <span>Agent creates a plan without executing</span>
                  </div>
                </button>
              </div>
            )}
          </div>
          <button 
            className="attach-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Attach files"
          >
            +
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files) {
                setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
              }
            }}
          />
        </div>
        
        <div className="input-main">
          {attachments.length > 0 && (
            <div className="attachments-preview">
              {attachments.map((file, i) => (
                <div key={i} className="attachment-chip">
                  <span>{file.name}</span>
                  <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}>×</button>
                </div>
              ))}
            </div>
          )}
          <textarea
            className="agent-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={isRunning ? 'Agent is working...' : 'Ask the agent to build something...'}
            disabled={isRunning}
            rows={1}
          />
        </div>
        
        <div className="input-right-controls">
          <button
            className="agent-send-btn"
            onClick={sendMessage}
            disabled={isRunning || !input.trim()}
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
