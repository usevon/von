import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react"
import type { ReactNode } from "react"
import { logger } from "@von/logger"

type WebSocketMessage = {
  topic: string
  data: unknown
}

type SubscriptionCallback = (data: unknown) => void

type WebSocketContextValue = {
  isConnected: boolean
  subscribe: (topic: string, callback: SubscriptionCallback) => void
  unsubscribe: (topic: string) => void
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null)

type ApiContextValue = {
  apiUrl: string
}

const ApiContext = createContext<ApiContextValue | null>(null)

type VonWebSocketProviderProps = {
  children: ReactNode
  apiUrl: string
  apiKey?: string
  sessionToken?: string
  enabled?: boolean
}

export const VonWebSocketProvider = (props: VonWebSocketProviderProps) => {
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const subscriptionsRef = useRef<Map<string, Set<SubscriptionCallback>>>(new Map())
  const propsRef = useRef(props)
  propsRef.current = props

  const enabled = props.enabled !== false
  const hasAuth = Boolean(props.apiKey || props.sessionToken)

  const connect = useCallback(() => {
    const currentProps = propsRef.current
    const isEnabled = currentProps.enabled !== false
    const authAvailable = Boolean(currentProps.apiKey || currentProps.sessionToken)

    if (!isEnabled || !authAvailable) {
      return
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    try {
      let wsUrl = currentProps.apiUrl.replace(/^http/, "ws") + "/subscribe"

      if (currentProps.apiKey) {
        wsUrl += `?apiKey=${encodeURIComponent(currentProps.apiKey)}`
      } else if (currentProps.sessionToken) {
        wsUrl += `?sessionToken=${encodeURIComponent(currentProps.sessionToken)}`
      }

      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        logger.info("[VonWebSocket] Connected")
        setIsConnected(true)
        reconnectAttemptsRef.current = 0

        for (const topic of subscriptionsRef.current.keys()) {
          ws.send(JSON.stringify({ type: "subscribe", topic }))
        }
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage
          const callbacks = subscriptionsRef.current.get(message.topic)

          if (callbacks) {
            for (const callback of callbacks) {
              callback(message.data)
            }
          }
        } catch (error) {
          logger.error({ error }, "[VonWebSocket] Failed to parse message")
        }
      }

      ws.onerror = (error) => {
        logger.error({ error }, "[VonWebSocket] Error")
      }

      ws.onclose = () => {
        logger.info("[VonWebSocket] Disconnected")
        setIsConnected(false)
        wsRef.current = null

        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
        reconnectAttemptsRef.current++

        logger.info(`[VonWebSocket] Reconnecting in ${delay}ms`)
        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, delay)
      }

      wsRef.current = ws
    } catch (error) {
      logger.error({ error }, "[VonWebSocket] Failed to connect")
    }
  }, [])

  useEffect(() => {
    if (enabled && hasAuth) {
      connect()
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [enabled, hasAuth, connect])

  const subscribe = useCallback((topic: string, callback: SubscriptionCallback) => {
    let callbacks = subscriptionsRef.current.get(topic)
    if (!callbacks) {
      callbacks = new Set()
      subscriptionsRef.current.set(topic, callbacks)

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "subscribe", topic }))
      }
    }
    callbacks.add(callback)
  }, [])

  const unsubscribe = useCallback((topic: string) => {
    subscriptionsRef.current.delete(topic)

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "unsubscribe", topic }))
    }
  }, [])

  return (
    <WebSocketContext.Provider value={{ isConnected, subscribe, unsubscribe }}>
      {props.children}
    </WebSocketContext.Provider>
  )
}

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error("useWebSocketContext must be used within VonWebSocketProvider")
  }
  return context
}

type VonProviderProps = {
  children: ReactNode
  apiUrl: string
  apiKey?: string
  sessionToken?: string
  websocket?: boolean
}

export const useApiContext = () => {
  const context = useContext(ApiContext)
  if (!context) {
    throw new Error("useApiContext must be used within VonProvider")
  }
  return context
}

export const VonProvider = (props: VonProviderProps) => {
  const enableWebSocket = props.websocket !== false

  return (
    <ApiContext.Provider value={{ apiUrl: props.apiUrl }}>
      <VonWebSocketProvider
        apiUrl={props.apiUrl}
        apiKey={props.apiKey}
        sessionToken={props.sessionToken}
        enabled={enableWebSocket}
      >
        {props.children}
      </VonWebSocketProvider>
    </ApiContext.Provider>
  )
}
