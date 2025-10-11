# 💾 CineAI Backup & Restore Guide

Complete guide for backing up, restoring, and migrating your CineAI data.

## 📖 Table of Contents

- [Why Backup?](#why-backup)
- [What Gets Backed Up](#what-gets-backed-up)
- [Backup Methods](#backup-methods)
- [Restore Methods](#restore-methods)
- [Migration Guide](#migration-guide)
- [Automated Backups](#automated-backups)
- [Troubleshooting](#troubleshooting)

## Why Backup?

Your CineAI data includes:
- **Movie ratings** - Your personal ratings and reviews
- **Watchlist** - Movies you want to watch
- **Preferences** - AI settings and behavioral data
- **Chat history** - Conversations with AI
- **Recommendations** - Personalized movie suggestions

Backing up ensures you never lose your data when:
- Upgrading your system
- Moving to a new computer
- Reinstalling CineAI
- Switching between different setups

## What Gets Backed Up

### Database Tables
- **profiles** - User profiles and preferences
- **movies** - Movie database (if you've added custom movies)
- **ratings** - Your movie ratings
- **watchlist** - Your saved movies
- **user_behavior_signals** - Learning data
- **chat_sessions** - Conversation history

### Configuration Files
- **.env.local** - Your API keys and settings
- **supabase/config.toml** - Supabase configuration
- **package.json** - Project dependencies

### Application Data
- **User preferences** - AI settings, behavioral weights
- **Custom configurations** - Any custom settings you've made

## Backup Methods

### Method 1: Automated Backup Script

The easiest way to backup your data:

```bash
# Run the backup script
npm run backup

# This creates:
# - backup-YYYY-MM-DD.sql (database dump)
# - backup-YYYY-MM-DD-env.tar.gz (environment files)
# - backup-YYYY-MM-DD-data.json (user data export)
```

### Method 2: Manual Database Backup

#### Full Database Backup
```bash
# Create complete database dump
supabase db dump > backup-$(date +%Y-%m-%d).sql

# Or with data only
supabase db dump --data-only > backup-data-$(date +%Y-%m-%d).sql

# Or with schema only
supabase db dump --schema-only > backup-schema-$(date +%Y-%m-%d).sql
```

#### Specific Table Backup
```bash
# Backup specific tables
supabase db dump --table=ratings --table=watchlist > backup-tables-$(date +%Y-%m-%d).sql
```

### Method 3: Supabase Studio Export

1. **Open Supabase Studio:**
   ```bash
   supabase studio
   ```

2. **Navigate to Table Editor**

3. **Export tables:**
   - Select table (e.g., ratings)
   - Click "Export" button
   - Choose format (CSV, JSON, SQL)
   - Download file

### Method 4: Configuration Backup

#### Environment Files
```bash
# Backup environment configuration
cp .env.local backup-env-$(date +%Y-%m-%d).local

# Backup Supabase config
cp supabase/config.toml backup-config-$(date +%Y-%m-%d).toml
```

#### Complete Configuration Backup
```bash
# Create tar archive of all config files
tar -czf backup-config-$(date +%Y-%m-%d).tar.gz \
  .env.local \
  supabase/config.toml \
  package.json \
  supabase/migrations/
```

## Restore Methods

### Method 1: Automated Restore

```bash
# Restore from backup
npm run restore backup-2024-01-15.sql

# Or restore specific backup
npm run restore backup-2024-01-15-data.json
```

### Method 2: Manual Database Restore

#### Full Database Restore
```bash
# Stop Supabase
supabase stop

# Reset database
supabase db reset

# Restore from backup
psql -h localhost -p 54322 -U postgres -d postgres < backup-2024-01-15.sql

# Start Supabase
supabase start
```

#### Specific Table Restore
```bash
# Restore specific tables
psql -h localhost -p 54322 -U postgres -d postgres -c "
  DELETE FROM ratings;
  DELETE FROM watchlist;
  \i backup-tables-2024-01-15.sql
"
```

### Method 3: Configuration Restore

#### Environment Files
```bash
# Restore environment configuration
cp backup-env-2024-01-15.local .env.local

# Restore Supabase config
cp backup-config-2024-01-15.toml supabase/config.toml
```

#### Complete Configuration Restore
```bash
# Extract configuration backup
tar -xzf backup-config-2024-01-15.tar.gz

# Restart services
supabase stop
supabase start
npm run dev
```

### Method 4: Supabase Studio Import

1. **Open Supabase Studio:**
   ```bash
   supabase studio
   ```

2. **Navigate to Table Editor**

3. **Import data:**
   - Select table (e.g., ratings)
   - Click "Import" button
   - Choose file (CSV, JSON, SQL)
   - Upload and confirm

## Migration Guide

### Moving to Another Machine

#### Step 1: Backup on Source Machine
```bash
# Create complete backup
npm run backup

# This creates:
# - backup-YYYY-MM-DD.sql
# - backup-YYYY-MM-DD-env.tar.gz
# - backup-YYYY-MM-DD-data.json
```

#### Step 2: Transfer Files
```bash
# Copy backup files to new machine
scp backup-*.sql user@new-machine:/path/to/cineai/
scp backup-*.tar.gz user@new-machine:/path/to/cineai/
scp backup-*.json user@new-machine:/path/to/cineai/
```

#### Step 3: Setup on New Machine
```bash
# Clone CineAI repository
git clone https://github.com/yourusername/cineai.git
cd cineai

# Run setup script
./scripts/setup-local.sh

# Stop Supabase to restore data
supabase stop
```

#### Step 4: Restore Data
```bash
# Restore database
psql -h localhost -p 54322 -U postgres -d postgres < backup-YYYY-MM-DD.sql

# Restore configuration
tar -xzf backup-YYYY-MM-DD-env.tar.gz

# Start Supabase
supabase start

# Start app
npm run dev
```

### Moving to Cloud Hosting

#### Step 1: Setup Cloud Supabase
1. Create Supabase Cloud project
2. Get cloud credentials
3. Update environment variables

#### Step 2: Export Local Data
```bash
# Export data from local Supabase
supabase db dump --data-only > cloud-migration.sql
```

#### Step 3: Import to Cloud
```bash
# Import to cloud database
psql -h your-cloud-db-host -p 5432 -U postgres -d postgres < cloud-migration.sql
```

#### Step 4: Update Configuration
```bash
# Update .env.local with cloud credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-cloud-anon-key
```

### Moving from Cloud to Local

#### Step 1: Export Cloud Data
```bash
# Export from cloud Supabase
supabase db dump --project-ref your-project-ref --data-only > local-migration.sql
```

#### Step 2: Setup Local Environment
```bash
# Setup local CineAI
git clone https://github.com/yourusername/cineai.git
cd cineai
./scripts/setup-local.sh
```

#### Step 3: Import to Local
```bash
# Import cloud data to local
psql -h localhost -p 54322 -U postgres -d postgres < local-migration.sql
```

## Automated Backups

### Setting Up Automated Backups

#### Using Cron (macOS/Linux)
```bash
# Edit crontab
crontab -e

# Add backup job (daily at 2 AM)
0 2 * * * cd /path/to/cineai && npm run backup

# Add cleanup job (keep only last 7 days)
0 3 * * * find /path/to/cineai/backup-*.sql -mtime +7 -delete
```

#### Using Task Scheduler (Windows)
1. Open Task Scheduler
2. Create Basic Task
3. Set trigger (daily)
4. Set action: `npm run backup`
5. Set working directory to CineAI folder

#### Using GitHub Actions (Cloud)
```yaml
# .github/workflows/backup.yml
name: Backup CineAI Data
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Create backup
        run: npm run backup
      - name: Upload backup
        uses: actions/upload-artifact@v3
        with:
          name: cineai-backup
          path: backup-*.sql
```

### Backup Retention Policy

#### Recommended Retention
- **Daily backups**: Keep 7 days
- **Weekly backups**: Keep 4 weeks
- **Monthly backups**: Keep 12 months

#### Cleanup Script
```bash
#!/bin/bash
# cleanup-backups.sh

# Remove backups older than 7 days
find /path/to/cineai/backup-*.sql -mtime +7 -delete

# Keep weekly backups for 4 weeks
find /path/to/cineai/backup-*.sql -mtime +28 -delete

# Keep monthly backups for 12 months
find /path/to/cineai/backup-*.sql -mtime +365 -delete
```

## Troubleshooting

### Backup Issues

#### Issue: "Permission denied" on backup
**Solutions:**
```bash
# Check file permissions
ls -la backup-*.sql

# Fix permissions
chmod 644 backup-*.sql
```

#### Issue: "Database connection failed" during backup
**Solutions:**
```bash
# Check Supabase is running
supabase status

# Restart Supabase
supabase stop
supabase start

# Try backup again
npm run backup
```

#### Issue: "Backup file is empty"
**Solutions:**
```bash
# Check if database has data
supabase studio
# Look at tables in Studio

# Check backup file
head -20 backup-*.sql

# Try manual backup
supabase db dump --data-only > manual-backup.sql
```

### Restore Issues

#### Issue: "Restore failed" with foreign key errors
**Solutions:**
```bash
# Disable foreign key checks
psql -h localhost -p 54322 -U postgres -d postgres -c "
  SET session_replication_role = replica;
  \i backup-*.sql
  SET session_replication_role = DEFAULT;
"
```

#### Issue: "Table already exists" during restore
**Solutions:**
```bash
# Drop and recreate tables
psql -h localhost -p 54322 -U postgres -d postgres -c "
  DROP TABLE IF EXISTS ratings CASCADE;
  DROP TABLE IF EXISTS watchlist CASCADE;
  \i backup-*.sql
"
```

#### Issue: "Data not appearing" after restore
**Solutions:**
```bash
# Check if data was restored
supabase studio
# Look at tables in Studio

# Check restore logs
psql -h localhost -p 54322 -U postgres -d postgres -c "
  SELECT COUNT(*) FROM ratings;
  SELECT COUNT(*) FROM watchlist;
"
```

### Migration Issues

#### Issue: "Cannot connect to cloud database"
**Solutions:**
```bash
# Check cloud credentials
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# Test connection
curl -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/profiles"
```

#### Issue: "Data format incompatible"
**Solutions:**
```bash
# Check data format
file backup-*.sql

# Convert if needed
iconv -f UTF-8 -t UTF-8 backup-*.sql > backup-utf8.sql
```

## Best Practices

### Backup Strategy

1. **Regular Backups**: Daily automated backups
2. **Multiple Locations**: Store backups in different locations
3. **Test Restores**: Periodically test restore process
4. **Version Control**: Keep backup files in version control
5. **Documentation**: Document your backup process

### Security Considerations

1. **Encrypt Backups**: Use encryption for sensitive data
2. **Secure Storage**: Store backups in secure locations
3. **Access Control**: Limit access to backup files
4. **Regular Rotation**: Delete old backups regularly

### Performance Considerations

1. **Backup During Off-Peak**: Schedule backups during low usage
2. **Incremental Backups**: Use incremental backups for large datasets
3. **Compression**: Compress backup files to save space
4. **Monitoring**: Monitor backup success/failure

## Quick Reference

### Backup Commands
```bash
# Quick backup
npm run backup

# Manual database backup
supabase db dump > backup-$(date +%Y-%m-%d).sql

# Configuration backup
tar -czf backup-config-$(date +%Y-%m-%d).tar.gz .env.local supabase/config.toml
```

### Restore Commands
```bash
# Quick restore
npm run restore backup-2024-01-15.sql

# Manual database restore
psql -h localhost -p 54322 -U postgres -d postgres < backup-2024-01-15.sql

# Configuration restore
tar -xzf backup-config-2024-01-15.tar.gz
```

### Verification Commands
```bash
# Check backup file
head -20 backup-*.sql

# Check database
supabase studio

# Verify restore
psql -h localhost -p 54322 -U postgres -d postgres -c "SELECT COUNT(*) FROM ratings;"
```

---

## 🎉 You're All Set!

Your CineAI data is now safely backed up and you know how to restore it. Remember to:

- **Backup regularly** - Set up automated backups
- **Test restores** - Periodically test your restore process
- **Store securely** - Keep backups in safe locations
- **Document process** - Write down your backup procedures

**Need Help?**
- [Troubleshooting Guide](TROUBLESHOOTING.md)
- [Self-Hosting Guide](SELF_HOSTING.md)
- [Quick Start Guide](LOCAL_SETUP.md)
