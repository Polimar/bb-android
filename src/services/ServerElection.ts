import { AccountType, ServerElectionCandidate, P2PMessage, P2PMessageType } from '../types';
import { WebRTCManager } from './WebRTCManager';

// Mock DeviceInfoService per risolvere l'errore di import
const DeviceInfoService = {
  async getDeviceInfo() {
    return {
      id: Math.random().toString(36).substr(2, 9),
      platform: 'android' as const,
      version: 'unknown',
      model: 'unknown',
      batteryLevel: 75,
      networkType: 'wifi',
      connectionQuality: 80,
    };
  },
  async getBatteryLevel() {
    return 75;
  }
};

export class ServerElectionManager {
  private webrtcManager: WebRTCManager;
  private currentUserId: string;
  private currentAccountType: AccountType;
  private isHost: boolean = false;
  private isElectionInProgress: boolean = false;
  private electionVotes: Map<string, string> = new Map(); // voter -> candidate
  private electionTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private candidates: Map<string, ServerElectionCandidate> = new Map();

  constructor(webrtcManager: WebRTCManager, userId: string, accountType: AccountType) {
    this.webrtcManager = webrtcManager;
    this.currentUserId = userId;
    this.currentAccountType = accountType;
    this.setupMessageHandlers();
  }

  private setupMessageHandlers(): void {
    this.webrtcManager.onMessage(P2PMessageType.ELECTION_START, this.handleElectionStart.bind(this));
    this.webrtcManager.onMessage(P2PMessageType.ELECTION_VOTE, this.handleElectionVote.bind(this));
    this.webrtcManager.onMessage(P2PMessageType.NEW_HOST, this.handleNewHost.bind(this));
    this.webrtcManager.onMessage(P2PMessageType.EMERGENCY_PROMOTION, this.handleEmergencyPromotion.bind(this));
  }

  public async startElection(reason: 'host_disconnect' | 'manual' = 'manual'): Promise<void> {
    if (this.isElectionInProgress) {
      console.log('Election already in progress');
      return;
    }

    console.log(`Starting server election (reason: ${reason})`);
    this.isElectionInProgress = true;
    this.electionVotes.clear();
    this.candidates.clear();

    // Add self as candidate
    await this.addCandidate(this.currentUserId, this.currentAccountType);

    // Broadcast election start
    const electionMessage: P2PMessage = {
      type: P2PMessageType.ELECTION_START,
      from: this.currentUserId,
      data: { reason, timestamp: Date.now() },
      timestamp: Date.now(),
      gameId: '',
    };

    this.webrtcManager.sendMessage(electionMessage);

    // Set election timeout
    this.electionTimeoutId = setTimeout(() => {
      this.finishElection();
    }, 10000); // 10 seconds timeout
  }

  private async addCandidate(userId: string, accountType: AccountType): Promise<void> {
    try {
      const deviceInfo = await DeviceInfoService.getDeviceInfo();
      
      const candidate: ServerElectionCandidate = {
        userId,
        accountType,
        batteryLevel: deviceInfo.batteryLevel,
        connectionQuality: deviceInfo.connectionQuality,
        deviceId: deviceInfo.id,
        priority: this.calculatePriority(accountType, deviceInfo.batteryLevel, deviceInfo.connectionQuality),
      };

      this.candidates.set(userId, candidate);
    } catch (error) {
      console.error('Error adding candidate:', error);
      
      // Fallback candidate with default values
      const candidate: ServerElectionCandidate = {
        userId,
        accountType,
        batteryLevel: 50,
        connectionQuality: 50,
        deviceId: userId,
        priority: this.calculatePriority(accountType, 50, 50),
      };

      this.candidates.set(userId, candidate);
    }
  }

  private calculatePriority(accountType: AccountType, batteryLevel: number, connectionQuality: number): number {
    let priority = 0;

    // Account type priority (most important)
    switch (accountType) {
      case AccountType.ADMIN:
        priority += 1000;
        break;
      case AccountType.PREMIUM:
        priority += 500;
        break;
      case AccountType.FREE:
        priority += 100;
        break;
    }

    // Battery level (0-100)
    priority += batteryLevel;

    // Connection quality (0-100)
    priority += connectionQuality;

    return priority;
  }

  private handleElectionStart(message: P2PMessage): void {
    if (this.isElectionInProgress) {
      return; // Already participating in election
    }

    console.log('Received election start from', message.from);
    this.isElectionInProgress = true;
    this.electionVotes.clear();
    this.candidates.clear();

    // Add self as candidate
    this.addCandidate(this.currentUserId, this.currentAccountType);

    // Vote for best candidate (could be self)
    setTimeout(() => {
      this.castVote();
    }, 1000); // Small delay to collect candidates
  }

  private async castVote(): Promise<void> {
    // Get all candidates and select best one
    const bestCandidate = this.selectBestCandidate();
    
    if (!bestCandidate) {
      console.log('No candidates available, voting for self');
      this.electionVotes.set(this.currentUserId, this.currentUserId);
      return;
    }

    console.log(`Voting for candidate: ${bestCandidate.userId}`);
    this.electionVotes.set(this.currentUserId, bestCandidate.userId);

    try {
      // Broadcast vote
      const batteryLevel = await DeviceInfoService.getBatteryLevel();
      const voteMessage: P2PMessage = {
        type: P2PMessageType.ELECTION_VOTE,
        from: this.currentUserId,
        data: { 
          candidateId: bestCandidate.userId,
          voterInfo: {
            accountType: this.currentAccountType,
            batteryLevel,
          }
        },
        timestamp: Date.now(),
        gameId: '',
      };

      this.webrtcManager.sendMessage(voteMessage);
    } catch (error) {
      console.error('Error casting vote:', error);
    }
  }

  private selectBestCandidate(): ServerElectionCandidate | null {
    if (this.candidates.size === 0) {
      return null;
    }

    // Sort candidates by priority (highest first)
    const sortedCandidates = Array.from(this.candidates.values())
      .sort((a, b) => b.priority - a.priority);

    // In case of tie, use deterministic selection (alphabetical by userId)
    const topPriority = sortedCandidates[0].priority;
    const topCandidates = sortedCandidates.filter(c => c.priority === topPriority);
    
    if (topCandidates.length > 1) {
      return topCandidates.sort((a, b) => a.userId.localeCompare(b.userId))[0];
    }

    return topCandidates[0];
  }

  private handleElectionVote(message: P2PMessage): void {
    const { candidateId, voterInfo } = message.data;
    
    console.log(`Received vote from ${message.from} for ${candidateId}`);
    this.electionVotes.set(message.from, candidateId);

    // Add voter as candidate if not already present
    if (!this.candidates.has(message.from)) {
      const candidate: ServerElectionCandidate = {
        userId: message.from,
        accountType: voterInfo.accountType,
        batteryLevel: voterInfo.batteryLevel,
        connectionQuality: 80, // Default value
        deviceId: message.from,
        priority: this.calculatePriority(voterInfo.accountType, voterInfo.batteryLevel, 80),
      };
      this.candidates.set(message.from, candidate);
    }
  }

  private finishElection(): void {
    if (!this.isElectionInProgress) {
      return;
    }

    console.log('Finishing election...');
    
    if (this.electionTimeoutId) {
      clearTimeout(this.electionTimeoutId);
      this.electionTimeoutId = null;
    }

    // Count votes
    const voteCounts: Map<string, number> = new Map();
    this.electionVotes.forEach((candidateId) => {
      const currentCount = voteCounts.get(candidateId) || 0;
      voteCounts.set(candidateId, currentCount + 1);
    });

    // Find winner
    let winner: string | null = null;
    let maxVotes = 0;

    voteCounts.forEach((votes, candidateId) => {
      if (votes > maxVotes) {
        maxVotes = votes;
        winner = candidateId;
      } else if (votes === maxVotes && winner) {
        // Tie-breaker: alphabetical order
        winner = candidateId.localeCompare(winner) < 0 ? candidateId : winner;
      }
    });

    if (!winner) {
      // No votes, select best candidate deterministically
      const bestCandidate = this.selectBestCandidate();
      winner = bestCandidate?.userId || this.currentUserId;
    }

    console.log(`Election winner: ${winner} with ${maxVotes} votes`);
    
    // Broadcast new host
    const newHostMessage: P2PMessage = {
      type: P2PMessageType.NEW_HOST,
      from: this.currentUserId,
      data: { newHostId: winner, voteCount: maxVotes },
      timestamp: Date.now(),
      gameId: '',
    };

    this.webrtcManager.sendMessage(newHostMessage);
    this.handleNewHost(newHostMessage);
  }

  private handleNewHost(message: P2PMessage): void {
    const { newHostId } = message.data;
    
    console.log(`New host selected: ${newHostId}`);
    
    this.isHost = newHostId === this.currentUserId;
    this.webrtcManager.setHost(this.isHost);
    this.isElectionInProgress = false;

    if (this.isHost) {
      console.log('I am the new host!');
      this.onBecomeHost();
    }

    // Emit event for UI update
    this.onHostChanged(newHostId);
  }

  private handleEmergencyPromotion(message: P2PMessage): void {
    console.log('Emergency promotion activated!');
    
    // Emergency mode: FREE users can become hosts
    if (this.currentAccountType === AccountType.FREE) {
      console.log('Emergency mode: FREE user can host');
      this.startElection('host_disconnect');
    }
  }

  public triggerEmergencyPromotion(): void {
    const emergencyMessage: P2PMessage = {
      type: P2PMessageType.EMERGENCY_PROMOTION,
      from: this.currentUserId,
      data: { reason: 'host_disconnect', timestamp: Date.now() },
      timestamp: Date.now(),
      gameId: '',
    };

    this.webrtcManager.sendMessage(emergencyMessage);
    this.handleEmergencyPromotion(emergencyMessage);
  }

  public canHost(): boolean {
    return this.currentAccountType === AccountType.ADMIN || 
           this.currentAccountType === AccountType.PREMIUM;
  }

  public canEmergencyHost(): boolean {
    // In emergency mode, even FREE users can host
    return true;
  }

  public setHost(isHost: boolean): void {
    this.isHost = isHost;
    this.webrtcManager.setHost(isHost);
  }

  public isCurrentHost(): boolean {
    return this.isHost;
  }

  // Event handlers (to be implemented by game engine)
  private onBecomeHost(): void {
    console.log('Became host - taking over game management');
    // Game engine should handle host responsibilities
  }

  private onHostChanged(newHostId: string): void {
    console.log(`Host changed to: ${newHostId}`);
    // UI should update to show new host
  }

  public updateAccountType(accountType: AccountType): void {
    this.currentAccountType = accountType;
  }
} 