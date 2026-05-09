# Bili Collector Node

Node.js collector for Bilibili Open Platform live events.

## Docker

```bash
docker build -t biweb-collector-node .
```

```bash
docker run -d \
  --name biweb-collector \
  --restart unless-stopped \
  --network <postgres-network> \
  -e DATABASE_URL='postgres://postgres:<password>@biweb-postgres:5432/biweb?sslmode=disable' \
  -e BILI_ACCESS_KEY_ID='<access-key-id>' \
  -e BILI_ACCESS_KEY_SECRET='<access-key-secret>' \
  -e BILI_APP_ID='<app-id>' \
  -v /www/wwwroot/exports:/app/exports \
  biweb-collector-node
```

## Local Check

```bash
npm install
npm run build
```
