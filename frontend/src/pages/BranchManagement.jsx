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
  MoreVertical,
  Trash2
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

  const handleDeleteBranch = async (id, name) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar la sucursal "${name}"?`)) {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        await axios.delete(`/api/branch/${id}`, config);
        alert('Sucursal eliminada correctamente');
        fetchBranches();
      } catch (error) {
        console.error('Error deleting branch:', error);
        alert(error.response?.data?.message || 'Error al eliminar la sucursal');
      }
    }
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: '100px' }}>Cargando Sucursales...</div>;

  return (
    <>
      <button onClick={() => navigate('/dashboard')} className="btn-secondary" style={{ marginBottom: '20px' }}>
        <ArrowLeft size={18} /> Volver al Panel
      </button>

      <div className="page-header">
        <div>
          <h2 style={{ fontSize: '28px', mdFontSize: '32px' }}>Sucursales de {business?.name}</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Gestiona los números de WhatsApp y la IA por cada sede</p>
        </div>
        <div className="page-header-actions">
          <button onClick={() => setIsModalOpen(true)} className="btn-primary">
            <Plus size={18} /> Nueva Sucursal
          </button>
        </div>
      </div>

      <div className="responsive-grid">
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
                <button 
                  onClick={() => handleDeleteBranch(branch._id, branch.name)}
                  className="btn-secondary" 
                  style={{ padding: '10px', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                  title="Eliminar Sucursal"
                >
                  <Trash2 size={18} />
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
    </>
  );
};

export default BranchManagement;
