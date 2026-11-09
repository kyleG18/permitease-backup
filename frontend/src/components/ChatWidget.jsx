import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, X, Maximize2, RotateCcw, Bot } from 'lucide-react';
import ChatPanel from './ChatPanel';
import { useChatSession } from '../hooks/useChatSession';

// ===========================================================================
// ChatWidget — floating AI chat button that opens a chat window on top of the
// current page (instead of navigating away). "Open full view" goes to the
// full AI Assistant page at /assistant.
//   Desktop: compact window anchored bottom-right.
//   Mobile:  full-screen sheet.
// ===========================================================================
const ChatWidget = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const chat = useChatSession({ enabled: hasOpened });
  const { isTl, clearConversation } = chat;
  const toggleRef = useRef(null);

  const openWidget = () => { setHasOpened(true); setOpen(true); };
  const closeWidget = () => {
    setOpen(false);
    toggleRef.current?.focus({ preventScroll: true });
  };

  // Close with Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') closeWidget(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Prevent background page scrolling while the full-screen sheet is open on mobile
  useEffect(() => {
    if (!open) return;
    const mq = window.matchMedia('(max-width: 768px)');
    if (!mq.matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const openFullView = () => {
    setOpen(false);
    navigate('/assistant');
  };

  return (
    <>
      {/* Chat window — kept mounted after first open so the conversation persists while closed */}
      {hasOpened && (
        <div
          className={`chat-widget${open ? ' chat-widget--open' : ''}`}
          role="dialog"
          aria-modal="false"
          aria-label="PermitEase AI Assistant"
          aria-hidden={!open}
        >
          <div className="chat-widget__header">
            <div className="chat-widget__identity">
              <div className="chat-widget__avatar"><Bot size={18} /></div>
              <div style={{ minWidth: 0 }}>
                <div className="chat-widget__title">PermitEase AI Assistant</div>
                <div className="chat-widget__status">
                  <span className="chatbot-status-dot" /> Online
                </div>
              </div>
            </div>
            <div className="chat-widget__actions">
              <button
                type="button"
                className="chat-widget__icon-btn"
                onClick={clearConversation}
                title={isTl ? 'Linisin ang Chat' : 'Clear view'}
                aria-label={isTl ? 'Linisin ang Chat' : 'Clear view'}
              >
                <RotateCcw size={16} />
              </button>
              <button
                type="button"
                className="chat-widget__icon-btn"
                onClick={openFullView}
                title={isTl ? 'Buksan ang buong view' : 'Open full view'}
                aria-label={isTl ? 'Buksan ang buong view' : 'Open full view'}
              >
                <Maximize2 size={16} />
              </button>
              <button
                type="button"
                className="chat-widget__icon-btn"
                onClick={closeWidget}
                title={isTl ? 'Isara' : 'Close'}
                aria-label={isTl ? 'Isara' : 'Close'}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="chat-widget__body">
            {open && <ChatPanel chat={chat} compact autoFocus />}
          </div>
        </div>
      )}

      {/* Floating toggle button */}
      <button
        ref={toggleRef}
        type="button"
        className={`btn btn-primary floating-chat-btn${open ? ' floating-chat-btn--open' : ''}`}
        onClick={open ? closeWidget : openWidget}
        title={open ? (isTl ? 'Isara ang AI Assistant' : 'Close AI Assistant') : (isTl ? 'Magtanong sa AI Assistant' : 'Ask AI Assistant')}
        aria-label={open ? 'Close AI Assistant' : 'Ask AI Assistant'}
        aria-expanded={open}
      >
        {open ? <X size={22} /> : <MessageSquare size={22} />}
      </button>
    </>
  );
};

export default ChatWidget;
