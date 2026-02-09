
-- 1. Suppression de toutes les tables existantes et de leurs dépendances
DROP TABLE IF EXISTS microfinances CASCADE;
DROP TABLE IF EXISTS credits CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS logs CASCADE;

-- 2. Création de la table unique (Modèle Document JSONB)
CREATE TABLE microfinances (
  code TEXT PRIMARY KEY,
  microfinance JSONB DEFAULT '{"name": "", "address": "", "phone": "", "email": "", "logo": ""}'::jsonb,
  credits JSONB DEFAULT '[]'::jsonb,
  users JSONB DEFAULT '[]'::jsonb,
  logs JSONB DEFAULT '[]'::jsonb,
  auto_deactivation JSONB DEFAULT '{"days": [], "startTime": "00:00", "endTime": "23:59", "enabled": false}'::jsonb,
  credit_types JSONB DEFAULT '["ORDINAIRE FIDELIA", "MOKPOKPO PRE-PAYER"]'::jsonb
);

-- 3. Désactivation de la sécurité RLS
ALTER TABLE microfinances DISABLE ROW LEVEL SECURITY;
