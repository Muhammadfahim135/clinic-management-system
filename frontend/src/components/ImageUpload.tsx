import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Upload, X, AlertCircle, Check, Loader2, Image as ImageIcon, FileText } from 'lucide-react';

interface ImageUploadProps {
  visitId?: string;
  patientId?: string;
  onUploadSuccess: () => void;
}

export const ImageUpload = ({ visitId, patientId, onUploadSuccess }: ImageUploadProps) => {
  const { token } = useAuth();
  
  // States
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [imageType, setImageType] = useState<string>('Treatment Photo');
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handlers for File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const processFiles = (fileList: FileList) => {
    setError(null);
    const validFiles: File[] = [];
    const validPreviews: string[] = [];

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      
      // Validate type
      if (!allowedTypes.includes(file.type)) {
        setError('Only JPG, JPEG, PNG, WEBP, and PDF formats are supported.');
        continue;
      }

      // Validate size (10 MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('Image file size must be under 10 MB.');
        continue;
      }

      validFiles.push(file);
      validPreviews.push(URL.createObjectURL(file));
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
      setPreviews(prev => [...prev, ...validPreviews]);
    }
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]); // release memory
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Drag and Drop Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
 
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      setError('Please select at least one file to upload.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    // Using FormData for multipart/form-data upload
    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('images', file);
    });
    formData.append('imageType', imageType);
    if (description) {
      formData.append('description', description);
    }

    try {
      const uploadUrl = visitId
        ? `http://localhost:5000/api/visits/${visitId}/images`
        : `http://localhost:5000/api/patients/${patientId}/files`;

      // Direct fetch call since apiFetch handles json bodies by default
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(data.message || 'Images uploaded successfully.');
        setSelectedFiles([]);
        setPreviews([]);
        setDescription('');
        
        setTimeout(() => {
          setSuccess(null);
          onUploadSuccess();
        }, 1500);
      } else {
        throw new Error(data.message || 'Failed to upload images.');
      }
    } catch (err: any) {
      setError(err.message || 'Server error occurred during file upload.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card" style={{ marginBottom: '1.5rem', background: 'rgba(15, 23, 42, 0.4)' }}>
      <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'white', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Upload size={18} style={{ color: 'var(--color-primary)' }} />
        <span>Upload {visitId ? 'Visit' : 'Patient'} Files & Reports</span>
      </h3>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={16} />
          <span style={{ fontSize: '0.8rem' }}>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
          <Check size={16} />
          <span style={{ fontSize: '0.8rem' }}>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        
        {/* Drag & Drop Area */}
        <div 
          style={{
            border: dragActive ? '2px dashed var(--color-primary)' : '2px dashed var(--glass-border)',
            background: dragActive ? 'rgba(14, 165, 233, 0.05)' : 'rgba(15, 23, 42, 0.3)',
            borderRadius: 'var(--border-radius-sm)',
            padding: '2rem',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'var(--transition-smooth)',
            marginBottom: '1rem'
          }}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef}
            style={{ display: 'none' }} 
            multiple 
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleFileChange}
            disabled={loading}
          />
          <ImageIcon size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
          <p style={{ fontSize: '0.9rem', color: 'white', fontWeight: 500 }}>
            Drag & drop files here, or <span style={{ color: 'var(--color-primary)' }}>browse</span>
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Supports JPG, JPEG, PNG, WEBP, PDF (Max 10 MB per file)
          </p>
        </div>

        {/* Selected files previews */}
        {previews.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <span className="form-label" style={{ fontSize: '0.75rem' }}>Selected Files ({previews.length})</span>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
              {previews.map((preview, index) => {
                const file = selectedFiles[index];
                const isPdf = file && file.type === 'application/pdf';
                return (
                  <div key={index} style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                    {isPdf ? (
                      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5' }}>
                        <FileText size={20} />
                      </div>
                    ) : (
                      <img src={preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                  <button 
                    type="button" 
                    onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                    style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(239, 68, 68, 0.8)', color: 'white', border: 'none', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <X size={10} />
                  </button>
                </div>
              );
            })}
            </div>
          </div>
        )}

        {/* Metadata inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1.25rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Image Type *</label>
            <select 
              className="form-select"
              style={{ padding: '0.5rem', fontSize: '0.85rem' }}
              value={imageType}
              onChange={(e) => setImageType(e.target.value)}
              disabled={loading}
              required
            >
              <option value="Treatment Photo">Treatment Photo</option>
              <option value="X-ray">X-ray</option>
              <option value="Scan">Scan</option>
              <option value="Before Treatment">Before Treatment</option>
              <option value="After Treatment">After Treatment</option>
              <option value="Progress Photo">Progress Photo</option>
              <option value="Medical Report">Medical Report</option>
              <option value="Lab Report">Lab Report</option>
              <option value="Other">Other Document/Image</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Description (Optional)</label>
            <input 
              type="text" 
              className="form-input" 
              style={{ paddingLeft: '0.75rem', padding: '0.5rem', fontSize: '0.85rem' }}
              placeholder="e.g. Pre-op sagittal view, left side fractures"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            type="submit" 
            className="btn-primary" 
            style={{ width: 'auto', padding: '0.5rem 1.5rem', fontSize: '0.85rem' }}
            disabled={loading || selectedFiles.length === 0}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={14} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Uploading...</span>
              </>
            ) : (
              <span>{visitId ? 'Save Images' : 'Save Files'}</span>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};
export default ImageUpload;
