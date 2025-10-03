# FIXMEs and Follow-ups

- Email OTP delivery: now supports SMTP_URL or host/user/pass. Verify envs in production: `SMTP_URL` or `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `FROM_EMAIL`.
- Profile picture upload: added `POST /api/users/me/avatar` with persistent storage at `/uploads/avatars`. Ensure the server has write access and that `uploads` is persisted in deployment.
- Media uploads: chat still sends images/audio as data URLs from the client; consider routing through `/api/messages/upload` for large files/CDN offload.
- Mobile styles: adjusted bubble max-width and media scaling; audit other components for fixed heights that may affect small screens.
- Audio UX: simplified to single-click toggle; confirm cross-browser `MediaRecorder` support, especially on iOS Safari.
- Security: consider virus scanning and file type validation on uploads beyond mimetype; add rate limits to auth endpoints.
- Caching: add proper cache headers for `/uploads/avatars/*` with versioned filenames.
