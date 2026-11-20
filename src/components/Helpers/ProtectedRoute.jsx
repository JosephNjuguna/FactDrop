import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

function ProtectedRoute({ children }) {
    const { user } = useAuth();
    if (!user){//no user found
        return <Navigate to="/" replace />; //return to auth page
    }
    return children;
}

export default ProtectedRoute;