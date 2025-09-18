import { otpService } from './otp-service';
import { clientEmailService } from './client-email-service';

interface RegistrationOTPData {
  email: string;
  username: string;
  otpId: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
  verified: boolean;
}

class RegistrationOTPService {
  private registrationOTPs: Map<string, RegistrationOTPData> = new Map();
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly MAX_ATTEMPTS = 3;

  async sendRegistrationOTP(email: string, username: string): Promise<{ success: boolean; message: string; otpId?: string }> {
    try {
      // Check if there's already an active OTP for this email
      for (const [otpId, otpData] of this.registrationOTPs.entries()) {
        if (otpData.email === email && !this.isOTPExpired(otpData) && !otpData.verified) {
          return {
            success: false,
            message: 'An OTP has already been sent to this email. Please wait before requesting a new one.',
            otpId
          };
        }
      }

      // Generate OTP using the main OTP service
      const otpResult = otpService.generateOTP(email, username);
      
      if (!otpResult.success) {
        return {
          success: false,
          message: otpResult.message
        };
      }

      // Get the OTP data
      const otpData = otpService.getOTPData(otpResult.otpId!);
      if (!otpData) {
        return {
          success: false,
          message: 'Failed to generate OTP. Please try again.'
        };
      }

      // Send OTP email
      const emailSent = await clientEmailService.sendOTPEmail({
        to: email,
        toName: username,
        otpCode: otpData.code,
        expiryMinutes: this.OTP_EXPIRY_MINUTES
      });

      if (!emailSent) {
        return {
          success: false,
          message: 'Failed to send OTP email. Please try again.'
        };
      }

      // Store registration OTP data
      const registrationOTPData: RegistrationOTPData = {
        email,
        username,
        otpId: otpResult.otpId!,
        createdAt: Date.now(),
        expiresAt: Date.now() + (this.OTP_EXPIRY_MINUTES * 60 * 1000),
        attempts: 0,
        verified: false
      };

      this.registrationOTPs.set(otpResult.otpId!, registrationOTPData);

      return {
        success: true,
        message: `OTP sent successfully to ${email}. Valid for ${this.OTP_EXPIRY_MINUTES} minutes.`,
        otpId: otpResult.otpId!
      };
    } catch (error) {
      console.error('Error sending registration OTP:', error);
      return {
        success: false,
        message: 'An error occurred while sending OTP. Please try again.'
      };
    }
  }

  async verifyRegistrationOTP(otpId: string, enteredOTP: string): Promise<{ success: boolean; message: string; remainingAttempts?: number }> {
    try {
      const registrationOTPData = this.registrationOTPs.get(otpId);
      
      if (!registrationOTPData) {
        return {
          success: false,
          message: 'Invalid OTP session. Please request a new OTP.'
        };
      }

      if (this.isOTPExpired(registrationOTPData)) {
        this.registrationOTPs.delete(otpId);
        return {
          success: false,
          message: 'OTP has expired. Please request a new one.'
        };
      }

      if (registrationOTPData.verified) {
        return {
          success: false,
          message: 'OTP has already been used. Please request a new one.'
        };
      }

      if (registrationOTPData.attempts >= this.MAX_ATTEMPTS) {
        this.registrationOTPs.delete(otpId);
        return {
          success: false,
          message: 'Maximum verification attempts exceeded. Please request a new OTP.'
        };
      }

      // Verify OTP using the main OTP service
      const otpResult = otpService.verifyOTP(otpId, enteredOTP);
      
      if (!otpResult.success) {
        // Update attempts
        registrationOTPData.attempts += 1;
        this.registrationOTPs.set(otpId, registrationOTPData);
        
        return {
          success: false,
          message: otpResult.message,
          remainingAttempts: this.MAX_ATTEMPTS - registrationOTPData.attempts
        };
      }

      // Mark as verified
      registrationOTPData.verified = true;
      this.registrationOTPs.set(otpId, registrationOTPData);

      return {
        success: true,
        message: 'OTP verified successfully.'
      };
    } catch (error) {
      console.error('Error verifying registration OTP:', error);
      return {
        success: false,
        message: 'An error occurred while verifying OTP. Please try again.'
      };
    }
  }

  getRegistrationOTPData(otpId: string): RegistrationOTPData | null {
    const otpData = this.registrationOTPs.get(otpId);
    if (otpData && !this.isOTPExpired(otpData)) {
      return otpData;
    }
    return null;
  }

  markOTPAsUsed(otpId: string): boolean {
    const otpData = this.registrationOTPs.get(otpId);
    if (otpData && otpData.verified) {
      this.registrationOTPs.delete(otpId);
      return true;
    }
    return false;
  }

  private isOTPExpired(otpData: RegistrationOTPData): boolean {
    return Date.now() > otpData.expiresAt;
  }

  cleanupExpiredOTPs(): void {
    const now = Date.now();
    for (const [otpId, otpData] of this.registrationOTPs.entries()) {
      if (now > otpData.expiresAt) {
        this.registrationOTPs.delete(otpId);
      }
    }
  }
}

// Export singleton instance
export const registrationOTPService = new RegistrationOTPService();
export default registrationOTPService;
