import express from "express";
import { authenticateToken } from "../../middlewares/authenticate.js";


import {
  createTable,
  createQR,
  showAllTables,
  showOneTable,
  updateTable,
  deleteTable,
} from "../../controllers/seating/table.controller.js";

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
export default router;
