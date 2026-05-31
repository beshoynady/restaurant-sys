import {
  LayoutDashboard,
  Building2,
  ShoppingCart,
  UtensilsCrossed,
  Settings,
} from "lucide-react";

export const sidebarItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
  },

  {
    title: "Organization",
    icon: Building2,
    children: [
      {
        title: "Brand",
        path: "/organization/brand",
      },
      {
        title: "Branches",
        path: "/organization/branches",
      },
    ],
  },

  {
    title: "Sales",
    icon: ShoppingCart,
    children: [
      {
        title: "Orders",
        path: "/sales/orders",
      },
      {
        title: "Invoices",
        path: "/sales/invoices",
      },
    ],
  },

  {
    title: "Menu",
    icon: UtensilsCrossed,
    children: [
      {
        title: "Products",
        path: "/menu/products",
      },
    ],
  },

  {
    title: "Settings",
    icon: Settings,
    path: "/settings",
  },
];
