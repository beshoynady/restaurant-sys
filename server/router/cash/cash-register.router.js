const express = require("express");
const router = express.Router();
const cashRegisterController = require("../../controllers/cash-register.controller");

const { authenticateToken } = require("../../middlewares/authenticate");


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

module.exports = router;
