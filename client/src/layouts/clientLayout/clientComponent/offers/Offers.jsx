import React, { useState, useEffect, useContext } from "react";
import { dataContext } from "../../../../context/appContext";
import {toast } from "react-toastify";

// Import Swiper React components
import { Swiper, SwiperSlide } from "swiper/react";

// Import Swiper styles
import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/pagination";

import "./Offers.css";

// import required modules
import { EffectCoverflow, Pagination } from "swiper/modules";

export default function Offers() {
  const {
    allProducts,
    productsOffer,
    sizesOffer,
    setproductExtras,
    productExtras,
    handleAddProductExtras,
    addExtrasToProduct,
    itemId,
    addItemToCart,
    deleteItemFromCart,
    incrementProductQuantity,
    decrementProductQuantity,
    setproductNote,
    addNoteToProduct,
    handleGetTokenAndConfig,
    apiUrl,
  } = useContext(dataContext);

  const [noteArea, setnoteArea] = useState(false);
  const [extraArea, setextraArea] = useState(false);
  const [productId, setproductId] = useState("");

  const [selectedButtonIndex, setSelectedButtonIndex] = useState(1);

  return (
    <section id="offer" className="offers-section">
      <div className="section-title">
        <h2>العروض</h2>
      </div>
      <Swiper
        effect={"coverflow"}
        grabCursor={true}
        centeredSlides={true}
        slidesPerView={"auto"}
        coverflowEffect={{
          rotate: 30,
          stretch: 0,
          depth: 100,
          modifier: 1,
          slideShadows: true,
        }}
        pagination={true}
        modules={[EffectCoverflow, Pagination]}
        className="mySwiper"
      >
        {/* {allProducts.map((product, productIndex) => {
                  if (product.hasSizes) {
                    return product.sizes.map((size, sizeIndex) => {
                      if (size.sizeDiscount > 0) {
                        return (
                          <SwiperSlide key={size._id}>
                            <div className="offer-card">
                              <img className='offer-img' src={`${apiUrl}/images/${product.image}`} alt="Delicious soup" />
                              {size._id === productId && noteArea === true ?
                                <form onSubmit={(e) => { addNoteToProduct(e, product._id, size._id); setnoteArea(!noteArea); }}
                                  className="position-absolute w-100 h-100 top-0 start-0 p-1 m-0 bg-white rounded-3 d-flex flex-column align-items-center justify-content-center overflow-hidden"
                                  style={{ zIndex: 10 , height:'40%'}}
                                >
                                  <textarea
                                    placeholder='اضف تعليماتك الخاصة بهذا الطبق'
                                    name="note"
                                    cols="100"
                                    rows="3"
                                    onChange={(e) => { setproductNote(e.target.value) }}
                                    className="w-100 h-100 my-1"
                                    style={{ zIndex: 11 }}
                                  ></textarea>
                                  <div className='note-btn d-flex align-items-center justify-content-center w-100 mt-2' style={{ height: '40px' }}>
                                    <button className="btn w-50 h-100 text-light btn-success rounded-2 me-2">تاكيد</button>
                                    <button
                                      onClick={() => setnoteArea(!noteArea)}
                                      className="btn w-50 h-100 text-light btn-danger rounded-2"
                                    >الغاء</button>
                                  </div>
                                </form>
                                : ''}
                              <div className="offer-detalis">
                                <div className='offer-info'>
                                  <div className='p-info'>
                                    <h2 className='p-name'>{`${product.name} - ${size.sizeName}`}</h2>
                                    <span className="material-symbols-outlined note-icon" onClick={() => { setnoteArea(!noteArea); setproductId(size._id); }}>note_alt</span>
                                  </div>
                                  <div className='offer-description'>{size.description}</div>
                                </div>
                                <div className="offer-price">
                                  <div className="p-counter">
                                    <button className='counter-symb' onClick={() => { decrementProductQuantity(product._id, size._id) }}>-</button>
                                    <div className='counter-num'>{size.sizeQuantity}</div>
                                    <button className='counter-symb' onClick={() => { incrementProductQuantity(product._id, size._id) }}>+</button>
                                  </div>
                                  <div className='p-price'>
                                    {size.sizePriceAfterDiscount}ج <span>{size.sizePrice}</span>
                                  </div>
                                </div>
                                <div className='offer-card-btn'>
                                  {itemId.filter((i) => i === size._id).length > 0 && size.sizeQuantity > 0 ? (
                                    <button className='delcart' onClick={() => { deleteItemFromCart(product._id, size._id); }}>
                                      احذف من الطلبات
                                    </button>
                                  ) : (
                                    <button className='addtocart' onClick={() => { if (size.sizeQuantity > 0) { addItemToCart(product._id, size._id) } }}>
                                      اضف الي طلباتي
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </SwiperSlide>
                        );
                      }
                      return null;
                    });
                  } else if (product.discount > 0) {
                    return (
                      <SwiperSlide key={product._id}>
                        <div className="offer-card">
                          <img className='offer-img' src={`${apiUrl}/images/${product.image}`} alt="Delicious soup" />
                          {product._id === productId && noteArea === true ?
                          <form onSubmit={(e) => { addNoteToProduct(e, product._id, ''); setnoteArea(!noteArea); }} 
                          className="position-absolute w-100 h-100 top-0 start-0 p-1 m-0 bg-white rounded-3 d-flex flex-column align-items-center justify-content-center overflow-hidden"
                            style={{ zIndex: 10, height:'40%' }}
                          >
                            <textarea
                              placeholder='اضف تعليماتك الخاصة بهذا الطبق'
                              name="note"
                              cols="100"
                              rows="3"
                              onChange={(e) => { setproductNote(e.target.value) }}
                              className="w-100 h-100 my-1"
                              style={{ zIndex: 11 }}
                            ></textarea>
                            <div className='note-btn d-flex align-items-center justify-content-center w-100 mt-2' style={{height: '40px'}}>
                              <button className="btn w-50 h-100 text-light btn-success rounded-2 me-2">تاكيد</button>
                              <button
                                onClick={() => setnoteArea(!noteArea)}
                                className="btn w-50 h-100 text-light btn-danger rounded-2"
                              >الغاء</button>
                            </div>
                          </form>
                          : ''}
                          <div className="offer-detalis">
                            <div className='offer-info'>
                              <div className='p-info'>
                                <h2 className='p-name'>{product.name}</h2>
                                <span className="material-symbols-outlined note-icon" onClick={() => { setnoteArea(!noteArea); setproductId(product._id); }}>note_alt</span>
                              </div>
                              <div className='offer-description'>{product.description}</div>
                            </div>
                            <div className="offer-price">
                              <div className="p-counter">
                                <button className='counter-symb' onClick={() => { decrementProductQuantity(product._id) }}>-</button>
                                <div className='counter-num'>{product.quantity}</div>
                                <button className='counter-symb' onClick={() => { incrementProductQuantity(product._id) }}>+</button>
                              </div>
                              <div className='p-price'>
                                {product.price - product.discount}ج <span>{product.price}</span>
                              </div>
                            </div>
                            <div className='offer-card-btn'>
                              {itemId.filter((i) => i === product._id).length > 0 && product.quantity > 0 ? (
                                <button className='delcart' onClick={() => { deleteItemFromCart(product._id); }}>
                                  احذف من الطلبات
                                </button>
                              ) : (
                                <button className='addtocart' onClick={() => { if (product.quantity > 0) { addItemToCart(product._id)} }}>
                                  اضف الي طلباتي
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </SwiperSlide>
                    );
                  }
                  return null;
                })} */}

        {allProducts.map((product, productIndex) => {
          if (product.hasSizes) {
            return product.sizes.map((size, sizeIndex) => {
              if (size.sizeDiscount > 0) {
                return (
                  <SwiperSlide key={size._id}>
                    <div className="card h-100">
                      <img
                        src={`${apiUrl}/images/${product.image}`}
                        alt="Delicious soup"
                        className="card-img-top"
                        style={{ height: "40%" }}
                      />
                      {size._id === productId && noteArea === true ? (
                        <form
                          onSubmit={(e) => {
                            addNoteToProduct(e, product._id, size._id);
                            setnoteArea(!noteArea);
                          }}
                          className="position-absolute w-100 h-100 top-0 start-0 p-1 m-0 bg-white d-flex flex-column align-items-center justify-content-center"
                          style={{ zIndex: 100 }}
                        >
                          <textarea
                            placeholder="اضف تعليماتك الخاصة بهذا الطبق"
                            name="note"
                            cols="100"
                            rows="3"
                            onChange={(e) => {
                              setproductNote(e.target.value);
                            }}
                            className="w-100 h-100 my-1 form-control"
                            style={{ zIndex: 11 }}
                          ></textarea>
                          <div
                            className="d-flex align-items-center justify-content-center w-100 mt-2"
                            style={{ height: "40px" }}
                          >
                            <button
                              type="submit"
                              className="btn btn-success w-50 h-100 me-2"
                            >
                              تاكيد
                            </button>
                            <button
                              type="button"
                              onClick={() => setnoteArea(!noteArea)}
                              className="btn btn-danger w-50 h-100"
                            >
                              الغاء
                            </button>
                          </div>
                        </form>
                      ) : (
                        ""
                      )}

                      {size._id === productId && extraArea === true ? (
                        size.sizeQuantity > 0 ? (
                          <div
                            className="position-absolute w-100 h-100 top-0 start-0 p-1 m-0 bg-white d-flex flex-column align-items-center justify-content-center"
                            style={{ zIndex: 100 }}
                          >
                            <form
                              onSubmit={(e) => {
                                if (product.extras.length > 0) {
                                  addExtrasToProduct(e, product._id, size._id);
                                }
                                setSelectedButtonIndex(1);
                                setextraArea(!extraArea);
                              }}
                              className="w-100 h-100 top-0 start-0 bg-white rounded-3 d-flex flex-column align-items-center justify-content-between m-0 p-0"
                            >
                              {/* أزرار الأصناف */}
                              <div className="d-flex align-items-center justify-content-center flex-wrap w-100 h-auto">
                                {Array.from({
                                  length: product.sizes.filter(
                                    (si) => si._id === size._id
                                  )[0].sizeQuantity,
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

                              <div className="form-group d-flex flex-wrap w-100 h-auto p-0 m-0 mt-1">
                                {Array.from({
                                  length: product.sizes.filter(
                                    (si) => si._id === size._id
                                  )[0].sizeQuantity,
                                }).map(
                                  (_, ind) =>
                                    selectedButtonIndex === ind + 1 && (
                                      <div
                                        key={ind}
                                        className="form-group w-100 h-auto d-flex align-items-start justify-content-between flex-wrap"
                                        style={{
                                          padding: "5px",
                                          overflowY: "auto",
                                        }}
                                      >
                                        {product.extras.map((extra, i) => (
                                          <div
                                            className="d-flex align-items-center justify-content-between p-0 m-0 pl-1 mb-1"
                                            key={i}
                                          >
                                            <input
                                              type="checkbox"
                                              className="fs-3 ml-1"
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
                                                    size._id === size._id
                                                )[0].extrasSelected &&
                                                  product.sizes.filter(
                                                    (size) =>
                                                      size._id === size._id
                                                  )[0].extrasSelected[ind] &&
                                                  product.sizes
                                                    .filter(
                                                      (size) =>
                                                        size._id === size._id
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
                                              className="ms-2"
                                              style={{
                                                fontSize: "14px",
                                                fontWeight: "900",
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
                            className="position-absolute w-100 h-50 top-0 start-0 p-2 bg-white rounded-3 d-flex flex-column align-items-center justify-content-between overflow-hidden"
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

                      <div
                        className="card-body d-flex flex-column flex-nowrap align-items-center justify-content-between w-100 p-0 m-0"
                        style={{ height: "60%" }}
                      >
                        <h5 className="card-title w-100 p-1 m-0 d-flex justify-content-between align-items-center">
                          {`${product.name} - ${size.sizeName}`}
                          <span
                            className="material-symbols-outlined text-warning"
                            style={{
                              fontSize: "45px",
                              cursor: "pointer",
                            }}
                            onClick={() => {
                              setnoteArea(!noteArea);
                              setproductId(size._id);
                            }}
                          >
                            note_alt
                          </span>
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
                                setproductId(size._id);
                                
                              }}
                            >
                              add_circle
                            </span>
                          )}
                        </h5>
                        <p
                          className="card-text text-center"
                          style={{
                            maxHeight: "25%",
                            fontSize: "12px",
                            fontWeight: "700",
                            textOverflow: "hidden",
                          }}
                        >
                          {size.description}
                        </p>
                        <div className="w-100 p-1 m-0 d-flex justify-content-between align-items-center">
                          <div
                            className="col-8 p-0 m-0 d-flex flex-nowrap align-items-center justify-content-between"
                            style={{ borderRadius: "10px" }}
                          >
                            <button
                              className="btn btn-danger py-2 px-3 fs-3 fw-800 col col"
                              onClick={() => {
                                decrementProductQuantity(product._id, size._id);
                              }}
                            >
                              -
                            </button>
                            <input
                              type="text"
                              readOnly
                              className="form-control text-center text-dark col"
                              style={{
                                fontSize: "16px",
                                fontWeight: "700",
                              }}
                              value={size.sizeQuantity}
                            />
                            <button
                              className="btn btn-primary py-2 px-3 fs-3 fw-800 col"
                              onClick={() => {
                                incrementProductQuantity(product._id, size._id);
                              }}
                            >
                              +
                            </button>
                          </div>
                          <div
                            style={{
                              fontSize: "18px",
                              fontWeight: "600",
                            }}
                          >
                            {size.sizePriceAfterDiscount}ج
                            <sup>
                              <del style={{ fontSize: "14px" }}>
                                {size.sizePrice}
                              </del>
                            </sup>
                          </div>
                        </div>
                        <div className="w-100 h-25 p-0 mt-2">
                          {itemId.filter((i) => i === size._id).length > 0 &&
                          size.sizeQuantity > 0 ? (
                            <button
                              className="btn btn-danger w-100 h-100 m-0"
                              onClick={() => {
                                deleteItemFromCart(product._id, size._id);
                              }}
                            >
                              احذف من الطلبات
                            </button>
                          ) : (
                            <button
                              className="btn btn-success w-100 h-100 m-0"
                              onClick={() => {
                                if (size.sizeQuantity > 0) {
                                  addItemToCart(product._id, size._id);
                                }
                              }}
                            >
                              اضف الي طلباتي
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </SwiperSlide>
                );
              }
              return null;
            });
          } else if (product.discount > 0) {
            return (
              <SwiperSlide key={product._id}>
                <div className="card h-100">
                  <img
                    src={`${apiUrl}/images/${product.image}`}
                    alt="Delicious soup"
                    className="card-img-top"
                    style={{ height: "40%" }}
                  />
                  {product._id === productId && noteArea === true ? (
                    <form
                      onSubmit={(e) => {
                        addNoteToProduct(e, product._id, "");
                        setnoteArea(!noteArea);
                      }}
                      className="position-absolute w-100 h-100 top-0 start-0 p-1 m-0 bg-white d-flex flex-column align-items-center justify-content-center"
                      style={{ zIndex: 100 }}
                    >
                      <textarea
                        placeholder="اضف تعليماتك الخاصة بهذا الطبق"
                        name="note"
                        cols="100"
                        rows="3"
                        onChange={(e) => {
                          setproductNote(e.target.value);
                        }}
                        className="w-100 h-100 my-1 form-control"
                        style={{ zIndex: 11 }}
                      ></textarea>
                      <div
                        className="d-flex align-items-center justify-content-center w-100 mt-2"
                        style={{ height: "40px" }}
                      >
                        <button
                          type="submit"
                          className="btn btn-success w-50 h-100 me-2"
                        >
                          تاكيد
                        </button>
                        <button
                          type="button"
                          onClick={() => setnoteArea(!noteArea)}
                          className="btn btn-danger w-50 h-100"
                        >
                          الغاء
                        </button>
                      </div>
                    </form>
                  ) : (
                    ""
                  )}

                  {product._id === productId && extraArea === true ? (
                    product.quantity > 0 ? (
                      <div
                        className="position-absolute w-100 h-100 top-0 start-0 p-1 m-0 bg-white d-flex flex-column align-items-center justify-content-center"
                        style={{ zIndex: 100 }}
                      >
                        <form
                          onSubmit={(e) => {
                            if (product.extras.length > 0) {
                              addExtrasToProduct(e, product._id, "");
                            }
                            setSelectedButtonIndex(1);
                            setextraArea(!extraArea);
                          }}
                          className="w-100 h-100 top-0 start-0 bg-white rounded-3 d-flex flex-column align-items-center justify-content-between m-0 p-0"
                        >
                          {/* أزرار الأصناف */}
                          <div className="d-flex align-items-center justify-content-center flex-wrap w-100 h-auto">
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

                          <div className="form-group d-flex flex-wrap w-100 h-auto p-0 m-0 mt-1">
                            {Array.from({ length: product.quantity }).map(
                              (_, ind) =>
                                selectedButtonIndex === ind + 1 && (
                                  <div
                                    key={ind}
                                    className="form-group w-100 h-auto d-flex align-items-start justify-content-between flex-wrap"
                                    style={{
                                      padding: "5px",
                                      overflowY: "auto",
                                    }}
                                  >
                                    {product.extras.map((extra, i) => (
                                      <div
                                        className="mb-1 d-flex align-items-center justify-content-between pl-1"
                                        key={i}
                                      >
                                        <input
                                          type="checkbox"
                                          className="fs-3 ml-1 "
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
                                          className="ms-2"
                                          style={{
                                            fontSize: "14px",
                                            fontWeight: "900",
                                          }}
                                          onClick={(e) =>
                                            handleAddProductExtras(extra, ind)
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
                        className="position-absolute w-100 h-50 top-0 start-0 p-2 bg-white rounded-3 d-flex flex-column align-items-center justify-content-between overflow-hidden"
                        style={{ zIndex: 10 }}
                      >
                        <p
                          className="d-flex align-items-center justify-content-center w-100 h-75"
                          style={{ fontSize: "18px", fontWeight: "900" }}
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

                  <div
                    className="card-body d-flex flex-column flex-nowrap align-items-center justify-content-between w-100 p-0 m-0"
                    style={{ height: "60%" }}
                  >
                    <h5 className="card-title w-100 p-1 m-0 d-flex justify-content-between align-items-center">
                      {`${product.name}`}
                      <span
                        className="material-symbols-outlined text-warning"
                        style={{ fontSize: "45px", cursor: "pointer" }}
                        onClick={() => {
                          setnoteArea(!noteArea);
                          setproductId(product._id);
                        }}
                      >
                        note_alt
                      </span>
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
                    </h5>
                    <p
                      className="card-text text-center"
                      style={{
                        maxHeight: "25%",
                        fontSize: "12px",
                        fontWeight: "700",
                        textOverflow: "hidden",
                      }}
                    >
                      {product.description}
                    </p>
                    <div className="w-100 p-1 m-0 d-flex justify-content-between align-items-center">
                      <div
                        className="col-8 p-0 m-0 d-flex flex-nowrap align-items-center justify-content-between"
                        style={{ borderRadius: "15px" }}
                      >
                        <button
                          className="btn btn-danger py-2 px-3 fs-3 fw-800 col"
                          onClick={() => {
                            decrementProductQuantity(product._id, "");
                          }}
                        >
                          -
                        </button>
                        <input
                          type="text"
                          readOnly
                          className="form-control text-center text-dark col"
                          style={{ fontSize: "16px", fontWeight: "700" }}
                          value={product.quantity}
                        />
                        <button
                          className="btn btn-primary py-2 px-3 fs-3 fw-800 col"
                          onClick={() => {
                            incrementProductQuantity(product._id, "");
                          }}
                        >
                          +
                        </button>
                      </div>
                      <div style={{ fontSize: "18px", fontWeight: "600" }}>
                        {product.priceAfterDiscount}ج
                        <sup>
                          <del style={{ fontSize: "14px" }}>
                            {product.price}
                          </del>
                        </sup>
                      </div>
                    </div>
                    <div className="w-100 h-25 p-0 mt-2">
                      {itemId.filter((i) => i === product._id).length > 0 &&
                      product.quantity > 0 ? (
                        <button
                          className="btn btn-danger w-100 h-100 m-0"
                          onClick={() => {
                            deleteItemFromCart(product._id, "");
                          }}
                        >
                          احذف من الطلبات
                        </button>
                      ) : (
                        <button
                          className="btn btn-success w-100 h-100 m-0"
                          onClick={() => {
                            if (product.quantity > 0) {
                              addItemToCart(product._id, "");
                            }
                          }}
                        >
                          اضف الي طلباتي
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            );
          }
          return null;
        })}
      </Swiper>
    </section>
  );
}
