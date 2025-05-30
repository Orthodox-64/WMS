"use client";

import { useAuth } from '@/contexts/Auth';
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
import { useState } from 'react';

export default function Header() {
  const { user, userRole, logout } = useAuth();
  const pathname = usePathname();
  const [isNavOpen, setIsNavOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      allowedRoles: ['admin', 'supervisor']
    },
    {
      name: 'UH Surveys',
      href: '/surveys',
      icon: ClipboardList,
      allowedRoles: ['admin', 'supervisor']
    },
    {
      name: 'Inward',
      href: '/inward',
      icon: ArrowDownCircle,
      allowedRoles: ['admin', 'supervisor']
    },
    {
      name: 'Outward',
      href: '/outward',
      icon: ArrowUpCircle,
      allowedRoles: ['admin', 'supervisor']
    },
    {
      name: 'Reports',
      href: '/reports',
      icon: FileBarChart2,
      allowedRoles: ['admin', 'supervisor']
    },
    {
      name: 'Release Order',
      href: '/ro',
      icon: FileOutput,
      allowedRoles: ['admin']
    },
    {
      name: 'Master Data',
      href: '/master-data',
      icon: Database,
      allowedRoles: ['admin']
    }
  ];

  return (
    <header className="border-b border-border h-16 px-6 flex items-center justify-between bg-card z-10 w-full relative">
      <div className="flex items-center gap-4">
        <Image src="/logo 3.jpeg" alt="AgroGreen Logo" width={40} height={40} />
        <div className="font-bold text-xl text-primary">AgroGreen Warehousing</div>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setIsNavOpen(!isNavOpen)}
          aria-label="Toggle navigation"
        >
          <MenuIcon size={24} />
        </Button>

        <nav className={cn(
          "md:flex items-center space-x-4 ml-6",
          isNavOpen ? "absolute top-16 left-0 w-full bg-card shadow-md flex-col space-x-0 space-y-2 p-4 md:relative md:flex-row md:space-y-0 md:p-0 md:shadow-none" : "hidden md:flex"
        )}>
          {navigationItems
            .filter(item => item.allowedRoles.includes(userRole as string))
            .map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsNavOpen(false)}
                className={cn(
                  "flex items-center gap-1 text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "text-primary"
                    : "text-muted-foreground hover:text-primary"
                )}
              >
                <span>{item.name}</span>
              </Link>
            ))}
        </nav>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold">{user?.username} ({user?.role})</p>
          </div>
          <Button variant="ghost" onClick={handleLogout} className="text-primary hover:text-primary/80 hover:bg-transparent">
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}