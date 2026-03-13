import React, { useState, useEffect, useRef, useContext } from "react";
import { AppContext } from "../../../../context/appContext";
import axios from "axios";
import io from "socket.io-client";
import { toast } from "react-toastify";
import { useReactToPrint } from "react-to-print";
import InvoiceComponent from "../invoice/invoice";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarCheck,
  faClock,
  faMoneyBill,
  faDollarSign,
  faCashRegister,
  faBan,
} from "@fortawesome/free-solid-svg-icons";

import "bootstrap/dist/css/bootstrap.min.css";

const ManagerDash = () => {
  const {
    brandInfo,
    employeeLoginInfo,
    formatDate,
    setIsLoading,
    EditPagination,
    startPagination,
    endPagination,
    setStartPagination,
    setEndPagination,
    isRefresh,
    setIsRefresh,
    cashierSocket,
    kitchenSocket,
    BarSocket,
    GrillSocket,
    waiterSocket,
    apiUrl,
    handleGetTokenAndConfig,
  } = useContext(AppContext);

  const [showModal, setShowModal] = useState(false);

  // State initialization
  const [listOrderShow, setlistOrderShow] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [orderShift, setorderShift] = useState([]);
  const [pendingOrder, setPendingOrder] = useState([]);
  const [pendingPayment, setPendingPayment] = useState([]);
  const [listDayOrder, setListDayOrder] = useState([]);
  const [cancelledOrders, setCancelledOrders] = useState([]);
  const [totalDaySales, setTotalDaySales] = useState(0);

  // Helper function to get today's date as a string

  const fetchOrdersData = async () => {
    try {
      const config = await handleGetTokenAndConfig();

      // Fetch orders from API
      const res = await axios.get(apiUrl + "/api/order", config);
      const orders = res.data.reverse();

      // Update all orders state
      setAllOrders(orders);

      // Filter pending orders
      const pendingOrders = orders.filter(
        (order) => order.status === "Pending"
      );
      setPendingOrder(pendingOrders);

      // Filter pending payments (excluding cancelled orders)
      const pendingPayments = orders.filter(
        (order) =>
          order.payment_status === "Pending" && order.status !== "Cancelled"
      );
      setPendingPayment(pendingPayments);
      setlistOrderShow(pendingPayments);
      // Filter today's orders
      const today = new Date().toDateString();
      const dayOrders = orders.filter(
        (order) => new Date(order.createdAt).toDateString() === today
      );
      setListDayOrder(dayOrders);

      // Calculate total sales for paid orders of today
      const paidDayOrders = dayOrders.filter(
        (order) => order.payment_status === "Paid"
      );
      const calctotalDaySales = paidDayOrders.reduce(
        (total, order) => total + order.total,
        0
      );
      setTotalDaySales(calctotalDaySales);

      // Filter cancelled orders and update state
      const cancelledOrders = dayOrders.filter(
        (order) => order.status === "Cancelled"
      );
      setCancelledOrders(cancelledOrders);

      const shiftId = employeeLoginInfo.shift;
      if (shiftId) {
        const shiftData = await axios.get(
          `${apiUrl}/api/shift/${shiftId}`,
          config
        );
        const todayDate = new Date().toISOString().split("T")[0];

        const startTime = new Date(
          `${todayDate}T${shiftData.data.startTime}:00Z`
        ).getTime();
        const endTime = new Date(
          `${todayDate}T${shiftData.data.endTime}:00Z`
        ).getTime();

        const shiftOrders = dayOrders.filter((order) => {
          const orderTime = new Date(order.createdAt).getTime();
          return orderTime >= startTime && orderTime <= endTime;
        });
        setorderShift(shiftOrders);
      } else {
        toast.warn(
          "لا يمكن تحديد اوردرات الشيف لان هذا المستخدم ليس له شيفت محدد"
        );
      }
    } catch (error) {
      // Handle and log error
      console.error("Error fetching orders data:", error.message);
    }
  };

  useEffect(() => {
    fetchOrdersData();
  }, [isRefresh]);

  const orderTypeEN = ["Dine-in", "Delivery", "Takeaway"];
  const orderTypeAR = ["داخلي", "ديليفري", "تيك اوي"];

  const statusEN = ["Pending", "Approved", "Cancelled"];
  const statusAR = ["انتظار", "موافق", "ملغي"];
  const allStatusEN = [
    "Pending",
    "Approved",
    "Preparing",
    "Prepared",
    "On the way",
    "Delivered",
    "Cancelled",
  ];
  const allStatusAR = [
    "انتظار",
    "موافق",
    "قيد التحضير",
    "تم التحضير",
    "في الطريق",
    "تم التسليم",
    "ملغي",
  ];
  // const department = ["Kitchen", "Bar", "Grill"]
  const [update, setupdate] = useState(false);

  const [alldepartments, setAlldepartments] = useState([]);

  const getAlldepartments = async () => {
    const config = await handleGetTokenAndConfig();

    try {
      const res = await axios.get(`${apiUrl}/api/department`, config);
      if (res.status === 200) {
        const departments = res.data.data;

        setAlldepartments(departments);
      } else {
        throw new Error("Failed to fetch data");
      }
    } catch (error) {
      console.error("حدث خطأ أثناء استلام البيانات:", error);
      toast.error("حدث خطأ أثناء جلب البيانات، يرجى المحاولة مرة أخرى لاحقًا.");
    }
  };

  // const changeOrderStatus = async (event, orderId, orderProducts) => {
  //   const config = await handleGetTokenAndConfig();

  //   const cashier = employeeLoginInfo.id; // Get cashier ID
  //   const status = event.target.value; // New order status
  //   const isActive = status !== "Cancelled"; // Set active state based on status

  //   // Mark all products as sent
  //   const updatedProducts = orderProducts.map((product) => ({
  //     ...product,
  //     isSend: true,
  //   }));

  //

  //   // Prepare the payload for updating the order
  //   const payload = { status, isActive, cashier };
  //   if (status !== "Cancelled") {
  //     payload.products = updatedProducts;
  //   }

  //   try {
  //     // Update the order status via API
  //     const response = await axios.put(`${apiUrl}/api/order/${orderId}`, payload, config);

  //     if (response) {
  //       // Handle order cancellation scenario
  //       if (status === "Cancelled") {
  //         toast.success("تم تغيير حالة الطلب بنجاح");
  //         return;
  //       }

  //       // Handle other statuses (e.g., Approved)
  //       if (department?.length > 0) {
  //         department.forEach((section) => {
  //           const sectionProducts = orderProducts.filter(
  //             (product) =>
  //               product.productId?.department === section && !product.isSend
  //           );

  //           if (sectionProducts.length > 0) {
  //             axios
  //               .post(
  //                 `${apiUrl}/api/preparationticket`,
  //                 {
  //                   order: orderId,
  //                   department: section,
  //                   products: sectionProducts.map((product) => ({
  //                     ...product,
  //                     orderproductId: product._id,
  //                   })),
  //                 },
  //                 config
  //               )
  //               .then((response) => {
  //                 console.log({
  //                   sectionProducts,
  //                   createTicket: response,
  //                   createTicketData: response.data,
  //                 });
  //               })
  //               .catch((error) => {
  //                 console.error("Error creating ticket:", error);
  //               });
  //           }
  //         });
  //       }

  //       // Refresh order data and notify the user
  //       fetchOrdersData();
  //       toast.success("تم تغيير حالة الطلب بنجاح");

  //       // Notify the kitchen for new orders
  //       if (status === "Approved") {
  //         kitchenSocket.emit("orderkitchen", "استلام أوردر جديد");
  //         setupdate(!update);
  //         setIsRefresh(!isRefresh);
  //       }
  //     }
  //   } catch (error) {
  //     console.error("خطأ في تغيير حالة الطلب:", error);
  //     toast.error("حدث خطأ أثناء تغيير حالة الطلب");
  //   }
  // };

  // const changeOrderStatus = async (e, orderId)  => {
  // const config = await handleGetTokenAndConfig();
  //     const status = e.target.value;
  //     const cashier= employeeLoginInfo.id
  //     const isActive = status === "Cancelled" ? false : true;

  //     if(status === "Cancelled"){
  //       try {
  //         const response = await axios.put(
  //           `${apiUrl}/api/order/${orderId}`,
  //           { status, isActive, cashier },
  //           config
  //         );
  //       } catch (error) {
  //           console.error("خطأ في تغيير حالة الطلب:", error);
  //           toast.error("حدث خطأ أثناء تغيير حالة الطلب");
  //         }
  //       }else{

  //         try {
  //           const getOrder = await axios.get(
  //             `${apiUrl}/api/order/${orderId}`,
  //             config
  //           );
  //           const orderProducts =await getOrder.data.products
  //
  //         const newProducts = await orderProducts.filter(product=>product.isSend === false)

  //         alldepartments &&
  //         alldepartments.map((section) => {
  //             const sectionProducts = [];
  //             newProducts &&
  //               newProducts.map((product) => {
  //                 if (product.productId?.department === section._id && product.isSend === false) {
  //                   sectionProducts.push({
  //                     ...product,
  //                     orderproductId:product._id
  //                   });
  //                 }
  //               });
  //             if (sectionProducts.length > 0) {
  //               axios
  //                 .post(
  //                   `${apiUrl}/api/preparationticket`,
  //                   {
  //                     order: orderId,
  //                     department: section,
  //                     products: sectionProducts,
  //                   },
  //                   config
  //                 )
  //                 .then((response) => {
  //                   console.log({
  //                     sectionProducts,
  //                     createTicket: response,
  //                     createTicketdata: response.data,
  //                   });
  //                 })
  //                 .catch((error) => {
  //                   console.error("Error creating ticket:", error);
  //                 });
  //             }
  //           });

  //           const updateproduct =await newProducts.map(product=>{
  //             return {...product, isSend:true}
  //           })
  //         const updateOrder = await axios.put(
  //           `${apiUrl}/api/order/${orderId}`,
  //           { status, isActive, cashier, products:updateproduct },
  //           config
  //         );
  //         fetchOrdersData();

  //         toast.success("تم تغيير حالة الطلب بنجاح");

  //         if (status === "Approved") {
  //           kitchenSocket.emit("orderkitchen", "استلام اوردر جديد");
  //           setupdate(!update);
  //           setIsRefresh(!isRefresh);
  //         }
  //     } catch (error) {
  //       console.error("خطأ في تغيير حالة الطلب:", error);
  //       toast.error("حدث خطأ أثناء تغيير حالة الطلب");
  //     }
  //     }
  // };

  const changeOrderStatus = async (e, orderId) => {
    try {
      // Check if the token is available
      const config = await handleGetTokenAndConfig();

      const status = e.target.value; // Get the new status from the event
      const cashier = employeeLoginInfo.id; // Current cashier ID
      const isActive = status !== "Cancelled"; // Determine if the order is active

      // If the order is canceled
      if (status === "Cancelled") {
        try {
          // Update the order status and set isActive to false
          await axios.put(
            `${apiUrl}/api/order/${orderId}`,
            { status, isActive, cashier },
            config
          );
          fetchOrdersData();
          toast.success("تم إلغاء الطلب بنجاح");
        } catch (error) {
          console.error("Error updating order status:", error);
          toast.error("حدث خطأ أثناء تغيير حالة الطلب");
        }
        return;
      }

      // For other statuses
      // Fetch the order details
      const getOrder = await axios.get(
        `${apiUrl}/api/order/${orderId}`,
        config
      );
      const orderProducts = getOrder.data.products; // Extract the products from the order

      // Filter products that are not yet sent to preparation
      const newProducts = orderProducts.filter((product) => !product.isSend);

      // Iterate over all preparation sections
      alldepartments &&
        alldepartments.forEach((section) => {
          const sectionProducts = [];

          // Filter products that belong to the current preparation section
          newProducts.forEach((product) => {
            if (
              product.productId?.department === section._id &&
              !product.isSend
            ) {
              sectionProducts.push({
                ...product,
                orderproductId: product._id, // Add orderproductId to the product
              });
            }
          });

          // Create a preparation ticket for the section if there are products
          if (sectionProducts.length > 0) {
            axios
              .post(
                `${apiUrl}/api/preparationticket`,
                {
                  order: orderId,
                  department: section,
                  products: sectionProducts,
                },
                config
              )
              .then((response) => {
                console.log({
                  sectionProducts,
                  createTicket: response,
                  createTicketData: response.data,
                });
              })
              .catch((error) => {
                console.error("Error creating ticket:", error);
              });
          }
        });

      // Update the isSend status for all products
      const updatedProducts = orderProducts.map((product) => ({
        ...product,
        isSend: true, // Mark the product as sent
      }));

      // Update the order with the new products and status
      await axios.put(
        `${apiUrl}/api/order/${orderId}`,
        { status, isActive, cashier, products: updatedProducts },
        config
      );

      fetchOrdersData();
      toast.success("تم تغيير حالة الطلب بنجاح");

      // Emit event to kitchen if status is "Approved"
      if (status === "Approved") {
        kitchenSocket.emit("orderkitchen", "استلام اوردر جديد");
        setupdate(!update);
        setIsRefresh(!isRefresh);
      }
    } catch (error) {
      // Log and show error messages
      console.error("Error updating order status:", error);
      toast.error("حدث خطأ أثناء تغيير حالة الطلب");
    }
  };

  const paymentstatus = ["Pending", "Paid"];
  const paymentstatusAr = ["انظار دفع", "دفع"];

  const [allWaiters, setAllWaiters] = useState([]);
  const [deliverymen, setDeliverymen] = useState([]);

  const fetchActiveEmployees = async () => {
    try {
      const config = await handleGetTokenAndConfig();
      const allEmployees = await axios.get(apiUrl + "/api/employee", config);
      const activeEmployees = allEmployees.data.filter(
        (employee) => employee.isActive === true
      );
      const allWaiters =
        activeEmployees.length > 0
          ? activeEmployees.filter((employee) => employee.role === "waiter")
          : [];
      if (allWaiters) {
        setAllWaiters(allWaiters);
      } else {
        toast.warning("لم يتم العثور على ويتر نشط الان.");
      }

      const alldeliverymens =
        activeEmployees.length > 0
          ? activeEmployees.filter(
              (employee) => employee.role === "deliveryman"
            )
          : [];
      if (alldeliverymens) {
        setDeliverymen(alldeliverymens);
      } else {
        // إذا لم يتم العثور على نوادل، قد يكون من الجيد إخطار المستخدم
        toast.warning("لم يتم العثور على مندوبي توصيل نشططين الان.");
      }
    } catch (error) {
      // معالجة الخطأ وعرض رسالة خطأ
      console.error("خطأ في جلب بيانات الموظفين:", error);
      toast.error("حدث خطأ أثناء جلب بيانات الموظفين.");
    }
  };

  const specifiedWaiter = async (id) => {
    try {
      const config = await handleGetTokenAndConfig();
      if (!allWaiters.length > 0) {
        toast.warn("لا يوجد ويتر نشط الان ");
        return "";
      }
      // البحث عن الطلب بالمعرف المحدد
      const getorder = allOrders.find((order) => order._id === id);
      if (!getorder) {
        throw new Error("Order not found");
      }

      // استخراج رقم القسم من بيانات الطاولة المرتبطة بالطلب
      const tablesectionNumber =
        getorder.table && getorder.table?.sectionNumber;
      if (!tablesectionNumber) {
        throw new Error("Table section number not found");
      }

      // البحث عن النوادل في القسم المحدد
      const sectionWaiters = allWaiters.filter(
        (waiter) => waiter.sectionNumber === tablesectionNumber
      );
      if (sectionWaiters.length === 0) {
        throw new Error("No waiters found in the specified section");
      }

      const OrderSection = allOrders
        .filter(
          (order) =>
            order.waiter && order.waiter.sectionNumber === tablesectionNumber
        )
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      let waiterId = "";

      if (OrderSection.length > 0) {
        const lastWaiterId = OrderSection[0]?.waiter?._id;
        const lastWaiterIndex = sectionWaiters.findIndex(
          (waiter) => waiter._id === lastWaiterId
        );
        //

        waiterId =
          lastWaiterIndex !== -1 && lastWaiterIndex < sectionWaiters.length - 1
            ? sectionWaiters[lastWaiterIndex + 1]._id
            : sectionWaiters[0]._id;
      } else {
        waiterId = sectionWaiters[0]._id;
      }

      return waiterId;
    } catch (error) {
      console.error("Error fetching table or waiter data:", error);
      return "";
    }
  };

  const sendWaiter = async (id) => {
    try {
      const config = await handleGetTokenAndConfig();
      const waiter = await specifiedWaiter(id);
      if (!waiter) {
        return;
      }
      const helpStatus = "Send waiter";
      const order = await axios.put(
        apiUrl + "/api/order/" + id,
        {
          waiter,
          helpStatus,
        },
        config
      );
      const orderData = order.data;

      if (orderData) {
        setupdate(!update);
        if (orderData.help === "Requests assistance") {
          setIsRefresh(!isRefresh);
          cashierSocket.emit("helprequest", `عميل يطلب مساعده-${waiter}`);
        } else if (orderData.help === "Requests bill") {
          setIsRefresh(!isRefresh);
          cashierSocket.emit("helprequest", `عميل يطلب الحساب-${waiter}`);
        }
      }
    } catch (error) {
      toast.error("حدث خطأ أثناء إرسال الويتر");
    }
  };

  const putdeliveryman = async (id, orderid) => {
    try {
      const config = await handleGetTokenAndConfig();
      const deliveryMan = id;
      const order = await axios.put(
        apiUrl + "/api/order/" + orderid,
        {
          deliveryMan,
        },
        config
      );
      setupdate(!update);
    } catch (error) {}
  };

  const [paymentMethod, setpaymentMethod] = useState("");
  const [registers, setregisters] = useState([]);
  const [totalRegistersBalance, settotalRegistersBalance] = useState(0);
  const [registerSelected, setregisterSelected] = useState("");

  const getCashRegistersByEmployee = async (id) => {
    if (!id) {
      return;
    }

    try {
      const config = await handleGetTokenAndConfig();
      const response = await axios.get(
        `${apiUrl}/api/cashregister/employee/${id}`,
        config
      );
      const registers = response.data;
      //
      if (registers.length === 0) {
        toast.info("لم يتم العثور على  لهذا الموظف");
        return;
      }

      if (registers.length > 0) {
        setregisters(registers);
        setregisterSelected(registers[0]);
      }
    } catch (error) {
      console.error({ error });
      toast.error("حدث خطأ أثناء جلب حسابات النقدية");
    }
  };

  useEffect(() => {
    const total = registers.reduce(
      (total, register) => total + register.balance,
      0
    );
    settotalRegistersBalance(total);
  }, [registers]);

  const RevenueRecording = async (total, revenue) => {
    try {
      const config = await handleGetTokenAndConfig();
      if (registerSelected) {
        // احسب الرصيد المحدث
        const oldBalance = registers.find(
          (register) => register._id === registerSelected
        ).balance;
        const updatedBalance = oldBalance + revenue;

        // إنشاء سجل حركة نقدية
        const cashMovement = await axios.post(
          `${apiUrl}/api/cashMovement/`,
          {
            registerId: registerSelected,
            createdBy: employeeLoginInfo.id,
            amount: revenue,
            type: "Revenue",
            description: ` فاتورة بيع رقم ${orderdata.serial} باجمالي  ${total}`,
          },
          config
        );
        const cashMovementData = cashMovement.data;
        if (cashMovement) {
          toast.success("تم تسجيل حركه الخزينه");
          const updateCashRegister = await axios.put(
            `${apiUrl}/api/cashregister/${registerSelected}`,
            {
              balance: updatedBalance,
            },
            config
          );
          const updateCashRegisterData = updateCashRegister.data;
          if (updateCashRegisterData) {
            toast.success("تم اضافه اليراد لرصيد الخزينه بنجاح");
          } else {
            const deletecashMovement = await axios.delete(
              `${apiUrl}/api/cashMovement/${cashMovementData._id}`,
              config
            );
            toast.warn(
              "حدث خطا اثناء تسجيل ايراد الفاتوره بالخزينه يرجي تسجيلها "
            );
          }
        }
      }
    } catch (error) {
      toast.error("فشل في تسجيل الإيراد");
    }
  };

  const [paidAmount, setPaidAmount] = useState(0);
  const [remainingAmount, setRemainingAmount] = useState(0);
  const [cashOutAmount, setCashOutAmount] = useState(0);
  const [revenueAmount, setRevenueAmount] = useState(0);

  useEffect(() => {
    const remaining = paidAmount - orderdata.total;
    const revenue = paidAmount - cashOutAmount;

    setRemainingAmount(remaining > 0 ? remaining : 0);
    setRevenueAmount(revenue > 0 ? revenue : 0);
  }, [paidAmount, cashOutAmount]);

  const changePaymentorderstauts = async (e) => {
    e.preventDefault();
    try {
      const config = await handleGetTokenAndConfig();
      if (!registerSelected) {
        toast.warn("لم يتم التعرف علي خزينه لتسجيل فيها اليرادات");
        return;
      }
      const id = orderdata._id;
      const payment_status = "Paid";
      const isActive = false;
      const cashier = employeeLoginInfo.id;

      const changePaymentstauts = await axios.put(
        `${apiUrl}/api/order/${id}`,
        {
          payment_status,
          paymentMethod,
          isActive,
          cashier,
        },
        config
      );
      const changePaymentstautsData = changePaymentstauts.data;
      if (changePaymentstautsData) {
        await RevenueRecording(changePaymentstautsData.total, revenueAmount);
        // عرض رسالة نجاح
        toast.success("تم تغيير حالة الدفع بنجاح");
      }
      fetchOrdersData();
    } catch (error) {
      // معالجة الخطأ وعرض رسالة خطأ
      console.error("خطأ في تغيير حالة الدفع:", error);
      toast.error("حدث خطأ أثناء تغيير حالة الدفع");
    }
  };

  const [serial, setserial] = useState("");
  const [orderType, setorderType] = useState("");

  const [orderdata, setorderdata] = useState({});

  // Fetch orders from API
  const getOrderDetalis = async (serial) => {
    try {
      const config = await handleGetTokenAndConfig();
      const res = await axios.get(apiUrl + "/api/order", config);
      const order = res.data.find((o) => o.serial === serial);
      if (order) {
        setorderdata(order);
        setserial(order.serial);
        setorderType(order.orderType);
      }
    } catch (error) {
      // Display toast or handle error
    }
  };

  const printContainerInvoiceSplit = useRef();
  const printContainerKitchen = useRef();

  const PrintInvoiceSplit = useReactToPrint({
    content: () => printContainerInvoiceSplit.current,
    copyStyles: true,
    removeAfterPrint: true,
    bodyClass: "printpage",
    printerName: "cashier",
  });

  const PrintKitchen = useReactToPrint({
    content: () => printContainerKitchen.current,
    copyStyles: true,
    removeAfterPrint: true,
    bodyClass: "printpage",
    printerName: "Kitchen",
  });

  const handlePrintInvoiceSplit = (e) => {
    e.preventDefault();
    PrintInvoiceSplit();
    setisPrint(true);
  };

  const handlePrintKitchen = (e) => {
    e.preventDefault();
    PrintKitchen();
    setisPrint(true);
  };

  // Filter orders by serial number
  const searchBySerial = (serial) => {
    const orders = pendingPayment.filter((order) =>
      order.serial.toString().startsWith(serial)
    );
    setPendingPayment(orders);
  };

  // Filter orders by order type
  const getOrdersByType = (type) => {
    const orders = pendingPayment.filter(
      (order) => order.orderdata.orderType === type
    );
    setPendingPayment(orders);
  };

  const [kitchenOrder, setkitchenOrder] = useState({});
  const [kitchenProducts, setkitchenProducts] = useState([]);

  const getKitchenCard = (id) => {
    const neworder = pendingPayment.find((order) => order._id === id);
    setkitchenOrder(neworder);
    const orderproducts = neworder.products;
    const newproducts = orderproducts.filter(
      (product) => product.isDone === false
    );
    const newExreas = orderproducts.filter((extra) => extra.isDone === false);
    setkitchenProducts(newproducts);
  };

  const [isPrint, setisPrint] = useState(false);

  const aproveOrder = async (e, cashier) => {
    e.preventDefault();
    try {
      const config = await handleGetTokenAndConfig();

      // Fetch order data by ID
      const order = await axios.get(
        `${apiUrl}/api/order/${kitchenOrder._id}`,
        config
      );
      const products = await order.data.products;
      const aproveorder = "Approved";

      // Update order status or perform other tasks

      const updateproducts = products.map((prod) => ({
        ...prod,
        isDone: true,
      }));
      const updateorder = await axios.put(
        `${apiUrl}/api/order/${kitchenOrder._id}`,
        { products: updateproducts, status: aproveorder, cashier },
        config
      );
      if (updateorder.status === 200) {
        toast.success("تم ارسال الاوردر"); // Notifies success in completing order
        setkitchenOrder("");
        setisPrint(false);
        setkitchenProducts([]);
      }
    } catch (error) {
      toast.error("حدث خطأ اثناء ارسال الاوردر!");
    }
  };

  useEffect(() => {
    fetchOrdersData();
    fetchActiveEmployees();
  }, [update, isRefresh]);

  useEffect(() => {
    getAlldepartments();
    employeeLoginInfo && getCashRegistersByEmployee(employeeLoginInfo?.id);
  }, []);

  return (
    <section
      className="w-100 mw-100 p-1 m-0"
      style={{ scrollbarWidth: "none" }}
    >
      <div className="w-100 p-0 m-0">
        <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
          <div className="w-100">
            <div
              className="d-flex justify-content-between align-items-center py-1 px-2 bg-primary text-light rounded"
              style={{ minHeight: "50px" }}
            >
              <h1 className="h5 mb-0">الصفحة الرئيسية</h1>
              <a
                href={`http://${window.location.hostname}`}
                target="_blank"
                className="btn btn-outline-outline-light"
              >
                <i className="bx bx-world"></i>
                <span className="ms-2">زيارة الموقع</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="container-lg h-auto mt-4">
        <div className="d-flex flex-wrap align-items-center justify-content-start">
          <div className="col-lg-3 col-md-6 mb-3">
            <div className="card text-white bg-primary h-100">
              <div className="card-body d-flex justify-content-between align-items-center">
                <div className="info">
                  <p>اوردرات اليوم</p>
                  <h3>{listDayOrder ? listDayOrder.length : 0}</h3>
                </div>
                <FontAwesomeIcon icon={faCalendarCheck} size="3x" />
              </div>
            </div>
          </div>
          <div className="col-lg-3 col-md-6 mb-3">
            <div className="card text-white bg-secondary h-100">
              <div className="card-body d-flex justify-content-between align-items-center">
                <div className="info">
                  <p>في الانتظار</p>
                  <h3>{pendingOrder ? pendingOrder.length : 0}</h3>
                </div>
                <FontAwesomeIcon icon={faClock} size="3x" />
              </div>
            </div>
          </div>
          <div className="col-lg-3 col-md-6 mb-3">
            <div className="card text-white bg-warning h-100">
              <div className="card-body d-flex justify-content-between align-items-center">
                <div className="info">
                  <p>انتظار الدفع</p>
                  <h3>{pendingPayment ? pendingPayment.length : 0}</h3>
                </div>
                <FontAwesomeIcon icon={faMoneyBill} size="3x" />
              </div>
            </div>
          </div>
          <div className="col-lg-3 col-md-6 mb-3">
            <div className="card text-white bg-danger h-100">
              <div className="card-body d-flex justify-content-between align-items-center">
                <div className="info">
                  <p>اوردرات ملغاه</p>
                  <h3>{cancelledOrders ? cancelledOrders.length : 0}</h3>
                </div>
                <FontAwesomeIcon icon={faBan} size="3x" />
              </div>
            </div>
          </div>
          <div className="col-lg-3 col-md-6 mb-3">
            <div className="card text-white bg-success h-100">
              <div className="card-body d-flex justify-content-between align-items-center">
                <div className="info">
                  <p>ايراد اليوم</p>
                  <h3>
                    {totalDaySales ? Math.round(totalDaySales / 10) * 10 : 0}
                  </h3>
                </div>
                <FontAwesomeIcon icon={faDollarSign} size="3x" />
              </div>
            </div>
          </div>
          <div className="col-lg-3 col-md-6 mb-3">
            <div className="card text-white bg-info h-100">
              <div className="card-body d-flex justify-content-between align-items-center">
                <div className="info">
                  <p>رصيد الخزينه</p>
                  <h3>{totalRegistersBalance ? totalRegistersBalance : 0}</h3>
                </div>
                <FontAwesomeIcon icon={faCashRegister} size="3x" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-100 p-0 m-0">
        <div className="w-100 d-flex flex-wrap align-content-start justify-content-between align-items-start">
          <div className="col-12 col-lg-8 h-auto mb-3">
            <div className="card h-100 w-100" style={{ overflow: "auto" }}>
              <div className="card-header w-100">
                <h3 className="card-title">الأوردرات الحالية</h3>
              </div>
              <div className="card-body w-auto">
                <div className="row mb-3">
                  <div className="col-4">
                    <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                      عرض
                    </label>

                    <select
                      className="form-control border-primary m-0 p-2 h-auto"
                      onChange={(e) => {
                        setStartPagination(0);
                        setEndPagination(parseInt(e.target.value));
                      }}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={20}>20</option>
                      <option value={25}>25</option>
                      <option value={30}>30</option>
                    </select>
                  </div>
                  <div className="col-4">
                    <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                      رقم الفاتورة
                    </label>
                    <input
                      type="text"
                      className="form-control border-primary m-0 p-2 h-auto"
                      onChange={(e) => searchBySerial(e.target.value)}
                    />
                  </div>
                  <div className="col-4">
                    <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                      نوع الأوردر
                    </label>
                    <select
                      className="form-control border-primary m-0 p-2 h-auto"
                      onChange={(e) => getOrdersByType(e.target.value)}
                    >
                      <option value="">الكل</option>
                      <option value="Dine-in">صالة</option>
                      <option value="Delivery">ديليفري</option>
                      <option value="Takeaway">تيك اوي</option>
                    </select>
                  </div>
                </div>

                <div className="row align-items-center justify-content-between mb-3">
                  <div className="col p-0">
                    <button
                      className="btn btn-outline-primary w-100 p-1 text-center"
                      style={{ fontSize: "14px" }}
                      onClick={() => setlistOrderShow(listDayOrder)}
                    >
                      أوردرات اليوم{" "}
                      <span className="badge bg-secondary">
                        {listDayOrder.length}
                      </span>
                    </button>
                  </div>
                  <div className="col p-0">
                    <button
                      className="btn btn-outline-primary w-100 p-1 text-center"
                      style={{ fontSize: "14px" }}
                      onClick={() => setlistOrderShow(orderShift)}
                    >
                      أوردرات الشيفت{" "}
                      <span className="badge bg-secondary">
                        {orderShift.length}
                      </span>
                    </button>
                  </div>
                  <div className="col p-0">
                    <button
                      className="btn btn-outline-warning w-100 p-1 text-center"
                      style={{ fontSize: "14px" }}
                      onClick={() => setlistOrderShow(pendingOrder)}
                    >
                      انتظار الموافقة{" "}
                      <span className="badge bg-secondary">
                        {pendingOrder.length}
                      </span>
                    </button>
                  </div>
                  <div className="col p-0">
                    <button
                      className="btn btn-outline-warning w-100 p-1 text-center"
                      style={{ fontSize: "14px" }}
                      onClick={() => setlistOrderShow(pendingPayment)}
                    >
                      انتظار الدفع{" "}
                      <span className="badge bg-secondary">
                        {pendingPayment.length}
                      </span>
                    </button>
                  </div>
                  <div className="col p-0">
                    <button
                      className="btn btn-outline-danger w-100 p-1 text-center"
                      style={{ fontSize: "14px" }}
                      onClick={() => setlistOrderShow(cancelledOrders)}
                    >
                      الملغاه{" "}
                      <span className="badge bg-secondary">
                        {cancelledOrders.length}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="table align-middle table-striped table-hover mb-0">
                    <thead className="table-primary">
                      <tr>
                        <th>م</th>
                        <th>رقم الفاتورة</th>
                        <th>العميل</th>
                        <th>الإجمالي</th>
                        <th>دفع جزء</th>
                        <th>حالة الأوردر</th>
                        <th>الأوردر</th>
                        <th>الويتر</th>
                        <th>الديلفري</th>
                        <th>نوع الاوردر</th>
                        <th>حالة الدفع</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listOrderShow.length > 0 ? (
                        listOrderShow
                          .slice(startPagination, endPagination + 15)
                          .map((recent, i) => (
                            <tr
                              key={i}
                              className={
                                recent.status === "Pending"
                                  ? "bg-warning"
                                  : recent.status === "Approved"
                                  ? "bg-success"
                                  : recent.status === "Cancelled"
                                  ? "bg-danger"
                                  : ""
                              }
                            >
                              <td>{i + 1}</td>
                              <td>
                                <a
                                  href="#invoiceOrderModal"
                                  data-toggle="modal"
                                  onClick={() => {
                                    getOrderDetalis(recent.serial);
                                    setShowModal(!showModal);
                                  }}
                                >
                                  {recent.serial}
                                </a>
                              </td>
                              <td>
                                {recent.orderType === "Dine-in"
                                  ? recent.table?.tableNumber
                                  : recent.orderType === "Delivery"
                                  ? recent.user?.username
                                  : recent.orderType === "Takeaway"
                                  ? `num ${recent.orderNum}`
                                  : ""}
                              </td>
                              <td>{recent.total}</td>
                              <td>
                                {recent.status !== "Cancelled" ? (
                                  recent.isSplit &&
                                  recent.subtotalSplitOrder < recent.total ? (
                                    <a
                                      href="#invoiceSplitModal"
                                      type="button"
                                      className="btn btn-outline-primary"
                                      data-toggle="modal"
                                      onClick={() =>
                                        getOrderDetalis(recent.serial)
                                      }
                                    >
                                      باقي
                                    </a>
                                  ) : (
                                    "كاملة"
                                  )
                                ) : (
                                  "ملغاه"
                                )}
                              </td>
                              <td>
                                <select
                                  className="form-control border-primary m-0 p-2 h-auto"
                                  name="status"
                                  onChange={(e) => {
                                    changeOrderStatus(e, recent._id);
                                  }}
                                >
                                  <option value={recent.status}>
                                    {
                                      allStatusAR[
                                        allStatusEN.findIndex(
                                          (state) => state === recent.status
                                        )
                                      ]
                                    }
                                  </option>
                                  {statusEN.map((state, i) => (
                                    <option value={state} key={i}>
                                      {statusAR[i]}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td onClick={() => getKitchenCard(recent._id)}>
                                <a
                                  href="#kitchenorderModal"
                                  data-toggle="modal"
                                  className="btn btn-outline-info"
                                >
                                  جديد
                                </a>
                              </td>
                              <td>
                                {recent.waiter
                                  ? recent.waiter?.username
                                  : "لم يحدد"}
                              </td>
                              <td>
                                {recent.orderType === "Delivery" && (
                                  <select
                                    className="form-select form-select-sm border-primary m-0 p-2 h-auto"
                                    name="status"
                                    onChange={(e) =>
                                      putdeliveryman(e.target.value, recent._id)
                                    }
                                  >
                                    <option value={recent.deliveryMan?._id}>
                                      {recent.deliveryMan
                                        ? recent.deliveryMan?.username
                                        : "لم يحدد"}
                                    </option>
                                    {deliverymen.map((man, i) => (
                                      <option value={man._id} key={i}>
                                        {man.username}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </td>
                              <td>
                                {
                                  orderTypeAR[
                                    orderTypeEN.findIndex(
                                      (type) => type === recent.orderType
                                    )
                                  ]
                                }
                              </td>
                              <td>
                                {recent.payment_status === "Pending" ? (
                                  <button
                                    data-target="paymentModal"
                                    className="btn btn-outline-primary text-light"
                                    data-toggle="modal"
                                    onClick={() => {
                                      getOrderDetalis(recent.serial);
                                    }}
                                  >
                                    دفع
                                  </button>
                                ) : (
                                  "تم الدفع"
                                )}
                              </td>
                            </tr>
                          ))
                      ) : (
                        <tr className="text-center">
                          <td
                            colSpan="11"
                            className="py-3 text-muted bg-body-tertiary"
                          >
                            لا توجد أوردرات
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* pagination */}
                <div className="clearfix">
                  <div className="hint-text text-dark">
                    عرض{" "}
                    <b>
                      {listOrderShow.length > startPagination
                        ? startPagination
                        : listOrderShow.length}
                    </b>{" "}
                    من <b>{listOrderShow.length}</b> عنصر
                  </div>
                  <ul className="pagination">
                    <li onClick={EditPagination} className="page-item disabled">
                      <a href="#">السابق</a>
                    </li>
                    <li
                      onClick={EditPagination}
                      className={`page-item ${
                        endPagination === 5 ? "active" : ""
                      }`}
                    >
                      <a href="#" className="page-link">
                        1
                      </a>
                    </li>
                    <li
                      onClick={EditPagination}
                      className={`page-item ${
                        endPagination === 10 ? "active" : ""
                      }`}
                    >
                      <a href="#" className="page-link">
                        2
                      </a>
                    </li>
                    <li
                      onClick={EditPagination}
                      className={`page-item ${
                        endPagination === 15 ? "active" : ""
                      }`}
                    >
                      <a href="#" className="page-link">
                        3
                      </a>
                    </li>
                    <li
                      onClick={EditPagination}
                      className={`page-item ${
                        endPagination === 20 ? "active" : ""
                      }`}
                    >
                      <a href="#" className="page-link">
                        4
                      </a>
                    </li>
                    <li
                      onClick={EditPagination}
                      className={`page-item ${
                        endPagination === 25 ? "active" : ""
                      }`}
                    >
                      <a href="#" className="page-link">
                        5
                      </a>
                    </li>
                    <li
                      onClick={EditPagination}
                      className={`page-item ${
                        endPagination === 30 ? "active" : ""
                      }`}
                    >
                      <a href="#" className="page-link">
                        التالي
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* متابعه الطاوله */}

          <div className="col-12 col-lg-4 h-auto">
            <div className="card shadow-sm border-0">
              <div className="card-header bg-body-tertiary">
                <h3 className="card-title mb-0">متابعة الطاولة</h3>
              </div>
              <div className="card-body">
                <ul className="list-group">
                  {pendingPayment
                    .filter(
                      (order) =>
                        order.orderType === "Dine-in" &&
                        order.payment_status === "Pending" &&
                        order.status !== "Cancelled" &&
                        order.help !== "Not requested"
                    )
                    .map((order, i) => (
                      <li
                        className={`list-group-item border-0 shadow-sm mb-2 ${
                          order.helpStatus === "Not send"
                            ? "list-group-item-warning"
                            : order.helpStatus === "Assistance done"
                            ? "list-group-item-success"
                            : "list-group-item-info"
                        }`}
                        key={i}
                      >
                        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                          <div className="d-flex flex-column flex-md-row w-50 justify-content-between align-items-center">
                            <p
                              className="mb-1 fw-bold text-body"
                              style={{ fontSize: "18px" }}
                            >
                              طاولة: {order.table?.tableNumber}
                            </p>
                            <p
                              className="mb-1 fw-bold text-body"
                              style={{ fontSize: "18px" }}
                            >
                              {order.help === "Requests assistance"
                                ? "يحتاج المساعدة"
                                : order.help === "Requests bill"
                                ? "يحتاج الفاتورة"
                                : ""}
                            </p>
                          </div>

                          {order.helpStatus === "Not send" ? (
                            <button
                              type="button"
                              className="btn btn-outline-primary btn-sm"
                              onClick={() => sendWaiter(order._id)}
                            >
                              إرسال ويتر
                            </button>
                          ) : (
                            <div className="d-flex flex-nowrap w-50 justify-content-between align-items-center">
                              <p
                                className="mb-0 fw-bold text-body text-center w-50"
                                style={{ fontSize: "18px" }}
                              >
                                {order.waiter?.username}
                              </p>
                              <p
                                className="mb-0 fw-bold text-body text-center w-50"
                                style={{ fontSize: "18px" }}
                              >
                                {order.helpStatus === "Send waiter"
                                  ? "تم الإرسال"
                                  : order.helpStatus === "On the way"
                                  ? "في الطريق"
                                  : order.helpStatus === "Assistance done"
                                  ? "تمت"
                                  : ""}
                              </p>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <InvoiceComponent
        ModalId="invoiceOrderModal"
        orderData={orderdata}
        showModal={showModal}
        setShowModal={setShowModal}
      />

      {/* تاكيد الدفع */}
      <div id="paymentModal" className="modal fade">
        <div
          className="modal-dialog modal-lg"
          style={{ width: "350px", maxWidth: "95%" }}
        >
          <div className="modal-content shadow-lg border-0 rounded ">
            <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
              <h4 className="modal-title">تاكيد دفع الفاتورة</h4>
              <button
                type="button"
                className="close m-0 p-1"
                data-dismiss="modal"
                aria-hidden="true"
              >
                &times;
              </button>
            </div>
            <form
              onSubmit={(e) => {
                changePaymentorderstauts(e);
              }}
            >
              <div className="modal-body d-flex flex-wrap align-items-center p-3 text-right">
                <div className="form-group w-100 d-flex align-items-center justify-content-between">
                  <label
                    htmlFor="totalOrder"
                    className="form-label col-6 text-dark text-right"
                  >
                    اجمالي المطلوب:
                  </label>
                  <input
                    type="text"
                    id="totalOrder"
                    className="form-control border-primary col-4"
                    value={orderdata.total}
                    readOnly
                  />
                </div>
                <div className="form-group w-100 d-flex align-items-center justify-content-between">
                  <label
                    htmlFor="paidAmount"
                    className="form-label col-6 text-dark text-right"
                  >
                    المدفوع:
                  </label>
                  <input
                    type="number"
                    id="paidAmount"
                    className="form-control border-primary col-4"
                    min={parseFloat(orderdata.total)}
                    required
                    onChange={(e) => setPaidAmount(e.target.value)}
                  />
                </div>
                <div className="form-group w-100 d-flex align-items-center justify-content-between">
                  <label
                    htmlFor="remainingAmount"
                    className="form-label col-6 text-dark text-right"
                  >
                    الباقي:
                  </label>
                  <input
                    type="text"
                    id="remainingAmount"
                    className="form-control border-primary col-4"
                    value={remainingAmount}
                    readOnly
                  />
                </div>
                <div className="form-group w-100 d-flex align-items-center justify-content-between">
                  <label
                    htmlFor="cashOutAmount"
                    className="form-label col-6 text-dark text-right"
                  >
                    المبلغ الخارج من الخزينة:
                  </label>
                  <input
                    type="number"
                    id="cashOutAmount"
                    className="form-control border-primary col-4"
                    max={parseFloat(remainingAmount)}
                    onChange={(e) => setCashOutAmount(e.target.value)}
                  />
                </div>
                <div className="form-group d-flex flex-nowrap w-100">
                  <label
                    htmlFor="paymentMethod"
                    className="form-label col-6 text-dark text-right"
                  >
                    طريقه الدفع:
                  </label>
                  <select
                    id="paymentMethod"
                    className="form-control border-primary m-0 p-2 h-auto"
                    required
                    onChange={(e) => setpaymentMethod(e.target.value)}
                  >
                    <option>اختر طريقه الدفع</option>
                    {brandInfo.acceptedPayments &&
                      brandInfo.acceptedPayments.map((method, i) => (
                        <option value={method} key={i}>
                          {method}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="form-group d-flex flex-nowrap w-100">
                  <label
                    htmlFor="registerSelected"
                    className="form-label col-6 text-dark text-right"
                  >
                    الخزينة:
                  </label>
                  {registers.length > 0 ? (
                    <select
                      id="registerSelected"
                      className="form-control border-primary m-0 p-2 h-auto"
                      required
                      onChange={(e) => setregisterSelected(e.target.value)}
                    >
                      <option>اختر الخزينه</option>
                      {registers.map((register, i) => (
                        <option value={register._id} key={i}>
                          {register.name}
                        </option>
                      ))}
                    </select>
                  ) : registers.length === 1 ? (
                    <input
                      type="text"
                      id="registerSelected"
                      className="form-control border-primary col-4"
                      value={registers[0].name}
                      readOnly
                    />
                  ) : (
                    "لم يوجد خزينه"
                  )}
                </div>
              </div>

              <div className="modal-footer w-100 d-flex flex-row flex-nowrap align-items-center justify-content-between">
                <input
                  type="submit"
                  className="btn btn-outline-success col-6 h-100 px-2 py-3 m-0"
                  value="تم"
                />
                <input
                  type="button"
                  className="btn btn-outline-danger col-6 h-100 px-2 py-3 m-0"
                  data-dismiss="modal"
                  value="إغلاق"
                />
              </div>
            </form>
          </div>
        </div>
      </div>

      <div id="invoiceSplitModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title"></h4>
                <button
                  type="button"
                  className="close m-0 p-1"
                  data-dismiss="modal"
                  aria-hidden="true"
                >
                  &times;
                </button>
              </div>
              <div
                ref={printContainerInvoiceSplit}
                className="w-100 p-1 mb-7 overflow-auto printpage"
                style={{ textAlign: "center" }}
              >
                {/* Invoice Header */}
                <div
                  className="invoice-header"
                  style={{
                    backgroundColor: "#343a40",
                    color: "#ffffff",
                    padding: "20px",
                    textAlign: "center",
                  }}
                >
                  <h2>{brandInfo.name}</h2>
                  <p>
                    كاشير {orderdata.cashier && orderdata.cashier.username} |
                    فاتورة باقي #{serial} |{" "}
                    {orderdata.orderType === "Dine-in"
                      ? `Table ${
                          orderdata.table && orderdata.table.tableNumber
                        }`
                      : ""}{" "}
                    | التاريخ: {formatDate(new Date())}
                  </p>
                </div>

                {/* Customer Information */}
                {orderType === "Delivery" ? (
                  <div
                    className="customer-info text-dark"
                    style={{ margin: "20px" }}
                  >
                    <h4>بيانات العميل</h4>
                    <p>الاسم: {orderdata.name}</p>
                    <p>الموبايل: {orderdata.phone}</p>
                    <p>العنوان: {orderdata.address}</p>
                    <p>Delivery Man: {orderdata.deliveryMan?.username}</p>
                  </div>
                ) : orderType === "Takeaway" ? (
                  <div
                    className="customer-info text-dark"
                    style={{ marginBottom: "20px" }}
                  >
                    <h4>بيانات العميل</h4>
                    <p>الاسم: {orderdata.name}</p>
                    <p>الموبايل: {orderdata.phone}</p>
                    <p>رقم الاوردر: {orderdata.orderNum}</p>
                  </div>
                ) : (
                  ""
                )}
                {/* Order Details Table */}
                <table
                  className="table table-bordered table-responsive-md"
                  style={{ direction: "rtl" }}
                >
                  <thead className="thead-dark">
                    <tr>
                      <th scope="col" className="col-md-3">
                        الصنف
                      </th>
                      <th scope="col" className="col-md-2">
                        السعر
                      </th>
                      <th scope="col" className="col-md-2">
                        الكمية
                      </th>
                      <th scope="col" className="col-md-2">
                        الاجمالي
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Replace this with your dynamic data */}
                    {orderdata.products &&
                      orderdata.products.map((item, i) =>
                        item.quantity - item.numOfPaid > 0 ? (
                          <>
                            <tr key={i}>
                              <td className="col-md-3 text-truncate">
                                {item.name}
                              </td>
                              <td className="col-md-2 text-nowrap">
                                {item.priceAfterDiscount
                                  ? item.priceAfterDiscount
                                  : item.price}
                              </td>
                              <td className="col-md-2 text-nowrap">
                                {item.quantity - item.numOfPaid}
                              </td>
                              <td className="col-md-2 text-nowrap">
                                {item.priceAfterDiscount
                                  ? item.priceAfterDiscount *
                                    (item.quantity - item.numOfPaid)
                                  : item.price *
                                    (item.quantity - item.numOfPaid)}
                              </td>
                            </tr>
                            {item.extras &&
                              item.extras.length > 0 &&
                              item.extras.map((extra, j) => {
                                if (extra && extra.isPaid === false) {
                                  return (
                                    <tr key={`${i}-${j}`}>
                                      <td className="col-md-3 text-truncate">
                                        <div className="d-flex flex-column flex-wrap w-100 align-items-center justify-content-between">
                                          {extra.extraDetails.map((detail) => (
                                            <p
                                              className="badge badge-secondary m-1"
                                              key={detail.extraid}
                                            >{`${detail.name}`}</p>
                                          ))}
                                        </div>
                                      </td>
                                      <td className="col-md-2 text-nowrap">
                                        <div className="d-flex  flex-column flex-wrap w-100 align-items-center justify-content-between">
                                          {extra.extraDetails.map((detail) => (
                                            <p
                                              className="badge badge-secondary m-1"
                                              key={detail.extraid}
                                            >{`${detail.price} ج`}</p>
                                          ))}
                                        </div>
                                      </td>
                                      <td className="col-md-2 text-nowrap">
                                        1
                                      </td>
                                      <td className="col-md-2 text-nowrap">
                                        {extra && (
                                          <p className="badge badge-info m-1">
                                            {extra.totalExtrasPrice} ج
                                          </p>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                } else {
                                  return null; // Return null if extra.isPaid !== false
                                }
                              })}
                          </>
                        ) : (
                          ""
                        )
                      )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="3">المجموع</td>
                      <td>
                        {orderdata.subTotal - orderdata.subtotalSplitOrder}
                      </td>
                    </tr>
                    {orderdata.deliveryFee > 0 && (
                      <tr>
                        <td colSpan="3">خدمة التوصيل</td>
                        <td>{orderdata.deliveryFee}</td>
                      </tr>
                    )}
                    {orderdata.addition > 0 ? (
                      <tr>
                        <td colSpan="3">رسوم اضافيه</td>
                        <td>{orderdata.addition}</td>
                      </tr>
                    ) : (
                      ""
                    )}
                    {orderdata.discount > 0 ? (
                      <tr>
                        <td colSpan="3">خصم</td>
                        <td>{orderdata.discount}</td>
                      </tr>
                    ) : (
                      ""
                    )}
                    <tr>
                      <td colSpan="3">الاجمالي</td>
                      <td>{orderdata.total - orderdata.subtotalSplitOrder}</td>
                    </tr>
                  </tfoot>
                </table>

                {/* Restaurant Information */}
                <div
                  className="restaurant-info text-dark"
                  style={{ marginTop: "20px", textAlign: "center" }}
                >
                  <p>{brandInfo.name}</p>
                  <p>موبايل: 01144001433</p>
                  <p>
                    العنوان: بني سويف - الفشن -أخر شارع البحر الأعظم بجوار ماركت
                    طيبة{" "}
                  </p>
                </div>
                {/* Footer */}
                <div
                  className="footer"
                  style={{
                    marginTop: "30px",
                    textAlign: "center",
                    color: "#828282",
                  }}
                >
                  <p>
                    webapp: <span style={{ color: "#5a6268" }}>Smart Menu</span>
                  </p>
                  <p>
                    Developed by:{" "}
                    <span style={{ color: "#5a6268" }}>Beshoy Nady</span>
                  </p>
                </div>
              </div>
              <div className="modal-footer d-flex flex-nowrap align-items-center justify-content-between m-0 p-1">
                <input
                  type="button"
                  className="btn btn-outline-danger col-6 h-100 px-2 py-3 m-0"
                  data-dismiss="modal"
                  value="الغاء"
                />
                <input
                  type="submit"
                  className="btn btn-outline-success col-6 h-100 px-2 py-3 m-0"
                  value="Print"
                  onClick={handlePrintInvoiceSplit}
                />
              </div>
            </form>
          </div>
        </div>
      </div>

      <div id="kitchenorderModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                {/* <h4 className="modal-title"></h4> */}
                <button
                  type="button"
                  className="close m-0 p-1"
                  data-dismiss="modal"
                  aria-hidden="true"
                >
                  &times;
                </button>
                <button
                  type="button"
                  className="h-100 btn btn-outline-primary"
                  value="طباعه للشيف"
                  onClick={(e) => handlePrintKitchen(e)}
                >
                  طباعه للشيف
                </button>
              </div>
              <div
                ref={printContainerKitchen}
                className="w-100 p-1 mb-7 overflow-auto printpage"
                style={{ textAlign: "center" }}
              >
                <div className="mb-4" style={{ direction: "rtl" }}>
                  <div
                    className="card text-white bg-success"
                    style={{ width: "265px" }}
                  >
                    <div className="card-body text-right d-flex justify-content-between p-0 m-1">
                      <div style={{ maxWidth: "50%" }}>
                        <p className="card-text">
                          {" "}
                          {kitchenOrder.table
                            ? `طاولة: ${kitchenOrder.table?.tableNumber}`
                            : kitchenOrder.user
                            ? `العميل: ${kitchenOrder.user.username}`
                            : ""}
                        </p>
                        <p className="card-text">
                          نوع الطلب: {kitchenOrder.orderType}
                        </p>
                        {kitchenOrder.orderNum
                          ? `<p className="card-text"> رقم الطلب:  ${kitchenOrder.orderNum} </p>`
                          : ""}
                      </div>

                      <div style={{ maxWidth: "50%" }}>
                        <p className="card-text">
                          الفاتورة: {kitchenOrder.serial}
                        </p>
                        <p className="card-text">
                          الكاشير: {kitchenOrder.cashier?.username}
                        </p>
                        {kitchenOrder.waiter ? (
                          <p className="card-text">
                            الويتر: {kitchenOrder.waiter?.username}
                          </p>
                        ) : (
                          ""
                        )}
                        <p className="card-text">
                          الاستلام:{" "}
                          {new Date(kitchenOrder.createdAt).toLocaleTimeString(
                            [],
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                        </p>
                        <p className="card-text">الانتظار: {55} دقيقه</p>
                      </div>
                    </div>
                    <ul className="list-group list-group-flush">
                      {kitchenProducts.map((product, i) => {
                        return (
                          <>
                            <li
                              className="list-group-item d-flex flex-column justify-content-between align-items-center"
                              key={i}
                              style={
                                product.isAdd
                                  ? { backgroundColor: "red", color: "white" }
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
                                    <tr key={`${i}-${j}`}>
                                      <td className="col-md-3 text-truncate">
                                        <div className="d-flex flex-column flex-wrap w-100 align-items-center justify-content-between">
                                          {extra.extraDetails.map((detail) => (
                                            <p
                                              className="badge badge-secondary m-1"
                                              key={detail.extraid}
                                            >{`${detail.name}`}</p>
                                          ))}
                                        </div>
                                      </td>
                                      <td className="col-md-2 text-nowrap">
                                        <div className="d-flex  flex-column flex-wrap w-100 align-items-center justify-content-between">
                                          {extra.extraDetails.map((detail) => (
                                            <p
                                              className="badge badge-secondary m-1"
                                              key={detail.extraid}
                                            >{`${detail.price} ج`}</p>
                                          ))}
                                        </div>
                                      </td>
                                      <td className="col-md-2 text-nowrap">
                                        1
                                      </td>
                                      <td className="col-md-2 text-nowrap">
                                        {extra && (
                                          <p className="badge badge-info m-1">
                                            {extra.totalExtrasPrice} ج
                                          </p>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                } else {
                                  return null; // Return null if extra.isPaid !== false
                                }
                              })}
                          </>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
              <div className="modal-footer d-flex flex-nowrap align-items-center justify-content-between m-0 p-1">
                <input
                  type="button"
                  className="btn btn-outline-danger col-6 h-100 px-2 py-3 m-0"
                  data-dismiss="modal"
                  value="اغلاق"
                />
                <input
                  type="button"
                  className="btn btn-outline-success col-6 h-100 px-2 py-3 m-0"
                  value="تم الموافقه"
                  onClick={(e) =>
                    isPrint
                      ? aproveOrder(e, employeeLoginInfo.id)
                      : alert("لم تتم الطباعه ! يجب طباعه اولا")
                  }
                />
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export   default ManagerDash;
