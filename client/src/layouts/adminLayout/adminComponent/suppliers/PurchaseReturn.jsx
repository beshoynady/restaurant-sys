import React, { useState, useEffect, useRef, useContext } from "react";
import axios from "axios";
import { AppContext } from "../../../../context/appContext";
import { toast } from "react-toastify";
import { useReactToPrint } from "react-to-print";
import "../orders/Orders.css";

const PurchaseReturn = () => {
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
  } = useContext(AppContext);

  const purchaseReturnPermission = permissionsList?.filter(
    (permission) => permission.resource === "Purchase Returns"
  )[0];

  const [AllStockactions, setAllStockactions] = useState([]);

  const getallStockaction = async () => {
    const config = await handleGetTokenAndConfig();
    try {
      const response = await axios.get(apiUrl + "/api/stockmovement/", config);

      const Stockactions = await response.data;
      setAllStockactions(Stockactions.reverse());
    } catch (error) {}
  };

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

  const [allrecipes, setAllRecipes] = useState([]);

  const getallrecipes = async () => {
    const config = await handleGetTokenAndConfig();
    try {
      const response = await axios.get(`${apiUrl}/api/recipe`, config);

      const allRecipe = await response.data;
      setAllRecipes(allRecipe);
    } catch (error) {}
  };

  const [StockItems, setStockItems] = useState([]);
  const getaStockItems = async () => {
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

  const createStockAction = async (item, receiverid) => {
    const config = await handleGetTokenAndConfig();

    try {
      const itemId = item.itemId;
      const quantity = item.quantity;
      const price = Number(item.price);
      const cost = item.cost;
      const expirationDate = item.expirationDate;
      const movement = "ReturnPurchase";
      const receiver = receiverid;
      const itemPercentage = Number(price) / Number(netAmount);
      const itemAdditionalCost = additionalCost * itemPercentage;
      const costOfItem = itemAdditionalCost + price;
      const stockItem = StockItems.filter((item) => item._id === itemId)[0];

      // const itemName = stockItem.itemName
      const oldBalance = stockItem.currentBalance;
      const parts = stockItem.parts;
      const currentBalance = Number(oldBalance) - Number(quantity);
      const unit = stockItem.storageUnit;
      const costPerPart =
        Math.round((Number(costOfItem) / Number(parts)) * 100) / 100;
      console.log({
        itemPercentage,
        itemAdditionalCost,
        costOfItem,
        parts,
        price,
        costPerPart,
      });
      // Update the stock item's movement
      const changeItem = await axios.put(
        `${apiUrl}/api/stockitem/movement/${itemId}`,
        { currentBalance, price, costPerPart },
        config
      );

      if (changeItem.status === 200) {
        // Create a new stock action
        const response = await axios.post(
          apiUrl + "/api/stockmovement/",
          {
            itemId,
            movement,
            quantity,
            cost,
            unit,
            balance: currentBalance,
            oldBalance,
            price,
            supplier,
            receiver,
            expirationDate,
          },
          config
        );

        // for (const recipe of allrecipes) {
        //   const recipeid = recipe._id;
        //   const productName = recipe.productId.name;
        //   const arrayingredients = recipe.ingredients;

        //   const newIngredients = arrayingredients.map((ingredient) => {
        //     if (ingredient.itemId === itemId) {
        //       const costofitem = costPerPart;
        //       const unit = ingredient.unit
        //       const amount = ingredient.amount
        //       const totalcostofitem = amount * costPerPart
        //       return { itemId, name: itemName, amount, costofitem, unit, totalcostofitem };
        //     } else {
        //       return ingredient;
        //     }
        //   });
        //
        //   const totalcost = newIngredients.reduce((acc, curr) => {
        //     return acc + (curr.totalcostofitem || 0);
        //   }, 0);
        //   // Update the product with the modified recipe and total cost
        //   const updateRecipe = await axios.put(`${apiUrl}/api/recipe/${recipeid}`,
        //     { ingredients: newIngredients, totalcost }, config);

        //

        //   // Toast for successful update based on recipe change
        //   toast.success(`تم تحديث وصفة  ${productName}`);
        // }
      }

      // Update the stock actions list and stock items
      getallStockaction();
      getaStockItems();

      // Toast notification for successful creation
      toast.success("تم تسجيل حركه المخزن بنجاح");
    } catch (error) {
      // Toast notification for error
      toast.error("فشل تسجيل حركه المخزن ! حاول مره اخري");
    }
  };

  const [listtransactionType, setlistTransactionType] = useState([
    "OpeningBalance",
    "Purchase",
    "Payment",
    "PurchaseReturn",
    "Refund",
  ]);
  const [transactionDate, setTransactionDate] = useState("");
  const [transactionType, setTransactionType] = useState("");
  const [amount, setAmount] = useState(0);
  const [previousBalance, setPreviousBalance] = useState(0);
  const [currentBalance, setCurrentBalance] = useState(0);

  const [returnedItems, setreturnedItems] = useState([]);
  const handleNewItem = () => {
    setreturnedItems([
      ...returnedItems,
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
    const updatedItems = [...returnedItems];
    updatedItems.splice(index, 1);
    setreturnedItems(updatedItems);
    clacTotalAmount();
  };
  const handleItemId = (id, index) => {
    const stockitem = StockItems.filter((item) => item._id === id)[0];
    const updatedItems = [...returnedItems];
    updatedItems[index].itemId = stockitem._id;
    updatedItems[index].storageUnit = stockitem.storageUnit;

    setreturnedItems(updatedItems);
  };
  const handleQuantity = (quantity, index) => {
    const updatedItems = [...returnedItems];
    updatedItems[index].quantity = Number(quantity);
    updatedItems[index].cost =
      Number(quantity) * Number(updatedItems[index].price);

    setreturnedItems(updatedItems);
    clacTotalAmount();
  };
  const handlePrice = (price, index) => {
    const updatedItems = [...returnedItems];
    updatedItems[index].price = Number(price);
    updatedItems[index].cost =
      Number(updatedItems[index].quantity) * Number(price);

    setreturnedItems(updatedItems);
    clacTotalAmount();
  };
  const handleExpirationDate = (date, index) => {
    const updatedItems = [...returnedItems];
    updatedItems[index].expirationDate = new Date(date);

    setreturnedItems(updatedItems);
  };
  const [totalAmount, setTotalAmount] = useState(0);
  const clacTotalAmount = () => {
    let total = 0;
    returnedItems.forEach((item) => {
      total += item.cost;
    });
    setTotalAmount(total);
    setNetAmount(total);
    setBalanceDue(total);
  };

  const [additionalCost, setAdditionalCost] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [salesTax, setSalesTax] = useState(0);
  const [netAmount, setNetAmount] = useState(0);

  const calcNetAmount = () => {
    // let total = Number(totalAmount) + Number(additionalCost) + Number(salesTax) - Number(discount)
    let total = Number(totalAmount) + Number(salesTax) - Number(discount);
    setNetAmount(total);
    setBalanceDue(total);
  };

  useEffect(() => {
    calcNetAmount();
  }, [returnedItems, additionalCost, discount, salesTax]);

  const [supplier, setSupplier] = useState("");
  const [financialInfo, setFinancialInfo] = useState("");
  const [supplierInfo, setsupplierInfo] = useState("");

  const handleSupplier = (id) => {
    setSupplier(id);
    const findSupplier = AllSuppliers.filter(
      (supplier) => supplier._id === id
    )[0];
    setsupplierInfo(findSupplier);
    setFinancialInfo(findSupplier.financialInfo);
    setPreviousBalance(findSupplier.currentBalance);
  };

  const [originalInvoice, setoriginalInvoice] = useState("");
  const handleInvoice = (id) => {
    const returnInvoice = allPurchaseInvoice.filter(
      (returnInvoice) => (returnInvoice._id = id)
    )[0];

    setreturnInvoice(returnInvoice);
    setreturnedItems(returnInvoice.items);
    setoriginalInvoice(id);
    handleSupplier(returnInvoice.supplier._id);
  };

  const [returnDate, setreturnDate] = useState(new Date());

  const [refundedAmount, setrefundedAmount] = useState(0);
  const [balanceDue, setBalanceDue] = useState(0);
  const [returnStatus, setreturnStatus] = useState("unreturned");
  const [refundMethod, setrefundMethod] = useState("");

  const handlerefundedAmount = (amount) => {
    setrefundedAmount(amount);
    setBalanceDue(Number(netAmount) - Number(amount));

    if (amount === 0) {
      setreturnStatus("unreturned");
    } else if (amount === netAmount) {
      setreturnStatus("fully_returned");
    } else if (amount < netAmount) {
      setreturnStatus("partially_returned");
    }
  };

  const [listCashRegister, setlistCashRegister] = useState([]);
  const [cashRegister, setCashRegister] = useState();
  const [CashRegisterBalance, setCashRegisterBalance] = useState(0);
  const handleCashRegister = (id) => {
    const filterCashRegister = AllCashRegisters.filter(
      (CashRegister) => CashRegister.employee._id === id
    );

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
    setPaymentMethod(Method);
    handleCashRegister(employeeId);
  };

  const [paymentDueDate, setPaymentDueDate] = useState("");
  const [notes, setNotes] = useState("");

  // const createPurchaseInvoice = async (e, receiverId) => {

  //   e.preventDefault()
  //   try{
  // const config = await handleGetTokenAndConfig();
  //     const newInvoice = {
  //       originalInvoice,
  //       returnDate,
  //       supplier,
  //       items,
  //       totalAmount,
  //       discount,
  //       salesTax,
  //       netAmount,
  //       additionalCost,
  //       refundedAmount,
  //       balanceDue,
  //       paymentDueDate,
  //       cashRegister,
  //       returnStatus,
  //       refundMethod,
  //       paymentMethod,
  //       notes,
  //     }
  //
  //     const response = await axios.post(`${apiUrl}/api/purchasereturn`, newInvoice, config);
  //
  //     if (response.status === 201) {
  //       items.forEach(item => {
  //         createStockAction(item, receiverId)
  //       })

  //       await handleAddSupplierTransactionPurchase(response.data._id)
  //       getAllPurchases();
  //       toast.success('تم اضافه المشتريات بنجاح')
  //     } else {
  //       toast.error('فشل اضافه المشتريات ! حاول مره اخري')
  //     }
  //   } catch (error) {
  //     toast.error('حدث خطأ اثناء اضافه المشتريات ! حاول مره اخري')
  //   }
  // }

  const [returnInvoice, setreturnInvoice] = useState({});

  const getReturnInvoice = async (id) => {
    const config = await handleGetTokenAndConfig();
    try {
      if (purchaseReturnPermission && !purchaseReturnPermission.read) {
        toast.warn("ليس لك صلاحية لعرض فواتير المرتجع");
        return;
      }
      const resInvoice = await axios.get(
        `${apiUrl}/api/purchasereturn/${id}`,
        config
      );
      if (resInvoice) {
        setreturnInvoice(resInvoice.data);
      }
    } catch (error) {
      toast.error(
        "حدث خطأ اثناء جلب الفاتوره ! اعد تحميل الصفحة و حاول مره اخري"
      );
    }
  };

  const createPurchaseReturn = async (e, receiverId) => {
    e.preventDefault();
    const config = await handleGetTokenAndConfig();
    try {
      if (purchaseReturnPermission && !purchaseReturnPermission.create) {
        toast.warn("ليس لك صلاحية لانشاء فواتير المرتجع");
        return;
      }

      const items = [];
      returnedItems.map((item) => {
        if (item.quantity > 0) {
          const i = {
            itemId: item.itemId?._id,
            quantity: item.quantity,
            price: item.price,
            storageUnit: item.storageUnit,
            cost: item.cost,
            expirationDate: item.expirationDate,
          };
          items.push(i);
        }
      });
      if (items.length === 0) {
        toast.warn("يجب ارجاء صنف واحد علي الاقل  و اعطاءه كمية للارجاع");
        return;
      }
      if (refundMethod === "cash" && !cashRegister) {
        toast.warn(
          "لا يمكنك ارجاع المشتريات وانت ليس لك حساب خزينه تستقبل بها قيمه المرتجعات "
        );
        return;
      }

      const purchasereturn = {
        originalInvoice,
        returnDate,
        supplier,
        returnedItems: items,
        totalAmount,
        discount,
        netAmount,
        salesTax,
        refundedAmount,
        balanceDue,
        paymentDueDate,
        additionalCost,
        cashRegister,
        returnStatus,
        paymentMethod,
        refundMethod,
        notes,
      };

      const response = await axios.post(
        `${apiUrl}/api/purchasereturn`,
        purchasereturn,
        config
      );

      if (response.status === 201) {
        items.forEach((item) => {
          createStockAction(item, receiverId);
        });

        // await handleAddSupplierTransactionPurchaseReturn(response.data._id)
        getAllPurchasesReturn();
        toast.success("تم اضافه المشتريات بنجاح");
      } else {
        toast.error("فشل اضافه المشتريات ! حاول مره اخري");
      }
    } catch (error) {
      toast.error("حدث خطأ اثناء اضافه المشتريات ! حاول مره اخري");
    }
  };

  const [allPurchasesReturn, setAllPurchasesReturn] = useState([]);
  const getAllPurchasesReturn = async () => {
    const config = await handleGetTokenAndConfig();
    try {
      if (purchaseReturnPermission && !purchaseReturnPermission.read) {
        toast.warn("ليس لك صلاحية لعرض فواتير المرتجع");
        return;
      }
      const response = await axios.get(apiUrl + "/api/purchasereturn", config);

      if (response.status === 200) {
        setAllPurchasesReturn(response.data.reverse());
      } else {
        toast.error("فشل جلب جميع فواتير المشتريات ! اعد تحميل الصفحة");
      }
    } catch (error) {
      toast.error("حدث خطأ اثناء جلب فواتير المشتريات ! اعد تحميل الصفحة");
    }
  };

  const [allPurchaseInvoice, setAllPurchaseInvoice] = useState([]);
  const getAllPurchases = async () => {
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

  const searchByInvoice = (returnInvoice) => {
    if (returnInvoice === "all") {
      getAllPurchasesReturn();
    }
    getAllPurchasesReturn();
    const filters = allPurchasesReturn.filter(
      (PurchasesReturn) => PurchasesReturn.originalInvoice._id === returnInvoice
    );
    setAllPurchasesReturn(filters);
  };
  const searchBySupplier = (supplierId) => {
    if (supplierId === "all") {
      getAllPurchasesReturn();
    }
    getAllPurchasesReturn();
    const filters = allPurchasesReturn.filter(
      (PurchasesReturn) => PurchasesReturn.supplier._id === supplierId
    );
    setAllPurchasesReturn(filters);
  };

  const confirmPayment = async (e) => {
    e.preventDefault();
    const updatedbalance = Number(CashRegisterBalance) + Number(refundedAmount); // Calculate the updated balance

    const config = await handleGetTokenAndConfig();
    try {
      // await handleAddSupplierTransactionPaymentPurchase()

      const cashMovement = await axios.post(
        apiUrl + "/api/cashMovement/",
        {
          registerId: cashRegister,
          amount: refundedAmount,
          type: "Refund",
          description: `استرداد مرتجع فاتورة مشتريات رقم ${returnInvoice.invoiceNumber}`,
        },
        config
      );

      if (cashMovement) {
        toast.success("تم تسجيل حركه الخزينه بنجاح");

        const updatecashRegister = await axios.put(
          `${apiUrl}/api/cashRegister/${cashRegister}`,
          {
            balance: updatedbalance, // Use the updated balance
          },
          config
        );

        // Update the state after successful updates
        if (updatecashRegister) {
          // Toast notification for successful creation
          toast.success(" تم اضافه المبلع المسترد الي الخزينة");
        }
      } else {
        toast.success("حدث خطا اثنا تسجيل حركه الخزينه ! حاول مره اخري");
      }
    } catch (error) {
      // Toast notification for error
      toast.error("فشل في تسجيل المصروف !حاول مره اخري");
    }
  };

  const confirmDeduct = async () => {
    const config = await handleGetTokenAndConfig();
    try {
      let newCurrentBalance = 0;

      const invoiceNumber = originalInvoice;
      const transactionType = "PurchaseReturn";
      const paymentMethod = "خصم من الرصيد";
      const amount = netAmount;
      const transactionDate = returnDate;
      const currentBalance = previousBalance - amount;

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
        const supplierresponse = await axios.put(
          `${apiUrl}/api/supplier/${supplier}`,
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

      // if (refundedAmount > 0) {
      //   const transactionType = 'Payment'
      //   const amount = refundedAmount
      //   const transactionDate = returnDate
      //   const previousBalance = newCurrentBalance
      //   const currentBalance = previousBalance - refundedAmount
      //   const requestData = { originalInvoice, supplier, transactionDate, transactionType, amount, previousBalance, currentBalance, paymentMethod, notes };

      //

      //   const response = await axios.post(`${apiUrl}/api/suppliertransaction`, requestData, config);
      //
      //   if (response.status === 201) {
      //     const supplierresponse = await axios.put(`${apiUrl}/api/supplier/${supplier}`, { currentBalance }, config);
      //
      //     toast.success('تم انشاء العملية بنجاح');
      //   } else {
      //     toast.error('حدث خطأ أثناء انشاء العملية');
      //   }
      // }
    } catch (error) {
      toast.error("حدث خطأ أثناء انشاء العملية");
    }
  };

  const printContainerPurchasesReturnInvoice = useRef();
  const handlePrint = useReactToPrint({
    content: () => printContainerPurchasesReturnInvoice.current,
    copyStyles: true,
    removeAfterPrint: true,
    bodyClass: "printpage",
  });

  useEffect(() => {
    getAllPurchasesReturn();
    getAllPurchases();
    getallStockaction();
    getaStockItems();
    getAllCashRegisters();
    getallrecipes();
    getAllSuppliers();
  }, []);

  return (
    <div className="w-100 px-3 d-flex align-itmes-center justify-content-start">
      <div className="table-responsive">
        <div className="table-wrapper p-3 mw-100">
          <div className="table-title">
            <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
              <div className="text-right">
                <h2>
                  ادارة <b>مرتجع المشتريات</b>
                </h2>
              </div>
              {purchaseReturnPermission && purchaseReturnPermission.create && (
                <div className="col-12 col-md-6 p-0 m-0 d-flex flex-wrap aliegn-items-center justify-content-end print-hide">
                  <a
                    href="#addPurchaseInvoiceModal"
                    className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-success"
                    data-toggle="modal"
                  >
                    {" "}
                    <label className=" text-wrap text-right fw-bolder p-0 m-0">
                      انشاء مرتجع مشتريات
                    </label>
                  </a>
                  {/* <a href="#deleteStockactionModal" className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-danger" data-toggle="modal"> <label className=" text-wrap text-right fw-bolder p-0 m-0">حذف</label></a> */}
                </div>
              )}
            </div>
          </div>
          <div className="table-filter print-hide">
            <div class="col-12 text-dark d-flex flex-wrap align-items-center justify-content-start p-0 m-0">
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
                  رقم الفاتورة
                </label>
                <select
                  className="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => searchByInvoice(e.target.value)}
                >
                  <option value="all">الكل</option>
                  {allPurchaseInvoice.map((PurchaseInvoice) => {
                    return (
                      <option value={PurchaseInvoice._id}>
                        {PurchaseInvoice.invoiceNumber}
                      </option>
                    );
                  })}
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
                  <option value="all">الكل</option>
                  {AllSuppliers.map((Supplier) => {
                    return (
                      <option value={Supplier._id}>{Supplier.name}</option>
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
                      setAllPurchasesReturn(
                        filterByTime(e.target.value, allPurchasesReturn)
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
                        setAllPurchasesReturn(
                          filterByDateRange(allPurchasesReturn)
                        )
                      }
                    >
                      <i className="fa fa-search"></i>
                    </button>
                    <button
                      type="button"
                      className="btn btn-warning h-100 p-2"
                      onClick={getAllPurchasesReturn}
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
                {/* <th>
                  <label className="custom-checkbox">
                    <input type="checkbox" className="form-check-input form-check-input-lg" id="selectAll" />
                    <label htmlFor="selectAll"></label>
                  </label>
                </th> */}
                <th>م</th>
                <th>التاريخ</th>
                <th>الفاتوره الاصليه</th>
                <th>المورد</th>
                <th>مجموع المرتجع</th>
                <th>الخصم</th>
                <th>الضريبه</th>
                <th>الاجمالي</th>
                <th>اضافية</th>
                {/* <th>الاجمالي بالمصاريف</th> */}
                <th>نوع الفاتورة</th>
                <th>استرد</th>
                <th>باقي</th>
                <th>تاريخ الاسترداد</th>
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
              {allPurchasesReturn.length > 0 &&
                allPurchasesReturn.map((returnInvoice, i) => {
                  if ((i >= startPagination) & (i < endPagination)) {
                    return (
                      <tr key={i}>
                        {/* <td>
                        <label className="custom-checkbox">
                          <input type="checkbox" className="form-check-input form-check-input-lg" id="checkbox1" name="options[]" value="1" />
                          <label htmlFor="checkbox1"></label>
                        </label>
                      </td> */}
                        <td>{i + 1}</td>
                        <td>{formatDate(returnInvoice.returnDate)}</td>
                        <td>{returnInvoice.originalInvoice?.invoiceNumber}</td>
                        <td>{returnInvoice.supplier.name}</td>
                        <td>{returnInvoice.totalAmount}</td>
                        <td>{returnInvoice.discount}</td>
                        <td>{returnInvoice.salesTax}</td>
                        <td>{returnInvoice.netAmount}</td>
                        <td>{returnInvoice.additionalCost}</td>
                        <td>{returnInvoice.refundMethod}</td>
                        <td>{returnInvoice.refundedAmount}</td>
                        <td>{returnInvoice.balanceDue}</td>
                        <td>{formatDate(returnInvoice.paymentDueDate)}</td>
                        <td>{returnInvoice.paymentMethod}</td>
                        <td>{returnInvoice.refundStatus}</td>
                        <td>{returnInvoice.cashRegister?.name}</td>
                        <td>{returnInvoice.createdBy?.fullname}</td>
                        <td>{formatDateTime(returnInvoice.createdAt)}</td>
                        <td>{returnInvoice.notes}</td>
                        <td>
                          {purchaseReturnPermission &&
                            purchaseReturnPermission.read && (
                              <button
                                data-target="#viewPurchaseReturnModal"
                                data-toggle="modal"
                                onClick={() => {
                                  getReturnInvoice(returnInvoice._id);
                                }}
                              >
                                <i
                                  className="material-icons text-primary"
                                  data-toggle="tooltip"
                                  title="aye"
                                >
                                  &#xE417;{" "}
                                </i>
                              </button>
                            )}
                          {/* <a href="#deleteStockactionModal" className="btn btn-sm btn-danger" data-toggle="modal" onClick={() => }><i className="material-icons" data-toggle="tooltip" title="Delete">&#xE872;</i></a> */}
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
                {allPurchasesReturn.length > endPagination
                  ? endPagination
                  : allPurchasesReturn.length}
              </b>{" "}
              من <b>{allPurchasesReturn.length}</b> عنصر
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
              onSubmit={(e) => createPurchaseReturn(e, employeeLoginInfo.id)}
            >
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">تسجيل مرتجع مشتريات</h4>
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
                            الفاتورة الاصليه
                          </span>
                          <select
                            required
                            className="form-control border-primary m-0 p-2 h-auto"
                            id="originalInvoiceInput"
                            onChange={(e) => handleInvoice(e.target.value)}
                          >
                            <option>اختر الفاتورة</option>
                            {allPurchaseInvoice.map((returnInvoice, i) => (
                              <option value={returnInvoice._id} key={i}>
                                {returnInvoice.invoiceNumber}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                          <span
                            className="input-group-text"
                            htmlFor="returnDateInput"
                          >
                            تاريخ المرتجع
                          </span>
                          <input
                            type="date"
                            className="form-control border-primary m-0 p-2 h-auto"
                            required
                            id="returnDateInput"
                            placeholder="تاريخ الفاتور"
                            onChange={(e) => setreturnDate(e.target.value)}
                          />
                        </div>
                      </div>
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
                            className="form-control border-primary m-0 p-2 h-auto"
                            required
                            id="originalInvoiceInput"
                            value={supplierInfo.name}
                            readOnly
                          />
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
                          <th scope="col" className="col-2 NoPrint">
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
                        {returnedItems &&
                          returnedItems.map((item, i) => (
                            <tr id="TRow" key={i}>
                              <th scope="w-100 d-flex flex-wrap align-items-center justify-content-between">
                                {i + 1}
                              </th>
                              <td>
                                <input
                                  type="text"
                                  className="form-control p-0 m-0"
                                  name="qty"
                                  value={item.itemId?.itemName}
                                  readOnly
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  required
                                  className="form-control p-0 m-0"
                                  max={item.quantity}
                                  value={item.quantity}
                                  name="qty"
                                  onChange={(e) =>
                                    handleQuantity(Number(e.target.value), i)
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
                                  value={item.price}
                                  onChange={(e) =>
                                    handlePrice(Number(e.target.value), i)
                                  }
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
                                  type="text"
                                  className="form-control p-0 m-0"
                                  name="Exp"
                                  readOnly
                                  value={formatDate(item.expirationDate)}
                                />
                              </td>
                              {/* <td className="NoPrint"><button type="button" className="h-100 btn btn-sm btn-danger" onClick={() => handleDeleteItem(i)}>X</button></td> */}
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
                            value={
                              totalAmount > 0
                                ? totalAmount
                                : returnInvoice.totalAmount
                            }
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
                            value={salesTax ? salesTax : returnInvoice.salesTax}
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
                            value={
                              discount > 0 ? discount : returnInvoice.discount
                            }
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
                            value={
                              netAmount > 0
                                ? netAmount
                                : returnInvoice.netAmount
                            }
                            readOnly
                          />
                        </div>
                        <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                          <span className="input-group-text" htmlFor="gstInput">
                            تكلفه اضافية
                          </span>
                          <input
                            type="number"
                            className="form-control text-end"
                            id="gstInput"
                            placeholder="اي تكلفه تمت حتي يتم الارجاع مثل النقل"
                            onChange={(e) => setAdditionalCost(e.target.value)}
                          />
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
                            placeholder="اكتب سبب المرتجع"
                            required
                            onChange={(e) => setNotes(e.target.value)}
                            style={{ height: "auto" }}
                          />
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                          <span
                            className="input-group-text"
                            htmlFor="refundMethod"
                          >
                            طريقة السداد
                          </span>
                          <select
                            className="form-control border-primary m-0 p-2 h-auto"
                            id="refundMethod"
                            onChange={(e) => setrefundMethod(e.target.value)}
                            value={refundMethod}
                          >
                            <option>اختر طريقه السداد</option>
                            <option value="cash">نقدي</option>
                            <option value="credit">سداد مؤجل</option>
                            <option value="deduct_supplier_balance">
                              خصم من رصيد المورد
                            </option>
                          </select>
                        </div>

                        {refundMethod && refundMethod === "cash" && (
                          <>
                            <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                              <span
                                className="input-group-text"
                                htmlFor="refundedAmount"
                              >
                                مسدد
                              </span>
                              <input
                                type="number"
                                className="form-control text-end"
                                defaultValue={refundedAmount}
                                id="refundedAmount"
                                onChange={(e) =>
                                  handlerefundedAmount(e.target.value)
                                }
                              />
                            </div>
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
                                <option value="نقدي">نقدي</option>
                                {financialInfo &&
                                  financialInfo.map((financialInfo, i) => {
                                    return (
                                      <option
                                        value={financialInfo.paymentMethodName}
                                      >{`${financialInfo.paymentMethodName} ${financialInfo.accountNumber}`}</option>
                                    );
                                  })}
                              </select>
                            </div>
                          </>
                        )}

                        {refundMethod === "cash" ? (
                          listCashRegister ? (
                            <>
                              <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                                <span
                                  className="input-group-text "
                                  htmlFor="CashRegister"
                                >
                                  اختر حساب الاستلام
                                </span>
                                <select
                                  className="form-control border-primary m-0 p-2 h-auto"
                                  id="CashRegister"
                                  onChange={(e) =>
                                    selectCashRegister(e.target.value)
                                  }
                                >
                                  <option>اختر حساب الاستلام</option>
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
                                <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                                  <span
                                    className="input-group-text"
                                    htmlFor="netAmountInput"
                                  >
                                    رصيد الخزينة
                                  </span>
                                  <input
                                    type="button"
                                    className="form-control text-end col"
                                    id="netAmountInput"
                                    value={CashRegisterBalance}
                                    readOnly
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-success w-100 h-100 p-0"
                                    id="netAmountInput"
                                    onClick={confirmPayment}
                                  >
                                    تاكيد الدفع
                                  </button>
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="input-gro col-4up-text">
                              ليس لك خزينة للدفع النقدي
                            </span>
                          )
                        ) : refundMethod === "deduct_supplier_balance" ? (
                          <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                            <span
                              className="input-group-text"
                              htmlFor="netAmountInput"
                            >
                              رصيد المورد
                            </span>
                            <input
                              type="button"
                              className="form-control text-end col"
                              id="netAmountInput"
                              value={supplierInfo.currentBalance}
                              readOnly
                            />
                            <button
                              type="button"
                              className="btn btn-success w-100 h-100 p-0"
                              id="netAmountInput"
                              onClick={confirmDeduct}
                            >
                              تاكيد الخصم
                            </button>
                          </div>
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
                            className="form-control text-end col"
                            id="balanceDue"
                            value={balanceDue}
                            readOnly
                          />
                        </div>
                        {balanceDue > 0 && (
                          <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                            <span
                              className="input-group-text"
                              htmlFor="gstInput"
                            >
                              تاريخ الاستحقاق
                            </span>
                            <input
                              type="date"
                              className="form-control text-end col"
                              id="gstInput"
                              onChange={(e) =>
                                setPaymentDueDate(e.target.value)
                              }
                            />
                          </div>
                        )}
                        <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                          <span
                            className="input-group-text"
                            htmlFor="netAmountInput"
                          >
                            حالة الفاتورة
                          </span>
                          <input
                            type="text"
                            className="form-control text-end col"
                            id="netAmountInput"
                            value={returnStatus}
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

      <div id="viewPurchaseReturnModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">عرض مرتجع مشتريات</h4>
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
                className="modal-body printpage"
                ref={printContainerPurchasesReturnInvoice}
                style={{ direction: "rtl" }}
              >
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
                            الفاتورة الاصلية
                          </span>
                          <input
                            type="text"
                            className="form-control border-primary m-0 p-2 h-auto"
                            id="originalInvoiceInput"
                            value={returnInvoice.originalInvoice}
                            readOnly
                          />
                        </div>
                        <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                          <span
                            className="input-group-text"
                            htmlFor="returnDateInput"
                          >
                            تاريخ المرتجع
                          </span>
                          <input
                            type="text"
                            className="form-control border-primary m-0 p-2 h-auto"
                            readOnly
                            id="returnDateInput"
                            value={formatDateTime(returnInvoice.returnDate)}
                          />
                        </div>
                      </div>
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
                            className="form-control border-primary m-0 p-2 h-auto"
                            readOnly
                            id="originalInvoiceInput"
                            value={returnInvoice.supplier?.name}
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
                          <th scope="col" className="col-2 NoPrint">
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
                        {returnInvoice.returnedItems &&
                          returnInvoice.returnedItems.map((item, i) => (
                            <tr id="TRow" key={i}>
                              <th scope="w-100 d-flex flex-wrap align-items-center justify-content-between">
                                {i + 1}
                              </th>
                              <td>
                                <input
                                  type="text"
                                  className="form-control p-0 m-0"
                                  name="qty"
                                  value={item.itemId?.itemName}
                                  readOnly
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="form-control p-0 m-0"
                                  value={item.quantity}
                                  name="qty"
                                  readOnly
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
                                  readOnly
                                  value={item.price}
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
                                  type="text"
                                  className="form-control p-0 m-0"
                                  name="Exp"
                                  readOnly
                                  value={formatDate(item.expirationDate)}
                                />
                              </td>
                              {/* <td className="NoPrint"><button type="button" className="h-100 btn btn-sm btn-danger" onClick={() => handleDeleteItem(i)}>X</button></td> */}
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
                            value={returnInvoice.totalAmount}
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
                            value={returnInvoice.salesTax}
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
                            value={returnInvoice.discount}
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
                            value={returnInvoice.netAmount}
                            readOnly
                          />
                        </div>
                        <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                          <span className="input-group-text" htmlFor="gstInput">
                            تكلفه اضافية
                          </span>
                          <input
                            type="text"
                            className="form-control text-end"
                            id="gstInput"
                            value={returnInvoice.additionalCost}
                          />
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
                            readOnly
                            value={returnInvoice.notes}
                            style={{ height: "auto" }}
                          />
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                          <span
                            className="input-group-text"
                            htmlFor="refundMethod"
                          >
                            طريقة السداد
                          </span>
                          <input
                            type="text"
                            className="form-control text-end"
                            id="gstInput"
                            readOnly
                            value={returnInvoice.refundMethod}
                          />
                        </div>

                        {returnInvoice.refundMethod &&
                          returnInvoice.refundMethod === "cash" && (
                            <>
                              <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                                <span
                                  className="input-group-text"
                                  htmlFor="refundedAmount"
                                >
                                  مسدد
                                </span>
                                <input
                                  type="text"
                                  className="form-control text-end"
                                  value={returnInvoice.refundedAmount}
                                  id="refundedAmount"
                                />
                              </div>
                              <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                                <span
                                  className="input-group-text"
                                  htmlFor="gstInput"
                                >
                                  طريقه الدفع
                                </span>
                                <input
                                  type="text"
                                  className="form-control text-end"
                                  id="paymentMethod"
                                  value={returnInvoice.paymentMethod}
                                />
                              </div>
                              <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                                <span
                                  className="input-group-text "
                                  htmlFor="CashRegister"
                                >
                                  اختر حساب الاستلام
                                </span>
                                <input
                                  type="text"
                                  className="form-control text-end"
                                  id="CashRegister"
                                  value={returnInvoice.cashRegister?.name}
                                />
                              </div>
                            </>
                          )}

                        <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                          <span
                            className="input-group-text"
                            htmlFor="balanceDue"
                          >
                            باقي المستحق
                          </span>
                          <input
                            type="text"
                            className="form-control text-end col"
                            id="balanceDue"
                            value={returnInvoice.balanceDue}
                            readOnly
                          />
                        </div>
                        {balanceDue > 0 && (
                          <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                            <span
                              className="input-group-text"
                              htmlFor="paymentDueDate"
                            >
                              تاريخ الاستحقاق
                            </span>
                            <input
                              type="date"
                              className="form-control text-end col"
                              id="paymentDueDate"
                              value={formatDate(returnInvoice.paymentDueDate)}
                            />
                          </div>
                        )}
                        <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                          <span
                            className="input-group-text"
                            htmlFor="netAmountInput"
                          >
                            حالة الفاتورة
                          </span>
                          <input
                            type="text"
                            className="form-control text-end col"
                            id="netAmountInput"
                            value={returnInvoice.returnStatus}
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
            </form>
          </div>
        </div>
      </div>

      {/* <div id="purchaseReturnModal" className="modal fade">
                <div className="modal-dialog modal-lg">
                  <div className="modal-content shadow-lg border-0 rounded ">
                    <form onSubmit={(e) => handlePurchaseReturn(e, employeeLoginInfo.id)}>
                      <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                        <h4 className="modal-title"></h4>
                        <button type="button" className="close m-0 p-1" data-dismiss="modal" aria-hidden="true">&times;</button>
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
                                  <span className="input-group-text" htmlFor="supplierSelect">المورد</span>
                                  <select readOnly className="form-control border-primary m-0 p-2 h-auto"  id="supplierSelect" onChange={(e) => handleSupplier(e.target.value)}>
                                    <option>اختر المورد</option>
                                    {AllSuppliers.map((supplier, i) => (
                                      <option value={supplier._id} key={i}>{supplier.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                                  <span className="input-group-text col-4" htmlFor="notesInput">الرصيد</span>
                                  <input type="text" className="form-control border-primary m-0 p-2 h-auto" id="notesInput" readOnly value={supplierInfo.currentBalance} />
                                </div>

                              </div>
                              <div className="col-6">
                                <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                                  <span className="input-group-text col-4" htmlFor="originalInvoiceInput">رقم الفاتورة</span>
                                  <input type="text" className="form-control border-primary m-0 p-2 h-auto" required id="originalInvoiceInput" placeholder="رقم الفاتورة" onChange={(e) => setoriginalInvoice(e.target.value)} />
                                </div>
                                <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                                  <span className="input-group-text col-4" htmlFor="returnDateInput">تاريخ الفاتورة</span>
                                  <input type="date" className="form-control border-primary m-0 p-2 h-auto" required id="returnDateInput" placeholder="تاريخ الفاتور" onChange={(e) => setreturnDate(e.target.value)} />
                                </div>
                              </div>
                            </div>

                            <table className="table table-bordered table-striped table-hover">
                              <thead className="table-success">
                                <tr>
                                  <th scope="col">#</th>
                                  <th scope="col" className="col-4">الصنف</th>
                                  <th scope="col" className="col-2">الكمية</th>
                                  <th scope="col" className="col-2">الوحده</th>
                                  <th scope="col" className="col-2">السعر</th>
                                  <th scope="col" className="col-2">الثمن</th>
                                  <th scope="col" className="col-2">انتهاء</th>
                                  <th scope="col" className="col-4 NoPrint">
                                    <button type="button" className="h-100 btn btn-sm btn-success" onClick={handleNewItem}>+</button>
                                  </th>
                                </tr>
                              </thead>
                              <tbody id="TBody">
                                {items.map((item, i) => (
                                  <tr id="TRow" key={i}>
                                    <th scope="w-100 d-flex flex-wrap align-items-center justify-content-between">{i + 1}</th>
                                    <td>
                                      <select className="form-control border-primary m-0 p-2 h-auto"  required onChange={(e) => handleItemId(e.target.value, i)}>
                                        <option value="">
                                          {StockItems && StockItems.filter(stock => stock._id === item.item)[0]?.name}
                                        </option>
                                        {StockItems.map((stock, j) => (
                                          <option value={stock._id} key={j}>{stock.itemName}</option>
                                        ))}
                                      </select>
                                    </td>
                                    <td><input type="number" required className="form-control border-primary m-0 p-2 h-auto" name="qty" onChange={(e) => handleQuantity(e.target.value, i)} /></td>
                                    <td><input type="text" readOnly value={item.storageUnit} className="form-control border-primary m-0 p-2 h-auto" name="storageUnit" /></td>

                                    <td><input type="number" className="form-control border-primary m-0 p-2 h-auto" name="price" required onChange={(e) => handlePrice(e.target.value, i)} /></td>

                                    <td><input type="text" className="form-control border-primary m-0 p-2 h-auto" value={item.cost} name="amt" readOnly /></td>

                                    <td><input type="date" className="form-control border-primary m-0 p-2 h-auto" name="Exp" onChange={(e) => handleExpirationDate(e.target.value, i)} /></td>
                                    <td className="NoPrint"><button type="button" className="h-100 btn btn-sm btn-danger" onClick={() => handleDeleteItem(i)}>X</button></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>

                            <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
                              <div className="col-6">
                                <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                                  <span className="input-group-text col-4" htmlFor="totalInput">الإجمالي</span>
                                  <input type="text" className="form-control text-end" value={totalAmount} id="totalInput" readOnly />
                                </div>
                                <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                                  <span className="input-group-text col-4" htmlFor="gstInput">ضريبة القيمة المضافة</span>
                                  <input type="number" className="form-control text-end" id="gstInput" onChange={(e) => setSalesTax(e.target.value)} />
                                </div>
                                <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                                  <span className="input-group-text col-4" htmlFor="gstInput">خصم</span>
                                  <input type="number" className="form-control text-end" id="gstInput" onChange={(e) => setDiscount(e.target.value)} />
                                </div>
                                <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                                  <span className="input-group-text col-4" htmlFor="netAmountInput">المبلغ الصافي</span>
                                  <input type="text" className="form-control text-end" id="netAmountInput" value={netAmount} readOnly />
                                </div>
                                <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                                  <span className="input-group-text col-4" htmlFor="notesInput">الملاحظات</span>
                                  <textarea className="form-control border-primary m-0 p-2 h-auto" id="notesInput" placeholder="الملاحظات" onChange={(e) => setNotes(e.target.value)} style={{ height: 'auto' }} />
                                </div>
                                <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                                  <span className="input-group-text col-4" htmlFor="gstInput">تكلفه اضافية</span>
                                  <input type="number" className="form-control text-end" id="gstInput" onChange={(e) => setAdditionalCost(e.target.value)} />
                                </div>
                              </div>
                              <div className="col-6">
                                <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                                  <span className="input-group-text col-4" htmlFor="refundedAmount">مدفوع</span>
                                  <input type="number" className="form-control text-end" defaultValue={refundedAmount} id="refundedAmount" onChange={(e) => handlerefundedAmount(e.target.value)} />
                                </div>
                                <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                                  <span className="input-group-text col-4" htmlFor="gstInput">طريقه الدفع</span>
                                  <select className='form-control border-primary m-0 p-2 h-auto' name="paymentMethod" id="paymentMethod" onChange={(e) => handlePaymentMethod(e.target.value, employeeLoginInfo.id)}>
                                    <option>اختر طريقه الدفع</option>
                                    <option value="نقدي">نقدي</option>
                                    {financialInfo && financialInfo.map((financialInfo, i) => {
                                      return <option value={financialInfo.paymentMethodName}>{`${financialInfo.paymentMethodName} ${financialInfo.accountNumber}`}</option>
                                    })}
                                  </select>
                                </div>
                                {paymentMethod === 'نقدي' && cashRegister ?
                                  <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                                    <span className="input-group-text col-4" htmlFor="netAmountInput">رصيد  الخزينة</span>
                                    <input type="button" className="form-control text-end" id="netAmountInput" value={CashRegisterBalance} readOnly />
                                    <button type="button" className="h-100 btn btn-success" id="netAmountInput" onClick={confirmPayment} >تاكيد الدفع</button>
                                  </div>
                                  : <span className="input-gro col-4up-text"> ليس لك خزينة للدفع النقدي</span>
                                }

                                <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                                  <span className="input-group-text col-4" htmlFor="balanceDue">باقي المستحق</span>
                                  <input type="text" className="form-control text-end" id="balanceDue" value={balanceDue} readOnly />
                                </div>
                                <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                                  <span className="input-group-text col-4" htmlFor="gstInput">تاريخ الاستحقاق</span>
                                  <input type="date" className="form-control text-end" id="gstInput" onChange={(e) => setPaymentDueDate(e.target.value)} />
                                </div>
                                <div className="input-group mb-3 d-flex align-items-center justify-content-between flex-nowrap">
                                  <span className="input-group-text col-4" htmlFor="netAmountInput">حالة الفاتورة</span>
                                  <input type="text" className="form-control text-end" id="netAmountInput" value={returnStatus} readOnly />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                      <div className="modal-footer d-flex flex-nowrap align-items-center justify-content-between m-0 p-1">
                        <input type="submit" className="btn btn-success col-6 h-100 px-2 py-3 m-0" value="اضافه" />
                        <input type="button" className="btn btn-danger col-6 h-100 px-2 py-3 m-0" data-dismiss="modal" value="إغلاق" />
                      </div>
                      </div>
                    </form>
                  </div>
                </div>
              </div> */}

      {/* <div id="deleteStockactionModal" className="modal fade">
                <div className="modal-dialog modal-lg">
                  <div className="modal-content shadow-lg border-0 rounded ">
                    <form onSubmit={deleteStockaction}>
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

export default PurchaseReturn;
