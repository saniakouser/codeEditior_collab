import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import notificationTone from "../music/Notification Tone.mp3"; 

const socket = io('http://localhost:5000');

function Chatbot({ roomId, username }) {
    const [message, setMessage] = useState('');
    const [friendsChatHistory, setFriendsChatHistory] = useState([]);

    useEffect(() => {
        socket.emit('join', { roomId, username });
        socket.on('response_friend', ({ username, message }) => {
            console.log(username, message);
            const timestamp = new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
            });
            setFriendsChatHistory(prev => [...prev, { username, message, timestamp }]);
            playNotificationSound();
        });

        return () => {
            socket.disconnect();
        };
    }, [roomId, username]);

    const sendMessageToFriends = () => {
        const timestamp = new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
        socket.emit('chat_with_friends', { roomId, username, message });
        setFriendsChatHistory(prev => [...prev, { username, message, timestamp }]);
        setMessage('');
    };

    const playNotificationSound = () => {
        const audio = new Audio(notificationTone);
        audio.play();
    };

    return (
        <div className="bg-gray-100 min-h-screen flex flex-col justify-between">
            <div className="p-4 overflow-y-auto flex-1">
                {friendsChatHistory.map((msg, index) => (
                    <div key={index} className="mb-2 p-2 rounded-lg shadow-md bg-yellow-100">
                        <strong className="text-green-600">{msg.username}:</strong> <span className="text-gray-800">{msg.message}</span>
                        <div className="text-sm text-gray-500">{msg.timestamp}</div>
                    </div>
                ))}
            </div>
            <div className="p-4 flex">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter your message"
                    className="flex-grow p-2 rounded-l-lg border border-gray-300 focus:outline-none focus:ring focus:ring-blue-500"
                />
                <button onClick={sendMessageToFriends} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-r-lg ml-2">
                    Send to Friends
                </button>
            </div>
        </div>
    );
}

export default Chatbot;
