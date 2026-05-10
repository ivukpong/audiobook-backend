import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

@Injectable()
export class StorageService {
  private ttl: number;

  constructor(private config: ConfigService) {
    this.ttl = parseInt(config.get('SIGNED_URL_TTL') || '120', 10);

    cloudinary.config({
      cloud_name: this.config.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.config.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.config.get<string>('CLOUDINARY_API_SECRET'),
      secure: true,
    });
  }

  async getSignedUrl(storageKey: string): Promise<string> {
    if (/^https?:\/\//i.test(storageKey)) return storageKey;

    const expiresAt = Math.floor(Date.now() / 1000) + this.ttl;
    return cloudinary.url(storageKey, {
      resource_type: 'video',
      type: 'authenticated',
      sign_url: true,
      secure: true,
      expires_at: expiresAt,
    });
  }

  async uploadFile(key: string, body: Buffer, contentType: string): Promise<string> {
    const publicId = key
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9/_-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/\/+$/g, '');

    const isImage = contentType.startsWith('image/');

    const uploaded = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          resource_type: isImage ? 'image' : 'video',
          type: isImage ? 'upload' : 'authenticated',
          overwrite: true,
        },
        (error, result) => {
          if (error || !result) {
            reject(error || new Error('Cloudinary upload failed'));
            return;
          }
          resolve(result);
        },
      );

      stream.end(body);
    });

    return uploaded.public_id;
  }

  getPublicUrl(storageKey: string): string {
    if (/^https?:\/\//i.test(storageKey)) return storageKey;
    return cloudinary.url(storageKey, {
      resource_type: 'image',
      type: 'upload',
      secure: true,
    });
  }
}
