# Deployment Checklist

## Overview

This checklist ensures all components of the Apocalypse VI MUD system are properly deployed, configured, and tested before going live. Use this checklist for initial deployment and future updates.

## Pre-Deployment Preparation

### Environment Setup
- [ ] **Server Requirements Verified**
  - Node.js 18+ installed
  - SQLite3 available
  - Sufficient disk space (1GB+ recommended)
  - Network connectivity to MUD server (if crawler enabled)

- [ ] **Environment Variables Configured**
  - [ ] `backend/.env` created with database path
  - [ ] `crawler/.env` created with MUD server credentials
  - [ ] Ollama endpoint configured (if using AI features)
  - [ ] Port configurations set (default: backend 3002, frontend 5173)

- [ ] **Dependencies Installed**
  - [ ] `npm install` run in root directory
  - [ ] `cd crawler && npm install`
  - [ ] `cd backend && npm install`
  - [ ] `cd frontend && npm install`

### Database Setup
- [ ] **Database Schema Created**
  - [ ] Run `cd backend && npm run seed` to initialize database
  - [ ] Verify all tables created successfully
  - [ ] Check foreign key constraints are active

- [ ] **Reference Data Loaded**
  - [ ] Help entries loaded (543 expected)
  - [ ] Zone definitions loaded (73 expected)
  - [ ] Class proficiencies loaded (476 expected)
  - [ ] Command definitions loaded

- [ ] **Database Permissions**
  - [ ] Database file writable by application
  - [ ] Backup location configured and accessible

## Backend Deployment

### Server Configuration
- [ ] **Express Server Starts**
  - [ ] `cd backend && npm run dev` starts without errors
  - [ ] Server listens on correct port (3002)
  - [ ] Health check endpoint responds: `GET /health`

- [ ] **API Endpoints Functional**
  - [ ] `GET /api/stats` returns entity counts
  - [ ] `GET /api/entity-types` returns configuration
  - [ ] `GET /api/rooms` returns room data
  - [ ] CRUD operations work for all entity types

- [ ] **Middleware Active**
  - [ ] CORS enabled for frontend origin
  - [ ] Request logging (Morgan) working
  - [ ] Error handling middleware active
  - [ ] Validation middleware functioning

- [ ] **Database Connectivity**
  - [ ] SQLite connection established
  - [ ] Queries execute without errors
  - [ ] Connection pooling configured (if needed)

### Security Verification
- [ ] **Input Validation**
  - [ ] All POST/PUT endpoints validate input
  - [ ] SQL injection prevention active
  - [ ] XSS protection enabled (Helmet.js)

- [ ] **Error Handling**
  - [ ] Sensitive information not leaked in errors
  - [ ] Database errors handled gracefully
  - [ ] Validation errors return helpful messages

## Frontend Deployment

### Build Process
- [ ] **Build Completes Successfully**
  - [ ] `cd frontend && npm run build` finishes without errors
  - [ ] Production build created in `dist/` directory
  - [ ] Static assets optimized and minified

- [ ] **Development Server Works**
  - [ ] `cd frontend && npm run dev` starts successfully
  - [ ] Application loads in browser
  - [ ] No console errors on initial load

### Application Functionality
- [ ] **Core Features Working**
  - [ ] Admin interface loads
  - [ ] Room data displays correctly
  - [ ] Map visualization renders
  - [ ] Data tables functional

- [ ] **API Integration**
  - [ ] Frontend connects to backend API
  - [ ] Data fetching works correctly
  - [ ] Error states handled properly
  - [ ] Loading states implemented

- [ ] **User Interface**
  - [ ] Responsive design works on different screen sizes
  - [ ] Navigation between sections functional
  - [ ] Forms submit correctly
  - [ ] Data updates reflect immediately

## Crawler Deployment

### Configuration
- [ ] **MUD Server Connection**
  - [ ] Server hostname/IP configured
  - [ ] Port number set correctly
  - [ ] Character credentials valid
  - [ ] Connection timeout configured

- [ ] **AI Integration**
  - [ ] Ollama service running (if used)
  - [ ] AI model loaded and responsive
  - [ ] Decision-making logic initialized

### Basic Functionality
- [ ] **Crawler Starts**
  - [ ] `cd crawler && npm run dev` executes without errors
  - [ ] Connects to MUD server successfully
  - [ ] Authentication completes

- [ ] **Data Collection**
  - [ ] Room discovery working
  - [ ] Exit parsing functional
  - [ ] Player action learning active
  - [ ] Data saved to backend database

- [ ] **Error Recovery**
  - [ ] Network disconnections handled
  - [ ] Invalid data skipped gracefully
  - [ ] Backend unavailability doesn't crash crawler

## Integration Testing

### End-to-End Data Flow
- [ ] **Room Discovery Pipeline**
  - [ ] Crawler discovers new rooms
  - [ ] Data saved to backend database
  - [ ] Frontend displays new rooms
  - [ ] Map updates with new locations

- [ ] **Player Action Learning**
  - [ ] Crawler identifies new commands
  - [ ] Actions saved to database
  - [ ] Frontend shows discovered actions
  - [ ] Command documentation updates

- [ ] **Real-time Monitoring**
  - [ ] Crawler status updates work
  - [ ] Progress tracking functional
  - [ ] Error reporting visible in frontend

### Cross-Component Communication
- [ ] **API Consistency**
  - [ ] All components use same data models
  - [ ] TypeScript interfaces match
  - [ ] API responses consistent

- [ ] **Error Propagation**
  - [ ] Backend errors reported to frontend
  - [ ] Crawler errors logged appropriately
  - [ ] User-friendly error messages displayed

## Performance Verification

### Backend Performance
- [ ] **Response Times**
  - [ ] API endpoints respond within 500ms
  - [ ] Database queries optimized
  - [ ] Large dataset handling efficient

- [ ] **Resource Usage**
  - [ ] Memory usage stable under load
  - [ ] CPU usage reasonable
  - [ ] Database connections managed properly

### Frontend Performance
- [ ] **Load Times**
  - [ ] Initial page load under 3 seconds
  - [ ] Data fetching completes within 1 second
  - [ ] Large lists render efficiently

- [ ] **Responsiveness**
  - [ ] UI remains responsive during data loading
  - [ ] No blocking operations on main thread
  - [ ] Smooth animations and transitions

### Crawler Performance
- [ ] **Exploration Speed**
  - [ ] Room discovery rate acceptable
  - [ ] Network latency handled gracefully
  - [ ] Memory usage stable during long runs

## Monitoring and Logging

### Logging Configuration
- [ ] **Log Levels Set**
  - [ ] Development: DEBUG level
  - [ ] Production: INFO level with ERROR capture
  - [ ] Sensitive data not logged

- [ ] **Log Rotation**
  - [ ] Log files don't grow indefinitely
  - [ ] Old logs archived or deleted
  - [ ] Log location accessible for debugging

### Monitoring Setup
- [ ] **Health Checks**
  - [ ] Backend health endpoint monitored
  - [ ] Database connectivity checked
  - [ ] Crawler heartbeat monitored

- [ ] **Alerting**
  - [ ] Critical errors trigger alerts
  - [ ] Performance degradation detected
  - [ ] Resource exhaustion monitored

## Backup and Recovery

### Data Backup
- [ ] **Database Backups**
  - [ ] Automated backup script configured
  - [ ] Backup frequency set (daily recommended)
  - [ ] Backup integrity verified

- [ ] **Configuration Backup**
  - [ ] Environment files backed up securely
  - [ ] Application code version controlled
  - [ ] Documentation archived

### Recovery Testing
- [ ] **Database Recovery**
  - [ ] Restore from backup tested
  - [ ] Data integrity verified after restore
  - [ ] Application functions after restore

- [ ] **Application Recovery**
  - [ ] Service restart procedures documented
  - [ ] Automatic restart configured (PM2/systemd)
  - [ ] Recovery time objectives met

## Security Checklist

### Network Security
- [ ] **Firewall Configuration**
  - [ ] Only necessary ports open
  - [ ] Backend port (3002) not exposed publicly
  - [ ] Frontend served through reverse proxy

- [ ] **HTTPS Configuration**
  - [ ] SSL/TLS certificates installed
  - [ ] Secure headers configured
  - [ ] Mixed content prevented

### Application Security
- [ ] **Input Validation**
  - [ ] All user inputs validated
  - [ ] SQL injection prevented
  - [ ] XSS attacks mitigated

- [ ] **Authentication & Authorization**
  - [ ] Admin access protected (future)
  - [ ] API rate limiting implemented
  - [ ] Sensitive operations logged

### Data Protection
- [ ] **Data Encryption**
  - [ ] Sensitive data encrypted at rest
  - [ ] Database backups encrypted
  - [ ] Network traffic encrypted

- [ ] **Access Controls**
  - [ ] File permissions set correctly
  - [ ] Database access restricted
  - [ ] Backup files secured

## Documentation Updates

### Deployment Documentation
- [ ] **Runbooks Updated**
  - [ ] Startup/shutdown procedures documented
  - [ ] Troubleshooting guides current
  - [ ] Contact information for support

- [ ] **Configuration Documentation**
  - [ ] Environment variables documented
  - [ ] Configuration options explained
  - [ ] Default values specified

### User Documentation
- [ ] **User Guides Updated**
  - [ ] Admin interface documented
  - [ ] Feature usage explained
  - [ ] Troubleshooting section current

- [ ] **API Documentation**
  - [ ] Endpoint documentation accurate
  - [ ] Example requests/responses provided
  - [ ] Authentication requirements clear

## Post-Deployment Verification

### Functional Testing
- [ ] **Smoke Tests Pass**
  - [ ] All major features work
  - [ ] Data flows correctly
  - [ ] Error conditions handled

- [ ] **User Acceptance**
  - [ ] Key user workflows tested
  - [ ] Performance requirements met
  - [ ] Usability requirements satisfied

### Monitoring Validation
- [ ] **Metrics Collecting**
  - [ ] Application metrics reported
  - [ ] Error rates within acceptable limits
  - [ ] Performance baselines established

- [ ] **Alerting Functional**
  - [ ] Test alerts triggered and received
  - [ ] Escalation procedures working
  - [ ] On-call rotation configured

## Rollback Plan

### Rollback Procedures
- [ ] **Application Rollback**
  - [ ] Previous version deployment script ready
  - [ ] Database migration rollback prepared
  - [ ] Configuration rollback documented

- [ ] **Data Rollback**
  - [ ] Database backup restoration tested
  - [ ] Data consistency verification
  - [ ] User data preservation confirmed

### Rollback Triggers
- [ ] **Automatic Rollback**
  - [ ] Health check failures trigger rollback
  - [ ] Error rate thresholds defined
  - [ ] Performance degradation triggers

- [ ] **Manual Rollback**
  - [ ] Rollback command documented
  - [ ] Rollback time estimated
  - [ ] Communication plan for users

## Go-Live Checklist

### Final Verification
- [ ] **All Checklists Complete**
  - [ ] Pre-deployment tasks finished
  - [ ] Integration testing passed
  - [ ] Security review completed

- [ ] **Stakeholder Approval**
  - [ ] Development team sign-off
  - [ ] QA team approval
  - [ ] Business stakeholder approval

### Launch Preparation
- [ ] **Communication Plan**
  - [ ] User notifications sent
  - [ ] Support team briefed
  - [ ] Incident response ready

- [ ] **Monitoring Active**
  - [ ] Dashboards configured
  - [ ] Alerting enabled
  - [ ] On-call team notified

### Post-Launch Monitoring
- [ ] **Immediate Monitoring**
  - [ ] Application health monitored for 24 hours
  - [ ] User feedback collected
  - [ ] Performance metrics tracked

- [ ] **Issue Response**
  - [ ] Bug reports triaged quickly
  - [ ] Critical issues fixed immediately
  - [ ] User communication maintained

---

## Emergency Contacts

**Development Team:**
- Lead Developer: [Contact Information]

**Infrastructure Team:**
- System Administrator: [Contact Information]

**Support Team:**
- Technical Support: [Contact Information]

**Escalation Path:**
1. Development Team (0-2 hours)
2. Infrastructure Team (2-4 hours)
3. Management (4+ hours)

## Version Information

**Deployment Version:** [Version Number]
**Deployment Date:** [Date]
**Deployed By:** [Name]
**Rollback Version:** [Previous Version]