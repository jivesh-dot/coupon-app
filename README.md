# Coupon Service

A service to generate and redeem coupon codes using NestJS(Web Framework) PostgreSQL(Relational Entries), MongoDB(Logging created Coupons) and Redis(Coupon Codes).
Please refer to .env for configurations

## API Documentation

- Swagger UI is available at:

  [Swagger Link](http://localhost:3000/api-docs#/)

- Postman Dump:

  Collection -> [Download Postman Collection](postman/holo-voucher.postman_collection.json)
  Env -> [Download Postman Env](postman/holo.postman_environment.json)
  

---

## Requirements

- Docker
- Docker Compose

---

## Getting Started

1. **Clone the Repository**

   ```bash
   git clone https://github.com/jivesh-dot/coupon-app.git
   cd coupon-service
   ```

2. **Build and Start the Containers**

   ```bash
   docker-compose build --no-cache
   docker-compose up
   ```

3. **Environment Variables**

   - All required environment variables are defined in the `.env` file.
   - Update them based on your environment or infrastructure. (Note: PostgreSQL database named voucherdb is created at docker-compose build)

---

## Seed Data

1. **Check Running Containers**

   ```bash
   docker ps
   ```

   **Expected Output:**

   ```
   CONTAINER ID   IMAGE                          ...   PORTS                    NAMES
   5de12e8a4327   coupon-service-coupon-service   ...   0.0.0.0:3000->3000/tcp   coupon-service-coupon-service-1
   73fdd9e9ddb5   postgres:14                     ...   0.0.0.0:5432->5432/tcp   coupon-service-postgres-1
   cc3ebb28d45d   mongo:5                         ...   0.0.0.0:27017->27017/tcp coupon-service-mongo-1
   e5734536925d   redis:7                         ...   0.0.0.0:6379->6379/tcp   coupon-service-redis-1
   ```

2. **Access the Application Container**

   ```bash
   docker exec -it 5de12e8a4327 /bin/sh
   ```

3. **Run the Seed Script**

   ```bash
   npm run seed:testData
   ```

   This will seed the test data into the database as described below.

---

## Seeded Data Overview

### PostgreSQL

#### `coupon_generator` Table

```json
{
  "id": 1,
  "description": "Default coupon generator",
  "generatorNumber": 0,
  "lastGeneratedAt": "2025-06-22T00:00:00Z"
}
```

#### `special_offer` Table

```json
{
  "description": "Launch Offer",
  "discountAmount": 10,
  "expirationDate": "2025-12-31"
}
```

---

### Redis

- Redis Set: `available-coupons`
- Contains **1000 unique coupon codes** seeded and ready for use.
- This command can be added to cron for auto generation

---

## Test Cases
  docker exec -it 5de12e8a4327 /bin/sh
  npm test

## Rate Limiter added for Voucher APi's 
