import { Routes, Route } from 'react-router-dom';
import UploadPage from './pages/UploadPage';
import PreviewPage from './pages/PreviewPage';
import './index.css';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<UploadPage />} />
      <Route path="/preview" element={<PreviewPage />} />
    </Routes>
  );
};

export default App;
