import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectRole } from './authSelectors';

export default function RoleRoute({ roles }) {
  const role = useSelector(selectRole);
  return roles.includes(role) ? <Outlet /> : <Navigate to="/app/unauthorized" replace />;
}
