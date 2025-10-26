'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function BottomNav() {
  const pathname = usePathname();
  
  const isActive = (path: string) => pathname === path;
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-sui-dark/95 backdrop-blur-lg border-t border-white/10 z-50 md:hidden">
      <div className="flex items-center justify-around px-1 py-2">
        <Link 
          href="/" 
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${isActive('/') ? 'text-gradient' : 'text-gray-400'}`}
        >
          <span className="text-xl">🏠</span>
          <span className="text-[10px] font-medium">Home</span>
        </Link>
        
        <Link 
          href="/tokens" 
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${isActive('/tokens') ? 'text-gradient' : 'text-gray-400'}`}
        >
          <span className="text-xl">🔥</span>
          <span className="text-[10px] font-medium">Tokens</span>
        </Link>
        
        <Link 
          href="/faucet" 
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${isActive('/faucet') ? 'text-gradient' : 'text-gray-400'}`}
        >
          <span className="text-xl">💧</span>
          <span className="text-[10px] font-medium">Faucet</span>
        </Link>
        
        <Link 
          href="/portfolio" 
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${isActive('/portfolio') ? 'text-gradient' : 'text-gray-400'}`}
        >
          <span className="text-xl">💼</span>
          <span className="text-[10px] font-medium">Portfolio</span>
        </Link>
        
        <Link 
          href="/referrals" 
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${isActive('/referrals') ? 'text-gradient' : 'text-gray-400'}`}
        >
          <span className="text-xl">🎁</span>
          <span className="text-[10px] font-medium">Referrals</span>
        </Link>
      </div>
    </nav>
  );
}
