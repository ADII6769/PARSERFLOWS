import { User, DocumentRecord, DocumentPage, SemanticBlock, ProcessingJob, QARecord, UserStats } from '../types';

const TOKEN_KEY = 'parseflow_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Auth
  async signup(data: { email: string; password: string; fullName: string; avatar?: string }): Promise<{ token: string; user: User }> {
    const res = await request<{ token: string; user: User }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setStoredToken(res.token);
    return res;
  },

  async login(data: { email: string; password: string }): Promise<{ token: string; user: User }> {
    const res = await request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setStoredToken(res.token);
    return res;
  },

  async logout(): Promise<void> {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } finally {
      removeStoredToken();
    }
  },

  async getMe(): Promise<{ user: User }> {
    return request<{ user: User }>('/api/auth/me');
  },

  async updateProfile(data: { fullName?: string; avatar?: string; preferences?: any }): Promise<{ user: User }> {
    return request<{ user: User }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    return request<{ message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  // Documents
  async uploadFiles(files: File[]): Promise<{ documents: DocumentRecord[]; jobs: ProcessingJob[] }> {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));

    return request<{ documents: DocumentRecord[]; jobs: ProcessingJob[] }>('/api/documents/upload', {
      method: 'POST',
      body: formData,
    });
  },

  async getDocuments(params?: { search?: string; type?: string; status?: string }): Promise<{ documents: DocumentRecord[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.type) query.append('type', params.type);
    if (params?.status) query.append('status', params.status);

    const url = `/api/documents${query.toString() ? `?${query.toString()}` : ''}`;
    return request<{ documents: DocumentRecord[]; total: number }>(url);
  },

  async getDocument(id: string): Promise<{ document: DocumentRecord; pages: DocumentPage[]; job?: ProcessingJob }> {
    return request<{ document: DocumentRecord; pages: DocumentPage[]; job?: ProcessingJob }>(`/api/documents/${id}`);
  },

  async deleteDocument(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/api/documents/${id}`, {
      method: 'DELETE',
    });
  },

  async reprocessDocument(id: string): Promise<{ job: ProcessingJob }> {
    return request<{ job: ProcessingJob }>(`/api/documents/${id}/process`, {
      method: 'POST',
    });
  },

  async getJob(jobId: string): Promise<{ job: ProcessingJob }> {
    return request<{ job: ProcessingJob }>(`/api/jobs/${jobId}`);
  },

  async getBlocks(documentId: string): Promise<{ blocks: SemanticBlock[]; total: number }> {
    return request<{ blocks: SemanticBlock[]; total: number }>(`/api/documents/${documentId}/blocks`);
  },

  async getJson(documentId: string): Promise<any> {
    return request<any>(`/api/documents/${documentId}/json`);
  },

  async getMarkdown(documentId: string): Promise<{ markdown: string }> {
    return request<{ markdown: string }>(`/api/documents/${documentId}/markdown`);
  },

  async askQuestion(documentId: string, question: string): Promise<{ answer: string; citations: any[] }> {
    return request<{ answer: string; citations: any[] }>(`/api/documents/${documentId}/ask`, {
      method: 'POST',
      body: JSON.stringify({ question }),
    });
  },

  async getQAHistory(documentId: string): Promise<{ history: QARecord[] }> {
    return request<{ history: QARecord[] }>(`/api/documents/${documentId}/qa-history`);
  },

  async createDemoDocument(): Promise<{ document: DocumentRecord }> {
    return request<{ document: DocumentRecord }>('/api/documents/demo', {
      method: 'POST',
    });
  },

  async getAnalytics(): Promise<{ stats: UserStats }> {
    return request<{ stats: UserStats }>('/api/analytics');
  },
};
