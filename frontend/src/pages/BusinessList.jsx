import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Plus, 
  Search,
  MoreVertical,
  ArrowRight,
  ExternalLink,
  Bot,
  Trash2
} from 'lucide-react';
import axios from 'axios';
import BusinessModal from '../components/BusinessModal';

const BusinessList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState(null);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const endpoint = user.role === 'admin' ? '/api/business' : '/api/business/me';
      const { data } = await axios.get(endpoint, config);
      setBusinesses(Array.isArray(data) ? data : [data]);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching businesses:', error);
      setLoading(false);
    }
  };

  const handleDeleteBusiness = async (id, name) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar el negocio "${name}"? Esta acción eliminará todas las sucursales y configuraciones de IA asociadas de forma permanente.`)) {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        await axios.delete(`/api/business/${id}`, config);
        alert('Negocio eliminado correctamente');
        fetchBusinesses();
      } catch (error) {
        console.error('Error deleting business:', error);
        alert(error.response?.data?.message || 'Error al eliminar el negocio');
      }
    }
  };

  if (loading) return <div>Cargando Negocios...</div>;

  return (
    <>
      <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Gestión de <span className="gradient-text">Negocios</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>Lista global de empresas vinculadas al sistema.</p>
        </div>
        {user.role === 'admin' && (
          <button onClick={() => { setSelectedBusiness(null); setIsModalOpen(true); }} className="btn-primary">
            <Plus size={18} /> Nuevo Negocio
          </button>
        )}
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '25px' }}>
        {businesses.map(biz => (
          <div key={biz._id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ background: 'var(--accent-soft)', padding: '12px', borderRadius: '15px' }}>
                  <Building2 className="gradient-text" size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px' }}>{biz.name}</h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>ID: {biz._id.slice(-6)}</span>
                </div>
              </div>
              {user.role === 'admin' ? (
                <button 
                  onClick={() => handleDeleteBusiness(biz._id, biz.name)}
                  className="btn-secondary" 
                  style={{ padding: '8px', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                  title="Eliminar Negocio"
                >
                  <Trash2 size={16} />
                </button>
              ) : (
                <button className="btn-secondary" style={{ padding: '8px' }}>
                  <MoreVertical size={16} />
                </button>
              )}
            </div>

            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', minHeight: '42px' }}>
              {biz.description || 'Sin descripción disponible para este negocio.'}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <div className="badge badge-success" style={{ fontSize: '10px' }}>Comisión: {biz.commission}%</div>
              <div className="badge badge-warning" style={{ fontSize: '10px' }}>Dueño: {biz.owner?.username || 'Sistema'}</div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => navigate(`/business/${biz._id}/branches`)}
                className="btn-primary" 
                style={{ flex: 1, padding: '10px' }}
              >
                Sucursales <ArrowRight size={16} />
              </button>
              <button 
                onClick={() => navigate(`/business/${biz._id}/orders`)}
                className="btn-secondary" 
                style={{ padding: '10px' }}
              >
                <ExternalLink size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <BusinessModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        business={selectedBusiness}
        user={user}
        onSave={fetchBusinesses}
      />
    </>
  );
};

export default BusinessList;
