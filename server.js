const WebSocket = require('ws');
const server = new WebSocket.Server({ port: 8080 });

//Basic Validations
const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 20;
const ROOM_NAME_REGEX = /^[a-zA-Z0-9 _-]{3,20}$/;
const DEFAULT_ROOM = 'Random Group';


const rooms = new Map([[DEFAULT_ROOM, new Set()]]);
const clients = new Map();
const messageHistory = new Map([[DEFAULT_ROOM, []]]);

server.on('connection', (socket) => {
    if (!rooms.has(DEFAULT_ROOM)) {
        rooms.set(DEFAULT_ROOM, new Set());
        messageHistory.set(DEFAULT_ROOM, []);
    }
    rooms.get(DEFAULT_ROOM).add(socket);

    socket.on('message', (data) => {
        try {
            const parsedData = JSON.parse(data);

            switch (parsedData.type) {
                case 'join':
                    handleJoin(socket, parsedData);
                    break;
                case 'create-room':
                    handleCreateRoom(socket,parsedData.roomName);
                    break;
                case 'switch-room':
                    handleRoomSwitch(socket, parsedData.roomName);
                    break;
                case 'message':
                    handleMessage(socket, parsedData.message);
                    break;
                case 'rename-room':
                    handleRenameRoom(socket, parsedData.oldRoom, parsedData.newRoomName);
                    break;
                case 'history-request':
                    handleHistoryRequest(socket, parsedData.room);
                    break;
                default:
                  console.error('Unknown message type:', parsedData.type);
            }
        }
        catch (err) {
            console.error('Message error:', err);
        }
    });

    socket.on('close', () => handleDisconnect(socket));
});

function broadcastRoomList() {
    // Construct an array of room info, including the most recent message
    const roomList = Array.from(rooms.keys()).map(room => {
        const messages = messageHistory.get(room) || [];
        const normalMessages = messages.filter(m => m.type === 'message');
        const recentMessage = normalMessages.length > 0 ? normalMessages[normalMessages.length - 1] : null;        
        const total = normalMessages.length;
        const readCount = 0;

        return {
            room,
            recentMessage,
            msgCount: total,
            unread: total - readCount,
            timeStamp: recentMessage?.time || null
        };
    });

    server.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'room-list',
                rooms: roomList
            }));
        }
    });
}

function handleJoin(socket, data) {
   // Validate data structure
   if (!data || typeof data !== 'object' || !data.username) {
        socket.send(JSON.stringify({
            type: 'error',
            message: 'Invalid join request: username is required'
        }));
        return;
    }

    // Validate username
    const username = typeof data.username === 'string' ? data.username.trim() : null;
    if (!username || 
        username.length < MIN_USERNAME_LENGTH || 
        username.length > MAX_USERNAME_LENGTH ||
        !/^[a-zA-Z0-9_-]+$/.test(username)) {
        socket.send(JSON.stringify({
            type: 'error',
            message: `Username must be ${MIN_USERNAME_LENGTH}-${MAX_USERNAME_LENGTH} alphanumeric characters (a-z, 0-9, _, -)`
        }));
        return;
    }
    // Validate room
    const room = data.room && typeof data.room === 'string' ? 
        data.room.trim() || DEFAULT_ROOM : 
        DEFAULT_ROOM;

    // Room validation
    if (room !== DEFAULT_ROOM && !ROOM_NAME_REGEX.test(room)) {
        socket.send(JSON.stringify({
            type: 'error',
            message: 'Room name must be 3-20 characters (letters, numbers, spaces, _, -)'
        }));
        return;
    }    

    // Check for existing username in room
    if ([...clients.values()].some(u => u.room === room && u.username === username)) {
        socket.send(JSON.stringify({
            type: 'error',
            message: `"${username}" already exists`
        }));
        return;
    }

    // Register user
    clients.set(socket, { username, room });
    
    if (!rooms.has(room)){
        rooms.set(room, new Set());
        messageHistory.set(room, []);
    }
    rooms.get(room).add(socket);

    // Send room history
    socket.send(JSON.stringify({
        type: 'history',
        messages: messageHistory.get(room)
    }));

    // Store & broadcast the join info message
    const joinInfo = {
        type: 'info',
        username,
        message: 'joined the chat',
        room,
        time: new Date().toISOString() 
    };
    // Notify room
    broadcastToRoom(room,joinInfo,socket);

    broadcastRoomList();
}

function handleCreateRoom(socket,roomName) {
    const trimmed = roomName.trim();
    if (!trimmed || !ROOM_NAME_REGEX.test(trimmed)){
        socket.send(JSON.stringify({
            type: 'error',
            message: 'Room name must be 3-20 characters (letters, numbers, spaces, _, -)'
        }));
        return;
    } 

    // If room already exists, send error
    if (rooms.has(trimmed)) {
        socket.send(JSON.stringify({
            type: 'error',
            message: `${trimmed} is already exists`
        }));
        return;
      }

    if (!rooms.has(trimmed)) {
      rooms.set(roomName, new Set());
      messageHistory.set(roomName, []);
      broadcastRoomList();
    }
}

function handleRoomSwitch(socket, newRoom) {
    const user = clients.get(socket);
    if (!user || user.room === newRoom) return;

    const oldRoom = user.room;
    rooms.get(oldRoom).delete(socket);
    
    if (!rooms.has(newRoom)){
        rooms.set(newRoom, new Set());
        messageHistory.set(newRoom, []);
    } 
    rooms.get(newRoom).add(socket);
    user.room = newRoom;

    // "left" info
    const leftMsg = {
        type: 'info',
        username: user.username,
        message: 'left the chat',
        room: oldRoom,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
    };
    broadcastToRoom(oldRoom, leftMsg, socket);

    // "joined" info
    const joinedMsg = {
        type: 'info',
        username: user.username,
        message: 'joined',
        room: newRoom,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
    };
    broadcastToRoom(newRoom, joinedMsg, socket);

    // Send new room's history to the switching socket
    socket.send(JSON.stringify({
        type: 'history',
        messages: messageHistory.get(newRoom)
    }));

    broadcastRoomList();
}

function handleMessage(socket, message) {
    const user = clients.get(socket);
    if (!user) return;

    const msgData = {
        type: 'message',
        username: user.username,
        message: message.trim(),
        room: user.room,
        time:new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
    };
     // Ensure message history exists for the room
    if (!messageHistory.has(user.room)) {
        messageHistory.set(user.room, []);
    }
    messageHistory.get(user.room).push(msgData);

    broadcastToRoom(user.room, msgData);
    broadcastRoomList();
}

function handleRenameRoom(socket, oldRoom, newRoomName) {
    // Basic validation
    if (!oldRoom || !newRoomName) return; 
    // Check if the old room exists
    if (!rooms.has(oldRoom)) return; 
    // Check if the socket is in the old room
    if (oldRoom === DEFAULT_ROOM) return;
    // Check if the new room name is valid
    if (rooms.has(newRoomName)) {
        socket.send(JSON.stringify({
            type: 'error',
            message: `${newRoomName} is already exists`
        }));
        return;
    };
  
    // Move all sockets from oldRoom to newRoomName
    const oldRoomSockets = rooms.get(oldRoom);
    // Create a new set in rooms for the newRoomName
    rooms.set(newRoomName, oldRoomSockets);
    // Remove the old room from rooms map
    rooms.delete(oldRoom);
  
    //Rename messageHistory
    const oldHistory = messageHistory.get(oldRoom) || [];
    oldHistory.forEach(msg => {
        msg.room = newRoomName;
    });

    messageHistory.set(newRoomName, oldHistory);
    messageHistory.delete(oldRoom);
  
    // Update each socket's "room" in the clients map
    oldRoomSockets.forEach(clientSocket => {
      const userData = clients.get(clientSocket);
      if (userData && userData.room === oldRoom) {
        userData.room = newRoomName;
      }
    });

    const user = clients.get(socket);
    const actualUsername = user ? user.username : 'Unknown';
  
    //Optionally store an info message about the rename
    const renameInfo = {
      type: 'info',
      username : actualUsername,  // or any name
      message: `renamed room to "${newRoomName}"`,
      room: newRoomName,
      time: new Date().toISOString()
    };
    messageHistory.get(newRoomName).push(renameInfo);
  
    // 6) Broadcast to all sockets in the new room that rename happened
    oldRoomSockets.forEach(clientSocket => {
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(JSON.stringify(renameInfo));

        clientSocket.send(JSON.stringify({
            type: 'rename-room-success',
            oldRoom,
            newRoomName
        }));
      }
    });
    // update the room list
    broadcastRoomList();
}

function handleHistoryRequest(socket, roomName) {
    // Basic check
    if (!rooms.has(roomName)) return;
    const history = messageHistory.get(roomName) || [];
    socket.send(JSON.stringify({
      type: 'history',
      messages: history
    }));
}

function handleDisconnect(socket) {
    const user = clients.get(socket);
    if (user) {
       // "left" info
        const leftInfo = {
            type: 'info',
            username: user.username,
            message: 'left the chat',
            room: user.room,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
        };
        broadcastToRoom(user.room, leftInfo,socket);

        rooms.get(user.room).delete(socket);
        clients.delete(socket);
        broadcastRoomList();
    }
}

// Broadcast to a specific room
function broadcastToRoom(roomName, data, excludeSocket = null) {
    rooms.get(roomName)?.forEach(client => {
        if (client !== excludeSocket && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}


console.log('WebSocket server running on ws://localhost:8080');
