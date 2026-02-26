import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { dataContext } from "../../../../App";
import { toast } from "react-toastify";
import "../orders/Orders.css";

const StockItem = () => {
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

  const stockItemPermission =
    permissionsList &&
    permissionsList.filter(
      (permission) => permission.resource === "stock Item"
    )[0];

  // State variables for creating or editing a stock item
  const [SKU, setSKU] = useState(""); // For item code
  const [itemName, setItemName] = useState(""); // For item name
  const [categoryId, setCategoryId] = useState(""); // For category ID
  const [stores, setStores] = useState([]); // For list of stores
  const [storageUnit, setStorageUnit] = useState(""); // For storage unit (e.g., Kg, Litre, etc.)
  const [parts, setParts] = useState(0); // For number of parts
  const [ingredientUnit, setIngredientUnit] = useState(""); // For ingredient unit
  const [costPerPart, setCostPerPart] = useState(0); // For cost per part
  const [minThreshold, setMinThreshold] = useState(0); // For minimum threshold
  const [maxThreshold, setMaxThreshold] = useState(0); // For maximum threshold
  const [reorderQuantity, setReorderQuantity] = useState(0); // For reorder quantity
  const [costMethod, setCostMethod] = useState(""); // For cost method (e.g., FIFO, LIFO)
  const [suppliers, setSuppliers] = useState([]); // For suppliers
  const [isActive, setIsActive] = useState(true); // For active status
  const [notes, setNotes] = useState(""); // For notes or remarks

  const [stockItemId, setStockItemId] = useState(""); // For stock item ID (used when editing)

  const costMethodEN = ["FIFO", "LIFO", "Weighted Average"];
  const costMethodAR = [
    "الوارد اولا يصرف اولا",
    "الوارد اخيرا يصرف اولا",
    "متوسط السعر",
  ];

  const handleStoreSelection = (e) => {
    const selectedStoreId = e.target.value;
    const isChecked = e.target.checked;

    if (isChecked) {
      setStores((prevStores) => [...prevStores, selectedStoreId]);
    } else {
      const removeStoreId = stores.filter((store) => store !== selectedStoreId);
      setStores(removeStoreId);
    }
  };

  const generateSKU = () => {
    if (!categoryId) {
      toast.warn("اختر اولا التصنيف ");
      return;
    }
    const category = AllCategoryStock.find(
      (category) => category._id === categoryId
    );
    if (!category) {
      toast.error("التصنيف غير موجود");
      return;
    }

    const categoryCode = category.categoryCode;

    const filterStockItemByCategory = AllStockItems.filter(
      (item) => item.categoryId?._id === categoryId
    ).reverse();
    const itemOrder = filterStockItemByCategory.length + 1;
    function generate(categoryCode, itemOrder) {
      return `${categoryCode}-${String(itemOrder).padStart(4, "0")}`;
    }

    const SKUGenerated = generate(categoryCode, itemOrder);
    setSKU(SKUGenerated);
  };

  const createStockItem = async (e) => {
    e.preventDefault();

    const config = await handleGetTokenAndConfig();

    if (stockItemPermission && !stockItemPermission.create) {
      toast.warn("ليس لك صلاحية لإنشاء عنصر جديد في المخزن");
      return;
    }

    const isItemDuplicate =
      AllStockItems &&
      AllStockItems.some(
        (item) => item.itemName === itemName || item.SKU === SKU
      );

    if (isItemDuplicate) {
      toast.warn("هذا الاسم أو الكود مكرر! حاول مرة أخرى");
      return;
    }

    if (!SKU || !itemName || !categoryId || !stores.length) {
      toast.warn("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    try {
      setIsLoading(true);

      const response = await axios.post(
        `${apiUrl}/api/stockItem/`,
        {
          SKU,
          itemName,
          categoryId,
          stores,
          storageUnit,
          parts,
          ingredientUnit,
          minThreshold,
          maxThreshold,
          reorderQuantity,
          costMethod,
          costPerPart,
          isActive,
          notes,
        },
        config
      );

      if (response.data.error) {
        if (response.data.error === "Item SKU already exists") {
          toast.warn("هذا الكود موجود من قبل");
        } else {
          toast.error("فشل في إنشاء عنصر المخزون: " + response.data.error);
        }
        setIsLoading(false);
        return;
      }

      getStockItems();

      toast.success("تم إنشاء عنصر المخزون بنجاح");
    } catch (error) {
      setIsLoading(false);
      toast.error("فشل في إنشاء عنصر المخزون");
    }
  };

  const resetFields = () => {
    setStockItem({});
    setSKU("");
    setStockItemId("");
    setStores([]);
    setCategoryId("");
    setItemName("");
    setMinThreshold(0);
    setMaxThreshold(0);
    setReorderQuantity(0);
    setStorageUnit("");
    setIngredientUnit("");
    setParts(0);
    setCostMethod("");
    setNotes("");
    setIsActive(true);
  };

  // Function to edit a stock item
  const editStockItem = async (e) => {
    e.preventDefault();

    const config = await handleGetTokenAndConfig();
    if (stockItemPermission && !stockItemPermission.update) {
      toast.warn("ليس لك صلاحية لتعديل عناصر المخزن");
      return;
    }

    if (!SKU || !itemName || !categoryId || !stores.length) {
      toast.warn("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.put(
        `${apiUrl}/api/stockItem/${stockItemId}`,
        {
          SKU,
          itemName,
          categoryId,
          stores,
          storageUnit,
          parts,
          ingredientUnit,
          minThreshold,
          maxThreshold,
          reorderQuantity,
          costMethod,
          costPerPart,
          isActive,
          notes,
        },
        config
      );

      if (response) {
        getStockItems();
      }

      toast.success("تم تحديث عنصر المخزون بنجاح");
    } catch (error) {
      toast.error("فشل في تحديث عنصر المخزون");
    } finally {
      resetFields();
      setIsLoading(false);
    }
  };

  // Function to delete a stock item
  const deleteStockItem = async (e) => {
    e.preventDefault();
    const config = await handleGetTokenAndConfig();
    if (stockItemPermission && !stockItemPermission.delete) {
      toast.warn("ليس لك صلاحية لحذف عنصر من المخزن");
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.delete(
        `${apiUrl}/api/stockItem/${stockItemId}`,
        config
      );
      if (response.isActive === 200) {
        getStockItems(); // Update the list of stock items after deletion

        // Notify on success
        toast.success("تم حذف عنصر المخزون بنجاح");
      }
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      // Notify on error
      toast.error("فشل في حذف عنصر المخزون");
    }
  };

  const [AllStockItems, setAllStockItems] = useState([]);

  // Function to retrieve all stock items
  const getStockItems = async () => {
    const config = await handleGetTokenAndConfig();
    if (stockItemPermission && !stockItemPermission.read) {
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

  const [stockItem, setStockItem] = useState({});
  const handelEditStockItemModal = (stockItem) => {
    const item = JSON.parse(stockItem);
    setStockItem(item);
    setSKU(item.SKU);
    setStockItemId(item._id);
    setCategoryId(item.categoryId?._id);
    setItemName(item.itemName);
    setMinThreshold(item.minThreshold);
    setMaxThreshold(item.maxThreshold);
    setReorderQuantity(item.reorderQuantity);
    setStorageUnit(item.storageUnit);
    setIngredientUnit(item.ingredientUnit);
    setParts(item.parts);
    setCostMethod(item.costMethod);
    setNotes(item.notes);
    setIsActive(item.isActive);
    setStores(item.stores);
    setCostPerPart(item.costPerPart);
  };

  const searchByitem = (name) => {
    if (!name) {
      getStockItems();
      return;
    }
    const filter = AllStockItems.filter((item) =>
      item.itemName.toLowerCase().startsWith(name.toLowerCase())
    );
    setAllStockItems(filter);
  };

  const searchByCategory = async (category) => {
    if (!category) {
      getStockItems();
      return;
    }
    const filter = AllStockItems.filter(
      (item) => item.categoryId?._id === category
    );
    setAllStockItems(filter);
  };

  const [AllSuppliers, setAllSuppliers] = useState([]);
  // Function to retrieve all suppliers
  const getAllSuppliers = async () => {
    try {
      const config = await handleGetTokenAndConfig();
      const response = await axios.get(apiUrl + "/api/supplier/", config);

      if (!response || !response.data) {
        // Handle unexpected response or empty data
        throw new Error("استجابة غير متوقعة أو بيانات فارغة");
      }

      const suppliers = response.data.reverse();
      if (suppliers.length > 0) {
        setAllSuppliers(suppliers);
        toast.success("تم استرداد جميع الموردين بنجاح");
      }

      // Notify on success
    } catch (error) {
      console.error(error);

      // Notify on error
      toast.error("فشل في استرداد الموردين");
    }
  };

  useEffect(() => {
    getStockItems();
    getAllStores();
    getAllSuppliers();
    getAllCategoryStock();
  }, []);

  return (
    <div className="w-100 px-3 d-flex align-itmes-center justify-content-start">
      <div className="table-responsive mt-1">
        <div className="table-wrapper p-3 mw-100">
          <div className="table-title">
            <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
              <div className="text-right">
                <h2>
                  ادارة <b>عناصر المخزن</b>
                </h2>
              </div>
              {stockItemPermission &&
                stockItemPermission &&
                stockItemPermission &&
                stockItemPermission.create && (
                  <div className="col-12 col-md-6 p-0 m-0 d-flex flex-wrap aliegn-items-center justify-content-end print-hide">
                    <a
                      href="#addStockItemModal"
                      className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-success"
                      data-toggle="modal"
                    >
                      {" "}
                      <span>اضافه منتج جديد</span>
                    </a>

                    {/* <a href="#deleteStockItemModal" className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-danger" data-toggle="modal"> <span>حذف</span></a> */}
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
                  نوع المخزن
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
            </div>
          </div>
          <table className="table table-striped table-hover">
            <thead>
              <tr>
                <th>م</th>
                <th>الكود</th>
                <th>اسم الصنف</th>
                <th>المخازن</th>
                <th>التصنيف</th>
                <th>الوحدة كبيرة</th>
                <th>عدد الوحدات</th>
                <th>الوحدة صغيرة</th>
                <th>الحد الأدني</th>
                <th>الحد الأقصى</th>
                <th>الكمية لإعادة الطلب</th>
                <th>طريقة التكلفة</th>
                <th>تكلفة الوحدة</th>
                <th>الموردون</th>
                <th>الحالة</th>
                <th>اضيف بواسطة</th>
                <th>تاريخ الإضافة</th>
                <th>عدل بواسطة</th>
                <th>تاريخ التعديل</th>
                <th>ملاحظات</th>
                <th>اجراءات</th>
              </tr>
            </thead>
            <tbody>
              {AllStockItems &&
                AllStockItems.map((item, i) => {
                  if (i >= startPagination && i < endPagination) {
                    return (
                      <tr
                        key={i}
                        className={`${
                          item.currentBalance === 0
                            ? "bg-danger text-white"
                            : item.currentBalance < 0
                            ? "bg-secondary text-white"
                            : item.currentBalance < item.minThreshold
                            ? "bg-warning"
                            : ""
                        }`}
                      >
                        <td>{i + 1}</td>
                        <td>{item.SKU}</td>
                        <td>{item.itemName}</td>
                        <td>
                          {item.stores
                            ?.map((store) => store.storeName)
                            .join(" - ")}
                        </td>
                        <td>{item.categoryId?.categoryName}</td>
                        <td>{item.storageUnit}</td>
                        <td>{item.parts}</td>
                        <td>{item.ingredientUnit}</td>
                        <td>{item.minThreshold}</td>
                        <td>{item.maxThreshold}</td>
                        <td>{item.reorderQuantity}</td>
                        <td>{item.costMethod}</td>
                        <td>{item.costPerPart}</td>
                        <td>
                          {AllSuppliers.filter((supplier) =>
                            supplier.itemsSupplied?.some(
                              (itemSupplied) => itemSupplied._id === item._id
                            )
                          )
                            .map((supplier) => supplier.name)
                            .join("-")}
                        </td>
                        <td>{item.isActive ? "نشط" : "غير نشط"}</td>
                        <td>{item.createdBy?.fullname}</td>
                        <td>{formatDateTime(item.createdAt)}</td>
                        <td>{item.updatedBy?.fullname}</td>
                        <td>{formatDateTime(item.updatedAt)}</td>
                        <td>{item.notes}</td>
                        <td>
                          {stockItemPermission?.update && (
                            <button
                              data-target="#editStockItemModal"
                              className="btn btn-sm btn-primary ml-2 "
                              data-toggle="modal"
                              onClick={() => {
                                handelEditStockItemModal(JSON.stringify(item));
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
                          )}
                          {stockItemPermission?.delete && (
                            <button
                              data-target="#deleteStockItemModal"
                              className="btn btn-sm btn-danger"
                              data-toggle="modal"
                              onClick={() => setStockItemId(item._id)}
                            >
                              <i
                                className="material-icons"
                                data-toggle="tooltip"
                                title="Delete"
                              >
                                &#xE872;
                              </i>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  }
                })}
            </tbody>
          </table>

          <div className="clearfix">
            <div className="hint-text text-dark">
              عرض{" "}
              <b>
                {AllStockItems.length > endPagination
                  ? endPagination
                  : AllStockItems.length}
              </b>{" "}
              من <b>{AllStockItems.length}</b> عنصر
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

      <div id="addStockItemModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded">
            <form onSubmit={createStockItem}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">اضافه صنف بالمخزن</h4>
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
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    required
                    onChange={(e) => setItemName(e.target.value)}
                  />
                </div>

                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    المخزن
                  </label>
                  <div className="checkbox-group border-primary col-6 p-2">
                    {allStores.map((store, i) => (
                      <div key={i} className="form-check p-0 pl-0">
                        <input
                          type="checkbox"
                          id={`store-${store._id}`}
                          name="stores"
                          value={store._id}
                          className="form-check-input"
                          onChange={handleStoreSelection}
                        />
                        <label
                          htmlFor={`store-${store._id}`}
                          className="form-check-label mr-4"
                        >
                          {store.storeName}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    التصنيف
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    name="category"
                    id="category"
                    onChange={(e) => setCategoryId(e.target.value)}
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
                    الكود
                  </label>
                  <div className="form-group col-12 d-flex align-items-center">
                    <input
                      type="text"
                      className="form-control border-primary m-0 p-2 h-auto"
                      value={SKU}
                      onChange={(e) => setSKU(e.target.value)}
                    />
                    <input
                      type="button"
                      className="btn btn-primary ms-2 m-0 p-2 h-auto"
                      value="انشاء كود"
                      onClick={generateSKU}
                    />
                  </div>
                </div>

                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الوحدة الكبيرة
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    required
                    onChange={(e) => setStorageUnit(e.target.value)}
                  />
                </div>

                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الوحدة الصغيرة
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    required
                    onChange={(e) => setIngredientUnit(e.target.value)}
                  />
                </div>

                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    عدد الاجزاء
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="form-control border-primary m-0 p-2 h-auto"
                    required
                    onChange={(e) => setParts(e.target.value)}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الحد الأدني
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="form-control border-primary m-0 p-2 h-auto"
                    required
                    onChange={(e) => setMinThreshold(e.target.value)}
                  />
                </div>

                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الحد الأقصى
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="form-control border-primary m-0 p-2 h-auto"
                    required
                    onChange={(e) => setMaxThreshold(e.target.value)}
                  />
                </div>

                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الكمية لإعادة الطلب
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="form-control border-primary m-0 p-2 h-auto"
                    required
                    onChange={(e) => setReorderQuantity(e.target.value)}
                  />
                </div>

                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    طريقة حساب التكلفة
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    onChange={(e) => setCostMethod(e.target.value)}
                  >
                    <option>اختر الطريقة</option>
                    {costMethodEN.map((method, i) => (
                      <option value={method} key={i}>
                        {costMethodAR[i]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الحالة
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    onChange={(e) => setIsActive(e.target.value)}
                  >
                    <option>اختر الحالة</option>
                    <option value={true}>نشط</option>
                    <option value={false}>غير نشط</option>
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

      <div id="editStockItemModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded">
            <form onSubmit={editStockItem}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">تعديل صنف بالمخزن</h4>
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
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    defaultValue={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    المخزن
                  </label>
                  <div className="checkbox-group border-primary col-6 p-2">
                    {allStores.map((store, i) => (
                      <div key={i} className="form-check p-0 pl-0">
                        <input
                          type="checkbox"
                          id={`store-${store._id}`}
                          name="stores"
                          value={store._id}
                          className="form-check-input"
                          checked={
                            stores.find((s) => s.storeId === store._id) !==
                            undefined
                          }
                          onChange={handleStoreSelection}
                        />
                        <label
                          htmlFor={`store-${store._id}`}
                          className="form-check-label mr-4"
                        >
                          {store.storeName}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    التصنيف
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    <option value={stockItem.categoryId?._id}>
                      {stockItem.categoryId?.categoryName}
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
                    الكود
                  </label>
                  <div className="form-group col-12 d-flex align-items-center">
                    <input
                      type="text"
                      className="form-control border-primary m-0 p-2 h-auto"
                      value={SKU}
                      onChange={(e) => setSKU(e.target.value)}
                    />
                    <input
                      type="button"
                      className="btn btn-primary ms-2 m-0 p-2 h-auto"
                      value="انشاء كود"
                      onClick={generateSKU}
                    />
                  </div>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الوحدة الكبيرة
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={storageUnit}
                    onChange={(e) => setStorageUnit(e.target.value)}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الوحدة الصغيرة
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={ingredientUnit}
                    onChange={(e) => setIngredientUnit(e.target.value)}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    عدد الاجزاء
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={parts}
                    onChange={(e) => setParts(e.target.value)}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الحد الأدني
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={minThreshold}
                    onChange={(e) => setMinThreshold(e.target.value)}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الحد الأقصى
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={maxThreshold}
                    onChange={(e) => setMaxThreshold(e.target.value)}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    كمية إعادة الطلب
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={reorderQuantity}
                    onChange={(e) => setReorderQuantity(e.target.value)}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    طريقة حساب التكلفة
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={costMethod}
                    onChange={(e) => setCostMethod(e.target.value)}
                  >
                    <option value={costMethod}>{costMethod}</option>
                    {costMethodEN.map((method, i) => (
                      <option value={method} key={i}>
                        {costMethodAR[i]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الحالة
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={isActive}
                    onChange={(e) => setIsActive(e.target.value)}
                  >
                    <option value={isActive}>
                      {isActive ? "نشط" : "غير نشط"}
                    </option>
                    <option value={true}>نشط</option>
                    <option value={false}>غير نشط</option>
                  </select>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    التاريخ
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={new Date().toLocaleDateString()}
                    readOnly
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الملاحظات
                  </label>
                  <textarea
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
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
            <form onSubmit={deleteStockItem}>
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

export default StockItem;
