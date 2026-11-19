import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../firebase";
import '../../css/auth.css';

function SignIn({ switchToSignUp }) {

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

    function handlePasswordChange(value) {
        setPassword(value);
        setFormError(""); // clear the old error when they start retyping
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
            // 1. Firebase Auth compares the email and password for you
            const cred = await signInWithEmailAndPassword(auth, signinEmail, signinPassword);
            const user = cred.user;

            // 2. Check that the profile document exists
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
            // redirect to your home page here

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
                setFormError("Signed in, but reading your profile was blocked (check Firestore rules)");
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
                <button type="button" className="github">continue with github</button>
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