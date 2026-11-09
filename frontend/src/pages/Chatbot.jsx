import ChatPanel from '../components/ChatPanel';
import { useChatSession } from '../hooks/useChatSession';
import { RefreshCw } from 'lucide-react';

const Chatbot = () => {
  const chat = useChatSession();
  const { isTl, clearConversation } = chat;

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

      {/* Main Chat Window Card */}
      <div className="card chatbot-window">
        <ChatPanel chat={chat} />
      </div>
    </div>
  );
};

export default Chatbot;
