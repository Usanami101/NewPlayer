(() => {
  const $ = (s) => document.querySelector(s);
  let account = null;
  let servers = [];
  let publicServers = [];
  let currentServer = null;
  let currentChannel = 'general';
  let unsub = null;
  let messages = [];

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function setAuthErr(msg) {
    $('#authErr').textContent = msg || '';
  }

  function showAuth(show) {
    $('#authView').classList.toggle('hidden', !show);
    $('#chatView').classList.toggle('hidden', show);
  }

  async function boot() {
    try {
      account = await window.newtalk.getAccount();
      publicServers = await window.newtalk.listPublic();
      if (account) {
        showAuth(false);
        await enterChat();
      } else {
        showAuth(true);
      }
    } catch (e) {
      showAuth(true);
      setAuthErr(e.message || String(e));
    }
  }

  async function enterChat() {
    $('#userPill').textContent = `@${account.username}`;
    servers = await window.newtalk.listJoined();
    renderServerLists();
    const first = servers[0] || publicServers[0];
    if (first) await selectServer(first.id);
  }

  function renderServerLists() {
    const joinedEl = $('#serverList');
    const pubEl = $('#publicList');
    joinedEl.innerHTML = '';
    pubEl.innerHTML = '';
    const joinedIds = new Set(servers.map((s) => s.id));
    for (const s of servers) {
      joinedEl.appendChild(makeSrvBtn(s, false));
    }
    for (const s of publicServers) {
      if (!joinedIds.has(s.id)) pubEl.appendChild(makeSrvBtn(s, true));
      else {
        // also show public that are joined in joined list only
      }
    }
    // always show all public for one-click join/open
    if (!publicServers.length) {
      pubEl.innerHTML = '<div class="empty-msg" style="font-size:0.65rem;padding:4px">—</div>';
    } else {
      pubEl.innerHTML = '';
      for (const s of publicServers) {
        pubEl.appendChild(makeSrvBtn(s, true));
      }
    }
  }

  function makeSrvBtn(s, isPub) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'srv-btn' + (isPub ? ' pub' : '') + (currentServer?.id === s.id ? ' active' : '');
    b.title = s.name + (s.description ? ` — ${s.description}` : '');
    b.textContent = s.icon || '💬';
    b.onclick = async () => {
      if (isPub && !servers.some((x) => x.id === s.id)) {
        try {
          await window.newtalk.join(s.id);
          servers = await window.newtalk.listJoined();
        } catch (e) {
          alert(e.message || String(e));
          return;
        }
      }
      await selectServer(s.id);
      renderServerLists();
    };
    return b;
  }

  async function selectServer(id) {
    try {
      currentServer = await window.newtalk.getServer(id);
      $('#srvName').textContent = `${currentServer.icon || ''} ${currentServer.name}`.trim();
      $('#srvDesc').textContent = currentServer.description || (currentServer.public ? 'Public topic' : 'Private server');
      renderChannels();
      const ch = (currentServer.channels || [])[0];
      currentChannel = ch ? ch.id : 'general';
      await loadMessages();
      subscribe();
    } catch (e) {
      alert(e.message || String(e));
    }
  }

  function renderChannels() {
    const el = $('#channelList');
    el.innerHTML = '';
    for (const c of currentServer.channels || []) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ch-btn' + (c.id === currentChannel ? ' active' : '');
      b.textContent = `# ${c.name}`;
      b.onclick = async () => {
        currentChannel = c.id;
        renderChannels();
        await loadMessages();
        subscribe();
      };
      el.appendChild(b);
    }
    const active = (currentServer.channels || []).find((c) => c.id === currentChannel);
    $('#chTitle').textContent = `# ${active?.name || currentChannel}`;
    $('#chTopic').textContent = active?.topic || 'Chat with NewPlayer users';
  }

  async function loadMessages() {
    if (!currentServer) return;
    messages = await window.newtalk.getMessages(currentServer.id, currentChannel);
    renderMessages();
    $('#msgInput').disabled = false;
    $('#btnSend').disabled = false;
  }

  function renderMessages() {
    const el = $('#messages');
    el.innerHTML = '';
    if (!messages.length) {
      el.innerHTML = '<div class="empty-msg">No messages yet — say hello 👋</div>';
      return;
    }
    for (const m of messages) {
      el.appendChild(msgNode(m));
    }
    el.scrollTop = el.scrollHeight;
  }

  function msgNode(m) {
    const d = document.createElement('div');
    d.className = 'msg';
    d.dataset.id = m.id;
    const initial = (m.displayName || m.username || '?').charAt(0).toUpperCase();
    const when = m.createdAt ? new Date(m.createdAt).toLocaleString() : '';
    d.innerHTML = `
      <div class="avatar" style="background:${esc(m.avatarColor || '#a78bfa')}">${esc(initial)}</div>
      <div>
        <div><span class="who">${esc(m.displayName || m.username)}</span><span class="when">${esc(when)}</span></div>
        <div class="body">${esc(m.content)}</div>
      </div>`;
    return d;
  }

  function subscribe() {
    if (unsub) {
      try {
        unsub();
      } catch {
        /* ignore */
      }
      unsub = null;
    }
    if (!currentServer) return;
    unsub = window.newtalk.subscribe(currentServer.id, currentChannel, (msg) => {
      if (!msg || !msg.id) return;
      if (messages.some((m) => m.id === msg.id)) return;
      messages.push(msg);
      messages.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      const empty = $('#messages .empty-msg');
      if (empty) empty.remove();
      $('#messages').appendChild(msgNode(msg));
      $('#messages').scrollTop = $('#messages').scrollHeight;
      $('#syncBadge').textContent = 'synced';
    });
    $('#syncBadge').textContent = 'peers';
  }

  // Auth tabs
  document.querySelectorAll('.tab').forEach((t) => {
    t.onclick = () => {
      document.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
      t.classList.add('active');
      const create = t.dataset.tab === 'create';
      $('#formCreate').classList.toggle('hidden', !create);
      $('#formLogin').classList.toggle('hidden', create);
      setAuthErr('');
    };
  });

  $('#formCreate').onsubmit = async (e) => {
    e.preventDefault();
    setAuthErr('');
    const fd = new FormData(e.target);
    try {
      account = await window.newtalk.createAccount({
        username: fd.get('username'),
        displayName: fd.get('displayName'),
        password: fd.get('password'),
      });
      showAuth(false);
      await enterChat();
    } catch (err) {
      setAuthErr(err.message || String(err));
    }
  };

  $('#formLogin').onsubmit = async (e) => {
    e.preventDefault();
    setAuthErr('');
    const fd = new FormData(e.target);
    try {
      account = await window.newtalk.login({
        username: fd.get('username'),
        password: fd.get('password'),
      });
      showAuth(false);
      await enterChat();
    } catch (err) {
      setAuthErr(err.message || String(err));
    }
  };

  $('#btnAuthHome').onclick = () => window.newtalk.goHome();
  $('#btnHome').onclick = () => {
    if (unsub) unsub();
    window.newtalk.goHome();
  };

  $('#btnCreateSrv').onclick = async () => {
    const name = prompt('Server name');
    if (!name) return;
    const description = prompt('Description (optional)') || '';
    try {
      const res = await window.newtalk.createServer({ name, description, icon: '🏠' });
      if (res.inviteCode) {
        alert(`Server created!\nInvite code: ${res.inviteCode}\nShare this so friends can join.`);
      }
      servers = await window.newtalk.listJoined();
      renderServerLists();
      await selectServer(res.server.id);
      renderServerLists();
    } catch (e) {
      alert(e.message || String(e));
    }
  };

  $('#btnJoinInvite').onclick = async () => {
    const code = prompt('Invite code or public server id (e.g. pub_gaming)');
    if (!code) return;
    try {
      const s = await window.newtalk.join(code.trim());
      servers = await window.newtalk.listJoined();
      renderServerLists();
      await selectServer(s.id);
      renderServerLists();
    } catch (e) {
      alert(e.message || String(e));
    }
  };

  $('#btnAddChannel').onclick = async () => {
    if (!currentServer) return;
    const name = prompt('Channel name (letters/numbers)');
    if (!name) return;
    try {
      currentServer = await window.newtalk.createChannel(currentServer.id, name);
      renderChannels();
    } catch (e) {
      alert(e.message || String(e));
    }
  };

  $('#btnInvite').onclick = async () => {
    if (!currentServer) return;
    const code = currentServer.inviteCode || currentServer.id;
    try {
      await navigator.clipboard.writeText(code);
      alert(`Invite copied:\n${code}`);
    } catch {
      prompt('Copy invite:', code);
    }
  };

  $('#composer').onsubmit = async (e) => {
    e.preventDefault();
    const input = $('#msgInput');
    const text = input.value.trim();
    if (!text || !currentServer) return;
    input.value = '';
    try {
      const msg = await window.newtalk.send(currentServer.id, currentChannel, text);
      if (!messages.some((m) => m.id === msg.id)) {
        messages.push(msg);
        const empty = $('#messages .empty-msg');
        if (empty) empty.remove();
        $('#messages').appendChild(msgNode(msg));
        $('#messages').scrollTop = $('#messages').scrollHeight;
      }
    } catch (err) {
      alert(err.message || String(err));
      input.value = text;
    }
  };

  boot();
})();
