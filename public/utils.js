// utils.js

// Truncates text to maxLength characters and appends ellipsis if needed
export function truncateText(text, maxLength = 30) {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }
  
  // Converts URLs in a text to clickable links
  export function linkify(text,type) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    if(type === 'received'){
      return text.replace(urlRegex, (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: black">${url}</a>`);
    }
    else{
        return text.replace(urlRegex, (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: white">${url}</a>`);
    }
  }