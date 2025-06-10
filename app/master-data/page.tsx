"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import DashboardLayout from '@/components/dashboard-layout';
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import {
  Users,
  Package,
  Building2,
  MapPin
} from "lucide-react";

const masterDataModules = [
  {
    title: "Client Module",
    icon: Users,
    href: "/master-data/clients",
    color: "text-blue-500",
    description: "Manage client information and profiles"
  },
  {
    title: "Commodity Module",
    icon: Package,
    href: "/master-data/commodities",
    color: "text-green-500",
    description: "Manage commodity types and specifications"
  },
  {
    title: "Bank Module",
    icon: Building2,
    href: "/master-data/banks",
    color: "text-purple-500",
    description: "Manage bank information and details"
  },
  {
    title: "Branch & Location Module",
    icon: MapPin,
    href: "/master-data/branches",
    color: "text-orange-500",
    description: "Manage branch and location data"
  },
];

export default function MasterDataPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Redirect supervisors who don't have access
  useEffect(() => {
    if (user?.role === 'supervisor') {
      router.push('/dashboard');
    }
  }, [user?.role, router]);

  if (user?.role === 'supervisor') return null;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Master Data</h1>
          <p className="text-muted-foreground">Manage warehouse master data and configurations.</p>
        </div>
        
        {/* Master Data Module Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {masterDataModules.map((module) => {
            const Icon = module.icon;
            return (
              <Link key={module.title} href={module.href} className="w-full">
                <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 h-full">
                  <CardContent className="p-6 flex flex-col items-center justify-center space-y-4 text-center h-full">
                    <div className="p-3 rounded-lg bg-white shadow-sm">
                      <Icon className={`w-8 h-8 ${module.color}`} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-300 pb-1">
                        {module.title}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {module.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Additional Info Section */}
        <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">i</span>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-blue-900">Master Data Management</h4>
              <p className="text-sm text-blue-700 mt-1">
                Configure and manage essential warehouse data including clients, commodities, banking information, and location details. 
                These modules form the foundation of your warehouse management system.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}