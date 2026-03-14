import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Room name is required'],
            trim: true,
        },
        capacity: {
            type: Number,
            required: [true, 'Room capacity is required'],
            min: [1, 'Room capacity must be at least 1'],   
        },
        floor: {
            type: Number,
            required: [true, 'Floor number is required'],
    },
    amenities: {
        type: [String],
        default: [],
    },
    },
    {        timestamps: true,
    }
);

roomSchema.index(
    { name: 1 }, 
    { unique: true, collation: { locale: 'en', strength: 2 } }
);

const Room = mongoose.model('Room', roomSchema);

export default Room;