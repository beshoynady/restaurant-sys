const CashRegister = require("../models/cash-register.model");

// Get all cash registers
const getAllCashRegisters = async (_req, res) => {
  try {
    const cashRegisters = await CashRegister.find().populate(
      "employee",
      "_id fullname username role"
    );
    res.status(200).json(cashRegisters);
  } catch (err) {
    res.status(500).json({ message: err.message, err });
  }
};

// Get a single cash register by ID
const getCashRegisterById = async (req, res) => {
  try {
    const cashRegister = await CashRegister.findById(req.params.id).populate(
      "employee",
      "_id fullname username role"
    );
    if (!cashRegister) {
      return res.status(404).json({ message: "Cash register not found" });
    }
    res.status(200).json(cashRegister);
  } catch (err) {
    res.status(500).json({ message: err.message, err });
  }
};

const getCashRegistersByEmployee = async (req, res) => {
  try {
    const employeeId = await req.params.employeeId;
    const cashRegisters = await CashRegister.find({
      employee: employeeId,
    }).populate("employee", "_id fullname username role");

    if (!cashRegisters.length) {
      return res.status(404).json({ message: "Cash registers not found" });
    }

    res.status(200).json(cashRegisters);
  } catch (err) {
    res.status(500).json({ message: err.message, error: err });
  }
};

// Create a cash register
const createCashRegister = async (req, res) => {
  const { name, employee } = await req.body;
  const cashRegister = new CashRegister({
    name,
    employee,
  });

  try {
    const newCashRegister = await cashRegister.save();
    res.status(201).json(newCashRegister);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Update a cash register
const updateCashRegister = async (req, res) => {
  try {
    const id = req.params.id;
    const cashRegister = await CashRegister.findById(id);

    if (!cashRegister) {
      return res.status(404).json({ message: "Cash register not found" });
    }

    const updateFields = {}; // Updated values will be stored here

    // Check the sent values and update them if they are sent in req.body
    if (req.body.name) {
      updateFields.name = await req.body.name;
    }
    if (req.body.employee) {
      updateFields.employee = await req.body.employee;
    }
    if (req.body.hasOwnProperty("balance")) {
      updateFields.balance = req.body.balance;
    }

    // Update the values in the cash register using only the updated fields
    const updatedCashRegister = await CashRegister.findByIdAndUpdate(
      id,
      updateFields,
      { new: true } // Return the modified document rather than the original
    );

    // Respond with the updated cash register
    res.status(200).json(updatedCashRegister);
  } catch (err) {
    // Handle errors during the update process
    res.status(400).json({ message: err.message });
  }
};

// Delete a cash register
const deleteCashRegister = async (req, res) => {
  try {
    const cashRegister = await CashRegister.findByIdAndDelete(req.params.id);
    if (!cashRegister) {
      return res.status(404).json({ message: "Cash register not found" });
    }
    await cashRegister.remove();
    res.status(200).json({ message: "Cash register deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getAllCashRegisters,
  getCashRegisterById,
  getCashRegistersByEmployee,
  createCashRegister,
  updateCashRegister,
  deleteCashRegister,
};
