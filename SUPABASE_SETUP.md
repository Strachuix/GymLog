# Supabase setup for GymLog

## 1. Create the project
- Create a new project in Supabase.
- Open the SQL editor and run `supabase/schema.sql`.
- In **Authentication > Sign In / Providers**, enable **Email**.

## 2. Configure redirect URL
Add your app URL to:
- `Authentication > URL Configuration > Site URL`
- `Authentication > URL Configuration > Redirect URLs`

For local development you can use for example:
- `http://localhost:8000/index.html`
- `http://127.0.0.1:8000/index.html`

## 3. Copy public credentials
In `Project Settings > API`, copy:
- `Project URL`
- `anon public key`

Paste them into `js/supabase-config.js`:

```js
window.GYMLOG_SUPABASE_CONFIG = {
    url: 'https://YOUR-PROJECT.supabase.co',
    anonKey: 'YOUR-ANON-KEY',
    redirectUrl: window.location.origin + window.location.pathname
};
```

## 4. First cloud login
- Open the app.
- Choose `Zaloguj i synchronizuj`.
- Enter your email.
- Click the magic link from the email.
- The app will try to migrate local data to the cloud automatically.

## 5. Important note
This implementation is **local-first**:
- the app still saves to the device immediately,
- cloud sync happens after login and when online,
- local users can continue without an account, but with a risk of data loss.

## 6. Multi-device conflict handling
If the user has different data locally and in Supabase, the app now compares both sides and asks what to do:
- **keep cloud only** — replace device data with what is in Supabase,
- **keep local only** — overwrite Supabase with this device's data,
- **merge** — keep records with different `id` values from both sources.

For `merge`, duplicate detection is based only on record `id`.
