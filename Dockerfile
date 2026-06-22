FROM node:24-slim
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
ARG APP_VERSION
ARG TARGETARCH
WORKDIR /app
ENV CI=true

RUN apt-get update
RUN apt-get install redis-server -y

RUN npm i pm2 -g

COPY . /app

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

ENV PORT=3000

EXPOSE 3000

CMD [ "pm2-runtime", "start", "services.config.cjs" ]
