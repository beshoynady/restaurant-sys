import React, { useState, useEffect, useRef, useContext } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { dataContext } from "../../../../context/appContext";
import "../orders/Orders.css";

const Products = () => {
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
    apiUrl,
    handleGetTokenAndConfig,
  } = useContext(dataContext);

  const productPermission =
    permissionsList &&
    permissionsList.filter((perission) => perission.resource === "Products")[0];

  const [productName, setproductName] = useState("");
  const [productPrice, setproductPrice] = useState(0);
  const [productDiscount, setproductDiscount] = useState(0);
  const [productDescription, setproductDescription] = useState("");
  const [productCategoryId, setproductCategoryId] = useState(null);
  const [available, setavailable] = useState(false);
  const [productimg, setproductimg] = useState("");

  const [hasSizes, setHasSizes] = useState(false);
  const [sizes, setsizes] = useState([
    { sizeName: "", sizePrice: 0, sizeDiscount: 0, sizePriceAfterDiscount: 0 },
  ]);

  const handleCheckboxChange = (e) => {
    setHasSizes(!hasSizes);
  };

  const handleIsHasExtrasCheckboxChange = (e) => {
    setHasExtras(!hasExtras);
  };

  const handleIsAddonCheckboxChange = (e) => {
    setIsAddon(!isAddon);
  };

  const addSize = () => {
    setsizes([
      ...sizes,
      {
        sizeName: "",
        sizePrice: 0,
        sizeDiscount: 0,
        sizePriceAfterDiscount: 0,
      },
    ]);
  };

  const removeSize = (index) => {
    const newsizes = sizes.filter((size, i) => i !== index);
    setsizes([...newsizes]);
  };

  const [isCombo, setIsCombo] = useState(false);
  const [comboItems, setComboItems] = useState([
    {
      product: "",
      quantity: 0,
    },
  ]);

  const handleIsComboCheckboxChange = () => {
    setIsCombo(!isCombo);
  };

  const addComboItem = () => {
    setComboItems([
      ...comboItems,
      {
        product: "",
        quantity: 0,
      },
    ]);
  };

  const removeComboItem = (index) => {
    setComboItems(comboItems.filter((_, i) => i !== index));
  };

  const handleProductChange = (e, index) => {
    const newComboItems = [...comboItems];
    newComboItems[index].product = e.target.value;
    setComboItems(newComboItems);
  };

  const handleQuantityChange = (e, index) => {
    const newComboItems = [...comboItems];
    newComboItems[index].quantity = Number(e.target.value);
    setComboItems(newComboItems);
  };

  const [hasExtras, setHasExtras] = useState(false);
  const [isAddon, setIsAddon] = useState(false);
  const [extras, setExtras] = useState([]);

  const addExtra = (extraId) => {
    if (extras.includes(extraId)) {
      setExtras(extras.filter((item) => item !== extraId));
    } else {
      setExtras([...extras, extraId]);
    }
  };

  const [department, setdepartment] = useState("");
  // const departmentList = ["Kitchen", "Bar", "Grill"]

  const [alldepartments, setAlldepartments] = useState([]);

  const getAlldepartments = async () => {
    const config = await handleGetTokenAndConfig();

    try {
      const res = await axios.get(`${apiUrl}/api/department`, config);
      if (res.status === 200) {
        const departments = res.data.data;

        setAlldepartments(departments);
      } else {
        throw new Error("Failed to fetch data");
      }
    } catch (error) {
      console.error("حدث خطأ أثناء استلام البيانات:", error);
      toast.error("حدث خطأ أثناء جلب البيانات، يرجى المحاولة مرة أخرى لاحقًا.");
    }
  };

  const createProduct = async (e) => {
    e.preventDefault();

    const config = await handleGetTokenAndConfig();

    try {
      if (productPermission && !productPermission.create) {
        toast.warn("ليس لك صلاحية لاضافه الاصناف");
        return;
      }
      const formData = new FormData();
      formData.append("productName", productName);
      formData.append("productDescription", productDescription);
      formData.append("productCategoryId", productCategoryId);
      formData.append("available", available);
      formData.append("isAddon", isAddon);
      formData.append("department", department);

      if (hasSizes) {
        formData.append("hasSizes", hasSizes);
        formData.append("sizes", JSON.stringify(sizes));
        // sizes.forEach((size, index) => {
        //   formData.append(`sizes[${index}]`, size);
        // });
      } else {
        formData.append("productPrice", productPrice);

        if (productDiscount > 0) {
          formData.append("productDiscount", productDiscount);
          const priceAfterDiscount = productPrice - productDiscount;
          formData.append(
            "priceAfterDiscount",
            priceAfterDiscount > 0 ? priceAfterDiscount : 0
          );
        }
      }

      if (hasExtras) {
        formData.append("hasExtras", hasExtras);
        formData.append("extras", JSON.stringify(extras));
        // extras.forEach((extra, index) => {
        //   formData.append(`extras[${index}]`, extra);
        // });
      }

      if (isCombo) {
        formData.append("isCombo", isCombo);
        formData.append("comboItems", JSON.stringify(comboItems));
        // extras.forEach((extra, index) => {
        //   formData.append(`extras[${index}]`, extra);
        // });
      }

      if (productimg) {
        formData.append("image", productimg);
      } else {
        toast.error("يجب إضافة صورة للمنتج");
        return;
      }

      const response = await axios.post(apiUrl + "/api/product/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...config.headers,
        },
      });

      if (response.status === 201) {
        getallproducts();

        toast.success("تم إنشاء المنتج بنجاح.");
      } else {
        throw new Error(
          "فشلت عملية إضافة المنتج إلى القائمة! يرجى المحاولة مرة أخرى."
        );
      }
    } catch (error) {
      console.error(
        "حدث خطأ أثناء إضافة المنتج! يرجى المحاولة مرة أخرى:",
        error
      );
      toast.error("فشل إنشاء المنتج. يرجى المحاولة مرة أخرى لاحقًا.", {
        position: toast.POSITION.TOP_RIGHT,
      });
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const maxSize = 1024 * 1024; // 1 MB
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];

    if (file) {
      // Check file size
      if (file.size > maxSize) {
        toast.error(
          "Maximum file size exceeded (1 MB). Please select a smaller file."
        );
        return;
      }

      // Check file type
      if (!allowedTypes.includes(file.type)) {
        toast.error("Invalid file type. Only JPEG, JPG, and PNG are allowed.");
        return;
      }

      // If both checks pass, set the file
      setproductimg(file);
    } else {
      toast.error("No file selected.");
    }
  };

  const [productInfo, setproductInfo] = useState({});
  const handelEditProductModal = (product) => {
    setproductInfo(product);
    setproductId(product._id);
    setproductName(product.name);
    setproductDescription(product.description);
    setproductPrice(product.price);
    setproductDiscount(product.discount);
    setproductCategoryId(product.category._id);
    setavailable(product.available);
    setdepartment(product.department?._id);
    setsizes(
      product.sizes
        ? product.sizes
        : [
            {
              sizeName: "",
              sizePrice: 0,
              sizeDiscount: 0,
              sizePriceAfterDiscount: 0,
            },
          ]
    );
    setHasSizes(product.hasSizes);
    setIsAddon(product.isAddon);
    setHasExtras(product.hasExtras);
    if (product.hasExtras) {
      const list = product.extras.map((ext) => ext._id);

      setExtras(list);
    } else {
      setExtras([]);
    }
  };

  const [productId, setproductId] = useState("");
  const editProduct = async (e) => {
    e.preventDefault();
    const config = await handleGetTokenAndConfig();
    try {
      if (productPermission && !productPermission.update) {
        toast.warn("ليس لك صلاحية لتعديل الاصناف");
        return;
      }
      // Prepare request body
      const requestBody = {
        productName: productName,
        productDescription: productDescription,
        productCategoryId: productCategoryId,
        department: department,
        available: available,
        isAddon: isAddon,
      };

      // If product has sizes, include sizes in the request body
      if (hasSizes) {
        requestBody.hasSizes = hasSizes;
        requestBody.sizes = sizes;
      } else {
        requestBody.productPrice = productPrice;
        requestBody.productDiscount = productDiscount;
        const priceAfterDiscount = productPrice - productDiscount;
        requestBody.priceAfterDiscount =
          priceAfterDiscount > 0 ? priceAfterDiscount : 0;
      }

      if (hasExtras) {
        requestBody.hasExtras = hasExtras;
        requestBody.extras = extras;
      }
      if (isCombo) {
        requestBody.isCombo = isCombo;
        requestBody.comboItems = comboItems;
      }

      if (productimg) {
        requestBody.image = productimg;
      }

      // Perform the API request to update the product
      const response = await axios.put(
        `${apiUrl}/api/product/${productId}`,
        requestBody,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            ...config.headers,
          },
        }
      );

      // Handle successful response

      if (response) {
        // Refresh categories and products after successful update
        getallCategories();
        getallproducts();

        // Show success toast
        toast.success("تم تحديث المنتج بنجاح.");
      }
    } catch (error) {
      // Handle errors

      // Show error toast
      toast.error("حدث خطأ أثناء تحديث المنتج. الرجاء المحاولة مرة أخرى.");
    }
  };

  const [listofProducts, setlistofProducts] = useState([]);
  const [listofProductsAddon, setlistofProductsAddon] = useState([]);

  const getallproducts = async () => {
    const config = await handleGetTokenAndConfig();
    try {
      const response = await axios.get(apiUrl + "/api/product/");
      if (response) {
        const products = await response.data;

        setlistofProducts(products.reverse());
        const filterAddon = products.filter(
          (product) => product.isAddon === true
        );
        if (filterAddon.length > 0) {
          setlistofProductsAddon(filterAddon);
        }
      }
    } catch (error) {}
  };

  const [allOrders, setAllOrders] = useState([]);
  const getAllOrders = async () => {
    const config = await handleGetTokenAndConfig();
    try {
      const response = await axios.get(apiUrl + "/api/order", config);

      if (response.status === 200) {
        const allOrders = response.data;

        setAllOrders(allOrders);
      } else {
        console.error("Failed to fetch orders");
      }
    } catch (error) {
      console.error("Error fetching orders", error);
    }
  };

  useEffect(() => {
    const updatedListofProducts = [...listofProducts];
    allOrders.forEach((order) => {
      order.products.forEach((product) => {
        updatedListofProducts.map((pro) => {
          if (product.productId._id === pro._id) {
            pro.sales += product.quantity;
          }
        });
      });
    });
    setlistofProducts(updatedListofProducts);
  }, [allOrders]);

  // const [productFilterd, setproductFilterd] = useState([])
  const filterProductsByCategory = (category) => {
    if (!category) {
      getallproducts();
    }
    getallproducts();
    const products = listofProducts.filter(
      (product) => product.category._id === category
    );
    setlistofProducts(products);
  };

  const searchByName = (name) => {
    if (!name) {
      getallproducts();
    }
    getallproducts();
    const products = listofProducts.filter(
      (pro) => pro.name.startsWith(name) === true
    );
    setlistofProducts(products);
  };

  const deleteProduct = async (e) => {
    e.preventDefault();
    const config = await handleGetTokenAndConfig();
    try {
      if (productPermission && !productPermission.delete) {
        toast.warn("ليس لك صلاحية لحذف الاصناف");
        return;
      }
      const response = await axios.delete(
        `${apiUrl}/api/product/${productId}`,
        config
      );
      if (response) {
        getallproducts();
      }
    } catch (error) {}
  };

  const [listofcategories, setlistofcategories] = useState([]);
  const getallCategories = async () => {
    const config = await handleGetTokenAndConfig();
    try {
      const response = await axios.get(apiUrl + "/api/menucategory/", config);
      const categories = await response.data;
      //
      setlistofcategories(categories);
      //
    } catch (error) {}
  };

  const calculateTotalCost = (ingredients) => {
    let total = 0;

    ingredients &&
      ingredients.map((ingredient) => {
        const costPart = ingredient.itemId?.costPerPart;
        const costOfIngerdient = Number(ingredient.amount) * Number(costPart);
        total += costOfIngerdient;
      });
    return total;
  };

  useEffect(() => {
    getallproducts();
    getallCategories();
    getAllOrders();
    getAlldepartments();
  }, []);

  return (
    <div className="w-100 px-3 d-flex flex-nowrap align-itmes-center justify-content-start">
      <div className="table-responsive mt-1">
        <div className="table-wrapper p-3 mw-100">
          <div className="table-title">
            <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
              <div className="text-right">
                <h2>
                  ادارة <b>المنتجات</b>
                </h2>
              </div>
              <div className="col-12 col-md-6 p-0 m-0 d-flex flex-wrap aliegn-items-center justify-content-end print-hide">
                <a
                  href="#addProductModal"
                  className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-success"
                  data-toggle="modal"
                >
                  <span>اضافه منتج جديد</span>
                </a>

                {/* <a href="#deleteProductModal" className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-danger" data-toggle="modal"> <span>حذف</span></a> */}
              </div>
            </div>
          </div>
          <div class="table-filter print-hide">
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
                  الاسم
                </label>
                <input
                  type="text"
                  className="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => searchByName(e.target.value)}
                />
              </div>
              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  التصنيف
                </label>
                <select
                  className="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => filterProductsByCategory(e.target.value)}
                >
                  <option value={""}>الكل</option>
                  {listofcategories.map((category, i) => {
                    return (
                      <option value={category._id} key={i}>
                        {category.name}
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
                      setAllOrders(filterByTime(e.target.value, allOrders))
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
                      onClick={() => setAllOrders(filterByDateRange(allOrders))}
                    >
                      <i className="fa fa-search"></i>
                    </button>
                    <button
                      type="button"
                      className="btn btn-warning h-100 p-2"
                      onClick={getAllOrders}
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
                          <span className="custom-checkbox">
                            <input type="checkbox" className="form-check-input border-primary mr form-check-input border-primary mr-lg" id="selectAll" />
                            <label htmlFor="selectAll"></label>
                          </span>
                        </th> */}
                <th>م</th>
                <th>الصورة</th>
                <th>الاسم</th>
                <th>الوصف</th>
                <th>التصنيف</th>
                <th>قسم الاعداد</th>
                <th>كومبو</th>
                <th>الاحجام</th>
                <th>الاضافات</th>
                <th>التكلفة</th>
                <th>السعر</th>
                <th>التخفيض</th>
                <th>بعد التخفيض</th>
                <th>عدد المبيعات</th>
                <th>متاح</th>
                <th>اجراءات</th>
              </tr>
            </thead>
            <tbody>
              {listofProducts &&
                listofProducts.map((product, i) => {
                  if (i >= startPagination && i < endPagination) {
                    return (
                      <React.Fragment key={i}>
                        <tr>
                          <td>{i + 1}</td>
                          <td>
                            <img
                              src={`${apiUrl}/images/${product.image}`}
                              style={{ width: "60px", height: "50px" }}
                            />
                          </td>
                          <td>{product.name}</td>
                          <td
                            className="text-wrap"
                            style={{ maxWidth: "250px", minWidth: "200px" }}
                          >
                            {product.description}
                          </td>
                          <td>{product.category.name}</td>
                          <td>{product.department?.name}</td>
                          <td>
                            {product.comboItems
                              ?.map(
                                (item, i) =>
                                  `${item.product?.name}${
                                    i < product.comboItems.length - 1 ? "-" : ""
                                  }`
                              )
                              .join("")}
                          </td>
                          <td>{product.sizes.length}</td>
                          <td>{product.extras.length}</td>
                          <td>
                            {product.productRecipe
                              ? calculateTotalCost(
                                  product.productRecipe?.ingredients
                                ) / product.productRecipe?.numberOfMeals
                              : "اضف تكلفه"}
                          </td>
                          <td>{product.price}</td>
                          <td>{product.discount}</td>
                          <td>{product.priceAfterDiscount}</td>
                          <td>{product.sales ? product.sales : 0}</td>
                          <td>{product.available ? "متاح" : "غير متاح"}</td>
                          <td>
                            {productPermission && productPermission.update && (
                              <button
                                data-target="#editProductModal"
                                className="btn btn-sm btn-primary ml-2 "
                                data-toggle="modal"
                                onClick={() => {
                                  handelEditProductModal(product);
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
                            {productPermission && productPermission.delete && (
                              <button
                                data-target="#deleteProductModal"
                                className="btn btn-sm btn-danger"
                                data-toggle="modal"
                                onClick={() => setproductId(product._id)}
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
                        {product.sizes.length > 0 &&
                          product.sizes.map((size, j) => (
                            <tr key={j + i}>
                              <td>{i + 1}</td>
                              <td></td>
                              <td>{size.sizeName}</td>
                              <td></td>
                              <td></td>
                              <td></td>
                              <td></td>
                              <td></td>
                              <td></td>
                              <td>
                                {size.sizeRecipe
                                  ? calculateTotalCost(
                                      size.sizeRecipe?.ingredients
                                    ) / Number(size.sizeRecipe?.numberOfMeals)
                                  : "اضف تكلفه"}
                              </td>
                              <td>{size.sizePrice}</td>
                              <td>{size.sizeDiscount}</td>
                              <td>{size.sizePriceAfterDiscount}</td>
                              <td>{size.sales ? size.sales : 0}</td>
                              <td></td>
                              <td></td>
                            </tr>
                          ))}
                      </React.Fragment>
                    );
                  }
                })}
            </tbody>
          </table>
          <div className="clearfix">
            <div className="hint-text text-dark">
              عرض{" "}
              <b>
                {listofProducts.length > endPagination
                  ? endPagination
                  : listofProducts.length}
              </b>{" "}
              من <b>{listofProducts.length}</b>عنصر
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

      <div id="addProductModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded">
            <form onSubmit={createProduct}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">اضافه منتج</h4>
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
                    الاسم
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    required
                    onChange={(e) => setproductName(e.target.value)}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الوصف
                  </label>
                  <textarea
                    className="form-control border-primary m-0 p-2 h-auto"
                    onChange={(e) => setproductDescription(e.target.value)}
                  ></textarea>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    التصنيف
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    name="category"
                    id="category"
                    form="carform"
                    onChange={(e) => setproductCategoryId(e.target.value)}
                  >
                    <option value="">اختر تصنيف</option>
                    {listofcategories.map((category, i) => {
                      return (
                        <option value={category._id} key={i}>
                          {category.name}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    قسم الاعداد
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    name="department"
                    id="department"
                    form="carform"
                    onChange={(e) => setdepartment(e.target.value)}
                  >
                    <option value="">اختر القسم</option>
                    {/* {departmentList.map((section, i) => {
                      return (
                        <option value={section} key={i}>
                          {section}
                        </option>
                      );
                    })} */}
                    {alldepartments.map((section, i) => {
                      return (
                        <option value={section._id} key={i}>
                          {section.name}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    هل هو وجبه كومبو
                  </label>
                  <input
                    type="checkbox"
                    className="form-check-input border-primary mr-2"
                    style={{ width: "21px", height: "21px" }}
                    onChange={handleIsComboCheckboxChange}
                  />
                </div>
                {isCombo && (
                  <div className="container flex-column w-100 p-0 m-0">
                    {comboItems.map((item, index) => (
                      <div
                        key={index}
                        className="row d-flex align-items-center justify-content-between col-12 mb-1"
                      >
                        <div className="form-group col-12 col-md-6 m-0">
                          <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                            اسم الصنف
                          </label>
                          <select
                            className="form-control border-primary m-0 p-2 h-auto"
                            value={item.product}
                            onChange={(e) => handleProductChange(e, index)}
                          >
                            <option value="">اختر الصنف</option>
                            {listofProducts.map((product) => (
                              <option key={product._id} value={product._id}>
                                {product.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group col-12 col-md-6 m-0">
                          <label className="form-label w-100 text-wrap text-right fw-bolder p-0 m-0">
                            الكمية
                          </label>
                          <input
                            type="number"
                            min={0}
                            className="form-control border-primary m-0 p-2 h-auto"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(e, index)}
                          />
                        </div>
                        <div className="col-12 mt-1 d-flex justify-content-between">
                          {index + 1 === comboItems.length ? (
                            <button
                              type="button"
                              className="col-6 btn btn-primary"
                              onClick={addComboItem}
                            >
                              إضافة صنف جديد
                            </button>
                          ) : (
                            ""
                          )}
                          <button
                            type="button"
                            className="col-6 btn btn-danger"
                            onClick={() => removeComboItem(index)}
                          >
                            حذف صنف
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    أحجام المنتج
                  </label>
                  <input
                    type="checkbox"
                    className="form-check-input border-primary mr-2"
                    style={{ width: "21px", height: "21px" }}
                    onChange={handleCheckboxChange}
                  />
                </div>
                {hasSizes ? (
                  <div className="container flex-column w-100 p-0 m-0">
                    {sizes.map((size, index) => (
                      <div
                        key={index}
                        className="row d-flex align-items-center justify-content-between col-12 mb-1"
                      >
                        <div className="form-group col-12 col-md-3">
                          <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                            اسم الحجم
                          </label>
                          <input
                            type="text"
                            className="form-control border-primary m-0 p-2 h-auto p-0 m-0"
                            value={size.sizeName}
                            onChange={(e) =>
                              setsizes((prevState) => {
                                const newSizes = [...prevState];
                                newSizes[index].sizeName = e.target.value;
                                return newSizes;
                              })
                            }
                          />
                        </div>
                        <div className="form-group col-12 col-md-3">
                          <label className="form-label w-100 text-wrap text-right fw-bolder p-0 m-0">
                            السعر
                          </label>
                          <input
                            type="number"
                            min={0}
                            className="form-control border-primary m-0 p-2 h-auto"
                            value={size.sizePrice}
                            onChange={(e) =>
                              setsizes((prevState) => {
                                const newSizes = [...prevState];
                                newSizes[index].sizePrice = parseFloat(
                                  e.target.value
                                );
                                return newSizes;
                              })
                            }
                          />
                        </div>
                        <div className="form-group col-12 col-md-3">
                          <label className="form-label w-100 text-wrap text-right fw-bolder p-0 m-0">
                            التخفيض
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={size.sizePrice}
                            className="form-control border-primary m-0 p-2 h-auto"
                            // value={size.sizeDiscount}
                            onChange={(e) =>
                              setsizes((prevState) => {
                                const newSizes = [...prevState];
                                newSizes[index].sizeDiscount = parseFloat(
                                  e.target.value
                                );
                                newSizes[index].sizePriceAfterDiscount =
                                  newSizes[index].sizePrice -
                                  parseFloat(e.target.value);
                                return newSizes;
                              })
                            }
                          />
                        </div>
                        <div className="col-12 mt-1 d-flex justify-content-between">
                          {sizes.length === index + 1 || sizes.length === 0 ? (
                            <button
                              type="button"
                              className="col-6 h-100 px-2 py-3 m-0 btn btn-primary"
                              onClick={addSize}
                            >
                              إضافة حجم جديد
                            </button>
                          ) : (
                            ""
                          )}
                          <button
                            type="button"
                            className="col-6 h-100 px-2 py-3 m-0 btn btn-danger"
                            onClick={() => removeSize(index)}
                          >
                            حذف الحجم
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* <div className="col-12">
                      <button type="button" className="btn w-100 btn-primary" onClick={addSize}>إضافة حجم جديد</button>
                    </div> */}
                  </div>
                ) : (
                  <>
                    <div className="form-group col-12 col-md-6">
                      <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                        السعر
                      </label>
                      <input
                        type="number"
                        className="form-control border-primary m-0 p-2 h-auto"
                        required
                        onChange={(e) => setproductPrice(e.target.value)}
                      />
                    </div>
                    <div className="form-group col-12 col-md-6">
                      <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                        التخفيض
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={productPrice}
                        className="form-control border-primary m-0 p-2 h-auto"
                        required
                        onChange={(e) => setproductDiscount(e.target.value)}
                      />
                    </div>
                  </>
                )}
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    هل هذا المنتج اضافه
                  </label>
                  <input
                    type="checkbox"
                    className="form-check-input border-primary mr-2"
                    style={{ width: "21px", height: "21px" }}
                    onChange={handleIsAddonCheckboxChange}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    هل له اضافات
                  </label>
                  <input
                    type="checkbox"
                    className="form-check-input border-primary mr-2"
                    style={{ width: "21px", height: "21px" }}
                    onChange={handleIsHasExtrasCheckboxChange}
                  />
                </div>
                {hasExtras && (
                  <div
                    className="form-group w-100 "
                    style={{ fontSize: "16px", fontWeight: "900" }}
                  >
                    <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                      اختر الاضافات
                    </label>
                    {listofProductsAddon.length > 0 ? (
                      <div className="d-flex flex-wrap align-items-center justify-content-between">
                        <div className="col-lg-12">
                          <div className="form-group d-flex flex-wrap">
                            {listofProductsAddon &&
                              listofProductsAddon.map((ProductsAddon, i) => (
                                <div
                                  className="form-check form-check-flat mb-2 mr-4 d-flex align-items-center"
                                  key={i}
                                  style={{ minWidth: "200px" }}
                                >
                                  <input
                                    type="checkbox"
                                    className="form-check-input border-primary mr-2"
                                    style={{ width: "21px", height: "21px" }}
                                    value={ProductsAddon._id}
                                    checked={extras.includes(ProductsAddon._id)}
                                    onChange={(e) => addExtra(e.target.value)}
                                  />
                                  <label
                                    className="form-check-label pr-5"
                                    style={{ cursor: "pointer" }}
                                    onClick={(e) => addExtra(ProductsAddon._id)}
                                  >
                                    {ProductsAddon.name}
                                  </label>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <input
                        type="text"
                        className="form-control border-primary m-0 p-2 h-auto"
                        value="لا يوجد اي اضافات"
                      />
                    )}
                  </div>
                )}

                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    متاح
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    name="category"
                    id="category"
                    form="carform"
                    onChange={(e) => setavailable(e.target.value)}
                  >
                    <option defaultValue={available}>اختر الحاله</option>
                    <option value={true}>متاح</option>
                    <option value={false}>غير متاح</option>
                  </select>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الصورة
                  </label>
                  <input
                    type="file"
                    className="form-control border-primary m-0 p-2 h-auto"
                    onChange={(e) => handleFileUpload(e)}
                  />
                </div>
              </div>
              <div className="modal-footer flex-nowrap d-flex flex-row align-items-center justify-content-between">
                <button
                  type="submit"
                  className="btn btn-success col-6 h-100 px-2 py-3 m-0"
                >
                  إضافة
                </button>
                <button
                  type="button"
                  className="btn btn-danger col-6 h-100 px-2 py-3 m-0"
                  data-dismiss="modal"
                >
                  إغلاق
                </button>{" "}
              </div>
            </form>
          </div>
        </div>
      </div>

      <div id="editProductModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded">
            <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
              <h4 className="modal-title">تعديل منتج</h4>
              <button
                type="button"
                className="close m-0 p-1"
                data-dismiss="modal"
                aria-hidden="true"
              >
                &times;
              </button>
            </div>
            <form onSubmit={editProduct}>
              <div className="modal-body d-flex flex-wrap align-items-center p-3 text-right">
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الاسم
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    defaultValue={productInfo.name}
                    required
                    onChange={(e) => setproductName(e.target.value)}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الوصف
                  </label>
                  <textarea
                    className="form-control border-primary m-0 p-2 h-auto"
                    defaultValue={productDescription}
                    required
                    onChange={(e) => setproductDescription(e.target.value)}
                  ></textarea>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    التصنيف
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    name="category"
                    id="category"
                    form="carform"
                    onChange={(e) => setproductCategoryId(e.target.value)}
                  >
                    <option value={productInfo.category?._id}>
                      {productInfo.category?.name}
                    </option>
                    {listofcategories.map((category, i) => {
                      return (
                        <option value={category._id} key={i}>
                          {category.name}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    قسم الاعداد
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    name="department"
                    id="department"
                    form="carform"
                    onChange={(e) => setdepartment(e.target.value)}
                  >
                    {department ? (
                      <option value={department}>{department}</option>
                    ) : (
                      "لم يتم تحديد قسم"
                    )}

                    {/* {departmentList.map((section, i) => {
                      return (
                        <option value={section} key={i}>
                          {section}
                        </option>
                      );
                    })} */}

                    {department ? (
                      <option value={department._id}>
                        {
                          alldepartments.find(
                            (section) => section._id === department
                          )?.name
                        }
                      </option>
                    ) : (
                      "لم يتم تحديد قسم"
                    )}
                    {alldepartments.map((section, i) => {
                      return (
                        <option value={section._id} key={i}>
                          {section.name}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    هل هو وجبه كومبو
                  </label>
                  <input
                    type="checkbox"
                    className="form-check-input border-primary mr-2"
                    style={{ width: "21px", height: "21px" }}
                    onChange={handleIsComboCheckboxChange}
                  />
                </div>
                {isCombo && (
                  <div className="container flex-column w-100 p-0 m-0">
                    {comboItems.map((item, index) => (
                      <div
                        key={index}
                        className="row d-flex align-items-center justify-content-between col-12 mb-1"
                      >
                        <div className="form-group col-12 col-md-6 m-0">
                          <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                            اسم الصنف
                          </label>
                          <select
                            className="form-control border-primary m-0 p-2 h-auto"
                            value={item.product}
                            onChange={(e) => handleProductChange(e, index)}
                          >
                            <option value="">اختر الصنف</option>
                            {listofProducts.map((product) => (
                              <option key={product._id} value={product._id}>
                                {product.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group col-12 col-md-6 m-0">
                          <label className="form-label w-100 text-wrap text-right fw-bolder p-0 m-0">
                            الكمية
                          </label>
                          <input
                            type="number"
                            min={0}
                            className="form-control border-primary m-0 p-2 h-auto"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(e, index)}
                          />
                        </div>
                        <div className="col-12 mt-1 d-flex justify-content-between">
                          {index + 1 === comboItems.length ? (
                            <button
                              type="button"
                              className="col-6 btn btn-primary"
                              onClick={addComboItem}
                            >
                              إضافة صنف جديد
                            </button>
                          ) : (
                            ""
                          )}
                          <button
                            type="button"
                            className="col-6 btn btn-danger"
                            onClick={() => removeComboItem(index)}
                          >
                            حذف صنف
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    أحجام المنتج
                  </label>
                  <input
                    type="checkbox"
                    className="form-check-input border-primary mr-2"
                    style={{ width: "21px", height: "21px" }}
                    checked={hasSizes}
                    onChange={handleCheckboxChange}
                  />
                </div>
                {hasSizes ? (
                  <div className="container flex-column w-100 p-0 m-0">
                    {sizes.map((size, index) => (
                      <div
                        key={index}
                        className="row d-flex align-items-center justify-content-between col-12 mb-1"
                      >
                        <div className="form-group col-12 col-md-3">
                          <label className="form-label w-100 text-wrap text-right fw-bolder p-0 m-0">
                            اسم الحجم
                          </label>
                          <input
                            type="text"
                            className="form-control border-primary m-0 p-2 h-auto"
                            value={size.sizeName}
                            onChange={(e) =>
                              setsizes((prevState) => {
                                const newSizes = [...prevState];
                                newSizes[index].sizeName = e.target.value;
                                return newSizes;
                              })
                            }
                          />
                        </div>
                        <div className="form-group col-12 col-md-3">
                          <label className="form-label w-100 text-wrap text-right fw-bolder p-0 m-0">
                            السعر
                          </label>
                          <input
                            type="number"
                            className="form-control border-primary m-0 p-2 h-auto"
                            value={size.sizePrice}
                            onChange={(e) =>
                              setsizes((prevState) => {
                                const newSizes = [...prevState];
                                newSizes[index].sizePrice = parseFloat(
                                  e.target.value
                                );
                                return newSizes;
                              })
                            }
                          />
                        </div>

                        <div className="form-group col-12 col-md-3">
                          <label className="form-label w-100 text-wrap text-right fw-bolder p-0 m-0">
                            التخفيض
                          </label>
                          <input
                            type="number"
                            className="form-control border-primary m-0 p-2 h-auto"
                            value={size.sizeDiscount}
                            min={0}
                            max={size.sizePrice}
                            onChange={(e) =>
                              setsizes((prevState) => {
                                const newSizes = [...prevState];
                                newSizes[index].sizeDiscount = parseFloat(
                                  e.target.value
                                );
                                newSizes[index].sizePriceAfterDiscount =
                                  newSizes[index].sizePrice -
                                  parseFloat(e.target.value);
                                return newSizes;
                              })
                            }
                          />
                        </div>

                        <div className="col-12">
                          {sizes.length === index + 1 || sizes.length === 0 ? (
                            <button
                              type="button"
                              className="col-6 h-100 px-2 py-3 m-0 btn btn-primary"
                              onClick={addSize}
                            >
                              إضافة حجم جديد
                            </button>
                          ) : (
                            ""
                          )}
                          <button
                            type="button"
                            className="col-6 h-100 px-2 py-3 m-0 btn btn-danger col-12 col-md-6"
                            onClick={() => removeSize(index)}
                          >
                            حذف الحجم
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="form-group col-12 col-md-6">
                      <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                        السعر
                      </label>
                      <input
                        type="number"
                        className="form-control border-primary m-0 p-2 h-auto"
                        defaultValue={productPrice}
                        placeholder={productPrice}
                        required
                        onChange={(e) => setproductPrice(e.target.value)}
                      />
                      <div className="input-group-prepend col-4">
                        <span className="input-group-text">جنية</span>
                      </div>
                    </div>
                    <div className="form-group col-12 col-md-6">
                      <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                        التخفيض
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={productPrice}
                        className="form-control border-primary m-0 p-2 h-auto"
                        defaultValue={productDiscount}
                        placeholder={productDiscount}
                        required
                        onChange={(e) => setproductDiscount(e.target.value)}
                      />
                      <div className="input-group-prepend col-4">
                        <span className="input-group-text">جنية</span>
                      </div>
                    </div>
                  </>
                )}
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    هل هذا المنتج اضافه
                  </label>
                  <input
                    type="checkbox"
                    className="form-check-input border-primary mr-2"
                    style={{ width: "21px", height: "21px" }}
                    checked={isAddon}
                    onChange={handleIsAddonCheckboxChange}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    هل له اضافات
                  </label>
                  <input
                    type="checkbox"
                    className="form-check-input border-primary mr-2"
                    style={{ width: "21px", height: "21px" }}
                    checked={hasExtras}
                    onChange={handleIsHasExtrasCheckboxChange}
                  />
                </div>
                {hasExtras && (
                  <div
                    className="form-group "
                    style={{ fontSize: "16px", fontWeight: "900" }}
                  >
                    <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                      اختر الاضافات
                    </label>
                    {listofProductsAddon.length > 0 ? (
                      <div className="d-flex flex-wrap align-items-center justify-content-between">
                        <div className="col-lg-12">
                          <div className="form-group d-flex flex-wrap">
                            {listofProductsAddon &&
                              listofProductsAddon.map((ProductsAddon, i) => (
                                <div
                                  className="form-check form-check-flat mb-2 mr-4 d-flex align-items-center"
                                  key={i}
                                  style={{ minWidth: "200px" }}
                                >
                                  <input
                                    type="checkbox"
                                    className="form-check-input border-primary mr-2"
                                    style={{ width: "21px", height: "21px" }}
                                    value={ProductsAddon._id}
                                    checked={extras.includes(ProductsAddon._id)}
                                    onChange={(e) => addExtra(e.target.value)}
                                  />
                                  <label
                                    className="form-check-label pr-5"
                                    style={{ cursor: "pointer" }}
                                    onClick={(e) => addExtra(ProductsAddon._id)}
                                  >
                                    {ProductsAddon.name}
                                  </label>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <input
                        type="text"
                        className="form-control border-primary m-0 p-2 h-auto"
                        value="لا يوجد اي اضافات"
                      />
                    )}
                  </div>
                )}
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    متاح
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    name="category"
                    id="category"
                    form="carform"
                    onChange={(e) => setavailable(e.target.value)}
                  >
                    <option value={true}>متاح</option>
                    <option value={false}>غير متاح</option>
                  </select>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الصورة
                  </label>
                  <input
                    type="file"
                    className="form-control border-primary m-0 p-2 h-auto"
                    onChange={(e) => handleFileUpload(e)}
                  />
                </div>
              </div>

              <div className="modal-footer flex-nowrap d-flex flex-row align-items-center justify-content-between">
                <button
                  type="submit"
                  className="btn btn-success col-6 h-100 px-2 py-3 m-0"
                >
                  حفظ
                </button>
                <button
                  type="button"
                  className="btn btn-danger col-6 h-100 px-2 py-3 m-0"
                  data-dismiss="modal"
                >
                  إغلاق
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div id="deleteProductModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={deleteProduct}>
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
              <div className="modal-body text-center">
                <p className="text-right text-dark fs-3 fw-800 mb-2">
                  هل أنت متأكد من حذف هذا السجل؟
                </p>
                <p className="text-warning text-center mt-3">
                  <small>لا يمكن الرجوع في هذا الإجراء.</small>
                </p>
              </div>
              <div className="modal-footer flex-nowrap d-flex flex-row align-items-center justify-content-between">
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

export default Products;
