# 🔧 CineAI Troubleshooting Guide

Common issues and solutions for self-hosted CineAI setup.

## 📋 Quick Diagnostics

Before diving into specific issues, run these commands to check your setup:

```bash
# Check overall system health
npm run setup

# Check app health
npm run health

# Check Supabase status
supabase status

# Check Docker
docker ps
```

## 🚨 Common Issues

### Setup Script Issues

#### Issue: "Permission denied" on setup script
**Symptoms:**
```bash
./scripts/setup-local.sh: Permission denied
```

**Solution:**
```bash
# Make script executable
chmod +x scripts/setup-local.sh

# Run again
./scripts/setup-local.sh
```

#### Issue: "Node.js is not installed"
**Symptoms:**
```bash
❌ Node.js is not installed
```

**Solutions:**
- **macOS**: `brew install node`
- **Windows**: Download from [nodejs.org](https://nodejs.org/)
- **Linux**: `sudo apt install nodejs npm`

#### Issue: "Docker is not running"
**Symptoms:**
```bash
❌ Docker is not running
```

**Solutions:**
1. Start Docker Desktop
2. Wait for it to fully start (green icon)
3. Try again: `./scripts/setup-local.sh`

#### Issue: "Supabase CLI not found"
**Symptoms:**
```bash
⚠️ Supabase CLI not found. Installing...
```

**Solutions:**
- **macOS**: `brew install supabase/tap/supabase`
- **Windows**: Download from [GitHub releases](https://github.com/supabase/cli/releases)
- **Linux**: `curl -fsSL https://supabase.com/install.sh | sh`

### Supabase Issues

#### Issue: "Failed to start Supabase"
**Symptoms:**
```bash
❌ Failed to start Supabase
```

**Solutions:**

1. **Check Docker is running:**
   ```bash
   docker --version
   docker ps
   ```

2. **Check port conflicts:**
   ```bash
   # Check if ports are in use
   lsof -i :54321  # API port
   lsof -i :54322  # DB port
   lsof -i :54323  # Studio port
   ```

3. **Reset Supabase:**
   ```bash
   supabase stop
   supabase start
   ```

4. **Check Docker resources:**
   - Open Docker Desktop
   - Go to Settings > Resources
   - Increase Memory to 4GB+
   - Restart Docker

#### Issue: "Database connection failed"
**Symptoms:**
```bash
❌ Supabase is not running
❌ Database connection failed
```

**Solutions:**

1. **Check Supabase status:**
   ```bash
   supabase status
   ```

2. **Restart Supabase:**
   ```bash
   supabase stop
   supabase start
   ```

3. **Check database logs:**
   ```bash
   supabase logs
   ```

4. **Reset database:**
   ```bash
   supabase db reset
   ```

#### Issue: "Migrations not applied"
**Symptoms:**
```bash
❌ Database migrations are not applied
```

**Solutions:**

1. **Apply migrations manually:**
   ```bash
   supabase db reset
   ```

2. **Check migration status:**
   ```bash
   supabase migration list
   ```

3. **Force migration:**
   ```bash
   supabase db push
   ```

### Application Issues

#### Issue: "Port 3000 already in use"
**Symptoms:**
```bash
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions:**

1. **Kill process using port 3000:**
   ```bash
   # Find process
   lsof -i :3000
   
   # Kill process (replace PID)
   kill -9 <PID>
   ```

2. **Use different port:**
   ```bash
   npm run dev -- -p 3001
   ```

3. **Check for other Next.js apps:**
   ```bash
   ps aux | grep next
   ```

#### Issue: "Environment variables not found"
**Symptoms:**
```bash
❌ .env.local file not found
❌ API key not configured
```

**Solutions:**

1. **Check if .env.local exists:**
   ```bash
   ls -la .env.local
   ```

2. **Create from example:**
   ```bash
   cp env.example .env.local
   ```

3. **Run setup script again:**
   ```bash
   ./scripts/setup-local.sh
   ```

#### Issue: "API key invalid format"
**Symptoms:**
```bash
⚠️ OpenAI API key format looks invalid
⚠️ Anthropic API key format looks invalid
```

**Solutions:**

1. **Check API key format:**
   - OpenAI: Should start with `sk-`
   - Anthropic: Should start with `sk-ant-`

2. **Get new API keys:**
   - [OpenAI API Keys](https://platform.openai.com/api-keys)
   - [Anthropic Console](https://console.anthropic.com/)

3. **Update .env.local:**
   ```bash
   nano .env.local
   # Edit the API keys
   ```

#### Issue: "App won't start"
**Symptoms:**
```bash
npm run dev
# App crashes or won't start
```

**Solutions:**

1. **Check Node.js version:**
   ```bash
   node --version  # Should be 18+
   ```

2. **Clear cache:**
   ```bash
   rm -rf .next
   rm -rf node_modules/.cache
   npm run dev
   ```

3. **Reinstall dependencies:**
   ```bash
   rm -rf node_modules
   npm install
   ```

4. **Check for TypeScript errors:**
   ```bash
   npm run type-check
   ```

### Network Issues

#### Issue: "Cannot reach external APIs"
**Symptoms:**
```bash
❌ OpenAI API connectivity test failed
❌ TMDB API not reachable
```

**Solutions:**

1. **Check internet connection:**
   ```bash
   ping google.com
   ```

2. **Check firewall settings:**
   - Allow Node.js through firewall
   - Allow Docker through firewall

3. **Check proxy settings:**
   ```bash
   echo $HTTP_PROXY
   echo $HTTPS_PROXY
   ```

4. **Test API connectivity:**
   ```bash
   curl -I https://api.openai.com/v1/models
   curl -I https://api.themoviedb.org/3/movie/550
   ```

### Platform-Specific Issues

#### macOS Issues

##### Issue: "Homebrew not found"
**Solutions:**
```bash
# Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies
brew install node
brew install docker
brew install supabase/tap/supabase
```

##### Issue: "M1/M2 Mac Docker issues"
**Symptoms:**
```bash
❌ Docker is not running
❌ Failed to start Supabase
```

**Solutions:**

1. **Use Docker Desktop for Mac:**
   - Download from [docker.com](https://www.docker.com/products/docker-desktop/)
   - Enable "Use Rosetta for x86/amd64 emulation"

2. **Check Docker resources:**
   - Settings > Resources > Memory: 4GB+
   - Settings > Resources > CPUs: 2+

3. **Restart Docker:**
   ```bash
   # Quit Docker Desktop
   # Restart Docker Desktop
   # Wait for green icon
   ```

#### Windows Issues

##### Issue: "PowerShell execution policy"
**Symptoms:**
```bash
scripts\setup-local.bat
# Script won't run
```

**Solutions:**

1. **Enable PowerShell execution:**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

2. **Run as Administrator:**
   - Right-click Command Prompt
   - "Run as administrator"
   - Try setup script again

##### Issue: "Docker Desktop not starting"
**Solutions:**

1. **Enable Hyper-V:**
   - Control Panel > Programs > Turn Windows features on/off
   - Check "Hyper-V"
   - Restart computer

2. **Enable WSL 2:**
   ```powershell
   wsl --install
   ```

3. **Restart Docker Desktop:**
   - Quit Docker Desktop
   - Restart Docker Desktop
   - Wait for green icon

##### Issue: "Path issues with Supabase CLI"
**Solutions:**

1. **Add to PATH manually:**
   - Download Supabase CLI
   - Extract to `C:\supabase\`
   - Add `C:\supabase\` to PATH

2. **Use full path:**
   ```cmd
   C:\supabase\supabase.exe start
   ```

#### Linux Issues

##### Issue: "Permission denied for Docker"
**Symptoms:**
```bash
permission denied while trying to connect to the Docker daemon socket
```

**Solutions:**

1. **Add user to docker group:**
   ```bash
   sudo usermod -aG docker $USER
   newgrp docker
   ```

2. **Restart Docker service:**
   ```bash
   sudo systemctl restart docker
   ```

##### Issue: "Node.js version too old"
**Solutions:**

1. **Install Node.js 18+:**
   ```bash
   # Using NodeSource repository
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Or use nvm:**
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 18
   nvm use 18
   ```

### Performance Issues

#### Issue: "App is slow"
**Solutions:**

1. **Check system resources:**
   ```bash
   # Check memory usage
   free -h
   
   # Check CPU usage
   top
   ```

2. **Optimize Docker:**
   - Increase Docker memory limit
   - Close other applications
   - Restart Docker

3. **Clear caches:**
   ```bash
   rm -rf .next
   rm -rf node_modules/.cache
   npm run dev
   ```

#### Issue: "Database is slow"
**Solutions:**

1. **Check database size:**
   ```bash
   supabase studio
   # Check table sizes in Studio
   ```

2. **Optimize database:**
   ```bash
   supabase db optimize
   ```

3. **Reset database:**
   ```bash
   supabase db reset
   ```

### Data Issues

#### Issue: "Data not persisting"
**Solutions:**

1. **Check Supabase is running:**
   ```bash
   supabase status
   ```

2. **Check database connection:**
   ```bash
   npm run health
   ```

3. **Restart Supabase:**
   ```bash
   supabase stop
   supabase start
   ```

#### Issue: "Can't access Supabase Studio"
**Solutions:**

1. **Check Studio port:**
   ```bash
   supabase status
   # Look for Studio URL
   ```

2. **Open Studio manually:**
   ```bash
   supabase studio
   ```

3. **Check port conflicts:**
   ```bash
   lsof -i :54323
   ```

## 🆘 Getting Help

### Before Asking for Help

1. **Run diagnostics:**
   ```bash
   npm run setup
   npm run health
   ```

2. **Check logs:**
   ```bash
   supabase logs
   npm run dev  # Check for errors
   ```

3. **Try basic fixes:**
   ```bash
   supabase stop
   supabase start
   npm run dev
   ```

### When to Ask for Help

- Setup script fails after trying solutions above
- App crashes with error messages
- Database won't start after multiple attempts
- API keys are correct but still getting errors

### Information to Include

When asking for help, include:

1. **Operating System:** macOS/Windows/Linux version
2. **Error messages:** Full error output
3. **Steps taken:** What you've already tried
4. **System info:**
   ```bash
   node --version
   docker --version
   supabase --version
   ```

### Community Support

- **GitHub Issues:** [Create an issue](https://github.com/yourusername/cineai/issues)
- **Discord:** [Join our Discord](https://discord.gg/cineai)
- **Documentation:** [Read the docs](docs/)

## 🔄 Reset Everything

If nothing else works, you can reset everything:

```bash
# Stop everything
supabase stop
docker stop $(docker ps -q)

# Remove all data
rm -rf .env.local
rm -rf .next
rm -rf node_modules

# Start fresh
npm install
./scripts/setup-local.sh
```

**Warning:** This will delete all your data. Make sure to backup first if you have important data.

---

## ✅ Success Checklist

After setup, you should be able to:

- [ ] Run `npm run setup` without errors
- [ ] Run `npm run health` and see "healthy" status
- [ ] Access app at http://localhost:3000
- [ ] Access Supabase Studio at http://localhost:54323
- [ ] Sign up for account in the app
- [ ] Search for movies
- [ ] Rate movies
- [ ] Get AI recommendations

If all these work, your CineAI setup is complete! 🎉
