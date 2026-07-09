# Publish NewPlayer on GitHub (step-by-step)

This project is ready to push. You do **not** need the GitHub CLI.

## 1. Create the empty repo on GitHub

1. Open [https://github.com/new](https://github.com/new)  
2. Repository name: **`NewPlayer`** (recommended)  
3. Description: `Windows desktop player — NewTube, NewTV, NewRadio, NewWeather, New(s)`  
4. Public  
5. **Do not** add README / license / .gitignore (this folder already has them)  
6. Create repository  

## 2. Push this folder

In PowerShell:

```powershell
cd C:\Users\ad521\NewTube

git remote add origin https://github.com/YOUR_USERNAME/NewPlayer.git
git branch -M main
git push -u origin main
```

Use your real GitHub username. Sign in when Windows/Git asks.

### Or: Import via ZIP

1. Zip the **NewTube** folder **without** `node_modules` and `dist`  
2. GitHub → your empty repo → **uploading an existing file** / or use **Import repository** with a public URL if you host the zip  

Prefer `git push` for a clean history.

## 3. Upload downloads (Releases)

People download **from Releases**, not from the source tree.

1. Build locally:

   ```powershell
   cd C:\Users\ad521\NewTube
   npm run dist
   ```

2. GitHub → **Releases** → **Draft a new release**  
3. Tag: `v2.0.0`  
4. Title: `NewPlayer 2.0.0`  
5. Attach:

   - `release\NewPlayer-Setup-2.0.0-x64.exe`  
   - `release\NewPlayer-Portable-2.0.0-x64.exe`  

6. Paste release notes from `CHANGELOG.md`  
7. Publish  

## 4. Optional polish

- Add topics: `electron`, `youtube`, `iptv`, `radio`, `weather`, `windows`  
- Add screenshots under `docs/screenshots/` and link in README  
- Enable Issues / Discussions  

## 5. After updates

```powershell
npm run dist
git add -A
git commit -m "describe your change"
git push
# then upload new EXEs on a new Release (v2.0.1, etc.)
```
