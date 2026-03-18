# Pre-Deployment Checklist

- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run test` passes
- [ ] `npm run build` passes
- [ ] Environment variables are configured for the target environment
- [ ] Database migrations are applied
- [ ] Production seed has been run if the initial admin user is required
- [ ] Security headers are enabled
- [ ] Rate limiting is active for auth, task creation, uploads, and admin routes
- [ ] Upload directory exists and is writable
- [ ] SMTP is configured or intentionally disabled
- [ ] Backup workflow or backup script is scheduled
- [ ] Health check endpoint responds successfully
- [ ] `.env` files are not committed
