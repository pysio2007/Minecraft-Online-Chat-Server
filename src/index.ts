import express, { Request, Response, RequestHandler } from 'express';
import { WebSocketServer, WebSocket } from 'ws'; // 修改导入
import { Server } from 'http';

const app = express();
const port = 3000;

const server = app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});

const wss = new WebSocketServer({ noServer: true });

let clients: WebSocket[] = []; // 使用 WebSocket 而不是 WSWebSocket

wss.on('connection', (ws: WebSocket) => {
    console.log('New client connected');
    clients.push(ws);

    // 修复 Data 类型
    ws.on('message', (data: Buffer | ArrayBuffer | Buffer[]) => {
        try {
            const message = data.toString();
            console.log('Received WebSocket message:', message);
            
            clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(message);
                }
            });
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        clients = clients.filter(client => client !== ws);
    });

    ws.on('error', (error: Error) => {
        console.error('WebSocket error:', error);
    });
});

app.use(express.json());

// 修复 RequestHandler 类型
const chatHandler: RequestHandler = async (req, res): Promise<void> => {
    console.log('Received HTTP request:', req.body);

    try {
        const { username, message } = req.body;

        if (!username || !message) {
            console.log('Invalid request data:', req.body);
            res.status(400).json({
                error: 'Username and message are required',
                received: req.body
            });
            return;
        }

        const chatMessage = `${username}: ${message}`;
        console.log('Broadcasting message:', chatMessage);

        clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(chatMessage);
            }
        });

        res.status(200).send();
    } catch (error) {
        console.error('Error handling chat message:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

app.post('/chat', chatHandler);

server.on('upgrade', (request, socket, head) => {
    try {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    } catch (error) {
        console.error('Error during WebSocket upgrade:', error);
        socket.destroy();
    }
});

server.on('error', (error: Error) => {
    console.error('Server error:', error);
});

process.on('unhandledRejection', (error: Error) => {
    console.error('Unhandled rejection:', error);
});