import { v4 as uuidv4 } from 'uuid';
import { WebRTCManager } from './WebRTCManager';
import { ServerElectionManager } from './ServerElection';
import ApiService from './api';
import DeviceInfoService from './DeviceInfoService';
import {
  Game,
  GamePlayer,
  Question,
  QuestionSet,
  GameAnswer,
  GameResults,
  AccountType,
  GameStatus,
  P2PMessage,
  P2PMessageType,
  User,
} from '../types';

export class P2PGameEngine {
  private webrtcManager: WebRTCManager;
  private serverElectionManager: ServerElectionManager;
  private currentUser: User | null = null;
  private currentGame: Game | null = null;
  private isHost: boolean = false;
  private questionSet: QuestionSet | null = null;
  private currentQuestionIndex: number = 0;
  private gameAnswers: GameAnswer[] = [];
  private playerAnswers: Map<string, GameAnswer[]> = new Map();
  private gameStartTime: number = 0;
  private questionStartTime: number = 0;

  // Event handlers
  private onGameStateChangeHandler: ((game: Game) => void) | null = null;
  private onQuestionReceivedHandler: ((question: Question, timeLeft: number) => void) | null = null;
  private onScoreUpdateHandler: ((scores: { userId: string; score: number }[]) => void) | null = null;
  private onGameCompleteHandler: ((results: GameResults) => void) | null = null;

  constructor(user: User) {
    this.currentUser = user;
    this.webrtcManager = new WebRTCManager(user.id);
    this.serverElectionManager = new ServerElectionManager(
      this.webrtcManager,
      user.id,
      user.accountType
    );

    this.setupMessageHandlers();
  }

  private setupMessageHandlers(): void {
    this.webrtcManager.onMessage(P2PMessageType.PEER_JOIN, this.handlePeerJoin.bind(this));
    this.webrtcManager.onMessage(P2PMessageType.PEER_LEAVE, this.handlePeerLeave.bind(this));
    this.webrtcManager.onMessage(P2PMessageType.GAME_START, this.handleGameStart.bind(this));
    this.webrtcManager.onMessage(P2PMessageType.QUESTION_DISTRIBUTION, this.handleQuestionDistribution.bind(this));
    this.webrtcManager.onMessage(P2PMessageType.ANSWER_SUBMISSION, this.handleAnswerSubmission.bind(this));
    this.webrtcManager.onMessage(P2PMessageType.SCORE_UPDATE, this.handleScoreUpdate.bind(this));
    this.webrtcManager.onMessage(P2PMessageType.GAME_END, this.handleGameEnd.bind(this));
  }

  public async createGame(gameConfig: {
    name: string;
    questionSetId: string;
    maxPlayers?: number;
    timePerQuestion?: number;
    isPrivate?: boolean;
    password?: string;
  }): Promise<Game> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    if (!this.serverElectionManager.canHost()) {
      throw new Error('Account type cannot host games. Premium required.');
    }

    const game = await ApiService.createGame({
      hostId: this.currentUser.id,
      name: gameConfig.name,
      maxPlayers: gameConfig.maxPlayers || 8,
      timePerQuestion: gameConfig.timePerQuestion || 15,
      isPrivate: gameConfig.isPrivate || false,
      status: GameStatus.WAITING,
    });

    this.questionSet = await ApiService.getQuestionSet(gameConfig.questionSetId);
    this.currentGame = game;
    this.isHost = true;
    this.serverElectionManager.setHost(true);
    this.webrtcManager.setHost(true);

    const deviceInfo = await DeviceInfoService.getDeviceInfo();
    const selfPlayer: GamePlayer = {
      id: uuidv4(),
      userId: this.currentUser.id,
      username: this.currentUser.username,
      accountType: this.currentUser.accountType,
      deviceId: deviceInfo.id,
      batteryLevel: deviceInfo.batteryLevel,
      connectionQuality: deviceInfo.connectionQuality,
      isHost: true,
      isReady: true,
      score: 0,
      joinedAt: new Date().toISOString(),
    };

    this.currentGame.players = [selfPlayer];
    this.webrtcManager.startHeartbeat();
    this.emitGameStateChange();
    return this.currentGame;
  }

  public async joinGame(gameId: string, password?: string): Promise<Game> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    const game = await ApiService.joinGame(gameId, password);
    this.currentGame = game;
    this.isHost = false;

    await this.connectToPeers();
    
    const deviceInfo = await DeviceInfoService.getDeviceInfo();
    const joinMessage: P2PMessage = {
      type: P2PMessageType.PEER_JOIN,
      from: this.currentUser.id,
      data: {
        player: {
          id: uuidv4(),
          userId: this.currentUser.id,
          username: this.currentUser.username,
          accountType: this.currentUser.accountType,
          deviceId: deviceInfo.id,
          batteryLevel: deviceInfo.batteryLevel,
          connectionQuality: deviceInfo.connectionQuality,
          isHost: false,
          isReady: false,
          score: 0,
          joinedAt: new Date().toISOString(),
        }
      },
      timestamp: Date.now(),
      gameId: this.currentGame.id,
    };

    this.webrtcManager.sendMessage(joinMessage);
    this.webrtcManager.startHeartbeat();
    return this.currentGame;
  }

  public async startGame(): Promise<void> {
    if (!this.isHost || !this.currentGame || !this.questionSet) {
      throw new Error('Cannot start game: not host or missing data');
    }

    if (this.currentGame.players.length < 2) {
      throw new Error('Need at least 2 players to start game');
    }

    this.currentGame.status = GameStatus.IN_PROGRESS;
    this.currentGame.startedAt = new Date().toISOString();
    this.gameStartTime = Date.now();
    this.currentQuestionIndex = 0;

    await ApiService.updateGameStatus(this.currentGame.id, GameStatus.IN_PROGRESS);

    const startMessage: P2PMessage = {
      type: P2PMessageType.GAME_START,
      from: this.currentUser!.id,
      data: {
        gameStartTime: this.gameStartTime,
        totalQuestions: Math.min(this.currentGame.questionCount, this.questionSet.questions.length),
      },
      timestamp: Date.now(),
      gameId: this.currentGame.id,
    };

    this.webrtcManager.sendMessage(startMessage);
    this.emitGameStateChange();

    setTimeout(() => {
      this.distributeNextQuestion();
    }, 2000);
  }

  public submitAnswer(questionId: string, selectedOption: number): void {
    if (!this.currentUser || !this.currentGame) {
      return;
    }

    const timeSpent = Date.now() - this.questionStartTime;
    const answer: GameAnswer = {
      questionId,
      selectedOption,
      timeSpent,
      timestamp: Date.now(),
    };

    this.gameAnswers.push(answer);

    if (!this.isHost) {
      const answerMessage: P2PMessage = {
        type: P2PMessageType.ANSWER_SUBMISSION,
        from: this.currentUser.id,
        data: { answer },
        timestamp: Date.now(),
        gameId: this.currentGame.id,
      };

      this.webrtcManager.sendMessage(answerMessage);
    } else {
      this.handleAnswerSubmission({
        type: P2PMessageType.ANSWER_SUBMISSION,
        from: this.currentUser.id,
        data: { answer },
        timestamp: Date.now(),
        gameId: this.currentGame.id,
      });
    }
  }

  // Message handlers
  private handlePeerJoin(message: P2PMessage): void {
    if (!this.currentGame) return;
    const { player } = message.data;
    this.currentGame.players.push(player);
    this.emitGameStateChange();
  }

  private handlePeerLeave(message: P2PMessage): void {
    if (!this.currentGame) return;
    this.currentGame.players = this.currentGame.players.filter(p => p.userId !== message.from);
    
    if (message.from === this.currentGame.hostId) {
      this.serverElectionManager.triggerEmergencyPromotion();
    }
    this.emitGameStateChange();
  }

  private handleGameStart(message: P2PMessage): void {
    if (!this.currentGame) return;
    const { gameStartTime } = message.data;
    this.gameStartTime = gameStartTime;
    this.currentGame.status = GameStatus.IN_PROGRESS;
    this.emitGameStateChange();
  }

  private handleQuestionDistribution(message: P2PMessage): void {
    const { question, questionIndex, timeLimit } = message.data;
    this.currentQuestionIndex = questionIndex;
    this.questionStartTime = Date.now();

    if (this.currentGame) {
      this.currentGame.currentQuestion = question;
      this.currentGame.questionIndex = questionIndex;
    }

    this.onQuestionReceivedHandler?.(question, timeLimit);
  }

  private handleAnswerSubmission(message: P2PMessage): void {
    if (!this.isHost) return;
    const { answer } = message.data;
    const playerId = message.from;

    const playerAnswers = this.playerAnswers.get(playerId) || [];
    playerAnswers.push(answer);
    this.playerAnswers.set(playerId, playerAnswers);

    const connectedPlayers = this.webrtcManager.getConnectedPeers().length + 1;
    const answeredPlayers = this.playerAnswers.size + (this.gameAnswers.length > this.currentQuestionIndex ? 1 : 0);

    if (answeredPlayers >= connectedPlayers) {
      this.calculateAndBroadcastScores();
      setTimeout(() => {
        this.distributeNextQuestion();
      }, 3000);
    }
  }

  private handleScoreUpdate(message: P2PMessage): void {
    const { scores } = message.data;
    this.onScoreUpdateHandler?.(scores);
  }

  private handleGameEnd(message: P2PMessage): void {
    const { results } = message.data;
    if (this.currentGame) {
      this.currentGame.status = GameStatus.COMPLETED;
      this.currentGame.completedAt = new Date().toISOString();
    }
    this.onGameCompleteHandler?.(results);
    this.emitGameStateChange();
  }

  private async connectToPeers(): Promise<void> {
    console.log('Connecting to existing peers...');
  }

  private distributeNextQuestion(): void {
    if (!this.isHost || !this.questionSet || !this.currentGame) {
      return;
    }

    if (this.currentQuestionIndex >= Math.min(this.currentGame.questionCount, this.questionSet.questions.length)) {
      this.finishGame();
      return;
    }

    const question = this.questionSet.questions[this.currentQuestionIndex];
    const timeLimit = this.currentGame.timePerQuestion * 1000;

    const questionMessage: P2PMessage = {
      type: P2PMessageType.QUESTION_DISTRIBUTION,
      from: this.currentUser!.id,
      data: {
        question,
        questionIndex: this.currentQuestionIndex,
        timeLimit,
      },
      timestamp: Date.now(),
      gameId: this.currentGame.id,
    };

    this.webrtcManager.sendMessage(questionMessage);
    this.handleQuestionDistribution(questionMessage);

    setTimeout(() => {
      if (this.isHost) {
        this.calculateAndBroadcastScores();
        setTimeout(() => {
          this.currentQuestionIndex++;
          this.distributeNextQuestion();
        }, 3000);
      }
    }, timeLimit);
  }

  private calculateAndBroadcastScores(): void {
    if (!this.questionSet || !this.currentGame) {
      return;
    }

    const currentQuestion = this.questionSet.questions[this.currentQuestionIndex];
    const scores: { userId: string; score: number }[] = [];

    if (this.gameAnswers.length > this.currentQuestionIndex) {
      const hostAnswer = this.gameAnswers[this.currentQuestionIndex];
      const hostScore = this.calculateScore(hostAnswer, currentQuestion);
      scores.push({ userId: this.currentUser!.id, score: hostScore });
    }

    this.playerAnswers.forEach((answers, playerId) => {
      if (answers.length > this.currentQuestionIndex) {
        const playerAnswer = answers[this.currentQuestionIndex];
        const playerScore = this.calculateScore(playerAnswer, currentQuestion);
        scores.push({ userId: playerId, score: playerScore });
      }
    });

    scores.forEach(({ userId, score }) => {
      const player = this.currentGame!.players.find(p => p.userId === userId);
      if (player) {
        player.score += score;
      }
    });

    const scoreMessage: P2PMessage = {
      type: P2PMessageType.SCORE_UPDATE,
      from: this.currentUser!.id,
      data: { scores },
      timestamp: Date.now(),
      gameId: this.currentGame.id,
    };

    this.webrtcManager.sendMessage(scoreMessage);
    this.onScoreUpdateHandler?.(scores);
  }

  private calculateScore(answer: GameAnswer, question: Question): number {
    if (answer.selectedOption !== question.correctAnswer) {
      return 0;
    }

    let score = 100;
    const timeBonus = Math.max(0, 50 - (answer.timeSpent / 1000));
    score += Math.round(timeBonus);

    return score;
  }

  private async finishGame(): Promise<void> {
    if (!this.currentGame || !this.questionSet) {
      return;
    }

    const sortedPlayers = [...this.currentGame.players]
      .sort((a, b) => b.score - a.score)
      .map((player, index) => ({
        userId: player.userId,
        username: player.username,
        score: player.score,
        position: index + 1,
        correctAnswers: this.countCorrectAnswers(player.userId),
        averageTime: this.calculateAverageTime(player.userId),
      }));

    const results: GameResults = {
      gameId: this.currentGame.id,
      finalScores: sortedPlayers,
      questions: this.questionSet.questions.slice(0, this.currentQuestionIndex),
      totalDuration: Date.now() - this.gameStartTime,
    };

    this.currentGame.status = GameStatus.COMPLETED;
    this.currentGame.completedAt = new Date().toISOString();
    await ApiService.updateGameStatus(this.currentGame.id, GameStatus.COMPLETED);
    await ApiService.submitGameResults(this.currentGame.id, results);

    const endMessage: P2PMessage = {
      type: P2PMessageType.GAME_END,
      from: this.currentUser!.id,
      data: { results },
      timestamp: Date.now(),
      gameId: this.currentGame.id,
    };

    this.webrtcManager.sendMessage(endMessage);
    this.onGameCompleteHandler?.(results);
    this.emitGameStateChange();
  }

  private countCorrectAnswers(userId: string): number {
    if (!this.questionSet) return 0;

    let correct = 0;
    const answers = userId === this.currentUser?.id 
      ? this.gameAnswers 
      : this.playerAnswers.get(userId) || [];

    answers.forEach((answer, index) => {
      if (index < this.questionSet!.questions.length) {
        const question = this.questionSet!.questions[index];
        if (answer.selectedOption === question.correctAnswer) {
          correct++;
        }
      }
    });

    return correct;
  }

  private calculateAverageTime(userId: string): number {
    const answers = userId === this.currentUser?.id 
      ? this.gameAnswers 
      : this.playerAnswers.get(userId) || [];

    if (answers.length === 0) return 0;

    const totalTime = answers.reduce((sum, answer) => sum + answer.timeSpent, 0);
    return Math.round(totalTime / answers.length);
  }

  private emitGameStateChange(): void {
    if (this.currentGame) {
      this.onGameStateChangeHandler?.(this.currentGame);
    }
  }

  // Public Event Listeners
  public onGameStateChange(handler: (game: Game) => void): void {
    this.onGameStateChangeHandler = handler;
  }

  public onQuestionReceived(handler: (question: Question, timeLeft: number) => void): void {
    this.onQuestionReceivedHandler = handler;
  }

  public onScoreUpdate(handler: (scores: { userId: string; score: number }[]) => void): void {
    this.onScoreUpdateHandler = handler;
  }

  public onGameComplete(handler: (results: GameResults) => void): void {
    this.onGameCompleteHandler = handler;
  }

  // Getters
  public getCurrentGame(): Game | null {
    return this.currentGame;
  }

  public isCurrentHost(): boolean {
    return this.isHost;
  }

  public canHost(): boolean {
    return this.serverElectionManager.canHost();
  }
} 