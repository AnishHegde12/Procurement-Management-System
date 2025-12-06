import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import "./css/navbar.css";

import Dashboard from "./components/Dashboard";
import CreateRFP from "./components/CreateRFP";
import Vendors from "./components/Vendors";
 

function App() {
  return (
    <Router>
      <Navbar />
      <div style={{ padding: "24px" }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/create-rfp" element={<CreateRFP />} />
          { <Route path="/vendors" element={<Vendors />} /> }
        </Routes>
      </div>
    </Router>
  );
}

export default App;
