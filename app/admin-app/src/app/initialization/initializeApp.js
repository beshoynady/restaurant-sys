import api from "../../api/axios";

export const initializeApp = async () => {
  try {
    const response = await api.get("/setup/status");

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error("App initialization failed:", error);

    return {
      success: false,
      data: {
        isSetupCompleted: false,
      },
      error,
    };
  }
};