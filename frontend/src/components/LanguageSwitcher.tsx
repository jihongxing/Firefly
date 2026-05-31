import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/appStore';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const { currentLocale, setLocale } = useAppStore();

  const languages = [
    { code: 'zh-CN', label: '中文', flag: '🇨🇳' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  ];

  const handleChange = (locale: string) => {
    setLocale(locale);
    i18n.changeLanguage(locale);
    localStorage.setItem('locale', locale);
  };

  return (
    <div className="flex items-center gap-2">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => handleChange(lang.code)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
            currentLocale === lang.code
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <span className="mr-1">{lang.flag}</span>
          {lang.label}
        </button>
      ))}
    </div>
  );
}
