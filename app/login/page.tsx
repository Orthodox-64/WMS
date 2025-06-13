"use client";

import { AuthForms } from "@/components/auth/auth-forms";
import { useState } from "react";
import Image from "next/image";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url("https://png.pngtree.com/background/20230703/original/pngtree-expansive-empty-warehouse-3d-rendered-industrial-space-picture-image_4126616.jpg")' }}>
      <div className="p-4 w-full max-w-[400px]">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image
              src="/Group 86.png"
              alt="Company Logo"
              width={100}
              height={100}
              priority
              className="object-contain"
              style={{ width: 'auto', height: 'auto' }}
            />
          </div>
          <h1 className="text-2xl font-bold text-white">Agrogreen Warehousing Private Limited</h1>
          <p className="text-white/80 mt-2">
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
