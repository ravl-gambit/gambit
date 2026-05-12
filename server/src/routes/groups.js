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

// GET /groups/invite/:invite_code — group preview before joining
router.get('/invite/:invite_code', async (req, res) => {
  try {
    const { rows: groupRows } = await query(
      `SELECT id, name, invite_code, season FROM groups WHERE invite_code = $1`,
      [req.params.invite_code],
    );
    if (!groupRows.length) return res.status(404).json({ error: 'Group not found' });
    const group = groupRows[0];

    const { rows: countRows } = await query(
      `SELECT COUNT(*) AS member_count FROM group_members WHERE group_id = $1 AND season = $2`,
      [group.id, group.season],
    );
    res.json({ group, member_count: parseInt(countRows[0].member_count, 10) });
  } catch (err) {
    console.error('Get group by invite error:', err);
    res.status(500).json({ error: 'Failed to fetch group' });
  }
});

// POST /groups/:invite_code/join — add authenticated user as a member
router.post('/:invite_code/join', async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id is required' });

  try {
    const { rows: groupRows } = await query(
      `SELECT id, name, invite_code, season FROM groups WHERE invite_code = $1`,
      [req.params.invite_code],
    );
    if (!groupRows.length) return res.status(404).json({ error: 'Group not found' });
    const group = groupRows[0];

    const { rows: countRows } = await query(
      `SELECT COUNT(*) AS cnt FROM group_members WHERE group_id = $1 AND season = $2`,
      [group.id, group.season],
    );
    const newRank = parseInt(countRows[0].cnt, 10) + 1;

    await query(
      `INSERT INTO group_members (group_id, user_id, role, rating, rating_deviation, rank, season)
       VALUES ($1, $2, 'member', 1500, 350, $3, $4)`,
      [group.id, user_id, newRank, group.season],
    );
    res.status(201).json({ group });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Already a member' });
    console.error('Join group error:', err);
    res.status(500).json({ error: 'Failed to join group' });
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
         gm.user_id,
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
