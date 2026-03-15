import Room from '../models/Room.js';
import Booking from '../models/Booking.js';
import { getTotalBusinessHours } from '../utils/businessHours.js';

const getRoomUtilization = async (from, to) => {

  // ── Step 1: Validate from and to ───────────────────────────────────────
  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (isNaN(fromDate.getTime())) {
    const err = new Error('"from" must be a valid ISO-8601 date');
    err.statusCode = 400;
    err.errorType = 'ValidationError';
    throw err;
  }

  if (isNaN(toDate.getTime())) {
    const err = new Error('"to" must be a valid ISO-8601 date');
    err.statusCode = 400;
    err.errorType = 'ValidationError';
    throw err;
  }

  if (fromDate >= toDate) {
    const err = new Error('"from" must be before "to"');
    err.statusCode = 400;
    err.errorType = 'ValidationError';
    throw err;
  }

  // ── Step 2: Get all rooms ──────────────────────────────────────────────
  const rooms = await Room.find();

  // ── Step 3: Calculate total business hours in range ───────────────────
  // This is the DENOMINATOR in our utilization formula
  // e.g. Mon–Fri 08:00–20:00 = 12 hrs/day
  // For a full week (5 days) = 60 total business hours
  const totalBusinessHours = getTotalBusinessHours(from, to);

  // ── Step 4: For each room calculate utilization ────────────────────────
  const results = await Promise.all(
    rooms.map(async (room) => {

      // Get only CONFIRMED bookings that overlap with [from, to]
      // This handles partial overlaps too:
      // - booking starts before "from" but ends inside range
      // - booking starts inside range but ends after "to"
      const bookings = await Booking.find({
        roomId: room._id,
        status: 'confirmed',
        startTime: { $lt: toDate },   // booking starts before range ends
        endTime: { $gt: fromDate },   // booking ends after range starts
      });

      // ── Step 5: Clamp each booking to [from, to] and sum hours ────────
      // Why clamp? A booking might start before "from" or end after "to"
      // We only count the hours that fall WITHIN the requested range
      const totalBookingHours = bookings.reduce((sum, booking) => {
        // Clamp start — if booking started before "from", use "from"
        const clampedStart = booking.startTime < fromDate
          ? fromDate
          : booking.startTime;

        // Clamp end — if booking ends after "to", use "to"
        const clampedEnd = booking.endTime > toDate
          ? toDate
          : booking.endTime;

        // Convert milliseconds to hours and add to sum
        const hours = (clampedEnd - clampedStart) / (1000 * 60 * 60);
        return sum + hours;
      }, 0);

      // ── Step 6: Calculate utilization percentage ───────────────────────
      // Formula: totalBookingHours / totalBusinessHours
      // e.g. 6 booked hours / 60 total business hours = 0.10 (10%)
      const utilizationPercent = totalBusinessHours > 0
        ? parseFloat((totalBookingHours / totalBusinessHours).toFixed(4))
        : 0;

      return {
        roomId:            room._id,
        roomName:          room.name,
        totalBookingHours: parseFloat(totalBookingHours.toFixed(2)),
        utilizationPercent,
      };
    })
  );

  return results;
};

export default { getRoomUtilization };