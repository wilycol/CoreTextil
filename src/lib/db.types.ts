export type UserRole =
  | "brand_admin"
  | "designer"
  | "cutter"
  | "satellite_owner"
  | "operator"
  | "superadmin";

export type OrderStatus =
  | "draft"
  | "cutting"
  | "dispatched"
  | "in_progress"
  | "completed";

export type OrderAssignmentStatus =
  | "proposed"
  | "accepted"
  | "rejected"
  | "negotiating";

export type TicketReason = "missing_piece" | "damaged_fabric" | "shortage_supplies";

export type TicketStatus =
  | "pending_satellite"
  | "approved_satellite"
  | "in_cutting_room"
  | "dispatched"
  | "resolved"
  | "cancelled";

export type TenantsRow = {
  id: string;
  name: string;
  nit_rut: string | null;
  admin_phone: string | null;
  admin_address: string | null;
  created_at: string;
};

export type ProfilesRow = {
  id: string;
  tenant_id: string | null;
  google_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  satellite_owner_id: string | null;
  created_at: string;
};

export type SatelliteCostProfilesRow = {
  id: string;
  satellite_user_id: string;
  commercial_name: string | null;
  max_operators: number;
  available_machines: string[];
  rent_monthly: number;
  energy_monthly: number;
  consumables_monthly: number;
  maintenance_monthly: number;
  estimated_monthly_units: number;
  created_at: string;
  updated_at: string;
};

export type OperatorProfilesRow = {
  id: string;
  phone_whatsapp: string | null;
  years_of_experience: number;
  specialties: string[];
  machines: string[];
  created_at: string;
  updated_at: string;
};

export type GarmentsRow = {
  id: string;
  tenant_id: string;
  reference_code: string;
  name: string;
  front_image_url: string | null;
  ai_exploded_image_url: string | null;
  total_sam_minutes: number | null;
  suggested_retail_price: number | null;
  size_factors: Record<string, number> | null;
  created_at: string;
};

export type GarmentPartsRow = {
  id: string;
  garment_id: string;
  part_code: string;
  name: string;
  material_type: string | null;
  color_type: string | null;
  svg_hotspot_coords: Record<string, unknown> | null;
  created_at: string;
};

export type GarmentOperationsRow = {
  id: string;
  garment_id: string;
  step_order: number;
  operation_name: string;
  machine_type: string;
  base_rate_cop: number;
  sam_minutes: number | null;
  prerequisite_operation_id: string | null;
  created_at: string;
};

export type NotificationsRow = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
};

export type SatelliteOperationRatesRow = {
  id: string;
  satellite_user_id: string;
  operation_id: string;
  satellite_rate_cop: number;
  created_at: string;
  updated_at: string;
};

export type OperationPartsRow = {
  operation_id: string;
  part_id: string;
};

export type ProductionOrdersRow = {
  id: string;
  tenant_id: string;
  order_number: string;
  garment_id: string;
  satellite_user_id: string | null;
  unit_price_agreed: number;
  total_units: number;
  status: OrderStatus;
  assignment_status: OrderAssignmentStatus;
  created_at: string;
};

export type OrderBundlesRow = {
  id: string;
  order_id: string;
  bundle_code: string;
  size: string;
  color: string;
  units_count: number;
  created_at: string;
};

export type DailyProductionLogsRow = {
  id: string;
  tenant_id: string;
  order_id: string;
  bundle_id: string;
  operation_id: string;
  operator_id: string;
  units_completed: number;
  earned_amount: number;
  logged_at: string;
  created_at: string;
};

export type MaterialTicketsRow = {
  id: string;
  tenant_id: string;
  order_id: string;
  bundle_id: string;
  part_id: string | null;
  operator_id: string;
  satellite_approver_id: string | null;
  quantity_needed: number;
  reason: TicketReason;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
};

export type GarmentMaterialsRow = {
  id: string;
  garment_id: string;
  name: string;
  unit: string;
  quantity_per_garment: number;
  unit_cost_cop: number;
  created_at: string;
};

export type PayrollRunsRow = {
  id: string;
  satellite_user_id: string;
  period_start: string;
  period_end: string;
  total_cop: number;
  total_units: number;
  operator_count: number;
  breakdown: unknown;
  created_at: string;
};

export type OrderLiquidationsRow = {
  id: string;
  order_id: string;
  tenant_id: string;
  satellite_user_id: string | null;
  satellite_name: string | null;
  units_delivered: number;
  unit_price_cop: number;
  total_cop: number;
  created_by: string;
  created_at: string;
};
