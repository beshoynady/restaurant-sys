import React, { useContext } from "react";
import { BrowserRouter } from "react-router-dom";


import "react-toastify/dist/ReactToastify.css";

import AppContextProvider from "./context/appContext";
import { AppContext } from "./context/appContext";
import LoadingPage from "./layouts/adminLayout/adminComponent/LoadingPage/LoadingPage";
import NoInternetPage from "./layouts/adminLayout/adminComponent/NoInternetPage/NoInternetPage";
import AppRoutes from "./routes/appRoutes";




function App() {
  
  return (
    <AppContextProvider
      
    >
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppContextProvider>
  );
}

export default App;
