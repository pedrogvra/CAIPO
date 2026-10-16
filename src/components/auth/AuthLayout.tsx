'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import authBackground from '../../../assets/Caipo fundo.svg';
import caipoLogo from '../../../assets/Caipo logo.svg';
import caipoMascot from '../../../assets/Caipo boneco.svg';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const pathname = usePathname();

  useEffect(() => {
    const main = document.querySelector('.app-main');
    if (main) main.scrollTop = 0;
  }, [pathname]);

  return (
    <div className="auth-shell" style={{
      width: '100%',
      minHeight: '100vh',
      position: 'relative',
      background: '#091541',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div className="auth-side-illustration" aria-hidden="true">
        <Image
          src={authBackground}
          alt=""
          fill
          priority
          style={{ objectFit: 'cover', objectPosition: 'right center' }}
        />
      </div>

      <div className="auth-left-panel" style={{
        position: 'relative',
        left: 0,
        top: 0,
        width: 'min(100%, 52%)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
        padding: '10px clamp(16px, 5vw, 60px) 28px',
      }}>
        <div className="auth-logo-row" style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'center', paddingLeft: 18, marginTop: 4, marginBottom: 18 }}>
          <Image
            src={caipoLogo}
            alt="Caipo"
            width={170}
            height={68}
            priority
            style={{ objectFit: 'contain', display: 'block' }}
          />
        </div>
        <div className="auth-mascot">
          <Image
            src={caipoMascot}
            alt="Caipo mascote"
            width={240}
            height={240}
            priority
            style={{ objectFit: 'contain', display: 'block', width: 240, height: 240 }}
          />
        </div>
        <div className="auth-tagline">
          Planeje hoje. Conquiste amanhã
        </div>
      </div>

      <motion.div
        className="auth-right-panel"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        style={{
          position: 'relative',
          right: 0,
          top: 0,
          width: 'min(100%, 48%)',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
          padding: '24px clamp(16px, 4vw, 40px)',
        }}
      >
        <div className="auth-form-card" style={{ width: '100%', maxWidth: 420, marginLeft: 'clamp(12px, 4vw, 72px)' }}>
          {children}
        </div>
      </motion.div>

      <style jsx global>{`
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
          width: 100%;
        }

        .auth-form-card {
          padding: 0;
          border: none;
          border-radius: 0;
          background: transparent;
          box-shadow: none;
        }

        .auth-side-illustration {
          position: absolute;
          top: 0;
          right: 0;
          width: min(52vw, 796px);
          height: 100%;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .auth-side-illustration img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .auth-mascot {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-top: 10px;
          margin-bottom: 24px;
          min-height: 230px;
        }

        .auth-tagline {
          color: white;
          font-size: clamp(18px, 2vw, 28px);
          font-family: 'Poppins';
          font-weight: 700;
          text-align: center;
          line-height: 30px;
          margin-top: 4px;
        }

        .auth-form-title {
          color: #ffffff;
          font-size: clamp(32px, 4vw, 38px);
          font-weight: 800;
          text-align: center;
          margin-bottom: 8px;
        }

        .auth-form-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
        }

        .auth-name-field {
          gap: 4px;
          margin-bottom: -12px;
        }

        .auth-name-count {
          min-height: 16px;
          line-height: 16px;
        }

        .auth-form-label {
          color: #ffffff;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: 0.01em;
        }

        .auth-form-input {
          width: 100%;
          min-height: 52px;
          padding: 14px 16px;
          border-radius: 18px;
          border: none;
          background: #ffffff;
          color: #091541;
          font-size: 16px;
          font-weight: 700;
          outline: none;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.09);
        }

        .auth-form-input::placeholder {
          color: #b5c0df;
          font-weight: 700;
        }

        .auth-form-row {
          display: flex;
          justify-content: flex-end;
          width: 100%;
        }

        .auth-form-link {
          color: #f8ff87;
          font-weight: 700;
          text-decoration: none;
          font-size: 16px;
        }

        .auth-form-button {
          width: 100%;
          min-height: 56px;
          border-radius: 18px;
          border: none;
          background: #061239;
          color: #ffffff;
          font-size: 18px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 14px 34px rgba(0, 0, 0, 0.2);
        }

        .auth-form-button:disabled {
          opacity: 0.68;
          cursor: not-allowed;
        }

        .auth-form-footer {
          text-align: center;
          color: #ffffff;
          font-size: 14px;
          font-weight: 600;
          line-height: 1.4;
        }

        .auth-form-footer a {
          color: #f8ff87;
          font-weight: 700;
          text-decoration: none;
        }

        .auth-form-error {
          width: 100%;
          border-radius: 16px;
          padding: 14px 16px;
          background: rgba(255, 0, 0, 0.12);
          border: 1px solid rgba(255, 0, 0, 0.35);
          color: #ffd1d1;
          font-weight: 700;
          font-size: 15px;
        }

        .auth-tagline {
          color: #ffffff;
          font-size: clamp(18px, 2vw, 28px);
          font-weight: 700;
          text-align: center;
          line-height: 1.2;
          margin-top: 4px;
        }

        @media (max-width: 1073px) {
          .auth-shell {
            padding: 20px 14px;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .auth-left-panel {
            position: relative;
            width: 52% !important;
            height: auto !important;
            flex: 0 0 52% !important;
            min-width: 0;
            min-height: 120px;
            padding: 24px 16px;
          }
          .auth-right-panel {
            position: relative;
            width: 48% !important;
            height: auto !important;
            flex: 0 0 48% !important;
            min-width: 0;
            padding: 16px;
          }
          .auth-form-card {
            width: 100% !important;
            max-width: 420px;
            margin-left: 0 !important;
          }
          .auth-logo-row {
            justify-content: flex-start !important;
          }
        }

        @media (max-width: 767px) {
          .auth-shell {
            padding: 0 !important;
            align-items: stretch !important;
            justify-content: flex-start !important;
            flex-direction: column !important;
            width: 100vw !important;
            max-width: 100vw;
            min-height: 100dvh !important;
            height: auto !important;
            overflow: visible !important;
            background: linear-gradient(180deg, #091541 0%, #2d7ce3 100%);
          }
          .auth-left-panel {
            width: 100% !important;
            height: auto !important;
            flex: 0 0 auto !important;
            min-width: 0;
            padding: 24px 20px 18px !important;
            min-height: auto;
            justify-content: center;
            background: transparent;
            border-radius: 0;
            position: relative;
            overflow: visible;
          }
          .auth-side-illustration,
          .auth-mascot,
          .auth-tagline {
            display: none !important;
          }
          .auth-logo-row {
            justify-content: center !important;
            padding-left: 0 !important;
            margin: 0 !important;
          }
          .auth-logo-row img {
            width: 140px !important;
            height: auto !important;
          }
          .auth-right-panel {
            width: 100% !important;
            height: auto !important;
            flex: 1 0 auto !important;
            min-width: 0;
            padding: 24px 18px 40px !important;
            margin-top: 0;
            z-index: 1;
          }
          .auth-form-card {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto;
            padding: 20px;
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 20px;
            background: #1e55a8;
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.24);
          }
          .auth-form-card > * {
            width: 100%;
          }
          .auth-form {
            gap: 20px;
          }
          .auth-form-title {
            font-size: 36px;
            margin-bottom: 6px;
          }
          .auth-form-button {
            min-height: 64px;
            border-radius: 18px;
          }
          .auth-form-row {
            justify-content: flex-start;
          }
          .auth-form-link {
            font-size: 15px;
          }
          .auth-shell {
            min-height: 100dvh !important;
          }
          .auth-left-panel {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          .auth-left-panel > div {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
