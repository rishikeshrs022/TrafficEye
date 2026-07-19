import React, { createContext, useState, useEffect, useContext, useRef } from 'react';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const listenersRef = useRef({});
  const socketRef = useRef(null);

  const connect = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    console.log("Connecting to TrafficEye WebSocket server...");
    const ws = new WebSocket("ws://localhost:8000/ws");
    socketRef.current = ws;

    ws.onopen = () => {
      console.log("Connected to WebSocket Server");
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const { topic, payload } = message;
        
        // Notify listeners registered for this topic
        if (listenersRef.current[topic]) {
          listenersRef.current[topic].forEach(callback => callback(payload));
        }
      } catch (err) {
        console.error("Error parsing socket message:", err);
      }
    };

    ws.onclose = () => {
      console.log("Disconnected from WebSocket Server. Reconnecting in 3s...");
      setIsConnected(false);
      setTimeout(connect, 3000);
    };

    ws.onerror = (err) => {
      console.error("WebSocket connection error:", err);
      ws.close();
    };
  };

  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const subscribe = (topic, callback) => {
    if (!listenersRef.current[topic]) {
      listenersRef.current[topic] = [];
    }
    listenersRef.current[topic].push(callback);

    // Return unsubscribe function
    return () => {
      listenersRef.current[topic] = listenersRef.current[topic].filter(cb => cb !== callback);
    };
  };

  const send = (action, payload) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action, payload }));
    }
  };

  return (
    <SocketContext.Provider value={{ isConnected, subscribe, send }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
