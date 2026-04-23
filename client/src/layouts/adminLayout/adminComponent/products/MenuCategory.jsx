import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContext } from "../../../../context/appContext";
import "./orders/Orders.css";

const MenuCategory = () => {
  const {
    allProducts,
    setIsLoading,
    EditPagination,
    startPagination,
    endPagination,
    setStartPagination,
    setEndPagination,
    apiUrl,
    handleGetTokenAndConfig,
  } = useContext(AppContext);

  const [categoryName, setcategoryName] = useState("");
  const [mainCategory, setmainCategory] = useState({});
  const [status, setstatus] = useState("");
  const [isMain, setisMain] = useState(false);

  const [categoryId, setcategoryId] = useState("");

  const [allCategory, setAllCategory] = useState([]);

  const getallCategory = async () => {
    const config = await handleGetTokenAndConfig();
    try {
      const res = await axios.get(apiUrl + "/api/menucategory/");
      if (res) {
        const categories = res.data;
        setAllCategory(categories);
        const filterMain = categories.filter(
          (category) => category.isMain === true
        )[0];
        if (filterMain) {
          setmainCategory(filterMain);
        }
      }
    } catch (error) {
      if (error.response) {
        console.error("حدث خطأ أثناء استلام البيانات:", error.response.data);
      } else if (error.request) {
        console.error("لم يتم الرد على الطلب:", error.request);
      } else {
        console.error("حدث خطأ أثناء إعداد الطلب:", error.message);
      }
      alert("حدث خطأ أثناء جلب البيانات، يرجى المحاولة مرة أخرى لاحقًا.");
    }
  };

  const handleCategoryData = (category) => {
    setcategoryId(category._id);
    setcategoryName(category.name);
    setstatus(category.status);
    setisMain(category.isMain);
  };

  // Function to edit a category
  const editCategory = async (e) => {
    e.preventDefault();
    const config = await handleGetTokenAndConfig();
    try {
      const bodydata = {
        name: categoryName,
        isMain,
        status,
      };

      // Send a PUT request to edit the category
      const edit = await axios.put(
        apiUrl + "/api/menucategory/" + categoryId,
        bodydata,
        config
      );
      // Check if the request was successful
      if (edit.status === 200) {
        // Call the function to get all categories
        getallCategory();
        // Display a success toast
        toast.success("تم تعديل التصنيف", {
          position: toast.POSITION.TOP_RIGHT,
        });
      } else {
        throw new Error("Failed to edit category");
      }
    } catch (error) {
      // Handle errors if any exception occurs
      console.error("Error occurred while editing category:", error);

      // Display an error toast
      toast.error("Failed to edit category. Please try again later.");
    }
  };

  const deleteCategory = async (e) => {
    e.preventDefault();
    const config = await handleGetTokenAndConfig();
    try {
      const deleted = await axios.delete(
        apiUrl + "/api/menucategory/" + categoryId
      );

      if (deleted.status === 200) {
        getallCategory();
        
        toast.success("Category deleted successfully.");
      } else {
        throw new Error("Failed to delete category.");
      }
    } catch (error) {
      console.error("Error occurred while deleting category:", error);

      // Display error toast notification
      toast.error("Failed to delete category. Please try again later.");
    }
  };

  const searchByCategory = (category) => {
    if (category) {
      const categories = allCategory
        ? allCategory.filter(
            (Category) => Category.name.startsWith(category) === true
          )
        : [];
      setAllCategory(categories);
    } else {
      getallCategory();
    }
  };

  const handleDragStart = (e, index) => {
    e.dataTransfer.setData("index", index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, newIndex) => {
    const oldIndex = e.dataTransfer.getData("index");
    const draggedCategory = allCategory[oldIndex];

    // Remove the dragged category from its old position
    const updatedCategories = allCategory.filter(
      (_, index) => index != oldIndex
    );

    // Insert the dragged category at the new position
    updatedCategories.splice(newIndex, 0, draggedCategory);
    // Update the state with the new order
    setAllCategory(updatedCategories);
  };

  const handleOrderCategory = async (e) => {
    e.preventDefault();
    const config = await handleGetTokenAndConfig();
    try {
      
      // Initialize a variable to track if all requests are done
      let done = true;
      // Iterate over all categories
      for (let index = 0; index < allCategory.length; index++) {
        const category = allCategory[index];
        const id = category._id;
        const order = index + 1;
        // Send a PUT request to edit the category order
        const edit = await axios.put(
          `${apiUrl}/api/menucategory/${id}`,
          { order },
          config
        );
        // If any request fails, set done to false
        if (!edit) {
          done = false;
        }
      }
      // Check if all requests were successful
      if (done) {
        // Call the function to get all categories
        getallCategory();
        // Display a success toast
        toast.success("تم تعديل التصنيف", {
          position: toast.POSITION.TOP_RIGHT,
        });
      } else {
        throw new Error("Failed to edit category");
      }
    } catch (error) {
      // Handle errors if any exception occurs
      console.error("Error occurred while editing category:", error);
      // Display an error toast
      toast.error("Failed to edit category. Please try again later.");
    }
  };

  const handleCategoryChange = async (e) => {
    e.preventDefault();
    const id = e.target.value;
    const config = await handleGetTokenAndConfig();
    try {
      // Iterate over all categories
      for (let index = 0; index < allCategory.length; index++) {
        const category = allCategory[index];
        if (category.isMain === true) {
          // Send a PUT request to edit the category order
          const edit = await axios.put(
            `${apiUrl}/api/menucategory/${category._id}`,
            { isMain: false },
            config
          );
        }
      }

      const mainCategory = await axios.put(
        `${apiUrl}/api/menucategory/${id}`,
        { isMain: true },
        config
      );
      // Check if all requests were successful
      if (mainCategory) {
        // Call the function to get all categories
        getallCategory();
        // Display a success toast
        toast.success("تم اختيار التصنيف", {
          position: toast.POSITION.TOP_RIGHT,
        });
      } else {
        throw new Error("حدث خطا اثناء الاختيار ! حاول مره اخري");
      }
    } catch (error) {
      toast.error("فشل في اختيار التصنيف الرئيسي ! حاول مره اخري");
    }
  };

  const createCategory = async (event) => {
    event.preventDefault();
    const config = await handleGetTokenAndConfig();
    const categoryData = {
      name: categoryName,
      isMain,
      status,
    };

    try {
      const response = await axios.post(
        `${apiUrl}/api/menucategory/`,
        categoryData,
        config
      );

      if (response.status === 201) {
        await getallCategory();
        toast.success("تم إنشاء الفئة بنجاح.");
      } else {
        throw new Error("حدث خطأ أثناء إنشاء الفئة.");
      }
    } catch (error) {
      console.error("حدث خطأ أثناء إرسال الطلب:", error);
      if (error.response) {
        if (
          error.response.status === 400 &&
          error.response.data.message === "Menu category name already exists"
        ) {
          toast.error("اسم الفئة موجود بالفعل. الرجاء اختيار اسم آخر.");
        } else if (error.response.status === 401) {
          toast.error("انتهت صلاحية الجلسة، رجاء تسجيل الدخول مره أخرى.");
        } else {
          toast.error("حدث خطأ أثناء إنشاء الفئة. الرجاء المحاولة مرة أخرى.");
        }
      } else {
        toast.error("حدث خطأ أثناء الاتصال بالخادم.");
      }
    }
  };

  useEffect(() => {
    getallCategory();
  }, []);

  return (
    <div className="w-100 px-3 d-flex align-itmes-center justify-content-start">
      <div className="table-responsive">
        <div className="table-wrapper p-3 mw-100">
          <div className="table-title">
            <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
              <div className="col-12 col-md-4 text-md-right text-center mb-3 mb-md-0">
                <h2>
                  ادارة <b>اقسام المنيو</b>
                </h2>
              </div>
              <div className="col-12 col-md-8 d-flex flex-wrap justify-content-between align-items-center p-0">
                <div className="col-12 col-sm-3 d-flex align-items-center m-0  p-0">
                  <a
                    href="#orderCategoryModal"
                    className="btn btn-info w-100 d-flex align-items-center justify-content-center"
                    data-toggle="modal"
                  >
                    <i className="material-icons">&#xE164;</i>
                    <span>ترتيب</span>
                  </a>
                </div>
                <div className="col-12 col-sm-5 d-flex align-items-center mx-1  p-0">
                  <label htmlFor="categorySelect" className="mr-2">
                    التصنيف الرئيسي:
                  </label>
                  <select
                    id="categorySelect"
                    className="form-control border-primary m-0 p-2 h-auto"
                    onChange={handleCategoryChange}
                  >
                    <option value="">
                      {mainCategory ? mainCategory.name : ""}
                    </option>
                    {allCategory.map((category, index) => (
                      <option key={index} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-12 col-sm-3 d-flex align-items-center m-0 p-0">
                  <a
                    href="#addCategoryModal"
                    className="btn btn-success w-100 d-flex align-items-center justify-content-center text-nowrap"
                    data-toggle="modal"
                  >
                    <span>اضافه تصنيف</span>
                  </a>
                </div>
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
                  اسم التصنيف
                </label>
                <input
                  type="text"
                  className="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => searchByCategory(e.target.value)}
                />
              </div>
            </div>
          </div>

          <table className="table table-striped table-hover">
            <thead>
              <tr>
                {/* <th>
                          <span className="custom-checkbox">
                            <input type="checkbox" className="form-check-input form-check-input-lg" id="selectAll" />
                            <label htmlFor="selectAll"></label>
                          </span>
                        </th> */}
                <th>م</th>
                <th>الاسم</th>
                <th>الترتيب</th>
                <th>الحالة</th>
                <th>عدد المنتجات</th>
                <th>بواسطة</th>
                <th>اجراءات</th>
              </tr>
            </thead>
            <tbody>
              {allCategory &&
                allCategory.map((category, i) => {
                  if ((i >= startPagination) & (i < endPagination)) {
                    return (
                      <tr key={i}>
                        {/* <td>
                                  <span className="custom-checkbox">
                                    <input type="checkbox" className="form-check-input form-check-input-lg" id="checkbox1" name="options[]" value="1" />
                                    <label htmlFor="checkbox1"></label>
                                  </span>
                                </td> */}
                        <td>{i + 1}</td>
                        <td>{category.name}</td>
                        <td>{category.order}</td>
                        <td>{category.status ? "متاحة" : "ليست متاحة"}</td>
                        <td>
                          {allProducts
                            ? allProducts.filter(
                                (product) =>
                                  product.category._id === category._id
                              ).length
                            : 0}
                        </td>
                        <td>
                          {category.createdBy
                            ? category.createdBy.username
                            : "غير معروف"}
                        </td>
                        <td>
                          <button
                            data-target="#editCategoryModal"
                            className="btn btn-sm btn-primary ml-2 "
                            data-toggle="modal"
                            onClick={() => handleCategoryData(category)}
                          >
                            <i
                              className="material-icons"
                              data-toggle="tooltip"
                              title="Edit"
                            >
                              &#xE254;
                            </i>
                          </button>

                          <button
                            data-target="#deleteCategoryModal"
                            className="btn btn-sm btn-danger"
                            data-toggle="modal"
                            onClick={() => setcategoryId(category._id)}
                          >
                            <i
                              className="material-icons"
                              data-toggle="tooltip"
                              title="Delete"
                            >
                              &#xE872;
                            </i>
                          </button>
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
                {allCategory.length > endPagination
                  ? endPagination
                  : allCategory.length}
              </b>{" "}
              من <b>{allCategory.length}</b> عنصر
            </div>
            <ul className="pagination">
              <li onClick={EditPagination} className="page-item disabled">
                <a href="#">السابق</a>
              </li>
              <li onClick={EditPagination} className="page-item">
                <a href="#" className="page-link">
                  1
                </a>
              </li>
              <li onClick={EditPagination} className="page-item">
                <a href="#" className="page-link">
                  2
                </a>
              </li>
              <li onClick={EditPagination} className="page-item true">
                <a href="#" className="page-link">
                  3
                </a>
              </li>
              <li onClick={EditPagination} className="page-item">
                <a href="#" className="page-link">
                  4
                </a>
              </li>
              <li onClick={EditPagination} className="page-item">
                <a href="#" className="page-link">
                  5
                </a>
              </li>
              <li onClick={EditPagination} className="page-item">
                <a href="#" className="page-link">
                  التالي
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div id="addCategoryModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={(e) => createCategory(e, setIsLoading)}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">اضافه تصنيف</h4>
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
                    value={categoryName}
                    onChange={(e) => setcategoryName(e.target.value)}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الحالة
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={status.toString()}
                    onChange={(e) => setstatus(e.target.value === "true")}
                  >
                    <option value="">اختر الحالة</option>
                    <option value="true">متاح</option>
                    <option value="false">غير متاح</option>
                  </select>
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
      <div id="editCategoryModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={editCategory}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">تعديل التصنيف</h4>
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
                    value={categoryName}
                    onChange={(e) => setcategoryName(e.target.value)}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الحالة
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={status.toString()} // تحويل قيمة status إلى سلسلة نصية
                    onChange={(e) => setstatus(e.target.value === "true")} // تحويل القيمة المحددة إلى قيمة بوليانية
                  >
                    <option value="true">متاح</option>
                    <option value="false">غير متاح</option>
                  </select>
                </div>

                {/* <div className="form-group col-12 col-md-6">
                          <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                            <input
                              type="checkbox"
                              checked={isMain}
                              onChange={(e) => setisMain(e.target.checked)}
                            />
                            هل هذا التصنيف الرئيس؟
                          </label>
                        </div> */}
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
      <div id="orderCategoryModal" className="modal fade">
        <div className="modal-dialog ">
          <div className="modal-content p-1">
            <form onSubmit={handleOrderCategory}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">تعديل التصنيف</h4>
                <button
                  type="button"
                  className="close m-0 p-1"
                  data-dismiss="modal"
                  aria-hidden="true"
                >
                  &times;
                </button>
              </div>
              <div className="modal-body d-flex flex-wrap flex-md-row flex-wrap">
                {allCategory.map((category, index) => (
                  <div
                    key={index}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    className="h-100 btn btn-primary h-100 btn btn-sm mb-2 mr-md-2 w-15 w-md-100"
                  >
                    {category.name}
                  </div>
                ))}
              </div>
              <div className="modal-footer flex-nowrap d-flex flex-row align-items-center justify-content-between">
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
      <div id="deleteCategoryModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={deleteCategory}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">حذف تصنيف</h4>
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
                <p>هل انت متاكد من حذف هذا التصنيف?</p>
                <p className="text-warning text-center mt-3">
                  <small>لا يمكن الرجوع فيه.</small>
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

export   default MenuCategory;
