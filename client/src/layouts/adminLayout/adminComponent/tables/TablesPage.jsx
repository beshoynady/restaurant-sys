import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContext } from "../../../../context/appContext";

const TablesPage = () => {
  const {
    allProducts,
    productsOffer,
    sizesOffer,
    setproductExtras,
    productExtras,
    handleAddProductExtras,
    addExtrasToProduct,
    itemId,
    addItemToCart,
    deleteItemFromCart,
    incrementProductQuantity,
    decrementProductQuantity,
    setproductNote,
    addNoteToProduct,
    allTable,
    getAllTable,
    handleGetTokenAndConfig,
    apiUrl,
  } = useContext(AppContext);

  // State for tables, active orders, products in active orders, and consumption in active orders
  const [activeTable, setactiveTable] = useState([]);
  const [orderactive, setOrderActive] = useState([]); // State for active orders
  const [productsOrderActive, setproductsOrderActive] = useState([]); // State for active orders
  const [allOrders, setAllOrders] = useState([]); // State for all orders

  // Fetches orders from the API
  const getOrdersFromAPI = async () => {
    try {
      const config = await handleGetTokenAndConfig();
      // Fetch orders data from the API endpoint
      const orders = await axios.get(apiUrl + "/api/order");
      // Set all orders fetched from the API
      setAllOrders(orders.data);

      // Filter active orders from all orders
      const activeOrders = orders.data.filter(
        (order) => order.isActive === true
      );
      // 
      // Set active orders
      setOrderActive(activeOrders);

      // Extract table IDs from active orders
      const getactiveTable = activeOrders.filter(
        (activeOrder) => activeOrder.table != null
      );

      // 
      // Set table IDs
      setactiveTable(getactiveTable);
    } catch (error) {
      
    }
  };
  

  useEffect(() => {
    getOrdersFromAPI();
  }, []);

  return (
    <div className="container-xl" style={{ height: "calc(100% - 60px)" }}>
      <h1>صفحة الطاولات</h1>
      <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
        {allTable.map((table) => (
          <div
            key={table.id}
            className="col-lg-2 col-md-4 col-sm-6 mb-4"
            style={{ border: "2px solid var(--light)" }}
          >
            <div className="text-center">
              <span
                style={{
                  fontSize: "60px",
                  color: activeTable.find(
                    (active) => active.table === table._id
                  )
                    ? "green"
                    : "red",
                }}
                className="material-symbols-outlined"
              >
                table_restaurant
              </span>
              <p style={{ fontSize: "30px", color: "black" }}>
                {table.tableNumber}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TablesPage;
