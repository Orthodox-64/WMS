'use client';

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/Auth";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AuthFormsProps {
  onFormTypeChange: (isLogin: boolean) => void;
}

export function AuthForms({ onFormTypeChange }: AuthFormsProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [role, setRole] = useState<"maker" | "checker">("maker");
  const [showAlert, setShowAlert] = useState(false);
  const { login, register } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await login(phoneNumber, password, username);
        setShowAlert(true);
        setTimeout(() => {
          setShowAlert(false);
        }, 3000);
      } else {
        await register(username, phoneNumber, password, role);
        setShowAlert(true);
        setTimeout(() => {
          setShowAlert(false);
        }, 3000);
      }
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
    onFormTypeChange(newIsLogin);
    setUsername("");
    setPassword("");
    setPhoneNumber("");
    setShowAlert(false);
  };

  return (
    <>
      {showAlert && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <Alert className="bg-green-100 border-green-500 text-green-700 shadow-lg w-full max-w-md mx-auto mt-4 py-2">
            <AlertDescription className="text-center font-medium text-base">
              {isLogin 
                ? "Thank you, welcome to Agrogreen Warehousing Private Limited!"
                : "Thank you for registering, welcome to Agrogreen Warehousing Private Limited!"}
            </AlertDescription>
          </Alert>
        </div>
      )}
      <Card className="w-[350px] border-2 border-orange-500 bg-white/95 shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-orange-600">{isLogin ? "Login" : "Register"}</CardTitle>
          <CardDescription className="text-green-500">
            {isLogin
              ? "Enter your phone number and password to login"
              : "Create a new account with your details"}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-orange-600">Username</Label>
              <Input
                id="username"
                placeholder="Enter your username (alphabets and spaces only)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="border-orange-500 focus:ring-orange-500 focus:border-orange-500 text-orange-600 placeholder:text-green-500"
              />
              <p className="text-xs text-green-500">Only alphabets and spaces allowed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-orange-600">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter your phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                className="border-orange-500 focus:ring-orange-500 focus:border-orange-500 text-orange-600 placeholder:text-green-500"
              />
            </div>

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
              <p className="text-xs text-green-500">
                Must be at least 8 characters, start with a capital letter, and include a special character and number
              </p>
            </div>
            
            {!isLogin && (
              <div className="space-y-2">
                <Label className="text-orange-600">Role</Label>
                <RadioGroup
                  value={role}
                  onValueChange={(value) => setRole(value as "maker" | "checker")}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="maker" id="maker" className="border-orange-500 text-orange-500" />
                    <Label htmlFor="maker" className="text-green-600">Maker</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="checker" id="checker" className="border-orange-500 text-orange-500" />
                    <Label htmlFor="checker" className="text-green-600">Checker</Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-md"
            >
              {isLogin ? "Login" : "Register"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full bg-green-100 hover:bg-green-200 text-green-700 font-semibold shadow-sm"
              onClick={() => handleFormTypeChange(!isLogin)}
            >
              {isLogin
                ? "Don't have an account? Register"
                : "Already have an account? Login"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </>
  );
}
