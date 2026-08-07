import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ShieldAlert, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect target after login
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);

    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.message);
    }
  };

  // Helper to prefill login for testing convenience
  const prefillUser = (role: 'Admin' | 'Doctor' | 'Receptionist') => {
    if (role === 'Admin') {
      setEmail('admin@clinic.com');
      setPassword('AdminPass123!');
    } else if (role === 'Doctor') {
      setEmail('doctor@clinic.com');
      setPassword('DoctorPass123!');
    } else if (role === 'Receptionist') {
      setEmail('receptionist@clinic.com');
      setPassword('ReceptionistPass123!');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card glass-card">
        <div className="login-header">
          <div className="login-logo">
            <ShieldCheck size={28} />
          </div>
          <h1>Clinic Management</h1>
          <p>Sign in to access your administrative workspace</p>
        </div>

        {error && (
          <div className="alert alert-danger">
            <ShieldAlert size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <div className="input-wrapper">
              <Mail className="input-icon" />
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="name@clinic.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                style={{ paddingRight: '2.5rem' }}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-primary"
            disabled={isSubmitting}
            style={{ marginTop: '1.5rem' }}
          >
            {isSubmitting ? (
              <>
                <div style={{
                  width: '18px',
                  height: '18px',
                  border: '2px solid rgba(255,255,255,0.2)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Developer Sandbox Panel - Premium Evaluation Feature */}
        <div style={{ 
          marginTop: '2rem', 
          paddingTop: '1.5rem', 
          borderTop: '1px solid var(--glass-border)',
          textAlign: 'center'
        }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.75rem', fontWeight: 500 }}>
            DEVELOPER QUICK-ACCESS (TEST ROLES)
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button 
              onClick={() => prefillUser('Admin')} 
              className="btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem', color: 'var(--color-role-admin)', borderColor: 'rgba(168, 85, 247, 0.3)' }}
              disabled={isSubmitting}
            >
              Admin
            </button>
            <button 
              onClick={() => prefillUser('Doctor')} 
              className="btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem', color: 'var(--color-role-doctor)', borderColor: 'rgba(59, 130, 246, 0.3)' }}
              disabled={isSubmitting}
            >
              Doctor
            </button>
            <button 
              onClick={() => prefillUser('Receptionist')} 
              className="btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem', color: 'var(--color-role-receptionist)', borderColor: 'rgba(13, 148, 136, 0.3)' }}
              disabled={isSubmitting}
            >
              Receptionist
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Login;
