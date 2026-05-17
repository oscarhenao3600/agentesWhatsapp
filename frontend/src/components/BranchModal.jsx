import { useState, useEffect } from 'react';
import { X, Save, Zap } from 'lucide-react';
import axios from 'axios';

const BranchModal = ({ isOpen, onClose, businessId, user, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    whatsappNumberId: '',
    whatsappVerifyToken: '',
    accessToken: '',
    basePrompt: '',
    businessType: 'restaurant'
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.post('/api/branch', { ...formData, businessId }, config);
      onSave();
      onClose();
      setFormData({
        name: '',
        phone: '',
        whatsappNumberId: '',
        whatsappVerifyToken: '',
        accessToken: '',
        basePrompt: '',
        businessType: 'restaurant'
      });
    } catch (error) {
      console.error('Error creating branch:', error);
      alert('Error al crear la sucursal: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-card" style={{ maxWidth: '600px', width: '90%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
          <h2 style={{ fontSize: '24px' }}>Nueva Sucursal</h2>
          <button onClick={onClose} className="btn-secondary" style={{ padding: '5px' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div style={{ marginBottom: '15px', gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>Nombre de la Sucursal</label>
              <input 
                type="text" 
                className="input-field" 
                required
                placeholder="Ej: Sucursal Centro"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div style={{ marginBottom: '15px', gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>Categoría / Tipo de Negocio</label>
              <select 
                className="input-field" 
                value={formData.businessType}
                onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
              >
                <option value="restaurant">Restaurante (Pedidos de comida)</option>
                <option value="hotel">Hotel / Glamping (Reservaciones y estadías)</option>
                <option value="retail">Comercio / Ventas (Venta de productos)</option>
                <option value="services">Servicios (Citas y agendas)</option>
                <option value="other">Otro / Genérico</option>
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>Teléfono de Contacto</label>
              <input 
                type="text" 
                className="input-field" 
                required
                placeholder="+57 300..."
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>ID Número WhatsApp (Meta)</label>
              <input 
                type="text" 
                className="input-field" 
                required
                placeholder="ID de 15 dígitos"
                value={formData.whatsappNumberId}
                onChange={(e) => setFormData({ ...formData, whatsappNumberId: e.target.value })}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>Token Verificación Webhook</label>
              <input 
                type="text" 
                className="input-field" 
                required
                placeholder="Cualquier string seguro"
                value={formData.whatsappVerifyToken}
                onChange={(e) => setFormData({ ...formData, whatsappVerifyToken: e.target.value })}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>Token de Acceso Meta</label>
              <input 
                type="password" 
                className="input-field" 
                required
                placeholder="EAA..."
                value={formData.accessToken}
                onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
              />
            </div>

            <div style={{ marginBottom: '15px', gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>Prompt Inicial de la IA</label>
              <textarea 
                className="input-field" 
                style={{ height: '80px' }}
                placeholder="Ej: Eres un asistente amable para la sucursal centro..."
                value={formData.basePrompt}
                onChange={(e) => setFormData({ ...formData, basePrompt: e.target.value })}
              ></textarea>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Zap size={18} /> {loading ? 'Creando...' : 'Crear Sucursal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BranchModal;
