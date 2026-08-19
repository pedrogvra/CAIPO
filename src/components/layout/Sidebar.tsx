 'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import caipoLogo from '../../../assets/Caipo logo.svg';
import homeIcon from '../../../assets/icons/casa.svg';
import calendarIcon from '../../../assets/icons/calendario.svg';
import frequencyIcon from '../../../assets/icons/chama.svg';
import pomodoroIcon from '../../../assets/icons/despertador.svg';
import logoutIcon from '../../../assets/icons/saida.svg';

interface SidebarProps {
  activeItem?: 'inicio' | 'cronograma' | 'frequencia' | 'pomodoro';
}

export default function Sidebar({ activeItem }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();

  const rotasSemSidebar = ['/login', '/cadastro', '/recuperar-senha', '/onboarding', '/questionario', '/feedback'];
  const shouldRenderSidebar = !rotasSemSidebar.includes(pathname);

  useEffect(() => {
    if (!shouldRenderSidebar) {
      document.documentElement.classList.remove('has-sidebar');
      return;
    }

    document.documentElement.classList.add('has-sidebar');
    return () => document.documentElement.classList.remove('has-sidebar');
  }, [shouldRenderSidebar]);

  const current = activeItem || (
    pathname.includes('/cronograma') ? 'cronograma' :
    pathname.includes('/frequencia') ? 'frequencia' :
    pathname.includes('/pomodoro') ? 'pomodoro' : 'inicio'
  );

  const hiddenStyle = shouldRenderSidebar ? {} : { display: 'none' };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const navItem = (key: string, label: string, path: string, icon: React.ReactNode) => {
    const isActive = current === key;
    return (
      <div
        onClick={() => router.push(path)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 10px',
          borderRadius: 10,
          cursor: 'pointer',
          background: isActive ? 'rgba(83,149,207,0.50)' : 'transparent',
          minHeight: 48,
          width: '100%',
        }}
      >
        {icon}
        <span style={{ color: 'white', fontSize: 16, fontFamily: 'Poppins', fontWeight: 600, lineHeight: '18px' }}>
          {label}
        </span>
      </div>
    );
  };

  return (
    <div className="sidebar-shell" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: 'var(--sidebar-width)',
      height: '100vh',
      background: 'linear-gradient(180deg, #1E55A8 0%, #091541 100%)',
      boxShadow: '6px 6px 10.6px rgba(0, 0, 0, 0.25)',
      borderTopRightRadius: 25,
      borderBottomRightRadius: 25,
      padding: '27px 6px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      zIndex: 40,
      ...hiddenStyle,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <Image src={caipoLogo} alt="Caipo logo" width={120} height={50} style={{ objectFit: 'contain', width: '120px', height: 'auto' }} />
      </div>

      {/* Nav items */}
      {navItem('inicio', 'Início', '/dashboard',
        <Image src={homeIcon} alt="Início" width={24} height={24} style={{ filter: 'brightness(0) invert(1)' }} />
      )}
      {navItem('cronograma', 'Cronograma', '/cronograma',
        <Image src={calendarIcon} alt="Cronograma" width={24} height={24} style={{ filter: 'brightness(0) invert(1)' }} />
      )}
      {navItem('frequencia', 'Frequência', '/frequencia',
        <Image src={frequencyIcon} alt="Frequência" width={24} height={24} style={{ filter: 'brightness(0) invert(1)' }} />
      )}
      {navItem('pomodoro', 'Pomodoro', '/pomodoro',
        <Image src={pomodoroIcon} alt="Pomodoro" width={24} height={24} style={{ filter: 'brightness(0) invert(1)' }} />
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Sair */}
      <div
        onClick={handleLogout}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 10px',
          cursor: 'pointer',
          width: '100%',
        }}
      >
        <Image src={logoutIcon} alt="Sair" width={24} height={24} style={{ filter: 'brightness(0) invert(1)' }} />
        <span style={{ color: 'white', fontSize: 16, fontFamily: 'Poppins', fontWeight: 600 }}>Sair</span>
      </div>
    </div>
  );
}
