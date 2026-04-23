
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://miaqloahnbfxdttfifyj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pYXFsb2FobmJmeGR0dGZpZnlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MzAxMzYsImV4cCI6MjA4NjIwNjEzNn0.ahntdWsb-TUA-3YtNgK7Rv_me_uEQLb6J5gUa93mxCM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const { data, error } = await supabase
    .from('microfinances')
    .select('credits');

  if (error) {
    console.error('Error fetching data:', error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('Aucun client enregistré trouvé dans la base de données.');
    return;
  }

  const allClients: any[] = [];
  data.forEach((row: any) => {
    if (row.credits && Array.isArray(row.credits)) {
      row.credits.forEach((credit: any) => {
        allClients.push({
          name: credit.clientName,
          epargne: credit.noCompte,
          tontine: credit.noCompteTontine
        });
      });
    }
  });

  if (allClients.length === 0) {
    console.log('Aucun client trouvé dans les crédits.');
    return;
  }

  console.log(JSON.stringify(allClients, null, 2));
}

main();
