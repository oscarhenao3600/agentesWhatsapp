import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Lock, User, Eye, EyeOff } from 'lucide-react';

const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      return setError('Las contraseñas no coinciden');
    }

    const result = await register(username, password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <UserPlus size={48} className="gradient-text" style={{ marginBottom: '10px' }} />
          <h2 style={{ fontSize: '24px' }}>Crea tu cuenta</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Únete para gestionar tus agentes de IA</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="register-username" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Usuario</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                id="register-username"
                type="text"
                placeholder="Elige un nombre de usuario"
                className="input-field"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ paddingLeft: '40px' }}
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="register-password" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Contraseña</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '40px', paddingRight: '40px' }}
                required
              />
              <button
                type="button"
                onMouseEnter={() => setShowPassword(true)}
                onMouseLeave={() => setShowPassword(false)}
                onClick={() => setShowPassword((prev) => !prev)}
                title="Pasa el cursor o haz clic para ver la contraseña"
                aria-label="Ver contraseña"
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: showPassword ? 'var(--primary-color, #25D366)' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0
                }}
              >
                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="register-confirm-password" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Confirmar Contraseña</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                id="register-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="input-field"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ paddingLeft: '40px', paddingRight: '40px' }}
                required
              />
              <button
                type="button"
                onMouseEnter={() => setShowConfirmPassword(true)}
                onMouseLeave={() => setShowConfirmPassword(false)}
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                title="Pasa el cursor o haz clic para ver la confirmación"
                aria-label="Ver confirmación de contraseña"
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: showConfirmPassword ? 'var(--primary-color, #25D366)' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0
                }}
              >
                {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
          </div>

          {error && <p style={{ color: 'var(--danger)', fontSize: '14px', marginBottom: '20px', textAlign: 'center' }}>{error}</p>}

          <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px', fontSize: '16px' }}>
            Registrarse
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>¿Ya tienes cuenta? </span>
          <Link to="/login" className="gradient-text" style={{ fontWeight: '600', textDecoration: 'none' }}>Inicia sesión</Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
