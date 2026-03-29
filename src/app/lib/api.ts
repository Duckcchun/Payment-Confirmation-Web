import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/payment-confirmation`;
const ADMIN_PASSWORD_STORAGE_KEY = 'uhung_admin_password';

export interface PaymentSubmission {
  id: string;
  name: string;
  studentId: string;
  amount: number;
  status: 'pending' | 'confirmed';
  timestamp: number;
}

function getStoredAdminPassword() {
  if (typeof window === 'undefined') return '';
  return window.sessionStorage.getItem(ADMIN_PASSWORD_STORAGE_KEY) || '';
}

function withAdminHeader(headers?: HeadersInit): HeadersInit {
  const password = getStoredAdminPassword();
  if (!password) {
    return headers || {};
  }

  return {
    ...(headers || {}),
    'x-admin-password': password,
  };
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
    return fetchAPI('/submissions', {
      headers: withAdminHeader(),
    });
  },

  // 상태 업데이트 (운영진용)
  async updateSubmissionStatus(studentId: string, status: 'pending' | 'confirmed') {
    return fetchAPI(`/submissions/${studentId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
      headers: withAdminHeader(),
    });
  },

  // CSV 자동 매칭
  async matchCSV(entries: Array<{ name: string; amount: number }>) {
    return fetchAPI('/match-csv', {
      method: 'POST',
      body: JSON.stringify({ entries }),
      headers: withAdminHeader(),
    });
  },

  // 전체 데이터 삭제 (운영진용)
  async deleteAllSubmissions() {
    return fetchAPI('/submissions', {
      method: 'DELETE',
      headers: withAdminHeader(),
    });
  },

  // Health check
  async healthCheck() {
    return fetchAPI('/health');
  },

  // 관리자 비밀번호 검증
  async verifyAdminPassword(password: string) {
    return fetchAPI('/admin-auth', {
      method: 'POST',
      headers: {
        'x-admin-password': password,
      },
    });
  },
};

export const adminSession = {
  setPassword(password: string) {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(ADMIN_PASSWORD_STORAGE_KEY, password);
  },

  clear() {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem(ADMIN_PASSWORD_STORAGE_KEY);
  },

  hasPassword() {
    return getStoredAdminPassword().length > 0;
  },
};
