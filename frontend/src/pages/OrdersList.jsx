import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  ShoppingBag, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Truck,
  User,
  Phone,
  MapPin
} from 'lucide-react';
import axios from 'axios';

const OrdersList = () => {
  const { businessId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, [businessId]);

  const fetchOrders = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`/api/order/business/${businessId}`, config);
      setOrders(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setLoading(false);
    }
  };

  const updateStatus = async (orderId, newStatus) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.put(`/api/order/${orderId}/status`, { status: newStatus }, config);
      fetchOrders();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'confirmed': return '#3b82f6';
      case 'preparing': return '#8b5cf6';
      case 'ready': return '#10b981';
      case 'delivered': return '#059669';
      case 'cancelled': return '#ef4444';
      default: return 'var(--text-secondary)';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock size={16} />;
      case 'confirmed': return <CheckCircle2 size={16} />;
      case 'preparing': return <Truck size={16} />;
      case 'ready': return <CheckCircle2 size={16} />;
      case 'delivered': return <CheckCircle2 size={16} />;
      case 'cancelled': return <XCircle size={16} />;
      default: return null;
    }
  };

  if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '100px' }}>Cargando Pedidos...</div>;

  return (
    <div className="container">
      <button onClick={() => navigate(-1)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <ArrowLeft size={18} /> Volver
      </button>

      <div className="page-header">
        <div>
          <h2 style={{ fontSize: '28px', mdFontSize: '32px' }}>Pedidos y Reservaciones</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Gestiona los pedidos y reservas capturados automáticamente por la IA</p>
        </div>
        <div className="page-header-actions">
          <div className="glass-card" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: 'none' }}>
            <ShoppingBag className="gradient-text" />
            <strong>{orders.length} Totales</strong>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {orders.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '50px' }}>
            <p>Aún no se han registrado pedidos en esta sucursal.</p>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order._id} className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
                {/* Info Cliente y Estado */}
                <div style={{ flex: '1', minWidth: '250px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                    <div style={{ 
                      background: getStatusColor(order.status) + '22', 
                      color: getStatusColor(order.status),
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      textTransform: 'uppercase'
                    }}>
                      {getStatusIcon(order.status)} {order.status}
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {new Date(order.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
                      <Phone size={16} /> {order.customerPhone}
                    </div>
                    {order.deliveryAddress && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                        <MapPin size={16} /> {order.deliveryAddress}
                      </div>
                    )}
                    <div style={{ fontSize: '13px', color: 'var(--accent-primary)', fontWeight: '600' }}>
                      Sucursal: {order.branch?.name}
                    </div>
                  </div>
                </div>

                {/* Detalle Productos o Reservación */}
                <div className="order-details-col">
                  {order.orderType === 'reservation' ? (
                    <div>
                      <h4 style={{ marginBottom: '15px', fontSize: '16px', color: 'var(--accent-primary)', fontWeight: '700' }}>Detalles de Reservación</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '15px', fontSize: '14px', marginBottom: '15px' }}>
                        <div>
                          <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px' }}>Check-In</span>
                          <strong style={{ fontSize: '14px' }}>{order.checkIn ? new Date(order.checkIn).toLocaleString() : 'No especificado'}</strong>
                        </div>
                        <div>
                          <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px' }}>Check-Out</span>
                          <strong style={{ fontSize: '14px' }}>{order.checkOut ? new Date(order.checkOut).toLocaleString() : 'No especificado'}</strong>
                        </div>
                        <div>
                          <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px' }}>Huéspedes</span>
                          <strong style={{ fontSize: '14px' }}>{order.guestsCount || 1} Persona(s)</strong>
                        </div>
                        <div>
                          <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px' }}>Tipo de Habitación / Glamping</span>
                          <strong style={{ fontSize: '14px', color: 'var(--accent-secondary)' }}>{order.roomType || 'Habitación Standard'}</strong>
                        </div>
                      </div>
                      
                      {order.notes && (
                        <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '8px', borderLeft: '3px solid var(--accent-primary)', marginBottom: '15px', fontSize: '13px' }}>
                          <span style={{ display: 'block', fontWeight: '600', marginBottom: '2px', color: 'var(--text-secondary)' }}>Observaciones:</span>
                          {order.notes}
                        </div>
                      )}
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border-color)', paddingTop: '12px' }}>
                        <span style={{ fontWeight: '700', fontSize: '16px' }}>VALOR TOTAL</span>
                        <span style={{ fontWeight: '700', fontSize: '18px' }} className="gradient-text">
                          ${order.total?.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h4 style={{ marginBottom: '10px', fontSize: '16px' }}>Detalle del Pedido</h4>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', fontSize: '14px', minWidth: '250px' }}>
                          <thead>
                            <tr style={{ color: 'var(--text-secondary)', textAlign: 'left' }}>
                              <th>Producto</th>
                              <th>Cant.</th>
                              <th style={{ textAlign: 'right' }}>Precio</th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.items.map((item, i) => (
                              <tr key={i}>
                                <td style={{ padding: '4px 0' }}>{item.name}</td>
                                <td>x{item.quantity}</td>
                                <td style={{ textAlign: 'right' }}>${item.price?.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td colSpan="2" style={{ paddingTop: '15px', fontWeight: '700', fontSize: '16px' }}>TOTAL</td>
                              <td style={{ paddingTop: '15px', textAlign: 'right', fontWeight: '700', fontSize: '18px' }} className="gradient-text">
                                ${order.total?.toLocaleString()}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'center', minWidth: '150px' }}>
                  <select 
                    className="input-field" 
                    style={{ padding: '8px', fontSize: '13px' }}
                    value={order.status}
                    onChange={(e) => updateStatus(order._id, e.target.value)}
                  >
                    <option value="pending">Pendiente</option>
                    <option value="confirmed">Confirmado</option>
                    <option value="preparing">Preparando</option>
                    <option value="ready">Listo</option>
                    <option value="delivered">Entregado</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};

export default OrdersList;
