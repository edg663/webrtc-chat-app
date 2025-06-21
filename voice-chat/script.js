console.log("脚本 v17 (最终毕业版) 开始执行");

const socket = io();

// --- 获取所有页面元素 ---
const myIdElement = document.getElementById('my-id');
const peerIdInput = document.getElementById('peer-id-input');
const peerIdDisplay = document.getElementById('peer-id-display');
const connectButton = document.getElementById('connect-button');
const voiceCallButton = document.getElementById('voice-call-button');
const endSessionButton = document.getElementById('end-session-button');
const muteButton = document.getElementById('mute-button');
const callTimerUI = document.getElementById('call-timer');
const timerDisplay = document.getElementById('timer-display');
const chatContainer = document.getElementById('chat-container');
const messages = document.getElementById('messages');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const connectionUI = document.getElementById('connection-ui');
const sessionUI = document.getElementById('session-ui');

// --- 全局状态变量 ---
let peerConnection;
let localStream;
let callTimerInterval;
let targetPeerId;
let isMuted = false;

const configuration = { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] };

// --- 核心函数 ---
async function getMicPermission() { if (localStream) return true; try { localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false }); return true; } catch (error) { alert('无法获取麦克风，请检查权限和设备。'); return false; } }
function createPeerConnection(peerId) {
    targetPeerId = peerId;
    peerConnection = new RTCPeerConnection(configuration);
    peerConnection.onicecandidate = (event) => { if (event.candidate) { socket.emit('ice-candidate', { to: targetPeerId, candidate: event.candidate }); } };
    peerConnection.ontrack = (event) => { const remoteAudio = new Audio(); remoteAudio.srcObject = event.streams[0]; remoteAudio.play().catch(e => console.error("远程音频播放失败:", e)); };
    peerConnection.onconnectionstatechange = () => {
        if (!peerConnection) return;
        if (peerConnection.connectionState === 'connected') { startCallTimer(); muteButton.classList.remove('hidden'); voiceCallButton.disabled = true; }
        if (['disconnected', 'failed', 'closed'].includes(peerConnection.connectionState)) { endSession(false); }
    };
    localStream.getTracks().forEach(track => { peerConnection.addTrack(track, localStream); });
}

function endSession(isInitiator = true, alertMessage = "会话已结束。") {
    if (isInitiator && targetPeerId) { socket.emit('session-end', { to: targetPeerId }); }
    if (peerConnection) { peerConnection.close(); peerConnection = null; }
    stopCallTimer();
    chatContainer.classList.add('hidden');
    sessionUI.classList.add('hidden');
    connectionUI.classList.remove('hidden');
    muteButton.classList.add('hidden');
    voiceCallButton.disabled = false;
    messages.innerHTML = '';
    targetPeerId = null;
    if (alertMessage) { alert(alertMessage); }
}

// --- UI 和辅助函数 ---
function startCallTimer() { callTimerUI.classList.remove('hidden'); let startTime = Date.now(); callTimerInterval = setInterval(() => { const seconds = Math.floor((Date.now() - startTime) / 1000); const mins = Math.floor(seconds / 60).toString().padStart(2, '0'); const secs = (seconds % 60).toString().padStart(2, '0'); timerDisplay.textContent = `<span class="math-inline">\{mins\}\:</span>{secs}`; }, 1000); }
function stopCallTimer() { clearInterval(callTimerInterval); callTimerUI.classList.add('hidden'); timerDisplay.textContent = '00:00'; }
function addChatMessage(message, from, isMe) { const item = document.createElement('li'); item.textContent = message; item.classList.add(isMe ? 'me' : 'other'); messages.appendChild(item); messages.scrollTop = messages.scrollHeight; }
function startTextChatSession(peerId) { targetPeerId = peerId; peerIdDisplay.textContent = peerId; connectionUI.classList.add('hidden'); sessionUI.classList.remove('hidden'); chatContainer.classList.remove('hidden'); }

// --- Socket.IO 事件监听 ---
socket.on('connect', () => { myIdElement.textContent = socket.id; });
socket.on('session-start', (data) => { if (targetPeerId) return; startTextChatSession(data.from); });
socket.on('session-end', (data) => { endSession(false); });
socket.on('peer-disconnected', () => { endSession(false, "对方已断开连接。"); });
socket.on('connection-failed', (data) => { alert(`连接失败：${data.reason}`); endSession(false, null); });

socket.on('offer', async (data) => {
    if (peerConnection) return;
    if (!targetPeerId) { startTextChatSession(data.from); }
    const permissionGranted = await getMicPermission();
    if (!permissionGranted) { alert("对方发起语音通话，但你没有麦克风权限。"); return; }
    createPeerConnection(data.from);
    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('answer', { to: data.from, answer: answer });
    } catch (error) { endSession(false); }
});

socket.on('answer', async (data) => { if (peerConnection) { await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer)); } });
socket.on('ice-candidate', async (data) => { if (peerConnection && data.candidate) { await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate)); } });
socket.on('private message', (data) => { if (!targetPeerId) { startTextChatSession(data.from); } addChatMessage(data.text, data.from, false); });

// --- 页面按钮事件监听 ---
connectButton.addEventListener('click', () => {
    const peerId = peerIdInput.value.trim();
    if (peerId === myIdElement.textContent) { alert("不能和自己建立会话！"); return; }
    if (!peerId) { alert('请输入对方的ID'); return; }
    // [重要修复] A点击连接后，A和B的界面都应该同步更新
    startTextChatSession(peerId);
    socket.emit('session-start', { to: peerId });
});

voiceCallButton.addEventListener('click', async () => {
    const permissionGranted = await getMicPermission();
    if (!permissionGranted) return;
    if (!targetPeerId) return alert('错误：没有指定通话对象');
    createPeerConnection(targetPeerId);
    try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('offer', { to: targetPeerId, offer: offer });
    } catch (error) { endSession(false); }
});

endSessionButton.addEventListener('click', () => endSession(true, null));

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value;
    if (text && targetPeerId) {
        socket.emit('private message', { to: targetPeerId, text: text });
        addChatMessage(text, socket.id, true);
        chatInput.value = '';
    }
});

muteButton.addEventListener('click', () => {
    if (!localStream) return;
    isMuted = !isMuted;
    const audioTracks = localStream.getAudioTracks();
    if (audioTracks.length > 0) {
        audioTracks[0].enabled = !isMuted;
    }
    muteButton.textContent = isMuted ? "🎙️ 取消静音" : "🎤 静音";
});
