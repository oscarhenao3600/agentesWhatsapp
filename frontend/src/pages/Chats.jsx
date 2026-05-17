import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Search, 
  Send, 
  User, 
  Smile, 
  Paperclip,
  MoreVertical,
  Clock,
  ArrowLeft
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Chats = () => {
  const { user } = useAuth();
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingChats, setLoadingChats] = useState(false);
  const [sending, setSending] = useState(false);

  // 1. Cargar las sucursales al montar el componente
  useEffect(() => {
    fetchBranches();
  }, []);

  // 2. Cargar los chats cuando cambie la sucursal seleccionada
  useEffect(() => {
    if (selectedBranchId) {
      fetchConversations(selectedBranchId);
    } else {
      setConversations([]);
      setSelectedChat(null);
    }
  }, [selectedBranchId]);

  // Polling automático cada 5 segundos para actualizar mensajes entrantes
  useEffect(() => {
    let interval;
    if (selectedBranchId) {
      interval = setInterval(() => {
        refreshConversations(selectedBranchId);
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [selectedBranchId, selectedChat]);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get('/api/branch', config);
      setBranches(data);
      if (data.length > 0) {
        setSelectedBranchId(data[0]._id);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConversations = async (branchId) => {
    setLoadingChats(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`/api/chat/${branchId}`, config);
      setConversations(data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoadingChats(false);
    }
  };

  const refreshConversations = async (branchId) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`/api/chat/${branchId}`, config);
      setConversations(data);
      
      // Actualizar el chat seleccionado actualmente para ver nuevos mensajes en vivo
      if (selectedChat) {
        const updatedChat = data.find(c => c._id === selectedChat._id);
        if (updatedChat) {
          setSelectedChat(updatedChat);
        }
      }
    } catch (error) {
      console.error('Error refreshing conversations:', error);
    }
  };

  const handleSendManual = async (e) => {
    e.preventDefault();
    if (!message.trim() || !selectedChat || !selectedBranchId) return;

    setSending(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const payload = {
        customerNumber: selectedChat.customerNumber,
        message: message.trim()
      };

      const { data } = await axios.post(`/api/chat/${selectedBranchId}/send`, payload, config);
      
      if (data.success) {
        setMessage('');
        // Recargar chats
        fetchConversations(selectedBranchId);
      }
    } catch (error) {
      console.error('Error sending manual message:', error);
      alert('Error al enviar el mensaje de WhatsApp');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: '100px', color: 'var(--text-secondary)' }}>Cargando Sucursales...</div>;

  return (
    <div className={`chats-container ${selectedChat ? 'chat-selected' : ''}`}>
      {/* Sidebar de Chats */}
      <div className="chats-sidebar">
        <div className="sidebar-header">
          <h2>Mensajes</h2>
          
          {/* Selector de Sucursal */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '5px' }}>Sucursal</label>
            <select
              className="input-field"
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', height: '42px', padding: '0 10px' }}
            >
              <option value="">Selecciona una sucursal</option>
              {branches.map(b => (
                <option key={b._id} value={b._id}>
                  {b.business?.name ? `${b.business.name} - ${b.name}` : b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="search-box">
            <Search size={18} style={{ color: 'var(--text-secondary)' }} />
            <input type="text" className="input-field" placeholder="Buscar conversación..." style={{ border: 'none', background: 'none', padding: '0 5px' }} />
          </div>
        </div>

        <div className="chats-list">
          {loadingChats ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando chats...</div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>No hay chats activos.</div>
          ) : (
            conversations.map(chat => {
              const lastMsg = chat.messages[chat.messages.length - 1];
              return (
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
                      <span className="chat-time">{formatTime(chat.lastInteraction)}</span>
                    </div>
                    <div className="chat-last-msg">
                      <p>{lastMsg ? lastMsg.content : 'Sin mensajes'}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Área de Chat */}
      <div className="chat-area">
        {selectedChat ? (
          <>
            <div className="chat-header">
              <div className="header-info">
                {/* Botón Volver (Solo visible en Mobile) */}
                <button 
                  onClick={() => setSelectedChat(null)} 
                  className="mobile-back-btn"
                  title="Volver a los chats"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="avatar">
                  <User size={24} />
                </div>
                <div>
                  <h3>{selectedChat.customerNumber}</h3>
                  <span className="status">IA Activa (Monitoreando)</span>
                </div>
              </div>
              <div className="header-actions">
                <button className="icon-btn" aria-label="Buscar"><Search size={20} /></button>
                <button className="icon-btn" aria-label="Más opciones"><MoreVertical size={20} /></button>
              </div>
            </div>

            <div className="chat-messages">
              {selectedChat.messages.map((msg, i) => (
                <div key={i} className={`message-wrapper ${msg.role === 'user' ? 'user' : 'assistant'}`}>
                  <div className="message-bubble">
                    <p>{msg.content}</p>
                    <span className="msg-time">{formatTime(msg.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendManual} className="chat-input-area">
              <button type="button" className="icon-btn" aria-label="Adjuntar"><Paperclip size={20} /></button>
              <button type="button" className="icon-btn" aria-label="Emojis"><Smile size={20} /></button>
              <div className="input-wrapper">
                <input 
                  type="text" 
                  className="input-field"
                  style={{ border: 'none', background: 'none', padding: 0 }}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escribe un mensaje de intervención manual..." 
                  disabled={sending}
                />
              </div>
              <button type="submit" className="send-btn" aria-label="Enviar" disabled={sending || !message.trim()}>
                <Send size={20} />
              </button>
            </form>
          </>
        ) : (
          <div className="empty-chat">
            <MessageSquare size={64} className="gradient-text" />
            <h3>Selecciona una conversación</h3>
            <p>Monitorea las interacciones de la IA con tus clientes en tiempo real e interviene si es necesario.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default Chats;
