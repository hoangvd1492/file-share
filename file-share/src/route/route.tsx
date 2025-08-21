import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import NotFound from '../page/404/NotFound';
import Home from '../page/home/Home';
import { RoomWrapper } from '../page/room/Room';


const AppRoute: React.FC = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                < Route path="room/:id" element={<RoomWrapper />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
    )
};

export default AppRoute;