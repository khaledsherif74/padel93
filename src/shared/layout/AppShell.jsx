import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useState } from 'react';
import { ownerLinks } from './ownerLinks';
import { hubLink } from './hubLink';
import AppHeader from './AppHeader';
import StaffAppHeader from './StaffAppHeader';
import SideNav from './SideNav';
import MobileNav from './MobileNav';
import MobileDrawer from './MobileDrawer';
import { authLoggedOut } from '../../features/auth/authSlice';
import { selectRole, selectUser } from '../../features/auth/authSelectors';
import { useTranslation } from 'react-i18next';

export default function AppShell() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const role = useSelector(selectRole);
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  function logout() {
    dispatch(authLoggedOut());
    navigate('/login', { replace: true });
  }

  const links = getLinksForRole(role);
  const isStaffSection = role === 'STAFF' && pathname.startsWith('/app/staff');

  return (
    <div
      className={`min-h-screen min-w-0 text-navy ${isStaffSection ? 'bg-[#F3F5F9]' : 'bg-white'}`}
    >
      <a href="#main-content" className="skip-link">
        {t('common.skipToContent')}
      </a>

      {isStaffSection ? (
        <StaffAppHeader />
      ) : (
        <AppHeader user={user} onLogout={logout} onMenuClick={() => setDrawerOpen(true)} />
      )}

      <div className="mx-auto flex w-full max-w-[1600px]">
        <SideNav />
        <main
          id="main-content"
          tabIndex={-1}
          className={
            isStaffSection
              ? 'relative z-10 min-w-0 flex-1 p-0 outline-none'
              : `min-w-0 flex-1 px-3 pt-5 outline-none sm:px-6 lg:px-8 lg:pb-10 lg:pt-7 ${role === 'OWNER' ? 'pb-24' : 'pb-10'}`
          }
        >
          <Outlet />
        </main>
      </div>

      <MobileNav />
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} links={links} />
    </div>
  );
}

function getLinksForRole(role) {
  if (role === 'OWNER') return [hubLink, ...ownerLinks];
  return [];
}
