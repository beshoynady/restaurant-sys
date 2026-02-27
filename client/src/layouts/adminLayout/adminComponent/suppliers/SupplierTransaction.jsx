import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { dataContext } from "../../../../context/appContext";
import { toast } from "react-toastify";
import "../orders/Orders.css";

const SupplierTransaction = () => {
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

  const [AllSupplierTransaction, setAllSupplierTransaction] = useState([]);
  const getAllSupplierTransaction = async () => {
    try {
      const config = await handleGetTokenAndConfig();
      const response = await axios.get(
        `${apiUrl}/api/suppliertransaction`,
        config
      );

      if (response.status === 200) {
        const data = response.data;
        setAllSupplierTransaction(data.reverse());
        calcTotalpurchPayment(data);
      }
    } catch (error) {
      toast.error(
        "حدث خطأ أثناء جلب بيانات تعاملات الموردين! يرجى إعادة تحميل الصفحة"
      );
    }
  };

  const [totalPurchases, settotalPurchases] = useState(0);
  const [totalPayment, settotalPayment] = useState(0);
  const [totalBalanceDue, settotalBalanceDue] = useState(0);
  const calcTotalpurchPayment = (array) => {
    let totalPurchases = 0;
    let totalPayment = 0;
    let totalBalanceDue = 0;

    if (array.length > 0) {
      array.forEach((item) => {
        if (item.transactionType === "Purchase") {
          totalPurchases += item.amount;
        } else if (item.transactionType === "Payment") {
          totalPayment += item.amount;
        } else if (item.transactionType === "BalanceDue") {
          totalBalanceDue += item.balanceDue;
        }
      });
    }

    settotalPurchases(totalPurchases);
    settotalPayment(totalPayment);
    settotalBalanceDue(totalBalanceDue);
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

  const [listtransactionType, setlistTransactionType] = useState([
    "OpeningBalance",
    "Purchase",
    "Payment",
    "PurchaseReturn",
    "Refund",
  ]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [supplier, setSupplier] = useState("");
  const [transactionDate, setTransactionDate] = useState("");
  const [transactionType, setTransactionType] = useState("");
  const [amount, setAmount] = useState(0);
  const [previousBalance, setPreviousBalance] = useState(0);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [recordedBy, setRecordedBy] = useState("");

  const handleAddSupplierTransaction = async (e) => {
    e.preventDefault();
    try {
      const config = await handleGetTokenAndConfig();
      const requestData = {
        invoiceNumber,
        supplier,
        transactionDate,
        transactionType,
        amount,
        previousBalance,
        currentBalance,
        paymentMethod,
        notes,
      };

      const response = await axios.post(
        `${apiUrl}/api/suppliertransaction`,
        requestData,
        config
      );

      if (response.status === 201) {
        toast.success("تم انشاء العملية بنجاح");
      } else {
        toast.error("حدث خطأ أثناء انشاء العملية");
      }
    } catch (error) {
      toast.error("حدث خطأ أثناء انشاء العملية");
    }
  };

  const [supplierInfo, setsupplierInfo] = useState({});
  const handleSupplier = (id) => {
    setSupplier(id);
    const findSupplier = AllSuppliers.filter(
      (supplier) => supplier._id === id
    )[0];
    setsupplierInfo(findSupplier);
    setPreviousBalance(findSupplier.currentBalance);
    filterSupplierTransactionBySupplier(id);
  };

  const handlecurrentBalance = (m) => {
    setAmount(Number(m));
    const totalBalance = Number(m) + Number(previousBalance);
    setCurrentBalance(totalBalance);
  };

  const filterSupplierTransactionBySupplier = (supplierId) => {
    const filteredTransactions = AllSupplierTransaction.filter(
      (transaction) => transaction.supplier === supplierId
    );
    setAllSupplierTransaction(filteredTransactions);
    calcTotalpurchPayment(filteredTransactions);
    filterPurchaseInvoiceBySupplier(supplierId);
  };

  const filterSupplierTransactionByTransactionType = (transactionType) => {
    const filter = AllSupplierTransaction.filter(
      (transaction) => transaction.transactionType === transactionType
    );
    setAllSupplierTransaction(filter);
  };

  const filterSupplierTransactionByInvoiceNumber = (invoiceNumber) => {
    const filter = AllSupplierTransaction.filter(
      (transaction) => transaction.invoiceNumber === invoiceNumber
    );
    setAllSupplierTransaction(filter);
  };

  const [allPurchaseInvoice, setAllPurchaseInvoice] = useState([]);
  const getAllPurchases = async () => {
    try {
      const config = await handleGetTokenAndConfig();
      const response = await axios.get(apiUrl + "/api/purchaseinvoice", config);

      if (response.status === 200) {
        setAllPurchaseInvoice(response.data.reverse());
      } else {
        toast.error("فشل جلب جميع فواتير المشتريات ! اعد تحميل الصفحة");
      }
    } catch (error) {
      toast.error("حدث خطأ اثناء جلب فواتير المشتريات ! اعد تحميل الصفحة");
    }
  };

  const [allPurchaseInvoiceFilterd, setAllPurchaseInvoiceFilterd] = useState(
    []
  );
  const filterPurchaseInvoiceBySupplier = (supplier) => {
    const filterPurchaseInvoice = allPurchaseInvoice.filter(
      (invoice) => invoice.supplier._id === supplier
    );

    setAllPurchaseInvoiceFilterd(filterPurchaseInvoice);
  };

  useEffect(() => {
    getAllSuppliers();
    getAllPurchases();
    getAllSupplierTransaction();
  }, []);

  return (
    <div className="w-100 px-3 d-flex align-itmes-center justify-content-start">
      <div className="table-responsive mt-1">
        <div className="table-wrapper p-3 mw-100">
          <div className="table-title">
            <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
              <div className="text-right">
                <h2>
                  ادارة <b>تعاملات الموردين</b>
                </h2>
              </div>
              <div className="col-12 col-md-6 p-0 m-0 d-flex flex-wrap aliegn-items-center justify-content-end print-hide">
                <a
                  href="#addSupplierTransactionModal"
                  className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-success"
                  data-toggle="modal"
                >
                  {" "}
                  <span>اضافه معاملة جديدة</span>
                </a>

                {/* <a href="#deleteSupplierTransactionModal" className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-danger" data-toggle="modal"> <span>حذف</span></a> */}
              </div>
            </div>
          </div>

          <div className="table-filter print-hide">
            <div className="col-12 text-dark d-flex flex-wrap align-items-center justify-content-start p-0 m-0">
              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
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
                <label
                  className="form-label text-wrap text-right fw-bolder p-0 m-0"
                  htmlFor="supplierSelect"
                >
                  المورد
                </label>
                <select
                  className="form-control border-primary m-0 p-2 h-auto"
                  id="supplierSelect"
                  onChange={(e) => handleSupplier(e.target.value)}
                >
                  <option>كل الموردين</option>
                  {AllSuppliers.map((supplier, i) => (
                    <option value={supplier._id} key={i}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label
                  className="form-label text-wrap text-right fw-bolder p-0 m-0"
                  htmlFor="transactionTypeSelect"
                >
                  نوع العملية
                </label>
                <select
                  className="form-control border-primary m-0 p-2 h-auto"
                  id="transactionTypeSelect"
                  onChange={(e) =>
                    filterSupplierTransactionByTransactionType(e.target.value)
                  }
                >
                  <option>جميع العمليات</option>
                  {listtransactionType.map((type, i) => (
                    <option value={type} key={i}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label
                  className="form-label text-wrap text-right fw-bolder p-0 m-0"
                  htmlFor="invoiceNumberSelect"
                >
                  رقم الفاتورة
                </label>
                <select
                  className="form-control border-primary m-0 p-2 h-auto"
                  id="invoiceNumberSelect"
                  onChange={(e) =>
                    filterSupplierTransactionByInvoiceNumber(e.target.value)
                  }
                >
                  <option>اختر رقم الفاتورة</option>
                  {allPurchaseInvoiceFilterd.length > 0
                    ? allPurchaseInvoiceFilterd.map((Invoice, i) => (
                        <option value={Invoice._id} key={i}>
                          {Invoice.invoiceNumber}
                        </option>
                      ))
                    : allPurchaseInvoice.map((Invoice, i) => (
                        <option value={Invoice._id} key={i}>
                          {Invoice.invoiceNumber}
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
                      setAllSupplierTransaction(
                        filterByTime(e.target.value, AllSupplierTransaction)
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
                        setAllSupplierTransaction(
                          filterByDateRange(AllSupplierTransaction)
                        )
                      }
                    >
                      <i className="fa fa-search"></i>
                    </button>
                    <button
                      type="button"
                      className="btn btn-warning h-100 p-2"
                      onClick={getAllSupplierTransaction}
                    >
                      استعادة
                    </button>
                  </div>
                </div>
              </div>

              <div className="col-12 text-dark d-flex flex-wrap align-items-center justify-content-start p-0 m-0 mt-3">
                <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                  <label
                    htmlFor="totalPurchasesInput"
                    className="form-label text-wrap text-right fw-bolder p-0 m-0"
                  >
                    اجمالي المشتريات
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    id="totalPurchasesInput"
                    readOnly
                    value={totalPurchases}
                  />
                </div>
                <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                  <label
                    htmlFor="totalPaymentInput"
                    className="form-label text-wrap text-right fw-bolder p-0 m-0"
                  >
                    اجمالي المدفوع
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    id="totalPaymentInput"
                    readOnly
                    value={totalPayment}
                  />
                </div>
                <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                  <label
                    htmlFor="totalBalanceDueInput"
                    className="form-label text-wrap text-right fw-bolder p-0 m-0"
                  >
                    اجمالي المستحق
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    id="totalBalanceDueInput"
                    readOnly
                    value={totalBalanceDue}
                  />
                </div>
                <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                  <label
                    htmlFor="previousBalanceInput"
                    className="form-label text-wrap text-right fw-bolder p-0 m-0"
                  >
                    الرصيد الكلي
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    id="previousBalanceInput"
                    readOnly
                    value={previousBalance}
                  />
                </div>
              </div>
            </div>
          </div>

          <table className="table table-striped table-hover">
            <thead>
              <tr>
                <th>م</th>
                <th>التاريخ</th>
                <th>المورد</th>
                <th>الفاتورة</th>
                <th>نوع العملية</th>
                <th>المبلغ</th>
                <th>الرصيد السابق</th>
                <th>الرصيد الحالي</th>
                <th>طريقه الدفع</th>
                <th>بواسطه</th>
                <th>تاريخ التسجيل</th>
                {/* <th>اجراءات</th> */}
              </tr>
            </thead>
            <tbody>
              {AllSupplierTransaction &&
                AllSupplierTransaction.map((Transaction, i) => {
                  if ((i >= startPagination) & (i < endPagination)) {
                    return (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{formatDate(Transaction.transactionDate)}</td>
                        <td>{Transaction.supplier?.name}</td>
                        <td>{Transaction.invoiceNumber?.invoiceNumber}</td>
                        <td>{Transaction.transactionType}</td>
                        <td>{Transaction.amount}</td>
                        <td>{Transaction.previousBalance}</td>
                        <td>{Transaction.currentBalance}</td>
                        <td>{Transaction.paymentMethod}</td>
                        <td>{Transaction.recordedBy?.fullname}</td>
                        <td>
                          {Transaction.createdAt &&
                            formatDateTime(Transaction.createdAt)}
                        </td>
                        <td>
                          {/* <a href="#editSupplierTransactionModal" className="btn btn-sm btn-primary ml-2 " data-toggle="modal" onClick={() => { setStockItemid(item._id); setcategoryId(item.categoryId); setitemName(item.itemName); setBalance(item.Balance); setlargeUnit(item.storageUnit); setsmallUnit(item.ingredientUnit); setprice(item.price); setparts(item.parts); setcostPerPart(item.costPerPart); setminThreshold(item.minThreshold); settotalCost(item.totalCost) }}><i className="material-icons" data-toggle="tooltip" title="Edit">&#xE254;</i></a>
                                <a href="#deleteSupplierTransactionModal" className="btn btn-sm btn-danger" data-toggle="modal" onClick={() => setStockItemid(item._id)}><i className="material-icons" data-toggle="tooltip" title="Delete">&#xE872;</i></a> */}
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
                {AllSupplierTransaction.length > endPagination
                  ? endPagination
                  : AllSupplierTransaction.length}
              </b>{" "}
              من <b>{AllSupplierTransaction.length}</b> عنصر
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

      <div id="addSupplierTransactionModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={handleAddSupplierTransaction}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">اضافه تعامل جديد</h4>
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
                    تاريخ العملية
                  </label>
                  <input
                    type="date"
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    المورد
                  </label>
                  <select
                    required
                    className="form-control border-primary m-0 p-2 h-auto"
                    id="supplierSelect"
                    onChange={(e) => handleSupplier(e.target.value)}
                  >
                    <option>اختر المورد</option>
                    {AllSuppliers.map((supplier, i) => (
                      <option value={supplier._id} key={i}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    نوع العملية
                  </label>
                  <select
                    required
                    className="form-control border-primary m-0 p-2 h-auto"
                    id="supplierSelect"
                    onChange={(e) => setTransactionType(e.target.value)}
                  >
                    <option>اختر نوع العملية</option>
                    {listtransactionType.map((type, i) => (
                      <option value={type} key={i}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    رقم الفاتورة
                  </label>
                  <select
                    required
                    className="form-control border-primary m-0 p-2 h-auto"
                    id="supplierSelect"
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                  >
                    <option>اختر رقم الفاتورة</option>
                    {allPurchaseInvoiceFilterd.map((Invoice, i) => (
                      <option value={Invoice._id} key={i}>
                        {Invoice.invoiceNumber}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    المبلغ
                  </label>
                  <input
                    type="number"
                    className="form-control border-primary m-0 p-2 h-auto"
                    defaultValue={amount}
                    onChange={(e) => handlecurrentBalance(e.target.value)}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الرصيد السابق
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={previousBalance}
                    readOnly
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الرصيد الحالي
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={currentBalance}
                    readOnly
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    طريقة الدفع
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    defaultValue={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    ملاحظات
                  </label>
                  <input
                    type="text"
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

      {/* <div id="editSupplierTransactionModal" className="modal fade">
                <div className="modal-dialog modal-lg">
                  <div className="modal-content shadow-lg border-0 rounded ">
                    <form onSubmit={(e) => editStockItem(e, employeeLoginInfo.id)}>
                      <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                        <h4 className="modal-title">تعديل صنف بالمخزن</h4>
                        <button type="button" className="close m-0 p-1" data-dismiss="modal" aria-hidden="true">&times;</button>
                      </div>
                      <div className="modal-body d-flex flex-wrap align-items-center p-3 text-right">
                        <div className="form-group col-12 col-md-6">
                          <label className="form-label text-wrap text-right fw-bolder p-0 m-0">اسم الصنف</label>
                          <input type="text" className="form-control border-primary m-0 p-2 h-auto" defaultValue={itemName} required onChange={(e) => setitemName(e.target.value)} />
                        </div>
                        <div className="form-group col-12 col-md-6">
                          <label className="form-label text-wrap text-right fw-bolder p-0 m-0">نوع المخزن</label>
                          <select className="form-control border-primary m-0 p-2 h-auto"  name="category" id="category" defaultValue={categoryId} form="carform" onChange={(e) => setcategoryId(e.target.value)}>
                            <option>{AllCategoryStock.length>0?AllCategoryStock.filter(c=>c._id === categoryId)[0].name:''}</option>
                            <option value={categoryId}>{categoryId !== "" ? AllCategoryStock.filter(c => c._id === categoryId)[0].name : ''}</option>
                            {AllCategoryStock.map((category, i) => {
                              return <option value={category._id} key={i} >{category.name}</option>
                            })
                            }
                          </select>
                        </div>

                        <div className="form-group col-12 col-md-6">
                          <label className="form-label text-wrap text-right fw-bolder p-0 m-0">الوحدة الكبيرة</label>
                          <input type='text' className="form-control border-primary m-0 p-2 h-auto" defaultValue={storageUnit} required onChange={(e) => setlargeUnit(e.target.value)}></input>
                        </div>
                        <div className="form-group col-12 col-md-6">
                          <label className="form-label text-wrap text-right fw-bolder p-0 m-0">الوحدة الصغيره</label>
                          <input type='text' className="form-control border-primary m-0 p-2 h-auto" defaultValue={ingredientUnit} required onChange={(e) => setsmallUnit(e.target.value)}></input>
                        </div>
                        <div className="form-group col-12 col-md-6">
                          <label className="form-label text-wrap text-right fw-bolder p-0 m-0">رصيد افتتاحي</label>
                          <input type='Number' className="form-control border-primary m-0 p-2 h-auto" defaultValue={Balance} required onChange={(e) => setBalance(e.target.value)} />
                        </div>
                        <div className="form-group col-12 col-md-6">
                          <label className="form-label text-wrap text-right fw-bolder p-0 m-0">الحد الادني</label>
                          <input type='number' className="form-control border-primary m-0 p-2 h-auto" required defaultValue={minThreshold} onChange={(e) => { setminThreshold(e.target.value); }} />
                        </div>

                        <div className="form-group col-12 col-md-6">
                          <label className="form-label text-wrap text-right fw-bolder p-0 m-0">السعر</label>
                          <input type='Number' className="form-control border-primary m-0 p-2 h-auto" defaultValue={price} required onChange={(e) => { setprice(e.target.value); settotalCost(e.target.value * Balance) }} />
                        </div>
                        <div className="form-group col-12 col-md-6">
                          <label className="form-label text-wrap text-right fw-bolder p-0 m-0">التكلفة</label>
                          <input type='text' className="form-control border-primary m-0 p-2 h-auto" required defaultValue={totalCost} readOnly />
                        </div>
                        <div className="form-group col-12 col-md-6">
                          <label className="form-label text-wrap text-right fw-bolder p-0 m-0">عدد الوحدات</label>
                          <input type='Number' className="form-control border-primary m-0 p-2 h-auto" defaultValue={parts} required onChange={(e) => { setparts(e.target.value); setcostPerPart(price / e.target.value) }} />
                        </div>
                        <div className="form-group col-12 col-md-6">
                          <label className="form-label text-wrap text-right fw-bolder p-0 m-0">تكلفة الوحده</label>
                          <input type='Number' className="form-control border-primary m-0 p-2 h-auto" required defaultValue={costPerPart} readOnly />
                        </div>
                        <div className="form-group col-12 col-md-6">
                          <label className="form-label text-wrap text-right fw-bolder p-0 m-0">التاريخ</label>
                          <input type='text' className="form-control border-primary m-0 p-2 h-auto" defaultValue={new Date().toLocaleDateString()} required readOnly />
                        </div>
                      </div>
                      <div className="modal-footer d-flex flex-nowrap align-items-center justify-content-between m-0 p-1">
                        <input type="submit" className="btn btn-success col-6 h-100 px-2 py-3 m-0" value="حفظ" />
                        <input type="button" className="btn btn-danger col-6 h-100 px-2 py-3 m-0" data-dismiss="modal" value="إغلاق" />
                      </div>
                    </form>
                  </div>
                </div>
              </div> */}

      {/* <div id="deleteSupplierTransactionModal" className="modal fade">
                <div className="modal-dialog modal-lg">
                  <div className="modal-content shadow-lg border-0 rounded ">
                    <form onSubmit={deleteStockItem}>
                      <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                        <h4 className="modal-title">حذف منتج</h4>
                        <button type="button" className="close m-0 p-1" data-dismiss="modal" aria-hidden="true">&times;</button>
                      </div>
                      <div className="modal-body d-flex flex-wrap align-items-center p-3 text-right">
                        <p className="text-dark f-3">هل انت متاكد من حذف هذا السجل؟</p>
                        <p className="text-warning text-center mt-3"><small>لا يمكن الرجوع في هذا الاجراء.</small></p>
                      </div>
                      <div className="modal-footer d-flex flex-nowrap align-items-center justify-content-between m-0 p-1">
                        <input type="submit" className="btn btn-warning col-6 h-100 px-2 py-3 m-0" value="حذف" />
                        <input type="button" className="btn btn-danger col-6 h-100 px-2 py-3 m-0" data-dismiss="modal" value="إغلاق" />
                      </div>
                    </form>
                  </div>
                </div>
              </div> */}
    </div>
  );
};

export default SupplierTransaction;
