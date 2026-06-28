import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

export const LanguageToggle: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200 ml-4 h-10 items-center">
      <button
        onClick={() => setLanguage('EN')}
        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
          language === 'EN' ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        English
      </button>
      <button
        onClick={() => setLanguage('TA')}
        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
          language === 'TA' ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        தமிழ்
      </button>
    </div>
  );
};
