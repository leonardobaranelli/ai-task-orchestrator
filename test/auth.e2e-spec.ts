import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/auth/register (POST) - should register a new user', () => {
    const uniqueEmail = `e2e-${Date.now()}@test.com`;

    return request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: uniqueEmail,
        password: 'password123',
        name: 'E2E Test User',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.accessToken).toBeDefined();
        expect(res.body.data.refreshToken).toBeDefined();
        expect(res.body.data.user).toBeDefined();
        expect(res.body.data.user.email).toBe(uniqueEmail);
        expect(res.body.data.user.password).toBeUndefined();
      });
  });

  it('/auth/register (POST) - should reject duplicate email', () => {
    const email = `dup-${Date.now()}@test.com`;

    return request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'password123' })
      .expect(201)
      .then(() =>
        request(app.getHttpServer())
          .post('/auth/register')
          .send({ email, password: 'password123' })
          .expect(409),
      );
  });

  it('/auth/login (POST) - should return tokens with valid credentials', async () => {
    const email = `login-${Date.now()}@test.com`;
    const password = 'password123';

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password, name: 'Login User' });

    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.accessToken).toBeDefined();
        expect(res.body.data.user.email).toBe(email);
      });
  });

  it('/auth/login (POST) - should reject invalid credentials', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'ghost@example.com', password: 'wrong' })
      .expect(401);
  });

  it('/auth/register (POST) - should reject invalid body', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'not-an-email', password: '123' })
      .expect(400);
  });
});
