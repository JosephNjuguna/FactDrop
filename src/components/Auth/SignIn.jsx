import { useState } from "react";
import '../../css/auth.css';

function SignIn() {

    const [signinEmail, setEmail] = useState("");
    const [signinPassword, setPassword] = useState("");

    function handleSignIn(event) {
        event.preventDefault();
        console.log(signinEmail , signinPassword);
    }

    return (
        <>
            <div className="SignIn">
                <h3>Welcome Back</h3>
                <button className="github">continue with github</button>
                <p>or use your email</p>

                <form onSubmit={handleSignIn}>
                    <p>Email</p>
                    <input
                        type="text"
                        name="email"
                        className="input-text"
                        value={signinEmail}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@example.com" />

                    <p>Password</p>
                    <input type="text"
                        name="password"
                        className="input-text"
                        value={signinPassword}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="enter your password" />

                    <p>Forgot password?</p>
                    <button className="authbutton">Sign In</button>
                    <p>
                        New Here?{" "}
                        <b onClick={() => setIsSignUp(true)}>Create an Account</b>
                    </p>
                </form>

            </div>
        </>
    )
}
export default SignIn;