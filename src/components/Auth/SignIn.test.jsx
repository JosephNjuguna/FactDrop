import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { githubAuth } from "../../utils/githubAuth";

import SignIn from "./SignIn";

// =====================================================================
// MOCKS
// Every path below must match the import path used INSIDE SignIn.jsx.
// Put this test file in the same folder as SignIn.jsx.
// =====================================================================

// vi.hoisted lets us create a variable that the vi.mock factories can use.
// (vi.mock calls are moved to the top of the file, so normal variables
// declared below would not exist yet.)
const mockNavigate = vi.hoisted(() => vi.fn());

// Fake router: we only need useNavigate, so no <BrowserRouter> is required.
vi.mock("react-router-dom", () => ({
    useNavigate: () => mockNavigate,
}));

// Fake Firebase Auth: the one function SignIn uses.
vi.mock("firebase/auth", () => ({
    signInWithEmailAndPassword: vi.fn(),
}));

// Fake Firestore: the four functions SignIn uses.
vi.mock("firebase/firestore", () => ({
    doc: vi.fn(),
    getDoc: vi.fn(),
    setDoc: vi.fn(),
    serverTimestamp: vi.fn(),
}));

// Fake firebase config: SignIn only passes these along, never uses them.
vi.mock("../../firebase", () => ({
    auth: { name: "fake-auth" },
    db: { name: "fake-db" },
}));

// Fake GitHub login helper.
vi.mock("../../utils/githubAuth", () => ({
    githubAuth: vi.fn(),
}));

// =====================================================================
// HELPERS
// =====================================================================

const fakeUser = { uid: "abc123", email: "test@example.com" };

// Placeholders are how we find the inputs (the labels are plain <p> tags,
// so getByLabelText would not work here).
const getEmailInput = () => screen.getByPlaceholderText("your@example.com");
const getPasswordInput = () => screen.getByPlaceholderText("enter your password");
const getSignInButton = () => screen.getByRole("button", { name: "Sign In" });

// Type into the form (only fills the fields you pass in).
async function fillForm(user, { email, password }) {
    if (email) await user.type(getEmailInput(), email);
    if (password) await user.type(getPasswordInput(), password);
}

// =====================================================================
// TESTS
// =====================================================================

describe("SignIn", () => {
    beforeEach(() => {
        // Wipe all recorded calls and queued return values so tests
        // can't leak into each other.
        vi.resetAllMocks();

        // Re-create the default behaviour of our fakes.
        doc.mockReturnValue("PROFILE_REF");
        serverTimestamp.mockReturnValue("SERVER_TIME");

        signInWithEmailAndPassword.mockResolvedValue({ user: fakeUser });
        getDoc.mockResolvedValue({ exists: () => true, data: () => ({}) });
        setDoc.mockResolvedValue(undefined);

        // SignIn calls console.log; silence it so test output stays clean.
        vi.spyOn(console, "log").mockImplementation(() => { });
    });

    // ---------------------------------------------------------------
    describe("rendering", () => {
        it("shows the heading, both inputs and the buttons", () => {
            render(<SignIn switchToSignUp={vi.fn()} />);

            expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeInTheDocument();
            expect(getEmailInput()).toBeInTheDocument();
            expect(getPasswordInput()).toBeInTheDocument();
            expect(getSignInButton()).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "continue with github" })).toBeInTheDocument();
        });

        it("starts with empty inputs and no error messages", () => {
            render(<SignIn switchToSignUp={vi.fn()} />);

            expect(getEmailInput()).toHaveValue("");
            expect(getPasswordInput()).toHaveValue("");
            expect(screen.queryByText("Enter a valid email address")).not.toBeInTheDocument();
        });

        it("hides the password characters (input type is password)", () => {
            render(<SignIn switchToSignUp={vi.fn()} />);
            expect(getPasswordInput()).toHaveAttribute("type", "password");
        });
    });

    // ---------------------------------------------------------------
    describe("typing in the fields", () => {
        it("updates the email input as the user types", async () => {
            const user = userEvent.setup();
            render(<SignIn switchToSignUp={vi.fn()} />);

            await user.type(getEmailInput(), "hello@test.com");
            expect(getEmailInput()).toHaveValue("hello@test.com");
        });

        it("updates the password input as the user types", async () => {
            const user = userEvent.setup();
            render(<SignIn switchToSignUp={vi.fn()} />);

            await user.type(getPasswordInput(), "secret123");
            expect(getPasswordInput()).toHaveValue("secret123");
        });

        it("shows an error while the email is not valid", async () => {
            const user = userEvent.setup();
            render(<SignIn switchToSignUp={vi.fn()} />);

            await user.type(getEmailInput(), "not-an-email");
            expect(screen.getByText("Enter a valid email address")).toBeInTheDocument();
        });

        it("removes the email error once the email becomes valid", async () => {
            const user = userEvent.setup();
            render(<SignIn switchToSignUp={vi.fn()} />);

            await user.type(getEmailInput(), "abc");
            expect(screen.getByText("Enter a valid email address")).toBeInTheDocument();

            await user.type(getEmailInput(), "@site.com");
            expect(screen.queryByText("Enter a valid email address")).not.toBeInTheDocument();
        });

        it("removes the email error when the field is cleared", async () => {
            const user = userEvent.setup();
            render(<SignIn switchToSignUp={vi.fn()} />);

            await user.type(getEmailInput(), "abc");
            await user.clear(getEmailInput());

            expect(screen.queryByText("Enter a valid email address")).not.toBeInTheDocument();
        });

        it("clears a form error as soon as the user edits the password", async () => {
            const user = userEvent.setup();
            render(<SignIn switchToSignUp={vi.fn()} />);

            // Trigger the "please enter..." error by submitting an empty form.
            await user.click(getSignInButton());
            expect(screen.getByText("Please enter your email and password")).toBeInTheDocument();

            await user.type(getPasswordInput(), "a");
            expect(screen.queryByText("Please enter your email and password")).not.toBeInTheDocument();
        });
    });

    // ---------------------------------------------------------------
    describe("form validation on submit", () => {
        it("shows an error when both fields are empty", async () => {
            const user = userEvent.setup();
            render(<SignIn switchToSignUp={vi.fn()} />);

            await user.click(getSignInButton());

            expect(screen.getByText("Please enter your email and password")).toBeInTheDocument();
            expect(signInWithEmailAndPassword).not.toHaveBeenCalled();
        });

        it("shows an error when only the email is filled", async () => {
            const user = userEvent.setup();
            render(<SignIn switchToSignUp={vi.fn()} />);

            await fillForm(user, { email: "test@example.com" });
            await user.click(getSignInButton());

            expect(screen.getByText("Please enter your email and password")).toBeInTheDocument();
            expect(signInWithEmailAndPassword).not.toHaveBeenCalled();
        });

        it("shows an error when only the password is filled", async () => {
            const user = userEvent.setup();
            render(<SignIn switchToSignUp={vi.fn()} />);

            await fillForm(user, { password: "secret123" });
            await user.click(getSignInButton());

            expect(screen.getByText("Please enter your email and password")).toBeInTheDocument();
            expect(signInWithEmailAndPassword).not.toHaveBeenCalled();
        });

        it("does not call Firebase when the email format is invalid", async () => {
            const user = userEvent.setup();
            render(<SignIn switchToSignUp={vi.fn()} />);

            await fillForm(user, { email: "bad-email", password: "secret123" });
            await user.click(getSignInButton());

            expect(signInWithEmailAndPassword).not.toHaveBeenCalled();
            expect(mockNavigate).not.toHaveBeenCalled();
        });

        it("can also be submitted with the Enter key", async () => {
            const user = userEvent.setup();
            render(<SignIn switchToSignUp={vi.fn()} />);

            await fillForm(user, { email: "test@example.com" });
            await user.type(getPasswordInput(), "secret123{enter}");

            expect(signInWithEmailAndPassword).toHaveBeenCalledTimes(1);
        });
    });

    // ---------------------------------------------------------------
    describe("successful email sign in", () => {
        it("calls Firebase with the typed email and password", async () => {
            const user = userEvent.setup();
            render(<SignIn switchToSignUp={vi.fn()} />);

            await fillForm(user, { email: "test@example.com", password: "secret123" });
            await user.click(getSignInButton());

            expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
                { name: "fake-auth" },
                "test@example.com",
                "secret123"
            );
        });

        it("looks up the user's profile document by uid", async () => {
            const user = userEvent.setup();
            render(<SignIn switchToSignUp={vi.fn()} />);

            await fillForm(user, { email: "test@example.com", password: "secret123" });
            await user.click(getSignInButton());

            expect(doc).toHaveBeenCalledWith({ name: "fake-db" }, "users", "abc123");
            expect(getDoc).toHaveBeenCalledWith("PROFILE_REF");
        });

        it("navigates to /home when the profile already exists (and does not recreate it)", async () => {
            const user = userEvent.setup();
            render(<SignIn switchToSignUp={vi.fn()} />);

            await fillForm(user, { email: "test@example.com", password: "secret123" });
            await user.click(getSignInButton());

            await vi.waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/home"));
            expect(setDoc).not.toHaveBeenCalled();
        });

        it("creates the profile document when it does not exist yet", async () => {
            getDoc.mockResolvedValue({ exists: () => false });
            const user = userEvent.setup();
            render(<SignIn switchToSignUp={vi.fn()} />);

            await fillForm(user, { email: "test@example.com", password: "secret123" });
            await user.click(getSignInButton());

            await vi.waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/home"));
            expect(setDoc).toHaveBeenCalledTimes(1);
            expect(setDoc).toHaveBeenCalledWith(
                "PROFILE_REF",
                expect.objectContaining({ email: "test@example.com", createdAt: "SERVER_TIME" })
            );
        });

        it("shows no error message after a successful sign in", async () => {
            const user = userEvent.setup();
            render(<SignIn switchToSignUp={vi.fn()} />);

            await fillForm(user, { email: "test@example.com", password: "secret123" });
            await user.click(getSignInButton());

            await vi.waitFor(() => expect(mockNavigate).toHaveBeenCalled());
            expect(screen.queryByText(/wrong email/i)).not.toBeInTheDocument();
            expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
        });
    });

    // ---------------------------------------------------------------
    describe("failed email sign in (error messages)", () => {
        // it.each runs the same test once per row of the table.
        it.each([
            ["auth/invalid-credential", "Wrong email or password"],
            ["auth/invalid-email", "That email isn't valid"],
            ["auth/user-disabled", "This account has been disabled"],
            ["auth/too-many-requests", "Too many attempts. Try again later."],
            ["auth/some-unknown-code", "Something went wrong. Try again."],
        ])("maps Firebase error %s to '%s'", async (code, message) => {
            signInWithEmailAndPassword.mockRejectedValue({ code });
            const user = userEvent.setup();
            render(<SignIn switchToSignUp={vi.fn()} />);

            await fillForm(user, { email: "test@example.com", password: "secret123" });
            await user.click(getSignInButton());

            expect(await screen.findByText(message)).toBeInTheDocument();
            expect(mockNavigate).not.toHaveBeenCalled();
        });

        it("shows a specific message when reading the profile is denied", async () => {
            getDoc.mockRejectedValue({ code: "permission-denied" });
            const user = userEvent.setup();
            render(<SignIn switchToSignUp={vi.fn()} />);

            await fillForm(user, { email: "test@example.com", password: "secret123" });
            await user.click(getSignInButton());

            expect(
                await screen.findByText("Signed in, but reading your profile failed")
            ).toBeInTheDocument();
            expect(mockNavigate).not.toHaveBeenCalled();
        });

        it("lets the user try again after a failure", async () => {
            signInWithEmailAndPassword
                .mockRejectedValueOnce({ code: "auth/invalid-credential" })
                .mockResolvedValueOnce({ user: fakeUser });
            const user = userEvent.setup();
            render(<SignIn switchToSignUp={vi.fn()} />);

            await fillForm(user, { email: "test@example.com", password: "wrong" });
            await user.click(getSignInButton());
            expect(await screen.findByText("Wrong email or password")).toBeInTheDocument();

            // Typing in the password box clears the error; then retry.
            await user.type(getPasswordInput(), "right");
            await user.click(getSignInButton());

            await vi.waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/home"));
            expect(screen.queryByText("Wrong email or password")).not.toBeInTheDocument();
        });
    });

    // ---------------------------------------------------------------
    describe("loading state", () => {
        it("disables the buttons and shows 'Signing in...' while waiting", async () => {
            // A promise we resolve manually, so we can look at the screen
            // while the request is "still in progress".
            let resolveSignIn;
            signInWithEmailAndPassword.mockReturnValue(
                new Promise((resolve) => { resolveSignIn = resolve; })
            );
            const user = userEvent.setup();
            render(<SignIn switchToSignUp={vi.fn()} />);

            await fillForm(user, { email: "test@example.com", password: "secret123" });
            await user.click(getSignInButton());

            const busyButton = await screen.findByRole("button", { name: "Signing in..." });
            expect(busyButton).toBeDisabled();
            expect(screen.getByRole("button", { name: "Please wait..." })).toBeDisabled();

            // Finish the request and let React process the updates.
            await act(async () => { resolveSignIn({ user: fakeUser }); });

            await vi.waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/home"));
        });

        it("re-enables the button after a failed attempt", async () => {
            signInWithEmailAndPassword.mockRejectedValue({ code: "auth/invalid-credential" });
            const user = userEvent.setup();
            render(<SignIn switchToSignUp={vi.fn()} />);

            await fillForm(user, { email: "test@example.com", password: "secret123" });
            await user.click(getSignInButton());

            await screen.findByText("Wrong email or password");
            expect(getSignInButton()).toBeEnabled();
        });
    });

    // ---------------------------------------------------------------
    describe("GitHub sign in", () => {
        it("calls githubAuth and navigates to /home on success (null = no error)", async () => {
            githubAuth.mockResolvedValue(null);
            const user = userEvent.setup();
            render(<SignIn switchToSignUp={vi.fn()} />);

            await user.click(screen.getByRole("button", { name: "continue with github" }));

            await vi.waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/home"));
            expect(githubAuth).toHaveBeenCalledTimes(1);
        });

        it("shows the error message returned by githubAuth and does not navigate", async () => {
            githubAuth.mockResolvedValue("GitHub login was cancelled");
            const user = userEvent.setup();
            render(<SignIn switchToSignUp={vi.fn()} />);

            await user.click(screen.getByRole("button", { name: "continue with github" }));

            expect(await screen.findByText("GitHub login was cancelled")).toBeInTheDocument();
            expect(mockNavigate).not.toHaveBeenCalled();
        });

        it("shows 'Please wait...' and disables the button while waiting", async () => {
            let resolveGithub;
            githubAuth.mockReturnValue(new Promise((resolve) => { resolveGithub = resolve; }));
            const user = userEvent.setup();
            render(<SignIn switchToSignUp={vi.fn()} />);

            await user.click(screen.getByRole("button", { name: "continue with github" }));

            expect(await screen.findByRole("button", { name: "Please wait..." })).toBeDisabled();

            await act(async () => { resolveGithub(null); });

            await vi.waitFor(() =>
                expect(screen.getByRole("button", { name: "continue with github" })).toBeEnabled()
            );
        });

        it("does not call the email/password Firebase function", async () => {
            githubAuth.mockResolvedValue(null);
            const user = userEvent.setup();
            render(<SignIn switchToSignUp={vi.fn()} />);

            await user.click(screen.getByRole("button", { name: "continue with github" }));

            await vi.waitFor(() => expect(mockNavigate).toHaveBeenCalled());
            expect(signInWithEmailAndPassword).not.toHaveBeenCalled();
        });
    });

    // ---------------------------------------------------------------
    describe("switching to sign up", () => {
        it("calls switchToSignUp when 'Create an Account' is clicked", async () => {
            const switchToSignUp = vi.fn();
            const user = userEvent.setup();
            render(<SignIn switchToSignUp={switchToSignUp} />);

            await user.click(screen.getByText("Create an Account"));

            expect(switchToSignUp).toHaveBeenCalledTimes(1);
        });
    });
});
