import { remove } from "../utils/token";

import { useNavigate } from "react-router-dom";

const navigate = useNavigate();

const logout = () => {
    remove();
    localStorage.removeItem("user_info");
    navigate("/");
};