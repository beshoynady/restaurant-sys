import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AppContext } from "../../../../context/appContext";
import { toast } from "react-toastify";
import "../orders/Orders.css";

const ExpenseItem = () => {
  const {
    brandInfo,
    permissionsList,
    setStartDate,
    setEndDate,
    filterByDateRange,
    filterByTime,
    EditPagination,
    startPagination,
    endPagination,
    setStartPagination,
    setEndPagination,
    formatDateTime,
    handleGetTokenAndConfig,
    apiUrl,
  } = useContext(AppContext);

  const permissionExpense =
    permissionsList &&
    permissionsList.filter(
      (permission) => permission.resource === "Expenses"
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

  const [allExpenses, setAllExpenses] = useState([]);
  const [expenseId, setexpenseId] = useState("");

  const [description, setDescription] = useState("");
  const [expenseType, setExpenseType] = useState("");
  const [isSalary, setisSalary] = useState(false);

  const createExpense = async (e) => {
    e.preventDefault();
    try {
      const config = await handleGetTokenAndConfig();
      if (permissionExpense && !permissionExpense.create) {
        toast.warn("ليس لك الصلاحية لتسجيل المصروفات");
        return;
      }

      const response = await axios.post(
        apiUrl + "/api/expenses/",
        { description, expenseType, isSalary },
        config
      );

      getAllExpenses();
      toast.success("تم إنشاء المصروف بنجاح");
      toast.info(
        "لا يمكن تعديل بيانات حساب المصروفات بعد تسجيل اي مصروفات به "
      );
    } catch (error) {
      toast.error("حدث خطأ أثناء إنشاء المصروف");
    }
  };

  const editExpense = async (e) => {
    e.preventDefault();
    try {
      const config = await handleGetTokenAndConfig();
      if (permissionExpense && !permissionExpense.update) {
        toast.warn("ليس لك الصلاحية لتعديل المصروفات");
        return;
      }
      if (
        allExpenses.find((expense) => expense._id === expenseId)?.amount > 0
      ) {
        toast.warn("لا يمكن تعديل بيانات المصروف بعد تسجيل المصروفات بالحساب");
        return;
      }
      const response = await axios.put(
        `${apiUrl}/api/expenses/${expenseId}`,
        { description, expenseType, isSalary },
        config
      );

      if (response.status === 200) {
        getAllExpenses();
        toast.success("تم تعديل المصروف بنجاح");
      }
    } catch (error) {
      toast.error("حدث خطأ أثناء تعديل المصروف");
    }
  };

  const deleteExpense = async (e) => {
    e.preventDefault();
    try {
      const config = await handleGetTokenAndConfig();
      if (permissionExpense && !permissionExpense.delete) {
        toast.warn("ليس لك الصلاحية لحذف المصروفات");
        return;
      }
      if (
        allExpenses.find((expense) => expense._id === expenseId)?.amount > 0
      ) {
        toast.warn("لا يمكن حذف بيانات المصروف بعد تسجيل المصروفات بالحساب");
        return;
      }
      const response = await axios.delete(
        `${apiUrl}/api/expenses/${expenseId}`,
        config
      );
      if (response.status === 200) {
        getAllExpenses();
        toast.success("تم حذف المصروف بنجاح");
      }
    } catch (error) {
      toast.error("حدث خطأ أثناء حذف المصروف");
    }
  };

  const getAllExpenses = async () => {
    try {
      const config = await handleGetTokenAndConfig();
      if (permissionExpense && !permissionExpense.read) {
        toast.warn("ليس لك الصلاحية لعرض المصروفات");
        return;
      }
      const response = await axios.get(apiUrl + "/api/expenses/", config);
      const expenses = await response.data.reverse();

      setAllExpenses(expenses);
    } catch (error) {
      toast.error("حدث خطأ أثناء جلب المصاريف");
    }
  };

  const [allDailyExpenses, setAllDailyExpenses] = useState([]);
  const getallDailyExpenses = async () => {
    try {
      const config = await handleGetTokenAndConfig();
      const response = await axios.get(apiUrl + "/api/dailyexpense/", config);
      const dailyExpenses = await response.data.reverse();

      setAllDailyExpenses(dailyExpenses);
    } catch (error) {}
  };

  const searchByExpense = (expense) => {
    if (!expense) {
      getAllExpenses();
      return;
    }
    const filter = allExpenses.filter((exp) =>
      exp.description.startsWith(expense)
    );
    setAllExpenses(filter);
  };

  const filterByExpenseType = (expenseType) => {
    if (!expenseType) {
      getAllExpenses();
      return;
    }
    const filterExpenseByType = allExpenses.filter(
      (expense) => expense.expenseType === expenseType
    );
    setAllExpenses(filterExpenseByType);
  };

  useEffect(() => {
    // if(permissionExpense){
    getAllExpenses();
    getallDailyExpenses();
    // }
  }, []);

  useEffect(() => {
    if (!allDailyExpenses) {
      toast.warn("لا يوجد اي سجل للمصروفات اليومية");
      return;
    }
    const updatedExpenses =
      allExpenses &&
      allExpenses.map((expense, i) => {
        let total = 0;
        const filterDailyExpense =
          allDailyExpenses &&
          allDailyExpenses.filter(
            (dailyExpense) => dailyExpense.expenseId?._id === expense._id
          );
        if (filterDailyExpense) {
          filterDailyExpense.map((DailyExpens) => {
            total += DailyExpens.amount;
          });
        }
        return { ...expense, amount: total };
      });

    setAllExpenses(updatedExpenses);
  }, [allDailyExpenses]);

  return (
    <div className="w-100 px-3 d-flex align-itmes-center justify-content-start">
      <div className="table-responsive mt-1">
        <div className="table-wrapper p-3 mw-100">
          <div className="table-title">
            <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
              <div className="text-right">
                <h2>
                  ادارة <b>المصروفات</b>
                </h2>
              </div>
              <div className="col-12 col-md-6 p-0 m-0 d-flex flex-wrap aliegn-items-center justify-content-end print-hide">
                <a
                  href="#addExpensesModal"
                  className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-success"
                  data-toggle="modal"
                >
                  {" "}
                  <span>اضافه مصروف جديد</span>
                </a>

                {/* <a href="#deleteExpensesModal" className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-danger" data-toggle="modal"> <span>حذف</span></a> */}
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
                  onChange={(e) => searchByExpense(e.target.value)}
                />
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
                      onClick={getAllExpenses}
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
                <th>نوع المصروف</th>
                <th>اجمالي</th>
                <th>اضف في</th>
                <th>اجراءات</th>
              </tr>
            </thead>
            <tbody>
              {allExpenses.length > 0
                ? allExpenses.map((expense, i) => {
                    if ((i >= startPagination) & (i < endPagination)) {
                      return (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td>{expense.description}</td>
                          <td>
                            {
                              expenseTypeAr[
                                expenseTypeEn.findIndex(
                                  (item) => item === expense.expenseType
                                )
                              ]
                            }
                          </td>
                          <td>{expense.amount}</td>
                          <td>{formatDateTime(expense.createdAt)}</td>
                          <td>
                            <button
                              data-target="#editExpensesModal"
                              className="btn btn-sm btn-primary ml-2 "
                              data-toggle="modal"
                              onClick={() => {
                                setexpenseId(expense._id);
                                setExpenseType(expense.expenseType);
                                setisSalary(expense.isSalary);
                                setDescription(expense.description);
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
                              data-target="#deleteExpensesModal"
                              className="btn btn-sm btn-danger"
                              data-toggle="modal"
                              onClick={() => setexpenseId(expense._id)}
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
                {allExpenses.length > endPagination
                  ? endPagination
                  : allExpenses.length}
              </b>{" "}
              من <b>{allExpenses.length}</b> عنصر
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

      <div id="addExpensesModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={createExpense}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">اضافه مصروف</h4>
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
                    اسم المصروف
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    required
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    نوع المصروف
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    required
                    name="ExpenseType"
                    onChange={(e) => setExpenseType(e.target.value)}
                  >
                    <option>اختر نوع المصروف</option>
                    {expenseTypeEn.map((expenseType, index) => (
                      <option key={index} value={expenseType}>
                        {expenseTypeAr[index]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    هل هذا حساب خصم مرتبات
                  </label>
                  <input
                    type="checkbox"
                    className="form-check-input border-primary mr-2"
                    style={{ width: "21px", height: "21px" }}
                    onChange={() => setisSalary(!isSalary)}
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
      <div id="editExpensesModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={editExpense}>
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
                    اسم المصروف
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    defaultValue={description}
                    required
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    نوع المصروف
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    required
                    name="ExpenseType"
                    onChange={(e) => setExpenseType(e.target.value)}
                  >
                    <option>{expenseType}</option>
                    {expenseTypeEn.map((expenseType, index) => (
                      <option key={index} value={expenseType}>
                        {expenseTypeAr[index]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    هل هذا حساب خصم مرتبات
                  </label>
                  <input
                    type="checkbox"
                    className="form-check-input border-primary mr-2"
                    style={{ width: "21px", height: "21px" }}
                    defaultChecked={isSalary}
                    onChange={() => setisSalary(!isSalary)}
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

      <div id="deleteExpensesModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={deleteExpense}>
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

export   default ExpenseItem;
