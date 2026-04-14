import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../repository/user.repository';
import { CreateUserDto, UpdateUserAccountDto } from '../dtos';
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
    const { salt, hash } = await this.hashPassword(dto.password);
    const user = await this.userRepository.create({
      username: dto.username,
      passwordHash: hash,
      passwordSalt: salt,
      profileKeywords: [],
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

  async getProfileKeywords(userId: string): Promise<string[]> {
    const user = await this.userRepository.findById(userId);
    if (!user?.profileKeywords) return [];
    return user.profileKeywords;
  }

  async updateProfileKeywords(userId: string, profileKeywords: string[]): Promise<string[]> {
    const normalized = Array.from(
      new Set(profileKeywords.map((entry) => entry.trim()).filter((entry) => entry.length > 0))
    );
    await this.userRepository.updateProfileKeywords(userId, normalized);
    return normalized;
  }

  async updateAccount(
    userId: string,
    dto: UpdateUserAccountDto
  ): Promise<Omit<User, 'passwordHash' | 'passwordSalt'>> {
    const updates: { username?: string; passwordHash?: string; passwordSalt?: string } = {};

    if (dto.username) {
      const normalizedUsername = dto.username.trim();
      const existing = await this.userRepository.findByUsername(normalizedUsername);
      if (existing && existing.id !== userId) {
        throw new ConflictException('Username já está em uso');
      }
      updates.username = normalizedUsername;
    }

    if (dto.password) {
      const { salt, hash } = await this.hashPassword(dto.password);
      updates.passwordSalt = salt;
      updates.passwordHash = hash;
    }

    if (Object.keys(updates).length > 0) {
      await this.userRepository.updateAccount(userId, updates);
    }

    const updatedUser = await this.userRepository.findById(userId);
    if (!updatedUser) {
      throw new NotFoundException('Usuário não encontrado');
    }
    const { passwordHash, passwordSalt, ...result } = updatedUser;
    return result;
  }

  async deactivate(userId: string): Promise<void> {
    await this.userRepository.deactivate(userId);
  }

  private async hashPassword(password: string): Promise<{ salt: string; hash: string }> {
    const salt = crypto.randomBytes(32).toString('hex');
    const passwordWithSalt = password + salt;
    const hash = await argon2.hash(passwordWithSalt, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
    });
    return { salt, hash };
  }
}
