import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  MessageSquare, 
  Search, 
  Send, 
  User, 
  Smile, 
  Paperclip,
  MoreVertical,
  ArrowLeft,
  Trash2,
  CheckSquare,
  X
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
};

const ChatsSidebarHeader = ({
  conversationsCount,
  isSelectionMode,
  onToggleSelectionMode,
  userRole,
  onClearAllBranchChats,
  branches,
  selectedBranchId,
  onBranchChange,
  searchTerm,
  onSearchChange,
  selectedCount,
  filteredCount,
  onSelectAll,
  onDeleteSelected,
  isDeleting
}) => (
  <div className="chats-sidebar-header">
    <div className="sidebar-header-top">
      <h2>Mensajes</h2>
      {conversationsCount > 0 && (
        <div className="chats-header-actions">
          <button 
            type="button"
            className={`chats-header-btn ${isSelectionMode ? 'active' : ''}`}
            onClick={onToggleSelectionMode}
            title={isSelectionMode ? "Cancelar selección" : "Seleccionar varios chats para eliminar"}
          >
            <CheckSquare size={14} />
            <span>{isSelectionMode ? 'Cancelar' : 'Seleccionar'}</span>
          </button>
          {userRole === 'admin' && !isSelectionMode && (
            <button
              type="button"
              className="chats-header-btn danger-text"
              onClick={onClearAllBranchChats}
              title="Eliminar todos los chats de esta sucursal"
            >
              <Trash2 size={14} />
              <span>Vaciar</span>
            </button>
          )}
        </div>
      )}
    </div>
    
    <div className="chats-branch-selector">
      <label htmlFor="chats-branch-select" className="chats-field-label">
        Negocio / Sucursal
      </label>
      <select
        id="chats-branch-select"
        className="input-field chats-branch-select"
        value={selectedBranchId}
        onChange={onBranchChange}
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
      <label htmlFor="chats-search-input" className="search-box-icon-label">
        <Search size={18} className="search-box-icon" />
        <span className="sr-only">Buscar conversación</span>
      </label>
      <input 
        id="chats-search-input"
        type="text" 
        className="search-box-input" 
        placeholder="Buscar cliente, teléfono o mensaje..." 
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      {searchTerm && (
        <button 
          type="button"
          onClick={() => onSearchChange('')} 
          aria-label="Limpiar búsqueda"
          className="search-box-clear"
          title="Limpiar búsqueda"
        >
          <X size={16} />
        </button>
      )}
    </div>

    {isSelectionMode && (
      <div className="chats-selection-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn-ghost-sm"
            onClick={onSelectAll}
          >
            {selectedCount === filteredCount && filteredCount > 0 ? 'Deseleccionar' : 'Todos'}
          </button>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {selectedCount} selec.
          </span>
        </div>
        <button
          type="button"
          className="btn-danger-sm"
          onClick={onDeleteSelected}
          disabled={selectedCount === 0 || isDeleting}
          title="Eliminar chats seleccionados"
        >
          <Trash2 size={13} />
          <span>Eliminar ({selectedCount})</span>
        </button>
      </div>
    )}
  </div>
);

const ChatListItem = ({ chat, isActive, isSelectionMode, isSelected, onSelectChat, onToggleSelectChat, onDeleteSingle }) => {
  const lastMsg = chat.messages?.[chat.messages.length - 1];
  const handleActivate = () => {
    if (isSelectionMode) {
      onToggleSelectChat(chat._id);
    } else {
      onSelectChat(chat);
    }
  };

  return (
    <div className={`chat-item ${isActive ? 'active' : ''}`}>
      {isSelectionMode && (
        <div className="chat-item-checkbox">
          <input 
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelectChat(chat._id)}
            aria-label={`Seleccionar chat de ${chat.customerName || chat.customerNumber}`}
          />
        </div>
      )}

      <button
        type="button"
        onClick={handleActivate}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flex: 1,
          minWidth: 0,
          background: 'none',
          border: 'none',
          padding: 0,
          color: 'inherit',
          textAlign: 'left',
          cursor: 'pointer',
          font: 'inherit'
        }}
      >
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
      </button>

      {!isSelectionMode && (
        <button
          type="button"
          className="chat-delete-btn"
          title="Eliminar conversación"
          aria-label={`Eliminar conversación de ${chat.customerName || chat.customerNumber}`}
          onClick={(e) => onDeleteSingle(chat, e)}
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
};

const ChatsListPanel = ({
  loadingChats,
  conversations,
  filteredConversations,
  searchTerm,
  selectedChat,
  isSelectionMode,
  selectedChatIds,
  onSelectChat,
  onToggleSelectChat,
  onDeleteSingle
}) => (
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
      filteredConversations.map((chat) => (
        <ChatListItem 
          key={chat._id}
          chat={chat}
          isActive={selectedChat?._id === chat._id}
          isSelectionMode={isSelectionMode}
          isSelected={selectedChatIds.has(chat._id)}
          onSelectChat={onSelectChat}
          onToggleSelectChat={onToggleSelectChat}
          onDeleteSingle={onDeleteSingle}
        />
      ))
    )}
  </div>
);

const ActiveChatView = ({ selectedChat, onBack, onDeleteSingle, message, onMessageChange, onSendManual, sending }) => (
  <>
    <div className="chat-header">
      <div className="header-info">
        <button 
          type="button"
          onClick={onBack} 
          className="mobile-back-btn"
          title="Volver a los chats"
          aria-label="Volver a los chats"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="avatar" style={{ flexShrink: 0 }}>
          <User size={24} />
        </div>
        <div className="header-title-wrap">
          <h3>{selectedChat.customerName || selectedChat.customerNumber}</h3>
          <span className="status">IA Activa (Monitoreando)</span>
        </div>
      </div>
      <div className="header-actions">
        <button 
          type="button" 
          className="icon-btn danger-action" 
          onClick={() => onDeleteSingle(selectedChat)}
          title="Eliminar esta conversación"
          aria-label="Eliminar esta conversación"
        >
          <Trash2 size={20} />
        </button>
        <button type="button" className="icon-btn" aria-label="Buscar"><Search size={20} /></button>
        <button type="button" className="icon-btn" aria-label="Más opciones"><MoreVertical size={20} /></button>
      </div>
    </div>

    <div className="chat-messages">
      {selectedChat.messages.map((msg) => (
        <div key={msg._id || `${msg.timestamp}-${msg.role}-${msg.content}`} className={`message-wrapper ${msg.role === 'user' ? 'user' : 'assistant'}`}>
          <div className="message-bubble">
            <p>{msg.content}</p>
            <span className="msg-time">{formatTime(msg.timestamp)}</span>
          </div>
        </div>
      ))}
    </div>

    <form onSubmit={onSendManual} className="chat-input-area">
      <button type="button" className="icon-btn chat-aux-btn" aria-label="Adjuntar"><Paperclip size={20} /></button>
      <button type="button" className="icon-btn chat-aux-btn" aria-label="Emojis"><Smile size={20} /></button>
      <div className="input-wrapper">
        <label htmlFor="chat-manual-message-input" className="sr-only">
          Mensaje manual
        </label>
        <input 
          id="chat-manual-message-input"
          type="text" 
          className="chat-manual-input"
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          placeholder="Escribe un mensaje de intervención manual..." 
          disabled={sending}
        />
      </div>
      <button type="submit" className="send-btn" aria-label="Enviar" disabled={sending || !message.trim()}>
        <Send size={20} />
      </button>
    </form>
  </>
);

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

  const [searchTerm, setSearchTerm] = useState('');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedChatIds, setSelectedChatIds] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const isDeletingRef = useRef(false);

  const fetchConversations = useCallback(async (branchId) => {
    if (!user?.token || !branchId) return;
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
  }, [user?.token]);

  const pollConversations = useCallback((branchId, token, isCancelled) => {
    if (isDeletingRef.current || isCancelled()) return;
    axios
      .get(`/api/chat/${branchId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => {
        if (isCancelled() || isDeletingRef.current) return;
        setConversations(data);
        setSelectedChat((prev) => (prev ? data.find((c) => c._id === prev._id) || null : null));
      })
      .catch((err) => {
        if (!isCancelled()) console.error('Error refreshing conversations:', err);
      });
  }, []);

  useEffect(() => {
    if (!user?.token) return;
    let ignore = false;
    setLoading(true);
    axios
      .get('/api/branch', { headers: { Authorization: `Bearer ${user.token}` } })
      .then(({ data }) => {
        if (ignore) return;
        setBranches(data);
        if (data.length > 0) setSelectedBranchId(data[0]._id);
        setLoading(false);
      })
      .catch((error) => {
        if (!ignore) {
          console.error('Error fetching branches:', error);
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [user?.token]);

  useEffect(() => {
    if (!selectedBranchId || !user?.token) {
      setConversations([]);
      setSelectedChat(null);
      return;
    }
    let ignore = false;
    setLoadingChats(true);
    axios
      .get(`/api/chat/${selectedBranchId}`, { headers: { Authorization: `Bearer ${user.token}` } })
      .then(({ data }) => {
        if (!ignore) {
          setConversations(data);
          setLoadingChats(false);
        }
      })
      .catch((error) => {
        if (!ignore) {
          console.error('Error fetching conversations:', error);
          setLoadingChats(false);
        }
      });

    const interval = setInterval(() => {
      pollConversations(selectedBranchId, user.token, () => ignore);
    }, 5000);

    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [selectedBranchId, user?.token, pollConversations]);

  const handleBranchChange = (e) => {
    setSelectedBranchId(e.target.value);
    setIsSelectionMode(false);
    setSelectedChatIds(new Set());
    setSearchTerm('');
  };

  const filteredConversations = useMemo(() => {
    if (!searchTerm.trim()) return conversations;
    const term = searchTerm.toLowerCase();
    return conversations.filter((chat) => {
      const name = (chat.customerName || '').toLowerCase();
      const phone = (chat.customerNumber || '').toLowerCase();
      const lastMsg = chat.messages?.length > 0
        ? (chat.messages[chat.messages.length - 1].content || '').toLowerCase()
        : '';
      return name.includes(term) || phone.includes(term) || lastMsg.includes(term);
    });
  }, [conversations, searchTerm]);

  const toggleSelectionMode = () => {
    if (isSelectionMode) setSelectedChatIds(new Set());
    setIsSelectionMode((prev) => !prev);
  };

  const toggleSelectChat = (chatId) => {
    setSelectedChatIds((prev) => {
      const next = new Set(prev);
      if (next.has(chatId)) next.delete(chatId);
      else next.add(chatId);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedChatIds.size === filteredConversations.length && filteredConversations.length > 0) {
      setSelectedChatIds(new Set());
    } else {
      setSelectedChatIds(new Set(filteredConversations.map((c) => c._id)));
    }
  };

  const runDeleteTask = async (confirmMsg, actionFn) => {
    if (isDeleting || !window.confirm(confirmMsg)) return;
    setIsDeleting(true);
    isDeletingRef.current = true;
    try {
      await actionFn({ headers: { Authorization: `Bearer ${user.token}` } });
    } catch (error) {
      console.error('Error en operación de eliminación:', error);
      alert(error.response?.data?.message || 'Error al eliminar conversaciones');
    } finally {
      setIsDeleting(false);
      isDeletingRef.current = false;
    }
  };

  const handleDeleteSingleChat = (chat, e) => {
    if (e) e.stopPropagation();
    if (!chat?._id) return;
    const chatName = chat.customerName || chat.customerNumber;
    runDeleteTask(
      `¿Estás seguro de que deseas eliminar la conversación con "${chatName}"? Esta acción no se puede deshacer.`,
      async (config) => {
        await axios.delete(`/api/chat/${chat._id}`, config);
        setConversations((prev) => prev.filter((c) => c._id !== chat._id));
        setSelectedChatIds((prev) => {
          const next = new Set(prev);
          next.delete(chat._id);
          return next;
        });
        if (selectedChat?._id === chat._id) setSelectedChat(null);
      }
    );
  };

  const handleDeleteSelected = () => {
    const count = selectedChatIds.size;
    if (count === 0) return;
    runDeleteTask(
      `¿Estás seguro de que deseas eliminar las ${count} conversaciones seleccionadas? Esta acción no se puede deshacer.`,
      async (config) => {
        await axios.post('/api/chat/delete-multiple', { conversationIds: Array.from(selectedChatIds) }, config);
        setConversations((prev) => prev.filter((c) => !selectedChatIds.has(c._id)));
        if (selectedChat && selectedChatIds.has(selectedChat._id)) setSelectedChat(null);
        setSelectedChatIds(new Set());
        setIsSelectionMode(false);
      }
    );
  };

  const handleClearAllBranchChats = () => {
    if (!selectedBranchId || conversations.length === 0) return;
    runDeleteTask(
      '¿Estás seguro de que deseas eliminar TODAS las conversaciones de esta sucursal? Esta acción vaciará el historial por completo y no se puede deshacer.',
      async (config) => {
        await axios.delete(`/api/chat/branch/${selectedBranchId}/clear`, config);
        setConversations([]);
        setSelectedChat(null);
        setSelectedChatIds(new Set());
        setIsSelectionMode(false);
      }
    );
  };

  const handleSendManual = async (e) => {
    e.preventDefault();
    if (sending || !message.trim() || !selectedChat || !selectedBranchId) return;

    setSending(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const payload = { customerNumber: selectedChat.customerNumber, message: message.trim() };
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

  if (loading) return <div style={{ textAlign: 'center', marginTop: '100px', color: 'var(--text-secondary)' }}>Cargando Sucursales...</div>;

  return (
    <div className={`chats-container ${selectedChat ? 'chat-selected' : ''}`}>
      <div className="chats-sidebar">
        <ChatsSidebarHeader 
          conversationsCount={conversations.length}
          isSelectionMode={isSelectionMode}
          onToggleSelectionMode={toggleSelectionMode}
          userRole={user?.role}
          onClearAllBranchChats={handleClearAllBranchChats}
          branches={branches}
          selectedBranchId={selectedBranchId}
          onBranchChange={handleBranchChange}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedCount={selectedChatIds.size}
          filteredCount={filteredConversations.length}
          onSelectAll={handleSelectAll}
          onDeleteSelected={handleDeleteSelected}
          isDeleting={isDeleting}
        />

        <ChatsListPanel 
          loadingChats={loadingChats}
          conversations={conversations}
          filteredConversations={filteredConversations}
          searchTerm={searchTerm}
          selectedChat={selectedChat}
          isSelectionMode={isSelectionMode}
          selectedChatIds={selectedChatIds}
          onSelectChat={setSelectedChat}
          onToggleSelectChat={toggleSelectChat}
          onDeleteSingle={handleDeleteSingleChat}
        />
      </div>

      <div className="chat-area">
        {selectedChat ? (
          <ActiveChatView 
            selectedChat={selectedChat}
            onBack={() => setSelectedChat(null)}
            onDeleteSingle={handleDeleteSingleChat}
            message={message}
            onMessageChange={setMessage}
            onSendManual={handleSendManual}
            sending={sending}
          />
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


