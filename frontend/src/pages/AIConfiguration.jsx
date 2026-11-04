import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  Save, 
  Bot, 
  FileText, 
  Info, 
  Key, 
  Cpu, 
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
  FileJson,
  HelpCircle
} from 'lucide-react';
import axios from 'axios';

const renderModelOptions = (aiProvider) => {
  switch (aiProvider) {
    case 'gemini':
      return (
        <>
          <option value="gemini-flash-lite-latest">Gemini Flash Lite (Recomendado - Ultra rápido y alta cuota)</option>
          <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</option>
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

const getDetectedServiceAccountEmail = (jsonStr) => {
  if (!jsonStr) return '';
  try {
    const parsed = JSON.parse(jsonStr);
    return parsed.client_email || '';
  } catch {
    return '';
  }
};

const ProviderConnectionCard = ({ config, setConfig }) => (
  <div className="glass-card">
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
      <Cpu size={24} className="gradient-text" />
      <h3 style={{ fontSize: '20px' }}>Proveedor y Conexión</h3>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
      <div>
        <label htmlFor="ai-provider-select" style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>Proveedor de IA</label>
        <select 
          id="ai-provider-select"
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
        <label htmlFor="ai-model-select" style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>Modelo</label>
        <select 
          id="ai-model-select"
          className="input-field" 
          value={config.aiModel}
          onChange={(e) => setConfig({ ...config, aiModel: e.target.value })}
        >
          {renderModelOptions(config.aiProvider)}
        </select>
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
      <div>
        <label htmlFor="ai-api-key" style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>API Key (Opcional - Usará la del sistema si se omite)</label>
        <div style={{ position: 'relative' }}>
          <Key size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-secondary)' }} />
          <input 
            id="ai-api-key"
            name="ai-provider-api-key"
            type="password" 
            autoComplete="new-password"
            className="input-field" 
            style={{ paddingLeft: '35px' }}
            placeholder="Dejar vacío para usar clave por defecto..."
            value={config.apiKey}
            onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label htmlFor="ai-temperature" style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>Temperatura / Creatividad: {config.temperature}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', height: '42px' }}>
          <input 
            id="ai-temperature"
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
);

const QrGatewayContent = ({ isBaileys, whatsappConnected, whatsappNumber, qrState }) => {
  if (whatsappConnected) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '10px 0' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          {isBaileys
            ? 'Este agente está vinculado vía Baileys (WebSockets directos sin Chromium, ultra bajo consumo de RAM en Raspberry Pi).'
            : 'Este agente está vinculado activamente vía WhatsApp Web (Chromium) y procesará conversaciones reactivamente.'}
        </p>
        <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} style={{ color: '#10b981' }} />
          <span>Número Vinculado: <strong style={{ color: 'var(--text-primary)' }}>{whatsappNumber}</strong></span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
        {isBaileys
          ? '⚡ Modo Ligero Escanea el QR.'
          : '🖥️ Modo Chromium: Escanea el código QR usando el motor tradicional whatsapp-web.js.'}
      </p>

      {qrState.status === 'loading' && (
        <div className="qr-box-container" style={{ background: 'var(--bg-secondary)', height: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}>
          <RefreshCw size={24} className="animate-spin" style={{ animation: 'spin 1.5s linear infinite', color: 'var(--accent-primary)' }} />
          <small style={{ marginTop: '10px', color: 'var(--text-secondary)' }}>
            {isBaileys
              ? 'Generando código QR ligero con Baileys (sin Chromium)...'
              : 'Iniciando navegador Chromium (whatsapp-web.js)...'}
          </small>
        </div>
      )}

      {qrState.status === 'active' && qrState.url && (
        <div className="qr-box-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#fff', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <img src={qrState.url} alt="WhatsApp QR" style={{ width: '150px', height: '150px', borderRadius: '8px' }} />
          <span style={{ fontSize: '12px', color: '#1e293b', marginTop: '8px', fontWeight: '600' }}>
            ¡Escanea con WhatsApp! ({isBaileys ? 'Baileys Ligero' : 'WhatsApp Web'})
          </span>
        </div>
      )}

      {qrState.status === 'expired' && (
        <div className="qr-box-container" style={{ background: 'var(--bg-secondary)', height: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', border: '1px dashed #ef4444', padding: '16px', textAlign: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#ef4444' }}>Código QR Expirado ⚠️</span>
          <small style={{ color: 'var(--text-secondary)', marginTop: '6px' }}>
            El tiempo de escaneo finalizó. Presiona el botón inferior para generar un nuevo código QR.
          </small>
        </div>
      )}
    </div>
  );
};

const MetaGatewayContent = ({ branch }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
      Credenciales oficiales de WhatsApp Business Cloud API para clientes que han adquirido el sistema:
    </p>
    <div>
      <label htmlFor="meta-phone-id" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600' }}>WhatsApp Phone Number ID</label>
      <input 
        id="meta-phone-id"
        type="text" 
        className="input-field" 
        placeholder="Ej: 1251600254692830"
        value={branch?.whatsappNumberId || ''} 
        readOnly 
      />
    </div>
    <div>
      <label htmlFor="meta-verify-token" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600' }}>Webhook Verify Token</label>
      <input 
        id="meta-verify-token"
        type="text" 
        className="input-field" 
        value={branch?.whatsappVerifyToken || ''} 
        readOnly 
      />
    </div>
  </div>
);

const WhatsAppLinkerCard = ({
  config,
  setConfig,
  branch,
  whatsappConnected,
  whatsappNumber,
  qrState,
  disconnecting,
  onConnectWhatsApp,
  onDisconnectWhatsApp
}) => {
  const isQrGateway = config.gatewayType === 'baileys' || config.gatewayType === 'whatsapp_web';
  const isBaileys = config.gatewayType === 'baileys';

  return (
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

        <div style={{ marginBottom: '16px' }}>
          <span style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>Método de Conexión</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setConfig({ ...config, gatewayType: 'baileys' })}
              className={isQrGateway ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '8px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              title="Conecta por WebSockets directos sin abrir Chromium (~30MB RAM). Ideal para Raspberry Pi."
            >
              <Zap size={15} /> Baileys QR (Ligero / Pi)
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

        {isQrGateway ? (
          <QrGatewayContent
            isBaileys={isBaileys}
            whatsappConnected={whatsappConnected}
            whatsappNumber={whatsappNumber}
            qrState={qrState}
          />
        ) : (
          <MetaGatewayContent branch={branch} />
        )}
      </div>

      {isQrGateway && (
        <div style={{ marginTop: '20px' }}>
          {whatsappConnected ? (
            <button type="button" onClick={onDisconnectWhatsApp} disabled={disconnecting} className="btn-secondary" style={{ width: '100%', borderColor: '#ef4444', color: '#ef4444', display: 'flex', justifyContent: 'center' }}>
              {disconnecting ? 'Desconectando...' : 'Desconectar Sesión de WhatsApp'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onConnectWhatsApp(qrState.status !== 'idle')}
              disabled={qrState.status === 'loading'}
              className="btn-primary"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {qrState.status === 'loading' ? (
                <>
                  <RefreshCw size={16} style={{ animation: 'spin 1.5s linear infinite' }} />
                  Generando Código QR...
                </>
              ) : qrState.status === 'active' || qrState.status === 'expired' ? (
                <>
                  <RefreshCw size={16} />
                  Generar Nuevo Código QR
                </>
              ) : (
                isBaileys ? 'Vincular con Baileys (QR Ligero)' : 'Vincular con WhatsApp Web (QR Chromium)'
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const TestAndOptimizationCard = ({ config, setConfig, branchId, token }) => {
  const [savingTest, setSavingTest] = useState(false);
  const [testSavedMsg, setTestSavedMsg] = useState('');
  const debounceTimerRef = useRef(null);

  const persistTestFields = async (patch) => {
    if (!branchId || !token) return;
    setSavingTest(true);
    try {
      const authConfig = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(`/api/branch/${branchId}/ai-config`, patch, authConfig);
      setTestSavedMsg('Guardado en la sucursal ✓');
      setTimeout(() => setTestSavedMsg(''), 3500);
    } catch (err) {
      console.error('Error guardando Modo Pruebas:', err);
    } finally {
      setSavingTest(false);
    }
  };

  const scheduleTestSave = (patch) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      persistTestFields(patch);
    }, 600);
  };

  return (
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {testSavedMsg && (
            <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>
              {testSavedMsg}
            </span>
          )}
          <label htmlFor="ai-test-mode-toggle" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', background: 'var(--bg-secondary)', padding: '6px 14px', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
            <input 
              id="ai-test-mode-toggle"
              type="checkbox" 
              checked={Boolean(config.testMode)} 
              onChange={(e) => {
                const checked = e.target.checked;
                setConfig(prev => ({ ...prev, testMode: checked }));
                persistTestFields({ testMode: checked, testPhoneNumber: config.testPhoneNumber || '' });
              }}
              style={{ width: '18px', height: '18px', accentColor: '#10b981' }}
            />
            <span style={{ color: config.testMode ? '#10b981' : 'var(--text-secondary)' }}>
              {config.testMode ? '🛡️ Modo Pruebas Activo' : 'Modo Pruebas Inactivo'}
            </span>
          </label>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '24px', alignItems: 'start' }}>
        <div>
          <label htmlFor="ai-test-phone" style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>
            <Phone size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
            Número Telefónico, Usuario o Nombre de WhatsApp para la Prueba
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              id="ai-test-phone"
              type="text" 
              className="input-field" 
              placeholder="Ej: 3113414361, Oscar Henao o +57 311 341 4361"
              value={config.testPhoneNumber || ''}
              onChange={(e) => {
                const val = e.target.value;
                setConfig(prev => ({ ...prev, testPhoneNumber: val }));
                scheduleTestSave({ testPhoneNumber: val, testMode: Boolean(config.testMode) });
              }}
              onBlur={(e) => {
                if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                persistTestFields({ testPhoneNumber: e.target.value, testMode: Boolean(config.testMode) });
              }}
            />
            <button
              type="button"
              className="btn-secondary"
              disabled={savingTest}
              onClick={() => {
                if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                persistTestFields({
                  testMode: Boolean(config.testMode),
                  testPhoneNumber: config.testPhoneNumber || '',
                  conciseMode: Boolean(config.conciseMode),
                  maxOutputTokens: config.maxOutputTokens || 250
                });
              }}
              style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '0 12px' }}
              title="Guardar configuración de Modo Pruebas"
            >
              <Save size={14} /> {savingTest ? '...' : 'Guardar'}
            </button>
          </div>
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
            <label htmlFor="ai-concise-mode" style={{ fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={14} style={{ color: '#f59e0b' }} /> Respuestas Concretas (Ahorro de Mensajes Meta)
            </label>
            <input 
              id="ai-concise-mode"
              type="checkbox" 
              checked={Boolean(config.conciseMode)} 
              onChange={(e) => {
                const checked = e.target.checked;
                setConfig(prev => ({ ...prev, conciseMode: checked }));
                persistTestFields({ conciseMode: checked });
              }}
              style={{ width: '16px', height: '16px', accentColor: '#f59e0b' }}
            />
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 10px 0', lineHeight: '1.4' }}>
            Limita las respuestas a 1-3 frases breves y directas, pidiendo los datos clave de una sola vez para cerrar pedidos/reservas sin intercambios innecesarios ni sobrecostos.
          </p>
          
          <div>
            <label htmlFor="ai-max-tokens" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600' }}>
              Límite de Tokens por Respuesta: {config.maxOutputTokens || 250} tokens (~50-80 palabras)
            </label>
            <input 
              id="ai-max-tokens"
              type="range" 
              min="150" 
              max="500" 
              step="25" 
              value={config.maxOutputTokens || 250}
              onChange={(e) => {
                const tokens = parseInt(e.target.value, 10);
                setConfig(prev => ({ ...prev, maxOutputTokens: tokens }));
                scheduleTestSave({ maxOutputTokens: tokens });
              }}
              style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const CalendarGuideBox = () => (
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
);

const CalendarTestResultBadge = ({ result }) => {
  if (!result) return null;
  const isOk = result.success;
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '8px', 
      padding: '8px 14px', 
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: '500',
      background: isOk ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
      border: isOk ? '1px solid #10b981' : '1px solid #ef4444',
      color: isOk ? '#10b981' : '#ef4444'
    }}>
      {isOk ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      <span>{result.message}</span>
    </div>
  );
};

const CalendarSyncSettings = ({ config, setConfig, branchId, token }) => {
  const [submitting, setSubmitting] = useState(false);
  const [savingCal, setSavingCal] = useState(false);
  const [calSavedMsg, setCalSavedMsg] = useState('');
  const [calendarTestResult, setCalendarTestResult] = useState(null);
  const [showCalendarGuide, setShowCalendarGuide] = useState(false);
  const calendarFileInputRef = useRef(null);
  const testReqIdRef = useRef(0);
  const calDebounceRef = useRef(null);
  const detectedEmail = getDetectedServiceAccountEmail(config.googleCredentialsJson);

  const persistCalendarFields = async (overrides = null) => {
    if (!branchId || !token) return;
    setSavingCal(true);
    try {
      const authConfig = { headers: { Authorization: `Bearer ${token}` } };
      const payload = overrides && Object.keys(overrides).length > 0
        ? overrides
        : {
            calendarSyncEnabled: config.calendarSyncEnabled ?? true,
            googleCalendarId: config.googleCalendarId || 'primary',
            googleCredentialsJson: config.googleCredentialsJson || '',
            googleServiceAccountEmail: config.googleServiceAccountEmail || detectedEmail || ''
          };
      await axios.put(`/api/branch/${branchId}/ai-config`, payload, authConfig);
      setCalSavedMsg('Guardado en la sucursal ✓');
      setTimeout(() => setCalSavedMsg(''), 3500);
    } catch (err) {
      console.error('Error guardando ajustes de Google Calendar:', err);
    } finally {
      setSavingCal(false);
    }
  };

  const scheduleCalendarSave = (patch) => {
    if (calDebounceRef.current) clearTimeout(calDebounceRef.current);
    calDebounceRef.current = setTimeout(() => {
      persistCalendarFields(patch);
    }, 600);
  };

  const handleCalendarFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonContent = event.target.result;
        const parsed = JSON.parse(jsonContent);

        if (!parsed.client_email || !parsed.private_key) {
          alert('El archivo JSON debe contener "client_email" y "private_key". Asegúrate de descargar la clave de Service Account de Google Cloud.');
          return;
        }

        const nextEmail = parsed.client_email || '';
        setConfig(prev => ({
          ...prev,
          calendarSyncEnabled: true,
          googleCredentialsJson: jsonContent,
          googleServiceAccountEmail: nextEmail
        }));
        setCalendarTestResult(null);

        await persistCalendarFields({
          calendarSyncEnabled: true,
          googleCredentialsJson: jsonContent,
          googleServiceAccountEmail: nextEmail
        });
      } catch {
        alert('El archivo no contiene un formato JSON válido.');
      }
    };
    reader.readAsText(file);
  };

  const handleTestCalendarConnection = async () => {
    if (submitting) return;
    if (!config.googleCredentialsJson?.trim()) {
      alert('Debes ingresar o cargar el archivo JSON de credenciales de Google antes de probar.');
      return;
    }
    const currentReqId = ++testReqIdRef.current;
    setSubmitting(true);
    setCalendarTestResult(null);

    try {
      const authConfig = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await axios.post(`/api/branch/${branchId}/calendar/test`, {
        googleCalendarId: config.googleCalendarId || 'primary',
        googleCredentialsJson: config.googleCredentialsJson
      }, authConfig);

      if (currentReqId === testReqIdRef.current) {
        setCalendarTestResult({
          success: true,
          message: data.message || `¡Conexión exitosa con el calendario "${data.summary}"!`
        });
      }
    } catch (error) {
      if (currentReqId === testReqIdRef.current) {
        const errMsg = error.response?.data?.error || error.response?.data?.message || error.message;
        setCalendarTestResult({
          success: false,
          message: errMsg
        });
      }
    } finally {
      if (currentReqId === testReqIdRef.current) {
        setSubmitting(false);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '20px' }}>
        <div>
          <label htmlFor="ai-google-calendar-id" style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>
            ID del Calendario de Google
          </label>
          <input 
            id="ai-google-calendar-id"
            type="text" 
            className="input-field" 
            placeholder="primary o tunegocio@gmail.com"
            value={config.googleCalendarId || 'primary'}
            onChange={(e) => {
              const val = e.target.value;
              setConfig(prev => ({ ...prev, googleCalendarId: val }));
              scheduleCalendarSave({ googleCalendarId: val || 'primary' });
            }}
            onBlur={(e) => {
              if (calDebounceRef.current) clearTimeout(calDebounceRef.current);
              persistCalendarFields({ googleCalendarId: e.target.value || 'primary' });
            }}
          />
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', margin: 0 }}>
            Usa <code>primary</code> para tu calendario principal, o el correo / ID del calendario específico donde se agendarán las reservas.
          </p>
        </div>

        <div>
          <label htmlFor="ai-calendar-file-upload" style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>
            Cargar Credenciales JSON (Cuenta de Servicio)
          </label>
          <input 
            id="ai-calendar-file-upload"
            type="file" 
            ref={calendarFileInputRef}
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleCalendarFileUpload}
          />
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button 
              type="button" 
              className="btn-secondary"
              onClick={() => calendarFileInputRef.current?.click()}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
            >
              <FileJson size={16} /> Cargar Archivo .json
            </button>
            {detectedEmail && (
              <span style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', wordBreak: 'break-all' }}>
                <CheckCircle2 size={14} style={{ flexShrink: 0 }} /> {detectedEmail}
              </span>
            )}
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', margin: 0 }}>
            Sube la clave JSON descargada desde Google Cloud Console.
          </p>
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
          <label htmlFor="ai-google-credentials-json" style={{ fontSize: '13px', fontWeight: '600' }}>
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
          id="ai-google-credentials-json"
          className="input-field" 
          style={{ height: '90px', fontFamily: 'monospace', fontSize: '12px', resize: 'vertical' }}
          placeholder='{"type": "service_account", "project_id": "...", "private_key": "...", "client_email": "..."}'
          value={config.googleCredentialsJson || ''}
          onChange={(e) => {
            const val = e.target.value;
            const email = getDetectedServiceAccountEmail(val);
            setConfig(prev => ({
              ...prev,
              googleCredentialsJson: val,
              googleServiceAccountEmail: email || prev.googleServiceAccountEmail || ''
            }));
            scheduleCalendarSave({
              googleCredentialsJson: val,
              googleServiceAccountEmail: email || config.googleServiceAccountEmail || ''
            });
          }}
          onBlur={(e) => {
            if (calDebounceRef.current) clearTimeout(calDebounceRef.current);
            const val = e.target.value;
            const email = getDetectedServiceAccountEmail(val);
            persistCalendarFields({
              googleCredentialsJson: val,
              googleServiceAccountEmail: email || config.googleServiceAccountEmail || ''
            });
          }}
        />
      </div>

      {showCalendarGuide && <CalendarGuideBox />}

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <button 
          type="button" 
          className="btn-primary"
          onClick={handleTestCalendarConnection}
          disabled={submitting}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#3b82f6' }}
        >
          {submitting ? <RefreshCw size={16} className="spin" /> : <Calendar size={16} />}
          {submitting ? 'Verificando y Guardando...' : 'Probar y Guardar Google Calendar'}
        </button>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => persistCalendarFields()}
          disabled={savingCal}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
        >
          <Save size={15} />
          {savingCal ? 'Guardando...' : 'Guardar Datos de Calendar'}
        </button>

        {calSavedMsg && (
          <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>
            {calSavedMsg}
          </span>
        )}

        <CalendarTestResultBadge result={calendarTestResult} />
      </div>
    </div>
  );
};

const CalendarIntegrationCard = ({ config, setConfig, branchId, token }) => {
  const isEnabled = Boolean(config.calendarSyncEnabled);

  return (
    <div className="glass-card" style={{ 
      border: isEnabled ? '1px solid #3b82f6' : '1px solid var(--border-color)', 
      background: isEnabled ? 'rgba(59, 130, 246, 0.03)' : undefined,
      transition: 'border-color 0.3s ease, background-color 0.3s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Calendar size={24} style={{ color: isEnabled ? '#3b82f6' : 'var(--accent-primary)' }} />
          <div>
            <h3 style={{ fontSize: '18px', margin: 0 }}>Sincronización con Google Calendar</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
              Revisa disponibilidad de fechas en tiempo real y agenda automáticamente las reservaciones confirmadas por WhatsApp.
            </p>
          </div>
        </div>
        <label htmlFor="ai-calendar-sync-toggle" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', background: 'var(--bg-secondary)', padding: '6px 14px', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
          <input 
            id="ai-calendar-sync-toggle"
            type="checkbox" 
            checked={isEnabled} 
            onChange={async (e) => {
              const checked = e.target.checked;
              setConfig({ ...config, calendarSyncEnabled: checked });
              if (branchId && token) {
                try {
                  await axios.put(
                    `/api/branch/${branchId}/ai-config`,
                    { calendarSyncEnabled: checked },
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
                } catch (err) {
                  console.error('Error guardando estado de Google Calendar:', err);
                }
              }
            }}
            style={{ width: '18px', height: '18px', accentColor: '#3b82f6' }}
          />
          <span style={{ color: isEnabled ? '#3b82f6' : 'var(--text-secondary)' }}>
            {isEnabled ? '📅 Google Calendar Activo' : 'Google Calendar Inactivo'}
          </span>
        </label>
      </div>

      {isEnabled ? (
        <CalendarSyncSettings config={config} setConfig={setConfig} branchId={branchId} token={token} />
      ) : (
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '10px 0 0 0' }}>
          Activa este switch si tu negocio requiere agendar reservaciones o citas en Google Calendar. El bot consultará disponibilidad y creará los eventos al confirmar con el cliente.
        </p>
      )}
    </div>
  );
};

const BehaviorRulesCard = ({ config, setConfig }) => (
  <div className="glass-card">
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
      <Bot size={24} className="gradient-text" />
      <h3 style={{ fontSize: '20px' }}>Comportamiento y Reglas</h3>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
      <div>
        <label htmlFor="ai-business-type" style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>Tipo de Comercio / Sector</label>
        <select 
          id="ai-business-type"
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
        <label htmlFor="ai-personality" style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>Tono de Voz / Personalidad</label>
        <select 
          id="ai-personality"
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
      <label htmlFor="ai-welcome-message" style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>Mensaje de Bienvenida en WhatsApp</label>
      <input 
        id="ai-welcome-message"
        type="text" 
        className="input-field" 
        value={config.welcomeMessage}
        onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
      />
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px', padding: '14px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
      <div>
        <label htmlFor="ai-branch-admin-phone" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600' }}>
          <Phone size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
          WhatsApp del Administrador (Escalamiento #ID)
        </label>
        <input 
          id="ai-branch-admin-phone"
          type="text" 
          className="input-field" 
          placeholder="Ej: 573113414361 (Opcional: usa el de la sucursal)"
          value={config.branchAdminPhone || ''}
          onChange={(e) => setConfig({ ...config, branchAdminPhone: e.target.value })}
        />
        <small style={{ display: 'block', marginTop: '6px', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
          Cuando el bot no sepa responder algo, enviará la pregunta con un <strong>#ID</strong> a este WhatsApp. El admin responde <code>#ID respuesta</code> y el bot se la entrega al cliente.
        </small>
      </div>

      <div>
        <label htmlFor="ai-post-order-pause" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600' }}>
          Pausa Automática Post-Cierre
        </label>
        {config.businessType === 'hotel' ? (
          <div style={{ padding: '10px 12px', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.3)', fontSize: '12px', lineHeight: '1.4', color: 'var(--text-primary)' }}>
            🏨 <strong>Modo Hotel Activo:</strong> Al confirmar una reserva, el bot agenda en Google Calendar y <strong>se hace a un lado automáticamente hasta finalizar el Check-Out</strong> del huésped.
          </div>
        ) : (
          <>
            <input 
              id="ai-post-order-pause"
              type="number" 
              min="5"
              max="1440"
              className="input-field" 
              value={config.postOrderPauseMinutes ?? 40}
              onChange={(e) => setConfig({ ...config, postOrderPauseMinutes: parseInt(e.target.value, 10) || 40 })}
            />
            <small style={{ display: 'block', marginTop: '6px', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Minutos que el bot se hace a un lado tras confirmar un pedido (por defecto <strong>40 min</strong> mientras se entrega el pedido).
            </small>
          </>
        )}
      </div>
    </div>

    <div style={{ marginBottom: '10px' }}>
      <label htmlFor="ai-base-prompt" style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>Prompt Base (Instrucciones Generales)</label>
      <textarea 
        id="ai-base-prompt"
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
);

const KnowledgeBaseCard = ({
  config,
  setConfig,
  branchId,
  token,
  knowledgeSources,
  setKnowledgeSources
}) => {
  const [ragUrlInput, setRagUrlInput] = useState('');
  const [docAliasInput, setDocAliasInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleInsertIntoPrompt = (source) => {
    const label = source.alias || source.name;
    const ruleSnippet = source.type === 'file'
      ? `\n- Cuando el cliente consulte o pida información sobre "${label}", respóndele amablemente y envíale el documento "${source.name}".`
      : `\n- Cuando el cliente consulte sobre "${label}", compártele el enlace: ${source.name}`;

    setConfig(prev => ({
      ...prev,
      basePrompt: (prev.basePrompt || '').trim() + '\n' + ruleSnippet.trim()
    }));
  };

  const processRAGFileUpload = (file) => {
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isAllowed =
      file.type === 'application/pdf' ||
      file.type === 'text/plain' ||
      file.type === 'text/csv' ||
      file.type.startsWith('image/') ||
      lowerName.endsWith('.pdf') ||
      lowerName.endsWith('.txt') ||
      lowerName.endsWith('.csv') ||
      lowerName.endsWith('.jpg') ||
      lowerName.endsWith('.jpeg') ||
      lowerName.endsWith('.png') ||
      lowerName.endsWith('.webp');

    if (!isAllowed) {
      alert('Sube un archivo válido (PDF, TXT, CSV o Imagen JPG/PNG).');
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      alert('El archivo supera el límite de 12MB.');
      return;
    }

    const readableSize = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
    const chosenAlias = docAliasInput.trim() || file.name.replace(/\.[^/.]+$/, '');
    setUploadingFile(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const base64Data = event.target.result;
        const authConfig = { headers: { Authorization: `Bearer ${token}` } };
        const { data } = await axios.post(
          `/api/branch/${branchId}/upload`,
          {
            fileName: file.name,
            mimeType: file.type || 'application/pdf',
            size: readableSize,
            alias: chosenAlias,
            fileDataBase64: base64Data
          },
          authConfig
        );

        setKnowledgeSources(prev => {
          const filtered = prev.filter(s => !(s.type === 'file' && s.name.toLowerCase() === file.name.toLowerCase()));
          return [...filtered, data];
        });
        setDocAliasInput('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err) {
        console.error('Error subiendo documento:', err);
        alert('Error al guardar el documento: ' + (err.response?.data?.message || err.message));
      } finally {
        setUploadingFile(false);
      }
    };
    reader.onerror = () => {
      setUploadingFile(false);
      alert('No se pudo leer el archivo seleccionado.');
    };
    reader.readAsDataURL(file);
  };

  const handleAddRAGUrl = async (e) => {
    e.preventDefault();
    if (submitting || !ragUrlInput.trim()) return;

    const url = ragUrlInput.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      alert('Introduce una URL válida que empiece por http:// o https://');
      return;
    }

    setSubmitting(true);
    try {
      const authConfig = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await axios.post(
        `/api/branch/${branchId}/url`,
        { url, alias: docAliasInput.trim() || url },
        authConfig
      );
      setKnowledgeSources(prev => [...prev, data]);
      setRagUrlInput('');
      setDocAliasInput('');
    } catch (err) {
      alert('Error al guardar el enlace: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRAGSource = async (sourceId) => {
    if (window.confirm('¿Seguro que deseas eliminar este documento de la sucursal?')) {
      try {
        const authConfig = { headers: { Authorization: `Bearer ${token}` } };
        await axios.delete(`/api/branch/${branchId}/sources/${sourceId}`, authConfig);
        setKnowledgeSources(prev => prev.filter(s => s.id !== sourceId));
      } catch (err) {
        alert('Error al eliminar el documento: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileText size={24} style={{ color: 'var(--accent-primary)' }} />
          <h3 style={{ fontSize: '20px', margin: 0 }}>Base de Conocimiento y Documentos (RAG)</h3>
        </div>
        <span className="badge badge-success" style={{ fontSize: '11px' }}>
          {knowledgeSources.length} {knowledgeSources.length === 1 ? 'documento cargado' : 'documentos cargados'}
        </span>
      </div>

      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4', margin: 0 }}>
        Sube documentos (ej. <strong>Políticas de Mascotas</strong>, <strong>Menú del Restaurante en PDF</strong>, tarifarios) y referéncialos en el Prompt para que el agente los envíe automáticamente por WhatsApp al cliente cuando corresponda.
      </p>

      <div>
        <label htmlFor="ai-doc-alias-input" style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600' }}>
          Etiqueta o Tema del Documento antes de subirlo (Opcional)
        </label>
        <input
          id="ai-doc-alias-input"
          type="text"
          className="input-field"
          style={{ height: '38px', fontSize: '13px' }}
          placeholder="Ej: Políticas para Mascotas, Menú Restaurante, Catálogo Suites..."
          value={docAliasInput}
          onChange={(e) => setDocAliasInput(e.target.value)}
        />
      </div>

      <div 
        className={`drag-drop-zone ${isDragging ? 'active' : ''}`}
        role="button"
        tabIndex={0}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files?.[0]) processRAGFileUpload(e.dataTransfer.files[0]);
        }}
        onClick={() => !uploadingFile && fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!uploadingFile) fileInputRef.current?.click();
          }
        }}
        style={{
          border: '2px dashed var(--border-color)',
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center',
          cursor: uploadingFile ? 'wait' : 'pointer',
          background: isDragging ? 'var(--accent-soft)' : 'var(--bg-secondary)',
          transition: 'background-color 0.2s, border-color 0.2s',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <label htmlFor="ai-rag-file-upload" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
          Archivo RAG
        </label>
        <input 
          id="ai-rag-file-upload"
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={(e) => processRAGFileUpload(e.target.files?.[0])}
          accept=".pdf,.txt,.csv,.jpg,.jpeg,.png,.webp"
        />
        <UploadCloud size={28} style={{ color: 'var(--accent-primary)' }} />
        <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
          {uploadingFile ? 'Subiendo y guardando documento...' : 'Haz clic o arrastra un documento aquí para cargarlo'}
        </strong>
        <small style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>PDF, Imágenes (JPG/PNG), TXT, CSV (Máx. 12MB)</small>
      </div>

      <form onSubmit={handleAddRAGUrl} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px', position: 'relative' }}>
          <label htmlFor="ai-rag-url-input" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
            URL Web para RAG
          </label>
          <Link size={14} style={{ position: 'absolute', left: '10px', top: '14px', color: 'var(--text-secondary)' }} />
          <input 
            id="ai-rag-url-input"
            type="text" 
            className="input-field"
            style={{ paddingLeft: '32px', height: '42px', fontSize: '13px' }}
            placeholder="Añadir URL web o catálogo (Ej: https://...)" 
            value={ragUrlInput}
            onChange={(e) => setRagUrlInput(e.target.value)}
          />
        </div>
        <button type="submit" disabled={submitting} className="btn-primary" style={{ padding: '0 18px', height: '42px', borderRadius: '12px', fontSize: '13px', flexShrink: 0, justifyContent: 'center' }}>
          {submitting ? 'Añadiendo...' : 'Añadir Link'}
        </button>
      </form>

      <div>
        <span style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
          Documentos Cargados en esta Sucursal ({knowledgeSources.length}):
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto', paddingRight: '4px' }}>
          {knowledgeSources.length === 0 ? (
            <div style={{ padding: '14px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
              No has cargado ningún documento en esta sucursal todavía. Sube tu primer PDF o menú arriba 📚
            </div>
          ) : (
            [...knowledgeSources].reverse().map(source => (
              <div key={source.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '13px', flexWrap: 'wrap' }}>
                <div style={{ minWidth: '140px', flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontWeight: '600', color: 'var(--text-primary)', wordBreak: 'break-word' }} title={source.name}>
                    📄 {source.name}
                  </span>
                  <small style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {source.alias && source.alias !== source.name ? `Tema: "${source.alias}" • ` : ''}
                    {source.type === 'file' ? `Archivo adjuntable • ${source.size || 'PDF'}` : 'Enlace Web'}
                  </small>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => handleInsertIntoPrompt(source)}
                    style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '8px' }}
                    title="Inserta una regla en el Prompt Base para que el bot envíe este documento al cliente"
                  >
                    ➕ Referenciar en Prompt
                  </button>
                  <span className="badge badge-success" style={{ fontSize: '10px', padding: '2px 6px' }}>
                    Cargado
                  </span>
                  <button 
                    type="button" 
                    onClick={() => handleDeleteRAGSource(source.id)} 
                    aria-label={`Eliminar recurso ${source.name}`}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex' }}
                    title="Eliminar documento"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '15px', marginTop: '4px' }}>
        <label htmlFor="ai-menu-content" style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>
          Carta / Menú o Tarifario en Texto Plano (Respaldo)
        </label>
        <textarea 
          id="ai-menu-content"
          className="input-field" 
          style={{ height: '110px', resize: 'vertical', fontFamily: 'monospace', fontSize: '12px' }}
          placeholder="Pegue aquí el texto plano en formato simple de respaldo si lo prefiere..."
          value={config.menuContent}
          onChange={(e) => setConfig({ ...config, menuContent: e.target.value })}
        ></textarea>
      </div>
    </div>
  );
};

const DEFAULT_AI_CONFIG = {
  aiProvider: 'gemini',
  aiModel: 'gemini-flash-lite-latest',
  apiKey: '',
  temperature: 0.4,
  businessType: 'other',
  personality: 'friendly',
  basePrompt: '',
  menuContent: '',
  welcomeMessage: '¡Hola! ¿En qué puedo ayudarte hoy?',
  branchAdminPhone: '',
  postOrderPauseMinutes: 40,
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
};

const AIConfiguration = () => {
  const { branchId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaveMsg, setAutoSaveMsg] = useState('');
  const [branch, setBranch] = useState(null);
  const [config, setConfigState] = useState(DEFAULT_AI_CONFIG);
  const latestConfigRef = useRef(DEFAULT_AI_CONFIG);
  const isDirtyRef = useRef(false);
  const globalAutoSaveTimerRef = useRef(null);

  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [qrState, setQrState] = useState({ url: null, secondsLeft: 60, status: 'idle' });
  const [disconnecting, setDisconnecting] = useState(false);
  const qrTimerRef = useRef(null);
  const [knowledgeSources, setKnowledgeSources] = useState([]);

  const flushPendingSave = async (customPayload = null) => {
    if (!branchId || !user?.token) return;
    if (globalAutoSaveTimerRef.current) {
      clearTimeout(globalAutoSaveTimerRef.current);
      globalAutoSaveTimerRef.current = null;
    }
    const payloadToSave = customPayload || latestConfigRef.current;
    isDirtyRef.current = false;
    try {
      const authConfig = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.put(`/api/branch/${branchId}/ai-config`, payloadToSave, authConfig);
      setAutoSaveMsg('Cambios guardados automáticamente ✓');
      setTimeout(() => setAutoSaveMsg(''), 3000);
    } catch (err) {
      console.error('Error en autoguardado de configuración IA:', err);
    }
  };

  // Wrapper de setConfig que sincroniza latestConfigRef y agenda autoguardado tras cambios del usuario
  const setConfig = (updater) => {
    setConfigState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      latestConfigRef.current = next;
      return next;
    });
    isDirtyRef.current = true;
    if (globalAutoSaveTimerRef.current) {
      clearTimeout(globalAutoSaveTimerRef.current);
    }
    globalAutoSaveTimerRef.current = setTimeout(() => {
      flushPendingSave();
    }, 700);
  };

  const startQrPolling = (authConfig) => {
    if (qrTimerRef.current) clearInterval(qrTimerRef.current);

    qrTimerRef.current = setInterval(async () => {
      try {
        const res = await axios.get(`/api/gateway/${branchId}/status`, authConfig);
        const data = res.data;

        if (data.status === 'qr_ready' && data.qrImage) {
          setQrState(prev => ({
            url: data.qrImage,
            secondsLeft: prev.secondsLeft > 2 ? prev.secondsLeft - 2 : 1,
            status: 'active'
          }));
        } else if (data.status === 'connected') {
          clearInterval(qrTimerRef.current);
          qrTimerRef.current = null;
          setWhatsappConnected(true);
          setWhatsappNumber(data.connectedPhone || '');
          setQrState({ url: null, secondsLeft: 0, status: 'idle' });
          alert('¡WhatsApp vinculado exitosamente! El bot está listo para responder.');
        } else if (data.status === 'error' || data.status === 'disconnected') {
          clearInterval(qrTimerRef.current);
          qrTimerRef.current = null;
          setQrState({ url: null, secondsLeft: 0, status: 'expired' });
        }
      } catch (pollErr) {
        console.error('Error consultando estado de WhatsApp:', pollErr);
      }
    }, 2500);
  };

  useEffect(() => {
    if (!user?.token || !branchId) return;
    let ignore = false;
    const authConfig = { headers: { Authorization: `Bearer ${user.token}` } };

    axios.get(`/api/branch/${branchId}`, { ...authConfig, params: { _t: Date.now() } })
      .then(({ data }) => {
        if (ignore) return;
        setBranch(data.branch);
        if (data.aiConfig) {
          setConfigState(prev => {
            const merged = {
              ...prev,
              ...data.aiConfig,
              gatewayType: data.aiConfig.gatewayType || data.branch?.gatewayType || 'baileys'
            };
            latestConfigRef.current = merged;
            return merged;
          });
        }

        const fallbackConnected = data.branch?.whatsappConnected || false;
        const fallbackPhone = data.branch?.whatsappPhoneNumber || '';

        axios.get(`/api/gateway/${branchId}/status`, authConfig)
          .then((gwRes) => {
            if (ignore) return;
            if (gwRes.data?.gatewayType) {
              setConfigState(prev => {
                const merged = { ...prev, gatewayType: gwRes.data.gatewayType };
                latestConfigRef.current = merged;
                return merged;
              });
            }
            if (gwRes.data?.status === 'connected') {
              setWhatsappConnected(true);
              setWhatsappNumber(gwRes.data.connectedPhone || fallbackPhone);
            } else {
              setWhatsappConnected(fallbackConnected);
              setWhatsappNumber(fallbackPhone);
              if (gwRes.data?.status === 'qr_ready' && gwRes.data?.qrImage) {
                setQrState({ url: gwRes.data.qrImage, secondsLeft: 60, status: 'active' });
                startQrPolling(authConfig);
              } else if (gwRes.data?.status === 'initializing') {
                setQrState({ url: null, secondsLeft: 180, status: 'loading' });
                startQrPolling(authConfig);
              }
            }
          })
          .catch(() => {
            if (!ignore) {
              setWhatsappConnected(fallbackConnected);
              setWhatsappNumber(fallbackPhone);
            }
          });

        if (Array.isArray(data.aiConfig?.knowledgeSources)) {
          setKnowledgeSources(data.aiConfig.knowledgeSources);
        }

        axios.get(`/api/branch/${branchId}/sources`, { ...authConfig, params: { _t: Date.now() } })
          .then((resSources) => {
            if (!ignore && Array.isArray(resSources.data)) {
              setKnowledgeSources(resSources.data);
            }
          })
          .catch((srcErr) => {
            console.warn('No se pudieron consultar documentos adicionales:', srcErr.message);
          });

        setLoading(false);
      })
      .catch((error) => {
        if (!ignore) {
          console.error('Error fetching AI config:', error);
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
      if (qrTimerRef.current) clearInterval(qrTimerRef.current);
      if (globalAutoSaveTimerRef.current) clearTimeout(globalAutoSaveTimerRef.current);
    };
  }, [branchId, user?.token]);

  const handleSave = async () => {
    if (saving) return;
    if (globalAutoSaveTimerRef.current) {
      clearTimeout(globalAutoSaveTimerRef.current);
      globalAutoSaveTimerRef.current = null;
    }
    setSaving(true);
    try {
      const authConfig = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.put(`/api/branch/${branchId}/ai-config`, latestConfigRef.current, authConfig);
      isDirtyRef.current = false;
      setAutoSaveMsg('Cambios guardados ✓');
      setTimeout(() => setAutoSaveMsg(''), 3000);
      alert('Configuración de Inteligencia Artificial guardada correctamente');
    } catch (error) {
      console.error('Error saving AI config:', error);
      alert('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = async () => {
    if (isDirtyRef.current || globalAutoSaveTimerRef.current) {
      await flushPendingSave();
    }
    navigate(-1);
  };

  const handleConnectWhatsApp = async (forceNew = false) => {
    if (qrState.status === 'loading') return;
    setQrState({ url: null, secondsLeft: 180, status: 'loading' });
    
    try {
      const authConfig = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data: initData } = await axios.post(
        `/api/gateway/${branchId}/qr`,
        { gatewayType: 'baileys', forceNew: Boolean(forceNew) },
        authConfig
      );

      if (initData?.status === 'qr_ready' && initData?.qrImage && !forceNew) {
        setQrState({ url: initData.qrImage, secondsLeft: 60, status: 'active' });
      }

      startQrPolling(authConfig);
    } catch (err) {
      console.error('Error iniciando WhatsApp:', err);
      alert('Error al iniciar WhatsApp: ' + (err.response?.data?.message || err.message));
      setQrState({ url: null, secondsLeft: 0, status: 'idle' });
    }
  };

  const handleDisconnectWhatsApp = async () => {
    if (disconnecting) return;
    if (!window.confirm('¿Seguro que deseas desvincular la cuenta de WhatsApp? El bot dejará de responder a los clientes.')) return;
    setDisconnecting(true);
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
    } catch {
      alert('Ocurrió un error al desvincular la sesión.');
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '100px' }}>Cargando Configuración del Agente...</div>;

  return (
    <div className="container" style={{ paddingBottom: '60px' }}>
      <button type="button" onClick={handleBack} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <ArrowLeft size={18} /> Volver
      </button>

      <div className="page-header">
        <div>
          <h2 style={{ fontSize: '28px', mdFontSize: '32px' }}>Ajustes del Agente AI: {branch?.name}</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Define las reglas de negocio, vincula el canal de WhatsApp y alimenta el conocimiento RAG en caliente</p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {autoSaveMsg && (
            <span style={{ fontSize: '13px', color: '#10b981', fontWeight: '600' }}>
              {autoSaveMsg}
            </span>
          )}
          <button type="button" onClick={handleSave} className="btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Save size={18} /> {saving ? 'Guardando...' : 'Guardar Ajustes'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        <div className="ai-config-grid">
          <ProviderConnectionCard config={config} setConfig={setConfig} />
          <WhatsAppLinkerCard 
            config={config}
            setConfig={setConfig}
            branch={branch}
            whatsappConnected={whatsappConnected}
            whatsappNumber={whatsappNumber}
            qrState={qrState}
            disconnecting={disconnecting}
            onConnectWhatsApp={handleConnectWhatsApp}
            onDisconnectWhatsApp={handleDisconnectWhatsApp}
          />
        </div>

        <TestAndOptimizationCard
          config={config}
          setConfig={setConfig}
          branchId={branchId}
          token={user?.token}
        />

        <CalendarIntegrationCard 
          config={config}
          setConfig={setConfig}
          branchId={branchId}
          token={user?.token}
        />

        <div className="ai-config-grid">
          <BehaviorRulesCard config={config} setConfig={setConfig} />
          <KnowledgeBaseCard 
            config={config}
            setConfig={setConfig}
            branchId={branchId}
            token={user?.token}
            knowledgeSources={knowledgeSources}
            setKnowledgeSources={setKnowledgeSources}
          />
        </div>
      </div>
    </div>
  );
};

export default AIConfiguration;

