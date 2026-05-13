import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  MessageSquare, 
  Settings, 
  LogOut, 
  Plus, 
  BarChart3,
  Bot,
  UserPlus,
  ShoppingBag
} from 'lucide-react';
import axios from 'axios';
import BusinessModal from '../components/BusinessModal';
import UserModal from '../components/UserModal';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('resumen'); // 'resumen', 'clientes', 'pedidos'
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (activeTab === 'pedidos' && businesses.length > 0) {
      fetchBusinessOrders(businesses[0]._id); // Por defecto el primer negocio
    }
  }, [activeTab]);

  const fetchBusinessOrders = async (bizId) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`/api/order/business/${bizId}`, config);
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchData();
    if (user.role === 'admin') fetchUsers();
  }, [user]);

  const fetchData = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const endpoint = user.role === 'admin' ? '/api/business' : '/api/business/me';
      const { data } = await axios.get(endpoint, config);
      setBusinesses(Array.isArray(data) ? data : [data]);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get('/api/auth/users', config);
      setAllUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const openCreateModal = () => {
    setSelectedBusiness(null);
    setIsModalOpen(true);
  };

  const openEditModal = (biz) => {
    setSelectedBusiness(biz);
    setIsModalOpen(true);
  };

  if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '100px' }}>Cargando Panel...</div>;

  return (
    <div className="container">
      <div style={{ display: 'flex', gap: '30px', marginTop: '20px' }}>
        {/* Sidebar Mini */}
        <aside style={{ width: '200px' }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button 
              onClick={() => setActiveTab('resumen')}
              className="btn-secondary" 
              style={{ 
                display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', 
                background: activeTab === 'resumen' ? 'var(--accent-primary)' : 'none', 
                color: activeTab === 'resumen' ? 'white' : 'inherit' 
              }}
            >
              <BarChart3 size={18} /> Resumen
            </button>
            <button 
              onClick={() => setActiveTab('pedidos')}
              className="btn-secondary" 
              style={{ 
                display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', 
                background: activeTab === 'pedidos' ? 'var(--accent-primary)' : 'none', 
                color: activeTab === 'pedidos' ? 'white' : 'inherit' 
              }}
            >
              <ShoppingBag size={18} /> Pedidos
            </button>
            <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'none' }}>
              <MessageSquare size={18} /> Chats
            </button>
            {user?.role === 'admin' && (
              <button 
                onClick={() => setActiveTab('clientes')}
                className="btn-secondary" 
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', 
                  background: activeTab === 'clientes' ? 'var(--accent-primary)' : 'none', 
                  color: activeTab === 'clientes' ? 'white' : 'inherit' 
                }}
              >
                <Users size={18} /> Clientes
              </button>
            )}
            <button onClick={handleLogout} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'none', color: 'var(--danger)', marginTop: '40px' }}>
              <LogOut size={18} /> Salir
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main style={{ flex: 1 }}>
          {activeTab === 'resumen' ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                  <h2 style={{ fontSize: '28px' }}>Panel de {user?.role === 'admin' ? 'Administrador' : 'Cliente'}</h2>
                  <p style={{ color: 'var(--text-secondary)' }}>Bienvenido, {user?.username}</p>
                </div>
                {user?.role === 'admin' && (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setIsUserModalOpen(true)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <UserPlus size={18} /> Nuevo Cliente
                    </button>
                    <button onClick={openCreateModal} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Plus size={18} /> Vincular Negocio
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {businesses.map((biz) => (
                  <div key={biz._id} className="glass-card" style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
                      <div style={{ background: 'rgba(249, 115, 22, 0.1)', padding: '10px', borderRadius: '12px' }}>
                        <Bot size={24} className="gradient-text" />
                      </div>
                      <h3 style={{ fontSize: '18px' }}>{biz.name}</h3>
                    </div>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '15px' }}>
                      {biz.description || 'Sin descripción'}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Propietario: {biz.owner?.username}</span>
                      <button 
                        onClick={() => navigate(`/business/${biz._id}/branches`)} 
                        className="btn-primary" 
                        style={{ padding: '8px 16px', fontSize: '13px' }}
                      >
                        Gestionar Sucursales
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : activeTab === 'pedidos' ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                  <h2 style={{ fontSize: '28px' }}>Pedidos Recientes</h2>
                  <p style={{ color: 'var(--text-secondary)' }}>Últimos pedidos capturados por la IA en todos tus negocios</p>
                </div>
              </div>

              <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.05)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '15px' }}>Cliente</th>
                      <th style={{ padding: '15px' }}>Sucursal</th>
                      <th style={{ padding: '15px' }}>Total</th>
                      <th style={{ padding: '15px' }}>Estado</th>
                      <th style={{ padding: '15px' }}>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ padding: '30px', textAlign: 'center' }}>No hay pedidos registrados aún.</td>
                      </tr>
                    ) : (
                      orders.map(order => (
                        <tr key={order._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '15px', fontWeight: '600' }}>{order.customerPhone}</td>
                          <td style={{ padding: '15px' }}>{order.branch?.name}</td>
                          <td style={{ padding: '15px' }}>${order.total?.toLocaleString()}</td>
                          <td style={{ padding: '15px' }}>
                            <span style={{ 
                              background: 'var(--success)', // Simplificado para el dashboard
                              color: 'var(--text-primary)', 
                              padding: '2px 8px', 
                              borderRadius: '4px', 
                              fontSize: '12px',
                              textTransform: 'capitalize'
                            }}>
                              {order.status}
                            </span>
                          </td>
                          <td style={{ padding: '15px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {new Date(order.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                  <h2 style={{ fontSize: '28px' }}>Gestión de Clientes</h2>
                  <p style={{ color: 'var(--text-secondary)' }}>Lista de usuarios con acceso al sistema</p>
                </div>
                <button onClick={() => setIsUserModalOpen(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserPlus size={18} /> Crear Usuario
                </button>
              </div>

              <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.05)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '15px' }}>Usuario</th>
                      <th style={{ padding: '15px' }}>Rol</th>
                      <th style={{ padding: '15px' }}>ID</th>
                      <th style={{ padding: '15px' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map(u => (
                      <tr key={u._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '15px', fontWeight: '600' }}>{u.username}</td>
                        <td style={{ padding: '15px' }}><span style={{ background: 'var(--success)', color: 'var(--text-primary)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>{u.role}</span></td>
                        <td style={{ padding: '15px', fontSize: '12px', color: 'var(--text-secondary)' }}>{u._id}</td>
                        <td style={{ padding: '15px' }}>
                           <button onClick={() => { setSelectedBusiness(null); setIsModalOpen(true); }} className="btn-secondary" style={{ fontSize: '12px', padding: '5px 10px' }}>Asignar Negocio</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </main>
      </div>

      <BusinessModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        business={selectedBusiness}
        user={user}
        onSave={fetchData}
      />

      <UserModal 
        isOpen={isUserModalOpen} 
        onClose={() => setIsUserModalOpen(false)} 
        adminToken={user.token}
        onSave={fetchUsers}
      />
    </div>
  );
};

export default Dashboard;
