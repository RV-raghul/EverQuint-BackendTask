import roomService from '../services/room.service.js';

const createRoom = async (req, res, next) => {
  try {
    const room = await roomService.createRoom(req.body);
    res.status(201).json(room);
  } catch (err) {
    next(err);
  }
};

const listRooms = async (req, res, next) => {
  try {
    const rooms = await roomService.listRooms(req.query);
    res.json(rooms);
  } catch (err) {
    next(err);
  }
};

export default { createRoom, listRooms };