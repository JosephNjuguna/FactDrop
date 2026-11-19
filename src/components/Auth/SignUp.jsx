import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../firebase"; // adjust the path to where your firebase.js is
import '../../css/auth.css';

// receives a function from the parent so the "Sign In" link can switch forms
function SignUp({ switchToSignIn }) {

    const [signupEmail, setEmail] = useState("");
    const [signupPassword, setPassword] = useState("");
    const [signupConfirmPassword, setConfirmPassword] = useState("");

    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [confirmError, setConfirmError] = useState("");
    const [formError, setFormError] = useState(""); // errors from Firebase
    const [loading, setLoading] = useState(false);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

    function verifyEmail(value) {
        setEmail(value);
        if (value === "" || emailRegex.test(value)) {
            setEmailError("");
        } else {
            setEmailError("Enter a valid email address");
        }
    }

    function verifyPassword(value) {
        setPassword(value);
        if (value === "" || passwordRegex.test(value)) {
            setPasswordError("");
        } else {
            setPasswordError("Password must be at least 8 characters with a letter and a number");
        }
        if (signupConfirmPassword !== "" && value !== signupConfirmPassword) {
            setConfirmError("Passwords don't match");
        } else {
            setConfirmError("");
        }
    }

    function verifyConfirmPassword(value) {
        setConfirmPassword(value);
        if (value === "" || value === signupPassword) {
            setConfirmError("");
        } else {
            setConfirmError("Passwords don't match");
        }
    }

    async function handleSignUp(event) {
        event.preventDefault();
        setFormError("");

        if (!signupEmail || !signupPassword || !signupConfirmPassword) {
            setFormError("Please fill in all fields");
            return;
        }
        if (emailError || passwordError || confirmError) {
            return;
        }

        setLoading(true);
        try {
            const cred = await createUserWithEmailAndPassword(auth, signupEmail, signupPassword);
            const user = cred.user;

            const profileRef = doc(db, "users", user.uid);
            const profileSnap = await getDoc(profileRef);

            if (!profileSnap.exists()) {
                await setDoc(profileRef, {
                    email: user.email,
                    createdAt: serverTimestamp(),
                });
            }
            console.log("Account created:", user.uid);
            //redirect here
        } catch (error) {
            console.log(error.code);

            if (error.code === "auth/email-already-in-use") {
                setFormError("An account with this email already exists");
            } else if (error.code === "auth/invalid-email") {
                setFormError("That email isn't valid");
            } else if (error.code === "auth/weak-password") {
                setFormError("Password is too weak");
            } else if (error.code === "permission-denied") {
                setFormError("Account created, but saving your profile failed");
            } else {
                setFormError("Something went wrong. Try again.");
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <div className="SignUp">
                <h3>Create your account</h3>
                <button type="button" className="github">continue with github</button>
                <p>or use your email</p>
                <form onSubmit={handleSignUp}>

                    <p>Email</p>
                    <input
                        type="text"
                        name="email"
                        className="input-text"
                        value={signupEmail}
                        onChange={(e) => verifyEmail(e.target.value)}
                        placeholder="your@example.com" />
                    {emailError && <p className="error">{emailError}</p>}

                    <p>Password</p>
                    <input
                        type="password"
                        name="password"
                        className="input-text"
                        value={signupPassword}
                        onChange={(e) => verifyPassword(e.target.value)}
                        placeholder="enter your password" />
                    {passwordError && <p className="error">{passwordError}</p>}

                    <p>Confirm Password</p>
                    <input
                        type="password"
                        name="confirmPassword"
                        className="input-text"
                        value={signupConfirmPassword}
                        onChange={(e) => verifyConfirmPassword(e.target.value)}
                        placeholder="enter same password again" />
                    {confirmError && <p className="error">{confirmError}</p>}

                    {formError && <p className="error">{formError}</p>}

                    <button className="authbutton" disabled={loading}>
                        {loading ? "Creating account..." : "Sign Up"}
                    </button>

                    <p>
                        Already have an account?{" "}
                        <b onClick={switchToSignIn}>Sign In</b>
                    </p>

                </form>
            </div>
        </>
    )
}
export default SignUp;