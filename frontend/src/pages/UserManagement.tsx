import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  UserPlus, 
  Edit, 
  Trash2, 
  X, 
  Check, 
  AlertCircle, 
  Loader2 
} from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  role_id: string;
  is_active: boolean;
  department_id?: string | null;
  department_name?: string | null;
  created_at: string;
}

export const UserManagement = () => {
  const { apiFetch, user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Load users and roles
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const usersData = await apiFetch('/users');
      const rolesData = await apiFetch('/users/roles');
      setUsers(usersData.users);
      setRoles(rolesData.roles);
    } catch (err: any) {
      setError(err.message || 'Failed to load user management data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const triggerSuccessAlert = (message: string) => {
    setSuccessMsg(message);
    setTimeout(() => {
      setSuccessMsg(null);
    }, 4000);
  };

  const openAddModal = () => {
    setIsEditing(false);
    setEditingUserId(null);
    setName('');
    setEmail('');
    setPassword('');
    // Default to the first role in the list if available
    setRoleId(roles[0]?.id || '');
    setDepartmentId('');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (user: UserData) => {
    setIsEditing(true);
    setEditingUserId(user.id);
    setName(user.name);
    setEmail(user.email);
    setPassword(''); // Leave password empty for update unless changing
    setRoleId(user.role_id);
    setDepartmentId(user.department_id || '');
    setIsActive(user.is_active);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setModalLoading(true);

    const selectedRole = roles.find(r => r.id === roleId);
    const isDoctor = selectedRole?.name === 'Doctor';
    const finalDeptId = isDoctor && departmentId ? departmentId : undefined;

    try {
      if (isEditing && editingUserId) {
        // Update user
        const result = await apiFetch(`/users/${editingUserId}`, {
          method: 'PUT',
          body: JSON.stringify({
            name,
            email,
            password: password || undefined, // Only send if not empty
            roleId,
            isActive,
            departmentId: finalDeptId
          })
        });

        if (result.success) {
          setIsModalOpen(false);
          triggerSuccessAlert(`User "${name}" updated successfully.`);
          loadData();
        }
      } else {
        // Create user
        const result = await apiFetch('/users', {
          method: 'POST',
          body: JSON.stringify({
            name,
            email,
            password,
            roleId,
            departmentId: finalDeptId
          })
        });

        if (result.success) {
          setIsModalOpen(false);
          triggerSuccessAlert(`User "${name}" created successfully.`);
          loadData();
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving user.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteUser = async (user: UserData) => {
    if (user.id === currentUser?.id) {
      setError('You cannot delete your own account.');
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete the user "${user.name}"?`)) {
      return;
    }

    setError(null);
    try {
      const result = await apiFetch(`/users/${user.id}`, {
        method: 'DELETE'
      });

      if (result.success) {
        triggerSuccessAlert(`User "${user.name}" deleted successfully.`);
        loadData();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete user.');
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* Page Header */}
      <div className="table-header-container">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            User Workspace
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Manage staff login accounts, assignments, and activation status
          </p>
        </div>
        
        <button className="btn-action" onClick={openAddModal}>
          <UserPlus size={16} />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* Global Message Banners */}
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
          <button style={{ marginLeft: 'auto', background: 'none', color: '#fca5a5' }} onClick={() => setError(null)}><X size={16} /></button>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
          <Check size={18} />
          <span>{successMsg}</span>
          <button style={{ marginLeft: 'auto', background: 'none', color: '#a7f3d0' }} onClick={() => setSuccessMsg(null)}><X size={16} /></button>
        </div>
      )}

      {/* Main Table view */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', gap: '0.5rem', color: 'var(--text-secondary)' }}>
          <Loader2 className="animate-spin" size={24} style={{ animation: 'spin 1s linear infinite' }} />
          <span>Fetching system users...</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created At</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No users registered in the system.
                  </td>
                </tr>
              ) : (
                users.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 500, color: 'white' }}>{item.name}</td>
                    <td>{item.email}</td>
                    <td>
                      <span className={`profile-role-badge role-${item.role.toLowerCase()}`}>
                        {item.role}
                      </span>
                    </td>
                    <td>
                      <span style={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: item.is_active ? '#10b981' : '#ef4444'
                      }}>
                        <span style={{ 
                          width: '6px', 
                          height: '6px', 
                          borderRadius: '50%', 
                          background: item.is_active ? '#10b981' : '#ef4444' 
                        }} />
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="action-buttons" style={{ justifyContent: 'center' }}>
                        <button 
                          className="btn-icon edit" 
                          onClick={() => openEditModal(item)}
                          title="Edit User"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          className="btn-icon delete" 
                          onClick={() => handleDeleteUser(item)}
                          disabled={item.id === currentUser?.id}
                          title="Delete User"
                          style={{ opacity: item.id === currentUser?.id ? 0.3 : 1 }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal Dialog */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'white' }}>
                {isEditing ? 'Modify Staff Profile' : 'Register New Staff'}
              </h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleModalSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '1rem' }}
                  placeholder="e.g. Dr. Jane Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={modalLoading}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: '1rem' }}
                  placeholder="e.g. janesmith@clinic.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={modalLoading}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  {isEditing ? 'Password (leave blank to keep current)' : 'Password'}
                </label>
                <input
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: '1rem' }}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={modalLoading}
                  required={!isEditing}
                />
              </div>

              <div className="form-group">
                <label className="form-label">System Role Access</label>
                <select
                  className="form-select"
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  disabled={modalLoading}
                  required
                >
                  <option value="" disabled>Select Role</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.name} - {role.description}
                    </option>
                  ))}
                </select>
              </div>

              {isEditing && (
                <div className="form-group" style={{ marginTop: '1.25rem' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      disabled={modalLoading}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }}
                    />
                    <span>Account Activated (allows login)</span>
                  </label>
                </div>
              )}

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setIsModalOpen(false)}
                  disabled={modalLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ width: 'auto' }}
                  disabled={modalLoading}
                >
                  {modalLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{isEditing ? 'Save Changes' : 'Register Staff'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default UserManagement;
