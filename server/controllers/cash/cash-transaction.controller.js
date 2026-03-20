// TODO: Implement controller for cash-transaction.controller
import cashTransaction from "../../models/cash/cash-transaction.model.js";
import CashRegister from "../../models/cash/cash-register.model.js";


// Controller function to create a cash movement
const createcashTransaction = async (req, res) => {
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
    const newcashTransaction = await cashTransaction.create({
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
    await newcashTransaction.save();

    // Respond with success message and the created cash movement
    res.status(201).json({
      message: "Cash movement created successfully",
      cashTransaction: newcashTransaction,
    });
  } catch (error) {
    // Handle errors during the creation process
    res.status(500).json({ error: "Failed to create cash movement", error });
  }
};

// Controller function to get all cash movements
const getAllcashTransactions = async (req, res) => {
  try {
    const cashTransactions = await cashTransaction.find()
      .populate("registerId")
      .populate("createdBy")
      .populate("transferTo")
      .populate("transferFrom")
      .populate("movementId");
    res.status(200).json(cashTransactions);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve cash movements", error });
  }
};

// Controller function to get a cash movement by ID
const getcashTransactionById = async (req, res) => {
  try {
    const cashTransaction = await cashTransaction.findById(req.params.id)
      .populate("registerId")
      .populate("createdBy")
      .populate("transferTo")
      .populate("transferFrom")
      .populate("movementId");
    if (!cashTransaction) {
      return res.status(404).json({ message: "Cash movement not found" });
    }
    res.status(200).json(cashTransaction);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve cash movement", error });
  }
};

// Controller function to update a cash movement by ID
const updatecashTransaction = async (req, res) => {
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

    const cashTransaction = await cashTransaction.findById(req.params.id);
    if (!cashTransaction) {
      return res.status(404).json({ message: "Cash movement not found" });
    }
    const updatedcashTransaction = await cashTransaction.findByIdAndUpdate(
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

    if (!updatedcashTransaction) {
      return res.status(404).json({ message: "Cash movement not found" });
    }

    res.status(200).json({
      message: "Cash movement updated successfully",
      cashTransaction: updatedcashTransaction,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to update cash movement", error });
  }
};

// Controller function to delete a cash movement by ID
const deletecashTransaction = async (req, res) => {
  try {
    const cashTransaction = await cashTransaction.findByIdAndDelete(req.params.id);
    if (!cashTransaction) {
      return res.status(404).json({ message: "Cash movement not found" });
    }
    res.status(200).json({ message: "Cash movement deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete cash movement", error });
  }
};

const transferCashBetweenRegisters = async (req, res) => {
  try {
    const { fromRegisterId, toRegisterId, amount, description } = req.body;

    // Check if both registers exist and handle errors if not found
    // Your logic here to validate register IDs

    // Create cash movements for both registers (one for outgoing, one for incoming)
    const outgoingMovement = new cashTransaction({
      registerId: fromRegisterId,
      createdBy: req.user._id, // Assuming user information is included in the request after authentication
      amount: -amount, // Negative amount for outgoing movement
      type: "Transfer",
      description: description || "Transfer to another register",
    });

    const incomingMovement = new cashTransaction({
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
const recordPayment = async (req, res) => {
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
    const paymentMovement = await cashTransaction.create({
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
      cashTransaction: paymentMovement,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to record payment", error });
  }
};

// Function to record a receipt (incoming transaction)
const recordReceipt = async (req, res) => {
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
    const receiptMovement = await cashTransaction.create({
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
      cashTransaction: receiptMovement,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to record receipt", error });
  }
};


export {
  createcashTransaction,
  getAllcashTransactions,
  getcashTransactionById,
  updatecashTransaction,
  deletecashTransaction,
  transferCashBetweenRegisters,
  recordPayment,
  recordReceipt,
};