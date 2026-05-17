# Astro Dokploy Deployment Guide

This guide explains why your Astro deployment on Dokploy is showing errors and provides **two simple methods** to fix it and successfully deploy your site.

---

## Why did it fail?

Astro is configured as a **Static Site Generation (SSG)** app by default (it compiles into static HTML/CSS/JS in the `./dist` folder). 

When you deploy a Node.js project, Dokploy's build tool (**Nixpacks**) automatically inspects your `package.json` to find out how to run the project.
In your `package.json`, the start script is set to:
```json
"start": "astro dev"
```

### The Problems:
1. **Localhost Binding:** The `astro dev` command starts Astro's local development server which only listens on `127.0.0.1` (localhost). A Docker container's internal local address is not reachable by Dokploy’s Traefik reverse proxy, resulting in a **502 Bad Gateway** or health check failure.
2. **Development Mode in Production:** `astro dev` is meant for local editing, not production serving.
3. **Missing Publish Directory:** If the **Publish Directory** isn't configured, Dokploy tries to run it as a live Node server instead of serving it as a fast, static website.

---

## 🛠 How to Fix It (Choose One Option)

Here are the two ways you can deploy your Astro site on Dokploy. **Option 1** is the easiest, while **Option 2** (using the Dockerfile we just created) is the most robust and robust.

### Option 1: Nixpacks Static Deployment (Zero Code Changes)
If you want to keep using Nixpacks, you must configure Dokploy to treat this as a static site so it serves your `./dist` directory using Nginx automatically.

1. Go to your **Dokploy Dashboard**.
2. Select your project and navigate to the **Application Settings** for your Astro app.
3. In the **Build** section, ensure the following are configured:
   * **Build Type**: `Nixpacks`
   * **Publish Directory**: `dist` *(This is the critical step!)*
4. Under **Domain settings**:
   * Set the **Port** to `80` (or `8080` if using Nixpacks' default static port).
5. **Redeploy** the application.

---

### Option 2: Dockerfile Deployment (Recommended & Extremely Robust)
We have already created a highly optimized, multi-stage production `Dockerfile` in your root directory. This builds your Astro site and serves it via an ultra-fast, lightweight **Nginx Alpine** web server.

1. Go to your **Dokploy Dashboard**.
2. Navigate to your application's **Settings**.
3. Under the **Build** configuration, change:
   * **Build Type**: Select **Dockerfile**
4. Under **Domain settings**:
   * Set the **Container Port** to `80` (since Nginx serves static files on port 80).
5. **Commit and push** the new `Dockerfile` to your GitHub/Git repository.
6. Click **Deploy** in Dokploy.

---

## 🔑 Build-Time Environment Variables (If Applicable)

If your Astro application uses environment variables (like Google Analytics ID or API tokens) that need to be injected into the static files at build time:

1. In Dokploy, go to your application's **Environment** tab.
2. Add your environment variables (e.g. `PUBLIC_GTAG_MEASUREMENT_ID`).
3. If using the **Dockerfile** approach, they will be automatically injected if prefixed with `PUBLIC_` or if you declare them as `ARG` inside your Dockerfile.
