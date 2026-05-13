import { useState } from 'react';
import { X, UserPlus, Save, Lock, User } from 'lucide-react';
import axios from 'axios';

const UserModal = ({ isOpen, onClose, onSave, adminToken }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'client'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Usamos la ruta de registro existente, pero desde la sesión de admin
      await axios.post('/api/auth/register', formData);
      onSave();
      onClose();
      setFormData({ username: '', password: '', role: 'client' }); // Limpiar
    } catch (error) {
      alert(error.response?.data?.message || 'Error al crear el usuario');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="glass-card modal-content" style={{ maxWidth: '400px', width: '90%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <UserPlus className="gradient-text" /> Nuevo Cliente
          </h2>
          <button onClick={onClose} className="btn-secondary" style={{ padding: '5px', borderRadius: '50%' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label><User size={14} /> Nombre de Usuario</label>
            <input 
              type="text" 
              placeholder="Ej: pizzeriagusto"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              required 
            />
          </div>

          <div className="form-group">
            <label><Lock size={14} /> Contraseña Inicial</label>
            <input 
              type="password" 
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required 
            />
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '5px' }}>
              Dale esta contraseña al cliente para su primer acceso.
            </p>
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
            {loading ? 'Creando...' : 'Crear Usuario Cliente'}
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
          z-index: 1100;
        }
        .form-group { margin-bottom: 20px; }
        label { display: flex; align-items: center; gap: 8px; font-size: 14px; margin-bottom: 8px; font-weight: 600; color: var(--text-secondary); }
        input { width: 100%; padding: 12px; border-radius: 10px; border: 1px solid var(--border-color); background: rgba(255,255,255,0.05); color: var(--text-primary); }
      `}</style>
    </div>
  );
};

export default UserModal;
