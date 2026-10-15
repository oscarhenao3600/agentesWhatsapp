import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MessageSquare, 
  Search, 
  Send, 
  User, 
  Smile, 
  Paperclip,
  MoreVertical,
  Clock,
  ArrowLeft,
  Trash2,
  CheckSquare,
  X
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

  // Estados para búsqueda y eliminación de chats
  const [searchTerm, setSearchTerm] = useState('');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedChatIds, setSelectedChatIds] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const isDeletingRef = useRef(false);

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
    // Reiniciar selección y filtro al cambiar de sucursal
    setIsSelectionMode(false);
    setSelectedChatIds(new Set());
    setSearchTerm('');
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
    if (isDeletingRef.current) return;
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`/api/chat/${branchId}`, config);
      setConversations(data);
      
      // Actualizar el chat seleccionado actualmente para ver nuevos mensajes en vivo
      if (selectedChat) {
        const updatedChat = data.find(c => c._id === selectedChat._id);
        if (updatedChat) {
          setSelectedChat(updatedChat);
        } else {
          setSelectedChat(null);
        }
      }
    } catch (error) {
      console.error('Error refreshing conversations:', error);
    }
  };

  // Filtrado reactivo de conversaciones por nombre, teléfono o último mensaje
  const filteredConversations = useMemo(() => {
    if (!searchTerm.trim()) return conversations;
    const term = searchTerm.toLowerCase();
    return conversations.filter(chat => {
      const name = (chat.customerName || '').toLowerCase();
      const phone = (chat.customerNumber || '').toLowerCase();
      const lastMsg = (chat.messages && chat.messages.length > 0)
        ? (chat.messages[chat.messages.length - 1].content || '').toLowerCase()
        : '';
      return name.includes(term) || phone.includes(term) || lastMsg.includes(term);
    });
  }, [conversations, searchTerm]);

  // Alternar modo de selección múltiple
  const toggleSelectionMode = () => {
    setIsSelectionMode(prev => {
      if (prev) {
        setSelectedChatIds(new Set());
      }
      return !prev;
    });
  };

  // Marcar/desmarcar un chat en modo selección
  const toggleSelectChat = (chatId) => {
    setSelectedChatIds(prev => {
      const next = new Set(prev);
      if (next.has(chatId)) {
        next.delete(chatId);
      } else {
        next.add(chatId);
      }
      return next;
    });
  };

  // Seleccionar o deseleccionar todos los chats filtrados
  const handleSelectAll = () => {
    if (selectedChatIds.size === filteredConversations.length && filteredConversations.length > 0) {
      setSelectedChatIds(new Set());
    } else {
      setSelectedChatIds(new Set(filteredConversations.map(c => c._id)));
    }
  };

  // 1. Eliminar una sola conversación
  const handleDeleteSingleChat = async (chat, e) => {
    if (e) e.stopPropagation();
    if (!chat || !chat._id) return;

    const chatName = chat.customerName || chat.customerNumber;
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la conversación con "${chatName}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    setIsDeleting(true);
    isDeletingRef.current = true;
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.delete(`/api/chat/${chat._id}`, config);

      setConversations(prev => prev.filter(c => c._id !== chat._id));
      setSelectedChatIds(prev => {
        const next = new Set(prev);
        next.delete(chat._id);
        return next;
      });

      if (selectedChat?._id === chat._id) {
        setSelectedChat(null);
      }
    } catch (error) {
      console.error('Error al eliminar conversación:', error);
      alert(error.response?.data?.message || 'Error al eliminar la conversación');
    } finally {
      setIsDeleting(false);
      isDeletingRef.current = false;
    }
  };

  // 2. Eliminar chats seleccionados (bulk delete)
  const handleDeleteSelected = async () => {
    const count = selectedChatIds.size;
    if (count === 0) return;

    if (!window.confirm(`¿Estás seguro de que deseas eliminar las ${count} conversaciones seleccionadas? Esta acción no se puede deshacer.`)) {
      return;
    }

    setIsDeleting(true);
    isDeletingRef.current = true;
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const idsArray = Array.from(selectedChatIds);
      await axios.post('/api/chat/delete-multiple', { conversationIds: idsArray }, config);

      setConversations(prev => prev.filter(c => !selectedChatIds.has(c._id)));

      if (selectedChat && selectedChatIds.has(selectedChat._id)) {
        setSelectedChat(null);
      }

      setSelectedChatIds(new Set());
      setIsSelectionMode(false);
    } catch (error) {
      console.error('Error al eliminar conversaciones seleccionadas:', error);
      alert(error.response?.data?.message || 'Error al eliminar las conversaciones');
    } finally {
      setIsDeleting(false);
      isDeletingRef.current = false;
    }
  };

  // 3. Vaciar todas las conversaciones de la sucursal actual
  const handleClearAllBranchChats = async () => {
    if (!selectedBranchId || conversations.length === 0) return;

    if (!window.confirm('¿Estás seguro de que deseas eliminar TODAS las conversaciones de esta sucursal? Esta acción vaciará el historial por completo y no se puede deshacer.')) {
      return;
    }

    setIsDeleting(true);
    isDeletingRef.current = true;
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.delete(`/api/chat/branch/${selectedBranchId}/clear`, config);

      setConversations([]);
      setSelectedChat(null);
      setSelectedChatIds(new Set());
      setIsSelectionMode(false);
    } catch (error) {
      console.error('Error al vaciar conversaciones:', error);
      alert(error.response?.data?.message || 'Error al vaciar las conversaciones');
    } finally {
      setIsDeleting(false);
      isDeletingRef.current = false;
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
          <div className="sidebar-header-top">
            <h2>Mensajes</h2>
            {conversations.length > 0 && (
              <div className="chats-header-actions">
                <button 
                  type="button"
                  className={`chats-header-btn ${isSelectionMode ? 'active' : ''}`}
                  onClick={toggleSelectionMode}
                  title={isSelectionMode ? "Cancelar selección" : "Seleccionar varios chats para eliminar"}
                >
                  <CheckSquare size={14} />
                  <span>{isSelectionMode ? 'Cancelar' : 'Seleccionar'}</span>
                </button>
                {user.role === 'admin' && !isSelectionMode && (
                  <button
                    type="button"
                    className="chats-header-btn danger-text"
                    onClick={handleClearAllBranchChats}
                    title="Eliminar todos los chats de esta sucursal"
                  >
                    <Trash2 size={14} />
                    <span>Vaciar</span>
                  </button>
                )}
              </div>
            )}
          </div>
          
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
            <Search size={18} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
            <input 
              type="text" 
              className="input-field" 
              placeholder="Buscar conversación..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ border: 'none', background: 'none', padding: '0 5px' }} 
            />
            {searchTerm && (
              <button 
                type="button"
                onClick={() => setSearchTerm('')} 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0, display: 'flex' }}
                title="Limpiar búsqueda"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Barra de herramientas para selección múltiple */}
          {isSelectionMode && (
            <div className="chats-selection-toolbar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-ghost-sm"
                  onClick={handleSelectAll}
                >
                  {selectedChatIds.size === filteredConversations.length && filteredConversations.length > 0
                    ? 'Deseleccionar'
                    : 'Todos'}
                </button>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {selectedChatIds.size} selec.
                </span>
              </div>
              <button
                type="button"
                className="btn-danger-sm"
                onClick={handleDeleteSelected}
                disabled={selectedChatIds.size === 0 || isDeleting}
                title="Eliminar chats seleccionados"
              >
                <Trash2 size={13} />
                <span>Eliminar ({selectedChatIds.size})</span>
              </button>
            </div>
          )}
        </div>

        <div className="chats-list">
          {loadingChats ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando chats...</div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>No hay chats activos.</div>
          ) : filteredConversations.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No se encontraron chats que coincidan con "{searchTerm}".
            </div>
          ) : (
            filteredConversations.map(chat => {
              const lastMsg = chat.messages[chat.messages.length - 1];
              const isSelected = selectedChatIds.has(chat._id);
              const isActive = selectedChat?._id === chat._id;

              return (
                <div 
                  key={chat._id} 
                  className={`chat-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    if (isSelectionMode) {
                      toggleSelectChat(chat._id);
                    } else {
                      setSelectedChat(chat);
                    }
                  }}
                >
                  {isSelectionMode && (
                    <div 
                      className="chat-item-checkbox"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectChat(chat._id);
                      }}
                    >
                      <input 
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // Accionado por el click contenedor
                        aria-label={`Seleccionar chat de ${chat.customerName || chat.customerNumber}`}
                      />
                    </div>
                  )}

                  <div className="avatar">
                    <User size={20} />
                  </div>
                  <div className="chat-info">
                    <div className="chat-name-row">
                      <span className="chat-name">{chat.customerName || chat.customerNumber}</span>
                      <span className="chat-time">{formatTime(chat.lastInteraction)}</span>
                    </div>
                    <div className="chat-last-msg">
                      <p>{lastMsg ? lastMsg.content : 'Sin mensajes'}</p>
                    </div>
                  </div>

                  {!isSelectionMode && (
                    <button
                      type="button"
                      className="chat-delete-btn"
                      title="Eliminar conversación"
                      onClick={(e) => handleDeleteSingleChat(chat, e)}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
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
                  <h3>{selectedChat.customerName || selectedChat.customerNumber}</h3>
                  <span className="status">IA Activa (Monitoreando)</span>
                </div>
              </div>
              <div className="header-actions">
                <button 
                  type="button" 
                  className="icon-btn danger-action" 
                  onClick={() => handleDeleteSingleChat(selectedChat)}
                  title="Eliminar esta conversación"
                >
                  <Trash2 size={20} />
                </button>
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
