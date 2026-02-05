.PHONY: dev dev-nc prod build
.PHONY: test

DC ?= docker compose
ENV_DEV ?= .env.dev
ENV_PROD ?= .env.prod
SERVICE_DEV ?= web-dev api-dev
SERVICE_PROD ?= web api
BUILD_SERVICES ?= web web-dev api api-dev
TEST_PY ?= $(if $(wildcard back/.venv/bin/python),.venv/bin/python,python)
TEST_ARGS ?=

dev:
	@if [ ! -f "$(ENV_DEV)" ]; then echo "Missing $(ENV_DEV)"; exit 1; fi
	# Use cache by default; set NO_CACHE=1 to force rebuild without cache
	$(DC) --env-file "$(ENV_DEV)" build $(if $(NO_CACHE),--no-cache,) $(SERVICE_DEV)
	$(DC) --env-file "$(ENV_DEV)" up $(SERVICE_DEV)

# Shortcut for no-cache builds: make dev-nc or make dev NO_CACHE=1
dev-nc: NO_CACHE=1
dev-nc: dev

prod:
	@if [ ! -f "$(ENV_PROD)" ]; then echo "Missing $(ENV_PROD)"; exit 1; fi
	$(DC) --env-file "$(ENV_PROD)" up $(SERVICE_PROD)

build:
	$(DC) build $(BUILD_SERVICES)

test:
	cd back && DB_BACKEND=jsonl DB_JSON_PATH=$${DB_JSON_PATH:-$$(pwd)/data/dummy_db.jsonl} $(TEST_PY) -m pytest $(TEST_ARGS)
