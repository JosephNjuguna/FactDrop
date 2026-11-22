import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { githubAuth } from "../../utils/githubAuth";

import SignUp from "./SignUp";

// =====================================================================
// MOCKS (same idea as SignIn.test.jsx)
// Paths must match the imports inside SignUp.jsx.
// =====================================================================

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock("react-router-dom", () => ({
    useNavigate: () => mockNavigate,
}));

vi.mock("firebase/auth", () => ({
    createUserWithEmailAndPassword: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
    doc: vi.fn(),
    getDoc: vi.fn(),
    setDoc: vi.fn(),
    serverTimestamp: vi.fn(),
}));

vi.mock("../../firebase", () => ({
    auth: { name: "fake-auth" },
    db: { name: "fake-db" },
}));

vi.mock("../../utils/githubAuth", () => ({
    githubAuth: vi.fn(),
}));

// =====================================================================
// HELPERS
// =====================================================================

const fakeUser = { uid: "new-uid-1", email: "new@example.com" };

const VALID_EMAIL = "new@example.com";
const VALID_PASSWORD = "Passw0rd1"; // 8+ chars, has a letter and a number

const EMAIL_ERROR = "Enter a valid email address";
const PASSWORD_ERROR = "Password must be at least 8 characters with a letter and a number";
const MISMATCH_ERROR = "Passwords don't match";
const EMPTY_ERROR = "Please fill in all fields";

const getEmailInput = () => screen.getByPlaceholderText("your@example.com");
const getPasswordInput = () => screen.getByPlaceholderText("enter your password");
const getConfirmInput = () => screen.getByPlaceholderText("enter same password again");
const getSignUpButton = () => screen.getByRole("button", { name: "Sign Up" });

// Types into whichever fields you pass in.
async function fillForm(user, { email, password, confirm }) {
    if (email) await user.type(getEmailInput(), email);
    if (password) await user.type(getPasswordInput(), password);
    if (confirm) await user.type(getConfirmInput(), confirm);
}

// Fills everything correctly.
async function fillValidForm(user) {
    await fillForm(user, {
        email: VALID_EMAIL,
        password: VALID_PASSWORD,
        confirm: VALID_PASSWORD,
    });
}

// =====================================================================
// TESTS
// =====================================================================

describe("SignUp", () => {
    beforeEach(() => {
        vi.resetAllMocks();

        doc.mockReturnValue("PROFILE_REF");
        serverTimestamp.mockReturnValue("SERVER_TIME");

        createUserWithEmailAndPassword.mockResolvedValue({ user: fakeUser });
        getDoc.mockResolvedValue({ exists: () => false }); // new user: no profile yet
        setDoc.mockResolvedValue(undefined);

        vi.spyOn(console, "log").mockImplementation(() => { });
    });

    // ---------------------------------------------------------------
    describe("rendering", () => {
        it("shows the heading, three inputs and the buttons", () => {
            render(<SignUp switchToSignIn={vi.fn()} />);

            expect(screen.getByRole("heading", { name: "Create your account" })).toBeInTheDocument();
            expect(getEmailInput()).toBeInTheDocument();
            expect(getPasswordInput()).toBeInTheDocument();
            expect(getConfirmInput()).toBeInTheDocument();
            expect(getSignUpButton()).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "continue with github" })).toBeInTheDocument();
        });

        it("starts with empty inputs and no error messages", () => {
            render(<SignUp switchToSignIn={vi.fn()} />);

            expect(getEmailInput()).toHaveValue("");
            expect(getPasswordInput()).toHaveValue("");
            expect(getConfirmInput()).toHaveValue("");
            expect(screen.queryByText(EMAIL_ERROR)).not.toBeInTheDocument();
            expect(screen.queryByText(PASSWORD_ERROR)).not.toBeInTheDocument();
            expect(screen.queryByText(MISMATCH_ERROR)).not.toBeInTheDocument();
        });

        it("hides both password fields", () => {
            render(<SignUp switchToSignIn={vi.fn()} />);

            expect(getPasswordInput()).toHaveAttribute("type", "password");
            expect(getConfirmInput()).toHaveAttribute("type", "password");
        });
    });

    // ---------------------------------------------------------------
    describe("email validation (live, while typing)", () => {
        it("shows an error for an invalid email", async () => {
            const user = userEvent.setup();
            render(<SignUp switchToSignIn={vi.fn()} />);

            await user.type(getEmailInput(), "not-an-email");
            expect(screen.getByText(EMAIL_ERROR)).toBeInTheDocument();
        });

        it("clears the error once the email is valid", async () => {
            const user = userEvent.setup();
            render(<SignUp switchToSignIn={vi.fn()} />);

            await user.type(getEmailInput(), "abc");
            expect(screen.getByText(EMAIL_ERROR)).toBeInTheDocument();

            await user.type(getEmailInput(), "@site.com");
            expect(screen.queryByText(EMAIL_ERROR)).not.toBeInTheDocument();
        });

        it("clears the error when the field is emptied", async () => {
            const user = userEvent.setup();
            render(<SignUp switchToSignIn={vi.fn()} />);

            await user.type(getEmailInput(), "abc");
            await user.clear(getEmailInput());
            expect(screen.queryByText(EMAIL_ERROR)).not.toBeInTheDocument();
        });

        it.each([
            ["no @ sign", "userexample.com"],
            ["no domain dot", "user@example"],
            ["contains a space", "us er@example.com"],
        ])("rejects an email with %s", async (_label, email) => {
            const user = userEvent.setup();
            render(<SignUp switchToSignIn={vi.fn()} />);

            await user.type(getEmailInput(), email);
            expect(screen.getByText(EMAIL_ERROR)).toBeInTheDocument();
        });
    });

    // ---------------------------------------------------------------
    describe("password validation (live, while typing)", () => {
        it("rejects a password shorter than 8 characters", async () => {
            const user = userEvent.setup();
            render(<SignUp switchToSignIn={vi.fn()} />);

            await user.type(getPasswordInput(), "Abc123");
            expect(screen.getByText(PASSWORD_ERROR)).toBeInTheDocument();
        });

        it("rejects a password with no number", async () => {
            const user = userEvent.setup();
            render(<SignUp switchToSignIn={vi.fn()} />);

            await user.type(getPasswordInput(), "onlyletters");
            expect(screen.getByText(PASSWORD_ERROR)).toBeInTheDocument();
        });

        it("rejects a password with no letter", async () => {
            const user = userEvent.setup();
            render(<SignUp switchToSignIn={vi.fn()} />);

            await user.type(getPasswordInput(), "12345678");
            expect(screen.getByText(PASSWORD_ERROR)).toBeInTheDocument();
        });

        it("accepts a password with 8+ characters, a letter and a number", async () => {
            const user = userEvent.setup();
            render(<SignUp switchToSignIn={vi.fn()} />);

            await user.type(getPasswordInput(), VALID_PASSWORD);
            expect(screen.queryByText(PASSWORD_ERROR)).not.toBeInTheDocument();
        });

        it("clears the error when the field is emptied", async () => {
            const user = userEvent.setup();
            render(<SignUp switchToSignIn={vi.fn()} />);

            await user.type(getPasswordInput(), "abc");
            expect(screen.getByText(PASSWORD_ERROR)).toBeInTheDocument();

            await user.clear(getPasswordInput());
            expect(screen.queryByText(PASSWORD_ERROR)).not.toBeInTheDocument();
        });
    });

    // ---------------------------------------------------------------
    describe("confirm password validation", () => {
        it("shows an error when confirm differs from the password", async () => {
            const user = userEvent.setup();
            render(<SignUp switchToSignIn={vi.fn()} />);

            await fillForm(user, { password: VALID_PASSWORD, confirm: "Different1" });
            expect(screen.getByText(MISMATCH_ERROR)).toBeInTheDocument();
        });

        it("clears the error when confirm finally matches", async () => {
            const user = userEvent.setup();
            render(<SignUp switchToSignIn={vi.fn()} />);

            await fillForm(user, { password: VALID_PASSWORD, confirm: "Passw0rd" });
            expect(screen.getByText(MISMATCH_ERROR)).toBeInTheDocument();

            await user.type(getConfirmInput(), "1");
            expect(screen.queryByText(MISMATCH_ERROR)).not.toBeInTheDocument();
        });

        it("clears the error when the confirm field is emptied", async () => {
            const user = userEvent.setup();
            render(<SignUp switchToSignIn={vi.fn()} />);

            await fillForm(user, { password: VALID_PASSWORD, confirm: "x" });
            await user.clear(getConfirmInput());
            expect(screen.queryByText(MISMATCH_ERROR)).not.toBeInTheDocument();
        });

        it("shows a mismatch error if the password is edited AFTER confirm was filled", async () => {
            const user = userEvent.setup();
            render(<SignUp switchToSignIn={vi.fn()} />);

            await fillForm(user, { password: VALID_PASSWORD, confirm: VALID_PASSWORD });
            expect(screen.queryByText(MISMATCH_ERROR)).not.toBeInTheDocument();

            await user.type(getPasswordInput(), "x"); // password is now different
            expect(screen.getByText(MISMATCH_ERROR)).toBeInTheDocument();
        });

        it("clears the mismatch error if the password is edited back to match", async () => {
            const user = userEvent.setup();
            render(<SignUp switchToSignIn={vi.fn()} />);

            await fillForm(user, { password: VALID_PASSWORD, confirm: VALID_PASSWORD });
            await user.type(getPasswordInput(), "x");
            expect(screen.getByText(MISMATCH_ERROR)).toBeInTheDocument();

            await user.type(getPasswordInput(), "{backspace}");
            expect(screen.queryByText(MISMATCH_ERROR)).not.toBeInTheDocument();
        });

        it("does not show a mismatch error while confirm is still empty", async () => {
            const user = userEvent.setup();
            render(<SignUp switchToSignIn={vi.fn()} />);

            await fillForm(user, { password: VALID_PASSWORD });
            expect(screen.queryByText(MISMATCH_ERROR)).not.toBeInTheDocument();
        });
    });

    // ---------------------------------------------------------------
    describe("form validation on submit", () => {
        it("shows 'Please fill in all fields' when everything is empty", async () => {
            const user = userEvent.setup();
            render(<SignUp switchToSignIn={vi.fn()} />);

            await user.click(getSignUpButton());

            expect(screen.getByText(EMPTY_ERROR)).toBeInTheDocument();
            expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
        });

        it.each([
            ["email", { password: VALID_PASSWORD, confirm: VALID_PASSWORD }],
            ["password", { email: VALID_EMAIL, confirm: VALID_PASSWORD }],
            ["confirm password", { email: VALID_EMAIL, password: VALID_PASSWORD }],
        ])("shows the error when only the %s is missing", async (_label, fields) => {
            const user = userEvent.setup();
            render(<SignUp switchToSignIn={vi.fn()} />);

            await fillForm(user, fields);
            await user.click(getSignUpButton());

            expect(screen.getByText(EMPTY_ERROR)).toBeInTheDocument();
            expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
        });

        it("does not call Firebase when the email is invalid", async () => {
            const user = userEvent.setup();
            render(<SignUp switchToSignIn={vi.fn()} />);

            await fillForm(user, { email: "bad", password: VALID_PASSWORD, confirm: VALID_PASSWORD });
            await user.click(getSignUpButton());

            expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
            expect(mockNavigate).not.toHaveBeenCalled();
        });

        it("does not call Firebase when the password is too weak", async () => {
            const user = userEvent.setup();
            render(<SignUp switchToSignIn={vi.fn()} />);

            await fillForm(user, { email: VALID_EMAIL, password: "abc", confirm: "abc" });
            await user.click(getSignUpButton());

            expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
            expect(screen.getByText(PASSWORD_ERROR)).toBeInTheDocument();
        });

        it("does not call Firebase when the passwords don't match", async () => {
            const user = userEvent.setup();
            render(<SignUp switchToSignIn={vi.fn()} />);

            await fillForm(user, { email: VALID_EMAIL, password: VALID_PASSWORD, confirm: "Different1" });
            await user.click(getSignUpButton());

            expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
            expect(screen.getByText(MISMATCH_ERROR)).toBeInTheDocument();
        });
    });

    // ---------------------------------------------------------------
    describe("successful sign up", () => {
        it("calls Firebase with the typed email and password", async () => {
            const user = userEvent.setup();
            render(<SignUp switchToSignIn={vi.fn()} />);

            await fillValidForm(user);
            await user.click(getSignUpButton());

            expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
                { name: "fake-auth" },
                VALID_EMAIL,
                VALID_PASSWORD
            );
        });

        it("checks for an existing profile using the new user's uid", async () => {
            const user = userEvent.setup();
            render(<SignUp switchToSignIn={vi.fn()} />);

            await fillValidForm(user);
            await user.click(getSignUpButton());

            await vi.waitFor(() => expect(getDoc).toHaveBeenCalled());
            expect(doc).toHaveBeenCalledWith({ name: "fake-db" }, "users", "new-uid-1");
            expect(getDoc).toHaveBeenCalledWith("PROFILE_REF");
        });

        it("saves a new profile document and navigates to /home", async () => {
            const user = userEvent.setup();
            render(<SignUp switchToSignIn={vi.fn()} />);

            await fillValidForm(user);
            await user.click(getSignUpButton());

            await vi.waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/home"));
            expect(setDoc).toHaveBeenCalledTimes(1);
            expect(setDoc).toHaveBeenCalledWith(
                "PROFILE_REF",
                expect.objectContaining({ email: "new@example.com", createdAt: "SERVER_TIME" })
            );
        });

        it("does not overwrite a profile that already exists, but still navigates", async () => {
            getDoc.mockResolvedValue({ exists: () => true });
            const user = userEvent.setup();
            render(<SignUp switchToSignIn={vi.fn()} />);

            await fillValidForm(user);
            await user.click(getSignUpButton());

            await vi.waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/home"));
            expect(setDoc).not.toHaveBeenCalled();
        });

        it("can be submitted with the Enter key", async () => {
            const user = userEvent.setup();
            render(<SignUp switchToSignIn={vi.fn()} />);

            await fillForm(user, { email: VALID_EMAIL, password: VALID_PASSWORD });
            await user.type(getConfirmInput(), `${VALID_PASSWORD}{enter}`);

            expect(createUserWithEmailAndPassword).toHaveBeenCalledTimes(1);
        });
    });

    // ---------------------------------------------------------------
    describe("failed sign up (error messages)", () => {
        it.each([
            ["auth/email-already-in-use", "An account with this email already exists"],
            ["auth/invalid-email", "That email isn't valid"],
            ["auth/weak-password", "Password is too weak"],
            ["auth/some-unknown-code", "Something went wrong. Try again."],
        ])("maps Firebase error %s to '%s'", async (code, message) => {
            createUserWithEmailAndPassword.mockRejectedValue({ code });
            const user = userEvent.setup();
            render(<SignUp switchToSignIn={vi.fn()} />);

            await fillValidForm(user);
            await user.click(getSignUpButton());

            expect(await screen.findByText(message)).toBeInTheDocument();
            expect(mockNavigate).not.toHaveBeenCalled();
        });

        it("shows a specific message when saving the profile is denied", async () => {
            setDoc.mockRejectedValue({ code: "permission-denied" });
            const user = userEvent.setup();
            render(<SignUp switchToSignIn={vi.fn()} />);

            await fillValidForm(user);
            await user.click(getSignUpButton());

            expect(
                await screen.findByText("Account created, but saving your profile failed")
            ).toBeInTheDocument();
            expect(mockNavigate).not.toHaveBeenCalled();
        });

        it("re-enables the button after a failure", async () => {
            createUserWithEmailAndPassword.mockRejectedValue({ code: "auth/weak-password" });
            const user = userEvent.setup();
            render(<SignUp switchToSignIn={vi.fn()} />);

            await fillValidForm(user);
            await user.click(getSignUpButton());

            await screen.findByText("Password is too weak");
            expect(getSignUpButton()).toBeEnabled();
        });

        it("clears the previous form error when submitting again", async () => {
            createUserWithEmailAndPassword
                .mockRejectedValueOnce({ code: "auth/email-already-in-use" })
                .mockResolvedValueOnce({ user: fakeUser });
            const user = userEvent.setup();
            render(<SignUp switchToSignIn={vi.fn()} />);

            await fillValidForm(user);
            await user.click(getSignUpButton());
            expect(
                await screen.findByText("An account with this email already exists")
            ).toBeInTheDocument();

            await user.click(getSignUpButton());

            await vi.waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/home"));
            expect(
                screen.queryByText("An account with this email already exists")
            ).not.toBeInTheDocument();
        });
    });

    // ---------------------------------------------------------------
    describe("loading state", () => {
        it("disables the buttons and shows 'Creating account...' while waiting", async () => {
            let resolveSignUp;
            createUserWithEmailAndPassword.mockReturnValue(
                new Promise((resolve) => { resolveSignUp = resolve; })
            );
            const user = userEvent.setup();
            render(<SignUp switchToSignIn={vi.fn()} />);

            await fillValidForm(user);
            await user.click(getSignUpButton());

            expect(await screen.findByRole("button", { name: "Creating account..." })).toBeDisabled();
            expect(screen.getByRole("button", { name: "Please wait..." })).toBeDisabled();

            await act(async () => { resolveSignUp({ user: fakeUser }); });

            await vi.waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/home"));
        });
    });

    // ---------------------------------------------------------------
    describe("switching to sign in", () => {
        it("calls switchToSignIn when 'Sign In' is clicked", async () => {
            const switchToSignIn = vi.fn();
            const user = userEvent.setup();
            render(<SignUp switchToSignIn={switchToSignIn} />);

            // "Sign In" is a <b> element here (not a button), so use getByText.
            await user.click(screen.getByText("Sign In"));

            expect(switchToSignIn).toHaveBeenCalledTimes(1);
        });
    });
});
