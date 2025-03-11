// chat.js
import { linkify } from './utils.js';
import { updateRoomList} from './room-management.js';

// DOM Elements
const msgViewSection = document.querySelector('.msg-view-section');
const roomOptionsButton = document.querySelector('#room-options-icon');
const chatRoomOptions = document.querySelector('.chat-room-options');
const sendButton = document.querySelector('.send-msg-btn');
const messageInputField = document.querySelector('#message-input');
const formatButtons = document.querySelectorAll('.icons');
const chatRoomName = document.querySelector('.chat-room-name');
const firstLetterElem = document.querySelector('.username-initial');
const userNameElem = document.querySelector('.profile-username');


let currentRoom = 'Random Group'; // Default room

const storedRoom = sessionStorage.getItem('currentRoom');
if (storedRoom) {
  currentRoom = storedRoom;
  chatRoomName.textContent = currentRoom;
}

let lastReadCount = JSON.parse(localStorage.getItem('lastReadCount')) || {};

function saveLastReadCount() {
  localStorage.setItem('lastReadCount', JSON.stringify(lastReadCount));
}

// Initialize lastReadCount on page load

const normalMessageCountMap = {};

const socket = new WebSocket('ws://localhost:8080');

// WebSocket Setup
socket.addEventListener('open', () => {
  const username = sessionStorage.getItem('username');
  if (!username) {
    console.error("No username in sessionStorage!");
    return;
  }

  socket.send(JSON.stringify({
      type: 'join',
      username,
      room: currentRoom
  }));
  
  chatRoomName.textContent = currentRoom;
});

socket.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  const currentUsername = sessionStorage.getItem('username');
  
  switch(data.type) {
    case 'info':
      if (data.room === currentRoom) {
        // If you are the one who did it, show "You renamed room to..."
        if (data.message.startsWith('renamed room to')){
          if(data.username === currentUsername){
            const renamedMsg = {
              ...data,
              username: 'You'
            };
            renderMessage(renamedMsg, 'info');
          }
          else{
            renderMessage(data, 'info');
          }
        }
        // If it's some other 'info' (like joined or left), just show it
        else {
          if (data.username !== currentUsername) {
            renderMessage(data, 'info');
          }          
        }
      }
      break;
        
    case 'message':
       
        if (!lastReadCount[data.room]) {
            lastReadCount[data.room] = 0; // Ensure lastReadCount is initialized
          }

        if (data.room === currentRoom) {
            // Compare the sender's username to the current user's username
            const style = (data.username === currentUsername) ? 'sent' : 'received';
            renderMessage(data, style);
        }
      break;
    
    case 'history':
      msgViewSection.innerHTML = '';
      data.messages.forEach(msg => {
        if (msg.type === 'info') {
          if (msg.room === currentRoom) {
            if (msg.message.startsWith('renamed room to')) {
              if (msg.username === currentUsername) {
                const renameMsg = {
                  ...msg,
                  username: 'You'
                };
                renderMessage(renameMsg, 'info');
              }
              else {
                renderMessage(msg, 'info');
              }
            }
            else {
              if ( msg.username !== currentUsername) { 
                renderMessage(msg, 'info');
              }
            }
          }
        }
        else if (msg.type === 'message') {
          if(msg.room === currentRoom){
            const style = (msg.username === currentUsername) ? 'sent' : 'received';
            renderMessage(msg, style);
          }
        }
      });
      break;  
    
    case 'room-list':
      // Set lastReadCount for currentRoom to total
      data.rooms.forEach(r => {
        if (r.room === currentRoom) {
          lastReadCount[r.room] = r.msgCount; 
          saveLastReadCount();
        }
      });
      // Recompute unread counts => "unread = total - lastReadCount[room]"
      const roomsDataWithUnread = data.rooms.map(r => {
        const total = r.msgCount;
        normalMessageCountMap[r.room] = total;
        const readCount = lastReadCount[r.room] || 0;
        const unread = Math.max(0, total - readCount);
        return {
          ...r,
          unread
        };
      });
      updateRoomList({
        roomsData: roomsDataWithUnread,
        currentRoom,
        socket
      });
      break;
    
    case 'rename-room-success':
      if (data.oldRoom === currentRoom) {
        currentRoom = data.newRoomName;
        document.querySelector('.chat-room-name').textContent = currentRoom;
        sessionStorage.setItem('currentRoom', data.newRoomName);

        msgViewSection.innerHTML = '';
        socket.send(JSON.stringify({
          type: 'history-request',
          room: data.newRoomName
        }));
      }
      break;
    
    case 'error':
      console.error("Server error:", data.message);
      break;

    default:
      // Unknown message type
      console.log("Unknown data type:", data);
      break;
  }
});

function userProfile() {
  //Get the username from sessionStorage  
  const username = sessionStorage.getItem('username');
  //Set the fisrt letter of the username in uppercase
  firstLetterElem.textContent = username.charAt(0).toUpperCase();
  //Set the username in the user profile
  userNameElem.textContent = username;  
}

// Render chat messages dynamically
function renderMessage(data, type) {
  const messageDiv = document.createElement('div');
  const time = data.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  let cleanMessage = (data.message || '').replace(/&nbsp;/g, ' ');

  if (type === 'received') {
      messageDiv.className = 'received-msg';
      messageDiv.style.display = 'flex';
      messageDiv.innerHTML = `
          <div class="receiver-pic">
              <img src="./icons/user-icon.svg" alt="User icon">
          </div>
          <div class="message received-message-card">
              <div class="username">${data.username}</div>
              <p>${linkify(cleanMessage,'received')}</p>
              <div class="time">${time}</div>
          </div>`;
  } 
  else if (type === 'info') {
      messageDiv.className = 'joined-msg';
      messageDiv.textContent = `${data.username} ${data.message}`;
  }
  else if (type === 'sent') {
      messageDiv.className = 'message sent-msg';
      messageDiv.style.display = 'block';
      messageDiv.innerHTML = `
          <p>${linkify(data.message,'sent')}</p>
          <div class="message-meta">
              <span class="time">${time}</span>
          </div>`;
  }

  msgViewSection.appendChild(messageDiv);
  msgViewSection.scrollTop = msgViewSection.scrollHeight;
}

// Send a message to the server
function sendMessage() {
  let message = messageInputField.innerHTML.trim();
  if (!message || socket.readyState !== WebSocket.OPEN) return;

  //Replace &nbsp; with a normal space
  message = message.replace(/&nbsp;/g, ' ');

  // Retrieve the current username from sessionStorage
  const username = sessionStorage.getItem('username');
  
  socket.send(JSON.stringify({
      type: 'message',
      room: currentRoom,
      message,
      username
  }));
  
  messageInputField.innerHTML = '';
}

//Event Listeners
sendButton.addEventListener('click', sendMessage);

// Adding Enter Button Add event listener for the send button
messageInputField.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
  }
});

//Display chat room options
function showRoomoptions() {
  roomOptionsButton.addEventListener('click', () => {
    chatRoomOptions.style.display = chatRoomOptions.style.display === 'block' ? 'none' : 'block';
  });
};

// Hide the Create Room option when clicking anywhere outside
document.addEventListener("click", (event) => {
  // Check if the click target is not the options icon or the dropdown
  if (
    chatRoomOptions.style.display === "block" &&
    !chatRoomOptions.contains(event.target) &&
    event.target !== roomOptionsButton
  ) {
    chatRoomOptions.style.display = "none";
  }
});

// Format messages (bold, italic, etc.)
function applyFormat(format) {
  document.execCommand(format, false, null);
}

// Attach event listeners
function setupChatEvents() {
  formatButtons.forEach(button => {
    button.addEventListener('click', () => {
      const format = button.getAttribute('data-format');
      applyFormat(format);
      button.classList.toggle("active");
    });
  });
}

 //Initialize Tooltips
 const tooltipTriggerList = [].slice.call(
  document.querySelectorAll('[data-bs-toggle="tooltip"]')
);
tooltipTriggerList.map(function (tooltipTriggerEl) {
  return new bootstrap.Tooltip(tooltipTriggerEl);
});

// Initialize chat functionality
document.addEventListener('DOMContentLoaded', () => {
  chatRoomName.textContent = currentRoom;
  showRoomoptions();
  setupChatEvents();
  userProfile();
});

export function getCurrentRoom() {
  return currentRoom;
}
export function setCurrentRoom(room) {
  currentRoom = room;
  chatRoomName.textContent = room;
}

// Optional: If you want to handle "create-room" from chat.js:
export function createNewRoom(roomName) {
  if (!roomName) return;
  socket.send(JSON.stringify({
    type: 'create-room',
    roomName: roomName.trim()
  }));
}

//function to switch rooms & update unread counts
export function switchRoom(newRoom) {
  if (newRoom !== currentRoom) {
    // Checking the current room as fully read
    const oldRoom =currentRoom; 
    const oldTotal = normalMessageCountMap[oldRoom] || 0;
    lastReadCount[oldRoom] = oldTotal;
    saveLastReadCount();

    currentRoom = newRoom;
    sessionStorage.setItem('currentRoom', currentRoom);
    chatRoomName.textContent = newRoom;
    msgViewSection.innerHTML = '';

    socket.send(JSON.stringify({
      type: 'switch-room',
      roomName: newRoom
    }));
  } else {
    // Re-clicking same room => set unread to zero
    const total = normalMessageCountMap[newRoom] || 0;
    lastReadCount[newRoom] = total;
    saveLastReadCount();  
  }
}
