import { PrismaClient } from '@prisma/client'
import { User } from '../prisma/client'

import { CreateUserDto, UpdateUserDto } from '../types/dto'

export class UserService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get all active (non-deleted) users
   */
  async findAll(): Promise<User[]> {
    return await this.prisma.user.findMany({
      where: { deletedAt: null },
      include: {
        roles: {
          include: {
            role: true
          }
        },
        store: true
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  /**
   * Get user by ID
   */
  async findById(id: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: true
          }
        },
        store: true
      }
    })
  }

  /**
   * Get user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return await this.prisma.user.findFirst({
      where: {
        email,
        deletedAt: null
      }
    })
  }

  /**
   * Create a new user
   */
  async create(data: CreateUserDto): Promise<User> {
    return await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: data.password,
        storeId: data.storeId
      },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    })
  }

  /**
   * Update user
   */
  async update(id: string, data: UpdateUserDto): Promise<User> {
    return await this.prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        password: data.password,
        storeId: data.storeId
      },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    })
  }

  /**
   * Soft delete user
   */
  async softDelete(id: string): Promise<User> {
    return await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() }
    })
  }

  /**
   * Permanently delete user
   */
  async hardDelete(id: string): Promise<User> {
    return await this.prisma.user.delete({
      where: { id }
    })
  }

  /**
   * Restore soft-deleted user
   */
  async restore(id: string): Promise<User> {
    return await this.prisma.user.update({
      where: { id },
      data: { deletedAt: null }
    })
  }
}
