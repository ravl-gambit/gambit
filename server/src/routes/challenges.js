import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// POST /challenges — create a Lichess challenge between two ladder members
router.post('/', async (req, res) => {
  const { group_id, challenger_id, defender_id } = req.body;
  if (!group_id || !challenger_id || !defender_id) {
    return res.status(400).json({ error: 'group_id, challenger_id, and defender_id are required' });
  }

  try {
    // Fetch both members' ranks for the current season
    const { rows: memberRows } = await query(
      `SELECT gm.user_id, gm.rank
       FROM group_members gm
       JOIN groups g ON g.id = gm.group_id
       WHERE gm.group_id = $1 AND gm.user_id = ANY($2::int[]) AND gm.season = g.season`,
      [group_id, [challenger_id, defender_id]],
    );

    if (memberRows.length < 2) {
      return res.status(400).json({ error: 'Both users must be members of this group' });
    }

    const challenger = memberRows.find((r) => r.user_id === challenger_id);
    const defender = memberRows.find((r) => r.user_id === defender_id);

    if (!challenger || !defender) {
      return res.status(400).json({ error: 'Member not found in group' });
    }
    if (defender.rank >= challenger.rank) {
      return res.status(400).json({ error: 'Defender must be ranked above challenger' });
    }
    if (challenger.rank - defender.rank > 3) {
      return res.status(400).json({ error: 'Can only challenge up to 3 spots above' });
    }

    // Fetch challenger access token and defender lichess_id
    const { rows: challengerUser } = await query(
      `SELECT access_token FROM users WHERE id = $1`,
      [challenger_id],
    );
    const { rows: defenderUser } = await query(
      `SELECT lichess_id FROM users WHERE id = $1`,
      [defender_id],
    );

    const accessToken = challengerUser[0]?.access_token;
    const defenderLichessId = defenderUser[0]?.lichess_id;

    if (!accessToken) return res.status(400).json({ error: 'Challenger has no Lichess token' });

    // Create the Lichess challenge
    const lichessRes = await fetch(
      `https://lichess.org/api/challenge/${defenderLichessId}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          rated: 'true',
          'clock.limit': '600',
          'clock.increment': '0',
          color: 'random',
        }).toString(),
      },
    );

    if (!lichessRes.ok) {
      const errText = await lichessRes.text();
      console.error('Lichess challenge error:', lichessRes.status, errText);
      return res.status(502).json({ error: 'Failed to create Lichess challenge' });
    }

    const data = await lichessRes.json();
    res.json({ challenge_url: data.challenge.url });
  } catch (err) {
    console.error('Challenge error:', err);
    res.status(500).json({ error: 'Failed to create challenge' });
  }
});

export default router;
