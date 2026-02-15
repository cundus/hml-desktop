/**
 * Simple in-memory session store for the Main process.
 * Stores the currently authenticated user ID.
 * 
 * In a multi-window or more complex Electron app, this might need to be
 * mapped by WebContents ID (sender.id), but for this single-user desktop app,
 * a global singleton is acceptable.
 */

let currentUserId: string | null = null;
let currentUserRole: string | null = null;
const instanceId = Math.random().toString(36).substring(7);


export const sessionStore = {
  getInstanceId() {
    return instanceId;
  },
  setUser(userId: string, role?: string) {
    currentUserId = userId;
    if (role) currentUserRole = role;
  },

  clearSession() {
    currentUserId = null;
    currentUserRole = null;
  },

  getUserId(): string | null {
    return currentUserId;
  },

  getUserRole(): string | null {
    return currentUserRole;
  },
  
  isAuthenticated(): boolean {
    return currentUserId !== null;
  }
};
