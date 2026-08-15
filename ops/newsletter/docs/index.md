# VPS Deployment Documentation

Complete guide for deploying applications to Hostinger KVM 2 VPS (Debian).

## Overview

This documentation covers the full deployment process from a fresh VPS to production-ready applications with SSL certificates.

**Current Status:** Newsletter system (Listmonk)
**Future:** Main application (React Router 7 + Postgres)

## System Specifications

- **Provider:** Hostinger KVM 2
- **OS:** Debian
- **CPU:** 2 vCPU cores
- **RAM:** 8 GB
- **Storage:** 100 GB NVMe
- **Bandwidth:** 8 TB

## Deployment Guides

Follow these guides in order for initial setup:

### 1. [VPS Initial Setup](./01-vps-initial-setup.md)
- System updates and security configuration
- Firewall setup (UFW)
- SSH hardening
- Essential packages installation

**Time estimate:** 10-15 minutes

### 2. [Coolify Installation](./02-coolify-installation.md)
- Install Coolify platform
- Access web dashboard
- Initial configuration

**Time estimate:** 5-10 minutes

### 3. [Listmonk Deployment](./03-listmonk-deployment.md)
- Deploy newsletter system via Coolify
- Configure environment variables
- Set up SSL certificate
- Test functionality

**Time estimate:** 10-15 minutes

### 4. [DNS Configuration](./04-dns-configuration.md)
- Configure subdomain DNS records
- Verify propagation
- Final testing

**Time estimate:** 5-10 minutes (+ DNS propagation wait)

## Quick Reference

### Access Points (After Setup)
- Coolify Dashboard: `http://YOUR_VPS_IP:8000`
- Newsletter System: `https://newsletter.yoursite.com`

### Running the Stack Outside Coolify

`docker-compose.yml` attaches both services to the `coolify` network and declares
it as `external: true`, because on the VPS that network is created and owned by
Coolify's Traefik proxy. Compose never creates external networks, so a machine
without Coolify needs it created once before the first `docker compose up`:

```bash
docker network create coolify
```

### Useful Commands

```bash
# Check Coolify status
docker ps | grep coolify

# View Coolify logs
docker logs -f coolify

# Restart Coolify
docker restart coolify

# Check system resources
htop

# Check disk usage
df -h
```

## Architecture

```
┌─────────────────────────────────────────┐
│          Your VPS (Debian)              │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │         Coolify Platform          │ │
│  │  (Reverse Proxy + SSL + Manager)  │ │
│  └───────────┬───────────────────────┘ │
│              │                          │
│  ┌───────────┴───────────┐             │
│  │                       │             │
│  │  ┌─────────────────┐ │             │
│  │  │    Listmonk     │ │ Port 9000   │
│  │  │   + Postgres    │ │             │
│  │  └─────────────────┘ │             │
│  │                       │             │
│  │  [Future: Main App]   │             │
│  │                       │             │
│  └───────────────────────┘             │
│                                         │
└─────────────────────────────────────────┘
         │
         │ HTTPS (443)
         │ HTTP (80)
         ↓
    Internet Traffic
```

## Troubleshooting

### Common Issues

**Can't SSH into VPS:**
- Verify IP address is correct
- Check if SSH key is added to VPS
- Ensure port 22 is open in firewall

**Coolify won't start:**
- Check Docker is running: `systemctl status docker`
- Verify sufficient disk space: `df -h`
- View logs: `docker logs coolify`

**SSL certificate fails:**
- Ensure DNS is propagated (use `nslookup newsletter.yoursite.com`)
- Verify ports 80 and 443 are open
- Check domain points to correct IP

**Application won't deploy:**
- Check Coolify logs in dashboard
- Verify docker-compose.yml syntax
- Ensure enough RAM available: `free -h`

## Additional Resources

- [Coolify Documentation](https://coolify.io/docs)
- [Listmonk Documentation](https://listmonk.app/docs)
- [Docker Documentation](https://docs.docker.com)
- [Let's Encrypt SSL Guide](https://letsencrypt.org/getting-started/)

## Maintenance

### Regular Tasks

**Weekly:**
- Check system updates: `apt update && apt list --upgradable`
- Monitor disk usage: `df -h`
- Review application logs in Coolify dashboard

**Monthly:**
- Apply security updates: `apt upgrade`
- Review backup strategy
- Check SSL certificate expiration (auto-renewed by Coolify)

## Next Steps

Once you've completed all guides:
1. Test newsletter system thoroughly
2. Send test emails
3. Configure newsletter templates
4. Set up monitoring/alerts in Coolify

When ready to add the main application, create new guides:
- `05-main-app-deployment.md`
- `06-postgres-setup.md`
- `07-domain-migration.md`

---

**Need help?** Check the troubleshooting sections in each guide or review Coolify/Listmonk documentation.
