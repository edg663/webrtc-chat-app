console.log("脚本 v6 开始执行");

const socket = io();

// --- 获取页面元素 ---
const myIdElement = document.getElementById('my-id');
const peerIdInput = document.getElementById('peer-id-input');
const callButton = document.getElementById('call-button');
const hangupButton = document.getElementById('hangup-button');
const incomingCallUI = document.getElementById('incoming-call');
const mainUI = document.getElementById('main-ui');
const callerIdElement = document.getElementById('caller-id');
const answerButton = document.getElementById('answer-button');
const rejectButton = document.getElementById('reject-button');
const ringtone = document.getElementById('ringtone');
const callTimerUI = document.getElementById('call-timer');
const timerDisplay = document.getElementById('timer-display');


// --- 全局状态变量 ---
let peerConnection;
let localStream;
let remoteStream;
let originalTitle = document.title;
let blinkInterval;
let callTimerInterval;


const configuration = { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] };

// --- 核心函数 ---

async function initialize() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        callButton.disabled = false;
    } catch (error) {
        alert('无法获取麦克风，请检查权限和设备。');
    }
}

function createPeerConnection(targetSocketId) {
    peerConnection = new RTCPeerConnection(configuration);
    peerConnection.onicecandidate = (event) => { if (event.candidate) { socket.emit('ice-candidate', { to: targetSocketId, candidate: event.candidate }); } };
    peerConnection.ontrack = (event) => {
        remoteStream = event.streams[0];
        const remoteAudio = new Audio();
        remoteAudio.srcObject = remoteStream;
        remoteAudio.play().catch(e => console.error("远程音频播放失败:", e));
    };
    peerConnection.onconnectionstatechange = () => {
        if (!peerConnection) return;
        console.log(`WebRTC 连接状态变更: ${peerConnection.connectionState}`);
        if (peerConnection.connectionState === 'connected') {
            startCallTimer();
        }
        if (['disconnected', 'failed', 'closed'].includes(peerConnection.connectionState)) {
            handleHangup(false);
        }
    };
    localStream.getTracks().forEach(track => { peerConnection.addTrack(track, localStream); });
}

function handleHangup(isInitiator = true) {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    stopCallTimer();
    callButton.disabled = false;
    hangupButton.disabled = true;
    peerIdInput.value = '';
}

function resetIncomingCallUI() {
    incomingCallUI.classList.add('hidden');
    mainUI.style.filter = 'none';
    ringtone.pause();
    ringtone.currentTime = 0;
    clearInterval(blinkInterval);
    document.title = originalTitle;
}

// --- 计时器相关函数 ---
function startCallTimer() {
    callTimerUI.classList.remove('hidden');
    let startTime = Date.now();
    callTimerInterval = setInterval(() => {
        const seconds = Math.floor((Date.now() - startTime) / 1000);
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        timerDisplay.textContent = `${mins}:${secs}`;
    }, 1000);
}

function stopCallTimer() {
    clearInterval(callTimerInterval);
    callTimerUI.classList.add('hidden');
    timerDisplay.textContent = '00:00';
}


// --- Socket.IO 事件监听 ---
socket.on('connect', () => { myIdElement.textContent = socket.id; });

socket.on('offer', (data) => {
    if (peerConnection) return;
    const targetSocketId = data.from;
    peerIdInput.value = targetSocketId;
    callerIdElement.textContent = targetSocketId;
    incomingCallUI.classList.remove('hidden');
    mainUI.style.filter = 'blur(4px)';
    try {
        ringtone.load();
        const playPromise = ringtone.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => { console.warn("铃声自动播放失败:", error); });
        }
    } catch (e) { console.error("尝试播放铃声时发生意外错误:", e); }
    let isBlinking = false;
    blinkInterval = setInterval(() => {
        document.title = isBlinking ? originalTitle : "【您有新的来电】";
        isBlinking = !isBlinking;
    }, 1000);
    
    answerButton.onclick = async () => {
        resetIncomingCallUI();
        createPeerConnection(targetSocketId);
        try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socket.emit('answer', { to: targetSocketId, answer: answer });
            callButton.disabled = true;
            hangupButton.disabled = false;
        } catch (error) { handleHangup(false); }
    };
    rejectButton.onclick = () => { resetIncomingCallUI(); };
});

socket.on('answer', async (data) => {
    if (peerConnection) { await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer)); }
});
socket.on('ice-candidate', async (data) => {
    if (peerConnection && data.candidate) { await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate)); }
});

// --- 页面按钮事件监听 ---
callButton.addEventListener('click', async () => {
    const targetSocketId = peerIdInput.value;
    if (!targetSocketId) return alert('请输入对方的ID');
    createPeerConnection(targetSocketId);
    try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('offer', { to: targetSocketId, offer: offer });
        callButton.disabled = true;
        hangupButton.disabled = false;
    } catch (error) { handleHangup(false); }
});
hangupButton.addEventListener('click', () => handleHangup(true));

// --- 脚本初始化 ---
callButton.disabled = true;
hangupButton.disabled = true;
initialize();
