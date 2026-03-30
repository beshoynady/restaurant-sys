import express from "express";
import productionOrderController from "../../controllers/production/production-order.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, productionOrderController.create)
  .get(authenticateToken, productionOrderController.getAll)
;

router.route("/:id")
  .get(authenticateToken, productionOrderController.getOne)
  .put(authenticateToken, productionOrderController.update)
  .delete(authenticateToken, productionOrderController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, productionOrderController.restore)
;



export default router;
