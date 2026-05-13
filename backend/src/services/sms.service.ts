export const smsService = {
  async sendOtp(phone: string, otp: string) {
    return {
      phone,
      otp,
      provider: "dev"
    };
  }
};
