-- Products seen on retailer sale listings. One row per product, kept current by each scrape.
create type product_status as enum ('active', 'sold_out');

create table products (
    retailer        text           not null,
    external_id     text           not null,               -- the retailer's own product id
    name            text           not null,
    url             text           not null,
    image_url       text,
    gender          text           not null,
    sizes           text[]         not null default '{}',
    was_price_pence integer        not null,               -- integer pence: no float rounding
    now_price_pence integer        not null,
    discount        smallint       not null,
    status          product_status not null default 'active',
    first_seen_at   timestamptz    not null default now(),
    last_seen_at    timestamptz    not null default now(),
    sold_out_at     timestamptz,
    primary key (retailer, external_id)
);

-- Serves the deals snapshot: active products, best discount first.
create index products_active_by_discount on products (discount desc) where status = 'active';

-- One row per retailer per scrape: an audit log and the first place to look when something is off.
create table scrape_runs (
    id          bigserial   primary key,
    retailer    text        not null,
    started_at  timestamptz not null,
    finished_at timestamptz not null default now(),
    status      text        not null check (status in ('ok', 'partial', 'failed')),
    hits        integer     not null default 0,
    upserted    integer     not null default 0,
    sold_out    integer     not null default 0,
    error       text
);

create index scrape_runs_recent on scrape_runs (started_at desc);

-- Only the backend's own database connection reads these tables. With RLS on and no policies,
-- Supabase's public REST API (anon / authenticated roles) cannot read or write them.
alter table products    enable row level security;
alter table scrape_runs enable row level security;
