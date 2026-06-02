import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Vote from "./pages/Vote";
import Results from "./pages/Results";
import Login from "./pages/Login";
import Register from "./pages/Register";
import SharePoll from "./pages/SharePoll";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <div className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/vote/:pollId" element={<Vote />} />
          <Route path="/results/:pollId" element={<Results />} />
          <Route path="/share/:pollId" element={<SharePoll />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;