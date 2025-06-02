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
import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function Header() {
  const { logout } = useAuth();
  const pathname = usePathname();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [userData, setUserData] = useState<{ username: string; role: string; email: string } | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get current user from Firebase Auth
        const currentUser = auth.currentUser;
        if (currentUser?.uid) {
          // Fetch user data from Firestore
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserData({
              username: data.username,
              role: data.role,
              email: data.email
            });
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    // Set up auth state listener
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchUserData();
      } else {
        setUserData(null);
      }
    });

    return () => unsubscribe();
  }, []);

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
    <header className="border-b border-border h-24 px-8 flex items-center justify-between bg-green-600 z-10 w-full relative">
      <div className="flex items-center gap-4 bg-white rounded-lg">
        <Image src="/AGlogo.webp" alt="AgroGreen Logo" width={180} height={120} />
        
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
            .filter(item => userData?.role && item.allowedRoles.includes(userData.role))
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
        {userData && (
          <div className="hidden sm:flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-white text-sm font-semibold">
                {userData.username[0].toUpperCase()}
              </span>
            </div>
            <div className="flex flex-col">
              <p className="text-sm font-medium text-white">{userData.username}</p>
              <p className="text-xs text-white/80 capitalize">{userData.role}</p>
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