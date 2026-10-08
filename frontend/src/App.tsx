import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import Companies from './pages/Companies';
import Dashboard from './pages/Dashboard';
import DataQuality from './pages/DataQuality';
import Demographics from './pages/Demographics';
import Internships from './pages/Internships';
import NotFound from './pages/NotFound';
import Operations from './pages/Operations';
import Stipend from './pages/Stipend';
import Student360 from './pages/Student360';
import Students from './pages/Students';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/students" element={<Students />} />
        <Route path="/demographics" element={<Demographics />} />
        <Route path="/internships" element={<Internships />} />
        <Route path="/companies" element={<Companies />} />
        <Route path="/stipend" element={<Stipend />} />
        <Route path="/operations" element={<Operations />} />
        <Route path="/student-360" element={<Student360 />} />
        <Route path="/student-360/:studentId" element={<Student360 />} />
        <Route path="/data-quality" element={<DataQuality />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
