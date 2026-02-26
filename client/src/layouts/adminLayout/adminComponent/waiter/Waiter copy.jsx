import React, { useState, useEffect, useRef, useContext } from "react";
import { dataContext } from "../../../../App";
// import './Waiter.css'
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";

const Waiter = () => {
  const {
    employeeLoginInfo,
    isRefresh,
    setIsRefresh,
    cashierSocket,
    kitchenSocket,
    BarSocket,
    GrillSocket,
    waiterSocket,
    handleGetTokenAndConfig,
    apiUrl,
  } = useContext(dataContext);

  // Refs for buttons
  const start = useRef();
  const ready = useRef();

  // State for pending orders and payments
  const [pendingOrders, setPendingOrders] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);

  // Function to fetch pending orders and payments
  const fetchPendingData = async () => {
    try {
      const config = await handleGetTokenAndConfig();
      const res = await axios.get(apiUrl + "/api/order/limit/50", config);
      const filterMyOrder = res.data?.filter(
        (order) => order.waiter?._id === employeeLoginInfo.id
      );
      if (filterMyOrder.length > 0) {
        const recentStatus = filterMyOrder.filter(
          (order) => order.status === "Pending"
        );

        const recentPaymentStatus = filterMyOrder.filter(
          (order) => order.payment_status === "Pending"
        );
        setPendingOrders(recentStatus);
        setPendingPayments(recentPaymentStatus);
      }
    } catch (error) {}
  };

  // State for Dine-in orders
  const [Dine-inOrders, setDine-inOrders] = useState([]);

  // Function to fetch Dine-in orders
  const fetchDine-inOrders = async () => {
    try {
      const config = await handleGetTokenAndConfig();
      const res = await axios.get(apiUrl + "/api/order/limit/50", config);

      const filterMyOrder = res.data?.filter(
        (order) => order.waiter?._id === employeeLoginInfo.id
      );

      const activeOrders = filterMyOrder.filter(
        (order) => order.isActive === true
      );
      const Dine-inOrdersData = activeOrders.filter(
        (order) => order.orderType === "Dine-in"
      );

      const products =
        Dine-inOrdersData.length > 0
          ? Dine-inOrdersData.flatMap((order) => order.products)
          : [];

      const productsFiltered =
        products.length > 0
          ? products.filter(
              (product) =>
                product.isDone === true && product.isDeleverd === false
            )
          : [];

      if (productsFiltered.length > 0) {
        setDine-inOrders(Dine-inOrdersData);
      }
    } catch (error) {}
  };

  const updateOrderOnWay = async (id, products) => {
    try {
      const config = await handleGetTokenAndConfig();
      const department = [];
      products.forEach((product) => {
        const section = product.productId?.department;
        if (section) department.push(section);
      });

      for (const section of department) {
        const preparationStatus = {
          [`preparationStatus.${section}`]: "On the way",
        };
        try {
          await axios.put(
            `${apiUrl}/api/order/${id}`,
            preparationStatus,
            config
          );
        } catch (error) {
          console.error(
            `Error updating preparation status for section ${section}:`,
            error
          );
        }
      }

      fetchDine-inOrders();
      fetchPendingData();
      toast.success("تم تاكيد استلام الاوردر!");
    } catch (error) {
      toast.error("حدث خطا اثناء قبول الاوردر!");
    }
  };

  const updateOrderDelivered = async (id, products) => {
    try {
      products.map((prod) => ({
        ...prod,
        isDeleverd: true,
      }));

      const status = "Delivered";
      const updateOrder = await axios.put(
        `${apiUrl}/api/order/${id}`,
        {
          status,
          products,
        },
        config
      );
      const department = [];
      products.forEach((product) => {
        const section = product.productId?.department;
        if (section) department.push(section);
      });

      for (const section of department) {
        const preparationStatus = {
          [`preparationStatus.${section}`]: "On the way",
        };
        try {
          await axios.put(
            `${apiUrl}/api/order/${id}`,
            preparationStatus,
            config
          );
        } catch (error) {
          console.error(
            `Error updating preparation status for section ${section}:`,
            error
          );
        }
      }
      if (updateOrder.status === 200) {
        fetchDine-inOrders();
        fetchPendingData();
        toast.success("تم تاكيد توصيل الاوردر!");
      }
    } catch (error) {
      toast.error("حدث خطا اثناء تاكيد توصيل الاوردر!");
    }
  };

  const helpOnWay = async (id) => {
    try {
      const config = await handleGetTokenAndConfig();
      const helpStatus = "On the way";
      const res = await axios.put(
        `${apiUrl}/api/order/${id}`,
        { helpStatus },
        config
      );
      if (res.status === 200) {
        fetchDine-inOrders();
        fetchPendingData();
        toast.success("تم تاكيد الاتجاه لتقديم المساعده!");
      }
    } catch (error) {
      toast.error("حدث خطاء اثناء تاكيد الاتجاه للعميل!");
    }
  };

  const helpDone = async (id) => {
    try {
      const config = await handleGetTokenAndConfig();
      const helpStatus = "Assistance done";
      await axios.put(`${apiUrl}/api/order/${id}`, { helpStatus }, config);
      fetchPendingData();
      fetchDine-inOrders();
      toast.success("تم تاكيد تقديم المساعده!");
    } catch (error) {
      toast.error("حدث خطا اثناء تاكيد تقديم المساعدع!");
    }
  };

  // Fetch initial data on component mount
  useEffect(() => {
    fetchPendingData();
    fetchDine-inOrders();
  }, []);
  useEffect(() => {
    fetchPendingData();
    fetchDine-inOrders();
  }, [isRefresh]);

  return (
    <div className="container-fluid d-flex flex-wrap align-content-start justify-content-around align-items-start h-100 overflow-auto bg-transparent py-5 px-3">
      {pendingPayments &&
        pendingPayments
          .filter(
            (order) =>
              order.helpStatus === "Send waiter" ||
              order.helpStatus === "On the way"
          )
          .map((order, i) => {
            return (
              <div
                className="card text-white bg-success"
                style={{ width: "260px" }}
              >
                <div
                  className="card-body text-right d-flex justify-content-between p-0 m-1"
                  style={{ fontSize: "14px", fontWeight: "500" }}
                >
                  <div className="col-6 p-0">
                    <p className="card-text">
                      الطاولة: {order.table?.tableNumber}
                    </p>
                    <p className="card-text">رقم الفاتورة: {order.serial}</p>
                  </div>
                  <div className="col-6 p-0">
                    <p className="card-text">
                      الويتر: {order.waiter?.username}
                    </p>
                    <p className="card-text">
                      التنفيذ:{" "}
                      {new Date(order.updatedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="card-text">
                      الاستلام:{" "}
                      {new Date(order.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <ul className="list-group list-group-flush">
                  <li
                    className="list-group-item bg-light text-dark d-flex justify-content-between align-items-center"
                    key={i}
                  >
                    <span style={{ fontSize: "18px" }}>
                      طاولة : {order.table?.tableNumber}
                    </span>
                    <span
                      className="badge bg-secondary rounded-pill"
                      style={{ fontSize: "16px" }}
                    >
                      {order.help === "Requests assistance"
                        ? "يحتاج المساعدة"
                        : order.help === "Requests bill"
                        ? "يطلب الحساب"
                        : ""}
                    </span>
                  </li>
                </ul>
                <div className="card-footer text-center">
                  {order.helpStatus === "On the way" ? (
                    <button
                      className="btn w-100 btn-success h-100 btn btn-lg"
                      onClick={() => helpDone(order._id)}
                    >
                      تم
                    </button>
                  ) : (
                    <button
                      className="btn w-100 btn-warning h-100 btn btn-lg"
                      onClick={() => {
                        helpOnWay(order._id);
                      }}
                    >
                      متجة للعميل
                    </button>
                  )}
                </div>
              </div>
            );
          })}

      {Dine-inOrders &&
        Dine-inOrders.map((order, i) => {
          if (
            order.products.filter(
              (pr) => pr.isDone === true && pr.isDeleverd === false
            ).length > 0
          ) {
            return (
              <div
                className="card text-white bg-success"
                style={{ width: "260px" }}
              >
                <div
                  className="card-body text-right d-flex justify-content-between p-0 m-1"
                  style={{ fontSize: "14px", fontWeight: "500" }}
                >
                  <div className="col-6 p-0">
                    <p className="card-text">
                      الطاولة: {order.table?.tableNumber}
                    </p>
                    <p className="card-text">رقم الفاتورة: {order.serial}</p>
                    <p className="card-text">نوع الطلب: {order.orderType}</p>
                  </div>
                  <div className="col-6 p-0">
                    <p className="card-text">
                      الويتر: {order.waiter?.username}
                    </p>
                    <p className="card-text">
                      التنفيذ:{" "}
                      {new Date(order.updatedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="card-text">
                      الاستلام:{" "}
                      {new Date(order.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <ul className="list-group list-group-flush">
                  {order.products
                    .filter(
                      (pr) => pr.isDone === true && pr.isDeleverd === false
                    )
                    .map((product, i) => {
                      return (
                        <>
                          <li
                            className="list-group-item d-flex flex-column justify-content-between align-items-center"
                            key={i}
                            style={
                              product.isAdd
                                ? {
                                    backgroundColor: "red",
                                    color: "white",
                                  }
                                : { color: "black" }
                            }
                          >
                            <div className="d-flex justify-content-between align-items-center w-100">
                              <p
                                style={{
                                  fontSize: "1.2em",
                                  fontWeight: "bold",
                                }}
                              >
                                {i + 1}- {product.name}
                              </p>
                              <span
                                style={{
                                  fontSize: "1.2em",
                                  fontWeight: "bold",
                                }}
                              >
                                {" "}
                                × {product.quantity}
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: "1.2em",
                                fontWeight: "bold",
                              }}
                            >
                              {product.notes}
                            </div>
                          </li>
                          {product.extras &&
                            product.extras.length > 0 &&
                            product.extras.map((extra, j) => {
                              if (extra && extra.isDone === false) {
                                return (
                                  <li
                                    className="list-group-item d-flex flex-column justify-content-between align-items-center"
                                    key={`${i}-${j}`}
                                    style={
                                      product.isAdd
                                        ? {
                                            backgroundColor: "red",
                                            color: "white",
                                          }
                                        : { color: "black" }
                                    }
                                  >
                                    <div className="d-flex justify-content-between align-items-center w-100">
                                      {extra.extraDetails.map((detail) => (
                                        <p
                                          className="badge badge-secondary m-1"
                                          key={detail.extraid}
                                        >
                                          {`${detail.name}`}
                                        </p>
                                      ))}
                                    </div>
                                  </li>
                                );
                              } else {
                                return null;
                              }
                            })}
                        </>
                      );
                    })}
                </ul>
                <div className="card-footer text-center">
                  {order.preparationStatus === "Prepared" ||
                  order.preparationStatus.Grill === "Prepared" ? (
                    <button
                      className="btn w-100 btn-warning h-100 btn btn-lg"
                      onClick={() => {
                        updateOrderOnWay(
                          order._id,
                          order.products.filter(
                            (pr) =>
                              pr.isDone === true && pr.isDeleverd === false
                          )
                        );
                      }}
                    >
                      استلام الطلب
                    </button>
                  ) : (
                    <button
                      className="btn w-100 btn-success h-100 btn btn-lg"
                      onClick={() => {
                        updateOrderDelivered(
                          order._id,
                          order.products.filter(
                            (pr) =>
                              pr.isDone === true && pr.isDeleverd === false
                          )
                        );
                      }}
                    >
                      تم التسليم
                    </button>
                  )}
                </div>
              </div>
            );
          }
        })}
    </div>
  );
};

export default Waiter;
