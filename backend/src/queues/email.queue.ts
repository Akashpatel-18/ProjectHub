import { Queue, Worker } from "bullmq";
import Redis from "ioredis";
import { ENV } from "../config/env";
import {
  sendWorkspaceInviteEmail,
  sendPasswordResetEmail,
} from "../services/email.service";

const redisUrl = ENV.REDIS_URL;

// BullMQ REQUIRES maxRetriesPerRequest to be null
const connection: any = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

export const emailQueue = new Queue("EmailQueue", { connection });

export const emailWorker = new Worker(
  "EmailQueue",
  async (job) => {
    if (job.name === "sendInvite") {
      await sendWorkspaceInviteEmail(job.data);
    } else if (job.name === "sendReset") {
      await sendPasswordResetEmail(job.data);
    }
  },
  { connection }
);

emailWorker.on("completed", (job) => {
  console.log(`[BullMQ] Email job ${job.id} (${job.name}) completed successfully`);
});

emailWorker.on("failed", (job, err) => {
  console.error(`[BullMQ] Email job ${job?.id} failed:`, err);
});
