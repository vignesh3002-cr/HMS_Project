import {
    removeToken,
    removeUser
} from "../utils/token";

import { useNavigate } from "react-router-dom";

const navigate = useNavigate();

const logout = () => {

    removeToken();

    removeUser();

    localStorage.removeItem("user_info");

    navigate("/");

};