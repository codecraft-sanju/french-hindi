import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, Globe, Send, User, Settings, MonitorUp, Circle, Wifi, Clock, X, Copy, Loader2 } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import io from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
const socket = io(BACKEND_URL);

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

  const [roomId, setRoomId] = useState("");
  const [myLanguage, setMyLanguage] = useState("hi");
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);

  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

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
      toast.success("Friend connected!");
      createOffer(userId);
    });

    socket.on('offer', handleReceiveOffer);
    socket.on('answer', handleReceiveAnswer);
    socket.on('ice-candidate', handleNewICECandidateMsg);
    socket.on('user-disconnected', () => toast.error("Friend disconnected"));

    socket.on('receiveMessage', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on('serverError', (errorMsg) => {
      toast.error(`Server Error: ${errorMsg}`);
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
  }, []);

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
      toast.error(`Access denied: ${error.message}`);
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
      toast.error("Failed to create connection offer");
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
      toast.error("Failed to handle connection offer");
    }
  };

  const handleReceiveAnswer = async (incoming) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(incoming.sdp));
      }
    } catch (error) {
      toast.error("Failed to set connection answer");
    }
  };

  const handleNewICECandidateMsg = async (candidate) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      toast.error("Failed to add network candidate");
    }
  };

  // Auto-scroll chat to bottom
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
        toast.error("Screen sharing cancelled");
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
        <div className="w-full max-w-sm p-8 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl flex flex-col items-center text-center z-10">
          <div className="w-24 h-24 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(59,130,246,0.5)]">
            <Globe className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2 tracking-tight">Dealit AI Call</h1>
          <p className="text-gray-400 mb-8 text-sm">Real-time Translation Setup</p>
          
          <div className="w-full mb-6 bg-gray-900/50 p-4 rounded-xl border border-white/10 flex items-center justify-between">
            <span className="text-xs text-gray-400 truncate mr-2">
              {window.location.origin}/?room={roomId}
            </span>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/?room=${roomId}`);
                toast.success("Link Copied!");
              }}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              <Copy size={16} />
            </button>
          </div>

          <button 
            onClick={() => {
              window.history.pushState({}, '', `?room=${roomId}`);
              setIsCallActive(true);
              initializeCall(roomId);
            }}
            disabled={isLoading}
            className="w-full py-4 bg-white text-black font-semibold rounded-2xl hover:scale-105 transition-transform duration-300 shadow-[0_0_20px_rgba(255,255,255,0.3)] disabled:opacity-50 disabled:hover:scale-100 flex justify-center items-center gap-2"
          >
            {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : "Start Session"}
          </button>
        </div>
      </div>
    );
  }

  // 2. Active Call & Chat Screen (Mobile First Design)
  return (
    <div className="relative min-h-screen bg-gray-950 text-white overflow-hidden flex flex-col md:flex-row">
      <ToastContainer theme="dark" position="top-right" />
      
      {/* --- VIDEO SECTION --- */}
      <div className="relative flex-1 bg-gray-900 w-full h-[50vh] md:h-screen">
        
        <div className="absolute top-4 left-4 z-20 flex items-center gap-3">
          <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs">
            <Wifi className="w-4 h-4 text-green-400" />
            <span>Room: {roomId}</span>
          </div>
          {isRecording && (
            <div className="flex items-center gap-2 bg-red-500/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-red-500/30 text-xs text-red-400 animate-pulse">
              <Circle className="w-3 h-3 fill-current" />
              <span>Recording</span>
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
          {!remoteVideoRef.current?.srcObject && (
            <div className="absolute flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-gray-400 font-medium animate-pulse flex items-center gap-2">
                Waiting for Friend...
              </p>
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
      {showChat && (
        <div className="flex-1 w-full h-[50vh] md:h-screen bg-gray-950 flex flex-col border-t md:border-t-0 md:border-l border-white/10 z-20">
          
          {/* Chat Header */}
          <div className="p-4 bg-white/5 backdrop-blur-md border-b border-white/10 flex justify-between items-center">
            <div>
              <h2 className="text-sm font-semibold">Live Captions & Chat</h2>
              <p className="text-xs text-green-400 flex items-center gap-1 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
                API Translation Active
              </p>
            </div>
            <button 
              onClick={() => setShowChat(false)}
              className="md:hidden p-2 bg-white/10 rounded-full hover:bg-white/20"
            >
              <X size={16} />
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
                    <span>{msg.sender === socket.id ? 'You said: ' : 'She said: '} {msg.original}</span>
                    <span className="flex items-center gap-1 text-[9px] opacity-60"><Clock className="w-3 h-3" /> {msg.time}</span>
                  </p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white/5 backdrop-blur-md border-t border-white/10 flex gap-2">
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type message to translate..." 
              className="flex-1 bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 text-white placeholder-gray-400 transition-colors"
            />
            <button type="submit" className="p-3 bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors flex items-center justify-center">
              <Send className="w-5 h-5 text-white" />
            </button>
          </form>
        </div>
      )}

      {/* --- CALL CONTROLS (Floating Bottom Bar) --- */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 p-3 bg-gray-900/90 backdrop-blur-xl border border-white/20 rounded-full shadow-2xl z-30">
        <button 
          onClick={toggleMic}
          className={`p-3 md:p-4 rounded-full transition-all ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-white/10 hover:bg-white/20 text-white'}`}
          title="Toggle Microphone"
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
        
        <button 
          onClick={toggleVideo}
          className={`p-3 md:p-4 rounded-full transition-all ${isVideoOff ? 'bg-red-500/20 text-red-500' : 'bg-white/10 hover:bg-white/20 text-white'}`}
          title="Toggle Camera"
        >
          {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
        </button>

        <div className="w-px h-8 bg-white/20 hidden md:block"></div>
        
        <button 
          onClick={handleScreenShare}
          className={`hidden md:block p-3 md:p-4 rounded-full transition-all ${isScreenSharing ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 hover:bg-white/20 text-white'}`}
          title="Share Screen"
        >
          <MonitorUp size={20} />
        </button>
        
        <button 
          onClick={() => setShowChat(!showChat)}
          className={`md:hidden p-3 md:p-4 rounded-full transition-all ${showChat ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 hover:bg-white/20 text-white'}`}
          title="Toggle Chat"
        >
          <MessageSquare size={20} />
        </button>

        <button 
          onClick={() => setShowSettings(true)}
          className="p-3 md:p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
          title="Settings"
        >
          <Settings size={20} />
        </button>

        <div className="w-px h-8 bg-white/20"></div>

        <button 
          onClick={endCall}
          className="p-3 md:p-4 rounded-full bg-red-600 hover:bg-red-500 text-white transition-all shadow-[0_0_15px_rgba(220,38,38,0.5)]"
          title="End Call"
        >
          <PhoneOff size={20} />
        </button>
      </div>

      {showSettings && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/20 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Translation Settings</h3>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">My Language</label>
                <select 
                  value={myLanguage}
                  onChange={(e) => setMyLanguage(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="hi">Hindi (India)</option>
                  <option value="fr">French (Madagascar/France)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-white/10">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}