import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { dataContext } from "../../../../context/appContext";
import { toast } from "react-toastify";
import "../orders/Orders.css";
import { date } from "joi";

const DailyExpense = () => {
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

  const permissionDailyExpense =
    permissionsList &&
    permissionsList.filter(
      (permission) => permission.resource === "Daily Expenses"
    )[0];

  const expenseTypeEn = [
    "Operating Expenses",
    "Fixed Expenses",
    "Marketing and Advertising",
    "Administrative and Office Expenses",
    "Investment and Development",
  ];

  const expenseTypeAr = [
    "مصروفات التشغيل",
    "مصروفات ثابتة",
    "التسويق والإعلان",
    "مصروفات إدارية ومكتبية",
    "الاستثمار والتطوير",
  ];

  const [expenseId, setexpenseId] = useState("");
  const [date, setdate] = useState("");
  const [cashMovementId, setcashMovementId] = useState("");
  const [dailyexpenseId, setdailyexpenseId] = useState("");
  const [expenseDescription, setexpenseDescription] = useState("");
  const [amount, setamount] = useState();
  const [cashRegister, setcashRegister] = useState("");
  const [listCashRegister, setlistCashRegister] = useState([]);
  const [CashRegisterBalance, setCashRegisterBalance] = useState();
  const [cashRegisterName, setcashRegisterName] = useState("");
  const [paidBy, setpaidBy] = useState("");
  const [notes, setnotes] = useState("");

  const [allExpenses, setAllExpenses] = useState([]);
  const [allDailyExpenses, setAllDailyExpenses] = useState([]);
  const [AllcashRegisters, setAllcashRegisters] = useState([]);

  const getAllcashRegisters = async () => {
    const config = await handleGetTokenAndConfig();
    try {
      const response = await axios.get(apiUrl + "/api/cashRegister", config);
      setAllcashRegisters(response.data.reverse());
    } catch (err) {
      toast.error("Error fetching cash registers");
    }
  };

  const handlecashRegister = (id) => {
    const cashRegister = AllcashRegisters
      ? AllcashRegisters.filter((cash) => cash.employee._id === id)
      : {};
    setlistCashRegister(cashRegister);
    setpaidBy(id);
  };

  const selectCashRegister = (id) => {
    const cashRegisterSelected = listCashRegister.find(
      (register) => register._id === id
    );
    setcashRegister(id);
    setCashRegisterBalance(cashRegisterSelected.balance);
  };

  const getallExpenses = async () => {
    const config = await handleGetTokenAndConfig();
    try {
      const response = await axios.get(apiUrl + "/api/expenses/", config);
      setAllExpenses(response.data.reverse());
    } catch (error) {}
  };

  const createDailyExpense = async (e) => {
    e.preventDefault();

    // Calculate the updated balance
    const updatedBalance = CashRegisterBalance - amount;

    try {
      const config = await handleGetTokenAndConfig();

      // Check if the user has permission to create daily expenses
      if (permissionDailyExpense && !permissionDailyExpense.create) {
        toast.warn("ليس لك الصلاحية لتسجيل المصروفات");
        return;
      }

      // Create a new cash movement
      const cashMovementResponse = await axios.post(
        `${apiUrl}/api/cashMovement/`,
        {
          registerId: cashRegister,
          createdBy: paidBy,
          amount,
          type: "Expense",
          description: expenseDescription,
        },
        config
      );

      const cashMovementId = cashMovementResponse.data.cashMovement._id;

      // Create a new daily expense
      const dailyExpenseResponse = await axios.post(
        `${apiUrl}/api/dailyexpense/`,
        {
          expenseId,
          date,
          expenseDescription,
          cashRegister,
          cashMovementId,
          paidBy,
          amount,
          notes,
        },
        config
      );

      // Update the cash register balance
      const updateCashRegisterResponse = await axios.put(
        `${apiUrl}/api/cashRegister/${cashRegister}`,
        {
          balance: updatedBalance,
        },
        config
      );

      // Check if the cash register update was successful
      if (updateCashRegisterResponse) {
        setCashRegisterBalance(updatedBalance);
        toast.success("تم تسجيل المصروف بنجاح");

        // Refresh relevant data
        getallExpenses();
        getAllcashRegisters();
        getallDailyExpenses();
      }
    } catch (error) {
      console.error("Error creating daily expense:", error);
      toast.error("فشل في تسجيل المصروف! حاول مرة أخرى.");
    }
  };

  const editDailyExpense = async (e) => {
    e.preventDefault();
    const config = await handleGetTokenAndConfig();
    try {
      if (permissionDailyExpense && !permissionDailyExpense.update) {
        toast.warn("ليس لك الصلاحية لتعديل المصروفات");
        return;
      }
      const prevExpense = await axios.get(
        `${apiUrl}/api/dailyexpense/${dailyexpenseId}`,
        config
      );
      const prevExpenseData = prevExpense.data;

      // Calculate the difference between the new amount and the previous amount
      const prevExpenseAmount = prevExpenseData.amount;

      const updatedbalance = CashRegisterBalance + prevExpenseAmount - amount;
      if (cashMovementId) {
        // Ensure cashMovementId has a value before sending the request
        const response = await axios.put(
          `${apiUrl}/api/dailyexpense/${dailyexpenseId}`,
          {
            expenseId,
            expenseDescription,
            cashRegister,
            paidBy,
            amount,
            notes,
          },
          config
        );

        const data = response.data;

        const cashMovement = await axios.put(
          `${apiUrl}/api/cashMovement/${cashMovementId}`,
          {
            registerId: cashRegister,
            createdBy: paidBy,
            amount,
            type: "Expense",
            description: expenseDescription,
          },
          config
        );

        if (data) {
          const updatecashRegister = await axios.put(
            `${apiUrl}/api/cashRegister/${cashRegister}`,
            {
              balance: updatedbalance,
            },
            config
          );
          if (updatecashRegister) {
            // Toast notification for successful edit
            toast.success("تم تحديث تفاصيل المصروف بنجاح");

            getallExpenses();
            getAllcashRegisters();
            getallDailyExpenses();
          }
        }
      } else {
      }
    } catch (error) {
      // Toast notification for error
      toast.error("Failed to update expense");
    }
  };

  const deleteDailyExpense = async (e) => {
    e.preventDefault();
    const config = await handleGetTokenAndConfig();
    try {
      if (permissionDailyExpense && !permissionDailyExpense.delete) {
        toast.warn("ليس لك الصلاحية لحذف المصروفات");
        return;
      }

      // Calculate the difference between the new balance and the previous amount
      const updatedbalance = CashRegisterBalance + amount;

      if (cashMovementId) {
        // Ensure cashMovementId has a value before sending the request
        // Delete the expense record after extracting previous expense data
        const deleteExpenseRecord = await axios.delete(
          `${apiUrl}/api/dailyexpense/${dailyexpenseId}`,
          config
        );
        const deleteCashMovement = await axios.delete(
          `${apiUrl}/api/cashMovement/${cashMovementId}`,
          config
        );

        // Update the cash register balance with the updatedbalance
        const updatecashRegister = await axios.put(
          `${apiUrl}/api/cashRegister/${cashRegister}`,
          {
            balance: updatedbalance,
          },
          config
        );

        if (updatecashRegister) {
          // Toast notification for successful deletion
          toast.success("Expense deleted successfully");

          // Fetch all daily expenses after the update
          getallExpenses();
          getAllcashRegisters();
          getallDailyExpenses();
        }
      } else {
      }
    } catch (error) {
      // Toast notification for error
      toast.error("Failed to delete expense");
    }
  };

  const getallDailyExpenses = async () => {
    const config = await handleGetTokenAndConfig();
    try {
      if (permissionDailyExpense && !permissionDailyExpense.read) {
        toast.warn("ليس لك الصلاحية لعرض المصروفات");
        return;
      }
      const response = await axios.get(apiUrl + "/api/dailyexpense/", config);
      const dailyExpenses = await response.data.reverse();

      setAllDailyExpenses(dailyExpenses);
    } catch (error) {}
  };

  const searchByDailyExpense = (DailyExpense) => {
    if (!DailyExpense) {
      getallDailyExpenses();
      return;
    }
    const filter =
      allDailyExpenses &&
      allDailyExpenses.filter(
        (exp) => exp.expenseDescription.startsWith(DailyExpense) === true
      );
    setAllDailyExpenses(filter);
  };
  const filterByExpense = (expenseId) => {
    if (!expenseId) {
      getallDailyExpenses();
      return;
    }
    const filter =
      allDailyExpenses &&
      allDailyExpenses.filter((exp) => exp.expenseId?._id === expenseId);
    setAllDailyExpenses(filter);
  };

  const filterByExpenseType = (expenseType) => {
    if (!expenseType) {
      getallDailyExpenses();
      return;
    }
    const filterExpenseByType =
      allExpenses &&
      allExpenses.filter((expense) => expense.expenseType === expenseType);
    const listDailyExpenses = [];
    filterExpenseByType.map((expense) => {
      const filter =
        allDailyExpenses &&
        allDailyExpenses.filter((exp) => exp.expenseId?._id === expense._id);
      listCashRegister = [...listDailyExpenses, filter];
    });
    setAllDailyExpenses(listDailyExpenses);
  };

  useEffect(() => {
    getallExpenses();
    getAllcashRegisters();
    getallDailyExpenses();
  }, []);

  return (
    <div className="w-100 px-3 d-flex align-itmes-center justify-content-start">
      <div className="table-responsive mt-1">
        <div className="table-wrapper p-3 mw-100">
          <div className="table-title">
            <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
              <div className="text-right">
                <h2>
                  ادارة <b>تسجيل المصروفات</b>
                </h2>
              </div>
              <div className="col-12 col-md-6 p-0 m-0 d-flex flex-wrap aliegn-items-center justify-content-end print-hide">
                <a
                  href="#addDailyExpensesModal"
                  className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-success"
                  data-toggle="modal"
                  onClick={() => handlecashRegister(employeeLoginInfo.id)}
                >
                  {" "}
                  <span>اضافه مصروف جديد</span>
                </a>

                {/* <a href="#deleteDailyExpensesModal" className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-danger" data-toggle="modal"> <span>حذف</span></a> */}
              </div>
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
                  اسم المصروف
                </label>
                <input
                  type="text"
                  className="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => searchByDailyExpense(e.target.value)}
                />
              </div>

              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  المصروف
                </label>
                <select
                  className="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => filterByExpense(e.target.value)}
                >
                  <option value="">اختر</option>
                  {allExpenses &&
                    allExpenses.map((expense, i) => {
                      return (
                        <option value={expense._id} key={i}>
                          {expense.description}
                        </option>
                      );
                    })}
                </select>
              </div>

              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  نوع المصروف
                </label>
                <select
                  className="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => filterByExpenseType(e.target.value)}
                >
                  <option value="">اختر</option>
                  {expenseTypeEn &&
                    expenseTypeEn.map((TypeEn, i) => {
                      return (
                        <option value={TypeEn} key={i}>
                          {expenseTypeAr[i]}
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
                      setAllDailyExpenses(
                        filterByTime(e.target.value, allDailyExpenses)
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
                        setAllDailyExpenses(filterByDateRange(allDailyExpenses))
                      }
                    >
                      <i className="fa fa-search"></i>
                    </button>
                    <button
                      type="button"
                      className="btn btn-warning h-100 p-2"
                      onClick={getallDailyExpenses}
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
                <th>اسم المصروف</th>
                <th>المبلغ </th>
                <th>الحزينه </th>
                <th>حركه الخزينه</th>
                <th>ملاحظات</th>
                <th>بواسطه </th>
                <th>اضف في</th>
                <th>اجراءات</th>
              </tr>
            </thead>
            <tbody>
              {allDailyExpenses.length > 0
                ? allDailyExpenses.map((dailyexpense, i) => {
                    if ((i >= startPagination) & (i < endPagination)) {
                      return (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td>{dailyexpense.expenseDescription}</td>
                          <td>{dailyexpense.amount}</td>
                          <td>{dailyexpense.cashRegister?.name}</td>
                          <td>{dailyexpense.cashMovementId?.type}</td>
                          <td>{dailyexpense.notes}</td>
                          <td>{dailyexpense.paidBy?.username}</td>
                          <td>{formatDateTime(dailyexpense.date)}</td>
                          <td>
                            <button
                              data-target="#editDailyExpensesModal"
                              className="btn btn-sm btn-primary ml-2 "
                              data-toggle="modal"
                              onClick={() => {
                                handlecashRegister(employeeLoginInfo.id);
                                setcashMovementId(
                                  dailyexpense.cashMovementId?._id
                                );
                                setexpenseId(dailyexpense.expenseId?._id);
                                setcashRegister(dailyexpense.cashRegister._id);
                                setcashRegisterName(
                                  dailyexpense.cashRegister?.name
                                );
                                setexpenseDescription(
                                  dailyexpense.expenseDescription
                                );
                                setamount(dailyexpense.amount);
                                setpaidBy(dailyexpense.paidBy?._id);
                                setnotes(dailyexpense.notes);
                                setdailyexpenseId(dailyexpense._id);
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
                              data-target="#deleteDailyExpensesModal"
                              className="btn btn-sm btn-danger"
                              data-toggle="modal"
                              onClick={() => {
                                setexpenseId(dailyexpense.expenseId?._id);
                                setcashRegister(dailyexpense.cashRegister._id);
                                setdailyexpenseId(dailyexpense._id);
                                setamount(dailyexpense.amount);
                                setdailyexpenseId(dailyexpense._id);
                                setcashMovementId(
                                  dailyexpense.cashMovementId._id
                                );
                              }}
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
                : ""}
            </tbody>
          </table>
          <div className="clearfix">
            <div className="hint-text text-dark">
              عرض{" "}
              <b>
                {allDailyExpenses.length > endPagination
                  ? endPagination
                  : allDailyExpenses.length}
              </b>{" "}
              من <b>{allDailyExpenses.length}</b> عنصر
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
      <div id="addDailyExpensesModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={createDailyExpense}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">تسجيل مصروف</h4>
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
                    المصروف
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    name="category"
                    id="category"
                    form="carform"
                    onChange={(e) => {
                      setexpenseId(e.target.value);
                      setexpenseDescription(
                        allExpenses.length > 0
                          ? allExpenses.find((ex) => ex._id === e.target.value)
                              .description
                          : ""
                      );
                    }}
                  >
                    {allExpenses.length > 0
                      ? allExpenses.map((expense, i) => {
                          return (
                            <option value={expense._id} key={i}>
                              {expense.description}
                            </option>
                          );
                        })
                      : ""}
                  </select>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    التاريخ
                  </label>
                  <input
                    type="date"
                    className="form-control border-primary m-0 p-2 h-auto"
                    required
                    onChange={(e) => {
                      setdate(e.target.value);
                    }}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    المبلغ
                  </label>
                  <input
                    type="Number"
                    className="form-control border-primary m-0 p-2 h-auto"
                    required
                    onChange={(e) => {
                      setamount(e.target.value);
                    }}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الخزينه{" "}
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    onChange={(e) => selectCashRegister(e.target.value)}
                  >
                    <option value={""}>الكل</option>
                    {listCashRegister.map((cashRegister) => {
                      return (
                        <option value={cashRegister._id}>
                          {cashRegister.name}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    ملاحظات
                  </label>
                  <textarea
                    className="form-control border-primary m-0 p-2 h-auto"
                    rows={2}
                    cols={50}
                    onChange={(e) => {
                      setnotes(e.target.value);
                    }}
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
                />
              </div>
            </form>
          </div>
        </div>
      </div>
      <div id="editDailyExpensesModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={editDailyExpense}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">تعديل مصروف</h4>
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
                    المصروف
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    name="category"
                    id="category"
                    form="carform"
                    onChange={(e) => {
                      setexpenseId(e.target.value);
                      setexpenseDescription(
                        allExpenses
                          ? allExpenses.find((ex) => ex._id === e.target.value)
                              .description
                          : ""
                      );
                    }}
                  >
                    <option value={expenseId}>{expenseDescription}</option>
                    {allExpenses
                      ? allExpenses.map((expense, i) => {
                          return (
                            <option value={expense._id} key={i}>
                              {expense.description}
                            </option>
                          );
                        })
                      : ""}
                  </select>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    التاريخ
                  </label>
                  <input
                    type="date"
                    className="form-control border-primary m-0 p-2 h-auto"
                    required
                    onChange={(e) => {
                      setdate(e.target.value);
                    }}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    المبلغ
                  </label>
                  <input
                    type="Number"
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={amount}
                    required
                    onChange={(e) => {
                      setamount(e.target.value);
                    }}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الخزينه{" "}
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    onChange={(e) => selectCashRegister(e.target.value)}
                  >
                    <option value={cashRegister}>{cashRegisterName}</option>
                    {listCashRegister.map((cashRegister) => {
                      return (
                        <option value={cashRegister._id}>
                          {cashRegister.name}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    ملاحظات
                  </label>
                  <textarea
                    className="form-control border-primary m-0 p-2 h-auto"
                    rows={2}
                    cols={100}
                    value={notes}
                    onChange={(e) => {
                      setnotes(e.target.value);
                    }}
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

      <div id="deleteDailyExpensesModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={deleteDailyExpense}>
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

export default DailyExpense;
