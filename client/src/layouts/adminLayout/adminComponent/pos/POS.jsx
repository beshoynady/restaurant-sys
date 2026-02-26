import React, { useState, useEffect, useRef, useContext } from "react";
import { dataContext } from "../../../../App";
import { useReactToPrint } from "react-to-print";
import { toast } from "react-toastify";
import axios from "axios";

import "./POS.css";
import POSCard from "./POS-Card";
import InvoiceComponent from "../invoice/invoice";

const POS = () => {
  const {
    brandInfo,
    setsalesTax,
    salesTax,
    setserviceTax,
    serviceTax,
    clientname,
    setclientname,
    clientNotes,
    setclientNotes,
    clientphone,
    setclientphone,
    clientaddress,
    setclientaddress,
    deliveryAreaId,
    setdeliveryAreaId,
    deliveryFee,
    setdeliveryFee,
    allProducts,
    allMenuCategories,
    allTable,
    employeeLoginInfo,
    setMenuCategoryId,
    deleteItemFromCart,
    incrementProductQuantity,
    decrementProductQuantity,
    setproductNote,
    addNoteToProduct,
    setitemsInCart,
    itemsInCart,
    costOrder,
    createWaiterOrderForTable,
    createcashierOrder,
    lastInvoiceByCashier,
    myOrder,
    listProductsOrder,
    orderTotal,
    orderSubtotal,
    ordertax,
    orderdeliveryFee,
    setdiscount,
    setaddition,
    discount,
    addition,
    getOrderProductForTable,
    itemId,
    addExtrasToProduct,
    handleAddProductExtras,
    productExtras,
    setproductExtras,
    orderDetalisBySerial,
    getOrderDetailsBySerial,
    updateOrder,
    productOrderToUpdate,
    putNumOfPaid,
    handlePayExtras,
    splitInvoice,
    subtotalSplitOrder,
    apiUrl,
    handleGetTokenAndConfig,
  } = useContext(dataContext);

  const [showModal, setShowModal] = useState(false);

  const [ExtrasIsPaid, setExtrasIsPaid] = useState([]);
  const [serial, setserial] = useState("");
  const [sizeId, setsizeId] = useState("");

  const [tableID, settableID] = useState("");
  // const [itemId, setitemId] = useState([])
  const [noteArea, setnoteArea] = useState(false);
  const [productId, setproductId] = useState("");
  const [areas, setAreas] = useState([]);
  const [extraArea, setextraArea] = useState(false);

  const [ordertype, setordertype] = useState("");

  const [isClientFounded, setisClientFounded] = useState(false);
  const [deliveryAreaName, setdeliveryAreaName] = useState("");
  const [isVarified, setisVarified] = useState(false);
  const [refusesOrders, setrefusesOrders] = useState(false);

  const [adddiscount, setadddiscount] = useState(false);
  const [addaddition, setaddaddition] = useState(false);

  const deleteOrderdetalis = () => {
    setclientname("");
    setclientaddress("");
    setclientphone("");
    setordertype("");
    settableID("");
    setaddaddition(false);
    setadddiscount(false);
  };

  const handelcustomerDeliveryArea = (area) => {
    const deliveryArea = JSON.parse(area);
    //
    setdeliveryAreaId(deliveryArea._id);
    setdeliveryAreaName(deliveryArea.name);
    setdeliveryFee(deliveryArea.delivery_fee);
  };

  const getAllDeliveryAreas = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/deliveryarea`);
      const data = await response.data;

      if (data) {
        setAreas(data);
      } else {
        toast.error(
          "لا يوجد بيانات لمنطقه التوصيل ! اضف بيانات منطقه التوصيل "
        );
      }
    } catch (error) {
      toast.error("حدث خطأ اثناء جلب بيانات منطقه التوصيل! اعد تحميل الصفحة");
    }
  };

  const [product, setproduct] = useState();
  const getProductDitalis = (allproducts, productId) => {
    const filter = allproducts.filter(
      (product) => product._id === productId
    )[0];
    setproduct(filter);
  };

  const [selectedButtonIndex, setSelectedButtonIndex] = useState(1);
  const [customerId, setcustomerId] = useState("");

  const getCustomerByPhone = async (phone) => {
    if (!phone) {
      toast.error("ادخل رقم الموبايل");
      return;
    }
    if (phone.length < 11) {
      return;
    }
    try {
      const config = await handleGetTokenAndConfig();
      const response = await axios.get(
        `${apiUrl}/api/customer/phone/${phone}`,
        config
      );

      const customer = response.data;

      if (customer) {
        setisClientFounded(true);
        setcustomerId(customer._id);
        setclientname(customer.name);
        setclientaddress(customer.address);
        setclientphone(customer.phone);
        setdeliveryFee(customer.deliveryArea?.delivery_fee);
        setdeliveryAreaName(customer.deliveryArea?.name);
        setclientNotes(customer.notes);
        setisVarified(customer.isVarified);
        setrefusesOrders(customer.refusesOrders);
        toast.success("تم تحديث بيانات العميل بنجاح.");
      } else {
        setisClientFounded(false);
        toast.info("لم يتم العثور على بيانات العميل.");
      }
    } catch (error) {
      if (
        error.response &&
        error.response.data &&
        error.response.data.message === "Customer not found"
      ) {
        console.info(error);
        toast.info("هذا العميل ليس له بيانات.");
      } else {
        console.error("Error updating customer:", error);
        toast.error("حدث خطأ أثناء جلب بيانات العميل.");
      }
    }
  };

  const createCustomer = async (e) => {
    e.preventDefault();

    try {
      const config = await handleGetTokenAndConfig();
      if (!clientname && !clientphone && !deliveryAreaId && !clientaddress) {
        toast.warn("تاكد من الاسم و الموبايل و منطقه التوصل و العنوان ");
      }
      //
      const response = await axios.post(
        `${apiUrl}/api/customer`,
        {
          name: clientname,
          phone: clientphone,
          deliveryArea: deliveryAreaId,
          address: clientaddress,
          notes: clientNotes,
          isVarified: false,
          refusesOrders: false,
        },
        config
      );
      toast.success("تم حفظ بيانات العميل بنجاح.");
    } catch (error) {
      console.error("Error creating customer:", error);
      toast.error("حدث خطأ أثناء حفظ بيانات العميل.");
    }
  };

  const updateCustomer = async (e) => {
    e.preventDefault();
    try {
      const config = await handleGetTokenAndConfig();

      const response = await axios.put(
        `${apiUrl}/api/customer/${customerId}`,
        {
          name: clientname,
          phone: clientphone,
          deliveryArea: deliveryAreaId,
          address: clientaddress,
          notes: clientNotes,
          isVarified: false,
          refusesOrders: false,
        },
        config
      );
      toast.success("تم تحديث بيانات العميل بنجاح.");
    } catch (error) {
      console.error("Error updating customer:", error);
      toast.error("حدث خطأ أثناء تحديث بيانات العميل.");
    }
  };

  const [paymentMethod, setpaymentMethod] = useState("");
  const [registers, setregisters] = useState([]);
  const [registerSelected, setregisterSelected] = useState("");

  const getCashRegistersByEmployee = async (id) => {
    if (!id) {
      return;
    }

    try {
      const config = await handleGetTokenAndConfig();

      const response = await axios.get(
        `${apiUrl}/api/cashregister/employee/${id}`,
        config
      );
      const registers = response.data;
      //
      if (registers.length === 0) {
        toast.info("لم يتم العثور على حسابات النقدية لهذا الموظف");
        return;
      }
      if (registers.length > 1) {
        setregisters(registers);
      } else if (registers.length === 1) {
        setregisterSelected(registers[0]);
      }
    } catch (error) {
      console.error({ error });
      toast.error("حدث خطأ أثناء جلب حسابات النقدية");
    }
  };

  const [totalOrder, settotalOrder] = useState(0);

  const [paidAmount, setPaidAmount] = useState(0);
  const [remainingAmount, setRemainingAmount] = useState(0);
  const [cashOutAmount, setCashOutAmount] = useState(0);
  const [revenueAmount, setRevenueAmount] = useState(0);

  useEffect(() => {
    const remaining = paidAmount - myOrder.total;
    const revenue = paidAmount - cashOutAmount;

    setRemainingAmount(remaining > 0 ? remaining : 0);
    setRevenueAmount(revenue > 0 ? revenue : 0);
  }, [paidAmount, cashOutAmount]);

  const RevenueRecording = async (total, revenue) => {
    try {
      const config = await handleGetTokenAndConfig();
      if (registerSelected) {
        // احسب الرصيد المحدث
        const oldBalance = registers.find(
          (register) => register._id === registerSelected
        ).balance;
        const updatedBalance = oldBalance + revenue;

        // إنشاء سجل حركة نقدية
        const cashMovement = await axios.post(
          `${apiUrl}/api/cashMovement/`,
          {
            registerId: registerSelected,
            createdBy: employeeLoginInfo.id,
            amount: revenue,
            type: "Revenue",
            description: ` فاتورة بيع رقم ${myOrder.serial} باجمالي  ${total}`,
          },
          config
        );
        const cashMovementData = cashMovement.data;
        if (cashMovement) {
          toast.success("تم تسجيل حركه الخزينه");
          const updateCashRegister = await axios.put(
            `${apiUrl}/api/cashregister/${registerSelected}`,
            {
              balance: updatedBalance,
            },
            config
          );
          const updateCashRegisterData = updateCashRegister.data;
          if (updateCashRegisterData) {
            toast.success("تم اضافه اليراد لرصيد الخزينه بنجاح");
          } else {
            const deletecashMovement = await axios.delete(
              `${apiUrl}/api/cashMovement/${cashMovementData._id}`,
              config
            );
            toast.warn(
              "حدث خطا اثناء تسجيل ايراد الفاتوره بالخزينه يرجي تسجيلها "
            );
          }
        }
      }
    } catch (error) {
      // إخطار المستخدم بالفشل
      toast.error("فشل في تسجيل الإيراد");
    }
  };

  const changePaymentorderstauts = async (e) => {
    e.preventDefault();
    try {
      const config = await handleGetTokenAndConfig();
      if (!registerSelected) {
        toast.warn("لم يتم التعرف علي خزينه لتسجيل فيها اليرادات");
        return;
      }
      const id = myOrder._id;
      const payment_status = "Paid";
      const isActive = true;
      const cashier = employeeLoginInfo.id;

      const changePaymentstauts = await axios.put(`${apiUrl}/api/order/${id}`, {
        payment_status,
        paymentMethod,
        isActive,
        cashier,
      });
      const changePaymentstautsData = changePaymentstauts.data;
      if (changePaymentstautsData) {
        await RevenueRecording(changePaymentstautsData.total, revenueAmount);
        // عرض رسالة نجاح
        toast.success("تم تغيير حالة الدفع بنجاح");
      }
    } catch (error) {
      // معالجة الخطأ وعرض رسالة خطأ
      console.error("خطأ في تغيير حالة الدفع:", error);
      toast.error("حدث خطأ أثناء تغيير حالة الدفع");
    }
  };

  useEffect(() => {
    const roundedSalesTax = (
      (costOrder * brandInfo.salesTaxRate) /
      100
    ).toFixed(2);
    setsalesTax(parseFloat(roundedSalesTax));
    if (ordertype === "Dine-in") {
      const roundedServiceTax = (
        (costOrder * brandInfo.serviceTaxRate) /
        100
      ).toFixed(2);
      setserviceTax(parseFloat(roundedServiceTax));
    } else {
      setserviceTax(0);
    }
  }, [costOrder, ordertype]);

  useEffect(() => {
    settotalOrder(
      costOrder > 0
        ? costOrder + salesTax + serviceTax + deliveryFee + addition - discount
        : 0
    );
  }, [
    costOrder,
    ordertype,
    salesTax,
    serviceTax,
    deliveryFee,
    discount,
    addition,
  ]);

  useEffect(() => {
    getAllDeliveryAreas();
    employeeLoginInfo && getCashRegistersByEmployee(employeeLoginInfo.id);
  }, []);

  return (
    <section className="pos-section">
      <div className="pos-content">
        <div className="categ-menu">
          <div className="pos-menu">
            <POSCard />
          </div>
          <nav className="pos-category">
            <ul className="category-ul">
              {allMenuCategories &&
                allMenuCategories.map((c, i) => (
                  <li
                    key={i}
                    className="category-li"
                    onClick={() => setMenuCategoryId(c._id)}
                  >
                    <a className="category-pos-btn ">{c.name}</a>
                  </li>
                ))}
            </ul>
          </nav>
        </div>
      </div>

      {/* cart section */}
      <div
        className="container-fluid d-flex flex-column justify-content-between align-items-stretch align-content-between flex-nowrap "
        style={{ width: "450px", height: "100%", padding: "0", margin: "0" }}
      >
        <div className="row w-100 p-0 m-0">
          <div
            className="btn-group col-12 p-0 m-0"
            role="group"
            aria-label="Order Type"
            style={{ height: "50px" }}
          >
            <a
              href="#typeOrderModal"
              className="btn d-flex align-items-center justify-content-center btn-primary col-4 p-0 m-0"
              data-toggle="modal"
              onClick={() => {
                setordertype("Dine-in");
              }}
              style={{ height: "50px" }}
            >
              الصالة
            </a>
            <a
              href="#typeOrderModal"
              className="btn d-flex align-items-center justify-content-center btn-success col-4 p-0 m-0"
              data-toggle="modal"
              onClick={() => {
                setordertype("Takeaway");
              }}
              style={{ height: "50px" }}
            >
              التيك أوي
            </a>
            <a
              href="#typeOrderModal"
              className="btn d-flex align-items-center justify-content-center btn-danger col-4 p-0 m-0"
              data-toggle="modal"
              onClick={() => {
                setordertype("Delivery");
              }}
              style={{ height: "50px" }}
            >
              التوصيل
            </a>
          </div>
        </div>

        <div className="row w-100 h-50 p-1 m-0 overflow-auto">
          <div className="col-12 overflow-auto p-0 m-0">
            {itemsInCart.length > 0
              ? itemsInCart.map((item, index) => (
                  <div className="card mb-3" key={index}>
                    {/* extraArea */}

                    {product &&
                    item.sizeId &&
                    sizeId === item.sizeId &&
                    extraArea === true &&
                    product.sizes.filter((size) => size._id === item.sizeId)[0]
                      .sizeQuantity > 0 ? (
                      <div
                        className="position-absolute w-100 h-auto top-0 start-0 bg-white rounded-3 d-flex flex-column align-items-center justify-content-center overflow-hidden"
                        style={{ zIndex: 10 }}
                      >
                        <form
                          onSubmit={(e) => {
                            if (product.extras.length > 0) {
                              addExtrasToProduct(e, product._id, item.sizeId);
                            }
                            setSelectedButtonIndex(1);
                            setextraArea(!extraArea);
                          }}
                          className="w-100 h-100 top-0 start-0 bg-white rounded-3 d-flex flex-column align-items-center justify-content-between m-0 p-0"
                        >
                          {/* أزرار الأصناف */}
                          <div
                            className="d-flex align-items-center justify-content-center flex-wrap"
                            style={{ width: "100%", height: "auto" }}
                          >
                            {Array.from({
                              length: product.sizes.filter(
                                (size) => size._id === item.sizeId
                              )[0]?.sizeQuantity,
                            }).map((_, ind) => (
                              <div key={ind} style={{ margin: "5px" }}>
                                <button
                                  type="button"
                                  className="h-100 btn btn-info"
                                  onClick={() =>
                                    setSelectedButtonIndex(ind + 1)
                                  }
                                >
                                  {ind + 1}
                                </button>
                              </div>
                            ))}
                          </div>

                          <div
                            className="form-group d-flex flex-wrap mt-1"
                            style={{
                              width: "100%",
                              height: "50%",
                              padding: "0",
                              margin: "0",
                            }}
                          >
                            {Array.from({
                              length: product.sizes.filter(
                                (size) => size._id === item.sizeId
                              )[0].sizeQuantity,
                            }).map(
                              (_, ind) =>
                                selectedButtonIndex === ind + 1 && (
                                  <div
                                    key={ind}
                                    className="form-group w-100 h-100 d-flex align-items-start justify-content-start flex-wrap"
                                    style={{
                                      padding: "5px",
                                      overflowY: "auto",
                                    }}
                                  >
                                    {product.extras.map((extra, i) => (
                                      <div
                                        className="form-check form-check-flat mb-1 d-flex align-items-center"
                                        key={i}
                                        style={{
                                          width: "50%",
                                          paddingLeft: "5px",
                                          scrollbarWidth: "thin",
                                        }}
                                      >
                                        <input
                                          type="checkbox"
                                          className="form-check-input "
                                          value={extra._id}
                                          checked={
                                            (productExtras &&
                                              productExtras[ind] &&
                                              productExtras[
                                                ind
                                              ].extraDetails.some(
                                                (detail) =>
                                                  detail.extraId === extra._id
                                              )) ||
                                            (product.sizes.filter(
                                              (size) => size._id === item.sizeId
                                            )[0].extrasSelected &&
                                              product.sizes.filter(
                                                (size) =>
                                                  size._id === item.sizeId
                                              )[0].extrasSelected[ind] &&
                                              product.sizes
                                                .filter(
                                                  (size) =>
                                                    size._id === item.sizeId
                                                )[0]
                                                .extrasSelected[
                                                  ind
                                                ].extraDetails.some(
                                                  (detail) =>
                                                    detail.extraId === extra._id
                                                ))
                                          }
                                          onChange={(e) =>
                                            handleAddProductExtras(extra, ind)
                                          }
                                        />
                                        <label
                                          className="form-check-label text-dark mr-4"
                                          style={{
                                            fontSize: "12px",
                                            fontWeight: "900",
                                          }}
                                          onClick={(e) =>
                                            handleAddProductExtras(extra, ind)
                                          }
                                        >
                                          {extra.name} - {extra.price} ج
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                )
                            )}
                          </div>
                          <div
                            className="note-btn d-flex align-items-center justify-content-center w-100 mt-2"
                            style={{ height: "40px" }}
                          >
                            <button
                              className="h-100 btn btn-success rounded-2 me-2"
                              style={{ width: "50%" }}
                            >
                              تأكيد
                            </button>
                            <button
                              type="button"
                              onClick={() => setextraArea(!extraArea)}
                              className="h-100 btn btn-danger rounded-2"
                              style={{ width: "50%" }}
                            >
                              إلغاء
                            </button>
                          </div>
                        </form>
                      </div>
                    ) : product &&
                      !item.sizeId &&
                      product._id &&
                      product._id === item.productId &&
                      extraArea === true &&
                      product.quantity > 0 ? (
                      <div
                        className="position-absolute w-100 h-auto top-0 start-0 bg-white rounded-3 d-flex flex-column align-items-center justify-content-center overflow-hidden"
                        style={{ zIndex: 10 }}
                      >
                        <form
                          onSubmit={(e) => {
                            if (product.extras.length > 0) {
                              addExtrasToProduct(e, product._id, sizeId);
                            }
                            setSelectedButtonIndex(1);
                            setextraArea(!extraArea);
                          }}
                          className="w-100 h-100 top-0 start-0 bg-white rounded-3 d-flex flex-column align-items-center justify-content-between m-0 p-0"
                        >
                          {/* أزرار الأصناف */}
                          <div
                            className="d-flex align-items-center justify-content-center flex-wrap"
                            style={{ width: "100%", height: "auto" }}
                          >
                            {Array.from({ length: product.quantity }).map(
                              (_, ind) => (
                                <div key={ind} style={{ margin: "5px" }}>
                                  <button
                                    type="button"
                                    className="h-100 btn btn-info"
                                    onClick={() =>
                                      setSelectedButtonIndex(ind + 1)
                                    }
                                  >
                                    {ind + 1}
                                  </button>
                                </div>
                              )
                            )}
                          </div>

                          <div
                            className="form-group d-flex flex-wrap mt-1"
                            style={{
                              width: "100%",
                              height: "50%",
                              padding: "0",
                              margin: "0",
                            }}
                          >
                            {Array.from({ length: product.quantity }).map(
                              (_, ind) =>
                                selectedButtonIndex === ind + 1 && (
                                  <div
                                    key={ind}
                                    className="form-group w-100 h-100 d-flex align-items-start justify-content-start flex-wrap"
                                    style={{
                                      padding: "5px",
                                      overflowY: "scroll",
                                    }}
                                  >
                                    {product.extras &&
                                      product.extras.map((extra, i) => (
                                        <div
                                          className="form-check form-check-flat mb-1 d-flex align-items-center"
                                          key={i}
                                          style={{
                                            width: "50%",
                                            paddingLeft: "5px",
                                            scrollbarWidth: "thin",
                                          }}
                                        >
                                          {}
                                          <input
                                            type="checkbox"
                                            className="form-check-input "
                                            value={extra._id}
                                            defaultChecked={
                                              (productExtras &&
                                                productExtras[ind] &&
                                                productExtras[
                                                  ind
                                                ].extraDetails.some(
                                                  (detail) =>
                                                    detail.extraId === extra._id
                                                )) ||
                                              (product.extrasSelected &&
                                                product.extrasSelected[ind] &&
                                                product.extrasSelected[
                                                  ind
                                                ].extraDetails.some(
                                                  (detail) =>
                                                    detail.extraId === extra._id
                                                ))
                                            }
                                            onChange={(e) =>
                                              handleAddProductExtras(extra, ind)
                                            }
                                          />
                                          <label
                                            className="form-check-label text-dark mr-4"
                                            style={{
                                              fontSize: "12px",
                                              fontWeight: "900",
                                            }}
                                            onClick={(e) =>
                                              handleAddProductExtras(extra, ind)
                                            }
                                          >
                                            {`${extra.name} - ${extra.price} ج`}
                                          </label>
                                        </div>
                                      ))}
                                  </div>
                                )
                            )}
                          </div>
                          <div
                            className="note-btn d-flex align-items-center justify-content-center w-100 mt-2"
                            style={{ height: "40px" }}
                          >
                            <button
                              className="h-100 btn btn-success rounded-2 me-2"
                              style={{ width: "50%" }}
                            >
                              تأكيد
                            </button>
                            <button
                              type="button"
                              onClick={() => setextraArea(!extraArea)}
                              className="h-100 btn btn-danger rounded-2"
                              style={{ width: "50%" }}
                            >
                              إلغاء
                            </button>
                          </div>
                        </form>
                      </div>
                    ) : (
                      ""
                    )}

                    {/* noteArea */}
                    {product &&
                    item.sizeId &&
                    sizeId === item.sizeId &&
                    noteArea ? (
                      <div
                        className="position-absolute w-100 h-100 top-0 start-0 bg-white rounded-3 d-flex flex-column align-items-center justify-content-center overflow-hidden"
                        style={{ zIndex: 10 }}
                      >
                        <form
                          className="card-body w-100 h-100 p-1 m-0"
                          onSubmit={(e) => {
                            addNoteToProduct(e, item.productId, item.sizeId);
                            setnoteArea(!noteArea);
                          }}
                        >
                          <textarea
                            className="form-control w-100 h-75 p-1 m-0"
                            defaultValue={item.notes}
                            placeholder="اضف تعليماتك الخاصة بهذا الطبق"
                            name="note"
                            onChange={(e) => {
                              setproductNote(e.target.value);
                            }}
                          ></textarea>

                          <div className="d-flex flex-nowrap align-aitems-center  justify-content-between w-100 h-25 p-0 m-0">
                            <button
                              type="submit"
                              className="btn btn-primarycol-6 h-100 px-2 py-3 m-0"
                            >
                              تاكيد
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondarycol-6 h-100 px-2 py-3 m-0"
                              onClick={() => setnoteArea(!noteArea)}
                            >
                              اغلاق
                            </button>
                          </div>
                        </form>
                      </div>
                    ) : product &&
                      !item.sizeId &&
                      product._id &&
                      product._id === item.productId &&
                      noteArea ? (
                      <div
                        className="position-absolute w-100 h-100 top-0 start-0 bg-white rounded-3 d-flex flex-column align-items-center justify-content-center overflow-hidden"
                        style={{ zIndex: 10 }}
                      >
                        <form
                          className="card-body w-100 h-100 p-1 m-0"
                          onSubmit={(e) => {
                            addNoteToProduct(e, item.productId, item.sizeId);
                            setnoteArea(!noteArea);
                          }}
                        >
                          <textarea
                            className="form-control w-100 h-75 p-1 m-0"
                            defaultValue={item.notes}
                            placeholder="اضف تعليماتك الخاصة بهذا الطبق"
                            name="note"
                            onChange={(e) => {
                              setproductNote(e.target.value);
                            }}
                          ></textarea>

                          <div className="d-flex flex-nowrap align-aitems-center  justify-content-between p-0 m-0">
                            <button
                              type="submit"
                              className="btn btn-primarycol-6 h-100 px-2 py-3 m-0 btn-primary"
                            >
                              تاكيد
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondarycol-6 h-100 px-2 py-3 m-0 "
                              onClick={() => {
                                setnoteArea(!noteArea);
                                setproductNote("");
                              }}
                            >
                              اغلاق
                            </button>
                          </div>
                        </form>
                      </div>
                    ) : (
                      ""
                    )}

                    {/* card-body */}
                    <div className="card-body col-12 p-0 m-0 text-dark bg-light">
                      <div className="d-flex justify-content-between align-items-center py-2">
                        <div className="fw-bold w-50">
                          {item.name}
                          {item.size ? ` - ${item.size}` : ""}
                        </div>
                        <span
                          onClick={() => {
                            setnoteArea(!noteArea);
                            setproductId(item.productId);
                            getProductDitalis(allProducts, item.productId);
                            item.sizeId
                              ? setsizeId(item.sizeId)
                              : setproductId(item.productId);
                          }}
                          className="material-symbols-outlined"
                          style={{
                            width: "30%",
                            fontSize: "40px",
                            cursor: "pointer",
                            color: "rgb(0, 238, 255)",
                          }}
                        >
                          note_alt
                        </span>

                        {item.hasExtras && (
                          <span
                            className="material-icons"
                            style={{
                              color: "green",
                              fontSize: "45px",
                              cursor: "pointer",
                            }}
                            onClick={() => {
                              setproductExtras(item.extras);
                              setextraArea(!extraArea);
                              getProductDitalis(allProducts, item.productId);
                              item.sizeId
                                ? setsizeId(item.sizeId)
                                : setproductId(item.productId);
                            }}
                          >
                            add_circle
                          </span>
                        )}

                        <button
                          onClick={() =>
                            deleteItemFromCart(item.productId, item.sizeId)
                          }
                          className="btn btn-danger col-3 h-100 p-0 m-0"
                        >
                          حذف
                        </button>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-2">
                        <div className="fw-bold w-25 text-center">
                          {" "}
                          {item.priceAfterDiscount
                            ? item.priceAfterDiscount
                            : item.price}{" "}
                          ج
                        </div>
                        <div className="w-50 d-flex justify-content-between">
                          <button
                            onClick={() =>
                              decrementProductQuantity(
                                item.productId,
                                item.sizeId
                              )
                            }
                            className="btn col-4 h-100 p-0 m-0 btn-primary"
                          >
                            -
                          </button>
                          <span className="text-dark fw-bold fs-5 text-center">
                            {item.quantity > 0 ? item.quantity : 0}
                          </span>
                          <button
                            onClick={() =>
                              incrementProductQuantity(
                                item.productId,
                                item.sizeId
                              )
                            }
                            className="btn col-4 h-100 p-0 m-0 btn-primary"
                          >
                            +
                          </button>
                        </div>
                        <div
                          className="fw-bold"
                          style={{ width: "25%", textAlign: "center" }}
                        >
                          {item.priceAfterDiscount
                            ? item.priceAfterDiscount * item.quantity
                            : item.price * item.quantity}{" "}
                          ج
                        </div>
                      </div>

                      {item.extras && (
                        <div className="d-flex flex-columen flex-wrap mt-2">
                          {item.extras.map(
                            (extra, i) =>
                              extra &&
                              extra.totalExtrasPrice > 0 && (
                                <div
                                  key={i}
                                  className="d-flex w-100 flex-wrap m-0 mb-1 p-0"
                                  style={{ borderBottom: "1px solid black" }}
                                >
                                  <div className="d-flex col-10 align-items-center justify-content-start flex-wrap p-0 m-0">
                                    {extra.extraDetails &&
                                      extra.extraDetails.map((detail) => {
                                        return (
                                          <p
                                            className="badge badge-secondary m-1"
                                            key={detail.extraid}
                                          >{`${detail.name} - ${detail.price} ج`}</p>
                                        );
                                      })}
                                  </div>
                                  <p className="d-flex col-2 align-items-center justify-content-center badge badge-info">
                                    {extra.totalExtrasPrice} ج
                                  </p>
                                </div>
                              )
                          )}
                        </div>
                      )}
                      {item.notes && (
                        <div className="card-text mt-2 text-muted">
                          {item.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              : productOrderToUpdate.length > 0
              ? productOrderToUpdate.map((item, index) => (
                  <div className="card mb-3" key={index}>
                    {item.productId === productId && noteArea ? (
                      <form className="card-body p-1 m-0">
                        <textarea
                          className="form-control h-75 p-1 m-0"
                          placeholder="اضف تعليماتك الخاصة بهذا الطبق"
                          name="note"
                          onChange={(e) => {
                            setproductNote(e.target.value);
                          }}
                        ></textarea>
                        <div className="d-flex flex-nowrap align-aitems-center  justify-content-between w-100 h-25 p-0 m-0">
                          <button
                            type="submit"
                            className="btn btn-primarycol-6 h-100 px-2 py-3 m-0"
                          >
                            تاكيد
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondarycol-6 h-100 px-2 py-3 m-0"
                            onClick={() => setnoteArea(!noteArea)}
                          >
                            اغلاق
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div
                        className="card-body"
                        style={{ padding: "5px", margin: "0" }}
                      >
                        <div className="d-flex justify-content-between align-items-center py-2">
                          <div className="fw-bold" style={{ width: "50%" }}>
                            {item.name}
                          </div>

                          <span
                            onClick={() => {
                              setnoteArea(!noteArea);
                              setproductId(item.productId);
                            }}
                            className="material-symbols-outlined"
                            style={{
                              width: "30%",
                              fontSize: "40px",
                              cursor: "pointer",
                              color: "rgb(0, 238, 255)",
                            }}
                          >
                            note_alt
                          </span>

                          <button
                            onClick={() =>
                              deleteItemFromCart(item.productId, item.sizeId)
                            }
                            className="btn btn-danger col-3 h-100 p-0 m-0"
                          >
                            حذف
                          </button>
                        </div>

                        <div className="d-flex justify-content-between align-items-center py-2">
                          <div
                            className="fw-bold"
                            style={{ width: "25%", textAlign: "center" }}
                          >
                            {item.priceAfterDiscount > 0
                              ? item.priceAfterDiscount
                              : item.price}{" "}
                            ج
                          </div>
                          <div
                            className="d-flex justify-content-between"
                            style={{ width: "50%" }}
                          >
                            <button
                              onClick={() =>
                                decrementProductQuantity(
                                  item.productId,
                                  item.sizeId
                                )
                              }
                              className="btn col-4 h-100 p-0 m-0 btn-primary"
                            >
                              -
                            </button>
                            <span className="text-dark fw-bold fs-5 text-center">
                              {item.quantity > 0 ? item.quantity : 0}
                            </span>
                            <button
                              onClick={() =>
                                incrementProductQuantity(
                                  item.productId,
                                  item.sizeId
                                )
                              }
                              className="btn col-4 h-100 p-0 m-0 btn-primary"
                            >
                              +
                            </button>
                          </div>
                          <div
                            className="fw-bold"
                            style={{ width: "25%", textAlign: "center" }}
                          >
                            {item.priceAfterDiscount > 0
                              ? item.priceAfterDiscount * item.quantity
                              : item.price * item.quantity}{" "}
                            ج
                          </div>
                        </div>
                        {item.notes && (
                          <div
                            style={{
                              fontSize: "14px",
                              fontWeight: "700",
                              color: "rgb(29, 29, 255)",
                            }}
                          >
                            {item.notes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              : ""}
          </div>
        </div>

        <div className="h-auto w-100">
          {/* order info */}
          <div
            className="row d-flex align-items-start px-2 m-0"
            style={{ direction: "rtl" }}
          >
            <div className="col p-0 m-0">
              <div className="order-details bg-white border rounded shadow-sm p-0 mb-1">
                <p className="order-item mb-1 d-flex justify-content-between align-items-center text-black">
                  <span className="text-dark fw-bold fs-5">قيمة الأوردر:</span>
                  <span className="text-dark fw-bold fs-5 text-center">
                    {costOrder > 0 ? costOrder : 0} ج
                  </span>
                </p>
                {ordertype === "Dine-in" && brandInfo.serviceTaxRate > 0 ? (
                  <p className="order-item mb-1 d-flex justify-content-between align-items-center text-black">
                    <span className="text-dark fw-bold fs-5">{`خدمة صاله ${brandInfo.serviceTaxRate}%:`}</span>
                    <span className="text-dark fw-bold fs-5 text-center">
                      {serviceTax > 0 ? serviceTax : 0} ج
                    </span>
                  </p>
                ) : null}
                {brandInfo.salesTaxRate > 0 ? (
                  <p className="order-item mb-1 d-flex justify-content-between align-items-center text-black">
                    <span className="text-dark fw-bold fs-5">{`ضريبة مبيعات ${brandInfo.salesTaxRate}%:`}</span>
                    <span className="text-dark fw-bold fs-5 text-center">
                      {salesTax > 0 ? salesTax : 0} ج
                    </span>
                  </p>
                ) : null}
                {ordertype === "Delivery" ? (
                  <p className="order-item mb-1 d-flex justify-content-between align-items-center text-black">
                    <span className="text-dark fw-bold fs-5">
                      خدمة التوصيل:
                    </span>
                    <span className="text-dark fw-bold fs-5 text-center">
                      {deliveryFee > 0 ? deliveryFee : 0} ج
                    </span>
                  </p>
                ) : null}
                {addaddition || addition > 0 ? (
                  <div className="mb-1">
                    <label className="text-dark fw-bold fs-5 d-flex justify-content-between align-items-center">
                      <span>رسوم إضافية:</span>
                      <input
                        type="number"
                        min="0"
                        className="col-6 form-control fs-5 fw-bold text-center text-dark"
                        defaultValue={addition}
                        onChange={(e) => setaddition(Number(e.target.value))}
                      />
                    </label>
                  </div>
                ) : null}
                {adddiscount || discount > 0 ? (
                  <div className="mb-1">
                    <label className="text-dark fw-bold fs-5 d-flex justify-content-between align-items-center">
                      <span>الخصم:</span>
                      <input
                        type="number"
                        min="0"
                        className="col-6 form-control fs-5 fw-bold text-center text-dark"
                        defaultValue={discount}
                        onChange={(e) => setdiscount(Number(e.target.value))}
                      />
                    </label>
                  </div>
                ) : null}
                <p className="order-item border-bottom m-0 d-flex justify-content-between align-items-center text-black">
                  <span className="text-dark fw-bold fs-5">الإجمالي:</span>
                  <span className="text-dark fw-bold fs-5 text-center">
                    {totalOrder ? totalOrder : 0} ج
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* button */}
          <div className="d-flex flex-wrap g-2 align-items-center justify-content-between w-100 p-0 m-0">
            {ordertype === "Dine-in" ? (
              <button
                type="button"
                style={{ height: "60px" }}
                className="col-3 d-flex align-items-center justify-content-center text-nowrap btn btn-primary"
                onClick={() => {
                  createWaiterOrderForTable(tableID, employeeLoginInfo.id);
                  setaddaddition(false);
                  setadddiscount(false);
                }}
              >
                تأكيد
              </button>
            ) : ordertype === "Delivery" ? (
              <button
                type="button"
                style={{ height: "60px" }}
                className="col-3 d-flex align-items-center justify-content-center text-nowrap btn btn-primary"
                onClick={() => {
                  createcashierOrder(
                    employeeLoginInfo.id,
                    clientname,
                    clientphone,
                    clientaddress,
                    ordertype,
                    deliveryFee,
                    discount,
                    addition
                  );
                  setaddaddition(false);
                  setadddiscount(false);
                }}
              >
                تأكيد
              </button>
            ) : ordertype === "Takeaway" ? (
              <button
                type="button"
                style={{ height: "60px" }}
                className="col-3 d-flex align-items-center justify-content-center text-nowrap btn btn-primary"
                onClick={() => {
                  createcashierOrder(
                    employeeLoginInfo.id,
                    clientname,
                    clientphone,
                    clientaddress,
                    ordertype,
                    deliveryFee,
                    discount,
                    addition
                  );
                  setaddaddition(false);
                  setadddiscount(false);
                }}
              >
                تأكيد
              </button>
            ) : (
              <button
                type="button"
                style={{ height: "60px" }}
                className="col-3 d-flex align-items-center justify-content-center text-nowrap btn btn-primary"
                onClick={() => alert("اختر نوع الاوردر و اكتب جميع البيانات")}
              >
                تأكيد
              </button>
            )}
            {productOrderToUpdate.length > 0 ? (
              <button
                type="button"
                style={{ height: "60px" }}
                className="col-3 d-flex align-items-center justify-content-center text-nowrap btn btn-warning"
                onClick={() => updateOrder()}
              >
                عدل
              </button>
            ) : (
              <a
                type="button"
                style={{ height: "60px" }}
                className="col-3 d-flex align-items-center justify-content-center text-nowrap btn btn-warning"
                href="#getOrderDetalisModal"
                data-toggle="modal"
              >
                تعديل
              </a>
            )}

            <button
              type="button"
              style={{ height: "60px" }}
              className="col-3 d-flex align-items-center justify-content-center text-nowrap btn bg-success"
              href="#paymentModal"
              data-toggle="modal"
              onClick={() => {
                lastInvoiceByCashier(employeeLoginInfo.id);
                getCashRegistersByEmployee(employeeLoginInfo.id);
              }}
            >
              دفع
            </button>
            <a
              type="button"
              style={{ height: "60px" }}
              className="col-3 d-flex align-items-center justify-content-center text-nowrap btn btn-info"
              href="#getOrderTableModal"
              data-toggle="modal"
            >
              دفع جزء
            </a>
            <button
              type="button"
              style={{ height: "60px" }}
              className="col-3 d-flex align-items-center justify-content-center text-nowrap btn btn-success"
              data-toggle="modal"
              data-target="#invoiceModal"
              onClick={() => {
                lastInvoiceByCashier(employeeLoginInfo.id);
                setShowModal(!showModal);
              }}
            >
              طباعة
            </button>
            <button
              type="button"
              style={{ height: "60px" }}
              className="col-3 d-flex align-items-center justify-content-center text-nowrap btn btn-secondary"
              onClick={() => setaddaddition(!addaddition)}
            >
              رسوم
            </button>
            <button
              type="button"
              style={{ height: "60px" }}
              className="col-3 d-flex align-items-center justify-content-center text-nowrap btn btn-secondary"
              onClick={() => setadddiscount(!adddiscount)}
            >
              خصم
            </button>
            <button
              type="button"
              style={{ height: "60px" }}
              className="col-3 d-flex align-items-center justify-content-center text-nowrap btn btn-danger"
              onClick={() => {
                setitemsInCart([]);
                deleteOrderdetalis();
              }}
            >
              إلغاء{" "}
            </button>
          </div>
        </div>
      </div>

      {/* الفاتوره */}

      <InvoiceComponent
        ModalId="invoiceModal"
        orderData={myOrder}
        showModal={showModal}
        setShowModal={setShowModal}
      />

      {/* تعديل اوردر */}
      <div id="getOrderDetalisModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            {/* <form onSubmit={handleGetOrderDetailsBySerial}> */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                getOrderDetailsBySerial(e, serial);
              }}
            >
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">رقم الفاتوره</h4>
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
                <div className="w-100">
                  <div className="form-group w-100 d-flex align-item-center justify-content-between">
                    <label htmlFor="serial" className="col-6 text-dark">
                      رقم الفاتورة:
                    </label>
                    <input
                      type="text"
                      id="serial"
                      className="form-control border-primary col-6"
                      value={serial}
                      onChange={(e) => setserial(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer w-100 d-flex flex-row flex-nowrap align-item-center justify-content-between">
                <input
                  type="submit"
                  className="btn btn-success col-6 h-100 px-2 py-3 m-0"
                  value="تم"
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

      {/* تاكيد الدفع */}
      <div id="paymentModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
              <h4 className="modal-title">دفع ثمن اخر اوردر</h4>
              <button
                type="button"
                className="close m-0 p-1"
                data-dismiss="modal"
                aria-hidden="true"
              >
                &times;
              </button>
            </div>
            <form
              className="p-1"
              onSubmit={(e) => {
                changePaymentorderstauts(e);
              }}
            >
              <div className="form-group w-100 d-flex align-items-center justify-content-between">
                <label htmlFor="totalOrder" className="col-6 text-dark">
                  اجمالي المطلوب:
                </label>
                <input
                  type="text"
                  id="totalOrder"
                  className="form-control border-primary col-6"
                  value={myOrder.total}
                  readOnly
                />
              </div>
              <div className="form-group w-100 d-flex align-items-center justify-content-between">
                <label htmlFor="paidAmount" className="col-6 text-dark">
                  المدفوع:
                </label>
                <input
                  type="number"
                  id="paidAmount"
                  className="form-control border-primary col-6"
                  min={parseFloat(myOrder.total)}
                  required
                  onChange={(e) => setPaidAmount(e.target.value)}
                />
              </div>
              <div className="form-group w-100 d-flex align-items-center justify-content-between">
                <label htmlFor="remainingAmount" className="col-6 text-dark">
                  الباقي:
                </label>
                <input
                  type="text"
                  id="remainingAmount"
                  className="form-control border-primary col-6"
                  value={remainingAmount}
                  readOnly
                />
              </div>
              <div className="form-group w-100 d-flex align-items-center justify-content-between">
                <label htmlFor="cashOutAmount" className="col-6 text-dark">
                  المبلغ الخارج من الخزينة:
                </label>
                <input
                  type="number"
                  id="cashOutAmount"
                  className="form-control border-primary col-6"
                  max={parseFloat(remainingAmount)}
                  onChange={(e) => setCashOutAmount(e.target.value)}
                />
              </div>
              <div className="form-group d-flex flex-nowrap w-100">
                <label htmlFor="paymentMethod" className="col-6 text-dark">
                  طريقه الدفع:
                </label>
                <select
                  id="paymentMethod"
                  className="form-control border-primary col-6 text-dark"
                  required
                  onChange={(e) => setpaymentMethod(e.target.value)}
                >
                  <option>اختر طريقه الدفع</option>
                  {brandInfo.acceptedPayments &&
                    brandInfo.acceptedPayments.map((method, i) => (
                      <option value={method} key={i}>
                        {method}
                      </option>
                    ))}
                </select>
              </div>
              <div className="form-group d-flex flex-nowrap w-100">
                <label htmlFor="registerSelected" className="col-6 text-dark">
                  الخزينة:
                </label>
                {registers.length > 1 ? (
                  <select
                    id="registerSelected"
                    className="form-control border-primary col-6 text-dark"
                    required
                    onChange={(e) => setregisterSelected(e.target.value)}
                  >
                    <option>اختر الخزينه</option>
                    {registers.map((register, i) => (
                      <option value={register._id} key={i}>
                        {register.name}
                      </option>
                    ))}
                  </select>
                ) : registers.length === 1 ? (
                  <input
                    type="text"
                    id="registerSelected"
                    className="form-control border-primary col-6"
                    value={registers[0].name}
                    readOnly
                  />
                ) : (
                  "لم يوجد خزينه"
                )}
              </div>
              <div className="modal-footer w-100 d-flex flex-row flex-nowrap align-items-center justify-content-between">
                <input
                  type="submit"
                  className="btn btn-success col-6 h-100 px-2 py-3 m-0"
                  value="تم"
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

      {/* دفع جزء */}
      <div id="getOrderTableModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form
              onSubmit={(e) => {
                splitInvoice(e);
              }}
            >
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">اختر الطاوله</h4>
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
                <div className="w-100">
                  <div className="form-group d-flex flex-nowrap  w-100">
                    <label htmlFor="table" className="col-6 text-dark">
                      رقم الطاولة:
                    </label>
                    <select
                      id="table"
                      className="form-control border-primary col-6 text-dark"
                      required
                      onChange={(e) =>
                        getOrderProductForTable(e, e.target.value)
                      }
                    >
                      <option>اختر رقم الطاولة</option>
                      {allTable.map((table, i) => (
                        <option value={table._id} key={i}>
                          {table.tableNumber}
                        </option>
                      ))}
                    </select>
                  </div>
                  <table
                    className="table table-bordered table-responsive-md"
                    style={{ direction: "rtl" }}
                  >
                    <thead className="thead-dark">
                      <tr>
                        <th scope="col" className="col-md-3">
                          الصنف
                        </th>
                        <th scope="col" className="col-md-2">
                          السعر
                        </th>
                        <th scope="col" className="col-md-1">
                          الكمية
                        </th>
                        <th scope="col" className="col-md-1">
                          الاجمالي
                        </th>
                        <th scope="col" className="col-md-2">
                          الجزء
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Replace this with your dynamic data */}
                      {listProductsOrder.map((item, i) => (
                        <>
                          <tr key={i}>
                            <td className="col-md-3 text-truncate">{`${
                              item.name
                            } ${item.size ? item.size : ""}`}</td>
                            <td className="col-md-2 text-nowrap">
                              {item.priceAfterDiscount
                                ? item.priceAfterDiscount
                                : item.price}
                            </td>
                            <td className="col-md-1 text-nowrap">
                              {item.quantity - item.numOfPaid}
                            </td>
                            <td className="col-md-1 text-nowrap">
                              {item.totalprice}
                            </td>
                            <td className="col-md-2 text-nowrap">
                              <input
                                type="number"
                                min={0}
                                max={item.quantity - item.numOfPaid}
                                defaultValue={0}
                                onChange={(e) => {
                                  putNumOfPaid(
                                    item.productId._id,
                                    item.sizeId,
                                    Number(e.target.value)
                                  );
                                }}
                                style={{ width: "50px" }}
                              />
                            </td>
                          </tr>
                          {item.extras &&
                            item.extras.length > 0 &&
                            item.extras.map(
                              (extra, j) =>
                                extra && (
                                  <tr key={`${i}-${j}`}>
                                    <td className="col-md-3 text-truncate">
                                      <div className="d-flex flex-column flex-wrap w-100 align-items-center justify-content-between">
                                        {extra.extraDetails.map((detail) => {
                                          return (
                                            <p
                                              className="badge badge-secondary m-1"
                                              key={detail.extraid}
                                            >{`${detail.name}`}</p>
                                          );
                                        })}
                                      </div>
                                    </td>
                                    <td className="col-md-2 text-nowrap">
                                      <div className="d-flex  flex-column flex-wrap w-100 align-items-center justify-content-between">
                                        {extra.extraDetails.map((detail) => {
                                          return (
                                            <p
                                              className="badge badge-secondary m-1"
                                              key={detail.extraid}
                                            >{` ${detail.price} ج`}</p>
                                          );
                                        })}
                                      </div>
                                    </td>
                                    <td className="col-md-2 text-nowrap">1</td>
                                    <td className="col-md-2 text-nowrap">
                                      {extra && (
                                        <p className="badge badge-info m-1">
                                          {extra.totalExtrasPrice} ج
                                        </p>
                                      )}
                                    </td>
                                    <td className="col-md-2 text-nowrap">
                                      {extra.isPaid ? (
                                        <p className="badge badge-info m-1">
                                          تم
                                        </p>
                                      ) : ExtrasIsPaid.includes(extra._id) ? (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setExtrasIsPaid(
                                              ExtrasIsPaid.filter(
                                                (id) => id !== extra._id
                                              )
                                            );
                                            handlePayExtras(
                                              i,
                                              extra._id,
                                              false
                                            );
                                          }}
                                          className="h-100 btn btn-primary btn-sm"
                                        >
                                          تراجع
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setExtrasIsPaid([
                                              ...ExtrasIsPaid,
                                              extra._id,
                                            ]);
                                            handlePayExtras(i, extra._id, true);
                                          }}
                                          className="h-100 btn btn-primary btn-sm"
                                        >
                                          دفع
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                )
                            )}
                        </>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="4">المجموع</td>
                        <td>{subtotalSplitOrder}</td>
                      </tr>
                      <tr>
                        <td colSpan="4">الاجمالي</td>
                        <td>{orderTotal}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              <div className="modal-footer w-100 d-flex flex-row flex-nowrap align-item-center justify-content-between">
                <input
                  type="submit"
                  className="btn btn-success col-6 h-100 px-2 py-3 m-0"
                  value="تم"
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

      {/* اختيار نوع الاوردر */}
      <div id="typeOrderModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">ادخل بيانات العميل</h4>
                <button
                  type="button"
                  className="close m-0 p-1"
                  data-dismiss="modal"
                  aria-hidden="true"
                >
                  &times;
                </button>
              </div>
              {ordertype ? (
                ordertype === "Dine-in" ? (
                  <div className="modal-body d-flex flex-wrap align-items-center p-3 text-right">
                    <div className="form-group d-flex flex-nowrap align-items-center justify-content-between col-12 ">
                      <label htmlFor="table" className="form-label text-dark">
                        رقم الطاولة:
                      </label>
                      <select
                        id="table"
                        className="form-control border-primary m-0 p-2 h-auto"
                        required
                        onChange={(e) => {
                          settableID(e.target.value);
                        }}
                      >
                        <option>اختر رقم الطاولة</option>
                        {allTable.map((table, i) => (
                          <option value={table._id} key={i}>
                            {table.tableNumber}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : ordertype === "Delivery" ? (
                  <div className="modal-body d-flex flex-wrap align-items-center p-3 text-right">
                    <div className="form-group d-flex flex-wrap align-items-center justify-content-between col-12 col-md-6 ">
                      <label htmlFor="phone" className="form-label text-dark">
                        رقم الموبايل:
                      </label>
                      <input
                        type="text"
                        className="form-control border-primary m-0 p-2 h-auto"
                        required
                        onChange={(e) => {
                          setclientphone(e.target.value);
                          getCustomerByPhone(e.target.value);
                        }}
                      />
                    </div>

                    <div className="form-group d-flex flex-wrap align-items-center justify-content-between col-12 col-md-6 ">
                      <label htmlFor="name" className="form-label text-dark">
                        اسم العميل:
                      </label>
                      <input
                        type="text"
                        className="form-control border-primary m-0 p-2 h-auto"
                        value={clientname}
                        required
                        onChange={(e) => {
                          setclientname(e.target.value);
                        }}
                      />
                    </div>

                    <div className="form-group d-flex flex-wrap align-items-center justify-content-between col-12 col-md-6 ">
                      <label htmlFor="area" className="form-label text-dark">
                        المنطقة:
                      </label>
                      <select
                        id="area"
                        className="form-control border-primary m-0 p-2 h-auto"
                        required
                        onChange={(e) => {
                          handelcustomerDeliveryArea(e.target.value);
                        }}
                      >
                        <option>{deliveryAreaName}</option>
                        {areas ? (
                          areas.map((area, i) => (
                            <option value={JSON.stringify(area)} key={i}>
                              {area.name}
                            </option>
                          ))
                        ) : (
                          <option>لا توجد مناطق توصيل متاحة</option>
                        )}
                      </select>
                    </div>
                    <div className="form-group d-flex flex-wrap align-items-center justify-content-between col-12 col-md-6 ">
                      <label htmlFor="address" className="form-label text-dark">
                        العنوان:
                      </label>
                      <textarea
                        className="form-control border-primary m-0 p-2 h-auto"
                        value={clientaddress}
                        required
                        onChange={(e) => setclientaddress(e.target.value)}
                      />
                    </div>
                    {isClientFounded ? (
                      <>
                        <div className="form-group w-100 h-auto px-3 d-flex align-items-center justify-content-start col-12 col-md-6">
                          <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                            التوثيق
                          </label>
                          <select
                            name="isVarified"
                            required
                            className="form-control border-primary m-0 p-2 h-auto"
                            value={isVarified}
                            onChange={(e) => setisVarified(e.target.value)}
                          >
                            <option value="">
                              {isVarified ? "موثق" : "غير موثق"}
                            </option>
                            <option value={true}>موثق</option>
                            <option value={false}>غير موثق</option>
                          </select>
                        </div>

                        <div className="form-group w-100 h-auto px-3 d-flex align-items-center justify-content-start col-12 col-md-6">
                          <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                            رفض الاوردرات
                          </label>
                          <select
                            name="refusesOrders"
                            required
                            className="form-control border-primary m-0 p-2 h-auto"
                            value={refusesOrders}
                            onChange={(e) => setrefusesOrders(e.target.value)}
                          >
                            <option value="">
                              {refusesOrders ? "رفض اوردر" : "لم يرفض الاوردر"}
                            </option>
                            <option value={true}>رفض اوردر</option>
                            <option value={false}>لم يرفض الاوردر</option>
                          </select>
                        </div>
                      </>
                    ) : (
                      ""
                    )}
                    <div className="form-group w-100 h-auto px-3 d-flex align-items-center justify-content-start col-12 col-md-6">
                      <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                        ملاحظات
                      </label>
                      <textarea
                        className="form-control border-primary m-0 p-2 h-auto"
                        name="notes"
                        value={clientNotes}
                        onChange={(e) => setclientNotes(e.target.value)}
                      />
                      <div className="invalid-feedback">
                        الرجاء إدخال ملاحظات صالحة.
                      </div>
                    </div>

                    {!isClientFounded ? (
                      <button
                        type="button"
                        className="h-100 btn btn-success col-12 col-md-6"
                        id="customerInfo"
                        onClick={createCustomer}
                      >
                        {" "}
                        حفظ بيانات العميل{" "}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="h-100 btn btn-success col-12 col-md-6"
                        id="customerInfo"
                        onClick={updateCustomer}
                      >
                        {" "}
                        تعديل بيانات العميل{" "}
                      </button>
                    )}
                  </div>
                ) : ordertype === "Takeaway" ? (
                  <div className="modal-body d-flex flex-wrap align-items-center p-3 text-right">
                    <div className="form-group d-flex flex-wrap align-items-center justify-content-between col-12 col-md-6 ">
                      <label htmlFor="name" className="form-label text-dark">
                        اسم العميل:
                      </label>
                      <input
                        type="text"
                        className="form-control border-primary m-0 p-2 h-auto"
                        required
                        onChange={(e) => {
                          setclientname(e.target.value);
                        }}
                      />
                    </div>
                    <div className="form-group d-flex flex-wrap align-items-center justify-content-between col-12 col-md-6 ">
                      <label htmlFor="phone" className="form-label text-dark">
                        رقم الموبايل:
                      </label>
                      <input
                        type="text"
                        className="form-control border-primary m-0 p-2 h-auto"
                        required
                        onChange={(e) => setclientphone(e.target.value)}
                      />
                    </div>
                  </div>
                ) : null
              ) : (
                ""
              )}
              <div className="modal-footer d-flex flex-nowrap align-items-center justify-content-between m-0 p-0">
                <input
                  type="button"
                  className="btn btn-success col-6 h-100 px-2 py-3 m-0"
                  data-dismiss="modal"
                  value="تم"
                />
                <input
                  type="button"
                  className="btn btn-danger col-6 h-100 px-2 py-3 m-0"
                  data-dismiss="modal"
                  value="اغلاق"
                  onClick={() => {
                    deleteOrderdetalis();
                  }}
                />
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default POS;
