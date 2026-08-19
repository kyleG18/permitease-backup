import { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { MessageSquare, Send, User, Bot, AlertTriangle, RefreshCw } from 'lucide-react';

const SUGGESTED = [
  "What documents do I need for my permit?",
  "How much is my estimated permit fee?",
  "When should I renew my permit?",
  "What does my application status mean?",
  "Why does my application need correction?",
  "What should I do if my permit is expired?"
];

const Chatbot = () => {
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState([
    { type: 'bot', text: "Hello! I'm the PermitEase AI Assistant 🤖\n\nI can help you with:\n• Your missing permit requirements\n• Estimated fees for your business\n• Your compliance and application status\n• General permit questions (English or Tagalog)\n\nHow can I help you today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  const config = { headers: { Authorization: `Bearer ${user.token}` } };

  useEffect(() => {
    // Load chat history on mount
    const fetchHistory = async () => {
      try {
        const { data } = await axios.get('http://localhost:5000/api/chat/history', config);
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
      const { data } = await axios.post('http://localhost:5000/api/chat', { question }, config);
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
      setMessages([{ type: 'bot', text: "Hello! I'm the PermitEase AI Assistant 🤖\n\nHow can I help you today?" }]);
      setError(null);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 110px)' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
            <h1 style={{ color: 'var(--primary-green)', marginBottom: '0.25rem' }}>PermitEase AI Assistant</h1>
            <p className="text-muted" style={{ margin: 0 }}>Ask about your requirements, fees, compliance status, or general permit questions — in English or Tagalog.</p>
        </div>
        <button onClick={clearConversation} className="btn btn-outline" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
            <RefreshCw size={16} /> Clear View
        </button>
      </div>

      {/* Suggested Questions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        {SUGGESTED.map((q, i) => (
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
              <div style={{ maxWidth: '75%', padding: '0.875rem 1.125rem', borderRadius: msg.type === 'user' ? '18px 4px 18px 18px' : '4px 18px 18px 18px', background: msg.type === 'user' ? 'var(--primary-green)' : '#f1f5f9', color: msg.type === 'user' ? 'white' : '#334155', fontSize: '0.9rem', lineHeight: '1.6', whiteSpace: 'pre-wrap', border: msg.type === 'bot' ? '1px solid #e2e8f0' : 'none' }}>
                {msg.text}
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
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.75rem', background: 'white' }}>
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
