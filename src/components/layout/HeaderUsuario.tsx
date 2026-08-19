'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import userIcon from '../../../assets/icons/do-utilizador.svg';
import settingsIcon from '../../../assets/icons/definicoes.svg';

export default function HeaderUsuario() {
  const router = useRouter();
  const { usuario } = useAuth();

  const nomePartes = usuario?.nome?.split(' ') || ['Usuário'];
  const primeiroNome = nomePartes[0] || '';
  const sobrenome = nomePartes.slice(1).join(' ') || '';

  return (
    <div style={{
      background: 'white',
      boxShadow: '6px 6px 10.6px rgba(0, 0, 0, 0.25)',
      borderRadius: 20,
      padding: '10px 4px',
      display: 'flex',
      gap: 8,
      alignItems: 'center',
      minWidth: 222,
    }}>
      {/* User icon */}
      <div style={{ width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Image src={userIcon} alt="Usuário" width={32} height={32} style={{ filter: 'brightness(0) saturate(100%) invert(24%) sepia(42%) saturate(1491%) hue-rotate(181deg) brightness(93%) contrast(94%)' }} />
      </div>

      {/* Name */}
      <div style={{ width: 128, color: '#1E55A8', fontSize: 16, fontFamily: 'Poppins', fontWeight: 600, lineHeight: '18px' }}>
        <div>{primeiroNome}</div>
        {sobrenome && <div>{sobrenome}</div>}
      </div>

      {/* Settings icon */}
      <div
        onClick={() => router.push('/configuracoes')}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
      >
        <Image src={settingsIcon} alt="Configurações" width={28} height={28} style={{ filter: 'brightness(0) saturate(100%) invert(24%) sepia(42%) saturate(1491%) hue-rotate(181deg) brightness(93%) contrast(94%)' }} />
      </div>
    </div>
  );
}
