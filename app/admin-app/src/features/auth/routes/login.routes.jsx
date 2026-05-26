import { Route } from "react-router-dom";

import LoginPage from "../pages/LoginPage";

const authRoutes = (
  <>
    <Route
      path="/login"
      element={<LoginPage />}
    />
  </>
);

export default authRoutes;