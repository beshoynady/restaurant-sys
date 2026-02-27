import React, { useRef, useState, useEffect, useContext } from "react";
import { Link, useParams } from "react-router-dom";
import { dataContext } from "../../../../context/appContext";
import "./Header.css";
import Cart from "../cart/Cart";
import LoginRegistr from "../auth/LoginRegistr";

const Header = () => {
  const {
    brandInfo,
    apiUrl,
    userLoginInfo,
    itemsInCart,
    productsOffer,
    sizesOffer,
  } = useContext(dataContext);
  const { id } = useParams();
  const [opencart, setopencart] = useState(false);
  const [openlogin, setopenlogin] = useState(false);

  const logout = () => {
    try {
      // Remove user token from local storage
      localStorage.removeItem("token_u");

      // Redirect to home page
      window.location.href = `https://${window.location.hostname}`;
    } catch (error) {
      // Handle any potential errors
      console.error("Logout error:", error);
      // Display a notification to the user about the error
      alert("حدث خطأ أثناء تسجيل الخروج. يرجى المحاولة مرة أخرى.");
    }
  };

  const navref = useRef();

  const toggleMobileMenu = () => {
    navref.current.classList.toggle("show");
  };

  const [isScroll, setisScroll] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setisScroll(scrollPosition > 70);
    };
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header className={`header-client ${isScroll ? "scroll" : ""}`}>
      <div className="container-lg">
        <div className="mob-menu" onClick={toggleMobileMenu}>
          <span id="line-1"></span>
          <span id="line-2"></span>
          <span id="line-3"></span>
        </div>
        <div className="logo">
          {brandInfo.image ? (
            <img
              src={`${apiUrl}/images/${brandInfo.image}`}
              alt={brandInfo.name}
            />
          ) : (
            <a href="/" className="res-name">
              {brandInfo.name}
            </a>
          )}
        </div>
        <nav ref={navref} className="nav">
          <ul className="navigator borderYtoX">
            <li onClick={toggleMobileMenu}>
              <a href="#main">الرئيسيه</a>
            </li>
            <li onClick={toggleMobileMenu}>
              <a href="#menu">قائمة الطعام</a>
            </li>
            {(productsOffer.length > 0 || sizesOffer.length > 0) && (
              <li onClick={toggleMobileMenu}>
                <a href="#offer">العروض</a>
              </li>
            )}

            {brandInfo.usesReservationSystem && (
              <li onClick={toggleMobileMenu}>
                <a href="#reservation">حجز الطاولات</a>
              </li>
            )}
            <li onClick={toggleMobileMenu}>
              <a href="#location">موقعنا</a>
            </li>
            <li onClick={toggleMobileMenu}>
              <a href="#contact">تواصل معنا</a>
            </li>
          </ul>
        </nav>
        <div className="left-nav">
          {!id && (
            <>
              {userLoginInfo && userLoginInfo.userinfo ? (
                <div className="nav-logout" onClick={logout}>
                  {" "}
                  خروج
                  <span className="material-symbols-outlined">logout</span>
                </div>
              ) : (
                <div
                  className="nav-login"
                  onClick={() => {
                    setopenlogin(!openlogin);
                    setopencart(false);
                  }}
                >
                  دخول<span className="material-symbols-outlined">login</span>
                </div>
              )}
            </>
          )}
          <div
            className="cart-icon"
            onClick={() => {
              setopencart(!opencart);
              setopenlogin(false);
            }}
          >
            <span className="material-symbols-rounded shopping_cart">
              shopping_cart
            </span>
            <span className="cartcounter">{itemsInCart.length}</span>
          </div>
          <LoginRegistr openlogin={openlogin} />
          <Cart opencart={opencart} />
        </div>
      </div>
    </header>
  );
};

export default Header;
