import React, { useState, useEffect, useRef, useContext } from "react";
import axios from "axios";
import { AppContext } from "../../../../context/appContext";
import { toast } from "react-toastify";
import "../orders/Orders.css";

const CashMovement = () => {
  const {
    permissionsList,
    setStartDate,
    formatDateTime,
    setEndDate,
    filterByDateRange,
    filterByTime,
    employeeLoginInfo,
    formatDate,
    setIsLoading,
    EditPagination,
    startPagination,
    endPagination,
    setStartPagination,
    setEndPagination,
    handleGetTokenAndConfig,
    apiUrl,
  } = useContext(AppContext);

  const cashMovementPermissions = permissionsList?.filter(
    (permission) => permission.resource === "Cash Movement"
  )[0];

  const cashRegisterPermissions = permissionsList?.filter(
    (permission) => permission.resource === "Cash Register"
  )[0];

  const [cashRegister, setcashRegister] = useState("");
  const [employeeCashRegisters, setemployeeCashRegisters] = useState([]);
  const [CashRegisterBalance, setCashRegisterBalance] = useState();

  const [AllCashRegisters, setAllCashRegisters] = useState([]);
  const [listOfCashRegisters, setlistOfCashRegisters] = useState([]);
  // Fetch all cash registers

  const getAllCashRegisters = async () => {
    const config = await handleGetTokenAndConfig();
    if (cashRegisterPermissions && cashRegisterPermissions.read === false) {
      toast.warn("ليس لك صلاحية لعرض حسابات الخزينه");
      return;
    }

    try {
      const employeeId = await employeeLoginInfo.id;

      const response = await axios.get(apiUrl + "/api/cashregister", config);
      const cashRegisterData = response.data.reverse();
      setlistOfCashRegisters(cashRegisterData);

      if (cashRegisterData.length > 0) {
        if (
          employeeLoginInfo.role === "owner" ||
          employeeLoginInfo.role === "manager"
        ) {
          setAllCashRegisters(cashRegisterData);
        } else {
          const myCashRegister = cashRegisterData.filter(
            (CashRegister) => CashRegister.employee?._id === employeeId
          );

          setAllCashRegisters(myCashRegister);
        }
      }
    } catch (err) {
      console.error("Error fetching cash registers:", err);
      toast.error(
        "An error occurred while fetching cash registers. Please try again later."
      );
    }
  };

  const handlecashRegister = async (id) => {
    const config = await handleGetTokenAndConfig();
    if (cashRegisterPermissions && cashRegisterPermissions.read === false) {
      toast.warn("ليس لك صلاحية لعرض حسابات الخزينه");
      return;
    }
    try {
      const response = await axios.get(
        `${apiUrl}/api/cashregister/employee/${id}`,
        config
      );
      setemployeeCashRegisters(response.data.reverse());
    } catch (err) {
      toast.error("Error fetching cash registers");
    }
  };

  const selectCashRegister = (id) => {
    const cashRegisterSelected = employeeCashRegisters.find(
      (register) => register._id === id
    );
    setcashRegister(id);
    setCashRegisterBalance(cashRegisterSelected.balance);
  };

  const [AllCashMovement, setAllCashMovement] = useState([]);
  const getCashMovement = async () => {
    const config = await handleGetTokenAndConfig();

    if (cashMovementPermissions && cashMovementPermissions.read === false) {
      toast.warn("ليس لك صلاحية لعرض حسابات الخزينه");
      return;
    }

    try {
      const employeeId = await employeeLoginInfo.id;

      const response = await axios.get(apiUrl + "/api/cashmovement/", config);
      const AllCashMovement = response.data.reverse();
      if (AllCashMovement.length > 0) {
        if (
          employeeLoginInfo.role === "owner" ||
          employeeLoginInfo.role === "manager"
        ) {
          setAllCashMovement(AllCashMovement);
        } else {
          const myCashMovement = AllCashMovement.filter(
            (movement) => movement.registerId?.employee === employeeId
          );

          setAllCashMovement(myCashMovement);
        }
      }
    } catch (error) {
      toast.error("حدث خطأ أثناء جلب بيانات حركة الخزينه. حاول مرة أخرى .");
    }
  };

  const operationTypesEN = [
    "Deposit",
    "Withdraw",
    "Revenue",
    "Transfer",
    "Expense",
    "Payment",
    "Refund",
  ];
  const operationTypesAR = [
    "إيداع",
    "سحب",
    "إيراد",
    "تحويل",
    "مصروف",
    "دفع مشتريات",
    "استرداد",
  ];
  const operationStatusEN = ["Pending", "Completed", "Rejected"];
  const operationStatusAr = ["انتظار", "مكتمل", "مرفوض"];
  const [createdBy, setcreatedBy] = useState("");
  const [amount, setAmount] = useState();
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");

  // Function to add cash movement and update balance
  const addCashMovementAndUpdateBalance = async () => {
    const config = await handleGetTokenAndConfig();
    if (cashMovementPermissions && cashMovementPermissions.create === false) {
      toast.warn("ليس لك صلاحية لانشاء حركه في حسابات الخزينه");
      return;
    }
    try {
      // Send cash movement data to the API
      const cashMovementResponse = await axios.post(
        apiUrl + "/api/cashmovement/",
        {
          registerId: cashRegister,
          createdBy,
          amount,
          type,
          description,
        },
        config
      );

      // If the cash movement is recorded successfully
      if (cashMovementResponse.data) {
        const isWithdrawal = type === "Withdraw";
        const updateAmount = isWithdrawal ? -amount : amount;
        const newBalance = CashRegisterBalance + updateAmount;

        // Update the cash register balance on the server
        const updateRegisterBalance = await axios.put(
          `${apiUrl}/api/cashregister/${cashRegister}`,
          {
            balance: newBalance,
          },
          config
        );

        // If the cash register balance is updated successfully
        if (updateRegisterBalance.data) {
          // Show success toast message
          toast.success("تم تسجيل حركة النقدية بنجاح");
          // Refresh the displayed cash movements and registers
          getCashMovement();
          getAllCashRegisters();
        } else {
          // Show error toast message if updating cash register balance fails
          toast.error("فشل تحديث رصيد النقدية في الخزينة");
        }
      } else {
        // Show error toast message if recording cash movement fails
        toast.error("فشل تسجيل حركة النقدية");
      }
    } catch (error) {
      console.error("Error:", error);
      // Show error toast message if an error occurs during the request processing
      toast.error("حدث خطأ أثناء معالجة الطلب");
    }
  };

  const handelCashMovement = (id, Type) => {
    setSubmitted(false);
    handlecashRegister(id);
    setType(Type);
    setcreatedBy(id);
  };

  const [submitted, setSubmitted] = useState(false);
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!submitted) {
      setSubmitted(true);

      await addCashMovementAndUpdateBalance();

      const modal = document.getElementById("DepositModal");
      if (modal) {
        modal.style.display = "none";
      }
    }
  };
  const [sendRegister, setsendRegister] = useState(false);
  const [receivRegister, setreceivRegister] = useState(false);
  // const [statusTransfer, setstatusTransfer] = useState(false);

  const transferCash = async (e) => {
    e.preventDefault();

    try {
      const config = await handleGetTokenAndConfig();
      if (cashMovementPermissions && cashMovementPermissions.create === false) {
        toast.warn("ليس لك صلاحية لانشاء حركه في حسابات الخزينه");
        return;
      }

      const sendCashMovementData = {
        registerId: sendRegister,
        createdBy,
        amount,
        type: "Transfer",
        description,
        transferTo: receivRegister,
        status: "Pending",
      };

      const sendCashMovementResponse = await axios.post(
        `${apiUrl}/api/cashmovement/`,
        sendCashMovementData,
        config
      );
      if (sendCashMovementResponse) {
        const sendCashMovementResult = sendCashMovementResponse.data;
        const movementId = sendCashMovementResult.cashMovement._id;

        const receivCashMovementData = {
          registerId: receivRegister,
          createdBy,
          amount,
          type: "Transfer",
          description,
          transferFrom: sendRegister,
          status: "Pending",
          movementId,
        };

        const receivCashMovementResponse = await axios.post(
          `${apiUrl}/api/cashmovement/`,
          receivCashMovementData,
          config
        );
        const receivCashMovementResult = receivCashMovementResponse.data;

        if (receivCashMovementResult) {
          toast.success("تم تسجيل التحويل وينتظر الموافقة من المستلم");
          getCashMovement();
          getAllCashRegisters();
        } else {
          const sendCashMovementResponse = await axios.delete(
            `${apiUrl}/api/cashmovement/${movementId}`,
            config
          );
          toast.warn(
            "حدث خطا اثناء تسجيل حركه التحويل !اعد تحميل الصفحة و حاول مره اخري"
          );
        }
      }
    } catch (error) {
      toast.error("حدث خطأ أثناء تسجيل حركة النقدية");
      console.error("Error during cash transfer:", error);
    }
  };

  const accepteTransferCash = async (id, statusTransfer) => {
    try {
      const config = await handleGetTokenAndConfig();

      // Fetch details of the cash movement
      const receivcashMovementResponse = await axios.get(
        `${apiUrl}/api/cashmovement/${id}`,
        config
      );
      const receivcashMovement = receivcashMovementResponse.data;
      const {
        movementId,
        transferFrom: sendregister,
        registerId: receivregister,
        amount,
      } = receivcashMovement;

      console.log({
        movementId: movementId._id,
        sendregister: sendregister._id,
        amount,
        receivregister: receivregister._id,
      });

      if (statusTransfer === "Rejected") {
        // Reject transfer
        await axios.put(
          `${apiUrl}/api/cashmovement/${id}`,
          { status: "Rejected" },
          config
        );
        await axios.put(
          `${apiUrl}/api/cashmovement/${movementId._id}`,
          { status: "Rejected" },
          config
        );
        toast.error("تم رفض التحويل بنجاح");
      } else if (statusTransfer === "Completed") {
        // Update receiver's cash movement status
        await axios.put(
          `${apiUrl}/api/cashmovement/${id}`,
          { status: "Completed" },
          config
        );

        // Update receiver's cash register balance
        const receivregisterBalanceResponse = await axios.get(
          `${apiUrl}/api/cashregister/${receivregister._id}`,
          config
        );
        const receivregisterBalance =
          receivregisterBalanceResponse.data.balance;
        const newreceivBalance = receivregisterBalance + amount;

        await axios.put(
          `${apiUrl}/api/cashregister/${receivregister._id}`,
          { balance: newreceivBalance },
          config
        );

        // Update sender's cash movement status
        await axios.put(
          `${apiUrl}/api/cashmovement/${movementId._id}`,
          { status: "Completed" },
          config
        );

        // Update sender's cash register balance
        const senderregisterBalanceResponse = await axios.get(
          `${apiUrl}/api/cashregister/${sendregister._id}`,
          config
        );
        const senderregisterBalance =
          senderregisterBalanceResponse.data.balance;
        const newsenderBalance = senderregisterBalance - amount;

        await axios.put(
          `${apiUrl}/api/cashregister/${sendregister._id}`,
          { balance: newsenderBalance },
          config
        );
        getCashMovement();
        getAllCashRegisters();

        toast.success("تم التحويل بنجاح");
      }
    } catch (error) {
      console.error("Error accepting transfer:", error);
      toast.error("حدث خطأ أثناء قبول التحويل. يرجى المحاولة مرة أخرى.");
    }
  };

  const filterByType = (type) => {
    if (!type) {
      getCashMovement();
      return;
    }
    const filterList = AllCashMovement.filter(
      (movement) => movement.type === type
    );
    setAllCashMovement(filterList);
  };

  const filterByCashRegisters = (cashregisterId) => {
    if (!cashregisterId) {
      getCashMovement();
      return;
    }
    const filterList = AllCashMovement.filter(
      (movement) => movement.registerId?._id === cashregisterId
    );
    setAllCashMovement(filterList);
  };

  useEffect(() => {
    // getEmployeeInfoFromToken()
    getAllCashRegisters();
    getCashMovement();
  }, []);

  // useEffect(() => {
  //   getAllCashRegisters()
  //   getCashMovement()
  // }, [EmployeeLoginInfo])

  return (
    <div className="w-100 px-3 d-flex align-itmes-center justify-content-start">
      <div className="table-responsive">
        <div className="table-wrapper p-3 mw-100">
          <div className="table-title">
            <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
              <div className="text-right">
                <h2>
                  ادارة <b>حركه النقدية</b>
                </h2>
              </div>
              <div className="col-sm-6 h-100 d-flex justify-content-end">
                {cashMovementPermissions?.create && (
                  <>
                    <a
                      href="#DepositModal"
                      className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-success"
                      data-toggle="modal"
                      onClick={() =>
                        handelCashMovement(employeeLoginInfo.id, "Deposit")
                      }
                    >
                      <span>ايداع</span>
                    </a>
                    <a
                      href="#WithdrawModal"
                      className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-danger"
                      data-toggle="modal"
                      onClick={() =>
                        handelCashMovement(employeeLoginInfo.id, "Withdraw")
                      }
                    >
                      <span>سحب</span>
                    </a>
                    <a
                      href="#Transferodal"
                      className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-warning"
                      data-toggle="modal"
                      onClick={() =>
                        handelCashMovement(employeeLoginInfo.id, "Transfer")
                      }
                    >
                      <span>تحويل</span>
                    </a>
                  </>
                )}
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
                  نوع العملية
                </label>
                <select
                  class="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => filterByType(e.target.value)}
                >
                  <option value={""}>الكل</option>
                  {operationTypesEN.map((type, i) => {
                    return (
                      <option value={type} key={i}>
                        {operationTypesAR[i]}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div class="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  الخزينه
                </label>
                <select
                  class="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => filterByCashRegisters(e.target.value)}
                >
                  <option value="">الكل</option>
                  {AllCashRegisters && AllCashRegisters.length > 0 ? (
                    AllCashRegisters.map((CashRegister) => (
                      <option value={CashRegister._id} key={CashRegister._id}>
                        {CashRegister.name}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>
                      لا توجد خزائن
                    </option>
                  )}
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
                      setAllCashMovement(
                        filterByTime(e.target.value, AllCashMovement)
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
                        setAllCashMovement(filterByDateRange(AllCashMovement))
                      }
                    >
                      <i className="fa fa-search"></i>
                    </button>
                    <button
                      type="button"
                      className="btn btn-warning h-100 p-2"
                      onClick={getCashMovement}
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
                <th>الخزنه</th>
                {/* <th>المسؤل</th> */}
                <th>النوع</th>
                <th>بواسطه</th>
                <th>المبلغ</th>
                <th>الوصف</th>
                <th>الحالة</th>
                <th>التاريخ</th>
                {/* <th>اجراءات</th> */}
              </tr>
            </thead>
            <tbody>
              {AllCashMovement.length > 0
                ? AllCashMovement.map((movement, i) => {
                    if ((i >= startPagination) & (i < endPagination)) {
                      return (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td>
                            {movement.registerId
                              ? movement.registerId.name
                              : "No register found"}
                          </td>
                          {/* <td>{movement.registerId?.employee?.fullname}</td> */}
                          <td>
                            {
                              operationTypesAR[
                                operationTypesEN.findIndex(
                                  (type) => type === movement.type
                                )
                              ]
                            }
                          </td>
                          <td>{movement.createdBy?.fullname}</td>
                          <td>{movement.amount}</td>
                          <td>{movement.description}</td>
                          <td>
                            {movement.status === "Pending" &&
                            movement.transferFrom ? (
                              <>
                                <button
                                  className="btn btn-success col-6 h-100 px-2 py-3 m-0"
                                  onClick={() => {
                                    accepteTransferCash(
                                      movement._id,
                                      "Completed"
                                    );
                                  }}
                                >
                                  قبول
                                </button>
                                <button
                                  className="btn btn-warning  col-6 h-100 px-2 py-3 m-0"
                                  onClick={() => {
                                    accepteTransferCash(
                                      movement._id,
                                      "Rejected"
                                    );
                                  }}
                                >
                                  رفض
                                </button>
                              </>
                            ) : (
                              <td>
                                {
                                  operationStatusAr[
                                    operationStatusEN.findIndex(
                                      (status) => status === movement.status
                                    )
                                  ]
                                }
                              </td>
                            )}
                          </td>
                          <td>{formatDateTime(movement.createdAt)}</td>
                          {/* <td>
                                  <a href="#editStockactionModal" className="btn btn-sm btn-primary ml-2 " data-toggle="modal" onClick={() => { setactionId(action._id); setoldBalance(action.oldBalance); setoldCost(action.oldCost); setprice(action.price) }}><i className="material-icons" data-toggle="tooltip" title="Edit">&#xE254;</i></a>
                                  <a href="#deleteStockactionModal" className="btn btn-sm btn-danger" data-toggle="modal" onClick={() => setactionId(action._id)}><i className="material-icons" data-toggle="tooltip" title="Delete">&#xE872;</i></a>
                                </td> */}
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
                {AllCashMovement.length > endPagination
                  ? endPagination
                  : AllCashMovement.length}
              </b>{" "}
              من <b>{AllCashMovement.length}</b> عنصر
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

      <div id="DepositModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={handleSubmit}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">ايداع بالخزينه</h4>
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
                    الخزينه{" "}
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    onChange={(e) => selectCashRegister(e.target.value)}
                  >
                    <option value="">اختر الخزينه</option>;
                    {employeeCashRegisters.map((cashRegister) => {
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
                    الرصيد
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    Value={CashRegisterBalance}
                    readOnly
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    المبلغ
                  </label>
                  <input
                    type="number"
                    className="form-control border-primary m-0 p-2 h-auto"
                    required
                    onChange={(e) => setAmount(parseFloat(e.target.value))}
                    placeholder="أدخل المبلغ"
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الوصف
                  </label>
                  <textarea
                    className="form-control border-primary m-0 p-2 h-auto"
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    التاريخ
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={formatDate(new Date())}
                    readOnly
                  />
                </div>
              </div>
              <div className="modal-footer d-flex flex-nowrap align-items-center justify-content-between m-0 p-1">
                <input
                  type="button"
                  className="btn btn-danger col-6 h-100 px-2 py-3 m-0"
                  data-dismiss="modal"
                  value="إغلاق"
                />
                <input
                  type="submit"
                  className="btn btn-success col-6 h-100 px-2 py-3 m-0"
                  value="ايداع"
                />
              </div>
            </form>
          </div>
        </div>
      </div>

      <div id="WithdrawModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={handleSubmit}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">سحب بالخزينه</h4>
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
                    الخزينه{" "}
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    onChange={(e) => selectCashRegister(e.target.value)}
                  >
                    <option value="">اختر الخزينه</option>;
                    {employeeCashRegisters.map((cashRegister) => {
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
                    الرصيد
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    Value={CashRegisterBalance}
                    readOnly
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    المبلغ
                  </label>
                  <input
                    type="number"
                    className="form-control border-primary m-0 p-2 h-auto"
                    required
                    onChange={(e) => setAmount(parseFloat(e.target.value))}
                    placeholder="أدخل المبلغ"
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الوصف
                  </label>
                  <textarea
                    rows="2"
                    cols="80"
                    className="form-control border-primary m-0 p-2 h-auto"
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    التاريخ
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    Value={formatDate(new Date())}
                    readOnly
                  />
                </div>
              </div>
              <div className="modal-footer d-flex flex-nowrap align-items-center justify-content-between m-0 p-1">
                <input
                  type="button"
                  className="btn btn-danger col-6 h-100 px-2 py-3 m-0"
                  data-dismiss="modal"
                  value="إغلاق"
                />
                <input
                  type="submit"
                  className="btn btn-success col-6 h-100 px-2 py-3 m-0"
                  value="سحب"
                />
              </div>
            </form>
          </div>
        </div>
      </div>

      <div id="Transferodal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={transferCash}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">تحويل بالخزينه</h4>
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
                    الخزينه{" "}
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    onChange={(e) => {
                      selectCashRegister(e.target.value);
                      setsendRegister(e.target.value);
                    }}
                  >
                    <option value="">اختر الخزينه</option>;
                    {employeeCashRegisters.map((cashRegister) => {
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
                    الرصيد
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    Value={CashRegisterBalance}
                    readOnly
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    المبلغ
                  </label>
                  <input
                    type="number"
                    className="form-control border-primary m-0 p-2 h-auto"
                    required
                    onChange={(e) => setAmount(parseFloat(e.target.value))}
                    placeholder="أدخل المبلغ"
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الوصف
                  </label>
                  <textarea
                    rows="2"
                    cols="80"
                    className="form-control border-primary m-0 p-2 h-auto"
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الخزينه المحول اليها
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    onChange={(e) => setreceivRegister(e.target.value)}
                  >
                    <option value={""}>اختر</option>
                    {listOfCashRegisters.map((Register, i) => (
                      <option key={i} value={Register._id}>
                        {Register.name} المسؤول: {Register.employee?.username}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    التاريخ
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    Value={formatDate(new Date())}
                    readOnly
                  />
                </div>
              </div>
              <div className="modal-footer d-flex flex-nowrap align-items-center justify-content-between m-0 p-1">
                <input
                  type="button"
                  className="btn btn-danger col-6 h-100 px-2 py-3 m-0"
                  data-dismiss="modal"
                  value="إغلاق"
                />
                <input
                  type="submit"
                  className="btn btn-success col-6 h-100 px-2 py-3 m-0"
                  value="تحويل "
                />
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* <div id="deleteStockactionModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={deleteStockaction}>
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
              <div className="modal-body d-flex flex-wrap align-items-center p-3 text-right">
                <p className="text-dark f-3">هل انت متاكد من حذف هذا السجل؟</p>
                <p className="text-warning text-center mt-3">
                  <small>لا يمكن الرجوع في هذا الاجراء.</small>
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
      </div> */}
    </div>
  );
};

export   default CashMovement;
