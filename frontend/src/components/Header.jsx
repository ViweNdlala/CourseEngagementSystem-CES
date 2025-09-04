// Class for system header

// Function for Header component
import React from "react";
import './Header.css'
function Header(){
    return(
        <div className="header">
            <h1 className="logo">Mavix</h1>
            <h1 className="course-name">CSC3003S</h1>
            <div className="user-img">
                <img src="./assets/react.svg" alt="User image"></img>
            </div>
            <div className="notification-bell">bell</div>
        </div>
    );
}

export default Header;