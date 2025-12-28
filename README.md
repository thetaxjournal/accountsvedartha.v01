
# Vedartha Enterprise ERP Deployment Guide

This application is architected for high-performance deployment on Vercel.

## Deployment Steps

### 1. Preparation
Ensure you have a [Vercel account](https://vercel.com) and a [GitHub account](https://github.com).

### 2. Version Control
1. Initialize a git repository in your project folder:
   ```bash
   git init
   git add .
   git commit -m "Initial ERP Release v1.0"
   ```
2. Create a **Private** repository on GitHub.
3. Push your code:
   ```bash
   git remote add origin https://github.com/your-username/your-repo-name.git
   git branch -M main
   git push -u origin main
   ```

### 3. Vercel Connection
1. In Vercel dashboard, click **"Add New"** > **"Project"**.
2. Select the repository you just pushed.
3. Vercel will automatically detect **Vite** as the framework.
4. Click **Deploy**.

### 4. Custom Domain Setup
1. Navigate to **Project Settings** > **Domains**.
2. Add your domain (e.g., `billing.vedartha.com`).
3. Vercel will provide an **A record** or **CNAME**.
4. Log into your Domain Registrar (GoDaddy, Namecheap, etc.) and add that record to your DNS settings.
5. Wait 5-10 minutes for SSL propagation.

## System Security
*   **Access**: Default credentials are `admin` / `admin`.
*   **Backups**: Use the **System Config** module to download JSON backups regularly.
*   **Infrastructure**: Hosted on Vercel's global Edge network for sub-100ms latency worldwide.
