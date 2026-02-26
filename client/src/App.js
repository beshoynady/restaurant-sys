import React, { useContext } from "react";
import { BrowserRouter } from "react-router-dom";


import "react-toastify/dist/ReactToastify.css";

import AppContextProvider from "./context/appContext";
import AppRoutes from "./routes/appRoutes";



const {isLoading, isOnline} = useContext(AppContext);





function App() {

  return (
    <AppContextProvider
      
    >
      {isLoading && <LoadingPage />}
      {!isOnline && <NoInternetPage />}

      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppContextProvider>
  );
}

export default App;
