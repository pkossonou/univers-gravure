export interface Paginated<T> {
  data: T[];
  meta: { current_page: number; last_page: number; per_page: number; total: number; [key: string]: unknown };
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  tagline?: string | null;
  description?: string | null;
  icon?: string | null;
  image_url?: string | null;
  show_in_services?: boolean;
  products_count?: number;
  seo_title?: string | null;
  seo_description?: string | null;
}

export interface Material {
  id: number;
  name: string;
  slug: string;
  color_hex?: string | null;
  description?: string | null;
  price_per_m2?: number | null;
}

export interface Finish {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
}

export interface SizeOption {
  label: string;
  height_mm?: number;
  multiplier: number;
}

export interface Product {
  id: number;
  reference: string;
  name: string;
  slug: string;
  category?: { id: number; name: string; slug: string };
  short_description?: string | null;
  description?: string | null;
  price: { base: number | null; from: number | null; unit: "unit" | "area"; on_quote: boolean };
  availability: "in_stock" | "on_order" | "unavailable";
  lead_time: { min: number; max: number };
  dimensions?: { width?: number; height?: number; depth?: number } | null;
  size_options?: SizeOption[] | null;
  personalization_types: string[];
  is_configurable: boolean;
  model_3d?: Model3D | null;
  is_featured: boolean;
  images?: { id: number; src: string; alt: string; is_primary: boolean }[];
  materials?: Pick<Material, "id" | "name" | "slug" | "color_hex">[];
  finishes?: Pick<Finish, "id" | "name" | "slug">[];
  tags?: { id: number; name: string; slug: string; type: "usage" | "event" | "general" }[];
  seo?: { title: string; description?: string | null };
  // Champs back-office
  status?: string;
  base_price?: number | null;
  min_price?: number | null;
  is_price_visible?: boolean;
  stock_quantity?: number | null;
  requests_count?: number;
  views_count?: number;
  category_id?: number;
  seo_title?: string | null;
  seo_description?: string | null;
  lead_time_min_days?: number;
  lead_time_max_days?: number;
}

export type Model3D = "cup" | "star" | "column" | "plaque" | "medal" | "crystal";

export interface Estimate {
  confidence: "firm" | "from" | "needs_review";
  estimate_min: number | null;
  estimate_max: number | null;
  currency: string;
  label: string;
  disclaimer: string;
  breakdown: { label: string; amount: number; detail?: string }[];
  reasons: string[];
  lead_time_days: { min: number; max: number };
}

export interface TimelineStage {
  key: string;
  label: string;
  state: "done" | "current" | "upcoming";
  date: string | null;
}

export interface Timeline {
  status: string;
  status_label: string;
  is_closed: boolean;
  stages: TimelineStage[];
}

export interface PortfolioItem {
  id: number;
  title: string;
  slug: string;
  category: string;
  client_label?: string | null;
  description?: string | null;
  image_url: string;
  before_image_url?: string | null;
  video_url?: string | null;
  ratio: "portrait" | "landscape" | "square";
  year?: number | null;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  roles: string[];
  permissions: string[];
  is_staff: boolean;
  client?: { id: number; display_name: string; company?: string | null; phone?: string | null; address?: string | null; city?: string | null; type: string } | null;
}

export interface ProjectFileInfo {
  id: number;
  name: string;
  kind: string;
  mime_type?: string;
  extension: string;
  size: number;
  is_image: boolean;
  url: string;
  preview_url?: string | null;
  created_at: string;
}

export interface Project {
  id: number;
  number: string;
  channel: string;
  project_type: string;
  project_type_label: string;
  status: string;
  status_label: string;
  title?: string | null;
  description?: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone?: string | null;
  company?: string | null;
  quantity: number;
  dimensions: { width_mm: number | null; height_mm: number | null; depth_mm: number | null };
  personalization?: Record<string, unknown> | null;
  configuration?: Record<string, unknown> | null;
  desired_date?: string | null;
  urgency: string;
  estimate: { min: number | null; max: number | null; confidence: string | null };
  product?: { id: number; name: string; slug: string; reference: string } | null;
  material?: { id: number; name: string } | null;
  finish?: { id: number; name: string } | null;
  files?: ProjectFileInfo[];
  quotes?: { id: number; number: string; status: string; status_label: string; total: number }[];
  order?: { id: number; number: string; status: string; status_label: string } | null;
  timeline?: Timeline;
  client?: { id: number; display_name: string; email?: string; phone?: string; company?: string } | null;
  assignee?: { id: number; name: string } | null;
  assigned_to?: number | null;
  client_id?: number | null;
  files_count?: number;
  created_at: string;
}

export interface QuoteItem {
  id?: number;
  product_id?: number | null;
  description: string;
  quantity: number;
  unit_price: number;
  unit_cost?: number | null;
  discount?: number;
  total?: number;
  options?: Record<string, unknown> | null;
}

export interface Quote {
  id: number;
  number: string;
  status: string;
  status_label: string;
  issued_at?: string | null;
  valid_until?: string | null;
  subtotal: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes?: string | null;
  terms?: string | null;
  sent_at?: string | null;
  accepted_at?: string | null;
  rejection_reason?: string | null;
  client?: { id: number; display_name: string; email?: string; phone?: string; company?: string } | null;
  project?: { id: number; number: string; project_type: string; title?: string } | null;
  order?: { id: number; number: string; status: string } | null;
  items?: QuoteItem[];
  client_id?: number;
  project_id?: number | null;
  estimated_margin?: number | null;
  created_at: string;
}

export interface Order {
  id: number;
  number: string;
  status: string;
  status_label: string;
  payment_status: "unpaid" | "partial" | "paid";
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  ordered_at: string;
  due_date?: string | null;
  delivery_method: string;
  delivery_address?: string | null;
  delivered_at?: string | null;
  completed_at?: string | null;
  client?: { id: number; display_name: string; email?: string; phone?: string } | null;
  quote?: { id: number; number: string } | null;
  project?: { id: number; number: string; project_type: string; title?: string } | null;
  items?: QuoteItem[];
  history?: { to_status: string; label: string; comment?: string | null; date: string; by?: string | null }[];
  production?: { id: number; number: string; status: string; progress: number; steps: { id: number; name: string; status: string; completed_at?: string | null }[] }[];
  invoices?: { id: number; number: string; status: string; status_label: string; total: number; amount_paid: number }[];
  timeline?: Timeline;
  cost_estimate?: number;
  notes?: string | null;
  margin?: { cost_estimate: number; direct_expenses: number; estimated: number };
  qr_codes?: { id: number; code: string; title: string; recipient_name?: string; public_url: string }[];
  created_at: string;
}

export interface Invoice {
  id: number;
  number: string;
  status: string;
  status_label: string;
  issued_at?: string | null;
  due_at?: string | null;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  balance: number;
  is_overdue: boolean;
  client?: { id: number; display_name: string; email?: string } | null;
  order?: { id: number; number: string } | null;
  payments?: { id: number; amount: number; method: string; method_label: string; paid_at: string; reference?: string | null }[];
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  url?: string | null;
  level: "info" | "success" | "warning" | "danger";
  read_at: string | null;
  created_at: string;
}
