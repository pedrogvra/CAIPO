 'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import caipoLogo from '../../../assets/Caipo logo.svg';
import homeIcon from '../../../assets/icons/casa.svg';
import calendarIcon from '../../../assets/icons/calendario.svg';
import frequencyIcon from '../../../assets/icons/chama.svg';
import pomodoroIcon from '../../../assets/icons/despertador.svg';
import logoutIcon from '../../../assets/icons/saida.svg';
import { usePomodoroFocus } from '@/contexts/PomodoroFocusContext';

interface SidebarProps {
  activeItem?: 'inicio' | 'cronograma' | 'frequencia' | 'pomodoro';
}

export default function Sidebar({ activeItem }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();
  const { requestNavigation } = usePomodoroFocus();
  const [menuAberto, setMenuAberto] = useState(false);
  const [paginaRolada, setPaginaRolada] = useState(false);

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

  useEffect(() => {
    const main = document.querySelector('.app-main');
    if (!main) return;

    const handleScroll = () => {
      setPaginaRolada(main.scrollTop > 24);
    };

    handleScroll();
    main.addEventListener('scroll', handleScroll, { passive: true });
    return () => main.removeEventListener('scroll', handleScroll);
  }, [pathname]);

  const current = activeItem || (
    pathname.includes('/cronograma') ? 'cronograma' :
    pathname.includes('/frequencia') ? 'frequencia' :
    pathname.includes('/pomodoro') ? 'pomodoro' : 'inicio'
  );

  const hiddenStyle = shouldRenderSidebar ? {} : { display: 'none' };

  const handleLogout = () => {
    requestNavigation(() => {
      setMenuAberto(false);
      void logout().then(() => router.push('/login'));
    });
  };

  const navItem = (key: string, label: string, path: string, icon: React.ReactNode) => {
    const isActive = current === key;
    return (
      <Link
        href={path}
        onClick={(event) => {
          if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          if (pathname === path) {
            setMenuAberto(false);
            return;
          }
          requestNavigation(() => {
            setMenuAberto(false);
            router.push(path);
          });
        }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 10px',
          borderRadius: 10,
          cursor: 'pointer',
          background: isActive ? 'rgba(83,149,207,0.50)' : 'transparent',
          minHeight: 48,
          width: '100%',
          color: 'inherit',
          textDecoration: 'none',
        }}
      >
        {icon}
        <span style={{ color: 'white', fontSize: 16, fontFamily: 'Poppins', fontWeight: 600, lineHeight: '18px' }}>
          {label}
        </span>
      </Link>
    );
  };

  return (
    <>
      {shouldRenderSidebar && (
        <button
          type="button"
          className={`mobile-menu-toggle${paginaRolada && !menuAberto ? ' mobile-menu-toggle-hidden' : ''}`}
          aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuAberto}
          aria-controls="site-navigation"
          onClick={() => setMenuAberto((aberto) => !aberto)}
        >
          <span />
          <span />
          <span />
        </button>
      )}
      {shouldRenderSidebar && menuAberto && (
        <button
          type="button"
          className="mobile-menu-backdrop"
          aria-label="Fechar menu"
          onClick={() => setMenuAberto(false)}
        />
      )}
      <div
        id="site-navigation"
        className={`sidebar-shell${menuAberto ? ' mobile-menu-open' : ''}`}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 'var(--sidebar-width)',
          height: '100dvh',
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
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <Image src={caipoLogo} alt="Caipo logo" width={120} height={50} style={{ objectFit: 'contain', width: '120px', height: 'auto' }} />
        </div>

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

        <div style={{ flex: 1 }} />

        <button
          type="button"
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 10px',
            cursor: 'pointer',
            width: '100%',
            border: 0,
            background: 'transparent',
            textAlign: 'left',
          }}
        >
          <Image src={logoutIcon} alt="" width={24} height={24} style={{ filter: 'brightness(0) invert(1)' }} />
          <span style={{ color: 'white', fontSize: 16, fontFamily: 'Poppins', fontWeight: 600 }}>Sair</span>
        </button>
      </div>
    </>
  );
}
