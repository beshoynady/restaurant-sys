import React, { createContext, useState, useEffect, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import jwt_decode from "jwt-decode";
import io from "socket.io-client";

import AppContextProvider from "./context/AppContextProvider";

import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


const AppContext = createContext(null);

const cashierSocket = io(`${process.env.REACT_APP_API_URL}/cashier`, {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});

const kitchenSocket = io(`${process.env.REACT_APP_API_URL}/kitchen`, {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});
const GrillSocket = io(`${process.env.REACT_APP_API_URL}/grill`, {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});
const BarSocket = io(`${process.env.REACT_APP_API_URL}/bar`, {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});

const waiterSocket = io(`${process.env.REACT_APP_API_URL}/waiter`, {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});

const AppContextProvider = ({ children }) => {
  axios.defaults.withCredentials = true;

  const apiUrl = process.env.REACT_APP_API_URL;
  const clientUrl = process.env.REACT_APP_URL;

  const handleGetTokenAndConfig = async () => {
    await verifyToken();
    const token = localStorage.getItem("token_e");
    if (!token) {
      return null;
    }
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
    return config;
  };

  const [isRefresh, setIsRefresh] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Reataurant data //
  const [brandInfo, setbrandInfo] = useState({});

  const getRestaurant = async () => {
    try {
      const config = await handleGetTokenAndConfig(); // Get the token and config
      const response = await axios.get(`${apiUrl}/api/restaurant/`, config);
      if (response.status === 200 && response.data.length > 0) {
        const brandInfo = response.data[0];

        const currentDate = new Date();
        const subscriptionEndDate = new Date(brandInfo.subscriptionEnd);

        if (currentDate > subscriptionEndDate) {
          toast.error(
            "انتهت صلاحية الاشتراك. يرجى تجديد الاشتراك للاستمرار في استخدام النظام.",
            {
              position: toast.POSITION.TOP_CENTER,
              autoClose: false,
              className: "big-toast",
            }
          );
          // throw new Error('Subscription has ended.');
        }
        setbrandInfo(brandInfo);
        // toast.success('تم جلب بيانات المطعم بنجاح!');
      } else {
        toast.error("لم يتم العثور على بيانات المطعم..");
        throw new Error("لم يتم العثور على بيانات المطعم.");
      }
    } catch (error) {
      console.error("Error fetching restaurant data:", error);
      toast.error("حدث خطأ أثناء جلب بيانات المطعم.");
    }
  };

  //++++++++++++++++++++ pagination ++++++++++

  const [startPagination, setStartPagination] = useState(0);
  const [endPagination, setEndPagination] = useState(5);

  // const [pagination, setpagination] = useState(5)
  const EditPagination = (e) => {
    if (e.target.innerHTML === "التالي") {
      setStartPagination(startPagination + 5);
      setEndPagination(endPagination + 5);
    } else if (e.target.innerHTML === "السابق") {
      if (endPagination <= 5) {
        setStartPagination(0);
        setEndPagination(5);
      } else {
        setStartPagination(startPagination - 5);
        setEndPagination(endPagination - 5);
      }
    } else {
      setStartPagination(e.target.innerHTML * 5 - 5);
      setEndPagination(e.target.innerHTML * 5);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
    // return `${day}/${month}/${year}`;
  };

  const formatTime = (timeString) => {
    const time = new Date(timeString);
    let hours = time.getHours();
    const minutes = time.getMinutes();
    const ampm = hours >= 12 ? "م" : "ص";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const formattedTime = `${hours}:${
      minutes < 10 ? "0" + minutes : minutes
    } ${ampm}`;
    return formattedTime;
  };
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    // Get the hour and minutes
    let hours = date.getHours();
    let minutes = date.getMinutes();

    // Convert the hour to 12-hour format
    const ampm = hours >= 12 ? "م" : "ص";
    hours = hours % 12;
    hours = hours ? hours : 12; // 12-hour format 12 denotes noon

    // Add leading zero to hours and minutes if less than 10
    hours = hours < 10 ? "0" + hours : hours;
    minutes = minutes < 10 ? "0" + minutes : minutes;

    // Format the time
    const formattedTime = hours + ":" + minutes + " " + ampm;

    // Format the date
    const formattedDate = formatDate(date);

    return formattedDate + " " + formattedTime;
  };

  const filterByTime = (timeRange, array) => {
    let filtered = [];

    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // console.log({
    //   now,
    //   startOfToday,
    //   startOfWeek,
    //   startOfMonth,
    //   startOfYear,
    //   day: new Date().getDay(),
    //   date: new Date().getDate(),
    //   month: new Date().getMonth(),
    //   year: new Date().getFullYear(),
    // });

    switch (timeRange) {
      case "today":
        filtered = array.filter(
          (item) => new Date(item.createdAt) >= startOfToday
        );
        break;
      case "week":
        filtered = array.filter(
          (item) => new Date(item.createdAt) >= startOfWeek
        );
        break;
      case "month":
        filtered = array.filter(
          (item) => new Date(item.createdAt) >= startOfMonth
        );
        break;
      case "year":
        filtered = array.filter(
          (item) => new Date(item.createdAt) >= startOfYear
        );
        break;
      default:
        filtered = array;
    }

    return filtered;
  };

  const [StartDate, setStartDate] = useState(new Date());
  const [EndDate, setEndDate] = useState(new Date());

  const filterByDateRange = (array) => {
    const start = new Date(StartDate);
    const end = new Date(EndDate);

    const filtered = array.filter((item) => {
      const createdAt = new Date(item.createdAt);
      return createdAt >= start && createdAt <= end;
    });

    return filtered;
  };

  //+++++++++++++++++ product ++++++++++++++++++++
  const [allProducts, setAllProducts] = useState([]);
  const [productsOffer, setProductsOffer] = useState([]);
  const [sizesOffer, setSizesOffer] = useState([]);

  const getAllProducts = async () => {
    try {
      // Fetch products from the API
      const response = await axios.get(apiUrl + "/api/product");

      // Check if response is successful
      if (response.status !== 200) {
        throw new Error("Failed to fetch products.");
      }

      const productsList = response.data;

      if (permissionsList) {
        // Set fetched products in the state
        setAllProducts(productsList);

        // Filter products with discount
        const proOffer =
          productsList && productsList.filter((pro) => pro.discount > 0);
        setProductsOffer(proOffer);

        // Filter products that have sizes with discount
        const sizOffer = [];
        productsList.forEach((pro) => {
          if (pro.hasSizes) {
            pro.sizes.forEach((size) => {
              if (size.sizeDiscount > 0) {
                sizOffer.push(size);
              }
            });
          }
        });
        setSizesOffer(sizOffer);
      }
    } catch (error) {
      // Handle errors
      console.error("Error fetching products:", error);
      // Additional error handling logic can be added here, such as displaying an error message to the user.
    }
  };

  //+++++++ menu category +++++++++++
  const [allMenuCategories, setAllMenuCategories] = useState([]);
  const getAllMenuCategories = async () => {
    try {
      const config = await handleGetTokenAndConfig();
      // Fetch all categories from the API
      const response = await axios.get(apiUrl + "/api/menucategory", config);

      // Check if response is successful
      if (response.status !== 200) {
        throw new Error("Failed to fetch categories.");
      }
      const allMenuCategories = response.data;
      const activeMenuCategories =
        allMenuCategories &&
        allMenuCategories.filter(
          (menuCategory) => menuCategory.status === true
        );
      // Set fetched categories in the state

      setAllMenuCategories(activeMenuCategories);

      const mainCategory =
        activeMenuCategories &&
        activeMenuCategories.filter(
          (menuCategory) => menuCategory.isMain === true
        )[0];
      if (mainCategory) {
        setMenuCategoryId(mainCategory._id);
      }
    } catch (error) {
      // Handle errors
      console.error("Error fetching categories:", error);
      // You can add additional error handling logic here, such as displaying an error message to the user.
    }
  };

  // ++++++++++ order ++++++++++++
  const [allOrders, setAllOrders] = useState([]);
  const getAllOrders = async () => {
    try {
      const config = await handleGetTokenAndConfig();
      // Fetch all orders from the API
      const response = await axios.get(apiUrl + "/api/order", config);

      // Check if response is successful
      if (response.status !== 200) {
        throw new Error("Failed to fetch orders.");
      }

      // Set fetched orders in the state
      setAllOrders(response.data.reverse());
    } catch (error) {
      // Handle errors
      console.error("Error fetching orders:", error.message);
      // You can add additional error handling logic here, such as displaying an error message to the user.
    }
  };

  //+++++++++++ table ++++++++++++++
  const [allTable, setAllTable] = useState([]);

  const getAllTable = async () => {
    try {
      const response = await axios.get(apiUrl + "/api/table");

      if (response.status === 200) {
        const tables = response.data.allTables || [];

        if (tables.length === 0) {
          toast.warn(
            "No tables found. The restaurant may be new or data is missing."
          );
        }

        setAllTable(tables);
      } else {
        console.error("Unexpected response status:", response.status);
      }
    } catch (error) {
      console.error(
        "Error getting all tables:",
        error?.response?.data?.message || error.message
      );
    }
  };

  // +++++++++++++++ user +++++++++++++
  const [allUsers, setAllUsers] = useState([]);
  const getAllUsers = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/user`);
      if (response.status === 200) {
        setAllUsers(response.data);
      } else {
        console.error(
          "Failed to fetch users data: Unexpected response status",
          response.status
        );
      }
    } catch (error) {
      console.error("Error fetching users data:", error);
    }
  };

  const [allEmployees, setAllEmployees] = useState([]);
  const getAllEmployees = async () => {
    try {
      const config = await handleGetTokenAndConfig();
      const response = await axios.get(`${apiUrl}/api/employee`, config);

      if (response.status === 200) {
        setAllEmployees(response.data);
      } else {
        console.error(
          "Failed to fetch employees data: Unexpected response status",
          response.status
        );
        // يمكنك إطلاق استثناء هنا أو عرض رسالة خطأ للمستخدم
      }
    } catch (error) {
      console.error("Error fetching employees data:", error);
      // يمكنك إطلاق استثناء هنا أو عرض رسالة خطأ للمستخدم
    }
  };

  // ++++++++ client screen +++++++++++++
  const [menuCategoryId, setMenuCategoryId] = useState("");

  const filterByMenuCategoryId = (e) => {
    //
    setMenuCategoryId(e.target.value);
  };

  const [count, setCount] = useState(0);

  const incrementProductQuantity = (productId, sizeId) => {
    try {
      // incrementProductQuantity the count state
      setCount(count + 1);

      // Find the product either in the order or in all products
      const findProduct =
        productOrderToUpdate.length > 0
          ? productOrderToUpdate.find((product) => product._id === productId)
          : allProducts.find((product) => product._id === productId);

      if (!findProduct) {
        throw new Error("Product not found.");
      }

      if (findProduct.hasSizes) {
        findProduct.sizes.map((size) => {
          if (size._id === sizeId) {
            // incrementProductQuantity the quantity of the found product
            size.sizeQuantity += 1;
          }
        });
        itemsInCart.map((item) => {
          if (item.productId === productId && item.sizeId === sizeId) {
            item.quantity += 1;
          }
        });
      } else if (!findProduct.hasSizes) {
        // incrementProductQuantity the quantity of the found product
        findProduct.quantity += 1;
        itemsInCart.map((item) => {
          if (item.productId === productId) {
            item.quantity += 1;
          }
        });
      }
    } catch (error) {
      console.error("Error incrementing product quantity:", error.message);
      // You can handle the error appropriately, such as displaying an error message to the user.
    }
  };

  const decrementProductQuantity = (productId, sizeId) => {
    try {
      // Decrement the count state
      setCount(count - 1);

      // Find the product either in the order or in all products
      const findProduct =
        productOrderToUpdate.length > 0
          ? productOrderToUpdate.find((product) => product._id === productId)
          : allProducts.find((product) => product._id === productId);

      if (!findProduct) {
        throw new Error("Product not found.");
      }

      if (findProduct.hasSizes) {
        findProduct.sizes.map((size) => {
          if (size._id === sizeId) {
            // incrementProductQuantity the quantity of the found product
            if (size.sizeQuantity < 2) {
              size.sizeQuantity = 0;
              findProduct.notes = "";
              deleteItemFromCart(productId, sizeId);
            } else {
              size.sizeQuantity -= 1;
            }
          }
        });
        itemsInCart.map((item) => {
          if (item.productId === productId && item.sizeId === sizeId) {
            // incrementProductQuantity the quantity of the found product
            if (item.quantity < 2) {
              item.quantity = 0;
              findProduct.notes = "";
              deleteItemFromCart(productId, sizeId);
            } else {
              item.quantity -= 1;
            }
          }
        });
      } else if (!findProduct.hasSizes) {
        // incrementProductQuantity the quantity of the found product
        if (findProduct.quantity < 2) {
          findProduct.quantity = 0;
          findProduct.notes = "";
          deleteItemFromCart(productId);
        } else {
          findProduct.quantity -= 1;
          itemsInCart.map((item) => {
            if (item.productId === productId) {
              item.quantity -= 1;
            }
          });
        }
      }
    } catch (error) {
      console.error("Error decrementing product quantity:", error.message);
    }
  };

  const [productNote, setproductNote] = useState("");

  const addNoteToProduct = (e, productId, sizeId) => {
    try {
      e.preventDefault();

      // Find the product either in the order or in all products
      const findProduct =
        productOrderToUpdate.length > 0
          ? productOrderToUpdate.find((product) => product._id === productId)
          : allProducts.find((product) => product._id === productId);

      if (!findProduct) {
        throw new Error("Product not found.");
      }

      if (sizeId) {
        findProduct.sizes.map((size) => {
          if (size._id === sizeId) {
            // incrementProductQuantity the quantity of the found product
            size.notes = productNote;
          }
        });
        itemsInCart.map((item) => {
          if (item.productId === productId && item.sizeId === sizeId) {
            item.notes = productNote;
          }
        });
      } else {
        // incrementProductQuantity the quantity of the found product
        findProduct.notes = productNote;
        itemsInCart.map((item) => {
          if (item.productId === productId) {
            item.notes = productNote;
          }
        });
      }
    } catch (error) {
      console.error("Error incrementing product quantity:", error.message);
      // You can handle the error appropriately, such as displaying an error message to the user.
    }
  };

  const [productExtras, setproductExtras] = useState([]);

  const handleAddProductExtras = (extra, ind) => {
    //
    const newExtras = [...productExtras];

    if (newExtras.length > 0) {
      if (newExtras[ind]) {
        const filteredExtraDetails = newExtras[ind].extraDetails.filter(
          (detail) => detail.extraId !== extra._id
        );
        if (
          filteredExtraDetails.length !== newExtras[ind].extraDetails.length
        ) {
          // إذا كانت الإضافة موجودة وتمت إزالتها
          newExtras[ind].extraDetails = filteredExtraDetails;
          newExtras[ind].totalExtrasPrice -= extra.price; // تخفيض السعر بسعر الإضافة المزيلة
        } else {
          // إذا لم تكن الإضافة موجودة، قم بإضافتها
          newExtras[ind].extraDetails.push({
            extraId: extra._id,
            name: extra.name,
            price: extra.price,
          });
          newExtras[ind].totalExtrasPrice += extra.price; // زيادة السعر بسعر الإضافة المضافة
        }
      } else {
        // إذا لم يكن هناك إضافات للمنتج بعد، قم بإنشاء إدخال جديد
        newExtras[ind] = {
          extraDetails: [
            {
              extraId: extra._id,
              name: extra.name,
              price: extra.price,
            },
          ],
          totalExtrasPrice: extra.price,
        };
      }
    } else {
      // إذا كانت المصفوفة فارغة بالكامل، قم بإنشاء إدخال جديد
      newExtras[ind] = {
        extraDetails: [
          {
            extraId: extra._id,
            name: extra.name,
            price: extra.price,
          },
        ],
        totalExtrasPrice: extra.price,
      };
    }

    calculateOrderCost();
    setproductExtras(newExtras);
  };

  const addExtrasToProduct = (e, productId, sizeId) => {
    e.preventDefault();

    if (productExtras.length < 1) {
      return;
    }
    try {
      // Find the product either in the order or in all products
      const findProduct =
        productOrderToUpdate.length > 0
          ? productOrderToUpdate.find((product) => product._id === productId)
          : allProducts.find((product) => product._id === productId);

      if (!findProduct) {
        throw new Error("Product not found.");
      }

      if (sizeId) {
        findProduct.sizes.map((size) => {
          if (size._id === sizeId) {
            // Update the extras for the found product size
            size.extrasSelected = productExtras;
          }
        });
        itemsInCart.map((item) => {
          if (item.productId === productId && item.sizeId === sizeId) {
            item.extras = productExtras;
          }
        });
      } else {
        // Update the extras for the found product
        findProduct.extrasSelected = productExtras;
        itemsInCart.map((item) => {
          if (item.productId === productId) {
            item.extras = productExtras;
            // item.extrasSelected = productExtras;
          }
        });
      }

      calculateOrderCost();
      setproductExtras([]);
    } catch (error) {
      console.error("Error updating product extras:", error.message);
      // You can handle the error appropriately, such as displaying an error message to the user.
    }
  };

  const [itemId, setitemId] = useState([]);
  const [itemsInCart, setitemsInCart] = useState([]);

  const addItemToCart = (productId, sizeId) => {
    try {
      // setIsLoading(true)
      // Find the product to add to the cart
      const cartItem = allProducts.find((item) => item._id === productId);

      if (cartItem) {
        let newItem = {
          productId: cartItem._id,
          name: cartItem.name,
          quantity: 0,
          notes: "",
          price: 0,
          priceAfterDiscount: 0,
          hasExtras: cartItem.hasExtras,
          image: cartItem.image,
        };

        if (sizeId && cartItem.sizes && cartItem.sizes.length > 0) {
          const size = cartItem.sizes.find((size) => size._id === sizeId);

          if (size) {
            newItem.sizeId = size._id;
            newItem.size = size.sizeName;
            newItem.price = size.sizePrice;
            newItem.quantity = size.sizeQuantity;
            newItem.priceAfterDiscount = size.sizePriceAfterDiscount;
            newItem.notes = size.notes ? size.notes : "";
            newItem.extras = size.extrasSelected ? size.extrasSelected : [];
          }
        } else {
          newItem.quantity = cartItem.quantity; // Set default quantity for products without sizes
          newItem.price = cartItem.price;
          newItem.priceAfterDiscount = cartItem.priceAfterDiscount;
          newItem.notes = cartItem.notes ? cartItem.notes : "";
          newItem.extras = cartItem.extrasSelected
            ? cartItem.extrasSelected
            : [];
        }

        if (itemsInCart.length > 0) {
          if (sizeId) {
            const repeatedItem = itemsInCart.find(
              (item) => item.productId === productId && item.sizeId === sizeId
            );
            if (!repeatedItem) {
              setitemsInCart([...itemsInCart, newItem]);
              setitemId([...itemId, sizeId]);
            }
          } else {
            const repeatedItem = itemsInCart.find(
              (item) => item.productId === productId
            );
            if (!repeatedItem) {
              setitemsInCart([...itemsInCart, newItem]);
              setitemId([...itemId, productId]);
            }
          }
        } else {
          setitemsInCart([newItem]);
          setitemId([sizeId ? sizeId : productId]);
        }
      }
      //
    } catch (error) {
      console.error("Error adding item to cart:", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // delete item from cart by id

  const resetProductQuantityAndNotes = (productId, sizeId) => {
    try {
      // Find the product either in the order or in all products
      const productToUpdate =
        productOrderToUpdate.length > 0
          ? productOrderToUpdate.find((product) => product._id === productId)
          : allProducts.find((product) => product._id === productId);

      if (!productToUpdate) {
        throw new Error("Product not found.");
      }

      if (productToUpdate.hasSizes) {
        productToUpdate.sizes.filter(
          (size) => size._id === sizeId
        )[0].sizeQuantity = 0;
        productToUpdate.sizes.filter(
          (size) => size._id === sizeId
        )[0].extrasSelected = [];
        productToUpdate.sizes.filter((size) => size._id === sizeId)[0].notes =
          "";
      } else {
        // Reset the quantity and notes of the found product to zero
        productToUpdate.quantity = 0;
        productToUpdate.extrasSelected = [];
        productToUpdate.notes = "";
      }
      //
    } catch (error) {
      console.error(
        "Error resetting product quantity and notes:",
        error.message
      );
      // You can handle the error appropriately, such as displaying an error message to the user.
    }
  };

  const deleteItemFromCart = (id, sizeId) => {
    try {
      if (sizeId) {
        // Determine which list to operate on based on the presence of items in productOrderToUpdate
        const updatedList =
          productOrderToUpdate.length > 0
            ? productOrderToUpdate.filter(
                (product) => product.sizeId !== sizeId
              )
            : itemsInCart.filter((item) => item.sizeId !== sizeId);

        // Update the list of item IDs
        const updatedItemId = itemId.filter((itemId) => itemId !== sizeId);
        if (updatedList.length === 0) {
          getAllProducts();
          // return
        }
        //
        // Update the state based on the list being modified
        if (productOrderToUpdate.length > 0) {
          setproductOrderToUpdate(updatedList);
        } else {
          setitemsInCart(updatedList);
          setitemId(updatedItemId);
        }

        // Reset the quantity and notes of the deleted item
        resetProductQuantityAndNotes(id, sizeId);
      } else {
        // Determine which list to operate on based on the presence of items in productOrderToUpdate
        const updatedList =
          productOrderToUpdate.length > 0
            ? productOrderToUpdate.filter((product) => product.productId !== id)
            : itemsInCart.filter((item) => item.productId !== id);

        // Update the list of item IDs
        const updatedItemId = itemId.filter((itemId) => itemId !== id);
        if (updatedList.length === 0) {
          getAllProducts();
          // return
        }

        // Update the state based on the list being modified
        if (productOrderToUpdate.length > 0) {
          setproductOrderToUpdate(updatedList);
        } else {
          setitemsInCart(updatedList);
          setitemId(updatedItemId);
        }

        // Reset the quantity and notes of the deleted item
        resetProductQuantityAndNotes(id, sizeId);
      }
    } catch (error) {
      console.error("Error deleting item:", error.message);
      // You can handle the error appropriately, such as displaying an error message to the user.
    }
  };

  // Calculate costOrder of cart item
  const [costOrder, setcostOrder] = useState(0);
  const calculateOrderCost = () => {
    try {
      let totalCost = 0;

      // Determine which list to operate on based on the presence of items in itemsInCart or productOrderToUpdate
      const itemsList =
        itemsInCart.length > 0 ? itemsInCart : productOrderToUpdate;

      // Calculate total cost based on the items in the list
      itemsList.forEach((item) => {
        let totalExtras = 0; // Reset totalExtras for each item
        const itemTotalPrice =
          item.priceAfterDiscount > 0
            ? item.priceAfterDiscount * item.quantity
            : item.price * item.quantity;

        if (item.extras.length > 0) {
          item.extras.forEach((extra) => {
            if (extra) {
              totalExtras += extra.totalExtrasPrice;
            }
          });
        }

        item.totalprice = itemTotalPrice + totalExtras;
        totalCost += item.totalprice;
        totalExtras = 0;
      });

      // Update the state with the total cost
      setcostOrder(totalCost);
    } catch (error) {
      console.error("Error calculating order cost:", error.message);
      // You can handle the error appropriately, such as displaying an error message to the user.
    }
  };

  const createSerial = () => {
    const serial =
      allOrders && allOrders.length > 0
        ? String(Number(allOrders[0].serial) + 1).padStart(6, "0")
        : "000001";
    return serial;
  };

  const createDeliveryOrderByClient = async (
    userId,
    currentAddress,
    delivery_fee
  ) => {
    try {
      setIsLoading(true);
      const config = await handleGetTokenAndConfig();
      //
      // Find the user's orders
      const userOrders =
        allOrders &&
        allOrders.filter((order) => order.user && order.user?._id === userId);
      const lastUserOrder = userOrders.length > 0 ? userOrders[0] : null;

      // Check if the last user order is active
      if (lastUserOrder && lastUserOrder.isActive) {
        const orderId = lastUserOrder._id;
        const oldProducts = lastUserOrder.products;
        const oldSubTotal = lastUserOrder.subTotal;
        const newsalesTaxt = lastUserOrder.salesTax + salesTax;
        const subTotal = costOrder + oldSubTotal;
        const deliveryFee = delivery_fee;
        const total = subTotal + salesTax + deliveryFee;

        // Update order if it's in 'Preparing' status
        if (lastUserOrder.status === "Preparing") {
          const updatedProducts = itemsInCart.map((item) => ({
            ...item,
            isAdd: true,
          }));
          const products = [...updatedProducts, ...oldProducts];
          const status = "Pending";
          const orderType = "Delivery";

          await axios.put(
            `${apiUrl}/api/order/${orderId}`,
            {
              products,
              subTotal,
              deliveryFee,
              salesTaxt: newsalesTaxt,
              total,
              status,
              orderType,
            },
            config
          );

          setitemsInCart([]);
          setitemId([]);
          getAllProducts();
          cashierSocket.emit(
            "neworder",
            `اضافه طلبات الي اوردر ديليفري ${lastUserOrder.serial}`
          );

          toast.success("تم اضافه الاصناف الي الاوردر!");
        } else {
          const products = [...itemsInCart, ...oldProducts];
          const status = "Pending";
          const orderType = "Delivery";

          await axios.put(
            `${apiUrl}/api/order/${orderId}`,
            {
              products,
              subTotal,
              deliveryFee,
              salesTaxt: newsalesTaxt,
              total,
              status,
              orderType,
            },
            config
          );

          setitemsInCart([]);
          getAllProducts();
          cashierSocket.emit("neworder", "تم تعديل ارودر ديفرري");
          toast.success("تم تعديل الاوردر بنجاح!");
        }

        setIsLoading(false);
      } else {
        // Create a new order
        const serial = createSerial();
        const findUser = allUsers.find((u, i) => u._id === userId);
        const user = findUser ? userId : null;
        const products = [...itemsInCart];
        const subTotal = costOrder;
        const deliveryFee = delivery_fee;
        const name = findUser ? findUser.username : "";
        const phone = findUser ? findUser.phone : "";
        const address = currentAddress;
        const orderType = "Delivery";
        const total = subTotal + deliveryFee + salesTax;

        await axios.post(
          `${apiUrl}/api/order`,
          {
            serial,
            products,
            subTotal,
            salesTax,
            deliveryFee,
            total,
            user,
            name,
            address,
            phone,
            orderType,
          },
          config
        );

        setitemsInCart([]);
        setitemId([]);
        getAllProducts();
        toast.success("تم عمل اوردر جديد بنجاح!");
        cashierSocket.emit("neworder", "اوردر ديليفري جديد");
        setIsLoading(false);
      }

      setitemsInCart([]);
      setitemId([]);
      setIsLoading(false);
    } catch (error) {
      console.error("An error occurred while processing the order:", error);
      toast.error("حدث خطأ اثناء عمل الاوردر رجاء المحاوله مره اخري");
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  const createOrderForTableByClient = async (tableId) => {
    setIsLoading(true);
    try {
      // Find orders for the specified table
      const tableOrders =
        allOrders && allOrders.filter((order) => order.table?._id === tableId);
      const lastTableOrder = tableOrders.length > 0 ? tableOrders[0] : {};
      const lastTableOrderActive = lastTableOrder && lastTableOrder.isActive;

      if (lastTableOrderActive) {
        const orderId = lastTableOrder._id;
        const oldProducts = lastTableOrder.products;

        const oldSubTotal = lastTableOrder.subTotal;
        const newAddition = lastTableOrder.addition + addition;
        const newDiscount = lastTableOrder.discount + discount;
        const newsalesTaxt = lastTableOrder.salesTax + salesTax;
        const newserviceTax = lastTableOrder.serviceTax + serviceTax;
        const oldTotal = lastTableOrder.total;
        const status = lastTableOrder.status;
        const subTotal = costOrder + oldSubTotal;
        const total =
          oldTotal + costOrder + salesTax + serviceTax + addition - discount;

        // Update the existing order
        if (status === "Preparing") {
          const updatedProducts = itemsInCart.map((item) => ({
            ...item,
            isAdd: true,
          }));
          const products = [...updatedProducts, ...oldProducts];
          const newOrderData = {
            products,
            subTotal,
            addition: newAddition,
            discount: newDiscount,
            salesTax: newsalesTaxt,
            serviceTax: newserviceTax,
            total,
            status,
          };

          await axios.put(`${apiUrl}/api/order/${orderId}`, newOrderData);
          // Toast for updating order
          toast.success("تم تحديث الطلب بنجاح!");
          cashierSocket.emit(
            "neworder",
            ` اضافت طاولة${lastTableOrderActive.tableNumber} طلبات جديدة`
          );
        } else {
          const products = [...itemsInCart, ...oldProducts];
          const newOrderData = {
            products,
            subTotal,
            addition: newAddition,
            discount: newDiscount,
            salesTax: newsalesTaxt,
            serviceTax: newserviceTax,
            total,
            status: "Pending",
          };

          await axios.put(`${apiUrl}/api/order/${orderId}`, newOrderData);
          // Toast for updating order
          cashierSocket.emit(
            "neworder",
            ` اضافت طاولة${lastTableOrderActive.tableNumber} طلبات جديدة`
          );

          toast.success("تم تحديث الطلب بنجاح!");
        }
      } else {
        // Create a new order
        const serial = createSerial();
        const table = allTable.find((t) => t._id === tableId) ? tableId : null;
        const user = allUsers.find((u) => u._id === tableId) ? tableId : null;
        const products = [...itemsInCart];
        const subTotal = costOrder;
        const total = subTotal + salesTax + serviceTax;
        const orderType = "Dine-in";

        const newOrderData = {
          serial,
          products,
          subTotal,
          salesTax,
          serviceTax,
          total,
          table,
          user,
          orderType,
        };

        await axios.post(`${apiUrl}/api/order`, newOrderData);
        // Toast for creating a new order
        toast.success("تم إنشاء طلب جديد بنجاح!");
        cashierSocket.emit(
          "neworder",
          `اوردر جديد علي طاوله ${table.tableNumber}`
        );
      }

      // Reset cart items and reload products
      setitemsInCart([]);
      setitemId([]);
      getAllProducts();
    } catch (error) {
      console.error(error);
      // Toast for error
      toast.error("حدث خطأ أثناء إنشاء/تحديث الطلب");
    } finally {
      setIsLoading(false);
    }
  };

  const [myOrder, setmyOrder] = useState({});
  const [listProductsOrder, setlistProductsOrder] = useState([]);
  const [orderUpdateDate, setorderUpdateDate] = useState("");
  const [myOrderId, setmyOrderId] = useState();
  const [tablenum, settablenum] = useState();
  const [orderTotal, setorderTotal] = useState();
  const [orderSubtotal, setorderSubtotal] = useState();
  const [orderdeliveryFee, setorderdeliveryFee] = useState();
  const [orderdiscount, setorderdiscount] = useState(0);
  const [orderaddition, setorderaddition] = useState(0);
  const [discount, setdiscount] = useState(0);
  const [addition, setaddition] = useState(0);

  const [clientname, setclientname] = useState("");
  const [clientNotes, setclientNotes] = useState("");
  const [clientphone, setclientphone] = useState("");
  const [clientaddress, setclientaddress] = useState("");
  const [deliveryAreaId, setdeliveryAreaId] = useState(0);
  const [deliveryFee, setdeliveryFee] = useState(0);

  const [salesTax, setsalesTax] = useState(0);
  const [serviceTax, setserviceTax] = useState(0);

  const createWaiterOrderForTable = async (tableId, waiterId) => {
    setIsLoading(true);
    try {
      const config = await handleGetTokenAndConfig();
      // Check for active orders for the table
      const tableOrder =
        allOrders &&
        allOrders.filter((order) => order.table && order.table._id === tableId);
      const lastTableOrder = tableOrder.length > 0 ? tableOrder[0] : null;
      const lastTableOrderActive = lastTableOrder
        ? lastTableOrder.isActive
        : false;

      if (lastTableOrderActive) {
        // Update the existing order
        const orderId = lastTableOrder._id;
        const orderData =
          allOrders && allOrders.find((order) => order._id === orderId);
        const oldProducts = orderData.products;
        const oldSubTotal = orderData.subTotal;
        const oldTotal = orderData.total;
        const newAddition = orderData.addition + addition;
        const newDiscount = orderData.discount + discount;
        const newsalesTaxt = orderData.salesTax + salesTax;
        const newserviceTax = orderData.serviceTax + serviceTax;
        const products = [...itemsInCart, ...oldProducts];
        const subTotal = oldSubTotal + costOrder;
        const total =
          oldTotal + costOrder + salesTax + serviceTax + addition - discount;
        const status = "Pending";
        const createdBy = waiterId;

        const updatedOrder = await axios.put(
          `${apiUrl}/api/order/${orderId}`,
          {
            products,
            subTotal,
            addition: newAddition,
            discount: newDiscount,
            salesTax: newsalesTaxt,
            serviceTax: newserviceTax,
            total,
            status,
            createdBy,
          },
          config
        );
        toast.success("تم تحديث الطلب بنجاح!");
        cashierSocket.emit("neworder", "اوردر جديد من الويتر");
        setitemsInCart([]);
        setitemId([]);
        setaddition(0);
        setdiscount(0);
        setclientname("");
        setclientNotes("");
        setclientphone("");
        setclientaddress("");
        setdeliveryAreaId(0);
        setdeliveryFee(0);
        setsalesTax(0);
        setserviceTax(0);
      } else {
        // Create a new order
        const serial = createSerial();
        const products = [...itemsInCart];
        const subTotal = costOrder;
        const total = subTotal + salesTax + serviceTax + addition - discount;
        const orderType = "Dine-in";

        const newOrder = await axios.post(
          `${apiUrl}/api/order`,
          {
            serial,
            table: tableId,
            products,
            subTotal,
            discount,
            addition,
            salesTax,
            serviceTax,
            total,
            orderType,
            createdBy: waiterId,
          },
          config
        );

        toast.success("تم إنشاء طلب جديد بنجاح!");
        cashierSocket.emit("neworder", "اوردر جديد من الويتر");
        setitemsInCart([]);
        setitemId([]);
        setaddition(0);
        setdiscount(0);
        setclientname("");
        setclientNotes("");
        setclientphone("");
        setclientaddress("");
        setdeliveryAreaId(0);
        setdeliveryFee(0);
        setsalesTax(0);
        setserviceTax(0);
      }
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsLoading(false);
    }
  };

  const createcashierOrder = async (
    cashierId,
    clientName,
    clientPhone,
    clientAddress,
    orderType,
    deliveryFee,
    discount,
    addition
  ) => {
    // setIsLoading(true)
    try {
      const config = await handleGetTokenAndConfig();

      const dayOrders =
        allOrders &&
        allOrders.filter(
          (order) =>
            new Date(order.createdAt).toDateString() ===
            new Date().toDateString()
        );
      const takeawayOrders =
        dayOrders &&
        dayOrders.filter((order) => order.orderType === "Takeaway");
      const orderNum =
        orderType === "Takeaway"
          ? takeawayOrders.length === 0
            ? 1
            : takeawayOrders[0].orderNum + 1
          : null;

      const serial = createSerial();

      const products = [...itemsInCart];

      const subTotal = costOrder;

      const total =
        subTotal + salesTax + serviceTax + deliveryFee + addition - discount;

      const name = clientName;
      const phone = clientPhone;
      const address = clientAddress;
      const createdBy = cashierId;
      const cashier = cashierId;
      const status = "Approved";

      const newOrder = await axios.post(
        `${apiUrl}/api/order`,
        {
          serial,
          orderNum,
          products,
          subTotal,
          deliveryFee,
          salesTax,
          serviceTax,
          discount,
          addition,
          total,
          orderType,
          createdBy,
          cashier,
          name,
          phone,
          address,
          status,
        },
        config
      );

      if (newOrder) {
        toast.success("تم إنشاء الطلب بنجاح");
        setitemsInCart([]);
        setitemId([]);
        setaddition(0);
        setdiscount(0);
        setclientname("");
        setclientNotes("");
        setclientphone("");
        setclientaddress("");
        setdeliveryAreaId(0);
        setdeliveryFee(0);
        setsalesTax(0);
        setserviceTax(0);
        cashierSocket.emit("orderkitchen", "استلام اوردر ديليفري جديد");
      } else {
        throw new Error("هناك خطأ في إنشاء الطلب");
      }
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ. يرجى المحاولة مرة أخرى");
    } finally {
      setIsLoading(false);
    }
  };

  const invoice = async (clientId) => {
    if (!clientId) {
      toast.error("يرجى تسجيل الدخول أو مسح رمز الاستجابة السريعة");
      return;
    }

    try {
      // Log client ID for debugging

      // Filter orders related to the client's table
      const tableOrder =
        allOrders &&
        allOrders.filter(
          (order) => order.table && order.table._id === clientId
        );
      const lastTableOrder = tableOrder.length > 0 ? tableOrder[0] : null;
      const lastTableOrderActive = lastTableOrder
        ? lastTableOrder.isActive
        : false;

      // Filter orders related to the user
      const userOrder =
        allOrders &&
        allOrders.filter((order) => order.user && order.user._id === clientId);
      const lastUserOrder = userOrder.length > 0 ? userOrder[0] : null;
      const lastUserOrderActive = lastUserOrder
        ? lastUserOrder.isActive
        : false;

      // Fetch and set order details based on the active order found
      if (lastTableOrderActive) {
        const orderId = lastTableOrder._id;
        const myOrder = await axios.get(`${apiUrl}/api/order/${orderId}`);
        const data = myOrder.data;

        // Update state with the order details
        settablenum(data.tableNumber);
        setmyOrder(data);
        setmyOrderId(data._id);
        setlistProductsOrder(data.products);
        setorderUpdateDate(data.updatedAt);
        setorderTotal(data.total);
        setorderSubtotal(data.subTotal);
        setitemsInCart([]);
      } else if (lastUserOrderActive) {
        const orderId = lastUserOrder._id;
        const myOrder = await axios.get(`${apiUrl}/api/order/${orderId}`);
        const data = myOrder.data;

        // Update state with the order details
        setmyOrder(data);
        setmyOrderId(data._id);
        setlistProductsOrder(data.products);
        setorderUpdateDate(data.updatedAt);
        setorderTotal(data.total);
        setorderSubtotal(data.subTotal);
        setorderdeliveryFee(data.deliveryFee);
        setitemsInCart([]);
      } else {
        toast.info("لا توجد طلبات نشطة لهذا العميل");
      }
    } catch (error) {
      console.error("Error fetching the invoice:", error);
      toast.error("حدث خطأ أثناء جلب الفاتورة");
    }
  };

  const checkout = async () => {
    try {
      const id = myOrderId;
      const isActive = false;
      const help = "Requesting the bill";
      const helpStatus = "Not send";

      // Update order to mark it for checkout
      const updatedOrder = await axios.put(`${apiUrl}/api/order/${id}`, {
        isActive,
        help,
        helpStatus,
      });
      if (updatedOrder) {
        // Show success toast after successfully marking order for checkout
        toast.success("تم طلب الحساب");
        cashierSocket.emit("helprequest", `  طاولة${tablenum} تطلب الحساب`);

        // Redirect after 10 minutes
        setTimeout(() => {
          window.location.href = `https://${window.location.hostname}`;
        }, 60000 * 10);
      }
    } catch (error) {
      // Show error toast if there's an issue with marking the order for checkout
      toast.error("حدث خطأ اثناء طلب الحساب ! حاول مره اخري");
    }
  };

  const [newlistofproductorder, setnewlistofproductorder] = useState([]);
  const getOrderProductForTable = async (e, tableId) => {
    e.preventDefault();
    const config = await handleGetTokenAndConfig();

    // setIsLoading(true)
    try {
      const tableorder =
        allOrders &&
        allOrders.filter(
          (order, i) => order.table && order.table._id === tableId
        );
      const lasttableorder =
        tableorder.length > 0 ? tableorder[tableorder.length - 1] : [];
      const lasttableorderactive = lasttableorder.isActive;
      //
      //
      if (lasttableorderactive) {
        const id = await lasttableorder._id;
        const myOrder = await axios.get(apiUrl + "/api/order/" + id);
        const data = myOrder.data;
        //
        //
        //
        setmyOrder(data);
        setmyOrderId(data._id);
        setorderTotal(data.total);
        setorderaddition(data.addition);
        setorderdiscount(data.discount);
        setorderSubtotal(data.subTotal);
        setlistProductsOrder(data.products);
        setnewlistofproductorder(data.products);
        //
      }
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ أثناء جلب بيانات الطلب. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsLoading(false);
    }
  };

  const putNumOfPaid = (id, sizeid, numOfPaid) => {
    try {
      const updatedProducts = newlistofproductorder.map((product) => {
        if (
          (sizeid &&
            product.productId._id === id &&
            product.sizeId === sizeid) ||
          (!sizeid && product.productId._id === id && !product.sizeId)
        ) {
          const originalProduct = listProductsOrder.find(
            (pro) =>
              (sizeid && pro.productId._id === id && pro.sizeId === sizeid) ||
              (!sizeid && pro.productId._id === id && !pro.sizeId)
          );

          if (originalProduct) {
            return {
              ...product,
              numOfPaid: originalProduct.numOfPaid + numOfPaid,
            };
          }
        }
        return product;
      });

      setnewlistofproductorder(updatedProducts);

      calcSubtotalSplitOrder(updatedProducts);
    } catch (error) {
      console.error(error);
      toast.error(
        "An error occurred while updating the number of paid products."
      );
    }
  };

  const [subtotalSplitOrder, setsubtotalSplitOrder] = useState(0);

  const calcSubtotalSplitOrder = (products = newlistofproductorder) => {
    try {
      let total = 0;

      products.forEach((product) => {
        let originalProduct;

        if (product.sizeId) {
          originalProduct = listProductsOrder.find(
            (pro) =>
              pro.productId._id === product.productId._id &&
              pro.sizeId === product.sizeId
          );
        } else {
          originalProduct = listProductsOrder.find(
            (pro) => pro.productId._id === product.productId._id
          );
        }

        if (originalProduct) {
          const numOfPaidDifference = Math.abs(
            originalProduct.numOfPaid - product.numOfPaid
          );

          const priceToUse =
            originalProduct.priceAfterDiscount > 0
              ? originalProduct.priceAfterDiscount
              : originalProduct.price;
          const subTotal = numOfPaidDifference * priceToUse;

          total += subTotal;
        }
      });

      setsubtotalSplitOrder(total);
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ أثناء حساب المجموع للطلب المقسم.");
    }
  };

  const handlePayExtras = (productIndex, extraId, isPaid) => {
    const updatedProducts = newlistofproductorder.map((product, i) => {
      if (i === productIndex) {
        return {
          ...product,
          extras: product.extras.map((extra, j) => {
            if (extra) {
              if (extra._id === extraId) {
                isPaid
                  ? setsubtotalSplitOrder(
                      subtotalSplitOrder + extra.totalExtrasPrice
                    )
                  : setsubtotalSplitOrder(
                      subtotalSplitOrder - extra.totalExtrasPrice
                    );
                return {
                  ...extra,
                  isPaid: isPaid,
                };
              }
              return extra;
            }
          }),
        };
      }
      return product;
    });

    setnewlistofproductorder(updatedProducts);
    // calculateExtrasSubtotal(updatedProducts);
  };

  // Function to split the invoice and pay a portion of it
  const splitInvoice = async (e) => {
    try {
      e.preventDefault();

      // Send a PUT request to update the order with split details
      const updateOrder = await axios.put(`${apiUrl}/api/order/${myOrderId}`, {
        products: newlistofproductorder,
        isSplit: true,
        subtotalSplitOrder,
      });
      if (updateOrder) {
        // Display a success toast message upon successful payment
        toast.success("تم دفع جزء من الفاتورة بنجاح");

        // Log the updated order details
        //
      }
    } catch (error) {
      // Display an error toast message if payment fails
      toast.error("حدث خطأ أثناء دفع جزء من الفاتورة");

      // Log the error to the console
      console.error("Error updating order:", error);
    }
  };

  const lastInvoiceByCashier = async (checkId) => {
    try {
      // Filter orders created by the employee
      const employeeOrders =
        allOrders?.filter((order) => order.createdBy?._id === checkId) || [];

      // Get the last order created by the employee
      const lastEmployeeOrder =
        employeeOrders[employeeOrders.length - 1] || null;

      if (lastEmployeeOrder) {
        // Check if the last employee order is active
        const lastEmployeeOrderActive = await lastEmployeeOrder.isActive;

        if (lastEmployeeOrderActive) {
          // If the order is active, fetch its details
          const { _id: orderId } = lastEmployeeOrder;
          const response = await axios.get(`${apiUrl}/api/order/${orderId}`);
          const orderData = response.data;

          // Update states with order details
          setmyOrder(orderData);
          setmyOrderId(orderData._id);
          setlistProductsOrder(orderData.products);
          setorderUpdateDate(orderData.updatedAt);
          setorderTotal(orderData.total);
          setorderaddition(orderData.addition);
          setorderdiscount(orderData.discount);
          setorderSubtotal(orderData.subTotal);
          setorderdeliveryFee(orderData.deliveryFee);
          setitemsInCart([]);
        }
      } else {
        // Handle the case when there are no orders for the employee
        toast.info("No orders found for this employee.");
      }
    } catch (error) {
      // Log any errors that occur during the process
      console.error("Error fetching the last invoice:", error);

      // Display an error toast message
      toast.error("An error occurred while fetching the invoice.");
    }
  };

  //++++++++++++++++++++++++++ AUTH ++++++++++++++++++++++++++++
  //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

  const [isLogin, setisLogin] = useState(false);

  const [permissionsList, setPermissionsList] = useState([]);
  const [userLoginInfo, setUserLoginInfo] = useState(null);
  const [employeeLoginInfo, setEmployeeLoginInfo] = useState(null);
  const [clientInfo, setClientInfo] = useState({});

  const [isTokenValid, setIsTokenValid] = useState(true);

  // دالة خروج موحدة
  const handleLogout = () => {
    localStorage.removeItem("token_e");
    localStorage.removeItem("token_u");
    setIsTokenValid(false);

    if (window.location.pathname !== "/login") {
      window.location.replace("/login");
      return;
    }
  };

  const refreshToken = async () => {
    if (!isTokenValid) return;

    try {
      const response = await axios.post(
        `${apiUrl}/api/employee/refresh-token`,
        {},
        { withCredentials: true }
      );

      if (response && response.data.accessToken) {
        localStorage.setItem("token_e", response.data.accessToken);
        return response.data.accessToken;
      }
    } catch (error) {
      console.error("Error refreshing token:", error);
      toast.error("انتهت صلاحية الجلسة. الرجاء تسجيل الدخول مرة أخرى.");
      handleLogout();
      return null;
    }
  };

  const verifyToken = async () => {
    const employeeToken = localStorage.getItem("token_e");
    if (!employeeToken) {
      setIsTokenValid(false);
      return;
    } else {
      const decodedToken = jwt_decode(employeeToken);
      const currentTime = Date.now() / 1000;
      if (decodedToken.exp < currentTime) {
        await refreshToken();
      }
    }
  };

  // const getUserInfoFromToken = async () => {
  //   setIsLoading(true);
  //   if (window.location.pathname === "/admin") {
  //     const employeeToken = localStorage.getItem("token_e");
  //     if (!employeeToken) {
  //       toast.error("رجاء تسجيل الدخول مره أخرى");
  //       setIsTokenValid(false);
  //       setIsLoading(false);

  //       return;
  //     }
  //   }
  //   const userToken = localStorage.getItem("token_u");

  //   try {
  //     let decodedToken = null;

  //     if (employeeToken) {
  //       decodedToken = jwt_decode(employeeToken);
  //       setEmployeeLoginInfo(decodedToken);
  //       await getPermissions(decodedToken);

  //       setIsTokenValid(true);
  //     }

  //     if (userToken) {
  //       decodedToken = jwt_decode(userToken);
  //       setUserLoginInfo(decodedToken);

  //       if (decodedToken) {
  //         const userId = decodedToken.userinfo.id;
  //         if (userId) {
  //           const clientResponse = await axios.get(
  //             `${apiUrl}/api/user/${userId}`
  //           );
  //           setClientInfo(clientResponse.data);
  //           setIsTokenValid(true); // ✅ برضه السيشن صالح
  //         }
  //       }
  //     }
  //   } catch (error) {
  //     console.error("Error verifying token:", error);
  //     toast.error("خطأ أثناء التحقق من التوكن. يرجى تسجيل الدخول مرة أخرى.");
  //     setIsTokenValid(false);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  // ✅ دالة التحقق من توكن الموظف
  const getEmployeeInfoFromToken = async () => {
    setIsLoading(true);
    const employeeToken = localStorage.getItem("token_e");

    // ✅ لو مفيش توكن والصفحة مش /login، رجّع المستخدم لتسجيل الدخول
    if (!employeeToken) {
      toast.error("رجاء تسجيل الدخول مره أخرى");
      setIsTokenValid(false);
      setIsLoading(false);

      // ✅ تأكيد إننا مش بالفعل في /login علشان ما نعملش redirect لنفسها
      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }

      return;
    }

    try {
      const decodedToken = jwt_decode(employeeToken);
      setEmployeeLoginInfo(decodedToken);

      // ✅ جلب الصلاحيات
      await getPermissions(decodedToken);

      setIsTokenValid(true);
    } catch (error) {
      console.error("Error verifying employee token:", error);
      toast.error(
        "خطأ أثناء التحقق من توكن الموظف. يرجى تسجيل الدخول مرة أخرى."
      );
      setIsTokenValid(false);

      // ✅ فقط لو المستخدم مش في صفحة /login بالفعل
      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ دالة التحقق من توكن العميل (اليوزر)
  const getClientInfoFromToken = async () => {
    setIsLoading(true);
    const userToken = localStorage.getItem("token_u");

    if (!userToken) {
      setIsTokenValid(false);
      setIsLoading(false);
      return;
    }

    try {
      const decodedToken = jwt_decode(userToken);
      setUserLoginInfo(decodedToken);

      if (decodedToken?.userinfo?.id) {
        const userId = decodedToken.userinfo.id;

        const clientResponse = await axios.get(`${apiUrl}/api/user/${userId}`);
        setClientInfo(clientResponse.data);
        setIsTokenValid(true);
      }
    } catch (error) {
      console.error("Error verifying client token:", error);
      toast.error(
        "خطأ أثناء التحقق من توكن العميل. يرجى تسجيل الدخول مرة أخرى."
      );
      setIsTokenValid(false);
    } finally {
      setIsLoading(false);
    }
  };

  const getPermissions = async (decodedToken) => {
    try {
      const id = decodedToken.id;
      const config = await handleGetTokenAndConfig();
      if (id) {
        const response = await axios.get(
          `${apiUrl}/api/permission/employee/${id}`,
          config
        );
        if (response.status === 200) {
          const data = response.data.Permissions;
          setPermissionsList(data);
        } else {
          throw new Error(
            "Failed to fetch permissions: Unexpected status code"
          );
        }
      }
    } catch (error) {
      console.error("Error fetching permissions:", error.message);
    }
  };

  //######### get order ditalis by serial

  const [orderDetalisBySerial, setorderDetalisBySerial] = useState({});
  const [productOrderToUpdate, setproductOrderToUpdate] = useState([]);

  const getOrderDetailsBySerial = async (e, serial) => {
    e.preventDefault();

    if (!serial) {
      toast.error("يرجى إدخال رقم مسلسل صالح.");
      return;
    }

    try {
      const res = await axios.get(`${apiUrl}/api/order`);
      const orders = res.data;

      if (!orders || orders.length === 0) {
        toast.warn("لم يتم العثور على أي طلبات.");
        return;
      }

      const order = orders.find((o) => o.serial === serial);

      if (!order) {
        toast.warn(`لم يتم العثور على طلب بهذا الرقم: ${serial}`);
        return;
      }

      setorderDetalisBySerial(order);
      setproductOrderToUpdate(order.products || []);
      setaddition(order.addition || 0);
      setdiscount(order.discount || 0);

      toast.success("تم جلب تفاصيل الطلب بنجاح.");
    } catch (error) {
      console.error("حدث خطأ أثناء جلب تفاصيل الطلب:", error);

      if (error.response) {
        toast.error(
          `خطأ: ${error.response.data.message || "فشل في جلب تفاصيل الطلب."}`
        );
      } else if (error.request) {
        toast.error("خطأ في الشبكة: تعذر الوصول إلى السيرفر.");
      } else {
        toast.error("حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.");
      }
    }
  };

  const updateOrder = async (e) => {
    e.preventDefault();
    const id = orderDetalisBySerial._id;
    setIsLoading(true);

    try {
      const subTotal = costOrder;
      const total = subTotal + addition - discount;

      const response = await axios.put(`${apiUrl}/api/order/${id}`, {
        products: productOrderToUpdate,
        subTotal,
        discount,
        addition,
        total,
      });

      if (response.status === 200) {
        setorderDetalisBySerial({});
        setproductOrderToUpdate([]);
        setaddition(0);
        setdiscount(0);
        toast.success("تم تعديل الاوردر");
      } else {
        throw new Error("هناك خطأ في تعديل الاوردر");
      }
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("حدث خطأ أثناء تعديل الأوردر.");
    } finally {
      setIsLoading(false);
    }
  };

  // ----------- reservation table------------//
  //============================================
  const [allReservations, setAllReservations] = useState([]);
  const getAllReservations = async () => {
    if (!allTable || allTable.length === 0) return;
    try {
      const config = await handleGetTokenAndConfig();

      const response = await axios.get(`${apiUrl}/api/reservation`, config);
      if (response.data) {
        setAllReservations(response.data);
      } else {
      }
    } catch (error) {
      console.error("Error fetching reservations:", error);
    }
  };

  const [availableTableIds, setavailableTableIds] = useState([]);

  const getAvailableTables = (reservationDate, startTime, endTime) => {
    // Filter reservations that match the selected date
    const filterReservationsByDate = allReservations?.filter((reservation) => {
      const reservationDateObj = new Date(reservation.reservationDate);
      const selectedDateObj = new Date(reservationDate);

      return (
        reservationDateObj.getFullYear() === selectedDateObj.getFullYear() &&
        reservationDateObj.getMonth() === selectedDateObj.getMonth() &&
        reservationDateObj.getDate() === selectedDateObj.getDate()
      );
    });

    // Filter reservations that overlap with the selected time range
    const filterReservationsByTime = filterReservationsByDate?.filter(
      (reservation) => {
        if (
          reservation.status === "canceled" ||
          reservation.status === "Missed reservation time"
        ) {
          return false;
        }

        const startReservationTime = new Date(reservation.startTime).getTime();
        const endReservationTime = new Date(reservation.endTime).getTime();
        const startSelectedTime = new Date(startTime).getTime();
        const endSelectedTime = new Date(endTime).getTime();

        // Check if there is a time overlap
        return (
          (startReservationTime <= startSelectedTime &&
            endReservationTime >= startSelectedTime) ||
          (startReservationTime <= endSelectedTime &&
            endReservationTime >= endSelectedTime) ||
          (startSelectedTime <= startReservationTime &&
            endSelectedTime >= endReservationTime)
        );
      }
    );

    // Retrieve all table IDs
    const allTableIds = allTable?.map((table) => table._id) || [];

    // Retrieve reserved table IDs based on the filtered reservations
    const reservedTableIds = [];
    filterReservationsByTime &&
      filterReservationsByTime?.map((reservation) =>
        reservedTableIds.push(reservation.tableId?._id)
      );

    // Find available tables by excluding reserved ones
    const availableTableIds = allTableIds.filter(
      (tableId) => !reservedTableIds.includes(tableId)
    );

    // Update state with available table IDs
    setavailableTableIds(availableTableIds);
    return availableTableIds;
  };

  const createReservations = async (
    e,
    tableId,
    tableNumber,
    userId,
    numberOfGuests,
    customerName,
    customerPhone,
    reservationDate,
    startTime,
    endTime,
    reservationNote,
    createdBy
  ) => {
    try {
      e.preventDefault();
      setIsLoading(true);

      if (
        !tableId ||
        !reservationDate ||
        !startTime ||
        !endTime ||
        !customerName ||
        !customerPhone
      ) {
        toast.error("يرجى ملء جميع الحقول المطلوبة");
        setIsLoading(false);
        return;
      }

      // Convert reservationDate to Date object
      const selectedDate = new Date(reservationDate);

      // Logging selectedDate for debugging purposes

      // Filter reservations by table and selected date
      const filterReservationsByTable = allReservations.filter(
        (reservation) => {
          const reservationDateObj = new Date(reservation.reservationDate);
          const selectedDateObj = new Date(selectedDate);

          return (
            reservation.tableId === tableId &&
            reservationDateObj.getFullYear() ===
              selectedDateObj.getFullYear() &&
            reservationDateObj.getMonth() === selectedDateObj.getMonth() &&
            reservationDateObj.getDate() === selectedDateObj.getDate()
          );
        }
      );

      // Logging filterReservationsByTable for debugging purposes
      //
      // Filter reservations by table and selected date
      const conflictingReservation = filterReservationsByTable.find(
        (reservation) => {
          const startReservationTime = new Date(
            reservation.startTime
          ).getTime();
          const endReservationTime = new Date(reservation.endTime).getTime();
          const startSelectedTime = new Date(startTime).getTime();
          const endSelectedTime = new Date(endTime).getTime();
          return (
            (startReservationTime <= startSelectedTime &&
              endReservationTime >= startSelectedTime) ||
            (startReservationTime <= endSelectedTime &&
              endReservationTime >= endSelectedTime) ||
            (startSelectedTime <= startReservationTime &&
              endSelectedTime >= endReservationTime)
          );
        }
      );

      //

      // Display error message if there is a conflicting reservation
      if (conflictingReservation) {
        toast.error("هذه الطاولة محجوزة في هذا الوقت");
        return;
      }

      // Send request to the server
      const response = await axios.post(`${apiUrl}/api/reservation`, {
        tableId,
        tableNumber,
        numberOfGuests,
        customerName,
        customerPhone,
        reservationDate,
        startTime,
        endTime,
        userId: userId || null,
        createdBy: createdBy || null,
        reservationNote: reservationNote || "",
      });

      // Check if the request was successful
      if (response.status === 201) {
        // Update reservations data
        getAllReservations();
        // Display success message
        toast.success("تم حجز الطاولة بنجاح");
      } else {
        // Display error message if the request was unsuccessful
        toast.error("حدث خطأ أثناء عملية الحجز! الرجاء المحاولة مرة أخرى");
      }
    } catch (error) {
      // Display error message if an error occurred
      console.error(error);
      toast.error("فشل عملية الحجز! الرجاء المحاولة مرة أخرى");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        getRestaurant(),
        getAllEmployees(),
        getAllProducts(),
        getAllMenuCategories(),
        getAllOrders(),
        getAllTable(),
        getAllUsers(),
        getAllReservations(),
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("خطأ أثناء جلب البيانات");
    } finally {
      setIsLoading(false);
    }
  };

  // عند التحقق من التوكن
  useEffect(() => {
    // if (window.location.pathname === "/login") {
    //   return;
    // }
    const initializeSession = async () => {
      setIsLoading(true);
      await verifyToken();
      await getEmployeeInfoFromToken();
      setIsLoading(false);
    };

    initializeSession();
  }, []);

  // جلب البيانات عند التأكد من صلاحية التوكن
  useEffect(() => {
    if (isTokenValid) {
      fetchData();
    }
  }, [isTokenValid]);

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline) {
      const handleConnectError = (error) => {
        console.error("Socket connection error:", error);
        toast.error("هناك مشكلة في نظام الإشعارات");
      };

      cashierSocket.on("connect_error", handleConnectError);
      kitchenSocket.on("connect_error", handleConnectError);
      GrillSocket.on("connect_error", handleConnectError);
      BarSocket.on("connect_error", handleConnectError);
      waiterSocket.on("connect_error", handleConnectError);

      return () => {
        cashierSocket.off("connect_error", handleConnectError);
        kitchenSocket.off("connect_error", handleConnectError);
        GrillSocket.off("connect_error", handleConnectError);
        BarSocket.off("connect_error", handleConnectError);
        waiterSocket.off("connect_error", handleConnectError);

        cashierSocket.disconnect();
        kitchenSocket.disconnect();
        GrillSocket.disconnect();
        BarSocket.disconnect();
        waiterSocket.disconnect();
      };
    }
  }, []);

  // تحديث التكلفة عند تغير الحالة
  useEffect(() => {
    if (isTokenValid) {
      calculateOrderCost();
      getAllOrders();
    }
  }, [count, itemsInCart, productOrderToUpdate, isLogin]);

  return (
    <AppContext.Provider
      value={{
        // المعلومات الأساسية
        brandInfo,
        clientInfo,
        apiUrl,
        clientUrl,

        // الدوال المتعلقة بالمصادقة
        apiUrl,
        handleGetTokenAndConfig,
        userLoginInfo,
        employeeLoginInfo,
        permissionsList,
        // getUserInfoFromToken,
        getEmployeeInfoFromToken,
        getClientInfoFromToken,

        // الدوال المتعلقة بالمنتجات والفئات
        allProducts,
        productsOffer,
        sizesOffer,
        allMenuCategories,
        filterByMenuCategoryId,
        setMenuCategoryId,
        deleteItemFromCart,

        // الدوال المتعلقة بالمستخدمين، الطاولات، والطلبات
        allUsers,
        allTable,
        allOrders,
        allEmployees,

        // الدوال المتعلقة بتفاصيل المنتجات
        setproductNote,
        addNoteToProduct,
        addExtrasToProduct,
        handleAddProductExtras,
        setproductExtras,
        productExtras,

        // الدوال المتعلقة بمعالجة الطلبات والحسابات
        invoice,
        listProductsOrder,
        orderUpdateDate,
        myOrder,
        menuCategoryId,
        itemsInCart,
        costOrder,
        addItemToCart,
        setitemsInCart,
        incrementProductQuantity,
        decrementProductQuantity,
        getOrderProductForTable,
        setdiscount,
        setaddition,
        discount,
        addition,
        orderaddition,
        orderdiscount,

        // الدوال المتعلقة بإنشاء أنواع مختلفة من الطلبات
        checkout,
        createWaiterOrderForTable,
        createcashierOrder,
        createOrderForTableByClient,
        createDeliveryOrderByClient,
        lastInvoiceByCashier,
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

        // الدوال المتعلقة بالتقسيم
        setIsLoading,
        EditPagination,
        startPagination,
        endPagination,
        setStartPagination,
        setEndPagination,

        // دوال أخرى أو متغيرات حالة
        itemId,
        setitemId,
        formatDateTime,
        formatDate,
        formatTime,
        orderTotal,
        orderSubtotal,
        setsalesTax,
        salesTax,
        setserviceTax,
        serviceTax,
        orderdeliveryFee,
        setorderdeliveryFee,
        // الدوال المتعلقة بتفاصيل الطلبات
        orderDetalisBySerial,
        setorderDetalisBySerial,
        productOrderToUpdate,
        setproductOrderToUpdate,
        getOrderDetailsBySerial,
        updateOrder,
        putNumOfPaid,
        handlePayExtras,
        splitInvoice,
        subtotalSplitOrder,

        // الدوال المتعلقة بالحجوزات
        getAllTable,
        getAvailableTables,
        setavailableTableIds,
        availableTableIds,
        createReservations,
        getAllReservations,
        allReservations,
        setAllReservations,
        // confirmReservation,
        // updateReservation,
        // getReservationById,
        // deleteReservation,

        // حالة التحميل وأدوات أخرى
        isLoading,
        setIsLoading,
        setStartDate,
        setEndDate,
        filterByDateRange,
        filterByTime,
        isRefresh,
        setIsRefresh,

        cashierSocket,
        kitchenSocket,
        BarSocket,
        GrillSocket,
        waiterSocket,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export default AppContextProvider;
