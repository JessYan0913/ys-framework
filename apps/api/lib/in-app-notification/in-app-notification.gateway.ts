import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { InAppNotification } from './interfaces/in-app-notification.interface';

@WebSocketGateway(3002, {
  cors: {
    origin: '*',
  },
  // namespace: 'notifications', // Remove namespace to use default '/'
})
export class InAppNotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(InAppNotificationGateway.name);

  @WebSocketServer()
  server: Server;

  // Map<UserId, Set<SocketId>> - A user can have multiple connections (devices/tabs)
  private readonly userConnections = new Map<string, Set<string>>();

  handleConnection(client: Socket) {
    try {
      // Assuming userId is passed in handshake query
      // In a real app, you would validate the token here
      const userId = this.extractUserId(client);

      if (!userId) {
        this.logger.warn(`Connection rejected: No userId found for socket ${client.id}`);
        client.disconnect();
        return;
      }

      this.addUserConnection(userId, client.id);
      this.logger.log(`User connected: ${userId} (Socket: ${client.id})`);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.extractUserId(client);
    if (userId) {
      this.removeUserConnection(userId, client.id);
      this.logger.log(`User disconnected: ${userId} (Socket: ${client.id})`);
    }
  }

  /**
   * Push a notification to a specific user
   */
  async push(userId: string, notification: InAppNotification): Promise<void> {
    const socketIds = this.userConnections.get(userId);

    if (!socketIds || socketIds.size === 0) {
      this.logger.debug(`User ${userId} is offline. Notification will be stored but not pushed.`);
      return;
    }

    this.logger.debug(`Pushing notification to user ${userId} (Active connections: ${socketIds.size})`);
    
    // Emit to all sockets for this user
    const payload = JSON.stringify(notification);
    socketIds.forEach((socketId) => {
      this.server.to(socketId).emit('notification', payload);
    });
  }

  /**
   * Broadcast a notification to all online users
   */
  async broadcast(notification: InAppNotification): Promise<void> {
    this.logger.log('Broadcasting notification to all online users');
    this.server.emit('notification', JSON.stringify(notification));
  }

  private addUserConnection(userId: string, socketId: string) {
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId).add(socketId);
  }

  private removeUserConnection(userId: string, socketId: string) {
    const connections = this.userConnections.get(userId);
    if (connections) {
      connections.delete(socketId);
      if (connections.size === 0) {
        this.userConnections.delete(userId);
      }
    }
  }

  private extractUserId(client: Socket): string | undefined {
    // Priority: 1. Auth Handshake (Token) -> handled by middleware/guard usually, but here we read query
    // 2. Query Param
    const userId = 
      (client.handshake.query.userId as string) || 
      (client.handshake.headers['x-user-id'] as string);
      
    return userId;
  }
}
