import { JSX } from "react";
import { SidebarItem } from "./SidebarItem";
import "./Sidebar.css";

interface Props {
  page: "help" | "settings"; // Specifies whether the sidebar is for "help" or "settings" page
}

interface SidebarNavItem {
  text: string; // Text displayed in the sidebar item
  to: string; // URL path for navigation
}

export const Sidebar = ({ page }: Props): JSX.Element => {
  const navItems: SidebarNavItem[] =
    page === "help"
      ? [
        // First item for help page
        { text: "How to Get Started", to: "/help/getting-started" },
        { text: "Data Types and Formats", to: "/help/data-types" },
        { text: "Chart Visualization", to: "/help/chart-visualization" },
        { text: "Understanding Metrics", to: "/help/metrics" },
        { text: "Installing Plugins", to: "/help/plugins" },
        { text: "Anomaly Detection", to: "/help/anomaly-detection" },
        { text: "Generating Reports", to: "/help/reports" },
        { text: "Troubleshooting", to: "/help/troubleshooting" },
        { text: "About", to: "/help/about" }
      ]
      : [
        // Items for settings page
        { text: "Default Data Settings", to: "/settings/data" },
        { text: "Charts", to: "/settings/charts" },
        { text: "Anomaly Detection", to: "/settings/anomaly" },
        { text: "UI", to: "/settings/ui" },
        { text: "Advanced", to: "/settings/advanced" },
        { text: "Plugins", to: "/settings/plugins" }
      ];

  return (
    <div className={`sidebar section-container d-flex flex-column gap-1`}>
      {navItems.map(item => (
        <SidebarItem key={item.to} text={item.text} to={item.to} /> // Iterates through navItems and renders each as a SidebarItem
      ))}
    </div>
  );
};
