import bookingService from '../services/booking.service.js';

const createBooking = async (req, res, next) => {
  try {
    // Read idempotency key from header if present
    const idempotencyKey = req.headers['idempotency-key'] || null;
    const booking = await bookingService.createBooking(req.body, idempotencyKey);
    res.status(201).json(booking);
  } catch (err) {
    next(err);
  }
};

const listBookings = async (req, res, next) => {
  try {
    const result = await bookingService.listBookings(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
};


const cancelBooking = async (req, res, next) => {
  try {
    const booking = await bookingService.cancelBooking(req.params.id);
    res.json(booking);
  } catch (err) {
    next(err);
  }
};

export default { createBooking, listBookings, cancelBooking };