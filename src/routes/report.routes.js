import { Router } from 'express';
import reportController from '../controllers/report.controller.js';

const router = Router();

router.get('/room-utilization', reportController.getRoomUtilization);

export default router;