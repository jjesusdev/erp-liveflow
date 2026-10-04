'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function useSocket() {
  const [connectedSocket, setConnectedSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!socket) {
      socket = io({
        path: '/api/socketio',
        transports: ['websocket', 'polling'],
      });
    }

    const onConnect = () => {
      setConnectedSocket(socket);
    };

    const onDisconnect = () => {
      setConnectedSocket(null);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    if (socket.connected) {
      setConnectedSocket(socket);
    }

    return () => {
      socket?.off('connect', onConnect);
      socket?.off('disconnect', onDisconnect);
    };
  }, []);

  return connectedSocket;
}
