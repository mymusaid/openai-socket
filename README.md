# OpenAI Socket

A wrapper for the OpenAI API using sockets.

[![npm version](https://img.shields.io/npm/v/@musaid.qa/openai-socket.svg)](https://www.npmjs.com/package/@musaid.qa/openai-socket)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Installation

Install the package using npm:

```bash
npm install @musaid.qa/openai-socket
```

## Usage

![Example](https://github.com/mymusaid/openai-socket/blob/main/.github/example.gif)

### Server

```typescript
import { Server } from "socket.io";
import { OpenAISocket } from "@musaid.qa/openai-socket";


const server = new Server();
const port = 2030;
const openai = new OpenAISocket(server, {
  verbose: true,
  client: {
    apiKey: process.env.OPENAI_API_KEY
  },
  chat: {
    model: 'gpt-3.5-turbo'
  },
  initMessages: [
    {
      role: 'system',
      content: 'You are a nodejs compiler'
    }
  ]
});

server.listen(port);
console.log(`Listening on port ${port}`);

```

### Client

```typescript
import { Socket, io } from "socket.io-client"
import { EmitEvents } from "@musaid.qa/openai-socket";

const client: Socket<EmitEvents> = io('http://localhost:2030');

client.on('connect', () => {

  client.on('content', (content) => {
    console.log(content)
  });

  client.on('end', () => {
    console.log('end')
  });

 client.emit('new-message', 'Hello from earth!');

});

```

For more see [basic example](/src/examples/basic/) or [Docs](https://mymusaid.github.io/openai-socket)

## License

This project is licensed under the MIT License.
