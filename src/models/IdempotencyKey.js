import mongoose from 'mongoose';

const idempotencyKeySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
    },
    organizerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
    status: {
      type: String,
      enum: ['processing', 'completed'],
      default: 'processing',
    },
    responseBody: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

// Unique per (key + organizerEmail) combination
// This is what prevents duplicate bookings under concurrent requests
idempotencyKeySchema.index(
  { key: 1, organizerEmail: 1 },
  { unique: true }
);

const IdempotencyKey = mongoose.model('IdempotencyKey', idempotencyKeySchema);

export default IdempotencyKey;
