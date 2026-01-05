/**
 * Request forwarded from tunnel server to CLI
 */
export type TunnelRequest = {
	id: string;
	method: string;
	path: string;
	headers: Record<string, string>;
	body?: string;
};

/**
 * Response from CLI back to tunnel server
 */
export type TunnelResponse = {
	requestId: string;
	status: number;
	headers: Record<string, string>;
	body: string;
};

/**
 * Control messages sent from server to client
 */
export type TunnelControlMessage = { type: "takeover" };

/**
 * All possible WebSocket message types
 */
export type TunnelMessage =
	| TunnelRequest
	| TunnelResponse
	| TunnelControlMessage;

/**
 * Options for TunnelManager
 */
export type TunnelManagerOptions = {
	verbose?: boolean;
	onTakeover?: (port: number) => void;
	onMaxRetries?: (port: number) => void;
	onSecretRotated?: (port: number, newSecret: string) => void;
};

/**
 * Options for individual tunnels
 */
export type TunnelOptions = {
	timeout?: number;
	maxRetries?: number;
};

/**
 * Connection state of a tunnel
 */
export type ConnectionState =
	| "connecting"
	| "connected"
	| "reconnecting"
	| "disconnected";

/**
 * Statistics for a tunnel
 */
export type TunnelStats = {
	requests: number;
	errors: number;
	avgMs: number;
};
