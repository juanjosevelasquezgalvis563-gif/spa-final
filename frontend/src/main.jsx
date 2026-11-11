import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import "./App.css";
import { SessionProvider } from "./context/SessionContext";


ReactDOM.createRoot(document.getElementById("root")).render(
  <GoogleOAuthProvider clientId="464029038011-jbual8epthrk0p25ogacv1ocd5au9ejp.apps.googleusercontent.com">
    <BrowserRouter>
      <SessionProvider>
        <App />
      </SessionProvider>
    </BrowserRouter>
  </GoogleOAuthProvider>
);