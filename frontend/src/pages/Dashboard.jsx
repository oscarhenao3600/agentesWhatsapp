import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Bot,
  UserPlus,
  ShoppingBag,
  ArrowRight,
  TrendingUp,
  MessageSquare,
  Building2
} from 'lucide-react';
import axios from 'axios';
import BusinessModal from '../components/BusinessModal';
import UserModal from '../components/UserModal';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState(null);

  useEffect(() => {
    fetchData();
    if (user?.role === 'admin') fetchUsers();
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

  const openCreateModal = () => {
    setSelectedBusiness(null);
    setIsModalOpen(true);
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: '100px' }}>Cargando Panel...</div>;

  return (
    <>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '28px', mdFontSize: '32px', marginBottom: '8px' }}>Bienvenido, <span className="gradient-text">{user?.username}</span></h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>Aquí tienes un resumen de tus operaciones actuales.</p>
      </header>

      {/* Stats Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px' }}>
          <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '15px', borderRadius: '15px' }}>
            <Building2 className="gradient-text" size={24} />
          </div>
          <div>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Negocios</span>
            <h3 style={{ fontSize: '22px', fontWeight: '700' }}>{businesses.length}</h3>
          </div>
        </div>
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '15px', borderRadius: '15px' }}>
            <ShoppingBag style={{ color: '#10b981' }} size={24} />
          </div>
          <div>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Pedidos Hoy</span>
            <h3 style={{ fontSize: '22px', fontWeight: '700' }}>0</h3>
          </div>
        </div>
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px' }}>
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '15px', borderRadius: '15px' }}>
            <MessageSquare style={{ color: '#f59e0b' }} size={24} />
          </div>
          <div>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Mensajes IA</span>
            <h3 style={{ fontSize: '22px', fontWeight: '700' }}>0</h3>
          </div>
        </div>
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px' }}>
          <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '15px', borderRadius: '15px' }}>
            <TrendingUp style={{ color: '#8b5cf6' }} size={24} />
          </div>
          <div>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Conversión</span>
            <h3 style={{ fontSize: '22px', fontWeight: '700' }}>0%</h3>
          </div>
        </div>
      </div>

      <section>
        <div className="page-header">
          <h2 style={{ fontSize: '24px' }}>Tus Negocios</h2>
          {user?.role === 'admin' && (
            <div className="page-header-actions">
              <button onClick={() => setIsUserModalOpen(true)} className="btn-secondary">
                <UserPlus size={18} /> Nuevo Cliente
              </button>
              <button onClick={openCreateModal} className="btn-primary">
                <Plus size={18} /> Nuevo Negocio
              </button>
            </div>
          )}
        </div>

        <div className="responsive-grid">
          {businesses.map((biz) => (
            <div key={biz._id} className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                <div style={{ background: 'var(--accent-soft)', padding: '12px', borderRadius: '16px', display: 'flex' }}>
                  <Bot size={28} className="gradient-text" />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '700' }}>{biz.name}</h3>
                  <span className="badge badge-success" style={{ fontSize: '9px', padding: '2px 8px' }}>Activo</span>
                </div>
              </div>
              
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '25px', minHeight: '42px', flexGrow: 1 }}>
                {biz.description || 'Sin descripción detallada del negocio.'}
              </p>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Propietario</span>
                  <span style={{ fontSize: '13px', fontWeight: '600' }}>{biz.owner?.username || 'Sistema'}</span>
                </div>
                <button 
                  onClick={() => navigate(`/business/${biz._id}/branches`)} 
                  className="btn-primary" 
                  style={{ padding: '10px 16px' }}
                >
                  Configurar <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

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
        adminToken={user?.token}
        onSave={fetchUsers}
      />
    </>
  );
};

export default Dashboard;
