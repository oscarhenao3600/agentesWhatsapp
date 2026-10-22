import { useState, useEffect, useCallback } from 'react';
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
  Building2,
  MapPin,
  ChevronRight,
  Pencil
} from 'lucide-react';
import axios from 'axios';
import BusinessModal from '../components/BusinessModal';
import UserModal from '../components/UserModal';
import DashboardStatModal from '../components/DashboardStatModal';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    summary: {
      totalBusinesses: 0,
      totalBranches: 0,
      activeBranches: 0,
      connectedBranches: 0,
      ordersToday: 0,
      ordersTotal: 0,
      salesToday: 0,
      salesTotal: 0,
      aiMessagesToday: 0,
      aiMessagesTotal: 0,
      userMessagesToday: 0,
      conversationsToday: 0,
      conversationsTotal: 0,
      conversionToday: 0,
      conversionTotal: 0
    },
    businesses: [],
    recentOrders: [],
    recentConversations: []
  });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [activeStatModal, setActiveStatModal] = useState(null); // 'businesses' | 'orders' | 'messages' | 'conversion' | null

  const fetchData = useCallback(async () => {
    if (!user?.token) return;
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const bizEndpoint = user.role === 'admin' ? '/api/business' : '/api/business/me';

      const [bizRes, statsRes] = await Promise.allSettled([
        axios.get(bizEndpoint, config),
        axios.get('/api/reports/dashboard', config)
      ]);

      if (bizRes.status === 'fulfilled') {
        const data = bizRes.value.data;
        setBusinesses(Array.isArray(data) ? data : (data ? [data] : []));
      }

      if (statsRes.status === 'fulfilled' && statsRes.value.data) {
        setDashboardStats(statsRes.value.data);
        if (Array.isArray(statsRes.value.data.businesses) && statsRes.value.data.businesses.length > 0) {
          setBusinesses(statsRes.value.data.businesses);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  }, [user?.token, user?.role]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreateModal = () => {
    setSelectedBusiness(null);
    setIsModalOpen(true);
  };

  const openEditModal = (biz) => {
    setSelectedBusiness(biz);
    setIsModalOpen(true);
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: '100px' }}>Cargando Panel...</div>;

  const { summary } = dashboardStats;

  const kpiCards = [
    {
      id: 'businesses',
      label: 'Negocios',
      value: summary.totalBusinesses ?? businesses.length,
      subtitle: `${summary.activeBranches || 0} de ${summary.totalBranches || 0} sucursales activas`,
      icon: <Building2 className="gradient-text" size={24} />,
      iconBg: 'rgba(99, 102, 241, 0.12)',
      accentColor: '#6366f1'
    },
    {
      id: 'orders',
      label: 'Pedidos Hoy',
      value: summary.ordersToday ?? 0,
      subtitle: `${summary.ordersTotal || 0} históricos · $${(summary.salesToday || 0).toLocaleString()} hoy`,
      icon: <ShoppingBag style={{ color: '#10b981' }} size={24} />,
      iconBg: 'rgba(16, 185, 129, 0.12)',
      accentColor: '#10b981'
    },
    {
      id: 'messages',
      label: 'Mensajes IA',
      value: summary.aiMessagesToday ?? 0,
      subtitle: `${summary.aiMessagesTotal || 0} históricos · ${summary.conversationsToday || 0} chats hoy`,
      icon: <MessageSquare style={{ color: '#f59e0b' }} size={24} />,
      iconBg: 'rgba(245, 158, 11, 0.12)',
      accentColor: '#f59e0b'
    },
    {
      id: 'conversion',
      label: 'Conversión',
      value: `${summary.conversionToday ?? 0}%`,
      subtitle: `${summary.conversionTotal ?? 0}% histórico (${summary.ordersTotal || 0}/${summary.conversationsTotal || 0} chats)`,
      icon: <TrendingUp style={{ color: '#8b5cf6' }} size={24} />,
      iconBg: 'rgba(139, 92, 246, 0.12)',
      accentColor: '#8b5cf6'
    }
  ];

  return (
    <>
      <header style={{ marginBottom: '36px' }}>
        <h1 style={{ fontSize: '28px', mdFontSize: '32px', marginBottom: '8px' }}>
          Bienvenido, <span className="gradient-text">{user?.username}</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
          Aquí tienes un resumen en tiempo real de tus operaciones actuales. Haz clic en cualquier indicador para ver el desglose detallado.
        </p>
      </header>

      {/* Stats Overview - Interactive Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
          marginBottom: '40px'
        }}
      >
        {kpiCards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => setActiveStatModal(card.id)}
            className="glass-card kpi-interactive-card"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
              padding: '20px',
              textAlign: 'left',
              cursor: 'pointer',
              border: '1px solid var(--border-color)',
              width: '100%',
              color: 'var(--text-primary)',
              transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
              <div style={{ background: card.iconBg, padding: '14px', borderRadius: '15px', flexShrink: 0, display: 'flex' }}>
                {card.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block' }}>
                  {card.label}
                </span>
                <h3 style={{ fontSize: '24px', fontWeight: '700', margin: '2px 0' }}>
                  {card.value}
                </h3>
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    display: 'block',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                  title={card.subtitle}
                >
                  {card.subtitle}
                </span>
              </div>
            </div>
            <ChevronRight size={18} style={{ color: 'var(--text-secondary)', flexShrink: 0, opacity: 0.7 }} />
          </button>
        ))}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '15px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ background: 'var(--accent-soft)', padding: '12px', borderRadius: '16px', display: 'flex' }}>
                    <Bot size={28} className="gradient-text" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '700' }}>{biz.name}</h3>
                    <span className="badge badge-success" style={{ fontSize: '9px', padding: '2px 8px' }}>Activo</span>
                  </div>
                </div>
                {user?.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => openEditModal(biz)}
                    className="btn-secondary"
                    style={{
                      padding: '8px',
                      color: 'var(--accent-primary)',
                      border: '1px solid rgba(99, 102, 241, 0.25)'
                    }}
                    title="Editar información y descripción del negocio"
                    aria-label={`Editar negocio ${biz.name}`}
                  >
                    <Pencil size={15} />
                  </button>
                )}
              </div>
              
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px', minHeight: '38px', flexGrow: 1 }}>
                {biz.description || 'Sin descripción detallada del negocio.'}
              </p>

              {/* Mini-indicadores en tiempo real del negocio */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '18px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: 'rgba(99, 102, 241, 0.1)',
                    color: 'var(--text-primary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <MapPin size={12} className="gradient-text" />
                  {biz.branchesCount ?? 0} sucursal(es)
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    color: '#10b981',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontWeight: '600'
                  }}
                >
                  <ShoppingBag size={12} />
                  {biz.ordersToday ?? 0} hoy / {biz.ordersTotal ?? 0} total
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: 'rgba(245, 158, 11, 0.1)',
                    color: '#f59e0b',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontWeight: '600'
                  }}
                >
                  <MessageSquare size={12} />
                  {biz.aiMessagesToday ?? 0} msj IA hoy ({biz.aiMessagesTotal ?? 0} total)
                </span>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Propietario</span>
                  <span style={{ fontSize: '13px', fontWeight: '600' }}>{biz.owner?.username || 'Sistema'}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => navigate(`/business/${biz._id}/orders`)}
                    className="btn-secondary"
                    style={{ padding: '10px 12px', fontSize: '13px' }}
                    title="Ver pedidos de este negocio"
                  >
                    <ShoppingBag size={15} /> Pedidos
                  </button>
                  <button 
                    type="button"
                    onClick={() => navigate(`/business/${biz._id}/branches`)} 
                    className="btn-primary" 
                    style={{ padding: '10px 16px' }}
                  >
                    Configurar <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <DashboardStatModal
        isOpen={Boolean(activeStatModal)}
        onClose={() => setActiveStatModal(null)}
        activeMetric={activeStatModal}
        stats={dashboardStats}
        navigate={navigate}
        userRole={user?.role}
        onEditBusiness={openEditModal}
      />

      <BusinessModal 
        key={selectedBusiness?._id || 'new'}
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        business={selectedBusiness}
        user={user}
        onSave={fetchData}
      />

      <UserModal 
        isOpen={isUserModalOpen} 
        onClose={() => setIsUserModalOpen(false)} 
        onSave={fetchData}
      />
    </>
  );
};

export default Dashboard;
