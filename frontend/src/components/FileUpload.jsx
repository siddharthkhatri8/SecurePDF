import { useState, useRef } from 'react';

const FileUpload = ({ onUpload, loading }) => {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleFileSelect = (selectedFile) => {
    if (selectedFile.type !== 'application/pdf') {
      alert('Please select a PDF file');
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      alert(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      return;
    }

    setFile(selectedFile);
    onUpload(selectedFile);
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="input-group">
      <label>📄 Select PDF File (Max {MAX_FILE_SIZE / 1024 / 1024}MB)</label>

      {!file ? (
        <div
          style={{
            border: `2px dashed ${dragActive ? 'var(--primary)' : 'var(--border)'}`,
            borderRadius: '8px',
            padding: '40px 20px',
            textAlign: 'center',
            background: dragActive ? 'rgba(79, 70, 229, 0.05)' : 'var(--bg)',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
          <p style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
            {dragActive ? 'Drop your PDF here' : 'Drag and drop your PDF here'}
          </p>
          <p style={{ fontSize: '14px', color: 'var(--text-light)', marginBottom: '16px' }}>or</p>
          <button type="button" className="btn btn-outline" style={{ pointerEvents: 'none' }}>
            Browse Files
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleChange}
            style={{ display: 'none' }}
          />
        </div>
      ) : (
        <div style={{
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '16px',
          background: 'var(--surface)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ fontSize: '32px' }}>📄</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '500', marginBottom: '4px' }}>{file.name}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-light)' }}>
                {formatFileSize(file.size)} • {new Date(file.lastModified).toLocaleDateString()}
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemoveFile}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: 'var(--danger)',
                padding: '4px'
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;