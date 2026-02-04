.PHONY: dev prod

DC ?= docker compose
ENV_DEV ?= .env.dev
ENV_PROD ?= .env.prod
SERVICE_DEV ?= web-dev api-dev
SERVICE_PROD ?= web api

dev:
	@if [ ! -f "$(ENV_DEV)" ]; then echo "Missing $(ENV_DEV)"; exit 1; fi
	$(DC) --env-file "$(ENV_DEV)" up $(SERVICE_DEV)

prod:
	@if [ ! -f "$(ENV_PROD)" ]; then echo "Missing $(ENV_PROD)"; exit 1; fi
	$(DC) --env-file "$(ENV_PROD)" up $(SERVICE_PROD)
