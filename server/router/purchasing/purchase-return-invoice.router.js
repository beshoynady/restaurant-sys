import express from "express";
const router = express.Router();
import {
    createPurchaseReturnInvoice,
    getAllPurchaseReturnInvoices,
    getPurchaseReturnInvoiceById,
    updatePurchaseReturnInvoiceById,
    deletePurchaseReturnInvoiceById
} from "../controllers/purchase-return.controller.js";

import {authenticateToken} from "../../middlewares/authenticate.js";
import checkSubscription from "../../middlewares/checkSubscription.js";

// Routes for purchase return management
router.route('/')
    .post(authenticateToken,createPurchaseReturnInvoice)
    .get(authenticateToken,getAllPurchaseReturnInvoices);

router.route('/:id')
    .get(authenticateToken,getPurchaseReturnInvoiceById)
    .put(authenticateToken,updatePurchaseReturnInvoiceById)
    .delete(authenticateToken,deletePurchaseReturnInvoiceById);

export default router;
