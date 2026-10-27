import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const AccessLogs = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [file, setFile] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'view', 'download', 'denied'

  useEffect(() => {
    fetchLogsAndFile();
  }, [id]);

  const fetchLogsAndFile = async () => {
    try {
      const [fileRes, logsRes] = await Promise.all([
        api.get(`/spdf/${id}`),
        api.get(`/spdf/${id}/logs`)
      ]);
      
      setFile(fileRes.data.data.file);
      setLogs(logsRes.data.data.logs);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load access logs');
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action) => {
    const badges = {
      view: { text: '👁️ Viewed', class: 'badge-success' },
      download: { text: '⬇️ Downloaded', class: 'badge-primary' },
      otp_request: { text: '🔐 OTP Requested', class: 'badge-info' },
      otp_verify: { text: '✓ OTP Verified', class: 'badge-success' },
      access_denied: { text: '🚫 Access Denied', class: 'badge-danger' },
      upload: { text: '⬆️ Uploaded', class: 'badge-primary' }
    };
    return badges[action] || { text: action, class: 'badge' };
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getFilteredLogs = () => {
    if (filter === 'all') return logs;
    if (filter === 'view') return logs.filter(log => log.action === 'view');
    if (filter === 'download') return logs.filter(log => log.action === 'download');
    if (filter === 'denied') return logs.filter(log => log.action === 'access_denied');
    return logs;
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  if (error) {
    return (
      <div className="container" style={{ maxWidth: '800px', marginTop: '40px' }}>
        <div className="alert alert-error">{error}</div>
        <button onClick={() => navigate('/dashboard')} className="btn btn-outline">
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  const filteredLogs = getFilteredLogs();

  return (
    <div className="container" style={{ maxWidth: '1000px' }}>
      <button onClick={() => navigate('/dashboard')} className="btn btn-outline" style={{ marginBottom: '20px' }}>
        ← Back to Dashboard
      </button>

      {/* File Info Card */}
      <div className="card" style={{ marginBottom: '24px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <h2 style={{ marginBottom: '8px' }}>📊 Access Logs</h2>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>{file?.originalFilename}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', fontSize: '14px', opacity: 0.9 }}>
          <div><strong>Owner:</strong> {file?.ownerUsername}</div>
          <div><strong>Created:</strong> {new Date(file?.createdAt).toLocaleDateString()}</div>
          <div><strong>Total Views:</strong> {file?.accessCount || 0}</div>
          <div><strong>Total Logs:</strong> {logs.length}</div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilter('all')}
            className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '14px' }}
          >
            All ({logs.length})
          </button>
          <button
            onClick={() => setFilter('view')}
            className={`btn ${filter === 'view' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '14px' }}
          >
            Views ({logs.filter(l => l.action === 'view').length})
          </button>
          <button
            onClick={() => setFilter('download')}
            className={`btn ${filter === 'download' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '14px' }}
          >
            Downloads ({logs.filter(l => l.action === 'download').length})
          </button>
          <button
            onClick={() => setFilter('denied')}
            className={`btn ${filter === 'denied' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '14px' }}
          >
            Denied ({logs.filter(l => l.action === 'access_denied').length})
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card">
        {filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <h3>No access logs found</h3>
            <p style={{ color: 'var(--text-light)' }}>
              {filter === 'all' ? 'No activity recorded yet' : 'No matching activity'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Success</th>
                  <th>IP Address</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log._id}>
                    <td style={{ fontSize: '13px' }}>
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>👤</span>
                        <span>{log.user?.username || 'Unknown'}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>
                        {log.user?.email}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${getActionBadge(log.action).class}`}>
                        {getActionBadge(log.action).text}
                      </span>
                    </td>
                    <td>
                      {log.success ? (
                        <span style={{ color: 'var(--success)' }}>✓ Yes</span>
                      ) : (
                        <span style={{ color: 'var(--danger)' }}>✗ No</span>
                      )}
                    </td>
                    <td style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                      {log.ipAddress || 'N/A'}
                    </td>
                    <td>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <details>
                          <summary style={{ cursor: 'pointer', fontSize: '12px', color: 'var(--primary)' }}>
                            View Details
                          </summary>
                          <pre style={{ 
                            fontSize: '11px', 
                            background: 'var(--bg)', 
                            padding: '8px', 
                            borderRadius: '4px',
                            marginTop: '8px',
                            maxWidth: '300px',
                            overflow: 'auto'
                          }}>
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary Card */}
      {logs.length > 0 && (
        <div className="card" style={{ marginTop: '24px', background: 'var(--bg)' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>📈 Activity Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', fontSize: '14px' }}>
            <div>
              <strong>Total Access Attempts:</strong> {logs.length}
            </div>
            <div>
              <strong>Successful:</strong> <span style={{ color: 'var(--success)' }}>
                {logs.filter(l => l.success).length}
              </span>
            </div>
            <div>
              <strong>Failed:</strong> <span style={{ color: 'var(--danger)' }}>
                {logs.filter(l => !l.success).length}
              </span>
            </div>
            <div>
              <strong>Last Activity:</strong> {formatTimestamp(logs[0].timestamp)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessLogs;