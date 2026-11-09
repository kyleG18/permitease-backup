import { useState, useEffect, useContext, useRef, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ===========================================================================
// useChatSession — shared conversation state for the full AI Assistant page
// and the floating chat widget. Both load the same saved history from
// /api/chat/history, so a conversation started in one appears in the other.
// ===========================================================================
export const useChatSession = ({ enabled = true } = {}) => {
  const { user } = useContext(AuthContext);
  const { lang } = useContext(LanguageContext);
  const isTl = lang === 'tl';

  const defaultGreeting = isTl
    ? "Kumusta! Ako ang PermitEase AI Assistant 🤖\n\nMatutulungan kita sa:\n• Kulang na permit requirements\n• Tinatayang bayarin para sa iyong negosyo\n• Compliance at application status\n• Mga tanong tungkol sa permit at negosyo sa Tagalog o English\n\nPaano kita matutulungan ngayon?"
    : "Hello! I'm the PermitEase AI Assistant 🤖\n\nI can help you with:\n• Your missing permit requirements\n• Estimated fees for your business\n• Your compliance and application status\n• General permit and business questions\n\nHow can I help you today?";

  const [messages, setMessages] = useState([{ type: 'bot', text: defaultGreeting }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const historyLoadedRef = useRef(false);

  const token = user?.token;

  useEffect(() => {
    if (!enabled || !token || historyLoadedRef.current) return;
    historyLoadedRef.current = true;
    axios.get(`${API}/chat/history`, { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => {
        if (Array.isArray(data) && data.length > 0) {
          const histMsgs = data.flatMap(h => [
            { type: 'user', text: h.question },
            { type: 'bot', text: h.response }
          ]);
          setMessages(prev => [...prev, ...histMsgs]);
        }
      })
      .catch(() => { /* silent */ });
  }, [enabled, token]);

  const sendMessage = useCallback(async (text) => {
    if (!text || !text.trim() || loading) return;
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
      const { data } = await axios.post(
        `${API}/chat`,
        { question, language: lang },
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
  }, [loading, lang, token]);

  const clearConversation = useCallback(() => {
    setMessages([{ type: 'bot', text: defaultGreeting }]);
    setError(null);
  }, [defaultGreeting]);

  return { messages, input, setInput, loading, error, setError, sendMessage, clearConversation, isTl };
};

export default useChatSession;
