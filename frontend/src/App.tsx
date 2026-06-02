import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { ComparisonView } from './pages/ComparisonView';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/session/:id" element={<ComparisonView />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
