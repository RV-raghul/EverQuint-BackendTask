import Room from '../models/Room.js';

const createRoom = async (data) => {
  // Check duplicate name (case-insensitive)
  const existing = await Room.findOne(
    { name: data.name },
    null,
    { collation: { locale: 'en', strength: 2 } }
  );

  if (existing) {
    const err = new Error(`Room with name "${data.name}" already exists`);
    err.status = 400;
    err.errorType = 'ConflictError';
    throw err;
  }

  const room = await Room.create(data);
    return room;
};

const listRooms = async ({ minCapacity, amenity }) => {
    const filter = {};

    if (minCapacity) {
        filter.capacity = { $gte: Number(minCapacity) };
    }

    if (amenity) {
        filter.amenities = amenity;
    }

    return Room.find(filter);
};

export default {
    createRoom,
    listRooms,
};