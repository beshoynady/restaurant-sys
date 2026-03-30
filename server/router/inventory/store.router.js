import express from "express";
import storeController from "../../controllers/inventory/store.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, storeController.create)
  .get(authenticateToken, storeController.getAll)
;

router.route("/:id")
  .put(authenticateToken, storeController.update)
  .delete(authenticateToken, storeController.delete)
;



export default router;
