import express from "express";
const router = express.Router();
import {
    createSupplier,
    getAllSuppliers,
    getSupplierById,
    updateSupplierById,
    deleteSupplierById
} from "../../controllers/purchasing/supplier.controller.js";

import {authenticateToken} from "../../middlewares/authenticate.js";
import checkSubscription from "../../middlewares/checkSubscription.js";

router.route('/')
    .post(authenticateToken,createSupplier)
    .get(authenticateToken,getAllSuppliers);

router.route('/:id')
    .get(authenticateToken,getSupplierById)
    .put(authenticateToken,updateSupplierById)
    .delete(authenticateToken,deleteSupplierById);

export default router;
