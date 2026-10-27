import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import FileUpload from '../components/FileUpload';

const UploadPDF = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [accessControl, setAccessControl] = useState({
    usernames: '',
    emails: '',
    phones: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleFileUpload = (uploadedFile) => {
    setFile(uploadedFile);
    setError('');
  };

  const handleInputChange = (field, value) => {
    setAccessControl(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const parseAccessList = (input) => {
    if (!input || input.trim() === '') return [];
    return input
      .split(',')
      .map(item => item.trim())
      .filter(item => item !== '');
  };

  const validateAccessControl = () => {
    const usernames = parseAccessList(accessControl.usernames);
    const emails = parseAccessList(accessControl.emails);
    const phones = parseAccessList(accessControl.phones);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of emails) {
      if (!emailRegex.test(email)) {
        setError(`Invalid email format: ${email}`);
        return false;
      }
    }

    // Validate phone format
    const phoneRegex = /^[0-9]{10,15}$/;
    for (const phone of phones) {
      if (!phoneRegex.test(phone)) {
        setError(`Invalid phone number: ${phone}. Must be 10-15 digits.`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a PDF file');
      return;
    }

    if (!validateAccessControl()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const usernames = parseAccessList(accessControl.usernames);
      const emails = parseAccessList(accessControl.emails);
      const phones = parseAccessList(accessControl.phones);

      formData.append('allowedUsernames', JSON.stringify(usernames));
      formData.append('allowedEmails', JSON.stringify(emails));
      formData.append('allowedPhones', JSON.stringify(phones));

      await api.post('/spdf/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setUploadSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (uploadSuccess) {
    return (
      <div className="container" style={{ maxWidth: '600px', marginTop: '80px' }}>
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>✅</div>
          <h2 style={{ marginBottom: '12px' }}>Upload Successful!</h2>
          <p style={{ color: 'var(--text-light)', marginBottom: '20px' }}>
            Your PDF has been successfully converted to SPDF format and secured.
          </p>
          <div className="spinner" style={{ width: '30px', height: '30px', margin: '0 auto' }}></div>
          <p style={{ color: 'var(--text-light)', fontSize: '14px', marginTop: '12px' }}>
            Redirecting to dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '700px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ marginBottom: '8px' }}>Upload & Secure PDF</h1>
        <p style={{ color: 'var(--text-light)', margin: 0 }}>
          Convert your PDF to a secure SPDF format and control who can access it
        </p>
      </div>

      <div className="card">
        {error && <div className="alert alert-error" style={{ marginBottom: '20px' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* File Upload Component */}
          <FileUpload onUpload={handleFileUpload} loading={loading} />

          {/* Access Control Section */}
          <div style={{
            marginTop: '32px',
            padding: '20px',
            background: 'var(--bg)',
            borderRadius: '8px',
            border: '1px solid var(--border)'
          }}>
            <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🔐 Access Control
            </h3>
            <p style={{ 
              color: 'var(--text-light)', 
              fontSize: '14px',
              marginBottom: '20px',
              lineHeight: '1.6'
            }}>
              Specify who should have access to this document. Enter usernames, emails, or phone numbers 
              separated by commas. <strong>Leave empty to grant access only to yourself.</strong>
            </p>

            <div className="input-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                👤 Allowed Usernames
                <span style={{ 
                  fontSize: '12px', 
                  color: 'var(--text-light)', 
                  fontWeight: 'normal' 
                }}>
                  (comma-separated)
                </span>
              </label>
              <input
                type="text"
                value={accessControl.usernames}
                onChange={(e) => handleInputChange('usernames', e.target.value)}
                placeholder="e.g., alice, bob, charlie"
              />
              <small style={{ color: 'var(--text-light)', fontSize: '12px' }}>
                Users with these usernames can access this document
              </small>
            </div>

            <div className="input-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                📧 Allowed Emails
                <span style={{ 
                  fontSize: '12px', 
                  color: 'var(--text-light)', 
                  fontWeight: 'normal' 
                }}>
                  (comma-separated)
                </span>
              </label>
              <input
                type="text"
                value={accessControl.emails}
                onChange={(e) => handleInputChange('emails', e.target.value)}
                placeholder="e.g., alice@example.com, bob@company.com"
              />
              <small style={{ color: 'var(--text-light)', fontSize: '12px' }}>
                Users with these email addresses can access this document
              </small>
            </div>

            <div className="input-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                📱 Allowed Phone Numbers
                <span style={{ 
                  fontSize: '12px', 
                  color: 'var(--text-light)', 
                  fontWeight: 'normal' 
                }}>
                  (comma-separated)
                </span>
              </label>
              <input
                type="text"
                value={accessControl.phones}
                onChange={(e) => handleInputChange('phones', e.target.value)}
                placeholder="e.g., 1234567890, 9876543210"
              />
              <small style={{ color: 'var(--text-light)', fontSize: '12px' }}>
                Users with these phone numbers can access this document
              </small>
            </div>
          </div>

          {/* Info Box */}
          <div className="alert alert-info" style={{ marginTop: '20px' }}>
            <strong>📌 Important:</strong>
            <ul style={{ margin: '8px 0 0 20px', lineHeight: '1.6' }}>
              <li>Your PDF will be converted to .spdf format</li>
              <li>Only authorized users can access the document</li>
              <li>Each access requires OTP verification</li>
              <li>You can modify access permissions later</li>
              <li>All access attempts will be logged</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            marginTop: '24px',
            paddingTop: '24px',
            borderTop: '1px solid var(--border)'
          }}>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading || !file}
              style={{ flex: 1, padding: '12px' }}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ 
                    width: '16px', 
                    height: '16px', 
                    borderWidth: '2px',
                    display: 'inline-block',
                    marginRight: '8px'
                  }}></span>
                  Uploading & Securing...
                </>
              ) : (
                '🔒 Upload & Secure PDF'
              )}
            </button>
            <button 
              type="button" 
              onClick={() => navigate('/dashboard')} 
              className="btn btn-outline"
              disabled={loading}
              style={{ padding: '12px 24px' }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* Help Section */}
      <div className="card" style={{ marginTop: '24px', background: 'var(--bg)' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>💡 Need Help?</h3>
        <details>
          <summary style={{ cursor: 'pointer', color: 'var(--primary)', fontWeight: '500' }}>
            How does access control work?
          </summary>
          <p style={{ 
            marginTop: '12px', 
            paddingLeft: '20px', 
            color: 'var(--text-light)',
            fontSize: '14px',
            lineHeight: '1.6'
          }}>
            Users can access your document if they match ANY of the criteria you specify (username, 
            email, or phone). For example, if you add "alice" as username and "bob@example.com" as 
            email, both Alice (by username) and Bob (by email) will have access.
          </p>
        </details>
        <details style={{ marginTop: '12px' }}>
          <summary style={{ cursor: 'pointer', color: 'var(--primary)', fontWeight: '500' }}>
            What happens after upload?
          </summary>
          <p style={{ 
            marginTop: '12px', 
            paddingLeft: '20px', 
            color: 'var(--text-light)',
            fontSize: '14px',
            lineHeight: '1.6'
          }}>
            Your PDF will be converted to .spdf format with embedded metadata. The file will be stored 
            securely on the server, and access rules will be saved to the database. Users trying to open 
            the file will need to verify their identity via OTP before viewing.
          </p>
        </details>
      </div>
    </div>
  );
};

export default UploadPDF;