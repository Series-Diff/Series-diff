import { JSX, useEffect } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { Sidebar } from "../../components/SideBar/Sidebar";
import { Header } from "../../components/Header";
import { Col, Container } from "react-bootstrap";

const HelpPage = (): JSX.Element => {
  const location = useLocation();

  // Persist the current help subpage in localStorage when on a /help/* route
  useEffect(() => {
    if (location.pathname.startsWith("/help/")) {
      localStorage.setItem("lastHelpTab", location.pathname);
    }
  }, [location.pathname]);

  // Redirect /help to the last visited subpage or default to /help/getting-started
  const lastHelpTab = localStorage.getItem("lastHelpTab") || "/help/getting-started";
  if (location.pathname === "/help") {
    return <Navigate to={lastHelpTab} replace />;
  }

  return (
    <Container fluid className="d-flex flex-grow-1 gap-3 h-100 p-0">
      <Col xs="auto">
        <Sidebar page="help" /> {/* Sidebar variant for HelpPage */}
      </Col>
      <Col className="section-container d-flex flex-column p-5 gap-5 w-100 overflow-auto" style={{ height: "calc(100vh - var(--nav-height) - 2 * var(--section-margin))" }}>
        <Header title="Help & Documentation" subtitle="Learn how to use the SeriesDiff application effectively" />
        <Outlet /> {/* Renders selected help subpage content */}
      </Col>
    </Container>
  );
};

export default HelpPage;
