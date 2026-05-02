/**
 * ChatWidget.v2.jsx — Self-hosted version
 *
 * Updated chat widget that works with the self-hosted API server.
 * New features:
 * - Retrieval transparency panel (shows sources and similarity scores)
 * - Semantic cache hit indicator
 * - "Powered by Raspberry Pi" badge
 * - Graceful degradation when server is offline
 * - Adaptive starter questions
 *
 * Usage:
 *   import ChatWidget from './chatbot/src/ChatWidget.v2';
 *   <ChatWidget apiUrl="https://api.carlton.dev" />
 */

import { useState, useRef, useEffect, useCallback } from 'react';

// ─── Config ──────────────────────────────────────────────

const STARTER_POOLS = [
  // Morning pool
  [
    "What are you working on right now?",
    "Tell me about your tech stack",
    "What kind of roles interest you?",
    "How did you build this chatbot?",
  ],
  // Afternoon/evening pool
  [
    "What's your background?",
    "Tell me about the FAST project",
    "What makes you different as a technologist?",
    "What was it like working at Apple?",
  ],
];

function getStarterQuestions() {
  const hour = new Date().getHours();
  const pool = hour < 14 ? STARTER_POOLS[0] : STARTER_POOLS[1];
  // Shuffle
  return pool.sort(() => Math.random() - 0.5);
}

const MAX_MESSAGE_LENGTH = 500;

// ─── Styles ──────────────────────────────────────────────

const styles = {
  toggleButton: {
    position: 'fixed', bottom: '24px', right: '24px',
    width: '56px', height: '56px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    zIndex: 9999,
  },
  panel: {
    position: 'fixed', bottom: '96px', right: '24px',
    width: '400px', maxWidth: 'calc(100vw - 48px)',
    height: '560px', maxHeight: 'calc(100vh - 120px)',
    borderRadius: '16px', background: '#0a0a0f',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    boxShadow: '0 8px 40px rgba(0, 0, 0, 0.5)',
    zIndex: 9998,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    padding: '14px 20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    display: 'flex', alignItems: 'center', gap: '12px',
  },
  headerDot: {
    width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
  },
  headerTitle: {
    color: '#fff', fontSize: '14px', fontWeight: 600, margin: 0,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.4)', fontSize: '11px', margin: 0,
  },
  messages: {
    flex: 1, overflowY: 'auto', padding: '16px 20px',
    display: 'flex', flexDirection: 'column', gap: '12px',
  },
  userMessage: {
    alignSelf: 'flex-end', background: '#6366f1', color: '#fff',
    padding: '10px 14px', borderRadius: '14px 14px 4px 14px',
    maxWidth: '85%', fontSize: '14px', lineHeight: 1.5, wordBreak: 'break-word',
  },
  botMessage: {
    alignSelf: 'flex-start', background: 'rgba(255, 255, 255, 0.06)',
    color: 'rgba(255, 255, 255, 0.9)',
    padding: '10px 14px', borderRadius: '14px 14px 14px 4px',
    maxWidth: '85%', fontSize: '14px', lineHeight: 1.5, wordBreak: 'break-word',
  },
  sourcesToggle: {
    background: 'none', border: 'none',
    color: 'rgba(255, 255, 255, 0.35)', fontSize: '11px',
    cursor: 'pointer', padding: '4px 0', marginTop: '6px',
    textAlign: 'left',
  },
  sourcesList: {
    margin: '6px 0 0', padding: '8px 10px',
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '8px', fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.4)', lineHeight: 1.6,
  },
  sourceItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '2px 0',
  },
  cacheBadge: {
    display: 'inline-block', fontSize: '10px',
    color: '#22c55e', marginTop: '4px',
    opacity: 0.7,
  },
  starterContainer: {
    display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px 0',
  },
  starterButton: {
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px', padding: '10px 14px',
    color: 'rgba(255, 255, 255, 0.7)', fontSize: '13px',
    cursor: 'pointer', textAlign: 'left',
    transition: 'background 0.15s, border-color 0.15s',
  },
  inputArea: {
    padding: '12px 16px',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
    display: 'flex', gap: '8px', alignItems: 'flex-end',
  },
  input: {
    flex: 1, background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px', padding: '10px 14px',
    color: '#fff', fontSize: '14px', outline: 'none',
    resize: 'none', fontFamily: 'inherit', lineHeight: 1.5, maxHeight: '100px',
  },
  sendButton: {
    background: '#6366f1', border: 'none', borderRadius: '10px',
    padding: '10px 14px', color: '#fff', cursor: 'pointer',
    fontSize: '14px', fontWeight: 600, flexShrink: 0,
    transition: 'opacity 0.15s',
  },
  footer: {
    padding: '6px 20px 10px',
    borderTop: '1px solid rgba(255, 255, 255, 0.03)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    gap: '4px',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.2)', fontSize: '10px', margin: 0,
  },
  welcome: {
    color: 'rgba(255, 255, 255, 0.5)', fontSize: '13px',
    textAlign: 'center', padding: '8px 0 4px', lineHeight: 1.5,
  },
  statusIndicator: {
    display: 'flex', alignItems: 'center', gap: '4px',
    fontSize: '11px', color: 'rgba(255,255,255,0.3)',
    padding: '4px 0',
  },
};

// ─── SSE Parser ──────────────────────────────────────────

async function* parseSSE(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        yield JSON.parse(line.slice(6));
      } catch { /* skip */ }
    }
  }
}

// ─── Component ───────────────────────────────────────────

export default function ChatWidget({ apiUrl }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [serverOnline, setServerOnline] = useState(null); // null = checking
  const [starters] = useState(getStarterQuestions);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Check server health on mount
  useEffect(() => {
    fetch(`${apiUrl}/api/health`)
      .then((r) => r.ok ? setServerOnline(true) : setServerOnline(false))
      .catch(() => setServerOnline(false));
  }, [apiUrl]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || isStreaming) return;

    const userMessage = { role: 'user', content: text.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsStreaming(true);

    const botIdx = updatedMessages.length;
    setMessages(prev => [...prev, { role: 'assistant', content: '', sources: [], cached: false }]);

    try {
      const response = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      // Check if it's a JSON response (cached) or SSE stream
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        // Cached response (non-streaming)
        const data = await response.json();
        setMessages(prev => {
          const updated = [...prev];
          updated[botIdx] = {
            role: 'assistant',
            content: data.response,
            sources: data.sources || [],
            cached: true,
          };
          return updated;
        });
      } else {
        // Streaming SSE response
        let fullContent = '';
        let sources = [];

        for await (const event of parseSSE(response)) {
          if (event.type === 'sources') {
            sources = event.sources || [];
            setMessages(prev => {
              const updated = [...prev];
              updated[botIdx] = { ...updated[botIdx], sources };
              return updated;
            });
          } else if (event.type === 'text') {
            fullContent += event.content;
            setMessages(prev => {
              const updated = [...prev];
              updated[botIdx] = { ...updated[botIdx], content: fullContent };
              return updated;
            });
          } else if (event.type === 'error') {
            fullContent = event.message || 'Something went wrong.';
            setMessages(prev => {
              const updated = [...prev];
              updated[botIdx] = { ...updated[botIdx], content: fullContent };
              return updated;
            });
          }
        }

        if (!fullContent.trim()) {
          setMessages(prev => {
            const updated = [...prev];
            updated[botIdx] = {
              ...updated[botIdx],
              content: "I'm having trouble right now. Reach Carlton at carlton@carlton.dev.",
            };
            return updated;
          });
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => {
        const updated = [...prev];
        updated[botIdx] = {
          role: 'assistant',
          content: "I'm offline right now — the Raspberry Pi might be taking a nap. Reach Carlton directly at carlton@carlton.dev.",
          sources: [],
          cached: false,
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [messages, isStreaming, apiUrl]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{ ...styles.toggleButton, transform: isOpen ? 'rotate(45deg)' : 'none' }}
        aria-label={isOpen ? 'Close chat' : 'Chat with Carlton'}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {isOpen ? (
            <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
          ) : (
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          )}
        </svg>
      </button>

      {isOpen && (
        <div style={styles.panel}>
          {/* Header */}
          <div style={styles.header}>
            <div style={{
              ...styles.headerDot,
              background: serverOnline === true ? '#22c55e' : serverOnline === false ? '#ef4444' : '#eab308',
            }} />
            <div>
              <p style={styles.headerTitle}>Carlton Lindsay</p>
              <p style={styles.headerSubtitle}>
                {serverOnline === true ? 'Digital Twin — Ask me anything'
                  : serverOnline === false ? 'Offline — leave a message at carlton@carlton.dev'
                  : 'Connecting...'}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div style={styles.messages}>
            {messages.length === 0 && (
              <>
                <p style={styles.welcome}>
                  Hey! I'm Carlton's digital twin. Ask me about my work, skills, or projects.
                </p>
                <div style={styles.starterContainer}>
                  {starters.map((q) => (
                    <button
                      key={q}
                      style={styles.starterButton}
                      onClick={() => sendMessage(q)}
                      disabled={serverOnline === false}
                      onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,0.08)'; }}
                      onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,0.04)'; }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </>
            )}

            {messages.map((msg, i) => (
              <div key={i}>
                <div style={msg.role === 'user' ? styles.userMessage : styles.botMessage}>
                  {msg.content || (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', animation: 'pulse 1s infinite' }} />
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', animation: 'pulse 1s infinite 0.2s' }} />
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', animation: 'pulse 1s infinite 0.4s' }} />
                    </div>
                  )}

                  {/* Cache hit indicator */}
                  {msg.cached && msg.content && (
                    <div style={styles.cacheBadge}>Instant — similar question answered before</div>
                  )}
                </div>

                {/* Sources panel (bot messages only) */}
                {msg.role === 'assistant' && msg.sources?.length > 0 && msg.content && (
                  <SourcesPanel sources={msg.sources} />
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={styles.inputArea}>
            <textarea
              ref={inputRef}
              style={styles.input}
              value={input}
              onChange={e => setInput(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
              onKeyDown={handleKeyDown}
              placeholder={serverOnline === false ? 'Server offline...' : 'Ask me something...'}
              rows={1}
              disabled={isStreaming || serverOnline === false}
            />
            <button
              style={{ ...styles.sendButton, opacity: !input.trim() || isStreaming ? 0.5 : 1 }}
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isStreaming}
            >
              Send
            </button>
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            <p style={styles.footerText}>
              Self-hosted on Raspberry Pi 5 · Phi-3 3.8B · 100% local inference
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </>
  );
}

// ─── Sources Panel Sub-component ─────────────────────────

function SourcesPanel({ sources }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        style={styles.sourcesToggle}
        onClick={() => setOpen(!open)}
      >
        {open ? '▾' : '▸'} How I answered this ({sources.length} source{sources.length !== 1 ? 's' : ''})
      </button>

      {open && (
        <div style={styles.sourcesList}>
          {sources.map((s, i) => (
            <div key={i} style={styles.sourceItem}>
              <span>{s.fileTitle || s.source} — {s.heading}</span>
              <span style={{ color: s.similarity > 0.85 ? '#22c55e' : s.similarity > 0.75 ? '#eab308' : '#ef4444', fontWeight: 600 }}>
                {(s.similarity * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
