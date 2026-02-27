// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// Pagination Types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// User Types
export interface User {
  id: number;
  username: string;
  password_hash: string;
  sap_code?: number | null;
  email?: string | null;
  p_num?: string | null;
  full_name?: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  role_ids: number[];
  sap_code?: number | null;
  email?: string | null;
  p_num?: string | null;
  full_name?: string | null;
}

export interface UpdatePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface UpdateUserRequest {
  username?: string;
  password?: string;
  role_ids?: number[];
  is_active?: boolean;
  sap_code?: number | null;
  email?: string | null;
  p_num?: string | null;
  full_name?: string | null;
}

export interface UserWithRelations extends User {
  roles?: Role[];
}

// Role Types
export interface Role {
  role_id: number;
  role_name: string;
  created_at: Date;
}

export interface CreateRoleRequest {
  role_name: string;
}

export interface UpdateRoleRequest {
  role_name?: string;
}

// Page Types
export interface Page {
  page_id: number;
  page_name: string;
  slug: string;
  description?: string | null;
  is_report: boolean;
  is_action: boolean;
  created_at: Date;
}

export interface CreatePageRequest {
  page_name: string;
  slug?: string;
  description?: string;
  is_report?: boolean;
  is_action?: boolean;
}

export interface UpdatePageRequest {
  page_name?: string;
  slug?: string;
  description?: string;
  is_report?: boolean;
  is_action?: boolean;
}

// Role Detail Types
export interface RoleDetail {
  id: number;
  role_id: number;
  page_id: number;
  show: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  created_at: Date;
}

export interface RoleDetailWithRelations extends RoleDetail {
  role?: Role;
  page?: Page;
}

export interface CreateRoleDetailRequest {
  role_id: number;
  page_id: number;
  show?: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
}

export interface UpdateRoleDetailRequest {
  show?: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
}

// User Detail Types (for multiple roles per user)
export interface UserDetail {
  id: number;
  user_id: number;
  role_id: number;
  created_at: Date;
}

export interface UserDetailWithRelations extends UserDetail {
  user?: User;
  role?: Role;
}

// User Sub Division Types (for multiple sub divisions per user)
export interface UserSubDivision {
  usd_id: number;
  user_id: number;
  sd_id: number;
  created_at: Date;
}

export interface UserSubDivisionWithRelations extends UserSubDivision {
  user?: Omit<User, 'password_hash'>;
  sub_division?: SubDivision;
}

export interface CreateUserSubDivisionRequest {
  user_id: number;
  sd_id: number;
}

export interface UpdateUserSubDivisionRequest {
  user_id?: number;
  sd_id?: number;
}

// User Department Types (for multiple departments per user)
export interface UserDepartment {
  ud_id: number;
  user_id: number;
  dept_id: number;
  created_at: Date;
}

export interface UserDepartmentWithRelations extends UserDepartment {
  user?: Omit<User, 'password_hash'>;
  department?: Department;
}

export interface CreateUserDepartmentRequest {
  user_id: number;
  dept_id: number;
}

export interface UpdateUserDepartmentRequest {
  user_id?: number;
  dept_id?: number;
}

// Department Types
export interface Department {
  dept_id: number;
  name: string;
  description?: string;
  created_at: Date;
  updated_at: Date | null;
  updated_by?: number;
  updated_by_username?: string;
}

export interface CreateDepartmentRequest {
  name: string;
  description?: string;
}

export interface UpdateDepartmentRequest {
  name?: string;
  description?: string;
}

// Circle Types
export interface Circle {
  id: number;
  name: string;
  description?: string;
  created_at: Date;
  updated_at: Date | null;
  updated_by?: number;
  updated_by_username?: string;
}

export interface CreateCircleRequest {
  name: string;
  description?: string;
}

export interface UpdateCircleRequest {
  name?: string;
  description?: string;
}

// Funding Source Types
export interface FundingSource {
  fs_id: number;
  fs_name: string;
  description?: string;
  created_at: Date;
  updated_at: Date | null;
  updated_by?: number;
  updated_by_username?: string;
}

export interface CreateFundingSourceRequest {
  fs_name: string;
  description?: string;
}

export interface UpdateFundingSourceRequest {
  fs_name?: string;
  description?: string;
}

// Material Types
export interface Material {
  m_id: number;
  m_name: string;
  description?: string;
  created_at: Date;
  updated_at: Date | null;
  updated_by?: number;
  updated_by_username?: string;
}

export interface CreateMaterialRequest {
  m_name: string;
  description?: string;
}

export interface UpdateMaterialRequest {
  m_name?: string;
  description?: string;
}

// Division Types
export interface Division {
  id: number;
  name: string;
  circle_id: number;
  description?: string;
  created_at: Date;
  updated_at: Date | null;
  updated_by?: number;
  updated_by_username?: string;
  circle?: Circle;
}

export interface CreateDivisionRequest {
  name: string;
  circle_id: number;
  description?: string;
}

export interface UpdateDivisionRequest {
  name?: string;
  circle_id?: number;
  description?: string;
}

// Sub Division Types
export interface SubDivision {
  id: number;
  name: string;
  division_id: number;
  description?: string;
  created_at: Date;
  updated_at: Date | null;
  updated_by?: number;
  updated_by_username?: string;
  division?: Division;
  circle?: Circle;
}

export interface CreateSubDivisionRequest {
  name: string;
  division_id: number;
  description?: string;
}

export interface UpdateSubDivisionRequest {
  name?: string;
  division_id?: number;
  description?: string;
}

// Project Type Types
export interface ProjectType {
  ptype_id: number;
  ptype_name: string;
  department_id: number;
  department_name?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ProjectTypeWithRelations extends ProjectType {
  department_name?: string;
}

export interface CreateProjectTypeRequest {
  ptype_name: string;
  department_id: number;
}

export interface UpdateProjectTypeRequest {
  ptype_name?: string;
}

// Delay Reason Types
export interface DelayReason {
  d_id: number;
  d_name: string;
  created_at: Date;
  updated_at: Date | null;
  updated_by?: number;
  updated_by_username?: string;
}

export interface CreateDelayReasonRequest {
  d_name: string;
}

export interface UpdateDelayReasonRequest {
  d_name?: string;
}

// Step Types
export interface Step {
  s_id: number;
  s_name: string;
  department_id: number;
  department_name?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateStepRequest {
  s_name: string;
  department_id: number;
}

export interface UpdateStepRequest {
  s_name?: string;
}

// Project Type Detail Types
export interface ProjectTypeDetail {
  id: number;
  ptype_id: number;
  s_id: number;
  weightage: number;
  t_days: number;
  est_cost: number;
  order: number;
  created_at: Date;
  updated_at: Date;
}

// Project Type Step Detail Types (PTS Detail)
export interface PtsDetail {
  ptsd_id: number;
  ptd_id: number;
  step_id: number;
  created_at: Date;
  updated_at: Date;
}

export interface PtsDetailWithRelations extends PtsDetail {
  step?: Step;
}

export interface ProjectTypeDetailWithRelations extends ProjectTypeDetail {
  project_type?: ProjectType;
  step?: Step;
  pts_details?: PtsDetailWithRelations[];
}

export interface CreateProjectTypeDetailRequest {
  ptype_id: number;
  s_id: number;
  weightage?: number;
  t_days?: number;
  est_cost?: number;
  order?: number;
}

export interface UpdateProjectTypeDetailRequest {
  ptype_id?: number;
  s_id?: number;
  weightage?: number;
  t_days?: number;
  est_cost?: number;
  order?: number;
}

// Business Plan Types
export interface BusinessPlan {
  proj_id: number;
  ptype_id: number;
  dept_id: number;
  department_name?: string;
  sd_id: number;
  sub_division_name?: string;
  fs_id: number | null;
  funding_source_name?: string;
  proj_name: string;
  start_date: Date | null;
  completion_date: Date | null;
  tar_date: Date;
  status: number;
  cancellation_date?: Date | null;
  cancellation_reason?: string | null;
  created_at: Date;
}

export interface BusinessPlanWithRelations extends BusinessPlan {
  est_completion_date?: Date | null;
  total_days?: number | null;
  project_type?: ProjectType;
  department?: Department;
  sub_division?: SubDivision;
  funding_source?: FundingSource;
}

export interface CreateBusinessPlanRequest {
  ptype_id: number;
  dept_id?: number; // Optional - will be automatically set from authenticated user's department_id
  sd_id: number;
  fs_id?: number | null;
  proj_name: string;
  start_date?: string | null;
  completion_date?: string | null;
  tar_date: string;
  status?: number;
}

export interface UpdateBusinessPlanRequest {
  ptype_id?: number;
  dept_id?: number; // Optional - ignored if provided, automatically set from authenticated user's department_id at runtime
  sd_id?: number;
  fs_id?: number | null;
  proj_name?: string;
  start_date?: string | null;
  completion_date?: string | null;
  tar_date?: string;
  status?: number;
}

export interface CancelBusinessPlanRequest {
  cancellation_date: string; // Required, format: YYYY-MM-DD
  cancellation_reason: string; // Required, text field
}

// Business Plan Detail Types
export interface BusinessPlanDetail {
  bpd_id: number;
  proj_id: number;
  s_id: number;
  weightage: number;
  t_days: number;
  est_cost: number;
  act_cost: number | null;
  order: number;
  status: number;
  remarks_1: string | null;
  remarks_2: string | null;
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
  due_date?: Date | null;
}

export interface BusinessPlanDetailWithRelations extends BusinessPlanDetail {
  business_plan?: BusinessPlan;
  step?: Step;
}

export interface CreateBusinessPlanDetailRequest {
  proj_id: number;
  s_id: number;
  weightage?: number;
  t_days?: number;
  est_cost?: number;
  act_cost?: number | null;
  order?: number;
  status?: number;
  remarks_1?: string | null;
  remarks_2?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface UpdateBusinessPlanDetailRequest {
  proj_id?: number;
  s_id?: number;
  weightage?: number;
  t_days?: number;
  est_cost?: number;
  act_cost?: number | null;
  order?: number;
  status?: number;
  remarks_1?: string | null;
  remarks_2?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
}

// BPD Delay Types
export interface BpdDelay {
  bpdd_id: number;
  bpd_id: number;
  delay_id: number;
  remarks: string | null;
  created_at: Date;
  created_by: number | null;
  created_by_username?: string;
}

export interface BpdDelayWithRelations extends BpdDelay {
  business_plan_detail?: BusinessPlanDetail;
  delay_reason?: DelayReason;
}

export interface CreateBpdDelayRequest {
  bpd_id: number;
  delay_id: number;
  remarks?: string | null;
}

export interface UpdateBpdDelayRequest {
  bpd_id?: number;
  delay_id?: number;
  remarks?: string | null;
}

// BPD Material Types
export interface BpdMaterial {
  bpdm_id: number;
  bpd_id: number;
  m_id: number;
  r_qty: number;
  req_remarks: string | null;
  alloc_qty: number | null;
  alloc_remarks: string | null;
  status: number;
  act_qty: number | null;
  act_remarks: string | null;
}

export interface BpdMaterialWithRelations extends BpdMaterial {
  proj_name?: string | null;
  step_name?: string | null;
  business_plan_detail?: BusinessPlanDetail;
  material?: Material;
}

export interface CreateBpdMaterialRequest {
  bpd_id: number;
  m_id: number;
  r_qty?: number;
  req_remarks?: string | null;
  alloc_qty?: number | null;
  alloc_remarks?: string | null;
  status?: number;
  act_qty?: number | null;
  act_remarks?: string | null;
}

export interface UpdateBpdMaterialRequest {
  bpd_id?: number;
  m_id?: number;
  r_qty?: number;
  req_remarks?: string | null;
  alloc_qty?: number | null;
  alloc_remarks?: string | null;
  status?: number;
  act_qty?: number | null;
  act_remarks?: string | null;
}

// Audit Trail Types
export interface AuditTrail {
  id: number;
  event_type: 'create' | 'edit' | 'delete';
  page_id: number;
  userid: number;
  timestamp: Date;
}

// Issue Category Types
export interface IssueCategory {
  issue_c_id: number;
  issue_c_name: string;
  description: string | null;
  created_at: Date;
  updated_at: Date | null;
  updated_by?: number;
  updated_by_username?: string;
}

export interface CreateIssueCategoryRequest {
  issue_c_name: string;
  description?: string | null;
}

export interface UpdateIssueCategoryRequest {
  issue_c_name?: string;
  description?: string | null;
}

// Issue Types
export interface Issue {
  issue_id: number;
  issue_name: string;
  description: string | null;
  issue_category_id: number | null;
  department_id: number;
  department_name?: string;
  created_at: Date;
  updated_at: Date | null;
  updated_by?: number;
  updated_by_username?: string;
  issue_category?: IssueCategory;
}

export interface CreateIssueRequest {
  issue_name: string;
  description?: string | null;
  issue_category_id?: number | null;
  department_id: number;
}

export interface UpdateIssueRequest {
  issue_name?: string;
  description?: string | null;
  issue_category_id?: number | null;
  // department_id is automatically set from authenticated user's department_id
}

// Project Issue Types
export interface ProjectIssue {
  pi_id: number;
  issue_id: number;
  proj_id: number;
  s_id: number;
  status: number;
  description: string | null;
  remarks_1: string | null;
  remarks_2: string | null;
  remarks_3: string | null;
  opened_at: Date;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date | null;
  updated_by?: number;
  updated_by_username?: string;
}

export interface ProjectIssueWithRelations extends ProjectIssue {
  issue?: Issue;
  business_plan?: BusinessPlan;
  step_name?: string;
}

export interface CreateProjectIssueRequest {
  issue_id: number;
  proj_id: number;
  s_id: number;
  status?: number;
  description?: string | null;
  remarks_1?: string | null;
  remarks_2?: string | null;
  remarks_3?: string | null;
}

export interface UpdateProjectIssueRequest {
  issue_id?: number;
  proj_id?: number;
  s_id?: number;
  status?: number;
  description?: string | null;
  remarks_1?: string | null;
  remarks_2?: string | null;
  remarks_3?: string | null;
}

// Settings Types
export interface Settings {
  id: number;
  year_start: string;
  year_end: string;
  created_at: Date;
  updated_at: Date;
}

export interface UpdateSettingsRequest {
  year_start?: string;
  year_end?: string;
}

// ============================================
// INVENTORY MANAGEMENT TYPES
// ============================================

// Store Types
export interface Store {
  id: number;
  store_code: string;
  store_name: string;
  created_at: Date;
  updated_at: Date | null;
  updated_by: number | null;
  updated_by_username?: string;
}

export interface CreateStoreRequest {
  // store_code is generated by backend
  store_name: string;
}

export interface UpdateStoreRequest {
  // store_code is system generated; normally not updated
  store_code?: string;
  store_name?: string;
}

// Item Types
export interface Item {
  id: number;
  item_code: string;
  item_name: string;
  item_category: string | null;
  created_at: Date;
  updated_at: Date | null;
  updated_by: number | null;
  updated_by_username?: string;
}

export interface OpeningStockInput {
  store_id: number;
  opening_qty: number;
}

export interface CreateItemRequest {
  // item_code is generated by backend
  item_name: string;
  item_category?: string;
  opening_stocks?: OpeningStockInput[];
}

export interface UpdateItemRequest {
  // item_code is system generated; normally not updated
  item_code?: string;
  item_name?: string;
  item_category?: string;
  opening_stocks?: OpeningStockInput[];
}

export interface ItemWithOpeningStocks extends Item {
  opening_stocks?: Array<{
    id: number;
    item_id: number;
    store_id: number;
    store_code: string;
    store_name: string;
    opening_qty: number;
    created_at: Date;
    updated_at: Date | null;
  }>;
}

// Rate Types
export interface Rate {
  id: number;
  item_id: number;
  rate: number;
  effective_date: Date;
  created_at: Date;
  updated_at: Date | null;
}

export interface RateWithItem extends Rate {
  item?: Item;
}

export interface CreateRateRequest {
  item_id: number;
  rate: number;
  effective_date?: Date | string;
}

export interface UpdateRateRequest {
  rate?: number;
  effective_date?: Date | string;
}

// Store Transfer Note Types
export interface StoreTransferNote {
  id: number;
  v_no: string;
  date: Date;
  ref_no: string | null;
  from_store_id: number;
  to_store_id: number;
  order_no: string | null;
  created_by: number | null;
  created_at: Date;
  updated_at: Date | null;
  fromStore?: Store;
  toStore?: Store;
  details?: StoreTransferNoteDetail[];
}

export interface StoreTransferNoteDetail {
  id: number;
  store_transfer_note_id: number;
  item_id: number;
  item_code: string;
  item_name: string;
  qty: number;
  ref: string | null;
  created_at: Date;
  item?: Item;
}

export interface StoreTransferNoteDetailInput {
  item_id: number;
  item_code: string;
  item_name: string;
  qty: number;
  ref?: string;
}

export interface CreateStoreTransferNoteRequest {
  v_no: string;
  date: string | Date;
  ref_no?: string;
  from_store_id: number;
  to_store_id: number;
  order_no?: string;
  created_by?: number;
  details: StoreTransferNoteDetailInput[];
}

export interface UpdateStoreTransferNoteRequest {
  v_no?: string;
  date?: string | Date;
  ref_no?: string;
  from_store_id?: number;
  to_store_id?: number;
  order_no?: string;
  details?: StoreTransferNoteDetailInput[];
}

export interface StoreTransferNoteWithRelations extends StoreTransferNote {
  fromStore: Store;
  toStore: Store;
  details: Array<StoreTransferNoteDetail & { item: Item }>;
}

// Stock Movement Types
export interface StockMovement {
  id: number;
  item_id: number;
  store_id: number;
  movement_type: 'IN' | 'OUT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'OPENING_STOCK';
  qty: number;
  reference_type: string;
  reference_id: number | null;
  v_no: string | null;
  date: Date;
  created_at: Date;
  item?: Item;
  store?: Store;
}

export interface StockMovementWithRelations extends StockMovement {
  item: Item;
  store: Store;
}

// ============================================
// INVENTORY REPORT TYPES
// ============================================

export interface StoreWiseStockReportRow {
  store_id: number;
  store_code: string;
  store_name: string;
  item_id: number;
  item_code: string;
  item_name: string;
  opening_qty: number;
  purchase_qty: number;
  transfer_in_qty: number;
  transfer_out_qty: number;
  closing_qty: number;
  stock_rate: number | null;
  stock_value: number | null;
}

export interface StoreTransferDetailRow {
  transfer_note_id: number;
  v_no: string;
  date: Date;
  ref_no: string | null;
  order_no: string | null;
  from_store_id: number;
  from_store_code: string;
  from_store_name: string;
  to_store_id: number;
  to_store_code: string;
  to_store_name: string;
  item_id: number;
  item_code: string;
  item_name: string;
  qty: number;
  ref: string | null;
}

