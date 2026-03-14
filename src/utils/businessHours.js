import { DateTime } from 'luxon';

const BUSINESS_START = 8;         // 08:00
const BUSINESS_END = 20;          // 20:00
const BUSINESS_DAYS = [1, 2, 3, 4, 5]; // Mon–Fri (luxon: 1=Mon, 7=Sun)

// ── Checking if booking falls within business hours ───────────────────────────
const isWithinBusinessHours = (startISO, endISO, timezone = 'UTC') => {
  const start = DateTime.fromISO(startISO, { zone: timezone });
  const end = DateTime.fromISO(endISO, { zone: timezone });

  // Must be a weekday
  if (!BUSINESS_DAYS.includes(start.weekday)) {
    return { valid: false, message: 'Bookings are only allowed Mon–Fri' };
  }

  // Start hour must be >= 08:00
  if (start.hour < BUSINESS_START) {
    return {
      valid: false,
      message: 'Bookings cannot start before 08:00',
    };
  }

  // End must be <= 20:00
  if (end.hour > BUSINESS_END || (end.hour === BUSINESS_END && end.minute > 0)) {
    return {
      valid: false,
      message: 'Bookings cannot end after 20:00',
    };
  }

  // Booking must not span across midnight (same day)
  if (start.toISODate() !== end.toISODate()) {
    return {
      valid: false,
      message: 'Booking must start and end on the same day',
    };
  }

  return { valid: true };
};

// ── Validate booking duration ──────────────────────────────────────────────
const validateBookingDuration = (startISO, endISO) => {
  const start = DateTime.fromISO(startISO);
  const end = DateTime.fromISO(endISO);
  const diffMinutes = end.diff(start, 'minutes').minutes;

  if (diffMinutes <= 0) {
    return 'startTime must be before endTime';
  }
  if (diffMinutes < 15) {
    return 'Booking duration must be at least 15 minutes';
  }
  if (diffMinutes > 240) {
    return 'Booking duration must not exceed 4 hours';
  }

  return null; // null means no error
};

// ── Calculate total business hours between two dates ───────────────────────

const getTotalBusinessHours = (fromISO, toISO, timezone = 'UTC') => {
  let current = DateTime.fromISO(fromISO, { zone: timezone }).startOf('day');
  const to = DateTime.fromISO(toISO, { zone: timezone });
  let totalHours = 0;

  while (current < to) {
    if (BUSINESS_DAYS.includes(current.weekday)) {
      const dayStart = current.set({ hour: BUSINESS_START, minute: 0, second: 0 });
      const dayEnd = current.set({ hour: BUSINESS_END, minute: 0, second: 0 });

      // Clamp to [from, to] range
      const slotStart = dayStart < DateTime.fromISO(fromISO, { zone: timezone })
        ? DateTime.fromISO(fromISO, { zone: timezone })
        : dayStart;
      const slotEnd = dayEnd > to ? to : dayEnd;

      if (slotEnd > slotStart) {
        totalHours += slotEnd.diff(slotStart, 'hours').hours;
      }
    }
    current = current.plus({ days: 1 });
  }

  return totalHours;
};

export {
  isWithinBusinessHours,
  validateBookingDuration,
  getTotalBusinessHours,
  BUSINESS_START,
  BUSINESS_END,
  BUSINESS_DAYS,
};