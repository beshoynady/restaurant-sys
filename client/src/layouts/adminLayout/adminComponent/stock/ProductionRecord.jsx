import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AppContext } from "../../../../context/appContext";
import { toast } from "react-toastify";
import "../orders/Orders.css";

const ProductionRecord = () => {
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
    handleGetTokenAndConfig,
    apiUrl,
  } = useContext(AppContext);

  const productionRecordPermission =
    permissionsList &&
    permissionsList.filter(
      (permission) => permission.resource === "Production Record"
    )[0];

  const productionOrderPermission =
    permissionsList &&
    permissionsList.filter(
      (permission) => permission.resource === "Production Order"
    )[0];

  const [productionRecords, setProductionRecords] = useState([]);
  const [productionOrders, setProductionOrders] = useState([]);

  const [storeId, setStoreId] = useState("");
  const [department, setdepartment] = useState("");
  const [stockItemId, setStockItemId] = useState("");
  const [stockItem, setStockItem] = useState({});
  const [unit, setUnit] = useState("");
  const [productionStatus, setProductionStatus] = useState("Pending");
  const [quantityRequested, setQuantityRequested] = useState(0);

  const [notes, setNotes] = useState(""); // For notes or remarks

  const [productionOrderId, setProductionOrderId] = useState("");
  const costMethodEN = ["FIFO", "LIFO", "Weighted Average"];
  const costMethodAR = [
    "الوارد اولا يصرف اولا",
    "الوارد اخيرا يصرف اولا",
    "متوسط السعر",
  ];

  const [materialsUsed, setMaterialsUsed] = useState([
    { material: "", quantity: 0, cost: 0 },
  ]);

  const handleAddMaterial = (ingredients) => {
    const listMaterials = [];
    ingredients.map((item) => {
      listMaterials.push({ material: item._id, quantity: 0, cost: 0 });
    });
    setMaterialsUsed([...listMaterials]);
  };

  const handleMaterialChange = (e, index) => {
    const newMaterialsUsed = [...materialsUsed];
    newMaterialsUsed[index][e.target.name] = e.target.value;
    setMaterialsUsed(newMaterialsUsed);
  };

  const handleMaterialSelect = (materialId, index) => {
    const material = AllStockItems.find((item) => item._id === materialId);
    const newMaterialsUsed = [...materialsUsed];
    newMaterialsUsed[index].material = materialId;
    newMaterialsUsed[index].cost = material.costPerPart;
    setMaterialsUsed(newMaterialsUsed);
  };

  const handleMaterialQuantity = (e, index) => {
    const newMaterialsUsed = [...materialsUsed];
    newMaterialsUsed[index].quantity = e.target.value;
    setMaterialsUsed(newMaterialsUsed);
  };

  const resetFields = () => {
    setStockItem({});
    setStockItemId("");
  };

  const createProductionRecord = async (e) => {
    e.preventDefault();
    try {
      const { config } = handleGetTokenAndConfig();
      const body = {
        productionOrder: productionOrderId,
        storeId,
        department,
        stockItem: stockItemId,
        unit,
        quantityRequested,
        productionStatus,
        notes,
      };
      const response = await axios.post(
        `${apiUrl}/productionRecord`,
        body,
        config
      );
      if (response.status === 200) {
        toast.success("تم انشاء السجل بنجاح");
        getAllProductionRecord();
        resetFields();
      }
    } catch (error) {
      toast.error("حدث خطأ ما");
    }
  };

  const getAllProductionRecord = async () => {
    const config = await handleGetTokenAndConfig();

    try {
      const response = await axios.get(`${apiUrl}/productionRecord`, config);

      if (response.status === 200) {
        setProductionRecords(response.data);
      }
    } catch (error) {
      toast.error("حدث خطأ ما أثناء جلب البيانات");
    }
  };

  const searchByItem = (itemName) => {
    if (itemName === "") {
      getAllProductionRecord();
    } else {
      const filteredItems = productionRecords.filter((item) =>
        item.stockItem?.itemName.toLowerCase().includes(itemName.toLowerCase())
      );
      setProductionRecords(filteredItems);
    }
  };

  const searchByCategory = (category) => {
    if (category === "") {
      getAllProductionRecord();
    } else {
      const filteredItems = productionRecords.filter(
        (item) => item.stockItem.categoryId?._id === category
      );
      setProductionRecords(filteredItems);
    }
  };

  const getProductionOrderByStore = (store) => {
    if (store) {
      const filteredItems = productionRecords.filter(
        (item) => item.storeId?._id === store
      );

      setProductionRecords(filteredItems);
    } else {
      getAllProductionRecord();
    }
  };

  const getProductionOrderBySection = (section) => {
    if (section) {
      const filteredItems = productionRecords.filter(
        (item) => item.department?._id === section
      );
      setProductionRecords(filteredItems);
    } else {
      getAllProductionRecord();
    }
  };

  const [AllStockItems, setAllStockItems] = useState([]);

  // Function to retrieve all stock items
  const getStockItems = async () => {
    const config = await handleGetTokenAndConfig();
    if (productionOrderPermission && !productionOrderPermission.read) {
      toast.warn("ليس لك صلاحية لعرض عناصر المخزن");
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.get(apiUrl + "/api/stockItem/", config);

      if (!response || !response.data) {
        // Handle unexpected response or empty data
        throw new Error("استجابة غير متوقعة أو بيانات فارغة");
      }

      const stockItems = response.data.reverse();
      setAllStockItems(stockItems);

      // Notify on success
      toast.success("تم استرداد عناصر المخزون بنجاح");
      setIsLoading(false);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
      // Notify on error
      toast.error("فشل في استرداد عناصر المخزون");
    }
  };

  const [AllCategoryStock, setAllCategoryStock] = useState([]);
  // Function to retrieve all category stock
  const getAllCategoryStock = async () => {
    const config = await handleGetTokenAndConfig();
    setIsLoading(true);
    try {
      const response = await axios.get(apiUrl + "/api/stockCategory/", config);
      setAllCategoryStock(response.data.reverse());
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching category stock:", error);
      toast.error("حدث خطأ اثناء جلب بيانات التصنيفات ! اعد تحميل الصفحة");
      setIsLoading(false);
    }
  };

  const [listdepartments, setListdepartments] = useState([]);
  // Fetch all preparation sections
  const fetchdepartments = async () => {
    const config = await handleGetTokenAndConfig();

    try {
      const response = await axios.get(`${apiUrl}/api/department`, config);
      if (response.status === 200) {
        setListdepartments(response.data.data);
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

  const [allStores, setAllStores] = useState([]);

  const getAllStores = async () => {
    const config = await handleGetTokenAndConfig();

    try {
      const response = await axios.get(apiUrl + "/api/store/", config);
      setAllStores(response.data.reverse());
    } catch (error) {
      console.error("Error fetching stores:", error);
      toast.error("حدث خطأ اثناء جلب بيانات المخزنات! اعد تحميل الصفحة");
    }
  };

  const getProductionOrders = async () => {
    const config = await handleGetTokenAndConfig();
    try {
      const response = await axios.get(apiUrl + "/api/productionOrder", config);
      if (response.status === 200) {
        setProductionOrders(response.data.reverse());
      }
    } catch (error) {
      console.error("Error fetching production orders:", error);
      toast.error("حدث خطأ اثناء جلب بيانات الطلبات! اعد تحميل الصفحة");
    }
  };

  const [productionOrderSelected, setProductionOrderSelected] = useState({});
  const [productionRecipe, setProductionRecipe] = useState("");
  const handleSelectProductionOrder = async (orderId) => {
    const config = await handleGetTokenAndConfig();

    try {
      const getProductionOrder = await axios.get(
        `${apiUrl}/api/productionorder/${orderId}`,
        config
      );
      const productionOrder = getProductionOrder.data;

      if (!productionOrder) {
        toast.warn("امر التصنيع هذا لم يعد موجود");
      }
      if (productionOrder) {
        setStockItemId(productionOrder.stockItem._id);
        setProductionOrderSelected(productionOrder);
        const getProductionRecipe = await axios.get(
          `${apiUrl}/api/productionrecipe/stockitem/${productionOrder.stockItem._id}`,
          config
        );
        const productionrecipe = getProductionRecipe.data;

        if (!productionrecipe) {
          toast.warn("هذا العنصر لا يوجد له ريسبي");
        }
        if (getProductionRecipe.status === 200) {
          setProductionRecipe(productionrecipe);
          handleAddMaterial(productionrecipe.ingredients);
        }
      }
    } catch (error) {}
  };

  useEffect(() => {
    getAllProductionRecord();
    getStockItems();
    getAllStores();
    getAllCategoryStock();
    getProductionOrders();
    fetchdepartments();
  }, []);

  return (
    <div className="w-100 px-3 d-flex align-itmes-center justify-content-start">
      <div className="table-responsive mt-1">
        <div className="table-wrapper p-3 mw-100">
          <div className="table-title">
            <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
              <div className="text-right">
                <h2>
                  ادارة <b>سجلات التصنيع</b>
                </h2>
              </div>
              {productionRecordPermission &&
                productionRecordPermission &&
                productionRecordPermission &&
                productionRecordPermission.create && (
                  <div className="col-12 col-md-6 p-0 m-0 d-flex flex-wrap aliegn-items-center justify-content-end print-hide">
                    <a
                      href="#addProductionRecordModal"
                      className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-success"
                      data-toggle="modal"
                    >
                      {" "}
                      <span>انشاء سجل تصنيع</span>
                    </a>

                    {/* <a href="#deleteProductionRecordModal" className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-danger" data-toggle="modal"> <span>حذف</span></a> */}
                  </div>
                )}
            </div>
          </div>
          <div className="table-filter print-hide">
            <div className="col-12 text-dark d-flex flex-wrap align-items-center justify-content-start p-0 m-0">
              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
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
                  اسم الصنف
                </label>
                <input
                  type="text"
                  className="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => searchByItem(e.target.value)}
                />
              </div>

              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  المخزن
                </label>
                <select
                  className="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => getProductionOrderByStore(e.target.value)}
                >
                  <option value={""}>الكل</option>
                  {allStores.map((store, i) => {
                    return (
                      <option value={store._id} key={i}>
                        {store.storeName}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  حسب التصنيف
                </label>
                <select
                  className="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => searchByCategory(e.target.value)}
                >
                  <option value={""}>الكل</option>
                  {AllCategoryStock.map((category, i) => {
                    return (
                      <option value={category._id} key={i}>
                        {category.categoryName}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  حسب قسم الاعداد
                </label>
                <select
                  className="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => getProductionOrderBySection(e.target.value)}
                >
                  <option value={""}>الكل</option>
                  {listdepartments.map((section, i) => {
                    return (
                      <option value={section._id} key={i}>
                        {section.name}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>
          <table className="table table-striped table-hover">
            <thead>
              <tr>
                <th>#</th>
                <th>رقم الامر</th>
                <th>رقم التصنيع</th>
                <th>المخزن</th>
                <th>التصنيف</th>
                <th>اسم الصنف</th>
                <th>القسم</th>
                <th>الوحدة</th>
                <th>الكمية المطلوبة</th>
                <th>الكمية المنفذه</th>
                <th>التكلفه</th>
                <th>الكمية المنفذه</th>
                <th>الحالة</th>
                <th>البدايه</th>
                <th>الانتهاء</th>
                <th>تم بواسطة</th>
                <th>تاريخ الإنشاء</th>
                <th>تم التعديل بواسطة</th>
                <th>تاريخ التعديل</th>
                <th>ملاحظات</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {productionRecords &&
                productionRecords.map((record, index) => (
                  <tr
                    key={record._id}
                    className={
                      record.status === "Canceled" ? "bg-danger text-white" : ""
                    }
                  >
                    <td>{index + 1}</td>
                    <td>{record.productionNumber}</td>
                    <td>{record.productionOrder.orderNumber}</td>
                    <td>{record.storeId?.storeName || "غير محدد"}</td>
                    <td>
                      {record.stockItem.categoryId?.categoryName || "غير محدد"}
                    </td>
                    <td>{record.stockItem?.itemName || "غير محدد"}</td>
                    <td>{record.department?.name || "غير محدد"}</td>
                    <td>{record.unit}</td>
                    <td>{record.productionOrder.quantityRequested}</td>
                    <td>{record.quantity}</td>
                    <td>{record.productionStatus}</td>
                    <td>{formatDateTime(record.productionStartTime)}</td>
                    <td>{formatDateTime(record.productionEndTime)}</td>
                    <td>{record.createdBy?.fullname || "غير معروف"}</td>
                    <td>{formatDateTime(record.createdAt)}</td>
                    <td>{record.updatedBy?.fullname || "غير معروف"}</td>
                    <td>{formatDateTime(record.updatedAt)}</td>
                    <td>{record.notes || "لا توجد ملاحظات"}</td>
                    <td>
                      {productionRecordPermission?.update && (
                        <button
                          data-target="#editProductionRecordModal"
                          data-toggle="modal"
                          className="btn btn-sm btn-primary ml-2"
                          // onClick={() => handleEdit(record)}
                        >
                          <i className="material-icons" title="تعديل">
                            &#xE254;
                          </i>
                        </button>
                      )}
                      {productionRecordPermission?.delete && (
                        <button
                          data-target="#deleteProductionRecordModal"
                          data-toggle="modal"
                          className="btn btn-sm btn-danger"
                          onClick={() => setProductionOrderId(record._id)}
                        >
                          <i className="material-icons" title="حذف">
                            &#xE872;
                          </i>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          <div className="clearfix">
            <div className="hint-text text-dark">
              عرض{" "}
              <b>
                {productionRecords.length > endPagination
                  ? endPagination
                  : productionRecords.length}
              </b>{" "}
              من <b>{productionRecords.length}</b> عنصر
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

      <div id="addProductionRecordModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded">
            <form onSubmit={createProductionRecord}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">انشاء سجل تصنيع</h4>
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
                <div className="card">
                  <div className="card-header text-center text-dark">
                    <h4>ادخل بيانات فاتورة الشراء</h4>
                  </div>

                  <div className="card-body min-content">
                    <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
                      <div className="col-6">
                        <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                          <span
                            className="input-group-text"
                            htmlFor="productionOrder"
                          >
                            امر التصنيع
                          </span>
                          <select
                            required
                            className="form-control border-primary m-0 p-2 h-auto"
                            id="productionOrder"
                            onChange={(e) =>
                              handleSelectProductionOrder(e.target.value)
                            }
                          >
                            <option>اختر امر التصنيع</option>
                            {productionOrders.map((order, i) => (
                              <option value={order._id} key={i}>
                                {order.orderNumber}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                          <span
                            className="input-group-text"
                            htmlFor="notesInput"
                          >
                            عنصر المخزن
                          </span>
                          <input
                            type="text"
                            className="form-control border-primary m-0 p-2 h-auto"
                            id="notesInput"
                            readOnly
                            value={productionOrderSelected.stockItem?.itemName}
                          />
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                          <span
                            className="input-group-text"
                            htmlFor="invoiceNumberInput"
                          >
                            المخزن
                          </span>
                          <input
                            type="text"
                            className="form-control border-primary m-0 p-2 h-auto"
                            readOnly
                            value={productionOrderSelected.storeId?.storeName}
                          />
                        </div>
                        <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                          <span
                            className="input-group-text"
                            htmlFor="invoiceDateInput"
                          >
                            الكمية المطلوبه
                          </span>
                          <input
                            type="text"
                            className="form-control border-primary m-0 p-2 h-auto"
                            readOnly
                            value={productionOrderSelected.quantityRequested}
                          />
                        </div>
                      </div>
                    </div>

                    <table className="table table-bordered table-striped table-hover">
                      <thead className="table-success">
                        <tr>
                          <th scope="col">#</th>
                          <th scope="col" className="col-4">
                            الصنف
                          </th>
                          <th scope="col" className="col-2">
                            مقدار الوصفة
                          </th>
                          <th scope="col" className="col-2">
                            الوحده
                          </th>
                          <th scope="col" className="col-2">
                            مقدار المستخدم
                          </th>
                          <th scope="col" className="col-2">
                            التكلفه
                          </th>
                          {/* <th scope="col" className="col-2">
                            انتهاء
                          </th> */}
                          <th scope="col" className="col-4 NoPrint">
                            <button
                              type="button"
                              className="h-100 btn btn-sm btn-success"
                              // onClick={handleNewItem}
                            >
                              +
                            </button>
                          </th>
                        </tr>
                      </thead>
                      <tbody id="TBody">
                        {productionRecipe &&
                          productionRecipe.ingredients.map((item, i) => (
                            <tr id="TRow" key={i}>
                              <th scope="w-100 d-flex flex-wrap align-items-center justify-content-between">
                                {i + 1}
                              </th>
                              <td>
                                <input
                                  className="form-control border-primary m-0 p-2 h-auto"
                                  readOnly
                                  value={item.itemId?.itemName}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control p-0 m-0"
                                  name="qty"
                                  readOnly
                                  value={item.quantity}
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  readOnly
                                  value={item.unit}
                                  className="form-control p-0 m-0"
                                  name="ingredientUnit"
                                />
                              </td>

                              <td>
                                <input
                                  type="number"
                                  className="form-control p-0 m-0"
                                  name="Quntity"
                                  required
                                />
                              </td>

                              <td>
                                <input
                                  type="text"
                                  className="form-control p-0 m-0"
                                  name="amt"
                                  readOnly
                                />
                              </td>

                              {/* <td>
                                <input
                                  type="date"
                                  className="form-control p-0 m-0"
                                  name="Exp"
                                />
                              </td> */}
                              <td className="NoPrint">
                                <button
                                  type="button"
                                  className="h-100 btn btn-sm btn-danger"
                                >
                                  X
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>

                    <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
                      {/* <div className="col-6">
                        <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                          <span
                            className="input-group-text"
                            htmlFor="totalInput"
                          >
                            الإجمالي
                          </span>
                          <input
                            type="text"
                            className="form-control text-end"
                            value={totalAmount}
                            id="totalInput"
                            readOnly
                          />
                        </div>
                        <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                          <span className="input-group-text" htmlFor="gstInput">
                            ضريبة القيمة المضافة
                          </span>
                          <input
                            type="number"
                            className="form-control text-end"
                            id="gstInput"
                            onChange={(e) => setSalesTax(e.target.value)}
                          />
                        </div>
                        <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                          <span className="input-group-text" htmlFor="gstInput">
                            خصم
                          </span>
                          <input
                            type="number"
                            className="form-control text-end"
                            id="gstInput"
                            onChange={(e) => setDiscount(e.target.value)}
                          />
                        </div>
                        <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                          <span
                            className="input-group-text"
                            htmlFor="netAmountInput"
                          >
                            المبلغ الصافي
                          </span>
                          <input
                            type="text"
                            className="form-control text-end"
                            id="netAmountInput"
                            value={netAmount}
                            readOnly
                          />
                        </div>
                        <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                          <span className="input-group-text" htmlFor="gstInput">
                            المخزن
                          </span>
                          <select
                            className="form-control border-primary m-0 p-2 h-auto"
                            name="paymentMethod"
                            id="paymentMethod"
                            onChange={(e) => setstoreId(e.target.value)}
                          >
                            <option>اختر المخزن </option>
                            {allStores &&
                              allStores.map((store, i) => {
                                return (
                                  <option value={store._id}>
                                    {store.storeName}
                                  </option>
                                );
                              })}
                          </select>
                        </div>
                        <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                          <span
                            className="input-group-text"
                            htmlFor="notesInput"
                          >
                            الملاحظات
                          </span>
                          <textarea
                            className="form-control border-primary m-0 p-2 h-auto"
                            id="notesInput"
                            placeholder="الملاحظات"
                            onChange={(e) => setNotes(e.target.value)}
                            style={{ height: "auto" }}
                          />
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                          <span
                            className="input-group-text"
                            htmlFor="paidAmount"
                          >
                            مدفوع
                          </span>
                          <input
                            type="number"
                            className="form-control text-end"
                            defaultValue={paidAmount}
                            id="paidAmount"
                            onChange={(e) => handlePaidAmount(e.target.value)}
                          />
                        </div>

                        {paidAmount > 0 ? (
                          listCashRegister ? (
                            <>
                              <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                                <span
                                  className="input-group-text"
                                  htmlFor="gstInput"
                                >
                                  طريقه الدفع
                                </span>
                                <select
                                  className="form-control border-primary m-0 p-2 h-auto"
                                  name="paymentMethod"
                                  id="paymentMethod"
                                  onChange={(e) =>
                                    handlePaymentMethod(
                                      e.target.value,
                                      employeeLoginInfo.id
                                    )
                                  }
                                >
                                  <option>اختر طريقه الدفع</option>
                                  {financialInfo &&
                                    financialInfo.map((financialInfo, i) => {
                                      return (
                                        <option
                                          value={
                                            financialInfo.paymentMethodName
                                          }
                                        >{`${financialInfo.paymentMethodName} ${financialInfo.accountNumber}`}</option>
                                      );
                                    })}
                                </select>
                              </div>
                              <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                                <span
                                  className="input-group-text"
                                  htmlFor="CashRegister"
                                >
                                  اختر حساب الدفع
                                </span>
                                <select
                                  className="form-select border-primary col"
                                  id="CashRegister"
                                  required
                                  onChange={(e) =>
                                    selectCashRegister(e.target.value)
                                  }
                                >
                                  <option>اختر حساب الدفع</option>
                                  {listCashRegister.map((register) => (
                                    <option
                                      key={register._id}
                                      value={register._id}
                                    >
                                      {register.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              {cashRegister && (
                                <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-wrap">
                                  <span
                                    className="input-group-text"
                                    htmlFor="netAmountInput"
                                  >
                                    رصيد الخزينة
                                  </span>
                                  <input
                                    type="text"
                                    className="form-control text-end"
                                    id="netAmountInput"
                                    value={CashRegisterBalance}
                                    readOnly
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-success w-100 h-100 p-2"
                                    id="netAmountInput"
                                    onClick={confirmPayment}
                                  >
                                    تاكيد الدفع
                                  </button>
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="input-group-text">
                              ليس لك خزينة للدفع النقدي
                            </span>
                          )
                        ) : null}

                        <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                          <span
                            className="input-group-text"
                            htmlFor="balanceDue"
                          >
                            باقي المستحق
                          </span>
                          <input
                            type="text"
                            className="form-control text-end"
                            id="balanceDue"
                            value={balanceDue}
                            readOnly
                          />
                        </div>
                        <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                          <span className="input-group-text" htmlFor="gstInput">
                            تاريخ الاستحقاق
                          </span>
                          <input
                            type="date"
                            className="form-control text-end"
                            id="gstInput"
                            onChange={(e) => setPaymentDueDate(e.target.value)}
                          />
                        </div>
                        <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                          <span
                            className="input-group-text"
                            htmlFor="netAmountInput"
                          >
                            حالة الفاتورة
                          </span>
                          <input
                            type="text"
                            className="form-control text-end"
                            id="netAmountInput"
                            value={paymentStatus}
                            readOnly
                          />
                        </div>
                      </div> */}
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer d-flex flex-nowrap align-items-center justify-content-between m-0 p-1">
                <input
                  type="submit"
                  className="btn btn-success col-6 h-100 px-2 py-3 m-0"
                  value="اضافه"
                />
                <input
                  type="button"
                  className="btn btn-danger col-6 h-100 px-2 py-3 m-0"
                  data-dismiss="modal"
                  value="إغلاق"
                  onClick={resetFields}
                />
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* <div id="editProductionRecordModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded">
            <form onSubmit={updateProductionOrder}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">تعديل طلب تصنيع</h4>
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
                    اختر المخزن
                  </label>
                  <select
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    required
                    onChange={(e) => setStoreId(e.target.value)}
                  >
                    <option value={storeId}>
                      {
                        allStores.find((store) => store._id === storeId)
                          ?.storeName
                      }
                    </option>
                    {allStores.map((store, i) => (
                      <option value={store._id} key={i}>
                        {store.storeName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    اختر التصنيف
                  </label>
                  <select
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    required
                    onChange={(e) => getStockItemByCategory(e.target.value)}
                  >
                    <option>
                      {
                        AllCategoryStock.find(
                          (category) => category._id === stockItem.categoryId?._id
                        )?.categoryName
                      }
                    </option>
                    {AllCategoryStock.map((category, i) => (
                      <option value={category._id} key={i}>
                        {category.categoryName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    اختر الصنف
                  </label>
                  <select
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    required
                    onChange={(e) => handleSelectStockItem(e.target.value)}
                  >
                    <option value={stockItem._id}>{stockItem.itemName}</option>
                    {stockItemFiltered.map((item, i) => (
                      <option value={item._id} key={i}>
                        {item.itemName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الكمية
                  </label>
                  <div className="form-group col-12 d-flex align-items-center">
                    <input
                      type="number"
                      className="form-control border-primary m-0 p-2 h-auto"
                      required
                      min={0}
                      max={stockItem?.reorderQuantity}
                      value={quantityRequested}
                      onChange={(e) => setQuantityRequested(e.target.value)}
                    />
                    <input
                      type="button"
                      className="btn btn-primary ms-2 m-0 p-2 h-auto"
                      value={unit}
                    />
                  </div>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    قسم الاعداد
                  </label>
                  <select
                    required
                    className="form-control border-primary m-0 p-2 h-auto"
                    onChange={(e) => setdepartment(e.target.value)}
                  >
                    <option>
                      {
                        listdepartments.find(
                          (section) => section._id === department
                        )?.name
                      }
                    </option>
                    {listdepartments.map((section, i) => (
                      <option value={section._id} key={i}>
                        {section.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الملاحظات
                  </label>
                  <textarea
                    value={notes}
                    className="form-control border-primary m-0 p-2 h-auto"
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer d-flex flex-nowrap align-items-center justify-content-between m-0 p-1">
                <input
                  type="submit"
                  className="btn btn-success col-6 h-100 px-2 py-3 m-0"
                  value="اضافه"
                />
                <input
                  type="button"
                  className="btn btn-danger col-6 h-100 px-2 py-3 m-0"
                  data-dismiss="modal"
                  value="إغلاق"
                  onClick={resetFields}
                />
              </div>
            </form>
          </div>
        </div>
      </div>

      <div id="deleteProductionRecordModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={deleteProductionOrder}>
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
        </div> */}
      {/* </div> */}
    </div>
  );
};

export default ProductionRecord;
