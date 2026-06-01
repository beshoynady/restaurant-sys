// src/modules/brand/pages/BrandPage.jsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";

import BrandHeader from "@/modules/brand/components/BrandHeader";
import IdentityTab from "@/modules/brand/tabs/IdentityTab";
import FinancialTab from "@/modules/brand/tabs/FinancialTab";
import LocalizationTab from "@/modules/brand/tabs/LocalizationTab";
import BrandingTab from "@/modules/brand/tabs/BrandingTab";

export default function BrandPage() {
  const { t } = useTranslation();
  const { isDark } = useTheme();

  return (
    <div
      className={`p-6 space-y-6 min-h-screen transition-colors duration-300
      ${isDark ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}
    >
      <BrandHeader />

      <Tabs defaultValue="identity" className="w-full">
        <TabsList className="grid grid-cols-4 w-full sm:grid-cols-2">
          <TabsTrigger value="identity">
            {t("brand.identity")}
          </TabsTrigger>

          <TabsTrigger value="financial">
            {t("brand.financial")}
          </TabsTrigger>

          <TabsTrigger value="localization">
            {t("brand.localization")}
          </TabsTrigger>

          <TabsTrigger value="branding">
            {t("brand.branding")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="identity">
          <IdentityTab />
        </TabsContent>

        <TabsContent value="financial">
          <FinancialTab />
        </TabsContent>

        <TabsContent value="localization">
          <LocalizationTab />
        </TabsContent>

        <TabsContent value="branding">
          <BrandingTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}