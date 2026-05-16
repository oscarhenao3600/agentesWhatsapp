import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Users as UsersIcon, 
  UserPlus, 
  Search,
  MoreVertical,
  Shield,
  ShieldCheck,
  User
} from 'lucide-react';
import axios from 'axios';
import UserModal from '../components/UserModal';

const UsersList = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get('/api/auth/users', config);
      setUsers(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div>Cargando Usuarios...</div>;

  return (
    <>
      <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Gestión de <span className="gradient-text">Usuarios</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>Administra los accesos de clientes y personal al sistema.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          <UserPlus size={18} /> Nuevo Usuario
        </button>
      </header>

      <div className="glass-card" style={{ padding: '0px', overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '15px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              className="input-field" 
              placeholder="Buscar por nombre de usuario..." 
              style={{ paddingLeft: '40px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--text-secondary)', fontSize: '13px' }}>
              <th style={{ padding: '15px 24px' }}>USUARIO</th>
              <th style={{ padding: '15px 24px' }}>ROL</th>
              <th style={{ padding: '15px 24px' }}>ID</th>
              <th style={{ padding: '15px 24px' }}>FECHA CREACIÓN</th>
              <th style={{ padding: '15px 24px', textAlign: 'right' }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(u => (
              <tr key={u._id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                <td style={{ padding: '15px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyCenter: 'center' }}>
                      <User size={18} color="var(--accent-primary)" />
                    </div>
                    <span style={{ fontWeight: '600' }}>{u.username}</span>
                  </div>
                </td>
                <td style={{ padding: '15px 24px' }}>
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
                <td style={{ padding: '15px 24px', fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                  {u._id}
                </td>
                <td style={{ padding: '15px 24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {new Date(u.createdAt || Date.now()).toLocaleDateString()}
                </td>
                <td style={{ padding: '15px 24px', textAlign: 'right' }}>
                  <button className="btn-secondary" style={{ padding: '8px' }}>
                    <MoreVertical size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <UserModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        adminToken={user.token}
        onSave={fetchUsers}
      />
    </>
  );
};

export default UsersList;
