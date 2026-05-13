import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  Plus, 
  MapPin, 
  Phone, 
  Zap,
  Settings,
  MoreVertical
} from 'lucide-react';
import axios from 'axios';
import BranchModal from '../components/BranchModal';

const BranchManagement = () => {
  const { businessId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchBranches();
    fetchBusinessDetails();
  }, [businessId]);

  const fetchBranches = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`/api/branch/business/${businessId}`, config);
      setBranches(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching branches:', error);
      setLoading(false);
    }
  };

  const fetchBusinessDetails = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`/api/business/${businessId}`, config);
      setBusiness(data);
    } catch (error) {
      console.error('Error fetching business details:', error);
    }
  };

  if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '100px' }}>Cargando Sucursales...</div>;

  return (
    <div className="container">
      <button onClick={() => navigate('/dashboard')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <ArrowLeft size={18} /> Volver al Panel
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h2 style={{ fontSize: '32px' }}>Sucursales de {business?.name}</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Gestiona los números de WhatsApp y la IA por cada sede</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> Nueva Sucursal
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '25px' }}>
        {branches.length === 0 ? (
          <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px' }}>
            <p>No hay sucursales configuradas para este negocio.</p>
            <button onClick={() => setIsModalOpen(true)} className="btn-primary" style={{ marginTop: '20px' }}>Configurar Primera Sucursal</button>
          </div>
        ) : (
          branches.map((branch) => (
            <div key={branch._id} className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '20px' }}>{branch.name}</h3>
                <span style={{ 
                  background: branch.isActive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                  color: branch.isActive ? '#22c55e' : '#ef4444',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {branch.isActive ? 'Activa' : 'Inactiva'}
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '25px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  <MapPin size={16} /> {branch.address?.city || 'Sin dirección'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  <Phone size={16} /> {branch.phone}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-primary)', fontSize: '14px', fontWeight: '600' }}>
                  <Zap size={16} /> ID Meta: {branch.whatsappNumberId}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => navigate(`/branch/${branch._id}/ai-config`)}
                  className="btn-primary" 
                  style={{ flex: 1, fontSize: '14px' }}
                >
                  <Settings size={16} style={{ marginRight: '8px' }} /> Configurar IA
                </button>
                <button className="btn-secondary" style={{ padding: '10px' }}>
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <BranchModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        businessId={businessId}
        user={user}
        onSave={fetchBranches}
      />
    </div>
  );
};

export default BranchManagement;
