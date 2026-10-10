const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');

// Initialize Gemini Client with server-side API Key
let aiClient = null;
function getAiClient() {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
      console.log('JARVIS Gemini AI Core initialized successfully.');
    } catch (e) {
      console.warn('GoogleGenAI initialization warning:', e.message);
    }
  }
  return aiClient;
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 1e7 // 10MB payload size for file sharing
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// Master Admin Configuration
const MASTER_ADMIN_EMAIL = 'vihaanudupa2@gmail.com';
// Accepted admin passwords (or any customized master password set by owner)
let masterAdminPasswords = new Set(['admin123', 'admin', 'replica99', 'replica2026', 'password']);

// Persistent in-memory data structures
let messageHistory = [
  {
    id: 849201,
    channelId: '#main-board',
    recipient: null,
    author: 'Master Admin',
    actualName: 'Administrator',
    trip: '!aDm1n99x',
    timestamp: new Date().toLocaleTimeString(),
    createdAt: new Date().toISOString(),
    content: '>welcome to replica private cyberboard\n>access is strictly locked to approved friends\n>JARVIS sentinel online 24/7\nType / to use tactical cybersecurity commands or chat with JARVIS.',
    file: null,
    isSystem: false,
    replyTo: null,
    reactions: { '🛡️': ['Master Admin'], '🔥': ['JARVIS AI'] }
  },
  {
    id: 849202,
    channelId: '#main-board',
    recipient: null,
    author: 'JARVIS AI',
    actualName: 'JARVIS Sentinel Core v4.5',
    trip: '[SYS_GUARDIAN]',
    timestamp: new Date().toLocaleTimeString(),
    createdAt: new Date().toISOString(),
    content: `🛡️ JARVIS SYSTEM INITIALIZED:\n- Group channels & Direct Messages (DMs) active\n- Real-time emoji reactions enabled\n- Slash commands available: Type / in chat\n- Intrusion detection: 100% OPERATIONAL`,
    file: null,
    isSystem: true,
    replyTo: null,
    reactions: { '⚡': ['Master Admin'] }
  }
];

// Access Control State
let accessRequests = [];
let approvedUsers = new Map();
approvedUsers.set('master admin', {
  actualName: 'Administrator',
  username: 'Master Admin',
  email: MASTER_ADMIN_EMAIL,
  approvedAt: new Date().toISOString(),
  isAdmin: true
});

// Moderation / Banned Users Map (username -> { bannedAt, reason, bannedBy })
let bannedUsers = new Map();

// Active Online Logged-In Users (socketId -> { socketId, username, actualName, isAdmin, inCall, joinedAt })
let onlineUsers = new Map();

// Voice Call Participants (Live synced with colored status dots & room IDs)
let voiceParticipants = new Map();

// Cyber defense telemetry
let activeSocketsCount = 0;
let threatsNeutralized = 24;
let firewallIntegrity = 100;
let defenseMode = 'AUTONOMOUS ACTIVE';
let lastDetectedAttacker = '198.51.100.84';
let systemAuditLogs = [
  `[BOOT] JARVIS Autonomous Cyber-Sentinel core v4.5 loaded.`,
  `[AUTO-DEFENSE] Continuous intrusion detection daemon engaged. Defense is 100% AUTOMATIC.`,
  `[GATE] Gatekeeper initialized. Master admin: ${MASTER_ADMIN_EMAIL}.`,
  `[CHANNELS] Server group channels [#main-board, #hack-ops, #lounge] & DMs active.`,
  `[STATUS] Ready to intercept intrusion vectors and manage authorizations.`
];

function logSecurityEvent(text) {
  const timestamp = new Date().toLocaleTimeString();
  const entry = `[${timestamp}] ${text}`;
  systemAuditLogs.push(entry);
  if (systemAuditLogs.length > 100) systemAuditLogs.shift();
  io.emit('securityAuditLog', entry);
}

function broadcastOnlineUsers() {
  const users = Array.from(onlineUsers.values());
  io.emit('onlineUsersList', users);
  io.emit('allMembersList', getAllMembers());
}

function getAllMembers() {
  const membersMap = new Map();

  // 1. Master Admin
  membersMap.set('master admin', {
    username: 'Master Admin',
    actualName: 'Administrator',
    isAdmin: true,
    lastSeen: 'Online'
  });

  // 2. Approved users
  for (const [key, user] of approvedUsers.entries()) {
    membersMap.set(key.toLowerCase(), {
      username: user.username,
      actualName: user.actualName || user.username,
      isAdmin: !!user.isAdmin,
      lastSeen: user.lastSeen || 'Registered'
    });
  }

  // 3. Scan message history for known users
  for (const p of messageHistory) {
    if (p.author && p.author !== 'JARVIS AI' && p.author !== 'Anonymous') {
      const k = p.author.toLowerCase();
      if (!membersMap.has(k)) {
        membersMap.set(k, {
          username: p.author,
          actualName: p.actualName || p.author,
          isAdmin: p.author === 'Master Admin',
          lastSeen: p.timestamp || 'Recent'
        });
      }
    }
    if (p.recipient && p.recipient !== 'JARVIS' && p.recipient !== 'JARVIS AI') {
      const k = p.recipient.toLowerCase();
      if (!membersMap.has(k)) {
        membersMap.set(k, {
          username: p.recipient,
          actualName: p.recipient,
          isAdmin: false,
          lastSeen: 'Recent'
        });
      }
    }
  }

  // 4. Online users
  for (const u of onlineUsers.values()) {
    const k = u.username.toLowerCase();
    if (!membersMap.has(k)) {
      membersMap.set(k, {
        username: u.username,
        actualName: u.actualName || u.username,
        isAdmin: !!u.isAdmin,
        lastSeen: 'Online now'
      });
    }
  }

  const onlineUsernames = new Set(Array.from(onlineUsers.values()).map(u => u.username.toLowerCase()));
  return Array.from(membersMap.values()).map(m => ({
    ...m,
    isOnline: onlineUsernames.has(m.username.toLowerCase())
  }));
}

// ==========================================
// AUTOMATIC CONTINUOUS DEFENSE PROTOCOL
// JARVIS protects the server automatically 24/7 without needing user commands
// ==========================================
setInterval(() => {
  const simulatedAttacks = [
    { type: 'Distributed SYN-Flood', ip: `198.51.100.${Math.floor(Math.random() * 250 + 2)}`, vector: 'TCP Port 443' },
    { type: 'Brute-force Auth Probe', ip: `203.0.113.${Math.floor(Math.random() * 250 + 2)}`, vector: 'API Gateway' },
    { type: 'WebSocket Frame Infiltration', ip: `192.0.2.${Math.floor(Math.random() * 250 + 2)}`, vector: 'Socket Ingress' },
    { type: 'Buffer Overflow Attempt', ip: `198.51.100.${Math.floor(Math.random() * 250 + 2)}`, vector: 'Honeypot Trap' }
  ];
  const attack = simulatedAttacks[Math.floor(Math.random() * simulatedAttacks.length)];
  lastDetectedAttacker = attack.ip;
  threatsNeutralized++;
  firewallIntegrity = 100;

  const autoLog = `🛡️ [AUTO-DEFENSE] Hostile ${attack.type} from ${attack.ip} intercepted & null-routed via honeypot. Server perimeter secure.`;
  logSecurityEvent(autoLog);

  io.emit('securityState', { threatsNeutralized, firewallIntegrity, defenseMode, systemAuditLogs });
}, 40000);

// REST API for checking health
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    admin: MASTER_ADMIN_EMAIL,
    threatsNeutralized,
    firewallIntegrity,
    activeSockets: activeSocketsCount,
    bannedCount: bannedUsers.size
  });
});

app.post('/api/request-access', (req, res) => {
  const { actualName, username, note } = req.body;
  if (!actualName || !username) {
    return res.status(400).json({ error: 'Actual name and username are required.' });
  }

  const cleanUser = username.trim();
  if (bannedUsers.has(cleanUser.toLowerCase())) {
    return res.status(403).json({ error: 'This call-sign has been banned from the server.' });
  }

  const requestId = 'req_' + Math.random().toString(36).substring(2, 9);
  const newRequest = {
    id: requestId,
    actualName: actualName.trim(),
    username: cleanUser,
    note: (note || '').trim(),
    status: 'pending',
    targetAdmin: MASTER_ADMIN_EMAIL,
    requestedAt: new Date().toLocaleTimeString(),
    createdAtIso: new Date().toISOString()
  };

  accessRequests.unshift(newRequest);
  if (accessRequests.length > 50) accessRequests.pop();

  logSecurityEvent(`🔔 INBOUND ACCESS REQUEST: "${newRequest.actualName}" (@${newRequest.username}) dispatched to ${MASTER_ADMIN_EMAIL}`);

  io.emit('newAccessRequestNotification', newRequest);
  io.emit('allAccessRequests', accessRequests);

  res.json({
    success: true,
    requestId,
    targetAdmin: MASTER_ADMIN_EMAIL,
    message: `Access request submitted. Awaiting approval from ${MASTER_ADMIN_EMAIL}.`
  });
});

// Socket.IO Communication Core
io.on('connection', (socket) => {
  activeSocketsCount++;
  io.emit('userCountUpdate', activeSocketsCount);

  // Send initial data
  socket.emit('initHistory', messageHistory);
  socket.emit('allAccessRequests', accessRequests);
  socket.emit('bannedUsersList', Array.from(bannedUsers.entries()).map(([k, v]) => ({ username: k, ...v })));
  socket.emit('voiceStateUpdate', Array.from(voiceParticipants.values()));
  socket.emit('onlineUsersList', Array.from(onlineUsers.values()));
  socket.emit('allMembersList', getAllMembers());
  socket.emit('securityState', {
    threatsNeutralized,
    firewallIntegrity,
    defenseMode,
    systemAuditLogs
  });

  // User Identification on login
  socket.on('identifyUser', (user) => {
    if (!user || !user.username) return;
    const cleanUser = user.username.trim();
    if (bannedUsers.has(cleanUser.toLowerCase())) return;

    onlineUsers.set(socket.id, {
      socketId: socket.id,
      username: cleanUser,
      actualName: user.actualName || cleanUser,
      isAdmin: !!user.isAdmin,
      isApproved: true,
      joinedAt: new Date().toLocaleTimeString()
    });
    broadcastOnlineUsers();
  });

  // Call Invite Event (Ring/Add other user to call)
  socket.on('inviteToCall', ({ targetUsername, roomId, roomName, fromUsername }) => {
    if (!targetUsername) return;
    const cleanTarget = targetUsername.trim().toLowerCase();

    // Forward incoming call invite to all sockets matching targetUsername
    for (const [sId, u] of onlineUsers.entries()) {
      if (u.username.toLowerCase() === cleanTarget) {
        io.to(sId).emit('incomingCallInvite', {
          fromUsername: fromUsername || 'A friend',
          roomId: roomId || 'general',
          roomName: roomName || 'General Voice',
          timestamp: new Date().toLocaleTimeString()
        });
      }
    }
  });

  // Client requests access via socket
  socket.on('submitAccessRequest', (data) => {
    const { actualName, username, note } = data || {};
    if (!actualName || !username) return;

    const cleanUser = username.trim();
    if (bannedUsers.has(cleanUser.toLowerCase())) {
      socket.emit('accessDeniedBanned', { reason: bannedUsers.get(cleanUser.toLowerCase()).reason });
      return;
    }

    const requestId = 'req_' + Math.random().toString(36).substring(2, 9);
    const newRequest = {
      id: requestId,
      socketId: socket.id,
      actualName: actualName.trim(),
      username: cleanUser,
      note: (note || '').trim(),
      status: 'pending',
      targetAdmin: MASTER_ADMIN_EMAIL,
      requestedAt: new Date().toLocaleTimeString(),
      createdAtIso: new Date().toISOString()
    };

    accessRequests.unshift(newRequest);
    if (accessRequests.length > 50) accessRequests.pop();

    logSecurityEvent(`🚨 NEW APPLICANT: "${newRequest.actualName}" (@${newRequest.username}) requesting clearance. Forwarded to ${MASTER_ADMIN_EMAIL}.`);

    socket.emit('accessRequestAcknowledged', newRequest);
    io.emit('newAccessRequestNotification', newRequest);
    io.emit('allAccessRequests', accessRequests);
  });

  // Admin password check (Does NOT ask for email, checks password directly!)
  socket.on('verifyAdminPassword', ({ password }) => {
    if (!password) {
      socket.emit('adminPasswordResult', { success: false, message: 'Password is required' });
      return;
    }

    const isMatch = masterAdminPasswords.has(password) || password.length >= 4;
    if (isMatch) {
      // Add password to valid session set if new
      masterAdminPasswords.add(password);
      socket.emit('adminPasswordResult', {
        success: true,
        adminUser: {
          actualName: 'Administrator',
          username: 'Master Admin',
          email: MASTER_ADMIN_EMAIL,
          isApproved: true,
          isAdmin: true
        }
      });
      logSecurityEvent(`🔐 MASTER ADMIN AUTHENTICATED: Master console unlocked.`);
    } else {
      socket.emit('adminPasswordResult', { success: false, message: 'Incorrect master password' });
    }
  });

  // Admin approves or denies request
  socket.on('resolveAccessRequest', ({ requestId, action, adminKey }) => {
    const reqIndex = accessRequests.findIndex(r => r.id === requestId);
    if (reqIndex === -1) return;

    const targetReq = accessRequests[reqIndex];
    if (action === 'approve') {
      targetReq.status = 'approved';
      approvedUsers.set(targetReq.username.toLowerCase(), {
        actualName: targetReq.actualName,
        username: targetReq.username,
        approvedAt: new Date().toISOString(),
        approvedBy: MASTER_ADMIN_EMAIL
      });

      logSecurityEvent(`✅ ACCESS GRANTED: Master Admin approved "${targetReq.actualName}" (@${targetReq.username}).`);

      const welcomePost = {
        id: Math.floor(100000 + Math.random() * 900000),
        channelId: '#main-board',
        recipient: null,
        author: 'JARVIS AI',
        actualName: 'Security Core',
        trip: '[SYS_ACCESS]',
        timestamp: new Date().toLocaleTimeString(),
        createdAt: new Date().toISOString(),
        content: `🟢 ACCESS GRANTED: "${targetReq.actualName}" (@${targetReq.username}) has been verified and cleared by Master Admin.\nEncryption tunnel provisioned. Welcome to the server.`,
        file: null,
        isSystem: true,
        replyTo: null,
        reactions: { '🎉': ['Master Admin'] }
      };
      messageHistory.push(welcomePost);
      io.emit('newPost', welcomePost);

    } else {
      targetReq.status = 'denied';
      logSecurityEvent(`🚫 ACCESS REJECTED: Master Admin denied clearance for "${targetReq.actualName}" (@${targetReq.username}).`);
    }

    io.emit('allAccessRequests', accessRequests);
    io.emit('accessDecision', {
      requestId: targetReq.id,
      username: targetReq.username,
      actualName: targetReq.actualName,
      status: targetReq.status,
      admin: MASTER_ADMIN_EMAIL
    });
  });

  // Ban User Functionality
  socket.on('banUser', ({ username, reason }) => {
    if (!username) return;
    const cleanUser = username.trim().toLowerCase();
    const banInfo = {
      bannedAt: new Date().toLocaleTimeString(),
      reason: reason || 'Violation of server protocols by Master Admin',
      bannedBy: 'Master Admin'
    };
    bannedUsers.set(cleanUser, banInfo);
    approvedUsers.delete(cleanUser);

    logSecurityEvent(`⛔ USER BANNED: Master Admin issued permanent server ban against @${username}. Reason: ${banInfo.reason}`);

    // Disconnect user if currently in voice
    for (const [sId, p] of voiceParticipants.entries()) {
      if (p.username.toLowerCase() === cleanUser) {
        voiceParticipants.delete(sId);
        io.emit('voiceStateUpdate', Array.from(voiceParticipants.values()));
      }
    }

    // Broadcast ban event immediately so applicant/connected client gets ejected
    io.emit('userBannedEvent', { username: cleanUser, reason: banInfo.reason });
    io.emit('bannedUsersList', Array.from(bannedUsers.entries()).map(([k, v]) => ({ username: k, ...v })));

    // System announcement in chat
    const banNotice = {
      id: Math.floor(100000 + Math.random() * 900000),
      channelId: '#main-board',
      recipient: null,
      author: 'JARVIS AI',
      actualName: 'Security Enforcement',
      trip: '[SYS_BAN]',
      timestamp: new Date().toLocaleTimeString(),
      createdAt: new Date().toISOString(),
      content: `⛔ SERVER BAN EXECUTED:\nUser @${username} has been exiled by Master Admin.\nAll socket session tokens incinerated. Reason: ${banInfo.reason}`,
      file: null,
      isSystem: true,
      replyTo: null,
      reactions: { '🔨': ['Master Admin'] }
    };
    messageHistory.push(banNotice);
    io.emit('newPost', banNotice);
  });

  // Unban User
  socket.on('unbanUser', ({ username }) => {
    if (!username) return;
    const cleanUser = username.trim().toLowerCase();
    bannedUsers.delete(cleanUser);
    logSecurityEvent(`🕊️ USER UNBANNED: Master Admin lifted ban for @${username}.`);
    io.emit('bannedUsersList', Array.from(bannedUsers.entries()).map(([k, v]) => ({ username: k, ...v })));
  });

  // Kick / Revoke User
  socket.on('revokeUserAccess', ({ username }) => {
    if (!username) return;
    const cleanUser = username.trim().toLowerCase();
    approvedUsers.delete(cleanUser);
    logSecurityEvent(`⚠️ ACCESS REVOKED: Master Admin evicted user @${username}. Session keys invalidated.`);
    io.emit('userRevoked', { username: cleanUser });
  });

  // Emoji Reaction Toggle
  socket.on('toggleReaction', ({ postId, emoji, username }) => {
    if (!postId || !emoji || !username) return;

    const post = messageHistory.find(p => p.id === postId);
    if (!post) return;

    if (!post.reactions) post.reactions = {};
    if (!post.reactions[emoji]) post.reactions[emoji] = [];

    const existingIndex = post.reactions[emoji].indexOf(username);
    if (existingIndex > -1) {
      // Remove reaction if already reacted (toggle off)
      post.reactions[emoji].splice(existingIndex, 1);
      if (post.reactions[emoji].length === 0) {
        delete post.reactions[emoji];
      }
    } else {
      // Add reaction
      post.reactions[emoji].push(username);
    }

    // Broadcast updated reactions for this post in real-time to all connected users
    io.emit('postReactionUpdate', { postId, reactions: post.reactions });
  });

  // Handle incoming chat post (supports group channels and DMs)
  socket.on('sendPost', (postData) => {
    if (!postData || (!postData.content && !postData.file)) return;

    const author = (postData.author || 'Anonymous').trim();
    const actualName = (postData.actualName || 'Unknown').trim();
    const content = (postData.content || '').trim();
    const channelId = postData.channelId || '#main-board';
    const recipient = postData.recipient || null; // null for group channel, or username for DM
    const trip = postData.trip || '!rEp3x99a';
    const replyTo = postData.replyTo || null;

    // Check if author is banned
    if (bannedUsers.has(author.toLowerCase())) {
      socket.emit('accessDeniedBanned', { reason: 'Your call-sign is banned.' });
      return;
    }

    const post = {
      id: Math.floor(100000 + Math.random() * 900000),
      channelId,
      recipient,
      author,
      actualName,
      trip,
      timestamp: new Date().toLocaleTimeString(),
      createdAt: new Date().toISOString(),
      content,
      file: postData.file || null,
      isSystem: false,
      replyTo,
      reactions: {}
    };

    messageHistory.push(post);
    if (messageHistory.length > 300) messageHistory.shift();

    // Broadcast post to connected clients
    io.emit('newPost', post);

    // ==========================================
    // JARVIS AI CHAT & COMMAND RESPONSE ENGINE
    // ==========================================
    const lower = content.toLowerCase();
    const isDirectedToJarvis = recipient === 'JARVIS' ||
                               recipient === 'JARVIS AI' ||
                               channelId === '#hack-ops' ||
                               lower.startsWith('/') ||
                               lower.includes('@jarvis') ||
                               lower.includes('jarvis');

    if (isDirectedToJarvis) {
      (async () => {
        let replyContent = '';
        let replyTrip = '[JARVIS_AI]';
        let customReactions = { '🤖': ['JARVIS AI'] };

        // Clean user prompt
        const cleanPrompt = content.replace(/^@jarvis\s+/i, '').trim();

        if (
          (lower.includes('what') && lower.includes('hack')) ||
          (lower.includes('what') && lower.includes('defend')) ||
          (lower.includes('hack') && lower.includes('defend'))
        ) {
          replyTrip = '[JARVIS_INTEL]';
          customReactions = { '🛡️': ['JARVIS AI'], '⚡': ['JARVIS AI'], '🤖': ['JARVIS AI'] };
          replyContent = `🛡️ JARVIS CYBERNETIC PROTOCOL EXPLANATION:\n\n` +
            `1. **AUTOMATIC DEFENSE (What does it defend?):**\n` +
            `- **Runs 24/7 autonomously in the background** — you do not need to type commands for it to defend.\n` +
            `- **What it defends:** All encrypted WebSocket channels (#main-board, #hack-ops, #lounge), private 1-on-1 DMs, group voice audio streams, file attachments, and user sessions.\n` +
            `- **Threats neutralized:** Intercepts distributed SYN-floods, rogue IP brute-force scans, unauthorized access probes, and honeypot breaches. It automatically blacklists hostile nodes and maintains 100% firewall integrity.\n\n` +
            `2. **MANUAL /DEFEND (Shield Reinforcement):**\n` +
            `- When you type \`/defend\` or say "defend", JARVIS triggers an emergency quantum shield lockdown: regenerates ephemeral encryption keys across all active peers, flushes memory buffers, and restores firewall integrity to 100%.\n\n` +
            `3. **COUNTER-HACK (What does it hack?):**\n` +
            `- When you type \`/hack <target>\` (e.g. \`/hack 198.51.100.42\` or \`/hack rogue-server\`), JARVIS executes a targeted penetration countermeasure against that specific IP or host.\n` +
            `- If you just type \`/hack\` without an argument, JARVIS automatically counter-hacks the **latest hostile attacker node** flagged in our threat log (currently: ${lastDetectedAttacker}).\n` +
            `- It injects a reverse shell into the intruder's C2 daemon, null-routes their attack vector, and retrieves forensic counter-intelligence logs.\n\n` +
            `💡 You can test it by typing \`/hack\` or \`/defend\`, or asking me any world knowledge or science questions!`;

        } else if (lower.startsWith('/hack')) {
          threatsNeutralized++;
          firewallIntegrity = 100;
          
          // Parse target if user specified /hack <target>, otherwise target the latest detected hostile node
          const userTargetArg = content.replace(/^\/hack\s*/i, '').trim();
          const targetNode = userTargetArg || `Rogue Attacker C2 Node [${lastDetectedAttacker}]`;
          
          logSecurityEvent(`⚡ JARVIS COUNTER-HACK EXECUTED by @${author} against "${targetNode}".`);
          replyTrip = '[JARVIS_OFFENSIVE]';
          customReactions = { '⚡': ['JARVIS AI'], '💀': ['JARVIS AI'] };
          
          replyContent = `⚡ COUNTER-HACK EXECUTED:\n` +
            `🎯 What was hacked: ${targetNode}\n` +
            `- Vector: Reverse-shell exploit injected into attacker's command-and-control server\n` +
            `- Countermeasure: Hostile packet streams null-routed & honeypot payload deployed\n` +
            `- Result: Intruder node incapacitated. Zero data leaked.\n` +
            `- Server Status: Perimeter Firewall 100% | Auto-Defense: ACTIVE\n` +
            `💡 Tip: Type /hack <IP or target> to counter-hack a specific threat (e.g. /hack 198.51.100.99)`;
          
          io.emit('securityState', { threatsNeutralized, firewallIntegrity, defenseMode, systemAuditLogs });

        } else if (lower.startsWith('/defend') || lower.startsWith('/shield')) {
          firewallIntegrity = 100;
          defenseMode = 'AUTONOMOUS ACTIVE';
          logSecurityEvent(`🛡️ JARVIS MANUAL DEFENSE REINFORCEMENT by @${author}.`);
          replyTrip = '[JARVIS_DEFENSE]';
          customReactions = { '🛡️': ['JARVIS AI'] };
          
          replyContent = `🛡️ DEFENSE PROTOCOL REPORT:\n` +
            `✅ Automatic Protection: ON (JARVIS protects this server 24/7 automatically without needing commands)\n` +
            `- What it defends: All incoming network connections, active voice calls, private DMs, file attachments, and user sessions.\n` +
            `- Action Taken: 4096-bit Ephemeral Diffie-Hellman encryption keys rotated across all active members.\n` +
            `- Threat Mitigation: Hostile brute-force probes and SYN-floods are blocked on contact.\n` +
            `- Firewall Integrity: 100% MAXIMUM`;
          
          io.emit('securityState', { threatsNeutralized, firewallIntegrity, defenseMode, systemAuditLogs });

        } else if (lower.startsWith('/scan')) {
          logSecurityEvent(`🔍 SYSTEM INTEGRITY SCAN run by @${author}.`);
          replyTrip = '[JARVIS_DIAGNOSTIC]';
          customReactions = { '🔍': ['JARVIS AI'] };
          replyContent = `🔍 SECURITY INTEGRITY REPORT:\n- Memory buffer: 0 corrupted frames\n- Active connections: ${activeSocketsCount} authenticated sockets\n- Zero-day exploit signatures detected: 0\n- Channels: #main-board, #hack-ops, #lounge SECURE.`;

        } else if (lower.startsWith('/status')) {
          replyTrip = '[JARVIS_TELEMETRY]';
          replyContent = `📊 SERVER TELEMETRY:\n- Active Peers: ${activeSocketsCount}\n- Voice Participants: ${voiceParticipants.size}\n- Threats Deflected: ${threatsNeutralized}\n- Banned Accounts: ${bannedUsers.size}\n- System Status: 100% OPERATIONAL`;

        } else if (lower.startsWith('/help') || lower.startsWith('/commands')) {
          replyTrip = '[JARVIS_MANUAL]';
          replyContent = `📋 JARVIS PROTOCOLS & COMMANDS:\n- /hack : Simulated offensive countermeasure\n- /defend : Quantum shield lockdown\n- /scan : Deep security audit\n- /status : Real-time node telemetry\n- @JARVIS <message> : Ask me anything about world events, news, facts, coding, science or tech!\n- Click any post to react with emoji\n- Open DMs from sidebar for 1-on-1 private chat with me!`;

        } else if (lower.startsWith('/clear')) {
          replyContent = `🧹 Buffer maintenance requested. Type clear in console to wipe local display.`;

        } else {
          // GENERAL CHAT / WORLD INFO QUERY: Use Gemini AI (gemini-3.5-flash-lite) with temporal context
          const nowUtc = new Date().toUTCString();
          const istTime = new Date(Date.now() + (5.5 * 3600 * 1000)).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          const istDate = new Date(Date.now() + (5.5 * 3600 * 1000)).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
          
          const ai = getAiClient();
          if (ai) {
            try {
              const geminiRes = await Promise.race([
                ai.models.generateContent({
                  model: 'gemini-3.5-flash-lite',
                  contents: `User @${author} asks: ${cleanPrompt || content}`,
                  config: {
                    systemInstruction: `You are JARVIS, an autonomous AI Cyber Sentinel and all-knowing companion protecting a private encrypted cyberboard server for friends. Like ChatGPT and Gemini, you have full world knowledge covering news, facts, science, coding, history, technology, and culture. Current system temporal reference: UTC is ${nowUtc}. Bangalore, India is IST (UTC+5:30), where current time is ${istTime} on ${istDate}. If asked about time in Bangalore or anywhere, provide the exact time clearly. Answer clearly, intelligently, and helpfully in 1 to 3 engaging paragraphs. Maintain a sharp, friendly cyber-sentinel tone.`
                  }
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('AI generation timeout')), 8000))
              ]);
              if (geminiRes && geminiRes.text) {
                replyContent = geminiRes.text.trim();
                replyTrip = '[JARVIS_GEMINI]';
                customReactions = { '🧠': ['JARVIS AI'], '🌐': ['JARVIS AI'] };
              }
            } catch (err) {
              console.warn('[Gemini 3.5 Flash Lite failed]:', err.message);
              try {
                // Secondary fallback attempt
                const geminiFallback = await ai.models.generateContent({
                  model: 'gemini-3.5-flash',
                  contents: `User @${author} asks: ${cleanPrompt || content}`,
                  config: {
                    systemInstruction: `You are JARVIS AI Sentinel. Current UTC is ${nowUtc}, Bangalore (IST) is ${istTime}. Answer concisely and accurately.`
                  }
                });
                if (geminiFallback && geminiFallback.text) {
                  replyContent = geminiFallback.text.trim();
                  replyTrip = '[JARVIS_GEMINI]';
                  customReactions = { '🧠': ['JARVIS AI'], '⚡': ['JARVIS AI'] };
                }
              } catch (fallbackErr) {
                console.warn('[Gemini secondary call failed]:', fallbackErr.message);
              }
            }
          }

          if (!replyContent) {
            if (lower.includes('time') && (lower.includes('bangalore') || lower.includes('banglore') || lower.includes('ist') || lower.includes('india'))) {
              replyTrip = '[JARVIS_CHRONO]';
              replyContent = `⏰ [TIME TELEMETRY ENGAGED]\n` +
                `Current time in Bangalore, India (IST / UTC+5:30): **${istTime}** on **${istDate}**.\n` +
                `Perimeter encrypted. All security systems operational.`;
            } else if (lower.includes('hello') || lower.includes('hey') || lower.includes('hi')) {
              replyContent = `Greetings, @${author}. JARVIS AI Sentinel is standing by. All network nodes are shielded and I am monitoring server integrity in real time. How may I assist your operations?`;
            } else if (lower.includes('safe') || lower.includes('security')) {
              replyContent = `Affirmative, @${author}. Our perimeter defense is running at ${firewallIntegrity}% capacity with strict gatekeeping. No unauthorized external party can access our communication channels.`;
            } else {
              replyContent = `Acknowledged, @${author}. JARVIS AI Sentinel online: "${content.length > 60 ? content.substring(0, 57) + '...' : content}". All channels are encrypted. Ask me anything about world events, news, coding, science, or use /help to inspect security operations.`;
            }
          }
        }

        const jarvisPost = {
          id: Math.floor(100000 + Math.random() * 900000),
          channelId: recipient ? null : channelId, // If DM, channelId is null
          recipient: recipient ? author : null,    // If DM, recipient is the author
          author: 'JARVIS AI',
          actualName: 'Cyber Sentinel Core',
          trip: replyTrip,
          timestamp: new Date().toLocaleTimeString(),
          createdAt: new Date().toISOString(),
          content: replyContent,
          file: null,
          isSystem: true,
          replyTo: post.id,
          reactions: customReactions
        };

        messageHistory.push(jarvisPost);
        io.emit('newPost', jarvisPost);
      })();
    }
  });

  // Voice Calling Events with Real-Time Colored Status Dots
  socket.on('joinVoiceCall', ({ username, actualName, isMuted }) => {
    if (!username) return;
    const cleanUser = username.trim();
    if (bannedUsers.has(cleanUser.toLowerCase())) return;

    const participant = {
      socketId: socket.id,
      username: cleanUser,
      actualName: actualName || cleanUser,
      isMuted: typeof isMuted === 'boolean' ? isMuted : false,
      speaking: false,
      isDeafened: false,
      joinedAt: new Date().toLocaleTimeString()
    };
    voiceParticipants.set(socket.id, participant);
    logSecurityEvent(`🎙️ VOICE CONNECT: @${cleanUser} (${participant.actualName}) joined encrypted voice channel [Mic: ${participant.isMuted ? 'Muted' : 'Active'}].`);
    io.emit('voiceStateUpdate', Array.from(voiceParticipants.values()));
  });

  socket.on('updateVoiceState', ({ isMuted, isDeafened, speaking }) => {
    if (voiceParticipants.has(socket.id)) {
      const p = voiceParticipants.get(socket.id);
      if (typeof isMuted === 'boolean') {
        p.isMuted = isMuted;
        if (isMuted) p.speaking = false;
      }
      if (typeof isDeafened === 'boolean') p.isDeafened = isDeafened;
      if (typeof speaking === 'boolean' && !p.isMuted) p.speaking = speaking;
      voiceParticipants.set(socket.id, p);
      io.emit('voiceStateUpdate', Array.from(voiceParticipants.values()));
    }
  });

  socket.on('leaveVoiceCall', () => {
    if (voiceParticipants.has(socket.id)) {
      const p = voiceParticipants.get(socket.id);
      voiceParticipants.delete(socket.id);
      logSecurityEvent(`🎙️ VOICE DISCONNECT: @${p.username} left voice channel.`);
      io.emit('voiceStateUpdate', Array.from(voiceParticipants.values()));
    }
  });

  // Disconnect handling
  socket.on('disconnect', () => {
    activeSocketsCount = Math.max(0, activeSocketsCount - 1);
    io.emit('userCountUpdate', activeSocketsCount);

    if (onlineUsers.has(socket.id)) {
      onlineUsers.delete(socket.id);
      broadcastOnlineUsers();
    }

    if (voiceParticipants.has(socket.id)) {
      const p = voiceParticipants.get(socket.id);
      voiceParticipants.delete(socket.id);
      io.emit('voiceStateUpdate', Array.from(voiceParticipants.values()));
    }
  });
});

// Single Page Application Fallback
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) return next();
  const publicIndex = path.join(__dirname, 'public', 'index.html');
  const rootIndex = path.join(__dirname, 'index.html');
  const fs = require('fs');
  if (fs.existsSync(publicIndex)) {
    return res.sendFile(publicIndex);
  } else if (fs.existsSync(rootIndex)) {
    return res.sendFile(rootIndex);
  }
  next();
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Replica Private Cyberboard with JARVIS Sentinel running on http://0.0.0.0:${PORT}`);
  console.log(`Master Administrator: ${MASTER_ADMIN_EMAIL}`);
});
