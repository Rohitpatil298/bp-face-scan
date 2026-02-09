# 🚀 Deployment Guide - VitalSense AI

Complete guide to deploy your rPPG Vital Signs application to production.

## 📦 Project Structure
- **Backend (FastAPI/Python)** → Render
- **Frontend (React)** → Netlify

---

## 🔧 Part 1: Deploy Backend to Render

### Step 1: Push to GitHub
```bash
cd C:\Users\Lenovo\Downloads\rppg_vitals\rppg_vitals
git init
git add .
git commit -m "Initial commit - rPPG Vitals App"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/rppg-vitals.git
git push -u origin main
```

### Step 2: Deploy on Render
1. Go to [render.com](https://render.com) and sign up/login
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Render will auto-detect `render.yaml` configuration
5. Click **"Create Web Service"**

### Step 3: Get Your Backend URL
- After deployment, Render provides a URL like:
  ```
  https://rppg-vitals-api.onrender.com
  ```
- Copy this URL - you'll need it for the frontend!

### ⚠️ Important Notes:
- First deployment may take 5-10 minutes
- The BP model will be trained automatically on first run
- Free tier: app sleeps after 15 min of inactivity (cold start ~30 sec)

---

## 🎨 Part 2: Deploy Frontend to Netlify

### Step 1: Update API URL in Frontend
1. Open `frontend/app.jsx`
2. Find this line:
   ```javascript
   : 'https://rppg-vitals-api.onrender.com';
   ```
3. **Replace** with YOUR actual Render backend URL

### Step 2: Deploy to Netlify

#### Option A: Drag & Drop (Easiest)
1. Go to [netlify.com](https://netlify.com) and sign up/login
2. Drag the **entire `frontend` folder** to Netlify's deploy zone
3. Done! You'll get a URL like: `https://your-app-name.netlify.app`

#### Option B: GitHub Deployment (Recommended)
1. Create a separate GitHub repo for frontend:
   ```bash
   cd frontend
   git init
   git add .
   git commit -m "Frontend deployment"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/rppg-vitals-frontend.git
   git push -u origin main
   ```

2. On Netlify:
   - Click **"Add new site"** → **"Import an existing project"**
   - Connect GitHub and select your frontend repo
   - **Build settings:**
     - Base directory: `/` (leave empty)
     - Build command: `echo 'No build needed'`
     - Publish directory: `.`
   - Click **"Deploy site"**

3. **Custom domain (optional):**
   - Go to Site settings → Domain management
   - Add your custom domain

---

## 🔐 Part 3: Configure CORS (Backend)

Your backend already has CORS configured, but update it with your actual Netlify URL:

1. Open `api/app.py`
2. Update the `allow_origins` list:
   ```python
   allow_origins=[
       "https://your-actual-app.netlify.app",  # Your Netlify URL
       "http://localhost:3000",  # Keep for local development
       "*"  # Or remove this for better security
   ]
   ```
3. Commit and push changes - Render will auto-redeploy

---

## ✅ Part 4: Test Your Live App

1. Open your Netlify URL: `https://your-app-name.netlify.app`
2. Test complete flow:
   - ✓ Enter user information
   - ✓ Allow camera access
   - ✓ Complete 45-second scan
   - ✓ View vital signs results

### Expected Results:
- **Heart Rate:** 60-90 BPM
- **Blood Pressure:** 110-125 / 70-85 mmHg
- **Stress Level:** Low/Moderate/High

---

## 🐛 Troubleshooting

### Backend Issues:
- **Error: ModuleNotFoundError**
  - Check `requirements.txt` is complete
  - Verify Python version (3.11) in `render.yaml`

- **App sleeping (free tier)**
  - First request takes ~30 seconds (cold start)
  - Consider upgrading to paid tier for instant response

### Frontend Issues:
- **CORS Error**
  - Verify backend CORS allows your Netlify domain
  - Check browser console for exact error

- **Camera not working**
  - Ensure HTTPS (required for camera access)
  - Netlify provides HTTPS by default

- **Blank page after scan**
  - Check browser console for errors
  - Verify backend is responding (visit backend URL directly)

---

## 📊 Monitoring

### Render Dashboard:
- View logs: Render Dashboard → Your service → Logs
- Monitor requests, errors, and performance

### Netlify Dashboard:
- Analytics: Netlify Dashboard → Analytics
- Deploy logs: Deploys tab → Click on deploy

---

## 🔄 Making Updates

### Backend Updates:
```bash
git add .
git commit -m "Update backend"
git push
```
→ Render auto-deploys new changes

### Frontend Updates:
1. Update files in `frontend/` folder
2. Drag & drop entire folder to Netlify again
   OR
3. Push to GitHub (Netlify auto-deploys)

---

## 💡 Production Tips

1. **Custom Domain:** Both Render and Netlify support custom domains
2. **HTTPS:** Always use HTTPS (required for camera access)
3. **Environment Variables:** Use Render's environment variables for secrets
4. **Rate Limiting:** Consider adding rate limiting to prevent abuse
5. **Analytics:** Add Google Analytics or Plausible
6. **Error Tracking:** Consider Sentry for error monitoring

---

## 📝 URLs to Save

After deployment, save these URLs:

- **Backend API:** https://rppg-vitals-api.onrender.com
- **Frontend:** https://your-app-name.netlify.app
- **GitHub Backend:** https://github.com/YOUR_USERNAME/rppg-vitals
- **GitHub Frontend:** https://github.com/YOUR_USERNAME/rppg-vitals-frontend

---

## 🎉 You're Live!

Your rPPG Vital Signs app is now accessible worldwide! Share the Netlify URL with anyone to try your app.

**⚠️ Remember:** This is a wellness estimation tool, NOT a medical device. Include appropriate disclaimers on your landing page.

---

## 🆘 Need Help?

- **Render Docs:** https://render.com/docs
- **Netlify Docs:** https://docs.netlify.com
- **FastAPI Docs:** https://fastapi.tiangolo.com

Good luck with your deployment! 🚀
