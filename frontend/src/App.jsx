import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Vote from './pages/Vote';
import Results from './pages/Results';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <div className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/vote/:pollId" element={<Vote />} />
          <Route path="/results/:pollId" element={<Results />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;