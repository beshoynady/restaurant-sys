
/* =====================================
   📁 features/setup/api/setup.api.js
===================================== */

import axios from "../../../api/axios";

export const initializeSystem = (data) =>
  axios.post("/setup/initialize", data);

