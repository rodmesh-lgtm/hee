CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name text NOT NULL,
  display_name text NOT NULL,
  slug text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  phone text,
  address_text text,
  timezone text NOT NULL DEFAULT 'Asia/Riyadh',
  preparation_minutes integer NOT NULL DEFAULT 10,
  status text NOT NULL DEFAULT 'active',
  UNIQUE (merchant_id, slug)
);

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  base_price_halalas integer NOT NULL CHECK (base_price_halalas >= 0),
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_number text NOT NULL UNIQUE,
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  branch_id uuid NOT NULL REFERENCES branches(id),
  customer_name text NOT NULL,
  customer_phone text,
  status text NOT NULL DEFAULT 'pending_payment',
  subtotal_halalas integer NOT NULL,
  total_halalas integer NOT NULL,
  payment_status text NOT NULL DEFAULT 'unpaid',
  requested_pickup_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX orders_branch_status_created_idx
ON orders(branch_id, status, created_at DESC);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id),
  provider text NOT NULL,
  provider_payment_id text,
  amount_halalas integer NOT NULL,
  status text NOT NULL,
  paid_at timestamptz,
  UNIQUE(provider, provider_payment_id)
);
