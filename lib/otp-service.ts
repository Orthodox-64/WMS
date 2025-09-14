interface OTPData {
  code: string;
  email: string;
  username: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
  verified: boolean;
}

interface OTPResult {
  success: boolean;
  message: string;
  otpId?: string;
  remainingAttempts?: number;
}

class OTPService {
  private otps: Map<string, OTPData> = new Map();
  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly MAX_ATTEMPTS = 3;

  private generateOTPCode(): string {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < this.OTP_LENGTH; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }
    return otp;
  }

  private generateOTPId(): string {
    return `otp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private isOTPExpired(otpData: OTPData): boolean {
    return Date.now() > otpData.expiresAt;
  }

  private cleanupExpiredOTPs(): void {
    const now = Date.now();
    for (const [otpId, otpData] of this.otps.entries()) {
      if (now > otpData.expiresAt) {
        this.otps.delete(otpId);
      }
    }
  }

  generateOTP(email: string, username: string): OTPResult {
    try {
      // Clean up expired OTPs first
      this.cleanupExpiredOTPs();

      // Check if there's already an active OTP for this email
      for (const [otpId, otpData] of this.otps.entries()) {
        if (otpData.email === email && !this.isOTPExpired(otpData) && !otpData.verified) {
          return {
            success: false,
            message: 'An OTP has already been sent to this email. Please wait before requesting a new one.',
            otpId
          };
        }
      }

      const otp = this.generateOTPCode();
      const otpId = this.generateOTPId();
      const now = Date.now();

      const otpData: OTPData = {
        code: otp,
        email,
        username,
        createdAt: now,
        expiresAt: now + (this.OTP_EXPIRY_MINUTES * 60 * 1000),
        attempts: 0,
        verified: false
      };

      this.otps.set(otpId, otpData);

      return {
        success: true,
        message: `OTP generated successfully. Valid for ${this.OTP_EXPIRY_MINUTES} minutes.`,
        otpId
      };
    } catch (error) {
      console.error('Error generating OTP:', error);
      return {
        success: false,
        message: 'Failed to generate OTP. Please try again.'
      };
    }
  }

  verifyOTP(otpId: string, enteredOTP: string): OTPResult {
    try {
      const otpData = this.otps.get(otpId);
      
      if (!otpData) {
        return {
          success: false,
          message: 'Invalid OTP ID. Please request a new OTP.'
        };
      }

      if (this.isOTPExpired(otpData)) {
        this.otps.delete(otpId);
        return {
          success: false,
          message: 'OTP has expired. Please request a new one.'
        };
      }

      if (otpData.verified) {
        return {
          success: false,
          message: 'OTP has already been used. Please request a new one.'
        };
      }

      if (otpData.attempts >= this.MAX_ATTEMPTS) {
        this.otps.delete(otpId);
        return {
          success: false,
          message: 'Maximum verification attempts exceeded. Please request a new OTP.'
        };
      }

      // Increment attempts
      otpData.attempts += 1;

      if (otpData.code === enteredOTP) {
        otpData.verified = true;
        this.otps.set(otpId, otpData);
        return {
          success: true,
          message: 'OTP verified successfully.'
        };
      } else {
        this.otps.set(otpId, otpData);
        const remainingAttempts = this.MAX_ATTEMPTS - otpData.attempts;
        return {
          success: false,
          message: `Invalid OTP. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`,
          remainingAttempts
        };
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return {
        success: false,
        message: 'Failed to verify OTP. Please try again.'
      };
    }
  }

  getOTPData(otpId: string): OTPData | null {
    const otpData = this.otps.get(otpId);
    if (otpData && !this.isOTPExpired(otpData)) {
      return otpData;
    }
    return null;
  }

  markOTPAsUsed(otpId: string): boolean {
    const otpData = this.otps.get(otpId);
    if (otpData && otpData.verified) {
      this.otps.delete(otpId);
      return true;
    }
    return false;
  }

  getOTPStats(): { totalActive: number; totalExpired: number } {
    const now = Date.now();
    let totalActive = 0;
    let totalExpired = 0;

    for (const otpData of this.otps.values()) {
      if (now > otpData.expiresAt) {
        totalExpired++;
      } else {
        totalActive++;
      }
    }

    return { totalActive, totalExpired };
  }

  // Get OTP by email (for admin purposes)
  getOTPByEmail(email: string): { otpId: string; otpData: OTPData } | null {
    for (const [otpId, otpData] of this.otps.entries()) {
      if (otpData.email === email && !this.isOTPExpired(otpData)) {
        return { otpId, otpData };
      }
    }
    return null;
  }
}

// Export singleton instance
export const otpService = new OTPService();
export default otpService;
