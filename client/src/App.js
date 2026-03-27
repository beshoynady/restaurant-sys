import React, { useContext } from "react";
import { BrowserRouter } from "react-router-dom";


import "react-toastify/dist/ReactToastify.css";

import AppContextProvider from "./context/appContext";
import {AdminContextProvider} from "./context/adminContext";
import AppRoutes from "./routes/appRoutes";




function App() {
  
  return (
    <AppContextProvider>
      <AdminContextProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
      </AdminContextProvider>
    </AppContextProvider>
  );
}

export  default App;
