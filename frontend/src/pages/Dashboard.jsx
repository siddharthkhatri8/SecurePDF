import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [files, setFiles] = useState([]);
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter states
  const [filter, setFilter] = useState('all'); // 'all', 'owned', 'shared'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Stats
  const [stats, setStats] = useState({
    totalFiles: 0,
    ownedFiles: 0,
    sharedFiles: 0,
    totalViews: 0
  });

  useEffect(() => {
    fetchFiles();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [files, filter, searchQuery]);

  const fetchFiles = async () => {
    try {
      // Fetch ALL accessible files (owned + shared)
      const response = await api.get('/spdf/accessible-files');
      const fetchedFiles = response.data.data.files;
      
      // Mark each file as owned or shared
      const filesWithOwnership = fetchedFiles.map(file => ({
        ...file,
        isOwned: file.owner === user.id || file.ownerUsername === user.username
      }));
      
      setFiles(filesWithOwnership);
      
      // Calculate stats
      const owned = filesWithOwnership.filter(f => f.isOwned).length;
      const shared = filesWithOwnership.filter(f => !f.isOwned).length;
      const totalViews = filesWithOwnership.reduce((sum, f) => sum + (f.accessCount || 0), 0);
      
      setStats({
        totalFiles: filesWithOwnership.length,
        ownedFiles: owned,
        sharedFiles: shared,
        totalViews
      });
    } catch (err) {
      setError('Failed to load files');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...files];

    // Apply ownership filter
    if (filter === 'owned') {
      result = result.filter(f => f.isOwned);
    } else if (filter === 'shared') {
      result = result.filter(f => !f.isOwned);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(f => 
        f.originalFilename.toLowerCase().includes(query) ||
        f.spdfFilename.toLowerCase().includes(query) ||
        f.ownerUsername.toLowerCase().includes(query)
      );
    }

    setFilteredFiles(result);
  };

  const handleDeleteFile = async (fileId) => {
    try {
      await api.delete(`/spdf/${fileId}`);
      setFiles(files.filter(f => f._id !== fileId));
    } catch (err) {
      alert('Failed to delete file: ' + (err.response?.data?.message || err.message));
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
      alert('Failed to download file');
    }
  };

  const handleConvertToPDF = async (fileId, filename) => {
    try {
      const response = await api.post(`/spdf/${fileId}/convert-to-pdf`, {}, {
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
      alert('Successfully converted to PDF!');
    } catch (error) {
      alert('Failed to convert file');
    }
  };

  const viewAccessLogs = (fileId) => {
    navigate(`/access-logs/${fileId}`);
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ marginBottom: '8px' }}>Dashboard</h1>
          <p style={{ color: 'var(--text-light)', margin: 0 }}>
            Manage your secured documents
          </p>
        </div>
        <Link to="/upload" className="btn btn-primary">+ Upload New PDF</Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📚</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '4px' }}>{stats.totalFiles}</div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Documents</div>
        </div>

        <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>👤</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '4px' }}>{stats.ownedFiles}</div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Owned by You</div>
        </div>

        <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🤝</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '4px' }}>{stats.sharedFiles}</div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Shared with You</div>
        </div>

        <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>👁️</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '4px' }}>{stats.totalViews}</div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Views</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search Bar */}
          <div style={{ flex: 1, minWidth: '250px' }}>
            <input
              type="text"
              placeholder="🔍 Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Filter Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setFilter('all')}
              className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '14px' }}
            >
              All ({stats.totalFiles})
            </button>
            <button
              onClick={() => setFilter('owned')}
              className={`btn ${filter === 'owned' ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '14px' }}
            >
              Owned ({stats.ownedFiles})
            </button>
            <button
              onClick={() => setFilter('shared')}
              className={`btn ${filter === 'shared' ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '14px' }}
            >
              Shared ({stats.sharedFiles})
            </button>
          </div>
        </div>
      </div>

      {/* Files List */}
      {filteredFiles.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📄</div>
          <h3>No files found</h3>
          <p style={{ color: 'var(--text-light)' }}>
            {searchQuery ? 'Try a different search term' : 'Upload your first PDF to get started'}
          </p>
        </div>
      ) : (
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Filename</th>
                  <th>Owner</th>
                  <th>Size</th>
                  <th>Created</th>
                  <th>Views</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFiles.map((file) => (
                  <tr 
                    key={file._id} 
                    style={{ 
                      background: file.isOwned 
                        ? 'rgba(79, 70, 229, 0.05)' 
                        : 'rgba(16, 185, 129, 0.05)'
                    }}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px' }}>
                          {file.isOwned ? '📘' : '📗'}
                        </span>
                        <div>
                          <div style={{ fontWeight: '500' }}>{file.originalFilename}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>
                            {file.spdfFilename}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={file.isOwned ? 'badge badge-primary' : 'badge badge-success'}>
                        {file.isOwned ? '👤 You' : `🤝 ${file.ownerUsername}`}
                      </span>
                    </td>
                    <td>{(file.fileSize / 1024).toFixed(2)} KB</td>
                    <td>{new Date(file.createdAt).toLocaleDateString()}</td>
                    <td>{file.accessCount || 0}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        <Link to={`/viewer/${file._id}`} className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '12px' }} title="View">
                          👁️
                        </Link>
                        <button onClick={() => handleDownload(file._id, file.spdfFilename)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} title="Download">
                          ⬇️
                        </button>
                        {file.isOwned && (
                          <>
                            <button onClick={() => handleConvertToPDF(file._id, file.originalFilename)} className="btn" style={{ padding: '4px 8px', fontSize: '12px', background: 'var(--warning)', color: 'white' }} title="Convert to PDF">
                              📝
                            </button>
                            <Link to={`/access/${file._id}`} className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '12px' }} title="Manage Access">
                              🔐
                            </Link>
                            <button onClick={() => viewAccessLogs(file._id)} className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '12px' }} title="View Logs">
                              📊
                            </button>
                            <button onClick={() => handleDeleteFile(file._id)} className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '12px' }} title="Delete">
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;