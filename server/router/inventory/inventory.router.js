import express from "express";
import inventoryController from "../../controllers/inventory/inventory.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, inventoryController.create)
  .get(authenticateToken, inventoryController.getAll)
;

router.route("/:id")
  .get(authenticateToken, inventoryController.getOne)
  .put(authenticateToken, inventoryController.update)
  .delete(authenticateToken, inventoryController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, inventoryController.restore)
;



export default router;
