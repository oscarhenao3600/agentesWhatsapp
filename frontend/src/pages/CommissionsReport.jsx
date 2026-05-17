import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  MapPin, 
  DollarSign, 
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  ShoppingBag
} from 'lucide-react';

const CommissionsReport = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: 'pending', // pending, paid, all
    businessId: '',
    branchId: ''
  });
  const [markingPaid, setMarkingPaid] = useState(false);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  useEffect(() => {
    if (filters.businessId) {
      fetchBranches(filters.businessId);
    } else {
      setBranches([]);
      setFilters(prev => ({ ...prev, branchId: '' }));
    }
  }, [filters.businessId]);

  useEffect(() => {
    fetchReports();
  }, [filters]);

  const fetchBusinesses = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const endpoint = user.role === 'admin' ? '/api/business' : '/api/business/me';
      const { data } = await axios.get(endpoint, config);
      setBusinesses(data);
    } catch (error) {
      console.error('Error fetching businesses:', error);
    }
  };

  const fetchBranches = async (businessId) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`/api/branch/business/${businessId}`, config);
      setBranches(data);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      let queryParams = `?status=${filters.status}`;
      if (filters.startDate) queryParams += `&startDate=${filters.startDate}`;
      if (filters.endDate) queryParams += `&endDate=${filters.endDate}`;
      if (filters.businessId) queryParams += `&businessId=${filters.businessId}`;
      if (filters.branchId) queryParams += `&branchId=${filters.branchId}`;

      const { data } = await axios.get(`/api/reports/commissions${queryParams}`, config);
      setReports(data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleMarkAsPaid = async (businessId, branchId = null) => {
    if (!window.confirm('¿Estás seguro de marcar estas comisiones como pagadas? Esta acción actualizará el estado de los pedidos filtrados actualmente.')) return;
    
    setMarkingPaid(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const payload = {
        businessId: branchId ? null : businessId,
        branchId: branchId,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined
      };

      const { data } = await axios.put('/api/reports/commissions/mark-paid', payload, config);
      alert(`Éxito: ${data.message} (${data.modifiedCount} pedidos actualizados)`);
      fetchReports(); // Recargar datos
    } catch (error) {
      console.error('Error marking as paid:', error);
      alert('Error al marcar como pagado');
    } finally {
      setMarkingPaid(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);
  };

  return (
    <div className="container" style={{ paddingBottom: '40px' }}>
      <header style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>
          Reportes y <span className="gradient-text">Comisiones</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          {user?.role === 'admin' 
            ? 'Monitorea las ventas y gestiona los cobros de comisiones de todos los negocios.' 
            : 'Revisa el rendimiento de tus sucursales y las comisiones pendientes.'}
        </p>
      </header>

      {/* Filtros */}
      <div className="glass-card" style={{ marginBottom: '30px', display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Negocio</label>
          <div style={{ position: 'relative' }}>
            <Building2 size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-secondary)' }} />
            <select 
              name="businessId" 
              className="input-field" 
              style={{ paddingLeft: '35px', minWidth: '150px' }}
              value={filters.businessId}
              onChange={handleFilterChange}
            >
              <option value="">Todos los Negocios</option>
              {businesses.map(b => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Sucursal</label>
          <div style={{ position: 'relative' }}>
            <MapPin size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-secondary)' }} />
            <select 
              name="branchId" 
              className="input-field" 
              style={{ paddingLeft: '35px', minWidth: '150px' }}
              value={filters.branchId}
              onChange={handleFilterChange}
              disabled={!filters.businessId}
            >
              <option value="">Todas las Sucursales</option>
              {branches.map(b => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Estado</label>
          <div style={{ position: 'relative' }}>
            <Filter size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-secondary)' }} />
            <select 
              name="status" 
              className="input-field" 
              style={{ paddingLeft: '35px', minWidth: '150px' }}
              value={filters.status}
              onChange={handleFilterChange}
            >
              <option value="pending">Pendientes de Pago</option>
              <option value="paid">Pagadas</option>
              <option value="all">Todas</option>
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Desde</label>
          <div style={{ position: 'relative' }}>
            <Calendar size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-secondary)' }} />
            <input 
              type="date" 
              name="startDate" 
              className="input-field" 
              style={{ paddingLeft: '35px' }}
              value={filters.startDate}
              onChange={handleFilterChange}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Hasta</label>
          <div style={{ position: 'relative' }}>
            <Calendar size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-secondary)' }} />
            <input 
              type="date" 
              name="endDate" 
              className="input-field" 
              style={{ paddingLeft: '35px' }}
              value={filters.endDate}
              onChange={handleFilterChange}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Cargando reportes...</div>
      ) : reports.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          No se encontraron pedidos con estos filtros.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          {reports.map((business) => (
            <div key={business.businessId} className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
              {/* Header del Negocio */}
              <div style={{ 
                padding: '20px', 
                background: 'rgba(255,255,255,0.02)', 
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '15px'
              }}>
                <div>
                  <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '20px', marginBottom: '8px' }}>
                    <Building2 className="gradient-text" /> {business.businessName}
                  </h2>
                  <div style={{ display: 'flex', gap: '20px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <ShoppingBag size={14} /> Totales: {business.totalOrders}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <DollarSign size={14} /> Ventas: {formatCurrency(business.totalSales)}
                    </span>
                    {user?.role === 'admin' && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--accent-primary)', fontWeight: '600' }}>
                        % Comisión: {business.commissionRate}%
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Comisión</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--accent-primary)' }}>
                      {formatCurrency(business.totalCommission)}
                    </div>
                  </div>
                  {user?.role === 'admin' && filters.status === 'pending' && business.totalCommission > 0 && (
                    <button 
                      className="btn-primary" 
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', height: 'fit-content' }}
                      onClick={() => handleMarkAsPaid(business.businessId, null)}
                      disabled={markingPaid}
                    >
                      <CheckCircle2 size={16} /> Saldar Negocio
                    </button>
                  )}
                </div>
              </div>

              {/* Lista de Sucursales */}
              <div style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '1px', marginBottom: '15px' }}>
                  Desglose por Sucursal
                </h3>
                
                <div style={{ display: 'grid', gap: '15px' }}>
                  {business.branches.map((branch) => (
                    <div key={branch.branchId} style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '2fr 1fr 1fr 1fr auto', 
                      gap: '15px',
                      alignItems: 'center',
                      padding: '15px',
                      background: 'rgba(0,0,0,0.1)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '500' }}>
                        <MapPin size={16} style={{ color: 'var(--accent-secondary)' }} />
                        {branch.branchName}
                      </div>
                      
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Pedidos</div>
                        <div style={{ fontWeight: '600' }}>{branch.totalOrders}</div>
                      </div>

                      {/* El cliente solo ve detalles básicos, el admin ve ventas totales */}
                      {user?.role === 'admin' ? (
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Ventas Generadas</div>
                          <div style={{ fontWeight: '600' }}>{formatCurrency(branch.totalSales)}</div>
                        </div>
                      ) : <div></div>}

                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          Comisión {filters.status === 'paid' ? 'Pagada' : 'Pendiente'}
                        </div>
                        <div style={{ fontWeight: 'bold', color: filters.status === 'paid' ? '#10b981' : '#f59e0b' }}>
                          {formatCurrency(branch.totalCommission)}
                        </div>
                      </div>

                      {user?.role === 'admin' && filters.status === 'pending' && branch.totalCommission > 0 && (
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '6px 12px', fontSize: '13px' }}
                          onClick={() => handleMarkAsPaid(business.businessId, branch.branchId)}
                          disabled={markingPaid}
                        >
                          Saldar Sede
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CommissionsReport;
