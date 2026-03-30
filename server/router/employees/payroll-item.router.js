import express from "express";
import payrollItemController from "../../controllers/employees/payroll-item.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, payrollItemController.create)
  .get(authenticateToken, payrollItemController.getAll)
;

router.route("/:id")
  .get(authenticateToken, payrollItemController.getOne)
  .put(authenticateToken, payrollItemController.update)
  .delete(authenticateToken, payrollItemController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, payrollItemController.restore)
;



export default router;
