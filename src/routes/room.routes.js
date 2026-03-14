import { Router } from 'express';
import { body } from 'express-validator';
import validate from '../middlewares/validate.js';
import roomController from '../controllers/room.controller.js';

const router = Router();

router.post(
  '/',
  [
    body('name')
      .isString()
      .notEmpty()
      .withMessage('name is required'),
    body('capacity')
      .isInt({ min: 1 })
      .withMessage('capacity must be a positive integer'),
    body('floor')
      .isInt()
      .withMessage('floor must be an integer'),
    body('amenities')
      .isArray()
      .withMessage('amenities must be an array'),
  ],
  validate,
  roomController.createRoom
);

router.get('/', roomController.listRooms);

export default router;