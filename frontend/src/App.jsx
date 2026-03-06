import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Login from './pages/Login';
import Customers from './pages/Customers';
import Orders from './pages/Orders';
import InventoryManagement from './pages/InventoryManagement';
import BomManagement from './pages/BomManagement';
import StagesManagement from './pages/StagesManagement';
import ProcessEditor from './pages/ProcessEditor';
import Invoices from './pages/Invoices';
import MaterialRequests from './pages/MaterialRequests';
import MaterialCodes from './pages/MaterialCodes';
import QualityControl from './pages/QualityControl';
import Traceability from './pages/Traceability';
import Analytics from './pages/Analytics';
import PlanningDashboard from './pages/PlanningDashboard';
import DesignManagement from './pages/DesignManagement';
import DesignDownloads from './pages/DesignDownloads';
import UserManagement from './pages/UserManagement';
import RoleManagement from './pages/RoleManagement';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="customers" element={<Customers />} />
              <Route path="orders" element={<Orders />} />
              <Route path="inventory" element={<InventoryManagement />} />
              <Route path="bom" element={<BomManagement />} />
              <Route path="materials" element={<MaterialCodes />} />
              <Route path="qc" element={<QualityControl />} />
              <Route path="stages" element={<StagesManagement />} />
              <Route path="process-editor" element={<ProcessEditor />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="material-requests" element={<MaterialRequests />} />
              <Route path="traceability" element={<Traceability />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="planning" element={<PlanningDashboard />} />
              <Route path="design" element={<DesignManagement />} />
              <Route path="design-downloads" element={<DesignDownloads />} />

              {/* Admin only routes */}
              <Route element={<RoleRoute allowedRoles={['admin']} />}>
                <Route path="users" element={<UserManagement />} />
                <Route path="roles" element={<RoleManagement />} />
              </Route>

              {/* Only specific roles can access the upload page */}
              <Route element={<RoleRoute allowedRoles={['admin', 'sales', 'production', 'planning', 'technical', 'qc']} />}>
                <Route path="upload" element={<Upload />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
