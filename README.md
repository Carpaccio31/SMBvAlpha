
# ScanMyBook — Final (Vercel, Node 24.x, Edge API)

**All fixes included**: Node 24.x engines, SPA routing, Edge Function for `/api/search`, assets, screenshots, and `.gitignore`.

## Deploy (Vercel)

1. Create a new GitHub repo and upload the **contents** of this folder.
2. In Vercel: **New Project → Import** the repo.
3. Settings:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Deploy.

### Test
- App: `https://<project>.vercel.app/`
- API: `https://<project>.vercel.app/api/search?isbn=9780143127796` → JSON

## Local dev
```bash
npm i
npm run dev
```

Open http://localhost:5173 and allow the camera.

---

**Notes**
- Edge cache header: `s-maxage=600, stale-while-revalidate=60` is set in the API response.
- No secrets required.
