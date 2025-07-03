interface Config {
  API_BASE_URL: string;
  WS_URL: string;
  REDIS_STREAM_PREFIX: string;
  P2P_CONFIG: {
    MAX_PLAYERS: number;
    HEARTBEAT_INTERVAL: number;
    CONNECTION_TIMEOUT: number;
    ELECTION_TIMEOUT: number;
  };
  WEBRTC_CONFIG: {
    iceServers: Array<{
      urls: string[];
      username?: string;
      credential?: string;
    }>;
  };
}

const CONFIG: Config = {
  API_BASE_URL: 'https://www.brainbrawler.com/api',
  WS_URL: 'wss://www.brainbrawler.com/ws',
  REDIS_STREAM_PREFIX: 'brainbrawler:game:',
  P2P_CONFIG: {
    MAX_PLAYERS: 8,
    HEARTBEAT_INTERVAL: 5000, // 5 seconds
    CONNECTION_TIMEOUT: 15000, // 15 seconds
    ELECTION_TIMEOUT: 10000, // 10 seconds
  },
  WEBRTC_CONFIG: {
    iceServers: [
      {
        urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'],
      },
      {
        urls: ['turn:www.brainbrawler.com:3478'],
        username: 'brainbrawler',
        credential: 'turn-server-secret',
      },
    ],
  },
};

export default CONFIG; 