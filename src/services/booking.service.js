import Booking from '../models/Booking.js';
import Room from '../models/Room.js';
import IdempotencyKey from '../models/IdempotencyKey.js';
import {
  isWithinBusinessHours,
  validateBookingDuration,
} from '../utils/businessHours.js';

// ── Check if a room has any overlapping confirmed bookings ─────────────────
const hasOverlap = async (roomId, startTime, endTime, excludeBookingId = null) => {
  const query = {
    roomId,
    status: 'confirmed',
    startTime: { $lt: new Date(endTime) },
    endTime: { $gt: new Date(startTime) },
  };

  // Used later in cancellation — exclude current booking from overlap check
  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  return Booking.exists(query);
};

// ── Create Booking ─────────────────────────────────────────────────────────
const createBooking = async (data, idempotencyKey) => {
  const { roomId, title, organizerEmail, startTime, endTime } = data;

  // ── Step 1: Check idempotency key first ───────────────────────────────
  if (idempotencyKey) {
    const existing = await IdempotencyKey.findOne({
      key: idempotencyKey,
      organizerEmail,
    });

    // Already completed — return stored response (no duplicate created)
    if (existing?.status === 'completed') {
      return existing.responseBody;
    }

    // Still processing — concurrent request detected
    if (existing?.status === 'processing') {
      const err = new Error('A request with this idempotency key is already being processed');
      err.statusCode = 409;
      err.errorType = 'ConflictError';
      throw err;
    }

    // First time seeing this key — insert as "processing"
    // If two concurrent requests reach here at same time,
    // the unique index on (key + organizerEmail) ensures only one succeeds
    try {
      await IdempotencyKey.create({
        key: idempotencyKey,
        organizerEmail,
        status: 'processing',
      });
    } catch (err) {
      if (err.code === 11000) {
        // Duplicate key error — another concurrent request got here first
        const conflict = new Error('A request with this idempotency key is already being processed');
        conflict.statusCode = 409;
        conflict.errorType = 'ConflictError';
        throw conflict;
      }
      throw err;
    }
  }

  // ── Step 2: Room exists? ───────────────────────────────────────────────
  const room = await Room.findById(roomId);
  if (!room) {
    const err = new Error(`Room with id "${roomId}" not found`);
    err.statusCode = 404;
    err.errorType = 'NotFoundError';
    throw err;
  }

  // ── Step 3: Validate duration ──────────────────────────────────────────
  const durationError = validateBookingDuration(startTime, endTime);
  if (durationError) {
    const err = new Error(durationError);
    err.statusCode = 400;
    err.errorType = 'ValidationError';
    throw err;
  }

  // ── Step 4: Validate business hours ───────────────────────────────────
  const businessHoursCheck = isWithinBusinessHours(startTime, endTime);
  if (!businessHoursCheck.valid) {
    const err = new Error(businessHoursCheck.message);
    err.statusCode = 400;
    err.errorType = 'ValidationError';
    throw err;
  }

  // ── Step 5: Check for overlapping bookings ─────────────────────────────
  const overlap = await hasOverlap(roomId, startTime, endTime);
  if (overlap) {
    const err = new Error('Room is already booked for this time slot');
    err.statusCode = 409;
    err.errorType = 'ConflictError';
    throw err;
  }

  // ── Step 6: Create the booking ─────────────────────────────────────────
  const booking = await Booking.create({
    roomId,
    title,
    organizerEmail,
    startTime,
    endTime,
    status: 'confirmed',
  });

  // ── Step 7: Mark idempotency key as completed ──────────────────────────
  if (idempotencyKey) {
    await IdempotencyKey.findOneAndUpdate(
      { key: idempotencyKey, organizerEmail },
      {
        status: 'completed',
        bookingId: booking._id,
        responseBody: booking.toObject(),
      }
    );
  }

  return booking;
};

// ── List Bookings ──────────────────────────────────────────────────────────
const listBookings = async ({ roomId, from, to, limit = 20, offset = 0 }) => {
  const filter = {};

  if (roomId) {
    filter.roomId = roomId;
  }

  if (from || to) {
    filter.startTime = {};
    if (from) filter.startTime.$gte = new Date(from);
    if (to) filter.startTime.$lte = new Date(to);
  }

  const [items, total] = await Promise.all([
    Booking.find(filter)
      .populate('roomId', 'name floor capacity')
      .skip(Number(offset))
      .limit(Number(limit))
      .sort({ startTime: 1 }),
    Booking.countDocuments(filter),
  ]);

  return {
    items,
    total,
    limit: Number(limit),
    offset: Number(offset),
  };
};

export default { createBooking, listBookings, hasOverlap };