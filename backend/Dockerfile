FROM ghcr.io/astral-sh/uv:bookworm-slim

ENV APP_NAME=fcnn-numbers
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy


# Install dependencies

ADD . /app

WORKDIR /app
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked

ENTRYPOINT ["uv", "run", "main.py"]