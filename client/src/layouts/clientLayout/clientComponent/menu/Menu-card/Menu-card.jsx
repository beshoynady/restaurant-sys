import React, { useState, useEffect, useContext } from "react"; 
import { AppContext } from "../../../../../context/appContext";
import {toast } from 'react-toastify';

const MenuCard = () => {
  const apiUrl = process.env.REACT_APP_API_URL;

  const [noteArea, setnoteArea] = useState(false);
  const [extraArea, setextraArea] = useState(false);
  const [productId, setproductId] = useState("");
  const [size, setsize] = useState("");
  const [sizeId, setsizeId] = useState("");
  const [sizeQuantity, setsizeQuantity] = useState(0);
  const [sizePrice, setsizePrice] = useState();
  const [sizePriceAfterDescount, setsizePriceAfterDescount] = useState();

  const handleSelectSize = (size) => {
    setnoteArea(false);
    setextraArea(false)
    setSelectedButtonIndex(1)
    setsize(size);
    setsizeId(size._id);
    setsizeQuantity(size.sizeQuantity);
    setsizePrice(size.sizePrice);
    if (size.sizeDiscount > 0) {
      setsizePriceAfterDescount(size.sizePriceAfterDiscount);
    }
  };

  const [selectedButtonIndex, setSelectedButtonIndex] = useState(1);

  return (
    <AppContext.Consumer>
      {({
        allProducts,
        menuCategoryId,
        addItemToCart,
        deleteItemFromCart,
        incrementProductQuantity,
        setproductExtras,
        decrementProductQuantity,
        setproductNote,
        addNoteToProduct,
        addExtrasToProduct,
        handleAddProductExtras,
        productExtras,
        itemId,
      }) => {
        return (
          <div className="d-flex flex-wrap flex-md-row">
            {allProducts.length > 0
              ? allProducts
                  .filter((pro) => pro.category._id === menuCategoryId)
                  .map((product, index) => {
                    if (product.hasSizes) {
                      return (
                        <div
                          className="card mx-auto"
                          key={index}
                          style={{
                            maxWidth: "320px",
                            minWidth: "300px",
                            width: "100%",
                            height: "215px",
                            margin: "0 0 10px 10px",
                            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
                          }}
                        >
                          {/* nots */}
                          {product._id === productId && noteArea === true ? (
                            <form
                              onSubmit={(e) => {
                                addNoteToProduct(e, product._id, sizeId);
                                setnoteArea(!noteArea);
                              }}
                              className="position-absolute w-100 h-100 top-0 start-0 p-2 bg-white rounded-3 d-flex flex-column align-items-center justify-content-center overflow-hidden"
                              style={{ zIndex: 10 }}
                            >
                              <textarea
                                placeholder="اضف تعليماتك الخاصة بهذا الطبق"
                                name="note"
                                cols="100"
                                rows="3"
                                onChange={(e) => {
                                  setproductNote(e.target.value);
                                }}
                                className="w-100 h-100 my-1"
                                style={{ zIndex: 11 }}
                              ></textarea>
                              <div
                                className="note-btn d-flex align-items-center justify-content-center w-100 mt-2"
                                style={{ height: "40px" }}
                              >
                                <button className="btn w-50 h-100 text-light btn-success rounded-2 me-2">
                                  تاكيد
                                </button>
                                <button
                                  onClick={() => {
                                    setnoteArea(!noteArea);
                                  }}
                                  className="btn w-50 h-100 text-light btn-danger rounded-2"
                                >
                                  الغاء
                                </button>
                              </div>
                            </form>
                          ) : (
                            ""
                          )}
                          {/* extraArea */}

                          {product._id === productId && extraArea === true && product.sizes.find(
                              (size) => size._id === sizeId
                            )? (
                            sizeId &&
                            product.sizes.filter(
                              (size) => size._id === sizeId
                            )[0]?.sizeQuantity > 0 ? (
                              <div
                                className="position-absolute w-100 h-100 top-0 start-0 bg-white rounded-3 d-flex flex-column align-items-center justify-content-center overflow-hidden"
                                style={{ zIndex: 10 }}
                              >
                                <form
                                  onSubmit={(e) => {
                                    if (product.extras.length > 0) {
                                      addExtrasToProduct(
                                        e,
                                        product._id,
                                        sizeId
                                      );
                                    }
                                    setproductId('')
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
                                        (size) => size._id === sizeId
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
                                    className="form-group d-flex flex-wrap w-100 h-50 p-0 m-0 mt-1"
                                    style={{
                                      overflowY:'auto'
                                    }}
                                  >
                                    {Array.from({
                                      length: product.sizes.filter(
                                        (size) => size._id === sizeId
                                      )[0]?.sizeQuantity,
                                    }).map(
                                      (_, ind) =>
                                        selectedButtonIndex === ind + 1 && (
                                          <div
                                            key={ind}
                                            className="form-group w-100 h-auto d-flex align-items-start justify-content-start flex-wrap"
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
                                                  width: "47%",
                                                  paddingLeft: "5px",
                                                }}
                                              >
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
                                                          detail.extraId ===
                                                          extra._id
                                                      )) ||
                                                    (product.sizes.filter(
                                                      (size) =>
                                                        size._id === sizeId
                                                    )[0]?.extrasSelected &&
                                                      product.sizes.filter(
                                                        (size) =>
                                                          size._id === sizeId
                                                      )[0]?.extrasSelected[
                                                        ind
                                                      ] &&
                                                      product.sizes
                                                        .filter(
                                                          (size) =>
                                                            size._id === sizeId
                                                        )[0]
                                                        .extrasSelected[
                                                          ind
                                                        ].extraDetails.some(
                                                          (detail) =>
                                                            detail.extraId ===
                                                            extra._id
                                                        ))
                                                  }
                                                  onChange={(e) =>
                                                    handleAddProductExtras(
                                                      extra,
                                                      ind
                                                    )
                                                  }
                                                />
                                                <label
                                                  className="form-check-label mr-3"
                                                  style={{
                                                    fontSize: "13px",
                                                    fontWeight: "800",
                                                  }}
                                                  onClick={(e) =>
                                                    handleAddProductExtras(
                                                      extra,
                                                      ind
                                                    )
                                                  }
                                                >
                                                  {`${extra.name} - ${extra.price} ج`}{" "}
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
                                      onClick={() => {setextraArea(!extraArea); setproductId('')}}
                                      className="h-100 btn btn-danger rounded-2"
                                      style={{ width: "50%" }}
                                    >
                                      إلغاء
                                    </button>
                                  </div>
                                </form>
                              </div>
                            ) : (
                              <div
                                className="position-absolute w-100 h-100 top-0 start-0 p-2 bg-white rounded-3 d-flex flex-column align-items-center justify-content-between overflow-hidden"
                                style={{ zIndex: 10 }}
                              >
                                <p
                                  className="d-flex align-items-center justify-content-center w-100 h-75"
                                  style={{
                                    fontSize: "18px",
                                    fontWeight: "900",
                                  }}
                                >
                                  اختر اولا الحجم و الكمية
                                </p>
                                <div
                                  className="note-btn d-flex align-items-center justify-content-center w-100 mt-2"
                                  style={{ height: "40px", button: "0" }}
                                >
                                  <button
                                    type="button"
                                    onClick={() => setextraArea(!extraArea)}
                                    className="h-100 btn btn-danger rounded-2"
                                    style={{ width: "100%" }}
                                  >
                                    اغلاق
                                  </button>
                                </div>
                              </div>
                            )
                          ) : (
                            ""
                          )}

                          {/* start card body */}

                          <div className="row g-0 h-100 m-0 p-0">
                            <div className="col-5 m-0 p-0 d-flex flex-nowrap flex-column justify-content-between">
                              <img
                                src={`${apiUrl}/images/${product.image}`}
                                className="h-75 w-100"
                                alt="Delicious soup"
                              />
                              {product.available === true ? (
                                <>
                                  {itemId.includes(sizeId) &&
                                  sizeId &&
                                  product.sizes.filter(
                                    (size) => size._id === sizeId
                                  )[0]?.sizeQuantity > 0 ? (
                                    <button
                                      type="button"
                                      className="h-25 p-0 m-0 btn btn-danger btn-block"
                                      style={{ fontSize: "14px" }}
                                      onClick={() => {
                                        deleteItemFromCart(product._id, sizeId);
                                      }}
                                    >
                                      حذف من الطلبات
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className="h-25 p-0 m-0 btn btn-success btn-block"
                                      style={{ fontSize: "14px" }}
                                      onClick={() => {
                                        if (sizeQuantity > 0 &&
                                          sizeId && product.sizes?.find(size =>size._id === sizeId) ) {
                                          addItemToCart(product._id, size._id);
                                        }else{
                                          toast.warn('اختر الحجم و الكمية اولا')
                                        }
                                      }}
                                    >
                                      أضف الى طلباتي
                                    </button>
                                  )}
                                </>
                              ) : (
                                <button
                                  type="button"
                                  className="h-25 p-0 m-0 btn btn-warning btn-block"
                                  style={{ fontSize: "14px" }}
                                >
                                  غير متاح الان
                                </button>
                              )}
                            </div>
                            <div className="col-7 d-flex flex-column justify-content-between align-items-stretch p-1">
                              <div className="d-flex justify-content-between align-items-center m-0 pb-2">
                                <h5 className="card-title text-center m-0">
                                  {product.name}
                                </h5>
                                <span
                                  className="material-icons"
                                  style={{
                                    color: "red",
                                    fontSize: "45px",
                                    cursor: "pointer",
                                  }}
                                  onClick={() => {
                                    setnoteArea(!noteArea);
                                    setproductId(product._id);
                                  }}
                                >
                                  note_alt
                                </span>
                              </div>
                              <div className="d-flex justify-content-between align-items-center m-0 p-1">
                                <p
                                  className="card-text text-center p-0 m-0"
                                  style={{
                                    fontSize: "12px",
                                    fontWeight: "900",
                                  }}
                                >
                                  {product.description}
                                </p>
                                {product.hasExtras && (
                                  <span
                                    className="material-icons"
                                    style={{
                                      color: "green",
                                      fontSize: "45px",
                                      cursor: "pointer",
                                    }}
                                    onClick={() => {
                                      if (product.sizes.some((size) => size._id === sizeId) === false) {
                                        toast.warn('اختر الحجم اولا');
                                        return;
                                      }
                                      
                                      setproductId(product._id);
                                      setextraArea(!extraArea);
                                      setproductExtras(
                                        product.sizes.find((size) => size._id === sizeId)?.extrasSelected || []
                                      );;
                                    }}
                                  >
                                    add_circle
                                  </span>
                                )}
                              </div>

                              <div className="d-flex row justify-content-between align-items-center m-0 pb-1">
                                <div
                                  className="col-8 btn-group btn-group-toggle"
                                  style={{ direction: "ltr" }}
                                  data-toggle="buttons"
                                >
                                  {product.sizes.length > 0 &&
                                    product.sizes?.map((size, i) => {
                                      return (
                                        <label
                                          key={i}
                                          className={`d-flex justify-content-center align-items-center col-4 h-100 btn btn-outline-danger btn-sm${
                                            size._id === sizeId
                                              ? "btn-info"
                                              : "btn-primary"
                                          }`}
                                          style={{
                                            height: "40px",
                                            fontSize: "24px",
                                            fontWeight: "600",
                                          }}
                                          defaultChecked={
                                            size._id === sizeId
                                              ? true
                                              : i === 0
                                              ? true
                                              : false
                                          }
                                          onClick={() => handleSelectSize(size)}
                                        >
                                          <input
                                            type="radio"
                                            name="size"
                                            id={`sizeS${i}`}
                                          />
                                          {size.sizeName}
                                        </label>
                                      );
                                    })}
                                </div>

                                <div className="col-4 d-flex flex-column align-items-end">
                                  {product.sizes.length > 0 &&
                                    product.sizes?.map((size, i) => {
                                      if (size._id === sizeId) {
                                        return (
                                          <React.Fragment key={i}>
                                            {size.sizePriceAfterDescount > 0 ? (
                                              <>
                                                <sup>
                                                  <small className="text-muted">
                                                    <s>{size.sizePrice}ج</s>
                                                  </small>
                                                </sup>
                                                <span
                                                  className="text-danger fw-bold"
                                                  style={{ fontWeight: "900" }}
                                                >
                                                  {size.sizePriceAfterDescount}ج
                                                </span>
                                              </>
                                            ) : (
                                              <span
                                                className="text-danger fw-bold"
                                                style={{ fontWeight: "900" }}
                                              >
                                                {size.sizePrice}ج
                                              </span>
                                            )}
                                          </React.Fragment>
                                        );
                                      }
                                      return null;
                                    })}
                                </div>
                              </div>
                              <div className="form-row align-items-center">
                                <div className="col-4">
                                  <button
                                    className="btn btn-outline-danger w-100 h-100"
                                    type="button"
                                    onClick={() => {
                                      incrementProductQuantity(
                                        product._id,
                                        sizeId
                                      );
                                      setsizeQuantity(sizeQuantity + 1);
                                    }}
                                  >
                                    +
                                  </button>
                                </div>
                                <div className="col-4">
                                  <input
                                    type="text"
                                    className="form-control text-center w-100"
                                    readonly
                                    value={
                                      sizeId
                                        ? product.sizes.filter(
                                            (size) => size._id === sizeId
                                          )[0]?.sizeQuantity
                                        : 0
                                    }
                                  />
                                </div>
                                <div className="col-4">
                                  <button
                                    className="btn btn-outline-danger w-100 h-100"
                                    type="button"
                                    onClick={() => {
                                      decrementProductQuantity(
                                        product._id,
                                        sizeId
                                      );
                                      setsizeQuantity(sizeQuantity - 1);
                                    }}
                                  >
                                    -
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );














                    } else {
                      return (
                        <div
                          className="card mx-auto"
                          key={index}
                          style={{
                            maxWidth: "320px",
                            minWidth: "270px",
                            width: "100%",
                            height: "210px",
                            margin: "0 0 10px 10px",
                            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
                          }}
                        >
                          {product._id === productId && noteArea === true ? (
                            <form
                              onSubmit={(e) => {
                                addNoteToProduct(e, product._id, sizeId);
                                setnoteArea(!noteArea);
                              }}
                              className="position-absolute w-100 h-100 top-0 start-0 p-2 bg-white rounded-3 d-flex flex-column align-items-center justify-content-center overflow-hidden"
                              style={{ zIndex: 10 }}
                            >
                              <textarea
                                placeholder="اضف تعليماتك الخاصة بهذا الطبق"
                                name="note"
                                cols="100"
                                rows="3"
                                onChange={(e) => {
                                  setproductNote(e.target.value);
                                }}
                                className="w-100 h-100 my-1"
                                style={{ zIndex: 11 }}
                              ></textarea>
                              <div
                                className="note-btn d-flex align-items-center justify-content-center w-100 mt-2"
                                style={{ height: "40px" }}
                              >
                                <button className="btn w-50 h-100 text-light btn-success rounded-2 me-2">
                                  تاكيد
                                </button>
                                <button
                                  onClick={() => setnoteArea(!noteArea)}
                                  className="btn w-50 h-100 text-light btn-danger rounded-2"
                                >
                                  الغاء
                                </button>
                              </div>
                            </form>
                          ) : (
                            ""
                          )}

                          {product._id === productId && !product.hasSizes && extraArea === true ? (
                            product.quantity > 0 ? (
                              <div
                                className="position-absolute w-100 h-100 top-0 start-0 bg-white rounded-3 d-flex flex-column align-items-center 
                                justify-content-center overflow-hidden"
                                style={{ zIndex: 10 }}
                              >
                                <form
                                  onSubmit={(e) => {
                                    if (product.extras.length > 0) {
                                      addExtrasToProduct(
                                        e,
                                        product._id,
                                        sizeId
                                      );
                                    }
                                    setproductId('')
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
                                      length: product.quantity,
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
                                    className="form-group d-flex flex-wrap w-100 h-50 p-0 m-0 mt-1"
                                    style={{
                                      overflowY:'auto'
                                    }}
                                  >
                                    {Array.from({
                                      length: product.quantity,
                                    }).map(
                                      (_, ind) =>
                                        selectedButtonIndex === ind + 1 && (
                                          <div
                                            key={ind}
                                            className="form-group w-100 h-auto d-flex align-items-start justify-content-start flex-wrap"
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
                                                    width: "47%",
                                                    height: "20px",
                                                    paddingLeft: "2px",
                                                  }}
                                                >
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
                                                            detail.extraId ===
                                                            extra._id
                                                        )) ||
                                                      (product.extrasSelected &&
                                                        product.extrasSelected[
                                                          ind
                                                        ] &&
                                                        product.extrasSelected[
                                                          ind
                                                        ].extraDetails.some(
                                                          (detail) =>
                                                            detail.extraId ===
                                                            extra._id
                                                        ))
                                                    }
                                                    onChange={(e) =>
                                                      handleAddProductExtras(
                                                        extra,
                                                        ind
                                                      )
                                                    }
                                                  />
                                                  <label
                                                    className="form-check-label mr-3"
                                                    style={{
                                                      fontSize: "13px",
                                                      fontWeight: "800",
                                                    }}
                                                    onClick={(e) =>
                                                      handleAddProductExtras(
                                                        extra,
                                                        ind
                                                      )
                                                    }
                                                  >
                                                    {`${extra.name} - ${extra.price} ج`}{" "}
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
                              <div
                                className="position-absolute w-100 h-100 top-0 start-0 p-2 bg-white rounded-3 d-flex flex-column align-items-center justify-content-between overflow-hidden"
                                style={{ zIndex: 10 }}
                              >
                                <p
                                  className="d-flex align-items-center justify-content-center w-100 h-75"
                                  style={{
                                    fontSize: "18px",
                                    fontWeight: "900",
                                    textAlign: "center",
                                  }}
                                >
                                  اختر اولا الكمية
                                </p>
                                <div
                                  className="note-btn d-flex align-items-center justify-content-center w-100 mt-2"
                                  style={{ height: "40px", button: "0" }}
                                >
                                  <button
                                    type="button"
                                    onClick={() => setextraArea(!extraArea)}
                                    className="h-100 btn btn-danger rounded-2"
                                    style={{ width: "100%" }}
                                  >
                                    اغلاق
                                  </button>
                                </div>
                              </div>
                            )
                          ) : (
                            ""
                          )}

                          <div className="row g-0 h-100 p-0 m-0">
                            <div className="col-5 d-flex flex-column justify-content-between p-0 m-0">
                              <img
                                src={`${apiUrl}/images/${product.image}`}
                                className="h-75 w-100"
                                alt="Delicious soup"
                              />
                              {product.available === true ? (
                                itemId.filter((i) => i === product._id).length >
                                  0 && product.quantity > 0 ? (
                                  <button
                                    type="button"
                                    className="h-25 p-0 m-0 btn btn-danger btn-block"
                                    style={{ fontSize: "14px" }}
                                    onClick={() => {
                                      deleteItemFromCart(product._id, sizeId);
                                    }}
                                  >
                                    حذف من الطلبات
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="h-25 p-0 m-0 btn btn-success btn-block"
                                    style={{ fontSize: "14px" }}
                                    onClick={() => {
                                      if (product.quantity > 0) {
                                        addItemToCart(product._id);
                                      }
                                    }}
                                  >
                                    أضف الى طلباتي
                                  </button>
                                )
                              ) : (
                                <button
                                  type="button"
                                  className="h-25 p-0 m-0 btn btn-warning btn-block"
                                  style={{ fontSize: "14px" }}
                                >
                                  غير متاح الان
                                </button>
                              )}
                            </div>

                            <div className="col-7 d-flex flex-column justify-content-between align-items-stretch p-1">
                              <div className="d-flex justify-content-between align-items-center m-0 pb-2">
                                <h5 className="card-title text-center m-0">
                                  {product.name}
                                </h5>
                                <span
                                  className="material-icons"
                                  style={{
                                    color: "red",
                                    fontSize: "45px",
                                    cursor: "pointer",
                                  }}
                                  onClick={() => {
                                    setnoteArea(!noteArea);
                                    setproductId(product._id);
                                  }}
                                >
                                  note_alt
                                </span>
                              </div>
                              <div className="d-flex justify-content-between align-items-center m-0 pb-2">
                                <p
                                  className="card-text text-center mb-1 p-0"
                                  style={{
                                    fontSize: "12px",
                                    fontWeight: "900",
                                  }}
                                >
                                  {product.description}
                                </p>
                                {product.hasExtras && (
                                  <span
                                    className="material-icons"
                                    style={{
                                      color: "green",
                                      fontSize: "45px",
                                      cursor: "pointer",
                                    }}
                                    onClick={() => {
                                      setproductExtras(
                                        product.extrasSelected
                                          ? product.extrasSelected
                                          : []
                                      );
                                      setextraArea(!extraArea);
                                      setproductId(product._id);
                                    }}
                                  >
                                    add_circle
                                  </span>
                                )}
                              </div>
                              <div className="d-flex row justify-content-between align-items-center m-0 pb-1">
                                <div className="col-7"></div>
                                <div className="col-5 d-flex flex-column align-items-end">
                                  {product.discount > 0 ? (
                                    <div>
                                      <sup>
                                        <small
                                          className="text-muted"
                                          style={{ fontWeight: "900" }}
                                        >
                                          <s>{product.price}ج</s>
                                        </small>
                                      </sup>
                                      <span
                                        className="text-danger fw-700"
                                        style={{ fontWeight: "900" }}
                                      >
                                        {product.priceAfterDiscount}ج
                                      </span>
                                    </div>
                                  ) : (
                                    <span
                                      className="text-danger fw-700"
                                      style={{ fontWeight: "900" }}
                                    >
                                      {product.price}ج
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="form-row align-items-center">
                                <div className="col-4">
                                  <button
                                    className="btn btn-outline-danger w-100 h-100"
                                    type="button"
                                    onClick={() =>
                                      incrementProductQuantity(product._id)
                                    }
                                  >
                                    +
                                  </button>
                                </div>
                                <div className="col-4">
                                  <input
                                    type="text"
                                    className="form-control text-center w-100"
                                    readOnly
                                    value={product.quantity}
                                  />
                                </div>
                                <div className="col-4">
                                  <button
                                    className="btn btn-outline-danger w-100 h-100"
                                    type="button"
                                    onClick={() =>
                                      decrementProductQuantity(product._id)
                                    }
                                  >
                                    -
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  })
              : ""}
          </div>
        );
      }}
    </AppContext.Consumer>
  );
};

export   default MenuCard;
