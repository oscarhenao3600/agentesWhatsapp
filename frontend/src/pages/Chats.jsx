import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Search, 
  Send, 
  User, 
  Smile, 
  Paperclip,
  MoreVertical,
  Clock
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Chats = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // Mock data for initial preview as requested
  useEffect(() => {
    // Simulando carga de chats
    setTimeout(() => {
      setConversations([
        {
          _id: '1',
          customerNumber: '+573001234567',
          lastMessage: '¿A qué hora cierran hoy?',
          time: '10:30 AM',
          unread: 2,
          emotionalState: 'happy',
          messages: [
            { role: 'user', content: 'Hola, me gustaría saber si tienen mesa disponible.' },
            { role: 'assistant', content: '¡Hola! Claro que sí. ¿Para cuántas personas sería?' },
            { role: 'user', content: '¿A qué hora cierran hoy?' }
          ]
        },
        {
          _id: '2',
          customerNumber: '+573119876543',
          lastMessage: 'Gracias por la información.',
          time: 'Ayer',
          unread: 0,
          emotionalState: 'neutral',
          messages: []
        }
      ]);
      setLoading(false);
    }, 800);
  }, []);

  if (loading) return <div style={{ textAlign: 'center', marginTop: '100px' }}>Cargando Conversaciones...</div>;

  return (
    <div className="chats-container">
      {/* Sidebar de Chats */}
      <div className="chats-sidebar">
        <div className="sidebar-header">
          <h2>Mensajes</h2>
          <div className="search-box">
            <Search size={18} />
            <input type="text" className="input-field" placeholder="Buscar conversación..." />
          </div>
        </div>

        <div className="chats-list">
          {conversations.map(chat => (
            <div 
              key={chat._id} 
              className={`chat-item ${selectedChat?._id === chat._id ? 'active' : ''}`}
              onClick={() => setSelectedChat(chat)}
            >
              <div className="avatar">
                <User size={20} />
              </div>
              <div className="chat-info">
                <div className="chat-name-row">
                  <span className="chat-name">{chat.customerNumber}</span>
                  <span className="chat-time">{chat.time}</span>
                </div>
                <div className="chat-last-msg">
                  <p>{chat.lastMessage}</p>
                  {chat.unread > 0 && <span className="unread-badge">{chat.unread}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Área de Chat */}
      <div className="chat-area">
        {selectedChat ? (
          <>
            <div className="chat-header">
              <div className="header-info">
                <div className="avatar">
                  <User size={24} />
                </div>
                <div>
                  <h3>{selectedChat.customerNumber}</h3>
                  <span className="status">En línea (IA Activa)</span>
                </div>
              </div>
              <div className="header-actions">
                <button className="icon-btn"><Search size={20} /></button>
                <button className="icon-btn"><MoreVertical size={20} /></button>
              </div>
            </div>

            <div className="chat-messages">
              {selectedChat.messages.map((msg, i) => (
                <div key={i} className={`message-wrapper ${msg.role}`}>
                  <div className="message-bubble">
                    <p>{msg.content}</p>
                    <span className="msg-time">10:35 AM</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="chat-input-area">
              <button className="icon-btn"><Paperclip size={20} /></button>
              <button className="icon-btn"><Smile size={20} /></button>
              <div className="input-wrapper">
                <input 
                  type="text" 
                  className="input-field"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escribe un mensaje..." 
                />
              </div>
              <button className="send-btn">
                <Send size={20} />
              </button>
            </div>
          </>
        ) : (
          <div className="empty-chat">
            <MessageSquare size={64} className="gradient-text" />
            <h3>Selecciona una conversación</h3>
            <p>Monitorea las interacciones de la IA con tus clientes en tiempo real.</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .chats-container {
          display: flex;
          height: calc(100vh - 120px);
          background: var(--glass-bg);
          border-radius: 24px;
          border: 1px solid var(--border-color);
          overflow: hidden;
        }

        .chats-sidebar {
          width: 350px;
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
        }

        .sidebar-header {
          padding: 24px;
          border-bottom: 1px solid var(--border-color);
        }

        .sidebar-header h2 {
          font-size: 22px;
          margin-bottom: 20px;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.05);
          padding: 10px 15px;
          border-radius: 12px;
          border: 1px solid var(--border-color);
        }

        .search-box input {
          background: none;
          border: none;
          color: white;
          width: 100%;
          outline: none;
        }

        .chats-list {
          flex: 1;
          overflow-y: auto;
        }

        .chat-item {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 15px 24px;
          cursor: pointer;
          transition: all 0.2s;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        }

        .chat-item:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        .chat-item.active {
          background: var(--accent-soft);
          border-left: 4px solid var(--accent-primary);
        }

        .avatar {
          width: 45px;
          height: 45px;
          background: var(--bg-secondary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-primary);
        }

        .chat-info {
          flex: 1;
          overflow: hidden;
        }

        .chat-name-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .chat-name {
          font-weight: 600;
          font-size: 15px;
        }

        .chat-time {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .chat-last-msg {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .chat-last-msg p {
          font-size: 13px;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .unread-badge {
          background: var(--accent-primary);
          color: white;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 10px;
        }

        .chat-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: rgba(0, 0, 0, 0.2);
        }

        .chat-header {
          padding: 15px 30px;
          background: var(--glass-bg);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-info {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .header-info h3 {
          font-size: 16px;
        }

        .status {
          font-size: 12px;
          color: var(--success);
        }

        .chat-messages {
          flex: 1;
          padding: 30px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .message-wrapper {
          max-width: 70%;
          display: flex;
        }

        .message-wrapper.user {
          align-self: flex-start;
        }

        .message-wrapper.assistant {
          align-self: flex-end;
        }

        .message-bubble {
          padding: 12px 16px;
          border-radius: 18px;
          position: relative;
        }

        .user .message-bubble {
          background: var(--bg-secondary);
          border-bottom-left-radius: 4px;
        }

        .assistant .message-bubble {
          background: var(--accent-primary);
          color: white;
          border-bottom-right-radius: 4px;
        }

        .msg-time {
          font-size: 10px;
          opacity: 0.6;
          display: block;
          margin-top: 5px;
          text-align: right;
        }

        .chat-input-area {
          padding: 20px 30px;
          background: var(--glass-bg);
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .input-wrapper {
          flex: 1;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 15px;
          padding: 10px 20px;
          border: 1px solid var(--border-color);
        }

        .input-wrapper input {
          width: 100%;
          background: none;
          border: none;
          color: white;
          outline: none;
        }

        .send-btn {
          width: 45px;
          height: 45px;
          background: var(--gradient-primary);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
        }

        .empty-chat {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 40px;
        }

        .empty-chat h3 {
          margin-top: 20px;
          font-size: 24px;
        }

        .empty-chat p {
          color: var(--text-secondary);
          margin-top: 10px;
          max-width: 400px;
        }

        .icon-btn {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          transition: color 0.2s;
        }

        .icon-btn:hover {
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
};

export default Chats;
