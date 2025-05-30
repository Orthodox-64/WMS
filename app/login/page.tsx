"use client";



import { WarehouseIcon } from 'lucide-react';
import { AuthForms } from "@/components/auth/auth-forms";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="p-4 w-full max-w-[400px]">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <WarehouseIcon size={40} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold">AgroGreen Warehousing</h1>
          <p className="text-muted-foreground mt-2">Login or register to continue</p>
        </div>
        <AuthForms />
      </div>
    </div>
  );
}
