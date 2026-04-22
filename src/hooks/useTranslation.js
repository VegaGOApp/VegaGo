import { useMemo } from 'react';
import { TRANSLATIONS } from '../constants/translations';

export function useTranslation(lang) {
  return useMemo(() => {
    const base = TRANSLATIONS[lang] || TRANSLATIONS.es;
    const flags = { 
      es: "https://flagcdn.com/w80/es.png", 
      va: "/flags/va.png", 
      gb: "https://flagcdn.com/w80/gb.png", 
      ru: "https://flagcdn.com/w80/ru.png" 
    };
    return { 
      t: base, 
      flag: flags[lang] || flags.es,
      currentLang: lang
    };
  }, [lang]);
}
