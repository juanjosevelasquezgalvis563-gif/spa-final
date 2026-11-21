import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import "./App.css";
import "./dashboard-redesign.css";
import { SessionProvider } from "./context/SessionContext";


ReactDOM.createRoot(document.getElementById("root")).render(
  <GoogleOAuthProvider clientId="464029038011-sjgk6pp7jiocest4nkbgi1ocbig4p0c3.apps.googleusercontent.com">
    <BrowserRouter>
      <SessionProvider>
        <App />
      </SessionProvider>
    </BrowserRouter>
  </GoogleOAuthProvider>
);