export interface PaymentSubmission {
  id: string;
  name: string;
  studentId: string;
  amount: number;
  status: 'pending' | 'confirmed';
  timestamp: number;
}

const STORAGE_KEY = 'uhung_pay_submissions';

export const storage = {
  getAll(): PaymentSubmission[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load submissions:', error);
      return [];
    }
  },

  add(submission: Omit<PaymentSubmission, 'id' | 'timestamp'>): PaymentSubmission {
    const submissions = this.getAll();
    const newSubmission: PaymentSubmission = {
      ...submission,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    
    submissions.push(newSubmission);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions));
    
    return newSubmission;
  },

  findByStudentId(studentId: string): PaymentSubmission | undefined {
    const submissions = this.getAll();
    return submissions.find((s) => s.studentId === studentId);
  },

  updateStatus(id: string, status: 'pending' | 'confirmed'): boolean {
    const submissions = this.getAll();
    const index = submissions.findIndex((s) => s.id === id);
    
    if (index === -1) return false;
    
    submissions[index].status = status;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions));
    
    return true;
  },

  updateStatusByName(name: string, amount: number, status: 'confirmed'): boolean {
    const submissions = this.getAll();
    const index = submissions.findIndex(
      (s) => s.name === name && s.amount === amount && s.status === 'pending'
    );
    
    if (index === -1) return false;
    
    submissions[index].status = status;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions));
    
    return true;
  },

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  },
};
