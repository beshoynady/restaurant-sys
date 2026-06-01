// src/modules/brand/pages/BrandProfilePage.jsx
import {
  Building2,
  Globe,
  Languages,
  MapPin,
  BadgeDollarSign,
  FileText,
  Clock3,
  CheckCircle2,
} from "lucide-react";

export default function BrandProfilePage() {
  const brand = {
    name: {
      EN: "Pizza Hut",
      AR: "بيتزا هت",
    },

    slug: "pizza-hut-eg",

    logo:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400",

    maxBranches: 20,

    currency: {
      code: "EGP",
      symbol: "£",
      decimalPlaces: 2,
    },

    dashboardLanguages: ["EN", "AR"],

    defaultDashboardLanguage: "EN",

    legalName: "Pizza Hut Restaurants LLC",

    companyRegister: "123456789",

    taxIdNumber: "987654321",

    timezone: "Africa/Cairo",

    countryCode: "EG",

    setupStatus: "complete",

    status: "active",
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col lg:flex-row gap-6 items-center">
            <img
              src={brand.logo}
              alt="brand"
              className="w-32 h-32 rounded-3xl object-cover border"
            />

            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-900">
                {brand.name.EN}
              </h1>

              <p className="text-slate-500 mt-2">
                Restaurant Management System
              </p>

              <div className="flex flex-wrap gap-3 mt-5">
                <span className="px-4 py-2 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                  Active
                </span>

                <span className="px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                  Setup Complete
                </span>

                <span className="px-4 py-2 rounded-full bg-slate-100 text-slate-700 text-sm font-medium">
                  {brand.maxBranches} Branches
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button className="px-5 py-3 rounded-xl border border-slate-300 hover:bg-slate-100">
                Edit
              </button>

              <button className="px-5 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700">
                Save Changes
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left Side */}
          <div className="lg:col-span-4 space-y-6">
            {/* Summary */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6">
              <h3 className="font-semibold text-lg mb-5">
                Brand Summary
              </h3>

              <div className="space-y-4">
                <SummaryItem
                  label="Country"
                  value="Egypt"
                />

                <SummaryItem
                  label="Currency"
                  value="EGP"
                />

                <SummaryItem
                  label="Language"
                  value="English"
                />

                <SummaryItem
                  label="Timezone"
                  value="Africa/Cairo"
                />

                <SummaryItem
                  label="Status"
                  value="Active"
                />
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6">
              <h3 className="font-semibold text-lg mb-5">
                Quick Stats
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <StatCard
                  title="Branches"
                  value="12 / 20"
                />

                <StatCard
                  title="Languages"
                  value="2"
                />

                <StatCard
                  title="Currency"
                  value="EGP"
                />

                <StatCard
                  title="Status"
                  value="Active"
                />
              </div>
            </div>
          </div>

          {/* Right Side */}
          <div className="lg:col-span-8 space-y-6">
            {/* Brand Information */}
            <Card
              title="Brand Information"
              icon={<Building2 size={18} />}
            >
              <div className="grid md:grid-cols-2 gap-5">
                <InfoField
                  label="Brand Name (English)"
                  value={brand.name.EN}
                />

                <InfoField
                  label="Brand Name (Arabic)"
                  value={brand.name.AR}
                />

                <InfoField
                  label="Slug"
                  value={brand.slug}
                />

                <InfoField
                  label="Max Branches"
                  value={brand.maxBranches}
                />
              </div>
            </Card>

            {/* Legal */}
            <Card
              title="Legal Information"
              icon={<FileText size={18} />}
            >
              <div className="grid md:grid-cols-2 gap-5">
                <InfoField
                  label="Legal Name"
                  value={brand.legalName}
                />

                <InfoField
                  label="Company Register"
                  value={brand.companyRegister}
                />

                <InfoField
                  label="Tax Number"
                  value={brand.taxIdNumber}
                />

                <InfoField
                  label="Status"
                  value={brand.status}
                />
              </div>
            </Card>

            {/* Financial */}
            <Card
              title="Financial Settings"
              icon={<BadgeDollarSign size={18} />}
            >
              <div className="grid md:grid-cols-3 gap-5">
                <InfoField
                  label="Currency Code"
                  value={brand.currency.code}
                />

                <InfoField
                  label="Currency Symbol"
                  value={brand.currency.symbol}
                />

                <InfoField
                  label="Decimal Places"
                  value={brand.currency.decimalPlaces}
                />
              </div>
            </Card>

            {/* Language */}
            <Card
              title="Language Settings"
              icon={<Languages size={18} />}
            >
              <div className="space-y-5">
                <div>
                  <p className="text-sm text-slate-500 mb-3">
                    Enabled Languages
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {brand.dashboardLanguages.map((lang) => (
                      <span
                        key={lang}
                        className="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 text-sm font-medium"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>

                <InfoField
                  label="Default Language"
                  value={brand.defaultDashboardLanguage}
                />
              </div>
            </Card>

            {/* Operational */}
            <Card
              title="Operational Settings"
              icon={<Globe size={18} />}
            >
              <div className="grid md:grid-cols-2 gap-5">
                <InfoField
                  label="Country Code"
                  value={brand.countryCode}
                />

                <InfoField
                  label="Timezone"
                  value={brand.timezone}
                />

                <InfoField
                  label="Setup Status"
                  value={brand.setupStatus}
                />

                <InfoField
                  label="Brand Status"
                  value={brand.status}
                />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================= */

function Card({ title, icon, children }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        {icon}
        <h2 className="font-semibold text-lg">{title}</h2>
      </div>

      {children}
    </div>
  );
}

function InfoField({ label, value }) {
  return (
    <div>
      <p className="text-sm text-slate-500 mb-2">
        {label}
      </p>

      <div className="h-12 rounded-xl border border-slate-200 px-4 flex items-center bg-slate-50">
        {value}
      </div>
    </div>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>

      <span className="font-medium">{value}</span>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-center">
      <div className="text-sm text-slate-500">
        {title}
      </div>

      <div className="mt-2 text-xl font-bold">
        {value}
      </div>
    </div>
  );
}