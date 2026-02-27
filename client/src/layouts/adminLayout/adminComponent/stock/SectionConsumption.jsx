import React, { useState, useEffect, useRef, useContext } from "react";
import axios from "axios";
import { AppContext } from "../../../../context/appContext";
import { toast, ToastContainer } from "react-toastify";
import "../orders/Orders.css";

const SectionConsumption = () => {
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

  const SectionUsegePermission =
    permissionsList &&
    permissionsList.filter(
      (permission) => permission.resource === "SectionConsumption"
    )[0];

  // Variables to store form inputs
  const [consumptionId, setConsumptionId] = useState("");
  const [section, setSection] = useState("");
  const [stockItem, setStockItem] = useState("");
  const [unit, setUnit] = useState("");
  const [quantityTransferred, setQuantityTransferred] = useState(0);
  const [quantityConsumed, setQuantityConsumed] = useState(0);
  const [bookBalance, setBookBalance] = useState(0);
  const [actualBalance, setActualBalance] = useState(0);
  const [adjustment, setAdjustment] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [carriedForward, setCarriedForward] = useState(0);
  const [returnedToStock, setReturnedToStock] = useState(0);
  const [deliveredBy, setDeliveredBy] = useState(employeeLoginInfo.id);
  const [receivedBy, setReceivedBy] = useState(employeeLoginInfo.id);
  const [tickets, setTickets] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [remarks, setRemarks] = useState("");

  // Function to add or update an item in Section consumption
  const handleSectionItem = async (e) => {
    e.preventDefault();
    try {
      const config = await handleGetTokenAndConfig();

      const today = new Date().toISOString().split("T")[0];

      let allSectionConsumption = [];
      try {
        const { data } = await axios.get(
          `${apiUrl}/api/consumption/bysection/${section}`,
          config
        );
        allSectionConsumption = data.data;
      } catch (error) {
        if (error.response && error.response.status === 404) {
        } else {
          throw error;
        }
      }

      const consumptionToday =
        allSectionConsumption &&
        allSectionConsumption.filter(
          (consumption) =>
            new Date(consumption.createdAt).toISOString().split("T")[0] ===
            today
        );

      let existingConsumption =
        consumptionToday.length > 0
          ? consumptionToday.find(
              (consumption) => consumption.stockItem?._id === stockItem
            )
          : null;

      console.log({
        allSectionConsumption,
        consumptionToday,
        existingConsumption,
      });
      if (existingConsumption) {
        if (SectionUsegePermission && !SectionUsegePermission.update) {
          toast.warn("ليس لديك صلاحية لتعديل عنصر في استهلاك القسم");
          return;
        }

        const updatedData = {
          quantityTransferred:
            existingConsumption.quantityTransferred + quantityTransferred,
          bookBalance: existingConsumption.bookBalance + quantityTransferred,
          receivedBy,
        };

        console.log({
          allSectionConsumption,
          consumptionToday,
          existingConsumption,
          updatedData,
        });

        const response = await axios.put(
          `${apiUrl}/api/consumption/${existingConsumption._id}`,
          updatedData,
          config
        );

        if (response.status === 200) {
          getAllConsumption();
          resetForm();
          toast.success("تم تحديث الكمية بنجاح");
        } else {
          toast.error("فشل تحديث الكمية");
        }
      } else {
        if (SectionUsegePermission && !SectionUsegePermission.create) {
          toast.warn("ليس لديك صلاحية لإضافة عنصر إلى استهلاك القسم");
          return;
        }

        const newConsumptionData = {
          section,
          stockItem,
          quantityTransferred,
          bookBalance: quantityTransferred,
          deliveredBy,
          receivedBy,
          tickets: [],
          remarks,
        };

        const response = await axios.post(
          `${apiUrl}/api/consumption`,
          newConsumptionData,
          config
        );

        if (response.status === 201) {
          getAllConsumption();
          resetForm();
          toast.success("تمت إضافة العنصر بنجاح");
        } else {
          toast.error("فشل إضافة العنصر");
        }
      }
    } catch (error) {
      toast.error("حدث خطأ أثناء العملية");
      console.error(error);
    }
  };

  // Reset form fields
  const resetForm = () => {
    setStockItem("");
    setQuantityTransferred(0);
    setActualBalance(0);
    setRemarks("");
  };

  // Update a section item
  const updateSectionItem = async (e) => {
    e.preventDefault();

    try {
      const config = await handleGetTokenAndConfig();

      if (SectionUsegePermission && !SectionUsegePermission.update) {
        toast.warn("ليس لديك صلاحية لتعديل عنصر لمخزن الاستهلاك");
        return;
      }

      const response = await axios.put(
        `${apiUrl}/api/consumption/${consumptionId}`,
        {
          adjustment,
          actualBalance,
          isActive: false,
        },
        config
      );

      if (response.status === 200) {
        toast.success("تم تعديل العنصر بنجاح");
      } else {
        toast.error("فشلت عملية تعديل العنصر");
      }
    } catch (error) {
      toast.error("حدث خطأ أثناء تعديل العنصر");
      console.error(error);
    }
  };

  const deleteSectionItem = async (e) => {
    e.preventDefault();
    const config = await handleGetTokenAndConfig();
    if (SectionUsegePermission && !SectionUsegePermission.delete) {
      toast.warn("ليس لك صلاحية لحذف عنصر بمخزن الاستهلاك");
      return;
    }
    try {
      const response = await axios.delete(
        apiUrl + "/api/consumption/" + consumptionId,
        config
      );
      if (response.status === 200) {
        getAllConsumption();
      } else {
        toast.error("Failed to deltet SectionConsumption items");
      }
    } catch (error) {
      toast.error("Failed to retrieve SectionConsumption items");
    }
  };

  const [AllStockItems, setAllStockItems] = useState([]);
  // Function to retrieve all stock items
  const getStockItems = async () => {
    const config = await handleGetTokenAndConfig();
    try {
      const response = await axios.get(apiUrl + "/api/stockitem/", config);

      if (response.status === 200) {
        const stockItems = response.data.reverse();
        setAllStockItems(stockItems);
      } else {
        // Handle other statuses if needed

        toast.error("Failed to retrieve stock items");
      }
    } catch (error) {
      toast.error("Failed to retrieve stock items");
    }
  };

  const [departments, setdepartments] = useState([]);
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

  const [AllCategoryStock, setAllCategoryStock] = useState([]);
  // Function to retrieve all category stock
  const getAllCategoryStock = async () => {
    try {
      const config = await handleGetTokenAndConfig();
      const res = await axios.get(apiUrl + "/api/stockCategory/");
      setAllCategoryStock(res.data);
    } catch (error) {
      // Notify on error
      toast.error("Failed to retrieve category stock");
    }
  };

  const [allSectionConsumption, setAllSectionConsumption] = useState([]);
  const [SectionConsumptionForView, setSectionConsumptionForView] = useState(
    []
  );
  const getAllConsumption = async () => {
    const config = await handleGetTokenAndConfig();
    if (SectionUsegePermission && !SectionUsegePermission.read) {
      toast.warn("ليس لك صلاحية لعرض عناصر لمخزن الاستهلاك");
      return;
    }
    try {
      const response = await axios.get(`${apiUrl}/api/consumption/`, config);
      if (response && response.data) {
        const allConsumptions = response.data.data;
        setAllSectionConsumption(allConsumptions.reverse());
        setSectionConsumptionForView(filterByTime("today", allConsumptions));
      } else {
      }
    } catch (error) {
      console.error("Error fetching Section consumption:", error);
      // Handle error: Notify user, log error, etc.
    }
  };
  const [selectedSectionId, setSelectedSectionId] = useState(null);

  const getSectionConsumption = async () => {
    const config = await handleGetTokenAndConfig();
    if (SectionUsegePermission && !SectionUsegePermission.read) {
      toast.warn("ليس لك صلاحية لعرض عناصر لمخزن الاستهلاك");
      return;
    }
    try {
      const response = await axios.get(
        `${apiUrl}/api/consumption/bysection/${selectedSectionId}`,
        config
      );
      if (response && response.data) {
        const SectionConsumptions = response.data.data;
        setAllSectionConsumption(SectionConsumptions.reverse());
        setSectionConsumptionForView(
          filterByTime("today", SectionConsumptions)
        );
      } else {
      }
    } catch (error) {
      console.error("Error fetching Section consumption:", error);
      // Handle error: Notify user, log error, etc.
    }
  };
  // useEffect(() => {
  //   if(selectedSectionId){
  //     getSectionConsumption()
  //   }
  // }, [selectedSectionId])

  const handleDateChange = (e) => {
    const selectedDate = e.target.value;

    setDate(selectedDate);
  };

  const searchBySectionConsumption = (name) => {
    if (!name) {
      getSectionConsumption();
      return;
    }
    const filter = SectionConsumptionForView.filter(
      (Consumption) => Consumption.stockItemName.startsWith(name) === true
    );
    setSectionConsumptionForView(filter);
  };

  // Initialize state variables for date and filtered Section consumption
  // const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  // const [SectionConsumptionForView, setSectionConsumptionForView] = useState([]);

  // // Function to filter Section consumption based on creation date
  // const filterByConsumCreatedAt = () => {
  //
  //   const filtered = allSectionConsumption.filter((consumption) => {
  //     new Date(kitConsumption.createdAt).toISOString().split('T')[0] === date;
  //
  //     return itemDate === date;
  //   });
  //
  //   setSectionConsumptionForView(filtered);
  // };

  useEffect(() => {
    getStockItems();
    getAllConsumption();
    fetchdepartments();
    // filterByConsumCreatedAt()
  }, [date]);

  return (
    <div className="w-100 px-3 d-flex align-itmes-center justify-content-start">
      <div className="table-responsive mt-1">
        <div className="table-wrapper p-3 mw-100">
          <div className="table-title">
            <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
              <div className="text-right">
                <h2>
                  ادارة <b>استهلاك الاقسام</b>
                </h2>
              </div>
              <div className="col-12 col-md-6 p-0 m-0 d-flex flex-wrap aliegn-items-center justify-content-end print-hide">
                <a
                  href="#addItemModal"
                  className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-success"
                  data-toggle="modal"
                >
                  {" "}
                  <span>اضافه صنف جديد</span>
                </a>

                {/* <a href="#updateItemModal" className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-danger" data-toggle="modal" > <span>حذف</span></a> */}
              </div>
            </div>
          </div>

          <div class="table-filter w-100 p-0 print-hide">
            <div className="col-12 d-flex flex-row flex-wrap align-items-center justify-content-start text-dark">
              <div class="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  عرض
                </label>
                <select
                  className="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => {
                    setStartPagination(0);
                    setEndPagination(e.target.value);
                  }}
                >
                  {(() => {
                    const options = [];
                    for (let i = 5; i < 100; i += 5) {
                      options.push(
                        <option key={i} value={i}>
                          {i}
                        </option>
                      );
                    }
                    return options;
                  })()}
                </select>
              </div>
              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  القسم
                </label>
                <select
                  id="section-select"
                  className="w-100 form-select"
                  onChange={(e) => getSectionConsumption(e.target.value)}
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

              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  اسم الصنف
                </label>
                <input
                  type="text"
                  class="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => searchBySectionConsumption(e.target.value)}
                />
              </div>

              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  اختر الصنف
                </label>
                <select
                  class="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => searchBySectionConsumption(e.target.value)}
                >
                  <option value={""}>الكل</option>
                  {SectionConsumptionForView.map((consumption) => {
                    return (
                      <option value={consumption.stockItem?.itemName}>
                        {consumption.stockItem?.itemName}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="col-12 text-dark d-flex flex-wrap align-items-center justify-content-start p-0 m-0 mt-3">
                <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    فلتر حسب الوقت
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    onChange={(e) =>
                      setAllSectionConsumption(
                        filterByTime(e.target.value, allSectionConsumption)
                      )
                    }
                  >
                    <option value="">اختر</option>
                    <option value="today">اليوم</option>
                    <option value="week">هذا الأسبوع</option>
                    <option value="month">هذا الشهر</option>
                    <option value="month">هذه السنه</option>
                  </select>
                </div>

                <div className="d-flex align-items-stretch justify-content-between flex-nowrap p-0 m-0 px-1">
                  <label className="form-label text-nowrap d-flex align-items-center justify-content-center p-0 m-0 ml-1">
                    <strong>مدة محددة:</strong>
                  </label>

                  <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                    <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                      من
                    </label>
                    <input
                      type="date"
                      className="form-control border-primary m-0 p-2 h-auto"
                      onChange={(e) => setStartDate(e.target.value)}
                      placeholder="اختر التاريخ"
                    />
                  </div>

                  <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                    <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                      إلى
                    </label>
                    <input
                      type="date"
                      className="form-control border-primary m-0 p-2 h-auto"
                      onChange={(e) => setEndDate(e.target.value)}
                      placeholder="اختر التاريخ"
                    />
                  </div>

                  <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                    <button
                      type="button"
                      className="btn btn-primary h-100 p-2 "
                      onClick={() =>
                        setAllSectionConsumption(
                          filterByDateRange(allSectionConsumption)
                        )
                      }
                    >
                      <i className="fa fa-search"></i>
                    </button>
                    <button
                      type="button"
                      className="btn btn-warning h-100 p-2"
                      onClick={getSectionConsumption}
                    >
                      استعادة
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <table className="table table-striped table-hover">
            <thead>
              <tr>
                <th>م</th>
                <th>القسم</th>
                <th>اسم الصنف</th>
                <th>الكمية المضافة</th>
                <th>الوحدة</th>
                <th>الاستهلاك</th>
                <th>الرصيد</th>
                <th>الرصيد الفعلي</th>
                <th>التسوية</th>
                <th>السبب</th>
                <th>الرصيد المرحل</th>
                <th>الرصيد المرتجع</th>
                <th>المنتجات</th>
                <th>بواسطة</th>
                <th>تاريخ الإضافة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {SectionConsumptionForView?.length > 0 ? (
                SectionConsumptionForView.map((consumption, index) => {
                  if ((index >= startPagination) & (index < endPagination)) {
                    return (
                      <tr key={consumption._id}>
                        <td>{index + 1}</td>
                        <td>{consumption.section?.name || "غير محدد"}</td>
                        <td>{consumption.stockItem?.itemName || "غير محدد"}</td>
                        <td>{consumption.quantityTransferred ?? 0}</td>
                        <td>{consumption.unit || "غير محدد"}</td>
                        <td>{consumption.quantityConsumed ?? 0}</td>
                        <td>{consumption.bookBalance ?? 0}</td>
                        <td>{consumption.adjustment ?? 0}</td>
                        <td>{consumption.adjustmentReason ?? ""}</td>
                        <td>{consumption.quantityRemaining ?? 0}</td>
                        <td>{consumption.carriedForward ?? 0}</td>
                        <td>{consumption.returnedToStock ?? 0}</td>
                        <td>
                          {consumption.productsProduced?.length > 0
                            ? consumption.productsProduced.map(
                                (product, productIndex) => (
                                  <span key={productIndex}>
                                    [{product.productionCount} *{" "}
                                    {product.productName}{" "}
                                    {product.sizeName || ""}]
                                  </span>
                                )
                              )
                            : "لا يوجد"}
                        </td>
                        <td>
                          {consumption.receivedBy?.username || "غير معروف"}
                        </td>
                        <td>
                          {formatDateTime(consumption.createdAt) || "غير محدد"}
                        </td>
                        <td>
                          <button
                            data-target="#updateSectionItemModal"
                            className="btn btn-sm btn-primary ml-2 "
                            data-toggle="modal"
                            onClick={() => {
                              setReceivedBy(employeeLoginInfo.id);
                              setConsumptionId(consumption._id);
                              setStockItem(consumption.stockItem?._id);
                              setQuantityTransferred(
                                consumption.quantityTransferred ?? 0
                              );
                              setBookBalance(consumption.bookBalance ?? 0);
                              setUnit(consumption.unit || "");
                              setQuantityConsumed(
                                consumption.quantityConsumed ?? 0
                              );
                            }}
                          >
                            <i
                              className="material-icons"
                              data-toggle="tooltip"
                              title="Edit"
                            >
                              &#xE254;
                            </i>
                          </button>
                          <button
                            data-target="#deleteStockItemModal"
                            className="btn btn-sm btn-danger"
                            data-toggle="modal"
                            onClick={() => setConsumptionId(consumption._id)}
                          >
                            <i
                              className="material-icons"
                              data-toggle="tooltip"
                              title="Delete"
                            >
                              &#xE872;
                            </i>
                          </button>
                        </td>
                      </tr>
                    );
                  }
                })
              ) : (
                <tr>
                  <td colSpan="15" className="text-center">
                    لا توجد بيانات لعرضها.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="clearfix">
            <div className="hint-text text-dark">
              عرض{" "}
              <b>
                {SectionConsumptionForView.length > endPagination
                  ? endPagination
                  : SectionConsumptionForView.length}
              </b>{" "}
              من <b>{SectionConsumptionForView.length}</b> عنصر
            </div>
            <ul className="pagination">
              <li onClick={EditPagination} className="page-item disabled">
                <a href="#">السابق</a>
              </li>
              <li
                onClick={EditPagination}
                className={`page-item ${endPagination === 5 ? "active" : ""}`}
              >
                <a href="#" className="page-link">
                  1
                </a>
              </li>
              <li
                onClick={EditPagination}
                className={`page-item ${endPagination === 10 ? "active" : ""}`}
              >
                <a href="#" className="page-link">
                  2
                </a>
              </li>
              <li
                onClick={EditPagination}
                className={`page-item ${endPagination === 15 ? "active" : ""}`}
              >
                <a href="#" className="page-link">
                  3
                </a>
              </li>
              <li
                onClick={EditPagination}
                className={`page-item ${endPagination === 20 ? "active" : ""}`}
              >
                <a href="#" className="page-link">
                  4
                </a>
              </li>
              <li
                onClick={EditPagination}
                className={`page-item ${endPagination === 25 ? "active" : ""}`}
              >
                <a href="#" className="page-link">
                  5
                </a>
              </li>
              <li
                onClick={EditPagination}
                className={`page-item ${endPagination === 30 ? "active" : ""}`}
              >
                <a href="#" className="page-link">
                  التالي
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div id="addItemModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={(e) => handleSectionItem(e)}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">اضافه صنف</h4>
                <button
                  type="button"
                  className="close m-0 p-1"
                  data-dismiss="modal"
                  aria-hidden="true"
                >
                  &times;
                </button>
              </div>
              <div className="modal-body d-flex flex-wrap align-items-center p-3 text-right">
                {/* قسم */}
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    القسم
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    required
                  >
                    <option value="">اختر القسم</option>
                    {departments.map((section, i) => (
                      <option value={section._id} key={i}>
                        {section.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* الصنف */}
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الصنف
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={stockItem}
                    onChange={(e) => {
                      setStockItem(e.target.value);
                      const selectedStockItem = AllStockItems.find(
                        (item) => item._id === e.target.value
                      );
                      setUnit(selectedStockItem.ingredientUnit);
                    }}
                    required
                  >
                    <option value="">اختر الصنف</option>
                    {AllStockItems.map((item, i) => (
                      <option value={item._id} key={i}>
                        {item.itemName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* رصيد محول */}
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    رصيد محول
                  </label>
                  <input
                    type="number"
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={quantityTransferred}
                    onChange={(e) =>
                      setQuantityTransferred(Number(e.target.value))
                    }
                    required
                  />
                </div>

                {/* الوحدة */}
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الوحدة
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={unit}
                    readOnly
                    required
                  />
                </div>

                {/* التاريخ */}
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    التاريخ
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={formatDateTime(new Date())}
                    readOnly
                    required
                  />
                </div>

                {/* الملاحظات */}
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الملاحظات
                  </label>
                  <textarea
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer d-flex flex-nowrap align-items-center justify-content-between m-0 p-1">
                <input
                  type="submit"
                  className="btn btn-success col-6 h-100 px-2 py-3 m-0"
                  value="اضافه"
                  disabled={!section || !stockItem || quantityTransferred <= 0}
                />
                <input
                  type="button"
                  className="btn btn-danger col-6 h-100 px-2 py-3 m-0"
                  data-dismiss="modal"
                  value="إغلاق"
                />
              </div>
            </form>
          </div>
        </div>
      </div>

      <div id="updateSectionItemModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={(e) => updateSectionItem(e)}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">تسويه الرصيد</h4>
                <button
                  type="button"
                  className="close m-0 p-1"
                  data-dismiss="modal"
                  aria-hidden="true"
                >
                  &times;
                </button>
              </div>
              <div className="modal-body d-flex flex-wrap align-items-center p-3 text-right">
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    اسم الصنف
                  </label>
                  {/* <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    defaultValue={}
                    required
                  /> */}
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الكمية المستلمة
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    defaultValue={quantityTransferred}
                    required
                    readOnly
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الكمية المستهلكه
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    defaultValue={quantityConsumed}
                    required
                    readOnly
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الرصيد الدفتري
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    defaultValue={bookBalance}
                    required
                    readOnly
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الرصيد الفعلي
                  </label>
                  <input
                    type="Number"
                    className="form-control border-primary m-0 p-2 h-auto"
                    required
                    onChange={(e) => {
                      setAdjustment(Number(e.target.value) - bookBalance);
                      setActualBalance(e.target.value);
                    }}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    التسويه
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    defaultValue={adjustment}
                    required
                    readOnly
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الوحدة{" "}
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    defaultValue={unit}
                    required
                  ></input>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    التاريخ
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    defaultValue={formatDateTime(new Date())}
                    required
                    readOnly
                  />
                </div>
              </div>
              <div className="modal-footer d-flex flex-nowrap align-items-center justify-content-between m-0 p-1">
                <input
                  type="submit"
                  className="btn btn-success col-6 h-100 px-2 py-3 m-0"
                  value="حفظ"
                />
                <input
                  type="button"
                  className="btn btn-danger col-6 h-100 px-2 py-3 m-0"
                  data-dismiss="modal"
                  value="إغلاق"
                />
              </div>
            </form>
          </div>
        </div>
      </div>

      <div id="deleteStockItemModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={deleteSectionItem}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">حذف منتج</h4>
                <button
                  type="button"
                  className="close m-0 p-1"
                  data-dismiss="modal"
                  aria-hidden="true"
                >
                  &times;
                </button>
              </div>
              <div className="modal-body text-center">
                <p className="text-right text-dark fs-3 fw-800 mb-2">
                  هل أنت متأكد من حذف هذا السجل؟
                </p>
                <p className="text-warning text-center mt-3">
                  <small>لا يمكن الرجوع في هذا الإجراء.</small>
                </p>
              </div>
              <div className="modal-footer d-flex flex-nowrap align-items-center justify-content-between m-0 p-1">
                <input
                  type="submit"
                  className="btn btn-warning col-6 h-100 px-2 py-3 m-0"
                  value="حذف"
                />
                <input
                  type="button"
                  className="btn btn-danger col-6 h-100 px-2 py-3 m-0"
                  data-dismiss="modal"
                  value="إغلاق"
                />
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SectionConsumption;
