import { useState, useEffect, useRef, useContext } from "react";
import axios from "axios";
import { dataContext } from "../../../../App";
import { toast } from "react-toastify";
import io from "socket.io-client";

const BarSocket = io(`${process.env.REACT_APP_API_URL}/bar`, {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});

const Bar = () => {
  const {
    formatDate,
    formatTime,
    isRefresh,
    setIsRefresh,
    cashierSocket,
    kitchenSocket,
    BarSocket,
    GrillSocket,
    waiterSocket,
    apiUrl,
    handleGetTokenAndConfig,
  } = useContext(dataContext);

  const start = useRef();
  const ready = useRef();

  const [orderactive, setOrderActive] = useState([]); // State for active orders
  const [consumptionOrderActive, setConsumptionOrderActive] = useState([]); // State for active orders
  const [allOrders, setAllOrders] = useState([]); // State for all orders

  const [allRecipe, setAllRecipe] = useState([]); // State for all orders

  const getAllRecipe = async () => {
    try {
      const config = await handleGetTokenAndConfig();

      const getAllRecipe = await axios.get(`${apiUrl}/api/recipe`, config);
      const allRecipeData = getAllRecipe.data;
      setAllRecipe(allRecipeData);
    } catch (error) {
      console.error("Error fetching product recipe:", error.message);
    }
  };

  const getAllOrders = async () => {
    try {
      const config = await handleGetTokenAndConfig();

      // Fetch orders from the API
      const ordersResponse = await axios.get(`${apiUrl}/api/order/limit/50`);
      const BarOrders = ordersResponse.data;
      //
      // Set all orders state
      setAllOrders(BarOrders);

      // Filter active orders based on certain conditions
      const activeOrders = BarOrders.filter(
        (order) =>
          order.isActive &&
          order.status === "Approved" &&
          (order.preparationStatus.Bar === "Pending" ||
            order.preparationStatus.Bar === "Preparing" ||
            order.preparationStatus.Bar === "ء")
      );

      // Set active orders state
      setOrderActive(activeOrders);
      const getAllRecipe = await axios.get(`${apiUrl}/api/recipe`, config);
      const allRecipeData = await getAllRecipe.data;

      const allRecipe = allRecipeData;

      const updatedConsumptionOrderActive = [];

      //
      activeOrders &&
        activeOrders.forEach((order) => {
          order.products.forEach((product) => {
            if (!product.isDone) {
              //
              const productIngredients = product.sizeId
                ? allRecipe.find(
                    (recipe) =>
                      recipe.productId._id === product.productId?._id &&
                      recipe.sizeId === product.sizeId
                  )?.ingredients
                : allRecipe.find(
                    (recipe) => recipe.productId._id === product.productId?._id
                  )?.ingredients || [];

              //

              // Update consumptionOrderActive
              productIngredients &&
                productIngredients.forEach((item) => {
                  const existingItemIndex =
                    updatedConsumptionOrderActive.findIndex(
                      (con) => con.itemId?._id === item.itemId?._id
                    );
                  const amount = item.amount * product.quantity;

                  if (existingItemIndex !== -1) {
                    // If the item already exists, update the amount
                    updatedConsumptionOrderActive[existingItemIndex].amount +=
                      amount;
                  } else {
                    // If the item does not exist, add it to the array
                    updatedConsumptionOrderActive.push({
                      itemId: item.itemId,
                      name: item.name,
                      unit: item.unit,
                      amount,
                    });
                  }
                });

              product.extras &&
                product.extras.map((productextra) => {
                  productextra.extraDetails.map((extra) => {
                    const extraIngredients =
                      allRecipe.find(
                        (recipe) => recipe.productId._id === extra.extraId._id
                      )?.ingredients || [];

                    //

                    // Update consumptionOrderActive
                    extraIngredients &&
                      extraIngredients.forEach((item) => {
                        const existingItemIndex =
                          updatedConsumptionOrderActive.findIndex(
                            (con) => con.itemId?._id === item.itemId?._id
                          );
                        const amount = item.amount;

                        if (existingItemIndex !== -1) {
                          // If the item already exists, update the amount
                          updatedConsumptionOrderActive[
                            existingItemIndex
                          ].amount += amount;
                        } else {
                          // If the item does not exist, add it to the array
                          updatedConsumptionOrderActive.push({
                            itemId: item.itemId,
                            name: item.name,
                            unit: item.unit,
                            amount,
                          });
                        }
                      });
                  });
                });
            }
          });
        });

      // Set updated consumptionOrderActive state
      setConsumptionOrderActive(updatedConsumptionOrderActive);
    } catch (error) {
      // Handle errors
      console.error("Error fetching orders:", error);
    }
  };

  const today = formatDate(new Date());
  const [date, setDate] = useState(today);
  const [allBarConsumption, setAllBarConsumption] = useState([]);
  const [filteredBarConsumptionToday, setFilteredBarConsumptionToday] =
    useState([]);

  const getBarConsumption = async () => {
    try {
      const config = await handleGetTokenAndConfig();

      setFilteredBarConsumptionToday([]);

      const response = await axios.get(`${apiUrl}/api/consumption`, config);

      if (response && response.data) {
        const BarConsumptions = response.data.data || [];
        setAllBarConsumption(BarConsumptions);

        const BarConsumptionsToday = BarConsumptions.filter((kitItem) => {
          const itemDate = formatDate(kitItem.createdAt);
          return itemDate === date;
        });

        setFilteredBarConsumptionToday(BarConsumptionsToday);
      } else {
        console.error("Unexpected response or empty data");
      }
    } catch (error) {
      console.error("Error fetching Bar consumption:", error);
      toast.error("حدث خطأ أثناء جلب استهلاك البار");
    }
  };

  // Updates an order status to 'Preparing'

  const orderInProgress = async (id) => {
    try {
      const config = await handleGetTokenAndConfig();
      const preparationStatus = { "preparationStatus.Bar": "Preparing" };
      const response = await axios.put(
        `${apiUrl}/api/order/${id}`,
        preparationStatus,
        config
      );
      if (response.status === 200) {
        // Fetch orders from the API
        await getAllOrders();
        toast.success("الاوردر يجهز!");
      } else {
        toast.error("حدث خطأ اثناء قبول الاوردر ! حاول مره اهري");
      }
    } catch (error) {
      console.error(error);
      toast.error("فش بدء الاوردر ! اعد تحميل الصفحة ");
    }
  };

  const updateOrderDone = async (id, type) => {
    const config = await handleGetTokenAndConfig();

    try {
      // 1. Fetch order and product data
      const { data: orderData } = await axios.get(
        `${apiUrl}/api/order/${id}`,
        config
      );
      const { products: orderProducts } = orderData;
      const BarProducts = orderProducts.filter(
        (product) => product.productId?.department === "Bar"
      );

      if (!BarProducts.length) {
        toast.warn("لا توجد منتجات بحاجة إلى تجهيز في البار");
        return;
      }

      // 2. Fetch today's Bar consumption data
      const { data: consumptionData } = await axios.get(
        `${apiUrl}/api/consumption`,
        config
      );
      const allBarConsumption = consumptionData.data;
      const BarConsumptionsToday = allBarConsumption.filter((item) => {
        const itemDate = formatDate(item.createdAt);
        return itemDate === date;
      });

      // 3. Prepare total consumption order
      const totalConsumptionOrder = [];

      for (const product of BarProducts) {
        if (product.isDone) continue;

        // Fetch product ingredients from recipes
        const productIngredients = product.sizeId
          ? allRecipe.find(
              (recipe) =>
                recipe.productId._id === product.productId?._id &&
                recipe.sizeId === product.sizeId
            )?.ingredients
          : allRecipe.find(
              (recipe) => recipe.productId._id === product.productId?._id
            )?.ingredients || [];

        // Process ingredients
        for (const ingredient of productIngredients || []) {
          const existingItemIndex = totalConsumptionOrder.findIndex(
            (item) => item.itemId?._id === ingredient.itemId?._id
          );

          const amount = ingredient.amount * product.quantity;

          if (existingItemIndex !== -1) {
            totalConsumptionOrder[existingItemIndex].amount += amount;
          } else {
            const BarConsumption = BarConsumptionsToday.find(
              (kitItem) => kitItem.stockItemId._id === ingredient.itemId?._id
            );

            totalConsumptionOrder.push({
              itemId: ingredient.itemId,
              amount,
              productsProduced: BarConsumption
                ? [...BarConsumption.productsProduced]
                : [],
            });
          }
        }

        // Process extras
        for (const extraGroup of product.extras || []) {
          for (const extra of extraGroup.extraDetails) {
            const extraIngredients =
              allRecipe.find(
                (recipe) => recipe.productId._id === extra.extraId._id
              )?.ingredients || [];

            for (const ingredient of extraIngredients) {
              const existingItemIndex = totalConsumptionOrder.findIndex(
                (item) => item.itemId?._id === ingredient.itemId?._id
              );
              const amount = ingredient.amount;

              if (existingItemIndex !== -1) {
                totalConsumptionOrder[existingItemIndex].amount += amount;
              } else {
                totalConsumptionOrder.push({
                  itemId: ingredient.itemId,
                  amount,
                });
              }
            }
          }
        }
      }

      // 4. Update consumption data in the Bar
      for (const item of totalConsumptionOrder) {
        const BarConsumption = BarConsumptionsToday.find(
          (kitItem) => kitItem.stockItemId._id === item.itemId?._id
        );

        if (BarConsumption) {
          const quantityConsumed =
            BarConsumption.quantityConsumed + item.amount;
          const bookBalance = BarConsumption.bookBalance - item.amount;

          await axios.put(
            `${apiUrl}/api/consumption/${BarConsumption._id}`,
            {
              quantityConsumed,
              bookBalance,
              productsProduced: item.productsProduced,
            },
            config
          );
        }
      }

      // 5. Update order status
      const updatedProducts = orderProducts.map((product) => {
        if (
          BarProducts.some(
            (BarProduct) => BarProduct.productId?._id === product.productId._id
          )
        ) {
          return { ...product, isDone: true };
        } else {
          return product;
        }
      });

      // const preparationStatus = { "preparationStatus.Bar": "Prepared" };

      if (type === "Dine-in") {
        const waiter = await specifiedWaiter(id);
        if (!waiter) {
          toast.warn("لا يوجد نادل متاح لتسليم الطلب. يرجى مراجعة الإدارة!");
          return;
        }
        const response = await axios.put(
          `${apiUrl}/api/order/${id}`,
          {
            "preparationStatus.Bar": "Prepared",
            products: updatedProducts,
            waiter,
          },
          config
        );
        if (response) {
          BarSocket.emit("orderReady", `أورد جاهز في البار - ${waiter}`);
        }
      } else {
        await axios.put(
          `${apiUrl}/api/order/${id}`,
          { products: updatedProducts, "preparationStatus.Bar": "Prepared" },
          config
        );
        BarSocket.emit("orderReady", "أورد جاهز في البار");
      }

      // 6. Refresh state
      getAllOrders();
      getBarConsumption();
      toast.success("تم تجهيز الطلب بنجاح!");
    } catch (error) {
      console.error("Error in updating order:", error);
      toast.error("حدث خطأ أثناء تعديل حالة الطلب. يرجى إعادة المحاولة.");
    }
  };

  // Fetches all active waiters from the API

  const [allWaiters, setAllWaiters] = useState([]); // State for active waiters

  const getAllWaiters = async () => {
    try {
      const config = await handleGetTokenAndConfig();

      const allEmployees = await axios.get(apiUrl + "/api/employee", config);

      const allWaiters =
        allEmployees.data.length > 0
          ? allEmployees.data.filter((employee) => employee.role === "waiter")
          : [];
      const waiterActive =
        allWaiters.length > 0
          ? allWaiters.filter((waiter) => waiter.isActive === true)
          : [];
      setAllWaiters(waiterActive);
    } catch (error) {}
  };

  // Determines the next available waiter to take an order
  const specifiedWaiter = async (id) => {
    try {
      const config = await handleGetTokenAndConfig();

      if (allWaiters.length === 0) {
        // Handle case where token is not available
        toast.warn(
          "قائمه الندلاء فارغه ! رجاء اعاده تحميل الصفحة و اذا ظلت المشكله ابلغ الاداره"
        );
        return;
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

  // Calculates the waiting time for an order
  const waitingTime = (t) => {
    const t1 = new Date(t).getTime();
    const t2 = new Date().getTime();
    const elapsedTime = t2 - t1;

    const minutesPassed = Math.floor(elapsedTime / (1000 * 60));
    return minutesPassed;
  };

  // Fetches orders and active waiters on initial render
  useEffect(() => {
    getAllRecipe();
    getAllWaiters();
    getAllOrders();
    getBarConsumption();
  }, []);

  useEffect(() => {
    getAllRecipe();
    getAllWaiters();
    getAllOrders();
    getBarConsumption();
  }, [isRefresh]);

  return (
    <div
      className="w-100 h-100 d-flex flex-wrap align-content-start justify-content-around align-items-start  overflowY-auto bg-transparent p-1"
      style={{ backgroundColor: "rgba(0, 0, 255, 0.1)" }}
    >
      <div
        className="col-12 h-auto mb-1 pb-1 d-flex flex-wrap justify-content-around align-items-start"
        style={{ borderBottom: "1px solid red" }}
      >
        {orderactive &&
          consumptionOrderActive &&
          consumptionOrderActive.map((item, index) => (
            <div
              className="card bg-primary text-white"
              style={{ height: "100px", width: "130px" }}
              key={index}
            >
              <div
                className="card-body d-flex flex-column justify-content-center text-center"
                style={{ padding: "5px" }}
              >
                <h5
                  className="card-title text-center"
                  style={{ fontSize: "16px", fontWeight: "600" }}
                >
                  {item.name}
                </h5>
                <p
                  className="card-text text-center"
                  style={{ fontSize: "14px", fontWeight: "500" }}
                >
                  الرصيد:{" "}
                  {filteredBarConsumptionToday.find(
                    (cons) => cons.stockItemId._id === item.itemId?._id
                  )
                    ? filteredBarConsumptionToday.find(
                        (cons) => cons.stockItemId._id === item.itemId?._id
                      ).bookBalance
                    : "0"}{" "}
                  {item.unit}
                </p>
                <p
                  className="card-text text-center"
                  style={{ fontSize: "14px", fontWeight: "500" }}
                >
                  المطلوب: {item.amount}
                </p>
              </div>
            </div>
          ))}
      </div>

      <div className="col-12 d-flex flex-wrap justify-content-around align-items-start">
        {orderactive &&
          orderactive.map((order, i) => {
            if (
              order.products.filter(
                (product) =>
                  product.isDone === false &&
                  product.productId?.department === "Bar"
              ).length > 0
            ) {
              return (
                <div className="col-lg-3 col-md-4 col-sm-6 col-12 mb-4" key={i}>
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
                          {" "}
                          {order.table != null
                            ? `طاولة: ${order.table.tableNumber}`
                            : order.user
                            ? `العميل: ${order.user.username}`
                            : ""}
                        </p>
                        <p className="card-text">
                          رقم الطلب: {order.orderNum ? order.orderNum : ""}
                        </p>
                        <p className="card-text">الفاتورة: {order.serial}</p>
                        <p className="card-text">
                          نوع الطلب: {order.orderType}
                        </p>
                      </div>

                      <div className="col-6 p-0">
                        {order.waiter ? (
                          <p className="card-text">
                            الويتر: {order.waiter && order.waiter?.username}
                          </p>
                        ) : (
                          ""
                        )}
                        <p className="card-text">
                          الاستلام: {formatTime(order.createdAt)}
                        </p>
                        <p className="card-text">
                          الانتظار:{" "}
                          {setTimeout(() => waitingTime(order.updateAt), 60000)}{" "}
                          دقيقه
                        </p>
                      </div>
                    </div>
                    <ul className="list-group list-group-flush">
                      {order.products
                        .filter(
                          (product) =>
                            product.isDone === false &&
                            product.productId?.department === "Bar"
                        )
                        .map((product, i) => {
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
                    <div className="card-footer text-center w-100 d-flex flex-row">
                      {order.preparationStatus.Bar === "Preparing" ? (
                        <button
                          className="btn w-100 btn-warning h-100 btn btn-lg"
                          onClick={() => {
                            updateOrderDone(order._id, order.orderType);
                          }}
                        >
                          تم التنفيذ
                        </button>
                      ) : order.status === "Approved" ? (
                        <button
                          className="btn w-100 btn-primary h-100 btn btn-lg"
                          onClick={() => orderInProgress(order._id)}
                        >
                          بدء التنفيذ
                        </button>
                      ) : (
                        ""
                      )}
                    </div>
                  </div>
                </div>
              );
            } else if (
              order.preparationStatus.Bar === "Prepared" &&
              order.products.filter(
                (pr) => pr.isDone === true && pr.isDeleverd === false
              ).length > 0
            ) {
              return (
                <div className="col-md-4 mb-4" key={i}>
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
                          {" "}
                          {order.table != null
                            ? `طاولة: ${order.table.tableNumber}`
                            : order.user
                            ? `العميل: ${order.user.username}`
                            : ""}
                        </p>
                        <p className="card-text">
                          رقم الطلب: {order.orderNum ? order.orderNum : ""}
                        </p>
                        <p className="card-text">الفاتورة: {order.serial}</p>
                        <p className="card-text">
                          نوع الطلب: {order.orderType}
                        </p>
                      </div>

                      <div className="col-6 p-0">
                        {order.waiter ? (
                          <p className="card-text">
                            الويتر: {order.waiter && order.waiter.username}
                          </p>
                        ) : (
                          ""
                        )}
                        <p className="card-text">
                          الاستلام: {formatTime(order.createdAt)}
                        </p>
                        <p className="card-text">
                          الانتظار:{" "}
                          {setTimeout(() => waitingTime(order.updateAt), 60000)}{" "}
                          دقيقه
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
                    <div className="card-footer text-center w-100 d-flex flex-row">
                      <button className="btn w-100 btn-info h-100 btn btn-lg">
                        انتظار الاستلام
                      </button>
                    </div>
                  </div>
                </div>
              );
            }
          })}
      </div>
    </div>
  );
};

export default Bar;
