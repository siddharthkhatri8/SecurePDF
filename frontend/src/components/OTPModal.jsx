import { useState, useEffect, useRef } from 'react';

const OTPModal = ({ 
  isOpen, 
  onClose, 
  onVerify, 
  onRequestOTP, 
  loading,
  error,
  otpSent,
  expiryTime,

  userContact,
  setUserContact,
  contactMethod,
  setContactMethod
}) => {

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(300);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (otpSent && expiryTime) {
      const updateTimer = setInterval(() => {
        const now = new Date().getTime();
        const expiry = new Date(expiryTime).getTime();
        const diff = Math.floor((expiry - now) / 1000);
        
        if (diff <= 0) {
          setTimeLeft(0);
          clearInterval(updateTimer);
        } else {
          setTimeLeft(diff);
        }
      }, 1000);

      return () => clearInterval(updateTimer);
    }
  }, [otpSent, expiryTime]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOTPChange = (index, value) => {
    if (value && !/^[0-9]$/.test(value)) return;

    const newOTP = [...otp];
    newOTP[index] = value;
    setOtp(newOTP);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = () => {
    const otpString = otp.join('');
    if (otpString.length === 6) {
      onVerify(otpString);
    }
  };

  const handleRequestOTP = () => {
    if (!userContact) {
      alert("Please enter email or phone");
      return;
    }

    setOtp(['', '', '', '', '', '']);
    onRequestOTP(contactMethod); // ✅ FIXED
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="modal">
        <div className="modal-header">
          <h2 style={{ margin: 0 }}>🔐 OTP Verification</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {!otpSent ? (
          <div>
            <p style={{ marginBottom: '20px', color: 'var(--text-light)' }}>
              To access this document, we'll send a one-time password to verify your identity.
            </p>

            {/* ✅ METHOD SELECTION */}
            <div className="input-group">
              <label>Verification Method</label>
              <select
                value={contactMethod}
                onChange={(e) => setContactMethod(e.target.value)}
                style={{ width: '100%', padding: '12px' }}
              >
                <option value="email">Email</option>
                <option value="phone">SMS (Phone)</option>
              </select>
            </div>

            {/* ✅ INPUT FIELD (NEW) */}
            <div className="input-group" style={{ marginTop: "15px" }}>
              <label>
                {contactMethod === "email" ? "Enter Email" : "Enter Phone Number"}
              </label>

              <input
                type="text"
                value={userContact}
                onChange={(e) => setUserContact(e.target.value)}
                placeholder={
                  contactMethod === "email"
                    ? "Enter your email"
                    : "Enter phone number"
                }
                style={{ width: "100%", padding: "12px" }}
              />
            </div>

            {/* ✅ BUTTON */}
            <button
              onClick={handleRequestOTP}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: "15px" }}
              disabled={loading}
            >
              {loading
                ? 'Sending OTP...'
                : `Send OTP via ${contactMethod === 'email' ? 'Email' : 'SMS'}`}
            </button>
          </div>
        ) : (
          <div>
            <p style={{ marginBottom: '8px', color: 'var(--text-light)' }}>
              Enter the 6-digit code sent to your {contactMethod}
            </p>
            
            {timeLeft > 0 ? (
              <p style={{ marginBottom: '24px', color: 'var(--primary)', fontWeight: '500' }}>
                ⏱️ Code expires in: {formatTime(timeLeft)}
              </p>
            ) : (
              <p style={{ marginBottom: '24px', color: 'var(--danger)', fontWeight: '500' }}>
                ⚠️ Code has expired
              </p>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '24px' }}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={el => inputRefs.current[index] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleOTPChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  autoFocus={index === 0}
                  style={{
                    width: '48px',
                    height: '56px',
                    textAlign: 'center',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    border: '2px solid var(--border)',
                    borderRadius: '8px'
                  }}
                />
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={handleSubmit}
                className="btn btn-primary"
                style={{ width: '100%' }}
                disabled={loading || otp.join('').length !== 6 || timeLeft === 0}
              >
                {loading ? 'Verifying...' : 'Verify & Access'}
              </button>

              <button
                onClick={handleRequestOTP}
                className="btn btn-outline"
                style={{ width: '100%' }}
                disabled={loading || timeLeft > 240}
              >
                Resend OTP
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OTPModal;