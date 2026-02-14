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

// Identifiants mis à jour vers le projet miaqloahnbfxdttfifyj
const supabaseUrl = getEnv('SUPABASE_URL') || 'https://miaqloahnbfxdttfifyj.supabase.co';
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pYXFsb2FobmJmeGR0dGZpZnlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MzAxMzYsImV4cCI6MjA4NjIwNjEzNn0.ahntdWsb-TUA-3YtNgK7Rv_me_uEQLb6J5gUa93mxCM';

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

if (!supabaseAnonKey || !supabaseAnonKey.startsWith('eyJ')) {
  console.warn(
    "⚠️ CONFIGURATION SUPABASE REQUISE :\n" +
    "Assurez-vous que les variables d'environnement sont correctement définies sur votre plateforme de déploiement."
  );
}