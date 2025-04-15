'use strict';
const config = require('config');

const body = new FormData();
body.append('file', 'https://output.lemonfox.ai/wikipedia_ai.mp3');
// instead of providing a URL you can also upload a file object:
// body.append('file', new Blob([await fs.readFile('/path/to/audio.mp3')]));
body.append('language', 'english');
body.append('response_format', 'json');

fetch('https://api.lemonfox.ai/v1/audio/transcriptions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${config.WHISPER_API_KEY}`
  },
  body: body
})
.then(response => response.json()).then(data => {
  console.log(data['text']);
})
.catch(error => {
  console.error('Error:', error);
});