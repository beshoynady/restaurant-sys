import userAccountModel from "../../models/employees/user-account.model.js";
import asyncHandler from "../../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import joi from "joi";
import dotenv from "dotenv";
dotenv.config();
const secretKey = process.env.JWT_SECRET_KEY;

const signupValidationSchema = joi.object({
  username: joi.string().min(3).max(30).required(),
  email: joi.string().email().optional(),
    phone: joi.string().optional(),
    password: joi.string().min(6).required(),
    role: joi.string().optional(),
    employee: joi.string().optional(),
});

const userAuthController = {
signup : asyncHandler(async (req, res) => {
    const { username, email, address, deliveryArea, phone, password } =
      req.body;

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
}),

 login : asyncHandler(async (req, res) => {
  const { phone, password } = req.body;

    // Validate input
    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        error: "Phone number and password are required",
      })
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
 
}),

generateAccessToken : (user) => {
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
    secretKey,
    { expiresIn: "1y" },
  );
},

 restPass : asyncHandler(async (req, res) => {
    const { phone, newPassword } = req.body;

    if (!phone || !newPassword) {
      return res
        .status(400)
        .json({ message: "Phone number and new password are required" });
    }
    const user = await Usermodel.findOne({ phone });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    res.status(200).json({ message: "Password reset successful" });
  
}),

}

export default userAuthController