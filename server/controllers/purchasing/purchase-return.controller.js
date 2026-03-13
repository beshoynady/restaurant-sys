const PurchaseReturnInvoiceModel = require('../models/purchase-return.model');

// Create a new purchase return invoice
const createPurchaseReturnInvoice = async (req, res) => {
    try {
        const {
            originalInvoice,
            returnDate,
            supplier,
            returnedItems,
            totalAmount,
            discount,
            netAmount,
            salesTax,
            refundedAmount,
            balanceDue,
            paymentDueDate,
            additionalCost,
            cashRegister,
            returnStatus,
            paymentMethod,
            refundMethod,
            notes,
        } = req.body;

        // Assume that req.user contains the authenticated employee information
        const createdBy = req.user.id;

        // Check if required fields are missing
        if (!originalInvoice || !returnDate || !supplier || !returnedItems || !totalAmount || !netAmount || !returnStatus || !refundMethod) {
            return res.status(400).json({ message: 'Missing required fields.' });
        }

        const newPurchaseReturnInvoice = await PurchaseReturnInvoiceModel.create({
            originalInvoice,
            returnDate,
            supplier,
            returnedItems,
            totalAmount,
            discount,
            netAmount,
            salesTax,
            refundedAmount,
            balanceDue,
            paymentDueDate,
            additionalCost,
            cashRegister,
            returnStatus,
            paymentMethod,
            refundMethod,
            notes,
            createdBy
        });
        
        // Check if the creation was successful
        if (!newPurchaseReturnInvoice) {
            return res.status(500).json({ message: 'Failed to create purchase return invoice.' });
        }

        res.status(201).json(newPurchaseReturnInvoice);
    } catch (error) {
        res.status(500).json({ message: error.message, error });
    }
};

// Retrieve all purchase return invoices
const getAllPurchaseReturnInvoices = async (req, res) => {
    try {
        // Retrieve all purchase return invoices and populate related fields
        const purchaseReturnInvoices = await PurchaseReturnInvoiceModel.find()
            .populate('originalInvoice') // Populate originalInvoice field
            .populate('returnedItems.itemId') // Populate returnedItems.itemId field
            .populate('supplier') // Populate supplier field
            .populate('createdBy') // Populate createdBy field
            .populate('cashRegister'); // Populate cashRegister field
            
        // Check if there are no purchase return invoices found
        if (!purchaseReturnInvoices || purchaseReturnInvoices.length === 0) {
            return res.status(404).json({ message: 'No purchase return invoices found.' });
        }

        // If purchase return invoices are found, send them as response
        res.status(200).json(purchaseReturnInvoices);
    } catch (error) {
        // Handle any errors that occur during the process
        console.error('Error in getAllPurchaseReturnInvoices:', error);
        res.status(500).json({ message: 'Dine-in server error.' , error});
    }
};


// Retrieve a single purchase return invoice by ID
const getPurchaseReturnInvoiceById = async (req, res) => {
    try {
        // Populate the supplier, returnedItems, and createdBy fields
        const purchaseReturnInvoice = await PurchaseReturnInvoiceModel.findById(req.params.id)
            .populate('supplier') // Populate supplier field
            .populate('createdBy') // Populate createdBy field
            .populate('cashRegister'); // Populate cashRegister field
            
        if (!purchaseReturnInvoice) {
            return res.status(404).json({ message: 'Purchase return invoice not found' });
        }
        res.status(200).json(purchaseReturnInvoice);
    } catch (error) {
        res.status(500).json(error);
    }
};

// Update a purchase return invoice by ID
const updatePurchaseReturnInvoiceById = async (req, res) => {
    try {
        const updatedPurchaseReturnInvoice = await PurchaseReturnInvoiceModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedPurchaseReturnInvoice) {
            return res.status(404).json({ message: 'Purchase return invoice not found' });
        }
        res.status(200).json(updatedPurchaseReturnInvoice);
    } catch (error) {
        res.status(500).json(error);
    }
};

// Delete a purchase return invoice by ID
const deletePurchaseReturnInvoiceById = async (req, res) => {
    try {
        const deletedPurchaseReturnInvoice = await PurchaseReturnInvoiceModel.findByIdAndDelete(req.params.id);
        if (!deletedPurchaseReturnInvoice) {
            return res.status(404).json({ message: 'Purchase return invoice not found' });
        }
        res.status(200).json({ message: 'Purchase return invoice deleted successfully' });
    } catch (error) {
        res.status(500).json(error);
    }
};

module.exports = {
    createPurchaseReturnInvoice,
    getAllPurchaseReturnInvoices,
    getPurchaseReturnInvoiceById,
    updatePurchaseReturnInvoiceById,
    deletePurchaseReturnInvoiceById
};
