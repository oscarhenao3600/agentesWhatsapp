import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  Save, 
  Bot, 
  FileText, 
  Sparkles,
  Info,
  Key,
  Cpu,
  Settings
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
    aiProvider: 'gemini',
    aiModel: 'gemini-1.5-pro',
    apiKey: '',
    temperature: 0.7,
    businessType: 'other',
    personality: 'friendly',
    basePrompt: '',
    menuContent: '',
    welcomeMessage: '¡Hola! ¿En qué puedo ayudarte hoy?',
    additionalParams: {}
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
        // Combinamos la config guardada con los valores por defecto si alguno falta
        setConfig(prev => ({ ...prev, ...data.aiConfig }));
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

  // Modelos dinámicos según el proveedor seleccionado
  const renderModelOptions = () => {
    switch (config.aiProvider) {
      case 'gemini':
        return (
          <>
            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
            <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
          </>
        );
      case 'openai':
        return (
          <>
            <option value="gpt-4o">GPT-4o</option>
            <option value="gpt-4-turbo">GPT-4 Turbo</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
          </>
        );
      case 'deepseek':
        return (
          <>
            <option value="deepseek-chat">DeepSeek Chat</option>
            <option value="deepseek-coder">DeepSeek Coder</option>
          </>
        );
      default:
        return <option value="">Seleccione un modelo</option>;
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
          <p style={{ color: 'var(--text-secondary)' }}>Define el comportamiento, proveedor y conocimiento de tu agente virtual</p>
        </div>
        <button onClick={handleSave} className="btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Save size={18} /> {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        
        {/* Nueva Sección: Proveedor y Conexión */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Cpu size={24} className="gradient-text" />
            <h3 style={{ fontSize: '20px' }}>Proveedor y Conexión</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>Proveedor de Inteligencia Artificial</label>
              <select 
                className="input-field" 
                value={config.aiProvider}
                onChange={(e) => {
                  const newProvider = e.target.value;
                  // Cambiar modelo por defecto al cambiar de proveedor
                  let defaultModel = 'gemini-1.5-pro';
                  if (newProvider === 'openai') defaultModel = 'gpt-4o';
                  if (newProvider === 'deepseek') defaultModel = 'deepseek-chat';
                  setConfig({ ...config, aiProvider: newProvider, aiModel: defaultModel });
                }}
              >
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI (ChatGPT)</option>
                <option value="deepseek">DeepSeek</option>
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>Modelo</label>
              <select 
                className="input-field" 
                value={config.aiModel}
                onChange={(e) => setConfig({ ...config, aiModel: e.target.value })}
              >
                {renderModelOptions()}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                API Key (Se guardará encriptada)
              </label>
              <div style={{ position: 'relative' }}>
                <Key size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-secondary)' }} />
                <input 
                  type="password" 
                  className="input-field" 
                  style={{ paddingLeft: '35px' }}
                  placeholder="Pegue aquí la API Key de su proveedor..."
                  value={config.apiKey}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                Temperatura / Creatividad: {config.temperature}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', height: '42px' }}>
                <input 
                  type="range" 
                  min="0" 
                  max="1.5" 
                  step="0.1" 
                  value={config.temperature}
                  onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                  style={{ flex: 1, accentColor: 'var(--accent-primary)' }}
                />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', width: '120px' }}>
                  {config.temperature < 0.4 ? 'Preciso/Estricto' : config.temperature > 0.8 ? 'Muy Creativo' : 'Equilibrado'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Campos específicos adicionales */}
          {config.aiProvider === 'openai' && (
            <div style={{ marginTop: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                ID de Organización (Opcional)
              </label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="org-..."
                value={config.additionalParams?.organizationId || ''}
                onChange={(e) => setConfig({ 
                  ...config, 
                  additionalParams: { ...config.additionalParams, organizationId: e.target.value } 
                })}
              />
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
          {/* Lado Izquierdo: Personalidad y Prompt */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Bot size={24} className="gradient-text" />
              <h3 style={{ fontSize: '20px' }}>Comportamiento y Reglas</h3>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>Categoría / Tipo de Negocio</label>
              <select 
                className="input-field" 
                value={config.businessType}
                onChange={(e) => setConfig({ ...config, businessType: e.target.value })}
              >
                <option value="restaurant">Restaurante (Pedidos de comida)</option>
                <option value="hotel">Hotel / Glamping (Reservaciones y estadías)</option>
                <option value="retail">Comercio / Ventas (Venta de productos)</option>
                <option value="services">Servicios (Citas y agendas)</option>
                <option value="other">Otro / Genérico</option>
              </select>
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
                style={{ height: '350px', resize: 'vertical', fontFamily: 'monospace', fontSize: '13px' }}
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
                Usa formatos claros como listas o tablas de texto. Esto ayuda a la IA a extraer precios y detalles de forma más precisa.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIConfiguration;
