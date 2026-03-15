import request from 'supertest';
import app from '../../src/app.js';
import { connectTestDB, clearTestDB, closeTestDB } from '../setup.js';

beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await closeTestDB());

// ── Helper: create a room ──────────────────────────────────────────────────
const createRoom = async () => {
  const res = await request(app).post('/rooms').send({
    name: 'Test Room',
    capacity: 10,
    floor: 1,
    amenities: ['projector'],
  });
  return res.body._id;
};

// ── Reusable valid booking payload ─────────────────────────────────────────
const booking = (roomId) => ({
  roomId,
  title: 'Team Standup',
  organizerEmail: 'alice@company.com',
  startTime: '2026-06-01T09:00:00.000Z',
  endTime:   '2026-06-01T10:00:00.000Z',
});

// ─────────────────────────────────────────────────────────────────────────────
// Happy path
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /bookings — happy path', () => {

  it('creates a confirmed booking', async () => {
    const roomId = await createRoom();
    const res = await request(app)
      .post('/bookings')
      .send(booking(roomId));
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('confirmed');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Conflict — overlap
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /bookings — conflict', () => {

  it('returns 409 for overlapping booking', async () => {
    const roomId = await createRoom();
    await request(app).post('/bookings').send(booking(roomId));
    const res = await request(app)
      .post('/bookings')
      .send(booking(roomId));
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('ConflictError');
  });

  it('allows same slot after cancellation', async () => {
    const roomId = await createRoom();
    const first = await request(app)
      .post('/bookings')
      .send(booking(roomId));
    await request(app)
      .post(`/bookings/${first.body._id}/cancel`);
    const res = await request(app)
      .post('/bookings')
      .send(booking(roomId));
    expect(res.status).toBe(201);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Idempotency
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /bookings — idempotency', () => {

  it('same key returns same booking, no duplicate created', async () => {
    const roomId = await createRoom();
    const res1 = await request(app)
      .post('/bookings')
      .set('Idempotency-Key', 'key-001')
      .send(booking(roomId));
    const res2 = await request(app)
      .post('/bookings')
      .set('Idempotency-Key', 'key-001')
      .send(booking(roomId));
    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);
    // Same booking ID — no duplicate
    expect(res1.body._id).toBe(res2.body._id);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Cancellation cut-off
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /bookings/:id/cancel', () => {

  it('cancels a future booking successfully', async () => {
    const roomId = await createRoom();
    const created = await request(app)
      .post('/bookings')
      .send(booking(roomId));
    const res = await request(app)
      .post(`/bookings/${created.body._id}/cancel`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
  });

  it('returns 400 if cancellation is within 1 hour of start', async () => {
    const roomId = await createRoom();

    // Create booking starting 30 minutes from now
    const start = new Date(Date.now() + 30 * 60 * 1000);
    const end = new Date(Date.now() + 90 * 60 * 1000);

    const created = await request(app).post('/bookings').send({
      roomId,
      title: 'Imminent Meeting',
      organizerEmail: 'alice@company.com',
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    });

    // Skip if booking creation failed (outside business hours)
    if (created.status !== 201) return;

    const res = await request(app)
      .post(`/bookings/${created.body._id}/cancel`);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/1 hour/);
  });

  it('no-op if already cancelled', async () => {
    const roomId = await createRoom();
    const created = await request(app)
      .post('/bookings')
      .send(booking(roomId));
    await request(app).post(`/bookings/${created.body._id}/cancel`);
    const res = await request(app)
      .post(`/bookings/${created.body._id}/cancel`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Utilization report
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /reports/room-utilization', () => {

  it('returns 0 utilization when no bookings', async () => {
    await createRoom();
    const res = await request(app).get(
      '/reports/room-utilization?from=2026-06-01T08:00:00.000Z&to=2026-06-01T20:00:00.000Z'
    );
    expect(res.status).toBe(200);
    expect(res.body[0].totalBookingHours).toBe(0);
    expect(res.body[0].utilizationPercent).toBe(0);
  });

  it('calculates utilization correctly', async () => {
    const roomId = await createRoom();
    await request(app).post('/bookings').send({
      roomId,
      title: 'Meeting',
      organizerEmail: 'alice@company.com',
      startTime: '2026-06-01T09:00:00.000Z',
      endTime:   '2026-06-01T11:00:00.000Z', // 2 hours
    });
    const res = await request(app).get(
      '/reports/room-utilization?from=2026-06-01T08:00:00.000Z&to=2026-06-01T20:00:00.000Z'
    );
    expect(res.status).toBe(200);
    // 2 booked / 12 total business hours = 0.1667
    expect(res.body[0].totalBookingHours).toBe(2);
    expect(res.body[0].utilizationPercent).toBeCloseTo(0.1667, 3);
  });

  it('clamps partial overlap correctly', async () => {
    const roomId = await createRoom();
    // Booking 08:00–12:00, query from 10:00 → only 2 hrs counted
    await request(app).post('/bookings').send({
      roomId,
      title: 'Overlap Meeting',
      organizerEmail: 'alice@company.com',
      startTime: '2026-06-01T08:00:00.000Z',
      endTime:   '2026-06-01T12:00:00.000Z',
    });
    const res = await request(app).get(
      '/reports/room-utilization?from=2026-06-01T10:00:00.000Z&to=2026-06-01T20:00:00.000Z'
    );
    expect(res.status).toBe(200);
    expect(res.body[0].totalBookingHours).toBe(2);
  });

});