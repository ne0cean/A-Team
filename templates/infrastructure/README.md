# Infrastructure as Code Template

> 1인 + AI 회사 인프라 자동화. 서베이: Vercel + Railway + Docker.
> Terraform/Pulumi는 규모 커지면 도입.

## 추천 스택 (단계별)

### Stage 1: 관리형 ($0-25/월)

| 서비스 | 도구 | 비용 |
|--------|------|------|
| Frontend | Vercel | $0 (Hobby) |
| Backend API | Railway / Render | $0-5 |
| Database | Supabase | $0-25 |
| Storage | Supabase Storage / S3 | $0-5 |
| CI/CD | GitHub Actions | $0 (2000분/월) |

**이 단계에서 IaC 불필요** — 관리형 서비스가 인프라를 관리.

### Stage 2: Docker 자체호스팅 ($5-50/월)

```dockerfile
# 기본 Node.js 앱
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["node", "server.mjs"]
```

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports: ["3000:3000"]
    env_file: .env
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    volumes: ["pgdata:/var/lib/postgresql/data"]
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}

  metabase:
    image: metabase/metabase
    ports: ["3001:3000"]
    depends_on: [db]

volumes:
  pgdata:
```

### Stage 3: Terraform ($50+/월, 멀티 서비스)

```hcl
# main.tf — 필요할 때 Claude가 생성
provider "aws" { region = "ap-northeast-2" }

resource "aws_ecs_service" "app" { ... }
resource "aws_rds_instance" "db" { ... }
resource "aws_cloudfront_distribution" "cdn" { ... }
```

**Claude가 자연어로 IaC 생성 가능:**
```
"Create multi-AZ RDS with read replicas in ap-northeast-2"
→ Claude generates Terraform
```

## 배포 자동화 (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm test
      - run: docker build -t app .
      - run: docker push $REGISTRY/app
      - run: ssh $SERVER "docker pull && docker compose up -d"
```

## 백업

```bash
# DB 백업 (매일)
pg_dump $DATABASE_URL | gzip > backup-$(date +%Y%m%d).sql.gz

# S3에 업로드
aws s3 cp backup-*.sql.gz s3://backups/

# 30일 이상 삭제
find backups/ -mtime +30 -delete
```

## 참고
- [Vercel](https://vercel.com/) — 프론트엔드 최적
- [Railway](https://railway.app/) — 백엔드 배포 최적
- [Supabase](https://supabase.com/) — 오픈소스 BaaS
- AWS DevOps Agent: IaC 생성 + 인시던트 자동 대응
