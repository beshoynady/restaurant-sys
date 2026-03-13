const express = require("express");
const { authenticateToken } = require("../../middlewares/authenticate");


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
  .post(authenticateToken,createTable)
  .get(showAllTables);
router
  .route("/:tableId")
  .get(showOneTable)
  .delete(authenticateToken,deleteTable)
  .put(authenticateToken,updateTable);
router.route("/qr").post(authenticateToken,createQR);
module.exports = router;
