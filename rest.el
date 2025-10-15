# -*- restclient -*-
# Get config for iOS user
GET http://localhost:3000/config/GovUK.App/0.0.2
User-Agent: GovUK.App/0.0.2 (iOS 17.0; iPhone)

#
# Get config with custom context
#
GET http://localhost:3000/config/GovUK.App/0.0.2?context={"priority":"high"}
User-Agent: GovUK.App/0.0.2 (Android 14; Mobile)

#
# List all configurations
#
GET http://localhost:3000/config

#
# Get configuration spec
#
GET http://localhost:3000/config/GovUK.App/0.0.2/spec

#
# Test conditional rules
#
POST http://localhost:3000/rules/test-conditions
User-Agent: GovUK.App/0.0.2 (Android 14; Mobile)
Content-Type: application/json

{
  "appId":"GovUK.App",
  "version":"0.0.2",
  "context": {
    "userId":"test123"
  }
}

#
# Create rule from template
#
POST http://localhost:3000/rules/from-template
Content-Type: application/json

{
  "appId": "GovUK.App",
  "version": "0.0.2",
  "templateId": "uk-region",
  "overrides": {
    "id": "scotland-specific",
    "name": "Scotland Region",
    "conditions": [{
	  "type":"geo_region",
	  "operator":"eq",
	  "value":"Scotland"
	}]
  }
}