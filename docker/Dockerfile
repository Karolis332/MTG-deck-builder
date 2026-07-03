# Hermes — autonomous deck-engine improver, containerized.
# Self-contained: clones the repo from GitHub, runs the gated improve loop, pushes
# results to a branch. The heavy lifting (npm ci + better-sqlite3 native build) is
# done at first container start into a persistent volume, not baked here — keeps the
# image small and lets it track the live repo without rebuilds.
FROM node:22-bookworm-slim

# git + toolchain for the better-sqlite3 native build; coreutils for `timeout`.
RUN apt-get update && apt-get install -y --no-install-recommends \
      git python3 make g++ ca-certificates coreutils \
    && rm -rf /var/lib/apt/lists/*

# The "model" the loop calls each round. Uses ANTHROPIC_API_KEY at runtime.
RUN npm install -g @anthropic-ai/claude-code

COPY docker/hermes-entrypoint.sh /hermes-entrypoint.sh
RUN chmod +x /hermes-entrypoint.sh

WORKDIR /work
ENTRYPOINT ["/hermes-entrypoint.sh"]
