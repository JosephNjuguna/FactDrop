import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

import { auth, db } from "../../firebase";
import '../../css/auth.css';

import { useNavigate } from "react-router-dom";
import { githubAuth } from "../../utils/githubAuth";

function SignIn({ switchToSignUp }) {
    const navigate = useNavigate();

    const [signinEmail, setEmail] = useState("");
    const [signinPassword, setPassword] = useState("");

    const [emailError, setEmailError] = useState("");
    const [formError, setFormError] = useState("");
    const [loading, setLoading] = useState(false);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function verifyEmail(value) {
        setEmail(value);
        if (value === "" || emailRegex.test(value)) {
            setEmailError("");
        } else {
            setEmailError("Enter a valid email address");
        }
    }

    async function handleGithubClick() {
        setFormError("");
        setLoading(true);

        const error = await githubAuth();

        setLoading(false);
        if (error === null) {
            navigate("/home");
        } else {
            setFormError(error);
        }
    }

    function handlePasswordChange(value) {
        setPassword(value);
        setFormError("");
    }

    async function handleSignIn(event) {
        event.preventDefault();
        setFormError("");

        if (!signinEmail || !signinPassword) {
            setFormError("Please enter your email and password");
            return;
        }
        if (emailError) {
            return;
        }

        setLoading(true);
        try {
            const cred = await signInWithEmailAndPassword(auth, signinEmail, signinPassword);
            const user = cred.user;

            const profileRef = doc(db, "users", user.uid);
            const profileSnap = await getDoc(profileRef);

            if (profileSnap.exists()) {
                console.log("Welcome back:", profileSnap.data());
            } else {
                await setDoc(profileRef, {
                    email: user.email,
                    createdAt: serverTimestamp(),
                });
            }

            console.log("Signed in:", user.uid);

            navigate("/home");

        } catch (error) {
            console.log(error.code);

            if (error.code === "auth/invalid-credential") {
                setFormError("Wrong email or password");
            } else if (error.code === "auth/invalid-email") {
                setFormError("That email isn't valid");
            } else if (error.code === "auth/user-disabled") {
                setFormError("This account has been disabled");
            } else if (error.code === "auth/too-many-requests") {
                setFormError("Too many attempts. Try again later.");
            } else if (error.code === "permission-denied") {
                setFormError("Signed in, but reading your profile failed");
            } else {
                setFormError("Something went wrong. Try again.");
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <div className="SignIn">

                <h3>Welcome Back</h3>
                <button
                    type="button"
                    className="github"
                    onClick={handleGithubClick}
                    disabled={loading}>
                    {loading ? "Please wait..." : "continue with github"}
                </button>

                <p>or use your email</p>

                <form onSubmit={handleSignIn}>
                    <p>Email</p>
                    <input
                        type="text"
                        name="email"
                        className="input-text"
                        value={signinEmail}
                        onChange={(e) => verifyEmail(e.target.value)}
                        placeholder="your@example.com" />
                    {emailError && <p className="error">{emailError}</p>}

                    <p>Password</p>
                    <input
                        type="password"
                        name="password"
                        className="input-text"
                        value={signinPassword}
                        onChange={(e) => handlePasswordChange(e.target.value)}
                        placeholder="enter your password" />

                    {formError && <p className="error">{formError}</p>}

                    <p>Forgot password?</p>
                    <button className="authbutton" disabled={loading}>
                        {loading ? "Signing in..." : "Sign In"}
                    </button>
                    <p>
                        New Here?{" "}
                        <b onClick={switchToSignUp}>Create an Account</b>
                    </p>
                </form>

            </div>
        </>
    )
}
export default SignIn;