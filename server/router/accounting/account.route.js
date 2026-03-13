import {
  createAccount,
  getAccounts,
  getAccountById,
  getAccountByCode,
  getAccountsByParent,
  updateAccount,
  deleteAccount,
  setAccountStatus,
} from "../../controllers/accounting/account.controller.js";

import { authenticateToken } from "../../middlewares/authenticate.js";



import router from "express";.Router();

// ==============================
// Account Routes
// ==============================
router.route("/").post(authenticateToken,createAccount).get(getAccounts);
router
  .route("/:id")
  .get(authenticateToken,getAccountById)
  .put(authenticateToken,updateAccount)
  .delete(authenticateToken,deleteAccount);
router.route("/code/:code").get(authenticateToken,getAccountByCode);
router.route("/parent/:parentId").get(authenticateToken,getAccountsByParent);
router.route("/:id/status").put(authenticateToken,setAccountStatus);

export default router;