import { Worker } from 'bullmq';
import nodemailer from 'nodemailer';
import env from '../config/env.js';
import { connectionOpts, registerMockWorker } from '../config/queue.js';
import logger from '../utils/logger.js';

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;
  
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
  return transporter;
};

const sendPhysicalEmail = async (to, subject, htmlBody) => {
  if (process.env.NODE_ENV === 'test' || env.SMTP_USER === 'test' || !env.SMTP_USER) {
    logger.info(`[EMAIL STUB] Sending email to: ${to}`);
    logger.info(`[EMAIL STUB] Subject: ${subject}`);
    logger.debug(`[EMAIL STUB] Body: ${htmlBody}`);
    return;
  }

  const mailOptions = {
    from: env.EMAIL_FROM,
    to,
    subject,
    html: htmlBody,
  };

  try {
    const info = await getTransporter().sendMail(mailOptions);
    logger.info(`Email sent successfully. Message ID: ${info.messageId}`);
  } catch (err) {
    logger.error(`Email send failure to ${to}: ${err.message}`, err);
    throw err;
  }
};

const processNotificationJob = async (job) => {
  const { to, subject, htmlBody } = job.data;
  logger.info(`notificationWorker: Processing job ${job.id} for recipient: ${to}`);
  await sendPhysicalEmail(to, subject, htmlBody);
};

let worker = null;

if (process.env.NODE_ENV === 'test') {
  // Register with mock test environment queue runner
  registerMockWorker('notifications', processNotificationJob);
} else {
  // Start active BullMQ worker processor
  worker = new Worker('notifications', processNotificationJob, {
    connection: connectionOpts,
    concurrency: 5 // Process up to 5 email tasks concurrently
  });

  worker.on('completed', (job) => {
    logger.info(`notificationWorker: Job ${job.id} completed successfully.`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`notificationWorker: Job ${job.id} failed. Error: ${err.message}`, err);
  });

  logger.info('notificationWorker: Active BullMQ worker initialized.');
}

export default worker;
export { sendPhysicalEmail };
