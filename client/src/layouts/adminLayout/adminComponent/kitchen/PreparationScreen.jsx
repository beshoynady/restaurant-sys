import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { dataContext } from "../../../../context/appContext";
import { toast } from "react-toastify";

const PreparationScreen = () => {
  const {
    formatTime,
    formatDate,
    isRefresh,
    setIsRefresh,
    waiterSocket,
    apiUrl,
    handleGetTokenAndConfig,
  } = useContext(dataContext);

  const [departments, setdepartments] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [AllPreparationTicket, setAllPreparationTicket] = useState([]); // State for all Tickets
  const [TicketsToday, setTicketsToday] = useState([]); // State for all Tickets
  const [activeTickets, setActiveTickets] = useState([]);

  const [consumptionItems, setConsumptionItems] = useState([]);
  const [sectionStats, setSectionStats] = useState({
    waitingApproval: 0,
    inProgress: 0,
    waitingPickup: 0,
    completed: 0,
    rejected: 0,
  });
  const [allRecipe, setAllRecipe] = useState([]); // State for all Tickets
  const [filteredSectionConsumptionToday, setFilteredSectionConsumptionToday] =
    useState([]);
  const [allWaiters, setAllWaiters] = useState([]); // State for active waiters

  const today = formatDate(new Date());
  const [date, setDate] = useState(today);
  const [activeTab, setActiveTab] = useState("newTickets");

  // Fetch all preparation sections
  const fetchdepartments = async () => {
    const config = await handleGetTokenAndConfig();

    try {
      const response = await axios.get(`${apiUrl}/api/department`, config);
      if (response.status === 200) {
        setdepartments(response.data.data);
      } else {
        throw new Error("Failed to fetch sections.");
      }
    } catch (error) {
      console.error("Error fetching preparation sections:", error);
      toast.error(
        "An error occurred while fetching sections. Please try again later."
      );
    }
  };

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

  // Fetch tickets and consumption items for the selected section
  const fetchSectionData = async (sectionId) => {
    const config = await handleGetTokenAndConfig();

    try {
      const response = await axios.get(
        `${apiUrl}/api/preparationticket`,
        config
      );
      const tickets = response.data.data;
      setAllPreparationTicket([...tickets]);

      const filteredTicketsToday = tickets.filter((ticket) => {
        const itemDate = formatDate(ticket.createdAt);
        return itemDate === date && ticket.department._id === sectionId;
      });
      setTicketsToday(filteredTicketsToday);

      const filteredTicketsSectionIsActive = filteredTicketsToday.filter(
        (ticket) => ticket.isActive
      );

      setActiveTickets(filteredTicketsSectionIsActive);

      // Update section stats
      const stats = {
        waitingApproval: filteredTicketsToday.filter(
          (ticket) => ticket.preparationStatus === "Pending"
        ).length,
        inProgress: filteredTicketsToday.filter(
          (ticket) => ticket.preparationStatus === "Preparing"
        ).length,
        waitingPickup: filteredTicketsToday.filter(
          (ticket) => ticket.preparationStatus === "Prepared"
        ).length,
        completed: filteredTicketsToday.filter(
          (ticket) => ticket.preparationStatus === "Delivered"
        ).length,
        rejected: filteredTicketsToday.filter(
          (ticket) => ticket.preparationStatus === "Rejected"
        ).length,
      };
      console.log({
        filteredTicketsToday,
        filteredTicketsSectionIsActive,
        stats,
      });
      setSectionStats(stats);

      // Fetch consumption items
      const recipeResponse = await axios.get(`${apiUrl}/api/recipe`, config);
      const recipes = recipeResponse.data;

      const updatedConsumptionItems = [];
      filteredTicketsSectionIsActive.forEach((Ticket) => {
        if (
          Ticket.preparationStatus === "Pending" ||
          Ticket.preparationStatus === "Preparing"
        ) {
          Ticket.products.forEach((product) => {
            if (!product.isDone) {
              const ingredients =
                recipes.find(
                  (recipe) => recipe.productId._id === product.productId?._id
                )?.ingredients || [];

              ingredients.forEach((ingredient) => {
                const existingItemIndex = updatedConsumptionItems.findIndex(
                  (item) => item.itemId?._id === ingredient.itemId?._id
                );
                const amount = ingredient.amount * product.quantity;

                if (existingItemIndex !== -1) {
                  updatedConsumptionItems[existingItemIndex].amount += amount;
                } else {
                  updatedConsumptionItems.push({
                    itemId: ingredient.itemId,
                    name: ingredient.name,
                    unit: ingredient.unit,
                    amount,
                  });
                }
              });
            }
          });
        }
      });

      setConsumptionItems(updatedConsumptionItems);
    } catch (error) {
      console.error("Error fetching section data:", error);
      toast.error("An error occurred while fetching data for the section.");
    }
  };

  const getSectionConsumption = async () => {
    try {
      const config = await handleGetTokenAndConfig();

      setFilteredSectionConsumptionToday([]);
      //

      const response = await axios.get(`${apiUrl}/api/consumption`, config);

      if (response && response.data) {
        const SectionConsumptions = response.data.data || [];
        setConsumptionItems(SectionConsumptions);

        const SectionConsumptionsToday = SectionConsumptions.filter(
          (sectionItem) => {
            const itemDate = formatDate(sectionItem.createdAt);
            return itemDate === date;
          }
        );

        //
        setFilteredSectionConsumptionToday(SectionConsumptionsToday);
      } else {
        console.error("Unexpected response or empty data");
      }
    } catch (error) {
      console.error("Error fetching Section consumption:", error);
      toast.error("حدث خطأ أثناء جلب استهلاك المطبخ");
    }
  };

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
  const specifiedWaiter = async (TicketId) => {
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
        (Ticket) => Ticket._id === TicketId
      );
      if (!getTicket) {
        throw new Error("Ticket not found");
      }
      //

      if (getTicket.status) {
      }
      // استخراج رقم القسم من بيانات الطاولة المرتبطة بالطلب
      const tableSectionNumber =
        getTicket.order?.table && getTicket.order?.table?.sectionNumber;
      if (!tableSectionNumber) {
        throw new Error("Table section number not found");
      }

      // البحث عن النوادل في القسم المحدد
      const sectionWaiters = allWaiters.filter(
        (waiter) => waiter.sectionNumber === tableSectionNumber
      );
      if (sectionWaiters.length === 0) {
        throw new Error("No waiters found in the specified section");
      }

      const TicketSection = AllPreparationTicket.filter(
        (Ticket) =>
          Ticket.waiter && Ticket.waiter?.sectionNumber === tableSectionNumber
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

      return waiterId;
    } catch (error) {
      console.error("Error fetching table or waiter data:", error);
      return "";
    }
  };

  const TicketInProgress = async (ticketId, status) => {
    const config = await handleGetTokenAndConfig();

    try {
      const response = await axios.put(
        `${apiUrl}/api/preparationticket/${ticketId}`,
        { preparationStatus: status },
        config
      );

      if (response.status === 200) {
        toast.success(`Ticket status updated to ${status}.`);
        fetchSectionData(selectedSectionId);
      } else {
        throw new Error("Failed to update ticket status.");
      }
    } catch (error) {
      console.error("Error updating ticket status:", error);
      toast.error("An error occurred while updating ticket status.");
    }
  };

  const updateTicketDone = async (ticketId) => {
    const config = await handleGetTokenAndConfig();

    try {
      // 1. Fetch Ticket and product data
      const fetchPreparationTicketData = await axios.get(
        `${apiUrl}/api/preparationticket/${ticketId}`,
        config
      );
      const preparationTicketData = fetchPreparationTicketData.data.data;
      const { products: ticketProducts } = preparationTicketData;
      const orderType = preparationTicketData.order?.orderType;
      const orderId = await preparationTicketData?.order._id;
      const orderProducts = preparationTicketData.order?.products;
      console.log({
        preparationTicketData: preparationTicketData,
        orderId,
        orderType,
        orderProducts,
        ticketProducts,
      });

      if (!ticketProducts.length) {
        toast.warn("لا توجد منتجات بحاجة إلى تجهيز في المطبخ");
        return;
      }

      // 2. Fetch today's Section consumption data
      const { data: consumptionData } = await axios.get(
        `${apiUrl}/api/consumption`,
        config
      );
      const allSectionConsumption = consumptionData.data;
      const SectionConsumptionsToday = allSectionConsumption.filter((item) => {
        const itemDate = formatDate(item.createdAt);
        return itemDate === date;
      });

      // 3. Prepare total consumption Ticket
      const totalConsumptionTicket = [];

      for (const product of ticketProducts) {
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
            const SectionConsumption = SectionConsumptionsToday.find(
              (sectionItem) =>
                sectionItem.stocsectionemId._id === ingredient.itemId?._id
            );

            totalConsumptionTicket.push({
              itemId: ingredient.itemId,
              amount,
              productsProduced: SectionConsumption
                ? [...SectionConsumption.productsProduced]
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

      // 4. Update consumption data in the Section
      for (const item of totalConsumptionTicket) {
        const SectionConsumption = SectionConsumptionsToday.find(
          (sectionItem) => sectionItem.stocsectionemId._id === item.itemId?._id
        );

        if (SectionConsumption) {
          const quantityConsumed =
            SectionConsumption.quantityConsumed + item.amount;
          const bookBalance = SectionConsumption.bookBalance - item.amount;

          await axios.put(
            `${apiUrl}/api/consumption/${SectionConsumption._id}`,
            {
              quantityConsumed,
              bookBalance,
              productsProduced: item.productsProduced,
            },
            config
          );
        }
      }

      // const updateTicketProducts = ticketProducts.map((product) => {
      //   return { ...product, isDone: true };
      // });

      // 5. Update Ticket Products
      const updatedOrderProducts = orderProducts.map((product) =>
        ticketProducts.some(
          (ticketProduct) =>
            ticketProduct.orderproductId === product.productId?._id
        )
          ? { ...product, isDone: true }
          : product
      );

      //

      if (orderType === "Dine-in") {
        const waiter = await specifiedWaiter(ticketId);

        if (!waiter) {
          toast.warn("لا يوجد نادل متاح لتسليم الطلب. يرجى مراجعة الإدارة!");
          return;
        }
        const updateOrder = await axios.put(
          `${apiUrl}/api/order/${orderId}`,
          {
            products: updatedOrderProducts,
            // waiter,
          },
          config
        );
        const updateTicket = axios.put(
          `${apiUrl}/api/preparationticket/${ticketId}`,
          {
            // products: updateTicketProducts,
            preparationStatus: "Prepared",
            isDone: true,
            waiter,
          },
          config
        );

        waiterSocket.emit("orderReady", `أورد جاهز في المطبخ-${waiter}`);
      } else {
        const updateOrder = await axios.put(
          `${apiUrl}/api/order/${orderId}`,
          {
            products: updatedOrderProducts,
          },
          config
        );
        const updateTicket = axios.put(
          `${apiUrl}/api/preparationticket/${ticketId}`,
          { preparationStatus: "Prepared", isDone: true },
          config
        );

        waiterSocket.emit("orderReady", "أورد جاهز في المطبخ");
      }

      // 6. Refresh state
      // getAllPreparationTicket();
      getSectionConsumption();
      toast.success("تم تجهيز الطلب بنجاح!");
    } catch (error) {
      console.error("Error in updating Ticket:", error);
      toast.error("حدث خطأ أثناء تعديل حالة الطلب. يرجى إعادة المحاولة.");
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const waitingTime = (t) => {
    const t1 = new Date(t).getTime();
    const t2 = new Date().getTime();
    const elapsedTime = t2 - t1;

    const minutesPassed = Math.floor(elapsedTime / (1000 * 60));
    return minutesPassed;
  };

  useEffect(() => {
    getAllRecipe();
    getAllWaiters();
    getSectionConsumption();
    fetchdepartments();
  }, []);

  useEffect(() => {
    if (selectedSectionId) {
      getAllRecipe();
      getAllWaiters();
      fetchSectionData(selectedSectionId);
    }
  }, [selectedSectionId, isRefresh]);

  return (
    <div
      className="w-100 d-flex align-items-start overflow-auto bg-transparent p-2"
      style={{ backgroundColor: "rgba(0, 0, 255, 0.1)" }}
    >
      {/* Section selection and ticket stats */}
      <div
        className=" d-flex col-lg-2 col-sm-3 flex-column align-items-start justify-content-between p-1 mb-3"
        style={{ alignItems: "flex-end", maxWidth: "150px" }}
      >
        {/* Section selection */}
        <div className="d-flex flex-column align-items-end bg-white shadow-sm rounded p-2 mb-3 w-100">
          <label
            htmlFor="section-select"
            className="w-100 fw-bold text-dark text-center"
            style={{ fontSize: "1.2rem" }}
          >
            اختر القسم:
          </label>
          <select
            id="section-select"
            className="w-100 form-select"
            onChange={(e) => setSelectedSectionId(e.target.value)}
          >
            <option value="" disabled selected>
              اختر القسم
            </option>
            {departments.map((section) => (
              <option key={section._id} value={section._id}>
                {section.name}
              </option>
            ))}
          </select>
        </div>

        {/* Ticket stats */}
        <div className="w-100 d-flex flex-column align-items-end justify-content-between flex-wrap">
          <div className="ticket-box text-center bg-light shadow-sm rounded w-100 p-2 mb-2">
            <h6 className="text-dark">انتظار الموافقة</h6>
            <p className="text-primary">{sectionStats.waitingApproval}</p>
          </div>
          <div className="ticket-box text-center bg-light shadow-sm rounded w-100 p-2 mb-2">
            <h6 className="text-dark">جاري التنفيذ</h6>
            <p className="text-warning">{sectionStats.inProgress}</p>
          </div>
          <div className="ticket-box text-center bg-light shadow-sm rounded w-100 p-2 mb-2">
            <h6 className="text-dark">انتظار الاستلام</h6>
            <p className="text-warning">{sectionStats.waitingPickup}</p>
          </div>
          <div className="ticket-box text-center bg-light shadow-sm rounded w-100 p-2 mb-2">
            <h6 className="text-dark">تم التنفيذ</h6>
            <p className="text-success">{sectionStats.completed}</p>
          </div>
          <div className="ticket-box text-center bg-light shadow-sm rounded w-100 p-2 mb-2">
            <h6 className="text-dark">مرفوض</h6>
            <p className="text-danger">{sectionStats.rejected}</p>
          </div>
        </div>
      </div>

      {/* Preparation Ticket Details */}
      <div className=" d-flex col-lg-10 col-sm-9 flex-column justify-content-between align-items-start p-0 m-0">
        <div className="w-100 d-flex justify-content-between align-items-center bg-transparent p-1 mb-3">
          <button
            className="btn btn-primary w-100 w-sm-auto mb-2 mb-sm-0"
            onClick={() => handleTabChange("newTickets")}
          >
            التذاكر الجديدة
          </button>
          <button
            className="btn btn-success w-100 w-sm-auto mb-2 mb-sm-0"
            onClick={() => handleTabChange("completedTickets")}
          >
            التذاكر المنفذة
          </button>
          <button
            className="btn btn-danger w-100 w-sm-auto mb-2 mb-sm-0"
            onClick={() => handleTabChange("cancelledTickets")}
          >
            التذاكر الملغاة
          </button>
          <button
            className="btn btn-info w-100 w-sm-auto mb-2 mb-sm-0"
            onClick={() => handleTabChange("storeConsumption")}
          >
            المخزن الاستهلاك
          </button>
        </div>

        {/* عرض التذاكر والمخزن حسب التبويب */}
        <div className="w-100 h-auto p-0 m-0 text-right">
          {activeTab === "newTickets" && (
            <>
              <h5 calssName="text-right text-dark font-weight-bold mb-4">
                التذاكر الجديدة
              </h5>
              <div className="d-flex flex-wrap ">
                {activeTickets.length === 0 ? (
                  <p>لا توجد تذاكر جديدة.</p>
                ) : (
                  activeTickets.map((Ticket, i) => {
                    if (
                      Ticket.preparationStatus === "Pending" ||
                      Ticket.preparationStatus === "Preparing"
                    ) {
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
                                {Ticket.order?.TicketNum
                                  ? Ticket.order?.TicketNum
                                  : ""}
                              </p>
                              <p className="card-text">
                                الفاتورة: {Ticket.order?.serial}
                              </p>
                              <p className="card-text">
                                نوع الطلب: {Ticket.order?.orderType}
                              </p>
                            </div>

                            <div className="col-6 p-0">
                              {Ticket.waiter ? (
                                <p className="card-text">
                                  الويتر:{" "}
                                  {Ticket.waiter && Ticket.waiter?.username}
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
                                              {extra.extraDetails.map(
                                                (detail) => (
                                                  <p
                                                    className="badge badge-secondary m-1"
                                                    key={detail.extraid}
                                                  >{`${detail.name}`}</p>
                                                )
                                              )}
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
                            {Ticket.preparationStatus === "Preparing" ? (
                              <button
                                className="btn w-100 btn-warning h-100 btn btn-lg"
                                onClick={() => {
                                  updateTicketDone(Ticket._id);
                                }}
                              >
                                تم التنفيذ
                              </button>
                            ) : Ticket.preparationStatus === "Pending" ? (
                              <button
                                className="btn w-100 btn-primary h-100 btn btn-lg"
                                onClick={() =>
                                  TicketInProgress(Ticket._id, "Preparing")
                                }
                              >
                                بدء التنفيذ
                              </button>
                            ) : (
                              ""
                            )}
                          </div>
                        </div>
                      );
                    } else if (Ticket.preparationStatus === "Prepared") {
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
                                  ? `العميل: ${Ticket.user.username}`
                                  : ""}
                              </p>
                              <p className="card-text">
                                رقم الطلب:{" "}
                                {Ticket.order?.TicketNum
                                  ? Ticket.order?.TicketNum
                                  : ""}
                              </p>
                              <p className="card-text">
                                الفاتورة: {Ticket.order?.serial}
                              </p>
                              <p className="card-text">
                                نوع الطلب: {Ticket.order?.orderType}
                              </p>
                            </div>

                            <div className="col-6 p-0">
                              {Ticket.waiter ? (
                                <p className="card-text">
                                  الويتر:{" "}
                                  {Ticket.waiter && Ticket.waiter.username}
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
                                              {extra.extraDetails.map(
                                                (detail) => (
                                                  <p
                                                    className="badge badge-secondary m-1"
                                                    key={detail.extraid}
                                                  >{`${detail.name}`}</p>
                                                )
                                              )}
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
                            <button className="btn w-100 btn-info h-100 btn btn-lg">
                              انتظار الاستلام
                            </button>
                          </div>
                        </div>
                      );
                    }
                  })
                )}
              </div>
            </>
          )}

          {activeTab === "completedTickets" && (
            <>
              <h5 className="text-right text-dark font-weight-bold mb-4">
                التذاكر المنفذة
              </h5>
              <div className="d-flex flex-wrap ">
                {TicketsToday.filter(
                  (ticket) => ticket.preparationStatus === "Delivered"
                ).length === 0 ? (
                  <p>لا توجد تذاكر تم تنفيذها.</p>
                ) : (
                  TicketsToday.map((ticket, index) => {
                    if (ticket.preparationStatus === "Delivered") {
                      return (
                        <div
                          className="col-lg-3 col-md-4 col-sm-6 col-12 mb-4 ml-2 card text-white bg-success p-0 m-0"
                          key={index}
                        >
                          <div
                            className="card-body text-right d-flex justify-content-between p-0 m-1"
                            style={{ fontSize: "14px", fontWeight: "500" }}
                          >
                            {/* معلومات الطاولة والطلب */}
                            <div className="col-6 p-0">
                              <p className="card-text">
                                {ticket.table
                                  ? `طاولة: ${ticket.table.tableNumber}`
                                  : ticket.user
                                  ? `العميل: ${ticket.user.username}`
                                  : ""}
                              </p>
                              <p className="card-text">
                                رقم الطلب: {ticket.order?.TicketNum || ""}
                              </p>
                              <p className="card-text">
                                الفاتورة: {ticket.order?.serial || ""}
                              </p>
                              <p className="card-text">
                                نوع الطلب: {ticket.order?.orderType || ""}
                              </p>
                            </div>

                            {/* معلومات الويتر والتوقيت */}
                            <div className="col-6 p-0">
                              {ticket.waiter && (
                                <p className="card-text">
                                  الويتر: {ticket.waiter.username}
                                </p>
                              )}
                              <p className="card-text">
                                الاستلام: {formatTime(ticket.createdAt)}
                              </p>
                              <p className="card-text">
                                الانتظار: {waitingTime(ticket.updateAt)} دقيقة
                              </p>
                            </div>
                          </div>

                          {/* قائمة المنتجات */}
                          <ul className="list-group list-group-flush">
                            {ticket.products.map((product, i) => (
                              <li
                                className="list-group-item d-flex flex-column justify-content-between align-items-center p-1"
                                key={i}
                                style={
                                  product.isAdd
                                    ? { backgroundColor: "red", color: "white" }
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
                                    {i + 1}- {product.name} {product.size || ""}
                                  </p>
                                  <span
                                    style={{
                                      fontSize: "1.2em",
                                      fontWeight: "bold",
                                    }}
                                  >
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

                                {/* الإضافات الخاصة بالمنتج */}
                                {product.extras &&
                                  product.extras.length > 0 &&
                                  product.extras.map((extra, j) =>
                                    !extra.isDone ? (
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
                                            >
                                              {detail.name}
                                            </p>
                                          ))}
                                        </div>
                                      </li>
                                    ) : null
                                  )}
                              </li>
                            ))}
                          </ul>

                          {/* زر الرفض */}
                          <div className="text-center w-100 d-flex flex-row">
                            <button className="btn w-100 btn-warning h-100 btn-lg">
                              تم التنفيذ
                            </button>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })
                )}
              </div>
            </>
          )}

          {activeTab === "cancelledTickets" && (
            <div>
              <h5 className="text-right text-dark font-weight-bold mb-4">
                التذاكر الملغاة
              </h5>
              <div className="d-flex flex-wrap ">
                {TicketsToday.filter(
                  (ticket) => ticket.preparationStatus === "Rejected"
                ).length === 0 ? (
                  <p>لا توجد تذاكر ملغاة.</p>
                ) : (
                  TicketsToday.map((ticket, index) => {
                    if (ticket.preparationStatus === "Rejected") {
                      return (
                        <div
                          className="col-lg-3 col-md-4 col-sm-6 col-12 mb-4 ml-2 card text-white bg-success p-0 m-0"
                          key={index}
                        >
                          <div
                            className="card-body text-right d-flex justify-content-between p-0 m-1"
                            style={{ fontSize: "14px", fontWeight: "500" }}
                          >
                            {/* معلومات الطاولة والطلب */}
                            <div className="col-6 p-0">
                              <p className="card-text">
                                {ticket.table
                                  ? `طاولة: ${ticket.table.tableNumber}`
                                  : ticket.user
                                  ? `العميل: ${ticket.user.username}`
                                  : ""}
                              </p>
                              <p className="card-text">
                                رقم الطلب: {ticket.order?.TicketNum || ""}
                              </p>
                              <p className="card-text">
                                الفاتورة: {ticket.order?.serial || ""}
                              </p>
                              <p className="card-text">
                                نوع الطلب: {ticket.order?.orderType || ""}
                              </p>
                            </div>

                            {/* معلومات الويتر والتوقيت */}
                            <div className="col-6 p-0">
                              {ticket.waiter && (
                                <p className="card-text">
                                  الويتر: {ticket.waiter.username}
                                </p>
                              )}
                              <p className="card-text">
                                الاستلام: {formatTime(ticket.createdAt)}
                              </p>
                              <p className="card-text">
                                الانتظار: {waitingTime(ticket.updateAt)} دقيقة
                              </p>
                            </div>
                          </div>

                          {/* قائمة المنتجات */}
                          <ul className="list-group list-group-flush">
                            {ticket.products.map((product, i) => (
                              <li
                                className="list-group-item d-flex flex-column justify-content-between align-items-center p-1"
                                key={i}
                                style={
                                  product.isAdd
                                    ? { backgroundColor: "red", color: "white" }
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
                                    {i + 1}- {product.name} {product.size || ""}
                                  </p>
                                  <span
                                    style={{
                                      fontSize: "1.2em",
                                      fontWeight: "bold",
                                    }}
                                  >
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

                                {/* الإضافات الخاصة بالمنتج */}
                                {product.extras &&
                                  product.extras.length > 0 &&
                                  product.extras.map((extra, j) =>
                                    !extra.isDone ? (
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
                                            >
                                              {detail.name}
                                            </p>
                                          ))}
                                        </div>
                                      </li>
                                    ) : null
                                  )}
                              </li>
                            ))}
                          </ul>

                          {/* زر الرفض */}
                          <div className="text-center w-100 d-flex flex-row">
                            <button className="btn w-100 btn-warning h-100 btn-lg">
                              مرفوض
                            </button>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === "storeConsumption" && (
            <div>
              <h5 calssName="text-right text-dark font-weight-bold mb-4">
                عناصر المخزن الاستهلاك
              </h5>

              {filteredSectionConsumptionToday.length === 0 ? (
                <p>لا توجد عناصر مخزن استهلاك.</p>
              ) : (
                filteredSectionConsumptionToday.map((item, index) => (
                  <div key={index} className="consumption-item mb-3">
                    <h6>{item.name}</h6>
                    <p>
                      الكمية: {item.amount} {item.unit}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreparationScreen;
