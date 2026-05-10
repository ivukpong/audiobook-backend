import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class PaystackService {
  private readonly baseUrl = 'https://api.paystack.co';
  private readonly secret: string;

  constructor(private config: ConfigService) {
    this.secret = config.get('PAYSTACK_SECRET_KEY');
  }

  async initializeTransaction(email: string, amountKobo: number, bookId: string, userId: string, callbackUrl: string) {
    const { data } = await axios.post(
      `${this.baseUrl}/transaction/initialize`,
      { email, amount: amountKobo, metadata: { bookId, userId }, callback_url: callbackUrl },
      { headers: { Authorization: `Bearer ${this.secret}` } },
    );
    return data.data as { authorization_url: string; access_code: string; reference: string };
  }

  async verifyTransaction(reference: string) {
    const { data } = await axios.get(`${this.baseUrl}/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${this.secret}` },
    });
    return data.data;
  }

  validateWebhook(payload: string, signature: string): boolean {
    const hash = crypto.createHmac('sha512', this.config.get('PAYSTACK_WEBHOOK_SECRET'))
      .update(payload).digest('hex');
    return hash === signature;
  }
}
