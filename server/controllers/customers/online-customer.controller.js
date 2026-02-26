const OnlineCustomer = require("../../models/customers/online-custoner.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const Joi = require("joi");

const secretKey = process.env.JWT_SECRET_KEY;
const refreshSecretKey = process.env.JWT_REFRESH_SECRET;

/* =====================================================
   🔹 Joi Schemas
===================================================== */

const createSchema = Joi.object({
  name: Joi.string().trim().min(3).max(100).required(),
  email: Joi.string().email().trim().max(100).optional(),
  phone: Joi.string().trim().max(30).required(),
  password: Joi.string().min(6).required(),
  address: Joi.object({
    address: Joi.string().min(5).required(),
    deliveryArea: Joi.string().hex().length(24).required(),
    coordinates: Joi.array().items(Joi.number()).length(2).required(),
    notes: Joi.string().max(300).optional(),
  }).required(),
});

const updateSchema = Joi.object({
  name: Joi.string().trim().min(3).max(100),
  email: Joi.string().email().trim().max(100),
  phone: Joi.string().trim().max(30),
  password: Joi.string().min(6),
  isActive: Joi.boolean(),
  isVerified: Joi.boolean(),
});

/* =====================================================
   🔹 CREATE ONLINE CUSTOMER
===================================================== */
const createOnlineCustomer = async (req, res) => {
  try {
    const brand = req.brand._id;
    const { error, value } = createSchema.validate(req.body);
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    const { name, email, phone, password, address } = value;

    const exists = await OnlineCustomer.findOne({
      brand,
      $or: [{ phone }, { email: email || null }],
    });
    if (exists)
      return res.status(409).json({ message: "Phone or email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const customer = await OnlineCustomer.create({
      brand,
      name,
      email,
      phone,
      isVerified: false,
      isActive: true,
      password: hashedPassword,
      addresses: [{ ...address, isDefault: true }],
    });

    const accessToken = jwt.sign(
      {
        id: customer._id,
        brand: customer.brand,
        isActive: customer.isActive,
      },
      secretKey,
      { expiresIn: "1d" },
    );

    const refreshToken = jwt.sign({ id: customer._id }, refreshSecretKey, {
      expiresIn: "7d",
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      message: "Customer created successfully",
      accessToken,
      customer,
    });
  } catch (err) {
    console.error("Create customer error:", err);
    res.status(500).json({
      message: "Server error while creating customer",
      error: err.message,
    });
  }
};

/* =====================================================
   🔹 LOGIN CUSTOMER
===================================================== */
const loginCustomer = async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password)
      return res.status(400).json({ message: "Phone and password required" });

    const customer = await OnlineCustomer.findOne({
      phone,
      isDeleted: false,
    }).select("+password");
    if (!customer)
      return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, customer.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const accessToken = jwt.sign(
      { id: customer._id, brand: customer.brand, isActive: customer.isActive },
      secretKey,
      { expiresIn: "15m" },
    );

    const refreshToken = jwt.sign({ id: customer._id }, refreshSecretKey, {
      expiresIn: "7d",
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ message: "Login successful", accessToken, customer });
  } catch (err) {
    console.error("Login error:", err);
    res
      .status(500)
      .json({ message: "Server error during login", error: err.message });
  }
};

/* =====================================================
   🔹 LOGOUT CUSTOMER
===================================================== */
const logoutCustomer = async (req, res) => {
  try {
    if (req.cookies.refreshToken) {
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });
    }
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    res
      .status(500)
      .json({ message: "Server error during logout", error: err.message });
  }
};

/* =====================================================
   🔹 RESET PASSWORD
===================================================== */
const resetPassword = async (req, res) => {
  try {
    const { phone, newPassword } = req.body;
    if (!phone || !newPassword)
      return res
        .status(400)
        .json({ message: "Phone and new password required" });

    const customer = await OnlineCustomer.findOne({
      phone,
      brand: req.brand._id,
    });
    if (!customer)
      return res.status(404).json({ message: "Customer not found" });

    customer.password = await bcrypt.hash(newPassword, 10);
    await customer.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({
      message: "Server error during password reset",
      error: err.message,
    });
  }
};

/* =====================================================
   🔹 GET CUSTOMER(S)
===================================================== */
const getOnlineCustomerById = async (req, res) => {
  try {
    const customer = await OnlineCustomer.findOne({
      _id: req.params.id,
      brand: req.brand._id,
      isDeleted: false,
    });
    if (!customer)
      return res.status(404).json({ message: "Customer not found" });

    res.json(customer);
  } catch (err) {
    console.error("Get customer error:", err);
    res.status(500).json({
      message: "Server error while fetching customer",
      error: err.message,
    });
  }
};

const getAllOnlineCustomers = async (req, res) => {
  try {
    const customers = await OnlineCustomer.find({
      brand: req.brand._id,
      isDeleted: false,
    });
    res.json(customers);
  } catch (err) {
    console.error("Get all customers error:", err);
    res.status(500).json({
      message: "Server error while fetching customers",
      error: err.message,
    });
  }
};

/* =====================================================
   🔹 UPDATE CUSTOMER
===================================================== */
const updateOnlineCustomer = async (req, res) => {
  try {
    const { error } = updateSchema.validate(req.body);
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    if (req.body.password)
      req.body.password = await bcrypt.hash(req.body.password, 10);

    const updated = await OnlineCustomer.findOneAndUpdate(
      { _id: req.params.id, brand: req.brand._id, isDeleted: false },
      req.body,
      { new: true },
    );

    if (!updated)
      return res.status(404).json({ message: "Customer not found" });

    res.json(updated);
  } catch (err) {
    console.error("Update customer error:", err);
    res.status(500).json({
      message: "Server error while updating customer",
      error: err.message,
    });
  }
};

/* =====================================================
   🔹 SOFT DELETE
===================================================== */
const deleteOnlineCustomer = async (req, res) => {
  try {
    const deleted = await OnlineCustomer.findOneAndUpdate(
      { _id: req.params.id, brand: req.brand._id },
      { isDeleted: true, deletedAt: new Date(), deletedBy: req.user?._id },
      { new: true },
    );
    if (!deleted)
      return res.status(404).json({ message: "Customer not found" });

    res.json({ message: "Customer deleted successfully" });
  } catch (err) {
    console.error("Delete customer error:", err);
    res.status(500).json({
      message: "Server error while deleting customer",
      error: err.message,
    });
  }
};

module.exports = {
  createOnlineCustomer,
  loginCustomer,
  logoutCustomer,
  resetPassword,
  getOnlineCustomerById,
  getAllOnlineCustomers,
  updateOnlineCustomer,
  deleteOnlineCustomer,
};
