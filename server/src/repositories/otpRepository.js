import Otp from '../models/Otp.js';

class OtpRepository {
  constructor(otpModel = Otp) {
    this.model = otpModel;
  }

  async findByEmail(email) {
    return this.model.findOne({ email: email.toLowerCase() });
  }

  async upsertOtp(email, otpHash, expiresAt) {
    return this.model.findOneAndUpdate(
      { email: email.toLowerCase() },
      { $set: { otpHash, attempts: 0, expiresAt } },
      { upsert: true, new: true, runValidators: true }
    );
  }

  async incrementAttempts(email) {
    return this.model.findOneAndUpdate(
      { email: email.toLowerCase() },
      { $inc: { attempts: 1 } },
      { new: true }
    );
  }

  async deleteByEmail(email) {
    return this.model.deleteOne({ email: email.toLowerCase() });
  }
}

export default OtpRepository;
