import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
} from 'react-native-webrtc';
import CONFIG from '../config';
import { PeerConnection, PeerStatus, P2PMessage, P2PMessageType } from '../types';

export class WebRTCManager {
  private peers: Map<string, PeerConnection> = new Map();
  private localUserId: string = '';
  private isHost: boolean = false;
  private messageHandlers: Map<P2PMessageType, (message: P2PMessage) => void> = new Map();

  constructor(userId: string) {
    this.localUserId = userId;
  }

  public setHost(isHost: boolean) {
    this.isHost = isHost;
  }

  public async createPeerConnection(remoteUserId: string): Promise<PeerConnection> {
    const peerConnection: any = new RTCPeerConnection(CONFIG.WEBRTC_CONFIG);
    
    const peer: PeerConnection = {
      id: remoteUserId,
      userId: remoteUserId,
      connection: peerConnection,
      status: PeerStatus.CONNECTING,
      lastHeartbeat: Date.now(),
    };

    // Set up data channel for host
    if (this.isHost) {
      try {
        const dataChannel = peerConnection.createDataChannel('gameData', {
          ordered: true,
        });
        this.setupDataChannel(dataChannel, peer);
        peer.dataChannel = dataChannel;
      } catch (error) {
        console.error('Error creating data channel:', error);
      }
    }

    // Handle incoming data channels
    peerConnection.addEventListener('datachannel', (event: any) => {
      const dataChannel = event.channel;
      this.setupDataChannel(dataChannel, peer);
      peer.dataChannel = dataChannel;
    });

    // ICE candidate handling
    peerConnection.addEventListener('icecandidate', (event: any) => {
      if (event.candidate) {
        this.sendSignalingMessage(remoteUserId, {
          type: 'ice-candidate',
          candidate: event.candidate,
        });
      }
    });

    // Connection state handling
    peerConnection.addEventListener('connectionstatechange', () => {
      console.log(`Peer ${remoteUserId} connection state:`, peerConnection.connectionState);
      
      switch (peerConnection.connectionState) {
        case 'connected':
          peer.status = PeerStatus.CONNECTED;
          this.onPeerConnected(remoteUserId);
          break;
        case 'disconnected':
        case 'failed':
          peer.status = PeerStatus.DISCONNECTED;
          this.onPeerDisconnected(remoteUserId);
          break;
      }
    });

    this.peers.set(remoteUserId, peer);
    return peer;
  }

  private setupDataChannel(dataChannel: any, peer: PeerConnection) {
    dataChannel.addEventListener('open', () => {
      console.log(`Data channel opened with peer ${peer.userId}`);
      peer.status = PeerStatus.CONNECTED;
    });

    dataChannel.addEventListener('message', (event: any) => {
      try {
        const message: P2PMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Error parsing P2P message:', error);
      }
    });

    dataChannel.addEventListener('close', () => {
      console.log(`Data channel closed with peer ${peer.userId}`);
      peer.status = PeerStatus.DISCONNECTED;
    });

    dataChannel.addEventListener('error', (error: any) => {
      console.error(`Data channel error with peer ${peer.userId}:`, error);
      peer.status = PeerStatus.FAILED;
    });
  }

  public async createOffer(remoteUserId: string): Promise<any> {
    const peer = this.peers.get(remoteUserId);
    if (!peer) {
      throw new Error(`Peer ${remoteUserId} not found`);
    }

    const offer = await peer.connection.createOffer({});
    await peer.connection.setLocalDescription(offer);
    return offer;
  }

  public async createAnswer(remoteUserId: string, offer: any): Promise<any> {
    const peer = this.peers.get(remoteUserId);
    if (!peer) {
      throw new Error(`Peer ${remoteUserId} not found`);
    }

    await peer.connection.setRemoteDescription(offer);
    const answer = await peer.connection.createAnswer({});
    await peer.connection.setLocalDescription(answer);
    return answer;
  }

  public async handleAnswer(remoteUserId: string, answer: any): Promise<void> {
    const peer = this.peers.get(remoteUserId);
    if (!peer) {
      throw new Error(`Peer ${remoteUserId} not found`);
    }

    await peer.connection.setRemoteDescription(answer);
  }

  public async handleIceCandidate(remoteUserId: string, candidate: any): Promise<void> {
    const peer = this.peers.get(remoteUserId);
    if (!peer) {
      throw new Error(`Peer ${remoteUserId} not found`);
    }

    await peer.connection.addIceCandidate(candidate);
  }

  public sendMessage(message: P2PMessage, targetUserId?: string): void {
    if (targetUserId) {
      // Send to specific peer
      const peer = this.peers.get(targetUserId);
      if (peer?.dataChannel && peer.dataChannel.readyState === 'open') {
        try {
          peer.dataChannel.send(JSON.stringify(message));
        } catch (error) {
          console.error('Error sending message to peer:', error);
        }
      }
    } else {
      // Broadcast to all connected peers
      this.peers.forEach((peer) => {
        if (peer.dataChannel && peer.dataChannel.readyState === 'open') {
          try {
            peer.dataChannel.send(JSON.stringify(message));
          } catch (error) {
            console.error('Error broadcasting message:', error);
          }
        }
      });
    }
  }

  public onMessage(type: P2PMessageType, handler: (message: P2PMessage) => void): void {
    this.messageHandlers.set(type, handler);
  }

  private handleMessage(message: P2PMessage): void {
    // Update heartbeat
    const peer = this.peers.get(message.from);
    if (peer) {
      peer.lastHeartbeat = Date.now();
    }

    // Handle message by type
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message);
    }
  }

  public startHeartbeat(): void {
    setInterval(() => {
      const heartbeatMessage: P2PMessage = {
        type: P2PMessageType.HEARTBEAT,
        from: this.localUserId,
        data: { timestamp: Date.now() },
        timestamp: Date.now(),
        gameId: '',
      };
      this.sendMessage(heartbeatMessage);
      this.checkPeerHeartbeats();
    }, CONFIG.P2P_CONFIG.HEARTBEAT_INTERVAL);
  }

  private checkPeerHeartbeats(): void {
    const now = Date.now();
    const timeout = CONFIG.P2P_CONFIG.CONNECTION_TIMEOUT;

    this.peers.forEach((peer, userId) => {
      if (now - peer.lastHeartbeat > timeout) {
        console.log(`Peer ${userId} heartbeat timeout`);
        this.onPeerDisconnected(userId);
      }
    });
  }

  private onPeerConnected(userId: string): void {
    console.log(`Peer ${userId} connected`);
  }

  private onPeerDisconnected(userId: string): void {
    console.log(`Peer ${userId} disconnected`);
    const peer = this.peers.get(userId);
    if (peer) {
      peer.status = PeerStatus.DISCONNECTED;
    }
  }

  public getConnectedPeers(): string[] {
    return Array.from(this.peers.values())
      .filter(peer => peer.status === PeerStatus.CONNECTED)
      .map(peer => peer.userId);
  }

  public getPeer(userId: string): PeerConnection | undefined {
    return this.peers.get(userId);
  }

  public closeConnection(userId: string): void {
    const peer = this.peers.get(userId);
    if (peer) {
      peer.connection.close();
      this.peers.delete(userId);
    }
  }

  public closeAllConnections(): void {
    this.peers.forEach((peer) => {
      peer.connection.close();
    });
    this.peers.clear();
  }

  private sendSignalingMessage(targetUserId: string, data: any): void {
    // This would connect to your signaling server
    console.log('Signaling message to', targetUserId, data);
  }
} 