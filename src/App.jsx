import { Routes, Route } from "react-router-dom";
import Auth from './components/Auth'
import Home from "./components/Home";
import ProtectedRoute from "./components/Helpers/ProtectedRoute";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Auth />} />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home/>
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  )
}

export default App
