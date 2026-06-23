.PHONY: dev dev-nc prod build
.PHONY: test release deploy

DC ?= docker compose
ENV_DEV ?= .env.dev
ENV_PROD ?= .env.prod
SERVICE_DEV ?= web-dev api-dev postgres
SERVICE_PROD ?= web api postgres
BUILD_SERVICES ?= web web-dev api api-dev
TEST_PY ?= $(if $(wildcard back/.venv/bin/python),.venv/bin/python,python)
TEST_ARGS ?=

# Image release (build + push to GHCR). Override on the command line, e.g.
#   make release IMAGE_TAG=v1
COMPOSE_PROD ?= docker-compose.prod.yml
REGISTRY ?= ghcr.io/vinuelax
IMAGE_TAG ?= latest
NEXT_PUBLIC_API_BASE_URL ?= https://app.vinuelax.cl/api/v1

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

# Build the api + web images and push them to GHCR. Requires `docker login ghcr.io`.
release:
	REGISTRY="$(REGISTRY)" IMAGE_TAG="$(IMAGE_TAG)" NEXT_PUBLIC_API_BASE_URL="$(NEXT_PUBLIC_API_BASE_URL)" ./scripts/build_push_images.sh

# Pull the released images and (re)start the stack on the box.
deploy:
	@if [ ! -f "$(ENV_PROD)" ]; then echo "Missing $(ENV_PROD)"; exit 1; fi
	$(DC) --env-file "$(ENV_PROD)" -f "$(COMPOSE_PROD)" pull
	$(DC) --env-file "$(ENV_PROD)" -f "$(COMPOSE_PROD)" up -d
