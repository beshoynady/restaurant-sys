import React, {
  useState,
  useEffect,
  useRef,
  useContext,
  isValidElement,
} from "react";
import axios from "axios";
import { dataContext } from "../../../../context/appContext";
import { toast } from "react-toastify";
import "../orders/Orders.css";

const ProductRecipe = () => {
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

  const productRecipePermission =
    permissionsList &&
    permissionsList.filter((perission) => perission.resource === "Recipes")[0];

  const [listofProducts, setlistofProducts] = useState([]);

  const getallproducts = async () => {
    const config = await handleGetTokenAndConfig();
    try {
      const response = await axios.get(apiUrl + "/api/product/");
      const products = await response.data;
      //
      setlistofProducts(products);
      //
    } catch (error) {}
  };

  const [productFilterd, setProductFilterd] = useState([]);
  const getproductByCategory = (category) => {
    const products = listofProducts.filter(
      (product) => product.category._id === category
    );
    setProductFilterd(products);
  };

  const [listOfCategories, setListOfCategories] = useState([]);
  const getallCategories = async () => {
    const config = await handleGetTokenAndConfig();
    try {
      const response = await axios.get(apiUrl + "/api/menucategory/");
      if (response.status === 200) {
        //
        const categories = await response.data;

        setListOfCategories(categories);
      }
    } catch (error) {}
  };

  const [AllStockItems, setAllStockItems] = useState([]);

  const getallStockItem = async () => {
    const config = await handleGetTokenAndConfig();
    try {
      const response = await axios.get(apiUrl + "/api/stockitem/", config);
      if (response.status === 200) {
        const StockItems = await response.data;

        setAllStockItems(StockItems);
      }
    } catch (error) {}
  };

  const [product, setProduct] = useState({});
  const [productId, setProductId] = useState("");
  const [productName, setProductName] = useState("");

  const [recipeOfProduct, setrecipeOfProduct] = useState({});
  const [ingredients, setingredients] = useState([]);
  const [productTotalCost, setProductTotalCost] = useState(0);
  const [serviceDetails, setserviceDetails] = useState([]);
  const [itemId, setitemId] = useState("");
  const [preparationTime, setpreparationTime] = useState(0);
  const [wastePercentage, setwastePercentage] = useState(0);
  const [numberOfMeals, setnumberOfMeals] = useState(0);
  const [orderType, setorderType] = useState("");
  const [orderTypeList, setorderTypeList] = useState([
    "dineIn",
    "takeaway",
    "delivery",
  ]);
  const [name, setname] = useState("");
  const [amount, setamount] = useState(0);
  const [costOfItem, setcostOfItem] = useState(0);
  const [unit, setunit] = useState("");
  const [totalCostOfItem, settotalCostOfItem] = useState(0);

  const addRecipeItem = async (e) => {
    e.preventDefault();
    const config = await handleGetTokenAndConfig();
    try {
      if (productRecipePermission && !productRecipePermission.create) {
        toast.warn("ليس لك صلاحية لانشاء الوصفات");
        return;
      }
      if (!itemId || !name || !amount || !unit) {
        toast.error("يرجى تعبئة جميع الحقول بشكل صحيح");
        return;
      }

      let newIngredients;
      // let newServiceDetails;

      if (recipeOfProduct && recipeOfProduct._id) {
        // If there are existing ingredients, create a new array with the added ingredient
        newIngredients = [
          ...ingredients,
          { itemId, name, amount, unit, wastePercentage },
        ];
        // Update the recipe by sending a PUT request
        const addRecipeToProduct = await axios.put(
          `${apiUrl}/api/recipe/${recipeOfProduct._id}`,
          {
            ingredients: newIngredients,
          },
          config
        );

        if (addRecipeToProduct.status === 200) {
          const recipedata = await addRecipeToProduct.data;

          if (size && product.hasSizes) {
            sizes.map((si) => {
              if (si._id === recipedata.sizeId) {
                size.sizeRecipe = recipedata._id;
              }
            });

            const updateProduct = await axios.put(
              `${apiUrl}/api/product/${productId}`,
              { sizes },
              config
            );
          } else if (!product.hasSizes) {
            const productRecipe = recipedata._id;
            const updateProduct = await axios.put(
              `${apiUrl}/api/product/${productId}`,
              { productRecipe },
              config
            );
          }
          toast.success("تم تحديث الوصفة بنجاح");
        } else {
          throw new Error("Failed to update recipe");
        }

        getProductRecipe(productId, sizeId); // Refresh the product recipe
      } else {
        const sizeName = size ? size.sizeName : "";
        const sizeId = size ? size._id : "";

        // If there are no existing ingredients, create a new array with the single ingredient
        newIngredients = [{ itemId, name, amount, unit, wastePercentage }];
        // newIngredients = [{ itemId, name, amount, unit, wastePercentage }];

        // Add the new recipe to the product by sending a POST request
        const addRecipeToProduct = await axios.post(
          `${apiUrl}/api/recipe`,
          {
            productId,
            productName,
            sizeName,
            sizeId,
            numberOfMeals,
            preparationTime,
            ingredients: newIngredients,
            // serviceDetails: newIngredients,
          },
          config
        );

        if (addRecipeToProduct.status === 201) {
          const recipedata = await addRecipeToProduct.data;

          if (size && product.hasSizes) {
            sizes.map((si) => {
              if (si._id === recipedata.sizeId) {
                size.sizeRecipe = recipedata._id;
              }
            });

            const updateProduct = await axios.put(
              `${apiUrl}/api/product/${productId}`,
              { sizes },
              config
            );
          } else if (!product.hasSizes) {
            const productRecipe = recipedata._id;
            const updateProduct = await axios.put(
              `${apiUrl}/api/product/${productId}`,
              { productRecipe },
              config
            );
          }
          getProductRecipe(productId, sizeId); // Refresh the product recipe
          setitemId("");
          setname("");
          setamount("");
          setunit("");
          setingredients([]);
          setserviceDetails([]);
          setpreparationTime(0);
          setnumberOfMeals(1);
          toast.success("تم إضافة المكون بنجاح"); // Notify success in adding ingredient
        } else {
          throw new Error("Failed to add recipe");
        }
      }
    } catch (error) {
      console.error("Error creating/updating recipe:", error); // Log any errors that occur during the process
      toast.error("حدث خطأ أثناء إنشاء او تحديث الوصفة"); // Notify error in creating/updating recipe
    }
  };

  const addServiceItem = async (e) => {
    e.preventDefault();
    const config = await handleGetTokenAndConfig();

    try {
      if (productRecipePermission && !productRecipePermission.create) {
        toast.warn("ليس لك صلاحية لانشاء الوصفات");
        return;
      }

      if (!orderType || !itemId || !name || !amount || !unit) {
        toast.error("يرجى تعبئة جميع الحقول بشكل صحيح");
        return;
      }

      let newServiceDetails = { ...serviceDetails };

      if (!newServiceDetails[orderType]) {
        newServiceDetails[orderType] = [];
      }

      newServiceDetails[orderType].push({
        itemId,
        name,
        amount,
        unit,
        wastePercentage,
      });

      if (recipeOfProduct && recipeOfProduct._id) {
        const addRecipeToProduct = await axios.put(
          `${apiUrl}/api/recipe/${recipeOfProduct._id}`,
          { serviceDetails: newServiceDetails },
          config
        );

        if (addRecipeToProduct.status === 200) {
          toast.success("تم تحديث الوصفة بنجاح");
          setserviceDetails(newServiceDetails); // تحديث الحالة في الواجهة
        } else {
          throw new Error("Failed to update recipe");
        }

        getProductRecipe(productId, sizeId); // تحديث بيانات الوصفة
      }
    } catch (error) {
      console.error("Error creating/updating recipe:", error);
      toast.error("حدث خطأ أثناء إنشاء أو تحديث الوصفة");
    }
  };

  // const addServiceItem = async (e) => {
  //   e.preventDefault();
  // const config = await handleGetTokenAndConfig();
  //   try {
  //     if (productRecipePermission && !productRecipePermission.create) {
  //       toast.warn("ليس لك صلاحية لانشاء الوصفات");
  //       return;
  //     }
  //     if (!orderType ||!itemId || !name || !amount || !unit) {
  //       toast.error("يرجى تعبئة جميع الحقول بشكل صحيح");
  //       return;
  //     }

  //     let newServiceDetails;

  //     if (recipeOfProduct && recipeOfProduct._id) {
  //       // If there are existing ingredients, create a new array with the added ingredient

  //       newServiceDetails = [
  //         ...serviceDetails,
  //         { itemId, name, amount, unit, wastePercentage },
  //       ];

  //       // Update the recipe by sending a PUT request
  //       const addRecipeToProduct = await axios.put(
  //         `${apiUrl}/api/recipe/${recipeOfProduct._id}`,
  //         {
  //           serviceDetails: {orderType:[...serviceDetails]}
  //         },
  //         config
  //       );

  //       if (addRecipeToProduct.status === 200) {
  //         const recipedata = await addRecipeToProduct.data;
  //
  //         toast.success("تم تحديث الوصفة بنجاح");
  //       } else {
  //         throw new Error("Failed to update recipe");
  //       }

  //       getProductRecipe(productId, sizeId); // Refresh the product recipe
  //     }
  //   } catch (error) {
  //     console.error("Error creating/updating recipe:", error); // Log any errors that occur during the process
  //     toast.error("حدث خطأ أثناء إنشاء او تحديث الوصفة"); // Notify error in creating/updating recipe
  //   }
  // };

  const [recipeid, setrecipeid] = useState("");

  const editRecipe = async (e) => {
    try {
      e.preventDefault();
      const config = await handleGetTokenAndConfig();
      if (productRecipePermission && !productRecipePermission.update) {
        toast.warn("ليس لك صلاحية لتعديل الوصفات");
        return;
      }

      const newIngredients = ingredients.map((ingredient) => {
        if (ingredient.itemId === itemId) {
          return { itemId, name, amount, costOfItem, unit, totalCostOfItem };
        } else {
          return ingredient;
        }
      });

      let total = 0;
      for (let i = 0; i < newIngredients.length; i++) {
        total += newIngredients[i].totalCostOfItem;
      }
      const totalcost = Math.round(total * 100) / 100;

      const editRecipeToProduct = await axios.put(
        `${apiUrl}/api/recipe/${recipeOfProduct._id}`,
        { ingredients: newIngredients, totalcost },
        config
      );

      if (editRecipeToProduct) {
        getProductRecipe(productId, sizeId);
        setitemId("");
        setname("");
        setamount("");
        setunit("");
        setingredients([]);
        setserviceDetails([]);
        setpreparationTime(0);
        setnumberOfMeals(1);
        toast.success("تم تعديل المكون بنجاح");
      } else {
        toast.error("حدث خطأ اثناء تعديل المكون ! حاول مره اخري");
      }
    } catch (error) {
      console.error("Error editing recipe:", error.message);
      toast.error("حدث خطأ أثناء تعديل الوصفة");
    }
  };

  const calculateTotalCost = (ingredients) => {
    let total = 0;

    ingredients?.forEach((ingredient) => {
      const costPart = Number(ingredient.itemId?.costPerPart) || 0;
      const amount = Number(ingredient.amount) || 0;
      const costOfIngredient = amount * costPart;
      total += costOfIngredient;
    });

    setProductTotalCost(total);
  };
  const [dineInCost, setdineInCost] = useState(0);
  const calculateTotalDineInCost = (serviceDetails) => {
    let total = 0;

    serviceDetails.dineIn?.forEach((dineIn) => {
      const costPart =
        Number(
          AllStockItems.find((stock) => stock._id === dineIn.itemId)
            ?.costPerPart
        ) || 0;
      const amount = Number(dineIn.amount) || 0;
      const costOfDineIn = amount * costPart;
      total += costOfDineIn;
    });

    setdineInCost(total);
  };
  const [deliveryCost, setdeliveryCost] = useState(0);
  const calculateTotaldeliveryCost = (serviceDetails) => {
    let total = 0;

    serviceDetails.delivery?.forEach((delivery) => {
      const costPart =
        Number(
          AllStockItems.find((stock) => stock._id === delivery.itemId)
            ?.costPerPart
        ) || 0;
      const amount = Number(delivery.amount) || 0;
      const costOfdelivery = amount * costPart;
      total += costOfdelivery;
    });

    setdeliveryCost(total);
  };
  const [takeawayCost, settakeawayCost] = useState(0);
  const calculateTotaltakeawayCost = (serviceDetails) => {
    let total = 0;

    serviceDetails.takeaway?.forEach((takeaway) => {
      const costPart =
        Number(
          AllStockItems.find((stock) => stock._id === takeaway.itemId)
            ?.costPerPart
        ) || 0;
      const amount = Number(takeaway.amount) || 0;
      const costOftakeaway = amount * costPart;
      total += costOftakeaway;
    });

    settakeawayCost(total);
  };

  const getProductRecipe = async (productId, sizeId) => {
    const config = await handleGetTokenAndConfig();
    try {
      if (productRecipePermission && !productRecipePermission.read) {
        toast.warn("ليس لك صلاحية لعرض الوصفات");
        return;
      }
      if (!productId) {
        toast.error("اختر الصنف اولا.");
      }

      const getProduct = await axios.get(
        `${apiUrl}/api/product/${productId}`,
        config
      );

      const product = getProduct.data;

      let recipeOfProduct;
      if (product.hasSizes) {
        const findSize = product.sizes?.find((size) => size._id === sizeId);

        recipeOfProduct = findSize.sizeRecipe;
      } else {
        recipeOfProduct = product.productRecipe;
      }

      if (recipeOfProduct && recipeOfProduct.ingredients?.length > 0) {
        setrecipeOfProduct(recipeOfProduct);

        const ingredients = recipeOfProduct.ingredients;
        const serviceDetails = recipeOfProduct.serviceDetails;
        calculateTotalCost(ingredients);
        calculateTotalDineInCost(serviceDetails);
        calculateTotaldeliveryCost(serviceDetails);
        calculateTotaltakeawayCost(serviceDetails);

        if (ingredients) {
          setingredients([...ingredients].reverse());
          toast.success("تم جلب مكونات الوصفة بنجاح");
        }
        if (serviceDetails) {
          setserviceDetails(serviceDetails);
          toast.success("تم جلب الاضافات الخاصه بنوع الطلب بنجاح");
        }
      } else {
        console.warn(
          "لم يتم العثور على وصفة مطابقة للمنتج وحجم المعرفات المقدمة."
        );
        setrecipeOfProduct({});
        setingredients([]);
        setserviceDetails({});
        setProductTotalCost(null); // Reset the total cost if no recipe is found
        toast.warn("لم يتم العثور على وصفة مطابقة.");
      }
    } catch (error) {
      console.error("خطأ في جلب وصفة المنتج:", error);
      toast.error("حدث خطأ أثناء جلب وصفة المنتج. يرجى المحاولة لاحقًا.");
    }
  };

  const [sizes, setsizes] = useState([]);

  const handleSelectedProduct = (id) => {
    setProductId(id);
    const findProduct = listofProducts.find((product) => product._id === id);

    setProductName(findProduct.name);
    setProduct(findProduct);
    if (findProduct.hasSizes) {
      setsizes([...findProduct.sizes]);
      setsize({});
      setsizeId("");
    } else {
      setsizes([]);
      setsize({});
      setsizeId("");
      getProductRecipe(id);
    }
  };

  const [size, setsize] = useState({});
  const [sizeId, setsizeId] = useState("");

  const handleSelectedProductSize = (sizeid) => {
    setsize(product.sizes.find((size) => size._id === sizeid));
    setsizeId(sizeid);
    getProductRecipe(productId, sizeid);
  };

  const deleteRecipe = async (e) => {
    e.preventDefault();
    const config = await handleGetTokenAndConfig();

    if (productRecipePermission && !productRecipePermission.delete) {
      toast.warn("ليس لك صلاحية لحذف الوصفات");
      return;
    }
    if (ingredients.length > 2) {
      const newingredients = ingredients.filter(
        (ingredient) => ingredient.itemId != itemId
      );

      let total = 0;
      for (let i = 0; i < newingredients.length; i++) {
        total += newingredients[i].totalCostOfItem;
      }

      // productRecipe.map(rec=>totalcost = totalcost + ingredient.totalCostOfItem)
      const deleteRecipetoProduct = await axios.put(
        `${apiUrl}/api/recipe/${recipeOfProduct._id}`,
        { ingredients: newingredients, totalcost: total },
        config
      );
    } else {
      const deleteRecipetoProduct = await axios.delete(
        `${apiUrl}/api/recipe/${recipeOfProduct._id}`,
        config
      );
    }
    getProductRecipe(productId);
  };

  const deleteAllRecipe = async (e) => {
    e.preventDefault();
    const config = await handleGetTokenAndConfig();
    try {
      if (productRecipePermission && !productRecipePermission.delete) {
        toast.warn("ليس لك صلاحية لحذف الوصفات");
        return;
      }
      if (recipeOfProduct) {
        const deleteRecipeToProduct = await axios.delete(
          `${apiUrl}/api/recipe/${recipeOfProduct._id}`,
          config
        );

        getProductRecipe(productId, sizeId);

        deleteRecipeToProduct.status === 200
          ? toast.success("تم حذف الوصفة بنجاح")
          : toast.error("حدث خطأ أثناء الحذف");
        getProductRecipe(productId, sizeId);
      } else {
        toast.error("يرجى اختيار الصفنف والمنتج أولاً");
      }
    } catch (error) {
      console.error("Error deleting recipe:", error.message);
      toast.error("فشل عملية الحذف! يرجى المحاولة مرة أخرى");
      getProductRecipe(productId, sizeId);
    }
  };

  useEffect(() => {
    getallproducts();
    getallCategories();
    getallStockItem();
  }, []);

  return (
    <div className="w-100 px-3 d-flex align-itmes-center justify-content-start">
      <div className="table-responsive mt-1">
        <div className="table-wrapper p-3 mw-100">
          <div className="table-title">
            <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
              <div className="text-right">
                <h2>
                  ادارة <b>تكاليف الانتاج</b>
                </h2>
              </div>
              <div className="col-12 col-md-8 p-0 m-0 d-flex flex-wrap aliegn-items-center justify-content-end print-hide">
                <a
                  href="#addRecipeModal"
                  className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-success"
                  data-toggle="modal"
                >
                  {" "}
                  <span>اضافه مكون جديد</span>
                </a>
                <a
                  href="#addServiceDetailsModal"
                  className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-primary"
                  data-toggle="modal"
                >
                  {" "}
                  <span>اضافه مكون خاص بنوع الطلب</span>
                </a>

                <a
                  href="#deleteAllProductModal"
                  className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-danger"
                  data-toggle="modal"
                >
                  {" "}
                  <span>حذف الكل</span>
                </a>
              </div>
            </div>
          </div>

          <div className="table-filter print-hide">
            <div className="col-12 text-dark d-flex flex-wrap align-items-center justify-content-start p-0 m-0">
              {/* <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
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
              </div> */}
              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  التصنيف
                </label>
                <select
                  className="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => getproductByCategory(e.target.value)}
                >
                  <option value={""}>اختر التصنيف</option>
                  {listOfCategories.map((category, i) => {
                    return (
                      <option value={category._id} key={i}>
                        {category.name}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  المنتج
                </label>
                <select
                  className="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => handleSelectedProduct(e.target.value)}
                >
                  <option value={""}>اختر الصنف</option>
                  {productFilterd &&
                    productFilterd.map((product, i) => {
                      return (
                        <option value={product._id} key={i}>
                          {product.name}
                        </option>
                      );
                    })}
                </select>
              </div>
              {sizes.length > 0 ? (
                <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الحجم
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    onChange={(e) => handleSelectedProductSize(e.target.value)}
                  >
                    <option value="">اختر حجم</option>
                    {sizes &&
                      sizes.map((size, i) => {
                        return (
                          <option value={size._id} key={i}>
                            {size.sizeName}
                          </option>
                        );
                      })}
                  </select>
                </div>
              ) : (
                ""
              )}
            </div>
            <div className="col-12 text-dark d-flex flex-wrap align-items-center justify-content-start p-0 m-0">
              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  وقت التحضير
                </label>
                <input
                  type="Number"
                  className="form-control border-primary m-0 p-2 h-auto"
                  readOnly
                  defaultValue={product.productRecipe?.preparationTime}
                />
              </div>
              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  عدد الوجبات
                </label>
                <input
                  type="Number"
                  className="form-control border-primary m-0 p-2 h-auto"
                  readOnly
                  defaultValue={product.productRecipe?.numberOfMeals}
                />
              </div>
              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  اجمالي التكاليف
                </label>
                <input
                  type="text"
                  className="form-control border-primary m-0 p-2 h-auto"
                  readOnly
                  value={productTotalCost}
                />
              </div>
              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  تكلفه الوجبه
                </label>
                <input
                  type="text"
                  className="form-control border-primary m-0 p-2 h-auto"
                  readOnly
                  value={
                    productTotalCost
                      ? Number(productTotalCost) /
                        Number(product.productRecipe?.numberOfMeals)
                      : 0
                  }
                />
              </div>
            </div>
            <div className="col-12 text-dark d-flex flex-wrap align-items-center justify-content-start p-0 m-0">
              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  تكاليف الصاله
                </label>
                <input
                  type="Number"
                  className="form-control border-primary m-0 p-2 h-auto"
                  readOnly
                  value={dineInCost}
                />
              </div>
              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  تكاليف التيك اوي
                </label>
                <input
                  type="Number"
                  className="form-control border-primary m-0 p-2 h-auto"
                  readOnly
                  value={takeawayCost}
                />
              </div>
              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  تكاليف الدليفري
                </label>
                <input
                  type="text"
                  className="form-control border-primary m-0 p-2 h-auto"
                  readOnly
                  value={deliveryCost}
                />
              </div>
              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1"></div>
            </div>
          </div>

          <table className="table table-striped table-hover">
            <thead>
              <tr>
                <th>
                  <span className="custom-checkbox">
                    <input
                      type="checkbox"
                      className="form-check-input form-check-input-lg"
                      id="selectAll"
                    />
                    <label htmlFor="selectAll"></label>
                  </span>
                </th>
                <th>م</th>
                <th>الاسم</th>
                <th>الوحدة</th>
                <th>الكمية</th>
                <th>التكلفة</th>
                <th>تكلفة المكون</th>
                <th>اجراءات</th>
              </tr>
            </thead>
            <tbody>
              {ingredients.length > 0
                ? ingredients.map((ingredient, i) => {
                    // if ((i >= startPagination) & (i < endPagination)) {
                    return (
                      <tr key={i}>
                        <td>
                          <span className="custom-checkbox">
                            <input
                              type="checkbox"
                              className="form-check-input form-check-input-lg"
                              id="checkbox1"
                              name="options[]"
                              value="1"
                            />
                            <label htmlFor="checkbox1"></label>
                          </span>
                        </td>
                        <td>{i + 1}</td>
                        <td>{ingredient.name}</td>
                        <td>{ingredient.unit}</td>
                        <td>{ingredient.amount}</td>
                        <td>{ingredient.itemId?.costPerPart}</td>
                        <td>
                          {Number(ingredient.amount) *
                            Number(ingredient.itemId?.costPerPart)}
                        </td>
                        <td>
                          <button
                            data-target="#editRecipeModal"
                            className="btn btn-sm btn-primary ml-2 "
                            data-toggle="modal"
                            onClick={() => {
                              setrecipeid(ingredient._id);
                              setitemId(ingredient.itemId);
                              setname(ingredient.name);
                              setamount(ingredient.amount);
                              setunit(ingredient.unit);
                              setwastePercentage(ingredient.wastePercentage);
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

                          <button
                            data-target="#deleteProductModal"
                            className="btn btn-sm btn-danger"
                            data-toggle="modal"
                            onClick={() => {
                              setitemId(ingredient.itemId);
                            }}
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
                  })
                : // })
                  ""}
              <tr>
                <td colSpan="8" style={{ textAlign: "center" }}>
                  اضافات خاصه بطلبات الصاله
                </td>
              </tr>
              {serviceDetails.dineIn?.length > 0 &&
                serviceDetails.dineIn.map((dineIn, i) => {
                  return (
                    <tr key={i}>
                      <td>
                        <span className="custom-checkbox">
                          <input
                            type="checkbox"
                            className="form-check-input form-check-input-lg"
                            id="checkbox1"
                            name="options[]"
                            value="1"
                          />
                          <label htmlFor="checkbox1"></label>
                        </span>
                      </td>
                      <td>{i + 1}</td>
                      <td>{dineIn.name}</td>
                      <td>{dineIn.unit}</td>
                      <td>{dineIn.amount}</td>
                      <td>
                        {
                          AllStockItems.find(
                            (stock) => stock._id === dineIn.itemId
                          )?.costPerPart
                        }
                      </td>
                      <td>
                        {Number(dineIn.amount) *
                          Number(
                            AllStockItems.find(
                              (stock) => stock._id === dineIn.itemId
                            )?.costPerPart
                          )}
                      </td>
                      <td>
                        <button
                          data-target="#editRecipeModal"
                          className="btn btn-sm btn-primary ml-2 "
                          data-toggle="modal"
                          onClick={() => {
                            setrecipeid(dineIn._id);
                            setitemId(dineIn.itemId);
                            setname(dineIn.name);
                            setamount(dineIn.amount);
                            setunit(dineIn.unit);
                            setwastePercentage(dineIn.wastePercentage);
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

                        <button
                          data-target="#deleteProductModal"
                          className="btn btn-sm btn-danger"
                          data-toggle="modal"
                          onClick={() => {
                            setitemId(dineIn.itemId);
                          }}
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
                })}
              <tr>
                <td colSpan="8" style={{ textAlign: "center" }}>
                  اضافات خاصه بطلبات التيك اوي
                </td>
              </tr>
              {serviceDetails.takeaway?.length > 0 &&
                serviceDetails.takeaway.map((takeaway, i) => {
                  return (
                    <tr key={i}>
                      <td>
                        <span className="custom-checkbox">
                          <input
                            type="checkbox"
                            className="form-check-input form-check-input-lg"
                            id="checkbox1"
                            name="options[]"
                            value="1"
                          />
                          <label htmlFor="checkbox1"></label>
                        </span>
                      </td>
                      <td>{i + 1}</td>
                      <td>{takeaway.name}</td>
                      <td>{takeaway.unit}</td>
                      <td>{takeaway.amount}</td>
                      <td>
                        {
                          AllStockItems.find(
                            (stock) => stock._id === takeaway.itemId
                          )?.costPerPart
                        }
                      </td>
                      <td>
                        {Number(takeaway.amount) *
                          Number(
                            AllStockItems.find(
                              (stock) => stock._id === takeaway.itemId
                            )?.costPerPart
                          )}
                      </td>
                      <td>
                        <button
                          data-target="#editRecipeModal"
                          className="btn btn-sm btn-primary ml-2 "
                          data-toggle="modal"
                          onClick={() => {
                            setrecipeid(takeaway._id);
                            setitemId(takeaway.itemId);
                            setname(takeaway.name);
                            setamount(takeaway.amount);
                            setunit(takeaway.unit);
                            setwastePercentage(takeaway.wastePercentage);
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

                        <button
                          data-target="#deleteProductModal"
                          className="btn btn-sm btn-danger"
                          data-toggle="modal"
                          onClick={() => {
                            setitemId(takeaway.itemId);
                          }}
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
                })}
              <tr>
                <td colSpan="8" style={{ textAlign: "center" }}>
                  اضافات خاصه بطلبات الديليفري
                </td>
              </tr>
              {serviceDetails.delivery?.length > 0 &&
                serviceDetails.delivery.map((delivery, i) => {
                  return (
                    <tr key={i}>
                      <td>
                        <span className="custom-checkbox">
                          <input
                            type="checkbox"
                            className="form-check-input form-check-input-lg"
                            id="checkbox1"
                            name="options[]"
                            value="1"
                          />
                          <label htmlFor="checkbox1"></label>
                        </span>
                      </td>
                      <td>{i + 1}</td>
                      <td>{delivery.name}</td>
                      <td>{delivery.unit}</td>
                      <td>{delivery.amount}</td>
                      <td>
                        {
                          AllStockItems.find(
                            (stock) => stock._id === delivery.itemId
                          )?.costPerPart
                        }
                      </td>
                      <td>
                        {Number(delivery.amount) *
                          Number(
                            AllStockItems.find(
                              (stock) => stock._id === delivery.itemId
                            )?.costPerPart
                          )}
                      </td>
                      <td>
                        <button
                          data-target="#editRecipeModal"
                          className="btn btn-sm btn-primary ml-2 "
                          data-toggle="modal"
                          onClick={() => {
                            setrecipeid(delivery._id);
                            setitemId(delivery.itemId);
                            setname(delivery.name);
                            setamount(delivery.amount);
                            setunit(delivery.unit);
                            setwastePercentage(delivery.wastePercentage);
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

                        <button
                          data-target="#deleteProductModal"
                          className="btn btn-sm btn-danger"
                          data-toggle="modal"
                          onClick={() => {
                            setitemId(delivery.itemId);
                          }}
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
                })}
            </tbody>
          </table>

          {/* <div className="clearfix">
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
          </div> */}
        </div>
      </div>

      <div id="addRecipeModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded">
            <form onSubmit={addRecipeItem}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">اضافه مكون</h4>
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
                {/* عدد الوجبات */}
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    عدد الوجبات
                  </label>
                  <input
                    type="number"
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={product.productRecipe?.numberOfMeals}
                    readOnly={product.numberOfMeals > 0 ? true : false}
                    onChange={(e) => setnumberOfMeals(e.target.value)}
                    required
                    min="1"
                  />
                </div>

                {/* زمن التحضير */}
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    زمن التحضير (دقائق)
                  </label>
                  <input
                    type="number"
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={product.productRecipe?.preparationTime}
                    readOnly={
                      product.productRecipe?.preparationTime > 0 ? true : false
                    }
                    onChange={(e) => setpreparationTime(e.target.value)}
                    required
                    min="0"
                  />
                </div>

                {/* اختيار المكون */}
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الاسم
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    onChange={(e) => {
                      setitemId(e.target.value);
                      const selectedItem = AllStockItems.find(
                        (s) => s._id === e.target.value
                      );
                      if (selectedItem) {
                        setname(selectedItem.itemName);
                        setunit(selectedItem.ingredientUnit);
                        setcostOfItem(selectedItem.costPerPart);
                      }
                    }}
                  >
                    <option value="">اختر</option>
                    {AllStockItems &&
                      AllStockItems.map((item, i) => (
                        <option value={item._id} key={i}>
                          {item.itemName}
                        </option>
                      ))}
                  </select>
                </div>
                {/* كمية العنصر */}
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الكمية
                  </label>
                  <div className="w-100 d-flex flex-nowrap">
                    <input
                      type="number"
                      className="form-control border-primary col-4"
                      required
                      onChange={(e) => {
                        setamount(e.target.value);
                        settotalCostOfItem(e.target.value * costOfItem);
                      }}
                    />
                    <input
                      type="text"
                      className="form-control border-primary col-4"
                      value={unit || ""}
                      readOnly
                      required
                    />
                  </div>
                </div>

                {/* تكلفة العنصر */}
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    التكلفة
                  </label>
                  <input
                    type="number"
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={costOfItem || ""}
                    readOnly
                  />
                </div>

                {/* تكلفة الكمية الإجمالية */}
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    التكلفة الاجمالية
                  </label>
                  <input
                    type="number"
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={totalCostOfItem || ""}
                    readOnly
                    required
                  />
                </div>

                {/* نسبة الفاقد */}
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    نسبة الفاقد (%)
                  </label>
                  <input
                    type="number"
                    className="form-control border-primary m-0 p-2 h-auto"
                    onChange={(e) => setwastePercentage(e.target.value)}
                    value={wastePercentage || ""}
                    required
                    min="0"
                    max="100"
                  />
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
                  type="submit"
                  className="btn btn-success col-6 h-100 px-2 py-3 m-0"
                  value="اضافه"
                />
              </div>
            </form>
          </div>
        </div>
      </div>
      <div id="addServiceDetailsModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded">
            <form onSubmit={addServiceItem}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">اضافه مكون</h4>
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
                {/* عدد الوجبات */}
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    عدد الوجبات
                  </label>
                  <input
                    type="number"
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={product.productRecipe?.numberOfMeals}
                    readOnly={product.numberOfMeals > 0 ? true : false}
                    onChange={(e) => setnumberOfMeals(e.target.value)}
                    required
                    min="1"
                  />
                </div>

                {/* زمن التحضير
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    زمن التحضير (دقائق)
                  </label>
                  <input
                    type="number"
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={product.productRecipe?.preparationTime}
                    readOnly={product.productRecipe?.preparationTime > 0 ? true : false}
                    onChange={(e) => setpreparationTime(e.target.value)}
                    required
                    min="0"
                  />
                </div> */}

                {/* اختيار نوع الطلب */}
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    نوع الطلب
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    onChange={(e) => {
                      setorderType(e.target.value);
                    }}
                  >
                    <option value="">اختر</option>
                    {orderTypeList.map((type, i) => (
                      <option value={type} key={i}>
                        {type === "dineIn"
                          ? "داخل المطعم"
                          : type === "takeaway"
                          ? "طلبات خارجية"
                          : "توصيل"}
                      </option>
                    ))}
                  </select>
                </div>
                {/* اختيار المكون */}
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الاسم
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    onChange={(e) => {
                      setitemId(e.target.value);
                      const selectedItem = AllStockItems.find(
                        (s) => s._id === e.target.value
                      );
                      if (selectedItem) {
                        setname(selectedItem.itemName);
                        setunit(selectedItem.ingredientUnit);
                        setcostOfItem(selectedItem.costPerPart);
                      }
                    }}
                  >
                    <option value="">اختر</option>
                    {AllStockItems &&
                      AllStockItems.map((item, i) => (
                        <option value={item._id} key={i}>
                          {item.itemName}
                        </option>
                      ))}
                  </select>
                </div>
                {/* كمية العنصر */}
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الكمية
                  </label>
                  <div className="w-100 d-flex flex-nowrap">
                    <input
                      type="number"
                      className="form-control border-primary col-4"
                      required
                      onChange={(e) => {
                        setamount(e.target.value);
                        settotalCostOfItem(e.target.value * costOfItem);
                      }}
                    />
                    <input
                      type="text"
                      className="form-control border-primary col-4"
                      value={unit || ""}
                      readOnly
                      required
                    />
                  </div>
                </div>

                {/* تكلفة العنصر */}
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    التكلفة
                  </label>
                  <input
                    type="number"
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={costOfItem || ""}
                    readOnly
                  />
                </div>

                {/* تكلفة الكمية الإجمالية */}
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    التكلفة الاجمالية
                  </label>
                  <input
                    type="number"
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={totalCostOfItem || ""}
                    readOnly
                    required
                  />
                </div>

                {/* نسبة الفاقد */}
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    نسبة الفاقد (%)
                  </label>
                  <input
                    type="number"
                    className="form-control border-primary m-0 p-2 h-auto"
                    onChange={(e) => setwastePercentage(e.target.value)}
                    value={wastePercentage || ""}
                    required
                    min="0"
                    max="100"
                  />
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
                  type="submit"
                  className="btn btn-success col-6 h-100 px-2 py-3 m-0"
                  value="اضافه"
                />
              </div>
            </form>
          </div>
        </div>
      </div>

      <div id="editRecipeModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={editRecipe}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">تعديل مكون</h4>
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
                    defaultValue={name}
                    readOnly
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    التكلفة
                  </label>
                  <input
                    type="Number"
                    className="form-control border-primary col-4"
                    required
                    defaultValue={costOfItem}
                    readOnly
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الكمية
                  </label>
                  <div className="w-100 d-flex flex-nowrap">
                    <input
                      type="Number"
                      className="form-control border-primary m-0 p-2 h-auto"
                      defaultValue={amount}
                      required
                      onChange={(e) => {
                        setamount(e.target.value);
                        settotalCostOfItem(e.target.value * costOfItem);
                      }}
                    />
                    <input
                      type="text"
                      className="form-control border-primary col-4"
                      defaultValue={unit}
                      readOnly
                      required
                    />
                  </div>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    التكلفة الاجمالية
                  </label>
                  <input
                    type="Number"
                    className="form-control border-primary m-0 p-2 h-auto"
                    defaultValue={totalCostOfItem}
                    required
                    readOnly
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
      <div id="deleteProductModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={deleteRecipe}>
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
      <div id="deleteAllProductModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={deleteAllRecipe}>
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

export default ProductRecipe;
