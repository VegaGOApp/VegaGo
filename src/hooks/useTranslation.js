import { useMemo } from 'react';
import { TRANSLATIONS } from '../constants/translations';
import { Flags } from '../assets/flags';

export function useTranslation(lang) {
  return useMemo(() => {
    const base = TRANSLATIONS[lang] || TRANSLATIONS.es;
    return { 
      t: base, 
      Flag: Flags[lang] || Flags.es,
      currentLang: lang
    };
  }, [lang]);
}
