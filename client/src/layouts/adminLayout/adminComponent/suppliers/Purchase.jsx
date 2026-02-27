import React, { useState, useEffect, useRef, useContext } from "react";
import axios from "axios";
import { useReactToPrint } from "react-to-print";
import { dataContext } from "../../../../context/appContext";
import { toast } from "react-toastify";
import "../orders/Orders.css";

const Purchase = () => {
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

  const purchasePermission = permissionsList?.filter(
    (permission) => permission.resource === "Purchases"
  )[0];

  const [AllSuppliers, setAllSuppliers] = useState([]);
  // Function to retrieve all suppliers
  const getAllSuppliers = async () => {
    const config = await handleGetTokenAndConfig();
    try {
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

  const [AllCashRegisters, setAllCashRegisters] = useState([]);
  // Fetch all cash registers
  const getAllCashRegisters = async () => {
    const config = await handleGetTokenAndConfig();
    try {
      const response = await axios.get(apiUrl + "/api/cashregister", config);
      setAllCashRegisters(response.data.reverse());
    } catch (err) {
      toast.error("Error fetching cash registers");
    }
  };

  const [StockItems, setStockItems] = useState([]);
  const getAllStockItems = async () => {
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

  const [storeId, setstoreId] = useState(0);

  const createStockAction = async (item) => {
    try {
      const config = await handleGetTokenAndConfig();
      const { itemId, quantity, expirationDate } = item;

      if (!storeId || !itemId || !quantity) {
        toast.error("برجاء اختيار المخزن والصنف وتحديد الكمية");
        return;
      }

      const salesTaxDiscount = Number(salesTax) - Number(discount);
      const addcost = (item.cost / totalAmount) * salesTaxDiscount;
      const totalCost = item.cost + addcost;
      const unitCost = Number(item.price) + addcost / quantity;

      const stockItem = StockItems.find((i) => i._id === itemId);
      if (!stockItem) {
        toast.error("الصنف غير موجود في المخزون");
        return;
      }

      const { storageUnit: unit, categoryId, costMethod } = stockItem;

      const { data: allStockMovementsByStore = [] } = await axios.get(
        `${apiUrl}/api/stockmovement/allmovementstore/${storeId}`,
        config
      );

      const lastStockMovementByItem = allStockMovementsByStore
        .filter((movement) => movement.itemId?._id === itemId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || {
        balance: { quantity: 0, totalCost: 0, unitCost: 0 },
      };

      const inbound = {
        quantity: Number(quantity),
        unitCost: Number(unitCost),
        totalCost: Number(totalCost),
      };

      const balance = {
        quantity: lastStockMovementByItem.balance.quantity + Number(quantity),
        totalCost:
          lastStockMovementByItem.balance.totalCost + Number(totalCost),
        unitCost:
          (lastStockMovementByItem.balance.totalCost + Number(totalCost)) /
          (lastStockMovementByItem.balance.quantity + Number(quantity)),
      };

      // إنشاء حركة المخزون الجديدة
      const response = await axios.post(
        `${apiUrl}/api/stockmovement/`,
        {
          itemId,
          storeId,
          categoryId,
          costMethod,
          source: "Purchase",
          unit,
          inbound,
          balance,
          remainingQuantity: quantity,
          sourceDate: invoiceDate,
          description: notes, // Changed notes to description
          expirationDate,
          sender: supplierId, // Added sender
          receiver: employeeLoginInfo.id, // Added receiver
        },
        config
      );

      getAllStockItems();
      toast.success("تم تسجيل حركة المخزن بنجاح");
    } catch (error) {
      console.error("خطأ في تسجيل حركة المخزن:", error);
      toast.error("فشل تسجيل حركة المخزن! حاول مرة أخرى");
    }
  };

  const [previousBalance, setPreviousBalance] = useState(0);

  const handleAddSupplierTransactionPurchase = async (invoiceNumber) => {
    const config = await handleGetTokenAndConfig();
    try {
      let newCurrentBalance = 0;
      const transactionType = "Purchase";
      const amount = netAmount;
      const transactionDate = invoiceDate;
      const currentBalance = previousBalance + amount;
      const requestData = {
        invoiceNumber,
        transactionDate,
        transactionType,
        amount,
        previousBalance,
        currentBalance,
        paymentMethod,
        sender: supplierId,
        receiver: employeeLoginInfo.id,
        notes,
      };

      const response = await axios.post(
        `${apiUrl}/api/suppliertransaction`,
        requestData,
        config
      );

      if (response.status === 201) {
        const supplierresponse = await axios.put(
          `${apiUrl}/api/supplier/${supplierId}`,
          { currentBalance },
          config
        );

        newCurrentBalance = Number(
          supplierresponse.data.updatedSupplier.currentBalance
        );

        toast.success("تم انشاء العملية بنجاح");
      } else {
        toast.error("حدث خطأ أثناء انشاء العملية");
      }

      if (paidAmount > 0) {
        const transactionType = "Payment";
        const amount = paidAmount;
        const transactionDate = invoiceDate;
        const previousBalance = newCurrentBalance;
        const currentBalance = previousBalance - paidAmount;
        const requestData = {
          invoiceNumber,
          supplier: supplierId,
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
          const supplierresponse = await axios.put(
            `${apiUrl}/api/supplier/${supplierId}`,
            { currentBalance },
            config
          );

          toast.success("تم انشاء العملية بنجاح");
        } else {
          toast.error("حدث خطأ أثناء انشاء العملية");
        }
      }
    } catch (error) {
      toast.error("حدث خطأ أثناء انشاء العملية");
    }
  };

  const [items, setItems] = useState([
    {
      itemId: "",
      quantity: 0,
      storageUnit: "",
      price: 0,
      cost: 0,
      expirationDate: "",
    },
  ]);

  const handleNewItem = () => {
    setItems([
      ...items,
      {
        itemId: "",
        quantity: 0,
        price: 0,
        storageUnit: "",
        cost: 0,
        expirationDate: "",
      },
    ]);
  };

  const handleDeleteItem = (index) => {
    const updatedItems = [...items];
    updatedItems.splice(index, 1);
    setItems(updatedItems);
    clacTotalAmount();
  };

  const handleItemId = (id, index) => {
    const stockitem = StockItems.filter((item) => item._id === id)[0];
    const updatedItems = [...items];
    updatedItems[index].itemId = stockitem._id;
    updatedItems[index].storageUnit = stockitem.storageUnit;

    setItems(updatedItems);
  };

  const handleQuantity = (quantity, index) => {
    const updatedItems = [...items];
    updatedItems[index].quantity = Number(quantity);
    updatedItems[index].cost =
      Number(quantity) * Number(updatedItems[index].price);

    setItems(updatedItems);
    clacTotalAmount();
  };

  const handlePrice = (price, index) => {
    const updatedItems = [...items];
    updatedItems[index].price = Number(price);
    updatedItems[index].cost =
      Number(updatedItems[index].quantity) * Number(price);

    setItems(updatedItems);
    clacTotalAmount();
  };

  const handleExpirationDate = (date, index) => {
    const updatedItems = [...items];
    updatedItems[index].expirationDate = new Date(date);

    setItems(updatedItems);
  };
  const [totalAmount, setTotalAmount] = useState(0);
  const clacTotalAmount = () => {
    let total = 0;
    items.forEach((item) => {
      total += item.cost;
    });
    setTotalAmount(total);
  };

  const [additionalCost, setAdditionalCost] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [salesTax, setSalesTax] = useState(0);
  const [netAmount, setNetAmount] = useState(0);

  const calcNetAmount = () => {
    let total = Number(totalAmount) + Number(salesTax) - Number(discount);
    setNetAmount(total);
    setBalanceDue(total);
  };

  useEffect(() => {
    calcNetAmount();
  }, [items, additionalCost, discount, salesTax]);

  const [supplierId, setSupplierId] = useState("");
  const [financialInfo, setFinancialInfo] = useState("");
  const [supplierInfo, setSupplierInfo] = useState("");
  const [itemsSupplied, setItemsSupplied] = useState([]);

  const handleSupplier = (id) => {
    setSupplierId(id);
    const findSupplier = AllSuppliers.filter(
      (supplier) => supplier._id === id
    )[0];
    setSupplierInfo(findSupplier);
    setFinancialInfo(findSupplier.financialInfo);
    setPreviousBalance(findSupplier.currentBalance);
    setItemsSupplied(findSupplier.itemsSupplied);
  };

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setinvoiceDate] = useState(new Date());

  const [paidAmount, setPaidAmount] = useState(0);
  const [balanceDue, setBalanceDue] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [paymentType, setpaymentType] = useState("credit");

  const handlePaidAmount = (amount) => {
    setPaidAmount(amount);
    setBalanceDue(Number(netAmount) - Number(amount));
    if (amount === 0) {
      setPaymentStatus("unpaid");
      setpaymentType("credit");
    } else if (amount === netAmount) {
      setPaymentStatus("paid");
      setpaymentType("cash");
    } else if (amount < netAmount) {
      setPaymentStatus("partially_paid");
      setpaymentType("credit");
    }
  };

  const [listCashRegister, setlistCashRegister] = useState([]);
  const [cashRegister, setCashRegister] = useState();
  const [CashRegisterBalance, setCashRegisterBalance] = useState(0);
  const handleCashRegister = (id) => {
    //
    const filterCashRegister = AllCashRegisters.filter(
      (CashRegister) => CashRegister.employee._id === id
    );
    //
    setlistCashRegister(filterCashRegister);
  };

  const selectCashRegister = (id) => {
    const cashRegisterSelected = listCashRegister.find(
      (register) => register._id === id
    );
    setCashRegister(id);
    setCashRegisterBalance(cashRegisterSelected.balance);
  };

  const [paymentMethod, setPaymentMethod] = useState("");
  const handlePaymentMethod = (Method, employeeId) => {
    //
    setPaymentMethod(Method);
    handleCashRegister(employeeId);
  };

  const [paymentDueDate, setPaymentDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const createPurchaseInvoice = async (e, receiverId) => {
    e.preventDefault();
    const config = await handleGetTokenAndConfig();
    if (
      purchasePermission &&
      purchasePermission &&
      !purchasePermission &&
      purchasePermission.create
    ) {
      toast.warn("ليس لك صلاحية لانشاء فاتورة مشتريات");
      return;
    }
    try {
      if (paidAmount > 0 && !isConfirmedaPaiment) {
        toast.warn(
          "لم يتم خصم المبلغ المدفوع ! قم  بتاكيد الخصم ثم حاول مره اخري"
        );
        return;
      }
      if (
        !invoiceNumber ||
        !invoiceDate ||
        !supplierId ||
        !items ||
        !totalAmount ||
        !netAmount ||
        !paymentStatus
      ) {
        toast.warn("بعض البيانات لم يتم ادخالها");
        return;
      }
      const newInvoice = {
        invoiceNumber,
        invoiceDate,
        supplier: supplierId,
        items,
        totalAmount,
        discount,
        salesTax,
        netAmount,
        additionalCost,
        paidAmount,
        balanceDue,
        paymentDueDate,
        cashRegister,
        paymentStatus,
        paymentType,
        paymentMethod,
        notes,
      };

      const response = await axios.post(
        `${apiUrl}/api/purchaseinvoice`,
        newInvoice,
        config
      );

      if (response.status === 201 && storeId) {
        items.forEach((item) => {
          createStockAction(item);
        });
        if (paidAmount > 0) {
          await handleAddSupplierTransactionPurchase(invoiceNumber);
        }
        getAllPurchases();
        toast.success("تم اضافه المشتريات بنجاح");
      } else {
        toast.error("فشل اضافه المشتريات ! حاول مره اخري");
      }
    } catch (error) {
      toast.error("حدث خطأ اثناء اضافه المشتريات ! حاول مره اخري");
    }
  };

  const [invoice, setinvoice] = useState({});

  const getInvoice = async (id) => {
    if (
      purchasePermission &&
      purchasePermission &&
      !purchasePermission &&
      purchasePermission.read
    ) {
      toast.warn("ليس لك صلاحية لعرض فاتورة مشتريات");
      return;
    }
    const config = await handleGetTokenAndConfig();
    try {
      const resInvoice = await axios.get(
        `${apiUrl}/api/purchaseinvoice/${id}`,
        config
      );

      if (resInvoice) {
        setinvoice(resInvoice.data);
      }
    } catch (error) {
      toast.error(
        "حدث خطأ اثناء جلب الفاتوره ! اعد تحميل الصفحة و حاول مره اخري"
      );
    }
  };

  const [allPurchaseInvoice, setAllPurchaseInvoice] = useState([]);
  const getAllPurchases = async () => {
    if (
      purchasePermission &&
      purchasePermission &&
      !purchasePermission &&
      purchasePermission.read
    ) {
      toast.warn("ليس لك صلاحية لعرض فاتورة مشتريات");
      return;
    }
    const config = await handleGetTokenAndConfig();
    try {
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

  const searchByIvoiceNumber = (invoiceNumber) => {
    if (!invoiceNumber) {
      getAllPurchases();
      return;
    }
    const invoices = allPurchaseInvoice.filter(
      (invoice) => invoice.invoiceNumber.startsWith(invoiceNumber) === true
    );
    setAllPurchaseInvoice(invoices);
  };

  const searchByPaymentType = (type) => {
    if (!type) {
      getAllPurchases();
      return;
    }
    const invoices = allPurchaseInvoice.filter(
      (invoice) => invoice.paymentType === type
    );
    setAllPurchaseInvoice(invoices);
  };

  const searchBySupplier = (supplier) => {
    if (!supplier) {
      getAllPurchases();
      return;
    }
    const invoices = allPurchaseInvoice.filter(
      (invoice) => invoice.supplier._id === supplier
    );
    setAllPurchaseInvoice(invoices);
  };

  const searchBypaymentStatus = (status) => {
    if (!status) {
      getAllPurchases();
      return;
    }
    const invoices = allPurchaseInvoice.filter(
      (invoice) => invoice.paymentStatus === status
    );
    setAllPurchaseInvoice(invoices);
  };

  const searchByCashRegister = (cashRegister) => {
    if (!cashRegister) {
      getAllPurchases();
      return;
    }
    const invoices = allPurchaseInvoice.filter(
      (invoice) => invoice.cashRegister_id === cashRegister
    );
    setAllPurchaseInvoice(invoices);
  };

  const [isConfirmedaPaiment, setisConfirmedaPaiment] = useState(false);

  const confirmPayment = async (e) => {
    e.preventDefault();
    const config = await handleGetTokenAndConfig();

    // Check if required variables are defined and valid
    if (
      !CashRegisterBalance ||
      !paidAmount ||
      !cashRegister ||
      !invoiceNumber
    ) {
      toast.error("برجاء التحقق من صحة المدخلات!");
      return;
    }
    if (CashRegisterBalance < paidAmount) {
      toast.error("رصيد الخزينه لا يكفي!");
      return;
    }

    const updatedbalance = CashRegisterBalance - paidAmount;

    try {
      // Perform the cash movement
      const cashMovementResponse = await axios.post(
        `${apiUrl}/api/cashMovement/`,
        {
          registerId: cashRegister,
          amount: paidAmount,
          type: "Payment",
          description: `دفع فاتورة مشتريات رقم ${invoiceNumber}`,
        },
        config
      );

      const cashMovement = cashMovementResponse.data.cashMovement;

      if (cashMovementResponse) {
        toast.success("تم تسجيل حركه الخزينه بنجاح");

        // Update the cash register balance
        const updateCashRegisterResponse = await axios.put(
          `${apiUrl}/api/cashRegister/${cashRegister}`,
          {
            balance: updatedbalance,
          },
          config
        );

        if (updateCashRegisterResponse) {
          toast.success("تم خصم المدفوع من الخزينة بنجاح");
          setisConfirmedaPaiment(true);
        } else {
          // If updating the cash register fails, roll back the cash movement
          await axios.delete(
            `${apiUrl}/api/cashMovement/${cashMovement._id}`,
            config
          );
          toast.error("فشل في تحديث رصيد الخزينة. تم إلغاء حركة الخزينة.");
        }
      } else {
        toast.error("حدث خطأ أثناء تسجيل حركة الخزينة. حاول مرة أخرى.");
      }
    } catch (error) {
      toast.error("فشل في تسجيل المصروف! حاول مرة أخرى.");
    }
  };

  const printContainerPurchasesInvoice = useRef();
  const handlePrint = useReactToPrint({
    content: () => printContainerPurchasesInvoice.current,
    copyStyles: true,
    removeAfterPrint: true,
    bodyClass: "printpage",
  });

  const [allStores, setAllStores] = useState([]);

  const getAllStores = async () => {
    const config = await handleGetTokenAndConfig();

    try {
      const response = await axios.get(`${apiUrl}/api/store/`, config);
      // get all stores
      const stores = response.data;
      // get stores by storekeeper
      const storesByStoreKeeper = [];
      stores.map((store) => {
        store.storekeeper.map((storekeeper) => {
          if (storekeeper._id === employeeLoginInfo.id) {
            storesByStoreKeeper.push(store);
          }
        });
      });
      setAllStores(storesByStoreKeeper);
    } catch (error) {
      console.error("Error fetching stores:", error);
      toast.error("حدث خطأ اثناء جلب بيانات المخزنات! اعد تحميل الصفحة");
    }
  };

  useEffect(() => {
    getAllPurchases();
    getAllStockItems();
    getAllCashRegisters();
    getAllSuppliers();
    getAllStores();
  }, []);

  return (
    <div className="w-100 px-3 d-flex align-itmes-center justify-content-start">
      <div className="table-responsive">
        <div className="table-wrapper p-3 mw-100">
          <div className="table-title">
            <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
              <div className="text-right">
                <h2>
                  ادارة <b>المشتريات</b>
                </h2>
              </div>
              <div className="col-12 col-md-6 p-0 m-0 d-flex flex-wrap aliegn-items-center justify-content-end print-hide">
                {purchasePermission && purchasePermission.create && (
                  <a
                    href="#addPurchaseInvoiceModal"
                    className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-success"
                    data-toggle="modal"
                  >
                    <span className=" text-wrap text-right fw-bolder p-0 m-0">
                      اضافه فاتورة جديدة
                    </span>
                  </a>
                )}

                {/* <a href="#deleteStockActionModal" className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-danger" data-toggle="modal"> <label className=" text-wrap text-right fw-bolder p-0 m-0">حذف</label></a> */}
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
                  رقم الفاتوره
                </label>
                <input
                  type="text"
                  className="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => searchByIvoiceNumber(e.target.value)}
                />
              </div>
              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  طريقه السداد
                </label>
                <select
                  className="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => searchByPaymentType(e.target.value)}
                >
                  <option value={""}>الكل</option>
                  <option value="cash">كاش</option>;
                  <option value="credit">تقسيط</option>;
                </select>
              </div>
              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  حاله السداد
                </label>
                <select
                  className="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => searchBypaymentStatus(e.target.value)}
                >
                  <option value={""}>الكل</option>
                  <option value="unpaid">لم يتم السداد</option>;
                  <option value="partially_paid">سداد جزء</option>;
                  <option value="paid">سداد كامل</option>;
                </select>
              </div>
              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  المورد
                </label>
                <select
                  className="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => searchBySupplier(e.target.value)}
                >
                  <option value={""}>الكل</option>
                  {AllSuppliers.map((supplier) => {
                    return (
                      <option value={supplier._id}>{supplier.name}</option>
                    );
                  })}
                </select>
              </div>
              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  خزينه الدفع
                </label>
                <select
                  className="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => searchByCashRegister(e.target.value)}
                >
                  <option value={""}>الكل</option>
                  {AllCashRegisters.map((cashRegister) => {
                    return (
                      <option value={cashRegister._id}>
                        {cashRegister.name}
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
                      setAllPurchaseInvoice(
                        filterByTime(e.target.value, allPurchaseInvoice)
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
                        setAllPurchaseInvoice(
                          filterByDateRange(allPurchaseInvoice)
                        )
                      }
                    >
                      <i className="fa fa-search"></i>
                    </button>
                    <button
                      type="button"
                      className="btn btn-warning h-100 p-2"
                      onClick={getAllPurchases}
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
                <th>التاريخ</th>
                <th>الفاتوره</th>
                <th>المورد</th>
                <th>الاجمالي</th>
                <th>الخصم</th>
                <th>الضريبه</th>
                <th>اضافية</th>
                <th>الاجمالي</th>
                <th>نوع الفاتورة</th>
                <th>دفع</th>
                <th>باقي</th>
                <th>تاريخ الاستحقاق</th>
                <th>طريقه الدفع</th>
                <th>الحالة</th>
                <th>الخزينه</th>
                <th>تم بواسطه</th>
                <th>تسجيل في</th>
                <th>ملاحظات</th>
                <th>اجراءات</th>
              </tr>
            </thead>
            <tbody>
              {allPurchaseInvoice.length > 0 &&
                allPurchaseInvoice.map((invoice, i) => {
                  if ((i >= startPagination) & (i < endPagination)) {
                    return (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>
                          {invoice.invoiceDate &&
                            formatDate(invoice.invoiceDate)}
                        </td>
                        <td>{invoice.invoiceNumber}</td>
                        <td>{invoice.supplier?.name}</td>
                        <td>{invoice.totalAmount}</td>
                        <td>{invoice.discount}</td>
                        <td>{invoice.salesTax}</td>
                        <td>{invoice.additionalCost}</td>
                        <td>{invoice.netAmount}</td>
                        <td>{invoice.paymentType}</td>
                        <td>{invoice.paidAmount}</td>
                        <td>{invoice.balanceDue}</td>
                        <td>
                          {invoice.paymentDueDate &&
                            formatDate(invoice.paymentDueDate)}
                        </td>
                        <td>{invoice.paymentMethod}</td>
                        <td>{invoice.paymentStatus}</td>
                        <td>{invoice.cashRegister?.name}</td>
                        <td>{invoice.createdBy?.fullname}</td>
                        <td>
                          {invoice.createdAt &&
                            formatDateTime(invoice.createdAt)}
                        </td>
                        <td>{invoice.notes}</td>
                        <td>
                          {purchasePermission && purchasePermission.read && (
                            <button
                              data-target="viewPurchaseModal"
                              className="btn btn-sm btn-primary"
                              data-toggle="modal"
                              onClick={() => {
                                getInvoice(invoice._id);
                              }}
                            >
                              <i
                                className="material-icons text-succes fs-2"
                                data-toggle="tooltip"
                                title="مشاهدة المشتريات"
                              >
                                &#xE417;
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
                {allPurchaseInvoice.length > endPagination
                  ? endPagination
                  : allPurchaseInvoice.length}
              </b>{" "}
              من <b>{allPurchaseInvoice.length}</b> عنصر
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

      <div id="addPurchaseInvoiceModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form
              onSubmit={(e) => createPurchaseInvoice(e, employeeLoginInfo.id)}
            >
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">اضافه فاتورة مشتريات</h4>
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
                <div className="card">
                  <div className="card-header text-center text-dark">
                    <h4>ادخل بيانات فاتورة الشراء</h4>
                  </div>

                  <div className="card-body min-content">
                    <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
                      <div className="col-6">
                        <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                          <span
                            className="input-group-text"
                            htmlFor="supplierSelect"
                          >
                            المورد
                          </span>
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
                        <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                          <span
                            className="input-group-text"
                            htmlFor="notesInput"
                          >
                            الرصيد
                          </span>
                          <input
                            type="text"
                            className="form-control border-primary m-0 p-2 h-auto"
                            id="notesInput"
                            readOnly
                            value={supplierInfo.currentBalance}
                          />
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                          <span
                            className="input-group-text"
                            htmlFor="invoiceNumberInput"
                          >
                            رقم الفاتورة
                          </span>
                          <input
                            type="text"
                            className="form-control border-primary m-0 p-2 h-auto"
                            required
                            id="invoiceNumberInput"
                            placeholder="رقم الفاتورة"
                            onChange={(e) => setInvoiceNumber(e.target.value)}
                          />
                        </div>
                        <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                          <span
                            className="input-group-text"
                            htmlFor="invoiceDateInput"
                          >
                            تاريخ الفاتورة
                          </span>
                          <input
                            type="date"
                            className="form-control border-primary m-0 p-2 h-auto"
                            required
                            id="invoiceDateInput"
                            placeholder="تاريخ الفاتور"
                            onChange={(e) => setinvoiceDate(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <table className="table table-bordered table-striped table-hover">
                      <thead className="table-success">
                        <tr>
                          <th scope="col">#</th>
                          <th scope="col" className="col-4">
                            الصنف
                          </th>
                          <th scope="col" className="col-2">
                            الكمية
                          </th>
                          <th scope="col" className="col-2">
                            الوحده
                          </th>
                          <th scope="col" className="col-2">
                            السعر
                          </th>
                          <th scope="col" className="col-2">
                            الثمن
                          </th>
                          <th scope="col" className="col-2">
                            انتهاء
                          </th>
                          <th scope="col" className="col-4 NoPrint">
                            <button
                              type="button"
                              className="h-100 btn btn-sm btn-success"
                              onClick={handleNewItem}
                            >
                              +
                            </button>
                          </th>
                        </tr>
                      </thead>
                      <tbody id="TBody">
                        {items.map((item, i) => (
                          <tr id="TRow" key={i}>
                            <th scope="w-100 d-flex flex-wrap align-items-center justify-content-between">
                              {i + 1}
                            </th>
                            <td>
                              <select
                                className="form-control border-primary m-0 p-2 h-auto"
                                required
                                onChange={(e) =>
                                  handleItemId(e.target.value, i)
                                }
                              >
                                <option value="">
                                  {StockItems &&
                                    StockItems.filter(
                                      (stock) => stock._id === item.item
                                    )[0]?.name}
                                </option>
                                {itemsSupplied.map((stock, j) => (
                                  <option value={stock._id} key={j}>
                                    {stock.itemName}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <input
                                type="number"
                                required
                                className="form-control p-0 m-0"
                                name="qty"
                                onChange={(e) =>
                                  handleQuantity(e.target.value, i)
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                readOnly
                                value={item.storageUnit}
                                className="form-control p-0 m-0"
                                name="storageUnit"
                              />
                            </td>

                            <td>
                              <input
                                type="number"
                                className="form-control p-0 m-0"
                                name="price"
                                required
                                onChange={(e) => handlePrice(e.target.value, i)}
                              />
                            </td>

                            <td>
                              <input
                                type="text"
                                className="form-control p-0 m-0"
                                value={item.cost}
                                name="amt"
                                readOnly
                              />
                            </td>

                            <td>
                              <input
                                type="date"
                                className="form-control p-0 m-0"
                                name="Exp"
                                onChange={(e) =>
                                  handleExpirationDate(e.target.value, i)
                                }
                              />
                            </td>
                            <td className="NoPrint">
                              <button
                                type="button"
                                className="h-100 btn btn-sm btn-danger"
                                onClick={() => handleDeleteItem(i)}
                              >
                                X
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
                      <div className="col-6">
                        <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                          <span
                            className="input-group-text"
                            htmlFor="totalInput"
                          >
                            الإجمالي
                          </span>
                          <input
                            type="text"
                            className="form-control text-end"
                            value={totalAmount}
                            id="totalInput"
                            readOnly
                          />
                        </div>
                        <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                          <span className="input-group-text" htmlFor="gstInput">
                            ضريبة القيمة المضافة
                          </span>
                          <input
                            type="number"
                            className="form-control text-end"
                            id="gstInput"
                            onChange={(e) => setSalesTax(e.target.value)}
                          />
                        </div>
                        <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                          <span className="input-group-text" htmlFor="gstInput">
                            خصم
                          </span>
                          <input
                            type="number"
                            className="form-control text-end"
                            id="gstInput"
                            onChange={(e) => setDiscount(e.target.value)}
                          />
                        </div>
                        <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                          <span
                            className="input-group-text"
                            htmlFor="netAmountInput"
                          >
                            المبلغ الصافي
                          </span>
                          <input
                            type="text"
                            className="form-control text-end"
                            id="netAmountInput"
                            value={netAmount}
                            readOnly
                          />
                        </div>
                        <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                          <span className="input-group-text" htmlFor="gstInput">
                            المخزن
                          </span>
                          <select
                            className="form-control border-primary m-0 p-2 h-auto"
                            name="paymentMethod"
                            id="paymentMethod"
                            onChange={(e) => setstoreId(e.target.value)}
                          >
                            <option>اختر المخزن </option>
                            {allStores &&
                              allStores.map((store, i) => {
                                return (
                                  <option value={store._id}>
                                    {store.storeName}
                                  </option>
                                );
                              })}
                          </select>
                        </div>
                        <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                          <span
                            className="input-group-text"
                            htmlFor="notesInput"
                          >
                            الملاحظات
                          </span>
                          <textarea
                            className="form-control border-primary m-0 p-2 h-auto"
                            id="notesInput"
                            placeholder="الملاحظات"
                            onChange={(e) => setNotes(e.target.value)}
                            style={{ height: "auto" }}
                          />
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                          <span
                            className="input-group-text"
                            htmlFor="paidAmount"
                          >
                            مدفوع
                          </span>
                          <input
                            type="number"
                            className="form-control text-end"
                            defaultValue={paidAmount}
                            id="paidAmount"
                            onChange={(e) => handlePaidAmount(e.target.value)}
                          />
                        </div>

                        {paidAmount > 0 ? (
                          listCashRegister ? (
                            <>
                              <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                                <span
                                  className="input-group-text"
                                  htmlFor="gstInput"
                                >
                                  طريقه الدفع
                                </span>
                                <select
                                  className="form-control border-primary m-0 p-2 h-auto"
                                  name="paymentMethod"
                                  id="paymentMethod"
                                  onChange={(e) =>
                                    handlePaymentMethod(
                                      e.target.value,
                                      employeeLoginInfo.id
                                    )
                                  }
                                >
                                  <option>اختر طريقه الدفع</option>
                                  {financialInfo &&
                                    financialInfo.map((financialInfo, i) => {
                                      return (
                                        <option
                                          value={
                                            financialInfo.paymentMethodName
                                          }
                                        >{`${financialInfo.paymentMethodName} ${financialInfo.accountNumber}`}</option>
                                      );
                                    })}
                                </select>
                              </div>
                              <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                                <span
                                  className="input-group-text"
                                  htmlFor="CashRegister"
                                >
                                  اختر حساب الدفع
                                </span>
                                <select
                                  className="form-select border-primary col"
                                  id="CashRegister"
                                  required
                                  onChange={(e) =>
                                    selectCashRegister(e.target.value)
                                  }
                                >
                                  <option>اختر حساب الدفع</option>
                                  {listCashRegister.map((register) => (
                                    <option
                                      key={register._id}
                                      value={register._id}
                                    >
                                      {register.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              {cashRegister && (
                                <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-wrap">
                                  <span
                                    className="input-group-text"
                                    htmlFor="netAmountInput"
                                  >
                                    رصيد الخزينة
                                  </span>
                                  <input
                                    type="text"
                                    className="form-control text-end"
                                    id="netAmountInput"
                                    value={CashRegisterBalance}
                                    readOnly
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-success w-100 h-100 p-2"
                                    id="netAmountInput"
                                    onClick={confirmPayment}
                                  >
                                    تاكيد الدفع
                                  </button>
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="input-group-text">
                              ليس لك خزينة للدفع النقدي
                            </span>
                          )
                        ) : null}

                        <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                          <span
                            className="input-group-text"
                            htmlFor="balanceDue"
                          >
                            باقي المستحق
                          </span>
                          <input
                            type="text"
                            className="form-control text-end"
                            id="balanceDue"
                            value={balanceDue}
                            readOnly
                          />
                        </div>
                        <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                          <span className="input-group-text" htmlFor="gstInput">
                            تاريخ الاستحقاق
                          </span>
                          <input
                            type="date"
                            className="form-control text-end"
                            id="gstInput"
                            onChange={(e) => setPaymentDueDate(e.target.value)}
                          />
                        </div>
                        <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                          <span
                            className="input-group-text"
                            htmlFor="netAmountInput"
                          >
                            حالة الفاتورة
                          </span>
                          <input
                            type="text"
                            className="form-control text-end"
                            id="netAmountInput"
                            value={paymentStatus}
                            readOnly
                          />
                        </div>
                      </div>
                    </div>
                  </div>
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

      <div id="viewPurchaseModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
              <h4 className="modal-title">عرض فاتورة المشتريات</h4>
              <button
                type="button"
                className="close m-0 p-1"
                data-dismiss="modal"
                aria-hidden="true"
              >
                &times;
              </button>
            </div>
            <div
              className="modal-body container printpage"
              ref={printContainerPurchasesInvoice}
              style={{ direction: "rtl" }}
            >
              <div className="card">
                <div className="card-header text-center text-dark">
                  <h4>بيانات فاتورة الشراء</h4>
                </div>
                <div className="card-body min-content">
                  <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
                    <div className="col-6">
                      <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                        <span
                          className="input-group-text"
                          htmlFor="supplierSelect"
                        >
                          المورد
                        </span>
                        <input
                          type="text"
                          className="form-control border-primary col"
                          id="supplierSelect"
                          readOnly
                          value={invoice.supplier?.name}
                        />
                      </div>
                      <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                        <span className="input-group-text" htmlFor="createdBy">
                          تسجيل بواسطه
                        </span>
                        <input
                          type="text"
                          className="form-control border-primary col"
                          id="createdBy"
                          readOnly
                          value={invoice.createdBy?.fullname}
                        />
                      </div>
                      <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                        <span className="input-group-text" htmlFor="createdAt">
                          تاريخ التسجيل
                        </span>
                        <input
                          type="text"
                          className="form-control border-primary col"
                          id="createdAt"
                          readOnly
                          value={formatDateTime(invoice.createdAt)}
                        />
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                        <span
                          className="input-group-text"
                          htmlFor="invoiceNumberInput"
                        >
                          رقم الفاتورة
                        </span>
                        <input
                          type="text"
                          className="form-control border-primary col"
                          required
                          id="invoiceNumberInput"
                          value={invoice.invoiceNumber}
                        />
                      </div>
                      <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                        <span
                          className="input-group-text"
                          htmlFor="invoiceDateInput"
                        >
                          تاريخ الفاتورة
                        </span>
                        <input
                          type="text"
                          className="form-control border-primary col"
                          required
                          id="invoiceDateInput"
                          value={formatDate(invoice.invoiceDate)}
                        />
                      </div>
                    </div>
                  </div>
                  <table className="table table-bordered table-striped table-hover">
                    <thead className="table-success">
                      <tr>
                        <th scope="col" className="col-1">
                          #
                        </th>
                        <th scope="col" className="col-3">
                          الصنف
                        </th>
                        <th scope="col" className="col-1">
                          الكمية
                        </th>
                        <th scope="col" className="col-1">
                          الوحده
                        </th>
                        <th scope="col" className="col-1">
                          السعر
                        </th>
                        <th scope="col" className="col-1">
                          الثمن
                        </th>
                        <th scope="col" className="col-2">
                          انتهاء
                        </th>
                      </tr>
                    </thead>
                    <tbody id="TBody">
                      {invoice.items &&
                        invoice.items.map((item, i) => (
                          <tr id="TRow" key={i}>
                            <th scope="w-100 d-flex flex-wrap align-items-center justify-content-between">
                              {i + 1}
                            </th>
                            <td>
                              <input
                                type="text"
                                className="form-control p-0 m-0"
                                name="itemName"
                                value={item.itemId.itemName}
                                readOnly
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                className="form-control p-0 m-0"
                                name="qty"
                                value={item.quantity}
                                readOnly
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                className="form-control p-0 m-0"
                                name="storageUnit"
                                value={item.storageUnit}
                                readOnly
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                className="form-control p-0 m-0"
                                name="price"
                                value={item.price}
                                readOnly
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                className="form-control p-0 m-0"
                                name="cost"
                                value={item.cost}
                                readOnly
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                className="form-control p-0 m-0"
                                name="expirationDate"
                                value={formatDate(item.expirationDate)}
                                readOnly
                              />
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
                    <div className="col-6">
                      <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                        <span className="input-group-text">الإجمالي</span>
                        <input
                          type="text"
                          className="form-control text-end"
                          value={invoice.totalAmount}
                          readOnly
                        />
                      </div>
                      <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                        <span className="input-group-text">
                          ضريبة القيمة المضافة
                        </span>
                        <input
                          type="text"
                          className="form-control text-end"
                          value={invoice.salesTax}
                          readOnly
                        />
                      </div>
                      <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                        <span className="input-group-text">خصم</span>
                        <input
                          type="text"
                          className="form-control text-end"
                          value={invoice.discount}
                          readOnly
                        />
                      </div>
                      <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                        <span className="input-group-text">المبلغ الصافي</span>
                        <input
                          type="text"
                          className="form-control text-end"
                          value={invoice.netAmount}
                          readOnly
                        />
                      </div>
                      <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                        <span className="input-group-text">
                          التكلفه الاضافيه
                        </span>
                        <input
                          type="text"
                          className="form-control text-end"
                          value={invoice.additionalCost}
                          readOnly
                        />
                      </div>
                      <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                        <span className="input-group-text">الملاحظات</span>
                        <input
                          type="text"
                          className="form-control text-end"
                          value={invoice.notes}
                          readOnly
                        />
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                        <span className="input-group-text">طريقة السداد</span>
                        <input
                          type="text"
                          className="form-control text-end"
                          value={invoice.paymentType}
                          readOnly
                        />
                      </div>

                      <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                        <span className="input-group-text">مسدد</span>
                        <input
                          type="text"
                          className="form-control text-end"
                          value={invoice.paidAmount}
                          readOnly
                        />
                      </div>
                      <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                        <span className="input-group-text">طريقه الدفع</span>
                        <input
                          type="text"
                          className="form-control text-end"
                          value={invoice.paymentMethod}
                          readOnly
                        />
                      </div>
                      <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                        <span className="input-group-text"> حساب الاستلام</span>
                        <input
                          type="text"
                          className="form-control text-end"
                          value={invoice.cashRegister?.name}
                          readOnly
                        />
                      </div>

                      <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                        <span className="input-group-text">باقي المستحق</span>
                        <input
                          type="text"
                          className="form-control text-end col"
                          value={invoice.balanceDue}
                          readOnly
                        />
                      </div>
                      <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                        <span className="input-group-text">
                          تاريخ الاستحقاق
                        </span>
                        <input
                          type="text"
                          className="form-control text-end col"
                          value={formatDate(invoice.paymentDueDate)}
                          readOnly
                        />
                      </div>
                      <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                        <span className="input-group-text">حالة الفاتورة</span>
                        <input
                          type="text"
                          className="form-control text-end col"
                          value={invoice.paymentStatus}
                          readOnly
                        />
                      </div>
                    </div>
                  </div>
                </div>
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
                type="button"
                className="btn btn-primarycol-6 h-100 px-2 py-3 m-0"
                data-dismiss="modal"
                value="طباعه"
                onClick={handlePrint}
              />
            </div>
          </div>
        </div>
      </div>

      {/* <div id="deleteStockActionModal" className="modal fade">
                <div className="modal-dialog modal-lg">
                  <div className="modal-content shadow-lg border-0 rounded ">
                    <form onSubmit={deleteStockAction}>
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

export default Purchase;
