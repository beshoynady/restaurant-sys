export const employeeLogout = async () => {
  localStorage.removeItem("token_e");

  localStorage.removeItem("refresh_token_e");

  sessionStorage.clear();

  window.location.replace("/login");
};