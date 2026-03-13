const express = require("express");
const router = express.Router();
const cashMovementController = require("../../controllers/cash-movement.controller");

const { authenticateToken } = require("../../middlewares/authenticate");

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

module.exports = router;
