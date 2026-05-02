/**
 * ChatWidget.jsx
 *
 * A self-contained React chat widget for Carlton's digital twin chatbot.
 * Designed to be embedded on carlton.dev as a floating widget.
 *
 * Features:
 * - Streaming responses from the Supabase Edge Function
 * - Conversation history (in-memory, resets on page reload)
 * - "I don't know" handling when the bot isn't confident
 * - Suggested starter questions
 * - Responsive design with dark theme
 *
 * Usage:
 *   import ChatWidget from './chatbot/src/ChatWidget';
 *   // In your App.jsx:
 *   <ChatWidget supabaseUrl="https://your-project.supabase.co" />
 */

import { useState, useRef, useEffect, useCallback } from 'react';

// ─── Config ──────────────────────────────────────────────

const STARTER_QUESTIONS = [
  "What's your background?",
  "Tell me about the FAST project",
  "What tech stack do you use?",
  "What kind of roles interest you?",
];

const MAX_MESSAGE_LENGTH = 500;

// ─── Styles ──────────────────────────────────────────────
// Inline styles to keep the widget self-contained.
// Replace with CSS modules or styled-components in production.

const styles = {
  // Floating toggle button
  toggleButton: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    zIndex: 9999,
  },

  // Chat panel
  panel: {
    position: 'fixed',
    bottom: '96px',
    right: '24px',
    width: '380px',
    maxWidth: 'calc(100vw - 48px)',
    height: '520px',
    maxHeight: 'calc(100vh - 120px)',
    borderRadius: '16px',
    background: '#0a0a0f',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 8px 40px rgba(0, 0, 0, 0.5)',
    zIndex: 9998,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },

  // Header
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#22c55e',
    flexShrink: 0,
  },
  headerTitle: {
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    margin: 0,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: '12px',
    margin: 0,
  },

  // Messages area
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },

  // Message bubbles
  userMessage: {
    alignSelf: 'flex-end',
    background: '#6366f1',
    color: '#fff',
    padding: '10px 14px',
    borderRadius: '14px 14px 4px 14px',
    maxWidth: '85%',
    fontSize: '14px',
    lineHeight: 1.5,
    wordBreak: 'break-word',
  },
  botMessage: {
    alignSelf: 'flex-start',
    background: 'rgba(255, 255, 255, 0.06)',
    color: 'rgba(255, 255, 255, 0.9)',
    padding: '10px 14px',
    borderRadius: '14px 14px 14px 4px',
    maxWidth: '85%',
    fontSize: '14px',
    lineHeight: 1.5,
    wordBreak: 'break-word',
  },

  // Typing indicator
  typing: {
    display: 'flex',
    gap: '4px',
    padding: '10px 14px',
    alignSelf: 'flex-start',
  },
  typingDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.3)',
  },

  // Starter questions
  starterContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '8px 0',
  },
  starterButton: {
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    padding: '10px 14px',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '13px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.15s, border-color 0.15s',
  },

  // Input area
  inputArea: {
    padding: '12px 16px',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    padding: '10px 14px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    resize: 'none',
    fontFamily: 'inherit',
    lineHeight: 1.5,
    maxHeight: '100px',
  },
  sendButton: {
    background: '#6366f1',
    border: 'none',
    borderRadius: '10px',
    padding: '10px 14px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    flexShrink: 0,
    opacity: 1,
    transition: 'opacity 0.15s',
  },

  // Welcome message
  welcome: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '13px',
    textAlign: 'center',
    padding: '8px 0 4px',
    lineHeight: 1.5,
  },
};

// ─── Stream Parser ───────────────────────────────────────

/**
 * Parse an Anthropic SSE stream and yield text deltas.
 * Also handles OpenAI SSE format as a fallback.
 */
async function* parseSSEStream(response) {
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
      const data = line.slice(6).trim();
      if (data === '[DONE]') return;

      try {
        const parsed = JSON.parse(data);

        // Anthropic format
        if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
          yield parsed.delta.text;
        }
        // OpenAI format
        else if (parsed.choices?.[0]?.delta?.content) {
          yield parsed.choices[0].delta.content;
        }
      } catch {
        // Skip unparseable lines
      }
    }
  }
}

// ─── Component ───────────────────────────────────────────

export default function ChatWidget({ supabaseUrl }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = useCallback(
    async (text) => {
      if (!text.trim() || isStreaming) return;

      const userMessage = { role: 'user', content: text.trim() };
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setInput('');
      setIsStreaming(true);

      // Add a placeholder for the bot response
      const botMessageIndex = updatedMessages.length;
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      try {
        const response = await fetch(
          `${supabaseUrl}/functions/v1/chat`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: updatedMessages }),
          }
        );

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        // Stream the response
        let fullContent = '';
        for await (const chunk of parseSSEStream(response)) {
          fullContent += chunk;
          setMessages((prev) => {
            const updated = [...prev];
            updated[botMessageIndex] = {
              role: 'assistant',
              content: fullContent,
            };
            return updated;
          });
        }

        // If we got no content, show a fallback
        if (!fullContent.trim()) {
          setMessages((prev) => {
            const updated = [...prev];
            updated[botMessageIndex] = {
              role: 'assistant',
              content:
                "I'm having trouble connecting right now. You can reach Carlton directly at carlton@carlton.dev.",
            };
            return updated;
          });
        }
      } catch (error) {
        console.error('Chat error:', error);
        setMessages((prev) => {
          const updated = [...prev];
          updated[botMessageIndex] = {
            role: 'assistant',
            content:
              "Sorry, I'm having trouble connecting right now. You can reach Carlton directly at carlton@carlton.dev.",
          };
          return updated;
        });
      } finally {
        setIsStreaming(false);
      }
    },
    [messages, isStreaming, supabaseUrl]
  );

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          ...styles.toggleButton,
          transform: isOpen ? 'rotate(45deg)' : 'none',
        }}
        aria-label={isOpen ? 'Close chat' : 'Chat with Carlton'}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {isOpen ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </>
          )}
        </svg>
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div style={styles.panel}>
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.headerDot} />
            <div>
              <p style={styles.headerTitle}>Carlton Lindsay</p>
              <p style={styles.headerSubtitle}>Digital Twin — Ask me anything</p>
            </div>
          </div>

          {/* Messages */}
          <div style={styles.messages}>
            {messages.length === 0 && (
              <>
                <p style={styles.welcome}>
                  Hey! I'm Carlton's digital twin. Ask me about my work, skills,
                  or projects.
                </p>
                <div style={styles.starterContainer}>
                  {STARTER_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      style={styles.starterButton}
                      onClick={() => sendMessage(q)}
                      onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(255,255,255,0.08)';
                        e.target.style.borderColor = 'rgba(255,255,255,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(255,255,255,0.04)';
                        e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                style={
                  msg.role === 'user' ? styles.userMessage : styles.botMessage
                }
              >
                {msg.content || (
                  <div style={styles.typing}>
                    <div
                      style={{
                        ...styles.typingDot,
                        animation: 'pulse 1s infinite',
                      }}
                    />
                    <div
                      style={{
                        ...styles.typingDot,
                        animation: 'pulse 1s infinite 0.2s',
                      }}
                    />
                    <div
                      style={{
                        ...styles.typingDot,
                        animation: 'pulse 1s infinite 0.4s',
                      }}
                    />
                  </div>
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
              onChange={(e) =>
                setInput(e.target.value.slice(0, MAX_MESSAGE_LENGTH))
              }
              onKeyDown={handleKeyDown}
              placeholder="Ask me something..."
              rows={1}
              disabled={isStreaming}
            />
            <button
              style={{
                ...styles.sendButton,
                opacity: !input.trim() || isStreaming ? 0.5 : 1,
                cursor:
                  !input.trim() || isStreaming ? 'not-allowed' : 'pointer',
              }}
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isStreaming}
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Keyframe animation for typing indicator */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </>
  );
}
