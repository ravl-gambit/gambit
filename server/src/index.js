import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import groupsRouter from './routes/groups.js';
import challengesRouter from './routes/challenges.js';
import resultsRouter from './routes/results.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.use('/health', healthRouter);
app.use('/auth', authRouter);
app.use('/groups', groupsRouter);
app.use('/challenges', challengesRouter);
app.use('/results', resultsRouter);

app.listen(PORT, () => {
  console.log(`Gambit server running on port ${PORT}`);
});
