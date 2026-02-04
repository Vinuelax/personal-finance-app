.PHONY: dev prod
.PHONY: test

DC ?= docker compose
ENV_DEV ?= .env.dev
ENV_PROD ?= .env.prod
SERVICE_DEV ?= web-dev api-dev
SERVICE_PROD ?= web api
TEST_PY ?= $(if $(wildcard back/.venv/bin/python),.venv/bin/python,python)
TEST_ARGS ?=

dev:
	@if [ ! -f "$(ENV_DEV)" ]; then echo "Missing $(ENV_DEV)"; exit 1; fi
	$(DC) --env-file "$(ENV_DEV)" up $(SERVICE_DEV)

prod:
	@if [ ! -f "$(ENV_PROD)" ]; then echo "Missing $(ENV_PROD)"; exit 1; fi
	$(DC) --env-file "$(ENV_PROD)" up $(SERVICE_PROD)

test:
	cd back && DB_BACKEND=jsonl DB_JSON_PATH=$${DB_JSON_PATH:-$$(pwd)/data/dummy_db.jsonl} $(TEST_PY) -m pytest $(TEST_ARGS)
