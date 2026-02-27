import React, { useContext } from "react";
import { ToastContainer } from "react-toastify";
import "./Clientscreen.css";
import Header from "./clientComponent/header/Header";
import Home from "./clientComponent/home/Home";
import Offers from "./clientComponent/offers/Offers";
import Menu from "./clientComponent/menu/Menu";
import Location from "./clientComponent/location/Location";
import Contact from "./clientComponent/contact/Contact";
import Reservation from "./clientComponent/reservations/Reservation";
import Footer from "./clientComponent/footer/Footer";
import { AppContext } from "../../context/appContext";

const Clientscreen = () => {
  const {
    brandInfo,
    allProducts,
    productsOffer,
    sizesOffer,
    handleGetTokenAndConfig,
    apiUrl,
  } = useContext(AppContext);

  return (
    <div className="clientscreen" style={{ direction: "rtl" }}>
      <ToastContainer />
      <Header />
      <Home />
      {(productsOffer.length > 0 || sizesOffer.length > 0) && <Offers />}
      {allProducts.length > 0 && <Menu />}
      {brandInfo?.locationUrl && <Location />}
      {(brandInfo?.contact || brandInfo?.socialMedia) && <Contact />}
      {brandInfo?.usesReservationSystem && <Reservation />}
      <Footer />
    </div>
  );
};

export default Clientscreen;
