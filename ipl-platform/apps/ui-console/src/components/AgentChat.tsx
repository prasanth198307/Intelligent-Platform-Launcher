import { useState, useRef, useEffect } from 'react';
import './AgentChat.css';

interface ToolCall {
  name: string;
  status: 'running' | 'completed' | 'error';
  timestamp: number;
}

interface ConversationGroup {
  id: string;
  userMessage: string;
  assistantMessage: string;
  toolCalls: ToolCall[];
  startTime: number;
  endTime?: number;
  isExpanded: boolean;
}

interface AgentChatProps {
  projectId: string;
  onModuleBuilt?: (module: any) => void;
}

export function AgentChat({ projectId, onModuleBuilt }: AgentChatProps) {
  const [conversations, setConversations] = useState<ConversationGroup[]>([]);
  const [input, setInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>('');
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const [showBuildMenu, setShowBuildMenu] = useState(false);
  const [mode, setMode] = useState<'build' | 'plan'>('build');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [workStartTime, setWorkStartTime] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentConversationRef = useRef<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversations, currentStatus]);

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  };

  const toggleExpand = (id: string) => {
    setConversations(prev => prev.map(c => 
      c.id === id ? { ...c, isExpanded: !c.isExpanded } : c
    ));
  };

  const sendMessage = async () => {
    if (!input.trim() || isRunning) return;

    const userMessage = input.trim();
    const conversationId = `conv_${Date.now()}`;
    currentConversationRef.current = conversationId;
    
    const currentAttachments = attachments.map(f => ({ name: f.name, type: f.type }));
    setInput('');
    setAttachments([]);
    setIsRunning(true);
    setCurrentStatus('Starting...');
    setWorkStartTime(Date.now());

    const newConversation: ConversationGroup = {
      id: conversationId,
      userMessage,
      assistantMessage: '',
      toolCalls: [],
      startTime: Date.now(),
      isExpanded: true
    };

    setConversations(prev => [...prev, newConversation]);

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
              const event = JSON.parse(line.slice(6));
              handleEvent(event, conversationId);
            } catch (e) {
              console.error('Failed to parse event:', line);
            }
          }
        }
      }
    } catch (e: any) {
      console.error('Agent error:', e);
      setConversations(prev => prev.map(c => 
        c.id === conversationId 
          ? { ...c, assistantMessage: `Error: ${e?.message || 'Failed to communicate with agent'}`, endTime: Date.now() }
          : c
      ));
    } finally {
      setIsRunning(false);
      setCurrentStatus('');
      setWorkStartTime(null);
      currentConversationRef.current = null;
      
      setConversations(prev => prev.map(c => 
        c.id === conversationId 
          ? { ...c, endTime: Date.now() }
          : c
      ));
    }
  };

  const handleEvent = (event: any, conversationId: string) => {
    switch (event.type) {
      case 'thinking':
        setCurrentStatus(event.data.message || 'Thinking...');
        break;

      case 'tool_call':
        setCurrentStatus(`${event.data.tool}`);
        setConversations(prev => prev.map(c => 
          c.id === conversationId 
            ? { ...c, toolCalls: [...c.toolCalls, { name: event.data.tool, status: 'running', timestamp: Date.now() }] }
            : c
        ));
        break;

      case 'tool_result':
        setConversations(prev => prev.map(c => {
          if (c.id !== conversationId) return c;
          const updatedCalls = [...c.toolCalls];
          const lastCall = updatedCalls[updatedCalls.length - 1];
          if (lastCall) lastCall.status = 'completed';
          return { ...c, toolCalls: updatedCalls };
        }));
        break;

      case 'task_update':
        break;

      case 'message':
        setConversations(prev => prev.map(c => 
          c.id === conversationId 
            ? { ...c, assistantMessage: event.data.message }
            : c
        ));
        break;

      case 'complete':
        if (event.data.message) {
          setConversations(prev => prev.map(c => 
            c.id === conversationId 
              ? { ...c, assistantMessage: event.data.message }
              : c
          ));
        }
        if (event.data.modules && onModuleBuilt) {
          event.data.modules.forEach((mod: any) => {
            if (mod.status === 'completed') {
              onModuleBuilt(mod);
            }
          });
        }
        setCurrentStatus('');
        break;

      case 'error':
        setConversations(prev => prev.map(c => 
          c.id === conversationId 
            ? { ...c, assistantMessage: `Error: ${event.data.error}` }
            : c
        ));
        setCurrentStatus('');
        break;

      case 'done':
        setCurrentStatus('');
        break;
    }
  };

  return (
    <div className="agent-chat">
      <div className="agent-activity">
        {conversations.length === 0 && !isRunning && (
          <div className="agent-welcome">
            <h3>AI Development Agent</h3>
            <p>Tell me what to build. For example:</p>
            <ul>
              <li onClick={() => setInput('Build the user management module')}>"Build the user management module"</li>
              <li onClick={() => setInput('Create a REST API for products')}>"Create a REST API for products"</li>
              <li onClick={() => setInput('Add authentication with JWT')}>"Add authentication with JWT"</li>
            </ul>
          </div>
        )}
        
        {conversations.map((conv) => (
          <div key={conv.id} className="conversation-group">
            {/* User message */}
            <div className="user-message-row">
              <div className="user-bubble">{conv.userMessage}</div>
              <div className="user-avatar">Y</div>
            </div>

            {/* Collapsible work session */}
            {conv.toolCalls.length > 0 && (
              <div className="work-session">
                <div 
                  className="work-session-header"
                  onClick={() => toggleExpand(conv.id)}
                >
                  <span className="expand-icon">{conv.isExpanded ? '▼' : '▶'}</span>
                  <span className="work-session-summary">
                    {conv.toolCalls.length} action{conv.toolCalls.length > 1 ? 's' : ''}
                  </span>
                  {conv.endTime && (
                    <span className="work-duration">
                      Worked for {formatDuration(conv.endTime - conv.startTime)}
                    </span>
                  )}
                </div>
                
                {conv.isExpanded && (
                  <div className="work-session-details">
                    {conv.toolCalls.map((tool, i) => (
                      <div key={i} className="tool-call-row">
                        <span className="tool-status-icon">
                          {tool.status === 'completed' ? '✓' : '↻'}
                        </span>
                        <span className="tool-name">{tool.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Assistant response */}
            {conv.assistantMessage && (
              <div className="assistant-message">
                <div className="assistant-avatar">A</div>
                <div className="assistant-content">
                  {conv.assistantMessage}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Current working indicator */}
        {isRunning && (
          <div className="working-indicator">
            <div className="working-status">
              <span className="working-icon">◐</span>
              <span className="working-text">{currentStatus || 'Working...'}</span>
              <span className="working-dots">
                <span></span><span></span><span></span>
              </span>
            </div>
            {workStartTime && (
              <div className="working-timer">
                Working for {formatDuration(Date.now() - workStartTime)}
              </div>
            )}
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
            placeholder={isRunning ? 'Agent is working...' : 'Make, test, iterate...'}
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
