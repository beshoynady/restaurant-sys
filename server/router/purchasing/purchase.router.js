import express from "express";
import purchaseController from "../../controllers/purchasing/purchase.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, purchaseController.create)
  .get(authenticateToken, purchaseController.getAll)
;

router.route("/:id")
  .put(authenticateToken, purchaseController.update)
  .delete(authenticateToken, purchaseController.delete)
;



export default router;
