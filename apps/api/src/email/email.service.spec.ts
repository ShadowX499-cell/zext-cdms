import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [EmailService],
    }).compile();
    service = module.get<EmailService>(EmailService);
  });

  it('sendOtp does not throw (Mailhog must be running on :1025)', async () => {
    await expect(
      service.sendOtp('test@example.com', 'Test User', '123456'),
    ).resolves.not.toThrow();
  });
});
