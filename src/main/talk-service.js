/**
 * NewTalk — accounts, servers, channels, messages.
 * Local-first in userData (never wipes on app update).
 * Optional multi-user sync via Gun public peers (no custom server required).
 */

const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');

const PUBLIC_SERVERS = [
  {
    id: 'pub_welcome',
    name: 'NewPlayer Welcome',
    topic: 'general',
    description: 'Say hi — public lobby for NewPlayer users',
    icon: '👋',
    public: true,
  },
  {
    id: 'pub_gaming',
    name: 'Gaming',
    topic: 'gaming',
    description: 'Games, clips, and co-op LFG',
    icon: '🎮',
    public: true,
  },
  {
    id: 'pub_tech',
    name: 'Tech & Code',
    topic: 'tech',
    description: 'Dev talk, tools, and troubleshooting',
    icon: '💻',
    public: true,
  },
  {
    id: 'pub_music',
    name: 'Music Lounge',
    topic: 'music',
    description: 'Share tracks and radio finds',
    icon: '🎵',
    public: true,
  },
  {
    id: 'pub_movies',
    name: 'Movies & Shows',
    topic: 'movies',
    description: 'What are you watching?',
    icon: '🎬',
    public: true,
  },
  {
    id: 'pub_random',
    name: 'Random',
    topic: 'random',
    description: 'Anything goes',
    icon: '🎲',
    public: true,
  },
  {
    id: 'pub_help',
    name: 'NewPlayer Help',
    topic: 'help',
    description: 'App tips and support from the community',
    icon: '❓',
    public: true,
  },
];

let gun = null;
let gunReady = false;

function talkRoot() {
  return path.join(app.getPath('userData'), 'newtalk');
}

function ensureDirs() {
  const root = talkRoot();
  for (const sub of ['', 'servers', 'messages']) {
    const p = path.join(root, sub);
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  }
  return root;
}

function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, 32).toString('hex');
}

function accountPath() {
  return path.join(ensureDirs(), 'account.json');
}

function serversIndexPath() {
  return path.join(ensureDirs(), 'servers-index.json');
}

function serverPath(id) {
  return path.join(ensureDirs(), 'servers', `${id}.json`);
}

function messagesPath(serverId, channelId) {
  return path.join(ensureDirs(), 'messages', `${serverId}__${channelId}.json`);
}

function readJson(p, fallback) {
  try {
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
}

function getAccount() {
  return readJson(accountPath(), null);
}

function createAccount({ username, displayName, password }) {
  ensureDirs();
  if (getAccount()) throw new Error('Account already exists on this device — use login or reset');
  const name = String(username || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (name.length < 3) throw new Error('Username must be at least 3 characters');
  if (!password || String(password).length < 4) throw new Error('Password must be at least 4 characters');
  const salt = crypto.randomBytes(16).toString('hex');
  const account = {
    id: crypto.randomUUID(),
    username: name,
    displayName: String(displayName || name).trim().slice(0, 32),
    salt,
    passwordHash: hashPassword(password, salt),
    avatarColor: `hsl(${Math.floor(Math.random() * 360)} 70% 55%)`,
    createdAt: Date.now(),
    joinedServers: PUBLIC_SERVERS.map((s) => s.id),
  };
  writeJson(accountPath(), account);
  // seed membership for public servers locally
  for (const pub of PUBLIC_SERVERS) {
    if (!fs.existsSync(serverPath(pub.id))) {
      writeJson(serverPath(pub.id), {
        ...pub,
        ownerId: 'system',
        channels: [
          { id: 'general', name: 'general', topic: 'Main chat' },
          { id: 'random', name: 'random', topic: 'Off-topic' },
        ],
        members: [{ id: account.id, username: account.username, displayName: account.displayName }],
        createdAt: Date.now(),
      });
    }
  }
  writeJson(serversIndexPath(), {
    joined: account.joinedServers,
    invites: {},
  });
  return publicAccount(account);
}

function login({ username, password }) {
  const acc = getAccount();
  if (!acc) throw new Error('No account on this device — create one first');
  if (acc.username !== String(username || '').trim().toLowerCase()) {
    throw new Error('Username does not match this device account');
  }
  const hash = hashPassword(password, acc.salt);
  if (hash !== acc.passwordHash) throw new Error('Incorrect password');
  return publicAccount(acc);
}

function publicAccount(acc) {
  if (!acc) return null;
  return {
    id: acc.id,
    username: acc.username,
    displayName: acc.displayName,
    avatarColor: acc.avatarColor,
    createdAt: acc.createdAt,
    joinedServers: acc.joinedServers || [],
  };
}

function requireAccount() {
  const acc = getAccount();
  if (!acc) throw new Error('Not logged in');
  return acc;
}

function listPublicServers() {
  return PUBLIC_SERVERS.map((s) => ({ ...s }));
}

function listJoinedServers() {
  const acc = getAccount();
  if (!acc) return [];
  const index = readJson(serversIndexPath(), { joined: acc.joinedServers || [] });
  const out = [];
  for (const id of index.joined || []) {
    const s = readJson(serverPath(id), null);
    if (s) {
      out.push({
        id: s.id,
        name: s.name,
        icon: s.icon || '💬',
        description: s.description || '',
        public: !!s.public,
        topic: s.topic || '',
        channelCount: (s.channels || []).length,
      });
    } else {
      const pub = PUBLIC_SERVERS.find((p) => p.id === id);
      if (pub) out.push({ ...pub, channelCount: 2 });
    }
  }
  return out;
}

function createServer({ name, description, icon }) {
  const acc = requireAccount();
  const id = 'srv_' + crypto.randomBytes(6).toString('hex');
  const invite = crypto.randomBytes(4).toString('hex');
  const server = {
    id,
    name: String(name || 'My Server').trim().slice(0, 48),
    description: String(description || '').trim().slice(0, 200),
    icon: icon || '💬',
    public: false,
    ownerId: acc.id,
    inviteCode: invite,
    channels: [
      { id: 'general', name: 'general', topic: 'Welcome' },
      { id: 'random', name: 'random', topic: 'Off-topic' },
    ],
    members: [{ id: acc.id, username: acc.username, displayName: acc.displayName, avatarColor: acc.avatarColor }],
    createdAt: Date.now(),
  };
  writeJson(serverPath(id), server);
  acc.joinedServers = [...new Set([...(acc.joinedServers || []), id])];
  writeJson(accountPath(), acc);
  const index = readJson(serversIndexPath(), { joined: [] });
  index.joined = [...new Set([...(index.joined || []), id])];
  index.invites = { ...(index.invites || {}), [invite]: id };
  writeJson(serversIndexPath(), index);
  return { server: summarizeServer(server), inviteCode: invite };
}

function joinServer(inviteOrId) {
  const acc = requireAccount();
  const code = String(inviteOrId || '').trim();
  const index = readJson(serversIndexPath(), { joined: [], invites: {} });
  let id = index.invites?.[code] || code;
  // public servers join by id
  if (code.startsWith('pub_')) id = code;
  let server = readJson(serverPath(id), null);
  if (!server) {
    const pub = PUBLIC_SERVERS.find((p) => p.id === id);
    if (!pub) throw new Error('Server or invite not found');
    server = {
      ...pub,
      ownerId: 'system',
      channels: [
        { id: 'general', name: 'general', topic: 'Main chat' },
        { id: 'random', name: 'random', topic: 'Off-topic' },
      ],
      members: [],
      createdAt: Date.now(),
    };
  }
  if (!server.members.some((m) => m.id === acc.id)) {
    server.members.push({
      id: acc.id,
      username: acc.username,
      displayName: acc.displayName,
      avatarColor: acc.avatarColor,
    });
  }
  writeJson(serverPath(id), server);
  acc.joinedServers = [...new Set([...(acc.joinedServers || []), id])];
  writeJson(accountPath(), acc);
  index.joined = [...new Set([...(index.joined || []), id])];
  writeJson(serversIndexPath(), index);
  return summarizeServer(server);
}

function summarizeServer(s) {
  return {
    id: s.id,
    name: s.name,
    icon: s.icon || '💬',
    description: s.description || '',
    public: !!s.public,
    topic: s.topic || '',
    ownerId: s.ownerId,
    inviteCode: s.inviteCode || null,
    channels: s.channels || [],
    members: s.members || [],
  };
}

function getServer(id) {
  let s = readJson(serverPath(id), null);
  if (!s) {
    const pub = PUBLIC_SERVERS.find((p) => p.id === id);
    if (!pub) throw new Error('Server not found');
    s = {
      ...pub,
      ownerId: 'system',
      channels: [
        { id: 'general', name: 'general', topic: 'Main' },
        { id: 'random', name: 'random', topic: 'Off-topic' },
      ],
      members: [],
      createdAt: Date.now(),
    };
    writeJson(serverPath(id), s);
  }
  return summarizeServer(s);
}

function getMessages(serverId, channelId, { limit = 100 } = {}) {
  const list = readJson(messagesPath(serverId, channelId), []);
  return list.slice(-limit);
}

function sendMessage(serverId, channelId, content) {
  const acc = requireAccount();
  const text = String(content || '').trim();
  if (!text) throw new Error('Empty message');
  // ensure membership
  getServer(serverId);
  const msg = {
    id: crypto.randomUUID(),
    serverId,
    channelId,
    authorId: acc.id,
    username: acc.username,
    displayName: acc.displayName,
    avatarColor: acc.avatarColor,
    content: text.slice(0, 2000),
    createdAt: Date.now(),
  };
  const p = messagesPath(serverId, channelId);
  const list = readJson(p, []);
  list.push(msg);
  // keep last 2000 local
  writeJson(p, list.slice(-2000));
  // fire-and-forget gun sync
  try {
    publishGunMessage(msg);
  } catch {
    /* offline ok */
  }
  return msg;
}

function initGun() {
  if (gunReady) return gun;
  try {
    const Gun = require('gun');
    gun = Gun({
      peers: [
        'https://gun-manhattan.herokuapp.com/gun',
        'https://peer.wallie.io/gun',
      ],
      localStorage: false,
      radisk: false,
    });
    gunReady = true;
  } catch (e) {
    gunReady = false;
    gun = null;
  }
  return gun;
}

function publishGunMessage(msg) {
  const g = initGun();
  if (!g) return;
  const key = `newplayer/talk/${msg.serverId}/${msg.channelId}`;
  g.get(key).get(msg.id).put({
    id: msg.id,
    serverId: msg.serverId,
    channelId: msg.channelId,
    authorId: msg.authorId,
    username: msg.username,
    displayName: msg.displayName,
    avatarColor: msg.avatarColor,
    content: msg.content,
    createdAt: msg.createdAt,
  });
}

function pullGunMessages(serverId, channelId, cb) {
  const g = initGun();
  if (!g) return () => {};
  const key = `newplayer/talk/${serverId}/${channelId}`;
  const handler = g.get(key).map().on((data, id) => {
    if (!data || !data.content) return;
    const msg = {
      id: data.id || id,
      serverId: data.serverId || serverId,
      channelId: data.channelId || channelId,
      authorId: data.authorId,
      username: data.username,
      displayName: data.displayName,
      avatarColor: data.avatarColor,
      content: data.content,
      createdAt: data.createdAt || Date.now(),
    };
    // merge into local
    const p = messagesPath(serverId, channelId);
    const list = readJson(p, []);
    if (!list.some((m) => m.id === msg.id)) {
      list.push(msg);
      list.sort((a, b) => a.createdAt - b.createdAt);
      writeJson(p, list.slice(-2000));
    }
    if (cb) cb(msg);
  });
  return () => {
    try {
      g.get(key).map().off();
    } catch {
      /* ignore */
    }
  };
}

function createChannel(serverId, name) {
  const acc = requireAccount();
  const s = readJson(serverPath(serverId), null);
  if (!s) throw new Error('Server not found');
  if (s.ownerId !== acc.id && s.ownerId !== 'system') {
    // allow any member to create on public for now
  }
  const id = String(name || 'channel')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 24) || 'channel';
  if ((s.channels || []).some((c) => c.id === id)) throw new Error('Channel exists');
  s.channels = [...(s.channels || []), { id, name: id, topic: '' }];
  writeJson(serverPath(serverId), s);
  return summarizeServer(s);
}

function logoutNote() {
  // keep account on device; "logout" is UI-only session flag
  return true;
}

function dataPaths() {
  return { talkRoot: talkRoot(), preservedOnUpdate: true };
}

module.exports = {
  PUBLIC_SERVERS,
  getAccount: () => publicAccount(getAccount()),
  createAccount,
  login,
  listPublicServers,
  listJoinedServers,
  createServer,
  joinServer,
  getServer,
  getMessages,
  sendMessage,
  createChannel,
  pullGunMessages,
  initGun,
  dataPaths,
  logoutNote,
};
