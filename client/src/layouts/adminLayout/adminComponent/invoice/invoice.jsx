import React, { useContext, useEffect, useRef } from "react";
import { AppContext } from "../../../../context/appContext";
import { useReactToPrint } from "react-to-print";

import "../orders/Orders.css";

const InvoiceComponent = ({ ModalId, orderData, showModal, setShowModal }) => {
  const {
    brandInfo,
    formatdate,
    formatDateTime,
    handleGetTokenAndConfig,
    apiUrl,
  } = useContext(AppContext);

  const {
    serial,
    orderType,
    name,
    phone,
    address,
    deliveryMan,
    table,
    products,
    subTotal,
    deliveryFee,
    addition,
    salesTax,
    serviceTax,
    discount,
    total,
    cashier,
  } = orderData;

  const printContainerInvoice = useRef();
  const PrintInvoice = useReactToPrint({
    content: () => printContainerInvoice.current,
    copyStyles: true,
    removeAfterPrint: true,
    bodyClass: "printpage",
    printerName: "cashier",
  });

  const handlePrintInvoice = (e) => {
    e.preventDefault();
    PrintInvoice();
  };
  return (
    <div
      id={ModalId}
      className="modal fade"
      style={{ display: showModal ? "block" : "none" }}
    >
      <div className="modal-dialog modal-lg">
        <div className="modal-content shadow-lg border-0 rounded ">
          <form>
            <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
              <h4 className="modal-title"></h4>
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
              ref={printContainerInvoice}
              className="p-1 mb-7 overflow-auto printpage"
              style={{ width: "100%", textAlign: "center" }}
            >
              {/* Invoice Header */}
              <div
                className="invoice-header"
                style={{
                  backgroundColor: "#343a40",
                  color: "#ffffff",
                  padding: "20px",
                  textAlign: "center",
                }}
              >
                <h2>{brandInfo.name}</h2>
                <p>
                  كاشير:{cashier?.username} | فاتورة #{serial} |{" "}
                  {orderType === "Dine-in"
                    ? `طاولة' ${table?.tableNumber}`
                    : ""}{" "}
                  | التاريخ: {formatDateTime(new Date())}
                </p>
              </div>

              {/* Customer Information */}
              {orderType === "Delivery" ? (
                <div
                  className="customer-info text-dark"
                  style={{ margin: "20px" }}
                >
                  <h4>بيانات العميل</h4>
                  <p>الاسم: {name}</p>
                  <p>الموبايل: {phone}</p>
                  <p>العنوان: {address}</p>
                  <p>Delivery Man: {deliveryMan?.username}</p>
                </div>
              ) : orderType === "Takeaway" ? (
                <div
                  className="customer-info text-dark"
                  style={{ marginBottom: "20px" }}
                >
                  <h4>بيانات العميل</h4>
                  <p>الاسم: {name}</p>
                  <p>الموبايل: {phone}</p>
                  <p>رقم الاوردر: {orderData.orderNum}</p>
                </div>
              ) : (
                ""
              )}

              {/* Order Details Table */}
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
                    <th scope="col" className="col-md-2">
                      الكمية
                    </th>
                    <th scope="col" className="col-md-2">
                      الاجمالي
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products &&
                    products.map((product, i) => (
                      <>
                        <tr key={i}>
                          <td className="col-md-3 text-truncate">
                            {product.name}
                          </td>
                          <td className="col-md-2 text-nowrap">
                            {product.priceAfterDiscount
                              ? product.priceAfterDiscount
                              : product.price}
                          </td>
                          <td className="col-md-2 text-nowrap">
                            {product.quantity}
                          </td>
                          <td className="col-md-2 text-nowrap">
                            {product.totalprice}
                          </td>
                        </tr>
                        {product.extras &&
                          product.extras.length > 0 &&
                          product.extras.map(
                            (extra, j) =>
                              extra && (
                                <tr key={`${i}-${j}`}>
                                  <td className="col-md-3 text-truncate">
                                    <div className="d-flex flex-column flex-wrap w-100 align-items-center justify-content-between">
                                      {extra.extraDetails.map((detail) => (
                                        <p
                                          className="badge badge-secondary m-1"
                                          key={detail.extraid}
                                        >{`${detail.name}`}</p>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="col-md-2 text-nowrap">
                                    <div className="d-flex flex-column flex-wrap w-100 align-items-center justify-content-between">
                                      {extra.extraDetails.map((detail) => (
                                        <p
                                          className="badge badge-secondary m-1"
                                          key={detail.extraid}
                                        >{` ${detail.price} ج`}</p>
                                      ))}
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
                                </tr>
                              )
                          )}
                      </>
                    ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="3">المجموع</td>
                    <td>{subTotal}</td>
                  </tr>
                  {deliveryFee > 0 && (
                    <tr>
                      <td colSpan="3">خدمة التوصيل</td>
                      <td>{deliveryFee}</td>
                    </tr>
                  )}
                  {addition > 0 && (
                    <tr>
                      <td colSpan="3">رسوم اضافيه</td>
                      <td>{addition}</td>
                    </tr>
                  )}
                  {salesTax > 0 && (
                    <tr>
                      <td colSpan="3">ضريبه مبيعات</td>
                      <td>{salesTax}</td>
                    </tr>
                  )}
                  {serviceTax > 0 && (
                    <tr>
                      <td colSpan="3">خدمة الصاله</td>
                      <td>{serviceTax}</td>
                    </tr>
                  )}
                  {discount > 0 && (
                    <tr>
                      <td colSpan="3">خصم</td>
                      <td>{discount}</td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan="3">الاجمالي</td>
                    <td>{total}</td>
                  </tr>
                </tfoot>
              </table>

              {/* Restaurant Information */}
              <div
                className="restaurant-info text-dark"
                style={{ marginTop: "20px", textAlign: "center" }}
              >
                {brandInfo && (
                  <>
                    <p>{brandInfo.name}</p>
                    <p>
                      موبايل:{" "}
                      {brandInfo.contact &&
                        brandInfo.contact?.phone &&
                        brandInfo.contact?.phone[0]}
                    </p>
                    <p>
                      العنوان:{" "}
                      {brandInfo.address && (
                        <>
                          {`${brandInfo.address?.state} ${brandInfo.address?.city} ${brandInfo.address?.street}`}
                        </>
                      )}
                    </p>
                  </>
                )}
              </div>
              {/* Footer */}
              <div
                className="footer"
                style={{
                  marginTop: "30px",
                  textAlign: "center",
                  color: "#828282",
                }}
              >
                <p>
                  Developed by:{" "}
                  <span style={{ color: "#5a6268" }}>beshoy Nady</span>
                </p>
                <p>
                  Mobaile: <span style={{ color: "#5a6268" }}>01122455010</span>
                </p>
              </div>
            </div>
            <div className="modal-footer d-flex flex-nowrap align-items-center justify-content-between m-0 p-1">
              <input
                type="button"
                className="btn btn-danger col-6 h-100 px-2 py-3 m-0"
                data-dismiss="modal"
                value="الغاء"
              />
              <input
                type="submit"
                className="btn btn-success col-6 h-100 px-2 py-3 m-0"
                value="Print"
                onClick={handlePrintInvoice}
              />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export   default InvoiceComponent;
