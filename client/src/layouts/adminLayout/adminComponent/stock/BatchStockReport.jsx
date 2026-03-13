import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AppContext } from "../../../../context/appContext";
import { toast } from "react-toastify";
import "../orders/Orders.css";

const BatchStockReport = () => {
  

  const {
    permissionsList,
    employeeLoginInfo,
    formatDateTime,
    formatDate,
    isLoading,
    setIsLoading,
    EditPagination,
    startPagination,
    endPagination,
    setStartPagination,
    setEndPagination,
    filterByTime,
    filterByDateRange,
    setStartDate,
    setEndDate,
  apiUrl,
handleGetTokenAndConfig,
} = useContext(AppContext);

  const stockMovementPermission =
    permissionsList &&
    permissionsList.filter(
      (perission) => perission.resource === "stock Movement"
    )[0];

  const sourceEn = [
    "Purchase",
    "ReturnPurchase",
    "Issuance",
    "ReturnIssuance",
    "Wastage",
    "Damaged",
    "stockAdjustment",
    "OpeningBalance",
  ];

  const sourceAr = [
    "مشتريات",
    "إرجاع مشتريات",
    "صرف",
    "إرجاع منصرف",
    "هدر",
    "تالف",
    "تعديل المخزون",
    "رصيد افتتاحي",
  ];

  const [itemId, setItemId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [costMethod, setCostMethod] = useState("");
  const [source, setSource] = useState("");
  const [unit, setunit] = useState("");



  const [batches, setbatches] = useState([]);

  const getallStockaction = async () => {
    try {
      const config = await handleGetTokenAndConfig();
      const response = await axios.get(apiUrl + "/api/stockmovement/", config);
      
      const stockActions = await response.data;
      const filterBatches = stockActions.filter(action => action.inbound?.quantity > 0);

      setbatches(filterBatches)
    } catch (error) {
      
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

  const [StockItems, setStockItems] = useState([]);
  
  const getStockItems = async () => {
    const config = await handleGetTokenAndConfig();
    try {
      const response = await axios.get(apiUrl + "/api/stockitem/", config);
      if (response) {
        
        setStockItems(response.data.reverse());
      }
    } catch (error) {
      toast.error("فشل استيراد الاصناف بشكل صحيح !اعد تحميل الصفحة ");
    }
  };

  const [allCategoryStock, setAllCategoryStock] = useState([]);

  const getAllCategoryStock = async () => {
    const config = await handleGetTokenAndConfig();

    try {
      const response = await axios.get(apiUrl + "/api/stockCategory/", config);
      setAllCategoryStock(response.data.reverse());
    } catch (error) {
      console.error("Error fetching category stock:", error);
      toast.error("حدث خطأ اثناء جلب بيانات التصنيفات ! اعد تحميل الصفحة");
    }
  };




  const searchByStore = (store) => {
    if (!store) {
      getallStockaction();
      return;
    }
    const items = batches.filter(
        (batch) => batch.storeId?._id === store
      );
      setbatches(items);
  };

  const searchByCategory = (category) => {
    if (!category) {
      getallStockaction();
      return;
    }
    const items = batches.filter(
        (batch) => batch.categoryId?._id === category
      );
      setbatches(items);
  };


  const searchByitem = (item) => {
    if (!item) {
      getallStockaction();
      return;
    }
    const items = batches.filter(
      (batch) => batch.itemId?.itemName.startsWith(item) === true
    );
    setbatches(items);
  };


  useEffect(() => {
    getallStockaction();
    getStockItems();
    getAllStores();
    getAllCategoryStock();
  }, []);


  return (
    <div className="w-100 px-3 d-flex align-itmes-center justify-content-start">
      <div className="table-responsive">
        <div className="table-wrapper p-3 mw-100">
          <div className="table-title">
            <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
              <div className="text-right">
                <h2>
                  تقرير <b>دفعات المخزن</b>
                </h2>
              </div>
              <div className="col-12 col-md-6 p-0 m-0 d-flex flex-wrap aliegn-items-center justify-content-end print-hide">
              </div>
            </div>
          </div>
          <div class="table-filter print-hide">
            <div class="col-12 text-dark d-flex flex-wrap align-items-center justify-content-start p-0 m-0">
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
              <div class="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  المخزن
                </label>
                <select
                  class="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => searchByStore(e.target.value)}
                >
                  <option value={""}>الكل</option>
                  {allStores.map((store, i) => {
                    return (
                      <option key={i} value={store._id}>
                        {store.storeName}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div class="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  التصنيف
                </label>
                <select
                  class="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => searchByCategory(e.target.value)}
                >
                  <option value={""}>الكل</option>
                  {allCategoryStock.map((category, i) => {
                    return (
                      <option key={i} value={category._id}>
                        {category.categoryName}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div class="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  اسم الصنف
                </label>
                <input
                  type="text"
                  class="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => searchByitem(e.target.value)}
                />
              </div>


              <div className="col-12 text-dark d-flex flex-wrap align-items-center justify-content-start p-0 m-0 mt-3">
                <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    فلتر حسب الوقت
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    onChange={(e) =>
                      setbatches(
                        filterByTime(e.target.value, batches)
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
                        setbatches(filterByDateRange(batches))
                      }
                    >
                      <i className="fa fa-search"></i>
                    </button>
                    <button
                      type="button"
                      className="btn btn-warning h-100 p-2"
                      onClick={getallStockaction}
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
                <th >م</th>
                <th >تاريخ الحركة</th>
                <th >المخزن</th>
                <th >اسم الصنف</th>
                <th >التصنيف</th>
                <th >مصدر الحركة</th>
                <th >الوحدة</th>
                <th >الكمية</th>
                <th >باقي بالمخزن</th>
                <th >تاريخ الانتهاء</th>
                <th >أضيف بواسطة</th>
              </tr>
            </thead>
            <tbody>
              {batches &&
                batches.map((batch, i) => {
                  if (i >= startPagination && i < endPagination) {
                    return (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{formatDateTime(batch.createdAt)}</td>
                        <td>{batch.storeId?.storeName}</td>
                        <td>{batch.itemId?.itemName}</td>
                        <td>{batch.categoryId?.categoryName}</td>
                        <td>{sourceAr[sourceEn.findIndex(source=> source === batch.source)]}</td>
                        <td>{batch.unit}</td>
                        <td>{batch.inbound?.quantity || 0}</td>
                        <td>{batch.remainingQuantity}</td>
                        <td>{batch.expirationDate&&formatDate(batch.expirationDate)}</td>
                        <td>{batch.createdBy?.fullname}</td>
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
                {batches.length > endPagination
                  ? endPagination
                  : batches.length}
              </b>{" "}
              من <b>{batches.length}</b> عنصر
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

    
    </div>
  );
};

export   default BatchStockReport;
