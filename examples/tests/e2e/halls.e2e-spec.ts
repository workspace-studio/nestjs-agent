import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../app.module';

describe('Halls (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let createdHallId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    // Obtain auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'password123' });
    authToken = loginResponse.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /halls', () => {
    it('should create a hall (201)', async () => {
      const response = await request(app.getHttpServer())
        .post('/halls')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Hall', maxCapacity: 100, description: 'A test hall' })
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe('Test Hall');
      createdHallId = response.body.data.id;
    });

    it('should return 400 for invalid data', async () => {
      await request(app.getHttpServer())
        .post('/halls')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '' })
        .expect(400);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .post('/halls')
        .send({ name: 'No Auth Hall', maxCapacity: 50 })
        .expect(401);
    });

    it('should return 409 for duplicate name', async () => {
      await request(app.getHttpServer())
        .post('/halls')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Hall', maxCapacity: 200 })
        .expect(409);
    });
  });

  describe('GET /halls', () => {
    it('should return a list of halls (200)', async () => {
      const response = await request(app.getHttpServer())
        .get('/halls')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.meta).toHaveProperty('total');
    });
  });

  describe('GET /halls/:id', () => {
    it('should return a single hall (200)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/halls/${createdHallId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(createdHallId);
    });

    it('should return 404 for non-existent hall', async () => {
      await request(app.getHttpServer())
        .get('/halls/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PATCH /halls/:id', () => {
    it('should update a hall (200)', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/halls/${createdHallId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Hall' })
        .expect(200);

      expect(response.body.data.name).toBe('Updated Hall');
    });
  });

  describe('DELETE /halls/:id', () => {
    it('should delete a hall (204)', async () => {
      await request(app.getHttpServer())
        .delete(`/halls/${createdHallId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });
  });
});
