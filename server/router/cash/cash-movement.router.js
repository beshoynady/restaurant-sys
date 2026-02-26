const express = require("express");
const router = express.Router();
const cashMovementController = require("../../controllers/cash-movement.controller");

const { authenticateToken } = require("../../middlewares/authenticate");
const checkSubscription = require("../../middlewares/checkSubscription");
// Routes related to Cash Movements
router
  .route("/")
  .get(
    authenticateToken,
    checkSubscription,
    cashMovementController.getAllCashMovements
  )
  .post(
    authenticateToken,
    checkSubscription,
    cashMovementController.createCashMovement
  );

router
  .route("/:id")
  .get(
    authenticateToken,
    checkSubscription,
    cashMovementController.getCashMovementById
  )
  .put(
    authenticateToken,
    checkSubscription,
    cashMovementController.updateCashMovement
  )
  .delete(
    authenticateToken,
    checkSubscription,
    cashMovementController.deleteCashMovement
  );

router
  .route("/transfer")
  .post(
    authenticateToken,
    checkSubscription,
    cashMovementController.transferCashBetweenRegisters
  );

module.exports = router;
