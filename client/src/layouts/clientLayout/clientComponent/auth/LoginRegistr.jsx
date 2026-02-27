import React, { useState, useEffect, useRef, useContext } from "react";
import axios from "axios";
import { AppContext } from "../../../../context/appContext";
import { toast } from "react-toastify";

import "./LoginRegistr.css";

const LoginRegistr = (props) => {
  const {
    setStartDate,
    setEndDate,
    filterByDateRange,
    filterByTime,
    brandInfo,
    formatDateTime,
    permissionsList,
    setIsLoading,
    formatDate,
    formatTime,
    EditPagination,
    startPagination,
    endPagination,
    setStartPagination,
    setEndPagination,
    getClientInfoFromToken,
    handleGetTokenAndConfig,
    apiUrl,
  } = useContext(AppContext);

  const openlogin = props.openlogin;
  const [openform, setopenform] = useState(props.openlogin);
  const [closelogin, setcloselogin] = useState(true);

  const authform = useRef();
  const loginForm = useRef();

  const [username, setusername] = useState("");
  const [email, setemail] = useState("");
  const [deliveryArea, setdeliveryArea] = useState("");
  const [address, setaddress] = useState("");
  const [phone, setphone] = useState("");
  const [password, setpassword] = useState("");
  const [passconfirm, setpassconfirm] = useState("");

  const [areas, setAreas] = useState([]);

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

  const closeform = () => {
    authform.current.style.display = "none";
  };

  const login = async (e, phone, password, getClientInfoFromToken) => {
    e.preventDefault();

    try {
      // Check if phone and password are provided
      if (!phone || !password) {
        toast.error("رقم الموبايل أو كلمة السر غير مُقدمة.");
        return;
      }

      // Make a POST request to login endpoint
      const response = await axios.post(apiUrl + "/api/auth/login", {
        phone,
        password,
      });

      // Handle response data
      if (response && response.data) {
        const { accessToken, findUser } = response.data;

        // Check if user is active and token is provided
        if (accessToken && findUser.isActive) {
          // Store access token in local storage
          localStorage.setItem("token_u", accessToken);
          // Retrieve user info from token if needed
          getClientInfoFromToken();
          // Update login state
          // setisLogin(true);
          toast.success("تم تسجيل الدخول!");
        } else {
          toast.error("هذا المستخدم غير نشط. الرجاء الاتصال بنا.");
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      // Handle different error scenarios
      if (error.response && error.response.status === 404) {
        toast.error("رقم الهاتف غير مسجل.");
      } else if (error.response && error.response.status === 401) {
        toast.error("كلمة السر غير صحيحة.");
      } else {
        toast.error("حدث خطأ أثناء تسجيل الدخول. الرجاء المحاولة مرة أخرى.");
      }
    }
  };

  // Function to handle user signup
  const signup = async (
    e,
    username,
    phone,
    deliveryArea,
    address,
    email,
    password,
    passconfirm
  ) => {
    e.preventDefault();

    try {
      // Check if any field is empty
      if (!username || !password || !phone || !address) {
        toast.error("هناك حقول فارغة.");
        return;
      }

      // Check if passwords match if passconfirm is provided
      if (passconfirm !== undefined && password !== passconfirm) {
        toast.error("كلمة المرور غير متطابقة.");
        return;
      }

      // Send signup request
      const response = await axios.post(apiUrl + "/api/auth/signup", {
        username,
        password,
        phone,
        deliveryArea,
        address,
        email,
      });

      // Handle successful signup
      if (response && response.data) {
        const { accessToken, newUser } = response.data;
        localStorage.setItem("token_u", accessToken);
        toast.success("تم إنشاء الحساب بنجاح!");
        // Perform actions with accessToken or newUser if needed
      }
    } catch (error) {
      // Handle signup error
      console.error("Signup error:", error);
      toast.error("حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى.");
    }
  };

  const [showPassword, setShowPassword] = useState(false);
  const handleClickShowPassword = () => setShowPassword(!showPassword);

  useEffect(() => {
    getAllDeliveryAreas();
  }, []);

  return (
    <div
      className="auth-section"
      ref={authform}
      style={{ display: openlogin ? "flex" : "none" }}
    >
      <div className="wrapper">
        <div className="form-container">
          <div className="slide-controls">
            <input type="radio" name="slide" id="signup" />
            <input type="radio" name="slide" id="login" defaultChecked />
            <label
              htmlFor="login"
              className="slide login"
              onClick={() => (loginForm.current.style.marginRight = "0%")}
            >
              دخول
            </label>
            <label
              htmlFor="signup"
              className="slide signup"
              onClick={() => (loginForm.current.style.marginRight = "-50%")}
            >
              عضو جديد
            </label>
          </div>

          <div className="form-inner">
            <form
              ref={loginForm}
              className="login"
              onSubmit={(e) =>
                login(e, phone, password, getClientInfoFromToken)
              }
            >
              <div className="field">
                <input
                  type="text"
                  placeholder="Phone"
                  required
                  onChange={(e) => setphone(e.target.value)}
                />
              </div>
              <div className="field password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  required
                  onChange={(e) => setpassword(e.target.value)}
                />
                <i
                  className={`eye-icon ${
                    showPassword ? "fa-eye" : "fa-eye-slash"
                  }`}
                  onClick={handleClickShowPassword}
                />
              </div>
              <div className="field w-100 d-flex align-items-center justify-content-center">
                <input
                  className="btn btn-info w-50"
                  type="submit"
                  value="Login"
                  onClick={closeform}
                />
              </div>
            </form>

            <form
              className="signup"
              style={{ overflow: "auto" }}
              onSubmit={(e) =>
                signup(
                  e,
                  username,
                  phone,
                  deliveryArea,
                  address,
                  email,
                  password,
                  passconfirm
                )
              }
            >
              <div className="field">
                <input
                  type="text"
                  placeholder="اسمك"
                  required
                  onChange={(e) => setusername(e.target.value)}
                />
              </div>
              <div className="field">
                <input
                  type="text"
                  placeholder="الايميل"
                  onChange={(e) => setemail(e.target.value)}
                />
              </div>
              <div className="field">
                <input
                  type="text"
                  placeholder="الموبايل"
                  required
                  onChange={(e) => setphone(e.target.value)}
                />
              </div>
              <div className="field">
                <select
                  className="field"
                  onChange={(e) => setdeliveryArea(e.target.value)}
                >
                  <option>اختر المنطقة</option>
                  {areas ? (
                    areas.map((area, i) => (
                      <option value={area._id} key={i}>
                        {area.name}
                      </option>
                    ))
                  ) : (
                    <option>لا توجد مناطق توصيل متاحة</option>
                  )}
                </select>
              </div>
              <div className="field">
                <textarea
                  placeholder="العنوان بالتفصيل"
                  cols="42"
                  rows="2"
                  required
                  onChange={(e) => setaddress(e.target.value)}
                />
              </div>
              <div className="field password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="الباسورد"
                  required
                  onChange={(e) => setpassword(e.target.value)}
                />
                <i
                  className={`eye-icon ${
                    showPassword ? "fa-eye" : "fa-eye-slash"
                  }`}
                  onClick={handleClickShowPassword}
                />
              </div>
              <div className="field password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="تاكيد الباسورد"
                  required
                  onChange={(e) => setpassconfirm(e.target.value)}
                />
                <i
                  className={`eye-icon ${
                    showPassword ? "fa-eye" : "fa-eye-slash"
                  }`}
                  onClick={handleClickShowPassword}
                />
              </div>
              <div className="field w-100 d-flex align-items-center justify-content-center">
                <input
                  className="btn btn-info w-50"
                  type="submit"
                  value="Signup"
                />
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginRegistr;
