import { Server } from 'socket.io';
import {OpenAISocket} from '@musaid.qa/openai-socket';

const server = new Server();
const port = 2030;
const openai = new OpenAISocket(server, {
  verbose: true,
  client: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  chat: {
    model: 'gpt-3.5-turbo',
  },
  initMessages: [
    {
      role: 'system',
      content: 'You are a nodejs compiler',
    },
  ],
});

server.listen(port);
console.log(`Listening on port ${port}`);
