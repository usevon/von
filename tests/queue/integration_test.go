package queue_test

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/usevon/von/pkg/types"
	"github.com/usevon/von/tests/util"
)

var testRabbitMQURL = util.GetRabbitMQURL()

func TestPublishAndConsume(t *testing.T) {
	q := util.SetupQueue(t)

	received := make(chan types.QueueMessage, 1)
	err := q.StartWorker(func(ctx context.Context, msg types.QueueMessage) error {
		received <- msg
		return nil
	})
	if err != nil {
		t.Fatalf("failed to start worker: %v", err)
	}

	time.Sleep(1 * time.Second)

	testMsg := util.NewTestMessage(
		util.WithDeliveryID("test-delivery-123"),
		util.WithPayload(map[string]interface{}{"user_id": "123"}),
	)
	testMsg.EventType = "user.created"
	testMsg.MaxRetries = 5

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err = q.Enqueue(ctx, &testMsg)
	if err != nil {
		t.Fatalf("failed to enqueue webhook: %v", err)
	}

	select {
	case msg := <-received:
		if msg.DeliveryID != testMsg.DeliveryID {
			t.Errorf("expected DeliveryID %s, got %s", testMsg.DeliveryID, msg.DeliveryID)
		}
		if msg.EventID != testMsg.EventID {
			t.Errorf("expected EventID %s, got %s", testMsg.EventID, msg.EventID)
		}
		if msg.EndpointID != testMsg.EndpointID {
			t.Errorf("expected EndpointID %s, got %s", testMsg.EndpointID, msg.EndpointID)
		}
		if msg.URL != testMsg.URL {
			t.Errorf("expected URL %s, got %s", testMsg.URL, msg.URL)
		}
		if msg.EventType != testMsg.EventType {
			t.Errorf("expected EventType %s, got %s", testMsg.EventType, msg.EventType)
		}
		if msg.Secret != testMsg.Secret {
			t.Errorf("expected Secret %s, got %s", testMsg.Secret, msg.Secret)
		}
	case <-ctx.Done():
		t.Fatal("timeout waiting for message")
	}
}

func TestPublishMultiple(t *testing.T) {
	tests := []struct {
		name      string
		useBatch  bool
	}{
		{"individual enqueue", false},
		{"batch enqueue", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			q := util.SetupQueue(t)

			messageCount := 10
			received := make(chan types.QueueMessage, messageCount)
			err := q.StartWorker(func(ctx context.Context, msg types.QueueMessage) error {
				received <- msg
				return nil
			})
			if err != nil {
				t.Fatalf("failed to start worker: %v", err)
			}

			time.Sleep(1 * time.Second)

			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()

			if tt.useBatch {
				messages := make([]*types.QueueMessage, messageCount)
				for i := 0; i < messageCount; i++ {
					msg := util.NewTestMessage(
						util.WithDeliveryID(fmt.Sprintf("batch-%d", i)),
						util.WithPayload(map[string]interface{}{"index": i}),
					)
					messages[i] = &msg
				}
				err = q.EnqueueBatch(ctx, messages)
				if err != nil {
					t.Fatalf("failed to enqueue batch: %v", err)
				}
			} else {
				for i := 0; i < messageCount; i++ {
					msg := util.NewTestMessage(
						util.WithDeliveryID(fmt.Sprintf("msg-%d", i)),
						util.WithPayload(map[string]interface{}{"index": i}),
					)
					err := q.Enqueue(ctx, &msg)
					if err != nil {
						t.Fatalf("failed to enqueue: %v", err)
					}
				}
			}

			receivedCount := 0
			timeout := time.After(5 * time.Second)
			for receivedCount < messageCount {
				select {
				case <-received:
					receivedCount++
				case <-timeout:
					t.Fatalf("timeout: only received %d/%d messages", receivedCount, messageCount)
				}
			}
		})
	}
}

