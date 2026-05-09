const state = {
  chats: [],          // [{id, title, history: [{role, content}]}] so que isto nao esta a guardar em cache, podemos guardar se for conveniente
  activeChatId: null,
  isLoading: false,
};

//coisinhas definidas no html
const sidebar        = document.getElementById('sidebar');
const sidebarToggle  = document.getElementById('sidebarToggle');
const newChatBtn     = document.getElementById('newChatBtn');
const chatList       = document.getElementById('chatList');
const welcomeScreen  = document.getElementById('welcomeScreen');
const chatArea       = document.getElementById('chatArea');
const messages       = document.getElementById('messages');
const messageInput   = document.getElementById('messageInput');
const sendBtn        = document.getElementById('sendBtn');
const trustToggle    = document.getElementById('trustToggle');
const trustPanel     = document.getElementById('trustPanel');
const researchBar    = document.getElementById('researchBar');
const researchVal    = document.getElementById('researchVal');
const depthBar       = document.getElementById('depthBar');
const depthVal       = document.getElementById('depthVal');
const interventionZone = document.getElementById('interventionZone');
const interventionMsg  = document.getElementById('interventionMsg');
const sourcesBox       = document.getElementById('sourcesBox');
const sourcesList      = document.getElementById('sourcesList');
const trustIdle        = document.getElementById('trustIdle');

function setGreeting() {
  const h = new Date().getHours();
  const greetEl = document.getElementById('greeting');
  if (greetEl) {
    if (h < 12)      greetEl.textContent = 'Good morning!';
    else if (h < 18) greetEl.textContent = 'Good afternoon!';
    else             greetEl.textContent = 'Good evening!';
  }
}
setGreeting();

function createChat() {
  const id = Date.now().toString();
  const chat = { id, title: 'New chat', history: [] };
  state.chats.unshift(chat);
  state.activeChatId = id;
  renderChatList();
  showWelcome();
  messageInput.focus();
  resetTrustPanel();
  fetch('/reset', { method: 'POST' });
}

function setActiveChat(id) {
  state.activeChatId = id;
  renderChatList();
  const chat = state.chats.find(c => c.id === id);
  if (!chat) return;
  if (chat.history.length === 0) {
    showWelcome();
  } else {
    showChat();
    messages.innerHTML = '';
    chat.history.forEach(m => appendMessage(m.role, m.content));
  }
}

function renderChatList() {
  chatList.innerHTML = '';
  state.chats.forEach(chat => {
    const el = document.createElement('div');
    el.className = 'chat-item' + (chat.id === state.activeChatId ? ' active' : '');
    el.textContent = chat.title;
    el.onclick = () => setActiveChat(chat.id);
    chatList.appendChild(el);
  });
}

function showWelcome() {
  welcomeScreen.style.display = 'flex';
  chatArea.style.display = 'none';
}

function showChat() {
  welcomeScreen.style.display = 'none';
  chatArea.style.display = 'flex';
  chatArea.style.flexDirection = 'column';
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function appendMessage(role, content, interventionText) {
  const wrapper = document.createElement('div');
  wrapper.className = `message ${role}`;

  const meta = document.createElement('div');
  meta.className = 'message-meta';

  const roleEl = document.createElement('span');
  roleEl.className = 'message-role';
  roleEl.textContent = role === 'user' ? 'you' : 'guard';

  const timeEl = document.createElement('span');
  timeEl.className = 'message-time';
  timeEl.textContent = formatTime(new Date());

  meta.append(roleEl, timeEl);

  const body = document.createElement('div');
  body.className = 'message-body';
  // Simple markdown-ish: bold, line breaks
  body.innerHTML = formatContent(content);

  wrapper.append(meta, body);

  if (interventionText) {
    const inv = document.createElement('div');
    inv.className = 'inline-intervention';
    inv.textContent = interventionText;
    wrapper.appendChild(inv);
  }

  messages.appendChild(wrapper);
  chatArea.scrollTop = chatArea.scrollHeight;
  return wrapper;
}

function formatContent(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

function showTyping() {
  const el = document.createElement('div');
  el.className = 'typing';
  el.id = 'typingIndicator';
  el.innerHTML = '<span></span><span></span><span></span>';
  messages.appendChild(el);
  chatArea.scrollTop = chatArea.scrollHeight;
}

function removeTyping() {
  const el = document.getElementById('typingIndicator');
  if (el) el.remove();
}

// trust panel
function updateTrustPanel(trust) {
  trustIdle.style.display = 'none';

  const r = trust.research_score;
  const d = trust.depth_score;

  researchBar.style.width = r + '%';
  researchVal.textContent = r + '%';
  depthBar.style.width = d + '%';
  depthVal.textContent = d + '%';

  // colors in the trusr panel
  const barClass = (v) => v >= 65 ? 'good' : v >= 40 ? 'warn' : 'bad';
  researchBar.className = `metric-bar research-bar ${barClass(r)}`;
  depthBar.className    = `metric-bar depth-bar ${barClass(d)}`;

  if (trust.intervene) {
    interventionZone.style.display = 'block';
    interventionMsg.textContent = trust.intervention_message || '';

    if (trust.sources && trust.sources.length > 0) {
      sourcesBox.style.display = 'block';
      sourcesList.innerHTML = trust.sources
        .map(s => `<li>${s}</li>`)
        .join('');
    } else {
      sourcesBox.style.display = 'none';
    }
  } else {
    interventionZone.style.display = 'none';
  }
}

function resetTrustPanel() {
  researchBar.style.width = '50%';
  researchVal.textContent = '50%';
  depthBar.style.width = '50%';
  depthVal.textContent = '50%';
  researchBar.className = 'metric-bar research-bar';
  depthBar.className    = 'metric-bar depth-bar';
  interventionZone.style.display = 'none';
  trustIdle.style.display = 'block';
}


async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || state.isLoading) return;

  if (!state.activeChatId) createChat();
  const chat = state.chats.find(c => c.id === state.activeChatId);
  if (!chat) return;

  if (chat.history.length === 0) {
    chat.title = text.slice(0, 40) + (text.length > 40 ? '…' : '');
    renderChatList();
  }

  showChat();

  // mostrar a mensagem na interface
  chat.history.push({ role: 'user', content: text });
  appendMessage('user', text);
  messageInput.value = '';
  autoResize();


  state.isLoading = true;
  sendBtn.disabled = true;
  showTyping();

  try {
    const res = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        history: chat.history.slice(0, -1),  // excluimos o que adicionamos agr(message:text) // dai o -1
      }),
    });

    const data = await res.json();
    removeTyping();

    if (data.error) {
      appendMessage('assistant', 'error' + data.error);
    } else {
      chat.history.push({ role: 'assistant', content: data.response });
      appendMessage(
        'assistant',
        data.response,
        data.trust?.intervene ? data.trust.intervention_message : null
      );
      if (data.trust) updateTrustPanel(data.trust);
    }
  } catch (err) {
    removeTyping();
    appendMessage('assistant', ' Could not connect to server. Is Flask running?');
  } finally {
    state.isLoading = false;
    sendBtn.disabled = false;
    messageInput.focus();
  }
}

//dar auto rezise ao input
function autoResize() {
  messageInput.style.height = 'auto';
  messageInput.style.height = Math.min(messageInput.scrollHeight, 160) + 'px';
}

messageInput.addEventListener('input', autoResize);
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.addEventListener('click', sendMessage);

//sidebarr
sidebarToggle.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
});

//trust panel(quando o escondemos dps n tou a conseguir mostrar again)
trustToggle.addEventListener('click', () => {
  trustPanel.classList.toggle('collapsed');
});


//new chat
newChatBtn.addEventListener('click', createChat);

createChat();