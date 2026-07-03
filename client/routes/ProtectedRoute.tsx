import { Navigate } from "react-router-dom";
import { getToken } from "../utils/token";

interface Props {
    children: JSX.Element;
}

export default function ProtectedRoute({ children }: Props) {

    const token = getToken();

    if (!token) {
        return <Navigate to="/" replace />;
    }

    return children;
}