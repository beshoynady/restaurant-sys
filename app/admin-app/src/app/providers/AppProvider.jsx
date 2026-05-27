import { ThemeProvider } from "./ThemeProvider";
import LanguageProvider from "./LanguageProvider";

const AppProvider = ({ children }) => {
  return (
    <ThemeProvider>
      <LanguageProvider>{children}</LanguageProvider>
    </ThemeProvider>
  );
};

export default AppProvider;