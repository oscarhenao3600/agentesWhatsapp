import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  UserPlus, 
  Search,
  MoreVertical,
  Shield,
  ShieldCheck,
  User,
  Pencil,
  Trash2,
  Power,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import axios from 'axios';
import UserModal from '../components/UserModal';

const UsersList = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [openMenuUserId, setOpenMenuUserId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUsers = useCallback(async () => {
    if (!user?.token) return;
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get('/api/auth/users', config);
      setUsers(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
    }
  }, [user?.token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Cerrar el menú de 3 puntos al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuUserId(null);
    };
    if (openMenuUserId) {
      window.addEventListener('click', handleClickOutside);
    }
    return () => {
      window.removeEventListener('click', handleClickOutside);
    };
  }, [openMenuUserId]);

  const handleOpenCreate = () => {
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (targetUser) => {
    setOpenMenuUserId(null);
    setSelectedUser(targetUser);
    setIsModalOpen(true);
  };

  const handleToggleActive = async (targetUser) => {
    setOpenMenuUserId(null);
    const isCurrentlyActive = targetUser.active !== false;
    const actionLabel = isCurrentlyActive ? 'desactivar' : 'activar';
    if (!window.confirm(`¿Deseas ${actionLabel} la cuenta del usuario "${targetUser.username}"?`)) {
      return;
    }

    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.patch(`/api/auth/users/${targetUser._id}/toggle-active`, {}, config);
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al cambiar el estado del usuario');
    }
  };

  const handleDeleteUser = async (targetUser) => {
    setOpenMenuUserId(null);
    if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente al usuario "${targetUser.username}"?`)) {
      return;
    }

    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.delete(`/api/auth/users/${targetUser._id}`, config);
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al eliminar el usuario');
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div>Cargando Usuarios...</div>;

  return (
    <>
      <header className="page-header">
        <div>
          <h1 style={{ fontSize: '28px', mdFontSize: '32px', marginBottom: '8px' }}>Gestión de <span className="gradient-text">Usuarios</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>Administra los accesos de clientes y personal al sistema.</p>
        </div>
        <div className="page-header-actions">
          <button onClick={handleOpenCreate} className="btn-primary">
            <UserPlus size={18} /> Nuevo Usuario
          </button>
        </div>
      </header>

      <div className="glass-card" style={{ padding: '0px', overflow: 'visible' }}>
        <div className="users-search-bar" style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <label htmlFor="users-search" style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            Buscar usuario
          </label>
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              id="users-search"
              type="text" 
              className="input-field" 
              placeholder="Ej: pizzeriagusto..." 
              style={{ paddingLeft: '40px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="responsive-table-container users-table-container">
          <table className="responsive-table users-responsive-table">
            <thead>
              <tr style={{ background: 'var(--table-header-bg)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                <th style={{ padding: '15px 24px' }}>USUARIO</th>
                <th style={{ padding: '15px 24px' }}>ROL</th>
                <th style={{ padding: '15px 24px' }}>ESTADO</th>
                <th style={{ padding: '15px 24px' }}>ID</th>
                <th style={{ padding: '15px 24px' }}>FECHA CREACIÓN</th>
                <th style={{ padding: '15px 24px', textAlign: 'right' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => {
                const isActive = u.active !== false;
                const isMenuOpen = openMenuUserId === u._id;

                return (
                  <tr
                    key={u._id}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background 0.2s',
                      opacity: isActive ? 1 : 0.65
                    }}
                  >
                    <td data-label="Usuario" style={{ padding: '15px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <User size={18} color={isActive ? 'var(--accent-primary)' : 'var(--text-secondary)'} />
                        </div>
                        <span style={{ fontWeight: '600', wordBreak: 'break-word' }}>{u.username}</span>
                      </div>
                    </td>
                    <td data-label="Rol" style={{ padding: '15px 24px' }}>
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '5px',
                        padding: '4px 10px', 
                        borderRadius: '20px', 
                        fontSize: '11px', 
                        fontWeight: '700',
                        background: u.role === 'admin' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        color: u.role === 'admin' ? '#818cf8' : '#34d399'
                      }}>
                        {u.role === 'admin' ? <ShieldCheck size={12} /> : <Shield size={12} />}
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td data-label="Estado" style={{ padding: '15px 24px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '700',
                        background: isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                        color: isActive ? '#10b981' : '#ef4444'
                      }}>
                        {isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {isActive ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </td>
                    <td data-label="ID" style={{ padding: '15px 24px', fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {u._id}
                    </td>
                    <td data-label="Fecha Creación" style={{ padding: '15px 24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {new Date(u.createdAt || Date.now()).toLocaleDateString()}
                    </td>
                    <td data-label="Acciones" style={{ padding: '15px 24px', textAlign: 'right', position: 'relative' }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '8px' }}
                        aria-label={`Opciones de usuario ${u.username}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuUserId(isMenuOpen ? null : u._id);
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>

                      {isMenuOpen && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            position: 'absolute',
                            right: '24px',
                            top: '52px',
                            minWidth: '185px',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '12px',
                            boxShadow: '0 12px 28px rgba(0, 0, 0, 0.45)',
                            padding: '6px',
                            zIndex: 100,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            textAlign: 'left'
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(u)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              width: '100%',
                              padding: '9px 12px',
                              border: 'none',
                              background: 'transparent',
                              color: 'var(--text-primary)',
                              fontSize: '13px',
                              fontWeight: '500',
                              borderRadius: '8px',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            <Pencil size={15} style={{ color: 'var(--accent-primary)' }} />
                            Editar usuario
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleActive(u)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              width: '100%',
                              padding: '9px 12px',
                              border: 'none',
                              background: 'transparent',
                              color: isActive ? '#f59e0b' : '#10b981',
                              fontSize: '13px',
                              fontWeight: '500',
                              borderRadius: '8px',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            <Power size={15} />
                            {isActive ? 'Desactivar cuenta' : 'Activar cuenta'}
                          </button>

                          <div style={{ height: '1px', background: 'var(--border-color)', margin: '2px 0' }} />

                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              width: '100%',
                              padding: '9px 12px',
                              border: 'none',
                              background: 'transparent',
                              color: '#ef4444',
                              fontSize: '13px',
                              fontWeight: '500',
                              borderRadius: '8px',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            <Trash2 size={15} />
                            Eliminar usuario
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <UserModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedUser(null);
        }}
        onSave={fetchUsers}
        editingUser={selectedUser}
      />
    </>
  );
};

export default UsersList;
