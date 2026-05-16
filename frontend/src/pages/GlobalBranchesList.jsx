import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Search,
  Phone,
  Zap,
  Settings,
  MoreVertical,
  Building
} from 'lucide-react';
import axios from 'axios';

const GlobalBranchesList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      // Endpoint para obtener todas las sucursales del usuario
      const { data } = await axios.get('/api/branch', config); 
      setBranches(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching branches:', error);
      setLoading(false);
    }
  };

  if (loading) return <div>Cargando Sucursales...</div>;

  return (
    <>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Todas las <span className="gradient-text">Sucursales</span></h1>
        <p style={{ color: 'var(--text-secondary)' }}>Gestiona la conectividad y la IA de cada sede de forma individual.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '25px' }}>
        {branches.map(branch => (
          <div key={branch._id} className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>{branch.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <Building size={12} /> {branch.business?.name}
                </div>
              </div>
              <span className={`badge ${branch.isActive ? 'badge-success' : 'badge-danger'}`}>
                {branch.isActive ? 'Activa' : 'Inactiva'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '25px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                <Phone size={14} /> {branch.phone}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--accent-primary)', fontWeight: '600' }}>
                <Zap size={14} /> Meta ID: {branch.whatsappNumberId}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => navigate(`/branch/${branch._id}/ai-config`)}
                className="btn-primary" 
                style={{ flex: 1, padding: '10px' }}
              >
                <Settings size={16} /> Configurar IA
              </button>
              <button className="btn-secondary" style={{ padding: '10px' }}>
                <MoreVertical size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default GlobalBranchesList;
