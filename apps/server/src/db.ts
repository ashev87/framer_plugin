import pg from "pg"

export type Db = pg.Pool

export function openDb(url: string): Db {
    return new pg.Pool({ connectionString: url, max: 5 })
}

/** Idempotent schema. Small enough that plain statements beat a migration tool for now. */
export async function migrate(db: Db): Promise<void> {
    await db.query(`
        create table if not exists licences (
            id uuid primary key default gen_random_uuid(),
            key text not null unique,
            plan text not null check (plan in ('site', 'agency')),
            max_sites int not null,
            email text,
            stripe_customer_id text,
            stripe_session_id text unique,
            status text not null default 'active' check (status in ('active', 'refunded', 'expired')),
            expires_at timestamptz not null,
            created_at timestamptz not null default now()
        );
        create table if not exists sites (
            id uuid primary key default gen_random_uuid(),
            framer_project_id text not null unique,
            project_url text not null,
            api_key_enc text not null,
            api_key_hint text not null,
            token_hash text not null,
            source_kind text not null,
            source_handle text not null,
            source_options jsonb not null default '{}',
            collection_name text not null default 'Jobs',
            publish_mode text not null default 'sync-only'
                check (publish_mode in ('sync-only', 'publish-if-clean', 'always-publish')),
            licence_id uuid references licences(id) on delete set null,
            last_run_at timestamptz,
            consecutive_failures int not null default 0,
            created_at timestamptz not null default now()
        );
        create table if not exists runs (
            id bigserial primary key,
            site_id uuid not null references sites(id) on delete cascade,
            trigger text not null check (trigger in ('manual', 'schedule')),
            status text not null check (status in ('ok', 'failed')),
            started_at timestamptz not null,
            finished_at timestamptz not null default now(),
            jobs_in_source int,
            created int, updated int, removed int,
            published boolean not null default false,
            message text
        );
        create index if not exists runs_site_idx on runs (site_id, id desc);
        alter table licences add column if not exists stripe_subscription_id text;

        -- Webflow sites share the sites table. For them api_key_enc holds the encrypted OAuth token.
        alter table sites add column if not exists platform text not null default 'framer';
        alter table sites add column if not exists webflow_site_id text unique;
        alter table sites add column if not exists site_name text;
        alter table sites add column if not exists disconnected_at timestamptz;
        alter table sites alter column framer_project_id drop not null;
        alter table sites alter column project_url drop not null;
        alter table sites drop constraint if exists sites_publish_mode_check;
        alter table sites add constraint sites_publish_mode_check
            check (publish_mode in ('sync-only', 'publish-if-clean', 'always-publish', 'publish-jobs'));
        alter table sites drop constraint if exists sites_platform_check;
        alter table sites add constraint sites_platform_check check (platform in ('framer', 'webflow'));

        -- Between the Webflow OAuth callback and the setup form. Swept after an hour.
        create table if not exists webflow_pending (
            id uuid primary key default gen_random_uuid(),
            token_hash text not null unique,
            access_token_enc text not null,
            sites jsonb not null,
            created_at timestamptz not null default now()
        );
    `)
}
