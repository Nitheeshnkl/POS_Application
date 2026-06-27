import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, style, ...props }, ref) => (
    <div style={{ marginBottom: '14px' }}>
      {label && (
        <label style={{
          display: 'block', fontSize: '13px', fontWeight: 500,
          color: '#374151', marginBottom: '5px'
        }}>
          {label}
        </label>
      )}
      <input
        ref={ref}
        {...props}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          border: `1px solid ${error ? '#ef4444' : '#d1d5db'}`,
          borderRadius: '6px',
          padding: '9px 12px',
          fontSize: '14px',
          color: '#111827',
          background: '#ffffff',
          outline: 'none',
          ...style,
        }}
        onFocus={e => { e.target.style.borderColor = '#1a6b3c'; e.target.style.boxShadow = '0 0 0 2px rgba(26,107,60,0.12)'; }}
        onBlur={e => { e.target.style.borderColor = error ? '#ef4444' : '#d1d5db'; e.target.style.boxShadow = 'none'; }}
      />
      {error && <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>{error}</p>}
    </div>
  )
);
Input.displayName = 'Input';
export default Input;
