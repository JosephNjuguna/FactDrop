import { useState } from "react";
import '../css/auth.css'
import SignUp from "./Auth/SignUp";
import SignIn from "./Auth/SignIn";

function Auth() {
    const [isSignUp, setIsSignUp] = useState(false);

    return (
        <>
            <main>
                <div className="center">
                    <div className="intro">
                        <p></p>
                        <h2>FactDrop</h2>
                        <h3>A new fact every time you open the app.</h3>
                        <p>Like the ones you love, and share what you think in the comments.</p>
                        <div>
                            <p>Fact of the day</p>
                            <h3>An octopus has three hearts, and two of them stop beating when it swims.</h3>
                        </div>
                    </div>

                    <div className="auth">
                        <div className="swicthAuthMode">
                            <p className={!isSignUp ? "active" : ""} onClick={() => setIsSignUp(false)}>Sign In</p>
                            <p className={isSignUp ? "active" : ""} onClick={() => setIsSignUp(true)}>Sign Up</p>
                        </div>

                        {isSignUp ? (
                            <SignUp/>
                        ) : (
                            <SignIn/>
                        )}
                    </div>
                </div>
            </main>
        </>
    )
}
export default Auth;