# Workout Tracker

A static workout tracker for the four-day upper/lower routine. The site can be hosted on GitHub Pages, while workout data syncs through Supabase Auth and Database.

## Local Use

Run a local server from this folder:

```powershell
python -m http.server 5173
```

Then visit `http://localhost:5173`. Signed-out users will be sent to `login.html`.

If `supabase-config.js` is still blank, the app will render a setup message instead of the tracker.

## Supabase Setup

1. Create a Supabase project at `https://supabase.com`.
2. Open the SQL editor in Supabase.
3. Run the contents of `supabase-schema.sql`.
4. Go to Project Settings, then API.
5. Copy the Project URL and public anon key.
6. Paste them into `supabase-config.js`:

```js
window.WORKOUT_SUPABASE_CONFIG = {
  url: "https://your-project-ref.supabase.co",
  anonKey: "your-public-anon-key",
};
```

The anon key is intended to be public in browser apps. Row-level security in `supabase-schema.sql` keeps each user's workouts private.

## GitHub Pages Deployment

1. Create a GitHub repository for this folder.
2. Push these files to GitHub.
3. In the repo, go to Settings, then Pages.
4. Set the source to deploy from your main branch.
5. Wait for GitHub Pages to publish the site.
6. Copy the published site URL.
7. In Supabase, go to Authentication, then URL Configuration.
8. Add the GitHub Pages URL to Site URL and Redirect URLs.

After that, open the GitHub Pages site, create an account on `login.html`, and start logging workouts.

## What It Tracks

- Synced workout history stored in Supabase
- Login and account creation through `login.html`
- Per-user custom routines you can edit on the **Edit Routine** tab (add/edit/delete/reorder days and exercises), synced to your account
- Sets, reps, weight, duration, bodyweight, and notes
- Total workouts, recent consistency, streak, and total volume
- Weekly volume and exercise progress using estimated 1-rep max

## Custom Routines

Each account gets its own editable copy of the default **6-day split** (Back/Bi, Chest/Tri, Legs/Abs, Shoulders/Arms, Chest/Back, Legs/Shoulders). Use the **Edit Routine** tab to add workout days, rename them, add/edit/delete exercises (sets, rep range, muscle group), and reorder days or exercises. Changes save to Supabase automatically and sync across devices.

If you set up Supabase before this feature existed, re-run `supabase-schema.sql` in the Supabase SQL Editor once to create the new `routines` table. It is safe to run again; it only adds the routines table and its security policies.

## Adjusting the App Later

- Edit `app.js` to change the routine, dashboard logic, or Supabase behavior.
- Edit `auth.js` or `login.html` to change login/account creation behavior.
- Edit `styles.css` to change the look and layout.
- Edit `index.html` to change the page shell or loaded scripts.
- Run `supabase-schema.sql` again only if you intentionally change the database schema.
