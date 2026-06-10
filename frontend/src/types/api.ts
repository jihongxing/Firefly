export interface Marker {
  id: number;
  category: string;
  title: string;
  source_locale: string;
  locale: string;
  is_translated: boolean;
  latitude: number;
  longitude: number;
  address: string;
  description: string;
  media_url: string | null;
  visibility: string;
  review_status: string;
  consensus_status: string;
  confidence_score: number;
  contact_info: string | null;
  created_at: string;
  distance_m?: number;
}

export interface FeedbackType {
  feedbackType: 'confirm' | 'dispute' | 'support' | 'resolved' | 'still_active' | 'outdated' | 'helpful' | 'not_helpful';
  comment?: string;
  confidenceLevel?: number;
}

export interface SubmitMarkerInput {
  category: string;
  title: string;
  latitude: number;
  longitude: number;
  address: string;
  description: string;
  sourceLocale: string;
  contactInfo?: string;
  visibility?: string;
}

export interface ApiResponse<T> {
  data: T;
  next_cursor?: string | null;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface Config {
  version: string;
  supported_locales: string[];
  default_locale: string;
  marker_categories: {
    risk: string[];
    help: string[];
  };
  feedback_types: string[];
  map_config: {
    default_center: { lat: number; lng: number };
    default_zoom: number;
    default_radius: number;
    max_radius: number;
  };
  rate_limits: {
    submit_marker: { window_ms: number; max_requests: number };
    submit_feedback: { window_ms: number; max_requests: number };
  };
}
