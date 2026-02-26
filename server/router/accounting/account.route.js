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
const checkSubscription = require("../../middlewares/checkSubscription");


const router = require("express").Router();

// ==============================
// Account Routes
// ==============================
router.route("/").post(authenticateToken, checkSubscription, createAccount).get(getAccounts);
router
  .route("/:id")
  .get(authenticateToken, checkSubscription, getAccountById)
  .put(authenticateToken, checkSubscription, updateAccount)
  .delete(authenticateToken, checkSubscription, deleteAccount);
router.route("/code/:code").get(authenticateToken, checkSubscription, getAccountByCode);
router.route("/parent/:parentId").get(authenticateToken, checkSubscription, getAccountsByParent);
router.route("/:id/status").put(authenticateToken, checkSubscription, setAccountStatus);

module.exports = router;