import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../../../../context/appContext";
import axios from "axios";
import { toast } from "react-toastify";
import { useReactToPrint } from "react-to-print";
import InvoiceComponent from "./invoice/invoice";

const DeliveryMan = () => {
  const {
    brandInfo,
    permissionsList,
    setStartDate,
    setEndDate,
    filterByDateRange,
    filterByTime,
    employeeLoginInfo,
    formatDate,
    formatDateTime,
    setIsLoading,
    EditPagination,
    startPagination,
    endPagination,
    setStartPagination,
    setEndPagination,
    apiUrl,
    handleGetTokenAndConfig,
  } = useContext(AppContext);

  // // State for pending orders and payments
  // const [pendingOrders, setPendingOrders] = useState([]);
  // const [pendingPayments, setPendingPayments] = useState([]);

  // // Function to fetch pending orders and payments
  // const fetchPendingData = async () => {
  //   try{
  // const config = await handleGetTokenAndConfig();
  //     const res = await axios.get(apiUrl+'/api/order');
  //     const recentStatus = res.data.filter((order) => order.status === 'Pending');
  //     const recentPaymentStatus = res.data.filter((order) => order.payment_status === 'Pending');
  //     setPendingOrders(recentStatus);
  //     setPendingPayments(recentPaymentStatus);
  //   } catch (error) {
  //
  //   }
  // };

  // State for Dine-in orders

  // Function to fetch Dine-in orders
  const [deliveryOrders, setDeliveryOrders] = useState([]);

  const fetchDeliveryOrders = async () => {
    try {
      const config = await handleGetTokenAndConfig();
      const orders = await axios.get(apiUrl + "/api/order", config);
      const activeOrders = orders.data.filter(
        (order) => order.isActive === true && order.orderType === "Delivery"
      );
      const deliveryOrdersData = activeOrders.filter(
        (order) => order.status === "Prepared" || order.status === "On the way"
      );

      setDeliveryOrders(activeOrders);
    } catch (error) {}
  };

  const updateOrderOnWay = async (e, id) => {
    e.preventDefault();
    const config = await handleGetTokenAndConfig();
    try {
      const status = "On the way";
      const response = await axios.get(`${apiUrl}/api/order/${id}`, config);
      const orderData = response.data;

      if (orderData.deliveryMan._id !== employeeLoginInfo.id) {
        toast.warn("لا يمكنك تغير حاله الاوردر ");
        return;
      }

      const updateOrder = await axios.put(
        `${apiUrl}/api/order/${id}`,
        { status },
        config
      );
      if (updateOrder) {
        fetchDeliveryOrders();
        //  fetchPendingData();
        toast.success("Order is on the way!");
      }
    } catch (error) {
      toast.error("Error updating order status!");
    }
  };

  const updateOrderDelivered = async (e, id) => {
    e.preventDefault();
    try {
      const config = await handleGetTokenAndConfig();
      const response = await axios.get(`${apiUrl}/api/order/${id}`, config);
      const orderData = response.data;
      if (orderData.deliveryMan._id !== employeeLoginInfo.id) {
        toast.warn("لا يمكنك تغير حاله الاوردر ");
        return;
      }
      const products = orderData.products.map((prod) => ({
        ...prod,
        isDeleverd: true,
      }));
      const status = "Delivered";
      const updateOrder = await axios.put(
        `${apiUrl}/api/order/${id}`,
        { products, status },
        config
      );
      if (updateOrder) {
        fetchDeliveryOrders();
        toast.success("تم توصيل الاوردر!");
      }
      //  fetchPendingData();
    } catch (error) {
      toast.error("Error delivering order!");
    }
  };

  const [showModal, setShowModal] = useState(false);

  const [orderdata, setorderdata] = useState({});

  // Fetch orders from API
  const getOrderDetalis = async (id) => {
    try {
      const config = await handleGetTokenAndConfig();
      const res = await axios.get(apiUrl + "/api/order/" + id, config);
      const order = res.data;
      if (order) {
        setorderdata(order);
        setShowModal(!showModal);
      }
    } catch (error) {
      // Display toast or handle error
    }
  };

  // Fetch initial data on component mount
  useEffect(() => {
    //  fetchPendingData();
    fetchDeliveryOrders();
  }, []);

  return (
    <div className="container-fluid d-flex flex-wrap align-content-start justify-content-around align-items-start h-100 overflow-auto bg-transparent py-5 px-3">
      {deliveryOrders &&
        deliveryOrders.map((order, i) => {
          // const undeliveredProducts = order.products.filter(pr => !pr.isDeleverd);

          // if (undeliveredProducts.length > 0) {
          const {
            name,
            serial,
            address,
            phone,
            deliveryMan,
            createdAt,
            updatedAt,
            _id: id,
            status,
            user,
            total,
            products,
          } = order;

          return (
            <div
              className="card text-white bg-success col-12 col-md-4 mb-2 p-1"
              key={i}
            >
              <div className="card-body d-flex flex-wrap text-right d-flex justify-content-between p-1 m-1 border rounded">
                <p className="card-text w-100 mb-1">
                  <strong>رقم الفاتورة:</strong>
                  <a
                    href="#invoiceOrderModal"
                    className="h-100 btn btn-primary btn-sm"
                    data-toggle="modal"
                    onClick={() => getOrderDetalis(id)}
                  >
                    {serial}{" "}
                  </a>
                </p>
                <p className="card-text w-100 mb-1">
                  <strong>الطيار:</strong> {deliveryMan?.username}
                </p>
                <p className="card-text w-100 mb-1">
                  <strong>العميل:</strong> {user ? user.username : name}
                </p>
                <p className="card-text w-100 mb-1">
                  <strong>الموبايل:</strong> {phone}
                </p>
                <p className="card-text w-100 mb-1">
                  <strong>العنوان:</strong> {address}
                </p>
              </div>
              <ul className="list-group list-group-flush text-right">
                {products.length > 0
                  ? products.map((product, j) => (
                      <React.Fragment key={j}>
                        <li
                          className={`list-group-item ${
                            product.isAdd ? "bg-danger text-white" : "text-dark"
                          } d-flex flex-column justify-content-between align-items-center`}
                        >
                          <div className="d-flex justify-content-between align-items-center w-100">
                            <p
                              className="mb-1"
                              style={{ fontSize: "1.2em", fontWeight: "bold" }}
                            >
                              {j + 1}- {product.name}{" "}
                              {product.size ? `- ${product.size}` : ""}
                            </p>
                            <span
                              className="mb-1"
                              style={{ fontSize: "1.2em", fontWeight: "bold" }}
                            >
                              × {product.quantity}
                            </span>
                          </div>
                          <div
                            className="w-100"
                            style={{ fontSize: "1.2em", fontWeight: "bold" }}
                          >
                            {product.notes}
                          </div>
                          {product.extras &&
                            product.extras.length > 0 &&
                            product.extras.map((extra, k) => {
                              if (extra && extra.isDone === false) {
                                return (
                                  <div
                                    key={k}
                                    className="d-flex justify-content-start align-items-center mt-2"
                                  >
                                    {extra.extraDetails.map((detail) => (
                                      <span
                                        className="badge badge-secondary m-1"
                                        key={detail.extraid}
                                      >
                                        {detail.name}
                                      </span>
                                    ))}
                                  </div>
                                );
                              } else {
                                return null;
                              }
                            })}
                        </li>
                      </React.Fragment>
                    ))
                  : ""}
              </ul>
              <div className="card-footer text-center text-dark">
                <p
                  className="mb-2 text-light"
                  style={{ fontSize: "20px", fontWeight: "900" }}
                >
                  الإجمالي: {total} ج
                </p>
                {status === "Prepared" ? (
                  <button
                    className="btn w-100 btn-primary btn-lg"
                    onClick={() => {
                      updateOrderOnWay(id);
                    }}
                  >
                    استلام الطلب
                  </button>
                ) : (
                  <button
                    className="btn w-100 btn-warning btn-lg"
                    onClick={() => {
                      updateOrderDelivered(id);
                    }}
                  >
                    تم التسليم
                  </button>
                )}
              </div>
            </div>
          );
        })}

      <InvoiceComponent
        ModalId="invoiceOrderModal"
        orderData={orderdata}
        showModal={showModal}
        setShowModal={setShowModal}
      />
    </div>
  );
};

export   default DeliveryMan;
