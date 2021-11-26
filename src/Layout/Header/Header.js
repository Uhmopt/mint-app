import React from "react";
import "./Header.css";
import logo from "../../assets/images/logo.svg";

const Header = () => {

  return (
    <div>
      <div className="header-bar">
        <div className="logo-div">
        <img className="logo-img" src={logo} />
        </div>
      
      </div>
    </div>
  );
};

Header.propTypes = {};

export default Header;
