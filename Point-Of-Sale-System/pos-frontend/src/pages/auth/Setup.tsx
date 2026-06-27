import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Field({
  label, value, onChange, type = 'text', placeholder, optional = false
}: {
  label: string; value: string;
  onChange: (v: string) => void;
  type?: string; placeholder: string; optional?: boolean;
}) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '5px' }}>
        {label}
        {optional && <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: '4px' }}>(optional)</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', boxSizing: 'border-box',
          border: '1px solid #d1d5db', borderRadius: '6px',
          padding: '10px 12px', fontSize: '14px',
          color: '#111827', background: '#ffffff', outline: 'none',
        }}
        onFocus={e => { e.target.style.borderColor = '#1a6b3c'; e.target.style.boxShadow = '0 0 0 2px rgba(26,107,60,0.12)'; }}
        onBlur={e => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
      />
    </div>
  );
}

export default function Setup() {
  const navigate = useNavigate();

  const [name,         setName]         = useState('');
  const [username,     setUsername]     = useState('');
  const [password,     setPassword]     = useState('');
  const [storeName,    setStoreName]    = useState('');
  const [storePhone,   setStorePhone]   = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim())        return setError('Enter your full name');
    if (!username.trim())    return setError('Enter a username');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    if (!storeName.trim())   return setError('Enter your store name');

    setLoading(true);
    try {
      await axios.post('/api/v1/auth/setup', {
        name: name.trim(), username: username.trim(), password,
        storeName: storeName.trim(), storePhone: storePhone.trim(),
        storeAddress: storeAddress.trim(),
      });
      navigate('/login');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Setup failed. Try again.');
    } finally {
      setLoading(false);
    }
  }

  const sectionLabel = (text: string) => (
    <p style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>{text}</p>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', padding: '20px' }}>
      <div style={{ background: '#fff', borderRadius: '12px', padding: '32px 28px', width: '100%', maxWidth: '400px', boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.06)' }}>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#1a6b3c', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', color: '#fff', marginBottom: '10px' }}>⚙</div>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>First-time setup</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>Create your owner account to get started</p>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '6px', padding: '10px 12px', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off">
          {sectionLabel('Owner account')}
          <Field label="Full name" value={name}        onChange={setName}        placeholder="Your full name" />
          <Field label="Username"  value={username}    onChange={setUsername}    placeholder="e.g. admin" />
          <Field label="Password"  value={password}    onChange={setPassword}    type="password" placeholder="Min 6 characters" />

          <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '18px 0' }} />
          {sectionLabel('Store details')}

          <Field label="Store name"  value={storeName}    onChange={setStoreName}    placeholder="Sri Murugan Store" />
          <Field label="Phone"       value={storePhone}   onChange={setStorePhone}   placeholder="9876543210" optional />
          <Field label="Address"     value={storeAddress} onChange={setStoreAddress} placeholder="Shop address" optional />

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '11px', marginTop: '6px',
            background: loading ? '#6aad8a' : '#1a6b3c',
            color: '#fff', border: 'none', borderRadius: '6px',
            fontSize: '14px', fontWeight: 500,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}>
            {loading ? 'Creating account…' : 'Create account & continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
