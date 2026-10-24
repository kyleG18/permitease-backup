import { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { Send, User, Bot, AlertTriangle, RefreshCw } from 'lucide-react';

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

const Chatbot = () => {
  const { user } = useContext(AuthContext);
  const { lang } = useContext(LanguageContext);
  const isTl = lang === 'tl';

  const defaultGreeting = isTl
    ? "Kumusta! Ako ang PermitEase AI Assistant 🤖\n\nMatutulungan kita sa:\n• Kulang na permit requirements\n• Tinatayang bayarin para sa iyong negosyo\n• Compliance at application status\n• Mga tanong tungkol sa permit at negosyo sa Tagalog o English\n\nPaano kita matutulungan ngayon?"
    : "Hello! I'm the PermitEase AI Assistant 🤖\n\nI can help you with:\n• Your missing permit requirements\n• Estimated fees for your business\n• Your compliance and application status\n• General permit and business questions\n\nHow can I help you today?";

  const [messages, setMessages] = useState([
    { type: 'bot', text: defaultGreeting }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  const config = { headers: { Authorization: `Bearer ${user.token}` } };

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

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data } = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/chat/history`, config);
        if (data.length > 0) {
          const histMsgs = data.flatMap(h => [
            { type: 'user', text: h.question },
            { type: 'bot', text: h.response }
          ]);
          setMessages(prev => [...prev, ...histMsgs]);
        }
      } catch (err) { /* silent */ }
    };
    fetchHistory();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, error]);

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    const question = text.trim();
    if (question.length > 1000) {
      setError('Message is too long. Please keep it under 1000 characters.');
      return;
    }

    setInput('');
    setError(null);
    setMessages(prev => [...prev, { type: 'user', text: question }]);
    setLoading(true);

    try {
      const { data } = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/chat`, { question, language: lang }, config);
      setMessages(prev => [...prev, { type: 'bot', text: data.response }]);
    } catch (err) {
      if (err.response?.status === 429) {
        setError('Too many requests. Please wait a few minutes before sending another message.');
      } else {
        setError(err.response?.data?.message || 'Sorry, I encountered an error connecting to the AI service. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const clearConversation = () => {
    setMessages([{ type: 'bot', text: defaultGreeting }]);
    setError(null);
  };

  const suggestedQuestions = isTl ? SUGGESTED_TL : SUGGESTED_EN;

  return (
    <div className="animate-fade-in chatbot-container">
      {/* Top Header Row */}
      <div className="chatbot-header-row">
        <div className="chatbot-header-text">
          <div className="chatbot-title-wrap">
            <h1 className="chatbot-title">
              PermitEase AI Assistant
            </h1>
            <span className="chatbot-status-pill">
              <span className="chatbot-status-dot" />
              {isTl ? 'Online' : 'Online'}
            </span>
          </div>
          <p className="text-muted chatbot-subtitle">
            {isTl 
              ? 'Magtanong tungkol sa iyong mga kinakailangang permit, bayarin, o payo sa negosyo.'
              : 'Ask about requirements, fees, compliance status, or general permit questions.'}
          </p>
        </div>
        <button 
          onClick={clearConversation} 
          className="btn btn-outline chatbot-clear-btn"
          title={isTl ? 'Linisin ang Chat' : 'Clear View'}
        >
          <RefreshCw size={15} />
          <span className="chatbot-clear-label">{isTl ? 'Linisin' : 'Clear View'}</span>
        </button>
      </div>

      {/* Suggested Questions Horizontal Chips */}
      <div className="chatbot-suggested-scroll">
        {suggestedQuestions.map((q, i) => (
          <button 
            key={i} 
            onClick={() => sendMessage(q)} 
            disabled={loading}
            className="chatbot-suggest-chip"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Main Chat Window Card */}
      <div className="card chatbot-window">
        {/* Advisory Banner */}
        <div className="chatbot-banner">
          <AlertTriangle size={15} className="chatbot-banner-icon" />
          <span className="chatbot-banner-text">
            <strong>{isTl ? 'Payo Lamang:' : 'Advisory Only:'}</strong>{' '}
            {isTl 
              ? 'Gabay lamang ang sagot ng AI batay sa opisyal na talaan ng Roxas City.' 
              : 'AI responses are advisory guidance based on official Roxas City records.'}
          </span>
        </div>

        {/* Scrollable Messages Area */}
        <div className="chatbot-messages">
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
            type="text"
            className="chatbot-input"
            value={input}
            onChange={e => { setInput(e.target.value); setError(null); }}
            placeholder={isTl ? 'Magtanong tungkol sa permit...' : 'Type a question about permits...'}
            disabled={loading}
          />
          <button 
            type="submit" 
            className="btn btn-primary chatbot-send-btn" 
            disabled={loading || !input.trim()}
            aria-label={isTl ? 'Ipadala' : 'Send'}
          >
            <Send size={18} />
            <span className="chatbot-send-label">{isTl ? 'Ipadala' : 'Send'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chatbot;
