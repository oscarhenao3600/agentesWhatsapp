import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  Save, 
  Bot, 
  FileText, 
  Sparkles,
  Info
} from 'lucide-react';
import axios from 'axios';

const AIConfiguration = () => {
  const { branchId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branch, setBranch] = useState(null);
  const [config, setConfig] = useState({
    personality: 'friendly',
    basePrompt: '',
    menuContent: '',
    welcomeMessage: '¡Hola! ¿En qué puedo ayudarte hoy?'
  });

  useEffect(() => {
    fetchData();
  }, [branchId]);

  const fetchData = async () => {
    try {
      const authConfig = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`/api/branch/${branchId}`, authConfig);
      setBranch(data.branch);
      if (data.aiConfig) {
        setConfig(data.aiConfig);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching AI config:', error);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const authConfig = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.put(`/api/branch/${branchId}/ai-config`, config, authConfig);
      alert('Configuración guardada correctamente');
    } catch (error) {
      console.error('Error saving AI config:', error);
      alert('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '100px' }}>Cargando Configuración...</div>;

  return (
    <div className="container">
      <button onClick={() => navigate(-1)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <ArrowLeft size={18} /> Volver
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h2 style={{ fontSize: '32px' }}>Configuración de IA: {branch?.name}</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Define el comportamiento y el conocimiento de tu agente virtual</p>
        </div>
        <button onClick={handleSave} className="btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Save size={18} /> {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        {/* Lado Izquierdo: Personalidad y Prompt */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Bot size={24} className="gradient-text" />
            <h3 style={{ fontSize: '20px' }}>Personalidad y Prompt</h3>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>Personalidad del Agente</label>
            <select 
              className="input-field" 
              value={config.personality}
              onChange={(e) => setConfig({ ...config, personality: e.target.value })}
            >
              <option value="friendly">Amigable y Cercano</option>
              <option value="professional">Profesional y Eficiente</option>
              <option value="formal">Formal y Educado</option>
              <option value="casual">Relajado y Juvenil</option>
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>Mensaje de Bienvenida</label>
            <input 
              type="text" 
              className="input-field" 
              value={config.welcomeMessage}
              onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>Prompt Base (Instrucciones)</label>
            <textarea 
              className="input-field" 
              style={{ height: '200px', resize: 'vertical' }}
              placeholder="Ej: Eres un asistente para una pizzería llamada 'La Mamma'. Debes saludar, ofrecer el menú y ayudar a concretar el pedido..."
              value={config.basePrompt}
              onChange={(e) => setConfig({ ...config, basePrompt: e.target.value })}
            ></textarea>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', color: 'var(--text-secondary)', fontSize: '12px' }}>
              <Info size={14} /> El prompt define cómo responde la IA a los clientes.
            </div>
          </div>
        </div>

        {/* Lado Derecho: Base de Conocimiento / Menú */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <FileText size={24} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '20px' }}>Base de Conocimiento (Menú/Servicios)</h3>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '15px' }}>
              Pega aquí el contenido de tu menú, lista de servicios o preguntas frecuentes. La IA usará esta información para responder a los clientes.
            </p>
            <textarea 
              className="input-field" 
              style={{ height: '400px', resize: 'vertical', fontFamily: 'monospace', fontSize: '13px' }}
              placeholder="Ej: PIZZAS:\n1. Pepperoni - $10\n2. Hawaiana - $12\n\nHORARIOS:\nLunes a Viernes 10am - 10pm..."
              value={config.menuContent}
              onChange={(e) => setConfig({ ...config, menuContent: e.target.value })}
            ></textarea>
          </div>

          <div style={{ background: 'rgba(249, 115, 22, 0.05)', padding: '15px', borderRadius: '12px', border: '1px dashed var(--accent-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Sparkles size={18} className="gradient-text" />
              <strong style={{ fontSize: '14px' }}>Tip de Optimización</strong>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Usa formatos claros como listas o tablas de texto. Esto ayuda a Gemini a extraer precios y detalles de forma más precisa.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIConfiguration;
