'use client';

import Image from 'next/image';
import authBackground from '../../../assets/Caipo fundo.svg';
import caipoLogo from '../../../assets/Caipo logo.svg';
import caipoMascot from '../../../assets/Caipo boneco.svg';

interface AuthLayoutProps {
  children: React.ReactNode;
  showMascot?: boolean;
}

export default function AuthLayout({ children, showMascot = true }: AuthLayoutProps) {
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

        {showMascot && (
          <div className="auth-mascot" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 10, marginBottom: 24, minHeight: 230 }}>
            <Image
              src={caipoMascot}
              alt="Caipo mascote"
              width={240}
              height={240}
              priority
              style={{ objectFit: 'contain', display: 'block' }}
            />
          </div>
        )}

        <div style={{ color: 'white', fontSize: 'clamp(18px, 2vw, 28px)', fontFamily: 'Poppins', fontWeight: 700, textAlign: 'center', lineHeight: '30px', marginTop: 4 }}>
          Planeje hoje. Conquiste amanhã
        </div>
      </div>

      <div className="auth-right-panel" style={{
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
      }}>
        <div className="auth-form-card" style={{ width: '100%', maxWidth: 420, marginLeft: 'clamp(12px, 4vw, 72px)' }}>
          {children}
        </div>
      </div>

      <style jsx global>{`
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

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
          width: 100%;
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
            min-height: 180px;
            padding: 20px 16px 8px;
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
        }

        @media (max-width: 767px) {
          .auth-shell {
            padding: 0;
            align-items: stretch !important;
            justify-content: flex-start !important;
            flex-direction: column !important;
            width: 100vw !important;
            max-width: 100vw;
            background: linear-gradient(180deg, #091541 0%, #2d7ce3 100%);
          }
          .auth-side-illustration {
            display: none;
          }
          .auth-left-panel {
            width: 100% !important;
            height: auto !important;
            flex: 0 0 auto !important;
            min-width: 0;
            padding: 28px 20px 16px;
            min-height: auto;
            justify-content: flex-start;
            background: linear-gradient(180deg, #091541 0%, #0e255d 42%, #3d78d3 100%);
            border-bottom-left-radius: 92px;
            border-bottom-right-radius: 92px;
            position: relative;
            overflow: hidden;
          }
          .auth-left-panel::after {
            content: '';
            position: absolute;
            bottom: -30px;
            left: 50%;
            transform: translateX(-50%);
            width: 220%;
            height: 96px;
            background: #4d8be3;
            border-radius: 50%;
            z-index: 0;
          }
          .auth-logo-row {
            justify-content: center;
            padding-left: 0;
            margin-bottom: 8px;
          }
          .auth-mascot {
            margin-top: 4px;
            margin-bottom: 10px;
            min-height: 160px;
            max-width: 180px;
            width: 100%;
          }
          .auth-mascot img {
            width: 100%;
            height: auto;
          }
          .auth-left-panel > div:not(.auth-mascot) {
            position: relative;
            z-index: 1;
          }
          .auth-tagline {
            display: none;
          }
          .auth-right-panel {
            width: 100% !important;
            height: auto !important;
            flex: 0 0 auto !important;
            min-width: 0;
            padding: 16px 18px 32px;
            margin-top: 0;
            z-index: 1;
          }
          .auth-form-card {
            width: 100%;
            max-width: 95%;
            margin: 0 auto;
            padding: 0;
            border-radius: 0;
            background: transparent;
            box-shadow: none;
            border: none;
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
            min-height: 100vh;
          }
          .auth-side-illustration img {
            object-position: center top;
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
