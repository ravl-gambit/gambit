const LICHESS_HOST = 'https://lichess.org';
const CLIENT_ID = 'gambit';

function generateVerifier() {
  const bytes = new Uint8Array(64);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function generateChallenge(verifier) {
  const data = new TextEncoder().encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export async function initiateLogin() {
  const verifier = generateVerifier();
  const challenge = await generateChallenge(verifier);
  const redirectUri = `${window.location.origin}/auth/callback`;

  sessionStorage.setItem('pkce_verifier', verifier);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  window.location.href = `${LICHESS_HOST}/oauth?${params}`;
}

export function getUser() {
  try {
    const raw = localStorage.getItem('gambit_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveUser(user) {
  localStorage.setItem('gambit_user', JSON.stringify(user));
}

export function clearUser() {
  localStorage.removeItem('gambit_user');
}
