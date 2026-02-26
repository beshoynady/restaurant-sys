const ShiftModel = require('../models/shift.model');

const createShift = async (req, res) => {
    try {
        const { startTime, endTime, shiftType } = req.body;

        if (!startTime || !endTime || !shiftType) {
            return res.status(400).json({ error: 'All fields are required: startTime, endTime, shiftType' });
        }

        const start = new Date(`1970-01-01T${startTime}Z`);
        const end = new Date(`1970-01-01T${endTime}Z`);
        const duration = (end - start) / (1000 * 60 * 60);
        const hours = duration >= 0 ? duration : 24 + duration;

        const shift = await ShiftModel.create({ startTime, endTime, shiftType, hours });
        return res.status(201).json(shift);
    } catch (error) {
        console.error('Error creating shift:', error);
        return res.status(500).json({ error: 'Failed to create shift' });
    }
};

const updateShift = async (req, res) => {
    try {
        const { id } = req.params;
        const { startTime, endTime, shiftType } = req.body;

        if (!startTime || !endTime || !shiftType) {
            return res.status(400).json({ error: 'All fields are required: startTime, endTime, shiftType' });
        }
        
        const start = new Date(`1970-01-01T${startTime}Z`);
        const end = new Date(`1970-01-01T${endTime}Z`);
        const duration = (end - start) / (1000 * 60 * 60);
        const hours = duration >= 0 ? duration : 24 + duration;

        const updatedShift = await ShiftModel.findByIdAndUpdate(id, { startTime, endTime, shiftType, hours }, { new: true });
        if (!updatedShift) {
            return res.status(404).json({ error: 'Shift not found' });
        }
        return res.status(200).json(updatedShift);
    } catch (error) {
        console.error('Error updating shift:', error);
        return res.status(500).json({ error: 'Failed to update shift' });
    }
};

const getAllShifts = async (req, res) => {
    try {
        const shifts = await ShiftModel.find();
        return res.status(200).json(shifts);
    } catch (error) {
        console.error('Error getting all shifts:', error);
        return res.status(500).json({ error: 'Failed to fetch shifts' });
    }
};

const getShiftById = async (req, res) => {
    try {
        const { id } = req.params;
        const shift = await ShiftModel.findById(id);
        if (!shift) {
            return res.status(404).json({ error: 'Shift not found' });
        }
        return res.status(200).json(shift);
    } catch (error) {
        console.error('Error getting shift by ID:', error);
        return res.status(500).json({ error: 'Failed to fetch shift' });
    }
};



const deleteShift = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedShift = await ShiftModel.findByIdAndDelete(id);
        if (!deletedShift) {
            return res.status(404).json({ error: 'Shift not found' });
        }
        return res.status(200).json({ message: 'Shift deleted successfully' });
    } catch (error) {
        console.error('Error deleting shift:', error);
        return res.status(500).json({ error: 'Failed to delete shift' });
    }
};

module.exports = {
    createShift,
    getAllShifts,
    getShiftById,
    updateShift,
    deleteShift
};
