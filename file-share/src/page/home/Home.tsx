import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.scss'

const Home: React.FC = () => {
    const [roomId, setRoomId] = useState('');
    const navigator = useNavigate();

    const handleJoinRoom = () => {
        if (roomId) {
            navigator(`/room/${roomId}`);
        }
    };

    const handleCreateRoom = () => {
        const newRoomId = Math.random().toString(36).substring(2, 15);
        navigator(`/room/${newRoomId}`);
    };

    return (
        <div className='home'>
            <h1>Welcome to File Share</h1>
            <div>
                <h2>Join Room</h2>
                <input
                    type="text"
                    placeholder="Enter Room Code"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                />
                <button className='join-btn' onClick={handleJoinRoom} disabled={!roomId}>
                    <span>Join</span>  <i className="bi bi-box-arrow-in-right"></i>
                </button>
            </div>
            <h2>OR</h2>
            <div>
                <button onClick={handleCreateRoom}> <span>Create</span> <i className="bi bi-plus"></i> </button>
            </div>
        </div>
    );
};

export default Home;