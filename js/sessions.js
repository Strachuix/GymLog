// sessions.js - Session Management Module
class SessionManager {
  constructor() {
    this.currentSession = null;
  }

  /**
   * Generate unique session ID
   */
  generateId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a new training session
   */
  async createSession(sessionName = null, date = null) {
    const session = {
      id: this.generateId(),
      sessionName: sessionName || `Sesja ${Date.now()}`,
      date: date || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await db.add('sessions', session);
      console.log('Session created:', session);
      return session;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId) {
    try {
      const session = await db.get('sessions', sessionId);
      if (session) {
        // Get all exercises for this session
        session.exercises = await db.getByIndex('exercises', 'sessionId', sessionId);
      }
      return session;
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  }

  /**
   * Get all sessions sorted by date (newest first)
   */
  async getAllSessions() {
    try {
      const sessions = await db.getAll('sessions');
      
      // Sort by date descending
      sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // Add exercise count for each session
      for (const session of sessions) {
        const exercises = await db.getByIndex('exercises', 'sessionId', session.id);
        session.exerciseCount = exercises.length;
        session.exercises = exercises;
      }

      return sessions;
    } catch (error) {
      console.error('Failed to get sessions:', error);
      return [];
    }
  }

  /**
   * Update session
   */
  async updateSession(sessionId, updates) {
    try {
      const session = await db.get('sessions', sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const updatedSession = {
        ...session,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await db.update('sessions', updatedSession);
      console.log('Session updated:', updatedSession);
      return updatedSession;
    } catch (error) {
      console.error('Failed to update session:', error);
      throw error;
    }
  }

  /**
   * Delete session and all associated exercises
   */
  async deleteSession(sessionId) {
    try {
      // Delete all exercises in this session
      const exercises = await db.getByIndex('exercises', 'sessionId', sessionId);
      for (const exercise of exercises) {
        await db.delete('exercises', exercise.id);
      }

      // Delete the session
      await db.delete('sessions', sessionId);
      console.log('Session deleted:', sessionId);
      return true;
    } catch (error) {
      console.error('Failed to delete session:', error);
      throw error;
    }
  }

  /**
   * Get sessions for a specific date
   */
  async getSessionsByDate(date) {
    try {
      const dateStr = new Date(date).toISOString().split('T')[0];
      const sessions = await db.getAll('sessions');
      
      return sessions.filter(session => {
        const sessionDate = new Date(session.date).toISOString().split('T')[0];
        return sessionDate === dateStr;
      });
    } catch (error) {
      console.error('Failed to get sessions by date:', error);
      return [];
    }
  }

  /**
   * Get sessions within date range
   */
  async getSessionsByDateRange(startDate, endDate) {
    try {
      return await db.getByDateRange('sessions', startDate, endDate);
    } catch (error) {
      console.error('Failed to get sessions by date range:', error);
      return [];
    }
  }

  /**
   * Get recent sessions (last N days)
   */
  async getRecentSessions(days = 7) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const sessions = await this.getSessionsByDateRange(startDate, endDate);
      return sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
      console.error('Failed to get recent sessions:', error);
      return [];
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(sessionId) {
    try {
      const session = await this.getSession(sessionId);
      if (!session) return null;

      const exercises = session.exercises || [];
      
      const stats = {
        totalExercises: exercises.length,
        totalSets: exercises.reduce((sum, ex) => sum + (ex.sets || 0), 0),
        totalReps: exercises.reduce((sum, ex) => sum + (ex.reps || 0), 0),
        totalWeight: exercises.reduce((sum, ex) => sum + ((ex.sets || 0) * (ex.reps || 0) * (ex.weight || 0)), 0),
        totalTime: exercises.reduce((sum, ex) => sum + (ex.time || 0), 0),
        categories: {}
      };

      // Count exercises by category
      exercises.forEach(ex => {
        const cat = ex.category || 'Inne';
        stats.categories[cat] = (stats.categories[cat] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Failed to get session stats:', error);
      return null;
    }
  }

  /**
   * Duplicate a session
   */
  async duplicateSession(sessionId) {
    try {
      const originalSession = await this.getSession(sessionId);
      if (!originalSession) {
        throw new Error('Session not found');
      }

      // Create new session
      const newSession = await this.createSession(
        `${originalSession.sessionName} (Kopia)`,
        new Date().toISOString()
      );

      // Duplicate all exercises
      const exercises = originalSession.exercises || [];
      for (const exercise of exercises) {
        const newExercise = {
          ...exercise,
          id: `exercise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          sessionId: newSession.id,
          date: newSession.date
        };
        delete newExercise.photo; // Don't copy photos
        await db.add('exercises', newExercise);
      }

      console.log('Session duplicated:', newSession);
      return newSession;
    } catch (error) {
      console.error('Failed to duplicate session:', error);
      throw error;
    }
  }

  /**
   * Search sessions by name
   */
  async searchSessions(query) {
    try {
      const sessions = await this.getAllSessions();
      const lowerQuery = query.toLowerCase();
      
      return sessions.filter(session => 
        session.sessionName.toLowerCase().includes(lowerQuery)
      );
    } catch (error) {
      console.error('Failed to search sessions:', error);
      return [];
    }
  }

  /**
   * Get total session count
   */
  async getSessionCount() {
    try {
      return await db.count('sessions');
    } catch (error) {
      console.error('Failed to get session count:', error);
      return 0;
    }
  }

  /**
   * Check if session exists
   */
  async sessionExists(sessionId) {
    try {
      const session = await db.get('sessions', sessionId);
      return !!session;
    } catch (error) {
      return false;
    }
  }
}

// Create global instance
const sessionManager = new SessionManager();
