const AUTH_KEY = process.env.AUTH_KEY || 'demo';
const Database = require("@replit/database");
const db = new Database();

const express = require('express');
const app = express();

app.use(express.json({ extended: true }));

app.get('/', (req, res) => {
  res.send('OK');
});

app.use('/db', (req, res, next) => {
  if (req.header('Authorization') !== AUTH_KEY) return res.status(401).json({ error: 'Invalid `Authorization` header'});
  next();
});

app.get('/db', async (req, res) => {
  res.json({
    data: await read()
  });
});

app.get('/db/raw', async (req, res) => {
  res.json({
    data: await db.getAll()
  });
});

app.post('/db', async (req, res) => {
  if (!req.body || !req.body.data) return res.status(400).json({ error: 'Malformed request' });
  res.json({
    response: await write(req.body.data + '')
  });
});

app.put('/db', async (req, res) => {
  if (!req.body || !req.body.data) return res.status(400).json({ error: 'Malformed request' });
  res.json({
    response: await append(req.body.data + '')
  });
});

function byteCount(s) {
  return s.split(/%(?:u[0-9A-F]{2})?[0-9A-F]{2}|./).length;
}

async function read () {
  let keys = await db.list();
  keys = keys.map(key => parseInt(key)).filter(key => !isNaN(key)).sort((a, b) => (a - b) ).map(key => key + '');
  let string = '';
  for (let i = 0; i < keys.length; i++) {
    string += await db.get(keys[i]);
  }
  return string;
}

async function write (string) {
  let keys = await db.list();
  let array = [];
  let segment = '';
  for (let i = 0; i < string.length; i++) {
    if (byteCount(segment + string[i]) >= 5000000) {
      array.push(segment);
      segment = string[i];
    } else {
      segment += string[i];
    }
  }
  array.push(segment);
  if (keys.length > array.length) {
    for (let i = array.length; i <= keys.length; i++) {
      await db.delete(keys[i]);
    }
  }
  let object = {};
  for (let i = 0; i < array.length; i++) {
    object[i + ''] = array[i];
  }
  await db.setAll(object);
  return 'OK';
}

async function append (string) {
  let keys = await db.list();
  let array = [];
  for (let i = 0; i < keys.length - 1; i++) {
    array.push(null);
  }
  let segment = await db.get(keys[keys.length - 1]);
  for (let i = 0; i < string.length; i++) {
    if (byteCount(segment + string[i]) >= 5000000) {
      array.push(segment);
      segment = string[i];
    } else {
      segment += string[i];
    }
  }
  array.push(segment);
  for (let i = 0; i < array.length; i++) {
    if (array[i] == null) {
      
    } else {
      await db.set(i + '', array[i]);
    }
  }
  return 'OK';
}

app.listen(8080, () => {
  console.log('Running on *:8080');
});