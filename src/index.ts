import { Socket, Server } from 'socket.io';
import { ClientOptions, OpenAI } from 'openai';
import {
  ChatCompletionSnapshot,
  ChatCompletionStreamParams,
} from 'openai/lib/ChatCompletionStream';
import {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionMessage,
  ChatCompletionMessageParam,
  CompletionUsage,
} from 'openai/resources';
import { OpenAIError, APIUserAbortError } from 'openai/error';
export type Options = {
  verbose: boolean;
  client?: ClientOptions;
  chat: Omit<ChatCompletionStreamParams, 'messages'>;
  initMessages: ChatCompletionMessageParam[];
};

export interface ChatCompletionEvents {
  content: (contentDelta: string, contentSnapshot: string) => void;
  chunk: (chunk: ChatCompletionChunk, snapshot: ChatCompletionSnapshot) => void;
  connect: () => void;
  functionCall: (functionCall: ChatCompletionMessage.FunctionCall) => void;
  message: (message: ChatCompletionMessageParam) => void;
  chatCompletion: (completion: ChatCompletion) => void;
  finalContent: (contentSnapshot: string) => void;
  finalMessage: (message: ChatCompletionMessageParam) => void;
  finalChatCompletion: (completion: ChatCompletion) => void;
  finalFunctionCall: (functionCall: ChatCompletionMessage.FunctionCall) => void;
  functionCallResult: (content: string) => void;
  finalFunctionCallResult: (content: string) => void;
  error: (error: OpenAIError) => void;
  abort: (error: APIUserAbortError) => void;
  end: () => void;
  totalUsage: (usage: CompletionUsage) => void;
}

export type EmitEvents = {
  'new-message': (message: string) => void;
} & ChatCompletionEvents;

export type ListenEvents = {
  'new-message': (message: string) => void;
};

export type CustomSocket = Socket<ListenEvents, EmitEvents>;

export class OpenAISocket {
  /**
   * Socket clients
   */
  public clients: Map<string, CustomSocket> = new Map<string, CustomSocket>();

  /**
   * History of messages for each socket client
   */
  public messages: Map<string, ChatCompletionMessageParam[]> = new Map<
    string,
    ChatCompletionMessageParam[]
  >();

  /**
   *  OpenAI official client
   */
  public openai: OpenAI;

  /**
   * List of events to lisent for OpenAI.beta.chat.completions.stream
   */
  public static eventsToListen: (keyof ChatCompletionEvents)[] = [
    'abort',
    'chatCompletion',
    'chunk',
    'content',
    'end',
    'error',
    'finalChatCompletion',
    'finalContent',
    'finalFunctionCall',
    'finalFunctionCallResult',
    'finalMessage',
    'totalUsage',
    'message',
  ];

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
    io.on('connection', (socket: CustomSocket) => {
      this.registerClient(socket);
      this.registerEvents(socket);
    });
  }

  /**
   * Register a new socket client.
   * @param {CustomSocket} socket - The client socket object.
   * @returns {void}
   */
  registerClient(socket: CustomSocket): void {
    const { id } = socket;
    this.clients.set(id, socket);
    this.messages.set(id, []);
    this.logger(`Client connected: ${id}`);
    socket.on('disconnect', () => {
      this.clients.delete(id);
      this.messages.delete(id);
      this.logger(`Client disconnected: ${id}`);
    });
  }

  /**
   * Register listener for new-message event and push messages to the chat history
   * for a given socket, and stream the chat completions events to the client.
   * @param {CustomSocket} socket - The client socket object.
   * @returns {void}
   */
  registerEvents(socket: CustomSocket): void {
    socket.on('new-message', (message) => {
      this.pushMessageToHistory(socket.id, message);
      this.logger(`received message from ${socket.id}`);
      const chat = this.openai.beta.chat.completions.stream({
        ...this.options.chat,
        messages: [
          ...this.options.initMessages,
          ...this.getMessages(socket.id),
        ],
      });

      OpenAISocket.eventsToListen.forEach((event) => {
        chat.on(event, (arg: any) => {
          this.logger(
            `event ${event} triggered for ${
              socket.id
            } with arg: ${JSON.stringify(arg, null, 2)}`,
          );
          socket.emit(event, arg);
        });
      });
    });
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
  private pushMessageToHistory(socketId: string, message: string): void {
    if (this.messages.has(socketId)) {
      this.logger(`pushing ${message} message to ${socketId} history`);
      this.messages.get(socketId)?.push({
        role: 'user',
        content: message,
      });
    }
  }

  /**
   * Gets the chat history for a given socket ID
   * @param {string} socketId - The ID of the socket.
   * @returns {ChatCompletionMessageParam[]}
   */
  private getMessages(socketId: string): ChatCompletionMessageParam[] {
    return this.messages.get(socketId) ?? [];
  }
}
