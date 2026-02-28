const express = require("express");
const router = express.Router();
const {
  createCustomerMessage,
  getCustomerMessages,
  getCustomerMessageById,
  updateCustomerMessage,
  softDeleteCustomerMessage,
  restoreCustomerMessage,
} = require("../../controllers/customers/message.controller");
// ----------------------------
// 🔹 Middlewares
// ----------------------------
const { authenticateToken } = require("../middlewares/authenticate");
const { verifyBrandAndBranch } = require("../middlewares/verifyBrandAndBranch");

router
  .route("/")
  .post(verifyBrandAndBranch, createCustomerMessage)
  .get(authenticateToken, verifyBrandAndBranch, getCustomerMessages);

router
  .route("/:id")
  .get(authenticateToken, verifyBrandAndBranch, getCustomerMessageById)
  .put(authenticateToken, verifyBrandAndBranch, updateCustomerMessage);
router
  .route("soft-delete/:id")
  .put(authenticateToken, verifyBrandAndBranch, softDeleteCustomerMessage);
router.patch(
  "/restore/:id",
  authenticateToken,
  verifyBrandAndBranch,
  restoreCustomerMessage,
);

module.exports = router;
