import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './AgentChat.css';

interface ToolCall {
  name: string;
  status: 'running' | 'completed' | 'error';
  timestamp: number;
  detail?: string;
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
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [mode, setMode] = useState<'build' | 'plan'>('build');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [workStartTime, setWorkStartTime] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentConversationRef = useRef<string | null>(null);
  const streamingBufferRef = useRef<string>('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversations, currentStatus]);

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  };

  const toggleExpand = (id: string) => {
    setConversations(prev => prev.map(c => 
      c.id === id ? { ...c, isExpanded: !c.isExpanded } : c
    ));
  };

  const getActivityDescription = (toolName: string, detail?: string): string => {
    const descriptions: Record<string, string> = {
      'write_file': `Edited file${detail ? `: ${detail}` : ''}`,
      'read_file': `Read file${detail ? `: ${detail}` : ''}`,
      'execute_sql': 'Executed SQL query',
      'create_directory': `Created directory${detail ? `: ${detail}` : ''}`,
      'delete_file': `Deleted file${detail ? `: ${detail}` : ''}`,
      'list_directory': 'Listed directory contents',
      'run_command': `Ran command${detail ? `: ${detail}` : ''}`,
      'install_package': `Installed package${detail ? `: ${detail}` : ''}`,
      'git_commit': 'Committed changes',
      'git_status': 'Checked git status',
      'test_api_endpoint': 'Tested API endpoint',
      'run_typescript_check': 'Ran TypeScript check',
      'get_lsp_diagnostics': 'Checked for errors',
      'restart_app': 'Restarted application',
      'take_screenshot': 'Captured screenshot',
      'web_search': `Searched web${detail ? `: ${detail}` : ''}`,
      'get_project_info': 'Retrieved project info',
      'list_database_tables': 'Listed database tables',
      'get_table_data': 'Retrieved table data',
      'check_file_syntax': 'Checked file syntax',
      'read_app_logs': 'Read application logs',
      'get_app_status': 'Checked app status',
      'glob_files': 'Searched for files',
      'grep_search': `Searched code${detail ? `: ${detail}` : ''}`,
      'batch_file_operations': 'Performed file operations',
      'github_push_file': 'Pushed to GitHub',
      'github_create_repo': 'Created GitHub repository',
      'computer_screenshot': 'Captured browser screenshot',
      'computer_click': 'Clicked element',
      'computer_type': 'Typed text',
      'analyze_screenshot': 'Analyzed screenshot',
    };
    
    const normalizedName = toolName.toLowerCase();
    for (const [key, desc] of Object.entries(descriptions)) {
      if (normalizedName.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedName)) {
        return desc;
      }
    }
    
    return toolName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const sendMessage = async () => {
    if (!input.trim() || isRunning) return;

    const userMessage = input.trim();
    const conversationId = `conv_${Date.now()}`;
    currentConversationRef.current = conversationId;
    streamingBufferRef.current = '';
    
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
        // Handle streaming thinking text - show it as the response
        if (event.data.streaming && event.data.partial) {
          streamingBufferRef.current = event.data.partial;
          setConversations(prev => prev.map(c => 
            c.id === conversationId 
              ? { ...c, assistantMessage: streamingBufferRef.current }
              : c
          ));
        }
        break;

      case 'tool_call':
        setCurrentStatus(`${event.data.tool}`);
        setConversations(prev => prev.map(c => 
          c.id === conversationId 
            ? { ...c, toolCalls: [...c.toolCalls, { name: event.data.tool, status: 'running', timestamp: Date.now(), detail: event.data.detail || event.data.args?.file_path || event.data.args?.path }] }
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
      case 'text_delta':
      case 'content_block_delta':
        if (event.data.message || event.data.delta || event.data.text) {
          const newText = event.data.message || event.data.delta || event.data.text;
          streamingBufferRef.current += newText;
          setConversations(prev => prev.map(c => 
            c.id === conversationId 
              ? { ...c, assistantMessage: streamingBufferRef.current }
              : c
          ));
        }
        break;

      case 'complete':
        if (event.data.message) {
          streamingBufferRef.current = event.data.message;
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
    <div className="replit-chat">
      <div className="chat-messages">
        {conversations.length === 0 && !isRunning && (
          <div className="chat-empty">
            <div className="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <h2>What would you like to build?</h2>
            <div className="quick-prompts">
              <button onClick={() => setInput('Build the user management module')}>
                Build the user management module
              </button>
              <button onClick={() => setInput('Create a REST API for products')}>
                Create a REST API for products
              </button>
              <button onClick={() => setInput('Add authentication with JWT')}>
                Add authentication with JWT
              </button>
            </div>
          </div>
        )}
        
        {conversations.map((conv) => (
          <div key={conv.id} className="chat-turn">
            <div className="user-turn">
              <div className="user-message">{conv.userMessage}</div>
            </div>

            {conv.toolCalls.length > 0 && (
              <div className="agent-session">
                <div 
                  className="session-header"
                  onClick={() => toggleExpand(conv.id)}
                >
                  <div className="session-left">
                    <svg className="checkpoint-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="session-title">
                      {conv.endTime 
                        ? `Worked for ${formatDuration(conv.endTime - conv.startTime)}`
                        : 'Working...'
                      }
                    </span>
                  </div>
                  <svg 
                    className={`expand-chevron ${conv.isExpanded ? 'expanded' : ''}`} 
                    width="16" 
                    height="16" 
                    viewBox="0 0 16 16" 
                    fill="none"
                  >
                    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                
                {conv.isExpanded && (
                  <div className="session-activity">
                    {conv.toolCalls.map((tool, i) => (
                      <div key={i} className="activity-item">
                        <span className={`activity-status ${tool.status}`}>
                          {tool.status === 'completed' ? (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2.5 6l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          ) : (
                            <span className="activity-spinner"></span>
                          )}
                        </span>
                        <span className="activity-name">{getActivityDescription(tool.name, tool.detail)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {conv.assistantMessage && (
              <div className="agent-response">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {conv.assistantMessage}
                </ReactMarkdown>
              </div>
            )}
          </div>
        ))}

        {isRunning && (
          <div className="agent-working">
            <div className="working-content">
              <span className="working-spinner"></span>
              <span className="working-label">{currentStatus || 'Working...'}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <div className="input-row">
          <div className="mode-selector">
            <button 
              className={`mode-btn ${mode}`}
              onClick={() => setShowModeMenu(!showModeMenu)}
            >
              {mode === 'build' ? 'Build' : 'Plan'}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {showModeMenu && (
              <div className="mode-menu">
                <button 
                  className={mode === 'build' ? 'active' : ''}
                  onClick={() => { setMode('build'); setShowModeMenu(false); }}
                >
                  <strong>Build</strong>
                  <span>Agent builds and executes code</span>
                </button>
                <button 
                  className={mode === 'plan' ? 'active' : ''}
                  onClick={() => { setMode('plan'); setShowModeMenu(false); }}
                >
                  <strong>Plan</strong>
                  <span>Agent creates a plan without executing</span>
                </button>
              </div>
            )}
          </div>

          <button 
            className="attach-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Attach files"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
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

          <div className="input-wrapper">
            {attachments.length > 0 && (
              <div className="attachments">
                {attachments.map((file, i) => (
                  <span key={i} className="attachment">
                    {file.name}
                    <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}>×</button>
                  </span>
                ))}
              </div>
            )}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={isRunning ? 'Agent is working...' : 'Ask Agent...'}
              disabled={isRunning}
              rows={1}
            />
          </div>

          <button
            className="send-btn"
            onClick={sendMessage}
            disabled={isRunning || !input.trim()}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 15V3M4 8l5-5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
