export type User = {
  id: string;
  email: string;
  full_name: string;
  avatar_color: string;
  created_at: string;
  updated_at: string;
};

export type AuthSessionResponse = {
  access_token: string;
  token_type: "bearer";
  expires_at: string;
  user: User;
};

export type RefreshResponse = {
  access_token: string;
  token_type: "bearer";
  expires_at: string;
};

export type ProjectMember = {
  role: "owner" | "editor" | "viewer";
  joined_at: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    avatar_color: string;
  };
};

export type ProjectListItem = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  language: "python" | "javascript";
  visibility: "private" | "team";
  member_count: number;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  language: "python" | "javascript";
  visibility: "private" | "team";
  member_count: number;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
  members: ProjectMember[];
  collab_ws_url: string;
};

export type ProjectDocument = {
  project_id: string;
  plain_text: string;
  last_synced_at: string | null;
  ydoc_state_base64: string | null;
};

export type ProjectDocumentUpdateResponse = {
  project_id: string;
  plain_text: string;
  last_synced_at: string | null;
  updated_by_user_id: string | null;
};

export type ProjectRoomInfo = {
  project: Project;
  document: ProjectDocument;
  current_user_role: "owner" | "editor" | "viewer";
  collab_ws_url: string;
};

export type ActivityEvent = {
  id: string;
  project_id: string;
  actor_user_id: string | null;
  event_type: string;
  message: string;
  payload: Record<string, unknown>;
  points: number;
  created_at: string;
  updated_at: string;
};

export type LeaderboardEntry = {
  user_id: string;
  full_name: string;
  avatar_color: string;
  total_points: number;
  event_count: number;
};

export type ExecutionRun = {
  id: string;
  project_id: string;
  actor_user_id: string | null;
  language: "python" | "javascript";
  status: "queued" | "completed" | "failed" | "timeout";
  source_code: string;
  stdout: string;
  stderr: string;
  combined_output: string;
  exit_code: number | null;
  duration_ms: number | null;
  started_at: string | null;
  finished_at: string | null;
  limits: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type AIReviewIssue = {
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  line_start?: number | null;
  line_end?: number | null;
};

export type AIReviewSuggestion = {
  title: string;
  description: string;
  patch_hint?: string | null;
};

export type AIReviewMergeSuggestion = {
  should_merge: boolean;
  rationale: string;
  blockers: string[];
};

export type AIReview = {
  project_id: string;
  provider: string;
  model: string;
  status: string;
  summary: string;
  issues: AIReviewIssue[];
  suggestions: AIReviewSuggestion[];
  merge_suggestion: AIReviewMergeSuggestion;
  raw_response: string;
  fallback_used: boolean;
};