import express from "express";
const router = express.Router();
import {
   getAllCashRegisters,
  getCashRegisterById,
  getCashRegistersByEmployee,
  createCashRegister,
  updateCashRegister,
  deleteCashRegister,
} from "../../controllers/cash/cash-register.controller.js";

import { authenticateToken } from "../../middlewares/authenticate.js";


// Routes related to Cash Register
router
  .route("/")
  .post(
    authenticateToken,
    createCashRegister
  )
  .get(
    authenticateToken,
    getAllCashRegisters
  );

router
  .route("/:id")
  .get(
    authenticateToken,
    getCashRegisterById
  )
  .put(authenticateToken, updateCashRegister)
  .delete(
    authenticateToken,
    deleteCashRegister
  );
router
  .route("/employee/:employeeId")
  .get(
    authenticateToken,
    getCashRegistersByEmployee
  );

export default router;
