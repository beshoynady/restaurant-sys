import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { dataContext } from "../../../../context/appContext";
import { toast } from "react-toastify";
import "../orders/Orders.css";

const Store = () => {
  const {
    employeeLoginInfo,
    formatDate,
    formatDateTime,
    permissionsList,
    setIsLoading,
    EditPagination,
    startPagination,
    endPagination,
    setStartPagination,
    setEndPagination,
    apiUrl,
    handleGetTokenAndConfig,
  } = useContext(dataContext);

  const storePermissions = permissionsList?.find(
    (permission) => permission.resource === "store"
  );

  // State variables
  const [storeName, setStoreName] = useState("");
  const [storeCode, setStoreCode] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [storekeeper, setStorekeeper] = useState([]); // Storekeeper as an array of IDs
  const [status, setStatus] = useState("active"); // Default status is active
  const [storeId, setStoreId] = useState("");
  const [allStores, setAllStores] = useState([]);
  const [listOfEmployees, setListOfEmployees] = useState([]);
  const [allStockItems, setAllStockItems] = useState([]);

  // Helper function: Validate required fields
  const validateFields = () => {
    if (
      !storeName.trim() ||
      !storeCode.trim() ||
      !description.trim() ||
      !address.trim() ||
      storekeeper.length === 0
    ) {
      toast.error("جميع الحقول مطلوبة");
      return false;
    }
    return true;
  };

  // Helper function: Check permissions
  const hasPermission = (action) => {
    if (storePermissions && !storePermissions[action]) {
      toast.warn(
        `ليس لديك صلاحية ${
          action === "create"
            ? "لإضافة"
            : action === "update"
            ? "لتعديل"
            : action === "read"
            ? "لعرض"
            : "لحذف"
        } مخزن`
      );
      return false;
    }
    return true;
  };

  // Fetch all stores
  const getAllStores = async () => {
    const config = await handleGetTokenAndConfig();

    try {
      if (!hasPermission("read")) return;
      const response = await axios.get(`${apiUrl}/api/store/`, config);
      setAllStores(response.data.reverse());
    } catch (error) {
      console.error("Error fetching stores:", error);
      toast.error("حدث خطأ أثناء جلب بيانات المخزنات! اعد تحميل الصفحة");
    }
  };

  // Fetch all employees
  const getEmployees = async () => {
    const config = await handleGetTokenAndConfig();

    try {
      const response = await axios.get(`${apiUrl}/api/employee`, config);
      const data = response.data;
      if (data) {
        setListOfEmployees(data);
      } else {
        toast.info("لا توجد بيانات لعرضها");
      }
    } catch (error) {
      
      toast.error("حدث خطأ أثناء جلب بيانات الموظفين");
    }
  };

  // Fetch all stock items
  const getAllStockItems = async () => {
    const config = await handleGetTokenAndConfig();

    try {
      const response = await axios.get(`${apiUrl}/api/stockitem/`, config);
      setAllStockItems(response.data.reverse());
    } catch (error) {
      
      toast.error("حدث خطأ أثناء جلب بيانات الأصناف");
    }
  };

  const addStorekeeper = () => {
    setStorekeeper([...storekeeper, ""]);
  };

  const removeStorekeeper = (index) => {
    const newStorekeepers = storekeeper.filter((_, i) => i !== index);
    setStorekeeper(newStorekeepers);
  };

  const handleStorekeeperChange = (e, index) => {
    const newStorekeepers = [...storekeeper];
    newStorekeepers[index] = e.target.value;
    setStorekeeper(newStorekeepers);
  };

  // Create store
  const createStore = async (e) => {
    e.preventDefault();
    const config = await handleGetTokenAndConfig();

    if (!hasPermission("create") || !validateFields()) return;

    try {
      const response = await axios.post(
        `${apiUrl}/api/store/`,
        { storeName, storeCode, description, address, storekeeper, status },
        config
      );

      if (response.status === 201) {
        toast.success("تم إنشاء المتجر بنجاح");
        getAllStores();
      } else {
        toast.error("حدث خطأ أثناء إنشاء المتجر. يرجى المحاولة مرة أخرى.");
      }
    } catch (error) {
      console.error("Error creating store:", error);
      toast.error("حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.");
    }
  };

  // Edit store
  const editStore = async (e) => {
    e.preventDefault();
    const config = await handleGetTokenAndConfig();

    if (!hasPermission("update")) return;

    try {
      const response = await axios.put(
        `${apiUrl}/api/store/${storeId}`,
        { storeName, storeCode, description, address, storekeeper, status },
        config
      );

      if (response.status === 200) {
        toast.success("تم تعديل المتجر بنجاح");
        getAllStores();
        getAllStockItems();
      } else {
        toast.error("حدث خطأ أثناء تعديل المتجر. يرجى المحاولة مرة أخرى.");
      }
    } catch (error) {
      
      toast.error("حدث خطأ أثناء تعديل المتجر. يرجى المحاولة مرة أخرى.");
    }
  };

  // Delete store
  const deleteStore = async (e) => {
    e.preventDefault();

    const config = await handleGetTokenAndConfig();

    if (!hasPermission("delete")) return;

    try {
      const response = await axios.delete(
        `${apiUrl}/api/store/${storeId}`,
        config
      );

      if (response.status === 200) {
        toast.success("تم حذف المتجر بنجاح");
        getAllStores();
        getAllStockItems();
      } else {
        toast.error("حدث خطأ أثناء حذف المتجر. يرجى المحاولة مرة أخرى.");
      }
    } catch (error) {
      
      toast.error("حدث خطأ أثناء حذف المتجر. يرجى المحاولة مرة أخرى.");
    }
  };

  // Search stores by name
  const searchByStore = (name) => {
    if (!name) {
      getAllStores();
      return;
    }
    const filteredStores = allStores.filter((store) =>
      store.storeName.startsWith(name)
    );
    setAllStores(filteredStores);
  };

  useEffect(() => {
    getAllStockItems();
    getAllStores();
    getEmployees();
  }, []);

  return (
    <div className="w-100 px-3 d-flex align-items-center justify-content-start">
      <div className="table-responsive">
        <div className="table-wrapper p-3 mw-100">
          <div className="table-title">
            <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
              <div className="text-right">
                <h2>
                  إدارة <b>المخازن</b>
                </h2>
              </div>
              {storePermissions && storePermissions?.create && (
                <div className="col-12 col-md-6 p-0 m-0 d-flex flex-wrap align-items-center justify-content-end print-hide">
                  <a
                    href="#addStoreModal"
                    className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-success"
                    data-toggle="modal"
                  >
                    <span>إضافة مخزن</span>
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
                  className="form-control border-primary m-0 p-2 h-auto border-primary m-0 p-2 h-auto"
                  onChange={(e) => {
                    setStartPagination(0);
                    setEndPagination(e.target.value);
                  }}
                >
                  {Array.from({ length: 20 }, (_, i) => (i + 1) * 5).map(
                    (value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  اسم المخزن
                </label>
                <input
                  type="text"
                  className="form-control border-primary m-0 p-2 h-auto border-primary m-0 p-2 h-auto"
                  onChange={(e) => searchByStore(e.target.value)}
                />
              </div>
            </div>
          </div>

          <table className="table table-striped table-hover">
            <thead>
              <tr>
                <th>م</th>
                <th>الاسم</th>
                <th>امين المخزن</th>
                <th>عدد المنتجات</th>
                <th>المكان</th>
                <th>الوصف</th>
                <th>الاختصار</th>
                <th>الحالة</th>
                <th>اضيف بواسطه</th>
                <th>أضيف في</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {allStores.map((store, i) => {
                if (i >= startPagination && i < endPagination) {
                  return (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{store.storeName}</td>
                      <td>
                        {store.storekeeper && store.storekeeper.length > 0
                          ? store.storekeeper
                              .map((keeper) => keeper.fullname)
                              .join(", ")
                          : "لا يوجد أمين مخزن"}
                      </td>
                      <td>
                        {allStockItems &&
                          allStockItems.filter((item) =>
                            item.stores?.some(
                              (s) => s.storeId?._id === store._id
                            )
                          ).length}
                      </td>
                      <td>{store.address}</td>
                      <td>{store.description}</td>
                      <td>{store.storeCode}</td>
                      <td>{store.status || "غير محدد"}</td>
                      <td>{store.createdBy?.fullname}</td>
                      <td>{formatDateTime(store.createdAt)}</td>
                      <td>
                        {storePermissions && storePermissions?.update && (
                          <button
                            data-target="#editStoreModal"
                            className="btn btn-sm btn-primary ml-2 "
                            data-toggle="modal"
                            onClick={() => {
                              setStoreId(store._id);
                              setStoreName(store.storeName);
                              setStoreCode(store.storeCode);
                              setDescription(store.description);
                              setAddress(store.address);
                              {
                                store.storekeeper?.map((keeper) =>
                                  setStorekeeper([...storekeeper, keeper._id])
                                );
                              }
                              setStatus(store.status);
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
                        {storePermissions && storePermissions?.delete && (
                          <button
                            data-target="#deleteStoreModal"
                            className="btn btn-sm btn-danger"
                            data-toggle="modal"
                            onClick={() => setStoreId(store._id)}
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
                return null;
              })}
            </tbody>
          </table>

          <div className="clearfix">
            <div className="hint-text text-dark">
              عرض{" "}
              <b>
                {allStores.length > endPagination
                  ? endPagination
                  : allStores.length}
              </b>{" "}
              من <b>{allStores.length}</b> عنصر
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

      {/* Add Store Modal */}
      <div id="addStoreModal" className="modal fade" role="dialog">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded">
            <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
              <h4 className="modal-title">إضافة مخزن</h4>
              <button
                type="button"
                className="close m-0 p-1"
                data-dismiss="modal"
              >
                &times;
              </button>
            </div>
            <form onSubmit={createStore}>
              <div className="modal-body d-flex flex-wrap align-items-center p-3 text-right">
                {/* اسم المخزن */}
                <div className="form-group col-12 col-md-6">
                  <label
                    className="form-label text-wrap text-right fw-bolder p-0 m-0"
                    htmlFor="storeName"
                  >
                    اسم المخزن:
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    id="storeName"
                    required
                    onChange={(e) => setStoreName(e.target.value)}
                  />
                </div>

                {/* رمز المخزن */}
                <div className="form-group col-12 col-md-6">
                  <label
                    className="form-label text-wrap text-right fw-bolder p-0 m-0"
                    htmlFor="storeCode"
                  >
                    رمز المخزن:
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    id="storeCode"
                    required
                    onChange={(e) => setStoreCode(e.target.value)}
                  />
                </div>

                {/* الوصف */}
                <div className="form-group col-12 col-md-6">
                  <label
                    className="form-label text-wrap text-right fw-bolder p-0 m-0"
                    htmlFor="description"
                  >
                    الوصف:
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    id="description"
                    required
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {/* العنوان */}
                <div className="form-group col-12 col-md-6">
                  <label
                    className="form-label text-wrap text-right fw-bolder p-0 m-0"
                    htmlFor="address"
                  >
                    العنوان:
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    id="address"
                    required
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                {/* مسؤول المخزن */}
                <div className="form-group col-12 col-md-6">
                  <label
                    className="form-label text-wrap text-right fw-bolder p-0 m-0"
                    htmlFor="storekeeper"
                  >
                    مسؤول المخزن:
                  </label>
                  <div id="storekeeper-list">
                    {storekeeper.length > 0 ? (
                      storekeeper.map((keeper, index) => (
                        <div
                          key={index}
                          className="d-flex justify-content-between align-items-center"
                        >
                          <select
                            className="form-control border-primary m-0 p-2 h-auto"
                            value={keeper}
                            onChange={(e) => handleStorekeeperChange(e, index)}
                          >
                            <option value="">اختر</option>
                            {listOfEmployees.map((employee, i) => (
                              <option value={employee._id} key={i}>
                                {employee.fullname}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => removeStorekeeper(index)}
                          >
                            حذف
                          </button>
                        </div>
                      ))
                    ) : (
                      <p>لا يوجد مسؤولين للمخزن</p>
                    )}
                    <button
                      type="button"
                      className="btn btn-info mt-2"
                      onClick={addStorekeeper}
                    >
                      إضافة مسؤول آخر
                    </button>
                  </div>
                </div>

                {/* الحالة */}
                <div className="form-group col-12 col-md-6">
                  <label
                    className="form-label text-wrap text-right fw-bolder p-0 m-0"
                    htmlFor="status"
                  >
                    الحالة:
                  </label>
                  <select
                    id="status"
                    className="form-control border-primary m-0 p-2 h-auto"
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="">اختر...</option>
                    <option value="active">نشط</option>
                    <option value="inactive">غير نشط</option>
                    <option value="closed">مغلق</option>
                  </select>
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

      {/* Edit Store Modal */}
      <div id="editStoreModal" className="modal fade" role="dialog">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded">
            <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
              <h4 className="modal-title">تعديل المخزن</h4>
              <button
                type="button"
                className="close m-0 p-1"
                data-dismiss="modal"
              >
                &times;
              </button>
            </div>
            <form onSubmit={editStore}>
              <div className="modal-body d-flex flex-wrap align-items-center p-3 text-right">
                <div className="form-group col-12 col-md-6">
                  <label
                    className="form-label fw-bolder"
                    htmlFor="editStoreName"
                  >
                    اسم المخزن:
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary"
                    id="editStoreName"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label
                    className="form-label fw-bolder"
                    htmlFor="editStoreCode"
                  >
                    رمز المخزن:
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary"
                    id="editStoreCode"
                    required
                    value={storeCode}
                    onChange={(e) => setStoreCode(e.target.value)}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label
                    className="form-label fw-bolder"
                    htmlFor="editDescription"
                  >
                    الوصف:
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary"
                    id="editDescription"
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label fw-bolder" htmlFor="editAddress">
                    العنوان:
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary"
                    id="editAddress"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label
                    className="form-label fw-bolder"
                    htmlFor="editStorekeeper"
                  >
                    مسؤول المخزن:
                  </label>
                  <div id="storekeeper-list">
                    {storekeeper.length > 0 ? (
                      storekeeper.map((keeper, index) => (
                        <div
                          key={index}
                          className="d-flex justify-content-between align-items-center"
                        >
                          <select
                            className="form-control border-primary"
                            value={keeper}
                            onChange={(e) => handleStorekeeperChange(e, index)}
                          >
                            <option value="">اختر</option>
                            {keeper ? (
                              <option value={keeper} key={index}>
                                {
                                  listOfEmployees.find(
                                    (employee) => employee._id === keeper
                                  )?.fullname
                                }
                              </option>
                            ) : (
                              listOfEmployees
                                .filter(
                                  (employee) =>
                                    !storekeeper.includes(employee._id)
                                )
                                .map((employee, i) => (
                                  <option value={employee._id} key={i}>
                                    {employee.fullname}
                                  </option>
                                ))
                            )}
                          </select>
                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => removeStorekeeper(index)}
                          >
                            حذف
                          </button>
                        </div>
                      ))
                    ) : (
                      <p>لا يوجد مسؤولين للمخزن</p>
                    )}
                    <button
                      type="button"
                      className="btn btn-info mt-2"
                      onClick={addStorekeeper}
                    >
                      إضافة مسؤول آخر
                    </button>
                  </div>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label fw-bolder" htmlFor="editStatus">
                    الحالة:
                  </label>
                  <select
                    id="editStatus"
                    className="form-control border-primary"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="">اختر...</option>
                    <option value="active">نشط</option>
                    <option value="inactive">غير نشط</option>
                    <option value="closed">مغلق</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer d-flex flex-nowrap align-items-center justify-content-between m-0 p-1">
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
                  إغلاق
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Delete Store Modal */}
      <div id="deleteStoreModal" className="modal fade" role="dialog">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form className="text-right" onSubmit={(e) => deleteStore(e)}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">حذف المخزن</h4>
                <button
                  type="button"
                  className="close m-0 p-1"
                  data-dismiss="modal"
                  aria-hidden="true"
                >
                  &times;
                </button>
              </div>
              <div className="modal-body d-flex flex-wrap align-items-center p-3 text-dark text-right">
                <p>
                  هل أنت متأكد من حذف مخزن <strong>{storeName}</strong>؟
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

export default Store;
