FROM node:24-slim
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
ARG APP_VERSION
ARG TARGETARCH
WORKDIR /app

ENV CI=true
COPY . /app

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

ENV PORT=3000

EXPOSE 3000

CMD [ "node", "server.js" ]
