# Positiv VPS Deployment Guide

This guide explains how to deploy Positiv to a VPS using Docker and Caddy.

## Prerequisites

### VPS Requirements
- Ubuntu 22.04 LTS or Debian 12
- Minimum 2GB RAM (4GB recommended)
- 20GB disk space minimum
- Root or sudo access
- Open ports: 22 (SSH), 80 (HTTP), 443 (HTTPS)

### Domain Setup
- A domain name pointing to your VPS IP address
- DNS A record configured

## Quick Setup

### 1. Initial VPS Setup

SSH into your VPS and run the setup script:

```bash
# Download and run setup script
curl -fsSL https://raw.githubusercontent.com/your-repo/main/scripts/setup-vps.sh -o setup-vps.sh
sudo bash setup-vps.sh yourdomain.com
```

This script will:
- Install Docker and Docker Compose
- Set up the application directory
- Configure firewall rules
- Create systemd service
- Set up log rotation
- Optionally create a deployment user

### 2. Configure Environment Variables

Edit the `.env` file created from the template:

```bash
sudo nano /opt/positiv/.env
```

Required variables:
- **DOMAIN**: Your domain (for Caddy automatic HTTPS)
- **Supabase credentials**: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, etc.
- **Contentful credentials**: If using CMS
- **AWS SES credentials**: For email sending
- **Other secrets**: As needed

### 3. GitHub Actions Setup

Add the following secrets to your GitHub repository:

1. Go to Settings → Secrets and variables → Actions
2. Add these secrets:
   - `VPS_HOST`: Your VPS IP or domain
   - `VPS_USER`: `deploy` or `root`
   - `VPS_SSH_KEY`: Private SSH key for deployment
   - `VPS_PORT`: SSH port (default: 22)
   - `VPS_APP_PATH`: `/opt/positiv`

## Manual Deployment

### Build and Deploy Locally

```bash
cd /opt/positiv

# Build the application
docker compose build

# Start services
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### Zero-Downtime Deployment

```bash
# Pull latest code
git pull origin main

# Build and update app container only
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps --build app

# Reload Caddy if config changed
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```

## Maintenance

### Viewing Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f app
docker compose logs -f caddy

# Last 100 lines
docker compose logs --tail=100 app
```

### Backup

```bash
# Backup environment file
cp /opt/positiv/.env /opt/positiv/.env.backup

# Backup Caddy certificates (automatic with volumes)
docker run --rm -v positiv_caddy_data:/data -v $(pwd):/backup alpine tar czf /backup/caddy-data-backup.tar.gz /data
```

### Monitoring

```bash
# Check health endpoint
curl http://localhost:3000/health

# Check Docker resource usage
docker stats

# Check disk usage
df -h

# System resources
htop
```

### Troubleshooting

#### App not starting
```bash
# Check logs
docker compose logs app

# Verify environment variables
docker compose exec app env

# Shell into container
docker compose exec app sh
```

#### SSL certificates not working
```bash
# Check Caddy logs
docker compose logs caddy

# Verify domain DNS
dig yourdomain.com

# Force certificate renewal
docker compose exec caddy caddy renew --force
```

#### Port conflicts
```bash
# Check what's using ports
sudo lsof -i :80
sudo lsof -i :443

# Stop conflicting services
sudo systemctl stop nginx  # if nginx is running
sudo systemctl stop apache2  # if apache is running
```

## Security Best Practices

1. **Keep system updated**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Configure firewall**
   ```bash
   sudo ufw status
   ```

3. **Set up fail2ban**
   ```bash
   sudo apt install fail2ban
   sudo systemctl enable fail2ban
   ```

4. **Regular backups**
   - Set up automated backups for your data
   - Test restore procedures

5. **Monitor logs**
   - Check logs regularly for suspicious activity
   - Set up log aggregation if needed

## Scaling

### Horizontal Scaling
To run multiple app instances:

```yaml
# In docker-compose.prod.yml
services:
  app:
    deploy:
      replicas: 3
```

### Resource Limits
Already configured in `docker-compose.prod.yml`:
- CPU: 2 cores limit, 1 core reserved
- Memory: 2GB limit, 1GB reserved

## Rollback

If deployment fails:

```bash
# Stop current deployment
docker compose down

# Checkout previous version
git checkout HEAD~1

# Redeploy
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Future Enhancements

### Preview Deployments (Planned)
Deploy branches to subdomains for testing:
- `feature-branch.yourdomain.com`
- Automatic cleanup on PR merge
- Isolated environments

### Database Migration (Planned)
When migrating from Supabase to local PostgreSQL:
1. Add PostgreSQL service to docker-compose.yml
2. Run migration scripts
3. Update environment variables
4. Test thoroughly before switching

### Monitoring Stack (Planned)
- Prometheus for metrics
- Grafana for visualization
- Loki for log aggregation

## Support

For issues or questions:
1. Check logs: `docker compose logs`
2. Review this documentation
3. Check GitHub Issues
4. Contact the development team

## Quick Reference

```bash
# Start services
systemctl start positiv

# Stop services
systemctl stop positiv

# Restart services
systemctl restart positiv

# View status
systemctl status positiv

# Update and redeploy
cd /opt/positiv && git pull && docker compose up -d --build

# Emergency stop
docker compose kill

# Clean up
docker system prune -af
```