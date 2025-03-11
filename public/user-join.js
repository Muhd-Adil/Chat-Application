// DOM Elements
const joinButton = document.querySelector('#join-btn');
const userNameInput = document.querySelector('#username-input');
const userErrorText = document.querySelector('.error-text');

//create a WebSocket to talk to the server
let userJoinSocket = null;
// We'll remember the last typed username
let lastUsername = '';

// Set up user join functionality
function setupUserJoin() {

  userJoinSocket = new WebSocket('ws://localhost:8080');

  userJoinSocket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'error') {
      // Show the server error under the input field
      userNameInput.classList.add('error');
      userErrorText.style.display = 'block';
      userErrorText.textContent = data.message;

    } else if (data.type === 'history') {
      // Means join was successful
      // We store the last typed username and go to index.html
      sessionStorage.setItem('username', lastUsername);
      window.location.replace('index.html');
    }
  });

  joinButton.addEventListener('click',() => {
    const username = userNameInput.value.trim();
    if (!username || username.length < 3) {
      userNameInput.classList.add('error');
      userErrorText.textContent = 'Username must be at least 3 characters';
      userErrorText.style.display = 'block';
      return;
    }

    lastUsername = username;

    // Send join request to the server
    userJoinSocket.send(JSON.stringify({
      type: 'join',
      username,
      room: 'Random Group'
    }));
    
  });

  // Adding Enter Button Add event listener for the create room button
  userNameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        const username = userNameInput.value.trim();
        if (!username || username.length < 3) {
          userNameInput.classList.add('error');
          userErrorText.textContent = 'Username must be at least 3 characters';
          userErrorText.style.display = 'block';
          return;
        }
    
        lastUsername = username;
    
        // Send join request to the server
        userJoinSocket.send(JSON.stringify({
          type: 'join',
          username,
          room: 'Random Group'
        }));
    }
  });

  // Add event listener for keyup on room name input
  userNameInput.addEventListener("keyup", (event) => {

    if (event.key === 'Enter') return;
    if (userNameInput.value.trim().length >= 3) {
      userNameInput.classList.remove('error'); 
      userErrorText.style.display = "none";
    }
  });
}

// Initialize user join functionality
document.addEventListener('DOMContentLoaded', setupUserJoin);