import React, {
  useState,
  useEffect,
  useRef,
  useContext,
  isValidElement,
} from "react";
import axios from "axios";
import { AppContext } from "../../../../context/appContext";
import { toast } from "react-toastify";
import "../orders/Orders.css";

const ProductionRecipe = () => {
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
  } = useContext(AppContext);

  const productionRecipePermission =
    permissionsList &&
    permissionsList.filter(
      (perission) => perission.resource === "Stock Production Recipes"
    )[0];

  const stockItemPermission =
    permissionsList &&
    permissionsList.filter(
      (permission) => permission.resource === "stock Item"
    )[0];

  const [AllStockItems, setAllStockItems] = useState([]);

  // Function to retrieve all stock items
  const getStockItems = async () => {
    const config = await handleGetTokenAndConfig();
    if (stockItemPermission && !stockItemPermission.read) {
      toast.warn("ليس لك صلاحية لعرض عناصر المخزن");
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.get(apiUrl + "/api/stockItem/", config);

      if (!response || !response.data) {
        // Handle unexpected response or empty data
        throw new Error("استجابة غير متوقعة أو بيانات فارغة");
      }

      const stockItems = response.data.reverse();
      setAllStockItems(stockItems);

      // Notify on success
      toast.success("تم استرداد عناصر المخزون بنجاح");
      setIsLoading(false);
    } catch (error) {
      console.error(error);
      // Notify on error
      toast.error("فشل في استرداد عناصر المخزون");
      setIsLoading(false);
    }
  };

  const [AllCategoryStock, setAllCategoryStock] = useState([]);
  // Function to retrieve all category stock
  const getAllCategoryStock = async () => {
    const config = await handleGetTokenAndConfig();
    setIsLoading(true);
    try {
      const response = await axios.get(apiUrl + "/api/stockCategory/", config);
      setAllCategoryStock(response.data.reverse());
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching category stock:", error);
      toast.error("حدث خطأ اثناء جلب بيانات التصنيفات ! اعد تحميل الصفحة");
      setIsLoading(false);
    }
  };

  const [stockItemFiltered, setStockItemFiltered] = useState([]);
  const getStockItemByCategory = (category) => {
    const stockItems = AllStockItems.filter(
      (item) => item.categoryId._id === category
    );
    setStockItemFiltered(stockItems);
  };
  const [ingredientStockItems, setIngredientStockItems] = useState([]);

  const filterStockItemsForIngredient = (categoryId) => {
    const filteredItems = AllStockItems.filter(
      (item) => item.categoryId._id === categoryId
    );
    setIngredientStockItems(filteredItems);
  };

  const [stockItem, setStockItem] = useState({});
  const [stockItemId, setStockItemId] = useState("");
  const [stockItemName, setStockItemName] = useState("");

  const [recipeOfStockItem, setrecipeOfStockItem] = useState({});
  const [ingredients, setingredients] = useState([]);
  const [productTotalCost, setStockItemTotalCost] = useState(0);
  const [serviceDetails, setserviceDetails] = useState([]);
  const [batchSize, setBatchSize] = useState(0);
  const [preparationTime, setpreparationTime] = useState(0);
  const [orderType, setorderType] = useState("");
  const [quantity, setquantity] = useState(0);
  const [orderTypeList, setorderTypeList] = useState([
    "dineIn",
    "takeaway",
    "delivery",
  ]);
  const [itemId, setitemId] = useState("");
  const [name, setname] = useState("");
  const [unit, setunit] = useState("");
  const [wastePercentage, setwastePercentage] = useState(0);
  const [costofitem, setcostofitem] = useState(0);
  const [totalcostofitem, settotalcostofitem] = useState(0);

  const addRecipeItem = async (e) => {
    e.preventDefault();
    const config = await handleGetTokenAndConfig();
    try {
      if (productionRecipePermission && !productionRecipePermission.create) {
        toast.warn("ليس لك صلاحية لانشاء الوصفات");
        return;
      }
      if (!itemId || !name || !quantity || !unit) {
        toast.error("يرجى تعبئة جميع الحقول بشكل صحيح");
        return;
      }

      let newIngredients;
      // let newServiceDetails;

      if (recipeOfStockItem && recipeOfStockItem._id) {
        // If there are existing ingredients, create a new array with the added ingredient
        newIngredients = [
          ...ingredients,
          { itemId, name, quantity, unit, wastePercentage },
        ];
        // Update the recipe by sending a PUT request
        const addRecipeToStockProduction = await axios.put(
          `${apiUrl}/api/productionrecipe/${recipeOfStockItem._id}`,
          {
            ingredients: newIngredients,
          },
          config
        );

        if (addRecipeToStockProduction.status === 200) {
          const recipeData = await addRecipeToStockProduction.data;

          const productionRecipe = recipeData._id;
          const updateProduct = await axios.put(
            `${apiUrl}/api/stockItem/${stockItemId}`,
            { productionRecipe },
            config
          );
          toast.success("تم تحديث الوصفة بنجاح");
        } else {
          throw new Error("Failed to update recipe");
        }
      } else {
        // If there are no existing ingredients, create a new array with the single ingredient
        newIngredients = [{ itemId, name, quantity, unit, wastePercentage }];
        // newIngredients = [{ itemId, name, quantity, unit, wastePercentage }];
        console.log({
          stockItem: stockItemId,
          stockItemName,
          batchSize,
          preparationTime,
          newIngredients,
        });
        // Add the new recipe to the stockItem by sending a POST request
        const addRecipeToStockProduction = await axios.post(
          `${apiUrl}/api/productionrecipe`,
          {
            stockItem: stockItemId,
            stockItemName,
            batchSize,
            preparationTime,
            ingredients: [...newIngredients],
          },
          config
        );

        if (addRecipeToStockProduction.status === 201) {
          const recipeData = await addRecipeToStockProduction.data;

          const productionRecipe = recipeData._id;
          const updateProduct = await axios.put(
            `${apiUrl}/api/stockItem/${stockItemId}`,
            { productionRecipe },
            config
          );
          setitemId("");
          setname("");
          setquantity("");
          setunit("");
          setingredients([]);
          setserviceDetails([]);
          setpreparationTime(0);
          setBatchSize(1);
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
      if (productionRecipePermission && !productionRecipePermission.create) {
        toast.warn("ليس لك صلاحية لانشاء الوصفات");
        return;
      }

      if (!orderType || !itemId || !name || !quantity || !unit) {
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
        quantity,
        unit,
        wastePercentage,
      });

      if (recipeOfStockItem && recipeOfStockItem._id) {
        const addRecipeToStockProduction = await axios.put(
          `${apiUrl}/api/productionrecipe/${recipeOfStockItem._id}`,
          { serviceDetails: newServiceDetails },
          config
        );

        if (addRecipeToStockProduction.status === 200) {
          toast.success("تم تحديث الوصفة بنجاح");
          setserviceDetails(newServiceDetails); // تحديث الحالة في الواجهة
        } else {
          throw new Error("Failed to update recipe");
        }
      }
    } catch (error) {
      console.error("Error creating/updating recipe:", error);
      toast.error("حدث خطأ أثناء إنشاء أو تحديث الوصفة");
    }
  };

  const [recipeid, setrecipeid] = useState("");

  const editRecipe = async (e) => {
    try {
      e.preventDefault();
      const config = await handleGetTokenAndConfig();
      if (productionRecipePermission && !productionRecipePermission.update) {
        toast.warn("ليس لك صلاحية لتعديل الوصفات");
        return;
      }

      const newIngredients = ingredients.map((ingredient) => {
        if (ingredient.itemId === itemId) {
          return { itemId, name, quantity, costofitem, unit, totalcostofitem };
        } else {
          return ingredient;
        }
      });

      let total = 0;
      for (let i = 0; i < newIngredients.length; i++) {
        total += newIngredients[i].totalcostofitem;
      }
      const totalcost = Math.round(total * 100) / 100;

      const editRecipeToProduct = await axios.put(
        `${apiUrl}/api/productionrecipe/${recipeOfStockItem._id}`,
        { ingredients: newIngredients, totalcost },
        config
      );
      const editRecipeToProductData = await editRecipeToProduct.data
        .ProductionRecipe;
      if (editRecipeToProductData) {
        getRecipeOfStockItem(editRecipeToProductData.stockItem);
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
      const quantity = Number(ingredient.quantity) || 0;
      const costOfIngredient = quantity * costPart;
      total += costOfIngredient;
    });

    setStockItemTotalCost(total);
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
      const quantity = Number(dineIn.quantity) || 0;
      const costOfDineIn = quantity * costPart;
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
      const quantity = Number(delivery.quantity) || 0;
      const costOfdelivery = quantity * costPart;
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
      const quantity = Number(takeaway.quantity) || 0;
      const costOftakeaway = quantity * costPart;
      total += costOftakeaway;
    });

    settakeawayCost(total);
  };

  const getRecipeOfStockItem = async (itemId) => {
    const config = await handleGetTokenAndConfig();
    try {
      if (productionRecipePermission && !productionRecipePermission.read) {
        toast.warn("ليس لك صلاحية لعرض الوصفات");
        return;
      }
      if (!itemId) {
        toast.error("اختر الصنف اولا.");
      }

      setStockItemId(itemId);
      const getStockItem = stockItemFiltered.find(
        (item) => item._id === itemId
      );
      setStockItem(getStockItem);
      setStockItemName(getStockItem.itemName);

      const getStockItemRecipe = await axios.get(
        `${apiUrl}/api/productionrecipe/stockitem/${itemId}`,
        config
      );

      const recipeOfStockItem = getStockItemRecipe.data;

      if (recipeOfStockItem && recipeOfStockItem.ingredients?.length > 0) {
        setrecipeOfStockItem(recipeOfStockItem);
        setpreparationTime(recipeOfStockItem.preparationTime);
        setBatchSize(recipeOfStockItem.batchSize);

        const ingredients = recipeOfStockItem.ingredients;
        const serviceDetails = recipeOfStockItem.serviceDetails;
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
        setrecipeOfStockItem({});
        setingredients([]);
        setserviceDetails({});
        setStockItemTotalCost(null); // Reset the total cost if no recipe is found
        toast.warn("لم يتم العثور على وصفة مطابقة.");
      }
    } catch (error) {
      console.error("خطأ في جلب وصفة المنتج:", error);
      toast.warn("لم يتم العثور على وصفة مطابقة. يرجى المحاولة لاحقًا.");
    }
  };

  const deleteRecipe = async (e) => {
    e.preventDefault();
    const config = await handleGetTokenAndConfig();

    if (productionRecipePermission && !productionRecipePermission.delete) {
      toast.warn("ليس لك صلاحية لحذف الوصفات");
      return;
    }
    if (ingredients.length > 2) {
      const newingredients = ingredients.filter(
        (ingredient) => ingredient.itemId != itemId
      );

      let total = 0;
      for (let i = 0; i < newingredients.length; i++) {
        total += newingredients[i].totalcostofitem;
      }

      // productionRecipe.map(rec=>totalcost = totalcost + ingredient.totalcostofitem)
      const deleteRecipetoProduct = await axios.put(
        `${apiUrl}/api/productionrecipe/${recipeOfStockItem._id}`,
        { ingredients: newingredients, totalcost: total },
        config
      );
    } else {
      const deleteRecipetoProduct = await axios.delete(
        `${apiUrl}/api/productionrecipe/${recipeOfStockItem._id}`,
        config
      );
    }
  };

  const deleteAllRecipe = async (e) => {
    e.preventDefault();
    const config = await handleGetTokenAndConfig();
    try {
      if (productionRecipePermission && !productionRecipePermission.delete) {
        toast.warn("ليس لك صلاحية لحذف الوصفات");
        return;
      }
      if (recipeOfStockItem) {
        const deleteRecipeToProduct = await axios.delete(
          `${apiUrl}/api/productionrecipe/${recipeOfStockItem._id}`,
          config
        );

        deleteRecipeToProduct.status === 200
          ? toast.success("تم حذف الوصفة بنجاح")
          : toast.error("حدث خطأ أثناء الحذف");
      } else {
        toast.error("يرجى اختيار الصفنف والمنتج أولاً");
      }
    } catch (error) {
      console.error("Error deleting recipe:", error.message);
      toast.error("فشل عملية الحذف! يرجى المحاولة مرة أخرى");
    }
  };

  const handleSelectedStockItem = async (id) => {
    try {
      const config = await handleGetTokenAndConfig();
      setitemId(id);
      const getStockItem = await axios.get(
        `${apiUrl}/api/stockItem/${id}`,
        config
      );
      const stockItemData = await getStockItem.data;

      setname(stockItemData.itemName);
      setunit(stockItemData.ingredientUnit);
      setcostofitem(stockItemData.costPerPart);
    } catch (error) {
      console.error("Error selecting stock item:", error);
      toast.error("حدث خطأ أثناء تحديد الصنف");
    }
  };

  useEffect(() => {
    getAllCategoryStock();
    getStockItems();
  }, []);

  return (
    <div className="w-100 px-3 d-flex align-itmes-center justify-content-start">
      <div className="table-responsive mt-1">
        <div className="table-wrapper p-3 mw-100">
          <div className="table-title">
            <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
              <div className="text-right">
                <h2>
                  ادارة <b>تكاليف التصنيع</b>
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
                  التصنيف
                </label>
                <select
                  className="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => getStockItemByCategory(e.target.value)}
                >
                  <option value={""}>اختر التصنيف</option>
                  {AllCategoryStock.map((category, i) => {
                    return (
                      <option value={category._id} key={i}>
                        {category.categoryName}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  عنصر المخزن
                </label>
                <select
                  className="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => getRecipeOfStockItem(e.target.value)}
                >
                  <option value={""}>اختر الصنف</option>
                  {stockItemFiltered &&
                    stockItemFiltered.map((stockItem, i) => {
                      return (
                        <option value={stockItem._id} key={i}>
                          {stockItem.itemName}
                        </option>
                      );
                    })}
                </select>
              </div>
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
                  value={preparationTime}
                />
              </div>
              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  الكمية
                </label>
                <input
                  type="Number"
                  className="form-control border-primary m-0 p-2 h-auto"
                  readOnly
                  value={batchSize}
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
                        Number(stockItem.productionRecipe?.batchSize)
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
              {ingredients.length > 0 &&
                ingredients.map((ingredient, i) => {
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
                      <td>{ingredient.quantity}</td>
                      <td>{ingredient.itemId?.costPerPart}</td>
                      <td>
                        {Number(ingredient.quantity) *
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
                            setquantity(ingredient.quantity);
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
                })}
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
                      <td>{dineIn.quantity}</td>
                      <td>
                        {
                          AllStockItems.find(
                            (stock) => stock._id === dineIn.itemId
                          )?.costPerPart
                        }
                      </td>
                      <td>
                        {Number(dineIn.quantity) *
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
                            setquantity(dineIn.quantity);
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
                      <td>{takeaway.quantity}</td>
                      <td>
                        {
                          AllStockItems.find(
                            (stock) => stock._id === takeaway.itemId
                          )?.costPerPart
                        }
                      </td>
                      <td>
                        {Number(takeaway.quantity) *
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
                            setquantity(takeaway.quantity);
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
                      <td>{delivery.quantity}</td>
                      <td>
                        {
                          AllStockItems.find(
                            (stock) => stock._id === delivery.itemId
                          )?.costPerPart
                        }
                      </td>
                      <td>
                        {Number(delivery.quantity) *
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
                            setquantity(delivery.quantity);
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
                    الكمية
                  </label>
                  <input
                    type="number"
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={batchSize}
                    readOnly={batchSize > 0 ? true : false}
                    onChange={(e) => setBatchSize(e.target.value)}
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
                    value={preparationTime}
                    readOnly={preparationTime > 0 ? true : false}
                    onChange={(e) => setpreparationTime(e.target.value)}
                    required
                    min="0"
                  />
                </div>

                <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    التصنيف
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    onChange={(e) =>
                      filterStockItemsForIngredient(e.target.value)
                    }
                  >
                    <option value={""}>اختر التصنيف</option>
                    {AllCategoryStock.map((category, i) => {
                      return (
                        <option value={category._id} key={i}>
                          {category.categoryName}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* اختيار المكون */}
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    العنصر
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    onChange={(e) => {
                      handleSelectedStockItem(e.target.value);
                    }}
                  >
                    <option value="">اختر</option>
                    {ingredientStockItems &&
                      ingredientStockItems.map((item, i) => (
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
                        setquantity(e.target.value);
                        settotalcostofitem(e.target.value * costofitem);
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
                    value={costofitem || ""}
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
                    value={totalcostofitem || ""}
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
                    الكمية
                  </label>
                  <input
                    type="number"
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={stockItem.productionRecipe?.batchSize}
                    readOnly={stockItem.batchSize > 0 ? true : false}
                    onChange={(e) => setBatchSize(e.target.value)}
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
                    value={stockItem.productionRecipe?.preparationTime}
                    readOnly={stockItem.productionRecipe?.preparationTime > 0 ? true : false}
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
                        setcostofitem(selectedItem.costPerPart);
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
                        setquantity(e.target.value);
                        settotalcostofitem(e.target.value * costofitem);
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
                    value={costofitem || ""}
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
                    value={totalcostofitem || ""}
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
                    defaultValue={costofitem}
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
                      defaultValue={quantity}
                      required
                      onChange={(e) => {
                        setquantity(e.target.value);
                        settotalcostofitem(e.target.value * costofitem);
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
                    defaultValue={totalcostofitem}
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

export default ProductionRecipe;
