import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { dataContext } from "../../../../context/appContext";
import { toast } from "react-toastify";
import "../orders/Orders.css";

const ProductionOrder = () => {
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
  } = useContext(dataContext);

  const productionOrderPermission =
    permissionsList &&
    permissionsList.filter(
      (permission) => permission.resource === "Production Order"
    )[0];

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

  const createProductionOrder = async (e) => {
    e.preventDefault();
    const config = await handleGetTokenAndConfig();
    if (productionOrderPermission && !productionOrderPermission.create) {
      toast.warn("ليس لديك صلاحية لإضافة أمر إنتاج");
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.post(
        `${apiUrl}/api/productionOrder/`,
        {
          storeId,
          department,
          stockItem: stockItemId,
          unit,
          quantityRequested,
          notes,
        },
        config
      );

      const productionOrderData = response.data;

      if (!productionOrderData) {
        throw new Error("Unexpected response or empty data");
      }
      if (productionOrderData.status === 201) {
        toast.success("تم إنشاء أمر الإنتاج بنجاح");
        getProductionOrders();
      }

      setIsLoading(false);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
      toast.error("فشل في إنشاء أمر الإنتاج");
    }
  };

  const updateProductionOrder = async (e) => {
    e.preventDefault();
    const config = await handleGetTokenAndConfig();
    if (productionOrderPermission && !productionOrderPermission.update) {
      toast.warn("ليس لديك صلاحية لتحديث أمر الإنتاج");
      return;
    }
    setIsLoading(true);
    console.log({
      storeId,
      department,
      stockItem: stockItemId,
      unit,
      quantityRequested,
      notes,
    });
    try {
      const response = await axios.put(
        `${apiUrl}/api/productionOrder/${productionOrderId}`,
        {
          storeId,
          department,
          stockItem: stockItemId,
          unit,
          quantityRequested,
          notes,
        },
        config
      );

      if (!response || !response.data) {
        throw new Error("Unexpected response or empty data");
      }

      if (response.status === 200) {
        toast.success("تم تحديث أمر الإنتاج بنجاح");
        getProductionOrders();
      }

      setIsLoading(false);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
      toast.error("فشل في تحديث أمر الإنتاج");
    }
  };

  const [productionOrders, setProductionOrders] = useState([]);

  const getProductionOrders = async () => {
    const config = await handleGetTokenAndConfig();
    if (productionOrderPermission && !productionOrderPermission.read) {
      toast.warn("ليس لديك صلاحية لعرض أوامر الإنتاج");
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.get(
        `${apiUrl}/api/productionOrder/`,
        config
      );
      const productionOrdersData = response.data;

      if (!productionOrders) {
        throw new Error("Unexpected response or empty data");
      }

      if (response.status === 200) {
        setProductionOrders(productionOrdersData);
        toast.success("تم استرداد أوامر الإنتاج بنجاح");
      }
      setIsLoading(false);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
      toast.error("فشل في استرداد أوامر الإنتاج");
    }
  };

  const deleteProductionOrder = async (e) => {
    e.preventDefault();
    const config = await handleGetTokenAndConfig();
    if (productionOrderPermission && !productionOrderPermission.delete) {
      toast.warn("ليس لديك صلاحية لحذف أمر الإنتاج");
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.delete(
        `${apiUrl}/api/productionOrder/${productionOrderId}`,
        config
      );
      const productionOrdersData = response.data;
      if (!productionOrdersData) {
        throw new Error("Unexpected response or empty data");
      }
      if (productionOrdersData.status === 200) {
        toast.success("تم حذف أمر الإنتاج بنجاح");
        getProductionOrders();
      }
      setIsLoading(false);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
      toast.error("فشل في حذف أمر الإنتاج");
    }
  };

  const getProductionOrderByStore = async (storeId) => {
    const config = await handleGetTokenAndConfig();
    if (productionOrderPermission && !productionOrderPermission.read) {
      toast.warn("ليس لديك صلاحية لعرض أوامر الإنتاج");
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.get(
        `${apiUrl}/api/productionOrder/store/${storeId}`,
        config
      );
      const productionOrdersData = response.data;

      if (!productionOrdersData) {
        throw new Error("Unexpected response or empty data");
      }
      if (response.status === 200) {
        setProductionOrders(productionOrdersData);
        toast.success("تم استرداد أوامر الإنتاج بنجاح");
      }

      setIsLoading(false);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
      toast.error("فشل في استرداد أوامر الإنتاج");
    }
  };

  const getProductionOrderBySection = async (sectionId) => {
    const config = await handleGetTokenAndConfig();
    if (productionOrderPermission && !productionOrderPermission.read) {
      toast.warn("ليس لديك صلاحية لعرض أوامر الإنتاج");
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.get(
        `${apiUrl}/api/productionOrder/section/${sectionId}`,
        config
      );
      const productionOrdersData = response.data;
      if (!productionOrdersData) {
        throw new Error("Unexpected response or empty data");
      }

      if (response.status === 200) {
        setProductionOrders(productionOrdersData);
        toast.success("تم استرداد أوامر الإنتاج بنجاح");
      }
      setIsLoading(false);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
      toast.error("فشل في استرداد أوامر الإنتاج");
    }
  };

  // exchang production status

  const changeProductionOrderStatus = async (id) => {
    const config = await handleGetTokenAndConfig();
    if (productionOrderPermission && !productionOrderPermission.read) {
      toast.warn("ليس لديك صلاحية لعرض أوامر الإنتاج");
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.get(
        `${apiUrl}/api/productionOrder/status/${id}}`,
        { productionStatus: "Canceled" },
        config
      );

      if (!response || !response.data) {
        throw new Error("Unexpected response or empty data");
      }

      if (response.status === 200) {
        toast.success("تم تغيير حالة الإنتاج بنجاح");
      }

      setIsLoading(false);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
      toast.error("فشل في استرداد أوامر الإنتاج");
    }
  };

  const resetFields = () => {
    setProductionOrderId("");
    setStoreId("");
    setdepartment("");
    setStockItem("");
    setUnit("");
    setProductionStatus("Pending");
    setQuantityRequested(0);
    setNotes("");
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

  const handleEdit = (order) => {
    setProductionOrderId(order._id);
    setStockItemId(order.stockItemId?._id);
    setStoreId(order.storeId?._id);
    setdepartment(order.department?._id);
    setStockItem(order.stockItem);
    setUnit(order.unit);
    setQuantityRequested(order.quantityRequested);
    setNotes(order.notes);

    getStockItemByCategory(order.stockItem.categoryId?._id);
  };

  const searchByitem = (name) => {
    if (!name) {
      getStockItems();
      return;
    }
    const filter = productionOrders.filter((order) =>
      order.stockItem?.itemName.toLowerCase().startsWith(name.toLowerCase())
    );
    setProductionOrders(filter);
  };

  const searchByCategory = async (category) => {
    if (!category) {
      getStockItems();
      return;
    }
    const filter = productionOrders.filter(
      (order) => order.categoryId?._id === category
    );
    setAllStockItems(filter);
  };

  const [stockItemFiltered, setStockItemFiltered] = useState([]);
  const getStockItemByCategory = (category) => {
    const stockItems = AllStockItems.filter(
      (item) => item.categoryId._id === category
    );
    setStockItemFiltered(stockItems);
  };

  const handleSelectStockItem = (stockItemId) => {
    const stockItem = AllStockItems.find((item) => item._id === stockItemId);
    setStockItem(stockItem);
    setStockItemId(stockItemId);
    setUnit(stockItem.storageUnit);
  };

  useEffect(() => {
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
                  ادارة <b>اوامر التصنيع</b>
                </h2>
              </div>
              {productionOrderPermission &&
                productionOrderPermission &&
                productionOrderPermission &&
                productionOrderPermission.create && (
                  <div className="col-12 col-md-6 p-0 m-0 d-flex flex-wrap aliegn-items-center justify-content-end print-hide">
                    <a
                      href="#addProductionOrdermModal"
                      className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-success"
                      data-toggle="modal"
                    >
                      {" "}
                      <span>انشاء امر تصنيع</span>
                    </a>

                    {/* <a href="#deleteProductionOrderModal" className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-danger" data-toggle="modal"> <span>حذف</span></a> */}
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
                  onChange={(e) => searchByitem(e.target.value)}
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
                <th>رقم الطلب</th>
                <th>اسم الصنف</th>
                <th>المخزن</th>
                <th>التصنيف</th>
                <th>القسم</th>
                <th>الوحدة</th>
                <th>الكمية المطلوبة</th>
                <th>الحالة</th>
                <th>تم الإنشاء بواسطة</th>
                <th>تاريخ الإنشاء</th>
                <th>تم التعديل بواسطة</th>
                <th>تاريخ التعديل</th>
                <th>ملاحظات</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {productionOrders &&
                productionOrders.map((order, index) => (
                  <tr
                    key={order._id}
                    className={
                      order.status === "Canceled" ? "bg-danger text-white" : ""
                    }
                  >
                    <td>{index + 1}</td>
                    <td>{order.orderNumber}</td>
                    <td>{order.stockItem?.itemName || "غير محدد"}</td>
                    <td>{order.storeId?.storeName || "غير محدد"}</td>
                    <td>
                      {order.stockItem.categoryId?.categoryName || "غير محدد"}
                    </td>
                    <td>{order.department?.name || "غير محدد"}</td>
                    <td>{order.unit}</td>
                    <td>{order.quantityRequested}</td>
                    <td>{order.productionStatus}</td>
                    <td>{order.createdBy?.fullname || "غير معروف"}</td>
                    <td>{formatDateTime(order.createdAt)}</td>
                    <td>{order.updatedBy?.fullname || "غير معروف"}</td>
                    <td>{formatDateTime(order.updatedAt)}</td>
                    <td>{order.notes || "لا توجد ملاحظات"}</td>
                    <td>
                      {productionOrderPermission?.update && (
                        <button
                          data-target="#editProductionOrderModal"
                          data-toggle="modal"
                          className="btn btn-sm btn-primary ml-2"
                          onClick={() => handleEdit(order)}
                        >
                          <i className="material-icons" title="تعديل">
                            &#xE254;
                          </i>
                        </button>
                      )}
                      {productionOrderPermission?.delete && (
                        <button
                          data-target="#deleteProductionOrderModal"
                          data-toggle="modal"
                          className="btn btn-sm btn-danger"
                          onClick={() => setProductionOrderId(order._id)}
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
                {productionOrders.length > endPagination
                  ? endPagination
                  : productionOrders.length}
              </b>{" "}
              من <b>{productionOrders.length}</b> عنصر
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

      <div id="addProductionOrdermModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded">
            <form onSubmit={createProductionOrder}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">انشاء طلب تصنيع</h4>
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
                    <option>اختر المخزن</option>
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
                    <option>اختر التصنيف</option>
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
                    <option>اختر الصنف</option>
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
                    <option>اختر القسم</option>
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

      <div id="editProductionOrderModal" className="modal fade">
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
                          (category) =>
                            category._id === stockItem.categoryId?._id
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

      <div id="deleteProductionOrderModal" className="modal fade">
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
        </div>
      </div>
    </div>
  );
};

export default ProductionOrder;
