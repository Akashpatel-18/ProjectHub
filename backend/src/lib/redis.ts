import Redis from "ioredis";
import { ENV } from "../config/env";

const redisUrl = ENV.REDIS_URL;

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 1,
  // enableOfflineQueue: false,
  // commandTimeout: 2000,
  // connectTimeout: 5000,
  // retryStrategy: (times) => {
  //   if (times > 2) {
  //     console.warn("Redis is unreachable, proceeding without cache.");
  //     return null;
  //   }
  //   return Math.min(times * 50, 2000);
  // },
});

redis.on("error", (err) => {
  console.warn("Redis connection error:", err.message);
});

export default redis;
