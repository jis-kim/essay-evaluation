# Dockerfile for application
# 20은 high vulnerability 문제가 있어 22사용
FROM node:22-slim AS base
WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
# for prisma
RUN apt-get update -y && apt-get install -y openssl && apt-get install -y ffmpeg

FROM base AS build
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN npx prisma generate
RUN pnpm run build
RUN mkdir -p /app/logs /app/uploads/temp

FROM base
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist
COPY --from=build /app/package.json /app/package.json
COPY --from=build --chown=node:node /app/logs /app/logs
COPY --from=build --chown=node:node /app/uploads/temp /app/uploads/temp
COPY --from=build --chown=node:node /app/prisma /app/prisma

# node 사용자로 전환
USER node
EXPOSE 3000
# 애플리케이션 실행
CMD ["node", "dist/main"]
