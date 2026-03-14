import express from 'express';
import errorHandler from './middlewares/errorHandler.js';
import roomRoutes from './routes/room.routes.js';

const app = express();
app.use(express.json());

// health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// routes
app.use('/rooms', roomRoutes);

// error handler — always last
app.use(errorHandler);

export default app;