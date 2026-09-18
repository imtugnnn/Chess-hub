import { useEffect, useState } from "react";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { Homepage } from "./pages/HomePage";

const VALID_PATHS = new Set(["/login", "/register", "/homepage"]);

function getPathname() {
  const path = window.location.pathname;
  if (VALID_PATHS.has(path)) return path;
  window.history.replaceState({}, "", "/login");
  return "/login";
}

export default function App() {
  const [path, setPath] = useState(getPathname);
  const [teacherName, setTeacherName] = useState("Minh Anh");

  useEffect(() => {
    const handlePopState = () => setPath(getPathname());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function navigate(to) {
    window.history.pushState({}, "", to);
    setPath(to);
  }

  function handleAuthenticated(name) {
    if (name?.trim()) setTeacherName(name.trim());
    navigate("/homepage");
  }

  if (path === "/register") return <RegisterPage onNavigate={navigate} onRegistered={handleAuthenticated} />;
  if (path === "/homepage") return <Homepage teacherName={teacherName} onLogout={() => navigate("/login")} />;
  return <LoginPage onNavigate={navigate} onAuthenticated={handleAuthenticated} />;
}
