import axios from "axios";
import { baseURL } from "../../api/axios.js";

export const initializeApp = async () => {
  try {
    const response = await axios.get(`${baseURL}/organization/brand/setup/status`);

    return response.data;
  } catch (error) {
    console.error(error);

    return {
      isSetupCompleted: false,
    };
  }
};