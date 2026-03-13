import React, { useContext } from "react";
import { BrowserRouter } from "react-router-dom";


import "react-toastify/dist/ReactToastify.css";

import AppContextProvider from "./context/appContext";
import AppRoutes from "./routes/appRoutes";




function App() {
  
  return (
    <AppContextProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppContextProvider>
  );
}

export   default App;
