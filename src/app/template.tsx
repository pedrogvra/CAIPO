'use client';

import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';

export default function Template({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const isAuthPage = ['/login', '/cadastro', '/recuperar-senha'].includes(pathname);

  if (pathname === '/pomodoro') return null;

  return (
    <motion.div
      initial={isAuthPage ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{
        display: 'flex',
        flex: '1 1 auto',
        flexDirection: 'column',
        minWidth: 0,
        minHeight: 0,
        width: '100%',
        maxWidth: '100%',
        overflowX: 'clip',
      }}
    >
      {children}
    </motion.div>
  );
}
