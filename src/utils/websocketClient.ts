/**
 * WebSocket client for chat completions
 * This replaces the HTTP streaming endpoint with a WebSocket connection
 */

/**
 * Build the chat WebSocket URL.
 *
 * In the browser we MUST connect to the same public origin the page was served
 * from. The chat WebSocket is opened directly from the browser; it is NOT
 * proxied through the Next.js server like the HTTP API routes are. On a split
 * deploy (e.g. DigitalOcean App Platform) the public origin routes the `/ws`
 * path to the backend component, so `wss://<host>/ws/chat` reaches the API.
 * NEXT_PUBLIC_WS_URL can override the base if the WS lives on another host.
 *
 * On the server / during local dev (no `window`), fall back to SERVER_BASE_URL
 * (defaults to http://localhost:8001), which keeps docker-compose working.
 */
export const getWebSocketUrl = (): string => {
  if (typeof window !== 'undefined') {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const base = process.env.NEXT_PUBLIC_WS_URL || `${proto}//${window.location.host}`;
    return `${base}/ws/chat`;
  }
  // Non-browser context (SSR / local dev fallback).
  const serverBaseUrl = process.env.SERVER_BASE_URL || 'http://localhost:8001';
  const wsBaseUrl = serverBaseUrl.replace(/^http/, 'ws');
  return `${wsBaseUrl}/ws/chat`;
};

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatCompletionRequest {
  repo_url: string;
  messages: ChatMessage[];
  filePath?: string;
  token?: string;
  type?: string;
  provider?: string;
  model?: string;
  language?: string;
  excluded_dirs?: string;
  excluded_files?: string;
}

/**
 * Creates a WebSocket connection for chat completions
 * @param request The chat completion request
 * @param onMessage Callback for received messages
 * @param onError Callback for errors
 * @param onClose Callback for when the connection closes
 * @returns The WebSocket connection
 */
export const createChatWebSocket = (
  request: ChatCompletionRequest,
  onMessage: (message: string) => void,
  onError: (error: Event) => void,
  onClose: () => void
): WebSocket => {
  // Create WebSocket connection
  const ws = new WebSocket(getWebSocketUrl());
  
  // Set up event handlers
  ws.onopen = () => {
    console.log('WebSocket connection established');
    // Send the request as JSON
    ws.send(JSON.stringify(request));
  };
  
  ws.onmessage = (event) => {
    // Call the message handler with the received text
    onMessage(event.data);
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    onError(error);
  };
  
  ws.onclose = () => {
    console.log('WebSocket connection closed');
    onClose();
  };
  
  return ws;
};

/**
 * Closes a WebSocket connection
 * @param ws The WebSocket connection to close
 */
export const closeWebSocket = (ws: WebSocket | null): void => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
};
