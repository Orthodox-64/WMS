'use client';

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useRouter } from 'next/navigation';

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
  const [role, setRole] = useState<"maker" | "checker">("maker");
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        // Login
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Get user data from Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.username !== username) {
            throw new Error("Username does not match");
          }
        } else {
          throw new Error("User data not found");
        }

        setAlertMessage("Successfully logged in! Redirecting to dashboard...");
        setShowAlert(true);
        setTimeout(() => {
          setShowAlert(false);
          router.push('/dashboard');
        }, 2000);
      } else {
        // Register
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Store additional user data in Firestore
        await setDoc(doc(db, "users", user.uid), {
          username,
          email,
          role,
          createdAt: new Date().toISOString()
        });

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
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Reset Password",
        description: "Please check your email to reset the password",
        variant: "default",
        className: "bg-green-100 border-green-500 text-green-700"
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
    <div className="relative">{/* Remove the alert div since we're using toast */}
      
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
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="maker"
                      value="maker"
                      checked={role === "maker"}
                      onChange={(e) => setRole(e.target.value as "maker" | "checker")}
                      className="text-orange-500 focus:ring-orange-500"
                    />
                    <Label htmlFor="maker" className="text-green-600">Maker</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="checker"
                      value="checker"
                      checked={role === "checker"}
                      onChange={(e) => setRole(e.target.value as "maker" | "checker")}
                      className="text-orange-500 focus:ring-orange-500"
                    />
                    <Label htmlFor="checker" className="text-green-600">Checker</Label>
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
