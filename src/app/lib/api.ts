import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/payment-confirmation`;

export interface PaymentSubmission {
  id: string;
  name: string;
  studentId: string;
  amount: number;
  status: 'pending' | 'confirmed';
  timestamp: number;
}

async function fetchAPI(endpoint: string, options?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API error: ${response.status}`);
  }

  return response.json();
}

export const api = {
  // 입금 확인 요청 제출
  async createSubmission(data: { name: string; studentId: string; amount: number }) {
    return fetchAPI('/submissions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 학번으로 상태 조회
  async getSubmission(studentId: string) {
    return fetchAPI(`/submissions/${studentId}`);
  },

  // 전체 제출 내역 조회 (운영진용)
  async getAllSubmissions() {
    return fetchAPI('/submissions');
  },

  // 상태 업데이트 (운영진용)
  async updateSubmissionStatus(studentId: string, status: 'pending' | 'confirmed') {
    return fetchAPI(`/submissions/${studentId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  // CSV 자동 매칭
  async matchCSV(entries: Array<{ name: string; amount: number }>) {
    return fetchAPI('/match-csv', {
      method: 'POST',
      body: JSON.stringify({ entries }),
    });
  },

  // 전체 데이터 삭제 (운영진용)
  async deleteAllSubmissions() {
    return fetchAPI('/submissions', {
      method: 'DELETE',
    });
  },

  // Health check
  async healthCheck() {
    return fetchAPI('/health');
  },
};
