import { useContext } from "react";
import { ThemeContext } from "../../app/providers/ThemeProvider";

const useTheme = () => useContext(ThemeContext);

export default useTheme;