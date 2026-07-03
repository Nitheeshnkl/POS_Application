import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { login } from '../../api/auth';
import { useLanguage } from '../../i18n/LanguageContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const setAuth   = useAuthStore(s => s.setAuth);
  const navigate  = useNavigate();
  const { t }     = useLanguage();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError(t('enterUsernameAndPassword'));
      return;
    }
    setLoading(true);
    try {
      const data = await login({ username: username.trim(), password });
      setAuth(data.user, data.accessToken);
      navigate(data.user.role === 'owner' ? '/owner' : '/cashier');
    } catch (err: any) {
      setError(err?.response?.data?.message || t('invalidUsernameOrPassword'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f5f4f0', padding: '20px'
    }}>
      <div style={{
        background: '#fff', borderRadius: '12px', padding: '36px 28px',
        width: '100%', maxWidth: '360px',
        boxShadow: '0 2px 16px rgba(0,0,0,0.08)'
      }}>

        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: '#1a6b3c', display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', color: '#fff', marginBottom: '12px'
          }}>ம</div>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111' }}>
            {t('storeName')}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#888' }}>
            {t('signInToContinue')}
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
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#333', marginBottom: '6px' }}>
              {t('username')}
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder={t('enterYourUsername')}
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box',
                border: '1px solid #d1d5db', borderRadius: '6px',
                padding: '10px 12px', fontSize: '14px',
                color: '#111', background: '#fff', outline: 'none'
              }}
              onFocus={e => e.target.style.borderColor = '#1a6b3c'}
              onBlur={e => e.target.style.borderColor = '#d1d5db'}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#333', marginBottom: '6px' }}>
              {t('password')}
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t('enterYourPassword')}
              style={{
                width: '100%', boxSizing: 'border-box',
                border: '1px solid #d1d5db', borderRadius: '6px',
                padding: '10px 12px', fontSize: '14px',
                color: '#111', background: '#fff', outline: 'none'
              }}
              onFocus={e => e.target.style.borderColor = '#1a6b3c'}
              onBlur={e => e.target.style.borderColor = '#d1d5db'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '11px',
              background: loading ? '#6aad8a' : '#1a6b3c',
              color: '#fff', border: 'none', borderRadius: '6px',
              fontSize: '14px', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? t('signingIn') : t('signIn')}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '12px', color: '#aaa', marginTop: '20px', marginBottom: 0 }}>
          {t('storeManagementSystem')}
        </p>
      </div>
    </div>
  );
}
