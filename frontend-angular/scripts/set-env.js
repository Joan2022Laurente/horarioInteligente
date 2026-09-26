const fs = require('fs');
const path = require('path');

// Cargar variables desde .env si existe
const envPath = path.resolve(__dirname, '../.env');
const envVars = {};

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        envVars[key] = val;
      }
    }
  }
}

// Fallbacks de entorno o defaults seguros
const supabaseUrl = process.env.SUPABASE_URL || envVars.SUPABASE_URL || 'https://hvunobsbasdksiajmfjf.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || envVars.SUPABASE_ANON_KEY || '';
const businessApiUrl = process.env.BUSINESS_API_URL || envVars.BUSINESS_API_URL || 'http://localhost:8080/api/v1';
const academicApiUrl = process.env.ACADEMIC_API_URL || envVars.ACADEMIC_API_URL || 'http://localhost:8080/api/v1';

const targetDir = path.resolve(__dirname, '../src/environments');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// OpenRouter Keys
const openRouterKeysRaw = process.env.OPENROUTER_API_KEYS || envVars.OPENROUTER_API_KEYS || '';
const openRouterKeys = openRouterKeysRaw ? openRouterKeysRaw.split(',').map(k => k.trim()).filter(Boolean) : [];
if (openRouterKeys.length === 0 && (process.env.OPENROUTER_API_KEY || envVars.OPENROUTER_API_KEY)) {
  openRouterKeys.push(process.env.OPENROUTER_API_KEY || envVars.OPENROUTER_API_KEY);
}

function generateEnvFile(isProd) {
  const activeBusinessUrl = isProd ? '/api/v1' : (process.env.BUSINESS_API_URL || envVars.BUSINESS_API_URL || 'http://localhost:8080/api/v1');
  const activeKeys = isProd ? [] : openRouterKeys;
  return `// Autogenerado automáticamente por scripts/set-env.js - NO MODIFICAR MANUALMENTE
export const environment = {
  production: ${isProd},
  businessApiUrl: '${activeBusinessUrl}',
  academicApiUrl: '${academicApiUrl}',
  supabaseUrl: '${supabaseUrl}',
  supabaseAnonKey: '${supabaseAnonKey}',
  openRouterApiKeys: ${JSON.stringify(activeKeys)}
};
`;
}

fs.writeFileSync(path.join(targetDir, 'environment.ts'), generateEnvFile(false), 'utf8');
fs.writeFileSync(path.join(targetDir, 'environment.prod.ts'), generateEnvFile(true), 'utf8');

console.log('✅ [set-env] Archivos environment.ts y environment.prod.ts generados con éxito desde .env (Sin Service Role Key)');
