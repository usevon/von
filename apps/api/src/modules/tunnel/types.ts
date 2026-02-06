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
