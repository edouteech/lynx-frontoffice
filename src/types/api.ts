export interface Organization {
  id: number
  name: string
  logo: string | null
  legal_name: string | null
  tax_id: string | null
  company_registration_number: string | null
  address: string | null
  phone: string | null
  country: string | null
  currency: string | null
  timezone: string | null
  created_at?: string
  updated_at?: string
}

export interface UserStorePivot {
  user_id: number
  store_id: number
  created_at?: string
  updated_at?: string
}

export interface UserOrganizationMembership {
  id?: number
  user_id?: number
  organization_id: number
  role_id: number | null
  organization?: Organization
  role?: Role | null
  created_at?: string
  updated_at?: string
}

export interface User {
  id: number
  name: string
  email: string
  email_verified_at?: string | null
  phone?: string | null
  note?: string | null
  organization_memberships?: UserOrganizationMembership[]
  stores?: Array<Store & { pivot?: UserStorePivot }>
  created_at?: string
  updated_at?: string
}

export interface LoginResponse {
  token: string
  token_type: string
  user: User
}

export interface ItemCategory {
  id: number
  name: string
  color: string | null
  organization_id: number
  created_at: string
  updated_at: string
}

export interface Store {
  id: number
  name: string
  address: string | null
  phone: string | null
  token: string | null
  is_purchasing_center: boolean
  status: string
  commission_rate: number | null
  organization_id: number
  created_at: string
  updated_at: string
}

export interface StockTransferItem {
  id: number
  stock_transfer_id: number
  product_id: number
  product_name: string
  product_sku: string | null
  product_category: string | null
  quantity: number
  stock_from: number
  stock_to: number
}

export interface StockTransfer {
  id: number
  organization_id: number
  from_store_id: number
  to_store_id: number
  transfer_date: string | null
  note: string | null
  status: 'draft' | 'submitted' | 'confirmed' | 'cancelled'
  can_validate?: boolean
  items_count?: number
  from_store?: Store
  to_store?: Store
  items?: StockTransferItem[]
  created_at: string
  updated_at: string
}

export interface PurchaseOrderItem {
  id: number
  purchase_order_id: number
  product_id: number
  product_name: string
  product_sku: string | null
  product_category: string | null
  current_stock: number
  quantity: number
  received_quantity: number
  remaining_quantity: number
  unit_cost: number
  total: number
}

export type PurchaseOrderStatus =
  | 'submitted'
  | 'confirmed'
  | 'validated'
  | 'partially_received'
  | 'completed'

export interface PurchaseOrder {
  id: number
  organization_id: number
  supplier_id: number | null
  purchasing_center_id: number | null
  store_id: number
  order_date: string | null
  expected_date: string | null
  note: string | null
  status: PurchaseOrderStatus
  discount_percentage: number
  extra_fees: number
  subtotal?: number
  supplier?: Supplier
  purchasing_center?: Store
  store?: Store
  items?: PurchaseOrderItem[]
  created_at: string
  updated_at: string
}

export interface Supplier {
  id: number
  organization_id: number
  name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  address: string | null
  tax_id: string | null
  note: string | null
  created_at: string
  updated_at: string
}

export interface Customer {
  id: number
  organization_id: number
  name: string
  email: string | null
  phone: string | null
  note: string | null
  tax_id: string | null
  aib: boolean
  created_at: string
  updated_at: string
}

export interface PaymentMethodCategory {
  id: number
  name: string
  is_available: boolean
  created_at: string
  updated_at: string
}

export interface PaymentMethod {
  id: number
  organization_id: number
  name: string
  account_number: string | null
  token?: string | null
  payment_method_category_id: number
  category?: PaymentMethodCategory
  stores?: Array<Pick<Store, 'id' | 'name'>>
  created_at: string
  updated_at: string
}

export interface CashRegister {
  id: number
  name: string
  store_id: number
  status: string
  organization_id: number
  open_session?: CashRegisterSession | null
  store?: Store
  created_at: string
  updated_at: string
}

export interface Favorite {
  id: number
  organization_id: number
  name: string
  status: 'active' | 'inactive'
  stores?: Array<Pick<Store, 'id' | 'name'>>
  products?: Array<Pick<Product, 'id' | 'name'>>
  created_at: string
  updated_at: string
}

export interface VatRate {
  id: number
  organization_id: number | null
  name: string
  rate: string | number
  created_at: string
  updated_at: string
}

export interface Permission {
  id: number
  code?: string
  category: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface Role {
  id: number
  organization_id: number
  name: string
  description: string | null
  permissions?: Permission[]
  permissions_count?: number
  created_at: string
  updated_at: string
}

export interface ProductImage {
  id: number
  product_id: number
  url: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CompositeProductItem {
  id: number
  parent_product_id: number
  child_product_id: number
  quantity: string | number
  child_product?: Product // Recursive optionally mapped
  created_at: string
  updated_at: string
}

export interface ProductStock {
  id: number
  product_id: number
  store_id: number
  quantity: string | number
  store?: Store
  updated_at: string
}

export interface Product {
  id: number
  organization_id: number
  name: string
  type: 'simple' | 'composite'
  item_category_id: number
  store_id: number | null
  sold_by: 'unit' | 'weight' | 'surface'
  purchase_price: string | number | null
  selling_price: string | number
  sku: string | null
  barcode: string | null
  purchase_vat_rate_id: number | null
  sales_vat_rate_id: number | null
  specific_tax: boolean
  is_composite: boolean
  track_inventory: boolean
  allow_negative_stock: boolean
  tax_inclusive: boolean
  margin: string | number | null
  stock_quantity: string | number
  image_url: string | null
  color: string | null
  created_at: string
  updated_at: string

  // Present only when filtering by store_id
  store_selling_price?: number | null
  store_stock_quantity?: number | null

  category?: ItemCategory
  sales_vat_rate?: VatRate
  purchase_vat_rate?: VatRate
  store?: Store
  images?: ProductImage[]
  stocks?: ProductStock[]
  composite_items?: CompositeProductItem[]
}

export interface ProductStorePrice {
  store_id: number
  store_name: string
  selling_price: number
  tax_inclusive: boolean
  price_id: number | null
  is_custom: boolean
}

export interface ProductStockEntry {
  store_id: number
  store_name: string
  quantity: number
  stock_id: number | null
  min_stock_alert?: number | null
}

export interface ProductStoreSetting {
  store_id: number
  store_name: string
  available: boolean
  for_sale: boolean
}

export interface ProductComponent {
  id: number
  child_id: number
  child_name: string
  child_sku: string | null
  quantity: number
  unit_price: number
  total: number
  unit_purchase_price?: number
  purchase_total?: number
}

export interface SaleItem {
  id: number
  sale_id: number
  product_id: number
  product_name: string
  product_sku: string | null
  product_category: string | null
  track_inventory?: boolean
  product_type?: string
  current_stock: number | null
  stock_store_at_sale?: number | null
  stock_global_at_sale?: number | null
  quantity: number
  unit_price: number
  total: number
}

export interface CashRegisterSession {
  id: number
  cash_register_id: number
  organization_id: number
  opening_balance: number
  closing_balance: number | null
  note: string | null
  opened_at: string
  closed_at: string | null
  status: 'open' | 'closed'
  sales_total?: number
  expected_closing_balance?: number
  difference?: number | null
  cash_register?: CashRegister
  created_at: string
  updated_at: string
}

export interface Sale {
  id: number
  organization_id: number
  store_id: number
  cash_register_id: number | null
  payment_method_id: number | null
  customer_id: number | null
  sale_date: string | null
  note: string | null
  status: 'draft' | 'confirmed' | 'cancelled'
  discount_percentage: number
  extra_fees: number
  subtotal?: number
  // Customer snapshot fields (captured at sale time)
  customer_name?: string | null
  customer_email?: string | null
  customer_phone?: string | null
  customer_tax_id?: string | null
  customer_aib?: boolean | null
  seller_name?: string | null
  store?: Store
  cash_register?: CashRegister
  payment_method?: PaymentMethod
  customer?: Customer
  items?: SaleItem[]
  created_at: string
  updated_at: string
}

export interface StockAdjustmentItem {
  id: number
  stock_adjustment_id: number
  product_id: number
  product_name: string
  product_sku: string | null
  product_category: string | null
  quantity_change: number
  current_stock: number
}

export interface StockAdjustment {
  id: number
  organization_id: number
  store_id: number
  adjustment_date: string | null
  note: string | null
  status: 'draft' | 'applied' | 'cancelled'
  items_count?: number
  store?: Store
  items?: StockAdjustmentItem[]
  created_at: string
  updated_at: string
}

export interface InventoryItem {
  id: number
  product_id: number
  product_name: string
  product_sku: string | null
  product_color: string | null
  product_category: string | null
  expected_quantity: number
  actual_quantity: number | null
  difference: number | null
  purchase_price: number | null
  selling_price: number | null
}

export interface Inventory {
  id: number
  organization_id: number
  store_id: number
  store?: Store
  type: 'full' | 'partial'
  status: 'draft' | 'applied'
  note: string | null
  file_path?: string | null
  file_name?: string | null
  applied_at: string | null
  items_count: number
  filled_count: number
  items?: InventoryItem[]
  created_at: string
  updated_at: string
}

export interface PurchaseOrderReceptionOrderItem {
  order_item_id: number
  product_id: number
  product_name: string
  product_sku: string | null
  product_category: string | null
  quantity_ordered: number
  quantity_received: number | null
  unit_cost: number
}

export interface PurchaseOrderReception {
  id: number
  purchase_order_id: number
  note: string | null
  file_path: string | null
  file_name: string | null
  received_at: string | null
  items_count: number
  total_received: number
  created_at: string
  order_items?: PurchaseOrderReceptionOrderItem[]
}

export interface Paginated<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface LaravelValidationError {
  message: string
  errors?: Record<string, string[]>
}

export interface ApiPlan {
  id: number
  code: string
  name: string
  description: string | null
  annual_price: number
  features: string[] | null
  max_users: number | null
  max_stores: number | null
  created_at: string
  updated_at: string
}

export interface ApiSubscriptionCycle {
  id: number
  subscription_id: number
  period_start: string
  period_end: string
  due_date: string
  grace_end_date: string
  amount: number
  status: 'pending' | 'paid' | 'overdue'
  created_at: string
  updated_at: string
}

export interface ApiSubscription {
  id: number
  client_id: number
  plan_id: number
  start_date: string
  end_date: string | null
  custom_price: number
  payment_frequency: 'monthly' | 'quarterly' | 'semiannual' | 'yearly'
  status: 'trial' | 'active' | 'suspended' | 'cancelled' | 'expired' | 'pending'
  created_at: string
  updated_at: string
  plan?: ApiPlan
  cycles?: ApiSubscriptionCycle[]
}
