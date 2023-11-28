import { io } from 'socket.io-client';
import readline from 'node:readline';

const client= io('http://localhost:2030');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
console.clear();
rl.setPrompt('\x1b[33m OPENAI-STREAM > \x1b[0m ');
rl.prompt();
client.on('connect', () => {
  client.on('content', (content) => {
    process.stdout.write(content);
  });

  client.on('end', () => {
    process.stdout.write('\n');
    rl.prompt();
  });

  rl.on('line', (line) => {
    if (line === 'exit') {
      client.disconnect();
      rl.close();
      process.exit(0);
    }
    client.emit('new-message', line);
  });
});
