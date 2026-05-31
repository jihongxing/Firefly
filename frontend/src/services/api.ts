import axios, { type AxiosInstance, type AxiosError } from 'axios';
import type { Marker, SubmitMarkerInput, FeedbackType, ApiResponse, ApiError, Config } from '@/types/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth-storage');
      if (token) {
        try {
          const authData = JSON.parse(token);
          if (authData.state?.token) {
            config.headers.Authorization = `Bearer ${authData.state.token}`;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiError>) => {
        // Don't throw for successful responses (2xx status codes)
        if (error.response && error.response.status >= 200 && error.response.status < 300) {
          return error.response;
        }

        if (error.response?.data?.error) {
          throw new Error(error.response.data.error.message);
        }
        throw error;
      }
    );
  }

  // Expose axios instance for direct use
  get post() {
    return this.client.post.bind(this.client);
  }

  get get() {
    return this.client.get.bind(this.client);
  }

  async getConfig(): Promise<Config> {
    const { data } = await this.client.get<ApiResponse<Config>>('/config');
    return data.data;
  }

  async getMarkers(params: {
    lat: number;
    lng: number;
    radius?: number;
    types?: string;
    lang?: string;
    limit?: number;
  }): Promise<Marker[]> {
    const { data } = await this.client.get<ApiResponse<Marker[]>>('/markers', { params });
    return data.data;
  }

  async getMarkerById(id: number, lang?: string): Promise<Marker> {
    const { data } = await this.client.get<ApiResponse<Marker>>(`/markers/${id}`, {
      params: { lang },
    });
    return data.data;
  }

  async submitMarker(input: SubmitMarkerInput): Promise<{ id: number; review_status: string; status: number }> {
    const { data } = await this.client.post<ApiResponse<{ id: number; review_status: string; status: number }>>(
      '/markers/submit',
      input
    );
    return data.data;
  }

  async submitFeedback(
    markerId: number,
    feedback: FeedbackType
  ): Promise<{ id: number; feedback_type: string; created_at: string }> {
    const { data } = await this.client.post<
      ApiResponse<{ id: number; feedback_type: string; created_at: string }>
    >(`/markers/${markerId}/feedback`, feedback);
    return data.data;
  }

  async getFeedbackSummary(markerId: number): Promise<{
    marker_id: number;
    feedback_count: number;
    breakdown: Record<string, number>;
  }> {
    const { data } = await this.client.get<
      ApiResponse<{
        marker_id: number;
        feedback_count: number;
        breakdown: Record<string, number>;
      }>
    >(`/markers/${markerId}/feedback-summary`);
    return data.data;
  }
}

export const apiClient = new ApiClient();
