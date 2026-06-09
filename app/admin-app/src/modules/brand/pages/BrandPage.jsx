import BrandHeader from "../components/BrandHeader";

import BrandSummaryCard from "../components/BrandSummaryCard";
import BrandStatsCard from "../components/BrandStatsCard";

import BrandIdentitySection from "../components/sections/BrandIdentitySection";
import LegalSection from "../components/sections/LegalSection";
import FinancialSection from "../components/sections/FinancialSection";
import LanguageSection from "../components/sections/LanguageSection";
import OperationalSection from "../components/sections/OperationalSection";
import AuditSection from "../components/sections/AuditSection";

import { useBrandForm } from "../hooks/useBrandForm";

export default function BrandPage() {
  const brandForm =
    useBrandForm();

  return (
    <div className="min-h-screen bg-surface-secondary p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <BrandHeader
          {...brandForm}
        />

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left Side */}

          <div className="lg:col-span-4 space-y-6">
            <BrandSummaryCard
              {...brandForm}
            />

            <BrandStatsCard
              {...brandForm}
            />
          </div>

          {/* Right Side */}

          <div className="lg:col-span-8 space-y-6">
            <BrandIdentitySection
              {...brandForm}
            />

            <LegalSection
              {...brandForm}
            />

            <FinancialSection
              {...brandForm}
            />

            <LanguageSection
              {...brandForm}
            />

            <OperationalSection
              {...brandForm}
            />

            <AuditSection
              {...brandForm}
            />
          </div>
        </div>
      </div>
    </div>
  );
}