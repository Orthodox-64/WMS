"use client";

import { WarehouseIcon } from 'lucide-react';
import { AuthForms } from "@/components/auth/auth-forms";
import { useState } from "react";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="p-4 w-full max-w-[400px]">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <WarehouseIcon size={40} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Agrogreen Warehousing Private Limited</h1>
          <p className="text-muted-foreground mt-2">
            {isLogin 
              ? "Welcome to our portal for login, so as to access our services"
              : "Welcome to our portal for registration, so as to be a part of our access"}
          </p>
        </div>
        <AuthForms onFormTypeChange={setIsLogin} />
      </div>
    </div>
  );
}
