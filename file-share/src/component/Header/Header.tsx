import React from "react";
import './Header.scss'
import { useNavigate } from "react-router-dom";


export const Header: React.FC = () => {

    const navigator = useNavigate()
    return (
        <div className="header">
            <h1 onClick={() => navigator('/')}>File Share</h1>
        </div>
    );
}