import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  User, 
  Lock, 
  Check, 
  AlertCircle, 
  Loader2,
  Sun,
  Moon
} from 'lucide-react';

export const Settings = () => {
  const { user, apiFetch, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();
  
  // States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Initialize form values from current logged-in user
  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Basic Validations
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required.');
      return;
    }

    if (newPassword) {
      if (!oldPassword) {
        setError('You must enter your current password to set a new password.');
        return;
      }
      if (newPassword.length < 6) {
        setError('New password must be at least 6 characters long.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('New passwords do not match.');
        return;
      }
    }

    setSubmitLoading(true);
    try {
      const result = await apiFetch('/users/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          oldPassword: oldPassword || undefined,
          newPassword: newPassword || undefined
        })
      });

      if (result.success) {
        setSuccess('Profile updated successfully.');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        // Sync context user
        await refreshUser();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update settings profile.');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out', maxWidth: '640px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Account Settings
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
          Manage your personal profile details and update your security credentials
        </p>
      </div>

      {/* Alert Banners */}
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
          <Check size={18} />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Profile Card */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={18} style={{ color: 'var(--color-primary)' }} />
            <span>Profile Details</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Display Name</label>
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '1rem' }}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={submitLoading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                style={{ paddingLeft: '1rem' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={submitLoading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Account Role</label>
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '1rem', background: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)' }}
                value={user?.role || ''}
                disabled
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Your clinical role permissions are managed by the administrator.
              </span>
            </div>
          </div>
        </div>

        {/* Security Password Card */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lock size={18} style={{ color: 'var(--color-danger)' }} />
            <span>Change Account Password</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input
                type="password"
                className="form-input"
                style={{ paddingLeft: '1rem' }}
                placeholder="Enter current password to authorize changes"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                disabled={submitLoading}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: '1rem' }}
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={submitLoading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: '1rem' }}
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={submitLoading}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Appearance Settings Card */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sun size={18} style={{ color: 'var(--color-warning)' }} />
            <span>Appearance & Theme</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Choose how the Clinic Management System looks on your device.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button
                type="button"
                className={`theme-select-card ${theme === 'light' ? 'active' : ''}`}
                onClick={() => setTheme('light')}
              >
                <Sun size={20} />
                <span style={{ fontWeight: 600 }}>Light Mode</span>
              </button>
              <button
                type="button"
                className={`theme-select-card ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
              >
                <Moon size={20} />
                <span style={{ fontWeight: 600 }}>Dark Mode</span>
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button
            type="submit"
            className="btn-primary"
            style={{ width: 'auto', padding: '0 2rem' }}
            disabled={submitLoading}
          >
            {submitLoading ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Saving settings...</span>
              </>
            ) : (
              <span>Save Account Settings</span>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};
export default Settings;
