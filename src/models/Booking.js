import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'roomId is required'],
    },
    title: {
      type: String,
      required: [true, 'title is required'],
      trim: true,
    },
    organizerEmail: {
      type: String,
      required: [true, 'organizerEmail is required'],
      trim: true,
      lowercase: true,
    },
    startTime: {
      type: Date,
      required: [true, 'startTime is required'],
    },
    endTime: {
      type: Date,
      required: [true, 'endTime is required'],
    },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled'],
      default: 'confirmed',
    },
  },
  { timestamps: true }
);

// Index for fast overlap queries
bookingSchema.index({ roomId: 1, startTime: 1, endTime: 1 });

// Index for listing bookings by organizer
bookingSchema.index({ organizerEmail: 1 });

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;