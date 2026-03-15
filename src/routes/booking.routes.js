import { Router } from 'express';
import { body } from 'express-validator';
import validate from '../middlewares/validate.js';
import bookingController from '../controllers/booking.controller.js';

const router = Router();

router.post(
  '/',
  [
    body('roomId')
      .notEmpty()
      .withMessage('roomId is required'),
    body('title')
      .isString()
      .notEmpty()
      .withMessage('title is required'),
    body('organizerEmail')
      .isEmail()
      .withMessage('a valid organizerEmail is required'),
    body('startTime')
      .isISO8601()
      .withMessage('startTime must be a valid ISO-8601 date'),
    body('endTime')
      .isISO8601()
      .withMessage('endTime must be a valid ISO-8601 date'),
  ],
  validate,
  bookingController.createBooking
);

router.get('/', bookingController.listBookings);
router.post('/:id/cancel', bookingController.cancelBooking);
export default router;