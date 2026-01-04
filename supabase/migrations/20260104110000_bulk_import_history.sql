-- Create bulk_import_batches table
create table public.bulk_import_batches (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  total_count integer not null default 0,
  completed_count integer not null default 0,
  success_count integer not null default 0,
  failed_count integer not null default 0,
  status text not null default 'processing'::text check (status in ('processing', 'completed', 'failed')),
  constraint bulk_import_batches_pkey primary key (id)
);

-- Create bulk_import_items table
create table public.bulk_import_items (
  id uuid not null default gen_random_uuid(),
  batch_id uuid not null references public.bulk_import_batches(id) on delete cascade,
  original_address text not null,
  status text not null default 'pending'::text check (status in ('pending', 'processing', 'success', 'failed')),
  result_message text,
  deal_id uuid references public.deals(id) on delete set null,
  offer_link text,
  created_at timestamp with time zone not null default now(),
  constraint bulk_import_items_pkey primary key (id)
);

-- Enable RLS
alter table public.bulk_import_batches enable row level security;
alter table public.bulk_import_items enable row level security;

-- Policies for bulk_import_batches
create policy "Users can view their own batches"
  on public.bulk_import_batches for select
  using (auth.uid() = user_id);

create policy "Users can insert their own batches"
  on public.bulk_import_batches for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own batches"
  on public.bulk_import_batches for update
  using (auth.uid() = user_id);

-- Policies for bulk_import_items (via batch_id logic for simplified RLS, or direct join)
-- Since items don't have user_id component, we check via the batch relationship
create policy "Users can view items of their batches"
  on public.bulk_import_items for select
  using (
    exists (
      select 1 from public.bulk_import_batches
      where bulk_import_batches.id = bulk_import_items.batch_id
      and bulk_import_batches.user_id = auth.uid()
    )
  );

create policy "Users can insert items to their batches"
  on public.bulk_import_items for insert
  with check (
    exists (
      select 1 from public.bulk_import_batches
      where bulk_import_batches.id = bulk_import_items.batch_id
      and bulk_import_batches.user_id = auth.uid()
    )
  );

create policy "Users can update items of their batches"
  on public.bulk_import_items for update
  using (
    exists (
      select 1 from public.bulk_import_batches
      where bulk_import_batches.id = bulk_import_items.batch_id
      and bulk_import_batches.user_id = auth.uid()
    )
  );
