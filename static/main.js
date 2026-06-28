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

async function triggerUserAction(actionName) {
  const chat = state.chats.find(c => c.id === state.activeChatId);
  if (!chat || !chat.trust_data) return;
  try {
    const res = await fetch('/user_action', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        action: actionName,
        trust_data: chat.trust_data,
        settings: state.settings
      })
    });
    const data = await res.json();
    if (!data.error) {
      chat.trust = data.trust;
      chat.trust_data = data.trust_data;
      saveState();
      updateTrustPanel(chat.trust);
      applyLockout(chat.trust);
    }
  } catch (err) {
    console.error('Failed to trigger action:', actionName);
  }
}

const verifiedBtn = document.getElementById('verifiedElsewhereBtn');
if (verifiedBtn) verifiedBtn.addEventListener('click', () => triggerUserAction('verified_elsewhere'));

const scoreWrongBtn = document.getElementById('scoreWrongBtn');
if (scoreWrongBtn) scoreWrongBtn.addEventListener('click', () => triggerUserAction('score_wrong'));

document.querySelectorAll('.choice-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.target.parentElement.querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
    e.target.classList.add('selected');
    triggerUserAction('session_reflection');
  });
});

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
const trustResizeHandle = document.getElementById('trustResizeHandle');
const researchBar    = document.getElementById('researchBar');
const researchVal    = document.getElementById('researchVal');
const depthBar       = document.getElementById('depthBar');
const depthVal       = document.getElementById('depthVal');
const interventionZone = document.getElementById('interventionZone');
const interventionMsg  = document.getElementById('interventionMsg');
const sourcesBox       = document.getElementById('sourcesBox');
const sourcesList      = document.getElementById('sourcesList');
const trustIdle        = document.getElementById('trustIdle');
const scoreReasonsList = document.getElementById('scoreReasonsList');
const verificationCount = document.getElementById('verificationCount');
const interventionHistoryList = document.getElementById('interventionHistoryList');
const exportSessionBtn = document.getElementById('exportSessionBtn');
const trustTimeline = document.getElementById('trustTimeline');
const interventionTypesList = document.getElementById('interventionTypesList');
const verifiedElsewhereBtn = document.getElementById('verifiedElsewhereBtn');
const sessionReflection = document.getElementById('sessionReflection');

function loadPanelWidth() {
  const savedWidth = parseInt(localStorage.getItem('guard_trust_panel_width') || '', 10);
  if (!Number.isNaN(savedWidth)) {
    setTrustPanelWidth(savedWidth);
  }
}

function setTrustPanelWidth(width) {
  const clamped = Math.max(240, Math.min(460, width));
  document.documentElement.style.setProperty('--panel-w', clamped + 'px');
  localStorage.setItem('guard_trust_panel_width', String(clamped));
}

function initTrustPanelResize() {
  if (!trustPanel || !trustResizeHandle) return;

  let isResizing = false;
  const onPointerMove = (event) => {
    if (!isResizing) return;
    const viewportWidth = window.innerWidth;
    setTrustPanelWidth(viewportWidth - event.clientX);
  };

  const stopResize = () => {
    if (!isResizing) return;
    isResizing = false;
    document.body.classList.remove('resizing-trust-panel');
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', stopResize);
  };

  trustResizeHandle.addEventListener('pointerdown', (event) => {
    if (trustPanel.classList.contains('collapsed')) return;
    isResizing = true;
    document.body.classList.add('resizing-trust-panel');
    trustResizeHandle.setPointerCapture?.(event.pointerId);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', stopResize);
  });

  trustResizeHandle.addEventListener('dblclick', () => {
    setTrustPanelWidth(260);
  });
}

loadPanelWidth();
initTrustPanelResize();

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
  const chat = { id, title: 'New chat', history: [], trust_data: null, trust: null, session_reflection: {} };
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
    chat.history.forEach(m => appendMessage(m.role, m.content, m.interventionText, m.confidence, m.aiSources));
  }

  if (chat.trust) {
    updateTrustPanel(chat.trust);
    applyLockout(chat.trust);
  } else {
    resetTrustPanel();
    applyLockout({ locked: false });
  }
  updateSessionReflection();
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

function buildChatTitle(chat) {
  const userMessages = chat.history
    .filter(m => m.role === 'user')
    .map(m => m.content.trim())
    .filter(Boolean);
  const assistantText = chat.history
    .filter(m => m.role === 'assistant')
    .map(m => m.content)
    .join(' ')
    .toLowerCase();

  if (userMessages.length === 0) return 'New chat';

  if (assistantText.includes('invalid api key') || assistantText.includes('check your api key')) {
    return 'API setup check';
  }

  const meaningful = userMessages.find(message => !isSmallTalk(message));
  if (!meaningful) return 'General chat';

  const lower = meaningful.toLowerCase();
  const topicMap = [
    [['health', 'medical', 'symptom', 'disease', 'drug'], 'Health question'],
    [['news', 'politic', 'election', 'government', 'war'], 'News verification'],
    [['science', 'research', 'study', 'data', 'climate'], 'Research question'],
    [['law', 'legal', 'rights', 'court', 'regulation'], 'Legal question'],
    [['source', 'sources', 'verify', 'fact check', 'fact-check'], 'Source check'],
    [['project', 'assignment', 'presentation', 'prototype'], 'Project help'],
  ];

  for (const [words, title] of topicMap) {
    if (words.some(word => lower.includes(word))) return title;
  }

  return makeShortTopic(meaningful);
}

function isSmallTalk(message) {
  const cleaned = message.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const greetings = new Set(['hi', 'hello', 'hey', 'hey there', 'hi there', 'good morning', 'good afternoon', 'good evening']);
  return cleaned.length < 3 || greetings.has(cleaned);
}

function makeShortTopic(message) {
  const words = message
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter(word => !['please', 'could', 'would', 'should', 'about', 'explain', 'tell'].includes(word.toLowerCase()))
    .slice(0, 5);

  if (words.length === 0) return 'General chat';
  return words.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
}

function refreshChatTitle(chat) {
  const nextTitle = buildChatTitle(chat);
  if (chat.title !== nextTitle) {
    chat.title = nextTitle;
    saveState();
    renderChatList();
  }
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

function appendMessage(role, content, interventionText = null, confidence = null, aiSources = null) {
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
  
  if (role === 'user') {
    body.textContent = content;
  } else {
    // format as markdown
    body.innerHTML = marked.parse(content);
    // highlight code blocks
    body.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightElement(block);
    });
    
    if (confidence !== null && confidence !== undefined) {
      const confWidget = document.createElement('div');
      confWidget.className = 'confidence-widget';
      let level = 'high';
      if (confidence < 70) level = 'med';
      if (confidence < 40) level = 'low';
      
      confWidget.innerHTML = `
        <div class="confidence-header">
          <span>AI Confidence</span>
          <strong>${confidence}%</strong>
        </div>
        <div class="confidence-bar-bg">
          <div class="confidence-bar-fill ${level}" style="width: ${confidence}%"></div>
        </div>
      `;
      body.appendChild(confWidget);
    }
    
    if (aiSources) {
      const srcWidget = document.createElement('div');
      srcWidget.className = 'ai-sources-widget';
      srcWidget.innerHTML = `<strong>Suggested searches:</strong><br/>${aiSources.replace(/\n/g, '<br/>')}`;
      body.appendChild(srcWidget);
    }
  }

  wrapper.append(meta, body);

  if (interventionText) {
    const inv = document.createElement('div');
    inv.className = 'msg-intervention';
    inv.textContent = interventionText;
    wrapper.appendChild(inv);
  }

  messages.appendChild(wrapper);
  chatArea.scrollTop = chatArea.scrollHeight;
  return wrapper;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderList(el, items, fallback) {
  if (!el) return;
  const safeItems = Array.isArray(items) && items.length ? items : [fallback];
  el.innerHTML = safeItems.map(item => `<li>${escapeHtml(item)}</li>`).join('');
}

function renderTimeline(points) {
  if (!trustTimeline) return;
  if (!Array.isArray(points) || points.length < 2) {
    trustTimeline.innerHTML = '<span>No trend yet</span>';
    return;
  }

  const width = 180;
  const height = 58;
  const pad = 5;
  const maxIndex = Math.max(points.length - 1, 1);
  const makePolyline = (key) => points.map((p, index) => {
    const x = pad + (index / maxIndex) * (width - pad * 2);
    const y = height - pad - ((p[key] || 0) / 100) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  trustTimeline.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" class="timeline-svg" aria-label="Trust score timeline">
      <polyline class="timeline-line timeline-research" points="${makePolyline('research')}"></polyline>
      <polyline class="timeline-line timeline-depth" points="${makePolyline('depth')}"></polyline>
    </svg>
    <div class="timeline-key">
      <span><i class="key-research"></i>research</span>
      <span><i class="key-depth"></i>depth</span>
    </div>
  `;
}

function renderNudgeTypes(types) {
  if (!interventionTypesList) return;
  if (!Array.isArray(types) || types.length === 0) {
    interventionTypesList.innerHTML = '<span>No categories yet</span>';
    return;
  }

  const counts = types.reduce((acc, type) => {
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  interventionTypesList.innerHTML = Object.entries(counts)
    .map(([type, count]) => `<span class="nudge-chip">${escapeHtml(type)} ${count}</span>`)
    .join('');
}

function getActiveChat() {
  return state.chats.find(c => c.id === state.activeChatId);
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
  if (verificationCount) {
    verificationCount.textContent = trust.verification_actions || 0;
  }
  renderList(scoreReasonsList, trust.score_reasons, 'No signals yet');
  renderList(interventionHistoryList, trust.intervention_history, 'No nudges yet');
  renderTimeline(trust.score_timeline);
  renderNudgeTypes(trust.intervention_types);

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
  renderList(scoreReasonsList, [], 'No signals yet');
  renderList(interventionHistoryList, [], 'No nudges yet');
  if (verificationCount) verificationCount.textContent = '0';
  renderTimeline([]);
  renderNudgeTypes([]);
  updateSessionReflection();
}


async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || state.isLoading) return;

  if (!state.activeChatId) createChat();
  const chat = state.chats.find(c => c.id === state.activeChatId);
  if (!chat) return;

  if (chat.history.length === 0) {
    chat.title = 'New chat';
    renderChatList();
  }

  showChat();

  // mostrar a mensagem na interface
  chat.history.push({ role: 'user', content: text });
  saveState();
  appendMessage('user', text);
  messageInput.value = '';
  // autoResize();


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
      chat.history.push({ role: 'assistant', content: data.response, interventionText: intervention, confidence: data.confidence, aiSources: data.ai_sources });
      chat.trust = data.trust;
      chat.trust_data = data.trust_data;
      refreshChatTitle(chat);
      saveState();
      appendMessage('assistant', data.response, intervention, data.confidence, data.ai_sources);
      if (data.trust) {
        updateTrustPanel(data.trust);
        applyLockout(data.trust);
      }
      updateSessionReflection();
    }
  } catch (err) {
    removeTyping();
    appendMessage('assistant', ' Could not connect to server. Is Flask running?');
  } finally {
    state.isLoading = false;
    if (!chat.trust?.locked) {
      sendBtn.disabled = false;
    }
    messageInput.focus();
  }
}

function sendReflectionPrompt(prompt) {
  messageInput.value = prompt;
  autoResize();
  sendMessage();
}

//dar auto rezise ao input
window.trackLinkClick = async function() {
  if (!state.activeChatId) return;
  const chat = getActiveChat();
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

function updateSessionReflection() {
  if (!sessionReflection) return;
  const chat = getActiveChat();
  if (!chat) {
    sessionReflection.style.display = 'none';
    return;
  }

  const userMessages = chat.history.filter(m => m.role === 'user').length;
  sessionReflection.style.display = userMessages >= 3 ? 'block' : 'none';
  sessionReflection.querySelectorAll('.choice-btn').forEach(button => {
    const row = button.closest('.choice-row');
    const question = row?.dataset.question;
    button.classList.toggle('selected', chat.session_reflection?.[question] === button.dataset.value);
  });
}

function setReflectionAnswer(question, value) {
  const chat = getActiveChat();
  if (!chat) return;
  chat.session_reflection = {
    ...(chat.session_reflection || {}),
    [question]: value,
  };
  saveState();
  updateSessionReflection();
}

function exportSession() {
  const chat = getActiveChat();
  if (!chat) return;

  const reportWindow = window.open('', '_blank');
  if (!reportWindow) {
    alert('Please allow popups to export the PDF report.');
    return;
  }

  const trust = chat.trust || {};
  const trustData = chat.trust_data || {};
  const reflection = chat.session_reflection || {};
  const timelineRows = (trust.score_timeline || [])
    .map(point => `
      <tr>
        <td>${escapeHtml(point.message ?? '')}</td>
        <td>${escapeHtml(point.research ?? '')}%</td>
        <td>${escapeHtml(point.depth ?? '')}%</td>
      </tr>
    `).join('') || '<tr><td colspan="3">No timeline data yet.</td></tr>';
  const reasons = listItems(trust.score_reasons, 'No score reasons recorded yet.');
  const interventions = listItems(trust.intervention_history, 'No interventions recorded yet.');
  const types = listItems(trust.intervention_types, 'No intervention types recorded yet.');
  const corrections = listItems((trustData.user_corrections || []).map(c => c.correction), 'No user corrections recorded yet.');
  const messagesHtml = chat.history.map(message => `
    <div class="message-row">
      <div class="message-role">${escapeHtml(message.role)}</div>
      <div class="message-content">${escapeHtml(message.content).replace(/\n/g, '<br>')}</div>
      ${message.interventionText ? `<div class="message-intervention">${escapeHtml(message.interventionText)}</div>` : ''}
    </div>
  `).join('') || '<p>No messages recorded.</p>';

  reportWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>GUARD Session Report</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 40px;
            font-family: Arial, Helvetica, sans-serif;
            color: #1a1916;
            background: #ffffff;
            line-height: 1.45;
          }
          h1 {
            margin: 0 0 4px;
            font-family: Georgia, serif;
            font-size: 34px;
            font-style: italic;
            font-weight: 400;
          }
          h2 {
            margin: 26px 0 10px;
            font-size: 14px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #8a8880;
          }
          p { margin: 0 0 8px; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 12px;
          }
          th, td {
            border: 1px solid #ddd9cf;
            padding: 7px 8px;
            text-align: left;
            vertical-align: top;
          }
          th { background: #f5f3ee; }
          ul { margin: 0; padding-left: 18px; }
          .subtitle {
            color: #4a4844;
            margin-bottom: 20px;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
          }
          .summary-card {
            border: 1px solid #ddd9cf;
            border-radius: 6px;
            padding: 10px;
            background: #f9f8f4;
          }
          .summary-label {
            font-size: 10px;
            letter-spacing: 0.08em;
            color: #8a8880;
            text-transform: uppercase;
          }
          .summary-value {
            font-size: 18px;
            margin-top: 4px;
          }
          .message-row {
            border-top: 1px solid #e7e2d8;
            padding: 10px 0;
            break-inside: avoid;
          }
          .message-role {
            font-size: 10px;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: #c0392b;
            margin-bottom: 4px;
          }
          .message-content {
            font-size: 13px;
          }
          .message-intervention {
            margin-top: 6px;
            padding-left: 8px;
            border-left: 2px solid #c0392b;
            color: #4a4844;
            font-size: 12px;
          }
          .footer {
            margin-top: 28px;
            color: #8a8880;
            font-size: 11px;
          }
          @media print {
            body { padding: 22mm; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>GUARD Session Report</h1>
        <p class="subtitle">Generated ${escapeHtml(new Date().toLocaleString())} from the active conversation.</p>

        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-label">Research</div>
            <div class="summary-value">${escapeHtml(trust.research_score ?? 50)}%</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Prompt depth</div>
            <div class="summary-value">${escapeHtml(trust.depth_score ?? 50)}%</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Verification</div>
            <div class="summary-value">${escapeHtml(trust.verification_actions || 0)}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Messages</div>
            <div class="summary-value">${escapeHtml(chat.history.length)}</div>
          </div>
        </div>

        <h2>Trust Timeline</h2>
        <table>
          <thead><tr><th>Message</th><th>Research</th><th>Prompt Depth</th></tr></thead>
          <tbody>${timelineRows}</tbody>
        </table>

        <h2>Why This Score?</h2>
        <ul>${reasons}</ul>

        <h2>Interventions</h2>
        <ul>${interventions}</ul>

        <h2>Intervention Types</h2>
        <ul>${types}</ul>

        <h2>User Corrections</h2>
        <ul>${corrections}</ul>

        <h2>End-of-Session Reflection</h2>
        <table>
          <tbody>
            <tr><th>Verified anything?</th><td>${escapeHtml(reflection.verified || 'not answered')}</td></tr>
            <tr><th>Interrupted too much?</th><td>${escapeHtml(reflection.intrusive || 'not answered')}</td></tr>
            <tr><th>Helped critical thinking?</th><td>${escapeHtml(reflection.helpful || 'not answered')}</td></tr>
          </tbody>
        </table>

        <h2>Conversation</h2>
        ${messagesHtml}

        <p class="footer">GUARD uses heuristic signals for reflection support. Scores are not a validated psychological measure.</p>
        <script>
          window.onload = () => {
            window.print();
          };
        <\/script>
      </body>
    </html>
  `);
  reportWindow.document.close();
}

function listItems(items, fallback) {
  const safeItems = Array.isArray(items) && items.length ? items : [fallback];
  return safeItems.map(item => `<li>${escapeHtml(item)}</li>`).join('');
}

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
if (exportSessionBtn) {
  exportSessionBtn.addEventListener('click', exportSession);
}
if (verifiedElsewhereBtn) {
  // handled by triggerUserAction at top of file
}
if (sessionReflection) {
  sessionReflection.addEventListener('click', (event) => {
    const button = event.target.closest('.choice-btn');
    if (!button) return;
    const row = button.closest('.choice-row');
    if (!row) return;
    setReflectionAnswer(row.dataset.question, button.dataset.value);
  });
}

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
  state.chats.forEach(chat => {
    chat.title = buildChatTitle(chat);
  });
  saveState();
  renderChatList();
  if (state.activeChatId && state.chats.find(c => c.id === state.activeChatId)) {
    setActiveChat(state.activeChatId);
  } else {
    setActiveChat(state.chats[0].id);
  }
}
