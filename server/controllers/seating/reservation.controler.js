const ReservationModel = require("../models/reservation-table.model");

// Create a new reservation
const createReservation = async (req, res) => {
  const {
    tableId,
    tableNumber,
    userId,
    customerName,
    customerPhone,
    numberOfGuests,
    reservationDate,
    startTime,
    endTime,
    reservationNote,
    createdBy,
  } = req.body;

  try {
    // Validate input data
    if (
      !tableId ||
      !tableNumber ||
      (!userId && !createdBy) ||
      !numberOfGuests ||
      !customerName ||
      !customerPhone ||
      !reservationDate ||
      !startTime ||
      !endTime
    ) {
      throw new Error("All fields are required");
    }

    // Create the reservation
    const reservation = await ReservationModel.create({
      tableId,
      tableNumber,
      userId,
      customerName,
      customerPhone,
      numberOfGuests,
      reservationDate,
      startTime,
      endTime,
      reservationNote,
      createdBy,
    });
    return res.status(201).json(reservation);
  } catch (error) {
    return res
      .status(400)
      .json({ message: "Failed to create reservation", error: error.message });
  }
};

// Get all reservations
const getAllReservations = async (_req, res) => {
  try {
    const reservations = await ReservationModel.find()
      .populate("tableId", "_id tableNumber sectionNumber")
      .populate("userId");
    return res.status(200).json(reservations);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to fetch reservations", error: error.message });
  }
};

// Get a single reservation by ID
const getReservationById = async (req, res) => {
  const reservationId = req.params.id;

  try {
    if (!reservationId) {
      return res.status(400).json({ message: "Reservation ID is required" });
    }

    const reservation = await ReservationModel.findById(reservationId)
      .populate("tableId", "_id tableNumber sectionNumber")
      .populate("userId");
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }
    return res.status(200).json(reservation);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to fetch reservation", error: error.message });
  }
};

// Update a reservation by ID
const updateReservation = async (req, res) => {
  const reservationId = req.params.id;
  const newData = req.body;

  try {
    if (!reservationId) {
      return res.status(400).json({ message: "Reservation ID is required" });
    }

    const updatedReservation = await ReservationModel.findByIdAndUpdate(
      reservationId,
      newData,
      { new: true }
    );
    if (!updatedReservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }
    return res.status(200).json(updatedReservation);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to update reservation", error: error.message });
  }
};

// Delete a reservation by ID
const deleteReservation = async (req, res) => {
  const reservationId = req.params.id;

  try {
    if (!reservationId) {
      return res.status(400).json({ message: "Reservation ID is required" });
    }

    const deletedReservation = await ReservationModel.findByIdAndDelete(
      reservationId
    );
    if (!deletedReservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }
    return res
      .status(200)
      .json({ message: "Reservation deleted successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to delete reservation", error: error.message });
  }
};

module.exports = {
  createReservation,
  getAllReservations,
  getReservationById,
  updateReservation,
  deleteReservation,
};
