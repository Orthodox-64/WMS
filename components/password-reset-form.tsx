'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePasswordReset } from '@/hooks/use-password-reset';
import { useToast } from '@/hooks/use-toast';
import { 
  Mail, 
  Shield, 
  CheckCircle, 
  ArrowLeft, 
  Clock, 
  Key,
  AlertCircle 
} from 'lucide-react';

interface PasswordResetFormProps {
  onBackToLogin?: () => void;
  className?: string;
}

export function PasswordResetForm({ onBackToLogin, className }: PasswordResetFormProps) {
  const {
    step,
    email,
    username,
    isLoading,
    error,
    sendOTP,
    verifyOTP,
    resetPassword,
    resetState,
    clearError
  } = usePasswordReset();

  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { toast } = useToast();

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const email = formData.get('email') as string;

    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive"
      });
      return;
    }

    const success = await sendOTP(email);
    if (success) {
      toast({
        title: "OTP Sent",
        description: "Please check your email for the OTP code",
        variant: "default",
        className: "bg-green-100 border-green-500 text-green-700"
      });
    } else {
      toast({
        title: "Error",
        description: error || "Failed to send OTP",
        variant: "destructive"
      });
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otpCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter the OTP code",
        variant: "destructive"
      });
      return;
    }

    const success = await verifyOTP(otpCode);
    if (success) {
      toast({
        title: "OTP Verified",
        description: "Please enter your new password",
        variant: "default",
        className: "bg-green-100 border-green-500 text-green-700"
      });
    } else {
      toast({
        title: "Error",
        description: error || "Invalid OTP code",
        variant: "destructive"
      });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please enter and confirm your new password",
        variant: "destructive"
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    const success = await resetPassword(newPassword);
    if (success) {
      toast({
        title: "Password Reset Successful",
        description: "Your password has been reset. Please check your email for the new password.",
        variant: "default",
        className: "bg-green-100 border-green-500 text-green-700"
      });
    } else {
      toast({
        title: "Error",
        description: error || "Failed to reset password",
        variant: "destructive"
      });
    }
  };

  const handleBackToLogin = () => {
    resetState();
    onBackToLogin?.();
  };

  const handleResendOTP = async () => {
    if (!email) return;
    
    const success = await sendOTP(email);
    if (success) {
      toast({
        title: "OTP Resent",
        description: "A new OTP has been sent to your email",
        variant: "default",
        className: "bg-blue-100 border-blue-500 text-blue-700"
      });
    }
  };

  return (
    <Card className={`w-full max-w-md mx-auto px-4 ${className}`}>
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold text-orange-600">
            {step === 'email' && 'Reset Password'}
            {step === 'otp' && 'Verify OTP'}
            {step === 'new-password' && 'New Password'}
            {step === 'success' && 'Success'}
          </CardTitle>
          {step !== 'email' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToLogin}
              className="text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
        </div>
        <CardDescription className="text-green-500">
          {step === 'email' && 'Enter your email address to receive an OTP'}
          {step === 'otp' && `Enter the OTP sent to ${email}`}
          {step === 'new-password' && 'Enter your new password'}
          {step === 'success' && 'Your password has been reset successfully'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert className="border-red-500 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-700">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Step 1: Email Input */}
        {step === 'email' && (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-orange-600">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your registered email"
                  required
                  className="pl-10 border-orange-500 focus:ring-orange-500 focus:border-orange-500 text-orange-600 placeholder:text-green-500"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isLoading ? 'Sending...' : 'Send OTP'}
            </Button>
          </form>
        )}

        {/* Step 2: OTP Verification */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp" className="text-orange-600">OTP Code</Label>
              <div className="relative">
                <Shield className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  required
                  className="pl-10 border-orange-500 focus:ring-orange-500 focus:border-orange-500 text-orange-600 placeholder:text-green-500 text-center text-2xl tracking-widest"
                />
              </div>
              <p className="text-sm text-gray-500 text-center">
                OTP sent to <strong>{email}</strong>
              </p>
            </div>
            
            <div className="flex space-x-2">
              <Button
                type="submit"
                disabled={isLoading || otpCode.length !== 6}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
              >
                {isLoading ? 'Verifying...' : 'Verify OTP'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleResendOTP}
                disabled={isLoading}
                className="px-3"
              >
                <Clock className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={handleResendOTP}
                disabled={isLoading}
                className="text-green-600 hover:text-green-700"
              >
                Resend OTP
              </Button>
            </div>
          </form>
        )}

        {/* Step 3: New Password */}
        {step === 'new-password' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-orange-600">New Password</Label>
              <PasswordInput
                id="new-password"
                placeholder="Enter your new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                showValidation={true}
                className="border-orange-500 focus:ring-orange-500 focus:border-orange-500 text-orange-600 placeholder:text-green-500"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-orange-600">Confirm Password</Label>
              <div className="relative">
                <Key className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="pl-10 border-orange-500 focus:ring-orange-500 focus:border-orange-500 text-orange-600 placeholder:text-green-500"
                />
              </div>
            </div>
            
            <Button
              type="submit"
              disabled={isLoading || !newPassword || !confirmPassword}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
        )}

        {/* Step 4: Success */}
        {step === 'success' && (
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-700">Password Reset Successful!</h3>
              <p className="text-sm text-gray-600 mt-2">
                Your password has been reset successfully. Please check your email for the new password details.
              </p>
            </div>
            <Button
              onClick={handleBackToLogin}
              className="w-full bg-green-500 hover:bg-green-600 text-white"
            >
              Back to Login
            </Button>
          </div>
        )}

        {/* Security Information */}
        {step !== 'success' && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">Security Information:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• OTP is valid for 10 minutes only</li>
              <li>• Maximum 3 verification attempts allowed</li>
              <li>• New password will be sent to your email</li>
              <li>• Change password after first login</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
