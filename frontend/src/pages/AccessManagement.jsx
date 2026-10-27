import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const AccessManagement = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [accessList, setAccessList] = useState({
    allowedUsernames: [],
    allowedEmails: [],
    allowedPhones: []
  });
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchFileAndAccess();
  }, [id]);

  const fetchFileAndAccess = async () => {
    try {
      const [fileRes, accessRes] = await Promise.all([
        api.get(`/spdf/${id}`),
        api.get(`/access/${id}`)
      ]);
      
      setFile(fileRes.data.data.file);
      setAccessList(accessRes.data.data);
    } catch (err) {
      setError('Failed to load file access data');
    } finally {
      setLoading(false);
    }
  };

  const addAccess = async () => {
    setError('');
    setSuccess('');

    const usernames = newUsername ? [newUsername] : [];
    const emails = newEmail ? [newEmail] : [];
    const phones = newPhone ? [newPhone] : [];

    if (usernames.length === 0 && emails.length === 0 && phones.length === 0) {
      setError('Please enter at least one username, email, or phone');
      return;
    }

    try {
      await api.post(`/access/${id}/add`, { usernames, emails, phones });
      setSuccess('Access granted successfully');
      setNewUsername('');
      setNewEmail('');
      setNewPhone('');
      fetchFileAndAccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add access');
    }
  };

  const removeAccess = async (type, value) => {
    if (!confirm(`Remove access for ${value}?`)) return;

    try {
      const payload = {};
      payload[type] = [value];
      await api.post(`/access/${id}/remove`, payload);
      setSuccess('Access removed successfully');
      fetchFileAndAccess();
    } catch (err) {
      setError('Failed to remove access');
    }
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      <button onClick={() => navigate('/dashboard')} className="btn btn-outline" style={{ marginBottom: '20px' }}>
        ← Back to Dashboard
      </button>

      <h1 style={{ marginBottom: '8px' }}>Manage Access</h1>
      <p style={{ color: 'var(--text-light)', marginBottom: '32px' }}>
        File: <strong>{file?.originalFilename}</strong>
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Add Access Section */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <h2 style={{ marginBottom: '20px' }}>Grant New Access</h2>
        
        <div className="input-group">
          <label>Username</label>
          <input
            type="text"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="Enter username"
          />
        </div>

        <div className="input-group">
          <label>Email</label>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Enter email"
          />
        </div>

        <div className="input-group">
          <label>Phone Number</label>
          <input
            type="tel"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder="Enter phone"
          />
        </div>

        <button onClick={addAccess} className="btn btn-primary">
          Grant Access
        </button>
      </div>

      {/* Current Access Lists */}
      <div className="card">
        <h2 style={{ marginBottom: '20px' }}>Current Access List</h2>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Usernames ({accessList.allowedUsernames.length})</h3>
          {accessList.allowedUsernames.length === 0 ? (
            <p style={{ color: 'var(--text-light)' }}>No usernames added</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {accessList.allowedUsernames.map((username, idx) => (
                <div key={idx} className="badge badge-primary" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px'
                }}>
                  {username}
                  <button
                    onClick={() => removeAccess('usernames', username)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      fontSize: '16px'
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Emails ({accessList.allowedEmails.length})</h3>
          {accessList.allowedEmails.length === 0 ? (
            <p style={{ color: 'var(--text-light)' }}>No emails added</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {accessList.allowedEmails.map((email, idx) => (
                <div key={idx} className="badge badge-success" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px'
                }}>
                  {email}
                  <button
                    onClick={() => removeAccess('emails', email)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      fontSize: '16px'
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Phone Numbers ({accessList.allowedPhones.length})</h3>
          {accessList.allowedPhones.length === 0 ? (
            <p style={{ color: 'var(--text-light)' }}>No phones added</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {accessList.allowedPhones.map((phone, idx) => (
                <div key={idx} className="badge badge-danger" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px'
                }}>
                  {phone}
                  <button
                    onClick={() => removeAccess('phones', phone)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      fontSize: '16px'
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccessManagement;