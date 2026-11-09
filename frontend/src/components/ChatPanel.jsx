import { useState, useEffect, useRef } from 'react';
import { Send, User, Bot, AlertTriangle } from 'lucide-react';

const SUGGESTED_EN = [
  "What documents do I need for my permit?",
  "How long does BPLO processing take in Roxas?",
  "Where do I get my ESO Certificate?",
  "How much is my estimated permit fee?",
  "When should I renew my permit?",
  "What are the requirements for Sanitary Permit in Roxas?"
];

const SUGGESTED_TL = [
  "Ano ang mga dokumentong kailangan para sa permit?",
  "Gaano katagal ang proseso sa BPLO sa Roxas?",
  "Saan kinukuha ang ESO Certificate?",
  "Magkano ang tinatayang bayarin sa permit?",
  "Kailan dapat mag-renew ng permit?",
  "Ano ang mga requirements para sa Sanitary Permit sa Roxas?"
];

// Clean formatter to render clean text without raw asterisks or clutter
const renderMessageContent = (rawText = '') => {
  if (!rawText) return null;

  const lines = rawText.split('\n');
  return lines.map((line, idx) => {
    const trimmed = line.trim();

    // Skip visual markdown divider lines like '---' or '***'
    if (/^[-*_]{3,}$/.test(trimmed)) {
      return <div key={idx} style={{ height: '8px', borderBottom: '1px solid #cbd5e1', margin: '8px 0' }} />;
    }

    // Headers (e.g. ### 1. Header or ## Header)
    if (/^#{1,4}\s+/.test(trimmed)) {
      const headerText = trimmed.replace(/^#{1,4}\s+/, '').replace(/\*\*/g, '');
      return (
        <div key={idx} style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a', marginTop: '10px', marginBottom: '4px' }}>
          {headerText}
        </div>
      );
    }

    // Parse inline **bold** or *bold*
    const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    const parsedLine = parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={pIdx} style={{ color: '#0f172a', fontWeight: '600' }}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return <strong key={pIdx} style={{ color: '#0f172a', fontWeight: '600' }}>{part.slice(1, -1)}</strong>;
      }
      return part;
    });

    // Standard list items (bullets or numbers)
    const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ');
    if (isBullet) {
      return (
        <div key={idx} style={{ display: 'flex', gap: '8px', marginLeft: '6px', marginBottom: '4px' }}>
          <span style={{ color: 'var(--primary-green)', fontWeight: 'bold' }}>•</span>
          <div style={{ flex: 1 }}>{parsedLine.slice(1)}</div>
        </div>
      );
    }

    // Empty line / paragraph break
    if (!trimmed) {
      return <div key={idx} style={{ height: '6px' }} />;
    }

    return (
      <div key={idx} style={{ marginBottom: '2px' }}>
        {parsedLine}
      </div>
    );
  });
};

// ===========================================================================
// ChatPanel — advisory banner, auto-sliding quick questions, message list,
// and input dock. Rendered inside the full page card or the floating widget.
// ===========================================================================
const ChatPanel = ({ chat, compact = false, autoFocus = false }) => {
  const { messages, input, setInput, loading, error, setError, sendMessage, isTl } = chat;
  const bottomRef = useRef(null);
  const messagesRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Scroll only the message list (not the whole page) to the newest message
    const el = messagesRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, loading, error]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  const suggestedQuestions = isTl ? SUGGESTED_TL : SUGGESTED_EN;

  // ── Auto-sliding quick questions (all screen sizes) ────────────────────
  // Chips glide on their own so users see they can swipe. Any touch, hover,
  // or focus pauses the motion; it resumes a few seconds after interaction.
  const suggestScrollRef = useRef(null);
  const suggestPausedRef = useRef(false);
  const suggestResumeRef = useRef(null);
  const [autoSlide, setAutoSlide] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setAutoSlide(!reduce.matches);
    update();
    reduce.addEventListener('change', update);
    return () => reduce.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const el = suggestScrollRef.current;
    if (!autoSlide || !el) return;
    let raf;
    let pos = el.scrollLeft;
    const SPEED = 0.45; // px per frame
    const step = () => {
      const half = el.scrollWidth / 2;
      if (!suggestPausedRef.current && half > el.clientWidth) {
        pos += SPEED;
        if (pos >= half) pos -= half;
        el.scrollLeft = pos;
      } else {
        // Follow manual swipes so motion resumes from where the user left off
        pos = el.scrollLeft;
        if (half > 0 && pos >= half) { pos -= half; el.scrollLeft = pos; }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(suggestResumeRef.current);
    };
  }, [autoSlide, suggestedQuestions]);

  const pauseSuggest = () => {
    clearTimeout(suggestResumeRef.current);
    suggestPausedRef.current = true;
  };
  const resumeSuggest = (delay = 2500) => {
    clearTimeout(suggestResumeRef.current);
    suggestResumeRef.current = setTimeout(() => { suggestPausedRef.current = false; }, delay);
  };

  const renderedSuggestions = autoSlide
    ? [...suggestedQuestions, ...suggestedQuestions]
    : suggestedQuestions;

  return (
    <>
      {/* Advisory Banner */}
      <div className="chatbot-banner">
        <AlertTriangle size={15} className="chatbot-banner-icon" />
        <span className="chatbot-banner-text">
          <strong>{isTl ? 'Payo Lamang:' : 'Advisory Only:'}</strong>{' '}
          {compact
            ? (isTl ? 'Gabay lamang ang sagot ng AI.' : 'AI responses are guidance only.')
            : (isTl
              ? 'Gabay lamang ang sagot ng AI batay sa opisyal na talaan ng Bayan ng Roxas.'
              : 'AI responses are advisory guidance based on official Municipality of Roxas records.')}
        </span>
      </div>

      {/* Suggested Questions — pinned below banner, always visible */}
      <div
        ref={suggestScrollRef}
        className={`chatbot-suggested-scroll${autoSlide ? ' chatbot-suggested-scroll--auto' : ''}`}
        onTouchStart={pauseSuggest}
        onTouchEnd={() => resumeSuggest()}
        onTouchCancel={() => resumeSuggest()}
        onMouseEnter={pauseSuggest}
        onMouseLeave={() => resumeSuggest(800)}
        onFocus={pauseSuggest}
        onBlur={() => resumeSuggest()}
      >
        {renderedSuggestions.map((q, i) => {
          const isClone = i >= suggestedQuestions.length;
          return (
            <button
              key={i}
              type="button"
              onClick={() => sendMessage(q)}
              disabled={loading}
              className="chatbot-suggest-chip"
              aria-hidden={isClone || undefined}
              tabIndex={isClone ? -1 : undefined}
            >
              {q}
            </button>
          );
        })}
      </div>

      {/* Scrollable Messages Area */}
      <div className="chatbot-messages" ref={messagesRef}>
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`chatbot-message-row ${msg.type === 'user' ? 'chatbot-message-user' : 'chatbot-message-bot'}`}
          >
            <div className={`chatbot-avatar ${msg.type === 'user' ? 'chatbot-avatar-user' : 'chatbot-avatar-bot'}`}>
              {msg.type === 'bot' ? <Bot size={18} /> : <User size={18} />}
            </div>
            <div className={`chatbot-bubble ${msg.type === 'user' ? 'chatbot-bubble-user' : 'chatbot-bubble-bot'}`}>
              {msg.type === 'user' ? msg.text : renderMessageContent(msg.text)}
            </div>
          </div>
        ))}

        {loading && (
          <div className="chatbot-message-row chatbot-message-bot">
            <div className="chatbot-avatar chatbot-avatar-bot">
              <Bot size={18} />
            </div>
            <div className="chatbot-bubble chatbot-bubble-bot chatbot-typing-bubble">
              <span className="chatbot-typing-dot" />
              <span className="chatbot-typing-dot" />
              <span className="chatbot-typing-dot" />
            </div>
          </div>
        )}

        {error && (
          <div className="chatbot-error-pill">
            <AlertTriangle size={14} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Dock Row */}
      <form
        className="chatbot-input-row"
        onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
      >
        <input
          ref={inputRef}
          type="text"
          className="chatbot-input"
          value={input}
          onChange={e => { setInput(e.target.value); setError(null); }}
          placeholder={isTl ? 'Magtanong tungkol sa permit...' : 'Type a question about permits...'}
          disabled={loading}
          aria-label={isTl ? 'Mensahe sa AI Assistant' : 'Message the AI Assistant'}
        />
        <button
          type="submit"
          className="btn btn-primary chatbot-send-btn"
          disabled={loading || !input.trim()}
          aria-label={isTl ? 'Ipadala' : 'Send'}
        >
          <Send size={18} />
          {!compact && <span className="chatbot-send-label">{isTl ? 'Ipadala' : 'Send'}</span>}
        </button>
      </form>
    </>
  );
};

export default ChatPanel;
