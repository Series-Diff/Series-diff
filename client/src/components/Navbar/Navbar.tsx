import { JSX } from "react";
import "./Navbar.css";
import { TopMenuNavItem } from "./TopMenuNavItem/TopMenuNavItem";
import { LogoPlaceHolder } from "./Logo/Logo";

interface NavItem {
  text: string;
  to: string;
}

export const NavigationMenu = (): JSX.Element => {
  // Array with the list of menu subpages, their names, and paths
  const navItems: NavItem[] = [
    { text: "Dashboard", to: "/dashboard" },
    { text: "Data", to: "/data" },
    { text: "Metrics", to: "/metrics" },
    // { text: "Anomaly", to: "/anomaly" },
    // { text: "Settings", to: "/settings" },
    { text: "Help", to: "/help" }
  ];

  return (
    <div className="navigation-menu d-flex align-items-center px-3 bg-white">
      <LogoPlaceHolder />
      {/* navItems.map transforms each array element into a TopMenuNavItem component */}
      {navItems.map(item => (
        <TopMenuNavItem key={item.text} text={item.text} to={item.to} />
      ))}
    </div>
  );
};
