import React, { useState, useEffect, useRef, useContext } from "react";
import axios from "axios";
import { AppContext } from "../../../../context/appContext";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { useReactToPrint } from "react-to-print";
import "../orders/Orders.css";

const EmployeeTransactions = () => {
  const {
    permissionsList,
    setStartDate,
    setEndDate,
    filterByDateRange,
    filterByTime,
    employeeLoginInfo,
    formatDateTime,
    allEmployees,
    setIsLoading,
    EditPagination,
    startPagination,
    endPagination,
    setStartPagination,
    setEndPagination, handleGetTokenAndConfig, apiUrl } = useContext(AppContext)

  const employeeTransactionsPermission =
    permissionsList &&
    permissionsList.filter(
      (perission) => perission.resource === "Employee Transactions"
    )[0];

  const [listofTransactions] = useState(["سلف", "خصم", "مكافأة"]);
  const [EmployeeTransactionsId, setEmployeeTransactionsId] = useState("");
  const [employeeId, setemployeeId] = useState("");
  const [employeeName, setemployeeName] = useState("");
  const [transactionType, settransactionType] = useState("");
  const [Amount, setAmount] = useState();
  const [oldAmount, setoldAmount] = useState(0);
  const [newAmount, setnewAmount] = useState();
  const [listofEmployeeTransactions, setlistofEmployeeTransactions] = useState(
    []
  );

  const addEmployeeTransactions = async (e) => {
    e.preventDefault();
    const config = await handleGetTokenAndConfig();
    setIsLoading(true);
    try {
      if (
        employeeTransactionsPermission &&
        !employeeTransactionsPermission.create
      ) {
        toast.warn("ليس لك صلاحية لاضافه معامله ماليه للموظفين");
        return;
      }
      const data = {
        employeeId,
        employeeName,
        transactionType,
        Amount,
        oldAmount,
        newAmount,
      };
      const response = await axios.post(
        `${apiUrl}/api/employeetransactions`,
        data,
        config
      );
      if (response) {
        getEmployeeTransactions();
        toast.success("تم اضافه السجل بنجاح");
      }
    } catch (error) {
      
      toast.error("حدث خطاء اثناء اضافه معامله للموظف");
    } finally {
      setIsLoading(false);
    }
  };

  const updateEmployeeTransactions = async (e) => {
    e.preventDefault();
    const config = await handleGetTokenAndConfig();
    setIsLoading(true);
    try {
      if (
        employeeTransactionsPermission &&
        !employeeTransactionsPermission.update
      ) {
        toast.warn("ليس لك صلاحية لتعديل معامله ماليه للموظفين");
        return;
      }

      const data = {
        employeeId,
        employeeName,
        transactionType,
        Amount,
        oldAmount,
        newAmount,
      };
      const response = await axios.put(
        `${apiUrl}/api/employeetransactions/${EmployeeTransactionsId}`,
        data,
        config
      );
      getEmployeeTransactions();
      toast.success("تم تعديل السجل بنجاح");
    } catch (error) {
      
      toast.error("An error occurred while updating the transaction");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteEmployeeTransactions = async (e) => {
    e.preventDefault();
    const config = await handleGetTokenAndConfig();
    setIsLoading(true);
    try {
      if (
        employeeTransactionsPermission &&
        !employeeTransactionsPermission.delete
      ) {
        toast.warn("ليس لك صلاحية لحذف معامله ماليه للموظفين");
        return;
      }
      const response = await axios.delete(
        `${apiUrl}/api/employeetransactions/${EmployeeTransactionsId}`,
        config
      );
      if (response) {
        getEmployeeTransactions();
        toast.success("تم حذف السجل بنجاح");
      }
    } catch (error) {
      
      toast.error("An error occurred while deleting the transaction");
    } finally {
      setIsLoading(false);
    }
  };

  const getEmployeeTransactions = async () => {
    const config = await handleGetTokenAndConfig();
    setIsLoading(true);
    try {
      if (
        employeeTransactionsPermission &&
        !employeeTransactionsPermission.read
      ) {
        toast.warn("ليس لك صلاحية لعرض المعاملات الماليه للموظفين");
        return;
      }
      const response = await axios.get(
        `${apiUrl}/api/employeetransactions`,
        config
      );
      if (response) {
        setlistofEmployeeTransactions(response.data.reverse());
      }
    } catch (error) {
      
    } finally {
      setIsLoading(false);
    }
  };

  const filterCurrentEmployeeTransactions = async (transaction) => {
    const config = await handleGetTokenAndConfig();
    try {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const currentEmployeeTransactions = listofEmployeeTransactions.filter(
        (trans) => {
          const transactionDate = new Date(trans.createdAt);
          return (
            transactionDate.getMonth() === currentMonth &&
            transactionDate.getFullYear() === currentYear
          );
        }
      );

      const filteredTransactions = currentEmployeeTransactions.filter(
        (trans) => trans.transactionType === transaction
      );

      if (filteredTransactions.length > 0) {
        setoldAmount(
          filteredTransactions[filteredTransactions.length - 1].newAmount
        );
      } else {
        setoldAmount(0);
      }
    } catch (error) {
      console.error("Error filtering employee transactions:", error);
    }
  };

  const getEmployeeTransactionsByEmp = (id) => {
    if (!id) {
      getEmployeeTransactions();
      return;
    } else {
      const FilterByEmployees = listofEmployeeTransactions.filter(
        (transaction) => transaction.employeeId._id === id
      );
      setlistofEmployeeTransactions(FilterByEmployees.reverse());
    }
  };

  const filterEmployeeTransactions = (transaction) => {
    if (!transaction) {
      getEmployeeTransactions();
    } else {
      const filterlist = listofEmployeeTransactions.filter(
        (trans) => trans.transactionType === transaction
      );
      setlistofEmployeeTransactions(filterlist.reverse());
    }
  };

  const exportToExcel = () => {
    const data = listofEmployeeTransactions.map((transaction, i) => ({
      م: i + 1,
      الاسم: transaction.employeeId?.username,
      الحركة: transaction.transactionType,
      المبلغ: transaction.Amount,
      "المبلغ السابق": transaction.oldAmount,
      الاجمالي: transaction.newAmount,
      بواسطه: transaction.actionBy?.username,
      اليوم: transaction.createdAt && formatDateTime(transaction.createdAt),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "EmployeeTransactions");
    XLSX.writeFile(wb, "employee_transactions.xlsx");
  };

  const printEmployeeTransactionsContainer = useRef();
  const handlePrint = useReactToPrint({
    content: () => printEmployeeTransactionsContainer.current,
    copyStyles: true,
    removeAfterPrint: true,
    bodyClass: "printpage",
  });

  useEffect(() => {
    getEmployeeTransactions();
  }, []);

  return (
    <div className="w-100 px-3 d-flex align-itmes-center justify-content-start">
      <div
        className="table-responsive"
        ref={printEmployeeTransactionsContainer}
      >
        <div className="table-wrapper p-3 mw-100">
          <div className="table-title">
            <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
              <div className="text-right">
                <h2>
                  ادارة <b>تعاملات الموظفين</b>
                </h2>
              </div>
              {employeeTransactionsPermission.create && (
                <div className="col-12 col-md-6 p-0 m-0 d-flex flex-wrap aliegn-items-center justify-content-end print-hide">
                  <a
                    href="#addEmployeeTransactionsModal"
                    className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-success"
                    data-toggle="modal"
                  >
                    <span>اضافة حركة</span>
                  </a>
                  <a
                    href="#"
                    className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-info "
                    data-toggle="modal"
                    onClick={exportToExcel}
                  >
                    <span>تصدير</span>
                  </a>
                  <a
                    href="#"
                    className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-primary"
                    data-toggle="modal"
                    onClick={handlePrint}
                  >
                    <span>طباعه</span>
                  </a>
                </div>
              )}
            </div>
          </div>
          <div className="table-filter print-hide">
            <div className="col-12 text-dark d-flex flex-wrap align-items-center justify-content-evenly p-3 m-0 bg-light rounded">
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
                  الاسم
                </label>
                <input
                  type="text"
                  className="form-control border-primary m-0 p-2 h-auto"
                />
              </div>

              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  الموظف
                </label>
                <select
                  className="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => getEmployeeTransactionsByEmp(e.target.value)}
                >
                  <option>الكل</option>
                  {allEmployees.map((employee, i) => (
                    <option value={employee._id} key={i}>
                      {employee.fullname}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  العملية
                </label>
                <select
                  className="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => filterEmployeeTransactions(e.target.value)}
                >
                  <option>الكل</option>
                  {listofTransactions.map((transaction, i) => (
                    <option value={transaction} key={i}>
                      {transaction}
                    </option>
                  ))}
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
                      setlistofEmployeeTransactions(
                        filterByTime(e.target.value, listofEmployeeTransactions)
                      )
                    }
                  >
                    <option value="">اختر</option>
                    <option value="today">اليوم</option>
                    <option value="week">هذا الأسبوع</option>
                    <option value="month">هذا الشهر</option>
                    <option value="year">هذه السنه</option>
                  </select>
                </div>

                <div className="d-flex align-items-stretch justify-content-between flex-nowrap p-0 m-0 px-1">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
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
                      className="btn btn-primary h-100 p-2"
                      onClick={() =>
                        setlistofEmployeeTransactions(
                          filterByDateRange(listofEmployeeTransactions)
                        )
                      }
                    >
                      <i className="fa fa-search"></i>
                    </button>
                    <button
                      type="button"
                      className="btn btn-warning h-100 p-2"
                      onClick={getEmployeeTransactions}
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
                <th>الاسم</th>
                <th>الحركة</th>
                <th>المبلغ</th>
                <th>المبلغ السابق</th>
                <th>الاجمالي</th>
                <th>بواسطه</th>
                <th>اليوم</th>
              </tr>
            </thead>
            <tbody>
              {listofEmployeeTransactions.map((transaction, i) => {
                if (i >= startPagination && i < endPagination) {
                  return (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{transaction.employeeId?.username}</td>
                      <td>{transaction.transactionType}</td>
                      <td>{transaction.Amount}</td>
                      <td>{transaction.oldAmount}</td>
                      <td>{transaction.newAmount}</td>
                      <td>{transaction.actionBy?.username}</td>
                      <td>
                        {transaction.createdAt &&
                          formatDateTime(transaction.createdAt)}
                      </td>
                      <td>
                        {employeeTransactionsPermission.update && (
                           <button
data-target="#editEmployeeTransactionsModal"
                            className="btn btn-sm btn-primary ml-2 "
                            data-toggle="modal"
                          >
                            <i
                              className="material-icons"
                              data-toggle="tooltip"
                              title="Edit"
                              onClick={() => {
                                setEmployeeTransactionsId(transaction._id);
                                setemployeeName(transaction.employeeName);
                                setAmount(transaction.Amount);
                                setoldAmount(transaction.oldAmount);
                                setnewAmount(transaction.newAmount);
                                settransactionType(transaction.transactionType);
                              }}
                            >
                              &#xE254;
                                </i>
                              </button>
                        )}
                        {employeeTransactionsPermission.delete && (
                           <button
data-target="#deleteEmployeeTransactionsModal"
                            className="btn btn-sm btn-danger"
                            data-toggle="modal"
                          >
                            <i
                              className="material-icons"
                              data-toggle="tooltip"
                              title="Delete"
                              onClick={() =>
                                setEmployeeTransactionsId(transaction._id)
                              }
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
                {listofEmployeeTransactions.length > endPagination
                  ? endPagination
                  : listofEmployeeTransactions.length}
              </b>{" "}
              من <b>{listofEmployeeTransactions.length}</b> عنصر
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

      <div id="addEmployeeTransactionsModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={addEmployeeTransactions}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">اضف تعامل جديد</h4>
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
                    الاسم
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    form="carform"
                    required
                    onChange={(e) => {
                      setemployeeName(
                        allEmployees
                          ? allEmployees.find(
                              (employee) => employee._id === e.target.value
                            ).fullname
                          : ""
                      );
                      setemployeeId(e.target.value);
                      getEmployeeTransactionsByEmp(e.target.value);
                    }}
                  >
                    <option>اختار</option>
                    {allEmployees.length > 0
                      ? allEmployees.map((employee, i) => {
                          return (
                            <option value={employee._id} key={i}>
                              {employee.fullname}
                            </option>
                          );
                        })
                      : ""}
                  </select>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    التعامل
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    form="carform"
                    required
                    onChange={(e) => {
                      filterCurrentEmployeeTransactions(e.target.value);
                      settransactionType(e.target.value);
                    }}
                  >
                    <option>اختر</option>
                    {listofTransactions.length > 0
                      ? listofTransactions.map((transaction, i) => {
                          return (
                            <option value={transaction} key={i}>
                              {transaction}
                            </option>
                          );
                        })
                      : ""}
                  </select>
                </div>

                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    المبلغ
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="form-control border-primary m-0 p-2 h-auto"
                    required
                    pattern="[0-9]+"
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setnewAmount(Number(oldAmount) + Number(e.target.value));
                    }}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الرصيد
                  </label>
                  <input
                    type="number"
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={oldAmount > 0 ? oldAmount : 0}
                    readOnly
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الاجمالي
                  </label>
                  <input
                    type="number"
                    className="form-control border-primary m-0 p-2 h-auto"
                    readOnly
                    defaultValue={newAmount}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    بواسطه
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    readOnly
                    defaultValue={
                      employeeLoginInfo ? employeeLoginInfo.username : ""
                    }
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    التاريخ
                  </label>
                  <p
                    className="form-control border-primary m-0 p-2 h-auto"
                    readOnly
                  >
                    {formatDateTime(new Date())}
                  </p>
                </div>
              </div>
              <div className="modal-footer w-100 d-flex flex-nowrap">
                <input
                  type="submit"
                  className="btn btn-success col-6 h-100 px-2 py-3 m-0"
                  value="اضافه"
                />
                <input
                  type="button"
                  className="btn btn-danger col-6 h-100 px-2 py-3 m-0"
                  data-dismiss="modal"
                  value="اغلاق"
                />
              </div>
            </form>
          </div>
        </div>
      </div>

      <div id="editEmployeeTransactionsModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={updateEmployeeTransactions}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">تعديل تعامل</h4>
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
                    الاسم
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    form="carform"
                    defaultValue={employeeName}
                    required
                    onChange={(e) => {
                      setemployeeName(
                        allEmployees.find(
                          (employee) => employee._id === e.target.value
                        ).fullname
                      );
                      setemployeeId(e.target.value);
                      filterEmployeeTransactions(e.target.value);
                    }}
                  >
                    <option>اختر</option>
                    {allEmployees.length > 0
                      ? allEmployees.map((employee) => {
                          return (
                            <option value={employee._id}>
                              {employee.fullname}
                            </option>
                          );
                        })
                      : ""}
                  </select>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الحركه
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    form="carform"
                    defaultValue={transactionType}
                    required
                    onChange={(e) => {
                      filterCurrentEmployeeTransactions(e.target.value);
                      settransactionType(e.target.value);
                    }}
                  >
                    <option>اختر</option>
                    {listofTransactions.length > 0
                      ? listofTransactions.map((transaction, i) => {
                          return (
                            <option value={transaction} key={i}>
                              {transaction}
                            </option>
                          );
                        })
                      : ""}
                  </select>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    المبلغ
                  </label>
                  <input
                    type="Number"
                    className="form-control border-primary m-0 p-2 h-auto"
                    defaultValue={Amount}
                    required
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setnewAmount(Number(oldAmount) + Number(e.target.value));
                    }}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    المبلغ السابق
                  </label>
                  <input
                    type="Number"
                    className="form-control border-primary m-0 p-2 h-auto"
                    Value={oldAmount > 0 ? oldAmount : 0}
                    readOnly
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الاجمالي
                  </label>
                  <input
                    type="Number"
                    className="form-control border-primary m-0 p-2 h-auto"
                    readOnly
                    defaultValue={newAmount}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    بواسطة
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    readOnly
                    defaultValue={
                      employeeLoginInfo ? employeeLoginInfo.username : ""
                    }
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    التاريخ
                  </label>
                  <p
                    className="form-control border-primary m-0 p-2 h-auto"
                    readOnly
                  >
                    {formatDateTime(new Date())}
                  </p>
                </div>
              </div>
              <div className="modal-footer w-100 d-flex flex-nowrap">
                <input
                  type="submit"
                  className="btn btn-success col-6 h-100 px-2 py-3 m-0"
                  value="حفظ"
                />
                <input
                  type="button"
                  className="btn btn-danger col-6 h-100 px-2 py-3 m-0"
                  data-dismiss="modal"
                  value="اغلاق"
                />
              </div>
            </form>
          </div>
        </div>
      </div>

      <div id="deleteEmployeeTransactionsModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={deleteEmployeeTransactions}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">حذف موظف</h4>
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
              <div className="modal-footer w-100 d-flex flex-nowrap">
                <input
                  type="submit"
                  className="btn btn-warning col-6 h-100 px-2 py-3 m-0"
                  value="حذف"
                />
                <input
                  type="button"
                  className="btn btn-danger col-6 h-100 px-2 py-3 m-0"
                  data-dismiss="modal"
                  value="اغلاق"
                />
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeTransactions;
