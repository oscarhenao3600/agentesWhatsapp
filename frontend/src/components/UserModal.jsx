import { useState, useEffect, useRef } from 'react';
import { X, UserPlus, Lock, User, Shield, Save } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const UserModal = ({ isOpen, onClose, onSave, editingUser = null }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'client',
    active: true
  });
  const [loading, setLoading] = useState(false);
  const reqIdRef = useRef(0);

  useEffect(() => {
    if (isOpen) {
      if (editingUser) {
        setFormData({
          username: editingUser.username || '',
          password: '',
          role: editingUser.role || 'client',
          active: editingUser.active !== false
        });
      } else {
        setFormData({
          username: '',
          password: '',
          role: 'client',
          active: true
        });
      }
    }
  }, [isOpen, editingUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    const currentReqId = ++reqIdRef.current;
    setLoading(true);
    try {
      const config = user?.token ? { headers: { Authorization: `Bearer ${user.token}` } } : {};

      if (editingUser) {
        const payload = {
          username: formData.username,
          role: formData.role,
          active: formData.active
        };
        if (formData.password && formData.password.trim() !== '') {
          payload.password = formData.password;
        }
        await axios.put(`/api/auth/users/${editingUser._id}`, payload, config);
      } else {
        await axios.post('/api/auth/register', formData, config);
      }

      if (currentReqId !== reqIdRef.current) return;
      onSave();
      onClose();
      setFormData({ username: '', password: '', role: 'client', active: true });
    } catch (error) {
      if (currentReqId === reqIdRef.current) {
        alert(error.response?.data?.message || (editingUser ? 'Error al actualizar el usuario' : 'Error al crear el usuario'));
      }
    } finally {
      if (currentReqId === reqIdRef.current) {
        setLoading(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="glass-card modal-content" style={{ maxWidth: '430px', width: '90%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, fontSize: '20px' }}>
            <UserPlus className="gradient-text" /> {editingUser ? 'Editar Usuario' : 'Nuevo Cliente'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar modal" className="btn-secondary" style={{ padding: '5px', borderRadius: '50%' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="user-modal-username"><User size={14} /> Nombre de Usuario</label>
            <input 
              id="user-modal-username"
              type="text" 
              placeholder="Ej: pizzeriagusto"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required 
            />
          </div>

          <div className="form-group">
            <label htmlFor="user-modal-password">
              <Lock size={14} /> {editingUser ? 'Nueva Contraseña (Opcional)' : 'Contraseña Inicial'}
            </label>
            <input 
              id="user-modal-password"
              type="password" 
              placeholder={editingUser ? 'Dejar vacío para conservar la actual...' : '••••••••'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!editingUser}
            />
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '5px' }}>
              {editingUser
                ? 'Solo escribe aquí si deseas cambiarle la contraseña al usuario (mínimo 6 caracteres).'
                : 'Dale esta contraseña al cliente para su primer acceso.'}
            </p>
          </div>

          {editingUser && (
            <div className="form-group">
              <label htmlFor="user-modal-status"><Shield size={14} /> Estado de la Cuenta</label>
              <select
                id="user-modal-status"
                value={formData.active ? 'active' : 'inactive'}
                onChange={(e) => setFormData({ ...formData, active: e.target.value === 'active' })}
              >
                <option value="active">Activo (Acceso permitido)</option>
                <option value="inactive">Inactivo / Suspendido (Acceso bloqueado)</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', marginTop: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            disabled={loading}
          >
            <Save size={18} />
            {loading ? 'Guardando...' : editingUser ? 'Guardar Cambios' : 'Crear Usuario Cliente'}
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
        input, select { width: 100%; padding: 12px; border-radius: 10px; border: 1px solid var(--border-color); background: rgba(255,255,255,0.05); color: var(--text-primary); }
        select option { background: #1e1e1e; color: white; }
      `}</style>
    </div>
  );
};

export default UserModal;
