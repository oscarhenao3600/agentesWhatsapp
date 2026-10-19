import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  MapPin, 
  DollarSign, 
  Calendar,
  CheckCircle2,
  Filter,
  ShoppingBag
} from 'lucide-react';

const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0
});

const formatCurrency = (value) => copFormatter.format(value || 0);

const CommissionFilters = ({ filters, businesses, branches, onFilterChange }) => (
  <div className="glass-card" style={{ marginBottom: '30px', display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
    <div>
      <label htmlFor="comm-filter-business" style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Negocio</label>
      <div style={{ position: 'relative' }}>
        <Building2 size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-secondary)' }} />
        <select 
          id="comm-filter-business"
          name="businessId" 
          className="input-field" 
          style={{ paddingLeft: '35px', minWidth: '150px' }}
          value={filters.businessId}
          onChange={onFilterChange}
        >
          <option value="">Todos los Negocios</option>
          {businesses.map(b => (
            <option key={b._id} value={b._id}>{b.name}</option>
          ))}
        </select>
      </div>
    </div>

    <div>
      <label htmlFor="comm-filter-branch" style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Sucursal</label>
      <div style={{ position: 'relative' }}>
        <MapPin size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-secondary)' }} />
        <select 
          id="comm-filter-branch"
          name="branchId" 
          className="input-field" 
          style={{ paddingLeft: '35px', minWidth: '150px' }}
          value={filters.branchId}
          onChange={onFilterChange}
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
      <label htmlFor="comm-filter-status" style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Estado</label>
      <div style={{ position: 'relative' }}>
        <Filter size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-secondary)' }} />
        <select 
          id="comm-filter-status"
          name="status" 
          className="input-field" 
          style={{ paddingLeft: '35px', minWidth: '150px' }}
          value={filters.status}
          onChange={onFilterChange}
        >
          <option value="pending">Pendientes de Pago</option>
          <option value="paid">Pagadas</option>
          <option value="all">Todas</option>
        </select>
      </div>
    </div>

    <div>
      <label htmlFor="comm-filter-start" style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Desde</label>
      <div style={{ position: 'relative' }}>
        <Calendar size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-secondary)' }} />
        <input 
          id="comm-filter-start"
          type="date" 
          name="startDate" 
          className="input-field" 
          style={{ paddingLeft: '35px' }}
          value={filters.startDate}
          onChange={onFilterChange}
        />
      </div>
    </div>

    <div>
      <label htmlFor="comm-filter-end" style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Hasta</label>
      <div style={{ position: 'relative' }}>
        <Calendar size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-secondary)' }} />
        <input 
          id="comm-filter-end"
          type="date" 
          name="endDate" 
          className="input-field" 
          style={{ paddingLeft: '35px' }}
          value={filters.endDate}
          onChange={onFilterChange}
        />
      </div>
    </div>
  </div>
);

const CommissionBusinessCard = ({ business, userRole, filterStatus, markingPaid, onMarkAsPaid }) => (
  <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
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
          {userRole === 'admin' && (
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
        {userRole === 'admin' && filterStatus === 'pending' && business.totalCommission > 0 && (
          <button 
            type="button"
            className="btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '6px', height: 'fit-content' }}
            onClick={() => onMarkAsPaid(business.businessId, null)}
            disabled={markingPaid}
          >
            <CheckCircle2 size={16} /> Saldar Negocio
          </button>
        )}
      </div>
    </div>

    <div style={{ padding: '20px' }}>
      <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '1px', marginBottom: '15px' }}>
        Desglose por Sucursal
      </h3>
      
      <div style={{ display: 'grid', gap: '15px' }}>
        {business.branches.map((branch) => (
          <div key={branch.branchId} className="branch-commission-row">
            <div className="branch-name-col">
              <MapPin size={16} style={{ color: 'var(--accent-secondary)' }} />
              <span>{branch.branchName}</span>
            </div>
            
            <div>
              <span className="mobile-label">Pedidos</span>
              <div style={{ fontWeight: '600' }}>{branch.totalOrders}</div>
            </div>

            {userRole === 'admin' ? (
              <div>
                <span className="mobile-label">Ventas Generadas</span>
                <div style={{ fontWeight: '600' }}>{formatCurrency(branch.totalSales)}</div>
              </div>
            ) : <div></div>}

            <div>
              <span className="mobile-label">
                Comisión {filterStatus === 'paid' ? 'Pagada' : 'Pendiente'}
              </span>
              <div style={{ fontWeight: 'bold', color: filterStatus === 'paid' ? '#10b981' : '#f59e0b' }}>
                {formatCurrency(branch.totalCommission)}
              </div>
            </div>

            <div className="action-col">
              {userRole === 'admin' && filterStatus === 'pending' && branch.totalCommission > 0 && (
                <button 
                  type="button"
                  className="btn-secondary" 
                  style={{ padding: '6px 12px', fontSize: '13px' }}
                  onClick={() => onMarkAsPaid(business.businessId, branch.branchId)}
                  disabled={markingPaid}
                >
                  Saldar Sede
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const CommissionsReport = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: 'pending',
    businessId: '',
    branchId: ''
  });
  const [markingPaid, setMarkingPaid] = useState(false);

  const fetchReports = useCallback(async (activeFilters) => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      let queryParams = `?status=${activeFilters.status}`;
      if (activeFilters.startDate) queryParams += `&startDate=${activeFilters.startDate}`;
      if (activeFilters.endDate) queryParams += `&endDate=${activeFilters.endDate}`;
      if (activeFilters.businessId) queryParams += `&businessId=${activeFilters.businessId}`;
      if (activeFilters.branchId) queryParams += `&branchId=${activeFilters.branchId}`;

      const { data } = await axios.get(`/api/reports/commissions${queryParams}`, config);
      setReports(data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  useEffect(() => {
    if (!user?.token) return;
    let ignore = false;
    const config = { headers: { Authorization: `Bearer ${user.token}` } };
    const endpoint = user.role === 'admin' ? '/api/business' : '/api/business/me';

    axios
      .get(endpoint, config)
      .then(({ data }) => {
        if (ignore) return;
        const list = Array.isArray(data) ? data : [data];
        setBusinesses(list);
        if (list.length > 0 && list[0]?._id) {
          const initialBizId = list[0]._id;
          setFilters((prev) => ({ ...prev, businessId: initialBizId }));
          axios
            .get(`/api/branch/business/${initialBizId}`, config)
            .then((branchRes) => {
              if (!ignore) setBranches(branchRes.data);
            })
            .catch((err) => {
              if (!ignore) console.error('Error fetching branches:', err);
            });
        }
      })
      .catch((error) => {
        if (!ignore) console.error('Error fetching businesses:', error);
      });

    return () => {
      ignore = true;
    };
  }, [user?.token, user?.role]);

  useEffect(() => {
    if (!user?.token) return;
    let ignore = false;
    setLoading(true);
    const config = { headers: { Authorization: `Bearer ${user.token}` } };
    let queryParams = `?status=${filters.status}`;
    if (filters.startDate) queryParams += `&startDate=${filters.startDate}`;
    if (filters.endDate) queryParams += `&endDate=${filters.endDate}`;
    if (filters.businessId) queryParams += `&businessId=${filters.businessId}`;
    if (filters.branchId) queryParams += `&branchId=${filters.branchId}`;

    axios
      .get(`/api/reports/commissions${queryParams}`, config)
      .then(({ data }) => {
        if (!ignore) {
          setReports(data);
          setLoading(false);
        }
      })
      .catch((error) => {
        if (!ignore) {
          console.error('Error fetching reports:', error);
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [filters, user?.token]);

  const handleFilterChange = async (e) => {
    const { name, value } = e.target;
    if (name === 'businessId') {
      setFilters((prev) => ({ ...prev, businessId: value, branchId: '' }));
      if (value && user?.token) {
        try {
          const config = { headers: { Authorization: `Bearer ${user.token}` } };
          const { data } = await axios.get(`/api/branch/business/${value}`, config);
          setBranches(data);
        } catch (error) {
          console.error('Error fetching branches:', error);
        }
      } else {
        setBranches([]);
      }
    } else {
      setFilters((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleMarkAsPaid = async (businessId, branchId = null) => {
    if (markingPaid) return;
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
      fetchReports(filters);
    } catch (error) {
      console.error('Error marking as paid:', error);
      alert('Error al marcar como pagado');
    } finally {
      setMarkingPaid(false);
    }
  };

  return (
    <div className="container" style={{ paddingBottom: '40px' }}>
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: '28px', mdFontSize: '32px', marginBottom: '8px' }}>
            Reportes y <span className="gradient-text">Comisiones</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {user?.role === 'admin' 
              ? 'Monitorea las ventas y gestiona los cobros de comisiones de todos los negocios.' 
              : 'Revisa el rendimiento de tus sucursales y las comisiones pendientes.'}
          </p>
        </div>
      </div>

      <CommissionFilters 
        filters={filters}
        businesses={businesses}
        branches={branches}
        onFilterChange={handleFilterChange}
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Cargando reportes...</div>
      ) : reports.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          No se encontraron pedidos con estos filtros.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          {reports.map((business) => (
            <CommissionBusinessCard 
              key={business.businessId}
              business={business}
              userRole={user?.role}
              filterStatus={filters.status}
              markingPaid={markingPaid}
              onMarkAsPaid={handleMarkAsPaid}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommissionsReport;

