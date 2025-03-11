# Chat Application

A real-time web-based chat platform that allows users to join rooms, exchange messages, and manage chat rooms seamlessly. This project uses **HTML**, **CSS**, **JavaScript**, and **Node.js** (with the `ws` WebSocket library) to demonstrate a full-stack chat experience.

## Table of Contents

1. [Features](#features)
2. [Technologies Used](#technologies-used)
3. [Project Structure](#project-structure)
4. [Installation and Setup](#installation-and-setup)
5. [Running the Application](#running-the-application)
6. [Usage](#usage)
7. [Room Management](#room-management)
8. [Customization](#customization)
9. [Known Issues / Future Improvements](#known-issues--future-improvements)
10. [License](#license)

## Features

- **User Join**  
  - Users pick a username and join a default or existing chat room.
- **Real-Time Messaging**  
  - Messages appear instantly for all users in the same room using WebSockets.
- **Room Creation & Editing**  
  - Users can create new chat rooms and rename existing rooms (except the default one).
- **Room Listing & Searching**  
  - A sidebar displays available rooms. Users can search for specific room names.
- **Text Formatting**  
  - Users can apply bold, italic, underline, or strike-through styling in their messages.
- **Unread Message Count**  
  - Rooms that receive new messages while you’re in a different room display an unread count.

## Technologies Used

1. **Frontend**  
   - **HTML5** and **CSS3** (with some **Bootstrap** classes) for layout and styling.  
   - **JavaScript (ES6 modules)** for client-side logic (`chat.js`, `room-management.js`, `utils.js`).
2. **Backend**  
   - **Node.js** and the **`ws`** WebSocket library (`server.js`) to manage real-time communication.
3. **Other**  
   - **Session Storage** for username and current room tracking.  
   - **Local Storage** for persisting unread counts.

## Project Structure
```cpp
.
├── node_modules/           // Node.js dependencies
├── public/                 // Front-end files served to the browser
│   ├── chat.js            // Handles messaging logic & rendering
│   ├── index.html         // Main chat interface (rooms, messages)
│   ├── room-management.js // Manages room creation, switching, searching
│   ├── style.css          // CSS styling for the main chat interface
│   ├── user-join.css      // CSS styling for the user-join page
│   ├── user-join.html     // Page where users enter their username
│   └── utils.js           // Utility functions (truncate, linkify, etc.)
├── package.json            // Project metadata & scripts
├── package-lock.json       // Auto-generated file for exact dependency versions
├── server.js               // Node.js WebSocket server
└── README.md               // Project documentation
```

## Installation and Setup

1. **Clone or Download** this repository to your local machine.

2. **Install Node.js** (if you haven’t already):
   - [Node.js Official Website](https://nodejs.org/)

3. **Install Dependencies**:
   ```bash
   cd path/to/your/project
   npm install ws
   ```
   - The above installs the ws (WebSocket) library used in server.js.

4. (Optional) If you plan to use other libraries or frameworks, ensure they’re also installed.

## Running the Application

1. Start the Node.js Server <br>
   From your project folder, run:
   ```bash
    node server.js
   ```
   This launches the WebSocket server at ws://localhost:8080.

2. Open the Client
    - Option A: Double-click user-join.html or index.html in your file explorer to open in a browser.
    - Option B: Use a local server (like Live Server in VS Code) to serve the files.

```bash
  # Example using http-server:
  npm install -g http-server
  http-server 
```
Then navigate to the address it provides (e.g., `http://127.0.0.1:8080/user-join.html`).

3. Verify the Connection
    - When you open user-join.html, you should see a field to enter a username.
    - After clicking Join, you’re redirected to index.html (the main chat interface) if the server accepts your username.

## Usage
1. Joining the Chat
    - Open `user-join.html`.
    - Enter a username (at least 3 characters, letters/numbers/underscores).
    - Click Join. If successful, you’re taken to the main chat interface.

2. Default Room
    - By default, the user is placed in the "Random Group" room.

3. Sending Messages
    - Type a message in the input area at the bottom and press Enter or click the Send icon.
    - Messages appear instantly in the chat window for all users in that room.

4. Creating a New Room
    - In the left sidebar, click Create Room.
    - Enter a name (3–20 characters, allowed: letters, numbers, spaces, `_`, `-`).
    - If the room name is valid and doesn’t already exist, it will appear in the Available Rooms list.

5. Switching Rooms
    - Click on any room in the Available Rooms list to switch.
    - The chat area clears and loads that room’s history.

6. Renaming a Room
    - Click the three-dot Menu in the top-right of the chat header.
    - Select Edit Info, enter the new room name, and click Update.

7. Text Formatting
    - The icons (bold, italic, underline, strike-through) let you style your text.
    - Click the icon, then type. Alternatively, select existing text and click the icon.

8. Unread Messages
    - If a new message arrives in a room you’re not currently viewing, an unread count will appear beside that room.

## Room Management
- Room Creation:
    - Triggered via the “Create Room” button in the sidebar.
    - The server checks if the room name is valid and unique.

- Room Renaming:
    - Only possible if the room is not the default (“Random     Group”).
    - The server updates all clients currently in that room and changes the stored history.

- Search:
    - Use the Search bar to filter room names in the sidebar.
    - If no matches are found, a “No results found” message appears.

## Customization

1. Styling
    - Modify `style.css` and `user-join.css` to change colors, layouts, or fonts.

2. Icons
    - Located in the `icons/` folder. Replace or customize them to fit your theme.

3. WebSocket Server
    - If you want to change the server port, edit `server.js`:
  ```js
  const server = new WebSocket.Server({ port: 8080 });
  ```
    - Adjust to your desired port (e.g., 3000, 5000, etc.).

4. Username & Room Validation
    - Check `server.js` for `MIN_USERNAME_LENGTH`, `MAX_USERNAME_LENGTH`, and `ROOM_NAME_REGEX`.

## Known Issues / Future Improvements

- Better Security:
    - Currently, the app does minimal validation. Consider adding user authentication or more robust checks on the server side.

- Typing Indicators:
    - Show when another user is typing.

- File or Image Sharing:
    - Extend the app to allow attachments.

- Private Rooms / Direct Messages:
    - Implement password-protected rooms or 1-to-1 direct messages.

- Persistent Data:
    - Use a database (e.g., MongoDB, PostgreSQL) instead of in-memory Maps for storing messages and rooms.


## License
This project is for educational or personal use. If you plan to distribute or modify it, please include proper attribution. You may choose to add an open-source license if desired.