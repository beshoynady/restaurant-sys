const OrderModel =require("../models/order.model");

// Create a new order
const createOrder = async (req, res) => {
  try {
    // Destructure the request body
    const {
      serial,
      orderNum,
      products,
      subTotal,
      salesTax,
      serviceTax,
      addition,
      discount,
      deliveryFee,
      total,
      table,
      user,
      createdBy,
      cashier,
      name,
      address,
      phone,
      waiter,
      deliveryMan,
      help,
      helpStatus,
      status,
      orderType,
      isActive,
      payment_status,
      paymentMethod,
      payment_date,
    } = req.body;

    // Validate required fields
    if (!serial && (!products || !subTotal || !total || (help && table))) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Create a new order
    const newOrder = await OrderModel.create({
      serial,
      orderNum,
      products,
      subTotal,
      salesTax,
      serviceTax,
      addition,
      discount,
      deliveryFee,
      total,
      table,
      user,
      createdBy,
      cashier,
      name,
      address,
      phone,
      waiter,
      deliveryMan,
      help,
      helpStatus,
      status,
      orderType,
      isActive,
      payment_status,
      paymentMethod,
      payment_date,
    });

    // Check if the order was created successfully
    if (newOrder) {
      return res.status(201).json(newOrder);
    } else {
      throw new Error("Failed to create new order");
    }
  } catch (err) {
    // Differentiate between validation errors and other errors
    if (err.name === "ValidationError") {
      return res
        .status(422)
        .json({ error: "Validation error", details: err.errors });
    }

    // General error handling
    res.status(500).json({ error: err.message });
  }
};

const getOrder = async (req, res) => {
  try {
    const orderId = req.params.id;

    // Validate order ID format
    if (!orderId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "Invalid order ID format" });
    }

    // Fetch the order by ID with population
    const order = await OrderModel.findById(orderId)
      .populate("products.productId", "_id name price department")
      .populate("products.extras.extraDetails.extraId", "_id name price")
      .populate("table", "_id tableNumber sectionNumber")
      .populate("user", "_id username address deliveryArea phone")
      .populate("createdBy", "_id fullname username role shift sectionNumber")
      .populate("cashier", "_id fullname username role shift sectionNumber")
      .populate("waiter", "_id fullname username role shift sectionNumber")
      .populate("deliveryMan", "_id fullname username role shift");

    // Handle case where order is not found
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Respond with the found order
    res.status(200).json(order);
  } catch (err) {
    console.error("Error fetching order:", err);

    // Handle specific error scenarios
    if (err.name === "CastError") {
      return res.status(400).json({ error: "Invalid order ID format" });
    }

    // Handle other unexpected errors
    res
      .status(500)
      .json({ error: "Dine-in server error", details: err.message });
  }
};

const getOrders = async (req, res) => {
  try {
    // Fetch all orders with required population
    const orders = await OrderModel.find()
      .populate("products.productId", "_id name price department")
      .populate("products.extras.extraDetails.extraId", "_id name price")
      .populate("table", "_id tableNumber sectionNumber")
      .populate("user", "_id username address deliveryArea phone")
      .populate("createdBy", "_id fullname username role shift sectionNumber")
      .populate("cashier", "_id fullname username role shift sectionNumber")
      .populate("waiter", "_id fullname username role shift sectionNumber")
      .populate("deliveryMan", "_id fullname username role shift");

    // Handle the case where no orders are found
    if (!orders || orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No orders found.",
        data: [],
      });
    }

    // Return the fetched orders
    res.status(200).json({
      success: true,
      message: "Orders retrieved successfully.",
      data: orders,
    });
  } catch (err) {
    console.error("Error fetching orders:", err);

    // Handle validation errors
    if (err.name === "ValidationError") {
      return res.status(422).json({
        success: false,
        message: "Invalid input data.",
        details: err.errors,
      });
    }

    // Handle database or unexpected errors
    res.status(500).json({
      success: false,
      message: "Dine-in server error.",
      details: err.message,
    });
  }
};

const getLimitOrders = async (req, res) => {
  try {
    // Validate input limit
    const limit = parseInt(req.params.limit, 10);
    if (isNaN(limit) || limit <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid limit value. It must be a positive integer.",
      });
    }

    // Fetch limited orders sorted by creation date (latest first)
    const orders = await OrderModel.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("products.productId", "_id name price department")
      .populate("products.extras.extraDetails.extraId", "_id name price")
      .populate("table", "_id tableNumber sectionNumber")
      .populate("user", "_id username address deliveryArea phone")
      .populate("createdBy", "_id fullname username role shift sectionNumber")
      .populate("cashier", "_id fullname username role shift sectionNumber")
      .populate("waiter", "_id fullname username role shift sectionNumber")
      .populate("deliveryMan", "_id fullname username role shift");

    // Handle the case where no orders are found
    if (!orders || orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No orders found (Limit: ${limit}).`,
        data: [],
      });
    }

    // Return the fetched orders
    res.status(200).json({
      success: true,
      message: `Successfully retrieved ${orders.length} order(s).`,
      data: orders,
    });
  } catch (err) {
    console.error("Error fetching orders:", err);

    // Handle validation errors
    if (err.name === "ValidationError") {
      return res.status(422).json({
        success: false,
        message: "Invalid input data.",
        details: err.errors,
      });
    }

    // Handle database or unexpected errors
    res.status(500).json({
      success: false,
      message: "Dine-in server error.",
      details: err.message,
    });
  }
};

// Update an order by ID
const updateOrder = async (req, res) => {
  try {
    const orderId = req.params.id;

    // Validate the order ID format
    if (!orderId || !orderId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "Invalid order ID format" });
    }

    // Check if update data is provided
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: "No data provided for update" });
    }

    // Update the order
    const updatedOrder = await OrderModel.findByIdAndUpdate(
      orderId,
      { $set: req.body },
      { new: true, runValidators: true } // Enable validation during update
    )
      .populate("products.productId", "_id name price department")
      .populate("products.extras.extraDetails.extraId", "_id name price");

    // Check if the order exists
    if (!updatedOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Respond with the updated order
    return res.status(200).json({
      message: "Order updated successfully",
      order: updatedOrder,
    });
  } catch (err) {
    // Handle validation errors
    if (err.name === "ValidationError") {
      return res
        .status(422)
        .json({ error: "Validation error", details: err.errors });
    }

    // Handle general errors
    console.error(err); // Log the error for debugging
    return res.status(500).json({ error: "An Dine-in server error occurred" });
  }
};

// Delete an order by ID
const deleteOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const deletedOrder = await OrderModel.findByIdAndDelete(orderId);
    if (!deletedOrder) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.status(200).json(deletedOrder);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

module.exports = {
  createOrder,
  getOrder,
  getOrders,
  getLimitOrders,
  updateOrder,
  deleteOrder,
};
