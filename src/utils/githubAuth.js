import { signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, githubProvider } from "../firebase";
export async function githubAuth() {
    try {
        const result = await signInWithPopup(auth, githubProvider);
        const user = result.user
        const profileRef = doc(db, "users", user.uid);
        const profileSnap = await getDoc(profileRef);
        if (!profileSnap.exists()) {
            await setDoc(profileRef, {
                email: user.email,
                name: user.displayName || "",
                photoURL: user.photoURL || "",
                provider: "github",
                createdAt: serverTimestamp(),
            });
        }

        return null; // success
    } catch (error) {
        console.log(error.code);

        switch (error.code) {
            case "auth/account-exists-with-different-credential":
                return "An account with this email already exists using a different sign-in method";
            case "auth/popup-closed-by-user":
            case "auth/cancelled-popup-request":
                return ""; // user closed popup, nothing to show
            case "auth/popup-blocked":
                return "Popup was blocked. Allow popups and try again";
            case "permission-denied":
                return "Signed in, but saving your profile failed";
            default:
                return "GitHub sign-in failed. Try again.";
        }
    }
}