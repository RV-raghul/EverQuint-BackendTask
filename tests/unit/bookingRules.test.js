import {
  validateBookingDuration,
  isWithinBusinessHours,
  isBookingInPast,
} from '../../src/utils/businessHours.js';

describe('Booking duration rules', () => {

  it('rejects if start is after end', () => {
    const result = validateBookingDuration(
      '2026-06-01T10:00:00.000Z',
      '2026-06-01T09:00:00.000Z'
    );
    expect(result).toBe('startTime must be before endTime');
  });

  it('rejects if duration is less than 15 minutes', () => {
    const result = validateBookingDuration(
      '2026-06-01T09:00:00.000Z',
      '2026-06-01T09:10:00.000Z'
    );
    expect(result).toBe('Booking duration must be at least 15 minutes');
  });

  it('rejects if duration exceeds 4 hours', () => {
    const result = validateBookingDuration(
      '2026-06-01T09:00:00.000Z',
      '2026-06-01T14:00:00.000Z'
    );
    expect(result).toBe('Booking duration must not exceed 4 hours');
  });

  it('accepts a valid 1 hour booking', () => {
    const result = validateBookingDuration(
      '2026-06-01T09:00:00.000Z',
      '2026-06-01T10:00:00.000Z'
    );
    expect(result).toBeNull();
  });

});

describe('Business hours rules', () => {

  it('rejects a Saturday booking', () => {
    // 2026-06-06 is a Saturday
    const result = isWithinBusinessHours(
      '2026-06-06T09:00:00.000Z',
      '2026-06-06T10:00:00.000Z'
    );
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Bookings are only allowed Mon–Fri');
  });

  it('rejects booking starting before 08:00', () => {
    const result = isWithinBusinessHours(
      '2026-06-01T07:00:00.000Z',
      '2026-06-01T08:00:00.000Z'
    );
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Bookings cannot start before 08:00');
  });

  it('rejects booking ending after 20:00', () => {
    const result = isWithinBusinessHours(
      '2026-06-01T19:00:00.000Z',
      '2026-06-01T21:00:00.000Z'
    );
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Bookings cannot end after 20:00');
  });

  it('accepts a valid weekday booking within hours', () => {
    // 2026-06-01 is a Monday
    const result = isWithinBusinessHours(
      '2026-06-01T09:00:00.000Z',
      '2026-06-01T10:00:00.000Z'
    );
    expect(result.valid).toBe(true);
  });

});

describe('Past booking check', () => {

  it('rejects a past date', () => {
    const result = isBookingInPast('2020-01-01T09:00:00.000Z');
    expect(result.valid).toBe(false);
  });

  it('accepts a future date', () => {
    const result = isBookingInPast('2030-01-01T09:00:00.000Z');
    expect(result.valid).toBe(true);
  });

});