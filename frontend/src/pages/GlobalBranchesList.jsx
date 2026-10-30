import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
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
    if (!user?.token) return;
    let ignore = false;
    const config = { headers: { Authorization: `Bearer ${user.token}` } };

    axios
      .get('/api/branch', config)
      .then(({ data }) => {
        if (!ignore) {
          setBranches(data);
          setLoading(false);
        }
      })
      .catch((error) => {
        if (!ignore) {
          console.error('Error fetching branches:', error);
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [user?.token]);

  if (loading) return <div>Cargando Sucursales...</div>;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: '28px', mdFontSize: '32px', marginBottom: '8px' }}>Todas las <span className="gradient-text">Sucursales</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>Gestiona la conectividad y la IA de cada sede de forma individual.</p>
        </div>
      </div>

      <div className="responsive-grid">
        {branches.map(branch => (
          <div key={branch._id} className="glass-card" style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '20px' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h3 style={{ fontSize: '18px', marginBottom: '4px', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{branch.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', wordBreak: 'break-word' }}>
                  <Building size={12} style={{ flexShrink: 0 }} /> {branch.business?.name}
                </div>
              </div>
              <span className={`badge ${branch.isActive ? 'badge-success' : 'badge-danger'}`} style={{ flexShrink: 0 }}>
                {branch.isActive ? 'Activa' : 'Inactiva'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '25px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                <Phone size={14} style={{ flexShrink: 0 }} /> {branch.phone}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--accent-primary)', fontWeight: '600', wordBreak: 'break-all' }}>
                <Zap size={14} style={{ flexShrink: 0 }} /> Meta ID: {branch.whatsappNumberId}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="button"
                onClick={() => navigate(`/branch/${branch._id}/ai-config`)}
                className="btn-primary" 
                style={{ flex: 1, padding: '10px' }}
              >
                <Settings size={16} /> Configurar IA
              </button>
              <button type="button" className="btn-secondary" style={{ padding: '10px' }} aria-label={`Opciones de ${branch.name}`}>
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
