import React, { useState, useEffect, useRef, useContext } from "react";
import { dataContext } from "../../../../App";
// import './Waiter.css'
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";

const Waiter = () => {
  const {
    employeeLoginInfo,
    isRefresh,
    formatTime,
    formatDate,
    setIsRefresh,
    cashierSocket,
    kitchenSocket,
    BarSocket,
    GrillSocket,
    waiterSocket,
    apiUrl,
    handleGetTokenAndConfig,
  } = useContext(dataContext);

  // Refs for buttons
  const start = useRef();
  const ready = useRef();

  // State for pending orders and payments
  const [ActivePreparationTickets, setActivePreparationTickets] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);

  // Function to fetch pending orders and payments
  const fetchActivePreparationTickets = async () => {
    const config = await handleGetTokenAndConfig();
    try {
      const res = await axios.get(
        apiUrl + "/api/preparationticket/activepreparationtickets",
        config
      );
      const filterWaiterTickets = res.data.data?.filter(
        (Ticket) =>
          Ticket.waiter?._id === employeeLoginInfo.id &&
          (Ticket.preparationStatus === "Prepared" ||
            Ticket.preparationStatus === "On the way")
      );
      console.log({
        activepreparationtickets: res.data.data,
        filterWaiterTickets,
      });
      setActivePreparationTickets(filterWaiterTickets);
      // setPendingPayments(recentPaymentStatus);
    } catch (error) {}
  };

  // State for Dine-in orders
  // const [Dine-inOrders, setDine-inOrders] = useState([]);

  // // Function to fetch Dine-in orders
  // const fetchDine-inOrders = async () => {
  //   try {
  // const config = await handleGetTokenAndConfig();

  //     const res = await axios.get(apiUrl + "/api/preparationticket/limit/50", config);

  //     const filterMyOrder = res.data?.filter(
  //       (order) => order.waiter?._id === employeeLoginInfo.id
  //     );

  //     const activeOrders = filterMyOrder.filter(
  //       (order) => order.isActive === true
  //     );
  //     const Dine-inOrdersData = activeOrders.filter(
  //       (order) => order.orderType === "Dine-in"
  //     );

  //
  //     const products =
  //       Dine-inOrdersData.length > 0
  //         ? Dine-inOrdersData.flatMap((order) => order.products)
  //         : [];
  //
  //     const productsFiltered =
  //       products.length > 0
  //         ? products.filter(
  //             (product) =>
  //               product.isDone === true && product.isDeleverd === false
  //           )
  //         : [];

  //

  //     if (productsFiltered.length > 0) {
  //       setDine-inOrders(Dine-inOrdersData);
  //     }
  //   } catch (error) {
  //
  //   }
  // };

  const updateOrderOnWay = async (id) => {
    try {
      const config = await handleGetTokenAndConfig();
      const preparationStatus = "On the way";
      try {
        await axios.put(
          `${apiUrl}/api/preparationticket/${id}`,
          { preparationStatus },
          config
        );
      } catch (error) {
        console.error(`Error updating preparation status`, error);
      }

      // fetchDine-inOrders();
      fetchActivePreparationTickets();
      toast.success("تم تاكيد استلام الاوردر!");
    } catch (error) {
      toast.error("حدث خطا اثناء قبول الاوردر!");
    }
  };

  const updateOrderDelivered = async (ticketId) => {
    try {
      const config = await handleGetTokenAndConfig();

      const fetchPreparationTicketData = await axios.get(
        `${apiUrl}/api/preparationticket/${ticketId}`,
        config
      );
      const preparationticketData = fetchPreparationTicketData.data.data;
      const { products: ticketProducts } = preparationticketData;
      const orderType = preparationticketData.order?.orderType;
      const orderId = await preparationticketData?.order._id;
      const orderProducts = preparationticketData.order?.products;

      const updatedOrderProducts = orderProducts.map((product) =>
        ticketProducts.some(
          (ticketProduct) =>
            ticketProduct.productId?._id === product.productId?._id
        )
          ? { ...product, isDeleverd: true }
          : product
      );
      const updateOrder = await axios.put(
        `${apiUrl}/api/order/${orderId}`,
        {
          products: updatedOrderProducts,
        },
        config
      );
      const preparationStatus = "Delivered";
      const isDelivered = true;
      const updateTicket = await axios.put(
        `${apiUrl}/api/preparationticket/${ticketId}`,
        {
          preparationStatus,
          isDelivered,
        },
        config
      );
      if (updateOrder.status === 200) {
        // fetchDine-inOrders();
        fetchActivePreparationTickets();
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
        `${apiUrl}/api/preparationticket/${id}`,
        { helpStatus },
        config
      );
      if (res.status === 200) {
        // fetchDine-inOrders();
        fetchActivePreparationTickets();
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
      await axios.put(
        `${apiUrl}/api/preparationticket/${id}`,
        { helpStatus },
        config
      );
      fetchActivePreparationTickets();
      // fetchDine-inOrders();
      toast.success("تم تاكيد تقديم المساعده!");
    } catch (error) {
      toast.error("حدث خطا اثناء تاكيد تقديم المساعدع!");
    }
  };

  const waitingTime = (t) => {
    const t1 = new Date(t).getTime();
    const t2 = new Date().getTime();
    const elapsedTime = t2 - t1;

    const minutesPassed = Math.floor(elapsedTime / (1000 * 60));
    return minutesPassed;
  };

  // Fetch initial data on component mount
  useEffect(() => {
    fetchActivePreparationTickets();
    // fetchDine-inOrders();
  }, []);
  useEffect(() => {
    fetchActivePreparationTickets();
    // fetchDine-inOrders();
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

      {ActivePreparationTickets &&
        ActivePreparationTickets.map((Ticket, i) => {
          {
            return (
              <div
                className="col-lg-3 col-md-4 col-sm-6 col-12 mb-4 ml-2 card text-white bg-success p-0 m-0"
                key={i}
              >
                <div
                  className="card-body text-right d-flex justify-content-between p-0 m-1"
                  style={{ fontSize: "14px", fontWeight: "500" }}
                >
                  <div className="col-6 p-0">
                    <p className="card-text">
                      {" "}
                      {Ticket.table != null
                        ? `طاولة: ${Ticket.table?.tableNumber}`
                        : Ticket.user
                        ? `العميل: ${Ticket.user?.username}`
                        : ""}
                    </p>
                    <p className="card-text">
                      رقم الطلب:{" "}
                      {Ticket.order?.TicketNum ? Ticket.order?.TicketNum : ""}
                    </p>
                    <p className="card-text">
                      الفاتورة: {Ticket.order?.serial}
                    </p>
                    <p className="card-text">
                      نوع الطلب: {Ticket.order?.orderType}
                    </p>
                    <p className="card-text">
                      القسم: {Ticket.department?.name}
                    </p>
                  </div>

                  <div className="col-6 p-0">
                    {Ticket.waiter ? (
                      <p className="card-text">
                        الويتر: {Ticket.waiter && Ticket.waiter?.username}
                      </p>
                    ) : (
                      ""
                    )}
                    <p className="card-text">
                      الاستلام: {formatTime(Ticket.createdAt)}
                    </p>
                    <p className="card-text">
                      الانتظار:{" "}
                      {setTimeout(() => waitingTime(Ticket.updateAt), 60000)}{" "}
                      دقيقه
                    </p>
                  </div>
                </div>
                <ul className="list-group list-group-flush">
                  {Ticket.products.map((product, i) => {
                    return (
                      <>
                        <li
                          className="list-group-item d-flex flex-column justify-content-between align-items-center p-1"
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
                          <div className="d-flex justify-content-between align-items-center w-100 p-1">
                            <p
                              style={{
                                fontSize: "1.2em",
                                fontWeight: "bold",
                              }}
                            >
                              {i + 1}- {product.name}{" "}
                              {product.size ? product.size : ""}
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
                                  className="list-group-item d-flex flex-column justify-content-between align-items-center p-1"
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
                                  <div className="d-flex justify-content-between align-items-center w-100 p-1">
                                    {extra.extraDetails.map((detail) => (
                                      <p
                                        className="badge badge-secondary m-1"
                                        key={detail.extraid}
                                      >{`${detail.name}`}</p>
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
                <div className="text-center w-100 d-flex flex-row">
                  {Ticket.preparationStatus === "Prepared" ? (
                    <button
                      className="btn w-100 btn-warning h-100 btn btn-lg"
                      onClick={() => {
                        updateOrderOnWay(Ticket._id);
                      }}
                    >
                      جاري الاستلام
                    </button>
                  ) : Ticket.preparationStatus === "On the way" ? (
                    <button
                      className="btn w-100 btn-primary h-100 btn btn-lg"
                      onClick={() => updateOrderDelivered(Ticket._id)}
                    >
                      تم التوصيل
                    </button>
                  ) : (
                    ""
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
