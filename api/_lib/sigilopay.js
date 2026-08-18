// Configuração e helper compartilhados para falar com a API da SigiloPay.
// Nunca importe este arquivo do lado do navegador — ele só deve rodar em
// funções serverless (pasta /api), pois usa a chave secreta.

const API_BASE = 'https://app.sigilopay.com.br/api/v1';

// Credenciais da SigiloPay. Em produção, prefira configurar como variáveis
// de ambiente no painel da Vercel (Project Settings > Environment Variables):
//   SIGILOPAY_PUBLIC_KEY
//   SIGILOPAY_SECRET_KEY
// Os valores abaixo são usados como fallback caso as variáveis não existam.
const PUBLIC_KEY = process.env.SIGILOPAY_PUBLIC_KEY || 'aristocrata-black_hkca5ja5jzu9too3';
const SECRET_KEY = process.env.SIGILOPAY_SECRET_KEY || 'zz86vnomruvkmmq0uj778346tvvm96edbgalvbsftnyc20bree32narmjscrbhmd';

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'x-public-key': PUBLIC_KEY,
    'x-secret-key': SECRET_KEY,
  };
}

async function sigilopayFetch(path, options) {
  const res = await fetch(API_BASE + path, {
    method: options.method || 'GET',
    headers: authHeaders(),
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (e) {
    json = null;
  }

  return { ok: res.ok, status: res.status, json, raw: text };
}

function generateIdentifier() {
  const rand = Math.random().toString(36).slice(2, 8);
  return 'kit_trio_growth_' + Date.now() + '_' + rand;
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

module.exports = { sigilopayFetch, generateIdentifier, onlyDigits, API_BASE };
