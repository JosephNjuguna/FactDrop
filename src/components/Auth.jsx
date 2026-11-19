import { useState } from "react";
import '../css/auth.css'

function Auth() {
    const [isSignUp, setIsSignUp] = useState(false);

    function handleSignUp(event) {
        event.preventDefault();
        console.log(event);
    }
    function handleSignIn(event) {
        event.preventDefault();
        console.log(event);
    }

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
                            <div className="SignUp">
                                <h3>Create your account</h3>
                                <button className="github">continue with github</button>
                                <p>or use your email</p>
                                <form onSubmit={handleSignUp}>

                                    <p>Email</p>
                                    <input type="text" placeholder="your@example.com" />

                                    <p>Password</p>
                                    <input type="password" placeholder="enter your password" />

                                    <p>Confirm Password</p>
                                    <input type="password" placeholder="enter same password again" />

                                    <button className="authbutton">Sign Up</button>
                                    <p>
                                        Already have an account?{" "}
                                        <b onClick={() => setIsSignUp(false)}>Sign In</b>
                                    </p>
                                </form>
                            </div>
                        ) : (
                            <div className="SignIn">
                                <h3>Welcome Back</h3>
                                <button className="github">continue with github</button>
                                <p>or use your email</p>

                                <form onSubmit={handleSignIn}>
                                    <p>Email</p>
                                    <input type="text" placeholder="your@example.com" />
                                    <p>Password</p>
                                    <input type="password" placeholder="enter your password" />
                                    <p>Forgot password?</p>
                                    <button className="authbutton">Sign In</button>
                                    <p>
                                        New Here?{" "}
                                        <b onClick={() => setIsSignUp(true)}>Create an Account</b>
                                    </p>

                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </>
    )
}
export default Auth;