'use client';

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/contexts/AuthContext";

interface AuthFormsProps {
  onFormTypeChange: (isLogin: boolean) => void;
}

export function AuthForms({ onFormTypeChange }: AuthFormsProps) {
  // States
  const [isLogin, setIsLogin] = useState(true);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"maker" | "checker" | "admin">("maker");
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  
  const { toast } = useToast();
  const router = useRouter();
  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        // Call the login function from auth context
        await login(username, email, password);

        // Show success message
        toast({
          title: "Success",
          description: "Successfully logged in!",
          variant: "default",
          className: "bg-green-100 border-green-500 text-green-700"
        });
      } else {
        // Register - Just use the auth context register function
        await register(username, email, password, role);

        setAlertMessage("Registration successful! Please log in to continue.");
        setShowAlert(true);
        setTimeout(() => {
          setShowAlert(false);
          setIsLogin(true);
          onFormTypeChange(true);
        }, 2000);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // For now, just show a message that password reset is not implemented
      toast({
        title: "Password Reset",
        description: "Password reset functionality will be implemented soon. Please contact the administrator.",
        variant: "default",
        className: "bg-blue-100 border-blue-500 text-blue-700"
      });
      setIsResetPassword(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handleFormTypeChange = (newIsLogin: boolean) => {
    setIsLogin(newIsLogin);
    setIsResetPassword(false);
    onFormTypeChange(newIsLogin);
    setUsername("");
    setEmail("");
    setPassword("");
    setShowAlert(false);
  };

  return (
    <div className="relative">
      <Card className="w-[350px] border-2 border-orange-500 bg-white/95 shadow-lg backdrop-blur-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-orange-600">
            {isResetPassword ? "Reset Password" : isLogin ? "Login" : "Register"}
          </CardTitle>
          <CardDescription className="text-green-500">
            {isResetPassword
              ? "Enter your email to reset password"
              : isLogin
              ? "Enter your credentials to login"
              : "Create a new account with your details"}
          </CardDescription>
        </CardHeader>

        <form onSubmit={isResetPassword ? handleResetPassword : handleSubmit}>
          <CardContent className="space-y-4">
            {!isResetPassword && (
              <div className="space-y-2">
                <Label htmlFor="username" className="text-orange-600">Username</Label>
                <Input
                  id="username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="border-orange-500 focus:ring-orange-500 focus:border-orange-500 text-orange-600 placeholder:text-green-500"
                />
              </div>
            )}

            {(!isLogin || isResetPassword) && (
              <div className="space-y-2">
                <Label htmlFor="email" className="text-orange-600">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-orange-500 focus:ring-orange-500 focus:border-orange-500 text-orange-600 placeholder:text-green-500"
                />
              </div>
            )}

            {!isResetPassword && (
              <div className="space-y-2">
                <Label htmlFor="password" className="text-orange-600">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-orange-500 focus:ring-orange-500 focus:border-orange-500 text-orange-600 placeholder:text-green-500"
                />
              </div>
            )}

            {!isLogin && !isResetPassword && (
              <div className="space-y-2">
                <Label className="text-orange-600">Role</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="maker"
                      value="maker"
                      checked={role === "maker"}
                      onChange={(e) => setRole(e.target.value as "maker" | "checker" | "admin")}
                      className="text-orange-500 focus:ring-orange-500"
                    />
                    <Label htmlFor="maker" className="text-green-600 text-sm">Maker</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="checker"
                      value="checker"
                      checked={role === "checker"}
                      onChange={(e) => setRole(e.target.value as "maker" | "checker" | "admin")}
                      className="text-orange-500 focus:ring-orange-500"
                    />
                    <Label htmlFor="checker" className="text-green-600 text-sm">Checker</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="admin"
                      value="admin"
                      checked={role === "admin"}
                      onChange={(e) => setRole(e.target.value as "maker" | "checker" | "admin")}
                      className="text-orange-500 focus:ring-orange-500"
                    />
                    <Label htmlFor="admin" className="text-green-600 text-sm">Admin</Label>
                  </div>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isResetPassword ? "Reset Password" : isLogin ? "Login" : "Register"}
            </Button>

            {isLogin && !isResetPassword && (
              <Button
                type="button"
                variant="link"
                className="text-green-600 hover:text-green-700"
                onClick={() => setIsResetPassword(true)}
              >
                Forgot Password?
              </Button>
            )}

            {!isResetPassword && (
              <Button
                type="button"
                variant="link"
                className="text-green-600 hover:text-green-700"
                onClick={() => handleFormTypeChange(!isLogin)}
              >
                {isLogin ? "Need an account? Register" : "Already have an account? Login"}
              </Button>
            )}

            {isResetPassword && (
              <Button
                type="button"
                variant="link"
                className="text-green-600 hover:text-green-700"
                onClick={() => setIsResetPassword(false)}
              >
                Back to Login
              </Button>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
