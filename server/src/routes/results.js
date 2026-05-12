import { Router } from 'express';
import { query } from '../db.js';
import pool from '../db.js';

const router = Router();

// POST /results — record a game result and update ranks if challenger wins
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
      `SELECT user_id, rank FROM group_members
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

    // Rank update — only when challenger wins and was ranked below defender
    if (winner === 'challenger') {
      const C = challengerMember.rank;
      const D = defenderMember.rank;

      // Only swap if defender is actually ranked above (lower rank number)
      if (D < C) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
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
          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      }
    }

    const { rows: members } = await query(
      `SELECT
         gm.user_id,
         gm.rank,
         ROUND(gm.rating)::int AS rating,
         gm.role,
         u.lichess_id,
         u.display_name
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
