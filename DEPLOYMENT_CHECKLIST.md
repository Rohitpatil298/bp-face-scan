# 📋 Deployment Checklist - VitalSense AI

Quick checklist to deploy your rPPG app to production. For detailed instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

---

## ☑️ Pre-Deployment Checklist

- [x] ✅ Blood pressure model updated (lower, healthier ranges)
- [x] ✅ Frontend auto-detects environment (localhost vs production)
- [x] ✅ CORS configured for Netlify domains
- [x] ✅ `render.yaml` configured correctly
- [x] ✅ `netlify.toml` created
- [x] ✅ `.gitignore` added

---

## 🎯 Deployment Steps (15 minutes)

### 1️⃣ Push to GitHub (5 min)
```bash
cd C:\Users\Lenovo\Downloads\rppg_vitals\rppg_vitals
git init
git add .
git commit -m "Ready for production deployment"
git branch -M main
# Create repo on GitHub first, then:
git remote add origin https://github.com/YOUR_USERNAME/rppg-vitals.git
git push -u origin main
```

**✓ Done?** → Your code is on GitHub

---

### 2️⃣ Deploy Backend to Render (5 min)
1. Go to https://render.com (sign up if needed)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo: `rppg-vitals`
4. Render auto-detects `render.yaml` ✅
5. Click **"Create Web Service"**
6. Wait ~5 minutes for deployment

**✓ Done?** → Copy your backend URL:
```
https://rppg-vitals-api-XXXX.onrender.com
```

---

### 3️⃣ Update Frontend with Backend URL (1 min)
1. Open `frontend/app.jsx`
2. Find line ~7:
   ```javascript
   : 'https://rppg-vitals-api.onrender.com';
   ```
3. Replace with YOUR actual Render URL from step 2

**✓ Done?** → Frontend knows where to find backend

---

### 4️⃣ Deploy Frontend to Netlify (4 min)

**Option A - Drag & Drop (Easiest):**
1. Go to https://netlify.com (sign up if needed)
2. Drag the **`frontend`** folder onto the deploy zone
3. Done! Copy your URL: `https://YOUR_APP.netlify.app`

**Option B - GitHub (Better for updates):**
1. Create a new GitHub repo for frontend
2. Push the `frontend` folder to it
3. On Netlify: "Add site" → "Import from GitHub"
4. Select your frontend repo
5. Build settings:
   - Publish directory: `.` (leave default)
   - Build command: `echo 'No build needed'`
6. Click "Deploy site"

**✓ Done?** → Your app is live at:
```
https://YOUR_APP.netlify.app
```

---

## ✅ Post-Deployment Testing

Visit your Netlify URL and test:
- [ ] User info form submits successfully
- [ ] Camera permission requested and granted
- [ ] Face detection works (green box appears)
- [ ] 45-second scan completes without errors
- [ ] Results page shows:
  - [ ] Heart rate (60-100 BPM)
  - [ ] Blood pressure (110-125 / 70-85)
  - [ ] Stress level (Low/Moderate/High)

**All working?** 🎉 **Congratulations! Your app is live!**

---

## 🐛 Quick Fixes

### "CORS Error" in browser console
→ Check `api/app.py` includes your Netlify domain
→ Redeploy backend after updating

### "Connection refused" or "Network error"
→ Verify backend URL in `frontend/app.jsx` is correct
→ Check Render dashboard - is backend running?

### "Camera not working"
→ Must use HTTPS (Netlify provides this automatically)
→ Check browser permissions

### Backend taking 30+ seconds to respond
→ First request after idle = cold start (free tier)
→ Subsequent requests will be fast

---

## 📊 Monitor Your App

**Render Dashboard:** https://dashboard.render.com
- View logs
- Monitor requests
- Check errors

**Netlify Dashboard:** https://app.netlify.com
- View deploys
- Check analytics
- See bandwidth

---

## 🔄 Making Updates Later

**Backend changes:**
```bash
git add .
git commit -m "Update backend"
git push
```
→ Render auto-deploys in ~2 minutes

**Frontend changes:**
- Drag & drop entire `frontend` folder to Netlify again
- OR push to GitHub (if using GitHub deployment)

---

## 📝 Save These URLs

After deployment, save:
- ✍️ Backend: ________________________________
- ✍️ Frontend: ________________________________
- ✍️ GitHub Repo: ________________________________

---

## 🎉 You're Done!

Share your app with the world: `https://YOUR_APP.netlify.app`

**Remember:** Include the disclaimer that this is a wellness tool, not a medical device!

Need detailed help? See [DEPLOYMENT.md](DEPLOYMENT.md)
