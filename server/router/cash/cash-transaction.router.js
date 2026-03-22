import express from "express";
const router = express.Router();
import {
  createcashTransaction,
  getAllcashTransactions,
  getcashTransactionById,
  updatecashTransaction,
  deletecashTransaction,
  transferCashBetweenRegisters,
  recordPayment,
  recordReceipt,
} from "../../controllers/cash/cash-transaction.controller.js";

import { authenticateToken } from "../../middlewares/authenticate.js";

router.use(authenticateToken);

// Routes related to Cash Transactions
router
  .route("/")
  .get(
    getAllcashTransactions
  )
  .post(
    createcashTransaction
  );

router
  .route("/:id")
  .get(
    getcashTransactionById
  )
  .put(
    updatecashTransaction
  )
  .delete(
    deletecashTransaction
  );

router
  .route("/transfer")
  .post(
    transferCashBetweenRegisters
  );

router
  .route("/payment")
  .post(
    recordPayment
  );
  
router
    .route("/receipt")
    .post(
      recordReceipt
    );
    

export default router;
