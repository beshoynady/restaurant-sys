import api from "@/shared/services/api";

export const initializeApp = async () => {
   try {
      const response = await api.get("/setup/status");

      return response.data;
   } catch (error) {
      console.error(error);

      return {
         isSetupCompleted: false,
      };
   }
};