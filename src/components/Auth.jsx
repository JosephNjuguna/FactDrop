import { useState } from "react";
import '../css/auth.css'
import SignUp from "./Auth/SignUp";
import SignIn from "./Auth/SignIn";

function Auth() {
    const [isSignUp, setIsSignUp] = useState(false);

    return (
        <>
            <main className="factscenter">
                <div className="center">
                    <div className="intro">
                        <h2>FactDrop</h2>
                        <h3>A new fact every time you open the app.</h3>
                        <p>Like the ones you love, and share what you think in the comments.</p>
                    </div>

                    <div className="auth">
                        <div className="swicthAuthMode">
                            <p className={!isSignUp ? "active" : ""} onClick={() => setIsSignUp(false)}>Sign In</p>
                            <p className={isSignUp ? "active" : ""} onClick={() => setIsSignUp(true)}>Sign Up</p>
                        </div>

                        {isSignUp ? (
                            <SignUp switchToSignIn={() => setIsSignUp(false)} />
                        ) : (
                            <SignIn switchToSignUp={() => setIsSignUp(true)} />
                        )}

                    </div>
                </div>
            </main>
        </>
    )
}
export default Auth;