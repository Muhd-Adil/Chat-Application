import { truncateText } from "./utils.js";
import { setCurrentRoom, getCurrentRoom, createNewRoom } from "./chat.js";

// DOM Elements
const createRoomOption = document.querySelector('.create-room-option');
const modal = document.querySelector('#customModal');
const roomCardContainer = document.querySelector('.rooms-card-group');
const roomNameInput = document.querySelector('.create-room-input');
const errorText = document.querySelector('.error-message');
const createRoomBtn = document.querySelector('.create-room-btn');
const optionsIcon = document.querySelector('.options-icon');

const editInfoOption = document.querySelector('#edit-info-option');
const editRoomModal = document.getElementById('edit-room-modal');
const editRoomInput = document.querySelector('.edit-room-input');
const editRoomError = document.querySelector('.edit-error-msg');
const updateRoomBtn = document.querySelector('.update-room-btn');
const closeModalButtons = document.querySelectorAll('.close-btn, .cancel-btn'); 


let errorListenerAttached = false;
let creatingRoom = false;
let globalSocket = null;

// Update room list
export function updateRoomList({roomsData, currentRoom, socket}) {
    // Update the global socket reference
    globalSocket = socket;

    roomCardContainer.innerHTML = '';
    const currentUser = sessionStorage.getItem('username');
   
    roomsData.forEach(roomData => {
      const { room, recentMessage, unread } = roomData;
      const roomCard = document.createElement('div');
      roomCard.className = 'room-card';
      roomCard.style.display = 'grid';
      
      // Highlight the active room
      if (room === currentRoom) {
        roomCard.classList.add('active-room');
      } else {  
        roomCard.classList.remove('active-room');
      }
      const currentDate = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
      const fullDateTime = `${currentDate} ${recentMessage?.time}`; // Append time to the current date
      const formattedTime = !isNaN(Date.parse(fullDateTime))
      ? new Date(fullDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
      : '';
      
      const msgCountSpan = (unread > 0 && room !== currentRoom)
        ? `<span class="msg-count d-flex justify-content-center">${unread}</span>`
        : '';
      
      let snippet = '';
      if (recentMessage) {
          let cleanMessage = recentMessage.message || ''; 
          // Remove any HTML tags from the message
          cleanMessage = cleanMessage.replace(/<\/?[^>]+(>|$)/g, ''); // Removes HTML tags
          cleanMessage = cleanMessage.replace(/&nbsp;/g, ' '); // Converts non-breaking spaces to normal spaces
          const author = recentMessage.username === currentUser
            ? 'You'
            : recentMessage.username;

          switch(recentMessage.type) {
            case 'info':
                if (recentMessage.message.startsWith('renamed room to')) {
                    snippet = `${author} ${cleanMessage}`;
                } else {
                    snippet = `${author} ${cleanMessage}`;
                }
                break;
            case 'message':
                snippet = `<strong>${author}:</strong> ${truncateText(cleanMessage)}`;
                break;
            default:
                snippet = '';
          }
      }
      roomCard.innerHTML = `
          <img src="./icons/community-icon.png" class="room-icon" alt="room-icon" >
          <div class="room-details">
              <div class="room-name">${room}</div>
              <div class="message-author d-flex align-items-center">
                  <div class="author-name"></div>
                  <div class="recent-msg">${truncateText(snippet)}</div>
              </div>
          </div>
          <div class="msg-info">
              <span class="msg-time">${formattedTime}</span>
              ${msgCountSpan}
            </div>`;
      
      roomCard.addEventListener('click', () => {
          if (room !== currentRoom) {
              // Switch to the new room
              setCurrentRoom(room);
              document.querySelector('.chat-room-name').textContent = room;
              sessionStorage.setItem('currentRoom', room);
              // Clear chat view when switching rooms
              const msgViewSection = document.querySelector('.msg-view-section');
              msgViewSection.innerHTML = '';
              
              socket.send(JSON.stringify({
                  type: 'switch-room',
                  roomName: room
              }));
          }
          else {
            // If already in the room, hide or reset the message count.
            const msgCountElem = roomCard.querySelector('.msg-count');
            if (msgCountElem) msgCountElem.textContent = '';
          }
      });
      
      roomCardContainer.appendChild(roomCard);
    });

    if (!errorListenerAttached) {
      socket.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'error') {
          console.error("[room-management] Server error:", data.message);

          // If the create-room modal is open, show the error
          if (creatingRoom) {
            creatingRoom = false;  // reset the flag
            modal.classList.add('show'); // re-open modal
            roomNameInput.classList.add('error');
            errorText.style.display = 'block';
            errorText.textContent = data.message;
          }
        }
      });
      errorListenerAttached = true;
    }
}

// Create room modal handling
optionsIcon.addEventListener('click', (e) => {
  e.stopPropagation();
  createRoomOption.style.display = createRoomOption.style.display === 'flex' ? 'none' : 'flex';
});

createRoomOption.addEventListener('click',()=>{
  modal.classList.add("show");
  createRoomOption.style.display="none";
})

// Create a new room
function createNewRoomModal() {
  const roomName = roomNameInput.value.trim();
  
  if (!roomName) {
    roomNameInput.classList.add('error');
    errorText.style.display = 'block';
    errorText.textContent="Room name cannot be empty";
    return
  }

  creatingRoom = true;
  
  createNewRoom(roomName);
  modal.classList.remove('show');
  roomNameInput.value = '';
}

// Add event listener for create room button  
roomNameInput.classList.remove('error');
errorText.style.display = 'none';

// Add event listener for keyup on room name input
roomNameInput.addEventListener("keyup", () => {
  if (roomNameInput.value.trim() !== '') {
    roomNameInput.classList.remove('error');
    errorText.style.display = "none";
  }
});

//Open the modal to edit room name 
editInfoOption.addEventListener('click', () => {
  editRoomModal.classList.add('show');
  editRoomInput.value = getCurrentRoom();
});

// Update Room Name
updateRoomBtn.addEventListener('click', () => {
  const newName = editRoomInput.value.trim();
  if (!newName) {
    editRoomInput.classList.add('error');
    editRoomError.style.display = 'block';
    return;
  }
  
  globalSocket.send(JSON.stringify({
    type: 'rename-room',
    oldRoom: getCurrentRoom(),     // the old name
    newRoomName: newName
  }));

  editRoomModal.classList.remove('show');
});

// Adding Enter Button Add event listener for the update button
editRoomInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      const newName = editRoomInput.value.trim();
      if (!newName) {
        editRoomInput.classList.add('error');
        editRoomError.style.display = 'block'; 
        editRoomError.textContent = 'Room name cannot be empty';
        return;
      }
  
      globalSocket.send(JSON.stringify({
        type: 'rename-room',
        oldRoom: getCurrentRoom(),     // the old name
        newRoomName: newName
      }));

      editRoomModal.classList.remove('show');
  }
});

// Add event listener for keyup on room name input
editRoomInput.addEventListener("keyup", () => {
  if (editRoomInput.value.trim() !== '') {
    editRoomInput.classList.remove('error');
    editRoomError.style.display = "none";
  }
});

//close the modal
closeModalButtons.forEach(button => {
  button.addEventListener('click', () => {
    editRoomModal.classList.remove('show');
    editRoomInput.classList.remove('error');
    editRoomError.style.display = "none";
  });
});

closeModalButtons.forEach(button => {
  button.addEventListener('click', () => {
    modal.classList.remove('show');
    roomNameInput.classList.remove('error');
    errorText.style.display = "none";
  });
});

modal.addEventListener('click', event => {
  if (event.target === modal) {
    modal.classList.remove('show');
  }
});


//Setup search filter
const searchBar = document.getElementById("search-bar");
const noResults = document.getElementById("no-results-message");

if (searchBar && noResults) {
  searchBar.addEventListener("input", function() {
    const searchTerm = searchBar.value.toLowerCase();
    const roomCards = document.querySelectorAll(".room-card:not(#room-card-template)");
    let matches = 0;

    roomCards.forEach((card) => {
      const roomName = card.querySelector(".room-name")?.textContent.toLowerCase();
      if (roomName && roomName.includes(searchTerm)) {
        card.style.display = "grid";
        matches++;
      } else {
        card.style.display = "none";
      }
    });

    noResults.style.display = matches === 0 ? "block" : "none";
  });
}
// Hide the Create Room option when clicking anywhere outside
document.addEventListener("click", (event) => {
  // Check if the click target is not the options icon or the dropdown
  if (
    createRoomOption.style.display === "flex" &&
    !createRoomOption.contains(event.target) &&
    event.target !== optionsIcon
  ) {
    createRoomOption.style.display = "none";
  }
});

// Adding Enter Button Add event listener for the create room button
roomNameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      createNewRoomModal();
  }
});

// Initialize room management functionality
document.addEventListener('DOMContentLoaded', () => {
  if (createRoomBtn) {
    createRoomBtn.addEventListener('click', createNewRoomModal);
  }
});
