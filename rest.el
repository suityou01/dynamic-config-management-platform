# -*- restclient -*-
# ==========================================================================
# GovUK App Configuration Management Platform - Mobile App Team Demo
# ==========================================================================

# --------------------------------------------------------------------------
# 1. HEALTH CHECK & SYSTEM STATUS
# --------------------------------------------------------------------------

GET http://localhost:3000/health

# --------------------------------------------------------------------------
# 2. LIST ALL CONFIGURATIONS
# --------------------------------------------------------------------------

GET http://localhost:3000/config

# --------------------------------------------------------------------------
# 3. BASIC MOBILE APP CONFIGURATION RETRIEVAL
# --------------------------------------------------------------------------

# iOS user on v0.0.1 - initial release
GET http://localhost:3000/config/GovUK.App/0.0.1
User-Agent: GovUK.App/0.0.1 (iOS 17.0; iPhone)

#

# iOS user on v0.0.2 - evolved with new features
GET http://localhost:3000/config/GovUK.App/0.0.2
User-Agent: GovUK.App/0.0.2 (iOS 17.0; iPhone)

#

# Android user on v0.0.2
GET http://localhost:3000/config/GovUK.App/0.0.2
User-Agent: GovUK.App/0.0.2 (Android 14; Pixel 8)

#

# Tablet user (iPad)
GET http://localhost:3000/config/GovUK.App/0.0.2
User-Agent: GovUK.App/0.0.2 (iOS 17.0; iPad)

# --------------------------------------------------------------------------
# 4. ENVIRONMENT-SPECIFIC CONFIGURATIONS (DEV/STAGING/PROD)
# --------------------------------------------------------------------------

# Development environment - debug enabled, verbose logging
GET http://localhost:3000/config/GovUK.App/0.0.2?env=development
User-Agent: GovUK.App/0.0.2 (iOS 17.0; iPhone)

#

# Staging environment - pre-production testing
GET http://localhost:3000/config/GovUK.App/0.0.2?env=staging
User-Agent: GovUK.App/0.0.2 (iOS 17.0; iPhone)

#

# Production environment - optimized for performance
GET http://localhost:3000/config/GovUK.App/0.0.2?env=production
User-Agent: GovUK.App/0.0.2 (iOS 17.0; iPhone)

# --------------------------------------------------------------------------
# 5. GEO-TARGETING FOR MOBILE USERS
# --------------------------------------------------------------------------

# UK user (England) - local API endpoint, optimized caching
GET http://localhost:3000/config/GovUK.App/0.0.2?country=GB&region=England
User-Agent: GovUK.App/0.0.2 (iOS 17.0; iPhone)

#

# UK user (Scotland) - regional variations
GET http://localhost:3000/config/GovUK.App/0.0.2?country=GB&region=Scotland
User-Agent: GovUK.App/0.0.2 (Android 14; Samsung Galaxy S24)

#

# International user (USA) - different CDN, different features
GET http://localhost:3000/config/GovUK.App/0.0.2?country=US&region=California
User-Agent: GovUK.App/0.0.2 (iOS 17.0; iPhone)

# --------------------------------------------------------------------------
# 6. VIP USER SEGMENTS - PREVIEW FEATURES FOR MPs & SPECIAL GROUPS
# --------------------------------------------------------------------------

# Member of Parliament (MP) - early access to new features
GET http://localhost:3000/config/GovUK.App/0.0.2?userId=mp.boris.johnson&context={"userType":"mp","constituency":"Uxbridge"}
User-Agent: GovUK.App/0.0.2 (iOS 17.0; iPhone)

#

# Cabinet Minister - highest security, all features enabled
GET http://localhost:3000/config/GovUK.App/0.0.2?userId=minister.rishi.sunak&context={"userType":"minister","department":"Treasury"}
User-Agent: GovUK.App/0.0.2 (iOS 17.0; iPhone)

#

# Government Official - enhanced security settings
GET http://localhost:3000/config/GovUK.App/0.0.2?userId=official.12345&context={"userType":"official","clearanceLevel":"high"}
User-Agent: GovWorker/1.0 AppVersion/0.0.2 (Android 14; Samsung Galaxy S24)

#

# Civil Servant - standard configuration
GET http://localhost:3000/config/GovUK.App/0.0.2?userId=civil.servant.67890&context={"userType":"civilServant","department":"HMRC"}
User-Agent: GovUK.App/0.0.2 (iOS 17.0; iPhone)

# --------------------------------------------------------------------------
# 7. BETA TESTING & GRADUAL ROLLOUT
# --------------------------------------------------------------------------

# Internal tester - all features enabled
GET http://localhost:3000/config/GovUK.App/0.0.2?userId=tester.001&flags={"betaFeatures":true,"experimentalUI":true}
User-Agent: GovUK.App/0.0.2-beta (iOS 17.0; iPhone)

#

# Early adopter - 25% rollout (user in rollout group)
GET http://localhost:3000/config/GovUK.App/0.0.2?userId=early.adopter.123&flags={"betaFeatures":true}
User-Agent: GovUK.App/0.0.2 (Android 14; Pixel 8)

#

# Regular user - standard features only
GET http://localhost:3000/config/GovUK.App/0.0.2?userId=regular.user.456
User-Agent: GovUK.App/0.0.2 (iOS 17.0; iPhone)

#

# Test different users in percentage rollout (10% for experimental UI)
GET http://localhost:3000/config/GovUK.App/0.0.2?userId=user001&flags={"experimentalUI":true}
User-Agent: GovUK.App/0.0.2 (iOS 17.0; iPhone)

#

GET http://localhost:3000/config/GovUK.App/0.0.2?userId=user055&flags={"experimentalUI":true}
User-Agent: GovUK.App/0.0.2 (Android 14; Pixel 8)

#

GET http://localhost:3000/config/GovUK.App/0.0.2?userId=user099&flags={"experimentalUI":true}
User-Agent: GovUK.App/0.0.2 (iOS 17.0; iPhone)

# --------------------------------------------------------------------------
# 8. DEVICE-SPECIFIC MOBILE OPTIMIZATIONS
# --------------------------------------------------------------------------

# iPhone (latest) - optimal settings
GET http://localhost:3000/config/GovUK.App/0.0.2?country=GB
User-Agent: GovUK.App/0.0.2 (iOS 17.0; iPhone 15 Pro)

#

# Older iPhone - reduced features for performance
GET http://localhost:3000/config/GovUK.App/0.0.2?country=GB
User-Agent: GovUK.App/0.0.2 (iOS 15.0; iPhone 8)

#

# Android flagship - full features
GET http://localhost:3000/config/GovUK.App/0.0.2?country=GB
User-Agent: GovUK.App/0.0.2 (Android 14; Samsung Galaxy S24 Ultra)

#

# Android budget device - optimized for lower specs
GET http://localhost:3000/config/GovUK.App/0.0.2?country=GB
User-Agent: GovUK.App/0.0.2 (Android 12; Nokia G50)

# --------------------------------------------------------------------------
# 9. FEATURE FLAG TESTING FOR MOBILE FEATURES
# --------------------------------------------------------------------------

# New biometric authentication enabled
GET http://localhost:3000/config/GovUK.App/0.0.2?flags={"biometricAuth":true}
User-Agent: GovUK.App/0.0.2 (iOS 17.0; iPhone)

#

# Offline mode for areas with poor connectivity
GET http://localhost:3000/config/GovUK.App/0.0.2?flags={"offlineMode":true}&country=GB&region="Scottish Highlands"
User-Agent: GovUK.App/0.0.2 (iOS 17.0; iPhone)

#

# Push notifications rollout
GET http://localhost:3000/config/GovUK.App/0.0.2?flags={"pushNotifications":true}
User-Agent: GovUK.App/0.0.2 (Android 14; Pixel 8)

#

# Dark mode support
GET http://localhost:3000/config/GovUK.App/0.0.2?flags={"darkMode":true}
User-Agent: GovUK.App/0.0.2 (iOS 17.0; iPhone)

# --------------------------------------------------------------------------
# 10. VERSION MIGRATION & BACKWARDS COMPATIBILITY
# --------------------------------------------------------------------------

# Old app version (v0.0.1) - should still work
GET http://localhost:3000/config/GovUK.App/0.0.1?country=GB
User-Agent: GovUK.App/0.0.1 (iOS 16.0; iPhone)

#

# New app version (v0.0.2) - enhanced features
GET http://localhost:3000/config/GovUK.App/0.0.2?country=GB
User-Agent: GovUK.App/0.0.2 (iOS 17.0; iPhone)

# --------------------------------------------------------------------------
# 11. RULE COMPOSITION FOR MOBILE SCENARIOS
# --------------------------------------------------------------------------

# Compose iOS base with UK regional settings
POST http://localhost:3000/rules/compose
Content-Type: application/json

{
  "appId": "GovUK.App",
  "version": "0.0.2",
  "sourceRuleIds": ["ios-base-v2", "uk-users-v2"],
  "newRuleId": "ios-uk-optimized",
  "strategy": "merge"
}

#

# Compose Android with mobile optimization
POST http://localhost:3000/rules/compose
Content-Type: application/json

{
  "appId": "GovUK.App",
  "version": "0.0.2",
  "sourceRuleIds": ["android-base-v2", "mobile-optimization-v2"],
  "newRuleId": "android-mobile-optimized",
  "strategy": "merge"
}

# --------------------------------------------------------------------------
# 12. CREATE MOBILE-SPECIFIC RULES FROM TEMPLATES
# --------------------------------------------------------------------------

# Create Scotland-specific mobile rule
POST http://localhost:3000/rules/from-template
Content-Type: application/json

{
  "appId": "GovUK.App",
  "version": "0.0.2",
  "templateId": "uk-region",
  "overrides": {
    "id": "scotland-mobile",
    "name": "Scotland Mobile Config",
    "priority": 85,
    "conditions": [{
      "type": "geo_region",
      "operator": "eq",
      "value": "Scotland"
    }],
    "config": {
      "apiEndpoint": "https://api.gov.scot/v2",
      "cacheExpiry": 9000,
      "featureToggles": {
        "gaelicLanguage": true
      }
    }
  }
}

#

# Create MP-specific rule for preview features
POST http://localhost:3000/rules/from-template
Content-Type: application/json

{
  "appId": "GovUK.App",
  "version": "0.0.2",
  "templateId": "high-security",
  "overrides": {
    "id": "mp-preview-access",
    "name": "MP Preview Features",
    "priority": 200,
    "conditions": [{
      "type": "user_agent_match",
      "operator": "regex",
      "value": "GovUK.App.*"
    }],
    "config": {
      "featureToggles": {
        "newDashboard": true,
        "experimentalFeatures": true,
        "mpOnlyFeatures": true,
        "constituencyInsights": true,
        "votingAlerts": true
      },
      "securityLevel": "high",
      "apiEndpoint": "https://api.parliament.uk/v2"
    }
  }
}

# --------------------------------------------------------------------------
# 13. TEST CONDITIONAL LOADING FOR MOBILE FEATURES
# --------------------------------------------------------------------------

# Test MP user getting preview features
POST http://localhost:3000/rules/test-conditions
Content-Type: application/json

{
  "appId": "GovUK.App",
  "version": "0.0.2",
  "context": {
    "userId": "mp.example",
    "userType": "mp",
    "featureFlags": {
      "experimentalUI": true
    }
  }
}

#

# Test beta tester in percentage rollout
POST http://localhost:3000/rules/test-conditions
Content-Type: application/json

{
  "appId": "GovUK.App",
  "version": "0.0.2",
  "context": {
    "userId": "beta.tester.001",
    "featureFlags": {
      "betaFeatures": true,
      "experimentalUI": true
    }
  }
}

#

# Test regular user (should not get experimental features)
POST http://localhost:3000/rules/test-conditions
Content-Type: application/json

{
  "appId": "GovUK.App",
  "version": "0.0.2",
  "context": {
    "userId": "regular.user.456",
    "featureFlags": {
      "experimentalUI": true
    }
  }
}

# --------------------------------------------------------------------------
# 14. COMPLEX MOBILE SCENARIOS
# --------------------------------------------------------------------------

# MP using iOS in UK Parliament during working hours
GET http://localhost:3000/config/GovUK.App/0.0.2?country=GB&region=London&userId=mp.westminster&context={"userType":"mp","location":"Parliament","sessionActive":true}
User-Agent: GovUK.App/0.0.2 (iOS 17.0; iPhone 15 Pro)

#

# Minister using Android with high security requirements
GET http://localhost:3000/config/GovUK.App/0.0.2?country=GB&userId=minister.cabinet&context={"userType":"minister","clearanceLevel":"top-secret"}
User-Agent: GovWorker/1.0 AppVersion/0.0.2 (Android 14; Samsung Galaxy S24 Ultra)

#

# Beta tester in rural Scotland with offline mode
GET http://localhost:3000/config/GovUK.App/0.0.2?country=GB&region=Scottish%20Highlands&userId=beta.rural.001&flags={"betaFeatures":true}&context={"connectivity":"poor"}
User-Agent: GovUK.App/0.0.2-beta (iOS 17.0; iPhone)

#

# Civil servant on tablet in development environment
GET http://localhost:3000/config/GovUK.App/0.0.2?env=development&userId=dev.tester.123&context={"userType":"developer"}
User-Agent: GovUK.App/0.0.2-dev (iOS 17.0; iPad Pro)

# --------------------------------------------------------------------------
# 15. CREATE PRODUCTION-READY MOBILE APP CONFIGURATION
# --------------------------------------------------------------------------

# Create a new mobile app (NHS App example)
POST http://localhost:3000/config
Content-Type: application/json

{
  "id": "nhs-app-v100",
  "appId": "NHS.App",
  "version": "1.0.0",
  "environment": "production",
  "schema": {
    "version": "1.0.0",
    "requiredKeys": ["apiEndpoint", "timeout", "enableAnalytics"],
    "optionalKeys": ["featureToggles", "securityLevel", "cacheExpiry"],
    "deprecatedKeys": []
  },
  "defaultConfig": {
    "apiEndpoint": "https://api.nhs.uk/v1",
    "timeout": 5000,
    "enableAnalytics": true,
    "securityLevel": "high",
    "cacheExpiry": 3600,
    "featureToggles": {
      "appointmentBooking": true,
      "prescriptionOrdering": true,
      "covidPassport": true,
      "mentalHealthSupport": false
    }
  },
  "rules": [
    {
      "id": "ios-nhs",
      "name": "NHS iOS Configuration",
      "priority": 100,
      "conditions": [{
        "type": "os",
        "operator": "eq",
        "value": "iOS"
      }],
      "config": {
        "featureToggles": {
          "healthKit": true,
          "appleWallet": true
        }
      },
      "resolutionStrategy": "merge",
      "enabled": true
    },
    {
      "id": "android-nhs",
      "name": "NHS Android Configuration",
      "priority": 100,
      "conditions": [{
        "type": "os",
        "operator": "eq",
        "value": "Android"
      }],
      "config": {
        "featureToggles": {
          "googleFit": true
        }
      },
      "resolutionStrategy": "merge",
      "enabled": true
    }
  ],
  "featureFlags": {
    "betaFeatures": false
  }
}

# --------------------------------------------------------------------------
# 16. UPDATE CONFIGURATION FOR A/B TESTING
# --------------------------------------------------------------------------

# Update GovUK.App to add A/B testing for new dashboard
PUT http://localhost:3000/config/GovUK.App/0.0.2
Content-Type: application/json

{
  "rolloutPercentages": {
    "new-dashboard": 50,
    "experimental-ui": 10,
    "mp-preview": 100
  },
  "conditionalRules": [
    {
      "ruleId": "new-dashboard-ab-test",
      "loadConditions": [
        {
          "type": "percentage_rollout",
          "value": {
            "percentage": 50,
            "ruleId": "new-dashboard-ab-test"
          }
        }
      ],
      "lazyLoad": true
    }
  ]
}

# --------------------------------------------------------------------------
# 17. MONITOR APP PERFORMANCE ACROSS ENVIRONMENTS
# --------------------------------------------------------------------------

# Development environment - detailed debugging
GET http://localhost:3000/config/GovUK.App/0.0.2?env=development&userId=dev.001
User-Agent: GovUK.App/0.0.2-dev (iOS 17.0; iPhone)

#

# Staging environment - pre-production validation
GET http://localhost:3000/config/GovUK.App/0.0.2?env=staging&userId=qa.tester.001
User-Agent: GovUK.App/0.0.2-staging (Android 14; Pixel 8)

#

# Production environment - optimized performance
GET http://localhost:3000/config/GovUK.App/0.0.2?env=production&userId=prod.user.001
User-Agent: GovUK.App/0.0.2 (iOS 17.0; iPhone)

# --------------------------------------------------------------------------
# 18. ROLLOUT STRATEGY - PROGRESSIVE FEATURE DEPLOYMENT
# --------------------------------------------------------------------------

# Week 1: Internal team (100% rollout)
GET http://localhost:3000/config/GovUK.App/0.0.2?userId=team.member.001&context={"team":"internal"}
User-Agent: GovUK.App/0.0.2 (iOS 17.0; iPhone)

#

# Week 2: MPs and Ministers (100% rollout)
GET http://localhost:3000/config/GovUK.App/0.0.2?userId=mp.preview.001&context={"userType":"mp"}
User-Agent: GovUK.App/0.0.2 (iOS 17.0; iPhone)

#

# Week 3: Beta testers (25% rollout)
GET http://localhost:3000/config/GovUK.App/0.0.2?userId=beta.001&flags={"betaFeatures":true}
User-Agent: GovUK.App/0.0.2-beta (Android 14; Pixel 8)

#

# Week 4: General public (0% initially, gradually increase)
GET http://localhost:3000/config/GovUK.App/0.0.2?userId=public.001
User-Agent: GovUK.App/0.0.2 (iOS 17.0; iPhone)
