import express from "express";
const router = express.Router();



import {
  async
} from "../../controllers/inventory/production-record.controller.js";

import { authenticateToken } from "../../middlewares/authenticate.js";




export default router;