import OpenAI from 'openai';
import { Server } from 'socket.io';
import {
  Client,
  ChatCompletionEvents,
  Options,
  Message,
  ClientOptions,
  EmitEvents,
  ListenEvents,
  EventsMap,
} from './types';

class OpenAISocket {
  /**
   * Socket clients
   */
  public clients: Map<string, Client> = new Map<string, Client>();

  /**
   * History of messages for each socket client
   */
  public messages: Map<string, Message[]> = new Map<string, Message[]>();

  /**
   *  OpenAI official client
   */
  public openai: OpenAI;


  /**
   * Constructor for OpenAISocket
   * @param {Server} io - Socket.io server.
   * @param {Options} options - Options for the OpenAISocket.
   */
  constructor(
    public io: Server,
    public options: Options = {
      verbose: false,
      chat: { model: 'gpt-3.5-turbo' },
      initMessages: [
        { role: 'system', content: 'You are a helpful assistant.' },
      ],
    },
  ) {
    this.openai = new OpenAI(this.options.client);
    io.on('connection', (client: Client) => {
      const { id } = client;
      client.data.chat = this.options.chat;
      client.data.initMessages = this.options.initMessages;
      this.clients.set(id, client);
      this.messages.set(id, []);
      this.logger(`Client connected: ${id}`);
      client.on('disconnect', () => this.onDisconnect(client));
      client.on('new-message', (message) => this.onNewMessage(client, message));
      client.on('set-options', (options) => {
        if (options.chat) client.data.chat = options.chat;
        if (options.initMessages)
          client.data.initMessages = options.initMessages;
      });

      client.on('abort', () => {
        if (client.data.currentChatStream) {
          client.data.currentChatStream.controller.abort();
          client.data.currentChatStream = undefined;
        }
      });
    });
  }

  /**
   * Handles a new message received from a client.
   *
   * @param {Client} client - The client object.
   * @param {string | Message} message - The message received from the client.
   * @return {void} This function does not return anything.
   */
  onNewMessage(client: Client, message: string | Message): void {
    if (typeof message === 'object') {
      this.pushToChatHistory(client.id, message);
    } else {
      this.pushToChatHistory(client.id, {
        role: 'user',
        content: message,
      });
    }
    this.processNewMessage(client);
  }

  onDisconnect(socket: Client): void {
    const { id } = socket;
    this.logger(`Client disconnected: ${id}`);
    this.clients.delete(id);
    this.messages.delete(id);
  }

  /**
   *  Logs a message if the verbose option is set to true.
   * @param {string} message
   * @returns {void}
   */
  logger(message: string): void {
    if (this.options.verbose) {
      console.debug(`[OpenAISocket] ${message}`);
    }
  }

  /**
   * Pushes a message to the chat history for a given socket ID
   * @param {string} socketId - The ID of the socket.
   * @param {string} message - The message to push.
   * @returns {void}
   */
  private pushToChatHistory(socketId: string, message: Message): void {
    if (this.messages.has(socketId)) {
      this.messages.get(socketId)?.push(message);
    }
  }

  /**
   * Gets the chat history for a given socket ID
   * @param {string} socketId - The ID of the socket.
   * @returns {Message[]}
   */
  private getChatHistory(socketId: string): Message[] {
    return this.messages.get(socketId) ?? [];
  }

  /**
   * Process a new message from the client.
   *
   * @param {Client} client - The client object.
   * @return {void} This function does not return anything.
   */
  private processNewMessage(client: Client): void {
    const { id, data } = client;

    client.data.currentChatStream = this.openai.beta.chat.completions.stream({
      ...client.data.chat,
      messages: [...data.initMessages, ...this.getChatHistory(id)],
    });

    const streamHandlers = {
      content: (contentDelta, contentSnapshot) =>
        client.emit('content', contentDelta, contentSnapshot),
      finalContent: (contentSnapshot) =>
        client.emit('finalContent', contentSnapshot),
      chunk: (chunk, snapshot) => client.emit('chunk', chunk, snapshot),
      chatCompletion: (completion) => client.emit('chatCompletion', completion),
      finalChatCompletion: (completion) =>
        client.emit('finalChatCompletion', completion),
      message: (message) => client.emit('message', message),
      finalMessage: (message) => {
        this.pushToChatHistory(id, message);
        client.emit('finalMessage', message);
      },
      functionCall: (functionCall) => client.emit('functionCall', functionCall),
      finalFunctionCall: (finalFunctionCall) =>
        client.emit('finalFunctionCall', finalFunctionCall),
      functionCallResult: (finalFunctionCallResult) =>
        client.emit('finalFunctionCallResult', finalFunctionCallResult),
      finalFunctionCallResult: (finalFunctionCallResult) =>
        client.emit('finalFunctionCallResult', finalFunctionCallResult),
      totalUsage: (usage) => client.emit('totalUsage', usage),
      error: (error) => {
        client.emit('error', error);
        client.data.currentChatStream = undefined;
      },
      end: () => {
        client.emit('end');
        client.data.currentChatStream = undefined;
      },
    } as ChatCompletionEvents;

    Object.entries(streamHandlers).forEach(([event, handler]) => {
      client.data.currentChatStream?.on(
        event as keyof typeof streamHandlers,
        (...args: any) => {
          this.logger(
            `Event: ${event}, Args: ${JSON.stringify(args, null, 2)}`,
          );
          handler(...args);
        },
      );
    });
  }
}

export {
  OpenAISocket,
  Client,
  ChatCompletionEvents,
  Options,
  Message,
  ClientOptions,
  EmitEvents,
  ListenEvents,
  EventsMap,
};
