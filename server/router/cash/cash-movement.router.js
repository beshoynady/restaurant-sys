import express from "express";
const router = express.Router();
import cashMovementController from "../../controllers/cash-movement.controller.js";

import { authenticateToken } from "../../middlewares/authenticate.js";

// Routes related to Cash Movements
router
  .route("/")
  .get(
    authenticateToken,
   
    cashMovementController.getAllCashMovements
  )
  .post(
    authenticateToken,
   
    cashMovementController.createCashMovement
  );

router
  .route("/:id")
  .get(
    authenticateToken,
   
    cashMovementController.getCashMovementById
  )
  .put(
    authenticateToken,
   
    cashMovementController.updateCashMovement
  )
  .delete(
    authenticateToken,
   
    cashMovementController.deleteCashMovement
  );

router
  .route("/transfer")
  .post(
    authenticateToken,
   
    cashMovementController.transferCashBetweenRegisters
  );

export default router;
