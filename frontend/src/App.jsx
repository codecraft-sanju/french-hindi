import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, Globe, Send, User, Settings, MonitorUp, Circle, Wifi, Clock, X, Copy, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react'; // NEW: Added CheckCircle2 and ShieldAlert icons
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import io from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
const socket = io(BACKEND_URL);

const uiText = {
  hi: {
    title: "Dealit AI Call",
    subtitle: "रीयल-टाइम अनुवाद सेटअप",
    uiLangLabel: "ऐप की भाषा चुनें",
    onboarding: "यह लिंक अपने दोस्त को भेजें। जब वे जुड़ेंगे, तो वीडियो और ऑटो-ट्रांसलेट चैट शुरू हो जाएगी।",
    copyLink: "लिंक कॉपी करें",
    copied: "लिंक कॉपी हो गया!",
    start: "कॉल शुरू करें",
    room: "रूम",
    waiting: "दोस्त का इंतज़ार है...",
    chatTitle: "लाइव चैट और अनुवाद",
    apiActive: "अनुवाद चालू है",
    typeHere: "मैसेज टाइप करें...",
    settings: "सेटिंग्स",
    myLang: "मेरी भाषा (बोलने के लिए)",
    save: "सेव करें",
    youSaid: "आपने कहा:",
    friendSaid: "उसने कहा:",
    camDenied: "कैमरा/माइक एक्सेस नहीं मिला",
    friendConn: "दोस्त जुड़ गया!",
    friendDisconn: "दोस्त चला गया",
    screenShareCancel: "स्क्रीन शेयर कैंसिल हुआ",
    // NEW: Added translation strings for the new UI elements
    featuresTitle: "सुविधाएं (Features)",
    featVideo: "एचडी वीडियो और ऑडियो",
    featChat: "लाइव चैट अनुवाद",
    featScreen: "स्क्रीन शेयरिंग",
    runTest: "सिस्टम चेक करें",
    testSuccess: "सब कुछ सही काम कर रहा है!",
    testFail: "सिस्टम चेक फेल हो गया। परमिशन चेक करें।"
  },
  fr: {
    title: "Dealit AI Appel",
    subtitle: "Configuration de traduction",
    uiLangLabel: "Langue de l'application",
    onboarding: "Envoyez ce lien à votre ami. Lorsqu'il rejoindra, la vidéo et le chat traduit automatiquement commenceront.",
    copyLink: "Copier le lien",
    copied: "Lien copié!",
    start: "Commencer l'appel",
    room: "Salle",
    waiting: "En attente de l'ami...",
    chatTitle: "Chat en direct",
    apiActive: "Traduction active",
    typeHere: "Tapez un message...",
    settings: "Paramètres",
    myLang: "Ma langue (pour parler)",
    save: "Enregistrer",
    youSaid: "Vous avez dit:",
    friendSaid: "A dit:",
    camDenied: "Accès caméra/micro refusé",
    friendConn: "Ami connecté!",
    friendDisconn: "Ami déconnecté",
    screenShareCancel: "Partage d'écran annulé",
    // NEW: Added translation strings for the new UI elements
    featuresTitle: "Caractéristiques",
    featVideo: "Vidéo et Audio HD",
    featChat: "Traduction en direct",
    featScreen: "Partage d'écran",
    runTest: "Tester le système",
    testSuccess: "Tout fonctionne parfaitement!",
    testFail: "Échec du test. Vérifiez les permissions."
  }
};

export default function App() {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const chatEndRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [remoteStreamActive, setRemoteStreamActive] = useState(false);
  
  // NEW: State for the system check button
  const [isTesting, setIsTesting] = useState(false);

  const [roomId, setRoomId] = useState("");
  const [uiLang, setUiLang] = useState("hi");
  const [myLanguage, setMyLanguage] = useState("hi");
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const recognitionRef = useRef(null);

  const t = uiText[uiLang];

  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      {
        urls: 'turn:your.turn.server.here:3478',
        username: 'your_turn_username',
        credential: 'your_turn_password'
      }
    ]
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = myLanguage === 'hi' ? 'hi-IN' : 'fr-FR';

      recognitionRef.current.onresult = (event) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript;
        if (transcript.trim()) {
          const messageData = {
            roomId,
            original: transcript,
            sourceLang: myLanguage
          };
          socket.emit('sendMessage', messageData);
        }
      };
    }
  }, [myLanguage, roomId]);

  useEffect(() => {
    if (isCallActive && !isMuted && recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error(error);
      }
    } else if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, [isCallActive, isMuted]);

  // Dummy conversation flow to show how auto-translation works
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam) {
      setRoomId(roomParam);
      setIsCallActive(true);
      initializeCall(roomParam);
    } else {
      setRoomId(Math.random().toString(36).substring(2, 9));
    }

    socket.on('user-connected', async (userId) => {
      toast.success(uiText[uiLang].friendConn);
      createOffer(userId);
    });

    socket.on('offer', handleReceiveOffer);
    socket.on('answer', handleReceiveAnswer);
    socket.on('ice-candidate', handleNewICECandidateMsg);
    socket.on('user-disconnected', () => {
      toast.error(uiText[uiLang].friendDisconn);
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      setRemoteStreamActive(false);
    });

    socket.on('receiveMessage', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on('serverError', (errorMsg) => {
      toast.error(`Error: ${errorMsg}`);
    });

    return () => {
      socket.off('user-connected');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('user-disconnected');
      socket.off('receiveMessage');
      socket.off('serverError');
    };
  }, [uiLang]);

  // NEW: System Test Function to check backend and media devices
  const runSystemCheck = async () => {
    setIsTesting(true);
    let passed = true;

    try {
      // 1. Check Backend Connection
      const res = await fetch(`${BACKEND_URL}/api/health`);
      if (res.ok) {
        toast.success("Backend Server: OK", { autoClose: 2000 });
      } else {
        throw new Error("Backend not responding");
      }

      // 2. Check Camera and Mic Permissions
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (stream) {
        toast.success("Camera & Microphone: OK", { autoClose: 2000 });
        stream.getTracks().forEach(track => track.stop());
      }
      
      toast.success(t.testSuccess, { autoClose: 4000 });
    } catch (error) {
      console.error(error);
      passed = false;
      toast.error(t.testFail, { autoClose: 5000 });
    } finally {
      setIsTesting(false);
    }
  };

  const initializeCall = async (room) => {
    setIsLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      socket.emit('join-room', room);
    } catch (error) {
      toast.error(t.camDenied);
      setIsCallActive(false);
    } finally {
      setIsLoading(false);
    }
  };

  const createPeerConnection = (target) => {
    const peerConnection = new RTCPeerConnection(iceServers);
    peerConnectionRef.current = peerConnection;

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { target, candidate: event.candidate });
      }
    };

    peerConnection.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setRemoteStreamActive(true);
      }
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStreamRef.current);
      });
    }

    return peerConnection;
  };

  const createOffer = async (target) => {
    try {
      const peerConnection = createPeerConnection(target);
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.emit('offer', { target, caller: socket.id, sdp: offer });
    } catch (error) {
      console.error(error);
    }
  };

  const handleReceiveOffer = async (incoming) => {
    try {
      const peerConnection = createPeerConnection(incoming.caller);
      await peerConnection.setRemoteDescription(new RTCSessionDescription(incoming.sdp));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit('answer', { target: incoming.caller, sdp: answer });
    } catch (error) {
      console.error(error);
    }
  };

  const handleReceiveAnswer = async (incoming) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(incoming.sdp));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleNewICECandidateMsg = async (candidate) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showChat]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    const messageData = {
      roomId,
      original: inputText,
      sourceLang: myLanguage
    };
    
    socket.emit('sendMessage', messageData);
    setInputText("");
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const handleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        
        const senders = peerConnectionRef.current?.getSenders();
        const videoSender = senders?.find(s => s.track?.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(screenTrack);
        }
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        screenTrack.onended = () => {
          stopScreenShare();
        };
        setIsScreenSharing(true);
      } catch (err) {
        toast.error(t.screenShareCancel);
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    const senders = peerConnectionRef.current?.getSenders();
    const videoSender = senders?.find(s => s.track?.kind === 'video');
    if (videoSender && videoTrack) {
      videoSender.replaceTrack(videoTrack);
    }
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
    setIsScreenSharing(false);
  };

  const endCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    window.location.search = "";
    setIsCallActive(false);
  };

  // 1. Initial Start Call Screen
  if (!isCallActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white p-6 relative overflow-hidden">
        <ToastContainer theme="dark" position="top-right" />
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-gray-950 to-gray-950 z-0"></div>
        
        {/* NEW: Increased max-w-sm to max-w-md to fit the new feature list nicely */}
        <div className="w-full max-w-md p-8 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl flex flex-col items-center text-center z-10">
          
          <div className="w-full mb-6 text-left">
            <label className="block text-xs text-gray-400 mb-1">{t.uiLangLabel}</label>
            <select 
              value={uiLang}
              onChange={(e) => {
                setUiLang(e.target.value);
                setMyLanguage(e.target.value);
              }}
              className="w-full bg-black/50 border border-white/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="fr">Français (French)</option>
            </select>
          </div>

          <div className="w-24 h-24 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(59,130,246,0.5)]">
            <Globe className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-1 tracking-tight">{t.title}</h1>
          <p className="text-gray-400 mb-6 text-sm">{t.subtitle}</p>
          
          {/* NEW: Feature List Box */}
          <div className="w-full bg-gray-900/60 rounded-xl p-4 mb-6 text-left border border-white/10">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t.featuresTitle}</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm">
                <Video className="w-4 h-4 text-blue-400" /> {t.featVideo}
              </li>
              <li className="flex items-center gap-3 text-sm">
                <MessageSquare className="w-4 h-4 text-green-400" /> {t.featChat}
              </li>
              <li className="flex items-center gap-3 text-sm">
                <MonitorUp className="w-4 h-4 text-purple-400" /> {t.featScreen}
              </li>
            </ul>
          </div>

          <p className="text-xs text-blue-300 bg-blue-900/30 p-3 rounded-lg border border-blue-500/30 mb-6 w-full leading-relaxed">
            {t.onboarding}
          </p>

          <div className="w-full mb-6 bg-gray-900/50 p-4 rounded-xl border border-white/10 flex items-center justify-between">
            <span className="text-xs text-gray-400 truncate mr-2">
              {window.location.origin}/?room={roomId}
            </span>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/?room=${roomId}`);
                toast.success(t.copied);
              }}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
            >
              <Copy size={16} />
            </button>
          </div>

          {/* NEW: Grouped Action Buttons */}
          <div className="w-full flex gap-3">
            <button 
              onClick={runSystemCheck}
              disabled={isTesting}
              className="flex-1 py-3 bg-gray-800 border border-white/20 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {isTesting ? <Loader2 className="animate-spin w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
              {t.runTest}
            </button>

            <button 
              onClick={() => {
                window.history.pushState({}, '', `?room=${roomId}`);
                setIsCallActive(true);
                initializeCall(roomId);
              }}
              disabled={isLoading}
              className="flex-1 py-3 bg-white text-black text-sm font-semibold rounded-xl hover:scale-105 transition-transform duration-300 shadow-[0_0_20px_rgba(255,255,255,0.3)] disabled:opacity-50 disabled:hover:scale-100 flex justify-center items-center gap-2"
            >
              {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <Video className="w-4 h-4" />}
              {t.start}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Active Call & Chat Screen (Mobile First Design)
  return (
    <div className="relative h-[100dvh] bg-gray-950 text-white overflow-hidden flex flex-col md:flex-row">
      <ToastContainer theme="dark" position="top-right" />
      
      {/* --- VIDEO SECTION --- */}
      <div className="relative flex-1 bg-gray-900 w-full h-full">
        
        <div className="absolute top-4 left-4 z-20 flex items-center gap-3">
          <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs">
            <Wifi className="w-4 h-4 text-green-400" />
            <span>{t.room}: {roomId}</span>
          </div>
          {isRecording && (
            <div className="flex items-center gap-2 bg-red-500/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-red-500/30 text-xs text-red-400 animate-pulse">
              <Circle className="w-3 h-3 fill-current" />
            </div>
          )}
        </div>

        {/* Remote Video (Friend) */}
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 overflow-hidden">
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover"
          />
          {!remoteStreamActive && (
            <div className="absolute flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-gray-400 font-medium animate-pulse flex items-center gap-2 text-center px-4">
                {t.waiting}
              </p>
            </div>
          )}
          {messages.length > 0 && remoteStreamActive && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-4/5 text-center z-20">
               <span className="bg-black/70 text-white px-4 py-2 rounded-lg text-lg font-medium drop-shadow-md">
                 {messages[messages.length - 1].translated}
               </span>
            </div>
          )}
        </div>

        {/* Local Video (You) - Picture in Picture */}
        <div className="absolute top-4 right-4 w-28 h-40 bg-gray-700 rounded-2xl border-2 border-white/20 overflow-hidden shadow-2xl z-10">
          <video 
            ref={localVideoRef} 
            autoPlay 
            playsInline 
            muted 
            className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : 'block'}`}
          />
          {isLoading && (
            <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
          {isVideoOff && !isLoading && (
            <div className="w-full h-full bg-gray-900 flex items-center justify-center absolute inset-0">
              <VideoOff className="w-6 h-6 text-gray-400" />
            </div>
          )}
          {isMuted && !isLoading && (
            <div className="absolute bottom-2 right-2 bg-red-500 p-1 rounded-full z-20">
              <MicOff className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* --- LIVE TRANSLATION CHAT SECTION --- */}
      <div className={`fixed inset-0 top-auto h-[65dvh] md:h-screen md:relative md:w-96 bg-gray-950 flex flex-col border-t md:border-t-0 md:border-l border-white/10 z-40 md:z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] md:shadow-none transition-transform duration-300 ${showChat ? 'translate-y-0' : 'translate-y-full md:translate-y-0 md:hidden'}`}>
        
        {/* Chat Header */}
        <div className="p-4 bg-white/5 backdrop-blur-md border-b border-white/10 flex justify-between items-center">
          <div>
            <h2 className="text-sm font-semibold">{t.chatTitle}</h2>
            <p className="text-xs text-green-400 flex items-center gap-1 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
              {t.apiActive}
            </p>
          </div>
          <button 
            onClick={() => setShowChat(false)}
            className="md:hidden p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.sender === socket.id ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-3 ${
                msg.sender === socket.id 
                  ? 'bg-gradient-to-br from-blue-600 to-blue-800 rounded-br-none' 
                  : 'bg-white/10 backdrop-blur-md border border-white/10 rounded-bl-none'
              }`}>
                <p className="text-sm font-medium mb-1">{msg.translated}</p>
                <p className="text-[11px] opacity-70 italic border-t border-white/10 pt-1 mt-1 flex justify-between items-center gap-4">
                  <span>{msg.sender === socket.id ? t.youSaid : t.friendSaid} {msg.original}</span>
                  <span className="flex items-center gap-1 text-[9px] opacity-60 flex-shrink-0"><Clock className="w-3 h-3" /> {msg.time}</span>
                </p>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Input */}
        <form onSubmit={handleSendMessage} className="p-3 bg-white/5 backdrop-blur-md border-t border-white/10 flex gap-2 pb-safe">
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={t.typeHere}
            className="flex-1 bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 text-white placeholder-gray-400 transition-colors"
          />
          <button type="submit" className="p-3 bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors flex items-center justify-center">
            <Send className="w-5 h-5 text-white" />
          </button>
        </form>
      </div>

      {/* --- CALL CONTROLS (Floating Bottom Bar) --- */}
      <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 p-3 bg-gray-900/90 backdrop-blur-xl border border-white/20 rounded-full shadow-2xl z-30 transition-opacity duration-300 ${showChat ? 'opacity-0 pointer-events-none md:opacity-100 md:pointer-events-auto' : 'opacity-100'}`}>
        <button 
          onClick={toggleMic}
          className={`p-3 md:p-4 rounded-full transition-all ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-white/10 hover:bg-white/20 text-white'}`}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
        
        <button 
          onClick={toggleVideo}
          className={`p-3 md:p-4 rounded-full transition-all ${isVideoOff ? 'bg-red-500/20 text-red-500' : 'bg-white/10 hover:bg-white/20 text-white'}`}
        >
          {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
        </button>

        <div className="w-px h-8 bg-white/20 hidden md:block"></div>
        
        <button 
          onClick={handleScreenShare}
          className={`hidden md:block p-3 md:p-4 rounded-full transition-all ${isScreenSharing ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 hover:bg-white/20 text-white'}`}
        >
          <MonitorUp size={20} />
        </button>
        
        <button 
          onClick={() => setShowChat(true)}
          className={`md:hidden p-3 rounded-full transition-all bg-white/10 hover:bg-white/20 text-white`}
        >
          <MessageSquare size={20} />
        </button>

        <button 
          onClick={() => setShowSettings(true)}
          className="p-3 md:p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
        >
          <Settings size={20} />
        </button>

        <div className="w-px h-8 bg-white/20"></div>

        <button 
          onClick={endCall}
          className="p-3 md:p-4 rounded-full bg-red-600 hover:bg-red-500 text-white transition-all shadow-[0_0_15px_rgba(220,38,38,0.5)]"
        >
          <PhoneOff size={20} />
        </button>
      </div>

      {showSettings && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/20 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">{t.settings}</h3>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">{t.myLang}</label>
                <select 
                  value={myLanguage}
                  onChange={(e) => setMyLanguage(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="hi">हिन्दी (Hindi)</option>
                  <option value="fr">Français (French)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-white/10">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors"
                >
                  {t.save}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}