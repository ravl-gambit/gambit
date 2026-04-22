import { Router } from 'express';
import crypto from 'crypto';
import { query } from '../db.js';

const router = Router();

// POST /groups — create a new group and add the creator as admin member
router.post('/', async (req, res) => {
  const { name, user_id } = req.body;

  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  if (!user_id)       return res.status(400).json({ error: 'user_id is required' });

  const invite_code = crypto.randomBytes(5).toString('hex'); // 10-char hex

  try {
    const { rows: groupRows } = await query(
      `INSERT INTO groups (name, invite_code, created_by)
       VALUES ($1, $2, $3)
       RETURNING id, name, invite_code, season, created_at`,
      [name.trim(), invite_code, user_id],
    );
    res.status(201).json({ group: groupRows[0] });
  } catch (err) {
    console.error('Create group error:', err);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// GET /groups/:id — group info + ranked member list
router.get('/:id', async (req, res) => {
  try {
    const { rows: groupRows } = await query(
      `SELECT id, name, invite_code, season, created_at
       FROM groups WHERE id = $1`,
      [req.params.id],
    );

    if (!groupRows.length) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const group = groupRows[0];

    const { rows: members } = await query(
      `SELECT
         gm.rank,
         ROUND(gm.rating)::int  AS rating,
         gm.role,
         u.lichess_id,
         u.display_name
       FROM group_members gm
       JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = $1 AND gm.season = $2
       ORDER BY gm.rank ASC NULLS LAST, gm.rating DESC`,
      [group.id, group.season],
    );

    res.json({ group, members });
  } catch (err) {
    console.error('Get group error:', err);
    res.status(500).json({ error: 'Failed to fetch group' });
  }
});

export default router;
