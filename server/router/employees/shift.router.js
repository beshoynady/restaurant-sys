import express from "express";
const router = express.Router();
import {
  createShift,
  getAllShifts,
  getShiftById,
  updateShift,
  deleteShift
} from "../../controllers/employees/shift.controller.js";
import {authenticateToken} from "../../middlewares/authenticate.js";


router.route('/')
  .post(authenticateToken,createShift)
  .get(authenticateToken,getAllShifts);

router.route('/:id')

  .get(authenticateToken,getShiftById)
  .put(authenticateToken,updateShift)
  .delete(authenticateToken,deleteShift);

export default router;
