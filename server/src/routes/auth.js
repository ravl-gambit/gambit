import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

router.post('/callback', async (req, res) => {
  const { code, code_verifier } = req.body;

  if (!code || !code_verifier) {
    return res.status(400).json({ error: 'Missing code or code_verifier' });
  }

  try {
    // Exchange authorisation code for Lichess access token
    const tokenRes = await fetch('https://lichess.org/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        code_verifier,
        redirect_uri: req.body.redirect_uri,
        client_id: 'gambit',
      }),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      console.error('Lichess token exchange failed:', tokenRes.status, body);
      return res.status(401).json({ error: 'Token exchange with Lichess failed' });
    }

    const { access_token } = await tokenRes.json();

    // Fetch the authenticated user's Lichess profile
    const profileRes = await fetch('https://lichess.org/api/account', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!profileRes.ok) {
      return res.status(401).json({ error: 'Failed to fetch Lichess profile' });
    }

    const profile = await profileRes.json();

    // Upsert into users table
    const { rows } = await query(
      `INSERT INTO users (lichess_id, display_name, access_token)
       VALUES ($1, $2, $3)
       ON CONFLICT (lichess_id) DO UPDATE
         SET display_name  = EXCLUDED.display_name,
             access_token  = EXCLUDED.access_token
       RETURNING id, lichess_id, display_name`,
      [profile.id, profile.username, access_token],
    );

    res.json({ user: rows[0] });
  } catch (err) {
    console.error('Auth callback error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
