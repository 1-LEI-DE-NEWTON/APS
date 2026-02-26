import { Injectable, ConflictException } from '@nestjs/common';
import { UserRepository } from '../repository/user.repository';
import { CreateUserDto } from '../dtos';
import { User } from '../entities/user.entity';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async create(dto: CreateUserDto): Promise<Omit<User, 'passwordHash' | 'passwordSalt'>> {
    const existing = await this.userRepository.findByUsername(dto.username);
    if (existing) {
      throw new ConflictException('Username já está em uso');
    }
    const salt = crypto.randomBytes(32).toString('hex');
    const passwordWithSalt = dto.password + salt;
    const passwordHash = await argon2.hash(passwordWithSalt, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
    });
    const user = await this.userRepository.create({
      username: dto.username,
      passwordHash,
      passwordSalt: salt,
    });
    const { passwordHash: _, passwordSalt: __, ...result } = user;
    return result;
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findByUsername(username);
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  async validatePassword(user: User, plainPassword: string): Promise<boolean> {
    const passwordWithSalt = plainPassword + user.passwordSalt;
    return argon2.verify(user.passwordHash, passwordWithSalt);
  }
}
