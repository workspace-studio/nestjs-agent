# Media & S3 File Storage

## Multer Setup

```typescript
// In controller
import { FileInterceptor } from '@nestjs/platform-express';
import { UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';

@Post('upload')
@UseInterceptors(FileInterceptor('file'))
@ApiOperation({ summary: 'Upload a file' })
@ApiConsumes('multipart/form-data')
@ApiBody({
  schema: {
    type: 'object',
    properties: {
      file: { type: 'string', format: 'binary' },
    },
  },
})
async upload(
  @UploadedFile(
    new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
        new FileTypeValidator({ fileType: /(jpg|jpeg|png|pdf|webp)$/ }),
      ],
    }),
  )
  file: Express.Multer.File,
) {
  return this.mediaService.upload(file);
}
```

## File Validation Pipe

```typescript
// src/common/pipes/file-validation.pipe.ts
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class FileValidationPipe implements PipeTransform {
  constructor(
    private readonly allowedMimeTypes: string[],
    private readonly maxSizeBytes: number,
  ) {}

  transform(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${this.allowedMimeTypes.join(', ')}`,
      );
    }

    if (file.size > this.maxSizeBytes) {
      throw new BadRequestException(
        `File too large. Max size: ${this.maxSizeBytes / (1024 * 1024)}MB`,
      );
    }

    return file;
  }
}
```

## AWS SDK v3 S3Client Setup

```typescript
// src/common/s3/s3.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.getOrThrow<string>('S3_BUCKET');

    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
      endpoint: this.configService.get<string>('S3_ENDPOINT'), // MinIO in dev
      forcePathStyle: true, // Required for MinIO
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.getOrThrow<string>('AWS_SECRET_ACCESS_KEY'),
      },
    });
  }

  async upload(file: Express.Multer.File, folder = 'uploads'): Promise<{ key: string; url: string }> {
    const ext = file.originalname.split('.').pop();
    const key = `${folder}/${uuid()}.${ext}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    this.logger.log(`File uploaded: ${key}`);

    const url = await this.getSignedUrl(key);
    return { key, url };
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async delete(key: string): Promise<void> {
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
    this.logger.log(`File deleted: ${key}`);
  }
}
```

## S3 Key Format

```
uploads/          — general file uploads
avatars/          — user profile images
documents/        — work order documents
equipment/        — equipment photos

Key pattern: {folder}/{uuid}.{extension}
Example: uploads/a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf
```

## MediaService

```typescript
// src/modules/media/media.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from 'src/modules/common/prisma/prisma.service';
import { S3Service } from 'src/modules/common/s3/s3.service';

@Injectable()
export class MediaService {
  constructor(
    private readonly s3Service: S3Service,
    private readonly prisma: PrismaService,
  ) {}

  async upload(file: Express.Multer.File, userId: string, folder = 'uploads') {
    const { key, url } = await this.s3Service.upload(file, folder);

    const media = await this.prisma.media.create({
      data: {
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        s3Key: key,
        uploadedBy: { connect: { id: userId } },
      },
    });

    return { ...media, url };
  }

  async getUrl(id: string): Promise<string> {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) throw new NotFoundException('Media not found');

    return this.s3Service.getSignedUrl(media.s3Key);
  }

  async remove(id: string): Promise<void> {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) throw new NotFoundException('Media not found');

    await this.s3Service.delete(media.s3Key);
    await this.prisma.media.delete({ where: { id } });
  }
}
```

## MinIO in Docker Compose

```yaml
minio:
  image: minio/minio:latest
  container_name: minio
  ports:
    - '9000:9000'
    - '9001:9001'
  environment:
    MINIO_ROOT_USER: minioadmin
    MINIO_ROOT_PASSWORD: minioadmin
  command: server /data --console-address ":9001"
  volumes:
    - minio_data:/data
  healthcheck:
    test: ['CMD', 'mc', 'ready', 'local']
    interval: 5s
    timeout: 5s
    retries: 5
```

Environment variables for MinIO:

```env
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=my-app-dev
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_REGION=us-east-1
```

Create the bucket on first run:

```bash
docker exec minio mc alias set local http://localhost:9000 minioadmin minioadmin
docker exec minio mc mb local/my-app-dev
```

## File Downloads with StreamableFile

For serving files back to clients, use `StreamableFile` instead of raw streams:

```typescript
import { Controller, Get, Param, StreamableFile, Res } from '@nestjs/common';
import type { Response } from 'express';

@Get(':id/download')
@ApiOperation({ summary: 'Download file' })
async download(
  @Param('id') id: string,
  @Res({ passthrough: true }) res: Response,
): Promise<StreamableFile> {
  const file = await this.mediaService.getFileStream(id);

  res.set({
    'Content-Type': file.mimeType,
    'Content-Disposition': `attachment; filename="${file.originalName}"`,
  });

  return new StreamableFile(file.stream);
}
```

`StreamableFile` preserves interceptor chain (unlike `res.pipe()` which bypasses it).

## Advanced File Validation with ParseFilePipe

```typescript
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
upload(
  @UploadedFile(
    new ParseFilePipeBuilder()
      .addFileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ })
      .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 }) // 5MB
      .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
  )
  file: Express.Multer.File,
) {
  return this.mediaService.upload(file);
}
```

`FileTypeValidator` checks magic bytes (not just extension) — prevents `.jpg` files that are actually executables.
