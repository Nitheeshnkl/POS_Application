import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => (
    <div className="mb-3.5">
      {label && (
        <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
          {label}
        </label>
      )}
      <input
        ref={ref}
        {...props}
        className={`w-full box-border border rounded-md py-2 px-3 text-sm text-slate-900 bg-white outline-none transition-shadow focus:border-green-600 focus:ring-2 focus:ring-green-600/20 ${
          error ? 'border-red-500' : 'border-slate-300'
        } ${className}`}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
);
Input.displayName = 'Input';
export default Input;
