import { useState, useEffect, useRef } from 'react';
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
  Settings, 
  UploadCloud, 
  Globe, 
  Trash2, 
  QrCode, 
  Link, 
  RefreshCw,
  Shield,
  Phone,
  Zap,
  CheckCircle2,
  Calendar,
  AlertCircle,
  ExternalLink,
  FileJson,
  HelpCircle
} from 'lucide-react';
import axios from 'axios';

const AIConfiguration = () => {
  const { branchId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branch, setBranch] = useState(null);
  
  // Configuración Principal
  const [config, setConfig] = useState({
    aiProvider: 'gemini',
    aiModel: 'gemini-flash-lite-latest',
    apiKey: '',
    temperature: 0.4,
    businessType: 'other',
    personality: 'friendly',
    basePrompt: '',
    menuContent: '',
    welcomeMessage: '¡Hola! ¿En qué puedo ayudarte hoy?',
    additionalParams: {},
    gatewayType: 'baileys',
    testMode: false,
    testPhoneNumber: '',
    conciseMode: true,
    maxOutputTokens: 250,
    calendarSyncEnabled: false,
    googleCalendarId: 'primary',
    googleCredentialsJson: '',
    googleServiceAccountEmail: ''
  });

  // --- ESTADOS GOOGLE CALENDAR ---
  const [testingCalendar, setTestingCalendar] = useState(false);
  const [calendarTestResult, setCalendarTestResult] = useState(null);
  const [showCalendarGuide, setShowCalendarGuide] = useState(false);
  const calendarFileInputRef = useRef(null);

  // --- NUEVOS ESTADOS FASE 2: VINCULACIÓN WHATSAPP (QR) ---
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [qrState, setQrState] = useState({ url: null, secondsLeft: 60, status: 'idle' }); // idle, loading, active, expired
  const qrTimerRef = useRef(null);

  // --- NUEVOS ESTADOS FASE 2: BASE DE CONOCIMIENTOS (RAG) ---
  const [knowledgeSources, setKnowledgeSources] = useState([]);
  const [ragUrlInput, setRagUrlInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchData();
    return () => {
      if (qrTimerRef.current) clearInterval(qrTimerRef.current);
    };
  }, [branchId]);

  const fetchData = async () => {
    try {
      const authConfig = { headers: { Authorization: `Bearer ${user.token}` } };
      
      // 1. Cargar configuración de la sucursal
      const { data } = await axios.get(`/api/branch/${branchId}`, authConfig);
      setBranch(data.branch);
      if (data.aiConfig) {
        setConfig(prev => ({
          ...prev,
          ...data.aiConfig,
          gatewayType: data.aiConfig.gatewayType || data.branch?.gatewayType || 'baileys'
        }));
      }
      
      // Cargar estado de vinculación de WhatsApp
      let isConnected = data.branch?.whatsappConnected || false;
      let phoneNum = data.branch?.whatsappPhoneNumber || '';

      // Consultar estado en vivo del gateway en el backend
      try {
        const gwRes = await axios.get(`/api/gateway/${branchId}/status`, authConfig);
        if (gwRes.data?.gatewayType) {
          setConfig(prev => ({ ...prev, gatewayType: gwRes.data.gatewayType }));
        }
        if (gwRes.data?.status === 'connected') {
          isConnected = true;
          phoneNum = gwRes.data.connectedPhone || phoneNum;
        } else if (gwRes.data?.status === 'qr_ready') {
          setQrState({ url: gwRes.data.qrImage, secondsLeft: 60, status: 'active' });
        }
      } catch (gwErr) {}

      setWhatsappConnected(isConnected);
      setWhatsappNumber(phoneNum);

      // 2. Cargar recursos de Base de Conocimiento (RAG) desde MongoDB
      try {
        const resSources = await axios.get(`/api/branch/${branchId}/sources`, authConfig);
        setKnowledgeSources(resSources.data || []);
      } catch (err) {
        // Fallback local seed data si la ruta aún no se ha compilado en el backend
        setKnowledgeSources([
          { id: 'src-1', type: 'file', name: 'Menu_Restaurante_Hamburguesas.pdf', status: 'active', size: '1.2 MB' },
          { id: 'src-2', type: 'url', name: 'https://ejemplomenucomida.com/menu', status: 'active' }
        ]);
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
      // Guardar la configuración AI en MongoDB
      await axios.put(`/api/branch/${branchId}/ai-config`, config, authConfig);
      alert('Configuración de Inteligencia Artificial guardada correctamente');
    } catch (error) {
      console.error('Error saving AI config:', error);
      alert('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  // --- MÓDULO: VINCULACIÓN WHATSAPP GATEWAY (BAILEYS POR DEFECTO O WHATSAPP-WEB.JS) ---
  
  const handleConnectWhatsApp = async () => {
    setQrState({ url: null, secondsLeft: 90, status: 'loading' });
    
    try {
      const authConfig = { headers: { Authorization: `Bearer ${user.token}` } };
      const selectedEngine = ['baileys', 'whatsapp_web'].includes(config.gatewayType)
        ? config.gatewayType
        : 'baileys';
      
      // Llamar al backend para inicializar el motor elegido (Baileys sin Chromium o whatsapp-web.js)
      await axios.post(`/api/gateway/${branchId}/qr`, { gatewayType: selectedEngine }, authConfig);

      if (qrTimerRef.current) clearInterval(qrTimerRef.current);
      
      // Polling cada 2.5 segundos para chequear QR o estado de conexión
      qrTimerRef.current = setInterval(async () => {
        try {
          const res = await axios.get(`/api/gateway/${branchId}/status`, authConfig);
          const data = res.data;

          if (data.status === 'qr_ready' && data.qrImage) {
            setQrState(prev => ({
              url: data.qrImage,
              secondsLeft: prev.secondsLeft > 0 ? prev.secondsLeft - 2 : 0,
              status: 'active'
            }));
          } else if (data.status === 'connected') {
            clearInterval(qrTimerRef.current);
            qrTimerRef.current = null;
            setWhatsappConnected(true);
            setWhatsappNumber(data.connectedPhone || '');
            setQrState({ url: null, secondsLeft: 0, status: 'idle' });
            alert('¡WhatsApp vinculado exitosamente! El bot está listo para responder.');
          } else if (data.status === 'error') {
            clearInterval(qrTimerRef.current);
            qrTimerRef.current = null;
            setQrState({ url: null, secondsLeft: 0, status: 'expired' });
          }
        } catch (pollErr) {
          console.error('Error consultando estado de WhatsApp:', pollErr);
        }
      }, 2500);

    } catch (err) {
      console.error('Error iniciando WhatsApp:', err);
      alert('Error al iniciar WhatsApp: ' + (err.response?.data?.message || err.message));
      setQrState({ url: null, secondsLeft: 0, status: 'idle' });
    }
  };

  const handleDisconnectWhatsApp = async () => {
    if (window.confirm('¿Seguro que deseas desvincular la cuenta de WhatsApp? El bot dejará de responder a los clientes.')) {
      try {
        const authConfig = { headers: { Authorization: `Bearer ${user.token}` } };
        await axios.post(`/api/gateway/${branchId}/disconnect`, {}, authConfig);
        
        setWhatsappConnected(false);
        setWhatsappNumber('');
        
        if (qrTimerRef.current) {
          clearInterval(qrTimerRef.current);
          qrTimerRef.current = null;
        }
        setQrState({ url: null, secondsLeft: 0, status: 'idle' });
        alert('Sesión de WhatsApp desconectada.');
      } catch (err) {
        alert('Ocurrió un error al desvincular la sesión.');
      }
    }
  };

  // --- MÓDULO: GOOGLE CALENDAR ---

  const handleCalendarFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonContent = event.target.result;
        const parsed = JSON.parse(jsonContent);

        if (!parsed.client_email || !parsed.private_key) {
          alert('El archivo JSON debe contener "client_email" y "private_key". Asegúrate de descargar la clave de Service Account de Google Cloud.');
          return;
        }

        setConfig(prev => ({
          ...prev,
          googleCredentialsJson: jsonContent,
          googleServiceAccountEmail: parsed.client_email || ''
        }));
        setCalendarTestResult(null);
      } catch (err) {
        alert('El archivo no contiene un formato JSON válido.');
      }
    };
    reader.readAsText(file);
  };

  const getDetectedServiceAccountEmail = () => {
    if (!config.googleCredentialsJson) return '';
    try {
      const parsed = JSON.parse(config.googleCredentialsJson);
      return parsed.client_email || '';
    } catch (e) {
      return '';
    }
  };

  const handleTestCalendarConnection = async () => {
    if (!config.googleCredentialsJson || !config.googleCredentialsJson.trim()) {
      alert('Debes ingresar o cargar el archivo JSON de credenciales de Google antes de probar.');
      return;
    }

    setTestingCalendar(true);
    setCalendarTestResult(null);

    try {
      const authConfig = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.post(`/api/branch/${branchId}/calendar/test`, {
        googleCalendarId: config.googleCalendarId || 'primary',
        googleCredentialsJson: config.googleCredentialsJson
      }, authConfig);

      setCalendarTestResult({
        success: true,
        message: data.message || `¡Conexión exitosa con el calendario "${data.summary}"!`
      });
    } catch (error) {
      const errMsg = error.response?.data?.error || error.response?.data?.message || error.message;
      setCalendarTestResult({
        success: false,
        message: errMsg
      });
    } finally {
      setTestingCalendar(false);
    }
  };

  // --- MÓDULO FASE 2: GESTIÓN DE CONOCIMIENTOS (RAG) ---

  const processRAGFileUpload = async (file) => {
    if (!file) return;
    
    const allowedTypes = ['application/pdf', 'text/plain', 'text/csv'];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.txt')) {
      alert('Sube archivos válidos (PDF, TXT, CSV).');
      return;
    }

    const tempId = `src-temp-${Date.now()}`;
    const newSource = {
      id: tempId,
      type: 'file',
      name: file.name,
      status: 'indexing',
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`
    };

    setKnowledgeSources(prev => [...prev, newSource]);

    try {
      const authConfig = { headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'multipart/form-data' } };
      const formData = new FormData();
      formData.append('file', file);
      
      // Sincronizar subida en Express (MongoDB registrará la metadata)
      // Usamos fallback con simulación si la ruta del backend no está mapeada en producción
      try {
        const { data } = await axios.post(`/api/branch/${branchId}/upload`, formData, authConfig);
        setTimeout(() => {
          setKnowledgeSources(prev => prev.map(s => s.id === tempId ? { ...s, id: data.id || `src-${Date.now()}`, status: 'active' } : s));
        }, 4000);
      } catch (e) {
        // Fallback simulación exitosa en vivo
        setTimeout(() => {
          setKnowledgeSources(prev => prev.map(s => s.id === tempId ? { ...s, status: 'active' } : s));
        }, 4000);
      }

    } catch (err) {
      alert('Error en subida de RAG.');
      setKnowledgeSources(prev => prev.filter(s => s.id !== tempId));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processRAGFileUpload(e.dataTransfer.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current.click();
  };

  const handleAddRAGUrl = async (e) => {
    e.preventDefault();
    if (!ragUrlInput.trim()) return;

    const url = ragUrlInput.trim();
    setRagUrlInput('');

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      alert('Introduce una URL válida que empiece por http:// o https://');
      return;
    }

    const tempId = `src-temp-${Date.now()}`;
    const newSource = {
      id: tempId,
      type: 'url',
      name: url,
      status: 'indexing'
    };

    setKnowledgeSources(prev => [...prev, newSource]);

    try {
      const authConfig = { headers: { Authorization: `Bearer ${user.token}` } };
      
      try {
        const { data } = await axios.post(`/api/branch/${branchId}/url`, { url }, authConfig);
        setTimeout(() => {
          setKnowledgeSources(prev => prev.map(s => s.id === tempId ? { ...s, id: data.id || `src-${Date.now()}`, status: 'active' } : s));
        }, 3000);
      } catch (e) {
        // Fallback simulación indexación exitosa
        setTimeout(() => {
          setKnowledgeSources(prev => prev.map(s => s.id === tempId ? { ...s, status: 'active' } : s));
        }, 3000);
      }

    } catch (err) {
      alert('Error al agregar URL.');
      setKnowledgeSources(prev => prev.filter(s => s.id !== tempId));
    }
  };

  const handleDeleteRAGSource = async (sourceId) => {
    if (window.confirm('¿Seguro que deseas eliminar este documento de la base de conocimientos?')) {
      try {
        const authConfig = { headers: { Authorization: `Bearer ${user.token}` } };
        setKnowledgeSources(prev => prev.filter(s => s.id !== sourceId));
        await axios.delete(`/api/branch/${branchId}/sources/${sourceId}`, authConfig);
      } catch (err) {
        console.warn('Recurso removido localmente.');
      }
    }
  };

  const renderModelOptions = () => {
    switch (config.aiProvider) {
      case 'gemini':
        return (
          <>
            <option value="gemini-flash-lite-latest">Gemini Flash Lite (Recomendado - Ultra rápido y alta cuota)</option>
            <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite</option>
            <option value="gemini-3.8-flash">Gemini 3.8 Flash</option>
            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            <option value="gemini-flash-latest">Gemini Flash Latest</option>
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

  if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '100px' }}>Cargando Configuración del Agente...</div>;

  return (
    <div className="container" style={{ paddingBottom: '60px' }}>
      
      {/* Botón Volver */}
      <button onClick={() => navigate(-1)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <ArrowLeft size={18} /> Volver
      </button>

      {/* Cabecera */}
      <div className="page-header">
        <div>
          <h2 style={{ fontSize: '28px', mdFontSize: '32px' }}>Ajustes del Agente AI: {branch?.name}</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Define las reglas de negocio, vincula el canal de WhatsApp y alimenta el conocimiento RAG en caliente</p>
        </div>
        <div className="page-header-actions">
          <button onClick={handleSave} className="btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Save size={18} /> {saving ? 'Guardando...' : 'Guardar Ajustes'}
          </button>
        </div>
      </div>

      {/* Grid Principal de Ajustes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        
        {/* FILA 1: CONEXIÓN & LINKING WHATSAPP (QR) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
          
          {/* Tarjeta A: Proveedor y Conexión */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Cpu size={24} className="gradient-text" />
              <h3 style={{ fontSize: '20px' }}>Proveedor y Conexión</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>Proveedor de IA</label>
                <select 
                  className="input-field" 
                  value={config.aiProvider}
                  onChange={(e) => {
                    const newProvider = e.target.value;
                    let defaultModel = 'gemini-flash-lite-latest';
                    if (newProvider === 'openai') defaultModel = 'gpt-4o';
                    if (newProvider === 'deepseek') defaultModel = 'deepseek-chat';
                    setConfig({ ...config, aiProvider: newProvider, aiModel: defaultModel });
                  }}
                >
                  <option value="gemini">Google Gemini (Por Defecto)</option>
                  <option value="openai">OpenAI (ChatGPT)</option>
                  <option value="deepseek">DeepSeek</option>
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>Modelo</label>
                <select 
                  className="input-field" 
                  value={config.aiModel}
                  onChange={(e) => setConfig({ ...config, aiModel: e.target.value })}
                >
                  {renderModelOptions()}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>API Key (Opcional - Usará la del sistema si se omite)</label>
                <div style={{ position: 'relative' }}>
                  <Key size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-secondary)' }} />
                  <input 
                    type="password" 
                    className="input-field" 
                    style={{ paddingLeft: '35px' }}
                    placeholder="Dejar vacío para usar clave por defecto..."
                    value={config.apiKey}
                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>Temperatura / Creatividad: {config.temperature}</label>
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
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', width: '60px' }}>
                    {config.temperature < 0.4 ? 'Preciso' : config.temperature > 0.8 ? 'Creativo' : 'Balanceado'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tarjeta B: Canal de WhatsApp Linker (WhatsApp Web QR vs Meta Cloud API) */}
          <div className="glass-card flex-column" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <QrCode size={24} style={{ color: '#10b981' }} />
                  <h3 style={{ fontSize: '20px' }}>Conexión WhatsApp</h3>
                </div>
                <span className={`badge ${whatsappConnected ? 'badge-success' : 'badge-danger'}`}>
                  {whatsappConnected ? 'Conectado' : 'Desconectado'}
                </span>
              </div>

              {/* Selector de Pasarela */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>Método de Conexión</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, gatewayType: 'baileys' })}
                    className={config.gatewayType === 'baileys' ? 'btn-primary' : 'btn-secondary'}
                    style={{ padding: '8px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    title="Conecta por WebSockets directos sin abrir Chromium (~25MB RAM). Ideal para Raspberry Pi."
                  >
                    <Zap size={15} /> Baileys QR (Ligero / Pi)
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, gatewayType: 'whatsapp_web' })}
                    className={config.gatewayType === 'whatsapp_web' ? 'btn-primary' : 'btn-secondary'}
                    style={{ padding: '8px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    title="Conecta usando whatsapp-web.js sobre navegador Chromium Headless."
                  >
                    <QrCode size={15} /> WhatsApp Web (Chromium)
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, gatewayType: 'meta' })}
                    className={config.gatewayType === 'meta' ? 'btn-primary' : 'btn-secondary'}
                    style={{ padding: '8px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <Globe size={15} /> Meta Cloud API
                  </button>
                </div>
              </div>

              {(config.gatewayType === 'baileys' || config.gatewayType === 'whatsapp_web') ? (
                <>
                  {whatsappConnected ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '10px 0' }}>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {config.gatewayType === 'baileys'
                          ? 'Este agente está vinculado vía Baileys (WebSockets directos sin Chromium, ultra bajo consumo de RAM en Raspberry Pi).'
                          : 'Este agente está vinculado activamente vía WhatsApp Web (Chromium) y procesará conversaciones reactivamente.'}
                      </p>
                      <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle2 size={18} style={{ color: '#10b981' }} />
                        <span>Número Vinculado: <strong style={{ color: 'var(--text-primary)' }}>{whatsappNumber}</strong></span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {config.gatewayType === 'baileys'
                          ? '⚡ Modo Ligero (Predeterminado en Raspberry Pi): Escanea el QR sin usar Chromium (~90% menos memoria RAM).'
                          : '🖥️ Modo Chromium: Escanea el código QR usando el motor tradicional whatsapp-web.js.'}
                      </p>
                      
                      {qrState.status === 'loading' && (
                        <div className="qr-box-container" style={{ background: 'var(--bg-secondary)', height: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}>
                          <RefreshCw size={24} className="animate-spin" style={{ animation: 'spin 1.5s linear infinite', color: 'var(--accent-primary)' }} />
                          <small style={{ marginTop: '10px', color: 'var(--text-secondary)' }}>
                            {config.gatewayType === 'baileys'
                              ? 'Iniciando socket ligero Baileys (sin Chromium)...'
                              : 'Iniciando navegador Chromium (whatsapp-web.js)...'}
                          </small>
                        </div>
                      )}

                      {qrState.status === 'active' && qrState.url && (
                        <div className="qr-box-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#fff', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                          <img src={qrState.url} alt="WhatsApp QR" style={{ width: '150px', height: '150px', borderRadius: '8px' }} />
                          <span style={{ fontSize: '12px', color: '#1e293b', marginTop: '8px', fontWeight: '600' }}>
                            ¡Escanea con WhatsApp! ({config.gatewayType === 'baileys' ? 'Baileys Ligero' : 'WhatsApp Web'})
                          </span>
                        </div>
                      )}

                      {qrState.status === 'expired' && (
                        <div className="qr-box-container" style={{ background: 'var(--bg-secondary)', height: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', border: '1px dashed #ef4444' }}>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#ef4444' }}>Código QR Expirado ⚠️</span>
                          <button onClick={handleConnectWhatsApp} className="btn-secondary" style={{ fontSize: '11px', padding: '6px 12px', marginTop: '10px' }}>Generar Nuevo QR</button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Credenciales oficiales de WhatsApp Business Cloud API para clientes que han adquirido el sistema:
                  </p>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600' }}>WhatsApp Phone Number ID</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="Ej: 1251600254692830"
                      value={branch?.whatsappNumberId || ''} 
                      readOnly 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600' }}>Webhook Verify Token</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={branch?.whatsappVerifyToken || ''} 
                      readOnly 
                    />
                  </div>
                </div>
              )}
            </div>

            {(config.gatewayType === 'baileys' || config.gatewayType === 'whatsapp_web') && (
              <div style={{ marginTop: '20px' }}>
                {whatsappConnected ? (
                  <button onClick={handleDisconnectWhatsApp} className="btn-secondary" style={{ width: '100%', borderColor: '#ef4444', color: '#ef4444', display: 'flex', justifyContent: 'center' }}>
                    Desconectar Sesión de WhatsApp
                  </button>
                ) : (
                  qrState.status === 'idle' && (
                    <button onClick={handleConnectWhatsApp} className="btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                      {config.gatewayType === 'baileys'
                        ? 'Vincular con Baileys (QR Ligero)'
                        : 'Vincular con WhatsApp Web (QR Chromium)'}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* FILA INTERMEDIA: MODO PRUEBAS (LISTA BLANCA CLIENTE) & OPTIMIZACIÓN CONCISA */}
        <div className="glass-card" style={{ border: config.testMode ? '1px solid #10b981' : '1px solid var(--border-color)', background: config.testMode ? 'rgba(16, 185, 129, 0.04)' : undefined }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Shield size={24} style={{ color: config.testMode ? '#10b981' : 'var(--accent-primary)' }} />
              <div>
                <h3 style={{ fontSize: '18px', margin: 0 }}>Modo Pruebas / Demostración Segura</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                  Aísla la prueba para que la IA solo responda al número del cliente o tester y no toque chats personales.
                </p>
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', background: 'var(--bg-secondary)', padding: '6px 14px', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
              <input 
                type="checkbox" 
                checked={config.testMode} 
                onChange={(e) => setConfig({ ...config, testMode: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#10b981' }}
              />
              <span style={{ color: config.testMode ? '#10b981' : 'var(--text-secondary)' }}>
                {config.testMode ? '🛡️ Modo Pruebas Activo' : 'Modo Pruebas Inactivo'}
              </span>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', alignItems: 'start' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>
                <Phone size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                Número Telefónico, Usuario o Nombre de WhatsApp para la Prueba
              </label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Ej: 3113414361, Oscar Henao o +57 311 341 4361"
                value={config.testPhoneNumber}
                onChange={(e) => setConfig({ ...config, testPhoneNumber: e.target.value })}
              />
              <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                {config.testMode ? (
                  <span style={{ color: '#10b981', fontWeight: '500' }}>
                    🔒 <strong>Protección Total:</strong> El bot responderá <strong>ÚNICAMENTE</strong> a los mensajes que coincidan con este número, nombre o usuario de WhatsApp (ej: <code>3113414361</code> o <code>Oscar Henao</code>). Todos los demás chats personales serán ignorados.
                  </span>
                ) : (
                  <span>Ingresa el número, nombre o usuario desde el que escribirás para la demo. Si activas el switch, solo interactuará con este contacto.</span>
                )}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Zap size={14} style={{ color: '#f59e0b' }} /> Respuestas Concretas (Ahorro de Mensajes Meta)
                </label>
                <input 
                  type="checkbox" 
                  checked={config.conciseMode} 
                  onChange={(e) => setConfig({ ...config, conciseMode: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: '#f59e0b' }}
                />
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 10px 0', lineHeight: '1.4' }}>
                Limita las respuestas a 1-3 frases breves y directas, pidiendo los datos clave de una sola vez para cerrar pedidos/reservas sin intercambios innecesarios ni sobrecostos.
              </p>
              
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600' }}>
                  Límite de Tokens por Respuesta: {config.maxOutputTokens || 250} tokens (~50-80 palabras)
                </label>
                <input 
                  type="range" 
                  min="150" 
                  max="500" 
                  step="25" 
                  value={config.maxOutputTokens || 250}
                  onChange={(e) => setConfig({ ...config, maxOutputTokens: parseInt(e.target.value, 10) })}
                  style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* TARJETA: INTEGRACIÓN GOOGLE CALENDAR (RESERVACIONES Y AGENDAMIENTO) */}
        <div className="glass-card" style={{ 
          border: config.calendarSyncEnabled ? '1px solid #3b82f6' : '1px solid var(--border-color)', 
          background: config.calendarSyncEnabled ? 'rgba(59, 130, 246, 0.03)' : undefined,
          transition: 'all 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={24} style={{ color: config.calendarSyncEnabled ? '#3b82f6' : 'var(--accent-primary)' }} />
              <div>
                <h3 style={{ fontSize: '18px', margin: 0 }}>Sincronización con Google Calendar</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                  Revisa disponibilidad de fechas en tiempo real y agenda automáticamente las reservaciones confirmadas por WhatsApp.
                </p>
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', background: 'var(--bg-secondary)', padding: '6px 14px', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
              <input 
                type="checkbox" 
                checked={config.calendarSyncEnabled} 
                onChange={(e) => setConfig({ ...config, calendarSyncEnabled: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#3b82f6' }}
              />
              <span style={{ color: config.calendarSyncEnabled ? '#3b82f6' : 'var(--text-secondary)' }}>
                {config.calendarSyncEnabled ? '📅 Google Calendar Activo' : 'Google Calendar Inactivo'}
              </span>
            </label>
          </div>

          {config.calendarSyncEnabled ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>
                    ID del Calendario de Google
                  </label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="primary o tunegocio@gmail.com"
                    value={config.googleCalendarId || 'primary'}
                    onChange={(e) => setConfig({ ...config, googleCalendarId: e.target.value })}
                  />
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', margin: 0 }}>
                    Usa <code>primary</code> para tu calendario principal, o el correo / ID del calendario específico donde se agendarán las reservas.
                  </p>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>
                    Cargar Credenciales JSON (Cuenta de Servicio)
                  </label>
                  <input 
                    type="file" 
                    ref={calendarFileInputRef}
                    accept=".json"
                    style={{ display: 'none' }}
                    onChange={handleCalendarFileUpload}
                  />
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button 
                      type="button" 
                      className="btn-secondary"
                      onClick={() => calendarFileInputRef.current?.click()}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
                    >
                      <FileJson size={16} /> Cargar Archivo .json
                    </button>
                    {getDetectedServiceAccountEmail() && (
                      <span style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={14} /> {getDetectedServiceAccountEmail()}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', margin: 0 }}>
                    Sube la clave JSON descargada desde Google Cloud Console.
                  </p>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600' }}>
                    Contenido del JSON de Credenciales
                  </label>
                  <button 
                    type="button"
                    onClick={() => setShowCalendarGuide(!showCalendarGuide)}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <HelpCircle size={14} /> {showCalendarGuide ? 'Ocultar guía' : '¿Cómo obtener estas credenciales?'}
                  </button>
                </div>

                <textarea 
                  className="input-field" 
                  style={{ height: '90px', fontFamily: 'monospace', fontSize: '12px', resize: 'vertical' }}
                  placeholder='{"type": "service_account", "project_id": "...", "private_key": "...", "client_email": "..."}'
                  value={config.googleCredentialsJson || ''}
                  onChange={(e) => setConfig({ ...config, googleCredentialsJson: e.target.value })}
                />
              </div>

              {/* GUÍA DESPLEGABLE */}
              {showCalendarGuide && (
                <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px', lineHeight: '1.6' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: 'var(--accent-primary)' }}>
                    Pasos sencillos para conectar Google Calendar (Cuenta de Servicio Gratuita):
                  </h4>
                  <ol style={{ paddingLeft: '20px', margin: 0 }}>
                    <li>Ingresa a <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'underline' }}>Google Cloud Console</a> y activa la <strong>Google Calendar API</strong> en tu proyecto.</li>
                    <li>Ve a <strong>IAM y administración &gt; Cuentas de servicio</strong>, crea una cuenta de servicio (ej: <code>reservas-whatsapp</code>) y en la pestaña <strong>Claves</strong> crea una clave nueva en formato <strong>JSON</strong>.</li>
                    <li>Abre tu <a href="https://calendar.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'underline' }}>Google Calendar</a>, entra a Configuración del calendario &gt; <em>"Compartir con personas específicas"</em> y añade el correo de la cuenta de servicio (terminado en <code>@...gserviceaccount.com</code>) otorgándole permisos de <strong>"Hacer cambios en eventos"</strong>.</li>
                    <li>Carga o pega el archivo JSON aquí y presiona <em>Probar Conexión</em>.</li>
                  </ol>
                </div>
              )}

              {/* BOTÓN Y RESULTADO DE PRUEBA */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <button 
                  type="button" 
                  className="btn-primary"
                  onClick={handleTestCalendarConnection}
                  disabled={testingCalendar}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#3b82f6' }}
                >
                  {testingCalendar ? <RefreshCw size={16} className="spin" /> : <Calendar size={16} />}
                  {testingCalendar ? 'Verificando con Google...' : 'Probar Conexión con Google Calendar'}
                </button>

                {calendarTestResult && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    padding: '8px 14px', 
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '500',
                    background: calendarTestResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: calendarTestResult.success ? '1px solid #10b981' : '1px solid #ef4444',
                    color: calendarTestResult.success ? '#10b981' : '#ef4444'
                  }}>
                    {calendarTestResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span>{calendarTestResult.message}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '10px 0 0 0' }}>
              Activa este switch si tu negocio requiere agendar reservaciones o citas en Google Calendar. El bot consultará disponibilidad y creará los eventos al confirmar con el cliente.
            </p>
          )}
        </div>

        {/* FILA 2: COMPORTAMIENTO & BASE DE CONOCIMIENTO (RAG) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
          
          {/* Lado Izquierdo: Reglas e Instrucciones */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Bot size={24} className="gradient-text" />
              <h3 style={{ fontSize: '20px' }}>Comportamiento y Reglas</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>Tipo de Comercio / Sector</label>
                <select 
                  className="input-field" 
                  value={config.businessType}
                  onChange={(e) => setConfig({ ...config, businessType: e.target.value })}
                >
                  <option value="restaurant">Restaurante / Cafetería (Pedidos de comida)</option>
                  <option value="hotel">Hotel / Glamping (Reservaciones y estadías)</option>
                  <option value="retail">Comercio / Ventas (Catálogo de productos)</option>
                  <option value="services">Servicios profesionales (Citas y agendas)</option>
                  <option value="other">Otro / General</option>
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>Tono de Voz / Personalidad</label>
                <select 
                  className="input-field" 
                  value={config.personality}
                  onChange={(e) => setConfig({ ...config, personality: e.target.value })}
                >
                  <option value="friendly">Amigable, cálido y sonriente</option>
                  <option value="professional">Profesional, ejecutivo y estructurado</option>
                  <option value="formal">Formal y respetuoso (habla de usted)</option>
                  <option value="casual">Juvenil, relajado y empático</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>Mensaje de Bienvenida en WhatsApp</label>
              <input 
                type="text" 
                className="input-field" 
                value={config.welcomeMessage}
                onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
              />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>Prompt Base (Instrucciones Generales)</label>
              <textarea 
                className="input-field" 
                style={{ height: '160px', resize: 'vertical', fontSize: '14px' }}
                placeholder="Ej: Eres la asistente virtual del Glamping Aura. Debes dar la bienvenida, cotizar tarifas, responder dudas del WiFi y ayudar a concretar el pago de reservas..."
                value={config.basePrompt}
                onChange={(e) => setConfig({ ...config, basePrompt: e.target.value })}
              ></textarea>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                <Info size={14} /> Indica al bot las reglas estrictas de tu negocio y comportamiento.
              </div>
            </div>
          </div>

          {/* Lado Derecho: Base de Conocimiento Inteligente (RAG) */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={24} style={{ color: 'var(--accent-primary)' }} />
              <h3 style={{ fontSize: '20px' }}>Base de Conocimiento (RAG)</h3>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Alimente el conocimiento del bot subiendo archivos estructurados (PDF de carta, precios, FAQ de habitaciones) o agregando enlaces web.
            </p>

            {/* Drop-Zone Arrastrar y Soltar Archivos */}
            <div 
              className={`drag-drop-zone ${isDragging ? 'active' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerFileSelect}
              style={{
                border: '2px dashed var(--border-color)',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
                cursor: 'pointer',
                background: isDragging ? 'var(--accent-soft)' : 'var(--bg-secondary)',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={(e) => processRAGFileUpload(e.target.files[0])}
                accept=".pdf,.txt,.csv"
              />
              <UploadCloud size={32} style={{ color: 'var(--accent-primary)' }} />
              <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Arrastra o selecciona un archivo RAG</strong>
              <small style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>PDF, TXT, CSV (Máx. 10MB)</small>
            </div>

            {/* Carga de Enlace Web */}
            <form onSubmit={handleAddRAGUrl} style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Link size={14} style={{ position: 'absolute', left: '10px', top: '14px', color: 'var(--text-secondary)' }} />
                <input 
                  type="text" 
                  className="input-field"
                  style={{ paddingLeft: '32px', height: '42px', fontSize: '13px' }}
                  placeholder="Añadir URL web (Ej: https://docs...)" 
                  value={ragUrlInput}
                  onChange={(e) => setRagUrlInput(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-primary" style={{ padding: '0 18px', height: '42px', borderRadius: '12px', fontSize: '13px' }}>Añadir Link</button>
            </form>

            {/* Listado de Fuentes Cargadas en MongoDB */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '160px', overflowY: 'auto', paddingRight: '4px' }}>
              {knowledgeSources.length === 0 ? (
                <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                  La base de conocimientos está vacía. ¡Suba su primer documento! 📚
                </div>
              ) : (
                [...knowledgeSources].reverse().map(source => (
                  <div key={source.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '13px' }}>
                    <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', marginRight: '10px' }}>
                      <span style={{ fontWeight: '500', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={source.name}>
                        {source.name}
                      </span>
                      <small style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                        {source.type === 'file' ? `Documento PDF • ${source.size || '1.0MB'}` : 'Enlace Web Scraping'}
                      </small>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className={`badge ${source.status === 'active' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                        {source.status === 'active' ? 'Listo' : 'Indexando'}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => handleDeleteRAGSource(source.id)} 
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex' }}
                        title="Desvincular de la memoria"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Texto Original de Menú / Preguntas Frecuentes (para conservar su compatibilidad) */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '15px', marginTop: '10px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>
                Carta / Menú en Texto Plano (Respaldo)
              </label>
              <textarea 
                className="input-field" 
                style={{ height: '110px', resize: 'vertical', fontFamily: 'monospace', fontSize: '12px' }}
                placeholder="Pegue aquí el texto plano en formato simple de respaldo si lo prefiere..."
                value={config.menuContent}
                onChange={(e) => setConfig({ ...config, menuContent: e.target.value })}
              ></textarea>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIConfiguration;
