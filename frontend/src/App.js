import { useState } from "react";
import LoginPage from "./pages/LoginPage";
import Step1Form from "./Step1Form";
import AdminPortalPage from "./pages/AdminPortalPage";

function App() {
  const [currentUser, setCurrentUser] = useState(null);

  if (!currentUser) {
    return <LoginPage onLoginSuccess={setCurrentUser} />;
  }

  if (currentUser.role === "student") {
    return <Step1Form user={currentUser} onLogout={() => setCurrentUser(null)} />;
  }

  if (currentUser.role === "admin") {
    return <AdminPortalPage user={currentUser} onLogout={() => setCurrentUser(null)} />;
  }

  return <LoginPage onLoginSuccess={setCurrentUser} />;
}

export default App;
