import express from "express";
const router = express.Router();



import {
  async
} from "../../controllers/employees/auth.controller.js";

import { authenticateToken } from "../../middlewares/authenticate.js";




export default router;