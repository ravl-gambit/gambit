import { Router } from 'express';
import { query } from '../db.js';
import pool from '../db.js';

const router = Router();

// Glicko-1 rating update for a single game.
// Returns { newRating, newRD } for `player` after playing against `opponent`.
// score: 1 = win, 0 = loss, 0.5 = draw
function glicko1Update(player, opponent, score) {
  const q = Math.log(10) / 400;
  const g = (rd) => 1 / Math.sqrt(1 + (3 * q * q * rd * rd) / (Math.PI * Math.PI));

  const gOpp = g(opponent.rd);
  const E = 1 / (1 + Math.pow(10, (-gOpp * (player.rating - opponent.rating)) / 400));
  const dSquared = 1 / (q * q * gOpp * gOpp * E * (1 - E));

  const newRating = player.rating + (q / (1 / (player.rd * player.rd) + 1 / dSquared)) * gOpp * (score - E);
  const newRD = Math.sqrt(1 / (1 / (player.rd * player.rd) + 1 / dSquared));

  // Clamp RD to [30, 350]
  return { newRating, newRD: Math.min(350, Math.max(30, newRD)) };
}

// POST /results — record a game result and update ranks and Glicko ratings
router.post('/', async (req, res) => {
  const { group_id, challenger_id, defender_id, winner, lichess_game_id } = req.body;

  if (!group_id || !challenger_id || !defender_id || !winner) {
    return res.status(400).json({ error: 'group_id, challenger_id, defender_id, and winner are required' });
  }
  if (!['challenger', 'defender', 'draw'].includes(winner)) {
    return res.status(400).json({ error: 'winner must be challenger, defender, or draw' });
  }

  try {
    const { rows: groupRows } = await query(
      `SELECT season FROM groups WHERE id = $1`,
      [group_id],
    );
    if (!groupRows.length) return res.status(404).json({ error: 'Group not found' });
    const { season } = groupRows[0];

    const { rows: memberRows } = await query(
      `SELECT user_id, rank, rating, rating_deviation FROM group_members
       WHERE group_id = $1 AND season = $2 AND user_id = ANY($3::int[])`,
      [group_id, season, [challenger_id, defender_id]],
    );
    if (memberRows.length < 2) {
      return res.status(400).json({ error: 'Both users must be members of this group' });
    }

    const challengerMember = memberRows.find((r) => r.user_id === challenger_id);
    const defenderMember = memberRows.find((r) => r.user_id === defender_id);

    const winner_id =
      winner === 'challenger' ? challenger_id :
      winner === 'defender'   ? defender_id   : null;

    await query(
      `INSERT INTO ladder_results (group_id, challenger_id, defender_id, winner_id, lichess_game_id, season)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [group_id, challenger_id, defender_id, winner_id, lichess_game_id || null, season],
    );

    // Glicko-1 score from challenger's perspective
    const challengerScore = winner === 'challenger' ? 1 : winner === 'defender' ? 0 : 0.5;
    const defenderScore = 1 - challengerScore;

    const challengerGlicko = glicko1Update(
      { rating: parseFloat(challengerMember.rating), rd: parseFloat(challengerMember.rating_deviation) },
      { rating: parseFloat(defenderMember.rating), rd: parseFloat(defenderMember.rating_deviation) },
      challengerScore,
    );
    const defenderGlicko = glicko1Update(
      { rating: parseFloat(defenderMember.rating), rd: parseFloat(defenderMember.rating_deviation) },
      { rating: parseFloat(challengerMember.rating), rd: parseFloat(challengerMember.rating_deviation) },
      defenderScore,
    );

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update Glicko ratings for both players
      await client.query(
        `UPDATE group_members SET rating = $3, rating_deviation = $4
         WHERE group_id = $1 AND season = $2 AND user_id = $5`,
        [group_id, season, challengerGlicko.newRating, challengerGlicko.newRD, challenger_id],
      );
      await client.query(
        `UPDATE group_members SET rating = $3, rating_deviation = $4
         WHERE group_id = $1 AND season = $2 AND user_id = $5`,
        [group_id, season, defenderGlicko.newRating, defenderGlicko.newRD, defender_id],
      );

      // Rank update — only when challenger wins and was ranked below defender
      if (winner === 'challenger') {
        const C = challengerMember.rank;
        const D = defenderMember.rank;
        if (D < C) {
          await client.query(
            `UPDATE group_members SET rank = rank + 1
             WHERE group_id = $1 AND season = $2 AND rank >= $3 AND rank < $4`,
            [group_id, season, D, C],
          );
          await client.query(
            `UPDATE group_members SET rank = $3
             WHERE group_id = $1 AND season = $2 AND user_id = $4`,
            [group_id, season, D, challenger_id],
          );
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const { rows: members } = await query(
      `SELECT
         gm.user_id,
         gm.rank,
         ROUND(gm.rating)::int AS rating,
         gm.role,
         u.lichess_id,
         u.display_name,
         u.lichess_rapid_rating
       FROM group_members gm
       JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = $1 AND gm.season = $2
       ORDER BY gm.rank ASC NULLS LAST, gm.rating DESC`,
      [group_id, season],
    );

    res.json({ members });
  } catch (err) {
    console.error('Record result error:', err);
    res.status(500).json({ error: 'Failed to record result' });
  }
});

export default router;
