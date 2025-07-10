"use client";

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, MenuIcon } from 'lucide-react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ClipboardList,
  ArrowDownCircle,
  ArrowUpCircle,
  FileBarChart2,
  FileOutput,
  Database,
} from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [isNavOpen, setIsNavOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const navigationItems: Array<{
    name: string;
    href: string;
    icon: any;
    allowedRoles: string[];
  }> = [
    // Dashboard button removed as requested
  ];

  return (
    <header className="border-b border-border h-20 px-4 flex items-center justify-between bg-green-600 z-10 w-full relative">
      <div className="flex items-center gap-3 bg-white rounded-lg px-2 py-1">
        <div className="w-36 h-10 relative">
          <Image 
            src="/AGlogo.webp" 
            alt="AgroGreen Logo" 
            fill
            className="object-contain"
            priority
          />
        </div>
        
        <Button
          variant="secondary"
          size="sm"
          className="md:hidden bg-gray-200 hover:bg-gray-300 text-gray-700"
          onClick={() => setIsNavOpen(!isNavOpen)}
          aria-label="Toggle navigation"
        >
          <MenuIcon size={24} />
        </Button>

        <nav className={cn(
          "md:flex items-center space-x-4 ml-6",
          isNavOpen ? "absolute top-16 left-0 w-full bg-green-600 shadow-md flex-col space-x-0 space-y-2 p-4 md:relative md:flex-row md:space-y-0 md:p-0 md:shadow-none" : "hidden md:flex"
        )}>
          {navigationItems
            .filter(item => user?.role && item.allowedRoles.includes(user.role))
            .map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  setIsNavOpen(false);
                  if (item.name === 'Dashboard' && pathname === '/dashboard') {
                    window.location.reload();
                  }
                }}
                className={cn(
                  "flex items-center gap-1 text-sm font-medium transition-colors px-3 py-1.5 rounded-md",
                  pathname === item.href
                    ? "bg-white/20 text-white font-bold hover:bg-white/30"
                    : "text-white/90 hover:text-white"
                )}
              >
                <span>{item.name}</span>
              </Link>
            ))}
        </nav>
      </div>

      {/* User info and logout */}
      <div className="flex items-center gap-4">
        {user && (
          <div className="hidden sm:flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-white text-sm font-semibold">
                {user.username[0].toUpperCase()}
              </span>
            </div>
            <div className="flex flex-col">
              <p className="text-sm font-medium text-white">{user.username}</p>
              <p className="text-xs text-white/80 capitalize">{user.role}</p>
            </div>
          </div>
        )}
        <Button 
          variant="secondary" 
          size="sm"
          onClick={handleLogout} 
          className="bg-gray-100 hover:bg-gray-200 text-green-600 transition-colors px-3 py-1.5 text-sm"
        >
          <LogOut className="w-4 h-4 mr-1.5" />
          Logout
        </Button>
      </div>
    </header>
  );
}