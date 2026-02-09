
import { createClient } from '@supabase/supabase-js';

/**
 * Récupère une variable d'environnement de manière robuste.
 */
const getEnv = (key: string): string => {
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key] as string;
    }
  } catch (e) {}

  try {
    const metaEnv = (import.meta as any).env;
    if (metaEnv) {
      if (metaEnv[key]) return metaEnv[key];
      if (metaEnv[`VITE_${key}`]) return metaEnv[`VITE_${key}`];
    }
  } catch (e) {}

  return '';
};

// URL mise à jour selon l'identifiant projet visible sur votre écran : gvqvbycvdysovanfpeur
const supabaseUrl = getEnv('SUPABASE_URL') || 'https://gvqvbycvdysovanfpeur.supabase.co';
// ATTENTION : Vous devez impérativement copier la clé 'anon' du projet 'gvqvbycvdysovanfpeur' 
// depuis votre tableau de bord Supabase (Settings > API) pour remplacer celle-ci dessous.
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2cXZieWN2ZHlzb3ZhbmZwZXVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4ODM1OTEsImV4cCI6MjA4MjQ1OTU5MX0.placeholder_key';

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

if (!supabaseAnonKey || supabaseAnonKey.includes('placeholder') || !supabaseAnonKey.startsWith('eyJ')) {
  console.warn(
    "⚠️ CONFIGURATION SUPABASE REQUISE :\n" +
    "L'identifiant du projet a été corrigé vers 'gvqvbycvdysovanfpeur'.\n" +
    "1. Allez sur votre dashboard Supabase > Settings > API.\n" +
    "2. Copiez la clé 'anon' (public).\n" +
    "3. Collez-la dans le fichier supabase.ts à la place de la clé actuelle."
  );
}
