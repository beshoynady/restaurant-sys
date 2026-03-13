const express = require('express');
const router = express.Router();
const {
    createPurchaseInvoice,
    getAllPurchaseInvoices,
    getPurchaseInvoiceById,
    updatePurchaseInvoiceById,
    deletePurchaseInvoiceById
} = require('../controllers/purchase.controller');

const {authenticateToken} = require("../../middlewares/authenticate");
const checkSubscription = require('../../middlewares/checkSubscription')

// Routes for purchase management
router.route('/')
    .post(authenticateToken,createPurchaseInvoice)
    .get(authenticateToken,getAllPurchaseInvoices);

router.route('/:id')
    .get(authenticateToken,getPurchaseInvoiceById)
    .put(authenticateToken,updatePurchaseInvoiceById)
    .delete(authenticateToken,deletePurchaseInvoiceById);

module.exports = router;
