import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Trash2, Edit, Check, Calendar, User, Eye, Loader2, AlertCircle, FileText } from 'lucide-react';

interface PreviewImage {
  id: string;
  visit_id: string | null;
  file_name: string;
  image_type: string;
  description: string | null;
  created_at: string;
  uploader_name: string;
}

interface ImagePreviewModalProps {
  image: PreviewImage;
  onClose: () => void;
  onDeleteSuccess?: () => void;
  onUpdateSuccess?: () => void;
}

export const ImagePreviewModal = ({ 
  image, 
  onClose, 
  onDeleteSuccess,
  onUpdateSuccess
}: ImagePreviewModalProps) => {
  const { apiFetch, user } = useAuth();
  
  // Can edit/delete only if Admin or Doctor
  const canModify = user?.role === 'Admin' || user?.role === 'Doctor';

  // States
  const [description, setDescription] = useState(image.description || '');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdateDescription = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch(`/images/${image.id}`, {
        method: 'PUT',
        body: JSON.stringify({ description })
      });
      if (result.success) {
        setIsEditing(false);
        if (onUpdateSuccess) onUpdateSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update description.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this image file? This action is irreversible.')) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch(`/images/${image.id}`, {
        method: 'DELETE'
      });
      if (result.success) {
        onClose();
        if (onDeleteSuccess) onDeleteSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete image file.');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 200 }}>
      <div 
        className="modal-card" 
        style={{ 
          maxWidth: '850px', 
          width: '90%', 
          padding: 0, 
          overflow: 'hidden', 
          display: 'grid', 
          gridTemplateColumns: '1.2fr 0.8fr',
          minHeight: '450px'
        }}
      >
        
        {/* Left column: Full image viewer */}
        <div style={{ background: '#090d16', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', minHeight: '300px' }}>
          {image.file_name.toLowerCase().endsWith('.pdf') ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', color: 'white', padding: '2rem', textAlign: 'center' }}>
              <FileText size={80} style={{ color: 'var(--color-danger)' }} />
              <div>
                <p style={{ fontWeight: 600, wordBreak: 'break-all', fontSize: '0.95rem' }}>{image.file_name}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>PDF Clinical Document</p>
              </div>
              <a 
                href={`http://localhost:5000/api/images/serve/${image.id}`} 
                target="_blank" 
                rel="noreferrer"
                className="btn-action"
                style={{ width: 'auto', padding: '0.5rem 1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Eye size={14} />
                <span>Open PDF Report</span>
              </a>
            </div>
          ) : (
            <img 
              src={`http://localhost:5000/api/images/serve/${image.id}`} 
              alt={image.file_name} 
              style={{ width: '100%', height: '100%', maxHeight: '550px', objectFit: 'contain' }}
            />
          )}
          <div style={{ position: 'absolute', top: '1rem', left: '1rem', background: 'rgba(15,23,42,0.8)', padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid var(--glass-border)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)' }}>
            {image.image_type}
          </div>
        </div>

        {/* Right column: Details and controls */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'var(--bg-secondary)', borderLeft: '1px solid var(--glass-border)' }}>
          
          {/* Header */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>Image Details</h3>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ID: {image.id}</span>
              </div>
              <button onClick={onClose} style={{ background: 'none', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="alert alert-danger" style={{ padding: '0.5rem', marginBottom: '1rem' }}>
                <AlertCircle size={14} />
                <span style={{ fontSize: '0.75rem' }}>{error}</span>
              </div>
            )}

            {/* Info lists */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <User size={14} style={{ color: 'var(--color-role-doctor)' }} />
                <span>Uploaded by: <strong>{image.uploader_name}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <Calendar size={14} />
                <span>Uploaded on: <strong>{new Date(image.created_at).toLocaleString()}</strong></span>
              </div>
            </div>

            {/* Description editing panel */}
            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
              <span className="form-label" style={{ fontSize: '0.75rem' }}>Image Description</span>
              
              {isEditing ? (
                <div style={{ marginTop: '0.5rem' }}>
                  <textarea 
                    className="form-input"
                    style={{ paddingLeft: '0.5rem', padding: '0.5rem', fontSize: '0.85rem', height: '80px', resize: 'vertical' }}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={loading}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} 
                      onClick={() => { setIsEditing(false); setDescription(image.description || ''); }}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      className="btn-primary" 
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', width: 'auto', display: 'flex', alignItems: 'center', gap: '0.25rem' }} 
                      onClick={handleUpdateDescription}
                      disabled={loading}
                    >
                      {loading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      <span>Save</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: '0.5rem' }}>
                  <p style={{ fontSize: '0.9rem', minHeight: '40px', fontStyle: image.description ? 'normal' : 'italic', color: image.description ? 'white' : 'var(--text-muted)' }}>
                    {image.description || 'No description provided.'}
                  </p>
                  {canModify && (
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      style={{ fontSize: '0.7rem', padding: '0.25rem 0.4rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit size={10} />
                      <span>Edit Description</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons at footer */}
          <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <Eye size={12} />
              <span>Full resolution</span>
            </div>

            {canModify && (
              <button 
                type="button" 
                className="btn-primary" 
                style={{ width: 'auto', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.25rem', boxShadow: 'none', fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                onClick={handleDelete}
                disabled={loading}
              >
                {loading ? <Loader2 size={12} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={12} />}
                <span>Delete File</span>
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
export default ImagePreviewModal;
