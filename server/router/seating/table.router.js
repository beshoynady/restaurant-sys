const express = require("express");
const { authenticateToken } = require("../../middlewares/authenticate");
const checkSubscription = require("../../middlewares/checkSubscription");

const {
  createTable,
  createQR,
  showAllTables,
  showOneTable,
  updateTable,
  deleteTable,
} = require("../../controllers/table.controller");

const router = express.Router();

router
  .route("/")
  .post(authenticateToken, checkSubscription, createTable)
  .get(showAllTables);
router
  .route("/:tableId")
  .get(showOneTable)
  .delete(authenticateToken, checkSubscription, deleteTable)
  .put(authenticateToken, checkSubscription, updateTable);
router.route("/qr").post(authenticateToken, checkSubscription, createQR);
module.exports = router;
