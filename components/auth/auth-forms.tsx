'use client';

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/Auth";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function AuthForms() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [role, setRole] = useState<"maker" | "checker" | "admin">("maker");
  const { login, register } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await login(username, password);
      } else {
        await register(username, phoneNumber, password, role);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-[350px] border-2 border-orange-500 bg-white/95 shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-orange-600">{isLogin ? "Login" : "Register"}</CardTitle>
        <CardDescription className="text-green-500">
          {isLogin
            ? "Enter your username and password to login"
            : "Create a new account with your details"}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
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
          
          {!isLogin && (
            <>
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
                <Label className="text-orange-600">Role</Label>
                <RadioGroup
                  value={role}
                  onValueChange={(value) => setRole(value as "maker" | "checker" | "admin")}
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
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="admin" id="admin" className="border-orange-500 text-orange-500" />
                    <Label htmlFor="admin" className="text-green-600">Admin</Label>
                  </div>
                </RadioGroup>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button 
            type="submit" 
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
          >
            {isLogin ? "Login" : "Register"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full text-green-600 hover:text-green-700 hover:bg-green-50"
            onClick={() => {
              setIsLogin(!isLogin);
              setUsername("");
              setPassword("");
              setPhoneNumber("");
            }}
          >
            {isLogin
              ? "Don't have an account? Register"
              : "Already have an account? Login"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
