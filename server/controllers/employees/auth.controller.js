const Usermodel = require("../../models/users.model.js");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { validationResult } = require("express-validator");
require("dotenv").config();

const signup = async (req, res) => {
  try {
    const { username, email, address, deliveryArea, phone, password } =
      req.body;

    // Validate input fields
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const isUserExist = await Usermodel.findOne({ phone });
    if (isUserExist) {
      return res
        .status(409)
        .json({ message: "This phone number is already in use" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await Usermodel.create({
      username,
      email,
      phone,
      deliveryArea,
      address,
      password: passwordHash,
    });

    const accessToken = generateAccessToken(newUser);

    res.status(201).json({ accessToken, newUser });
  } catch (err) {
    res.status(500).json({ message: err.message, err });
  }
};

const login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    // Validate input
    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        error: "Phone number and password are required",
      });
    }

    // Find user by phone number
    const findUser = await Usermodel.findOne({ phone });
    if (!findUser) {
      return res
        .status(404)
        .json({ success: false, error: "Phone number is not registered" });
    }

    // Check if user is active
    if (!findUser.isActive) {
      return res
        .status(401)
        .json({ success: false, error: "User is not active" });
    }

    // Validate password
    const match = await bcrypt.compare(password, findUser.password);
    if (!match) {
      return res
        .status(401)
        .json({ success: false, error: "Incorrect password" });
    }

    // Generate access token
    const accessToken = generateAccessToken(findUser);

    // Send successful response with user data and access token
    res.status(200).json({ findUser, accessToken });
  } catch (error) {
    // Handle server errors
    console.error("Login error:", error);
    res
      .status(500)
      .json({ success: false, error: "Dine-in server error", error });
  }
};

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userinfo: {
        id: user._id,
        isActive: user.isActive,
        isVarified: user.isVarified,
        username: user.username,
        phone: user.phone,
      },
    },
    process.env.JWT_SECRET_KEY,
    { expiresIn: "1y" }
  );
};


module.exports = { signup, login };
