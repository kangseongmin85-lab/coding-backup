import { useCallback, useEffect, useRef, useState } from 'react'
import { ChatMessage, Holding } from './types'

export type CityState = {
  holdings: Holding[]
  prices: Record<string, number>
  marketCaps?: Record<string, number>
  names?: Record<string, string>
  messages: ChatMessage[]
  lastPriceUpdate?: number
}

function wsUrl(): string {
  const loc = window.location
  // 개발(Vite 5173)에서는 로컬 Worker(8787)로, 배포에서는 같은 오리진으로
  if (import.meta.env.DEV) return 'ws://localhost:8787/api/ws?room=global'
  const proto = loc.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${loc.host}/api/ws?room=global`
}

export type CityNet = {
  state: CityState | null
  connected: boolean
  online: number
  send: (obj: unknown) => boolean
}

// 공유 도시 서버(WebSocket)에 연결. 끊기면 자동 재접속.
export function useCity(): CityNet {
  const [state, setState] = useState<CityState | null>(null)
  const [connected, setConnected] = useState(false)
  const [online, setOnline] = useState(0)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    let stop = false
    let retry: number | undefined

    function connect() {
      let ws: WebSocket
      try {
        ws = new WebSocket(wsUrl())
      } catch {
        scheduleRetry()
        return
      }
      wsRef.current = ws
      ws.onopen = () => {
        if (!stop) setConnected(true)
      }
      ws.onmessage = (e) => {
        try {
          const m = JSON.parse(e.data)
          if (m.type === 'state') {
            setState(m.state)
            if (typeof m.online === 'number') setOnline(m.online)
          }
        } catch {
          /* ignore */
        }
      }
      ws.onclose = () => {
        if (!stop) {
          setConnected(false)
          scheduleRetry()
        }
      }
      ws.onerror = () => {
        try {
          ws.close()
        } catch {
          /* ignore */
        }
      }
    }
    function scheduleRetry() {
      if (stop) return
      retry = window.setTimeout(connect, 2500)
    }

    connect()
    return () => {
      stop = true
      if (retry) clearTimeout(retry)
      wsRef.current?.close()
    }
  }, [])

  const send = useCallback((obj: unknown) => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(obj))
      return true
    }
    return false
  }, [])

  return { state, connected, online, send }
}
