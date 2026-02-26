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
    .post(authenticateToken, checkSubscription, createPurchaseInvoice)
    .get(authenticateToken, checkSubscription, getAllPurchaseInvoices);

router.route('/:id')
    .get(authenticateToken, checkSubscription, getPurchaseInvoiceById)
    .put(authenticateToken, checkSubscription, updatePurchaseInvoiceById)
    .delete(authenticateToken, checkSubscription, deletePurchaseInvoiceById);

module.exports = router;
