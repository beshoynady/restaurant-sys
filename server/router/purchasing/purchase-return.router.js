import express from "express";
const router = express.Router();
import {
    createPurchaseReturnInvoice,
    getAllPurchaseReturnInvoices,
    getPurchaseReturnInvoiceById,
    updatePurchaseReturnInvoiceById,
    deletePurchaseReturnInvoiceById
} from "../../controllers/purchasing/purchase-return.controller.js";

import {authenticateToken} from "../../middlewares/authenticate.js";

router.use(authenticateToken);

// Routes for purchase return management
router.route('/')
    .post(createPurchaseReturnInvoice)
    .get(getAllPurchaseReturnInvoices);

router.route('/:id')
    .get(getPurchaseReturnInvoiceById)
    .put(updatePurchaseReturnInvoiceById)
    .delete(deletePurchaseReturnInvoiceById);

export default router;
