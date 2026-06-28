# Security Checklist

Core items to verify before production deployment:

- Ensure no secrets are committed to Git. Run `git ls-files` and inspect for `.env` or credentials.
- Use strong `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` and rotate periodically.
- Set cookie flags: `HttpOnly`, `Secure`, `SameSite=Strict` where applicable on auth cookies.
- Enforce `CORS_ORIGIN` to only your frontend domain(s).
- Use password hashing (`bcrypt`) with a reasonable work factor (already used).
- Enable HTTPS only; enforce TLS at the CDN/hosting layer.
- Ensure SQL migrations are applied from trusted sources only.
- Monitor failed login attempts and apply account lockout/rate limits.
- Keep dependencies up to date; run `npm audit` regularly.
