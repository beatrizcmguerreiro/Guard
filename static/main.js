const SAVED_CHATS_KEY = 'guard_chats';
const SAVED_ACTIVE_CHAT_KEY = 'guard_active_chat';

const state = {
  chats: [],
  activeChatId: null,
  isLoading: false,
  settings: { strictness: 50 }
};

function saveState() {
  localStorage.setItem('guard_settings', JSON.stringify(state.settings));
  localStorage.setItem(SAVED_CHATS_KEY, JSON.stringify(state.chats));
  localStorage.setItem(SAVED_ACTIVE_CHAT_KEY, state.activeChatId || '');
}

function loadState() {
  try {
    const savedChats = localStorage.getItem(SAVED_CHATS_KEY);
    if (savedChats) state.chats = JSON.parse(savedChats);
    state.activeChatId = localStorage.getItem(SAVED_ACTIVE_CHAT_KEY) || null;
    const savedSettings = localStorage.getItem('guard_settings');
    if (savedSettings) state.settings = JSON.parse(savedSettings);
  } catch (e) {
    console.error('Error loading state from localStorage:', e);
  }
}

loadState();

//coisinhas definidas no html
const sidebar        = document.getElementById('sidebar');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const strictnessRange = document.getElementById('strictnessRange');
const strictnessVal = document.getElementById('strictnessVal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');

if (settingsBtn && settingsModal) {
  settingsBtn.addEventListener('click', () => {
    strictnessRange.value = state.settings.strictness;
    strictnessVal.textContent = state.settings.strictness;
    settingsModal.style.display = 'flex';
  });

  strictnessRange.addEventListener('input', (e) => {
    strictnessVal.textContent = e.target.value;
  });

  closeSettingsBtn.addEventListener('click', () => {
    state.settings.strictness = parseInt(strictnessRange.value, 10);
    saveState();
    settingsModal.style.display = 'none';
  });
}

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
  const chat = { id, title: 'New chat', history: [], trust_data: null, trust: null };
  state.chats.unshift(chat);
  state.activeChatId = id;
  saveState();
  renderChatList();
  showWelcome();
  messages.innerHTML = '';
  messageInput.focus();
  resetTrustPanel();
}

function setActiveChat(id) {
  state.activeChatId = id;
  saveState();
  renderChatList();
  const chat = state.chats.find(c => c.id === id);
  if (!chat) return;
  
  messages.innerHTML = '';
  if (chat.history.length === 0) {
    showWelcome();
  } else {
    showChat();
    chat.history.forEach(m => appendMessage(m.role, m.content, m.interventionText));
  }

  if (chat.trust) {
    updateTrustPanel(chat.trust);
    applyLockout(chat.trust);
  } else {
    resetTrustPanel();
    applyLockout({ locked: false });
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
  let formatted = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
    
  // Convert URLs to clickable links and track clicks
  formatted = formatted.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" onclick="trackLinkClick()">$1</a>');
  
  return formatted;
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

function applyLockout(trust) {
  const modal = document.getElementById('lockdownModal');
  const timerEl = document.getElementById('lockTimer');
  if (!modal || !timerEl) return;
  
  if (trust.locked) {
    if (window.lockInterval) return; // already locked
    messageInput.disabled = true;
    sendBtn.disabled = true;
    modal.style.display = 'flex';
    let timeLeft = 10;
    timerEl.textContent = timeLeft;
    
    window.lockInterval = setInterval(() => {
      timeLeft--;
      timerEl.textContent = timeLeft;
      if (timeLeft <= 0) {
        clearInterval(window.lockInterval);
        window.lockInterval = null;
        modal.style.display = 'none';
        messageInput.disabled = false;
        sendBtn.disabled = false;
        const chat = state.chats.find(c => c.id === state.activeChatId);
        if (chat && chat.trust_data) {
           chat.trust_data.current_research_score = Math.min(100, (chat.trust_data.current_research_score || 50) + 15);
           chat.trust_data.current_depth_score = Math.min(100, (chat.trust_data.current_depth_score || 50) + 10);
           saveState();
        }
      }
    }, 1000);
  } else {
    // Unlock early if score improved
    if (window.lockInterval) {
      clearInterval(window.lockInterval);
      window.lockInterval = null;
    }
    modal.style.display = 'none';
    if (!state.isLoading) {
      messageInput.disabled = false;
      sendBtn.disabled = false;
    }
  }
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
  saveState();
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
        history: chat.history.slice(0, -1).map(m => ({role: m.role, content: m.content})),
        trust_data: chat.trust_data || null,
        settings: state.settings
      }),
    });

    const data = await res.json();
    removeTyping();

    if (data.error) {
      appendMessage('assistant', 'error' + data.error);
    } else {
      const intervention = data.trust?.intervene ? data.trust.intervention_message : null;
      chat.history.push({ role: 'assistant', content: data.response, interventionText: intervention });
      chat.trust = data.trust;
      chat.trust_data = data.trust_data;
      saveState();
      appendMessage('assistant', data.response, intervention);
      if (data.trust) {
        updateTrustPanel(data.trust);
        applyLockout(data.trust);
      }
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
window.trackLinkClick = async function() {
  if (!state.activeChatId) return;
  const chat = state.chats.find(c => c.id === state.activeChatId);
  if (!chat || !chat.trust_data) return;

  try {
    const res = await fetch('/update_trust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trust_data: chat.trust_data, settings: state.settings }),
    });
    const data = await res.json();
    if (!data.error) {
      chat.trust = { ...chat.trust, ...data.trust };
      chat.trust_data = data.trust_data;
      saveState();
      updateTrustPanel(chat.trust);
      applyLockout(chat.trust);
    }
  } catch (err) {
    console.error("Failed to update trust score on link click");
  }
};

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

if (state.chats.length === 0) {
  createChat();
} else {
  renderChatList();
  if (state.activeChatId && state.chats.find(c => c.id === state.activeChatId)) {
    setActiveChat(state.activeChatId);
  } else {
    setActiveChat(state.chats[0].id);
  }
}