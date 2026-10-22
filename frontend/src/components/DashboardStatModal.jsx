import { useState } from 'react';
import {
  X,
  Building2,
  ShoppingBag,
  MessageSquare,
  TrendingUp,
  ArrowRight,
  MapPin,
  Bot,
  Clock,
  CheckCircle2,
  ExternalLink,
  Settings,
  User,
  DollarSign,
  Wifi,
  WifiOff
} from 'lucide-react';

const statusLabels = {
  pending: { label: 'Pendiente', color: '#f59e0b' },
  confirmed: { label: 'Confirmado', color: '#3b82f6' },
  preparing: { label: 'Preparando', color: '#8b5cf6' },
  ready: { label: 'Listo', color: '#10b981' },
  delivered: { label: 'Entregado', color: '#059669' },
  cancelled: { label: 'Cancelado', color: '#ef4444' }
};

const DashboardStatModal = ({ isOpen, onClose, activeMetric, stats, navigate, userRole, onEditBusiness }) => {
  const [subTab, setSubTab] = useState('breakdown'); // 'breakdown' | 'recent'

  if (!isOpen || !activeMetric || !stats) return null;

  const { summary = {}, businesses = [], recentOrders = [], recentConversations = [] } = stats;

  const modalConfig = {
    businesses: {
      title: 'Resumen de Negocios y Sucursales',
      subtitle: 'Estado operativo y sedes activas vinculadas a la plataforma',
      icon: <Building2 size={24} className="gradient-text" />,
      iconBg: 'rgba(99, 102, 241, 0.12)',
      primaryActionLabel: userRole === 'admin' ? 'Ir a Gestión de Negocios' : 'Ver Mis Sucursales',
      primaryActionPath: userRole === 'admin' ? '/businesses' : '/branches'
    },
    orders: {
      title: 'Desglose de Pedidos y Reservaciones',
      subtitle: 'Órdenes capturadas por los agentes IA en el día de hoy y acumulado histórico',
      icon: <ShoppingBag size={24} style={{ color: '#10b981' }} />,
      iconBg: 'rgba(16, 185, 129, 0.12)',
      primaryActionLabel: 'Ver Todos los Pedidos',
      primaryActionPath: '/orders'
    },
    messages: {
      title: 'Actividad de Mensajes IA y Conversaciones',
      subtitle: 'Interacciones atendidas automáticamente por los agentes en cada sucursal',
      icon: <MessageSquare size={24} style={{ color: '#f59e0b' }} />,
      iconBg: 'rgba(245, 158, 11, 0.12)',
      primaryActionLabel: 'Ir al Centro de Chats',
      primaryActionPath: '/chats'
    },
    conversion: {
      title: 'Embudo y Tasa de Conversión',
      subtitle: 'Relación entre conversaciones atendidas por la IA y pedidos/reservas concretados',
      icon: <TrendingUp size={24} style={{ color: '#8b5cf6' }} />,
      iconBg: 'rgba(139, 92, 246, 0.12)',
      primaryActionLabel: 'Ver Reporte de Comisiones y Ventas',
      primaryActionPath: '/reports/commissions'
    }
  };

  const currentConfig = modalConfig[activeMetric] || modalConfig.businesses;

  const handleNavigate = (path) => {
    onClose();
    navigate(path);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{
          maxWidth: '880px',
          width: '100%',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          border: '1px solid var(--border-color)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '22px 26px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: currentConfig.iconBg, padding: '12px', borderRadius: '14px', display: 'flex' }}>
              {currentConfig.icon}
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>{currentConfig.title}</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '3px 0 0 0' }}>
                {currentConfig.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle"
            className="btn-secondary"
            style={{ padding: '8px', borderRadius: '10px', flexShrink: 0 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: '24px 26px', overflowY: 'auto', flex: 1 }}>
          {/* 1. VISTA NEGOCIOS */}
          {activeMetric === 'businesses' && (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '14px',
                  marginBottom: '24px'
                }}
              >
                <div className="glass-card" style={{ padding: '14px 16px', boxShadow: 'none' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Negocios</span>
                  <h4 style={{ fontSize: '22px', fontWeight: '700', marginTop: '4px' }}>{summary.totalBusinesses}</h4>
                </div>
                <div className="glass-card" style={{ padding: '14px 16px', boxShadow: 'none' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Sucursales Activas</span>
                  <h4 style={{ fontSize: '22px', fontWeight: '700', marginTop: '4px', color: '#10b981' }}>
                    {summary.activeBranches} <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>/ {summary.totalBranches}</span>
                  </h4>
                </div>
                <div className="glass-card" style={{ padding: '14px 16px', boxShadow: 'none' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>WhatsApp Conectados</span>
                  <h4 style={{ fontSize: '22px', fontWeight: '700', marginTop: '4px', color: '#3b82f6' }}>
                    {summary.connectedBranches} <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>/ {summary.totalBranches}</span>
                  </h4>
                </div>
                <div className="glass-card" style={{ padding: '14px 16px', boxShadow: 'none' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Ventas Totales</span>
                  <h4 style={{ fontSize: '20px', fontWeight: '700', marginTop: '4px' }}>
                    ${(summary.salesTotal || 0).toLocaleString()}
                  </h4>
                </div>
              </div>

              <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '14px' }}>
                Detalle por Negocio ({businesses.length})
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {businesses.map((biz) => (
                  <div
                    key={biz._id}
                    className="glass-card"
                    style={{ padding: '18px', boxShadow: 'none', border: '1px solid var(--border-color)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <h4 style={{ fontSize: '17px', fontWeight: '700', margin: 0 }}>{biz.name}</h4>
                          <span className="badge badge-success" style={{ fontSize: '10px' }}>
                            Comisión: {biz.commission || 10}%
                          </span>
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          Propietario: <strong>{biz.owner?.username || 'Sistema'}</strong> · {biz.branchesCount} sucursal(es)
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {userRole === 'admin' && onEditBusiness && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onEditBusiness(biz);
                            }}
                            className="btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                          >
                            Editar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleNavigate(`/business/${biz._id}/orders`)}
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          <ShoppingBag size={14} /> Pedidos ({biz.ordersTotal})
                        </button>
                        <button
                          type="button"
                          onClick={() => handleNavigate(`/business/${biz._id}/branches`)}
                          className="btn-primary"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          Sucursales <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Lista rápida de sucursales del negocio */}
                    {biz.branches && biz.branches.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginTop: '10px' }}>
                        {biz.branches.map((br) => (
                          <div
                            key={br._id}
                            style={{
                              background: 'rgba(255, 255, 255, 0.03)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '10px',
                              padding: '10px 12px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <MapPin size={13} className="gradient-text" /> {br.name}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                {br.phone} · {br.ordersToday} pedidos hoy
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleNavigate(`/branch/${br._id}/ai-config`)}
                              className="btn-secondary"
                              style={{ padding: '5px 8px', fontSize: '11px' }}
                              title="Configurar IA y WhatsApp"
                            >
                              <Settings size={13} /> IA
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        Sin sucursales configuradas aún.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* 2. VISTA PEDIDOS HOY E HISTÓRICO */}
          {activeMetric === 'orders' && (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '14px',
                  marginBottom: '20px'
                }}
              >
                <div className="glass-card" style={{ padding: '14px 16px', boxShadow: 'none' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Pedidos Hoy</span>
                  <h4 style={{ fontSize: '22px', fontWeight: '700', marginTop: '4px', color: '#10b981' }}>
                    {summary.ordersToday}
                  </h4>
                </div>
                <div className="glass-card" style={{ padding: '14px 16px', boxShadow: 'none' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Ventas Hoy</span>
                  <h4 style={{ fontSize: '20px', fontWeight: '700', marginTop: '4px', color: '#10b981' }}>
                    ${(summary.salesToday || 0).toLocaleString()}
                  </h4>
                </div>
                <div className="glass-card" style={{ padding: '14px 16px', boxShadow: 'none' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Pedidos Históricos</span>
                  <h4 style={{ fontSize: '22px', fontWeight: '700', marginTop: '4px' }}>{summary.ordersTotal}</h4>
                </div>
                <div className="glass-card" style={{ padding: '14px 16px', boxShadow: 'none' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Ventas Históricas</span>
                  <h4 style={{ fontSize: '20px', fontWeight: '700', marginTop: '4px' }}>
                    ${(summary.salesTotal || 0).toLocaleString()}
                  </h4>
                </div>
              </div>

              {/* Sub-tabs */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
                <button
                  type="button"
                  onClick={() => setSubTab('breakdown')}
                  className={subTab === 'breakdown' ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '7px 14px', fontSize: '13px' }}
                >
                  Por Negocio / Sucursal
                </button>
                <button
                  type="button"
                  onClick={() => setSubTab('recent')}
                  className={subTab === 'recent' ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '7px 14px', fontSize: '13px' }}
                >
                  Últimos Pedidos ({recentOrders.length})
                </button>
              </div>

              {subTab === 'breakdown' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {businesses.map((biz) => (
                    <div
                      key={biz._id}
                      className="glass-card"
                      style={{ padding: '16px', boxShadow: 'none', border: '1px solid var(--border-color)' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                        <div>
                          <h4 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>{biz.name}</h4>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Hoy: <strong style={{ color: '#10b981' }}>{biz.ordersToday} pedidos (${(biz.salesToday || 0).toLocaleString()})</strong> · Histórico: <strong>{biz.ordersTotal} pedidos (${(biz.salesTotal || 0).toLocaleString()})</strong>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleNavigate(`/business/${biz._id}/orders`)}
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          Ver Pedidos <ArrowRight size={14} />
                        </button>
                      </div>

                      {biz.branches && biz.branches.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {biz.branches.map((br) => (
                            <div
                              key={br._id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '8px 12px',
                                background: 'rgba(255, 255, 255, 0.03)',
                                borderRadius: '8px',
                                fontSize: '13px'
                              }}
                            >
                              <span style={{ fontWeight: '500' }}>{br.name}</span>
                              <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
                                <span style={{ color: '#10b981', fontWeight: '600' }}>
                                  Hoy: {br.ordersToday} (${(br.salesToday || 0).toLocaleString()})
                                </span>
                                <span style={{ color: 'var(--text-secondary)' }}>
                                  Total: {br.ordersTotal} (${(br.salesTotal || 0).toLocaleString()})
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {recentOrders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                      No hay pedidos registrados todavía.
                    </div>
                  ) : (
                    recentOrders.map((order) => {
                      const st = statusLabels[order.status] || { label: order.status, color: '#9ca3af' };
                      return (
                        <div
                          key={order._id}
                          style={{
                            padding: '12px 16px',
                            borderRadius: '12px',
                            border: '1px solid var(--border-color)',
                            background: 'rgba(255, 255, 255, 0.02)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '12px'
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <strong style={{ fontSize: '14px' }}>{order.customerName}</strong>
                              <span
                                style={{
                                  fontSize: '10px',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  background: `${st.color}22`,
                                  color: st.color,
                                  fontWeight: '700',
                                  textTransform: 'uppercase'
                                }}
                              >
                                {st.label}
                              </span>
                              {order.isToday && (
                                <span className="badge badge-success" style={{ fontSize: '9px', padding: '2px 6px' }}>
                                  HOY
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                              {order.businessName} - {order.branchName} · {new Date(order.createdAt).toLocaleString()}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '16px', fontWeight: '700' }} className="gradient-text">
                              ${(order.total || 0).toLocaleString()}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {order.orderType === 'reservation' ? 'Reservación' : `${order.itemsCount} ítem(s)`}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </>
          )}

          {/* 3. VISTA MENSAJES IA */}
          {activeMetric === 'messages' && (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '14px',
                  marginBottom: '20px'
                }}
              >
                <div className="glass-card" style={{ padding: '14px 16px', boxShadow: 'none' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Mensajes IA Hoy</span>
                  <h4 style={{ fontSize: '22px', fontWeight: '700', marginTop: '4px', color: '#f59e0b' }}>
                    {summary.aiMessagesToday}
                  </h4>
                </div>
                <div className="glass-card" style={{ padding: '14px 16px', boxShadow: 'none' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Chats Activos Hoy</span>
                  <h4 style={{ fontSize: '22px', fontWeight: '700', marginTop: '4px', color: '#10b981' }}>
                    {summary.conversationsToday}
                  </h4>
                </div>
                <div className="glass-card" style={{ padding: '14px 16px', boxShadow: 'none' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Respuestas IA Totales</span>
                  <h4 style={{ fontSize: '22px', fontWeight: '700', marginTop: '4px' }}>
                    {summary.aiMessagesTotal}
                  </h4>
                </div>
                <div className="glass-card" style={{ padding: '14px 16px', boxShadow: 'none' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Conversaciones</span>
                  <h4 style={{ fontSize: '22px', fontWeight: '700', marginTop: '4px' }}>
                    {summary.conversationsTotal}
                  </h4>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
                <button
                  type="button"
                  onClick={() => setSubTab('breakdown')}
                  className={subTab === 'breakdown' ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '7px 14px', fontSize: '13px' }}
                >
                  Por Negocio / Sucursal
                </button>
                <button
                  type="button"
                  onClick={() => setSubTab('recent')}
                  className={subTab === 'recent' ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '7px 14px', fontSize: '13px' }}
                >
                  Conversaciones Recientes ({recentConversations.length})
                </button>
              </div>

              {subTab === 'breakdown' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {businesses.map((biz) => (
                    <div
                      key={biz._id}
                      className="glass-card"
                      style={{ padding: '16px', boxShadow: 'none', border: '1px solid var(--border-color)' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <h4 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>{biz.name}</h4>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Hoy: <strong style={{ color: '#f59e0b' }}>{biz.aiMessagesToday} msj IA</strong> en {biz.conversationsToday} chat(s) · Total histórico: <strong>{biz.aiMessagesTotal} msj IA</strong> en {biz.conversationsTotal} chat(s)
                          </span>
                        </div>
                      </div>

                      {biz.branches && biz.branches.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {biz.branches.map((br) => (
                            <div
                              key={br._id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '8px 12px',
                                background: 'rgba(255, 255, 255, 0.03)',
                                borderRadius: '8px',
                                fontSize: '13px',
                                flexWrap: 'wrap',
                                gap: '8px'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Bot size={15} className="gradient-text" />
                                <span style={{ fontWeight: '500' }}>{br.name}</span>
                              </div>
                              <div style={{ display: 'flex', gap: '14px', alignItems: 'center', fontSize: '12px' }}>
                                <span style={{ color: '#f59e0b', fontWeight: '600' }}>
                                  Hoy: {br.aiMessagesToday} msj ({br.conversationsToday} chats)
                                </span>
                                <span style={{ color: 'var(--text-secondary)' }}>
                                  Histórico: {br.aiMessagesTotal} msj ({br.conversationsTotal} chats)
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleNavigate(`/branch/${br._id}/ai-config`)}
                                  className="btn-secondary"
                                  style={{ padding: '4px 8px', fontSize: '11px' }}
                                >
                                  Configurar IA
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {recentConversations.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                      No hay conversaciones registradas todavía.
                    </div>
                  ) : (
                    recentConversations.map((conv) => (
                      <div
                        key={conv._id}
                        style={{
                          padding: '12px 16px',
                          borderRadius: '12px',
                          border: '1px solid var(--border-color)',
                          background: 'rgba(255, 255, 255, 0.02)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '12px',
                          flexWrap: 'wrap'
                        }}
                      >
                        <div style={{ flex: 1, minWidth: '220px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '14px' }}>{conv.customerName}</strong>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              ({conv.businessName} - {conv.branchName})
                            </span>
                            {conv.isToday && (
                              <span className="badge badge-success" style={{ fontSize: '9px', padding: '2px 6px' }}>
                                HOY
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            {conv.lastMessageRole === 'assistant' ? '🤖 IA: ' : '👤 Cliente: '}
                            {conv.lastMessagePreview || 'Sin mensajes'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '12px' }}>
                          <div style={{ fontWeight: '700', color: '#f59e0b' }}>
                            {conv.aiMessagesTotal} respuestas IA
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {conv.lastInteraction ? new Date(conv.lastInteraction).toLocaleString() : ''}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}

          {/* 4. VISTA CONVERSIÓN */}
          {activeMetric === 'conversion' && (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '14px',
                  marginBottom: '20px'
                }}
              >
                <div className="glass-card" style={{ padding: '14px 16px', boxShadow: 'none' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Conversión Hoy</span>
                  <h4 style={{ fontSize: '24px', fontWeight: '700', marginTop: '4px', color: '#8b5cf6' }}>
                    {summary.conversionToday}%
                  </h4>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {summary.ordersToday} pedidos / {summary.conversationsToday} chats hoy
                  </span>
                </div>
                <div className="glass-card" style={{ padding: '14px 16px', boxShadow: 'none' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Conversión Histórica</span>
                  <h4 style={{ fontSize: '24px', fontWeight: '700', marginTop: '4px', color: '#10b981' }}>
                    {summary.conversionTotal}%
                  </h4>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {summary.ordersTotal} pedidos / {summary.conversationsTotal} chats totales
                  </span>
                </div>
                <div className="glass-card" style={{ padding: '14px 16px', boxShadow: 'none' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Ticket Promedio</span>
                  <h4 style={{ fontSize: '22px', fontWeight: '700', marginTop: '4px' }}>
                    ${summary.ordersTotal > 0 ? Math.round(summary.salesTotal / summary.ordersTotal).toLocaleString() : 0}
                  </h4>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Por pedido concretado</span>
                </div>
                <div className="glass-card" style={{ padding: '14px 16px', boxShadow: 'none' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Ingresos Generados IA</span>
                  <h4 style={{ fontSize: '20px', fontWeight: '700', marginTop: '4px' }}>
                    ${(summary.salesTotal || 0).toLocaleString()}
                  </h4>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Hoy: ${(summary.salesToday || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '14px' }}>
                Rendimiento de Conversión por Negocio y Sucursal
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {businesses.map((biz) => (
                  <div
                    key={biz._id}
                    className="glass-card"
                    style={{ padding: '16px', boxShadow: 'none', border: '1px solid var(--border-color)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <h4 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>{biz.name}</h4>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {biz.conversationsTotal} conversaciones → {biz.ordersTotal} pedidos (${(biz.salesTotal || 0).toLocaleString()})
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>Hoy</span>
                          <strong style={{ fontSize: '15px', color: '#8b5cf6' }}>{biz.conversionToday}%</strong>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>Histórico</span>
                          <strong style={{ fontSize: '15px', color: '#10b981' }}>{biz.conversionTotal}%</strong>
                        </div>
                      </div>
                    </div>

                    {/* Barra de progreso visual */}
                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden', marginBottom: '12px' }}>
                      <div
                        style={{
                          width: `${Math.min(100, biz.conversionTotal || 0)}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #6366f1, #10b981)',
                          borderRadius: '99px',
                          transition: 'width 0.4s ease'
                        }}
                      />
                    </div>

                    {biz.branches && biz.branches.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {biz.branches.map((br) => (
                          <div
                            key={br._id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 12px',
                              background: 'rgba(255, 255, 255, 0.03)',
                              borderRadius: '8px',
                              fontSize: '12px',
                              flexWrap: 'wrap',
                              gap: '8px'
                            }}
                          >
                            <span style={{ fontWeight: '600' }}>{br.name}</span>
                            <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)' }}>
                              <span>Chats: <strong>{br.conversationsTotal}</strong></span>
                              <span>Pedidos: <strong>{br.ordersTotal}</strong></span>
                              <span style={{ color: '#8b5cf6', fontWeight: '600' }}>Hoy: {br.conversionToday}%</span>
                              <span style={{ color: '#10b981', fontWeight: '600' }}>Histórico: {br.conversionTotal}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 26px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          <button type="button" onClick={onClose} className="btn-secondary" style={{ padding: '10px 18px' }}>
            Cerrar
          </button>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {activeMetric === 'orders' && (
              <button
                type="button"
                onClick={() => handleNavigate('/orders?period=today')}
                className="btn-secondary"
                style={{ padding: '10px 16px' }}
              >
                Ver Solo Pedidos de Hoy
              </button>
            )}
            <button
              type="button"
              onClick={() => handleNavigate(currentConfig.primaryActionPath)}
              className="btn-primary"
              style={{ padding: '10px 18px' }}
            >
              {currentConfig.primaryActionLabel} <ExternalLink size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardStatModal;
