// Root barrel kept intentionally minimal. Import from the environment-scoped
// subpaths (`/frontend`, `/msw`, `/backend`) so a frontend test cannot
// accidentally pull in `pg` / `drizzle-orm`.
export {};
