-- Von Webhooks Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Webhook logs (outbound webhooks sent)
CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event VARCHAR(255) NOT NULL,
  destination_url TEXT NOT NULL,
  payload JSONB NOT NULL,
  status_code INT,
  latency INT,
  attempts INT NOT NULL DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  error TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Webhook events (inbound webhooks received)
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source VARCHAR(255) NOT NULL,
  event VARCHAR(255) NOT NULL,
  data JSONB NOT NULL,
  signature VARCHAR(512),
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  processed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Webhook attempts (retry tracking for outbound webhooks)
CREATE TABLE webhook_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_log_id UUID NOT NULL REFERENCES webhook_logs(id) ON DELETE CASCADE,
  attempt INT NOT NULL,
  status_code INT,
  error TEXT,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX idx_webhook_logs_event ON webhook_logs(event);
CREATE INDEX idx_webhook_logs_created_at ON webhook_logs(created_at DESC);
CREATE INDEX idx_webhook_events_source ON webhook_events(source);
CREATE INDEX idx_webhook_events_event ON webhook_events(event);
CREATE INDEX idx_webhook_events_created_at ON webhook_events(created_at DESC);
CREATE INDEX idx_webhook_attempts_log_id ON webhook_attempts(webhook_log_id);
