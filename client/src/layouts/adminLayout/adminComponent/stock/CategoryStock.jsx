import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AppContext } from "../../../../context/appContext";
import { toast } from "react-toastify";
import "./orders/Orders.css";

const StockCategory = () => {
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

  const stockCategoriesPermission =
    permissionsList &&
    permissionsList.filter(
      (permission) => permission.resource === "stock Categories"
    )[0];

  const [categoryName, setCategoryName] = useState("");
  const [categoryCode, setCategoryCode] = useState("");
  const [notes, setNotes] = useState("");
  const [categoryStockId, setCategoryStockId] = useState("");
  const [allCategoryStock, setAllCategoryStock] = useState([]);
  const [allStockItems, setAllStockItems] = useState([]);

  const getAllCategoryStock = async () => {
    const config = await handleGetTokenAndConfig();

    try {
      if (stockCategoriesPermission && !stockCategoriesPermission.read) {
        toast.warn("ليس لك صلاحية لعرض تصنيفات المخزن");
        return;
      }
      const response = await axios.get(apiUrl + "/api/stockCategory/", config);
      setAllCategoryStock(response.data.reverse());
    } catch (error) {
      console.error("Error fetching category stock:", error);
      toast.error("حدث خطأ اثناء جلب بيانات التصنيفات ! اعد تحميل الصفحة");
    }
  };

  const getAllStockItem = async () => {
    try {
      const config = await handleGetTokenAndConfig();
      const response = await axios.get(apiUrl + "/api/stockitem/", config);
      if (response) {
        const stockItems = response.data.reverse();
        setAllStockItems(stockItems);
      } else {
        toast.warn("حدث خطا اثناء جلب بيانات اصناف المخزن ! اعد تحميل الصفحة");
      }
    } catch (error) {}
  };

  const createCategoryStock = async (e) => {
    e.preventDefault();
    const config = await handleGetTokenAndConfig();

    try {
      if (stockCategoriesPermission && !stockCategoriesPermission.create) {
        toast.warn("ليس لك صلاحية لاضافه تصنيفات المخزن");
        return;
      }

      // Validate fields
      if (!categoryName.trim() || !categoryCode.trim()) {
        toast.error("اسم التصنيف ورمز التصنيف مطلوبان");
        return;
      }

      const response = await axios.post(
        apiUrl + "/api/stockCategory/",
        { categoryName, categoryCode, notes },
        config
      );

      if (response.status === 201) {
        toast.success("تم إنشاء التصنيف بنجاح");
      } else {
        console.error({ error: response.data.message });
        toast.error("حدث خطأ أثناء إنشاء التصنيف. يرجى المحاولة مرة أخرى.");
      }
      getAllCategoryStock();
    } catch (error) {
      console.error("Error creating category stock:", error);
      if (
        error.response &&
        error.response.data.error === "Category name already exists"
      ) {
        toast.error("هذا التصنيف موجود بالفعل");
      } else {
        toast.error("حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.");
      }
    }
  };

  const editCategoryStock = async (e) => {
    e.preventDefault();
    const config = await handleGetTokenAndConfig();

    try {
      if (stockCategoriesPermission && !stockCategoriesPermission.update) {
        toast.warn("ليس لك صلاحية لتعديل تصنيفات المخزن");
        return;
      }
      const edit = await axios.put(
        apiUrl + "/api/stockCategory/" + categoryStockId,
        { categoryName, categoryCode, notes },
        config
      );

      if (edit.status === 200) {
        toast.success("تم تعديل التصنيف بنجاح");
      } else if (edit.data.error === "Category name already exists") {
        toast.error("هذا التصنيف موجود بالفعل");
      }
      getAllCategoryStock(); // Fetch updated category stock data
      getAllStockItem(); // Fetch updated stock item data
    } catch (error) {
      toast.error("حدث خطأ أثناء تعديل التصنيف. يرجى المحاولة مرة أخرى.");
    }
  };

  const deleteCategoryStock = async (e) => {
    e.preventDefault();

    const config = await handleGetTokenAndConfig();

    try {
      if (stockCategoriesPermission && !stockCategoriesPermission.delete) {
        toast.warn("ليس لك صلاحية لحذف تصنيفات المخزن");
        return;
      }
      const deleted = await axios.delete(
        apiUrl + "/api/stockCategory/" + categoryStockId,
        config
      );

      if (deleted) {
        getAllCategoryStock(); // Fetch updated category stock data
        getAllStockItem(); // Fetch updated stock item data
        toast.success("تم حذف التصنيف بنجاح");
      }
    } catch (error) {
      toast.error("حدث خطأ أثناء حذف التصنيف. يرجى المحاولة مرة أخرى.");
    }
  };

  const searchByCategoryStock = (stockCategory) => {
    if (!stockCategory) {
      getAllCategoryStock();
      return;
    }
    const categories = allCategoryStock.filter(
      (category) => category.name.startsWith(stockCategory) === true
    );
    setAllStockItems(categories);
  };

  useEffect(() => {
    getAllStockItem();
    getAllCategoryStock();
  }, []);

  return (
    <div className="w-100 px-3 d-flex align-items-center justify-content-start">
      <div className="table-responsive">
        <div className="table-wrapper p-3 mw-100">
          <div className="table-title">
            <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
              <div className="text-right">
                <h2>
                  إدارة <b>اقسام المخزن</b>
                </h2>
              </div>
              {stockCategoriesPermission &&
                stockCategoriesPermission.create && (
                  <div className="col-12 col-md-6 p-0 m-0 d-flex flex-wrap align-items-center justify-content-end print-hide">
                    <a
                      href="#addCategoryStockModal"
                      className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-success"
                      data-toggle="modal"
                    >
                      <span>اضافه تصنيف</span>
                    </a>
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
                  اسم التصنيف
                </label>
                <input
                  type="text"
                  className="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => searchByCategoryStock(e.target.value)}
                />
              </div>
            </div>
          </div>

          <table className="table table-striped table-hover">
            <thead>
              <tr>
                <th>م</th>
                <th>الاسم</th>
                <th>الاختصار</th>
                <th>عدد المنتجات</th>
                <th>اضيف بواسطه</th>
                <th>اضيف في</th>
                <th>ملاحظات</th>
                <th>اجراءات</th>
              </tr>
            </thead>
            <tbody>
              {allCategoryStock &&
                allCategoryStock.map((stockCategory, i) => {
                  if (i >= startPagination && i < endPagination) {
                    return (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{stockCategory.categoryName}</td>
                        <td>{stockCategory.categoryCode}</td>
                        <td>
                          {
                            allStockItems.filter(
                              (item) =>
                                item.categoryId?._id === stockCategory._id
                            )?.length
                          }
                        </td>
                        <td>{stockCategory.createdBy?.fullname}</td>
                        <td>{formatDate(stockCategory.createdAt)}</td>
                        <td>{stockCategory.notes}</td>
                        <td>
                          {stockCategoriesPermission &&
                            (stockCategoriesPermission.update ||
                              stockCategoriesPermission.delete) && (
                              <div className="d-flex flex-wrap align-items-center justify-content-around">
                                {stockCategoriesPermission.update && (
                                  <button
                                    data-target="#editCategoryStockModal"
                                    onClick={() => {
                                      setCategoryName(stockCategory.name);
                                      setCategoryCode(stockCategory.code);
                                      setNotes(stockCategory.notes || "");
                                      setCategoryStockId(stockCategory._id);
                                    }}
                                    className="btn btn-sm btn-primary ml-2 "
                                    data-toggle="modal"
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
                                {stockCategoriesPermission.delete && (
                                  <button
                                    data-target="#deleteCategoryStockModal"
                                    onClick={() =>
                                      setCategoryStockId(stockCategory._id)
                                    }
                                    className="btn btn-sm btn-danger"
                                    data-toggle="modal"
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
                              </div>
                            )}
                        </td>
                      </tr>
                    );
                  } else {
                    return null;
                  }
                })}
            </tbody>
          </table>

          <div className="clearfix">
            <div className="hint-text text-dark">
              عرض{" "}
              <b>
                {allCategoryStock.length > endPagination
                  ? endPagination
                  : allCategoryStock.length}
              </b>{" "}
              من <b>{allCategoryStock.length}</b> عنصر
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

      <div id="addCategoryStockModal" className="modal fade" role="dialog">
        <div className="modal-dialog">
          <div className="modal-content shadow-lg border-0 rounded">
            <form onSubmit={createCategoryStock}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">اضافه تصنيف</h4>
                <button
                  type="button"
                  className="close m-0 p-1"
                  data-dismiss="modal"
                >
                  &times;
                </button>
              </div>
              <div className="modal-body d-flex flex-wrap align-items-center p-3 text-right">
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    اسم التصنيف
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    رمز التصنيف
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={categoryCode}
                    onChange={(e) => setCategoryCode(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    ملاحظات
                  </label>
                  <textarea
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer flex-nowrap d-flex flex-row align-items-center justify-content-between">
                <button
                  type="submit"
                  className="btn btn-success col-6 h-100 px-2 py-3 m-0"
                >
                  حفظ
                </button>
                <button
                  type="button"
                  className="btn btn-danger col-6 h-100 px-2 py-3 m-0"
                  data-dismiss="modal"
                >
                  إغلاق
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div id="editCategoryStockModal" className="modal fade" role="dialog">
        <div className="modal-dialog">
          <div className="modal-content shadow-lg border-0 rounded">
            <form onSubmit={editCategoryStock}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">تعديل التصنيف</h4>
                <button
                  type="button"
                  className="close m-0 p-1"
                  data-dismiss="modal"
                >
                  &times;
                </button>
              </div>
              <div className="modal-body d-flex flex-wrap align-items-center p-3 text-right">
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    اسم التصنيف
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    رمز التصنيف
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={categoryCode}
                    onChange={(e) => setCategoryCode(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    ملاحظات
                  </label>
                  <textarea
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer flex-nowrap d-flex flex-row align-items-center justify-content-between">
                <button
                  type="submit"
                  className="btn btn-success col-6 h-100 px-2 py-3 m-0"
                >
                  تعديل
                </button>
                <button
                  type="button"
                  className="btn btn-danger col-6 h-100 px-2 py-3 m-0"
                  data-dismiss="modal"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div id="deleteCategoryStockModal" className="modal fade" role="dialog">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form
              className="text-right"
              onSubmit={(e) => deleteCategoryStock(e)}
            >
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">حذف التصنيف</h4>
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
                <p>
                  هل أنت متأكد من حذف التصنيف <strong>{categoryName}</strong>؟
                </p>
              </div>
              <div className="modal-footer flex-nowrap d-flex flex-row align-items-center justify-content-between">
                <input
                  type="submit"
                  className="btn btn-warning col-6 h-100 px-2 py-3 m-0"
                  value="حذف"
                />
                <input
                  type="button"
                  className="col-md-6 col-12 h-100 p-0 m-0 btn btn-default"
                  data-dismiss="modal"
                  value="إلغاء"
                />
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export   default StockCategory;
