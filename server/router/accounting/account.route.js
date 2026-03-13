const {
  createAccount,
  getAccounts,
  getAccountById,
  getAccountByCode,
  getAccountsByParent,
  updateAccount,
  deleteAccount,
  setAccountStatus,
} = require("../../controllers/accounting/account.controller");

const { authenticateToken } = require("../../middlewares/authenticate");



const router = require("express").Router();

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

module.exports = router;