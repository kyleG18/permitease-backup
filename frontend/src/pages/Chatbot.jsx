import { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { MessageSquare, Send, User, Bot, AlertTriangle, RefreshCw } from 'lucide-react';

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
    // If user message, just show text cleanly
    if (!rawText) return null;

    // Split text into lines
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

      // Parse inline **bold**
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const parsedLine = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx} style={{ color: '#0f172a', fontWeight: '600' }}>{part.slice(2, -2)}</strong>;
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
    // Load chat history on mount
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
      // Just clear frontend state for simplicity (history remains in DB, but gives a clean slate visually)
      setMessages([{ type: 'bot', text: defaultGreeting }]);
      setError(null);
  };

  const suggestedQuestions = isTl ? SUGGESTED_TL : SUGGESTED_EN;

  return (
    <div className="animate-fade-in chatbot-container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 110px)' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
            <h1 style={{ color: 'var(--primary-green)', marginBottom: '0.25rem' }}>
              {isTl ? 'PermitEase AI Assistant' : 'PermitEase AI Assistant'}
            </h1>
            <p className="text-muted" style={{ margin: 0 }}>
              {isTl 
                ? 'Magtanong tungkol sa iyong mga kinakailangang permit, bayarin, o pangkalahatang payo sa negosyo.'
                : 'Ask about your requirements, fees, compliance status, or general permit questions.'}
            </p>
        </div>
        <button onClick={clearConversation} className="btn btn-outline" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
            <RefreshCw size={16} /> {isTl ? 'Linisin ang Chat' : 'Clear View'}
        </button>
      </div>

      {/* Suggested Questions */}
      <div className="chatbot-suggested-scroll" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        {suggestedQuestions.map((q, i) => (
          <button key={i} onClick={() => sendMessage(q)} disabled={loading}
            style={{ background: 'var(--light-green)', border: '1px solid var(--secondary-green)', borderRadius: 'var(--radius-full)', padding: '0.4rem 0.9rem', fontSize: '0.8rem', color: 'var(--primary-green)', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Poppins', fontWeight: '500', opacity: loading ? 0.6 : 1 }}>
            {q}
          </button>
        ))}
      </div>

      {/* Chat Window */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        
        {/* Banner */}
        <div style={{ background: '#f8fafc', padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
            <span><strong>Advisory Only:</strong> AI responses do not override official LGU decisions. Real-time data cited below comes directly from your official PermitEase records.</span>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flexDirection: msg.type === 'user' ? 'row-reverse' : 'row' }}>
              {/* Avatar */}
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: msg.type === 'bot' ? 'var(--light-green)' : 'var(--primary-green)', color: msg.type === 'bot' ? 'var(--primary-green)' : 'white' }}>
                {msg.type === 'bot' ? <Bot size={20} /> : <User size={20} />}
              </div>
              {/* Bubble */}
              <div className="chatbot-bubble" style={{ maxWidth: '75%', padding: '0.875rem 1.125rem', borderRadius: msg.type === 'user' ? '18px 4px 18px 18px' : '4px 18px 18px 18px', background: msg.type === 'user' ? 'var(--primary-green)' : '#f8fafc', color: msg.type === 'user' ? 'white' : '#1e293b', fontSize: '0.92rem', lineHeight: '1.6', border: msg.type === 'bot' ? '1px solid #e2e8f0' : 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                {msg.type === 'user' ? msg.text : renderMessageContent(msg.text)}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--light-green)', color: 'var(--primary-green)' }}><Bot size={20} /></div>
              <div style={{ padding: '0.875rem 1.125rem', borderRadius: '4px 18px 18px 18px', background: '#f1f5f9', display: 'flex', gap: '6px', alignItems: 'center', border: '1px solid #e2e8f0' }}>
                {[0, 1, 2].map(j => (
                  <span key={j} style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-green)', animation: 'bounce 1.2s infinite', animationDelay: `${j * 0.2}s` }} />
                ))}
              </div>
            </div>
          )}
          {error && (
            <div style={{ alignSelf: 'center', background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.5rem 0' }}>
                <AlertTriangle size={14} />
                {error}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="chatbot-input-row" style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.75rem', background: 'white' }}>
          <input
            type="text"
            value={input}
            onChange={e => { setInput(e.target.value); setError(null); }}
            onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
            placeholder="Type a question about permits..."
            disabled={loading}
            style={{ flex: 1, padding: '0.75rem 1.25rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-full)', fontSize: '0.95rem', outline: 'none', fontFamily: 'Poppins', background: loading ? '#f8fafc' : 'white', cursor: loading ? 'not-allowed' : 'text' }}
          />
          <button onClick={() => sendMessage(input)} className="btn btn-primary" style={{ borderRadius: 'var(--radius-full)', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }} disabled={loading || !input.trim()}>
            <Send size={18} />
            <span style={{ fontWeight: 600 }}>Send</span>
          </button>
        </div>
      </div>

      <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }`}</style>
    </div>
  );
};

export default Chatbot;
