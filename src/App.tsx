import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { LogWorkout } from './pages/LogWorkout';
import { History } from './pages/History';
import { Progress } from './pages/Progress';
import { Exercises } from './pages/Exercises';
import { Templates } from './pages/Templates';
import { TemplateForm } from './pages/TemplateForm';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/log/:templateId" element={<LogWorkout />} />
          <Route path="/history" element={<History />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/exercises" element={<Exercises />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/templates/new" element={<TemplateForm />} />
          <Route path="/templates/edit/:templateId" element={<TemplateForm />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
