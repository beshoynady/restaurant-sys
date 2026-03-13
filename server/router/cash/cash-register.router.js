import express from "express";
const router = express.Router();
import cashRegisterController from "../../controllers/cash-register.controller.js";

import { authenticateToken } from "../../middlewares/authenticate.js";


// Routes related to Cash Register
router
  .route("/")
  .post(
    authenticateToken,
   
    cashRegisterController.createCashRegister
  )
  .get(
    authenticateToken,
   
    cashRegisterController.getAllCashRegisters
  );

router
  .route("/:id")
  .get(
    authenticateToken,
   
    cashRegisterController.getCashRegisterById
  )
  .put(authenticateToken, cashRegisterController.updateCashRegister)
  .delete(
    authenticateToken,
   
    cashRegisterController.deleteCashRegister
  );
router
  .route("/employee/:employeeId")
  .get(
    authenticateToken,
   
    cashRegisterController.getCashRegistersByEmployee
  );

export default router;
