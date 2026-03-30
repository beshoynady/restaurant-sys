import express from "express";
import customerAuthController from "../../controllers/customers/customer-auth.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";


const router = express.Router();



export default router;
