import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SettingsProvider } from './SettingsContext';
import Home from './Home';
import Study from './Study';
import './App.css';

function App() {
  return (
    <SettingsProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/study/:filename" element={<Study />} />
          </Routes>
        </div>
      </Router>
    </SettingsProvider>
  );
}

export default App;
