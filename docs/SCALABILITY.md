# 📈 TaskFlow — Scalability Design Note

## Current Architecture

```
Browser → Nginx → Node.js (Express) → PostgreSQL
                                    → Redis (Cache)
```

This monolith is built to be **modular and extraction-ready** — each domain (auth, tasks, users, admin) is fully separated and can become its own microservice without rewriting logic.

---

## Horizontal Scaling Strategy

### 1. Load Balancing

Deploy multiple API instances behind a load balancer (NGINX, AWS ALB, or Cloudflare).

```
                  ┌─────────────────────────────────┐
Users ──► ALB ──► │  API Instance 1  (EC2 / ECS)    │
                  │  API Instance 2  (EC2 / ECS)    │
                  │  API Instance N  ...             │
                  └────────────┬────────────────────┘
                               │
                   ┌───────────┴──────────┐
                   │  PostgreSQL (RDS)    │
                   │  Redis    (ElastiC.) │
                   └──────────────────────┘
```

**Statelessness**: JWTs carry all session state — no sticky sessions needed. Any instance can serve any request.

### 2. Caching Layer (Redis)

Already wired in Docker Compose. Cache strategy:

| Data                 | TTL    | Strategy         |
|----------------------|--------|------------------|
| Task stats per user  | 60s    | Cache-aside      |
| Admin global stats   | 30s    | Cache-aside      |
| User profile (GET /me) | 5min | Write-through    |
| Task list queries    | 10s    | Cache-aside      |

Implementation pattern:
```js
async function getTaskStats(userId) {
  const key = `stats:user:${userId}`;
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  const stats = await TaskModel.getStatsByUser(userId);
  await redis.setex(key, 60, JSON.stringify(stats));
  return stats;
}
```

Invalidate on write: when a task is created/updated/deleted, bust `stats:user:{id}`.

### 3. Database Scaling

**Short-term (vertical):** Upgrade PostgreSQL instance size (RDS r6g.xlarge → r6g.2xlarge).

**Medium-term (read replicas):**
```
Write queries → Primary (RDS)
Read queries  → Read Replica(s)
```
Route with PgBouncer or in application code (separate pool per replica).

**Long-term (sharding):** Shard tasks by `user_id` hash if the table exceeds 100M rows. Consistent hashing avoids rebalancing.

**Indexing already in place:**
- `tasks(user_id)` — owner lookups
- `tasks(status)`, `tasks(priority)` — filtered queries
- `tasks(due_date)` — overdue detection
- `users(email)` — login lookup

### 4. Microservices Extraction Path

The codebase is already modular. Extraction order by load:

```
Phase 1 (current):  Monolith
Phase 2 (10k users): Extract Auth Service → separate JWT secret rotation
Phase 3 (100k):     Extract Task Service → independent scaling
Phase 4 (1M+):      Notification Service, Search Service (Elasticsearch)
```

Communication between services: **REST** for synchronous (auth check), **message queue (RabbitMQ / Kafka)** for async (email notifications, audit logs).

### 5. Async Processing & Queues

Heavy operations that should leave the request/response cycle:

| Operation              | Queue Solution         |
|------------------------|------------------------|
| Welcome email          | Bull (Redis-backed)    |
| Audit log writes       | Kafka / SQS            |
| Bulk task imports      | BullMQ workers         |
| Report generation      | Celery-style workers   |

### 6. API Gateway (Production)

Add an API Gateway in front of all services:

- **Rate limiting** (per user, per IP)
- **Authentication verification** (one place, not per service)
- **Request logging & tracing** (correlation IDs)
- **Circuit breaker** (fail fast on downstream issues)

Tools: Kong, AWS API Gateway, or Traefik.

### 7. Observability

**Logging:** Winston → Loki → Grafana  
**Metrics:** Prometheus + `/metrics` endpoint (prom-client)  
**Tracing:** OpenTelemetry + Jaeger (trace DB queries, API latency)  
**Alerting:** PagerDuty on error rate > 1% or p99 latency > 500ms

### 8. Infrastructure as Code

- **Terraform** for cloud resources (VPC, RDS, ElastiCache, ECS/EKS)
- **GitHub Actions** CI/CD pipeline:
  ```
  push → lint → test → build Docker → push to ECR → deploy ECS
  ```

---

## Estimated Capacity (current setup)

| Metric              | Value                   |
|---------------------|-------------------------|
| Requests / second   | ~500 (single instance)  |
| Concurrent users    | ~2,000                  |
| DB connections      | 20 (pool)               |
| Scale-out time      | < 2 min (ECS auto-scale)|

With Redis caching and 3 instances behind ALB: **~3,000 req/s**, **~15,000 concurrent users**.

---

## Summary

The TaskFlow API is designed with scalability as a first principle:

1. **Stateless JWT auth** → horizontal scaling with no shared session state
2. **Connection pooling** → efficient DB resource usage under load
3. **Modular architecture** → clean microservice extraction path
4. **Redis caching** → eliminates repeated DB reads for hot data
5. **Docker + Compose** → consistent environment from dev to prod
6. **Indexes on all query paths** → sub-10ms DB queries at scale
7. **Graceful shutdown** → zero-downtime deployments
8. **Structured logging** → production observability from day one
