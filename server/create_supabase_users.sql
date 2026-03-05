-- Supabase auth.users INSERT

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role, raw_app_meta_data, raw_user_meta_data)
VALUES (
  'edb139b0-129a-440e-b47c-a8c32c4eae07',
  'Paulo.henrique@alcepereirafilho.com',
  '$2b$10$poXNFw/UlOINQLYWf/x1zum0cPekOFn0yPV.FpJrkCfjVlHkfQWhS',
  '2026-02-20T13:01:24.113Z',
  '2026-02-20T13:01:24.113Z',
  '2026-02-20T13:01:24.113Z',
  'authenticated',
  'authenticated',
  '{"provider":"email","providers":["email"]}',
  '{}'
) ON CONFLICT (email) DO NOTHING;

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role, raw_app_meta_data, raw_user_meta_data)
VALUES (
  'f6ccf4ce-0149-4f4c-9d07-fade62ef6f61',
  'Bruno.andre@alcepereirafilho.com',
  '$2b$10$FUbuz4xFclZxvvhaI.Qvbux66UpjntpkOFXr54koH0Us3se1cnQI6',
  '2026-02-20T13:01:24.113Z',
  '2026-02-20T13:01:24.113Z',
  '2026-02-20T13:01:24.113Z',
  'authenticated',
  'authenticated',
  '{"provider":"email","providers":["email"]}',
  '{}'
) ON CONFLICT (email) DO NOTHING;

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role, raw_app_meta_data, raw_user_meta_data)
VALUES (
  '3e711755-680c-42f9-9f8f-577d20fe16cb',
  'Andre.luiz@alcepereirafilho.com',
  '$2b$10$QtWLbCmbgIRa.vd.TGlqUOOxxb/A5BkIAmeCCehvCRDAVRI9WxivK',
  '2026-02-20T13:01:24.113Z',
  '2026-02-20T13:01:24.113Z',
  '2026-02-20T13:01:24.113Z',
  'authenticated',
  'authenticated',
  '{"provider":"email","providers":["email"]}',
  '{}'
) ON CONFLICT (email) DO NOTHING;

