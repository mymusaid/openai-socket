import { Socket } from 'socket.io';
import { ClientOptions as OpenAIClientOptions } from 'openai';
import {
  ChatCompletionSnapshot,
  ChatCompletionStream,
  ChatCompletionStreamParams,
} from 'openai/lib/ChatCompletionStream';
import {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionMessage,
  ChatCompletionMessageParam,
  CompletionUsage,
} from 'openai/resources';
import { OpenAIError } from 'openai/error';

export type Message = ChatCompletionMessageParam;

export interface Options {
  verbose: boolean;
  client?: OpenAIClientOptions;
  chat: Omit<ChatCompletionStreamParams, 'messages' | 'stream'>;
  initMessages: Message[];
}

export interface EventsMap {
  'new-message'(message: string | Message): void;
  'set-options'(options: Omit<ClientOptions, 'currentChatStream'>): void;
  abort: () => void;
}

export interface ChatCompletionEvents {
  content: (contentDelta: string, contentSnapshot: string) => void;
  chunk: (chunk: ChatCompletionChunk, snapshot: ChatCompletionSnapshot) => void;
  functionCall: (functionCall: ChatCompletionMessage.FunctionCall) => void;
  message: (message: Message) => void;
  chatCompletion: (completion: ChatCompletion) => void;
  finalContent: (contentSnapshot: string) => void;
  finalMessage: (message: Message) => void;
  finalChatCompletion: (completion: ChatCompletion) => void;
  finalFunctionCall: (functionCall: ChatCompletionMessage.FunctionCall) => void;
  functionCallResult: (content: string) => void;
  finalFunctionCallResult: (content: string) => void;
  error: (error: OpenAIError) => void;
  end: () => void;
  totalUsage: (usage: CompletionUsage) => void;
}

export interface ListenEvents extends EventsMap {}

export interface EmitEvents extends EventsMap, ChatCompletionEvents {}

export type ClientOptions = {
  chat: Options['chat'];
  initMessages: Options['initMessages'];
  currentChatStream?: ChatCompletionStream;
};

export interface Client
  extends Socket<ListenEvents, EmitEvents, {}, ClientOptions> {}
