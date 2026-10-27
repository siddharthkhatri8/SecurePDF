import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const SPDFList = ({ files, onDelete, onConvertToPDF, onRefresh, ownerView = false }) => {
  const { user } = useAuth();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDelete = async (fileId, filename) => {
    if (window.confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`)) {
      await onDelete(fileId);
      if (onRefresh) onRefresh();
    }
  };

  const handleDownload = async (fileId, filename) => {
    try {
      const response = await api.get(`/spdf/${fileId}/download`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Failed to download file: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleConvertToPDF = (fileId, originalFilename) => {
    if (window.confirm(`Convert "${originalFilename}" back to normal PDF? This will download the PDF file.`)) {
      onConvertToPDF(fileId, originalFilename);
    }
  };

  if (!files || files.length === 0) {
    return (
      <div className="card" style={{ 
        textAlign: 'center', 
        padding: '60px 20px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>📄</div>
        <h3 style={{ marginBottom: '12px' }}>No Documents Yet</h3>
        <p style={{ marginBottom: '24px', opacity: 0.9 }}>
          Upload your first PDF to get started with secure document management
        </p>
        <Link to="/upload" className="btn btn-primary" style={{ 
          background: 'white', 
          color: '#667eea',
          fontWeight: 'bold'
        }}>
          Upload Your First PDF
        </Link>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px',
        paddingBottom: '12px',
        borderBottom: '2px solid var(--border)'
      }}>
        <h2 style={{ margin: 0 }}>{ownerView ? 'Your Documents' : 'Documents'}</h2>
        <span className="badge badge-primary" style={{ fontSize: '14px' }}>
          {files.length} {files.length === 1 ? 'file' : 'files'}
        </span>
      </div>

      {/* Desktop View */}
      <div className="desktop-view">
        <table className="table">
          <thead>
            <tr>
              <th>Filename</th>
              {!ownerView && <th>Owner</th>}
              <th>Size</th>
              <th>Created</th>
              <th>Views</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => {
              const isOwner = ownerView || file.owner === user.id || file.ownerUsername === user.username;
              
              return (
                <tr key={file._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '20px' }}>🔒</span>
                      <div>
                        <div style={{ fontWeight: '500' }}>{file.originalFilename}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>
                          {file.spdfFilename}
                        </div>
                      </div>
                    </div>
                  </td>
                  {!ownerView && (
                    <td>
                      <span className={isOwner ? 'badge badge-primary' : 'badge'}>
                        {isOwner ? 'You' : file.ownerUsername}
                      </span>
                    </td>
                  )}
                  <td>{formatFileSize(file.fileSize)}</td>
                  <td>{formatDate(file.createdAt)}</td>
                  <td>
                    <span style={{ 
                      background: 'var(--bg)', 
                      padding: '4px 12px', 
                      borderRadius: '12px',
                      fontWeight: '500',
                      fontSize: '13px'
                    }}>
                      {file.accessCount || 0}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      <Link 
                        to={`/viewer/${file._id}`} 
                        className="btn btn-primary" 
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        title="View online"
                      >
                        👁️
                      </Link>
                      
                      <button
                        onClick={() => handleDownload(file._id, file.spdfFilename)}
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        title="Download .spdf file"
                      >
                        ⬇️
                      </button>
                      
                      {isOwner && (
                        <>
                          <button
                            onClick={() => handleConvertToPDF(file._id, file.originalFilename)}
                            className="btn"
                            style={{ 
                              padding: '4px 8px', 
                              fontSize: '12px',
                              background: 'var(--warning)',
                              color: 'white'
                            }}
                            title="Convert back to PDF"
                          >
                            📝
                          </button>
                          
                          <Link 
                            to={`/access/${file._id}`} 
                            className="btn btn-outline"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            title="Manage access"
                          >
                            🔐
                          </Link>
                          
                          <button 
                            onClick={() => handleDelete(file._id, file.originalFilename)}
                            className="btn btn-danger"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            title="Delete file"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile View */}
      <div className="mobile-view">
        {files.map((file) => {
          const isOwner = ownerView || file.owner === user.id || file.ownerUsername === user.username;
          
          return (
            <div 
              key={file._id} 
              className="card" 
              style={{ 
                marginBottom: '16px', 
                padding: '16px',
                border: '1px solid var(--border)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ fontSize: '32px' }}>🔒</span>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>
                    {file.originalFilename}
                  </h3>
                  
                  <div style={{ 
                    display: 'flex', 
                    gap: '8px', 
                    marginBottom: '12px',
                    fontSize: '13px',
                    color: 'var(--text-light)',
                    flexWrap: 'wrap'
                  }}>
                    <span>{formatFileSize(file.fileSize)}</span>
                    <span>•</span>
                    <span>{formatDate(file.createdAt)}</span>
                    <span>•</span>
                    <span>{file.accessCount || 0} views</span>
                  </div>

                  {!ownerView && (
                    <div style={{ marginBottom: '12px' }}>
                      <span className={isOwner ? 'badge badge-primary' : 'badge'}>
                        {isOwner ? 'You' : file.ownerUsername}
                      </span>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <Link 
                      to={`/viewer/${file._id}`} 
                      className="btn btn-primary" 
                      style={{ flex: 1, fontSize: '12px', minWidth: '70px' }}
                    >
                      👁️ View
                    </Link>
                    
                    <button
                      onClick={() => handleDownload(file._id, file.spdfFilename)}
                      className="btn btn-secondary"
                      style={{ flex: 1, fontSize: '12px', minWidth: '90px' }}
                    >
                      ⬇️ Download
                    </button>
                    
                    {isOwner && (
                      <>
                        <button
                          onClick={() => handleConvertToPDF(file._id, file.originalFilename)}
                          className="btn"
                          style={{ 
                            fontSize: '12px',
                            background: 'var(--warning)',
                            color: 'white',
                            minWidth: '80px'
                          }}
                        >
                          📝 To PDF
                        </button>
                        
                        <Link 
                          to={`/access/${file._id}`} 
                          className="btn btn-outline"
                          style={{ fontSize: '12px', minWidth: '80px' }}
                        >
                          🔐 Access
                        </Link>
                        
                        <button 
                          onClick={() => handleDelete(file._id, file.originalFilename)}
                          className="btn btn-danger"
                          style={{ fontSize: '12px', minWidth: '70px' }}
                        >
                          🗑️ Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SPDFList;