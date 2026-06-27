import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Setup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name:         '',
    username:     '',
    password:     '',
    storeName:    '',
    storePhone:   '',
    storeAddress: '',
  });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!form.name.trim())        return setError('Enter your full name');
    if (!form.username.trim())    return setError('Enter a username');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    if (!form.storeName.trim())   return setError('Enter your store name');

    setLoading(true);
    try {
      await axios.post('/api/v1/auth/setup', {
        name:         form.name.trim(),
        username:     form.username.trim(),
        password:     form.password,
        storeName:    form.storeName.trim(),
        storePhone:   form.storePhone.trim(),
        storeAddress: form.storeAddress.trim(),
      });
      navigate('/login');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Setup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%', boxSizing: 'border-box' as const,
    border: '1px solid #d1d5db', borderRadius: '6px',
    padding: '10px 12px', fontSize: '14px',
    color: '#111', background: '#fff', outline: 'none',
  };

  function Field({ label, field, type = 'text', placeholder, optional = false }: {
    label: string; field: string; type?: string; placeholder: string; optional?: boolean;
  }) {
    return (
      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#333', marginBottom: '6px' }}>
          {label}{optional && <span style={{ fontWeight: 400, color: '#aaa', marginLeft: '4px' }}>(optional)</span>}
        </label>
        <input
          type={type}
          value={(form as any)[field]}
          onChange={e => set(field, e.target.value)}
          placeholder={placeholder}
          style={inputStyle}
          onFocus={e => e.target.style.borderColor = '#1a6b3c'}
          onBlur={e => e.target.style.borderColor = '#d1d5db'}
        />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f5f4f0', padding: '20px'
    }}>
      <div style={{
        background: '#fff', borderRadius: '12px', padding: '32px 28px',
        width: '100%', maxWidth: '400px',
        boxShadow: '0 2px 16px rgba(0,0,0,0.08)'
      }}>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%',
            background: '#1a6b3c', display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: '22px', color: '#fff', marginBottom: '10px'
          }}>⚙</div>
          <h1 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: '#111' }}>
            First-time setup
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#888' }}>
            This runs once to create your owner account
          </p>
        </div>

        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca',
            color: '#b91c1c', borderRadius: '6px',
            padding: '10px 12px', fontSize: '13px', marginBottom: '16px'
          }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <p style={{ fontSize: '11px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>
            Owner account
          </p>

          <Field label="Full name" field="name"     placeholder="Your full name" />
          <Field label="Username"  field="username"  placeholder="e.g. admin" />
          <Field label="Password"  field="password"  type="password" placeholder="Min 6 characters" />

          <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '18px 0' }} />

          <p style={{ fontSize: '11px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>
            Store details
          </p>

          <Field label="Store name"   field="storeName"    placeholder="Sri Murugan Store" />
          <Field label="Phone number" field="storePhone"   placeholder="9876543210" optional />
          <Field label="Address"      field="storeAddress" placeholder="Shop address" optional />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '11px', marginTop: '6px',
              background: loading ? '#6aad8a' : '#1a6b3c',
              color: '#fff', border: 'none', borderRadius: '6px',
              fontSize: '14px', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Creating account…' : 'Create account & continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
