import express from "express";
const router = express.Router();
import {
    createSupplierTransaction,
    getAllSupplierTransactions,
    getSupplierTransactionById,
    updateSupplierTransaction,
    deleteSupplierTransaction,
} from "../../controllers/purchasing/supplier-transaction.controller.js";

import {authenticateToken} from "../../middlewares/authenticate.js";
import checkSubscription from "../../middlewares/checkSubscription.js";

router.route('/')
    .post(authenticateToken,createSupplierTransaction)
    .get(authenticateToken,getAllSupplierTransactions);

router.route('/:id')
    .get(authenticateToken,getSupplierTransactionById)
    .put(authenticateToken,updateSupplierTransaction)
    .delete(authenticateToken,deleteSupplierTransaction);

    
export default router;
