import React, { useState, useContext } from "react";
import { toast } from "react-toastify";
import { AppContext } from "../../../../context/appContext";

const POSCard = () => {
  const {
    allProducts,
    menuCategoryId,
    addItemToCart,
    handleGetTokenAndConfig,
    apiUrl,
  } = useContext(AppContext);

  const [sizeId, setsizeId] = useState("");

  const handleSelectSize = (size) => {
    setsizeId(size._id);
  };

  const [selectedButtonIndex, setSelectedButtonIndex] = useState(1);

  return (
    <div className="d-flex flex-wrap flex-md-row">
      {allProducts.length > 0
        ? allProducts
            .filter((pro) => pro.category._id === menuCategoryId)
            .map((product, index) => {
              if (product.hasSizes) {
                return (
                  <div
                    className="card d-flex flex-column justify-content-between mx-auto m-1 bg-secondary"
                    key={index}
                    style={{
                      width: "180px",
                      height: "200px",
                      border: "2px solid black",
                      transition: "transform 0.3s, border-color 0.3s",
                    }}
                  >
                    <div
                      className="d-flex flex-column justify-content-between"
                      style={{ width: "100%", height: "35%" }}
                      onClick={() => {
                        if (
                          sizeId &&
                          product.sizes?.find((size) => size._id === sizeId)
                        ) {
                          addItemToCart(product._id, sizeId);
                        } else {
                          toast.warn("اختر الحجم lاولا");
                        }
                      }}
                    >
                      <img
                        src={`${apiUrl}/images/${product.image}`}
                        className="img-fluid h-100 w-100"
                        alt={product.name}
                        style={{ objectFit: "cover" }}
                      />
                    </div>
                    <div
                      className="btn-group w-100 p-0 m-0 btn-group-toggle "
                      style={{ direction: "ltr" }}
                      data-toggle="buttons"
                    >
                      {product.sizes.length > 0 &&
                        product.sizes?.map((size, i) => {
                          return (
                            <label
                              key={i}
                              className={`d-flex justify-content-center align-items-center col-4 btn  ${
                                size._id === sizeId ? "btn-info" : "btn-primary"
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

                    <div className="d-flex bg-secondary justify-content-between align-items-center p-0 mx-1">
                      <h5
                        className="card-title text-light mb-0 text-truncate"
                        style={{
                          width: "70%",
                          fontSize: "16px",
                          fontWeight: "900",
                        }}
                      >
                        {product.name}
                      </h5>
                      <div className="text-end ">
                        {product.sizes.length > 0 &&
                          product.sizes?.map((size, i) => {
                            if (size._id === sizeId) {
                              return (
                                <React.Fragment key={i}>
                                  {size.sizePriceAfterDescount > 0 ? (
                                    <>
                                      <span className="text-light fw-bold">
                                        {size.sizePriceAfterDescount}ج
                                      </span>
                                      <sup>
                                        <del
                                          className="text-muted text-light"
                                          style={{
                                            fontSize: "14px",
                                            fontWeight: "900",
                                          }}
                                        >
                                          {size.sizePrice}ج
                                        </del>
                                      </sup>
                                    </>
                                  ) : (
                                    <span className="text-light fw-bold">
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
                    <div className="d-flex  w-100bg-secondary justify-content-between align-items-center p-0 mx-1">
                      <h5
                        className="card-title text-center text-light mb-1 "
                        style={{ fontSize: "14px", fontWeight: "900" }}
                      >
                        {product.description}
                      </h5>
                    </div>
                  </div>
                );
              } else {
                return (
                  <div
                    className="card d-flex flex-column justify-content-between mx-auto m-1 bg-secondary"
                    key={index}
                    style={{
                      width: "180px",
                      height: "170px",
                      border: "2px solid black",
                      transition: "transform 0.3s, border-color 0.3s",
                    }}
                    onClick={() => {
                      addItemToCart(product._id, sizeId);
                    }}
                  >
                    <div
                      className="d-flex flex-column justify-content-between"
                      style={{ width: "100%", height: "50%" }}
                    >
                      <img
                        src={`${apiUrl}/images/${product.image}`}
                        className="img-fluid h-100 w-100"
                        alt="Delicious soup"
                        style={{ objectFit: "cover" }}
                      />
                    </div>
                    <div className="d-flex bg-secondary justify-content-between align-items-center p-0 mx-1 mt-1">
                      <h5
                        className="card-title text-light mb-0 text-truncate"
                        style={{
                          width: "70%",
                          fontSize: "16px",
                          fontWeight: "900",
                        }}
                      >
                        {product.name}
                      </h5>
                      <div className="text-end ">
                        {product.discount > 0 ? (
                          <>
                            <span className="text-light fw-bold">
                              {product.priceAfterDiscount}ج
                            </span>
                            <sup>
                              <del
                                className="text-dark"
                                style={{
                                  fontSize: "14px",
                                  fontWeight: "900",
                                }}
                              >
                                {product.price}ج
                              </del>
                            </sup>
                          </>
                        ) : (
                          <span className="text-light fw-bold">
                            {product.price}ج
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="d-flex  w-100bg-secondary justify-content-between align-items-center p-0 mx-1">
                      <h5
                        className="card-title text-center text-light mb-1 "
                        style={{ fontSize: "14px", fontWeight: "900" }}
                      >
                        {product.description}
                      </h5>
                    </div>
                  </div>
                );
              }
            })
        : ""}
    </div>
  );
};

export default POSCard;
