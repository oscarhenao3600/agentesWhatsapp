import { useState, useEffect } from 'react';
import { X, Save, Bot, User, Phone, Hash } from 'lucide-react';
import axios from 'axios';

const BusinessModal = ({ isOpen, onClose, business, user, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    commission: 10,
    ownerId: ''
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (business) {
      setFormData({
        name: business.name || '',
        description: business.description || '',
        commission: business.commission || 10,
        ownerId: business.owner?._id || business.owner || ''
      });
    } else {
      setFormData({
        name: '',
        description: '',
        commission: 10,
        ownerId: ''
      });
    }

    if (isOpen && user?.role === 'admin') {
      fetchUsers();
    }
  }, [business, isOpen, user]);

  const fetchUsers = async () => {
    try {
      const config = {
        headers: { Authorization: `Bearer ${user.token}` }
      };
      const { data } = await axios.get('/api/auth/users', config);
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const config = {
        headers: { Authorization: `Bearer ${user.token}` }
      };

      if (business) {
        await axios.put(`/api/business/${business._id}`, formData, config);
      } else {
        await axios.post('/api/business', formData, config);
      }

      onSave();
      onClose();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al guardar el negocio');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="glass-card modal-content" style={{ maxWidth: '600px', width: '90%', padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <Bot className="gradient-text" /> 
            {business ? 'Editar Negocio' : 'Nuevo Negocio'}
          </h2>
          <button onClick={onClose} className="btn-secondary" style={{ padding: '5px', borderRadius: '50%' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label><User size={14} /> Nombre del Negocio</label>
            <input 
              type="text" 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              placeholder="Ej: Hotel Paraíso"
              required 
            />
          </div>

          <div className="form-group">
            <label><Hash size={14} /> Comisión (%)</label>
            <input 
              type="number" 
              name="commission" 
              value={formData.commission} 
              onChange={handleChange} 
              disabled={user?.role !== 'admin'}
              required 
            />
          </div>

          {user?.role === 'admin' && !business && (
            <div className="form-group">
              <label><User size={14} /> Cliente Propietario</label>
              <select name="ownerId" value={formData.ownerId} onChange={handleChange} required>
                <option value="">Selecciona un cliente...</option>
                {users.map(u => (
                  <option key={u._id} value={u._id}>{u.username}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label><Bot size={14} /> Descripción del Negocio</label>
            <textarea 
              name="description" 
              value={formData.description} 
              onChange={handleChange} 
              placeholder="Describe brevemente el negocio..."
              rows="3"
            />
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }} disabled={loading}>
            <Save size={18} /> {loading ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </form>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(5px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          padding: 20px;
        }
        .modal-content {
          animation: slideUp 0.3s ease-out;
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .form-group {
          margin-bottom: 20px;
        }
        label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          margin-bottom: 8px;
          font-weight: 600;
          color: var(--text-secondary);
        }
        input, textarea, select {
          width: 100%;
          padding: 12px;
          border-radius: 10px;
          border: 1px solid var(--border-color);
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
          font-size: 15px;
          transition: all 0.2s;
        }
        input:focus, textarea:focus, select:focus {
          outline: none;
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
        }
        textarea {
          resize: vertical;
        }
        select option {
          background: #1e1e1e;
          color: white;
        }
      `}</style>
    </div>
  );
};

export default BusinessModal;
