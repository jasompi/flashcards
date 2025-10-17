import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './Home';
import Study from './Study';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/study/:filename" element={<Study />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
