import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AppContext } from "../../../../context/appContext";
import { toast } from "react-toastify";
import "../orders/Orders.css";

const Suppliers = () => {
  const {
    permissionsList,
    employeeLoginInfo,
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

  const supplierDataPermission =
    permissionsList &&
    permissionsList.filter(
      (permission) => permission.resource === "Supplier Data"
    )[0];

  const [supplierId, setsupplierId] = useState("");
  const [name, setName] = useState("");
  const [responsiblePerson, setResponsiblePerson] = useState("");

  const [phone, setPhone] = useState(["رقم الموبايل"]);

  const handleAddPhone = () => {
    setPhone([...phone, "رقم الموبايل"]);
  };
  const handleNewPhone = (index, e) => {
    const phoneList = [...phone];
    phoneList[index] = e.target.value;
    setPhone(phoneList);
  };

  const handleDeletePhone = (index) => {
    const phoneList = [...phone];
    phoneList.splice(index, 1);
    setPhone(phoneList);
  };

  const [whatsapp, setWhatsapp] = useState("");

  const [email, setEmail] = useState("");

  const [address, setAddress] = useState("");

  const [itemsSupplied, setItemsSupplied] = useState(["اضف خامة"]);

  const handleAddItemsSupplied = () => {
    setItemsSupplied([...itemsSupplied, "اضف خامة"]);
  };
  const handleNewItemsSupplied = (index, e) => {
    const itemsSuppliedList = [...itemsSupplied];
    itemsSuppliedList[index] = e.target.value;
    setItemsSupplied(itemsSuppliedList);
  };

  const handleDeleteItemsSupplied = (index) => {
    const itemsSuppliedList = [...itemsSupplied];
    itemsSuppliedList.splice(index, 1);
    setItemsSupplied(itemsSuppliedList);
  };

  const [currentBalance, setCurrentBalance] = useState(0);
  const [notes, setNotes] = useState("");

  const [paymentType, setPaymentType] = useState("");

  const currencyList = ["EGP", "USD", "EUR", "GBP", "SAR", "AED", "KWD"];

  const [financialInfo, setFinancialInfo] = useState([
    { paymentMethodName: "", accountNumber: "", currency: "EGP" },
  ]);
  const handleAddfinancialInfo = () => {
    setFinancialInfo([
      ...financialInfo,
      { paymentMethodName: "", accountNumber: "" },
    ]);
  };
  const handleNewFinancialInfo = (index, key, value) => {
    const financialInfoList = [...financialInfo];
    financialInfoList[index][key] = value;
    setFinancialInfo(financialInfoList);
  };
  const handleDeleteFinancialInfo = (index) => {
    const financialInfoList = [...financialInfo];
    financialInfoList.splice(index, 1);
    setFinancialInfo(financialInfoList);
  };

  const emptyData = () => {
    setName("");
    setResponsiblePerson("");
    setAddress("");
    setPhone(["رقم الموبايل"]);
    setWhatsapp("");
    setEmail("");
    setCurrentBalance(0);
    setItemsSupplied(["اضف خامة"]);
    setPaymentType("");
    setFinancialInfo([
      { paymentMethodName: "", accountNumber: "", currency: "" },
    ]);
    setNotes("");
  };

  // Function to create a Supplier
  const createSupplier = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const config = await handleGetTokenAndConfig();

    // تحقق من الصلاحيات قبل المتابعة
    if (supplierDataPermission && !supplierDataPermission.create) {
      toast.warn("ليس لديك صلاحية لإنشاء حساب الموردين");
      return;
    }



    const supplierData = {
      name,
      responsiblePerson,
      phone,
      whatsapp,
      email,
      address,
      paymentType,
      itemsSupplied,
      currentBalance,
      financialInfo,
      notes,
    };

    try {
      // إرسال طلب إنشاء المورد
      const response = await axios.post(
        `${apiUrl}/api/supplier/`,
        supplierData,
        config
      );

      if (response && response.status === 201) {
        if (currentBalance > 0) {
          await createOpeningBalanceTransaction(supplierId, currentBalance);
        }

        // إخطار بنجاح العملية
        toast.success("تم إنشاء المورد بنجاح");
        getAllSuppliers();
        emptyData();
      } else {
        throw new Error("فشل في إنشاء المورد");
      }
    } catch (error) {
      setIsLoading(false);
      console.error(error);
      toast.error("فشل في إنشاء المورد");
    } finally {
      setIsLoading(false);
    }
  };

  const createOpeningBalanceTransaction = async (
    supplierId,
    currentBalance
  ) => {
    const config = await handleGetTokenAndConfig();

    const transactionData = {
      supplier: supplierId,
      transactionDate: new Date(),
      transactionType: "OpeningBalance",
      amount: currentBalance,
      previousBalance: 0,
      currentBalance,
      paymentMethod: "",
      notes,
    };

    try {
      const response = await axios.post(
        `${apiUrl}/api/suppliertransaction`,
        transactionData,
        config
      );

      if (response && response.status === 201) {
        toast.success("تم تسجيل معاملة الرصيد الافتتاحي بنجاح");
      } else {
        throw new Error("فشل في تسجيل معاملة الرصيد الافتتاحي");
      }
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ أثناء تسجيل معاملة الرصيد الافتتاحي");
    }
  };

  const updateSupplier = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const config = await handleGetTokenAndConfig();
    try {
      if (supplierDataPermission && !supplierDataPermission.update) {
        toast.warn("ليس لك صلاحية لتعديل حساب الموردين");
        return;
      }

      const updatedSupplierData = {
        name,
        responsiblePerson,
        phone,
        whatsapp,
        email,
        address,
        paymentType,
        itemsSupplied,
        currentBalance,
        financialInfo,
        notes,
      };
      const response = await axios.put(
        apiUrl + "/api/supplier/" + supplierId,
        updatedSupplierData,
        config
      );
      
      if (response) {
        // Notify on success
        toast.success("تم تحديث المورد بنجاح");
        getAllSuppliers();
        emptyData();
      }
    } catch (error) {
      

      // Notify on error
      toast.error("فشل في تحديث المورد");
    } finally {
      setIsLoading(false);
    }
  };

  // Function to delete a supplier
  const deleteSupplier = async (e) => {
    e.preventDefault();
    const config = await handleGetTokenAndConfig();
    try {
      if (supplierDataPermission && !supplierDataPermission.delete) {
        toast.warn("ليس لك صلاحية لحذف حساب الموردين");
        return;
      }
      const response = await axios.delete(
        `${apiUrl}/api/supplier/${supplierId}`,
        config
      );
      if (response.status === 200) {
        
        // Optionally, you may want to update the list of suppliers after deletion
        getAllSuppliers(); // Update the list of suppliers after deletion

        // Notify on success
        toast.success("تم حذف المورد بنجاح");
      }
    } catch (error) {
      

      // Notify on error
      toast.error("فشل في حذف المورد");
    }
  };

  const [AllSuppliers, setAllSuppliers] = useState([]);
  // Function to retrieve all suppliers
  const getAllSuppliers = async () => {
    const config = await handleGetTokenAndConfig();
    try {
      if (supplierDataPermission && !supplierDataPermission.read) {
        toast.warn("ليس لك صلاحية لعرض حسابات الموردين");
        return;
      }
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

  const getOneSuppliers = async (id) => {
    const config = await handleGetTokenAndConfig();
    try {
      if (supplierDataPermission && !supplierDataPermission.read) {
        toast.warn("ليس لك صلاحية لعرض حساب الموردين");
        return;
      }
      const response = await axios.get(`${apiUrl}/api/supplier/${id}`, config);

      if (!response || !response.data) {
        // Handle unexpected response or empty data
        throw new Error("استجابة غير متوقعة أو بيانات فارغة");
      }

      const supplier = response.data;
      if (supplier) {
        setsupplierId(supplier._id);
        setName(supplier.name);
        setResponsiblePerson(supplier.responsiblePerson);
        setAddress(supplier.address);
        setPhone(supplier.phone);
        setWhatsapp(supplier.whatsapp);
        setEmail(supplier.email);
        setCurrentBalance(supplier.currentBalance);
        setItemsSupplied(supplier.itemsSupplied);
        setPaymentType(supplier.paymentType);
        setFinancialInfo(supplier.financialInfo);
        setNotes(supplier.notes);
        toast.success("تم استرداد بيانات المورد بنجاح");
      }

      // Notify on success
    } catch (error) {
      console.error(error);

      // Notify on error
      toast.error("فشل في استرداد بيانات المورد");
    }
  };

  const [AllStockItems, setAllStockItems] = useState([]);

  // Function to retrieve all stock items
  const getStockItems = async () => {
    const config = await handleGetTokenAndConfig();
    try {
      const response = await axios.get(apiUrl + "/api/stockitem/", config);

      if (!response || !response.data) {
        // Handle unexpected response or empty data
        throw new Error("استجابة غير متوقعة أو بيانات فارغة");
      }

      const stockItems = response.data.reverse();
      setAllStockItems(stockItems);

      // Notify on success
      toast.success("تم استرداد عناصر المخزون بنجاح");
    } catch (error) {
      console.error(error);

      // Notify on error
      toast.error("فشل في استرداد عناصر المخزون");
    }
  };

  const [AllCategoryStock, setAllCategoryStock] = useState([]);

  // Function to retrieve all category stock
  const getAllCategoryStock = async () => {
    const config = await handleGetTokenAndConfig();
    try {
      const res = await axios.get(apiUrl + "/api/stockCategory/", config);
      setAllCategoryStock(res.data);
    } catch (error) {
      

      // Notify on error
      toast.error("فشل في استرداد فئة المخزون");
    }
  };

  const searchSupplierByName = (name) => {
    if (!name) {
      getAllSuppliers(); // Reset or get all suppliers if name is empty
      return; // Exit early if name is empty
    }

    const findSupplier = AllSuppliers.filter((supplier) =>
      supplier.fullname.startsWith(name)
    );

    if (findSupplier.length > 0) {
      setAllSuppliers(findSupplier); // Update state with filtered suppliers
    } else {
      setAllSuppliers([]); // Clear the list or show empty state
    }
  };

  // validate phone number
  const validatePhone = (phone, type) => {
    const phoneRegex = /^\+(?:[0-9] ?){6,14}[0-9]$/;

    if (!phoneRegex.test(phone)) {
      toast.error(`⚠️ يجب إدخال ${type} بهذا الشكل: +201000000000`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: "colored",
      });
      setIsLoading(false);
      return false;
    }

    return true;
  };

  useEffect(() => {
    getAllSuppliers();
    getStockItems();
    getAllCategoryStock();
  }, []);

  return (
    <div className="w-100 px-3 d-flex flex-wrap align-itmes-center justify-content-start">
      <div className="table-responsive mt-1">
        <div className="table-wrapper p-3 mw-100">
          <div className="table-title">
            <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
              <div className="text-right">
                <h2>
                  ادارة <b>الموردين</b>
                </h2>
              </div>
              <div className="col-12 col-md-6 p-0 m-0 d-flex flex-wrap aliegn-items-center justify-content-end print-hide">
                <a
                  href="#addSupplierModal"
                  className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-success"
                  data-toggle="modal"
                >
                  <span>اضافه مورد جديد</span>
                </a>

                {/* <a href="#deleteStockItemModal" className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-danger" data-toggle="modal"> <span>حذف</span></a> */}
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
                  اسم المورد
                </label>
                <input
                  type="text"
                  className="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => searchSupplierByName(e.target.value)}
                />
              </div>
              {/* <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                          <label className="form-label text-wrap text-right fw-bolder p-0 m-0">نوع الاوردر</label>
                          <select className="form-control border-primary m-0 p-2 h-auto" onChange={(e) => searchByaction(e.target.value)} >
                            <option value={""}>الكل</option>
                            <option value="Purchase" >Purchase</option>
                            <option value="Return" >Return</option>
                            <option value="Expense" >Expense</option>
                            <option value="Wastage" >Wastage</option>
                          </select>
                        </div> */}
              {/* <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                          <label className="form-label text-wrap text-right fw-bolder p-0 m-0">Location</label>
                          <select className="form-control border-primary m-0 p-2 h-auto">
                            <option>All</option>
                            <option>Berlin</option>
                            <option>London</option>
                            <option>Madrid</option>
                            <option>New York</option>
                            <option>Paris</option>
                          </select>
                        </div>
                        <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                          <label className="form-label text-wrap text-right fw-bolder p-0 m-0">Status</label>
                          <select className="form-control border-primary m-0 p-2 h-auto">
                            <option>Any</option>
                            <option>Delivered</option>
                            <option>Shipped</option>
                            <option>Pending</option>
                            <option>Cancelled</option>
                          </select>
                        </div>
                        <span className="filter-icon"><i className="fa fa-filter"></i></span> */}
            </div>
          </div>
          <table className="table table-striped table-hover">
            <thead>
              <tr>
                <th>م</th>
                <th>الاسم</th>
                <th>المسؤل</th>
                <th>الاصناف</th>
                <th>الرصيد الحالي</th>
                <th>العنوان</th>
                <th>الموبايل</th>
                <th>الواتس اب</th>
                <th>الايميل</th>
                <th>البيانات المالية</th>
                <th>طريقه الدفع</th>
                <th>الملاحظات</th>
                <th>اضيف بواسطه</th>
                <th>تاريخ الاضافه</th>
                <th>اجراءات</th>
              </tr>
            </thead>
            <tbody>
              {AllSuppliers &&
                AllSuppliers.map((supplier, i) => {
                  if ((i >= startPagination) & (i < endPagination)) {
                    return (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{supplier.name}</td>
                        <td>{supplier.responsiblePerson}</td>
                        <td>
                          {supplier.itemsSupplied.length > 0
                            ? supplier.itemsSupplied
                                .map((item) => `${item.itemName}`)
                                .join(" - ")
                            : "لا يوجد"}
                        </td>
                        <td>{supplier.currentBalance}</td>
                        <td>{supplier.address}</td>
                        <td>
                          {supplier.phone.length > 0
                            ? supplier.phone
                                .map((phone) => `${phone}`)
                                .join(" - ")
                            : "لا يوجد"}
                        </td>
                        <td>
                          {supplier.whatsapp ? supplier.whatsapp : "لا يوجد"}
                        </td>
                        <td>{supplier.email ? supplier.email : "لا يوجد"}</td>
                        <td>
                          {supplier.financialInfo
                            ? supplier.financialInfo
                                .map(
                                  (
                                    financialInfo
                                  ) => `[${financialInfo.paymentMethodName}
                                : ${financialInfo.accountNumber} : ${financialInfo.currency}]`
                                )
                                .join(" - ")
                            : "لا يوجد"}
                        </td>
                        <td>{supplier.paymentType}</td>
                        <td>{supplier.notes}</td>
                        <td>{supplier.createdBy?.fullname}</td>
                        <td>{formatDateTime(supplier.createdAt)}</td>
                        <td>
                          {supplierDataPermission &&
                            supplierDataPermission.update && (
                              <button
                                data-target="#editSupplierModal"
                                className="btn btn-sm btn-primary ml-2 "
                                data-toggle="modal"
                                onClick={() => {
                                  getOneSuppliers(supplier._id);
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

                          {supplierDataPermission &&
                            supplierDataPermission.delete && (
                              <button
                                data-target="#deleteSupplierModal"
                                className="btn btn-sm btn-danger"
                                data-toggle="modal"
                                onClick={() => setsupplierId(supplier._id)}
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
                })}
            </tbody>
          </table>
          <div className="clearfix">
            <div className="hint-text text-dark">
              عرض{" "}
              <b>
                {AllSuppliers.length > endPagination
                  ? endPagination
                  : AllSuppliers.length}
              </b>{" "}
              من <b>{AllSuppliers.length}</b> عنصر
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

      <div id="addSupplierModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={createSupplier}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">إضافة مورد</h4>
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
                <div className="form-group w-100 h-auto px-3 d-flex flex-wrap align-itmes-center justify-content-start col-12  col-md-6 ">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    اسم المورد
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    required
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="form-group w-100 h-auto px-3 d-flex flex-wrap align-itmes-center justify-content-start col-12  col-md-6 ">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    اسم المسؤل
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    required
                    onChange={(e) => setResponsiblePerson(e.target.value)}
                  />
                </div>

                <div className="form-group w-100 h-auto px-3 d-flex flex-wrap align-itmes-center justify-content-start col-12  col-md-6 ">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الواتس اب
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    onChange={(e) => setWhatsapp(e.target.value)}
                  />
                </div>
                <div className="form-group w-100 h-auto px-3 d-flex flex-wrap align-itmes-center justify-content-start col-12  col-md-6 ">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الايميل
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="form-group w-100 h-auto px-3 d-flex flex-wrap align-itmes-center justify-content-start col-12  col-md-6 ">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    العنوان
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    required
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div className="form-group w-100 h-auto px-3 d-flex flex-wrap align-itmes-center justify-content-start col-12  col-md-6 ">
                  {phone &&
                    phone.map((phoneNumber, index) => (
                      <React.Fragment key={index}>
                        <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                          الموبايل {index + 1}
                        </label>
                        <input
                          type="text"
                          className="form-control border-primary col-7"
                          placeholder={phoneNumber}
                          required
                          onChange={(e) => handleNewPhone(index, e)}
                        />
                        <button
                          type="button"
                          className="btn col-2 btn-danger h-100 btn btn-sm"
                          onClick={() => handleDeletePhone(index)}
                        >
                          حذف
                        </button>
                      </React.Fragment>
                    ))}
                  <button
                    type="button"
                    className="mt-1 btn w-100 btn-success"
                    onClick={handleAddPhone}
                  >
                    إضافة موبايل
                  </button>
                </div>
                <div className="form-group w-100 h-auto px-3 d-flex flex-wrap align-itmes-center justify-content-start col-12  col-md-6 ">
                  {itemsSupplied.map((item, index) => (
                    <React.Fragment key={index}>
                      <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                        الاصناف الموردة {index + 1}
                      </label>
                      <select
                        className="form-select border-primary col-7"
                        onChange={(e) => handleNewItemsSupplied(index, e)}
                      >
                        <option value="">اخترالصنف</option>
                        {AllStockItems.map((stockItem) => {
                          return (
                            <option key={stockItem._id} value={stockItem._id}>
                              {stockItem.itemName}
                            </option>
                          );
                        })}
                      </select>
                      <button
                        type="button"
                        className="btn col-2 btn-danger h-100 btn btn-sm"
                        onClick={() => handleDeleteItemsSupplied(index)}
                      >
                        حذف
                      </button>
                    </React.Fragment>
                  ))}
                  <button
                    type="button"
                    className="mt-1 btn w-100 btn-success"
                    onClick={handleAddItemsSupplied}
                  >
                    إضافة صنف مورد
                  </button>
                </div>
                <div className="form-group w-100 h-auto px-3 d-flex flex-wrap align-itmes-center justify-content-start col-12  col-md-6 ">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    نوع الدفع
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    required
                    onChange={(e) => setPaymentType(e.target.value)}
                  >
                    <option value="">اختر...</option>
                    <option value="Cash">كاش</option>
                    <option value="Installments">تقسيط</option>
                  </select>
                </div>
                <div className="form-group w-100 h-auto px-3 d-flex flex-wrap align-itmes-center justify-content-start col-12  col-md-6 ">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الرصيد الافتتاحي
                  </label>
                  <input
                    type="number"
                    className="form-control border-primary m-0 p-2 h-auto"
                    onChange={(e) => setCurrentBalance(e.target.value)}
                  />
                </div>
                <div className="form-group w-100 h-auto px-3 d-flex flex-wrap align-itmes-center justify-content-start col-12  col-md-6 ">
                  {financialInfo.map((info, index) => (
                    <React.Fragment key={index}>
                      <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                        المعلومات المالية {index + 1}
                      </label>
                      <input
                        type="text"
                        className="form-control border-primary"
                        value={info.paymentMethodName}
                        placeholder="اسم وسيلة الدفع"
                        required
                        onChange={(e) =>
                          handleNewFinancialInfo(
                            index,
                            "paymentMethodName",
                            e.target.value
                          )
                        }
                      />
                      <input
                        type="text"
                        className="form-control border-primary"
                        value={info.accountNumber}
                        placeholder="رقم الحساب"
                        onChange={(e) =>
                          handleNewFinancialInfo(
                            index,
                            "accountNumber",
                            e.target.value
                          )
                        }
                      />
                      <select
                        className="form-control border-primary"
                        value={info.currency}
                        onChange={(e) =>
                          handleNewFinancialInfo(
                            index,
                            "currency",
                            e.target.value
                          )
                        }
                      >
                        <option value="">اختر العملة</option>
                        {currencyList.map((currency) => (
                          <option key={currency} value={currency}>
                            {currency}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn col-2 btn-danger h-100 btn btn-sm"
                        onClick={() => handleDeleteFinancialInfo(index)}
                      >
                        حذف
                      </button>
                    </React.Fragment>
                  ))}
                  <button
                    type="button"
                    className="mt-1 btn w-100 btn-success"
                    onClick={handleAddfinancialInfo}
                  >
                    إضافة معلومات مالية
                  </button>
                </div>
                <div className="form-group w-100 h-auto px-3 d-flex flex-wrap align-itmes-center justify-content-start col-12  col-md-6 ">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    ملاحظات
                  </label>
                  <textarea
                    className="form-control border-primary m-0 p-2 h-auto"
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer d-flex flex-nowrap align-items-center justify-content-between m-0 p-1">
                <input
                  type="submit"
                  className="btn btn-success col-6 h-100 px-2 py-3 m-0"
                  value="إضافة"
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

      <div id="editSupplierModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={(e) => updateSupplier(e)}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">تعديل مورد</h4>
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
                <div className="form-group w-100 h-auto px-3 d-flex flex-wrap align-itmes-center justify-content-start col-12  col-md-6 ">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    اسم المورد
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    defaultValue={name}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="form-group w-100 h-auto px-3 d-flex flex-wrap align-itmes-center justify-content-start col-12  col-md-6 ">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    اسم المسؤل
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    defaultValue={responsiblePerson}
                    value={responsiblePerson}
                    onChange={(e) => setResponsiblePerson(e.target.value)}
                  />
                </div>

                <div className="form-group w-100 h-auto px-3 d-flex flex-wrap align-itmes-center justify-content-start col-12  col-md-6 ">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الواتس اب
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    defaultValue={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                  />
                </div>
                <div className="form-group w-100 h-auto px-3 d-flex flex-wrap align-itmes-center justify-content-start col-12  col-md-6 ">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الايميل
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    defaultValue={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="form-group w-100 h-auto px-3 d-flex flex-wrap align-itmes-center justify-content-start col-12  col-md-6 ">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    العنوان
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    defaultValue={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div className="form-group w-100 h-auto px-3 d-flex flex-wrap align-itmes-center justify-content-start col-12  col-md-6 ">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    نوع الدفع
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    defaultValue={paymentType}
                    onChange={(e) => setPaymentType(e.target.value)}
                  >
                    <option value="">
                      {paymentType === "Cash" ? "كاش" : "تقسيط"}
                    </option>
                    <option value="Cash">كاش</option>
                    <option value="Installments">تقسيط</option>
                  </select>
                </div>
                <div className="form-group w-100 h-auto px-3 d-flex flex-wrap align-itmes-center justify-content-start col-12  col-md-6 ">
                  {phone &&
                    phone.map((phoneNumber, index) => (
                      <React.Fragment key={index}>
                        <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                          الموبايل {index + 1}
                        </label>
                        <input
                          type="text"
                          className="form-control border-primary col-7"
                          defaultValue={phoneNumber}
                          onChange={(e) => handleNewPhone(index, e)}
                        />
                        <button
                          type="button"
                          className="btn col-2 btn-danger h-100 btn btn-sm"
                          onClick={() => handleDeletePhone(index)}
                        >
                          حذف
                        </button>
                      </React.Fragment>
                    ))}
                  <button
                    type="button"
                    className="mt-1 btn w-100 btn-success"
                    onClick={handleAddPhone}
                  >
                    إضافة موبايل
                  </button>
                </div>
                <div className="form-group w-100 h-auto px-3 d-flex flex-wrap align-itmes-center justify-content-start col-12  col-md-6 ">
                  {itemsSupplied.map((item, index) => (
                    <React.Fragment key={index}>
                      <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                        الاصناف الموردة {index + 1}
                      </label>
                      <select
                        className="form-select border-primary col-7"
                        onChange={(e) => handleNewItemsSupplied(index, e)}
                      >
                        <option value="">{item ? item.itemName : ""}</option>
                        {AllStockItems.map((stockItem) => {
                          return (
                            <option key={stockItem._id} value={stockItem._id}>
                              {stockItem.itemName}
                            </option>
                          );
                        })}
                      </select>
                      <button
                        type="button"
                        className="btn col-2 btn-danger h-100 btn btn-sm"
                        onClick={() => handleDeleteItemsSupplied(index)}
                      >
                        حذف
                      </button>
                    </React.Fragment>
                  ))}
                  <button
                    type="button"
                    className="mt-1 btn w-100 btn-success"
                    onClick={handleAddItemsSupplied}
                  >
                    إضافة صنف مورد
                  </button>
                </div>
                <div className="form-group w-100 h-auto px-3 d-flex flex-wrap align-itmes-center justify-content-start col-12  col-md-6 ">
                  {financialInfo.map((info, index) => (
                    <React.Fragment key={index}>
                      <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                        المعلومات المالية {index + 1}
                      </label>
                      <input
                        type="text"
                        className="form-control border-primary"
                        defaultValue={info.paymentMethodName}
                        placeholder="اسم وسيلة الدفع"
                        onChange={(e) =>
                          handleNewFinancialInfo(
                            index,
                            "paymentMethodName",
                            e.target.value
                          )
                        }
                      />
                      <input
                        type="text"
                        className="form-control border-primary"
                        defaultValue={info.accountNumber}
                        placeholder="رقم الحساب"
                        onChange={(e) =>
                          handleNewFinancialInfo(
                            index,
                            "accountNumber",
                            e.target.value
                          )
                        }
                      />
                      <select
                        className="form-control border-primary"
                        defaultValue={info.currency}
                        onChange={(e) =>
                          handleNewFinancialInfo(
                            index,
                            "currency",
                            e.target.value
                          )
                        }
                      >
                        <option value="">اختر العملة</option>
                        {currencyList.map((currency) => (
                          <option key={currency} value={currency}>
                            {currency}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn col-2 btn-danger h-100 btn btn-sm"
                        onClick={() => handleDeleteFinancialInfo(index)}
                      >
                        حذف
                      </button>
                    </React.Fragment>
                  ))}
                  <button
                    type="button"
                    className="mt-1 btn w-100 btn-success"
                    onClick={handleAddfinancialInfo}
                  >
                    إضافة معلومات مالية
                  </button>
                </div>
                <div className="form-group w-100 h-auto px-3 d-flex flex-wrap align-itmes-center justify-content-start col-12  col-md-6 ">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    ملاحظات
                  </label>
                  <textarea
                    className="form-control border-primary m-0 p-2 h-auto"
                    defaultValue={notes}
                    onChange={(e) => setNotes(e.target.value)}
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

      <div id="deleteSupplierModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={deleteSupplier}>
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
      </div>
    </div>
  );
};

export default Suppliers;
