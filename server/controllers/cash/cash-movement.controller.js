import CashMovement from "../../models/cash-movement.model.js";
import CashRegister from "../../models/cash-register.model.js";

// Controller function to create a cash movement
export s.createCashMovement = async (req, res) => {
  try {
    const {
      brand,
      branch,
      cashRegister,
      amount,
      type,
      description,
      transferTo,
      transferFrom,
      movementId,
      status,
    } = req.body;
    const createdBy = req.user.id;

    // Find the cash register
    const register = await CashRegister.findById(cashRegister);
    if (!register) {
      return res.status(404).json({ message: "Cash register not found" });
    }

    // Determine if it's incoming or outgoing
    const incomingTypes = ["Deposit", "Revenue", "Refund"];
    const outgoingTypes = ["Withdraw", "Expense", "Payment"];

    let balanceChange = 0;
    if (incomingTypes.includes(type)) {
      balanceChange = amount;
    } else if (outgoingTypes.includes(type)) {
      balanceChange = -amount;
      if (register.balance + balanceChange < 0) {
        return res.status(400).json({ message: "Insufficient balance in cash register" });
      }
    } else if (type === "Transfer") {
      // Handle transfer separately if needed, but for now, assume it's handled in transfer function
      balanceChange = 0; // Transfers are handled in transferCashBetweenRegisters
    } else {
      // For Adjustment, assume it's a correction, could be + or -, but for now, treat as is
      balanceChange = amount; // Assuming positive for now
    }

    // Update register balance
    register.balance += balanceChange;
    await register.save();

    // Create a new cash movement
    const newCashMovement = await CashMovement.create({
      brand,
      branch,
      cashRegister,
      createdBy,
      amount,
      type,
      description,
      transferTo,
      transferFrom,
      movementId,
      status,
    });

    // Save the new cash movement to the database
    await newCashMovement.save();

    // Respond with success message and the created cash movement
    res.status(201).json({
      message: "Cash movement created successfully",
      cashMovement: newCashMovement,
    });
  } catch (error) {
    // Handle errors during the creation process
    res.status(500).json({ error: "Failed to create cash movement", error });
  }
};

// Controller function to get all cash movements
export s.getAllCashMovements = async (req, res) => {
  try {
    const cashMovements = await CashMovement.find()
      .populate("registerId")
      .populate("createdBy")
      .populate("transferTo")
      .populate("transferFrom")
      .populate("movementId");
    res.status(200).json(cashMovements);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve cash movements", error });
  }
};

// Controller function to get a cash movement by ID
export s.getCashMovementById = async (req, res) => {
  try {
    const cashMovement = await CashMovement.findById(req.params.id)
      .populate("registerId")
      .populate("createdBy")
      .populate("transferTo")
      .populate("transferFrom")
      .populate("movementId");
    if (!cashMovement) {
      return res.status(404).json({ message: "Cash movement not found" });
    }
    res.status(200).json(cashMovement);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve cash movement", error });
  }
};

// Controller function to update a cash movement by ID
export s.updateCashMovement = async (req, res) => {
  try {
    const {
      registerId,
      createdBy,
      amount,
      status,
      type,
      description,
      transferFrom,
    } = req.body;

    const cashMovement = await CashMovement.findById(req.params.id);
    if (!cashMovement) {
      return res.status(404).json({ message: "Cash movement not found" });
    }
    const updatedCashMovement = await CashMovement.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          registerId,
          createdBy,
          amount,
          type,
          description,
          transferFrom,
          status,
        },
      },
      { new: true } // Return the modified document rather than the original
    );

    if (!updatedCashMovement) {
      return res.status(404).json({ message: "Cash movement not found" });
    }

    res.status(200).json({
      message: "Cash movement updated successfully",
      cashMovement: updatedCashMovement,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to update cash movement", error });
  }
};

// Controller function to delete a cash movement by ID
export s.deleteCashMovement = async (req, res) => {
  try {
    const cashMovement = await CashMovement.findByIdAndDelete(req.params.id);
    if (!cashMovement) {
      return res.status(404).json({ message: "Cash movement not found" });
    }
    res.status(200).json({ message: "Cash movement deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete cash movement", error });
  }
};

export s.transferCashBetweenRegisters = async (req, res) => {
  try {
    const { fromRegisterId, toRegisterId, amount, description } = req.body;

    // Check if both registers exist and handle errors if not found
    // Your logic here to validate register IDs

    // Create cash movements for both registers (one for outgoing, one for incoming)
    const outgoingMovement = new CashMovement({
      registerId: fromRegisterId,
      createdBy: req.user._id, // Assuming user information is included in the request after authentication
      amount: -amount, // Negative amount for outgoing movement
      type: "Transfer",
      description: description || "Transfer to another register",
    });

    const incomingMovement = new CashMovement({
      registerId: toRegisterId,
      createdBy: req.user._id,
      amount,
      type: "income",
      description: description || "Transfer from another register",
    });

    // Save both cash movements
    await outgoingMovement.save();
    await incomingMovement.save();

    res
      .status(200)
      .json({ message: "Cash transferred between registers successfully" });
  } catch (error) {
    res.status(500).json({ error: "Dine-in server error", error });
  }
};

// Function to record a payment (outgoing transaction)
export s.recordPayment = async (req, res) => {
  try {
    const { brand, branch, cashRegister, amount, description } = req.body;
    const createdBy = req.user.id;

    // Find the cash register
    const register = await CashRegister.findById(cashRegister);
    if (!register) {
      return res.status(404).json({ message: "Cash register not found" });
    }

    // Check if sufficient balance
    if (register.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance in cash register" });
    }

    // Update register balance (subtract)
    register.balance -= amount;
    await register.save();

    // Create cash movement
    const paymentMovement = await CashMovement.create({
      brand,
      branch,
      cashRegister,
      createdBy,
      amount,
      type: "Payment",
      description: description || "Payment recorded",
      status: "Completed",
    });

    await paymentMovement.save();

    res.status(201).json({
      message: "Payment recorded successfully",
      cashMovement: paymentMovement,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to record payment", error });
  }
};

// Function to record a receipt (incoming transaction)
export s.recordReceipt = async (req, res) => {
  try {
    const { brand, branch, cashRegister, amount, description } = req.body;
    const createdBy = req.user.id;

    // Find the cash register
    const register = await CashRegister.findById(cashRegister);
    if (!register) {
      return res.status(404).json({ message: "Cash register not found" });
    }

    // Update register balance (add)
    register.balance += amount;
    await register.save();

    // Create cash movement
    const receiptMovement = await CashMovement.create({
      brand,
      branch,
      cashRegister,
      createdBy,
      amount,
      type: "Revenue",
      description: description || "Receipt recorded",
      status: "Completed",
    });

    await receiptMovement.save();

    res.status(201).json({
      message: "Receipt recorded successfully",
      cashMovement: receiptMovement,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to record receipt", error });
  }
};
