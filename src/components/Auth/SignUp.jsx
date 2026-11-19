import { useState } from "react";
import '../../css/auth.css';

function SignUp() {

    const [signinEmail, setEmail] = useState("");
    const [signinPassword, setPassword] = useState("");
    const [signinConfirmPassword, setConfirmPassword] = useState("");

    function handleSignUp(event) {
        event.preventDefault();
        console.log(signinConfirmPassword, signinEmail, signinPassword);
    }

    return (
        <>
            <div className="SignUp">
                <h3>Create your account</h3>
                <button className="github">continue with github</button>
                <p>or use your email</p>
                <form onSubmit={handleSignUp}>

                    <p>Email</p>
                    <input
                        type="text"
                        name="email"
                        className="input-text"
                        value={signinEmail}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@example.com" />

                    <p>Password</p>
                    <input
                        name="password"
                        className="input-text"
                        value={signinPassword}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="enter your password"/>

                    <p>Confirm Password</p>
                    <input name="password"
                        className="input-text"
                        value={signinConfirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        type="password" 
                        placeholder="enter same password again" />

                    <button className="authbutton">Sign Up</button>
                    <p>
                        Already have an account?{" "}
                        <b onClick={() => setIsSignUp(false)}>Sign In</b>
                    </p>

                </form>
            </div>
        </>
    )
}
export default SignUp;