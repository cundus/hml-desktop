import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { eq, isNull, and, desc } from 'drizzle-orm'
import * as schema from '../db/schema'
import { users, User } from '../db/schema'
import { CreateUserDto, UpdateUserDto } from '../types/dto'

export class UserService {
  constructor(private db: BetterSQLite3Database<typeof schema>) {}

  /**
   * Get all active (non-deleted) users
   */
  async findAll(): Promise<User[]> {
    return await this.db
      .select()
      .from(users)
      .where(isNull(users.deletedAt))
      .orderBy(desc(users.createdAt))
  }

  /**
   * Get user by ID
   */
  async findById(id: string): Promise<User | undefined> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)
    
    return result[0]
  }

  /**
   * Get user by email
   */
  async findByEmail(email: string): Promise<User | undefined> {
    const result = await this.db
      .select()
      .from(users)
      .where(and(
        eq(users.email, email),
        isNull(users.deletedAt)
      ))
      .limit(1)
    
    return result[0]
  }

  /**
   * Create a new user
   */
  async create(data: CreateUserDto): Promise<User> {
    const result = await this.db
      .insert(users)
      .values({
        name: data.name,
        email: data.email,
        password: data.password,
        storeId: data.storeId
      })
      .returning()
    
    return result[0]
  }

  /**
   * Update user
   */
  async update(id: string, data: UpdateUserDto): Promise<User> {
    const result = await this.db
      .update(users)
      .set({
        name: data.name,
        email: data.email,
        password: data.password,
        storeId: data.storeId,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning()
    
    return result[0]
  }

  /**
   * Soft delete user
   */
  async softDelete(id: string): Promise<User> {
    const result = await this.db
      .update(users)
      .set({ 
        deletedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning()
    
    return result[0]
  }

  /**
   * Permanently delete user
   */
  async hardDelete(id: string): Promise<User> {
    const result = await this.db
      .delete(users)
      .where(eq(users.id, id))
      .returning()
    
    return result[0]
  }

  /**
   * Restore soft-deleted user
   */
  async restore(id: string): Promise<User> {
    const result = await this.db
      .update(users)
      .set({ 
        deletedAt: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning()
    
    return result[0]
  }
}
