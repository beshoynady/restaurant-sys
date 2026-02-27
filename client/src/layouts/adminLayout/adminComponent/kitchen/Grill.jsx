import { useState, useEffect, useRef, useContext } from "react";
import axios from "axios";
import { dataContext } from "../../../../context/appContext";
import { toast } from "react-toastify";

const Grill = () => {
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

  const [PreparationTicketActive, setPreparationTicketActive] = useState([]); // State for active Tickets
  const [
    consumptionPreparationTicketActive,
    setConsumptionPreparationTicketActive,
  ] = useState([]); // State for active Tickets

  const [AllPreparationTicket, setAllPreparationTicket] = useState([]); // State for all Tickets

  const [allRecipe, setAllRecipe] = useState([]); // State for all Tickets

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

  const getAllPreparationTicket = async (Section) => {
    try {
      const config = await handleGetTokenAndConfig();

      // Fetch Tickets from the API
      const Response = await axios.get(
        `${apiUrl}/api/preparationticket`,
        config
      );

      const PreparationTicket = Response.data.data;

      //
      // Set all Tickets state
      setAllPreparationTicket(PreparationTicket);
      const kitchenPreparationTicket = PreparationTicket.filter(
        (ticket) =>
          ticket.department._id === Section && ticket.isActive === true
      );

      // Set active Tickets state
      setPreparationTicketActive(kitchenPreparationTicket);

      const getAllRecipe = await axios.get(`${apiUrl}/api/recipe`, config);
      const allRecipeData = await getAllRecipe.data;
      const allRecipe = allRecipeData;
      const updatedConsumptionPreparationTicketActive = [];

      //
      kitchenPreparationTicket &&
        kitchenPreparationTicket.forEach((ticket) => {
          ticket.products.forEach((product) => {
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

              // Update consumptionPreparationTicketActive
              productIngredients &&
                productIngredients.forEach((item) => {
                  const existingItemIndex =
                    updatedConsumptionPreparationTicketActive.findIndex(
                      (con) => con.itemId?._id === item.itemId?._id
                    );
                  const amount = item.amount * product.quantity;

                  if (existingItemIndex !== -1) {
                    // If the item already exists, update the amount
                    updatedConsumptionPreparationTicketActive[
                      existingItemIndex
                    ].amount += amount;
                  } else {
                    // If the item does not exist, add it to the array
                    updatedConsumptionPreparationTicketActive.push({
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

                    // Update consumptionPreparationTicketActive
                    extraIngredients &&
                      extraIngredients.forEach((item) => {
                        const existingItemIndex =
                          updatedConsumptionPreparationTicketActive.findIndex(
                            (con) => con.itemId?._id === item.itemId?._id
                          );
                        const amount = item.amount;

                        if (existingItemIndex !== -1) {
                          // If the item already exists, update the amount
                          updatedConsumptionPreparationTicketActive[
                            existingItemIndex
                          ].amount += amount;
                        } else {
                          // If the item does not exist, add it to the array
                          updatedConsumptionPreparationTicketActive.push({
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

      // Set updated consumptionPreparationTicketActive state
      setConsumptionPreparationTicketActive(
        updatedConsumptionPreparationTicketActive
      );
    } catch (error) {
      // Handle errors
      console.error("Error fetching Tickets:", error);
    }
  };
  const today = formatDate(new Date());
  const [date, setDate] = useState(today);
  const [allKitchenConsumption, setAllKitchenConsumption] = useState([]);
  const [filteredKitchenConsumptionToday, setFilteredKitchenConsumptionToday] =
    useState([]);

  const getKitchenConsumption = async () => {
    try {
      const config = await handleGetTokenAndConfig();

      setFilteredKitchenConsumptionToday([]);
      //

      const response = await axios.get(`${apiUrl}/api/consumption`, config);

      if (response && response.data) {
        const kitchenConsumptions = response.data.data || [];
        setAllKitchenConsumption(kitchenConsumptions);

        const kitchenConsumptionsToday = kitchenConsumptions.filter(
          (kitItem) => {
            const itemDate = formatDate(kitItem.createdAt);
            return itemDate === date;
          }
        );

        //
        setFilteredKitchenConsumptionToday(kitchenConsumptionsToday);
      } else {
        console.error("Unexpected response or empty data");
      }
    } catch (error) {
      console.error("Error fetching kitchen consumption:", error);
      toast.error("حدث خطأ أثناء جلب استهلاك المطبخ");
    }
  };

  // Updates an Ticket status to 'Preparing'

  const TicketInProgress = async (id) => {
    try {
      const config = await handleGetTokenAndConfig();
      const preparationStatus = "Preparing";
      const response = await axios.put(
        `${apiUrl}/api/preparationticket/${id}`,
        { preparationStatus },
        config
      );

      if (response.status === 200) {
        // Fetch Tickets from the API
        getAllPreparationTicket();
        toast.success("الاوردر يجهز!");
      } else {
        toast.error("حدث خطأ اثناء قبول الاوردر ! حاول مره اهري");
      }
    } catch (error) {
      console.error(error);
      toast.error("فش بدء الاوردر ! اعد تحميل الصفحة ");
    }
  };

  const updateTicketDone = async (id, type) => {
    const config = await handleGetTokenAndConfig();

    try {
      // 1. Fetch Ticket and product data
      const preparationticketData = await axios.get(
        `${apiUrl}/api/preparationticket/${id}`,
        config
      );
      const { products: kitchenProducts } = preparationticketData.data.data;
      const orderId = await preparationticketData.data.data?.order._id;
      const orderProducts = preparationticketData.data.data.order?.products;
      //

      if (!kitchenProducts.length) {
        toast.warn("لا توجد منتجات بحاجة إلى تجهيز في المطبخ");
        return;
      }

      // 2. Fetch today's kitchen consumption data
      const { data: consumptionData } = await axios.get(
        `${apiUrl}/api/consumption`,
        config
      );
      const allKitchenConsumption = consumptionData.data;
      const kitchenConsumptionsToday = allKitchenConsumption.filter((item) => {
        const itemDate = formatDate(item.createdAt);
        return itemDate === date;
      });

      // 3. Prepare total consumption Ticket
      const totalConsumptionTicket = [];

      for (const product of kitchenProducts) {
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
          const existingItemIndex = totalConsumptionTicket.findIndex(
            (item) => item.itemId?._id === ingredient.itemId?._id
          );

          const amount = ingredient.amount * product.quantity;

          if (existingItemIndex !== -1) {
            totalConsumptionTicket[existingItemIndex].amount += amount;
          } else {
            const kitchenConsumption = kitchenConsumptionsToday.find(
              (kitItem) => kitItem.stockItemId._id === ingredient.itemId?._id
            );

            totalConsumptionTicket.push({
              itemId: ingredient.itemId,
              amount,
              productsProduced: kitchenConsumption
                ? [...kitchenConsumption.productsProduced]
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
              const existingItemIndex = totalConsumptionTicket.findIndex(
                (item) => item.itemId?._id === ingredient.itemId?._id
              );
              const amount = ingredient.amount;

              if (existingItemIndex !== -1) {
                totalConsumptionTicket[existingItemIndex].amount += amount;
              } else {
                totalConsumptionTicket.push({
                  itemId: ingredient.itemId,
                  amount,
                });
              }
            }
          }
        }
      }

      // 4. Update consumption data in the kitchen
      for (const item of totalConsumptionTicket) {
        const kitchenConsumption = kitchenConsumptionsToday.find(
          (kitItem) => kitItem.stockItemId._id === item.itemId?._id
        );

        if (kitchenConsumption) {
          const quantityConsumed =
            kitchenConsumption.quantityConsumed + item.amount;
          const bookBalance = kitchenConsumption.bookBalance - item.amount;

          await axios.put(
            `${apiUrl}/api/consumption/${kitchenConsumption._id}`,
            {
              quantityConsumed,
              bookBalance,
              productsProduced: item.productsProduced,
            },
            config
          );
        }
      }

      const updateTicketProducts = kitchenProducts.map((product) => {
        return { ...product, isDone: true };
      });

      // 5. Update Ticket Products
      const updatedOrderProducts = orderProducts.map((product) =>
        kitchenProducts.some(
          (kitchenProduct) =>
            kitchenProduct.productId?._id === product.productId?._id
        )
          ? { ...product, isDone: true }
          : product
      );

      //

      if (type === "Dine-in") {
        const waiter = await specifiedWaiter(id);

        if (!waiter) {
          toast.warn("لا يوجد نادل متاح لتسليم الطلب. يرجى مراجعة الإدارة!");
          return;
        }
        const response = await axios.put(
          `${apiUrl}/api/order/${orderId}`,
          {
            products: updatedOrderProducts,
            waiter,
          },
          config
        );
        const updateTicket = axios.put(
          `${apiUrl}/api/preparationticket/${id}`,
          {
            products: updateTicketProducts,
            preparationStatus: "Prepared",
            waiter,
          },
          config
        );

        waiterSocket.emit("orderReady", `أورد جاهز في المطبخ-${waiter}`);
      } else {
        await axios.put(
          `${apiUrl}/api/order/${orderId}`,
          {
            products: updatedOrderProducts,
          },
          config
        );
        const updateTicket = axios.put(
          `${apiUrl}/api/preparationticket/${id}`,
          { products: updateTicketProducts, preparationStatus: "Prepared" },
          config
        );
        waiterSocket.emit("orderReady", "أورد جاهز في المطبخ");
      }

      // 6. Refresh state
      // getAllPreparationTicket();
      getKitchenConsumption();
      toast.success("تم تجهيز الطلب بنجاح!");
    } catch (error) {
      console.error("Error in updating Ticket:", error);
      toast.error("حدث خطأ أثناء تعديل حالة الطلب. يرجى إعادة المحاولة.");
    }
  };

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

  // Determines the next available waiter to take an Ticket
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
      const getTicket = AllPreparationTicket.find(
        (Ticket) => Ticket._id === id
      );
      if (!getTicket) {
        throw new Error("Ticket not found");
      }
      //

      if (getTicket.status) {
      }
      // استخراج رقم القسم من بيانات الطاولة المرتبطة بالطلب
      const tablesectionNumber =
        getTicket.order?.table && getTicket.order?.table?.sectionNumber;
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

      const TicketSection = AllPreparationTicket.filter(
        (Ticket) =>
          Ticket.waiter && Ticket.waiter?.sectionNumber === tablesectionNumber
      ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      let waiterId = "";

      if (TicketSection.length > 0) {
        const lastWaiterId = TicketSection[0]?.waiter?._id;
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

      //

      return waiterId;
    } catch (error) {
      console.error("Error fetching table or waiter data:", error);
      return "";
    }
  };

  // Calculates the waiting time for an Ticket
  const waitingTime = (t) => {
    const t1 = new Date(t).getTime();
    const t2 = new Date().getTime();
    const elapsedTime = t2 - t1;

    const minutesPassed = Math.floor(elapsedTime / (1000 * 60));
    return minutesPassed;
  };

  // Fetches Tickets and active waiters on initial render
  useEffect(() => {
    getAllRecipe();
    getAllWaiters();
    // getAllPreparationTicket();
    getKitchenConsumption();
    getAlldepartments();
  }, []);

  useEffect(() => {
    getAllRecipe();
    getAllWaiters();
    // getAllPreparationTicket();
    getKitchenConsumption();
  }, [isRefresh]);

  return (
    <div
      className="w-100 h-100 d-flex flex-column align-items-start overflow-auto bg-transparent p-1"
      style={{ backgroundColor: "rgba(0, 0, 255, 0.1)" }}
    >
      {/* Row containing section selection and ticket data boxes */}
      <div className="w-100 d-flex align-items-start justify-content-between bg-transparent mb-3">
        {/* Section selection dropdown */}
        <div className="d-flex flex-column align-items-start bg-white shadow-sm rounded p-2 me-3">
          <label
            htmlFor="section-select"
            className="fw-bold text-dark"
            style={{ fontSize: "1.2rem" }}
          >
            اختر القسم:
          </label>
          <select
            id="section-select"
            className="form-select"
            onChange={(e) => getAllPreparationTicket(e.target.value)}
          >
            <option value="" disabled selected>
              اختر القسم
            </option>
            {alldepartments &&
              alldepartments.map((section) => (
                <option key={section._id} value={section._id}>
                  {section.name}
                </option>
              ))}
          </select>
        </div>

        {/* Ticket data boxes */}
        <div className="d-flex flex-wrap justify-content-start">
          {/* Waiting tickets box */}
          <div
            className="ticket-box text-center p-3 bg-light rounded shadow-sm m-1"
            style={{ width: "200px" }}
          >
            <h5 className="fw-bold text-dark" style={{ fontSize: "1.2rem" }}>
              انتظار الموافقة
            </h5>
            <p className="display-6 text-primary">5</p>
          </div>

          {/* In-progress tickets box */}
          <div
            className="ticket-box text-center p-3 bg-light rounded shadow-sm m-1"
            style={{ width: "200px" }}
          >
            <h5 className="fw-bold text-dark" style={{ fontSize: "1.2rem" }}>
              جاري التنفيذ
            </h5>
            <p className="display-6 text-warning">3</p>
          </div>

          {/* Completed tickets box */}
          <div
            className="ticket-box text-center p-3 bg-light rounded shadow-sm m-1"
            style={{ width: "200px" }}
          >
            <h5 className="fw-bold text-dark" style={{ fontSize: "1.2rem" }}>
              تم التنفيذ
            </h5>
            <p className="display-6 text-success">10</p>
          </div>
        </div>
      </div>

      <div
        className="col-12 h-auto mb-1 pb-1 d-flex flex-wrap justify-content-around align-items-start"
        style={{ bTicketBottom: "1px solid red" }}
      >
        {PreparationTicketActive &&
          consumptionPreparationTicketActive &&
          consumptionPreparationTicketActive.map((item, index) => (
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
                  {filteredKitchenConsumptionToday.find(
                    (cons) => cons.stockItemId._id === item.itemId?._id
                  )
                    ? filteredKitchenConsumptionToday.find(
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
        {PreparationTicketActive &&
          PreparationTicketActive.map((Ticket, i) => {
            if (
              Ticket.products.filter((product) => product.isDone === false)
                .length > 0
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
                          {Ticket.table != null
                            ? `طاولة: ${Ticket.table?.tableNumber}`
                            : Ticket.user
                            ? `العميل: ${Ticket.user?.username}`
                            : ""}
                        </p>
                        <p className="card-text">
                          رقم الطلب: {Ticket.TicketNum ? Ticket.TicketNum : ""}
                        </p>
                        <p className="card-text">الفاتورة: {Ticket.serial}</p>
                        <p className="card-text">
                          نوع الطلب: {Ticket.TicketType}
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
                          {setTimeout(
                            () => waitingTime(Ticket.updateAt),
                            60000
                          )}{" "}
                          دقيقه
                        </p>
                      </div>
                    </div>
                    <ul className="list-group list-group-flush">
                      {Ticket.products
                        // .filter(
                        //   (product) =>
                        //     product.isDone === false &&
                        //     product.productId?.department === "Kitchen"
                        // )
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
                      {Ticket.preparationStatus === "Preparing" ? (
                        <button
                          className="btn w-100 btn-warning h-100 btn btn-lg"
                          onClick={() => {
                            updateTicketDone(
                              Ticket._id,
                              Ticket.order.orderType
                            );
                          }}
                        >
                          تم التنفيذ
                        </button>
                      ) : Ticket.preparationStatus === "Pending" ? (
                        <button
                          className="btn w-100 btn-primary h-100 btn btn-lg"
                          onClick={() => TicketInProgress(Ticket._id)}
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
              Ticket.preparationStatus === "Prepared" &&
              Ticket.products.filter(
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
                          {Ticket.table != null
                            ? `طاولة: ${Ticket.table.tableNumber}`
                            : Ticket.user
                            ? `العميل: ${Ticket.user.username}`
                            : ""}
                        </p>
                        <p className="card-text">
                          رقم الطلب: {Ticket.TicketNum ? Ticket.TicketNum : ""}
                        </p>
                        <p className="card-text">الفاتورة: {Ticket.serial}</p>
                        <p className="card-text">
                          نوع الطلب: {Ticket.TicketType}
                        </p>
                      </div>

                      <div className="col-6 p-0">
                        {Ticket.waiter ? (
                          <p className="card-text">
                            الويتر: {Ticket.waiter && Ticket.waiter.username}
                          </p>
                        ) : (
                          ""
                        )}
                        <p className="card-text">
                          الاستلام: {formatTime(Ticket.createdAt)}
                        </p>
                        <p className="card-text">
                          الانتظار:{" "}
                          {setTimeout(
                            () => waitingTime(Ticket.updateAt),
                            60000
                          )}{" "}
                          دقيقه
                        </p>
                      </div>
                    </div>
                    <ul className="list-group list-group-flush">
                      {Ticket.products
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

export default Grill;
