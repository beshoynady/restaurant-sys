import React, { useContext, useState, useEffect } from "react";
import "./Home.css";
import io from "socket.io-client";

import { AppContext } from "../../../../context/appContext";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";

const cashierSocket = io(`${process.env.REACT_APP_API_URL}/cashier`, {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});

const Home = () => {
  const { brandInfo, userLoginInfo, apiUrl, handleGetTokenAndConfig } =
    useContext(AppContext);
  const { id } = useParams();
  const navigate = useNavigate(); // Use useNavigate hook
  const [table, setTable] = useState(null);

  const tableInfo = async () => {
    try {
      const config = await handleGetTokenAndConfig();
      const response = await axios.get(`${apiUrl}/api/table`, config);
      if (response.data) {
        const allTable = response.data;
        const table = allTable.find((tab) => tab.tableCode === id);
        setTable(table);
      } else {
        // If table data is not found, navigate to home
        navigate("/");
      }
    } catch (error) {
      // Handle error and navigate to home
      navigate("/");
    }
  };

  useEffect(() => {
    if (id) {
      tableInfo();
    } else {
      navigate("/");
    }
  }, [id, navigate]);

  const askingForHelp = async (tableId) => {
    try {
      const config = await handleGetTokenAndConfig();
      // Fetch the last 30 orders
      const response = await axios.get(`${apiUrl}/api/order/limit/30`, config);
      const allOrders = response.data;

      // Filter orders for the specified table
      const tableOrders = allOrders.filter(
        (order) => order.table && order.table._id === tableId
      );

      // Get the last order for the table
      const lastTableOrder = tableOrders.length > 0 ? tableOrders[0] : null;

      // Check if the last table order is active
      const lastTableOrderActive = lastTableOrder
        ? lastTableOrder.isActive
        : false;

      if (!lastTableOrderActive) {
        // Generate a new serial number for the order
        const lastSerial =
          allOrders.length > 0
            ? allOrders[allOrders.length - 1].serial
            : "000000";
        const newSerial = String(Number(lastSerial) + 1).padStart(6, "0");

        // Create a new order with the help request
        const newOrderData = {
          serial: newSerial,
          table: tableId,
          help: "Requests assistance",
        };
        const newOrder = await axios.post(`${apiUrl}/api/order/`, newOrderData);
        if (newOrder) {
          toast.info("تم طلب الويتر للمساعدة");
          cashierSocket.emit(
            "helprequest",
            `طاوله رقم ${table.tableNumber} يحتاج مساعده`
          );
        }
      } else {
        // Update the existing active order with the help request
        const updatedOrderData = {
          help: "Requests assistance",
          helpStatus: "Not send",
        };
        const updatedOrder = await axios.put(
          `${apiUrl}/api/order/${lastTableOrder._id}`,
          updatedOrderData
        );
        if (updatedOrder) {
          toast.info("تم طلب الويتر للمساعدة");
          cashierSocket.emit(
            "helprequest",
            `طاوله رقم ${table.tableNumber} يحتاج مساعده`
          );
        }
      }
    } catch (error) {
      // Log and display an error toast message
      console.error(error);
      toast.error("An error occurred while requesting assistance.");
    }
  };

  return (
    <main className="main-home" id="main">
      <div className="main-container">
        <div className="content">
          {userLoginInfo && userLoginInfo.userinfo && table ? (
            <p className="main-title">
              مرحبا {userLoginInfo.userinfo?.username} <br />
              علي طاولة {table.tableNumber} <br /> في
            </p>
          ) : userLoginInfo && userLoginInfo.userinfo ? (
            <p className="main-title">
              مرحبا {userLoginInfo.userinfo?.username} <br /> في
            </p>
          ) : table ? (
            <p className="main-title">
              مرحبا ضيوف طاولة {table.tableNumber} <br /> في
            </p>
          ) : (
            <p className="main-title">
              مرحبا بكم <br /> في
            </p>
          )}
          <p className="main-text">
            {" "}
            {brandInfo.name} <br /> {brandInfo.description}
          </p>
          <ul className="main-btn d-flex align-items-center justify-content-evenly">
            {table ? (
              <>
                <li
                  className="main-li"
                  onClick={() => askingForHelp(table._id)}
                >
                  طلب الويتر
                </li>
                <li className="main-li">
                  <a href="#menu">المنيو</a>
                </li>
              </>
            ) : (
              <li className="main-li mrl-auto">
                <a href="#menu">المنيو</a>
              </li>
            )}
          </ul>
        </div>
      </div>
    </main>
  );
};

export default Home;
